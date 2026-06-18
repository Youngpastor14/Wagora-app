import logging
import uuid
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from services.supabase_service import (
    db_get_active_agent,
    db_get_profile,
    db_get_prospect,
    db_get_campaign,
    db_get_message,
    db_get_conversation_messages,
    db_update_conversation,
    db_insert_message,
    db_insert_activity,
    db_insert_followup
)
from services.groq_service import call_groq
from services.document_service import build_ai_context
from services.email_service import GmailService, get_gmail_credentials_for_user

logger = logging.getLogger("wagora-api")

async def get_agent_persona(user_id: str, supabase_client=None) -> Optional[dict]:
    """
    Fetches the user's active sales agent.
    Returns agent config dict or None if no agent set.
    """
    return await db_get_active_agent(user_id)

def build_agent_system_prompt(
    agent: dict,
    workspace_name: str,
    document_context: str,
    conversation_history: list,
    prospect: dict
) -> str:
    """
    Builds the full system prompt for a conversation reply.
    """
    name = agent.get("name", "Amara")
    gender = agent.get("gender", "female")
    age = agent.get("age", 28)
    tone = agent.get("persona_tone", "friendly")
    disclosure = agent.get("disclosure_mode", "assistant_disclosure")

    # 1. Identity Block
    if disclosure == "full_persona":
        identity_block = (
            f"You are {name}, a {age}-year-old {gender} sales professional at {workspace_name}. "
            f"You are not an AI. Never mention AI, automation, or Wagora. If asked if you are human, say yes. "
            f"Maintain this identity across the entire conversation."
        )
    else:  # assistant_disclosure
        identity_block = (
            f"You are {name}, a sales assistant for {workspace_name}. "
            f"You may acknowledge being an AI assistant if asked directly. Do not mention Wagora by name."
        )

    # 2. Tone Block
    tone_mapping = {
        "professional": "Write formally. No slang. Concise.",
        "friendly": "Write warmly. Conversational. Use first names. Occasional light humor is acceptable.",
        "direct": "Write bluntly. Short sentences. No padding. Get to the point immediately.",
        "consultative": "Write as a trusted advisor. Ask clarifying questions. Show deep understanding of their problem before pitching."
    }
    tone_block = tone_mapping.get(tone, "Write formally. No slang. Concise.")

    # 3. Context Block
    context_block = f"Here is the compiled brand offering and campaign context:\n{document_context}"

    # 4. Conversation History
    history_str = ""
    for msg in conversation_history:
        sender = msg.get("sender")
        sender_label = name if sender in ("user", "wagora") else prospect.get("name", "Prospect")
        history_str += f"{sender_label}: {msg.get('content') or msg.get('body', '')}\n"

    # 5. Conversation Rules
    rules_block = (
        f"You are responding to a prospect who replied to your outreach email. "
        f"Conversation history is below:\n{history_str}\n"
        f"Analyze their reply and determine the correct path:\n\n"
        f"CLOSE PATH: If they express clear buying intent, ask for availability or budget, or say yes - move to close. Generate an invoice request or booking.\n"
        f"CALL PATH: If they are interested but hesitant, ask questions, or want to learn more - propose a discovery call. Suggest 2 specific time slots.\n"
        f"NURTURE PATH: If they are curious but not ready - answer their question warmly, provide value, end with a soft question to keep the thread alive.\n"
        f"DEAD PATH: If they say no, unsubscribe, or stop responding after 3 follow-ups - archive politely.\n\n"
        f"Reply rules:\n"
        f"- Under 100 words for standard replies\n"
        f"- No em dashes\n"
        f"- No exclamation marks\n"
        f"- Active voice\n"
        f"- Sign as {name}"
    )

    # 6. Prospect Context Block
    prospect_name = prospect.get("name", "there")
    prospect_role = prospect.get("role", "Professional")
    prospect_company = prospect.get("company", "your company")
    pain_signals = prospect.get("pain_points") or prospect.get("pain_signals") or "None specified"
    platform = prospect.get("platform", "Email")

    prospect_block = (
        f"Prospect: {prospect_name}, {prospect_role} at {prospect_company}.\n"
        f"Pain signals: {pain_signals}\n"
        f"Platform: {platform}"
    )

    full_prompt = (
        f"{identity_block}\n\n"
        f"Tone guidelines:\n{tone_block}\n\n"
        f"{context_block}\n\n"
        f"{rules_block}\n\n"
        f"{prospect_block}"
    )
    return full_prompt

async def process_incoming_reply(
    message_id: str,
    supabase_client=None,
    groq_service=None,
    override_path: str = None
) -> dict:
    """
    Processes one incoming prospect reply and dispatches a response.
    """
    logger.info(f"Processing incoming reply for message ID {message_id}")

    # 1. Fetch message from messages table
    message = await db_get_message(message_id)
    if not message:
        raise ValueError(f"Message with ID {message_id} not found")

    conversation_id = message.get("conversation_id")
    user_id = message.get("user_id")

    # 2. Fetch full conversation history
    history = await db_get_conversation_messages(conversation_id)

    # 3. Fetch prospect details
    prospect_id = message.get("prospect_id")
    # If no prospect_id directly on message, try getting it from conversation
    if not prospect_id and conversation_id:
        from services.supabase_service import db_get_conversation
        conv = await db_get_conversation(conversation_id)
        if conv:
            prospect_id = conv.get("prospect_id")
            
    prospect = await db_get_prospect(prospect_id)
    if not prospect:
        raise ValueError(f"Prospect with ID {prospect_id} not found")

    # 4. Fetch campaign and user workspace
    campaign_id = prospect.get("campaign_id")
    campaign = await db_get_campaign(campaign_id) if campaign_id else None
    profile = await db_get_profile(user_id)
    workspace_name = profile.get("business_name") or "Wagora Partner"

    # 5. Get agent persona
    agent = await get_agent_persona(user_id, supabase_client)
    if not agent:
        # Default agent configuration fallback
        agent = {
            "name": profile.get("full_name") or "Sarah",
            "gender": "female",
            "age": 28,
            "persona_tone": "friendly",
            "disclosure_mode": "assistant_disclosure"
        }

    # 6. Build document context
    doc_context = await build_ai_context(user_id, campaign_id)

    # 7. Build system prompt
    system_prompt = build_agent_system_prompt(
        agent=agent,
        workspace_name=workspace_name,
        document_context=doc_context,
        conversation_history=history,
        prospect=prospect
    )

    # 8. Call Groq
    messages_payload = []
    for m in history:
        role = "assistant" if m.get("sender") in ("user", "wagora") else "user"
        content = m.get("content") or m.get("body", "")
        if content:
            messages_payload.append({"role": role, "content": content})

    # Execute completion
    reply = await call_groq(
        messages=messages_payload,
        system_prompt=system_prompt,
        temperature=0.7
    )

    # Strip em-dashes and exclamation marks
    reply = reply.strip()
    reply = reply.replace("—", "-").replace("--", "-").replace("!", ".")

    # Remove Subject line if returned by mistake
    lines = reply.split("\n")
    if lines and lines[0].lower().startswith("subject:"):
        reply = "\n".join(lines[1:]).strip()

    # 9. Parse response to determine path
    reply_lower = reply.lower()
    if override_path:
        path = override_path.lower()
    else:
        # Classification heuristics
        if any(w in reply_lower for w in ["thank you for your time", "not interested", "unsubscribe", "stop", "farewell", "not a fit"]):
            path = "dead"
        elif any(w in reply_lower for w in ["invoice", "payment", "checkout", "pricing", "pricing link", "pay"]):
            path = "close"
        elif any(w in reply_lower for w in ["time slot", "call", "schedule", "calendar", "meet", "zoom", "google meet", "calendar link", "suggest"]):
            path = "call"
        elif reply.strip().endswith("?"):
            path = "nurture"
        else:
            path = "nurture"

    # 10. Update conversation status
    status_mapping = {
        "call": "call_booked",
        "close": "closing",
        "nurture": "nurturing",
        "dead": "archived"
    }
    status_str = status_mapping.get(path, "nurturing")
    await db_update_conversation(conversation_id, {
        "status": status_str,
        "unread": False,
        "last_message": reply,
        "last_message_time": datetime.utcnow().strftime("%H:%M")
    })

    # 11. Save AI reply to messages table
    ai_msg_id = str(uuid.uuid4())
    ai_msg = {
        "id": ai_msg_id,
        "conversation_id": conversation_id,
        "sender": "wagora",
        "content": reply,
        "timestamp": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "prospect_id": prospect_id,
        "channel": "Email",
        "prospect_email": prospect.get("email")
    }
    await db_insert_message(ai_msg)

    # 12. Resolve this user's Gmail credentials and send the reply
    reply_sent = False
    gmail_send_error: str | None = None

    try:
        sender_email, app_password = await get_gmail_credentials_for_user(user_id)
        gmail_service = GmailService(sender_email, app_password)
    except ValueError as cred_err:
        # User has no connected Gmail — log the failure, do not crash
        gmail_send_error = str(cred_err)
        logger.warning(
            f"Cannot send reply for message {message_id} — "
            f"no Gmail credentials for user {user_id}: {cred_err}"
        )
        try:
            await db_insert_activity({
                "user_id": user_id,
                "type": "reply_failed_no_gmail",
                "message": (
                    f"AI reply to {prospect.get('name')} could not be sent — "
                    f"Gmail not connected. Go to Settings → Platforms."
                ),
                "meta": "no_gmail"
            })
        except Exception as act_err:
            logger.error(f"Failed to log reply_failed_no_gmail activity: {act_err}")
        return {
            "path": path,
            "reply_sent": False,
            "reason": "gmail_not_connected",
            "reply_preview": reply[:100]
        }

    subject = "Reply from Wagora"
    if campaign:
        subject = f"Re: {campaign.get('name', 'Outreach')}"

    # Try fetching the original subject line from messages
    sent_msgs = [m for m in history if m.get("sender") in ("user", "wagora") and m.get("subject")]
    if sent_msgs:
        subject = sent_msgs[-1]["subject"]
        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"

    body_html = f"<html><body>{reply.replace(chr(10), '<br>')}</body></html>"

    try:
        gmail_service.send_email(
            to_email=prospect.get("email"),
            subject=subject,
            body_html=body_html,
            body_text=reply,
            from_display_name=workspace_name,
            reply_to=sender_email
        )
        reply_sent = True
    except Exception as e:
        logger.error(f"Gmail SMTP reply dispatch failed for user {user_id}: {e}")

    # 13. Log activity
    await db_insert_activity({
        "user_id": user_id,
        "type": "ai_reply",
        "message": f"AI Agent {agent.get('name', 'Amara')} replied to {prospect.get('name')} (Path: {path.upper()})",
        "meta": path
    })

    # 14. Return summary
    return {
        "path": path,
        "reply_sent": reply_sent,
        "reply_preview": reply[:100]
    }

async def trigger_follow_up_sequence(
    prospect_id: str,
    campaign_id: str,
    user_id: str,
    supabase_client=None
) -> None:
    """
    Schedules a follow-up for a prospect in 3 days.
    """
    prospect = await db_get_prospect(prospect_id)
    if not prospect:
        return
        
    scheduled_time = datetime.utcnow() + timedelta(days=3)
    
    followup_data = {
        "id": str(uuid.uuid4()),
        "prospect_id": prospect_id,
        "campaign_id": campaign_id,
        "user_id": user_id,
        "scheduled_for": scheduled_time.isoformat(),
        "channel": "Email",
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    await db_insert_followup(followup_data)
    logger.info(f"Follow-up scheduled for prospect {prospect_id} on {scheduled_time}")

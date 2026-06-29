from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import re

from middleware.auth import get_current_user
from services.groq_service import call_groq
from services.supabase_service import get_supabase_client, db_get_workspace_settings
from services.document_service import build_ai_context

router = APIRouter(prefix="/ai", tags=["AI"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt: str
    workspace_id: str

class QualifyRequest(BaseModel):
    prospect: Dict[str, Any]
    icp_config: Dict[str, Any]

class GenerateMessageRequest(BaseModel):
    prospect: Dict[str, Any]
    workspace_id: str
    channel: str

@router.post("/chat")
async def chat_endpoint(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    General AI chat endpoint used by onboarding setup and conversation handler.
    Enhances the system prompt with user's workspace settings and compiled brand documents.
    """
    user_id = current_user["user_id"]
    ws_data = {}
    try:
        ws_data = await db_get_workspace_settings(user_id)
    except Exception:
        pass
        
    doc_context = ""
    try:
        doc_context = await build_ai_context(user_id)
    except Exception:
        pass
        
    enhanced_prompt = req.system_prompt
    
    # 1. Compile brand offering context from settings
    brand_voice_parts = []
    if ws_data:
        what_you_sell = ws_data.get("what_you_sell", "")
        target_client = ws_data.get("target_client_description", "")
        if what_you_sell:
            brand_voice_parts.append(f"Product/Service Offering: {what_you_sell}")
        if target_client:
            brand_voice_parts.append(f"Target Client Description: {target_client}")
            
    # 2. Append brand voice and document context
    context_blocks = []
    if brand_voice_parts:
        context_blocks.append(f"[Profile Settings Context]\n" + "\n".join(brand_voice_parts))
    if doc_context:
        context_blocks.append(f"[Uploaded Brand Documents Context]\n{doc_context}")
        
    if context_blocks:
        enhanced_prompt = f"{req.system_prompt}\n\n" + "\n\n".join(context_blocks)
        
    # Format messages array for Groq payload
    messages_payload = [{"role": m.role, "content": m.content} for m in req.messages]
    
    # Execute the Groq completion call
    reply = await call_groq(messages=messages_payload, system_prompt=enhanced_prompt)
    
    # Detect if response contains a JSON configuration block
    config = None
    is_complete = False
    try:
        json_match = re.search(r"({[\s\S]*})", reply)
        if json_match:
            config = json.loads(json_match.group(1))
            is_complete = True
    except Exception:
        pass
        
    return {
        "reply": reply,
        "config": config,
        "is_complete": is_complete
    }

@router.post("/qualify-prospect")
async def qualify_prospect(req: QualifyRequest, current_user: dict = Depends(get_current_user)):
    """
    Scores a prospect against the user's ICP.
    """
    user_id = current_user["user_id"]
    prospect = req.prospect
    icp = req.icp_config
    
    system_prompt = (
        "You are the Wagora lead qualification agent. Analyze the prospect details against the ideal client profile (ICP) configuration. "
        "Return a JSON object containing:\n"
        "1. 'score': an integer from 1 to 10\n"
        "2. 'reason': a brief explanation of why this score was assigned\n"
        "3. 'pain_signals': a list of matching pain signals identified\n"
        "Do not include any other conversational text or explanations. Return only raw JSON."
    )
    
    user_prompt = f"Prospect: {json.dumps(prospect)}\nICP Config: {json.dumps(icp)}"
    
    reply = await call_groq(
        messages=[{"role": "user", "content": user_prompt}],
        system_prompt=system_prompt,
        temperature=0.2
    )
    
    try:
        json_match = re.search(r"({[\s\S]*})", reply)
        if json_match:
            result = json.loads(json_match.group(1))
            return {
                "score": result.get("score", 5),
                "reason": result.get("reason", "No reason provided"),
                "pain_signals": result.get("pain_signals", [])
            }
    except Exception:
        pass
        
    return {
        "score": 5,
        "reason": "Failed to parse qualification response: " + reply,
        "pain_signals": []
    }

@router.post("/generate-message")
async def generate_message(req: GenerateMessageRequest, current_user: dict = Depends(get_current_user)):
    """
    Generates a personalized outreach message for a prospect.
    """
    user_id = current_user["user_id"]
    from services.supabase_service import db_get_profile, db_get_workspace_settings, db_get_active_agent
    profile = await db_get_profile(user_id)
    ws_data = await db_get_workspace_settings(user_id)
    agent = await db_get_active_agent(user_id)
    
    workspace_name = profile.get("business_name") or "Wagora Partner"
    
    if agent:
        agent_name = agent.get("name")
        agent_gender = agent.get("gender")
        agent_age = agent.get("age")
        persona_tone = agent.get("persona_tone")
        disclosure_mode = agent.get("disclosure_mode")
    else:
        agent_name = ws_data.get("agent_name") or profile.get("full_name") or workspace_name
        agent_age = ws_data.get("agent_age") or "28"
        agent_gender = ws_data.get("agent_gender") or "expert"
        persona_tone = ws_data.get("brand_voice") or "professional and direct"
        disclosure_mode = "assistant_disclosure"

    # Identity block
    if disclosure_mode == "full_persona":
        identity_block = (
            f"You are {agent_name}, a {agent_age}-year-old {agent_gender} sales professional at {workspace_name}. "
            f"You are not an AI. Never mention AI, automation, or Wagora. If asked if you are human, say yes."
        )
    else:  # assistant_disclosure
        identity_block = (
            f"You are {agent_name}, a sales assistant for {workspace_name}. "
            f"You may acknowledge being an AI assistant if asked directly. Do not mention Wagora by name."
        )

    # Tone block
    tone_mapping = {
        "professional": "Write formally. No slang. Concise.",
        "friendly": "Write warmly. Conversational. Use first names. Occasional light humor is acceptable.",
        "direct": "Write bluntly. Short sentences. No padding. Get to the point immediately.",
        "consultative": "Write as a trusted advisor. Ask clarifying questions. Show deep understanding of their problem before pitching."
    }
    tone_block = tone_mapping.get(persona_tone, "Write formally. No slang. Concise.")

    persona_part = f"{identity_block}\n\nTone guidelines:\n{tone_block}"
    
    # Part 2 — Document context
    doc_context = ""
    try:
        doc_context = await build_ai_context(user_id)
    except Exception:
        pass
        
    # Part 3 — Message rules
    prospect = req.prospect
    prospect_name = prospect.get("name", "there")
    prospect_role = prospect.get("role", "Professional")
    prospect_company = prospect.get("company", "your company")
    
    if req.channel.lower() == "email":
        system_prompt = (
            f"{persona_part}\n\n"
            f"Here is the compiled brand offering and campaign context:\n{doc_context}\n\n"
            f"Write a cold outreach email to {prospect_name}, {prospect_role} at {prospect_company}.\n"
            f"Subject line: under 9 words, no clickbait, no questions.\n"
            f"Body: under 120 words. Three paragraphs only.\n"
            f"Paragraph 1: one sentence about them or their company (use their bio or company description if available).\n"
            f"Paragraph 2: one sentence connecting their situation to the specific service from the service catalog.\n"
            f"Paragraph 3: one sentence with a single low-friction CTA.\n"
            f"No em dashes. No exclamation marks. Active voice.\n"
            f"Sign off as {agent_name}."
        )
    else:
        system_prompt = (
            f"{persona_part}\n\n"
            f"Here is the compiled brand offering and campaign context:\n{doc_context}\n\n"
            f"Write a cold outreach message to {prospect_name}, {prospect_role} at {prospect_company} on {req.channel}.\n"
            f"Keep the message under 80 words, no subject line needed. No exclamation marks. No em dashes."
        )
        
    user_prompt = f"Prospect Details: {json.dumps(prospect)}"
    
    reply = await call_groq(
        messages=[{"role": "user", "content": user_prompt}],
        system_prompt=system_prompt,
        temperature=0.7
    )
    
    subject = None
    body = reply.strip()
    
    if req.channel.lower() == "email":
        lines = body.split("\n")
        if lines and lines[0].lower().startswith("subject:"):
            subject = lines[0][8:].strip()
            body = "\n".join(lines[1:]).strip()
            
        if subject:
            subject = subject.replace("—", "-").replace("--", "-").replace("!", ".")
        body = body.replace("—", "-").replace("--", "-").replace("!", ".")
            
    return {
        "subject": subject,
        "body": body
    }

import os
import json
import logging
import smtplib
import uuid
import random
import asyncio
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from config import settings
from services.supabase_service import (
    db_get_campaign,
    db_get_profile,
    db_get_workspace_settings,
    db_get_prospects,
    db_update_prospect,
    db_update_campaign,
    db_get_daily_usage,
    db_increment_daily_usage,
    db_insert_message,
    db_check_email_contacted,
    db_insert_activity,
    db_insert_notification
)
from services.groq_service import call_groq
from services.document_service import build_ai_context

logger = logging.getLogger("wagora-api")

class EmailSendError(Exception):
    pass

class GmailService:
    def __init__(self):
        self.sender_address = settings.GMAIL_SENDER_ADDRESS
        self.app_password = settings.GMAIL_APP_PASSWORD
        if not self.sender_address or not self.app_password:
            logger.warning("GMAIL_SENDER_ADDRESS or GMAIL_APP_PASSWORD environment variables not set")

    def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str,
        reply_to: str = None,
        from_display_name: str = None
    ) -> dict:
        """
        Sends one email via Gmail SMTP with TLS.
        Returns: {"sent": True, "message_id": "string"}
        Raises: EmailSendError on failure.
        """
        if not self.sender_address or not self.app_password:
            raise EmailSendError("Gmail credentials are not configured in backend environment variables")

        try:
            # Generate unique message ID
            message_uuid = str(uuid.uuid4())
            msg_id = f"<{message_uuid}@wagora.outreach>"

            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject

            # Determine From header
            display_name = from_display_name or "Wagora Outreach"
            msg['From'] = f"{display_name} <{self.sender_address}>"
            msg['To'] = to_email

            if reply_to:
                msg['Reply-To'] = reply_to
            else:
                msg['Reply-To'] = self.sender_address

            msg['Message-ID'] = msg_id
            msg['X-Mailer'] = "Wagora Outreach"

            # Attach text and html parts
            msg.attach(MIMEText(body_text, 'plain'))
            msg.attach(MIMEText(body_html, 'html'))

            # Setup SMTP server connection (Gmail TLS port 587)
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(self.sender_address, self.app_password)
            server.sendmail(self.sender_address, to_email, msg.as_string())
            server.quit()

            logger.info(f"Email sent successfully to {to_email} with Message-ID {msg_id}")
            return {"sent": True, "message_id": msg_id}
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            raise EmailSendError(str(e))

    def validate_connection(self) -> bool:
        """
        Tests SMTP connection without sending.
        Returns True if connected, False otherwise.
        """
        if not self.sender_address or not self.app_password:
            return False
        try:
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(self.sender_address, self.app_password)
            server.quit()
            return True
        except Exception as e:
            logger.error(f"Gmail SMTP connection validation failed: {e}")
            return False


async def run_outreach_batch(
    user_id: str,
    campaign_id: str,
    max_sends: int,
    supabase_client=None,
    groq_service=None
) -> dict:
    """
    Runs one outreach batch for a campaign asynchronously.
    """
    logger.info(f"Starting outreach batch for user {user_id}, campaign {campaign_id}")
    
    # Initialize services
    gmail_service = GmailService()
    
    # 1. Fetch campaign details and workspace from local/remote DB
    campaign = await db_get_campaign(campaign_id)
    if not campaign:
        logger.error(f"Campaign {campaign_id} not found")
        return {"sent": 0, "failed": 0, "stopped_reason": "campaign_not_found"}
        
    profile = await db_get_profile(user_id)
    ws_settings = await db_get_workspace_settings(user_id)
    
    # Get plan and limits
    plan = (profile.get("plan") or "free").lower()
    
    limit_mapping = {
        "free": 0,
        "starter": 100,
        "pro": 100, # Treat pro as Starter
        "growth": 300,
        "agency": 1000
    }
    daily_limit = limit_mapping.get(plan, 0)
    
    if daily_limit == 0:
        logger.warning(f"Outreach blocked: Plan is {plan} for user {user_id}")
        return {"sent": 0, "failed": 0, "stopped_reason": "outreach_not_available_on_free_tier"}

    # 2. Build AI context
    doc_context = await build_ai_context(user_id, campaign_id)

    # 3. Fetch prospects for this campaign
    prospects = await db_get_prospects(user_id, campaign_id)
    pending_prospects = [
        p for p in prospects 
        if p.get("status") in ("New", "pending") or p.get("outreach_status") == "pending"
    ]
    
    if not pending_prospects:
        logger.info(f"No pending prospects found for campaign {campaign_id}")
        return {"sent": 0, "failed": 0, "stopped_reason": "no_pending_prospects"}

    # Limit to max_sends
    prospects_to_send = pending_prospects[:max_sends]
    
    # 4. Check daily usage
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    current_usage = await db_get_daily_usage(user_id, today_str)
    
    if current_usage >= daily_limit:
        logger.warning(f"Daily outreach limit reached for user {user_id}: {current_usage}/{daily_limit}")
        # Notify user
        await db_insert_notification({
            "user_id": user_id,
            "type": "limit_reached",
            "message": "Daily email outreach limit reached. Resets at midnight.",
            "read": False,
            "link": "/settings"
        })
        await db_insert_activity({
            "user_id": user_id,
            "type": "campaign_status",
            "message": "Outreach batch stopped. Daily limit reached.",
            "meta": "Limit reached"
        })
        return {"sent": 0, "failed": 0, "stopped_reason": "daily_limit_reached"}

    sent_count = 0
    failed_count = 0
    stopped_reason = None
    
    # Display name from workspace_name
    workspace_name = profile.get("business_name") or "Wagora Partner"
    
    # Get agent configuration if present in settings or profiles
    agent_name = ws_settings.get("agent_name") or profile.get("full_name") or workspace_name
    agent_age = ws_settings.get("agent_age") or "28"
    agent_gender = ws_settings.get("agent_gender") or "expert"
    persona_tone = ws_settings.get("brand_voice") or "professional and direct"

    # Loop through prospects
    for index, prospect in enumerate(prospects_to_send):
        # Double check limit inside loop
        current_usage = await db_get_daily_usage(user_id, today_str)
        if current_usage >= daily_limit:
            stopped_reason = "daily_limit_reached"
            logger.warning(f"Daily outreach limit reached during batch execution for user {user_id}")
            break
            
        prospect_email = prospect.get("email")
        if not prospect_email:
            logger.info(f"Skipping prospect {prospect.get('name')} due to missing email address")
            continue

        # Check for duplicates across all campaigns
        is_contacted = await db_check_email_contacted(user_id, prospect_email)
        if is_contacted:
            logger.info(f"Skipping duplicate prospect: {prospect_email}")
            # Mark prospect as Not a fit to clean up list
            await db_update_prospect(prospect["id"], {"status": "Not a fit", "last_contact": "Duplicate"})
            continue

        # Wait random delay between 45 and 90 seconds (Skip delay for first prospect to execute fast on click)
        if index > 0:
            delay = random.randint(45, 90)
            logger.info(f"Sleeping for {delay} seconds between sends...")
            await asyncio.sleep(delay)

        # Generate message using Groq
        try:
            # Build System Prompt
            system_prompt = (
                f"You are {agent_name}, a {agent_age}-year-old {agent_gender} sales professional at {workspace_name}. "
                f"Write in the voice of {persona_tone}.\n\n"
                f"Here is the compiled brand offering and campaign context:\n{doc_context}\n\n"
                f"Write a cold outreach email to {prospect.get('name')}, {prospect.get('role')} at {prospect.get('company')}.\n"
                f"Subject line: under 9 words, no clickbait, no questions.\n"
                f"Body: under 120 words. Three paragraphs only.\n"
                f"Paragraph 1: one sentence about them or their company (use their bio or company description if available).\n"
                f"Paragraph 2: one sentence connecting their situation to the specific service from the service catalog.\n"
                f"Paragraph 3: one sentence with a single low-friction CTA.\n"
                f"No em dashes. No exclamation marks. Active voice.\n"
                f"Sign off as {agent_name}."
            )
            
            user_prompt = f"Prospect Details: {json.dumps(prospect)}"
            
            # Generate email
            reply = await call_groq(
                messages=[{"role": "user", "content": user_prompt}],
                system_prompt=system_prompt,
                temperature=0.7
            )
            
            # Parse subject and body
            lines = reply.strip().split("\n")
            subject = "Outreach from Wagora"
            body = reply
            
            if lines:
                first_line = lines[0].strip()
                if first_line.lower().startswith("subject:"):
                    subject = first_line[8:].strip()
                    body = "\n".join(lines[1:]).strip()
            
            # Remove em dashes and exclamation marks from subject and body
            subject = subject.replace("—", "-").replace("--", "-").replace("!", ".")
            body = body.replace("—", "-").replace("--", "-").replace("!", ".")
            
            # Subject line variation using Groq
            if random.random() < 0.5:
                try:
                    variation_prompt = (
                        "Vary this email subject slightly by changing capitalization or adding/removing a word. "
                        "Keep it under 9 words, no questions, no exclamation marks. Return only the revised subject line."
                    )
                    var_subject = await call_groq(
                        messages=[{"role": "user", "content": f"Subject: {subject}"}],
                        system_prompt=variation_prompt,
                        temperature=0.9
                    )
                    var_subject = var_subject.strip().replace("Subject:", "").strip().replace("!", ".")
                    if len(var_subject.split()) <= 9 and "?" not in var_subject:
                        subject = var_subject
                except Exception as var_err:
                    logger.warning(f"Subject variation failed: {var_err}")

            # Send Email
            body_html = f"<html><body>{body.replace(chr(10), '<br>')}</body></html>"
            
            send_res = gmail_service.send_email(
                to_email=prospect_email,
                subject=subject,
                body_html=body_html,
                body_text=body,
                from_display_name=workspace_name
            )
            
            # Log message record
            message_id = send_res.get("message_id")
            await db_insert_message({
                "prospect_id": prospect["id"],
                "campaign_id": campaign_id,
                "channel": "Email",
                "subject": subject,
                "body": body,
                "sent_at": datetime.utcnow().isoformat(),
                "message_id": message_id,
                "status": "sent",
                "user_id": user_id,
                "prospect_email": prospect_email
            })
            
            # Update prospect status
            await db_update_prospect(prospect["id"], {
                "status": "Outreach sent",
                "last_contact": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            })
            
            # Increment usage
            await db_increment_daily_usage(user_id, today_str)
            
            # Log activity
            await db_insert_activity({
                "user_id": user_id,
                "type": "outreach_sent",
                "message": f"Email outreach sent to {prospect.get('name')} ({prospect_email})",
                "meta": "sent"
            })
            
            sent_count += 1
            
        except Exception as e:
            logger.error(f"Failed to process outreach for prospect {prospect.get('name')}: {e}")
            failed_count += 1
            
            # Log failed message record
            await db_insert_message({
                "prospect_id": prospect["id"],
                "campaign_id": campaign_id,
                "channel": "Email",
                "subject": "Outreach draft failed",
                "body": f"Error during message dispatch: {str(e)}",
                "sent_at": datetime.utcnow().isoformat(),
                "message_id": None,
                "status": "failed",
                "user_id": user_id,
                "prospect_email": prospect_email
            })
            
            # Update prospect status to reflect failure
            await db_update_prospect(prospect["id"], {
                "status": "New", # Retry status
                "last_contact": f"Failed: {str(e)}"
            })

    # Update Campaign's prospects count and replies counts if needed
    # (Optional, but keeps campaign overview clean)
    try:
        updated_prospects = await db_get_prospects(user_id, campaign_id)
        contacted_count = len([p for p in updated_prospects if p.get("status") == "Outreach sent"])
        await db_update_campaign(campaign_id, {
            "prospects": contacted_count,
            "last_active": "Just now"
        })
    except Exception:
        pass

    logger.info(f"Completed outreach batch for campaign {campaign_id}: sent={sent_count}, failed={failed_count}")
    return {
        "sent": sent_count,
        "failed": failed_count,
        "stopped_reason": stopped_reason
    }

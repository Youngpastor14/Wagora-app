import logging
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth import get_current_user
from services.supabase_service import (
    db_get_conversations,
    db_get_conversation,
    db_get_conversation_messages
)
from services.conversation_service import process_incoming_reply

logger = logging.getLogger("wagora-api")
router = APIRouter(prefix="/conversations", tags=["Conversations"])

class ReplyRequest(BaseModel):
    override_path: Optional[str] = None

@router.get("/")
async def get_conversations(user_id: str = Depends(get_current_user)):
    """
    Returns all conversations belonging to the authenticated user.
    """
    try:
        conversations = await db_get_conversations(user_id)
        return conversations
    except Exception as e:
        logger.error(f"Failed to fetch conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversations")

@router.post("/reply/{conversation_id}")
async def generate_conversation_reply(
    conversation_id: str,
    req: ReplyRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Manually triggers AI reply generation for a conversation.
    """
    # 1. Fetch conversation and verify ownership
    conversation = await db_get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conversation.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # 2. Get the latest message in this thread
    messages = await db_get_conversation_messages(conversation_id)
    if not messages:
        raise HTTPException(status_code=400, detail="Conversation has no messages to reply to")

    last_message = messages[-1]

    # 3. Call the conversation handler
    try:
        res = await process_incoming_reply(
            message_id=last_message["id"],
            override_path=req.override_path
        )
        return res
    except Exception as e:
        logger.error(f"Failed to generate AI reply: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI reply: {str(e)}")

@router.post("/webhook/email")
async def email_reply_webhook(payload: dict):
    """
    Receives incoming email replies forwarded from Gmail.

    GMAIL FORWARDING ADDRESS SETUP:
    -------------------------------
    1. In your Gmail account settings, navigate to the 'Forwarding and POP/IMAP' tab.
    2. Click 'Add a forwarding address' and enter the URL of this API endpoint:
       https://<your-wagora-api-domain>/api/conversations/webhook/email
    3. Wagora will receive the Gmail confirmation payload at this endpoint. Check the database
       activity logs or output files to retrieve the verification confirmation code.
    4. Enter the verification code in Gmail settings to confirm the forwarding setup.
    5. Set up a filter in Gmail to forward replies to Wagora automatically.
    """
    logger.info(f"Received email reply webhook: {payload}")
    # Webhook handling stub
    return {"status": "received", "message": "Email webhook is active and ready"}

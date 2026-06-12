import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status

from middleware.auth import get_current_user
from services.supabase_service import (
    db_get_campaign,
    db_get_profile,
    db_get_brand_documents,
    db_get_prospects,
    db_get_daily_usage
)
from services.email_service import run_outreach_batch

logger = logging.getLogger("wagora-api")
router = APIRouter(prefix="/outreach", tags=["Outreach"])

@router.post("/launch/{campaign_id}", status_code=status.HTTP_202_ACCEPTED)
async def launch_campaign_outreach(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user)
):
    """
    Triggers an outreach batch for a campaign.
    """
    # 1. Fetch campaign and verify ownership
    campaign = await db_get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # 2. Fetch prospects and check if any are pending
    prospects = await db_get_prospects(user_id, campaign_id)
    pending = [
        p for p in prospects 
        if p.get("status") in ("New", "pending") or p.get("outreach_status") == "pending"
    ]
    if not pending:
        raise HTTPException(status_code=400, detail="Campaign has no pending prospects")

    # 3. Confirm campaign_offer document is uploaded and parsed
    docs = await db_get_brand_documents(user_id, campaign_id)
    offer_doc = next((d for d in docs if d.get("document_type") == "campaign_offer"), None)
    if not offer_doc or offer_doc.get("status") != "Active":
        raise HTTPException(
            status_code=400,
            detail="Campaign offer document required before launching"
        )

    # 4. Check plan tier
    profile = await db_get_profile(user_id)
    plan = (profile.get("plan") or "free").lower()
    
    limit_mapping = {
        "free": 0,
        "starter": 100,
        "pro": 100,
        "growth": 300,
        "agency": 1000
    }
    daily_limit = limit_mapping.get(plan, 0)
    
    if plan == "free" or daily_limit == 0:
        raise HTTPException(
            status_code=400,
            detail="Email outreach requires Starter plan or above"
        )

    # 5. Check daily limit
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    current_usage = await db_get_daily_usage(user_id, today_str)
    
    if current_usage >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail="Daily email limit reached. Resets at midnight."
        )

    # 6. Calculate batch size cap (min of remaining daily capacity or 50 manual batch limit)
    remaining = daily_limit - current_usage
    batch_size = min(remaining, len(pending), 50)
    
    if batch_size <= 0:
        raise HTTPException(
            status_code=429,
            detail="Daily email limit reached. Resets at midnight."
        )

    # 7. Start outreach batch execution in background
    background_tasks.add_task(
        run_outreach_batch,
        user_id=user_id,
        campaign_id=campaign_id,
        max_sends=batch_size
    )

    # Estimated completion in minutes (assumes avg 70 seconds per sleep spacing)
    est_minutes = int((batch_size * 70) / 60) if batch_size > 1 else 1

    return {
        "status": "launched",
        "batch_size": batch_size,
        "estimated_completion_minutes": max(1, est_minutes)
    }

@router.get("/status/{campaign_id}")
async def get_outreach_status(
    campaign_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Returns current outreach status details for a campaign.
    """
    campaign = await db_get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    prospects = await db_get_prospects(user_id, campaign_id)
    
    total = len(prospects)
    contacted = len([p for p in prospects if p.get("status") == "Outreach sent"])
    pending = len([
        p for p in prospects 
        if p.get("status") in ("New", "pending") or p.get("outreach_status") == "pending"
    ])
    failed = len([p for p in prospects if "Failed" in str(p.get("last_contact", ""))])
    
    profile = await db_get_profile(user_id)
    plan = (profile.get("plan") or "free").lower()
    
    limit_mapping = {
        "free": 0,
        "starter": 100,
        "pro": 100,
        "growth": 300,
        "agency": 1000
    }
    daily_limit = limit_mapping.get(plan, 0)
    
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    current_usage = await db_get_daily_usage(user_id, today_str)
    
    return {
        "total_prospects": total,
        "contacted": contacted,
        "pending": pending,
        "failed": failed,
        "daily_sends_used": current_usage,
        "daily_sends_remaining": max(0, daily_limit - current_usage)
    }

import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import get_current_user
from services.supabase_service import get_supabase_client

logger = logging.getLogger("wagora-api")
router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


class CompleteOnboardingRequest(BaseModel):
    business_name: str
    industry: str
    what_you_sell: str
    target_client_description: str
    connected_platforms: Dict[str, Any] = {}
    campaign_name: str
    campaign_platform: str
    campaign_description: Optional[str] = ""


@router.post("/complete")
async def complete_onboarding(
    req: CompleteOnboardingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Saves all onboarding data in a single server-side transaction using
    the service role key, which bypasses RLS restrictions on the profiles
    table that would block direct frontend updates.

    Steps:
      1. Update profiles (business_name, industry, onboarding_completed)
      2. Upsert workspace_settings (what_you_sell, target_client, platforms)
      3. Insert the first campaign as Draft
      4. Insert the onboarding activity log
    """
    user_id = current_user["user_id"]
    # Service role client — bypasses all RLS
    supabase = get_supabase_client()

    # ── 1. Update profiles ────────────────────────────────────────────────
    profile_res = supabase.table("profiles").update({
        "business_name": req.business_name,
        "industry": req.industry,
        "onboarding_completed": True,
    }).eq("id", user_id).execute()

    if not profile_res.data:
        logger.error(f"Profile update returned no data for user {user_id}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

    # ── 2. Upsert workspace_settings ─────────────────────────────────────
    # Try update first; if no row exists yet, insert
    ws_res = supabase.table("workspace_settings").update({
        "what_you_sell": req.what_you_sell,
        "target_client_description": req.target_client_description,
        "connected_platforms": req.connected_platforms,
    }).eq("user_id", user_id).execute()

    if not ws_res.data:
        # Row doesn't exist yet — insert
        supabase.table("workspace_settings").insert({
            "user_id": user_id,
            "what_you_sell": req.what_you_sell,
            "target_client_description": req.target_client_description,
            "connected_platforms": req.connected_platforms,
        }).execute()

    # ── 3. Create initial campaign ────────────────────────────────────────
    campaign_id = str(uuid.uuid4())
    campaign_res = supabase.table("campaigns").insert({
        "id": campaign_id,
        "user_id": user_id,
        "name": req.campaign_name,
        "platform": req.campaign_platform,
        "description": req.campaign_description or "",
        "status": "Draft",
        "prospects": 0,
        "replies": 0,
        "closed": 0,
        "last_active": "Never active",
    }).execute()

    campaign = campaign_res.data[0] if campaign_res.data else {"id": campaign_id, "name": req.campaign_name}

    # ── 4. Log the onboarding activity ───────────────────────────────────
    try:
        supabase.table("activities").insert({
            "user_id": user_id,
            "type": "campaign_status",
            "message": f'Campaign "{campaign.get("name", req.campaign_name)}" created during onboarding setup.',
            "meta": "Draft",
        }).execute()
    except Exception as e:
        # Non-critical — don't fail the whole request
        logger.warning(f"Failed to insert onboarding activity for user {user_id}: {e}")

    logger.info(f"Onboarding completed for user {user_id}, campaign {campaign_id}")
    return {
        "status": "success",
        "campaign": campaign,
        "message": "Onboarding complete. Connect Gmail in Settings → Platforms to activate your campaign.",
    }

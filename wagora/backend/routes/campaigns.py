import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks

from middleware.auth import get_current_user
from services.supabase_service import get_supabase_client, db_get_campaign, db_update_campaign

logger = logging.getLogger("wagora-api")
router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

class CreateCampaignRequest(BaseModel):
    id: Optional[str] = None
    name: str
    platform: str
    description: Optional[str] = ""
    status: Optional[str] = "Draft"
    campaign_goal: Optional[str] = ""
    target_profile: Optional[Dict[str, Any]] = None

class UpdateCampaignRequest(BaseModel):
    name: Optional[str] = None
    platform: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    campaign_goal: Optional[str] = None
    target_profile: Optional[Dict[str, Any]] = None
    prospects: Optional[int] = None
    replies: Optional[int] = None
    closed: Optional[int] = None
    last_active: Optional[str] = None

@router.get("/")
async def get_campaigns(user_id: str = Depends(get_current_user)):
    """
    Returns all campaigns belonging to the authenticated user.
    """
    try:
        # Try Supabase query
        supabase = get_supabase_client()
        res = supabase.table("campaigns").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        if res.data:
            return res.data
    except Exception as e:
        logger.warning(f"Supabase campaigns fetch failed, falling back: {e}")
        
    # Read from local fallback DB
    from services.supabase_service import _read_local_db
    db = _read_local_db()
    results = []
    for c_id, campaign in db["campaigns"].items():
        if campaign.get("user_id") == user_id:
            results.append(campaign)
    return results

@router.post("/")
async def create_campaign(req: CreateCampaignRequest, user_id: str = Depends(get_current_user)):
    """
    Creates a new campaign.
    """
    import uuid
    campaign_id = req.id or str(uuid.uuid4())
    
    campaign_data = {
        "id": campaign_id,
        "user_id": user_id,
        "name": req.name,
        "platform": req.platform,
        "description": req.description,
        "status": req.status,
        "campaign_goal": req.campaign_goal,
        "target_profile": req.target_profile or {},
        "prospects": 0,
        "replies": 0,
        "closed": 0,
        "last_active": "Never active",
        "created_at": datetime.utcnow().isoformat() if "datetime" in globals() else None
    }
    
    # Try inserting to Supabase
    try:
        supabase = get_supabase_client()
        cleaned_data = {
            "id": campaign_id,
            "user_id": user_id,
            "name": req.name,
            "platform": req.platform,
            "description": req.description,
            "status": req.status,
            "prospects": 0,
            "replies": 0,
            "closed": 0,
            "last_active": "Never active"
        }
        supabase.table("campaigns").insert(cleaned_data).execute()
        logger.info(f"Campaign saved to Supabase: {campaign_id}")
    except Exception as e:
        logger.warning(f"Supabase campaigns insert failed, falling back: {e}")
        
    # Write to local DB fallback
    from services.supabase_service import _read_local_db, _write_local_db
    db = _read_local_db()
    db["campaigns"][campaign_id] = campaign_data
    _write_local_db(db)
    
    return campaign_data

@router.patch("/{campaign_id}")
async def update_campaign_endpoint(campaign_id: str, req: UpdateCampaignRequest, user_id: str = Depends(get_current_user)):
    """
    Updates campaign details.
    """
    campaign = await db_get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
        
    update_dict = req.dict(exclude_unset=True)
    res = await db_update_campaign(campaign_id, update_dict)
    return res

@router.delete("/{campaign_id}")
async def delete_campaign_endpoint(campaign_id: str, user_id: str = Depends(get_current_user)):
    """
    Deletes a campaign.
    """
    campaign = await db_get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
        
    # Try deleting from Supabase
    try:
        supabase = get_supabase_client()
        supabase.table("campaigns").delete().eq("id", campaign_id).execute()
    except Exception:
        pass
        
    # Delete from local DB
    from services.supabase_service import _read_local_db, _write_local_db
    db = _read_local_db()
    if campaign_id in db["campaigns"]:
        del db["campaigns"][campaign_id]
        _write_local_db(db)
        
    return {"status": "success", "message": "Campaign deleted"}

@router.post("/{campaign_id}/launch", status_code=status.HTTP_202_ACCEPTED)
async def campaign_launch_endpoint_alias(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user)
):
    from routes.outreach import launch_campaign_outreach
    return await launch_campaign_outreach(
        campaign_id=campaign_id,
        background_tasks=background_tasks,
        user_id=user_id
    )

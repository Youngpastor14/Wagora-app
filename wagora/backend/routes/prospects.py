import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth import get_current_user
from services.supabase_service import (
    db_get_prospects,
    db_get_prospect,
    db_insert_prospect,
    db_update_prospect,
    db_delete_prospect
)

logger = logging.getLogger("wagora-api")
router = APIRouter(prefix="/prospects", tags=["Prospects"])

class CreateProspectRequest(BaseModel):
    id: Optional[str] = None
    campaign_id: Optional[str] = None
    name: str
    company: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    score: Optional[int] = 5
    platform: Optional[str] = "Email"
    status: Optional[str] = "New"
    last_contact: Optional[str] = None

class UpdateProspectRequest(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    score: Optional[int] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    last_contact: Optional[str] = None

@router.get("/")
async def get_prospects(campaign_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    try:
        res = await db_get_prospects(user_id, campaign_id)
        return res
    except Exception as e:
        logger.error(f"Failed to fetch prospects: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch prospects")

@router.post("/")
async def create_prospect(req: CreateProspectRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    try:
        import uuid
        prospect_id = req.id or str(uuid.uuid4())
        prospect_data = {
            "id": prospect_id,
            "user_id": user_id,
            "campaign_id": req.campaign_id,
            "name": req.name,
            "company": req.company,
            "role": req.role,
            "email": req.email,
            "score": req.score,
            "platform": req.platform,
            "status": req.status,
            "last_contact": req.last_contact
        }
        res = await db_insert_prospect(prospect_data)
        return res
    except Exception as e:
        logger.error(f"Failed to create prospect: {e}")
        raise HTTPException(status_code=500, detail="Failed to create prospect")

@router.patch("/{prospect_id}")
async def update_prospect_endpoint(prospect_id: str, req: UpdateProspectRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    try:
        prospect = await db_get_prospect(prospect_id)
        if not prospect:
            raise HTTPException(status_code=404, detail="Prospect not found")
        if prospect.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
            
        update_dict = req.dict(exclude_unset=True)
        res = await db_update_prospect(prospect_id, update_dict)
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update prospect: {e}")
        raise HTTPException(status_code=500, detail="Failed to update prospect")

@router.delete("/{prospect_id}")
async def delete_prospect_endpoint(prospect_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    try:
        prospect = await db_get_prospect(prospect_id)
        if not prospect:
            raise HTTPException(status_code=404, detail="Prospect not found")
        if prospect.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
            
        res = await db_delete_prospect(prospect_id)
        return {"status": "success", "message": "Prospect deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete prospect: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete prospect")


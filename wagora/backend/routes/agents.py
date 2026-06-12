import logging
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth import get_current_user
from services.supabase_service import db_get_active_agent, db_save_agent

logger = logging.getLogger("wagora-api")
router = APIRouter(prefix="/agents", tags=["Agents"])

class AgentSaveRequest(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1)
    gender: str = Field(..., pattern="^(male|female|neutral)$")
    age: int = Field(..., ge=22, le=55)
    persona_tone: str = Field(..., pattern="^(professional|friendly|direct|consultative)$")
    disclosure_mode: str = Field("assistant_disclosure", pattern="^(full_persona|assistant_disclosure)$")
    is_active: bool = True

@router.get("/active")
async def get_active_agent(user_id: str = Depends(get_current_user)):
    """
    Returns the user's active sales agent.
    """
    try:
        agent = await db_get_active_agent(user_id)
        if not agent:
            # Return empty structure or 404
            return {"status": "none", "agent": None}
        return {"status": "success", "agent": agent}
    except Exception as e:
        logger.error(f"Failed to fetch active agent: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch active agent")

@router.post("/")
async def save_agent(req: AgentSaveRequest, user_id: str = Depends(get_current_user)):
    """
    Saves a sales agent config and sets it as the active agent on the profile.
    """
    try:
        agent_data = {
            "id": req.id,
            "name": req.name,
            "gender": req.gender,
            "age": req.age,
            "persona_tone": req.persona_tone,
            "disclosure_mode": req.disclosure_mode,
            "is_active": req.is_active
        }
        saved_agent = await db_save_agent(user_id, agent_data)
        return {"status": "success", "agent": saved_agent}
    except Exception as e:
        logger.error(f"Failed to save agent: {e}")
        raise HTTPException(status_code=500, detail="Failed to save agent config")

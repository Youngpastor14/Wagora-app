from fastapi import APIRouter

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/")
async def webhooks_stub():
    """
    Public webhook receiver endpoint for incoming replies.
    """
    return {"status": "coming soon", "route": "/api/webhooks"}

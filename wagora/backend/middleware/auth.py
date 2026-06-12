from fastapi import Header, HTTPException, Depends
from supabase import create_client, Client
from config import settings

# Initialize Supabase client for JWT verification
supabase_client = None
if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
    supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

async def get_current_user(authorization: str = Header(None)) -> str:
    """
    Middleware dependency to verify the Supabase JWT token from the Authorization header.
    Returns the user's UUID (str) on success, otherwise raises 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.replace("Bearer ", "")
    
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized. Check server settings.")
        
    try:
        # Verify the token with Supabase Auth engine and retrieve the user details
        response = supabase_client.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid authorization token")
        return response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(e)}")

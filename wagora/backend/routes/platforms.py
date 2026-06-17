"""
Platform connection management routes.

Handles connecting, disconnecting, testing, and querying
the status of user-owned platform integrations.

Currently supported:
  - Gmail (via App Password + SMTP validation)

Storage:
  Credentials are stored as an encrypted JSONB payload inside
  workspace_settings.connected_platforms under the key "gmail".

  Structure:
  {
    "gmail": {
      "connection_status": "connected" | "disconnected" | "error",
      "account_email": "user@gmail.com",
      "encrypted_credentials": "<fernet token>",
      "last_verified_at": "2024-01-01T00:00:00Z"
    }
  }

Security:
  - App passwords are NEVER stored in plain text.
  - Fernet symmetric encryption is used (AES-128-CBC + HMAC-SHA256).
  - The encryption key lives only in the ENCRYPTION_KEY env var.
  - validation_connection() makes a real SMTP login — cannot be faked.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from middleware.auth import get_current_user
from services.supabase_service import get_supabase_client
from services.email_service import GmailService
from services.encryption_service import encrypt_credential, decrypt_credential

logger = logging.getLogger("wagora-api")
router = APIRouter(prefix="/platforms", tags=["Platforms"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class GmailConnectRequest(BaseModel):
    email: str = Field(..., description="The Gmail address to connect")
    app_password: str = Field(
        ...,
        description="16-character Gmail App Password from myaccount.google.com/apppasswords",
    )

    @field_validator("app_password")
    @classmethod
    def strip_and_validate_app_password(cls, v: str) -> str:
        """Strip any spaces the user may have pasted in, then validate length."""
        cleaned = v.replace(" ", "")
        if len(cleaned) != 16:
            raise ValueError(
                f"App password must be exactly 16 characters (got {len(cleaned)} "
                "after removing spaces). Generate one at "
                "myaccount.google.com/apppasswords."
            )
        return cleaned

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()


class GmailStatusResponse(BaseModel):
    connected: bool
    email: Optional[str]
    last_verified_at: Optional[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_gmail_cfg(user_id: str) -> dict:
    """
    Reads the gmail sub-key from workspace_settings.connected_platforms.
    Returns an empty dict if the row or key is missing.
    """
    try:
        client = get_supabase_client()
        res = (
            client
            .table("workspace_settings")
            .select("connected_platforms")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        data = res.data or {}
        platforms: dict = data.get("connected_platforms") or {}
        return platforms.get("gmail") or {}
    except Exception as e:
        logger.warning(f"Could not read gmail config for user {user_id}: {e}")
        return {}


def _upsert_gmail_cfg(user_id: str, gmail_cfg: dict) -> None:
    """
    Merges gmail_cfg into workspace_settings.connected_platforms["gmail"].
    Creates the workspace_settings row if it doesn't exist yet.
    """
    client = get_supabase_client()

    # Read current state
    res = (
        client
        .table("workspace_settings")
        .select("connected_platforms")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    existing_row = res.data or {}
    platforms: dict = dict(existing_row.get("connected_platforms") or {})

    # Merge only the gmail key
    platforms["gmail"] = gmail_cfg

    if existing_row:
        client.table("workspace_settings").update(
            {"connected_platforms": platforms}
        ).eq("user_id", user_id).execute()
    else:
        client.table("workspace_settings").insert({
            "user_id": user_id,
            "connected_platforms": platforms,
        }).execute()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/gmail/connect", status_code=status.HTTP_200_OK)
async def connect_gmail(
    req: GmailConnectRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Connects a user's Gmail account by:
    1. Validating the app password length (exactly 16 chars).
    2. Testing a real SMTP login against smtp.gmail.com:587.
    3. Encrypting the app password with Fernet.
    4. Storing the encrypted payload in workspace_settings.connected_platforms.
    """
    # Test the connection — real SMTP, cannot be faked
    try:
        gmail = GmailService(sender_email=req.email, app_password=req.app_password)
        connected = gmail.validate_connection()
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        logger.error(f"Unexpected error during Gmail SMTP test for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while testing the connection.",
        )

    if not connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not connect to Gmail. Check your email and app password. "
                "App passwords require 2-factor authentication enabled on your "
                "Google account. Generate one at myaccount.google.com/apppasswords."
            ),
        )

    # Encrypt app password before storage
    try:
        encrypted = encrypt_credential(req.app_password)
    except Exception as e:
        logger.error(f"Encryption failed for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to securely store credentials. Please try again.",
        )

    # Persist to workspace_settings.connected_platforms
    try:
        _upsert_gmail_cfg(user_id, {
            "connection_status": "connected",
            "account_email": req.email,
            "encrypted_credentials": encrypted,
            "last_verified_at": _now_iso(),
        })
    except Exception as e:
        logger.error(f"Failed to store Gmail credentials for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Connection verified but failed to save credentials. Please try again.",
        )

    logger.info(f"Gmail connected for user {user_id} ({req.email})")
    return {"status": "connected", "email": req.email}


@router.post("/gmail/disconnect", status_code=status.HTTP_200_OK)
async def disconnect_gmail(user_id: str = Depends(get_current_user)):
    """
    Disconnects the user's Gmail account.
    Clears encrypted credentials and marks status as 'disconnected'.
    """
    try:
        _upsert_gmail_cfg(user_id, {
            "connection_status": "disconnected",
            "account_email": None,
            "encrypted_credentials": None,
            "last_verified_at": None,
        })
    except Exception as e:
        logger.error(f"Failed to disconnect Gmail for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect Gmail. Please try again.",
        )

    logger.info(f"Gmail disconnected for user {user_id}")
    return {"status": "disconnected"}


@router.get("/gmail/status", response_model=GmailStatusResponse)
async def get_gmail_status(user_id: str = Depends(get_current_user)):
    """
    Returns the user's current Gmail connection status.
    Never returns credentials — only the email address and timestamp.
    """
    try:
        cfg = _get_gmail_cfg(user_id)
    except Exception as e:
        logger.error(f"Failed to read Gmail status for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read platform status.",
        )

    is_connected = cfg.get("connection_status") == "connected"
    return GmailStatusResponse(
        connected=is_connected,
        email=cfg.get("account_email") if is_connected else None,
        last_verified_at=cfg.get("last_verified_at") if is_connected else None,
    )


@router.post("/gmail/test", status_code=status.HTTP_200_OK)
async def test_gmail_connection(user_id: str = Depends(get_current_user)):
    """
    Re-tests an existing Gmail connection without changing credentials.
    Useful when a user suspects their App Password has been revoked.
    Updates connection_status to 'connected' or 'error' in the DB.
    """
    # Fetch stored credentials
    try:
        cfg = _get_gmail_cfg(user_id)
    except Exception as e:
        logger.error(f"Failed to read Gmail config for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read stored credentials.",
        )

    account_email = cfg.get("account_email")
    encrypted_creds = cfg.get("encrypted_credentials")

    if not account_email or not encrypted_creds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Gmail account connected. Please connect your Gmail first.",
        )

    # Decrypt
    try:
        app_password = decrypt_credential(encrypted_creds)
    except ValueError as ve:
        # Credentials are corrupted or key was rotated
        _upsert_gmail_cfg(user_id, {**cfg, "connection_status": "error"})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not decrypt stored credentials. "
                "Please reconnect your Gmail account."
            ),
        )

    # Test SMTP
    try:
        gmail = GmailService(sender_email=account_email, app_password=app_password)
        connected = gmail.validate_connection()
    except Exception as e:
        logger.error(f"SMTP test error for user {user_id}: {e}")
        connected = False

    new_status = "connected" if connected else "error"
    try:
        _upsert_gmail_cfg(user_id, {
            **cfg,
            "connection_status": new_status,
            "last_verified_at": _now_iso() if connected else cfg.get("last_verified_at"),
        })
    except Exception as e:
        logger.warning(f"Could not update connection_status after test for user {user_id}: {e}")

    if not connected:
        return {
            "status": "error",
            "message": (
                "Connection test failed. Your App Password may have been revoked. "
                "Generate a new one at myaccount.google.com/apppasswords and reconnect."
            ),
        }

    logger.info(f"Gmail re-test passed for user {user_id} ({account_email})")
    return {"status": "connected", "email": account_email}

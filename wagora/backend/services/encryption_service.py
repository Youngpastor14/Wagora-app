"""
Encryption service for storing sensitive credentials (e.g. Gmail App Passwords).

Uses Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256) from the
cryptography library. The encryption key is stored in the ENCRYPTION_KEY
environment variable as a base64-encoded 32-byte key.

Generate a key once and store it in your environment:
    from cryptography.fernet import Fernet
    print(Fernet.generate_key().decode())
"""

import os
import logging
import base64
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("wagora-api")

# ---------------------------------------------------------------------------
# Key bootstrap
# ---------------------------------------------------------------------------

def _load_or_create_key() -> bytes:
    """
    Loads ENCRYPTION_KEY from environment.

    In production (Railway/Vercel): set ENCRYPTION_KEY to a Fernet key.
    In development: if absent, generates a temporary key and warns loudly.
    The temporary key is NOT persisted — credentials encrypted with it
    cannot be decrypted after a server restart.
    """
    raw = os.getenv("ENCRYPTION_KEY", "")
    if raw:
        try:
            # Validate it decodes to exactly 32 bytes
            decoded = base64.urlsafe_b64decode(raw.encode())
            if len(decoded) == 32:
                return raw.encode()
            raise ValueError("ENCRYPTION_KEY must decode to exactly 32 bytes")
        except Exception as e:
            logger.error(f"Invalid ENCRYPTION_KEY in environment: {e}")
            raise RuntimeError(
                "ENCRYPTION_KEY is set but invalid. "
                "Generate a valid key: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )

    # No key set — generate ephemeral key with a loud warning
    ephemeral_key = Fernet.generate_key()
    logger.warning(
        "ENCRYPTION_KEY not set in environment. Using an ephemeral key — "
        "encrypted credentials WILL NOT survive a server restart. "
        "Set ENCRYPTION_KEY in your Railway environment variables."
    )
    return ephemeral_key


_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    """Returns the singleton Fernet instance, initialising on first call."""
    global _fernet
    if _fernet is None:
        key = _load_or_create_key()
        _fernet = Fernet(key)
    return _fernet


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def encrypt_credential(plaintext: str) -> str:
    """
    Encrypts a plaintext string and returns a URL-safe base64 token.

    Args:
        plaintext: The secret to encrypt (e.g. a Gmail App Password).

    Returns:
        An encrypted, URL-safe base64 string suitable for storing in the DB.

    Raises:
        ValueError: If plaintext is empty.
        RuntimeError: If the encryption key is invalid.
    """
    if not plaintext:
        raise ValueError("Cannot encrypt an empty credential")
    f = _get_fernet()
    token: bytes = f.encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_credential(token: str) -> str:
    """
    Decrypts an encrypted token back to its plaintext value.

    Args:
        token: The encrypted string previously returned by encrypt_credential().

    Returns:
        The original plaintext string.

    Raises:
        ValueError: If the token is empty, corrupted, or encrypted with a
                    different key (e.g. after a key rotation).
    """
    if not token:
        raise ValueError("Cannot decrypt an empty token")
    f = _get_fernet()
    try:
        plaintext: bytes = f.decrypt(token.encode("utf-8"))
        return plaintext.decode("utf-8")
    except InvalidToken:
        raise ValueError(
            "Failed to decrypt credential — the token is invalid or was "
            "encrypted with a different key. The user may need to reconnect."
        )
    except Exception as e:
        logger.error(f"Unexpected decryption error: {e}")
        raise ValueError(f"Decryption failed: {e}")

import os
import hmac
import hashlib


def user_id_hash(user_id: str) -> str:
    """Stable anonymized hash for a user id.

    Uses HMAC-SHA256 with a server-side secret so hashes are consistent but non-reversible
    without the secret. Truncated for readability.
    """
    secret = os.getenv("USER_HASH_SECRET", "dev-secret-change-me")
    digest = hmac.new(secret.encode("utf-8"), user_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return digest[:24]



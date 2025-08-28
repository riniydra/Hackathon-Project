import base64, os, hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from .config import settings

# derive a 32-byte key from APP_ENC_KEY (dev); replace with KMS in prod
_key = hashlib.sha256(settings.APP_ENC_KEY.encode()).digest()

def encrypt_text(plain: str) -> tuple[str, str, str]:
    aes = AESGCM(_key)
    iv = os.urandom(12)
    ct = aes.encrypt(iv, plain.encode("utf-8"), None)
    tag = ct[-16:]
    return base64.b64encode(ct).decode(), base64.b64encode(iv).decode(), base64.b64encode(tag).decode()

def decrypt_text(ciphertext_b64: str, iv_b64: str) -> str:
    aes = AESGCM(_key)
    ct = base64.b64decode(ciphertext_b64)
    iv = base64.b64decode(iv_b64)
    pt = aes.decrypt(iv, ct, None)
    return pt.decode("utf-8")

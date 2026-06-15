"""Fernet encryption for stored integration tokens."""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from src.config import get_settings


def _fernet() -> Fernet | None:
    key = get_settings().encryption_key
    if not key:
        return None
    # Derive a valid 32-byte Fernet key from arbitrary secret
    derived = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
    return Fernet(derived)


def encrypt_value(plaintext: str) -> str:
    f = _fernet()
    if f is None:
        return plaintext
    return f.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    f = _fernet()
    if f is None:
        return ciphertext
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        return ciphertext

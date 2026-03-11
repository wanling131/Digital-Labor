from __future__ import annotations

import base64
import hashlib
import os
from dataclasses import dataclass
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from digital_labor.settings import settings


IV_LENGTH = 16
AUTH_TAG_LENGTH = 16


def _master_key() -> str:
    # Node 端：process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
    # 迁移时必须与生产环境一致，否则历史密文无法解密。
    return settings.encryption_key or os.getenv("ENCRYPTION_KEY", "")


def _derive_key() -> bytes:
    # Node 端：crypto.scryptSync(MASTER_KEY, 'salt', 32)
    mk = _master_key()
    if not mk:
        # 未配置时无法保证与历史一致：保持空值，解密会失败，由上层容错按“明文脱敏”处理
        mk = ""
    return hashlib.scrypt(mk.encode("utf-8"), salt=b"salt", n=16384, r=8, p=1, dklen=32)


def encrypt(text: str) -> str:
    if text is None or str(text) == "":
        return text
    key = _derive_key()
    aesgcm = AESGCM(key)
    iv = os.urandom(IV_LENGTH)
    ct = aesgcm.encrypt(iv, str(text).encode("utf-8"), None)  # ct includes tag at end
    # Node 端：result = ivHex + authTagHex + encryptedHex（encrypted 不含 tag）
    encrypted = ct[:-AUTH_TAG_LENGTH]
    tag = ct[-AUTH_TAG_LENGTH:]
    blob_hex = iv.hex() + tag.hex() + encrypted.hex()
    return base64.b64encode(bytes.fromhex(blob_hex)).decode("utf-8")


def decrypt(encrypted_data: str) -> str:
    if encrypted_data is None or str(encrypted_data) == "":
        return encrypted_data
    key = _derive_key()
    raw_hex = base64.b64decode(str(encrypted_data)).hex()
    iv = bytes.fromhex(raw_hex[: IV_LENGTH * 2])
    tag = bytes.fromhex(raw_hex[IV_LENGTH * 2 : (IV_LENGTH + AUTH_TAG_LENGTH) * 2])
    encrypted = bytes.fromhex(raw_hex[(IV_LENGTH + AUTH_TAG_LENGTH) * 2 :])
    aesgcm = AESGCM(key)
    pt = aesgcm.decrypt(iv, encrypted + tag, None)
    return pt.decode("utf-8")


def mask_sensitive_data(data: str, typ: str) -> str:
    if data is None or str(data) == "":
        return data
    s = str(data)
    if typ == "idCard":
        if len(s) == 18:
            return s[:3] + ("*" * 10) + s[-4:]
        return s[:2] + "****" + s[-2:]
    if typ == "mobile":
        if len(s) == 11:
            return s[:3] + "****" + s[-4:]
        return s
    if typ == "name":
        if len(s) <= 1:
            return s
        return s[0] + ("*" * (len(s) - 1))
    if typ == "bankCard":
        if len(s) > 4:
            return ("*" * (len(s) - 4)) + s[-4:]
        return s
    if len(s) <= 4:
        return s
    return s[:2] + ("*" * (len(s) - 4)) + s[-2:]


def safe_decrypt_then_mask(value: Optional[str], typ: str) -> Optional[str]:
    if value is None:
        return None
    try:
        return mask_sensitive_data(decrypt(value), typ)
    except Exception:  # noqa: BLE001
        # 与 Node 端行为一致：历史明文/坏密文时也能返回脱敏结果
        return mask_sensitive_data(str(value), typ)


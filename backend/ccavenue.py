"""
CCAvenue non-seamless (redirect / iFrame) payment gateway integration.

Encryption: AES-128-CBC with:
  - Key  = MD5(working_key) as 16 raw bytes
  - IV   = 16 zero bytes (static)
  - Padding = PKCS7 (16-byte blocks)
  - Encoding = HEX (uppercase) for ciphertext (CCAvenue's standard format)

CCAvenue publishes both the request payload (encRequest) and the response
payload (encResp) as HEX-encoded ciphertext. Do NOT base64 — CCAvenue's own
sample kits use hex and their server will reject base64.

References: CCAvenue Integration Kit v3.1 + community-verified PHP/Python
sample implementations.
"""
from __future__ import annotations

import binascii
from hashlib import md5
from typing import Dict
from urllib.parse import urlencode, parse_qsl

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

_BLOCK_SIZE = 16
_IV = b"\x00" * _BLOCK_SIZE


def _derive_key(working_key: str) -> bytes:
    """CCAvenue uses the raw 16-byte MD5 digest of the Working Key as the AES key."""
    return md5(working_key.encode("utf-8")).digest()


def encrypt(plain_text: str, working_key: str) -> str:
    """Encrypt a CCAvenue plaintext payload → HEX ciphertext string."""
    key = _derive_key(working_key)
    cipher = AES.new(key, AES.MODE_CBC, _IV)
    padded = pad(plain_text.encode("utf-8"), _BLOCK_SIZE)
    ciphertext = cipher.encrypt(padded)
    return binascii.hexlify(ciphertext).decode("ascii")


def decrypt(enc_hex: str, working_key: str) -> str:
    """Decrypt a CCAvenue HEX ciphertext (encResp) → plaintext string."""
    key = _derive_key(working_key)
    cipher = AES.new(key, AES.MODE_CBC, _IV)
    ciphertext = binascii.unhexlify(enc_hex.strip())
    padded_plain = cipher.decrypt(ciphertext)
    try:
        plain = unpad(padded_plain, _BLOCK_SIZE)
    except ValueError:
        # Some CCAvenue responses aren't strictly padded — best-effort trim
        plain = padded_plain.rstrip(b"\x00 \r\n")
    return plain.decode("utf-8", errors="replace")


def build_plaintext(params: Dict[str, str]) -> str:
    """Serialize a params dict → CCAvenue's key1=value1&key2=value2 format.

    Uses `urlencode` so spaces / special characters in billing fields are
    properly percent-encoded before AES encryption.
    """
    # Drop None/empty values — CCAvenue rejects blanks for some required fields
    cleaned = {k: str(v) for k, v in params.items() if v is not None and str(v) != ""}
    return urlencode(cleaned, doseq=False)


def parse_plaintext(plain_text: str) -> Dict[str, str]:
    """Parse a decrypted CCAvenue key=value&... string → dict.

    Uses `parse_qsl` which properly URL-decodes each value.
    """
    return dict(parse_qsl(plain_text, keep_blank_values=True))


def transaction_url(environment: str) -> str:
    """Return the CCAvenue transaction endpoint URL for the given environment."""
    env = (environment or "").lower().strip()
    if env == "production":
        return "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
    return "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction"

import argparse
import getpass
import hashlib
import secrets
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: install cryptography with `pip install cryptography`"
    ) from exc

ENCRYPTION_MAGIC = b"HTMdLENC"
ENCRYPTION_VERSION = 1
KDF_ITERATIONS = 200_000
SALT_LENGTH = 16
NONCE_LENGTH = 12


def derive_key(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        KDF_ITERATIONS,
        dklen=32,
    )


def encrypt_content(plaintext: bytes, password: str) -> bytes:
    salt = secrets.token_bytes(SALT_LENGTH)
    nonce = secrets.token_bytes(NONCE_LENGTH)
    key = derive_key(password, salt)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return ENCRYPTION_MAGIC + bytes([ENCRYPTION_VERSION]) + salt + nonce + ciphertext


def prompt_password(confirm: bool = True) -> str:
    while True:
        password = getpass.getpass("Enter encryption password: ")
        if not password:
            print("Password cannot be empty.")
            continue
        if not confirm:
            return password
        verify = getpass.getpass("Confirm password: ")
        if password != verify:
            print("Passwords do not match. Try again.")
            continue
        return password


def find_markdown_files(source_dir: Path):
    return sorted(p for p in source_dir.rglob("*.md") if p.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Encrypt markdown files in src/mdsrc using AES-256-GCM and PBKDF2.")
    parser.add_argument(
        "--source-dir",
        default="src/mdsrc",
        help="Path to the markdown source directory (default: src/mdsrc)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing .enc files without asking",
    )
    args = parser.parse_args()

    source_dir = Path(args.source_dir).expanduser()
    if not source_dir.is_dir():
        print(f"Source directory not found: {source_dir}")
        return 1

    md_files = find_markdown_files(source_dir)
    if not md_files:
        print(f"No markdown files found in {source_dir}")
        return 0

    password = prompt_password()
    print(f"Encrypting {len(md_files)} markdown file(s) in {source_dir}...")

    for md_path in md_files:
        dest_path = md_path.with_suffix(md_path.suffix + ".enc")
        if dest_path.exists() and not args.force:
            answer = input(f"Overwrite existing {dest_path.name}? [y/N]: ").strip().lower()
            if answer != "y":
                print(f"Skipping {md_path.name}")
                continue

        plaintext = md_path.read_bytes()
        encrypted = encrypt_content(plaintext, password)
        dest_path.write_bytes(encrypted)
        print(f"Encrypted {md_path.name} -> {dest_path.name}")

    print("Encryption complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

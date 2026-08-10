import hashlib
import os
from fastapi import UploadFile, HTTPException, status

STORAGE_DIR = os.environ.get("EVIDENCE_STORAGE_DIR", "storage/evidence")


def calculate_file_hash(file_data: bytes) -> str:
    return hashlib.sha256(file_data).hexdigest()


async def save_evidence_file(file: UploadFile, issue_id: int) -> dict:
    file_data = await file.read()
    file_size = len(file_data)

    if file_size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit"
        )

    file_hash = calculate_file_hash(file_data)
    file_extension = os.path.splitext(file.filename or "file")[1]
    relative_dir = f"issue_{issue_id}"
    storage_dir = os.path.join(STORAGE_DIR, relative_dir)
    os.makedirs(storage_dir, exist_ok=True)

    relative_path = f"{relative_dir}/{file_hash}{file_extension}"
    absolute_path = os.path.join(STORAGE_DIR, relative_path)

    if not os.path.exists(absolute_path):
        with open(absolute_path, "wb") as f:
            f.write(file_data)

    return {
        "file_path": f"/uploads/{relative_path}",
        "file_hash": file_hash,
        "file_size": file_size,
        "original_filename": file.filename,
        "content_type": file.content_type,
    }

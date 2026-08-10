from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from config.settings import settings
from config.database import get_db
from services.auth_service import verify_token
from models.models import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Extract and validate JWT token, return current user."""
    token = credentials.credentials

    try:
        token_data = verify_token(token)
        if token_data is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    user = db.query(User).filter(User.email == token_data.email).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been banned"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


async def get_current_moderator(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require moderator or admin role."""
    if current_user.role not in ["moderator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin/moderator access required"
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# Optional auth - returns user if authenticated, None otherwise
async def get_optional_user(
    credentials: HTTPAuthCredentials = Depends(security) if security else None,
    db: Session = Depends(get_db) if get_db else None
) -> User | None:
    """Extract user if token provided, return None if not."""
    if not credentials:
        return None

    try:
        token_data = verify_token(credentials.credentials)
        if token_data is None:
            return None
    except JWTError:
        return None

    user = db.query(User).filter(User.email == token_data.email).first()
    return user if not user.is_banned and user.is_active else None

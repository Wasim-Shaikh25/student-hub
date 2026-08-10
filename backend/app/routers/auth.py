from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from config.database import get_db
from config.settings import settings
from schemas.schemas import UserCreate, UserLogin, Token, UserResponse
from services.auth_service import (
    create_user,
    authenticate_user,
    create_access_token,
    get_user_by_email,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user exists
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user = create_user(db, user_data)
    return user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token."""
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    token: str = None,
    db: Session = Depends(get_db)
):
    """Get current authenticated user."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    # TODO: Extract email from token and return user
    # This will be implemented with proper JWT middleware
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token validation not yet implemented"
    )

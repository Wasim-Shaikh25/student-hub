from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from config.database import get_db
from config.settings import settings
from schemas.schemas import UserCreate, UserLogin, AdminLogin, Token, UserResponse, UserProfileUpdate, UserPasswordUpdate
from models.models import User
from services.auth_service import (
    create_user,
    authenticate_user,
    authenticate_admin,
    create_access_token,
    get_user_by_email,
    get_password_hash,
    verify_password,
)
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _auth_response(user) -> dict:
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new student user and log them in."""
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user = create_user(db, user_data, role="student")
    return _auth_response(user)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token."""
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    return _auth_response(user)


@router.post("/admin-login", response_model=Token)
async def admin_login(credentials: AdminLogin, db: Session = Depends(get_db)):
    """Login super admin with env credentials."""
    user = authenticate_admin(db, credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )

    return _auth_response(user)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    update: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's profile."""
    if update.display_name is not None:
        current_user.display_name = update.display_name
    if update.bio is not None:
        current_user.bio = update.bio
    if update.phone is not None:
        existing = db.query(User).filter(User.phone == update.phone, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already in use")
        current_user.phone = update.phone
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
async def update_password(
    update: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's password."""
    if not verify_password(update.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    current_user.password_hash = get_password_hash(update.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Password updated"}

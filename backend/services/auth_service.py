from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from config.settings import settings
from models.models import User
from schemas.schemas import UserCreate, TokenData, AdminLogin

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _truncate_password(password: str) -> str:
    # bcrypt has a 72-byte limit on passwords
    return password.encode("utf-8")[:72].decode("utf-8", "ignore")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_truncate_password(plain_password), hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(_truncate_password(password))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return TokenData(email=email)
    except JWTError:
        return None


def create_user(db: Session, user_data: UserCreate, role: str = "student") -> User:
    """Create a new user."""
    db_user = User(
        email=user_data.email,
        display_name=user_data.display_name,
        password_hash=get_password_hash(user_data.password),
        phone=user_data.phone,
        role=role,
        verification_status="unverified",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_admin_user(db: Session) -> User | None:
    """Seed the environment-defined super admin if credentials are provided."""
    email = settings.SUPER_ADMIN_EMAIL
    password = settings.SUPER_ADMIN_PASSWORD
    if not email or not password:
        return None
    existing = get_user_by_email(db, email)
    if existing:
        return existing
    db_user = User(
        email=email,
        display_name="Super Admin",
        password_hash=get_password_hash(password),
        phone=settings.SUPER_ADMIN_MOBILE,
        role="admin",
        verification_status="admin",
        is_active=True,
        is_banned=False,
    )
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
    except Exception:
        db.rollback()
        existing = get_user_by_email(db, email)
        if existing:
            return existing
        raise
    return db_user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate user by email and password."""
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def authenticate_admin(db: Session, credentials: AdminLogin) -> Optional[User]:
    """Authenticate super admin by email and password."""
    user = get_user_by_email(db, credentials.email)
    if not user or user.role != "admin":
        return None
    if not verify_password(credentials.password, user.password_hash):
        return None
    return user


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()

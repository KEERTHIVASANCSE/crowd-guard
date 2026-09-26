import datetime
from typing import Optional
import jwt
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.config import settings
from app.database.database import get_db
from app.database.models import User, AuditLog

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    department: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    department: Optional[str] = None
    is_active: bool

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pw_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def seed_default_users(db: Session):
    """Pre-seeds standard and emergency department accounts."""
    default_accounts = [
        {"username": "admin", "email": "admin@sentinelvision.ai", "password": "admin123", "role": "admin", "dept": "Command Center SOC"},
        {"username": "user", "email": "user@sentinelvision.ai", "password": "user123", "role": "user", "dept": "Security Staff"},
        {"username": "police", "email": "police@emergency.gov", "password": "police123", "role": "police", "dept": "Police Department"},
        {"username": "ambulance", "email": "ambulance@emergency.gov", "password": "ambulance123", "role": "ambulance", "dept": "Medical Response"},
        {"username": "fireservice", "email": "fire@emergency.gov", "password": "fireservice123", "role": "fireservice", "dept": "Fire & Rescue Service"},
    ]

    for acc in default_accounts:
        existing = db.query(User).filter(User.username == acc["username"]).first()
        if not existing:
            new_user = User(
                username=acc["username"],
                email=acc["email"],
                hashed_password=get_password_hash(acc["password"]),
                role=acc["role"],
                department=acc["dept"],
                is_active=True
            )
            db.add(new_user)
    db.commit()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Log audit entry
    log = AuditLog(
        user_username=user.username,
        action="LOGIN",
        details=f"User logged in successfully as {user.role} ({user.department})"
    )
    db.add(log)
    db.commit()

    token = create_access_token(data={"sub": user.username, "role": user.role, "dept": user.department})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "department": user.department
    }

@router.post("/token", response_model=TokenResponse)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token(data={"sub": user.username, "role": user.role, "dept": user.department})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "department": user.department
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users")
def list_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return db.query(User).all()

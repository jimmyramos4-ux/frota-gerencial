import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

import models
from database import get_db

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Usuario:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise exc
    except JWTError:
        raise exc

    user = (
        db.query(models.Usuario)
        .filter(models.Usuario.id == user_id, models.Usuario.ativo == True)
        .first()
    )
    if user is None:
        raise exc
    return user


def require_admin(current_user: models.Usuario = Depends(get_current_user)) -> models.Usuario:
    if current_user.perfil != models.PerfilUsuario.admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return current_user


def require_gerencial_or_admin(current_user: models.Usuario = Depends(get_current_user)) -> models.Usuario:
    if current_user.perfil not in (models.PerfilUsuario.admin, models.PerfilUsuario.gerencial):
        raise HTTPException(status_code=403, detail="Acesso restrito")
    return current_user


def user_to_dict(user: models.Usuario) -> dict:
    return {
        "id": user.id,
        "nome": user.nome,
        "username": user.username,
        "perfil": user.perfil,
        "filial_id": user.filial_id,
        "filial_nome": user.filial.nome if user.filial else None,
    }

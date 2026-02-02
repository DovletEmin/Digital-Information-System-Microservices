# Auth middleware - будет валидировать JWT токены через Auth Service
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import os

security = HTTPBearer()

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")

async def verify_token(credentials: HTTPAuthorizationCredentials):
    """Валидация токена через Auth Service"""
    token = credentials.credentials
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{AUTH_SERVICE_URL}/api/v1/validate",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=401, detail="Invalid token")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Auth service unavailable")

def auth_middleware(required: bool = True):
    """Middleware для проверки аутентификации"""
    async def dependency(credentials: HTTPAuthorizationCredentials = security):
        if required:
            return await verify_token(credentials)
        return None
    
    return dependency

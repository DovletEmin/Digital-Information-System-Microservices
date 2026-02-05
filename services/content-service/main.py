from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
import uvicorn
import os

from database import engine, Base, get_db
from routers import articles, books, dissertations, categories, saved
from middleware import auth_middleware
from request_middleware import RequestNormalizationMiddleware

# Создание таблиц
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Content Service API",
    description="Управление контентом - статьи, книги, диссертации",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    redirect_slashes=False
)

# Request normalization FIRST
app.add_middleware(RequestNormalizationMiddleware)

# Allowed hosts
allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "*")
allowed_hosts = [host.strip() for host in allowed_hosts_env.split(",") if host.strip()]
if allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# CORS
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "content-service"}

# Подключение роутеров с префиксами как в монолите
# Убираем trailing slash из префиксов, т.к. роуты начинаются с "/"
app.include_router(articles.router, prefix="/api/v1", tags=["Articles"])
app.include_router(books.router, prefix="/api/v1", tags=["Books"])
app.include_router(dissertations.router, prefix="/api/v1", tags=["Dissertations"])
app.include_router(categories.router, prefix="/api/v1", tags=["Categories"])
app.include_router(saved.router, prefix="/api/v1", tags=["Saved & Highlights"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)

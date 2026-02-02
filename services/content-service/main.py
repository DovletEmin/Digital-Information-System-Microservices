from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn

from database import engine, Base, get_db
from routers import articles, books, dissertations, categories
from middleware import auth_middleware

# Создание таблиц
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Content Service API",
    description="Управление контентом - статьи, книги, диссертации",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "content-service"}

# Подключение роутеров с префиксами как в монолите
app.include_router(articles.router, prefix="/api/v1/articles", tags=["Articles"])
app.include_router(books.router, prefix="/api/v1/books", tags=["Books"])
app.include_router(dissertations.router, prefix="/api/v1/dissertations", tags=["Dissertations"])
app.include_router(categories.router, prefix="/api/v1", tags=["Categories"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)

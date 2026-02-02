from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Article, ArticleCategory
from schemas import ArticleCreate, ArticleUpdate, ArticleResponse
import math

router = APIRouter()

@router.get("/", response_model=dict)
async def list_articles(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    author: Optional[str] = None,
    language: Optional[str] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Список статей с пагинацией и фильтрами"""
    query = db.query(Article)
    
    # Фильтры
    if author:
        query = query.filter(Article.author.ilike(f"%{author}%"))
    if language:
        query = query.filter(Article.language == language)
    if category_id:
        query = query.join(Article.categories).filter(ArticleCategory.id == category_id)
    if search:
        query = query.filter(
            (Article.title.ilike(f"%{search}%")) | 
            (Article.author.ilike(f"%{search}%")) |
            (Article.keywords.ilike(f"%{search}%"))
        )
    
    # Пагинация
    total = query.count()
    articles = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        "items": articles,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page)
    }

@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: int, db: Session = Depends(get_db)):
    """Получение статьи по ID"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Увеличиваем счетчик просмотров
    article.views += 1
    db.commit()
    
    return article

@router.post("/", response_model=ArticleResponse, status_code=201)
async def create_article(article: ArticleCreate, db: Session = Depends(get_db)):
    """Создание новой статьи"""
    # Создаем статью
    db_article = Article(**article.model_dump(exclude={"category_ids"}))
    
    # Добавляем категории
    if article.category_ids:
        categories = db.query(ArticleCategory).filter(ArticleCategory.id.in_(article.category_ids)).all()
        db_article.categories = categories
    
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    
    return db_article

@router.put("/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: int,
    article: ArticleUpdate,
    db: Session = Depends(get_db)
):
    """Обновление статьи"""
    db_article = db.query(Article).filter(Article.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Обновляем поля
    update_data = article.model_dump(exclude_unset=True, exclude={"category_ids"})
    for key, value in update_data.items():
        setattr(db_article, key, value)
    
    # Обновляем категории
    if article.category_ids is not None:
        categories = db.query(ArticleCategory).filter(ArticleCategory.id.in_(article.category_ids)).all()
        db_article.categories = categories
    
    db.commit()
    db.refresh(db_article)
    
    return db_article

@router.delete("/{article_id}")
async def delete_article(article_id: int, db: Session = Depends(get_db)):
    """Удаление статьи"""
    db_article = db.query(Article).filter(Article.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    db.delete(db_article)
    db.commit()
    
    return {"message": "Article deleted successfully"}

@router.get("/{article_id}/increment-views")
async def increment_views(article_id: int, db: Session = Depends(get_db)):
    """Увеличить счетчик просмотров"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    article.views += 1
    db.commit()
    
    return {"views": article.views}

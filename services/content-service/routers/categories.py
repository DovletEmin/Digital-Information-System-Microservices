from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import ArticleCategory, BookCategory, DissertationCategory
from schemas import (
    ArticleCategoryCreate, ArticleCategoryResponse,
    BookCategoryCreate, BookCategoryResponse,
    DissertationCategoryCreate, DissertationCategoryResponse
)

router = APIRouter()

# Article Categories
@router.get("/article-categories", response_model=List[ArticleCategoryResponse])
async def list_article_categories(db: Session = Depends(get_db)):
    return db.query(ArticleCategory).all()

@router.post("/article-categories", response_model=ArticleCategoryResponse, status_code=201)
async def create_article_category(category: ArticleCategoryCreate, db: Session = Depends(get_db)):
    db_category = ArticleCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# Book Categories
@router.get("/book-categories", response_model=List[BookCategoryResponse])
async def list_book_categories(db: Session = Depends(get_db)):
    return db.query(BookCategory).all()

@router.post("/book-categories", response_model=BookCategoryResponse, status_code=201)
async def create_book_category(category: BookCategoryCreate, db: Session = Depends(get_db)):
    db_category = BookCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# Dissertation Categories
@router.get("/dissertation-categories", response_model=List[DissertationCategoryResponse])
async def list_dissertation_categories(db: Session = Depends(get_db)):
    return db.query(DissertationCategory).all()

@router.post("/dissertation-categories", response_model=DissertationCategoryResponse, status_code=201)
async def create_dissertation_category(
    category: DissertationCategoryCreate,
    db: Session = Depends(get_db)
):
    db_category = DissertationCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

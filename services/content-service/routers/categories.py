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
    categories = db.query(ArticleCategory).all()
    return [{"id": c.id, "name": c.name} for c in categories]

@router.post("/article-categories", response_model=ArticleCategoryResponse, status_code=201)
async def create_article_category(category: ArticleCategoryCreate, db: Session = Depends(get_db)):
    db_category = ArticleCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return {"id": db_category.id, "name": db_category.name}

@router.put("/article-categories/{category_id}", response_model=ArticleCategoryResponse)
async def update_article_category(category_id: int, category: ArticleCategoryCreate, db: Session = Depends(get_db)):
    db_category = db.query(ArticleCategory).filter(ArticleCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_category.name = category.name
    db.commit()
    db.refresh(db_category)
    return {"id": db_category.id, "name": db_category.name}

@router.delete("/article-categories/{category_id}")
async def delete_article_category(category_id: int, db: Session = Depends(get_db)):
    db_category = db.query(ArticleCategory).filter(ArticleCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted successfully"}

# Book Categories
@router.get("/book-categories", response_model=List[BookCategoryResponse])
async def list_book_categories(db: Session = Depends(get_db)):
    categories = db.query(BookCategory).all()
    return [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in categories]

@router.post("/book-categories", response_model=BookCategoryResponse, status_code=201)
async def create_book_category(category: BookCategoryCreate, db: Session = Depends(get_db)):
    db_category = BookCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return {"id": db_category.id, "name": db_category.name, "parent_id": db_category.parent_id}

@router.put("/book-categories/{category_id}", response_model=BookCategoryResponse)
async def update_book_category(category_id: int, category: BookCategoryCreate, db: Session = Depends(get_db)):
    db_category = db.query(BookCategory).filter(BookCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_category.name = category.name
    if hasattr(category, 'parent_id'):
        db_category.parent_id = category.parent_id
    db.commit()
    db.refresh(db_category)
    return {"id": db_category.id, "name": db_category.name, "parent_id": db_category.parent_id}

@router.delete("/book-categories/{category_id}")
async def delete_book_category(category_id: int, db: Session = Depends(get_db)):
    db_category = db.query(BookCategory).filter(BookCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted"}

@router.put("/dissertation-categories/{category_id}", response_model=DissertationCategoryResponse)
async def update_dissertation_category(category_id: int, category: DissertationCategoryCreate, db: Session = Depends(get_db)):
    db_category = db.query(DissertationCategory).filter(DissertationCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_category.name = category.name
    if hasattr(category, 'parent_id'):
        db_category.parent_id = category.parent_id
    db.commit()
    db.refresh(db_category)
    return {"id": db_category.id, "name": db_category.name, "parent_id": db_category.parent_id}

@router.delete("/dissertation-categories/{category_id}")
async def delete_dissertation_category(category_id: int, db: Session = Depends(get_db)):
    db_category = db.query(DissertationCategory).filter(DissertationCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted successfully"}

# Dissertation Categories
@router.get("/dissertation-categories", response_model=List[DissertationCategoryResponse])
async def list_dissertation_categories(db: Session = Depends(get_db)):
    categories = db.query(DissertationCategory).all()
    return [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in categories]

@router.post("/dissertation-categories", response_model=DissertationCategoryResponse, status_code=201)
async def create_dissertation_category(
    category: DissertationCategoryCreate,
    db: Session = Depends(get_db)
):
    db_category = DissertationCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return {"id": db_category.id, "name": db_category.name, "parent_id": db_category.parent_id}
    return db_category

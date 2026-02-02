from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Book, BookCategory
from schemas import BookCreate, BookUpdate, BookResponse
import math

router = APIRouter()

@router.get("/", response_model=dict)
async def list_books(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    author: Optional[str] = None,
    language: Optional[str] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Список книг с пагинацией и фильтрами"""
    query = db.query(Book)
    
    if author:
        query = query.filter(Book.author.ilike(f"%{author}%"))
    if language:
        query = query.filter(Book.language == language)
    if category_id:
        query = query.join(Book.categories).filter(BookCategory.id == category_id)
    if search:
        query = query.filter(
            (Book.title.ilike(f"%{search}%")) | 
            (Book.author.ilike(f"%{search}%"))
        )
    
    total = query.count()
    books = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        "items": books,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page)
    }

@router.get("/{book_id}", response_model=BookResponse)
async def get_book(book_id: int, db: Session = Depends(get_db)):
    """Получение книги по ID"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    book.views += 1
    db.commit()
    
    return book

@router.post("/", response_model=BookResponse, status_code=201)
async def create_book(book: BookCreate, db: Session = Depends(get_db)):
    """Создание новой книги"""
    db_book = Book(**book.model_dump(exclude={"category_ids"}))
    
    if book.category_ids:
        categories = db.query(BookCategory).filter(BookCategory.id.in_(book.category_ids)).all()
        db_book.categories = categories
    
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    
    return db_book

@router.put("/{book_id}", response_model=BookResponse)
async def update_book(book_id: int, book: BookUpdate, db: Session = Depends(get_db)):
    """Обновление книги"""
    db_book = db.query(Book).filter(Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    update_data = book.model_dump(exclude_unset=True, exclude={"category_ids"})
    for key, value in update_data.items():
        setattr(db_book, key, value)
    
    if book.category_ids is not None:
        categories = db.query(BookCategory).filter(BookCategory.id.in_(book.category_ids)).all()
        db_book.categories = categories
    
    db.commit()
    db.refresh(db_book)
    
    return db_book

@router.delete("/{book_id}")
async def delete_book(book_id: int, db: Session = Depends(get_db)):
    """Удаление книги"""
    db_book = db.query(Book).filter(Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    db.delete(db_book)
    db.commit()
    
    return {"message": "Book deleted successfully"}

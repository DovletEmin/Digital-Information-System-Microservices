from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Book, BookCategory, BookReadingProgress
from schemas import BookCreate, BookUpdate, BookResponse, BookReadingProgressCreate, BookReadingProgressUpdate, BookReadingProgressResponse
import math
import httpx
import io
import os
import re
from urllib.parse import quote, urlparse

router = APIRouter()

MEDIA_SERVICE_URL = os.getenv("MEDIA_SERVICE_URL", "").rstrip("/")
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", "").rstrip("/")

def _content_disposition(filename: str, disposition: str) -> str:
    # Ensure ASCII-safe fallback for header values, while preserving UTF-8 via filename*
    safe_base = re.sub(r"[^A-Za-z0-9._-]+", "_", filename).strip("_") or "book"
    safe_name = f"{safe_base}.pdf"
    utf8_name = quote(f"{filename}.pdf", safe="")
    return f"{disposition}; filename=\"{safe_name}\"; filename*=UTF-8''{utf8_name}"

# Prefer the original URL first; use media-service only as fallback.
def _primary_pdf_url(url: str) -> str:
    return url

async def _fetch_pdf(url: str) -> httpx.Response:
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        return await client.get(url)

def _media_fallback_url(original_url: str, use_download: bool) -> Optional[str]:
    if not MEDIA_SERVICE_URL:
        return None
    parsed = urlparse(original_url)
    basename = os.path.basename(parsed.path)
    if not basename:
        return None
    endpoint = "download" if use_download else "file"
    return f"{MEDIA_SERVICE_URL}/api/v1/{endpoint}/{basename}"

@router.get("/books", response_model=dict)
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
    
    items = []
    for book in books:
        items.append({
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "authors_workplace": book.authors_workplace,
            "thumbnail": book.thumbnail,
            "description": book.description,
            "content": book.content,
            "pdf_file_url": book.pdf_file_url,
            "epub_file_url": book.epub_file_url,
            "publication_date": book.publication_date,
            "language": book.language,
            "type": book.type,
            "views": book.views,
            "rating": book.rating,
            "average_rating": book.average_rating,
            "rating_count": book.rating_count,
            "categories": [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in book.categories],
            "created_at": book.created_at,
            "updated_at": book.updated_at
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page)
    }

@router.get("/books/{book_id}")
async def get_book(book_id: int, db: Session = Depends(get_db)):
    """Получение книги по ID"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    book.views += 1
    db.commit()
    
    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "authors_workplace": book.authors_workplace,
        "thumbnail": book.thumbnail,
        "description": book.description,
        "content": book.content,
        "pdf_file_url": book.pdf_file_url,
        "epub_file_url": book.epub_file_url,
        "publication_date": book.publication_date,
        "language": book.language,
        "type": book.type,
        "views": book.views,
        "rating": book.rating,
        "average_rating": book.average_rating,
        "rating_count": book.rating_count,
        "categories": [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in book.categories],
        "created_at": book.created_at,
        "updated_at": book.updated_at
    }

@router.post("/books", status_code=201)
async def create_book(book: BookCreate, db: Session = Depends(get_db)):
    """Создание новой книги"""
    db_book = Book(**book.model_dump(exclude={"category_ids"}))
    
    if book.category_ids:
        categories = db.query(BookCategory).filter(BookCategory.id.in_(book.category_ids)).all()
        db_book.categories = categories
    
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    
    return {
        "id": db_book.id,
        "title": db_book.title,
        "author": db_book.author,
        "authors_workplace": db_book.authors_workplace,
        "thumbnail": db_book.thumbnail,
        "description": db_book.description,
        "content": db_book.content,
        "pdf_file_url": db_book.pdf_file_url,
        "epub_file_url": db_book.epub_file_url,
        "publication_date": db_book.publication_date,
        "language": db_book.language,
        "type": db_book.type,
        "views": db_book.views,
        "rating": db_book.rating,
        "average_rating": db_book.average_rating,
        "rating_count": db_book.rating_count,
        "categories": [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in db_book.categories],
        "created_at": db_book.created_at,
        "updated_at": db_book.updated_at
    }

@router.put("/books/{book_id}")
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
    
    return {
        "id": db_book.id,
        "title": db_book.title,
        "author": db_book.author,
        "authors_workplace": db_book.authors_workplace,
        "thumbnail": db_book.thumbnail,
        "description": db_book.description,
        "content": db_book.content,
        "pdf_file_url": db_book.pdf_file_url,
        "epub_file_url": db_book.epub_file_url,
        "publication_date": db_book.publication_date,
        "language": db_book.language,
        "type": db_book.type,
        "views": db_book.views,
        "rating": db_book.rating,
        "average_rating": db_book.average_rating,
        "rating_count": db_book.rating_count,
        "categories": [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in db_book.categories],
        "created_at": db_book.created_at,
        "updated_at": db_book.updated_at
    }

@router.delete("/books/{book_id}")
async def delete_book(book_id: int, db: Session = Depends(get_db)):
    """Удаление книги"""
    db_book = db.query(Book).filter(Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    db.delete(db_book)
    db.commit()
    
    return {"message": "Book deleted successfully"}

# Reading Progress endpoints
@router.get("/books/{book_id}/progress")
async def get_reading_progress(
    book_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Получение прогресса чтения книги для текущего пользователя"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    progress = db.query(BookReadingProgress).filter(
        BookReadingProgress.book_id == book_id,
        BookReadingProgress.user_id == user_id
    ).first()
    
    if not progress:
        # Возвращаем пустой прогресс, если еще не создан
        return {
            "book_id": book_id,
            "current_page": 1,
            "total_pages": None,
            "progress_percentage": 0.0,
            "last_position": None
        }
    
    return {
        "id": progress.id,
        "user_id": progress.user_id,
        "book_id": progress.book_id,
        "current_page": progress.current_page,
        "total_pages": progress.total_pages,
        "progress_percentage": progress.progress_percentage,
        "last_position": progress.last_position,
        "created_at": progress.created_at,
        "updated_at": progress.updated_at
    }

@router.post("/books/{book_id}/progress")
async def save_reading_progress(
    book_id: int,
    progress_data: BookReadingProgressCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Сохранение или обновление прогресса чтения книги"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    # Проверяем, существует ли книга
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Ищем существующий прогресс
    existing_progress = db.query(BookReadingProgress).filter(
        BookReadingProgress.book_id == book_id,
        BookReadingProgress.user_id == user_id
    ).first()
    
    if existing_progress:
        # Обновляем существующий прогресс
        existing_progress.current_page = progress_data.current_page
        if progress_data.total_pages is not None:
            existing_progress.total_pages = progress_data.total_pages
        existing_progress.progress_percentage = progress_data.progress_percentage
        if progress_data.last_position is not None:
            existing_progress.last_position = progress_data.last_position
        
        db.commit()
        db.refresh(existing_progress)
        
        return {
            "id": existing_progress.id,
            "user_id": existing_progress.user_id,
            "book_id": existing_progress.book_id,
            "current_page": existing_progress.current_page,
            "total_pages": existing_progress.total_pages,
            "progress_percentage": existing_progress.progress_percentage,
            "last_position": existing_progress.last_position,
            "created_at": existing_progress.created_at,
            "updated_at": existing_progress.updated_at
        }
    else:
        # Создаем новый прогресс
        new_progress = BookReadingProgress(
            user_id=user_id,
            book_id=book_id,
            current_page=progress_data.current_page,
            total_pages=progress_data.total_pages,
            progress_percentage=progress_data.progress_percentage,
            last_position=progress_data.last_position
        )
        
        db.add(new_progress)
        db.commit()
        db.refresh(new_progress)
        
        return {
            "id": new_progress.id,
            "user_id": new_progress.user_id,
            "book_id": new_progress.book_id,
            "current_page": new_progress.current_page,
            "total_pages": new_progress.total_pages,
            "progress_percentage": new_progress.progress_percentage,
            "last_position": new_progress.last_position,
            "created_at": new_progress.created_at,
            "updated_at": new_progress.updated_at
        }

@router.get("/books/{book_id}/read")
async def read_book(book_id: int, db: Session = Depends(get_db)):
    """Proxy endpoint для чтения PDF файла книги"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not book.pdf_file_url:
        raise HTTPException(status_code=404, detail="PDF file not found for this book")
    
    try:
        # Если это внешняя ссылка, проксируем запрос
        primary_url = _primary_pdf_url(book.pdf_file_url)
        response = await _fetch_pdf(primary_url)
        if response.status_code >= 400 or not response.content:
            fallback_url = _media_fallback_url(book.pdf_file_url, use_download=False)
            if fallback_url and fallback_url != primary_url:
                response = await _fetch_pdf(fallback_url)

        if response.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Failed to fetch PDF: {response.status_code}")
        if not response.content:
            raise HTTPException(status_code=502, detail="Failed to fetch PDF: empty response")

        return StreamingResponse(
            io.BytesIO(response.content),
            media_type=response.headers.get("content-type") or "application/pdf",
            headers={
                "Content-Disposition": _content_disposition(book.title, "inline"),
                "Accept-Ranges": "bytes",
            }
        )

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch PDF: {str(e)}")

@router.get("/books/{book_id}/download")
async def download_book(book_id: int, db: Session = Depends(get_db)):
    """Download endpoint for PDF files"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not book.pdf_file_url:
        raise HTTPException(status_code=404, detail="PDF file not found for this book")
    
    try:
        primary_url = _primary_pdf_url(book.pdf_file_url)
        response = await _fetch_pdf(primary_url)
        if response.status_code >= 400 or not response.content:
            fallback_url = _media_fallback_url(book.pdf_file_url, use_download=True)
            if fallback_url and fallback_url != primary_url:
                response = await _fetch_pdf(fallback_url)

        if response.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Failed to download PDF: {response.status_code}")
        if not response.content:
            raise HTTPException(status_code=502, detail="Failed to download PDF: empty response")
            
            return StreamingResponse(
                io.BytesIO(response.content),
                media_type=response.headers.get("content-type") or "application/pdf",
                headers={
                    "Content-Disposition": _content_disposition(book.title, "attachment"),
                    "Content-Type": "application/pdf",
                }
            )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to download PDF: {str(e)}")

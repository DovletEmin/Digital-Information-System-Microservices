from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import (
    SavedArticle,
    Article,
    ArticleHighlight,
    SavedBook,
    Book,
    BookHighlight,
    SavedDissertation,
    Dissertation,
    DissertationHighlight,
)
from schemas import (
    SavedArticleCreate,
    SavedArticleResponse,
    HighlightCreate,
    HighlightResponse,
    SavedBookCreate,
    SavedBookResponse,
    SavedDissertationCreate,
    SavedDissertationResponse,
    BookHighlightCreate,
    BookHighlightResponse,
    DissertationHighlightCreate,
    DissertationHighlightResponse,
)
import math

router = APIRouter()

# Закладки
@router.post("/saved-articles", status_code=201)
async def save_article(
    saved: SavedArticleCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Сохранить статью в закладки"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    # Проверяем, существует ли статья
    article = db.query(Article).filter(Article.id == saved.article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Проверяем, не сохранена ли уже
    existing = db.query(SavedArticle).filter(
        SavedArticle.user_id == user_id,
        SavedArticle.article_id == saved.article_id
    ).first()
    
    if existing:
        return {"id": existing.id, "article_id": existing.article_id, "created_at": existing.created_at}
    
    # Создаем новую закладку
    db_saved = SavedArticle(user_id=user_id, article_id=saved.article_id)
    db.add(db_saved)
    db.commit()
    db.refresh(db_saved)
    
    return {"id": db_saved.id, "article_id": db_saved.article_id, "created_at": db_saved.created_at}

@router.delete("/saved-articles/{article_id}")
async def unsave_article(
    article_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Удалить статью из закладок"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    saved = db.query(SavedArticle).filter(
        SavedArticle.user_id == user_id,
        SavedArticle.article_id == article_id
    ).first()
    
    if not saved:
        raise HTTPException(status_code=404, detail="Saved article not found")
    
    db.delete(saved)
    db.commit()
    
    return {"message": "Article removed from saved"}

@router.get("/saved-articles")
async def get_saved_articles(
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    """Получить список сохраненных статей"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    query = db.query(SavedArticle).filter(SavedArticle.user_id == user_id)
    
    total = query.count()
    saved_articles = query.offset((page - 1) * per_page).limit(per_page).all()
    
    items = []
    for saved in saved_articles:
        article = saved.article
        items.append({
            "id": article.id,
            "title": article.title,
            "author": article.author,
            "authors_workplace": article.authors_workplace,
            "thumbnail": article.thumbnail,
            "publication_date": article.publication_date,
            "language": article.language,
            "type": article.type,
            "views": article.views,
            "saved_at": saved.created_at,
            "categories": [{"id": c.id, "name": c.name} for c in article.categories],
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if total > 0 else 0
    }

@router.get("/saved-articles/check/{article_id}")
async def check_if_saved(
    article_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Проверить, сохранена ли статья"""
    if not user_id:
        return {"is_saved": False}
    
    saved = db.query(SavedArticle).filter(
        SavedArticle.user_id == user_id,
        SavedArticle.article_id == article_id
    ).first()
    
    return {"is_saved": saved is not None}

# Выделения текста
@router.post("/highlights", status_code=201)
async def create_highlight(
    highlight: HighlightCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Создать выделение текста"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    # Проверяем, существует ли статья
    article = db.query(Article).filter(Article.id == highlight.article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    db_highlight = ArticleHighlight(
        user_id=user_id,
        article_id=highlight.article_id,
        text=highlight.text,
        start_offset=highlight.start_offset,
        end_offset=highlight.end_offset,
        color=highlight.color,
        note=highlight.note
    )
    
    db.add(db_highlight)
    db.commit()
    db.refresh(db_highlight)
    
    return {
        "id": db_highlight.id,
        "article_id": db_highlight.article_id,
        "text": db_highlight.text,
        "start_offset": db_highlight.start_offset,
        "end_offset": db_highlight.end_offset,
        "color": db_highlight.color,
        "note": db_highlight.note,
        "created_at": db_highlight.created_at
    }

@router.get("/highlights/{article_id}")
async def get_highlights(
    article_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Получить все выделения для статьи"""
    if not user_id:
        return []
    
    highlights = db.query(ArticleHighlight).filter(
        ArticleHighlight.user_id == user_id,
        ArticleHighlight.article_id == article_id
    ).all()
    
    return [
        {
            "id": h.id,
            "article_id": h.article_id,
            "text": h.text,
            "start_offset": h.start_offset,
            "end_offset": h.end_offset,
            "color": h.color,
            "note": h.note,
            "created_at": h.created_at,
            "updated_at": h.updated_at
        }
        for h in highlights
    ]

@router.put("/highlights/{highlight_id}")
async def update_highlight(
    highlight_id: int,
    highlight: HighlightCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Обновить выделение (цвет или заметку)"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    db_highlight = db.query(ArticleHighlight).filter(
        ArticleHighlight.id == highlight_id,
        ArticleHighlight.user_id == user_id
    ).first()
    
    if not db_highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    if highlight.color:
        db_highlight.color = highlight.color
    if highlight.note is not None:
        db_highlight.note = highlight.note
    
    db.commit()
    db.refresh(db_highlight)
    
    return {
        "id": db_highlight.id,
        "article_id": db_highlight.article_id,
        "text": db_highlight.text,
        "start_offset": db_highlight.start_offset,
        "end_offset": db_highlight.end_offset,
        "color": db_highlight.color,
        "note": db_highlight.note,
        "updated_at": db_highlight.updated_at
    }

@router.delete("/highlights/{highlight_id}")
async def delete_highlight(
    highlight_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    """Удалить выделение"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    db_highlight = db.query(ArticleHighlight).filter(
        ArticleHighlight.id == highlight_id,
        ArticleHighlight.user_id == user_id
    ).first()
    
    if not db_highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    db.delete(db_highlight)
    db.commit()
    
    return {"message": "Highlight deleted"}

# Закладки книг
@router.post("/saved-books", status_code=201)
async def save_book(
    saved: SavedBookCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    book = db.query(Book).filter(Book.id == saved.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    existing = db.query(SavedBook).filter(
        SavedBook.user_id == user_id,
        SavedBook.book_id == saved.book_id
    ).first()

    if existing:
        return {"id": existing.id, "book_id": existing.book_id, "created_at": existing.created_at}

    db_saved = SavedBook(user_id=user_id, book_id=saved.book_id)
    db.add(db_saved)
    db.commit()
    db.refresh(db_saved)

    return {"id": db_saved.id, "book_id": db_saved.book_id, "created_at": db_saved.created_at}

@router.delete("/saved-books/{book_id}")
async def unsave_book(
    book_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    saved = db.query(SavedBook).filter(
        SavedBook.user_id == user_id,
        SavedBook.book_id == book_id
    ).first()

    if not saved:
        raise HTTPException(status_code=404, detail="Saved book not found")

    db.delete(saved)
    db.commit()

    return {"message": "Book removed from saved"}

@router.get("/saved-books")
async def get_saved_books(
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    query = db.query(SavedBook).filter(SavedBook.user_id == user_id)
    total = query.count()
    saved_books = query.offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for saved in saved_books:
        book = saved.book
        items.append({
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "authors_workplace": book.authors_workplace,
            "thumbnail": book.thumbnail,
            "publication_date": book.publication_date,
            "language": book.language,
            "type": book.type,
            "views": book.views,
            "saved_at": saved.created_at,
            "categories": [{"id": c.id, "name": c.name} for c in book.categories],
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if total > 0 else 0
    }

@router.get("/saved-books/check/{book_id}")
async def check_if_saved_book(
    book_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        return {"is_saved": False}

    saved = db.query(SavedBook).filter(
        SavedBook.user_id == user_id,
        SavedBook.book_id == book_id
    ).first()

    return {"is_saved": saved is not None}

# Выделения текста книг
@router.post("/book-highlights", status_code=201)
async def create_book_highlight(
    highlight: BookHighlightCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    book = db.query(Book).filter(Book.id == highlight.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    db_highlight = BookHighlight(
        user_id=user_id,
        book_id=highlight.book_id,
        text=highlight.text,
        start_offset=highlight.start_offset,
        end_offset=highlight.end_offset,
        color=highlight.color,
        note=highlight.note
    )

    db.add(db_highlight)
    db.commit()
    db.refresh(db_highlight)

    return {
        "id": db_highlight.id,
        "book_id": db_highlight.book_id,
        "text": db_highlight.text,
        "start_offset": db_highlight.start_offset,
        "end_offset": db_highlight.end_offset,
        "color": db_highlight.color,
        "note": db_highlight.note,
        "created_at": db_highlight.created_at
    }

@router.get("/book-highlights/{book_id}")
async def get_book_highlights(
    book_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        return []

    highlights = db.query(BookHighlight).filter(
        BookHighlight.user_id == user_id,
        BookHighlight.book_id == book_id
    ).all()

    return [
        {
            "id": h.id,
            "book_id": h.book_id,
            "text": h.text,
            "start_offset": h.start_offset,
            "end_offset": h.end_offset,
            "color": h.color,
            "note": h.note,
            "created_at": h.created_at,
            "updated_at": h.updated_at
        }
        for h in highlights
    ]

@router.put("/book-highlights/{highlight_id}")
async def update_book_highlight(
    highlight_id: int,
    highlight: BookHighlightCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    db_highlight = db.query(BookHighlight).filter(
        BookHighlight.id == highlight_id,
        BookHighlight.user_id == user_id
    ).first()

    if not db_highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")

    if highlight.color:
        db_highlight.color = highlight.color
    if highlight.note is not None:
        db_highlight.note = highlight.note

    db.commit()
    db.refresh(db_highlight)

    return {
        "id": db_highlight.id,
        "book_id": db_highlight.book_id,
        "text": db_highlight.text,
        "start_offset": db_highlight.start_offset,
        "end_offset": db_highlight.end_offset,
        "color": db_highlight.color,
        "note": db_highlight.note,
        "updated_at": db_highlight.updated_at
    }

@router.delete("/book-highlights/{highlight_id}")
async def delete_book_highlight(
    highlight_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    db_highlight = db.query(BookHighlight).filter(
        BookHighlight.id == highlight_id,
        BookHighlight.user_id == user_id
    ).first()

    if not db_highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")

    db.delete(db_highlight)
    db.commit()

    return {"message": "Highlight deleted"}

# Закладки диссертаций
@router.post("/saved-dissertations", status_code=201)
async def save_dissertation(
    saved: SavedDissertationCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    diss = db.query(Dissertation).filter(Dissertation.id == saved.dissertation_id).first()
    if not diss:
        raise HTTPException(status_code=404, detail="Dissertation not found")

    existing = db.query(SavedDissertation).filter(
        SavedDissertation.user_id == user_id,
        SavedDissertation.dissertation_id == saved.dissertation_id
    ).first()

    if existing:
        return {"id": existing.id, "dissertation_id": existing.dissertation_id, "created_at": existing.created_at}

    db_saved = SavedDissertation(user_id=user_id, dissertation_id=saved.dissertation_id)
    db.add(db_saved)
    db.commit()
    db.refresh(db_saved)

    return {"id": db_saved.id, "dissertation_id": db_saved.dissertation_id, "created_at": db_saved.created_at}

@router.delete("/saved-dissertations/{dissertation_id}")
async def unsave_dissertation(
    dissertation_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    saved = db.query(SavedDissertation).filter(
        SavedDissertation.user_id == user_id,
        SavedDissertation.dissertation_id == dissertation_id
    ).first()

    if not saved:
        raise HTTPException(status_code=404, detail="Saved dissertation not found")

    db.delete(saved)
    db.commit()

    return {"message": "Dissertation removed from saved"}

@router.get("/saved-dissertations")
async def get_saved_dissertations(
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    query = db.query(SavedDissertation).filter(SavedDissertation.user_id == user_id)
    total = query.count()
    saved_items = query.offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for saved in saved_items:
        diss = saved.dissertation
        items.append({
            "id": diss.id,
            "title": diss.title,
            "author": diss.author,
            "authors_workplace": diss.authors_workplace,
            "thumbnail": diss.thumbnail,
            "publication_date": diss.publication_date,
            "language": diss.language,
            "type": diss.type,
            "views": diss.views,
            "saved_at": saved.created_at,
            "categories": [{"id": c.id, "name": c.name} for c in diss.categories],
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if total > 0 else 0
    }

@router.get("/saved-dissertations/check/{dissertation_id}")
async def check_if_saved_dissertation(
    dissertation_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        return {"is_saved": False}

    saved = db.query(SavedDissertation).filter(
        SavedDissertation.user_id == user_id,
        SavedDissertation.dissertation_id == dissertation_id
    ).first()

    return {"is_saved": saved is not None}

# Выделения текста диссертаций
@router.post("/dissertation-highlights", status_code=201)
async def create_dissertation_highlight(
    highlight: DissertationHighlightCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    diss = db.query(Dissertation).filter(Dissertation.id == highlight.dissertation_id).first()
    if not diss:
        raise HTTPException(status_code=404, detail="Dissertation not found")

    db_highlight = DissertationHighlight(
        user_id=user_id,
        dissertation_id=highlight.dissertation_id,
        text=highlight.text,
        start_offset=highlight.start_offset,
        end_offset=highlight.end_offset,
        color=highlight.color,
        note=highlight.note
    )

    db.add(db_highlight)
    db.commit()
    db.refresh(db_highlight)

    return {
        "id": db_highlight.id,
        "dissertation_id": db_highlight.dissertation_id,
        "text": db_highlight.text,
        "start_offset": db_highlight.start_offset,
        "end_offset": db_highlight.end_offset,
        "color": db_highlight.color,
        "note": db_highlight.note,
        "created_at": db_highlight.created_at
    }

@router.get("/dissertation-highlights/{dissertation_id}")
async def get_dissertation_highlights(
    dissertation_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        return []

    highlights = db.query(DissertationHighlight).filter(
        DissertationHighlight.user_id == user_id,
        DissertationHighlight.dissertation_id == dissertation_id
    ).all()

    return [
        {
            "id": h.id,
            "dissertation_id": h.dissertation_id,
            "text": h.text,
            "start_offset": h.start_offset,
            "end_offset": h.end_offset,
            "color": h.color,
            "note": h.note,
            "created_at": h.created_at,
            "updated_at": h.updated_at
        }
        for h in highlights
    ]

@router.put("/dissertation-highlights/{highlight_id}")
async def update_dissertation_highlight(
    highlight_id: int,
    highlight: DissertationHighlightCreate,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    db_highlight = db.query(DissertationHighlight).filter(
        DissertationHighlight.id == highlight_id,
        DissertationHighlight.user_id == user_id
    ).first()

    if not db_highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")

    if highlight.color:
        db_highlight.color = highlight.color
    if highlight.note is not None:
        db_highlight.note = highlight.note

    db.commit()
    db.refresh(db_highlight)

    return {
        "id": db_highlight.id,
        "dissertation_id": db_highlight.dissertation_id,
        "text": db_highlight.text,
        "start_offset": db_highlight.start_offset,
        "end_offset": db_highlight.end_offset,
        "color": db_highlight.color,
        "note": db_highlight.note,
        "updated_at": db_highlight.updated_at
    }

@router.delete("/dissertation-highlights/{highlight_id}")
async def delete_dissertation_highlight(
    highlight_id: int,
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    db_highlight = db.query(DissertationHighlight).filter(
        DissertationHighlight.id == highlight_id,
        DissertationHighlight.user_id == user_id
    ).first()

    if not db_highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")

    db.delete(db_highlight)
    db.commit()

    return {"message": "Highlight deleted"}

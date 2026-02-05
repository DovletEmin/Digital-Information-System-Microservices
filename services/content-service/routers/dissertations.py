from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Dissertation, DissertationCategory
from schemas import DissertationCreate, DissertationUpdate, DissertationResponse
import math

router = APIRouter()

@router.get("/dissertations", response_model=dict)
async def list_dissertations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    author: Optional[str] = None,
    language: Optional[str] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Список диссертаций с пагинацией и фильтрами"""
    query = db.query(Dissertation)
    
    if author:
        query = query.filter(Dissertation.author.ilike(f"%{author}%"))
    if language:
        query = query.filter(Dissertation.language == language)
    if category_id:
        query = query.join(Dissertation.categories).filter(DissertationCategory.id == category_id)
    if search:
        query = query.filter(
            (Dissertation.title.ilike(f"%{search}%")) | 
            (Dissertation.author.ilike(f"%{search}%"))
        )
    
    total = query.count()
    dissertations = query.offset((page - 1) * per_page).limit(per_page).all()
    
    items = []
    for diss in dissertations:
        items.append({
            "id": diss.id,
            "title": diss.title,
            "author": diss.author,
            "authors_workplace": diss.authors_workplace,
            "thumbnail": diss.thumbnail,
            "content": diss.content,
            "publication_date": diss.publication_date,
            "language": diss.language,
            "type": diss.type,
            "views": diss.views,
            "rating": diss.rating,
            "average_rating": diss.average_rating,
            "rating_count": diss.rating_count,
            "categories": [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in diss.categories],
            "created_at": diss.created_at,
            "updated_at": diss.updated_at
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page)
    }

@router.get("/dissertations/{dissertation_id}")
async def get_dissertation(dissertation_id: int, db: Session = Depends(get_db)):
    dissertation = db.query(Dissertation).filter(Dissertation.id == dissertation_id).first()
    if not dissertation:
        raise HTTPException(status_code=404, detail="Dissertation not found")
    
    dissertation.views += 1
    db.commit()
    
    return {
        "id": dissertation.id,
        "title": dissertation.title,
        "author": dissertation.author,
        "authors_workplace": dissertation.authors_workplace,
        "thumbnail": dissertation.thumbnail,
        "content": dissertation.content,
        "publication_date": dissertation.publication_date,
        "language": dissertation.language,
        "type": dissertation.type,
        "views": dissertation.views,
        "rating": dissertation.rating,
        "average_rating": dissertation.average_rating,
        "rating_count": dissertation.rating_count,
        "categories": [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in dissertation.categories],
        "created_at": dissertation.created_at,
        "updated_at": dissertation.updated_at
    }

@router.post("/dissertations", status_code=201)
async def create_dissertation(dissertation: DissertationCreate, db: Session = Depends(get_db)):
    db_dissertation = Dissertation(**dissertation.model_dump(exclude={"category_ids"}))
    
    if dissertation.category_ids:
        categories = db.query(DissertationCategory).filter(
            DissertationCategory.id.in_(dissertation.category_ids)
        ).all()
        db_dissertation.categories = categories
    
    db.add(db_dissertation)
    db.commit()
    db.refresh(db_dissertation)
    
    return {
        "id": db_dissertation.id,
        "title": db_dissertation.title,
        "author": db_dissertation.author,
        "authors_workplace": db_dissertation.authors_workplace,
        "thumbnail": db_dissertation.thumbnail,
        "content": db_dissertation.content,
        "publication_date": db_dissertation.publication_date,
        "language": db_dissertation.language,
        "type": db_dissertation.type,
        "views": db_dissertation.views,
        "rating": db_dissertation.rating,
        "average_rating": db_dissertation.average_rating,
        "rating_count": db_dissertation.rating_count,
        "categories": [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in db_dissertation.categories],
        "created_at": db_dissertation.created_at,
        "updated_at": db_dissertation.updated_at
    }

@router.put("/dissertations/{dissertation_id}")
async def update_dissertation(
    dissertation_id: int,
    dissertation: DissertationUpdate,
    db: Session = Depends(get_db)
):
    db_dissertation = db.query(Dissertation).filter(Dissertation.id == dissertation_id).first()
    if not db_dissertation:
        raise HTTPException(status_code=404, detail="Dissertation not found")
    
    update_data = dissertation.model_dump(exclude_unset=True, exclude={"category_ids"})
    for key, value in update_data.items():
        setattr(db_dissertation, key, value)
    
    if dissertation.category_ids is not None:
        categories = db.query(DissertationCategory).filter(
            DissertationCategory.id.in_(dissertation.category_ids)
        ).all()
        db_dissertation.categories = categories
    
    db.commit()
    db.refresh(db_dissertation)
    
    return {
        "id": db_dissertation.id,
        "title": db_dissertation.title,
        "author": db_dissertation.author,
        "authors_workplace": db_dissertation.authors_workplace,
        "thumbnail": db_dissertation.thumbnail,
        "content": db_dissertation.content,
        "publication_date": db_dissertation.publication_date,
        "language": db_dissertation.language,
        "type": db_dissertation.type,
        "views": db_dissertation.views,
        "rating": db_dissertation.rating,
        "average_rating": db_dissertation.average_rating,
        "rating_count": db_dissertation.rating_count,
        "categories": [{"id": c.id, "name": c.name, "parent_id": c.parent_id} for c in db_dissertation.categories],
        "created_at": db_dissertation.created_at,
        "updated_at": db_dissertation.updated_at
    }

@router.delete("/dissertations/{dissertation_id}")
async def delete_dissertation(dissertation_id: int, db: Session = Depends(get_db)):
    db_dissertation = db.query(Dissertation).filter(Dissertation.id == dissertation_id).first()
    if not db_dissertation:
        raise HTTPException(status_code=404, detail="Dissertation not found")
    
    db.delete(db_dissertation)
    db.commit()
    
    return {"message": "Dissertation deleted successfully"}

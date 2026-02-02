from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Dissertation, DissertationCategory
from schemas import DissertationCreate, DissertationUpdate, DissertationResponse

router = APIRouter()

@router.get("/", response_model=List[DissertationResponse])
async def list_dissertations(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    dissertations = db.query(Dissertation).offset(skip).limit(limit).all()
    return dissertations

@router.get("/{dissertation_id}", response_model=DissertationResponse)
async def get_dissertation(dissertation_id: int, db: Session = Depends(get_db)):
    dissertation = db.query(Dissertation).filter(Dissertation.id == dissertation_id).first()
    if not dissertation:
        raise HTTPException(status_code=404, detail="Dissertation not found")
    
    dissertation.views += 1
    db.commit()
    
    return dissertation

@router.post("/", response_model=DissertationResponse, status_code=201)
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
    
    return db_dissertation

@router.put("/{dissertation_id}", response_model=DissertationResponse)
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
    
    return db_dissertation

@router.delete("/{dissertation_id}")
async def delete_dissertation(dissertation_id: int, db: Session = Depends(get_db)):
    db_dissertation = db.query(Dissertation).filter(Dissertation.id == dissertation_id).first()
    if not db_dissertation:
        raise HTTPException(status_code=404, detail="Dissertation not found")
    
    db.delete(db_dissertation)
    db.commit()
    
    return {"message": "Dissertation deleted successfully"}

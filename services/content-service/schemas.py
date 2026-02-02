from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Article Schemas
class ArticleCategoryBase(BaseModel):
    name: str

class ArticleCategoryCreate(ArticleCategoryBase):
    pass

class ArticleCategoryResponse(ArticleCategoryBase):
    id: int
    
    class Config:
        from_attributes = True

class ArticleBase(BaseModel):
    title: str = Field(..., max_length=500)
    author: str = Field(..., max_length=255)
    authors_workplace: Optional[str] = None
    thumbnail: Optional[str] = None
    content: str
    publication_date: Optional[datetime] = None
    language: str = "tm"  # tm, ru, en
    type: str = "local"  # local, foreign

class ArticleCreate(ArticleBase):
    category_ids: Optional[List[int]] = []

class ArticleUpdate(ArticleBase):
    title: Optional[str] = None
    author: Optional[str] = None
    content: Optional[str] = None
    category_ids: Optional[List[int]] = None

class ArticleResponse(ArticleBase):
    id: int
    views: int
    rating: float
    average_rating: float
    rating_count: int
    categories: List[ArticleCategoryResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Book Schemas
class BookCategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class BookCategoryCreate(BookCategoryBase):
    pass

class BookCategoryResponse(BookCategoryBase):
    id: int
    
    class Config:
        from_attributes = True

class BookBase(BaseModel):
    title: str = Field(..., max_length=500)
    author: str = Field(..., max_length=255)
    authors_workplace: Optional[str] = None
    thumbnail: Optional[str] = None
    content: str
    publication_date: Optional[datetime] = None
    language: str = "tm"  # tm, ru, en
    type: str = "local"  # local, foreign

class BookCreate(BookBase):
    category_ids: Optional[List[int]] = []

class BookUpdate(BookBase):
    title: Optional[str] = None
    author: Optional[str] = None
    content: Optional[str] = None
    category_ids: Optional[List[int]] = None

class BookResponse(BookBase):
    id: int
    views: int
    rating: float
    average_rating: float
    rating_count: int
    categories: List[BookCategoryResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Dissertation Schemas
class DissertationCategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class DissertationCategoryCreate(DissertationCategoryBase):
    pass

class DissertationCategoryResponse(DissertationCategoryBase):
    id: int
    
    class Config:
        from_attributes = True

class DissertationBase(BaseModel):
    title: str = Field(..., max_length=500)
    author: str = Field(..., max_length=255)
    authors_workplace: Optional[str] = None
    thumbnail: Optional[str] = None
    content: str
    publication_date: Optional[datetime] = None
    language: str = "tm"  # tm, ru, en
    type: str = "local"  # local, foreign

class DissertationCreate(DissertationBase):
    category_ids: Optional[List[int]] = []

class DissertationUpdate(DissertationBase):
    title: Optional[str] = None
    author: Optional[str] = None
    content: Optional[str] = None
    category_ids: Optional[List[int]] = None

class DissertationResponse(DissertationBase):
    id: int
    views: int
    rating: float
    average_rating: float
    rating_count: int
    categories: List[DissertationCategoryResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Pagination
class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    per_page: int
    pages: int

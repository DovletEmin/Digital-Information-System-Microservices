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
    author_workplace: Optional[str] = None
    content: str
    abstract: Optional[str] = None
    keywords: Optional[str] = None
    publication_date: Optional[datetime] = None
    language: str = "tm"
    type: str = "local"
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    newspaper_or_journal: Optional[str] = None
    image: Optional[str] = None

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
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    publication_date: Optional[datetime] = None
    pages: Optional[int] = None
    description: Optional[str] = None
    language: str = "tm"
    cover_image: Optional[str] = None
    file_url: Optional[str] = None

class BookCreate(BookBase):
    category_ids: Optional[List[int]] = []

class BookUpdate(BookBase):
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
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
    content: str
    abstract: str
    supervisor: Optional[str] = None
    university: Optional[str] = None
    department: Optional[str] = None
    degree_type: Optional[str] = None
    language: str = "tm"
    publication_date: Optional[datetime] = None
    file_url: Optional[str] = None

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

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import json

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
    
    @field_validator('content', 'title', 'author', mode='before')
    @classmethod
    def clean_text(cls, v):
        if isinstance(v, str):
            # Удаляем проблемные управляющие символы, кроме переносов строк
            v = v.replace('\x00', '')  # null byte
            v = v.replace('\r\n', '\n')  # normalize line endings
        return v

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
    description: Optional[str] = None  # описание книги
    content: Optional[str] = None  # текстовый контент (необязательно, для совместимости)
    pdf_file_url: Optional[str] = None  # URL PDF файла
    epub_file_url: Optional[str] = None  # URL EPUB файла
    publication_date: Optional[datetime] = None
    language: str = "tm"  # tm, ru, en
    type: str = "local"  # local, foreign
    
    @field_validator('content', 'title', 'author', 'description', mode='before')
    @classmethod
    def clean_text(cls, v):
        if isinstance(v, str):
            v = v.replace('\x00', '')
            v = v.replace('\r\n', '\n')
        return v

class BookCreate(BookBase):
    category_ids: Optional[List[int]] = []

class BookUpdate(BookBase):
    title: Optional[str] = None
    author: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None
    pdf_file_url: Optional[str] = None
    epub_file_url: Optional[str] = None
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
    
    @field_validator('content', 'title', 'author', mode='before')
    @classmethod
    def clean_text(cls, v):
        if isinstance(v, str):
            v = v.replace('\x00', '')
            v = v.replace('\r\n', '\n')
        return v

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

# Saved Articles Schemas
class SavedArticleCreate(BaseModel):
    article_id: int

class SavedArticleResponse(BaseModel):
    id: int
    article_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Saved Books Schemas
class SavedBookCreate(BaseModel):
    book_id: int

class SavedBookResponse(BaseModel):
    id: int
    book_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Saved Dissertations Schemas
class SavedDissertationCreate(BaseModel):
    dissertation_id: int

class SavedDissertationResponse(BaseModel):
    id: int
    dissertation_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Highlight Schemas
class HighlightCreate(BaseModel):
    article_id: int
    text: str
    start_offset: int
    end_offset: int
    color: str = "yellow"  # yellow, green, blue, red
    note: Optional[str] = None

class HighlightResponse(BaseModel):
    id: int
    article_id: int
    text: str
    start_offset: int
    end_offset: int
    color: str
    note: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Book Highlight Schemas
class BookHighlightCreate(BaseModel):
    book_id: int
    text: str
    start_offset: int
    end_offset: int
    color: str = "yellow"
    note: Optional[str] = None

class BookHighlightResponse(BaseModel):
    id: int
    book_id: int
    text: str
    start_offset: int
    end_offset: int
    color: str
    note: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Dissertation Highlight Schemas
class DissertationHighlightCreate(BaseModel):
    dissertation_id: int
    text: str
    start_offset: int
    end_offset: int
    color: str = "yellow"
    note: Optional[str] = None

class DissertationHighlightResponse(BaseModel):
    id: int
    dissertation_id: int
    text: str
    start_offset: int
    end_offset: int
    color: str
    note: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Book Reading Progress Schemas
class BookReadingProgressCreate(BaseModel):
    book_id: int
    current_page: int = 1
    total_pages: Optional[int] = None
    progress_percentage: float = 0.0
    last_position: Optional[str] = None  # JSON string with position data

class BookReadingProgressUpdate(BaseModel):
    current_page: Optional[int] = None
    total_pages: Optional[int] = None
    progress_percentage: Optional[float] = None
    last_position: Optional[str] = None

class BookReadingProgressResponse(BaseModel):
    id: int
    user_id: str
    book_id: int
    current_page: int
    total_pages: Optional[int]
    progress_percentage: float
    last_position: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

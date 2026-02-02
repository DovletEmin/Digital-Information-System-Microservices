from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# Many-to-Many таблицы
article_categories = Table(
    'article_categories',
    Base.metadata,
    Column('article_id', Integer, ForeignKey('articles.id')),
    Column('category_id', Integer, ForeignKey('article_categories_table.id'))
)

book_categories = Table(
    'book_categories',
    Base.metadata,
    Column('book_id', Integer, ForeignKey('books.id')),
    Column('category_id', Integer, ForeignKey('book_categories_table.id'))
)

dissertation_categories = Table(
    'dissertation_categories',
    Base.metadata,
    Column('dissertation_id', Integer, ForeignKey('dissertations.id')),
    Column('category_id', Integer, ForeignKey('dissertation_categories_table.id'))
)

# Категории
class ArticleCategory(Base):
    __tablename__ = "article_categories_table"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    articles = relationship("Article", secondary=article_categories, back_populates="categories")

class BookCategory(Base):
    __tablename__ = "book_categories_table"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey('book_categories_table.id'), nullable=True)
    parent = relationship("BookCategory", remote_side=[id], backref="subcategories")
    books = relationship("Book", secondary=book_categories, back_populates="categories")

class DissertationCategory(Base):
    __tablename__ = "dissertation_categories_table"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey('dissertation_categories_table.id'), nullable=True)
    parent = relationship("DissertationCategory", remote_side=[id], backref="subcategories")
    dissertations = relationship("Dissertation", secondary=dissertation_categories, back_populates="categories")

# Контент
class Article(Base):
    __tablename__ = "articles"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    author = Column(String(255), nullable=False, index=True)
    authors_workplace = Column(String(255))
    thumbnail = Column(String(500))  # image URL
    content = Column(Text, nullable=False)  # text content
    publication_date = Column(DateTime, index=True)
    language = Column(String(10), default="tm", index=True)  # tm, ru, en
    type = Column(String(10), default="local", index=True)  # local, foreign
    
    # Статистика
    views = Column(Integer, default=0, index=True)
    rating = Column(Float, default=0.0)
    average_rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    
    categories = relationship("ArticleCategory", secondary=article_categories, back_populates="articles")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Book(Base):
    __tablename__ = "books"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    author = Column(String(255), nullable=False, index=True)
    authors_workplace = Column(String(255))
    thumbnail = Column(String(500))  # image URL
    content = Column(Text, nullable=False)  # text, e-pub, pdf
    publication_date = Column(DateTime, index=True)
    language = Column(String(10), default="tm", index=True)  # tm, ru, en
    type = Column(String(10), default="local", index=True)  # local, foreign
    
    # Статистика
    views = Column(Integer, default=0, index=True)
    rating = Column(Float, default=0.0)
    average_rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    
    categories = relationship("BookCategory", secondary=book_categories, back_populates="books")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Dissertation(Base):
    __tablename__ = "dissertations"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    author = Column(String(255), nullable=False, index=True)
    authors_workplace = Column(String(255))
    thumbnail = Column(String(500))  # image URL
    content = Column(Text, nullable=False)  # text, e-pub, pdf
    publication_date = Column(DateTime, index=True)
    language = Column(String(10), default="tm", index=True)  # tm, ru, en
    type = Column(String(10), default="local", index=True)  # local, foreign
    
    # Статистика
    views = Column(Integer, default=0, index=True)
    rating = Column(Float, default=0.0)
    average_rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    
    categories = relationship("DissertationCategory", secondary=dissertation_categories, back_populates="dissertations")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

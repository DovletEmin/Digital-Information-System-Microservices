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
    articles = relationship("Article", secondary=article_categories, back_populates="categories", lazy='noload')

class BookCategory(Base):
    __tablename__ = "book_categories_table"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey('book_categories_table.id'), nullable=True)
    parent = relationship("BookCategory", remote_side=[id], backref="subcategories")
    books = relationship("Book", secondary=book_categories, back_populates="categories", lazy='noload')

class DissertationCategory(Base):
    __tablename__ = "dissertation_categories_table"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey('dissertation_categories_table.id'), nullable=True)
    parent = relationship("DissertationCategory", remote_side=[id], backref="subcategories")
    dissertations = relationship("Dissertation", secondary=dissertation_categories, back_populates="categories", lazy='noload')

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
    description = Column(Text)  # описание книги (необязательное)
    content = Column(Text)  # текстовый контент (необязательное, для совместимости)
    pdf_file_url = Column(String(500))  # URL PDF файла
    epub_file_url = Column(String(500))  # URL EPUB файла
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

# Сохраненные статьи (закладки)
class SavedArticle(Base):
    __tablename__ = "saved_articles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)  # ID пользователя из auth-service
    article_id = Column(Integer, ForeignKey('articles.id'), nullable=False)
    article = relationship("Article")
    created_at = Column(DateTime, default=datetime.utcnow)

# Выделенный текст
class ArticleHighlight(Base):
    __tablename__ = "article_highlights"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)  # ID пользователя
    article_id = Column(Integer, ForeignKey('articles.id'), nullable=False)
    article = relationship("Article")
    text = Column(Text, nullable=False)  # Выделенный текст
    start_offset = Column(Integer, nullable=False)  # Начальная позиция в контенте
    end_offset = Column(Integer, nullable=False)  # Конечная позиция
    color = Column(String(20), default="yellow")  # yellow, green, blue, red
    note = Column(Text)  # Заметка к выделению
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Сохраненные книги (закладки)
class SavedBook(Base):
    __tablename__ = "saved_books"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey('books.id'), nullable=False)
    book = relationship("Book")
    created_at = Column(DateTime, default=datetime.utcnow)

# Выделенный текст книги
class BookHighlight(Base):
    __tablename__ = "book_highlights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey('books.id'), nullable=False)
    book = relationship("Book")
    text = Column(Text, nullable=False)
    start_offset = Column(Integer, nullable=False)
    end_offset = Column(Integer, nullable=False)
    color = Column(String(20), default="yellow")
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Сохраненные диссертации (закладки)
class SavedDissertation(Base):
    __tablename__ = "saved_dissertations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    dissertation_id = Column(Integer, ForeignKey('dissertations.id'), nullable=False)
    dissertation = relationship("Dissertation")
    created_at = Column(DateTime, default=datetime.utcnow)

# Выделенный текст диссертаций
class DissertationHighlight(Base):
    __tablename__ = "dissertation_highlights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    dissertation_id = Column(Integer, ForeignKey('dissertations.id'), nullable=False)
    dissertation = relationship("Dissertation")
    text = Column(Text, nullable=False)
    start_offset = Column(Integer, nullable=False)
    end_offset = Column(Integer, nullable=False)
    color = Column(String(20), default="yellow")
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Прогресс чтения книги (закладки страниц)
class BookReadingProgress(Base):
    __tablename__ = "book_reading_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey('books.id'), nullable=False)
    book = relationship("Book")
    current_page = Column(Integer, default=1, nullable=False)  # текущая страница
    total_pages = Column(Integer)  # общее количество страниц (если известно)
    progress_percentage = Column(Float, default=0.0)  # процент прочитанного
    last_position = Column(Text)  # JSON с позицией в документе (для EPUB/PDF)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

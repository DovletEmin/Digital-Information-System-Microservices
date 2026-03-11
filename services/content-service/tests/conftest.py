import os
# Must be set before any app module is imported, because database.py reads
# DATABASE_URL at module level and main.py calls create_all at module level.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
from models import ArticleCategory, Article

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    return TestClient(app, headers={"X-User-ID": "test-user-123"})


@pytest.fixture
def test_category(db):
    category = ArticleCategory(name="Test Category")
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@pytest.fixture
def test_article(db, test_category):
    article = Article(
        title="Test Article",
        author="Test Author",
        authors_workplace="Test University",
        thumbnail="http://example.com/thumb.jpg",
        content="Test content",
        publication_date=datetime(2024, 1, 1),
        language="tm",
        type="local",
        views=0,
        rating=0.0,
        average_rating=0.0,
        rating_count=0,
    )
    article.categories = [test_category]
    db.add(article)
    db.commit()
    db.refresh(article)
    return article

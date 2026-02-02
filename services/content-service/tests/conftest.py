import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
from models import Category, Article

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
def client():
    return TestClient(app)


@pytest.fixture
def test_category(db):
    category = Category(name_tm="Test TM", name_ru="Test RU", name_en="Test EN")
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
        publication_date="2024-01-01",
        language="tm",
        type="local",
        views=0,
        rating=0.0,
        average_rating=0.0,
        rating_count=0,
        category_id=test_category.id
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article

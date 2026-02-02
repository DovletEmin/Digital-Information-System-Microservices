import pytest
from fastapi import status


def test_create_article(client, test_category):
    response = client.post(
        "/api/v1/articles",
        json={
            "title": "New Article",
            "author": "John Doe",
            "authors_workplace": "MIT",
            "thumbnail": "http://example.com/image.jpg",
            "content": "Article content",
            "publication_date": "2024-01-15",
            "language": "en",
            "type": "foreign",
            "category_id": test_category.id
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "New Article"
    assert data["author"] == "John Doe"
    assert data["views"] == 0
    assert data["rating"] == 0.0


def test_get_articles(client, test_article):
    response = client.get("/api/v1/articles")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(article["id"] == test_article.id for article in data)


def test_get_article_by_id(client, test_article):
    response = client.get(f"/api/v1/articles/{test_article.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_article.id
    assert data["title"] == test_article.title
    assert data["author"] == test_article.author


def test_update_article(client, test_article):
    response = client.put(
        f"/api/v1/articles/{test_article.id}",
        json={
            "title": "Updated Article",
            "author": "Updated Author",
            "authors_workplace": "Updated University",
            "thumbnail": "http://example.com/new.jpg",
            "content": "Updated content",
            "publication_date": "2024-02-01",
            "language": "ru",
            "type": "local",
            "category_id": test_article.category_id
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Updated Article"
    assert data["author"] == "Updated Author"


def test_delete_article(client, test_article):
    response = client.delete(f"/api/v1/articles/{test_article.id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify deletion
    response = client.get(f"/api/v1/articles/{test_article.id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_filter_articles_by_language(client, test_article):
    response = client.get(f"/api/v1/articles?language={test_article.language}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(article["language"] == test_article.language for article in data)


def test_filter_articles_by_type(client, test_article):
    response = client.get(f"/api/v1/articles?type={test_article.type}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(article["type"] == test_article.type for article in data)


def test_filter_articles_by_category(client, test_article):
    response = client.get(f"/api/v1/articles?category_id={test_article.category_id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(article["category_id"] == test_article.category_id for article in data)


def test_increment_views(client, test_article):
    initial_views = test_article.views
    
    # Get article should increment views
    response = client.get(f"/api/v1/articles/{test_article.id}")
    assert response.status_code == status.HTTP_200_OK
    
    # Get again and check views increased
    response = client.get(f"/api/v1/articles/{test_article.id}")
    data = response.json()
    assert data["views"] > initial_views


def test_create_article_without_category(client):
    response = client.post(
        "/api/v1/articles",
        json={
            "title": "New Article",
            "author": "John Doe",
            "authors_workplace": "MIT",
            "thumbnail": "http://example.com/image.jpg",
            "content": "Article content",
            "publication_date": "2024-01-15",
            "language": "en",
            "type": "foreign",
            "category_id": 99999  # Non-existent category
        }
    )
    assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]

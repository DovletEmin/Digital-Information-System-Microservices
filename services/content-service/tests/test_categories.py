import pytest
from fastapi import status


def test_create_category(client):
    response = client.post(
        "/api/v1/article-categories",
        json={"name": "Science"}
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Science"
    assert "id" in data


def test_get_categories(client, test_category):
    response = client.get("/api/v1/article-categories")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(cat["id"] == test_category.id for cat in data)


def test_update_category(client, test_category):
    response = client.put(
        f"/api/v1/article-categories/{test_category.id}",
        json={"name": "Updated Category"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Updated Category"


def test_delete_category(client, test_category):
    response = client.delete(f"/api/v1/article-categories/{test_category.id}")
    assert response.status_code == status.HTTP_200_OK

    # Verify deletion
    response = client.get("/api/v1/article-categories")
    data = response.json()
    assert not any(cat["id"] == test_category.id for cat in data)


def test_delete_nonexistent_category(client):
    response = client.delete("/api/v1/article-categories/99999")
    assert response.status_code == status.HTTP_404_NOT_FOUND

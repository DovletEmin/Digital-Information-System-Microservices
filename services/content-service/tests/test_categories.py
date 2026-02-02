import pytest
from fastapi import status


def test_create_category(client):
    response = client.post(
        "/api/v1/categories",
        json={
            "name_tm": "Bilim",
            "name_ru": "Наука",
            "name_en": "Science"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name_tm"] == "Bilim"
    assert data["name_ru"] == "Наука"
    assert data["name_en"] == "Science"
    assert "id" in data


def test_get_categories(client, test_category):
    response = client.get("/api/v1/categories")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(cat["id"] == test_category.id for cat in data)


def test_get_category_by_id(client, test_category):
    response = client.get(f"/api/v1/categories/{test_category.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_category.id
    assert data["name_tm"] == test_category.name_tm


def test_update_category(client, test_category):
    response = client.put(
        f"/api/v1/categories/{test_category.id}",
        json={
            "name_tm": "Updated TM",
            "name_ru": "Updated RU",
            "name_en": "Updated EN"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name_tm"] == "Updated TM"


def test_delete_category(client, test_category):
    response = client.delete(f"/api/v1/categories/{test_category.id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify deletion
    response = client.get(f"/api/v1/categories/{test_category.id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_nonexistent_category(client):
    response = client.get("/api/v1/categories/99999")
    assert response.status_code == status.HTTP_404_NOT_FOUND

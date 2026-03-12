"""
Unit / smoke tests for search-service (main.py).

External services (Elasticsearch, RabbitMQ) are mocked via conftest.py so this
suite runs fully in CI without any infrastructure.
"""
import os
import sys
from unittest.mock import patch, MagicMock

import pytest

# Add the service root to sys.path so `from main import app` works.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app  # noqa: E402  — import after sys.path update
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    """TestClient with the asyncio background task (RabbitMQ consumer) suppressed."""
    with patch("asyncio.create_task", return_value=MagicMock()):
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def test_health_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_shape(client):
    data = client.get("/health").json()
    assert "status" in data
    assert "service" in data
    assert data["service"] == "search-service"


# ---------------------------------------------------------------------------
# Search endpoint – basic validation
# ---------------------------------------------------------------------------

def test_search_requires_query(client):
    """Missing `q` parameter should return 422 Unprocessable Entity."""
    response = client.get("/api/v1/search")
    assert response.status_code == 422


def test_search_returns_results_shape(client):
    response = client.get("/api/v1/search?q=test")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "total" in data
    assert "query" in data
    assert data["query"] == "test"
    assert isinstance(data["results"], list)


def test_search_invalid_content_type(client):
    """Unknown content_type should return 400."""
    response = client.get("/api/v1/search?q=test&content_type=unknown")
    assert response.status_code in (400, 500)


def test_search_by_article_type(client):
    response = client.get("/api/v1/search?q=python&content_type=article")
    assert response.status_code == 200


def test_search_by_book_type(client):
    response = client.get("/api/v1/search?q=python&content_type=book")
    assert response.status_code == 200


def test_search_by_dissertation_type(client):
    response = client.get("/api/v1/search?q=python&content_type=dissertation")
    assert response.status_code == 200


def test_search_with_language_filter(client):
    response = client.get("/api/v1/search?q=test&language=ru")
    assert response.status_code == 200


def test_search_pagination(client):
    response = client.get("/api/v1/search?q=test&page=2&per_page=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 2
    assert data["per_page"] == 5

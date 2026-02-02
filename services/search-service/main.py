from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from elasticsearch import Elasticsearch, NotFoundError
from typing import List, Optional
import os
import uvicorn

app = FastAPI(
    title="Search Service API",
    description="Полнотекстовый поиск по контенту библиотеки",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Elasticsearch connection
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
es = Elasticsearch([ELASTICSEARCH_URL])

# Index names
ARTICLES_INDEX = "articles"
BOOKS_INDEX = "books"
DISSERTATIONS_INDEX = "dissertations"


@app.on_event("startup")
async def startup_event():
    """Инициализация индексов при старте"""
    try:
        # Создание индексов если не существуют
        for index in [ARTICLES_INDEX, BOOKS_INDEX, DISSERTATIONS_INDEX]:
            if not es.indices.exists(index=index):
                es.indices.create(
                    index=index,
                    body={
                        "settings": {
                            "number_of_shards": 1,
                            "number_of_replicas": 0,
                            "analysis": {
                                "analyzer": {
                                    "default": {
                                        "type": "standard"
                                    }
                                }
                            }
                        },
                        "mappings": {
                            "properties": {
                                "id": {"type": "integer"},
                                "title": {"type": "text", "analyzer": "standard"},
                                "author": {"type": "text", "analyzer": "standard"},
                                "content": {"type": "text", "analyzer": "standard"},
                                "abstract": {"type": "text", "analyzer": "standard"},
                                "keywords": {"type": "text", "analyzer": "standard"},
                                "language": {"type": "keyword"},
                                "created_at": {"type": "date"}
                            }
                        }
                    }
                )
                print(f"Created index: {index}")
        print("Elasticsearch indexes ready")
    except Exception as e:
        print(f"Error initializing Elasticsearch: {e}")


@app.get("/health")
async def health_check():
    """Health check"""
    try:
        es.ping()
        return {"status": "ok", "service": "search-service", "elasticsearch": "connected"}
    except:
        return {"status": "degraded", "service": "search-service", "elasticsearch": "disconnected"}


@app.get("/api/v1/search")
async def search(
    q: str = Query(..., description="Поисковый запрос"),
    content_type: Optional[str] = Query(None, description="Тип контента: article, book, dissertation"),
    language: Optional[str] = Query(None, description="Язык: tm, ru, en"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """
    Полнотекстовый поиск по всем типам контента
    """
    try:
        # Определяем индексы для поиска
        if content_type:
            if content_type == "article":
                indices = [ARTICLES_INDEX]
            elif content_type == "book":
                indices = [BOOKS_INDEX]
            elif content_type == "dissertation":
                indices = [DISSERTATIONS_INDEX]
            else:
                raise HTTPException(status_code=400, detail="Invalid content_type")
        else:
            indices = [ARTICLES_INDEX, BOOKS_INDEX, DISSERTATIONS_INDEX]

        # Построение запроса
        query = {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": q,
                            "fields": ["title^3", "author^2", "content", "abstract^2", "keywords^2"],
                            "type": "best_fields",
                            "fuzziness": "AUTO"
                        }
                    }
                ]
            }
        }

        # Добавляем фильтр по языку
        if language:
            query["bool"]["filter"] = [{"term": {"language": language}}]

        # Выполнение поиска
        response = es.search(
            index=",".join(indices),
            body={
                "query": query,
                "highlight": {
                    "fields": {
                        "title": {},
                        "content": {"fragment_size": 150, "number_of_fragments": 3},
                        "abstract": {}
                    }
                },
                "from": (page - 1) * per_page,
                "size": per_page
            }
        )

        # Форматирование результатов
        results = []
        for hit in response["hits"]["hits"]:
            result = {
                "id": hit["_source"]["id"],
                "type": hit["_index"],
                "score": hit["_score"],
                "title": hit["_source"]["title"],
                "author": hit["_source"]["author"],
                "language": hit["_source"].get("language", "tm"),
                "highlights": hit.get("highlight", {})
            }
            results.append(result)

        return {
            "query": q,
            "total": response["hits"]["total"]["value"],
            "page": page,
            "per_page": per_page,
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@app.post("/api/v1/index/{content_type}/{content_id}")
async def index_content(
    content_type: str,
    content_id: int,
    content: dict
):
    """
    Индексация контента
    content_type: article, book, dissertation
    """
    try:
        # Определяем индекс
        if content_type == "article":
            index = ARTICLES_INDEX
        elif content_type == "book":
            index = BOOKS_INDEX
        elif content_type == "dissertation":
            index = DISSERTATIONS_INDEX
        else:
            raise HTTPException(status_code=400, detail="Invalid content_type")

        # Индексируем документ
        es.index(
            index=index,
            id=content_id,
            body=content
        )

        return {"message": "Content indexed successfully", "id": content_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing error: {str(e)}")


@app.put("/api/v1/index/{content_type}/{content_id}")
async def update_index(
    content_type: str,
    content_id: int,
    content: dict
):
    """Обновление индекса"""
    try:
        if content_type == "article":
            index = ARTICLES_INDEX
        elif content_type == "book":
            index = BOOKS_INDEX
        elif content_type == "dissertation":
            index = DISSERTATIONS_INDEX
        else:
            raise HTTPException(status_code=400, detail="Invalid content_type")

        es.update(
            index=index,
            id=content_id,
            body={"doc": content}
        )

        return {"message": "Content updated successfully", "id": content_id}

    except NotFoundError:
        # Если документ не найден, создаем новый
        return await index_content(content_type, content_id, content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update error: {str(e)}")


@app.delete("/api/v1/index/{content_type}/{content_id}")
async def delete_from_index(
    content_type: str,
    content_id: int
):
    """Удаление из индекса"""
    try:
        if content_type == "article":
            index = ARTICLES_INDEX
        elif content_type == "book":
            index = BOOKS_INDEX
        elif content_type == "dissertation":
            index = DISSERTATIONS_INDEX
        else:
            raise HTTPException(status_code=400, detail="Invalid content_type")

        es.delete(index=index, id=content_id)

        return {"message": "Content deleted from index", "id": content_id}

    except NotFoundError:
        raise HTTPException(status_code=404, detail="Content not found in index")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")


@app.get("/api/v1/suggest")
async def autocomplete(
    q: str = Query(..., description="Частичный запрос"),
    content_type: Optional[str] = Query(None)
):
    """Автодополнение для поиска"""
    try:
        indices = [ARTICLES_INDEX, BOOKS_INDEX, DISSERTATIONS_INDEX]
        if content_type:
            if content_type == "article":
                indices = [ARTICLES_INDEX]
            elif content_type == "book":
                indices = [BOOKS_INDEX]
            elif content_type == "dissertation":
                indices = [DISSERTATIONS_INDEX]

        response = es.search(
            index=",".join(indices),
            body={
                "query": {
                    "multi_match": {
                        "query": q,
                        "fields": ["title^3", "author^2"],
                        "type": "phrase_prefix"
                    }
                },
                "size": 10,
                "_source": ["title", "author"]
            }
        )

        suggestions = []
        for hit in response["hits"]["hits"]:
            suggestions.append({
                "title": hit["_source"]["title"],
                "author": hit["_source"]["author"],
                "type": hit["_index"]
            })

        return {"suggestions": suggestions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestion error: {str(e)}")


@app.post("/api/v1/reindex")
async def reindex_all():
    """Переиндексация всего контента (admin)"""
    try:
        # Удаляем старые индексы
        for index in [ARTICLES_INDEX, BOOKS_INDEX, DISSERTATIONS_INDEX]:
            if es.indices.exists(index=index):
                es.indices.delete(index=index)
        
        # Запускаем startup для создания новых
        await startup_event()
        
        return {"message": "Reindexing started. Please trigger content indexing from Content Service."}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reindex error: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)

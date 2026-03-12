from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from elasticsearch import Elasticsearch, NotFoundError
from typing import List, Optional
import os
import uvicorn
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Search Service API",
    description="Полнотекстовый поиск по контенту библиотеки",
    version="1.0.0"
)

# Allowed hosts
allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "*")
allowed_hosts = [host.strip() for host in allowed_hosts_env.split(",") if host.strip()]
if allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# CORS
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
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

    # Start RabbitMQ consumer in background
    asyncio.create_task(_rabbitmq_consumer())


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
    q: str = Query(..., min_length=1, description="Частичный запрос"),
    content_type: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    limit: int = Query(8, ge=1, le=20),
):
    """Autocomplete suggestions — returns unique titles and authors matching the prefix."""
    try:
        indices = [ARTICLES_INDEX, BOOKS_INDEX, DISSERTATIONS_INDEX]
        if content_type == "article":
            indices = [ARTICLES_INDEX]
        elif content_type == "book":
            indices = [BOOKS_INDEX]
        elif content_type == "dissertation":
            indices = [DISSERTATIONS_INDEX]

        body: dict = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": q,
                                "fields": ["title^3", "author^2"],
                                "type": "phrase_prefix",
                            }
                        }
                    ]
                }
            },
            "size": limit,
            "_source": ["id", "title", "author", "language", "thumbnail"],
        }
        if language:
            body["query"]["bool"]["filter"] = [{"term": {"language": language}}]

        response = es.search(index=",".join(indices), body=body)

        seen_titles: set = set()
        suggestions = []
        for hit in response["hits"]["hits"]:
            src = hit["_source"]
            title = src.get("title", "")
            if title not in seen_titles:
                seen_titles.add(title)
                suggestions.append(
                    {
                        "id": src.get("id"),
                        "title": title,
                        "author": src.get("author", ""),
                        "language": src.get("language", "tm"),
                        "thumbnail": src.get("thumbnail"),
                        "content_type": hit["_index"],
                    }
                )

        return {"query": q, "suggestions": suggestions}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Suggestion error: {str(exc)}")


@app.get("/api/v1/search/facets")
async def faceted_search(
    q: Optional[str] = Query(None, description="Опциональный поисковый запрос"),
    content_type: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
):
    """
    Return aggregated facets: languages, content types, publication years.
    Useful for building filter sidebars on the frontend.
    """
    try:
        indices = [ARTICLES_INDEX, BOOKS_INDEX, DISSERTATIONS_INDEX]
        if content_type == "article":
            indices = [ARTICLES_INDEX]
        elif content_type == "book":
            indices = [BOOKS_INDEX]
        elif content_type == "dissertation":
            indices = [DISSERTATIONS_INDEX]

        filters = []
        if language:
            filters.append({"term": {"language": language}})

        base_query: dict
        if q:
            base_query = {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": q,
                                "fields": ["title^3", "author^2", "content"],
                                "type": "best_fields",
                                "fuzziness": "AUTO",
                            }
                        }
                    ]
                }
            }
        else:
            base_query = {"match_all": {}}

        if filters:
            base_query.setdefault("bool", {}).setdefault("filter", []).extend(filters)

        body = {
            "query": base_query,
            "size": 0,
            "aggs": {
                "by_language": {
                    "terms": {"field": "language", "size": 10}
                },
                "by_content_type": {
                    "terms": {"field": "_index", "size": 5}
                },
                "by_year": {
                    "date_histogram": {
                        "field": "created_at",
                        "calendar_interval": "year",
                        "format": "yyyy",
                        "min_doc_count": 1,
                    }
                },
            },
        }

        response = es.search(index=",".join(indices), body=body)
        aggs = response.get("aggregations", {})

        def _buckets(key: str):
            return [
                {"value": b["key"], "count": b["doc_count"]}
                for b in aggs.get(key, {}).get("buckets", [])
            ]

        year_buckets = [
            {"value": b["key_as_string"], "count": b["doc_count"]}
            for b in aggs.get("by_year", {}).get("buckets", [])
        ]

        return {
            "total": response["hits"]["total"]["value"],
            "facets": {
                "languages": _buckets("by_language"),
                "content_types": _buckets("by_content_type"),
                "years": year_buckets,
            },
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Facets error: {str(exc)}")


# ------------------------------------------------------------------ #
# RabbitMQ consumer — runs as a background task on startup            #
# ------------------------------------------------------------------ #

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
_CONTENT_TYPE_MAP = {
    "article": ARTICLES_INDEX,
    "book": BOOKS_INDEX,
    "dissertation": DISSERTATIONS_INDEX,
}


async def _rabbitmq_consumer():
    """
    Consume content.* events from RabbitMQ and keep the Elasticsearch
    index in sync.  Events expected on exchange 'content' (topic):
      content.article.created / updated / deleted
      content.book.created   / updated / deleted
      content.dissertation.created / updated / deleted
    """
    try:
        import aio_pika  # type: ignore
    except ImportError:
        logger.warning("aio_pika not installed — RabbitMQ sync disabled.")
        return

    retry_delay = 5
    while True:
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            channel = await connection.channel()
            exchange = await channel.declare_exchange(
                "content", aio_pika.ExchangeType.TOPIC, durable=True
            )
            queue = await channel.declare_queue("search_index_sync", durable=True)
            await queue.bind(exchange, routing_key="content.#")
            logger.info("RabbitMQ consumer connected and listening on content.#")

            async with queue.iterator() as q_iter:
                async for message in q_iter:
                    async with message.process():
                        try:
                            routing_key = message.routing_key or ""
                            # e.g. "content.article.created"
                            parts = routing_key.split(".")
                            if len(parts) != 3:
                                continue
                            _, entity_type, action = parts
                            index = _CONTENT_TYPE_MAP.get(entity_type)
                            if index is None:
                                continue

                            payload = json.loads(message.body.decode())
                            doc_id = payload.get("id")
                            if doc_id is None:
                                continue

                            if action == "deleted":
                                try:
                                    es.delete(index=index, id=doc_id)
                                    logger.debug("Deleted %s/%s from ES", index, doc_id)
                                except NotFoundError:
                                    pass
                            elif action == "created":
                                es.index(index=index, id=doc_id, body=payload)
                                logger.debug("Indexed %s/%s in ES", index, doc_id)
                            elif action == "updated":
                                try:
                                    es.update(index=index, id=doc_id, body={"doc": payload})
                                except NotFoundError:
                                    es.index(index=index, id=doc_id, body=payload)
                                logger.debug("Updated %s/%s in ES", index, doc_id)
                        except Exception as msg_exc:
                            logger.warning("Error processing message: %s", msg_exc)

        except Exception as conn_exc:
            logger.warning(
                "RabbitMQ connection failed (%s), retrying in %ds…", conn_exc, retry_delay
            )
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 60)


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

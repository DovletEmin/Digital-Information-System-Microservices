"""
Pytest configuration: mock heavy external dependencies (Elasticsearch, aio_pika)
before main.py is imported, so tests run without real services.
"""
import sys
from unittest.mock import MagicMock

# Build a realistic ES mock whose search() returns an empty result set
_es_instance = MagicMock()
_es_instance.ping.return_value = True
_es_instance.indices.exists.return_value = True  # skip index creation on startup
_es_instance.search.return_value = {
    "hits": {"total": {"value": 0}, "hits": []},
    "aggregations": {},
}
_es_instance.index.return_value = {"result": "created"}
_es_instance.delete.return_value = {"result": "deleted"}
_es_instance.update.return_value = {"result": "updated"}

_es_module = MagicMock()
_es_module.Elasticsearch = MagicMock(return_value=_es_instance)
_es_module.NotFoundError = Exception  # must be a real exception class for except clauses

sys.modules["elasticsearch"] = _es_module

# Mock aio_pika — the RabbitMQ consumer is launched as an asyncio background task;
# asyncio.create_task is patched per-test so the consumer never actually runs.
sys.modules["aio_pika"] = MagicMock()

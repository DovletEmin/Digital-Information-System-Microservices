"""
ASGI middleware для обработки и нормализации тела запроса.
Исправляет некорректные JSON строки с неэкранированными переводами строк.
"""
import re


def _escape_newlines_in_strings(text: str) -> str:
    """Escape raw newlines inside JSON string literals."""
    out = []
    in_string = False
    escape = False

    for ch in text:
        if in_string:
            if escape:
                out.append(ch)
                escape = False
                continue

            if ch == "\\":
                out.append(ch)
                escape = True
                continue

            if ch == '"':
                in_string = False
                out.append(ch)
                continue

            if ch == "\n":
                out.append("\\n")
                continue
            if ch == "\r":
                out.append("\\r")
                continue

            out.append(ch)
        else:
            if ch == '"':
                in_string = True
                out.append(ch)
            else:
                out.append(ch)

    return "".join(out)


class RequestNormalizationMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method")
        headers = {k.decode("latin-1"): v.decode("latin-1") for k, v in scope.get("headers", [])}
        content_type = headers.get("content-type", "")

        if method in ["POST", "PUT", "PATCH"] and "application/json" in content_type:
            body_chunks = []
            more_body = True

            while more_body:
                message = await receive()
                if message["type"] == "http.request":
                    body_chunks.append(message.get("body", b""))
                    more_body = message.get("more_body", False)
                else:
                    more_body = False

            body = b"".join(body_chunks)

            if body:
                text = body.decode("utf-8", errors="ignore")
                text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)
                normalized = _escape_newlines_in_strings(text)
                body_bytes = normalized.encode("utf-8")
            else:
                body_bytes = body

            sent = False

            async def wrapped_receive():
                nonlocal sent
                if not sent:
                    sent = True
                    return {"type": "http.request", "body": body_bytes, "more_body": False}
                return {"type": "http.disconnect"}

            await self.app(scope, wrapped_receive, send)
            return

        await self.app(scope, receive, send)

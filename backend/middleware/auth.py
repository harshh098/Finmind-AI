from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

# Routes that don't require authentication
PUBLIC_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc", "/auth/login", "/auth/register"}


class AuthGuardMiddleware(BaseHTTPMiddleware):
    """
    Optional guard: blocks requests to protected routes without a Bearer token.
    Disabled by default — JWT dependency injection on each router is preferred.
    """
    ENABLED = False  # Set to True to activate global auth guard

    async def dispatch(self, request: Request, call_next):
        if not self.ENABLED:
            return await call_next(request)

        if request.url.path in PUBLIC_PATHS or request.url.path.startswith("/auth"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization header missing or invalid")

        return await call_next(request)

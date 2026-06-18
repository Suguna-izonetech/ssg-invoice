from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
from app.routers import auth, dashboard, invoices, sessions
from app.routers import profile


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Invoice Management System",
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

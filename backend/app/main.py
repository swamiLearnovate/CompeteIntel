from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analyze import router as analyze_router
from app.core.config import settings

# Configure basic logging for the app
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(title="CompeteIntel API")

# CORS settings for local frontend/dev use.
# Keep this open for now while the frontend runs separately.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this later for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(analyze_router)


@app.on_event("startup")
def on_startup():
    logger.info("CompeteIntel API starting up")


@app.on_event("shutdown")
def on_shutdown():
    logger.info("CompeteIntel API shutting down")


@app.get("/")
def root():
    return {
        "app_name": settings.APP_NAME,
        "status": "ok",
        "message": "CompeteIntel API is running.",
    }


@app.get("/api/config")
def get_config():
    logger.info("Config endpoint called | settings.APP_NAME=%s", settings.APP_NAME)
    return {
        "app_name": settings.APP_NAME,
        "status": "ok",
    }

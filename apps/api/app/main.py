from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from .routes import health, journals, auth as auth_routes, insights, exports, chat
from .config import settings
from .db import engine, Base
from . import models  # noqa: F401

app = FastAPI(title="DV Support API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# session cookie
app.add_middleware(SessionMiddleware, secret_key=settings.APP_ENC_KEY, same_site="lax", https_only=False, max_age=1209600)

# create tables
Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"ok": True, "service": "api", "message": "Welcome to DV Support API"}

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth_routes.router, prefix="/auth", tags=["auth"])
app.include_router(journals.router, prefix="/journals", tags=["journals"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])
app.include_router(exports.router, prefix="/exports", tags=["exports"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])

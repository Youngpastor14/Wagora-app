import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("wagora-api")

# Initialize FastAPI App
app = FastAPI(title="Wagora API", version="1.0.0")

# Setup CORS Origins
origins = [
    "http://localhost:5173",
    "https://wagora.vercel.app",
]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include all route routers
from routes import ai, campaigns, prospects, outreach, conversations, invoices, webhooks, documents, agents

app.include_router(ai.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(prospects.router, prefix="/api")
app.include_router(outreach.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(agents.router, prefix="/api")

# Base Health Check Route
@app.get("/")
async def health_check():
    return {"status": "wagora backend running", "version": "1.0.0"}

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": str(exc)
        }
    )

# Startup Event: Test external connections
from services.supabase_service import get_supabase_client

@app.on_event("startup")
async def startup_event():
    # Test Supabase connection
    try:
        supabase = get_supabase_client()
        # Test basic connection with a limit query
        supabase.table("profiles").select("id").limit(1).execute()
        logger.info("Supabase connection: OK")
    except Exception as e:
        logger.error(f"Supabase connection: FAILED — check SUPABASE_URL: {str(e)}")

    # Test Groq connection configuration
    try:
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
            from groq import AsyncGroq
            # Validate credentials locally via initialization
            AsyncGroq(api_key=settings.GROQ_API_KEY)
            logger.info("Groq connection: OK")
        else:
            logger.error("Groq connection: FAILED — check GROQ_API_KEY")
    except Exception as e:
        logger.error(f"Groq connection: FAILED — check GROQ_API_KEY: {str(e)}")

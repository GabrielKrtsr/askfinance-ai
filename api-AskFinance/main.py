"""Point d'entrée de l'API AskFinance (FastAPI)."""
from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()  # charge .env avant d'importer les services

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from controller.import_controller import router as import_router
from controller.recurring_controller import router as recurring_router
from controller.forecast_controller import router as forecast_router
from controller.transfers_controller import router as transfers_router
from controller.receivables_controller import router as receivables_router
from controller.tax_controller import router as tax_router
from controller.ai_controller import router as ai_router

app = FastAPI(title="AskFinance API")

# Autorise le front Next.js (dev) à appeler l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_router, prefix="/transactions", tags=["transactions"])
app.include_router(recurring_router, prefix="/transactions", tags=["transactions"])
app.include_router(forecast_router, prefix="/transactions", tags=["transactions"])
app.include_router(transfers_router, prefix="/transactions", tags=["transactions"])
app.include_router(receivables_router, prefix="/transactions", tags=["transactions"])
app.include_router(tax_router, prefix="/transactions", tags=["transactions"])
app.include_router(ai_router, prefix="/ai", tags=["ai"])


@app.get("/health")
def health():
    return {"status": "ok"}

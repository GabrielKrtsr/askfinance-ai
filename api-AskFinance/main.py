"""Point d'entrée de l'API AskFinance (FastAPI)."""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()  # charge .env avant d'importer les services

# Le Python distribué hors Microsoft Store s'appuie parfois sur le bundle CA de
# certifi, qui ne connaît pas les certificats racine ajoutés à Windows (antivirus,
# proxy local, environnement d'entreprise). HTTPX/Supabase doit utiliser le
# magasin de certificats Windows pour éviter un CERTIFICATE_VERIFY_FAILED local.
if os.name == "nt":
    import truststore

    truststore.inject_into_ssl()

# Échec immédiat et explicite si la config indispensable manque (plutôt qu'un
# 500 opaque à la première requête).
_REQUIRED_ENV = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
_missing = [name for name in _REQUIRED_ENV if not os.environ.get(name)]
if _missing:
    raise RuntimeError(
        f"Variables d'environnement manquantes : {', '.join(_missing)}. "
        "Renseignez-les dans le fichier .env de l'API."
    )

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from controller.import_controller import router as import_router
from controller.recurring_controller import router as recurring_router
from controller.forecast_controller import router as forecast_router
from controller.pilotage_controller import router as pilotage_router
from controller.transfers_controller import router as transfers_router
from controller.receivables_controller import router as receivables_router
from controller.tax_controller import router as tax_router
from controller.ai_controller import router as ai_router

app = FastAPI(title="AskFinance API")

# Origines autorisées : CORS_ORIGINS="https://app.exemple.fr,https://…" en prod,
# repli sur le front Next.js local en dev.
_cors_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_router, prefix="/transactions", tags=["transactions"])
app.include_router(recurring_router, prefix="/transactions", tags=["transactions"])
app.include_router(forecast_router, prefix="/transactions", tags=["transactions"])
app.include_router(pilotage_router, prefix="/transactions", tags=["transactions"])
app.include_router(transfers_router, prefix="/transactions", tags=["transactions"])
app.include_router(receivables_router, prefix="/transactions", tags=["transactions"])
app.include_router(tax_router, prefix="/transactions", tags=["transactions"])
app.include_router(ai_router, prefix="/ai", tags=["ai"])


@app.get("/health")
def health():
    return {"status": "ok"}

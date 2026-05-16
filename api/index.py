from pathlib import Path
import sys

from fastapi import FastAPI


BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app as backend_app  # noqa: E402


app = FastAPI(title="ReySoft-Asistencia API")
app.mount("/api", backend_app)

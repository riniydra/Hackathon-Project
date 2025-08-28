import os
import sys

# Ensure apps/api is on sys.path so "app" can be imported
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_DIR = os.path.join(REPO_ROOT, "apps", "api")
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

try:
    import uvicorn  # type: ignore
except ImportError as exc:
    sys.stderr.write(
        "\n[ERROR] uvicorn is not installed in the API virtualenv.\n"
        "Run setup.ps1 or install requirements in apps/api/.venv.\n\n"
    )
    raise

if __name__ == "__main__":
    # Start FastAPI app with reload
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

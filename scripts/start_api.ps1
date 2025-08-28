# Start FastAPI via the API virtualenv
$venvPython = Join-Path $PSScriptRoot "..\apps\api\.venv\Scripts\python.exe"
if (!(Test-Path $venvPython)) {
  Write-Host "❌ API virtualenv not found at $venvPython" -ForegroundColor Red
  Write-Host "Run setup.ps1 or create the venv in apps/api and install requirements." -ForegroundColor Yellow
  exit 1
}

Write-Host "▶ Starting API on http://127.0.0.1:8000" -ForegroundColor Green
& $venvPython -m uvicorn app.main:app --reload --port 8000 --app-dir (Join-Path $PSScriptRoot "..\apps\api")

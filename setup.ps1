# Calm Garden MVP Setup Script for Windows
Write-Host "🌱 Setting up Calm Garden MVP..." -ForegroundColor Green

# Check if Docker Desktop is running
Write-Host "Checking Docker Desktop..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    Write-Host "✅ Docker Desktop is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop is not running. Please start Docker Desktop and run this script again." -ForegroundColor Red
    Write-Host "You can start Docker Desktop from the Start menu or system tray." -ForegroundColor Yellow
    exit 1
}

# Start the database
Write-Host "Starting PostgreSQL database..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start database. Please check Docker Desktop is running." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Database started successfully" -ForegroundColor Green

# Wait a moment for database to be ready
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Set up Python virtual environment
Write-Host "Setting up Python environment..." -ForegroundColor Yellow
cd apps/api
if (!(Test-Path ".venv")) {
    python -m venv .venv
}
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Python dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Python environment ready" -ForegroundColor Green

# Set up Node.js dependencies
Write-Host "Setting up Node.js dependencies..." -ForegroundColor Yellow
cd ..\..
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Node.js dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js dependencies ready" -ForegroundColor Green

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ Environment file created" -ForegroundColor Green
}

Write-Host "`n🎉 Setup complete! You can now start the development servers:" -ForegroundColor Green
Write-Host "  pnpm dev    # Start both frontend and backend" -ForegroundColor Cyan
Write-Host "  pnpm dev:web # Start only frontend" -ForegroundColor Cyan
Write-Host "  pnpm dev:api # Start only backend" -ForegroundColor Cyan
Write-Host "`n🌐 Access the application at:" -ForegroundColor Green
Write-Host "  Web App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan

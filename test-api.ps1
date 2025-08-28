# Test API endpoints
Write-Host "🧪 Testing API endpoints..." -ForegroundColor Green

# Test health endpoint
Write-Host "Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    Write-Host "✅ Health check passed: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed. Make sure the API is running on port 8000" -ForegroundColor Red
    exit 1
}

# Test journal creation
Write-Host "Testing journal creation..." -ForegroundColor Yellow
try {
    $body = @{
        text = "Test journal entry from PowerShell"
    } | ConvertTo-Json
    
    $headers = @{
        "Content-Type" = "application/json"
        "X-User-Id" = "demo"
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:8000/journals/" -Method Post -Body $body -Headers $headers
    Write-Host "✅ Journal created: ID $($response.id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Journal creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test journal listing
Write-Host "Testing journal listing..." -ForegroundColor Yellow
try {
    $headers = @{
        "X-User-Id" = "demo"
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:8000/journals/" -Method Get -Headers $headers
    Write-Host "✅ Found $($response.Count) journal entries" -ForegroundColor Green
} catch {
    Write-Host "❌ Journal listing failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 API tests completed!" -ForegroundColor Green

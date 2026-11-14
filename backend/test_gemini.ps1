# Test Gemini API - Run this after enabling the Generative Language API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Gemini API Connection" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Load API key from .env
$key = (Get-Content .env | Select-String -Pattern '^GOOGLE_API_KEY=(.+)$' | ForEach-Object { $_.Matches.Groups[1].Value })
$env:GOOGLE_API_KEY = $key

Write-Host "API Key: $($key.Substring(0,20))..." -ForegroundColor Yellow
Write-Host "Testing models...`n" -ForegroundColor Yellow

# Test 1: Try gemini-1.5-pro
Write-Host "1. Testing gemini-1.5-pro..." -ForegroundColor Cyan
try {
    $response = python -c "from langchain_google_genai import ChatGoogleGenerativeAI; llm = ChatGoogleGenerativeAI(model='gemini-1.5-pro'); response = llm.invoke('Say hello in one word'); print(response.content)" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   SUCCESS! gemini-1.5-pro is working!" -ForegroundColor Green
        Write-Host "   Response: $response" -ForegroundColor Yellow
        $model = "gemini-1.5-pro"
    } else {
        throw "Failed"
    }
} catch {
    Write-Host "   gemini-1.5-pro not available" -ForegroundColor Red
    
    # Test 2: Try gemini-1.5-flash
    Write-Host "`n2. Testing gemini-1.5-flash..." -ForegroundColor Cyan
    try {
        $response = python -c "from langchain_google_genai import ChatGoogleGenerativeAI; llm = ChatGoogleGenerativeAI(model='gemini-1.5-flash'); response = llm.invoke('Say hello in one word'); print(response.content)" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   SUCCESS! gemini-1.5-flash is working!" -ForegroundColor Green
            Write-Host "   Response: $response" -ForegroundColor Yellow
            $model = "gemini-1.5-flash"
        } else {
            throw "Failed"
        }
    } catch {
        Write-Host "   gemini-1.5-flash not available" -ForegroundColor Red
        
        # Test 3: Try gemini-pro
        Write-Host "`n3. Testing gemini-pro..." -ForegroundColor Cyan
        try {
            $response = python -c "from langchain_google_genai import ChatGoogleGenerativeAI; llm = ChatGoogleGenerativeAI(model='gemini-pro'); response = llm.invoke('Say hello in one word'); print(response.content)" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   SUCCESS! gemini-pro is working!" -ForegroundColor Green
                Write-Host "   Response: $response" -ForegroundColor Yellow
                $model = "gemini-pro"
            } else {
                throw "Failed"
            }
        } catch {
            Write-Host "   gemini-pro not available" -ForegroundColor Red
            Write-Host "`n   ERROR: API not enabled yet or key doesn't have access" -ForegroundColor Red
            Write-Host "   Please enable at: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com" -ForegroundColor Yellow
            exit 1
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "SUCCESS! Gemini API is working!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Model: $model" -ForegroundColor Yellow

# Update .env with working model
Write-Host "`nUpdating .env with working model..." -ForegroundColor Cyan
(Get-Content .env) -replace '^LLM_MODEL=.*$', "LLM_MODEL=$model" | Set-Content .env
Write-Host "Updated LLM_MODEL=$model" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Next Step: Run Evaluation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Command: python eval/run_eval.py" -ForegroundColor Yellow
Write-Host "Expected: 19-21/21 tests passing (90-100%)" -ForegroundColor Yellow
Write-Host "`nPress any key to run evaluation now, or Ctrl+C to exit..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`nRunning evaluation..." -ForegroundColor Cyan
python eval/run_eval.py

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Gemini API Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

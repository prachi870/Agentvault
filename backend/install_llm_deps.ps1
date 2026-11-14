# Install LLM dependencies for ESAKIP
# Run this script: .\install_llm_deps.ps1

Write-Host "Installing LLM dependencies for ESAKIP..." -ForegroundColor Cyan
Write-Host "This may take 5-10 minutes..." -ForegroundColor Yellow

# Activate virtual environment
& .\.venv\Scripts\Activate.ps1

# Upgrade pip first
Write-Host "`nUpgrading pip..." -ForegroundColor Green
python -m pip install --upgrade pip --quiet

# Install packages one by one with progress
Write-Host "`n1/5 Installing langchain-google-genai..." -ForegroundColor Green
pip install langchain-google-genai

Write-Host "`n2/5 Installing langchain-openai..." -ForegroundColor Green
pip install langchain-openai

Write-Host "`n3/5 Installing langchain-anthropic..." -ForegroundColor Green
pip install langchain-anthropic

Write-Host "`n4/5 Installing sentence-transformers (large, may take time)..." -ForegroundColor Green
pip install sentence-transformers

Write-Host "`n5/5 Installing tiktoken..." -ForegroundColor Green
pip install tiktoken

# Verify installation
Write-Host "`n`nVerification:" -ForegroundColor Cyan

$errors = 0

try {
    python -c "import langchain_google_genai" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Gemini support installed" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Gemini support missing" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "  [FAIL] Gemini support missing" -ForegroundColor Red
    $errors++
}

try {
    python -c "import langchain_openai" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] OpenAI support installed" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] OpenAI support missing" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "  [FAIL] OpenAI support missing" -ForegroundColor Red
    $errors++
}

try {
    python -c "import langchain_anthropic" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Anthropic support installed" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Anthropic support missing" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "  [FAIL] Anthropic support missing" -ForegroundColor Red
    $errors++
}

try {
    python -c "import sentence_transformers" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Sentence Transformers installed" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Sentence Transformers missing" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "  [FAIL] Sentence Transformers missing" -ForegroundColor Red
    $errors++
}

try {
    python -c "import tiktoken" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Tiktoken installed" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Tiktoken missing" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "  [FAIL] Tiktoken missing" -ForegroundColor Red
    $errors++
}

Write-Host "`n"
if ($errors -eq 0) {
    Write-Host "Installation complete! All packages installed successfully." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Update backend\.env: Set LLM_PROVIDER=gemini" -ForegroundColor White
    Write-Host "  2. Update backend\.env: Set EMBEDDING_PROVIDER=gemini" -ForegroundColor White
    Write-Host "  3. Restart the backend server" -ForegroundColor White
} else {
    Write-Host "Installation completed with $errors errors. Please check the output above." -ForegroundColor Yellow
}

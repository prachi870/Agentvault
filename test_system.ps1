# ESAKIP System Test Script
# This script performs automated testing of the ESAKIP system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ESAKIP System Testing Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "SilentlyContinue"

# Configuration
$BACKEND_URL = "http://localhost:8000"
$FRONTEND_URL = "http://localhost:3000"

$testResults = @{
    passed = 0
    failed = 0
    total = 0
}

function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    $testResults.total++
    Write-Host "[TEST] $TestName..." -NoNewline
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host " PASS" -ForegroundColor Green
            $testResults.passed++
            return $response
        } else {
            Write-Host " FAIL (Status: $($response.StatusCode), Expected: $ExpectedStatus)" -ForegroundColor Red
            $testResults.failed++
            return $null
        }
    }
    catch {
        Write-Host " FAIL ($($_.Exception.Message))" -ForegroundColor Red
        $testResults.failed++
        return $null
    }
}

# Test 1: Services Running
Write-Host "`n=== Test Suite 1: Service Availability ===" -ForegroundColor Yellow

Test-Endpoint -TestName "Backend Health Check" -Url "$BACKEND_URL/health"
Test-Endpoint -TestName "Frontend Accessible" -Url "$FRONTEND_URL"

# Test 2: Authentication
Write-Host "`n=== Test Suite 2: Authentication ===" -ForegroundColor Yellow

$loginParams = @{
    Uri = "$BACKEND_URL/api/v1/auth/login"
    Method = "POST"
    Body = @{
        username = "admin@esakip.local"
        password = "Admin@123456"
    }
    UseBasicParsing = $true
}

Write-Host "[TEST] Admin Login..." -NoNewline
$testResults.total++

try {
    $loginResponse = Invoke-WebRequest @loginParams
    if ($loginResponse.StatusCode -eq 200) {
        Write-Host " PASS" -ForegroundColor Green
        $testResults.passed++
    } else {
        Write-Host " FAIL (Status: $($loginResponse.StatusCode))" -ForegroundColor Red
        $testResults.failed++
        $loginResponse = $null
    }
}
catch {
    Write-Host " FAIL ($($_.Exception.Message))" -ForegroundColor Red
    $testResults.failed++
    $loginResponse = $null
}

if ($loginResponse) {
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $adminToken = $loginData.access_token
    $authHeaders = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    # Test 3: User Endpoints
    Write-Host "`n=== Test Suite 3: User Management ===" -ForegroundColor Yellow
    
    Test-Endpoint `
        -TestName "Get Current User" `
        -Url "$BACKEND_URL/api/v1/auth/me" `
        -Headers $authHeaders
    
    Test-Endpoint `
        -TestName "List All Users (Admin)" `
        -Url "$BACKEND_URL/api/v1/users" `
        -Headers $authHeaders
    
    # Test 4: Documents
    Write-Host "`n=== Test Suite 4: Documents ===" -ForegroundColor Yellow
    
    $docsResponse = Test-Endpoint `
        -TestName "List Documents" `
        -Url "$BACKEND_URL/api/v1/documents?limit=20" `
        -Headers $authHeaders
    
    if ($docsResponse) {
        $docs = ($docsResponse.Content | ConvertFrom-Json)
        Write-Host "  Found $($docs.Count) documents in system" -ForegroundColor Cyan
    }
    
    # Test 5: Query (if documents exist)
    if ($docs -and $docs.Count -gt 0) {
        Write-Host "`n=== Test Suite 5: Query Functionality ===" -ForegroundColor Yellow
        
        $queryBody = @{
            question = "What is ESAKIP?"
        }
        
        Test-Endpoint `
            -TestName "Submit Query" `
            -Url "$BACKEND_URL/api/v1/query" `
            -Method "POST" `
            -Headers $authHeaders `
            -Body $queryBody
    }
    
    # Test 6: Receipts
    Write-Host "`n=== Test Suite 6: Audit Receipts ===" -ForegroundColor Yellow
    
    $receiptsResponse = Test-Endpoint `
        -TestName "List Receipts" `
        -Url "$BACKEND_URL/api/v1/receipts?limit=10" `
        -Headers $authHeaders
    
    if ($receiptsResponse) {
        $receipts = ($receiptsResponse.Content | ConvertFrom-Json)
        Write-Host "  Found $($receipts.Count) receipts in history" -ForegroundColor Cyan
    }
}

# Test Employee Account
Write-Host "`n=== Test Suite 7: Employee Account ===" -ForegroundColor Yellow

$empLoginParams = @{
    Uri = "$BACKEND_URL/api/v1/auth/login"
    Method = "POST"
    Body = @{
        username = "jane.smith@example.com"
        password = "TestPass456!"
    }
    UseBasicParsing = $true
}

Write-Host "[TEST] Employee Login..." -NoNewline
$testResults.total++

try {
    $empLoginResponse = Invoke-WebRequest @empLoginParams
    if ($empLoginResponse.StatusCode -eq 200) {
        Write-Host " PASS" -ForegroundColor Green
        $testResults.passed++
    } else {
        Write-Host " FAIL (Status: $($empLoginResponse.StatusCode))" -ForegroundColor Red
        $testResults.failed++
        $empLoginResponse = $null
    }
}
catch {
    Write-Host " FAIL ($($_.Exception.Message))" -ForegroundColor Red
    $testResults.failed++
    $empLoginResponse = $null
}

if ($empLoginResponse) {
    $empData = $empLoginResponse.Content | ConvertFrom-Json
    $empToken = $empData.access_token
    $empHeaders = @{
        "Authorization" = "Bearer $empToken"
    }
    
    Test-Endpoint `
        -TestName "Employee Get Profile" `
        -Url "$BACKEND_URL/api/v1/auth/me" `
        -Headers $empHeaders
    
    # Should FAIL - employees can't list all users
    Write-Host "[TEST] Employee Access to User Management..." -NoNewline
    $testResults.total++
    try {
        $response = Invoke-WebRequest `
            -Uri "$BACKEND_URL/api/v1/users" `
            -Headers $empHeaders `
            -UseBasicParsing `
            -TimeoutSec 10
        
        if ($response.StatusCode -eq 403 -or $response.StatusCode -eq 401) {
            Write-Host " PASS (Correctly Denied)" -ForegroundColor Green
            $testResults.passed++
        } else {
            Write-Host " FAIL (Should be denied, got status: $($response.StatusCode))" -ForegroundColor Red
            $testResults.failed++
        }
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 403 -or $_.Exception.Response.StatusCode -eq 401) {
            Write-Host " PASS (Correctly Denied)" -ForegroundColor Green
            $testResults.passed++
        } else {
            Write-Host " FAIL ($($_.Exception.Message))" -ForegroundColor Red
            $testResults.failed++
        }
    }
}

# Test Signup
Write-Host "`n=== Test Suite 8: User Registration ===" -ForegroundColor Yellow

$randomEmail = "test.$(Get-Random)@example.com"
$signupBody = @{
    full_name = "Test User"
    email = $randomEmail
    password = "TestPass123!"
}

$signupResponse = Test-Endpoint `
    -TestName "New User Signup" `
    -Url "$BACKEND_URL/api/v1/auth/signup" `
    -Method "POST" `
    -Body $signupBody `
    -ExpectedStatus 201

if ($signupResponse) {
    Write-Host "  Created test account: $randomEmail" -ForegroundColor Cyan
    
    # Try to login with new account
    $newLoginParams = @{
        Uri = "$BACKEND_URL/api/v1/auth/login"
        Method = "POST"
        Body = @{
            username = $randomEmail
            password = "TestPass123!"
        }
        UseBasicParsing = $true
    }
    
    Write-Host "[TEST] New User Login..." -NoNewline
    $testResults.total++
    
    try {
        $newResponse = Invoke-WebRequest @newLoginParams
        if ($newResponse.StatusCode -eq 200) {
            Write-Host " PASS" -ForegroundColor Green
            $testResults.passed++
        } else {
            Write-Host " FAIL" -ForegroundColor Red
            $testResults.failed++
        }
    }
    catch {
        Write-Host " FAIL ($($_.Exception.Message))" -ForegroundColor Red
        $testResults.failed++
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Tests: $($testResults.total)" -ForegroundColor White
Write-Host "Passed: $($testResults.passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.failed)" -ForegroundColor Red

$passRate = [math]::Round(($testResults.passed / $testResults.total) * 100, 2)
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" })

Write-Host "`n========================================" -ForegroundColor Cyan

if ($testResults.failed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Review above for details." -ForegroundColor Red
    exit 1
}

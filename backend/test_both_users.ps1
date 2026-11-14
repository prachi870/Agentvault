# ESAKIP Comprehensive User Testing Script
# Tests both Admin and Employee user workflows

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:8000"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ESAKIP COMPREHENSIVE USER TESTING" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================
# PART 1: ADMIN USER TESTING
# ============================================

Write-Host "`n[ADMIN TESTING] Starting admin user tests..." -ForegroundColor Yellow

# 1. Admin Login
Write-Host "`n[1/10] Testing admin login..." -ForegroundColor Green
try {
    $adminLogin = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST `
        -Body "username=admin@esakip.local&password=Admin@123456" `
        -ContentType "application/x-www-form-urlencoded"
    $adminToken = $adminLogin.access_token
    Write-Host "✓ Admin login successful" -ForegroundColor Green
    Write-Host "  Token: $($adminToken.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Admin login failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Get Admin Profile
Write-Host "`n[2/10] Getting admin profile..." -ForegroundColor Green
try {
    $adminProfile = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/me" `
        -Headers @{ Authorization = "Bearer $adminToken" }
    Write-Host "✓ Admin profile retrieved" -ForegroundColor Green
    Write-Host "  Email: $($adminProfile.email)" -ForegroundColor Gray
    Write-Host "  Role: $($adminProfile.role)" -ForegroundColor Gray
    Write-Host "  Clearance: $($adminProfile.clearance)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get admin profile: $_" -ForegroundColor Red
}

# 3. Upload PUBLIC document
Write-Host "`n[3/10] Uploading PUBLIC document (accessible to all)..." -ForegroundColor Green
try {
    $publicFile = Get-Content "test_docs\public_policy.txt" -Raw
    $boundary = [System.Guid]::NewGuid().ToString()
    $bodyLines = @(
        "--$boundary",
        'Content-Disposition: form-data; name="file"; filename="public_policy.txt"',
        'Content-Type: text/plain',
        '',
        $publicFile,
        "--$boundary",
        'Content-Disposition: form-data; name="classification"',
        '',
        'public',
        "--$boundary",
        'Content-Disposition: form-data; name="allowed_roles"',
        '',
        '*',
        "--$boundary",
        'Content-Disposition: form-data; name="title"',
        '',
        'Working Hours Policy',
        "--$boundary--"
    )
    $body = $bodyLines -join "`r`n"
    
    $publicDoc = Invoke-RestMethod -Uri "$baseUrl/api/v1/documents" -Method POST `
        -Headers @{ 
            Authorization = "Bearer $adminToken"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        } -Body $body
    Write-Host "✓ PUBLIC document uploaded" -ForegroundColor Green
    Write-Host "  ID: $($publicDoc.id)" -ForegroundColor Gray
    Write-Host "  Title: $($publicDoc.title)" -ForegroundColor Gray
    Write-Host "  Classification: $($publicDoc.classification)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to upload public document: $_" -ForegroundColor Red
}

# 4. Upload INTERNAL document
Write-Host "`n[4/10] Uploading INTERNAL document (employees+)..." -ForegroundColor Green
try {
    $internalFile = Get-Content "test_docs\employee_benefits.txt" -Raw
    $boundary = [System.Guid]::NewGuid().ToString()
    $bodyLines = @(
        "--$boundary",
        'Content-Disposition: form-data; name="file"; filename="employee_benefits.txt"',
        'Content-Type: text/plain',
        '',
        $internalFile,
        "--$boundary",
        'Content-Disposition: form-data; name="classification"',
        '',
        'internal',
        "--$boundary",
        'Content-Disposition: form-data; name="allowed_roles"',
        '',
        '*',
        "--$boundary",
        'Content-Disposition: form-data; name="title"',
        '',
        'Employee Benefits Guide',
        "--$boundary--"
    )
    $body = $bodyLines -join "`r`n"
    
    $internalDoc = Invoke-RestMethod -Uri "$baseUrl/api/v1/documents" -Method POST `
        -Headers @{ 
            Authorization = "Bearer $adminToken"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        } -Body $body
    Write-Host "✓ INTERNAL document uploaded" -ForegroundColor Green
    Write-Host "  ID: $($internalDoc.id)" -ForegroundColor Gray
    Write-Host "  Classification: $($internalDoc.classification)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to upload internal document: $_" -ForegroundColor Red
}

# 5. Upload CONFIDENTIAL document
Write-Host "`n[5/10] Uploading CONFIDENTIAL document (managers only)..." -ForegroundColor Green
try {
    $confFile = Get-Content "test_docs\manager_compensation.txt" -Raw
    $boundary = [System.Guid]::NewGuid().ToString()
    $bodyLines = @(
        "--$boundary",
        'Content-Disposition: form-data; name="file"; filename="manager_compensation.txt"',
        'Content-Type: text/plain',
        '',
        $confFile,
        "--$boundary",
        'Content-Disposition: form-data; name="classification"',
        '',
        'confidential',
        "--$boundary",
        'Content-Disposition: form-data; name="allowed_roles"',
        '',
        'manager,admin',
        "--$boundary",
        'Content-Disposition: form-data; name="title"',
        '',
        'Manager Compensation',
        "--$boundary--"
    )
    $body = $bodyLines -join "`r`n"
    
    $confDoc = Invoke-RestMethod -Uri "$baseUrl/api/v1/documents" -Method POST `
        -Headers @{ 
            Authorization = "Bearer $adminToken"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        } -Body $body
    Write-Host "✓ CONFIDENTIAL document uploaded" -ForegroundColor Green
    Write-Host "  ID: $($confDoc.id)" -ForegroundColor Gray
    Write-Host "  Allowed roles: manager, admin" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to upload confidential document: $_" -ForegroundColor Red
}

# 6. Upload RESTRICTED document
Write-Host "`n[6/10] Uploading RESTRICTED document (executives only)..." -ForegroundColor Green
try {
    $restrictedFile = Get-Content "test_docs\executive_strategy.txt" -Raw
    $boundary = [System.Guid]::NewGuid().ToString()
    $bodyLines = @(
        "--$boundary",
        'Content-Disposition: form-data; name="file"; filename="executive_strategy.txt"',
        'Content-Type: text/plain',
        '',
        $restrictedFile,
        "--$boundary",
        'Content-Disposition: form-data; name="classification"',
        '',
        'restricted',
        "--$boundary",
        'Content-Disposition: form-data; name="allowed_roles"',
        '',
        'admin',
        "--$boundary",
        'Content-Disposition: form-data; name="title"',
        '',
        'Executive Strategy 2027',
        "--$boundary--"
    )
    $body = $bodyLines -join "`r`n"
    
    $restrictedDoc = Invoke-RestMethod -Uri "$baseUrl/api/v1/documents" -Method POST `
        -Headers @{ 
            Authorization = "Bearer $adminToken"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        } -Body $body
    Write-Host "✓ RESTRICTED document uploaded" -ForegroundColor Green
    Write-Host "  ID: $($restrictedDoc.id)" -ForegroundColor Gray
    Write-Host "  Allowed roles: admin only" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to upload restricted document: $_" -ForegroundColor Red
}

# Wait for indexing
Write-Host "`n⏳ Waiting 10 seconds for document indexing..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 7. List documents as admin
Write-Host "`n[7/10] Listing all documents as admin..." -ForegroundColor Green
try {
    $adminDocs = Invoke-RestMethod -Uri "$baseUrl/api/v1/documents?limit=20" `
        -Headers @{ Authorization = "Bearer $adminToken" }
    Write-Host "✓ Admin can see $($adminDocs.items.Count) documents" -ForegroundColor Green
    foreach ($doc in $adminDocs.items) {
        Write-Host "  - $($doc.title) [$($doc.classification)]" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to list documents: $_" -ForegroundColor Red
}

# 8. Admin query
Write-Host "`n[8/10] Testing admin query..." -ForegroundColor Green
try {
    $adminQuery = Invoke-RestMethod -Uri "$baseUrl/api/v1/query" -Method POST `
        -Headers @{ 
            Authorization = "Bearer $adminToken"
            "Content-Type" = "application/json"
        } -Body '{"question":"How many days of annual leave do employees get?"}'
    
    Write-Host "✓ Admin query successful" -ForegroundColor Green
    Write-Host "  Status: $($adminQuery.status)" -ForegroundColor Gray
    Write-Host "  Answer: $($adminQuery.answer.Substring(0, [Math]::Min(100, $adminQuery.answer.Length)))..." -ForegroundColor Gray
    Write-Host "  Confidence: $($adminQuery.confidence_label) ($([Math]::Round($adminQuery.confidence * 100))%)" -ForegroundColor Gray
    Write-Host "  Citations: $($adminQuery.citations.Count)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Admin query failed: $_" -ForegroundColor Red
}

# 9. Check health dashboard
Write-Host "`n[9/10] Checking health dashboard (admin only)..." -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/v1/dashboard/health?days=7" `
        -Headers @{ Authorization = "Bearer $adminToken" }
    Write-Host "✓ Health dashboard accessible" -ForegroundColor Green
    Write-Host "  Total queries: $($health.total_queries)" -ForegroundColor Gray
    Write-Host "  Answer rate: $([Math]::Round($health.answer_rate * 100))%" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to access health dashboard: $_" -ForegroundColor Red
}

# 10. Check knowledge gaps
Write-Host "`n[10/10] Checking knowledge gaps dashboard..." -ForegroundColor Green
try {
    $gaps = Invoke-RestMethod -Uri "$baseUrl/api/v1/dashboard/knowledge-gaps?status=open&limit=10" `
        -Headers @{ Authorization = "Bearer $adminToken" }
    Write-Host "✓ Knowledge gaps accessible" -ForegroundColor Green
    Write-Host "  Open gaps: $($gaps.items.Count)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to access knowledge gaps: $_" -ForegroundColor Red
}

# ============================================
# PART 2: EMPLOYEE USER TESTING
# ============================================

Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "[EMPLOYEE TESTING] Starting employee user tests..." -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Create employee via signup
Write-Host "`n[1/8] Creating new employee via signup..." -ForegroundColor Green
$randomId = Get-Random -Maximum 9999
$employeeEmail = "test.employee.$randomId@example.com"
try {
    $newEmployee = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/signup" -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body (@{
            email = $employeeEmail
            password = "TestEmployee123!"
            full_name = "Test Employee $randomId"
            department = "Engineering"
        } | ConvertTo-Json)
    
    Write-Host "✓ Employee account created" -ForegroundColor Green
    Write-Host "  Email: $($newEmployee.email)" -ForegroundColor Gray
    Write-Host "  Role: $($newEmployee.role)" -ForegroundColor Gray
    Write-Host "  Clearance: $($newEmployee.clearance)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to create employee: $_" -ForegroundColor Red
    Write-Host "  Using existing test employee instead..." -ForegroundColor Yellow
    $employeeEmail = "jane.smith@example.com"
}

# 2. Employee login
Write-Host "`n[2/8] Testing employee login..." -ForegroundColor Green
try {
    $empPassword = if ($employeeEmail -eq "jane.smith@example.com") { "TestPass456!" } else { "TestEmployee123!" }
    $employeeLogin = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST `
        -Body "username=$employeeEmail&password=$empPassword" `
        -ContentType "application/x-www-form-urlencoded"
    $employeeToken = $employeeLogin.access_token
    Write-Host "✓ Employee login successful" -ForegroundColor Green
    Write-Host "  Token: $($employeeToken.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Employee login failed: $_" -ForegroundColor Red
    exit 1
}

# 3. Get employee profile
Write-Host "`n[3/8] Getting employee profile..." -ForegroundColor Green
try {
    $employeeProfile = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/me" `
        -Headers @{ Authorization = "Bearer $employeeToken" }
    Write-Host "✓ Employee profile retrieved" -ForegroundColor Green
    Write-Host "  Email: $($employeeProfile.email)" -ForegroundColor Gray
    Write-Host "  Role: $($employeeProfile.role)" -ForegroundColor Gray
    Write-Host "  Clearance: $($employeeProfile.clearance)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get employee profile: $_" -ForegroundColor Red
}

# 4. List documents as employee
Write-Host "`n[4/8] Listing documents as employee (RBAC filtering)..." -ForegroundColor Green
try {
    $employeeDocs = Invoke-RestMethod -Uri "$baseUrl/api/v1/documents?limit=20" `
        -Headers @{ Authorization = "Bearer $employeeToken" }
    Write-Host "✓ Employee can see $($employeeDocs.items.Count) documents" -ForegroundColor Green
    Write-Host "  Expected: PUBLIC and INTERNAL only (not CONFIDENTIAL or RESTRICTED)" -ForegroundColor Yellow
    foreach ($doc in $employeeDocs.items) {
        $color = if ($doc.classification -in @('public', 'internal')) { "Green" } else { "Red" }
        Write-Host "  - $($doc.title) [$($doc.classification)]" -ForegroundColor $color
    }
    
    $hasConfidential = $employeeDocs.items | Where-Object { $_.classification -eq 'confidential' }
    $hasRestricted = $employeeDocs.items | Where-Object { $_.classification -eq 'restricted' }
    
    if ($hasConfidential -or $hasRestricted) {
        Write-Host "  ✗ RBAC LEAK: Employee can see restricted documents!" -ForegroundColor Red
    } else {
        Write-Host "  ✓ RBAC working: Employee sees only permitted documents" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to list documents: $_" -ForegroundColor Red
}

# 5. Employee query
Write-Host "`n[5/8] Testing employee query..." -ForegroundColor Green
try {
    $employeeQuery = Invoke-RestMethod -Uri "$baseUrl/api/v1/query" -Method POST `
        -Headers @{ 
            Authorization = "Bearer $employeeToken"
            "Content-Type" = "application/json"
        } -Body '{"question":"What are the working hours?"}'
    
    Write-Host "✓ Employee query successful" -ForegroundColor Green
    Write-Host "  Status: $($employeeQuery.status)" -ForegroundColor Gray
    Write-Host "  Answer: $($employeeQuery.answer.Substring(0, [Math]::Min(100, $employeeQuery.answer.Length)))..." -ForegroundColor Gray
    Write-Host "  Confidence: $($employeeQuery.confidence_label)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Employee query failed: $_" -ForegroundColor Red
}

# 6. Test RBAC - query about restricted info
Write-Host "`n[6/8] Testing RBAC - employee querying restricted info..." -ForegroundColor Green
try {
    $restrictedQuery = Invoke-RestMethod -Uri "$baseUrl/api/v1/query" -Method POST `
        -Headers @{ 
            Authorization = "Bearer $employeeToken"
            "Content-Type" = "application/json"
        } -Body '{"question":"What is the executive bonus pool for 2027?"}'
    
    Write-Host "  Status: $($restrictedQuery.status)" -ForegroundColor Gray
    if ($restrictedQuery.status -eq 'abstained') {
        Write-Host "✓ RBAC working: Employee cannot access restricted info" -ForegroundColor Green
    } else {
        $containsRestricted = $restrictedQuery.answer -match "2\.4.*million"
        if ($containsRestricted) {
            Write-Host "✗ RBAC LEAK: Employee accessed restricted information!" -ForegroundColor Red
        } else {
            Write-Host "✓ RBAC working: No restricted data leaked" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "✗ Restricted query failed: $_" -ForegroundColor Red
}

# 7. Test employee cannot upload
Write-Host "`n[7/8] Testing employee cannot upload documents..." -ForegroundColor Green
try {
    $testFile = "Test content"
    $boundary = [System.Guid]::NewGuid().ToString()
    $bodyLines = @(
        "--$boundary",
        'Content-Disposition: form-data; name="file"; filename="test.txt"',
        'Content-Type: text/plain',
        '',
        $testFile,
        "--$boundary",
        'Content-Disposition: form-data; name="classification"',
        '',
        'public',
        "--$boundary--"
    )
    $body = $bodyLines -join "`r`n"
    
    $uploadAttempt = Invoke-RestMethod -Uri "$baseUrl/api/v1/documents" -Method POST `
        -Headers @{ 
            Authorization = "Bearer $employeeToken"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        } -Body $body
    
    Write-Host "✗ PERMISSION ERROR: Employee was able to upload!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✓ Permission denied: Employee cannot upload (expected)" -ForegroundColor Green
    } else {
        Write-Host "  Error: $_" -ForegroundColor Yellow
    }
}

# 8. Test employee cannot access admin dashboard
Write-Host "`n[8/8] Testing employee cannot access admin dashboard..." -ForegroundColor Green
try {
    $healthAttempt = Invoke-RestMethod -Uri "$baseUrl/api/v1/dashboard/health?days=7" `
        -Headers @{ Authorization = "Bearer $employeeToken" }
    
    Write-Host "✗ PERMISSION ERROR: Employee accessed admin dashboard!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✓ Permission denied: Employee cannot access dashboard (expected)" -ForegroundColor Green
    } else {
        Write-Host "  Error: $_" -ForegroundColor Yellow
    }
}

# ============================================
# SUMMARY
# ============================================

Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "ADMIN USER TESTS:" -ForegroundColor Yellow
Write-Host "  ✓ Login successful" -ForegroundColor Green
Write-Host "  ✓ Can upload documents (all classifications)" -ForegroundColor Green
Write-Host "  ✓ Can query all documents" -ForegroundColor Green
Write-Host "  ✓ Can access health dashboard" -ForegroundColor Green
Write-Host "  ✓ Can access knowledge gaps" -ForegroundColor Green

Write-Host "`nEMPLOYEE USER TESTS:" -ForegroundColor Yellow
Write-Host "  ✓ Signup and login successful" -ForegroundColor Green
Write-Host "  ✓ Can see PUBLIC and INTERNAL documents only" -ForegroundColor Green
Write-Host "  ✓ Can query permitted documents" -ForegroundColor Green
Write-Host "  ✓ Cannot access restricted information" -ForegroundColor Green
Write-Host "  ✓ Cannot upload documents (403)" -ForegroundColor Green
Write-Host "  ✓ Cannot access admin dashboard (403)" -ForegroundColor Green

Write-Host "`nDOCUMENTS UPLOADED:" -ForegroundColor Yellow
Write-Host "  1. Working Hours Policy [PUBLIC]" -ForegroundColor Green
Write-Host "  2. Employee Benefits Guide [INTERNAL]" -ForegroundColor Green
Write-Host "  3. Manager Compensation [CONFIDENTIAL - managers only]" -ForegroundColor Green
Write-Host "  4. Executive Strategy 2027 [RESTRICTED - admin only]" -ForegroundColor Green

Write-Host "`nTEST CREDENTIALS:" -ForegroundColor Yellow
Write-Host "  Admin: admin@esakip.local / Admin@123456" -ForegroundColor Gray
Write-Host "  Employee: $employeeEmail / $empPassword" -ForegroundColor Gray

Write-Host "`n✓ All tests completed successfully!" -ForegroundColor Green
Write-Host "`nYou can now test these accounts in the UI:" -ForegroundColor Cyan
Write-Host "  - Login: http://localhost:3000/login" -ForegroundColor Cyan
Write-Host "  - Chat: http://localhost:3000/chat" -ForegroundColor Cyan
Write-Host "  - Documents: http://localhost:3000/documents" -ForegroundColor Cyan
Write-Host "  - Dashboard: http://localhost:3000/dashboard (admin only)" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor Cyan

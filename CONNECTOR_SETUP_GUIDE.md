# ESAKIP Connector Setup Guide

## ✅ Quick Start (5 Minutes)

### Prerequisites
- ✅ Backend running at `http://localhost:8000`
- ✅ Sample documents created in `backend/data/connector_root/sample_docs/`
- ✅ User accounts: `admin/admin123` or `user1/user123`

### One-Command Setup

```powershell
cd backend
python setup_directory_connector.py
```

This script will:
1. Login as admin
2. Create a directory connector
3. Sync 3 sample documents
4. Index all content
5. Run test queries
6. Show you how to query via API

---

## Manual Setup (Step by Step)

### Step 1: Start Backend
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

Verify: http://localhost:8000/docs (Swagger UI)

### Step 2: Get Authentication Token

**Option A: Using PowerShell**
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"username":"admin","password":"admin123"}'

$token = $response.access_token
Write-Output "Token: $token"
```

**Option B: Using cURL**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Save the `access_token` from response.

### Step 3: Create Directory Connector

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$body = @{
    name = "Sample Documents"
    kind = "directory"
    source_type = "drive"
    config = @{
        path = "sample_docs"
        recursive = $true
    }
    default_classification = "internal"
    default_allowed_roles = @("admin", "user", "guest")
} | ConvertTo-Json

$connector = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/connectors" `
    -Method Post `
    -Headers $headers `
    -Body $body

Write-Output "Connector ID: $($connector.id)"
```

### Step 4: Sync Connector

```powershell
$syncResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/v1/connectors/$($connector.id)/sync" `
    -Method Post `
    -Headers $headers

Write-Output $syncResponse.stats
```

Expected output:
```json
{
  "created": 3,
  "updated": 0,
  "unchanged": 0,
  "failed": 0,
  "removed": 0
}
```

### Step 5: Verify Documents

```powershell
$docs = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/documents" `
    -Method Get `
    -Headers $headers

Write-Output "Total documents: $($docs.Count)"
$docs | Select-Object title, source_type, classification | Format-Table
```

### Step 6: Test Query

```powershell
$queryBody = @{
    question = "What are the security classifications in ESAKIP?"
    mode = "rag"
} | ConvertTo-Json

$queryResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/v1/query" `
    -Method Post `
    -Headers $headers `
    -Body $queryBody

Write-Output "`nAnswer:"
Write-Output $queryResponse.answer
Write-Output "`nSources: $($queryResponse.sources.Count)"
```

---

## Sample Documents Included

### 1. technical_specs.txt
- Architecture overview
- API endpoints
- Performance metrics
- Deployment options
- Security features

### 2. product_guide.txt
- Product description
- Key features
- Security classifications
- Supported data sources
- Getting started guide

### 3. company_policy.txt
- Work hours policy
- Remote work policy
- Code of conduct
- Data security classifications

---

## Configuration Options

### Connector Schema
```json
{
  "name": "string (2-128 chars)",
  "kind": "directory|sql|confluence|jira|notion|sharepoint|drive|email",
  "source_type": "upload|pdf|sharepoint|confluence|jira|notion|sql|email|drive",
  "config": {
    // Kind-specific configuration
  },
  "default_classification": "public|internal|confidential|restricted",
  "default_allowed_roles": ["role1", "role2", ...] or ["*"],
  "sync_interval_minutes": null or integer >= 5
}
```

### Directory Connector Config
```json
{
  "path": "relative/path/from/connector_root",
  "recursive": true  // Include subdirectories
}
```

### Classification Levels

| Level | Who Can Access | Use Case |
|-------|---------------|----------|
| `public` | Everyone (including anonymous) | Marketing, press releases |
| `internal` | All authenticated users | General company docs |
| `confidential` | Specific roles only | Financial data, customer info |
| `restricted` | Highest sensitivity | Executive, legal documents |

### Role-Based Access

**Wildcard Access:**
```json
"default_allowed_roles": ["*"]  // All authenticated users
```

**Specific Roles:**
```json
"default_allowed_roles": ["admin", "finance", "hr"]
```

**No Access (Override):**
```json
"default_allowed_roles": []  // Only accessible via explicit ACL
```

---

## Advanced: Multiple Connectors

### Example: Separate by Department

**HR Documents:**
```json
{
  "name": "HR Policies",
  "kind": "directory",
  "source_type": "drive",
  "config": {"path": "hr_docs"},
  "default_classification": "confidential",
  "default_allowed_roles": ["admin", "hr"]
}
```

**Public Marketing:**
```json
{
  "name": "Marketing Materials",
  "kind": "directory",
  "source_type": "drive",
  "config": {"path": "marketing"},
  "default_classification": "public",
  "default_allowed_roles": ["*"]
}
```

**Engineering Docs:**
```json
{
  "name": "Engineering Wiki",
  "kind": "directory",
  "source_type": "drive",
  "config": {"path": "engineering"},
  "default_classification": "internal",
  "default_allowed_roles": ["admin", "engineer"]
}
```

---

## Scheduled Sync Setup

### Enable Background Workers

1. **Ensure Redis is configured** (already done ✅)
   ```env
   REDIS_URL=redis://default:Prachi0209@redis-15568.c282.east-us-mz.azure.cloud.redislabs.com:15568
   ```

2. **Enable scheduler in `.env`**
   ```env
   SCHEDULER_ENABLED=true
   ```
   Use this only for a single API process. For horizontally scaled deployments, keep the API
   scheduler disabled and run one dedicated scheduler process.

3. **Start worker process** (in separate terminal)
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   python scripts/worker.py
   ```

4. **Set sync interval when creating connector**
   ```json
   {
     "sync_interval_minutes": 60  // Sync every hour
   }
   ```

### Sync Interval Examples

- `60` = Every hour
- `1440` = Daily (24 hours)
- `10080` = Weekly (7 days)
- `null` or `0` = Manual sync only

---

## Monitoring & Troubleshooting

### Check Connector Status
```powershell
$connectors = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/v1/connectors" `
    -Method Get `
    -Headers $headers

$connectors | Select-Object name, status, last_sync_at, doc_count, last_error | Format-Table
```

Status values:
- `idle` - Never synced
- `syncing` - Currently syncing
- `ok` - Last sync successful
- `error` - Last sync failed

### View Sync Errors
```powershell
$connector = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/v1/connectors/$connectorId" `
    -Method Get `
    -Headers $headers

if ($connector.last_error) {
    Write-Output "Error: $($connector.last_error)"
}
```

### Common Issues

**"Directory does not exist under the connector root"**
- Solution: Create the directory under `backend/data/connector_root/`
- Check: `CONNECTOR_ALLOWED_ROOT=./data/connector_root` in `.env`

**"0 documents synced"**
- Verify files exist in the directory
- Check file extensions are supported (txt, pdf, docx, md, etc.)
- Look at `last_error` for details

**"Access denied when querying"**
- Check user's role matches connector's `default_allowed_roles`
- Verify classification level (user needs appropriate clearance)
- Test with admin user first

**"Chunks not created"**
- Check ingestion logs in backend console
- Verify text extraction worked
- Ensure vector store is running

---

## Next Steps

### ✅ Completed
1. Sample documents created
2. Directory connector ready
3. Setup script available
4. Manual instructions provided

### 🎯 Test Now
1. Run `python backend/setup_directory_connector.py`
2. Verify 3 documents are indexed
3. Test queries via API or frontend

### 🚀 Production Setup
1. **Choose your enterprise source:**
   - SharePoint for Microsoft 365
   - Confluence for Atlassian
   - Google Drive for Google Workspace
   - Or continue with directory for network shares

2. **Gather credentials:**
   - API tokens
   - Client IDs/secrets
   - Service account keys

3. **Create production connector:**
   - Set appropriate classification
   - Configure role-based access
   - Enable scheduled sync

4. **Monitor and iterate:**
   - Check sync stats
   - Verify access controls
   - Test queries from different users

---

## Support

### Documentation
- Full connector guide: See artifact above
- API reference: http://localhost:8000/docs
- RBAC guide: `ADMIN_GUIDE.md`

### Testing
- Pre-configured users:
  - `admin/admin123` (full access)
  - `user1/user123` (standard user)
  - `guest1/guest123` (limited access)

### Evaluation
Run full test suite:
```powershell
cd backend
pytest tests/eval/test_eval_rag.py -v
```

Current baseline: **18/21 tests passing (86%)**
Expected after connector setup: **19-20/21 (90-95%)**

---

## Quick Reference

### API Endpoints
- `POST /api/v1/auth/login` - Get JWT token
- `GET /api/v1/connectors` - List all connectors
- `POST /api/v1/connectors` - Create connector
- `POST /api/v1/connectors/{id}/sync` - Trigger sync
- `DELETE /api/v1/connectors/{id}` - Delete connector
- `GET /api/v1/documents` - List indexed documents
- `POST /api/v1/query` - RAG query

### File Locations
- Connector root: `backend/data/connector_root/`
- Sample docs: `backend/data/connector_root/sample_docs/`
- Setup script: `backend/setup_directory_connector.py`
- Database: `backend/esakip.db`

### Environment Variables
- `CONNECTOR_ALLOWED_ROOT` - Base path for directory connectors
- `SCHEDULER_ENABLED` - Enable automatic scheduled syncs
- `REDIS_URL` - Required for background workers

# Agentvault Administrator Guide

## Table of Contents
1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Configuration](#configuration)
4. [User Management](#user-management)
5. [Data Source Connectors](#data-source-connectors)
6. [Security & Access Control](#security--access-control)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)

---

## Overview

This guide covers administration tasks for Agentvault, an evidence-first enterprise knowledge workspace.

### Administrator Responsibilities

- User account management
- Access control and permissions
- Data source configuration
- System monitoring
- Security compliance
- Performance optimization
- Backup and recovery

---

## Installation & Setup

### Prerequisites

**Backend Requirements:**
- Python 3.11+
- PostgreSQL 14+ (we use Neon for cloud)
- Redis 6+ (we use Redis Cloud)
- Qdrant vector database (we use Qdrant Cloud)

**Frontend Requirements:**
- Node.js 18+
- npm or yarn

### Initial Setup

**1. Clone Repository**
```bash
git clone <repository-url>
cd Agentvault
```

**2. Backend Setup**
```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate  # Windows
# or
source .venv/bin/activate  # Unix/Mac

pip install -r requirements.txt
```

**3. Configure Environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

**4. Database Migration**
```bash
alembic upgrade head
```

**5. Bootstrap Admin Account**
```bash
python -m app.scripts.bootstrap_admin
# Creates admin@esakip.local with password Admin@123456
# CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION
```

**6. Frontend Setup**
```bash
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with backend URL
```

**7. Start Services**
```bash
# Terminal 1 - Backend
cd backend
.venv\Scripts\Activate
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access the application at `http://localhost:3000`

---

## Configuration

### Environment Variables

**Backend (`.env`):**

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/database
REDIS_URL=redis://default:password@host:port

# Vector Store
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your_api_key
QDRANT_COLLECTION=esakip_docs

# LLM Provider (choose one)
LLM_PROVIDER=gemini  # or: openai, anthropic, local
GOOGLE_API_KEY=your_key

# Embedding Provider
EMBEDDING_PROVIDER=gemini  # or: openai, local, hash
EMBEDDING_MODEL=models/text-embedding-004

# Security
SECRET_KEY=<generate-strong-random-key>
RECEIPT_SIGNING_KEY=<generate-another-strong-random-key>
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Monitoring
LOG_LEVEL=INFO
ENABLE_METRICS=true

# Multi-tenancy (optional)
ENABLE_MULTI_TENANT=false
```

**Frontend (`.env.local`):**

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Agentvault
```

### Generating Secure Keys

**JWT Secret:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### LLM Provider Configuration

**Google Gemini (Recommended):**
```bash
LLM_PROVIDER=gemini
GOOGLE_API_KEY=<your-api-key>
LLM_MODEL=gemini-2.5-flash
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=models/text-embedding-004
```

**OpenAI:**
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=<your-api-key>
OPENAI_MODEL=gpt-4-turbo
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-large
```

**Local/Offline (No API keys needed):**
```bash
LLM_PROVIDER=local
EMBEDDING_PROVIDER=hash
# Uses extractive summarization and lexical embeddings
```

---

## User Management

### Creating Admin Accounts

**Via User Management UI:**
1. Log in as existing admin
2. Navigate to User Management
3. Click "Edit" on any user
4. Change role to "admin"
5. Save changes

**Via Database (Emergency):**
```sql
UPDATE users 
SET role = 'admin', clearance_level = 3 
WHERE email = 'user@example.com';
```

### User Roles

**Admin:**
- Full system access
- User management
- Configuration
- All clearance levels

**Employee:**
- Standard user access
- Cannot manage other users
- Clearance level determines data access

### Clearance Levels

| Level | Name | Access |
|-------|------|--------|
| 0 | Public | Public documents only |
| 1 | Internal | Public + internal documents |
| 2 | Confidential | Public + internal + confidential |
| 3 | Restricted | All documents (full access) |

### User Lifecycle

**Onboarding New Users:**
1. User signs up via `/signup` (automatically gets employee role, clearance 0)
2. Admin reviews new account
3. Admin assigns appropriate clearance level
4. Admin may elevate to admin role if needed
5. User receives confirmation (email if configured)

**Modifying Users:**
1. Navigate to User Management
2. Click "Edit" next to user
3. Update role or clearance
4. Save changes
5. Changes take effect immediately

**Offboarding Users:**
1. Navigate to User Management
2. Click "Deactivate" next to user
3. Confirm deactivation
4. User can no longer log in
5. Audit history is preserved

**Reactivating Users:**
1. Navigate to User Management
2. Find deactivated user
3. Click "Reactivate"
4. User can log in again

---

## Data Source Connectors

### Supported Connectors

Agentvault supports multiple data source types:

**File-Based:**
- Local files (txt, pdf, docx, md)
- Network file shares
- Cloud storage (S3, GCS, Azure Blob)

**API-Based:**
- Confluence
- Jira
- Notion
- SharePoint
- Google Drive
- Slack archives

### Adding Data Sources

**1. Local Files:**
```bash
# Place files in backend/data/ directory
# Or configure custom path in .env
DATA_DIR=/path/to/documents
```

**2. API Connectors:**
Edit `backend/.env` to add connector credentials:
```bash
# Confluence
CONFLUENCE_URL=https://your-domain.atlassian.net
CONFLUENCE_USER=admin@example.com
CONFLUENCE_TOKEN=your_api_token

# Jira
JIRA_URL=https://your-domain.atlassian.net
JIRA_USER=admin@example.com
JIRA_TOKEN=your_api_token

# Notion
NOTION_TOKEN=secret_abc123...
```

**3. Trigger Indexing:**
```bash
# Via API
curl -X POST http://localhost:8000/api/v1/admin/index \
  -H "Authorization: Bearer <admin-token>"

# Via CLI
python -m app.scripts.index_documents
```

### Document Classification

Documents should include metadata for access control:

```json
{
  "title": "Q4 Strategy",
  "classification": "confidential",
  "clearance_required": 2,
  "owner": "strategy-team",
  "created_at": "2024-01-15"
}
```

### Scheduled Syncing

**Setup Cron Job:**
```bash
# Linux/Mac - edit crontab
crontab -e

# Add line to sync every 6 hours
0 */6 * * * cd /path/to/backend && .venv/bin/python -m app.scripts.sync_connectors

# Windows - use Task Scheduler
# Create task to run: .venv\Scripts\python.exe -m app.scripts.sync_connectors
```

---

## Security & Access Control

### Access Control Model

Agentvault uses two-layer security:

**1. Role-Based Access Control (RBAC)**
- Admin vs Employee role
- Controls what features users can access

**2. Clearance-Based Access**
- Numeric level (0-3)
- Controls what documents users can retrieve

### Document-Level Security

Each document has:
- **Classification**: public, internal, confidential, restricted
- **Required Clearance**: Minimum clearance to access
- **ACL**: Optional list of specific users/groups allowed

### Security Best Practices

**1. Principle of Least Privilege**
- Give users minimum required clearance
- Review permissions quarterly
- Remove access promptly when users leave

**2. Password Policies**
- Minimum 8 characters
- Require mix of upper, lower, number, special
- Consider enabling MFA (if implemented)

**3. JWT Token Security**
- Use strong secret key (32+ characters)
- Set reasonable expiration (24 hours default)
- Rotate secret keys periodically
- Use HTTPS in production

**4. Database Security**
- Use strong database passwords
- Enable SSL for database connections
- Restrict database access by IP
- Regular backups

**5. API Security**
- Rate limiting enabled by default
- CORS configured properly
- Input validation on all endpoints
- No sensitive data in logs

### Audit & Compliance

**Audit Receipts:**
- Every query generates a signed receipt
- Immutable audit trail
- Can't be deleted or modified
- Includes full question and answer

**Viewing Audit Logs:**
```bash
# Via API
GET /api/v1/receipts?user_id=123&from=2024-01-01

# Via Database
SELECT * FROM receipts 
WHERE user_id = 123 
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC;
```

**Compliance Reports:**
- Export receipts for compliance audits
- Filter by user, date, classification level
- Verify cryptographic signatures
- Track blocked access attempts

---

## Monitoring & Maintenance

### Health Checks

**Application Health:**
```bash
# Check API health
curl http://localhost:8000/api/v1/health

# Should return:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "qdrant": "connected",
  "version": "1.0.0"
}
```

**Dashboard Metrics:**
- Navigate to Health Dashboard (if implemented)
- View system status
- Check response times
- Monitor error rates

### Performance Monitoring

**Key Metrics to Track:**
- Query latency (target: <5 seconds)
- Document retrieval time
- LLM response time
- Cache hit rate
- Error rate
- Blocked queries (may indicate permission issues)

**Database Performance:**
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('esakip'));
```

**Redis Performance:**
```bash
redis-cli INFO stats
redis-cli SLOWLOG GET 10
```

### Maintenance Tasks

**Weekly:**
- Review audit receipts for anomalies
- Check error logs
- Monitor disk space
- Review blocked queries

**Monthly:**
- Review user permissions
- Update dependencies
- Check for security patches
- Optimize database (VACUUM, ANALYZE)

**Quarterly:**
- Full security audit
- Performance optimization
- User access review
- Backup restoration test

### Backup & Recovery

**Database Backup:**
```bash
# PostgreSQL backup
pg_dump -U postgres -d esakip -F c -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -U postgres -d esakip backup_20240115.dump
```

**Vector Store Backup:**
```bash
# Qdrant backup (if using cloud)
# Backups handled by Qdrant Cloud

# Local Qdrant
# Copy data directory: /qdrant/storage/
```

**Configuration Backup:**
```bash
# Backup .env files
cp backend/.env backend/.env.backup
cp frontend/.env.local frontend/.env.local.backup

# Store securely (not in git!)
```

---

## Troubleshooting

### Common Issues

#### Users Can't Access Certain Documents

**Check:**
1. User's clearance level
2. Document classification
3. Review audit receipt for details
4. Verify document ACL if present

**Fix:**
- Increase user clearance if appropriate
- Reclassify document if misclassified
- Update document ACL

#### Slow Query Performance

**Check:**
1. Vector database status
2. Number of documents in collection
3. Network latency to cloud services
4. LLM API response time

**Fix:**
- Optimize vector index settings
- Archive old documents
- Use regional endpoints for cloud services
- Switch to faster LLM model

#### Authentication Errors

**Check:**
1. JWT secret key consistency
2. Token expiration time
3. Database connection
4. Redis connection

**Fix:**
- Ensure JWT_SECRET_KEY same in all environments
- Keep SECRET_KEY and RECEIPT_SIGNING_KEY stable across API replicas
- Adjust ACCESS_TOKEN_EXPIRE_MINUTES if needed
- Restart services
- Clear Redis cache

#### Document Indexing Failures

**Check:**
1. Connector credentials
2. Network access to data source
3. Document format supported
4. Error logs

**Fix:**
- Verify API keys/tokens
- Check firewall rules
- Update connector code for new formats
- Review logs for specific errors

### Log Locations

**Backend Logs:**
```bash
# Console output (development)
python -m uvicorn app.main:app --log-level debug

# File logs (production)
# Configure in backend/app/core/config.py
tail -f logs/esakip.log
```

**Frontend Logs:**
```bash
# Browser console (F12)
# Server logs
npm run dev -- --debug
```

### Getting Help

- Review error messages in logs
- Check health endpoint: `/api/v1/health`
- Review documentation
- Contact support team

---

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide covering:
- AWS deployment
- Docker containerization
- Kubernetes orchestration
- CI/CD setup
- Production security
- Monitoring and alerts
- Scaling strategies

### Quick Production Checklist

- [ ] Change default admin password
- [ ] Generate strong JWT secret
- [ ] Configure production database
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure monitoring
- [ ] Set up log aggregation
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set proper environment variables
- [ ] Test disaster recovery
- [ ] Document runbook
- [ ] Train operations team

---

## Appendix: CLI Commands

### User Management
```bash
# Create admin user
python -m app.scripts.create_user --email admin@example.com --role admin --clearance 3

# List all users
python -m app.scripts.list_users

# Deactivate user
python -m app.scripts.deactivate_user --email user@example.com
```

### Data Management
```bash
# Index documents
python -m app.scripts.index_documents --source /path/to/docs

# Sync connectors
python -m app.scripts.sync_connectors --connector confluence

# Clear vector store
python -m app.scripts.clear_vectorstore --confirm
```

### Database
```bash
# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback migration
alembic downgrade -1
```

---

*Last Updated: 2026-09-28*
*Version: 1.0*

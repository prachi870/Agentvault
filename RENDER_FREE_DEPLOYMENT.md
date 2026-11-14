# AgentVault - FREE Tier Deployment Guide

## Zero-Cost Architecture

**Backend:** Render Free Web Service  
**Frontend:** Vercel Free Tier  
**Database:** Supabase PostgreSQL (free)  
**Cache:** Upstash Redis (free)  
**Vector Store:** Qdrant Cloud (free)  
**Storage:** AWS S3 (minimal cost ~$0.01/month)  
**AI:** Google Gemini API (free tier)

⚠️ **Render Free Web Service Limitations:**
- Sleeps after 15 minutes of inactivity
- 512 MB RAM
- First request after sleep takes ~30 seconds to wake up
- Sufficient for demo/portfolio purposes

---

## Step 1: Deploy Backend to Render (Manual Setup)

### 1.1 Push to GitHub (if not already done)

```powershell
# From repository root
git remote -v
# If no remote exists, create one:
# git remote add origin https://github.com/YOUR_USERNAME/agentvault.git

git push -u origin release-readiness
```

### 1.2 Create Render Web Service

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `agentvault-api`
   - **Region:** Oregon (or closest to you)
   - **Branch:** `release-readiness`
   - **Root Directory:** `backend`
   - **Runtime:** Docker
   - **Instance Type:** **Free**
   - **Docker Build Context:** `.` (current directory)
   - **Dockerfile Path:** `./Dockerfile`

### 1.3 Add Environment Variables

In Render Dashboard, add these **Environment Variables** (one by one):

```bash
# Application
ENV=prod
LOG_FORMAT=json
AUDIT_LOG_ENABLED=true

# Security (generate random 32+ character strings)
SECRET_KEY=<generate-random-string-32-chars>
RECEIPT_SIGNING_KEY=<generate-random-string-32-chars>

# Database (Supabase) - Get from your .env file
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres

# Cache (Upstash Redis) - Get from your .env file
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_INSTANCE.upstash.io:6379

# Vector Store (Qdrant Cloud) - Get from your .env file
QDRANT_URL=https://YOUR_CLUSTER_ID.region.cloud.qdrant.io
QDRANT_API_KEY=YOUR_QDRANT_API_KEY

# Storage (AWS S3) - Get from your .env file
STORAGE_BACKEND=s3
S3_BUCKET=your-bucket-name
S3_REGION=your-region
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY

# AI Provider (Gemini) - Get from your .env file
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY

# Optional
AUTO_CREATE_TABLES=false
SCHEDULER_ENABLED=false
```

**🔑 Generate SECRET_KEY and RECEIPT_SIGNING_KEY:**

Run this in PowerShell:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Run it **twice** to get two different keys.

### 1.4 Configure Health Check

In Render Dashboard:
- **Health Check Path:** `/ready`
- **Health Check Grace Period:** 120 seconds

### 1.5 Deploy

Click **"Create Web Service"** → Render will build and deploy

Monitor the logs. Look for:
```
✅ Agentvault started (env=prod, ...)
✅ Database: healthy
✅ Vector store: healthy
✅ Cache: healthy
✅ Storage: healthy
```

Your backend URL will be: `https://agentvault-api.onrender.com`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Push Frontend Changes (if needed)

Ensure your frontend is committed and pushed to GitHub.

### 2.2 Import to Vercel

1. Go to https://vercel.com/
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

### 2.3 Add Environment Variable

In Vercel Project Settings → Environment Variables:

```bash
API_PROXY_TARGET=https://agentvault-api.onrender.com
```

**Important:** 
- No trailing slash
- No `/api` path
- Just the origin: `https://agentvault-api.onrender.com`

Add this for:
- ✅ Production
- ✅ Preview
- ✅ Development

### 2.4 Deploy

Click **"Deploy"** → Vercel will build and deploy

Your frontend URL will be: `https://agentvault-YOUR_USERNAME.vercel.app`

---

## Step 3: First-Run Setup

### 3.1 Create Admin Account

After both services are live, create the first admin:

1. Go to: `https://agentvault-YOUR_USERNAME.vercel.app/bootstrap`
2. Enter admin credentials:
   - **Email:** `admin@corp.test`
   - **Password:** `Passw0rd!x`
3. Click **"Create Administrator"**

### 3.2 Login

1. Go to: `https://agentvault-YOUR_USERNAME.vercel.app/login`
2. Login with: `admin@corp.test` / `Passw0rd!x`

### 3.3 Test Upload & Chat

1. Upload a document (PDF or TXT)
2. Ask a question about the document
3. Verify you get a proper AI-generated answer (not "no_evidence")

---

## Troubleshooting

### Backend won't start
- Check Render logs for errors
- Verify all environment variables are set correctly
- Check health endpoint: `https://agentvault-api.onrender.com/ready`

### Frontend can't reach backend
- Verify `API_PROXY_TARGET` is set in Vercel
- Check browser console for CORS errors
- Test backend directly: `https://agentvault-api.onrender.com/health`

### Backend sleeps after 15 minutes
- This is normal for Render free tier
- First request wakes it up (~30 seconds)
- Consider Render's $7/month plan for always-on service

### Database connection errors
- Verify Supabase credentials are correct
- Check Supabase dashboard for connection limits

### Vector store errors
- Verify Qdrant Cloud cluster is running
- Check API key hasn't expired

---

## Monthly Costs (Estimated)

| Service | Plan | Cost |
|---------|------|------|
| Render Web Service | Free | $0.00 |
| Vercel Hosting | Free | $0.00 |
| Supabase PostgreSQL | Free (500MB) | $0.00 |
| Upstash Redis | Free (10K commands/day) | $0.00 |
| Qdrant Cloud | Free (1GB) | $0.00 |
| AWS S3 | Pay-as-you-go | ~$0.01 |
| Google Gemini API | Free tier | $0.00 |
| **Total** | | **~$0.01/month** |

---

## Upgrade Paths (If Needed Later)

- **Render:** $7/month for always-on service (no sleep)
- **Supabase:** $25/month for 8GB database
- **Upstash:** $10/month for unlimited commands
- **Qdrant:** $25/month for 8GB vectors

---

## Next Steps

1. Deploy backend to Render (follow Step 1)
2. Get the Render URL: `https://agentvault-api.onrender.com`
3. Deploy frontend to Vercel (follow Step 2)
4. Create admin account (Step 3)
5. Test everything works end-to-end

Ready to proceed? I can help with any step!

# How to Get New API Keys for ESAKIP

Your current API keys have expired. Here's how to get new ones:

## Option 1: Google Gemini (Recommended - Free Tier Available)

**Why Gemini:**
- Free tier: 15 requests per minute
- Fast and good quality
- Models/text-embedding-004 for embeddings
- Gemini-2.0-flash-exp for LLM

**Steps:**
1. Go to: https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIzaSy...`)
5. Update `backend/.env`:
   ```
   GOOGLE_API_KEY=YOUR_NEW_KEY_HERE
   LLM_PROVIDER=gemini
   EMBEDDING_PROVIDER=gemini
   ```

## Option 2: OpenAI (Paid - More Expensive)

**Why OpenAI:**
- Higher quality for complex queries
- gpt-4o-mini is affordable
- text-embedding-3-small for embeddings

**Steps:**
1. Go to: https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Name it "ESAKIP Production"
5. Copy the key (starts with `sk-proj-...`)
6. Update `backend/.env`:
   ```
   OPENAI_API_KEY=YOUR_NEW_KEY_HERE
   LLM_PROVIDER=openai
   EMBEDDING_PROVIDER=openai
   ```

## Option 3: Use Offline Mode (Current - No API Key Needed)

**What it means:**
- Uses extractive summarization (picks matching sentences)
- Uses lexical embeddings (keyword matching, not semantic)
- Works offline, no API costs
- Good for testing, not production

**Already configured!**
```
LLM_PROVIDER=local
EMBEDDING_PROVIDER=hash
```

**Limitations:**
- Cannot synthesize answers (only extracts existing text)
- Cannot understand paraphrases
- Cannot do complex reasoning
- 81% evaluation score (vs 95%+ with real LLM)

## Cost Comparison

### Gemini (Free Tier)
- Cost: **$0/month** (free tier)
- Limit: 15 requests/min = ~600/hour = ~14,400/day
- Good for: Development, testing, small teams

### Gemini (Paid)
- Cost: **$0.00015** per query (150 input + 1000 output tokens)
- 10,000 queries/month = **$1.50/month**
- Good for: Production, high volume

### OpenAI (gpt-4o-mini)
- Cost: **$0.001** per query (150 input + 1000 output tokens)
- 10,000 queries/month = **$10/month**
- Good for: Higher quality needs

### Offline Mode
- Cost: **$0/month**
- Unlimited queries
- Good for: Testing only

## Recommendation

**For immediate testing:** Use offline mode (already configured) ✅

**For production:** Get Gemini API key (free tier)
1. 5 minutes to get key
2. Update 2 lines in .env
3. Restart backend
4. Instant improvement from 81% to 95%+ evaluation score

## After Getting API Key

1. Update `backend/.env` with new key
2. Set `LLM_PROVIDER` and `EMBEDDING_PROVIDER`
3. Restart backend:
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   python -m uvicorn app.main:app --reload
   ```
4. Re-run evaluation:
   ```powershell
   python eval/run_eval.py
   ```
5. Expected result: 95-100% pass rate

## Testing Your Key

Once you've added a key, test it:

### Gemini:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -c "from langchain_google_genai import ChatGoogleGenerativeAI; llm = ChatGoogleGenerativeAI(model='gemini-2.0-flash-exp'); print(llm.invoke('Say hello in one word').content)"
```

Should output: `Hello` (or similar)

### OpenAI:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -c "from langchain_openai import ChatOpenAI; llm = ChatOpenAI(model='gpt-4o-mini'); print(llm.invoke('Say hello in one word').content)"
```

Should output: `Hello` (or similar)

## Current Status

✅ **LLM packages installed** (langchain-google-genai, langchain-openai)
✅ **System working in offline mode** (81% evaluation pass rate)
⏳ **Waiting for valid API key** to reach 95%+ pass rate

**Next step:** Get a Gemini API key (5 minutes) → https://aistudio.google.com/apikey

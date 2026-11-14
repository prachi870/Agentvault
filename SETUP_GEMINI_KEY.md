# Configure a Gemini API key

1. Create a key in [Google AI Studio](https://aistudio.google.com/apikey).
2. For local development, set `GOOGLE_API_KEY` in the ignored `backend/.env` file.
3. Keep `LLM_PROVIDER=gemini` and `EMBEDDING_PROVIDER=gemini` in the local environment. The
   default Gemini embedding model is `gemini-embedding-001`.
4. Restart the backend after changing the environment.

Never paste API keys into source files, documentation, screenshots, or commits. For production,
set `GOOGLE_API_KEY` as a secret environment variable on both Render services (`agentvault-api` and
`agentvault-worker`). Rotate any key that was previously copied into a tracked or shared file.

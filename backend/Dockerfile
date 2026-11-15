FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PORT=8000
WORKDIR /srv

COPY requirements.txt requirements-llm.txt requirements-workers.txt ./
RUN pip install -r requirements.txt -r requirements-llm.txt -r requirements-workers.txt

COPY app ./app
COPY scripts ./scripts
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic
RUN useradd --system --uid 10001 esakip && mkdir -p /srv/data && chown -R esakip /srv
USER esakip

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD python -c 'import os, urllib.request; urllib.request.urlopen("http://127.0.0.1:%s/health" % os.getenv("PORT", "8000"))' || exit 1
CMD ["sh", "scripts/start.sh"]

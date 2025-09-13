FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt ./
COPY risk_rules.yaml ./risk_rules.yaml
RUN pip install --upgrade pip && pip install -r requirements.txt
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini
ENV PORT=8080
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
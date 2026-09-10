FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system ingestor && adduser --system --ingroup ingestor ingestor

COPY pyproject.toml ./
COPY fab_ingestor ./fab_ingestor

RUN pip install .

USER ingestor

ENTRYPOINT ["python", "-m", "fab_ingestor"]
CMD ["sync-all"]

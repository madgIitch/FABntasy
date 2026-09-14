FROM python:3.12-slim AS runtime

ARG VCS_REF=unknown
LABEL org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.source="https://github.com/fabntasy/fabntasy"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 10001 ingestor && \
    adduser --system --uid 10001 --ingroup ingestor ingestor && \
    mkdir -p /var/lib/canastio && \
    chown 10001:10001 /var/lib/canastio

COPY pyproject.toml ./
COPY fab_ingestor ./fab_ingestor

RUN pip install .

USER ingestor

ENTRYPOINT ["python", "-m", "fab_ingestor"]
CMD ["run-production"]
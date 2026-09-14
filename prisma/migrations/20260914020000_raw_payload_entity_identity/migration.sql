CREATE UNIQUE INDEX IF NOT EXISTS
"raw_fab_payloads_endpoint_entity_type_external_id_checksum_key"
ON "raw_fab_payloads"(
    "endpoint",
    "entity_type",
    "external_id",
    "checksum"
);
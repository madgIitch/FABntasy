from fab_ingestor.raw_payload import canonical_payload, sanitize_payload


def test_sanitize_payload_removes_secrets_recursively():
    payload = {
        "key": "top-secret",
        "result": [{"id_dispositivo": "device", "Name": "Team"}],
        "nested": {"TOKEN": "token", "value": 3},
        "password": "password",
    }

    assert sanitize_payload(payload) == {
        "result": [{"Name": "Team"}],
        "nested": {"value": 3},
    }


def test_checksum_is_stable_after_sanitizing_secrets():
    first_payload, first_checksum = canonical_payload({"value": 1, "key": "first"})
    second_payload, second_checksum = canonical_payload({"key": "second", "value": 1})

    assert first_payload == second_payload == {"value": 1}
    assert first_checksum == second_checksum

import pytest

from fab_ingestor.selection import CategorySelectionError, resolve_current_category_id


class Repository:
    def competition_search_terms(self, category_id):
        assert category_id == "9955"
        return ["1ª SENIOR PROV. MASCULINA 26/27"]


class Client:
    def __init__(self, results):
        self.results = results
        self.queries = []

    def search_category(self, query):
        self.queries.append(query)
        return self.results.get(query, [])


def test_selection_uses_current_device_handle_and_stable_id():
    client = Client({"1ª SENIOR PROV. MASCULINA 26/27": [
        {"IdCompeticionCategoria": 10027, "Id": "wrong-league"},
        {"IdCompeticionCategoria": 9955, "Id": "current-device"},
    ]})
    assert resolve_current_category_id(client, Repository(), "9955") == "current-device"
    assert client.queries == ["1ª SENIOR PROV. MASCULINA 26/27"]


def test_selection_fails_closed_on_missing_or_ambiguous_handle():
    with pytest.raises(CategorySelectionError):
        resolve_current_category_id(Client({}), Repository(), "9955")
    with pytest.raises(CategorySelectionError):
        resolve_current_category_id(Client({"1ª SENIOR PROV. MASCULINA 26/27": [
            {"IdCompeticionCategoria": 9955, "Id": "one"},
            {"IdCompeticionCategoria": 9955, "Id": "two"},
        ]}), Repository(), "9955")

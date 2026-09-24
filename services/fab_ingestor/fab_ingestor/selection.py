from __future__ import annotations

from .client import FabClient, FabResponseError
from .repository import SportsRepository


class CategorySelectionError(FabResponseError):
    code = "FAB_CATEGORY_ID_UNRESOLVED"


def resolve_current_category_id(
    client: FabClient, repository: SportsRepository, category_competition_id: str
) -> str:
    """Resolve FAB's device-bound handle, retaining the stable category ID as identity."""
    terms = repository.competition_search_terms(category_competition_id)
    # A stored opaque ID belongs to the device that discovered it. Never replay it
    # from another worker or after credentials have been renewed.
    for term in [*terms, ""]:
        matches = {
            str(item.get("Id"))
            for item in client.search_category(term)
            if str(item.get("IdCompeticionCategoria")) == category_competition_id
            and item.get("Id") is not None
        }
        if len(matches) == 1:
            return next(iter(matches))
        if len(matches) > 1:
            raise CategorySelectionError("FAB category search returned ambiguous identifiers")
    raise CategorySelectionError("FAB category could not be resolved for this device")

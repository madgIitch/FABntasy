import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeagueSeasonPicker } from "./league-season-picker";

describe("league season picker", () => {
  const seasons = [{ id: "a", label: "Sevilla · 2026/27" }, { id: "b", label: "Cádiz · 2026/27" }];

  it("shows selected editions and the calendar anchor", () => {
    const markup = renderToStaticMarkup(<LeagueSeasonPicker seasons={seasons} selectedIds={["a", "b"]} primaryId="b" onChange={() => undefined} />);
    expect(markup).toContain("Competiciones de los jugadores");
    expect(markup).toContain("Competición principal");
    expect(markup).toContain("Su calendario define las jornadas de la liga.");
    expect(markup.match(/type="checkbox"/g)).toHaveLength(2);
  });

  it("explains why creation is unavailable without eligible editions", () => {
    const markup = renderToStaticMarkup(<LeagueSeasonPicker seasons={[]} selectedIds={[]} primaryId="" onChange={() => undefined} />);
    expect(markup).toContain("No hay competiciones Fantasy habilitadas");
  });
});

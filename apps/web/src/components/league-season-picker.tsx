"use client";
import React from "react";

type Season = { id: string; label: string };

export function LeagueSeasonPicker({ seasons, selectedIds, primaryId, onChange }: {
  seasons: Season[];
  selectedIds: string[];
  primaryId: string;
  onChange: (selectedIds: string[], primaryId: string) => void;
}) {
  function toggle(id: string, checked: boolean) {
    const next = checked ? [...selectedIds, id] : selectedIds.filter(value => value !== id);
    onChange(next, next.includes(primaryId) ? primaryId : next[0] ?? "");
  }
  return <fieldset className="ui-field">
    <legend>Competiciones de los jugadores</legend>
    {seasons.length === 0 ? <p>No hay competiciones Fantasy habilitadas para crear una liga.</p> : null}
    {seasons.map(season => <label key={season.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <input type="checkbox" checked={selectedIds.includes(season.id)} onChange={event => toggle(season.id, event.target.checked)} />
      <span>{season.label}</span>
    </label>)}
    {selectedIds.length > 1 ? <label>Competición principal
      <select value={primaryId} onChange={event => onChange(selectedIds, event.target.value)}>
        {seasons.filter(season => selectedIds.includes(season.id)).map(season => <option key={season.id} value={season.id}>{season.label}</option>)}
      </select>
      <small>Su calendario define las jornadas de la liga.</small>
    </label> : null}
  </fieldset>;
}

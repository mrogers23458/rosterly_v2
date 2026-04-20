"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import type { EventAvailability, TeamEvent } from "@/lib/constants/events";
import type { GameLineup, LineupEntry, Player, Roster, Team } from "@/lib/constants/teams";

type Props = {
  lineup:        GameLineup;
  entries:       LineupEntry[];
  team:          Team   | null;
  roster:        Roster | null;
  event:         TeamEvent | null;
  rosterPlayers: Player[];
  availability:  EventAvailability[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// Map player names in lineup entries to actual player objects for bench logic
function buildBenchPlayers(
  rosterPlayers: Player[],
  entries:       LineupEntry[],
  availability:  EventAvailability[],
): Player[] {
  const inLineupNames = new Set(
    entries.map((e) => e.player_name.toLowerCase().trim()),
  );
  const inLineupJerseys = new Set(
    entries.map((e) => e.jersey_number?.trim()).filter(Boolean),
  );
  const availMap = Object.fromEntries(availability.map((a) => [a.player_id, a.status]));

  return rosterPlayers.filter((p) => {
    const name    = `${p.first_name} ${p.last_name}`.toLowerCase();
    const inEntry = inLineupNames.has(name) || (p.jersey_number && inLineupJerseys.has(p.jersey_number));
    const status  = availMap[p.id];
    // Bench = not in batting order AND not marked unavailable
    return !inEntry && status !== "unavailable";
  });
}

const POSITION_COLORS: Record<string, string> = {
  P:     "#fee2e2",   // rose-100
  C:     "#ffedd5",   // orange-100
  "1B":  "#e0f2fe",   // sky-100
  "2B":  "#e0f2fe",
  SS:    "#e0f2fe",
  "3B":  "#e0f2fe",
  LF:    "#d1fae5",   // emerald-100
  CF:    "#d1fae5",
  RF:    "#d1fae5",
  Bench: "#f3f4f6",   // gray-100
};

const POSITION_TEXT: Record<string, string> = {
  P:     "#991b1b",
  C:     "#9a3412",
  "1B":  "#0369a1",
  "2B":  "#0369a1",
  SS:    "#0369a1",
  "3B":  "#0369a1",
  LF:    "#065f46",
  CF:    "#065f46",
  RF:    "#065f46",
  Bench: "#6b7280",
};

function PosBadge({ pos }: { pos: string }) {
  const bg   = POSITION_COLORS[pos] ?? "#f3f4f6";
  const text = POSITION_TEXT[pos]   ?? "#374151";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 36, padding: "2px 5px",
      background: bg, color: text,
      borderRadius: 4, fontSize: 11, fontWeight: 700, lineHeight: 1,
      fontFamily: "monospace",
    }}>
      {pos}
    </span>
  );
}

// ── Main printable card ───────────────────────────────────────────────────────

export function LineupPrintCard({
  lineup, entries, team, roster, event, rosterPlayers, availability,
}: Props) {
  const benchPlayers   = buildBenchPlayers(rosterPlayers, entries, availability);
  const inningCount    = lineup.inning_count;
  const innRange       = Array.from({ length: inningCount }, (_, i) => i);
  const showOpponent   = event && (event.type === "game" || event.type === "scrimmage");
  const gameDate       = event?.event_date ?? lineup.game_date;

  return (
    <>
      {/* ── Screen-only controls (hidden when printing) ── */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-3 print:hidden">
        <Link
          href={`/lineups/${lineup.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to lineup
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            US Letter · Best printed landscape for 6+ innings
          </span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* ── Print canvas ── */}
      <div
        className="mx-auto max-w-[10in] px-6 py-6 print:px-4 print:py-3"
        style={{ fontFamily: "'Arial', sans-serif" }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          borderBottom: "2px solid #1e293b", paddingBottom: 12, marginBottom: 14,
        }}>
          {/* Team logo */}
          {team?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logo_url} alt={team.name} style={{ height: 56, width: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
          ) : (
            <div style={{
              height: 56, width: 56, borderRadius: 8, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#1e293b", color: "#fff",
              fontSize: 22, fontWeight: 800,
            }}>
              {team?.name?.charAt(0) ?? "?"}
            </div>
          )}

          {/* Team + game info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
              {team?.name ?? "Team"}
              {showOpponent && event?.opponent && (
                <span style={{ fontWeight: 400, color: "#475569" }}> vs. {event.opponent}</span>
              )}
            </div>
            <div style={{ marginTop: 4, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12, color: "#475569" }}>
              {gameDate && (
                <span><strong>Date:</strong> {fmt(gameDate)}</span>
              )}
              {event?.start_time && (
                <span><strong>Time:</strong> {fmtTime(event.start_time)}</span>
              )}
              {event?.location && (
                <span><strong>Field:</strong> {event.location}</span>
              )}
              {showOpponent && (
                <span style={{
                  fontWeight: 700,
                  color: event?.is_home ? "#0369a1" : "#6b7280",
                  background: event?.is_home ? "#e0f2fe" : "#f3f4f6",
                  padding: "1px 8px", borderRadius: 12, fontSize: 11,
                }}>
                  {event?.is_home ? "Home" : "Away"}
                </span>
              )}
              {roster && <span><strong>Roster:</strong> {roster.name}</span>}
              <span><strong>Innings:</strong> {inningCount}</span>
            </div>
          </div>

          {/* Lineup name top-right */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Lineup</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{lineup.name}</div>
          </div>
        </div>

        {/* Batting order table */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#64748b", marginBottom: 6 }}>
            Batting Order — {entries.length} Players
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#1e293b", color: "#fff" }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Jersey</th>
                <th style={{ ...thStyle, textAlign: "left", minWidth: 130 }}>Player Name</th>
                {innRange.map((i) => (
                  <th key={i} style={{ ...thStyle, minWidth: 46 }}>Inn.{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
                    {idx + 1}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", color: "#64748b" }}>
                    {entry.jersey_number || "—"}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#0f172a" }}>
                    {entry.player_name}
                  </td>
                  {innRange.map((i) => (
                    <td key={i} style={{ ...tdStyle, textAlign: "center", padding: "4px 3px" }}>
                      <PosBadge pos={entry.innings[i] ?? "Bench"} />
                    </td>
                  ))}
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={3 + inningCount}
                    style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}
                  >
                    No players in this lineup.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Position key */}
        <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginRight: 4 }}>
            Key:
          </span>
          {["P","C","1B","2B","SS","3B","LF","CF","RF","Bench"].map((pos) => (
            <span key={pos} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <PosBadge pos={pos} /> <span style={{ color: "#64748b" }}>{pos}</span>
            </span>
          ))}
        </div>

        {/* Bench / Available players */}
        {benchPlayers.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#64748b", marginBottom: 6 }}>
              Available / Bench ({benchPlayers.length})
            </div>
            <div style={{
              border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px",
              display: "flex", flexWrap: "wrap", gap: 8,
            }}>
              {benchPlayers.map((p) => (
                <span key={p.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 5, padding: "3px 10px", fontSize: 12,
                }}>
                  {p.jersey_number && (
                    <span style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 11 }}>
                      #{p.jersey_number}
                    </span>
                  )}
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    {p.preferred_name?.trim() || `${p.first_name} ${p.last_name}`}
                  </span>
                  {p.primary_positions?.length > 0 && (
                    <span style={{ color: "#64748b", fontSize: 10 }}>
                      ({p.primary_positions.slice(0, 2).join("/")})
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {lineup.notes && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#64748b", marginBottom: 6 }}>
              Notes
            </div>
            <div style={{
              border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px",
              fontSize: 12, color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.5,
            }}>
              {lineup.notes}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          borderTop: "1px solid #e2e8f0", paddingTop: 8,
          display: "flex", justifyContent: "space-between",
          fontSize: 10, color: "#94a3b8",
        }}>
          <span>Generated by Rosterly · {new Date().toLocaleDateString()}</span>
          <span>
            {entries.length} batters · {inningCount} innings
            {benchPlayers.length > 0 && ` · ${benchPlayers.length} bench`}
          </span>
        </div>
      </div>

      {/* Print-specific global styles */}
      <style>{`
        @media print {
          @page { margin: 0.5in; size: letter landscape; }
          body  { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}

// ── Shared cell styles ────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "7px 8px", textAlign: "center",
  fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
  borderRight: "1px solid #334155",
};

const tdStyle: React.CSSProperties = {
  padding: "5px 8px",
  borderBottom: "1px solid #f1f5f9",
  borderRight: "1px solid #f1f5f9",
};

// ─────────────────────────────────────────────────────────────
// data.js — aircraft families, data helpers, currency maths
// ─────────────────────────────────────────────────────────────

// ── Aircraft family classification ───────────────────────────
// Maps ICAO type codes to human-readable family names and a
// colour used in the flying currency tab.
//
// Patterns are tested in order — the first match wins, so more
// specific patterns should come before broader ones.

const FAMILIES = {
  "Airbus A220 family": { pat: /^(A21[89]|BCS)/,                        color: "#38bdf8" },
  "Airbus A320 family": { pat: /^(A31[89]|A32[01234])/,                 color: "#3b9eff" },
  "Airbus A330 family": { pat: /^(A33[02346])/,                          color: "#6366f1" },
  "Airbus A350 family": { pat: /^(A35[0-9K])/,                          color: "#06b6d4" },
  "Airbus A380":        { pat: /^(A38)/,                                 color: "#0ea5e9" },
  "Boeing 737 family":  { pat: /^(B73[0-9]|B737)/,                      color: "#f59e0b" },
  "Boeing 747 family":  { pat: /^(B74[0-9])/,                           color: "#f97316" },
  "Boeing 767 family":  { pat: /^(B76[0-9])/,                           color: "#84cc16" },
  "Boeing 777 family":  { pat: /^(B77[0-9LW])/,                         color: "#22c55e" },
  "Boeing 787 family":  { pat: /^(B78[0-9])/,                           color: "#10b981" },
  "McDonnell Douglas":  { pat: /^(MD[0-9]|DC[0-9])/,                    color: "#ef4444" },
  "Cessna Citation":    { pat: /^(C5[56789]|C65|C68|C70|C75)/,          color: "#ec4899" },
  "TBM":                { pat: /^(TBM)/,                                 color: "#a855f7" },
  "Cessna / Piper GA":  { pat: /^(C1[0-9][0-9]|C2[0-9][0-9]|PA[0-9]|SR[0-9])/, color: "#14b8a6" },
  "Helicopter":         { pat: /^(H[0-9]|EC[0-9]|AS[0-9]|AW[0-9]|R[0-9][0-9])/, color: "#f43f5e" },
  "Turboprop":          { pat: /^(F40[0-9]|ATR|DH8|E17[0-9])/,         color: "#78716c" },
  "Military / Heavy":   { pat: /^(C17|C130|C5|KC)/,                     color: "#6b7280" },
  "Other":              { pat: /./,                                      color: "#6b7280" },
};

// Classifies an ICAO type code (e.g. "B738") into a family name.
// Returns null if code is falsy; "Other" if nothing else matches.
function classifyAc(code) {
  if (!code) return null;
  const c = code.toUpperCase().replace(/\/.*$/, "").trim();
  for (const [name, { pat }] of Object.entries(FAMILIES)) {
    if (pat.test(c)) return name;
  }
  return "Other";
}

// ── ATC callsign helpers ──────────────────────────────────────

// Normalises a raw ATC callsign to a stable position key.
// - Strips observer, ATIS, FSS, and supervisor suffixes
// - Keeps full CTR callsigns as-is (LON_E_CTR ≠ LON_W_CTR)
// - Strips numeric suffixes from other positions (EGCC_1_APP → EGCC_APP)
function normCS(cs) {
  if (!cs) return null;
  cs = cs.toUpperCase().trim();
  if (["_OBS", "_ATIS", "_FSS", "_SUP"].some((s) => cs.endsWith(s))) return null;
  if (cs.endsWith("_CTR")) return cs;
  return cs.replace(/_\d+_/, "_").replace(/_\d+$/, "");
}

// Returns the position type string from a normalised callsign key.
function posType(k) {
  if (!k) return null;
  if (k.endsWith("_DEL")) return "DEL";
  if (k.endsWith("_GND")) return "GND";
  if (k.endsWith("_TWR")) return "TWR";
  if (k.endsWith("_APP")) return "APP";
  if (k.endsWith("_CTR")) return "CTR";
  return "OTHER";
}

// Returns a human-readable label for a normalised callsign key.
// e.g. "LON_E_CTR" → "LON E CTR", "EGCC_APP" → "EGCC APP"
function posLabel(k) {
  const parts = k.split("_");
  const type  = parts[parts.length - 1];
  if (type === "CTR" && parts.length > 2) {
    return parts.slice(0, -1).join(" ") + " CTR";
  }
  return `${parts[0]} ${type}`;
}

// Sort order for position types in the type filter / sort
const TORD = { DEL: 0, GND: 1, TWR: 2, APP: 3, CTR: 4, OTHER: 5 };

// ── ATC data builders ─────────────────────────────────────────

// Parses raw ATC API response items into a flat array of session objects.
// The API wraps session data inside a connection_id sub-object.
function parseAtcItems(items) {
  return items
    .map((item) => {
      const c = item.connection_id || item;
      return {
        id:       String(c.id || `${c.callsign}_${c.start}`),
        callsign: c.callsign,
        start:    c.start,
        end:      c.end,
        dm:       (new Date(c.end) - new Date(c.start)) / 60000,
      };
    })
    .filter((s) => s.callsign && s.start && s.end && s.dm >= 1);
}

// Groups a flat array of ATC sessions into a map keyed by normalised
// position key. Filters out non-ATC callsigns (OBS, ATIS, etc.).
// Returns { [positionKey]: session[] }
function buildPositions(sessions) {
  const map = {};
  for (const s of sessions) {
    const key  = normCS(s.callsign);
    if (!key) continue;
    const type = posType(key);
    if (!type || type === "OTHER") continue;
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  return map;
}

// ── Flying data builders ──────────────────────────────────────

// Groups enriched pilot sessions into aircraft families.
// Sessions without a family (no matched aircraft type) are excluded.
// Families are sorted by total all-time hours descending.
function buildFamilies(sessions) {
  const map = {};
  for (const s of sessions) {
    if (!s.family) continue;
    if (!map[s.family]) {
      map[s.family] = { family: s.family, sessions: [], types: {} };
    }
    map[s.family].sessions.push(s);
    if (!map[s.family].types[s.ac]) map[s.family].types[s.ac] = [];
    map[s.family].types[s.ac].push(s);
  }
  return Object.values(map).sort(
    (a, b) =>
      b.sessions.reduce((x, s) => x + s.dm, 0) -
      a.sessions.reduce((x, s) => x + s.dm, 0)
  );
}

// ── Date / time helpers ───────────────────────────────────────

// Returns the start and end dates of the current VATSIM fixed calendar
// quarter (Q1 Jan–Mar, Q2 Apr–Jun, Q3 Jul–Sep, Q4 Oct–Dec).
function getQtr(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const q = Math.floor(m / 3);
  const starts = [new Date(y, 0, 1), new Date(y, 3, 1), new Date(y, 6, 1), new Date(y, 9, 1)];
  const ends   = [new Date(y, 3, 1), new Date(y, 6, 1), new Date(y, 9, 1), new Date(y + 1, 0, 1)];
  return { start: starts[q], end: ends[q] };
}

const daysUntil = (d) => Math.ceil((d - new Date()) / 86400000);
const daysAgo   = (d) => Math.floor((new Date() - d) / 86400000);

// Formats a Date as "12 Jun 2025" or short "12 Jun"
function fmtDate(d, short = false) {
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", short
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" }
  );
}

// Formats a duration in minutes as "2h 30m" or "2h"
function fmtH(m) {
  const h  = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return mm > 0 ? `${h}h ${mm}m` : `${h}h`;
}

// ── Currency calculation ──────────────────────────────────────
//
// Core rolling-window currency algorithm.
//
// Given a set of sessions and a rule (reqH hours within rollD days):
//
//   CURRENT  — required hours met; expiry > warnD days away
//   WARNING  — required hours met; expiry <= warnD days away
//   LAPSED   — required hours not met within the current window
//
// For current/warning: finds the "anchor" session — the oldest session
// within the window whose cumulative hours tip the total over the
// threshold. Expiry = anchor.start + rollD days.
//
// For lapsed: scans all historical windows to find the most recent
// period where currency was met, and records that window's expiry
// as lapseDate.

function calcRolling(sessions, reqH, rollD, warnD = 14, today = new Date()) {
  const windowStart = new Date(today - rollD * 86400000);
  const inWindow    = sessions.filter((s) => new Date(s.end) >= windowStart);

  const totalMins  = inWindow.reduce((a, s) => a + s.dm, 0);
  const totalHours = totalMins / 60;
  const totalAllMins = sessions.reduce((a, s) => a + s.dm, 0);
  const hoursNeeded  = Math.max(0, reqH - totalHours);

  const sorted = [...sessions].sort((a, b) => new Date(a.start) - new Date(b.start));
  const inWS   = sorted.filter((s) => new Date(s.end) >= windowStart);

  let expiry    = null;
  let lapseDate = null;
  let status    = "lapsed";

  if (totalHours >= reqH) {
    // Find anchor session — oldest session that tips the running total
    // over the required threshold
    let run = 0, anchor = null;
    for (const s of inWS) {
      run += s.dm / 60;
      if (run >= reqH) { anchor = s; break; }
    }
    if (anchor) {
      expiry = new Date(new Date(anchor.start).getTime() + rollD * 86400000);
    }
    status = (expiry && daysUntil(expiry) <= warnD) ? "warning" : "current";
  } else {
    // Find the most recent historical window where currency was met
    let latestValid = null;
    for (const s of sorted) {
      const wStart = new Date(s.start);
      const wEnd   = new Date(wStart.getTime() + rollD * 86400000);
      const inThat = sorted.filter(
        (x) => new Date(x.start) >= wStart && new Date(x.start) < wEnd
      );
      const h = inThat.reduce((a, x) => a + x.dm / 60, 0);
      if (h >= reqH) {
        let run2 = 0, anc2 = null;
        for (const x of inThat) {
          run2 += x.dm / 60;
          if (run2 >= reqH) { anc2 = x; break; }
        }
        if (anc2) {
          const c = new Date(new Date(anc2.start).getTime() + rollD * 86400000);
          if (!latestValid || c > latestValid) latestValid = c;
        }
      }
    }
    lapseDate = latestValid;
  }

  const last = sessions.length > 0
    ? sessions.reduce((a, b) => new Date(a.end) > new Date(b.end) ? a : b)
    : null;

  return {
    totalHours,
    totalMins,
    totalAllMins,
    status,
    expiry,
    lapseDate,
    hoursNeeded,
    last:           last ? new Date(last.end) : null,
    inWindowCount:  inWindow.length,
  };
}

// Calculates the fixed-quarter policy currency status.
// This is the VATSIM-UK roster requirement: 3h on any UK position
// within the current calendar quarter (Jan–Mar, Apr–Jun, etc.).
function calcPolicy(allSessions, rules, today = new Date()) {
  const { start, end } = getQtr(today);
  const inQ = allSessions.filter((s) => {
    const d = new Date(s.start);
    return d >= start && d < end;
  });
  const totalMins  = inQ.reduce((a, s) => a + s.dm, 0);
  const totalHours = totalMins / 60;
  const daysLeft   = daysUntil(end);
  const met        = totalHours >= rules.reqH;
  const status     = met
    ? (daysLeft <= rules.warnD ? "warning" : "current")
    : (daysLeft <= rules.warnD ? "warning" : "lapsed");

  return {
    totalHours,
    totalMins,
    status,
    quarterStart: start,
    quarterEnd:   end,
    daysLeft,
    hoursNeeded:  Math.max(0, rules.reqH - totalHours),
  };
}

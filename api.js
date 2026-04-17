// ─────────────────────────────────────────────────────────────
// api.js — VATSIM API calls
//
// All fetch calls go through the API() helper from config.js,
// which routes them via the Cloudflare proxy when PROXY is set,
// or directly to api.vatsim.net when running locally.
//
// Endpoints used:
//   /v2/members/{cid}/atc         — ATC session history
//   /v2/members/{cid}/history     — Pilot session history
//   /v2/members/{cid}/flightplans — Last 50 filed flight plans
//   /v2/members/{cid}             — Member name lookup
// ─────────────────────────────────────────────────────────────

// Fetches all ATC sessions for a CID.
// Returns { items: [...], count: n }
// Supports pagination via limit/offset for large histories.
const apiAtc = async (cid, limit = 1000, offset = 0) => {
  const r = await fetch(
    API(`/v2/members/${cid}/atc?limit=${limit}&offset=${offset}`)
  );
  if (!r.ok) throw new Error(`ATC API ${r.status}`);
  const d = await r.json();
  return { items: d.items || [], count: d.count || 0 };
};

// Fetches pilot (flight) session history for a CID.
// Returns an array of sessions — note: no aircraft type is included here;
// that comes from matching against flight plans via apiFlightPlans().
const apiPilot = async (cid, limit = 500) => {
  const r = await fetch(API(`/v2/members/${cid}/history?limit=${limit}`));
  if (!r.ok) throw new Error(`Pilot API ${r.status}`);
  const d = await r.json();
  return d.items || [];
};

// Fetches the last 50 filed flight plans for a CID.
// Flight plans include aircraft type, dep, arr, route, and altitude.
// They are matched to pilot sessions via connection_id to enrich
// pilot sessions with aircraft type data.
//
// Note: This endpoint has a hard limit of 50 records — there is no
// pagination. Older flights will not have matched aircraft types
// unless previously stored in IndexedDB.
const apiFlightPlans = async (cid) => {
  const r = await fetch(API(`/v2/members/${cid}/flightplans`));
  if (!r.ok) throw new Error(`FP API ${r.status}`);
  return r.json();
};

// Fetches basic member details (primarily used to get the member's name).
// The name field location varies across API versions, so we check
// several possible paths.
const apiMember = async (cid) => {
  const r = await fetch(API(`/v2/members/${cid}`));
  if (!r.ok) throw new Error(`Member ${r.status}`);
  return r.json();
};

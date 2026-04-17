// ─────────────────────────────────────────────────────────────
// config.js — constants, defaults, proxy configuration
// ─────────────────────────────────────────────────────────────

const { useState, useCallback, useEffect, useMemo } = React;

// ── Default currency rules ────────────────────────────────────
// These are the starting values shown on first load.
// Users can override them in the rules panel; changes persist
// to IndexedDB automatically.

const DEFAULT_ATC = {
  reqH:  3,   // hours required within the rolling window
  rollD: 90,  // rolling window in days
  warnD: 14,  // days before expiry to show amber warning
};

const DEFAULT_FLY = {
  reqH:  15,  // hours required within the rolling window
  rollD: 30,  // rolling window in days
  warnD: 14,  // days before expiry to show amber warning
};

// ── VATSIM API proxy ──────────────────────────────────────────
// The VATSIM API sends no CORS headers, so all browser requests
// are blocked regardless of origin. A proxy is always required.
//
// LOCAL DEVELOPMENT
//   Run the local proxy alongside Live Server:
//     node proxy.js
//   Then set PROXY to the local proxy address below.
//
// GITHUB PAGES (production / shared)
//   Deploy the Cloudflare Worker (see PROXY_SETUP.md) and set
//   PROXY to your worker URL instead.
//
// Switch between the two by commenting/uncommenting:

const PROXY = "http://localhost:8787";           // local dev
// const PROXY = "https://YOUR-WORKER.workers.dev"; // production

// Builds the full request URL via the proxy.
const API = (path) => `${PROXY}${path}`;

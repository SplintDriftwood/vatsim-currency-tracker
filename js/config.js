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
// The VATSIM API does not send CORS headers, so direct browser
// requests are blocked when served from a remote origin (e.g.
// GitHub Pages).
//
// For LOCAL development via Live Server:
//   Leave PROXY as "" — the browser allows direct API calls
//   from localhost without CORS restrictions.
//
// For GitHub Pages (shared / production):
//   Set PROXY to your Cloudflare Worker URL.
//   Example: "https://vatsim-proxy.YOUR-SUBDOMAIN.workers.dev"
//   No trailing slash.

const PROXY = "";

// Builds the full request URL, routing through the proxy if set.
const API = (path) =>
  PROXY ? `${PROXY}${path}` : `https://api.vatsim.net${path}`;

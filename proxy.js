/**
 * proxy.js — Local development CORS proxy
 *
 * Forwards requests to the VATSIM API and adds the CORS headers
 * that browsers require. Run this alongside Live Server when
 * developing locally.
 *
 * Usage:
 *   node proxy.js
 *
 * Runs on http://localhost:8787
 * No dependencies — uses Node.js built-in modules only.
 */

const http  = require("http");
const https = require("https");
const url   = require("url");

const PORT        = 8787;
const VATSIM_BASE = "api.vatsim.net";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Only allow GET
  if (req.method !== "GET") {
    res.writeHead(405, CORS_HEADERS);
    res.end("Method not allowed");
    return;
  }

  // Forward the request path + query string to the VATSIM API
  const parsed   = url.parse(req.url);
  const options  = {
    hostname: VATSIM_BASE,
    path:     parsed.path,
    method:   "GET",
    headers:  { "User-Agent": "VATSIM-Currency-Tracker-Dev/1.0" },
  };

  console.log(`→ https://${VATSIM_BASE}${parsed.path}`);

  const proxyReq = https.request(options, (proxyRes) => {
    const headers = {
      ...CORS_HEADERS,
      "Content-Type": proxyRes.headers["content-type"] || "application/json",
      "Cache-Control": "no-cache",
    };
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.writeHead(502, CORS_HEADERS);
    res.end(JSON.stringify({ error: err.message }));
  });

  proxyReq.end();
});

server.listen(PORT, () => {
  console.log(`\n  VATSIM CORS proxy running`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  Set in config.js:`);
  console.log(`  const PROXY = "http://localhost:${PORT}";\n`);
  console.log(`  Press Ctrl+C to stop.\n`);
});

# VATSIM Currency Tracker

A personal currency tracker for VATSIM controllers and pilots. Track your ATC position currency against VATSIM-UK roster requirements and monitor your flying hours by aircraft family — all from a single HTML file hosted on GitHub Pages.

---

## What it does

**ATC Currency**
- Tracks hours on each controlling position against a configurable rolling window (default: 3h / 90 days)
- Monitors the VATSIM-UK fixed-quarter roster requirement (3h on any UK position per calendar quarter)
- Shows expiry dates and countdowns at a glance on every collapsed card
- Warns when currency is approaching expiry (configurable warning threshold)
- Sort by nearest expiry, position type, or alphabetically
- Filter by position type (CTR, APP, TWR, GND, DEL)
- Look up any other controller's ATC currency by entering their CID

**Flying Currency**
- Groups pilot sessions by aircraft family (Boeing 737 family, Airbus A320 family, etc.)
- Tracks hours against a configurable rolling window (default: 15h / 30 days)
- Drills down to specific type within each family
- Shows all-time total hours per family and per type
- Aircraft type is matched from your last 50 filed VATSIM flight plans

**Data & storage**
- Fetches your full session history directly from the VATSIM API
- Stores everything locally in your browser's IndexedDB — nothing is sent anywhere else
- Syncs new sessions automatically in the background each time you open the app
- All settings (rules, hidden positions) persist between sessions

---

## Using the app

1. Open the app at your GitHub Pages URL (see below)
2. Enter your VATSIM CID and click **Load data**
3. The app fetches your ATC and pilot history from the VATSIM API — this takes a few seconds on first load
4. Your data is saved locally in the browser; subsequent loads are instant

To check another controller's ATC currency, use the **Check a CID** field in the header. This fetches their ATC sessions live but does not affect your stored data.

To start fresh (e.g. if you want to re-fetch all data), click the **Reset** button in the top-right corner.

---

## Configuring currency rules

Both the ATC and Flying tabs have a collapsible rules panel at the top. Click it to adjust:

| Setting | Default | Description |
|---|---|---|
| Required hours | 3h (ATC) / 15h (flying) | Hours needed within the rolling window |
| Rolling days | 90 (ATC) / 30 (flying) | Length of the rolling currency window |
| Warn before | 14 days | How many days before expiry the status turns amber |

Changes take effect immediately and are saved automatically.

---

## Notes & limitations

- **Flying currency** relies on matched aircraft types. The VATSIM API only returns your last 50 filed flight plans, so older pilot sessions may not show an aircraft type. Sessions without a matched type are not shown in the flying tab.
- **ATC currency rules** in this app reflect VATSIM-UK policy. If you are in a different division, adjust the rules panel to match your own division's requirements.
- **Browser storage** — your data lives in the browser you used to load it. If you use a different browser or clear your site data, you will need to load your CID again. The re-load fetches everything fresh from the API.
- **CORS** — the app must be served over HTTP/HTTPS (e.g. from GitHub Pages) to make API calls. Opening the HTML file directly from your desktop (`file://`) will not work.

---

## Deployment

See the **Setup instructions** below for how to deploy this to GitHub Pages.

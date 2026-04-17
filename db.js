// ─────────────────────────────────────────────────────────────
// db.js — IndexedDB storage layer
//
// All session data, flight history, and settings are persisted
// here so the app works offline after the first load and doesn't
// need to re-fetch everything on every visit.
//
// Stores:
//   atc_sessions  — ATC controlling sessions  { id, callsign, start, end, dm }
//   fly_sessions  — Pilot sessions with aircraft type and route data
//   settings      — Key/value pairs (cid, rules, ignored positions, etc.)
// ─────────────────────────────────────────────────────────────

const DB_NAME    = "vatsim_currency";
const DB_VERSION = 2;

// Opens (or creates) the IndexedDB database.
// Returns a Promise that resolves to the db instance.
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      ["atc_sessions", "fly_sessions", "settings"].forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, {
            keyPath: name === "settings" ? "key" : "id",
          });
        }
      });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// Returns all records from a store as an array.
const dbGetAll = async (store) => {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
};

// Inserts or updates multiple records in a single transaction.
// Existing records with the same id/key are overwritten.
const dbPutMany = async (store, items) => {
  if (!items.length) return;
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    items.forEach((item) => os.put(item));
    tx.oncomplete = res;
    tx.onerror    = () => rej(tx.error);
  });
};

// Reads a single value from the settings store by key.
// Returns the value directly (not the wrapper object), or null if not found.
const dbGet = async (store, key) => {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db
      .transaction(store, "readonly")
      .objectStore(store)
      .get(key);
    req.onsuccess = () => res(req.result?.value ?? null);
    req.onerror   = () => rej(req.error);
  });
};

// Writes a single key/value pair to the settings store.
const dbSet = async (store, key, value) => {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put({ key, value });
    tx.oncomplete = res;
    tx.onerror    = () => rej(tx.error);
  });
};

// Removes all records from a store.
// Used when the user resets the app or re-loads from scratch.
const dbClear = async (store) => {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = res;
    tx.onerror    = () => rej(tx.error);
  });
};

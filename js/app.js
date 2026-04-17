// ─────────────────────────────────────────────────────────────
// app.js — App root component
//
// Manages all top-level state, startup loading, background sync,
// and renders the header + tab views. Must be loaded last.
// ─────────────────────────────────────────────────────────────

function App() {
  // ── App lifecycle state ──────────────────────────────────────
  // "init"    — checking IndexedDB for saved data
  // "welcome" — no saved data found, showing CID entry screen
  // "ready"   — data loaded, showing main dashboard
  const [appState,  setAppState]  = useState("init");
  const [loadMsg,   setLoadMsg]   = useState("Checking for saved data…");

  // ── User & data ──────────────────────────────────────────────
  const [cid,         setCid]         = useState(null);
  const [memberName,  setMemberName]  = useState(null);
  const [atcSessions, setAtcSessions] = useState([]);
  const [flySessions, setFlySessions] = useState([]);

  // ── UI state ─────────────────────────────────────────────────
  const [tab,       setTab]       = useState("atc");
  const [atcRules,  setAtcRules]  = useState(DEFAULT_ATC);
  const [flyRules,  setFlyRules]  = useState(DEFAULT_FLY);
  const [ignored,   setIgnored]   = useState([]);
  const [atcFilter, setAtcFilter] = useState("all");
  const [atcSort,   setAtcSort]   = useState("expiry");
  const [syncMsg,   setSyncMsg]   = useState(null);

  // ── CID lookup (view another controller's ATC data) ──────────
  const [liveCid, setLiveCid] = useState(null);
  const [liveAtc, setLiveAtc] = useState(null);

  // ── Startup ───────────────────────────────────────────────────
  // On mount: open IndexedDB, restore settings, load any saved
  // sessions. If a CID is found, go straight to "ready" and kick
  // off a background sync. Otherwise, show the welcome screen.
  useEffect(() => {
    (async () => {
      try {
        await openDB();

        const [savedCid, savedName, savedAtcR, savedFlyR, savedIgn] =
          await Promise.all([
            dbGet("settings", "cid"),
            dbGet("settings", "member_name"),
            dbGet("settings", "atc_rules"),
            dbGet("settings", "fly_rules"),
            dbGet("settings", "ignored"),
          ]);

        if (savedAtcR) setAtcRules(savedAtcR);
        if (savedFlyR) setFlyRules(savedFlyR);
        if (savedIgn)  setIgnored(savedIgn);

        if (savedCid) {
          setLoadMsg("Loading your saved data…");
          const [atc, fly] = await Promise.all([
            dbGetAll("atc_sessions"),
            dbGetAll("fly_sessions"),
          ]);

          if (atc.length > 0) {
            setCid(savedCid);
            setMemberName(savedName || `CID ${savedCid}`);
            setAtcSessions(atc);
            setFlySessions(fly.filter((s) => s.dm >= 5 && s.ac));
            setAppState("ready");
            backgroundSync(savedCid, atc, fly.filter((s) => s.dm >= 5 && s.ac));
            return;
          }
        }

        setAppState("welcome");
      } catch {
        setAppState("welcome");
      }
    })();
  }, []);

  // ── Background sync ───────────────────────────────────────────
  // Called after loading from IndexedDB. Quietly fetches the API
  // and merges any new sessions in — never overwrites existing ones.
  async function backgroundSync(cidToSync, existAtc, existFly) {
    setSyncMsg({ status: "syncing", text: "Syncing with VATSIM API…" });
    try {
      // ATC sessions
      const { items: atcRaw } = await apiAtc(cidToSync, 1000);
      const fresh     = parseAtcItems(atcRaw);
      const existIds  = new Set(existAtc.map((s) => s.id));
      const newAtc    = fresh.filter((s) => !existIds.has(s.id));
      if (newAtc.length > 0) {
        await dbPutMany("atc_sessions", newAtc);
        setAtcSessions((prev) => [...prev, ...newAtc]);
      }

      // Pilot sessions
      const pilotRaw    = await apiPilot(cidToSync, 500);
      const existFlyIds = new Set(existFly.map((s) => s.id));
      const newPilot    = pilotRaw.filter(
        (s) => s.start && s.end && !existFlyIds.has(s.id)
      );

      if (newPilot.length > 0) {
        let fpMap = {};
        try {
          const fps = await apiFlightPlans(cidToSync);
          for (const fp of fps) if (fp.connection_id) fpMap[fp.connection_id] = fp;
        } catch {}

        const enriched = newPilot
          .map((s) => {
            const dm = (new Date(s.end) - new Date(s.start)) / 60000;
            const fp = fpMap[s.id];
            const ac = fp?.aircraft ? fp.aircraft.split("/")[0] : null;
            return {
              id: s.id, callsign: s.callsign, start: s.start, end: s.end, dm,
              ac, family: classifyAc(ac),
              dep: fp?.dep || "", arr: fp?.arr || "",
              route: fp?.route || "", altitude: fp?.altitude || "", filed: fp?.filed || "",
            };
          })
          .filter((s) => s.dm >= 5 && s.ac);

        if (enriched.length > 0) {
          await dbPutMany("fly_sessions", enriched);
          setFlySessions((prev) => [...prev, ...enriched]);
        }
      }

      await dbSet("settings", "last_sync", new Date().toISOString());
      setSyncMsg({
        status: "synced",
        text: newAtc.length > 0
          ? `Synced — ${newAtc.length} new session${newAtc.length > 1 ? "s" : ""}`
          : "Up to date",
      });
      setTimeout(() => setSyncMsg(null), 4000);

    } catch (e) {
      setSyncMsg({ status: "error", text: `Sync failed: ${e.message}` });
    }
  }

  // ── Persist settings changes ───────────────────────────────
  useEffect(() => { if (appState === "ready") dbSet("settings", "atc_rules", atcRules); }, [atcRules]);
  useEffect(() => { if (appState === "ready") dbSet("settings", "fly_rules", flyRules); }, [flyRules]);
  useEffect(() => { if (appState === "ready") dbSet("settings", "ignored",   ignored);  }, [ignored]);

  // ── Event handlers ────────────────────────────────────────────
  const handleWelcomeLoad = useCallback(({ cid: c, memberName: n, atcSessions: a, flySessions: f }) => {
    setCid(c); setMemberName(n); setAtcSessions(a); setFlySessions(f);
    setAppState("ready");
  }, []);

  const toggleIgnore = useCallback((key) =>
    setIgnored((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    ), []);

  const handleLiveCid = useCallback((c, items) => { setLiveCid(c); setLiveAtc(items); }, []);
  const clearLive     = useCallback(() => { setLiveCid(null); setLiveAtc(null); }, []);

  const handleReset = useCallback(async () => {
    if (!confirm("Clear all saved data and start over?")) return;
    await Promise.all([
      dbClear("atc_sessions"),
      dbClear("fly_sessions"),
      dbClear("settings"),
    ]);
    setAppState("welcome");
    setCid(null); setMemberName(null);
    setAtcSessions([]); setFlySessions([]);
    setIgnored([]); setAtcRules(DEFAULT_ATC); setFlyRules(DEFAULT_FLY);
    setLiveCid(null); setLiveAtc(null);
  }, []);

  // ── Derived data ──────────────────────────────────────────────
  const activeAtc  = liveAtc || atcSessions;
  const posMap     = useMemo(() => buildPositions(activeAtc), [activeAtc]);
  const allAtcFlat = useMemo(() => Object.values(posMap).flat(), [posMap]);
  const policy     = useMemo(() => calcPolicy(allAtcFlat, atcRules), [allAtcFlat, atcRules]);

  const positions = useMemo(() => {
    const withR = Object.entries(posMap).map(([key, sess]) => ({
      key,
      label:   posLabel(key),
      type:    posType(key),
      sessions: sess,
      ignored: liveAtc ? false : ignored.includes(key),
      r:       calcRolling(sess, atcRules.reqH, atcRules.rollD, atcRules.warnD),
    }));

    const filtered = atcFilter === "all"
      ? withR
      : withR.filter((p) => p.type === atcFilter);

    if (atcSort === "expiry") {
      return filtered.sort((a, b) => {
        const ord = { warning: 0, current: 1, lapsed: 2 };
        const ao = ord[a.r.status] ?? 3;
        const bo = ord[b.r.status] ?? 3;
        if (ao !== bo) return ao - bo;
        if (a.r.status === "lapsed") {
          return (b.r.lapseDate?.getTime() ?? 0) - (a.r.lapseDate?.getTime() ?? 0);
        }
        return (a.r.expiry?.getTime() ?? Infinity) - (b.r.expiry?.getTime() ?? Infinity);
      });
    }
    if (atcSort === "type") {
      return filtered.sort(
        (a, b) => TORD[a.type] - TORD[b.type] || a.label.localeCompare(b.label)
      );
    }
    return filtered.sort((a, b) => a.label.localeCompare(b.label));
  }, [posMap, atcFilter, atcSort, atcRules, ignored, liveAtc]);

  const counts = useMemo(() => {
    const c = { current: 0, warning: 0, lapsed: 0 };
    positions
      .filter((p) => !p.ignored)
      .forEach((p) => { c[p.r.status] = (c[p.r.status] || 0) + 1; });
    return c;
  }, [positions]);

  const familyGroups = useMemo(() => buildFamilies(flySessions), [flySessions]);

  // ── Render: loading ───────────────────────────────────────────
  if (appState === "init") {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <div className="load-msg">{loadMsg}</div>
        <div className="load-title">VATSIM CURRENCY TRACKER</div>
      </div>
    );
  }

  // ── Render: welcome ───────────────────────────────────────────
  if (appState === "welcome") {
    return (
      <>
        <div className="header">
          <div className="logo">
            <div className="logo-mark"><div className="pulse" /></div>
            <div>
              <div className="logo-text">Currency Tracker</div>
              <div className="logo-sub">VATSIM</div>
            </div>
          </div>
        </div>
        <WelcomeScreen onLoad={handleWelcomeLoad} />
      </>
    );
  }

  // ── Render: main dashboard ────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="logo">
          <div className="logo-mark"><div className="pulse" /></div>
          <div>
            <div className="logo-text">Currency Tracker</div>
            <div className="logo-sub">
              {liveAtc ? `Viewing CID ${liveCid}` : `${memberName} · CID ${cid}`}
            </div>
          </div>
        </div>
        <div className="header-right">
          <CidLookup onLoad={handleLiveCid} />
          {liveAtc && (
            <button className="btn" onClick={clearLive}>← Own data</button>
          )}
          <button
            className="btn"
            style={{ fontSize: 10, color: "var(--text3)" }}
            onClick={handleReset}
            title="Clear saved data and start over"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="main">
        <div className="tabs">
          {[["atc", "ATC Currency"], ["fly", "Flying Currency"]].map(([id, label]) => (
            <button
              key={id}
              className={`tab-btn${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── ATC Currency tab ── */}
        {tab === "atc" && (
          <>
            <RulesPanel
              title="ATC currency rules"
              rules={atcRules}
              onChange={setAtcRules}
              accent="var(--green)"
            />

            {liveAtc ? (
              <div className="info-bar live">
                <span>Live — CID {liveCid} · {allAtcFlat.length} sessions</span>
                <span style={{ fontSize: 9, color: "var(--text2)" }}>
                  Flying currency still shows your own data
                </span>
              </div>
            ) : syncMsg ? (
              <div className={`info-bar ${syncMsg.status}`}>
                <span>{syncMsg.text}</span>
              </div>
            ) : null}

            <PolicyBanner pol={policy} rules={atcRules} />

            {/* Status summary chips */}
            <div className="status-chips">
              {["current", "warning", "lapsed"].map((st) => {
                const c = counts[st] || 0;
                return (
                  <div key={st} className={`chip ${c > 0 ? st : "muted"}`}>
                    <span className={`dot ${st}`} />
                    <strong>{c}</strong>
                    <span>{{ current: "Current", warning: "Warning", lapsed: "Lapsed" }[st]}</span>
                  </div>
                );
              })}
              <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: "auto" }}>
                {positions.filter((p) => !p.ignored).length} positions
              </span>
            </div>

            {/* Type filter */}
            <div className="filter-bar">
              {["all", "CTR", "APP", "TWR", "GND", "DEL"].map((t) => {
                const cols = {
                  CTR: "var(--amber)", APP: "var(--blue)",
                  TWR: "var(--green)", GND: "#a78bfa", DEL: "#818cf8",
                };
                const active = atcFilter === t;
                return (
                  <button
                    key={t}
                    className={`btn${active ? " active" : ""}`}
                    style={active && cols[t]
                      ? { borderColor: cols[t], color: cols[t], background: `${cols[t]}18` }
                      : {}}
                    onClick={() => setAtcFilter(t)}
                  >
                    {t === "all" ? "All" : t}
                  </button>
                );
              })}
            </div>

            {/* Sort */}
            <div className="sort-bar">
              <span className="sort-label">Sort</span>
              {[["expiry", "Nearest expiry"], ["type", "Position type"], ["alpha", "Alphabetical"]].map(
                ([id, lbl]) => (
                  <button
                    key={id}
                    className={`btn${atcSort === id ? " active" : ""}`}
                    onClick={() => setAtcSort(id)}
                  >
                    {lbl}
                  </button>
                )
              )}
            </div>

            {/* Position cards */}
            <div>
              {positions.map((pos) => (
                <AtcCard key={pos.key} pos={pos} rules={atcRules} onToggle={toggleIgnore} />
              ))}
              {positions.length === 0 && (
                <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", padding: "40px 0" }}>
                  No ATC sessions found.
                </div>
              )}
            </div>

            {!liveAtc && ignored.length > 0 && (
              <div style={{ fontSize: 9, color: "var(--text3)", textAlign: "center", marginTop: 8 }}>
                {ignored.length} position{ignored.length > 1 ? "s" : ""} hidden
              </div>
            )}
          </>
        )}

        {/* ── Flying Currency tab ── */}
        {tab === "fly" && (
          <>
            <RulesPanel
              title="Flying currency rules"
              rules={flyRules}
              onChange={setFlyRules}
              accent="var(--blue)"
            />

            <div className="info-bar">
              <span>
                {flySessions.length} flights with matched aircraft type ·{" "}
                {familyGroups.length} {familyGroups.length === 1 ? "family" : "families"}
              </span>
              <span style={{ fontSize: 9 }}>Stored locally · syncs on load</span>
            </div>

            <div>
              {familyGroups.map((g) => (
                <FlyCard key={g.family} group={g} rules={flyRules} />
              ))}
              {familyGroups.length === 0 && (
                <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", padding: "40px 0" }}>
                  No pilot sessions with matched aircraft type found.
                  <br />
                  <span style={{ fontSize: 10, marginTop: 6, display: "block" }}>
                    Aircraft type is matched from your last 50 filed flight plans.
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Mount the React app
ReactDOM.createRoot(document.getElementById("root")).render(<App />);

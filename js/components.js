// ─────────────────────────────────────────────────────────────
// components.js — React components
//
// Sections:
//   1. Atoms         — Dot, Badge, Chevron, MiniBar, ExpiryPill,
//                      StatBox, AllTimeRow
//   2. RulesPanel    — collapsible currency rule editor
//   3. PolicyBanner  — fixed-quarter roster currency banner
//   4. AtcCard       — per-position ATC currency card
//   5. FlyCard       — per-family flying currency card
//   6. WelcomeScreen — initial CID entry screen
//   7. CidLookup     — header CID lookup field
// ─────────────────────────────────────────────────────────────

// ── 1. Atoms ──────────────────────────────────────────────────

// Status dot — green / amber / red glow
const Dot = ({ s, lg }) => (
  <span className={`dot ${s}${lg ? " lg" : ""}`} />
);

// Position type badge (DEL / GND / TWR / APP / CTR)
const Badge = ({ type }) => (
  <span className={`badge badge-${type}`}>{type}</span>
);

// Expand/collapse chevron
const Chev = ({ open }) => (
  <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: 4, flexShrink: 0 }}>
    {open ? "▲" : "▼"}
  </span>
);

// Thin progress bar showing hours vs required
const MiniBar = ({ val, max, status, width = 36, height = 3 }) => (
  <div className="bar-track" style={{ width, height }}>
    <div
      className={`bar-fill ${status}`}
      style={{ width: `${Math.min(100, (val / max) * 100)}%` }}
    />
  </div>
);

// Expiry date pill — shown on collapsed cards for at-a-glance status
function ExpiryPill({ r }) {
  if (r.status === "lapsed") {
    if (r.lapseDate) {
      return <span className="pill lapsed">lapsed {fmtDate(r.lapseDate, true)}</span>;
    }
    return <span className="pill never">never current</span>;
  }
  if (!r.expiry) return null;
  const dl = daysUntil(r.expiry);
  if (dl <= 0) return <span className="pill warning">expires today</span>;
  if (dl === 1) return <span className="pill warning">expires tomorrow</span>;
  return (
    <span className={`pill ${r.status}`}>
      {fmtDate(r.expiry, true)} · {dl}d
    </span>
  );
}

// Three-column stat box (used inside expanded cards)
function StatBox({ label, val, sub, hiClass }) {
  return (
    <div className={`stat-box ${hiClass || ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-val">{val}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// All-time hours row shown inside expanded cards
const AllTimeRow = ({ label, val }) => (
  <div className="alltime-row">
    <span>{label}</span>
    <span>{val}</span>
  </div>
);

// ── 2. RulesPanel ─────────────────────────────────────────────

// Collapsible panel for editing required hours, rolling window,
// and warning threshold. Changes call onChange immediately.
function RulesPanel({ title, rules, onChange, accent }) {
  const [open, setOpen] = useState(false);

  const fields = [
    ["Required hours", "reqH",  0.5, 200, 0.5],
    ["Rolling days",   "rollD", 1,   365, 1  ],
    ["Warn before (d)","warnD", 1,   90,  1  ],
  ];

  return (
    <div className="rules-panel mb-2">
      <button className="rules-toggle" onClick={() => setOpen((o) => !o)}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: accent, display: "inline-block", flexShrink: 0,
        }} />
        <span>{title}</span>
        <span style={{ marginLeft: 6, color: "var(--text3)" }}>
          {rules.reqH}h / {rules.rollD}d rolling · warn {rules.warnD}d
        </span>
        <span style={{ marginLeft: "auto" }}><Chev open={open} /></span>
      </button>

      {open && (
        <div className="rules-grid">
          {fields.map(([lbl, key, min, max, step]) => (
            <div key={key}>
              <div className="rules-label">{lbl}</div>
              <input
                type="number"
                value={rules[key]}
                min={min}
                max={max}
                step={step}
                onChange={(ev) => {
                  const v = parseFloat(ev.target.value);
                  if (!isNaN(v) && v >= min && v <= max) {
                    onChange({ ...rules, [key]: v });
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 3. PolicyBanner ───────────────────────────────────────────

// Fixed-quarter VATSIM-UK roster currency banner.
// Shows total hours this quarter, a progress bar, and days remaining.
function PolicyBanner({ pol, rules }) {
  if (!pol) return null;

  const qn  = `Q${Math.floor(pol.quarterStart.getMonth() / 3) + 1} ${pol.quarterStart.getFullYear()}`;
  const pct = Math.min(100, (pol.totalHours / rules.reqH) * 100);
  const sc  = { current: "var(--green)", warning: "var(--amber)", lapsed: "var(--red)" };

  return (
    <div className={`policy-banner ${pol.status}`}>
      {/* Left: hours summary */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 150 }}>
        <Dot s={pol.status} lg />
        <div>
          <div className="section-label">Roster currency — {qn}</div>
          <div style={{
            fontFamily: "var(--display)", fontSize: 18,
            fontWeight: 800, letterSpacing: ".01em",
          }}>
            {fmtH(pol.totalMins)}
            <span style={{
              fontSize: 11, color: "var(--text3)",
              fontWeight: 400, marginLeft: 8, fontFamily: "var(--mono)",
            }}>
              of {rules.reqH}h required
            </span>
          </div>
        </div>
      </div>

      {/* Right: progress bar + countdown */}
      <div style={{ flex: 2, minWidth: 150 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 9, color: "var(--text3)", marginBottom: 4,
        }}>
          <span>Ends {fmtDate(pol.quarterEnd)}</span>
          <span style={{ color: sc[pol.status] }}>{pol.daysLeft}d remaining</span>
        </div>
        <div className="bar-track" style={{ width: "100%", height: 5 }}>
          <div className={`bar-fill ${pol.status}`} style={{ width: `${pct}%` }} />
        </div>
        {pol.hoursNeeded > 0 && (
          <div style={{ fontSize: 9, marginTop: 4, color: sc[pol.status] }}>
            {fmtH(pol.hoursNeeded * 60)} still needed this quarter
          </div>
        )}
      </div>
    </div>
  );
}

// ── 4. AtcCard ────────────────────────────────────────────────

// ATC position currency card.
// Collapsed: shows status dot, type badge, position label,
//            hours in window, expiry pill, and mini progress bar.
// Expanded:  shows stat boxes, all-time hours, and recent sessions.
function AtcCard({ pos, rules, onToggle }) {
  const [open, setOpen] = useState(false);

  const r = useMemo(
    () => calcRolling(pos.sessions, rules.reqH, rules.rollD, rules.warnD),
    [pos.sessions, rules]
  );

  const recent = [...pos.sessions]
    .sort((a, b) => new Date(b.start) - new Date(a.start))
    .slice(0, 5);

  let midLabel, midVal, midSub, midHi = "";
  if (r.status === "lapsed") {
    midLabel = "Lapsed";
    midHi    = "hi-red";
    midVal   = r.lapseDate ? fmtDate(r.lapseDate) : "Never current";
    midSub   = r.lapseDate ? `${daysAgo(r.lapseDate)}d ago` : `Need ${fmtH(r.hoursNeeded * 60)}`;
  } else {
    midLabel = "Expires";
    midVal   = fmtDate(r.expiry);
    midSub   = r.expiry ? `${daysUntil(r.expiry)}d away` : "—";
    if (r.status === "warning") midHi = "hi-warn";
  }

  return (
    <div className={`card status-${pos.ignored ? "lapsed" : r.status}${pos.ignored ? " ignored" : ""} fade-in`}>

      {/* Collapsed row */}
      <div className="card-row" onClick={() => setOpen((o) => !o)}>
        <Dot s={pos.ignored ? "lapsed" : r.status} />
        <Badge type={pos.type} />
        <span className="truncate flex-1" style={{ fontSize: 12, fontWeight: 600 }}>
          {pos.label}
        </span>
        {!pos.ignored && <>
          <span style={{ fontSize: 11, color: "var(--text2)", marginRight: 6, whiteSpace: "nowrap" }}>
            {fmtH(r.totalMins)}
          </span>
          <ExpiryPill r={r} />
          <div style={{ marginLeft: 7 }}>
            <MiniBar val={r.totalHours} max={rules.reqH} status={r.status} />
          </div>
        </>}
        <Chev open={open} />
      </div>

      {/* Expanded body */}
      {open && (
        <div className="card-body fade-in" style={{ paddingTop: 10 }}>
          {!pos.ignored ? (
            <>
              <div className="stat-grid">
                <StatBox
                  label={`Hours (${rules.rollD}d)`}
                  val={fmtH(r.totalMins)}
                  sub={`${r.inWindowCount} sessions`}
                />
                <StatBox
                  label={midLabel}
                  val={midVal}
                  sub={midSub}
                  hiClass={midHi}
                />
                <StatBox
                  label="Last session"
                  val={r.last ? fmtDate(r.last) : "Never"}
                  sub={r.last ? `${daysAgo(r.last)}d ago` : ""}
                />
              </div>

              <AllTimeRow label="All-time on position" val={fmtH(r.totalAllMins)} />

              {r.status === "lapsed" && (
                <div className="section-label mb-1" style={{ color: "var(--red)" }}>
                  Book {fmtH(r.hoursNeeded * 60)} or more to restore currency
                </div>
              )}

              {recent.length > 0 && (
                <>
                  <div className="section-label">Recent sessions</div>
                  {recent.map((sess, i) => {
                    const inW = daysAgo(new Date(sess.end)) <= rules.rollD;
                    return (
                      <div
                        key={i}
                        className="session-row"
                        style={{ color: inW ? "var(--text2)" : "var(--text3)" }}
                      >
                        <span className={`session-dot ${inW ? "in" : "out"}`} />
                        <span style={{ flex: 1 }}>{fmtDate(new Date(sess.start))}</span>
                        <span style={{ color: inW ? "var(--green)" : "var(--text3)" }}>
                          {fmtH(sess.dm)}
                        </span>
                        <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: 6 }}>
                          {sess.callsign}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          ) : (
            <p style={{ fontSize: 10, color: "var(--text3)", paddingTop: 6 }}>
              Position hidden.
            </p>
          )}

          <button
            className="btn mt-1"
            style={{ fontSize: 10 }}
            onClick={(e) => { e.stopPropagation(); onToggle(pos.key); }}
          >
            {pos.ignored ? "Restore" : "Hide position"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── 5. FlyCard ────────────────────────────────────────────────

// Aircraft family flying currency card.
// Collapsed: family name with colour swatch, hours in window,
//            expiry pill, all-time total, and mini progress bar.
// Expanded:  stat boxes, all-time total, per-type breakdown
//            with their own expiry pills and recent sessions.
function FlyCard({ group, rules }) {
  const [open, setOpen] = useState(false);

  const r = useMemo(
    () => calcRolling(group.sessions, rules.reqH, rules.rollD, rules.warnD),
    [group.sessions, rules]
  );

  const fc          = FAMILIES[group.family]?.color || "#6b7280";
  const totalAllMins = group.sessions.reduce((a, s) => a + s.dm, 0);

  const types = Object.entries(group.types)
    .map(([ac, sess]) => ({
      ac,
      sessions: sess,
      r: calcRolling(sess, rules.reqH, rules.rollD, rules.warnD),
    }))
    .sort((a, b) => b.r.totalAllMins - a.r.totalAllMins);

  let midLabel, midVal, midSub, midHi = "";
  if (r.status === "lapsed") {
    midLabel = "Lapsed";
    midHi    = "hi-red";
    midVal   = r.lapseDate ? fmtDate(r.lapseDate) : "Never current";
    midSub   = r.lapseDate ? `${daysAgo(r.lapseDate)}d ago` : `Need ${fmtH(r.hoursNeeded * 60)}`;
  } else {
    midLabel = "Expires";
    midVal   = fmtDate(r.expiry);
    midSub   = r.expiry ? `${daysUntil(r.expiry)}d away` : "—";
    if (r.status === "warning") midHi = "hi-warn";
  }

  return (
    <div className={`card status-${r.status} fade-in`}>

      {/* Collapsed row */}
      <div className="card-row" onClick={() => setOpen((o) => !o)}>
        <Dot s={r.status} />
        <div className="family-swatch" style={{ background: fc }} />
        <span className="truncate flex-1" style={{ fontSize: 12, fontWeight: 600 }}>
          {group.family}
        </span>
        <span style={{ fontSize: 11, color: "var(--text2)", marginRight: 6, whiteSpace: "nowrap" }}>
          {fmtH(r.totalMins)}
        </span>
        <ExpiryPill r={r} />
        <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: 7, whiteSpace: "nowrap" }}>
          {fmtH(totalAllMins)} total
        </span>
        <div style={{ marginLeft: 7 }}>
          <MiniBar val={r.totalHours} max={rules.reqH} status={r.status} />
        </div>
        <Chev open={open} />
      </div>

      {/* Expanded body */}
      {open && (
        <div className="card-body fade-in" style={{ paddingTop: 10 }}>
          <div className="stat-grid">
            <StatBox
              label={`Hours (${rules.rollD}d)`}
              val={fmtH(r.totalMins)}
              sub={`${r.inWindowCount} flights`}
            />
            <StatBox label={midLabel} val={midVal} sub={midSub} hiClass={midHi} />
            <StatBox
              label="Last flight"
              val={r.last ? fmtDate(r.last) : "Never"}
              sub={r.last ? `${daysAgo(r.last)}d ago` : ""}
            />
          </div>

          <AllTimeRow label="All-time on family" val={fmtH(totalAllMins)} />

          <div className="section-label">By specific type</div>

          {types.map(({ ac, sessions: ts, r: tr }) => {
            const tAll = ts.reduce((a, s) => a + s.dm, 0);
            const rec  = [...ts]
              .sort((a, b) => new Date(b.start) - new Date(a.start))
              .slice(0, 3);

            return (
              <div key={ac} className="type-card">
                <div className="type-row">
                  <Dot s={tr.status} />
                  <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>{ac}</span>
                  <ExpiryPill r={tr} />
                  <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: 7 }}>
                    {fmtH(tAll)} total
                  </span>
                  <div style={{ marginLeft: 7 }}>
                    <MiniBar val={tr.totalHours} max={rules.reqH} status={tr.status} width={28} />
                  </div>
                </div>
                <div className="type-sessions">
                  {rec.map((sess, i) => {
                    const inW = daysAgo(new Date(sess.end)) <= rules.rollD;
                    return (
                      <span
                        key={i}
                        className={`type-sess-pill ${inW ? "in" : "out"}`}
                      >
                        {fmtDate(new Date(sess.start), true)} · {fmtH(sess.dm)}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 6. WelcomeScreen ──────────────────────────────────────────

// Shown on first visit. User enters their CID and the app fetches
// all their data from the VATSIM API, then calls onLoad() to
// transition to the main dashboard.
function WelcomeScreen({ onLoad }) {
  const [cid,     setCid]     = useState("");
  const [loading, setLoading] = useState(false);
  const [phase,   setPhase]   = useState("");
  const [error,   setError]   = useState(null);

  const go = async () => {
    const c = parseInt(cid.trim());
    if (!c || c < 800000) {
      setError("Please enter a valid VATSIM CID (7–8 digits)");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Look up member name
      setPhase("Verifying CID…");
      let memberName = `CID ${c}`;
      try {
        const m = await apiMember(c);
        memberName = m?.name_full || m?.name || m?.personal?.name_full || memberName;
      } catch {}

      // ATC sessions
      setPhase("Fetching ATC sessions…");
      const { items: atcRaw } = await apiAtc(c, 1000);
      const atcSessions = parseAtcItems(atcRaw);

      // Pilot sessions
      setPhase("Fetching pilot sessions…");
      const pilotRaw = await apiPilot(c, 500);

      // Flight plans for aircraft type enrichment
      setPhase("Fetching flight plans…");
      let fpMap = {};
      try {
        const fps = await apiFlightPlans(c);
        for (const fp of fps) {
          if (fp.connection_id) fpMap[fp.connection_id] = fp;
        }
      } catch {}

      // Build enriched fly sessions
      const flySessions = pilotRaw
        .filter((s) => s.start && s.end)
        .map((s) => {
          const dm = (new Date(s.end) - new Date(s.start)) / 60000;
          const fp = fpMap[s.id];
          const ac = fp?.aircraft ? fp.aircraft.split("/")[0] : null;
          return {
            id:       s.id,
            callsign: s.callsign,
            start:    s.start,
            end:      s.end,
            dm,
            ac,
            family:   classifyAc(ac),
            dep:      fp?.dep      || "",
            arr:      fp?.arr      || "",
            route:    fp?.route    || "",
            altitude: fp?.altitude || "",
            filed:    fp?.filed    || "",
          };
        })
        .filter((s) => s.dm >= 5 && s.ac);

      // Persist to IndexedDB
      setPhase("Saving to local database…");
      await dbClear("atc_sessions");
      await dbClear("fly_sessions");
      await dbPutMany("atc_sessions", atcSessions);
      await dbPutMany("fly_sessions", flySessions);
      await dbSet("settings", "cid",         c);
      await dbSet("settings", "member_name", memberName);
      await dbSet("settings", "last_sync",   new Date().toISOString());

      onLoad({ cid: c, memberName, atcSessions, flySessions });

    } catch (e) {
      setError(`Could not load data: ${e.message}`);
    } finally {
      setLoading(false);
      setPhase("");
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-logo">Currency Tracker</div>
      <div className="welcome-sub">VATSIM · ATC &amp; Pilot Currency</div>

      <div className="welcome-card">
        <div className="welcome-label">Enter your VATSIM CID to get started</div>
        <div className="welcome-input-row">
          <input
            className="welcome-input"
            type="text"
            placeholder="e.g. 1234567"
            value={cid}
            onChange={(ev) => setCid(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Enter" && go()}
            disabled={loading}
          />
          <button
            className="welcome-btn"
            onClick={go}
            disabled={loading || !cid.trim()}
          >
            {loading ? (phase || "Loading…") : "Load data"}
          </button>
        </div>
        {error && <div className="welcome-error">{error}</div>}
        <div className="welcome-note">
          Your data is fetched from the VATSIM API and stored locally in this browser.
          Nothing is sent anywhere else.
        </div>
      </div>

      <div className="welcome-features">
        {[
          ["ATC Currency",       "Rolling-window and fixed-quarter roster requirements per position"],
          ["Flying Currency",    "Pilot sessions grouped by aircraft family with configurable thresholds"],
          ["Expiry at a glance", "Every card shows exactly when currency expires or lapsed"],
          ["Check any controller", "Enter any CID in the header to view their ATC currency"],
        ].map(([title, desc]) => (
          <div key={title} className="welcome-feat">
            <div className="welcome-feat-title">{title}</div>
            <div className="welcome-feat-desc">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 7. CidLookup ──────────────────────────────────────────────

// Header input for looking up another controller's ATC currency.
// Fetches their sessions live and calls onLoad() with the result.
// Does not affect the current user's stored data.
function CidLookup({ onLoad }) {
  const [cid,     setCid]     = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  const go = async () => {
    const c = parseInt(cid.trim());
    if (!c || c < 800000) { setErr("Invalid CID"); return; }
    setLoading(true);
    setErr(null);
    try {
      const { items } = await apiAtc(c, 1000);
      onLoad(c, parseAtcItems(items));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <input
        type="text"
        value={cid}
        placeholder="Check a CID"
        style={{ width: 120 }}
        onChange={(ev) => setCid(ev.target.value)}
        onKeyDown={(ev) => ev.key === "Enter" && go()}
      />
      <button className="btn" onClick={go} disabled={loading}>
        {loading ? "…" : "Check"}
      </button>
      {err && <span style={{ fontSize: 10, color: "var(--red)" }}>{err}</span>}
    </div>
  );
}

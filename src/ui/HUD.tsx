import { ACHIEVEMENTS, facilityStats, useStore } from '../store'
import { EQUIP_INFO, REQUEST_STEPS } from '../data'

function hoverLabel(id: string): string {
  const [kind, rest] = id.includes(':') ? id.split(':') : [id, '']
  switch (kind) {
    case 'server':
      return `Server ${rest} — click to inspect`
    case 'rack':
      return `Rack ${rest} — click to inspect`
    case 'rackdoor':
      return `Rack ${rest} door — click to open/close`
    case 'secdoor':
      return 'Security door — badge required'
    default:
      return `${EQUIP_INFO[kind]?.title ?? kind} — click to inspect`
  }
}

export function HUD() {
  const s = useStore()
  const stats = facilityStats(s)
  const showResume = !s.pointerLocked && !s.selectedId && s.overlay === 'none' && !s.requestFlow.active

  const criticalAlert = s.alerts.find((a) => a.severity === 'critical')

  return (
    <div className="hud">
      {/* crosshair */}
      {s.pointerLocked && <div className={`crosshair ${s.hoveredId ? 'hot' : ''}`} />}

      {/* hover prompt */}
      {s.pointerLocked && s.hoveredId && <div className="hover-label">{hoverLabel(s.hoveredId)}</div>}

      {/* top-left: facility status */}
      <div className="panel status-panel">
        <div className="panel-title">
          <span className="live-dot" />
          RACKLAB DC-01
        </div>
        <div className="stat-row">
          <span>Power</span>
          <span className={s.power.grid ? 'text-ok' : s.power.gen === 'running' ? 'text-warn' : 'text-bad'}>
            {s.power.grid ? 'GRID' : s.power.gen === 'running' ? 'GENERATOR' : s.power.ups > 0 ? `UPS ${s.power.ups.toFixed(0)}%` : 'DOWN'}
          </span>
        </div>
        <div className="stat-row">
          <span>Cooling</span>
          <span
            className={
              Object.values(s.cooling).every((c) => c.status === 'running') && (s.power.grid || s.power.gen === 'running')
                ? 'text-ok'
                : 'text-bad'
            }
          >
            {!(s.power.grid || s.power.gen === 'running')
              ? 'NO POWER'
              : `${Object.values(s.cooling).filter((c) => c.status === 'running').length}/2 UNITS`}
          </span>
        </div>
        <div className="stat-row">
          <span>Servers</span>
          <span className={stats.online === stats.total ? 'text-ok' : 'text-warn'}>
            {stats.online}/{stats.total} UP
          </span>
        </div>
        <div className="stat-row">
          <span>Avg temp</span>
          <span className={stats.avgTemp > 55 ? 'text-bad' : stats.avgTemp > 45 ? 'text-warn' : 'text-ok'}>
            {stats.avgTemp.toFixed(1)}°C
          </span>
        </div>
        {s.mode === 'engineer' && (
          <>
            <div className="stat-row">
              <span>IT load</span>
              <span>{stats.itPowerKw.toFixed(1)} kW</span>
            </div>
            <div className="stat-row">
              <span>PUE</span>
              <span>{stats.pue ? stats.pue.toFixed(2) : '—'}</span>
            </div>
          </>
        )}
      </div>

      {/* top-right: toggles */}
      <div className="panel toggles">
        <button
          className={`tgl ${s.mode === 'engineer' ? 'active' : ''}`}
          onClick={() => s.setMode(s.mode === 'beginner' ? 'engineer' : 'beginner')}
          title="Switch between simple and technical explanations"
        >
          {s.mode === 'beginner' ? '🎓 Beginner' : '🛠 Engineer'}
        </button>
        <button
          className={`tgl ${s.view === 'thermal' ? 'thermal-on' : ''}`}
          onClick={() => s.setView(s.view === 'thermal' ? 'normal' : 'thermal')}
          title="Thermal view (T)"
        >
          {s.view === 'thermal' ? '🌡 Thermal' : '👁 Normal'}
        </button>
        <button className="tgl" onClick={() => s.toggleMuted()} title="Mute (M)" aria-label={s.muted ? 'Unmute sound' : 'Mute sound'}>
          {s.muted ? '🔇' : '🔊'}
        </button>
        <button
          className={`tgl ${s.overlay === 'progress' ? 'active' : ''}`}
          onClick={() => s.setOverlay(s.overlay === 'progress' ? 'none' : 'progress')}
          title="Progress & badges"
          aria-label="Progress and badges"
        >
          🏆 {s.achievements.length}/{Object.keys(ACHIEVEMENTS).length}
        </button>
        <button
          className={`tgl ${s.overlay === 'help' ? 'active' : ''}`}
          onClick={() => s.setOverlay(s.overlay === 'help' ? 'none' : 'help')}
          aria-label="Help"
        >
          ?
        </button>
      </div>

      {/* critical alert banner */}
      {criticalAlert && !s.requestFlow.active && (
        <div className="alert-banner">
          🚨 {criticalAlert.text}
        </div>
      )}

      {/* mission panel */}
      {s.mission && (
        <div className={`panel mission-panel ${s.mission.complete ? 'complete' : ''}`}>
          <div className="panel-title">
            {s.mission.complete ? '✅ ' : '🎯 '}
            {s.mission.title}
          </div>
          {s.mission.steps.map((st, i) => (
            <div key={i} className={`mission-step ${st.done ? 'done' : ''}`}>
              <span className="tick">{st.done ? '✔' : '○'}</span> {st.text}
            </div>
          ))}
          {s.mission.complete && (
            <button className="act-btn primary" style={{ marginTop: 8 }} onClick={() => s.abandonMission()}>
              Finish
            </button>
          )}
        </div>
      )}

      {/* follow-a-request captions & controls */}
      {s.requestFlow.active && s.requestFlow.step >= 0 && (
        <div className="request-bar">
          <div className="request-step-title">{REQUEST_STEPS[s.requestFlow.step].title}</div>
          <div className="request-step-text">
            {s.mode === 'engineer' ? REQUEST_STEPS[s.requestFlow.step].tech : REQUEST_STEPS[s.requestFlow.step].text}
          </div>
          <div className="request-controls">
            <button onClick={() => s.setRequestPlaying(!s.requestFlow.playing)}>
              {s.requestFlow.playing ? '⏸ Pause' : '▶ Play'}
            </button>
            {[0.5, 1, 2].map((sp) => (
              <button key={sp} className={s.requestFlow.speed === sp ? 'active' : ''} onClick={() => s.setRequestSpeed(sp)}>
                {sp}×
              </button>
            ))}
            <button onClick={() => s.startRequestFlow()}>↻ Replay</button>
            <button onClick={() => s.endRequestFlow(false)}>✕ Exit</button>
          </div>
        </div>
      )}

      {/* toasts */}
      <div className="toasts">
        {s.toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => s.dismissToast(t.id)}>
            {t.text}
          </div>
        ))}
      </div>

      {/* click-to-resume overlay */}
      {showResume && (
        <div
          className="resume-overlay"
          onClick={() => {
            const canvas = document.querySelector('canvas')
            canvas?.requestPointerLock()
          }}
        >
          <div className="resume-box">
            <div className="resume-title">Click to explore</div>
            <div className="resume-sub">
              <kbd>WASD</kbd> move · <kbd>mouse</kbd> look · <kbd>click</kbd>/<kbd>E</kbd> interact · <kbd>T</kbd> thermal ·{' '}
              <kbd>Esc</kbd> release mouse
            </div>
            {!s.badgeScanned && <div className="resume-tip">🪪 First stop: grab a badge at the glowing kiosk to unlock the server hall</div>}
          </div>
        </div>
      )}

      {/* progress overlay */}
      {s.overlay === 'progress' && (
        <div className="overlay-wrap" onClick={(e) => e.target === e.currentTarget && s.setOverlay('none')}>
          <div className="overlay-box">
            <button className="card-close" onClick={() => s.setOverlay('none')}>✕</button>
            <h2>🏆 Your progress</h2>
            <div className="badge-grid">
              {Object.entries(ACHIEVEMENTS).map(([id, a]) => {
                const got = s.achievements.includes(id)
                return (
                  <div key={id} className={`badge ${got ? 'got' : ''}`}>
                    <div className="badge-icon">{got ? a.icon : '🔒'}</div>
                    <div className="badge-title">{a.title}</div>
                    <div className="badge-desc">{a.desc}</div>
                  </div>
                )
              })}
            </div>
            <div className="progress-line">
              Equipment types discovered: {s.discovered.length} / {Object.keys(EQUIP_INFO).length}
            </div>
          </div>
        </div>
      )}

      {/* help overlay */}
      {s.overlay === 'help' && (
        <div className="overlay-wrap" onClick={(e) => e.target === e.currentTarget && s.setOverlay('none')}>
          <div className="overlay-box">
            <button className="card-close" onClick={() => s.setOverlay('none')}>✕</button>
            <h2>How to play</h2>
            <ul className="help-list">
              <li><b>Move:</b> WASD / arrow keys · hold Shift to run · mouse to look</li>
              <li><b>Interact:</b> aim the crosshair at anything glowing-labelled and click (or press E)</li>
              <li><b>Badge first:</b> scan a visitor badge at the lobby kiosk to open the security door</li>
              <li><b>Open racks:</b> click a rack door to swing it open, then click individual servers</li>
              <li><b>Thermal view (T):</b> see which racks run hot and where the cold air goes</li>
              <li><b>Beginner/Engineer:</b> toggle for plain-English or deep technical details</li>
              <li><b>Break things:</b> cut the grid power at the UPS, fail a cooling unit — it's a sandbox, experiment!</li>
              <li><b>Missions:</b> start one at the monitoring station (NOC desk, back of the hall)</li>
              <li><b>Follow a request:</b> at the network cabinet — watch a web request race through the hall</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

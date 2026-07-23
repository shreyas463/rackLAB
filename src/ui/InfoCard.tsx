import { useStore } from '../store'
import { EQUIP_INFO } from '../data'
import { serverPowerDraw } from '../sim/model'

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    online: 'ok',
    running: 'ok',
    warning: 'warn',
    critical: 'bad',
    failed: 'bad',
    off: 'off',
  }
  return <span className={`pill pill-${map[status] ?? 'off'}`}>{status.toUpperCase()}</span>
}

export function InfoCard() {
  const s = useStore()
  const id = s.selectedId
  if (!id) return null

  const [kind, rest] = id.includes(':') ? id.split(':') : [id, '']
  const info = EQUIP_INFO[kind]
  if (!info) return null

  let subtitle = info.techName
  let status: string | null = null
  let engineerRows: [string, string][] = []
  const actions: { label: string; onClick: () => void; danger?: boolean; primary?: boolean }[] = []
  let title: string = info.title
  let simpleOverride: string | null = null
  let factOverride: string | null = null

  const close = () => s.select(null)

  if (kind === 'server') {
    const srv = s.servers[rest]
    if (!srv) return null
    const isGpu = srv.kind === 'gpu'
    title = `Server ${srv.id}`
    subtitle = isGpu ? 'GPU / AI accelerator node' : info.techName
    if (isGpu) {
      simpleOverride =
        'This is a GPU server — the kind that trains and runs AI models. It’s far more powerful than a normal server, but it also guzzles electricity and runs very hot.'
      factOverride =
        'A single rack of AI GPU servers can draw more power than an entire street of houses — which is why AI is reshaping how data centers are cooled and powered.'
    }
    status = srv.status
    const draw = serverPowerDraw(srv.status, srv.workload, srv.kind)
    engineerRows = [
      ['Hostname', srv.name],
      ['IP address', srv.ip],
      ['Type', isGpu ? '8× GPU accelerator' : 'General-purpose CPU'],
      ['Rack / unit', `${srv.rackId} · U${srv.unit * 2}`],
      [isGpu ? 'GPU load' : 'CPU load', `${srv.workload.toFixed(0)}%`],
      ['Inlet temp', `${srv.temp.toFixed(1)}°C`],
      ['Power draw', `${draw.toFixed(0)} W`],
      ['Memory', isGpu ? '1.1 TB HBM3 + 2 TB DDR5' : '256 GB DDR5'],
      ['Storage', '2 × 3.84 TB NVMe'],
    ]
    if (srv.status === 'failed') {
      actions.push({ label: '🔧 Repair & restart', onClick: () => s.restartServer(rest), primary: true })
    } else {
      actions.push({
        label: srv.status === 'off' ? '🔌 Power on' : '⏻ Power off',
        onClick: () => s.toggleServerPower(rest),
        primary: srv.status === 'off',
        danger: srv.status !== 'off',
      })
      if (srv.status !== 'off') {
        actions.push({ label: '🤖 Run AI training job (max load)', onClick: () => s.setServerWorkload(rest, 100) })
      }
    }
  } else if (kind === 'rack') {
    const rack = s.racks[rest]
    if (!rack) return null
    title = rack.name
    const temps = rack.serverIds.map((sid) => s.servers[sid].temp)
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length
    const up = rack.serverIds.filter((sid) => !['off', 'failed'].includes(s.servers[sid].status)).length
    status = avg > 60 ? 'critical' : avg > 50 ? 'warning' : 'online'
    engineerRows = [
      ['Servers online', `${up} / ${rack.serverIds.length}`],
      ['Avg inlet temp', `${avg.toFixed(1)}°C`],
      ['Cooling zone', rack.coolerId],
      ['Power feed', 'PDU-A + PDU-B (redundant)'],
      ['Capacity', '42U · 12U used'],
    ]
    actions.push({ label: rack.doorOpen ? '🚪 Close door' : '🚪 Open door', onClick: () => s.toggleRackDoor(rest), primary: true })
  } else if (kind === 'cooling') {
    const unit = s.cooling[rest]
    if (!unit) return null
    title = unit.name
    status = unit.status
    const powered = s.power.grid || s.power.gen === 'running'
    engineerRows = [
      ['Fan speed', `${unit.fanSpeed} RPM`],
      ['Cooling capacity', unit.status === 'running' ? '45 kW' : '0 kW'],
      ['Supply air', unit.status === 'running' ? '18°C' : '—'],
      ['Power source', powered ? (s.power.grid ? 'Utility grid' : 'Generator') : '✖ NO POWER'],
      ['Zone', rest === 'CU-1' ? 'Row A' : 'Row B'],
    ]
    if (unit.status === 'failed') {
      actions.push({ label: '🔧 Restart unit', onClick: () => s.setCoolingStatus(rest, 'running'), primary: true })
    } else if (unit.status === 'running') {
      actions.push({ label: '⏻ Turn off', onClick: () => s.setCoolingStatus(rest, 'off'), danger: true })
      actions.push({ label: '💥 Simulate failure', onClick: () => s.setCoolingStatus(rest, 'failed'), danger: true })
    } else {
      actions.push({ label: '▶ Turn on', onClick: () => s.setCoolingStatus(rest, 'running'), primary: true })
    }
  } else if (kind === 'ups') {
    status = s.power.grid ? 'online' : s.power.ups > 0 ? 'warning' : 'failed'
    engineerRows = [
      ['Battery charge', `${s.power.ups.toFixed(0)}%`],
      ['Est. runtime', s.power.grid ? '~75 s at full load' : `${Math.round(s.power.ups * 0.75)} s remaining`],
      ['Grid input', s.power.grid ? 'ONLINE' : '✖ LOST'],
      ['Output', s.power.grid || s.power.gen === 'running' || s.power.ups > 0 ? 'Stable 400V' : 'NONE'],
      ['Backs up', 'Server racks only — not cooling'],
    ]
    if (s.power.grid) {
      actions.push({ label: '💥 Experiment: cut grid power', onClick: () => s.cutGrid(), danger: true })
    } else {
      actions.push({ label: '🔌 Restore grid power', onClick: () => s.restoreGrid(), primary: true })
    }
  } else if (kind === 'generator') {
    status = s.power.gen === 'running' ? 'running' : s.power.gen === 'starting' ? 'warning' : 'off'
    engineerRows = [
      ['State', s.power.gen.toUpperCase() + (s.power.gen === 'starting' ? ` (${s.power.genTimer.toFixed(0)}s)` : '')],
      ['Fuel', 'Diesel · 92% tank'],
      ['Rated output', '800 kW'],
      ['Start time', '~8 seconds'],
      ['Runtime at full tank', '~48 hours'],
    ]
    if (s.power.gen === 'off') {
      actions.push({ label: '🚀 Start generator', onClick: () => s.startGenerator(), primary: true })
    } else if (s.power.gen === 'running') {
      actions.push({ label: '⏻ Stop generator', onClick: () => s.stopGenerator(), danger: !s.power.grid })
    }
  } else if (kind === 'netcab') {
    status = 'online'
    // Traffic tracks the live workload across the hall, so the readout moves
    // with the simulation instead of jittering randomly.
    const load = Object.values(s.servers).reduce((a, b) => a + b.workload, 0)
    engineerRows = [
      ['Uplink', '2 × 100 Gbit/s fiber (diverse paths)'],
      ['Core switches', '4 × 48-port'],
      ['Traffic', `${(0.4 + load / 320).toFixed(1)} Gbit/s`],
      ['Packet loss', '0.00%'],
      ['Connected servers', '36'],
    ]
    actions.push({ label: '📦 Follow a web request', onClick: () => s.startRequestFlow(), primary: true })
  } else if (kind === 'noc') {
    status = s.alerts.some((a) => a.severity === 'critical') ? 'critical' : 'online'
    engineerRows = s.alerts.slice(0, 5).map((a) => [a.time, a.text]) as [string, string][]
    if (engineerRows.length === 0) engineerRows = [['—', 'No active alerts. All systems nominal.']]
    if (!s.mission || s.mission.complete) {
      actions.push({ label: '🚨 Start mission: The Overheating Rack', onClick: () => s.startMission(), primary: true })
      actions.push({ label: '🌱 Start mission: Right-Size the Facility (energy)', onClick: () => s.startEnergyMission() })
    }
    if (s.alerts.length > 0) actions.push({ label: '✔ Acknowledge all alerts', onClick: () => s.ackAlerts() })
  } else if (kind === 'badge') {
    status = s.badgeScanned ? 'online' : 'off'
    engineerRows = [
      ['Badge status', s.badgeScanned ? 'ISSUED — hall access granted' : 'Not issued'],
      ['Access level', 'Visitor · escorted'],
      ['Log', 'All entries recorded'],
    ]
    if (!s.badgeScanned) {
      actions.push({ label: '🪪 Scan visitor badge', onClick: () => s.scanBadge(), primary: true })
    }
  } else if (kind === 'reception') {
    engineerRows = [
      ['Facility', 'RackLab DC-01'],
      ['Capacity', '6 racks · 36 servers (demo hall)'],
      ['Tip', 'Grab a badge from the kiosk to enter →'],
    ]
  }

  return (
    <div className="infocard-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="infocard">
        <button className="card-close" onClick={close}>
          ✕
        </button>
        <div className="card-head">
          <h2>{title}</h2>
          {status && <StatusPill status={status} />}
        </div>
        <div className="card-tech-name">{s.mode === 'engineer' ? info.techName : subtitle}</div>
        <p className="card-simple">{s.mode === 'beginner' ? simpleOverride ?? info.simple : info.purpose}</p>

        {s.mode === 'engineer' && engineerRows.length > 0 && (
          <div className="card-section-label">{kind === 'noc' ? 'Recent alerts' : 'Live telemetry'}</div>
        )}
        {s.mode === 'engineer' && engineerRows.length > 0 && (
          <div className="card-table">
            {engineerRows.map(([k, v]) => (
              <div className="row" key={k + v}>
                <span>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}
        {s.mode === 'beginner' && kind === 'noc' && s.alerts.length > 0 && (
          <div className="card-table">
            {s.alerts.slice(0, 4).map((a) => (
              <div className="row" key={a.id}>
                <span>{a.time}</span>
                <span className={a.severity === 'critical' ? 'text-bad' : a.severity === 'warning' ? 'text-warn' : ''}>{a.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card-fact">💡 {factOverride ?? info.fact}</div>

        {actions.length > 0 && (
          <div className="card-actions">
            {actions.map((a) => (
              <button
                key={a.label}
                className={`act-btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''}`}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
        <div className="card-hint">Click outside or press Esc to close · switch Beginner/Engineer up top for {s.mode === 'beginner' ? 'deeper tech specs' : 'plain-English explanations'}</div>
      </div>
    </div>
  )
}

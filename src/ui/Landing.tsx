import { useStore } from '../store'

export function Landing() {
  const enter = useStore((s) => s.enter)
  return (
    <div className="landing">
      <div className="landing-grid" />
      <div className="landing-inner">
        <div className="landing-badge">INTERACTIVE 3D EXPERIENCE</div>
        <h1>
          Rack<span>Lab</span>
        </h1>
        <p className="tagline">
          Ever wondered where the internet actually <em>lives</em>? Step inside a working data center. Open the racks,
          break the cooling, cut the power, chase a web request at the speed of light — and learn how the cloud really works.
        </p>
        <div className="feature-chips">
          <div className="chip">🏢 Explore a real server hall</div>
          <div className="chip">🌡️ Thermal X-ray vision</div>
          <div className="chip">📦 Follow a web request</div>
          <div className="chip">⚡ Survive a power outage</div>
          <div className="chip">🚨 Fix an overheating rack</div>
          <div className="chip">🏆 Earn achievements</div>
        </div>
        <button className="enter-btn" onClick={enter}>
          ▶ Enter the Data Center
        </button>
        <div className="controls-hint">
          <div>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> move
          </div>
          <div>
            <span className="mouse-ico">🖱️</span> look around
          </div>
          <div>
            <kbd>Click</kbd> / <kbd>E</kbd> interact
          </div>
          <div>
            <kbd>T</kbd> thermal view
          </div>
          <div>
            <kbd>Shift</kbd> run
          </div>
          <div>
            <kbd>Esc</kbd> release mouse
          </div>
        </div>
        <div className="landing-note">Best on desktop · headphones recommended 🎧</div>
      </div>
    </div>
  )
}

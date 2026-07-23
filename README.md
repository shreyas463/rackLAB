<div align="center">

# 🖥️ RackLab

### An interactive 3D data-center playground for the browser

Walk through a working data center in first person. Open the racks, break the
cooling, cut the power, and chase a web request at the speed of light — and
learn how the cloud physically works along the way.

**No backend. No install beyond `npm`. The whole simulation runs in your browser.**

### ▶︎ [**Play it live**](https://shreyas463.github.io/rackLAB/)

[![CI](https://github.com/shreyas463/rackLAB/actions/workflows/deploy.yml/badge.svg)](https://github.com/shreyas463/rackLAB/actions/workflows/deploy.yml)
![Tests](https://img.shields.io/badge/tests-38%20passing-34d399)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

`Vite` · `React` · `TypeScript` · `Three.js` · `React Three Fiber` · `Zustand`

<br>

![RackLab — badging into the server hall, then inspecting a GPU node in thermal view](docs/media/demo.gif)

<sub>Badging in at the lobby kiosk, walking into the server hall, then flipping
to thermal view — the GPU/AI rack glows hot under a training job while the live
telemetry panel tracks its 1.9 kW draw and rising inlet temperature.</sub>

</div>

---

## ▶ Quick start

```bash
npm install
npm run dev        # → http://localhost:5180
```

```bash
npm run build      # type-check + production bundle into dist/
npm test           # run the simulation unit tests (Vitest)
```

## 🎮 Controls

| Action | Keys |
| --- | --- |
| Move | `W` `A` `S` `D` or arrow keys |
| Look | mouse |
| Run | hold `Shift` |
| Interact | `click` or `E` (aim the crosshair at anything with a label) |
| Thermal view | `T` |
| Mute | `M` |
| Release mouse | `Esc` |

**First stop:** grab a visitor badge at the glowing lobby kiosk — it unlocks the
security door into the server hall.

## ✨ What's inside

A single, highly-polished server hall plus a security lobby, everything driven
by a live cause-and-effect simulation rather than being decorative:

- **Explore in first person** — a lobby with badge-gated security doors, then a
  server hall with hot/cold aisles, overhead cable trays, and ambient lighting.
- **6 openable racks · 36 simulated servers** — swing the glass doors open,
  inspect individual servers (live temp, workload, IP, power draw), power them
  on/off, or repair a failed one. One rack is a **GPU/AI rack** — hotter and far
  more power-hungry, just like the real thing.
- **Thermal view** (`T`) — the room recolors by temperature; cold aisles glow
  blue, stressed racks glow red.
- **Live power chain** — cut the utility grid and the **UPS** batteries carry the
  servers (but *not* the cooling), so temperatures climb until you start the
  **diesel generator** — which needs 8 seconds to stabilize. Miss the window and
  the batteries run dry.
- **Follow a Request** — trigger it at the network cabinet and watch a glowing
  packet travel from the fiber uplink → firewall → load balancer → web server →
  storage and back, narrated step by step with play/pause/replay and speed control.
- **Beginner / Engineer modes** — flip every info card between plain-English
  explanations (+ a fun fact) and real specs (IPs, PUE, kW, redundancy).
- **Missions**
  - *The Overheating Rack* — a CRAC unit fails; diagnose it in thermal view and
    restore cooling before servers thermally shut down.
  - *Right-Size the Facility* — the power bill is out of control; consolidate
    workloads and shut down the GPU/AI rack to get facility power under target
    **without** dropping below a minimum service level.
- **Sandbox experiments** — cut grid power, fail a cooling unit, max out a server
  with an "AI training job," and watch the consequences ripple through temps,
  alerts, alarms, and the NOC dashboards.
- **Procedural audio** — server-room hum, interaction blips, door whooshes, and a
  two-tone alarm, all synthesized with the Web Audio API (no audio files).
- **Achievements + live NOC** — a monitoring desk renders real-time temperature,
  alert, and power/PUE dashboards onto its screens.

## 🏛️ Architecture

The design goal was a clean separation between the **simulation** (pure,
testable), the **state/orchestration** (Zustand), and the **presentation**
(React Three Fiber + a React HUD).

```
src/
├── sim/
│   ├── model.ts        # PURE simulation: thermal model, power chain, PUE.
│   │                   #   No React/Three/DOM — just input→output functions.
│   └── model.test.ts   # Vitest unit tests over that model.
├── store.ts            # Zustand store: world state + a fixed-timestep tick()
│                       #   that calls the pure model and wires up side effects.
├── store.test.ts       # Gameplay tests: missions, achievements, outage flow.
├── layout.ts           # World geometry, collision boxes, rack/equipment placement.
├── data.ts             # Educational copy for every equipment type + request steps.
├── audio.ts            # Procedural Web Audio engine (ambience, SFX, alarm).
├── three/              # The 3D world (React Three Fiber)
│   ├── Scene.tsx       #   canvas, lighting, fog, assembly
│   ├── Facility.tsx    #   room shell, lobby, security doors, signage
│   ├── Rack.tsx        #   racks with animated doors + blinking servers
│   ├── Equipment.tsx   #   cooling, UPS, generator, network cabinet, NOC desk
│   ├── Player.tsx      #   first-person controller: movement, collision, raycast
│   └── RequestFlow.tsx #   the animated "follow a request" packet
└── ui/                 # The 2D overlay (plain React + CSS)
    ├── Landing.tsx     #   animated landing page
    ├── HUD.tsx         #   status, toggles, missions, toasts, overlays
    └── InfoCard.tsx    #   the equipment inspector / action panel
```

### Why the simulation is a separate, pure module

Everything interesting about RackLab is cause-and-effect: cooling failure →
rising temperature → thermal shutdown; grid loss → UPS drain → generator race.
Keeping that logic in [`src/sim/model.ts`](src/sim/model.ts) as side-effect-free
functions means it can be **unit-tested in isolation** — the tests assert that a
GPU box runs hotter than a CPU box at equal load, that the UPS empties in roughly
its rated runtime, that the generator race resolves correctly, and that a
well-cooled server stays healthy while a starved one runs away to shutdown. The
Zustand `tick()` is then a thin layer that feeds state through the model and
attaches the audio/alert side effects.

A second suite drives the store itself — mission progressions, achievement
unlocks, the badge/security flow, and the full grid-loss → UPS-drain →
generator-rescue sequence run end-to-end in Node, no browser required.

```bash
npm test    # 38 passing tests across both suites
```

## 🚀 Deploy

The production build is fully static (`dist/`) with a relative asset base, so it
drops onto any static host:

- **GitHub Pages** — the included [workflow](.github/workflows/deploy.yml) tests,
  builds, and publishes on every push to `main`. Enable Pages → "GitHub Actions"
  in the repo settings.
- **Vercel / Netlify** — import the repo; config is committed
  ([`vercel.json`](vercel.json), [`netlify.toml`](netlify.toml)). Zero settings.

## ⚙️ Engineering highlights

The parts of this project I'd want a reviewer to look at:

- **A pure, unit-tested simulation core.** All cause-and-effect physics
  (thermals, the power chain, PUE, per-server electrical draw) live in
  [`src/sim/model.ts`](src/sim/model.ts) with zero framework imports — one
  source of truth consumed by the HUD, the 3D scene, the info cards, and the
  mission logic alike, covered by 27 unit tests — with 11 more driving the
  store's gameplay orchestration on top of it.
- **78% smaller initial payload via code-splitting.** The three.js/R3F world
  (~830 kB) is lazy-loaded behind the landing page, which ships as a **64 kB
  gzip** entry chunk and prefetches the 3D bundle while the visitor reads the
  intro — instant first paint, no loading wall.
- **Zero art assets.** Every mesh is procedural geometry, every label and NOC
  dashboard is a live `<canvas>` texture, and all audio (ambient hum, blips,
  alarms) is synthesized from oscillators and filtered noise with the Web Audio
  API. The entire visual+audio identity compiles from source.
- **Frame-loop discipline.** LED blinking, fan spin, door physics, the packet
  trail, and rack thermal overlays mutate three.js objects in `useFrame` —
  React re-renders are reserved for actual state changes, and the sim ticks at
  a fixed 2 Hz timestep independent of frame rate.
- **Persistent progress.** Achievements, discovered equipment, and badge access
  survive refreshes via a partialized Zustand `persist` — the live simulation
  itself always boots fresh.
- **Tooling as a feature.** Strict TypeScript, ESLint with the React compiler
  rules (`react-hooks` v7 purity/refs checks), and a CI pipeline that lints,
  tests, builds, and deploys to GitHub Pages on every push.
- **Designed with a token system.** The UI is built on CSS design tokens
  (palette, type scale, radii, shadows, glass surfaces) with Inter + JetBrains
  Mono, `prefers-reduced-motion` support, and keyboard focus states.
- Debug hooks are exposed on `window.racklab` (the Zustand store) and
  `window.teleport` for tinkering from the console.

## 🗺️ Roadmap

The [product brief](docs/PRODUCT_BRIEF.md) lays out the full vision. Natural next
steps the architecture already supports: build mode, the remaining missions, a
guided-tour character, a mini-map, touch controls for mobile, instanced
rendering for a much larger hall, and a colorblind-safe status palette.

## 📄 License

See [LICENSE](LICENSE).

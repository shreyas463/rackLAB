// Records the README demo GIF: a scripted first-person walkthrough captured as
// full-viewport PNG frames, so the DOM HUD (status panel, toasts, info card) is
// recorded alongside the WebGL scene.
//
// Usage:
//   npm run dev                      # in one terminal
//   npm i --no-save playwright       # one-off, reuses any cached browser
//   node docs/media/capture-demo.mjs
//   ffmpeg -y -framerate 12 -i docs/media/frames/%04d.png \
//     -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];\
//          [s0]palettegen=max_colors=96:stats_mode=diff[p];\
//          [s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
//     -loop 0 docs/media/demo.gif
//
// The camera is driven through the `window.teleport` debug hook and the world
// through `window.racklab` (the Zustand store), since pointer lock can't be
// synthesized from an automation context.
import { chromium } from 'playwright'
import { mkdirSync, rmSync } from 'node:fs'

const OUT = new URL('./frames/', import.meta.url).pathname
const APP = process.env.APP_URL ?? 'http://localhost:5180'

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

// Headed Chrome: headless software GL renders the scene far more slowly.
const browser = await chromium.launch({ channel: 'chrome', headless: false })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })

await page.goto(APP, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.removeItem('racklab-progress'))
await page.reload({ waitUntil: 'networkidle' })

await page.evaluate(() => {
  const st = window.racklab.getState()
  st.enter()
  st.setMode('engineer')
  window.racklab.setState({ pointerLocked: true })
})
await page.waitForTimeout(2500) // 3D chunk load + scene settle

let frame = 0
const shoot = () => page.screenshot({ path: `${OUT}${String(frame++).padStart(4, '0')}.png` })

async function pose(x, z, yaw, pitch) {
  await page.evaluate(([x, z, yaw, pitch]) => {
    window.teleport = { x, z, yaw, pitch }
  }, [x, z, yaw, pitch])
  await page.waitForTimeout(45) // let Player consume the teleport and redraw
  await shoot()
}

async function dolly(from, to, n, hooks = {}) {
  for (let i = 0; i < n; i++) {
    const t = ease(i / Math.max(1, n - 1))
    if (hooks[i]) await page.evaluate(hooks[i])
    await pose(...[0, 1, 2, 3].map((k) => lerp(from[k], to[k], t)))
  }
}

const LOOK_LEFT = 1.35 // faces the rack row across the aisle
const LOOK_GPU = -0.78 // faces rack B3, the GPU/AI rack

// Lobby → security door. The GPU rack picks up a training job early so it has
// time to heat up before the thermal reveal.
await dolly([0, 7.0, 0, 0], [0, 1.2, 0, 0], 18, {
  6: () => window.racklab.getState().scanBadge(),
  10: () => {
    const st = window.racklab.getState()
    for (const id of st.racks['B3'].serverIds) st.setServerWorkload(id, 96)
  },
})
await dolly([0, 1.2, 0, 0], [2, -2.6, 0, 0], 14) // through the door
await dolly([2, -2.6, 0, 0], [2, -3.6, LOOK_LEFT, 0], 10) // turn to the racks
await dolly([2, -3.6, LOOK_LEFT, 0], [2, -6.2, LOOK_LEFT, 0], 12) // down the aisle
await dolly([2, -6.2, LOOK_LEFT, 0], [2.3, -7.4, LOOK_GPU, 0], 16, {
  0: () => window.racklab.getState().setView('thermal'),
})

// Inspect a GPU node — the info card slides in over the hot rack.
await page.evaluate(() => window.racklab.getState().select('server:B3-2'))
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(55)
  await shoot()
}

console.log(`captured ${frame} frames → ${OUT}`)
await browser.close()

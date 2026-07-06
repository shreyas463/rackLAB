// Procedural WebAudio engine — no audio assets needed. Ambient server-room
// hum, interaction blips, door whooshes and a two-tone alarm.

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambientGain: GainNode | null = null
  private alarmTimer: number | null = null
  private alarmOsc: OscillatorNode | null = null
  private muted = false

  start() {
    if (this.ctx) {
      this.ctx.resume()
      return
    }
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    this.master.connect(ctx.destination)

    // Ambient: filtered noise (fan wash) + low hum oscillators.
    this.ambientGain = ctx.createGain()
    this.ambientGain.gain.value = 0.0
    this.ambientGain.connect(this.master)

    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02 // brown-ish noise
      data[i] = last * 3.5
    }
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    noise.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.5
    noise.connect(lp).connect(noiseGain).connect(this.ambientGain)
    noise.start()

    for (const [freq, vol] of [
      [58, 0.10],
      [116, 0.05],
      [176, 0.02],
    ] as const) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const g = ctx.createGain()
      g.gain.value = vol
      osc.connect(g).connect(this.ambientGain)
      osc.start()
    }
    // Fade the ambience in gently.
    this.ambientGain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2.5)
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(m ? 0 : 1, this.ctx.currentTime + 0.15)
    }
  }

  private env(node: GainNode, peak: number, attack: number, decay: number) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    node.gain.setValueAtTime(0, t)
    node.gain.linearRampToValueAtTime(peak, t + attack)
    node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  blip(freq = 880, decay = 0.12, type: OscillatorType = 'square', peak = 0.06) {
    if (!this.ctx || !this.master) return
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const g = this.ctx.createGain()
    osc.connect(g).connect(this.master)
    this.env(g, peak, 0.005, decay)
    osc.start()
    osc.stop(this.ctx.currentTime + decay + 0.1)
  }

  select() {
    this.blip(660, 0.08, 'sine', 0.08)
    this.blip(990, 0.1, 'sine', 0.05)
  }

  deny() {
    this.blip(220, 0.18, 'sawtooth', 0.07)
    this.blip(180, 0.25, 'sawtooth', 0.06)
  }

  success() {
    if (!this.ctx) return
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.22, 'triangle', 0.09), i * 110),
    )
  }

  door() {
    if (!this.ctx || !this.master) return
    // Filtered noise whoosh.
    const src = this.ctx.createBufferSource()
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    src.buffer = buf
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 600
    const g = this.ctx.createGain()
    src.connect(bp).connect(g).connect(this.master)
    this.env(g, 0.12, 0.03, 0.4)
    src.start()
  }

  powerDown() {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(300, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.9)
    const g = this.ctx.createGain()
    osc.connect(g).connect(this.master!)
    this.env(g, 0.1, 0.01, 0.9)
    osc.start()
    osc.stop(this.ctx.currentTime + 1.1)
  }

  setAlarm(on: boolean) {
    if (!this.ctx || !this.master) return
    if (on && this.alarmTimer == null) {
      const osc = this.ctx.createOscillator()
      osc.type = 'triangle'
      const g = this.ctx.createGain()
      g.gain.value = 0.028
      osc.connect(g).connect(this.master)
      osc.frequency.value = 660
      osc.start()
      this.alarmOsc = osc
      let hi = false
      this.alarmTimer = window.setInterval(() => {
        hi = !hi
        if (this.alarmOsc) this.alarmOsc.frequency.value = hi ? 880 : 660
      }, 420)
    } else if (!on && this.alarmTimer != null) {
      window.clearInterval(this.alarmTimer)
      this.alarmTimer = null
      this.alarmOsc?.stop()
      this.alarmOsc = null
    }
  }
}

export const sfx = new AudioEngine()

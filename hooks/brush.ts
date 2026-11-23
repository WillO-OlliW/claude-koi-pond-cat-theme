// Shared drawing tools for the painted scenes: seeded randomness, smooth
// noise, and brush-like shapes (tapered strokes with ragged edges, dry-brush
// bristles, wobbly washes), written out as compact SVG path data.

export type P = [number, number]
export type Rand = () => number

export function seeded(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const between = (rand: Rand, lo: number, hi: number): number => lo + rand() * (hi - lo)

// Smooth value noise in [-1, 1] over t in [0, 1]; `loop` makes it wrap.
export function noise(rand: Rand, cells: number, loop = false): (t: number) => number {
  const values = Array.from({ length: cells + 1 }, () => rand() * 2 - 1)

  if (loop) {
    values[cells] = values[0]!
  }
  return t => {
    const x = Math.min(Math.max(loop ? ((t % 1) + 1) % 1 : t, 0), 1) * cells
    const i = Math.min(Math.floor(x), cells - 1)
    const f = x - i
    const s = f * f * (3 - 2 * f)
    const a = values[i]!
    const b = values[i + 1]!
    return a + (b - a) * s
  }
}

// Noise with finer detail layered on, still in about [-1, 1].
export function rough(rand: Rand, cells: number, loop = false, octaves = 3): (t: number) => number {
  const layers = Array.from({ length: octaves }, (_, k) => noise(rand, cells * 2 ** k, loop))
  let total = 0

  for (let k = 0; k < octaves; k++) {
    total += 0.5 ** k
  }
  return t => layers.reduce((sum, layer, k) => sum + layer(t) * 0.5 ** k, 0) / total
}

// Path data: the first point absolute, then whole-number steps between
// rounded points, so the shape never drifts and the text stays short.
export function poly(points: readonly P[], close = true): string {
  const out: number[] = []
  let x0 = 0
  let y0 = 0
  let first = ''

  points.forEach((p, i) => {
    const x = Math.round(p[0])
    const y = Math.round(p[1])

    if (i === 0) {
      first = `M${x} ${y}`
    } else if (x !== x0 || y !== y0) {
      out.push(x - x0, y - y0)
    }
    x0 = x
    y0 = y
  })
  const steps = out.length > 0 ? `l${out.join(' ').replace(/ -/g, '-')}` : ''
  return `${first}${steps}${close ? 'z' : ''}`
}

export function polys(list: readonly (readonly P[])[], close = true): string {
  return list.map(points => poly(points, close)).join('')
}

// Round dots, drawn as zero-length segments with round caps on a stroked path.
export function dots(points: readonly P[]): string {
  return points.map(([x, y]) => `M${Math.round(x)} ${Math.round(y)}h0`).join('')
}

function frame(c: (t: number) => P, t: number): { p: P; n: P } {
  const e = 0.002
  const a = c(Math.max(0, t - e))
  const b = c(Math.min(1, t + e))
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  return { p: c(t), n: [-dy / len, dx / len] }
}

export type StrokeOptions = { n?: number; wobble?: number; cells?: number }

// A brush stroke along a centreline, `width(t)` wide, each edge ragged on its own.
export function stroke(rand: Rand, c: (t: number) => P, width: (t: number) => number, opts: StrokeOptions = {}): P[] {
  const n = opts.n ?? 40
  const wobble = opts.wobble ?? 1.2
  const left = rough(rand, opts.cells ?? 6)
  const right = rough(rand, opts.cells ?? 6)
  const a: P[] = []
  const b: P[] = []

  for (let i = 0; i <= n; i++) {
    const t = i / n
    const { p, n: nv } = frame(c, t)
    const hw = width(t) / 2
    const damp = Math.min(1, hw / 3)
    const l = Math.max(0, hw + wobble * left(t) * damp)
    const r = Math.max(0, hw + wobble * right(t) * damp)
    a.push([p[0] + nv[0] * l, p[1] + nv[1] * l])
    b.push([p[0] - nv[0] * r, p[1] - nv[1] * r])
  }
  return a.concat(b.reverse())
}

export type BristleOptions = StrokeOptions & { count?: number; runOut?: number; gap?: number }

// A dry brush: bristles side by side that run out of ink at different points,
// leaving streaks of paper ("flying white") toward the end of the stroke.
export function bristles(rand: Rand, c: (t: number) => P, width: (t: number) => number, opts: BristleOptions = {}): P[][] {
  const count = opts.count ?? 7
  const runOut = opts.runOut ?? 0.6
  const gap = opts.gap ?? 0.25
  const shares = Array.from({ length: count }, () => 0.6 + rand())
  const total = shares.reduce((s, v) => s + v, 0)
  const out: P[][] = []
  let edge = -0.5

  for (const share of shares) {
    const span = share / total
    const lo = edge + span * gap * rand() * 0.5
    const hi = edge + span * (1 - gap * rand() * 0.5)
    edge += span
    const end = runOut + (1 - runOut) * rand()
    const mid = (lo + hi) / 2
    const centre = (t: number): P => {
      const tt = t * end
      const { p, n } = frame(c, tt)
      const off = mid * width(tt)
      return [p[0] + n[0] * off, p[1] + n[1] * off]
    }
    const w = (t: number): number => {
      const tt = t * end
      const taper = t > 0.8 ? Math.max(0, (1 - t) / 0.2) : 1
      return (hi - lo) * width(tt) * taper
    }
    out.push(stroke(rand, centre, w, { n: opts.n ?? 24, wobble: (opts.wobble ?? 0.8) * 0.6, cells: opts.cells ?? 5 }))
  }
  return out
}

// A closed wash: an ellipse whose edge wanders, turned by `rot` degrees.
export function blob(rand: Rand, cx: number, cy: number, rx: number, ry: number, rot = 0, wobble = 0.12, n = 40, cells = 5): P[] {
  const edge = rough(rand, cells, true)
  const cr = Math.cos((rot * Math.PI) / 180)
  const sr = Math.sin((rot * Math.PI) / 180)
  const out: P[] = []

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const k = 1 + wobble * edge(i / n)
    const x = Math.cos(a) * rx * k
    const y = Math.sin(a) * ry * k
    out.push([cx + x * cr - y * sr, cy + x * sr + y * cr])
  }
  return out
}

// Pushes each point of a closed outline in or out along its normal, so the
// same shape can be laid down twice without the edges lining up.
export function roughen(rand: Rand, points: readonly P[], amount: number, cells = 8, grow = 0): P[] {
  const edge = rough(rand, cells, true)
  const n = points.length
  let cx = 0
  let cy = 0

  for (const p of points) {
    cx += p[0] / n
    cy += p[1] / n
  }
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n]!
    const next = points[(i + 1) % n]!
    const dx = next[0] - prev[0]
    const dy = next[1] - prev[1]
    const len = Math.hypot(dx, dy) || 1
    let nx = dy / len
    let ny = -dx / len

    if (nx * (p[0] - cx) + ny * (p[1] - cy) < 0) {
      nx = -nx
      ny = -ny
    }
    const k = amount * edge(i / n) + grow
    return [p[0] + nx * k, p[1] + ny * k]
  })
}

// Scales an outline about its own middle.
export function swell(points: readonly P[], k: number): P[] {
  const n = points.length
  let cx = 0
  let cy = 0

  for (const p of points) {
    cx += p[0] / n
    cy += p[1] / n
  }
  return points.map(([x, y]): P => [cx + (x - cx) * k, cy + (y - cy) * k])
}

// An arc of a circle as a centreline, from angle a to b (degrees).
export const arc =
  (cx: number, cy: number, r: number, a: number, b: number) =>
  (t: number): P => {
    const ang = ((a + (b - a) * t) * Math.PI) / 180
    return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]
  }

// A quadratic curve as a centreline.
export const curve =
  (p0: P, p1: P, p2: P) =>
  (t: number): P => {
    const u = 1 - t
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]
  }

// Width profiles.
export const taper =
  (w: number, start = 0.15, end = 0.35) =>
  (t: number): number =>
    w * Math.min(1, t / start, (1 - t) / end) ** 0.7

export const swellIn =
  (w: number, peak = 0.3) =>
  (t: number): number =>
    w * (t < peak ? Math.sin((t / peak) * (Math.PI / 2)) : 1 - ((t - peak) / (1 - peak)) ** 1.6)

// A koi's half-silhouette width along its spine: t 0 at the tail, 1 at the nose.
export const koiWidth =
  (w: number) =>
  (t: number): number => {
    if (t < 0.64) {
      return w * (0.14 + 0.86 * Math.sin((t / 0.64) * (Math.PI / 2)) ** 1.7)
    }
    return w * Math.sqrt(Math.max(0, 1 - ((t - 0.64) / 0.36) ** 2.4))
  }

// A koi's spine, head toward +x: the tail curves by `bend`.
export const koiSpine =
  (len: number, bend: number) =>
  (t: number): P => {
    const x = -0.4 * len + t * len
    return [x, bend * len * 0.22 * (1 - t) ** 2]
  }

export const num = (v: number): string => String(Math.round(v * 100) / 100)

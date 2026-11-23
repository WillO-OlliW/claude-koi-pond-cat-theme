// Koi anatomy shared by the painted scenes: one frame, head toward +x, the
// tail's root at the spine's start, about 300 long with the tail fin.
import { bristles, curve, koiSpine, koiWidth, type P, type Rand, roughen, stroke, taper } from './brush.js'

export const LEN = 240
export const WIDTH = 82

export type Koi = { spine: (t: number) => P; width: (t: number) => number }

export function koiFrame(bend: number): Koi {
  return { spine: koiSpine(LEN, bend), width: koiWidth(WIDTH) }
}

// The spine's direction at t, in degrees.
export function heading(k: Koi, t: number): number {
  const a = k.spine(Math.max(0, t - 0.01))
  const b = k.spine(Math.min(1, t + 0.01))
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
}

// A line along the body's edge (side 1 or -1), `inset` of the way out.
export function edge(k: Koi, side: number, inset = 0.97): (t: number) => P {
  return t => {
    const a = k.spine(Math.max(0, t - 0.002))
    const b = k.spine(Math.min(1, t + 0.002))
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const p = k.spine(t)
    const hw = (k.width(t) / 2) * inset
    return [p[0] - (dy / len) * hw * side, p[1] + (dx / len) * hw * side]
  }
}

// Part of a centreline, from t0 to t1.
export const span =
  (c: (t: number) => P, t0: number, t1: number) =>
  (u: number): P =>
    c(t0 + (t1 - t0) * u)

export const spanW =
  (w: (t: number) => number, t0: number, t1: number, k = 1) =>
  (u: number): number =>
    w(t0 + (t1 - t0) * u) * k

function sample(c: (t: number) => P, n: number, skipFirst = false): P[] {
  const out: P[] = []

  for (let i = skipFirst ? 1 : 0; i <= n; i++) {
    out.push(c(i / n))
  }
  return out
}

export type Fin = { shape: P[]; rays: P[][] }

// A side fin (pectoral when `front`, pelvic otherwise) on side 1 or -1.
export function sideFin(rand: Rand, side: number, front: boolean, rough = 1.2): Fin {
  const s = side
  const [base, out, tip, inn, back]: [P, P, P, P, P] = front
    ? [
        [84, s * 24],
        [80, s * 52],
        [48, s * 62],
        [52, s * 40],
        [66, s * 28],
      ]
    : [
        [20, s * 22],
        [17, s * 38],
        [0, s * 44],
        [3, s * 30],
        [8, s * 22],
      ]
  const outer = curve(base, out, tip)
  const inner = curve(tip, inn, back)
  const shape = roughen(rand, [...sample(outer, 10), ...sample(inner, 8, true)], rough, 6)
  const rays = [0.45, 0.72, 1].map(t => {
    const end = outer(t)
    return stroke(rand, curve(base, [(base[0] + end[0]) / 2 + 2, (base[1] + end[1]) / 2], end), taper(1.5, 0.1, 0.5), {
      n: 10,
      wobble: 0.4,
    })
  })
  return { shape, rays }
}

// The tail fin, pointing toward -x from its root at the origin.
export function tailFin(rand: Rand, spread = 1, rough = 1.5): Fin {
  const u: P = [-62, -34 * spread]
  const notch: P = [-40, 0]
  const l: P = [-62, 34 * spread]
  const shape = roughen(
    rand,
    [
      ...sample(curve([4, -7], [-22, -14 * spread], u), 10),
      ...sample(curve(u, [-46, -12 * spread], notch), 6, true),
      ...sample(curve(notch, [-46, 12 * spread], l), 6, true),
      ...sample(curve(l, [-22, 14 * spread], [4, 7]), 10, true),
    ],
    rough,
    7,
  )
  const rays = [-0.95, -0.55, -0.2, 0.2, 0.55, 0.95].map(f => {
    const end: P = [-58 + Math.abs(f) * -2, 34 * spread * f]
    return stroke(rand, curve([0, f * 4], [-26, f * 16 * spread], end), taper(1.6, 0.1, 0.45), { n: 12, wobble: 0.4 })
  })
  return { shape, rays }
}

// Where the tail fin hangs: the spine's start, and the way it points.
export function tailRoot(k: Koi): { at: P; angle: number } {
  return { at: k.spine(0), angle: heading(k, 0.02) }
}

// Patches of colour laid along the back: t along the spine, length, share
// of the body's width, and a sideways nudge.
export type Patch = { t: number; len: number; w: number; side: number }

// A flowing fin painted in a few dry strokes, from its root out to `tip`.
export function wisp(rand: Rand, from: P, ctrl: P, tip: P, width: number, count = 5, runOut = 0.55): P[][] {
  return bristles(rand, curve(from, ctrl, tip), taper(width, 0.06, 0.6), { count, runOut, gap: 0.55, n: 13, wobble: 0.8 })
}

// A long, flowing tail toward -x from its root at the origin.
export function wispyTail(rand: Rand, spread = 1, length = 1): P[][] {
  const reach = -100 * length
  return [
    ...wisp(rand, [2, -5], [-58, 4 * spread], [reach, -46 * spread], 30, 3, 0.7),
    ...wisp(rand, [2, 5], [-54, -6 * spread], [reach * 0.94, 50 * spread], 30, 3, 0.7),
    ...wisp(rand, [0, 0], [-30, 2], [reach * 0.62, 6 * spread], 18, 2, 0.4),
  ]
}

// Side fins in dry strokes: pectoral when `front`, pelvic otherwise.
export function wispyFin(rand: Rand, side: number, front: boolean): P[][] {
  const s = side
  return front
    ? wisp(rand, [86, s * 24], [80, s * 58], [40, s * 78], 24, 3, 0.7)
    : wisp(rand, [22, s * 24], [16, s * 44], [-8, s * 56], 15, 2, 0.7)
}

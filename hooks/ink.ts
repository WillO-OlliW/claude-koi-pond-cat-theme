// The ink-painting pond (sumi-e): warm rice paper, koi laid down in a few
// loaded brush strokes of sumi ink and vermilion, a black cat in wet ink that
// bleeds into the paper, broken ripple rings, washed lily pads, and a red seal.
import {
  arc,
  between,
  blob,
  bristles,
  curve,
  dots,
  num,
  type P,
  poly,
  polys,
  type Rand,
  roughen,
  seeded,
  stroke,
  swell,
  taper,
} from './brush.js'
import { edge, type Koi, koiFrame, sideFin, span, spanW, tailRoot, wispyFin, wispyTail } from './koi-parts.js'

const W = 1600
const H = 1000
// The whirl sits well right of centre, clear of the conversation column.
const VX = 1390
const VY = 450

// Every colour plays a role, painted one way on rice paper by day and another
// on black paper by night; the scene follows the mode the app shows.
type Tone = { day: string; night: string; dayAlpha?: number; nightAlpha?: number }

const TONES = {
  paper: { day: '#eee6d3', night: '#211f1b' },
  outline: { day: '#1b1a18', night: '#0b0a09' },
  line: { day: '#1b1a18', night: '#d8d1c2' },
  fin: { day: '#5e5c57', night: '#dcd6c8' },
  finBlue: { day: '#5d6a84', night: '#8494b5' },
  finGold: { day: '#b9893a', night: '#c99a4a' },
  red: { day: '#c8401f', night: '#d9492a' },
  redDeep: { day: '#9a2814', night: '#a8301a' },
  flank: { day: '#cf5f37', night: '#d86a42' },
  koiWhite: { day: '#efe7d6', night: '#e7e0d1' },
  koiShade: { day: '#8b8780', night: '#7d786e' },
  sumi: { day: '#1b1a18', night: '#d9d3c5' },
  sumiHalo: { day: '#3a3936', night: '#cfc9bb' },
  sumiEye: { day: '#eee6d3', night: '#1b1a18' },
  blue: { day: '#34496e', night: '#6c86b6' },
  blueDeep: { day: '#22324f', night: '#4c6694' },
  blueHalo: { day: '#2c3f63', night: '#5a72a0' },
  gold: { day: '#d39a34', night: '#d6a03c' },
  goldLight: { day: '#f2d48e', night: '#f2d48e' },
  goldHalo: { day: '#c98f2e', night: '#c98f2e' },
  cat: { day: '#1b1a18', night: '#050404', nightAlpha: 0.94 },
  catFur: { day: '#1b1a18', night: '#3a3630' },
  catHalo: { day: '#3a3936', night: '#b3ab9c' },
  catRim: { day: '#1b1a18', night: '#ddd5c4', dayAlpha: 0, nightAlpha: 0.3 },
  earInner: { day: '#5e5c57', night: '#57524a' },
  eye: { day: '#bdb33a', night: '#c6bc3e' },
  pupil: { day: '#1b1a18', night: '#050404' },
  glint: { day: '#eee6d3', night: '#fffbea' },
  water: { day: '#4a4945', night: '#aca79c' },
  swirl: { day: '#6b6964', night: '#a9a498' },
  padWash: { day: '#82926c', night: '#617550', nightAlpha: 0.5 },
  padPool: { day: '#5d7049', night: '#3d5032', nightAlpha: 0.42 },
  padVein: { day: '#4b5a43', night: '#a6ba8f' },
  padRim: { day: '#33402e', night: '#b7c79d', nightAlpha: 0.42 },
  leaf: { day: '#5e6b4f', night: '#82916c' },
  leafRib: { day: '#3c4634', night: '#adbc96' },
  seal: { day: '#b8321e', night: '#c4381f' },
  sealMark: { day: '#eee6d3', night: '#211f1b' },
  fibre: { day: '#c4b28a', night: '#3d382f' },
  speck: { day: '#a8977a', night: '#544c40' },
  age: { day: '#bba57a', night: '#050403' },
  ageIn: { day: '#cdb98f', night: '#050403' },
  stain: { day: '#d6c49b', night: '#3b352c' },
  wash: { day: '#9ea59c', night: '#46504d' },
} satisfies Record<string, Tone>

type Role = keyof typeof TONES

const toneCss = (night: boolean): string =>
  Object.entries(TONES)
    .map(([name, tone]: [string, Tone]) => {
      const color = night ? tone.night : tone.day
      const alpha = night ? tone.nightAlpha : tone.dayAlpha
      return (
        `.f-${name}{fill:${color}${alpha === undefined ? '' : `;fill-opacity:${alpha}`}}` +
        `.s-${name}{stroke:${color}${alpha === undefined ? '' : `;stroke-opacity:${alpha}`}}` +
        `.g-${name}{stop-color:${color}}`
      )
    })
    .join('')

const fill = (d: string, role: Role, opacity = 1): string =>
  `<path class="f-${role}" d="${d}"${opacity < 1 ? ` fill-opacity="${num(opacity)}"` : ''}/>`

// Ink outline: broken strokes along both flanks, heavy at the head, lifting
// toward the tail, never quite closing.
function outline(rand: Rand, k: Koi, weight: number, opacity: number): string {
  const runs: [number, number, number, number][] = [
    [1, 0.04 + rand() * 0.04, 0.36 + rand() * 0.08, 0.55],
    [1, 0.5 + rand() * 0.06, 1, 1],
    [-1, 0.08 + rand() * 0.05, 0.5 + rand() * 0.08, 0.5],
    [-1, 0.62 + rand() * 0.05, 1, 1],
  ]
  const d = polys(
    runs.map(([side, t0, t1, heavy]) =>
      stroke(rand, span(edge(k, side, 0.99), t0, t1), taper(weight * heavy * between(rand, 0.85, 1.15), 0.3, 0.3), {
        n: 28,
        wobble: 0.8,
      }),
    ),
  )
  return fill(d, 'outline', opacity)
}

// A blotch of colour laid on in two wet washes that don't quite line up,
// deeper where they overlap, with pigment pooled along one edge.
function wetPatch(rand: Rand, k: Koi, t0: number, t1: number, share: number, side: number, color: Role, deep: Role): string {
  const along = span(edge(k, side, 0.32), t0, t1)
  const width = (t: number): number => k.width(t0 + (t1 - t0) * t) * share * Math.min(1, t / 0.18, (1 - t) / 0.22) ** 0.5
  const a = roughen(rand, stroke(rand, along, width, { n: 16, wobble: 3, cells: 4 }), 3.5, 6)
  const b = roughen(rand, swell(stroke(rand, along, width, { n: 16, wobble: 3, cells: 4 }), 0.86), 3, 6).map(([x, y]): P => [x + between(rand, -4, 4), y + between(rand, -3, 3)])
  const pool = stroke(rand, span(edge(k, side, 0.32 + side * 0.2), t0 + 0.02, t1 - 0.03), (t: number) => width(t) * 0.25, { n: 12, wobble: 1.4 })
  return fill(poly(a), color, 0.5) + fill(poly(b), color, 0.5) + fill(poly(pool), deep, 0.22)
}

function wisps(rand: Rand, k: Koi, color: Role, opacity: number): string {
  let fins: P[][] = []

  for (const side of [1, -1]) {
    fins = fins.concat(wispyFin(rand, side, true), wispyFin(rand, side, false))
  }
  const washes: P[][] = []
  for (const side of [1, -1]) {
    washes.push(sideFin(rand, side, true, 2).shape.map(([x, y]): P => [x, y * 1.15]), sideFin(rand, side, false, 1.5).shape)
  }
  const root = tailRoot(k)
  const spread = between(rand, 0.85, 1.15)
  const tail = wispyTail(rand, spread, between(rand, 0.95, 1.15))
  const tailWash = blob(rand, -50, 0, 50, 36 * spread, 0, 0.22, 24, 4)
  return (
    fill(polys(washes), color, opacity * 0.6) +
    fill(polys(fins), color, opacity) +
    `<g transform="translate(${num(root.at[0])} ${num(root.at[1])}) rotate(${num(root.angle)})"><g class="tl">` +
    fill(poly(tailWash), color, opacity * 0.6) +
    fill(polys(tail), color, opacity) +
    `</g></g>`
  )
}

function eyes(rand: Rand, k: Koi, color: Role): string {
  return [1, -1]
    .map(side => {
      const p = edge(k, side, 0.58)(0.9)
      return fill(poly(blob(rand, p[0], p[1], 3.6, 3.1, 0, 0.12, 10)), color, 0.9)
    })
    .join('')
}

function barbels(rand: Rand, k: Koi): string {
  const shapes = [1, -1].map(side => {
    const from = edge(k, side, 0.5)(0.97)
    return stroke(rand, curve(from, [from[0] + 9, from[1] + side * 6], [from[0] + 11, from[1] + side * 17]), taper(1.5, 0.1, 0.6), { n: 8 })
  })
  return fill(polys(shapes), 'line', 0.6)
}

type Kind = 'kohaku' | 'tancho' | 'sumi' | 'asagi' | 'ogon'

// [t0, t1, share of the width, which side it leans to] for each patch of red.
type Patches = [number, number, number, number][]

function inkKoi(id: string, seed: number, kind: Kind, bend: number, red: Patches = []): string {
  const rand = seeded(seed)
  const k = koiFrame(bend)
  const body = stroke(rand, k.spine, k.width, { n: 44, wobble: 1.6 })
  const fromNose = (t: number): P => k.spine(1 - t)
  const noseWidth = (t: number): number => k.width(1 - t)
  let out = ''

  if (kind === 'sumi') {
    out += wisps(rand, k, 'fin', 0.26)
    out += fill(poly(roughen(rand, swell(body, 1.1), 3, 9)), 'sumiHalo', 0.1)
    out += fill(polys(bristles(rand, fromNose, noseWidth, { count: 7, runOut: 0.68, gap: 0.08, n: 28, wobble: 1.4 })), 'sumi', 0.84)
    out += fill(poly(stroke(rand, span(k.spine, 0.66, 1), spanW(k.width, 0.66, 1, 0.92), { n: 22, wobble: 1.4 })), 'sumi', 0.88)
    out += eyes(rand, k, 'sumiEye')
  } else if (kind === 'asagi') {
    out += wisps(rand, k, 'finBlue', 0.24)
    out += fill(poly(roughen(rand, swell(body, 1.1), 3, 9)), 'blueHalo', 0.1)
    out += fill(poly(body), 'blue', 0.42)
    out += fill(polys(bristles(rand, fromNose, (t: number) => noseWidth(t) * 0.7, { count: 5, runOut: 0.6, gap: 0.1, n: 22 })), 'blueDeep', 0.42)
    for (const side of [1, -1]) {
      out += fill(poly(stroke(rand, span(edge(k, side, 0.78), 0.12, 0.82), taper(13, 0.2, 0.3), { n: 24, wobble: 1.4 })), 'flank', 0.3)
    }
    out += outline(rand, k, 4, 0.5)
    out += eyes(rand, k, 'outline')
  } else if (kind === 'ogon') {
    out += wisps(rand, k, 'finGold', 0.26)
    out += fill(poly(roughen(rand, swell(body, 1.12), 3, 9)), 'goldHalo', 0.13)
    out += fill(polys(bristles(rand, fromNose, noseWidth, { count: 6, runOut: 0.68, gap: 0.06, n: 26, wobble: 1.6 })), 'gold', 0.66)
    out += fill(poly(stroke(rand, span(k.spine, 0.22, 0.9), taper(16, 0.2, 0.3), { n: 24 })), 'goldLight', 0.42)
    out += outline(rand, k, 3.4, 0.42)
    out += eyes(rand, k, 'outline')
  } else {
    // Kohaku and tancho: the white body is the paper itself, red laid on top.
    out += wisps(rand, k, 'fin', 0.22)
    out += fill(poly(body), 'koiWhite', 0.92)
    out += fill(poly(stroke(rand, span(edge(k, -1, 0.55), 0.08, 0.95), taper(18, 0.2, 0.3), { n: 24, wobble: 1.4 })), 'koiShade', 0.12)
    if (kind === 'tancho') {
      const head = k.spine(0.85)
      const spot = blob(rand, head[0], head[1], 17, 16, 0, 0.1, 28)
      out += fill(poly(roughen(rand, swell(spot, 1.25), 2, 6)), 'red', 0.18) + fill(poly(spot), 'red', 0.88)
    }
    for (const [t0, t1, share, side] of red) {
      out += wetPatch(rand, k, t0, t1, share, side, 'red', 'redDeep')
    }
    out += outline(rand, k, 6, 0.8)
    out += fill(poly(stroke(rand, span(k.spine, 0.36, 0.7), taper(3.4, 0.3, 0.4), { n: 16 })), 'outline', 0.3)
    out += eyes(rand, k, 'outline')
  }
  out += barbels(rand, k)
  return `<g id="${id}">${out}</g>`
}

const KOI_DEFS =
  inkKoi('ik1', 101, 'kohaku', 0.55, [
    [0.7, 0.95, 0.66, 0.3],
    [0.38, 0.64, 0.72, -0.4],
    [0.12, 0.28, 0.5, 0.5],
  ]) +
  inkKoi('ik2', 202, 'kohaku', -0.45, [
    [0.52, 0.92, 0.78, -0.2],
    [0.2, 0.42, 0.58, 0.6],
  ]) +
  inkKoi('it', 303, 'tancho', -0.7) +
  inkKoi('is', 404, 'sumi', 0.35) +
  inkKoi('ia', 505, 'asagi', -0.3) +
  inkKoi('iy', 606, 'ogon', 0.5)

// Which koi, where in the whirl (degrees, radius), how big, and whether it
// swims deep, paler under the water.
const SCHOOL: [string, number, number, number, boolean][] = [
  ['ia', 200, 215, 0.6, true],
  ['ik2', 40, 360, 0.62, true],
  ['it', 262, 420, 0.6, true],
  ['ik1', 12, 195, 0.74, false],
  ['it', 122, 300, 0.78, false],
  ['ik2', 232, 280, 0.78, false],
  ['iy', 296, 360, 0.72, false],
  ['is', 70, 250, 0.74, false],
  ['is', 335, 420, 0.76, false],
  ['ik1', 165, 420, 0.76, false],
]

function school(deepOnes: boolean): string {
  const rand = seeded(deepOnes ? 77 : 78)

  return SCHOOL.filter(row => row[4] === deepOnes)
    .map(([id, angle, radius, scale, deep]) => {
      const seconds = Math.round(55 + radius * 0.22)
      const sway = `animation-duration:${num(between(rand, 7, 11))}s;animation-delay:-${num(rand() * 10)}s`
      const tail = `--s:${num(between(rand, 1.8, 2.8))}s;--d:-${num(rand() * 3)}s`
      return (
        `<g class="o" style="animation-duration:${seconds}s"><g transform="rotate(${angle})"><g class="sw" style="${sway}">` +
        `<use href="#${id}" transform="translate(${radius} 0) rotate(${num(96 + rand() * 6)}) scale(${scale})" style="${tail}"${deep ? ' opacity=".34"' : ''}/>` +
        `</g></g></g>`
      )
    })
    .join('')
}

// The cat in wet ink, head toward the bottom, looking up out of the water;
// the ink spreads into the damp paper around it.
function cat(): string {
  const rand = seeded(9)
  const body = blob(rand, 0, -20, 54, 74, 0, 0.07, 48)
  let out = ''

  out += fill(poly(roughen(rand, swell(body, 1.34), 6, 9)), 'catHalo', 0.06)
  out += fill(poly(roughen(rand, swell(body, 1.16), 4, 9)), 'catHalo', 0.1)
  const tail = curve([0, 0], [14, -64], [-22, -122])
  out +=
    `<g transform="translate(2 -84)"><g class="ct">` +
    fill(polys(bristles(rand, tail, taper(17, 0.04, 0.3), { count: 7, runOut: 0.7, gap: 0.2, n: 30, wobble: 1 })), 'cat', 0.88) +
    `</g></g>`
  out += fill(poly(blob(rand, -26, -50, 24, 32, -12, 0.14, 28)), 'cat', 0.3)
  out += fill(poly(blob(rand, 26, -50, 24, 32, 12, 0.14, 28)), 'cat', 0.3)
  out += fill(poly(body), 'cat', 0.72)
  // Broad strokes from the neck up the back, overlapping into deeper black.
  let strokes: P[][] = []
  for (const x of [-26, -6, 14, 30]) {
    strokes = strokes.concat(
      bristles(rand, curve([x * 0.5, 40], [x * 1.15, -20], [x * 0.9, -92]), taper(between(rand, 30, 40), 0.08, 0.3), {
        count: 6,
        runOut: 0.72,
        gap: 0.22,
        n: 18,
        wobble: 1.4,
      }),
    )
  }
  out += fill(polys(strokes), 'catFur', 0.5)
  out += fill(poly(blob(rand, -46, 30, 12, 9, 0, 0.12, 18)), 'cat', 0.9)
  out += fill(poly(blob(rand, 58, 8, 14, 9, -12, 0.12, 18)), 'cat', 0.9)
  out += fill(poly(roughen(rand, [[-33, 70], [-42, 105], [-13, 88]], 1.4, 4)), 'cat', 0.92)
  out += fill(poly(roughen(rand, [[33, 70], [42, 105], [13, 88]], 1.4, 4)), 'cat', 0.92)
  const head = blob(rand, 0, 58, 36, 31, 0, 0.06, 40)
  out += fill(poly(head), 'cat', 0.9)
  out += `<path class="s-catRim" d="${poly(body)}${poly(head)}" fill="none" stroke-width="1.4"/>`
  out += fill(polys(bristles(rand, curve([-30, 50], [0, 40], [30, 52]), taper(22, 0.1, 0.3), { count: 5, runOut: 0.7, gap: 0.2 })), 'catFur', 0.5)
  out += fill(poly([[-28, 78], [-33, 96], [-18, 88]]), 'earInner', 0.5) + fill(poly([[28, 78], [33, 96], [18, 88]]), 'earInner', 0.5)
  const whiskers: P[][] = []
  for (const side of [1, -1]) {
    for (const [dy, reach] of [
      [-10, 58],
      [0, 64],
      [10, 56],
    ] as const) {
      whiskers.push(
        stroke(rand, curve([side * 12, 50], [side * 34, 46 + dy * 0.6], [side * reach, 42 + dy * 1.6]), taper(1.6, 0.05, 0.7), { n: 12, wobble: 0.3 }),
      )
    }
  }
  out += fill(polys(whiskers), 'line', 0.6)
  // Eyes: the one touch of colour on the cat.
  out += `<g transform="translate(0 64)"><g class="bl">`
  for (const x of [-14, 14]) {
    const eye = blob(rand, x, 0, 8.6, 6.2, 0, 0.05, 24)
    out +=
      fill(poly(eye), 'eye', 0.95) +
      `<path d="${poly(eye)}" fill="none" stroke="#6d6420" stroke-width="1" stroke-opacity=".6"/>` +
      fill(poly(blob(rand, x, 0, 1.8, 5.2, 0, 0.05, 12)), 'pupil') +
      `<circle cx="${x + 2.4}" cy="-2.4" r="1.2" class="f-glint"/>`
  }
  out += `</g></g>`
  return `<g transform="translate(0 34) scale(1.22)">${out}</g>`
}

// Rings of ripples around the cat, each broken into a few lifting strokes.
function ripples(): string {
  const rand = seeded(13)
  let out = ''

  for (let ring = 0; ring < 3; ring++) {
    const arcs: P[][] = []
    const start = rand() * 360
    let a = start

    while (a - start < 300 && arcs.length < 5) {
      const len = between(rand, 24, 60)
      arcs.push(stroke(rand, arc(0, 0, between(rand, 104, 112), a, a + len), taper(between(rand, 1.8, 2.8), 0.3, 0.35), { n: 18, wobble: 0.5 }))
      a += len + between(rand, 20, 50)
    }
    out += `<g class="rp" style="animation-delay:-${ring * 4}s">${fill(polys(arcs), 'water', 0.6)}</g>`
  }
  return out
}

// Two faint arms of the whirl, in a nearly dry brush.
function swirl(): string {
  const rand = seeded(17)
  let shapes: P[][] = []

  for (let arm = 0; arm < 2; arm++) {
    const a0 = arm * Math.PI + 0.4
    const spiral = (t: number): P => {
      const a = a0 + t * Math.PI * 0.9
      const r = 170 + t * 250
      return [Math.cos(a) * r, Math.sin(a) * r]
    }
    shapes = shapes.concat(bristles(rand, spiral, taper(14, 0.2, 0.45), { count: 5, runOut: 0.55, gap: 0.5, n: 26, wobble: 1 }))
  }
  return `<g class="o" style="animation-duration:220s">${fill(polys(shapes), 'swirl', 0.13)}</g>`
}

// Thin, wavering lines on the water, kept away from the cat.
function waterLines(): string {
  const rand = seeded(23)
  const lines: P[][] = []

  while (lines.length < 16) {
    const x = between(rand, -60, W - 60)
    const y = between(rand, 40, H - 40)

    if (Math.hypot(x + 80 - VX, y - VY) < 320) {
      continue
    }
    const len = between(rand, 60, 230)
    const amp = between(rand, 1.5, 5)
    const f = between(rand, 0.6, 1.6)
    const ph = rand() * 6
    lines.push(
      stroke(rand, (t: number): P => [x + t * len, y + Math.sin(t * Math.PI * 2 * f + ph) * amp], taper(between(rand, 1.6, 3.4), 0.25, 0.45), {
        n: 22,
        wobble: 0.5,
      }),
    )
  }
  return `<g class="wl">${fill(polys(lines), 'water', 0.24)}</g>`
}

// A lily pad in wet washes: a pale layer, a darker pool to one side, a few
// faint veins and a dry stroke along part of the rim.
function lilyPad(rand: Rand, cx: number, cy: number, r: number, rot: number, extra = ''): string {
  const half = 0.26
  const disc: P[] = [[r * 0.04, 0]]

  for (let i = 0; i <= 40; i++) {
    const a = half + (i / 40) * (Math.PI * 2 - half * 2)
    disc.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  const wash = roughen(rand, disc, r * 0.04, 9)
  const pool = roughen(rand, swell(disc, 0.62), r * 0.08, 7).map(([x, y]): P => [x - r * 0.18, y + r * 0.12])
  const veins: P[][] = []

  for (const a of [half + 0.9, 2.2, 3.5, 4.6, Math.PI * 2 - half - 0.7]) {
    const bend = between(rand, -0.12, 0.12)
    veins.push(
      stroke(rand, (t: number): P => [Math.cos(a + bend * t) * r * (0.1 + t * 0.72), Math.sin(a + bend * t) * r * (0.1 + t * 0.72)], taper(Math.max(1.1, r / 60), 0.1, 0.6), {
        n: 10,
        wobble: 0.3,
      }),
    )
  }
  const start = between(rand, 20, 120)
  const rim = bristles(rand, arc(0, 0, r * 0.98, start, start + between(rand, 110, 170)), taper(Math.max(3, r / 22), 0.15, 0.4), {
    count: 4,
    runOut: 0.6,
    gap: 0.35,
    n: 18,
  })
  return (
    `<g transform="translate(${Math.round(cx)} ${Math.round(cy)})"${extra}>` +
    `<g class="pd" style="animation-duration:${num(between(rand, 9, 14))}s;animation-delay:-${num(rand() * 12)}s"><g transform="rotate(${rot})">` +
    fill(poly(wash), 'padWash', 0.3) +
    fill(poly(pool), 'padPool', 0.2) +
    fill(polys(veins), 'padVein', 0.28) +
    fill(polys(rim), 'padRim', 0.5) +
    `</g></g></g>`
  )
}

function lilyPads(): string {
  const rand = seeded(29)
  const pads: [number, number, number, number][] = [
    [80, 130, 100, 200],
    [240, 50, 54, 40],
    [36, 580, 72, 320],
    [150, 905, 112, 120],
    [322, 984, 58, 250],
    [1548, 70, 50, 140],
    [1592, 300, 36, 20],
  ]
  const portrait: [number, number, number, number][] = [
    [640, 955, 66, 30],
    [990, 40, 50, 190],
  ]
  return (
    pads.map(([x, y, r, rot]) => lilyPad(rand, x, y, r, rot)).join('') +
    portrait.map(([x, y, r, rot]) => lilyPad(rand, x, y, r, rot, ' class="pt"')).join('')
  )
}

// Two willow leaves drifting slowly across the surface.
function leaves(): string {
  const rand = seeded(31)
  const leaf = (): string => {
    const blade = stroke(rand, curve([-30, 0], [0, -7], [30, 0]), (t: number) => 11 * Math.sin(Math.PI * t) ** 0.8, { n: 20, wobble: 0.5 })
    const rib = stroke(rand, curve([-34, 1], [0, -5], [26, 0]), taper(1.2, 0.1, 0.4), { n: 12 })
    return fill(poly(blade), 'leaf', 0.5) + fill(poly(rib), 'leafRib', 0.5)
  }
  return (
    `<g transform="translate(520 190)"><g class="lf" style="animation-duration:95s;animation-delay:-30s">${leaf()}</g></g>` +
    `<g transform="translate(900 820)"><g class="lf" style="animation-duration:130s;animation-delay:-85s">${leaf()}</g></g>`
  )
}

// The red seal: a worn square with a koi cut into it.
function seal(): string {
  const rand = seeded(37)
  const square: P[] = []
  const corners: P[] = [
    [-28, -32],
    [28, -32],
    [28, 32],
    [-28, 32],
  ]

  for (let i = 0; i < 4; i++) {
    const a = corners[i]!
    const b = corners[(i + 1) % 4]!
    for (let s = 0; s < 8; s++) {
      square.push([a[0] + ((b[0] - a[0]) * s) / 8, a[1] + ((b[1] - a[1]) * s) / 8])
    }
  }
  const mark = [
    stroke(rand, (t: number): P => [-10 + Math.sin(t * Math.PI * 1.6) * 9, -20 + t * 36], taper(6, 0.15, 0.35), { n: 20, wobble: 0.6 }),
    stroke(rand, curve([-2, 16], [8, 20], [14, 12]), taper(4, 0.2, 0.4), { n: 10 }),
    stroke(rand, curve([4, -22], [14, -18], [16, -6]), taper(4, 0.2, 0.4), { n: 10 }),
  ]
  const worn: P[] = Array.from({ length: 26 }, (): P => [between(rand, -26, 26), between(rand, -30, 30)])
  return (
    `<g transform="translate(1515 905) rotate(-2)">` +
    fill(poly(roughen(rand, square, 1.4, 10)), 'seal', 0.88) +
    fill(polys(mark), 'sealMark', 0.92) +
    `<path class="s-sealMark" d="${dots(worn)}" stroke-width="1.6" stroke-linecap="round" stroke-opacity=".7"/>` +
    `</g>`
  )
}

// Rice paper: soft stains, fibres and specks.
function paper(): string {
  const rand = seeded(41)
  let stains = ''

  for (let i = 0; i < 7; i++) {
    stains += `<ellipse cx="${Math.round(rand() * W)}" cy="${Math.round(rand() * H)}" rx="${Math.round(between(rand, 160, 360))}" ry="${Math.round(between(rand, 120, 280))}" transform="rotate(${Math.round(rand() * 180)})" fill="url(#stain)" opacity="${num(between(rand, 0.5, 1))}"/>`
  }
  const fibres: P[][] = []

  for (let i = 0; i < 280; i++) {
    const x = rand() * W
    const y = rand() * H
    const a = rand() * Math.PI * 2
    const l = between(rand, 6, 20)
    fibres.push([
      [x, y],
      [x + Math.cos(a) * l * 0.5 + between(rand, -2, 2), y + Math.sin(a) * l * 0.5 + between(rand, -2, 2)],
      [x + Math.cos(a) * l, y + Math.sin(a) * l],
    ])
  }
  const specks: P[] = Array.from({ length: 220 }, (): P => [rand() * W, rand() * H])
  return (
    `<rect class="f-paper" width="${W}" height="${H}"/>` +
    stains +
    `<path d="${polys(fibres, false)}" class="s-fibre" fill="none" stroke-width=".8" stroke-opacity=".5" stroke-linecap="round"/>` +
    `<path class="s-speck" d="${dots(specks)}" stroke-width="1.3" stroke-linecap="round" stroke-opacity=".35"/>`
  )
}

const STYLE = `
.o,.sw,.tl,.rp,.ct,.bl,.pd,.wl,.lf,.vx{transform-origin:0 0}
.o{animation:spin 120s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.sw{animation:sway 9s ease-in-out infinite alternate}
@keyframes sway{from{transform:translateX(-10px)}to{transform:translateX(10px)}}
.tl{animation:tail var(--s,2s) ease-in-out var(--d,0s) infinite alternate}
@keyframes tail{from{transform:rotate(-10deg)}to{transform:rotate(10deg)}}
.rp{opacity:.4;animation:ripple 12s ease-out infinite}
@keyframes ripple{from{transform:scale(1);opacity:.6}to{transform:scale(2.4);opacity:0}}
.ct{animation:tailcat 6s ease-in-out infinite alternate}
@keyframes tailcat{from{transform:rotate(-6deg)}to{transform:rotate(8deg)}}
.bl{animation:blink 8s ease-in-out infinite}
@keyframes blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
.pd{animation:bob 11s ease-in-out infinite alternate}
@keyframes bob{from{transform:rotate(-2deg)}to{transform:rotate(2deg)}}
.wl{animation:drift 40s ease-in-out infinite alternate}
@keyframes drift{to{transform:translateX(30px)}}
.lf{animation:leaf 100s linear infinite}
@keyframes leaf{from{transform:translate(-1000px,-50px) rotate(-30deg)}to{transform:translate(1000px,50px) rotate(50deg)}}
.pt{display:none}
@media (max-aspect-ratio:3/2){.vx{transform:translate(1320px,460px) scale(.76)}}
@media (max-aspect-ratio:5/4){.vx{transform:translate(1220px,470px) scale(.66)}}
@media (max-aspect-ratio:1/1){.vx{transform:translate(800px,280px) scale(.42)}.pt{display:inline}}
${toneCss(false)}
@media (prefers-color-scheme:dark){${toneCss(true)}}
`

export const INK_SCENE =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
  `<style>${STYLE}</style>` +
  `<defs>${KOI_DEFS}` +
  `<radialGradient id="age" cx=".5" cy=".5" r=".75"><stop class="g-ageIn" offset=".5" stop-opacity="0"/><stop class="g-age" offset="1" stop-opacity=".42"/></radialGradient>` +
  `<radialGradient id="stain"><stop class="g-stain" offset="0" stop-opacity=".32"/><stop class="g-stain" offset=".7" stop-opacity=".12"/><stop class="g-stain" offset="1" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="wash"><stop class="g-wash" offset="0" stop-opacity=".2"/><stop class="g-wash" offset=".65" stop-opacity=".12"/><stop class="g-wash" offset="1" stop-opacity="0"/></radialGradient>` +
  `</defs>` +
  paper() +
  `<ellipse cx="${VX - 20}" cy="${VY + 10}" rx="520" ry="470" fill="url(#wash)"/>` +
  `<ellipse cx="${VX + 140}" cy="${VY - 120}" rx="300" ry="260" fill="url(#wash)" opacity=".6"/>` +
  waterLines() +
  `<g class="vx" transform="translate(${VX} ${VY}) scale(.86)">` +
  swirl() +
  ripples() +
  school(true) +
  cat() +
  school(false) +
  `</g>` +
  lilyPads() +
  leaves() +
  seal() +
  `<rect width="${W}" height="${H}" fill="url(#age)"/>` +
  `</svg>`

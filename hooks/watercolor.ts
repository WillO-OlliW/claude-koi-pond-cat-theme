// The watercolor pond at dusk: deep washes of teal, indigo and violet laid
// wet into wet, tide-marked glazes and granulating pigment, luminous koi
// with pigment pooled at their edges, a cat in indigo-black wash, lily pads
// and lotus, and soft light that drifts over the water.
import { between, blob, curve, dots, num, type P, poly, polys, type Rand, roughen, seeded, stroke, swell, taper } from './brush.js'
import { edge, type Koi, koiFrame, sideFin, span, tailRoot } from './koi-parts.js'

const W = 1600
const H = 1000
// The whirl sits well right of centre, clear of the conversation column.
const VX = 1390
const VY = 450

const fill = (d: string, color: string, opacity = 1, extra = ''): string =>
  `<path d="${d}" fill="${color}"${opacity < 1 ? ` fill-opacity="${num(opacity)}"` : ''}${extra}/>`

const rim = (d: string, color: string, width: number, opacity: number): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${num(width)}" stroke-opacity="${num(opacity)}" stroke-linejoin="round"/>`

// A wash: the shape filled, with pigment dried darker along its edge.
const wash = (rand: Rand, shape: P[], color: string, opacity: number, edgeColor: string, edgeOpacity: number, width = 1.8): string =>
  fill(poly(shape), color, opacity) + rim(poly(roughen(rand, shape, 0.8, 9)), edgeColor, width, edgeOpacity)

type Mark = { t0: number; t1: number; share: number; side: number; color: string; edge: string }

type Koiset = { base: string; light: string; edge: string; bend: number; marks?: Mark[] }

function wcKoi(id: string, seed: number, c: Koiset): string {
  const rand = seeded(seed)
  const k: Koi = koiFrame(c.bend)
  const body = roughen(rand, stroke(rand, k.spine, k.width, { n: 44, wobble: 1.4 }), 1.6, 10)
  let out = ''

  // Fins: thin washes, deeper at the edge, a few lifted rays.
  for (const side of [1, -1]) {
    for (const front of [true, false]) {
      const f = sideFin(rand, side, front, 2)
      out += wash(rand, f.shape.map(([x, y]): P => [x, y * 1.12]), c.base, 0.3, c.edge, 0.4, 1.3)
      out += fill(polys(f.rays), c.light, 0.16)
    }
  }
  const root = tailRoot(k)
  const spread = between(rand, 0.9, 1.15)
  const lobes = [-1, 1].map(s =>
    roughen(
      rand,
      stroke(rand, curve([0, s * 3], [-48, s * -4 * spread], [-100, s * 46 * spread]), taper(40, 0.05, 0.55), { n: 18, wobble: 2 }),
      1.6,
      7,
    ),
  )
  const streaks = [-0.8, -0.35, 0.35, 0.8].map(f =>
    stroke(rand, curve([-6, f * 4], [-44, f * 18 * spread], [-88, f * 44 * spread]), taper(1.6, 0.1, 0.4), { n: 12, wobble: 0.4 }),
  )
  out +=
    `<g transform="translate(${num(root.at[0])} ${num(root.at[1])}) rotate(${num(root.angle)})"><g class="tl">` +
    lobes.map(l => wash(rand, l, c.base, 0.32, c.edge, 0.42, 1.3)).join('') +
    fill(polys(streaks), c.light, 0.2) +
    `</g></g>`
  // Body: a bloom into the wet paper, the wash, lifted light along the back.
  out += fill(poly(roughen(rand, swell(body, 1.1), 4, 8)), c.base, 0.16)
  out += fill(poly(body), c.base, 0.78)
  out += fill(poly(roughen(rand, swell(body, 0.84), 4, 7).map(([x, y]): P => [x + between(rand, -2, 6), y + between(rand, -3, 3)])), c.base, 0.3)
  for (let i = 0; i < 3; i++) {
    const at = k.spine(between(rand, 0.15, 0.85))
    out += fill(poly(roughen(rand, blob(rand, at[0], at[1] + between(rand, -12, 12), between(rand, 10, 22), between(rand, 6, 12), rand() * 180, 0.3, 16, 4), 2, 5)), c.edge, 0.12)
  }
  out += fill(poly(roughen(rand, stroke(rand, span(k.spine, 0.22, 0.93), taper(30, 0.25, 0.3), { n: 22, wobble: 2 }), 2.5, 6)), c.light, 0.42)
  for (const m of c.marks ?? []) {
    const along = span(edge(k, m.side, 0.3), m.t0, m.t1)
    const w = (t: number): number => k.width(m.t0 + (m.t1 - m.t0) * t) * m.share * Math.min(1, t / 0.2, (1 - t) / 0.22) ** 0.5
    const a = roughen(rand, stroke(rand, along, w, { n: 16, wobble: 3, cells: 4 }), 3, 6)
    out += fill(poly(roughen(rand, swell(a, 1.12), 2, 6)), m.color, 0.18) + wash(rand, a, m.color, 0.82, m.edge, 0.5, 1.6)
  }
  out += rim(poly(roughen(rand, body, 1.2, 12)), c.edge, 2.2, 0.55)
  for (const side of [1, -1]) {
    const p = edge(k, side, 0.58)(0.9)
    out += fill(poly(blob(rand, p[0], p[1], 3.6, 3.1, 0, 0.12, 10)), '#1a1420', 0.85)
  }
  return `<g id="${id}">${out}</g>`
}

const VERMILION = '#e4572e'
const VERMILION_EDGE = '#a8321a'
const SUMI = '#15121c'

const KOI_DEFS =
  wcKoi('wk', 11, {
    base: '#f1ebe0',
    light: '#ffffff',
    edge: '#a99886',
    bend: 0.5,
    marks: [
      { t0: 0.68, t1: 0.95, share: 0.66, side: 0.3, color: VERMILION, edge: VERMILION_EDGE },
      { t0: 0.34, t1: 0.6, share: 0.7, side: -0.4, color: VERMILION, edge: VERMILION_EDGE },
    ],
  }) +
  wcKoi('wo', 22, { base: '#f08a3c', light: '#ffc98e', edge: '#b4521c', bend: -0.45 }) +
  wcKoi('wy', 33, { base: '#efc04a', light: '#fff1aa', edge: '#a87a16', bend: 0.35 }) +
  wcKoi('ws', 44, {
    base: '#e8603a',
    light: '#ffa07a',
    edge: '#9a2e16',
    bend: -0.6,
    marks: [
      { t0: 0.6, t1: 0.86, share: 0.6, side: -0.5, color: SUMI, edge: '#000000' },
      { t0: 0.2, t1: 0.42, share: 0.55, side: 0.4, color: SUMI, edge: '#000000' },
    ],
  }) +
  wcKoi('wb', 55, {
    base: '#6fa3dc',
    light: '#d4e9ff',
    edge: '#2f5c9a',
    bend: 0.4,
    marks: [
      { t0: 0.15, t1: 0.8, share: 0.3, side: 0.85, color: '#e98a5a', edge: '#a8501f' },
      { t0: 0.15, t1: 0.8, share: 0.3, side: -0.85, color: '#e98a5a', edge: '#a8501f' },
    ],
  }) +
  wcKoi('wr', 66, { base: '#d9442f', light: '#ff8f6e', edge: '#8f2316', bend: -0.3 })

const SCHOOL: [string, number, number, number, boolean][] = [
  ['wb', 205, 215, 0.6, true],
  ['wo', 42, 362, 0.6, true],
  ['wk', 262, 420, 0.58, true],
  ['wk', 12, 195, 0.74, false],
  ['wo', 122, 300, 0.78, false],
  ['ws', 232, 280, 0.76, false],
  ['wy', 296, 362, 0.72, false],
  ['wr', 70, 250, 0.72, false],
  ['wb', 335, 420, 0.74, false],
  ['wk', 165, 420, 0.76, false],
]

function school(deepOnes: boolean): string {
  const rand = seeded(deepOnes ? 87 : 88)

  return SCHOOL.filter(row => row[4] === deepOnes)
    .map(([id, angle, radius, scale, deep]) => {
      const seconds = Math.round(55 + radius * 0.22)
      const sway = `animation-duration:${num(between(rand, 7, 11))}s;animation-delay:-${num(rand() * 10)}s`
      const tail = `--s:${num(between(rand, 1.7, 2.6))}s;--d:-${num(rand() * 3)}s`
      return (
        `<g class="o" style="animation-duration:${seconds}s"><g transform="rotate(${angle})"><g class="sw" style="${sway}">` +
        `<use href="#${id}" transform="translate(${radius} 0) rotate(${num(96 + rand() * 6)}) scale(${scale})" style="${tail}"${deep ? ' opacity=".3"' : ''}/>` +
        `</g></g></g>`
      )
    })
    .join('')
}

// The cat in indigo-black wash: a bloom where the wet pigment spread, a
// granulating coat, pooled edges and glowing green eyes.
function cat(): string {
  const rand = seeded(19)
  const body = blob(rand, 0, -20, 54, 74, 0, 0.07, 48)
  let out = ''

  out += fill(poly(roughen(rand, swell(body, 1.34), 7, 9)), '#2a4a5c', 0.16)
  out += fill(poly(roughen(rand, swell(body, 1.14), 4, 9)), '#1a2c3a', 0.32)
  const tail = roughen(rand, stroke(rand, curve([0, 0], [14, -64], [-22, -122]), taper(17, 0.04, 0.25), { n: 26, wobble: 1.6 }), 1.2, 8)
  out += `<g transform="translate(2 -84)"><g class="ct">${wash(rand, tail, '#0b121a', 0.88, '#03060a', 0.6, 2)}</g></g>`
  out += fill(poly(blob(rand, -26, -50, 24, 32, -12, 0.14, 28)), '#0b121a', 0.35)
  out += fill(poly(blob(rand, 26, -50, 24, 32, 12, 0.14, 28)), '#0b121a', 0.35)
  out += wash(rand, body, '#0b121a', 0.86, '#03060a', 0.6, 2.6)
  out += fill(poly(roughen(rand, blob(rand, -10, -40, 26, 40, 8, 0.2, 24), 3, 6)), '#3a5568', 0.2)
  const grains: P[] = []
  while (grains.length < 140) {
    const x = between(rand, -54, 54)
    const y = between(rand, -92, 50)
    if ((x / 54) ** 2 + ((y + 20) / 74) ** 2 < 0.85) {
      grains.push([x, y])
    }
  }
  out += `<path d="${dots(grains)}" stroke="#2c4152" stroke-width="1.5" stroke-linecap="round" stroke-opacity=".5"/>`
  out += fill(poly(blob(rand, -46, 30, 12, 9, 0, 0.12, 18)), '#0b121a', 0.92)
  out += fill(poly(blob(rand, 58, 8, 14, 9, -12, 0.12, 18)), '#0b121a', 0.92)
  out += wash(rand, roughen(rand, [[-33, 70], [-42, 105], [-13, 88]], 1.4, 4), '#0b121a', 0.92, '#03060a', 0.5, 1.4)
  out += wash(rand, roughen(rand, [[33, 70], [42, 105], [13, 88]], 1.4, 4), '#0b121a', 0.92, '#03060a', 0.5, 1.4)
  out += wash(rand, blob(rand, 0, 58, 36, 31, 0, 0.06, 40), '#0b121a', 0.92, '#03060a', 0.55, 2)
  out += fill(poly([[-28, 78], [-33, 96], [-18, 88]]), '#3b2a3a', 0.6) + fill(poly([[28, 78], [33, 96], [18, 88]]), '#3b2a3a', 0.6)
  const whiskers: P[][] = []
  for (const side of [1, -1]) {
    for (const [dy, reach] of [
      [-10, 58],
      [0, 64],
      [10, 56],
    ] as const) {
      whiskers.push(stroke(rand, curve([side * 12, 50], [side * 34, 46 + dy * 0.6], [side * reach, 42 + dy * 1.6]), taper(1.4, 0.05, 0.7), { n: 12, wobble: 0.3 }))
    }
  }
  out += fill(polys(whiskers), '#d7ece6', 0.35)
  out += `<g transform="translate(0 64)">`
  out += `<circle cx="-14" cy="0" r="17" fill="url(#eyeGlow)"/><circle cx="14" cy="0" r="17" fill="url(#eyeGlow)"/><g class="bl">`
  for (const x of [-14, 14]) {
    const eye = blob(rand, x, 0, 8.6, 6.2, 0, 0.06, 24)
    out +=
      wash(rand, eye, '#b8e86a', 0.95, '#5f9a2a', 0.7, 1.2) +
      fill(poly(blob(rand, x - 1.5, -1.5, 4.5, 3, 0, 0.1, 12)), '#e8ffb0', 0.5) +
      fill(poly(blob(rand, x, 0, 1.8, 5.2, 0, 0.05, 12)), '#05080b') +
      `<circle cx="${x + 2.4}" cy="-2.4" r="1.2" fill="#fbfff0"/>`
  }
  out += `</g></g>`
  return `<g transform="translate(0 34) scale(1.22)">${out}</g>`
}

// Rings of pale water spreading from the cat, each a ragged band.
function ripples(): string {
  const rand = seeded(23)
  let out = ''

  for (let ring = 0; ring < 3; ring++) {
    const outer = blob(rand, 0, 0, 110, 110, 0, 0.07, 60, 9)
    const inner = blob(rand, 0, 0, 100, 100, 0, 0.07, 60, 9)
    out += `<g class="rp" style="animation-delay:-${ring * 4}s">${fill(poly(outer) + poly(inner.reverse()), '#a9e8dc', 0.13, ' fill-rule="evenodd"')}</g>`
  }
  return out
}

// Two wide, faint glazes turning with the whirl.
function swirl(): string {
  const rand = seeded(29)
  const arms: P[][] = []

  for (let arm = 0; arm < 2; arm++) {
    const a0 = arm * Math.PI + 0.6
    const spiral = (t: number): P => {
      const a = a0 + t * Math.PI
      const r = 170 + t * 260
      return [Math.cos(a) * r, Math.sin(a) * r]
    }
    arms.push(roughen(rand, stroke(rand, spiral, taper(46, 0.2, 0.4), { n: 40, wobble: 6 }), 3, 10))
  }
  return `<g class="o" style="animation-duration:240s">${arms.map(a => wash(rand, a, '#7fd1c4', 0.07, '#a9e8dc', 0.1, 2)).join('')}</g>`
}

// The ground: blooms laid wet into wet, glazes with tide marks, cauliflower
// backruns, and pigment settling into the paper's grain.
function ground(): string {
  const rand = seeded(31)
  const soft: [string, number, number, number, number, number, string][] = [
    ['teal', VX, VY, 560, 480, 0, ''],
    ['green', VX + 200, VY + 300, 380, 300, 20, ''],
    ['indigo', 220, 180, 520, 420, -10, ' class="dw"'],
    ['violet', 260, 820, 520, 380, 15, ''],
    ['indigo', 760, 520, 420, 360, 0, ''],
    ['teal', 640, 120, 380, 260, 30, ' class="dw" style="animation-duration:70s"'],
    ['violet', 1450, 120, 360, 300, 0, ''],
    ['green', 1500, 900, 360, 260, -20, ''],
    ['deep', 800, 1000, 600, 260, 0, ''],
    ['deep', 0, 500, 300, 520, 0, ''],
  ]
  let out = `<rect width="${W}" height="${H}" fill="#0f1c26"/>`

  for (const [g, x, y, rx, ry, rot, extra] of soft) {
    out += `<g${extra}><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="url(#${g})"/></g>`
  }
  const glazes: [number, number, number, number, string, string][] = [
    [380, 300, 300, 220, '#2f3f7a', '#141c3c'],
    [900, 760, 340, 200, '#3c2f6e', '#1a1436'],
    [VX - 60, VY + 40, 430, 380, '#2b7a78', '#0f3434'],
    [150, 640, 240, 200, '#2f6b4f', '#123224'],
    [1380, 820, 260, 180, '#2b6a6c', '#0f3233'],
    [700, 260, 260, 160, '#2b5a7a', '#112a3c'],
  ]
  for (const [x, y, rx, ry, color, edgeColor] of glazes) {
    out += wash(rand, blob(rand, x, y, rx, ry, rand() * 180, 0.18, 56, 6), color, 0.12, edgeColor, 0.32, 2.6)
  }
  for (const [x, y, r] of [
    [520, 520, 150],
    [1000, 160, 120],
    [300, 380, 110],
    [1420, 600, 120],
  ] as const) {
    const bloom = roughen(rand, blob(rand, x, y, r, r * 0.8, rand() * 180, 0.1, 72, 5), 9, 18)
    out += wash(rand, bloom, '#6fb8b0', 0.06, '#9fe3d6', 0.08, 1.4)
  }
  const grains = (cx: number, cy: number, spread: number, count: number): P[] =>
    Array.from({ length: count }, (): P => {
      const a = rand() * Math.PI * 2
      const d = spread * Math.sqrt(rand())
      return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7]
    })
  const dark = [...grains(300, 760, 260, 220), ...grains(760, 560, 200, 160), ...grains(1460, 180, 180, 140)]
  const pale = [...grains(VX, VY, 420, 180), ...grains(420, 200, 200, 90)]
  out += `<path d="${dots(dark)}" stroke="#050b11" stroke-width="1.7" stroke-linecap="round" stroke-opacity=".38"/>`
  out += `<path d="${dots(pale)}" stroke="#a7dccf" stroke-width="1.2" stroke-linecap="round" stroke-opacity=".14"/>`
  return out
}

// Light on the water: soft patches drifting, and flecks of bare paper.
function light(): string {
  const rand = seeded(37)
  let out = ''

  for (const [x, y, rx, ry, dur] of [
    [VX - 160, VY - 120, 220, 150, 46],
    [VX + 160, VY + 120, 200, 140, 58],
    [620, 340, 240, 160, 64],
    [380, 760, 220, 150, 52],
    [1000, 820, 200, 130, 70],
  ] as const) {
    out += `<g class="lt" style="animation-duration:${dur}s;animation-delay:-${Math.round(rand() * dur)}s"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#light)"/></g>`
  }
  const flecks: string[] = []
  for (let i = 0; i < 26; i++) {
    const x = rand() * W
    const y = rand() * H
    flecks.push(
      `<circle class="tw" cx="${Math.round(x)}" cy="${Math.round(y)}" r="${num(between(rand, 0.8, 2))}" style="animation-duration:${num(between(rand, 6, 11))}s;animation-delay:-${num(rand() * 11)}s"/>`,
    )
  }
  return out + `<g fill="#f5ecd6">${flecks.join('')}</g>`
}

function lotus(rand: Rand, size: number): string {
  let out = ''

  for (const [count, len, wid, color, edgeColor, opacity, turn] of [
    [8, 1, 0.42, '#f2a3bf', '#c9577f', 0.55, 0],
    [6, 0.72, 0.36, '#fbd0de', '#d97a9a', 0.62, 22],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 360 + turn + between(rand, -8, 8)
      const rad = (a * Math.PI) / 180
      const r = size * len * 0.55
      const petal = blob(rand, Math.cos(rad) * r, Math.sin(rad) * r, size * len * 0.55, size * wid * 0.5, a, 0.12, 22, 4)
      out += wash(rand, petal, color, opacity, edgeColor, 0.5, 1.1)
    }
  }
  const seeds: P[] = Array.from({ length: 12 }, (): P => [between(rand, -size * 0.14, size * 0.14), between(rand, -size * 0.14, size * 0.14)])
  return out + fill(poly(blob(rand, 0, 0, size * 0.18, size * 0.18, 0, 0.1, 16)), '#f2cf5a', 0.85) + `<path d="${dots(seeds)}" stroke="#a8781a" stroke-width="1.6" stroke-linecap="round"/>`
}

function lilyPad(rand: Rand, cx: number, cy: number, r: number, rot: number, flower: number, extra = ''): string {
  const half = 0.26
  const disc: P[] = [[r * 0.04, 0]]

  for (let i = 0; i <= 40; i++) {
    const a = half + (i / 40) * (Math.PI * 2 - half * 2)
    disc.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  const leaf = roughen(rand, disc, r * 0.035, 9)
  const bloom = roughen(rand, swell(disc, 0.55), r * 0.08, 7).map(([x, y]): P => [x + r * 0.12, y - r * 0.15])
  const veins: P[][] = []

  for (const a of [half + 0.9, 2.2, 3.5, 4.6, Math.PI * 2 - half - 0.7]) {
    veins.push(stroke(rand, (t: number): P => [Math.cos(a) * r * (0.1 + t * 0.74), Math.sin(a) * r * (0.1 + t * 0.74)], taper(Math.max(1.2, r / 55), 0.1, 0.6), { n: 10, wobble: 0.3 }))
  }
  return (
    `<g transform="translate(${Math.round(cx)} ${Math.round(cy)})"${extra}>` +
    `<g class="pd" style="animation-duration:${num(between(rand, 9, 14))}s;animation-delay:-${num(rand() * 12)}s"><g transform="rotate(${rot})">` +
    `<path transform="translate(5 7)" d="${poly(swell(leaf, 1.04))}" fill="#04100c" fill-opacity=".3"/>` +
    wash(rand, leaf, '#3e8a55', 0.72, '#1f5434', 0.6, 2.4) +
    fill(poly(bloom), '#8ccf6a', 0.3) +
    fill(polys(veins), '#a9dc8a', 0.2) +
    `</g>` +
    (flower > 0 ? `<g transform="translate(${Math.round(-r * 0.2)} ${Math.round(r * 0.18)})">${lotus(rand, flower)}</g>` : '') +
    `</g></g>`
  )
}

function lilyPads(): string {
  const rand = seeded(41)
  const pads: [number, number, number, number, number][] = [
    [80, 130, 100, 200, 70],
    [240, 50, 54, 40, 0],
    [36, 580, 72, 320, 0],
    [150, 905, 112, 120, 0],
    [322, 984, 58, 250, 0],
    [1548, 70, 50, 140, 0],
    [1592, 300, 36, 20, 0],
    [1470, 940, 80, 300, 56],
  ]
  const portrait: [number, number, number, number, number][] = [
    [640, 955, 66, 30, 0],
    [990, 40, 50, 190, 40],
  ]
  return (
    pads.map(([x, y, r, rot, f]) => lilyPad(rand, x, y, r, rot, f)).join('') +
    portrait.map(([x, y, r, rot, f]) => lilyPad(rand, x, y, r, rot, f, ' class="pt"')).join('')
  )
}

// Two lotus petals adrift.
function petals(): string {
  const rand = seeded(43)
  const petal = (): string => wash(rand, blob(rand, 0, 0, 16, 7, 20, 0.15, 18), '#f2a3bf', 0.6, '#c9577f', 0.5, 1)
  return (
    `<g transform="translate(560 200)"><g class="lf" style="animation-duration:105s;animation-delay:-35s">${petal()}</g></g>` +
    `<g transform="translate(880 830)"><g class="lf" style="animation-duration:140s;animation-delay:-90s">${petal()}</g></g>`
  )
}

const gradient = (id: string, color: string, a: number): string =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${a}"/><stop offset=".6" stop-color="${color}" stop-opacity="${num(a * 0.45)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

const STYLE = `
.o,.sw,.tl,.rp,.ct,.bl,.pd,.lf,.lt,.dw,.vx{transform-origin:0 0}
.o{animation:spin 120s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.sw{animation:sway 9s ease-in-out infinite alternate}
@keyframes sway{from{transform:translateX(-10px)}to{transform:translateX(10px)}}
.tl{animation:tail var(--s,2s) ease-in-out var(--d,0s) infinite alternate}
@keyframes tail{from{transform:rotate(-10deg)}to{transform:rotate(10deg)}}
.rp{opacity:.5;animation:ripple 12s ease-out infinite}
@keyframes ripple{from{transform:scale(1);opacity:.8}to{transform:scale(2.6);opacity:0}}
.ct{animation:tailcat 6s ease-in-out infinite alternate}
@keyframes tailcat{from{transform:rotate(-6deg)}to{transform:rotate(8deg)}}
.bl{animation:blink 8s ease-in-out infinite}
@keyframes blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
.pd{animation:bob 11s ease-in-out infinite alternate}
@keyframes bob{from{transform:rotate(-2deg)}to{transform:rotate(2deg)}}
.lf{animation:leaf 100s linear infinite}
@keyframes leaf{from{transform:translate(-1000px,-50px) rotate(-30deg)}to{transform:translate(1000px,50px) rotate(60deg)}}
.lt{animation:light 50s ease-in-out infinite alternate}
@keyframes light{from{transform:translate(-40px,-20px);opacity:.5}to{transform:translate(50px,30px);opacity:1}}
.dw{animation:dw 90s ease-in-out infinite alternate}
@keyframes dw{to{transform:translate(40px,30px)}}
.tw{opacity:.4;animation:twinkle 8s ease-in-out infinite alternate}
@keyframes twinkle{from{opacity:.1}to{opacity:.75}}
.pt{display:none}
@media (max-aspect-ratio:3/2){.vx{transform:translate(1320px,460px) scale(.76)}}
@media (max-aspect-ratio:5/4){.vx{transform:translate(1220px,470px) scale(.66)}}
@media (max-aspect-ratio:1/1){.vx{transform:translate(800px,280px) scale(.42)}.pt{display:inline}}
`

export const WATER_SCENE =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
  `<style>${STYLE}</style>` +
  `<defs>${KOI_DEFS}` +
  gradient('teal', '#1f6a6c', 0.6) +
  gradient('green', '#1f5a46', 0.55) +
  gradient('indigo', '#28366e', 0.6) +
  gradient('violet', '#45316c', 0.55) +
  gradient('deep', '#060d13', 0.7) +
  gradient('light', '#8fe0cf', 0.16) +
  gradient('eyeGlow', '#b6f06a', 0.35) +
  `<radialGradient id="vignette" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#03080c" stop-opacity="0"/><stop offset="1" stop-color="#03080c" stop-opacity=".55"/></radialGradient>` +
  `</defs>` +
  ground() +
  light() +
  `<g class="vx" transform="translate(${VX} ${VY}) scale(.86)">` +
  swirl() +
  ripples() +
  school(true) +
  cat() +
  school(false) +
  `</g>` +
  lilyPads() +
  petals() +
  `<rect width="${W}" height="${H}" fill="url(#vignette)"/>` +
  `</svg>`

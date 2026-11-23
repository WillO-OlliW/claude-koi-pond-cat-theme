// The koi pond backdrop, built once as one SVG string: dark teal water under
// drifting caustic light, a black cat sitting in the middle of a slow whirl
// of koi, ripples spreading from the cat, and lily pads around the edges.
// Everything moves with CSS alone; with motion taken out it is a still pond.

const W = 1600
const H = 1000

// The whirl sits right of centre, away from the conversation column.
const VX = 1390
const VY = 450

// A small seeded random source, so the pond looks the same on every load.
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r1 = (v: number): string => String(Math.round(v * 10) / 10)
const r0 = (v: number): string => String(Math.round(v))
const pt = (x: number, y: number): string => `${r0(x)} ${r0(y)}`

type P = [number, number]

// Keeps the part of a polygon on the site's side of the line halfway to q.
function clipToward(poly: P[], s: P, q: P): P[] {
  const nx = q[0] - s[0]
  const ny = q[1] - s[1]
  const mx = (s[0] + q[0]) / 2
  const my = (s[1] + q[1]) / 2
  const side = (p: P): number => (p[0] - mx) * nx + (p[1] - my) * ny
  const out: P[] = []

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const sa = side(a)
    const sb = side(b)

    if (sa <= 0) {
      out.push(a)
    }
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

// Caustic light: a Voronoi web of rounded cells, as sunlight through ripples
// draws on a pond floor, all in a few long paths.
function causticPaths(seed: number, spacing: number, buckets: number): string[] {
  const rand = seeded(seed)
  const out: string[] = Array.from({ length: buckets }, () => '')
  const pad = spacing * 2
  const cols = Math.ceil((W + pad * 2) / spacing) + 1
  const rows = Math.ceil((H + pad * 2) / spacing) + 1
  const sites: P[][] = []

  for (let r = 0; r < rows; r++) {
    const line: P[] = []

    for (let c = 0; c < cols; c++) {
      line.push([
        -pad + c * spacing + (r % 2 === 1 ? spacing / 2 : 0) + (rand() - 0.5) * spacing * 0.7,
        -pad + r * spacing * 0.9 + (rand() - 0.5) * spacing * 0.7,
      ])
    }
    sites.push(line)
  }

  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      const s = sites[r]![c]!
      const e = spacing * 1.6
      let poly: P[] = [
        [s[0] - e, s[1] - e],
        [s[0] + e, s[1] - e],
        [s[0] + e, s[1] + e],
        [s[0] - e, s[1] + e],
      ]

      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (dr !== 0 || dc !== 0) {
            poly = clipToward(poly, s, sites[r + dr]![c + dc]!)
          }
        }
      }
      // Pull each corner in a touch, so neighbouring cells leave a seam of light.
      const k = poly.length
      const inset = 0.9 + rand() * 0.05
      const pts = poly.map(([x, y]): P => [s[0] + (x - s[0]) * inset, s[1] + (y - s[1]) * inset])
      const mid = (i: number): P => {
        const p = pts[i % k]!
        const q = pts[(i + 1) % k]!
        return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      }
      const m0 = mid(k - 1)
      let d = `M${pt(m0[0], m0[1])}`

      for (let i = 0; i < k; i++) {
        const p = pts[i]!
        const m = mid(i)
        d += `Q${pt(p[0], p[1])} ${pt(m[0], m[1])}`
      }
      out[Math.floor(rand() * buckets)] += `${d}Z`
    }
  }
  return out
}

function causticLayer(seed: number, spacing: number, cls: string, color: string): string {
  const widths = [1.4, 2.2, 3.4]
  const alphas = [0.38, 0.26, 0.15]
  const paths = causticPaths(seed, spacing, widths.length)
    .map(
      (d, i) =>
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="${widths[i]}" stroke-opacity="${alphas[i]}" stroke-linejoin="round"/>`,
    )
    .join('')

  return `<g class="${cls}">${paths}</g>`
}

// Koi: head toward +x, about 100 long, drawn around the origin.
type KoiColors = { body: string; hi: string; fin: string; dark: string }

const KOI: Record<string, KoiColors> = {
  o: { body: '#f07a2a', hi: '#ffb46a', fin: '#ff9a4d', dark: '#b9501a' },
  r: { body: '#e0452f', hi: '#ff8d6b', fin: '#f2684e', dark: '#9c2c1c' },
  b: { body: '#2f6fd6', hi: '#86b8ff', fin: '#4d8cec', dark: '#1b4596' },
  n: { body: '#2a4fae', hi: '#6a92e6', fin: '#3e67c8', dark: '#172f72' },
  y: { body: '#f2b42c', hi: '#ffe08e', fin: '#ffca52', dark: '#bf8412' },
}

function koiGradients(): string {
  return Object.entries(KOI)
    .map(
      ([k, c]) =>
        `<linearGradient id="k${k}" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="${c.dark}"/><stop offset=".3" stop-color="${c.body}"/>` +
        `<stop offset=".5" stop-color="${c.hi}"/><stop offset=".7" stop-color="${c.body}"/>` +
        `<stop offset="1" stop-color="${c.dark}"/></linearGradient>`,
    )
    .join('')
}

const KOI_BODY = 'M50 0C48-9 33-14 12-14C-10-14-30-8-46-2L-46 2C-30 8-10 14 12 14C33 14 48 9 50 0Z'
const KOI_TAIL = 'M2 0C-6-3-15-10-30-15C-24-5-24 5-30 15C-15 10-6 3 2 0Z'
const KOI_FINS = 'M24-8C19-18 10-23 1-24C6-16 11-11 17-7ZM24 8C19 18 10 23 1 24C6 16 11 11 17 7Z'

function koi(kind: string, tailSec: number, tailDelay: number): string {
  const c = KOI[kind]!

  return (
    `<path d="${KOI_FINS}" fill="${c.fin}" fill-opacity=".8"/>` +
    `<g transform="translate(-44 0)"><g class="tl" style="animation-duration:${r1(tailSec)}s;animation-delay:-${r1(tailDelay)}s">` +
    `<path d="${KOI_TAIL}" fill="${c.fin}" fill-opacity=".9"/></g></g>` +
    `<path d="${KOI_BODY}" fill="url(#k${kind})"/>` +
    `<path d="M34 0L-30 0" stroke="${c.dark}" stroke-width="2.2" stroke-opacity=".45" stroke-linecap="round"/>` +
    `<circle cx="40" cy="-5.5" r="1.6" fill="#101418"/><circle cx="40" cy="5.5" r="1.6" fill="#101418"/>`
  )
}

type Ring = { radius: number; count: number; seconds: number; kinds: string; offset: number }

const RINGS: Ring[] = [
  { radius: 168, count: 6, seconds: 62, kinds: 'obrbyn', offset: 10 },
  { radius: 240, count: 8, seconds: 84, kinds: 'bornbyro', offset: 35 },
  { radius: 314, count: 10, seconds: 108, kinds: 'robnoybrbo', offset: 5 },
  { radius: 392, count: 12, seconds: 136, kinds: 'bnorbyobnrob', offset: 22 },
]

function koiRings(): string {
  const rand = seeded(7)

  return RINGS.map(ring => {
    let fish = ''

    for (let i = 0; i < ring.count; i++) {
      const angle = ring.offset + (360 / ring.count) * i + (rand() - 0.5) * 14
      const radius = ring.radius + (rand() - 0.5) * 26
      const scale = 0.95 + rand() * 0.32
      const heading = 90 + 6 + rand() * 6
      const kind = ring.kinds[i % ring.kinds.length]!
      fish +=
        `<g transform="rotate(${r1(angle)})">` +
        `<g class="sw" style="animation-duration:${r1(5 + rand() * 4)}s;animation-delay:-${r1(rand() * 9)}s">` +
        `<g transform="translate(${r1(radius)} 0) rotate(${r1(heading)}) scale(${Math.round(scale * 100) / 100})">` +
        koi(kind, 0.9 + rand() * 0.6, rand() * 2) +
        `</g></g></g>`
    }
    return `<g class="o" style="animation-duration:${ring.seconds}s">${fish}</g>`
  }).join('')
}

// Faint spiral arms of light that turn slowly around the cat.
function swirl(): string {
  let d = ''

  for (let arm = 0; arm < 3; arm++) {
    const a0 = (arm / 3) * Math.PI * 2
    const steps = 48

    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const a = a0 + t * Math.PI * 1.7
      const rad = 70 + t * 360
      d += `${s === 0 ? 'M' : 'L'}${pt(Math.cos(a) * rad, Math.sin(a) * rad)}`
    }
  }
  return (
    `<g class="o" style="animation-duration:150s">` +
    `<path d="${d}" fill="none" stroke="#8ff5e2" stroke-opacity=".1" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="#c9fff4" stroke-opacity=".12" stroke-width="1.6" stroke-linecap="round"/></g>`
  )
}

// The cat, seen from above: head toward the bottom, looking up out of the water.
const CAT = `<g transform="translate(0 36) scale(1.18)">
<g transform="translate(2 -88)"><g class="ct"><path d="M0 0C8-38-24-56-16-96C-12-114 4-118 10-108" fill="none" stroke="#0b1616" stroke-width="15" stroke-linecap="round"/></g></g>
<ellipse cx="-48" cy="-60" rx="11" ry="14" fill="#0b1616"/><ellipse cx="49" cy="-56" rx="11" ry="14" fill="#0b1616"/>
<path d="M-32 40C-54 18-60-38-46-70C-34-96 34-96 46-70C60-38 54 18 32 40Z" fill="url(#catBody)"/>
<path d="M0-82C5-46 5-6 0 30" fill="none" stroke="#1d3a38" stroke-opacity=".45" stroke-width="10" stroke-linecap="round"/>
<ellipse cx="-44" cy="30" rx="11" ry="9" fill="#0b1616"/>
<ellipse cx="56" cy="6" rx="14" ry="9" transform="rotate(-12 56 6)" fill="#0b1616"/>
<path d="M-31 70L-37 101L-11 87Z" fill="#0b1616"/><path d="M31 70L37 101L11 87Z" fill="#0b1616"/>
<path d="M-28 77L-32 95L-17 87Z" fill="#1d2f2e"/><path d="M28 77L32 95L17 87Z" fill="#1d2f2e"/>
<ellipse cx="0" cy="60" rx="36" ry="31" fill="url(#catHead)"/>
<path d="M-4 45L4 45L0 50Z" fill="#2a4644"/>
<path d="M-7 48L-46 38M-7 50L-48 50M-7 52L-44 61M7 48L46 38M7 50L48 50M7 52L44 61" stroke="#a7d4ca" stroke-opacity=".4" stroke-width="1" stroke-linecap="round"/>
<g transform="translate(0 64)">
<circle cx="-13" cy="0" r="15" fill="url(#eyeGlow)"/><circle cx="13" cy="0" r="15" fill="url(#eyeGlow)"/>
<g class="bl">
<ellipse cx="-13" cy="0" rx="7.5" ry="6" fill="url(#eye)"/><ellipse cx="13" cy="0" rx="7.5" ry="6" fill="url(#eye)"/>
<ellipse cx="-13" cy="0" rx="1.7" ry="5" fill="#061010"/><ellipse cx="13" cy="0" rx="1.7" ry="5" fill="#061010"/>
<circle cx="-11" cy="-2.5" r="1.3" fill="#effed8"/><circle cx="15" cy="-2.5" r="1.3" fill="#effed8"/>
</g></g></g>`

// Ripples that spread from the cat and fade under the koi.
const RIPPLES = [0, 3, 6]
  .map(
    delay =>
      `<circle class="rp" r="60" fill="none" stroke="#9ff5e6" stroke-width="2" vector-effect="non-scaling-stroke" style="animation-delay:-${delay}s"/>`,
  )
  .join('')

// Lily pads: a disc with a notch, veins, a rim and a shadow, bobbing slowly.
function lilyPad(
  cx: number,
  cy: number,
  r: number,
  rot: number,
  fill: string,
  rand: () => number,
  extraClass = '',
): string {
  const half = 0.27
  const p0 = pt(Math.cos(-half) * r, Math.sin(-half) * r)
  const p1 = pt(Math.cos(half) * r, Math.sin(half) * r)
  const disc = `M0 0L${p1}A${r0(r)} ${r0(r)} 0 1 1 ${p0}Z`
  let veins = ''

  for (let i = 1; i < 9; i++) {
    const a = half + (i / 9) * (Math.PI * 2 - half * 2)
    veins += `M${pt(Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.12)}L${pt(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9)}`
  }
  return (
    `<g transform="translate(${r0(cx)} ${r0(cy)})"${extraClass ? ` class="${extraClass}"` : ''}>` +
    `<g class="pd" style="animation-duration:${r1(7 + rand() * 5)}s;animation-delay:-${r1(rand() * 10)}s">` +
    `<g transform="rotate(${r0(rot)})">` +
    `<path d="${disc}" transform="translate(6 8)" fill="#010d0e" fill-opacity=".38"/>` +
    `<path d="${disc}" fill="url(#${fill})"/>` +
    `<path d="${veins}" stroke="#235c27" stroke-opacity=".55" stroke-width="${r1(Math.max(1, r / 50))}" stroke-linecap="round"/>` +
    `<path d="${disc}" fill="none" stroke="#9ad66c" stroke-opacity=".4" stroke-width="2.4"/>` +
    `</g></g></g>`
  )
}

function lilyPads(): string {
  const rand = seeded(42)
  const pads: [number, number, number, number, string][] = [
    [70, 120, 98, 200, 'padA'],
    [222, 46, 58, 40, 'padB'],
    [30, 560, 74, 320, 'padA'],
    [140, 905, 112, 120, 'padA'],
    [312, 985, 62, 250, 'padB'],
    [1545, 75, 54, 140, 'padB'],
    [1590, 300, 38, 20, 'padA'],
    [1455, 935, 88, 300, 'padA'],
    [1590, 790, 48, 210, 'padB'],
  ]
  // Two more for a tall screen, where the edges are cut away.
  const portrait: [number, number, number, number, string][] = [
    [640, 955, 70, 30, 'padA'],
    [990, 40, 52, 190, 'padB'],
  ]

  return (
    pads.map(([x, y, r, rot, f]) => lilyPad(x, y, r, rot, f, rand)).join('') +
    portrait.map(([x, y, r, rot, f]) => lilyPad(x, y, r, rot, f, rand, 'pt')).join('')
  )
}

// Specks of light in the water, and duckweed gathered near the pads.
function specks(): string {
  const rand = seeded(99)
  let water = ''

  for (let i = 0; i < 90; i++) {
    water += `<circle cx="${r0(rand() * W)}" cy="${r0(rand() * H)}" r="${r1(0.8 + rand() * 1.6)}" fill-opacity="${r1(0.15 + rand() * 0.3)}"/>`
  }
  let weed = ''
  const clusters: [number, number, number][] = [
    [190, 210, 70],
    [90, 700, 60],
    [330, 860, 60],
    [1500, 200, 50],
    [1360, 860, 60],
    [1560, 640, 40],
  ]

  for (const [x, y, spread] of clusters) {
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2
      const d = rand() * spread
      weed += `<ellipse cx="${r0(x + Math.cos(a) * d)}" cy="${r0(y + Math.sin(a) * d)}" rx="${r1(2 + rand() * 4)}" ry="${r1(1.5 + rand() * 3)}"/>`
    }
  }
  return (
    `<g class="dr" fill="#7fe0cf">${water}</g>` +
    `<g class="dr" style="animation-duration:33s" fill="#a3d046" fill-opacity=".75">${weed}</g>`
  )
}

const STYLE = `
.o,.sw,.tl,.rp,.ct,.bl,.pd,.dr,.ca,.cb,.vx{transform-origin:0 0}
.o{animation:spin 100s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.sw{animation:sway 7s ease-in-out infinite alternate}
@keyframes sway{from{transform:translateX(-9px)}to{transform:translateX(9px)}}
.tl{animation:tail 1.2s ease-in-out infinite alternate}
@keyframes tail{from{transform:rotate(-16deg)}to{transform:rotate(16deg)}}
.ca{animation:driftA 34s ease-in-out infinite alternate}
@keyframes driftA{to{transform:translate(46px,28px)}}
.cb{opacity:.75;animation:driftB 41s ease-in-out infinite alternate,breathe 13s ease-in-out infinite alternate}
@keyframes driftB{to{transform:translate(-40px,34px)}}
@keyframes breathe{from{opacity:.45}to{opacity:1}}
.rp{opacity:.22;animation:ripple 9s ease-out infinite}
@keyframes ripple{from{transform:scale(1);opacity:.4}to{transform:scale(6.5);opacity:0}}
.ct{animation:tailcat 5s ease-in-out infinite alternate}
@keyframes tailcat{from{transform:rotate(-7deg)}to{transform:rotate(9deg)}}
.bl{animation:blink 7s ease-in-out infinite}
@keyframes blink{0%,93%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.1)}}
.pd{animation:bob 9s ease-in-out infinite alternate}
@keyframes bob{from{transform:rotate(-3deg) scale(.99)}to{transform:rotate(3deg) scale(1.01)}}
.dr{animation:float 26s ease-in-out infinite alternate}
@keyframes float{to{transform:translate(18px,-22px)}}
.pt{display:none}
@media (max-aspect-ratio:3/2){.vx{transform:translate(1320px,460px) scale(.74)}}
@media (max-aspect-ratio:5/4){.vx{transform:translate(1220px,470px) scale(.64)}}
@media (max-aspect-ratio:1/1){.vx{transform:translate(800px,280px) scale(.42)}.pt{display:inline}}
`

const DEFS =
  `<defs>` +
  `<radialGradient id="water" cx="${r1(VX / W)}" cy="${r1(VY / H)}" r=".85">` +
  `<stop offset="0" stop-color="#155652"/><stop offset=".35" stop-color="#0e3f40"/>` +
  `<stop offset=".75" stop-color="#09292b"/><stop offset="1" stop-color="#051a1c"/></radialGradient>` +
  `<radialGradient id="shaft"><stop offset="0" stop-color="#3fb7a6" stop-opacity=".28"/>` +
  `<stop offset="1" stop-color="#3fb7a6" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="vignette" cx=".5" cy=".5" r=".75">` +
  `<stop offset=".55" stop-color="#020b0c" stop-opacity="0"/><stop offset="1" stop-color="#020b0c" stop-opacity=".6"/></radialGradient>` +
  `<linearGradient id="calm" x1="0" y1="0" x2="1" y2="0">` +
  `<stop offset=".15" stop-color="#041416" stop-opacity="0"/><stop offset=".42" stop-color="#041416" stop-opacity=".28"/>` +
  `<stop offset=".62" stop-color="#041416" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="catBody" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#16292a"/><stop offset="1" stop-color="#091313"/></radialGradient>` +
  `<radialGradient id="catHead" cx=".5" cy=".4" r=".65"><stop offset="0" stop-color="#172a2a"/><stop offset="1" stop-color="#0a1414"/></radialGradient>` +
  `<radialGradient id="eye" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#d8ff8a"/><stop offset=".6" stop-color="#9ee052"/><stop offset="1" stop-color="#4f8f2a"/></radialGradient>` +
  `<radialGradient id="eyeGlow"><stop offset="0" stop-color="#b6f06a" stop-opacity=".35"/><stop offset="1" stop-color="#b6f06a" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="padA" cx=".45" cy=".45" r=".6"><stop offset="0" stop-color="#6fbb52"/><stop offset=".7" stop-color="#3f8c3a"/><stop offset="1" stop-color="#2b6b30"/></radialGradient>` +
  `<radialGradient id="padB" cx=".45" cy=".45" r=".6"><stop offset="0" stop-color="#9ccc48"/><stop offset=".7" stop-color="#5e9e38"/><stop offset="1" stop-color="#3b7a2e"/></radialGradient>` +
  koiGradients() +
  `</defs>`

export const SCENE =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
  `<style>${STYLE}</style>` +
  DEFS +
  `<!-- water -->` +
  `<rect width="${W}" height="${H}" fill="url(#water)"/>` +
  `<circle cx="${VX}" cy="${VY}" r="520" fill="url(#shaft)"/>` +
  causticLayer(11, 120, 'ca', '#6fe8d6') +
  `<!-- the cat and the whirl -->` +
  `<g class="vx" transform="translate(${VX} ${VY}) scale(.86)">` +
  swirl() +
  CAT +
  `</g>` +
  causticLayer(23, 104, 'cb', '#8ff3e2') +
  `<g class="vx" transform="translate(${VX} ${VY}) scale(.86)">` +
  RIPPLES +
  koiRings() +
  `</g>` +
  `<!-- surface -->` +
  specks() +
  lilyPads() +
  `<rect width="${W}" height="${H}" fill="url(#calm)"/>` +
  `<rect width="${W}" height="${H}" fill="url(#vignette)"/>` +
  `</svg>`

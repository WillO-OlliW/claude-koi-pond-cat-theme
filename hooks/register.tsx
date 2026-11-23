import type { EngineInterface, Register, ThemeMessageRule, ThemeSetArgs, ThemeSound, ThemeStyle } from 'claude-code'

import { type P, poly, roughen, seeded, stroke, taper } from './brush.js'
import { INK_SCENE } from './ink.js'
import { makeColors } from './make-colors.js'
import { SCENE as PAINTED_SCENE } from './scene.js'
import { WATER_SCENE } from './watercolor.js'

// Four looks of one pond. `/koi ink`, `/koi ink-dark`, `/koi watercolor` or
// `/koi painted` switches between them, and the choice is kept for the next
// session.
const NAMES = ['ink', 'ink-dark', 'watercolor', 'painted'] as const
type LookName = (typeof NAMES)[number]
type Look = { label: string; base: ThemeSetArgs; sound: ThemeSound; style: ThemeStyle }

const isLook = (v: unknown): v is LookName => typeof v === 'string' && (NAMES as readonly string[]).includes(v)

// A rounded box whose edge wanders, for message frames.
function roundBox(seed: number, w: number, h: number, r: number, inset: number, wobble: number): P[] {
  const rand = seeded(seed)
  const pts: P[] = []
  const corners: [number, number, number][] = [
    [w - inset - r, inset + r, -90],
    [w - inset - r, h - inset - r, 0],
    [inset + r, h - inset - r, 90],
    [inset + r, inset + r, 180],
  ]

  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = ((a0 + i * 15) * Math.PI) / 180
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  return roughen(rand, pts, wobble, 6)
}

// --- Ink: rice paper and sumi ---------------------------------------------

const inkColors = makeColors({
  label: 'Koi Pond: Ink',
  id: 'koi-pond-ink',
  only: 'light',
  roles: { accent: '#c24a24', danger: '#a3233a', success: '#5e7d3a', warning: '#b07a16', pro: '#3d5a8a' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#ebe3d0',
        'surface-1': '#f1eadb',
        'surface-2': '#f7f2e7',
        'surface-3': '#f7f2e7',
        'text-primary': '#1f1b16',
        'text-secondary': '#4a4237',
        'text-muted': '#5e5446',
      },
    },
  },
})

// The person's message on a slip of paper, framed in four quick brush strokes.
function brushedFrame(): string {
  const rand = seeded(5)
  const edges = [
    stroke(rand, (t: number): P => [8 + t * 176, 8 + Math.sin(t * 3) * 1.2], taper(5.5, 0.06, 0.2), { n: 30, wobble: 0.8 }),
    stroke(rand, (t: number): P => [184 + Math.sin(t * 2) * 0.8, 6 + t * 114], taper(4.5, 0.08, 0.25), { n: 24, wobble: 0.7 }),
    stroke(rand, (t: number): P => [186 - t * 178, 120 + Math.sin(t * 2.5) * 1], taper(5, 0.08, 0.2), { n: 30, wobble: 0.8 }),
    stroke(rand, (t: number): P => [8 + Math.sin(t * 2) * 0.8, 122 - t * 116], taper(4.2, 0.1, 0.3), { n: 24, wobble: 0.7 }),
  ]
  return edges.map(e => poly(e)).join('')
}

const inkSlip = (paper: `#${string}`, ink: `#${string}`, words: `#${string}`): ThemeMessageRule => ({
  color: words,
  backgroundColor: paper,
  paddingX: 16,
  paddingY: 12,
  fill: {
    vector: {
      viewBox: [192, 128],
      size: [96, 64],
      slice: 36,
      paths: [
        { d: 'M6 6H186V122H6Z', color: paper },
        { d: brushedFrame(), color: ink },
      ],
    },
  },
})

const INK: Look = {
  label: 'ink painting',
  base: {
    colors: inkColors.theme,
    overrideColorScheme: 'light',
    backdrop: { scene: 'ink', glass: { blur: 10, tint: '#efe7d6', opacity: 0.55 } },
  },
  style: {
    Text: { fontFamily: ['serif'] },
    Heading: { fontFamily: ['serif'], color: '#8f2a14' },
    UserMessage: inkSlip('#f6f0e2', '#2a241c', '#1f1b16'),
    AssistantMessage: { color: '#1f1b16', backgroundColor: '#f3ecdcee', radius: 4, padding: 14 },
    ToolUse: { color: '#4a4237', backgroundColor: '#ece3cfee', borderColor: '#cbbd9f', borderWidth: 1, radius: 4, paddingX: 10 },
  },
  // A breeze, still water, a koto string now and then, the odd drop.
  sound: {
    ambience: {
      layers: [
        { wave: 'pink', drone: true, gain: 0.04, filter: { type: 'lowpass', hz: 900, to: 1400 } },
        { wave: 'brown', drone: true, gain: 0.1, filter: { type: 'lowpass', hz: 380 } },
        { wave: 'triangle', notes: ['D5', 'Eb5', 'G5', 'A5', 'Bb5', 'D6'], scatter: 0.04, gain: 0.06, attack: 0.003, release: 1.4, filter: { type: 'lowpass', hz: 2400 } },
        { wave: 'sine', notes: ['D6', 'G6', 'A6'], scatter: 0.06, gain: 0.05, attack: 0.002, release: 0.2, glide: 7 },
      ],
      reverb: 0.4,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['A5'], glide: 12, attack: 0.002, release: 0.18, gain: 0.3 }], reverb: 0.3 },
      tool: { layers: [{ wave: 'triangle', notes: ['D6'], attack: 0.002, release: 0.08, gain: 0.08, filter: { type: 'lowpass', hz: 2000 } }] },
      done: {
        layers: [{ wave: 'triangle', notes: ['D5', 'A5', 'D6'], step: 0.12, release: 1.2, gain: 0.2, filter: { type: 'lowpass', hz: 2600 } }],
        reverb: 0.4,
      },
      ask: { layers: [{ wave: 'bell', notes: ['A5', 'Eb5'], step: 0.16, release: 0.9, gain: 0.2 }], reverb: 0.3 },
      error: { layers: [{ wave: 'triangle', notes: ['D3', 'A2'], step: 0.12, release: 0.5, gain: 0.22, filter: { type: 'lowpass', hz: 900 } }] },
      compact: { layers: [{ wave: 'pink', attack: 0.2, release: 0.8, gain: 0.1, filter: { type: 'bandpass', hz: 600, to: 2400 } }] },
      click: {
        layers: [
          {
            wave: 'triangle',
            notes: ['D5', 'Eb5', 'G5', 'A5', 'Bb5', 'D6', 'Eb6', 'G6'],
            attack: 0.003,
            release: 0.9,
            gain: 0.22,
            filter: { type: 'lowpass', hz: 2600 },
          },
        ],
        reverb: 0.35,
      },
    },
  },
}

// --- Ink at night: the same painting on black paper ------------------------

const inkDarkColors = makeColors({
  label: 'Koi Pond: Ink at night',
  id: 'koi-pond-ink-dark',
  only: 'dark',
  roles: { accent: '#e0603a', danger: '#e04a6a', success: '#8bb06a', warning: '#e0a83a', pro: '#8fa0e0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1c1a17',
        'surface-1': '#221f1b',
        'surface-2': '#25221e',
        'surface-3': '#27241f',
        'text-primary': '#ece6d8',
        'text-secondary': '#c9c1b0',
        'text-muted': '#a69d8b',
      },
    },
  },
})

// The scene is the ink one: told the app shows dark, it paints itself on
// black paper, the koi and lines in pale ink, the cat rimmed in moonlight.
const INK_DARK: Look = {
  label: 'ink painting at night',
  base: {
    colors: inkDarkColors.theme,
    overrideColorScheme: 'dark',
    backdrop: { scene: 'ink', glass: { blur: 10, tint: '#211f1b', opacity: 0.55 } },
  },
  style: {
    Text: { fontFamily: ['serif'] },
    Heading: { fontFamily: ['serif'], color: '#e8704a' },
    UserMessage: inkSlip('#2a2723', '#d8d0bf', '#ece6d8'),
    AssistantMessage: { color: '#ece6d8', backgroundColor: '#1f1d19ee', radius: 4, padding: 14 },
    ToolUse: { color: '#c9c1b0', backgroundColor: '#24211dee', borderColor: '#3d382f', borderWidth: 1, radius: 4, paddingX: 10 },
  },
  sound: INK.sound,
}

// --- Watercolor: the pond at dusk -----------------------------------------

const waterColors = makeColors({
  label: 'Koi Pond: Watercolor',
  id: 'koi-pond-watercolor',
  only: 'dark',
  roles: { accent: '#f08a5d', danger: '#e0525a', success: '#62b98a', warning: '#e9b949', pro: '#9a8ff0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0e1a24',
        'surface-1': '#13212c',
        'surface-2': '#152430',
        'surface-3': '#162632',
        'text-primary': '#ecf0ee',
        'text-secondary': '#c3cfd0',
        'text-muted': '#9fb0b4',
      },
    },
  },
})

// The person's message as a wash of colour, darker where it dried at the edge.
function washBubble(seed: number, color: string, bloom: string, rim: string): ThemeMessageRule {
  const shape = poly(roundBox(seed, 192, 128, 30, 6, 2.2))
  const inner = poly(roundBox(seed + 1, 150, 90, 24, 14, 3))
  return {
    color: '#ecf0ee',
    backgroundColor: color as `#${string}`,
    paddingX: 16,
    paddingY: 12,
    fill: {
      vector: {
        viewBox: [192, 128],
        size: [96, 64],
        slice: 40,
        paths: [
          { d: shape, color: color as `#${string}` },
          { d: inner, color: bloom as `#${string}` },
          { d: shape, strokeWidth: 1.5, color: rim as `#${string}` },
        ],
      },
    },
  }
}

const WATERCOLOR: Look = {
  label: 'watercolor',
  base: {
    colors: waterColors.theme,
    overrideColorScheme: 'dark',
    backdrop: { scene: 'watercolor', glass: { blur: 14, tint: '#0e1a24', opacity: 0.55 } },
  },
  style: {
    Heading: { fontFamily: ['serif'], color: '#f2a07a' },
    UserMessage: [washBubble(7, '#183641', '#1d4350', '#3f7f86'), washBubble(9, '#2a2440', '#33294f', '#7a5a9a')],
    AssistantMessage: { color: '#ecf0ee', backgroundColor: '#0e1a24ee', borderColor: '#24414c', borderWidth: 1, radius: 14, padding: 14 },
    ToolUse: { color: '#c3cfd0', backgroundColor: '#0e1a24e6', borderColor: '#24414c', borderWidth: 1, radius: 10, paddingX: 10 },
  },
  // Still water at dusk, a shimmer, a wind chime somewhere, drops landing.
  sound: {
    ambience: {
      layers: [
        { wave: 'brown', drone: true, gain: 0.14, filter: { type: 'lowpass', hz: 420, to: 700 } },
        { wave: 'pink', drone: true, gain: 0.03, filter: { type: 'bandpass', hz: 2600 }, tremolo: { hz: 0.1, depth: 0.6 } },
        { wave: 'bell', notes: ['G5', 'A5', 'B5', 'D6', 'E6'], scatter: 0.035, gain: 0.05, release: 2.4 },
        { wave: 'sine', notes: ['E6', 'G6', 'A6'], scatter: 0.07, gain: 0.05, attack: 0.002, release: 0.22, glide: 7 },
      ],
      reverb: 0.45,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['G5'], glide: 12, attack: 0.002, release: 0.2, gain: 0.3 }], reverb: 0.35 },
      tool: { layers: [{ wave: 'sine', notes: ['E6'], glide: 5, attack: 0.002, release: 0.06, gain: 0.08 }] },
      done: { layers: [{ wave: 'bell', notes: ['G5', 'D6', 'G6'], step: 0.1, release: 1.6, gain: 0.2 }], reverb: 0.45 },
      ask: { layers: [{ wave: 'bell', notes: ['B5', 'E6'], step: 0.14, release: 0.9, gain: 0.2 }], reverb: 0.3 },
      error: { layers: [{ wave: 'triangle', notes: ['E3', 'B2'], step: 0.12, release: 0.5, gain: 0.22, filter: { type: 'lowpass', hz: 900 } }] },
      compact: { layers: [{ wave: 'pink', attack: 0.2, release: 0.8, gain: 0.1, filter: { type: 'bandpass', hz: 600, to: 2400 } }] },
      click: {
        layers: [{ wave: 'sine', notes: ['G5', 'A5', 'B5', 'D6', 'E6', 'G6', 'A6', 'B6'], glide: 10, attack: 0.002, release: 0.24, gain: 0.26 }],
        reverb: 0.4,
      },
    },
  },
}

// --- Painted: the first, brighter look -------------------------------------

const paintedColors = makeColors({
  label: 'Koi Pond',
  id: 'koi-pond',
  only: 'dark',
  roles: { accent: '#f07c32', danger: '#e5484d', success: '#5fc48a', warning: '#f2c230', pro: '#5b8cf5' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#071a1c',
        'surface-1': '#0b2326',
        'surface-2': '#0d2629',
        'surface-3': '#0f292c',
        'text-primary': '#e6f4ef',
        'text-secondary': '#b8d6cf',
        'text-muted': '#93b8b0',
      },
    },
  },
  codeTheme: { dark: 'nord' },
})

const bubble: ThemeMessageRule = {
  color: '#e6f4ef',
  backgroundColor: '#11373a',
  borderWidth: 1,
  radius: [18, 18, 4, 18],
  paddingX: 14,
  paddingY: 10,
  shadow: { y: 4, blur: 14, color: '#00000066' },
}

const PAINTED: Look = {
  label: 'painted',
  base: {
    colors: paintedColors.theme,
    overrideColorScheme: 'dark',
    backdrop: { scene: 'painted', glass: { blur: 14, tint: '#061a1c', opacity: 0.55 } },
  },
  style: {
    Heading: { color: '#f4a466', fontFamily: ['serif'] },
    UserMessage: [
      { ...bubble, borderColor: '#d2692c' },
      { ...bubble, borderColor: '#3f74d0' },
    ],
    AssistantMessage: { color: '#e6f4ef', backgroundColor: '#0a2224f2', borderColor: '#1d4a48', borderWidth: 1, radius: 16, padding: 14 },
    ToolUse: { color: '#b8d6cf', backgroundColor: '#0a2224eb', borderColor: '#1d4a48', borderWidth: 1, radius: 10, paddingX: 10 },
  },
  sound: {
    ambience: {
      layers: [
        { wave: 'brown', drone: true, gain: 0.16, filter: { type: 'lowpass', hz: 420, to: 760 } },
        { wave: 'pink', drone: true, gain: 0.035, filter: { type: 'bandpass', hz: 2400 }, tremolo: { hz: 0.12, depth: 0.6 } },
        { wave: 'sine', notes: ['D6', 'E6', 'G6', 'A6', 'B6'], scatter: 0.09, gain: 0.07, attack: 0.002, release: 0.22, glide: 7 },
      ],
      reverb: 0.35,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['A5'], glide: 12, attack: 0.002, release: 0.18, gain: 0.32 }], reverb: 0.3 },
      tool: { layers: [{ wave: 'sine', notes: ['E6'], glide: 5, attack: 0.002, release: 0.06, gain: 0.1 }] },
      done: { layers: [{ wave: 'bell', notes: ['D5', 'A5', 'D6'], step: 0.09, release: 1.4, gain: 0.22 }], reverb: 0.4 },
      ask: { layers: [{ wave: 'bell', notes: ['A5', 'E5'], step: 0.14, release: 0.9, gain: 0.22 }], reverb: 0.3 },
      error: { layers: [{ wave: 'triangle', notes: ['D3', 'A2'], step: 0.12, release: 0.5, gain: 0.22, filter: { type: 'lowpass', hz: 900 } }] },
      compact: { layers: [{ wave: 'pink', attack: 0.2, release: 0.8, gain: 0.12, filter: { type: 'bandpass', hz: 600, to: 2400 } }] },
      click: {
        layers: [{ wave: 'sine', notes: ['D5', 'E5', 'G5', 'A5', 'B5', 'D6', 'E6', 'G6'], glide: 10, attack: 0.002, release: 0.22, gain: 0.28 }],
        reverb: 0.35,
      },
    },
  },
}

const LOOKS: Record<LookName, Look> = { ink: INK, 'ink-dark': INK_DARK, watercolor: WATERCOLOR, painted: PAINTED }

const ALIASES: Record<string, LookName> = {
  ink: 'ink',
  sumi: 'ink',
  'sumi-e': 'ink',
  'ink-light': 'ink',
  'ink-dark': 'ink-dark',
  'dark-ink': 'ink-dark',
  'ink-night': 'ink-dark',
  'night-ink': 'ink-dark',
  'sumi-dark': 'ink-dark',
  watercolor: 'watercolor',
  watercolour: 'watercolor',
  water: 'watercolor',
  painted: 'painted',
  original: 'painted',
  classic: 'painted',
}

// Sets a look whole; a build that takes no sound or style refuses the whole
// set, so step down until one is taken.
async function apply($: EngineInterface, name: LookName): Promise<string | undefined> {
  const look = LOOKS[name]
  const tries: ThemeSetArgs[] = [{ ...look.base, sound: look.sound, style: look.style }, { ...look.base, style: look.style }, look.base]

  for (const args of tries) {
    try {
      const set = await $.theme.set(args)
      return set.isDrawn ? undefined : set.reason
    } catch (error) {
      $.ui.log(`koi-pond (${name}): ${String(error)}`)
    }
  }
  return 'The theme could not be set.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'koi',
      description: 'Switch the koi pond theme: ink painting by day or night, watercolor, or the painted original.',
      argumentHint: 'ink | ink-dark | watercolor | painted',
    })
    const stored = await $.store.get('look')
    const reason = await apply($, isLook(stored) ? stored : 'ink')

    if (reason !== undefined) {
      $.ui.status(reason)
    }
    return next(e)
  })

  on('command.run', { command: 'koi' }, async ($, e) => {
    const word = e.args.trim().toLowerCase().replace(/\s+/g, '-')
    const stored = await $.store.get('look')
    const current: LookName = isLook(stored) ? stored : 'ink'
    const name: LookName | undefined = word === '' ? NAMES[(NAMES.indexOf(current) + 1) % NAMES.length] : ALIASES[word]

    if (name === undefined) {
      return { text: `The koi pond comes as ${NAMES.join(', ')}. Try /koi ink-dark or /koi watercolor.` }
    }
    await $.store.set('look', name)
    const reason = await apply($, name)
    return { text: reason === undefined ? `Koi pond: ${LOOKS[name].label}.` : `Koi pond: ${LOOKS[name].label} is set, but ${reason}` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    if (e.props.plugin !== 'koi-pond') {
      return next(e)
    }
    const { Shader, Svg } = $.ui.resolve(e)

    if (e.props.scene === 'ink') {
      return (
        <Shader module="./ink-paper.ts">
          <Svg
            source={INK_SCENE}
            alt="An ink painting of a koi pond on rice paper: vermilion, black and gold koi circle a black cat with yellow-green eyes, among broken ripple rings, washed lily pads and a red seal."
            isInteractive
          />
        </Shader>
      )
    }
    if (e.props.scene === 'watercolor') {
      return (
        <Shader module="./wash-paper.ts">
          <Svg
            source={WATER_SCENE}
            alt="A watercolor of a koi pond at dusk: luminous koi circle a black cat with glowing green eyes in deep teal and indigo washes, with lily pads, pink lotus and drifting light."
            isInteractive
          />
        </Shader>
      )
    }
    if (e.props.scene === 'painted') {
      return (
        <Shader module="./ripple.ts">
          <Svg
            source={PAINTED_SCENE}
            alt="A dark koi pond seen from above: orange, red, blue and yellow koi swim in a slow circle around a black cat with green eyes, under drifting caustic light, with lily pads at the edges."
            isInteractive
          />
        </Shader>
      )
    }
    return next(e)
  })
}

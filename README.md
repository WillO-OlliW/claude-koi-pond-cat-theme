# Koi Pond: an animated cat-and-koi theme for Claude

A theme mod for the Claude desktop and mobile apps. Koi swim slowly in a circle around a black cat sitting in a pond, with ripples, drifting leaves or petals, lily pads, and a ripple wherever you click. It comes in four looks:

| Look | Command | What it is |
| --- | --- | --- |
| Ink painting | `/koi ink` | Sumi-e on warm rice paper: koi in a few brush strokes of black ink and vermilion, a black cat in wet ink, a red seal. Light. |
| Ink at night | `/koi ink-dark` | The same painting on black paper: pale-ink koi, the cat rimmed in moonlight. Dark. |
| Watercolor | `/koi watercolor` | A pond at dusk in deep teal, indigo and violet washes, luminous koi, pink lotus. Dark. |
| Painted | `/koi painted` | The original, brighter illustrated pond. Dark. |

Each look also restyles the app's colours, your messages and Claude's replies, and has its own quiet soundscape: still water and the odd drop, plus soft cues when you send a message or Claude finishes. Sound stays off until you press the speaker button in the session's title bar.

Your chosen look is remembered for later sessions. `/koi` on its own moves to the next look.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install koi-pond --marketplace WillO-OlliW/claude-koi-pond-cat-theme
```

Answer `y` to add the marketplace, then press Enter to install for your user.

From a shell:

```
claude plugin install koi-pond --marketplace WillO-OlliW/claude-koi-pond-cat-theme
```

In the Claude desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `WillO-OlliW/claude-koi-pond-cat-theme`, then **Add plugin**.

Then start a new session and pick a look, for example `/koi ink-dark`.

## Notes

- The theme draws in the Claude desktop and mobile apps. Terminals and editors show no themes.
- If your system asks for reduced motion, the pond is drawn still.
- Everything is drawn in code: the scenes are generated SVG with CSS animation, and a small GPU shader adds paper texture and the click ripples. There are no images or sound files.

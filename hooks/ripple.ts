// The pond's surface on the GPU: one ring spreads from each press and is
// gone within a second, and the water bends a little behind a moving pointer.
import { clamp, exp, length, max, picture, pointers, scene, shader, size, vec2, vec3, vec4 } from 'claude-code/shader'

const pond = picture(p => {
  let bend = vec2(0)
  let glint = 0

  for (const q of pointers) {
    const d = vec2(p.point - q.at)
    const dist = length(d)
    const dir = vec2(d / max(dist, 1))

    if (q.down > 0.5) {
      // One narrow ring a press, faded out by 0.9 s.
      const t = q.age
      const fade = clamp(1 - t / 0.9, 0, 1)
      const band = dist - (24 + t * 300)
      const ring = exp(-(band * band) / 140) * fade * fade
      bend = vec2(bend + dir * ring * 7)
      glint = glint + ring * 0.1
    } else {
      // A soft wake around a pointer that is moving.
      const moved = length(vec2(q.at - q.was))
      const pull = exp(-(dist * dist) / 1600) * clamp(moved / 12, 0, 1)
      bend = vec2(bend - dir * pull * 4)
    }
  }

  const c = scene.sample(vec2(p.uv + bend / size))

  return vec4(c.rgb + vec3(0.5, 0.95, 0.85) * glint * c.a, c.a)
})

export default shader({ fps: 60, passes: [pond] })

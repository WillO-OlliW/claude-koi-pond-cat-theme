// Cold-press watercolor paper over the dusk pond: the tooth of the paper
// catching light and holding pigment, a fine grain, and a press sending one
// pale ring through the water, gone within a second.
import { clamp, exp, floor, fract, int, length, max, mix, picture, pointers, scene, shader, size, unsigned, vec2, vec3, vec4 } from 'claude-code/shader'

const hash = (v: vec2): number => {
  const a = int(int(v.x) * 374761393 + int(v.y) * 668265263)
  const b = int(int(a ^ (a >> 13)) * 1274126177)
  return unsigned(int(b ^ (b >> 16))) / 4294967296
}

const noise = (v: vec2): number => {
  const i = vec2(floor(v))
  const f = vec2(fract(v))
  const u = vec2(f * f * (3 - 2 * f))
  const a = hash(i)
  const b = hash(vec2(i + vec2(1, 0)))
  const c = hash(vec2(i + vec2(0, 1)))
  const d = hash(vec2(i + vec2(1, 1)))
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y)
}

const paper = picture(p => {
  let bend = vec2(0)
  let glow = 0

  for (const q of pointers) {
    if (q.down > 0.5) {
      const d = vec2(p.point - q.at)
      const dist = length(d)
      const t = q.age
      const fade = clamp(1 - t / 0.9, 0, 1)
      const band = dist - (24 + t * 280)
      const ring = exp(-(band * band) / 160) * fade * fade
      bend = vec2(bend + (d / max(dist, 1)) * ring * 6)
      glow = glow + ring * 0.09
    }
  }

  const c = scene.sample(vec2(p.uv + bend / size))
  const tooth = noise(vec2(p.point / 5)) * 0.6 + noise(vec2(p.point / 14)) * 0.4 - 0.5
  const grain = hash(vec2(floor(p.point))) - 0.5
  const tex = 1 + tooth * 0.2 + grain * 0.05

  return vec4(c.rgb * tex + vec3(0.6, 0.92, 0.86) * glow * c.a, c.a)
})

export default shader({ fps: 30, passes: [paper] })

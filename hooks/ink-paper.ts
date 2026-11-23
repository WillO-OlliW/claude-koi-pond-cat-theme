// Rice paper over the ink pond: every edge frays a touch, as ink does in the
// paper's fibres; grain, long fibres and soft mottling; and a press sends one
// ring through the water, toward grey on either paper, gone within a second.
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
  let shade = 0

  for (const q of pointers) {
    if (q.down > 0.5) {
      const d = vec2(p.point - q.at)
      const dist = length(d)
      const t = q.age
      const fade = clamp(1 - t / 0.9, 0, 1)
      const band = dist - (24 + t * 260)
      const ring = exp(-(band * band) / 120) * fade * fade
      bend = vec2(bend + (d / max(dist, 1)) * ring * 5)
      shade = shade + ring * 0.08
    }
  }

  const fray = vec2(noise(vec2(p.point.x / 3, p.point.y / 3)) - 0.5, noise(vec2(p.point.y / 3 + 40, p.point.x / 3)) - 0.5)
  const c = scene.sample(vec2(p.uv + (bend + fray * 1.6) / size))
  const grain = hash(vec2(floor(p.point))) - 0.5
  const fibre = noise(vec2(p.point.x / 34, p.point.y / 2.5)) - 0.5
  const mottle = noise(vec2(p.point / 90)) - 0.5
  const tex = 1 + grain * 0.045 + fibre * 0.05 + mottle * 0.05

  return vec4(mix(c.rgb * tex, vec3(0.5, 0.49, 0.47) * c.a, shade), c.a)
})

export default shader({ fps: 30, passes: [paper] })

/**
 * NutriGlanceGaze — pure head-gaze picking (no scene access).
 *
 * Owns: ray-vs-sphere picking of the gaze target from a camera ray.
 * Expects: callers to supply world-space gaze origin/direction and one or more
 *          target spheres per product (product body, plus its visible badge).
 * Must not: read transforms or mutate state.
 */

export interface GazeSphere {
  productId: string
  center: vec3
  radiusCm: number
}

export interface GazeHit {
  productId: string
  /** Distance along the ray (cm). */
  t: number
  /** Perpendicular miss distance normalised by the sphere radius (0 = dead centre). */
  offAxis: number
}

/**
 * Return the product whose sphere the ray passes through most centrally, or null.
 * `dir` must be normalised.
 */
export function pickGazeTarget(origin: vec3, dir: vec3, spheres: GazeSphere[]): GazeHit | null {
  let best: GazeHit | null = null
  for (const s of spheres) {
    const toCenter = s.center.sub(origin)
    const t = toCenter.dot(dir)
    if (t <= 0) continue // behind the viewer
    const closest = origin.add(dir.uniformScale(t))
    const miss = closest.distance(s.center)
    if (miss > s.radiusCm) continue
    const offAxis = miss / Math.max(0.001, s.radiusCm)
    if (best === null || offAxis < best.offAxis) {
      best = {productId: s.productId, t, offAxis}
    }
  }
  return best
}

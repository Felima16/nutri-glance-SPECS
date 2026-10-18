/**
 * Shared helpers for the Nutri-Glance LEAF scenarios (test-only, additive).
 *
 * Gaze is driven through the Lens test API (setGazeOverride) because the preview
 * camera cannot be steered reliably from a scenario. Everything else (badge state,
 * opacity, text, colour) is read back from the live Lens.
 */
import {NutriGlanceMain} from "../Scripts/NutriGlanceMain"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"

export const DWELL_SEC = 0.5
export const PINNED_OPACITY = 0.45

export function log(msg: string): void {
  print(`[NutriGlanceTest] ${msg}`)
}

/** Wait until the Lens orchestrator exists and has registered its three products. */
export async function getApi(): Promise<NutriGlanceMain> {
  const start = getTime()
  while (getTime() - start < 5) {
    const m = NutriGlanceMain.getInstance() ?? ((global as any).nutriGlance as NutriGlanceMain)
    if (m && m.getProductIds().length === 3) return m
    await nextFrame()
  }
  throw new Error("NutriGlanceMain not ready within 5s (getInstance() null or products not registered)")
}

/** Poll every frame until cond() is true. Returns elapsed ms. Throws on timeout. */
export async function waitFor(cond: () => boolean, timeoutMs: number, label: string): Promise<number> {
  const start = getTime()
  while (!cond()) {
    if ((getTime() - start) * 1000 > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${label}`)
    }
    await nextFrame()
  }
  return Math.round((getTime() - start) * 1000)
}

/** Look away from the shelf and wait for an empty view, so each scenario starts clean. */
export async function resetToEmpty(api: NutriGlanceMain): Promise<void> {
  api.setGazeOverride(null)
  await waitFor(
    () =>
      api.getVisibleBadgeCount() === 0 &&
      api.getProductIds().every((id) => api.getBadgeState(id) === "hidden"),
    6000,
    "all badges hidden after looking away (reset)",
  )
  await sleep(100)
}

/** Look at a product and wait until its badge reaches full strength ("shown"). */
export async function revealFully(api: NutriGlanceMain, id: string): Promise<number> {
  api.setGazeOverride(id)
  return await waitFor(
    () => api.getBadgeState(id) === "shown" && api.getBadgeOpacity(id) >= 0.999,
    3000,
    `${id} badge shown at full opacity`,
  )
}

function findText(root: SceneObject, name: string): Text | null {
  if (root.name === name) {
    const t = root.getComponent("Component.Text") as Text
    if (t) return t
  }
  for (let i = 0; i < root.getChildrenCount(); i++) {
    const r = findText(root.getChild(i), name)
    if (r) return r
  }
  return null
}

/** RGB of the grade letter text actually rendered on the badge (alpha ignored). */
export function gradeLetterColor(api: NutriGlanceMain, id: string): vec3 | null {
  const so = api.getBadgeSceneObject(id)
  if (!so) return null
  const t = findText(so, "GradeLetter")
  if (!t) return null
  const c = t.textFill.color
  return new vec3(c.x, c.y, c.z)
}

export function fmtColor(c: vec3 | null): string {
  return c ? `(${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})` : "null"
}

export function isDescendantOf(child: SceneObject, ancestor: SceneObject): boolean {
  let p = child.getParent()
  while (p) {
    if (p.isSame(ancestor)) return true
    p = p.getParent()
  }
  return false
}

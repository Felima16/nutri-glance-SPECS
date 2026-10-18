/**
 * NutriGlanceMain — orchestrator for Nutri-Glance.
 *
 * Owns: the per-frame loop (head-gaze picking -> badge state -> UI/audio),
 *       pinch routing, and the public test API used by LEAF scenarios.
 * Expects: `cameraObject` (the Specs camera), and the three authored products
 *          (`yogurt`, `snackBar`, `mysteryBox`) each with a NutriGlanceProduct.
 * Must not: build UI or text itself (badges are NutriGlanceBadgeUI), or keep
 *           badge state anywhere but NutriGlanceState.
 *
 * Test API (all public, deterministic):
 *   NutriGlanceMain.getInstance()            also exposed as global.nutriGlance
 *   getProductIds(): string[]                ["yogurt", "snackbar", "mystery"]
 *   getBadgeState(id): "hidden"|"revealing"|"shown"|"pinned"|"fading"
 *   getBadgeOpacity(id): number              0..1 (pinned+looking away = pinnedOpacity)
 *   getGrade(id): string | null              null = no assigned grade
 *   hasBadge(id): boolean                    false for ungraded products
 *   isBadgeVisible(id): boolean              badge SceneObject enabled and opacity > 0
 *   getBadgeText(id): {letter, name, hint} | null
 *   getDwellSec(id), isAimed(id)
 *   getGazeTarget(): string | null           current gaze target (null = looking away)
 *   getVisibleBadgeCount(): number
 *   setGazeOverride(id | null)               drive gaze without moving the camera (null = look away)
 *   clearGazeOverride()                      go back to real camera head-gaze
 *   pinchBadge(id): string | null            same path as a real SIK pinch; returns event kind
 *   getBadgeSceneObject(id): SceneObject | null   for SIK/LEAF hand-interaction targeting
 *   getProductSceneObject(id): SceneObject | null
 */
import {NutriGlanceProduct} from "./NutriGlanceProduct"
import {BadgeEvent, BadgeState, BadgeTiming, NutriGlanceState} from "./NutriGlanceState"
import {GazeSphere, pickGazeTarget} from "./NutriGlanceGaze"
import {NutriGlanceAudio} from "./NutriGlanceAudio"

const FADE_IN_SEC = 0.2

@component
export class NutriGlanceMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">NutriGlanceMain – look at a product to see its Nutri-Score; pinch to pin</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("The Specs camera; its forward ray is the head-gaze")
  cameraObject: SceneObject

  @input
  @hint("Yogurt placeholder product (left of the shelf)")
  yogurt: NutriGlanceProduct

  @input
  @hint("Snack bar placeholder product (right of the shelf)")
  snackBar: NutriGlanceProduct

  @input
  @allowUndefined
  @hint("Product with no assigned grade — must never show a badge")
  mysteryBox: NutriGlanceProduct
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Gaze & timing</span>')
  @ui.group_start("Gaze & timing")
  @input
  @hint("Seconds of steady gaze on a product before its badge appears")
  @widget(new SliderWidget(0.1, 2.0, 0.05))
  dwellSec: number = 0.5

  @input
  @hint("Seconds an unpinned badge stays at full strength after you look away (lets you compare two products)")
  @widget(new SliderWidget(0, 3.0, 0.1))
  lingerSec: number = 1.0

  @input
  @hint("Seconds an unpinned badge takes to fade out")
  @widget(new SliderWidget(0.1, 2.0, 0.05))
  fadeOutSec: number = 0.5

  @input
  @hint("Seconds of looking away from every product before pinned badges clear")
  @widget(new SliderWidget(0.5, 6.0, 0.1))
  pinnedClearSec: number = 2.0

  @input
  @hint("Opacity of a pinned badge while you look elsewhere (dimmed)")
  @widget(new SliderWidget(0.1, 1.0, 0.05))
  pinnedOpacity: number = 0.45

  @input
  @hint("Volume of the reveal / pin / unpin sound cues (0 = silent)")
  @widget(new SliderWidget(0, 1, 0.05))
  sfxVolume: number = 0.7
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Grade colors (bright: the display is additive)</span>')
  @ui.group_start("Grade colors")
  @input('vec4', '{0.24,0.86,0.42,1}')
  @hint("Color of grade A")
  @widget(new ColorWidget())
  colorA: vec4 = new vec4(0.24, 0.86, 0.42, 1)

  @input('vec4', '{0.65,0.89,0.29,1}')
  @hint("Color of grade B")
  @widget(new ColorWidget())
  colorB: vec4 = new vec4(0.65, 0.89, 0.29, 1)

  @input('vec4', '{1,0.84,0.18,1}')
  @hint("Color of grade C")
  @widget(new ColorWidget())
  colorC: vec4 = new vec4(1, 0.84, 0.18, 1)

  @input('vec4', '{1,0.6,0.18,1}')
  @hint("Color of grade D")
  @widget(new ColorWidget())
  colorD: vec4 = new vec4(1, 0.6, 0.18, 1)

  @input('vec4', '{1,0.35,0.24,1}')
  @hint("Color of grade E")
  @widget(new ColorWidget())
  colorE: vec4 = new vec4(1, 0.35, 0.24, 1)
  @ui.group_end

  private static instance: NutriGlanceMain | null = null

  private state = new NutriGlanceState()
  private products = new Map<string, NutriGlanceProduct>()
  private audio: NutriGlanceAudio | null = null
  private gazeTarget: string | null = null
  private gazeOverrideActive: boolean = false
  private gazeOverride: string | null = null
  private ready: boolean = false

  static getInstance(): NutriGlanceMain | null {
    return NutriGlanceMain.instance
  }

  onAwake(): void {
    NutriGlanceMain.instance = this
    ;(global as any).nutriGlance = this

    if (!this.cameraObject || !this.yogurt || !this.snackBar) {
      console.error("[NutriGlance] Required @input not wired (cameraObject / yogurt / snackBar).")
      return
    }

    this.audio = new NutriGlanceAudio(this.getSceneObject(), this.sfxVolume)

    // Other components (products, badges) may not be awake yet when this runs
    // (hierarchy order), so every cross-component call happens in OnStart.
    // SIK / UIKit subscriptions also bind in OnStart (init-order rule).
    this.createEvent("OnStartEvent").bind(() => {
      const all = [this.yogurt, this.snackBar, this.mysteryBox].filter((p) => !!p)
      for (const p of all) {
        const id = p.productId
        this.products.set(id, p)
        const grade = p.getGrade()
        // A badge only exists for products with an assigned grade AND a wired badge view.
        this.state.addProduct(id, grade !== null && p.badge ? grade : null)
      }
      this.products.forEach((p, id) => {
        if (!p.badge) return
        const grade = p.getGrade()
        p.badge.setProductName(p.displayName)
        p.badge.setGrade(grade !== null ? grade : "", this.colorForGrade(grade))
        p.badge.setOpacity(0)
        p.badge.setPinned(false)
        p.badge.setVisible(false)
        p.badge.onPinch.add(() => this.handlePinch(id))
      })
      this.ready = true
      console.log(`[NutriGlance] ready: ${this.getProductIds().map((id) => `${id}=${this.getGrade(id) ?? "none"}`).join(", ")}`)
    })
    this.createEvent("UpdateEvent").bind(() => this.tick(getDeltaTime()))
  }

  // ── Frame loop ───────────────────────────────────────────────────────────

  private tick(dt: number): void {
    if (!this.ready) return
    this.gazeTarget = this.gazeOverrideActive ? this.gazeOverride : this.computeHeadGaze()
    const events = this.state.step(this.gazeTarget, dt, this.timing())
    this.handleEvents(events)
    this.pushToViews()
  }

  private computeHeadGaze(): string | null {
    const tr = this.cameraObject.getTransform()
    const origin = tr.getWorldPosition()
    const dir = tr.back.normalize() // the Specs camera looks down its local -Z
    const spheres: GazeSphere[] = []
    this.products.forEach((p, id) => {
      spheres.push({productId: id, center: p.getAimCenterWorld(), radiusCm: p.aimRadiusCm})
      const rec = this.state.get(id)
      // While a badge is up, looking at the badge counts as looking at its product
      // (so the user can look at the badge to pinch it without it fading).
      if (p.badge && rec && rec.opacity > 0.05) {
        const b = p.badge
        spheres.push({
          productId: id,
          center: b.getSceneObject().getTransform().getWorldPosition(),
          radiusCm: Math.max(b.badgeWidthCm, b.badgeHeightCm) * 0.5,
        })
      }
    })
    const hit = pickGazeTarget(origin, dir, spheres)
    return hit ? hit.productId : null
  }

  private handleEvents(events: BadgeEvent[]): void {
    for (const e of events) {
      console.log(`[NutriGlance] ${e.productId}: ${e.kind}`)
      if (!this.audio) continue
      if (e.kind === "revealed") this.audio.playReveal()
      else if (e.kind === "cleared") this.audio.playPinOff()
    }
  }

  private handlePinch(id: string): string | null {
    const e = this.state.pinch(id)
    if (!e) {
      console.log(`[NutriGlance] ${id}: pinch ignored (badge not revealed)`)
      return null
    }
    console.log(`[NutriGlance] ${id}: ${e.kind}`)
    if (this.audio) {
      if (e.kind === "pinned") this.audio.playPinOn()
      else this.audio.playPinOff()
    }
    this.pushToViews()
    return e.kind
  }

  private pushToViews(): void {
    this.products.forEach((p, id) => {
      const rec = this.state.get(id)!
      p.setAimed(this.gazeTarget === id, rec.dwellSec / Math.max(0.01, this.dwellSec))
      if (!p.badge) return
      p.badge.setOpacity(rec.opacity)
      p.badge.setPinned(rec.state === BadgeState.Pinned)
      p.badge.setVisible(rec.hasBadge && rec.state !== BadgeState.Hidden)
    })
  }

  private timing(): BadgeTiming {
    return {
      dwellSec: this.dwellSec,
      fadeInSec: FADE_IN_SEC,
      lingerSec: this.lingerSec,
      fadeOutSec: this.fadeOutSec,
      pinnedClearSec: this.pinnedClearSec,
      pinnedOpacity: this.pinnedOpacity,
    }
  }

  private colorForGrade(g: string | null): vec4 {
    switch (g) {
      case "A": return this.colorA
      case "B": return this.colorB
      case "C": return this.colorC
      case "D": return this.colorD
      case "E": return this.colorE
      default: return new vec4(1, 1, 1, 1)
    }
  }

  // ── Public test API ──────────────────────────────────────────────────────

  getProductIds(): string[] {
    return this.state.ids()
  }

  getBadgeState(id: string): string {
    const r = this.state.get(id)
    return r ? r.state : "unknown"
  }

  getBadgeOpacity(id: string): number {
    const r = this.state.get(id)
    return r ? r.opacity : 0
  }

  getGrade(id: string): string | null {
    const r = this.state.get(id)
    return r ? r.grade : null
  }

  hasBadge(id: string): boolean {
    const r = this.state.get(id)
    return !!r && r.hasBadge
  }

  isBadgeVisible(id: string): boolean {
    const p = this.products.get(id)
    const r = this.state.get(id)
    if (!p || !p.badge || !r) return false
    return p.badge.getSceneObject().enabled && r.opacity > 0.001
  }

  getBadgeText(id: string): {letter: string; name: string; hint: string} | null {
    const p = this.products.get(id)
    if (!p || !p.badge) return null
    return {letter: p.badge.gradeLetter, name: p.badge.productName, hint: p.badge.hint}
  }

  getDwellSec(id: string): number {
    const r = this.state.get(id)
    return r ? r.dwellSec : 0
  }

  isAimed(id: string): boolean {
    const p = this.products.get(id)
    return !!p && p.isAimed
  }

  getGazeTarget(): string | null {
    return this.gazeTarget
  }

  getVisibleBadgeCount(): number {
    return this.getProductIds().filter((id) => this.isBadgeVisible(id)).length
  }

  /** Drive gaze deterministically: a product id, or null for "looking away from the shelf". */
  setGazeOverride(id: string | null): void {
    this.gazeOverrideActive = true
    this.gazeOverride = id
  }

  clearGazeOverride(): void {
    this.gazeOverrideActive = false
    this.gazeOverride = null
  }

  /** Same code path as a real SIK pinch on the badge. Returns "pinned" / "unpinned" or null if ignored. */
  pinchBadge(id: string): string | null {
    return this.handlePinch(id)
  }

  getBadgeSceneObject(id: string): SceneObject | null {
    const p = this.products.get(id)
    return p && p.badge ? p.badge.getSceneObject() : null
  }

  getProductSceneObject(id: string): SceneObject | null {
    const p = this.products.get(id)
    return p ? p.getSceneObject() : null
  }
}

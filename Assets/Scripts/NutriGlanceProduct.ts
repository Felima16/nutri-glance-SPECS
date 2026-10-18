/**
 * NutriGlanceProduct — one placeholder product on the shelf (authored stand-in).
 *
 * Owns: the product's identity (id, display name, hard-coded grade or none),
 *       its gaze target sphere, and its aim highlight ring.
 * Expects: authored on the product root SceneObject; `badge` wired to that
 *          product's NutriGlanceBadgeUI (leave empty for a product with no grade);
 *          `aimHighlight` wired to the ring placeholder under the product.
 * Must not: run the reveal/pin logic — NutriGlanceMain owns all badge state.
 */
import {NutriGlanceBadgeUI} from "./NutriGlanceBadgeUI"

@component
export class NutriGlanceProduct extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">NutriGlanceProduct – placeholder product + hard-coded grade</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @allowUndefined
  @hint("This product's grade badge. Leave empty for a product with no assigned grade (no badge is ever shown).")
  badge: NutriGlanceBadgeUI

  @input
  @allowUndefined
  @hint("Ring under the product that lights up while the user is aiming (gazing) at it")
  aimHighlight: SceneObject
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Stable id used by tests and the main script, e.g. 'yogurt'")
  productId: string = "product"

  @input
  @hint("Name shown under the grade letter")
  displayName: string = "Product"

  @input
  @hint("Hard-coded Nutri-Score grade A-E. Leave empty for 'no assigned grade'.")
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("None", ""),
      new ComboBoxItem("A", "A"),
      new ComboBoxItem("B", "B"),
      new ComboBoxItem("C", "C"),
      new ComboBoxItem("D", "D"),
      new ComboBoxItem("E", "E"),
    ])
  )
  grade: string = ""

  @input
  @hint("Radius (cm) of the gaze target sphere around the product — bigger = easier to aim at")
  @widget(new SliderWidget(4, 30, 0.5))
  aimRadiusCm: number = 11

  @input
  @hint("Gaze target centre, local offset from the product root (cm)")
  aimCenterOffset: vec3 = new vec3(0, 6, 0)
  @ui.group_end

  private ringBaseScale: vec3 = vec3.one()
  private _aimed: boolean = false

  onAwake(): void {
    if (this.aimHighlight) {
      this.ringBaseScale = this.aimHighlight.getTransform().getLocalScale()
      this.aimHighlight.enabled = false
    }
  }

  /** Normalised grade ("A".."E") or null when none is assigned / invalid. */
  getGrade(): string | null {
    const g = (this.grade || "").trim().toUpperCase()
    return ["A", "B", "C", "D", "E"].indexOf(g) >= 0 ? g : null
  }

  getAimCenterWorld(): vec3 {
    const tr = this.getSceneObject().getTransform()
    return tr.getWorldPosition().add(tr.getWorldRotation().multiplyVec3(this.aimCenterOffset))
  }

  get isAimed(): boolean {
    return this._aimed
  }

  /** Highlight while aimed; the ring grows from 60% to 100% as dwell progresses. */
  setAimed(aimed: boolean, dwellProgress: number): void {
    this._aimed = aimed
    if (!this.aimHighlight) return
    this.aimHighlight.enabled = aimed
    if (aimed) {
      const k = 0.6 + 0.4 * Math.max(0, Math.min(1, dwellProgress))
      const b = this.ringBaseScale
      this.aimHighlight.getTransform().setLocalScale(new vec3(b.x * k, b.y, b.z * k))
    }
  }
}

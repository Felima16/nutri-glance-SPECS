/**
 * NutriGlanceBadgeUI — one Nutri-Score grade badge (passive view).
 *
 * Owns: the badge visuals — a big UIKit Button surface (the pinch target, with
 *       built-in hover highlight), a big color-coded grade letter, the product
 *       name underneath, and a pin hint row (pin icon + "Pinch to pin"/"Pinned").
 * Expects: NutriGlanceMain to push state via setGrade / setOpacity / setPinned /
 *          setVisible, and to subscribe to `onPinch`.
 * Must not: hold domain state or decide when to reveal/fade/pin — it only
 *           renders what it is told and reports pinches.
 */
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {
  FlexAlign,
  FlexAlignSelf,
  FlexDirection,
  FlexJustify,
} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

const PIN_ICON: Texture = requireAsset("../Icons/keep.png") as Texture
const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material

// ── Typography: single source of truth (see specs-build-ui patterns.md → Typography)
const FONT_SIZE_SCALE = 1.0
type TextRole =
  | "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2"
  | "Subheadline" | "Button" | "Callout" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700}, Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700}, Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700}, Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500}, Callout: {size: 39, weight: 700},
  Body: {size: 39, weight: 500}, Caption: {size: 38, weight: 500},
}
function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}
function applyTextRole(t: Text, role: TextRole, scale: number = 1): void {
  t.size = roleSize(role) * scale
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

const CONTENT_Z = 0.6        // content in front of the button face (depth tie-break)
const LABEL_Z = 0.08         // extra lift for text drawn on a button face

@component
export class NutriGlanceBadgeUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">NutriGlanceBadgeUI – Nutri-Score badge (letter + name, pinch to pin)</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Badge width in cm (also the pinch target width)")
  @widget(new SliderWidget(6, 20, 0.5))
  badgeWidthCm: number = 11

  @input
  @hint("Badge height in cm (also the pinch target height)")
  @widget(new SliderWidget(8, 24, 0.5))
  badgeHeightCm: number = 13.5

  @input
  @hint("Grade letter size as a multiple of the Title1 text role")
  @widget(new SliderWidget(1, 4, 0.1))
  gradeLetterScale: number = 2.4

  @input
  @hint("Opacity of the badge surface at full strength (text stays fully opaque)")
  @widget(new SliderWidget(0.2, 1, 0.05))
  surfaceOpacity: number = 0.85

  @input
  @hint("Hint shown under the name while the badge is not pinned")
  pinHintText: string = "Pinch to pin"

  @input
  @hint("Hint shown under the name while the badge is pinned")
  pinnedHintText: string = "Pinned"

  @input('vec4', '{1,1,1,1}')
  @hint("Product name text color (keep light: the display is additive)")
  @widget(new ColorWidget())
  nameColor: vec4 = new vec4(1, 1, 1, 1)

  @input
  @hint("Turn the badge to face the user (yaw only)")
  faceUser: boolean = true
  @ui.group_end

  private button: Button | null = null
  private gradeText: Text | null = null
  private nameText: Text | null = null
  private hintText: Text | null = null
  private iconMat: Material | null = null

  private gradeColor: vec4 = new vec4(1, 1, 1, 1)
  private hintColor: vec4 = new vec4(1, 1, 1, 0.7)
  private _opacity: number = 0
  private _pinned: boolean = false
  private _visible: boolean = false
  private _initialized: boolean = false
  private _hovered: boolean = false
  private _onPinch = new Event<void>()

  /** Fires when the user pinches (SIK trigger-up) on the badge. */
  get onPinch(): PublicApi<void> {
    return this._onPinch.publicApi()
  }

  /** True once the UIKit Button finished initializing. */
  get isInitialized(): boolean {
    return this._initialized
  }

  /** True while a hand/mouse interactor hovers the badge. */
  get isHovered(): boolean {
    return this._hovered
  }

  get opacity(): number {
    return this._opacity
  }

  get isPinned(): boolean {
    return this._pinned
  }

  get isVisible(): boolean {
    return this._visible
  }

  get gradeLetter(): string {
    return this.gradeText ? this.gradeText.text : ""
  }

  get productName(): string {
    return this.nameText ? this.nameText.text : ""
  }

  get hint(): string {
    return this.hintText ? this.hintText.text : ""
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    if (this.faceUser) this.sceneObject.createComponent(Billboard.getTypeName())
    this.build()
  }

  // ── Public API (Main → UI) ────────────────────────────────────────────────

  /** Set the grade letter (e.g. "A") and its color. */
  setGrade(letter: string, color: vec4): void {
    this.gradeColor = color
    if (this.gradeText) this.gradeText.text = letter
    this.applyOpacity()
  }

  setProductName(name: string): void {
    if (this.nameText) this.nameText.text = name
  }

  /** 0..1 overall badge strength (pinned badges are dimmed by Main via this). */
  setOpacity(a: number): void {
    this._opacity = Math.max(0, Math.min(1, a))
    this.applyOpacity()
  }

  setPinned(pinned: boolean): void {
    this._pinned = pinned
    if (this.hintText) this.hintText.text = pinned ? this.pinnedHintText : this.pinHintText
    this.hintColor = pinned ? new vec4(1, 1, 1, 1) : new vec4(1, 1, 1, 0.7)
    this.applyOpacity()
  }

  /** Show/hide the whole badge. Deferred until the Button has initialized. */
  setVisible(visible: boolean): void {
    this._visible = visible
    if (this._initialized) this.sceneObject.enabled = visible
  }

  /** Test hook: behave exactly as if the user pinched the badge. */
  simulatePinch(): void {
    this._onPinch.invoke()
  }

  // ── Build ────────────────────────────────────────────────────────────────

  private build(): void {
    const w = this.badgeWidthCm
    const h = this.badgeHeightCm

    // Button FIRST so the Canvas hierarchy pass paints it behind the content.
    const btnSO = this.obj(this.sceneObject, "BadgeButton")
    const btn = btnSO.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(w, h, 1)
    btn.opacity = 0
    this.button = btn
    btn.onTriggerUp.add(() => this._onPinch.invoke())
    btn.onHoverEnter.add(() => (this._hovered = true))
    btn.onHoverExit.add(() => (this._hovered = false))
    btn.onInitialized.add(() => {
      btn.size = new vec3(w, h, 1)
      this._initialized = true
      this.applyOpacity()
      // Start-hidden disable happens only after init (never synchronously in onAwake).
      this.sceneObject.enabled = this._visible
    })

    // Content column on top of the button face.
    const content = this.obj(this.sceneObject, "Content", new vec3(0, 0, CONTENT_Z))
    const col = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    col.onInitialized.add(() => {
      col.width = w
      col.height = h
      col.direction = FlexDirection.Column
      col.justifyContent = FlexJustify.Center
      col.alignItems = FlexAlign.Center
      col.rowGap = 0.3
      col.paddingTop = 0.8
      col.paddingBottom = 0.8
      col.paddingLeft = 0.6
      col.paddingRight = 0.6
    })

    const innerW = w - 1.2
    const letterH = h * 0.5
    const nameH = 2.2
    const hintH = 1.8

    const items: FlexItem[] = []
    const letterSO = this.obj(content, "GradeLetter", new vec3(0, 0, LABEL_Z))
    this.gradeText = this.makeText(letterSO, "A", "Title1", innerW, letterH, this.gradeLetterScale)
    items.push(this.item(letterSO, innerW, letterH))

    const nameSO = this.obj(content, "ProductName", new vec3(0, 0, LABEL_Z))
    this.nameText = this.makeText(nameSO, "Product", "Headline2", innerW, nameH)
    items.push(this.item(nameSO, innerW, nameH))

    // Hint row: pin icon + hint text.
    const rowSO = this.obj(content, "PinHintRow", new vec3(0, 0, LABEL_Z))
    const row = rowSO.createComponent(FlexLayout.getTypeName()) as FlexLayout
    row.onInitialized.add(() => {
      row.width = innerW
      row.height = hintH
      row.direction = FlexDirection.Row
      row.justifyContent = FlexJustify.Center
      row.alignItems = FlexAlign.Center
      row.columnGap = 0.4
    })
    items.push(this.item(rowSO, innerW, hintH))

    const iconSO = this.obj(rowSO, "PinIcon")
    iconSO.getTransform().setLocalScale(new vec3(1.4, 1.4, 1))
    const img = iconSO.createComponent("Component.Image") as Image
    const mat = imageMaterial.clone()
    mat.mainPass.baseTex = PIN_ICON
    mat.mainPass.depthTest = true
    mat.mainPass.depthWrite = false
    img.clearMaterials()
    img.addMaterial(mat)
    this.iconMat = mat
    const iconItem = this.item(iconSO, 1.4, 1.4)

    const hintW = innerW - 2.0
    const hintSO = this.obj(rowSO, "PinHint")
    this.hintText = this.makeText(hintSO, this.pinHintText, "Caption", hintW, hintH)
    const hintItem = this.item(hintSO, hintW, hintH)
    // Register after init (addItems throws pre-init while auto-discovery is on; duplicates are ignored).
    row.onInitialized.add(() => row.addItems([iconItem, hintItem]))

    col.onInitialized.add(() => col.addItems(items))
    this.applyOpacity()
  }

  private applyOpacity(): void {
    const a = this._opacity
    if (this.button) this.button.opacity = a * this.surfaceOpacity
    if (this.gradeText) this.setTextColor(this.gradeText, this.gradeColor, a)
    if (this.nameText) this.setTextColor(this.nameText, this.nameColor, a)
    if (this.hintText) this.setTextColor(this.hintText, this.hintColor, a)
    if (this.iconMat) {
      const k = this.hintColor.w * a // premultiplied alpha: scale rgb with alpha
      this.iconMat.mainPass.baseColor = new vec4(k, k, k, k)
    }
  }

  private setTextColor(t: Text, c: vec4, a: number): void {
    t.textFill.color = new vec4(c.x, c.y, c.z, c.w * a)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    if (position) so.getTransform().setLocalPosition(position)
    return so
  }

  private item(so: SceneObject, w: number, h: number): FlexItem {
    const it = so.createComponent(FlexItem.getTypeName()) as FlexItem
    it.overrideWidth = w
    it.overrideHeight = h
    it.flexShrink = 0
    it.alignSelf = FlexAlignSelf.Center
    return it
  }

  private makeText(so: SceneObject, text: string, role: TextRole, w: number, h: number, scale: number = 1): Text {
    const t = so.createComponent("Component.Text") as Text
    t.text = text
    t.depthTest = true
    applyTextRole(t, role, scale)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    return t
  }
}

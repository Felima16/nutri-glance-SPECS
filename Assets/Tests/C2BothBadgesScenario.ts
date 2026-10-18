/**
 * LEAF scenarios for the five Nutri-Glance done criteria (devpost/design-brief.md).
 * Test-only; does not modify Lens behaviour.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep, withTimeout, findInScene} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {
  DWELL_SEC,
  PINNED_OPACITY,
  fmtColor,
  getApi,
  gradeLetterColor,
  isDescendantOf,
  log,
  resetToEmpty,
  revealFully,
  waitFor,
} from "./NutriGlanceTestUtils"

// ── Criterion 2 ─────────────────────────────────────────────────────────────
@component
export class C2BothBadgesScenario extends Scenario {
  async run(): Promise<void> {
    const api = await getApi()
    await resetToEmpty(api)

    await revealFully(api, "yogurt")
    api.setGazeOverride("snackbar")
    const ms = await waitFor(() => api.isBadgeVisible("snackbar"), 2000, "snackbar badge visible")
    log(`C2: snackbar badge visible ${ms}ms after switching gaze`)
    // Yogurt must still be up (linger) at the moment the snack bar appears.
    expect(api.isBadgeVisible("yogurt"), "yogurt badge gone before snack bar badge appeared").toBe(true)
    expect(api.getVisibleBadgeCount(), "both badges visible at once").toBe(2)
    await waitFor(() => api.getBadgeState("snackbar") === "shown", 1000, "snackbar shown")
    log(
      `C2: both visible: yogurt=${api.getBadgeState("yogurt")}@${api.getBadgeOpacity("yogurt").toFixed(2)} ` +
        `snackbar=${api.getBadgeState("snackbar")}@${api.getBadgeOpacity("snackbar").toFixed(2)} count=${api.getVisibleBadgeCount()}`,
    )

    const y = api.getBadgeText("yogurt")!
    const s = api.getBadgeText("snackbar")!
    expect(y.letter).toBe("A")
    expect(s.letter).toBe("E")
    expect(s.name).toBe("Snack Bar")
    expect(api.getGrade("snackbar")).toBe("E")

    const cy = gradeLetterColor(api, "yogurt")
    const cs = gradeLetterColor(api, "snackbar")
    log(`C2: letter colours yogurt(A)=${fmtColor(cy)} snackbar(E)=${fmtColor(cs)}`)
    expect(cy !== null && cs !== null, "grade letter colours not readable").toBe(true)
    expect(cy!.y > cy!.x, `A is not green-dominant: ${fmtColor(cy)}`).toBe(true)
    expect(cs!.x > cs!.y && cs!.x > cs!.z, `E is not red/orange-dominant: ${fmtColor(cs)}`).toBe(true)
    const diff = cy!.distance(cs!)
    log(`C2: colour distance A vs E = ${diff.toFixed(2)}`)
    expect(diff > 0.5, `A and E colours too similar (distance ${diff.toFixed(2)})`).toBe(true)
    log("C2 PASS: both badges visible together; A green vs E red-orange")
  }
}

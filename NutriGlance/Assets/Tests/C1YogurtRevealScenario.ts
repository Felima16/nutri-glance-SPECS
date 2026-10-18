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

// ── Criterion 1 ─────────────────────────────────────────────────────────────
@component
export class C1YogurtRevealScenario extends Scenario {
  async run(): Promise<void> {
    const api = await getApi()
    await resetToEmpty(api)

    api.setGazeOverride("yogurt")
    // Before the dwell elapses, nothing should be shown yet.
    await sleep(250)
    expect(api.isBadgeVisible("yogurt"), "yogurt badge visible before dwell elapsed").toBe(false)
    expect(api.getDwellSec("yogurt") > 0, "yogurt dwell timer not accumulating").toBe(true)
    expect(api.isAimed("yogurt"), "yogurt aim highlight not on while gazed").toBe(true)

    const appearMs = 250 + (await waitFor(() => api.isBadgeVisible("yogurt"), 2000, "yogurt badge visible"))
    log(`C1: yogurt badge became visible ${appearMs}ms after gaze started (dwell ${DWELL_SEC * 1000}ms)`)
    expect(appearMs >= DWELL_SEC * 1000 - 50, `badge appeared too early: ${appearMs}ms`).toBe(true)
    expect(appearMs <= 1500, `badge appeared too late: ${appearMs}ms`).toBe(true)

    await waitFor(() => api.getBadgeState("yogurt") === "shown", 2000, "yogurt state shown")
    expect(api.getBadgeOpacity("yogurt")).toBeCloseTo(1, 2)

    const text = api.getBadgeText("yogurt")
    expect(text !== null, "getBadgeText(yogurt) returned null").toBe(true)
    log(`C1: badge text letter="${text!.letter}" name="${text!.name}" hint="${text!.hint}"`)
    expect(text!.letter, "grade letter").toBe("A")
    expect(text!.letter.length, "single letter").toBe(1)
    expect(text!.name, "product name under the letter").toBe("Yogurt")
    expect(api.getGrade("yogurt")).toBe("A")

    const col = gradeLetterColor(api, "yogurt")
    log(`C1: grade letter colour ${fmtColor(col)}`)
    expect(col !== null, "grade letter Text not found").toBe(true)
    expect(col!.y > col!.x && col!.y > col!.z, `grade A letter is not green: ${fmtColor(col)}`).toBe(true)

    // "Next to it": badge belongs to the yogurt product and is near it.
    const badge = api.getBadgeSceneObject("yogurt")!
    const prod = api.getProductSceneObject("yogurt")!
    expect(isDescendantOf(badge, prod), "yogurt badge is not attached to the yogurt product").toBe(true)
    const d = badge.getTransform().getWorldPosition().distance(prod.getTransform().getWorldPosition())
    log(`C1: badge-to-product distance ${d.toFixed(1)}cm`)
    expect(d < 40, `badge too far from product: ${d.toFixed(1)}cm`).toBe(true)

    expect(api.getVisibleBadgeCount(), "only the yogurt badge should be visible").toBe(1)
    log("C1 PASS: yogurt badge revealed after dwell with letter A (green) and name 'Yogurt'")
  }
}

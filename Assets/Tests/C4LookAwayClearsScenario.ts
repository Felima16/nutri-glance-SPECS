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

// ── Criterion 4 ─────────────────────────────────────────────────────────────
@component
export class C4LookAwayClearsScenario extends Scenario {
  async run(): Promise<void> {
    const api = await getApi()
    await resetToEmpty(api)

    // Worst case: yogurt pinned (API pinch) + snack bar shown.
    await revealFully(api, "yogurt")
    expect(api.pinchBadge("yogurt")).toBe("pinned")
    await revealFully(api, "snackbar")
    expect(api.getVisibleBadgeCount()).toBe(2)

    api.setGazeOverride(null)
    expect(api.getBadgeState("yogurt")).toBe("pinned")
    const start = getTime()
    let snackGoneMs = -1
    let yogurtGoneMs = -1
    while (getTime() - start < 4) {
      const t = Math.round((getTime() - start) * 1000)
      if (snackGoneMs < 0 && !api.isBadgeVisible("snackbar")) snackGoneMs = t
      if (yogurtGoneMs < 0 && !api.isBadgeVisible("yogurt")) yogurtGoneMs = t
      if (snackGoneMs >= 0 && yogurtGoneMs >= 0) break
      await nextFrame()
    }
    log(`C4: after look-away: snackbar(unpinned) gone at ${snackGoneMs}ms, yogurt(pinned) gone at ${yogurtGoneMs}ms`)
    expect(api.getGazeTarget(), "gaze target after looking away").toBeNull()
    expect(snackGoneMs >= 0 && snackGoneMs <= 2000, `unpinned badge not cleared within 2s (${snackGoneMs}ms)`).toBe(true)
    expect(yogurtGoneMs >= 0 && yogurtGoneMs <= 3000, `pinned badge not cleared within 3s (${yogurtGoneMs}ms)`).toBe(true)
    expect(api.getVisibleBadgeCount(), "empty view").toBe(0)
    expect(api.getBadgeState("yogurt")).toBe("hidden")
    expect(api.getBadgeState("snackbar")).toBe("hidden")
    log("C4 PASS: both badges faded and cleared; empty view")
  }
}

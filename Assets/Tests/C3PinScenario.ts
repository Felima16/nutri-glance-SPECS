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

// ── Criterion 3 ─────────────────────────────────────────────────────────────
@component
export class C3PinScenario extends Scenario {
  async run(): Promise<void> {
    const api = await getApi()
    await resetToEmpty(api)

    await revealFully(api, "yogurt")

    // Prefer a real SIK trigger on the yogurt badge's UIKit Button.
    const badge = api.getBadgeSceneObject("yogurt")!
    const interactables = findInScene<Interactable>(
      (so) => so.getComponent(Interactable.getTypeName()) as Interactable,
      badge,
    )
    log(`C3: interactables under yogurt badge: ${interactables.map((i) => i.getSceneObject().name).join(",")}`)
    let path = "none"
    if (interactables.length > 0) {
      const interactor = new DefaultLeafInteractor("NutriGlancePinchInteractor")
      try {
        await withTimeout(interactor.trigger(interactables[0]), 5000, "SIK trigger on yogurt badge timed out")
        path = "real-SIK-trigger"
      } catch (e) {
        log(`C3: real SIK trigger failed: ${e}`)
      }
      await nextFrame()
    }
    if (api.getBadgeState("yogurt") !== "pinned") {
      if (path === "real-SIK-trigger") {
        throw new Error(
          `SIK trigger on yogurt badge completed but badge state is "${api.getBadgeState("yogurt")}" (expected pinned)`,
        )
      }
      const r = api.pinchBadge("yogurt")
      path = "api-pinchBadge"
      expect(r, "pinchBadge(yogurt) result").toBe("pinned")
    }
    log(`C3: pin input path = ${path}`)
    expect(api.getBadgeState("yogurt"), "yogurt pinned").toBe("pinned")
    expect(api.getBadgeText("yogurt")!.hint, "pinned hint").toBe("Pinned")

    api.setGazeOverride("snackbar")
    await waitFor(() => api.getBadgeState("snackbar") === "shown", 2000, "snackbar shown")
    // Let the pinned badge settle to its dimmed level, and go past the unpinned linger+fade window (1.5s).
    await sleep(1800)

    const yo = api.getBadgeOpacity("yogurt")
    const so = api.getBadgeOpacity("snackbar")
    log(
      `C3: after 1.8s on snack bar: yogurt=${api.getBadgeState("yogurt")}@${yo.toFixed(2)} visible=${api.isBadgeVisible("yogurt")}; ` +
        `snackbar=${api.getBadgeState("snackbar")}@${so.toFixed(2)} visible=${api.isBadgeVisible("snackbar")}`,
    )
    expect(api.getBadgeState("yogurt"), "pinned badge stays pinned").toBe("pinned")
    expect(api.isBadgeVisible("yogurt"), "pinned badge stays visible").toBe(true)
    expect(yo).toBeCloseTo(PINNED_OPACITY, 2)
    expect(yo < so, "pinned badge should be dimmer than the gazed badge").toBe(true)
    expect(api.getBadgeState("snackbar")).toBe("shown")
    expect(so).toBeCloseTo(1, 2)
    expect(api.getVisibleBadgeCount()).toBe(2)
    log(`C3 PASS (${path}): yogurt pinned & dimmed to ${yo.toFixed(2)}, snack bar full strength`)
  }
}

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

// ── Criterion 5 ─────────────────────────────────────────────────────────────
@component
export class C5NoGradeScenario extends Scenario {
  async run(): Promise<void> {
    const api = await getApi()
    await resetToEmpty(api)

    expect(api.getGrade("mystery"), "mystery grade").toBeNull()
    expect(api.hasBadge("mystery"), "mystery hasBadge").toBe(false)

    api.setGazeOverride("mystery")
    const start = getTime()
    let maxCount = 0
    let everVisible = false
    let nonHidden = ""
    while (getTime() - start < DWELL_SEC * 4) {
      maxCount = Math.max(maxCount, api.getVisibleBadgeCount())
      if (api.isBadgeVisible("mystery")) everVisible = true
      if (api.getBadgeState("mystery") !== "hidden") nonHidden = api.getBadgeState("mystery")
      await nextFrame()
    }
    const dwell = api.getDwellSec("mystery")
    log(
      `C5: gazed mystery for ${DWELL_SEC * 4}s: gazeTarget=${api.getGazeTarget()} dwell=${dwell.toFixed(2)}s ` +
        `state=${api.getBadgeState("mystery")} opacity=${api.getBadgeOpacity("mystery")} maxVisibleCount=${maxCount} ` +
        `badgeText=${JSON.stringify(api.getBadgeText("mystery"))} badgeSO=${api.getBadgeSceneObject("mystery")}`,
    )
    expect(api.getGazeTarget(), "gaze on mystery").toBe("mystery")
    expect(dwell > DWELL_SEC, `mystery not gazed long enough (dwell ${dwell})`).toBe(true)
    expect(everVisible, "mystery badge became visible").toBe(false)
    expect(nonHidden, `mystery entered state "${nonHidden}"`).toBe("")
    expect(maxCount, "visible badge count while gazing mystery").toBe(0)
    expect(api.getBadgeOpacity("mystery")).toBe(0)
    expect(api.getBadgeText("mystery"), "no placeholder text for mystery").toBeNull()
    expect(api.getBadgeSceneObject("mystery"), "no badge object for mystery").toBeNull()
    log("C5 PASS: no badge, no placeholder for ungraded product")
  }
}

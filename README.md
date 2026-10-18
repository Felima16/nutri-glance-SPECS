# Nutri-Glance

An AR Lens for Specs, Snap's AR glasses, that turns a grocery-aisle decision into a glance. Look at a product on the shelf and its Nutri-Score appears as a single large, color-coded letter floating beside the package — no label-turning, no small print, no comparing numbers.

Built for the [Learn AR with SPECS](https://learn-specs.devpost.com/) hackathon using a coding agent (Claude Code) with the Devpost Learn skill pack, the CLAD plugin, and Lens Studio MCP.

> **Status:** built and validated in Lens Studio Interactive Preview. Live product recognition and hand-tracked pinch require real Specs hardware. See [Validated vs. unproven](#validated-vs-unproven).

---

## What it does

- **Glance to reveal.** Gaze at a product for a short dwell (~0.5s) and its Nutri-Score badge appears beside it, offset so it never covers the package.
- **Side-by-side comparison.** Two products on the shelf show their grades at once, so a healthy-vs-poor choice reads in seconds. A badge lingers ~1s after you look away so turning between products doesn't lose the comparison.
- **Pin and compare.** A pinch pins a badge in place (visually dimmed) while you look at the other product; pinch again, or look away from the shelf for a couple of seconds, and it clears.
- **No false grades.** A product with no assigned grade shows no badge at all. Showing nothing is better than showing a wrong rating.
- **Preview-native.** Recognition is simulated with a virtual shelf and placeholder products whose grades are pre-wired — the Lens Studio preview cannot recognize real objects.

## The scene

A virtual shelf at eye level in the "Sunlit Room" preview environment:

| Position | Product | Grade |
|---|---|---|
| Left | Yogurt (placeholder) | A |
| Middle | "Mystery box" (placeholder) | none — tests the no-badge rule |
| Right | Snack bar (placeholder) | E |

The yogurt and snack bar sit ~45 cm apart, with the mystery box between them, so the shelf nearly fits the glasses' field of view at ~1.1 m; you turn your head slightly between products. Badges float above-right of each product, never covering the package.

## Interaction model

| Input | Effect |
|---|---|
| Gaze (dwell ~0.5s) | Reveal that product's badge |
| Look away (unpinned) | Badge holds ~1s, then fades over ~0.5s |
| Pinch on a badge | Pin / unpin that badge |
| Look away (pinned, ~2s) | Pinned badge clears |

Timing is tunable in the Inspector on the `NutriGlance` object: `dwellSec` (look time before reveal, 0.5), `lingerSec` (hold time after look-away, 1.0), `fadeOutSec` (0.5), `pinnedClearSec` (2.0) and `pinnedOpacity` (0.45).

## Project layout

```
.
├── README.md
├── LICENSE
└── NutriGlance/                    Lens Studio project (open challegeDevspot.esproj)
    ├── challegeDevspot.esproj
    ├── Assets/
    │   ├── Scene.scene
    │   ├── Scripts/                Lens logic (TypeScript)
    │   │   ├── NutriGlanceMain.ts      orchestrator, Inspector settings, test API
    │   │   ├── NutriGlanceState.ts     badge state machine (hidden / revealing / shown / pinned / fading)
    │   │   ├── NutriGlanceGaze.ts      head-gaze ray → which product is looked at
    │   │   ├── NutriGlanceProduct.ts   one per product: name, hard-coded grade, aim ring
    │   │   ├── NutriGlanceBadgeUI.ts   the badge: UI Kit button, grade letter, product name
    │   │   └── NutriGlanceAudio.ts     reveal / pin / unpin sounds
    │   ├── Tests/                  LEAF scenarios, one per done criterion
    │   ├── GeneratedSFX/           sound cues
    │   └── Icons/, Materials/, Meshes/
    ├── Packages/                   Spectacles Interaction Kit, UI Kit, LEAF
    └── devpost/
        └── design-brief.md         the design brief the Lens was built from
```

## Running it

1. Open `NutriGlance/challegeDevspot.esproj` in Lens Studio 5.22 or later.
2. In the Preview panel, use Interactive Preview. Move with WASD, Q/E for down/up, and right-drag (or hold Shift) to look around. A click acts as a pinch.
3. Look at the yogurt or snack bar on the shelf in front of you.

## Tests

Each done criterion from the [design brief](NutriGlance/devpost/design-brief.md) has a LEAF scenario in `NutriGlance/Assets/Tests/`. All five pass in the Lens Studio preview.

| # | Criterion | Scenario | Result |
|---|---|---|---|
| 1 | Look at the yogurt: after a short dwell, a green **A** appears with "Yogurt" underneath | `c1-yogurt-reveal` | Pass |
| 2 | Look at the snack bar: a red-orange **E** appears while the yogurt's badge is still up | `c2-both-badges` | Pass |
| 3 | Pinch the yogurt badge, look at the snack bar: yogurt stays dimmed, snack bar at full strength | `c3-pin-yogurt` | Pass |
| 4 | Look away from the shelf: every badge, pinned or not, is gone within ~2.3s | `c4-look-away-clears` | Pass |
| 5 | Look at the mystery box for 2s: no badge ever appears | `c5-no-grade-mystery` | Pass |

The pinch in test 3 is a real Spectacles Interaction Kit trigger on the badge's button. Gaze is set through the Lens's test API, because a scenario can't steer the preview camera; the dwell, fade and pin logic after that is the real one. To run them, open the LEAF panel in Lens Studio and run the scenarios against the preview.

## Validated vs. unproven

**Logic proven** (LEAF tests and preview):
- Dwell reveal, two badges at once, pin and unpin, look-away clearing, and no badge for an ungraded product.
- Pinch on a badge through the real interaction path.

**Feel unproven** (needs real Specs):
- Recognising real packaged products. This build uses placeholder products with hard-coded grades; the shipped version would need on-device recognition.
- Whether a 0.5s dwell feels right, and whether head-gaze picks the intended product in a crowded aisle.
- Real hand-tracked pinch, and badge legibility on the additive display in store lighting.

**Placeholders:** the products are simple primitive shapes (marked "(placeholder)" in the scene) standing in for 3D product models.

## License

See [LICENSE](LICENSE).

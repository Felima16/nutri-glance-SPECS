# Nutri-Glance

An AR Lens for Snap Spectacles that turns a grocery-aisle decision into a glance. Look at a product on the shelf and its Nutri-Score appears as a single large, color-coded letter floating beside the package — no label-turning, no small print, no comparing numbers.

Built for the [Learn SPECS, Master AR](https://learn-specs.devpost.com/) hackathon using a coding agent (Claude Code) with the Devpost Learn skill pack, the CLAD plugin, and Lens Studio MCP.

> **Status:** built and validated in Lens Studio Interactive Preview. Live product recognition and hand-tracked pinch require real Spectacles hardware. See [Validated vs. unproven](#validated-vs-unproven).

---

## What it does

- **Glance to reveal.** Gaze at a product for a short dwell (~0.5s) and its Nutri-Score badge appears beside it, offset so it never covers the package.
- **Side-by-side comparison.** Two products on the shelf show their grades at once, so a healthy-vs-poor choice reads in seconds. A badge lingers ~1s after you look away so turning between products doesn't lose the comparison.
- **Pin and compare.** A pinch pins a badge in place (visually dimmed) while you look at the other product; pinch again, or look away for a couple of seconds, and it clears.
- **No false grades.** A product with no assigned grade shows no badge at all. Showing nothing is better than showing a wrong rating.
- **Preview-native.** Recognition is simulated with a virtual shelf and placeholder products whose grades are pre-wired — the Lens Studio preview cannot recognize real objects.

## The scene

A virtual shelf at eye level in the "Sunlit Room" preview environment:

| Position | Product | Grade |
|---|---|---|
| Left | Yogurt (placeholder) | A |
| Middle | "Mystery box" (placeholder) | none — tests the no-badge rule |
| Right | Snack bar (placeholder) | D |

Products sit ~45 cm apart so the shelf fits the glasses' field of view. Badges float above-right of each product, never covering the package.

## Interaction model

| Input | Effect |
|---|---|
| Gaze (dwell ~0.5s) | Reveal that product's badge |
| Look away (unpinned) | Badge holds ~1s, then fades |
| Pinch | Pin / unpin the badge in view |
| Look away (pinned, ~2s) | Pinned badge clears |

Timing is tunable in the Inspector: `dwellSec` (look time before reveal) and `lingerSec` (hold time after look-away).

## Project layout

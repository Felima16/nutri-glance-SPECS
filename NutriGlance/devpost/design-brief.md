---
status: approved
---

# Design brief: Nutri-Glance

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

## The one spatial moment
Standing in a grocery aisle, comparing two products side by side on a shelf — a yogurt and a snack bar. Looking at each one in turn reveals its Nutri-Score as a single large color-coded letter floating next to the package, so the healthy-vs-unhealthy choice takes three seconds instead of a minute of label-reading.

## Why it belongs on glasses
- Uses: shares your view (grade appears on the product you're looking at) / leaves your body free (hands stay on the products, no device to pull out)
- Why it's better than the phone or laptop version: a phone requires taking the product in hand, opening an app, and scanning — breaking the glance-and-compare flow. Glasses let the grade appear exactly where you're already looking, with hands free to hold the products themselves.

## Product or overlay
- Type: overlay — it responds to something real (a packaged food product)
- What the real version would sense: the identity of the product being looked at, to look up its real Nutri-Score
- Stand-in for the preview: no live camera recognition. Placeholder 3D product models (or flat package images) are placed directly in the virtual room on a shelf, each pre-wired to a hard-coded Nutri-Score grade. Looking at a placeholder triggers its badge, same as real recognition would.

## Where things live
- Where the user is looking during the main task: at the shelf, directly at whichever product they're comparing
- Shelf: a plain horizontal surface at eye level, directly in front of the user
- Yogurt (placeholder product): on the left side of the shelf
- Snack bar (placeholder product): on the right side of the shelf, about 0.5 m from the yogurt
- Grade badge (per product): floats just above and slightly to the right of its product, not covering the package — large color-coded letter, product name in smaller text underneath

## Hands and input
- Look at a product (gaze dwell, ~0.5s): reveals its grade badge
- Pinch (on a revealed badge): pins the badge in place so it stays visible, dimmed, while looking elsewhere
- Pinch again (on a pinned badge): unpins and clears it
- Targets are big and highlight when aimed at.
- Voice: none used.

## When things show
- Grade badge: shows after ~0.5s dwell looking at its product; fades out over ~0.5s when the user looks away, if unpinned
- Pinned badge: stays visible in a dimmed state until pinched again, or until the user looks away from both products for a couple of seconds, at which point it clears
- A product with no assigned grade shows no badge at all — no invented or placeholder grade
- Nothing stays on screen longer than a few seconds after the user stops looking at the shelf

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Look at the yogurt on the shelf; after a short dwell, its grade badge appears next to it — a single color-coded letter with the product name underneath.
2. Look at the snack bar; its badge appears too, so both can be visible at once and the two grades read as clearly different (one healthy, one poor).
3. Pin the yogurt's badge with a pinch, then look at the snack bar — the pinned badge stays visible (dimmed) while the snack bar's badge shows at full strength.
4. Look away from the shelf entirely — both badges fade and clear within a couple of seconds, leaving an empty view.
5. Look at a product with no assigned grade — no badge appears, no invented or placeholder result.

## Out of scope
- Real product recognition (SnapML / live camera vision) — this version uses placeholder products pre-wired to hard-coded grades, not real scanning.
- Any product other than the two staged on the shelf (yogurt, snack bar).
- Looking up real nutrition data from an external source — grades are hard-coded sample data.
- Voice control.
- Remembering pinned state or grades between sessions.

## Risks and open questions
- Real recognition of arbitrary packaged products (what the shipped version would need) can only be evaluated with real SnapML/camera vision on real glasses — not provable in this preview build. Labeled "feel unproven."
- Whether 0.5s dwell feels right (not too twitchy, not too slow) is a feel judgment only real use can confirm; the preview build should make this an easy value to tune.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources

/**
 * NutriGlanceState — pure badge state machine (no scene access).
 *
 * Owns: per-product badge state (hidden / revealing / shown / pinned / fading),
 *       opacity, dwell timers, and the "looked away from every product" timer.
 * Expects: NutriGlanceMain to call `step()` once per frame with the current
 *          gaze target, and `pinch()` when a badge is pinched.
 * Must not: touch SceneObjects, UI, or audio — it only returns events that
 *           the main script turns into visuals and sounds.
 */

export enum BadgeState {
  Hidden = "hidden",
  Revealing = "revealing",
  Shown = "shown",
  Pinned = "pinned",
  Fading = "fading",
}

export type BadgeEventKind = "revealed" | "pinned" | "unpinned" | "cleared" | "hidden"

export interface BadgeEvent {
  productId: string
  kind: BadgeEventKind
}

export interface BadgeTiming {
  /** Seconds of continuous gaze before a badge reveals. */
  dwellSec: number
  /** Seconds a revealing badge takes to reach full opacity. */
  fadeInSec: number
  /** Seconds an unpinned badge stays at full strength after the user looks away. */
  lingerSec: number
  /** Seconds an unpinned badge takes to fade out. */
  fadeOutSec: number
  /** Seconds of looking away from every product before pinned badges clear. */
  pinnedClearSec: number
  /** Opacity of a pinned badge while the user looks elsewhere. */
  pinnedOpacity: number
}

export class BadgeRecord {
  state: BadgeState = BadgeState.Hidden
  opacity: number = 0
  /** Continuous seconds this product has been gazed at (0 when not gazed). */
  dwellSec: number = 0
  /** Seconds since this product was last gazed at. */
  awaySec: number = 0
  /** After an unpin, the badge stays down until gaze leaves the product once. */
  suppressUntilGazeLeaves: boolean = false

  constructor(
    public readonly productId: string,
    public readonly grade: string | null
  ) {}

  get hasBadge(): boolean {
    return this.grade !== null
  }
}

export class NutriGlanceState {
  private records = new Map<string, BadgeRecord>()
  private order: string[] = []
  /** Seconds since the user last looked at ANY product. */
  awayFromAllSec: number = 0

  addProduct(productId: string, grade: string | null): BadgeRecord {
    const rec = new BadgeRecord(productId, grade)
    this.records.set(productId, rec)
    this.order.push(productId)
    return rec
  }

  get(productId: string): BadgeRecord | undefined {
    return this.records.get(productId)
  }

  ids(): string[] {
    return this.order.slice()
  }

  /** Advance every badge by dt seconds given the current gaze target (null = looking away). */
  step(gazedId: string | null, dt: number, t: BadgeTiming): BadgeEvent[] {
    const events: BadgeEvent[] = []
    this.awayFromAllSec = gazedId === null ? this.awayFromAllSec + dt : 0

    for (const id of this.order) {
      const r = this.records.get(id)!
      const gazed = gazedId === id
      if (gazed) {
        r.dwellSec += dt
        r.awaySec = 0
      } else {
        r.dwellSec = 0
        r.awaySec += dt
        r.suppressUntilGazeLeaves = false
      }

      // Products with no assigned grade never show a badge — no invented result.
      if (!r.hasBadge) {
        r.state = BadgeState.Hidden
        r.opacity = 0
        continue
      }

      switch (r.state) {
        case BadgeState.Hidden:
          r.opacity = 0
          if (gazed && !r.suppressUntilGazeLeaves && r.dwellSec >= t.dwellSec) {
            r.state = BadgeState.Revealing
            events.push({productId: id, kind: "revealed"})
          }
          break

        case BadgeState.Revealing:
          r.opacity = Math.min(1, r.opacity + dt / Math.max(0.01, t.fadeInSec))
          if (!gazed && r.awaySec >= t.lingerSec) {
            r.state = BadgeState.Fading
          } else if (r.opacity >= 1) {
            r.state = BadgeState.Shown
          }
          break

        case BadgeState.Shown:
          r.opacity = 1
          if (!gazed && r.awaySec >= t.lingerSec) r.state = BadgeState.Fading
          break

        case BadgeState.Fading:
          if (gazed && !r.suppressUntilGazeLeaves) {
            r.state = BadgeState.Revealing
            break
          }
          r.opacity = Math.max(0, r.opacity - dt / Math.max(0.01, t.fadeOutSec))
          if (r.opacity <= 0) {
            r.state = BadgeState.Hidden
            events.push({productId: id, kind: "hidden"})
          }
          break

        case BadgeState.Pinned: {
          if (this.awayFromAllSec >= t.pinnedClearSec) {
            r.state = BadgeState.Fading
            events.push({productId: id, kind: "cleared"})
            break
          }
          const target = gazed ? 1 : t.pinnedOpacity
          const rate = dt / Math.max(0.01, t.fadeInSec)
          r.opacity = r.opacity < target ? Math.min(target, r.opacity + rate) : Math.max(target, r.opacity - rate)
          break
        }
      }
    }
    return events
  }

  /** Pinch on a badge: revealed -> pinned, pinned -> unpinned (clears). Returns the event or null if ignored. */
  pinch(productId: string): BadgeEvent | null {
    const r = this.records.get(productId)
    if (!r || !r.hasBadge) return null
    if (r.state === BadgeState.Revealing || r.state === BadgeState.Shown) {
      r.state = BadgeState.Pinned
      return {productId, kind: "pinned"}
    }
    if (r.state === BadgeState.Pinned) {
      r.state = BadgeState.Fading
      r.suppressUntilGazeLeaves = true
      r.dwellSec = 0
      return {productId, kind: "unpinned"}
    }
    return null
  }
}

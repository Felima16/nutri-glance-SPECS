/**
 * NutriGlanceAudio — badge sound cues (plain helper, not a component).
 *
 * Owns: one AudioComponent per cue (reveal, pin, unpin) on a host SceneObject.
 * Expects: NutriGlanceMain to construct it once and call the play methods.
 * Must not: decide when cues play.
 */
const REVEAL_TRACK = requireAsset("../GeneratedSFX/BadgeReveal.wav") as AudioTrackAsset
const PIN_ON_TRACK = requireAsset("../GeneratedSFX/PinOn.wav") as AudioTrackAsset
const PIN_OFF_TRACK = requireAsset("../GeneratedSFX/PinOff.wav") as AudioTrackAsset

export class NutriGlanceAudio {
  private reveal: AudioComponent
  private pinOn: AudioComponent
  private pinOff: AudioComponent

  constructor(host: SceneObject, volume: number) {
    this.reveal = this.make(host, REVEAL_TRACK, volume * 0.6)
    this.pinOn = this.make(host, PIN_ON_TRACK, volume)
    this.pinOff = this.make(host, PIN_OFF_TRACK, volume)
  }

  playReveal(): void {
    this.safePlay(this.reveal)
  }

  playPinOn(): void {
    this.safePlay(this.pinOn)
  }

  playPinOff(): void {
    this.safePlay(this.pinOff)
  }

  private make(host: SceneObject, track: AudioTrackAsset, volume: number): AudioComponent {
    const a = host.createComponent("Component.AudioComponent") as AudioComponent
    a.audioTrack = track
    a.volume = volume
    try {
      // Input-reactive cues: minimise latency on Specs (default is LowPower).
      a.playbackMode = Audio.PlaybackMode.LowLatency
    } catch (e) {
      // Not supported in this preview target — default mode is fine.
    }
    return a
  }

  private safePlay(a: AudioComponent): void {
    if (a.volume <= 0) return
    if (a.isPlaying()) a.stop(false)
    a.play(1)
  }
}

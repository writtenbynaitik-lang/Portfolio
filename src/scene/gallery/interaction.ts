import { MathUtils } from 'three'

/**
 * What the visitor is doing with the gallery through the page (the caption
 * links), shared with the scene. The scene combines it with pointer hover and
 * touch taps, which it detects itself, and eases each project's focus toward
 * the result every frame, so all of them drive one animation.
 */
export class GalleryInteraction {
  /** Project whose link has keyboard focus, or −1. */
  keyboard = -1
  /** Project whose caption the pointer is over, or −1. */
  caption = -1
  /**
   * How engaged the visitor is with a project, 0–1, eased by the gallery each
   * frame (see settle). Automatic motion (idle float, pointer parallax) holds
   * still as it rises, so nothing slides out from under the pointer.
   */
  engaged = 0

  focus(index: number) {
    this.keyboard = index
  }

  blur(index: number) {
    if (this.keyboard === index) this.keyboard = -1
  }

  enterCaption(index: number) {
    this.caption = index
  }

  leaveCaption(index: number) {
    if (this.caption === index) this.caption = -1
  }

  /** Eases `engaged` toward whether any project is engaged now: quickly in, gently out. */
  settle(active: boolean, delta: number) {
    this.engaged = MathUtils.damp(this.engaged, active ? 1 : 0, active ? 10 : 2, delta)
  }
}

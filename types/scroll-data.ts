/**
 * The five scroll-data channels that drive the hero 3D vehicle kinematics.
 * Each value is a smoothstep-curved number in [0, 1] computed from the
 * GSAP ScrollTrigger `onUpdate` callback in `ETXExperience`.
 *
 * @see components/home/ETXExperience.tsx — channel computation
 * @see components/VehicleScene.tsx       — channel consumers
 */
export type ScrollData = {
  /** Stage 1: vehicle reveal / grow / initial Y-rotation arc. */
  hero: number;
  /** Stage 2: spec card visible; vehicle shrinks and slides off-screen right. */
  metrics: number;
  /** Stage 3: urban sweep — lateral drive-through + banking tilt. */
  urban: number;
  /** Stage 4: 3D-only beat — enter left, pause center, rocket right + fade. */
  charging: number;
  /** Stage 5: cream flood + "Freedom Defined" — full-width traverse + fade. */
  daylight: number;
};

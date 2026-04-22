import * as THREE from "three";

/** Exterior body paint (hero / about / studio — not preorder HUD). */
export const ETX_BODY_PAINT_HEX = "#760000";

type PaintMaterial = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

/**
 * Tires, tread, rubber wheel parts — do not recolor with body paint.
 * Matches common mesh / material names from DCC + glTF exporters.
 */
function isTireOrRubberWheelPart(
  object: THREE.Object3D,
  mat: THREE.Material,
): boolean {
  const s = `${object.name} ${mat.name}`.toLowerCase();
  if (/\b(tire|tyre|tread|sidewall|inner.?tube)\b/i.test(s)) return true;
  if (/tire_|_tire|tyre_|_tyre|wheel_tire|tire\./i.test(s)) return true;
  if (/(wheel|wheels).*(rubber|tire|tyre)/i.test(s)) return true;
  if (/(rubber|tire|tyre).*(wheel|wheels|rim_tire)/i.test(s)) return true;
  if (/\b(rubber)\b.*\b(wheel|rim|tire)\b/i.test(s)) return true;
  return false;
}

/**
 * Tints body paint; skips tire / rubber wheel materials.
 * Same heuristics as the preorder `ConfiguratorCanvas`, minus tire parts.
 */
export function applyEtxBodyPaint(
  root: THREE.Object3D,
  hex: string = ETX_BODY_PAINT_HEX,
): void {
  const target = new THREE.Color(hex);
  const body: PaintMaterial[] = [];
  const allPaintNonTire: PaintMaterial[] = [];

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (
        !(
          mat instanceof THREE.MeshStandardMaterial ||
          mat instanceof THREE.MeshPhysicalMaterial
        )
      ) {
        continue;
      }
      if (isTireOrRubberWheelPart(o, mat)) {
        continue;
      }

      allPaintNonTire.push(mat);
      const c = mat.color;
      const lum = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
      const matchesName =
        /body|shell|panel|skin|exterior|paint|tuk|vehicle|chassis|cab|hood|roof|door|fender|bumper(?!.*rubber)/i.test(
          mat.name,
        ) ||
        /body|shell|exterior|cab|chassis|tuk|vehicle|fender|hood|door/i.test(
          o.name,
        );
      if (lum > 0.5 || matchesName) {
        body.push(mat);
      }
    }
  });

  const toTint = body.length > 0 ? body : allPaintNonTire;
  for (const m of toTint) {
    m.color.copy(target);
  }
}

/**
 * Centralized vehicle optimization engine.
 * Handles both "High Performance" (glossy PBR) and "Low Power" (matte stripped) modes.
 * 
 * @param root The THREE.Object3D (vehicle) to optimize.
 * @param lowPower Whether to apply aggressive mobile optimizations (strip textures, cull interior).
 */
export function optimizeVehicle(root: THREE.Object3D, lowPower: boolean): void {
  root.traverse((o) => {
    // 1. Cull internal geometry in lowPower mode to save vertex budget.
    if (lowPower && o instanceof THREE.Mesh) {
      const n = o.name.toLowerCase();
      if (/\b(interior|seat|leather|floor|screen|steering|pedal|carpet|headrest|mirror_int)\b/i.test(n)) {
        o.visible = false;
        o.castShadow = false;
        o.receiveShadow = false;
        return;
      }
    }

    if (!(o instanceof THREE.Mesh) || !o.material) return;

    const process = (m: THREE.Material): THREE.Material => {
      if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial)) {
        return m;
      }

      if (lowPower) {
        // "Safety Mode": Strip everything to avoid GPU hangs on low-end hardware.
        const next = new THREE.MeshStandardMaterial({
          color: m.color,
          roughness: 0.9,
          metalness: 0,
          flatShading: true,
          transparent: m.transparent,
          opacity: m.opacity,
          name: m.name + "_low",
        });
        m.dispose();
        return next;
      }

      // "Cinematic Mode": Tone down hot highlights for a premium studio look.
      const pm = m;
      pm.envMapIntensity = (pm.envMapIntensity ?? 1) * 0.4;
      pm.roughness = Math.min(1, (pm.roughness ?? 0.5) + 0.16);
      pm.metalness = Math.max(0, (pm.metalness ?? 0) * 0.86);

      if (pm instanceof THREE.MeshPhysicalMaterial) {
        pm.clearcoat = Math.max(0, (pm.clearcoat ?? 0) * 0.42);
        pm.clearcoatRoughness = Math.min(1, (pm.clearcoatRoughness ?? 0) + 0.32);
        pm.specularIntensity = Math.max(0.15, (pm.specularIntensity ?? 1) * 0.55);
      }
      return pm;
    };

    if (Array.isArray(o.material)) {
      o.material = o.material.map(process);
    } else {
      o.material = process(o.material);
    }
  });

  // Apply final body paint tint.
  applyEtxBodyPaint(root);
}

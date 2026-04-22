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
 * Tones down IBL / specular "hot" highlights on the ETX PBR body without re-exporting the GLB.
 * Applied to cloned materials wherever the vehicle is instanced.
 */
export function toneDownEtxReflections(material: THREE.Material): void {
  if (
    !(
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial
    )
  ) {
    return;
  }

  const m = material;
  m.envMapIntensity = (m.envMapIntensity ?? 1) * 0.4;
  m.roughness = Math.min(1, (m.roughness ?? 0.5) + 0.16);
  m.metalness = Math.max(0, (m.metalness ?? 0) * 0.86);

  if (m instanceof THREE.MeshPhysicalMaterial) {
    m.clearcoat = Math.max(0, (m.clearcoat ?? 0) * 0.42);
    m.clearcoatRoughness = Math.min(1, (m.clearcoatRoughness ?? 0) + 0.32);
    m.sheen = Math.max(0, (m.sheen ?? 0) * 0.45);
    m.specularIntensity = Math.max(
      0.15,
      (m.specularIntensity ?? 1) * 0.55,
    );
  }
}

export function toneDownEtxReflectionsOnObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material) {
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of list) {
        if (mat) toneDownEtxReflections(mat);
      }
    }
  });
}

/**
 * Aggressive material stripping for low-end mobile.
 * Converts expensive MeshPhysicalMaterial to MeshStandardMaterial and
 * removes high-overhead features like clearcoat, sheen, and transmission.
 */
export function downgradeEtxMaterialsForMobile(root: THREE.Object3D): void {
  root.traverse((o) => {
    // 1. Cull internal geometry that isn't visible from the outside.
    // This saves massive amounts of VRAM and vertex processing on mobile.
    if (o instanceof THREE.Mesh) {
      const n = o.name.toLowerCase();
      const isInternal = /\b(interior|seat|leather|floor|screen|steering|pedal|carpet|headrest)\b/i.test(n);
      if (isInternal) {
        o.visible = false;
        o.castShadow = false;
        o.receiveShadow = false;
        return; // Skip material processing for hidden meshes
      }
    }

    if (!(o instanceof THREE.Mesh) || !o.material) return;

    const convert = (m: THREE.Material): THREE.Material => {
      const prev = m as THREE.MeshStandardMaterial;
      
      // Safety: Strip textures and environment maps to avoid GPU saturation.
      // 1x1 PNGs and KTX2 placeholders can sometimes cause driver hangs.
      const next = new THREE.MeshStandardMaterial({
        color: prev.color,
        roughness: 0.9, // Matte is cheaper to calculate than glossy
        metalness: 0,
        flatShading: true, // Bypass normal interpolation
        transparent: prev.transparent,
        opacity: prev.opacity,
        map: null,
        normalMap: null,
        roughnessMap: null,
        metalnessMap: null,
        envMap: null, // No reflections on mobile
        envMapIntensity: 0,
        name: prev.name + "_low",
      });

      // Dispose of the expensive material to free GPU memory.
      prev.dispose();
      return next;
    };

    if (Array.isArray(o.material)) {
      o.material = o.material.map(convert);
    } else {
      o.material = convert(o.material);
    }
  });
}

import * as THREE from 'three';

export type AuditoriumAnchor = { x: number; y: number; scale: number; row: number };
export type AuditoriumScreenBounds = { left: number; top: number; width: number; height: number };
export type AuditoriumWorld = {
  resize(width: number, height: number): void;
  layout(capacity: number): AuditoriumAnchor[];
  screenBounds(): AuditoriumScreenBounds;
  dispose(): void;
};

const VIEW_WIDTH = 26.6;
const VIEW_HEIGHT = VIEW_WIDTH / 1.6;
const STAGE_Z = -4;
const SCREEN_Z = -5.8;
const SCREEN_WIDTH = 16;
const SCREEN_BOTTOM = 2;
const SCREEN_TOP = 6.4;
const ARC = 1.18;
const AISLE = .13;

/** A fixed camera keeps real 3D seating and accessible HTML overlays in one coordinate system. */
export function createAuditoriumWorld(canvas: HTMLCanvasElement): AuditoriumWorld {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10182e');
  const camera = new THREE.OrthographicCamera(-VIEW_WIDTH / 2, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, -VIEW_HEIGHT / 2, .1, 100);
  camera.position.set(0, 18, 18);
  camera.lookAt(0, 1.8, -1);
  camera.updateMatrixWorld();

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const seating = new THREE.Group();
  const anchorPoints: Array<{ point: THREE.Vector3; row: number }> = [];
  let currentCapacity = 0;
  let disposed = false;

  function material(color: string, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: .04, ...options });
    materials.add(value);
    return value;
  }
  const navy = material('#18223c');
  const deepNavy = material('#11192d');
  const riser = material('#4c5577');
  const ivory = material('#e9dfcf');
  const warmFloor = material('#d4cbbb');
  const lilacFloor = material('#c4c5d5');
  const sage = material('#75998e');
  const brass = material('#d9bd88', { metalness: .3, roughness: .42 });
  const upholstery = material('#7b85b3', { roughness: .94 });
  const upholsteryLight = material('#a4b4bb', { roughness: .95 });
  const screenGreen = material('#224f43', { emissive: '#17372e', emissiveIntensity: .35 });
  const warmGlow = material('#f4d5a3', { emissive: '#f0c282', emissiveIntensity: 2 });

  function mesh(geometry: THREE.BufferGeometry, surface: THREE.Material | THREE.Material[], parent: THREE.Object3D = scene) {
    geometries.add(geometry);
    const value = new THREE.Mesh(geometry, surface);
    parent.add(value);
    return value;
  }
  function box(width: number, height: number, depth: number, x: number, y: number, z: number, surface: THREE.Material) {
    const value = mesh(new THREE.BoxGeometry(width, height, depth), surface);
    value.position.set(x, y, z);
    return value;
  }
  function sector(inner: number, outer: number, start: number, end: number, depth: number) {
    const shape = new THREE.Shape();
    const steps = 44;
    for (let index = 0; index <= steps; index++) {
      const angle = start + (end - start) * index / steps;
      const x = Math.sin(angle) * outer;
      const z = STAGE_Z + Math.cos(angle) * outer;
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    }
    for (let index = steps; index >= 0; index--) {
      const angle = start + (end - start) * index / steps;
      shape.lineTo(Math.sin(angle) * inner, -(STAGE_Z + Math.cos(angle) * inner));
    }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }
  function arcRail(radius: number, start: number, end: number, y: number, thickness: number, surface: THREE.Material) {
    const points = Array.from({ length: 41 }, (_, index) => {
      const angle = start + (end - start) * index / 40;
      return new THREE.Vector3(Math.sin(angle) * radius, y, STAGE_Z + Math.cos(angle) * radius);
    });
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, thickness, 5, false), surface);
  }

  scene.add(new THREE.HemisphereLight('#d9e2ff', '#5b4d44', 2.35));
  const key = new THREE.DirectionalLight('#ffe4bb', 3.5);
  key.position.set(-8, 14, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#c7d5ff', 1.6);
  fill.position.set(10, 8, -4);
  scene.add(fill);
  const stageLight = new THREE.PointLight('#ffdeb0', 35, 18, 2);
  stageLight.position.set(0, 7, -2);
  scene.add(stageLight);

  // The auditorium is a cutaway diorama, with a continuous dark foundation beneath raised tiers.
  const foundation = mesh(sector(.1, 11.55, -1.33, 1.33, .55), [navy, deepNavy]);
  foundation.position.y = -.55;
  const outerRim = mesh(sector(11.55, 11.86, -1.33, 1.33, 1.75), [navy, deepNavy]);
  outerRim.position.y = -.5;
  arcRail(11.72, -1.33, 1.33, 1.28, .045, brass);

  for (let row = 0; row < 5; row++) {
    const radius = 4.6 + row * 1.6;
    const level = row * .32;
    for (const [start, end] of [[-1.29, -AISLE], [AISLE, 1.29]]) {
      const tier = mesh(sector(radius - .65, radius + .87, start, end, .23), [row % 2 ? lilacFloor : warmFloor, riser]);
      tier.position.y = level;
      arcRail(radius + .85, start, end, level + .25, .025, ivory);
      arcRail(radius - .63, start, end, level + .245, .018, brass);
    }
    const stair = mesh(sector(radius - .65, radius + .87, -AISLE, AISLE, .18), [navy, riser]);
    stair.position.y = level;
    const stripe = mesh(sector(radius - .65, radius - .59, -.11, .11, .015), warmGlow);
    stripe.position.y = level + .185;
  }

  // Broad stage, inset screen and tall wings form a strong front-of-room focal point.
  const stageBase = mesh(new THREE.CylinderGeometry(3.9, 4.1, .6, 72), [ivory, ivory, warmFloor]);
  stageBase.position.set(0, .35, STAGE_Z);
  const stageTop = mesh(new THREE.CylinderGeometry(3.86, 3.86, .055, 72), ivory);
  stageTop.position.set(0, .68, STAGE_Z);
  const stageTrim = mesh(new THREE.TorusGeometry(3.92, .035, 6, 72), brass);
  stageTrim.rotation.x = Math.PI / 2;
  stageTrim.position.set(0, .58, STAGE_Z);
  for (let step = 0; step < 3; step++) {
    const tread = mesh(new THREE.CylinderGeometry(1.3 - step * .13, 1.35 - step * .13, .14, 28), ivory);
    tread.scale.z = .4;
    tread.position.set(0, .11 + step * .16, -.1 - step * .3);
  }

  box(19.6, 8.3, .65, 0, 4.05, -6.35, deepNavy);
  box(17.4, 5.6, .24, 0, 4.25, -5.99, brass);
  box(16.9, 5.1, .27, 0, 4.25, -5.84, navy);
  box(SCREEN_WIDTH, SCREEN_TOP - SCREEN_BOTTOM, .035, 0, (SCREEN_TOP + SCREEN_BOTTOM) / 2, SCREEN_Z, screenGreen);
  box(16.05, .045, .15, 0, SCREEN_BOTTOM - .10, SCREEN_Z + .13, warmGlow);
  for (const side of [-1, 1]) {
    box(.65, 7.7, 1, side * 9.55, 3.8, -5.6, navy);
    box(.07, 6.5, .08, side * 9.17, 3.7, -5.03, brass);
    box(2.1, 4.2, .6, side * 11, 2, -4.6, navy);
    for (let index = 0; index < 4; index++) {
      box(.1, 3.8, .1, side * (10.2 + index * .45), 2.05, -4.21, riser);
    }
  }

  // Lightweight truss and physical light fixtures use geometry instead of animated effects.
  box(20.8, .16, .65, 0, 8.25, -5.1, riser);
  box(20.8, .12, .12, 0, 8.77, -5.1, brass);
  for (let index = 0; index < 9; index++) {
    const x = -9 + index * 2.25;
    const strut = box(.07, .65, .08, x, 8.5, -5.1, riser);
    strut.rotation.z = index % 2 ? -.65 : .65;
    const housing = mesh(new THREE.CylinderGeometry(.2, .26, .45, 16), deepNavy);
    housing.rotation.x = .28;
    housing.position.set(x, 7.91, -5.0);
    const lens = mesh(new THREE.CircleGeometry(.19, 16), warmGlow);
    lens.rotation.x = -Math.PI / 2 + .28;
    lens.position.set(x, 7.68, -4.94);
  }

  // Three quiet environmental accents give the scene scale without covering the lecture screen.
  const leafSurface = material('#638a7b');
  const planterSurface = material('#c4bcae');
  for (const side of [-1, 1]) {
    const planter = mesh(new THREE.CylinderGeometry(.48, .38, .7, 16), planterSurface);
    planter.position.set(side * 7.8, .35, -2.9);
    for (let leaf = 0; leaf < 5; leaf++) {
      const foliage = mesh(new THREE.SphereGeometry(.46, 10, 8), leafSurface);
      foliage.scale.set(.5, 1.6, .5);
      foliage.rotation.z = (leaf - 2) * .3;
      foliage.position.set(side * 7.8 + (leaf - 2) * .13, 1.0 + Math.abs(leaf - 2) * -.07, -2.9);
    }
  }

  const cushionGeometry = new THREE.CylinderGeometry(.37, .39, .24, 24);
  const pedestalGeometry = new THREE.CylinderGeometry(.32, .28, .32, 20);
  const shadowGeometry = new THREE.CircleGeometry(.55, 20);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#17223c', opacity: .14, transparent: true, depthWrite: false });
  materials.add(shadowMaterial);
  scene.add(seating);

  function project(point: THREE.Vector3) {
    const value = point.clone().project(camera);
    return { x: (value.x + 1) / 2, y: (1 - value.y) / 2 };
  }
  function render() {
    if (!disposed) renderer.render(scene, camera);
  }
  function layout(capacity: number): AuditoriumAnchor[] {
    if (capacity !== currentCapacity) {
      currentCapacity = capacity;
      seating.clear();
      anchorPoints.length = 0;
      const columns = capacity / 5;
      const half = columns / 2;
      for (let index = 0; index < capacity; index++) {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const angle = column < half
          ? -ARC + (ARC - AISLE - .04) * column / Math.max(1, half - 1)
          : AISLE + .04 + (ARC - AISLE - .04) * (column - half) / Math.max(1, half - 1);
        const radius = 4.6 + row * 1.6;
        const x = Math.sin(angle) * radius;
        const z = STAGE_Z + Math.cos(angle) * radius;
        const y = row * .32 + .23;
        const shadow = mesh(shadowGeometry, shadowMaterial, seating);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(x, y + .004, z);
        const pedestal = mesh(pedestalGeometry, row % 2 ? sage : riser, seating);
        pedestal.position.set(x, y + .16, z);
        const cushion = mesh(cushionGeometry, row % 2 ? upholsteryLight : upholstery, seating);
        cushion.position.set(x, y + .4, z);
        anchorPoints.push({ point: new THREE.Vector3(x, y + .87, z), row });
      }
    }
    render();
    const scale = (capacity <= 20 ? 1.30 : capacity <= 30 ? 1.08 : .88) / VIEW_WIDTH;
    return anchorPoints.map(({ point, row }) => ({ ...project(point), row, scale }));
  }

  function screenBounds(): AuditoriumScreenBounds {
    const upperLeft = project(new THREE.Vector3(-SCREEN_WIDTH / 2, SCREEN_TOP, SCREEN_Z));
    const lowerRight = project(new THREE.Vector3(SCREEN_WIDTH / 2, SCREEN_BOTTOM, SCREEN_Z));
    return { left: upperLeft.x, top: upperLeft.y, width: lowerRight.x - upperLeft.x, height: lowerRight.y - upperLeft.y };
  }
  function resize(width: number, height: number) {
    if (disposed || width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const geometry of geometries) geometry.dispose();
    for (const surface of materials) surface.dispose();
    seating.clear();
    scene.clear();
    renderer.dispose();
  }

  resize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight));
  return { resize, layout, screenBounds, dispose };
}

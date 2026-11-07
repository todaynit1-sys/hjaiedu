import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { AUDITORIUM_SCREEN, auditoriumSeat } from '../lib/auditorium';

export type AuditoriumAnchor = { x: number; y: number; scale: number; row: number };
export type AuditoriumScreenBounds = { left: number; top: number; width: number; height: number };
export type AuditoriumWorld = {
  resize(width: number, height: number): void;
  layout(capacity: number): AuditoriumAnchor[];
  screenBounds(): AuditoriumScreenBounds;
  dispose(): void;
};

const BACK_WALL_Z = -8.9;
const CHAIR_ANCHOR_HEIGHT = 1.48;
const SEAT_BACK_DEPTH = .28;
const WALL_SLOPE = .16;
const CAMERA_ASPECT = 1.6;
const WOOD_TONES = ['#e0b18a', '#e5ba92', '#e8be97', '#e3b48c', '#ecc49e', '#dfaf84'];

type BoxPlacement = {
  width: number; height: number; depth: number;
  x: number; y: number; z: number;
  color?: string;
};

/** A fixed camera keeps furniture and accessible HTML overlays in one coordinate system. */
export function createAuditoriumWorld(canvas: HTMLCanvasElement): AuditoriumWorld {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d6e5f0');
  const camera = new THREE.PerspectiveCamera(38, CAMERA_ASPECT, .1, 100);
  camera.position.set(0, 18, 18);
  camera.lookAt(0, 1.8, -1);
  camera.updateMatrixWorld();

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const seating = new THREE.Group();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const roundedBox = new RoundedBoxGeometry(1, 1, 1, 1, .16);
  geometries.add(unitBox);
  geometries.add(roundedBox);
  scene.add(seating);
  const floorAnchorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CHAIR_ANCHOR_HEIGHT);
  let anchors: AuditoriumAnchor[] = [];
  let disposed = false;

  function matte(color: string, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .84, ...options });
    materials.add(material);
    return material;
  }
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = scene) {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    parent.add(object);
    return object;
  }
  function box(width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = scene) {
    const object = mesh(unitBox, material, parent);
    object.scale.set(width, height, depth);
    object.position.set(x, y, z);
    return object;
  }
  function boxes(placements: BoxPlacement[], material: THREE.Material, parent: THREE.Object3D = scene, geometry: THREE.BufferGeometry = unitBox) {
    const instances = new THREE.InstancedMesh(geometry, material, placements.length);
    const transform = new THREE.Object3D();
    placements.forEach(({ width, height, depth, x, y, z, color }, index) => {
      transform.position.set(x, y, z);
      transform.scale.set(width, height, depth);
      transform.updateMatrix();
      instances.setMatrixAt(index, transform.matrix);
      if (color) instances.setColorAt(index, new THREE.Color(color));
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    parent.add(instances);
  }
  function flatPolygon(points: THREE.Vector3[], material: THREE.Material) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    return mesh(geometry, material);
  }
  function fromScreen(x: number, y: number, plane: THREE.Plane) {
    const direction = new THREE.Vector3(x * 2 - 1, 1 - y * 2, .5).unproject(camera).sub(camera.position).normalize();
    return new THREE.Ray(camera.position, direction).intersectPlane(plane, new THREE.Vector3())!;
  }
  function screenQuad(left: number, top: number, width: number, height: number, z: number, material: THREE.Material) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z);
    return flatPolygon([
      fromScreen(left, top + height, plane),
      fromScreen(left + width, top + height, plane),
      fromScreen(left + width, top, plane),
      fromScreen(left, top, plane)
    ], material);
  }

  const powderBlue = matte('#acc6de');
  const lowerWall = matte('#839fbd');
  const frontWall = matte('#d6e4ed', { emissive: '#a7becc', emissiveIntensity: .26 });
  const ivory = matte('#f6e8ce');
  const maple = matte('#d79e6a');
  const mapleEdge = matte('#be8657');
  const frameWood = matte('#a8744e');
  const blueFabric = matte('#5b8bbd');
  const blueEdge = matte('#3e6b9b');
  const steel = matte('#576a7b');
  const chalkGreen = matte('#234e43', { emissive: '#172f2a', emissiveIntensity: .22 });
  const terraCotta = matte('#d4aa80');
  const leaves = [matte('#5e946b'), matte('#75a56b'), matte('#8eb479')];
  const oak = matte('#ffffff');
  const glassSky = matte('#8ec6ec', { emissive: '#71a4d2', emissiveIntensity: .46 });
  const glassGarden = matte('#b7d8b3', { emissive: '#8fba90', emissiveIntensity: .37 });
  const sunlight = new THREE.MeshBasicMaterial({
    color: '#fff0cf', transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide
  });
  materials.add(sunlight);
  const furnitureShadow = new THREE.MeshBasicMaterial({
    color: '#705745', transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide
  });
  materials.add(furnitureShadow);

  scene.add(new THREE.HemisphereLight('#fff7e9', '#b2a6a0', 2.25));
  const sun = new THREE.DirectionalLight('#fff1d9', 2.65);
  sun.position.set(-13, 13, 2);
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#d9ebff', .85);
  fill.position.set(13, 8, -7);
  scene.add(fill);

  box(33, .22, 29, 0, -.12, 3.8, mapleEdge);
  const planks: BoxPlacement[] = [];
  for (let strip = 0; strip < 53; strip++) {
    const offset = (strip % 3) * 1.05;
    for (let plank = 0; plank < 12; plank++) {
      planks.push({
        width: 3.12, height: .036, depth: .46,
        x: -18.6 + plank * 3.15 + offset, y: -.009, z: -9.8 + strip * .475,
        color: WOOD_TONES[(strip * 11 + plank * 5 + Math.floor(plank / 3)) % WOOD_TONES.length]
      });
    }
  }
  boxes(planks, oak);

  box(31, 9.6, .26, 0, 4.8, BACK_WALL_Z - .23, frontWall);
  box(30.8, 1.55, .10, 0, .77, BACK_WALL_Z - .035, powderBlue);
  box(30.8, .13, .14, 0, 1.55, BACK_WALL_Z + .02, ivory);
  box(30.8, .12, .15, 0, .12, BACK_WALL_Z + .015, lowerWall);

  // A shallow maple platform sits below the live HTML chalkboard.
  box(23.9, .3, 2.7, 0, .15, -7.27, mapleEdge);
  box(24.0, .09, 2.76, 0, .335, -7.27, maple);
  box(24.05, .10, .16, 0, .274, -5.92, frameWood);
  box(20.4, .15, .44, 0, .075, -5.79, mapleEdge);
  const screen = AUDITORIUM_SCREEN;
  screenQuad(screen.left - .008, screen.top - .012, screen.width + .016, screen.height + .024, BACK_WALL_Z + .10, frameWood);
  screenQuad(screen.left - .003, screen.top - .005, screen.width + .006, screen.height + .010, BACK_WALL_Z + .13, mapleEdge);
  screenQuad(screen.left, screen.top, screen.width, screen.height, BACK_WALL_Z + .17, chalkGreen);

  const books: BoxPlacement[] = [];
  const bookTones = ['#b69cc7', '#e1a791', '#7aa99e', '#7799bd', '#e4bc77'];
  for (const side of [-1, 1]) {
    const x = side * 11.35;
    const z = -8.35;
    box(1.59, 2.74, .14, x, 1.73, z - .23, frameWood);
    for (const edge of [-.75, .75]) box(.13, 2.78, .47, x + edge, 1.75, z, mapleEdge);
    for (let shelf = 0; shelf < 4; shelf++) {
      const y = .42 + shelf * .88;
      box(1.62, .13, .53, x, y, z + .03, maple);
      if (shelf === 3) continue;
      for (let book = 0; book < 6; book++) {
        const height = .41 + (book * 3 + shelf) % 5 * .046;
        books.push({ width: .14, height, depth: .26, x: x - .53 + book * .193, y: y + .065 + height / 2,
          z: z + .11, color: bookTones[(book + shelf + (side > 0 ? 2 : 0)) % bookTones.length] });
      }
    }
  }
  boxes(books, oak);

  function wallX(side: number, z: number) {
    return side * (13.35 - WALL_SLOPE * (z + 4));
  }
  function sideWall(side: number) {
    const back = -9.02;
    const front = 12.5;
    const center = (back + front) / 2;
    const length = Math.hypot(front - back, wallX(side, front) - wallX(side, back));
    const wall = new THREE.Group();
    wall.position.set(wallX(side, center), 0, center);
    wall.rotation.y = Math.atan2(wallX(side, front) - wallX(side, back), front - back);
    scene.add(wall);
    const interior = -side;
    box(.24, 8.8, length, 0, 4.4, 0, powderBlue, wall);
    box(.12, 1.63, length, interior * .12, .815, 0, lowerWall, wall);
    box(.15, .11, length, interior * .18, 1.67, 0, ivory, wall);
    box(.18, .14, length, interior * .19, .13, 0, ivory, wall);

    const bayWidth = 3.32;
    for (let bay = 0; bay < 5; bay++) {
      const z = -8.15 + bay * 4.04;
      box(.15, 5.7, bayWidth + .17, interior * .15, 4.61, z, frameWood, wall);
      box(.08, 3.65, bayWidth, interior * .24, 5.49, z, glassSky, wall);
      box(.08, 1.92, bayWidth, interior * .24, 2.72, z, glassGarden, wall);
      for (const offset of [-bayWidth / 2, 0, bayWidth / 2]) {
        box(.17, 5.72, .10, interior * .29, 4.61, z + offset, ivory, wall);
      }
      for (const y of [1.78, 3.67, 5.54, 7.45]) {
        box(.17, .10, bayWidth + .1, interior * .29, y, z, ivory, wall);
      }
      box(.52, .13, bayWidth + .33, interior * .37, 1.77, z, maple, wall);
    }
  }
  for (const side of [-1, 1]) {
    sideWall(side);
    for (let bay = 0; bay < 5; bay++) {
      const front = -6.5 + bay * 3.7;
      for (let pane = 0; pane < 2; pane++) {
        const z = front + pane * 1.46;
        const edge = wallX(side, z) - side * .45;
        flatPolygon([
          new THREE.Vector3(edge, .014, z),
          new THREE.Vector3(edge - side * 5.25, .014, z + 3.55),
          new THREE.Vector3(edge - side * 5.25, .014, z + 4.65),
          new THREE.Vector3(edge, .014, z + 1.10)
        ], sunlight);
      }
    }
  }

  const potGeometry = new THREE.CylinderGeometry(.46, .34, .67, 14);
  const leafGeometry = new THREE.SphereGeometry(.46, 10, 8);
  for (const [x, z] of [[-11.5, -7.15], [11.5, -7.15], [-10.6, 4.9], [10.6, 4.9]]) {
    const platform = z < -6 ? .38 : 0;
    const planter = mesh(potGeometry, terraCotta);
    planter.position.set(x, .34 + platform, z);
    for (let index = 0; index < 6; index++) {
      const angle = index * Math.PI / 3;
      const foliage = mesh(leafGeometry, leaves[index % leaves.length]);
      foliage.position.set(x + Math.cos(angle) * .33, .84 + platform + (index % 3) * .19, z + Math.sin(angle) * .33);
      foliage.scale.set(.52, 1.13, .43);
      foliage.rotation.z = Math.cos(angle) * .58;
      foliage.rotation.x = Math.sin(angle) * .43;
    }
  }

  function render() {
    if (!disposed) renderer.render(scene, camera);
  }
  function clearSeating() {
    for (const object of seating.children) {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    }
    seating.clear();
  }
  function layout(capacity: number): AuditoriumAnchor[] {
    if (capacity === anchors.length) return anchors;
    clearSeating();
    const columns = capacity / 5;
    const scale = capacity <= 20 ? .065 : capacity <= 30 ? .055 : .046;
    const points = Array.from({ length: capacity }, (_, index) => auditoriumSeat(index, capacity));
    anchors = points.map(point => ({ ...point, scale }));
    const locations = points.map(({ x, y }) => fromScreen(x, y, floorAnchorPlane));
    const desks: BoxPlacement[] = [];
    const deskAprons: BoxPlacement[] = [];
    const legs: BoxPlacement[] = [];
    const chairPads: BoxPlacement[] = [];
    const chairEdges: BoxPlacement[] = [];
    const shadows: BoxPlacement[] = [];

    locations.forEach(({ x, z }, index) => {
      const column = index % columns;
      const sideEnd = column === columns / 2 - 1 || column === columns - 1;
      const neighbor = locations[index + (sideEnd ? -1 : 1)];
      const width = Math.min(2.12, Math.abs(x - neighbor.x) * .88);
      const deskZ = z - .90;
      const deskDepth = .95;
      shadows.push({ width: width * .97, height: .014, depth: 1.94, x: x + .08, y: .009, z: z - .47 });
      desks.push({ width, height: .16, depth: deskDepth, x, y: 1.20, z: deskZ });
      deskAprons.push({ width: width - .12, height: .19, depth: .19, x, y: 1.06, z: deskZ + .32 });
      for (const legX of [-1, 1]) for (const legZ of [-1, 1]) {
        legs.push({ width: .14, height: 1.10, depth: .14, x: x + legX * (width / 2 - .14), y: .56, z: deskZ + legZ * .34 });
        legs.push({ width: .095, height: .55, depth: .095, x: x + legX * .34, y: .28, z: z + legZ * .29 });
      }
      legs.push({ width: .11, height: .64, depth: .11, x: x - .37, y: .83, z: z + SEAT_BACK_DEPTH });
      legs.push({ width: .11, height: .64, depth: .11, x: x + .37, y: .83, z: z + SEAT_BACK_DEPTH });
      chairEdges.push({ width: .90, height: .12, depth: .71, x, y: .59, z });
      chairPads.push({ width: .86, height: .11, depth: .68, x, y: .69, z });
      chairEdges.push({ width: .89, height: .58, depth: .16, x, y: 1.02, z: z + SEAT_BACK_DEPTH });
      chairPads.push({ width: .82, height: .49, depth: .19, x, y: 1.06, z: z + SEAT_BACK_DEPTH });
    });
    boxes(shadows, furnitureShadow, seating);
    boxes(desks, maple, seating, roundedBox);
    boxes(deskAprons, mapleEdge, seating);
    boxes(legs, steel, seating);
    boxes(chairEdges, blueEdge, seating, roundedBox);
    boxes(chairPads, blueFabric, seating, roundedBox);
    render();
    return anchors;
  }

  function resize(width: number, height: number) {
    if (disposed || width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearSeating();
    scene.traverse(object => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    scene.clear();
    renderer.dispose();
  }

  resize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight));
  return { resize, layout, screenBounds: () => AUDITORIUM_SCREEN, dispose };
}

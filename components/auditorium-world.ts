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
  pitch?: number;
  roll?: number;
};

function paintWood(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = '#fbf7f1';
  context.fillRect(0, 0, width, height);
  let seed = 1841;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let line = 0; line < 112; line++) {
    const y = next() * height;
    const bend = (next() - .5) * 16;
    context.beginPath();
    context.moveTo(-12, y);
    context.bezierCurveTo(width * .30, y + bend, width * .63, y - bend, width + 12, y + bend / 3);
    context.lineWidth = .35 + next() * 2.1;
    context.strokeStyle = `rgba(111, 74, 50, ${.02 + next() * .13})`;
    context.stroke();
  }
  context.strokeStyle = '#9465442c';
  for (const [x, y] of [[width * .27, height * .29], [width * .73, height * .76]]) {
    for (let ring = 1; ring <= 3; ring++) {
      context.beginPath();
      context.ellipse(x, y, ring * 9, ring * 1.7, -.11, 0, Math.PI * 2);
      context.stroke();
    }
  }
}

function paintLinen(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = '#f7f7f5';
  context.fillRect(0, 0, width, height);
  for (let y = 0; y < height; y += 2) {
    context.fillStyle = y % 6 === 0 ? '#97a1ac37' : '#ffffff7b';
    context.fillRect(0, y, width, 1);
  }
  for (let x = 0; x < width; x += 3) {
    context.fillStyle = x % 9 === 0 ? '#64738639' : '#ffffff58';
    context.fillRect(x, 0, 1, height);
  }
}

function paintGarden(context: CanvasRenderingContext2D, width: number, height: number) {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#88c8eb');
  sky.addColorStop(.62, '#d6edf0');
  sky.addColorStop(1, '#f7e9bc');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#ffffffb0';
  for (const [x, y, radius] of [[.22, .23, .13], [.74, .31, .11], [.49, .15, .075]]) {
    context.beginPath();
    context.ellipse(x * width, y * height, radius * width, radius * width * .42, 0, 0, Math.PI * 2);
    context.ellipse((x + radius * .52) * width, (y + .017) * height, radius * width, radius * width * .32, 0, 0, Math.PI * 2);
    context.fill();
  }
  ['#a5c9aa', '#b6d3a5', '#86b493', '#a1c482'].forEach((color, index) => {
    const y = height * (.55 + index * .12);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(width * .22, y - 78, width * .36, y + 40, width * .54, y - 17);
    context.bezierCurveTo(width * .69, y - 49, width * .84, y - 32, width, y - 8);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.fill();
  });
}

function paintShadow(context: CanvasRenderingContext2D, width: number, height: number) {
  const shade = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
  shade.addColorStop(0, '#51382973');
  shade.addColorStop(.57, '#51382937');
  shade.addColorStop(1, '#51382900');
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
}

function paintSconceGlow(context: CanvasRenderingContext2D, width: number, height: number) {
  const light = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
  light.addColorStop(0, '#ffce7887');
  light.addColorStop(.44, '#ffd48d4f');
  light.addColorStop(1, '#ffd48d00');
  context.fillStyle = light;
  context.fillRect(0, 0, width, height);
}

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
  const textures = new Set<THREE.CanvasTexture>();
  const seating = new THREE.Group();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const roundedBox = new RoundedBoxGeometry(1, 1, 1, 1, .16);
  const shadowPlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  geometries.add(unitBox);
  geometries.add(roundedBox);
  geometries.add(shadowPlane);
  scene.add(seating);
  const floorAnchorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CHAIR_ANCHOR_HEIGHT);
  let anchors: AuditoriumAnchor[] = [];
  let disposed = false;

  function matte(color: string, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .84, ...options });
    materials.add(material);
    return material;
  }
  function paintedTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D, width: number, height: number) => void) {
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    const context = surface.getContext('2d');
    if (!context) return null;
    paint(context, width, height);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.add(texture);
    return texture;
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
  function instances(placements: BoxPlacement[], material: THREE.Material, parent: THREE.Object3D = scene, geometry: THREE.BufferGeometry = unitBox) {
    const instances = new THREE.InstancedMesh(geometry, material, placements.length);
    const transform = new THREE.Object3D();
    placements.forEach(({ width, height, depth, x, y, z, color, pitch = 0, roll = 0 }, index) => {
      transform.position.set(x, y, z);
      transform.scale.set(width, height, depth);
      transform.rotation.set(pitch, 0, roll);
      transform.updateMatrix();
      instances.setMatrixAt(index, transform.matrix);
      if (color) instances.setColorAt(index, new THREE.Color(color));
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    parent.add(instances);
    return instances;
  }
  function quadMesh(quads: THREE.Vector3[][], material: THREE.Material) {
    const geometry = new THREE.BufferGeometry().setFromPoints(quads.flat());
    geometry.setIndex(quads.flatMap((_, index) => {
      const start = index * 4;
      return [start, start + 1, start + 2, start, start + 2, start + 3];
    }));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(quads.flatMap(() => [0, 0, 1, 0, 1, 1, 0, 1]), 2));
    geometry.computeVertexNormals();
    return mesh(geometry, material);
  }
  function fromScreen(x: number, y: number, plane: THREE.Plane) {
    const direction = new THREE.Vector3(x * 2 - 1, 1 - y * 2, .5).unproject(camera).sub(camera.position).normalize();
    return new THREE.Ray(camera.position, direction).intersectPlane(plane, new THREE.Vector3())!;
  }
  function screenQuad(left: number, top: number, width: number, height: number, z: number, material: THREE.Material) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z);
    return quadMesh([[
      fromScreen(left, top + height, plane),
      fromScreen(left + width, top + height, plane),
      fromScreen(left + width, top, plane),
      fromScreen(left, top, plane)
    ]], material);
  }

  const woodGrain = paintedTexture(384, 128, paintWood);
  const wovenLinen = paintedTexture(96, 96, paintLinen);
  const garden = paintedTexture(256, 384, paintGarden);
  const contactShade = paintedTexture(64, 64, paintShadow);
  const sconceGlow = paintedTexture(64, 64, paintSconceGlow);
  const powderBlue = matte('#9dbbe2');
  const lowerWall = matte('#7798c8');
  const frontWall = matte('#c5d3e7', { emissive: '#91acce', emissiveIntensity: .20 });
  const ivory = matte('#fff4dc');
  const curtainLinen = matte('#fff0d2', { map: wovenLinen, side: THREE.DoubleSide });
  const maple = matte('#e4a86e', { map: woodGrain });
  const mapleEdge = matte('#be8356', { map: woodGrain });
  const frameWood = matte('#915e43', { map: woodGrain });
  const stageMaple = matte('#c48b64', { map: woodGrain });
  const blueFabric = matte('#5687bd', { map: wovenLinen });
  const blueEdge = matte('#3f6b9d');
  const steel = matte('#65717c');
  const chalkGreen = matte('#234e43', { emissive: '#172f2a', emissiveIntensity: .22 });
  const terraCotta = matte('#eee0cb');
  const oak = matte('#ffffff', { map: woodGrain });
  const untinted = matte('#ffffff');
  const glass = new THREE.MeshBasicMaterial({ map: garden, color: '#e7f3ff' });
  materials.add(glass);
  const sunlight = new THREE.MeshBasicMaterial({
    color: '#fff1c5', transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  });
  materials.add(sunlight);
  const furnitureShadow = new THREE.MeshBasicMaterial({
    map: contactShade, transparent: true, opacity: contactShade ? .69 : 0, depthWrite: false, toneMapped: false
  });
  materials.add(furnitureShadow);
  const halo = new THREE.MeshBasicMaterial({
    map: sconceGlow, transparent: true, opacity: sconceGlow ? .8 : 0, depthWrite: false, toneMapped: false
  });
  materials.add(halo);

  scene.add(new THREE.HemisphereLight('#fff6e7', '#99abc3', 2.12));
  const sun = new THREE.DirectionalLight('#fff0d5', 2.75);
  sun.position.set(-12, 15, 7);
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
  instances(planks, oak);

  box(31, 9.6, .26, 0, 4.8, BACK_WALL_Z - .23, frontWall);
  box(30.8, 1.55, .10, 0, .77, BACK_WALL_Z - .035, powderBlue);
  box(30.8, .13, .14, 0, 1.55, BACK_WALL_Z + .02, ivory);
  box(30.8, .12, .15, 0, .12, BACK_WALL_Z + .015, lowerWall);

  // A shallow maple platform sits below the live HTML chalkboard.
  box(23.9, .31, 2.72, 0, .155, -7.27, frameWood);
  const stagePlanks = Array.from({ length: 6 }, (_, row) => Array.from({ length: 8 }, (_, column) => ({
    width: 2.98, height: .075, depth: .445,
    x: (column - 3.5) * 3, y: .348, z: -8.408 + row * .45,
    color: ['#d3a781', '#d9aa86', '#d8ab80', '#cfa17a'][(column + row * 3) % 4]
  }))).flat();
  instances(stagePlanks, oak);
  box(24.02, .075, .14, 0, .34, -5.91, mapleEdge);
  box(24.05, .14, .11, 0, .223, -5.865, stageMaple);
  box(21.3, .16, .53, 0, .08, -5.67, frameWood);
  box(21.35, .045, .57, 0, .178, -5.67, stageMaple);
  box(18.8, .05, .44, 0, .025, -5.24, mapleEdge);
  const screen = AUDITORIUM_SCREEN;
  screenQuad(screen.left - .008, screen.top - .012, screen.width + .016, screen.height + .024, BACK_WALL_Z + .10, frameWood);
  screenQuad(screen.left - .003, screen.top - .005, screen.width + .006, screen.height + .010, BACK_WALL_Z + .13, mapleEdge);
  screenQuad(screen.left, screen.top, screen.width, screen.height, BACK_WALL_Z + .17, chalkGreen);
  const boardPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(BACK_WALL_Z + .17));
  const boardBottom = fromScreen(screen.left, screen.top + screen.height, boardPlane);
  const railY = boardBottom.y - .095;
  box(Math.abs(boardBottom.x) * 2 + .41, .12, .28, 0, railY, BACK_WALL_Z + .35, frameWood);
  box(Math.abs(boardBottom.x) * 2 + .28, .042, .31, 0, railY + .064, BACK_WALL_Z + .36, mapleEdge);
  const eraser = box(.63, .125, .18, -6.13, railY + .15, BACK_WALL_Z + .39, maple);
  eraser.rotation.y = -.04;
  const chalkTones = [matte('#fff6df'), matte('#e8ca76'), matte('#b7ceee')];
  for (const [index, x] of [5.7, 6.2, -5.37].entries()) {
    const chalk = mesh(roundedBox, chalkTones[index]);
    chalk.position.set(x, railY + .116, BACK_WALL_Z + .42);
    chalk.scale.set(.28, .056, .061);
  }

  const books: BoxPlacement[] = [];
  const bookTones = ['#b69cc7', '#e1a791', '#7aa99e', '#7799bd', '#e4bc77'];
  for (const side of [-1, 1]) {
    const x = side * 11.35;
    const z = -8.35;
    box(1.77, 3.65, .16, x, 2.19, z - .23, frameWood);
    for (const edge of [-.85, .85]) box(.14, 3.69, .57, x + edge, 2.21, z, stageMaple);
    for (const edge of [-.41, .41]) {
      box(.77, .91, .086, x + edge, .89, z + .285, mapleEdge);
      box(.59, .69, .027, x + edge, .89, z + .341, stageMaple);
      box(.055, .16, .076, x + edge * .36, .95, z + .391, ivory);
    }
    box(1.89, .16, .67, x, 4.08, z + .045, mapleEdge);
    for (let shelf = 0; shelf < 3; shelf++) {
      const y = 1.40 + shelf * .86;
      box(1.78, .13, .57, x, y, z + .06, maple);
      for (let book = 0; book < 6; book++) {
        const height = .41 + (book * 3 + shelf) % 5 * .046;
        books.push({ width: .145 + book % 3 * .019, height, depth: .28, x: x - .61 + book * .219, y: y + .065 + height / 2,
          z: z + .11, color: bookTones[(book + shelf + (side > 0 ? 2 : 0)) % bookTones.length] });
      }
    }
  }
  instances(books, untinted);

  // Brass sconces frame the board and tint the timber around the bookshelves.
  const lampGlow = matte('#ffd17a', { emissive: '#ffa33d', emissiveIntensity: .87 });
  const brass = matte('#a8794d', { roughness: .53, metalness: .23 });
  const haloPlane = new THREE.PlaneGeometry(2.25, 2.63);
  for (const side of [-1, 1]) {
    const x = side * 13.04;
    const light = mesh(haloPlane, halo);
    light.position.set(x, 4.04, BACK_WALL_Z - .045);
    box(.35, .81, .17, x, 4.04, BACK_WALL_Z + .19, frameWood);
    box(.18, .24, .36, x, 4.36, BACK_WALL_Z + .35, brass);
    box(.42, .67, .35, x, 4.02, BACK_WALL_Z + .50, lampGlow);
    for (const edge of [-1, 1]) {
      box(.49, .085, .39, x, 4.02 + edge * .37, BACK_WALL_Z + .50, brass);
      box(.048, .72, .053, x + edge * .212, 4.02, BACK_WALL_Z + .686, brass);
    }
  }

  const curtainPoints: number[] = [];
  const curtainUvs: number[] = [];
  const curtainFaces: number[] = [];
  const curtainColumns = 12;
  const curtainRows = 9;
  for (let row = 0; row <= curtainRows; row++) {
    const vertical = row / curtainRows;
    const width = .25 + .53 * Math.abs(vertical - .69) / .69;
    for (let column = 0; column <= curtainColumns; column++) {
      const horizontal = column / curtainColumns;
      curtainPoints.push(.075 + Math.sin(horizontal * 7 * Math.PI) * (.07 + .035 * vertical), -vertical * 5.59, width * horizontal);
      curtainUvs.push(horizontal, 1 - vertical);
      if (column < curtainColumns && row < curtainRows) {
        const index = row * (curtainColumns + 1) + column;
        curtainFaces.push(index, index + 1, index + curtainColumns + 2, index, index + curtainColumns + 2, index + curtainColumns + 1);
      }
    }
  }
  const curtain = new THREE.BufferGeometry();
  curtain.setAttribute('position', new THREE.Float32BufferAttribute(curtainPoints, 3));
  curtain.setAttribute('uv', new THREE.Float32BufferAttribute(curtainUvs, 2));
  curtain.setIndex(curtainFaces);
  curtain.computeVertexNormals();

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
    instances(Array.from({ length: 19 }, (_, index) => ({
      width: .025, height: 1.43, depth: .035,
      x: interior * .19, y: .87, z: (index - 9) * 1.08
    })), powderBlue, wall);

    const bayWidth = 3.32;
    for (let bay = 0; bay < 5; bay++) {
      const z = -8.15 + bay * 4.04;
      box(.16, 5.76, bayWidth + .22, interior * .16, 4.61, z, frameWood, wall);
      box(.08, 5.63, bayWidth, interior * .24, 4.61, z, glass, wall);
      for (const offset of [-bayWidth / 2, 0, bayWidth / 2]) {
        box(.17, 5.72, .094, interior * .29, 4.61, z + offset, mapleEdge, wall);
        box(.022, 5.72, .031, interior * .384, 4.61, z + offset, ivory, wall);
      }
      for (const y of [1.78, 3.67, 5.54, 7.45]) {
        box(.17, .106, bayWidth + .1, interior * .29, y, z, mapleEdge, wall);
        box(.026, .035, bayWidth + .1, interior * .38, y + .038, z, ivory, wall);
      }
      box(.52, .13, bayWidth + .33, interior * .37, 1.77, z, maple, wall);
      box(.069, .074, bayWidth + .59, interior * .49, 7.59, z, brass, wall);
      for (const edge of [-1, 1]) {
        const textile = mesh(curtain, curtainLinen, wall);
        textile.position.set(interior * .43, 7.54, z + edge * (bayWidth / 2 + .12));
        textile.scale.set(interior, 1, -edge);
        box(.16, .092, .34, interior * .516, 3.66, z + edge * (bayWidth / 2 - .026), mapleEdge, wall);
      }
    }
  }
  const lightPatches: THREE.Vector3[][] = [];
  for (const side of [-1, 1]) {
    sideWall(side);
    for (let bay = 0; bay < 5; bay++) {
      const front = -7.9 + bay * 3.91;
      for (let column = 0; column < 2; column++) for (let row = 0; row < 3; row++) {
        const z = front + column * 1.43;
        const height = 1.58 + row * 1.64;
        const point = (windowHeight: number, windowZ: number) => new THREE.Vector3(
          wallX(side, windowZ) - side * (.37 + windowHeight * 1.04),
          .014, windowZ + windowHeight * .52
        );
        lightPatches.push([point(height, z), point(height + 1.46, z), point(height + 1.46, z + 1.30), point(height, z + 1.30)]);
      }
    }
    for (let row = 0; row < 3; row++) for (let column = 0; column < 2; column++) {
      const x = side * (10.9 - column * 1.98 - row * .39);
      const z = -8.44 + row * .73;
      lightPatches.push([
        new THREE.Vector3(x, .391, z),
        new THREE.Vector3(x - side * 1.83, .391, z + .11),
        new THREE.Vector3(x - side * 2.18, .391, z + .71),
        new THREE.Vector3(x - side * .35, .391, z + .60)
      ]);
    }
  }
  quadMesh(lightPatches, sunlight).renderOrder = 1;

  const potGeometry = new THREE.CylinderGeometry(.46, .34, .67, 16);
  const potRimGeometry = new THREE.CylinderGeometry(.47, .46, .10, 16);
  const leafGeometry = new THREE.SphereGeometry(.46, 9, 7);
  geometries.add(leafGeometry);
  const foliage: BoxPlacement[] = [];
  const petals: BoxPlacement[] = [];
  const stamens: BoxPlacement[] = [];
  const leafTones = ['#4c8559', '#6aa061', '#83ae64', '#9db96d'];
  for (const [x, z, platform, scale, flowers] of [
    [-11.45, -6.67, .38, 1.16, 7], [11.45, -6.67, .38, 1.16, 7],
    [-11.35, -8.37, 4.17, .72, 0], [11.35, -8.37, 4.17, .72, 0],
    [-10.62, 4.9, 0, 1.18, 4], [10.62, 4.9, 0, 1.18, 4]
  ]) {
    const planter = mesh(potGeometry, terraCotta);
    planter.position.set(x, platform + .34 * scale, z);
    planter.scale.setScalar(scale);
    const rim = mesh(potRimGeometry, ivory);
    rim.position.set(x, platform + .65 * scale, z);
    rim.scale.setScalar(scale);
    for (let index = 0; index < 13; index++) {
      const angle = index * 2.39996;
      const reach = (.23 + (index % 3) * .10) * scale;
      foliage.push({
        width: (.42 + (index % 3) * .07) * scale, height: (.79 + (index % 5) * .09) * scale, depth: .25 * scale,
        x: x + Math.cos(angle) * reach, y: platform + (1.0 + index % 5 * .135) * scale, z: z + Math.sin(angle) * reach,
        pitch: Math.sin(angle) * .81, roll: -Math.cos(angle) * .83, color: leafTones[index % leafTones.length]
      });
    }
    for (let index = 0; index < flowers; index++) {
      const angle = index * 2.39996;
      const centerX = x + Math.cos(angle) * (.27 + index % 3 * .085) * scale;
      const centerY = platform + (1.52 + index % 4 * .13) * scale;
      const centerZ = z + (.18 + Math.sin(angle) * .26) * scale;
      for (let petal = 0; petal < 6; petal++) {
        const rotation = petal * Math.PI / 3;
        petals.push({
          width: .187 * scale, height: .113 * scale, depth: .083 * scale,
          x: centerX + Math.cos(rotation) * .112 * scale, y: centerY + Math.sin(rotation) * .112 * scale,
          z: centerZ, roll: rotation, color: index % 5 === 0 ? '#f9dcd4' : '#fff7df'
        });
      }
      stamens.push({ width: .138 * scale, height: .132 * scale, depth: .092 * scale,
        x: centerX, y: centerY, z: centerZ + .049 * scale });
    }
  }
  instances(foliage, untinted, scene, leafGeometry);
  instances(petals, untinted, scene, leafGeometry);
  instances(stamens, matte('#e8b34f'), scene, leafGeometry);

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
      shadows.push({ width: width * 1.26, height: 1, depth: 2.26, x: x + .08, y: .016, z: z - .47 });
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
    instances(shadows, furnitureShadow, seating, shadowPlane).renderOrder = 2;
    instances(desks, maple, seating, roundedBox);
    instances(deskAprons, mapleEdge, seating);
    instances(legs, steel, seating);
    instances(chairEdges, blueEdge, seating, roundedBox);
    instances(chairPads, blueFabric, seating, roundedBox);
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
    for (const texture of textures) texture.dispose();
    scene.clear();
    renderer.dispose();
  }

  resize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight));
  return { resize, layout, screenBounds: () => AUDITORIUM_SCREEN, dispose };
}

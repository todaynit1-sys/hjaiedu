import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { AvatarCustomization, Character } from '../lib/types';
import { avatarAppearance } from './classroom-avatar';

export type AuditoriumActorFrame = {
  id: string;
  character: Character;
  avatar?: AvatarCustomization;
  instructor?: boolean;
  x: number;
  z: number;
  scale: number;
  heading: number;
  stride: number;
  seated: boolean;
};

type Shape = 'ball' | 'head' | 'body' | 'hair' | 'lock' | 'block' | 'brim' | 'dome' | 'ring' | 'arch' | 'smile' | 'point' | 'star';
type Finish = 'skin' | 'cloth' | 'hair' | 'crown' | 'leather' | 'detail';
type Bone = 'root' | 'torso' | 'head' | 'leftArm' | 'rightArm' | 'leftForearm' | 'rightForearm' |
  'leftThigh' | 'rightThigh' | 'leftShin' | 'rightShin' | 'leftFoot' | 'rightFoot';
type Tint = string | THREE.Color;
type Pose = Record<Bone, THREE.Matrix4>;

const BONES: Bone[] = ['root', 'torso', 'head', 'leftArm', 'rightArm', 'leftForearm', 'rightForearm',
  'leftThigh', 'rightThigh', 'leftShin', 'rightShin', 'leftFoot', 'rightFoot'];
const THIGH_LENGTH = .272;
const SHIN_LENGTH = .253;
const UPPER_ARM_LENGTH = .227;
const SEATING_BLEND_MS = 150;
const SIDES = [-1, 1] as const;

type Part = {
  key: string;
  shape: Shape;
  finish: Finish;
  bone: Bone;
  local: THREE.Matrix4;
  world: THREE.Matrix4;
  tint: THREE.Color;
};
type Actor = {
  identity: string;
  parts: Part[];
  pose: Pose;
  previous?: AuditoriumActorFrame;
  sitAmount: number;
  sitFrom: number;
  sitTarget: number;
  sitStarted: number;
};
type Batch = {
  mesh: THREE.InstancedMesh;
  slots: Part[];
  colors: THREE.Color[];
  capacity: number;
  count: number;
  matrixDirty: boolean;
  colorDirty: boolean;
};

function scalpGeometry() {
  const rows = 9;
  const segments = 26;
  const points: number[] = [];
  const shade: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let segment = 0; segment <= segments; segment++) {
      const angle = segment / segments * Math.PI * 2;
      const front = Math.sin(angle);
      const rim = 1.83 - .60 * front + .056 * Math.sin(angle * 5);
      const arc = Math.max(.001, t * rim);
      const radius = 1 + .015 * Math.sin(angle * 9) * Math.sin(arc);
      points.push(Math.cos(angle) * Math.sin(arc) * radius, Math.cos(arc), front * Math.sin(arc) * radius);
      const value = .90 - t * .24 + .05 * Math.cos(angle * 8 + t * 3);
      shade.push(value, value, value);
      if (row && segment) {
        const current = row * (segments + 1) + segment;
        indices.push(current, current - 1, current - segments - 2, current, current - segments - 2, current - segments - 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function shapedBall(kind: 'head' | 'lock') {
  const geometry = new THREE.SphereGeometry(1, kind === 'head' ? 20 : 12, kind === 'head' ? 14 : 8);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index++) {
    const y = position.getY(index);
    if (kind === 'head') {
      const jaw = y < -.25 ? 1 + (y + .25) * .19 : 1;
      position.setX(index, position.getX(index) * jaw);
      position.setZ(index, position.getZ(index) * (y < 0 ? 1 + y * .09 : 1));
    } else {
      position.setX(index, position.getX(index) * (.80 + .18 * (y + 1)));
      position.setZ(index, position.getZ(index) + (1 - y) ** 2 * .125);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function starGeometry() {
  const star = new THREE.Shape();
  for (let point = 0; point < 10; point++) {
    const angle = point * Math.PI / 5 + Math.PI / 2;
    const radius = point % 2 ? .43 : 1;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  return new THREE.ExtrudeGeometry(star, {depth: .24, bevelEnabled: true, bevelThickness: .065,
    bevelSize: .075, bevelSegments: 1, steps: 1, curveSegments: 1});
}

function createGeometry(): Record<Shape, THREE.BufferGeometry> {
  const smilePath = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-.93, .19, 0),
    new THREE.Vector3(0, -.91, .10),
    new THREE.Vector3(.93, .19, 0)
  );
  return {
    ball: new THREE.SphereGeometry(1, 12, 8),
    head: shapedBall('head'),
    lock: shapedBall('lock'),
    hair: scalpGeometry(),
    body: new THREE.LatheGeometry([
      [0, -1], [.69, -1], [.92, -.90], [.96, -.54], [.89, -.10],
      [1, .50], [.93, .77], [.71, .91], [.44, 1], [0, 1]
    ].map(([x, y]) => new THREE.Vector2(x, y)), 16),
    block: new RoundedBoxGeometry(2, 2, 2, 1, .28),
    brim: new THREE.CylinderGeometry(1, 1, 2, 20),
    dome: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    ring: new THREE.TorusGeometry(1, .083, 6, 22),
    arch: new THREE.TorusGeometry(1, .063, 6, 22, Math.PI),
    smile: new THREE.TubeGeometry(smilePath, 10, .17, 5, false),
    point: new THREE.ConeGeometry(1, 2, 4),
    star: starGeometry()
  };
}

function createMaterials(): Record<Finish, THREE.MeshStandardMaterial> {
  return {
    skin: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .75}),
    cloth: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .97}),
    hair: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .84}),
    crown: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .84, vertexColors: true}),
    leather: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .66}),
    detail: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .61})
  };
}

function mix(first: Tint, second: Tint, amount: number) {
  return new THREE.Color(first).lerp(new THREE.Color(second), amount);
}

type Lock = [x: number, y: number, z: number, width: number, height: number, depth: number, tilt: number];

const FRINGES: Record<ReturnType<typeof avatarAppearance>['hair'], Lock[]> = {
  waves: [[-.282,.229,.265,.125,.222,.119,-.50],[-.170,.300,.309,.125,.188,.105,-.62],
    [-.046,.315,.325,.117,.185,.105,-.56],[.103,.306,.318,.129,.187,.107,-.39],[.251,.234,.270,.132,.207,.106,.28]],
  crop: [[-.271,.255,.264,.112,.128,.092,-.35],[-.132,.316,.309,.121,.124,.100,-.40],
    [.020,.330,.311,.118,.123,.104,-.21],[.158,.314,.290,.123,.126,.098,.27],[.282,.258,.263,.109,.125,.090,.44]],
  spiky: [[-.300,.278,.218,.120,.224,.115,-.72],[-.174,.359,.275,.129,.218,.108,-.55],
    [-.028,.400,.236,.112,.216,.113,-.30],[.120,.352,.281,.117,.203,.111,.24],[.270,.297,.246,.125,.200,.111,.58]],
  bob: [[-.276,.204,.278,.114,.189,.110,-.18],[-.153,.247,.326,.104,.176,.099,-.20],
    [-.032,.249,.344,.105,.176,.093,-.11],[.089,.249,.338,.108,.174,.099,.13],[.221,.213,.304,.131,.185,.106,.23]],
  bun: [[-.271,.251,.280,.124,.176,.109,-.55],[-.127,.318,.302,.135,.175,.105,-.68],
    [.047,.323,.309,.139,.171,.105,.60],[.229,.246,.288,.133,.177,.105,.48]],
  curls: [[-.295,.210,.289,.129,.144,.105,-.37],[-.215,.302,.312,.128,.139,.110,-.40],
    [-.093,.337,.319,.129,.143,.110,-.26],[.052,.320,.346,.129,.132,.111,.14],[.193,.304,.317,.125,.144,.109,.32],[.289,.220,.275,.116,.147,.110,.42]],
  part: [[-.268,.231,.277,.125,.203,.105,-.56],[-.143,.322,.298,.134,.183,.111,-.70],
    [.022,.342,.314,.141,.180,.111,.79],[.172,.274,.321,.139,.200,.101,.60],[.279,.203,.251,.119,.182,.107,.38]],
  long: [[-.291,.178,.259,.122,.230,.115,-.18],[-.160,.286,.322,.124,.186,.103,-.61],
    [-.013,.326,.316,.126,.172,.105,.47],[.146,.281,.330,.129,.194,.102,.39],[.267,.198,.281,.120,.212,.105,.24]]
};

function actorParts(frame: AuditoriumActorFrame) {
  const appearance = avatarAppearance(frame.character, frame.avatar, Boolean(frame.instructor));
  const parts: Part[] = [];
  const transform = new THREE.Object3D();
  const skin = mix(appearance.skin, appearance.skinShade, .07);
  const warmSkin = mix(appearance.skin, appearance.skinShade, .37);
  const blush = mix(appearance.skinShade, '#eeb2a7', .48);
  const darkHair = new THREE.Color(appearance.hairDark);
  const midHair = mix(appearance.hairDark, appearance.hairLight, .48);
  const brightHair = mix(appearance.hairDark, appearance.hairLight, .73);
  const shirt = new THREE.Color(appearance.shirt);
  const shirtShade = new THREE.Color(appearance.shirtShade);
  const pants = appearance.pants;
  const shoes = appearance.shoes;
  const ink = '#352c2b';

  function part(bone: Bone, shape: Shape, finish: Finish, color: Tint,
    x: number, y: number, z: number, width: number, height: number, depth: number,
    pitch = 0, yaw = 0, roll = 0) {
    transform.position.set(x, y, z);
    transform.scale.set(width, height, depth);
    transform.rotation.set(pitch, yaw, roll, 'YXZ');
    transform.updateMatrix();
    parts.push({ key: shape + '/' + finish, bone, shape, finish, tint: new THREE.Color(color),
      local: transform.matrix.clone(), world: new THREE.Matrix4() });
  }

  // Oversized head, visible cheeks, and small natural facial contours.
  part('head', 'head', 'skin', skin, 0, 0, 0, .389, .429, .352);
  for (const side of SIDES) {
    part('head', 'ball', 'skin', skin, side * .377, -.055, .027, .073, .094, .057, 0, 0, side * -.14);
    part('head', 'ball', 'skin', warmSkin, side * .405, -.052, .053, .032, .053, .022);
    part('head', 'ball', 'skin', blush, side * .243, -.151, .239, .061, .035, .018, 0, side * .49);
    part('head', 'ball', 'detail', midHair, side * .139, .109, .322, .060, .013, .016, 0, side * .19, side * .16);
    if (appearance.expression === 'sleepy') {
      part('head', 'smile', 'detail', ink, side * .139, -.016, .331, .066, .028, .025, 0, side * .19, Math.PI);
    } else {
      part('head', 'ball', 'detail', '#5b413d', side * .140, -.018, .323, .073, .084, .020, 0, side * .24);
      part('head', 'ball', 'detail', '#fff8ed', side * .140, -.022, .334, .065, .073, .020, 0, side * .24);
      part('head', 'ball', 'detail', '#473433', side * .137, -.027, .352, .046, .062, .021, 0, side * .21);
      part('head', 'ball', 'detail', '#272528', side * .138, -.025, .367, .028, .042, .013);
      part('head', 'ball', 'detail', '#fff9eb', side * .137 - .016, -.003, .380, .013, .016, .005);
      part('head', 'ball', 'detail', '#e1bf9b', side * .137 + .015, -.050, .374, .006, .008, .004);
    }
  }
  part('head', 'ball', 'skin', skin, 0, -.110, .335, .040, .029, .044);
  if (appearance.expression === 'grin') {
    part('head', 'ball', 'detail', '#6c3e38', 0, -.198, .313, .059, .032, .022);
    part('head', 'ball', 'detail', '#efafa6', 0, -.214, .331, .029, .010, .007);
  } else {
    part('head', 'smile', 'detail', '#6a4239', 0, -.193, .322, .056, .031, .025);
  }

  // Scalp shading and overlapping locks remain visible from the back rows.
  const short = appearance.hair === 'crop';
  part('head', 'hair', 'crown', brightHair, 0, .033, -.031, .419, short ? .438 : .461, .393);
  if (appearance.hair !== 'crop') {
    for (const side of SIDES) {
      part('head', 'lock', 'hair', darkHair, side * .277, -.083, -.175, .157, .278, .182, -.09, 0, side * .16);
      part('head', 'lock', 'hair', midHair, side * .199, .012, -.293, .153, .287, .130, -.10, 0, side * .14);
    }
    part('head', 'lock', 'hair', midHair, 0, .037, -.338, .161, .289, .109, -.10);
  }
  FRINGES[appearance.hair].forEach(([x, y, z, width, height, depth, tilt], index) => {
    part('head', 'lock', 'hair', index % 3 === 1 ? brightHair : midHair,
      x, y, z, width, height, depth, -.11, x * .55, tilt);
  });
  if (appearance.hair === 'bob' || appearance.hair === 'long') {
    const long = appearance.hair === 'long';
    for (const side of SIDES) {
      part('head', 'lock', 'hair', midHair, side * .345, long ? -.235 : -.135, .087,
        .102, long ? .352 : .224, .137, -.10, 0, side * .10);
      if (long) part('head', 'lock', 'hair', darkHair, side * .236, -.229, -.238,
        .163, .349, .163, -.12, 0, side * .10);
    }
  }
  if (appearance.hair === 'curls') {
    for (let curl = 0; curl < 8; curl++) {
      const angle = curl / 8 * Math.PI * 2;
      part('head', 'ball', 'hair', curl % 2 ? brightHair : midHair,
        Math.cos(angle) * .274, .290 + curl % 3 * .036, Math.sin(angle) * .260,
        .158, .153, .145, 0, angle, curl % 2 ? .24 : -.21);
    }
  }
  if (appearance.hair === 'bun') {
    part('head', 'ball', 'hair', darkHair, -.059, .360, -.297, .192, .176, .189);
    part('head', 'lock', 'hair', brightHair, -.073, .418, -.334, .160, .148, .145, .20, -.12, -.51);
    part('head', 'lock', 'hair', midHair, .026, .383, -.350, .100, .165, .108, -.11, .27, -.64);
    part('head', 'ball', 'cloth', '#b78c82', -.041, .306, -.269, .157, .038, .155, .32);
  }

  // A softly rounded jacket, shaped sleeves and contrasting shoe soles.
  part('torso', 'ball', 'skin', warmSkin, 0, .557, 0, .094, .109, .085);
  part('torso', 'body', 'cloth', shirt, 0, .244, 0, .258, .269, .176);
  part('torso', 'ball', 'cloth', shirtShade, 0, .032, 0, .222, .062, .160);
  part('torso', 'ball', 'cloth', '#efe5d6', 0, .494, .116, .118, .044, .060, -.22);
  part('torso', 'ball', 'cloth', pants, 0, -.046, 0, .205, .091, .140);
  for (const side of SIDES) {
    const arm = side < 0 ? 'leftArm' : 'rightArm';
    const forearm = side < 0 ? 'leftForearm' : 'rightForearm';
    const thigh = side < 0 ? 'leftThigh' : 'rightThigh';
    const shin = side < 0 ? 'leftShin' : 'rightShin';
    const foot = side < 0 ? 'leftFoot' : 'rightFoot';
    part(arm, 'ball', 'cloth', shirt, 0, -.095, 0, .092, .160, .095);
    part(forearm, 'ball', 'cloth', shirt, 0, -.004, 0, .078, .078, .080);
    part(forearm, 'ball', 'cloth', shirt, 0, -.083, 0, .079, .136, .083);
    part(forearm, 'ball', 'cloth', shirtShade, 0, -.170, 0, .074, .038, .079);
    part(forearm, 'ball', 'skin', skin, 0, -.217, .013, .062, .075, .056);
    part(forearm, 'ball', 'skin', warmSkin, -side * .045, -.202, .036, .025, .039, .023, .18, 0, side * -.33);
    part(thigh, 'ball', 'cloth', pants, 0, -.128, 0, .111, .173, .108);
    part(shin, 'ball', 'cloth', pants, 0, -.005, .003, .095, .084, .091);
    part(shin, 'ball', 'cloth', pants, 0, -.109, 0, .086, .145, .086);
    part(shin, 'ball', 'cloth', mix(pants, '#b3ad9e', .22), 0, -.226, 0, .084, .026, .086);
    part(foot, 'block', 'leather', '#817064', 0, -.053, .069, .091, .026, .149);
    part(foot, 'ball', 'leather', shoes, 0, -.013, .076, .086, .071, .146);
    part(foot, 'ball', 'leather', mix(shoes, '#c0a68a', .24), 0, .013, .145, .074, .034, .066);
    part(foot, 'ball', 'detail', '#d9ccbe', 0, .047, .065, .048, .009, .009, .06, 0, side * .05);
  }

  if (appearance.detail === 'cardigan' || frame.instructor) {
    part('torso', 'block', 'cloth', shirtShade, 0, .258, .168, .021, .184, .009);
    for (let button = 0; button < 4; button++) {
      part('torso', 'ball', 'detail', '#d3b28e', 0, .133 + button * .091, .184, .018, .019, .010);
    }
    for (const side of SIDES) {
      part('torso', 'block', 'cloth', mix(shirt, shirtShade, .34), side * .125, .145, .159, .053, .054, .014, 0, side * .19);
      part('torso', 'ball', 'cloth', '#e8d5bb', side * .075, .450, .145, .032, .075, .016, .08, side * .17, side * .53);
    }
  } else if (appearance.detail === 'puffer') {
    for (let band = 0; band < 3; band++) {
      part('torso', 'ball', 'cloth', mix(shirt, shirtShade, band * .07), 0, .145 + band * .109, 0,
        .247 - band * .004, .077, .185);
    }
  } else if (appearance.detail === 'knit') {
    for (const side of SIDES) {
      part('torso', 'smile', 'cloth', mix(shirt, shirtShade, .31), side * .106, .294, .173,
        .040, .125, .032, 0, side * .22, side * .13);
    }
  }

  const accessory = appearance.accessory;
  if (accessory === 'glasses' || frame.instructor) {
    for (const side of SIDES) {
      part('head', 'ring', 'detail', '#59473e', side * .143, -.024, .382, .102, .100, .061, 0, side * .19);
      part('head', 'ball', 'detail', '#ad8d75', side * .227, .008, .366, .029, .012, .015);
    }
    part('head', 'ball', 'detail', '#695044', 0, -.024, .391, .057, .013, .011);
  } else if (accessory === 'headphones' || accessory === 'earmuffs') {
    const cushion = accessory === 'earmuffs' ? '#e2b893' : '#6683a1';
    part('head', 'arch', 'detail', '#62556b', 0, .091, -.018, .410, .421, .13);
    for (const side of SIDES) {
      part('head', 'ball', 'leather', '#685d70', side * .404, -.039, .007, .079, .125, .101);
      part('head', 'ball', 'cloth', cushion, side * .444, -.035, .021, .059, .108, .084);
    }
  } else if (accessory === 'cat') {
    part('head', 'arch', 'detail', '#514251', 0, .127, -.008, .406, .365, .10);
    for (const side of SIDES) {
      part('head', 'point', 'hair', midHair, side * .248, .433, .052, .111, .141, .083, -.09, side * .19, side * -.23);
      part('head', 'point', 'cloth', '#d997aa', side * .242, .445, .106, .062, .080, .036, -.07, side * .19, side * -.23);
    }
  } else if (accessory === 'ribbon') {
    part('head', 'ball', 'cloth', '#bd7280', -.285, .370, .227, .126, .067, .041, -.10, -.20, .38);
    part('head', 'ball', 'cloth', '#df9396', -.099, .370, .227, .115, .063, .041, -.10, -.20, -.37);
    part('head', 'ball', 'cloth', '#ba707e', -.195, .370, .262, .049, .044, .030);
  } else if (accessory === 'beanie') {
    part('head', 'dome', 'cloth', '#e6d4b5', 0, .224, -.021, .430, .313, .396);
    part('head', 'brim', 'cloth', '#cdb89d', 0, .224, -.018, .433, .066, .398);
    for (let rib = 0; rib < 16; rib++) {
      const angle = rib / 16 * Math.PI * 2;
      part('head', 'ball', 'cloth', '#ebddc8', Math.cos(angle) * .421, .226, Math.sin(angle) * .383 - .019,
        .026, .061, .025);
    }
    part('head', 'ball', 'cloth', '#e8d2b3', .013, .557, -.063, .104, .104, .104);
  } else if (accessory === 'sprout') {
    part('head', 'ball', 'cloth', '#75a76c', 0, .485, .016, .023, .093, .023, .09, 0, -.11);
    part('head', 'ball', 'cloth', '#a5c878', -.070, .544, .017, .093, .032, .033, .09, 0, -.29);
    part('head', 'ball', 'cloth', '#85b378', .067, .562, .022, .090, .038, .037, 0, 0, .45);
  } else if (accessory === 'star') {
    part('head', 'star', 'detail', '#efd07b', -.279, .224, .344, .078, .078, .069, .08, -.27, -.14);
  } else if (accessory === 'clip') {
    part('head', 'block', 'detail', '#e8b672', -.277, .211, .346, .064, .012, .016, -.12, -.33, -.35);
    part('head', 'block', 'detail', '#f3d39a', -.268, .239, .350, .050, .009, .014, -.12, -.33, -.35);
  } else if (accessory === 'scarf') {
    part('torso', 'ball', 'cloth', '#bc776c', 0, .498, .011, .142, .074, .119);
    part('torso', 'block', 'cloth', '#d18c7e', -.078, .329, .171, .050, .157, .028, .08, -.16, -.23);
    part('torso', 'block', 'cloth', '#d8a192', -.111, .213, .183, .051, .014, .028, .08, -.16, -.23);
  } else if (accessory === 'frog') {
    part('head', 'ball', 'cloth', '#88a55f', 0, .392, .060, .286, .127, .272);
    for (const side of SIDES) {
      part('head', 'ball', 'cloth', '#9eb86a', side * .159, .477, .134, .095, .085, .093);
      part('head', 'ball', 'detail', '#43523c', side * .159, .484, .214, .024, .030, .016);
    }
  } else if (accessory === 'mushroom') {
    part('head', 'dome', 'cloth', '#bd7164', 0, .367, -.015, .439, .231, .389);
    part('head', 'ball', 'cloth', '#ead7bd', 0, .368, -.015, .441, .037, .391);
    for (let spot = 0; spot < 6; spot++) {
      const angle = spot * Math.PI / 3;
      part('head', 'ball', 'cloth', '#f6dcbf', Math.cos(angle) * .256, .559, Math.sin(angle) * .220,
        .055, .019, .045, Math.sin(angle) * .36, 0, -Math.cos(angle) * .37);
    }
  } else if (accessory === 'axolotl') {
    for (const side of SIDES) for (let branch = 0; branch < 3; branch++) {
      part('head', 'ball', 'cloth', branch % 2 ? '#c778a0' : '#dda0b8',
        side * (.419 + branch * .030), .050 + branch * .074, -.044, .042, .100, .043,
        -.16, 0, side * (-.69 - branch * .22));
    }
  }
  return parts;
}

function identity(frame: AuditoriumActorFrame) {
  const avatar = frame.avatar;
  return [frame.character, Number(Boolean(frame.instructor)), avatar?.hair, avatar?.hairColor, avatar?.skin,
    avatar?.expression, avatar?.clothing, avatar?.clothingColor, avatar?.accessory].join('/');
}

function poseChanged(last: AuditoriumActorFrame | undefined, frame: AuditoriumActorFrame) {
  return !last || last.x !== frame.x || last.z !== frame.z || last.scale !== frame.scale ||
    last.heading !== frame.heading || last.stride !== frame.stride || last.seated !== frame.seated;
}

/** Batch articulated actors so all visible seats share a small, fixed number of GPU draws. */
export function createAuditoriumActors(parent: THREE.Object3D) {
  const geometries = createGeometry();
  const materials = createMaterials();
  const actors = new Map<string, Actor>();
  const batches = new Map<string, Batch>();
  const transform = new THREE.Object3D();
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false;

  function joint(pose: Pose, bone: Bone, parentBone: Bone,
    x: number, y: number, z: number, pitch = 0, yaw = 0, roll = 0) {
    transform.position.set(x, y, z);
    transform.scale.set(1, 1, 1);
    transform.rotation.set(pitch, yaw, roll, 'YXZ');
    transform.updateMatrix();
    pose[bone].multiplyMatrices(pose[parentBone], transform.matrix);
  }

  function articulate(actor: Actor, frame: AuditoriumActorFrame, sit: number) {
    const { pose } = actor;
    const lerp = THREE.MathUtils.lerp;
    const walking = !motionPreference.matches && !frame.seated && frame.stride !== 0;
    const swing = walking ? Math.sin(frame.stride) : 0;
    const rise = walking ? (.009 + .024 * (1 - Math.cos(frame.stride * 2))) * (1 - sit) : 0;
    const hips = lerp(.611, .698, sit);
    transform.position.set(frame.x, rise * frame.scale, frame.z);
    transform.scale.setScalar(frame.scale);
    transform.rotation.set(0, frame.heading, 0, 'YXZ');
    transform.updateMatrix();
    pose.root.copy(transform.matrix);
    joint(pose, 'torso', 'root', 0, hips, -.023 * sit,
      lerp(.035 * Number(walking), .036, sit), -.064 * swing, -.045 * swing);
    joint(pose, 'head', 'torso', 0, .964, .012,
      lerp(-.012, -.039, sit), .043 * swing, .028 * swing);

    for (const side of SIDES) {
      const arm = side < 0 ? 'leftArm' : 'rightArm';
      const forearm = side < 0 ? 'leftForearm' : 'rightForearm';
      const thigh = side < 0 ? 'leftThigh' : 'rightThigh';
      const shin = side < 0 ? 'leftShin' : 'rightShin';
      const foot = side < 0 ? 'leftFoot' : 'rightFoot';
      const step = side * swing;
      joint(pose, arm, 'torso', side * .255, .434, .011, lerp(.56 * step, -.48, sit), 0, side * .16);
      joint(pose, forearm, arm, 0, -UPPER_ARM_LENGTH, 0, lerp(-.12 - Math.max(0, -step) * .44, -.78, sit));
      const thighPitch = lerp(-.62 * step, -1.39, sit);
      const kneePitch = lerp(.036 + Math.max(0, -step) * .89, 1.49, sit);
      joint(pose, thigh, 'root', side * .121, hips - .002, .015 * sit, thighPitch, 0, side * .020);
      joint(pose, shin, thigh, 0, -THIGH_LENGTH, 0, kneePitch);
      joint(pose, foot, shin, 0, -SHIN_LENGTH, 0, -(thighPitch + kneePitch) * .85, side * .050);
    }
    for (const part of actor.parts) part.world.multiplyMatrices(pose[part.bone], part.local);
    actor.previous = {...frame};
    actor.sitAmount = sit;
  }

  function ensureBatch(key: string, part: Part, count: number) {
    const current = batches.get(key);
    if (current && current.capacity >= count) return;
    if (current) {
      parent.remove(current.mesh);
      current.mesh.dispose();
    }
    const capacity = Math.max(16, Math.ceil(count / 32) * 32);
    const mesh = new THREE.InstancedMesh(geometries[part.shape], materials[part.finish], capacity);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(mesh);
    batches.set(key, { mesh, capacity, slots: [], colors: [], count: 0, matrixDirty: false, colorDirty: false });
  }

  function update(frames: AuditoriumActorFrame[]) {
    if (disposed) return;
    const now = performance.now();
    const visible = new Set<string>();
    const entries: Array<{ actor: Actor; changed: boolean }> = [];
    const requirements = new Map<string, { part: Part; count: number }>();
    for (const frame of frames) {
      if (!Number.isFinite(frame.x + frame.z + frame.scale + frame.heading + frame.stride) || frame.scale <= 0) continue;
      visible.add(frame.id);
      const signature = identity(frame);
      const sitTarget = Number(frame.seated);
      let actor = actors.get(frame.id);
      if (!actor || actor.identity !== signature) {
        const pose = Object.fromEntries(BONES.map(bone => [bone, new THREE.Matrix4()])) as Pose;
        actor = { identity: signature, parts: actorParts(frame), pose, sitAmount: sitTarget,
          sitFrom: sitTarget, sitTarget, sitStarted: now };
        actors.set(frame.id, actor);
      }
      if (sitTarget !== actor.sitTarget) {
        actor.sitFrom = actor.sitAmount;
        actor.sitTarget = sitTarget;
        actor.sitStarted = now;
      }
      const progress = motionPreference.matches ? 1 : THREE.MathUtils.smoothstep(now - actor.sitStarted, 0, SEATING_BLEND_MS);
      const sit = THREE.MathUtils.lerp(actor.sitFrom, actor.sitTarget, progress);
      const changed = poseChanged(actor.previous, frame) || sit !== actor.sitAmount;
      if (changed) articulate(actor, frame, sit);
      entries.push({actor, changed});
      for (const part of actor.parts) {
        const requirement = requirements.get(part.key);
        if (requirement) requirement.count += 1;
        else requirements.set(part.key, {part, count: 1});
      }
    }
    for (const id of actors.keys()) if (!visible.has(id)) actors.delete(id);
    for (const [key, {part, count}] of requirements) ensureBatch(key, part, count);
    for (const batch of batches.values()) {
      batch.count = 0;
      batch.matrixDirty = false;
      batch.colorDirty = false;
    }
    for (const {actor, changed} of entries) for (const part of actor.parts) {
      const batch = batches.get(part.key)!;
      const slot = batch.count++;
      if (changed || batch.slots[slot] !== part) {
        batch.mesh.setMatrixAt(slot, part.world);
        batch.slots[slot] = part;
        batch.matrixDirty = true;
      }
      if (!batch.colors[slot]?.equals(part.tint)) {
        batch.mesh.setColorAt(slot, part.tint);
        batch.colors[slot] = part.tint;
        batch.colorDirty = true;
      }
    }
    for (const batch of batches.values()) {
      batch.mesh.count = batch.count;
      batch.mesh.visible = batch.count > 0;
      batch.slots.length = batch.count;
      batch.colors.length = batch.count;
      if (batch.matrixDirty) batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.colorDirty && batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const {mesh} of batches.values()) {
      parent.remove(mesh);
      mesh.dispose();
    }
    for (const geometry of Object.values(geometries)) geometry.dispose();
    for (const material of Object.values(materials)) material.dispose();
    batches.clear();
    actors.clear();
  }

  return { update, dispose };
}

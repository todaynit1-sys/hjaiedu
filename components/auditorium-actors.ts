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

type Shape = 'ball' | 'head' | 'body' | 'hair' | 'lock' | 'block' | 'brim' | 'dome' | 'ring' | 'arch' | 'smile' | 'mouth' | 'point' | 'star';
type Finish = 'skin' | 'face' | 'cloth' | 'knit' | 'hair' | 'crown' | 'strand' | 'leather' | 'detail';
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
      const rim = 1.83 - .69 * front + .035 * Math.sin(angle * 5);
      const arc = Math.max(.001, t * rim);
      const radius = 1 + .015 * Math.sin(angle * 9) * Math.sin(arc);
      points.push(Math.cos(angle) * Math.sin(arc) * radius, Math.cos(arc), front * Math.sin(arc) * radius);
      const sweep = Math.cos(angle * 9 + t * (2.2 + front));
      const strands = .052 * sweep * Math.sin(t * Math.PI);
      const value = 1 - t * .16 + strands;
      shade.push(value, value * .985, value * .97);
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
  const geometry = new THREE.SphereGeometry(1, kind === 'head' ? 26 : 14, kind === 'head' ? 18 : 10);
  const position = geometry.attributes.position;
  const colors: number[] = [];
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    if (kind === 'head') {
      const jaw = y < -.18 ? 1 + (y + .18) * .10 : 1;
      position.setX(index, x * jaw);
      position.setZ(index, z * (y < 0 ? 1 + y * .04 : 1));
      const cheek = Math.exp(-32 * (Math.abs(x) - .55) ** 2 - 22 * (y + .39) ** 2) * Math.max(0, z);
      const lowerShade = .93 + .07 * (y + 1) / 2;
      colors.push(lowerShade, lowerShade - cheek * .24, lowerShade - cheek * .22);
    } else {
      const taper = (1 - y) / 2;
      position.setX(index, x * (1.09 - taper * .37) - .59 * taper ** 2);
      position.setZ(index, z * (1.04 - taper * .23) + .30 * taper ** 2);
      // The broad highlight bends down the lock and fades at the tip.
      const crest = x + .26 + .28 * taper ** 2;
      const highlight = Math.exp(-16 * crest ** 2) * Math.sqrt(Math.max(0, 1 - y * y)) * Math.max(0, z);
      const value = .98 - taper * .14 + highlight * .16 + .027 * Math.cos(x * 17 + taper * 3);
      colors.push(value, value * .99, value * .974);
    }
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
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
  const mouth = new THREE.Shape();
  mouth.moveTo(-1, .22);
  mouth.quadraticCurveTo(0, -.04, 1, .28);
  mouth.bezierCurveTo(.98, -.38, .48, -.92, 0, -.90);
  mouth.bezierCurveTo(-.54, -.89, -.99, -.39, -1, .22);
  return {
    ball: new THREE.SphereGeometry(1, 12, 8),
    head: shapedBall('head'),
    lock: shapedBall('lock'),
    hair: scalpGeometry(),
    body: new THREE.LatheGeometry([
      [0, -1], [.67, -.99], [.87, -.90], [.97, -.71], [1, -.34], [.99, .08],
      [.94, .50], [.83, .73], [.63, .91], [.38, .99], [0, 1]
    ].map(([x, y]) => new THREE.Vector2(x, y)), 24),
    block: new RoundedBoxGeometry(2, 2, 2, 2, .35),
    brim: new THREE.CylinderGeometry(1, 1, 2, 20),
    dome: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    ring: new THREE.TorusGeometry(1, .083, 6, 22),
    arch: new THREE.TorusGeometry(1, .063, 6, 22, Math.PI),
    smile: new THREE.TubeGeometry(smilePath, 10, .17, 5, false),
    mouth: new THREE.ShapeGeometry(mouth, 10),
    point: new THREE.ConeGeometry(1, 2, 4),
    star: starGeometry()
  };
}

function createMaterials(): Record<Finish, THREE.MeshStandardMaterial> {
  // The shared textures leave the garment tint fully customizable.
  const size = 32;
  const texels = new Uint8Array(size * size * 4);
  const stitches = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = (y * size + x) * 4;
    const weave = Math.cos(x / size * 4 * Math.PI + .54 * Math.cos(y / size * 2 * Math.PI));
    const value = Math.round(128 + 30 * weave + 17 * Math.cos((y + x) / size * 4 * Math.PI));
    texels.set([value, value, value, 255], index);
    const band = Math.abs(y - 22.5);
    const diamond = band + Math.abs(x % 8 - 3.5);
    const textile = band < 3.5 ? (diamond < 3.5 ? 255 : 207) : Math.round(247 + 5 * weave);
    stitches.set([textile, textile, textile, 255], index);
  }
  function fabricTexture(data: Uint8Array) {
    const texture = new THREE.DataTexture(data, size, size);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  }
  const fabric = fabricTexture(texels);
  fabric.repeat.set(7, 6);
  const stitchPattern = fabricTexture(stitches);
  stitchPattern.repeat.x = 3;
  stitchPattern.colorSpace = THREE.SRGBColorSpace;
  return {
    skin: new THREE.MeshStandardMaterial({roughness: .88}),
    face: new THREE.MeshStandardMaterial({roughness: .9, vertexColors: true}),
    cloth: new THREE.MeshStandardMaterial({roughness: .97, bumpMap: fabric, bumpScale: .015}),
    knit: new THREE.MeshStandardMaterial({roughness: .98, bumpMap: fabric, bumpScale: .015, map: stitchPattern}),
    hair: new THREE.MeshStandardMaterial({roughness: .9}),
    crown: new THREE.MeshStandardMaterial({roughness: .91, vertexColors: true}),
    strand: new THREE.MeshStandardMaterial({roughness: .89, vertexColors: true}),
    leather: new THREE.MeshStandardMaterial({roughness: .78}),
    detail: new THREE.MeshStandardMaterial({roughness: .84})
  };
}

function mix(first: Tint, second: Tint, amount: number) {
  return new THREE.Color(first).lerp(new THREE.Color(second), amount);
}

type Lock = [x: number, y: number, z: number, width: number, height: number, depth: number, tilt: number];

const FRINGES: Record<ReturnType<typeof avatarAppearance>['hair'], Lock[]> = {
  waves: [[-.306,.202,.249,.127,.177,.117,-.58],[-.220,.310,.280,.153,.203,.132,-.79],
    [-.078,.352,.315,.153,.213,.125,-.72],[.096,.348,.322,.149,.197,.115,-.60],
    [.251,.270,.289,.145,.172,.107,.55],[.334,.171,.219,.100,.147,.106,.44]],
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
  const darkHair = new THREE.Color(appearance.hairDark);
  const midHair = mix(appearance.hairDark, appearance.hairLight, .48);
  const brightHair = mix(appearance.hairDark, appearance.hairLight, .73);
  const shirt = new THREE.Color(appearance.shirt);
  const shirtShade = new THREE.Color(appearance.shirtShade);
  const textileEdge = mix(shirtShade, '#70513d', .13);
  const pants = appearance.pants;
  const shoes = appearance.shoes;
  const ink = '#352523';

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

  // Warm cheek shading and small painted expression marks.
  part('head', 'head', 'face', skin, 0, 0, 0, .417, .405, .357);
  for (const side of SIDES) {
    part('head', 'ball', 'skin', skin, side * .397, -.093, .060, .074, .089, .073, 0, 0, side * -.18);
    part('head', 'ball', 'skin', warmSkin, side * .426, -.095, .113, .030, .048, .014, 0, side * .24);
    part('head', 'smile', 'detail', midHair, side * .152, .040, .334, .048, .035, .024, 0, side * .22, Math.PI + side * .14);
    if (appearance.expression === 'sleepy') {
      part('head', 'smile', 'detail', ink, side * .150, -.058, .339, .054, .030, .025, 0, side * .23, Math.PI);
    } else {
      part('head', 'ball', 'detail', ink, side * .150, -.061, .331, .037, .052, .021, -.13, side * .26, side * .12);
      part('head', 'ball', 'detail', '#a37866', side * .150 - .010, -.043, .351, .009, .012, .004);
    }
  }
  part('head', 'ball', 'skin', skin, 0, -.131, .334, .027, .021, .024);
  if (appearance.expression === 'grin') {
    part('head', 'mouth', 'detail', '#793a2d', 0, -.198, .309, .071, .058, 1, .53);
    part('head', 'ball', 'detail', '#cc7868', 0, -.234, .296, .042, .014, .008, .53);
  } else {
    part('head', 'smile', 'detail', '#773f35', 0, -.200, .309, .051, .041, .025, .50);
  }

  // Scalp shading and overlapping locks remain visible from the back rows.
  const short = appearance.hair === 'crop';
  part('head', 'hair', 'crown', midHair, 0, .057, -.036, .440, short ? .415 : .447, .406);
  if (appearance.hair !== 'crop') {
    for (const side of SIDES) {
      part('head', 'lock', 'strand', midHair, side * .310, -.026, -.176, .150, .287, .197, -.16, side * .25, side * .31);
      part('head', 'lock', 'strand', brightHair, side * .188, .113, -.281, .181, .335, .152, -.22, side * .19, side * .30);
    }
    part('head', 'lock', 'strand', midHair, 0, .077, -.356, .169, .328, .117, -.20, 0, -.29);
    part('head', 'lock', 'strand', brightHair, -.118, .360, -.151, .159, .218, .131, -.86, -.26, -.38);
    part('head', 'lock', 'strand', midHair, .095, .376, -.158, .165, .206, .123, -.77, .19, -.29);
  }
  FRINGES[appearance.hair].forEach(([x, y, z, width, height, depth, tilt], index) => {
    part('head', 'lock', 'strand', index % 3 === 0 ? midHair : brightHair,
      x, y + .025, z, width, height, depth, -.16, x * .55, tilt);
  });
  if (appearance.hair === 'bob' || appearance.hair === 'long') {
    const long = appearance.hair === 'long';
    for (const side of SIDES) {
      part('head', 'lock', 'strand', midHair, side * .345, long ? -.235 : -.135, .087,
        .102, long ? .352 : .224, .137, -.10, 0, side * .10);
      if (long) part('head', 'lock', 'strand', darkHair, side * .236, -.229, -.238,
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
    part('head', 'lock', 'strand', brightHair, -.073, .418, -.334, .160, .148, .145, .20, -.12, -.51);
    part('head', 'lock', 'strand', midHair, .026, .383, -.350, .100, .165, .108, -.11, .27, -.64);
    part('head', 'ball', 'cloth', '#b78c82', -.041, .306, -.269, .157, .038, .155, .32);
  }

  // A longer coat silhouette and a collar that also reads from the back.
  part('torso', 'ball', 'skin', warmSkin, 0, .533, 0, .095, .096, .085);
  part('torso', 'body', appearance.detail === 'knit' ? 'knit' : 'cloth',
    shirt, 0, .244, 0, .257, .277, .181);
  part('torso', 'body', 'cloth', textileEdge, 0, .037, 0, .241, .050, .173);
  part('torso', 'ball', 'cloth', textileEdge, 0, .489, -.026, .137, .036, .115, .13);
  part('torso', 'ball', 'cloth', '#efe5d6', 0, .480, .105, .114, .056, .066, -.22);
  part('torso', 'ball', 'cloth', pants, 0, -.046, 0, .205, .091, .140);
  for (const side of SIDES) {
    const arm = side < 0 ? 'leftArm' : 'rightArm';
    const forearm = side < 0 ? 'leftForearm' : 'rightForearm';
    const thigh = side < 0 ? 'leftThigh' : 'rightThigh';
    const shin = side < 0 ? 'leftShin' : 'rightShin';
    const foot = side < 0 ? 'leftFoot' : 'rightFoot';
    part(arm, 'ball', 'cloth', shirt, -side * .016, -.094, 0, .104, .170, .101);
    part(forearm, 'ball', 'cloth', shirt, 0, -.004, 0, .078, .078, .080);
    part(forearm, 'ball', 'cloth', shirt, 0, -.083, 0, .079, .136, .083);
    part(forearm, 'body', 'cloth', textileEdge, 0, -.168, 0, .083, .042, .086);
    part(forearm, 'ball', 'skin', skin, 0, -.228, .013, .067, .069, .061);
    part(forearm, 'ball', 'skin', warmSkin, -side * .045, -.202, .036, .025, .039, .023, .18, 0, side * -.33);
    part(thigh, 'ball', 'cloth', pants, 0, -.128, 0, .111, .173, .108);
    part(shin, 'ball', 'cloth', pants, 0, -.011, .003, .091, .092, .091);
    part(shin, 'body', 'cloth', pants, 0, -.113, 0, .086, .145, .088, 0, 0, Math.PI);
    part(shin, 'body', 'cloth', mix(pants, '#b3ad9e', .19), 0, -.220, 0, .090, .040, .090);
    part(foot, 'block', 'leather', '#ecdac1', 0, -.053, .080, .104, .029, .167);
    part(foot, 'ball', 'leather', shoes, 0, -.010, .078, .098, .072, .158);
    part(foot, 'ball', 'leather', mix(shoes, '#c0a68a', .29), 0, .011, .156, .085, .035, .070);
    part(foot, 'ball', 'detail', '#f3e4ce', 0, .058, .088, .056, .012, .014, .08, 0, side * .08);
    part(foot, 'ball', 'detail', '#f3e4ce', 0, .050, .128, .058, .011, .012, .20, 0, side * -.04);
  }

  if (appearance.detail === 'cardigan' || frame.instructor) {
    const edging = mix(shirt, textileEdge, .64);
    part('torso', 'block', 'cloth', edging, .018, .169, .176, .025, .119, .021);
    for (let button = 0; button < 2; button++) {
      part('torso', 'ball', 'leather', '#93643d', .020, .125 + button * .107, .200, .024, .024, .013);
      part('torso', 'ball', 'detail', '#bc8950', .017, .129 + button * .107, .209, .013, .013, .006);
    }
    for (const side of SIDES) {
      part('torso', 'block', 'cloth', mix(shirt, shirtShade, .19), side * .133, .137, .158, .056, .044, .027, 0, side * .30);
      part('torso', 'block', 'cloth', textileEdge, side * .132, .175, .177, .059, .010, .015, 0, side * .30);
      part('torso', 'block', 'cloth', edging, side * .064, .397, .158, .026, .125, .025, -.26, side * .16, -side * .44);
    }
  } else if (appearance.detail === 'puffer') {
    for (let band = 0; band < 3; band++) {
      part('torso', 'ball', 'cloth', mix(shirt, shirtShade, band * .07), 0, .145 + band * .109, 0,
        .247 - band * .004, .077, .185);
    }
  } else if (appearance.detail === 'knit') {
    part('torso', 'ball', 'cloth', mix(shirt, shirtShade, .36), 0, .482, .111, .127, .040, .071, -.22);
  }

  const accessory = appearance.accessory;
  if (accessory === 'glasses' || frame.instructor) {
    for (const side of SIDES) {
      part('head', 'ring', 'detail', '#59473e', side * .149, -.053, .366, .094, .090, .065, -.08, side * .22);
      part('head', 'ball', 'detail', '#ad8d75', side * .228, -.022, .355, .029, .012, .015);
    }
    part('head', 'ball', 'detail', '#695044', 0, -.051, .379, .060, .010, .013);
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
    part('head', 'ball', 'cloth', '#d9c3a3', -.424, .353, -.258, .118, .077, .040, -.16, -.72, .47);
    part('head', 'ball', 'cloth', '#f0ddbb', -.273, .362, -.356, .118, .068, .040, -.16, -.68, -.42);
    part('head', 'ball', 'cloth', '#ead2ae', -.350, .355, -.322, .050, .047, .045, -.12, -.70);
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
    joint(pose, 'head', 'torso', 0, lerp(.934, .899, sit), .025,
      lerp(-.012, -.039, sit), .043 * swing, .028 * swing);

    for (const side of SIDES) {
      const arm = side < 0 ? 'leftArm' : 'rightArm';
      const forearm = side < 0 ? 'leftForearm' : 'rightForearm';
      const thigh = side < 0 ? 'leftThigh' : 'rightThigh';
      const shin = side < 0 ? 'leftShin' : 'rightShin';
      const foot = side < 0 ? 'leftFoot' : 'rightFoot';
      const step = side * swing;
      joint(pose, arm, 'torso', side * .255, lerp(.447, .434, sit), .011, lerp(.56 * step, -.48, sit), 0, side * .16);
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
    materials.cloth.bumpMap?.dispose();
    materials.knit.map?.dispose();
    for (const material of Object.values(materials)) material.dispose();
    batches.clear();
    actors.clear();
  }

  return { update, dispose };
}

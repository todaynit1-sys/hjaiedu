import { useId } from 'react';
import type { AvatarCustomization } from '../lib/avatar-customization';
import type { StorybookPose } from '../lib/storybook-avatar';

type Box = readonly [number, number, number, number];
type Landmarks = {
  head: Box;
  face: Box;
  eyes: readonly Box[];
  mouth?: Box;
};
type Appearance = {
  accessory: AvatarCustomization['accessory'];
  expression: AvatarCustomization['expression'];
  skin: string;
  skinShade: string;
};

const cocoa = '#5c3c32';

function measure([left, top, right, bottom]: Box) {
  const width = right - left;
  const height = bottom - top;
  return { left, top, bottom, width, height, x: left + width / 2, y: top + height / 2 };
}

function Expression({ appearance, eyes, mouth }: { appearance: Appearance; eyes: readonly Box[]; mouth?: Box }) {
  const patchId = useId();
  const { expression, skin, skinShade } = appearance;
  if (expression === 'grin' || (!eyes.length && !mouth)) return null;
  const sleepy = expression === 'sleepy';
  const lip = mouth && measure(mouth);
  const patch = `url(#${patchId})`;

  return <g strokeLinecap="round">
    <defs>
      <radialGradient id={patchId}>
        <stop offset=".55" stopColor={skin} />
        <stop offset=".76" stopColor={skinShade} stopOpacity=".87" />
        <stop offset="1" stopColor={skinShade} stopOpacity="0" />
      </radialGradient>
    </defs>
    {sleepy && eyes.map((box, index) => {
      const eye = measure(box);
      const half = eye.width * .63;
      return <g key={index}>
        <ellipse cx={eye.x} cy={eye.y} rx={eye.width * .80 + .5} ry={eye.height * .72 + .5} fill={patch} />
        <path d={`M${eye.x - half} ${eye.y} Q${eye.x} ${eye.y + eye.height * .26} ${eye.x + half} ${eye.y - .6}`}
          fill="none" stroke={cocoa} strokeWidth={Math.max(1.1, eye.width * .16)} />
      </g>;
    })}
    {lip && <g>
      <ellipse cx={lip.x} cy={lip.y} rx={lip.width * .73 + .5} ry={lip.height * .77 + .7} fill={patch} />
      {sleepy
        ? <ellipse cx={lip.x} cy={lip.y} rx={Math.max(1.2, lip.width * .15)} ry={Math.max(1.1, lip.height * .19)} fill="#9b5b4f" />
        : <path d={`M${lip.x - lip.width * .37} ${lip.y - 1} Q${lip.x} ${lip.y + lip.height * .30} ${lip.x + lip.width * .37} ${lip.y - 1.4}`}
          fill="none" stroke="#783e36" strokeWidth={Math.max(1.15, lip.height * .14)} />}
    </g>}
  </g>;
}

function Glasses({ pose, landmarks }: { pose: StorybookPose; landmarks: Landmarks }) {
  const eyes = landmarks.eyes.map(measure).sort((a, b) => a.x - b.x).slice(0, 2);
  if (!eyes.length) return null;
  const { width } = measure(landmarks.face);
  const maxRadius = eyes.length > 1 ? (eyes[1].x - eyes[0].x) * .43 : width * .27;
  const lenses = eyes.map(eye => ({
    ...eye,
    rx: Math.min(maxRadius, Math.max(eye.width * 1.56, eye.height * .83)),
    ry: eye.height * .73 + 1,
  }));
  const [near, far] = lenses;
  const temple = pose === 'seated' ? 1 : -1;
  const edge = near.x + temple * near.rx;

  return <g fill="none" stroke="#50362d" strokeWidth="2.65" strokeLinecap="round" strokeLinejoin="round">
    <path d={`M${edge} ${near.y - 2} q${temple * width * .16} -2 ${temple * width * .30} 1`} />
    {far && <path d={`M${near.x + near.rx} ${near.y - 1} Q${(near.x + far.x) / 2} ${near.y - 5} ${far.x - far.rx} ${far.y - 1}`} />}
    {lenses.map((lens, index) => <g key={index}>
      <ellipse cx={lens.x} cy={lens.y} rx={lens.rx} ry={lens.ry} fill="#ffe8bc" fillOpacity=".05" />
      <path d={`M${lens.x - lens.rx * .63} ${lens.y - lens.ry * .46} q2 -3 5 -4`} stroke="#f6ce9a" strokeWidth="1.4" opacity=".75" />
    </g>)}
  </g>;
}

function Headwear({ accessory, seated }: { accessory: Appearance['accessory']; seated: boolean }) {
  switch (accessory) {
    case 'beanie':
      return <>
        <path d="M8 31C7 17 19 3 38 2c17-3 39 2 49 15 4 5 7 10 7 18L88 43C63 48 32 47 11 42Z" fill="#e9d2ab" />
        <path d="M14 29C20 16 31 9 39 6m-10 23C34 17 41 9 47 4m-1 24C49 18 53 9 55 5m7 23q.6-14-1-21m15 22q-2-12-9-20m19 20q-4-9-10-14"
          fill="none" stroke="#b09070" opacity=".59" />
        <path d="M9 32q34 4 84-3l.5 11q-36 10-84 4Z" fill="#ead6b5" />
        <path d="M16 36l.5 5m8-4 .7 5m8-4 .5 5m8-5 .4 5m8-6 .4 5m8-6 .4 5m8-7 .6 5m8-7 .8 5m7-7 .6 5"
          fill="none" stroke="#b09070" opacity=".62" />
        <path d="M14 33.5q35 5 74-2" fill="none" stroke="#fff0d1" strokeWidth="1.4" />
      </>;
    case 'cat':
      return <>
        <path d="M17 28q0-11 4-25 1-3 4-.5l17 16m15 0L75 3q3-2 4 1 6 14 5 24" fill="#8a6c65" />
        <path d="m22 20 3-11 11 11m26-.6L75 9l4 13" fill="#dda4a1" stroke="#9e726e" />
        <path d="M17 27q25-15 67 0" fill="none" stroke="#624741" strokeWidth="3" />
        <path d="M19 24q27-13 61 .3" fill="none" stroke="#ae8c81" opacity=".78" />
      </>;
    case 'ribbon':
      return <g transform={`translate(${seated ? 62 : 27} ${seated ? 35 : 23}) rotate(-18)`}>
        <path d="M-2-3q-9-12-15-5-4 7 4 13 6 3 12-2 7 7 14 3 8-5 4-12-6-9-16 3Zm0 4q-3 6-7 10l5 2 6-10q3 5 8 9l2-5-9-7" fill="#eddbbb" />
        <path d="M-13-6q4 4 10 5m15-5Q7-2 3 0" fill="none" stroke="#aa8a6f" />
        <ellipse rx="4" ry="3.4" fill="#f1e1c5" />
      </g>;
    case 'sprout':
      return <>
        <path d="M52 22q-.5-13 1-18" fill="none" stroke="#546247" strokeWidth="1.9" />
        <path d="M52 13Q37 14 35 4q14-2 17 9Zm1-2Q56-.1 68 1q0 11-15 10Z" fill="#a4b77b" stroke="#5c714e" />
        <path d="M40 7l11 4m14-7-9 5" stroke="#ccd7a1" />
      </>;
    case 'headphones':
    case 'earmuffs': {
      const fabric = accessory === 'earmuffs' ? '#dfb18c' : '#817d92';
      const band = accessory === 'earmuffs' ? '#a58167' : '#5d5269';
      return <>
        <path d="M21 65C8 44 16 19 35 11c19-10 49-2 57 22 4 9 4 20 0 29" fill="none" stroke={band} strokeWidth="5.8" />
        <path d="M19 54C13 33 23 16 40 11c16-6 36-.1 45 13" fill="none" stroke="#f1ddc2" strokeWidth="1.1" opacity=".48" />
        <ellipse cx={seated ? 26 : 27} cy="69" rx="8.4" ry="11.5" fill={fabric} />
        <path d="M23 62q-4 5-.6 13" fill="none" stroke="#fff2db" opacity=".64" />
        {!seated && <ellipse cx="91" cy="61" rx="5" ry="8.6" fill={fabric} />}
      </>;
    }
    case 'frog':
      return <g stroke="#66704a">
        <path d="M12 29C11 18 19 15 28 16 27 7 37 3 42 12c6-3 15-3 22 0 2-9 13-8 16-1 8 0 14 8 14 17-16 10-58 12-82 1Z" fill="#a1b879" />
        <path d="M15 29q35 7 75-1" fill="none" stroke="#778e5c" strokeWidth="2" />
        {!seated && <g fill="#e0deb0">
          <circle cx="34" cy="14" r="5.5" /><circle cx="71" cy="14" r="5.5" />
          <circle cx="34" cy="14" r="2" fill="#46543c" /><circle cx="71" cy="14" r="2" fill="#46543c" />
        </g>}
      </g>;
    case 'mushroom':
      return <>
        <path d="M6 32C13 10 27 3 47 2c26-1 44 11 50 27 2 7-8 9-17 9-17-7-44-8-59 1-8 .9-17-1-15-7Z" fill="#cb8879" />
        <path d="M12 34q28-10 74-.8l1 5q-38 4-75 0Z" fill="#e3c3a6" />
        <g fill="#f5e0c6" stroke="none">
          <ellipse cx="26" cy="22" rx="5.9" ry="3.6" transform="rotate(-30 26 22)" />
          <ellipse cx="47" cy="12" rx="6.1" ry="3.1" />
          <ellipse cx="72" cy="19" rx="5.9" ry="3.6" transform="rotate(26 72 19)" />
        </g>
      </>;
    case 'star':
      return <path d="m0-8 2.5 5.1 5.8.9L4.1 2l1 5.6L0 5l-5.2 2.6 1-5.6-4.2-4 5.9-.9Z"
        fill="#efd199" stroke="#997044" transform={`translate(${seated ? 67 : 25} 33) rotate(-13)`} />;
    case 'clip':
      return <g transform={`translate(${seated ? 65 : 26} 33) rotate(-27)`} stroke="#a4825b" strokeWidth=".6">
        <rect x="-6" y="-2" width="13" height="3" rx="1.5" fill="#e6bf80" />
        <rect x="-5" y="3" width="11" height="2.5" rx="1.25" fill="#efce91" />
      </g>;
    case 'axolotl':
      return <>
        <path d="M20 49q-9-5-13-13m13 17Q9 52 4 46m17 12Q10 59 6 56m75-7q9-5 13-13m-13 17q11-1 16-7m-17 12q11 1 15-2"
          fill="none" stroke="#ae7186" strokeWidth="4" />
        <path d="m7 36 7 7m-10 3 8 5m-6 5 8 1m80-21-7 7m10 3-8 5m6 5-8 1"
          fill="none" stroke="#e9a9ad" strokeWidth="1.75" />
      </>;
    default:
      return null;
  }
}

function Scarf({ landmarks, seated }: { landmarks: Landmarks; seated: boolean }) {
  const face = measure(landmarks.face);
  const width = Math.max(face.width * .76, measure(landmarks.head).width * .32);
  const height = Math.max(14, face.height * .25);
  const center = face.x + face.width * (seated ? .43 : -.05);
  return <g transform={`translate(${center - width / 2} ${face.bottom - height * .29}) scale(${width / 100} ${height / 27})`}
    stroke="#985d52" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
    <path d="M48 16q11 12 10 33l18-2q3-20-8-36Z" fill="#c88778" />
    <path d="m62 41 1 6m5-7 1 6m5-8 1 6" fill="none" stroke="#f2b6a3" />
    <path d="M6 8q33 9 87-1l2 10Q60 32 8 22Z" fill="#d8a094" />
    <path d="M13 14q34 8 74-1" fill="none" stroke="#edbaaa" />
  </g>;
}

export function StorybookAvatarDetails({ appearance, pose, landmarks }: {
  appearance: Appearance;
  pose: StorybookPose;
  landmarks: Landmarks;
}) {
  const { accessory } = appearance;
  const head = measure(landmarks.head);
  return <g>
    <Expression appearance={appearance} eyes={landmarks.eyes} mouth={landmarks.mouth} />
    {accessory === 'glasses' ? <Glasses pose={pose} landmarks={landmarks} />
      : accessory === 'scarf' ? <Scarf landmarks={landmarks} seated={pose === 'seated'} />
        : accessory !== 'none' && <g transform={`translate(${head.left} ${head.top}) scale(${head.width / 100} ${head.height / 100})`}
          stroke={cocoa} strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round">
          <Headwear accessory={accessory} seated={pose === 'seated'} />
        </g>}
  </g>;
}

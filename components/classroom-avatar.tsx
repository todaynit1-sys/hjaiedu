import { memo, useId } from 'react';
import type { Character } from '../lib/types';

type Hair = 'waves' | 'crop' | 'spiky' | 'bob' | 'bun' | 'curls' | 'part' | 'long';
type Accessory = 'sprout' | 'clip' | 'glasses' | 'beanie' | 'cat' | 'ribbon' | 'earmuffs'
  | 'frog' | 'headphones' | 'scarf' | 'mushroom' | 'star' | 'axolotl';
type Outfit = {
  hair: Hair;
  hairLight: string;
  hairDark: string;
  skin: string;
  skinShade: string;
  shirt: string;
  shirtShade: string;
  accessory?: Accessory;
  detail?: 'knit' | 'puffer' | 'cardigan';
};

const avatars: Record<Character, Outfit> = {
  smile:    { hair: 'waves', hairLight: '#76584c', hairDark: '#302723', skin: '#ffddbf', skinShade: '#e8a185', shirt: '#a3a96c', shirtShade: '#626e45', detail: 'cardigan' },
  sprout:   { hair: 'bob',   hairLight: '#906450', hairDark: '#46302d', skin: '#ffe0c3', skinShade: '#eca88e', shirt: '#eee0bd', shirtShade: '#a5a96c', accessory: 'sprout', detail: 'knit' },
  cheer:    { hair: 'spiky', hairLight: '#a26347', hairDark: '#593327', skin: '#ffdbb6', skinShade: '#e6a07c', shirt: '#7cadd9', shirtShade: '#3a619f', detail: 'puffer' },
  glasses:  { hair: 'part',  hairLight: '#596280', hairDark: '#292b40', skin: '#ffdfcb', skinShade: '#e8a18e', shirt: '#f7e9d2', shirtShade: '#b4a087', accessory: 'glasses', detail: 'knit' },
  sleepy:   { hair: 'crop',  hairLight: '#52493e', hairDark: '#302823', skin: '#f5cbb0', skinShade: '#d69474', shirt: '#e0ccb7', shirtShade: '#a88c73', accessory: 'beanie', detail: 'knit' },
  cat:      { hair: 'long',  hairLight: '#675b79', hairDark: '#302b3d', skin: '#f8dbcc', skinShade: '#e3a292', shirt: '#d2b7d7', shirtShade: '#8b779d', accessory: 'cat' },
  rabbit:   { hair: 'bun',   hairLight: '#e3bd6d', hairDark: '#9a6139', skin: '#ffe3c4', skinShade: '#eda28c', shirt: '#f2dfb6', shirtShade: '#bc905c', accessory: 'ribbon' },
  puppy:    { hair: 'curls', hairLight: '#8c6451', hairDark: '#47322c', skin: '#eab98e', skinShade: '#ca876c', shirt: '#eec68f', shirtShade: '#ad794d', accessory: 'earmuffs' },
  frog:     { hair: 'part',  hairLight: '#56694a', hairDark: '#2e3c31', skin: '#f6d9ab', skinShade: '#dda07e', shirt: '#bdcc86', shirtShade: '#738a55', accessory: 'frog' },
  bear:     { hair: 'curls', hairLight: '#a77553', hairDark: '#593c2f', skin: '#dba37d', skinShade: '#b46f55', shirt: '#bc9f85', shirtShade: '#77563d', detail: 'cardigan' },
  penguin:  { hair: 'bob',   hairLight: '#68798d', hairDark: '#273342', skin: '#ffdfca', skinShade: '#edab95', shirt: '#9ac0d8', shirtShade: '#53789d', accessory: 'scarf' },
  hamster:  { hair: 'waves', hairLight: '#cb985d', hairDark: '#865031', skin: '#ffdfb8', skinShade: '#e9a885', shirt: '#f0ba71', shirtShade: '#ba7747', accessory: 'clip' },
  seal:     { hair: 'part',  hairLight: '#f0edf1', hairDark: '#9f9ab0', skin: '#e7bbad', skinShade: '#c98982', shirt: '#a6bacf', shirtShade: '#697995' },
  mushroom: { hair: 'bob',   hairLight: '#a15e48', hairDark: '#693d31', skin: '#ffdfc6', skinShade: '#eda488', shirt: '#f0ae96', shirtShade: '#a75850', accessory: 'mushroom' },
  acorn:    { hair: 'bun',   hairLight: '#9d7259', hairDark: '#56362d', skin: '#f4c7a6', skinShade: '#d68c73', shirt: '#e5bb82', shirtShade: '#a07753', accessory: 'clip' },
  cloud:    { hair: 'curls', hairLight: '#f3f2ec', hairDark: '#a5b6ca', skin: '#d7a982', skinShade: '#b97b62', shirt: '#e3edee', shirtShade: '#a3baca', detail: 'puffer' },
  chick:    { hair: 'spiky', hairLight: '#eac76f', hairDark: '#b07a42', skin: '#ffe4b6', skinShade: '#eba889', shirt: '#f0d16f', shirtShade: '#b18a42', accessory: 'star' },
  otter:    { hair: 'crop',  hairLight: '#876451', hairDark: '#47362f', skin: '#daa783', skinShade: '#b97d64', shirt: '#9bbccc', shirtShade: '#526f85', accessory: 'scarf' },
  panda:    { hair: 'long',  hairLight: '#667278', hairDark: '#292f36', skin: '#ffdabc', skinShade: '#eaa188', shirt: '#e1dfd6', shirtShade: '#74808c', accessory: 'headphones' },
  axolotl:  { hair: 'bun',   hairLight: '#eea7b2', hairDark: '#aa607e', skin: '#ffe1cd', skinShade: '#eeac9d', shirt: '#d6b4ce', shirtShade: '#a26f9c', accessory: 'axolotl' }
};

const teacher: Outfit = {
  hair: 'part', hairLight: '#5f5148', hairDark: '#2f2928', skin: '#f8d4b6', skinShade: '#d99a7f',
  shirt: '#688d85', shirtShade: '#345450', accessory: 'glasses'
};

const hairPaths: Record<Hair, string> = {
  waves: 'M29 31q-3-1-4-5 3-1 2-5-4-4 1-7 1-5 7-7 2-4 8-3 3-1 6 1 8-2 12 4 6 1 5 7 3 3 0 8l-5 7-2-10q-4 1-6-5-4 7-12 7 2-3 2-5-5 6-11 7l-.8 6Z',
  crop: 'M29 30q-4-5-2-12 0-7 8-11 6-3 12-2 13 0 17 8 3 6-1 15l-3-2-1-9q-9 5-18 1-3 4-9 6l-1 6Z',
  spiky: 'M29 30q-3-4-3-9l-3-5 7-2-1-5 8 .4L41 4l7 3 6-4 3 5 8-1-1 6 5 4-4 4 1 5-5 4-2-11-5 3-5-5-7 6-1-5-7 5-2 7Z',
  bob: 'M29 34q-5-1-5-7 0-12 7-17 7-7 17-6 14 1 17 13 3 9-1 17-1 4-6 4l1-14q-8 .7-14-8-5 6-13 7l.6 13Z',
  bun: 'M29 30q-3-2-4-7-2-9 5-14 5-5 14-5 14-1 19 8 4 8-1 17l-3-2-.7-9q-9 2-15-7-4 10-12 12l-.5 6Z',
  curls: 'M29 32q-5-1-4-6-5-3-2-7-2-5 3-7 0-5 6-6 2-4 8-3 5-2 8 1 5-2 9 2 5-1 7 5 5 2 3 7 3 5-1 8l-4 5-2-11q-4 1-6-2-4 4-8 1-4 4-9 2-2 4-6 4l-1 7Z',
  part: 'M29 29q-3-2-4-6-1-10 7-15 4-3 12-4 9-1 15 4 7 4 6 13-.4 4-4 8l-2-9q-9 1-15-9-2 8-12 11l-1 7Z',
  long: 'M28 39q-5 1-5-6 2-5 1-12-1-12 11-16 12-4 21 2 10 4 9 15 0 7 2 11 1 6-6 7l-3-6 1-14q-9 0-15-8-4 8-13 10l1 12Z'
};

function HairAccessory({ accessory }: { accessory: Outfit['accessory'] }) {
  switch (accessory) {
    case 'sprout':
      return <g stroke="#526844"><path d="M52 12 52 5" /><path d="M52 7q-7-.5-8-6 6-.7 8 6Zm0 0q0-6 8-6-1 5-8 6Z" fill="#9cc484" /></g>;
    case 'clip':
      return <path d="m31 18 5-4m-3 7 5-4" fill="none" stroke="#ffda82" strokeWidth="2" />;
    case 'glasses':
      return <g stroke="#463844" strokeWidth="1.25"><rect x="31.7" y="24.5" width="11.3" height="8.5" rx="3.6" fill="none" /><rect x="47.2" y="24.5" width="11.3" height="8.5" rx="3.6" fill="none" /><path d="M43 28h4.2m-18-1 2.5.5m26.8 0 2.3-.9" /></g>;
    case 'beanie':
      return <g fill="#a7a66e" stroke="#615c43"><path d="M26 19q-1-13 13-17 13-3 21 6 3 4 4 9Z" /><path d="M28 19q10-7 32-7 5 1 5 5l-1 3q-19-.4-36 4-4 0-3-3Z" fill="#c3b985" /><path d="M33 13q1-5 5-8m2 6q1-6 4-8m2 8q2-6 4-7m3 6q2-2 1-4" opacity=".55" /></g>;
    case 'cat':
      return <g stroke="#574559" fill="#a88aa7"><path d="m31 14-.8-9q0-1.7 2.2-.8l7.2 5.2m16-.8 7-5q1.8-.9 1.8 1.1l-.8 9" /><path d="m33 11 .4-3 3.6 2m23 .2L62 7l-.2 4.6" stroke="#f1b3b8" /></g>;
    case 'ribbon':
      return <path d="M54 12q-7 1-6-5 1-2 8 2 4-8 7-6 3 4-5 9 4 2 4 6-3 1-6-5l-5 5q-2 0-2-2Z" fill="#f8e9ce" stroke="#977458" />;
    case 'earmuffs':
    case 'headphones': {
      const fill = accessory === 'earmuffs' ? '#e4b181' : '#434a57';
      return <g stroke="#54475b"><path d="M26 28q-1-17 11-21 14-4 24 7 4 5 3 13" fill="none" strokeWidth="2.3" /><ellipse cx="27" cy="29" rx="3.6" ry="5" fill={fill} /><ellipse cx="63" cy="28.5" rx="3.5" ry="4.8" fill={fill} /></g>;
    }
    case 'frog':
      return <g fill="#a9be73" stroke="#526844"><path d="M28 15q-1-7 5-7 3 0 4 2 6-2 14 0 4-5 8-2 2 1 2 7-19-2-33 2Z" /><circle cx="33" cy="12" r="1" fill="#42543e" /><circle cx="57" cy="11" r="1" fill="#42543e" /></g>;
    case 'mushroom':
      return <g><path d="M26 17q2-12 13-15 16-5 25 12 1.5 4-4 4-8-4-17-3-8 .6-13 4-4 .7-4-2Z" fill="#d68a78" stroke="#925a56" /><path d="M34 11q0-3 4-2m5-4q3-2 6 0m4 4q4-1 5 2" fill="none" stroke="#f7d9c4" strokeWidth="2.5" /></g>;
    case 'star':
      return <path d="m60 10 1.5 3.5 3.9.2-3 2.6.9 3.8-3.3-2-3.5 1.9.9-3.7-2.9-2.8 4-.1Z" fill="#ffdb78" stroke="#a97545" />;
    case 'axolotl':
      return <path d="m28 16-4-4m4 7-5-1m6 4-5 1m37-8 4-5m-4 9 6-2m-6 6 6 1" fill="none" stroke="#f3a6ae" strokeWidth="2.4" />;
    default:
      return null;
  }
}

function Face({ sleepy, delighted, shade }: { sleepy: boolean; delighted: boolean; shade: string }) {
  return <g>
    <path d="M33 25q3-1.6 5.6-.6m9.5-1.1q3-1.3 6 .1" fill="none" stroke="#58403a" opacity=".75" strokeWidth=".85" />
    {sleepy ? <path d="M34.8 28.5q2.6 2.8 5 .1m8.8-.9q2.9 2.4 5.2-.7" fill="none" stroke="#473433" strokeWidth="1.3" /> : <g fill="#392d33" stroke="none">
      <ellipse cx="37.6" cy="28.4" rx="1.7" ry="2.8" /><ellipse cx="51.5" cy="27.5" rx="1.9" ry="3" />
      <circle cx="38.1" cy="27.4" r=".65" fill="#fffaf5" /><circle cx="52" cy="26.5" r=".7" fill="#fffaf5" />
    </g>}
    <path d="m45.1 30.5 1.2 1.2-1.2.6" stroke={shade} fill="none" strokeWidth=".95" />
    {delighted ? <path d="M41.2 33.8q4 1.2 8.5-.8-1.3 4.5-4.7 4.2-2.5-.2-3.8-3.4Z" fill="#c87571" stroke="#824b48" strokeWidth=".75" />
      : <path d={sleepy ? 'M43 34.7q2-.9 3.5-.1' : 'M42.3 34.3q3 1.9 6-.6'} stroke="#9b554f" fill="none" strokeWidth="1.05" />}
    <g fill="#e9998d" stroke="none" opacity=".56"><ellipse cx="33.4" cy="32.1" rx="2.5" ry="1.2" /><ellipse cx="55.6" cy="31.2" rx="2.9" ry="1.3" /></g>
  </g>;
}

export const AvatarArt = memo(function AvatarArt({ character, pose, instructor = false }: {
  character: Character;
  pose: 'portrait' | 'seated' | 'walking' | 'actor';
  instructor?: boolean;
}) {
  const id = useId();
  const outfit = instructor ? teacher : avatars[character];
  const standingArms = pose === 'walking' || pose === 'actor';
  const seatedArms = pose === 'seated' || pose === 'actor';
  const sleeve = `url(#${id}-shirt)`;
  const skin = `url(#${id}-skin)`;
  const hair = `url(#${id}-hair)`;
  return <g fill="none" stroke="#58413a" strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id={`${id}-hair`} x1="0" y1="0" x2="1" y2=".95" gradientUnits="objectBoundingBox">
        <stop offset="0" stopColor={outfit.hairLight} /><stop offset="1" stopColor={outfit.hairDark} />
      </linearGradient>
      <linearGradient id={`${id}-skin`} x1="0" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox">
        <stop offset=".35" stopColor={outfit.skin} /><stop offset="1" stopColor={outfit.skinShade} />
      </linearGradient>
      <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2=".85" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0" stopColor={outfit.shirt} /><stop offset="1" stopColor={outfit.shirtShade} />
      </linearGradient>
    </defs>
    {standingArms && <>
      <ellipse className="classroom-actor-shadow" cx="45" cy="60.1" rx="16.2" ry="3.1" fill="#44302c" opacity=".2" stroke="none" />
      <g className="classroom-actor-legs">
        <g className="walker-foot left"><path d="M35.5 49.5h8l-.5 7.2h-7Z" fill="#586074" /><path d="M35.8 55.7q3 1.6 7.5 0l.3 2.1q-1.5 2.5-8.5 1.2-2.5-.9.7-3.3Z" fill="#584c47" /><path d="M35.1 58.6q4.4.8 7.4-.1" stroke="#cbbba8" strokeWidth=".8" /></g>
        <g className="walker-foot right"><path d="M46 49.5h8.5l-1 7.2h-7Z" fill="#6a7486" /><path d="M46.5 55.5q3.1 1.6 7.6.1 3 1.5 2.8 2.6-.8 1.8-9.3 1.1-2.1-.5-1.1-3.8Z" fill="#584c47" /><path d="M48 58.6q4.2.8 7.6-.2" stroke="#cbbba8" strokeWidth=".8" /></g>
      </g>
    </>}
    <g className="classroom-actor-body">
    <path d="M30 46q0-6.5 7-8l7.4-2 9.3 2.6q5.4 1.8 6.1 8l-1.6 4.2q-12 4.6-25.8.4Z" fill={sleeve} />
    <path d="M33 48.8q11 3 24 0l-.5 2.4q-10.8 3.9-23.3.4Z" fill={outfit.shirtShade} stroke="none" opacity=".7" />
    <path d="M37 40q7.3 4.6 14.3 0" stroke="#fff7e6" strokeWidth="1.8" fill="none" opacity=".8" />
    <path d="M35 45.5 34.6 49m20.1-4.2.7 3.7M37.5 47.6q2.5.7 4.1.8m6.9-.1 3.2-.7" stroke={outfit.shirtShade} fill="none" />
    {outfit.detail === 'knit' && <path d="m36 44 2 1.6 2-1.4 2 1.6 2-1.4 2 1.6 2-1.5 2 1.2 2-1.8" fill="none" stroke={outfit.shirtShade} strokeWidth=".8" />}
    {outfit.detail === 'puffer' && <path d="M34 44.7q10 2.8 21-.4M34.3 47.7q9 2.7 20.5-.3" fill="none" stroke="#fff5e2" strokeWidth=".65" opacity=".46" />}
    {outfit.detail === 'cardigan' && <g><path d="M44.7 43 45.3 52.4" fill="none" stroke={outfit.shirtShade} /><circle cx="46.7" cy="46.2" r=".64" fill="#f2d6a2" stroke="none" /><circle cx="46.9" cy="49.2" r=".64" fill="#f2d6a2" stroke="none" /></g>}
    {standingArms && <g className="classroom-actor-standing-arms"><path d="M31.5 42.1q-2 2.1-2.2 5.5-.2 2.2 2 2.7 2.1.4 2.7-2.4l1.1-4.3" fill={sleeve} /><path d="M55.3 42q2.8.2 4.5 3.2l1.7 2.1-2.3 2.1q-3-.6-4.3-4.4" fill={sleeve} /><path d="M29.4 48q2.6 1 4.3.1l-.2 2.2q-.8 1.5-2.4 1.1-1.8-.5-1.7-3.4Zm30.8-2q1.5-2 3.3-.8 1.1 1.1-.3 3.2-1 1.3-3.6 1Z" fill={skin} strokeWidth=".8" /></g>}
    {seatedArms && <g className="classroom-actor-seated-arms"><path d="M31.4 43.5q.3 3.8 6.9 4.8m18.7-4q.7 3.4-4.4 4.2" fill="none" stroke={outfit.shirtShade} /><ellipse cx="39.2" cy="48.5" rx="2.7" ry="1.6" fill={skin} strokeWidth=".75" /><ellipse cx="51.8" cy="48.5" rx="2.7" ry="1.6" fill={skin} strokeWidth=".75" /></g>}
    {instructor && <g><path d="m43 40 2.2 2.3 2.1-2.6m-2.1 2.6 1 6.3" fill="none" stroke="#e6e5d6" /><rect x="48.5" y="44.2" width="4.4" height="3.2" rx=".6" fill="#ebcc8d" strokeWidth=".65" /></g>}
    <g className="classroom-actor-face" transform={pose === 'seated' ? 'rotate(-3 45 28)' : undefined}>
      {outfit.hair === 'bun' && <circle cx="37.7" cy="7.1" r="6.5" fill={hair} stroke={outfit.hairDark} />}
      <path d="M28 22q0-12 10-15 14-5 22 4 4 5 3 15l-3 8H30Z" fill={hair} stroke={outfit.hairDark} />
      <path d="M31 28q-5-4-6 1 .4 4.5 6.3 4.4m27.4-6.6q4.8-5 6.1-1 .9 4.7-5.1 6" fill={skin} stroke="#855847" strokeWidth=".95" />
      <path d="M29.7 25.4q-1-10.5 8.2-13.7 10-3.5 18 2.9 5 4.5 4.5 11.5-.4 10.5-8.4 13.5-5.7 2.5-13.4.5-7.8-2-8.9-14.7Z" fill={skin} stroke="#855847" />
      <path d={hairPaths[outfit.hair]} fill={hair} stroke={outfit.hairDark} strokeWidth="1.1" />
      <path d="M30 17q1-5 7-8 5-2 11-1m3 1q5 1 8 4m-23-1q-2 3-4 6" stroke="#fff1d8" strokeWidth="1.05" opacity=".27" fill="none" />
      <Face sleepy={character === 'sleepy' && !instructor} delighted={character === 'cheer' || character === 'smile'} shade={outfit.skinShade} />
      <HairAccessory accessory={outfit.accessory} />
    </g>
    {outfit.accessory === 'scarf' && <path d="M36 39q8 2.7 18-1l1.5 3.7q-3 .8-4.1 1.3l1 5.8-4.1.7-1.5-5.7q-6 .8-11.4-2.4Z" fill="#d69279" stroke="#925b54" />}
    </g>
  </g>;
});

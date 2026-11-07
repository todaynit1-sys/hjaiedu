import { memo, useId } from 'react';
import { isHumanHair, type AvatarCustomization, type HumanHair } from '../lib/avatar-customization';
import type { Character } from '../lib/types';

type Outfit = {
  hair: HumanHair;
  hairLight: string;
  hairDark: string;
  skin: string;
  skinShade: string;
  shirt: string;
  shirtShade: string;
  accessory?: AvatarCustomization['accessory'];
  detail?: AvatarCustomization['clothing'];
};

type ColorPart = 'hairColor' | 'skin' | 'clothingColor';

export const avatarPalettes = {
  hairColor: {
    black: ['#5f5148', '#2f2928'],
    brown: ['#906450', '#46302d'],
    blond: ['#e3bd6d', '#9a6139'],
    pink: ['#eea7b2', '#aa607e'],
    silver: ['#f0edf1', '#9f9ab0'],
    navy: ['#596280', '#292b40'],
  },
  skin: {
    porcelain: ['#ffdfcb', '#e8a18e'],
    peach: ['#f5cbb0', '#d69474'],
    honey: ['#eab98e', '#ca876c'],
    bronze: ['#dba37d', '#b46f55'],
    deep: ['#ac7258', '#744635'],
  },
  clothingColor: {
    cream: ['#f7e9d2', '#b4a087'],
    sage: ['#a3a96c', '#626e45'],
    sky: ['#9ac0d8', '#53789d'],
    lavender: ['#d2b7d7', '#8b779d'],
    rose: ['#f0ae96', '#a75850'],
    amber: ['#f0ba71', '#ba7747'],
    navy: ['#627da7', '#384963'],
  },
} as const satisfies { [Part in ColorPart]: Record<AvatarCustomization[Part], readonly [string, string]> };

const avatars: Record<Character, Outfit> = {
  smile:    { hair: 'waves', hairLight: '#8a6250', hairDark: '#4b3028', skin: '#ffddbf', skinShade: '#e8a185', shirt: '#89944c', shirtShade: '#5a632f', detail: 'cardigan' },
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

const starterColors: Record<Character, readonly [
  hairColor: AvatarCustomization['hairColor'],
  skin: AvatarCustomization['skin'],
  clothingColor: AvatarCustomization['clothingColor'],
]> = {
  smile: ['brown', 'porcelain', 'sage'],
  sprout: ['brown', 'porcelain', 'cream'],
  cheer: ['brown', 'porcelain', 'sky'],
  glasses: ['navy', 'porcelain', 'cream'],
  sleepy: ['black', 'peach', 'cream'],
  cat: ['navy', 'porcelain', 'lavender'],
  rabbit: ['blond', 'porcelain', 'cream'],
  puppy: ['brown', 'honey', 'amber'],
  frog: ['black', 'peach', 'sage'],
  bear: ['brown', 'bronze', 'amber'],
  penguin: ['navy', 'porcelain', 'sky'],
  hamster: ['blond', 'porcelain', 'amber'],
  seal: ['silver', 'peach', 'sky'],
  mushroom: ['brown', 'porcelain', 'rose'],
  acorn: ['brown', 'peach', 'amber'],
  cloud: ['silver', 'bronze', 'sky'],
  chick: ['blond', 'porcelain', 'amber'],
  otter: ['brown', 'bronze', 'sky'],
  panda: ['black', 'porcelain', 'cream'],
  axolotl: ['pink', 'porcelain', 'lavender'],
};

function presetExpression(character: Character): AvatarCustomization['expression'] {
  if (character === 'sleepy') return 'sleepy';
  return character === 'cheer' || character === 'smile' ? 'grin' : 'smile';
}

export function starterAvatar(character: Character): AvatarCustomization {
  const outfit = avatars[character];
  const [hairColor, skin, clothingColor] = starterColors[character];
  return {
    hair: outfit.hair, hairColor, skin, clothingColor,
    expression: presetExpression(character),
    clothing: outfit.detail ?? 'plain',
    accessory: outfit.accessory ?? 'none',
  };
}

function customOutfit(avatar: AvatarCustomization): Outfit {
  const [hairLight, hairDark] = avatarPalettes.hairColor[avatar.hairColor];
  const [skin, skinShade] = avatarPalettes.skin[avatar.skin];
  const [shirt, shirtShade] = avatarPalettes.clothingColor[avatar.clothingColor];
  return {
    hair: isHumanHair(avatar.hair) ? avatar.hair : 'crop', hairLight, hairDark, skin, skinShade, shirt, shirtShade,
    accessory: avatar.accessory, detail: avatar.clothing,
  };
}

export function avatarAppearance(character: Character, avatar?: AvatarCustomization, instructor = false) {
  const outfit = instructor ? teacher : avatar ? customOutfit(avatar) : avatars[character];
  const expression = instructor ? 'smile' : avatar?.expression ?? presetExpression(character);
  return { ...outfit, expression, pants: '#444856', pantsLight: '#626578', shoes: '#79523e' };
}

const hairPaths: Record<HumanHair, string> = {
  waves: 'M27 33c-4.9-1.6-6-6.5-2.8-9.4-2.8-3-1.1-8.5 2.6-10.6 1.5-5 6.7-8.7 12.7-8.1 2.9-2.4 7.9-2.4 11.7-.6 5.8-.1 10.6 3.4 12 8.8 4.7 2.9 5.5 9.3 2 13.1l-4.1 4.2-.8-9.9c-3.8 1.6-6.2-1.5-7.8-4.4-3.3 5.6-8.4 8.1-13.2 7.4.9-1.3 1.5-2.6 1.6-3.9-3.7 4.8-7.6 6.3-10.8 5.5Z',
  crop: 'M29 30q-4-5-2-12 0-7 8-11 6-3 12-2 13 0 17 8 3 6-1 15l-3-2-1-9q-9 5-18 1-3 4-9 6l-1 6Z',
  spiky: 'M29 30q-3-4-3-9l-3-5 7-2-1-5 8 .4L41 4l7 3 6-4 3 5 8-1-1 6 5 4-4 4 1 5-5 4-2-11-5 3-5-5-7 6-1-5-7 5-2 7Z',
  bob: 'M29 34q-5-1-5-7 0-12 7-17 7-7 17-6 14 1 17 13 3 9-1 17-1 4-6 4l1-14q-8 .7-14-8-5 6-13 7l.6 13Z',
  bun: 'M29 30q-3-2-4-7-2-9 5-14 5-5 14-5 14-1 19 8 4 8-1 17l-3-2-.7-9q-9 2-15-7-4 10-12 12l-.5 6Z',
  curls: 'M29 32q-5-1-4-6-5-3-2-7-2-5 3-7 0-5 6-6 2-4 8-3 5-2 8 1 5-2 9 2 5-1 7 5 5 2 3 7 3 5-1 8l-4 5-2-11q-4 1-6-2-4 4-8 1-4 4-9 2-2 4-6 4l-1 7Z',
  part: 'M29 29q-3-2-4-6-1-10 7-15 4-3 12-4 9-1 15 4 7 4 6 13-.4 4-4 8l-2-9q-9 1-15-9-2 8-12 11l-1 7Z',
  long: 'M28 39q-5 1-5-6 2-5 1-12-1-12 11-16 12-4 21 2 10 4 9 15 0 7 2 11 1 6-6 7l-3-6 1-14q-9 0-15-8-4 8-13 10l1 12Z',
  ponytail: 'M29 30q-4-2-5-7-1-10 8-15 7-4 16-4 12 .1 16 9 4 9-3 16l-2-8q-8-.3-14-9-3.5 8.7-12.5 11.1L31 30Z',
  pigtails: 'M29 30q-5-2-5-8.4C24.8 10 32.6 3.4 44.6 4q14.6-1.5 19.6 9.3c2.7 6.4 1.3 11.8-3.6 15.1l-1.4-6.6Q51 21 44.4 13q-3.3 7.6-12.9 10.5Z',
  braid: 'M29 32q-5-2-5-9.5-1-9.2 7.9-14.7 6.6-5.8 14.6-4.2 14.8 0 18.6 10.9 2.8 8.9-3.2 15.3l-3.1-8.4q-9.9.4-14.7-8.9-3.2 9.1-11.9 11.2Z',
  undercut: 'M27 26.4q-3.9-7.8.9-14.9 3.9-6.8 11.9-7.9 12.6-2.8 22.3 3.6 5.4 4.6 2.7 11.4l-4.4 3.3-1.6-7.2q-9.1 2.5-17.6-.9-3.2 5.9-12.2 6.3L29 27Z',
};

const locks: Record<HumanHair, readonly string[]> = {
  waves: [
    'M24 21C25 13 32 8 42 8c-3.6 6-8.8 12-18 13Z',
    'M26 27c8.3-3 13.7-10.7 17.2-20 5.1-.6 7.6 1.4 7.1 5.3C48 22 37.2 28.7 26 27Z',
    'M38 25.9c9.4-5.7 13.4-13.4 13-19.2 4.7.5 8 3.4 6.7 8.4-1.2 4.5-8.3 10.8-19.7 10.8Z',
    'M55 9c9.6 1.1 13.5 9 10.1 16.9-6.4-.9-10-7.2-10.1-16.9Z',
  ],
  crop: [
    'M25 23c3.9-10.2 12.7-14.7 23.3-16.9C46 13.8 38.3 22.5 25 23Z',
    'M39 16C44 10.3 49 7.6 55.4 7.4c5.9 3.6 8.7 7.5 8.8 13.1-6-6.5-14.9-1.5-25.2-4.5Z',
  ],
  spiky: [
    'M24 20C26.4 12.2 34.3 9 42 7c-1.3 6.9-7.7 14.7-18 13Z',
    'M35.6 23.4c8-6 11-12.3 14.5-18.4 2.3 1.7 3.8 3.7 2.3 7.5-2.5 5.9-7.9 10-16.8 10.9Z',
    'M51 8.3c6-1.6 11.1.3 15.2 4.5-.1 4.9-3 6.7-6.8 7.5C58.6 16 55.2 11 51 8.3Z',
  ],
  bob: [
    'M25 33c-2-9 1.7-18.2 10.7-23.7 4.5-2.9 9.2-3.9 13.3-3-4.5 6.1-14.7 10.7-16.8 26.3-1.7 2.4-4.1 2.4-7.2.4Z',
    'M45 6c10.3-3.2 19.7 5.3 21.3 15.3 1 8.2-.2 14.5-6 17.1-4.9-5.5 1.2-11.7-3.6-20.2-3.3-5.2-7.2-7.5-11.7-12.2Z',
  ],
  bun: [
    'M25 25C22.4 16.5 29.1 7.8 42 6c-1.4 8-8.6 16.8-17 19Z',
    'M40 6c10.6-3.8 23.2 4.4 24.5 15-7.8-2.6-13.7-5.2-24.5-15Z',
  ],
  curls: [
    'M25 21c-3.8-5.1 1.5-11.1 6.1-8.9-1.9-6.9 7.9-9.1 9.7-3.2 2.8 8.5-9.9 17.1-15.8 12.1Z',
    'M36 19.7c-2.2-5 3.2-10.1 7.8-8.2-1.5-6.5 8.3-8.1 9.8-2.4 2.3 7.5-10.7 16.7-17.6 10.6Z',
    'M50.6 15.4c.1-6.1 9-7.3 10.3-1.4 5.9.4 7.1 8.2 1.9 10.6-5.5 1.9-12.7-4-12.2-9.2Z',
  ],
  part: [
    'M24.6 25.8C26 13.3 31.6 8 45.6 5.7c-3 7.3-9.9 17.1-21 20.1Z',
    'M43 6.8c8.4-4 18.4 2.4 22 9.7 1.9 3.5.7 8.7-2 11-2.2-10-15.5-13.8-20-20.7Z',
  ],
  long: [
    'M23.3 39c2.3-10.5-4.9-21.1 8.9-30 4-2.7 8.4-3.4 13-3.2-4.2 7.1-16.1 10.4-13.7 32.7-2 2.5-5 3.4-8.2.5Z',
    'M44 6.5c12.9-5.4 22.3 5.8 20 20.3-.2 4.7 5.6 9.1 1.4 12.6-3.4 2.1-7.9-1.4-7.9-7.7C62.3 17 50 13.5 44 6.5Z',
  ],
  ponytail: [
    'M24.8 24.7C27 15.7 33 8.5 45.5 6.4c-3.5 8.3-10.6 16-20.7 18.3Z',
    'M43 7.1c11.3-3.9 20.3 5 20.4 14-10.5-3.1-15.8-6.8-20.4-14Z',
  ],
  pigtails: [
    'M24.2 24.1C24.5 15 33.4 6.9 44.8 6c-2.9 9.9-9.8 17-20.6 18.1Z',
    'M44.5 5.6c13.2-2.1 19.1 6.7 20.4 16.1-9.3-1.7-15.1-6.8-20.4-16.1Z',
  ],
  braid: [
    'M25.6 25.2C25.6 13.1 32 8 45.8 5.4c-1.8 7.9-8.7 17.2-20.2 19.8Z',
    'M44.9 6.2c10.4-3.5 18 6.5 19.3 13.8-10.9-3.3-15.3-6.2-19.3-13.8Z',
  ],
  undercut: [
    'M26.4 18.2c1.8-8 9.8-13.4 21.1-13.9-4.8 6.2-11.7 11.9-21.1 13.9Z',
    'M42 8.6c8.9-4.4 18.7-2.8 23.7 4.3-8.6 1.5-16.5 1.2-23.7-4.3Z',
  ],
};

function HairTail({ style, fill, shade }: { style: HumanHair; fill: string; shade: string }) {
  if (style === 'ponytail') return <g>
    <path d="M32 11c-6-6.5-13.1-2.7-14.7 3.3-2.1 8.8 6.2 16.6 2.4 27.1 11.4-1.4 14.1-12.9 10.8-20.8Z" fill={fill} />
    <path d="M24.5 11.8c-5.6 5.9-.9 15 1.8 20.1" fill="none" stroke={shade} strokeWidth=".8" />
    <ellipse cx="30" cy="13.4" rx="3.5" ry="2.4" fill="#e6a590" />
  </g>;
  if (style === 'pigtails') return <g fill={fill}>
    <path d="M29 18c-7.5-4.1-11.4.7-11.1 7.4 0 5.1 2.8 9.9 1.9 15.1 9.8-3.5 11-13.1 7.6-18.3Z" />
    <path d="M61 18c7.1-3.6 12.2 1 11.6 7.4-.4 5.6-3.6 10.1-2.5 15.1-9.7-3-11.9-12.3-8.9-18.3Z" />
    <path d="M22 23q-1.6 6.7 1.4 12m44.5-12q1.9 6.1-1.1 12" fill="none" stroke={shade} strokeWidth=".8" />
    <ellipse cx="27" cy="20" rx="3.5" ry="2.2" fill="#d393aa" /><ellipse cx="63" cy="20" rx="3.5" ry="2.2" fill="#d393aa" />
  </g>;
  if (style === 'braid') return <g>
    <path d="M30 20c-6.9 1-8.3 5.2-7.7 8.9-3.9 1.5-4.4 6.2-2.7 8.8-2.1 3-1 6.9 2.9 9.9 3.4-1.6 4.9-3.9 3.1-7.1 3.5-2.1 4.2-5.8 2-8.3 3.7-2.6 5.1-6.9 2.4-12.2Z" fill={fill} />
    <path d="m23.3 28.2 4.8 3.7m-7.2 4.9 5 3.1m-5.2 3.8 3.5 1.4" fill="none" stroke={shade} strokeWidth=".9" />
    <path d="m19.6 43.3 5 1.5" fill="none" stroke="#dda27b" strokeWidth="1.6" />
  </g>;
  return null;
}

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

function Face({ expression, cheek, nose, mouth }: {
  expression: AvatarCustomization['expression'];
  cheek: string;
  nose: string;
  mouth: string;
}) {
  const sleepy = expression === 'sleepy';
  const grin = expression === 'grin';
  return <g>
    <ellipse cx="33.5" cy="33.2" rx="5.5" ry="3.7" fill={cheek} />
    <ellipse cx="56.7" cy="32.5" rx="5" ry="3.4" fill={cheek} />
    <path d="M35 24.4q2.2-1.7 4.9-.8m10.4-.5q2.5-1.8 4.6-.3" fill="none" stroke="#55382d" opacity=".86" strokeWidth="1.12" />
    {sleepy
      ? <path d="M35.7 28.8q2.2 2.3 4.8 0m9.3-.7q2.4 2 4.9-.5" fill="none" stroke="#4b342e" strokeWidth="1.4" />
      : <g fill="#3b2c2a">
        <ellipse cx="38.1" cy="28.7" rx="1.85" ry="2.65" />
        <ellipse cx="52.4" cy="27.9" rx="1.8" ry="2.65" />
        <ellipse cx="37.8" cy="27.9" rx=".45" ry=".64" fill="#b4927d" opacity=".6" />
        <ellipse cx="52.1" cy="27.1" rx=".44" ry=".63" fill="#b4927d" opacity=".6" />
      </g>}
    <ellipse cx="46.8" cy="31.2" rx="1.5" ry=".95" fill={nose} />
    {sleepy
      ? <path d="M44.2 34.8q1.8-.9 3.6-.1" fill="none" stroke="#9b554f" strokeWidth=".9" />
      : <g>
        <path d={grin ? 'M41.6 33.8q4.6.5 9.1-1-.8 4.9-4.6 4.9-3.3-.1-4.5-3.9Z' : 'M43 34.3q3.9.2 7.1-1-.9 3.7-3.9 3.8-2.5-.1-3.2-2.8Z'} fill={mouth} />
        <path d={grin ? 'M43.9 36.6q2.3-1.5 5.1-.5-1.1 1.7-3 1.6-1.1-.1-2.1-1.1Z' : 'M44.8 36.4q1.5-1 3.8-.7-.9 1.4-2.5 1.4-.7 0-1.3-.7Z'} fill="#dd806e" />
      </g>}
  </g>;
}

export const AvatarArt = memo(function AvatarArt({ character, avatar, pose, instructor = false }: {
  character: Character;
  avatar?: AvatarCustomization;
  pose: 'portrait' | 'seated' | 'walking' | 'actor';
  instructor?: boolean;
}) {
  const id = useId();
  const outfit = avatarAppearance(character, avatar, instructor);
  const standingArms = pose === 'walking' || pose === 'actor';
  const seatedArms = pose === 'seated' || pose === 'actor';
  const sleeve = `url(#${id}-shirt)`;
  const skin = `url(#${id}-skin)`;
  const hair = `url(#${id}-hair)`;
  const shoes = `url(#${id}-shoes)`;
  const trousers = `url(#${id}-pants)`;
  const knit = `url(#${id}-knit)`;
  const layer = outfit.detail === 'vest' || outfit.detail === 'overalls';
  const sleeveColor = layer ? '#e8d8bf' : sleeve;
  const jersey = 'M29.6 45.6c.1-4 3.2-7 7.8-7.7l7.3-1.8 8.9 2.3c4.8 1.2 6.3 4.3 6.5 7.7l-1.7 4.2c-5.7 3.5-20.1 4.2-25.8.5Z';
  return <g fill="none" stroke="none" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <radialGradient id={`${id}-hair`} cx=".31" cy=".23" r=".81">
        <stop offset=".15" stopColor={outfit.hairLight} />
        <stop offset="1" stopColor={outfit.hairDark} />
      </radialGradient>
      <linearGradient id={`${id}-lock`} x1=".18" y1="0" x2=".84" y2=".96">
        <stop offset="0" stopColor={outfit.hairDark} />
        <stop offset=".31" stopColor={outfit.hairLight} />
        <stop offset=".52" stopColor={outfit.hairLight} />
        <stop offset="1" stopColor={outfit.hairDark} />
      </linearGradient>
      <clipPath id={`${id}-fringe`}><path d={hairPaths[outfit.hair]} /></clipPath>
      <radialGradient id={`${id}-skin`} cx=".4" cy=".4" r=".67">
        <stop offset=".35" stopColor={outfit.skin} />
        <stop offset="1" stopColor={outfit.skinShade} />
      </radialGradient>
      <radialGradient id={`${id}-cheek`}>
        <stop offset=".12" stopColor="#e47669" stopOpacity=".56" />
        <stop offset="1" stopColor="#e47669" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-nose`} x1="0" y1="0" x2=".4" y2="1">
        <stop offset=".2" stopColor={outfit.skin} />
        <stop offset="1" stopColor={outfit.skinShade} />
      </linearGradient>
      <linearGradient id={`${id}-mouth`} x2="0" y2="1">
        <stop stopColor="#632d2c" />
        <stop offset="1" stopColor="#ad5247" />
      </linearGradient>
      <radialGradient id={`${id}-shirt`} cx=".32" cy=".18" r=".85">
        <stop offset=".15" stopColor={outfit.shirt} />
        <stop offset="1" stopColor={outfit.shirtShade} />
      </radialGradient>
      <pattern id={`${id}-knit`} width="1.6" height="1.6" patternUnits="userSpaceOnUse">
        <path d="M.27.08l.5.66-.47.6m1.12-1.26-.48.66.48.6" stroke="#fff6d8" strokeWidth=".17" opacity=".28" />
      </pattern>
      <linearGradient id={`${id}-pants`} x2="1" y2=".73">
        <stop stopColor={outfit.detail === 'overalls' ? outfit.shirt : outfit.pantsLight} />
        <stop offset=".8" stopColor={outfit.detail === 'overalls' ? outfit.shirtShade : outfit.pants} />
        <stop offset="1" stopColor="#353543" />
      </linearGradient>
      <linearGradient id={`${id}-shoes`} x2=".47" y2="1">
        <stop stopColor="#a77453" />
        <stop offset=".8" stopColor={outfit.shoes} />
        <stop offset="1" stopColor="#58392f" />
      </linearGradient>
      <radialGradient id={`${id}-ground`}>
        <stop offset=".15" stopColor="#4d2b1f" stopOpacity=".27" />
        <stop offset="1" stopColor="#4d2b1f" stopOpacity="0" />
      </radialGradient>
    </defs>
    {standingArms && <>
      <ellipse className="classroom-actor-shadow" cx="45" cy="60.5" rx="16.2" ry="3.3" fill={`url(#${id}-ground)`} />
      <g className="classroom-actor-legs">
        <g className="walker-foot left">
          <path d="M35.2 48.6h8.5l-.7 7.8c-2 1.4-5.6 1.2-7.1.2Z" fill={trousers} />
          <path d="M35.7 54.6q4 1.5 7.5-.1l-.3 2.2q-3.1 1.2-6.9-.1Z" fill={outfit.pantsLight} />
          <path d="M35.6 56.3q2.5.9 7.5-.1c1.7 2.8-.2 4.2-4.9 4.4-4.7.3-6.7-1.2-2.6-4.3Z" fill={shoes} />
          <path d="M33.6 58.8q3.6 1.1 10-.2l-.2 1q-6.1 2-9.9.3Z" fill="#eedcc1" />
          <path d="m36 57.4 2.5.2m-3.3.4 2.5.3" stroke="#f2dfc8" strokeWidth=".45" />
        </g>
        <g className="walker-foot right">
          <path d="M45.7 48.9h8.7l-.8 7.6c-2.3 1.1-5.7.8-7.3-.1Z" fill={trousers} />
          <path d="M46.2 54.6q4.1 1.5 7.6 0l-.3 2.1q-3.1 1.3-7.2-.1Z" fill={outfit.pantsLight} />
          <path d="M46.1 56.3q3.6 1.3 7.8 0 4.5 1.3 3.1 3.4-2 2.3-9.5 1.4-2.5-.2-1.4-4.8Z" fill={shoes} />
          <path d="M46.1 59.7q5.6 1.3 11-.5l-.2 1.1q-3.1 2-9.8 1.1-.7-.2-1-1.7Z" fill="#eedcc1" />
          <path d="m52.4 57.4 2 .4m-2.8.2 2.3.5" stroke="#f2dfc8" strokeWidth=".5" />
        </g>
      </g>
    </>}
    <g className="classroom-actor-body">
      {outfit.detail === 'hoodie' && <path d="M36 40.9q-4-2.7.4-7.3 8.1-5 15.3-.1 5.2 3.9.7 7.7Z" fill={sleeve} stroke={outfit.shirtShade} strokeWidth=".75" />}
      <path d={jersey} fill={outfit.detail === 'overalls' ? '#e8d8bf' : sleeve} />
      {(outfit.detail === 'knit' || outfit.detail === 'cardigan') && <path d={jersey} fill={knit} />}
      <path d="M32.3 49.4q10.9 3 26.4-.4l-.5 1.7q-11.5 3.9-25.4.4Z" fill={outfit.shirtShade} opacity=".62" />
      {outfit.detail === 'cardigan' ? <g>
        <path d="M39.1 38.4q6.8 1.5 11.6-.3l-4.2 6.3-2.3.8Z" fill="#f3e6cf" />
        <path d="m40.7 39.3 5.5 5.4.3 7.5m4.4-13.1-4.7 5.6" stroke={outfit.shirtShade} strokeWidth="1.5" />
        <path d="M34.8 45.8q1.7.5 4.2.3l-.1 2.4q-1.4 1.2-4.2.2Zm15.7.3q2.7.3 4-.7l.3 2.8q-2 1.5-4.1.6Z" fill={sleeve} stroke={outfit.shirtShade} strokeWidth=".35" />
        <circle cx="46.9" cy="46.4" r=".79" fill="#b98548" />
        <circle cx="47.1" cy="49.5" r=".79" fill="#b98548" />
        <path d="M46.6 46.1h.3m-.1 3.1h.3" stroke="#e8bb76" strokeWidth=".43" />
      </g> : <path d="M37.4 39.8q6.9 4.2 14.8-.3" fill="none" stroke="#fff5e4" strokeWidth="1.35" opacity=".7" />}
      {outfit.detail === 'puffer' && <path d="M33.5 44.4q10 2.4 21.9-.7M34 47.7q9 2.4 21.3-.7" fill="none" stroke="#fff5e2" strokeWidth=".68" opacity=".47" />}
      {outfit.detail === 'hoodie' && <g fill="none" stroke={outfit.shirtShade} strokeWidth=".8">
        <path d="M39 44.4q6.8 1.5 12 0l2 4.3q-7.2 2.1-15 0Z" fill={sleeve} />
        <path d="M41.4 40.4l-.7 3.9m8.6-4 .8 3.9" stroke="#ffebcb" />
      </g>}
      {outfit.detail === 'vest' && <g fill="none" stroke={outfit.shirtShade}>
        <path d="m36.3 39.8 8.9 5 8.2-5.7m-8.2 5.7.4 7.3" strokeWidth="1.1" />
        <path d="M35.7 48.3q2.5.4 5-.2m10.1.1q2.2-.1 4.7-.7" strokeWidth=".85" />
      </g>}
      {outfit.detail === 'overalls' && <g>
        <path d="M35 38.8l4.4-.3 2.6 6.6h6.8l2.7-6.8 4 .6-2.7 8 2.3 5.4q-9 2.3-18.4.2l1.7-5.7Z" fill={sleeve} stroke={outfit.shirtShade} strokeWidth=".65" />
        <path d="M41 47.3h9v2.1q-4.4 2.2-9 0Z" fill="none" stroke={outfit.shirtShade} strokeWidth=".65" />
        <circle cx="40.2" cy="45.6" r=".85" fill="#e6b777" /><circle cx="51" cy="45.4" r=".85" fill="#e6b777" />
      </g>}
      {standingArms && <g className="classroom-actor-standing-arms">
        <path d="M30.9 42.4c-2.8.7-3.5 5.4-2.6 7.6.9 1.5 3.4 2 4.9.2l2-6.3Z" fill={sleeveColor} />
        <path d="M54.9 41.6c3.3-.4 5.9 1.4 7.6 3.7l-2.5 4.2c-2.6.6-4.3-2.2-5.9-4.3Z" fill={sleeveColor} />
        <path d="M28.8 48q2.6 1.2 4.9.6l-.5 1.9q-2.2.9-4.7-.8Zm30.6-4.1q2 1.1 3 2l-1.8 2.7-2.4-1.6Z" fill={outfit.shirtShade} opacity=".59" />
        <path d="M29 48.9q1.3.7 2.8.8m27-3.4 1.6 1.3" stroke="#fff5dc" strokeWidth=".44" opacity=".4" />
        <path d="M28.5 49.6q2.3 1.2 4.2.7l-.5 1.4q-1.1 1.1-2.5.5-1.6-.6-1.2-2.6Zm32.3-3.8c1.1-1.7 3.5-1.7 4.3-.3.6 1.6-.8 3.9-2.6 3.9-1.2.1-2.7-1.2-1.7-3.6Z" fill={skin} />
      </g>}
      {seatedArms && <g className="classroom-actor-seated-arms">
        <path d="M31.9 42.7q-.3 4.9 6.4 6.1m18-6.2q2.3 5.2-3.5 6.1" fill="none" stroke={outfit.shirtShade} strokeWidth="1.2" opacity=".7" />
        <ellipse cx="39.1" cy="48.7" rx="2.7" ry="1.7" fill={skin} />
        <ellipse cx="51.8" cy="48.6" rx="2.6" ry="1.65" fill={skin} />
      </g>}
      {instructor && <g>
        <path d="m43 40 2.2 2.3 2.1-2.6m-2.1 2.6 1 6.3" fill="none" stroke="#e6e5d6" strokeWidth=".8" />
        <rect x="48.5" y="44.2" width="4.4" height="3.2" rx=".6" fill="#ebcc8d" />
      </g>}
      <g className="classroom-actor-face" transform={pose === 'seated' ? 'rotate(-3 45 28)' : undefined}>
        <HairTail style={outfit.hair} fill={hair} shade={outfit.hairDark} />
        {outfit.hair === 'bun' && <circle cx="37.7" cy="7.1" r="6.5" fill={hair} />}
        <path d="M27 23q0-12 10.3-16.1C51 1.8 61.5 8.4 63.9 19l-1.5 11.9-4.1 4.1H29.4Z" fill={hair} />
        <path d="M30.5 28.5c-3.6-3.6-7.5-2.1-7 1.4.4 2.9 3.3 4.7 7.3 3.8m29.4-7.1c2.6-3.3 6.3-2.3 6 1.1-.1 3-2.6 4.9-5.8 4.9" fill={skin} />
        <path d="M26 29.1q1.1-1.2 2.6.3m35-1.9q1.2-1.1 1.6.1" fill="none" stroke={outfit.skinShade} strokeWidth=".7" />
        <path d="M28.9 24.2C28.4 15 34.4 10.6 43 10.3c11.6-.5 18.6 6.5 18.6 16.9.1 8.9-5.4 14.1-14.7 14.2-11.3.4-17.7-4.8-18-17.2Z" fill={skin} />
        <path d={hairPaths[outfit.hair]} fill={hair} />
        {outfit.hair === 'undercut' && <path d="M28.7 22.8q2.6-.4 4.4-2m-4.2 4.1q2.8-.5 4.9-2.1" fill="none" stroke={outfit.hairDark} strokeWidth=".45" opacity=".67" />}
        <g clipPath={`url(#${id}-fringe)`} fill={`url(#${id}-lock)`}>
          {locks[outfit.hair].map(shape => <path key={shape} d={shape} />)}
        </g>
        <Face expression={outfit.expression} cheek={`url(#${id}-cheek)`} nose={`url(#${id}-nose)`} mouth={`url(#${id}-mouth)`} />
        <HairAccessory accessory={outfit.accessory} />
      </g>
      {outfit.accessory === 'scarf' && <path d="M36 39q8 2.7 18-1l1.5 3.7q-3 .8-4.1 1.3l1 5.8-4.1.7-1.5-5.7q-6 .8-11.4-2.4Z" fill="#d69279" stroke="#925b54" strokeWidth=".52" />}
    </g>
  </g>;
});

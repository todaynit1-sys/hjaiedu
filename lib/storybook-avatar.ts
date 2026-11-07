import type { AvatarCustomization } from './avatar-customization';
import type { Character } from './types';

export type StorybookAvatarId = 'cardigan' | 'beanie';
export const verticalStorybookPoses = ['step-up', 'step-up-back', 'step-down', 'step-down-back'] as const;
export type StorybookPose = 'idle' | 'step' | 'step-back' | 'seated' | typeof verticalStorybookPoses[number];
export type StorybookBounds = [number, number, number, number];
export type StorybookLandmarks = {
  head: StorybookBounds;
  face: StorybookBounds;
  eyes: readonly StorybookBounds[];
  mouth?: StorybookBounds;
};

export const STORYBOOK_AVATARS: ReadonlyArray<{id: StorybookAvatarId; label: string; avatar: AvatarCustomization}> = [
  {
    id: 'cardigan', label: '올리브 가디건',
    avatar: { hair: 'waves', hairColor: 'brown', skin: 'porcelain', expression: 'grin',
      clothing: 'cardigan', clothingColor: 'sage', accessory: 'none' }
  },
  {
    id: 'beanie', label: '안경과 크림 비니',
    avatar: { hair: 'crop', hairColor: 'brown', skin: 'peach', expression: 'smile',
      clothing: 'knit', clothingColor: 'cream', accessory: 'beanie' }
  }
];

const portraitFields = ['hair', 'hairColor', 'skin', 'expression', 'accessory'] as const;

export function storybookAvatar(character: Character, avatar?: AvatarCustomization): StorybookAvatarId | undefined {
  if (!avatar) return character === 'smile' ? 'cardigan' : undefined;
  return STORYBOOK_AVATARS.find(preset =>
    portraitFields.every(key => avatar[key] === preset.avatar[key]))?.id;
}

export function storybookSprite(id: StorybookAvatarId, pose: StorybookPose) {
  return `/classroom/avatar-${id}-${pose}.webp`;
}

export function storybookLayer(name: string) {
  const base = `/classroom/avatars/${name}`;
  return { art: `${base}.webp`, mask: `${base}-mask.png` };
}

import type { AvatarCustomization } from './avatar-customization';
import type { Character } from './types';

export type StorybookAvatarId = 'cardigan' | 'beanie';
export type StorybookPose = 'idle' | 'step' | 'seated';

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

export function storybookAvatar(character: Character, avatar?: AvatarCustomization): StorybookAvatarId | undefined {
  if (!avatar) return character === 'smile' ? 'cardigan' : undefined;
  return STORYBOOK_AVATARS.find(preset =>
    (Object.keys(preset.avatar) as (keyof AvatarCustomization)[]).every(key => avatar[key] === preset.avatar[key]))?.id;
}

export function storybookSprite(id: StorybookAvatarId, pose: StorybookPose) {
  return `/classroom/avatar-${id}-${pose}.webp`;
}

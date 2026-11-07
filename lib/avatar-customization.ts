export const AVATAR_OPTIONS = {
  hair: ['waves', 'crop', 'spiky', 'bob', 'bun', 'curls', 'part', 'long', 'ponytail', 'pigtails', 'braid', 'undercut',
    'alien-sprout', 'alien-moon', 'cat', 'rabbit', 'bear'],
  hairColor: ['black', 'brown', 'blond', 'pink', 'silver', 'navy'],
  skin: ['porcelain', 'peach', 'honey', 'bronze', 'deep'],
  expression: ['smile', 'grin', 'sleepy'],
  clothing: ['plain', 'knit', 'puffer', 'cardigan', 'hoodie', 'vest', 'overalls'],
  clothingColor: ['cream', 'sage', 'sky', 'lavender', 'rose', 'amber', 'navy'],
  accessory: ['none', 'glasses', 'cat', 'ribbon', 'beanie', 'sprout', 'headphones', 'star', 'scarf', 'clip', 'earmuffs', 'frog', 'mushroom', 'axolotl']
} as const;

export const AVATAR_KINDS = ['male', 'female', 'alien', 'animal'] as const;
export type AvatarKind = typeof AVATAR_KINDS[number];
export type AvatarOption = keyof typeof AVATAR_OPTIONS;

type AvatarSelections = {
  -readonly [Key in AvatarOption]: typeof AVATAR_OPTIONS[Key][number];
};
export type AvatarCustomization = AvatarSelections & { kind?: AvatarKind };

const headsByKind = {
  male: ['crop', 'part', 'spiky', 'undercut', 'waves', 'curls'],
  female: ['bob', 'long', 'ponytail', 'pigtails', 'braid', 'bun', 'waves', 'curls'],
  alien: ['alien-sprout', 'alien-moon'],
  animal: ['cat', 'rabbit', 'bear'],
} as const satisfies Record<AvatarKind, readonly AvatarCustomization['hair'][]>;

export type HumanHair = typeof headsByKind.male[number] | typeof headsByKind.female[number];
export const AVATAR_HEADS_BY_KIND: Record<AvatarKind, readonly AvatarCustomization['hair'][]> = headsByKind;

export function isHumanHair(hair: AvatarCustomization['hair']): hair is HumanHair {
  return AVATAR_HEADS_BY_KIND.male.includes(hair) || AVATAR_HEADS_BY_KIND.female.includes(hair);
}

export function avatarKind(avatar: AvatarCustomization): AvatarKind {
  return avatar.kind ?? AVATAR_KINDS.find(kind => AVATAR_HEADS_BY_KIND[kind].includes(avatar.hair)) ?? 'male';
}

export function parseAvatarCustomization(value: unknown): AvatarCustomization | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const selections = Object.entries(AVATAR_OPTIONS).map(([key, choices]) => {
    const selected = Object.hasOwn(input, key) ? input[key] : undefined;
    return [key, choices.find(choice => choice === selected)] as const;
  });
  if (selections.some(([, selection]) => selection === undefined)) return null;
  const avatar = Object.fromEntries(selections) as AvatarSelections;
  if (!Object.hasOwn(input, 'kind')) return avatar;
  const kind = AVATAR_KINDS.find(choice => choice === input.kind);
  if (!kind || !AVATAR_HEADS_BY_KIND[kind].includes(avatar.hair)) return null;
  return { ...avatar, kind };
}

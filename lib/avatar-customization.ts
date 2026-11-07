export const AVATAR_OPTIONS = {
  hair: ['waves', 'crop', 'spiky', 'bob', 'bun', 'curls', 'part', 'long'],
  hairColor: ['black', 'brown', 'blond', 'pink', 'silver', 'navy'],
  skin: ['porcelain', 'peach', 'honey', 'bronze', 'deep'],
  expression: ['smile', 'grin', 'sleepy'],
  clothing: ['plain', 'knit', 'puffer', 'cardigan'],
  clothingColor: ['cream', 'sage', 'sky', 'lavender', 'rose', 'amber', 'navy'],
  accessory: ['none', 'glasses', 'cat', 'ribbon', 'beanie', 'sprout', 'headphones', 'star', 'scarf', 'clip', 'earmuffs', 'frog', 'mushroom', 'axolotl']
} as const;

export type AvatarCustomization = {
  -readonly [Key in keyof typeof AVATAR_OPTIONS]: typeof AVATAR_OPTIONS[Key][number];
};

export function parseAvatarCustomization(value: unknown): AvatarCustomization | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const selections = Object.entries(AVATAR_OPTIONS).map(([key, choices]) => {
    const selected = Object.hasOwn(input, key) ? input[key] : undefined;
    return [key, choices.find(choice => choice === selected)] as const;
  });
  if (selections.some(([, selection]) => selection === undefined)) return null;
  return Object.fromEntries(selections) as AvatarCustomization;
}

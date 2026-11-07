import { memo, useEffect, useState } from 'react';
import type { AvatarCustomization } from '../lib/avatar-customization';
import { rosterSprite, storybookAvatar, storybookSprite, type StorybookPose } from '../lib/storybook-avatar';
import { STORYBOOK_HEIGHT, STORYBOOK_WIDTH, storybookFrame } from '../lib/storybook-frame';
import type { Character } from '../lib/types';
import { AvatarArt, avatarAppearance } from './classroom-avatar';
import { StorybookAvatarDetails } from './storybook-avatar-details';

export const StorybookAvatarArt = memo(function StorybookAvatarArt({
  character, avatar, instructor = false, pose, className, onReady
}: {
  character: Character;
  avatar?: AvatarCustomization;
  instructor?: boolean;
  pose: StorybookPose;
  className?: string;
  onReady?: () => void;
}) {
  const outfit = avatarAppearance(character, avatar, instructor);
  const exact = instructor ? undefined : storybookAvatar(character, avatar);
  const roster = rosterSprite(outfit.hair, pose);
  const art = exact ? storybookSprite(exact, pose) : roster.art;
  const mask = exact ? undefined : roster.mask;
  const { hairLight, hairDark, skin, skinShade, shirt, shirtShade, detail = 'plain', expression, accessory = 'none' } = outfit;
  const key = [art, hairLight, hairDark, skin, skinShade, shirt, shirtShade, detail].join('|');
  const [result, setResult] = useState<{ key: string; frame: Awaited<ReturnType<typeof storybookFrame>> }>();
  const frame = result?.key === key ? result.frame : undefined;

  useEffect(() => {
    let active = true;
    const palette = { hair: [hairLight, hairDark] as const, skin: [skin, skinShade] as const,
      clothing: [shirt, shirtShade] as const, fabric: detail };
    void storybookFrame(art, mask, mask ? palette : undefined).then(ready => {
      if (active) setResult({ key, frame: ready });
    }).catch(() => {});
    return () => { active = false; };
  }, [key, art, mask, hairLight, hairDark, skin, skinShade, shirt, shirtShade, detail]);

  useEffect(() => { if (frame) onReady?.(); }, [frame, onReady]);

  return <svg className={className} data-frame={pose} data-art-ready={frame ? 'true' : undefined} data-art-source={art}
    viewBox={frame ? `0 0 ${STORYBOOK_WIDTH} ${STORYBOOK_HEIGHT}` : '15 -2 60 66'} width="100%" height="100%"
    aria-hidden="true" focusable="false">
    {frame ? <>
      <image href={frame.href} width={STORYBOOK_WIDTH} height={STORYBOOK_HEIGHT} />
      {frame.landmarks && <StorybookAvatarDetails
        appearance={{ accessory, expression, skin, skinShade }} pose={pose} landmarks={frame.landmarks} />}
    </> : <AvatarArt character={character} avatar={avatar} pose={pose === 'seated' ? 'seated' : 'walking'} instructor={instructor} />}
  </svg>;
});

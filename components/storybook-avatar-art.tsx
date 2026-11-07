import { memo, useEffect, useState } from 'react';
import { isHumanHair, type AvatarCustomization, type HumanHair } from '../lib/avatar-customization';
import { storybookAvatar, storybookLayer, verticalStorybookPoses, type StorybookPose } from '../lib/storybook-avatar';
import { STORYBOOK_HEIGHT, STORYBOOK_WIDTH, storybookFrame, type StorybookPalette } from '../lib/storybook-frame';
import { storybookHeads } from '../lib/storybook-heads';
import type { Character } from '../lib/types';
import { AvatarArt, avatarAppearance } from './classroom-avatar';
import { StorybookAvatarDetails } from './storybook-avatar-details';

const creatureColors: Record<Exclude<AvatarCustomization['hair'], HumanHair>, readonly [string, string]> = {
  'alien-sprout': ['#a9d58d', '#66975d'],
  'alien-moon': ['#dcc3ed', '#ad8bbc'],
  cat: ['#f2ae69', '#b8784b'],
  rabbit: ['#fae8cb', '#d3b799'],
  bear: ['#bf885b', '#805237'],
};

function useStorybookLayer(name?: string, palette?: StorybookPalette, keepPrevious = false) {
  const key = JSON.stringify([name, palette]);
  const [loaded, setLoaded] = useState<{ key: string; name: string; href: string }>();
  useEffect(() => {
    if (!name) return;
    let active = true;
    const { art, mask } = storybookLayer(name);
    void storybookFrame(art, palette ? mask : undefined, palette).then(href => {
      if (active) setLoaded({ key, name, href });
    }).catch(() => {});
    return () => { active = false; };
  }, [key, name]);
  return loaded?.key === key || keepPrevious ? loaded : undefined;
}

export const StorybookAvatarArt = memo(function StorybookAvatarArt({
  character, avatar, instructor = false, pose, frame = pose, className, onReady,
  bodyOnly = false, lookingUp = false, preloadDirections = false
}: {
  character: Character;
  avatar?: AvatarCustomization;
  instructor?: boolean;
  pose: StorybookPose;
  frame?: StorybookPose;
  className?: string;
  onReady?: () => void;
  bodyOnly?: boolean;
  lookingUp?: boolean;
  preloadDirections?: boolean;
}) {
  const appearance = avatarAppearance(character, avatar, instructor);
  const exact = instructor ? undefined : storybookAvatar(character, avatar);
  const { hair, hairLight, hairDark, shirt, shirtShade, detail = 'plain', expression, accessory = 'none' } = appearance;
  const creature = avatar && !isHumanHair(avatar.hair) ? avatar.hair : undefined;
  const [skin, skinShade] = creature ? creatureColors[creature] : [appearance.skin, appearance.skinShade];
  const side = pose === 'seated' || lookingUp ? 'side' : 'front';
  const portrait = creature ?? exact ?? hair;
  const headName = instructor || bodyOnly ? undefined : `head-${portrait}-${side}`;
  const bodyName = instructor ? `robot-${pose === 'seated' ? 'idle' : pose}` : `body-${detail}-${pose}`;
  const body = useStorybookLayer(bodyName, instructor ? undefined : { skin: [skin, skinShade], clothing: [shirt, shirtShade] }, bodyOnly);
  const head = useStorybookLayer(headName, exact || creature || !headName ? undefined : { hair: [hairLight, hairDark], skin: [skin, skinShade] }, lookingUp);
  const ready = Boolean(body && (!headName || head));
  const landmarks = head && !exact ? storybookHeads[head.name] : undefined;
  const raisedSide = lookingUp && head?.name.endsWith('-side');

  useEffect(() => {
    if (!preloadDirections) return;
    const palette = instructor ? undefined : { skin: [skin, skinShade] as const, clothing: [shirt, shirtShade] as const };
    for (const direction of verticalStorybookPoses) {
      const { art, mask } = storybookLayer(instructor ? `robot-${direction}` : `body-${detail}-${direction}`);
      void storybookFrame(art, palette ? mask : undefined, palette).catch(() => {});
    }
  }, [preloadDirections, instructor, detail, skin, skinShade, shirt, shirtShade]);

  useEffect(() => { if (ready) onReady?.(); }, [ready, onReady]);

  return <svg className={className} data-frame={frame} data-art-ready={ready ? 'true' : undefined}
    data-art-source={storybookLayer(head?.name ?? headName ?? body?.name ?? bodyName).art}
    data-outfit-source={storybookLayer(body?.name ?? bodyName).art}
    viewBox={ready ? `0 0 ${STORYBOOK_WIDTH} ${STORYBOOK_HEIGHT}` : '15 -2 60 66'} width="100%" height="100%"
    aria-hidden="true" focusable="false">
    {ready ? <>
      <image data-art-layer="body" href={body?.href} width={STORYBOOK_WIDTH} height={STORYBOOK_HEIGHT} />
      {head && <g transform={raisedSide ? 'translate(-5 -23)' : undefined}>
        <image data-art-layer="head" href={head.href} width={STORYBOOK_WIDTH} height={STORYBOOK_HEIGHT} />
        {landmarks && <StorybookAvatarDetails appearance={{ accessory, expression, skin, skinShade }}
          pose={raisedSide ? 'seated' : pose} landmarks={landmarks} />}
      </g>}
    </> : !bodyOnly && <AvatarArt character={character} avatar={avatar} pose={pose === 'seated' ? 'seated' : 'walking'} instructor={instructor} />}
  </svg>;
});

import { memo, useEffect, useState } from 'react';
import { isHumanHair, type AvatarCustomization } from '../lib/avatar-customization';
import { storybookBodyAttachments, storybookHeadAttachments } from '../lib/storybook-attachments';
import { storybookAvatar, storybookLayer, verticalStorybookPoses, type StorybookPose } from '../lib/storybook-avatar';
import { STORYBOOK_HEIGHT, STORYBOOK_WIDTH, storybookFrame, type StorybookPalette } from '../lib/storybook-frame';
import { storybookHeads } from '../lib/storybook-heads';
import type { Character } from '../lib/types';
import { AvatarArt, avatarAppearance } from './classroom-avatar';
import { StorybookAvatarDetails } from './storybook-avatar-details';

function useStorybookLayer(name?: string, palette?: StorybookPalette, continuity?: string) {
  const key = JSON.stringify([name, palette]);
  const [loaded, setLoaded] = useState<{ key: string; name: string; href: string; continuity?: string }>();
  useEffect(() => {
    if (!name) return;
    let active = true;
    const { art, mask } = storybookLayer(name);
    void storybookFrame(art, palette ? mask : undefined, palette).then(href => {
      if (active) setLoaded({ key, name, href, continuity });
    }).catch(() => {});
    return () => { active = false; };
  }, [key, name, continuity]);
  return name && loaded && (loaded.key === key || (continuity !== undefined && loaded.continuity === continuity))
    ? loaded : undefined;
}

function directedPose(pose: StorybookPose, direction?: 'up' | 'down'): StorybookPose {
  if (pose !== 'idle') return pose;
  return direction === 'up' ? 'step-up' : direction === 'down' ? 'step-down' : 'idle';
}

function creaturePose(creature: string, pose: StorybookPose, direction?: 'up' | 'down'): StorybookPose {
  const facing = directedPose(pose, direction);
  if (facing === 'step-back' || (creature === 'alien-moon' && facing === 'step-down-back')) return 'idle';
  if (creature === 'alien-moon' && facing === 'step-down') return 'step';
  return facing;
}

export const StorybookAvatarArt = memo(function StorybookAvatarArt({
  character, avatar, instructor = false, pose, frame = pose, className, onReady,
  direction, preloadDirections = false
}: {
  character: Character;
  avatar?: AvatarCustomization;
  instructor?: boolean;
  pose: StorybookPose;
  frame?: StorybookPose;
  className?: string;
  onReady?: () => void;
  direction?: 'up' | 'down';
  preloadDirections?: boolean;
}) {
  const appearance = avatarAppearance(character, avatar, instructor);
  const exact = instructor ? undefined : storybookAvatar(character, avatar);
  const { hair, hairLight, hairDark, shirt, shirtShade, detail = 'plain', expression, accessory = 'none' } = appearance;
  const creature = avatar && !isHumanHair(avatar.hair) ? avatar.hair : undefined;
  const { skin, skinShade } = appearance;
  const gaitFrame = frame === 'step' || frame === 'step-back';
  const lookingUp = direction === 'up' || pose === 'step-up' || pose === 'step-up-back';
  const side = pose === 'seated' || lookingUp ? 'side' : 'front';
  const portrait = exact ?? hair;
  const headName = instructor || creature ? undefined : `head-${portrait}-${side}`;
  const bodyName = instructor ? `smart-robot-${pose === 'seated' ? 'idle' : directedPose(pose, direction)}`
    : creature ? `creature-${creature}-${creaturePose(creature, pose, direction)}` : `body-${detail}-${directedPose(pose, direction)}`;
  const body = useStorybookLayer(bodyName, instructor || creature ? undefined : { skin: [skin, skinShade], clothing: [shirt, shirtShade] },
    instructor ? 'robot' : creature ?? `human/${skin}/${skinShade}`);
  const head = useStorybookLayer(headName, exact || !headName ? undefined : { hair: [hairLight, hairDark], skin: [skin, skinShade] },
    headName ? JSON.stringify([portrait, hairLight, hairDark, skin, skinShade]) : undefined);
  const ready = Boolean(body && (!headName || head));
  const landmarks = head && !exact ? storybookHeads[head.name] : undefined;
  const headAttachment = head && storybookHeadAttachments[head.name];
  const bodyAttachment = body && storybookBodyAttachments[body.name];
  // Overlap the neckline slightly so the painted edges stay joined at small scales.
  const headTransform = headAttachment && bodyAttachment
    ? `translate(${bodyAttachment[0] - headAttachment[0]} ${bodyAttachment[1] - headAttachment[1] + 8})`
    : undefined;

  useEffect(() => {
    if (!preloadDirections) return;
    const palette = instructor || creature ? undefined : { skin: [skin, skinShade] as const, clothing: [shirt, shirtShade] as const };
    for (const direction of verticalStorybookPoses) {
      const { art, mask } = storybookLayer(instructor ? `smart-robot-${direction}`
        : creature ? `creature-${creature}-${creaturePose(creature, direction)}` : `body-${detail}-${direction}`);
      void storybookFrame(art, palette ? mask : undefined, palette).catch(() => {});
    }
  }, [preloadDirections, instructor, creature, detail, skin, skinShade, shirt, shirtShade]);

  useEffect(() => { if (ready) onReady?.(); }, [ready, onReady]);

  return <svg className={className} data-frame={frame} data-art-ready={ready ? 'true' : undefined} data-creature={creature}
    data-art-source={storybookLayer(gaitFrame ? body?.name ?? bodyName : head?.name ?? headName ?? body?.name ?? bodyName).art}
    data-outfit-source={storybookLayer(body?.name ?? bodyName).art}
    viewBox={ready ? `0 0 ${STORYBOOK_WIDTH} ${STORYBOOK_HEIGHT}` : '15 -2 60 66'} width="100%" height="100%"
    overflow={headName ? 'visible' : undefined}
    aria-hidden="true" focusable="false">
    {ready ? <>
      <image data-art-layer="body" href={body?.href} width={STORYBOOK_WIDTH} height={STORYBOOK_HEIGHT} />
      {head && <g transform={headTransform}>
        <image data-art-layer="head" href={head.href} width={STORYBOOK_WIDTH} height={STORYBOOK_HEIGHT} />
        {landmarks && <StorybookAvatarDetails appearance={{ accessory, expression, skin, skinShade }}
          pose={head.name.endsWith('-side') ? 'seated' : pose} landmarks={landmarks} />}
      </g>}
    </> : !gaitFrame && <AvatarArt character={character} avatar={avatar} pose={pose === 'seated' ? 'seated' : 'walking'} instructor={instructor} />}
  </svg>;
});

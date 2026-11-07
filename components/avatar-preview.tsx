import type { AvatarCustomization } from '../lib/avatar-customization';
import type { Character } from '../lib/types';
import { StorybookAvatarArt } from './storybook-avatar-art';

export function AvatarPreview({ character, avatar }: { character: Character; avatar?: AvatarCustomization }) {
  return <div className="avatar-preview-art" aria-hidden="true">
    <StorybookAvatarArt character={character} avatar={avatar} pose="idle" className="avatar-preview-illustration" />
  </div>;
}

import { useEffect, useRef } from 'react';
import type { AvatarCustomization } from '../lib/avatar-customization';
import type { Character } from '../lib/types';
import { AvatarArt } from './classroom-avatar';

export function AvatarPreview({ character, avatar }: { character: Character; avatar?: AvatarCustomization }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const appearance = useRef({ character, avatar });
  const redraw = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    appearance.current = { character, avatar };
    redraw.current?.();
  }, [character, avatar]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let closed = false;
    let lost = false;
    let dispose: (() => void) | undefined;
    function contextLost(event: Event) {
      event.preventDefault();
      lost = true;
      element!.dataset.ready = 'false';
    }
    function contextRestored() {
      lost = false;
      redraw.current?.();
    }
    element.addEventListener('webglcontextlost', contextLost);
    element.addEventListener('webglcontextrestored', contextRestored);
    void import('./auditorium-world').then(({ createAvatarPreviewWorld }) => {
      if (closed) return;
      const world = createAvatarPreviewWorld(element);
      dispose = world.dispose;
      redraw.current = () => {
        if (lost) return;
        world.draw(appearance.current);
        element.dataset.ready = 'true';
      };
      redraw.current();
    }).catch(() => { element.dataset.ready = 'false'; });
    return () => {
      closed = true;
      redraw.current = undefined;
      element.removeEventListener('webglcontextlost', contextLost);
      element.removeEventListener('webglcontextrestored', contextRestored);
      dispose?.();
    };
  }, []);

  return <div className="avatar-preview-art" aria-hidden="true">
    <canvas ref={canvas} data-ready="false" />
    <svg viewBox="15 -2 60 66"><AvatarArt character={character} avatar={avatar} pose="walking" /></svg>
  </div>;
}

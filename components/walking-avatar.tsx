import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import type { AvatarCustomization } from '../lib/avatar-customization';
import type { Character, ClassroomPosition } from '../lib/types';
import { AvatarArt } from './classroom-avatar';
import { StorybookAvatarArt } from './storybook-avatar-art';

export function WalkingAvatar({ position, origin, dockExit, floor, mine, number, instructor, name, character, avatar, scale, children }: {
  position?: ClassroomPosition | null;
  origin: ClassroomPosition;
  dockExit?: ClassroomPosition;
  floor: RefObject<HTMLDivElement | null>;
  mine: boolean;
  number?: number;
  instructor?: boolean;
  name: string;
  character: Character;
  avatar?: AvatarCustomization;
  scale?: number;
  children?: ReactNode;
}) {
  const destination = position ?? origin;
  const { x, y } = destination;
  const shouldSit = !instructor && !position;
  const element = useRef<HTMLDivElement>(null);
  const previous = useRef({ x, y, shouldSit });
  const animation = useRef<Animation | null>(null);
  const stepTimer = useRef<number | undefined>(undefined);
  const [seated, setSeated] = useState(shouldSit);
  const appearanceKey = JSON.stringify([character, avatar, Boolean(instructor)]);
  const [readyAppearance, setReadyAppearance] = useState<string>();
  const illustrated = readyAppearance === appearanceKey;

  useLayoutEffect(() => {
    const node = element.current;
    return () => {
      animation.current?.cancel();
      animation.current = null;
      window.clearTimeout(stepTimer.current);
      if (node) {
        delete node.dataset.travelling;
        delete node.dataset.walking;
        delete node.dataset.returning;
      }
    };
  }, []);

  useLayoutEffect(() => {
    const node = element.current;
    const width = floor.current?.clientWidth ?? 0;
    const height = floor.current?.clientHeight ?? 0;
    const old = previous.current;
    previous.current = { x, y, shouldSit };
    if (!node) return;

    // Sample the current on-screen offset before replacing an unfinished path.
    const interrupted = Boolean(animation.current);
    const offset = interrupted ? getComputedStyle(node).translate.split(' ').map(parseFloat) : [];
    animation.current?.cancel();
    animation.current = null;
    window.clearTimeout(stepTimer.current);
    delete node.dataset.travelling;
    delete node.dataset.walking;
    delete node.dataset.returning;
    if (!width || !height || (old.shouldSit && shouldSit && !interrupted)
      || matchMedia('(prefers-reduced-motion: reduce)').matches || !node.animate) {
      setSeated(shouldSit);
      return;
    }

    const from = { x: old.x + (offset[0] || 0) / width, y: old.y + (offset[1] || 0) / height };
    const target = { x, y };
    const rising = old.shouldSit && !shouldSit && !interrupted;
    const distanceBetween = (a: ClassroomPosition, b: ClassroomPosition) => Math.hypot((b.x-a.x)*width, (b.y-a.y)*height);
    const points = [from];
    const append = (point: ClassroomPosition) => {
      if (distanceBetween(points.at(-1)!, point) > .5) points.push(point);
    };
    if (rising && dockExit && distanceBetween(from, target) > distanceBetween(from, dockExit)) {
      append(dockExit);
    }
    const routeStart = points.at(-1)!;
    const routeEnd = shouldSit && dockExit && distanceBetween(from, target) > distanceBetween(dockExit, target)
      ? dockExit : target;
    // Long trips across seating blocks meet in the middle of the aisle.
    if ((routeStart.x - .5) * (routeEnd.x - .5) < 0 && Math.abs(routeStart.x - routeEnd.x) > .24
      && routeStart.y > .42 && routeEnd.y > .42) {
      append({ x: .5, y: (routeStart.y + routeEnd.y) / 2 });
    }
    append(routeEnd);
    append(target);
    const distances = [0];
    for (let index = 1; index < points.length; index++) {
      distances.push(distances[index - 1] + distanceBetween(points[index - 1], points[index]));
    }
    const distance = distances.at(-1)!;
    if (distance < 1) {
      setSeated(shouldSit);
      return;
    }

    setSeated(false);
    node.dataset.travelling = '';
    if (shouldSit) node.dataset.returning = '';
    const facing = points.find(point => Math.abs(point.x - from.x) > .008);
    if (facing) node.dataset.facing = facing.x < from.x ? 'left' : 'right';
    const riseDuration = rising ? 145 : 0;
    if (riseDuration) {
      stepTimer.current = window.setTimeout(() => { node.dataset.walking = ''; }, riseDuration);
    } else {
      node.dataset.walking = '';
    }
    const walk = node.animate(points.map((point, index) => ({
      translate: `${(point.x-x)*width}px ${(point.y-y)*height}px`,
      '--actor-depth': String(.81 + .27 * point.y),
      zIndex: String(Math.round(point.y * 100) + 1),
      offset: distances[index] / distance,
    })), {
      duration: Math.min(1650, Math.max(210, distance * 2.2)),
      delay: riseDuration,
      easing: 'cubic-bezier(.29, .10, .70, .96)',
      fill: 'backwards',
    });
    animation.current = walk;
    const settle = () => {
      if (animation.current !== walk) return;
      animation.current = null;
      window.clearTimeout(stepTimer.current);
      delete node.dataset.travelling;
      delete node.dataset.walking;
      delete node.dataset.returning;
      setSeated(shouldSit);
    };
    walk.onfinish = settle;
    walk.oncancel = settle;
  }, [x, y, shouldSit, dockExit?.x, dockExit?.y, floor]);

  const className = `classroom-actor${position || instructor ? ' classroom-walker' : ''}${mine ? ' is-mine' : ''}${instructor ? ' is-instructor' : ''}`;
  const style = {
    left: `${x * 100}%`, top: `${y * 100}%`, zIndex: Math.round(y * 100) + 1,
    '--actor-depth': .81 + .27 * y,
    ...(scale === undefined ? {} : { '--actor-scale': `${scale * 100}%` }),
  } as CSSProperties;
  return <div ref={element} className={className} data-seat={number} data-customized={avatar ? 'true' : undefined}
    data-illustrated={illustrated || undefined} data-seat-side={origin.x < .5 ? 'left' : 'right'}
    data-at-lectern={Boolean(instructor && !position) || undefined}
    data-pose={seated ? 'seated' : 'standing'} data-facing="right" title={name} style={style}>
    <svg className="classroom-actor-sprite" viewBox="15 -2 60 66" aria-hidden="true">
      {mine && <ellipse className="classroom-actor-ring" cx="45" cy="60.1" rx="20" ry="3.1" fill="#72cff442" stroke="#ecfcff" strokeWidth="1.6" />}
      <AvatarArt character={character} avatar={avatar} pose="actor" instructor={instructor} />
    </svg>
    <div className="storybook-actor-art" aria-hidden="true">
      <div className="storybook-gait">
        <StorybookAvatarArt character={character} avatar={avatar} instructor={instructor} pose="idle"
          onReady={seated ? undefined : () => setReadyAppearance(appearanceKey)} />
        <StorybookAvatarArt character={character} avatar={avatar} instructor={instructor} pose="step" />
        {!instructor && <StorybookAvatarArt character={character} avatar={avatar} pose="seated"
          onReady={seated ? () => setReadyAppearance(appearanceKey) : undefined} />}
      </div>
    </div>
    {children}
  </div>;
}

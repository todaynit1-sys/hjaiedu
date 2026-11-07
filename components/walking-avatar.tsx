import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { ClassroomPosition } from '../lib/types';

export function WalkingAvatar({ position, origin, floor, mine, number, name, children }: {
  position: ClassroomPosition; origin: ClassroomPosition; floor: RefObject<HTMLDivElement | null>;
  mine: boolean; number: number; name: string; children: ReactNode;
}) {
  const element = useRef<HTMLDivElement>(null);
  const previous = useRef(origin);
  const animation = useRef<Animation | null>(null);
  useLayoutEffect(() => () => animation.current?.cancel(), []);
  useLayoutEffect(() => {
    const node = element.current;
    const width = floor.current?.clientWidth ?? 0;
    const height = floor.current?.clientHeight ?? 0;
    const old = previous.current;
    previous.current = position;
    if (!node || !width || !height) return;
    const offset = getComputedStyle(node).translate.split(' ').map(parseFloat);
    animation.current?.cancel();
    delete node.dataset.walking;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !node.animate) return;

    const from = {x: old.x + (offset[0] || 0) / width, y: old.y + (offset[1] || 0) / height};
    const points = [from];
    // Long trips across the seating blocks meet at the central aisle.
    if ((from.x < .5) !== (position.x < .5) && Math.abs(from.x - position.x) > .24
      && from.y > .42 && position.y > .42) {
      points.push({x:.5, y:Math.min(.81, Math.max(.61, (from.y + position.y) / 2))});
    }
    points.push(position);
    const distances = [0];
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1], b = points[index];
      distances.push(distances[index - 1] + Math.hypot((b.x-a.x)*width, (b.y-a.y)*height));
    }
    const distance = distances.at(-1)!;
    if (distance < 1) return;
    node.dataset.walking = '';
    const walk = node.animate(points.map((point, index) => ({
      translate: `${(point.x-position.x)*width}px ${(point.y-position.y)*height}px`,
      offset: distances[index] / distance
    })), {duration:Math.min(1200, Math.max(140, distance * 2.1)), easing:'linear'});
    animation.current = walk;
    walk.onfinish = () => {
      if (animation.current === walk) delete node.dataset.walking;
    };
  }, [position.x, position.y, floor]);
  return <div ref={element} className={`classroom-walker${mine ? ' is-mine' : ''}`} data-seat={number} title={name}
    style={{left:`${position.x*100}%`, top:`${position.y*100}%`, zIndex:Math.round(position.y*100)+1}}>
    {children}
  </div>;
}

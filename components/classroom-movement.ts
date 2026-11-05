import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { ClassroomPosition, ClassroomSeat } from '../lib/types';

const bounded = (x: number, y: number): ClassroomPosition => ({
  x: Math.min(.94, Math.max(.06, x)),
  y: Math.min(.92, Math.max(.08, y))
});

export function useClassroomMovement(roomDay: string, seat: ClassroomSeat | undefined,
  onMove?: (position: ClassroomPosition | null) => Promise<void>) {
  const floor = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<ClassroomPosition | null | undefined>();
  const [error, setError] = useState('');
  const pending = useRef<{ position: ClassroomPosition | null } | null>(null);
  const current = target === undefined ? seat?.position : target;
  useEffect(() => {
    let live = true;
    let sending = false;
    pending.current = null;
    setTarget(undefined);
    const timer = window.setInterval(async () => {
      if (!onMove || sending || !pending.current) return;
      const request = pending.current;
      pending.current = null;
      sending = true;
      try {
        await onMove(request.position);
        if (live && !pending.current) setTarget(undefined);
      } catch (cause) {
        if (live) {
          pending.current = null;
          setTarget(undefined);
          setError(cause instanceof Error ? cause.message : '이동하지 못했어요. 다시 눌러주세요.');
        }
      } finally { sending = false; }
    }, 200);
    return () => { live = false; pending.current = null; clearInterval(timer); };
  }, [roomDay, onMove]);

  function move(position: ClassroomPosition | null) {
    if (!onMove || !seat) return;
    pending.current = { position };
    setTarget(position);
    setError('');
  }
  function home() {
    const field = floor.current?.getBoundingClientRect();
    const desk = floor.current?.querySelector('.classroom-seat.is-mine .classroom-desk')?.getBoundingClientRect();
    if (!field || !desk || !field.width || !field.height) return bounded(.5, .5);
    return bounded((desk.x + desk.width / 2 - field.x) / field.width,
      (desk.y + desk.height * .35 - field.y) / field.height);
  }
  function toggle() {
    move(current ? null : home());
    floor.current?.focus({ preventScroll: true });
  }
  function click(event: MouseEvent<HTMLDivElement>) {
    if (!current || !onMove) return;
    const field = event.currentTarget.getBoundingClientRect();
    move(bounded((event.clientX - field.x) / field.width, (event.clientY - field.y) / field.height));
    floor.current?.focus({ preventScroll: true });
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onMove || event.target !== event.currentTarget) return;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-.04, 0], ArrowRight: [.04, 0], ArrowUp: [0, -.04], ArrowDown: [0, .04]
    };
    if (event.key === 'Escape') { event.preventDefault(); move(null); return; }
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const from = current ?? home();
    move(bounded(from.x + direction[0], from.y + direction[1]));
  }
  return { floor, position: current, moving: Boolean(current), error, toggle, click, keyDown };
}

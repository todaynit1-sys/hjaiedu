import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { AvatarMotion, ClassroomMove, ClassroomPosition } from '../lib/types';

const bounded = (x: number, y: number): ClassroomPosition => ({
  x: Math.min(.94, Math.max(.06, x)),
  y: Math.min(.92, Math.max(.365, y))
});

export const INSTRUCTOR_HOME = { x: .285, y: .425 };

export function seatExit(home: ClassroomPosition) {
  return bounded(home.x + (home.x < .5 ? .022 : -.022), home.y + (home.y > .89 ? -.036 : .038));
}

export function wanderingPosition(since: number | undefined, now: number, home: ClassroomPosition, number: number) {
  if (!since || now < since) return undefined;
  // Viewers replay the same route from the shared start time without sending position updates.
  const step = Math.floor((now - since) / 2500);
  const cycleLength = 12 + number % 6;
  const beside = seatExit(home);
  const aisle = { x: .5, y: beside.y };
  const front = Math.floor(step / cycleLength) % 2 === 0 || home.y > .72;
  const path = [beside, aisle, {x: .5, y: front ? .48 : .91}, aisle, beside];
  return path[step % cycleLength];
}

export function useWanderClock(enabled: boolean, updatedAt: string) {
  const [now, setNow] = useState(Date.now);
  const clockOffset = useMemo(() => Date.parse(updatedAt) - Date.now(), [updatedAt]);
  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    function sync() {
      clearInterval(timer);
      if (document.hidden) return;
      setNow(Date.now());
      timer = window.setInterval(() => setNow(Date.now()), 500);
    }
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', sync); };
  }, [enabled]);
  return now + clockOffset;
}

export function useClassroomMovement(roomDay: string, motion: AvatarMotion | undefined,
  home: ClassroomPosition, wanderPosition: ClassroomPosition | undefined,
  onMove?: (move: ClassroomMove) => Promise<void>) {
  const floor = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<ClassroomMove>();
  const [error, setError] = useState('');
  const pending = useRef<{ move: ClassroomMove } | null>(null);
  const autonomous = target === undefined ? Boolean(motion?.wanderSince) : target === 'wander';
  const current = target === undefined ? wanderPosition ?? motion?.position : target === 'wander' ? undefined : target;
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
        await onMove(request.move);
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

  function move(move: ClassroomMove) {
    if (!onMove || !motion) return;
    pending.current = { move };
    setTarget(move);
    setError('');
  }
  function toggle() {
    move(current || autonomous ? null : seatExit(home));
    floor.current?.focus({ preventScroll: true });
  }
  function click(event: MouseEvent<HTMLDivElement>) {
    if ((!current && !autonomous) || !onMove) return;
    if (event.target instanceof Element && event.target.closest('a, button, input, textarea, select, .world-screen')) return;
    const field = event.currentTarget.getBoundingClientRect();
    move(bounded((event.clientX - field.x) / field.width, (event.clientY - field.y) / field.height));
    floor.current?.focus({ preventScroll: true });
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onMove || event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-.04, 0], ArrowRight: [.04, 0], ArrowUp: [0, -.04], ArrowDown: [0, .04],
      a: [-.04, 0], d: [.04, 0], w: [0, -.04], s: [0, .04]
    };
    if (event.key === 'Escape') { event.preventDefault(); move(null); return; }
    const direction = directions[event.key] ?? directions[event.key.toLowerCase()];
    if (!direction) return;
    event.preventDefault();
    const from = current ?? home;
    move(bounded(from.x + direction[0], from.y + direction[1]));
  }
  return { floor, position: current, moving: Boolean(current), autonomous, error, toggle, click, keyDown,
    selectMode: (mode: 'manual' | 'wander') => {
      if (mode === 'wander' && !autonomous) move('wander');
      else if (mode === 'manual' && autonomous) move(current ?? null);
    }
  };
}

import { useEffect, useRef } from 'react';
import type { AvatarCustomization, Character } from '../lib/types';
import type { AuditoriumActorFrame } from './auditorium-actors';

export type AuditoriumProjection = {
  seats: Array<{x: number; y: number; scale: number; row: number}>;
  screen: {left: number; top: number; width: number; height: number};
  width: number;
  height: number;
};

export type AuditoriumActorProfile = { id: string; character: Character; avatar?: AvatarCustomization; instructor?: boolean };

export function AuditoriumRenderer({capacity, backdrop, visible, actors, onLayout}: {
  capacity: number; backdrop: boolean; visible: boolean; actors: AuditoriumActorProfile[];
  onLayout: (layout: AuditoriumProjection | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeWorld = useRef<import('./auditorium-world').AuditoriumWorld | null>(null);
  const currentBackdrop = useRef(backdrop);
  const visibleScene = useRef(visible);
  const profiles = useRef(new Map<string, AuditoriumActorProfile>());
  const scheduleActors = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    visibleScene.current = visible;
    profiles.current = new Map(actors.map(actor => [actor.id, actor]));
    scheduleActors.current?.();
  }, [actors, visible]);
  useEffect(() => {
    currentBackdrop.current = backdrop;
    activeWorld.current?.setBackdrop(backdrop);
  }, [backdrop]);
  useEffect(() => {
    const element = canvas.current;
    const floor = element?.parentElement;
    if (!element || !floor) return;
    element.dataset.ready = 'false';
    element.dataset.avatars = 'false';
    onLayout(null);
    let stopped = false;
    let lost = false;
    let world: import('./auditorium-world').AuditoriumWorld | undefined;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    let actorFrame = 0;
    let settleUntil = 0;
    let lastDraw = -Infinity;
    let actorWidth = 0;
    let actorHeight = 0;
    let previous = new Map<string, {x: number; z: number; heading: number}>();
    function queueActors() {
      if (!actorFrame && world && !stopped && !lost && visibleScene.current && !document.hidden) {
        actorFrame = requestAnimationFrame(drawActors);
      }
    }
    scheduleActors.current = queueActors;
    function drawActors(now: number) {
      actorFrame = 0;
      if (!world || !floor || lost || stopped || !visibleScene.current || document.hidden || !actorWidth || !actorHeight) return;
      if (now - lastDraw < 30) { queueActors(); return; }
      lastDraw = now;
      const frames: AuditoriumActorFrame[] = [];
      const positions = new Map<string, {x: number; z: number; heading: number}>();
      let travelling = false;
      for (const actor of floor.querySelectorAll<HTMLElement>('.classroom-actor')) {
        if (actor.hasAttribute('data-illustrated')) continue;
        const id = actor.dataset.seat ?? 'instructor';
        const profile = profiles.current.get(id);
        if (!profile) continue;
        let left = parseFloat(actor.style.left) / 100;
        let top = parseFloat(actor.style.top) / 100;
        if (!Number.isFinite(left) || !Number.isFinite(top)) continue;
        const moving = actor.hasAttribute('data-travelling');
        const seated = actor.dataset.pose === 'seated';
        if (moving) {
          // The live model and message bubble share the same animated ground position.
          const [dx, dy] = getComputedStyle(actor).translate.split(' ').map(parseFloat);
          left += (dx || 0) / actorWidth;
          top += (dy || 0) / actorHeight;
          travelling = true;
        }
        const point = world.floorPoint(left, top);
        const old = previous.get(id);
        let heading = old?.heading ?? .14;
        if (seated) heading = left < .5 ? 2.84 : -2.84;
        else if (old && Math.hypot(point.x - old.x, point.z - old.z) > (moving ? .003 : .03)) {
          heading = Math.atan2(point.x - old.x, point.z - old.z);
        } else if (moving && !old) heading = actor.dataset.facing === 'left' ? -.7 : .7;
        positions.set(id, { ...point, heading });
        frames.push({ ...profile, ...point, heading, scale: profile.instructor ? 1.07 : 1,
          seated, stride: actor.hasAttribute('data-walking') ? now / 115 : 0 });
      }
      previous = positions;
      try {
        world.renderActors(frames);
        element!.dataset.avatars = 'true';
      } catch {
        element!.dataset.avatars = 'false';
        return;
      }
      if (travelling || now < settleUntil) queueActors();
    }
    const mutations = new MutationObserver(records => {
      if (records.some(record => record.target instanceof HTMLElement && record.target.classList.contains('classroom-actor'))) {
        settleUntil = performance.now() + 200;
      }
      queueActors();
    });
    mutations.observe(floor, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['style', 'data-travelling', 'data-walking', 'data-pose', 'data-illustrated'] });
    document.addEventListener('visibilitychange', queueActors);
    function resize() {
      frame = 0;
      if (stopped || lost || !world || !floor || floor.clientWidth < 1 || floor.clientHeight < 1) return;
      actorWidth = floor.clientWidth;
      actorHeight = floor.clientHeight;
      world.resize(actorWidth, actorHeight);
      onLayout({seats:world.layout(capacity), screen:world.screenBounds(), width:actorWidth, height:actorHeight});
      element!.dataset.ready = 'true';
      queueActors();
    }
    function contextLost(event: Event) {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(actorFrame);
      frame = 0;
      actorFrame = 0;
      element!.dataset.ready = 'false';
      element!.dataset.avatars = 'false';
      onLayout(null);
    }
    function contextRestored() {
      lost = false;
      if (!frame) frame = requestAnimationFrame(resize);
    }
    element.addEventListener('webglcontextlost', contextLost);
    element.addEventListener('webglcontextrestored', contextRestored);
    void import('./auditorium-world').then(module => {
      if (stopped) return;
      world = module.createAuditoriumWorld(element);
      activeWorld.current = world;
      world.setBackdrop(currentBackdrop.current);
      resize();
      observer = new ResizeObserver(() => {
        if (!frame) frame = requestAnimationFrame(resize);
      });
      observer.observe(floor);
    }).catch(() => {
      if (!stopped) { element.dataset.ready = 'false'; onLayout(null); }
    });
    return () => {
      stopped = true;
      observer?.disconnect();
      mutations.disconnect();
      document.removeEventListener('visibilitychange', queueActors);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(actorFrame);
      scheduleActors.current = undefined;
      element.removeEventListener('webglcontextlost', contextLost);
      element.removeEventListener('webglcontextrestored', contextRestored);
      activeWorld.current = null;
      world?.dispose();
    };
  }, [capacity, onLayout]);
  return <canvas ref={canvas} className="auditorium-world" aria-hidden="true" data-ready="false"/>;
}

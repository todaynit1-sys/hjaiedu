import { useEffect, useRef } from 'react';

export type AuditoriumProjection = {
  seats: Array<{x: number; y: number; scale: number; row: number}>;
  screen: {left: number; top: number; width: number; height: number};
  width: number;
  height: number;
};

export function AuditoriumRenderer({capacity, backdrop, onLayout}: {
  capacity: number; backdrop: boolean; onLayout: (layout: AuditoriumProjection | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeWorld = useRef<import('./auditorium-world').AuditoriumWorld | null>(null);
  const currentBackdrop = useRef(backdrop);
  useEffect(() => {
    currentBackdrop.current = backdrop;
    activeWorld.current?.setBackdrop(backdrop);
  }, [backdrop]);
  useEffect(() => {
    const element = canvas.current;
    const floor = element?.parentElement;
    if (!element || !floor) return;
    element.dataset.ready = 'false';
    onLayout(null);
    let stopped = false;
    let lost = false;
    let world: import('./auditorium-world').AuditoriumWorld | undefined;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    function resize() {
      frame = 0;
      if (stopped || lost || !world || !floor || floor.clientWidth < 1 || floor.clientHeight < 1) return;
      world.resize(floor.clientWidth, floor.clientHeight);
      onLayout({seats:world.layout(capacity), screen:world.screenBounds(), width:floor.clientWidth, height:floor.clientHeight});
      element!.dataset.ready = 'true';
    }
    function contextLost(event: Event) {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      frame = 0;
      element!.dataset.ready = 'false';
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
      cancelAnimationFrame(frame);
      element.removeEventListener('webglcontextlost', contextLost);
      element.removeEventListener('webglcontextrestored', contextRestored);
      activeWorld.current = null;
      world?.dispose();
    };
  }, [capacity, onLayout]);
  return <canvas ref={canvas} className="auditorium-world" aria-hidden="true" data-ready="false"/>;
}

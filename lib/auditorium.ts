import type { ClassroomPosition } from './types.ts';

export const AUDITORIUM_PAGE_SIZE = 50;
export const AUDITORIUM_SCREEN = { left: .222, top: .101, width: .556, height: .229 };
export const STORYBOOK_SCREEN = { left: .225, top: .039, width: .565, height: .234 };

export function auditoriumCapacity(highestSeatWithinPage: number): number {
  return Math.min(AUDITORIUM_PAGE_SIZE, Math.max(20, Math.ceil(highestSeatWithinPage / 10) * 10));
}

export function auditoriumSeat(index: number, capacity: number): ClassroomPosition & { row: number; scale: number } {
  const columns = capacity / 5;
  const half = columns / 2;
  const row = Math.floor(index / columns);
  const column = index % columns;
  // The shared seat coordinate marks floor contact for the chair and its actor.
  const far = .214 - (capacity - 20) / 30 * .014;
  const near = .11 - (capacity - 20) / 30 * .03;
  const outer = far + (near - far) * row / 4;
  const spacing = (.4 - outer) / (half - 1);
  const x = column < half
    ? outer + column * spacing
    : .6 + (column - half) * spacing;
  const y = .52 + row * .085 + row ** 2 * .00365;
  const baseScale = capacity <= 20 ? .065 : capacity <= 30 ? .055 : .046;
  return { x, y, row, scale: baseScale * (.88 + .06 * row) };
}

export function auditoriumQuizPosition(seatNumber: number, choice: 'O' | 'X'): ClassroomPosition {
  const index = (seatNumber - 1) % AUDITORIUM_PAGE_SIZE;
  return {
    x: (choice === 'O' ? .10 : .62) + index % 5 * .07,
    y: .39 + Math.floor(index / 5) * .053
  };
}

import type { ClassroomPosition } from './types.ts';

export const AUDITORIUM_PAGE_SIZE = 50;
export const AUDITORIUM_SCREEN = { left: .22, top: .055, width: .56, height: .235 };

export function auditoriumCapacity(highestSeatWithinPage: number): number {
  return Math.min(AUDITORIUM_PAGE_SIZE, Math.max(20, Math.ceil(highestSeatWithinPage / 10) * 10));
}

export function auditoriumSeat(index: number, capacity: number): ClassroomPosition & { row: number } {
  const columns = capacity / 5;
  const half = columns / 2;
  const row = Math.floor(index / columns);
  const column = index % columns;
  // Keep the aisle straight while the outside seats widen slightly toward the camera.
  const outer = .12 - (capacity - 20) / 30 * .045 + (4 - row) / 4 * .025;
  const spacing = (.4 - outer) / (half - 1);
  const x = column < half
    ? outer + column * spacing
    : .6 + (column - half) * spacing;
  const y = .42 + row * .109;
  return { x, y, row };
}

export function auditoriumQuizPosition(seatNumber: number, choice: 'O' | 'X'): ClassroomPosition {
  const index = (seatNumber - 1) % AUDITORIUM_PAGE_SIZE;
  return {
    x: (choice === 'O' ? .10 : .62) + index % 5 * .07,
    y: .39 + Math.floor(index / 5) * .053
  };
}

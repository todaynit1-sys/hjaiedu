import type { ClassroomPosition } from './types.ts';

export const AUDITORIUM_PAGE_SIZE = 50;

export function auditoriumCapacity(highestSeatWithinPage: number): number {
  return Math.min(AUDITORIUM_PAGE_SIZE, Math.max(20, Math.ceil(highestSeatWithinPage / 10) * 10));
}

export function auditoriumSeat(index: number, capacity: number): ClassroomPosition & { row: number } {
  const columns = capacity / 5;
  const half = columns / 2;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const outer = .12 - (capacity - 20) / 30 * .045;
  const spacing = (.4 - outer) / (half - 1);
  const x = column < half
    ? outer + column * spacing
    : .6 + (column - half) * spacing;
  const y = .14 + row * .14 + .10 * (1 - ((x - .5) / .5) ** 2);
  return { x, y, row };
}

export function auditoriumQuizPosition(seatNumber: number, choice: 'O' | 'X'): ClassroomPosition {
  const index = (seatNumber - 1) % AUDITORIUM_PAGE_SIZE;
  return {
    x: (choice === 'O' ? .10 : .62) + index % 5 * .07,
    y: .12 + Math.floor(index / 5) * .08
  };
}

export const MAIN_ROOM_CODE = 'MAMOAI';
export const CHARACTERS = [
  'smile', 'sprout', 'cheer', 'glasses', 'sleepy', 'cat',
  'rabbit', 'puppy', 'frog', 'bear', 'penguin', 'hamster', 'seal',
  'mushroom', 'acorn', 'cloud', 'chick', 'otter', 'panda', 'axolotl'
] as const;
export type Character = typeof CHARACTERS[number];
export function defaultCharacter(seatNumber: number): Character {
  return CHARACTERS[(seatNumber - 1) % CHARACTERS.length];
}
export type ResetTarget = 'chat' | 'mood';
export type PollKind = 'mood' | 'break' | 'custom';
export type Attachment = { id: string; name: string; size: number };
export type Message = { id: string; text: string; url: string | null; createdAt: string; pinned: boolean; attachment?: Attachment; author?: 'host' | 'student'; authorName?: string; authorId?: string };
export type PublicMessage = Omit<Message, 'authorId'> & { mine: boolean; seatNumber?: number };
export type ClassroomSeat = { number: number; name: string; mine: boolean; character: Character };
export type Poll = { id: string; question: string; options: string[]; kind: PollKind; open: boolean; archived: boolean; votes: Record<string, number> };
export type Day = { date: string; active: boolean; messages: Message[]; polls: Poll[]; presence: Record<string, number>; participants?: Record<string, string>; characters?: Record<string, Character> };
export type Room = { code: string; title: string; createdAt: string; demo: boolean; days: Record<string, Day> };
export type PublicPoll = Omit<Poll, 'votes'> & { counts: number[]; total: number; myVote: number | null };
export type Snapshot = {
  code: string; title: string; demo: boolean; date: string; today: string;
  active: boolean; online: number; seats: ClassroomSeat[]; dates: string[]; messages: PublicMessage[];
  polls: PublicPoll[]; mode: 'local' | 'cloud'; updatedAt: string;
};

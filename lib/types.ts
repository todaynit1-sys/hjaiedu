import type { AvatarCustomization } from './avatar-customization.ts';
export type { AvatarCustomization } from './avatar-customization.ts';

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
export type ClassroomPosition = { x: number; y: number };
export type AvatarMotion = { position?: ClassroomPosition; wanderSince?: number };
export type ClassroomMove = ClassroomPosition | null | 'wander';
export const REACTIONS = ['understood', 'clap', 'confused', 'wave', 'heart'] as const;
export type ReactionKind = typeof REACTIONS[number];
export type SeatActivity = { handAt?: number; reaction?: { kind: ReactionKind; at: number }; greeting?: { from: number; at: number } };
export type OxQuiz = { id: string; question: string; open: boolean; answer: 'O' | 'X'; answers: Record<string, 'O' | 'X'> };
export type PublicQuiz = Omit<OxQuiz, 'answer' | 'answers'> & { answer?: 'O' | 'X'; counts: [number, number]; myAnswer: 'O' | 'X' | null };
export const QUESTION_PROMPT_MAX_LENGTH = 160;
export const QUESTION_ANSWER_MAX_LENGTH = 200;
export type QuestionRound = { id: string; prompt: string; open: boolean; published: boolean; answers: Record<string, string> };
export type PublicQuestionRound = Omit<QuestionRound, 'answers'> & {
  total: number;
  myAnswer: string | null;
  answers?: Array<{ seatNumber: number; name: string; text: string }>;
};
export type ClassroomSeat = AvatarMotion & { number: number; name: string; mine: boolean; character: Character; avatar?: AvatarCustomization; activity?: SeatActivity; quizChoice?: 'O' | 'X' };
export type Poll = { id: string; question: string; options: string[]; kind: PollKind; open: boolean; archived: boolean; votes: Record<string, number> };
export type Day = { date: string; active: boolean; messages: Message[]; polls: Poll[]; presence: Record<string, number>; participants?: Record<string, string>; characters?: Record<string, Character>; avatars?: Record<string, AvatarCustomization>; nicknames?: Record<string, string>; positions?: Record<string, ClassroomPosition>; wanderers?: Record<string, number>; instructor?: AvatarMotion; activities?: Record<string, SeatActivity>; greetings?: Record<string, { to: number; at: number }>; quiz?: OxQuiz; questionRound?: QuestionRound };
export type Room = { code: string; title: string; createdAt: string; demo: boolean; days: Record<string, Day> };
export type PublicPoll = Omit<Poll, 'votes'> & { counts: number[]; total: number; myVote: number | null };
export type Snapshot = {
  code: string; title: string; demo: boolean; date: string; today: string;
  active: boolean; online: number; seats: ClassroomSeat[]; dates: string[]; messages: PublicMessage[];
  polls: PublicPoll[]; mode: 'local' | 'cloud'; updatedAt: string;
  quiz?: PublicQuiz;
  questionRound?: PublicQuestionRound;
  instructor?: AvatarMotion;
};

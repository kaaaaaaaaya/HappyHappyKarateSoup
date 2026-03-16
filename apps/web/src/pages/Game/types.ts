// 型の定義

export type Phase = 'countdown' | 'playing';

export type ActionType = 'punch' | 'chop';

export type Ingredient = {
  id: number;
  emoji: string;
  startX: number;
  type: ActionType;
};
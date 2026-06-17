export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface IBot<TState, TAction> {
  chooseAction(state: TState, playerId: string, difficulty: BotDifficulty): TAction;
}

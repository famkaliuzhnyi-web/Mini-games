import type { IBot, BotDifficulty } from '../_contract/IBot';
import type { TicTacToeGameData } from './types';
import type { TicTacToeAction } from './TicTacToe.game';
import {
  getPossibleMoves,
  makeMove,
  checkWinnerWithCombination,
  getGameStatusWithCombination,
} from './gameLogic';
import type { Board } from './types';

type Sym = 'X' | 'O';

function findWinningMove(board: Board, sym: Sym): TicTacToeAction | null {
  for (const move of getPossibleMoves(board)) {
    const { winner } = checkWinnerWithCombination(makeMove(board, move.row, move.col, sym));
    if (winner === sym) return move;
  }
  return null;
}

function minimax(board: Board, botSym: Sym, currentSym: Sym, depth: number): { score: number; move?: TicTacToeAction } {
  const humanSym: Sym = botSym === 'X' ? 'O' : 'X';
  const { status } = getGameStatusWithCombination(board);
  if (status === `${botSym}-wins`) return { score: 10 - depth };
  if (status === `${humanSym}-wins`) return { score: depth - 10 };
  if (status === 'tie') return { score: 0 };

  const moves = getPossibleMoves(board);
  const nextSym: Sym = currentSym === 'X' ? 'O' : 'X';
  const isMax = currentSym === botSym;
  let best = { score: isMax ? -Infinity : Infinity, move: moves[0] };

  for (const move of moves) {
    const { score } = minimax(makeMove(board, move.row, move.col, currentSym), botSym, nextSym, depth + 1);
    if (isMax ? score > best.score : score < best.score) best = { score, move };
  }
  return best;
}

class TicTacToeBotLogic implements IBot<TicTacToeGameData, TicTacToeAction> {
  chooseAction(state: TicTacToeGameData, playerId: string, difficulty: BotDifficulty): TicTacToeAction {
    const moves = getPossibleMoves(state.board);
    if (moves.length === 0) return { row: 0, col: 0 };

    const botSym: Sym = state.multiplayer.xPlayerId === playerId ? 'X' : 'O';
    const humanSym: Sym = botSym === 'X' ? 'O' : 'X';

    if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];

    if (difficulty === 'medium') {
      const win = findWinningMove(state.board, botSym);
      if (win) return win;
      const block = findWinningMove(state.board, humanSym);
      if (block) return block;
      if (state.board[1][1] === null) return { row: 1, col: 1 };
      return moves[Math.floor(Math.random() * moves.length)];
    }

    return minimax(state.board, botSym, state.currentPlayer, 0).move ?? moves[0];
  }
}

export const ticTacToeBot = new TicTacToeBotLogic();

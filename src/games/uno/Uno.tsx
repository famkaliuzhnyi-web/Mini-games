import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, useGameAction, useGameSnapshot } from '../../hooks/useSession';
import { useBots } from '../../hooks/useBots';
import { useBotRunner } from '../../hooks/useBotRunner';
import type { BotPlayer } from '../../types/bot';
import { useCoinService } from '../../hooks/useCoinService';
import { botService } from '../../services/BotService';
import { GameButton } from '../../components/ui';
import { unoGame } from './Uno.game';
import { unoBot } from './Uno.bot';
import { getActiveColor, getPlayableCards } from './gameLogic';
import type { UnoGameState, UnoAction, UnoCard, UnoColor } from './types';
import type { Player } from '../../core';
import './Uno.css';

interface UnoGameProps {
  playerId: string;
  playerName: string;
}

function cardLabel(card: UnoCard): string {
  if (card.value === 'wild') return 'W';
  if (card.value === 'wild4') return '+4';
  if (card.value === 'draw2') return '+2';
  if (card.value === 'skip') return '⊘';
  if (card.value === 'reverse') return '⇄';
  return card.value;
}

function isActionLabel(card: UnoCard): boolean {
  return ['skip', 'reverse', 'draw2', 'wild', 'wild4'].includes(card.value);
}

function colorClass(card: UnoCard): string {
  if (card.color === 'wild') return 'uno-card--wild';
  return `uno-card--${card.color}`;
}

interface CardProps {
  card: UnoCard;
  playable?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  large?: boolean;
}

function UnoCardView({ card, playable, faceDown, onClick }: CardProps) {
  const classes = [
    'uno-card',
    faceDown ? 'uno-card--face-down' : colorClass(card),
    playable ? 'uno-card--playable' : '',
  ].filter(Boolean).join(' ');

  if (faceDown) {
    return <div className={classes} />;
  }

  return (
    <div
      className={classes}
      onPointerDown={playable && onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    >
      <span className={`uno-card-value${isActionLabel(card) ? ' uno-card-value--action' : ''}`}>
        {cardLabel(card)}
      </span>
    </div>
  );
}

export const UnoGame: React.FC<UnoGameProps> = ({ playerId, playerName }) => {
  const session = useSession();
  const { bots } = useBots();
  const { awardGamePlay } = useCoinService();

  const isHost = !session.isInSession || session.role === 'host';
  const localPlayer: Player = session.localPlayer ?? { id: playerId, name: playerName, joinedAt: Date.now() };

  const allPlayers: Player[] = session.isInSession && session.localPlayer
    ? [session.localPlayer, ...session.peers]
    : [localPlayer];

  const [gameState, setGameState] = useState<UnoGameState>(() =>
    unoGame.initialState(allPlayers)
  );
  const gameStateRef = useRef<UnoGameState>(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const applyAndBroadcast = useCallback((action: UnoAction, from: Player) => {
    const current = gameStateRef.current;
    const next = unoGame.reduce(current, action, from);
    if (!next) return;
    setGameState(next);
    gameStateRef.current = next;
    if (session.isInSession) session.broadcastSnapshot('uno', next);
    if (next.winnerId) {
      if (next.winnerId === playerId) awardGamePlay('uno', 300);
      else if (!botService.isBot(playerId)) awardGamePlay('uno', 50);
    }
  }, [session, playerId, awardGamePlay]);

  const sendAction = useCallback((action: UnoAction) => {
    if (isHost) {
      applyAndBroadcast(action, localPlayer);
    } else {
      session.sendAction('uno', action);
    }
  }, [isHost, applyAndBroadcast, localPlayer, session]);

  useBotRunner(bots, gameState, unoGame, unoBot, isHost, applyAndBroadcast);

  useGameAction<UnoAction>('uno', (action, from) => {
    if (!isHost) return;
    applyAndBroadcast(action, from);
  });

  useGameSnapshot<UnoGameState>('uno', snapshot => {
    try {
      const validated = unoGame.validateSnapshot(snapshot);
      setGameState(validated);
      gameStateRef.current = validated;
    } catch {
      // malformed snapshot — ignore
    }
  });

  useEffect(() => {
    if (!isHost || !session.manager) return;
    return session.manager.on('game-snapshot-requested', ({ gameId, fromPeerId }) => {
      if (gameId !== 'uno') return;
      session.sendSnapshot('uno', gameStateRef.current, fromPeerId);
    });
  }, [isHost, session]);

  useEffect(() => {
    if (session.status === 'connected' && !isHost) {
      session.requestSnapshot('uno');
    }
  }, [session.status, isHost, session]);

  useEffect(() => {
    if (!session.isInSession) return;
    const newPlayers: Player[] = session.localPlayer
      ? [session.localPlayer, ...session.peers]
      : [];
    if (newPlayers.length === 0) return;
    setGameState(prev => {
      if (prev.status !== 'waiting') return prev;
      const fresh = unoGame.initialState(newPlayers);
      gameStateRef.current = fresh;
      return fresh;
    });
  }, [session.peers, session.localPlayer, session.isInSession]);

  const handleCardClick = useCallback((card: UnoCard) => {
    if (!unoGame.canAct(gameStateRef.current, localPlayer.id)) return;
    if (card.color === 'wild') {
      setPendingWildCard(card);
      setColorPickerOpen(true);
    } else {
      sendAction({ type: 'play-card', cardId: card.id });
    }
  }, [localPlayer.id, sendAction]);

  const handleColorChoice = useCallback((color: UnoColor) => {
    if (!pendingWildCard) return;
    sendAction({ type: 'play-card', cardId: pendingWildCard.id, chosenColor: color });
    setPendingWildCard(null);
    setColorPickerOpen(false);
  }, [pendingWildCard, sendAction]);

  const handleDraw = useCallback(() => {
    sendAction({ type: 'draw-card' });
  }, [sendAction]);

  const handleStart = useCallback(() => {
    const players: Player[] = session.isInSession && session.localPlayer
      ? [session.localPlayer, ...session.peers, ...bots.map((b: BotPlayer) => ({ id: b.id, name: b.name, joinedAt: 0 }))]
      : [...allPlayers, ...bots.map((b: BotPlayer) => ({ id: b.id, name: b.name, joinedAt: 0 }))];
    const fresh = unoGame.initialState(players);
    setGameState(fresh);
    gameStateRef.current = fresh;
    sendAction({ type: 'start' });
  }, [session, bots, allPlayers, sendAction]);

  const myState = gameState.players.find(p => p.id === localPlayer.id);
  const topCard = gameState.discard.length > 0 ? gameState.discard[gameState.discard.length - 1] : null;
  const activeColor = topCard ? getActiveColor(topCard) : 'red';
  const myPlayable = myState && topCard
    ? getPlayableCards(myState.hand, topCard, activeColor).map(c => c.id)
    : [];
  const isMyTurn = unoGame.canAct(gameState, localPlayer.id);

  const opponents = gameState.players.filter(p => p.id !== localPlayer.id);
  const currentPlayerId = gameState.playerOrder[gameState.currentPlayerIndex];

  return (
    <div className="uno-game">
      {/* Opponents */}
      <div className="uno-opponents">
        {opponents.map(opp => (
          <div
            key={opp.id}
            className={`uno-opponent${opp.id === currentPlayerId ? ' uno-opponent--active' : ''}`}
          >
            <span className="uno-opponent-name">{opp.name}</span>
            <div className="uno-opponent-cards">
              {opp.hand.slice(0, Math.min(opp.hand.length, 7)).map((_, i) => (
                <UnoCardView key={i} card={{ id: '', color: 'wild', value: 'wild' }} faceDown />
              ))}
              {opp.hand.length > 7 && (
                <span style={{ color: 'var(--color-text-2)', fontSize: '0.7rem', alignSelf: 'center' }}>
                  +{opp.hand.length - 7}
                </span>
              )}
            </div>
            <div className="uno-opponent-badges">
              {opp.isUno && <span className="uno-badge-uno">UNO</span>}
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-2)' }}>{opp.hand.length}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="uno-table">
        <div className="uno-table-piles">
          {/* Discard pile */}
          <div className="uno-discard">
            {topCard
              ? <UnoCardView card={topCard} />
              : <div className="uno-card" style={{ background: 'var(--color-surface-3)', borderStyle: 'dashed' }} />
            }
            <div className="uno-pile-label">Discard</div>
          </div>

          <div className="uno-direction-indicator">
            {gameState.direction === 1 ? '↻' : '↺'}
          </div>

          {/* Draw pile */}
          <div className="uno-draw-pile">
            <div className="uno-draw-pile-stack">
              <div className="uno-card uno-card--face-down" />
              {gameState.deck.length > 3 && <div className="uno-card uno-card--face-down" />}
              {gameState.deck.length > 6 && <div className="uno-card uno-card--face-down" />}
            </div>
            <div className="uno-pile-label">{gameState.deck.length} left</div>
          </div>
        </div>

        <div className={`uno-status${isMyTurn ? ' uno-status--your-turn' : ''}`}>
          {isMyTurn
            ? 'Your turn'
            : gameState.status === 'playing'
              ? `Waiting for ${gameState.players.find(p => p.id === currentPlayerId)?.name ?? '…'}`
              : gameState.status === 'waiting'
                ? 'Waiting for game to start'
                : ''
          }
        </div>
      </div>

      {/* Local player hand */}
      <div className="uno-hand-area">
        <div className="uno-hand">
          {myState?.hand.map(card => (
            <UnoCardView
              key={card.id}
              card={card}
              playable={isMyTurn && myPlayable.includes(card.id)}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>
        <GameButton
          className="uno-draw-btn"
          onClick={handleDraw}
          disabled={!isMyTurn || gameState.status !== 'playing'}
        >
          Draw
        </GameButton>
      </div>

      {/* Waiting overlay */}
      {gameState.status === 'waiting' && (
        <div className="uno-overlay">
          <div className="uno-overlay-title">UNO</div>
          <div className="uno-overlay-subtitle">
            {isHost ? 'Start when everyone is ready' : 'Waiting for host to start…'}
          </div>
          {isHost && (
            <GameButton className="uno-overlay-btn" onClick={handleStart}>
              Start Game
            </GameButton>
          )}
        </div>
      )}

      {/* Finished overlay */}
      {gameState.status === 'finished' && (
        <div className="uno-overlay">
          <div className="uno-overlay-title">
            {gameState.players.find(p => p.id === gameState.winnerId)?.name ?? 'Someone'} wins!
          </div>
          {(isHost || !session.isInSession) && (
            <GameButton className="uno-overlay-btn" onClick={handleStart}>
              Play Again
            </GameButton>
          )}
        </div>
      )}

      {/* Color picker */}
      {colorPickerOpen && (
        <div
          className="uno-color-picker-backdrop"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              setPendingWildCard(null);
              setColorPickerOpen(false);
            }
          }}
        >
          <div className="uno-color-picker">
            <div className="uno-color-picker-title">Choose a color</div>
            <div className="uno-color-options">
              {(['red', 'yellow', 'green', 'blue'] as UnoColor[]).map(color => (
                <GameButton
                  key={color}
                  className={`uno-color-option uno-color-option--${color}`}
                  onClick={() => handleColorChoice(color)}
                >{' '}</GameButton>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnoGame;

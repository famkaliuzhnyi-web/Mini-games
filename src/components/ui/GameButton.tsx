import React from 'react';

interface GameButtonProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Drop-in button replacement for use inside game containers that have swipe
 * gesture handlers. Uses onPointerDown + stopPropagation so it fires immediately
 * on touch without being suppressed by any ancestor non-passive touchstart listener.
 *
 * Use this instead of <button onClick={...}> for any action button inside a game.
 */
export const GameButton: React.FC<GameButtonProps> = ({
  onClick,
  className,
  disabled,
  style,
  children,
}) => (
  <button
    className={className}
    disabled={disabled}
    style={style}
    onPointerDown={(e) => {
      if (disabled) return;
      e.stopPropagation();
      onClick();
    }}
  >
    {children}
  </button>
);

export default GameButton;

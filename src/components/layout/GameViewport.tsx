import React, { useEffect, useRef, useState } from 'react';
import './GameViewport.css';

interface GameViewportProps {
  /** Natural design width the game was built for (px). */
  designWidth: number;
  /** Natural design height the game was built for (px). */
  designHeight: number;
  children: React.ReactNode;
}

/**
 * Letterboxed viewport: renders children at their natural design size and
 * uniformly scales the whole canvas to fill the available container space.
 *
 * Use for games with a fixed-canvas layout. Responsive/fluid games don't need this.
 */
export const GameViewport: React.FC<GameViewportProps> = ({ designWidth, designHeight, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setScale(Math.min(width / designWidth, height / designHeight));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth, designHeight]);

  return (
    <div ref={containerRef} className="game-viewport">
      <div
        className="game-viewport__canvas"
        style={{
          width: designWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default GameViewport;

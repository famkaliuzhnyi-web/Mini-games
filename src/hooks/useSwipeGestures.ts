import { useEffect, useRef, useCallback } from 'react';

// Always excluded from swipe detection — tapping these should never trigger a swipe.
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"]';

interface SwipeGestureOptions {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  preventDefault?: boolean;
  // Additional selector to exclude on top of the built-in interactive-element exclusion.
  excludeSelector?: string;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

function isExcluded(target: EventTarget | null, extraSelector?: string): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(INTERACTIVE_SELECTOR)) return true;
  if (extraSelector && target.closest(extraSelector)) return true;
  return false;
}

export const useSwipeGestures = (
  elementRef: React.RefObject<HTMLElement | null>,
  options: SwipeGestureOptions,
) => {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 500,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    preventDefault = false,
    excludeSelector,
  } = options;

  const touchStart = useRef<TouchPoint | null>(null);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isExcluded(e.target, excludeSelector)) return;
    if (preventDefault) e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      touchStart.current = { x: touch.clientX, y: touch.clientY, timestamp: Date.now() };
      isSwiping.current = false;
    }
  }, [preventDefault, excludeSelector]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isExcluded(e.target, excludeSelector)) return;
    if (preventDefault) e.preventDefault();
    if (!touchStart.current) return;
    const touch = e.touches[0];
    if (touch) {
      const dx = Math.abs(touch.clientX - touchStart.current.x);
      const dy = Math.abs(touch.clientY - touchStart.current.y);
      if (dx > 10 || dy > 10) isSwiping.current = true;
    }
  }, [preventDefault, excludeSelector]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (isExcluded(e.target, excludeSelector)) {
      touchStart.current = null;
      isSwiping.current = false;
      return;
    }
    if (preventDefault) e.preventDefault();
    if (!touchStart.current || !isSwiping.current) { touchStart.current = null; return; }

    const touch = e.changedTouches[0];
    if (!touch) { touchStart.current = null; return; }

    if (Date.now() - touchStart.current.timestamp > maxSwipeTime) {
      touchStart.current = null;
      return;
    }

    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const absDX = Math.abs(deltaX);
    const absDY = Math.abs(deltaY);

    if (Math.max(absDX, absDY) >= minSwipeDistance) {
      if (absDX > absDY) {
        deltaX > 0 ? onSwipeRight?.() : onSwipeLeft?.();
      } else {
        deltaY > 0 ? onSwipeDown?.() : onSwipeUp?.();
      }
    }

    touchStart.current = null;
    isSwiping.current = false;
  }, [minSwipeDistance, maxSwipeTime, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, preventDefault, excludeSelector]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const opts = { passive: !preventDefault };
    element.addEventListener('touchstart', handleTouchStart, opts);
    element.addEventListener('touchmove', handleTouchMove, opts);
    element.addEventListener('touchend', handleTouchEnd, opts);
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault, elementRef]);
};

export default useSwipeGestures;

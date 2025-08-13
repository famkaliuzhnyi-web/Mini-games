/**
 * Custom hook for detecting swipe gestures on touch devices
 */
import { useEffect, useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  preventDefault?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const useSwipeGestures = (
  elementRef: React.RefObject<HTMLElement | null>,
  options: SwipeGestureOptions
) => {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 500,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    preventDefault = true
  } = options;

  const touchStart = useRef<TouchPoint | null>(null);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }
    
    const touch = e.touches[0];
    if (touch) {
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      };
      isSwiping.current = false;
    }
  }, [preventDefault]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }
    
    if (!touchStart.current) return;
    
    const touch = e.touches[0];
    if (touch) {
      const deltaX = Math.abs(touch.clientX - touchStart.current.x);
      const deltaY = Math.abs(touch.clientY - touchStart.current.y);
      
      // Start tracking swipe if movement is significant
      if (deltaX > 10 || deltaY > 10) {
        isSwiping.current = true;
      }
    }
  }, [preventDefault]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }
    
    if (!touchStart.current || !isSwiping.current) {
      touchStart.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    if (!touch) {
      touchStart.current = null;
      return;
    }

    const endTime = Date.now();
    const timeDelta = endTime - touchStart.current.timestamp;
    
    // Check if swipe was fast enough
    if (timeDelta > maxSwipeTime) {
      touchStart.current = null;
      return;
    }

    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if swipe distance is sufficient
    if (Math.max(absDeltaX, absDeltaY) < minSwipeDistance) {
      touchStart.current = null;
      return;
    }

    // Determine swipe direction
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    touchStart.current = null;
    isSwiping.current = false;
  }, [minSwipeDistance, maxSwipeTime, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, preventDefault]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault, elementRef]);
};

export default useSwipeGestures;
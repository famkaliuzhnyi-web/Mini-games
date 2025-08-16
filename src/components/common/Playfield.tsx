/**
 * Playfield Component
 * Universal scaling component for games with fixed aspect ratios
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  PlayfieldProps, 
  PlayfieldDimensions, 
  PlayfieldMinConstraints,
  PlayfieldMaxConstraints 
} from './Playfield.types';
import './Playfield.css';

/**
 * Calculate optimal playfield dimensions based on available space and constraints
 */
function calculatePlayfieldDimensions(
  availableWidth: number,
  availableHeight: number,
  aspectRatio: number,
  baseWidth: number = 800,
  baseHeight: number = 600,
  minConstraints: PlayfieldMinConstraints = {},
  maxConstraints: PlayfieldMaxConstraints = {}
): PlayfieldDimensions {
  // Determine if we're in portrait or landscape mode
  const screenAspectRatio = availableWidth / availableHeight;
  const isPortrait = screenAspectRatio < 1;
  const isLandscape = screenAspectRatio >= 1;
  
  let width: number;
  let height: number;
  
  // For portrait orientation: constrain by width (use maximum screen width)
  // For landscape orientation: constrain by height (use maximum screen height)
  if (isPortrait) {
    // Portrait: maximize width usage
    width = availableWidth;
    height = width / aspectRatio;
    
    // If calculated height exceeds available height, constrain by height instead
    if (height > availableHeight) {
      height = availableHeight;
      width = height * aspectRatio;
    }
  } else {
    // Landscape: maximize height usage
    height = availableHeight;
    width = height * aspectRatio;
    
    // If calculated width exceeds available width, constrain by width instead
    if (width > availableWidth) {
      width = availableWidth;
      height = width / aspectRatio;
    }
  }
  
  // Apply maximum constraints
  if (maxConstraints.maxWidth && width > maxConstraints.maxWidth) {
    width = maxConstraints.maxWidth;
    height = width / aspectRatio;
  }
  if (maxConstraints.maxHeight && height > maxConstraints.maxHeight) {
    height = maxConstraints.maxHeight;
    width = height * aspectRatio;
  }
  
  // Apply minimum constraints
  const minWidth = minConstraints.minWidth || (baseWidth * 0.3); // 30% of base by default
  const minHeight = minConstraints.minHeight || (baseHeight * 0.3); // 30% of base by default
  
  if (width < minWidth || height < minHeight) {
    // Use the larger scale factor to ensure both constraints are met
    const widthScale = minWidth / width;
    const heightScale = minHeight / height;
    const scale = Math.max(widthScale, heightScale);
    
    width = Math.max(width * scale, minWidth);
    height = Math.max(height * scale, minHeight);
    
    // Maintain aspect ratio after applying minimums
    if (width / height !== aspectRatio) {
      if (width / minWidth > height / minHeight) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }
    }
  }
  
  // Calculate scale factor relative to base dimensions
  const scale = Math.min(width / baseWidth, height / baseHeight);
  
  // Apply scale constraints
  const finalScale = Math.max(
    minConstraints.minScale || 0.1,
    Math.min(maxConstraints.maxScale || 10, scale)
  );
  
  return {
    width: Math.round(width),
    height: Math.round(height),
    scale: finalScale,
    isPortrait,
    isLandscape
  };
}

export const Playfield: React.FC<PlayfieldProps> = ({
  aspectRatio,
  baseWidth = 800,
  baseHeight = 600,
  minConstraints = {},
  maxConstraints = {},
  padding = 20,
  className = '',
  responsive = true,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<PlayfieldDimensions>(() => {
    // Initialize with default viewport dimensions
    const defaultWidth = Math.min(window.innerWidth - padding * 2, 800);
    const defaultHeight = Math.min(window.innerHeight - padding * 2, 600);
    
    return calculatePlayfieldDimensions(
      defaultWidth,
      defaultHeight,
      aspectRatio,
      baseWidth,
      baseHeight,
      minConstraints,
      maxConstraints
    );
  });
  
  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Use container dimensions if available, otherwise fall back to viewport
    const availableWidth = containerRect.width > 0 
      ? containerRect.width - padding * 2
      : window.innerWidth - padding * 2;
    const availableHeight = containerRect.height > 0
      ? containerRect.height - padding * 2
      : window.innerHeight - padding * 2;
    
    const newDimensions = calculatePlayfieldDimensions(
      availableWidth,
      availableHeight,
      aspectRatio,
      baseWidth,
      baseHeight,
      minConstraints,
      maxConstraints
    );
    
    setDimensions(newDimensions);
  }, [aspectRatio, baseWidth, baseHeight, minConstraints, maxConstraints, padding]);
  
  // Handle responsive resizing
  useEffect(() => {
    if (!responsive) return;
    
    const handleResize = () => {
      calculateDimensions();
    };
    
    // Initial calculation
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateDimensions, responsive]);
  
  // Recalculate on container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      calculateDimensions();
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateDimensions]);
  
  return (
    <div 
      ref={containerRef}
      className={`playfield-container ${className}`}
      style={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${padding}px`
      }}
    >
      <div
        className="playfield-content"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      >
        {children(dimensions)}
      </div>
    </div>
  );
};

export default Playfield;
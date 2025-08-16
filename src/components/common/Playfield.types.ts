/**
 * Playfield Component Types
 * Universal scaling component for games with fixed aspect ratios
 */

export interface PlayfieldDimensions {
  /** Calculated width in pixels */
  width: number;
  /** Calculated height in pixels */
  height: number;
  /** Scale factor relative to base dimensions (1.0 = no scaling) */
  scale: number;
  /** Whether the orientation is portrait */
  isPortrait: boolean;
  /** Whether the orientation is landscape */
  isLandscape: boolean;
}

export interface PlayfieldMinConstraints {
  /** Minimum width in pixels */
  minWidth?: number;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Minimum scale factor */
  minScale?: number;
}

export interface PlayfieldMaxConstraints {
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Maximum scale factor */
  maxScale?: number;
}

export interface PlayfieldProps {
  /** Aspect ratio (width/height) for the playfield */
  aspectRatio: number;
  /** Base width used for scale calculations */
  baseWidth?: number;
  /** Base height used for scale calculations */
  baseHeight?: number;
  /** Minimum size constraints */
  minConstraints?: PlayfieldMinConstraints;
  /** Maximum size constraints */
  maxConstraints?: PlayfieldMaxConstraints;
  /** Padding around the playfield in pixels */
  padding?: number;
  /** Additional CSS class name */
  className?: string;
  /** Whether to enable responsive behavior on window resize */
  responsive?: boolean;
  /** Render function that receives calculated dimensions */
  children: (dimensions: PlayfieldDimensions) => React.ReactNode;
}

export interface PlayfieldContextValue extends PlayfieldDimensions {
  /** Recalculate dimensions manually */
  recalculate: () => void;
}
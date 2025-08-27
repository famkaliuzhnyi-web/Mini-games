# Playfield Component Documentation

The `Playfield` component is a universal scaling component designed for games with fixed aspect ratios. It automatically handles responsive scaling based on screen orientation and available space.

## Features

- **Universal Aspect Ratio Support**: Works with any aspect ratio (width/height)
- **Orientation-Aware Scaling**: 
  - Portrait mode: maximizes width usage, calculates height from aspect ratio
  - Landscape mode: maximizes height usage, calculates width from aspect ratio
- **Constraints Support**: Minimum/maximum dimensions and scale factors
- **Responsive**: Automatically resizes on window resize and container changes
- **Performance**: Uses ResizeObserver for efficient container monitoring
- **Accessibility**: Respects `prefers-reduced-motion` settings
- **Render Props**: Provides calculated dimensions to children

## Basic Usage

```tsx
import { Playfield } from '../components/common';
import type { PlayfieldDimensions } from '../components/common';

function MyGame() {
  return (
    <Playfield
      aspectRatio={1.77} // 16:9 aspect ratio
      baseWidth={800}
      baseHeight={450}
    >
      {(dimensions: PlayfieldDimensions) => (
        <div 
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            background: dimensions.isPortrait ? '#blue' : '#green'
          }}
        >
          <p>Scale: {dimensions.scale.toFixed(2)}</p>
          <p>Orientation: {dimensions.isPortrait ? 'Portrait' : 'Landscape'}</p>
        </div>
      )}
    </Playfield>
  );
}
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aspectRatio` | `number` | Required | Width/height ratio (e.g., 1.77 for 16:9) |
| `baseWidth` | `number` | `800` | Base width for scale calculations |
| `baseHeight` | `number` | `600` | Base height for scale calculations |
| `minConstraints` | `PlayfieldMinConstraints` | `{}` | Minimum size constraints |
| `maxConstraints` | `PlayfieldMaxConstraints` | `{}` | Maximum size constraints |
| `padding` | `number` | `20` | Padding around playfield in pixels |
| `className` | `string` | `''` | Additional CSS class name |
| `responsive` | `boolean` | `true` | Enable responsive behavior |
| `children` | `(dimensions) => ReactNode` | Required | Render function |

### PlayfieldDimensions

The render function receives a `PlayfieldDimensions` object:

```tsx
interface PlayfieldDimensions {
  width: number;        // Calculated width in pixels
  height: number;       // Calculated height in pixels
  scale: number;        // Scale factor (1.0 = base size)
  isPortrait: boolean;  // True if in portrait orientation
  isLandscape: boolean; // True if in landscape orientation
}
```

### Constraints

#### Minimum Constraints

```tsx
interface PlayfieldMinConstraints {
  minWidth?: number;   // Minimum width in pixels
  minHeight?: number;  // Minimum height in pixels
  minScale?: number;   // Minimum scale factor
}
```

#### Maximum Constraints

```tsx
interface PlayfieldMaxConstraints {
  maxWidth?: number;   // Maximum width in pixels
  maxHeight?: number;  // Maximum height in pixels
  maxScale?: number;   // Maximum scale factor
}
```

## Common Aspect Ratios

```tsx
// Square (1:1)
<Playfield aspectRatio={1} />

// 4:3 Traditional
<Playfield aspectRatio={4/3} />

// 16:9 Widescreen
<Playfield aspectRatio={16/9} />

// 2:1 Ping Pong
<Playfield aspectRatio={2} />

// 3:2 Classic
<Playfield aspectRatio={3/2} />
```

## Advanced Usage

### With Constraints

```tsx
<Playfield
  aspectRatio={1}
  baseWidth={400}
  baseHeight={400}
  minConstraints={{
    minWidth: 240,
    minHeight: 240,
    minScale: 0.5
  }}
  maxConstraints={{
    maxWidth: 800,
    maxHeight: 800,
    maxScale: 2.0
  }}
  padding={10}
  responsive={true}
>
  {(dimensions) => (
    <GameBoard 
      width={dimensions.width}
      height={dimensions.height}
      scale={dimensions.scale}
    />
  )}
</Playfield>
```

### Scaling Game Elements

```tsx
<Playfield aspectRatio={2} baseWidth={800} baseHeight={400}>
  {(dimensions) => (
    <div
      style={{
        width: '100%',
        height: '100%',
        fontSize: `${dimensions.scale * 16}px`, // Scale font
      }}
    >
      <Ball 
        size={dimensions.scale * 20} // Scale ball size
        speed={dimensions.scale * 5} // Scale movement speed
      />
      <Paddle
        width={dimensions.scale * 80}
        height={dimensions.scale * 20}
      />
    </div>
  )}
</Playfield>
```

## Integration Examples

### Tic-Tac-Toe Integration

The component has been successfully integrated with the Tic-Tac-Toe game:

```tsx
<Playfield
  aspectRatio={1} // Square
  baseWidth={360}
  baseHeight={360}
  minConstraints={{
    minWidth: 240,
    minHeight: 240,
    minScale: 0.5
  }}
  maxConstraints={{
    maxWidth: 500,
    maxHeight: 500,
    maxScale: 1.5
  }}
>
  {(dimensions) => (
    <div 
      className="tic-tac-toe-board"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        fontSize: `${Math.max(1, dimensions.scale * 2)}rem`
      }}
    >
      {/* 3x3 grid */}
    </div>
  )}
</Playfield>
```

## CSS Classes

The component provides CSS classes for styling:

- `.playfield-container`: Main container
- `.playfield-content`: Inner content wrapper
- `.aspect-16-9`, `.aspect-4-3`, `.aspect-1-1`, etc.: Utility classes

## Browser Support

- Modern browsers supporting ResizeObserver
- Graceful degradation for older browsers
- Mobile-first responsive design
- High DPI display optimization

## Performance Considerations

- Uses ResizeObserver for efficient resize detection
- Debounced resize calculations
- CSS transforms for smooth scaling transitions
- Minimal re-renders through optimized state management

## Testing

The component includes comprehensive responsive testing:
- Desktop (1200x800)
- Mobile Portrait (400x800)
- Mobile Landscape (800x400)
- Various aspect ratios and constraints

## Migration Guide

To migrate existing games to use Playfield:

1. Import the component and types
2. Wrap your game content in Playfield
3. Replace fixed dimensions with calculated dimensions
4. Update CSS to use relative sizing instead of fixed pixels
5. Test across different screen sizes

Example migration:

```tsx
// Before
<div className="game-board" style={{ width: '400px', height: '400px' }}>
  {gameContent}
</div>

// After
<Playfield aspectRatio={1} baseWidth={400} baseHeight={400}>
  {(dimensions) => (
    <div 
      className="game-board" 
      style={{ 
        width: `${dimensions.width}px`, 
        height: `${dimensions.height}px` 
      }}
    >
      {gameContent}
    </div>
  )}
</Playfield>
```
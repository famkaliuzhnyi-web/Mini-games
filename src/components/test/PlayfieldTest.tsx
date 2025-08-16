/**
 * Playfield Test Component
 * Simple test to validate the Playfield component functionality
 */
import React from 'react';
import { Playfield } from '../common';
import type { PlayfieldDimensions } from '../common';

interface PlayfieldTestProps {
  aspectRatio?: number;
  baseWidth?: number;
  baseHeight?: number;
}

export const PlayfieldTest: React.FC<PlayfieldTestProps> = ({
  aspectRatio = 1, // Square by default
  baseWidth = 400,
  baseHeight = 400
}) => {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#f0f0f0' }}>
      <h2 style={{ textAlign: 'center', padding: '1rem' }}>
        Playfield Test (Aspect Ratio: {aspectRatio.toFixed(2)})
      </h2>
      
      <div style={{ height: 'calc(100vh - 100px)' }}>
        <Playfield
          aspectRatio={aspectRatio}
          baseWidth={baseWidth}
          baseHeight={baseHeight}
          minConstraints={{
            minWidth: 200,
            minHeight: 200,
            minScale: 0.3
          }}
          maxConstraints={{
            maxScale: 2.0
          }}
          padding={20}
          responsive={true}
        >
          {(dimensions: PlayfieldDimensions) => (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: dimensions.isPortrait ? '#e3f2fd' : '#fff3e0',
                border: '2px solid #333',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontFamily: 'monospace',
                padding: '20px',
                boxSizing: 'border-box'
              }}
            >
              <h3>Playfield Dimensions</h3>
              <div style={{ textAlign: 'left' }}>
                <div>Width: {dimensions.width}px</div>
                <div>Height: {dimensions.height}px</div>
                <div>Scale: {dimensions.scale.toFixed(3)}</div>
                <div>Orientation: {dimensions.isPortrait ? 'Portrait' : 'Landscape'}</div>
                <div>Aspect Ratio: {aspectRatio.toFixed(3)}</div>
              </div>
              
              {/* Visual grid to show scaling */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridTemplateRows: 'repeat(3, 1fr)',
                  gap: '4px',
                  width: '60%',
                  height: '60%',
                  marginTop: '20px'
                }}
              >
                {Array.from({ length: 9 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#4caf50',
                      border: '1px solid #2e7d32',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Playfield>
      </div>
    </div>
  );
};
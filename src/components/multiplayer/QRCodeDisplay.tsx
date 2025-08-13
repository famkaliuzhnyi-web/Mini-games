/**
 * QR Code Component for sharing multiplayer session links
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  title?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  url, 
  size = 200, 
  title = "Scan to Join Game" 
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(dataUrl);
        setError('');
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setError('Failed to generate QR code');
      }
    };

    if (url) {
      generateQRCode();
    }
  }, [url, size]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // Could add toast notification here
      console.log('URL copied to clipboard');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  if (error) {
    return (
      <div style={{
        padding: '1rem',
        border: '1px solid #f44336',
        borderRadius: '4px',
        backgroundColor: '#fde8e8',
        textAlign: 'center'
      }}>
        <p style={{ color: '#f44336', margin: '0' }}>❌ {error}</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1.5rem',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#fff',
      textAlign: 'center'
    }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>{title}</h3>
      
      {qrCodeDataUrl ? (
        <div style={{ marginBottom: '1rem' }}>
          <img 
            src={qrCodeDataUrl} 
            alt="QR Code for multiplayer session" 
            style={{ 
              maxWidth: '100%',
              border: '1px solid #eee',
              borderRadius: '4px'
            }}
          />
        </div>
      ) : (
        <div style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '4px',
          margin: '0 auto 1rem auto'
        }}>
          <p>Generating QR Code...</p>
        </div>
      )}
      
      <div style={{ 
        fontSize: '0.9rem',
        wordBreak: 'break-all',
        backgroundColor: '#f9f9f9',
        padding: '0.5rem',
        borderRadius: '4px',
        marginBottom: '1rem'
      }}>
        {url}
      </div>
      
      <button
        onClick={copyToClipboard}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1976D2';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#2196F3';
        }}
      >
        📋 Copy Link
      </button>
    </div>
  );
};
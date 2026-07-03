import React from 'react';

export function CalibrateLogo() {
  return (
    <div
      role="img"
      aria-label="Calibrate Operational Intelligence"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 210,
        color: 'var(--dt-colors-text-neutral-default, #24233b)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: 8,
          flexShrink: 0,
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 800,
          background: 'linear-gradient(135deg, #1496ff 0%, #00c2a8 100%)',
          boxShadow: '0 0 0 1px rgba(20,150,255,0.28)',
        }}
      >
        Ca
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05, minWidth: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' }}>Calibrate</span>
        <span
          style={{
            fontSize: 8,
            letterSpacing: 1.2,
            color: 'var(--dt-colors-text-neutral-subdued, #5f6380)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          Operational Intelligence
        </span>
      </div>
    </div>
  );
}

import React from 'react';

export function CalibrateLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <svg
        role="img"
        aria-label="Calibrate"
        width="28"
        height="28"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="20" cy="20" r="14" stroke="rgba(20,150,255,0.2)" strokeWidth="1.5" />
        <path d="M 20 6 A 14 14 0 0 1 34 20" stroke="#1496ff" strokeWidth="1.5" fill="none" />
        <path d="M 34 20 A 14 14 0 0 1 20 34" stroke="#73be28" strokeWidth="1.5" fill="none" />
        <path d="M 20 34 A 14 14 0 0 1 6 20" stroke="rgba(20,150,255,0.35)" strokeWidth="1.5" fill="none" />
        <path d="M 6 20 A 14 14 0 0 1 20 6" stroke="rgba(115,190,40,0.3)" strokeWidth="1.5" fill="none" />
        <circle cx="20" cy="20" r="6" stroke="#1496ff" strokeWidth="1.5" strokeDasharray="2.5 2" />
        <line x1="20" y1="3.5" x2="20" y2="11.5" stroke="#1496ff" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="28.5" x2="20" y2="36.5" stroke="#1496ff" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3.5" y1="20" x2="11.5" y2="20" stroke="#1496ff" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28.5" y1="20" x2="36.5" y2="20" stroke="#1496ff" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="20" r="2.5" fill="#73be28" />
        <circle cx="20" cy="20" r="1" fill="#0d1117" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: 0,
          color: 'var(--dt-colors-text-neutral-default, #1a1a2e)',
        }}>
          Calibrate
        </span>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#1496ff',
        }}>
          Signal - Intelligence - Action
        </span>
      </div>
    </div>
  );
}

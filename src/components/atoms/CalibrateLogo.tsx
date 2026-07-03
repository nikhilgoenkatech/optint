import React from 'react';

export function CalibrateLogo() {
  return (
    <svg width="200" height="36" viewBox="0 0 200 36" role="img" aria-label="Calibrate" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', maxWidth: '100%', height: 'auto' }}>
      {/* Gauge arc outer */}
      <path d="M 4 28 A 18 18 0 0 1 40 28" fill="none" stroke="#1496ff" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Gauge arc inner */}
      <path d="M 9 28 A 13 13 0 0 1 35 28" fill="none" stroke="#1496ff" strokeWidth="1.5" opacity="0.25"/>
      {/* Tick marks */}
      <line x1="4" y1="28" x2="6.5" y2="25.5" stroke="#1496ff" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="22" y1="10" x2="22" y2="13" stroke="#1496ff" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="40" y1="28" x2="37.5" y2="25.5" stroke="#1496ff" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Needle */}
      <line x1="22" y1="28" x2="33" y2="13" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
      {/* Pivot */}
      <circle cx="22" cy="28" r="3" fill="#1496ff"/>
      <circle cx="22" cy="28" r="1.5" fill="#ffffff"/>
      {/* Signal dot */}
      <circle cx="34" cy="17" r="2.5" fill="#1496ff"/>
      {/* Wordmark — white so it shows on dark AppHeader */}
      <text x="50" y="22" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontWeight="700" fontSize="18" fill="var(--dt-colors-text-neutral-default, #24233b)">Calibrate</text>
      <text x="51" y="32" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontWeight="400" fontSize="7.5" fill="var(--dt-colors-text-neutral-subdued, #5f6380)" letterSpacing="1.5">OPERATIONAL INTELLIGENCE</text>
    </svg>
  );
}

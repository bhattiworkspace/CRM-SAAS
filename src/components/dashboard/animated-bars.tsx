'use client';

import React, { useEffect, useState } from 'react';

export function AnimatedBar({ width, className }: { width: number; className: string }) {
  const [currentWidth, setCurrentWidth] = useState(0);

  useEffect(() => {
    // Slight delay to ensure the animation triggers after mount
    const timer = setTimeout(() => {
      setCurrentWidth(width);
    }, 100);
    return () => clearTimeout(timer);
  }, [width]);

  return (
    <div 
      className={`h-full rounded-full transition-all duration-1000 ease-out ${className}`}
      style={{ width: `${currentWidth}%` }}
    />
  );
}

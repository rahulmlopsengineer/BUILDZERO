'use client';

import { useEffect, useRef } from 'react';
import ShapeGrid from '@/components/ShapeGrid';

export default function ShapeGridBackground() {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Forward document-level mouse events into the canvas so hover trails work
  // without blocking any UI clicks (canvas stays pointer-events: none)
  useEffect(() => {
    const forward = (e: MouseEvent) => {
      const canvas = canvasWrapperRef.current?.querySelector('canvas');
      if (!canvas) return;
      const cloned = new MouseEvent(e.type, e);
      canvas.dispatchEvent(cloned);
    };
    document.addEventListener('mousemove', forward);
    document.addEventListener('mouseleave', (e) => {
      const canvas = canvasWrapperRef.current?.querySelector('canvas');
      canvas?.dispatchEvent(new MouseEvent('mouseleave', e));
    });
    return () => document.removeEventListener('mousemove', forward);
  }, []);

  return (
    <div
      ref={canvasWrapperRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <ShapeGrid
        speed={0.4}
        squareSize={40}
        direction="diagonal"
        borderColor="rgba(124, 110, 245, 0.12)"
        hoverFillColor="rgba(124, 110, 245, 0.18)"
        shape="square"
        hoverTrailAmount={4}
      />
    </div>
  );
}


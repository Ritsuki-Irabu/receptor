'use client';

import { useEffect, useRef } from 'react';

interface ParticleCanvasProps {
  opacity?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  opacityDir: number;
  opacitySpeed: number;
  color: string;
}

export default function ParticleCanvas({ opacity = 1.0 }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particleCount = 70;
    const particles: Particle[] = [];

    const colors = [
      `rgba(79, 110, 247, `,
      `rgba(129, 140, 248, `,
    ];

    for (let i = 0; i < particleCount; i++) {
      const baseOpacity = (0.2 + Math.random() * 0.6) * opacity;
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 1 + Math.random() * 2,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: baseOpacity,
        opacityDir: Math.random() > 0.5 ? 1 : -1,
        opacitySpeed: 0.001 + Math.random() * 0.003,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;

        const maxOp = 0.8 * opacity;
        const minOp = 0.2 * opacity;
        p.opacity += p.opacityDir * p.opacitySpeed;
        if (p.opacity > maxOp) { p.opacity = maxOp; p.opacityDir = -1; }
        if (p.opacity < minOp) { p.opacity = minOp; p.opacityDir = 1; }

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

// @ts-nocheck
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { BRAND } from '../../config/brand.js';
import { SoundFX } from '../../lib/soundEffects.js';

interface Gamified3DOrbProps {
  size?: number;
  interactive?: boolean;
  onOrbClick?: () => void;
  className?: string;
}

function GemScene({
  animate,
  onClick,
  isBoosting,
}: {
  animate: boolean;
  onClick: () => void;
  isBoosting: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  const reduceMotion = Boolean(useReducedMotion());

  const brandColor = BRAND.colors.brand;
  const accentColor = BRAND.colors.brandAccent;
  const irisColor = BRAND.colors.iris;

  useFrame((_state, delta) => {
    if (!animate || reduceMotion) return;

    const speedMultiplier = isBoosting ? 4.5 : 1;

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.7 * speedMultiplier;
      meshRef.current.rotation.x += delta * 0.4 * speedMultiplier;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.5 * speedMultiplier;
      ringRef.current.rotation.x = Math.sin(ringRef.current.rotation.z) * 0.3;
    }
  });

  return (
    <Float
      speed={animate && !reduceMotion ? (isBoosting ? 4 : 2) : 0}
      rotationIntensity={animate && !reduceMotion ? 0.4 : 0}
      floatIntensity={animate && !reduceMotion ? 0.6 : 0}
    >
      {/* Cristal / Poliedro Central Interativo */}
      <mesh
        ref={meshRef}
        scale={isBoosting ? 1.35 : 1.2}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => {
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
        }}
      >
        <icosahedronGeometry args={[1, 1]} />
        <MeshDistortMaterial
          color={brandColor}
          emissive={accentColor}
          emissiveIntensity={isBoosting ? 1.2 : 0.45}
          metalness={0.7}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          distort={animate && !reduceMotion ? (isBoosting ? 0.45 : 0.2) : 0}
          speed={animate && !reduceMotion ? (isBoosting ? 6 : 2.5) : 0}
        />
      </mesh>

      {/* Anel Orbital de Energia */}
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 3, 0.2, 0]}>
          <torusGeometry args={[1.7, 0.025, 16, 64]} />
          <meshStandardMaterial
            color={irisColor}
            emissive={irisColor}
            emissiveIntensity={0.6}
            transparent
            opacity={0.8}
          />
        </mesh>
        {/* Satélite Orbital */}
        <mesh position={[1.7, 0, 0]} scale={0.1}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Partículas / Faíscas */}
      <Sparkles
        count={isBoosting ? 60 : 30}
        scale={3.2}
        size={isBoosting ? 5 : 3.5}
        speed={animate && !reduceMotion ? (isBoosting ? 1.2 : 0.4) : 0}
        opacity={0.85}
        color={accentColor}
      />
    </Float>
  );
}

/**
 * Elemento 3D Interativo de Gamificação (Tendência 2026).
 * Um cristal cósmico em WebGL que reage dinamicamente a cliques, cursor e eventos de recompensa.
 * Autonomamente pausa loops de render quando fora do viewport ou em abas em background.
 */
export function Gamified3DOrb({
  size = 180,
  interactive = true,
  onOrbClick,
  className,
}: Gamified3DOrbProps) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );
  const [isBoosting, setIsBoosting] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => setIsIntersecting(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => setIsTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const shouldAnimate = !reduceMotion && isIntersecting && isTabVisible;

  const handleInteract = () => {
    if (!interactive) return;

    SoundFX.play('success');
    setIsBoosting(true);

    // Celebração com confetes em leque
    confetti({
      particleCount: 35,
      spread: 55,
      origin: { y: 0.7 },
      colors: [
        '--color-brand-accent',
        '--color-brand-primary',
        '--color-brand-secondary',
        '--color-success',
      ].map((token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim()),
    });

    onOrbClick?.();

    setTimeout(() => {
      setIsBoosting(false);
    }, 1200);
  };

  return (
    <button
      type="button"
      ref={containerRef}
      style={{ width: size, height: size }}
      className={`relative select-none appearance-none border-0 bg-transparent p-0 ${className || ''}`}
      onClick={handleInteract}
      disabled={!interactive}
      title={interactive ? 'Clique no Cristal 3D para obter impulso de energia!' : undefined}
    >
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        frameloop={shouldAnimate ? 'always' : 'demand'}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.65} />
        <pointLight position={[4, 4, 4]} intensity={2.8} color={BRAND.colors.brandAccent} />
        <pointLight position={[-4, -3, 2]} intensity={2} color={BRAND.colors.iris} />
        <directionalLight position={[0, 5, 2]} intensity={1.2} />
        <GemScene animate={shouldAnimate} onClick={handleInteract} isBoosting={isBoosting} />
      </Canvas>
    </button>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";

interface MousePosition {
  x: number;
  y: number;
}

interface MagneticEffect {
  intensity: number;
  x: number;
  y: number;
}

interface UseMagneticEffectProps {
  attractionDistance?: number;
  attractionIntensity?: number;
}

export const useMagneticEffect = ({
  attractionDistance = 200,
  attractionIntensity = 0.3,
}: UseMagneticEffectProps = {}) => {
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [globalMousePosition, setGlobalMousePosition] = useState<MousePosition>(
    { x: 0, y: 0 }
  );
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Track global mouse position for magnetic effect
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setGlobalMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

  // Update card rectangle when component mounts or resizes
  useEffect(() => {
    const updateCardRect = () => {
      if (cardRef.current) {
        setCardRect(cardRef.current.getBoundingClientRect());
      }
    };

    updateCardRect();
    window.addEventListener("resize", updateCardRect);
    return () => window.removeEventListener("resize", updateCardRect);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setCardRect(rect);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Calculate magnetic attraction effect
  const getMagneticEffect = useCallback((): MagneticEffect => {
    if (!cardRect) return { intensity: 0, x: 0, y: 0 };

    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;

    const distance = Math.sqrt(
      Math.pow(globalMousePosition.x - cardCenterX, 2) +
        Math.pow(globalMousePosition.y - cardCenterY, 2)
    );

    const intensity = Math.max(0, 1 - distance / attractionDistance);

    // Calculate relative position for the glow effect
    const relativeX = Math.max(
      0,
      Math.min(cardRect.width, globalMousePosition.x - cardRect.left)
    );
    const relativeY = Math.max(
      0,
      Math.min(cardRect.height, globalMousePosition.y - cardRect.top)
    );

    return {
      intensity: intensity * attractionIntensity,
      x: relativeX,
      y: relativeY,
    };
  }, [cardRect, globalMousePosition, attractionDistance, attractionIntensity]);

  const magneticEffect = getMagneticEffect();
  const effectiveIntensity = isHovered ? 1 : magneticEffect.intensity;
  const effectiveX = isHovered ? mousePosition.x : magneticEffect.x;
  const effectiveY = isHovered ? mousePosition.y : magneticEffect.y;

  return {
    cardRef,
    effectiveIntensity,
    effectiveX,
    effectiveY,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  };
};

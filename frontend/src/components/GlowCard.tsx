import React from "react";
import { useMagneticEffect } from "../hooks/useMagneticEffect";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  attractionDistance?: number;
  attractionIntensity?: number;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = "",
  glowColor = "rgba(153, 69, 255, 0.6)",
  attractionDistance = 200,
  attractionIntensity = 0.3,
}) => {
  const {
    cardRef,
    effectiveIntensity,
    effectiveX,
    effectiveY,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  } = useMagneticEffect({ attractionDistance, attractionIntensity });

  const backgroundStyle = {
    background:
      effectiveIntensity > 0.05
        ? `radial-gradient(circle 500px at ${effectiveX}px ${effectiveY}px, rgba(153, 69, 255, ${
            0.3 * effectiveIntensity
          }), transparent 40%)`
        : "transparent",
  };

  const borderGlowStyle = {
    opacity: effectiveIntensity > 0.05 ? effectiveIntensity : 0,
    background: `radial-gradient(circle 100px at ${effectiveX}px ${effectiveY}px, ${glowColor}, transparent 70%)`,
    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    maskComposite: "xor",
    WebkitMask:
      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    padding: "1px",
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-xl transition-all duration-300 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={backgroundStyle}
    >
      <div
        className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none"
        style={borderGlowStyle}
      />

      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

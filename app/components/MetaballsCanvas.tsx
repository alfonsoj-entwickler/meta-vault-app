"use client";

import { useEffect, useRef } from "react";
import { CentralBlobs, BackgroundBlobs } from "./metaballs.utils";

interface MetaballsCanvasProps {
  primaryColor?: string;
  secondaryColor?: string;
  opacity?: number;
}

export function MetaballsCanvas({
  primaryColor = "#22c55e",
  secondaryColor = "#dcfce7",
  opacity = 0.15,
}: MetaballsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const stateRef = useRef({
    lastTime: 0,
    hasFocus: true,
    deltaMultiplier: 1,
    animating: true,
  });

  useEffect(() => {
    // Check for reduced motion preference
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centralBlobs = new CentralBlobs();
    let backgroundBlobs: BackgroundBlobs | null = null;

    const deltaMultiplierStep = 0.01;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        stateRef.current.lastTime = performance.now();
      }
    };

    const handleFocus = () => {
      stateRef.current.hasFocus = true;
      if (!stateRef.current.animating) startAnim();
    };

    const handleBlur = () => {
      stateRef.current.hasFocus = false;
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!stateRef.current.animating) drawFrame(0);
    });

    resizeObserver.observe(canvas);

    addEventListener("focus", handleFocus);
    addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const drawFrame = (delta: number) => {
      const canvasBounds = canvas.getBoundingClientRect();
      canvas.width = canvasBounds.width * devicePixelRatio;
      canvas.height = canvasBounds.height * devicePixelRatio;

      ctx.scale(devicePixelRatio, devicePixelRatio);

      // Center point for gravity
      const centerX = canvasBounds.width / 2;
      const centerY = canvasBounds.height / 2;
      const centerRadius =
        Math.min(canvasBounds.width, canvasBounds.height) * 0.15;

      if (!backgroundBlobs) {
        backgroundBlobs = new BackgroundBlobs(canvasBounds);
      }

      backgroundBlobs.advance(
        delta,
        canvasBounds,
        centerX,
        centerY,
        centerRadius,
      );
      centralBlobs.advance(delta);

      // Clear canvas with gradient background
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillRect(0, 0, canvasBounds.width, canvasBounds.height);

      // Draw blobs with primary color
      ctx.globalAlpha = opacity;
      ctx.fillStyle = primaryColor;

      backgroundBlobs.draw(ctx);
      centralBlobs.draw(ctx, centerX, centerY, centerRadius);

      ctx.globalAlpha = 1;
    };

    const frame = (time: number) => {
      if (!canvas.isConnected) {
        removeEventListener("focus", handleFocus);
        removeEventListener("blur", handleBlur);
        resizeObserver.disconnect();
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
        return;
      }

      if (!stateRef.current.hasFocus) {
        stateRef.current.deltaMultiplier = Math.max(
          0,
          stateRef.current.deltaMultiplier - deltaMultiplierStep,
        );
        if (stateRef.current.deltaMultiplier === 0) {
          stateRef.current.animating = false;
          return;
        }
      } else if (stateRef.current.deltaMultiplier !== 1) {
        stateRef.current.deltaMultiplier = Math.min(
          1,
          stateRef.current.deltaMultiplier + deltaMultiplierStep,
        );
      }

      const delta =
        (time - stateRef.current.lastTime) * stateRef.current.deltaMultiplier;
      stateRef.current.lastTime = time;

      drawFrame(delta);

      animationRef.current = requestAnimationFrame(frame);
    };

    const startAnim = () => {
      stateRef.current.animating = true;
      animationRef.current = requestAnimationFrame((time: number) => {
        stateRef.current.lastTime = time;
        frame(time);
      });
    };

    startAnim();

    return () => {
      removeEventListener("focus", handleFocus);
      removeEventListener("blur", handleBlur);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [primaryColor, secondaryColor, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: -1 }}
    />
  );
}

export default MetaballsCanvas;


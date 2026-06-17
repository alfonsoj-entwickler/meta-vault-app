"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

export default function ParticlesBg() {
  const [init, setInit] = useState(false);

  // This function initializes the tsParticles engine only once
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      // loadSlim adds the basic features (nodes and connected lines)
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // ULTRA-SMOOTH BUBBLE CONFIGURATION
  const options: ISourceOptions = {
    fullScreen: {
      enable: false,
    },
    fpsLimit: 60, // Crucial for high refresh rate screens (smoothness)
    particles: {
      number: {
        value: 60, // Balanced amount so as not to saturate the screen
        density: {
          enable: true,
          // area: 800 // Controls dispersion
        },
      },
      color: {
        // Combination of soft light/greenish tones
        value: ["#eeffed", "#a6ffa1", "#8dfa87"],
      },
      shape: {
        type: "circle", // Bubble shape
      },
      opacity: {
        // Low and variable opacity to give a liquid transparency feel
        value: { min: 0.1, max: 0.8 },
        animation: {
          enable: true,
          speed: 0.5,
          sync: false,
        },
      },
      size: {
        // Varied sizes to simulate depth
        value: { min: 15, max: 50 },
        animation: {
          enable: true,
          speed: 2,
          sync: false,
        },
      },
      move: {
        enable: true,
        speed: 1.2, // Low speed = more elegant and relaxing movement
        direction: "top", // Bubbles float upwards
        random: true, // Non-linear movement
        straight: false, // False so they have that subtle "aquatic" swaying
        outModes: {
          default: "out", // When they reach the top, they disappear and smoothly reappear at the bottom
        },
        attract: {
          enable: false,
        },
      },
    },
    interactivity: {
      events: {
        onHover: {
          enable: false,
          mode: "bubble", // On hover, bubbles react by inflating
        },
        onClick: {
          enable: false,
          mode: "push", // On click, more bubbles are released
        },
      },
      modes: {
        bubble: {
          distance: 180, // Mouse interaction radius
          size: 24, // Size to which bubbles inflate
          duration: 0.4,
          opacity: 0.7, // They become a bit more visible when touched
        },
        push: {
          quantity: 4, // Number of new bubbles generated on click
        },
      },
    },
    detectRetina: true,
  };

  if (!init) return null;

  return (
    <div className="relative inset-0 z-0 h-screen w-full">
      <Particles
        id="tsparticles"
        className="w-full h-full"
        // particlesLoaded={particlesLoaded}
        options={options}
      />
    </div>
  );
}

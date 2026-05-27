"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Container, ISourceOptions } from "@tsparticles/engine";

export default function ParticlesBg() {
  const [init, setInit] = useState(false);

  // Esta función inicializa el motor de tsParticles una sola vez
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      // loadSlim añade las características básicas (nodos y líneas conectadas)
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container): Promise<void> => {
    console.log("Particles loaded:", container);
  };

  // CONFIGURACIÓN ULTRA-SMOOTH DE BURBUJAS
  const options: ISourceOptions = {
    fpsLimit: 60, // Crucial para pantallas de alta tasa de refresco (smoothness)
    particles: {
      number: {
        value: 60, // Cantidad equilibrada para que no sature la pantalla
        density: {
          enable: true,
          // area: 800 // Controla la dispersión
        },
      },
      color: {
        // Combinación de blanco puro con sutiles tonos azulados/celestes
        value: ["#eeffed", "#a6ffa1", "#8dfa87"],
      },
      shape: {
        type: "circle", // Forma de burbuja
      },
      opacity: {
        // Opacidad variable y baja para dar sensación de transparencia líquida
        value: { min: 0.1, max: 0.8 },
        animation: {
          enable: true,
          speed: 0.5,
          sync: false,
        },
      },
      size: {
        // Tamaños variados para simular profundidad
        value: { min: 15, max: 50 },
        animation: {
          enable: true,
          speed: 2,
          sync: false,
        },
      },
      move: {
        enable: true,
        speed: 1.2, // Velocidad baja = movimiento más elegante y relajante
        direction: "top", // Las burbujas flotan hacia arriba
        random: true, // Movimiento no lineal
        straight: false, // Falso para que tengan ese sutil balanceo "acuático"
        outModes: {
          default: "out", // Cuando llegan arriba, desaparecen y reaparecen abajo suavemente
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
          mode: "bubble", // Al pasar el ratón, las burbujas reaccionan inflándose
        },
        onClick: {
          enable: false,
          mode: "push", // Al hacer clic se liberan más burbujas
        },
      },
      modes: {
        bubble: {
          distance: 180, // Radio de acción del ratón
          size: 24, // Tamaño al que se inflan las burbujas
          duration: 0.4,
          opacity: 0.7, // Se vuelven un poco más visibles al tocarlas
        },
        push: {
          quantity: 4, // Cuántas burbujas nuevas nacen al hacer clic
        },
      },
    },
    detectRetina: true,
  };

  if (!init) return null;

  return (
    <div className="absolute inset-0 z-0 h-full w-full">
      <Particles
        id="tsparticles"
        className="w-full h-full"
        // particlesLoaded={particlesLoaded}
        options={options}
      />
    </div>
  );
}

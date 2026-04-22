'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  useEffect(() => {
    const container = document.getElementById("logo-container");
    const coming = document.getElementById("coming-soon");

    // Etapa 1: mostrar logo con fade + translateY
    setTimeout(() => {
      if (container) {
        container.classList.add("visible");
        container.style.transform = "translateY(0)";
      }
    }, 300);

    // Etapa 2: mostrar "Coming Soon"
    setTimeout(() => {
      if (coming) {
        coming.classList.add("visible");
        coming.style.transform = "translateY(0)";
      }
    }, 1500);
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white overflow-hidden">
      <div
        id="logo-container"
        className="relative w-[480px] max-w-[80%] opacity-0"
        style={{
          transform: 'translateY(20px)',
          transition: 'opacity 1.5s ease, transform 1.5s ease'
        }}
      >
        <Image
          id="logo"
          src="/quanta_logo.png"
          alt="QUANTA by GFG AM Logo"
          width={480}
          height={120}
          className="w-full h-auto"
          priority
        />
      </div>

      <div
        id="coming-soon"
        className="opacity-0 text-2xl mt-8"
        style={{
          transform: 'translateY(20px)',
          transition: 'opacity 1.5s ease, transform 1.5s ease',
          color: '#4DB8C4'
        }}
      >
        Coming Soon
      </div>

      <style jsx>{`
        .visible {
          opacity: 1 !important;
        }
      `}</style>
    </main>
  );
}

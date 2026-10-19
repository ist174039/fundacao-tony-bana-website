"use client"

import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { useSpring, animated } from "@react-spring/web"
import { PresentationControls, Float } from "@react-three/drei"
import { Phone } from "@/components/3d/phone"
import { Button } from "@/components/ui/button"

export default function Hero() {
  const [hovered, setHovered] = useState(false)

  const buttonSpring = useSpring({
    scale: hovered ? 1.1 : 1,
    boxShadow: hovered ? "0 0 25px 5px rgba(0, 80, 179, 0.6)" : "0 0 5px 2px rgba(0, 80, 179, 0.3)",
    config: { tension: 300, friction: 10 },
  })

  return (
    <section className="relative h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background gradient circles */}
      <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-40 -right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-20 left-40 w-72 h-72 bg-blue-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="container mx-auto grid lg:grid-cols-2 gap-8 items-center z-10">
        <div className="space-y-8 text-center lg:text-left">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            <span className="block">Stop Scrolling.</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
              Start Locking In.
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-lg mx-auto lg:mx-0">
            Replace your scrolling addiction with productive studying through interactive questions, flashcards, and
            more.
          </p>
          <animated.div style={buttonSpring} className="inline-block">
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 rounded-full text-xl font-bold transition-all shadow-lg shadow-blue-700/50"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              Let&apos;s Lock In
            </Button>
          </animated.div>
        </div>

        <div className="h-[400px] lg:h-[500px]">
          <Canvas>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <PresentationControls
              global
              rotation={[0, -Math.PI / 6, 0]}
              polar={[-Math.PI / 6, Math.PI / 6]}
              azimuth={[-Math.PI / 6, Math.PI / 6]}
              config={{ mass: 2, tension: 400 }}
              snap={{ mass: 4, tension: 400 }}
            >
              <Float rotationIntensity={0.2} speed={2}>
                <Phone position={[0, 0, 0]} scale={1.5} />
              </Float>
            </PresentationControls>
          </Canvas>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 flex justify-center">
        <div className="animate-bounce bg-white bg-opacity-10 p-2 w-10 h-10 ring-1 ring-white ring-opacity-20 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </section>
  )
}

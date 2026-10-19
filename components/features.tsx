"use client"

import { useRef } from "react"
import { useInView } from "framer-motion"
import { Brain, BarChart3, Smartphone } from "lucide-react"

export default function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  const features = [
    {
      icon: <Brain className="w-12 h-12 text-blue-400" />,
      title: "Scrolling Interface",
      description: "Replace your scrolling addiction with productive studying.",
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-blue-500" />,
      title: "Competitive Learning",
      description: "Healthy leaderboard competition to accelerate your growth.",
    },
    {
      icon: <Smartphone className="w-12 h-12 text-blue-600" />,
      title: "Mode Selection",
      description: "Different modes to tailor to your needs: Multiple choice, Flashcards, and Written Form.",
    },
  ]

  return (
    <section className="py-20 px-4 bg-black bg-opacity-60">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
            Transform Your Learning Habits
          </span>
        </h2>

        <div
          ref={ref}
          className="grid md:grid-cols-3 gap-8"
          style={{
            transform: isInView ? "none" : "translateY(50px)",
            opacity: isInView ? 1 : 0,
            transition: "all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.2s",
          }}
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-900 p-8 rounded-xl border border-gray-800 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
              style={{
                transitionDelay: `${index * 0.1 + 0.2}s`,
              }}
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

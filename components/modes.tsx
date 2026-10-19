"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { CheckCircle2, BookOpen, PenLine } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"

export default function Modes() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  const modes = [
    {
      id: "multiple-choice",
      icon: <CheckCircle2 className="w-6 h-6" />,
      title: "Multiple Choice",
      description: "Test your knowledge with carefully crafted multiple choice questions.",
      image: "/placeholder.svg?height=300&width=500",
    },
    {
      id: "flashcards",
      icon: <BookOpen className="w-6 h-6" />,
      title: "Flashcards",
      description: "Quickly review key concepts with interactive flashcards.",
      image: "/placeholder.svg?height=300&width=500",
    },
    {
      id: "written",
      icon: <PenLine className="w-6 h-6" />,
      title: "Written Form",
      description: "Deepen your understanding by writing out complete answers.",
      image: "/placeholder.svg?height=300&width=500",
    },
  ]

  return (
    <section className="py-20 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black opacity-80 z-0"></div>

      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
              Choose Your Learning Mode
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Different ways to engage with content based on your learning style and goals
          </p>
        </div>

        <div
          ref={ref}
          style={{
            transform: isInView ? "none" : "translateY(50px)",
            opacity: isInView ? 1 : 0,
            transition: "all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.2s",
          }}
        >
          <Tabs defaultValue="multiple-choice" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
              {modes.map((mode) => (
                <TabsTrigger
                  key={mode.id}
                  value={mode.id}
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <span className="flex items-center gap-2">
                    {mode.icon}
                    <span className="hidden sm:inline">{mode.title}</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {modes.map((mode) => (
              <TabsContent key={mode.id} value={mode.id}>
                <Card className="border-0 bg-transparent shadow-none">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                      <div>
                        <h3 className="text-2xl font-bold mb-4">{mode.title}</h3>
                        <p className="text-gray-300 mb-6">{mode.description}</p>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-blue-700/50">
                            Try {mode.title}
                          </button>
                        </motion.div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl overflow-hidden">
                        <img
                          src={mode.image || "/placeholder.svg"}
                          alt={`${mode.title} interface preview`}
                          className="w-full h-auto rounded-lg shadow-lg"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  )
}

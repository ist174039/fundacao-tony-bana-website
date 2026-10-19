"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`sticky top-0 z-50 w-full border-b border-white/10 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-md"
          : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      }`}
    >
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05, rotate: 5 }} transition={{ type: "spring", stiffness: 300 }}>
            <Image
              src="/logo.jpg"
              alt="Fundação Tony Bana"
              width={70}
              height={70}
              className="rounded-full ring-1 ring-white/15 transition-all group-hover:ring-primary/70"
            />
          </motion.div>
          <span className="flex flex-col font-montserrat font-semibold leading-tight transition-colors group-hover:text-primary">
            <span className="text-base sm:text-lg">Fundação Tony Bana</span>
            <span className="mono-label mt-1 !text-[0.55rem] !tracking-[0.15em] text-muted-foreground">Comunidade · inclusão</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="#missao"
            className="text-sm font-medium transition-all hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Sobre
          </Link>
          <Link
            href="#pilares"
            className="text-sm font-medium transition-all hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Pilares
          </Link>
         
          <Link
            href="#membros"
            className="text-sm font-medium transition-all hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Membros
          </Link>
           <Link
            href="#carrossel"
            className="text-sm font-medium transition-all hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Galeria
          </Link>
          <Link
            href="#noticias"
            className="text-sm font-medium transition-all hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Notícias
          </Link>
          <Link
            href="#parceiros"
            className="text-sm font-medium transition-all hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Parceiros
          </Link>
          <Link
            href="#contato"
            className="text-sm font-medium transition-all hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Contato
          </Link>
        </nav>

        <Button asChild className="hidden h-10 rounded-full px-5 md:inline-flex">
          <a href="#contato">Contactar <ArrowUpRight className="ml-1.5 h-4 w-4" /></a>
        </Button>

        <Button variant="outline" size="icon" aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"} className="border-white/15 bg-white/[0.04] md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t overflow-hidden"
          >
            <nav className="container flex flex-col gap-4 py-4">
              <Link
                href="#missao"
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Sobre
              </Link>
              <Link
                href="#pilares"
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Pilares
              </Link>
              <Link
                href="#membros"
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Membros
              </Link>
               <Link
                href="#carrossel"
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Galeria
              </Link>
              <Link
                href="#noticias"
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Notícias
              </Link>
              <Link
                href="#parceiros"
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Parceiros
              </Link>
              <Link
                href="#contato"
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Contato
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { COLLECTIONS, getCollection } from "@/lib/firebase-firestore";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  const navigationItems = [
    { href: "#missao", label: "Sobre" },
    { href: "#pilares", label: "Pilares" },
    ...(availableSections.includes("membros")
      ? [{ href: "#membros", label: "Membros" }]
      : []),
    ...(availableSections.includes("carrossel")
      ? [{ href: "#carrossel", label: "Galeria" }]
      : []),
    ...(availableSections.includes("noticias")
      ? [{ href: "#noticias", label: "Notícias" }]
      : []),
    ...(availableSections.includes("parceiros")
      ? [{ href: "#parceiros", label: "Parceiros" }]
      : []),
    { href: "#contato", label: "Contato" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getCollection(COLLECTIONS.MEMBROS)
        .then((items) => (items.length > 0 ? "membros" : null))
        .catch(() => null),
      getCollection(COLLECTIONS.CARROSSEL)
        .then((items) => (items.length > 0 ? "carrossel" : null))
        .catch(() => null),
      getCollection(COLLECTIONS.NOTICIAS)
        .then((items) => (items.length > 0 ? "noticias" : null))
        .catch(() => null),
      getCollection(COLLECTIONS.PARCEIROS)
        .then((items) => (items.length > 0 ? "parceiros" : null))
        .catch(() => null),
    ]).then((sections) => {
      if (mounted)
        setAvailableSections(
          sections.filter((section): section is string => Boolean(section)),
        );
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`sticky top-0 z-50 w-full border-b border-border transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-md"
          : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      }`}
    >
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Image
              src="/logo.jpg"
              alt="Fundação Tony Bana"
              width={280}
              height={184}
              priority
              className="h-14 w-[5.25rem] object-contain transition-transform group-hover:scale-[1.03] sm:h-16 sm:w-24"
            />
          </motion.div>
          <span className="flex flex-col font-montserrat font-semibold leading-tight transition-colors group-hover:text-primary">
            <span className="text-base sm:text-lg">Fundação Tony Bana</span>
            <span className="mono-label mt-1 !text-[0.55rem] !tracking-[0.15em] text-muted-foreground">
              Comunidade · inclusão
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-sm font-medium transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:text-primary hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button
          asChild
          className="hidden h-10 rounded-full px-5 md:inline-flex"
        >
          <a href="#contato">
            Contactar <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </a>
        </Button>

        <Button
          variant="outline"
          size="icon"
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          className="border-border bg-card md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
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
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium transition-colors hover:text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

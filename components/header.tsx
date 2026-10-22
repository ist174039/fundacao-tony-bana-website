"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/components/site-content-provider";

const fixedNavigation = [
  { href: "#missao", label: "A Fundação" },
  { href: "#pilares", label: "O nosso trabalho" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { members, news, partners, gallery } = useSiteContent();
  const availableSections = [
    members.length > 0 && "membros",
    gallery.length > 0 && "carrossel",
    news.length > 0 && "noticias",
    partners.length > 0 && "parceiros",
  ].filter((section): section is string => Boolean(section));

  const navigationItems = [
    ...fixedNavigation,
    ...(availableSections.includes("membros")
      ? [{ href: "#membros", label: "Equipa" }]
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
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(
        scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0,
      );
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-border/80 bg-background/95 shadow-sm backdrop-blur-xl"
          : "border-transparent bg-background/85 backdrop-blur-md"
      }`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary transition-[width] duration-150"
        style={{ width: `${scrollProgress}%` }}
      />
      <div className="container flex h-[4.5rem] items-center justify-between gap-4 md:h-20">
        <Link
          href="/"
          onClick={closeMenu}
          aria-label="Fundação Tony Bana — início"
          className="group flex min-w-0 items-center"
        >
          <Image
            src="/logo.jpg"
            alt="Fundação Tony Bana"
            width={280}
            height={184}
            priority
            className="h-12 w-[4.6rem] shrink-0 object-contain transition-transform group-hover:scale-[1.03] sm:h-14 sm:w-[5.25rem]"
          />
          <span className="ml-2 flex min-w-0 flex-col font-montserrat font-semibold leading-tight text-foreground">
            <span className="truncate text-sm sm:text-base">
              Fundação Tony Bana
            </span>
            <span className="mt-1 text-[0.58rem] font-medium uppercase tracking-[0.13em] text-muted-foreground">
              Comunidade · inclusão
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-1 xl:flex"
        >
          {navigationItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-[0.82rem] font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Button
          asChild
          className="hidden h-10 shrink-0 rounded-full px-5 xl:inline-flex"
        >
          <a href="#contato">
            Quero ser sócio <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </a>
        </Button>

        <Button
          variant="outline"
          size="icon"
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isMenuOpen}
          className="h-10 w-10 shrink-0 rounded-full border-border bg-card xl:hidden"
          onClick={() => setIsMenuOpen((value) => !value)}
        >
          {isMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full border-b border-border bg-background/98 px-4 pb-5 pt-2 shadow-lg backdrop-blur-xl xl:hidden"
          >
            <nav
              aria-label="Navegação móvel"
              className="mx-auto flex max-w-6xl flex-col gap-1"
            >
              {navigationItems.map((item, index) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {item.label}
                  <span className="font-mono text-xs text-muted-foreground">
                    0{index + 1}
                  </span>
                </a>
              ))}
              <Button asChild className="mt-2 w-full rounded-full">
                <a href="#contato" onClick={closeMenu}>
                  Quero ser sócio <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

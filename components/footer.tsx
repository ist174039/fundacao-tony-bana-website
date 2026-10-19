"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Facebook, Instagram, Twitter, Linkedin } from "lucide-react";
import { FaTiktok } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/50 py-12">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center md:items-start gap-4"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Image
                src="/logo.jpg"
                alt="Fundação Tony Bana"
                width={280}
                height={184}
                className="h-auto w-36 object-contain"
              />
            </motion.div>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Transformando comunidades através do desporto, educação e saúde.
            </p>
          </motion.div>

          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col items-center md:items-start"
          >
            <h3 className="font-montserrat font-semibold mb-4">
              Links Rápidos
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <a
                href="#missao"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Sobre
              </a>
              <a
                href="#pilares"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Pilares
              </a>
              <a
                href="#contato"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Contacto
              </a>
            </nav>
          </motion.div>

          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center md:items-start"
          >
            <h3 className="font-montserrat font-semibold mb-4">
              Redes Sociais
            </h3>
            <div className="flex gap-3">
              <motion.a
                whileHover={{ scale: 1.2, rotate: 5 }}
                href="https://www.facebook.com/share/1JKRFpjske/?mibextid=wwXIfr"
                className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.2, rotate: 5 }}
                href="https://www.tiktok.com/@fundacao_tonybana"
                className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <FaTiktok className="h-5 w-5" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.2, rotate: 5 }}
                href="https://www.instagram.com/fundacao_tonybana?igsh=MXEzZHJqbGF0ZGtuOQ=="
                className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </motion.a>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="border-t pt-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Fundação Tony Bana. Todos os direitos
              reservados.
            </p>
            <p>
              Powered by{" "}
              <a
                href="https://nantoidigital.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Nantoi Digital
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

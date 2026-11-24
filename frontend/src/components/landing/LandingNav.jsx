import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useMotionValueEvent } from "motion/react";
import LiquidCTA from "./LiquidCTA";

const links = [
  { href: "#platform", label: "Platform" },
  { href: "#experiences", label: "Experiences" },
  { href: "#workflow", label: "How it works" },
  { href: "#about", label: "About" }
];

function NexusMark() {
  return (
    <svg className="nexus-mark" viewBox="0 0 36 36" aria-hidden="true">
      <defs>
        <linearGradient id="nexus-mark-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#a68bff" />
          <stop offset="0.5" stopColor="#7255ef" />
          <stop offset="1" stopColor="#5146e5" />
        </linearGradient>
      </defs>
      <path d="M6 24.5c5.4 0 5.3-15 12-15 5.4 0 5.2 17 12 17" />
      <path d="M6 11.5c5.5 0 6 14 12 14 5.4 0 5.1-16 12-16" />
    </svg>
  );
}

export default function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const menuToggleRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 24);
  });

  useEffect(() => {
    const sections = links
      .map((link) => document.querySelector(link.href))
      .filter(Boolean);
    if (!("IntersectionObserver" in window)) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(`#${visible.target.id}`);
    }, { rootMargin: "-28% 0px -58% 0px", threshold: [0, 0.1, 0.4] });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    if (menuOpen) menuToggleRef.current?.focus();
  };

  return (
    <header className={`nexus-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="nexus-nav__inner">
        <a className="nexus-wordmark" href="#top" aria-label="NEXUS home" onClick={closeMenu}>
          <NexusMark />
          <span>NEXUS</span>
        </a>

        <nav className="nexus-nav__links" aria-label="Main navigation">
          {links.map((link) => (
            <a key={link.href} href={link.href} aria-current={active === link.href ? "location" : undefined}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="nexus-nav__actions">
          <a className="nexus-nav__signin" href="/login">Sign in</a>
          <LiquidCTA href="/signup" className="nexus-cta--compact" arrow>Sign up</LiquidCTA>
        </div>

        <button
          ref={menuToggleRef}
          className="nexus-nav__toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.nav
            id="mobile-navigation"
            className="nexus-nav__mobile"
            aria-label="Mobile navigation"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            {links.map((link) => (
              <a key={link.href} href={link.href} aria-current={active === link.href ? "location" : undefined} onClick={closeMenu}>
                {link.label}<span aria-hidden="true">↗</span>
              </a>
            ))}
            <a href="/login" onClick={closeMenu}>Sign in</a>
            <LiquidCTA href="/signup" onClick={closeMenu}>Create your account</LiquidCTA>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

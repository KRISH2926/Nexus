import React from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { BookOpen, CalendarDays, GraduationCap, QrCode, ShieldCheck, UsersRound } from "lucide-react";
import ConnectedMotionCanvas from "../components/landing/ConnectedMotionCanvas";
import LandingNav from "../components/landing/LandingNav";
import LandingSections, { LandingFooter } from "../components/landing/LandingSections";
import LiquidCTA from "../components/landing/LiquidCTA";
import "./LandingPrototype.css";

const headlineVariants = {
  hidden: {},
  visible: {
    transition: { delayChildren: 0.18, staggerChildren: 0.14 }
  }
};

const headlineLineVariants = {
  hidden: { opacity: 0, y: "112%" },
  visible: {
    opacity: 1,
    y: "0%",
    transition: { duration: 0.72, ease: [0.2, 0.75, 0.25, 1] }
  }
};

const campusLinks = [
  { label: "Academic", Icon: BookOpen },
  { label: "People", Icon: UsersRound },
  { label: "Gatepasses", Icon: QrCode },
  { label: "Operations", Icon: ShieldCheck }
];

export default function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      <div className="nexus-site">
        <LandingNav />
        <main>
          <section className="nexus-hero" id="top" aria-labelledby="nexus-hero-title">
            <div className="nexus-hero__copy">
              <p className="nexus-eyebrow nexus-hero__eyebrow"><span /> THE CAMPUS, CONNECTED.</p>
              <motion.h1
                id="nexus-hero-title"
                variants={headlineVariants}
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
              >
                <motion.span className="nexus-hero__title-line" variants={headlineLineVariants}>
                  Everything on campus.
                </motion.span>
                <motion.span className="nexus-hero__title-line nexus-hero__title-line--accent" variants={headlineLineVariants}>
                  Finally, in sync.
                </motion.span>
              </motion.h1>
              <p className="nexus-hero__summary">
                Classes, attendance, assignments, people and campus permissions. NEXUS brings the everyday work of college into one connected place.
              </p>
              <div className="nexus-hero__actions">
                <LiquidCTA href="#hero-visual" arrow>See how it works</LiquidCTA>
                <LiquidCTA href="/signup" className="nexus-cta--secondary">Get started</LiquidCTA>
              </div>
              <div className="nexus-hero__quick-links" aria-label="Connected campus areas">
                {campusLinks.map(({ label, Icon }) => (
                  <span key={label}><Icon aria-hidden="true" />{label}</span>
                ))}
              </div>
            </div>

            <div
              className="nexus-hero__art"
              id="hero-visual"
              role="img"
              aria-label="A luminous particle NEXUS wordmark with connected icons for the campus calendar, teachers, people, gatepasses and security"
            >
              <div className="nexus-hero__art-meta">
                <span>CONNECTED MOTION</span><i /><span>01 / NEXUS</span>
              </div>
              <svg className="nexus-hero__orbit" viewBox="0 0 760 620" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="nexus-orbit-gradient" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#f4a8dc" />
                    <stop offset="0.42" stopColor="#7662ff" />
                    <stop offset="0.72" stopColor="#74c9f4" />
                    <stop offset="1" stopColor="#a28cff" />
                  </linearGradient>
                </defs>
                <ellipse className="nexus-hero__orbit-halo" cx="380" cy="310" rx="300" ry="118" transform="rotate(-13 380 310)" />
                <ellipse className="nexus-hero__orbit-line" cx="380" cy="310" rx="300" ry="118" transform="rotate(-13 380 310)" />
                <ellipse className="nexus-hero__orbit-line nexus-hero__orbit-line--inner" cx="380" cy="310" rx="253" ry="89" transform="rotate(13 380 310)" />
              </svg>
              <div className="nexus-hero__canvas-wrap">
                <span className="nexus-hero__wordmark-hint">NEXUS</span>
                <ConnectedMotionCanvas />
              </div>
              <div className="nexus-hero__orbit-node nexus-hero__orbit-node--calendar"><CalendarDays aria-hidden="true" /></div>
              <div className="nexus-hero__orbit-node nexus-hero__orbit-node--teacher"><GraduationCap aria-hidden="true" /></div>
              <div className="nexus-hero__orbit-node nexus-hero__orbit-node--people"><UsersRound aria-hidden="true" /></div>
              <div className="nexus-hero__orbit-node nexus-hero__orbit-node--pass"><QrCode aria-hidden="true" /></div>
              <div className="nexus-hero__orbit-node nexus-hero__orbit-node--security"><ShieldCheck aria-hidden="true" /></div>
              <div className="nexus-hero__art-foot">
                <span>PEOPLE / PLANS / PERMISSIONS</span>
                <span>A CAMPUS IN SYNC</span>
              </div>
            </div>
            <svg className="nexus-hero__wave" viewBox="0 0 1600 150" preserveAspectRatio="none" aria-hidden="true">
              <path className="nexus-hero__wave-back" d="M0 94 C150 38 250 137 415 87S660 30 820 79 1050 132 1220 70 1450 39 1600 83" />
              <path className="nexus-hero__wave-front" d="M0 112 C170 62 260 146 440 105S680 57 860 101 1090 146 1260 98 1450 66 1600 106" />
            </svg>
          </section>
          <LandingSections />
        </main>
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}

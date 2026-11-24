import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, BookOpen, CalendarDays, Check, ClipboardList, GraduationCap, MessagesSquare, QrCode, ShieldCheck, UsersRound } from "lucide-react";
import FaqAccordion from "../ui/FaqAccordion";
import LiquidCTA from "./LiquidCTA";
import "./LandingSections.css";

const gatepassSteps = [
  {
    role: "Student",
    title: "The student sends a request.",
    copy: "Add a reason and expected exit time. The request starts a clear approval trail."
  },
  {
    role: "Teacher",
    title: "The assigned teacher reviews it.",
    copy: "The mentor checks the request and records a decision in NEXUS."
  },
  {
    role: "Parent",
    title: "The parent decides in the portal.",
    copy: "The parent reviews and confirms or rejects the request inside the NEXUS parent portal."
  },
  {
    role: "Security",
    title: "Security checks the approved QR.",
    copy: "A one-time pass is scanned at the gate. The exit and return are recorded."
  }
];

const platformModules = [
  {
    id: "academic",
    label: "ACADEMICS",
    title: "Academic life",
    copy: "Classes, attendance, timetables and assignments in view.",
    features: ["Attendance", "Timetable", "Assignments", "Submissions", "Results"]
  },
  {
    id: "people",
    label: "PEOPLE",
    title: "People & administration",
    copy: "Student records, faculty details, batches and subjects.",
    features: ["Students", "Teachers", "Batches", "Subjects", "Reports"]
  },
  {
    id: "operations",
    label: "OPERATIONS",
    title: "Campus operations",
    copy: "Requests, approvals, gatepasses and security checks.",
    features: ["Gatepass", "Parent approval", "Security check", "Exit and return"]
  },
  {
    id: "communication",
    label: "COMMUNICATION",
    title: "Keep everyone in the loop",
    copy: "Important updates, parent messages and request status.",
    features: ["Notifications", "Parent portal", "Teacher updates", "Request status"]
  }
];

const roleExperiences = {
  student: {
    label: "Students",
    headline: "Know what's next.",
    copy: "Check classes, keep up with assignments and follow requests without chasing updates.",
    preview: "STUDENT SPACE",
    title: "Your day, at a glance",
    items: ["Next class · Timetable", "Assignment · Due soon", "Gatepass · Request status"],
    visual: "student"
  },
  teacher: {
    label: "Teachers",
    headline: "Keep your classes moving.",
    copy: "Manage attendance, follow student progress, organise assignments and review requests.",
    preview: "TEACHER SPACE",
    title: "Class work, together",
    items: ["Today · Your classes", "Attendance · Mark and review", "Requests · Awaiting decision"],
    visual: "teacher"
  },
  administrator: {
    label: "Administrators",
    headline: "See the bigger picture.",
    copy: "Manage people, academic records, campus operations and reports from one workspace.",
    preview: "ADMIN SPACE",
    title: "Campus, organised",
    items: ["People · Students and faculty", "Academics · Batches and subjects", "Operations · Requests and records"],
    visual: "administrator"
  },
  security: {
    label: "Campus security",
    headline: "Every exit, properly checked.",
    copy: "Verify approved gatepasses, confirm student identity and record campus exits and returns.",
    preview: "SECURITY SPACE",
    title: "Gate check",
    items: ["Scan · Check a one-time pass", "Verify · Confirm student identity", "Record · Exit or return"],
    visual: "security"
  }
};

const faqItems = [
  {
    question: "What is NEXUS?",
    answer: "NEXUS brings academic work, student records and campus operations into one connected platform."
  },
  {
    question: "Who can use NEXUS?",
    answer: "Students, teachers, administrators and authorised campus security personnel each have their own workspace."
  },
  {
    question: "Can NEXUS work with our existing academic processes?",
    answer: "NEXUS is designed to organise existing campus activities. The college can configure users, batches, subjects and workflows according to its setup."
  },
  {
    question: "How are gatepass decisions handled?",
    answer: "Students submit requests, assigned teachers review them and verified parents confirm them through the NEXUS portal. Approved passes can then be checked by campus security."
  },
  {
    question: "Does NEXUS require paid messaging services?",
    answer: "The core approval process works inside NEXUS. Optional browser and email notifications can help users know when an action needs attention."
  },
  {
    question: "Can students and teachers see the same dashboard?",
    answer: "No. Each role has a workspace for its responsibilities, and information is available according to assigned access."
  }
];

function ProductIntroduction() {
  return (
    <section className="product-intro" aria-labelledby="product-intro-title">
      <div className="product-intro__layout">
        <div className="product-intro__copy">
          <p className="nexus-eyebrow"><span /> YOU KNOW HOW CAMPUS LIFE WORKS.</p>
          <h2 id="product-intro-title">Attendance here.<br />Assignments there.<br /><em>Requests somewhere else.</em></h2>
          <p>A normal college day has a lot of moving parts. NEXUS gives each one a place, a person and a next step.</p>
        </div>
        <div className="product-intro__resolve" role="img" aria-label="Attendance, assignments, records and gatepasses connected through NEXUS">
          <svg viewBox="0 0 620 250" aria-hidden="true">
            <path d="M52 67C145 27 204 115 301 124S450 31 566 75M59 188c104 42 152-61 246-64s153 104 257 51" />
            <path d="M79 69 307 124m0 0 235-49M79 187l228-63m0 0 244 50" />
          </svg>
          <span className="product-intro__fragment product-intro__fragment--attendance"><CalendarDays />Attendance</span>
          <span className="product-intro__fragment product-intro__fragment--assignments"><ClipboardList />Assignments</span>
          <span className="product-intro__fragment product-intro__fragment--records"><UsersRound />Student records</span>
          <span className="product-intro__fragment product-intro__fragment--gatepass"><QrCode />Gatepass</span>
          <span className="product-intro__fragment product-intro__fragment--faculty"><GraduationCap />Faculty</span>
          <span className="product-intro__core"><span>N</span></span>
        </div>
        <div className="product-intro__answer">
          <p className="product-intro__answer-label">ONE CONNECTED CAMPUS</p>
          <h3>Bring the day together.</h3>
          <p>One platform that connects the people, information and everyday processes that keep campus moving.</p>
          <a href="#platform">See what comes together <ArrowRight aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}

function ModuleArtwork({ type }) {
  const Icon = {
    academic: BookOpen,
    people: UsersRound,
    operations: ShieldCheck,
    communication: MessagesSquare
  }[type] || BookOpen;

  if (type === "academic") {
    return (
      <div className="module-art module-art--academic" aria-hidden="true">
        <span className="module-art__symbol"><Icon /></span>
        <span className="module-art__caption">YOUR ACADEMIC DAY</span>
        <div className="module-art__class-row"><i /> Timetable <b>Today</b></div>
        <div className="module-art__class-row"><i /> Attendance <b>Class register</b></div>
        <div className="module-art__class-row"><i /> Assignments <b>Submissions</b></div>
        <div className="module-art__class-row"><i /> Results <b>Progress</b></div>
      </div>
    );
  }
  if (type === "people") {
    return (
      <div className="module-art module-art--people" aria-hidden="true">
        <span className="module-art__symbol"><Icon /></span>
        <div className="module-art__person module-art__person--one"><i>S</i><span>Students</span></div>
        <div className="module-art__person module-art__person--two"><i>T</i><span>Teachers</span></div>
        <div className="module-art__person module-art__person--three"><i>B</i><span>Batches</span></div>
        <svg viewBox="0 0 280 150"><path d="M140 76 48 30m92 46 92-46m-92 46v60" /></svg>
      </div>
    );
  }
  if (type === "operations") {
    return (
      <div className="module-art module-art--operations" aria-hidden="true">
        <span className="module-art__symbol"><Icon /></span>
        <div className="module-art__request"><span>GATEPASS</span><strong>Approval route</strong></div>
        <div className="module-art__route"><i /><i /><i /><i /></div>
        <div className="module-art__route-labels"><span>Student</span><span>Teacher</span><span>Parent</span><span>Security</span></div>
      </div>
    );
  }
  return (
    <div className="module-art module-art--communication" aria-hidden="true">
      <span className="module-art__symbol"><Icon /></span>
      <span className="module-art__message-mark">N</span>
      <div className="module-art__message"><small>REQUEST STATUS</small><strong>Ready for review</strong><i /></div>
      <div className="module-art__message module-art__message--second"><small>CAMPUS UPDATE</small><strong>New information</strong><i /></div>
    </div>
  );
}

function PlatformModules() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="platform-section" id="platform" aria-labelledby="platform-title">
      <div className="platform-section__heading">
        <div>
          <p className="nexus-eyebrow"><span /> EVERYTHING HAS ITS PLACE.</p>
          <h2 id="platform-title">One place for all<br /><em>the things that keep college moving.</em></h2>
        </div>
        <p>From classroom routines to the work happening at the campus gate, find what you need without jumping between disconnected systems.</p>
      </div>
      <div className="platform-grid">
        {platformModules.map((module, index) => (
          <motion.article
            className={`platform-module platform-module--${module.id}`}
            key={module.id}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: index * 0.07, ease: [0.2, 0.75, 0.25, 1] }}
          >
            <div className="platform-module__text">
              <p className="platform-module__label">{module.label}</p>
              <h3>{module.title}</h3>
              <p>{module.copy}</p>
              <ul>
                {module.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </div>
            <ModuleArtwork type={module.id} />
            <span className="platform-module__index">0{index + 1}</span>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function RolePreview({ role }) {
  return (
    <div className={`role-preview role-preview--${role.visual}`} aria-label={`${role.label} product preview`}>
      <div className="role-preview__window">
        <div className="role-preview__topbar">
          <span className="role-preview__brand"><i /> NEXUS</span>
          <span>{role.preview}</span>
          <i className="role-preview__avatar">{role.label.charAt(0)}</i>
        </div>
        <div className="role-preview__body">
          <div className="role-preview__rail" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="role-preview__content">
            <span className="role-preview__eyebrow">{role.preview}</span>
            <strong>{role.title}</strong>
            <div className="role-preview__items">
              {role.items.map((item, index) => (
                <span className={`role-preview__item role-preview__item--${index + 1}`} key={item}>
                  <i aria-hidden="true">{index + 1}</i>{item}<b aria-hidden="true">↗</b>
                </span>
              ))}
            </div>
            {role.visual === "security" && <span className="role-preview__scan">PASS CHECK / READY</span>}
            {role.visual === "administrator" && <div className="role-preview__admin-map"><i /><i /><i /><i /><i /></div>}
            {role.visual === "teacher" && <div className="role-preview__teacher-mark"><i /><i /><i /><i /><i /><i /></div>}
            {role.visual === "student" && <div className="role-preview__student-line"><i /><i /><i /></div>}
          </div>
        </div>
      </div>
      <span className="role-preview__caption">ILLUSTRATIVE PRODUCT VIEW / {role.preview}</span>
    </div>
  );
}

function RoleExperiences() {
  const [activeRole, setActiveRole] = useState("student");
  const role = roleExperiences[activeRole];
  const reduceMotion = useReducedMotion();

  return (
    <section className="role-section" id="experiences" aria-labelledby="roles-title">
      <div className="role-section__layout">
        <div className="role-section__rail">
          <div className="role-section__heading">
            <p className="nexus-eyebrow"><span /> YOUR DAY. YOUR WORKSPACE.</p>
            <h2 id="roles-title">Same campus.<br /><em>A different view for everyone.</em></h2>
          </div>
          <div className="role-section__selector" role="group" aria-label="Choose a campus role">
            {Object.entries(roleExperiences).map(([key, experience], index) => (
              <button
                type="button"
                className={activeRole === key ? "is-active" : ""}
                key={key}
                aria-pressed={activeRole === key}
                onClick={() => setActiveRole(key)}
              >
                <span>0{index + 1}</span>{experience.label}<ArrowRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <div className="role-section__experience" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="role-experience"
              key={activeRole}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
            >
              <RolePreview role={role} />
              <div className="role-experience__copy">
                <p className="role-experience__label">{role.label.toUpperCase()} / NEXUS</p>
                <h3>{role.headline}</h3>
                <p>{role.copy}</p>
                <a href="/login">Explore {role.label.toLowerCase()} view <ArrowRight aria-hidden="true" /></a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function GatepassStepArtwork({ index }) {
  const screens = [
    { heading: "New gatepass", caption: "Reason for leaving", action: "Submit request" },
    { heading: "Review request", caption: "Student · Exit time", action: "Approve" },
    { heading: "Parent portal", caption: "Review the request", action: "Confirm" },
    { heading: "Approved pass", caption: "Show this QR at the gate", action: "Ready to scan" }
  ];
  const screen = screens[index];

  return (
    <div className={`gatepass-step__phone gatepass-step__phone--${index + 1}`}>
      <div className="gatepass-step__phone-top"><span>NEXUS</span><i /></div>
      <div className="gatepass-step__phone-content">
        <span className="gatepass-step__screen-label">{gatepassSteps[index].role.toUpperCase()} PORTAL</span>
        <strong>{screen.heading}</strong>
        {index === 3 ? (
          <div className="gatepass-step__qr" role="img" aria-label="Illustrative QR pass">
            {Array.from({ length: 49 }, (_, cell) => <i key={cell} />)}
          </div>
        ) : (
          <div className="gatepass-step__screen-field">
            {index === 1 || index === 2 ? <span className="gatepass-step__avatar">{index === 1 ? "T" : "P"}</span> : null}
            <span>{screen.caption}</span>
            <i />
          </div>
        )}
        {index === 1 || index === 2 ? (
          <div className="gatepass-step__decisions"><span><Check /> {screen.action}</span><span>Review in NEXUS</span></div>
        ) : (
          <span className={`gatepass-step__action${index === 3 ? " is-ready" : ""}`}>{screen.action}</span>
        )}
      </div>
      <span className="gatepass-step__phone-caption">ILLUSTRATIVE SCREEN</span>
    </div>
  );
}

function CampusGateIllustration() {
  return (
    <svg className="gatepass-gate" viewBox="0 0 640 280" role="img" aria-label="Illustration of a staffed NEXUS campus gate">
      <defs>
        <linearGradient id="gate-sign-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9386ff" />
          <stop offset="1" stopColor="#594bdf" />
        </linearGradient>
        <linearGradient id="gate-ground-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e9e9ff" />
          <stop offset="1" stopColor="#f8f6ff" />
        </linearGradient>
      </defs>
      <path d="M0 221c82-28 137-29 225-4s148 29 236 4 120-29 179-10v69H0Z" fill="url(#gate-ground-gradient)" />
      <path d="M69 222V113h34v109m434 0V113h34v109" fill="#d9d4ff" />
      <path d="M64 115h512a8 8 0 0 1 8 8v11H56v-11a8 8 0 0 1 8-8Z" fill="url(#gate-sign-gradient)" />
      <text x="320" y="133" fill="#fff" fontSize="12" fontWeight="700" letterSpacing="3" textAnchor="middle">NEXUS CAMPUS GATE</text>
      <path d="M160 223V170h165v53m0-53h160v53" fill="none" stroke="#8478e8" strokeLinecap="round" strokeWidth="7" />
      <path d="M245 190h-61m214 0h62" stroke="#5146e5" strokeLinecap="round" strokeWidth="6" />
      <path d="M314 174v47m-14-36h28" stroke="#8c82ec" strokeWidth="3" />
      <rect x="461" y="165" width="38" height="48" rx="9" fill="#fff" stroke="#d7d2fa" />
      <path d="m474 187 7 7 12-15" fill="none" stroke="#52ad98" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <path d="M119 221c-21-26-17-55 0-73 16 19 22 47 0 73Zm402 0c-22-29-17-59 2-77 17 20 21 51-2 77Z" fill="#a5d7c8" />
      <path d="M119 221v-60m402 60v-62" stroke="#5d9f8c" strokeLinecap="round" strokeWidth="3" />
      <circle cx="119" cy="145" r="13" fill="#e1a4d5" />
      <circle cx="521" cy="136" r="14" fill="#f3c786" />
    </svg>
  );
}

function GatepassJourney() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="gatepass-section" id="workflow" aria-labelledby="gatepass-title">
      <div className="gatepass-section__intro">
        <div>
          <p className="nexus-eyebrow"><span /> THE CAMPUS GATE, WITHOUT THE GUESSWORK.</p>
          <h2 id="gatepass-title">One pass.<br /><em>The right people.<br />A clear way out.</em></h2>
        </div>
        <p>A request should not disappear into a register or get lost between messages. Every approval has a place and a record.</p>
      </div>
      <div className="gatepass-section__journey">
        <div className="gatepass-section__steps">
          {gatepassSteps.map((step, index) => (
            <motion.article
              className="gatepass-step"
              key={step.role}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              <span className="gatepass-step__index">{index + 1}</span>
              <span className="gatepass-step__role">{step.role}</span>
              <GatepassStepArtwork index={index} />
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </motion.article>
          ))}
          <CampusGateIllustration />
        </div>
      </div>
      <p className="gatepass-section__closing">One request. The right approvals. A record that stays.</p>
      <p className="gatepass-section__note">Parents confirm inside the NEXUS portal. Notifications are prompts to review, not approvals.</p>
    </section>
  );
}

function TrustSection() {
  const trustItems = [
    "Role-based access",
    "Verified registration",
    "Parent approval",
    "One-time QR passes",
    "Exit and return records",
    "Audit history"
  ];

  return (
    <section className="trust-section" id="about" aria-labelledby="trust-title">
      <div className="trust-section__copy">
        <p className="nexus-eyebrow"><span /> BUILT WITH ACCOUNTABILITY IN MIND.</p>
        <h2 id="trust-title">Important things deserve a proper record.</h2>
        <p>From account access to gatepass approvals, NEXUS keeps important actions tied to the right people and records.</p>
      </div>
      <div className="trust-diagram">
        <div className="trust-diagram__core"><span>N</span><strong>ACCOUNTABLE<br />BY DESIGN</strong></div>
        <svg viewBox="0 0 700 420" aria-hidden="true">
          <path d="M350 210 116 74m234 136 234-136M350 210 104 210m246 0h246M350 210 116 346m234-136 234 136" />
        </svg>
        {trustItems.map((item, index) => (
          <div className={`trust-diagram__node trust-diagram__node--${index + 1}`} key={item}>
            <span>0{index + 1}</span>{item}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LandingSections() {
  return (
    <>
      <ProductIntroduction />
      <PlatformModules />
      <RoleExperiences />
      <GatepassJourney />
      <TrustSection />
      <section className="faq-section" id="faq" aria-labelledby="faq-title">
        <div className="faq-section__heading">
          <p className="nexus-eyebrow"><span /> GOOD TO KNOW.</p>
          <h2 id="faq-title">Before you get started.</h2>
        </div>
        <FaqAccordion items={faqItems} />
      </section>
      <section className="final-cta" aria-labelledby="final-cta-title">
        <div className="final-cta__network" aria-hidden="true">
          <span /><span /><span /><span /><span /><span /><i />
        </div>
        <p className="nexus-eyebrow"><span /> ONE CAMPUS. A LOT GOING ON.</p>
        <h2 id="final-cta-title">Bring it together<br /><em>with NEXUS.</em></h2>
        <p>Your campus has enough going on. Keep the people, plans and processes connected.</p>
        <div className="final-cta__actions">
          <LiquidCTA href="/signup" arrow>Get started</LiquidCTA>
          <a href="/login">Sign in</a>
        </div>
      </section>
    </>
  );
}

export function LandingFooter() {
  return (
    <footer className="nexus-footer">
      <a className="nexus-footer__brand" href="#top">
        <span className="nexus-footer__mark" aria-hidden="true">N</span>
        <span>NEXUS</span>
      </a>
      <p>Made for the everyday work of a connected campus.</p>
      <nav aria-label="Footer navigation">
        <a href="#platform">Platform</a>
        <a href="#experiences">Experiences</a>
        <a href="#workflow">How it works</a>
        <a href="#about">About</a>
        <a href="/login">Sign in</a>
      </nav>
      <span className="nexus-footer__copyright">Copyright {new Date().getFullYear()} NEXUS</span>
    </footer>
  );
}

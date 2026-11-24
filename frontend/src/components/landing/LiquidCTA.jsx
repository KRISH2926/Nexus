import React from "react";

export default function LiquidCTA({ href, children, className = "", arrow = false, onClick }) {
  const trackPointer = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <a
      className={`nexus-cta ${className}`.trim()}
      href={href}
      onClick={onClick}
      onPointerMove={trackPointer}
    >
      <span className="nexus-cta__content">
        {children}
        {arrow && (
          <svg className="nexus-cta__arrow" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 13 13 3M5 3h8v8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
          </svg>
        )}
      </span>
    </a>
  );
}

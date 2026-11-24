import React from "react";
import "./VengeanceComponents.css";

export default function AnimatedButton({
  href,
  children,
  className = "",
  type = "button",
  ...props
}) {
  const Element = href ? "a" : "button";

  return (
    <Element
      href={href}
      type={href ? undefined : type}
      className={`vng-animated-button ${className}`.trim()}
      {...props}
    >
      <span>{children}</span>
      <span className="vng-animated-button__shine" aria-hidden="true" />
    </Element>
  );
}

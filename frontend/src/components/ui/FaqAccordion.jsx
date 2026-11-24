import React, { useState } from "react";
import "./VengeanceComponents.css";

export default function FaqAccordion({ items, title }) {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <div className="vng-faq">
      {title && <h2 className="vng-faq__title">{title}</h2>}
      <div className="vng-faq__list">
        {items.map((item, index) => {
          const isOpen = activeIndex === index;
          const panelId = `nexus-faq-answer-${index}`;

          return (
            <section className="vng-faq__item" key={item.question}>
              <h3 className="vng-faq__question">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setActiveIndex(isOpen ? null : index)}
                >
                  <span>{item.question}</span>
                  <span className="vng-faq__icon" aria-hidden="true">
                    {isOpen ? "-" : "+"}
                  </span>
                </button>
              </h3>
              <div
                className="vng-faq__answer"
                id={panelId}
                hidden={!isOpen}
                role="region"
              >
                <p>{item.answer}</p>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

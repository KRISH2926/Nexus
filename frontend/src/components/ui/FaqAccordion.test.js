import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import FaqAccordion from "./FaqAccordion";

test("expands the selected answer and exposes its state", () => {
  render(
    <FaqAccordion
      title="Questions"
      items={[{ question: "How does approval work?", answer: "A parent confirms the request." }]}
    />
  );

  const trigger = screen.getByRole("button", { name: /how does approval work/i });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText("A parent confirms the request.")).not.toBeVisible();

  fireEvent.click(trigger);

  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("A parent confirms the request.")).toBeVisible();
});

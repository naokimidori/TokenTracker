import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModelRankingModal } from "./ModelRankingModal.jsx";

describe("ModelRankingModal token units", () => {
  it("keeps total and model usage in M below 10B", () => {
    render(React.createElement(ModelRankingModal, {
      isOpen: true,
      onClose: () => {},
      models: [
        { name: "model-a", tokens: 1_200_000_000, percent: 30 },
        { name: "model-b", tokens: 2_900_000_000, percent: 70 },
      ],
    }));

    const modal = screen.getByTestId("model-ranking-modal");
    expect(modal.querySelector("strong")).toHaveTextContent("4100.0M");
    expect(screen.getByText("1200.0M")).toBeInTheDocument();
    expect(screen.getByText("2900.0M")).toBeInTheDocument();
  });

  it("switches to B only when usage is strictly above 10B", () => {
    const { rerender } = render(React.createElement(ModelRankingModal, {
      isOpen: true,
      onClose: () => {},
      models: [{ name: "model-a", tokens: 10_000_000_000, percent: 100 }],
    }));

    expect(screen.getByTestId("model-ranking-modal").querySelector("strong")).toHaveTextContent("10000.0M");

    rerender(React.createElement(ModelRankingModal, {
      isOpen: true,
      onClose: () => {},
      models: [{ name: "model-a", tokens: 10_100_000_000, percent: 100 }],
    }));

    expect(screen.getByTestId("model-ranking-modal").querySelector("strong")).toHaveTextContent("10.1B");
  });
});

import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CostAnalysisModal } from "../CostAnalysisModal.jsx";

it("invokes onClose when clicking the backdrop", async () => {
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { container } = render(
    <CostAnalysisModal isOpen={true} onClose={onClose} fleetData={[]} />,
  );

  const backdropSelector = '[data-cost-analysis-backdrop="true"]';
  const backdrop = document.querySelector(backdropSelector) ?? container.firstElementChild;

  if (!backdrop) {
    throw new Error(`Expected backdrop element (${backdropSelector}) to exist.`);
  }

  await act(async () => {
    await user.click(backdrop);
  });

  expect(onClose).toHaveBeenCalledTimes(1);
});

it("uses Geist Sans throughout the cost summary header", () => {
  render(
    <CostAnalysisModal
      isOpen={true}
      onClose={() => {}}
      fleetData={[{ label: "CODEX", usd: 2323.71, models: [] }]}
    />,
  );

  const header = document.querySelector(".cost-modal-popup")?.firstElementChild;
  expect(header).toHaveClass("v3-sans-font");
  expect(header.querySelector(".v3-display-num")).toHaveTextContent("2,323.71");
  expect(header.querySelector(".v3-display-num")).not.toHaveClass("v3-mono-num");
});

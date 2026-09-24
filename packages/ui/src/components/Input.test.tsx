import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("associates label and reports errors accessibly", async () => {
    render(<Input label="Deal name" error="Required" placeholder="Acme" />);
    const field = screen.getByLabelText("Deal name");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    await userEvent.type(field, "Acme Corp");
    expect(field).toHaveValue("Acme Corp");
  });
});

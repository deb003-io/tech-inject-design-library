import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children and handles click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is keyboard operable and respects disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Blocked</Button>);
    const btn = screen.getByRole("button", { name: "Blocked" });
    expect(btn).toBeDisabled();
    btn.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies variant and size classes", () => {
    render(<Button variant="danger" size="lg">Delete</Button>);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("ti-btn-danger");
    expect(btn.className).toContain("ti-btn-lg");
  });
});

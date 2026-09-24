import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable } from "./DataTable";

interface Deal { id: string; name: string; value: string }

const rows: Deal[] = [
  { id: "1", name: "Acme", value: "$12k" },
  { id: "2", name: "Globex", value: "$8k" }
];

describe("DataTable", () => {
  it("selects rows with mouse and keyboard", async () => {
    const onSelect = vi.fn();
    render(
      <DataTable<Deal>
        columns={[{ key: "name", header: "Deal" }, { key: "value", header: "Value" }]}
        rows={rows}
        getRowId={(r) => r.id}
        onSelect={onSelect}
      />
    );
    await userEvent.click(screen.getByText("Acme"));
    expect(onSelect).toHaveBeenCalledWith(rows[0]);
    const globexRow = screen.getByText("Globex").closest("tr");
    globexRow?.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(rows[1]);
  });

  it("shows an empty state", () => {
    render(
      <DataTable<Deal>
        columns={[{ key: "name", header: "Deal" }]}
        rows={[]}
        getRowId={(r) => r.id}
        emptyMessage="No deals yet"
      />
    );
    expect(screen.getByText("No deals yet")).toBeInTheDocument();
  });
});

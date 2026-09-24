import * as React from "react";
import "../theme/theme.css";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  selectedId?: string;
  onSelect?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, getRowId, selectedId, onSelect, emptyMessage = "No rows" }: DataTableProps<T>): React.JSX.Element {
  if (rows.length === 0) {
    return <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{emptyMessage}</p>;
  }
  return (
    <table className="ti-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col">{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const id = getRowId(row);
          const selected = selectedId === id;
          return (
            <tr
              key={id}
              aria-selected={selected}
              tabIndex={onSelect ? 0 : undefined}
              onClick={onSelect ? () => onSelect(row) : undefined}
              onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(row); } } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

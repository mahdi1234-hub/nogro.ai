"use client";

import { useMemo, useRef, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { useAtlasStore } from "@/lib/store";
import { ArrowUp, ArrowDown, X } from "lucide-react";

const CLUSTER_COLORS: string[] = [
  "rgb(220, 80, 70)",
  "rgb(60, 179, 162)",
  "rgb(230, 155, 50)",
  "rgb(40, 60, 120)",
  "rgb(140, 100, 180)",
  "rgb(80, 160, 80)",
  "rgb(200, 100, 140)",
  "rgb(100, 140, 200)",
  "rgb(180, 140, 60)",
  "rgb(120, 120, 120)",
];

export function DataTable() {
  const {
    points,
    columns,
    selectedIds,
    setSelectedIds,
    setPreviewIndex,
    setDataPreviewOpen,
    textSearchResults,
    vectorSearchResults,
    setTablePanelOpen,
  } = useAtlasStore();

  const [sorting, setSorting] = useState<SortingState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Determine visible points
  const data = useMemo(() => {
    if (selectedIds.size > 0) {
      return points.filter((p) => selectedIds.has(p.id));
    }
    if (textSearchResults.size > 0) {
      return points.filter((p) => textSearchResults.has(p.id));
    }
    if (vectorSearchResults.size > 0) {
      return points.filter((p) => vectorSearchResults.has(p.id));
    }
    return points;
  }, [points, selectedIds, textSearchResults, vectorSearchResults]);

  const tableColumns = useMemo<ColumnDef<typeof data[0]>[]>(() => {
    return [
      // Color indicator column
      {
        id: "_color",
        header: "",
        size: 30,
        cell: ({ row }) => {
          const clusterId = row.original.clusterId;
          const color = CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
          return (
            <div
              className="w-2.5 h-2.5 rounded-full mx-auto"
              style={{ backgroundColor: color }}
            />
          );
        },
      },
      ...columns.map((col) => ({
        accessorFn: (row: typeof data[0]) => row.fields[col.name],
        id: col.name,
        header: () => (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">{col.name}</span>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1 rounded">
              {col.type}
            </span>
          </div>
        ),
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const val = getValue();
          return (
            <span className="truncate block max-w-xs">
              {val !== null && val !== undefined ? String(val) : ""}
            </span>
          );
        },
        size: col.type === "number" ? 120 : 200,
      })),
      // Topic column
      {
        accessorFn: (row: typeof data[0]) => row.topicLabel,
        id: "_topic",
        header: () => (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">Nomic Topic: broad</span>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1 rounded">
              string
            </span>
          </div>
        ),
        cell: ({ getValue }: { getValue: () => unknown }) => String(getValue() ?? ""),
        size: 180,
      },
    ];
  }, [columns, data]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleRowClick = useCallback(
    (pointId: string) => {
      const idx = points.findIndex((p) => p.id === pointId);
      if (idx >= 0) {
        setSelectedIds(new Set([pointId]));
        setPreviewIndex(idx);
        setDataPreviewOpen(true);
      }
    },
    [points, setSelectedIds, setPreviewIndex, setDataPreviewOpen]
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Table header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTablePanelOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-500">
            {data.length} rows × {columns.length} columns
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto"
      >
        <table className="data-table w-full border-collapse min-w-max">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ArrowUp className="w-3 h-3 text-forest-600" />,
                        desc: <ArrowDown className="w-3 h-3 text-forest-600" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isSelected = selectedIds.has(row.original.id);
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "selected bg-forest-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleRowClick(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

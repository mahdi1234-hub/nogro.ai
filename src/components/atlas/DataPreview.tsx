"use client";

import { useAtlasStore } from "@/lib/store";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  TableIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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

export function DataPreview() {
  const {
    points,
    columns,
    clusters,
    previewIndex,
    setPreviewIndex,
    dataPreviewOpen,
    setDataPreviewOpen,
    selectedIds,
    setTablePanelOpen,
    tablePanelOpen,
  } = useAtlasStore();

  if (points.length === 0) return null;

  const selectedPoints = selectedIds.size > 0
    ? points.filter((p) => selectedIds.has(p.id))
    : points;

  const safeIndex = Math.min(previewIndex, selectedPoints.length - 1);
  const currentPoint = selectedPoints[safeIndex];
  if (!currentPoint) return null;

  const clusterColor = CLUSTER_COLORS[currentPoint.clusterId % CLUSTER_COLORS.length];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Data Preview header */}
      <div className="px-3 py-2 border-b border-gray-200">
        <button
          onClick={() => setDataPreviewOpen(!dataPreviewOpen)}
          className="flex items-center justify-between w-full"
        >
          <span className="text-sm font-semibold text-gray-700">Data Preview</span>
          {dataPreviewOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
      </div>

      {dataPreviewOpen && (
        <div className="px-3 py-2">
          {/* Navigation */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setPreviewIndex(Math.max(0, safeIndex - 1))}
              disabled={safeIndex === 0}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewIndex(Math.min(selectedPoints.length - 1, safeIndex + 1))}
              disabled={safeIndex >= selectedPoints.length - 1}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Color dot */}
            <div
              className="w-4 h-4 rounded-full ml-2"
              style={{ backgroundColor: clusterColor }}
            />
            <div className="w-6 h-3 rounded-sm bg-gray-200 ml-1" />

            <div className="ml-auto flex items-center gap-1.5">
              <button className="text-gray-400 hover:text-gray-700">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button className="text-gray-400 hover:text-gray-700">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Topic */}
          <div className="mb-4">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs text-gray-400">◆</span>
              <span className="text-xs font-medium text-gray-500">Topics</span>
            </div>
            <div className="text-sm text-gray-700 pl-4">
              · {currentPoint.topicLabel}
            </div>
          </div>

          {/* Fields */}
          {columns.map((col) => {
            const value = currentPoint.fields[col.name];
            return (
              <div key={col.name} className="mb-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs text-forest-600 font-medium">
                    {col.name === columns[0]?.name && "✱ "}
                    {col.name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {col.type === "string" ? "text" : col.type}
                  </span>
                </div>
                <div className="text-sm text-gray-800 pl-0.5">
                  {String(value ?? "")}
                </div>
              </div>
            );
          })}

          {/* Table button */}
          <button
            onClick={() => setTablePanelOpen(!tablePanelOpen)}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 mt-4 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <TableIcon className="w-4 h-4" />
            Table
          </button>

          {/* Point counter */}
          <div className="text-xs text-gray-400 text-center mt-2">
            {safeIndex + 1} of {selectedPoints.length}
          </div>
        </div>
      )}
    </div>
  );
}

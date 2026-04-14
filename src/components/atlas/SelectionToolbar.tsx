"use client";

import { useState, useCallback } from "react";
import { useAtlasStore } from "@/lib/store";
import { downloadCSV } from "@/lib/utils";
import type { SelectionTool, BooleanMode } from "@/types";
import {
  ZoomIn,
  Search,
  Filter,
  Lasso,
  MousePointer,
  Type,
  X,
  Download,
  Layers,
} from "lucide-react";

const TOOLS: { id: SelectionTool; icon: React.ReactNode; label: string; shortcut: string; description: string }[] = [
  { id: "zoom", icon: <ZoomIn className="w-4 h-4" />, label: "Zoom Select", shortcut: "", description: "Draw rectangle to zoom into area" },
  { id: "vectorSearch", icon: <Search className="w-4 h-4" />, label: "Vector Search", shortcut: "V", description: "Search for semantically similar data points based on embeddings" },
  { id: "filter", icon: <Filter className="w-4 h-4" />, label: "Filter", shortcut: "F", description: "Filter data based on categorical fields, or use a slider for numeric/temporal range" },
  { id: "lasso", icon: <Lasso className="w-4 h-4" />, label: "Lasso", shortcut: "L", description: "Draw a polygon on the map to select datapoints" },
  { id: "cherryPick", icon: <MousePointer className="w-4 h-4" />, label: "Cherry Pick", shortcut: "C", description: "Add or remove datapoints by clicking them one by one on the map" },
  { id: "textSearch", icon: <Type className="w-4 h-4" />, label: "Text Search", shortcut: "S", description: "Search the full text of your data using string matching or regex" },
];

export function SelectionToolbar() {
  const {
    activeTool,
    setActiveTool,
    booleanMode,
    setBooleanMode,
    selectedIds,
    clearSelection,
    points,
    columns,
    textSearchQuery,
    textSearchColumn,
    textSearchResults,
    setTextSearch,
    vectorSearchQuery,
    vectorSearchResults,
    setVectorSearch,
    filters,
    addFilter,
    removeFilter,
  } = useAtlasStore();

  const [hoveredTool, setHoveredTool] = useState<SelectionTool | null>(null);
  const [textQuery, setTextQuery] = useState("");
  const [searchCol, setSearchCol] = useState(columns[0]?.name || "");
  const [vectorQuery, setVectorQuery] = useState("");
  const [filterCol, setFilterCol] = useState("");
  const [filterValues, setFilterValues] = useState<string[]>([]);

  // Text search handler
  const handleTextSearch = useCallback(() => {
    if (!textQuery.trim()) {
      setTextSearch("", "", new Set());
      return;
    }
    const col = searchCol || columns[0]?.name;
    const query = textQuery.toLowerCase();
    const matched = new Set<string>();
    points.forEach((p) => {
      if (col) {
        const val = String(p.fields[col] || "").toLowerCase();
        if (val.includes(query)) matched.add(p.id);
      } else {
        const allText = Object.values(p.fields).join(" ").toLowerCase();
        if (allText.includes(query)) matched.add(p.id);
      }
    });
    setTextSearch(textQuery, col, matched);
  }, [textQuery, searchCol, points, columns, setTextSearch]);

  // Vector search handler
  const handleVectorSearch = useCallback(async () => {
    if (!vectorQuery.trim()) {
      setVectorSearch("", new Set());
      return;
    }
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: vectorQuery,
          points: points.map((p) => ({ id: p.id, fields: p.fields })),
          topK: 20,
        }),
      });
      const data = await res.json();
      setVectorSearch(vectorQuery, new Set(data.results || []));
    } catch {
      setVectorSearch(vectorQuery, new Set());
    }
  }, [vectorQuery, points, setVectorSearch]);

  // Filter handler
  const handleAddFilter = useCallback(() => {
    if (!filterCol) return;
    const col = columns.find((c) => c.name === filterCol);
    if (!col) return;

    if (col.type === "string") {
      // Get unique values
      const unique = [...new Set(points.map((p) => String(p.fields[col.name] || "")))];
      setFilterValues(unique);
    }
    addFilter({
      column: filterCol,
      type: col.type === "number" ? "numeric" : "categorical",
      values: [],
    });
  }, [filterCol, columns, points, addFilter]);

  const handleExport = useCallback(() => {
    const selected = points.filter((p) => selectedIds.has(p.id));
    const data = selected.length > 0 ? selected : points;
    downloadCSV(data.map((p) => p.fields), "atlas-export.csv");
  }, [points, selectedIds]);

  const resultCount =
    textSearchResults.size > 0
      ? textSearchResults.size
      : vectorSearchResults.size > 0
      ? vectorSearchResults.size
      : selectedIds.size;

  return (
    <div className="p-3 border-b border-gray-200">
      {/* Selection header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Selection</span>
        <span className="text-xs text-gray-400">^</span>
      </div>

      {/* Tool icons */}
      <div className="flex items-center gap-1 mb-3">
        {TOOLS.map((tool) => (
          <div
            key={tool.id}
            className="relative"
            onMouseEnter={() => setHoveredTool(tool.id)}
            onMouseLeave={() => setHoveredTool(null)}
          >
            <button
              onClick={() => setActiveTool(tool.id)}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                activeTool === tool.id
                  ? "bg-forest-100 text-forest-700"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {tool.icon}
            </button>
            {/* Tooltip */}
            {hoveredTool === tool.id && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg p-3 z-50 w-56">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{tool.label}</span>
                  {tool.shortcut && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded font-mono">
                      {tool.shortcut}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{tool.description}</p>
              </div>
            )}
          </div>
        ))}

        {/* All/Any toggle */}
        <div className="ml-auto flex flex-col text-xs">
          <button
            onClick={() => setBooleanMode("all")}
            className={`px-2 py-0.5 rounded-t text-xs font-medium transition ${
              booleanMode === "all" ? "bg-forest-600 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            all
          </button>
          <button
            onClick={() => setBooleanMode("any")}
            className={`px-2 py-0.5 rounded-b text-xs font-medium transition ${
              booleanMode === "any" ? "bg-forest-600 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            any
          </button>
        </div>
      </div>

      {/* Active selection indicator */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded px-2 py-1.5">
          <Lasso className="w-3.5 h-3.5 text-gray-400" />
          <div className="flex gap-1">
            {Array.from(selectedIds)
              .slice(0, 3)
              .map((id) => {
                const pt = points.find((p) => p.id === id);
                const color = pt
                  ? `rgb(${[220, 80, 70, 60, 179, 162, 230, 155, 50, 40, 60, 120][((pt.clusterId % 4) * 3)]}, ${[220, 80, 70, 60, 179, 162, 230, 155, 50, 40, 60, 120][((pt.clusterId % 4) * 3) + 1]}, ${[220, 80, 70, 60, 179, 162, 230, 155, 50, 40, 60, 120][((pt.clusterId % 4) * 3) + 2]})`
                  : "#888";
                return (
                  <div
                    key={id}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                );
              })}
          </div>
          <button onClick={clearSelection} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tool-specific panels */}
      {activeTool === "textSearch" && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-sm">Text Search</span>
            </div>
            <button onClick={() => { setTextSearch("", "", new Set()); setTextQuery(""); }}>
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Enter Keywords"
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSearch()}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-forest-500"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">ab</span>
            <span className="text-xs text-gray-400 font-mono">Aa</span>
            <span className="text-xs text-gray-400">.*</span>
            <select
              value={searchCol}
              onChange={(e) => setSearchCol(e.target.value)}
              className="ml-auto border border-gray-300 rounded px-2 py-1 text-xs flex-1"
            >
              {columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleTextSearch}
              className="bg-forest-500 hover:bg-forest-600 text-white px-3 py-1 rounded text-xs font-medium transition"
            >
              Search
            </button>
          </div>
        </div>
      )}

      {activeTool === "vectorSearch" && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-sm">Vector Search</span>
            </div>
            <button onClick={() => { setVectorSearch("", new Set()); setVectorQuery(""); }}>
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search by semantic similarity..."
            value={vectorQuery}
            onChange={(e) => setVectorQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVectorSearch()}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-forest-500"
          />
          <button
            onClick={handleVectorSearch}
            className="w-full bg-forest-500 hover:bg-forest-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"
          >
            Search
          </button>
        </div>
      )}

      {activeTool === "filter" && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-sm">Filter</span>
            </div>
          </div>
          <select
            value={filterCol}
            onChange={(e) => setFilterCol(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2"
          >
            <option value="">Select column...</option>
            {columns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </select>
          {filters.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-1 bg-gray-50 rounded px-2 py-1">
              <span className="text-xs font-medium">{f.column}</span>
              <button onClick={() => removeFilter(idx)} className="ml-auto">
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          ))}
          <button
            onClick={handleAddFilter}
            className="w-full bg-forest-500 hover:bg-forest-600 text-white px-3 py-1.5 rounded text-xs font-medium transition mt-1"
          >
            Add Filter
          </button>
        </div>
      )}

      {/* Results count & export */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          {resultCount > 0 ? `${resultCount} results` : `${points.length} total`}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="text-gray-400 hover:text-gray-600 transition">
            <Download className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-gray-600 transition">
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

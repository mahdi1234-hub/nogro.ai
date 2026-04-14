"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useAtlasStore } from "@/lib/store";
import { ScatterPlot } from "./ScatterPlot";
import { SelectionToolbar } from "./SelectionToolbar";
import { DataPreview } from "./DataPreview";
import { DataTable } from "./DataTable";
import { AtlasAnalyst } from "./AtlasAnalyst";
import {
  ArrowLeft,
  Info,
  Share2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function AtlasView() {
  const router = useRouter();
  const {
    datasetName,
    points,
    tablePanelOpen,
    setTablePanelOpen,
    analystOpen,
    setAnalystOpen,
  } = useAtlasStore();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Header Bar - dark forest green matching screenshot */}
      <header className="bg-forest-800 text-white flex items-center justify-between px-4 py-2 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-white/80 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">Nogro</span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-white/60 text-sm">←</span>
            <span className="font-semibold text-sm">{datasetName}</span>
            <Info className="w-3.5 h-3.5 text-white/40" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`px-4 py-1.5 rounded text-sm font-medium transition ${
              analystOpen
                ? "bg-forest-500 text-white"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            onClick={() => setAnalystOpen(!analystOpen)}
          >
            Atlas Analyst
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded text-sm font-medium transition">
            View Settings
          </button>
          <button className="text-white/60 hover:text-white transition">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button className="bg-forest-500 hover:bg-forest-400 text-white px-4 py-1.5 rounded text-sm font-medium transition">
            Share
          </button>
          <div className="w-8 h-8 rounded-full bg-forest-600 flex items-center justify-center text-xs font-bold">
            U
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col overflow-hidden shrink-0 z-40">
          <SelectionToolbar />
          <DataPreview />
        </div>

        {/* Center + Bottom */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PanelGroup direction="vertical">
            {/* Map Panel */}
            <Panel defaultSize={tablePanelOpen ? 60 : 100} minSize={30}>
              <div className="relative w-full h-full bg-[#f5f5f0]">
                <ScatterPlot />
                {analystOpen && <AtlasAnalyst />}
              </div>
            </Panel>

            {/* Resize Handle */}
            {tablePanelOpen && (
              <>
                <PanelResizeHandle className="h-1.5 bg-gray-200 hover:bg-forest-400 transition-colors cursor-row-resize flex items-center justify-center">
                  <div className="w-8 h-0.5 bg-gray-400 rounded" />
                </PanelResizeHandle>
                <Panel defaultSize={40} minSize={15}>
                  <DataTable />
                </Panel>
              </>
            )}
          </PanelGroup>

          {/* Toggle table button */}
          <button
            onClick={() => setTablePanelOpen(!tablePanelOpen)}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-lg px-3 py-1 rounded-full text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 transition"
          >
            {tablePanelOpen ? (
              <>
                <ChevronDown className="w-3 h-3" /> Close table
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" /> Open table
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

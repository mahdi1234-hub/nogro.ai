import { create } from "zustand";
import type { DataPoint, ColumnInfo, ClusterInfo, SelectionTool, FilterState, BooleanMode } from "@/types";

interface AtlasStore {
  // Dataset
  datasetName: string;
  points: DataPoint[];
  columns: ColumnInfo[];
  clusters: ClusterInfo[];
  rawData: Record<string, string | number>[];
  isProcessing: boolean;

  // Selection
  selectedIds: Set<string>;
  hoveredId: string | null;
  activeTool: SelectionTool;
  booleanMode: BooleanMode;

  // UI State
  leftPanelOpen: boolean;
  tablePanelOpen: boolean;
  dataPreviewOpen: boolean;
  analystOpen: boolean;
  previewIndex: number;

  // Filters
  filters: FilterState[];
  textSearchQuery: string;
  textSearchColumn: string;
  textSearchResults: Set<string>;
  vectorSearchQuery: string;
  vectorSearchResults: Set<string>;

  // Lasso
  lassoPoints: [number, number][];
  isLassoing: boolean;

  // Actions
  setDataset: (name: string, points: DataPoint[], columns: ColumnInfo[], clusters: ClusterInfo[], rawData: Record<string, string | number>[]) => void;
  setProcessing: (v: boolean) => void;
  setSelectedIds: (ids: Set<string>) => void;
  toggleSelectedId: (id: string) => void;
  clearSelection: () => void;
  setHoveredId: (id: string | null) => void;
  setActiveTool: (tool: SelectionTool) => void;
  setBooleanMode: (mode: BooleanMode) => void;
  setLeftPanelOpen: (v: boolean) => void;
  setTablePanelOpen: (v: boolean) => void;
  setDataPreviewOpen: (v: boolean) => void;
  setAnalystOpen: (v: boolean) => void;
  setPreviewIndex: (i: number) => void;
  addFilter: (f: FilterState) => void;
  removeFilter: (index: number) => void;
  setTextSearch: (query: string, column: string, results: Set<string>) => void;
  setVectorSearch: (query: string, results: Set<string>) => void;
  setLassoPoints: (pts: [number, number][]) => void;
  setIsLassoing: (v: boolean) => void;
  selectByLasso: (ids: string[]) => void;
}

export const useAtlasStore = create<AtlasStore>((set) => ({
  datasetName: "",
  points: [],
  columns: [],
  clusters: [],
  rawData: [],
  isProcessing: false,

  selectedIds: new Set<string>(),
  hoveredId: null,
  activeTool: "textSearch",
  booleanMode: "all",

  leftPanelOpen: true,
  tablePanelOpen: true,
  dataPreviewOpen: true,
  analystOpen: false,
  previewIndex: 0,

  filters: [],
  textSearchQuery: "",
  textSearchColumn: "",
  textSearchResults: new Set<string>(),
  vectorSearchQuery: "",
  vectorSearchResults: new Set<string>(),

  lassoPoints: [],
  isLassoing: false,

  setDataset: (name, points, columns, clusters, rawData) =>
    set({ datasetName: name, points, columns, clusters, rawData }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  toggleSelectedId: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  clearSelection: () => set({ selectedIds: new Set() }),
  setHoveredId: (hoveredId) => set({ hoveredId }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setBooleanMode: (booleanMode) => set({ booleanMode }),
  setLeftPanelOpen: (leftPanelOpen) => set({ leftPanelOpen }),
  setTablePanelOpen: (tablePanelOpen) => set({ tablePanelOpen }),
  setDataPreviewOpen: (dataPreviewOpen) => set({ dataPreviewOpen }),
  setAnalystOpen: (analystOpen) => set({ analystOpen }),
  setPreviewIndex: (previewIndex) => set({ previewIndex }),
  addFilter: (f) => set((s) => ({ filters: [...s.filters, f] })),
  removeFilter: (index) => set((s) => ({ filters: s.filters.filter((_, i) => i !== index) })),
  setTextSearch: (textSearchQuery, textSearchColumn, textSearchResults) =>
    set({ textSearchQuery, textSearchColumn, textSearchResults }),
  setVectorSearch: (vectorSearchQuery, vectorSearchResults) =>
    set({ vectorSearchQuery, vectorSearchResults }),
  setLassoPoints: (lassoPoints) => set({ lassoPoints }),
  setIsLassoing: (isLassoing) => set({ isLassoing }),
  selectByLasso: (ids) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      ids.forEach((id) => next.add(id));
      return { selectedIds: next };
    }),
}));

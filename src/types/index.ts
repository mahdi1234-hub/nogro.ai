export interface DataPoint {
  id: string;
  fields: Record<string, string | number>;
  x: number;
  y: number;
  clusterId: number;
  topicLabel: string;
  embedding?: number[];
}

export interface ColumnInfo {
  name: string;
  type: "string" | "number" | "date" | "unknown";
}

export interface ClusterInfo {
  id: number;
  label: string;
  centroidX: number;
  centroidY: number;
  count: number;
  color: [number, number, number];
}

export interface DatasetState {
  name: string;
  points: DataPoint[];
  columns: ColumnInfo[];
  clusters: ClusterInfo[];
  rawData: Record<string, string | number>[];
}

export type SelectionTool = "zoom" | "vectorSearch" | "filter" | "lasso" | "cherryPick" | "textSearch";

export interface FilterState {
  column: string;
  type: "categorical" | "numeric";
  values?: string[];
  min?: number;
  max?: number;
}

export interface SearchResult {
  query: string;
  matchedIds: Set<string>;
  count: number;
}

export type BooleanMode = "all" | "any";

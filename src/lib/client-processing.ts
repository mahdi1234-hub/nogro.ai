import { UMAP } from "umap-js";
import type { DataPoint, ColumnInfo, ClusterInfo } from "@/types";

const CLUSTER_COLORS: [number, number, number][] = [
  [220, 80, 70],
  [60, 179, 162],
  [230, 155, 50],
  [40, 60, 120],
  [140, 100, 180],
  [80, 160, 80],
  [200, 100, 140],
  [100, 140, 200],
  [180, 140, 60],
  [120, 120, 120],
];

function detectColumnTypes(records: Record<string, string | number>[]): ColumnInfo[] {
  if (records.length === 0) return [];
  const keys = Object.keys(records[0]);
  return keys.map((name) => {
    const values = records.map((r) => r[name]).filter((v) => v !== null && v !== undefined && v !== "");
    const numericCount = values.filter((v) => !isNaN(Number(v))).length;
    const type: ColumnInfo["type"] = numericCount > values.length * 0.8 ? "number" : "string";
    return { name, type };
  });
}

function computeEmbeddings(records: Record<string, string | number>[], columns: ColumnInfo[]): number[][] {
  const textColumns = columns.filter((c) => c.type === "string").map((c) => c.name);
  const vocab = new Map<string, number>();
  const docFreq = new Map<string, number>();
  const docs: string[][] = [];

  for (const record of records) {
    const tokens: string[] = [];
    for (const col of textColumns) {
      const val = String(record[col] || "").toLowerCase();
      const words = val.split(/\s+/).filter((w) => w.length > 1);
      tokens.push(...words);
    }
    for (const col of columns.filter((c) => c.type === "number")) {
      tokens.push(`${col.name}_${record[col.name]}`);
    }
    docs.push(tokens);
    const unique = new Set(tokens);
    unique.forEach((t) => {
      if (!vocab.has(t)) vocab.set(t, vocab.size);
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    });
  }

  const vocabSize = vocab.size;
  const numDocs = records.length;

  return docs.map((tokens) => {
    const vec = new Float64Array(vocabSize);
    const tf = new Map<string, number>();
    tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    tf.forEach((count, token) => {
      const idx = vocab.get(token);
      if (idx !== undefined) {
        const idf = Math.log(numDocs / (docFreq.get(token) || 1));
        vec[idx] = (count / tokens.length) * idf;
      }
    });
    return Array.from(vec);
  });
}

function dbscan(points: [number, number][], eps: number, minPts: number): number[] {
  const n = points.length;
  const labels = new Array(n).fill(-1);
  let clusterId = 0;

  function distance(a: [number, number], b: [number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
  }

  function regionQuery(idx: number): number[] {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (distance(points[idx], points[i]) <= eps) neighbors.push(i);
    }
    return neighbors;
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;
    const neighbors = regionQuery(i);
    if (neighbors.length < minPts) continue;

    labels[i] = clusterId;
    const seed = [...neighbors];
    let j = 0;
    while (j < seed.length) {
      const q = seed[j];
      if (labels[q] === -1) labels[q] = clusterId;
      if (labels[q] !== -1 && labels[q] !== clusterId) { j++; continue; }
      labels[q] = clusterId;
      const qNeighbors = regionQuery(q);
      if (qNeighbors.length >= minPts) {
        for (const nb of qNeighbors) {
          if (!seed.includes(nb)) seed.push(nb);
        }
      }
      j++;
    }
    clusterId++;
  }

  // Assign noise to nearest cluster
  for (let i = 0; i < n; i++) {
    if (labels[i] === -1) {
      let minDist = Infinity;
      let nearest = 0;
      for (let j2 = 0; j2 < n; j2++) {
        if (labels[j2] >= 0) {
          const d = distance(points[i], points[j2]);
          if (d < minDist) { minDist = d; nearest = labels[j2]; }
        }
      }
      labels[i] = nearest >= 0 ? nearest : 0;
    }
  }

  return labels;
}

function computeAvgNNDist(points: [number, number][]): number {
  let total = 0;
  const n = Math.min(points.length, 100);
  for (let i = 0; i < n; i++) {
    let minDist = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const d = Math.sqrt((points[i][0] - points[j][0]) ** 2 + (points[i][1] - points[j][1]) ** 2);
      if (d < minDist) minDist = d;
    }
    total += minDist;
  }
  return total / n;
}

async function generateTopicLabels(
  clusterSamples: Map<number, string>
): Promise<Map<number, string>> {
  const labels = new Map<number, string>();

  try {
    const response = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clusters: Array.from(clusterSamples.entries()).map(([id, sample]) => ({ id, sample })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      for (const item of data.labels || []) {
        labels.set(item.id, item.label);
      }
    }
  } catch {
    // Fall back to generic labels
  }

  // Fill in any missing labels
  for (const [id] of clusterSamples) {
    if (!labels.has(id)) labels.set(id, `Cluster ${id + 1}`);
  }

  return labels;
}

export async function processDataClientSide(
  records: Record<string, string | number>[],
  datasetName: string,
  onProgress?: (msg: string) => void
): Promise<{
  points: DataPoint[];
  columns: ColumnInfo[];
  clusters: ClusterInfo[];
}> {
  if (records.length === 0) throw new Error("No records to process");

  onProgress?.("Detecting column types...");
  const columns = detectColumnTypes(records);

  // Convert numeric columns
  for (const col of columns) {
    if (col.type === "number") {
      for (const record of records) {
        record[col.name] = Number(record[col.name]) || 0;
      }
    }
  }

  onProgress?.("Computing embeddings...");
  await new Promise((r) => setTimeout(r, 50)); // Let UI update
  const embeddings = computeEmbeddings(records, columns);

  onProgress?.("Running UMAP dimensionality reduction...");
  await new Promise((r) => setTimeout(r, 50));
  const nNeighbors = Math.min(15, Math.max(2, Math.floor(records.length / 5)));
  const umap = new UMAP({ nNeighbors, minDist: 0.1, nComponents: 2, spread: 1.0 });
  const coords = umap.fit(embeddings);

  // Normalize to [-5, 5]
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const normalized: [number, number][] = coords.map(([x, y]) => [
    ((x - minX) / rangeX) * 10 - 5,
    ((y - minY) / rangeY) * 10 - 5,
  ]);

  onProgress?.("Detecting clusters...");
  await new Promise((r) => setTimeout(r, 50));
  const avgDist = computeAvgNNDist(normalized);
  const eps = avgDist * 2;
  const minPts = Math.max(2, Math.floor(records.length * 0.03));
  const clusterLabelsArr = dbscan(normalized, eps, minPts);

  // Build cluster samples for topic labeling
  const clusterRecords = new Map<number, Record<string, string | number>[]>();
  clusterLabelsArr.forEach((label, i) => {
    if (!clusterRecords.has(label)) clusterRecords.set(label, []);
    clusterRecords.get(label)!.push(records[i]);
  });

  const clusterSamples = new Map<number, string>();
  for (const [id, recs] of clusterRecords) {
    const sample = recs.slice(0, 8).map((r) =>
      columns.map((c) => `${c.name}: ${r[c.name]}`).join(", ")
    ).join("\n");
    clusterSamples.set(id, sample);
  }

  onProgress?.("Generating topic labels with AI...");
  const topicLabels = await generateTopicLabels(clusterSamples);

  // Build cluster info
  const clusterInfoMap = new Map<number, { sumX: number; sumY: number; count: number }>();
  clusterLabelsArr.forEach((label, i) => {
    if (!clusterInfoMap.has(label)) clusterInfoMap.set(label, { sumX: 0, sumY: 0, count: 0 });
    const info = clusterInfoMap.get(label)!;
    info.sumX += normalized[i][0];
    info.sumY += normalized[i][1];
    info.count++;
  });

  const clusters: ClusterInfo[] = Array.from(clusterInfoMap.entries()).map(([id, info]) => ({
    id,
    label: topicLabels.get(id) || `Cluster ${id + 1}`,
    centroidX: info.sumX / info.count,
    centroidY: info.sumY / info.count,
    count: info.count,
    color: CLUSTER_COLORS[id % CLUSTER_COLORS.length],
  }));

  const points: DataPoint[] = records.map((record, i) => ({
    id: `point-${i}`,
    fields: record,
    x: normalized[i][0],
    y: normalized[i][1],
    clusterId: clusterLabelsArr[i],
    topicLabel: topicLabels.get(clusterLabelsArr[i]) || `Cluster ${clusterLabelsArr[i] + 1}`,
  }));

  return { points, columns, clusters };
}

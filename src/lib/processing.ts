import { UMAP } from "umap-js";
import type { DataPoint, ColumnInfo, ClusterInfo } from "@/types";

// Color palette for clusters matching the screenshot aesthetic
const CLUSTER_COLORS: [number, number, number][] = [
  [220, 80, 70],   // red
  [60, 179, 162],   // teal
  [230, 155, 50],   // orange
  [40, 60, 120],    // dark navy
  [140, 100, 180],  // purple
  [80, 160, 80],    // green
  [200, 100, 140],  // pink
  [100, 140, 200],  // light blue
  [180, 140, 60],   // gold
  [120, 120, 120],  // gray
];

/**
 * Simple TF-IDF based embedding for text fields.
 * Creates a bag-of-words vector for each record.
 */
function computeEmbeddings(records: Record<string, string | number>[], columns: ColumnInfo[]): number[][] {
  const textColumns = columns.filter((c) => c.type === "string").map((c) => c.name);
  
  // Build vocabulary from all text fields
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
    // Also include number fields as categorical tokens
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

  // Compute TF-IDF vectors
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

/**
 * Simple DBSCAN clustering
 */
function dbscan(
  points: [number, number][],
  eps: number,
  minPts: number
): number[] {
  const n = points.length;
  const labels = new Array(n).fill(-1);
  let clusterId = 0;

  function distance(a: [number, number], b: [number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
  }

  function regionQuery(idx: number): number[] {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (distance(points[idx], points[i]) <= eps) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;
    const neighbors = regionQuery(i);
    if (neighbors.length < minPts) {
      labels[i] = -1; // noise
      continue;
    }

    labels[i] = clusterId;
    const seed = [...neighbors];
    let j = 0;
    while (j < seed.length) {
      const q = seed[j];
      if (labels[q] === -1) labels[q] = clusterId;
      if (labels[q] !== -1 && labels[q] !== clusterId) {
        j++;
        continue;
      }
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
      for (let j = 0; j < n; j++) {
        if (labels[j] >= 0) {
          const d = distance(points[i], points[j]);
          if (d < minDist) {
            minDist = d;
            nearest = labels[j];
          }
        }
      }
      labels[i] = nearest;
    }
  }

  return labels;
}

/**
 * Generate topic labels for clusters using Cerebras LLM
 */
async function generateTopicLabels(
  clusters: Map<number, Record<string, string | number>[]>,
  columns: ColumnInfo[]
): Promise<Map<number, string>> {
  const labels = new Map<number, string>();
  
  for (const [clusterId, records] of clusters) {
    // Sample up to 10 records from this cluster
    const sample = records.slice(0, 10);
    const sampleText = sample
      .map((r) =>
        columns
          .map((c) => `${c.name}: ${r[c.name]}`)
          .join(", ")
      )
      .join("\n");

    try {
      const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b",
          messages: [
            {
              role: "system",
              content: "You are a data analyst. Given a sample of data records from a cluster, provide a very short topic label (1-3 words) that describes what these records have in common. Reply with ONLY the label, nothing else.",
            },
            {
              role: "user",
              content: `Here are sample records from a cluster:\n${sampleText}\n\nWhat short topic label describes this group?`,
            },
          ],
          max_tokens: 20,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const label = data.choices?.[0]?.message?.content?.trim() || `Cluster ${clusterId}`;
        labels.set(clusterId, label);
      } else {
        labels.set(clusterId, `Cluster ${clusterId}`);
      }
    } catch {
      labels.set(clusterId, `Cluster ${clusterId}`);
    }
  }

  return labels;
}

/**
 * Detect column types from data
 */
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

/**
 * Main processing pipeline
 */
export async function processData(
  records: Record<string, string | number>[],
  datasetName: string
): Promise<{
  points: DataPoint[];
  columns: ColumnInfo[];
  clusters: ClusterInfo[];
}> {
  if (records.length === 0) throw new Error("No records to process");

  // Step 1: Detect column types
  const columns = detectColumnTypes(records);

  // Convert numeric columns
  for (const col of columns) {
    if (col.type === "number") {
      for (const record of records) {
        record[col.name] = Number(record[col.name]) || 0;
      }
    }
  }

  // Step 2: Compute embeddings
  const embeddings = computeEmbeddings(records, columns);

  // Step 3: UMAP dimensionality reduction
  const nNeighbors = Math.min(15, Math.max(2, Math.floor(records.length / 5)));
  const umap = new UMAP({
    nNeighbors,
    minDist: 0.1,
    nComponents: 2,
    spread: 1.0,
  });

  const coords = umap.fit(embeddings);

  // Normalize coordinates to [-5, 5] range for visualization
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const normalized: [number, number][] = coords.map(([x, y]) => [
    ((x - minX) / rangeX) * 10 - 5,
    ((y - minY) / rangeY) * 10 - 5,
  ]);

  // Step 4: Clustering
  const avgDist = computeAverageNNDistance(normalized);
  const eps = avgDist * 2;
  const minPts = Math.max(2, Math.floor(records.length * 0.03));
  const clusterLabels = dbscan(normalized, eps, minPts);

  // Group records by cluster
  const clusterMap = new Map<number, Record<string, string | number>[]>();
  clusterLabels.forEach((label, i) => {
    if (!clusterMap.has(label)) clusterMap.set(label, []);
    clusterMap.get(label)!.push(records[i]);
  });

  // Step 5: Generate topic labels
  const topicLabels = await generateTopicLabels(clusterMap, columns);

  // Build cluster info
  const clusterInfoMap = new Map<number, { sumX: number; sumY: number; count: number }>();
  clusterLabels.forEach((label, i) => {
    if (!clusterInfoMap.has(label)) clusterInfoMap.set(label, { sumX: 0, sumY: 0, count: 0 });
    const info = clusterInfoMap.get(label)!;
    info.sumX += normalized[i][0];
    info.sumY += normalized[i][1];
    info.count++;
  });

  const clusters: ClusterInfo[] = Array.from(clusterInfoMap.entries()).map(([id, info]) => ({
    id,
    label: topicLabels.get(id) || `Cluster ${id}`,
    centroidX: info.sumX / info.count,
    centroidY: info.sumY / info.count,
    count: info.count,
    color: CLUSTER_COLORS[id % CLUSTER_COLORS.length],
  }));

  // Build data points
  const points: DataPoint[] = records.map((record, i) => ({
    id: `point-${i}`,
    fields: record,
    x: normalized[i][0],
    y: normalized[i][1],
    clusterId: clusterLabels[i],
    topicLabel: topicLabels.get(clusterLabels[i]) || `Cluster ${clusterLabels[i]}`,
    embedding: embeddings[i],
  }));

  return { points, columns, clusters };
}

function computeAverageNNDistance(points: [number, number][]): number {
  let totalDist = 0;
  const n = Math.min(points.length, 100); // sample for speed
  for (let i = 0; i < n; i++) {
    let minDist = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const d = Math.sqrt((points[i][0] - points[j][0]) ** 2 + (points[i][1] - points[j][1]) ** 2);
      if (d < minDist) minDist = d;
    }
    totalDist += minDist;
  }
  return totalDist / n;
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

import { NextRequest, NextResponse } from "next/server";
import { processData } from "@/lib/processing";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { records, datasetName } = body as {
      records: Record<string, string | number>[];
      datasetName: string;
    };

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "No records provided" }, { status: 400 });
    }

    const result = await processData(records, datasetName);

    // Strip embeddings to reduce response size
    const points = result.points.map((p) => ({ ...p, embedding: undefined }));

    return NextResponse.json({
      points,
      columns: result.columns,
      clusters: result.clusters,
    });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}

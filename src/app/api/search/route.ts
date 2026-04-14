import { NextRequest, NextResponse } from "next/server";
import { cosineSimilarity } from "@/lib/processing";

export async function POST(request: NextRequest) {
  try {
    const { query, points, topK = 20 } = await request.json();

    if (!query || !points) {
      return NextResponse.json({ error: "Missing query or points" }, { status: 400 });
    }

    // Create a simple bag-of-words embedding for the query
    const queryTokens = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);

    // Score each point by text similarity
    const scored = points.map((point: { id: string; fields: Record<string, string | number> }) => {
      const text = Object.values(point.fields).join(" ").toLowerCase();
      let score = 0;
      for (const token of queryTokens) {
        if (text.includes(token)) score += 1;
        // Partial match bonus
        for (const word of text.split(/\s+/)) {
          if (word.startsWith(token) || token.startsWith(word)) {
            score += 0.5;
          }
        }
      }
      return { id: point.id, score };
    });

    // Sort by score and take topK
    scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    const results = scored.filter((s: { score: number }) => s.score > 0).slice(0, topK);

    return NextResponse.json({ results: results.map((r: { id: string }) => r.id) });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

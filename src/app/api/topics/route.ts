import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { clusters } = await request.json() as {
      clusters: { id: number; sample: string }[];
    };

    if (!clusters || clusters.length === 0) {
      return NextResponse.json({ labels: [] });
    }

    const labels: { id: number; label: string }[] = [];

    for (const cluster of clusters) {
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
                content: "You are a data analyst. Given sample records from a data cluster, provide a very short topic label (1-3 words) that describes what these records have in common. Reply with ONLY the label, nothing else.",
              },
              {
                role: "user",
                content: `Sample records from cluster:\n${cluster.sample}\n\nShort topic label:`,
              },
            ],
            max_tokens: 20,
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const label = data.choices?.[0]?.message?.content?.trim() || `Cluster ${cluster.id + 1}`;
          labels.push({ id: cluster.id, label });
        } else {
          labels.push({ id: cluster.id, label: `Cluster ${cluster.id + 1}` });
        }
      } catch {
        labels.push({ id: cluster.id, label: `Cluster ${cluster.id + 1}` });
      }
    }

    return NextResponse.json({ labels });
  } catch (error) {
    console.error("Topics error:", error);
    return NextResponse.json({ labels: [] });
  }
}

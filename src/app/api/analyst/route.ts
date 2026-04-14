import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    const systemPrompt = `You are Atlas Analyst, an AI data analysis assistant for Nogro.ai. You help users understand their data visualizations, clusters, and patterns.

Current data context:
- Dataset: ${context?.datasetName || "Unknown"}
- Total points: ${context?.totalPoints || 0}
- Selected points: ${context?.selectedCount || 0}
- Clusters: ${context?.clusters?.map((c: { label: string; count: number }) => `${c.label} (${c.count} points)`).join(", ") || "None"}
${context?.selectedSample ? `\nSample of selected data:\n${context.selectedSample}` : ""}

Provide insightful, concise analysis. Use data-driven observations. Be specific about patterns you notice.`;

    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Cerebras error:", errText);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Analyst error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

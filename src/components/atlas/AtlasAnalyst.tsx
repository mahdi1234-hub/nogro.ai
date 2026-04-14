"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAtlasStore } from "@/lib/store";
import { X, Send, Brain, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AtlasAnalyst() {
  const {
    analystOpen,
    setAnalystOpen,
    datasetName,
    points,
    selectedIds,
    clusters,
    columns,
  } = useAtlasStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm Atlas Analyst. I can help you understand patterns in your data, explain clusters, and analyze selections. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);

    // Build context
    const selectedPoints = points.filter((p) => selectedIds.has(p.id));
    const sampleSize = Math.min(selectedPoints.length, 5);
    const sample = selectedPoints.slice(0, sampleSize);
    const selectedSample = sample
      .map((p) =>
        columns
          .map((c) => `${c.name}: ${p.fields[c.name]}`)
          .join(", ")
      )
      .join("\n");

    const context = {
      datasetName,
      totalPoints: points.length,
      selectedCount: selectedIds.size,
      clusters: clusters.map((c) => ({ label: c.label, count: c.count })),
      selectedSample,
    };

    try {
      const response = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, context }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buffer = "";
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
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // skip
            }
          }
        }
      }

      if (!assistantContent) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "I apologize, I could not generate a response. Please try again.",
          };
          return updated;
        });
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, points, selectedIds, clusters, columns, datasetName]);

  if (!analystOpen) return null;

  return (
    <div className="absolute top-4 right-4 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-forest-800 text-white shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <span className="font-semibold text-sm">Atlas Analyst</span>
        </div>
        <button onClick={() => setAnalystOpen(false)} className="hover:bg-white/20 p-1 rounded transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-forest-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.content || (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about your data..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-forest-500"
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="bg-forest-600 hover:bg-forest-500 disabled:opacity-50 text-white p-2 rounded-lg transition"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          Powered by Llama 3.1 via Cerebras
        </p>
      </div>
    </div>
  );
}

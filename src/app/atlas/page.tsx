"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtlasStore } from "@/lib/store";
import { AtlasView } from "@/components/atlas/AtlasView";

export default function AtlasPage() {
  const router = useRouter();
  const { setDataset, setProcessing, isProcessing, points } = useAtlasStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("atlas-data");
    if (!raw) {
      router.push("/");
      return;
    }

    const { records, datasetName } = JSON.parse(raw);
    if (!records || records.length === 0) {
      router.push("/");
      return;
    }

    // Process data
    setProcessing(true);
    fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records, datasetName }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Processing failed");
        }
        return res.json();
      })
      .then((data) => {
        setDataset(datasetName, data.points, data.columns, data.clusters, records);
        setProcessing(false);
      })
      .catch((err) => {
        setError(err.message);
        setProcessing(false);
      });
  }, [router, setDataset, setProcessing]);

  if (isProcessing) {
    return (
      <div className="h-screen bg-forest-900 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-forest-400 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <h2 className="text-white text-xl font-semibold mb-2">Processing Your Data</h2>
          <p className="text-white/50 text-sm">Generating embeddings, reducing dimensions, detecting clusters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-forest-900 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="text-white bg-forest-600 px-4 py-2 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="h-screen bg-forest-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forest-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <AtlasView />;
}

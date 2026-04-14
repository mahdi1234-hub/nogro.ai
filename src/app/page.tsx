"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload, BarChart3, Search, Brain, Layers, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);

      try {
        const text = await file.text();
        let records: Record<string, string | number>[];

        if (file.name.endsWith(".csv")) {
          const result = Papa.parse(text, { header: true, skipEmptyLines: true });
          records = result.data as Record<string, string | number>[];
        } else if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          records = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          // Treat as plain text - split by lines
          const lines = text.split("\n").filter((l) => l.trim());
          records = lines.map((line, i) => ({ id: String(i), text: line }));
        }

        if (records.length === 0) {
          setError("No data found in file");
          setIsUploading(false);
          return;
        }

        // Store in sessionStorage for the atlas page
        const datasetName = file.name.replace(/\.[^/.]+$/, "");
        sessionStorage.setItem(
          "atlas-data",
          JSON.stringify({ records, datasetName })
        );
        router.push("/atlas");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file");
        setIsUploading(false);
      }
    },
    [router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDemoData = useCallback(() => {
    // Generate demo employee-machine relationship data
    const firstNames = ["Dylan", "Owen", "Daniel", "Luke", "Ethan", "Emma", "Sophia", "Olivia", "Ava", "Isabella", "Mia", "Charlotte", "Amelia", "Harper", "James", "Benjamin", "William", "Henry", "Alexander", "Sebastian", "Jack", "Liam", "Noah", "Oliver", "Elijah", "Mason", "Logan", "Aiden", "Carter", "Lucas", "Grace", "Chloe", "Lily", "Zoe", "Hannah", "Natalie", "Leah", "Aria", "Riley", "Ella"];
    const lastNames = ["Phillips", "Morris", "Hall", "Reed", "Coleman", "Baker", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts", "Turner", "Collins", "Stewart", "Murphy", "Cook", "Rogers", "Morgan", "Peterson", "Cooper", "Bailey", "Howard", "Ward", "Torres", "Gray", "Watson", "Brooks", "Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes", "Ross", "Henderson", "Jenkins", "Perry", "Powell", "Long", "Patterson"];
    const machines = ["Machine A", "Machine B", "Machine C", "Machine D", "Machine E"];
    const relationships = ["Maintain", "Operate", "Supervise", "Produce", "Inspect"];
    const topics = ["Surnames", "Family", "Feminine Names", "Politics", "Technology"];

    const records = [];
    for (let i = 0; i < 50; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const name = `${firstName} ${lastName}`;
      records.push({
        "Employee name": name,
        "Machine name": machines[Math.floor(Math.random() * machines.length)],
        "Relationship": relationships[Math.floor(Math.random() * relationships.length)],
        "Length of Employee name": name.length,
        "Nomic Topic: broad": topics[Math.floor(Math.random() * topics.length)],
        "Distance to Dylan": (Math.random() * 0.8 + 0.2).toFixed(5),
      });
    }

    sessionStorage.setItem(
      "atlas-data",
      JSON.stringify({ records, datasetName: "Machine Employee Relationship Data" })
    );
    router.push("/atlas");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-900 via-forest-800 to-forest-700">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">Nogro.ai</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="#features" className="text-white/70 hover:text-white text-sm transition">Features</a>
          <a href="#how" className="text-white/70 hover:text-white text-sm transition">How it Works</a>
          <button
            onClick={handleDemoData}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Try Demo
          </button>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Turn Any Data Into
            <br />
            <span className="text-forest-300">Interactive Graphs</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10">
            Upload CSV, JSON, or plain text. Nogro.ai automatically generates embeddings,
            reduces dimensions with UMAP, detects topic clusters, and renders an interactive
            scatter plot with full search, filter, and AI analysis.
          </p>

          {/* Upload Zone */}
          <div
            className={`relative max-w-xl mx-auto border-2 border-dashed rounded-2xl p-12 transition-all ${
              dragActive
                ? "border-forest-400 bg-forest-800/50"
                : "border-white/20 hover:border-white/40 bg-white/5"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-forest-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-white/80">Processing your data...</p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/80 text-lg font-medium mb-2">
                  Drop your file here or click to upload
                </p>
                <p className="text-white/40 text-sm mb-6">
                  Supports CSV, JSON, and plain text files
                </p>
                <label className="inline-flex items-center gap-2 bg-forest-500 hover:bg-forest-400 text-white px-6 py-3 rounded-lg font-medium cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  Choose File
                  <input
                    type="file"
                    accept=".csv,.json,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </label>
              </>
            )}
            {error && (
              <p className="text-red-400 mt-4 text-sm">{error}</p>
            )}
          </div>

          {/* Demo button */}
          <button
            onClick={handleDemoData}
            className="mt-6 inline-flex items-center gap-2 text-forest-300 hover:text-forest-200 text-sm font-medium transition"
          >
            Or try with demo data <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-24">
          {[
            {
              icon: <BarChart3 className="w-8 h-8" />,
              title: "Automatic Clustering",
              desc: "UMAP + DBSCAN automatically groups similar data points and labels clusters with AI-generated topic names.",
            },
            {
              icon: <Search className="w-8 h-8" />,
              title: "Smart Search",
              desc: "Text search, vector search, lasso selection, cherry pick, and categorical filters — all working on the interactive map.",
            },
            {
              icon: <Brain className="w-8 h-8" />,
              title: "AI Analysis",
              desc: "Atlas Analyst powered by Llama 3.1 explains patterns, clusters, and selections in natural language.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
            >
              <div className="text-forest-400 mb-4">{f.icon}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div id="how" className="text-center">
          <h2 className="text-3xl font-bold text-white mb-12">How It Works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {["Upload Data", "Generate Embeddings", "UMAP Reduction", "Detect Clusters", "Interactive Atlas"].map(
              (step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="bg-forest-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <span className="text-white/80 text-sm font-medium">{step}</span>
                  {i < 4 && <ArrowRight className="w-4 h-4 text-white/30 hidden md:block" />}
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

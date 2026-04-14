"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useAtlasStore } from "@/lib/store";
import { pointInPolygon } from "@/lib/utils";
import type { DataPoint } from "@/types";

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

interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export function ScatterPlot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    points,
    clusters,
    selectedIds,
    hoveredId,
    activeTool,
    textSearchResults,
    vectorSearchResults,
    setHoveredId,
    setSelectedIds,
    toggleSelectedId,
    selectByLasso,
    lassoPoints,
    setLassoPoints,
    isLassoing,
    setIsLassoing,
    setPreviewIndex,
    setDataPreviewOpen,
  } = useAtlasStore();

  const [viewState, setViewState] = useState<ViewState>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Convert data coordinates to screen coordinates
  const dataToScreen = useCallback(
    (x: number, y: number) => {
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;
      const scale = Math.min(dimensions.width, dimensions.height) / 12 * viewState.scale;
      return {
        sx: cx + (x * scale) + viewState.offsetX,
        sy: cy - (y * scale) + viewState.offsetY,
      };
    },
    [dimensions, viewState]
  );

  // Convert screen coordinates to data coordinates
  const screenToData = useCallback(
    (sx: number, sy: number) => {
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;
      const scale = Math.min(dimensions.width, dimensions.height) / 12 * viewState.scale;
      return {
        x: (sx - cx - viewState.offsetX) / scale,
        y: -(sy - cy - viewState.offsetY) / scale,
      };
    },
    [dimensions, viewState]
  );

  // Find point under cursor
  const findPointAt = useCallback(
    (sx: number, sy: number): DataPoint | null => {
      const radius = 8;
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        const { sx: px, sy: py } = dataToScreen(p.x, p.y);
        const dist = Math.sqrt((sx - px) ** 2 + (sy - py) ** 2);
        if (dist <= radius) return p;
      }
      return null;
    },
    [points, dataToScreen]
  );

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "#f5f5f0";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw topic labels (behind dots)
    for (const cluster of clusters) {
      const { sx, sy } = dataToScreen(cluster.centroidX, cluster.centroidY);
      ctx.font = "600 28px Inter, sans-serif";
      ctx.fillStyle = "rgba(80, 80, 80, 0.25)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cluster.label, sx, sy);
    }

    // Draw points
    const hasSelection = selectedIds.size > 0;
    const hasTextSearch = textSearchResults.size > 0;
    const hasVectorSearch = vectorSearchResults.size > 0;

    for (const point of points) {
      const { sx, sy } = dataToScreen(point.x, point.y);
      const color = CLUSTER_COLORS[point.clusterId % CLUSTER_COLORS.length];

      let isHighlighted = false;
      let isSearchMatch = false;
      let alpha = 1;

      if (hasSelection) {
        isHighlighted = selectedIds.has(point.id);
        alpha = isHighlighted ? 1 : 0.15;
      }

      if (hasTextSearch) {
        isSearchMatch = textSearchResults.has(point.id);
        if (!hasSelection) alpha = isSearchMatch ? 1 : 0.15;
      }

      if (hasVectorSearch) {
        isSearchMatch = vectorSearchResults.has(point.id);
        if (!hasSelection) alpha = isSearchMatch ? 1 : 0.15;
      }

      const isHovered = hoveredId === point.id;
      const radius = isHovered ? 8 : isHighlighted ? 6 : 5;

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
      ctx.fill();

      if (isHighlighted || isHovered) {
        ctx.strokeStyle = isHovered ? "#000" : `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw lasso
    if (lassoPoints.length > 1) {
      ctx.beginPath();
      const first = lassoPoints[0];
      ctx.moveTo(first[0], first[1]);
      for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(lassoPoints[i][0], lassoPoints[i][1]);
      }
      if (!isLassoing) ctx.closePath();
      ctx.strokeStyle = "rgba(45, 90, 39, 0.7)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(45, 90, 39, 0.08)";
      ctx.fill();
    }

    // Draw tooltip for hovered point
    if (hoveredId) {
      const point = points.find((p) => p.id === hoveredId);
      if (point) {
        const { sx, sy } = dataToScreen(point.x, point.y);
        const entries = Object.entries(point.fields).slice(0, 4);
        const lineHeight = 18;
        const padding = 8;
        const tooltipWidth = 220;
        const tooltipHeight = entries.length * lineHeight + padding * 2;
        const tx = sx + 12;
        const ty = sy - tooltipHeight / 2;

        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.beginPath();
        ctx.roundRect(tx, ty, tooltipWidth, tooltipHeight, 6);
        ctx.fill();

        ctx.font = "400 12px Inter, sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        entries.forEach(([key, val], i) => {
          ctx.fillText(
            `${key}: ${String(val).slice(0, 25)}`,
            tx + padding,
            ty + padding + 12 + i * lineHeight
          );
        });
      }
    }
  }, [points, clusters, selectedIds, hoveredId, textSearchResults, vectorSearchResults, lassoPoints, isLassoing, dimensions, viewState, dataToScreen]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (activeTool === "lasso") {
        setIsLassoing(true);
        setLassoPoints([[sx, sy]]);
        return;
      }

      if (activeTool === "cherryPick") {
        const point = findPointAt(sx, sy);
        if (point) {
          toggleSelectedId(point.id);
          const idx = points.findIndex((p) => p.id === point.id);
          if (idx >= 0) {
            setPreviewIndex(idx);
            setDataPreviewOpen(true);
          }
        }
        return;
      }

      // Pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewState.offsetX, y: e.clientY - viewState.offsetY });
    },
    [activeTool, findPointAt, points, viewState, setIsLassoing, setLassoPoints, toggleSelectedId, setPreviewIndex, setDataPreviewOpen]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (isLassoing && activeTool === "lasso") {
        setLassoPoints([...lassoPoints, [sx, sy]]);
        return;
      }

      if (isPanning) {
        setViewState((prev) => ({
          ...prev,
          offsetX: e.clientX - panStart.x,
          offsetY: e.clientY - panStart.y,
        }));
        return;
      }

      // Hover detection
      const point = findPointAt(sx, sy);
      setHoveredId(point?.id || null);
    },
    [isPanning, isLassoing, activeTool, panStart, lassoPoints, findPointAt, setHoveredId, setLassoPoints]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isLassoing && activeTool === "lasso" && lassoPoints.length > 2) {
        // Find all points inside lasso polygon
        // Convert lasso screen points to data coordinates
        const polyData: [number, number][] = lassoPoints.map(([sx, sy]) => {
          const { x, y } = screenToData(sx, sy);
          return [x, y];
        });
        const insideIds = points
          .filter((p) => pointInPolygon([p.x, p.y], polyData))
          .map((p) => p.id);
        selectByLasso(insideIds);
        setIsLassoing(false);
        setLassoPoints([]);
        return;
      }

      setIsPanning(false);

      // Click on point for preview
      if (!isPanning) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const point = findPointAt(sx, sy);
        if (point && activeTool !== "cherryPick") {
          const idx = points.findIndex((p) => p.id === point.id);
          if (idx >= 0) {
            setPreviewIndex(idx);
            setDataPreviewOpen(true);
            setSelectedIds(new Set([point.id]));
          }
        }
      }
    },
    [isLassoing, activeTool, lassoPoints, points, isPanning, findPointAt, selectByLasso, setIsLassoing, setLassoPoints, setPreviewIndex, setDataPreviewOpen, setSelectedIds, screenToData]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setViewState((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(20, prev.scale * (1 - e.deltaY * 0.001))),
    }));
  }, []);

  const cursorStyle = activeTool === "lasso" ? "crosshair" : activeTool === "cherryPick" ? "pointer" : hoveredId ? "pointer" : "grab";

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ cursor: cursorStyle }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsPanning(false);
          setHoveredId(null);
        }}
        onWheel={handleWheel}
      />
    </div>
  );
}

"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const clusterColors = {
  light: [
    [0.98, 0.32, 0.21, 1],
    [0.14, 0.48, 0.57, 1],
    [0.86, 0.58, 0.11, 1],
    [0.39, 0.28, 0.73, 1],
  ],
  dark: [
    [1, 0.42, 0.31, 1],
    [0.27, 0.78, 0.86, 1],
    [1, 0.73, 0.25, 1],
    [0.63, 0.52, 1, 1],
  ],
} as const;

type Theme = keyof typeof clusterColors;

type AttributeBuffer = { view: Float32Array };
type HeliosNetworkInstance = {
  addNodes: (count: number) => number[];
  addEdges: (edges: Array<[number, number]>) => number[];
  defineNodeAttribute: (name: string, type: unknown, size: number) => void;
  defineEdgeAttribute: (name: string, type: unknown, size: number) => void;
  getNodeAttributeBuffer: (name: string) => AttributeBuffer;
  getEdgeAttributeBuffer: (name: string) => AttributeBuffer;
  withBufferAccess: (callback: () => void) => void;
};

export function HeliosPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const update = () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let helios: { destroy?: () => void } | null = null;
    setStatus("loading");
    container.replaceChildren();

    async function initialize() {
      try {
        const importBrowserModule = new Function("url", "return import(url)") as (
          url: string,
        ) => Promise<Record<string, unknown>>;
        const vendorBase = new URL("vendor/", document.baseURI);
        const [heliosModule, networkModule] = await Promise.all([
          importBrowserModule(new URL("helios-web.es.js", vendorBase).href),
          importBrowserModule(new URL("helios-network.inline.js", vendorBase).href),
        ]);
        if (cancelled) return;
        const Helios = heliosModule.Helios as new (
          network: unknown,
          options: Record<string, unknown>,
        ) => {
          ready: Promise<void>;
          frameNetwork: (options: Record<string, unknown>) => void;
          destroy?: () => void;
        };
        const HeliosNetwork = networkModule.default as {
          create: (options: Record<string, unknown>) => Promise<HeliosNetworkInstance>;
        };
        const AttributeType = networkModule.AttributeType as { Float: unknown };
        const network = await HeliosNetwork.create({ directed: false, initialNodes: 0, initialEdges: 0 });
        const nodes = network.addNodes(36);
        network.defineNodeAttribute("_helios_visuals_position", AttributeType.Float, 3);
        network.defineNodeAttribute("_helios_visuals_color", AttributeType.Float, 4);
        network.defineNodeAttribute("_helios_visuals_size", AttributeType.Float, 1);
        network.defineEdgeAttribute("_helios_visuals_edge_color", AttributeType.Float, 8);
        network.defineEdgeAttribute("_helios_visuals_edge_opacity", AttributeType.Float, 2);
        network.defineEdgeAttribute("_helios_visuals_edge_width", AttributeType.Float, 2);

        const centers = [[-98, -62], [92, -64], [-72, 78], [88, 76]];
        const edges: Array<[number, number]> = [];
        for (let cluster = 0; cluster < 4; cluster += 1) {
          const start = cluster * 9;
          for (let index = 1; index < 9; index += 1) {
            edges.push([nodes[start], nodes[start + index]]);
            edges.push([nodes[start + index], nodes[start + (index === 8 ? 1 : index + 1)]]);
          }
        }
        edges.push(
          [nodes[0], nodes[9]], [nodes[9], nodes[27]], [nodes[27], nodes[18]], [nodes[18], nodes[0]],
          [nodes[3], nodes[22]], [nodes[14], nodes[30]], [nodes[7], nodes[12]], [nodes[20], nodes[32]],
        );
        const edgeIds = network.addEdges(edges);
        const colors = clusterColors[theme];

        const applyVisuals = () => {
          network.withBufferAccess(() => {
            const positions = network.getNodeAttributeBuffer("_helios_visuals_position").view as Float32Array;
            const colorView = network.getNodeAttributeBuffer("_helios_visuals_color").view as Float32Array;
            const sizeView = network.getNodeAttributeBuffer("_helios_visuals_size").view as Float32Array;
            const edgeColor = network.getEdgeAttributeBuffer("_helios_visuals_edge_color").view as Float32Array;
            const edgeOpacity = network.getEdgeAttributeBuffer("_helios_visuals_edge_opacity").view as Float32Array;
            const edgeWidth = network.getEdgeAttributeBuffer("_helios_visuals_edge_width").view as Float32Array;

            nodes.forEach((nodeId: number, index: number) => {
              const cluster = Math.floor(index / 9);
              const within = index % 9;
              const angle = ((within - 1) / 8) * Math.PI * 2 + cluster * 0.34;
              const radius = within === 0 ? 0 : 31 + (within % 3) * 7;
              const positionOffset = nodeId * 3;
              positions[positionOffset] = centers[cluster][0] + Math.cos(angle) * radius;
              positions[positionOffset + 1] = centers[cluster][1] + Math.sin(angle) * radius;
              positions[positionOffset + 2] = 0;
              const colorOffset = nodeId * 4;
              colorView.set(colors[cluster], colorOffset);
              sizeView[nodeId] = within === 0 ? 18 : 8 + (within % 3) * 2.5;
            });

            edgeIds.forEach((edgeId: number, index: number) => {
              const offset = edgeId * 8;
              const alpha = index >= edges.length - 8 ? 0.34 : 0.22;
              const rgba = theme === "dark" ? [0.74, 0.82, 0.84, alpha] : [0.1, 0.22, 0.25, alpha];
              edgeColor.set(rgba, offset);
              edgeColor.set(rgba, offset + 4);
              edgeOpacity[edgeId * 2] = 1;
              edgeOpacity[edgeId * 2 + 1] = 1;
              edgeWidth[edgeId * 2] = index >= edges.length - 8 ? 1.1 : 0.65;
              edgeWidth[edgeId * 2 + 1] = index >= edges.length - 8 ? 1.1 : 0.65;
            });
          });
        };

        applyVisuals();
        const instance = new Helios(network, {
          container,
          renderer: "auto",
          mode: "2d",
          clearColor: theme === "dark" ? [0.043, 0.071, 0.078, 1] : [0.969, 0.957, 0.925, 1],
          layout: { type: "static", options: { bounds: [-160, -130, 160, 135] } },
          mappers: null,
          labels: false,
          legends: false,
          quickControls: false,
          ui: false,
          storage: false,
          session: false,
          fileDrop: false,
          autoCleanup: true,
          disposeNetworkOnDestroy: true,
        } as Record<string, unknown>);
        helios = instance as unknown as { destroy?: () => void };
        await instance.ready;
        if (cancelled) {
          helios.destroy?.();
          return;
        }
        applyVisuals();
        const visuals = (instance as unknown as { visuals?: Record<string, (...args: unknown[]) => void> }).visuals;
        visuals?.bumpNodeAttributes?.(
          "_helios_visuals_position",
          "_helios_visuals_color",
          "_helios_visuals_size",
        );
        visuals?.bumpEdgeAttributes?.(
          "_helios_visuals_edge_color",
          "_helios_visuals_edge_width",
          "_helios_visuals_edge_opacity",
        );
        visuals?.markPositionsDirty?.();
        instance.frameNetwork({ animate: false, padding: 0.12 });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("fallback");
      }
    }

    initialize();
    return () => {
      cancelled = true;
      helios?.destroy?.();
      container.replaceChildren();
    };
  }, [theme]);

  return (
    <div className="helios-card">
      <div className="helios-card__meta">
        <span><Sparkles size={14} aria-hidden="true" /> Live Helios Web 0.10</span>
        <span className={`status-dot status-dot--${status}`}>{status === "ready" ? "Interactive" : status === "fallback" ? "Preview" : "Loading"}</span>
      </div>
      <div className="helios-card__canvas-wrap">
        <div className="helios-card__fallback" aria-hidden={status === "ready"}>
          {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
        </div>
        <div ref={containerRef} className="helios-card__canvas" aria-label="Interactive Helios Web network visualization" />
      </div>
      <div className="helios-card__footer">
        <p>Drag to pan · scroll to zoom · explore a live WASM-backed graph</p>
        <a href="https://heliosweb.io/app/" target="_blank" rel="noreferrer">
          Open full app <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

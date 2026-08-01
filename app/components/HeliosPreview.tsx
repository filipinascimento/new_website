"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AttributeBuffer = { view: Float32Array };
type HeliosNetworkInstance = {
  nodeCount: number;
  edgeCount: number;
  nodeIndices: Uint32Array;
  edgeIndices: Uint32Array;
  defineNodeAttribute: (name: string, type: unknown, size?: number) => void;
  defineEdgeAttribute: (name: string, type: unknown, size?: number) => void;
  getNodeAttributeBuffer: (name: string) => AttributeBuffer;
  getEdgeAttributeBuffer: (name: string) => AttributeBuffer;
  withBufferAccess: (callback: () => void, options?: Record<string, boolean>) => void;
};

type HeliosInstance = {
  ready: Promise<void>;
  frameNetwork: (options?: Record<string, unknown>) => void;
  destroy?: () => void;
};

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function HeliosPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let helios: HeliosInstance | null = null;

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
        ) => HeliosInstance;
        const HeliosNetwork = networkModule.default as {
          generateWattsStrogatz: (options: Record<string, unknown>) => Promise<HeliosNetworkInstance>;
        };
        const AttributeType = networkModule.AttributeType as { Float: unknown };

        // These are the same synthetic-network defaults used by heliosweb.io/app/.
        const network = await HeliosNetwork.generateWattsStrogatz({
          nodeCount: 10_000,
          neighborLevel: 2,
          rewiringProbability: 0.006,
          seed: 1,
          directed: false,
        });

        // Numeric attributes keep the standard Mappers and Filters panels useful
        // while leaving appearance, layout, camera, and interaction to Helios.
        network.defineNodeAttribute("weight", AttributeType.Float);
        network.defineEdgeAttribute("intensity", AttributeType.Float);
        const random = seededRandom(11);
        network.withBufferAccess(() => {
          const weights = network.getNodeAttributeBuffer("weight").view;
          for (const nodeId of network.nodeIndices) weights[nodeId] = random();
        }, { nodeIndices: true });
        network.withBufferAccess(() => {
          const intensities = network.getEdgeAttributeBuffer("intensity").view;
          for (const edgeId of network.edgeIndices) intensities[edgeId] = random();
        }, { edgeIndices: true });

        if (cancelled) return;
        const instance = new Helios(network, {
          container,
          ui: true,
          networkSource: {
            name: "Watts–Strogatz 10k",
            baseName: "watts-strogatz-10k",
          },
          autoCleanup: true,
          disposeNetworkOnDestroy: true,
        });
        helios = instance;
        await instance.ready;
        if (cancelled) {
          instance.destroy?.();
          return;
        }
        instance.frameNetwork({ animate: false });
        setStatus("ready");
      } catch (error) {
        console.error("Helios preview failed to initialize", error);
        if (!cancelled) setStatus("fallback");
      }
    }

    setStatus("loading");
    container.replaceChildren();
    initialize();
    return () => {
      cancelled = true;
      helios?.destroy?.();
      container.replaceChildren();
    };
  }, []);

  return (
    <figure className="helios-stage">
      <div className="helios-stage__viewport">
        <div className="helios-stage__loading" aria-hidden={status === "ready"}>
          <span>{status === "fallback" ? "Open the full Helios app to explore the graph." : "Building a 10,000-node small world…"}</span>
        </div>
        <div ref={containerRef} className="helios-stage__canvas" aria-label="Interactive 10,000-node Watts–Strogatz network in Helios Web" />
      </div>
      <figcaption className="helios-stage__caption">
        <span>Watts–Strogatz · 10,000 nodes · live GPU layout</span>
        <a href="https://heliosweb.io/app/" target="_blank" rel="noreferrer">
          Open Helios <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
}

"use client";

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
  behavior?: {
    appearance?: {
      background: (value: string) => unknown;
    };
  };
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
    const root = document.documentElement;

    const synchronizeBackground = () => {
      const background = getComputedStyle(root).getPropertyValue("--paper").trim();
      if (!background) return;
      container.style.backgroundColor = background;
      helios?.behavior?.appearance?.background(background);
    };

    const themeObserver = new MutationObserver(synchronizeBackground);
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    synchronizeBackground();

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

        const network = await HeliosNetwork.generateWattsStrogatz({
          nodeCount: 10_000,
          neighborLevel: 2,
          rewiringProbability: 0.006,
          seed: 1,
          directed: false,
        });

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
          storage: false,
          session: false,
          autosyncInteractionIdleMs: false,
          warnOnUnsavedSessionChanges: false,
          networkSource: {
            name: "Helios network demo",
            baseName: "helios-network-demo",
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
        synchronizeBackground();
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
      themeObserver.disconnect();
      helios?.destroy?.();
      container.replaceChildren();
    };
  }, []);

  return (
    <figure className="helios-stage">
      <div className="helios-stage__viewport">
        <div className="helios-stage__loading" aria-hidden={status === "ready"}>
          <span>{status === "fallback" ? "Open Helios to explore the network." : "Loading interactive network…"}</span>
        </div>
        <div ref={containerRef} className="helios-stage__canvas" aria-label="Interactive network preview in Helios Web" />
      </div>
      <figcaption className="helios-stage__caption">
        Helios Web visualization · <a href="https://heliosweb.io/" target="_blank" rel="noreferrer">Explore the tool at heliosweb.io</a>
      </figcaption>
    </figure>
  );
}

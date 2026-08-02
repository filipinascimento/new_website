"use client";

import { useEffect, useRef, useState } from "react";

type HeliosLayoutInstance = {
  setSettings?: (
    settings: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
};

type HeliosInstance = {
  ready: Promise<void>;
  layout?: () => HeliosLayoutInstance | null;
  nodeSizeScale?: (value: number) => unknown;
  edgeWidthScale?: (value: number) => unknown;
  legends?: (value: boolean) => unknown;
  setCameraPose?: (
    pose: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
  cameraControls?: (options: Record<string, unknown>) => unknown;
  behavior?: {
    appearance?: {
      background: (value: string) => unknown;
    };
  };
  destroy?: () => void;
};

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
          generateWattsStrogatz: (options: Record<string, unknown>) => Promise<object>;
        };

        const network = await HeliosNetwork.generateWattsStrogatz({
          nodeCount: 2_000,
          neighborLevel: 2,
          rewiringProbability: 0.006,
          directed: false,
          seed: 17,
        });

        if (cancelled) return;
        const instance = new Helios(network, {
          container,
          mode: "3d",
          projection: "perspective",
          ui: false,
          quickControls: false,
          debug: false,
          storage: false,
          session: false,
          startup: {
            hideCanvasUntilFirstFrame: false,
            layoutIterations: 0,
            layoutDurationMs: 0,
            initialCameraFit: false,
          },
          autosyncInteractionIdleMs: false,
          warnOnUnsavedSessionChanges: false,
          legends: { enabled: false },
          behaviors: { legends: false },
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
        instance.layout?.()?.setSettings?.(
          { linkDistance: 6 },
          { reheat: true, reason: "portfolio-preview" },
        );
        instance.nodeSizeScale?.(2);
        instance.edgeWidthScale?.(3);
        instance.legends?.(false);
        instance.setCameraPose?.(
          { distance: 1000, target: [0, 0, 0] },
          { applyState: false },
        );
        instance.cameraControls?.({
          autoFit: true,
          autoFitPaddingRatio: 0.04,
          animation: true,
          orbit: true,
          orbitSpeed: 0.04,
          orbitAngle: 16,
          orbitAxis: [0.83, 0.75, 0],
        });
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

import {
  Boxes,
  CircuitBoard,
  Gauge,
  Globe2,
  Library,
  Network,
  Radar,
  Waypoints,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "helios-web": Network,
  motifs: CircuitBoard,
  openalexnet: Library,
  tpsimilarity: Waypoints,
  coordinationz: Radar,
  rmodularity: Boxes,
  bigscience: Globe2,
  progressista: Gauge,
};

const tones: Record<string, string> = {
  "helios-web": "blue",
  motifs: "warm",
  openalexnet: "violet",
  tpsimilarity: "green",
  coordinationz: "rose",
  rmodularity: "blue",
  bigscience: "violet",
  progressista: "warm",
};

export function SoftwareIcon({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const Icon = icons[slug] ?? Workflow;
  const tone = tones[slug] ?? "blue";

  return (
    <span className={`software-icon software-icon--${tone}${compact ? " software-icon--compact" : ""}`} aria-hidden="true">
      <Icon />
    </span>
  );
}

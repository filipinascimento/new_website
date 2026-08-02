import Image from "next/image";
import {
  Boxes,
  Gauge,
  Globe2,
  Library,
  Network,
  Radar,
  Waypoints,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const brandAssets: Record<string, string> = {
  "helios-web": "/software-icons/helios-web-mark.svg",
};

const icons: Record<string, LucideIcon> = {
  "helios-web": Network,
  openalexnet: Library,
  tpsimilarity: Waypoints,
  coordinationz: Radar,
  rmodularity: Boxes,
  bigscience: Globe2,
  progressista: Gauge,
};

const tones: Record<string, string> = {
  "helios-web": "blue",
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
  const brandAsset = brandAssets[slug];
  const basePath = process.env.GITHUB_PAGES === "true" ? "/new_website" : "";

  return (
    <span className={`software-icon software-icon--${brandAsset ? "brand" : tone}${compact ? " software-icon--compact" : ""}`} aria-hidden="true">
      {brandAsset ? (
        <Image className="software-icon__asset" src={`${basePath}${brandAsset}`} alt="" width={600} height={600} unoptimized />
      ) : (
        <Icon />
      )}
    </span>
  );
}

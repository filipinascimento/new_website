import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  link?: { label: string; href: string };
};

export function SectionHeading({ eyebrow, title, description, link }: Props) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {link && (
        <Link className="text-link" href={link.href}>
          {link.label}<ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="button button--secondary print-button" type="button" onClick={() => window.print()}>
      <Printer size={16} aria-hidden="true" /> Print public CV
    </button>
  );
}

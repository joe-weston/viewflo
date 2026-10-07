"use client";

import { useEffect, useRef, useState } from "react";

const palettes = [
  {
    id: "coastal",
    name: "Coastal teal (recommended)",
    colors: ["#FFFFFF", "#F4F1EB", "#286B73", "#C68168", "#252C30"],
  },
  {
    id: "sage",
    name: "Sage & linen",
    colors: ["#FFFFFF", "#F4F6F0", "#506C59", "#CFB99B", "#29322C"],
  },
  {
    id: "pacific",
    name: "Pacific blue",
    colors: ["#FFFFFF", "#EEF5F7", "#2C6482", "#D7C4A5", "#25313B"],
  },
  {
    id: "clay",
    name: "California clay",
    colors: ["#FFFFFF", "#FAF3EC", "#A34F39", "#B8C7BA", "#342C28"],
  },
];
const storageKey = "pasadena-staging-palette";

export function PasadenaTheme({
  children,
  preview,
}: {
  children: React.ReactNode;
  preview: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const select = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!preview) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved && palettes.some((palette) => palette.id === saved)) {
        if (root.current) root.current.dataset.palette = saved;
        if (select.current) select.current.value = saved;
      }
    } catch {
      /* Palette switching also works with storage disabled. */
    }
  }, [preview]);

  function changePalette(value: string) {
    if (!palettes.some((palette) => palette.id === value)) return;
    if (root.current) root.current.dataset.palette = value;
    if (select.current) select.current.value = value;
    try {
      sessionStorage.setItem(storageKey, value);
    } catch {
      /* Optional persistence. */
    }
  }

  return (
    <div ref={root} className="pasadena-site" data-palette="coastal">
      {children}
      {preview && (
        <aside
          className="palette-preview"
          aria-label="Staging palette preview"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              event.currentTarget
                .querySelector<HTMLButtonElement>("button")
                ?.focus();
            }
          }}
        >
          <button
            type="button"
            aria-expanded={open}
            aria-controls="palette-preview-options"
            onClick={() => setOpen(!open)}
          >
            {open ? "Close palettes" : "Preview palettes"}
          </button>
          <div id="palette-preview-options" hidden={!open}>
            <p>Staging preview</p>
            <label htmlFor="pasadena-palette">Website color scheme</label>
            <select
              ref={select}
              id="pasadena-palette"
              defaultValue="coastal"
              onChange={(event) => changePalette(event.target.value)}
            >
              {palettes.map((palette) => (
                <option key={palette.id} value={palette.id}>
                  {palette.name}
                </option>
              ))}
            </select>
            {palettes.map((palette) => (
              <div
                key={palette.id}
                className="palette-preview-swatches"
                data-swatch-palette={palette.id}
                aria-label={`${palette.name} colors`}
              >
                {palette.colors.map((color) => (
                  <span key={color} style={{ backgroundColor: color }} />
                ))}
              </div>
            ))}
            <button type="button" onClick={() => changePalette("coastal")}>
              Reset to recommended
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

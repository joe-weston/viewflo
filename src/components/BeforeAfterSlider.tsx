"use client";
import Image from "next/image";
import React, { useCallback, useRef, useState } from "react";
import { MoveHorizontalIcon } from "lucide-react";

type Props = {
  beforeImage: string;
  afterImage: string;
  label: string;
  className?: string;
};
export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  label,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    setPosition(
      Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
    );
  }, []);
  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setPosition((value) =>
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? 100
          : Math.min(
              100,
              Math.max(0, value + (event.key === "ArrowLeft" ? -4 : 4)),
            ),
    );
  };
  return (
    <div
      ref={containerRef}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = true;
        setIsDragging(true);
        updateFromClientX(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) updateFromClientX(event.clientX);
      }}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onLostPointerCapture={() => {
        dragging.current = false;
        setIsDragging(false);
      }}
      className={`relative touch-pan-y select-none overflow-hidden rounded-2xl bg-sand ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
    >
      <Image
        src={afterImage}
        loading="eager"
        alt={`${label} after installation`}
        fill
        sizes="(max-width: 1023px) 100vw, 740px"
        className="object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={beforeImage}
          loading="eager"
          alt={`${label} before installation`}
          fill
          sizes="(max-width: 1023px) 100vw, 740px"
          className="object-cover"
          draggable={false}
        />
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink/75 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-cream">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-cream/90 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-ink">
        After
      </span>
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-cream"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      />
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Reveal before and after for ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)}% before image revealed`}
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-walnut shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        style={{ left: `${position}%` }}
      >
        <MoveHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </div>
    </div>
  );
}

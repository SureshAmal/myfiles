"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  id: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  id,
}: StepperProps) {
  const decrement = () => {
    const next = Math.max(min, value - step);
    onChange(next);
  };

  const increment = () => {
    const next = Math.min(max, value + step);
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      increment();
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      decrement();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {label}
        </label>
      )}
      <div className="flex items-center gap-0 rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          aria-label="Decrease value"
          className="flex items-center justify-center w-10 h-10 bg-muted text-foreground
                     hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed
                     focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]
                     transition-colors"
        >
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          role="spinbutton"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n) && n >= min && n <= max) onChange(n);
          }}
          onKeyDown={handleKeyDown}
          className="w-16 h-10 text-center bg-background text-foreground border-x border-border
                     focus-visible:outline-2 focus-visible:outline-ring
                     text-sm font-medium"
        />
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          aria-label="Increase value"
          className="flex items-center justify-center w-10 h-10 bg-muted text-foreground
                     hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed
                     focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]
                     transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ─── Slider ──────────────────────────────────────────────── */

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  id: string;
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  id,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pct = ((value - min) / (max - min)) * 100;

  const setFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(Math.max(min, Math.min(max, snapped)));
    },
    [min, max, step, onChange]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => setFromPointer(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, setFromPointer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let next = value;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(max, value + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(min, value - step);
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    else return;
    e.preventDefault();
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {label}
        </label>
      )}
      <div
        ref={trackRef}
        id={id}
        role="slider"
        tabIndex={0}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => {
          setDragging(true);
          setFromPointer(e.clientX);
        }}
        className="relative h-6 flex items-center cursor-pointer
                   focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2
                   rounded-full select-none touch-none"
      >
        {/* Track */}
        <div className="absolute inset-x-0 h-1.5 bg-muted rounded-full" />
        {/* Fill */}
        <div
          className="absolute left-0 h-1.5 bg-primary rounded-full"
          style={{ width: `${pct}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute w-4 h-4 bg-primary rounded-full border-2 border-background shadow-sm
                     -translate-x-1/2"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Toggle ──────────────────────────────────────────────── */

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, id, disabled = false }: ToggleProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled) onChange(!checked);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center
                    rounded-full border-2 border-transparent transition-colors
                    focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm
                      transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
      {label && (
        <label htmlFor={id} className="text-sm text-foreground cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
}

/* ─── SelectMenu ──────────────────────────────────────────── */

interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id: string;
}

export function SelectMenu({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label,
  id,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll focused option into view
  useEffect(() => {
    if (open && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[role='option']");
      items[focusedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, open]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setFocusedIndex(options.findIndex((o) => o.value === value));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0) {
        onChange(options[focusedIndex].value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKeyDown}
        className="flex items-center justify-between w-full h-10 px-3
                   bg-muted text-foreground text-sm rounded-md border border-border
                   hover:bg-accent
                   focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]
                   transition-colors cursor-pointer"
      >
        <span className="truncate">{selectedLabel}</span>
        <span
          className={`ml-2 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ›
        </span>
      </button>

      {open && (
        <ul
          ref={(el) => {
            (listRef as React.MutableRefObject<HTMLUListElement | null>).current = el;
            el?.focus();
          }}
          id={`${id}-listbox`}
          role="listbox"
          aria-activedescendant={focusedIndex >= 0 ? `${id}-option-${focusedIndex}` : undefined}
          onKeyDown={handleListKeyDown}
          tabIndex={-1}
          className="absolute top-full left-0 right-0 mt-1 z-50
                     bg-background border border-border rounded-md shadow-lg
                     max-h-48 overflow-auto py-1
                     focus-visible:outline-none"
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`${id}-option-${i}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              onMouseEnter={() => setFocusedIndex(i)}
              className={`px-3 py-2 text-sm cursor-pointer select-none
                          ${i === focusedIndex ? "bg-accent text-accent-foreground" : "text-foreground"}
                          ${opt.value === value ? "font-medium" : ""}
                          hover:bg-accent hover:text-accent-foreground`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

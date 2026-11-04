import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type InfoTipProps = {
  label: string;
  children: ReactNode;
};

// A tap-to-open "i". Phones have no hover, so a title attribute never shows: the panel opens on tap
// across the screen width, and closes on a second tap, a tap outside, Escape or scrolling.
export function InfoTip({ label, children }: InfoTipProps) {
  const [top, setTop] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const open = top !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = () => setTop(null);
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        close();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, { capture: true });
    };
  }, [open]);

  const toggle = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    setTop(open || !rect ? null : rect.bottom + 4);
  };

  return (
    <span className="info-tip">
      <button
        ref={buttonRef}
        type="button"
        className={`info-tip__button${open ? " is-open" : ""}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
      >
        <span aria-hidden="true">i</span>
      </button>
      {open && (
        <div ref={panelRef} id={panelId} role="note" className="info-tip__panel" style={{ top }}>
          {children}
        </div>
      )}
    </span>
  );
}

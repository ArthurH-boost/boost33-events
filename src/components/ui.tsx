import type { CSSProperties, ReactNode } from "react";
import type { EventKind } from "@/lib/config";

/*
 * The Hub's vocabulary (boost33-hub/src/app/hub-view.tsx): eyebrow, cards,
 * rows, pills, buttons. Same sizes and tokens. Tailwind only for wrapping.
 */

export const EYEBROW: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.09em", lineHeight: "14px", textTransform: "uppercase", color: "var(--color-foreground)" };
export const META: CSSProperties = { fontSize: 12, lineHeight: "16px", color: "var(--color-foreground-muted)" };
export const ROW_TITLE: CSSProperties = { fontSize: 14, fontWeight: 600, lineHeight: "18px", color: "var(--color-foreground)" };

export const BTN_PRIMARY: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 40, padding: "0 16px", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "var(--color-primary-foreground)", fontSize: 14, fontWeight: 600, textDecoration: "none", cursor: "pointer", font: "inherit" };
export const BTN_SECONDARY: CSSProperties = { ...BTN_PRIMARY, background: "var(--color-surface)", color: "var(--color-foreground)", border: "1px solid var(--color-border-strong)" };
export const BTN_SMALL: CSSProperties = { ...BTN_SECONDARY, height: 32, padding: "0 12px", fontSize: 13 };
export const INPUT: CSSProperties = { font: "inherit", fontSize: 15, height: 40, padding: "0 12px", borderRadius: 8, border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-foreground)", width: "100%", boxSizing: "border-box" };
export const LABEL: CSSProperties = { fontSize: 13, fontWeight: 600 };
export const HELP: CSSProperties = { fontSize: 13, color: "var(--color-foreground-muted)" };

export const CARD: CSSProperties = { background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)" };
/** The page's main card: shadow, no border (OPPORTUNITIES_FRAME). */
export const MAIN_CARD: CSSProperties = { background: "var(--color-surface)", borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 24px 48px -20px rgba(0,0,0,0.18)", position: "relative" };

export function Eyebrow({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingBottom: 16 }}>
      <div style={EYEBROW}>{children}</div>
      {right && <div style={{ fontSize: 13, color: "var(--color-foreground-muted)" }}>{right}</div>}
    </div>
  );
}

/** The 44px date square of a row: day on top, month below. */
export function DateSquare({ day, month, tone = "muted" }: { day: string; month: string; tone?: "muted" | "primary" }) {
  const primary = tone === "primary";
  return (
    <span aria-hidden="true" style={{ flex: "0 0 44px", height: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8, background: primary ? "var(--color-primary)" : "var(--color-neutral-100)", color: primary ? "#FFFFFF" : "var(--color-foreground)" }}>
      <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1 }}>{day}</span>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: primary ? "#FFFFFF" : "var(--color-foreground-muted)" }}>{month}</span>
    </span>
  );
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "primary" | "success" | "warning" }) {
  const tones = {
    neutral: { background: "var(--color-neutral-100)", color: "var(--color-foreground)" },
    primary: { background: "var(--color-primary-subtle)", color: "var(--color-primary-hover)" },
    success: { background: "var(--color-success-subtle)", color: "var(--color-success)" },
    warning: { background: "var(--color-warning-subtle)", color: "var(--color-warning)" },
  } as const;
  return <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap", ...tones[tone] }}>{children}</span>;
}

export function Chevron() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path d="M9 6l6 6l-6 6" fill="none" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BigNumber({ value, label, note }: { value: ReactNode; label: ReactNode; note?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-outfit)", fontSize: 40, fontWeight: 600, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-foreground-muted)" }}>{label}</span>
      </div>
      {note && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-primary-hover)" }}>{note}</span>}
    </div>
  );
}

/** Two small circles: "members of your network" without photos. */
export function NetworkDots() {
  return (
    <span aria-hidden="true" style={{ display: "inline-flex" }}>
      <span style={{ width: 18, height: 18, borderRadius: 99, background: "var(--color-neutral-950)", border: "2px solid #FFFFFF" }} />
      <span style={{ width: 18, height: 18, borderRadius: 99, background: "var(--color-neutral-500)", border: "2px solid #FFFFFF", marginLeft: -7 }} />
    </span>
  );
}

export const KIND_ORDER: EventKind[] = ["networking", "startup", "conference", "trade_show", "meetup", "online"];

/** Footer: copyright and the two links everywhere else in the app assumes exist. */
export function Footer() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 32, paddingTop: 32, borderTop: "1px solid var(--color-border)" }}>
      <span style={{ fontSize: 12, color: "var(--color-foreground-disabled)" }}>© 2026 Boost33. All rights reserved.</span>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <a href="https://boost33.com/terms" style={{ fontSize: 12, color: "var(--color-foreground-disabled)", textDecoration: "none" }}>Terms</a>
        <a href="https://boost33.com/privacy" style={{ fontSize: 12, color: "var(--color-foreground-disabled)", textDecoration: "none" }}>Privacy</a>
      </div>
    </div>
  );
}

/** The content well: 48/76 on desktop, 20 on a phone (Hub's `.hub-well`). */
export function Well({ children }: { children: ReactNode }) {
  return <div className="px-5 py-8 sm:px-[76px] sm:pt-12 sm:pb-16">{children}</div>;
}

/** The 70/30 row: main column + the 372px grey rail, stacking on a phone. */
export function Row({ main, rail }: { main: ReactNode; rail: ReactNode }) {
  return (
    <div className="flex flex-wrap items-stretch gap-10">
      <div style={{ flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 44 }}>{main}</div>
      <div className="w-full lg:w-[372px]" style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 16, background: "var(--color-neutral-50)", borderRadius: 12, padding: 24, boxSizing: "border-box" }}>{rail}</div>
    </div>
  );
}

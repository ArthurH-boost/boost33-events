"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { rsvpAction } from "@/app/actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "./ui";

/** "I'm going" ↔ "Not going anymore". Optimistic, reverts on failure. */
export function RsvpButton({ eventId, initialGoing, initialCount }: { eventId: string; initialGoing: boolean; initialCount: number }) {
  const t = useTranslations("event");
  const [going, setGoing] = useState(initialGoing);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();

  const toggle = () =>
    start(async () => {
      const next = !going;
      setGoing(next);
      setCount((c) => c + (next ? 1 : -1));
      const r = await rsvpAction(eventId, next);
      if (!r.ok) {
        setGoing(!next);
        setCount((c) => c - (next ? 1 : -1));
      } else {
        setGoing(r.data.me_going);
        setCount(r.data.going);
      }
    });

  return (
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={going} style={{ ...(going ? BTN_SECONDARY : BTN_PRIMARY), opacity: pending ? 0.55 : 1 }} title={`${count}`}>
      {going ? (
        <>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          {t("youAreGoing")}
        </>
      ) : (
        t("going")
      )}
    </button>
  );
}

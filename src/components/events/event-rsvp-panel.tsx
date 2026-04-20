"use client";

import { Check, ChevronDown, ChevronUp, HelpCircle, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { removeEventRsvp, setEventRsvp } from "@/app/actions/rsvp";
import type { EventRsvp, RsvpStatus } from "@/lib/constants/events";
import type { TeamRole } from "@/lib/constants/roles";
import { can } from "@/lib/constants/roles";

type Props = {
  eventId:   string;
  myRsvp:    EventRsvp | null;  // current user's existing RSVP (null = not responded)
  allRsvps:  EventRsvp[];       // all RSVPs for the event (only populated for coaches)
  userRole?: TeamRole | null;
  userId?:   string | null;
};

// ── Config ────────────────────────────────────────────────────────────────────

const RSVP_CONFIG: Record<
  RsvpStatus,
  { label: string; shortLabel: string; icon: React.ReactNode; selected: string; idle: string }
> = {
  going: {
    label:      "Going",
    shortLabel: "Going",
    icon:       <ThumbsUp  className="h-4 w-4" />,
    selected:   "bg-emerald-600 text-white border-emerald-600 shadow-sm",
    idle:       "border-border bg-background text-foreground hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700",
  },
  maybe: {
    label:      "Maybe",
    shortLabel: "Maybe",
    icon:       <HelpCircle className="h-4 w-4" />,
    selected:   "bg-amber-500 text-white border-amber-500 shadow-sm",
    idle:       "border-border bg-background text-foreground hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700",
  },
  not_going: {
    label:      "Not going",
    shortLabel: "Out",
    icon:       <ThumbsDown className="h-4 w-4" />,
    selected:   "bg-red-500 text-white border-red-500 shadow-sm",
    idle:       "border-border bg-background text-foreground hover:border-red-400 hover:bg-red-50 hover:text-red-600",
  },
};

const RSVP_ORDER: RsvpStatus[] = ["going", "maybe", "not_going"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function countByStatus(rsvps: EventRsvp[]) {
  return {
    going:     rsvps.filter((r) => r.status === "going").length,
    maybe:     rsvps.filter((r) => r.status === "maybe").length,
    not_going: rsvps.filter((r) => r.status === "not_going").length,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EventRsvpPanel({ eventId, myRsvp, allRsvps, userRole, userId }: Props) {
  const canSeeAll = can(userRole, "event:edit") || userRole === "owner" || userRole === "manager";

  // Optimistic current-user RSVP
  const [optimisticMyRsvp, setOptimisticMyRsvp] = useOptimistic(
    myRsvp,
    (_prev, next: EventRsvp | null) => next,
  );

  // Optimistic all-rsvps list (so counts update instantly)
  const [optimisticAll, setOptimisticAll] = useOptimistic(
    allRsvps,
    (prev, { userId: uid, newRsvp }: { userId: string; newRsvp: EventRsvp | null }) => {
      const without = prev.filter((r) => r.user_id !== uid);
      return newRsvp ? [...without, newRsvp] : without;
    },
  );

  const [, startTransition] = useTransition();
  const [showResponders, setShowResponders] = useState(false);

  function handleRsvp(status: RsvpStatus) {
    if (!userId) return;

    // Clicking the active status removes the RSVP
    const isActive = optimisticMyRsvp?.status === status;

    startTransition(async () => {
      if (isActive) {
        const fake: null = null;
        setOptimisticMyRsvp(fake);
        setOptimisticAll({ userId, newRsvp: null });
        await removeEventRsvp(eventId);
      } else {
        const fake: EventRsvp = {
          id:             "optimistic",
          event_id:       eventId,
          user_id:        userId,
          status,
          responder_name: null,
          note:           null,
          created_at:     new Date().toISOString(),
          updated_at:     new Date().toISOString(),
        };
        setOptimisticMyRsvp(fake);
        setOptimisticAll({ userId, newRsvp: fake });
        await setEventRsvp(eventId, status);
      }
    });
  }

  const counts = countByStatus(optimisticAll);
  const totalResponded = optimisticAll.length;

  return (
    <div className="flex flex-col gap-4">
      {/* RSVP buttons */}
      {userId ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">
            {optimisticMyRsvp ? "Your response:" : "Are you going?"}
          </p>
          <div className="flex flex-wrap gap-2">
            {RSVP_ORDER.map((status) => {
              const cfg      = RSVP_CONFIG[status];
              const isActive = optimisticMyRsvp?.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleRsvp(status)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${isActive ? cfg.selected : cfg.idle}`}
                >
                  {cfg.icon}
                  {cfg.label}
                  {isActive && <Check className="h-3.5 w-3.5 opacity-80" />}
                </button>
              );
            })}
            {optimisticMyRsvp && (
              <button
                type="button"
                onClick={() => {
                  if (!userId) return;
                  startTransition(async () => {
                    setOptimisticMyRsvp(null);
                    setOptimisticAll({ userId, newRsvp: null });
                    await removeEventRsvp(eventId);
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
          {optimisticMyRsvp && (
            <p className="text-xs text-muted-foreground">
              You responded <strong>{RSVP_CONFIG[optimisticMyRsvp.status].label}</strong>.
              {" "}Click your response again or &ldquo;Clear&rdquo; to change it.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to RSVP to this event.</p>
      )}

      {/* Response summary — visible to everyone once anyone has responded */}
      {totalResponded > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Responses ({totalResponded})
            </span>
            {counts.going > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <ThumbsUp className="h-3 w-3" />
                {counts.going} going
              </span>
            )}
            {counts.maybe > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <HelpCircle className="h-3 w-3" />
                {counts.maybe} maybe
              </span>
            )}
            {counts.not_going > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
                <ThumbsDown className="h-3 w-3" />
                {counts.not_going} not going
              </span>
            )}

            {/* Coaches can expand the responder list */}
            {canSeeAll && totalResponded > 0 && (
              <button
                type="button"
                onClick={() => setShowResponders((v) => !v)}
                className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showResponders ? (
                  <><ChevronUp className="h-3.5 w-3.5" /> Hide names</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5" /> See who</>
                )}
              </button>
            )}
          </div>

          {/* Expanded responder list (coaches only) */}
          {canSeeAll && showResponders && (
            <div className="mt-1 flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
              {RSVP_ORDER.map((status) => {
                const group = optimisticAll.filter((r) => r.status === status);
                if (group.length === 0) return null;
                const cfg = RSVP_CONFIG[status];
                return (
                  <div key={status} className="px-3 py-2">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      {cfg.icon}
                      {cfg.label} ({group.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                          {r.responder_name ?? r.user_id.slice(0, 8)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

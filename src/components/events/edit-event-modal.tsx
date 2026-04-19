"use client";

import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateEvent } from "@/app/actions/events";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent,
  DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EventFormFields } from "@/components/events/event-form-fields";
import type { TeamEvent, EventType } from "@/lib/constants/events";
import { EVENT_TYPE_META } from "@/lib/constants/events";
import type { GameLineup, Roster, Team } from "@/lib/constants/teams";

type Scope = "this" | "all";

type Props = {
  event:         TeamEvent;
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  teams:         Team[];
  rosters:       Roster[];
  lineups:       GameLineup[];
};

export function EditEventModal({ event, open, onOpenChange, teams, rosters, lineups }: Props) {
  const router = useRouter();
  const isRecurring = Boolean(event.recurrence_group_id);

  // "scope" step shown only for recurring events
  const [step, setStep]           = useState<"scope" | "form">(isRecurring ? "scope" : "form");
  const [scope, setScope]         = useState<Scope>("this");
  const [type,       setType]     = useState<EventType>(event.type);
  const [title,      setTitle]    = useState(event.title);
  const [opponent,   setOpponent] = useState(event.opponent  ?? "");
  const [eventDate,  setEventDate]= useState(event.event_date);
  const [startTime,  setStartTime]= useState(event.start_time ?? "");
  const [endTime,    setEndTime]  = useState(event.end_time   ?? "");
  const [location,   setLocation] = useState(event.location  ?? "");
  const [notes,      setNotes]    = useState(event.notes      ?? "");
  const [isHome,     setIsHome]   = useState(event.is_home);
  const [teamId,     setTeamId]   = useState(event.team_id   ?? "");
  const [rosterId,   setRosterId] = useState(event.roster_id ?? "");
  const [lineupId,   setLineupId] = useState(event.lineup_id ?? "");
  const [done,       setDone]     = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setStep(isRecurring ? "scope" : "form");
    setScope("this");
    setType(event.type);
    setTitle(event.title);
    setOpponent(event.opponent  ?? "");
    setEventDate(event.event_date);
    setStartTime(event.start_time ?? "");
    setEndTime(event.end_time   ?? "");
    setLocation(event.location  ?? "");
    setNotes(event.notes        ?? "");
    setIsHome(event.is_home);
    setTeamId(event.team_id     ?? "");
    setRosterId(event.roster_id ?? "");
    setLineupId(event.lineup_id ?? "");
    setDone(false);
    setSubmitError(null);
  }, [open, event, isRecurring]);

  function generateTitle() {
    const meta = EVENT_TYPE_META[type];
    const label = meta?.label ?? type;
    if ((type === "game" || type === "scrimmage") && opponent.trim()) {
      return `${label} vs. ${opponent.trim()}`;
    }
    if (eventDate) {
      const d = new Date(eventDate + "T00:00:00");
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `${label} – ${dateStr}`;
    }
    return label;
  }

  function handleSubmit() {
    if (!eventDate) {
      setSubmitError("Date is required.");
      return;
    }

    startTransition(async () => {
      setSubmitError(null);
      const res = await updateEvent(
        {
          id:                  event.id,
          recurrence_group_id: event.recurrence_group_id,
          team_id:    teamId   || null,
          roster_id:  rosterId || null,
          lineup_id:  lineupId || null,
          type,
          title:      title.trim() || generateTitle(),
          opponent:   opponent  || null,
          event_date: eventDate,
          start_time: startTime || null,
          end_time:   endTime   || null,
          location:   location  || null,
          notes:      notes     || null,
          is_home:    isHome,
        },
        scope,
      );

      if (res.error || !res.data) {
        setSubmitError(res.error ?? "Failed to update event.");
        return;
      }

      setDone(true);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>Update the details for this event.</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-semibold">
                {scope === "all" ? "All events in the series updated!" : "Event updated!"}
              </p>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>

          ) : step === "scope" ? (
            /* ── Scope selector for recurring events ─────────────────── */
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                This is a recurring event. Which events do you want to edit?
              </div>

              <div className="flex flex-col gap-2">
                {(["this", "all"] as Scope[]).map((s) => (
                  <label
                    key={s}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      scope === s
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-scope"
                      value={s}
                      checked={scope === s}
                      onChange={() => setScope(s)}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {s === "this" ? "Just this event" : "All events in this series"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s === "this"
                          ? "Only this occurrence will be changed."
                          : "Every event in the series will be updated (dates stay the same)."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={() => setStep("form")}>Continue</Button>
              </div>
            </div>

          ) : (
            /* ── Edit form ────────────────────────────────────────────── */
            <div className="flex flex-col gap-5">
              {isRecurring && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3 shrink-0" />
                  Editing {scope === "all" ? "all events in this series" : "just this occurrence"}.
                  <button
                    type="button"
                    className="ml-auto text-xs underline hover:no-underline"
                    onClick={() => setStep("scope")}
                  >
                    Change
                  </button>
                </div>
              )}

              <EventFormFields
                type={type}       onType={setType}
                title={title}     onTitle={setTitle}
                opponent={opponent}   onOpponent={setOpponent}
                eventDate={eventDate} onEventDate={setEventDate}
                startTime={startTime} onStartTime={setStartTime}
                endTime={endTime}     onEndTime={setEndTime}
                location={location}   onLocation={setLocation}
                notes={notes}         onNotes={setNotes}
                isHome={isHome}       onIsHome={setIsHome}
                teamId={teamId}       onTeamId={setTeamId}
                rosterId={rosterId}   onRosterId={setRosterId}
                lineupId={lineupId}   onLineupId={setLineupId}
                recurrenceType={null}
                recurrenceEndDate=""
                onRecurrenceType={() => {}}
                onRecurrenceEndDate={() => {}}
                showRecurrence={false}
                teams={teams}
                rosters={rosters}
                lineups={lineups}
              />

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

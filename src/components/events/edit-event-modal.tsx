"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
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
import type { Roster, Team } from "@/lib/constants/teams";

type Props = {
  event:         TeamEvent;
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  teams:         Team[];
  rosters:       Roster[];
};

export function EditEventModal({ event, open, onOpenChange, teams, rosters }: Props) {
  const router = useRouter();

  const [type,       setType]       = useState<EventType>(event.type);
  const [title,      setTitle]      = useState(event.title);
  const [opponent,   setOpponent]   = useState(event.opponent  ?? "");
  const [eventDate,  setEventDate]  = useState(event.event_date);
  const [startTime,  setStartTime]  = useState(event.start_time ?? "");
  const [endTime,    setEndTime]    = useState(event.end_time   ?? "");
  const [location,   setLocation]   = useState(event.location  ?? "");
  const [notes,      setNotes]      = useState(event.notes      ?? "");
  const [isHome,     setIsHome]     = useState(event.is_home);
  const [teamId,     setTeamId]     = useState(event.team_id   ?? "");
  const [rosterId,   setRosterId]   = useState(event.roster_id ?? "");
  const [done,       setDone]       = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  // Re-sync form when event prop changes (e.g. modal reopened for different event)
  useEffect(() => {
    if (!open) return;
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
    setDone(false);
    setSubmitError(null);
  }, [open, event]);

  function handleOpenChange(v: boolean) {
    onOpenChange(v);
  }

  function handleSubmit() {
    if (!title.trim() || !eventDate) {
      setSubmitError("Title and date are required.");
      return;
    }

    startTransition(async () => {
      setSubmitError(null);
      const res = await updateEvent({
        id:         event.id,
        team_id:    teamId   || null,
        roster_id:  rosterId || null,
        type,
        title,
        opponent:   opponent  || null,
        event_date: eventDate,
        start_time: startTime || null,
        end_time:   endTime   || null,
        location:   location  || null,
        notes:      notes     || null,
        is_home:    isHome,
      });

      if (res.error || !res.data) {
        setSubmitError(res.error ?? "Failed to update event.");
        return;
      }

      setDone(true);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>Update the details for this event.</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-semibold">Event updated!</p>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
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
                teams={teams}
                rosters={rosters}
              />

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
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

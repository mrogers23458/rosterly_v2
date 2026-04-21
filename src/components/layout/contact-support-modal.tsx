"use client";

import {
  ArrowLeft,
  Bug,
  Lightbulb,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SupportCategory = "feature_request" | "bug" | "feedback" | "other";

const CATEGORIES: {
  id: SupportCategory;
  icon: React.ReactNode;
  label: string;
  description: string;
  accent?: boolean;
}[] = [
  {
    id:          "feature_request",
    icon:        <Lightbulb className="h-5 w-5" />,
    label:       "Feature request",
    description: "Suggest something new that would help your team.",
  },
  {
    id:          "bug",
    icon:        <Bug className="h-5 w-5" />,
    label:       "Report a bug",
    description: "Something broke or doesn’t work the way you expect.",
    accent:      true,
  },
  {
    id:          "feedback",
    icon:        <MessageSquare className="h-5 w-5" />,
    label:       "Leave feedback",
    description: "Tell us what’s working well or what could be better.",
  },
  {
    id:          "other",
    icon:        <HelpCircle className="h-5 w-5" />,
    label:       "Other",
    description: "Anything else we should know.",
  },
];

function CategoryPicker({
  onPick,
}: {
  onPick: (c: SupportCategory) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          className={cn(
            "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
            c.accent
              ? "border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10"
              : "border-border bg-card",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              c.accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {c.icon}
          </div>
          <div>
            <p className={cn("text-sm font-semibold", c.accent && "text-primary")}>{c.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{c.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ContactSupportModal({ open, onOpenChange }: Props) {
  const [view, setView] = useState<"pick" | "form">("pick");
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setView("pick");
    setCategory(null);
    setMessage("");
    setFile(null);
    setError(null);
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function handlePick(c: SupportCategory) {
    setCategory(c);
    setView("form");
    setError(null);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;
    setError(null);
    setSending(true);
    try {
      const form = new FormData();
      form.set("category", category);
      form.set("message", message.trim());
      if (category === "bug" && file) form.set("attachment", file);

      const res = await fetch("/api/support", {
        method: "POST",
        body:   form,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      handleOpenChange(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const isBug = category === "bug";
  const categoryLabel = category
    ? CATEGORIES.find((c) => c.id === category)?.label ?? "Support"
    : "Support";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          {view === "pick" ? (
            <>
              <DialogTitle>Contact support</DialogTitle>
              <DialogDescription>
                What would you like to reach out about?
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>{categoryLabel}</DialogTitle>
              <DialogDescription>
                We&apos;ll email this to our team along with your account details.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        <DialogBody>
          {view === "pick" && <CategoryPicker onPick={handlePick} />}

          {view === "form" && category && (
            <form onSubmit={handleSend} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  setView("pick");
                  setCategory(null);
                  setMessage("");
                  setFile(null);
                  setError(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mb-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Choose a different topic
              </button>

              <div className="flex flex-col gap-2">
                <Label htmlFor="support-message">Message</Label>
                <Textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened, what you expected, and steps to reproduce if it’s a bug."
                  rows={6}
                  required
                  disabled={sending}
                  className="resize-y min-h-[120px]"
                />
              </div>

              {isBug && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="support-attachment">Attachment (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Screenshot, export, or log file — up to 5 MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    id="support-attachment"
                    type="file"
                    disabled={sending}
                    className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFile(f);
                    }}
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={sending}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sending || !message.trim()}>
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
            </form>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

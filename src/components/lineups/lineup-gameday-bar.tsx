"use client";

import { Check, Copy, ExternalLink, Link2, Link2Off, Printer, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateShareToken, revokeShareToken } from "@/app/actions/lineups";
import { Button } from "@/components/ui/button";
import type { TeamRole } from "@/lib/constants/roles";
import { can } from "@/lib/constants/roles";

type Props = {
  lineupId:   string;
  shareToken: string | null;
  userRole?:  TeamRole | null;
};

export function LineupGamedayBar({ lineupId, shareToken, userRole }: Props) {
  const router  = useRouter();
  const canEdit = can(userRole, "lineup:edit");

  const [token,      setToken]      = useState<string | null>(shareToken);
  const [copied,     setCopied]     = useState(false);
  const [showShare,  setShowShare]  = useState(false);
  const [isPending,  startTransition] = useTransition();

  const shareUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/lineup/${token}`
    : null;

  function handlePrint() {
    window.open(`/lineups/${lineupId}/print`, "_blank");
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleGenerateLink() {
    startTransition(async () => {
      const res = await generateShareToken(lineupId);
      if (res.token) {
        setToken(res.token);
        setShowShare(true);
        router.refresh();
      }
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      await revokeShareToken(lineupId);
      setToken(null);
      setShowShare(false);
      router.refresh();
    });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
      {/* Print button — always visible */}
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
        <Printer className="h-3.5 w-3.5" />
        Print card
      </Button>

      {/* Share controls */}
      {canEdit && (
        <>
          {!token ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateLink}
              disabled={isPending}
              className="gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share lineup
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShare((v) => !v)}
                className="gap-1.5 text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
              >
                <Link2 className="h-3.5 w-3.5" />
                Shared link
              </Button>
              {showShare && (
                <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                    {shareUrl}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      {copied ? (
                        <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> Copy</>
                      )}
                    </Button>
                    <a
                      href={shareUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRevoke}
                      disabled={isPending}
                      className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Link2Off className="h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Print-only info tag */}
      {!canEdit && (
        <span className="text-xs text-muted-foreground">
          Print this lineup card for gameday.
        </span>
      )}
    </div>
  );
}

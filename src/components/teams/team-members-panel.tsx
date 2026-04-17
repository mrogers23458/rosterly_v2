"use client";

import { useState, useTransition } from "react";
import { Users, UserPlus, Trash2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TEAM_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type TeamRole,
} from "@/lib/constants/roles";
import {
  addTeamMember,
  updateMemberRole,
  removeTeamMember,
  cancelPendingInvitation,
} from "@/app/actions/members";
import type { TeamMemberWithEmail, PendingInvitation } from "@/app/actions/members";

const INVITABLE_ROLES = TEAM_ROLES.filter((r) => r !== "owner");

interface Props {
  teamId:             string;
  members:            TeamMemberWithEmail[];
  pendingInvitations: PendingInvitation[];
  currentRole:        TeamRole;
}

export function TeamMembersPanel({
  teamId,
  members: initialMembers,
  pendingInvitations: initialPending,
  currentRole,
}: Props) {
  const [members, setMembers]         = useState(initialMembers);
  const [pending, setPending]         = useState(initialPending);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState<TeamRole>("viewer");
  const [inviteMsg, setInviteMsg]     = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [isPending, startTransition]  = useTransition();

  const [removeTarget, setRemoveTarget] = useState<TeamMemberWithEmail | null>(null);
  const [removeError, setRemoveError]   = useState("");

  const canManage = currentRole === "owner" || currentRole === "manager";
  const isOwner   = currentRole === "owner";

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteMsg(null);

    startTransition(async () => {
      const res = await addTeamMember(teamId, inviteEmail.trim(), inviteRole);
      if (res.error) {
        setInviteMsg({ text: res.error, type: "error" });
      } else if (res.invited) {
        setInviteMsg({
          text: `Invitation sent to ${inviteEmail.trim()}. They'll receive an email to join.`,
          type: "success",
        });
        setInviteEmail("");
      } else {
        setInviteMsg({ text: "Member added successfully.", type: "success" });
        setInviteEmail("");
      }
    });
  }

  function handleRoleChange(member: TeamMemberWithEmail, newRole: TeamRole) {
    startTransition(async () => {
      const res = await updateMemberRole(teamId, member.id, newRole);
      if (!res.error) {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)),
        );
      }
    });
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    setRemoveError("");
    startTransition(async () => {
      const res = await removeTeamMember(teamId, removeTarget.id);
      if (res.error) {
        setRemoveError(res.error);
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
        setRemoveTarget(null);
      }
    });
  }

  function handleCancelInvite(invitationId: string) {
    startTransition(async () => {
      const res = await cancelPendingInvitation(teamId, invitationId);
      if (!res.error) {
        setPending((prev) => prev.filter((i) => i.id !== invitationId));
      }
    });
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Team Members</h2>
        <Badge variant="muted" className="ml-1">{members.length}</Badge>
      </div>

      {/* Active members list */}
      <div className="mb-4 divide-y divide-border rounded-lg border border-border">
        {members.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted-foreground">No members yet.</p>
        )}
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {member.email || `${member.user_id.slice(0, 8)}…`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isOwner && member.role !== "owner" ? (
                <Select
                  className="h-7 w-36 py-0 text-xs"
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value as TeamRole)}
                  disabled={isPending}
                >
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </Select>
              ) : (
                <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                  {ROLE_LABELS[member.role as TeamRole]}
                </Badge>
              )}

              {canManage && member.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setRemoveTarget(member)}
                  aria-label="Remove member"
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending invitations */}
      {canManage && pending.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pending invitations
          </p>
          <div className="divide-y divide-border rounded-lg border border-border border-dashed">
            {pending.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  <p className="truncate text-sm text-muted-foreground">{inv.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {ROLE_LABELS[inv.role]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-destructive"
                    onClick={() => handleCancelInvite(inv.id)}
                    disabled={isPending}
                    aria-label="Cancel invitation"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Invite by email
            </label>
            <Input
              type="email"
              placeholder="coach@example.com"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteMsg(null); }}
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Role
            </label>
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamRole)}
              className="h-9 text-sm"
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r} title={ROLE_DESCRIPTIONS[r]}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isPending || !inviteEmail.trim()}
            className="h-9 shrink-0 gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {isPending ? "Sending…" : "Invite"}
          </Button>
        </form>
      )}

      {inviteMsg && (
        <p className={`mt-2 text-sm ${inviteMsg.type === "error" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
          {inviteMsg.text}
        </p>
      )}

      {/* Remove confirm dialog */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRemoveTarget(null);
            setRemoveError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="font-medium">
                {removeTarget?.email || removeTarget?.user_id.slice(0, 8)}
              </span>{" "}
              from this team? They will lose all access immediately.
            </DialogDescription>
          </DialogHeader>

          {removeError && (
            <p className="text-sm text-destructive">{removeError}</p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveConfirm}
              disabled={isPending}
            >
              {isPending ? "Removing…" : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

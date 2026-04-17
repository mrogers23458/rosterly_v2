// ─── Role definitions ─────────────────────────────────────────────────────────

export const TEAM_ROLES = ["owner", "manager", "assistant_coach", "viewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

/** Numeric rank — higher means more permissions. */
export const ROLE_RANK: Record<TeamRole, number> = {
  owner:           4,
  manager:         3,
  assistant_coach: 2,
  viewer:          1,
};

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner:           "Owner",
  manager:         "Manager",
  assistant_coach: "Assistant Coach",
  viewer:          "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner:
    "Full control — edit team settings, manage members, archive/delete the team.",
  manager:
    "Run day-to-day operations: manage rosters, players, events, and lineups. Cannot archive or delete the team.",
  assistant_coach:
    "Help with game-day tasks: create and manage events and lineups. Read-only access to rosters and players.",
  viewer:
    "Read-only. Can see all team data but cannot make any changes.",
};

// ─── Permission keys ──────────────────────────────────────────────────────────

export type Permission =
  // Team management
  | "team:view"
  | "team:edit"
  | "team:archive"
  | "team:delete"
  | "team:manage_members"
  // Rosters
  | "roster:view"
  | "roster:create"
  | "roster:edit"
  | "roster:archive"
  | "roster:delete"
  // Players
  | "player:view"
  | "player:create"
  | "player:edit"
  | "player:delete"
  // Events
  | "event:view"
  | "event:create"
  | "event:edit"
  | "event:archive"
  | "event:delete"
  // Lineups
  | "lineup:view"
  | "lineup:create"
  | "lineup:edit"
  | "lineup:archive"
  | "lineup:delete"
  // Imports
  | "import:use";

// ─── Permission matrix ────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<TeamRole, ReadonlySet<Permission>> = {
  owner: new Set<Permission>([
    "team:view", "team:edit", "team:archive", "team:delete", "team:manage_members",
    "roster:view", "roster:create", "roster:edit", "roster:archive", "roster:delete",
    "player:view", "player:create", "player:edit", "player:delete",
    "event:view", "event:create", "event:edit", "event:archive", "event:delete",
    "lineup:view", "lineup:create", "lineup:edit", "lineup:archive", "lineup:delete",
    "import:use",
  ]),

  manager: new Set<Permission>([
    "team:view", "team:edit", "team:manage_members",
    "roster:view", "roster:create", "roster:edit", "roster:archive", "roster:delete",
    "player:view", "player:create", "player:edit", "player:delete",
    "event:view", "event:create", "event:edit", "event:archive", "event:delete",
    "lineup:view", "lineup:create", "lineup:edit", "lineup:archive", "lineup:delete",
    "import:use",
  ]),

  assistant_coach: new Set<Permission>([
    "team:view",
    "roster:view",
    "player:view",
    "event:view", "event:create", "event:edit", "event:archive", "event:delete",
    "lineup:view", "lineup:create", "lineup:edit", "lineup:archive", "lineup:delete",
  ]),

  viewer: new Set<Permission>([
    "team:view",
    "roster:view",
    "player:view",
    "event:view",
    "lineup:view",
  ]),
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Returns true if the given role has the requested permission. */
export function can(
  role: TeamRole | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

/** Returns true if role meets or exceeds the minimum required role. */
export function hasRole(
  role: TeamRole | null | undefined,
  minimum: TeamRole,
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

// ─── TeamMember type ──────────────────────────────────────────────────────────

export type TeamMember = {
  id:         string;
  team_id:    string;
  user_id:    string;
  role:       TeamRole;
  invited_by: string | null;
  created_at: string;
  /** Joined from auth.users via DB view or RPC — may be undefined */
  email?:     string;
};

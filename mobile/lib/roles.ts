export const TEAM_ROLES = ["owner", "manager", "assistant_coach", "viewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const ROLE_RANK: Record<TeamRole, number> = {
  owner: 4, manager: 3, assistant_coach: 2, viewer: 1,
};

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner", manager: "Manager", assistant_coach: "Assistant Coach", viewer: "Viewer",
};

export type Permission =
  | "team:view" | "team:edit" | "team:archive" | "team:delete" | "team:manage_members"
  | "roster:view" | "roster:create" | "roster:edit" | "roster:archive" | "roster:delete"
  | "player:view" | "player:create" | "player:edit" | "player:delete"
  | "event:view" | "event:create" | "event:edit" | "event:archive" | "event:delete"
  | "lineup:view" | "lineup:create" | "lineup:edit" | "lineup:archive" | "lineup:delete"
  | "import:use";

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
    "team:view", "roster:view", "player:view",
    "event:view", "event:create", "event:edit", "event:archive", "event:delete",
    "lineup:view", "lineup:create", "lineup:edit", "lineup:archive", "lineup:delete",
  ]),
  viewer: new Set<Permission>([
    "team:view", "roster:view", "player:view", "event:view", "lineup:view",
  ]),
};

export function can(role: TeamRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

export async function fetchTeamRolesMap(
  client: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
): Promise<Record<string, TeamRole>> {
  const { data } = await client
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId);
  const map: Record<string, TeamRole> = {};
  for (const row of data ?? []) map[row.team_id as string] = row.role as TeamRole;
  return map;
}

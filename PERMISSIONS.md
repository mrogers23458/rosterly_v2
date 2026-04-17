# Rosterly — Team Role Permissions

## Overview

Rosterly uses a simple, fixed-preset role system scoped to each team. There is no global admin role — access is always relative to a specific team.

## Roles

| Role | Description |
|---|---|
| **Owner** | Full control. Created automatically when a team is created. Can archive/delete the team and transfer ownership. |
| **Manager** | Day-to-day operations. Can manage rosters, players, events, and lineups. Cannot archive/delete the team or change ownership. |
| **Assistant Coach** | Game-day focus. Can create and manage events and lineups. Read-only access to rosters and players. |
| **Viewer** | Read-only. Can see all team data but cannot make any changes. |

## Permission Matrix

| Area | Action | Owner | Manager | Asst Coach | Viewer |
|---|---|:---:|:---:|:---:|:---:|
| **Team** | View | ✓ | ✓ | ✓ | ✓ |
| | Edit settings | ✓ | ✓ | — | — |
| | Archive / Unarchive | ✓ | — | — | — |
| | Delete | ✓ | — | — | — |
| | Manage members | ✓ | ✓ | — | — |
| **Roster** | View | ✓ | ✓ | ✓ | ✓ |
| | Create | ✓ | ✓ | — | — |
| | Edit | ✓ | ✓ | — | — |
| | Archive | ✓ | ✓ | — | — |
| | Delete | ✓ | ✓ | — | — |
| **Players** | View | ✓ | ✓ | ✓ | ✓ |
| | Create / Edit | ✓ | ✓ | — | — |
| | Toggle active | ✓ | ✓ | — | — |
| | Delete | ✓ | ✓ | — | — |
| **Events** | View | ✓ | ✓ | ✓ | ✓ |
| | Create | ✓ | ✓ | ✓ | — |
| | Edit | ✓ | ✓ | ✓ | — |
| | Archive | ✓ | ✓ | ✓ | — |
| | Delete | ✓ | ✓ | ✓ | — |
| **Lineups** | View | ✓ | ✓ | ✓ | ✓ |
| | Create | ✓ | ✓ | ✓ | — |
| | Edit | ✓ | ✓ | ✓ | — |
| | Archive | ✓ | ✓ | ✓ | — |
| | Delete | ✓ | ✓ | ✓ | — |
| **Imports** | Use (AI / GC / Sheets) | ✓ | ✓ | — | — |

## Implementation layers

### 1. Database (Supabase RLS)
All enforcement is duplicated at the Postgres level via Row-Level Security policies. Even if application code is bypassed, the database will reject unauthorized operations.

- `SELECT` policies allow any team member to read team-owned rows.
- `INSERT/UPDATE/DELETE` policies check the minimum required role using the `has_team_role(team_id, min_role)` helper function.
- The `is_team_member_of(team_id)` function is used for read checks to avoid RLS recursion.

### 2. Application (Server Actions)
Server actions add explicit, user-friendly role checks before issuing DB queries. This produces clear error messages rather than silent DB rejections.

Key guards:
- `setTeamArchived` / `deleteTeam` → `role === 'owner'`
- `updateTeam` → `role in ['owner', 'manager']`
- Members CRUD in `src/app/actions/members.ts`

### 3. UI (Client components)
The current user's role is fetched on the team detail server page and passed down to:
- The team header (role badge)
- `TeamMembersPanel` (shows/hides management controls)

Future work: pass `userRole` to card action components to hide buttons the user cannot use.

## Data model

```
team_members
  id          uuid PK
  team_id     uuid FK → teams.id  (CASCADE DELETE)
  user_id     uuid FK → auth.users (CASCADE DELETE)
  role        text CHECK (owner | manager | assistant_coach | viewer)
  invited_by  uuid FK → auth.users (nullable)
  created_at  timestamptz
  UNIQUE (team_id, user_id)
```

## Invite flow (MVP)

1. Owner or Manager enters the invitee's email on the team detail page.
2. The `addTeamMember` server action calls the `get_user_id_by_email` Postgres function (SECURITY DEFINER) to look up the user.
3. If found, a `team_members` row is inserted.
4. If not found, a clear error is shown: the invitee must create a Rosterly account first.

No email notifications are sent at MVP. The invitee will see the team the next time they log in.

## Extending later

- **Email invitations**: Add an `invitations` table with a token; send via Resend or SendGrid.
- **UI button gating**: Pass `userRole` prop to card action components to hide unavailable actions.
- **Transfers**: Add a `transferOwnership(teamId, newOwnerId)` action that swaps the `owner` row and demotes the previous owner to `manager`.
- **Per-resource granularity**: The `Permission` type in `src/lib/constants/roles.ts` is already granular; expanding the matrix is a one-line change per role.

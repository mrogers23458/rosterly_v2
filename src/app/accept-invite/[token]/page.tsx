import { redirect } from "next/navigation";

/**
 * Old token-in-URL invite links redirect here.
 * We now look up invites by the signed-in user's email instead of by URL token,
 * so just forward to the main accept-invite page.
 */
type Props = { params: Promise<{ token: string }> };

export default async function OldAcceptInvitePage(_props: Props) {
  redirect("/accept-invite");
}

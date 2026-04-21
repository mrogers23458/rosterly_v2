import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { getProfile } from "@/app/actions/profile";

export const metadata = { title: "My Profile — Rosterly" };

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await getProfile();

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your personal information and contact details.
        </p>
      </div>

      <div className="max-w-xl">
        <ProfileForm
          initialProfile={{
            firstName: profile?.first_name  ?? "",
            lastName:  profile?.last_name   ?? "",
            phone:     profile?.phone        ?? "",
            address:   profile?.address      ?? "",
            avatarUrl: profile?.avatar_url   ?? null,
            email:     profile?.email        ?? user.email ?? "",
          }}
        />
      </div>
    </div>
  );
}

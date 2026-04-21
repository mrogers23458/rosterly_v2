"use client";

import { useState, useTransition } from "react";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertProfile, updateEmail } from "@/app/actions/profile";

type Props = {
  initialProfile: {
    firstName: string;
    lastName:  string;
    phone:     string;
    address:   string;
    avatarUrl: string | null;
    email:     string;
  };
};

export function ProfileForm({ initialProfile }: Props) {
  const [firstName, setFirstName] = useState(initialProfile.firstName);
  const [lastName,  setLastName]  = useState(initialProfile.lastName);
  const [phone,     setPhone]     = useState(initialProfile.phone);
  const [address,   setAddress]   = useState(initialProfile.address);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatarUrl);
  const [email,     setEmail]     = useState(initialProfile.email);

  const [profileSaved, setProfileSaved] = useState(false);
  const [emailSaved,   setEmailSaved]   = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [emailError,   setEmailError]   = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function handleSaveProfile() {
    setProfileError(null);
    setProfileSaved(false);
    startTransition(async () => {
      const { error } = await upsertProfile({
        firstName,
        lastName,
        phone,
        address,
        avatarUrl: avatarUrl ?? undefined,
      });
      if (error) {
        setProfileError(error);
      } else {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    });
  }

  function handleUpdateEmail() {
    setEmailError(null);
    setEmailSaved(false);
    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    startTransition(async () => {
      const { error } = await updateEmail(email);
      if (error) {
        setEmailError(error);
      } else {
        setEmailSaved(true);
        setTimeout(() => setEmailSaved(false), 5000);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Profile photo + name ── */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Profile photo &amp; name</h2>

        <div className="mb-5 flex items-start gap-5">
          <AvatarUpload
            currentUrl={avatarUrl}
            bucket="avatars"
            onUpload={(url) => setAvatarUrl(url)}
            size={80}
            alt="Profile photo"
          />
          <div className="flex flex-1 flex-col gap-1 pt-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Profile photo</p>
            <p>This photo may be visible to your teammates.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
        </div>
      </section>

      {/* ── Contact info ── */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Contact information</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 000-0000"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State 00000"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </section>

      {/* Save profile button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSaveProfile} disabled={isPending}>
          {isPending ? "Saving…" : "Save profile"}
        </Button>
        {profileSaved && (
          <span className="text-sm text-emerald-600">Profile saved.</span>
        )}
        {profileError && (
          <span className="text-sm text-destructive">{profileError}</span>
        )}
      </div>

      {/* ── Email ── */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold">Email address</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Changing your email will update the address used to sign in.
          A confirmation may be sent to verify the new address.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleUpdateEmail}
            disabled={isPending || email === initialProfile.email}
            className="shrink-0"
          >
            Update email
          </Button>
        </div>

        {emailSaved && (
          <p className="mt-2 text-sm text-emerald-600">
            Email updated. Check your inbox to confirm the change if required.
          </p>
        )}
        {emailError && (
          <p className="mt-2 text-sm text-destructive">{emailError}</p>
        )}
      </section>
    </div>
  );
}

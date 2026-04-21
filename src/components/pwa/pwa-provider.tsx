"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPending, setPushPending] = useState(false);
  // Always start online — navigator.onLine is unreliable on iOS Safari at mount time
  // and should never be trusted for initial render. We learn the real state reactively.
  const [offline, setOffline] = useState(false);

  async function probeConnectivity() {
    if (typeof window === "undefined") return true;
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 5000);
      // /api/ping is a minimal endpoint excluded from SW caching and middleware auth,
      // making it the most reliable target for a connectivity probe.
      const response = await fetch(`/api/ping?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      return response.ok;
    } catch {
      return false;
    }
  }

  function decodeVapidKey(base64: string) {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const normalized = (base64 + padding).replaceAll("-", "+").replaceAll("_", "/");
    const raw = atob(normalized);
    return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    let probeTimer: ReturnType<typeof setTimeout> | undefined;
    let isMounted = true;

    const onlineHandler = () => {
      if (isMounted) setOffline(false);
    };

    const offlineHandler = () => {
      // iOS Safari fires spurious offline events when switching networks or on WiFi
      // reconnects. We validate with a real fetch before marking the user offline.
      if (probeTimer) clearTimeout(probeTimer);
      probeTimer = setTimeout(async () => {
        const reachable = await probeConnectivity();
        if (isMounted) setOffline(!reachable);
      }, 1000);
    };

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
      isMounted = false;
      if (probeTimer) clearTimeout(probeTimer);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let mounted = true;
    let updateCheckInterval: ReturnType<typeof setInterval> | undefined;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (!mounted) return;

        if (registration.waiting) {
          setUpdateReady(true);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });

        updateCheckInterval = setInterval(() => {
          void registration.update();
        }, 1000 * 60 * 15);
      } catch {
        // Keep app functional even if service worker registration fails.
      }
    };

    void register();

    return () => {
      mounted = false;
      if (updateCheckInterval) clearInterval(updateCheckInterval);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const notifSupported = "Notification" in window;
    setPushSupported("serviceWorker" in navigator && "PushManager" in window && notifSupported);
    // Guard against iOS versions where Notification exists in window but permission
    // access can throw, and against environments where Notification is undefined.
    setPushEnabled(notifSupported && Notification.permission === "granted");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const applyUpdate = () => {
    // The SW calls skipWaiting() on install so it activates immediately without
    // entering the waiting state. A direct reload is all that's needed to load
    // the latest assets served by the newly-active SW.
    window.location.reload();
  };

  const installApp = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") setInstallEvent(null);
  };

  const enablePush = async () => {
    if (!pushSupported || pushPending) return;
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublic) return;
    setPushPending(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(vapidPublic),
        });
      }

      await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setPushEnabled(true);
    } finally {
      setPushPending(false);
    }
  };

  return (
    <>
      {children}
      {(offline || updateReady || installEvent) && (
        <div
          className="fixed inset-x-2 z-[120] sm:inset-x-auto sm:right-4 sm:w-[420px]"
          style={{ bottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
            {offline && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground">
                  You are offline. Some actions may be unavailable until connection returns.
                </p>
              </div>
            )}
            {updateReady && (
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">An app update is ready.</p>
                <Button size="sm" className="w-full sm:w-auto" onClick={() => void applyUpdate()}>
                  Refresh
                </Button>
              </div>
            )}
            {!offline && !updateReady && installEvent && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Install Rosterly for faster launch.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => void installApp()}
                >
                  Install
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

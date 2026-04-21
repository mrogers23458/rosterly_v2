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
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onlineHandler = () => setOffline(false);
    const offlineHandler = () => setOffline(true);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
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

    const controllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", controllerChange);

    return () => {
      mounted = false;
      if (updateCheckInterval) clearInterval(updateCheckInterval);
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChange);
    };
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

  const applyUpdate = async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) return;
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  };

  const installApp = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") setInstallEvent(null);
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

import { Suspense } from "react";
import MobileCallbackClient from "./mobile-callback-client";

export default function MobileCallbackPage() {
  return (
    <Suspense fallback={<Redirecting />}>
      <MobileCallbackClient />
    </Suspense>
  );
}

function Redirecting() {
  return (
    <div style={styles.container}>
      <div style={styles.spinner} />
      <p style={styles.text}>Signing you in…</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e3a5f",
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid rgba(255,255,255,0.2)",
    borderTop: "4px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  text: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    margin: 0,
  },
};

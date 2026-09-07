"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export async function clearPrivateNavigationCaches(
  cacheStorage: Pick<CacheStorage, "delete" | "keys"> = caches,
) {
  const keys = await cacheStorage.keys();
  await Promise.all(
    keys.filter((key) => key.startsWith("rein-private-")).map((key) => cacheStorage.delete(key)),
  );
}

export function PwaRuntime() {
  const pathname = usePathname();
  const [blockedWrite, setBlockedWrite] = useState(false);

  useEffect(() => {
    if (pathname !== "/login" && !pathname.startsWith("/auth/")) return;
    if ("caches" in window) void clearPrivateNavigationCaches().catch(() => undefined);
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
  }, [pathname]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        void Promise.all([
          navigator.serviceWorker
            .getRegistrations()
            .then((registrations) =>
              Promise.all(registrations.map((registration) => registration.unregister())),
            ),
          caches
            .keys()
            .then((keys) =>
              Promise.all(
                keys.filter((key) => key.startsWith("rein-")).map((key) => caches.delete(key)),
              ),
            ),
        ]);
      } else {
        void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      }
    }
    const blockOfflineWrite = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== "post") return;
      const isOfflineSnapshot = Boolean(
        document.querySelector('meta[name="rein-offline-snapshot"]'),
      );
      if (navigator.onLine && !isOfflineSnapshot) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setBlockedWrite(true);
    };
    window.addEventListener("submit", blockOfflineWrite, true);
    return () => window.removeEventListener("submit", blockOfflineWrite, true);
  }, []);

  return blockedWrite ? (
    <div
      className="fixed right-4 bottom-24 z-[100] max-w-sm rounded-2xl bg-[var(--ink)] p-4 text-sm font-bold text-white shadow-xl lg:bottom-6"
      role="alert"
    >
      오프라인에서는 저장하지 않았어요. 연결한 뒤 다시 시도해 주세요.
      <button
        className="ml-3 min-h-11 rounded-lg px-2 text-[var(--accent)] underline"
        onClick={() => setBlockedWrite(false)}
        type="button"
      >
        닫기
      </button>
    </div>
  ) : null;
}

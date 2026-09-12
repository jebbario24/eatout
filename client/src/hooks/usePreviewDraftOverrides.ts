import { useEffect, useMemo, useState } from "react";

export function usePreviewDraftOverrides<T extends Record<string, any>>(): Partial<T> | null {
  const isEmbedded = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);
  const isPreviewFlag = useMemo(
    () => new URLSearchParams(window.location.search).get("preview") === "1",
    []
  );
  const active = isEmbedded || isPreviewFlag;

  const [overrides, setOverrides] = useState<Partial<T> | null>(null);

  useEffect(() => {
    if (!active) return;

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "eatout:preview-update") {
        setOverrides(e.data.payload || {});
      }
    };

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "eatout:preview-ready" }, window.location.origin);

    return () => window.removeEventListener("message", onMessage);
  }, [active]);

  return active ? overrides : null;
}

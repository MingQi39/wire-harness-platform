import { useEffect, useState } from "react";

const MOBILE_MQL = "(max-width: 1023px)";

function getIsMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_MQL).matches;
}

/** 与 Tailwind `lg`（1024px）对齐，供布局与 MainLayout 共用 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MQL);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

import { useEffect, useState, useCallback } from "react";

export type Route = {
  path: string;
  segments: string[];
  query: URLSearchParams;
  hash: string;
};

function parse(): Route {
  const hash = window.location.hash.slice(1) || "/";
  const [rawPath, rawHashQuery = ""] = hash.split("?");
  const path = rawPath || "/";
  const segments = path.split("/").filter(Boolean);

  // Some mail clients/security scanners strip URL fragments when relaying or
  // pre-checking links — especially for http://localhost links they can't safely
  // fetch — which turns a hash-based deep link (.../#/verify-email?token=...) into
  // a bare real query string on the root path (.../?token=...). Fall back to the
  // real query string whenever the hash itself didn't carry one, so those links
  // still work instead of silently landing on the homepage.
  const query = new URLSearchParams(rawHashQuery || window.location.search);

  return {
    path,
    segments,
    query,
    hash,
  };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parse);

  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to.startsWith("#")) to = to.slice(1);
    if (!to.startsWith("/")) to = "/" + to;
    window.location.hash = to;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { route, navigate };
}

export function Link({
  to,
  className,
  children,
  onClick,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const href = to.startsWith("#") ? to : "#" + (to.startsWith("/") ? to : "/" + to);
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        // allow ctrl/cmd-click to open new tab
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        window.location.hash = href.slice(1);
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}
import { useEffect, useState, useCallback } from "react";

export type Route = {
  path: string;
  segments: string[];
  query: URLSearchParams;
  hash: string;
};

function parse(): Route {
  const hash = window.location.hash.slice(1) || "/";
  const [rawPath, rawQuery = ""] = hash.split("?");
  const path = rawPath || "/";
  const segments = path.split("/").filter(Boolean);
  return {
    path,
    segments,
    query: new URLSearchParams(rawQuery),
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

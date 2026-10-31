import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Wraps a layout's <Outlet />. On every route change the page "develops" in (animate-page-in)
// behind a quick projector-cut flicker, and the window scrolls back to the top.
// Keyed by pathname, so the page remounts and replays the animation. Timings live in index.css.
// Reduced motion: the global rule in index.css shortens both animations to nothing.
export default function PageTransition({ children }) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div key={pathname}>
      <div aria-hidden="true" className="projector-cut" />
      <div className="animate-page-in">{children}</div>
    </div>
  );
}

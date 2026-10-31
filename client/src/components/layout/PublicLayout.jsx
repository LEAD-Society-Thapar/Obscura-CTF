import { Outlet } from "react-router-dom";
import PageTransition from "./PageTransition.jsx";
import PublicNavbar from "./PublicNavbar.jsx";

// Shell for pages visible without a team login (/, /login, /admin/*, and /rules etc. when logged out).
export default function PublicLayout() {
  return (
    <div className="noir-backdrop flex min-h-screen flex-col">
      <PublicNavbar />
      <main id="main" className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <footer className="border-t border-line/60 py-4 text-center font-type text-xs text-muted">
        LEAD Society, TIET &middot; Filmistan Archives
      </footer>
    </div>
  );
}

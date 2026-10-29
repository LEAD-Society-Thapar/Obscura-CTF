import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

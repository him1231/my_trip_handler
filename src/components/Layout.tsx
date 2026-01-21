import { NavLink } from "react-router-dom";
import AuthButton from "./AuthButton";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr] bg-background">
      <aside className="flex flex-col gap-4 bg-slate-900 p-6 text-slate-50">
        <div>
          <h2 className="text-lg font-semibold">Wonder Log</h2>
          <p className="text-sm text-slate-300">Plan trips together in real time.</p>
        </div>
        <nav className="flex flex-col gap-3 text-sm">
          <NavLink className="hover:text-white" to="/">
            Trips
          </NavLink>
        </nav>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 border-b bg-white px-8 py-6">
          <div>
            <h1 className="text-xl font-semibold">My Trip Handler</h1>
            <p className="text-sm text-muted-foreground">Private trips with shareable invite links.</p>
          </div>
          <AuthButton />
        </header>
        <main className="flex flex-1 flex-col gap-6 px-8 py-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;

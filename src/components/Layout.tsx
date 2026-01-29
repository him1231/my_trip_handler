import { createContext, useContext, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import AuthButton from "./AuthButton";

type LayoutHeaderContextValue = {
  setHeaderContent: (content: React.ReactNode | null) => void;
};

const LayoutHeaderContext = createContext<LayoutHeaderContextValue | null>(null);

export const useLayoutHeader = () => {
  const context = useContext(LayoutHeaderContext);
  if (!context) {
    throw new Error("useLayoutHeader must be used within Layout");
  }
  return context;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [headerContent, setHeaderContent] = useState<React.ReactNode | null>(null);
  const contextValue = useMemo(() => ({ setHeaderContent }), []);

  return (
    <LayoutHeaderContext.Provider value={contextValue}>
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
          <header className="flex items-center justify-between gap-4 border-b bg-white px-8 py-4">
            <div className="flex-1">
              {headerContent ?? (
                <>
                  <h1 className="text-xl font-semibold">My Trip Handler</h1>
                  <p className="text-sm text-muted-foreground">Private trips with shareable invite links.</p>
                </>
              )}
            </div>
            <AuthButton />
          </header>
          <main className="flex flex-1 flex-col gap-6 px-8 py-6">{children}</main>
        </div>
      </div>
    </LayoutHeaderContext.Provider>
  );
};

export default Layout;

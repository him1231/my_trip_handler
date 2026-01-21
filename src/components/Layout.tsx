import { NavLink } from "react-router-dom";
import AuthButton from "./AuthButton";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div>
          <h2>Wonder Log</h2>
          <p className="muted">Plan trips together in real time.</p>
        </div>
        <nav className="list">
          <NavLink to="/">Trips</NavLink>
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <div>
            <h1>My Trip Handler</h1>
            <p className="muted">Private trips with shareable invite links.</p>
          </div>
          <AuthButton />
        </header>
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
};

export default Layout;

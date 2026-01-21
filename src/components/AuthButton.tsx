import { useAuth } from "../lib/auth";

const AuthButton = () => {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <span className="muted">Checking session...</span>;
  }

  if (!user) {
    return (
      <button className="primary-button" onClick={signIn}>
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="inline-actions">
      <span className="muted">{user.displayName ?? user.email}</span>
      <button className="secondary-button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
};

export default AuthButton;

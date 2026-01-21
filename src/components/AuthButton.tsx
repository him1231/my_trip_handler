import { Button } from "./ui/button";
import { useAuth } from "../lib/auth";

const AuthButton = () => {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <span className="text-sm text-muted-foreground">Checking session...</span>;
  }

  if (!user) {
    return (
      <Button onClick={signIn}>
        Sign in with Google
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground">{user.displayName ?? user.email}</span>
      <Button variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
};

export default AuthButton;

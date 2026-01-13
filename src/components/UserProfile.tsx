import type { GoogleUser } from '../types/auth';

interface UserProfileProps {
  user: GoogleUser;
  onSignOut: () => void;
}

export const UserProfile = ({ user, onSignOut }: UserProfileProps) => {
  return (
    <div className="user-profile">
      <img 
        src={user.picture} 
        alt={user.name} 
        className="user-avatar"
        referrerPolicy="no-referrer"
      />
      <div className="user-info">
        <span className="user-name">{user.name}</span>
        <span className="user-email">{user.email}</span>
      </div>
      <button 
        onClick={onSignOut} 
        className="signout-btn"
        type="button"
      >
        Sign Out
      </button>
    </div>
  );
};

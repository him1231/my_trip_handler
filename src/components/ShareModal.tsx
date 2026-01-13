import { useState, useEffect } from 'react';
import {
  shareWithLink,
  shareWithEmail,
  listPermissions,
  removePermission,
  getShareLink,
  disableLinkSharing,
  type Permission,
} from '../services/shareService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  tripName: string;
  accessToken: string;
}

export const ShareModal = ({
  isOpen,
  onClose,
  fileId,
  tripName,
  accessToken,
}: ShareModalProps) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const [togglingLink, setTogglingLink] = useState(false);

  // Load permissions when modal opens
  useEffect(() => {
    if (isOpen && fileId && accessToken) {
      loadPermissions();
    }
  }, [isOpen, fileId, accessToken]);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const perms = await listPermissions(accessToken, fileId);
      setPermissions(perms);
      
      // Check if link sharing is enabled
      const hasAnyoneLink = perms.some((p) => p.type === 'anyone');
      setLinkEnabled(hasAnyoneLink);
      
      if (hasAnyoneLink) {
        setShareLink(getShareLink(fileId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLinkSharing = async () => {
    setTogglingLink(true);
    setError(null);
    try {
      if (linkEnabled) {
        // Disable link sharing
        await disableLinkSharing(accessToken, fileId);
        setLinkEnabled(false);
        setShareLink('');
      } else {
        // Enable link sharing
        const link = await shareWithLink(accessToken, fileId, 'writer');
        setLinkEnabled(true);
        setShareLink(link);
      }
      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle link sharing');
    } finally {
      setTogglingLink(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy link');
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setAddingEmail(true);
    setError(null);
    try {
      await shareWithEmail(accessToken, fileId, email.trim(), 'writer', true);
      setEmail('');
      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share with email');
    } finally {
      setAddingEmail(false);
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    setError(null);
    try {
      await removePermission(accessToken, fileId, permissionId);
      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove permission');
    }
  };

  if (!isOpen) return null;

  // Filter out the owner permission
  const sharedWith = permissions.filter(
    (p) => p.type !== 'anyone' && p.role !== 'owner'
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share "{tripName}"</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {/* Link Sharing Section */}
          <div className="share-section">
            <div className="share-section-header">
              <span className="share-icon">🔗</span>
              <div className="share-section-info">
                <h3>Anyone with the link</h3>
                <p>Anyone with the link can edit this trip</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={linkEnabled}
                  onChange={handleToggleLinkSharing}
                  disabled={togglingLink}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {linkEnabled && (
              <div className="share-link-container">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="share-link-input"
                />
                <button
                  className="btn-copy"
                  onClick={handleCopyLink}
                  disabled={!shareLink}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* Email Sharing Section */}
          <div className="share-section">
            <div className="share-section-header">
              <span className="share-icon">👤</span>
              <div className="share-section-info">
                <h3>Share with specific people</h3>
                <p>Enter email addresses to invite collaborators</p>
              </div>
            </div>

            <form onSubmit={handleAddEmail} className="share-email-form">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="share-email-input"
                disabled={addingEmail}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={!email.trim() || addingEmail}
              >
                {addingEmail ? 'Adding...' : 'Add'}
              </button>
            </form>

            {/* List of people shared with */}
            {loading ? (
              <div className="share-loading">Loading...</div>
            ) : sharedWith.length > 0 ? (
              <ul className="share-list">
                {sharedWith.map((perm) => (
                  <li key={perm.id} className="share-list-item">
                    <div className="share-person">
                      <span className="share-person-avatar">
                        {perm.displayName?.[0] || perm.emailAddress?.[0] || '?'}
                      </span>
                      <div className="share-person-info">
                        <span className="share-person-name">
                          {perm.displayName || perm.emailAddress}
                        </span>
                        {perm.displayName && perm.emailAddress && (
                          <span className="share-person-email">
                            {perm.emailAddress}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn-remove"
                      onClick={() => handleRemovePermission(perm.id)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="share-empty">No one else has access yet</p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

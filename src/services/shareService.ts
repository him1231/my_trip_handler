import type { TripSummary } from '../types/trip';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const APP_BASE_URL = import.meta.env.PROD 
  ? 'https://him1231.github.io/my_trip_handler'
  : window.location.origin;

export interface Permission {
  id: string;
  type: 'user' | 'anyone' | 'domain' | 'group';
  role: 'reader' | 'writer' | 'owner';
  emailAddress?: string;
  displayName?: string;
}

interface DrivePermissionResponse {
  id: string;
  type: string;
  role: string;
  emailAddress?: string;
  displayName?: string;
}

interface DrivePermissionsListResponse {
  permissions: DrivePermissionResponse[];
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  owners?: { emailAddress: string; displayName: string }[];
  sharingUser?: { emailAddress: string; displayName: string };
}

interface DriveFileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

// Helper for API requests
const driveRequest = async <T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Request failed: ${response.status}`);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

/**
 * Share a file with anyone who has the link
 */
export const shareWithLink = async (
  accessToken: string,
  fileId: string,
  role: 'reader' | 'writer' = 'writer'
): Promise<string> => {
  // Create "anyone with link" permission
  await driveRequest<DrivePermissionResponse>(
    `${DRIVE_API_BASE}/files/${fileId}/permissions`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'anyone',
        role,
      }),
    }
  );

  // Return the shareable app URL
  return `${APP_BASE_URL}/?trip=${fileId}`;
};

/**
 * Share a file with a specific email address
 */
export const shareWithEmail = async (
  accessToken: string,
  fileId: string,
  email: string,
  role: 'reader' | 'writer' = 'writer',
  sendNotification: boolean = true
): Promise<void> => {
  await driveRequest<DrivePermissionResponse>(
    `${DRIVE_API_BASE}/files/${fileId}/permissions?sendNotificationEmail=${sendNotification}`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    }
  );
};

/**
 * List all permissions for a file
 */
export const listPermissions = async (
  accessToken: string,
  fileId: string
): Promise<Permission[]> => {
  const response = await driveRequest<DrivePermissionsListResponse>(
    `${DRIVE_API_BASE}/files/${fileId}/permissions?fields=permissions(id,type,role,emailAddress,displayName)`,
    accessToken
  );

  return response.permissions.map((p) => ({
    id: p.id,
    type: p.type as Permission['type'],
    role: p.role as Permission['role'],
    emailAddress: p.emailAddress,
    displayName: p.displayName,
  }));
};

/**
 * Remove a permission from a file
 */
export const removePermission = async (
  accessToken: string,
  fileId: string,
  permissionId: string
): Promise<void> => {
  await driveRequest<void>(
    `${DRIVE_API_BASE}/files/${fileId}/permissions/${permissionId}`,
    accessToken,
    { method: 'DELETE' }
  );
};

/**
 * Check if a file has "anyone with link" sharing enabled
 */
export const hasLinkSharing = async (
  accessToken: string,
  fileId: string
): Promise<boolean> => {
  const permissions = await listPermissions(accessToken, fileId);
  return permissions.some((p) => p.type === 'anyone');
};

/**
 * Disable "anyone with link" sharing
 */
export const disableLinkSharing = async (
  accessToken: string,
  fileId: string
): Promise<void> => {
  const permissions = await listPermissions(accessToken, fileId);
  const anyonePermission = permissions.find((p) => p.type === 'anyone');
  
  if (anyonePermission) {
    await removePermission(accessToken, fileId, anyonePermission.id);
  }
};

/**
 * Get the shareable link for a file (if sharing is enabled)
 */
export const getShareLink = (fileId: string): string => {
  return `${APP_BASE_URL}/?trip=${fileId}`;
};

/**
 * Get all trips shared with the current user
 */
export const getSharedWithMe = async (
  accessToken: string
): Promise<TripSummary[]> => {
  // Query for JSON files shared with me that look like trip files
  const query = encodeURIComponent(
    "sharedWithMe = true and mimeType = 'application/json' and name contains '.trip.json'"
  );
  
  const response = await driveRequest<DriveFileListResponse>(
    `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name,createdTime,modifiedTime,owners,sharingUser)&orderBy=modifiedTime desc`,
    accessToken
  );

  return response.files.map((file) => {
    // Extract trip name from filename (e.g., "My Trip.trip.json" -> "My Trip")
    const tripName = file.name.replace('.trip.json', '');
    
    return {
      id: file.id, // Use Drive file ID as trip ID for shared trips
      driveFileId: file.id,
      name: tripName,
      startDate: '', // These would need to be fetched from file content
      endDate: '',
      destinationCount: 0,
      lastModified: file.modifiedTime,
      owner: file.owners?.[0]?.displayName || file.owners?.[0]?.emailAddress || 'Unknown',
      sharedBy: file.sharingUser?.displayName || file.sharingUser?.emailAddress,
    };
  });
};

/**
 * Get file metadata (for checking if file has been modified)
 */
export const getFileMetadata = async (
  accessToken: string,
  fileId: string
): Promise<{ modifiedTime: string; name: string }> => {
  const response = await driveRequest<{ modifiedTime: string; name: string }>(
    `${DRIVE_API_BASE}/files/${fileId}?fields=modifiedTime,name`,
    accessToken
  );
  
  return response;
};

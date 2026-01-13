import type { Trip, TripSummary, tripToSummary } from '../types/trip';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER_NAME = 'My Trip Handler';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
}

interface DriveFileList {
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Drive API error: ${response.status}`);
  }

  // Handle empty responses (like DELETE)
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
};

/**
 * Get or create the app folder in Google Drive
 */
export const getOrCreateAppFolder = async (accessToken: string): Promise<string> => {
  // Search for existing folder
  const query = `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchUrl = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  
  const searchResult = await driveRequest<DriveFileList>(searchUrl, accessToken);
  
  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // Create new folder
  const createUrl = `${DRIVE_API_BASE}/files`;
  const folderMetadata = {
    name: APP_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const folder = await driveRequest<DriveFile>(createUrl, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(folderMetadata),
  });

  return folder.id;
};

/**
 * Save a trip to Google Drive
 */
export const saveTrip = async (
  accessToken: string,
  folderId: string,
  trip: Trip
): Promise<string> => {
  const updatedTrip = { ...trip, updatedAt: new Date().toISOString() };
  const fileName = `trip_${trip.id}.json`;

  // Check if file already exists (update vs create)
  if (trip.driveFileId) {
    // Update existing file
    const updateUrl = `${DRIVE_UPLOAD_BASE}/files/${trip.driveFileId}?uploadType=media`;
    
    await driveRequest<DriveFile>(updateUrl, accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTrip),
    });

    return trip.driveFileId;
  }

  // Create new file with multipart upload
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(updatedTrip) +
    closeDelimiter;

  const createUrl = `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id`;
  
  const file = await driveRequest<DriveFile>(createUrl, accessToken, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  return file.id;
};

/**
 * Load all trips from Google Drive
 */
export const loadTrips = async (
  accessToken: string,
  folderId: string
): Promise<TripSummary[]> => {
  const query = `'${folderId}' in parents and mimeType='application/json' and trashed=false`;
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime)&orderBy=modifiedTime desc`;

  const result = await driveRequest<DriveFileList>(url, accessToken);
  
  if (!result.files || result.files.length === 0) {
    return [];
  }

  // Load each trip file to get summary info
  const summaries: TripSummary[] = [];
  
  for (const file of result.files) {
    try {
      const trip = await loadTripById(accessToken, file.id);
      if (trip) {
        summaries.push({
          id: trip.id,
          name: trip.name,
          description: trip.description,
          coverImage: trip.coverImage,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destinationCount: trip.destinations?.length || 0,
          driveFileId: file.id,
          createdAt: trip.createdAt,
          updatedAt: trip.updatedAt,
        });
      }
    } catch (err) {
      console.error(`Failed to load trip ${file.id}:`, err);
    }
  }

  return summaries;
};

/**
 * Load a single trip by Drive file ID
 */
export const loadTripById = async (
  accessToken: string,
  fileId: string
): Promise<Trip | null> => {
  const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
  
  try {
    const trip = await driveRequest<Trip>(url, accessToken);
    return { ...trip, driveFileId: fileId };
  } catch (err) {
    console.error('Failed to load trip:', err);
    return null;
  }
};

/**
 * Delete a trip from Google Drive
 */
export const deleteTrip = async (
  accessToken: string,
  fileId: string
): Promise<void> => {
  const url = `${DRIVE_API_BASE}/files/${fileId}`;
  
  await driveRequest<void>(url, accessToken, {
    method: 'DELETE',
  });
};

/**
 * Check if Drive API is accessible with current token
 */
export const testDriveAccess = async (accessToken: string): Promise<boolean> => {
  try {
    const url = `${DRIVE_API_BASE}/about?fields=user`;
    await driveRequest<unknown>(url, accessToken);
    return true;
  } catch {
    return false;
  }
};

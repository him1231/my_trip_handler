export type TripRole = "owner" | "editor" | "viewer";

export type TripMember = {
  role: TripRole;
  displayName: string | null;
  photoURL: string | null;
};

export type Trip = {
  id: string;
  title: string;
  ownerId: string;
  inviteToken: string;
  memberIds: string[];
  members: Record<string, TripMember>;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TripLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  note?: string;
  createdBy: string;
  createdAt?: Date;
};

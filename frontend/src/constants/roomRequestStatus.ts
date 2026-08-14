/**
 * Room Request Status Constants
 * 
 * These match the database CHECK constraint for farmer_room_access.status:
 * CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Revoked'))
 * 
 * IMPORTANT: Database expects Title Case (first letter uppercase)
 */
export const RoomRequestStatus = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Revoked: 'Revoked',
} as const;

export type RoomRequestStatusType = typeof RoomRequestStatus[keyof typeof RoomRequestStatus];

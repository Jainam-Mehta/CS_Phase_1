import { supabase } from './supabase';

export type ActivityType = 
  | 'farmer_requested'
  | 'farmer_approved'
  | 'farmer_rejected'
  | 'stakeholder_requested'
  | 'stakeholder_approved'
  | 'stakeholder_rejected'
  | 'payment_received';

interface LogActivityParams {
  actorId: string;
  actorName: string;
  actionType: ActivityType;
  actionSubtype?: string;
  targetType: string;
  targetId: string;
  targetName: string;
  facilityId?: string;
  relatedData?: Record<string, any>;
  visibility?: 'private' | 'public';
}

export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        actor_id: params.actorId,
        actor_name: params.actorName,
        action_type: params.actionType,
        action_subtype: params.actionSubtype || null,
        target_type: params.targetType,
        target_id: params.targetId,
        target_name: params.targetName,
        facility_id: params.facilityId || null,
        related_data: params.relatedData || null,
        visibility: params.visibility || 'private',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

// Helper functions for specific log types
export const logFarmerRequest = async (
  farmerId: string,
  farmerName: string,
  roomId: string,
  roomName: string,
  facilityId: string,
  facilityName: string
) => {
  await logActivity({
    actorId: farmerId,
    actorName: farmerName,
    actionType: 'farmer_requested',
    actionSubtype: 'cold_storage_request',
    targetType: 'farmer',
    targetId: farmerId,
    targetName: farmerName,
    facilityId: facilityId,
    relatedData: {
      room_id: roomId,
      room_name: roomName,
      facility_name: facilityName
    },
    visibility: 'private'
  });
};

export const logFarmerApproved = async (
  ownerId: string,
  ownerName: string,
  farmerId: string,
  farmerName: string,
  roomId: string,
  roomName: string,
  facilityId: string,
  facilityName: string
) => {
  await logActivity({
    actorId: ownerId,
    actorName: ownerName,
    actionType: 'farmer_approved',
    actionSubtype: 'cold_storage_request',
    targetType: 'farmer',
    targetId: farmerId,
    targetName: farmerName,
    facilityId: facilityId,
    relatedData: {
      room_id: roomId,
      room_name: roomName,
      facility_name: facilityName,
      action_by: 'owner'
    },
    visibility: 'private'
  });
};

export const logStakeholderRequest = async (
  stakeholderId: string,
  stakeholderName: string,
  facilityId: string,
  facilityName: string,
  investmentAmount: number
) => {
  await logActivity({
    actorId: stakeholderId,
    actorName: stakeholderName,
    actionType: 'stakeholder_requested',
    actionSubtype: 'investment_request',
    targetType: 'stakeholder',
    targetId: stakeholderId,
    targetName: stakeholderName,
    facilityId: facilityId,
    relatedData: {
      facility_name: facilityName,
      investment_amount_inr: investmentAmount,
      status: 'Interested'
    },
    visibility: 'private'
  });
};

export const logStakeholderApproved = async (
  ownerId: string,
  ownerName: string,
  stakeholderId: string,
  stakeholderName: string,
  facilityId: string,
  facilityName: string,
  investmentAmount: number
) => {
  await logActivity({
    actorId: ownerId,
    actorName: ownerName,
    actionType: 'stakeholder_approved',
    actionSubtype: 'investment_request',
    targetType: 'stakeholder',
    targetId: stakeholderId,
    targetName: stakeholderName,
    facilityId: facilityId,
    relatedData: {
      facility_name: facilityName,
      investment_amount_inr: investmentAmount,
      status: 'Accepted',
      action_by: 'owner'
    },
    visibility: 'private'
  });
};

export const logPaymentReceived = async (
  ownerId: string,
  ownerName: string,
  stakeholderId: string,
  stakeholderName: string,
  facilityId: string,
  facilityName: string,
  amountInr: number,
  paymentId: string
) => {
  await logActivity({
    actorId: ownerId,
    actorName: ownerName,
    actionType: 'payment_received',
    actionSubtype: 'payment',
    targetType: 'payment',
    targetId: paymentId,
    targetName: `Payment from ${stakeholderName}`,
    facilityId: facilityId,
    relatedData: {
      from_stakeholder: stakeholderName,
      facility_name: facilityName,
      amount_inr: amountInr,
      received_by: 'owner'
    },
    visibility: 'private'
  });
};

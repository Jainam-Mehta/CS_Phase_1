/**
 * Activity Log Service
 * Handles all activity logging for farmers
 */

import { supabase } from '../lib/supabase';

export interface ActivityLogEntry {
  farmer_id: string;
  site_id?: string;
  room_id?: string;
  event_type: 'request_submitted' | 'request_approved' | 'request_rejected' | 'batch_stored' | 'batch_removed' | 'inventory_update' | 'sensor_alert' | 'door_alert' | 'temperature_alert' | 'humidity_alert' | 'system_message';
  title: string;
  description?: string;
  batch_id?: string;
  severity?: 'info' | 'warning' | 'critical';
}

/**
 * Log a room access request submission
 */
export async function logRoomRequestSubmitted(
  farmerId: string,
  siteId: string,
  roomId: string,
  roomCode: string,
  siteName: string
) {
  try {
    const { error } = await supabase.from('farmer_activity_logs').insert({
      farmer_id: farmerId,
      site_id: siteId,
      room_id: roomId,
      event_type: 'request_submitted',
      title: `Storage Request Submitted`,
      description: `Requested access to room ${roomCode} at ${siteName}`,
      severity: 'info',
    });

    if (error) {
      console.error('Failed to log room request:', error);
    } else {
      console.log('✓ Room request logged');
    }
  } catch (err) {
    console.error('Error logging room request:', err);
  }
}

/**
 * Log a room access request approval
 */
export async function logRoomRequestApproved(
  farmerId: string,
  siteId: string,
  roomId: string,
  roomCode: string,
  siteName: string,
  ownerName: string
) {
  try {
    const { error } = await supabase.from('farmer_activity_logs').insert({
      farmer_id: farmerId,
      site_id: siteId,
      room_id: roomId,
      event_type: 'request_approved',
      title: `Storage Request Approved`,
      description: `Your request for room ${roomCode} at ${siteName} has been approved by ${ownerName}`,
      severity: 'info',
    });

    if (error) {
      console.error('Failed to log room approval:', error);
    } else {
      console.log('✓ Room approval logged');
    }
  } catch (err) {
    console.error('Error logging room approval:', err);
  }
}

/**
 * Log a room access request rejection
 */
export async function logRoomRequestRejected(
  farmerId: string,
  siteId: string,
  roomId: string,
  roomCode: string,
  siteName: string,
  ownerName: string,
  remarks?: string
) {
  try {
    const { error } = await supabase.from('farmer_activity_logs').insert({
      farmer_id: farmerId,
      site_id: siteId,
      room_id: roomId,
      event_type: 'request_rejected',
      title: `Storage Request Rejected`,
      description: `Your request for room ${roomCode} at ${siteName} has been rejected by ${ownerName}${remarks ? '. Reason: ' + remarks : ''}`,
      severity: 'warning',
    });

    if (error) {
      console.error('Failed to log room rejection:', error);
    } else {
      console.log('✓ Room rejection logged');
    }
  } catch (err) {
    console.error('Error logging room rejection:', err);
  }
}

/**
 * Log batch stored in room
 */
export async function logBatchStored(
  farmerId: string,
  siteId: string,
  roomId: string,
  batchId: string,
  batchCode: string,
  quantity: number,
  roomCode: string,
  siteName: string
) {
  try {
    const { error } = await supabase.from('farmer_activity_logs').insert({
      farmer_id: farmerId,
      site_id: siteId,
      room_id: roomId,
      batch_id: batchId,
      event_type: 'batch_stored',
      title: `Batch Stored`,
      description: `Stored batch ${batchCode} (${quantity}kg) in room ${roomCode} at ${siteName}`,
      severity: 'info',
    });

    if (error) {
      console.error('Failed to log batch storage:', error);
    } else {
      console.log('✓ Batch storage logged');
    }
  } catch (err) {
    console.error('Error logging batch storage:', err);
  }
}

/**
 * Log batch removed from room
 */
export async function logBatchRemoved(
  farmerId: string,
  siteId: string,
  roomId: string,
  batchId: string,
  batchCode: string,
  quantity: number,
  roomCode: string,
  siteName: string
) {
  try {
    const { error } = await supabase.from('farmer_activity_logs').insert({
      farmer_id: farmerId,
      site_id: siteId,
      room_id: roomId,
      batch_id: batchId,
      event_type: 'batch_removed',
      title: `Batch Removed`,
      description: `Removed batch ${batchCode} (${quantity}kg) from room ${roomCode} at ${siteName}`,
      severity: 'info',
    });

    if (error) {
      console.error('Failed to log batch removal:', error);
    } else {
      console.log('✓ Batch removal logged');
    }
  } catch (err) {
    console.error('Error logging batch removal:', err);
  }
}

/**
 * Notification Service
 * Handles creating notifications for farmers
 */

import { supabase } from '../lib/supabase';

export interface NotificationPayload {
  farmer_id: string;
  notification_type: 'request_submitted' | 'request_approved' | 'request_rejected' | 'batch_stored' | 'batch_removed' | 'alert_triggered' | 'system_message';
  title: string;
  message?: string;
  site_id?: string;
  room_id?: string;
  request_id?: string;
}

/**
 * Create a notification for a farmer
 */
export async function createNotification(payload: NotificationPayload) {
  try {
    const { error } = await supabase.from('farmer_notifications').insert({
      farmer_id: payload.farmer_id,
      notification_type: payload.notification_type,
      title: payload.title,
      message: payload.message,
      site_id: payload.site_id,
      room_id: payload.room_id,
      request_id: payload.request_id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to create notification:', error);
      return false;
    }

    console.log('✓ Notification created');
    return true;
  } catch (err) {
    console.error('Error creating notification:', err);
    return false;
  }
}

/**
 * Notify farmer when their room request is approved
 */
export async function notifyRequestApproved(
  farmerId: string,
  siteId: string,
  roomId: string,
  requestId: string,
  roomCode: string,
  siteName: string,
  ownerName: string
) {
  return createNotification({
    farmer_id: farmerId,
    notification_type: 'request_approved',
    title: '✅ Room Request Approved',
    message: `Your request for room ${roomCode} at ${siteName} has been approved by ${ownerName}. You can now store products there!`,
    site_id: siteId,
    room_id: roomId,
    request_id: requestId,
  });
}

/**
 * Notify farmer when their room request is rejected
 */
export async function notifyRequestRejected(
  farmerId: string,
  siteId: string,
  roomId: string,
  requestId: string,
  roomCode: string,
  siteName: string,
  ownerName: string,
  remarks?: string
) {
  return createNotification({
    farmer_id: farmerId,
    notification_type: 'request_rejected',
    title: '❌ Room Request Rejected',
    message: `Your request for room ${roomCode} at ${siteName} has been rejected by ${ownerName}.${remarks ? ` Reason: ${remarks}` : ''}`,
    site_id: siteId,
    room_id: roomId,
    request_id: requestId,
  });
}

/**
 * Notify farmer when request is submitted (confirmation)
 */
export async function notifyRequestSubmitted(
  farmerId: string,
  siteId: string,
  roomId: string,
  requestId: string,
  roomCode: string,
  siteName: string
) {
  return createNotification({
    farmer_id: farmerId,
    notification_type: 'request_submitted',
    title: '📨 Request Submitted',
    message: `Your request for room ${roomCode} at ${siteName} has been submitted. The owner will review it soon.`,
    site_id: siteId,
    room_id: roomId,
    request_id: requestId,
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('farmer_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return false;
  }
}

/**
 * Get unread notification count for farmer
 */
export async function getUnreadNotificationCount(farmerId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('farmer_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', farmerId)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    console.error('Error getting unread count:', err);
    return 0;
  }
}

/**
 * Get all notifications for a farmer
 */
export async function getNotifications(farmerId: string, limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('farmer_notifications')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error getting notifications:', err);
    return [];
  }
}

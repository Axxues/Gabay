import { readItems, createItem, updateItem } from '@likha-erp/likha-sdk';
import { likha } from '@/services/core/likhaClient';
import type { Message } from '@/services/lms/types/lms.types';

export const inboxApi = {
  async listMessages(userId: string): Promise<Message[]> {
    try {
      const items = await likha.request(
        readItems('messages' as any, {
          filter: {
            _or: [{ recipient_id: { _eq: userId } }, { sender_id: { _eq: userId } }],
          },
          sort: ['-created_at'],
        })
      );
      if (Array.isArray(items)) {
        return items.map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: 'User',
          senderRole: 'student',
          recipientId: m.recipient_id,
          recipientName: 'User',
          recipientRole: 'faculty',
          subject: m.subject,
          body: m.body,
          timestamp: m.created_at || new Date().toISOString(),
          read: m.read || false,
        }));
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async sendMessage(message: Partial<Message>): Promise<Message | null> {
    try {
      const created = await likha.request(
        createItem('messages' as any, {
          sender_id: message.senderId,
          recipient_id: message.recipientId,
          subject: message.subject,
          body: message.body,
          read: false,
          created_at: new Date().toISOString(),
        })
      );
      const m = created as any;
      return {
        id: m.id,
        senderId: m.sender_id,
        senderName: message.senderName || 'User',
        senderRole: message.senderRole || 'student',
        recipientId: m.recipient_id,
        recipientName: message.recipientName || 'User',
        recipientRole: message.recipientRole || 'faculty',
        subject: m.subject,
        body: m.body,
        timestamp: m.created_at,
        read: false,
      };
    } catch {
      return null;
    }
  },

  async markAsRead(id: string): Promise<boolean> {
    try {
      await likha.request(updateItem('messages' as any, id, { read: true }));
      return true;
    } catch {
      return false;
    }
  },
};

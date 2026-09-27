/** Future inbox items. Nothing in the app writes these yet. */
export type NotificationKind = 'like' | 'comment' | 'follow' | 'message';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

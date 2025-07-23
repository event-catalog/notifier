import { Event } from './notifications/Event';
import { Notification } from './types';

export const processEvents = async (events: Event[]) => {
  let notifications: Notification[] = [];

  for (const event of events) {
    const eventNotifications = await event.process();
    notifications.push(...eventNotifications);
  }

  return notifications;
};

import { NotifierConfig, Notification } from './types';

export const filterNotifications = (config: NotifierConfig, notifications: Notification[]) => {
  const filteredNotifications: Notification[] = [];

  // If there are no owners filter them out
  notifications = notifications.filter((notification) => notification.resource.owners.length > 0);

  for (const notification of notifications) {
    // Check if any team is interested in this notification
    for (const ownerName in config.owners) {
      const owner = config.owners[ownerName];
      if (owner.events.includes(notification.id)) {
        filteredNotifications.push(notification);
        break; // Found a match, no need to check other teams for this notification
      }
    }
  }
  return filteredNotifications;
};

import { subscribeMessagesForUser } from './messageService';
import { subscribeTasksForUser } from './taskService';
import { subscribeTeachingSchedules } from '../../../services/scheduleService';

const NOTIFICATION_READ_KEY_PREFIX = 'preplens_notifications_read_';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function toMillis(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  return Date.now();
}

function mapMessages(messages = []) {
  return messages.map((message) => ({
    id: `message-${message.id}`,
    type: 'message',
    text: message.text || 'New admin message',
    createdAt: toMillis(message.createdAt),
  }));
}

function mapTasks(tasks = []) {
  return tasks.map((task) => ({
    id: `task-${task.id}`,
    type: 'task',
    text: `Task assigned: ${task.title || 'Untitled task'}`,
    createdAt: toMillis(task.createdAt),
  }));
}

function mapSchedules(schedules = []) {
  return schedules.map((item) => ({
    id: `schedule-${item.id}`,
    type: 'schedule',
    text: `Schedule: ${item.date} - ${item.category || ''} ${item.topic || ''} ${item.chapter || ''}`.trim(),
    createdAt: toMillis(item.createdAt),
  }));
}

function mergeNotifications({ messages = [], tasks = [], schedules = [] }) {
  const all = [...mapMessages(messages), ...mapTasks(tasks), ...mapSchedules(schedules)];
  const seen = new Set();
  return all
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function getReadTimestamp(userId) {
  if (!canUseStorage() || !userId) return 0;
  const value = window.localStorage.getItem(`${NOTIFICATION_READ_KEY_PREFIX}${userId}`);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function markNotificationsAsRead(userId) {
  if (!canUseStorage() || !userId) return;
  window.localStorage.setItem(`${NOTIFICATION_READ_KEY_PREFIX}${userId}`, String(Date.now()));
}

export function subscribeNotificationsForUser(userId, callback) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  let messages = [];
  let tasks = [];
  let schedules = [];

  const emit = () => callback(mergeNotifications({ messages, tasks, schedules }));

  const stopMessages = subscribeMessagesForUser(userId, (items) => {
    messages = items || [];
    emit();
  });
  const stopTasks = subscribeTasksForUser(userId, (items) => {
    tasks = items || [];
    emit();
  });
  const stopSchedules = subscribeTeachingSchedules((items) => {
    schedules = items || [];
    emit();
  });

  return () => {
    stopMessages();
    stopTasks();
    stopSchedules();
  };
}

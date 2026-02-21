import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';

const DEMO_TASKS_KEY = 'preplens_demo_tasks';

function normalizeTask(id, data) {
  return {
    id,
    title: data.title || 'Untitled task',
    completed: Boolean(data.completed),
  };
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readDemoTasks(userId) {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(DEMO_TASKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed
      .filter((item) => item.userId === userId)
      .map((item) => normalizeTask(item.id || `local-${Math.random()}`, item));
  } catch {
    return [];
  }
}

export function subscribeTasksForUser(userId, callback) {
  if (!db || !userId) {
    callback(readDemoTasks(userId));
    return () => {};
  }

  try {
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('userId', '==', userId));
    return onSnapshot(
      tasksQuery,
      (snapshot) => {
        callback(snapshot.docs.map((doc) => normalizeTask(doc.id, doc.data())));
      },
      (error) => {
        console.error('Failed to subscribe to tasks.', error);
        callback(readDemoTasks(userId));
      }
    );
  } catch (error) {
    console.error('Failed to start tasks subscription.', error);
    callback(readDemoTasks(userId));
    return () => {};
  }
}

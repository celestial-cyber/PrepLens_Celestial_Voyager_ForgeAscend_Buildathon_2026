import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';

const DEMO_TASKS_KEY = 'preplens_demo_tasks';

function normalizeTask(id, data) {
  const createdAt = Number.isFinite(Number(data.createdAt)) ? Number(data.createdAt) : 0;
  return {
    id,
    userId: data.userId || '',
    title: data.title || 'Untitled task',
    completed: Boolean(data.completed),
    createdAt,
  };
}

function mergeTasksById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
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
      .filter((item) => item.userId === userId || item.uid === userId)
      .map((item, index) =>
        normalizeTask(
          item.id || `local-${item.userId || userId}-${item.title || 'task'}-${item.createdAt || 0}-${index}`,
          item
        )
      );
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
    let byUserIdTasks = [];
    let byLegacyUidTasks = [];
    const emit = () => {
      const merged = mergeTasksById([...byUserIdTasks, ...byLegacyUidTasks, ...readDemoTasks(userId)])
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(merged);
    };

    const stopByUserId = onSnapshot(
      query(tasksRef, where('userId', '==', userId)),
      (snapshot) => {
        byUserIdTasks = snapshot.docs.map((doc) => normalizeTask(doc.id, doc.data()));
        emit();
      },
      (error) => {
        console.error('Failed to subscribe to tasks by userId.', error);
        byUserIdTasks = [];
        emit();
      }
    );

    const stopByLegacyUid = onSnapshot(
      query(tasksRef, where('uid', '==', userId)),
      (snapshot) => {
        byLegacyUidTasks = snapshot.docs.map((doc) => normalizeTask(doc.id, doc.data()));
        emit();
      },
      (error) => {
        console.error('Failed to subscribe to tasks by legacy uid.', error);
        byLegacyUidTasks = [];
        emit();
      }
    );

    return () => {
      stopByUserId();
      stopByLegacyUid();
    };
  } catch (error) {
    console.error('Failed to start tasks subscription.', error);
    callback(readDemoTasks(userId));
    return () => {};
  }
}

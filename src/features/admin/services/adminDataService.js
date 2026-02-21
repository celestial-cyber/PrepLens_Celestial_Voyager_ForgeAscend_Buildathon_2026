import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../firebase';

const DEMO_TASKS_KEY = 'preplens_demo_tasks';
const DEMO_STUDENTS = [
  {
    id: 'demo-student-uid',
    uid: 'demo-student-uid',
    name: 'Demo Student',
    email: 'student@email.com',
    targetExam: 'JEE',
    grade: '12',
    readinessScore: 62,
    streakDays: 4,
    completedTasks: 2,
    totalActivities: 3,
    lastActiveAt: Date.now(),
  },
];

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeActivity(id, data) {
  const createdAt = toMillis(data.createdAt) || toMillis(data.date);
  return {
    id,
    userId: data.userId || data.uid || '',
    day: data.day || (createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A'),
    hours: toNumber(data.hours, 0),
    topic: data.topic || 'General study',
    createdAt,
  };
}

function mergeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isPermissionError(error) {
  return error?.code === 'permission-denied' || String(error?.message || '').includes('Missing or insufficient permissions');
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readDemoTasks() {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(DEMO_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeDemoTask(task) {
  if (!canUseStorage()) return;
  const existing = readDemoTasks();
  existing.push(task);
  window.localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(existing));
}

export async function getActivitiesByUserId(userId) {
  if (!db || !userId) return [];

  try {
    const activitiesRef = collection(db, 'activities');
    const [byUserId, byLegacyUid] = await Promise.all([
      getDocs(query(activitiesRef, where('userId', '==', userId))),
      getDocs(query(activitiesRef, where('uid', '==', userId))),
    ]);

    return mergeById([
      ...byUserId.docs.map((item) => normalizeActivity(item.id, item.data())),
      ...byLegacyUid.docs.map((item) => normalizeActivity(item.id, item.data())),
    ]).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    if (isPermissionError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getAllStudents() {
  if (!db) return DEMO_STUDENTS;

  try {
    const profilesRef = collection(db, 'profiles');
    const snapshot = await getDocs(profilesRef);

    const students = await Promise.all(
      snapshot.docs.map(async (profileDoc) => {
        const uid = profileDoc.id;
        const profile = profileDoc.data() || {};
        const progressDoc = await getDoc(doc(db, 'progress', uid));
        const progress = progressDoc.exists() ? progressDoc.data() : {};
        const activities = await getActivitiesByUserId(uid);

        return {
          id: uid,
          uid,
          name: profile.name || 'Unknown',
          email: profile.email || '',
          targetExam: profile.targetExam || '',
          grade: profile.grade || '',
          readinessScore: toNumber(progress.readinessScore, 0),
          streakDays: toNumber(progress.streakDays, 0),
          completedTasks: toNumber(progress.completedTasks, 0),
          totalActivities: activities.length,
          lastActiveAt: activities[0]?.createdAt || null,
        };
      })
    );

    return students;
  } catch (error) {
    if (isPermissionError(error)) {
      return DEMO_STUDENTS;
    }
    throw error;
  }
}

export async function createAdminTask({ userId, title, completed = false }) {
  const normalizedTitle = String(title || '').trim();
  if (!userId) {
    throw new Error('Please select a student.');
  }
  if (!normalizedTitle) {
    throw new Error('Task title is required.');
  }

  const payload = {
    userId,
    title: normalizedTitle,
    completed: Boolean(completed),
  };

  if (!db) {
    writeDemoTask({ id: `demo-task-${Date.now()}`, ...payload });
    return;
  }

  try {
    return addDoc(collection(db, 'tasks'), payload);
  } catch (error) {
    if (isPermissionError(error)) {
      writeDemoTask({ id: `demo-task-${Date.now()}`, ...payload });
      return;
    }
    throw error;
  }
}

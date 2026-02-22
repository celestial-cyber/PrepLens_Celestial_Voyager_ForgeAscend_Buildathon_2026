import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const DEMO_SCHEDULE_KEY = 'preplens_demo_schedule';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readLocalSchedules() {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(DEMO_SCHEDULE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalSchedule(item) {
  if (!canUseStorage()) return;
  const existing = readLocalSchedules();
  window.localStorage.setItem(DEMO_SCHEDULE_KEY, JSON.stringify([item, ...existing]));
}

function mergeSchedulesById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || `${item.date}-${item.category}-${item.topic}-${item.chapter}-${item.createdAt || 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeSchedule(id, data) {
  return {
    id,
    date: data.date || '',
    category: data.category || '',
    topic: data.topic || '',
    chapter: data.chapter || '',
    note: data.note || '',
    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
  };
}

function sortSchedules(items) {
  return items.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export async function createTeachingSchedule(input) {
  const payload = {
    date: input.date,
    category: input.category,
    topic: input.topic,
    chapter: input.chapter,
    note: input.note || '',
    createdAt: serverTimestamp(),
  };
  const localMirror = {
    id: `local-schedule-${Date.now()}`,
    date: input.date,
    category: input.category,
    topic: input.topic,
    chapter: input.chapter,
    note: input.note || '',
    createdAt: Date.now(),
  };

  if (!db) {
    writeLocalSchedule(localMirror);
    return;
  }

  try {
    const scheduleRef = await addDoc(collection(db, 'schedules'), payload);
    writeLocalSchedule({ ...localMirror, id: scheduleRef.id });
  } catch {
    writeLocalSchedule(localMirror);
  }
}

export function subscribeTeachingSchedules(callback) {
  if (!db) {
    callback(sortSchedules(readLocalSchedules()));
    return () => {};
  }

  try {
    const schedulesRef = collection(db, 'schedules');
    const schedulesQuery = query(schedulesRef, orderBy('date'));
    return onSnapshot(
      schedulesQuery,
      (snapshot) => {
        const firestoreSchedules = snapshot.docs.map((doc) => normalizeSchedule(doc.id, doc.data()));
        const merged = mergeSchedulesById([...firestoreSchedules, ...readLocalSchedules()]);
        callback(sortSchedules(merged));
      },
      () => callback(sortSchedules(readLocalSchedules()))
    );
  } catch {
    callback(sortSchedules(readLocalSchedules()));
    return () => {};
  }
}

import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  query,
  setDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { calculateReadiness } from '../../../utils/readinessCalculator';
import { STUDY_CATALOG } from '../constants/studyCatalog';

const activities = [];
const DEMO_ACTIVITIES_KEY = 'preplens_demo_activities';

function toDateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function yesterdayKeyFrom(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function inferCategory(topic = '', fallback = 'coding') {
  const normalized = String(topic).toLowerCase();
  const guessed = Object.entries(STUDY_CATALOG).find(([, section]) =>
    Object.values(section.topics).some((topicEntry) =>
      String(topicEntry.label).toLowerCase().includes(normalized) || normalized.includes(String(topicEntry.label).toLowerCase())
    )
  );
  return guessed?.[0] || fallback;
}

function normalizeActivity(data, id = '') {
  const createdAt = data.createdAt?.toMillis
    ? data.createdAt.toMillis()
    : Number.isFinite(Number(data.createdAt))
      ? Number(data.createdAt)
      : null;
  const category = data.category || inferCategory(data.topic);
  const topicKey = data.topicKey || Object.keys(STUDY_CATALOG[category]?.topics || {})[0] || '';
  const topicLabel = STUDY_CATALOG[category]?.topics?.[topicKey]?.label || data.topic || 'General study';
  return {
    id: id || data.id || '',
    day: data.day || 'N/A',
    hours: Number(data.hours) || 0,
    category,
    topicKey,
    topic: topicLabel,
    chapter: data.chapter || '',
    completionPercent: Number(data.completionPercent) || 0,
    createdAt,
  };
}

function mergeActivities(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || `${item.day}-${item.topic}-${item.chapter}-${item.hours}-${item.completionPercent}-${item.createdAt || 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readDemoActivities(userId) {
  if (!canUseStorage() || !userId) return [];
  try {
    const raw = window.localStorage.getItem(DEMO_ACTIVITIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed
      .filter((item) => item.userId === userId)
      .map((item) => normalizeActivity(item, item.id))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

function writeDemoActivity(payload) {
  if (!canUseStorage()) return;
  const raw = window.localStorage.getItem(DEMO_ACTIVITIES_KEY);
  const parsed = raw ? JSON.parse(raw) : [];
  parsed.push(payload);
  window.localStorage.setItem(DEMO_ACTIVITIES_KEY, JSON.stringify(parsed));
}

export function getRecentActivities() {
  return activities;
}

export async function logActivity(entry) {
  const hours = Number(entry.hours);
  const category = entry.category || 'coding';
  const topicKey = entry.topicKey || '';
  const topicLabel = STUDY_CATALOG[category]?.topics?.[topicKey]?.label || String(entry.topic || '').trim() || 'General study';
  const chapter = String(entry.chapter || '').trim();
  const completionPercent = Number(entry.completionPercent);
  const userId = entry.userId || null;
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    throw new Error('Hours must be between 0.5 and 24.');
  }
  if (!STUDY_CATALOG[category]) {
    throw new Error('Please choose a valid category.');
  }
  if (!topicKey || !STUDY_CATALOG[category].topics[topicKey]) {
    throw new Error('Please choose a valid topic.');
  }
  if (!chapter) {
    throw new Error('Please choose a chapter.');
  }
  if (!Number.isFinite(completionPercent) || completionPercent < 0 || completionPercent > 100) {
    throw new Error('Completion must be between 0 and 100.');
  }
  if (!userId) {
    throw new Error('Please login before logging activity.');
  }

  const day = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const payload = {
    day,
    hours,
    category,
    topicKey,
    topic: topicLabel,
    chapter,
    completionPercent,
    userId,
    createdAt: serverTimestamp(),
  };

  if (db && userId) {
    try {
      const activityRef = await addDoc(collection(db, 'activities'), payload);
      writeDemoActivity({
        ...payload,
        id: activityRef.id,
        createdAt: Date.now(),
      });
      try {
        const progressRef = doc(db, 'progress', userId);
        const progressSnap = await getDoc(progressRef);
        const existing = progressSnap.exists() ? progressSnap.data() : {};
        const previousReadiness = Number(existing.readinessScore) || 0;
        const previousStreak = Number(existing.streakDays) || 0;
        const todayKey = toDateKey(Date.now());
        const lastActiveDate = String(existing.lastActiveDate || '');
        const yesterdayKey = yesterdayKeyFrom(todayKey);
        const nextStreak = lastActiveDate === todayKey
          ? previousStreak
          : lastActiveDate === yesterdayKey
            ? previousStreak + 1
            : 1;
        const nextReadiness = Math.min(
          100,
          Math.max(
            previousReadiness,
            calculateReadiness({ hoursStudied: hours, completedTasks: Math.round(completionPercent / 25), totalTasks: 4 })
          )
        );

        await setDoc(
          progressRef,
          {
            readinessScore: nextReadiness,
            streakDays: nextStreak,
            lastActiveDate: todayKey,
          },
          { merge: true }
        );
      } catch (progressError) {
        console.error('Failed to update progress after activity log.', progressError);
      }
      return { success: true, entry: normalizeActivity({ ...payload, createdAt: Date.now() }) };
    } catch (firestoreError) {
      const fallbackPayload = {
        ...payload,
        id: `local-${userId}-${Date.now()}`,
        createdAt: Date.now(),
      };
      writeDemoActivity(fallbackPayload);
      activities.push(normalizeActivity(fallbackPayload, fallbackPayload.id));
      return { success: true, entry: normalizeActivity(fallbackPayload, fallbackPayload.id) };
    }
  }

  const localPayload = {
    id: `local-${userId}-${Date.now()}`,
    day,
    hours,
    category,
    topicKey,
    topic: topicLabel,
    chapter,
    completionPercent,
    userId,
    createdAt: Date.now(),
  };
  writeDemoActivity(localPayload);
  activities.push(normalizeActivity(localPayload, localPayload.id));
  return { success: true, entry: normalizeActivity(localPayload, localPayload.id) };
}

export async function fetchActivitiesForUser(userId) {
  if (!db || !userId) {
    return readDemoActivities(userId);
  }

  try {
    const activitiesRef = collection(db, 'activities');
    const activitiesQuery = query(activitiesRef, where('userId', '==', userId));
    const snapshot = await getDocs(activitiesQuery);
    const firestoreActivities = snapshot.docs.map((doc) => normalizeActivity(doc.data(), doc.id));
    return mergeActivities([...firestoreActivities, ...readDemoActivities(userId)])
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error('Failed to read activities from Firebase.', error);
    return readDemoActivities(userId);
  }
}

export function subscribeActivitiesForUser(userId, callback) {
  if (!db || !userId) {
    callback(readDemoActivities(userId));
    return () => {};
  }

  try {
    const activitiesRef = collection(db, 'activities');
    const activitiesQuery = query(activitiesRef, where('userId', '==', userId));
    return onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const firestoreActivities = snapshot.docs.map((doc) => normalizeActivity(doc.data(), doc.id));
        const merged = mergeActivities([...firestoreActivities, ...readDemoActivities(userId)])
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(merged);
      },
      (error) => {
        console.error('Failed to subscribe to activities.', error);
        callback(readDemoActivities(userId));
      }
    );
  } catch (error) {
    console.error('Failed to start activity subscription.', error);
    callback(readDemoActivities(userId));
    return () => {};
  }
}

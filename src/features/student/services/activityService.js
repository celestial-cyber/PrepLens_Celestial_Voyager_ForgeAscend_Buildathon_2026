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

const activities = [];

function inferCategory(topic = '') {
  const normalized = String(topic).toLowerCase();
  if (/coding|code|program|dsa|leetcode/.test(normalized)) return 'coding';
  if (/aptitude|quant|reason/.test(normalized)) return 'aptitude';
  if (/core|dbms|os|cn|oop/.test(normalized)) return 'core';
  return 'soft-skills';
}

function normalizeActivity(data) {
  const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : null;
  return {
    day: data.day || 'N/A',
    hours: Number(data.hours) || 0,
    topic: data.topic || 'General study',
    category: data.category || inferCategory(data.topic),
    createdAt,
  };
}

export function getRecentActivities() {
  return activities;
}

export async function logActivity(entry) {
  const hours = Number(entry.hours);
  const topic = String(entry.topic || '').trim() || 'General study';
  const userId = entry.userId || null;
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    throw new Error('Hours must be between 0.5 and 24.');
  }
  if (!userId) {
    throw new Error('Please login before logging activity.');
  }

  const day = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const payload = {
    day,
    hours,
    topic,
    category: inferCategory(topic),
    userId,
    createdAt: serverTimestamp(),
  };

  if (db && userId) {
    await addDoc(collection(db, 'activities'), payload);
    try {
      const progressRef = doc(db, 'progress', userId);
      const progressSnap = await getDoc(progressRef);
      const existing = progressSnap.exists() ? progressSnap.data() : {};
      const previousReadiness = Number(existing.readinessScore) || 0;
      const previousStreak = Number(existing.streakDays) || 0;
      const nextReadiness = Math.min(
        100,
        Math.max(previousReadiness, calculateReadiness({ hoursStudied: hours, completedTasks: 0, totalTasks: 1 }))
      );

      await setDoc(
        progressRef,
        {
          readinessScore: nextReadiness,
          streakDays: previousStreak + 1,
        },
        { merge: true }
      );
    } catch (progressError) {
      console.error('Failed to update progress after activity log.', progressError);
    }
    return { success: true, entry: payload };
  }

  activities.push({ day, hours, topic, category: inferCategory(topic), createdAt: Date.now() });
  return { success: true, entry: { day, hours, topic, category: inferCategory(topic) } };
}

export async function fetchActivitiesForUser(userId) {
  if (!db || !userId) {
    return [];
  }

  try {
    const activitiesRef = collection(db, 'activities');
    const activitiesQuery = query(activitiesRef, where('userId', '==', userId));
    const snapshot = await getDocs(activitiesQuery);
    return snapshot.docs.map((doc) => normalizeActivity(doc.data()));
  } catch (error) {
    console.error('Failed to read activities from Firebase.', error);
    return [];
  }
}

export function subscribeActivitiesForUser(userId, callback) {
  if (!db || !userId) {
    callback([]);
    return () => {};
  }

  try {
    const activitiesRef = collection(db, 'activities');
    const activitiesQuery = query(activitiesRef, where('userId', '==', userId));
    return onSnapshot(
      activitiesQuery,
      (snapshot) => {
        callback(snapshot.docs.map((doc) => normalizeActivity(doc.data())));
      },
      (error) => {
        console.error('Failed to subscribe to activities.', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Failed to start activity subscription.', error);
    callback([]);
    return () => {};
  }
}

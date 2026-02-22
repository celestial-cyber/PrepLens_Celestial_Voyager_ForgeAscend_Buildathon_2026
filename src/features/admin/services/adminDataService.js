import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { calculateReadiness } from '../../../utils/readinessCalculator';

const DEMO_TASKS_KEY = 'preplens_demo_tasks';
const DEMO_ACTIVITIES_KEY = 'preplens_demo_activities';
const LOCAL_PROFILES_KEY = 'preplens_local_profiles';
const DEMO_STUDENTS = [
  {
    id: 'demo-student-uid',
    uid: 'demo-student-uid',
    name: 'Demo Student',
    email: 'student@email.com',
    targetExam: 'JEE',
    grade: '12',
    hoursLogged: 6,
    readinessScore: 62,
    streakDays: 4,
    completedTasks: 2,
    totalActivities: 3,
    lastActiveAt: Date.now(),
    status: 'Active',
    isFlagged: false,
    riskReason: 'Healthy',
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
    category: data.category || '',
    topic: data.topic || 'General study',
    chapter: data.chapter || '',
    completionPercent: toNumber(data.completionPercent, 0),
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

function mergeStudentsByUid(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.uid || item.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function clampReadiness(value) {
  return Math.max(0, Math.min(100, toNumber(value, 0)));
}

function toStatus(lastActiveAt, totalActivities) {
  if (!totalActivities || totalActivities <= 0) return 'No activity';
  if (!lastActiveAt) return 'No activity';
  const activeCutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
  return lastActiveAt >= activeCutoff ? 'Active' : 'Inactive';
}

function buildRisk({ readinessScore, streakDays, status, totalActivities }) {
  if (!totalActivities || totalActivities <= 0) {
    return { isFlagged: false, riskReason: 'No data yet' };
  }

  const reasons = [];
  if (readinessScore < 40) reasons.push('Low readiness');
  if (streakDays <= 1) reasons.push('Low streak');
  if (status === 'Inactive') reasons.push('Inactive');
  return {
    isFlagged: reasons.length > 0,
    riskReason: reasons.length > 0 ? reasons.join(', ') : 'Healthy',
  };
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

function readDemoTasksByUserId(userId) {
  return readDemoTasks().filter((item) => item.userId === userId);
}

function normalizeTask(id, data) {
  return {
    id,
    userId: data.userId || data.uid || '',
    title: data.title || 'Untitled task',
    completed: Boolean(data.completed),
    createdAt: toMillis(data.createdAt) || 0,
  };
}

function writeDemoTask(task) {
  if (!canUseStorage()) return;
  const existing = readDemoTasks();
  existing.push(task);
  window.localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(existing));
}

function readDemoActivitiesByUserId(userId) {
  if (!canUseStorage() || !userId) return [];
  try {
    const raw = window.localStorage.getItem(DEMO_ACTIVITIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed
      .filter((item) => item.userId === userId || item.uid === userId)
      .map((item, index) =>
        normalizeActivity(
          item.id || `local-${item.userId || userId}-${item.day || 'day'}-${item.topic || 'topic'}-${item.createdAt || 0}-${index}`,
          item
        )
      );
  } catch {
    return [];
  }
}

function readLocalProfiles() {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed.filter((item) => item?.uid && item?.email && item?.role !== 'admin').map((item) => ({
      id: item.uid,
      uid: item.uid,
      name: item.name || 'Student',
      email: item.email || '',
      targetExam: item.targetExam || '',
      grade: item.grade || '',
      hoursLogged: 0,
      readinessScore: 0,
      streakDays: 0,
      completedTasks: 0,
      totalActivities: 0,
      lastActiveAt: null,
      status: 'No activity',
      isFlagged: false,
      riskReason: 'No data yet',
    }));
  } catch {
    return [];
  }
}

function toDayKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function computeStreakFromActivities(activities = []) {
  const uniqueDays = Array.from(new Set(activities.map((item) => toDayKey(item.createdAt)).filter(Boolean))).sort();
  if (!uniqueDays.length) return 0;
  let streak = 1;
  for (let i = uniqueDays.length - 1; i > 0; i -= 1) {
    const current = new Date(`${uniqueDays[i]}T00:00:00.000Z`);
    const previous = new Date(`${uniqueDays[i - 1]}T00:00:00.000Z`);
    const diffDays = (current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays === 1) streak += 1;
    else break;
  }
  return streak;
}

async function getTaskStatsByUserId(userId) {
  const localTasks = readDemoTasksByUserId(userId).map((item, index) =>
    normalizeTask(item.id || `local-task-${userId}-${index}`, item)
  );
  if (!db || !userId) {
    return {
      totalTasks: localTasks.length,
      completedTasks: localTasks.filter((task) => Boolean(task.completed)).length,
    };
  }

  try {
    const tasksRef = collection(db, 'tasks');
    const [byUserId, byLegacyUid] = await Promise.all([
      getDocs(query(tasksRef, where('userId', '==', userId))),
      getDocs(query(tasksRef, where('uid', '==', userId))),
    ]);
    const firestoreTasks = [
      ...byUserId.docs.map((item) => normalizeTask(item.id, item.data())),
      ...byLegacyUid.docs.map((item) => normalizeTask(item.id, item.data())),
    ];
    const merged = mergeById([...firestoreTasks, ...localTasks]);
    const completedTasks = merged.filter((task) => Boolean(task.completed)).length;
    return { totalTasks: merged.length, completedTasks };
  } catch {
    return {
      totalTasks: localTasks.length,
      completedTasks: localTasks.filter((task) => Boolean(task.completed)).length,
    };
  }
}

export async function getTasksByUserId(userId) {
  const localTasks = readDemoTasksByUserId(userId).map((item, index) =>
    normalizeTask(item.id || `local-task-${userId}-${index}`, item)
  );
  if (!userId) return [];
  if (!db) return localTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  try {
    const tasksRef = collection(db, 'tasks');
    const [byUserId, byLegacyUid] = await Promise.all([
      getDocs(query(tasksRef, where('userId', '==', userId))),
      getDocs(query(tasksRef, where('uid', '==', userId))),
    ]);
    const firestoreTasks = [
      ...byUserId.docs.map((item) => normalizeTask(item.id, item.data())),
      ...byLegacyUid.docs.map((item) => normalizeTask(item.id, item.data())),
    ];
    return mergeById([...firestoreTasks, ...localTasks]).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return localTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
}

export async function getActivitiesByUserId(userId) {
  if (!userId) return [];
  const demoActivities = readDemoActivitiesByUserId(userId);
  if (!db) return demoActivities.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  try {
    const activitiesRef = collection(db, 'activities');
    const [byUserId, byLegacyUid] = await Promise.all([
      getDocs(query(activitiesRef, where('userId', '==', userId))),
      getDocs(query(activitiesRef, where('uid', '==', userId))),
    ]);

    return mergeById([
      ...byUserId.docs.map((item) => normalizeActivity(item.id, item.data())),
      ...byLegacyUid.docs.map((item) => normalizeActivity(item.id, item.data())),
      ...demoActivities,
    ]).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    return demoActivities.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
}

export async function getAllStudents() {
  const localProfiles = readLocalProfiles();
  if (!db) return mergeStudentsByUid([...localProfiles, ...DEMO_STUDENTS]);

  try {
    const profilesRef = collection(db, 'profiles');
    const snapshot = await getDocs(profilesRef);

    const students = await Promise.all(
      snapshot.docs.map(async (profileDoc) => {
        const uid = profileDoc.id;
        const profile = profileDoc.data() || {};
        const role = String(profile.role || '').toLowerCase();
        if (role === 'admin' || profile.isAdmin === true) return null;
        const progressDoc = await getDoc(doc(db, 'progress', uid));
        const progress = progressDoc.exists() ? progressDoc.data() : {};
        const activities = await getActivitiesByUserId(uid);
        const taskStats = await getTaskStatsByUserId(uid);
        const hoursStudied = activities.reduce((acc, item) => acc + (Number(item.hours) || 0), 0);
        const derivedReadiness = calculateReadiness({
          hoursStudied,
          completedTasks: taskStats.completedTasks,
          totalTasks: taskStats.totalTasks || 1,
        });
        const readinessScore = clampReadiness(toNumber(progress.readinessScore, derivedReadiness));
        const streakDays = toNumber(progress.streakDays, computeStreakFromActivities(activities));
        const completedTasks = toNumber(progress.completedTasks, taskStats.completedTasks);
        const progressLastActive = toMillis(progress.lastActiveDate);
        const lastActivityTime = activities[0]?.createdAt || null;
        const lastActiveAt = lastActivityTime || progressLastActive || null;
        const status = toStatus(lastActiveAt, activities.length);
        const risk = buildRisk({
          readinessScore,
          streakDays,
          status,
          totalActivities: activities.length,
        });

        return {
          id: uid,
          uid,
          name: profile.name || 'Unknown',
          email: profile.email || '',
          targetExam: profile.targetExam || '',
          grade: profile.grade || '',
          hoursLogged: Math.round(hoursStudied * 10) / 10,
          readinessScore,
          streakDays,
          completedTasks,
          totalActivities: activities.length,
          lastActiveAt,
          status,
          isFlagged: risk.isFlagged,
          riskReason: risk.riskReason,
        };
      })
    );

    return mergeStudentsByUid([...students.filter(Boolean), ...localProfiles]);
  } catch (error) {
    return mergeStudentsByUid([...localProfiles, ...DEMO_STUDENTS]);
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
    createdAt: serverTimestamp(),
  };

  const localMirror = {
    id: `demo-task-${userId}-${Date.now()}`,
    userId,
    title: normalizedTitle,
    completed: Boolean(completed),
    createdAt: Date.now(),
  };

  if (!db) {
    writeDemoTask(localMirror);
    return;
  }

  try {
    const taskRef = await addDoc(collection(db, 'tasks'), payload);
    writeDemoTask({ ...localMirror, id: taskRef.id });
    return taskRef;
  } catch (error) {
    writeDemoTask(localMirror);
    return;
  }
}

export function subscribeAllStudents(callback) {
  const fallback = () => callback(mergeStudentsByUid([...readLocalProfiles(), ...DEMO_STUDENTS]));

  if (!db) {
    fallback();
    return () => {};
  }

  let disposed = false;
  let refreshTimer = null;

  const runRefresh = async () => {
    try {
      const students = await getAllStudents();
      if (!disposed) callback(students);
    } catch {
      if (!disposed) fallback();
    }
  };

  const scheduleRefresh = () => {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(runRefresh, 100);
  };

  runRefresh();

  const stopProfiles = onSnapshot(collection(db, 'profiles'), scheduleRefresh, scheduleRefresh);
  const stopProgress = onSnapshot(collection(db, 'progress'), scheduleRefresh, scheduleRefresh);
  const stopActivities = onSnapshot(collection(db, 'activities'), scheduleRefresh, scheduleRefresh);
  const stopTasks = onSnapshot(collection(db, 'tasks'), scheduleRefresh, scheduleRefresh);

  return () => {
    disposed = true;
    if (refreshTimer) window.clearTimeout(refreshTimer);
    stopProfiles();
    stopProgress();
    stopActivities();
    stopTasks();
  };
}

export function subscribeStudentReport(userId, callback) {
  if (!userId) {
    callback({ activities: [], tasks: [] });
    return () => {};
  }

  const refresh = async () => {
    const [activities, tasks] = await Promise.all([
      getActivitiesByUserId(userId),
      getTasksByUserId(userId),
    ]);
    callback({ activities, tasks });
  };

  if (!db) {
    refresh().catch(() => callback({ activities: [], tasks: [] }));
    return () => {};
  }

  let disposed = false;
  let refreshTimer = null;

  const scheduleRefresh = () => {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(async () => {
      if (disposed) return;
      try {
        await refresh();
      } catch {
        if (!disposed) callback({ activities: [], tasks: [] });
      }
    }, 100);
  };

  scheduleRefresh();

  const activitiesRef = collection(db, 'activities');
  const tasksRef = collection(db, 'tasks');

  const stopActivitiesByUserId = onSnapshot(
    query(activitiesRef, where('userId', '==', userId)),
    scheduleRefresh,
    scheduleRefresh
  );
  const stopActivitiesByUid = onSnapshot(
    query(activitiesRef, where('uid', '==', userId)),
    scheduleRefresh,
    scheduleRefresh
  );
  const stopTasksByUserId = onSnapshot(
    query(tasksRef, where('userId', '==', userId)),
    scheduleRefresh,
    scheduleRefresh
  );
  const stopTasksByUid = onSnapshot(
    query(tasksRef, where('uid', '==', userId)),
    scheduleRefresh,
    scheduleRefresh
  );

  return () => {
    disposed = true;
    if (refreshTimer) window.clearTimeout(refreshTimer);
    stopActivitiesByUserId();
    stopActivitiesByUid();
    stopTasksByUserId();
    stopTasksByUid();
  };
}

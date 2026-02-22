import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, hasFirebaseConfig } from '../firebase';

const DEMO_USERS = {
  'admin@email.com': {
    uid: 'demo-admin-uid',
    email: 'admin@email.com',
    displayName: 'Demo Admin',
    role: 'admin',
  },
  'student@email.com': {
    uid: 'demo-student-uid',
    email: 'student@email.com',
    displayName: 'Demo Student',
    role: 'student',
  },
};
const DEMO_SESSION_KEY = 'preplens_demo_auth';
const LOCAL_PROFILES_KEY = 'preplens_local_profiles';
const ENABLE_DEMO_AUTH = import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';
const ADMIN_DEMO_EMAIL = 'admin@email.com';
const ADMIN_DEMO_PASSWORD = 'hello';

function ensureAuthReady() {
  if (!hasFirebaseConfig || !auth) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values in your .env file.');
  }
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function cacheLocalProfile(profile) {
  if (!canUseLocalStorage() || !profile?.uid) return;
  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const next = [
      profile,
      ...parsed.filter((item) => item?.uid !== profile.uid),
    ];
    window.localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(next));
  } catch {
    // No-op if local storage is unavailable.
  }
}

async function ensureUserProfileSync(user, fallbackName = '') {
  if (!user?.uid) return;
  const normalizedEmail = String(user.email || '').toLowerCase();
  const baseProfile = {
    uid: user.uid,
    name: String(fallbackName || user.displayName || '').trim() || 'Student',
    email: normalizedEmail,
    targetExam: '',
    grade: '',
    role: normalizedEmail === ADMIN_DEMO_EMAIL ? 'admin' : 'student',
  };

  cacheLocalProfile(baseProfile);
  if (!db) return;

  try {
    await setDoc(
      doc(db, 'profiles', user.uid),
      {
        name: baseProfile.name,
        email: baseProfile.email,
        targetExam: baseProfile.targetExam,
        grade: baseProfile.grade,
        role: baseProfile.role,
      },
      { merge: true }
    );
    await setDoc(
      doc(db, 'progress', user.uid),
      {
        readinessScore: 0,
        streakDays: 0,
        completedTasks: 0,
      },
      { merge: true }
    );
  } catch (profileError) {
    console.error('Failed to initialize profile/progress for user.', profileError);
  }
}

function getDemoSession() {
  if (!canUseStorage()) return null;
  try {
    // Cleanup legacy key if it exists from older builds that used localStorage.
    if (typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
    }
    const raw = window.sessionStorage.getItem(DEMO_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setDemoSession(user) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
}

function clearDemoSession() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(DEMO_SESSION_KEY);
}

function getRoleFromEmail(email, password) {
  if (!ENABLE_DEMO_AUTH) return null;
  const normalized = String(email || '').trim().toLowerCase();
  const demoUser = DEMO_USERS[normalized] || null;
  if (!demoUser) return null;
  if (String(password || '') !== 'hello') {
    throw new Error('Demo password is "hello" for both demo accounts.');
  }
  return demoUser;
}

function isStrictAdminDemoLogin(email, password) {
  return String(email || '').trim().toLowerCase() === ADMIN_DEMO_EMAIL && String(password || '') === ADMIN_DEMO_PASSWORD;
}

export async function registerStudent({ name, email, password }) {
  const demoUser = getRoleFromEmail(email, password);
  if (demoUser) {
    setDemoSession(demoUser);
    return demoUser;
  }

  ensureAuthReady();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(userCredential.user, { displayName: name });
    }
    await ensureUserProfileSync(userCredential.user, name || email);
    return userCredential.user;
  } catch (error) {
    if (error?.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please use Login instead.');
    }
    throw error;
  }
}

export async function loginStudent({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (isStrictAdminDemoLogin(normalizedEmail, password)) {
    const demoAdmin = DEMO_USERS[ADMIN_DEMO_EMAIL];
    setDemoSession(demoAdmin);
    return demoAdmin;
  }
  if (normalizedEmail === ADMIN_DEMO_EMAIL && String(password || '') !== ADMIN_DEMO_PASSWORD) {
    throw new Error('Admin demo login requires password "hello".');
  }

  if (hasFirebaseConfig && auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      clearDemoSession();
      await ensureUserProfileSync(userCredential.user);
      const role = await resolveRole(userCredential.user);
      return { ...userCredential.user, role };
    } catch (error) {
      const demoUser = getRoleFromEmail(normalizedEmail, password);
      if (demoUser) {
        setDemoSession(demoUser);
        return demoUser;
      }
      if (
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found'
      ) {
        throw new Error('Invalid email or password.');
      }
      throw error;
    }
  }

  const demoUser = getRoleFromEmail(normalizedEmail, password);
  if (demoUser) {
    setDemoSession(demoUser);
    return demoUser;
  }
  throw new Error('Firebase is not configured. Add VITE_FIREBASE_* in .env, or enable VITE_ENABLE_DEMO_AUTH.');
}

export async function logoutStudent() {
  clearDemoSession();
  if (hasFirebaseConfig && auth) {
    await signOut(auth);
  }
}

export async function isAdminUser(uid) {
  if (!db || !uid) return false;

  const rolesDoc = await getDoc(doc(db, 'roles', uid));
  if (rolesDoc.exists()) {
    const rolesData = rolesDoc.data() || {};
    if (rolesData.role === 'admin' || rolesData.isAdmin === true || rolesData.admin === true) {
      return true;
    }
  }

  const profileDoc = await getDoc(doc(db, 'profiles', uid));
  if (!profileDoc.exists()) return false;
  const profileData = profileDoc.data() || {};
  return profileData.role === 'admin' || profileData.isAdmin === true;
}

export async function loginAdmin({ email, password }) {
  const user = await loginStudent({ email, password });
  if (user?.role === 'admin') return user;

  const allowed = await isAdminUser(user.uid);
  if (!allowed) {
    await logoutStudent();
    throw new Error('Unauthorized: admin access required.');
  }
  return { ...user, role: 'admin' };
}

export function getCurrentStudent() {
  const demoSession = getDemoSession();
  if (demoSession) return demoSession;
  return auth?.currentUser || null;
}

export function getCurrentUserRole() {
  const current = getCurrentStudent();
  if (!current) return null;
  const email = String(current.email || '').toLowerCase();
  if (current.uid === DEMO_USERS[ADMIN_DEMO_EMAIL].uid && email === ADMIN_DEMO_EMAIL) return 'admin';
  if (email === 'student@email.com' || current.role === 'student') return 'student';
  return 'student';
}

async function resolveRole(user) {
  if (!user?.uid) return 'student';
  const email = String(user.email || '').toLowerCase();
  if (user.uid === DEMO_USERS[ADMIN_DEMO_EMAIL].uid && email === ADMIN_DEMO_EMAIL) return 'admin';
  const admin = await isAdminUser(user.uid);
  return admin && email === ADMIN_DEMO_EMAIL ? 'admin' : 'student';
}

export function subscribeToStudentAuth(callback) {
  const demoSession = getDemoSession();
  if (demoSession) {
    callback(demoSession);
    return () => {};
  }

  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

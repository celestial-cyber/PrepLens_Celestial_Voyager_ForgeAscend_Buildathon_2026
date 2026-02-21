// Firebase modular SDK v9 configuration and helpers.
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword as fbSignIn,
  signOut as fbSignOut,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

// TODO: replace with your Firebase config (or use env vars)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Auth helper
async function signInWithEmailAndPassword(email, password) {
  return fbSignIn(auth, email, password)
}

const signOut = () => fbSignOut(auth)

// Firestore helpers
const usersCol = collection(db, 'Users')
const activitiesCol = collection(db, 'Activities')
const tasksCol = collection(db, 'Tasks')

async function getUserDoc(uid) {
  const ref = doc(db, 'Users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

async function updateUserReadiness(uid, readiness) {
  const ref = doc(db, 'Users', uid)
  await updateDoc(ref, { readinessScore: readiness })
}

function onAuthState(cb) {
  return onAuthStateChanged(auth, cb)
}

async function getAllStudents() {
  const q = query(usersCol, where('role', '==', 'student'))
  const snaps = await getDocs(q)
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function createTask(task) {
  const payload = { ...task, createdAt: serverTimestamp() }
  return addDoc(tasksCol, payload)
}

export {
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  getUserDoc,
  getAllStudents,
  usersCol,
  activitiesCol,
  tasksCol,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  createTask,
  setDoc,
  updateDoc,
  updateUserReadiness,
  onAuthState,
}

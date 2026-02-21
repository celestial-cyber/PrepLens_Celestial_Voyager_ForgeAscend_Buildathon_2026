import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../../../firebase';

const localMessages = [];
const DEMO_MESSAGES_KEY = 'preplens_demo_messages';

function normalizeMessage(id, data) {
  const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
  return {
    id,
    userId: data.userId || '',
    text: data.text || '',
    from: data.from || 'admin',
    createdAt,
  };
}

export async function appendAdminMessage({ userId, text }) {
  const trimmed = String(text || '').trim();
  if (!userId) throw new Error('Select a student before sending a message.');
  if (!trimmed) throw new Error('Message cannot be empty.');

  const payload = {
    userId,
    text: trimmed,
    from: 'admin',
    createdAt: serverTimestamp(),
  };

  if (!db) {
    const localPayload = { id: `local-${Date.now()}`, ...payload, createdAt: Date.now() };
    localMessages.push(localPayload);
    writeStoredMessage(localPayload);
    return;
  }

  try {
    await addDoc(collection(db, 'messages'), payload);
  } catch (error) {
    if (isPermissionError(error)) {
      const localPayload = { id: `local-${Date.now()}`, ...payload, createdAt: Date.now() };
      localMessages.push(localPayload);
      writeStoredMessage(localPayload);
      return;
    }
    throw error;
  }
}

export function subscribeMessagesForUser(userId, callback) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  if (!db) {
    callback(readStoredMessages(userId));
    return () => {};
  }

  const messagesRef = collection(db, 'messages');
  const messagesQuery = query(messagesRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    messagesQuery,
    (snapshot) => callback(snapshot.docs.map((doc) => normalizeMessage(doc.id, doc.data()))),
    (error) => {
      console.error('Failed to subscribe to messages.', error);
      callback(isPermissionError(error) ? readStoredMessages(userId) : []);
    }
  );
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isPermissionError(error) {
  return error?.code === 'permission-denied' || String(error?.message || '').includes('Missing or insufficient permissions');
}

function readStoredMessages(userId) {
  if (!canUseStorage()) {
    return localMessages.filter((item) => item.userId === userId);
  }

  try {
    const parsed = readAllStoredMessages();
    const merged = [...parsed, ...localMessages];
    return merged.filter((item) => item.userId === userId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return localMessages.filter((item) => item.userId === userId);
  }
}

function writeStoredMessage(message) {
  if (!canUseStorage()) return;
  const existing = readAllStoredMessages();
  window.localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify([message, ...existing]));
}

function readAllStoredMessages() {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(DEMO_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

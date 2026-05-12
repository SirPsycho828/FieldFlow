import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserDocument } from '@/types';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string, displayName: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  return result;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  // Extract refresh token for Calendar sync
  const credential = GoogleAuthProvider.credentialFromResult(result);
  // Note: The refresh token from signInWithPopup may not always be available
  // It's available on first sign-in or when access_type=offline is set
  return { result, credential };
}

export async function signOutUser() {
  return signOut(auth);
}

export async function createUserDocumentIfNeeded(
  user: User,
  refreshToken?: string | null,
): Promise<UserDocument> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() } as unknown as UserDocument;
  }

  const newUserDoc = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    googleRefreshToken: null, // Never stored on user doc directly
    hasGoogleToken: !!refreshToken,
    settings: {
      stalenessThresholdDays: 14,
      calendarSyncEnabled: false,
    },
    businessProfile: null,
  };

  await setDoc(userRef, newUserDoc);

  // Store refresh token in private subcollection if available
  if (refreshToken) {
    await setDoc(doc(db, 'users', user.uid, 'private', 'tokens'), {
      googleRefreshToken: refreshToken,
    });
  }

  return { ...newUserDoc, createdAt: null, updatedAt: null } as unknown as UserDocument;
}

// Map Firebase auth errors to user-friendly messages
export function getAuthErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/wrong-password': 'Incorrect password',
    'auth/user-not-found': 'No account found with this email',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again',
    'auth/popup-closed-by-user': 'Sign-in was cancelled',
    'auth/network-request-failed': 'Network error. Check your connection',
    'auth/invalid-credential': 'Invalid email or password',
  };
  return messages[errorCode] ?? 'An unexpected error occurred. Please try again.';
}

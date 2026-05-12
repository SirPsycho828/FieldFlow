import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createUserDocumentIfNeeded, signOutUser } from '@/lib/auth';
import type { UserDocument } from '@/types';

interface AuthContextType {
  user: User | null;
  userDoc: UserDocument | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userDoc: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up any previous doc listener before setting up a new one
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = undefined;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        // Ensure user document exists
        await createUserDocumentIfNeeded(firebaseUser);

        // Subscribe to user document for real-time updates
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserDoc({ ...snap.data(), uid: snap.id } as unknown as UserDocument);
          }
          setLoading(false);
        });
      } else {
        setUserDoc(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

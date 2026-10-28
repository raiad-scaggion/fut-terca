import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { onValue } from "firebase/database";
import { useEffect, useState, type ReactNode } from "react";
import { emailKey } from "../lib/admin";
import { AuthContext, type AuthState } from "./authContext";
import { auth, dbRef } from "./firebase";

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    // Some phone browsers block popups. The redirect flow works there, at the cost of a page reload.
    if ((error as { code?: string }).code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [adminOf, setAdminOf] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
      }),
    [],
  );

  // The admin flag only decides what the UI shows. The database rules do the real check.
  const email = user?.emailVerified ? user.email : null;
  useEffect(() => {
    if (!email) {
      return undefined;
    }
    return onValue(
      dbRef(`admins/${emailKey(email)}`),
      (snapshot) => setAdminOf(snapshot.val() === true ? email : null),
      () => setAdminOf(null),
    );
  }, [email]);

  const value: AuthState = {
    user,
    isAdmin: email !== null && adminOf === email,
    loading: !authReady,
    signIn: signInWithGoogle,
    signOut: () => signOut(auth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

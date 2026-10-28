import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

// Everything this app stores lives under one root. "fut-terca/live" belongs to the old app.
export const ROOT = "futerca";

export function dbRef(path: string) {
  return ref(db, `${ROOT}/${path}`);
}

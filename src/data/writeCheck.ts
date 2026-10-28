import { serverTimestamp, set } from "firebase/database";
import { dbRef } from "./firebase";

// Writes a harmless marker to prove the database rules let this login write.
export async function checkWriteAccess(uid: string): Promise<boolean> {
  try {
    await set(dbRef("meta/writeCheck"), { by: uid, at: serverTimestamp() });
    return true;
  } catch {
    return false;
  }
}

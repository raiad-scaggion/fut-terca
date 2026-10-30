import { onValue, remove, set } from "firebase/database";
import { useSyncExternalStore } from "react";
import { dbRef } from "./firebase";

type Photos = Record<string, string>;

const NO_PHOTOS: Photos = {};

let photos = NO_PHOTOS;
let started = false;
const listeners = new Set<() => void>();

// One listener for the whole app that never closes. Photos are the heaviest thing in the database,
// and reopening a page must not download them all again.
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    onValue(dbRef("photos"), (snapshot) => {
      photos = (snapshot.val() as Photos | null) ?? NO_PHOTOS;
      listeners.forEach((notify) => notify());
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function usePhotos(): Photos {
  return useSyncExternalStore(subscribe, () => photos);
}

export function savePhoto(playerId: string, photo: string): Promise<void> {
  return set(dbRef(`photos/${playerId}`), photo);
}

export function removePhoto(playerId: string): Promise<void> {
  return remove(dbRef(`photos/${playerId}`));
}

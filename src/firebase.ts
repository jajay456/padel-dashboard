import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

/**
 * Signs in to Firebase Auth with the Google OAuth access token we already
 * have, so Firestore security rules can see `request.auth.token.email`.
 * Without this every Firestore call is anonymous and rules cannot tell an
 * admin apart from anyone else.
 *
 * Needs the Google provider enabled in Firebase Console → Authentication.
 * If the OAuth client lives in a different Google Cloud project, add its
 * client ID under "Safelist client IDs from external projects".
 */
export async function signInFirebase(accessToken: string): Promise<void> {
  await signInWithCredential(auth, GoogleAuthProvider.credential(null, accessToken))
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth)
  } catch {
    /* already signed out */
  }
}

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDa0WbCrYZCsiXm9H_uue4PtMY6ay7KgJc",
  authDomain: "parkirajba-24061.firebaseapp.com",
  projectId: "parkirajba-24061",
  storageBucket: "parkirajba-24061.firebasestorage.app",
  messagingSenderId: "460022511209",
  appId: "1:460022511209:web:fb8408b7e9000dff8854f8"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
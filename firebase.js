import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCoKMczVbMySPJly7-lzt1G8SRgRfGtwAc",
  authDomain: "sapompo-juegounoderoblox.firebaseapp.com",
  databaseURL: "https://sapompo-juegounoderoblox-default-rtdb.firebaseio.com",
  projectId: "sapompo-juegounoderoblox",
  storageBucket: "sapompo-juegounoderoblox.firebasestorage.app",
  messagingSenderId: "997707897073",
  appId: "1:997707897073:web:e0523415bbfc090feff150",
  measurementId: "G-4FLW9DFJYW"
};

export const app = initializeApp(firebaseConfig);
export const dbFirestore = getFirestore(app);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

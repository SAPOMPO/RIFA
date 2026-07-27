// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

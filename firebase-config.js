import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, db, storage, analytics };
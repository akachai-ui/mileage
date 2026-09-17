import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCy-8YZEnmnHxwiNFTOSflwu1vJu0VuLl4",
  authDomain: "mileage-b8aff.firebaseapp.com",
  projectId: "mileage-b8aff",
  storageBucket: "mileage-b8aff.firebasestorage.app",
  messagingSenderId: "474334536023",
  appId: "1:474334536023:web:33bc1bbb41aa7f34461e12",
  measurementId: "G-LGEQZX04ML"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

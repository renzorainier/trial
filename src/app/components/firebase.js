// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBGmvkRN4iFtDH1qcZfpUI7OsNI2FsD3Is",
  authDomain: "trialsys.firebaseapp.com",
  projectId: "trialsys",
  storageBucket: "trialsys.appspot.com",
  messagingSenderId: "165170725706",
  appId: "1:165170725706:web:63fe0a18851ac8e312b7b3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
import { initializeApp, getApps, getApp } from "firebase/app";
import {getAuth} from 'firebase/auth'
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBGmvkRN4iFtDH1qcZfpUI7OsNI2FsD3Is",
    authDomain: "trialsys.firebaseapp.com",
    projectId: "trialsys",
    storageBucket: "trialsys.appspot.com",
    messagingSenderId: "165170725706",
    appId: "1:165170725706:web:63fe0a18851ac8e312b7b3"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  export { auth, db };
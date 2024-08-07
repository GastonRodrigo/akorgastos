import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {

    apiKey: "AIzaSyACm1TP4Sc2IHDtNMTca_bvD_wT75Iw6Pk",
  
    authDomain: "akorgastos.firebaseapp.com",
  
    projectId: "akorgastos",
  
    storageBucket: "akorgastos.appspot.com",
  
    messagingSenderId: "297653818396",
  
    appId: "1:297653818396:web:5d5b951e817681e46bfbd9"
  
  };
  

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

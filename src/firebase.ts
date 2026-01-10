import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase Configuration - Duwaihi Mine System
 * Storage: Moved to Cloudinary (Bypassing KSA Billing Restrictions)
 */

const firebaseConfig = {
  apiKey: "AIzaSyCmQePK1vGhA_HDDWn6Ga1dXWTkb-bg174",
  authDomain: "duwaihi-mine-system.firebaseapp.com",
  projectId: "duwaihi-mine-system",
  storageBucket: "duwaihi-mine-system.firebasestorage.app",
  messagingSenderId: "415527576320",
  appId: "1:415527576320:web:d2d9966304a3b7eb0e89e5"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// تفعيل قاعدة البيانات (Firestore) فقط
export const db = getFirestore(app);

/** * تم إيقاف fbStorage مؤقتاً لتجاوز خطأ الفوترة في السعودية.
 * يتم الآن رفع المرفقات مباشرة إلى Cloudinary عبر بوابة الموظف.
 */
// export const fbStorage = getStorage(app);
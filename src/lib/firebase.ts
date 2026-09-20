import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { api } from './api';

const firebaseConfig = {
  apiKey: 'AIzaSyBzuD3GslwU2eCCksKx5ABB_Izc4AEQ-Z8',
  authDomain: 'menuprodelivr.firebaseapp.com',
  projectId: 'menuprodelivr',
  storageBucket: 'menuprodelivr.firebasestorage.app',
  messagingSenderId: '588623912053',
  appId: '1:588623912053:web:ef957000a57e24f52aac3c',
  measurementId: 'G-JVRJY19NME',
};

// TODO: remplacer par la cle VAPID depuis Firebase Console > Cloud Messaging > Web Push certificates
const VAPID_KEY = 'BMplyk68ofpaoJ1o1qYiyZtY1gL5xwmgug5vRCtQ00BKKq_n5gLUxf04ZnDvXMGMyegubY_Jh6kbqpapVVIKKZI';

const app = initializeApp(firebaseConfig);

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function requestPushToken(): Promise<string | null> {
  try {
    if ((VAPID_KEY as string) === 'REPLACE_ME_WITH_VAPID_KEY') return null;
    if (firebaseConfig.appId.includes('REPLACE_ME')) return null;

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await api.registerFcmToken(token);
    }

    return token;
  } catch {
    return null;
  }
}

export function onForegroundMessage(cb: (payload: any) => void): () => void {
  let unsub = () => {};
  getMessagingInstance().then(messaging => {
    if (!messaging) return;
    unsub = onMessage(messaging, cb);
  });
  return () => unsub();
}

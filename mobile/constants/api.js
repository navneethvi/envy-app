import { Platform } from 'react-native';

// Deployed builds set EXPO_PUBLIC_API_URL (e.g. in Vercel's env vars) to the
// hosted backend. Without it we fall back to the local backend: on web the
// browser shares the host, so localhost works; a physical device needs the
// Mac's LAN IP instead.
const LOCAL_HOST = Platform.OS === 'web' ? 'localhost' : '192.168.1.2';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_HOST}:3001`
).replace(/\/+$/, '');

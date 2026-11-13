import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

const STORAGE_KEY = 'envy:passcode';

// Same defensive load as lib/theme — fall back to in-memory if storage is unavailable.
let storage = null;
try {
  storage = require('@react-native-async-storage/async-storage').default;
} catch {
  storage = null;
}

let passcode = '';
let onLocked = null;

// Every request to the backend goes through this client so it carries the passcode.
export const api = axios.create({ baseURL: `${API_BASE_URL}/api/spend` });

api.interceptors.request.use(config => {
  if (passcode) config.headers['x-passcode'] = passcode;
  return config;
});

export const isPasscodeError = err => err?.response?.status === 401 && err?.response?.data?.code === 'passcode';

// Any request rejected for its passcode (missing, wrong, or changed on the server) locks the app.
api.interceptors.response.use(
  res => res,
  err => {
    if (isPasscodeError(err) && onLocked) onLocked();
    return Promise.reject(err);
  }
);

export function setLockedHandler(fn) { onLocked = fn; }

// Read the saved passcode once at startup, before the first request.
export async function loadPasscode() {
  try {
    if (storage) passcode = (await storage.getItem(STORAGE_KEY)) || '';
  } catch {
    /* keep going without a saved passcode */
  }
}

export async function setPasscode(value) {
  passcode = value || '';
  try {
    if (!storage) return;
    if (passcode) await storage.setItem(STORAGE_KEY, passcode);
    else await storage.removeItem(STORAGE_KEY);
  } catch {
    /* persistence unavailable — keep going in-memory */
  }
}

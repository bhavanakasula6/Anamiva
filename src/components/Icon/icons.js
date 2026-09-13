import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Central Icon Registry
 *
 * Rules:
 * - Canonical keys use kebab-case
 * - Aliases are allowed but should map to canonical meanings
 * - Do NOT remove keys without auditing usage
 */
export const ICONS = {
  /* ==============================
   * Accessibility
   * ============================== */
  disability: {
    lib: MaterialCommunityIcons,
    name: 'wheelchair-accessibility',
  },

  /* ==============================
   * Access / Security
   * ============================== */
  lock: { lib: Feather, name: 'lock' },
  unlock: { lib: Feather, name: 'unlock' },
  shield: { lib: Feather, name: 'shield' },

  /* ==============================
   * Actions
   * ============================== */
  calendar: { lib: Feather, name: 'calendar' },
  chat: { lib: Feather, name: 'message-circle' },
  edit: { lib: Feather, name: 'edit-2' },
  'external-link': { lib: Feather, name: 'external-link' },
  file: { lib: Feather, name: 'file-text' },
  'file-text': { lib: Feather, name: 'file-text' },
  image: { lib: Feather, name: 'image' },
  mail: { lib: Feather, name: 'mail' },
  phone: { lib: Feather, name: 'phone' },
  'phone-off': { lib: Feather, name: 'phone-off' },
  plus: { lib: Feather, name: 'plus' },
  'refresh-cw': { lib: Feather, name: 'refresh-cw' },
  search: { lib: Feather, name: 'search' },
  trash: { lib: Feather, name: 'trash-2' },
  upload: { lib: Feather, name: 'upload' },

  /* ==============================
   * Core Medical
   * ============================== */
  award: { lib: Feather, name: 'award' },
  blood: { lib: MaterialCommunityIcons, name: 'water' },
  briefcase: { lib: MaterialCommunityIcons, name: 'briefcase-outline' },
  doctor: { lib: MaterialCommunityIcons, name: 'doctor' },
  heart: { lib: Feather, name: 'heart' },
  'heart-filled': { lib: MaterialCommunityIcons, name: 'heart' },
  'heart-outline': { lib: MaterialCommunityIcons, name: 'heart-outline' },
  info: { lib: Feather, name: 'info' },
  lightbulb: { lib: MaterialCommunityIcons, name: 'lightbulb-on-outline' },
  pills: { lib: MaterialCommunityIcons, name: 'pill' },
  star: { lib: Feather, name: 'star' },
  'star-filled': { lib: MaterialCommunityIcons, name: 'star' },
  'star-outline': { lib: MaterialCommunityIcons, name: 'star-outline' },
  stethoscope: { lib: MaterialCommunityIcons, name: 'stethoscope' },
  video: { lib: Feather, name: 'video' },
  'video-off': { lib: Feather, name: 'video-off' },

  /* ==============================
   * Data / Analytics
   * ============================== */
  'bar-chart': { lib: Feather, name: 'bar-chart-2' },
  history: { lib: Feather, name: 'history' },
  users: { lib: Feather, name: 'users' },
  wallet: { lib: Feather, name: 'credit-card' },

  /* ==============================
   * Emergency / Location
   * ============================== */
  emergency: { lib: MaterialCommunityIcons, name: 'alert-circle' },
  'alert-circle': { lib: Feather, name: 'alert-circle' },
  'alert-triangle': { lib: Feather, name: 'alert-triangle' },
  'map-pin': { lib: Feather, name: 'map-pin' },

  /* ==============================
   * Status / Indicators
   * ============================== */
  check: { lib: Feather, name: 'check' },
  'check-circle': { lib: Feather, name: 'check-circle' },
  checkCircle: { lib: MaterialCommunityIcons, name: 'check-circle' },
  checkCircleFilled: { lib: MaterialCommunityIcons, name: 'check-circle' },
  'check-square': { lib: Feather, name: 'check-square' },
  close: { lib: Feather, name: 'x' },
  'x-circle': { lib: Feather, name: 'x-circle' },
  success: { lib: Feather, name: 'check-circle' },
  warning: { lib: Feather, name: 'alert-circle' },
  danger: { lib: Feather, name: 'x-circle' },
  camera: { lib: Feather, name: 'camera' },

  /* ==============================
   * Identity
   * ============================== */
  male: { lib: MaterialCommunityIcons, name: 'gender-male' },
  female: { lib: MaterialCommunityIcons, name: 'gender-female' },
  'gender-other': { lib: MaterialCommunityIcons, name: 'gender-transgender' },

  /* ==============================
   * Navigation
   * ============================== */
  back: { lib: Feather, name: 'arrow-left' },
  forward: { lib: Feather, name: 'arrow-right' },
  home: { lib: Feather, name: 'home' },
  bell: { lib: Feather, name: 'bell' },
  'chevron-up': { lib: Feather, name: 'chevron-up' },
  'chevron-down': { lib: Feather, name: 'chevron-down' },
  'chevron-right': { lib: Feather, name: 'chevron-right' },
  'arrow-up': { lib: Feather, name: 'arrow-up' },
  'arrow-down': { lib: Feather, name: 'arrow-down' },
  x: { lib: Feather, name: 'x' },

  /* ==============================
   * Payments
   * ============================== */
  rupee: { lib: MaterialCommunityIcons, name: 'currency-inr' },

  /* ==============================
   * Profile
   * ============================== */
  patient: { lib: MaterialCommunityIcons, name: 'account' },
  profile: { lib: MaterialCommunityIcons, name: 'account-circle' },

  /* ==============================
   * Sections
   * ============================== */
  address: { lib: MaterialCommunityIcons, name: 'map-marker' },
  personalInfo: { lib: MaterialCommunityIcons, name: 'account-details' },

  /* ==============================
   * Time / Progress
   * ============================== */
  clock: { lib: Feather, name: 'clock' },
  mic: { lib: Feather, name: 'mic' },
  'mic-off': { lib: Feather, name: 'mic-off' },
  progress: { lib: MaterialCommunityIcons, name: 'progress-clock' },
  stopwatch: { lib: MaterialCommunityIcons, name: 'timer' },
  timer: { lib: MaterialCommunityIcons, name: 'timer-outline' },

  /* ==============================
   * UI / Settings
   * ============================== */
  globe: { lib: Feather, name: 'globe' },
  settings: { lib: Feather, name: 'settings' },
  'help-circle': { lib: Feather, name: 'help-circle' },
};

/**
 * Emoji fallback – TEMPORARY SAFETY NET
 */
export const EMOJI_FALLBACK = {
  heart: '❤️',
  'heart-outline': '🤍',
  pills: '💊',
  stethoscope: '🩺',
  doctor: '🧑‍⚕️',
  calendar: '📅',
  phone: '📞',
  chat: '💬',
  search: '🔍',
  file: '📄',
  users: '👥',
  wallet: '💰',
  bell: '🔔',
  clock: '🕐',
  timer: '⏳',
  progress: '⏳',
  star: '⭐',
  settings: '⚙️',
  'help-circle': '❓',
  'chevron-right': '→',
  'alert-triangle': '🚨',
  'map-pin': '📍',
};

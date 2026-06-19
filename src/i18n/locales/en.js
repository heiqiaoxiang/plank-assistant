export default {
  app: {
    title: 'Plank Timer'
  },
  modes: {
    classic: 'Classic Plank',
    'side-left': 'Left Side Plank',
    'side-right': 'Right Side Plank'
  },
  timer: {
    status: {
      ready: 'Get Ready',
      inhale: 'Breathe In...',
      hold: 'Hold...',
      exhale: 'Breathe Out...',
      paused: 'Paused',
      completed: 'Done!'
    }
  },
  presets: {
    custom: 'Custom'
  },
  stats: {
    today: 'Today',
    week: 'Week',
    total: 'Total'
  },
  actions: {
    history: 'History',
    leaderboard: 'Ranking',
    settings: 'Settings'
  },
  controls: {
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
    done: 'Done'
  },
  completion: {
    perfect: 'Perfect! 🎯',
    paused: 'Paused {count} times, {duration}s total',
    message: [
      'Amazing! Keep it up!',
      'Fat burned! 💪',
      "You're stronger than yesterday!",
      'Core strength +1!',
      'Workout complete!',
      'Sweat never lies!',
      'Making progress!',
      'Persistence wins!',
      'Perfect finish!',
      'Be proud of yourself!'
    ]
  },
  checkpoint: {
    items: [
      'Check hip position',
      'Shoulders down',
      'Core engaged',
      "Don't sag",
      'Keep breathing'
    ]
  },
  encouragement: [
    'Hang in there!',
    'Go for it!',
    'Hold the form!',
    "You're great!",
    'Keep going!'
  ],
  history: {
    title: 'Training History',
    trend: 'Trend',
    empty: 'No training records',
    noData: 'No data',
    perfect: 'Perfect',
    duration: 's'
  },
  homeHistory: {
    title: 'Recent Training',
    viewAll: 'All',
    empty: 'No training records',
    perfect: 'Perfect'
  },
  leaderboard: {
    title: 'Leaderboard',
    loginRequired: 'Sign in to view rankings',
    registerRequired: 'Sign up to view rankings',
    empty: 'No ranking data yet',
    unavailable: 'Leaderboard unavailable',
    types: {
      total_duration: 'Total Time',
      total_sessions: 'Total Sessions',
      week_duration: 'This Week'
    }
  },
  login: {
    title: 'Sign In / Sign Up',
    registerTitle: 'Create Account',
    register: 'Sign Up',
    signIn: 'Sign In',
    loading: 'Please wait...',
    email: 'Email',
    password: 'Password',
    error: {
      empty: 'Please enter email and password'
    },
    switchToRegister: 'Sign Up',
    switchToLogin: 'Sign In'
  },
  settings: {
    title: 'Settings',
    profile: 'Profile',
    tabs: {
      profile: 'Profile',
      settings: 'Settings'
    },
    language: 'Language',
    voice: 'Voice Guide',
    voiceEnabled: 'Enable Voice',
    voiceType: 'Voice Language',
    voiceName: 'Select Voice',
    voiceVolume: 'Volume',
    voiceTest: 'Test Voice',
    voiceTestBtn: 'Test',
    defaultVoice: 'Default',
    reminders: 'Training Reminders',
    reminderEnabled: 'Daily Reminder',
    account: 'Account',
    login: 'Sign In / Sign Up',
    logout: 'Sign Out',
    nickname: 'Set Nickname',
    sessions: 'Sessions',
    totalTime: 'Total Time',
    guestUser: 'Guest User'
  },
  languages: {
    zh: '简体中文',
    en: 'English'
  },
  voiceTypes: {
    zh: 'Chinese',
    en: 'English'
  },
  voice: {
    inhale: 'Breathe in',
    hold: 'Hold',
    exhale: 'Breathe out',
    checkpoint: [
      'Check hip position',
      'Shoulders down',
      'Core engaged',
      "Don't sag",
      'Keep breathing'
    ]
  },
  customTime: {
    title: 'Set Duration',
    confirm: 'Confirm',
    cancel: 'Cancel'
  },
  sync: {
    syncing: 'Syncing...',
    pending: '{count} pending'
  },
  guide: [
    'Lower back aching? Imagine someone splashing water on your belly — brace your core!',
    'Hips sagging? Picture a string pulling your head up — keep that spine straight!',
    'Can\'t feel your abs? Draw your navel toward your spine, like you\'re wearing a corset!',
    'Hips rising? Squeeze and tuck like you\'re stopping mid-flow — reset right now!',
    'Shoulders burning? Push your shoulder blades toward your hips — instant relief!',
    'Shoulders creeping up? Slide them away from your ears and press them down!',
    'Neck tiring? Gently tuck your chin as if holding a tennis ball — eyes on the floor!',
    'Can\'t catch your breath? Inhale slowly through your mouth like sipping through a straw!',
    'Elbows hurting? Fold a towel under your forearms for extra cushioning!',
    'Body wobbling? Feet shoulder-width apart — plant them like tree roots!'
  ],
  errors: {
    supabaseNotConfigured: 'Supabase not configured',
    logoutFailed: 'Logout failed, please try again',
    saveFailed: 'Save failed, please try again'
  }
};

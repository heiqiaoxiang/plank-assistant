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
    perfect: 'Perfect',
    duration: 's'
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
    title: 'Sign in to view rankings',
    register: 'Sign Up',
    signIn: 'Sign In',
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
    voiceVolume: 'Volume',
    reminders: 'Training Reminders',
    reminderEnabled: 'Daily Reminder',
    account: 'Account',
    logout: 'Sign Out',
    nickname: 'Set Nickname',
    sessions: 'Sessions',
    totalTime: 'Total Time'
  },
  languages: {
    zh: '简体中文',
    en: 'English',
    yue: '粤语'
  },
  voiceTypes: {
    zh: 'Chinese',
    en: 'English',
    yue: 'Cantonese'
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
  errors: {
    supabaseNotConfigured: 'Supabase not configured'
  }
};

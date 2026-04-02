export default {
  app: {
    title: '平板支撐助手'
  },
  modes: {
    classic: '經典平板支撐',
    'side-left': '左側平板支撐',
    'side-right': '右側平板支撐'
  },
  timer: {
    status: {
      ready: '準備開始',
      inhale: '吸氣...',
      hold: '屏息...',
      exhale: '呼氣...',
      paused: '已暫停',
      completed: '完成！'
    }
  },
  presets: {
    custom: '自訂'
  },
  stats: {
    today: '今日',
    week: '本週',
    total: '總時長'
  },
  actions: {
    history: '訓練記錄',
    leaderboard: '排行',
    settings: '設定'
  },
  controls: {
    start: '開始',
    pause: '暫停',
    resume: '繼續',
    reset: '重設',
    done: '完成'
  },
  completion: {
    perfect: '完美完成 🎯',
    paused: '暫停 {count} 次，共 {duration} 秒',
    message: [
      '太棒了！繼續保持！',
      '燃脂成功！💪',
      '今日的你比昨日更強大！',
      '核心力量+1！',
      '健身打卡完成！',
      '汗水唔會呃人！',
      '又有進步！',
      '堅持就係勝利！',
      '完美收官！',
      '值得驕傲！'
    ]
  },
  checkpoint: {
    items: [
      '檢查臀部位置',
      '肩部下沉',
      '核心收緊',
      '唔好塌腰',
      '保持呼吸節奏'
    ]
  },
  encouragement: [
    '堅持住！',
    '加油！',
    '保持姿勢！',
    '你好勁！',
    '繼續！'
  ],
  history: {
    title: '訓練記錄',
    trend: '趨勢',
    empty: '暫無訓練記錄',
    perfect: '完美',
    duration: '秒'
  },
  leaderboard: {
    title: '排行榜',
    loginRequired: '登入後查看排行榜',
    registerRequired: '註冊後查看排行榜',
    empty: '暫無排行數據',
    unavailable: '排行榜暫不可用',
    types: {
      total_duration: '總時長',
      total_sessions: '總次數',
      week_duration: '本週'
    }
  },
  login: {
    title: '登入後查看排行榜',
    register: '註冊',
    signIn: '登入',
    email: '電郵',
    password: '密碼',
    error: {
      empty: '請輸入電郵和密碼'
    },
    switchToRegister: '註冊',
    switchToLogin: '登入'
  },
  settings: {
    title: '設定',
    profile: '個人',
    tabs: {
      profile: '個人',
      settings: '設定'
    },
    language: '語言',
    voice: '語音播報',
    voiceEnabled: '啟用語音',
    voiceType: '播報語言',
    voiceVolume: '音量',
    reminders: '訓練提醒',
    reminderEnabled: '每日提醒',
    account: '帳戶',
    logout: '登出',
    nickname: '設定暱稱',
    sessions: '訓練次數',
    totalTime: '累計時長',
    guestUser: '遊客用戶'
  },
  languages: {
    zh: '簡體中文',
    en: 'English',
    yue: '粵語'
  },
  voiceTypes: {
    zh: '中文',
    en: 'English',
    yue: '粵語'
  },
  voice: {
    inhale: '吸氣',
    hold: '屏息',
    exhale: '呼氣',
    checkpoint: [
      '檢查臀部位置',
      '肩部下沉',
      '核心收緊',
      '唔好塌腰',
      '保持呼吸節奏'
    ]
  },
  customTime: {
    title: '設定時長',
    confirm: '確認',
    cancel: '取消'
  },
  errors: {
    supabaseNotConfigured: 'Supabase 未配置',
    logoutFailed: '登出失敗，請重試'
  }
};

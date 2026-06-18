export default {
  app: {
    title: '平板支撑助手'
  },
  modes: {
    classic: '经典平板支撑',
    'side-left': '左侧平板支撑',
    'side-right': '右侧平板支撑'
  },
  timer: {
    status: {
      ready: '准备开始',
      inhale: '吸气...',
      hold: '屏息...',
      exhale: '呼气...',
      paused: '已暂停',
      completed: '完成！'
    }
  },
  presets: {
    custom: '自定义'
  },
  stats: {
    today: '今日',
    week: '本周',
    total: '总时长'
  },
  actions: {
    history: '训练记录',
    leaderboard: '排行',
    settings: '设置'
  },
  controls: {
    start: '开始',
    pause: '暂停',
    resume: '继续',
    reset: '重置',
    done: '完成'
  },
  completion: {
    perfect: '完美完成 🎯',
    paused: '暂停 {count} 次，共 {duration} 秒',
    message: [
      '太棒了！继续保持！',
      '燃脂成功！💪',
      '今天的你比昨天更强大！',
      '核心力量+1！',
      '健身打卡完成！',
      '汗水不会骗人！',
      '又进步了！',
      '坚持就是胜利！',
      '完美收官！',
      '值得骄傲！'
    ]
  },
  checkpoint: {
    items: [
      '检查臀部位置',
      '肩部下沉',
      '核心收紧',
      '不要塌腰',
      '保持呼吸节奏'
    ]
  },
  encouragement: [
    '坚持住！',
    '加油！',
    '保持姿势！',
    '你很棒！',
    '继续！'
  ],
  history: {
    title: '训练记录',
    trend: '趋势',
    empty: '暂无训练记录',
    noData: '暂无数据',
    perfect: '完美',
    duration: '秒'
  },
  leaderboard: {
    title: '排行榜',
    loginRequired: '登录后查看排行榜',
    registerRequired: '注册后查看排行榜',
    empty: '暂无排行数据',
    unavailable: '排行榜暂不可用',
    types: {
      total_duration: '总时长',
      total_sessions: '总次数',
      week_duration: '本周'
    }
  },
  login: {
    title: '登录后查看排行榜',
    register: '注册',
    signIn: '登录',
    loading: '请稍候...',
    email: '邮箱',
    password: '密码',
    error: {
      empty: '请输入邮箱和密码'
    },
    switchToRegister: '注册',
    switchToLogin: '登录'
  },
  settings: {
    title: '设置',
    profile: '个人',
    tabs: {
      profile: '个人',
      settings: '设置'
    },
    language: '语言',
    voice: '语音播报',
    voiceEnabled: '启用语音',
    voiceType: '播报语言',
    voiceName: '选择语音',
    voiceVolume: '音量',
    voiceTest: '试听',
    voiceTestBtn: '测试语音',
    defaultVoice: '默认',
    reminders: '训练提醒',
    reminderEnabled: '每日提醒',
    account: '账户',
    logout: '退出登录',
    nickname: '设置昵称',
    sessions: '训练次数',
    totalTime: '累计时长',
    guestUser: '游客用户'
  },
  languages: {
    zh: '简体中文',
    en: 'English',
    yue: '粤语'
  },
  voiceTypes: {
    zh: '中文',
    en: 'English',
    yue: '粤语'
  },
  voice: {
    inhale: '吸气',
    hold: '屏息',
    exhale: '呼气',
    checkpoint: [
      '检查臀部位置',
      '肩部下沉',
      '核心收紧',
      '不要塌腰',
      '保持呼吸节奏'
    ]
  },
  customTime: {
    title: '设置时长',
    confirm: '确认',
    cancel: '取消'
  },
  sync: {
    syncing: '同步中...',
    pending: '{count} 条待同步'
  },
  guide: [
    '腰酸了？假装有人朝你肚子泼水，腹肌瞬间收紧',
    '腰塌了？想象头顶有绳子把你往上拽，保持挺直！',
    '腹部没感觉？肚脐向脊柱收紧，像穿紧身衣！',
    '臀部翘起来了？收紧找憋尿的感觉，马上归位！',
    '肩膀酸了？把肩胛骨向臀部推送，瞬间放松！',
    '肩膀耸起来了？让肩膀远离耳朵，保持下沉！',
    '脖子累了？下巴轻夹隐形网球，目视地面！',
    '喘不上气？用嘴像吸管吸气，缓慢呼出！',
    '手肘疼？前臂垫个毛巾，缓冲一下！',
    '身体晃了？双脚与肩同宽，像木桩一样站稳！'
  ],
  errors: {
    supabaseNotConfigured: 'Supabase 未配置',
    logoutFailed: '退出登录失败，请重试'
  }
};

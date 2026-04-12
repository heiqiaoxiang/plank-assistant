const SETTINGS_KEY = 'plank_voice_settings';

// 粤语关键词（需要排除的语音）
const CANTONESE_KEYWORDS = [
  'sin-ji', 'Siu-Chun', 'Ka Ling', 'Jia-Ling',
  '婷婷', 'Ting-Ting', 'Yan-Yan', 'Man-Man',
  'hong', 'aiting'
];

// 普通话关键词（优先选择的语音）
const MANDARIN_KEYWORDS = [
  'Tian-Tian', 'Mei-Jia', 'Huihui', 'Yaoyao',
  'Kangkang', 'mingming', 'zhenzhu', 'xiaoyan'
];

const DEFAULT_SETTINGS = {
  enabled: true,
  language: 'zh',
  volume: 80,
  voiceId: null
};

const SPEECH_LANG_MAP = {
  zh: 'zh-CN',
  en: 'en-US'
};

class VoiceManager {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.enabled = DEFAULT_SETTINGS.enabled;
    this.language = DEFAULT_SETTINGS.language;
    this.volume = DEFAULT_SETTINGS.volume;
    this.voiceId = DEFAULT_SETTINGS.voiceId;
    this.voices = [];
    this.initialized = false;
    this.userInteracted = false;
  }

  async init() {
    if (!this.synth) return;

    this.loadSettings();

    // 移动浏览器需要在用户交互后才能初始化语音
    // 所以这里只加载设置，实际语音列表在第一次用户交互后获取
    this.initialized = true;
  }

  // 在用户交互后调用（如点击开始按钮）
  async initAfterUserInteraction() {
    if (!this.synth || this.userInteracted) return;

    this.userInteracted = true;

    if ('speechSynthesis' in window) {
      // 尝试获取语音列表
      this.voices = this.synth.getVoices();

      // 如果为空，等待 voiceschanged 事件
      if (this.voices.length === 0) {
        return new Promise(resolve => {
          const handleVoicesChanged = () => {
            this.voices = this.synth.getVoices();
            this.synth.onvoiceschanged = null;
            this.logAvailableVoices();
            resolve();
          };

          this.synth.onvoiceschanged = handleVoicesChanged;

          // 超时处理：某些浏览器可能不触发 onvoiceschanged
          setTimeout(() => {
            this.voices = this.synth.getVoices();
            this.synth.onvoiceschanged = null;
            this.logAvailableVoices();
            resolve();
          }, 1000);
        });
      }

      this.logAvailableVoices();
    }
  }

  logAvailableVoices() {
    if (this.voices.length === 0) return;

    console.log('[Voice] Available voices:');
    this.voices
      .filter(v => v.lang && (v.lang.startsWith('zh') || v.lang.startsWith('en')))
      .forEach((v, i) => {
        const isCantonese = CANTONESE_KEYWORDS.some(k =>
          v.name.toLowerCase().includes(k.toLowerCase())
        );
        const marker = isCantonese ? ' [CANTONESE]' : '';
        console.log(`  ${i}: ${v.name} (${v.lang})${v.default ? ' [default]' : ''}${marker}`);
      });
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        this.enabled = settings.enabled ?? DEFAULT_SETTINGS.enabled;
        this.language = settings.language || DEFAULT_SETTINGS.language;
        this.volume = settings.volume ?? DEFAULT_SETTINGS.volume;
        this.voiceId = settings.voiceId ?? DEFAULT_SETTINGS.voiceId;
      }
    } catch (e) {
      console.warn('[Voice] Failed to load settings:', e.message);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        enabled: this.enabled,
        language: this.language,
        volume: this.volume,
        voiceId: this.voiceId
      }));
    } catch (e) {
      console.warn('[Voice] Failed to save settings:', e.message);
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.saveSettings();
    if (!enabled) {
      this.cancel();
    }
  }

  setLanguage(lang) {
    if (SPEECH_LANG_MAP[lang]) {
      this.language = lang;
      this.saveSettings();
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, volume));
    this.saveSettings();
  }

  getSpeechLang() {
    return SPEECH_LANG_MAP[this.language] || SPEECH_LANG_MAP.zh;
  }

  speak(text) {
    if (!this.enabled || !this.synth || !this.initialized) return;

    this.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    const targetLang = this.getSpeechLang();

    const voice = this.findBestVoice(targetLang);
    if (voice) {
      utter.voice = voice;
      // 强制设置语言代码，iOS 需要这个
      utter.lang = targetLang;
      console.log(`[Voice] Using voice: ${voice.name} (${voice.lang}), utter.lang: ${targetLang}`);
    } else {
      utter.lang = targetLang;
      console.log(`[Voice] No voice found, using lang: ${targetLang}`);
    }

    // iOS Safari 兼容性：确保属性设置成功
    console.log(`[Voice] Final utter.lang: ${utter.lang}, utter.voice: ${utter.voice?.name || 'null'}`);

    utter.rate = 1.1;
    utter.pitch = 1;
    utter.volume = this.volume / 100;

    this.synth.speak(utter);
  }

  getVoicesByLanguage(lang) {
    if (!this.voices || this.voices.length === 0) {
      console.warn('[Voice] Voices not loaded yet');
      return [];
    }

    const speechLang = SPEECH_LANG_MAP[lang] || SPEECH_LANG_MAP.zh;
    const langPrefix = speechLang.split('-')[0];

    let voices = this.voices.filter(v => {
      if (!v.lang) return false;
      const voiceLang = v.lang.toLowerCase().replace('_', '-');
      const targetLang = speechLang.toLowerCase();
      return voiceLang === targetLang || voiceLang.startsWith(langPrefix);
    });

    console.log('[Voice] Filtered voices for', lang, ':', voices.length, 'of', this.voices.length);

    if (lang === 'zh') {
      voices = voices.filter(v => {
        return v.name.includes('中文（中国大陆）');
      });
      console.log('[Voice] After mainland China filter:', voices.length);
    } else if (lang === 'en') {
      voices = voices.filter(v => {
        return v.name.includes('英语（美国）');
      });
      console.log('[Voice] After English US filter:', voices.length);
    }

    return voices.map(v => ({
      name: v.name,
      lang: v.lang,
      default: v.default,
      localService: v.localService,
      voiceURI: v.voiceURI
    }));
  }

  getVoiceById(voiceId) {
    if (!voiceId) return null;
    return this.voices.find(v => v.name === voiceId) || null;
  }

  setVoice(voiceId) {
    this.voiceId = voiceId;
    this.saveSettings();
  }

  testVoice() {
    if (!this.synth) return;

    const testTexts = {
      zh: '这是语音测试',
      en: 'Voice test'
    };

    const text = testTexts[this.language] || testTexts.zh;
    this.speak(text);
  }

  findBestVoice(targetLang) {
    if (!this.voices.length) return null;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // iOS 上需要避免有问题的语音
    const problematicVoices = isIOS ? ['Samantha', 'Fred', 'Vicki', 'Victoria', 'Alex'] : [];

    if (this.voiceId) {
      const selectedVoice = this.getVoiceById(this.voiceId);
      if (selectedVoice) {
        console.log(`[Voice] Using selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
        return selectedVoice;
      }
    }

    const exactMatch = this.voices.find(v => v.lang === targetLang);
    if (exactMatch) {
      if (targetLang === 'zh-CN' && isIOS) {
        const voiceName = exactMatch.name.toLowerCase();
        if (CANTONESE_KEYWORDS.some(k => voiceName.includes(k.toLowerCase()))) {
          console.log(`[Voice] Skipping ${exactMatch.name} (Cantonese on iOS)`);
        } else {
          return exactMatch;
        }
      } else if (targetLang === 'en-US' && isIOS) {
        // iOS 英文模式避免某些有问题的语音
        if (problematicVoices.some(p => exactMatch.name.toLowerCase().includes(p.toLowerCase()))) {
          console.log(`[Voice] Skipping ${exactMatch.name} (problematic on iOS)`);
        } else {
          return exactMatch;
        }
      } else {
        return exactMatch;
      }
    }

    const langPriority = {
      'zh-CN': ['zh-CN', 'zh', 'zh-TW'],
      'zh-HK': ['zh-HK', 'zh', 'zh-TW'],
      'en-US': ['en-US', 'en-GB', 'en'],
    };

    const priorities = langPriority[targetLang];
    if (priorities) {
      for (const lang of priorities) {
        let matches = this.voices.filter(v => v.lang === lang || v.lang.startsWith(lang + '-'));

        if (targetLang === 'zh-CN') {
          matches = matches.filter(v => {
            const name = v.name.toLowerCase();
            return !CANTONESE_KEYWORDS.some(k => name.includes(k.toLowerCase()));
          });
        }

        if (targetLang === 'en-US' && isIOS) {
          matches = matches.filter(v => {
            const name = v.name.toLowerCase();
            return !problematicVoices.some(p => name.includes(p.toLowerCase()));
          });
        }

        if (targetLang === 'zh-CN' && matches.length > 0) {
          const mandarinVoice = matches.find(v =>
            MANDARIN_KEYWORDS.some(k => v.name.toLowerCase().includes(k.toLowerCase()))
          );
          if (mandarinVoice) {
            console.log(`[Voice] Found Mandarin voice: ${mandarinVoice.name}`);
            return mandarinVoice;
          }
        }

        if (matches.length > 0) {
          console.log(`[Voice] Selected: ${matches[0].name} (${matches[0].lang})`);
          return matches[0];
        }
      }
    }

    const prefix = targetLang.split('-')[0];
    const prefixMatch = this.voices.find(v => v.lang.startsWith(prefix));
    if (prefixMatch) return prefixMatch;

    return this.voices[0];
  }

  cancel() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  isSupported() {
    return 'speechSynthesis' in window;
  }
}

export const voiceManager = new VoiceManager();

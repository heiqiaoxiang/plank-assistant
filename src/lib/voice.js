const SETTINGS_KEY = 'plank_voice_settings';

const DEFAULT_SETTINGS = {
  enabled: true,
  language: 'zh',
  volume: 80
};

const SPEECH_LANG_MAP = {
  zh: 'zh-CN',
  en: 'en-US',
  yue: 'zh-HK'
};

class VoiceManager {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.enabled = DEFAULT_SETTINGS.enabled;
    this.language = DEFAULT_SETTINGS.language;
    this.volume = DEFAULT_SETTINGS.volume;
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
            resolve();
          };

          this.synth.onvoiceschanged = handleVoicesChanged;

          // 超时处理：某些浏览器可能不触发 onvoiceschanged
          setTimeout(() => {
            this.voices = this.synth.getVoices();
            this.synth.onvoiceschanged = null;
            resolve();
          }, 1000);
        });
      }
    }
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        this.enabled = settings.enabled ?? DEFAULT_SETTINGS.enabled;
        this.language = settings.language || DEFAULT_SETTINGS.language;
        this.volume = settings.volume ?? DEFAULT_SETTINGS.volume;
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
        volume: this.volume
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
      utter.lang = voice.lang;
    } else {
      utter.lang = targetLang;
    }
    
    utter.rate = 1.1;
    utter.pitch = 1;
    utter.volume = this.volume / 100;
    
    this.synth.speak(utter);
  }

  findBestVoice(targetLang) {
    if (!this.voices.length) return null;
    
    const exactMatch = this.voices.find(v => v.lang === targetLang);
    if (exactMatch) return exactMatch;
    
    const prefixMatch = this.voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
    if (prefixMatch) return prefixMatch;
    
    const fallbackMap = {
      'zh-HK': 'zh-CN',
      'zh-CN': 'zh-TW'
    };
    
    const fallback = fallbackMap[targetLang];
    if (fallback) {
      const fbMatch = this.voices.find(v => v.lang === fallback);
      if (fbMatch) return fbMatch;
    }
    
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

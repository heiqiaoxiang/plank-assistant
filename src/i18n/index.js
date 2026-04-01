const DEFAULT_LOCALE = 'zh';
const STORAGE_KEY = 'plank_locale';

const locales = {
  zh: 'zh-CN',
  en: 'en-US',
  yue: 'zh-HK'
};

class I18n {
  constructor() {
    this.currentLocale = this.loadLocale();
    this.translations = {};
    this.loaded = false;
  }

  async init() {
    await this.loadTranslations(this.currentLocale);
    this.loaded = true;
  }

  loadLocale() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && locales[stored]) {
        return stored;
      }
    } catch (e) {
      console.warn('[i18n] Failed to load locale:', e.message);
    }
    return DEFAULT_LOCALE;
  }

  saveLocale(locale) {
    if (!locales[locale]) return;
    this.currentLocale = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (e) {
      console.warn('[i18n] Failed to save locale:', e.message);
    }
  }

  async loadTranslations(locale) {
    try {
      const module = await import(`./locales/${locale}.js`);
      this.translations = module.default;
      this.updateDOM();
    } catch (e) {
      console.error(`[i18n] Failed to load ${locale}:`, e);
      if (locale !== DEFAULT_LOCALE) {
        await this.loadTranslations(DEFAULT_LOCALE);
      }
    }
  }

  async setLocale(locale) {
    if (!locales[locale]) {
      console.warn(`[i18n] Unknown locale: ${locale}`);
      return;
    }
    this.saveLocale(locale);
    await this.loadTranslations(locale);
  }

  getLocale() {
    return this.currentLocale;
  }

  getSpeechLang() {
    return locales[this.currentLocale] || locales[DEFAULT_LOCALE];
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    if (typeof value === 'string') {
      return this.interpolate(value, params);
    }
    
    return key;
  }

  interpolate(str, params) {
    return str.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
    document.documentElement.lang = locales[this.currentLocale] || 'zh-CN';
  }
}

export const i18n = new I18n();
export { locales };

import { supabase, STORAGE_KEY } from '../lib/supabase.js';
import { signInWithEmail, signUpWithEmail, signOut as authSignOut } from '../lib/auth.js';
import { voiceManager } from '../lib/voice.js';
import { i18n } from '../i18n/index.js';
import Chart from 'chart.js/auto';
import { AudioManager } from './audio.js';
import { debounce, getRandomItem } from './utils.js';
import {
  INHALE_TIME, HOLD_TIME, EXHALE_TIME, PROGRESS_RING_CIRCUMFERENCE,
  HISTORY_LIMIT, ENCOURAGEMENT_FIRST_DELAY, ENCOURAGEMENT_INTERVAL,
  MIN_DURATION_FOR_ENCOURAGEMENT, SYNC_RETRY_INTERVAL, SW_UPDATE_INTERVAL,
  CHECKPOINT_INTERVAL, CHECKPOINT_FIRST_OFFSET, GUIDE_INTERVAL, GUIDE_DISPLAY_TIME,
  MODE_NAMES, COMPLETION_MESSAGES, ENCOURAGEMENT_MESSAGES, CHECKPOINT_MESSAGES, GUIDE_MESSAGES
} from './constants.js';

class PlankApp {
  constructor() {
    this.state = {
      mode: 'classic',
      duration: 60,
      timeLeft: 60,
      isRunning: false,
      isPaused: false,
      intervalId: null,
      breathPhase: 'ready',
      breathTimeoutIds: [],
      pauseStartTime: null,
      pausedIntervals: [],
      totalPausedTime: 0,
      checkpointTimeoutIds: [],
      encouragementTimeoutId: null,
      encouragementIntervalId: null,
      autoCloseTimeout: null,
      guideIntervalId: null,
      guideTimeoutId: null,
      isLoginMode: true,
      syncRetryIntervalId: null,
      isSyncing: false
    };

    this.audioManager = new AudioManager();
    this.userId = null;
    this.data = this.loadData();
    this.syncPending = this.loadPendingSync();
    this.authSubscription = null;
    this.syncLock = false;
    this.saveNicknameDebounced = debounce((nickname) => this.saveNickname(nickname), 500);

    this.initElements();
    this.bindEvents();
    this.updateStats();
    this.renderModeSelector();
    this.initI18n();
    this.initVoice();

    this.init();
  }

  async init() {
    await this.updateUserBtn();
    await this.initSupabase();
  }

  async initI18n() {
    await i18n.init();
    this.applyI18n();
  }

  applyI18n() {
    document.querySelectorAll('.mode-option span:last-child').forEach(el => {
      const mode = el.closest('.mode-option')?.dataset.mode;
      if (mode) {
        el.textContent = i18n.t(`modes.${mode}`);
      }
    });

    const modeText = this.els.modeText;
    if (modeText) {
      modeText.textContent = i18n.t(`modes.${this.state.mode}`);
    }

    this.els.presets.forEach(preset => {
      const time = preset.dataset.time;
      if (time === 'custom') {
        preset.textContent = i18n.t('presets.custom');
      }
    });

    this.els.breathText.textContent = i18n.t('timer.status.ready');
    const todayLabel = this.els.todayCount.closest('.stat-item')?.querySelector('.stat-label');
    if (todayLabel) todayLabel.textContent = i18n.t('stats.today');
    const weekLabel = this.els.weekCount.closest('.stat-item')?.querySelector('.stat-label');
    if (weekLabel) weekLabel.textContent = i18n.t('stats.week');
    const totalLabel = this.els.totalTime.closest('.stat-item')?.querySelector('.stat-label');
    if (totalLabel) totalLabel.textContent = i18n.t('stats.total');

    this.els.startBtn.textContent = i18n.t('controls.start');

    if (this.els.loginTitle) {
      this.els.loginTitle.textContent = i18n.t('leaderboard.loginRequired');
    }

    document.title = i18n.t('app.title');
  }

  async initVoice() {
    await voiceManager.init();
    this.els.voiceEnabled.checked = voiceManager.enabled;
    this.els.voiceType.value = voiceManager.language;

    const currentLangBtn = document.querySelector(`.lang-btn[data-lang="${i18n.getLocale()}"]`);
    if (currentLangBtn) {
      currentLangBtn.classList.add('active');
    }
  }

  loadPendingSync() {
    try {
      const stored = localStorage.getItem('plank_pending_sync');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('[App] Failed to load pending sync:', e.message);
      return [];
    }
  }

  savePendingSync() {
    try {
      localStorage.setItem('plank_pending_sync', JSON.stringify(this.syncPending));
    } catch (e) {
      console.warn('[App] Failed to save pending sync:', e.message);
    }
  }

  async initSupabase() {
    if (!supabase) {
      console.log('[App] Supabase not configured, local-only mode');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        this.userId = session.user.id;
        await this.syncPendingSessions();
        await this.mergeCloudStats();
      } else {
        await this.signInAnonymously();
      }

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          this.userId = session.user.id;
          await this.syncPendingSessions();
          await this.mergeCloudStats();
        }
        await this.updateUserBtn();
      });
      this.authSubscription = data.subscription;

      this._onlineHandler = () => {
        this.syncPendingSessions();
        this.mergeCloudStats();
        this.startSyncRetry();
      };
      window.addEventListener('online', this._onlineHandler);
    } catch (err) {
      console.warn('Supabase init failed (offline mode):', err.message);
    }

    this.updateSyncIndicator();
    if (this.syncPending.length > 0) {
      this.startSyncRetry();
    }
  }

  async signInAnonymously() {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      this.userId = data.user.id;
    } catch (err) {
      console.warn('[App] Anonymous sign-in failed:', err.message);
    }
  }

  async syncPendingSessions() {
    if (!this.userId || !navigator.onLine || this.syncPending.length === 0) return;
    if (this.state.isSyncing || this.syncLock) return;

    this.syncLock = true;
    this.state.isSyncing = true;
    this.updateSyncIndicator();

    const toSync = [...this.syncPending];
    let hasErrors = false;

    try {
      for (const session of toSync) {
        try {
          const { error } = await supabase.from('sessions').insert({
            user_id: session.userId || this.userId,
            duration: session.duration,
            mode: session.mode,
            paused_count: session.pausedCount
          });
          if (!error) {
            this.syncPending = this.syncPending.filter(s => s.date !== session.date);
          } else {
            hasErrors = true;
          }
        } catch (err) {
          console.warn('[App] Sync failed for session:', err.message);
          hasErrors = true;
        }
      }
    } finally {
      this.savePendingSync();
      this.state.isSyncing = false;
      this.syncLock = false;
      this.updateSyncIndicator();
    }

    if (hasErrors && this.syncPending.length > 0) {
      this.startSyncRetry();
    } else {
      this.stopSyncRetry();
    }
  }

  async syncSessionToCloud(sessionData) {
    if (!this.userId) return;

    try {
      const { error } = await supabase.from('sessions').insert({
        user_id: this.userId,
        duration: sessionData.duration,
        mode: sessionData.mode,
        paused_count: sessionData.pausedCount
      });
      if (error) throw error;
      this.stopSyncRetry();
    } catch (err) {
      console.warn('[App] Sync session failed:', err.message);
      this.syncPending.push({ ...sessionData, userId: this.userId });
      this.savePendingSync();
      this.startSyncRetry();
    }
  }

  async mergeCloudStats() {
    if (!this.userId || !navigator.onLine) return;

    try {
      const { data, error } = await supabase.rpc('get_user_stats', { p_user_id: this.userId });
      if (error) throw error;

      if (data && data.length > 0) {
        const cloudStats = data[0];
        if (cloudStats.total_sessions > this.data.history?.length) {
          this.data.todayCount = cloudStats.today_count || 0;
          this.data.totalTime = cloudStats.total_duration || 0;
          this.saveData();
          this.updateStats();
        }
      }
    } catch (err) {
      console.warn('[App] Failed to merge cloud stats:', err.message);
    }
  }

  startSyncRetry() {
    if (this.state.syncRetryIntervalId) return;
    if (this.syncPending.length === 0) return;

    this.state.syncRetryIntervalId = setInterval(() => {
      if (navigator.onLine && !this.state.isSyncing) {
        this.syncPendingSessions();
      }
    }, SYNC_RETRY_INTERVAL);
  }

  stopSyncRetry() {
    if (this.state.syncRetryIntervalId) {
      clearInterval(this.state.syncRetryIntervalId);
      this.state.syncRetryIntervalId = null;
    }
  }

  updateSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) return;

    if (this.syncPending.length === 0) {
      indicator.style.display = 'none';
    } else if (this.state.isSyncing) {
      indicator.style.display = 'flex';
      indicator.textContent = '同步中...';
      indicator.classList.add('syncing');
    } else {
      indicator.style.display = 'flex';
      indicator.textContent = `${this.syncPending.length} 条待同步`;
      indicator.classList.remove('syncing');
    }
  }

  initElements() {
    this.els = {
      timerDisplay: document.getElementById('timerDisplay'),
      breathRing: document.querySelector('.breath-ring'),
      breathText: document.getElementById('breathText'),
      startBtn: document.getElementById('startBtn'),
      resetBtn: document.getElementById('resetBtn'),
      modeBtn: document.getElementById('modeBtn'),
      modeText: document.getElementById('modeText'),
      modeSelector: document.getElementById('modeSelector'),
      presets: document.querySelectorAll('.preset'),
      customModal: document.getElementById('customModal'),
      customTimeInput: document.getElementById('customTimeInput'),
      confirmCustom: document.getElementById('confirmCustom'),
      cancelCustom: document.getElementById('cancelCustom'),
      completionOverlay: document.getElementById('completionOverlay'),
      completionTime: document.getElementById('completionTime'),
      completionMessage: document.getElementById('completionMessage'),
      completionStats: document.getElementById('completionStats'),
      confetti: document.getElementById('confetti'),
      doneBtn: document.getElementById('doneBtn'),
      todayCount: document.getElementById('todayCount'),
      weekCount: document.getElementById('weekCount'),
      totalTime: document.getElementById('totalTime'),
      breathContainer: document.getElementById('breathContainer'),
      historyOverlay: document.getElementById('historyOverlay'),
      historyList: document.getElementById('historyList'),
      historyClose: document.getElementById('historyClose'),
      trendPanel: document.getElementById('trendPanel'),
      trendChart: document.getElementById('trendChart'),
      statsPanel: document.getElementById('statsPanel'),
      progressRingFill: document.getElementById('progressRingFill'),
      leaderboardList: document.getElementById('leaderboardList'),
      pauseIndicator: document.getElementById('pauseIndicator'),
      historyBtn: document.getElementById('historyBtn'),
      leaderboardBtn: document.getElementById('leaderboardBtn'),
      guideCard: document.getElementById('guideCard'),
      loginModal: document.getElementById('loginModal'),
      loginEmail: document.getElementById('loginEmail'),
      loginPassword: document.getElementById('loginPassword'),
      loginSubmitBtn: document.getElementById('loginSubmitBtn'),
      loginSwitchBtn: document.getElementById('loginSwitchBtn'),
      loginClose: document.getElementById('loginClose'),
      loginError: document.getElementById('loginError'),
      loginTitle: document.getElementById('loginTitle'),
      userBtn: document.getElementById('settingsBtn'),
      settingsOverlay: document.getElementById('settingsOverlay'),
      settingsClose: document.getElementById('settingsClose'),

      profileNickname: document.getElementById('profileNickname'),
      profileEmail: document.getElementById('profileEmail'),
      profileTotalSessions: document.getElementById('profileTotalSessions'),
      profileTotalTime: document.getElementById('profileTotalTime'),
      profileAvatar: document.getElementById('profileAvatar'),
      voiceEnabled: document.getElementById('voiceEnabled'),
      voiceType: document.getElementById('voiceType'),
      langBtns: document.querySelectorAll('.lang-btn'),
      logoutBtn: document.getElementById('logoutBtn'),
      leaderboardOverlay: document.getElementById('leaderboardOverlay'),
      leaderboardClose: document.getElementById('leaderboardClose')
    };
  }

  bindEvents() {
    this.els.startBtn.addEventListener('click', () => this.toggleTimer());
    this.els.resetBtn.addEventListener('click', () => this.reset());
    this.els.modeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleModeSelector();
    });

    this.els.modeSelector.addEventListener('click', (e) => {
      const option = e.target.closest('.mode-option');
      if (option) {
        this.selectMode(option.dataset.mode);
      }
    });

    this.els.presets.forEach(preset => {
      preset.addEventListener('click', () => {
        const time = preset.dataset.time;
        if (time === 'custom') {
          this.showCustomModal();
        } else {
          this.setDuration(parseInt(time));
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!this.els.modeSelector.contains(e.target) && !this.els.modeBtn.contains(e.target)) {
        this.els.modeSelector.classList.remove('show');
      }
    });

    this.els.confirmCustom.addEventListener('click', () => this.confirmCustomTime());
    this.els.cancelCustom.addEventListener('click', () => this.hideCustomModal());
    this.els.doneBtn.addEventListener('click', () => this.hideCompletion());
    this.els.customTimeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.confirmCustomTime();
    });

    this.els.historyClose.addEventListener('click', () => this.hideHistory());
    this.els.historyOverlay.addEventListener('click', (e) => {
      if (e.target === this.els.historyOverlay) {
        this.hideHistory();
      }
    });

    this.els.historyBtn.addEventListener('click', () => {
      this.showHistoryTab('history');
    });

    this.els.leaderboardBtn.addEventListener('click', async () => {
      const isLoggedIn = await this.isEmailUserLoggedIn();
      if (isLoggedIn) {
        this.showLeaderboard();
      } else {
        this.showLoginModal();
      }
    });

    document.querySelectorAll('.history-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.history-tab').forEach(t => { t.classList.remove('active'); });
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        if (tabName === 'history') {
          this.els.historyList.style.display = 'block';
          this.els.trendPanel.style.display = 'none';
          this.els.leaderboardList.style.display = 'none';
        } else if (tabName === 'trend') {
          this.els.historyList.style.display = 'none';
          this.els.trendPanel.style.display = 'block';
          this.els.leaderboardList.style.display = 'none';
          this.renderChart();
        } else if (tabName === 'leaderboard') {
          this.els.historyList.style.display = 'none';
          this.els.trendPanel.style.display = 'none';
          this.els.leaderboardList.style.display = 'block';
          this.loadLeaderboard();
        }
      });
    });

    this.els.loginClose.addEventListener('click', () => this.hideLoginModal());
    this.els.loginModal.addEventListener('click', (e) => {
      if (e.target === this.els.loginModal) {
        this.hideLoginModal();
      }
    });
    this.els.loginSubmitBtn.addEventListener('click', () => this.handleLoginSubmit());
    this.els.loginSwitchBtn.addEventListener('click', () => this.handleLoginSwitch());
    this.els.loginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLoginSubmit();
    });

    this.els.userBtn.addEventListener('click', () => this.showSettings());
    this.els.settingsClose.addEventListener('click', () => this.hideSettings());
    this.els.settingsOverlay.addEventListener('click', (e) => {
      if (e.target === this.els.settingsOverlay) {
        this.hideSettings();
      }
    });

    this.els.profileNickname.addEventListener('change', (e) => {
      this.saveNicknameDebounced(e.target.value);
    });

    this.els.langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.changeLanguage(btn.dataset.lang);
      });
    });

    this.els.voiceEnabled.addEventListener('change', (e) => {
      voiceManager.setEnabled(e.target.checked);
    });

    this.els.voiceType.addEventListener('change', (e) => {
      voiceManager.setLanguage(e.target.value);
    });

    this.els.logoutBtn.addEventListener('click', () => this.handleLogout());

    this.els.leaderboardClose.addEventListener('click', () => this.hideLeaderboard());
    this.els.leaderboardOverlay.addEventListener('click', (e) => {
      if (e.target === this.els.leaderboardOverlay) {
        this.hideLeaderboard();
      }
    });
  }

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (!this.isToday(data.lastDate)) {
          data.todayCount = 0;
        }
        return data;
      }
    } catch (e) {
      console.warn('[App] Failed to load data:', e.message);
    }
    return {
      todayCount: 0,
      weekCount: 0,
      totalTime: 0,
      lastDate: null,
      history: []
    };
  }

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[App] Failed to save data:', e.message);
    }
  }

  isToday(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isThisWeek(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return date >= startOfWeek && date < endOfWeek;
  }

  updateStats() {
    const today = new Date().toDateString();
    if (this.data.lastDate !== today) {
      this.data.todayCount = 0;
      this.data.lastDate = today;
    }

    this.data.weekCount = this.data.history
      ? this.data.history.filter(h => this.isThisWeek(h.date)).length
      : 0;

    this.els.todayCount.textContent = this.data.todayCount;
    this.els.weekCount.textContent = this.data.weekCount;
    this.els.totalTime.textContent = this.formatDuration(this.data.totalTime);
  }

  formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  }

  renderModeSelector() {
    const options = this.els.modeSelector.querySelectorAll('.mode-option');
    options.forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.mode === this.state.mode);
    });
  }

  toggleModeSelector() {
    this.els.modeSelector.classList.toggle('show');
  }

  selectMode(mode) {
    this.state.mode = mode;
    this.els.modeText.textContent = MODE_NAMES[mode];
    this.els.modeSelector.classList.remove('show');
    this.renderModeSelector();
  }

  setDuration(seconds) {
    this.state.duration = seconds;
    this.state.timeLeft = seconds;
    this.updateDisplay();

    this.els.presets.forEach(p => {
      p.classList.toggle('active', p.dataset.time === String(seconds) ||
        (seconds !== 30 && seconds !== 60 && seconds !== 90 && seconds !== 120 && p.dataset.time === 'custom'));
    });
  }

  showCustomModal() {
    this.els.customTimeInput.value = this.state.duration;
    this.els.customModal.classList.add('show');
    this.els.customTimeInput.focus();
  }

  hideCustomModal() {
    this.els.customModal.classList.remove('show');
  }

  confirmCustomTime() {
    const rawValue = this.els.customTimeInput.value.trim();
    if (!rawValue) {
      this.hideCustomModal();
      return;
    }

    const value = parseInt(rawValue, 10);
    if (Number.isNaN(value)) {
      console.warn('[App] Invalid custom time input:', rawValue);
      this.hideCustomModal();
      return;
    }

    if (value >= 10 && value <= 600) {
      this.setDuration(value);
      this.els.presets.forEach(p => { p.classList.remove('active'); });
      this.els.presets[4].classList.add('active');
    } else {
      console.warn('[App] Custom time out of range:', value);
    }
    this.hideCustomModal();
  }

  toggleTimer() {
    if (this.state.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.state.isPaused) {
      this.state.isPaused = false;
      if (this.state.pauseStartTime) {
        const pausedSeconds = Math.round((Date.now() - this.state.pauseStartTime) / 1000);
        this.state.pausedIntervals.push(pausedSeconds);
        this.state.totalPausedTime += pausedSeconds;
        this.state.pauseStartTime = null;
      }
    } else {
      this.state.timeLeft = this.state.duration;
      this.state.pausedIntervals = [];
      this.state.totalPausedTime = 0;
    }

    this.state.isRunning = true;
    this.els.startBtn.textContent = '暂停';
    this.els.timerDisplay.classList.add('running');
    this.els.pauseIndicator.classList.remove('show');
    this.els.progressRingFill.classList.remove('paused');

    this.startBreathCycle();
    this.startCountdown();
    this.scheduleCheckpoints();
    this.startEncouragement();
    this.startGuide();
    this.updateProgressRing();
  }

  pause() {
    this.state.isRunning = false;
    this.state.isPaused = true;
    this.state.pauseStartTime = Date.now();
    this.els.startBtn.textContent = '继续';
    this.els.pauseIndicator.classList.add('show');
    this.els.progressRingFill.classList.add('paused');

    clearInterval(this.state.intervalId);
    this.state.intervalId = null;
    this.stopBreathCycle();
    this.clearScheduledCheckpoints();
    this.stopEncouragement();
    this.stopGuide();
  }

  reset() {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.timeLeft = this.state.duration;
    this.state.breathPhase = 'ready';
    this.state.pauseStartTime = null;
    this.state.pausedIntervals = [];
    this.state.totalPausedTime = 0;

    clearInterval(this.state.intervalId);
    this.state.intervalId = null;
    this.stopBreathCycle();
    this.clearScheduledCheckpoints();
    this.stopEncouragement();
    this.stopGuide();

    this.els.startBtn.textContent = '开始';
    this.els.timerDisplay.classList.remove('running', 'warning');
    this.els.breathText.textContent = '准备开始';
    this.els.pauseIndicator.classList.remove('show');
    this.els.progressRingFill.classList.remove('paused', 'warning');
    this.updateProgressRing();
    this.updateDisplay();
  }

  startCountdown() {
    if (this.state.intervalId) return;

    this.state.intervalId = setInterval(() => {
      this.state.timeLeft--;
      this.updateDisplay();
      this.updateProgressRing();

      if (this.state.timeLeft <= 10 && this.state.timeLeft > 0) {
        this.els.timerDisplay.classList.add('warning');
        this.els.progressRingFill.classList.add('warning');
        this.audioManager.playTickSound();
      }

      if (this.state.timeLeft <= 0) {
        this.complete();
      }
    }, 1000);
  }

  updateProgressRing() {
    const progress = this.state.timeLeft / this.state.duration;
    const offset = PROGRESS_RING_CIRCUMFERENCE * (1 - progress);
    this.els.progressRingFill.style.strokeDashoffset = offset;
  }

  updateDisplay() {
    this.els.timerDisplay.textContent = this.state.timeLeft;
  }

  startBreathCycle() {
    const breathe = () => {
      if (!this.state.isRunning) return;

      this.setBreathPhase('inhale', '吸气...');
      this.animateBreathRing(1, 1.2, INHALE_TIME, 'ease-in-out');

      const inhaleTimeout = setTimeout(() => {
        if (!this.state.isRunning) return;
        this.setBreathPhase('hold', '屏息...');

        const holdTimeout = setTimeout(() => {
          if (!this.state.isRunning) return;
          this.setBreathPhase('exhale', '呼气...');
          this.animateBreathRing(1.2, 1, EXHALE_TIME, 'ease-in-out');

          const exhaleTimeout = setTimeout(() => {
            if (!this.state.isRunning) return;
            this.setBreathPhase('ready', '');
            breathe();
          }, EXHALE_TIME);
          this.state.breathTimeoutIds.push(exhaleTimeout);
        }, HOLD_TIME);
        this.state.breathTimeoutIds.push(holdTimeout);
      }, INHALE_TIME);
      this.state.breathTimeoutIds.push(inhaleTimeout);
    };

    breathe();
  }

  animateBreathRing(from, to, duration, easing) {
    const startTime = performance.now();
    const el = this.els.breathRing;

    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const animate = (currentTime) => {
      if (!this.state.isRunning) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing === 'ease-in-out' ? easeInOut(progress) : progress;
      const scale = from + (to - from) * easedProgress;

      el.style.transform = `scale(${scale})`;

      if (progress < 1 && this.state.isRunning) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  setBreathPhase(phase, text) {
    this.state.breathPhase = phase;
    this.els.breathText.textContent = text;
    this.triggerHaptic(phase);
  }

  triggerHaptic(phase) {
    if (!('vibrate' in navigator)) return;
    
    const patterns = {
      'inhale': [200, 100, 200],
      'hold': [200],
      'exhale': [100, 100, 200]
    };
    
    const pattern = patterns[phase];
    if (pattern) {
      navigator.vibrate(pattern);
    }
  }

  stopBreathCycle() {
    for (const id of this.state.breathTimeoutIds) {
      clearTimeout(id);
    }
    this.state.breathTimeoutIds = [];
    this.els.breathRing.classList.remove('inhale');
    this.els.breathRing.style.transform = 'scale(1)';
    this.els.breathRing.style.boxShadow = 'none';
    this.state.breathPhase = 'ready';
  }

  scheduleCheckpoints() {
    this.clearScheduledCheckpoints();
    const duration = this.state.duration;
    const checkpoints = [];

    for (let t = CHECKPOINT_INTERVAL; t <= duration - CHECKPOINT_FIRST_OFFSET; t += CHECKPOINT_INTERVAL) {
      checkpoints.push(t);
    }

    checkpoints.forEach(checkpointTime => {
      const delay = (duration - checkpointTime) * 1000;
      const timeoutId = setTimeout(() => {
        if (this.state.isRunning) {
          this.showCheckpoint();
        }
      }, delay);
      this.state.checkpointTimeoutIds.push(timeoutId);
    });
  }

  clearScheduledCheckpoints() {
    this.state.checkpointTimeoutIds.forEach(id => { clearTimeout(id); });
    this.state.checkpointTimeoutIds = [];
  }

  showCheckpoint() {
    const checkpoint = document.createElement('div');
    checkpoint.className = 'checkpoint show';
    const randomMessage = getRandomItem(CHECKPOINT_MESSAGES);
    checkpoint.textContent = `📍 ${randomMessage}`;
    checkpoint.style.cssText = 'position:absolute;bottom:30%;left:50%;transform:translateX(-50%);font-size:14px;color:#ff6b6b;opacity:0;animation:checkpoint-pulse 2s ease-out forwards;';
    this.els.breathContainer.style.position = 'relative';
    this.els.breathContainer.appendChild(checkpoint);
    this.audioManager.playCheckpointSound();

    setTimeout(() => checkpoint.remove(), 2000);
  }

  startEncouragement() {
    this.stopEncouragement();
    if (this.state.duration < MIN_DURATION_FOR_ENCOURAGEMENT) return;

    this.state.encouragementTimeoutId = setTimeout(() => {
      if (this.state.isRunning) {
        this.showEncouragement();
        this.state.encouragementIntervalId = setInterval(() => {
          if (this.state.isRunning) {
            this.showEncouragement();
          }
        }, ENCOURAGEMENT_INTERVAL);
      }
    }, ENCOURAGEMENT_FIRST_DELAY);
  }

  stopEncouragement() {
    if (this.state.encouragementTimeoutId) {
      clearTimeout(this.state.encouragementTimeoutId);
      this.state.encouragementTimeoutId = null;
    }
    if (this.state.encouragementIntervalId) {
      clearInterval(this.state.encouragementIntervalId);
      this.state.encouragementIntervalId = null;
    }
  }

  startGuide() {
    this.stopGuide();
    const showNextGuide = () => {
      if (!this.state.isRunning) return;
      this.showGuide();
      this.state.guideIntervalId = setTimeout(showNextGuide, GUIDE_INTERVAL);
    };
    this.state.guideIntervalId = setTimeout(showNextGuide, GUIDE_INTERVAL);
  }

  stopGuide() {
    if (this.state.guideIntervalId) {
      clearTimeout(this.state.guideIntervalId);
      this.state.guideIntervalId = null;
    }
    if (this.state.guideTimeoutId) {
      clearTimeout(this.state.guideTimeoutId);
      this.state.guideTimeoutId = null;
    }
    this.els.guideCard.classList.remove('show');
  }

  showGuide() {
    const text = getRandomItem(GUIDE_MESSAGES);
    this.els.guideCard.textContent = text;
    this.els.guideCard.classList.add('show');
    this.speakGuide(text);
    this.state.guideTimeoutId = setTimeout(() => {
      this.els.guideCard.classList.remove('show');
    }, GUIDE_DISPLAY_TIME);
  }

  speakGuide(text) {
    if (!voiceManager.isSupported()) return;
    voiceManager.speak(text);
  }

  showEncouragement() {
    const msg = document.createElement('div');
    msg.className = 'checkpoint show';
    const randomMsg = getRandomItem(ENCOURAGEMENT_MESSAGES);
    msg.textContent = `💪 ${randomMsg}`;
    msg.style.cssText = 'position:absolute;bottom:25%;left:50%;transform:translateX(-50%);font-size:16px;color:#00d4aa;opacity:0;animation:checkpoint-pulse 2s ease-out forwards;';
    this.els.breathContainer.appendChild(msg);
    this.audioManager.playEncouragementSound();

    setTimeout(() => msg.remove(), 2000);
  }

  complete() {
    this.state.isRunning = false;
    clearInterval(this.state.intervalId);
    this.state.intervalId = null;
    this.stopBreathCycle();
    this.stopGuide();

    const completedTime = this.state.duration;
    const pausedCount = this.state.pausedIntervals.length;
    const pausedTime = this.state.totalPausedTime;
    const actualTime = completedTime - pausedTime;

    this.data.todayCount++;
    this.data.weekCount++;
    this.data.totalTime += actualTime;
    this.data.history = this.data.history || [];
    this.data.history.push({
      date: new Date().toISOString(),
      duration: completedTime,
      mode: this.state.mode,
      pausedCount,
      pausedTime,
      pausedIntervals: [...this.state.pausedIntervals],
      actualTime,
      restDuration: pausedTime
    });
    if (this.data.history.length > HISTORY_LIMIT) {
      this.data.history = this.data.history.slice(-HISTORY_LIMIT);
    }
    this.saveData();
    this.updateStats();

    this.syncSessionToCloud({
      date: new Date().toISOString(),
      duration: completedTime,
      mode: this.state.mode,
      pausedCount
    });

    this.els.completionTime.textContent = `${completedTime}秒`;
    this.els.completionMessage.textContent = getRandomItem(COMPLETION_MESSAGES);
    this.updateCompletionStats(pausedCount, pausedTime, actualTime);
    this.els.completionOverlay.classList.add('show');
    this.audioManager.playSuccessSound();
    this.createConfetti();

    if (completedTime < 60) {
      this.autoCloseTimeout = setTimeout(() => {
        this.hideCompletion();
      }, 3000);
    }

    this.els.startBtn.textContent = '开始';
    this.els.timerDisplay.classList.remove('running', 'warning');
    this.els.pauseIndicator.classList.remove('show');
    this.els.progressRingFill.classList.remove('paused', 'warning');
    this.els.progressRingFill.style.strokeDashoffset = 0;
  }

  updateCompletionStats(pausedCount, pausedTime, _actualTime) {
    const statsEl = this.els.completionStats;
    if (pausedCount === 0) {
      statsEl.textContent = `完美完成 🎯`;
      statsEl.className = 'completion-stats perfect';
    } else {
      statsEl.textContent = `暂停 ${pausedCount} 次，共 ${pausedTime} 秒`;
      statsEl.className = 'completion-stats';
    }
  }

  showHistory() {
    this.renderHistory();
    this.els.historyOverlay.classList.add('show');
  }

  showHistoryTab(tab) {
    this.els.historyOverlay.classList.add('show');
    
    document.querySelectorAll('.history-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    this.els.historyList.style.display = tab === 'history' ? 'block' : 'none';
    this.els.trendPanel.style.display = tab === 'trend' ? 'block' : 'none';
    this.els.leaderboardList.style.display = tab === 'leaderboard' ? 'block' : 'none';
    
    if (tab === 'history') {
      this.renderHistory();
    } else if (tab === 'trend') {
      this.renderChart();
    } else if (tab === 'leaderboard') {
      this.loadLeaderboard();
    }
  }

  hideHistory() {
    this.els.historyOverlay.classList.remove('show');
  }

  showLeaderboard() {
    this.els.leaderboardOverlay.classList.add('show');
    this.loadLeaderboard();
  }

  hideLeaderboard() {
    this.els.leaderboardOverlay.classList.remove('show');
  }

  async isEmailUserLoggedIn() {
    if (!supabase) return false;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const user = session.user;
    return user && user.email && !user.is_anonymous;
  }

  showLoginModal() {
    this.els.loginModal.classList.add('show');
    this.els.loginEmail.value = '';
    this.els.loginPassword.value = '';
    this.els.loginError.style.display = 'none';
    this.state.isLoginMode = true;
    this.els.loginTitle.textContent = '登录后查看排行榜';
    this.els.loginSubmitBtn.textContent = '登录';
    this.els.loginSwitchBtn.textContent = '注册';
  }

  hideLoginModal() {
    this.els.loginModal.classList.remove('show');
  }

  async handleLoginSubmit() {
    const email = this.els.loginEmail.value.trim();
    const password = this.els.loginPassword.value;

    if (!email || !password) {
      this.els.loginError.textContent = '请输入邮箱和密码';
      this.els.loginError.style.display = 'block';
      return;
    }

    this.els.loginSubmitBtn.disabled = true;
    this.els.loginSubmitBtn.textContent = '请稍候...';

    let result;
    if (this.state.isLoginMode) {
      result = await signInWithEmail(email, password);
    } else {
      result = await signUpWithEmail(email, password);
    }

    this.els.loginSubmitBtn.disabled = false;
    this.els.loginSubmitBtn.textContent = this.state.isLoginMode ? '登录' : '注册';

    if (result.error) {
      this.els.loginError.textContent = result.error;
      this.els.loginError.style.display = 'block';
      return;
    }

    this.hideLoginModal();
    await this.updateUserBtn();
    this.showLeaderboard();
  }

  handleLoginSwitch() {
    this.state.isLoginMode = !this.state.isLoginMode;
    this.els.loginError.style.display = 'none';
    this.els.loginTitle.textContent = this.state.isLoginMode ? '登录后查看排行榜' : '注册后查看排行榜';
    this.els.loginSubmitBtn.textContent = this.state.isLoginMode ? '登录' : '注册';
    this.els.loginSwitchBtn.textContent = this.state.isLoginMode ? '注册' : '登录';
  }

  async updateUserBtn() {
    this.els.userBtn.style.display = 'flex';
    await this.updateProfileInfo();
  }

  async updateProfileInfo() {
    const isEmailUser = await this.isEmailUserLoggedIn();

    let nickname = this.data.nickname || '';

    if (isEmailUser && supabase && this.userId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', this.userId)
          .single();

        if (profile?.nickname) {
          nickname = profile.nickname;
          this.data.nickname = nickname;
          this.saveData();
        }
      } catch (e) {
        // Silent fail: use local nickname
      }

      const { data: { session } } = await supabase.auth.getSession();
      this.els.profileEmail.textContent = session?.user?.email || '';
      this.els.profileEmail.style.display = 'block';
    } else {
      this.els.profileEmail.textContent = i18n.t('settings.guestUser');
      this.els.profileEmail.style.display = 'block';
    }

    this.els.profileNickname.value = nickname;

    this.els.profileTotalSessions.textContent = this.data.history?.length || 0;
    const totalMinutes = Math.floor((this.data.totalTime || 0) / 60);
    this.els.profileTotalTime.textContent = `${totalMinutes}m`;

    this.els.logoutBtn.style.display = isEmailUser ? 'block' : 'none';
  }

  async showSettings() {
    await this.updateUserBtn();
    this.els.settingsOverlay.classList.add('show');
  }

  hideSettings() {
    this.els.settingsOverlay.classList.remove('show');
    if (this.trendChartInstance) {
      this.trendChartInstance.destroy();
      this.trendChartInstance = null;
    }
  }

  async changeLanguage(lang) {
    await i18n.setLocale(lang);
    
    this.els.langBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    
    this.applyI18n();
  }

  async saveNickname(nickname) {
    const trimmed = nickname.trim();
    if (trimmed.length === 0) return;

    this.data.nickname = trimmed;
    this.saveData();

    const isEmailUser = await this.isEmailUserLoggedIn();
    if (isEmailUser && supabase) {
      try {
        await supabase.from('profiles').upsert({
          id: this.userId,
          nickname: trimmed
        });
      } catch (e) {
        console.warn('[App] Failed to save nickname:', e);
      }
    }
  }

  async handleLogout() {
    try {
      if (supabase) {
        await authSignOut();
      }

      this.userId = null;
      this.data.nickname = '';
      this.saveData();

      this.syncPending = [];
      this.savePendingSync();

      this.stopSyncRetry();

      if (supabase) {
        await this.signInAnonymously();
      }

      this.hideSettings();
      await this.updateUserBtn();
    } catch (err) {
      console.error('[App] Logout failed:', err.message);
      alert(i18n.t('errors.logoutFailed') || '退出登录失败，请重试');
    }
  }

  async loadLeaderboard(type = 'total_duration') {
    if (!window.getLeaderboard) {
      this.els.leaderboardList.innerHTML = '<div class="leaderboard-empty">排行榜暂不可用</div>';
      return;
    }

    const { data, error } = await window.getLeaderboard(type, 20);

    if (error || !data || data.length === 0) {
      this.els.leaderboardList.innerHTML = '<div class="leaderboard-empty">暂无排行数据</div>';
      return;
    }

    this.els.leaderboardList.innerHTML = `
      <div class="leaderboard-type-selector">
        <button class="leaderboard-type-btn ${type === 'total_duration' ? 'active' : ''}" data-type="total_duration">总时长</button>
        <button class="leaderboard-type-btn ${type === 'total_sessions' ? 'active' : ''}" data-type="total_sessions">总次数</button>
        <button class="leaderboard-type-btn ${type === 'week_duration' ? 'active' : ''}" data-type="week_duration">本周</button>
      </div>
      ${data.map((item, index) => {
        const rankClass = index < 3 ? `top-${index + 1}` : '';
        const nickname = item.profiles?.nickname || '健身达人';
        const value = item.rank_value;
        const displayValue = type === 'total_sessions' ? `${value}次` : `${Math.floor(value / 60)}m`;

        return `
          <div class="leaderboard-item">
            <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
            <div class="leaderboard-info">
              <div class="leaderboard-nickname">${nickname}</div>
            </div>
            <div class="leaderboard-value">${displayValue}</div>
          </div>
        `;
      }).join('')}
    `;

    document.querySelectorAll('.leaderboard-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.leaderboard-type-btn').forEach(b => { b.classList.remove('active'); });
        btn.classList.add('active');
        this.loadLeaderboard(btn.dataset.type);
      });
    });
  }

  renderHistory() {
    const history = this.data.history || [];

    if (history.length === 0) {
      this.els.historyList.innerHTML = '<div class="history-empty">暂无训练记录</div>';
      return;
    }

    const sortedHistory = [...history].reverse();
    this.els.historyList.innerHTML = sortedHistory.map(item => {
      const date = new Date(item.date);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      const modeText = MODE_NAMES[item.mode] || '经典平板支撑';
      const pauseText = item.pausedCount > 0 ? `暂停${item.pausedCount}次/${item.pausedTime}s` : '完美';
      const durationText = item.duration + 's';

      return `
        <div class="history-item">
          <div class="history-item-left">
            <div class="history-item-date">${dateStr}</div>
            <div class="history-item-mode">${modeText}</div>
          </div>
          <div class="history-item-right">
            <div class="history-item-duration">${durationText}</div>
            <div class="history-item-pause">${pauseText}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderChart() {
    const history = this.data.history || [];
    if (history.length === 0) {
      this.els.trendPanel.innerHTML = '<div class="trend-empty">暂无数据</div>';
      return;
    }

    const dailyData = {};
    history.forEach(item => {
      const date = new Date(item.date);
      const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { count: 0, trainingDuration: 0, restDuration: 0 };
      }
      dailyData[dateKey].count++;
      dailyData[dateKey].trainingDuration += item.duration;
      dailyData[dateKey].restDuration += item.restDuration || 0;
    });

    const labels = Object.keys(dailyData);
    const countData = labels.map(d => dailyData[d].count);
    const trainingData = labels.map(d => dailyData[d].trainingDuration);
    const restData = labels.map(d => dailyData[d].restDuration);

    if (this.trendChartInstance) {
      this.trendChartInstance.destroy();
    }

    this.trendChartInstance = new Chart(this.els.trendChart, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '训练次数',
            data: countData,
            borderColor: '#00d4aa',
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            yAxisID: 'y',
            tension: 0.3,
            fill: true
          },
          {
            label: '训练时长(秒)',
            data: trainingData,
            borderColor: '#4d96ff',
            backgroundColor: 'rgba(77, 150, 255, 0.1)',
            yAxisID: 'y1',
            tension: 0.3,
            fill: true
          },
          {
            label: '休息时长(秒)',
            data: restData,
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            yAxisID: 'y1',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#888888',
              boxWidth: 12,
              padding: 16,
              font: { size: 11 }
            }
          }
        },
        scales: {
          x: {
            grid: { color: '#2a2a2a' },
            ticks: { color: '#888888', font: { size: 10 } }
          },
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            grid: { color: '#2a2a2a' },
            ticks: { color: '#00d4aa', font: { size: 10 } },
            title: { display: true, text: '次数', color: '#00d4aa', font: { size: 10 } }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#888888', font: { size: 10 } },
            title: { display: true, text: '时长(秒)', color: '#888888', font: { size: 10 } }
          }
        }
      }
    });
  }

  hideCompletion() {
    if (this.autoCloseTimeout) {
      clearTimeout(this.autoCloseTimeout);
      this.autoCloseTimeout = null;
    }
    this.els.completionOverlay.classList.remove('show');
    this.state.timeLeft = this.state.duration;
    this.state.pausedIntervals = [];
    this.state.totalPausedTime = 0;
    this.updateDisplay();
  }

  createConfetti() {
    this.clearConfetti();
    const colors = ['#00d4aa', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

      const angle = (Math.random() * 360) * (Math.PI / 180);
      const distance = 100 + Math.random() * 150;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 50;

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      fragment.appendChild(particle);
    }

    this.els.confetti.appendChild(fragment);
    this.confettiCleanupTimeout = setTimeout(() => this.clearConfetti(), 2000);
  }

  clearConfetti() {
    if (this.confettiCleanupTimeout) {
      clearTimeout(this.confettiCleanupTimeout);
      this.confettiCleanupTimeout = null;
    }
    if (this.els.confetti) {
      this.els.confetti.innerHTML = '';
    }
  }

  destroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    window.removeEventListener('online', this._onlineHandler);
    this.stopSyncRetry();
    this.clearConfetti();
    if (this.trendChartInstance) {
      this.trendChartInstance.destroy();
      this.trendChartInstance = null;
    }
    if (this.audioManager) {
      this.audioManager.destroy();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new PlankApp();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('[App] Service worker registration failed:', err.message);
    });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  setInterval(() => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.update();
    }).catch(err => {
      console.warn('[App] Service worker update failed:', err.message);
    });
  }, SW_UPDATE_INTERVAL);
}

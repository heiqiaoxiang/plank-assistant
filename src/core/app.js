import { supabase, STORAGE_KEY } from '../lib/supabase.js';
import { signInWithEmail, signUpWithEmail, signOut as authSignOut } from '../lib/auth.js';
const INHALE_TIME = 4000;
const HOLD_TIME = 2000;
const EXHALE_TIME = 4000;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * 135;

const modeNames = {
  classic: '经典平板支撑',
  'side-left': '左侧平板支撑',
  'side-right': '右侧平板支撑',
  mountain: '登山者'
};

const completionMessages = [
  '太棒了！继续保持！',
  '燃脂成功！💪',
  '今天的你比昨天更强大！',
  '核心力量+1！',
  '健身打卡完成！',
  '汗水不会骗人！'
];

const encouragementMessages = [
  '坚持住！',
  '加油！',
  '保持姿势！',
  '你很棒！',
  '继续！'
];

const checkpointMessages = [
  '检查：臀部位置',
  '检查：肩部下沉',
  '检查：核心收紧',
  '检查：不要塌腰',
  '检查：呼吸节奏'
];

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
      breathTimeoutId: null,
      pauseStartTime: null,
      pausedIntervals: [],
      totalPausedTime: 0,
      checkpointTimeoutIds: [],
      encouragementIntervalId: null,
      autoCloseTimeout: null,
      isLoginMode: true
    };

    this.audioContext = null;
    this.userId = null;
    this.data = this.loadData();
    this.syncPending = this.loadPendingSync();

    this.initElements();
    this.bindEvents();
    this.updateStats();
    this.renderModeSelector();
    this.updateUserBtn();

    this.initSupabase();
  }

  loadPendingSync() {
    try {
      const stored = localStorage.getItem('plank_pending_sync');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  savePendingSync() {
    try {
      localStorage.setItem('plank_pending_sync', JSON.stringify(this.syncPending));
    } catch (e) {}
  }

  async initSupabase() {
    if (!supabase) {
      console.log('[App] Supabase not configured, local-only mode');
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user) {
        this.userId = session.user.id;
        await this.syncPendingSessions();
        await this.mergeCloudStats();
      } else {
        await this.signInAnonymously();
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          this.userId = session.user.id;
          await this.syncPendingSessions();
          await this.mergeCloudStats();
        }
        this.updateUserBtn();
      });

      window.addEventListener('online', () => {
        this.syncPendingSessions();
        this.mergeCloudStats();
      });
    } catch (err) {
      console.warn('Supabase init failed (offline mode):', err.message);
    }
  }

  async signInAnonymously() {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      this.userId = data.user.id;
    } catch (err) {
      console.warn('Anonymous sign-in failed:', err.message);
    }
  }

  async syncPendingSessions() {
    if (!this.userId || !navigator.onLine || this.syncPending.length === 0) return;

    const toSync = [...this.syncPending];
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
        }
      } catch (err) {
        console.warn('Sync failed for session:', err.message);
      }
    }
    this.savePendingSync();
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
    } catch (err) {
      this.syncPending.push({ ...sessionData, userId: this.userId });
      this.savePendingSync();
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
      console.warn('Failed to merge cloud stats:', err.message);
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
      statsPanel: document.getElementById('statsPanel'),
      leaderboardList: document.getElementById('leaderboardList'),
      progressRingFill: document.getElementById('progressRingFill'),
      pauseIndicator: document.getElementById('pauseIndicator'),
      historyBtn: document.getElementById('historyBtn'),
      leaderboardBtn: document.getElementById('leaderboardBtn'),
      loginModal: document.getElementById('loginModal'),
      loginEmail: document.getElementById('loginEmail'),
      loginPassword: document.getElementById('loginPassword'),
      loginSubmitBtn: document.getElementById('loginSubmitBtn'),
      loginSwitchBtn: document.getElementById('loginSwitchBtn'),
      loginClose: document.getElementById('loginClose'),
      loginError: document.getElementById('loginError'),
      loginTitle: document.getElementById('loginTitle'),
      userBtn: document.getElementById('userBtn'),
      userModal: document.getElementById('userModal'),
      userModalClose: document.getElementById('userModalClose'),
      userEmail: document.getElementById('userEmail'),
      logoutBtn: document.getElementById('logoutBtn')
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

    this.els.statsPanel.addEventListener('click', (e) => {
      if (e.target.closest('.stat-clickable')) {
        this.showHistory();
      }
    });
    this.els.historyClose.addEventListener('click', () => this.hideHistory());
    this.els.historyOverlay.addEventListener('click', (e) => {
      if (e.target === this.els.historyOverlay) {
        this.hideHistory();
      }
    });

    document.querySelectorAll('.history-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        if (tabName === 'history') {
          this.els.historyList.style.display = 'block';
          this.els.leaderboardList.style.display = 'none';
        } else {
          this.els.historyList.style.display = 'none';
          this.els.leaderboardList.style.display = 'block';
          this.loadLeaderboard();
        }
      });
    });

    document.querySelectorAll('.leaderboard-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.leaderboard-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadLeaderboard(btn.dataset.type);
      });
    });

    this.els.historyBtn.addEventListener('click', () => {
      this.showHistoryTab('history');
    });

    this.els.leaderboardBtn.addEventListener('click', () => {
      this.showHistoryTab('leaderboard');
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

    this.els.userBtn.addEventListener('click', () => this.showUserModal());
    this.els.userModalClose.addEventListener('click', () => this.hideUserModal());
    this.els.userModal.addEventListener('click', (e) => {
      if (e.target === this.els.userModal) {
        this.hideUserModal();
      }
    });
    this.els.logoutBtn.addEventListener('click', () => this.handleLogout());
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
    } catch (e) {}
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
    } catch (e) {}
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
    return date >= startOfWeek;
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
    this.els.modeText.textContent = modeNames[mode];
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
    const value = parseInt(this.els.customTimeInput.value);
    if (value >= 10 && value <= 600) {
      this.setDuration(value);
      this.els.presets.forEach(p => p.classList.remove('active'));
      this.els.presets[4].classList.add('active');
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
    clearTimeout(this.state.breathTimeoutId);
    this.stopBreathCycle();
    this.clearScheduledCheckpoints();
    this.stopEncouragement();
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
    clearTimeout(this.state.breathTimeoutId);
    this.stopBreathCycle();
    this.clearScheduledCheckpoints();
    this.stopEncouragement();

    this.els.startBtn.textContent = '开始';
    this.els.timerDisplay.classList.remove('running', 'warning');
    this.els.breathText.textContent = '准备开始';
    this.els.pauseIndicator.classList.remove('show');
    this.els.progressRingFill.classList.remove('paused', 'warning');
    this.updateProgressRing();
    this.updateDisplay();
  }

  startCountdown() {
    this.state.intervalId = setInterval(() => {
      this.state.timeLeft--;
      this.updateDisplay();
      this.updateProgressRing();

      if (this.state.timeLeft <= 10 && this.state.timeLeft > 0) {
        this.els.timerDisplay.classList.add('warning');
        this.els.progressRingFill.classList.add('warning');
        this.playTickSound();
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

      this.state.breathTimeoutId = setTimeout(() => {
        if (!this.state.isRunning) return;
        this.setBreathPhase('hold', '屏息...');

        this.state.breathTimeoutId = setTimeout(() => {
          if (!this.state.isRunning) return;
          this.setBreathPhase('exhale', '呼气...');
          this.animateBreathRing(1.2, 1, EXHALE_TIME, 'ease-in-out');

          this.state.breathTimeoutId = setTimeout(() => {
            if (!this.state.isRunning) return;
            this.setBreathPhase('ready', '');
            breathe();
          }, EXHALE_TIME);
        }, HOLD_TIME);
      }, INHALE_TIME);
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
  }

  stopBreathCycle() {
    this.els.breathRing.classList.remove('inhale');
    this.els.breathRing.style.transform = 'scale(1)';
    this.els.breathRing.style.boxShadow = 'none';
    this.state.breathPhase = 'ready';
  }

  scheduleCheckpoints() {
    this.clearScheduledCheckpoints();
    const duration = this.state.duration;
    const checkpoints = [];

    for (let t = 30; t <= duration - 5; t += 30) {
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
    this.state.checkpointTimeoutIds.forEach(id => clearTimeout(id));
    this.state.checkpointTimeoutIds = [];
  }

  showCheckpoint() {
    const checkpoint = document.createElement('div');
    checkpoint.className = 'checkpoint show';
    const randomMessage = checkpointMessages[Math.floor(Math.random() * checkpointMessages.length)];
    checkpoint.textContent = `📍 ${randomMessage}`;
    checkpoint.style.cssText = 'position:absolute;bottom:30%;left:50%;transform:translateX(-50%);font-size:14px;color:#ff6b6b;opacity:0;animation:checkpoint-pulse 2s ease-out forwards;';
    this.els.breathContainer.style.position = 'relative';
    this.els.breathContainer.appendChild(checkpoint);
    this.playCheckpointSound();

    setTimeout(() => checkpoint.remove(), 2000);
  }

  startEncouragement() {
    this.stopEncouragement();
    if (this.state.duration < 60) return;

    const firstEncouragementDelay = 15000;
    const timeoutId = setTimeout(() => {
      if (this.state.isRunning) {
        this.showEncouragement();
        this.state.encouragementIntervalId = setInterval(() => {
          if (this.state.isRunning) {
            this.showEncouragement();
          }
        }, 30000);
      }
    }, firstEncouragementDelay);
    this.state.checkpointTimeoutIds.push(timeoutId);
  }

  stopEncouragement() {
    if (this.state.encouragementIntervalId) {
      clearInterval(this.state.encouragementIntervalId);
      this.state.encouragementIntervalId = null;
    }
  }

  showEncouragement() {
    const msg = document.createElement('div');
    msg.className = 'checkpoint show';
    const randomMsg = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
    msg.textContent = `💪 ${randomMsg}`;
    msg.style.cssText = 'position:absolute;bottom:25%;left:50%;transform:translateX(-50%);font-size:16px;color:#00d4aa;opacity:0;animation:checkpoint-pulse 2s ease-out forwards;';
    this.els.breathContainer.appendChild(msg);
    this.playEncouragementSound();

    setTimeout(() => msg.remove(), 2000);
  }

  playEncouragementSound() {
    this.initAudio();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = 660;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  complete() {
    this.state.isRunning = false;
    clearInterval(this.state.intervalId);
    clearTimeout(this.state.breathTimeoutId);
    this.stopBreathCycle();

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
      actualTime
    });
    if (this.data.history.length > 100) {
      this.data.history = this.data.history.slice(-100);
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
    this.els.completionMessage.textContent = completionMessages[Math.floor(Math.random() * completionMessages.length)];
    this.updateCompletionStats(pausedCount, pausedTime, actualTime);
    this.els.completionOverlay.classList.add('show');
    this.playSuccessSound();
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

  updateCompletionStats(pausedCount, pausedTime, actualTime) {
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
    if (tab === 'leaderboard' && !this.isEmailUserLoggedIn()) {
      this.showLoginModal();
      return;
    }

    this.els.historyOverlay.classList.add('show');
    document.querySelectorAll('.history-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    if (tab === 'history') {
      this.els.historyList.style.display = 'block';
      this.els.leaderboardList.style.display = 'none';
      this.renderHistory();
    } else {
      this.els.historyList.style.display = 'none';
      this.els.leaderboardList.style.display = 'block';
      this.loadLeaderboard();
    }
  }

  hideHistory() {
    this.els.historyOverlay.classList.remove('show');
  }

  isEmailUserLoggedIn() {
    if (!supabase?.auth?.session()) return false;
    const user = supabase.auth.session().user;
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
    this.updateUserBtn();
    this.showHistoryTab('leaderboard');
  }

  handleLoginSwitch() {
    this.state.isLoginMode = !this.state.isLoginMode;
    this.els.loginError.style.display = 'none';
    this.els.loginTitle.textContent = this.state.isLoginMode ? '登录后查看排行榜' : '注册后查看排行榜';
    this.els.loginSubmitBtn.textContent = this.state.isLoginMode ? '登录' : '注册';
    this.els.loginSwitchBtn.textContent = this.state.isLoginMode ? '注册' : '登录';
  }

  updateUserBtn() {
    const isEmailUser = this.isEmailUserLoggedIn();
    this.els.userBtn.style.display = isEmailUser ? 'flex' : 'none';
    if (isEmailUser) {
      const user = supabase.auth.session().user;
      this.els.userEmail.textContent = user.email || '用户';
    }
  }

  showUserModal() {
    this.updateUserBtn();
    this.els.userModal.classList.add('show');
  }

  hideUserModal() {
    this.els.userModal.classList.remove('show');
  }

  async handleLogout() {
    if (supabase) {
      await authSignOut();
    }
    this.hideUserModal();
    this.updateUserBtn();
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

    const typeLabels = {
      'total_duration': '总时长',
      'total_sessions': '总次数',
      'week_duration': '本周时长'
    };

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
        document.querySelectorAll('.leaderboard-type-btn').forEach(b => b.classList.remove('active'));
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
      const modeText = modeNames[item.mode] || '经典平板支撑';
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
    this.els.confetti.innerHTML = '';
    const colors = ['#00d4aa', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];

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

      this.els.confetti.appendChild(particle);
    }
  }

  initAudio() {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  playTickSound() {
    this.initAudio();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  playCheckpointSound() {
    this.initAudio();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = 440;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);
  }

  playSuccessSound() {
    this.initAudio();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const startTime = this.audioContext.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new PlankApp();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
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
    }).catch(() => {});
  }, 60 * 60 * 1000);
}

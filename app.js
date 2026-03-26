import { supabase, STORAGE_KEY } from './supabase.js';
const INHALE_TIME = 4000;
const HOLD_TIME = 2000;
const EXHALE_TIME = 4000;

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
      encouragementIntervalId: null
    };

    this.audioContext = null;
    this.userId = null;
    this.data = this.loadData();
    this.syncPending = this.loadPendingSync();

    this.initElements();
    this.bindEvents();
    this.updateStats();
    this.renderModeSelector();

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
      statsPanel: document.getElementById('statsPanel')
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

    this.startBreathCycle();
    this.startCountdown();
    this.scheduleCheckpoints();
    this.startEncouragement();
  }

  pause() {
    this.state.isRunning = false;
    this.state.isPaused = true;
    this.state.pauseStartTime = Date.now();
    this.els.startBtn.textContent = '继续';

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
    this.updateDisplay();
  }

  startCountdown() {
    this.state.intervalId = setInterval(() => {
      this.state.timeLeft--;
      this.updateDisplay();

      if (this.state.timeLeft <= 10 && this.state.timeLeft > 0) {
        this.els.timerDisplay.classList.add('warning');
        this.playTickSound();
      }

      if (this.state.timeLeft <= 0) {
        this.complete();
      }
    }, 1000);
  }

  updateDisplay() {
    this.els.timerDisplay.textContent = this.state.timeLeft;
  }

  startBreathCycle() {
    const breathe = () => {
      if (!this.state.isRunning) return;

      this.setBreathPhase('inhale', '吸气...');
      this.els.breathRing.classList.add('inhale');

      this.state.breathTimeoutId = setTimeout(() => {
        if (!this.state.isRunning) return;
        this.setBreathPhase('hold', '屏息...');

        this.state.breathTimeoutId = setTimeout(() => {
          if (!this.state.isRunning) return;
          this.setBreathPhase('exhale', '呼气...');
          this.els.breathRing.classList.remove('inhale');

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

  setBreathPhase(phase, text) {
    this.state.breathPhase = phase;
    this.els.breathText.textContent = text;
  }

  stopBreathCycle() {
    this.els.breathRing.classList.remove('inhale');
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

    this.els.startBtn.textContent = '开始';
    this.els.timerDisplay.classList.remove('running', 'warning');
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

  hideHistory() {
    this.els.historyOverlay.classList.remove('show');
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
}

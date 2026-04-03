// === Constants ===
export const INHALE_TIME = 4000;
export const HOLD_TIME = 2000;
export const EXHALE_TIME = 4000;
export const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * 135;

// History
export const HISTORY_LIMIT = 100; // Max records to keep

// Encouragement
export const ENCOURAGEMENT_FIRST_DELAY = 15000; // First encouragement at 15s
export const ENCOURAGEMENT_INTERVAL = 30000; // Every 30s after
export const MIN_DURATION_FOR_ENCOURAGEMENT = 60; // Only for sessions >= 60s

// Sync
export const SYNC_RETRY_INTERVAL = 30000; // Retry failed sync every 30s
export const SW_UPDATE_INTERVAL = 60 * 60 * 1000; // Service Worker update every hour

// Checkpoints
export const CHECKPOINT_INTERVAL = 30; // Every 30s
export const CHECKPOINT_FIRST_OFFSET = 5; // First checkpoint 5s before target

// Guide
export const GUIDE_INTERVAL = 15000;
export const GUIDE_DISPLAY_TIME = 5000;

export const MODE_NAMES = {
  classic: '经典平板支撑',
  'side-left': '左侧平板支撑',
  'side-right': '右侧平板支撑'
};

export const COMPLETION_MESSAGES = [
  '太棒了！继续保持！',
  '燃脂成功！',
  '今天的你比昨天更强大！',
  '核心力量+1！',
  '健身打卡完成！',
  '汗水不会骗人！'
];

export const ENCOURAGEMENT_MESSAGES = [
  '坚持住！',
  '加油！',
  '保持姿势！',
  '你很棒！',
  '继续！'
];

export const CHECKPOINT_MESSAGES = [
  '检查：臀部位置',
  '检查：肩部下沉',
  '检查：核心收紧',
  '检查：不要塌腰',
  '检查：呼吸节奏'
];

export const GUIDE_MESSAGES = [
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
];

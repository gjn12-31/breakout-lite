// 全局配置：所有可调参数集中在这里
export const CANVAS_W = 480;
export const CANVAS_H = 600;

export const PADDLE_CFG = {
  BASE_W: 96,
  MIN_W: 56,
  MAX_W: 170,
  H: 12,
  Y: CANVAS_H - 34,
  KEY_SPEED: 9,
};

export const BALL_CFG = {
  R: 7,
  BASE_SPEED: 4.4,
  MAX_SPEED: 9,
  SPEEDUP: 0.015, // 每次击砖微量加速
};

export const BRICK_CFG = {
  H: 20,
  GAP: 5,
  MARGIN_X: 22,
  TOP: 64,
  COLORS: { 1: '#2ed573', 2: '#ffd700', 3: '#ff4d4d' },
  POINTS: { 1: 10, 2: 20, 3: 30 },
};

export const POWERUP_CFG = {
  SIZE: 26,
  FALL_SPEED: 2.3,
  DROP_CHANCE: 0.22, // 砖块被击碎时掉落道具的概率
};

export const LASER_CFG = {
  SPEED: 10,
  COOLDOWN: 18, // 帧数
  W: 3,
  H: 14,
};

export const EFFECT_TIME = {
  EXPAND: 60 * 12,
  SHRINK: 60 * 8,
  LASER: 60 * 10,
  SLOW: 60 * 8,
  STICKY: 60 * 12,
};

export const LIVES = 3;
export const SHAKE_DECAY = 0.9;

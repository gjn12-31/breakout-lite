// 掉落道具系统
import { POWERUP_CFG } from './config.js';
import { weightedChoice } from './utils.js';

export const POWERUP_TYPES = [
  { id: 'expand', label: 'E', color: '#2ed573', weight: 3, desc: 'Paddle wider' },
  { id: 'multi',  label: 'M', color: '#1e90ff', weight: 3, desc: 'Multi ball' },
  { id: 'laser',  label: 'L', color: '#ff6b81', weight: 2, desc: 'Laser guns' },
  { id: 'slow',   label: 'S', color: '#a55eea', weight: 2, desc: 'Slow ball' },
  { id: 'sticky', label: 'T', color: '#ffa502', weight: 2, desc: 'Sticky paddle' },
  { id: 'life',   label: '+', color: '#ff4d4d', weight: 1, desc: 'Extra life' },
  { id: 'shrink', label: '-', color: '#84817a', weight: 1, desc: 'Paddle smaller (bad!)' },
];

// 按概率掉落一个道具（可能返回 null）
export function maybeDropPowerUp(x, y) {
  if (Math.random() > POWERUP_CFG.DROP_CHANCE) return null;
  const type = weightedChoice(POWERUP_TYPES);
  return new PowerUp(x, y, type);
}

export class PowerUp {
  constructor(x, y, type) {
    this.size = POWERUP_CFG.SIZE;
    this.x = x - this.size / 2;
    this.y = y - this.size / 2;
    this.type = type;
    this.age = 0;
  }

  get fallen() { return this.y > 700; }

  update() {
    this.y += POWERUP_CFG.FALL_SPEED;
    this.age++;
  }

  hits(paddle) {
    return this.y + this.size >= paddle.y &&
           this.y <= paddle.y + paddle.h &&
           this.x + this.size >= paddle.x &&
           this.x <= paddle.x + paddle.w;
  }

  draw(ctx) {
    const pulse = 0.85 + Math.sin(this.age / 8) * 0.15;
    const cx = this.x + this.size / 2, cy = this.y + this.size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = this.type.color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-this.size / 2, -this.size / 2, this.size, this.size, 5);
    else ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.label, 0, 1);
    ctx.restore();
  }
}

// 粒子特效 + 漂浮得分文字
import { rand } from './utils.js';

export class Particles {
  constructor() {
    this.parts = [];
    this.texts = [];
  }

  burst(x, y, color, n = 12, power = 4) {
    for (let i = 0; i < n; i++) {
      const ang = rand(0, Math.PI * 2);
      const sp = rand(power * 0.3, power);
      this.parts.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 1,
        life: rand(20, 42),
        age: 0,
        size: rand(2, 4.5),
        color,
      });
    }
  }

  text(x, y, str, color = '#ffd700') {
    this.texts.push({ x, y, str, color, age: 0, life: 50 });
  }

  update() {
    for (const p of this.parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // 重力
      p.age++;
    }
    this.parts = this.parts.filter(p => p.age < p.life);

    for (const t of this.texts) { t.y -= 0.8; t.age++; }
    this.texts = this.texts.filter(t => t.age < t.life);
  }

  draw(ctx) {
    for (const p of this.parts) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = 1 - t.age / t.life;
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

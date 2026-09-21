// 游戏实体：挡板 / 球 / 砖块
import { PADDLE_CFG, BALL_CFG, BRICK_CFG, CANVAS_W } from './config.js';
import { clamp } from './utils.js';

export class Paddle {
  constructor() {
    this.baseW = PADDLE_CFG.BASE_W;
    this.w = this.baseW;
    this.h = PADDLE_CFG.H;
    this.x = (CANVAS_W - this.w) / 2;
    this.y = PADDLE_CFG.Y;
    this.laserTimer = 0;   // >0 时可发射激光
    this.laserCooldown = 0;
  }

  get centerX() { return this.x + this.w / 2; }

  // 鼠标优先，其次键盘；等效宽度按当前宽度缩放移动速度
  update(input) {
    if (input.pointerX !== null) {
      this.x = clamp(input.pointerX - this.w / 2, 0, CANVAS_W - this.w);
    } else {
      if (input.left())  this.x = clamp(this.x - PADDLE_CFG.KEY_SPEED * this.w / this.baseW, 0, CANVAS_W - this.w);
      if (input.right()) this.x = clamp(this.x + PADDLE_CFG.KEY_SPEED * this.w / this.baseW, 0, CANVAS_W - this.w);
    }
    if (this.laserCooldown > 0) this.laserCooldown--;
    if (this.laserTimer > 0) this.laserTimer--;
  }

  setWidth(w) {
    const cx = this.centerX;
    this.w = clamp(w, PADDLE_CFG.MIN_W, PADDLE_CFG.MAX_W);
    this.x = clamp(cx - this.w / 2, 0, CANVAS_W - this.w);
  }

  canShoot() { return this.laserTimer > 0 && this.laserCooldown === 0; }

  draw(ctx) {
    const grad = ctx.createLinearGradient(this.x, 0, this.x + this.w, 0);
    grad.addColorStop(0, '#1e90ff');
    grad.addColorStop(1, '#00d2d3');
    ctx.fillStyle = grad;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillRect(this.x, this.y, this.w, 3);

    if (this.laserTimer > 0) {
      // 激光炮台
      ctx.fillStyle = '#ff6b81';
      ctx.fillRect(this.x + 4, this.y - 6, 5, 6);
      ctx.fillRect(this.x + this.w - 9, this.y - 6, 5, 6);
    }
  }
}

export class Ball {
  constructor(x, y, speed) {
    this.r = BALL_CFG.R;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.stuck = true;    // 粘在挡板上等待发球
    this.stuckDx = 0;     // 粘住时相对挡板中心的偏移
    this.speed = speed;
    this.trail = [];
  }

  launch(angle) {
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.stuck = false;
  }

  follow(paddle) {
    this.x = paddle.centerX + this.stuckDx;
    this.y = paddle.y - this.r - 1;
  }

  update() {
    if (this.stuck) return;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.shift();
    this.x += this.vx;
    this.y += this.vy;
  }

  bounceWalls() {
    if (this.x < this.r) { this.x = this.r; this.vx = Math.abs(this.vx); }
    if (this.x > CANVAS_W - this.r) { this.x = CANVAS_W - this.r; this.vx = -Math.abs(this.vx); }
    if (this.y < this.r) { this.y = this.r; this.vy = Math.abs(this.vy); }
  }

  normalize() {
    const sp = Math.hypot(this.vx, this.vy);
    if (sp === 0) return;
    this.vx = (this.vx / sp) * this.speed;
    this.vy = (this.vy / sp) * this.speed;
  }

  speedUp() {
    this.speed = Math.min(BALL_CFG.MAX_SPEED, this.speed + BALL_CFG.SPEEDUP);
    this.normalize();
  }

  draw(ctx) {
    // 拖尾
    this.trail.forEach((t, i) => {
      ctx.globalAlpha = 0.05 + (i / this.trail.length) * 0.15;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.r * (0.4 + 0.6 * i / this.trail.length), 0, 7);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, 7);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}

export class Brick {
  constructor(x, y, w, h, hp, unbreakable = false) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.hp = hp;
    this.maxHp = hp;
    this.unbreakable = unbreakable;
    this.flash = 0; // 被击中时的闪白
  }

  get color() { return BRICK_CFG.COLORS[this.hp] || '#999'; }
  get points() { return BRICK_CFG.POINTS[this.hp] || 10; }

  hit() { // 返回 true 表示被击碎
    this.flash = 6;
    if (this.unbreakable) return false;
    return --this.hp <= 0;
  }

  update() { if (this.flash > 0) this.flash--; }

  draw(ctx) {
    ctx.fillStyle = this.unbreakable ? '#55606b' : this.color;
    ctx.globalAlpha = this.hp < this.maxHp ? 0.7 : 1;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    if (this.hp === this.maxHp && !this.unbreakable) {
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(this.x, this.y, this.w, 3);
    }
    if (this.unbreakable) { // 不可摧毁砖画斜纹
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      for (let i = -this.h; i < this.w; i += 8) {
        ctx.beginPath();
        ctx.moveTo(this.x + i, this.y + this.h);
        ctx.lineTo(this.x + i + this.h, this.y);
        ctx.stroke();
      }
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash / 10})`;
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
  }

  // 由关卡字符网格生成砖块列表
  static fromGrid(grid) {
    const cols = grid[0].length;
    const bw = (CANVAS_W - BRICK_CFG.MARGIN_X * 2 - (cols - 1) * BRICK_CFG.GAP) / cols;
    const bricks = [];
    grid.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        const unbreakable = ch === 'X';
        const hp = unbreakable ? Infinity : Number(ch);
        bricks.push(new Brick(
          BRICK_CFG.MARGIN_X + c * (bw + BRICK_CFG.GAP),
          BRICK_CFG.TOP + r * (BRICK_CFG.H + BRICK_CFG.GAP),
          bw, BRICK_CFG.H, hp, unbreakable
        ));
      });
    });
    return bricks;
  }
}

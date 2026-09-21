// 游戏主逻辑：状态机 + 实体调度 + 碰撞 + 计分
import {
  CANVAS_W, CANVAS_H, BALL_CFG, LIVES, LASER_CFG,
  EFFECT_TIME, SHAKE_DECAY, PADDLE_CFG,
} from './config.js';
import { rand, clamp } from './utils.js';
import { sfx } from './audio.js';
import { LEVELS } from './levels.js';
import { Paddle, Ball, Brick } from './entities.js';
import { PowerUp, maybeDropPowerUp } from './powerup.js';
import { Particles } from './particles.js';

export class Game {
  constructor(ctx, dom) {
    this.ctx = ctx;
    this.dom = dom; // HUD/横幅/覆盖层的 DOM 引用
    this.state = 'menu';
    this.particles = new Particles();
    this.paddle = new Paddle();
    this.frame = 0;
    this.high = Number(localStorage.getItem('breakout-lite-high') || 0);

    this.setInput = this.setInput.bind(this);
    dom.high.textContent = this.high;
  }

  setInput(input) {
    this.input = input;
    input.onAction = () => this.action();
    input.onPause = () => this.togglePause();
    input.onRestart = () => {
      if (this.state === 'menu' || this.state === 'gameover') this.newRun();
    };
    input.onMute = () => sfx.toggle();
  }

  // ---------- 生命周期 ----------
  newRun() {
    this.score = 0;
    this.lives = LIVES;
    this.levelIndex = 0;
    this.dom.menu.classList.add('hidden');
    this.dom.over.classList.add('hidden');
    this.updateHud();
    this.loadLevel();
    this.state = 'ready';
  }

  loadLevel() {
    const level = LEVELS[this.levelIndex];
    this.bricks = Brick.fromGrid(level.grid);
    this.powerups = [];
    this.lasers = [];
    this.balls = [new Ball(CANVAS_W / 2, 0, BALL_CFG.BASE_SPEED * level.speed)];
    this.paddle = new Paddle();
    this.particles = new Particles();
    this.combo = 0;
    this.clearTimers();
    this.updateHud();
    this.showBanner(`LEVEL ${this.levelIndex + 1} · ${level.name}`, 80);
  }

  clearTimers() {
    this.expandTimer = 0;
    this.shrinkTimer = 0;
    this.slowTimer = 0;
    this.stickyTimer = 0;
    this.shake = 0;
  }

  // ---------- 玩家动作：发球 / 释放粘球 / 发射激光 ----------
  action() {
    sfx.ensure();
    if (this.state === 'menu' || this.state === 'gameover') { this.newRun(); return; }
    if (this.state === 'paused') { this.togglePause(); return; }
    if (this.state !== 'ready' && this.state !== 'playing') return;

    const stuckBalls = this.balls.filter(b => b.stuck);
    if (stuckBalls.length > 0) {
      for (const b of stuckBalls) {
        const angle = -Math.PI / 2 + clamp(b.stuckDx / (this.paddle.w / 2), -0.6, 0.6);
        b.launch(angle);
      }
      if (this.state === 'ready') { this.state = 'playing'; this.hideBanner(); }
      return;
    }
    if (this.paddle.canShoot()) this.shootLasers();
  }

  shootLasers() {
    this.lasers.push({ x: this.paddle.x + 6, y: this.paddle.y - 8 });
    this.lasers.push({ x: this.paddle.x + this.paddle.w - 6, y: this.paddle.y - 8 });
    this.paddle.laserCooldown = LASER_CFG.COOLDOWN;
    sfx.laser();
  }

  togglePause() {
    if (this.state === 'playing' || this.state === 'ready') {
      this.prevState = this.state;
      this.state = 'paused';
      this.showBanner('PAUSED', Infinity);
    } else if (this.state === 'paused') {
      this.state = this.prevState || 'playing';
      this.hideBanner();
    }
  }

  // ---------- 更新 ----------
  update() {
    this.frame++;

    if (this.state === 'levelup') {
      if (--this.levelupTimer <= 0) {
        this.levelIndex++;
        if (this.levelIndex >= LEVELS.length) this.gameOver(true);
        else { this.loadLevel(); this.state = 'ready'; }
      }
      return;
    }
    if (this.state !== 'ready' && this.state !== 'playing') return;

    this.paddle.update(this.input);
    this.tickTimers();

    // 球
    for (const ball of this.balls) {
      if (ball.stuck) { ball.follow(this.paddle); continue; }
      ball.update();
      ball.bounceWalls();
      this.ballHitPaddle(ball);
      for (const brick of this.bricks) {
        if (this.ballHitBrick(ball, brick)) break;
      }
    }
    this.balls = this.balls.filter(b => b.y < CANVAS_H + 30);
    if (this.balls.length === 0) this.loseLife();

    // 激光
    for (const l of this.lasers) {
      l.y -= LASER_CFG.SPEED;
      for (const brick of this.bricks) {
        if (l.x >= brick.x && l.x <= brick.x + brick.w &&
            l.y <= brick.y + brick.h && l.y + LASER_CFG.H >= brick.y) {
          this.damageBrick(brick, l.x, brick.y + brick.h / 2);
          l.dead = true;
          break;
        }
      }
    }
    this.lasers = this.lasers.filter(l => !l.dead && l.y > -20);

    // 道具
    for (const p of this.powerups) {
      p.update();
      if (p.hits(this.paddle)) {
        p.caught = true;
        this.applyPowerUp(p.type);
      }
    }
    this.powerups = this.powerups.filter(p => !p.caught && !p.fallen);

    for (const b of this.bricks) b.update();
    this.particles.update();
    this.shake *= SHAKE_DECAY;

    // 过关判定：场上没有可击碎的砖
    if (this.state === 'playing' && !this.bricks.some(b => !b.unbreakable)) {
      this.state = 'levelup';
      this.levelupTimer = 100;
      this.showBanner(`LEVEL ${this.levelIndex + 1} CLEAR!`, 95);
      sfx.level();
    }
  }

  tickTimers() {
    if (this.expandTimer > 0 && --this.expandTimer === 0) this.paddle.setWidth(PADDLE_CFG.BASE_W);
    if (this.shrinkTimer > 0 && --this.shrinkTimer === 0) this.paddle.setWidth(PADDLE_CFG.BASE_W);
    if (this.stickyTimer > 0) this.stickyTimer--;

    if (this.slowTimer > 0 && --this.slowTimer === 0) {
      for (const b of this.balls) {
        b.speed = Math.min(BALL_CFG.MAX_SPEED, b.speed / 0.7);
        if (!b.stuck) b.normalize();
      }
    }
  }

  // ---------- 碰撞 ----------
  ballHitPaddle(ball) {
    const p = this.paddle;
    if (ball.vy <= 0) return;
    if (!(ball.y + ball.r >= p.y && ball.y - ball.r <= p.y + p.h &&
          ball.x >= p.x - ball.r && ball.x <= p.x + p.w + ball.r)) return;

    if (this.stickyTimer > 0) {
      ball.stuck = true;
      ball.stuckDx = clamp(ball.x - p.centerX, -p.w / 2 + 6, p.w / 2 - 6);
      ball.vx = ball.vy = 0;
      return;
    }

    const hit = (ball.x - p.centerX) / (p.w / 2); // -1..1
    const angle = hit * (Math.PI / 3);            // 最大 ±60°
    ball.vx = Math.sin(angle) * ball.speed;
    ball.vy = -Math.abs(Math.cos(angle) * ball.speed);
    ball.y = p.y - ball.r;
    this.combo = 0;
    sfx.paddle();
  }

  ballHitBrick(ball, b) {
    if (ball.x + ball.r < b.x || ball.x - ball.r > b.x + b.w ||
        ball.y + ball.r < b.y || ball.y - ball.r > b.y + b.h) return false;

    const overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
    const overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
    if (overlapX < overlapY) ball.vx *= -1; else ball.vy *= -1;

    this.damageBrick(b, b.x + b.w / 2, b.y + b.h / 2);
    ball.speedUp();
    return true;
  }

  damageBrick(brick, x, y) {
    const destroyed = brick.hit();
    if (brick.unbreakable) {
      sfx.brick();
      this.particles.burst(x, y, '#8899aa', 5, 2.5);
      return;
    }
    if (destroyed) {
      this.combo++;
      const bonus = (this.combo - 1) * 5;
      const pts = brick.points + bonus;
      this.score += pts;
      this.particles.burst(x, y, brick.color, 14, 4);
      this.particles.text(x, y, `+${pts}${bonus > 0 ? ` (x${this.combo})` : ''}`);
      this.shake = Math.max(this.shake, 3);

      const drop = maybeDropPowerUp(x, y);
      if (drop) this.powerups.push(drop);

      this.bricks.splice(this.bricks.indexOf(brick), 1);
      sfx.brickBreak();
    } else {
      this.score += 5;
      sfx.brick();
    }
    this.updateHud();
  }

  // ---------- 道具效果 ----------
  applyPowerUp(type) {
    this.score += 50;
    this.particles.burst(this.paddle.centerX, this.paddle.y, type.color, 16, 4);
    this.particles.text(this.paddle.centerX, this.paddle.y - 20, type.desc.toUpperCase(), type.color);
    sfx.power();

    switch (type.id) {
      case 'expand': this.expandTimer = EFFECT_TIME.EXPAND; this.paddle.setWidth(150); break;
      case 'shrink': this.shrinkTimer = EFFECT_TIME.SHRINK; this.paddle.setWidth(62); break;
      case 'laser':  this.paddle.laserTimer = EFFECT_TIME.LASER; break;
      case 'sticky': this.stickyTimer = EFFECT_TIME.STICKY; break;
      case 'life':   this.lives++; break;
      case 'slow':
        this.slowTimer = EFFECT_TIME.SLOW;
        for (const b of this.balls) { b.speed *= 0.7; if (!b.stuck) { b.vx *= 0.7; b.vy *= 0.7; } }
        break;
      case 'multi': {
        const src = this.balls.find(b => !b.stuck) || this.balls[0];
        if (src && this.balls.length < 6) {
          if (src.stuck) src.launch(-Math.PI / 2);
          for (const da of [-0.5, 0.5]) {
            const nb = new Ball(src.x, src.y, src.speed);
            const ang = Math.atan2(src.vy, src.vx) + da;
            nb.launch(ang);
            nb.stuck = false;
            this.balls.push(nb);
          }
        }
        break;
      }
    }
    this.updateHud();
  }

  loseLife() {
    this.lives--;
    this.combo = 0;
    this.shake = 10;
    this.updateHud();
    if (this.lives <= 0) {
      this.gameOver(false);
    } else {
      sfx.lose();
      const speed = BALL_CFG.BASE_SPEED * LEVELS[this.levelIndex].speed;
      this.balls = [new Ball(this.paddle.centerX, this.paddle.y - 10, speed)];
      this.lasers = [];
      this.clearTimers();
      this.paddle = new Paddle();
      this.state = 'ready';
      this.showBanner('BALL LOST', 50);
    }
  }

  gameOver(win) {
    this.state = 'gameover';
    if (this.score > this.high) {
      this.high = this.score;
      localStorage.setItem('breakout-lite-high', this.high);
    }
    this.dom.high.textContent = this.high;
    this.dom.overTitle.textContent = win ? '🏆 YOU WIN!' : '💀 GAME OVER';
    this.dom.overScore.textContent = `Score: ${this.score}`;
    this.dom.overHigh.textContent = `Best: ${this.high}`;
    this.dom.over.classList.remove('hidden');
    this.hideBanner();
    win ? sfx.level() : sfx.over();
  }

  // ---------- 渲染 ----------
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    if (this.shake > 0.3) ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));

    if (this.state !== 'menu') {
      for (const b of this.bricks) b.draw(ctx);
      for (const p of this.powerups) p.draw(ctx);

      ctx.fillStyle = '#ff6b81';
      for (const l of this.lasers) ctx.fillRect(l.x, l.y, LASER_CFG.W, LASER_CFG.H);

      for (const b of this.balls) b.draw(ctx);
      this.paddle.draw(ctx);
      this.particles.draw(ctx);
    } else {
      // 菜单背景：静态演示布局
      this.drawTitleBricks(ctx);
    }
    ctx.restore();
  }

  drawTitleBricks(ctx) {
    const colors = ['#ff4d4d', '#ffd700', '#2ed573', '#1e90ff'];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 11; c++) {
        ctx.fillStyle = colors[(r + c) % 4];
        ctx.globalAlpha = 0.25 + r * 0.1;
        ctx.fillRect(22 + c * 42, 90 + r * 26, 37, 20);
      }
    ctx.globalAlpha = 1;
  }

  // ---------- HUD / 横幅 ----------
  updateHud() {
    this.dom.score.textContent = this.score;
    this.dom.level.textContent = this.levelIndex + 1;
    this.dom.lives.textContent = '♥'.repeat(Math.max(0, this.lives));
    this.dom.high.textContent = Math.max(this.high, this.score);
  }

  showBanner(text, frames) {
    this.dom.banner.textContent = text;
    this.dom.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    if (frames !== Infinity) {
      this.bannerTimer = setTimeout(() => this.hideBanner(), frames * (1000 / 60));
    }
  }

  hideBanner() {
    this.dom.banner.classList.remove('show');
    clearTimeout(this.bannerTimer);
  }
}

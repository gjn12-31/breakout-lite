// 入口：装配 DOM、输入、游戏实例并启动主循环
import { Game } from './game.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const dom = {
  score: document.getElementById('score'),
  level: document.getElementById('level'),
  lives: document.getElementById('lives'),
  high: document.getElementById('high'),
  banner: document.getElementById('banner'),
  menu: document.getElementById('menu'),
  over: document.getElementById('over'),
  overTitle: document.getElementById('over-title'),
  overScore: document.getElementById('over-score'),
  overHigh: document.getElementById('over-high'),
};

const game = new Game(ctx, dom);
game.setInput(new Input(canvas));

document.getElementById('start-btn').addEventListener('click', () => game.newRun());
document.getElementById('retry-btn').addEventListener('click', () => game.newRun());

// 主循环：RAF 驱动，逻辑与渲染同帧
function loop() {
  game.update();
  game.draw();
  requestAnimationFrame(loop);
}
loop();

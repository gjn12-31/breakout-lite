// 输入统一处理：键盘 + 鼠标 + 触摸
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointerX = null; // 画布坐标
    this.onAction = null; // 发球 / 释放粘球 / 发射激光
    this.onPause = null;
    this.onRestart = null;
    this.onMute = null;

    window.addEventListener('keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.code === 'Space') this.onAction && this.onAction();
      if (e.code === 'KeyP' || e.code === 'Escape') this.onPause && this.onPause();
      if (e.code === 'Enter') this.onRestart && this.onRestart();
      if (e.code === 'KeyM') this.onMute && this.onMute();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));

    const toCanvasX = clientX => {
      const rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) * (canvas.width / rect.width);
    };
    canvas.addEventListener('mousemove', e => { this.pointerX = toCanvasX(e.clientX); });
    canvas.addEventListener('mousedown', () => this.onAction && this.onAction());
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      this.pointerX = toCanvasX(e.touches[0].clientX);
    }, { passive: false });
    canvas.addEventListener('touchstart', () => this.onAction && this.onAction());
  }

  left()  { return this.keys.has('ArrowLeft') || this.keys.has('KeyA'); }
  right() { return this.keys.has('ArrowRight') || this.keys.has('KeyD'); }
}

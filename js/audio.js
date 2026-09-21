// WebAudio 合成音效：无需任何音频素材文件
class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  // 浏览器要求用户交互后才能出声，首次调用时懒加载
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  tone({ freq = 440, endFreq = null, dur = 0.08, type = 'square', vol = 0.12 }) {
    if (!this.enabled || !this.ensure()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  paddle()     { this.tone({ freq: 220, endFreq: 320, dur: 0.06, type: 'triangle' }); }
  brick()      { this.tone({ freq: 500, endFreq: 380, dur: 0.05 }); }
  brickBreak() { this.tone({ freq: 620, endFreq: 180, dur: 0.12, vol: 0.14 }); }
  power()      { this.tone({ freq: 523, endFreq: 1046, dur: 0.18, type: 'sine', vol: 0.16 }); }
  laser()      { this.tone({ freq: 1200, endFreq: 300, dur: 0.07, type: 'sawtooth', vol: 0.07 }); }
  lose()       { this.tone({ freq: 300, endFreq: 60, dur: 0.5, type: 'sawtooth', vol: 0.14 }); }

  level() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone({ freq: f, dur: 0.12, type: 'sine', vol: 0.15 }), i * 90));
  }

  over() {
    [392, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => this.tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.15 }), i * 160));
  }
}

// 单例导出，整个游戏共用一个 AudioContext
export const sfx = new Sfx();

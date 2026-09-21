// 通用小工具
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const rand = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(rand(min, max + 1));

// 按权重随机选择 [{ weight, ... }, ...] 中的一项
export function weightedChoice(items) {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let roll = Math.random() * total;
  for (const it of items) {
    roll -= it.weight;
    if (roll <= 0) return it;
  }
  return items[items.length - 1];
}

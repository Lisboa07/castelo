/**
 * Labirinto perfeito (árvore): existe exatamente um caminho entre quaisquer duas células.
 * Baseado em recursive backtracking (Jamis Buck).
 */

const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** grid[y][x]: true = parede, false = corredor (antes de converter para # / .) */
function carve(
  grid: boolean[][],
  cx: number,
  cy: number,
  rng: () => number
): void {
  grid[cy][cx] = false;
  const order = shuffle([0, 1, 2, 3], rng);
  for (const d of order) {
    const nx = cx + DX[d] * 2;
    const ny = cy + DY[d] * 2;
    const h = grid.length;
    const w = grid[0].length;
    if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && grid[ny][nx]) {
      grid[cy + DY[d]][cx + DX[d]] = false;
      carve(grid, nx, ny, rng);
    }
  }
}

function gridToRows(grid: boolean[][]): string[] {
  return grid.map((row) => row.map((wall) => (wall ? '#' : '.')).join(''));
}

export type MazeBuildOptions = {
  cellsW: number;
  cellsH: number;
  seed: number;
  /** preencher até esta largura com # à direita */
  targetWidth: number;
  /** preencher até esta altura com # em baixo */
  targetHeight: number;
};

/**
 * Gera mapa com borda externa de # e interior perfeito.
 * Dimensões do grid ímpares: (cellsW*2+1) x (cellsH*2+1).
 */
export function buildPerfectMaze(opts: MazeBuildOptions): string[] {
  const { cellsW, cellsH, seed, targetWidth, targetHeight } = opts;
  const rng = mulberry32(seed);
  const H = cellsH * 2 + 1;
  const W = cellsW * 2 + 1;
  const grid: boolean[][] = Array(H)
    .fill(0)
    .map(() => Array(W).fill(true));
  carve(grid, 1, 1, rng);

  let rows = gridToRows(grid);

  if (rows[0].length < targetWidth) {
    const pad = targetWidth - rows[0].length;
    rows = rows.map((r) => r + '#'.repeat(pad));
  }
  while (rows.length < targetHeight) {
    rows.push('#'.repeat(targetWidth));
  }
  if (rows.length > targetHeight) {
    rows = rows.slice(0, targetHeight);
  }
  return rows;
}

type Pt = { x: number; y: number };

function neighbors4(m: string[], p: Pt): Pt[] {
  const h = m.length;
  const w = m[0].length;
  const out: Pt[] = [];
  for (let d = 0; d < 4; d++) {
    const x = p.x + DX[d];
    const y = p.y + DY[d];
    if (x >= 0 && x < w && y >= 0 && y < h && m[y][x] === '.') {
      out.push({ x, y });
    }
  }
  return out;
}

/** BFS: distância a partir de start em células '.' */
function bfsDist(m: string[], start: Pt): Map<string, number> {
  const key = (p: Pt) => `${p.x},${p.y}`;
  const dist = new Map<string, number>();
  const q: Pt[] = [start];
  dist.set(key(start), 0);
  for (let qi = 0; qi < q.length; qi++) {
    const p = q[qi];
    const d0 = dist.get(key(p)) ?? 0;
    for (const n of neighbors4(m, p)) {
      const k = key(n);
      if (!dist.has(k)) {
        dist.set(k, d0 + 1);
        q.push(n);
      }
    }
  }
  return dist;
}

/** Células '.' com exatamente um vizinho '.' (ponta do grafo). */
function deadEndDots(m: string[]): Pt[] {
  const h = m.length;
  const w = m[0].length;
  const out: Pt[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (m[y][x] !== '.') continue;
      if (neighbors4(m, { x, y }).length === 1) {
        out.push({ x, y });
      }
    }
  }
  return out;
}

/**
 * Coloca P na célula '.' mais distante de (1,1).
 * Se withSecret: coloca S numa ponta (ramal) com maior afastamento de P (lado oposto no mapa).
 */
export function placeGoals(
  rows: string[],
  withSecret: boolean
): { rows: string[]; start: Pt } {
  const start: Pt = { x: 1, y: 1 };
  if (rows[1][1] !== '.') {
    throw new Error('Maze: esperado corredor em (1,1)');
  }
  const dist = bfsDist(rows, start);
  let bestP: Pt | null = null;
  let bestD = -1;
  const h = rows.length;
  const w = rows[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] !== '.') continue;
      const k = `${x},${y}`;
      const d = dist.get(k);
      if (d !== undefined && d > bestD) {
        bestD = d;
        bestP = { x, y };
      }
    }
  }
  if (!bestP) throw new Error('Maze: sem P');

  const line = (row: string, x: number, ch: string): string =>
    row.slice(0, x) + ch + row.slice(x + 1);

  let out = rows.map((r) => r);
  out[bestP.y] = line(out[bestP.y], bestP.x, 'P');

  if (withSecret) {
    const ends = deadEndDots(rows).filter(
      (p) =>
        !(p.x === bestP!.x && p.y === bestP!.y) &&
        !(p.x === start.x && p.y === start.y)
    );
    let bestS: Pt | null = null;
    let bestScore = -1;
    for (const p of ends) {
      const man = Math.abs(p.x - bestP!.x) + Math.abs(p.y - bestP!.y);
      if (man > bestScore) {
        bestScore = man;
        bestS = p;
      }
    }
    if (bestS) {
      out[bestS.y] = line(out[bestS.y], bestS.x, 'S');
    }
  }

  return { rows: out, start };
}

import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { buildPerfectMaze, placeGoals } from './maze-gen';

type Tile = '#' | '.' | 'P' | 'S';

type Vec2 = { x: number; y: number };

function buildAllLevels(): string[][] {
  const configs = [
    { cellsW: 6, cellsH: 6, seed: 0x5a11e1 },
    { cellsW: 7, cellsH: 7, seed: 0x5a11e2 },
    { cellsW: 8, cellsH: 8, seed: 0x5a11e3 },
    { cellsW: 9, cellsH: 8, seed: 0x5a11e4 },
    { cellsW: 9, cellsH: 9, seed: 0x5a11e5 },
  ];
  return configs.map((cfg, i) => {
    const raw = buildPerfectMaze({
      cellsW: cfg.cellsW,
      cellsH: cfg.cellsH,
      seed: cfg.seed,
      targetWidth: 20,
      targetHeight: 20,
    });
    return placeGoals(raw, i === 4).rows;
  });
}

@Component({
  selector: 'app-resgate-princesa',
  templateUrl: './resgate-princesa.component.html',
  styleUrls: ['./resgate-princesa.component.css'],
})
export class ResgatePrincesaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(private router: Router) {}

  showXuliaConfirm = false;
  showSecretRoom = false;

  /** Tamanho base de desenho (escala proporcional no `resizeCanvas`). */
  private readonly baseTileSize = 32;
  private effectiveTileSize = 32;
  get tileSize(): number {
    return this.effectiveTileSize;
  }
  readonly uiScale = window.devicePixelRatio || 1;

  phase = 1;
  readonly maxPhase = 5;
  gameState: 'playing' | 'phase_complete' | 'game_complete' = 'playing';

  moves = 0;
  message = 'Fase 1 — um único caminho até a princesa. Boa sorte!';

  private ctx!: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private lastStepAt = 0;

  private level: Tile[][] = [];
  private readonly levels = buildAllLevels();

  private get stepMs(): number {
    return Math.max(62, 108 - (this.phase - 1) * 11);
  }

  private player: Vec2 = { x: 1, y: 1 };

  /** Início do arraste no canvas (toque ou mouse) para definir direção. */
  private swipe: { id: number; x: number; y: number } | null = null;

  ngAfterViewInit(): void {
    this.reset();
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D não disponível');
    this.ctx = ctx;
    this.resizeCanvas();
    this.loop(performance.now());
  }

  ngOnDestroy(): void {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
  }

  reset(): void {
    this.phase = 1;
    this.gameState = 'playing';
    this.moves = 0;
    this.message = 'Fase 1 — um único caminho até a princesa. Boa sorte!';
    this.loadLevelFromText(this.levels[0]);
    this.player = { x: 1, y: 1 };
    this.lastStepAt = 0;
    this.showSecretRoom = false;
    this.resizeCanvas();
  }

  private loadLevelFromText(rows: string[]): void {
    this.level = rows.map((row) => row.split('') as Tile[]);
  }

  private startPhase(next: number): void {
    if (next < 1 || next > this.maxPhase) return;
    this.phase = next;
    this.gameState = 'playing';
    this.moves = 0;
    this.message =
      next === this.maxPhase
        ? `Última fase — há um brilho ✦ num ramal; a princesa fica no lado oposto do mapa.`
        : `Fase ${next} — só existe uma rota até a princesa.`;
    this.loadLevelFromText(this.levels[next - 1]);
    this.player = { x: 1, y: 1 };
    this.lastStepAt = 0;
    this.showSecretRoom = false;
    this.resizeCanvas();
  }

  onNextPhaseClick(): void {
    if (this.phase < this.maxPhase) {
      this.startPhase(this.phase + 1);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.showSecretRoom) {
      e.preventDefault();
      this.closeSecretRoom();
      return;
    }
    const key = e.key.toLowerCase();
    const dir =
      key === 'arrowup' || key === 'w' ? { x: 0, y: -1 } :
      key === 'arrowdown' || key === 's' ? { x: 0, y: 1 } :
      key === 'arrowleft' || key === 'a' ? { x: -1, y: 0 } :
      key === 'arrowright' || key === 'd' ? { x: 1, y: 0 } :
      null;

    if (!dir) return;
    e.preventDefault();
    this.tryMove(dir);
  }

  onPointerDownCanvas(e: PointerEvent): void {
    if (this.gameState !== 'playing' || this.showSecretRoom) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const el = this.canvasRef.nativeElement;
    el.setPointerCapture(e.pointerId);
    this.swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  onPointerUpCanvas(e: PointerEvent): void {
    if (!this.swipe || e.pointerId !== this.swipe.id) return;
    e.preventDefault();
    const el = this.canvasRef.nativeElement;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* já liberado */
    }
    const dx = e.clientX - this.swipe.x;
    const dy = e.clientY - this.swipe.y;
    this.swipe = null;
    const min = 28;
    if (Math.abs(dx) < min && Math.abs(dy) < min) return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.tryMove({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      this.tryMove({ x: 0, y: dy > 0 ? 1 : -1 });
    }
  }

  onPointerCancelCanvas(e: PointerEvent): void {
    if (!this.swipe || e.pointerId !== this.swipe.id) return;
    const el = this.canvasRef.nativeElement;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    this.swipe = null;
  }

  /** Botões direcionais (toque). */
  onDpadPointerDown(e: PointerEvent, dir: Vec2): void {
    if (this.gameState !== 'playing' || this.showSecretRoom) return;
    e.preventDefault();
    this.tryMove(dir);
  }

  onRestartClick(): void {
    this.reset();
  }

  openXuliaConfirm(): void {
    this.showXuliaConfirm = true;
  }

  cancelXuliaConfirm(): void {
    this.showXuliaConfirm = false;
  }

  closeSecretRoom(): void {
    this.showSecretRoom = false;
  }

  confirmEnterXulia(): void {
    this.showXuliaConfirm = false;
    void this.router.navigate(['/xulia']);
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const wTiles = this.level[0]?.length ?? 20;
    const hTiles = this.level.length ?? 15;
    this.effectiveTileSize = this.computeTileSizeForViewport(wTiles, hTiles);
    const ts = this.effectiveTileSize;
    const cssW = wTiles * ts;
    const cssH = hTiles * ts;

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * this.uiScale);
    canvas.height = Math.floor(cssH * this.uiScale);

    if (this.ctx) {
      this.ctx.setTransform(this.uiScale, 0, 0, this.uiScale, 0, 0);
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  /**
   * Escala o tabuleiro para caber na largura da tela (ref. 1242 px retrato) e na altura útil,
   * mantendo leitura em ~458 ppi em aparelhos de alta densidade.
   */
  private computeTileSizeForViewport(wTiles: number, hTiles: number): number {
    if (typeof window === 'undefined') return this.baseTileSize;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const marginH = 20;
    const maxCssW = Math.min(vw - marginH, 1242 - 64);
    const reservedTop = 140;
    const reservedBottom = 220;
    const maxCssH = Math.max(120, vh - reservedTop - reservedBottom);
    const tw = maxCssW / wTiles;
    const th = maxCssH / hTiles;
    const raw = Math.min(tw, th, this.baseTileSize);
    return Math.max(14, Math.floor(raw));
  }

  private loop = (now: number) => {
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
    if (this.lastStepAt === 0) this.lastStepAt = now;
  };

  private tryMove(dir: Vec2): void {
    if (this.gameState !== 'playing') return;

    const now = performance.now();
    if (now - this.lastStepAt < this.stepMs) return;
    this.lastStepAt = now;

    const nx = this.player.x + dir.x;
    const ny = this.player.y + dir.y;
    const tile = this.getTile(nx, ny);
    if (!tile || tile === '#') return;

    this.player = { x: nx, y: ny };
    this.moves += 1;

    if (tile === 'P') {
      if (this.phase < this.maxPhase) {
        this.gameState = 'phase_complete';
        this.message = `Fase ${this.phase} concluída! Toque em "Próxima fase" para continuar.`;
      } else {
        this.gameState = 'game_complete';
        this.message = 'Última fase concluída! Veja a foto e clique em "Jogar de novo".';
      }
    } else if (tile === 'S') {
      if (this.phase === this.maxPhase) {
        this.showSecretRoom = true;
        this.message = 'Você encontrou o canto secreto!';
      }
    }
  }

  private getTile(x: number, y: number): Tile | null {
    if (y < 0 || y >= this.level.length) return null;
    const row = this.level[y];
    if (x < 0 || x >= row.length) return null;
    return row[x];
  }

  private draw(): void {
    const ctx = this.ctx;
    const s = this.tileSize;
    const r = s / this.baseTileSize;
    const wTiles = this.level[0]?.length ?? 0;
    const hTiles = this.level.length ?? 0;
    const w = wTiles * s;
    const h = hTiles * s;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < hTiles; y++) {
      for (let x = 0; x < wTiles; x++) {
        const t = this.level[y][x];
        const px = x * s;
        const py = y * s;

        if (t === '#') {
          ctx.fillStyle = '#1f2a44';
          ctx.fillRect(px, py, s, s);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(px + 2 * r, py + 2 * r, s - 4 * r, s - 4 * r);
          continue;
        }

        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(px, py, s, s);

        if (t === 'S') this.drawSecretMark(px, py);
        if (t === 'P') this.drawPrincess(px, py);
      }
    }

    this.drawPlayer(this.player.x * s, this.player.y * s);
  }

  private drawPlayer(x: number, y: number): void {
    const ctx = this.ctx;
    const s = this.tileSize;
    const r = s / this.baseTileSize;

    ctx.fillStyle = '#4ade80';
    ctx.fillRect(x + 7 * r, y + 8 * r, s - 14 * r, s - 10 * r);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x + 10 * r, y + 6 * r, s - 20 * r, 6 * r);
    ctx.fillStyle = '#052e16';
    const eye = Math.max(2, 4 * r);
    ctx.fillRect(x + 12 * r, y + 14 * r, eye, eye);
    ctx.fillRect(x + s - 16 * r, y + 14 * r, eye, eye);
  }

  private drawPrincess(x: number, y: number): void {
    const ctx = this.ctx;
    const s = this.tileSize;
    const r = s / this.baseTileSize;

    ctx.fillStyle = '#f472b6';
    ctx.fillRect(x + 7 * r, y + 10 * r, s - 14 * r, s - 12 * r);
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(x + 10 * r, y + 7 * r, s - 20 * r, 6 * r);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(x + 11 * r, y + 5 * r, s - 22 * r, 4 * r);
  }

  private drawSecretMark(x: number, y: number): void {
    const ctx = this.ctx;
    const s = this.tileSize;
    const cx = x + s / 2;
    const cy = y + s / 2;
    ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = `${Math.max(10, Math.floor(s * 0.55))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', cx, cy + 1);
  }
}

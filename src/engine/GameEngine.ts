import { Player, Bullet } from "./GameEntities";
import { GameMode, COLORS, PlayerData } from "../types";
import { nanoid } from "nanoid";

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  mode: GameMode;
  localPlayer: Player;
  players: Map<string, Player> = new Map();
  bullets: Bullet[] = [];
  keys: Record<string, boolean> = {};
  mouse = { x: 0, y: 0 };
  onGameOver: (winnerId: string, kills: number) => void;
  onShoot: (bullet: Bullet) => void;
  onHit: (targetId: string) => void;

  private lastShotTime: number = 0;
  private shootCooldown: number = 250; // ms

  constructor(canvas: HTMLCanvasElement, mode: GameMode, onGameOver: any) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mode = mode;
    this.onGameOver = onGameOver;

    const startX = mode === GameMode.SOLO ? 100 : canvas.width / 2;
    const startY = mode === GameMode.SOLO ? 100 : canvas.height / 2;
    this.localPlayer = new Player('local', startX, startY, COLORS.PLAYER);
    
    if (mode === GameMode.SOLO) {
      const ai = new Player('ai', canvas.width - 100, canvas.height - 100, COLORS.ENEMY, true);
      this.players.set('ai', ai);
    }

    // Input Listeners
    window.addEventListener('keydown', (e) => this.handleKeyDown(e.key));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e.key));
  }

  handleKeyDown(key: string) { this.keys[key.toLowerCase()] = true; }
  handleKeyUp(key: string) { this.keys[key.toLowerCase()] = false; }
  handleMouseMove(x: number, y: number) { this.mouse = { x, y }; }

  handleClick() {
    const now = Date.now();
    if (now - this.lastShotTime > this.shootCooldown && this.localPlayer.health > 0) {
      const bullet = new Bullet(
        this.localPlayer.x, 
        this.localPlayer.y, 
        this.localPlayer.angle, 
        this.localPlayer.id, 
        COLORS.PLAYER_BULLET
      );
      this.bullets.push(bullet);
      this.lastShotTime = now;
      if (this.onShoot) this.onShoot(bullet);
    }
  }

  update() {
    if (this.localPlayer.health <= 0) return;

    this.localPlayer.update(this.keys, this.mouse, this.canvas.width, this.canvas.height);

    // AI Logic (Solo)
    if (this.mode === GameMode.SOLO) {
      const ai = this.players.get('ai');
      if (ai && ai.health > 0) {
        // Simple random movement + shoot at player
        ai.x += (Math.random() - 0.5) * 5;
        ai.y += (Math.random() - 0.5) * 5;
        
        // Aim at player
        ai.angle = Math.atan2(this.localPlayer.y - ai.y, this.localPlayer.x - ai.x);

        // Random shoot
        if (Math.random() < 0.02) {
           const bullet = new Bullet(ai.x, ai.y, ai.angle, ai.id, COLORS.ENEMY_BULLET);
           this.bullets.push(bullet);
        }

        // Boundaries
        ai.x = Math.max(ai.size, Math.min(this.canvas.width - ai.size, ai.x));
        ai.y = Math.max(ai.size, Math.min(this.canvas.height - ai.size, ai.y));
      }
    }

    // Bullets update & collision
    this.bullets = this.bullets.filter(bullet => {
      const outOfBounds = bullet.update(this.canvas.width, this.canvas.height);
      if (outOfBounds) return false;

      // Check hit with LOCAL player if bullet not owned by local
      if (bullet.ownerId !== 'local') {
        if (this.checkCollision(bullet, this.localPlayer)) {
          this.localPlayer.health--;
          if (this.localPlayer.health <= 0) {
            this.onGameOver('enemy', this.localPlayer.kills);
          }
          return false;
        }
      }

      // Check hit with enemies/remote players
      for (const [id, p] of this.players.entries()) {
        if (bullet.ownerId !== id && p.health > 0) {
          if (this.checkCollision(bullet, p)) {
            p.health--;
            if (bullet.ownerId === 'local') {
              this.localPlayer.kills++;
              if (this.onHit) this.onHit(id);
            }
            if (p.health <= 0 && this.mode === GameMode.SOLO) {
              this.onGameOver('local', this.localPlayer.kills);
            }
            return false;
          }
        }
      }

      return true;
    });
  }

  private checkCollision(bullet: Bullet, player: Player): boolean {
    const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
    return dist < (bullet.size + player.size / 2);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Background gradient
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, COLORS.BACKGROUND_TOP);
    grad.addColorStop(1, COLORS.BACKGROUND_BOTTOM);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Remote players
    for (const p of this.players.values()) {
      if (p.health > 0) p.draw(this.ctx, false);
    }

    // Local player
    if (this.localPlayer.health > 0) {
      this.localPlayer.draw(this.ctx, true);
    }

    // Bullets
    for (const b of this.bullets) {
      b.draw(this.ctx);
    }
  }
}

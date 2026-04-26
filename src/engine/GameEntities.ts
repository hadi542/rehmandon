import { Vector2D, PlayerData, BulletData, COLORS } from "../types";
import { nanoid } from "nanoid";

export class Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  color: string;
  speed: number = 10;
  size: number = 4;

  constructor(x: number, y: number, angle: number, ownerId: string, color: string) {
    this.id = nanoid();
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.ownerId = ownerId;
    this.color = color;
  }

  update(width: number, height: number): boolean {
    this.x += this.vx;
    this.y += this.vy;
    
    // Remove if out of bounds
    return (this.x < 0 || this.x > width || this.y < 0 || this.y > height);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export class Player {
  id: string;
  x: number;
  y: number;
  angle: number = 0;
  health: number = 3;
  kills: number = 0;
  color: string;
  size: number = 25;
  speed: number = 4;
  isAI: boolean;
  gunLength: number = 20;

  constructor(id: string, x: number, y: number, color: string, isAI = false) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.color = color;
    this.isAI = isAI;
  }

  update(keys: Record<string, boolean>, mouse: Vector2D, width: number, height: number) {
    if (!this.isAI) {
      if (keys['w'] || keys['ArrowUp']) this.y -= this.speed;
      if (keys['s'] || keys['ArrowDown']) this.y += this.speed;
      if (keys['a'] || keys['ArrowLeft']) this.x -= this.speed;
      if (keys['d'] || keys['ArrowRight']) this.x += this.speed;

      this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    }

    // Boundaries
    this.x = Math.max(this.size, Math.min(width - this.size, this.x));
    this.y = Math.max(this.size, Math.min(height - this.size, this.y));
  }

  draw(ctx: CanvasRenderingContext2D, isLocal: boolean) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw Gun barrel
    ctx.fillStyle = this.isAI ? "#ffaa00" : "#39ff14";
    ctx.fillRect(0, -3, this.gunLength, 6);

    // Draw Player body
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
    
    ctx.restore();
    
    // Draw Health indicators above
    const heartSpacing = 15;
    const startX = this.x - ((this.health - 1) * heartSpacing) / 2;
    for (let i = 0; i < this.health; i++) {
       ctx.fillStyle = "#ff1e1e";
       ctx.beginPath();
       ctx.arc(startX + i * heartSpacing, this.y - this.size - 10, 4, 0, Math.PI * 2);
       ctx.fill();
    }
  }

  toData(): PlayerData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      health: this.health,
      kills: this.kills,
      color: this.color,
      isAI: this.isAI
    };
  }
}

export enum GameMode {
  MENU,
  LOBBY,
  SOLO,
  MULTIPLAYER,
  GAMEOVER
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerData {
  id: string;
  x: number;
  y: number;
  angle: number;
  health: number;
  kills: number;
  color: string;
  isAI?: boolean;
}

export interface BulletData {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  color: string;
}

export const COLORS = {
  BACKGROUND_TOP: "#0a0e27",
  BACKGROUND_BOTTOM: "#1a0033",
  PLAYER: "#00ffff",
  ENEMY: "#ff006e",
  PLAYER_BULLET: "#39ff14",
  ENEMY_BULLET: "#ffaa00",
  UI_TEXT: "#00ffff",
};

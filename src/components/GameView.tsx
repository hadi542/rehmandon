import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { GameMode, COLORS } from '../types';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, User, Play, LogOut, Heart, Target } from 'lucide-react';

const SOCKET_URL = window.location.origin;

import { Player, Bullet } from '../engine/GameEntities';

export default function Game() {
  const [mode, setMode] = useState<GameMode>(GameMode.MENU);
  const [roomId, setRoomId] = useState('');
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [gameResult, setGameResult] = useState<{ winner: string; kills: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const frameId = useRef<number>();

  useEffect(() => {
    if (mode === GameMode.MULTIPLAYER) {
      if (!socketRef.current) {
        socketRef.current = io(SOCKET_URL);
      }
      
      const socket = socketRef.current;

      socket.on("remote-player-state", (data) => {
        if (!engineRef.current) return;
        let p = engineRef.current.players.get(data.id);
        if (!p) {
           // Create remote player
           p = new Player(data.id, data.x, data.y, COLORS.ENEMY);
           engineRef.current.players.set(data.id, p);
        }
        p.x = data.x;
        p.y = data.y;
        p.angle = data.angle;
        p.health = data.health;
      });

      socket.on("remote-shoot", (data) => {
        if (!engineRef.current) return;
        const bullet = new Bullet(data.x, data.y, data.angle, data.playerId, COLORS.ENEMY_BULLET);
        engineRef.current.bullets.push(bullet);
      });

      socket.on("remote-hit", (data) => {
        if (data.targetId === 'local' && engineRef.current) {
           engineRef.current.localPlayer.health--;
           if (engineRef.current.localPlayer.health <= 0) {
              setGameResult({ winner: 'DEFEAT', kills: engineRef.current.localPlayer.kills });
              setMode(GameMode.GAMEOVER);
           }
        } else if (engineRef.current) {
           const p = engineRef.current.players.get(data.targetId);
           if (p) p.health--;
        }
      });
    }

    return () => {
      socketRef.current?.off("remote-player-state");
      socketRef.current?.off("remote-shoot");
      socketRef.current?.off("remote-hit");
    };
  }, [mode]);

  const startGameLoop = () => {
    if (!canvasRef.current) return;
    
    const engine = new GameEngine(canvasRef.current, mode, (winner: string, kills: number) => {
      setGameResult({ winner, kills });
      setMode(GameMode.GAMEOVER);
      if (socketRef.current) socketRef.current.disconnect();
    });

    if (mode === GameMode.MULTIPLAYER) {
      engine.onShoot = (bullet) => {
        socketRef.current?.emit("shoot", roomId, { x: bullet.x, y: bullet.y, angle: Math.atan2(bullet.vy, bullet.vx) });
      };
      engine.onHit = (targetId) => {
        socketRef.current?.emit("player-hit", roomId, targetId);
      };
    }

    engineRef.current = engine;

    const loop = () => {
      engine.update();
      engine.draw();

      if (mode === GameMode.MULTIPLAYER && engine.localPlayer.health > 0) {
        socketRef.current?.emit("player-state", roomId, engine.localPlayer.toData());
      }

      frameId.current = requestAnimationFrame(loop);
    };

    loop();
  };

  useEffect(() => {
    if (mode === GameMode.SOLO || (mode === GameMode.MULTIPLAYER && roomId)) {
       // Need to wait for canvas mount if multiplayer
       setTimeout(startGameLoop, 100);
    }
    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, [mode, roomId]);

  const createRoom = () => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.emit("create-room");
    socket.on("room-created", (id) => {
      setRoomId(id);
      setMode(GameMode.LOBBY);
    });
    socket.on("players-update", (players) => {
      setLobbyPlayers(players);
    });
    socket.on("game-started", () => {
      setMode(GameMode.MULTIPLAYER);
    });
  };

  const joinRoom = (id: string) => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.emit("join-room", id, { name: "Player", color: COLORS.PLAYER });
    socket.on("room-joined", ({ roomId }) => {
      setRoomId(roomId);
      setMode(GameMode.LOBBY);
    });
    socket.on("players-update", (players) => {
      setLobbyPlayers(players);
    });
    socket.on("game-started", () => {
      setMode(GameMode.MULTIPLAYER);
    });
    socket.on("error", (msg) => alert(msg));
  };


  return (
    <div className="w-full h-screen bg-[#0a0e27] text-white flex flex-col items-center justify-center font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        {mode === GameMode.MENU && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-8 bg-white/5 p-12 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <h1 className="text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-pink-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
              REHMANDON
            </h1>
            <p className="text-cyan-400/60 font-mono tracking-widest text-sm uppercase">Ultra Precise 2D Shooter</p>
            
            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={() => setMode(GameMode.SOLO)}
                className="group relative flex items-center justify-center gap-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <User size={24} /> SOLO MODE
              </button>
              
              <div className="flex gap-4">
                <button 
                  onClick={createRoom}
                  className="flex-1 flex items-center justify-center gap-3 bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                  <Users size={24} /> HOST
                </button>
                <button 
                  onClick={() => {
                    const id = prompt("Enter Game Code:");
                    if (id) joinRoom(id.toUpperCase());
                  }}
                  className="flex-1 flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-xl transition-all border border-white/10"
                >
                  JOIN
                </button>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-white/40 font-mono">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-1.5 py-0.5 rounded">WASD</span> Movement
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-1.5 py-0.5 rounded">CLICK</span> Shoot
              </div>
            </div>
          </motion.div>
        )}

        {mode === GameMode.LOBBY && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-8 bg-black/40 p-10 rounded-2xl border border-white/10 w-96"
          >
            <h2 className="text-4xl font-bold text-cyan-400">LOBBY</h2>
            <div className="bg-black/50 p-4 rounded-xl text-center w-full">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Room Code</p>
              <p className="text-5xl font-mono font-black text-pink-500 tracking-tighter">{roomId}</p>
            </div>
            
            <div className="w-full flex flex-col gap-2">
              <p className="text-xs text-white/30 uppercase font-mono px-2">Players Joined ({lobbyPlayers.length})</p>
              {lobbyPlayers.map((p, i) => (
                <div key={i} className="bg-white/5 p-3 rounded-lg flex items-center gap-3 border border-white/5">
                  <div className="w-3 h-3 rounded-full bg-cyan-400" />
                  <span className="font-bold">{p.name || `Player ${i+1}`}</span>
                  {i === 0 && <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded uppercase">Host</span>}
                </div>
              ))}
            </div>

            <button 
              onClick={() => socketRef.current?.emit("start-game", roomId)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-xl transition-all"
            >
              START BATTLE
            </button>
          </motion.div>
        )}

        {(mode === GameMode.SOLO || mode === GameMode.MULTIPLAYER) && (
          <div className="relative group">
            <canvas 
              ref={canvasRef} 
              width={800} 
              height={600} 
              className="rounded-2xl border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-crosshair"
              onMouseDown={(e) => engineRef.current?.handleClick()}
              onMouseMove={(e) => {
                const rect = canvasRef.current!.getBoundingClientRect();
                engineRef.current?.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);
              }}
            />
            {/* HUD */}
            <div className="absolute top-6 left-6 flex items-center gap-8 pointer-events-none">
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                <Heart className="text-pink-500 fill-pink-500" size={20} />
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3 h-3 rounded-sm rotate-45 transition-all ${i < (engineRef.current?.localPlayer.health || 0) ? 'bg-pink-500' : 'bg-white/10'}`} 
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                <Target className="text-cyan-400" size={20} />
                <span className="font-mono font-bold text-xl">{engineRef.current?.localPlayer.kills || 0}</span>
              </div>
            </div>
            
            {/* Floating Controls Hint */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 pointer-events-none">
              <p className="text-[10px] uppercase tracking-widest font-mono text-white/40">
                <span className="text-cyan-400">WASD</span> to Move • <span className="text-cyan-400">Mouse</span> to Aim • <span className="text-cyan-400">Click</span> to Shoot
              </p>
            </div>
          </div>
        )}

        {mode === GameMode.GAMEOVER && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-6 bg-white/5 p-16 rounded-3xl backdrop-blur-2xl border border-white/10 w-[400px]"
          >
             <Trophy size={80} className={gameResult?.winner === 'local' ? 'text-cyan-400' : 'text-pink-500'} />
             <div className="text-center">
               <h2 className={`text-6xl font-black italic ${gameResult?.winner === 'local' ? 'text-cyan-400' : 'text-pink-500'}`}>
                 {gameResult?.winner === 'local' ? 'VICTORY' : 'GAME OVER'}
               </h2>
               <p className="text-white/40 font-mono mt-2 tracking-widest uppercase">Eliminations: {gameResult?.kills}</p>
             </div>
             <button 
               onClick={() => window.location.reload()}
               className="w-full flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-xl transition-all hover:scale-105 active:scale-95"
             >
                <LogOut size={20} /> RETURN TO MENU
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-1 opacity-20 pointer-events-none">
         <p className="text-[10px] font-mono">BUILD V.1.0.4-NEON</p>
         <p className="text-[10px] font-mono">REHMANDON PROTOCOL ACTIVE</p>
      </div>
    </div>
  );
}

// Add key listeners
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    // We can't easily pass this to engineRef without context, so we'll use window events
  });
}

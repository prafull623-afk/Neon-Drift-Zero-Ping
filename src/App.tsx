/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, Play, Zap } from 'lucide-react';

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [highScore, setHighScore] = useState(0);
  
  // Game state refs to avoid closure issues in the loop
  const gameRef = useRef({
    score: 0,
    gameSpeed: 5,
    isDriftingRight: false,
    player: {
      x: 0,
      y: 0,
      width: 30,
      height: 50,
      color: '#00ffff',
      velocity: 0,
      driftPower: 6
    },
    obstacles: [] as Obstacle[],
    frameCount: 0,
    animationId: 0
  });

  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    gameRef.current = {
      score: 0,
      gameSpeed: 5,
      isDriftingRight: false,
      player: {
        x: canvas.width / 2 - 15,
        y: canvas.height - 150,
        width: 30,
        height: 50,
        color: '#00ffff',
        velocity: 0,
        driftPower: 6
      },
      obstacles: [],
      frameCount: 0,
      animationId: 0
    };
    setScore(0);
  };

  const spawnObstacle = (width: number) => {
    const size = 40 + Math.random() * 60;
    const xPos = Math.random() * (width - size);
    gameRef.current.obstacles.push({
      x: xPos,
      y: -100,
      width: size,
      height: size,
      color: '#ff00ff'
    });
  };

  const drawNeonRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, blur: number) => {
    ctx.shadowBlur = blur;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
  };

  const update = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const { player, obstacles, isDriftingRight, gameSpeed } = gameRef.current;

    // Move Player
    if (isDriftingRight) {
      player.x += player.driftPower;
    } else {
      player.x -= player.driftPower;
    }

    // Keep player on screen
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > width) player.x = width - player.width;

    // Spawn Obstacles
    gameRef.current.frameCount++;
    if (gameRef.current.frameCount % 40 === 0) {
      spawnObstacle(width);
      gameRef.current.gameSpeed += 0.05;
    }

    // Move and Draw Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.y += gameRef.current.gameSpeed;

      // Collision Detection
      if (
        player.x < obs.x + obs.width &&
        player.x + player.width > obs.x &&
        player.y < obs.y + obs.height &&
        player.y + player.height > obs.y
      ) {
        setGameState('gameover');
        cancelAnimationFrame(gameRef.current.animationId);
        return;
      }

      drawNeonRect(ctx, obs.x, obs.y, obs.width, obs.height, obs.color, 20);

      // Remove off-screen obstacles
      if (obs.y > height) {
        obstacles.splice(i, 1);
        gameRef.current.score += 10;
        setScore(gameRef.current.score);
      }
    }

    // Draw Player
    drawNeonRect(ctx, player.x, player.y, player.width, player.height, player.color, 25);
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    update(ctx, canvas.width, canvas.height);

    if (gameState === 'playing') {
      gameRef.current.animationId = requestAnimationFrame(gameLoop);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      initGame();
      gameLoop();
    }
    
    if (gameState === 'gameover') {
      if (score > highScore) {
        setHighScore(score);
      }
    }

    return () => {
      cancelAnimationFrame(gameRef.current.animationId);
    };
  }, [gameState]);

  const handleStart = () => {
    setGameState('playing');
  };

  const handleInputStart = () => {
    gameRef.current.isDriftingRight = true;
  };

  const handleInputEnd = () => {
    gameRef.current.isDriftingRight = false;
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#050510] overflow-hidden font-mono select-none"
      onMouseDown={handleInputStart}
      onMouseUp={handleInputEnd}
      onTouchStart={handleInputStart}
      onTouchEnd={handleInputEnd}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full"
      />

      {/* HUD */}
      <div className="absolute top-8 left-0 w-full flex flex-col items-center pointer-events-none">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,0,255,0.8)] tracking-tighter">
            SCORE: {score}
          </div>
          <div className="text-xs text-cyan-400 opacity-70 mt-1 uppercase tracking-widest">
            High Score: {highScore}
          </div>
        </motion.div>
      </div>

      {/* Instructions */}
      {gameState === 'playing' && (
        <div className="absolute bottom-12 left-0 w-full text-center pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-cyan-300 text-sm tracking-[0.2em] font-bold drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]"
          >
            HOLD TO DRIFT RIGHT • RELEASE TO DRIFT LEFT
          </motion.div>
        </div>
      )}

      {/* Overlays */}
      <AnimatePresence>
        {gameState === 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50"
          >
            <div className="flex flex-col items-center p-12 border border-cyan-500/30 bg-[#0a0a1a] rounded-3xl shadow-[0_0_50px_rgba(0,255,255,0.1)]">
              <div className="relative mb-8">
                <Zap className="w-16 h-16 text-cyan-400 animate-pulse" />
                <div className="absolute inset-0 blur-xl bg-cyan-400/20" />
              </div>
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter italic">
                NEON <span className="text-fuchsia-500">DRIFT</span>
              </h1>
              <p className="text-cyan-400/60 text-xs mb-12 tracking-[0.3em] uppercase">Zero Ping Protocol</p>
              
              <button 
                onClick={handleStart}
                className="group relative px-12 py-4 bg-transparent border-2 border-fuchsia-500 text-fuchsia-500 font-bold text-xl tracking-widest hover:bg-fuchsia-500 hover:text-white transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Play className="w-5 h-5 fill-current" />
                  INITIALIZE
                </span>
                <div className="absolute inset-0 bg-fuchsia-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-50"
          >
            <div className="flex flex-col items-center p-12 border border-fuchsia-500/30 bg-[#0a0a1a] rounded-3xl shadow-[0_0_50px_rgba(255,0,255,0.1)]">
              <Trophy className="w-16 h-16 text-yellow-400 mb-6" />
              <h2 className="text-4xl font-black text-white mb-2 tracking-tighter italic">
                SYSTEM <span className="text-red-500">CRASHED</span>
              </h2>
              <p className="text-red-400/60 text-xs mb-8 tracking-[0.2em] uppercase">Aura points deducted</p>
              
              <div className="flex flex-col items-center mb-12 gap-2">
                <div className="text-6xl font-black text-fuchsia-500 drop-shadow-[0_0_15px_rgba(255,0,255,0.5)]">
                  {score}
                </div>
                <div className="text-xs text-cyan-400/50 uppercase tracking-widest">Final Score</div>
              </div>

              <button 
                onClick={handleStart}
                className="group relative px-12 py-4 bg-fuchsia-500 text-white font-bold text-xl tracking-widest hover:bg-white hover:text-fuchsia-500 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  REBOOT
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
    </div>
  );
}

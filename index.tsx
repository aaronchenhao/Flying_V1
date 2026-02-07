import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./miniprogram/utils/wx-bridge";

// --- Game Constants & Types ---
type Stage = 1 | 2 | 3 | 4;
type GameState = "MENU" | "PLAYING" | "PAUSED" | "GAME_OVER" | "STAGE_CLEAR" | "VICTORY";
type ControlMode = "NORMAL" | "INVERTED" | "SWAP";
type Language = "CN" | "EN";

// --- Configuration / 开发者配置 ---
const ALLOW_SAFE_MODE_TOGGLE = true;

// --- WeChat MiniProgram Bridge ---
declare const window: any;
const wxBridge = typeof window !== 'undefined' ? window.wxBridge : null;
const wxNotifyReady = () => wxBridge?.notifyReady?.();
const wxNotifyGameOver = (score: number, stage: number) => wxBridge?.notifyGameOver?.(score, stage);
const wxNotifyStageClear = (stage: number, score: number) => wxBridge?.notifyStageClear?.(stage, score);
const wxVibrate = (short = true) => wxBridge?.vibrate?.(short);

// --- Logic Config ---
const STAGE_LOGIC = {
  1: { duration: 60, color: "#00d2ff", mode: "NORMAL" },
  2: { duration: 60, color: "#ff9900", mode: "INVERTED" },
  3: { duration: 60, color: "#ff0055", mode: "SWAP" },
  4: { duration: 180, color: "#9d00ff", mode: "RANDOM" }, 
};

// --- Localization ---
const TRANSLATIONS = {
    CN: {
        ui: {
            titleMain: "深空逃逸", 
            titleSub: "规避协议", 
            start: "启动",
            startHint: "[ 点击启动 · 拖拽躲避 ]", 
            gameplayHint: "核心任务：拒绝撞击",
            achievements: "成就", 
            manual: "指南", 
            faq: "常见问题",
            protocols: "基础协议",
            intel: "关卡情报",
            howToPlay: [
                "拖动屏幕任意位置移动核心。",
                "规避一切飞来的障碍体。",
                "存活 60 秒以突破当前层级。",
                "警告: 密切监视左上角的控制状态。"
            ],
            paused: "系统挂起",
            resume: "恢复连接",
            restart: "重置模拟",
            quit: "断开连接",
            score: "同步率",
            stagePrefix: "阶段",
            stageComplete: "阶段完成",
            crash: "信号丢失",
            next: "下一阶段:",
            continue: "继续任务",
            replay: "重新校准",
            legend: "传说",
            finalScore: "最终同步率",
            playAgain: "再次挑战",
            achievementUnlocked: "成就解锁",
            lockedDesc: "ACCESS DENIED",
            disclaimer: "用户协议", 
            morePlatforms: "平台", 
            privacy: "隐私政策", 
            bgmOn: "声音: 开", 
            bgmOff: "声音: 关", 
            safeMode: "安全模式",
            version: "v1.6.0", 
            legal: {
                title: "用户协议与条款",
                tabs: ["条款接受", "知识产权", "免责声明", "变更终止"], 
                content: {
                    0: `**1. 条款接受**\n启动本模拟程序（以下简称“游戏”）即表示您完全同意以下所有条款。如果您不同意，请立即断开神经连接（关闭游戏）。`,
                    1: `**2. 知识产权声明**\n本游戏的所有代码、视觉设计、音频资产及“深空 (DEEP SPACE)”品牌标识均归 DEEP SPACE STUDIO 所有。\n未经授权，严禁对本程序进行逆向工程、反编译或提取资源用于商业用途。`,
                    2: `**3. 免责声明 (重要)**\n本软件按“现状”提供，不包含任何形式的保证。\n**[健康警告]**\n- 包含高频闪烁图像。光敏性癫痫患者请勿游玩。\n- 如感到头晕、恶心，请立即停止。\n**[设备免责]**\n- 游戏难度极高，旨在测试人类极限。\n- 开发者不对因玩家情绪失控（Rage Quit）导致的设备损坏（如摔手机）负责。`,
                    3: `**4. 服务变更与终止**\nDEEP SPACE STUDIO 保留随时修改、暂停或终止服务的权利，恕不另行通知。`
                }
            },
            privacyContent: [
                 "**1. 数据存储**\n本游戏所有进度数据（如最高分、成就）均存储于您设备的本地缓存（LocalStorage）中，我们不会上传至任何云端服务器。",
                 "**2. 信息收集**\n我们要明确声明：DEEP SPACE STUDIO 不会收集您的姓名、电话、位置或任何个人敏感信息。",
                 "**3. 权限使用**\n游戏仅请求音频播放权限以提供沉浸式体验。我们不会访问您的相册、相机或麦克风。",
                 "**4. 第三方链接**\n“平台”模块中提供的社交媒体二维码仅用于导航，扫描后的交互行为受各自平台的隐私政策约束。"
            ],
            morePlatformsContent: [
                "即将登陆以下神经接口：",
                "- iOS App Store (审核中)",
                "- Google Play (预约中)",
                "- Steam (愿望单)",
                "- Neuralink (开发中)"
            ],
            socialChannels: [
                { name: "小红书", id: "xhs", color: "#ff2442", desc: "关注开发日志" }
            ],
            faqContent: [
                { q: "存档会丢失吗？", a: "不会。系统采用本地神经记忆（LocalStorage），进度实时自动保存。" },
                { q: "为什么没有声音？", a: "请检查设备静音开关（尤其是 iOS 用户），或尝试点击屏幕任意位置。" },
                { q: "画面卡顿？", a: "建议使用 Chrome 或 Safari 浏览器，并关闭“省电模式”。" },
                { q: "会有新模式吗？", a: "绝境规避协议正在持续进化，更多异常状态即将上线。" }
            ]
        },
        stages: {
            1: { name: "共鸣", tag: "神经连接建立", desc: "保持直觉。这是最初的试炼，躲避一切。" },
            2: { name: "镜像", tag: "视觉信号反转", desc: "上下左右全部反转。你的肌肉记忆是最大的敌人。" },
            3: { name: "错位", tag: "空间坐标崩坏", desc: "X 轴与 Y 轴互换。向上的指令会让你向左，向右的指令让你向下。" },
            4: { name: "熵增", tag: "系统完全接管", desc: "控制模式随时间随机切换。真正的地狱，只有最强的大脑才能存活。" }
        },
        modes: {
            "NORMAL": { label: "标准模式", sub: "基础操控" },
            "INVERTED": { label: "反转模式", sub: "输入信号反向" },
            "SWAP": { label: "轴向错位", sub: "XY 轴互换" }
        },
        flavor: {
            start: ["神经链路连接中...", "准备好接管控制权了吗？", "系统自检完成。开始。"],
            earlyDeath: ["你的手指是刚借来的吗？", "这就结束了？我还没开始计时。", "重力是个无情的对手。", "这也是一种天赋... 速死的天赋。"],
            midGameDeath: ["差点就成功了。", "你的大脑打结了吗？", "即使是 AI 也会对此感到遗憾。", "反直觉，这就是我们要的。"],
            stageClear: ["还不错，对于人类来说。", "这只是热身。", "你的小脑正在进化。", "下一关会让你想摔设备。"],
            victory: ["你是个传说！", "甚至我都无法计算出这条路径。", "测试结束。你自由了。"]
        },
        achievements: {
            'first_blood': { title: '第一滴血', desc: '首次死亡。' },
            'inverse_thinker': { title: '逆向思维', desc: '抵达阶段 2。' },
            'brain_twisted': { title: '脑力扭曲', desc: '抵达阶段 3。' },
            'hell_survivor': { title: '混沌行者', desc: '在熵增模式存活 30 秒。' },
            'legend': { title: '深空传说', desc: '通关所有阶段。' },
            'persistence': { title: '毅力', desc: '累计死亡 20 次。' }
        }
    },
    EN: {
        ui: {
            titleMain: "DEEP SPACE",
            titleSub: "EVASION PROTOCOL",
            start: "INITIATE",
            startHint: "[ TAP TO START · DRAG TO DODGE ]",
            gameplayHint: "CORE OBJECTIVE: AVOID IMPACT",
            achievements: "ACHIEVEMENTS",
            manual: "GUIDE", 
            faq: "FAQ",
            protocols: "PROTOCOLS",
            intel: "INTEL",
            howToPlay: [
                "DRAG anywhere to move the ball.",
                "AVOID the incoming spheres.",
                "SURVIVE 60s to unlock next stage.",
                "WARNING: Observe the control HUD."
            ],
            paused: "SYSTEM PAUSED",
            resume: "RESUME",
            restart: "RESET",
            quit: "QUIT",
            score: "SYNC RATE",
            stagePrefix: "PHASE",
            stageComplete: "SEQUENCE COMPLETE",
            crash: "SIGNAL LOST",
            next: "NEXT:",
            continue: "PROCEED",
            replay: "RETRY",
            legend: "LEGEND",
            finalScore: "FINAL SYNC",
            playAgain: "RE-INITIATE",
            achievementUnlocked: "ACHIEVEMENT UNLOCKED",
            close: "CLOSE",
            lockedDesc: "ACCESS DENIED",
            disclaimer: "TERMS", 
            morePlatforms: "PLATFORMS",
            privacy: "PRIVACY", 
            bgmOn: "AUDIO: ON",
            bgmOff: "AUDIO: OFF",
            safeMode: "SAFE MODE",
            version: "v1.6.0",
            legal: {
                title: "Terms & Conditions",
                tabs: ["ACCEPTANCE", "IP RIGHTS", "DISCLAIMER", "CHANGES"],
                content: {
                    0: `**1. ACCEPTANCE OF TERMS**\nBy initiating this simulation program (hereinafter "The Game"), you fully agree to all terms below. If you do not agree, please disconnect immediately.`,
                    1: `**2. INTELLECTUAL PROPERTY**\nAll code, visual assets, audio, and the "DEEP SPACE" brand are the property of DEEP SPACE STUDIO.\nReverse engineering, decompiling, or extracting assets for commercial use is strictly prohibited without authorization.`,
                    2: `**3. DISCLAIMER (IMPORTANT)**\nThis software is provided "AS IS" without warranty.\n**[HEALTH WARNING]**\n- Contains flashing images. Not safe for photosensitive epilepsy.\n- Stop immediately if you feel dizzy or nauseous.\n**[LIABILITY]**\n- This game is designed to be difficult.\n- The developer is NOT responsible for device damage caused by rage-quitting.`,
                    3: `**4. CHANGES & TERMINATION**\nDEEP SPACE STUDIO reserves the right to modify, suspend, or terminate the service at any time without notice.`
                }
            },
            privacyContent: [
                 "**1. DATA STORAGE**\nAll game progress is stored locally on your device. We do not upload any data to cloud servers.",
                 "**2. NO DATA COLLECTION**\nDEEP SPACE STUDIO does not collect any personal information (PII).",
                 "**3. PERMISSIONS**\nThe game only requests audio output permissions.",
                 "**4. THIRD PARTY**\nSocial media links in the Platforms section are subject to their own privacy policies."
            ],
            morePlatformsContent: [
                "INCOMING TRANSMISSION:",
                "- iOS App Store (Reviewing)",
                "- Google Play (Pre-register)",
                "- Steam (Wishlist)",
                "- Neuralink (In Dev)"
            ],
            socialChannels: [
                { name: "RED", id: "xhs", color: "#ff2442", desc: "Dev Logs" }
            ],
            faqContent: [
                { q: "Will I lose my save?", a: "No. The system uses local neural memory (LocalStorage). Progress is saved automatically." },
                { q: "Why is there no sound?", a: "Check your device mute switch (especially iOS). Tap anywhere to engage the audio link." },
                { q: "Laggy graphics?", a: "Use Chrome or Safari. Disable 'Low Power Mode'." },
                { q: "New modes coming?", a: "The Evasion Protocol is evolving. More anomalies are approaching." }
            ]
        },
        stages: {
            1: { name: "RESONANCE", tag: "NEURAL LINK ESTABLISHED", desc: "Trust your instincts. Dodge everything. The baseline test." },
            2: { name: "MIRROR", tag: "VISUAL INPUT INVERTED", desc: "Up is Down. Left is Right. Your muscle memory is the enemy." },
            3: { name: "GLITCH", tag: "SPATIAL COORDS CORRUPTED", desc: "X and Y inputs are swapped. Up moves Left. Right moves Down." },
            4: { name: "ENTROPY", tag: "SYSTEM OVERRIDE", desc: "Control modes shift randomly over time. True hell awaits." }
        },
        modes: {
            "NORMAL": { label: "NORMAL LINK", sub: "Standard Controls" },
            "INVERTED": { label: "INVERTED", sub: "Inputs Reversed" },
            "SWAP": { label: "AXIS SWAP", sub: "X / Y Interchanged" }
        },
        flavor: {
            start: ["Establishing neural link...", "Breathe. This is the easy part.", "System ready. Initiate."],
            earlyDeath: ["Did you just borrow those fingers?", "Over already? I haven't started counting.", "Gravity is a heartless mistress.", "A talent for dying quickly."],
            midGameDeath: ["Almost made it.", "Is your brain knotted yet?", "Even an AI feels pity for this.", "Counter-intuitive. That's the point."],
            stageClear: ["Not bad, for a human.", "Just a warm-up.", "Your cerebellum is evolving.", "The next one will hurt."],
            victory: ["You are a LEGEND!", "Even I couldn't calculate that path.", "Simulation complete. You are free."]
        },
        achievements: {
            'first_blood': { title: 'First Blood', desc: 'First death. It begins.' },
            'inverse_thinker': { title: 'Inverse Thinker', desc: 'Reach Stage 2.' },
            'brain_twisted': { title: 'Brain Twisted', desc: 'Reach Stage 3.' },
            'hell_survivor': { title: 'Chaos Walker', desc: 'Survive 30s in Chaos Mode.' },
            'legend': { title: 'Legend', desc: 'Clear all stages.' },
            'persistence': { title: 'Persistence', desc: 'Die 20 times total.' }
        }
    }
};

const MODE_COLORS: Record<ControlMode, string> = {
    "NORMAL": "#00d2ff",
    "INVERTED": "#ff9900",
    "SWAP": "#ff0055"
};

// --- AUDIO SYSTEM ---
let AudioCtx: AudioContext | null = null;
const getAudioCtx = () => {
    if (!AudioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
            throw new Error('AudioContext not supported');
        }
        try {
            AudioCtx = new AudioContextClass();
        } catch (e) {
            console.warn('[Audio] 创建 AudioContext 失败:', e);
            throw e;
        }
    }
    if (AudioCtx && AudioCtx.state === 'suspended') {
        AudioCtx.resume().catch(() => {});
    }
    return AudioCtx;
};
class AmbientMusic {
    private ctx: AudioContext | null = null;
    private nodes: AudioNode[] = [];
    private isPlaying: boolean = false;
    start() {
        if (this.isPlaying) return;
        this.ctx = getAudioCtx();
        this.isPlaying = true;
        const masterGain = this.ctx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(this.ctx.destination);
        this.nodes.push(masterGain);
        masterGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 3);
        // Simplified drone for stability
        this.createOsc(35, 'sine', 0.6, masterGain);
        this.createOsc(110, 'triangle', 0.1, masterGain);
    }
    createOsc(freq: number, type: OscillatorType, vol: number, dest: AudioNode) {
        if (!this.ctx) return null;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = vol;
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        this.nodes.push(osc, gain);
        return gain;
    }
    stop() {
        if (!this.isPlaying || !this.ctx) return;
        const master = this.nodes[0] as GainNode;
        if (master && master.gain) {
             master.gain.cancelScheduledValues(this.ctx.currentTime);
             master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
        }
        setTimeout(() => {
            this.nodes.forEach(n => {
                try { (n as any).stop && (n as any).stop(); } catch(e){}
                n.disconnect();
            });
            this.nodes = [];
            this.isPlaying = false;
        }, 2100);
    }
}
const BGM = new AmbientMusic();
const Sound = {
  enabled: true,
  setEnabled: (enabled: boolean) => {
    Sound.enabled = enabled;
  },
  playTone: (freq: number, type: OscillatorType, duration: number, vol: number = 0.1, slide: boolean = false) => {
    if (!Sound.enabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slide) {
          osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  },
  playCrash: () => {
    if (!Sound.enabled) return;
    Sound.playTone(150, 'sawtooth', 0.6, 0.4, true);
    Sound.playTone(100, 'square', 0.8, 0.4, true);
  },
  playStart: () => {
    if (!Sound.enabled) return;
    Sound.playTone(400, 'sine', 0.2, 0.1);
    setTimeout(() => Sound.playTone(600, 'sine', 0.4, 0.1), 150);
  },
  playLevelClear: () => {
    if (!Sound.enabled) return;
    Sound.playTone(600, 'sine', 0.2, 0.1);
    setTimeout(() => Sound.playTone(800, 'sine', 0.2, 0.1), 150);
  },
  playUnlock: () => {
    if (!Sound.enabled) return;
    Sound.playTone(1200, 'triangle', 0.3, 0.1);
    setTimeout(() => Sound.playTone(1800, 'triangle', 0.6, 0.1), 100);
  },
  playModeSwitch: () => {
    if (!Sound.enabled) return;
    Sound.playTone(300, 'square', 0.1, 0.1);
    setTimeout(() => Sound.playTone(150, 'square', 0.4, 0.2, true), 100);
  }
};

// --- GAME LOGIC ---
type AchievementDef = { id: string; check: (stats: GameStats) => boolean };
type GameStats = {
    totalDeaths: number;
    maxStage: number;
    hellModeTime: number;
    totalPlayTime: number;
};
const ACHIEVEMENTS_LOGIC: AchievementDef[] = [
    { id: 'first_blood', check: (s) => s.totalDeaths >= 1 },
    { id: 'inverse_thinker', check: (s) => s.maxStage >= 2 },
    { id: 'brain_twisted', check: (s) => s.maxStage >= 3 },
    { id: 'hell_survivor', check: (s) => s.hellModeTime >= 30 },
    { id: 'legend', check: (s) => s.maxStage > 4 }, 
    { id: 'persistence', check: (s) => s.totalDeaths >= 20 },
];
type EngineMode = "GAME" | "MENU_BG";
class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = 0;
  height: number = 0;
  mode: EngineMode = "MENU_BG";
  player = { x: 0, y: 0, vx: 0, vy: 0, radius: 12, trail: [] as {x: number, y: number, alpha: number}[] };
  obstacles: { x: number; y: number; vx: number; vy: number; radius: number; color: string }[] = [];
  particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  warpStars: { x: number; y: number; z: number; pz: number }[] = [];
  menuStage: Stage = 1;
  stage: Stage = 1;
  controlMode: ControlMode = "NORMAL";
  hellModeTimer: number = 0;
  safeMode: boolean = false;
  input = { active: false, x: 0, y: 0, lastX: 0, lastY: 0 };
  
  running = false;
  paused = false;
  isLooping = false; 
  
  timeElapsed = 0;
  score = 0;
  animationFrameId: number = 0;
  callbacks: {
    onGameOver: (score: number, time: number) => void;
    onTimeUp: () => void;
    onScoreUpdate: (score: number) => void;
    onModeChange: (mode: ControlMode) => void;
  };
  private boundResize: () => void;
  private boundHandleStart: (e: TouchEvent | MouseEvent) => void;
  private boundHandleMove: (e: TouchEvent | MouseEvent) => void;
  private boundHandleEnd: () => void;
  constructor(canvas: HTMLCanvasElement, callbacks: any) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.callbacks = callbacks;
    this.boundResize = this.resize.bind(this);
    this.boundHandleStart = this.handleStart.bind(this);
    this.boundHandleMove = this.handleMove.bind(this);
    this.boundHandleEnd = this.handleEnd.bind(this);
    this.resize();
    this.initWarpStars();
    window.addEventListener('resize', this.boundResize);
    canvas.addEventListener('touchstart', this.boundHandleStart, { passive: false });
    canvas.addEventListener('touchmove', this.boundHandleMove, { passive: false });
    canvas.addEventListener('touchend', this.boundHandleEnd);
    canvas.addEventListener('mousedown', this.boundHandleStart);
    canvas.addEventListener('mousemove', this.boundHandleMove);
    canvas.addEventListener('mouseup', this.boundHandleEnd);
    
    // Initial start
    this.running = true;
    this.loop();
  }
  initWarpStars() {
      this.warpStars = [];
      const numStars = 600;
      for (let i = 0; i < numStars; i++) {
          this.warpStars.push(this.createWarpStar());
      }
  }
  createWarpStar() {
      const x = (Math.random() - 0.5) * this.width * 2;
      const y = (Math.random() - 0.5) * this.height * 2;
      const z = Math.random() * this.width;
      return { x, y, z, pz: z };
  }
  setSafeMode(enabled: boolean) {
      this.safeMode = enabled;
  }
  setMenuStage(s: Stage) {
      this.menuStage = s;
  }
  setMode(mode: EngineMode) {
      this.mode = mode;
  }
  destroy() {
    this.running = false;
    this.isLooping = false;
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.boundResize);
    this.canvas.removeEventListener('touchstart', this.boundHandleStart);
    this.canvas.removeEventListener('touchmove', this.boundHandleMove);
    this.canvas.removeEventListener('touchend', this.boundHandleEnd);
    this.canvas.removeEventListener('mousedown', this.boundHandleStart);
    this.canvas.removeEventListener('mousemove', this.boundHandleMove);
    this.canvas.removeEventListener('mouseup', this.boundHandleEnd);
  }
  resize() {
    this.width = window.innerWidth || document.documentElement.clientWidth || 0;
    this.height = window.innerHeight || document.documentElement.clientHeight || 0;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    if (this.mode === "MENU_BG") {
        this.initWarpStars();
    }
    if (this.mode === "GAME" && !this.running) {
        this.player.x = this.width / 2;
        this.player.y = this.height / 2;
        this.drawGame();
    }
  }
  
  start(stage: Stage) {
    this.mode = "GAME";
    this.stage = stage;
    this.running = true;
    this.paused = false;
    this.timeElapsed = 0;
    this.score = 0;
    this.obstacles = [];
    this.particles = [];
    this.player.x = this.width / 2;
    this.player.y = this.height * 0.8;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.trail = [];
    this.hellModeTimer = 0;
    this.setControlModeForStage(stage);
    this.callbacks.onModeChange(this.controlMode);
    Sound.playStart();
    if (!this.isLooping) {
        this.loop();
    }
  }

  pause() { this.paused = true; }
  resume() { if (this.paused) this.paused = false; }
  
  setControlModeForStage(stage: Stage) {
    if (stage === 1) this.controlMode = "NORMAL";
    else if (stage === 2) this.controlMode = "INVERTED";
    else if (stage === 3) this.controlMode = "SWAP";
    else if (stage === 4) {
      this.controlMode = "NORMAL";
    }
  }
  
  stop() {
    this.mode = "MENU_BG";
    this.paused = false;
    this.running = true; 
    if (!this.isLooping) {
        this.loop();
    }
  }

  handleStart(e: TouchEvent | MouseEvent) {
    if (this.paused || this.mode === "MENU_BG") return;
    e.preventDefault();
    this.input.active = true;
    const { x, y } = this.getPos(e);
    this.input.lastX = x;
    this.input.lastY = y;
  }
  handleMove(e: TouchEvent | MouseEvent) {
    if (this.paused || this.mode === "MENU_BG") return;
    e.preventDefault();
    if (!this.input.active) return;
    const { x, y } = this.getPos(e);
    let dx = x - this.input.lastX;
    let dy = y - this.input.lastY;
    let forceMultiplier = 1.8; 
    if (this.controlMode === "INVERTED") {
      dx = -dx;
      dy = -dy;
    } else if (this.controlMode === "SWAP") {
      const temp = dx;
      dx = dy; 
      dy = temp; 
    }
    this.player.vx += dx * 0.15 * forceMultiplier;
    this.player.vy += dy * 0.15 * forceMultiplier;
    this.input.lastX = x;
    this.input.lastY = y;
  }
  handleEnd() { this.input.active = false; }
  getPos(e: any) {
    if (e.touches) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  loop() {
    if (!this.running) {
        this.isLooping = false;
        return;
    }
    this.isLooping = true;
    if (!this.paused) {
        if (this.mode === "GAME") {
            this.updateGame();
            this.drawGame();
        } else {
            this.updateMenuBg();
            this.drawMenuBg();
        }
    }
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  updateMenuBg() {
      const speed = 2; 
      this.warpStars.forEach(s => {
          s.pz = s.z; 
          s.z -= speed;
          if (s.z < 1) {
              s.z = this.width;
              s.pz = this.width;
              s.x = (Math.random() - 0.5) * this.width * 2;
              s.y = (Math.random() - 0.5) * this.height * 2;
          }
      });
  }
  drawMenuBg() {
      if (this.width === 0 || this.height === 0) return;
      const cx = this.width / 2;
      const cy = this.height / 2;
      const stageColor = STAGE_LOGIC[this.menuStage].color;
      const grad = this.ctx.createRadialGradient(cx, this.height, 0, cx, this.height, this.height);
      grad.addColorStop(0, `${stageColor}22`); 
      grad.addColorStop(0.6, "#050508"); 
      grad.addColorStop(1, "#000"); 
      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.lineWidth = 1;
      this.warpStars.forEach(s => {
          const sx = cx + (s.x / s.z) * 100;
          const sy = cy + (s.y / s.z) * 100;
          const px = cx + (s.x / s.pz) * 100;
          const py = cy + (s.y / s.pz) * 100;
          if (sx < 0 || sx > this.width || sy < 0 || sy > this.height) return;
          const alpha = 1 - (s.z / this.width);
          this.ctx.beginPath();
          this.ctx.moveTo(px, py);
          this.ctx.lineTo(sx, sy);
          if (alpha > 0.8) {
             this.ctx.strokeStyle = stageColor;
          } else {
             this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          }
          this.ctx.stroke();
      });
  }
  updateGame() {
    const dt = 1/60;
    this.timeElapsed += dt;
    this.score = Math.floor(this.timeElapsed * 100);
    this.callbacks.onScoreUpdate(this.score);
    if (this.stage === 4) {
      this.hellModeTimer += dt;
      if (this.hellModeTimer > 10) { 
        this.hellModeTimer = 0;
        const modes: ControlMode[] = ["NORMAL", "INVERTED", "SWAP"];
        const nextMode = modes[Math.floor(Math.random() * modes.length)];
        if (nextMode !== this.controlMode) {
             this.controlMode = nextMode;
             this.callbacks.onModeChange(this.controlMode);
             Sound.playModeSwitch();
             this.createExplosion(this.width/2, this.height/2, "#9d00ff", 30, 20);
        }
      }
    }
    const maxTime = STAGE_LOGIC[this.stage].duration;
    if (this.timeElapsed >= maxTime) {
      this.running = false;
      this.callbacks.onTimeUp();
      return;
    }
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;
    this.player.vx *= 0.92;
    this.player.vy *= 0.92;
    if (this.player.x < this.player.radius) { this.player.x = this.player.radius; this.player.vx *= -0.5; }
    if (this.player.x > this.width - this.player.radius) { this.player.x = this.width - this.player.radius; this.player.vx *= -0.5; }
    if (this.player.y < this.player.radius) { this.player.y = this.player.radius; this.player.vy *= -0.5; }
    if (this.player.y > this.height - this.player.radius) { this.player.y = this.height - this.player.radius; this.player.vy *= -0.5; }
    this.player.trail.push({ x: this.player.x, y: this.player.y, alpha: 1.0 });
    if (this.player.trail.length > 15) this.player.trail.shift();
    this.player.trail.forEach(t => t.alpha -= 0.08);
    const difficultyMultiplier = 1 + (this.timeElapsed / 40); 
    const spawnChance = 0.06 * difficultyMultiplier; 
    if (Math.random() < spawnChance && this.obstacles.length < 60) {
      const size = Math.random() * 25 + 10;
      const speed = Math.random() * 3 + 2;
      const angle = Math.random() * Math.PI * 2;
      let sx, sy;
      if (Math.random() < 0.5) {
        sx = Math.random() < 0.5 ? -50 : this.width + 50;
        sy = Math.random() * this.height;
      } else {
        sx = Math.random() * this.width;
        sy = Math.random() < 0.5 ? -50 : this.height + 50;
      }
      this.obstacles.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: size,
        color: this.stage === 4 ? `hsl(${Math.random() * 360}, 70%, 60%)` : '#fff'
      });
    }
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x += obs.vx;
      obs.y += obs.vy;
      if (obs.x < -100 || obs.x > this.width + 100 || obs.y < -100 || obs.y > this.height + 100) {
        this.obstacles.splice(i, 1);
        continue;
      }
      const dx = this.player.x - obs.x;
      const dy = this.player.y - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + obs.radius - 2) {
        if (this.safeMode) {
             const angle = Math.atan2(obs.y - this.player.y, obs.x - this.player.x);
             const pushForce = 5;
             obs.vx = Math.cos(angle) * pushForce;
             obs.vy = Math.sin(angle) * pushForce;
             this.createExplosion((this.player.x + obs.x)/2, (this.player.y + obs.y)/2, "#00ff00", 10, 0.5);
             continue; 
        }
        this.createExplosion(this.player.x, this.player.y, "#fff", 50);
        this.running = false; 
        Sound.playCrash();
        this.callbacks.onGameOver(this.score, this.timeElapsed);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  createExplosion(x: number, y: number, color: string, count: number = 20, speedMult: number = 1) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 * speedMult;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color
      });
    }
  }
  drawGame() {
    this.ctx.fillStyle = 'rgba(5, 5, 8, 0.25)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalCompositeOperation = 'lighter';
    if (this.safeMode) {
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.timeElapsed * 3);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.player.radius + 6, 0, Math.PI * 1.5);
        this.ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }
    this.ctx.beginPath();
    for (let i = 0; i < this.player.trail.length - 1; i++) {
      const p1 = this.player.trail[i];
      const p2 = this.player.trail[i+1];
      this.ctx.strokeStyle = `rgba(0, 210, 255, ${p1.alpha * 0.5})`;
      this.ctx.lineWidth = this.player.radius * (i / this.player.trail.length);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(p2.x, p2.y);
    }
    const playerColor = MODE_COLORS[this.controlMode];
    const pGrad = this.ctx.createRadialGradient(this.player.x, this.player.y, 0, this.player.x, this.player.y, this.player.radius);
    pGrad.addColorStop(0, "#fff");
    pGrad.addColorStop(0.4, playerColor);
    pGrad.addColorStop(1, "rgba(0,0,0,0)");
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = pGrad;
    this.ctx.fill();
    this.obstacles.forEach(obs => {
      const grad = this.ctx.createRadialGradient(obs.x - obs.radius*0.3, obs.y - obs.radius*0.3, 0, obs.x, obs.y, obs.radius);
      grad.addColorStop(0, "#fff");
      grad.addColorStop(0.5, obs.color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      this.ctx.beginPath();
      this.ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.fill();
    });
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });
    this.ctx.globalCompositeOperation = 'source-over';
  }
}

// --- NEW UI COMPONENTS ---

const TerminalModal = ({ title, onClose, children, color = "cyan", showFooter = true }: any) => {
  const textColor = color === 'red' ? '#ef4444' : color === 'yellow' ? '#eab308' : '#06b6d4';
  const borderColor = color === 'red' ? 'rgba(239,68,68,0.2)' : color === 'yellow' ? 'rgba(234,179,8,0.2)' : 'rgba(6,182,212,0.2)';

  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '32rem', backgroundColor: 'rgba(10,10,16,0.95)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden', borderLeft: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))', zIndex: 0, pointerEvents: 'none', backgroundSize: '100% 4px, 3px 100%' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 8px', zIndex: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', color: textColor, fontFamily: 'sans-serif', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>{title}</h2>
            <div style={{ height: '2px', width: '32px', marginTop: '4px', background: `linear-gradient(to right, ${textColor}, transparent)` }}></div>
          </div>
          <button onClick={onClose} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', borderRadius: '50%', backgroundColor: 'transparent', border: 'none', WebkitAppearance: 'none', padding: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px', fontFamily: 'monospace', fontSize: '14px', zIndex: 10, color: '#d1d5db' }}>{children}</div>
      </div>
    </div>
  );
}

const MockQRCode = ({ color, name }: { color: string, name: string }) => {
    const size = 6; 
    const cells = [];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    for (let i = 0; i < size * size; i++) {
        const active = Math.sin(hash + i) > 0;
        if (active || i < 4 || i > size*size - 5) cells.push(i);
    }
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: 'black' }}>
            <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '2px', opacity: 0.8 }}>
                 {Array.from({length: 36}).map((_, i) => (
                     <div key={i} style={{ backgroundColor: cells.includes(i) ? color : 'transparent', transition: 'background-color 0.5s' }}></div>
                 ))}
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)', height: '50%', pointerEvents: 'none' }}></div>
        </div>
    );
};

const AchievementsModal = ({ stats, onClose, lang }: { stats: GameStats, onClose: () => void, lang: Language }) => {
    const t = TRANSLATIONS[lang];
    return (
        <TerminalModal title={t.ui.achievements} onClose={onClose} color="yellow">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {ACHIEVEMENTS_LOGIC.map(achLogic => {
                    const unlocked = achLogic.check(stats);
                    const achText = t.achievements[achLogic.id as keyof typeof t.achievements];
                    return (
                        <div key={achLogic.id} style={{ position: 'relative', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden', backgroundColor: unlocked ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.05)', opacity: unlocked ? 1 : 0.5 }}>
                             <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', backgroundColor: unlocked ? '#eab308' : '#374151' }}></div>
                             <div style={{ flex: 1, paddingLeft: '12px' }}>
                                <h3 style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.05em', marginBottom: '4px', color: unlocked ? '#fef9c3' : '#6b7280' }}>{achText.title}</h3>
                                <p style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{achText.desc}</p>
                            </div>
                            <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}>
                                {unlocked ? <span style={{ fontSize: '18px', filter: 'drop-shadow(0 0 8px rgba(234,179,8,0.8))' }}>🏆</span> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1f2937' }}></div>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </TerminalModal>
    );
};

const ManualModal = ({ onClose, lang }: { onClose: () => void, lang: Language }) => {
    const t = TRANSLATIONS[lang];
    const [tab, setTab] = useState<'PROTOCOLS' | 'INTEL'>('PROTOCOLS');
    return (
        <TerminalModal title={t.ui.manual} onClose={onClose} color="cyan">
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                <button onClick={() => setTab('PROTOCOLS')} style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.2em', transition: 'all 0.2s', paddingBottom: '8px', position: 'relative', color: tab === 'PROTOCOLS' ? '#22d3ee' : '#4b5563', backgroundColor: 'transparent', border: 'none', WebkitAppearance: 'none' }}>{t.ui.protocols}{tab === 'PROTOCOLS' && <div style={{ position: 'absolute', bottom: '-1px', left: 0, width: '100%', height: '1px', backgroundColor: '#22d3ee' }}></div>}</button>
                <button onClick={() => setTab('INTEL')} style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.2em', transition: 'all 0.2s', paddingBottom: '8px', position: 'relative', color: tab === 'INTEL' ? '#22d3ee' : '#4b5563', backgroundColor: 'transparent', border: 'none', WebkitAppearance: 'none' }}>{t.ui.intel}{tab === 'INTEL' && <div style={{ position: 'absolute', bottom: '-1px', left: 0, width: '100%', height: '1px', backgroundColor: '#22d3ee' }}></div>}</button>
            </div>
            <div>
                {tab === 'PROTOCOLS' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                             {t.ui.howToPlay.map((line: string, i: number) => (
                                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                    <div style={{ marginTop: '6px', width: '4px', height: '4px', flexShrink: 0, transform: 'rotate(45deg)', WebkitTransform: 'rotate(45deg)', backgroundColor: i === t.ui.howToPlay.length - 1 ? '#ef4444' : '#0891b2' }}></div>
                                    <p style={{ fontSize: '12px', lineHeight: 1.6, color: i === t.ui.howToPlay.length - 1 ? '#f87171' : '#d1d5db', fontWeight: i === t.ui.howToPlay.length - 1 ? 'bold' : 'normal' }}>{line}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {tab === 'INTEL' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        {[1, 2, 3, 4].map((s) => {
                            const stageInfo = t.stages[s as Stage];
                            const config = STAGE_LOGIC[s as Stage];
                            return (
                                <div key={s} style={{ position: 'relative', padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: config.color }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#6b7280', marginBottom: '4px' }}>STAGE 0{s}</span><h3 style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'white' }}>{stageInfo.name}</h3></div>
                                        <span style={{ fontSize: '10px', fontFamily: 'monospace', padding: '2px 8px', backgroundColor: 'rgba(0,0,0,0.3)', color: '#9ca3af', borderRadius: '2px' }}>{config.duration}s</span>
                                    </div>
                                    <p style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'sans-serif', letterSpacing: '0.05em', lineHeight: 1.6, paddingLeft: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '4px' }}>{stageInfo.desc}</p>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </TerminalModal>
    );
};

const LegalModal = ({ onClose, lang }: { onClose: () => void, lang: Language }) => {
    const t = TRANSLATIONS[lang];
    const [activeTab, setActiveTab] = useState(0);
    const parseContent = (text: string) => {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('**')) return <h3 key={i} className="text-cyan-400 font-bold mt-6 mb-3 text-[10px] tracking-[0.2em] uppercase border-b border-cyan-900/30 pb-1 w-fit">{line.replace(/\*\*/g, '')}</h3>
            if (line.trim().startsWith('-')) return <div key={i} className="flex gap-3 mb-2 ml-1"><span className="text-cyan-700 text-[10px] pt-1">›</span><span className="text-gray-400 text-xs leading-relaxed">{line.replace('-', '').trim()}</span></div>
            if (line.trim() === "") return <div key={i} style={{ height: '8px' }}/>
            return <p key={i} style={{ color: '#9ca3af', marginBottom: '8px', lineHeight: 1.6, fontSize: '12px' }}>{line}</p>
        })
    }
    return (
        <TerminalModal title={t.ui.legal.title} onClose={onClose} color="cyan">
             <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', flexWrap: 'wrap' }}>
                 {t.ui.legal.tabs.map((tab: string, i: number) => (
                     <button key={i} onClick={() => setActiveTab(i)} style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.2em', transition: 'all 0.2s', paddingBottom: '8px', position: 'relative', color: activeTab === i ? '#22d3ee' : '#4b5563', backgroundColor: 'transparent', border: 'none', WebkitAppearance: 'none' }}>{tab}{activeTab === i && <div style={{ position: 'absolute', bottom: '-1px', left: 0, width: '100%', height: '1px', backgroundColor: '#22d3ee' }}></div>}</button>
                 ))}
             </div>
             <div style={{ paddingLeft: '4px' }}>{parseContent(t.ui.legal.content[activeTab as keyof typeof t.ui.legal.content])}</div>
        </TerminalModal>
    );
}

const PrivacyModal = ({ onClose, lang }: { onClose: () => void, lang: Language }) => {
    const t = TRANSLATIONS[lang];
    const parseContent = (lines: string[]) => {
        return lines.map((block, i) => {
             const parts = block.split('\n');
             return (
                 <div key={i} style={{ marginBottom: '16px' }}>
                     {parts.map((line, j) => {
                        if (line.trim().startsWith('**')) {
                             return <h3 key={j} style={{ color: '#22d3ee', fontWeight: 'bold', marginTop: '8px', marginBottom: '8px', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', borderBottom: '1px solid rgba(22,78,99,0.3)', paddingBottom: '4px', width: 'fit-content' }}>{line.replace(/\*\*/g, '')}</h3>
                        }
                        return <p key={j} style={{ color: '#9ca3af', marginBottom: '4px', lineHeight: 1.6, fontSize: '12px' }}>{line}</p>
                     })}
                 </div>
             )
        })
    }
    return (
        <TerminalModal title={t.ui.privacy} onClose={onClose} color="cyan">
             <div style={{ paddingLeft: '4px' }}>
                {parseContent(t.ui.privacyContent)}
             </div>
        </TerminalModal>
    );
}

const FAQModal = ({ onClose, lang }: { onClose: () => void, lang: Language }) => {
    const t = TRANSLATIONS[lang];
    return (
        <TerminalModal title={t.ui.faq} onClose={onClose} color="cyan">
             <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                 {t.ui.faqContent.map((item, i) => (
                     <div key={i} style={{ position: 'relative', paddingLeft: '16px' }}>
                         <div style={{ position: 'absolute', left: 0, top: '6px', width: '4px', height: '4px', backgroundColor: '#0891b2', borderRadius: '50%' }}></div>
                         <h3 style={{ color: '#e5e7eb', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.05em', fontSize: '12px' }}>{item.q}</h3>
                         <p style={{ color: '#6b7280', fontSize: '10px', lineHeight: 1.6, fontFamily: 'sans-serif' }}>{item.a}</p>
                     </div>
                 ))}
             </div>
        </TerminalModal>
    );
}

const MorePlatformsModal = ({ onClose, lang }: { onClose: () => void, lang: Language }) => {
    const t = TRANSLATIONS[lang];
    return (
        <TerminalModal title={t.ui.morePlatforms} onClose={onClose} color="cyan" showFooter={false}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', paddingTop: '16px' }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '48px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '40px' }}>
                        {/* 小红书二维码 */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#9ca3af', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '24px' }}>
                                {lang === 'CN' ? '小红书' : 'RED'}
                            </div>
                            <div style={{ position: 'relative', width: '192px', height: '192px' }}>
                                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(6,182,212,0.05)', borderRadius: '50%' }}></div>
                                <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.1)', padding: '8px', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
                                    <img
                                        src="/xhs-qr.png"
                                        alt="小红书二维码"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                </div>
                                <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', borderTop: '1px solid rgba(255,255,255,0.3)', borderLeft: '1px solid rgba(255,255,255,0.3)' }}></div>
                                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '8px', height: '8px', borderBottom: '1px solid rgba(255,255,255,0.3)', borderRight: '1px solid rgba(255,255,255,0.3)' }}></div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '16px', letterSpacing: '0.1em' }}>
                                {lang === 'CN' ? '扫码关注开发日志' : 'Scan to follow dev logs'}
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        </TerminalModal>
    );
}

const FlashWarning = ({ mode, lang }: { mode: ControlMode | null, lang: Language }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (mode) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [mode]);
    if (!mode || !visible) return null;
    const config = TRANSLATIONS[lang].modes[mode];
    const color = MODE_COLORS[mode];
    return (
        <>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30, boxShadow: `inset 0 0 0 4px ${color}40`, animation: 'pulse-border 1s ease-in-out infinite' }}></div>
            <div style={{ position: 'absolute', top: '96px', left: 0, width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 40, animation: 'fade-in-out 2s ease-in-out infinite' }}>
                 <div style={{ textAlign: 'center', opacity: 0.8, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                     <h1 style={{ fontSize: '30px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.1em', color: color }}>{config.label}</h1>
                     <p style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.3em' }}>{config.sub}</p>
                 </div>
            </div>
        </>
    );
}

const LangToggle = ({ lang, toggleLang }: { lang: Language, toggleLang: () => void }) => (
    <button onClick={toggleLang} style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#6b7280', border: '1px solid #374151', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.5)', WebkitAppearance: 'none' }}>
        <span style={{ color: lang === 'CN' ? 'white' : '#4b5563' }}>CN</span> / <span style={{ color: lang === 'EN' ? 'white' : '#4b5563' }}>EN</span>
    </button>
);

const HeaderControls = ({ bgmOn, toggleBgm, lang, toggleLang, t }: any) => (
    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#6b7280', alignItems: 'center', pointerEvents: 'auto', zIndex: 50 }}>
         <button onClick={toggleBgm} style={{ color: bgmOn ? 'white' : '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap', transition: 'color 0.2s', backgroundColor: 'transparent', border: 'none', padding: 0, fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', WebkitAppearance: 'none' }}>
            {bgmOn ? t.ui.bgmOn : t.ui.bgmOff}
         </button>
         <span style={{ color: '#374151' }}>|</span>
         <LangToggle lang={lang} toggleLang={toggleLang} />
    </div>
);

const MenuButton = ({ onClick, children, primary = false, disabled = false }: any) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        marginBottom: '12px',
        fontWeight: 'bold',
        fontSize: '12px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        WebkitAppearance: 'none',
        border: primary ? 'none' : '1px solid rgba(255,255,255,0.1)',
        backgroundColor: primary ? 'white' : 'rgba(0,0,0,0.4)',
        color: primary ? 'black' : '#9ca3af',
        padding: primary ? '16px 24px' : '12px 24px',
        boxShadow: primary ? '0 0 15px rgba(255,255,255,0.3)' : 'none'
      }}
    >
      {children}
    </button>
  );

const UIOverlay = ({ 
  gameState, stage, score, time, onStart, onNextStage, unlockedStage, flavorText, stats, showAchievements, toggleAchievements, activeControlMode, selectedStage, setSelectedStage, flashMode, onResume, onRestart, onQuit, onPause, lang, toggleLang, bgmOn, toggleBgm, safeMode, toggleSafeMode
}: any) => {
  const t = TRANSLATIONS[lang as Language];
  const [showManual, setShowManual] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showMorePlatforms, setShowMorePlatforms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  if (showAchievements) return <AchievementsModal stats={stats} onClose={toggleAchievements} lang={lang} />;
  if (showManual) return <ManualModal onClose={() => setShowManual(false)} lang={lang} />;
  if (showLegal) return <LegalModal onClose={() => setShowLegal(false)} lang={lang} />;
  if (showFAQ) return <FAQModal onClose={() => setShowFAQ(false)} lang={lang} />;
  if (showMorePlatforms) return <MorePlatformsModal onClose={() => setShowMorePlatforms(false)} lang={lang} />;
  if (showPrivacy) return <PrivacyModal onClose={() => setShowPrivacy(false)} lang={lang} />;

  const Controls = <HeaderControls bgmOn={bgmOn} toggleBgm={toggleBgm} lang={lang} toggleLang={toggleLang} t={t} />;

  if (gameState === "PAUSED") {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', padding: '32px', textAlign: 'center', zIndex: 50 }}>
             <div style={{ width: '100%', maxWidth: '24rem', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingTop: '48px', paddingBottom: '48px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', WebkitTransform: 'translate(-50%, -50%)', backgroundColor: 'black', paddingLeft: '16px', paddingRight: '16px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.3em', color: '#6b7280' }}>SYSTEM HALTED</div>
                <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'white', marginBottom: '32px', letterSpacing: '0.2em', fontFamily: 'sans-serif' }}>{t.ui.paused}</h2>
                <div>
                    <MenuButton primary onClick={onResume}>{t.ui.resume}</MenuButton>
                    <MenuButton onClick={onRestart}>{t.ui.restart}</MenuButton>
                    <MenuButton onClick={onQuit}>{t.ui.quit}</MenuButton>
                </div>
            </div>
        </div>
      );
  }

  if (gameState === "PLAYING") {
    const progress = Math.min(100, (time / STAGE_LOGIC[stage as Stage].duration) * 100);
    const modeInfo = t.modes[activeControlMode as ControlMode];
    const modeColor = MODE_COLORS[activeControlMode as ControlMode];
    const isAbnormal = activeControlMode !== "NORMAL";

    return (
      <>
        <FlashWarning mode={flashMode} lang={lang} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none', color: 'white', userSelect: 'none', zIndex: 30, boxSizing: 'border-box' }}>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '0.1em', lineHeight: 1, color: 'white', textShadow: '0 0 10px rgba(255,255,255,0.5)', fontFamily: 'sans-serif' }}>{score.toString().padStart(5, '0')}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '8px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <p style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.2em', textTransform: 'uppercase', transition: 'color 0.5s', color: modeColor }}>
                        {t.stages[stage as Stage].name} // {modeInfo.label}
                     </p>
                 </div>
                 {safeMode && <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#22c55e', letterSpacing: '0.1em', border: '1px solid rgba(34,197,94,0.3)', padding: '2px 8px', backgroundColor: 'rgba(20,83,45,0.3)', marginTop: '4px' }}>[ {t.ui.safeMode} ]</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', pointerEvents: 'auto', flexShrink: 0 }}>
             <button onClick={onPause} style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', backgroundColor: 'transparent', WebkitAppearance: 'none', padding: 0 }}>
                 <div style={{ width: '10px', height: '10px', borderLeft: '2px solid white', borderRight: '2px solid white' }}></div>
             </button>
             <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                {/* 背景圆 */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '3px solid #1f2937', borderRadius: '50%' }}></div>
                {/* 进度圆环 - 使用左右两个半圆实现 */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                   {progress <= 50 ? (
                      <div style={{ 
                        position: 'absolute', 
                        top: 0, left: 0, right: 0, bottom: 0,
                        border: '3px solid transparent',
                        borderTopColor: STAGE_LOGIC[stage as Stage].color,
                        borderRightColor: STAGE_LOGIC[stage as Stage].color,
                        borderRadius: '50%',
                        transform: `rotate(${progress * 3.6 - 45}deg)`,
                        WebkitTransform: `rotate(${progress * 3.6 - 45}deg)`
                      }}></div>
                   ) : (
                      <>
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, left: 0, right: 0, bottom: 0,
                          border: '3px solid transparent',
                          borderTopColor: STAGE_LOGIC[stage as Stage].color,
                          borderRightColor: STAGE_LOGIC[stage as Stage].color,
                          borderBottomColor: STAGE_LOGIC[stage as Stage].color,
                          borderLeftColor: STAGE_LOGIC[stage as Stage].color,
                          borderRadius: '50%'
                        }}></div>
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, left: 0, right: 0, bottom: 0,
                          border: '3px solid transparent',
                          borderTopColor: '#1f2937',
                          borderRightColor: '#1f2937',
                          borderRadius: '50%',
                          transform: `rotate(${(progress - 50) * 3.6 - 45}deg)`,
                          WebkitTransform: `rotate(${(progress - 50) * 3.6 - 45}deg)`
                        }}></div>
                      </>
                   )}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', color: 'white', position: 'relative' }}>{Math.floor(Math.max(0, STAGE_LOGIC[stage as Stage].duration - time))}</span>
             </div>
          </div>
        </div>
      </>
    );
  }

  if (gameState === "MENU") {
    const isLocked = selectedStage > unlockedStage;
    const stageLogic = STAGE_LOGIC[selectedStage as Stage];
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: 0, textAlign: 'center', zIndex: 50, overflow: 'hidden', cursor: 'pointer' }} onClick={() => !isLocked && onStart(selectedStage)}>
        <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 20, display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', alignItems: 'center', pointerEvents: 'auto', color: '#ffffff' }} onClick={e => e.stopPropagation()}>
             {Controls}
        </div>
        <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 20, display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#6b7280', pointerEvents: 'auto' }} onClick={e => e.stopPropagation()}>
             <button onClick={() => ALLOW_SAFE_MODE_TOGGLE && toggleSafeMode()} style={{ color: safeMode ? '#22c55e' : '#4b5563', textTransform: 'uppercase', transition: 'color 0.2s', cursor: ALLOW_SAFE_MODE_TOGGLE ? 'pointer' : 'default', backgroundColor: 'transparent', border: 'none', padding: 0, fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', WebkitAppearance: 'none' }}>{t.ui.version} {safeMode && `[${t.ui.safeMode}]`}</button>
        </div>
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '42rem', marginTop: '96px', pointerEvents: 'none', paddingLeft: '16px', paddingRight: '16px' }}>
             <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.05em', color: 'white', textTransform: 'uppercase', textShadow: '0 0 15px rgba(255,255,255,0.8)', fontFamily: 'sans-serif' }}>{t.ui.titleMain}</h1>
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '8px', opacity: 0.7 }}>
                <div style={{ height: '1px', width: '32px', backgroundColor: 'rgba(255,255,255,0.5)' }}></div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#a5f3fc', letterSpacing: '0.8em', textTransform: 'uppercase', textShadow: '0 0 5px rgba(6,182,212,0.5)' }}>{t.ui.titleSub}</div>
                <div style={{ height: '1px', width: '32px', backgroundColor: 'rgba(255,255,255,0.5)' }}></div>
             </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', pointerEvents: 'none', padding: '16px' }}>
            {isLocked ? (
                <div style={{ color: '#7f1d1d', fontWeight: 'bold', letterSpacing: '0.3em', fontSize: '14px', border: '1px solid rgba(127,29,29,0.5)', padding: '8px 16px', backgroundColor: 'rgba(0,0,0,0.5)' }}>{t.ui.lockedDesc}</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                     <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '4px 16px' }}>{t.ui.startHint}</span>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.4 }}>
                        <div style={{ width: '4px', height: '4px', backgroundColor: '#ef4444' }}></div><span style={{ fontSize: '8px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#fecaca' }}>{t.ui.gameplayHint}</span><div style={{ width: '4px', height: '4px', backgroundColor: '#ef4444' }}></div>
                     </div>
                </div>
            )}
        </div>
        <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto', background: 'linear-gradient(to top, black, rgba(0,0,0,0.8), transparent)', paddingTop: '48px' }} onClick={e => e.stopPropagation()}> 
            <div style={{ width: '100%', maxWidth: '32rem', marginBottom: '32px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px', height: '24px' }}>
                     <h2 style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.2em', fontFamily: 'sans-serif', color: isLocked ? '#374151' : stageLogic.color }}>{t.stages[selectedStage as Stage].name}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', position: 'relative', paddingLeft: '16px', paddingRight: '16px' }}>
                     <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', zIndex: -10 }}></div>
                     {[1, 2, 3, 4].map((s) => {
                         const isSelected = selectedStage === s;
                         const isUnlocked = s <= unlockedStage;
                         return (
                            <button key={s} onClick={() => setSelectedStage(s)} style={{ position: 'relative', transition: 'all 0.3s', transform: isSelected ? 'scale(1.25)' : 'scale(1)', WebkitTransform: isSelected ? 'scale(1.25)' : 'scale(1)', backgroundColor: 'transparent', border: 'none', padding: 0, WebkitAppearance: 'none' }}>
                                <div style={{ width: '12px', height: '12px', transition: 'all 0.3s', transform: 'rotate(45deg)', WebkitTransform: 'rotate(45deg)', backgroundColor: isSelected ? 'white' : isUnlocked ? '#4b5563' : '#111827', border: isSelected ? 'none' : isUnlocked ? 'none' : '1px solid #1f2937', boxShadow: isSelected ? '0 0 10px white' : 'none' }}></div>
                                <span style={{ position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)', WebkitTransform: 'translateX(-50%)', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', transition: 'color 0.3s', color: isSelected ? 'white' : '#374151' }}>0{s}</span>
                            </button>
                         )
                     })}
                </div>
            </div>
            <div style={{ width: '100%', backgroundColor: 'black', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', whiteSpace: 'nowrap' }}>
                     <button onClick={() => setShowManual(true)} style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s', backgroundColor: 'transparent', border: 'none', padding: 0, WebkitAppearance: 'none' }}>{t.ui.manual}</button>
                     <span style={{ color: '#1f2937', fontSize: '10px' }}>/</span>
                     <button onClick={toggleAchievements} style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s', backgroundColor: 'transparent', border: 'none', padding: 0, WebkitAppearance: 'none' }}>{t.ui.achievements}</button>
                     <span style={{ color: '#1f2937', fontSize: '10px' }}>/</span>
                     {lang === 'CN' && (
                        <>
                            <button onClick={() => setShowMorePlatforms(true)} style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s', backgroundColor: 'transparent', border: 'none', padding: 0, WebkitAppearance: 'none' }}>{t.ui.morePlatforms}</button>
                            <span style={{ color: '#1f2937', fontSize: '10px' }}>/</span>
                        </>
                     )}
                     <button onClick={() => setShowLegal(true)} style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s', backgroundColor: 'transparent', border: 'none', padding: 0, WebkitAppearance: 'none' }}>{t.ui.disclaimer}</button>
                     <span style={{ color: '#1f2937', fontSize: '10px' }}>/</span>
                     <button onClick={() => setShowPrivacy(true)} style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.2s', backgroundColor: 'transparent', border: 'none', padding: 0, WebkitAppearance: 'none' }}>{t.ui.privacy}</button>
                </div>
                <div style={{ width: '100%', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', paddingBottom: '16px', backgroundColor: 'black' }}>
                    <p style={{ fontSize: '9px', color: '#374151', fontFamily: 'monospace', letterSpacing: '0.2em', opacity: 0.6 }}>COPYRIGHT © 2026 DEEP SPACE STUDIO</p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (gameState === "GAME_OVER") {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(127,29,29,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '32px', textAlign: 'center', zIndex: 50 }}>
        <div style={{ width: '100%', maxWidth: '24rem', backgroundColor: 'rgba(10,10,16,0.95)', boxShadow: '0 0 50px rgba(220,38,38,0.2)', padding: '4px', position: 'relative', borderLeft: '1px solid rgba(239,68,68,0.2)', borderRight: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', borderTop: '1px solid #ef4444', borderLeft: '1px solid #ef4444' }}></div>
            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '8px', height: '8px', borderBottom: '1px solid #ef4444', borderRight: '1px solid #ef4444' }}></div>
            <div style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '30px', fontWeight: 900, color: '#ef4444', marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{t.ui.crash}</h2>
                <div style={{ height: '1px', width: '100%', background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)', marginBottom: '16px' }}></div>
                <p style={{ color: '#fecaca', fontSize: '12px', marginBottom: '32px', fontStyle: 'italic', opacity: 0.6, fontFamily: 'monospace', lineHeight: 1.6 }}>"{flavorText}"</p>
                <div style={{ marginBottom: '32px', padding: '16px', backgroundColor: 'rgba(127,29,29,0.1)', border: '1px solid rgba(239,68,68,0.1)' }}>
                    <div style={{ fontSize: '9px', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '4px' }}>{t.ui.score}</div>
                    <div style={{ fontSize: '36px', fontFamily: 'monospace', color: 'white' }}>{score}</div>
                </div>
                <div>
                    <MenuButton primary onClick={() => onStart(stage)}>{t.ui.replay}</MenuButton>
                    <MenuButton onClick={() => { setSelectedStage(stage); onNextStage("MENU"); }}>{t.ui.quit}</MenuButton>
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (gameState === "STAGE_CLEAR") {
    const nextStageText = t.stages[(stage + 1) as Stage];
    const stageConfig = STAGE_LOGIC[stage as Stage];
    const mainColor = stageConfig.color;

    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '32px', textAlign: 'center', zIndex: 50, backgroundColor: `${mainColor}22` }}>
         <div style={{ width: '100%', maxWidth: '24rem', backgroundColor: 'rgba(10,10,16,0.95)', boxShadow: `0 0 50px rgba(0,0,0,0.5)`, padding: '4px', position: 'relative', borderLeft: `1px solid ${mainColor}44`, borderRight: `1px solid ${mainColor}44` }}>
            <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', borderTop: `1px solid ${mainColor}`, borderLeft: `1px solid ${mainColor}` }}></div>
            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '8px', height: '8px', borderBottom: `1px solid ${mainColor}`, borderRight: `1px solid ${mainColor}` }}></div>
            <div style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '30px', fontWeight: 900, marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'sans-serif', color: mainColor }}>{t.ui.stageComplete}</h2>
                <div style={{ height: '1px', width: '100%', marginBottom: '16px', background: `linear-gradient(90deg, transparent, ${mainColor}80, transparent)` }}></div>
                <p style={{ fontSize: '12px', marginBottom: '24px', fontStyle: 'italic', opacity: 0.8, fontFamily: 'monospace', color: `${mainColor}cc` }}>"{flavorText}"</p>
                
                <div style={{ padding: '16px', borderLeft: `2px solid ${mainColor}`, marginBottom: '24px', textAlign: 'left', position: 'relative', overflow: 'hidden', backgroundColor: `${mainColor}11` }}>
                    <div style={{ fontSize: '9px', letterSpacing: '0.1em', marginBottom: '4px', textTransform: 'uppercase', color: mainColor }}>Next Phase Detected</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '4px', fontFamily: 'sans-serif' }}>{nextStageText.name}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>{nextStageText.desc}</div>
                </div>
                
                <div>
                    <MenuButton primary onClick={onNextStage}>{t.ui.continue}</MenuButton>
                    <MenuButton onClick={() => onStart(stage)}>{t.ui.replay}</MenuButton>
                </div>
            </div>
        </div>
      </div>
    );
  }
  
  if (gameState === "VICTORY") {
    return (
       <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(88,28,135,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '32px', textAlign: 'center', zIndex: 50 }}>
         <div style={{ width: '100%', maxWidth: '24rem', backgroundColor: 'rgba(10,10,16,0.95)', boxShadow: '0 0 60px rgba(168,85,247,0.3)', padding: '4px', position: 'relative', borderLeft: '1px solid rgba(168,85,247,0.2)', borderRight: '1px solid rgba(168,85,247,0.2)' }}>
            <div style={{ padding: '40px' }}>
                <h2 style={{ fontSize: '48px', fontWeight: 900, color: '#c084fc', marginBottom: '16px', letterSpacing: '-0.02em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{t.ui.legend}</h2>
                <p style={{ color: '#e9d5ff', fontSize: '14px', marginBottom: '32px', fontStyle: 'italic', fontFamily: 'monospace', opacity: 0.8 }}>"{flavorText}"</p>
                <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#d8b4fe', marginBottom: '8px' }}>{t.ui.finalScore}</div>
                <div style={{ fontSize: '60px', fontFamily: 'monospace', marginBottom: '32px', color: 'white', textShadow: '0 0 10px rgba(168,85,247,0.5)' }}>{score}</div>
                <MenuButton primary onClick={() => onStart(1)}>{t.ui.playAgain}</MenuButton>
            </div>
         </div>
       </div>
    )
  }
  return null;
};

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const [gameState, setGameState] = useState<GameState>("MENU");
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [stage, setStage] = useState<Stage>(1);
  const [unlockedStage, setUnlockedStage] = useState<Stage>(1);
  const [flavorText, setFlavorText] = useState("");
  const [activeControlMode, setActiveControlMode] = useState<ControlMode>("NORMAL");
  const [flashMode, setFlashMode] = useState<ControlMode | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [stats, setStats] = useState<GameStats>({ totalDeaths: 0, maxStage: 1, hellModeTime: 0, totalPlayTime: 0 });
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [lang, setLang] = useState<Language>("CN");
  const [bgmOn, setBgmOn] = useState(false);
  const [safeMode, setSafeMode] = useState(false);

  // Refs for callbacks to access current state
  const langRef = useRef(lang);
  const statsRef = useRef(stats);
  const stageRef = useRef(stage);
  const bgmRef = useRef(bgmOn);

  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { bgmRef.current = bgmOn; }, [bgmOn]);

  // Combined Persistence for Stats and Settings
  useEffect(() => {
    // Load Data
    const savedStats = localStorage.getItem('DEEP_SPACE_STATS');
    const savedSettings = localStorage.getItem('DEEP_SPACE_SETTINGS');
    
    if (savedStats) {
        try {
            const p = JSON.parse(savedStats);
            setStats(p);
            setUnlockedStage(p.maxStage as Stage);
        } catch(e) {}
    }

    if (savedSettings) {
        try {
            const s = JSON.parse(savedSettings);
            if (s.lang) setLang(s.lang);
            if (s.bgmOn !== undefined) setBgmOn(s.bgmOn);
        } catch(e) {}
    } else {
        // Default Lang if no settings saved
        if (!navigator.language.includes('zh')) setLang('EN');
    }

    if (canvasRef.current) {
      try {
        console.log('[App] 初始化游戏引擎...');
        engineRef.current = new GameEngine(canvasRef.current, {
            onGameOver: (s: number, t: number) => {
                setGameState("GAME_OVER");
                const l = langRef.current;
                const txt = TRANSLATIONS[l].flavor;
                const f = t < 5 ? txt.earlyDeath : txt.midGameDeath;
                setFlavorText(f[Math.floor(Math.random() * f.length)]);
                
                const st = { ...statsRef.current };
                st.totalDeaths++;
                st.totalPlayTime += t;
                setStats(st);
                localStorage.setItem('DEEP_SPACE_STATS', JSON.stringify(st));
                
                // 通知小程序游戏结束
                wxNotifyGameOver(s, stageRef.current);
                wxVibrate(false);
                
                if (bgmRef.current) BGM.stop();
            },
            onTimeUp: () => {
                const s = stageRef.current;
                const l = langRef.current;
                const txt = TRANSLATIONS[l].flavor;
                const st = { ...statsRef.current };
                
                if (s === 4) {
                    setGameState("VICTORY");
                    setFlavorText(txt.victory[Math.floor(Math.random() * txt.victory.length)]);
                    st.maxStage = 5;
                    st.hellModeTime += 60;
                    // 通知小程序通关
                    wxNotifyStageClear(s, score);
                    wxVibrate(false);
                } else {
                    setGameState("STAGE_CLEAR");
                    setFlavorText(txt.stageClear[Math.floor(Math.random() * txt.stageClear.length)]);
                    if (s + 1 > st.maxStage) st.maxStage = (s + 1);
                    setUnlockedStage(st.maxStage as Stage);
                    Sound.playLevelClear();
                    // 通知小程序关卡完成
                    wxNotifyStageClear(s, score);
                    wxVibrate(true);
                }
                setStats(st);
                localStorage.setItem('DEEP_SPACE_STATS', JSON.stringify(st));
            },
            onScoreUpdate: (s: number) => {
                setScore(s);
                setTime(s/100);
            },
            onModeChange: (m: ControlMode) => {
                setActiveControlMode(m);
                setFlashMode(m);
            }
        });
        
        // 通知小程序游戏准备就绪
        setTimeout(() => wxNotifyReady(), 1000);
        console.log('[App] 游戏引擎初始化完成');
      } catch (err: any) {
        console.error('[App] 游戏引擎初始化失败:', err);
        setInitError(err?.message || '初始化失败');
      }
    }
    return () => engineRef.current?.destroy();
  }, []);

  // Save Settings on Change
  useEffect(() => {
      localStorage.setItem('DEEP_SPACE_SETTINGS', JSON.stringify({ lang, bgmOn }));
      Sound.setEnabled(bgmOn);
  }, [lang, bgmOn]);

  useEffect(() => {
      engineRef.current?.setSafeMode(safeMode);
  }, [safeMode]);

  useEffect(() => {
      if (gameState === "MENU") {
          engineRef.current?.setMenuStage(selectedStage as Stage);
      }
  }, [selectedStage, gameState]);

  const handleStart = (s: Stage) => {
      setStage(s);
      setGameState("PLAYING");
      setActiveControlMode(STAGE_LOGIC[s].mode as ControlMode);
      engineRef.current?.start(s);
      if (bgmOn) BGM.start();
  };

  const handleNext = (arg: any) => {
      if (arg === "MENU") {
          setGameState("MENU");
          engineRef.current?.stop();
      } else {
          if (stage < 4) handleStart((stage + 1) as Stage);
          else {
              setGameState("MENU");
              engineRef.current?.stop();
          }
      }
  };

  const toggleBgm = () => {
      const newState = !bgmOn;
      setBgmOn(newState);
      Sound.setEnabled(newState);
      if (newState) BGM.start();
      else BGM.stop();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'black', overflow: 'hidden', userSelect: 'none' }}>

        {initError && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,0,0,0.9)',
            color: '#fff',
            padding: '20px',
            borderRadius: '8px',
            zIndex: 99999,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>初始化错误</div>
            <div style={{ fontSize: '12px' }}>{initError}</div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', touchAction: 'none', zIndex: 0 }} />
        <UIOverlay 
            gameState={gameState}
            stage={stage}
            score={score}
            time={time}
            onStart={handleStart}
            onNextStage={handleNext}
            unlockedStage={unlockedStage}
            flavorText={flavorText}
            stats={stats}
            showAchievements={showAchievements}
            toggleAchievements={() => setShowAchievements(!showAchievements)}
            activeControlMode={activeControlMode}
            selectedStage={selectedStage}
            setSelectedStage={(s: number) => setSelectedStage(s)}
            flashMode={flashMode}
            onResume={() => { setGameState("PLAYING"); engineRef.current?.resume(); }}
            onRestart={() => handleStart(stage)}
            onQuit={() => { setGameState("MENU"); engineRef.current?.stop(); }}
            onPause={() => { setGameState("PAUSED"); engineRef.current?.pause(); }}
            lang={lang}
            toggleLang={() => setLang(lang === 'CN' ? 'EN' : 'CN')}
            bgmOn={bgmOn}
            toggleBgm={toggleBgm}
            safeMode={safeMode}
            toggleSafeMode={() => setSafeMode(!safeMode)}
        />
    </div>
  );
};

// 全局错误处理
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  console.log('[Init] 创建 React root...');
  const root = createRoot(rootElement);
  console.log('[Init] 渲染 App...');
  root.render(<App />);
  console.log('[Init] 渲染完成');
} catch (err: any) {
  console.error('[Init] 致命错误:', err);
  document.body.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255,0,0,0.9);
      color: #fff;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      max-width: 80%;
      word-break: break-all;
    ">
      <div style="font-weight: bold; margin-bottom: 10px;">启动失败</div>
      <div style="font-size: 12px;">${err?.message || '未知错误'}</div>
      <div style="font-size: 10px; margin-top: 10px; opacity: 0.7;">${navigator.userAgent}</div>
    </div>
  `;
}
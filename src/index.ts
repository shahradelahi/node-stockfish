import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';

import type { StockfishAnalysis, StockfishInfo, StockfishOptions } from './typings';

/**
 * A TypeScript-first Node.js wrapper for the Stockfish 17.1 WASM chess engine.
 * Provides an event-driven interface for analysis and UCI command interaction.
 *
 * Emits:
 * - 'ready': When the engine is initialized.
 * - 'output': For raw engine output.
 * - 'info': For analysis information (depth, score, PV).
 * - 'error': On engine process errors.
 */
export class Stockfish extends EventEmitter {
  #process: ChildProcessWithoutNullStreams | null = null;
  #readyPromise: Promise<void>;
  #isReady = false;
  #analysisPromise: { resolve: (a: StockfishAnalysis) => void; reject: (e: Error) => void } | null =
    null;
  #currentAnalysis: StockfishAnalysis | null = null;

  constructor() {
    super();
    this.#readyPromise = this.#initialize();
  }

  async #initialize() {
    const scriptPath = join(__dirname, 'stockfish-17.1-8e4d048.cjs');
    this.#process = spawn(process.execPath, [scriptPath]);

    this.#process.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          this.#handleOutput(trimmed);
        }
      }
    });

    this.#process.stderr.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          this.#handleOutput(trimmed);
        }
      }
    });

    this.#process.on('error', (err) => {
      this.emit('error', err);
    });

    this.#process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        this.emit('error', new Error(`Engine process exited with code ${code}`));
      }
      this.#isReady = false;
    });

    // Wait for uciok
    await this.send('uci');
    this.#isReady = true;
    this.emit('ready');
  }

  #handleOutput(line: string) {
    this.emit('output', line);

    if (line.startsWith('info')) {
      const info = this.#parseInfo(line);
      if (info) {
        this.emit('info', info);
        if (this.#currentAnalysis) {
          const multipv = info.multipv || 1;
          const index = multipv - 1;

          this.#currentAnalysis.lines[index] = {
            pv: info.pv,
            score: info.score || { value: 0, type: 'cp' },
            depth: info.depth,
            nodes: info.nodes || 0,
            time: info.time || 0,
            nps: info.nps || 0,
          };
        }
      }
    } else if (line.startsWith('bestmove')) {
      if (this.#analysisPromise && this.#currentAnalysis) {
        const parts = line.split(' ');
        this.#currentAnalysis.bestmove = parts[1] || '';
        if (parts[2] === 'ponder') {
          this.#currentAnalysis.ponder = parts[3];
        }
        this.#analysisPromise.resolve(this.#currentAnalysis);
        this.#analysisPromise = null;
        this.#currentAnalysis = null;
      }
    }
  }

  #parseInfo(line: string): StockfishInfo | null {
    const parts = line.split(' ');
    const info: any = { pv: '' };
    for (let i = 1; i < parts.length; i++) {
      const valueStr = parts[i + 1] || '';
      switch (parts[i]) {
        case 'depth':
          info.depth = parseInt(valueStr);
          i++;
          break;
        case 'seldepth':
          info.seldepth = parseInt(valueStr);
          i++;
          break;
        case 'time':
          info.time = parseInt(valueStr);
          i++;
          break;
        case 'nodes':
          info.nodes = parseInt(valueStr);
          i++;
          break;
        case 'nps':
          info.nps = parseInt(valueStr);
          i++;
          break;
        case 'hashfull':
          info.hashfull = parseInt(valueStr);
          i++;
          break;
        case 'cpuload':
          info.cpuload = parseInt(valueStr);
          i++;
          break;
        case 'multipv':
          info.multipv = parseInt(valueStr);
          i++;
          break;
        case 'score': {
          const type = valueStr as 'cp' | 'mate';
          const scoreValue = parts[i + 2] || '';
          info.score = { type, value: parseInt(scoreValue) };
          i += 2;
          break;
        }
        case 'pv': {
          info.pv = parts.slice(i + 1).join(' ');
          i = parts.length;
          break;
        }
      }
    }
    return info as StockfishInfo;
  }

  /**
   * Waits for the Stockfish engine to be fully initialized.
   * Essential before sending commands or starting analysis.
   * @returns A promise that resolves when the engine is ready.
   * @example
   * ```typescript
   * const engine = new Stockfish();
   * await engine.waitReady();
   * // Engine is now ready.
   * ```
   */
  async waitReady(): Promise<void> {
    if (this.#isReady) return;
    await this.#readyPromise;
  }

  /**
   * Sends a raw UCI command to the Stockfish engine.
   * Automatically waits for the engine to be ready before sending, unless the command is 'uci'.
   * @param command The UCI command string (e.g., 'uci', 'isready', 'position startpos', 'go depth 20').
   * @returns A promise that resolves when the command has been sent and any expected immediate response (like 'uciok' or 'readyok') is received.
   * @example
   * ```typescript
   * const engine = new Stockfish();
   * await engine.send('uci');
   * await engine.send('isready');
   * ```
   */
  async send(command: string): Promise<void> {
    if (command !== 'uci') {
      await this.waitReady();
    }

    const target = command === 'uci' ? 'uciok' : command === 'isready' ? 'readyok' : null;
    let promise: Promise<string> | null = null;
    if (target) {
      promise = this.waitOutput(target);
    }

    if (!this.#process?.stdin) {
      throw new Error('Engine process stdin is not available');
    }

    this.#process.stdin.write(command + '\n');

    if (promise) {
      await promise;
    }
  }

  async waitOutput(target: string): Promise<string> {
    return new Promise((resolve) => {
      const listener = (line: string) => {
        if (line === target || line.startsWith(target + ' ')) {
          this.off('output', listener);
          resolve(line);
        }
      };
      this.on('output', listener);
    });
  }

  /**
   * Configures various Stockfish engine options (e.g., Threads, Hash, MultiPV).
   * @param options An object where keys are option names and values are their desired settings.
   * @returns A promise that resolves when all options have been sent to the engine.
   * @example
   * ```typescript
   * const engine = new Stockfish();
   * await engine.waitReady();
   * await engine.setOptions({ Threads: 4, Hash: 256, MultiPV: 2 });
   * ```
   */
  async setOptions(options: StockfishOptions): Promise<void> {
    for (const [key, value] of Object.entries(options)) {
      await this.send(`setoption name ${key} value ${value}`);
    }
  }

  /**
   * Performs a chess position analysis.
   * @param fen FEN string.
   * @param depth Maximum depth.
   * @param multipv (Optional) Number of top lines to analyze. Defaults to 1.
   */
  async analyze(fen: string, depth: number, multipv: number = 1): Promise<StockfishAnalysis> {
    await this.waitReady();
    if (this.#analysisPromise) {
      throw new Error('Analysis already in progress');
    }

    await this.send(`setoption name MultiPV value ${multipv}`);

    return new Promise((resolve, reject) => {
      this.#currentAnalysis = { bestmove: '', lines: [] };
      this.#analysisPromise = { resolve, reject };

      this.send(`position fen ${fen}`).then(() => {
        this.send(`go depth ${depth}`);
      });
    });
  }

  /**
   * Safely shuts down the Stockfish engine process.
   * After termination, the engine instance can no longer be used.
   */
  terminate() {
    if (this.#process) {
      this.#process.kill();
      this.#process = null;
    }
    this.#isReady = false;
  }
}

/**
 * Manages a pool of Stockfish engine instances to enable concurrent analysis.
 * Automatically handles engine lifecycle, including error recovery by replacing crashed engines.
 */
export class StockfishPool {
  #free: Stockfish[] = [];
  #queue: ((engine: Stockfish) => void)[] = [];
  #all: Set<Stockfish> = new Set();

  /**
   * Creates a new StockfishPool with a specified number of engine instances.
   * Each engine runs in its own child process.
   * @param size The number of Stockfish engine instances to maintain in the pool. Defaults to 4.
   * @example
   * ```typescript
   * const pool = new StockfishPool(4); // Create a pool with 4 engines
   * ```
   */
  constructor(size: number = 4) {
    for (let i = 0; i < size; i++) {
      this.#addWorker();
    }
  }

  #addWorker() {
    const engine = new Stockfish();

    // CRITICAL: Listen for errors to prevent Node.js crash
    engine.on('error', () => {
      this.#replaceWorker(engine);
    });

    this.#all.add(engine);
    this.#makeAvailable(engine);
  }

  #replaceWorker(deadEngine: Stockfish) {
    this.#all.delete(deadEngine);
    this.#free = this.#free.filter((e) => e !== deadEngine);

    try {
      deadEngine.terminate();
    } catch (e) {
      /* ignore */
    }

    this.#addWorker();
  }

  #makeAvailable(engine: Stockfish) {
    if (this.#queue.length > 0) {
      // If requests are waiting, hand it over immediately
      const resolve = this.#queue.shift()!;
      resolve(engine);
    } else {
      this.#free.push(engine);
    }
  }

  /**
   * Initializes all Stockfish engine instances in the pool, ensuring they are ready to accept commands.
   * This method should be called once after creating the pool and before acquiring any engines.
   * @returns A promise that resolves when all engines in the pool are ready.
   * @example
   * ```typescript
   * const pool = new StockfishPool(2);
   * await pool.initialize(); // Initialize all 2 engines
   * ```
   */
  async initialize() {
    await Promise.all(Array.from(this.#all).map((e) => e.waitReady()));
  }

  /**
   * Acquires an available Stockfish engine instance from the pool.
   * If no engines are immediately available, the method will wait until one is released.
   * @returns A promise that resolves with an available Stockfish engine instance.
   * @example
   * ```typescript
   * const engine = await pool.acquire();
   * try {
   *   // Use the engine
   *   const analysis = await engine.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 10);
   *   console.log(analysis.bestmove);
   * } finally {
   *   pool.release(engine); // Always release the engine
   * }
   * ```
   */
  async acquire(): Promise<Stockfish> {
    if (this.#free.length > 0) {
      return this.#free.pop()!;
    }
    return new Promise((resolve) => {
      this.#queue.push(resolve);
    });
  }

  /**
   * Releases a Stockfish engine instance back to the pool, making it available for other requests.
   * It is crucial to call this method after an engine has been acquired and its task is complete.
   * @param engine The Stockfish engine instance to release.
   * @example
   * ```typescript
   * const engine = await pool.acquire();
   * // Use engine...
   * pool.release(engine); // Release it back to the pool
   * ```
   */
  release(engine: Stockfish) {
    // Only release if the engine is still part of our pool (hasn't crashed)
    if (this.#all.has(engine)) {
      this.#makeAvailable(engine);
    }
  }

  /**
   * Shuts down all Stockfish engine instances in the pool and clears any pending acquisition requests.
   * After termination, the pool can no longer be used.
   * @example
   * ```typescript
   * await pool.initialize();
   * // Use pool...
   * pool.terminate(); // Shut down all engines
   * ```
   */
  terminate() {
    this.#all.forEach((e) => e.terminate());
    this.#all.clear();
    this.#free = [];
    this.#queue = [];
  }
}

export type * from './typings';

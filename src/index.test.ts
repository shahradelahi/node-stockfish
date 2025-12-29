import { describe, expect, it } from 'vitest';

import { Stockfish, StockfishPool } from './index';

describe('Stockfish', () => {
  it('should initialize and respond to uci', async () => {
    const engine = new Stockfish();
    await engine.waitReady();

    let uciok = false;
    engine.on('output', (line) => {
      if (line === 'uciok') uciok = true;
    });

    await engine.send('uci');

    // Wait a bit for the response
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(uciok).toBe(true);
    engine.terminate();
  });

  it('should analyze a position', async () => {
    const engine = new Stockfish();
    await engine.waitReady();

    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const analysis = await engine.analyze(fen, 10);

    expect(analysis.bestmove).toBeDefined();
    expect(analysis.lines.length).toBeGreaterThan(0);
    expect(analysis.lines[0]!.depth).toBeGreaterThanOrEqual(1);

    engine.terminate();
  });
});

describe('StockfishPool', () => {
  it('should initialize a pool of engines', async () => {
    const pool = new StockfishPool(2);
    await pool.initialize();
    // Verify that engines are ready by trying to acquire and release them
    const engine1 = await pool.acquire();
    expect(engine1).toBeInstanceOf(Stockfish);
    pool.release(engine1);
    pool.terminate();
  });

  it('should acquire and release engines correctly', async () => {
    const pool = new StockfishPool(1);
    await pool.initialize();

    const engine1 = await pool.acquire();
    expect(engine1).toBeInstanceOf(Stockfish);

    // Try to acquire another engine, should wait as pool size is 1
    let acquired2 = false;
    pool.acquire().then(() => (acquired2 = true));

    await new Promise((resolve) => setTimeout(resolve, 100)); // Give some time for the promise to queue
    expect(acquired2).toBe(false);

    pool.release(engine1);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Give some time for the promise to resolve
    expect(acquired2).toBe(true);
    pool.terminate();
  });

  it('should terminate all engines in the pool', async () => {
    const pool = new StockfishPool(2);
    await pool.initialize();

    // Acquire some engines to ensure they are active
    const engine1 = await pool.acquire();
    const engine2 = await pool.acquire();

    // Release them before terminating to avoid errors in termination
    pool.release(engine1);
    pool.release(engine2);

    pool.terminate();

    // Verify that attempting to use a terminated engine throws an error or is handled gracefully
    // This is hard to test directly without exposing internal state, but we can check if it tries to acquire again
    const promise = pool.acquire();
    // The promise should hang indefinitely or reject if the pool is truly terminated
    // For this test, we expect it to hang, as terminate clears the queue.
    let acquiredAfterTerminate = false;
    promise.then(() => (acquiredAfterTerminate = true));
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(acquiredAfterTerminate).toBe(false);
  });
});

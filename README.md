<p align="center">
  <a href="https://stockfishchess.org">
    <img src="https://stockfishchess.org/images/logo/icon_128x128.png" alt="Stockfish">
  </a>
</p>
<h1 align="center">
  <sup>Stockfish for Node.JS</sup>
  <br>
  <p>
    <a href="https://github.com/shahradelahi/node-stockfish/actions/workflows/ci.yml">
      <img src="https://github.com/shahradelahi/node-stockfish/actions/workflows/ci.yml/badge.svg?branch=main&event=push" alt="CI">
    </a>
    <a href="https://www.npmjs.com/package/@se-oss/stockfish">
      <img src="https://img.shields.io/npm/v/@se-oss/stockfish.svg" alt="NPM Version">
    </a>
    <a href="/LICENSE">
      <img src="https://img.shields.io/badge/License-GPL3.0-blue.svg?style=flat" alt="GPL-3.0 License">
    </a>
    <img src="https://img.shields.io/bundlephobia/minzip/@se-oss/stockfish" alt="npm bundle size">
    <a href="https://packagephobia.com/result?p=@se-oss/stockfish">
      <img src="https://packagephobia.com/badge?p=@se-oss/stockfish" alt="Install Size">
    </a>
  </p>
</h1>

_@se-oss/stockfish_ is a high-performance, TypeScript-first Node.js wrapper for the Stockfish 17.1 WASM chess engine. It provides a convenient API for integrating powerful chess analysis capabilities into your applications, offering functionalities such as position analysis, best move calculation, and direct UCI command interaction.

---

- [Installation](#-installation)
- [Usage](#-usage)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#license)

## 📦 Installation

```bash
npm i @se-oss/stockfish
```

<details>
<summary>Install using your favorite package manager</summary>

**pnpm**

```bash
pnpm install @se-oss/stockfish
```

**yarn**

```bash
yarn add @se-oss/stockfish
```

</details>

## 📖 Usage

### Basic Analysis

```typescript
import { Stockfish } from '@se-oss/stockfish';

const engine = new Stockfish();
await engine.waitReady();

const analysis = await engine.analyze(
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  15
);

console.log('Best move:', analysis.bestmove); // e2e4
console.log('Score:', analysis.lines[0].score); // { type: 'cp', value: 39 }
```

### Advanced UCI Commands

```typescript
const engine = new Stockfish();

engine.on('info', (info) => {
  console.log(`Depth ${info.depth}: ${info.pv}`);
});

await engine.send('uci');
await engine.send('isready');
await engine.send('position startpos moves e2e4');
await engine.send('go depth 20');
```

### Using the Stockfish Pool

```typescript
import { StockfishPool } from '@se-oss/stockfish';

const pool = new StockfishPool(4); // Create a pool with 4 engine instances
await pool.initialize();

// Acquire an engine, use it, and release it back to the pool
const engine = await pool.acquire();
console.log('Engine acquired');
const analysis = await engine.analyze(
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  10
);
console.log('Best move from pool engine:', analysis.bestmove);
pool.release(engine);
console.log('Engine released');

// Terminate the pool when done
pool.terminate();
```

## 📚 Documentation

For detailed API documentation on all methods, please see [the API docs](https://www.jsdocs.io/package/@se-oss/stockfish).

## 🤝 Contributing

Want to contribute? Awesome! To show your support is to star the project, or to raise issues on [GitHub](https://github.com/shahradelahi/node-stockfish).

## License

[GPL-3.0](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/node-stockfish/graphs/contributors).

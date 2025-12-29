export interface StockfishOptions {
  /**
   * The number of threads to use.
   */
  threads?: number;
  /**
   * The hash size in MB.
   */
  hash?: number;
  /**
   * The number of multi-PV lines.
   */
  multiPV?: number;
  /**
   * Other UCI options.
   */
  [key: string]: any;
}

export interface StockfishLine {
  /**
   * The principal variation (sequence of moves) found by the engine.
   */
  pv: string;
  /**
   * The score of the position from the engine's perspective.
   */
  score: {
    /**
     * The score value. Positive for white advantage, negative for black.
     * If `type` is 'cp', value is in centipawns. If 'mate', it's the number of moves to mate.
     */
    value: number;
    /**
     * The type of score: 'cp' for centipawns, 'mate' for checkmate in N moves.
     */
    type: 'cp' | 'mate';
  };
  /**
   * The search depth at which this line was found.
   */
  depth: number;
  /**
   * The number of nodes searched to find this line.
   */
  nodes: number;
  /**
   * The time taken in milliseconds to find this line.
   */
  time: number;
  /**
   * Nodes per second (NPS) during the search for this line.
   */
  nps: number;
}

export interface StockfishAnalysis {
  /**
   * The best move found by the engine in UCI format (e.g., 'e2e4').
   */
  bestmove: string;
  /**
   * An optional pondering move suggested by the engine.
   */
  ponder?: string;
  /**
   * An array of `StockfishLine` objects, representing the principal variations and their associated analysis details.
   */
  lines: StockfishLine[];
}

export interface StockfishInfo {
  /**
   * The current search depth.
   */
  depth: number;
  /**
   * The selective search depth.
   */
  seldepth?: number;
  /**
   * The time elapsed in the current search in milliseconds.
   */
  time?: number;
  /**
   * The number of nodes searched so far.
   */
  nodes?: number;
  /**
   * The principal variation (moves) found at the current depth.
   */
  pv: string;
  /**
   * The score of the current position.
   */
  score?: {
    /**
     * The score value. Positive for white, negative for black. Centipawns ('cp') or moves to mate ('mate').
     */
    value: number;
    /**
     * The type of score: 'cp' for centipawns, 'mate' for checkmate.
     */
    type: 'cp' | 'mate';
  };
  /**
   * Nodes per second.
   */
  nps?: number;
  /**
   * The hash table fill percentage.
   */
  hashfull?: number;
  /**
   * The CPU load percentage.
   */
  cpuload?: number;
  /**
   * The current multi-PV line number (1-indexed).
   */
  multipv?: number;
}

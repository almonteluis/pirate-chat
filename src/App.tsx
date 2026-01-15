import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Chess,
  type Color,
  type Move,
  type Piece,
  type PieceSymbol,
  type Square,
} from "chess.js";

type BoardSquare = {
  square: Square;
  piece: Piece | null;
  isDark: boolean;
};

type LastMove = {
  from: Square;
  to: Square;
};

// Hoist constants outside component (rendering-hoist-jsx)
const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const ranks = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const pieceIcons: Record<string, string> = {
  wp: "♙",
  wr: "♖",
  wn: "♘",
  wb: "♗",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  br: "♜",
  bn: "♞",
  bb: "♝",
  bq: "♛",
  bk: "♚",
};

const buildBoard = (game: Chess): BoardSquare[] => {
  const raw = game.board();
  const squares: BoardSquare[] = [];

  for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
      const square = `${files[fileIndex]}${8 - rankIndex}` as Square;
      const piece = raw[rankIndex]?.[fileIndex] ?? null;
      const isDark = (rankIndex + fileIndex) % 2 === 1;

      squares.push({ square, piece, isDark });
    }
  }

  return squares;
};

const getStatusText = (game: Chess): string => {
  if (game.isCheckmate()) {
    return `Checkmate — ${game.turn() === "w" ? "Black" : "White"} wins`;
  }

  if (game.isStalemate()) {
    return "Stalemate";
  }

  if (game.isDraw()) {
    return "Draw";
  }

  if (game.isCheck()) {
    return `${game.turn() === "w" ? "White" : "Black"} to move — check`;
  }

  return `${game.turn() === "w" ? "White" : "Black"} to move`;
};

// Hoist piece names constant (rendering-hoist-jsx)
const pieceNames: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const describePiece = (piece: Piece | null): string => {
  if (!piece) {
    return "empty square";
  }

  const color = piece.color === "w" ? "White" : "Black";
  return `${color} ${pieceNames[piece.type]}`;
};

// AI Evaluation and Move Selection
const pieceValues: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const evaluateBoard = (game: Chess): number => {
  const board = game.board();
  let score = 0;

  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const piece = board[rank]?.[file];
      if (piece) {
        const value = pieceValues[piece.type];
        score += piece.color === "w" ? value : -value;
      }
    }
  }

  return score;
};

const findBestMove = (game: Chess): Move | null => {
  const moves = game.moves({ verbose: true }) as Move[];
  
  if (moves.length === 0) {
    return null;
  }

  let bestMove = moves[0];
  let bestScore = Infinity; // AI plays as Black (minimizing score)

  for (const move of moves) {
    const gameCopy = new Chess(game.fen());
    gameCopy.move(move);
    
    let score = evaluateBoard(gameCopy);
    
    // Bonus for captures
    if (move.captured) {
      score -= pieceValues[move.captured] * 0.5;
    }
    
    // Bonus for checks
    if (gameCopy.isCheck()) {
      score -= 0.5;
    }
    
    // Bonus for checkmate
    if (gameCopy.isCheckmate()) {
      score -= 1000;
    }

    if (score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};

// Extract memoized Square component (rerender-memo)
type SquareButtonProps = {
  square: Square;
  piece: Piece | null;
  isDark: boolean;
  isSelected: boolean;
  isLegal: boolean;
  isLastMove: boolean;
  onSquareClick: (square: Square) => void;
  onSquareKeyDown: (event: KeyboardEvent<HTMLButtonElement>, square: Square) => void;
};

const SquareButton = memo<SquareButtonProps>(({
  square,
  piece,
  isDark,
  isSelected,
  isLegal,
  isLastMove,
  onSquareClick,
  onSquareKeyDown,
}) => {
  const squareClasses = [
    "relative aspect-square flex items-center justify-center text-3xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900 transition",
    isDark
      ? "bg-emerald-800 text-emerald-100"
      : "bg-emerald-200 text-emerald-900",
    isSelected &&
      "ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900",
    isLastMove && "outline outline-2 outline-orange-400",
    isLegal && !piece && "hover:bg-emerald-300/80",
  ]
    .filter(Boolean)
    .join(" ");

  const label = `${square}, ${describePiece(piece)}`;

  const handleClick = useCallback(() => {
    onSquareClick(square);
  }, [square, onSquareClick]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    onSquareKeyDown(event, square);
  }, [square, onSquareKeyDown]);

  return (
    <button
      type="button"
      tabIndex={0}
      aria-label={label}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={squareClasses}
    >
      {piece ? pieceIcons[`${piece.color}${piece.type}`] : null}
      {isLegal ? (
        <span
          aria-hidden
          className={`absolute h-3 w-3 rounded-full ${
            piece
              ? "border-4 border-indigo-200"
              : "bg-indigo-200/90"
          }`}
        />
      ) : null}
    </button>
  );
});

// Extract memoized MoveHistoryItem component (rerender-memo)
type MoveHistoryItemProps = {
  move: Move;
  index: number;
};

const MoveHistoryItem = memo<MoveHistoryItemProps>(({ move, index }) => {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-700/60 px-3 py-2">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-wide text-slate-300">
          {index % 2 === 0 ? "White" : "Black"}
        </span>
        <span className="font-semibold text-white">{move.san}</span>
      </div>
      <span className="text-xs text-slate-300">
        {move.from} → {move.to}
      </span>
    </div>
  );
});

const App = () => {
  const gameRef = useRef(new Chess());
  
  // Use lazy initialization for expensive board calculation (rerender-lazy-state-init)
  const [board, setBoard] = useState<BoardSquare[]>(() =>
    buildBoard(gameRef.current)
  );
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [history, setHistory] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [status, setStatus] = useState<string>(() => getStatusText(gameRef.current));
  const [activeTurn, setActiveTurn] = useState<Color>(() => gameRef.current.turn());

  // Memoize syncPosition with useCallback for stable reference (rerender-functional-setstate)
  const syncPosition = useCallback(() => {
    const game = gameRef.current;
    const verboseHistory = game.history({ verbose: true }) as Move[];
    const recent = verboseHistory[verboseHistory.length - 1];

    setBoard(buildBoard(game));
    setHistory(verboseHistory);
    setLastMove(
      recent ? { from: recent.from as Square, to: recent.to as Square } : null
    );
    setStatus(getStatusText(game));
    setActiveTurn(game.turn());
  }, []);

  useEffect(() => {
    syncPosition();
  }, [syncPosition]);

  // AI move effect - triggers when it's Black's turn
  useEffect(() => {
    const game = gameRef.current;
    
    // Check if it's Black's turn and game is not over
    if (activeTurn === "b" && !game.isGameOver()) {
      const timer = setTimeout(() => {
        const bestMove = findBestMove(game);
        
        if (bestMove) {
          game.move(bestMove);
          syncPosition();
        }
      }, 500); // Small delay to make it feel more natural

      return () => clearTimeout(timer);
    }
  }, [activeTurn, syncPosition]);

  // Use useCallback for event handlers (rerender-functional-setstate)
  const handleSquareSelection = useCallback((square: Square) => {
    const game = gameRef.current;

    // Don't allow moves when it's Black's turn (AI is playing)
    if (game.turn() === "b") {
      return;
    }

    // Early exit pattern (js-early-exit)
    if (selectedSquare && legalMoves.includes(square)) {
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: "q",
      });

      if (move) {
        setSelectedSquare(null);
        setLegalMoves([]);
        syncPosition();
        return;
      }
    }

    const piece = game.get(square);

    if (piece && piece.color === game.turn()) {
      const moves = game.moves({ square, verbose: true }) as Move[];
      setSelectedSquare(square);
      setLegalMoves(moves.map((m) => m.to as Square));
      return;
    }

    setSelectedSquare(null);
    setLegalMoves([]);
  }, [selectedSquare, legalMoves, syncPosition]);

  const handleSquareKeyDown = useCallback((
    event: KeyboardEvent<HTMLButtonElement>,
    square: Square
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSquareSelection(square);
    }
  }, [handleSquareSelection]);

  const handleUndo = useCallback(() => {
    const game = gameRef.current;
    const undone = game.undo();

    // Early exit if undo fails (js-early-exit)
    if (!undone) {
      return;
    }

    setSelectedSquare(null);
    setLegalMoves([]);
    syncPosition();
  }, [syncPosition]);

  const handleReset = useCallback(() => {
    const game = gameRef.current;
    game.reset();
    setSelectedSquare(null);
    setLegalMoves([]);
    syncPosition();
  }, [syncPosition]);

  // Derive canUndo from primitive state (rerender-dependencies)
  const canUndo = history.length > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
          Chess Trainer Prototype
        </p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Human vs AI Chess
        </h1>
        <p className="max-w-3xl text-slate-300">
          You play as White, and the AI plays as Black. Click your pieces to
          highlight legal moves, then click a highlighted square to move. The AI
          will automatically respond. Use Undo or Reset to manage the game state.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(320px,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3 shadow-md shadow-slate-900/40">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-3 w-3 rounded-full ${
                  activeTurn === "w" ? "bg-emerald-300" : "bg-amber-400 animate-pulse"
                }`}
                aria-hidden
              />
              <span className="text-sm font-semibold text-white">
                {status}
                {activeTurn === "b" && !gameRef.current.isGameOver() && (
                  <span className="ml-2 text-amber-400">(AI thinking...)</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700/60"
                aria-label="Undo last move"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Reset game"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border-4 border-slate-700 bg-slate-800 shadow-2xl shadow-slate-900/50">
            <div className="grid grid-cols-8">
              {board.map(({ square, piece, isDark }) => {
                const isSelected = selectedSquare === square;
                const isLegal = legalMoves.includes(square);
                const isLastMove =
                  lastMove?.from === square || lastMove?.to === square;

                return (
                  <SquareButton
                    key={square}
                    square={square}
                    piece={piece}
                    isDark={isDark}
                    isSelected={isSelected}
                    isLegal={isLegal}
                    isLastMove={isLastMove}
                    onSquareClick={handleSquareSelection}
                    onSquareKeyDown={handleSquareKeyDown}
                  />
                );
              })}
            </div>
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between px-1 py-2 text-xs font-semibold text-slate-200">
              {ranks.map((rank) => (
                <span key={rank} aria-hidden>
                  {rank}
                </span>
              ))}
            </div>
            <div className="flex justify-between px-3 py-2 text-xs font-semibold text-slate-200">
              {files.map((file) => (
                <span key={file} aria-hidden>
                  {file}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-xl bg-slate-800 p-4 shadow-lg shadow-slate-900/40">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Move History</h2>
            <span className="rounded-full bg-slate-700 px-2 py-1 text-xs font-medium text-slate-200">
              {history.length} ply
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-100">
            {history.length === 0 ? (
              <p className="col-span-2 rounded-md bg-slate-700/60 px-3 py-2 text-slate-300">
                Make a move to see history.
              </p>
            ) : (
              history.map((move, idx) => (
                <MoveHistoryItem
                  key={`${move.from}-${move.to}-${idx}`}
                  move={move}
                  index={idx}
                />
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
};

export default App;

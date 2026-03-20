import { useGame } from './hooks/useGame';
import { GameBoard } from './components/GameBoard';

export default function App() {
  const {
    p1Entities,
    p2Entities,
    targets,
    isWin,
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    resetLevel,
    newLevel,
  } = useGame();

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white font-sans selection:bg-transparent">
      <h1 className="text-4xl font-bold mb-8 tracking-tight">Coupled Colors</h1>

      {isWin && (
        <p className="mb-6 text-green-400 text-lg font-semibold tracking-wide">Puzzle solved!</p>
      )}

      <div className="flex gap-12 items-start">
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-300">Player 1</h2>
          <GameBoard
            player={1}
            entities={p1Entities}
            targets={targets}
            isSolved={isWin}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-300">Player 2</h2>
          <GameBoard
            player={2}
            entities={p2Entities}
            targets={targets}
            isSolved={isWin}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button onClick={resetLevel} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium text-neutral-300">
          Reset
        </button>
        <button onClick={() => newLevel('easy')} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium text-neutral-300">
          Easy
        </button>
        <button onClick={() => newLevel('medium')} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium text-neutral-300">
          Medium
        </button>
        <button onClick={() => newLevel('hard')} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium text-neutral-300">
          Hard
        </button>
      </div>
    </div>
  );
}

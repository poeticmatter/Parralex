import { useState, useCallback } from 'react';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Utility screens ───────────────────────────────────────────────────────────

function StatusScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white font-sans gap-4">
      <p className="text-neutral-400 text-lg">{message}</p>
      <button
        onClick={() => { window.location.href = window.location.pathname; }}
        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors"
      >
        Back to Lobby
      </button>
    </div>
  );
}

function WaitingForPartner({ roomCode }: { roomCode: string }) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white font-sans gap-6">
      <h2 className="text-2xl font-semibold">Waiting for Player 2…</h2>
      <p className="text-neutral-400 text-sm">Share this link with your partner:</p>
      <div className="flex gap-2 items-center">
        <code className="bg-neutral-800 px-4 py-2 rounded-lg text-neutral-200 text-sm select-all">
          {shareUrl}
        </code>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm transition-colors"
        >
          Copy
        </button>
      </div>
      <p className="text-neutral-600 text-xs font-mono">Room: {roomCode}</p>
    </div>
  );
}

// ── Game view (rendered once both players are connected) ──────────────────────

function GameView({ roomCode, playerRole }: { roomCode: string; playerRole: 1 | 2 }) {
  const {
    p1Entities, p2Entities, targets, isWin,
    status, errorMsg,
    handlePointerDown, handlePointerUp, handlePointerCancel,
    resetLevel, newLevel,
  } = useMultiplayerGame(roomCode, playerRole);

  if (status === 'connecting')          return <StatusScreen message="Connecting…" />;
  if (status === 'error')               return <StatusScreen message={errorMsg ?? 'Something went wrong.'} />;
  if (status === 'disconnected')        return <StatusScreen message="Your partner disconnected." />;
  if (status === 'waiting_for_partner') return <WaitingForPartner roomCode={roomCode} />;
  if (status === 'waiting_for_level')   return <StatusScreen message="Loading puzzle…" />;

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white font-sans selection:bg-transparent">
      <h1 className="text-4xl font-bold mb-8 tracking-tight">Coupled Colors</h1>

      {isWin && (
        <p className="mb-6 text-green-400 text-lg font-semibold tracking-wide">Puzzle solved!</p>
      )}

      <div className="flex gap-12 items-start">
        {/* Player 1 board — dim label when local user is P2 */}
        <div className="flex flex-col items-center gap-3">
          <h2 className={`text-lg font-semibold ${playerRole === 1 ? 'text-white' : 'text-neutral-500'}`}>
            {playerRole === 1 ? 'Player 1 (You)' : 'Player 1'}
          </h2>
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

        {/* Player 2 board */}
        <div className="flex flex-col items-center gap-3">
          <h2 className={`text-lg font-semibold ${playerRole === 2 ? 'text-white' : 'text-neutral-500'}`}>
            {playerRole === 2 ? 'Player 2 (You)' : 'Player 2'}
          </h2>
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
        <button
          onClick={resetLevel}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium text-neutral-300"
        >
          Reset
        </button>
        {/* New level controls are host-only — P2 sees no difficulty buttons */}
        {playerRole === 1 && (
          <>
            <button onClick={() => newLevel('easy')}   className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium text-neutral-300">Easy</button>
            <button onClick={() => newLevel('medium')} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium text-neutral-300">Medium</button>
            <button onClick={() => newLevel('hard')}   className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium text-neutral-300">Hard</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [roomInfo, setRoomInfo] = useState<{ code: string; role: 1 | 2 } | null>(() => {
    const code = new URLSearchParams(window.location.search).get('room');
    return code ? { code: code.toUpperCase(), role: 2 } : null;
  });

  const handleCreateGame = useCallback(() => {
    const code = generateRoomCode();
    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    history.replaceState(null, '', url.toString());
    setRoomInfo({ code, role: 1 });
  }, []);

  if (!roomInfo) return <Lobby onCreateGame={handleCreateGame} />;
  return <GameView roomCode={roomInfo.code} playerRole={roomInfo.role} />;
}

interface Props {
  onCreateGame: () => void;
}

export function Lobby({ onCreateGame }: Props) {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white font-sans gap-6">
      <h1 className="text-5xl font-bold tracking-tight">Hex Duel</h1>
      <p className="text-neutral-400 text-center max-w-sm leading-relaxed text-sm">
        A 2-player competitive game on a diamond hex grid.<br />
        Player 1 drives all characters north/south. Player 2 drives east/west.<br />
        Both players move the same 4 characters — but with different dice pairings.
      </p>
      <button
        onClick={onCreateGame}
        className="mt-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold text-lg transition-colors"
      >
        Create Game
      </button>
    </div>
  );
}

interface Props {
  onCreateGame: () => void;
}

export function Lobby({ onCreateGame }: Props) {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white font-sans gap-6">
      <h1 className="text-5xl font-bold tracking-tight">Coupled Colors</h1>
      <p className="text-neutral-400 text-center max-w-sm leading-relaxed text-sm">
        A cooperative 2-player sliding puzzle.<br />
        Each player sees the same blocks through different color pairings.
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

export default function Loading() {
  return (
    <div className="p-4 space-y-3 max-w-lg mx-auto animate-pulse">
      <div className="h-7 w-32 bg-zinc-200 rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-zinc-200 rounded-xl" />
        ))}
      </div>
      <div className="h-40 bg-zinc-200 rounded-xl" />
      <div className="h-40 bg-zinc-200 rounded-xl" />
    </div>
  );
}

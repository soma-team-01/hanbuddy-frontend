export function BottomActionBar({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-md items-center gap-3 border-t border-line bg-chip px-4 py-4 shadow-[0_-4px_10px_0_rgba(45,62,53,0.08)]">
      {children}
    </div>
  );
}

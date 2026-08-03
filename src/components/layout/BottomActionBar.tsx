export function BottomActionBar({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      data-testid="bottom-action-bar"
      className="fixed inset-x-0 bottom-0 z-30 flex w-full items-center gap-3 border-t border-line-soft bg-panel px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(61,45,43,0.08)] lg:static lg:z-auto lg:rounded-2xl lg:border lg:p-4 lg:shadow-none"
    >
      {children}
    </div>
  );
}

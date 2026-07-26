export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white">
      <div
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
      />
      <p className="text-[0.9rem] text-[#6B7C72]">Loading menu&hellip;</p>
    </div>
  );
}

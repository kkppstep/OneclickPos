export default function ErrorScreen({ error, onRetry }) {
  const missingStore = error?.message === 'missing_store';
  const notFound = error?.status === 404;

  const title = missingStore ? "This link's missing a table code" : notFound ? "We can't find that menu" : "Couldn't load the menu";

  const detail = missingStore
    ? 'Please scan the QR code on your table rather than opening this page directly.'
    : notFound
      ? "This store code doesn't match any menu we have on file."
      : 'Check your connection and try again.';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-8 text-center">
      <h1 className="text-[1.05rem] font-bold text-[#1C2620]">{title}</h1>
      <p className="text-[0.88rem] text-[#6B7C72]">{detail}</p>
      {!missingStore && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-xl px-5 py-2.5 text-[0.88rem] font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

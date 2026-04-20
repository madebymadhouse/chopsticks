'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev; production error reporting can be wired here
    console.error(error);
  }, [error]);

  return (
    <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          500 · Something went wrong
        </p>
        <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>
          Unexpected error
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Something broke on our end. You can try again or{' '}
          <a href="https://github.com/madebymadhouse/chopsticks/issues" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            open an issue
          </a>.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem' }}
          >
            Try again
          </button>
          <a href="/" className="btn btn-ghost" style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem' }}>
            Back to home
          </a>
        </div>
      </div>
    </section>
  );
}

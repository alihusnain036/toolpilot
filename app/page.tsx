import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ToolPilot — browser-based online tools',
};

/**
 * Placeholder home route. The catalogue, search and favourites sections land
 * in their own tickets; this exists so `next build` has a route to prerender
 * and so the foundation is verifiable end to end.
 */
export default function HomePage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-content px-gutter py-section">
      <h1 className="text-4xl font-semibold tracking-tight">ToolPilot</h1>
      <p className="mt-stack max-w-prose text-lg text-muted-foreground">
        Free, fast online tools that run entirely in your browser. Nothing you
        open is uploaded anywhere.
      </p>
    </div>
  );
}

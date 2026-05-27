import { api } from '../../lib/api';

// ISR: regenerate this page at most once every 60 seconds
export const revalidate = 60;

export default async function HighlightPage() {
  try {
    const { quote, highlightSetAt, fallback } = await api.getHighlight();

    if (!quote) {
      return (
        <main>
          <h1>Highlight</h1>
          <p>No highlight available.</p>
        </main>
      );
    }

    return (
      <main>
        <h1>Highlight</h1>
        <blockquote>&ldquo;{quote.text}&rdquo;</blockquote>
        <cite>— {quote.author}</cite>
        <p>Set at: {highlightSetAt}</p>
        {fallback && <small>(fallback — worker hasn&apos;t run yet)</small>}
      </main>
    );
  } catch {
    return (
      <main>
        <h1>Highlight</h1>
        <p>Could not load highlight. Is the API running?</p>
      </main>
    );
  }
}

import { api } from '../lib/api';

// ISR: regenerate this page at most once every 60 seconds
export const revalidate = 60;

export default async function Home() {
  try {
    const { quotes, count } = await api.getQuotes();

    return (
      <main>
        <h1>QuoteKai</h1>
        <p>{count} quotes</p>
        <ul>
          {quotes.map((quote) => (
            <li key={quote.id}>
              <blockquote>&ldquo;{quote.text}&rdquo;</blockquote>
              <cite>— {quote.author}</cite>
            </li>
          ))}
        </ul>
      </main>
    );
  } catch {
    return (
      <main>
        <h1>QuoteKai</h1>
        <p>Could not load quotes. Is the API running?</p>
      </main>
    );
  }
}

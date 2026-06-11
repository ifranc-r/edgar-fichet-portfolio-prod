const preloadCache = new Map<string, Promise<void>>();

function preloadOne(url: string): Promise<void> {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl) return Promise.resolve();

  const existing = preloadCache.get(cleanUrl);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = cleanUrl;
  });

  preloadCache.set(cleanUrl, promise);
  return promise;
}

export function preloadPoster(url: string): Promise<void> {
  return preloadOne(url);
}

export async function preloadPosters(urls: string[], parallel = 6): Promise<void> {
  const unique = Array.from(new Set(urls.map((u) => (u || '').trim()).filter(Boolean)));
  if (unique.length === 0) return;

  const chunkSize = Math.max(1, parallel);
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    await Promise.all(chunk.map(preloadOne));
  }
}

import { useEffect, useState } from 'react';

export interface Film {
  id: number;
  title: string;
  year: number | null;
  director: string;
  role: string;
  poster: string;
  image_presentation?: string;
  hasRealPresentation?: boolean;
  order?: number | null;
  synopsis?: string;
  category?: string;
}

type WPFilm = {
  id: number;
  title: { rendered: string };
  menu_order?: number;
  acf?: {
    realisateur?: string;
    poste?: string;
    annee?: string | number;
    image?: number | string;
      image_presentation?: number | string;
    order?: string | number;
      titre_film?: string;
    synopsis?: string;
    category?: string;
  };
};

type WPMedia = {
  id: number;
  source_url: string;
};

export function useFilms() {
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFilms = async () => {
      try {
        // Récupérer les post types actifs via le bon chemin REST API
        const postTypes = ['film_film', 'film_pub', 'film_clip', 'film_theatre'];
        const allFilms: WPFilm[] = [];

        for (const postType of postTypes) {
          const res = await fetch(
            `/wp/?rest_route=/wp/v2/${postType}&per_page=100&orderby=menu_order&order=asc`
          );

          if (res.ok) {
            const films = (await res.json()) as WPFilm[];
            allFilms.push(...films);
          }
        }

        const wpFilms = allFilms;

        const mappedFilms = await Promise.all(
          wpFilms.map(async (film) => {
            const acf = film.acf ?? {};

                // Helper to resolve an ACF media field which may be:
                // - a full URL string
                // - a numeric ID (number)
                // - a numeric ID as a string ("123")
                async function resolveMediaField(value: any) {
                  if (!value && value !== 0) return '';
                  // direct URL
                  if (typeof value === 'string' && value.startsWith('http')) return value;
                  // numeric string -> coerce
                  const maybeNumber = typeof value === 'number' ? value : parseInt(value, 10);
                  if (!Number.isNaN(maybeNumber) && maybeNumber > 0) {
                    try {
                      const mediaRes = await fetch(`/wp/?rest_route=/wp/v2/media/${maybeNumber}`);
                      if (!mediaRes.ok) {
                        console.warn(`Media fetch failed for film ${film.id}, media ${maybeNumber}: ${mediaRes.status}`);
                        return '';
                      }
                      const mediaData = (await mediaRes.json()) as WPMedia;
                      return mediaData.source_url ?? '';
                    } catch (err) {
                      console.warn(`Failed to fetch media ${maybeNumber} for film ${film.id}`, err);
                      return '';
                    }
                  }
                  return '';
                }

                const posterUrl = await resolveMediaField(acf.image);
                const presentationUrl = await resolveMediaField(acf.image_presentation);
                const imagePresentationUrl = presentationUrl || posterUrl;
                const hasRealPresentation = !!presentationUrl;

                if (!posterUrl) console.debug(`Film ${film.id} poster resolved to empty`, acf.image);
                if (!imagePresentationUrl) console.debug(`Film ${film.id} image_presentation resolved to empty`, acf.image_presentation);

            return {
              id: film.id,
              title:
                ((film as any)?.title?.rendered as string) ??
                ((film as any)?.title as string) ??
                (acf.titre_film as string) ??
                'Untitled',
              year:
                acf.annee !== undefined && acf.annee !== null
                  ? Number(acf.annee)
                  : null,
              director: acf.realisateur ?? '',
              role: acf.poste ?? '',
              poster: posterUrl,
              image_presentation: imagePresentationUrl,
              hasRealPresentation,
              order: acf.order !== undefined && acf.order !== null ? Number(acf.order) : null,
              synopsis: acf.synopsis ?? '',
              category: acf.category ?? 'Film',
            };
          })
        );

        // Trier par le champ ACF 'order' du formulaire
        mappedFilms.sort((a, b) => {
          const oa = a.order ?? Number.MAX_SAFE_INTEGER;
          const ob = b.order ?? Number.MAX_SAFE_INTEGER;
          return oa - ob;
        });

        setFilms(mappedFilms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
                    setLoading(false);
      }
    };

    fetchFilms();
  }, []);

  return { films, loading, error };
}
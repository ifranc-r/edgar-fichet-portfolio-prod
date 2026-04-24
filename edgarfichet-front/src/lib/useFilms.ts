import { useEffect, useState } from 'react';

export interface Film {
  id: number;
  title: string;
  year: number | null;
  director: string;
  role: string;
  poster: string;
  order?: number | null;
  synopsis?: string;
  category?: string;
}

type WPFilm = {
  id: number;
  title: { rendered: string };
  acf?: {
    realisateur?: string;
    poste?: string;
    annee?: string | number;
    image?: number | string;
    order?: string | number;
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
        // Récupérer les 5 post types via le bon chemin REST API
        const postTypes = ['film_film', 'film_pub', 'film_clip', 'film_theatre', 'film_coursmetrage'];
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
            let posterUrl = '';

            // Handle image - could be a URL string or numeric ID
            if (typeof acf.image === 'string' && acf.image.startsWith('http')) {
              // Direct URL from ACF
              posterUrl = acf.image;
            } else if (typeof acf.image === 'number' && acf.image > 0) {
              // Numeric ID - fetch media details
              try {
                const mediaRes = await fetch(
                  `/wp/?rest_route=/wp/v2/media/${acf.image}`
                );

                if (!mediaRes.ok) {
                  console.warn(
                    `Media fetch failed for film ${film.id}, image ${acf.image}: ${mediaRes.status}`
                  );
                } else {
                  const mediaData = (await mediaRes.json()) as WPMedia;
                  posterUrl = mediaData.source_url ?? '';
                }
              } catch (err) {
                console.warn(
                  `Failed to fetch poster for film ${film.id}, image ${acf.image}`,
                  err
                );
              }
            } else {
              console.warn(`Film ${film.id} has no valid image`, acf.image);
            }

            return {
              id: film.id,
              title: film.title?.rendered ?? 'Untitled',
              year:
                acf.annee !== undefined && acf.annee !== null
                  ? Number(acf.annee)
                  : null,
              director: acf.realisateur ?? '',
              role: acf.poste ?? '',
              poster: posterUrl,
              order: acf.order !== undefined && acf.order !== null ? Number(acf.order) : null,
              synopsis: acf.synopsis ?? '',
              category: acf.category ?? 'Film',
            };
          })
        );

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
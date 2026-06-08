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
  url?: string;
  prod?: string;
  gallery?: string[];
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
    image_popup_1?: number | string;
    image_popup_2?: number | string;
    image_popup_3?: number | string;
    image_popup_4?: number | string;
    image_popup_5?: number | string;
    order?: string | number;
    titre_film?: string;
    synopsis?: string;
    category?: string;
    url?: string;
    prod?: string;
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
        console.log(`Fetched ${wpFilms.length} films from API`, wpFilms);
        const mappedFilms = await Promise.all(
          wpFilms.map(async (film) => {
            const acf = film.acf ?? {};

                // Helper to resolve an ACF media field which may be:
                // - a full URL string
                // - a numeric ID (number)
                // - a numeric ID as a string ("123")
                async function resolveMediaField(value: any) {
                  if (value === null || value === undefined || value === '') return '';

                  // 1) URL string (absolute or relative)
                  if (typeof value === 'string') {
                    if (value.startsWith('http://') || value.startsWith('https://')) return value;
                    if (value.startsWith('/')) return `${window.location.origin}${value}`;
                  }

                  // 2) ACF image object (prod case)
                  if (typeof value === 'object') {
                    if (typeof value.source_url === 'string' && value.source_url) return value.source_url;
                    if (typeof value.url === 'string' && value.url) return value.url;

                    const objectId = value.ID ?? value.id;
                    if (objectId) value = objectId;
                  }

                  // 3) Numeric ID (number or numeric string)
                  const maybeNumber = typeof value === 'number' ? value : parseInt(String(value), 10);
                  if (!Number.isNaN(maybeNumber) && maybeNumber > 0) {
                    try {
                      const mediaRes = await fetch(`/wp/?rest_route=/wp/v2/media/${maybeNumber}`);
                      if (!mediaRes.ok) return '';
                      const mediaData = await mediaRes.json();
                      return mediaData?.source_url ?? '';
                    } catch {
                      return '';
                    }
                  }

                  return '';
                }

                const posterUrl = await resolveMediaField(acf.image);
                const presentationUrl = await resolveMediaField(acf.image_presentation);
                const popupGallery = (
                  await Promise.all([
                    resolveMediaField(acf.image_popup_1),
                    resolveMediaField(acf.image_popup_2),
                    resolveMediaField(acf.image_popup_3),
                    resolveMediaField(acf.image_popup_4),
                    resolveMediaField(acf.image_popup_5),
                  ])
                ).filter(Boolean);
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
              url: acf.url ?? '',
              prod: acf.prod ?? '',
              gallery: popupGallery,
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
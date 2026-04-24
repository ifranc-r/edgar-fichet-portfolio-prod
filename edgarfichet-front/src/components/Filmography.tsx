import type { Film } from "../lib/useFilms";
import { useFilms } from "../lib/useFilms";
import "../styles/filmography.css";
import "../styles/categories.css";
import { useState } from "react";
import { useEffect, useRef } from "react";
import { enterPoster, movePoster, leavePoster } from "../animations/posterHover";

// Ordre des catégories pour l'affichage
const CATEGORY_ORDER = ["Film", "Publicité", "Clip", "Théâtre", "Cours-Métrage"];

export default function Filmography() {
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  const { films, error } = useFilms();
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Grouper les films par catégorie
  const filmsByCategory = films.reduce((acc, film) => {
    const category = film.category || "Film";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(film);
    return acc;
  }, {} as Record<string, typeof films>);

  // Trier les catégories selon l'ordre défini
  const sortedCategories = Object.keys(filmsByCategory).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  );

  const startedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  function start() {
    if (startedRef.current) return; // évite double déclenchement
    startedRef.current = true;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    smoothScrollTo(listRef.current, 3000); // durée réglable
  }

  function onEnter(filmId: number, el: HTMLElement) {
    setHoveredId(filmId);
    (window as any).__HOVER_POSTERS__?.enter?.(filmId, el);
  }

  function onLeave() {
    setHoveredId(null);
    (window as any).__HOVER_POSTERS__?.leave?.();
  }

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    const titleEl = e.currentTarget;
    const titleRect = titleEl.getBoundingClientRect();
    const topPosition = titleRect.top + window.scrollY;
    (window as any).__HOVER_POSTERS__?.move?.(topPosition);
  }

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      start();
    }, 3000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);
  
  return (
    <main className="page">
      <HoverPosters hoveredId={hoveredId} films={films} />

      <section className="intro" onClick={start} role="button" tabIndex={0}
        onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") start();
        }}
      >
        <div className="introCenter">
          <div className="introName">EDGAR FICHET</div>
          <div className="introRole">.chef.costumier.</div>
        </div>
        <div className="introLine" />
      </section>

      <div className="wrap">
        {error ? <p className="error">{error}</p> : null}

        <section ref={listRef} id="film-list" className="list">
          {sortedCategories.map((category) => (
            <div key={category} className="category-section">
              <h2 className="category-title">{category}</h2>
              <div className="category-films">
                {filmsByCategory[category].map((film) => {
                  const isHover = hoveredId === film.id;

                  return (
                    <article
                      key={film.id}
                      className={`item ${isHover ? "isHover" : ""}`}
                      onMouseLeave={() => onLeave()}
                    >
                      <h3
                        className="title"
                        onMouseEnter={(e) => onEnter(film.id, e.currentTarget)}
                        onMouseMove={onMouseMove}
                      >
                        {film.title}
                      </h3>

                      <div className="meta">
                        <span className="metaDefault">
                          by {film.director ?? "—"}
                        </span>
                        <span className="metaHover">
                          {film.year ? <span>{film.year}</span> : null}
                          {film.role ? <span> — {film.role}</span> : null}
                          {film.director ? <span> — Réalisé par [{film.director}]</span> : null}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

/**
 * HoverPosters component - Renders the animated poster overlay
 */
function HoverPosters({ hoveredId, films }: { hoveredId: number | null; films: Film[] }) {
  useEffect(() => {
    // Expose animation functions to window for global access
    (window as any).__HOVER_POSTERS__ = {
      enter: (filmId: number, titleEl: HTMLElement) => {
        const film = films.find(f => f.id === filmId);
        if (!film || !film.poster) return;

        const titleRect = titleEl.getBoundingClientRect();
        const topPosition = titleRect.top + window.scrollY;

        enterPoster(filmId, film.poster, topPosition);
      },
      leave: () => {
        if (hoveredId) {
          leavePoster(hoveredId);
        }
      },
      move: (top: number) => {
        if (hoveredId) {
          movePoster(hoveredId, top);
        }
      },
    };

    return () => {
      (window as any).__HOVER_POSTERS__ = null;
    };
  }, [films, hoveredId]);

  return (
    <div
      className="hoverPoster"
      style={{
        position: "fixed",
        top: "0",
        left: "0",
        width: "auto",
        height: "auto",
        opacity: "0",
        pointerEvents: "none",
        zIndex: "50",
      }}
    >
      <img
        src=""
        alt="Film poster"
        style={{
          width: "250px",
          height: "auto",
          objectFit: "cover",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}

function smoothScrollTo(element: HTMLElement | null, duration = 2000) {
  if (!element) return;

  const start = window.scrollY;
  const target = element.getBoundingClientRect().top + window.scrollY;
  const distance = target - start - 160;
  const startTime = performance.now();

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // easing très doux
    const ease = 1 - Math.pow(1 - progress, 3);

    window.scrollTo(0, start + distance * ease);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}
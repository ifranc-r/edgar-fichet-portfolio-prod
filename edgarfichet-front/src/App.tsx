import { useEffect, useRef, useState } from 'react';
import { useFilms } from './lib/useFilms';
import { enterPoster, movePoster, leavePoster, setPosterContainer } from './animations/posterHover';
import { initializeIntroAnimations, cleanupIntroAnimations } from './animations/introAnimation';

export default function App() {
  const { films, error } = useFilms();
  const [activeItemId, setActiveItemId] = useState<string | number | null>(null);
  const [selectedFilm, setSelectedFilm] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const posterContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const introRef = useRef<HTMLDivElement>(null);
  const introNameRef = useRef<HTMLHeadingElement>(null);
  const introCenterRef = useRef<HTMLDivElement>(null);
  const filmographyRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);

  // Sort films by order, then by year for films without order
  const sortedFilms = [...films].sort((a: any, b: any) => {
    // Check if films have valid order (not null, not undefined, not 0)
    const aHasOrder = a.order && a.order > 0;
    const bHasOrder = b.order && b.order > 0;
    
    // If only a has valid order, a comes first
    if (aHasOrder && !bHasOrder) {
      return -1;
    }
    
    // If only b has valid order, b comes first
    if (bHasOrder && !aHasOrder) {
      return 1;
    }
    
    // If both have valid order, sort by order ascending (1, 2, 3...)
    if (aHasOrder && bHasOrder) {
      return a.order - b.order;
    }
    
    // If neither has valid order, sort by year descending (newest first)
    return (b.year || 0) - (a.year || 0);
  });

  // Group films by category
  const filmsByCategory = sortedFilms.reduce((acc: any, film: any) => {
    const category = film.category || 'films';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(film);
    return acc;
  }, {});

  // Map category values to display labels
  const categoryLabels: { [key: string]: string } = {
    'Film': 'Film',
    'Pub': 'Pub',
    'Clip': 'Clip',
    'Cours-Metrage': 'Cours-Metrage',
    'Théatre': 'Théatre'
  };

  // Define the order of categories to display
  const categoryOrder = ['Film', 'Cours-Metrage', 'Pub', 'Clip', 'Théatre'];
  const orderedCategories = categoryOrder.filter(category => filmsByCategory[category]);

  // Initialize poster container on mount
  useEffect(() => {
    if (posterContainerRef.current) {
      setPosterContainer(posterContainerRef.current);
    }
  }, []);

  // Initialize all intro animations
  useEffect(() => {
    initializeIntroAnimations(
      topbarRef.current,
      introNameRef.current,
      introCenterRef.current,
      introRef.current,
      filmographyRef.current
    );

    return () => cleanupIntroAnimations();
  }, []);

  // Track active category on scroll
  useEffect(() => {
    const categoryRefs = new Map<string, HTMLElement>();
    const categoryElements = document.querySelectorAll('[data-category]');
    
    categoryElements.forEach((el) => {
      const category = el.getAttribute('data-category');
      if (category) {
        categoryRefs.set(category, el as HTMLElement);
      }
    });

    if (categoryRefs.size === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const category = (entry.target as HTMLElement).getAttribute('data-category');
            if (category) {
              setActiveCategory(category);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    categoryElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [orderedCategories]);

  const handleMouseEnter = (film: any, itemEl: HTMLElement) => {
    setActiveItemId(film.id);
    itemEl.classList.add('isHover');

    const rect = itemEl.getBoundingClientRect();
    const top = rect.top + rect.height / 2;

    enterPoster(film.id, film.poster, top);
  };

  const handleMouseLeave = (film: any, itemEl: HTMLElement) => {
    itemEl.classList.remove('isHover');
    setActiveItemId(null);
    leavePoster(film.id);
  };

  useEffect(() => {
    if (!activeItemId) return;

    const itemEl = itemRefs.current[activeItemId];
    if (!itemEl) return;

    const handleScroll = () => {
      const rect = itemEl.getBoundingClientRect();
      const top = rect.top + rect.height / 2;
      movePoster(activeItemId, top);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeItemId]);

  // Scroll to category
  const scrollToCategory = (category: string) => {
    const element = document.querySelector(`[data-category="${category}"]`);
    if (!element) return;
    
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Get category indicator (▲, ◆, or ▼)
  const getCategoryIndicator = (category: string) => {
    if (category === activeCategory) {
      return '◯'; // Catégorie active
    }
    
    const currentIndex = orderedCategories.indexOf(activeCategory || '');
    const categoryIndex = orderedCategories.indexOf(category);
    
    if (categoryIndex < currentIndex) {
      return '/\\'; // Au-dessus
    } else {
      return '\\/'; // En-dessous
    }
  };

  return (
    <div className="page">
      {/* Top Bar */}
      <div className="topbar" ref={topbarRef}>
        <div className="topbarLeft">
          <h2 className="topbarTitle">Edgar Fichet</h2>
        </div>
        <div className="topbarRight">
          <br />
          <p 
            className={`topbarCta ${activeCategory === 'Film' ? 'active' : ''}`}
            onClick={() => scrollToCategory('Film')}
          >
            <span className="topbarCtaText">Films</span> <span className="topbarArrow">{getCategoryIndicator('Film')}</span>
          </p>
          <p 
            className={`topbarCta ${activeCategory === 'Cours-Metrage' ? 'active' : ''}`}
            onClick={() => scrollToCategory('Cours-Metrage')}
          >
            <span className="topbarCtaText">Cours-Metrage</span> <span className="topbarArrow">{getCategoryIndicator('Cours-Metrage')}</span>
          </p>
          <p 
            className={`topbarCta ${activeCategory === 'Pub' ? 'active' : ''}`}
            onClick={() => scrollToCategory('Pub')}
          >
            <span className="topbarCtaText">Publicites</span> <span className="topbarArrow">{getCategoryIndicator('Pub')}</span>
          </p>
          <p 
            className={`topbarCta ${activeCategory === 'Clip' ? 'active' : ''}`}
            onClick={() => scrollToCategory('Clip')}
          >
            <span className="topbarCtaText">Clips</span> <span className="topbarArrow">{getCategoryIndicator('Clip')}</span>
          </p>
          <p 
            className={`topbarCta ${activeCategory === 'Théatre' ? 'active' : ''}`}
            onClick={() => scrollToCategory('Théatre')}
          >
            <span className="topbarCtaText">Théatre</span> <span className="topbarArrow">{getCategoryIndicator('Théatre')}</span>
          </p>
        </div>
      </div>

      {/* Intro Section */}
      <section className="intro" ref={introRef}>
        <div className="introCenter" ref={introCenterRef}>
          <h1 className="introName" ref={introNameRef}>Edgar Fichet</h1>
          <p className="introRole">.Chef.Costumier.</p>
        </div>
        <div className="introLine" />
      </section>

      {/* Filmography Section */}
      <section className="page filmography" ref={filmographyRef}>
        <div className="wrap">

          {error && <div className="error">{error}</div>}

          {orderedCategories.map((category) => (
            <div key={category} data-category={category}>
              <h2 className="filmTypeTitle">{categoryLabels[category]}</h2>
              <div className="list">
                {filmsByCategory[category].map((film: any) => (
                  <div
                    key={film.id}
                    className="item"
                    ref={(el) => {
                      if (el) itemRefs.current[film.id] = el;
                    }}
                    onMouseEnter={() => handleMouseEnter(film, itemRefs.current[film.id]!)}
                    onMouseLeave={() => handleMouseLeave(film, itemRefs.current[film.id]!)}
                  >
                    <h3 className="title" onClick={() => setSelectedFilm(film)}>{film.title}</h3>
                    <div className="meta">
                      <span className="metaDefault">{film.director} •  {film.year}</span>
                      <span className="metaHover">
                      [{film.role}] •  {film.year} • by {film.director}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Global Poster Overlay */}
      <div 
        className="posterOverlay" 
        ref={posterContainerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 50,
        }}
      />

      {/* Film Details Popup */}
      {selectedFilm && (
        <>
          <div className="popupBackdrop" onClick={() => setSelectedFilm(null)} />
          <div className="filmPopup">
            <button className="popupClose" onClick={() => setSelectedFilm(null)}>✕</button>
            <div className="popupContainer">
              <div className="popupImage">
                {selectedFilm.poster && (
                  <img src={selectedFilm.poster} alt={selectedFilm.title} />
                )}
              </div>
              <div className="popupContent">
                <h2>{selectedFilm.title}</h2>
                {selectedFilm.synopsis && (
                  <div className="popupDescription">
                    <strong>synopsis :</strong>
                    <p>{selectedFilm.synopsis}</p>
                  </div>
                )}
                <div className="popupFooter">
                  <p><strong>poste: </strong>{selectedFilm.role}</p>
                  <p><strong>annee: </strong>{selectedFilm.year}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
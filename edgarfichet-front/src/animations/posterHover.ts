import gsap from 'gsap';

/* ============================================
   ANIMATION SETTINGS
   Adjust these values to tweak the animation
   ============================================ */

const TOP_OFFSET = -150;  // Négatif = remonte, positif = descend
   // Position settings
const START_X = -35; // Far left (off-screen)
const END_X = 150;    // Far right (off-screen)

// Animation timing
const ANIMATION_DURATION = 0.9; // Total animation time in seconds (customizable)

// Rotation settings
const ROTATION_RANGE = { min: -40, max: -30 }; // Random start rotation
const ROTATION_SHIFT = 100; // Total rotation change from start to end

// Slowdown settings (hover effect)
const SLOWDOWN_START = 0.33;       // Commence ralentissement progressif à 33%
const SLOWDOWN_CHECKPOINT = 0.43;  // Point où la vitesse minimale est atteinte
const SLOWDOWN_SPEED = 0.005;      // Vitesse minimale (bullet time)
const SPEEDUP_ZONE = 0.04;         // Zone de transition inverse (7% après fin d'hover)

// Easing
const ANIMATION_EASING = 'power1.inOut';
const MOVE_EASING = 'power1.out';

const ENTER_SCALE = 0.98;
const ENTER_BLUR = 0;

/* ============================================
   ANIMATION STATE
   Track individual poster animations
   ============================================ */

interface PosterInstance {
  element: HTMLElement;
  tween: gsap.core.Tween | null;
  isHovering: boolean;
  startRotation: number;
  endRotation: number;
  slowdownActive: boolean;
  filmId: string | number;
  hoverExitProgress: number | null;  // Track progress when hover ends
}

// List of all active poster instances (allows multiple animations per film)
let activePosterInstances: PosterInstance[] = [];

// Container reference for creating poster elements
let posterContainerRef: HTMLElement | null = null;

/* ============================================
   INTERNAL HELPERS
   ============================================ */

/**
 * Create a new poster DOM element
 */
function createPosterElement(): HTMLElement {
  const posterCard = document.createElement('div');
  posterCard.className = 'posterCard';
  posterCard.style.position = 'fixed';
  posterCard.style.opacity = '0';
  posterCard.style.top = '0';
  posterCard.style.left = '0';
  posterCard.style.pointerEvents = 'none';
  posterCard.style.transformOrigin = 'center center'; 
  posterCard.style.zIndex = '50';

  const img = document.createElement('img');
  img.className = 'posterImg';
  img.style.width = '350px';
  img.style.height = 'auto';
  img.style.objectFit = 'cover';
  img.alt = 'film poster';

  posterCard.appendChild(img);

  if (posterContainerRef) {
    posterContainerRef.appendChild(posterCard);
  } else {
    document.body.appendChild(posterCard);
  }

  console.log('Created poster element for container:', posterContainerRef ? 'exists' : 'body');

  return posterCard;
}

/**
 * Stop animation and cleanup poster
 */
function cleanupPoster(instance: PosterInstance) {
  instance.tween?.kill();
  instance.element.remove();
  activePosterInstances = activePosterInstances.filter(p => p !== instance);
}

/* ============================================
   PUBLIC API
   ============================================ */

/**
 * Set the container where poster elements will be created
 */
export function setPosterContainer(container: HTMLElement) {
  posterContainerRef = container;
  console.log('Poster container set:', container);
}

/**
 * Start poster animation when hovering a film
 */
export function enterPoster(
  filmId: string | number,
  imageUrl: string,
  top: number
) {
  console.log('enterPoster called:', filmId, imageUrl, top);

  // Limit to 3 animations max - remove oldest if we exceed the limit
  if (activePosterInstances.length >= 3) {
    console.log('Max animations reached (3), removing oldest animation...');
    cleanupPoster(activePosterInstances[0]);
  }

  // Create new poster element for this film
  const posterEl = createPosterElement();
  const img = posterEl.querySelector('img') as HTMLImageElement;
  if (img) {
    img.src = imageUrl;
  }

  posterEl.style.opacity = '1';
  posterEl.style.top = `${top + TOP_OFFSET}px`;

  // Random start rotation
  const startRotation =
    ROTATION_RANGE.min +
    Math.random() * (ROTATION_RANGE.max - ROTATION_RANGE.min);

  const endRotation = startRotation + ROTATION_SHIFT;

  const instance: PosterInstance = {
    element: posterEl,
    tween: null,
    isHovering: true,
    startRotation,
    endRotation,
    slowdownActive: false,
    filmId,
    hoverExitProgress: null,
  };

  activePosterInstances.push(instance);
  console.log('Poster instance created for film:', filmId, '- Total animations:', activePosterInstances.length);

  // Single continuous animation from START_X to END_X
  instance.tween = gsap.fromTo(
    posterEl,
    {
      x: `${START_X}vw`,
      rotation: startRotation,
      scale: ENTER_SCALE,
      filter: `blur(${ENTER_BLUR}px)`,
    },
    {
      x: `${END_X}vw`,
      rotation: endRotation,
      scale: 1,
      filter: 'blur(0px)',
      duration: ANIMATION_DURATION,
      ease: ANIMATION_EASING,
      onUpdate: () => {
        if (!instance.tween) return;
        
        const progress = instance.tween.progress();
        
        // PENDANT le hover : ralentissement progressif
        if (instance.isHovering) {
          // Zone de transition progressive entre SLOWDOWN_START et SLOWDOWN_CHECKPOINT
          if (progress >= SLOWDOWN_START && progress < SLOWDOWN_CHECKPOINT) {
            // Interpolation progressive : 1 (normal) → SLOWDOWN_SPEED (slow)
            const relativeProgress = (progress - SLOWDOWN_START) / (SLOWDOWN_CHECKPOINT - SLOWDOWN_START);
            const currentSpeed = gsap.utils.interpolate(1, SLOWDOWN_SPEED, relativeProgress);
            instance.tween.timeScale(currentSpeed);
          } 
          // Une fois passé le checkpoint, maintenir la vitesse minimale
          else if (progress >= SLOWDOWN_CHECKPOINT) {
            if (!instance.slowdownActive) {
              instance.slowdownActive = true;
              console.log(`Full slowdown reached at progress: ${progress}`);
            }
            instance.tween.timeScale(SLOWDOWN_SPEED);
          }
        } 
        // APRES le hover : accélération progressive (inverse)
        else if (instance.hoverExitProgress !== null) {
          const exitProgress = instance.hoverExitProgress;
          const speedupEnd = exitProgress + SPEEDUP_ZONE;
          
          // Zone de transition progressive inverse : SLOWDOWN_SPEED → 1 (normal)
          if (progress >= exitProgress && progress < speedupEnd) {
            // Interpolation progressive inverse
            const relativeProgress = (progress - exitProgress) / SPEEDUP_ZONE;
            const currentSpeed = gsap.utils.interpolate(SLOWDOWN_SPEED, 1, relativeProgress);
            instance.tween.timeScale(currentSpeed);
          }
          // Une fois passé la zone, vitesse normale
          else if (progress >= speedupEnd) {
            instance.tween.timeScale(1);
            instance.hoverExitProgress = null; // Cleanup
          }
        }
      },
      onComplete: () => {
        // Immediately cleanup without fade out
        cleanupPoster(instance);
      },
    }
  );
}

/**
 * Move poster vertically to follow hovered title
 */
export function movePoster(filmId: string | number, top: number) {
  // Move all active posters for this film
  const instances = activePosterInstances.filter(p => p.filmId === filmId);
  instances.forEach(instance => {
    gsap.to(instance.element, {
      top: `${top}px`,
      duration: 0.3,
      ease: MOVE_EASING,
      overwrite: 'auto',
    });
  });
}

/**
 * Handle hover end - progressively speed up animation back to normal
 */
export function leavePoster(filmId: string | number) {
  // Update all active posters for this film
  const instances = activePosterInstances.filter(p => p.filmId === filmId);
  instances.forEach(instance => {
    if (!instance.tween) return;
    
    instance.isHovering = false;
    // Store the progress at which hover ends
    instance.hoverExitProgress = instance.tween.progress();
    
    // Reset slowdown active flag to allow new transitions
    instance.slowdownActive = false;
  });
}
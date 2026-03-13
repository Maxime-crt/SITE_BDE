import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

// === CLOUDINARY CONFIG ===
const CLOUD_NAME = 'dk93ledz2';

// f_auto → WebP/AVIF, q_auto:low → aggressive compression for thumbnails
const CACHE_VERSION = 2; // bump to force CDN cache refresh after replacing an image
function cloudUrl(publicId: string, width: number, quality = 'auto') {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_${quality},w_${width}/v${CACHE_VERSION}/${publicId}`;
}

const HERO_IMAGE = {
  id: 'hero',
  publicId: 'gallery/Photo_Liste_Fuelers_pbu5ry.png',
  alt: 'Photo Liste Fuelers',
  type: 'hero' as const,
};

const LANDSCAPE_IMAGES = [
  { id: 'land-0', publicId: 'gallery/image3_o2j1gv.jpg', alt: 'Fuelers paysage 1' },
  { id: 'land-1', publicId: 'gallery/image16_zrtj5e.jpg', alt: 'Fuelers paysage 2' },
  { id: 'land-2', publicId: 'gallery/image2_somuya.jpg', alt: 'Fuelers paysage 3' },
  { id: 'land-3', publicId: 'gallery/image1_gpl2ak.jpg', alt: 'Fuelers paysage 4' },
  { id: 'land-4', publicId: 'gallery/image15_utrler.jpg', alt: 'Fuelers paysage 5' },
].map(img => ({ ...img, type: 'landscape' as const }));

const PORTRAIT_IMAGES = [
  { id: 'port-0', publicId: 'gallery/image5_eccxpt.jpg', alt: 'Fuelers portrait 1' },
  { id: 'port-1', publicId: 'gallery/image4_pcgi9y.jpg', alt: 'Fuelers portrait 2' },
  { id: 'port-2', publicId: 'gallery/image13_eqzwds.jpg', alt: 'Fuelers portrait 3' },
  { id: 'port-3', publicId: 'gallery/image19_qjd5n0.jpg', alt: 'Fuelers portrait 4' },
  { id: 'port-4', publicId: 'gallery/image17_tncw5n.jpg', alt: 'Fuelers portrait 5' },
  { id: 'port-5', publicId: 'gallery/image18_rq1iug.jpg', alt: 'Fuelers portrait 6' },
  { id: 'port-6', publicId: 'gallery/image12_qfrs82.jpg', alt: 'Fuelers portrait 7' },
  { id: 'port-7', publicId: 'gallery/image14_nznai5.jpg', alt: 'Fuelers portrait 8' },
  { id: 'port-8', publicId: 'gallery/image7_ggdz6m.jpg', alt: 'Fuelers portrait 9' },
  { id: 'port-9', publicId: 'gallery/image8_hmk3h1.jpg', alt: 'Fuelers portrait 10' },
  { id: 'port-10', publicId: 'gallery/image9_orzhtl.jpg', alt: 'Fuelers portrait 11' },
  { id: 'port-11', publicId: 'gallery/image11_aw32yc.jpg', alt: 'Fuelers portrait 12' },
  { id: 'port-12', publicId: 'gallery/image10_baqxgh.jpg', alt: 'Fuelers portrait 13' },
  { id: 'port-13', publicId: 'gallery/image6_ge7vfr.jpg', alt: 'Fuelers portrait 14' },
].map(img => ({ ...img, type: 'portrait' as const }));

const ALL_IMAGES = [HERO_IMAGE, ...LANDSCAPE_IMAGES, ...PORTRAIT_IMAGES];

// Hook: drag-to-scroll + auto-scroll
function useDragScroll(speed: number, direction: 'left' | 'right') {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const hasMoved = useRef(false);
  const userInteracting = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Infinite scroll: content is [A][A][A] (3 copies). We keep scroll
  // position in the middle copy [A]. When it drifts into the first or
  // last copy we silently jump back to the equivalent position in the middle.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let animId: number;
    let accumulator = 0;
    let lastTime = 0;
    let initialized = false;

    const step = (now: number) => {
      if (!initialized) {
        initialized = true;
        lastTime = now;
        // Start in the middle third
        const oneThird = el.scrollWidth / 3;
        el.scrollLeft = direction === 'right'
          ? oneThird + (oneThird - el.clientWidth) // end of middle section
          : oneThird; // start of middle section
        animId = requestAnimationFrame(step);
        return;
      }

      const dt = now - lastTime;
      lastTime = now;

      if (!userInteracting.current) {
        accumulator += speed * (dt / 1000);
        const move = Math.floor(accumulator);
        if (move >= 1) {
          accumulator -= move;
          el.scrollLeft += direction === 'left' ? move : -move;
        }
      }

      // Seamless loop: jump back to middle third when drifting out
      const oneThird = el.scrollWidth / 3;
      if (el.scrollLeft >= oneThird * 2) {
        el.scrollLeft -= oneThird;
      } else if (el.scrollLeft <= 0) {
        el.scrollLeft += oneThird;
      }

      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [speed, direction]);

  const pauseAutoScroll = useCallback(() => {
    userInteracting.current = true;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { userInteracting.current = false; }, 3000);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.clientX;
    scrollStart.current = el.scrollLeft;
    pauseAutoScroll();
  }, [pauseAutoScroll]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !ref.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 5) hasMoved.current = true;
    ref.current.scrollLeft = scrollStart.current - dx;
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const shouldPreventClick = useCallback(() => hasMoved.current, []);

  return { ref, onPointerDown, onPointerMove, onPointerUp, shouldPreventClick };
}


export default function PhotoGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (globalIndex: number) => setLightboxIndex(globalIndex);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goTo = useCallback((dir: -1 | 1) => {
    setLightboxIndex((prev: number | null) => {
      if (prev === null) return null;
      return (prev + dir + ALL_IMAGES.length) % ALL_IMAGES.length;
    });
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goTo(-1);
      if (e.key === 'ArrowRight') goTo(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, closeLightbox, goTo]);

  // 3x duplication for seamless infinite loop (scroll stays in middle third)
  const landscapeDup = [...LANDSCAPE_IMAGES, ...LANDSCAPE_IMAGES, ...LANDSCAPE_IMAGES];
  const portraitDup = [...PORTRAIT_IMAGES, ...PORTRAIT_IMAGES, ...PORTRAIT_IMAGES];

  const landscapeOffset = 1;
  const portraitOffset = 1 + LANDSCAPE_IMAGES.length;

  const landscapeScroll = useDragScroll(30, 'left');
  const portraitScroll = useDragScroll(25, 'right');

  const getLightboxSrc = (index: number) => {
    const img = ALL_IMAGES[index];
    if (img.type === 'hero') return cloudUrl(img.publicId, 1920);
    if (img.type === 'landscape') return cloudUrl(img.publicId, 1280);
    return cloudUrl(img.publicId, 800);
  };

  return (
    <section className="mb-12 space-y-6 overflow-hidden">
      {/* Hero banner — explicit dimensions to prevent CLS */}
      <div
        className="relative w-full rounded-2xl overflow-hidden cursor-pointer group shadow-2xl"
        style={{ aspectRatio: '16/9' }}
        onClick={() => openLightbox(0)}
      >
        <img
          src={cloudUrl(HERO_IMAGE.publicId, 800, 'auto:low')}
          srcSet={`${cloudUrl(HERO_IMAGE.publicId, 480, 'auto:low')} 480w, ${cloudUrl(HERO_IMAGE.publicId, 800, 'auto:low')} 800w, ${cloudUrl(HERO_IMAGE.publicId, 1200)} 1200w`}
          sizes="(max-width: 480px) 480px, (max-width: 800px) 800px, 1200px"
          alt={HERO_IMAGE.alt}
          width={1200}
          height={675}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          {...{ fetchpriority: 'high' } as React.ImgHTMLAttributes<HTMLImageElement>}
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-sm font-medium drop-shadow-lg">Cliquez pour agrandir</p>
        </div>
      </div>

      {/* Row 1 — Paysages */}
      <div
        ref={landscapeScroll.ref}
        className="flex gap-4 overflow-x-hidden cursor-grab active:cursor-grabbing select-none"
        onPointerDown={landscapeScroll.onPointerDown}
        onPointerMove={landscapeScroll.onPointerMove}
        onPointerUp={landscapeScroll.onPointerUp}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {landscapeDup.map((img, i) => (
          <div
            key={`land-${i}`}
            className="flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group shadow-lg"
            style={{ width: 288, height: 192 }}
            onClick={() => {
              if (!landscapeScroll.shouldPreventClick()) {
                openLightbox(landscapeOffset + (i % LANDSCAPE_IMAGES.length));
              }
            }}
          >
            <img
              src={cloudUrl(img.publicId, 384, 'auto:low')}
              alt={img.alt}
              width={288}
              height={192}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 pointer-events-none"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Row 2 — Portraits */}
      <div
        ref={portraitScroll.ref}
        className="flex gap-4 overflow-x-hidden cursor-grab active:cursor-grabbing select-none"
        onPointerDown={portraitScroll.onPointerDown}
        onPointerMove={portraitScroll.onPointerMove}
        onPointerUp={portraitScroll.onPointerUp}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {portraitDup.map((img, i) => (
          <div
            key={`port-${i}`}
            className="flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group shadow-lg"
            style={{ width: 160, height: 240 }}
            onClick={() => {
              if (!portraitScroll.shouldPreventClick()) {
                openLightbox(portraitOffset + (i % PORTRAIT_IMAGES.length));
              }
            }}
          >
            <img
              src={cloudUrl(img.publicId, 240, 'auto:low')}
              alt={img.alt}
              width={160}
              height={240}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 pointer-events-none"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-50 p-2"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); goTo(-1); }}
            className="absolute left-4 text-white/80 hover:text-white z-50 p-2"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          <img
            src={getLightboxSrc(lightboxIndex)}
            alt={ALL_IMAGES[lightboxIndex].alt}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => { e.stopPropagation(); goTo(1); }}
            className="absolute right-4 text-white/80 hover:text-white z-50 p-2"
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {ALL_IMAGES.length}
          </div>
        </div>
      )}
    </section>
  );
}

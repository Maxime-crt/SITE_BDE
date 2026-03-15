import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, ArrowRight, Car, Clock, ChevronLeft, ChevronRight, Euro, Shield, Plus } from 'lucide-react';
import { eventsApi } from '../services/api';
import type { Event } from '../types';
import logoFLR from '../assets/Logo_FLR.png';
import LandingNav from '../components/LandingNav';

// ── Cloudinary ──────────────────────────────────────────────
const CLOUD = 'dk93ledz2';
function cloudUrl(publicId: string, w: number, format?: string) {
  const f = format || 'auto';
  return `https://res.cloudinary.com/${CLOUD}/image/upload/f_${f},q_auto,w_${w}/v2/${publicId}`;
}

// ── Gallery images ──────────────────────────────────────────
const HERO_IMAGE = 'gallery/Photo_Liste_Fuelers_pbu5ry.png';

const LANDSCAPE_IMAGES = [
  'gallery/image3_o2j1gv.jpg',
  'gallery/image16_zrtj5e.jpg',
  'gallery/image2_somuya.jpg',
  'gallery/image1_gpl2ak.jpg',
  'gallery/image15_utrler.jpg',
];

const PORTRAIT_IMAGES = [
  'gallery/image5_eccxpt.jpg',
  'gallery/image4_pcgi9y.jpg',
  'gallery/image13_eqzwds.jpg',
  'gallery/image19_qjd5n0.jpg',
  'gallery/image17_tncw5n.jpg',
  'gallery/image18_rq1iug.jpg',
  'gallery/image12_qfrs82.jpg',
  'gallery/image14_nznai5.jpg',
  'gallery/image7_ggdz6m.jpg',
  'gallery/image8_hmk3h1.jpg',
];

// ── Association logos ────────────────────────────────────────
const ASSO_LOGOS: Record<string, string> = {
  'Fuelers': 'Logo-Assos/Logo_FLR_nuoqmd.jpg',
  'Art Breakers': 'Logo-Assos/LAB_n9b5sr.jpg',
  "Scare'pions": 'Logo-Assos/SP_nwoqtw.jpg',
  "Gold'n'Grizz": 'Logo-Assos/GNG_ugio23.jpg',
  "Spotl'eye't": 'Logo-Assos/SET_sfembi.jpg',
  "Cash in S'eye'ght": 'Logo-Assos/CIS_frfhly.jpg',
};

// ── Drag-to-scroll + auto-scroll hook ───────────────────────
const ALL_GALLERY = [...LANDSCAPE_IMAGES, ...PORTRAIT_IMAGES];

function useDragScroll(speed: number, direction: 'left' | 'right', onTap?: (target: HTMLElement) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const hasMoved = useRef(false);
  const userInteracting = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();
  const downTarget = useRef<HTMLElement | null>(null);

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
        const oneThird = el.scrollWidth / 3;
        el.scrollLeft = direction === 'right'
          ? oneThird + (oneThird - el.clientWidth)
          : oneThird;
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
      const oneThird = el.scrollWidth / 3;
      if (el.scrollLeft >= oneThird * 2) el.scrollLeft -= oneThird;
      else if (el.scrollLeft <= 0) el.scrollLeft += oneThird;
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
    el.setPointerCapture(e.pointerId);
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.clientX;
    scrollStart.current = el.scrollLeft;
    downTarget.current = e.target as HTMLElement;
    pauseAutoScroll();
  }, [pauseAutoScroll]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !ref.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 5) hasMoved.current = true;
    ref.current.scrollLeft = scrollStart.current - dx;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (el) el.releasePointerCapture(e.pointerId);
    isDragging.current = false;
    if (!hasMoved.current && onTap && downTarget.current) {
      // Find the closest clickable container with data-index
      const item = (downTarget.current as HTMLElement).closest('[data-index]') as HTMLElement | null;
      if (item) onTap(item);
    }
    downTarget.current = null;
  }, [onTap]);

  return { ref, onPointerDown, onPointerMove, onPointerUp };
}

// ── Navbar ──────────────────────────────────────────────────
// ── Component ───────────────────────────────────────────────
export default function LandingPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const landscapeScroll = useDragScroll(30, 'left', (el) => {
    const idx = el.getAttribute('data-index');
    if (idx !== null) setLightboxIndex(parseInt(idx) % LANDSCAPE_IMAGES.length);
  });
  const portraitScroll = useDragScroll(25, 'right', (el) => {
    const idx = el.getAttribute('data-index');
    if (idx !== null) setLightboxIndex(LANDSCAPE_IMAGES.length + (parseInt(idx) % PORTRAIT_IMAGES.length));
  });

  useEffect(() => {
    eventsApi.getAll().then((data: Event[]) => setEvents(data)).catch(() => {});
  }, []);

  // Check admin from localStorage
  const isAdmin = useMemo(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u).isAdmin : false;
    } catch { return false; }
  }, []);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const days: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    return days;
  }, [calendarDate]);


  const upcomingEvents = events
    .filter(e => new Date(e.endDate).getTime() + 60 * 60 * 1000 >= Date.now())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  const eventStatus = (startStr: string, endStr: string) => {
    const now = Date.now();
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const msUntilStart = start - now;
    const hoursUntilStart = msUntilStart / (1000 * 60 * 60);
    const diffDays = Math.ceil(msUntilStart / (1000 * 60 * 60 * 24));

    if (now > end + 60 * 60 * 1000) return null; // terminé depuis +1h
    if (now > end) return { label: 'Terminé', color: 'text-red-400' };
    if (now >= start) return { label: 'En cours', color: 'text-green-400' };
    if (hoursUntilStart <= 2) return { label: 'Commence bientôt', color: 'text-yellow-400' };
    if (diffDays === 0) return { label: "Aujourd'hui", color: 'text-white/80' };
    if (diffDays === 1) return { label: 'Demain', color: 'text-white/80' };
    return { label: `Dans ${diffDays} jours`, color: 'text-white/80' };
  };

  return (
    <div className="landing-page font-dm-sans text-white overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  NAVBAR                                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <LandingNav isAdmin={isAdmin} />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HERO SECTION                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
        {/* Background: hero photo */}
        <div className="absolute inset-0">
          <img
            src={cloudUrl(HERO_IMAGE, 1920)}
            alt=""
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1128]/60 via-[#0a1128]/40 to-[#0a1128]" />
        </div>

        {/* Grain */}
        <div className="landing-grain" />

        {/* Blue glow accents */}
        <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-500/6 rounded-full blur-[100px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <div className="landing-fade-up mb-6">
            <img
              src={logoFLR}
              alt="Fuelers"
              className="w-28 h-28 md:w-36 md:h-36 rounded-full mx-auto shadow-2xl shadow-blue-500/30 ring-4 ring-blue-400/20"
            />
          </div>

          <h1 className="landing-fade-up landing-delay-1 font-syne font-extrabold text-5xl sm:text-6xl md:text-8xl lg:text-9xl tracking-tight leading-[0.9] mb-6">
            <span className="block bg-gradient-to-r from-blue-200 via-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-lg">
              FUELERS
            </span>
          </h1>

          <p className="landing-fade-up landing-delay-2 font-syne text-lg sm:text-xl md:text-2xl text-white/70 font-medium tracking-wide mb-4">
            On the road.{' '}
            <span className="text-blue-400">Together.</span>
          </p>

          <p className="landing-fade-up landing-delay-3 text-base sm:text-lg text-white/70 max-w-lg mx-auto mb-12 leading-relaxed">
            Événements et retours partagés entre étudiants.
            Trouve des gens avec qui rentrer, partage les frais, profite à fond.
          </p>

          <div className="landing-fade-up landing-delay-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-syne font-bold text-base sm:text-lg px-8 py-4 rounded-full hover:scale-105 transition-all duration-300 shadow-xl shadow-blue-600/25"
            >
              Voir les événements
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            {isAdmin && (
              <Link
                to="/create-event"
                className="inline-flex items-center gap-2 text-white/60 hover:text-blue-300 font-medium text-sm sm:text-base px-6 py-4 rounded-full border border-white/10 hover:border-blue-400/30 transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                Creer un événement
              </Link>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 landing-fade-up landing-delay-5">
          <div className="w-6 h-10 border-2 border-blue-400/30 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-blue-400/50 rounded-full landing-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  PHOTO MARQUEE                                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-8 bg-[#0a1128]">
        <div className="relative max-w-7xl mx-auto overflow-hidden rounded-3xl">
          {/* Row 1 — landscape, drag + auto-scroll left */}
          <div
            ref={landscapeScroll.ref}
            className="flex gap-4 mb-4 overflow-x-hidden cursor-grab active:cursor-grabbing select-none"
            onPointerDown={landscapeScroll.onPointerDown}
            onPointerMove={landscapeScroll.onPointerMove}
            onPointerUp={landscapeScroll.onPointerUp}
            style={{ scrollbarWidth: 'none' }}
          >
            {[...LANDSCAPE_IMAGES, ...LANDSCAPE_IMAGES, ...LANDSCAPE_IMAGES].map((img, i) => (
              <div
                key={`land-${i}`}
                data-index={i}
                className="flex-shrink-0 w-72 h-44 rounded-2xl overflow-hidden group cursor-pointer"
              >
                <img
                  src={cloudUrl(img, 640)}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none"
                  loading="eager"
                  draggable={false}
                />
              </div>
            ))}
          </div>
          {/* Row 2 — portrait, drag + auto-scroll right */}
          <div
            ref={portraitScroll.ref}
            className="flex gap-4 overflow-x-hidden cursor-grab active:cursor-grabbing select-none"
            onPointerDown={portraitScroll.onPointerDown}
            onPointerMove={portraitScroll.onPointerMove}
            onPointerUp={portraitScroll.onPointerUp}
            style={{ scrollbarWidth: 'none' }}
          >
            {[...PORTRAIT_IMAGES, ...PORTRAIT_IMAGES, ...PORTRAIT_IMAGES].map((img, i) => (
              <div
                key={`port-${i}`}
                data-index={i}
                className="flex-shrink-0 w-36 h-48 rounded-2xl overflow-hidden group cursor-pointer"
              >
                <img
                  src={cloudUrl(img, 400)}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none"
                  loading="eager"
                  draggable={false}
                />
              </div>
            ))}
          </div>
          {/* Edge fades */}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0a1128] to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0a1128] to-transparent pointer-events-none z-10" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  LIGHTBOX                                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-50 p-2"
          >
            <X className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev: number | null) => prev !== null ? (prev - 1 + ALL_GALLERY.length) % ALL_GALLERY.length : null); }}
            className="absolute left-4 text-white/80 hover:text-white z-50 p-2"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <img
            src={cloudUrl(ALL_GALLERY[lightboxIndex], 1280)}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev: number | null) => prev !== null ? (prev + 1) % ALL_GALLERY.length : null); }}
            className="absolute right-4 text-white/80 hover:text-white z-50 p-2"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {ALL_GALLERY.length}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  EVENTS SECTION                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section id="events" className="relative py-24 md:py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1128] via-[#0a1025] to-[#0a1128]" />

        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-16 md:mb-20">
            <div>
              <p className="font-syne text-blue-400 font-bold text-sm tracking-[0.3em] uppercase mb-4">
                Prochainement
              </p>
              <h2 className="font-syne font-extrabold text-4xl sm:text-5xl md:text-7xl tracking-tight text-white">
                Les events
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-300 bg-clip-text text-transparent">
                  qui arrivent.
                </span>
              </h2>
            </div>
            {isAdmin && (
              <Link
                to="/create-event"
                className="hidden md:inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 text-blue-300 hover:bg-blue-600/20 font-syne font-bold text-sm px-5 py-3 rounded-2xl transition-all"
              >
                <Plus className="w-4 h-4" />
                Creer
              </Link>
            )}
          </div>

          <div className="landing-view-transition">
          {!showCalendar ? (
            <div key="cards" className="landing-view-enter">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                {/* Featured event card */}
                {upcomingEvents[0] ? (
                  <Link to={`/events/${upcomingEvents[0].id}`} className="md:col-span-7 group block">
                    <div className="relative h-[380px] md:h-[480px] rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-blue-900/30 border border-blue-500/10 hover:border-blue-400/30 transition-all duration-500">
                      {upcomingEvents[0].imageUrl ? (
                        <>
                          <img src={cloudUrl(upcomingEvents[0].imageUrl, 1200)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1128] via-[#0a1128]/40 to-transparent" />
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1128] via-transparent to-transparent" />
                          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-500/15 to-transparent rounded-full blur-3xl" />
                          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-600/15 to-transparent rounded-full blur-3xl" />
                        </>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-bold tracking-wider uppercase">
                            A venir
                          </span>
                          {(() => {
                            const s = eventStatus(upcomingEvents[0].startDate, upcomingEvents[0].endDate);
                            return s && (
                              <span className={`px-3 py-1 bg-black/40 backdrop-blur-sm rounded-full text-sm flex items-center gap-1.5 ${s.color}`}>
                                <Clock className="w-3.5 h-3.5" />
                                {s.label}
                              </span>
                            );
                          })()}
                        </div>
                        <h3 className="font-syne font-bold text-2xl md:text-4xl text-white mb-3 group-hover:text-blue-200 transition-colors">
                          {upcomingEvents[0].name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-white/50 text-sm">
                          {upcomingEvents[0].location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {upcomingEvents[0].location}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {formatDate(upcomingEvents[0].startDate)}
                          </span>
                          {upcomingEvents[0].capacity > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              {upcomingEvents[0].capacity} places
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="md:col-span-7 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600/10 to-indigo-600/5 border border-dashed border-white/10 h-[380px] md:h-[480px] flex items-center justify-center">
                    <p className="text-white/20 font-syne text-lg">Aucun événement à venir</p>
                  </div>
                )}

                {/* Stacked cards */}
                <div className="md:col-span-5 flex flex-col gap-6 md:gap-8">
                  {upcomingEvents.slice(1, 3).map((event, i) => (
                    <Link to={`/events/${event.id}`} key={event.id} className="group flex-1 block">
                      <div className={`relative h-full min-h-[200px] rounded-3xl overflow-hidden border border-white/5 hover:border-blue-400/20 transition-all duration-500 ${
                        i === 0
                          ? 'bg-gradient-to-br from-indigo-600/15 to-blue-900/20'
                          : 'bg-gradient-to-br from-blue-600/15 to-indigo-900/20'
                      }`}>
                        {event.imageUrl ? (
                          <>
                            <img src={cloudUrl(event.imageUrl, 640)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1128] via-[#0a1128]/50 to-transparent" />
                          </>
                        ) : (
                          <div className={`absolute top-4 right-4 w-32 h-32 rounded-full blur-2xl ${
                            i === 0 ? 'bg-indigo-500/10' : 'bg-blue-500/10'
                          }`} />
                        )}
                        <div className="relative p-8">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border bg-blue-500/20 border-blue-400/30 text-blue-300">
                              {formatDate(event.startDate)}
                            </span>
                            {(() => {
                              const s = eventStatus(event.startDate, event.endDate);
                              return s && (
                                <span className={`px-2 py-0.5 bg-black/40 backdrop-blur-sm rounded-full text-xs flex items-center gap-1 ${s.color}`}>
                                  <Clock className="w-3 h-3" />{s.label}
                                </span>
                              );
                            })()}
                          </div>
                          <h3 className="font-syne font-bold text-xl md:text-2xl text-white mt-2 mb-2 group-hover:text-blue-200 transition-colors">
                            {event.name}
                          </h3>
                          {event.location && (
                            <p className="text-white/50 text-sm flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {upcomingEvents.length < 2 && (
                    <div className="flex-1 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-dashed border-white/10 p-8 flex items-center justify-center min-h-[200px]">
                      <p className="text-white/20 font-syne text-center">D'autres événements arrivent bientôt...</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-16 text-center">
                <button
                  onClick={() => setShowCalendar(true)}
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-syne font-bold text-lg group transition-colors"
                >
                  Voir le calendrier complet
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
          ) : (
            /* ══════ CALENDAR VIEW ══════ */
            <div key="calendar" className="landing-view-enter">
              <button
                onClick={() => setShowCalendar(false)}
                className="mb-8 inline-flex items-center gap-2 text-white/50 hover:text-blue-400 font-syne font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
              </button>

              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                    className="p-2 rounded-xl hover:bg-white/5 text-white/50 hover:text-blue-400 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h3 className="font-syne font-bold text-2xl md:text-3xl text-white">
                    {monthNames[calendarDate.getMonth()]}{' '}
                    <span className="text-blue-400">{calendarDate.getFullYear()}</span>
                  </h3>
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                    className="p-2 rounded-xl hover:bg-white/5 text-white/50 hover:text-blue-400 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden p-4 md:p-6">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(d => (
                      <div key={d} className="text-center text-xs font-syne font-bold text-white/30 uppercase tracking-wider py-2">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, i) => {
                      const isToday = day !== null &&
                        new Date().getDate() === day &&
                        new Date().getMonth() === calendarDate.getMonth() &&
                        new Date().getFullYear() === calendarDate.getFullYear();
                      const dayEvents = day !== null
                        ? events
                            .filter(e => {
                              const d = new Date(e.startDate);
                              return d.getDate() === day && d.getMonth() === calendarDate.getMonth() && d.getFullYear() === calendarDate.getFullYear();
                            })
                            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                        : [];
                      const evtCount = dayEvents.length;
                      const dayAssos = dayEvents
                        .map(e => e.association || 'Fuelers')
                        .filter((a) => !!ASSO_LOGOS[a])
                        .filter((a, idx, arr) => arr.indexOf(a) === idx)
                        .slice(0, 2);

                      return (
                        <div
                          key={i}
                          onClick={() => {
                            if (dayEvents.length > 0) {
                              document.getElementById(`cal-event-${dayEvents[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }}
                          className={`relative aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden ${
                            day === null
                              ? ''
                              : evtCount > 0
                                ? 'text-white border border-blue-400/20 hover:scale-105 cursor-pointer shadow-lg shadow-blue-500/10'
                                : isToday
                                  ? 'bg-white/10 text-white border border-white/20'
                                  : 'text-white/50 hover:bg-white/5 hover:text-white/60'
                          }`}
                        >
                          {evtCount > 0 && dayAssos.length > 0 && (
                            dayAssos.length === 1 ? (
                              <img src={cloudUrl(ASSO_LOGOS[dayAssos[0]], 96, 'png')} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                            ) : (
                              <>
                                <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>
                                  <img src={cloudUrl(ASSO_LOGOS[dayAssos[0]], 96, 'png')} alt="" className="w-full h-full object-cover opacity-30" />
                                </div>
                                <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>
                                  <img src={cloudUrl(ASSO_LOGOS[dayAssos[1]], 96, 'png')} alt="" className="w-full h-full object-cover opacity-30" />
                                </div>
                              </>
                            )
                          )}
                          <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <h4 className="font-syne font-bold text-lg text-white/60 mb-4">
                    Événements en {monthNames[calendarDate.getMonth()]}
                  </h4>
                  {events
                    .filter(e => {
                      const d = new Date(e.startDate);
                      return d.getMonth() === calendarDate.getMonth() && d.getFullYear() === calendarDate.getFullYear();
                    })
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .map(event => (
                      <Link
                        to={`/events/${event.id}`}
                        key={event.id}
                        id={`cal-event-${event.id}`}
                        className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-400/20 hover:bg-blue-500/5 transition-all"
                      >
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-400/20 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-blue-300 font-syne font-bold text-lg leading-none">
                            {new Date(event.startDate).getDate()}
                          </span>
                          <span className="text-blue-400/60 text-[10px] uppercase font-bold">
                            {new Date(event.startDate).toLocaleDateString('fr-FR', { month: 'short' })}
                          </span>
                        </div>
                        {event.association && ASSO_LOGOS[event.association] && (
                          <img
                            src={cloudUrl(ASSO_LOGOS[event.association], 48, 'png')}
                            alt={event.association}
                            className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-syne font-bold text-white group-hover:text-blue-200 transition-colors truncate">
                            {event.name}
                          </h5>
                          {event.location && (
                            <p className="text-white/30 text-sm flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </Link>
                    ))}
                  {events.filter(e => {
                    const d = new Date(e.startDate);
                    return d.getMonth() === calendarDate.getMonth() && d.getFullYear() === calendarDate.getFullYear();
                  }).length === 0 && (
                    <p className="text-white/20 text-center py-8 font-syne">Aucun événement ce mois-ci</p>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  RETOUR PARTAGE SECTION                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1128] via-[#080e20] to-[#0a1128]" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/10 via-transparent to-indigo-950/10" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="font-syne text-blue-400 font-bold text-sm tracking-[0.3em] uppercase mb-4">
                Retour partage
              </p>
              <h2 className="font-syne font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight text-white mb-6">
                Rentre
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-300 bg-clip-text text-transparent">
                  accompagné.
                </span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-md">
                Après chaque soirée, trouve des gens qui rentrent dans la même direction.
                Partagez un trajet, divisez les frais. C'est aussi simple que ca.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mb-3 mx-auto sm:mx-0">
                    <Euro className="w-6 h-6 text-blue-400" />
                  </div>
                  <h4 className="font-syne font-bold text-white text-base mb-1">Moins cher</h4>
                  <p className="text-white/50 text-sm leading-relaxed">Divise le prix du retour</p>
                </div>
                <div className="text-center sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mb-3 mx-auto sm:mx-0">
                    <Shield className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h4 className="font-syne font-bold text-white text-base mb-1">Plus sûr</h4>
                  <p className="text-white/50 text-sm leading-relaxed">Entre étudiants vérifiés</p>
                </div>
                <div className="text-center sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mb-3 mx-auto sm:mx-0">
                    <Car className="w-6 h-6 text-blue-400" />
                  </div>
                  <h4 className="font-syne font-bold text-white text-base mb-1">Depuis la soirée</h4>
                  <p className="text-white/50 text-sm leading-relaxed">Demande un retour depuis l'événement</p>
                </div>
              </div>
            </div>

            {/* Route illustration: 1 départ (soirée) → multiple drop-offs */}
            <div className="relative">
              <div className="relative h-[400px] md:h-[480px] rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-br from-[#0a1025] to-[#0a1128]">
                {/* Grid background */}
                <div className="absolute inset-0" style={{
                  backgroundImage: `
                    linear-gradient(rgba(100,150,255,0.12) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(100,150,255,0.12) 1px, transparent 1px)
                  `,
                  backgroundSize: '28px 28px'
                }} />

                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 480" fill="none">
                  <defs>
                    <linearGradient id="routeMain" x1="250" y1="60" x2="250" y2="440" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3b82f6" />
                      <stop offset="1" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>

                  {/* Main route: soirée (top center) going south */}
                  <path
                    d="M250 60 C250 100, 240 140, 230 180 S210 240, 200 280 S180 340, 160 400"
                    stroke="url(#routeMain)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray="8 6" className="landing-route-draw"
                  />
                  {/* Branch 1: passenger drops off east-side mid-route */}
                  <path
                    d="M230 180 C260 190, 300 200, 340 210"
                    stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"
                    strokeDasharray="5 5" opacity="0.6" className="landing-route-draw-delay1"
                  />
                  {/* Branch 2: passenger drops off west */}
                  <path
                    d="M200 280 C170 290, 120 300, 80 310"
                    stroke="#818cf8" strokeWidth="2" strokeLinecap="round"
                    strokeDasharray="5 5" opacity="0.6" className="landing-route-draw-delay2"
                  />
                  {/* Branch 3: passenger drops off east-south */}
                  <path
                    d="M180 340 C220 355, 280 370, 350 380"
                    stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"
                    strokeDasharray="5 5" opacity="0.6" className="landing-route-draw-delay3"
                  />

                  {/* Start: soirée (blue) */}
                  <circle cx="250" cy="60" r="10" fill="#3b82f6" className="landing-pulse-dot" />
                  <circle cx="250" cy="60" r="5" fill="white" />

                  {/* Drop-off 1 (green) */}
                  <circle cx="340" cy="210" r="7" fill="#22c55e" className="landing-pulse-dot" />
                  <circle cx="340" cy="210" r="3.5" fill="white" />

                  {/* Drop-off 2 (green) */}
                  <circle cx="80" cy="310" r="7" fill="#22c55e" className="landing-pulse-dot" />
                  <circle cx="80" cy="310" r="3.5" fill="white" />

                  {/* Drop-off 3 (green) */}
                  <circle cx="350" cy="380" r="7" fill="#22c55e" className="landing-pulse-dot" />
                  <circle cx="350" cy="380" r="3.5" fill="white" />

                  {/* Final destination: driver (green) */}
                  <circle cx="160" cy="400" r="7" fill="#22c55e" className="landing-pulse-dot" />
                  <circle cx="160" cy="400" r="3.5" fill="white" />
                </svg>

                {/* Labels */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-500/15 backdrop-blur-md border border-blue-400/20 rounded-2xl px-4 py-2">
                  <p className="text-blue-300 text-xs font-bold font-syne text-center">La soirée 🎉</p>
                </div>

                {/* Passenger labels — positioned next to dots, not on top */}
                <div className="absolute top-[41%] right-[15%] bg-green-500/10 backdrop-blur-sm border border-green-400/20 rounded-xl px-3 py-1.5">
                  <p className="text-green-300 text-[10px] font-bold">Maxime déposé</p>
                </div>
                <div className="absolute top-[62%] left-[4%] bg-green-500/10 backdrop-blur-sm border border-green-400/20 rounded-xl px-3 py-1.5">
                  <p className="text-green-300 text-[10px] font-bold">Léa déposée</p>
                </div>
                <div className="absolute bottom-[18%] right-[16%] bg-green-500/10 backdrop-blur-sm border border-green-400/20 rounded-xl px-3 py-1.5">
                  <p className="text-green-300 text-[10px] font-bold">Hugo déposé</p>
                </div>
                <div className="absolute bottom-[12%] left-[23%] bg-indigo-500/10 backdrop-blur-sm border border-indigo-400/20 rounded-xl px-3 py-1.5">
                  <p className="text-indigo-300 text-[10px] font-bold">Toi 🏠</p>
                </div>

                {/* Glow effects */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-12 left-20 w-32 h-32 bg-indigo-500/8 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-32 h-32 bg-green-500/5 rounded-full blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  FOOTER                                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer className="relative py-16 px-6 border-t border-white/10 bg-gradient-to-b from-[#0a1128] to-[#0d1530]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/20 via-transparent to-indigo-950/20" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <img src={logoFLR} alt="Fuelers" className="w-10 h-10 rounded-full ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10" />
              <span className="font-syne font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Fuelers
              </span>
            </div>

            <div className="flex items-center gap-6">
              <a href="https://www.instagram.com/listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-blue-400 transition-colors duration-300" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors duration-300" aria-label="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
              </a>
            </div>

            <p className="text-white/60 text-sm font-medium">&copy; {new Date().getFullYear()} Fuelers. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

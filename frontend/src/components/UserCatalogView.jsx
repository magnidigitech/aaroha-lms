import React, { useState, useEffect } from 'react';
import { 
  Search, Star, CheckCircle2, ArrowRight, Award, BookOpen, 
  Sparkles, X, Cpu, ShieldCheck, Layers 
} from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import TechSearchBar from './TechSearchBar';
import { courseMatchesQuery, POPULAR_TECHNOLOGY_TAGS } from '../techTaxonomy';

const HERO_TECH_SHOWCASE = [
  {
    id: 'ai',
    label: 'Artificial Intelligence',
    title: 'Applied AI & Neural Systems',
    subtitle: 'Deep neural networks, LLM acceleration, continuous batching, and scalable GPU execution graphs.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1000&q=85',
    tag: 'Next-Gen Computing'
  },
  {
    id: 'cloud',
    label: 'Cloud Infrastructure',
    title: 'Distributed Systems & Cloud Architecture',
    subtitle: 'High-throughput data backbones, multi-region consensus, low-latency streaming, and planetary-scale clusters.',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=85',
    tag: 'High-Throughput Engineering'
  },
  {
    id: 'cyber',
    label: 'Cyber Defense',
    title: 'Zero-Trust Architecture & Resilient Systems',
    subtitle: 'Kernel-level observability, proactive threat defense, memory safety, and verifiable cryptographic attestations.',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=85',
    tag: 'Resilience & Security'
  }
];

export default function UserCatalogView({ 
  courses = [], 
  onOpenCourseDetails, 
  searchQuery, 
  setSearchQuery,
  selectedCategory,
  setSelectedCategory
}) {
  const [activeShowcaseIdx, setActiveShowcaseIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveShowcaseIdx(prev => (prev + 1) % HERO_TECH_SHOWCASE.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const currentTech = HERO_TECH_SHOWCASE[activeShowcaseIdx];

  const dynamicCategories = ['All', ...Array.from(new Set([
    'Applied AI',
    'Cloud Architecture',
    'Cybersecurity',
    ...courses.map(c => c.category).filter(Boolean)
  ]))];

  const publishedCourses = courses.filter(c => c.is_published !== 0 && c.is_published !== false && !c.is_deleted);

  const hasSearch = searchQuery && searchQuery.trim().length > 0;

  // Smart semantic matching using open-source technology taxonomy
  const filteredCourses = publishedCourses.filter(course => {
    const matchesSearch = hasSearch ? courseMatchesQuery(course, searchQuery) : true;
    
    // When a search query is active, prioritize semantic relevance across all programs
    // so results NEVER get stuck or hidden by previous category selections.
    const matchesCategory = !hasSearch
      ? (selectedCategory === 'All' || course.category === selectedCategory)
      : (selectedCategory === 'All' || course.category === selectedCategory || matchesSearch);

    return matchesSearch && matchesCategory;
  });

  const handleSearchSubmit = (q) => {
    if (setSelectedCategory) setSelectedCategory('All');
    setTimeout(() => {
      const target = document.getElementById('browse-courses-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="space-y-10 pb-24">
      {/* Executive Hero Banner */}
      <section className="bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/50 rounded-3xl border border-blue-100/90 p-6 sm:p-10 lg:p-12 relative overflow-hidden shadow-xs">
        {/* Ambient subtle glow background */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Column: Heading, Search & Value Prop (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-[#0A7CB3] text-xs font-bold uppercase tracking-wider border border-blue-200/60 shadow-2xs">
              <Award className="w-3.5 h-3.5 text-[#0A7CB3]" />
              <span>Aaroha Institute of Technology · Executive Academy</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Production Systems Engineering Curricula
            </h1>

            <p className="text-slate-600 text-xs sm:text-sm lg:text-base leading-relaxed font-normal max-w-2xl">
              Master state-of-the-art distributed systems, low-latency AI inference, and zero-trust defenses through university-calibrated engineering specializations, authenticated video lectures, and faculty-evaluated capstones.
            </p>

            {/* OPEN-SOURCE TECHNOLOGY SEARCH BAR IN HERO */}
            <div className="pt-1 max-w-2xl space-y-3">
              <TechSearchBar
                size="hero"
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearchSubmit}
                placeholder="Search technologies, subdomains & systems (e.g. AI, NLP, Raft...)"
              />

              {/* Quick Open-Source Technology Tags */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Technologies:</span>
                </span>
                {POPULAR_TECHNOLOGY_TAGS.slice(0, 6).map((tag, tIdx) => (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={() => {
                      if (setSearchQuery) setSearchQuery(tag.query);
                      handleSearchSubmit(tag.query);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-[#0A7CB3] text-slate-700 hover:text-white border border-slate-200 hover:border-[#0A7CB3] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons & Value Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
              <button
                onClick={() => {
                  const target = document.getElementById('browse-courses-section');
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }
                }}
                className="px-6 py-3 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Explore All Programs</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold px-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>100% Online · Free Video Previews · Accredited Digital Parchment</span>
              </div>
            </div>
          </div>

          {/* Right Column: Animated Visual Technology Showcase (lg:col-span-5) */}
          <div 
            className="lg:col-span-5"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Domain Selection Tabs & Progress Dots */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {HERO_TECH_SHOWCASE.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveShowcaseIdx(idx);
                      setIsPaused(true);
                    }}
                    className={'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ' +
                      (activeShowcaseIdx === idx
                        ? 'bg-[#0A7CB3] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200')}
                  >
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Progress Indicators */}
              <div className="flex items-center gap-1.5 shrink-0 px-1">
                {HERO_TECH_SHOWCASE.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveShowcaseIdx(idx);
                      setIsPaused(true);
                    }}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activeShowcaseIdx === idx ? 'w-5 bg-[#0A7CB3]' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Showcase Visual Card - Pure Technology Image Showcase */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-3 sm:p-4 space-y-3 relative overflow-hidden group">
              {/* Image Container with Gentle Ambient Lighting */}
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-inner">
                <img
                  key={currentTech.id}
                  src={currentTech.image}
                  alt={currentTech.title}
                  className="w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in-95 group-hover:scale-105"
                />
                
                {/* Modern Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/20 pointer-events-none" />

                {/* Subtle Domain Pill in Top-Left */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold rounded-full border border-white/20 flex items-center gap-1.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>{currentTech.tag}</span>
                  </span>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-3 left-3.5 right-3.5 text-white z-10 space-y-1 pointer-events-none">
                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight drop-shadow-sm">
                    {currentTech.title}
                  </h3>
                  <p className="text-xs text-slate-200/90 line-clamp-2 leading-relaxed drop-shadow-xs">
                    {currentTech.subtitle}
                  </p>
                </div>
              </div>

              {/* Progress Bar & Status Line */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Accredited Technology Curricula</span>
                </span>
                <span className="text-slate-400">
                  {activeShowcaseIdx + 1} of {HERO_TECH_SHOWCASE.length}
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Filter and Search Bar (Coursera Catalog Controls) */}
      <div id="browse-courses-section" className="space-y-4 pt-2 scroll-mt-24">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Browse Specializations & Courses
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredCourses.length} technical programs calibrated for engineering excellence
            </p>
          </div>

          {/* Catalog Level Tech Search Box with Open-Source Feed */}
          <div className="w-full sm:w-80">
            <TechSearchBar
              size="normal"
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={handleSearchSubmit}
              placeholder="Filter by keyword or topic..."
            />
          </div>
        </div>

        {/* Active Search Filter Badge */}
        {hasSearch && (
          <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-2 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0A7CB3]" />
              <span>Filtered by technology / subdomain: <strong className="text-[#0A7CB3]">"{searchQuery}"</strong> ({filteredCourses.length} results)</span>
            </div>
            <button
              onClick={() => {
                if (setSearchQuery) setSearchQuery('');
                if (setSelectedCategory) setSelectedCategory('All');
              }}
              className="text-xs font-bold text-[#0A7CB3] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        )}

        {/* Category Pills (Coursera Style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={'px-4 py-2 text-xs font-semibold rounded-full transition-all whitespace-nowrap cursor-pointer ' +
                (selectedCategory === cat
                  ? 'bg-[#0A7CB3] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200')}
            >
              {cat === 'All' ? 'All Courses' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Coursera-Style 2:3 Portrait Course Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredCourses.map(course => {
          // Format reviews count (e.g., "2,840 reviews" -> "2.8K")
          let formattedReviews = '2.8K';
          if (course.reviews_count) {
            const num = parseInt(course.reviews_count.replace(/[^0-9]/g, ''));
            if (!isNaN(num)) {
              formattedReviews = num >= 1000 ? (num / 1000).toFixed(1) + 'K' : num.toString();
            }
          }

          // Format clean level and type
          const cleanLevel = (course.level || 'Advanced').replace(' Level', '');
          const cleanType = course.partner_type || 'Specialization';

          // Determine Coursera tag badge
          let badgeText = course.badge_text;
          let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200/80';

          if (!badgeText) {
            if (course.id === 1) {
              badgeText = 'Recently updated';
              badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
            } else if (course.id === 2 || course.category === 'Applied AI' || course.title.toLowerCase().includes('nlp')) {
              badgeText = 'Top AI program';
              badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200/60';
            } else if (course.id === 3) {
              badgeText = 'New';
              badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200/80';
            } else if (course.modules?.some(m => m.lessons?.some(l => l.is_free_preview))) {
              badgeText = 'Free Preview';
              badgeStyle = 'bg-blue-50 text-[#0A7CB3] border-blue-200/60';
            }
          } else {
            if (badgeText.toLowerCase().includes('updated')) {
              badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
            } else if (badgeText.toLowerCase().includes('ai') || badgeText.toLowerCase().includes('top')) {
              badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200/60';
            }
          }

          return (
            <div
              key={course.id}
              onClick={() => onOpenCourseDetails(course)}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer aspect-square w-full max-w-[320px] mx-auto sm:max-w-none"
            >
              {/* Top Header Image (16:9 Landscape Banner, ~55% of Square) */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 flex-shrink-0">
                <img
                  src={course.thumbnail_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'}
                  alt={course.title}
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'; }}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>

              {/* Bottom Details Section (~Remaining 45% of Square) */}
              <div className="p-3 flex-1 flex flex-col justify-between overflow-hidden min-h-0 bg-white">
                <div className="space-y-1">
                  {/* Partner / Provider Line with Logo */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded border border-slate-200 bg-white flex items-center justify-center p-0.5 shadow-2xs flex-shrink-0">
                      <img
                        src={aarohaLogo}
                        alt="Aaroha"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] text-slate-700 font-medium truncate">
                      {course.institution || 'Aaroha Technologies'}
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-[#0A7CB3] transition-colors leading-snug line-clamp-2">
                    {course.title}
                  </h3>

                  {/* Rating & Metadata (Coursera Single Line Format) */}
                  <div className="flex items-center gap-1 text-[10.5px] text-slate-600 font-normal flex-wrap">
                    <span className="flex items-center gap-0.5 font-bold text-slate-900">
                      <Star className="w-3 h-3 text-slate-900 fill-slate-900" />
                      <span>{course.rating || '4.8'}</span>
                    </span>
                    <span className="text-slate-500 font-normal">({formattedReviews})</span>
                    <span className="text-slate-300">·</span>
                    <span>{cleanLevel}</span>
                    <span className="text-slate-300">·</span>
                    <span className="truncate">{cleanType}</span>
                  </div>
                </div>

                {/* Bottom Tag Badge Pill */}
                {badgeText && (
                  <div className="pt-0.5">
                    <span className={'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ' + badgeStyle}>
                      {badgeText}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">No programs match your search</h4>
          <p className="text-xs text-slate-500">Try searching for topics like "AI", "NLP", "Raft", "Distributed Systems", or select All Courses.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="px-4 py-2 text-xs font-bold text-[#0A7CB3] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
          >
            Clear Filters & View All
          </button>
        </div>
      )}
    </div>
  );
}

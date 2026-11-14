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
    courseId: 2,
    label: 'AI & ML',
    domain: 'Applied Artificial Intelligence',
    title: 'Applied Machine Learning & Low-Latency Model Serving',
    category: 'Applied AI',
    rating: '4.9',
    enrolled: '18,400+ Engineers',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
    floatingBadges: [
      { text: 'vLLM Serving', icon: 'Sparkles', pos: 'top-3 left-3', style: 'bg-white/95 text-purple-700 shadow-md border-purple-100', anim: 'animate-float-slow' },
      { text: 'Sub-50ms P99 SLA', icon: 'Cpu', pos: 'top-3 right-3', style: 'bg-slate-900/90 text-purple-300 shadow-md border-slate-700', anim: 'animate-float-reverse' }
    ],
    techTags: ['Transformers', 'AWQ 4-Bit', 'Triton Inference', 'Continuous Batching'],
    faculty: {
      name: 'Dr. Marcus Vance',
      title: 'Distinguished ML Systems Engineer',
      avatar: '/avatars/3d/memo_3.png'
    }
  },
  {
    id: 'cloud',
    courseId: 1,
    label: 'Cloud Systems',
    domain: 'Distributed Cloud Systems',
    title: 'Distributed Cloud Architecture & High-Throughput Systems',
    category: 'Cloud Architecture',
    rating: '4.9',
    enrolled: '24,200+ Engineers',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    floatingBadges: [
      { text: '120k QPS Sustained', icon: 'Cpu', pos: 'top-3 left-3', style: 'bg-white/95 text-blue-700 shadow-md border-blue-100', anim: 'animate-float-slow' },
      { text: 'Raft Leader Election', icon: 'Layers', pos: 'top-3 right-3', style: 'bg-slate-900/90 text-blue-300 shadow-md border-slate-700', anim: 'animate-float-reverse' }
    ],
    techTags: ['Multi-Region Consensus', 'BGP Anycast', 'RocksDB LSM', 'Zero-Drop Ingress'],
    faculty: {
      name: 'Dr. Aris Thorne',
      title: 'Chair of Distributed Infrastructure',
      avatar: '/avatars/3d/memo_1.png'
    }
  },
  {
    id: 'cyber',
    courseId: 3,
    label: 'Cyber Defense',
    domain: 'Zero-Trust Cybersecurity',
    title: 'Enterprise Cyber Defense & Zero-Trust Architecture',
    category: 'Cybersecurity',
    rating: '4.9',
    enrolled: '14,800+ Engineers',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    floatingBadges: [
      { text: 'eBPF Kernel Tracing', icon: 'ShieldCheck', pos: 'top-3 left-3', style: 'bg-white/95 text-emerald-700 shadow-md border-emerald-100', anim: 'animate-float-slow' },
      { text: 'Zero-Trust SPIFFE mTLS', icon: 'Layers', pos: 'top-3 right-3', style: 'bg-slate-900/90 text-emerald-300 shadow-md border-slate-700', anim: 'animate-float-reverse' }
    ],
    techTags: ['Kyverno Policies', 'Sigstore SLSA L3', 'Memory Safety', 'STRIDE Modeling'],
    faculty: {
      name: 'Katarina Wolf',
      title: 'Principal Security Architect',
      avatar: '/avatars/3d/memo_14.png'
    }
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

  const renderBadgeIcon = (name) => {
    if (name === 'Sparkles') return <Sparkles className="w-3 h-3 shrink-0" />;
    if (name === 'Cpu') return <Cpu className="w-3 h-3 shrink-0" />;
    if (name === 'ShieldCheck') return <ShieldCheck className="w-3 h-3 shrink-0" />;
    if (name === 'Layers') return <Layers className="w-3 h-3 shrink-0" />;
    return <CheckCircle2 className="w-3 h-3 shrink-0" />;
  };
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-[#0056D2] text-xs font-bold uppercase tracking-wider border border-blue-200/60 shadow-2xs">
              <Award className="w-3.5 h-3.5 text-[#0056D2]" />
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
                    className="px-2.5 py-1 bg-white hover:bg-[#0056D2] text-slate-700 hover:text-white border border-slate-200 hover:border-[#0056D2] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
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
                className="px-6 py-3 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
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
                        ? 'bg-[#0056D2] text-white shadow-xs'
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
                      activeShowcaseIdx === idx ? 'w-5 bg-[#0056D2]' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Showcase Visual Card */}
            <div 
              onClick={() => {
                const matched = courses.find(c => c.id === currentTech.courseId) || courses[0];
                if (matched && onOpenCourseDetails) onOpenCourseDetails(matched);
              }}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 p-4 sm:p-5 space-y-3.5 group cursor-pointer relative overflow-hidden"
            >
              {/* Image Container with Floating Animated Tech Badges */}
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-2xs">
                <img
                  key={currentTech.id}
                  src={currentTech.image}
                  alt={currentTech.domain}
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 animate-in fade-in zoom-in-95 duration-500"
                />
                
                {/* Soft gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent pointer-events-none" />

                {/* Floating Technology Animated Badges */}
                {currentTech.floatingBadges.map((badge, bIdx) => (
                  <div
                    key={bIdx}
                    className={`absolute ${badge.pos} ${badge.anim} ${badge.style} px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border transition-all z-20 pointer-events-none shadow-sm`}
                  >
                    {renderBadgeIcon(badge.icon)}
                    <span>{badge.text}</span>
                  </div>
                ))}

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-3 left-3.5 right-3.5 text-white z-20 pointer-events-none space-y-0.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
                    {currentTech.category} · {currentTech.rating} ★ ({currentTech.enrolled})
                  </div>
                  <div className="text-xs sm:text-sm font-black text-white truncate drop-shadow-xs">
                    {currentTech.title}
                  </div>
                </div>
              </div>

              {/* Invariant Technology Tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {currentTech.techTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-semibold border border-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Faculty & Action Footer */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={currentTech.faculty.avatar}
                    alt={currentTech.faculty.name}
                    onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_1.png'; }}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {currentTech.faculty.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {currentTech.faculty.title}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[#0056D2] group-hover:text-[#00419e] group-hover:translate-x-0.5 transition-all shrink-0">
                  <span>Explore Track</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
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
              <Sparkles className="w-3.5 h-3.5 text-[#0056D2]" />
              <span>Filtered by technology / subdomain: <strong className="text-[#0056D2]">"{searchQuery}"</strong> ({filteredCourses.length} results)</span>
            </div>
            <button
              onClick={() => {
                if (setSearchQuery) setSearchQuery('');
                if (setSelectedCategory) setSelectedCategory('All');
              }}
              className="text-xs font-bold text-[#0056D2] hover:underline flex items-center gap-1 cursor-pointer"
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
                  ? 'bg-[#0056D2] text-white shadow-xs'
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
              badgeStyle = 'bg-blue-50 text-[#0056D2] border-blue-200/60';
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
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-[#0056D2] transition-colors leading-snug line-clamp-2">
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
            className="px-4 py-2 text-xs font-bold text-[#0056D2] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
          >
            Clear Filters & View All
          </button>
        </div>
      )}
    </div>
  );
}

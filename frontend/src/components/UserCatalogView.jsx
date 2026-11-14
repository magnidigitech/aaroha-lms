import React from 'react';
import { Search, Star, CheckCircle2, ArrowRight, Award, BookOpen, Sparkles, X } from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import TechSearchBar from './TechSearchBar';
import { courseMatchesQuery, POPULAR_TECHNOLOGY_TAGS } from '../techTaxonomy';

export default function UserCatalogView({ 
  courses = [], 
  onOpenCourseDetails, 
  searchQuery, 
  setSearchQuery,
  selectedCategory,
  setSelectedCategory
}) {
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
      <section className="bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 rounded-3xl border border-blue-100/80 p-8 sm:p-12 relative overflow-hidden shadow-2xs">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-[#0056D2] text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5 text-[#0056D2]" />
            <span>Aaroha Institute of Technology · Executive Academy</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Production Systems Engineering Curricula
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
            Master state-of-the-art systems architecture through university-calibrated engineering specializations, authenticated video lectures, and faculty-evaluated capstones.
          </p>

          {/* OPEN-SOURCE TECHNOLOGY SEARCH BAR IN HERO */}
          <div className="pt-2 max-w-2xl space-y-3">
            <TechSearchBar
              size="hero"
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={handleSearchSubmit}
              placeholder="Search technologies, subdomains & systems (e.g. AI, NLP, Raft...)"
            />

            {/* Quick Open-Source Technology Tags */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
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

          <div className="pt-2 flex flex-wrap items-center gap-4">
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
              <span>Explore Programs</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold px-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>100% Online · Free Previews · Accredited Digital Certificates</span>
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

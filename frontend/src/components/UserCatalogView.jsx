import React from 'react';
import { 
  Star, ArrowRight, BookOpen, 
  Sparkles, X 
} from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import heroStudentsImg from '../assets/hero_learning_students.webp';
import TechSearchBar from './TechSearchBar';
import HeroTechBackground from './HeroTechBackground';
import CourseCardBadge from './CourseCardBadge';
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
    <div className="w-full pb-24">
      {/* Full-Width Homepage Hero Section - Layer 1: Base background */}
      <section className="relative w-full min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] flex items-center bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-100/40 dark:from-[#070e1b] dark:via-[#0c182c] dark:to-[#070e1b] overflow-hidden transition-colors duration-200">
        {/* Layer 2: Decorative animation restricted to empty space */}
        <HeroTechBackground className="z-10" />

        {/* Layer 3: Photograph and its blending gradient */}
        <div 
          aria-hidden="true" 
          className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20"
        >
          {/* High-quality photograph positioned to the right */}
          <img
            src={heroStudentsImg}
            alt=""
            className="absolute right-0 top-0 h-full w-full sm:w-4/5 lg:w-3/5 object-cover object-[75%_25%] sm:object-right opacity-85 sm:opacity-90 dark:opacity-75"
            loading="eager"
            fetchpriority="high"
          />

          {/* Horizontal Gradient Mask: Seamless blend from solid pale background on left to transparent on right */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/95 via-45% sm:via-slate-50/80 sm:via-50% to-transparent to-95% dark:from-[#070e1b] dark:via-[#070e1b]/95 dark:via-45% dark:sm:via-[#070e1b]/80 dark:sm:via-50% dark:to-transparent dark:to-95%" 
          />

          {/* Soft Vertical Vignette: smooth top & bottom edge transition */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-slate-50/90 dark:from-[#070e1b]/80 dark:via-transparent dark:to-[#070e1b]/90 pointer-events-none" 
          />

          {/* Mobile contrast veil: softens background image on small screens for high contrast */}
          <div 
            className="absolute inset-0 bg-white/75 sm:bg-transparent dark:bg-[#070e1b]/80 dark:sm:bg-transparent pointer-events-none" 
          />
        </div>

        {/* Layer 4: Text and interactive content */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-30">
          <div className="max-w-xl lg:max-w-2xl space-y-4 sm:space-y-6">
            {/* Small Label */}
            <div className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-[#0A7CB3] dark:text-sky-400">
              AAROHA TECHNOLOGIES
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Build practical tech skills.<br />
              Take your next career step.
            </h1>

            {/* Description */}
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed font-normal max-w-xl">
              Explore technology courses, learn through guided projects, and develop your skills with faculty support.
            </p>

            {/* Hero Search Box on a solid, high-contrast surface */}
            <div className="pt-1 w-full max-w-xl space-y-3.5">
              <TechSearchBar
                size="hero"
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearchSubmit}
                placeholder="Search technologies, subdomains & systems (e.g. AI, NLP, Raft...)"
              />

              {/* Preserved Topic Chips Beneath Search */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#0A7CB3]" />
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
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-[#0A7CB3] dark:hover:bg-[#0A7CB3] text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-[#0A7CB3] dark:hover:border-[#0A7CB3] rounded-lg text-xs font-medium transition-all cursor-pointer shadow-2xs"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Action: Explore All Programs */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const target = document.getElementById('browse-courses-section');
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#0A7CB3] dark:hover:text-sky-400 border border-slate-300 dark:border-slate-700 hover:border-[#0A7CB3] text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Explore All Programs</span>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#0A7CB3]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar (Coursera Catalog Controls) & Course Grid in Centered Container */}
      <div id="browse-courses-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Browse Specializations & Courses
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
          <div className="flex items-center justify-between bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl px-4 py-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0A7CB3] dark:text-sky-400" />
              <span>Filtered by technology / subdomain: <strong className="text-[#0A7CB3] dark:text-sky-400">"{searchQuery}"</strong> ({filteredCourses.length} results)</span>
            </div>
            <button
              onClick={() => {
                if (setSearchQuery) setSearchQuery('');
                if (setSelectedCategory) setSelectedCategory('All');
              }}
              className="text-xs font-bold text-[#0A7CB3] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
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
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700')}
            >
              {cat === 'All' ? 'All Courses' : cat}
            </button>
          ))}
        </div>

        {/* Coursera-Style Course Cards Grid */}
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

          // Determine Coursera tag badge text (blank hides badge)
          let badgeText = '';
          if (course.badge_text !== undefined && course.badge_text !== null) {
            badgeText = String(course.badge_text).trim();
          } else if (!course.badge_color) {
            // Legacy heuristic defaults for initial seed catalog where no explicit badge_color is set
            if (course.id === 1) {
              badgeText = 'Recently updated';
            } else if (course.id === 2 || course.category === 'Applied AI' || (course.title && course.title.toLowerCase().includes('nlp'))) {
              badgeText = 'Top AI program';
            } else if (course.id === 3) {
              badgeText = 'New';
            } else if (course.modules?.some(m => m.lessons?.some(l => l.is_free_preview))) {
              badgeText = 'Free Preview';
            }
          }

          return (
            <div
              key={course.id}
              onClick={() => onOpenCourseDetails(course)}
              className="bg-white dark:bg-[#0c1527] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer aspect-square w-full"
            >
              {/* Top Header Image (16:9 Landscape Banner, ~55% of Square) */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                <img
                  src={course.thumbnail_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'}
                  alt={course.title}
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'; }}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>

              {/* Bottom Details Section (~Remaining 45% of Square) */}
              <div className="p-3 flex-1 flex flex-col justify-between overflow-hidden min-h-0 bg-white dark:bg-[#0c1527]">
                <div className="space-y-1">
                  {/* Partner / Provider Line with Logo */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 shadow-2xs flex-shrink-0">
                      <img
                        src={aarohaLogo}
                        alt="Aaroha"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate">
                      {course.institution || 'Aaroha Technologies'}
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0A7CB3] dark:group-hover:text-sky-400 transition-colors leading-snug line-clamp-2">
                    {course.title}
                  </h3>

                  {/* Rating & Metadata (Coursera Single Line Format) */}
                  <div className="flex items-center gap-1 text-[10.5px] text-slate-600 dark:text-slate-400 font-normal flex-wrap">
                    <span className="flex items-center gap-0.5 font-bold text-slate-900 dark:text-slate-100">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{course.rating || '4.8'}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal">({formattedReviews})</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span>{cleanLevel}</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="truncate">{cleanType}</span>
                  </div>
                </div>

                {/* Bottom Tag Badge Pill (Unified Component) */}
                {badgeText && (
                  <div className="pt-0.5">
                    <CourseCardBadge text={badgeText} color={course.badge_color} course={course} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-[#0c1527] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No programs match your search</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Try searching for topics like "AI", "NLP", "Raft", "Distributed Systems", or select All Courses.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="px-4 py-2 text-xs font-bold text-[#0A7CB3] dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md transition-colors cursor-pointer"
          >
            Clear Filters & View All
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

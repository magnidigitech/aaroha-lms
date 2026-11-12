import React from 'react';
import { Search, Star, Clock, BarChart3, CheckCircle2, Play, FileText, ArrowRight, ShieldCheck, Award, Users, BookOpen } from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';

export default function UserCatalogView({ 
  courses, 
  onEnroll, 
  onOpenCourseDetails, 
  searchQuery, 
  setSearchQuery,
  selectedCategory,
  setSelectedCategory
}) {
  const dynamicCategories = ['All', ...Array.from(new Set([
    'Cloud Architecture',
    'Applied AI',
    'Cybersecurity',
    ...courses.map(c => c.category).filter(Boolean)
  ]))];

  const publishedCourses = courses.filter(c => c.is_published);

  const filteredCourses = publishedCourses.filter(course => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch = course.title.toLowerCase().includes(q) ||
                          course.description.toLowerCase().includes(q) ||
                          (course.skills && course.skills.some(s => s.toLowerCase().includes(q)));
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-12 pb-24">
      {/* Coursera-style Hero Section */}
      <section className="bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 rounded-3xl border border-blue-100/80 p-8 sm:p-14 relative overflow-hidden shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-[#0056D2] text-xs font-bold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-[#0056D2]" />
              <span>Aaroha Institute of Technology</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Learn Without Limits.
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
              Build production-grade skills with specialized engineering courses, interactive lecture previews, and faculty-evaluated projects from Aaroha Institute of Technology.
            </p>

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
                className="px-6 py-3 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs sm:text-sm font-bold rounded-md shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Courses</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold px-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>100% Online · Free Previews · Shareable Certificates</span>
              </div>
            </div>
          </div>

          {/* Right Hero Badge Card */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <img
                src={aarohaLogo}
                alt="Aaroha Technologies"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest pl-2">
                Accredited
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Every specialization includes sequential video lectures, reference implementations, and mandatory evaluated assignments graded by systems faculty.
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0056D2]" />
                <span>45,000+ Enrolled</span>
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>4.9 / 5.0 Average</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Coursera Partner Institutions Banner */}
      <section className="border-y border-slate-200/80 py-6 bg-white rounded-2xl px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center sm:text-left">
            Collaborating Engineering Groups & Labs:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-slate-700 font-semibold text-xs">
            <span className="hover:text-[#0056D2] transition-colors cursor-default">Aaroha Systems Lab</span>
            <span className="hover:text-[#0056D2] transition-colors cursor-default">Cloud Native Consortium</span>
            <span className="hover:text-[#0056D2] transition-colors cursor-default">Distributed Consensus Group</span>
            <span className="hover:text-[#0056D2] transition-colors cursor-default">Center for Cyber Resilience</span>
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

          {/* Search Box on mobile / catalog */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by keyword or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2] transition-all"
            />
          </div>
        </div>

        {/* Category Pills (Coursera Style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={'px-4 py-2 text-xs font-semibold rounded-full transition-all whitespace-nowrap ' +
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
            } else if (course.id === 2 || course.category === 'Applied AI') {
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
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>

              {/* Bottom Details Section (~Remaining 45% of Square) */}
              <div className="p-3 flex-1 flex flex-col justify-between overflow-hidden min-h-0 bg-white">
                <div className="space-y-1">
                  {/* Partner / Provider Line with Logo */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-4.5 h-4.5 rounded border border-slate-200 bg-slate-950 flex items-center justify-center p-0.5 shadow-2xs flex-shrink-0">
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
          <p className="text-xs text-slate-500">Try searching for topics like "Raft", "Anycast", "Quantization", or select All Courses.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="px-4 py-2 text-xs font-bold text-[#0056D2] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

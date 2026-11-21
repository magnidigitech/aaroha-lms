import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, ChevronDown, ChevronRight, User, LogOut, GraduationCap, Shield, Compass,
  Menu, X, Award, ShieldCheck, ArrowRight, ArrowLeft, LayoutDashboard, Globe,
  BookOpen, Video, Settings
} from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import TechSearchBar from './TechSearchBar';
import ThemeToggle from './ThemeToggle';
import { ROUTES, HOMEPAGE_ROUTE, getAuthorizedDashboardView, isFacultyRole } from '../routes';

export default function Navbar({
  currentUser,
  activeView,
  setActiveView,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  stats,
  searchQuery,
  setSearchQuery,
  onSelectCategory,
  courses = [],
  onOpenCourseDetails
}) {
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [activeCategoryKey, setActiveCategoryKey] = useState('');
  const [exploreSearch, setExploreSearch] = useState('');
  const [isMobileExploreOpen, setIsMobileExploreOpen] = useState(false);
  const [mobileExploreCategory, setMobileExploreCategory] = useState(null);

  const exploreRef = useRef(null);
  const categoryItemRefs = useRef([]);
  const courseItemRefs = useRef([]);
  const viewAllLinkRef = useRef(null);

  // Live course visibility matching public catalog visibility rules
  const publishedCourses = useMemo(() => {
    return (courses || []).filter(c => {
      if (!c) return false;
      const isPub = c.is_published !== 0 && c.is_published !== false && c.is_published !== '0';
      const notDel = !c.is_deleted && c.is_deleted !== 1;
      const notArchived = !c.is_archived && c.is_archived !== 1 && c.status !== 'archived';
      return isPub && notDel && notArchived;
    });
  }, [courses]);

  // Group into canonical categories strictly containing >= 1 published course
  const categoryMap = useMemo(() => {
    const map = new Map();
    publishedCourses.forEach(c => {
      const raw = (c.category || '').trim();
      if (!raw) return;
      const lower = raw.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, { name: raw, courses: [c] });
      } else {
        map.get(lower).courses.push(c);
      }
    });
    return map;
  }, [publishedCourses]);

  const categoryList = useMemo(() => {
    return Array.from(categoryMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [categoryMap]);

  // Filter categories by search term
  const filteredCategories = useMemo(() => {
    const q = exploreSearch.trim().toLowerCase();
    if (!q) return categoryList;
    return categoryList.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.courses.some(c => (c.title || '').toLowerCase().includes(q))
    );
  }, [categoryList, exploreSearch]);

  // Determine active category for desktop 2-column view
  const activeCategoryData = useMemo(() => {
    if (activeCategoryKey) {
      const found = categoryList.find(c => c.name.toLowerCase() === activeCategoryKey.toLowerCase());
      if (found) return found;
    }
    return filteredCategories[0] || categoryList[0] || null;
  }, [activeCategoryKey, categoryList, filteredCategories]);

  // Close desktop explore dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target)) {
        setIsExploreOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isExploreOpen) {
        setIsExploreOpen(false);
      }
    };
    if (isExploreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExploreOpen]);

  const handleToggleExplore = () => {
    setIsExploreOpen(prev => {
      const next = !prev;
      if (next) {
        setExploreSearch('');
        if (categoryList.length > 0 && !activeCategoryKey) {
          setActiveCategoryKey(categoryList[0].name);
        }
      }
      return next;
    });
  };

  const handleOpenAllCourses = () => {
    setIsExploreOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileExploreOpen(false);
    setMobileExploreCategory(null);
    setActiveView('catalog');
    if (onSelectCategory) onSelectCategory('All');
    setTimeout(() => {
      const target = document.getElementById('browse-courses-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  const handleSelectCategory = (catName) => {
    setIsExploreOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileExploreOpen(false);
    setMobileExploreCategory(null);
    setActiveView('catalog');
    if (onSelectCategory) onSelectCategory(catName);
    setTimeout(() => {
      const target = document.getElementById('browse-courses-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  const handleOpenCourse = (course) => {
    setIsExploreOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileExploreOpen(false);
    setMobileExploreCategory(null);
    if (onOpenCourseDetails) {
      onOpenCourseDetails(course);
    } else {
      setActiveView('course-brochure');
    }
  };

  // Keyboard navigation for desktop Explore menu
  const handleCategoryKeyDown = (e, index) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % filteredCategories.length;
      categoryItemRefs.current[nextIndex]?.focus();
      setActiveCategoryKey(filteredCategories[nextIndex]?.name);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + filteredCategories.length) % filteredCategories.length;
      categoryItemRefs.current[prevIndex]?.focus();
      setActiveCategoryKey(filteredCategories[prevIndex]?.name);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      courseItemRefs.current[0]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectCategory(filteredCategories[index]?.name);
    }
  };

  const handleCourseKeyDown = (e, index) => {
    const courseCount = Math.min(activeCategoryData?.courses?.length || 0, 5);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index + 1 < courseCount) {
        courseItemRefs.current[index + 1]?.focus();
      } else {
        viewAllLinkRef.current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        courseItemRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const currentCatIdx = filteredCategories.findIndex(
        c => c.name.toLowerCase() === activeCategoryData?.name.toLowerCase()
      );
      if (currentCatIdx >= 0) {
        categoryItemRefs.current[currentCatIdx]?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeCategoryData?.courses[index]) {
        handleOpenCourse(activeCategoryData.courses[index]);
      }
    }
  };

  const handleViewAllKeyDown = (e) => {
    const courseCount = Math.min(activeCategoryData?.courses?.length || 0, 5);
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (courseCount > 0) {
        courseItemRefs.current[courseCount - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const currentCatIdx = filteredCategories.findIndex(
        c => c.name.toLowerCase() === activeCategoryData?.name.toLowerCase()
      );
      if (currentCatIdx >= 0) {
        categoryItemRefs.current[currentCatIdx]?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectCategory(activeCategoryData.name);
    }
  };

  const handleNavbarSearch = (query) => {
    if (setSearchQuery) setSearchQuery(query);
    if (onSelectCategory) onSelectCategory('All');
    if (activeView !== 'catalog') setActiveView('catalog');
    setTimeout(() => {
      const target = document.getElementById('browse-courses-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#0c1527] border-b border-slate-200/90 dark:border-slate-800 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-4">
          
          {/* Left: Brand Logo & Explore Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-6 flex-shrink-0">
            {/* Official Aaroha Technologies Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer select-none group" 
              onClick={() => {
                setActiveView('catalog');
                if (onSelectCategory) onSelectCategory('All');
                setIsMobileMenuOpen(false);
              }}
            >
              <div className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shadow-xs transition-all duration-200 group-hover:border-slate-300 dark:group-hover:border-slate-600">
                <img
                  src={aarohaLogo}
                  alt="Aaroha Technologies"
                  className="h-6 sm:h-8 w-auto object-contain"
                />
              </div>
            </div>

            {/* Coursera-style Explore Dropdown Button (Tablet/Desktop) */}
            <div className="relative hidden sm:block" ref={exploreRef}>
              <button
                onClick={handleToggleExplore}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                aria-expanded={isExploreOpen}
                aria-label="Explore course categories"
              >
                <Compass className="w-4 h-4" />
                <span>Explore</span>
                <ChevronDown className={'w-3.5 h-3.5 transition-transform duration-200 ' + (isExploreOpen ? 'rotate-180' : '')} />
              </button>

              {/* Explore Menu Dropdown (Two-Column Dynamic Coursera-Style) */}
              {isExploreOpen && (
                <div 
                  className="absolute left-0 mt-2 w-[580px] bg-white dark:bg-[#0f1b33] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* Top Bar: All Courses Button + Search Filter */}
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleOpenAllCourses}
                      className="px-3 py-1.5 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>All Courses ({publishedCourses.length})</span>
                    </button>

                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={exploreSearch}
                        onChange={(e) => setExploreSearch(e.target.value)}
                        placeholder="Search categories or courses..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#0A7CB3] dark:focus:border-sky-400 text-slate-900 dark:text-white"
                        autoFocus
                      />
                      {exploreSearch && (
                        <button
                          type="button"
                          onClick={() => setExploreSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Two-Column Explorer */}
                  <div className="flex divide-x divide-slate-100 dark:divide-slate-800 min-h-[300px] max-h-[380px]">
                    {/* Left Column: Categories List */}
                    <div 
                      className="w-1/2 overflow-y-auto p-1.5 space-y-0.5"
                      role="menu"
                      aria-label="Course Categories"
                    >
                      {filteredCategories.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No matching categories
                        </div>
                      ) : (
                        filteredCategories.map((cat, idx) => {
                          const isSelected = activeCategoryData && activeCategoryData.name.toLowerCase() === cat.name.toLowerCase();
                          return (
                            <button
                              key={cat.name}
                              ref={el => categoryItemRefs.current[idx] = el}
                              type="button"
                              role="menuitem"
                              tabIndex={0}
                              onMouseEnter={() => setActiveCategoryKey(cat.name)}
                              onFocus={() => setActiveCategoryKey(cat.name)}
                              onClick={() => handleSelectCategory(cat.name)}
                              onKeyDown={(e) => handleCategoryKeyDown(e, idx)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0A7CB3] dark:text-sky-300 font-bold'
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium'
                              }`}
                            >
                              <span className="truncate pr-2">{cat.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  isSelected
                                    ? 'bg-blue-100 dark:bg-blue-900/60 text-[#0A7CB3] dark:text-sky-300 font-bold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}>
                                  {cat.courses.length}
                                </span>
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-[#0A7CB3] dark:text-sky-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600'}`} />
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Right Column: Courses in Active Category */}
                    <div 
                      className="w-1/2 p-3 bg-slate-50/40 dark:bg-[#0b1424]/40 flex flex-col justify-between overflow-y-auto"
                      role="region"
                      aria-label="Courses in selected category"
                    >
                      {activeCategoryData ? (
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-800">
                              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                                {activeCategoryData.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {activeCategoryData.courses.length} {activeCategoryData.courses.length === 1 ? 'course' : 'courses'}
                              </span>
                            </div>

                            {/* Up to 5 course titles */}
                            <div className="space-y-1">
                              {activeCategoryData.courses.slice(0, 5).map((course, cIdx) => (
                                <button
                                  key={course.id}
                                  ref={el => courseItemRefs.current[cIdx] = el}
                                  type="button"
                                  tabIndex={0}
                                  onClick={() => handleOpenCourse(course)}
                                  onKeyDown={(e) => handleCourseKeyDown(e, cIdx)}
                                  className="w-full text-left p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#0A7CB3] dark:hover:text-sky-300 hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 shadow-2xs group flex items-start gap-2 cursor-pointer"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#0A7CB3] dark:bg-sky-400 mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
                                  <span className="line-clamp-2 leading-snug">{course.title}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* View all [category] courses link */}
                          <div className="pt-2 mt-2 border-t border-slate-200/80 dark:border-slate-800">
                            <button
                              ref={viewAllLinkRef}
                              type="button"
                              tabIndex={0}
                              onClick={() => handleSelectCategory(activeCategoryData.name)}
                              onKeyDown={(e) => handleViewAllKeyDown(e)}
                              className="w-full py-1.5 text-xs font-bold text-[#0A7CB3] dark:text-sky-400 hover:underline flex items-center justify-between cursor-pointer"
                            >
                              <span>View all {activeCategoryData.name} courses ({activeCategoryData.courses.length})</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-xs text-slate-400">
                          <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                          <span>Select a category to view its technical courses</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Open-Source Technology Search Bar (Desktop) */}
          <div className="hidden lg:flex flex-1 min-w-[200px] max-w-md mx-3 lg:mx-6">
            <TechSearchBar
              size="normal"
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={handleNavbarSearch}
              placeholder="What do you want to learn?"
            />
          </div>

          {/* Right Navigation & User Surface */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Direct Navigation: Certificates & Verification */}
            <button
              onClick={() => setActiveView('degrees')}
              className={'text-xs font-bold transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer hidden sm:flex ' + 
                (activeView === 'degrees' 
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0A7CB3] dark:text-sky-300 border border-blue-200 dark:border-blue-800' 
                  : 'text-slate-700 dark:text-slate-200 hover:text-[#0A7CB3] dark:hover:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800')}
              aria-label="Certificates and Verification Portal"
            >
              <Award className="w-4 h-4 text-[#0A7CB3] dark:text-sky-400" />
              <span className="hidden xl:inline">Certificates & Verification</span>
              <span className="inline xl:hidden">Certificates</span>
            </button>

            {/* If currently viewing student dashboard: clean Back to Website / Catalog button */}
            {activeView === 'student' && (
              <button
                onClick={() => {
                  setActiveView(HOMEPAGE_ROUTE);
                  if (onSelectCategory) onSelectCategory('All');
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#0A7CB3] dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title="Return to public homepage (login session preserved)"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#0A7CB3] dark:text-sky-400" />
                <span className="hidden md:inline">Back to Website</span>
                <span className="inline md:hidden">Website</span>
              </button>
            )}

            {/* Authenticated Primary CTA on Public Website: Show "My Dashboard" instead of "Log In" */}
            {currentUser ? (
              activeView !== 'student' && (
                <button
                  onClick={() => {
                    const targetView = getAuthorizedDashboardView(currentUser);
                    setActiveView(targetView);
                  }}
                  className="px-4 py-2 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-md shadow-xs transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
                  title="Return to your authorised role-based dashboard"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>My Dashboard</span>
                  {currentUser.role === 'student' && stats?.enrolledCount > 0 && (
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                      {stats.enrolledCount}
                    </span>
                  )}
                  {isFacultyRole(currentUser.role) && stats?.pendingReviews > 0 && (
                    <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                      {stats.pendingReviews}
                    </span>
                  )}
                </button>
              )
            ) : (
              <div className="hidden sm:flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-2 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </button>
              </div>
            )}

            {/* Small Round Toggle to Switch between Dark and Light Theme */}
            <ThemeToggle />

            {/* User Avatar with Profile Dropdown Menu (Desktop) */}
            {currentUser && (
              <div className="relative flex items-center pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  title="Account menu"
                  className="flex items-center gap-2 p-1 -m-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group text-left border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
                  aria-expanded={isProfileDropdownOpen}
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatar || '/avatars/3d/memo_13.png'}
                      alt={currentUser.full_name}
                      onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_13.png'; }}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-[#0A7CB3]/30 group-hover:ring-[#0A7CB3] group-hover:scale-105 transition-all shrink-0 bg-slate-100 dark:bg-slate-800"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <div className="hidden xl:block text-left">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0A7CB3] dark:group-hover:text-sky-300 transition-colors leading-tight flex items-center gap-1">
                      <span>{currentUser.full_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                      {currentUser.title || (isFacultyRole(currentUser.role) ? 'Faculty' : 'Learner')}
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Menu Dropdown */}
                {isProfileDropdownOpen && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#0f1b33] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setIsProfileDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser.full_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</div>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#0A7CB3] dark:hover:text-sky-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-[#0A7CB3] dark:text-sky-400" />
                        <span>Profile & Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setActiveView('student');
                          setTimeout(() => {
                            const el = document.getElementById('my-courses-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#0A7CB3] dark:hover:text-sky-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4 text-[#0A7CB3] dark:text-sky-400" />
                        <span>My Courses & Learning</span>
                      </button>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          if (onLogout) onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Menu (Visible on < lg screens) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 py-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Mobile Search */}
            <div className="relative px-1">
              <TechSearchBar
                size="normal"
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={(q) => {
                  handleNavbarSearch(q);
                  setIsMobileMenuOpen(false);
                }}
                placeholder="Search technologies (e.g. AI, NLP)..."
              />
            </div>

            {/* Mobile Nav Links */}
            <div className="flex flex-col space-y-1 px-1">
              {/* Mobile Theme Toggle Row */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                <span>Theme Appearance</span>
                <ThemeToggle size="small" />
              </div>

              <button
                onClick={() => {
                  setActiveView('degrees');
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeView === 'degrees' 
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0A7CB3] dark:text-sky-300' 
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Award className="w-4 h-4 text-[#0A7CB3] dark:text-sky-400" />
                <span>Certificates & Verification</span>
              </button>

              {/* Mobile Explore Categories Accordion */}
              <div className="pt-1 pb-1">
                {!isMobileExploreOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileExploreOpen(true);
                      setMobileExploreCategory(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#0A7CB3] dark:text-sky-400" />
                      <span>Explore Categories</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                        {categoryList.length}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                ) : (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[#0A7CB3] dark:text-sky-400" />
                        <span>Explore Categories</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileExploreOpen(false);
                          setMobileExploreCategory(null);
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    {!mobileExploreCategory ? (
                      /* Category List View */
                      <div className="space-y-1.5">
                        {/* All Courses option */}
                        <button
                          type="button"
                          onClick={handleOpenAllCourses}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-[#0A7CB3] dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>All Courses ({publishedCourses.length})</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
                          {categoryList.map(cat => (
                            <button
                              key={cat.name}
                              type="button"
                              onClick={() => setMobileExploreCategory(cat)}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-xl flex items-center justify-between transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
                            >
                              <span className="truncate pr-2">{cat.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                                  {cat.courses.length}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Category Course List View with Back to categories */
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setMobileExploreCategory(null)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#0A7CB3] dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back to categories</span>
                        </button>

                        <div className="pt-0.5">
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-800">
                            <span className="truncate pr-2">{mobileExploreCategory.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {mobileExploreCategory.courses.length} {mobileExploreCategory.courses.length === 1 ? 'course' : 'courses'}
                            </span>
                          </div>
                        </div>

                        {/* Up to 5 course titles */}
                        <div className="space-y-1">
                          {mobileExploreCategory.courses.slice(0, 5).map(course => (
                            <button
                              key={course.id}
                              type="button"
                              onClick={() => handleOpenCourse(course)}
                              className="w-full text-left p-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 hover:border-[#0A7CB3] flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
                            >
                              <span className="line-clamp-2 leading-snug pr-2">{course.title}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>
                          ))}
                        </div>

                        {/* View all [category] courses link */}
                        <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleSelectCategory(mobileExploreCategory.name)}
                            className="w-full py-1.5 text-xs font-bold text-[#0A7CB3] dark:text-sky-400 hover:underline flex items-center justify-between cursor-pointer"
                          >
                            <span>View all {mobileExploreCategory.name} courses ({mobileExploreCategory.courses.length})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* If on student dashboard: Show My Courses, Next Class, and exactly one Back to Website */}
              {activeView === 'student' && (
                <>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      const el = document.getElementById('my-courses-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <BookOpen className="w-4 h-4 text-[#0A7CB3] dark:text-sky-400" />
                    <span>My Courses & Cohorts</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      const el = document.getElementById('schedule-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Next Class & Schedule</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView(HOMEPAGE_ROUTE);
                      if (onSelectCategory) onSelectCategory('All');
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors bg-blue-50 dark:bg-blue-950/60 text-[#0A7CB3] dark:text-sky-300 border border-blue-200 dark:border-blue-900/60"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#0A7CB3] dark:text-sky-400" />
                    <span>Back to Website</span>
                  </button>
                </>
              )}

              {/* If authenticated and on website: Show My Dashboard in list */}
              {currentUser && activeView !== 'student' && (
                <button
                  onClick={() => {
                    const targetView = getAuthorizedDashboardView(currentUser);
                    setActiveView(targetView);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between bg-blue-50/60 dark:bg-blue-950/40 text-[#0A7CB3] dark:text-sky-300 hover:bg-blue-50 dark:hover:bg-blue-950/60"
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-[#0A7CB3] dark:text-sky-400" />
                    <span>My Dashboard</span>
                  </div>
                  {currentUser.role === 'student' && stats?.enrolledCount > 0 && (
                    <span className="bg-[#0A7CB3] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {stats.enrolledCount}
                    </span>
                  )}
                  {isFacultyRole(currentUser.role) && stats?.pendingReviews > 0 && (
                    <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {stats.pendingReviews}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Mobile Auth Controls */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 px-1">
              {currentUser ? (
                <div className="space-y-2">
                  {/* On Public Website: Show "My Dashboard" primary CTA instead of "Log In" */}
                  {activeView !== 'student' && (
                    <button
                      onClick={() => {
                        const targetView = getAuthorizedDashboardView(currentUser);
                        setActiveView(targetView);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-xl text-center shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>My Dashboard</span>
                    </button>
                  )}

                  <div className="flex flex-col space-y-2 p-2.5 bg-slate-50 dark:bg-[#0f1b33] rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={currentUser.avatar || '/avatars/3d/memo_13.png'}
                        alt={currentUser.full_name}
                        onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_13.png'; }}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0 bg-slate-100 dark:bg-slate-800"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser.full_name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {currentUser.title || (isFacultyRole(currentUser.role) ? 'Faculty' : 'Learner')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenProfile) onOpenProfile();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex-1 py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#0A7CB3] dark:text-sky-400" />
                        <span>Profile & Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          onLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-200 hover:text-red-700 dark:hover:text-red-400 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      onOpenAuth('login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-xl text-center shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span>Log In</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

import React, { useState } from 'react';
import {
  Search, ChevronDown, User, LogOut, GraduationCap, Shield, Compass,
  Menu, X, Award, ShieldCheck, ArrowRight, ArrowLeft, LayoutDashboard, Globe,
  BookOpen, Video, Settings
} from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import TechSearchBar from './TechSearchBar';
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
  courses
}) {
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const categories = [
    'All Courses',
    ...Array.from(new Set([
      'Cloud Architecture',
      'Applied AI',
      'Cybersecurity',
      ...(courses?.map(c => c.category).filter(Boolean) || [])
    ]))
  ];

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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
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
              <div className="bg-white hover:bg-slate-50 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 flex items-center shadow-xs transition-all duration-200 group-hover:border-slate-300">
                <img
                  src={aarohaLogo}
                  alt="Aaroha Technologies"
                  className="h-6 sm:h-8 w-auto object-contain"
                />
              </div>
            </div>

            {/* Coursera-style Explore Dropdown Button (Tablet/Desktop) */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setIsExploreOpen(!isExploreOpen)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                aria-expanded={isExploreOpen}
                aria-label="Explore course categories"
              >
                <Compass className="w-4 h-4" />
                <span>Explore</span>
                <ChevronDown className={'w-3.5 h-3.5 transition-transform duration-200 ' + (isExploreOpen ? 'rotate-180' : '')} />
              </button>

              {/* Explore Menu Dropdown */}
              {isExploreOpen && (
                <div 
                  className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setIsExploreOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Course Categories
                  </div>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setIsExploreOpen(false);
                        setActiveView('catalog');
                        if (onSelectCategory) onSelectCategory(cat === 'All Courses' ? 'All' : cat);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-[#0A7CB3] hover:bg-blue-50/60 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>{cat}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-300 -rotate-90" />
                    </button>
                  ))}
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
                  ? 'bg-blue-50 text-[#0A7CB3] border border-blue-200' 
                  : 'text-slate-700 hover:text-[#0A7CB3] hover:bg-slate-50')}
              aria-label="Certificates and Verification Portal"
            >
              <Award className="w-4 h-4 text-[#0A7CB3]" />
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#0A7CB3] border border-slate-200 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title="Return to public homepage (login session preserved)"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#0A7CB3]" />
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

            {/* User Avatar with Profile Dropdown Menu (Desktop) */}
            {currentUser && (
              <div className="relative flex items-center pl-2 sm:pl-3 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  title="Account menu"
                  className="flex items-center gap-2 p-1 -m-1 rounded-xl hover:bg-slate-100 transition-all cursor-pointer group text-left border border-transparent hover:border-slate-200/80"
                  aria-expanded={isProfileDropdownOpen}
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatar || '/avatars/3d/memo_13.png'}
                      alt={currentUser.full_name}
                      onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_13.png'; }}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-[#0A7CB3]/30 group-hover:ring-[#0A7CB3] group-hover:scale-105 transition-all shrink-0 bg-slate-100"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                  </div>
                  <div className="hidden xl:block text-left">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-[#0A7CB3] transition-colors leading-tight flex items-center gap-1">
                      <span>{currentUser.full_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                      {currentUser.title || (isFacultyRole(currentUser.role) ? 'Faculty' : 'Learner')}
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Menu Dropdown */}
                {isProfileDropdownOpen && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setIsProfileDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900 truncate">{currentUser.full_name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#0A7CB3] hover:bg-blue-50/60 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-[#0A7CB3]" />
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
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#0A7CB3] hover:bg-blue-50/60 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4 text-[#0A7CB3]" />
                        <span>My Courses & Learning</span>
                      </button>
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          if (onLogout) onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
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
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Menu (Visible on < lg screens) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
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
              <button
                onClick={() => {
                  setActiveView('degrees');
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeView === 'degrees' ? 'bg-blue-50 text-[#0A7CB3]' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Award className="w-4 h-4 text-[#0A7CB3]" />
                <span>Certificates & Verification</span>
              </button>

              {/* If on student dashboard: Show My Courses, Next Class, and exactly one Back to Website */}
              {activeView === 'student' && (
                <>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      const el = document.getElementById('my-courses-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors text-slate-700 hover:bg-slate-100"
                  >
                    <BookOpen className="w-4 h-4 text-[#0A7CB3]" />
                    <span>My Courses & Cohorts</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      const el = document.getElementById('schedule-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors text-slate-700 hover:bg-slate-100"
                  >
                    <Video className="w-4 h-4 text-purple-600" />
                    <span>Next Class & Schedule</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView(HOMEPAGE_ROUTE);
                      if (onSelectCategory) onSelectCategory('All');
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors bg-blue-50 text-[#0A7CB3] border border-blue-200"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#0A7CB3]" />
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
                  className="text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between bg-blue-50/60 text-[#0A7CB3] hover:bg-blue-50"
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-[#0A7CB3]" />
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
            <div className="pt-2 border-t border-slate-100 px-1">
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

                  <div className="flex flex-col space-y-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={currentUser.avatar || '/avatars/3d/memo_13.png'}
                        alt={currentUser.full_name}
                        onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_13.png'; }}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0 bg-slate-100"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">{currentUser.full_name}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {currentUser.title || (isFacultyRole(currentUser.role) ? 'Faculty' : 'Learner')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenProfile) onOpenProfile();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex-1 py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#0A7CB3]" />
                        <span>Profile & Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          onLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="py-1.5 px-3 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
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

import React, { useState } from 'react';
import { Search, ChevronDown, UserPlus, LogOut, GraduationCap, Shield, Compass, Menu, X, Award, ShieldCheck, ArrowRight } from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import TechSearchBar from './TechSearchBar';

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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
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
            <div className="relative hidden md:block">
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
          <div className="hidden xl:flex flex-1 max-w-md mx-4">
            <TechSearchBar
              size="normal"
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={handleNavbarSearch}
              placeholder="What do you want to learn? (e.g. AI, NLP, Raft...)"
            />
          </div>

          {/* Right Navigation & User Surface */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Direct Navigation: Certificates & Verification */}
            <button
              onClick={() => setActiveView('degrees')}
              className={'text-xs font-bold transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer hidden md:flex ' + 
                (activeView === 'degrees' 
                  ? 'bg-blue-50 text-[#0A7CB3] border border-blue-200' 
                  : 'text-slate-700 hover:text-[#0A7CB3] hover:bg-slate-50')}
              aria-label="Certificates and Verification Portal"
            >
              <Award className="w-4 h-4 text-[#0A7CB3]" />
              <span>Certificates & Verification</span>
            </button>

            {/* Authenticated Links (Desktop) */}
            {currentUser?.role === 'student' && (
              <button
                onClick={() => setActiveView('student')}
                className={'text-xs font-bold transition-colors hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md ' +
                  (activeView === 'student'
                    ? 'bg-blue-50 text-[#0A7CB3] border border-blue-200'
                    : 'text-slate-700 hover:text-[#0A7CB3]')}
              >
                <GraduationCap className="w-4 h-4 text-[#0A7CB3]" />
                <span className="hidden md:inline">My Learning</span>
                {stats?.enrolledCount > 0 && (
                  <span className="bg-[#0A7CB3] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {stats.enrolledCount}
                  </span>
                )}
              </button>
            )}

            {(currentUser?.role === 'admin' || currentUser?.role === 'faculty' || currentUser?.role === 'instructor') && (
              <button
                onClick={() => setActiveView('admin')}
                className={'text-xs font-bold transition-colors hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md ' +
                  (activeView === 'admin'
                    ? 'bg-blue-50 text-[#0A7CB3] border border-blue-200'
                    : 'text-slate-700 hover:text-[#0A7CB3]')}
              >
                <Shield className="w-4 h-4 text-[#0A7CB3]" />
                <span className="hidden md:inline">Faculty Console</span>
                {stats?.pendingReviews > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {stats.pendingReviews}
                  </span>
                )}
              </button>
            )}

            {/* User Avatar & Logout (Desktop) */}
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
                <button
                  type="button"
                  onClick={onOpenProfile}
                  title="Click to view & edit your profile and avatar"
                  className="flex items-center gap-2.5 p-1 -m-1 rounded-xl hover:bg-slate-100 transition-all cursor-pointer group text-left border border-transparent hover:border-slate-200/80"
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
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-[#0A7CB3] transition-colors leading-tight flex items-center gap-1">
                      <span>{currentUser.full_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                      {currentUser.title || (currentUser.role === 'admin' || currentUser.role === 'faculty' || currentUser.role === 'instructor' ? 'Faculty' : 'Learner')}
                    </div>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer hidden md:block"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-xs font-bold text-[#0A7CB3] hover:text-[#086491] hover:underline px-2 py-1.5 transition-colors cursor-pointer"
                >
                  Log In
                </button>

                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Join Free</span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Menu (Visible on < md screens) */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
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

              {currentUser?.role === 'student' && (
                <button
                  onClick={() => {
                    setActiveView('student');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${
                    activeView === 'student' ? 'bg-blue-50 text-[#0A7CB3]' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0A7CB3]" />
                    <span>My Learning Dashboard</span>
                  </div>
                  {stats?.enrolledCount > 0 && (
                    <span className="bg-[#0A7CB3] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {stats.enrolledCount}
                    </span>
                  )}
                </button>
              )}

              {(currentUser?.role === 'admin' || currentUser?.role === 'faculty' || currentUser?.role === 'instructor') && (
                <button
                  onClick={() => {
                    setActiveView('admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${
                    activeView === 'admin' ? 'bg-blue-50 text-[#0A7CB3]' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#0A7CB3]" />
                    <span>Faculty Console</span>
                  </div>
                  {stats?.pendingReviews > 0 && (
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
                <div className="flex items-center justify-between px-2 py-1.5 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenProfile) onOpenProfile();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 min-w-0 p-1.5 -m-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left flex-1 cursor-pointer"
                  >
                    <img
                      src={currentUser.avatar || '/avatars/3d/memo_13.png'}
                      alt={currentUser.full_name}
                      onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_13.png'; }}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{currentUser.full_name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {currentUser.title || (currentUser.role === 'admin' || currentUser.role === 'faculty' || currentUser.role === 'instructor' ? 'Faculty' : 'Learner')}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      onOpenAuth('login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl text-center"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      onOpenAuth('register');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-xl text-center shadow-xs"
                  >
                    Join Free
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

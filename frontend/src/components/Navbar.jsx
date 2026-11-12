import React, { useState } from 'react';
import { Search, ChevronDown, Bell, LogIn, UserPlus, LogOut, GraduationCap, Shield, BookOpen, Compass } from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';

export default function Navbar({
  currentUser,
  activeView,
  setActiveView,
  onOpenAuth,
  onLogout,
  stats,
  searchQuery,
  setSearchQuery,
  onSelectCategory,
  courses
}) {
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  const categories = [
    'All Courses',
    ...Array.from(new Set([
      'Cloud Architecture',
      'Applied AI',
      'Cybersecurity',
      ...(courses?.map(c => c.category).filter(Boolean) || [])
    ]))
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-4">
          
          {/* Left: Brand Logo & Explore Dropdown */}
          <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
            {/* Official Aaroha Technologies Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer select-none group" 
              onClick={() => {
                setActiveView('catalog');
                if (onSelectCategory) onSelectCategory('All');
              }}
            >
              <div className="bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-xs transition-all duration-200 group-hover:border-slate-300">
                <img
                  src={aarohaLogo}
                  alt="Aaroha Technologies"
                  className="h-7 sm:h-8 w-auto object-contain"
                />
                <span className="text-[10px] font-black tracking-widest text-[#0056D2] uppercase pl-2 border-l border-slate-200 hidden sm:inline">
                  Academy
                </span>
              </div>
            </div>

            {/* Coursera-style Explore Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setIsExploreOpen(!isExploreOpen)}
                className="px-3.5 py-2 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Compass className="w-4 h-4" />
                <span className="hidden sm:inline">Explore</span>
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
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-[#0056D2] hover:bg-blue-50/60 transition-colors flex items-center justify-between"
                    >
                      <span>{cat}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-300 -rotate-90" />
                    </button>
                  ))}
                  <div className="px-4 py-2 mt-1 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
                    Earn verified certificates accredited by Aaroha Institute
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Coursera Global Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-2">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="What do you want to learn? (e.g. Raft, mTLS, AWQ...)"
                value={searchQuery || ''}
                onChange={(e) => {
                  if (setSearchQuery) setSearchQuery(e.target.value);
                  if (activeView !== 'catalog') setActiveView('catalog');
                }}
                className="w-full pl-4 pr-11 py-2 text-xs bg-slate-50 border border-slate-300 rounded-full focus:bg-white focus:outline-none focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2] transition-all"
              />
              <button 
                onClick={() => setActiveView('catalog')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0056D2] text-white flex items-center justify-center hover:bg-[#00419e] transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Navigation & User Surface */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Direct Navigation Links */}
            <button
              onClick={() => setActiveView('catalog')}
              className={'text-xs font-semibold transition-colors ' + 
                (activeView === 'catalog' ? 'text-[#0056D2]' : 'text-slate-600 hover:text-slate-900')}
            >
              Degrees & Certificates
            </button>

            {/* Authenticated Links */}
            {currentUser?.role === 'student' && (
              <button
                onClick={() => setActiveView('student')}
                className={'text-xs font-bold transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md ' +
                  (activeView === 'student'
                    ? 'bg-blue-50 text-[#0056D2] border border-blue-200'
                    : 'text-slate-700 hover:text-[#0056D2]')}
              >
                <GraduationCap className="w-4 h-4 text-[#0056D2]" />
                <span>My Learning</span>
                {stats?.enrolledCount > 0 && (
                  <span className="bg-[#0056D2] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {stats.enrolledCount}
                  </span>
                )}
              </button>
            )}

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveView('admin')}
                className={'text-xs font-bold transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md ' +
                  (activeView === 'admin'
                    ? 'bg-blue-50 text-[#0056D2] border border-blue-200'
                    : 'text-slate-700 hover:text-[#0056D2]')}
              >
                <Shield className="w-4 h-4 text-[#0056D2]" />
                <span>Faculty Console</span>
                {stats?.pendingReviews > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {stats.pendingReviews}
                  </span>
                )}
              </button>
            )}

            {/* Coursera-style Auth Controls */}
            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.full_name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-[#0056D2]/30"
                  />
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {currentUser.full_name}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {currentUser.role === 'admin' ? 'Faculty Director' : 'Learner'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-xs font-bold text-[#0056D2] hover:text-[#00419e] hover:underline px-2 py-1.5 transition-colors"
                >
                  Log In
                </button>

                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Join for Free</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, ArrowRight, BookOpen, Globe, TrendingUp } from 'lucide-react';
import { getTechnologySuggestions, POPULAR_TECHNOLOGY_TAGS } from '../techTaxonomy';

export default function TechSearchBar({
  searchQuery,
  setSearchQuery,
  onSearch,
  placeholder = "Search technologies, subdomains & systems (e.g. AI, NLP, Raft...)",
  className = "",
  size = "normal" // 'normal' | 'hero'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch technology suggestions with debounce
  useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const results = await getTechnologySuggestions(searchQuery);
        if (active) {
          setSuggestions(results);
        }
      } catch (err) {
        if (active) setSuggestions([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSelectSuggestion = (item) => {
    const val = item.keyword || item.name;
    if (setSearchQuery) setSearchQuery(val);
    setIsOpen(false);
    if (onSearch) onSearch(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
      if (onSearch) onSearch(searchQuery);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    if (setSearchQuery) setSearchQuery('');
    if (inputRef.current) inputRef.current.focus();
    if (onSearch) onSearch('');
  };

  const isHero = size === 'hero';

  return (
    <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
      {/* Search Input Box */}
      <div className={`relative flex items-center w-full transition-all ${
        isHero
          ? 'bg-white dark:bg-[#0f1b33] shadow-md border-2 border-slate-200 dark:border-slate-700 focus-within:border-[#0A7CB3] focus-within:ring-4 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 rounded-2xl'
          : 'bg-slate-50 dark:bg-slate-800/90 focus-within:bg-white dark:focus-within:bg-slate-800 border border-slate-300 dark:border-slate-700 focus-within:border-[#0A7CB3] focus-within:ring-1 focus-within:ring-[#0A7CB3] rounded-full'
      }`}>
        <Search className={`text-slate-400 shrink-0 ${isHero ? 'w-5 h-5 ml-4' : 'w-3.5 h-3.5 ml-3.5'}`} />

        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery || ''}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            if (setSearchQuery) setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full min-w-0 bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium ${
            isHero ? 'py-3.5 px-3 text-sm' : 'py-2 px-2.5 text-xs'
          }`}
        />

        {/* Clear Button if has text */}
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            if (onSearch) onSearch(searchQuery);
          }}
          className={`shrink-0 flex items-center justify-center text-white transition-all cursor-pointer ${
            isHero
              ? 'bg-[#0A7CB3] hover:bg-blue-600 px-5 py-2.5 mr-2 rounded-xl text-xs font-bold shadow-xs'
              : 'w-7 h-7 mr-1 rounded-full bg-[#0A7CB3] hover:bg-[#086491]'
          }`}
          title="Search Curriculum"
        >
          {isHero ? (
            <span className="flex items-center gap-1.5">
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          ) : (
            <Search className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* AUTOCOMPLETE & TECH TAXONOMY FEED DROPDOWN */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0f1b33] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Header pill info */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 text-[#0A7CB3] dark:text-sky-400">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>Open-Source Technology Feed</span>
            </div>
            <span className="text-slate-400 dark:text-slate-500 font-normal">Press Enter to Search & Scroll</span>
          </div>

          {/* Suggestions List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                Type keywords like "AI", "NLP", "Raft", "Distributed Systems"...
              </div>
            ) : (
              suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onMouseDown={() => handleSelectSuggestion(item)}
                  className="px-4 py-2.5 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-colors cursor-pointer flex items-center justify-between gap-3 group text-left"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0A7CB3] dark:group-hover:text-sky-400 transition-colors flex items-center gap-2">
                      <span className="truncate">{item.name}</span>
                      {item.source === 'opensource' ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                          <Globe className="w-2.5 h-2.5" />
                          <span>OpenSource API</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[9px] bg-blue-50 dark:bg-blue-950/60 text-[#0A7CB3] dark:text-sky-300 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                          <span>Domain</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.domain} {item.description ? `· ${item.description}` : ''}
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-[#0A7CB3] dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))
            )}
          </div>

          {/* Trending Tech Pills */}
          <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
              <TrendingUp className="w-3 h-3 text-amber-500" />
              <span>Trending Disciplines & Subdomains</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {POPULAR_TECHNOLOGY_TAGS.map((tag, tIdx) => (
                <button
                  key={tIdx}
                  type="button"
                  onMouseDown={() => {
                    if (setSearchQuery) setSearchQuery(tag.query);
                    setIsOpen(false);
                    if (onSearch) onSearch(tag.query);
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-[#0A7CB3] dark:hover:bg-[#0A7CB3] text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-[#0A7CB3] dark:hover:border-[#0A7CB3] rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

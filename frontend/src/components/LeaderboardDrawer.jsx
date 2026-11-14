import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, Medal, Award, Crown, Star, Sparkles, CheckCircle2, 
  ChevronRight, Edit3, Plus, X, Search, Filter, RefreshCw, 
  Eye, Shield, User, GraduationCap, Flame, ArrowRight, Save
} from 'lucide-react';
import { api } from '../apiService';

export default function LeaderboardDrawer({
  isOpen,
  onClose,
  currentUser,
  courses = [],
  showToast
}) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRanking, setEditingRanking] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for faculty edit
  const [editForm, setEditForm] = useState({
    points: 0,
    rank: 1,
    grade_pct: 0,
    badge_text: '',
    faculty_notes: '',
    lessons_completed: 0,
    tasks_completed: 0,
    student_title: ''
  });

  // Form states for faculty add
  const [addForm, setAddForm] = useState({
    student_name: '',
    student_email: '',
    student_title: 'Systems Engineering Fellow',
    course_id: '',
    points: 750,
    rank: 1,
    grade_pct: 85,
    badge_text: 'Top Performer',
    faculty_notes: 'Enrolled in academic cohort with verified milestones.',
    lessons_completed: 5,
    tasks_completed: 1
  });

  const isFaculty = currentUser && (
    currentUser.role === 'admin' || 
    currentUser.role === 'faculty' || 
    currentUser.role === 'instructor'
  );

  // Load leaderboard from API
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.getLeaderboard(selectedCourseId ? parseInt(selectedCourseId) : null);
      if (res && res.rankings) {
        setRankings(res.rankings);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, selectedCourseId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (editingRanking) {
          setEditingRanking(null);
        } else if (isAddModalOpen) {
          setIsAddModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingRanking, isAddModalOpen, onClose]);

  // Filtered rankings by search
  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return rankings;
    const q = searchQuery.toLowerCase();
    return rankings.filter(r => 
      r.student_name?.toLowerCase().includes(q) ||
      r.student_email?.toLowerCase().includes(q) ||
      r.student_title?.toLowerCase().includes(q) ||
      r.badge_text?.toLowerCase().includes(q)
    );
  }, [rankings, searchQuery]);

  // Top 3 Podium
  const topThree = useMemo(() => {
    return rankings.slice(0, 3);
  }, [rankings]);

  // Open Edit Modal for Faculty
  const handleOpenEdit = (ranking) => {
    if (!isFaculty) return;
    setEditingRanking(ranking);
    setEditForm({
      points: ranking.points || 0,
      rank: ranking.rank || 1,
      grade_pct: ranking.grade_pct || 0,
      badge_text: ranking.badge_text || 'Top Performer',
      faculty_notes: ranking.faculty_notes || '',
      lessons_completed: ranking.lessons_completed || 0,
      tasks_completed: ranking.tasks_completed || 0,
      student_title: ranking.student_title || ''
    });
  };

  // Submit Edit by Faculty
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!isFaculty || !editingRanking) return;

    setIsSaving(true);
    try {
      const res = await api.updateLeaderboardRanking(editingRanking.id, editForm);
      if (res && res.success) {
        if (showToast) showToast(`Successfully updated ranking for ${editingRanking.student_name}`);
        setEditingRanking(null);
        fetchLeaderboard();
      } else {
        alert(res?.error || 'Failed to update student ranking');
      }
    } catch (err) {
      alert(err.message || 'Error updating student ranking');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Add by Faculty
  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!isFaculty) return;

    if (!addForm.student_name.trim() || !addForm.student_email.trim()) {
      alert('Student name and email are required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.createLeaderboardRanking(addForm);
      if (res && res.success) {
        if (showToast) showToast(`Added ${addForm.student_name} to academic leaderboard`);
        setIsAddModalOpen(false);
        setAddForm({
          student_name: '',
          student_email: '',
          student_title: 'Systems Engineering Fellow',
          course_id: '',
          points: 750,
          rank: 1,
          grade_pct: 85,
          badge_text: 'Top Performer',
          faculty_notes: 'Enrolled in academic cohort with verified milestones.',
          lessons_completed: 5,
          tasks_completed: 1
        });
        fetchLeaderboard();
      } else {
        alert(res?.error || 'Failed to add student to leaderboard');
      }
    } catch (err) {
      alert(err.message || 'Error creating student ranking');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-2xl bg-[#081325] text-white border-l border-[#1b3d63] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
          
          {/* 1. TOP HEADER */}
          <div className="p-5 sm:p-6 bg-[#0B1A2F] border-b border-[#1b3d63] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-[#081325] rounded-[14px] flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                    Academic Leaderboard
                  </h2>
                  {isFaculty ? (
                    <span className="inline-flex items-center gap-1 bg-blue-900/60 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Shield className="w-3 h-3 text-blue-400" />
                      <span>Faculty Mode (Editable)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Eye className="w-3 h-3 text-emerald-400" />
                      <span>Learner Standings (Read-Only)</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  Real-time technical cohort rankings, verified scores & faculty commendations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchLeaderboard}
                title="Refresh Standings"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer border border-[#1b3d63]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer border border-[#1b3d63]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. FILTER & ACTION BAR */}
          <div className="p-4 bg-[#0a182d] border-b border-[#1b3d63] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {/* Course Selector */}
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-[#0e213b] border border-[#1b3d63] text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-medium truncate max-w-[200px]"
              >
                <option value="">All Programs (Global Academy)</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              {/* Search input */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0e213b] border border-[#1b3d63] text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 outline-none focus:border-blue-500 placeholder-slate-500"
                />
              </div>
            </div>

            {/* Faculty Action: Add Student */}
            {isFaculty && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#0056D2] hover:bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Student to Board</span>
              </button>
            )}
          </div>

          {/* 3. LEADERBOARD CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

            {/* TOP 3 PODIUM DISPLAY */}
            {topThree.length >= 3 && !searchQuery && (
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-2">
                
                {/* 2nd Place (Silver) */}
                <div className="bg-gradient-to-b from-[#10233d] to-[#0a172a] border border-slate-400/30 rounded-2xl p-3 flex flex-col items-center text-center relative mt-4 shadow-md">
                  <div className="absolute -top-3.5 w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 font-black text-xs flex items-center justify-center shadow-md border-2 border-[#081325]">
                    2
                  </div>
                  <img
                    src={topThree[1].student_avatar || '/avatars/3d/memo_5.png'}
                    alt={topThree[1].student_name}
                    onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_5.png'; }}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-300/50 mt-1"
                  />
                  <h4 className="text-xs font-bold text-white truncate max-w-full mt-2">
                    {topThree[1].student_name}
                  </h4>
                  <div className="text-[10px] text-slate-400 truncate max-w-full">
                    {topThree[1].student_title}
                  </div>
                  <div className="mt-2 bg-slate-400/10 border border-slate-400/20 rounded-lg px-2 py-0.5 text-xs font-extrabold text-slate-200">
                    {topThree[1].points} pts
                  </div>
                  <span className="text-[9px] font-bold text-slate-300 mt-1 line-clamp-1">
                    {topThree[1].badge_text}
                  </span>
                </div>

                {/* 1st Place (Gold - Elevated Center) */}
                <div className="bg-gradient-to-b from-[#1b3459] via-[#132744] to-[#0c182c] border-2 border-amber-400/60 rounded-2xl p-3.5 flex flex-col items-center text-center relative shadow-xl shadow-amber-500/10 -mt-2">
                  <div className="absolute -top-4 w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-amber-950 font-black text-sm flex items-center justify-center shadow-lg border-2 border-[#081325]">
                    <Crown className="w-4 h-4 fill-current" />
                  </div>
                  <img
                    src={topThree[0].student_avatar || '/avatars/3d/memo_13.png'}
                    alt={topThree[0].student_name}
                    onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_13.png'; }}
                    className="w-14 h-14 rounded-full object-cover ring-4 ring-amber-400/60 mt-1 shadow-lg"
                  />
                  <h4 className="text-xs sm:text-sm font-black text-amber-300 truncate max-w-full mt-2">
                    {topThree[0].student_name}
                  </h4>
                  <div className="text-[10px] text-slate-300 truncate max-w-full">
                    {topThree[0].student_title}
                  </div>
                  <div className="mt-2 bg-amber-400/20 border border-amber-400/40 rounded-lg px-2.5 py-1 text-xs font-black text-amber-300 flex items-center gap-1 shadow-xs">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{topThree[0].points} pts</span>
                  </div>
                  <span className="text-[9px] font-bold bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 mt-1 line-clamp-1">
                    {topThree[0].badge_text}
                  </span>
                </div>

                {/* 3rd Place (Bronze) */}
                <div className="bg-gradient-to-b from-[#10233d] to-[#0a172a] border border-amber-700/40 rounded-2xl p-3 flex flex-col items-center text-center relative mt-6 shadow-md">
                  <div className="absolute -top-3.5 w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 font-black text-xs flex items-center justify-center shadow-md border-2 border-[#081325]">
                    3
                  </div>
                  <img
                    src={topThree[2].student_avatar || '/avatars/3d/memo_17.png'}
                    alt={topThree[2].student_name}
                    onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_17.png'; }}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-600/40 mt-1"
                  />
                  <h4 className="text-xs font-bold text-white truncate max-w-full mt-2">
                    {topThree[2].student_name}
                  </h4>
                  <div className="text-[10px] text-slate-400 truncate max-w-full">
                    {topThree[2].student_title}
                  </div>
                  <div className="mt-2 bg-amber-700/20 border border-amber-700/30 rounded-lg px-2 py-0.5 text-xs font-extrabold text-amber-300">
                    {topThree[2].points} pts
                  </div>
                  <span className="text-[9px] font-bold text-amber-400/90 mt-1 line-clamp-1">
                    {topThree[2].badge_text}
                  </span>
                </div>

              </div>
            )}

            {/* FULL STANDINGS ROSTER */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-2">
                <span>Rank & Candidate</span>
                <span>Milestones & Standing</span>
              </div>

              {filteredRankings.length === 0 ? (
                <div className="text-center py-12 bg-[#0e213b] rounded-2xl border border-[#1b3d63] p-6 space-y-2">
                  <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No student rankings found</p>
                  <p className="text-xs text-slate-500">Try adjusting your program filter or search query.</p>
                </div>
              ) : (
                filteredRankings.map((student, idx) => {
                  const isTopOne = student.rank === 1;
                  const isTopTwo = student.rank === 2;
                  const isTopThree = student.rank === 3;
                  const isSelf = student.is_current_user;

                  return (
                    <div
                      key={student.id || idx}
                      className={`rounded-2xl p-3.5 sm:p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelf
                          ? 'bg-[#122a4a] border-[#0056D2] shadow-md ring-1 ring-[#0056D2]/50'
                          : isTopOne
                          ? 'bg-[#0f2440] border-amber-400/40 hover:border-amber-400 shadow-xs'
                          : 'bg-[#0c1c33] border-[#1b3d63] hover:border-slate-500/50'
                      }`}
                    >
                      {/* Left: Rank, Avatar, Name & Title */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${
                          isTopOne
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 font-black'
                            : isTopTwo
                            ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 font-black'
                            : isTopThree
                            ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 font-black'
                            : 'bg-[#163154] text-slate-300 border border-[#224b78]'
                        }`}>
                          #{student.rank}
                        </div>

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={student.student_avatar || '/avatars/3d/memo_13.png'}
                            alt={student.student_name}
                            onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_13.png'; }}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30"
                          />
                          {isTopOne && (
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[10px] shadow-xs">
                              <Crown className="w-2.5 h-2.5 fill-current" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs sm:text-sm truncate">
                              {student.student_name}
                            </span>
                            {isSelf && (
                              <span className="bg-[#0056D2] text-white px-1.5 py-0.2 rounded text-[10px] font-black tracking-wider uppercase">
                                You
                              </span>
                            )}
                            <span className="bg-[#102747] text-[#38bdf8] border border-blue-500/30 px-2 py-0.2 rounded-full text-[10px] font-semibold truncate max-w-[140px]">
                              {student.badge_text}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                            {student.student_title}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[240px]">
                            {student.course_title}
                          </div>
                        </div>
                      </div>

                      {/* Right: Scores & Faculty Controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pl-11 sm:pl-0 border-t sm:border-t-0 border-[#1b3d63] pt-2 sm:pt-0">
                        {/* Metrics */}
                        <div className="text-left sm:text-right">
                          <div className="flex items-center sm:justify-end gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-black text-amber-300">
                              {student.points}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">pts</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{student.grade_pct}% grade</span>
                            <span>·</span>
                            <span>{student.lessons_completed} lessons</span>
                            <span>·</span>
                            <span>{student.tasks_completed} tasks</span>
                          </div>
                        </div>

                        {/* Faculty Edit Button */}
                        {isFaculty && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(student)}
                            className="bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                            title="Edit Student Standings & Metrics"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Faculty Commendation Footer Notice */}
            <div className="bg-[#0b1a2f] border border-[#1b3d63] rounded-2xl p-4 text-xs text-slate-400 space-y-1">
              <div className="font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Accredited Academic Standings Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Rankings reflect continuous evaluation across hands-on engineering deliverables, distributed architecture milestone completions, and faculty peer code evaluations. Students maintain active standing across all enrolled specialization modules.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* 4. FACULTY EDIT RANKING MODAL */}
      {isFaculty && editingRanking && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B1A2F] border border-[#1b3d63] rounded-3xl max-w-lg w-full text-white shadow-2xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b3d63]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-400/30 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Edit Student Standings
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingRanking.student_name} ({editingRanking.student_email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRanking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Total Points
                  </label>
                  <input
                    type="number"
                    value={editForm.points}
                    onChange={(e) => setEditForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Rank Position
                  </label>
                  <input
                    type="number"
                    value={editForm.rank}
                    onChange={(e) => setEditForm(prev => ({ ...prev, rank: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Grade Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.grade_pct}
                    onChange={(e) => setEditForm(prev => ({ ...prev, grade_pct: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Distinction Badge
                  </label>
                  <input
                    type="text"
                    value={editForm.badge_text}
                    onChange={(e) => setEditForm(prev => ({ ...prev, badge_text: e.target.value }))}
                    placeholder="e.g. Top Architect, High Honors"
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Lessons Completed
                  </label>
                  <input
                    type="number"
                    value={editForm.lessons_completed}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lessons_completed: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Tasks Evaluated
                  </label>
                  <input
                    type="number"
                    value={editForm.tasks_completed}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tasks_completed: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Faculty Commendation Notes
                </label>
                <textarea
                  rows="2"
                  value={editForm.faculty_notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, faculty_notes: e.target.value }))}
                  placeholder="Notes on student performance, consensus modeling, deliverable quality..."
                  className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b3d63]">
                <button
                  type="button"
                  onClick={() => setEditingRanking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#0056D2] hover:bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Ranking Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. FACULTY ADD STUDENT MODAL */}
      {isFaculty && isAddModalOpen && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B1A2F] border border-[#1b3d63] rounded-3xl max-w-lg w-full text-white shadow-2xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b3d63]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-400/30 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Add Student to Leaderboard
                  </h3>
                  <p className="text-xs text-slate-400">
                    Assign initial academic points and rank standing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    value={addForm.student_name}
                    onChange={(e) => setAddForm(prev => ({ ...prev, student_name: e.target.value }))}
                    placeholder="e.g. Alex Morgan"
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Student Email
                  </label>
                  <input
                    type="email"
                    value={addForm.student_email}
                    onChange={(e) => setAddForm(prev => ({ ...prev, student_email: e.target.value }))}
                    placeholder="alex@enterprise.io"
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Professional Title
                </label>
                <input
                  type="text"
                  value={addForm.student_title}
                  onChange={(e) => setAddForm(prev => ({ ...prev, student_title: e.target.value }))}
                  placeholder="e.g. Senior Infrastructure Engineer"
                  className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Initial Points
                  </label>
                  <input
                    type="number"
                    value={addForm.points}
                    onChange={(e) => setAddForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Rank Position
                  </label>
                  <input
                    type="number"
                    value={addForm.rank}
                    onChange={(e) => setAddForm(prev => ({ ...prev, rank: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Distinction Badge
                  </label>
                  <input
                    type="text"
                    value={addForm.badge_text}
                    onChange={(e) => setAddForm(prev => ({ ...prev, badge_text: e.target.value }))}
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Assigned Course Program
                  </label>
                  <select
                    value={addForm.course_id}
                    onChange={(e) => setAddForm(prev => ({ ...prev, course_id: e.target.value }))}
                    className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                  >
                    <option value="">Global Academy Standings</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Faculty Commendation Notes
                </label>
                <textarea
                  rows="2"
                  value={addForm.faculty_notes}
                  onChange={(e) => setAddForm(prev => ({ ...prev, faculty_notes: e.target.value }))}
                  placeholder="Initial faculty evaluation notes..."
                  className="w-full bg-[#081325] border border-[#1b3d63] rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b3d63]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#0056D2] hover:bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Adding...' : 'Add to Board'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

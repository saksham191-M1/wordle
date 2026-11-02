import React, { useState } from 'react';
import { X, Users, Plus, ArrowRight, Sparkles, Trophy, LogOut, Shield, Swords, Zap, Timer, Target } from 'lucide-react';
import { User } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut, signInAnonymously } from '../firebase.ts';
import { RoomFormat, SprintLimitType } from '../types/multiplayer.ts';
import { CreateRoomOptions } from '../utils/multiplayer.ts';

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onCreateRoom: (options: CreateRoomOptions) => void;
  onJoinRoom: (code: string) => void;
  isCreatingOrJoining: boolean;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateRoom,
  onJoinRoom,
  isCreatingOrJoining,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<RoomFormat>('sprint');
  const [sprintLimitType, setSprintLimitType] = useState<SprintLimitType>('words');
  const [sprintTargetWords, setSprintTargetWords] = useState<number>(3);
  const [sprintTimeLimitSeconds, setSprintTimeLimitSeconds] = useState<number>(180);
  const [joinCode, setJoinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setErrorMsg(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (!msg.includes('closed-by-user')) {
        setErrorMsg('Sign-in failed. You can also play as Guest.');
      }
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setErrorMsg(null);
      await signInAnonymously(auth);
    } catch {
      setErrorMsg('Guest sign-in failed. Please try Google Sign-In.');
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setErrorMsg(null);
    onJoinRoom(joinCode.trim().toUpperCase());
  };

  const handleCreate = () => {
    onCreateRoom({
      format: selectedFormat,
      sprintLimitType,
      sprintTargetWords,
      sprintTimeLimitSeconds,
    });
  };

  const FORMAT_OPTIONS: Array<{
    id: RoomFormat;
    label: string;
    badge: string;
    desc: string;
    icon: 'zap' | 'shield' | 'swords' | 'users';
  }> = [
    {
      id: 'sprint',
      label: 'Fastest Finger First (Sprint)',
      badge: 'Up to 8 Players · Most Popular',
      desc: 'Same word across all players! First to solve gets +1 pt, then the next word appears.',
      icon: 'zap',
    },
    {
      id: '2v2',
      label: '2 vs 2 Team Battle',
      badge: '4 Players',
      desc: 'Team Emerald vs Team Amber! Shared board & co-op guesses.',
      icon: 'shield',
    },
    {
      id: '3v3',
      label: '3 vs 3 Team Battle',
      badge: '6 Players',
      desc: '3 players per team strategizing together to crack the word first.',
      icon: 'shield',
    },
    {
      id: '1v1',
      label: '1 vs 1 Head-to-Head',
      badge: '2 Players',
      desc: 'Direct classic duel between two players on 1 word.',
      icon: 'swords',
    },
    {
      id: 'ffa',
      label: 'Classic Free-For-All',
      badge: 'Up to 8 Players',
      desc: 'Single-word race: whoever cracks the secret word first wins.',
      icon: 'users',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="multiplayer-modal-title"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <h2 id="multiplayer-modal-title" className="text-xl font-bold tracking-tight">
            Multiplayer Battle Rooms
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Compete in Fastest Finger First sprints, team battles (2v2, 3v3), or classic head-to-head duels!
        </p>

        {/* User Identity Header */}
        <div className="mb-5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          {currentUser ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Player'}
                    className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                    {(currentUser.displayName || currentUser.email || 'P')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="font-bold text-sm block text-slate-900 dark:text-white">
                    {currentUser.displayName || (currentUser.isAnonymous ? 'Guest Player' : currentUser.email?.split('@')[0])}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Ready to battle
                  </span>
                </div>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2.5 font-medium">
                Sign in to create or join multiplayer rooms:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleGoogleSignIn}
                  className="flex-1 py-2 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Sign in with Google
                </button>
                <button
                  onClick={handleGuestSignIn}
                  className="py-2 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition-colors"
                >
                  Play as Guest
                </button>
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Create Room Section */}
        <div className="mb-5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm block text-slate-900 dark:text-white flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-emerald-500" />
              Create Room Format
            </span>
            <button
              disabled={isCreatingOrJoining}
              onClick={handleCreate}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {isCreatingOrJoining ? 'Creating...' : 'Create Room'}
            </button>
          </div>

          {/* Format Radio Selection */}
          <div className="flex flex-col gap-2 mb-3">
            {FORMAT_OPTIONS.map(opt => {
              const isSelected = selectedFormat === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedFormat(opt.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      {opt.icon === 'zap' && <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      {opt.icon === 'shield' && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                      {opt.icon === 'swords' && <Swords className="w-3.5 h-3.5 text-emerald-500" />}
                      {opt.icon === 'users' && <Users className="w-3.5 h-3.5 text-slate-400" />}
                      {opt.label}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {opt.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Sprint Settings Customizer */}
          {selectedFormat === 'sprint' && (
            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
              <span className="font-bold text-amber-800 dark:text-amber-300 block mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Sprint Match Limit Rules:
              </span>

              {/* Limit Type Selector */}
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setSprintLimitType('words')}
                  className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                    sprintLimitType === 'words'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  Target Words
                </button>
                <button
                  type="button"
                  onClick={() => setSprintLimitType('time')}
                  className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                    sprintLimitType === 'time'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  Time Rush
                </button>
              </div>

              {/* Word Target Options */}
              {sprintLimitType === 'words' ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">Win condition:</span>
                  <div className="flex gap-1.5">
                    {[
                      { words: 3, label: 'First to 3' },
                      { words: 5, label: 'First to 5' },
                      { words: 7, label: 'First to 7' },
                    ].map(item => (
                      <button
                        key={item.words}
                        type="button"
                        onClick={() => setSprintTargetWords(item.words)}
                        className={`px-2 py-1 text-[11px] font-bold rounded-md border ${
                          sprintTargetWords === item.words
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">Match duration:</span>
                  <div className="flex gap-1.5">
                    {[
                      { seconds: 120, label: '2 Mins' },
                      { seconds: 180, label: '3 Mins' },
                      { seconds: 300, label: '5 Mins' },
                    ].map(item => (
                      <button
                        key={item.seconds}
                        type="button"
                        onClick={() => setSprintTimeLimitSeconds(item.seconds)}
                        className={`px-2 py-1 text-[11px] font-bold rounded-md border ${
                          sprintTimeLimitSeconds === item.seconds
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Join Room by Code */}
        <form onSubmit={handleJoinSubmit} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 mb-4">
          <label htmlFor="room-code-input" className="font-bold text-sm block text-slate-900 dark:text-white mb-1">
            Join Any Room by Code
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Enter the 6-character room code from your teammate or host:
          </p>
          <div className="flex gap-2">
            <input
              id="room-code-input"
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. LEXI42"
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono uppercase tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={joinCode.trim().length < 4 || isCreatingOrJoining}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              Join
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Feature Explanations */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
          <p className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span><strong>Fastest Finger First:</strong> Speed deduction race across up to 8 players. First to solve gets +1 point!</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span><strong>2v2 & 3v3 Team Battles:</strong> Teammates share progress and cooperate to solve the word first.</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span><strong>Live Progress:</strong> Opponents' tile patterns update on mini-boards with zero spoilers.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

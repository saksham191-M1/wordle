import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Play,
  RotateCcw,
  LogOut,
  Crown,
  Users,
  Shield,
  ArrowLeftRight,
  Flame,
  Zap,
  Timer,
  Trophy,
} from 'lucide-react';
import { RoomData, RoomPlayerData, PlayerTeam } from '../types/multiplayer.ts';

interface MultiplayerRoomBarProps {
  room: RoomData;
  players: RoomPlayerData[];
  currentUserId: string;
  isHost: boolean;
  onStartGame: () => void;
  onRematch: () => void;
  onLeaveRoom: () => void;
  onSwitchTeam?: (team: PlayerTeam) => void;
  onTimeExpired?: () => void;
  highContrast: boolean;
}

export const MultiplayerRoomBar: React.FC<MultiplayerRoomBarProps> = ({
  room,
  players,
  currentUserId,
  isHost,
  onStartGame,
  onRematch,
  onLeaveRoom,
  onSwitchTeam,
  onTimeExpired,
  highContrast,
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Timer countdown for Time Rush Sprint mode
  useEffect(() => {
    if (room.format !== 'sprint' || room.sprintLimitType !== 'time' || room.status !== 'PLAYING' || !room.sprintExpiresAt) {
      setTimeLeftSeconds(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.round((room.sprintExpiresAt! - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
      if (remaining <= 0 && isHost && onTimeExpired) {
        onTimeExpired();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room.format, room.sprintLimitType, room.status, room.sprintExpiresAt, isHost, onTimeExpired]);

  const isTeamBattle = room.format === '2v2' || room.format === '3v3';
  const isSprint = room.format === 'sprint';
  const teamAPlayers = players.filter(p => p.team === 'teamA');
  const teamBPlayers = players.filter(p => p.team === 'teamB');
  const myPlayer = players.find(p => p.uid === currentUserId);
  const myTeam = myPlayer?.team || 'none';

  const formatLabels: Record<string, string> = {
    '1v1': '1 vs 1 Head-to-Head',
    '2v2': '2 vs 2 Team Battle',
    '3v3': '3 vs 3 Team Battle',
    ffa: 'Free-For-All',
    sprint: 'Fastest Finger First',
  };

  const opponents = isTeamBattle
    ? players.filter(p => p.team !== myTeam && p.uid !== currentUserId)
    : players.filter(p => p.uid !== currentUserId);

  // Sprint Score Leaderboard sorted by score
  const sprintLeaderboard = isSprint
    ? [...players].sort((a, b) => {
        const scoreA = room.scores?.[a.uid] || a.score || 0;
        const scoreB = room.scores?.[b.uid] || b.score || 0;
        return scoreB - scoreA;
      })
    : [];

  const formatTimerString = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-2 px-2 flex flex-col gap-2">
      {/* Room Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          {/* Room Code Badge */}
          <div className="flex items-center gap-1 font-mono font-bold text-sm bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-2xs">
            <span className="text-slate-400 font-sans text-xs">CODE:</span>
            <span>{room.code}</span>
            <button
              onClick={handleCopyCode}
              className="ml-1 p-0.5 text-slate-400 hover:text-emerald-500 transition-colors"
              title="Copy room code"
              aria-label="Copy room code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Mode & Player Count Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            <span
              className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${
                isSprint
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              {isSprint && <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />}
              {formatLabels[room.format] || room.format}
              {isSprint && room.status === 'PLAYING' && ` · R${room.roundNumber || 1}`}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Users className="w-3.5 h-3.5" />
              {players.length} {players.length === 1 ? 'player' : 'players'}
            </span>
          </div>
        </div>

        {/* Action Controls & Match Timer */}
        <div className="flex items-center gap-2">
          {/* Live Timer in Sprint Time Rush */}
          {timeLeftSeconds !== null && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono font-bold text-xs">
              <Timer className="w-3.5 h-3.5 animate-pulse" />
              <span>{formatTimerString(timeLeftSeconds)}</span>
            </div>
          )}

          {room.status === 'WAITING' && isHost && (
            <button
              onClick={onStartGame}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Match
            </button>
          )}

          {room.status === 'WAITING' && !isHost && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
              Waiting for host...
            </span>
          )}

          {room.status === 'FINISHED' && (
            <div className="flex items-center gap-2">
              {room.winningTeam ? (
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  {room.winningTeam === 'teamA' ? 'Team Emerald' : 'Team Amber'} Won!
                </span>
              ) : room.winnerName ? (
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  {room.winnerName} won!
                </span>
              ) : null}

              {isHost && (
                <button
                  onClick={onRematch}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  Rematch
                </button>
              )}
            </div>
          )}

          <button
            onClick={onLeaveRoom}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Leave room"
            aria-label="Leave room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fastest Finger First (Sprint) Live Leaderboard Strip */}
      {isSprint && (
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Sprint Leaderboard
              <span className="font-normal text-[11px] text-slate-400">
                ({room.sprintLimitType === 'time' ? 'Time Rush' : `First to ${room.sprintTargetWords || 3} words`})
              </span>
            </span>

            {room.roundWinnerName && room.status === 'PLAYING' && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-pulse flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-500" />
                {room.roundWinnerName} cracked {room.roundWinnerWord}! (+1 pt)
              </span>
            )}
          </div>

          {/* Player Score Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {sprintLeaderboard.map((p, idx) => {
              const score = room.scores?.[p.uid] || p.score || 0;
              const isMe = p.uid === currentUserId;
              return (
                <div
                  key={p.uid}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    isMe
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] opacity-75">#{idx + 1}</span>
                  <span className="truncate max-w-[90px]">{p.displayName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[11px] font-black ${
                      isMe ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {score} {score === 1 ? 'pt' : 'pts'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Battle Lobby / Rosters (2v2 & 3v3) */}
      {isTeamBattle && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Team Emerald */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              myTeam === 'teamA'
                ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 fill-emerald-500/20" />
                Team Emerald
                {myTeam === 'teamA' && <span className="text-[10px] text-emerald-500 font-normal">(Your Team)</span>}
              </span>
              {room.status === 'WAITING' && onSwitchTeam && myTeam !== 'teamA' && (
                <button
                  onClick={() => onSwitchTeam('teamA')}
                  className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  Join
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {teamAPlayers.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">No players yet</span>
              ) : (
                teamAPlayers.map(p => (
                  <span
                    key={p.uid}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                      p.uid === currentUserId
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {p.displayName}
                    {p.uid === room.hostId && <Crown className="w-2.5 h-2.5 text-amber-400 fill-current" />}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Team Amber */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              myTeam === 'teamB'
                ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500/20" />
                Team Amber
                {myTeam === 'teamB' && <span className="text-[10px] text-amber-500 font-normal">(Your Team)</span>}
              </span>
              {room.status === 'WAITING' && onSwitchTeam && myTeam !== 'teamB' && (
                <button
                  onClick={() => onSwitchTeam('teamB')}
                  className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  Join
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {teamBPlayers.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">No players yet</span>
              ) : (
                teamBPlayers.map(p => (
                  <span
                    key={p.uid}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                      p.uid === currentUserId
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {p.displayName}
                    {p.uid === room.hostId && <Crown className="w-2.5 h-2.5 text-amber-400 fill-current" />}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Opponents Live Mini-Boards (when playing or finished) */}
      {room.status !== 'WAITING' && opponents.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">
            {isTeamBattle ? 'Rival Team Progress:' : 'Opponents:'}
          </span>
          {opponents.map(opp => {
            return (
              <div
                key={opp.uid}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[85px]">
                      {opp.displayName}
                    </span>
                    {opp.hasWon && <Crown className="w-3 h-3 text-amber-500 fill-current" />}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isSprint
                      ? `${room.scores?.[opp.uid] || opp.score || 0} pts · ${opp.attempts}/6 tries`
                      : opp.hasWon
                      ? 'Solved!'
                      : opp.hasLost
                      ? 'Failed'
                      : `${opp.attempts}/6 tries`}
                  </span>
                </div>

                {/* Mini Emoji / Colored Progress Grid */}
                <div className="flex flex-col gap-0.5">
                  {Array.from({ length: 6 }).map((_, rIdx) => {
                    const rowChars = opp.emojiRows?.[rIdx]?.split('') || [];
                    return (
                      <div key={rIdx} className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, cIdx) => {
                          const char = rowChars[cIdx];
                          let bg = 'bg-slate-200 dark:bg-slate-800';
                          if (char === '🟩' || char === '🟧') {
                            bg = highContrast ? 'bg-orange-500' : 'bg-emerald-500';
                          } else if (char === '🟨' || char === '🟦') {
                            bg = highContrast ? 'bg-sky-500' : 'bg-amber-500';
                          } else if (char === '⬛' || char === '⬜') {
                            bg = 'bg-slate-400 dark:bg-slate-700';
                          }
                          return (
                            <div
                              key={cIdx}
                              className={`w-2 h-2 rounded-2xs ${bg}`}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

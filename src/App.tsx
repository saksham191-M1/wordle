import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInAnonymously } from './firebase.ts';
import { GameMode, GameSettings, GameStatus, EvaluatedLetter, UserStats } from './types/game.ts';
import { RoomData, RoomPlayerData, RoomFormat, PlayerTeam } from './types/multiplayer.ts';
import { getDailyWordAndIndex, getRandomWord, isValidWord } from './data/words.ts';
import { evaluateGuess, checkHardModeConstraints, getKeyboardStatuses, generateShareText } from './utils/gameLogic.ts';
import { soundManager } from './utils/audio.ts';
import {
  createRoom,
  joinRoomByCode,
  startRoomGame,
  switchPlayerTeam,
  updatePlayerProgress,
  rematchRoom,
  leaveRoom,
  subscribeToRoom,
  subscribeToPlayers,
  endSprintTimeMatch,
  CreateRoomOptions,
} from './utils/multiplayer.ts';
import {
  loadSettings,
  saveSettings,
  loadDailyState,
  saveDailyState,
  loadDailyStats,
  saveDailyStats,
  loadPracticeStats,
  savePracticeStats,
  loadRecentPracticeWords,
  saveRecentPracticeWord,
  recordCompletedGame,
  DEFAULT_STATS,
} from './utils/storage.ts';

import { Header } from './components/Header.tsx';
import { GameBoard } from './components/GameBoard.tsx';
import { Keyboard } from './components/Keyboard.tsx';
import { Toast } from './components/Toast.tsx';
import { HelpModal } from './components/HelpModal.tsx';
import { StatsModal } from './components/StatsModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal.tsx';
import { MultiplayerRoomBar } from './components/MultiplayerRoomBar.tsx';

export default function App() {
  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  // Active Mode
  const [mode, setMode] = useState<GameMode>('daily');

  // Daily puzzle metadata (UTC deterministic)
  const [{ word: dailyWord, dayIndex: dailyDayIndex, dateString: dailyDateString, dateKey: dailyDateKey }] = useState(() =>
    getDailyWordAndIndex()
  );

  // Active Game State
  const [targetWord, setTargetWord] = useState<string>(dailyWord);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<GameStatus>('IN_PROGRESS');
  const [evaluatedRows, setEvaluatedRows] = useState<EvaluatedLetter[][]>([]);

  // Animation & Interaction Flags
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isInvalidShake, setIsInvalidShake] = useState<boolean>(false);
  const [wonRowIndex, setWonRowIndex] = useState<number | null>(null);

  // Modals & Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Multiplayer State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCreatingOrJoining, setIsCreatingOrJoining] = useState<boolean>(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayerData[]>([]);

  // Stats
  const [dailyStats, setDailyStats] = useState<UserStats>(() => loadDailyStats());
  const [practiceStats, setPracticeStats] = useState<UserStats>(() => loadPracticeStats());
  const [celebrateStreak, setCelebrateStreak] = useState<boolean>(false);
  const streakCelebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (streakCelebrationTimeoutRef.current) {
        clearTimeout(streakCelebrationTimeoutRef.current);
      }
    };
  }, []);

  // Game Time Tracking
  const [gameStartTime, setGameStartTime] = useState<number>(() => Date.now());
  const [currentGameDuration, setCurrentGameDuration] = useState<number | null>(null);

  // Toast timeout ref
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show floating toast
  const showToast = useCallback((msg: string, duration = 2000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  }, []);

  // Sync theme with HTML document class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    soundManager.setEnabled(settings.soundEnabled);
    saveSettings(settings);
  }, [settings]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Listen to active multiplayer room & players
  useEffect(() => {
    if (!activeRoomId) {
      setActiveRoom(null);
      setRoomPlayers([]);
      return;
    }

    const unsubRoom = subscribeToRoom(activeRoomId, room => {
      if (!room) {
        showToast('Room has been closed');
        setActiveRoomId(null);
        setMode('practice');
        return;
      }
      setActiveRoom(room);

      // Synchronize target word on rematch or sprint round advance
      setTargetWord(prev => {
        if (prev !== room.targetWord) {
          setGuesses([]);
          setCurrentGuess('');
          setEvaluatedRows([]);
          setGameStatus('IN_PROGRESS');
          setWonRowIndex(null);
          setGameStartTime(Date.now());
          setCurrentGameDuration(null);
          if (room.format === 'sprint' && room.roundNumber && room.roundNumber > 1) {
            showToast(`Round ${room.roundNumber}! New word!`, 2000);
          }
        }
        return room.targetWord;
      });

      if (room.status === 'FINISHED') {
        if (room.winningTeam) {
          const myPlayer = auth.currentUser ? roomPlayers.find(p => p.uid === auth.currentUser?.uid) : null;
          if (myPlayer?.team === room.winningTeam) {
            setGameStatus('WON');
            showToast('Victory! Your team cracked the word first!', 4000);
          } else if (myPlayer?.team && myPlayer.team !== 'none') {
            setGameStatus('LOST');
            showToast(
              `Rival ${room.winningTeam === 'teamA' ? 'Team Emerald' : 'Team Amber'} solved the word!`,
              4000
            );
          }
        } else if (room.winnerId && room.winnerId !== auth.currentUser?.uid) {
          showToast(`${room.winnerName} guessed the word first!`, 3500);
        }
      }
    });

    const unsubPlayers = subscribeToPlayers(activeRoomId, players => {
      setRoomPlayers(players);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [activeRoomId, showToast, roomPlayers]);

  // Synchronize collaborative team board in 2v2 and 3v3 team modes
  useEffect(() => {
    if (mode !== 'multiplayer' || !activeRoom || !currentUser) return;
    const isTeamMode = activeRoom.format === '2v2' || activeRoom.format === '3v3';
    if (!isTeamMode) return;

    const myPlayer = roomPlayers.find(p => p.uid === currentUser.uid);
    if (!myPlayer || myPlayer.team === 'none') return;

    const teamGuesses = myPlayer.team === 'teamA' ? activeRoom.teamAGuesses : activeRoom.teamBGuesses;
    if (teamGuesses && teamGuesses.length > 0 && teamGuesses.length !== guesses.length) {
      setGuesses(teamGuesses);
      const evaluated = teamGuesses.map(g => evaluateGuess(g, activeRoom.targetWord));
      setEvaluatedRows(evaluated);
      setCurrentGuess('');

      if (teamGuesses.includes(activeRoom.targetWord)) {
        setGameStatus('WON');
        setWonRowIndex(teamGuesses.indexOf(activeRoom.targetWord));
        soundManager.playWinFanfare();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } else if (teamGuesses.length >= 6) {
        setGameStatus('LOST');
        soundManager.playDefeatSound();
      }
    }
  }, [mode, activeRoom, roomPlayers, currentUser, guesses.length]);

  // Initialize or load game for mode
  useEffect(() => {
    if (mode === 'multiplayer') {
      return;
    }

    if (mode === 'daily') {
      const savedDaily = loadDailyState(dailyDayIndex);
      if (savedDaily && savedDaily.dayIndex === dailyDayIndex) {
        setTargetWord(savedDaily.targetWord);
        setGuesses(savedDaily.guesses);
        setGameStatus(savedDaily.gameStatus);

        const evaluated = savedDaily.guesses.map(g => evaluateGuess(g, savedDaily.targetWord));
        setEvaluatedRows(evaluated);

        if (savedDaily.gameStatus === 'WON') {
          setWonRowIndex(savedDaily.guesses.length - 1);
        }

        if (savedDaily.completedTimeSeconds) {
          setCurrentGameDuration(savedDaily.completedTimeSeconds);
        } else if (savedDaily.startTime) {
          setGameStartTime(savedDaily.startTime);
          setCurrentGameDuration(null);
        } else {
          setGameStartTime(Date.now());
          setCurrentGameDuration(null);
        }
      } else {
        // New daily challenge
        setTargetWord(dailyWord);
        setGuesses([]);
        setCurrentGuess('');
        setGameStatus('IN_PROGRESS');
        setEvaluatedRows([]);
        setWonRowIndex(null);
        setGameStartTime(Date.now());
        setCurrentGameDuration(null);
      }
    } else {
      // Practice mode: start fresh practice word
      startNewPracticeGame();
    }
  }, [mode, dailyDayIndex, dailyWord]);

  // Start new practice game
  const startNewPracticeGame = () => {
    const recent = loadRecentPracticeWords();
    const newWord = getRandomWord(recent);
    saveRecentPracticeWord(newWord);

    setTargetWord(newWord);
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('IN_PROGRESS');
    setEvaluatedRows([]);
    setWonRowIndex(null);
    setIsEvaluating(false);
    setGameStartTime(Date.now());
    setCurrentGameDuration(null);
  };

  // Multiplayer Actions
  const handleCreateRoom = async (optionsOrFormat: RoomFormat | CreateRoomOptions = 'sprint') => {
    let user = currentUser;
    setIsCreatingOrJoining(true);
    try {
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      }
      const { roomId, code } = await createRoom(user, optionsOrFormat);
      setActiveRoomId(roomId);
      setMode('multiplayer');
      setIsLobbyOpen(false);
      setGuesses([]);
      setCurrentGuess('');
      setEvaluatedRows([]);
      setGameStatus('IN_PROGRESS');
      setWonRowIndex(null);
      setGameStartTime(Date.now());
      setCurrentGameDuration(null);
      showToast(`Room created! Code: ${code}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsCreatingOrJoining(false);
    }
  };

  const handleJoinRoom = async (code: string) => {
    let user = currentUser;
    setIsCreatingOrJoining(true);
    try {
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      }
      const roomId = await joinRoomByCode(code, user);
      setActiveRoomId(roomId);
      setMode('multiplayer');
      setIsLobbyOpen(false);
      setGuesses([]);
      setCurrentGuess('');
      setEvaluatedRows([]);
      setGameStatus('IN_PROGRESS');
      setWonRowIndex(null);
      setGameStartTime(Date.now());
      setCurrentGameDuration(null);
      showToast(`Joined room ${code}!`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsCreatingOrJoining(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (activeRoomId && currentUser) {
      await leaveRoom(activeRoomId, currentUser.uid);
    }
    setActiveRoomId(null);
    setActiveRoom(null);
    setRoomPlayers([]);
    setMode('practice');
    showToast('Left room');
  };

  const handleStartMatch = async () => {
    if (activeRoomId) {
      await startRoomGame(activeRoomId);
      setGameStartTime(Date.now());
      showToast('Match started! Good luck!');
    }
  };

  const handleSwitchTeam = async (newTeam: PlayerTeam) => {
    if (activeRoomId && currentUser) {
      await switchPlayerTeam(activeRoomId, currentUser.uid, newTeam);
      showToast(`Joined ${newTeam === 'teamA' ? 'Team Emerald' : 'Team Amber'}`);
    }
  };

  const handleRematch = async () => {
    if (activeRoomId) {
      const newWord = getRandomWord();
      await rematchRoom(activeRoomId, newWord);
      setGameStartTime(Date.now());
      showToast('New round started!');
    }
  };

  const handleSprintTimeExpired = async () => {
    if (activeRoomId) {
      await endSprintTimeMatch(activeRoomId);
      showToast('Time is up! Match ended!', 3500);
    }
  };

  // Keyboard letter input
  const handleChar = useCallback(
    (char: string) => {
      if (gameStatus !== 'IN_PROGRESS' || isEvaluating) return;
      if (currentGuess.length >= 5) return;

      soundManager.playKeyClick();
      setCurrentGuess(prev => prev + char.toUpperCase());
    },
    [gameStatus, isEvaluating, currentGuess.length]
  );

  // Backspace input
  const handleDelete = useCallback(() => {
    if (gameStatus !== 'IN_PROGRESS' || isEvaluating) return;
    if (currentGuess.length === 0) return;

    soundManager.playDeleteClick();
    setCurrentGuess(prev => prev.slice(0, -1));
  }, [gameStatus, isEvaluating, currentGuess.length]);

  // Submit guess
  const handleEnter = useCallback(() => {
    if (gameStatus !== 'IN_PROGRESS' || isEvaluating) return;

    if (currentGuess.length < 5) {
      soundManager.playInvalidThud();
      setIsInvalidShake(true);
      showToast('Not enough letters');
      setTimeout(() => setIsInvalidShake(false), 450);
      return;
    }

    // Hard Mode Check
    if (settings.hardMode) {
      const hardCheck = checkHardModeConstraints(currentGuess, evaluatedRows);
      if (!hardCheck.valid) {
        soundManager.playInvalidThud();
        setIsInvalidShake(true);
        showToast(hardCheck.message || 'Hard Mode violation');
        setTimeout(() => setIsInvalidShake(false), 450);
        return;
      }
    }

    // Dictionary Check
    if (!isValidWord(currentGuess)) {
      soundManager.playInvalidThud();
      setIsInvalidShake(true);
      showToast('Not in word list');
      setTimeout(() => setIsInvalidShake(false), 450);
      return;
    }

    // Begin flip evaluation
    const guessToEvaluate = currentGuess;
    const newEvaluation = evaluateGuess(guessToEvaluate, targetWord);
    const newGuesses = [...guesses, guessToEvaluate];
    const newEvaluatedRows = [...evaluatedRows, newEvaluation];

    setIsEvaluating(true);
    setGuesses(newGuesses);
    setEvaluatedRows(newEvaluatedRows);
    setCurrentGuess('');

    // Staggered audio flip sounds
    if (settings.soundEnabled && !settings.reducedMotion) {
      [0, 1, 2, 3, 4].forEach(i => {
        setTimeout(() => {
          soundManager.playTileFlip(i);
        }, i * 150 + 75);
      });
    }

    const totalFlipDuration = settings.reducedMotion ? 50 : 5 * 150 + 200;

    setTimeout(() => {
      setIsEvaluating(false);

      const isWin = guessToEvaluate === targetWord;
      const isLoss = !isWin && newGuesses.length >= 6;
      const durationSeconds = Math.max(1, Math.round((Date.now() - gameStartTime) / 1000));

      if (isWin) {
        setGameStatus('WON');
        setWonRowIndex(newGuesses.length - 1);
        setCurrentGameDuration(durationSeconds);
        soundManager.playWinFanfare();

        // Confetti celebration
        if (!settings.reducedMotion) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: settings.highContrast
              ? ['#f97316', '#38bdf8', '#fbbf24']
              : ['#10b981', '#34d399', '#f59e0b', '#10b981'],
          });
        }

        const victoryWords = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
        showToast(victoryWords[newGuesses.length - 1] || 'Splendid!');

        // Update stats
        updateStatsAfterGame(true, newGuesses.length, durationSeconds);

        // Save daily state if daily mode
        if (mode === 'daily') {
          saveDailyState({
            dayIndex: dailyDayIndex,
            dateString: dailyDateString,
            dateKey: dailyDateKey,
            targetWord,
            guesses: newGuesses,
            gameStatus: 'WON',
            startTime: gameStartTime,
            completedTimeSeconds: durationSeconds,
            completedAt: Date.now(),
          });

          // Trigger subtle celebration pulse on the daily streak badge
          setCelebrateStreak(true);
          if (streakCelebrationTimeoutRef.current) {
            clearTimeout(streakCelebrationTimeoutRef.current);
          }
          streakCelebrationTimeoutRef.current = setTimeout(() => {
            setCelebrateStreak(false);
          }, 2500);
        }

        // Sync multiplayer progress
        if (mode === 'multiplayer' && activeRoomId && currentUser) {
          const emojiRow = newEvaluation
            .map(t => (t.status === 'correct' ? '🟩' : t.status === 'present' ? '🟨' : '⬛'))
            .join('');
          const allEmojiRows = [
            ...evaluatedRows.map(r =>
              r.map(t => (t.status === 'correct' ? '🟩' : t.status === 'present' ? '🟨' : '⬛')).join('')
            ),
            emojiRow,
          ];

          const myPlayer = roomPlayers.find(p => p.uid === currentUser.uid);
          const isTeamBattle = activeRoom?.format === '2v2' || activeRoom?.format === '3v3';

          updatePlayerProgress({
            roomId: activeRoomId,
            user: currentUser,
            guesses: newGuesses,
            emojiRows: allEmojiRows,
            hasWon: true,
            hasLost: false,
            completionTime: durationSeconds,
            team: myPlayer?.team,
            isTeamBattle,
          });
        }

        if (mode !== 'multiplayer' || activeRoom?.format !== 'sprint') {
          setTimeout(() => setIsStatsOpen(true), 1600);
        }
      } else if (isLoss) {
        setGameStatus('LOST');
        setCurrentGameDuration(durationSeconds);
        soundManager.playDefeatSound();
        showToast(targetWord, 3500);

        // Update stats
        updateStatsAfterGame(false, newGuesses.length, durationSeconds);

        if (mode === 'daily') {
          saveDailyState({
            dayIndex: dailyDayIndex,
            dateString: dailyDateString,
            dateKey: dailyDateKey,
            targetWord,
            guesses: newGuesses,
            gameStatus: 'LOST',
            startTime: gameStartTime,
            completedTimeSeconds: durationSeconds,
            completedAt: Date.now(),
          });
        }

        // Sync multiplayer progress
        if (mode === 'multiplayer' && activeRoomId && currentUser) {
          const emojiRow = newEvaluation
            .map(t => (t.status === 'correct' ? '🟩' : t.status === 'present' ? '🟨' : '⬛'))
            .join('');
          const allEmojiRows = [
            ...evaluatedRows.map(r =>
              r.map(t => (t.status === 'correct' ? '🟩' : t.status === 'present' ? '🟨' : '⬛')).join('')
            ),
            emojiRow,
          ];

          const myPlayer = roomPlayers.find(p => p.uid === currentUser.uid);
          const isTeamBattle = activeRoom?.format === '2v2' || activeRoom?.format === '3v3';

          updatePlayerProgress({
            roomId: activeRoomId,
            user: currentUser,
            guesses: newGuesses,
            emojiRows: allEmojiRows,
            hasWon: false,
            hasLost: true,
            completionTime: durationSeconds,
            team: myPlayer?.team,
            isTeamBattle,
          });
        }

        if (mode !== 'multiplayer' || activeRoom?.format !== 'sprint') {
          setTimeout(() => setIsStatsOpen(true), 2000);
        }
      } else {
        // Save ongoing daily state
        if (mode === 'daily') {
          saveDailyState({
            dayIndex: dailyDayIndex,
            dateString: dailyDateString,
            dateKey: dailyDateKey,
            targetWord,
            guesses: newGuesses,
            gameStatus: 'IN_PROGRESS',
            startTime: gameStartTime,
          });
        }

        // Sync ongoing multiplayer progress
        if (mode === 'multiplayer' && activeRoomId && currentUser) {
          const emojiRow = newEvaluation
            .map(t => (t.status === 'correct' ? '🟩' : t.status === 'present' ? '🟨' : '⬛'))
            .join('');
          const allEmojiRows = [
            ...evaluatedRows.map(r =>
              r.map(t => (t.status === 'correct' ? '🟩' : t.status === 'present' ? '🟨' : '⬛')).join('')
            ),
            emojiRow,
          ];

          const myPlayer = roomPlayers.find(p => p.uid === currentUser.uid);
          const isTeamBattle = activeRoom?.format === '2v2' || activeRoom?.format === '3v3';

          updatePlayerProgress({
            roomId: activeRoomId,
            user: currentUser,
            guesses: newGuesses,
            emojiRows: allEmojiRows,
            hasWon: false,
            hasLost: false,
            team: myPlayer?.team,
            isTeamBattle,
          });
        }
      }
    }, totalFlipDuration);
  }, [
    gameStatus,
    isEvaluating,
    currentGuess,
    settings.hardMode,
    settings.soundEnabled,
    settings.reducedMotion,
    settings.highContrast,
    evaluatedRows,
    targetWord,
    guesses,
    mode,
    dailyDayIndex,
    dailyDateString,
    gameStartTime,
    activeRoomId,
    activeRoom,
    roomPlayers,
    currentUser,
    showToast,
  ]);

  // Update user stats
  const updateStatsAfterGame = (won: boolean, attempts: number, durationSeconds?: number) => {
    const isDaily = mode === 'daily';
    const currentStats = isDaily ? dailyStats : practiceStats;

    const { updatedStats } = recordCompletedGame({
      currentStats,
      isDaily,
      won,
      attempts,
      durationSeconds,
      dateKey: dailyDateKey,
      dayIndex: dailyDayIndex,
      targetWord,
      guesses,
    });

    if (isDaily) {
      setDailyStats(updatedStats);
      saveDailyStats(updatedStats);
    } else {
      setPracticeStats(updatedStats);
      savePracticeStats(updatedStats);
    }
  };

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or if any modal is open
      if (isHelpOpen || isStatsOpen || isSettingsOpen || isLobbyOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (gameStatus !== 'IN_PROGRESS' || isEvaluating) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleChar(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isHelpOpen,
    isStatsOpen,
    isSettingsOpen,
    isLobbyOpen,
    gameStatus,
    isEvaluating,
    handleEnter,
    handleDelete,
    handleChar,
  ]);

  // Share functionality with Web Share API and Clipboard fallback
  const handleShare = () => {
    const text = generateShareText({
      mode,
      dayIndex: mode === 'daily' ? dailyDayIndex : undefined,
      guessCount: guesses.length,
      won: gameStatus === 'WON',
      evaluatedRows,
      settings,
    });

    if (navigator.share) {
      navigator
        .share({
          title: 'LexiCraft Word Puzzle',
          text,
        })
        .then(() => {
          setIsCopied(true);
          showToast('Shared successfully!');
          setTimeout(() => setIsCopied(false), 2500);
        })
        .catch(() => {
          // Fallback to clipboard
          copyToClipboard(text);
        });
    } else {
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setIsCopied(true);
          showToast('Copied to clipboard!');
          setTimeout(() => setIsCopied(false), 2500);
        })
        .catch(() => {
          showToast('Failed to copy');
        });
    } else {
      showToast('Clipboard not available');
    }
  };

  const currentStats = mode === 'daily' ? dailyStats : practiceStats;
  const keyboardStatuses = getKeyboardStatuses(evaluatedRows);
  const isGameInProgress = guesses.length > 0 && gameStatus === 'IN_PROGRESS';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-400 transition-colors duration-200">
      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Header */}
      <Header
        mode={mode}
        onSelectMode={selectedMode => {
          if (selectedMode !== mode) {
            setMode(selectedMode);
          }
        }}
        dayIndex={dailyDayIndex}
        settings={settings}
        dailyStreak={dailyStats.currentStreak}
        celebrateStreak={celebrateStreak}
        onToggleSound={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
        onToggleTheme={() => setSettings(s => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMultiplayer={() => {
          if (activeRoomId) {
            setMode('multiplayer');
          } else {
            setIsLobbyOpen(true);
          }
        }}
        inRoomCode={activeRoom?.code}
      />

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col justify-between max-w-xl w-full mx-auto px-2">
        {mode === 'multiplayer' && activeRoom && (
          <MultiplayerRoomBar
            room={activeRoom}
            players={roomPlayers}
            currentUserId={currentUser?.uid || ''}
            isHost={activeRoom.hostId === currentUser?.uid}
            onStartGame={handleStartMatch}
            onRematch={handleRematch}
            onLeaveRoom={handleLeaveRoom}
            onSwitchTeam={handleSwitchTeam}
            onTimeExpired={handleSprintTimeExpired}
            highContrast={settings.highContrast}
          />
        )}

        <GameBoard
          guesses={guesses}
          evaluatedRows={evaluatedRows}
          currentGuess={currentGuess}
          isInvalidShake={isInvalidShake}
          isEvaluating={isEvaluating}
          wonRowIndex={wonRowIndex}
          highContrast={settings.highContrast}
          reducedMotion={settings.reducedMotion}
        />

        <Keyboard
          onChar={handleChar}
          onEnter={handleEnter}
          onDelete={handleDelete}
          keyStatuses={keyboardStatuses}
          disabled={
            gameStatus !== 'IN_PROGRESS' ||
            isEvaluating ||
            (mode === 'multiplayer' && activeRoom?.status === 'WAITING')
          }
          highContrast={settings.highContrast}
        />
      </main>

      {/* Footer / Status note */}
      <footer className="w-full text-center py-2 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-800/50">
        <span>LexiCraft</span> · <span>Daily & Practice Word Puzzle</span>
        {currentUser && (
          <span className="ml-2 text-slate-500">
            · Signed in as {currentUser.displayName || (currentUser.isAnonymous ? 'Guest' : currentUser.email?.split('@')[0])}
          </span>
        )}
      </footer>

      {/* Modals */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        settings={settings}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={currentStats}
        gameStatus={gameStatus}
        mode={mode}
        targetWord={targetWord}
        guessCount={guesses.length}
        gameDuration={currentGameDuration}
        onShare={handleShare}
        onPlayAgainPractice={() => {
          setIsStatsOpen(false);
          startNewPracticeGame();
        }}
        isCopied={isCopied}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={newPartial => setSettings(s => ({ ...s, ...newPartial }))}
        isGameInProgress={isGameInProgress}
        onResetPracticeStats={() => {
          setPracticeStats(DEFAULT_STATS);
          savePracticeStats(DEFAULT_STATS);
          showToast('Practice stats reset');
        }}
      />

      <MultiplayerLobbyModal
        isOpen={isLobbyOpen}
        onClose={() => setIsLobbyOpen(false)}
        currentUser={currentUser}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        isCreatingOrJoining={isCreatingOrJoining}
      />
    </div>
  );
}

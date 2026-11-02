import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { RoomData, RoomPlayerData, RoomFormat, PlayerTeam, SprintLimitType } from '../types/multiplayer.ts';
import { getRandomWord } from '../data/words.ts';

/** Generate clean 6-character room code (e.g. LEXI42) */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface CreateRoomOptions {
  format?: RoomFormat;
  customWord?: string;
  sprintLimitType?: SprintLimitType;
  sprintTargetWords?: number; // e.g. 3 or 5 words
  sprintTimeLimitSeconds?: number; // e.g. 180s = 3 mins
}

/** Create a new multiplayer room with format: 1v1, 2v2, 3v3, FFA, or Fastest Finger First Sprint */
export async function createRoom(
  user: User,
  optionsOrFormat: RoomFormat | CreateRoomOptions = 'ffa',
  legacyCustomWord?: string
): Promise<{ roomId: string; code: string }> {
  let format: RoomFormat = 'ffa';
  let customWord: string | undefined = legacyCustomWord;
  let sprintLimitType: SprintLimitType = 'words';
  let sprintTargetWords = 3;
  let sprintTimeLimitSeconds = 180;

  if (typeof optionsOrFormat === 'string') {
    format = optionsOrFormat;
  } else if (optionsOrFormat) {
    format = optionsOrFormat.format || 'ffa';
    customWord = optionsOrFormat.customWord;
    sprintLimitType = optionsOrFormat.sprintLimitType || 'words';
    sprintTargetWords = optionsOrFormat.sprintTargetWords || 3;
    sprintTimeLimitSeconds = optionsOrFormat.sprintTimeLimitSeconds || 180;
  }

  const code = generateRoomCode();
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const targetWord = (customWord || getRandomWord()).toUpperCase();
  const path = `rooms/${roomId}`;

  const isTeamMode = format === '2v2' || format === '3v3';
  const initialTeam: PlayerTeam = isTeamMode ? 'teamA' : 'none';

  const roomData: Omit<RoomData, 'id'> = {
    code,
    hostId: user.uid,
    hostName: user.displayName || user.email?.split('@')[0] || 'Player 1',
    status: 'WAITING',
    format,
    targetWord,
    roundNumber: 1,
    scores: { [user.uid]: 0 },
    sprintLimitType,
    sprintTargetWords,
    sprintTimeLimitSeconds,
    teamAGuesses: [],
    teamAEmojiRows: [],
    teamBGuesses: [],
    teamBEmojiRows: [],
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24-hour expiration window
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'rooms', roomId), { ...roomData, roomId });

    // Add host as first player
    const initialPlayer: RoomPlayerData = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Host',
      photoURL: user.photoURL || undefined,
      team: initialTeam,
      score: 0,
      guesses: [],
      emojiRows: [],
      attempts: 0,
      hasWon: false,
      hasLost: false,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'rooms', roomId, 'players', user.uid), initialPlayer);

    return { roomId, code };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/** Join an existing room via 6-character code */
export async function joinRoomByCode(code: string, user: User): Promise<string> {
  const cleanCode = code.trim().toUpperCase();
  const roomsRef = collection(db, 'rooms');
  const q = query(roomsRef, where('code', '==', cleanCode), limit(1));

  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      throw new Error('Room not found. Check the code and try again.');
    }

    const roomDoc = snapshot.docs[0];
    const room = roomDoc.data() as RoomData;
    const roomId = roomDoc.id;

    if (room.expiresAt && Date.now() > room.expiresAt) {
      throw new Error('This room has expired (older than 24 hours). Please create a new room.');
    }

    if (room.status === 'FINISHED') {
      throw new Error('This game has already finished. Ask host for a new room!');
    }

    // Check player capacity
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const existingPlayersSnap = await getDocs(playersRef);
    const existingPlayers = existingPlayersSnap.docs.map(d => d.data() as RoomPlayerData);

    const maxPlayersMap: Record<RoomFormat, number> = {
      '1v1': 2,
      '2v2': 4,
      '3v3': 6,
      ffa: 8,
      sprint: 8,
    };
    const maxCapacity = maxPlayersMap[room.format] || 8;
    const isAlreadyIn = existingPlayers.some(p => p.uid === user.uid);

    if (!isAlreadyIn && existingPlayers.length >= maxCapacity) {
      throw new Error(`Room is full (${room.format} capacity reached).`);
    }

    // Determine auto-balanced team for team formats
    let assignedTeam: PlayerTeam = 'none';
    if (room.format === '2v2' || room.format === '3v3') {
      const teamACount = existingPlayers.filter(p => p.team === 'teamA').length;
      const teamBCount = existingPlayers.filter(p => p.team === 'teamB').length;
      assignedTeam = teamACount <= teamBCount ? 'teamA' : 'teamB';
    }

    // Add player to room's players subcollection
    const playerRef = doc(db, 'rooms', roomId, 'players', user.uid);
    const existing = await getDoc(playerRef);

    if (!existing.exists()) {
      const playerData: RoomPlayerData = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || `Player ${cleanCode.slice(-2)}`,
        photoURL: user.photoURL || undefined,
        team: assignedTeam,
        score: 0,
        guesses: [],
        emojiRows: [],
        attempts: 0,
        hasWon: false,
        hasLost: false,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(playerRef, playerData);
    }

    return roomId;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'rooms');
    throw error;
  }
}

/** Switch team between Team A (Emerald) and Team B (Amber) */
export async function switchPlayerTeam(roomId: string, uid: string, newTeam: PlayerTeam) {
  const path = `rooms/${roomId}/players/${uid}`;
  try {
    await updateDoc(doc(db, 'rooms', roomId, 'players', uid), {
      team: newTeam,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/** Host starts the game for everyone in the room */
export async function startRoomGame(roomId: string) {
  const path = `rooms/${roomId}`;
  try {
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    if (!roomSnap.exists()) return;
    const room = roomSnap.data() as RoomData;

    const updatePayload: Record<string, unknown> = {
      status: 'PLAYING',
      updatedAt: new Date().toISOString(),
    };

    if (room.format === 'sprint' && room.sprintLimitType === 'time') {
      const durationSeconds = room.sprintTimeLimitSeconds || 180;
      updatePayload.sprintExpiresAt = Date.now() + durationSeconds * 1000;
    }

    await updateDoc(doc(db, 'rooms', roomId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/** End a time-based sprint match when time expires */
export async function endSprintTimeMatch(roomId: string) {
  const path = `rooms/${roomId}`;
  try {
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    if (!roomSnap.exists()) return;
    const room = roomSnap.data() as RoomData;
    if (room.status !== 'PLAYING') return;

    const scores = room.scores || {};
    const playersSnap = await getDocs(collection(db, 'rooms', roomId, 'players'));
    const players = playersSnap.docs.map(d => d.data() as RoomPlayerData);

    let topScore = -1;
    let topPlayer: RoomPlayerData | null = null;
    for (const p of players) {
      const s = scores[p.uid] || 0;
      if (s > topScore) {
        topScore = s;
        topPlayer = p;
      }
    }

    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'FINISHED',
      winnerId: topPlayer?.uid || null,
      winnerName: topPlayer ? `${topPlayer.displayName} (${topScore} pts)` : 'Time up!',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/** Update player's and team's real-time guess progress */
export async function updatePlayerProgress({
  roomId,
  user,
  guesses,
  emojiRows,
  hasWon,
  hasLost,
  completionTime,
  team,
  isTeamBattle,
}: {
  roomId: string;
  user: User;
  guesses: string[];
  emojiRows: string[];
  hasWon: boolean;
  hasLost: boolean;
  completionTime?: number;
  team?: PlayerTeam;
  isTeamBattle?: boolean;
}) {
  const path = `rooms/${roomId}/players/${user.uid}`;
  try {
    const updatePayload: Partial<RoomPlayerData> = {
      guesses,
      emojiRows,
      attempts: guesses.length,
      hasWon,
      hasLost,
      updatedAt: new Date().toISOString(),
    };
    if (completionTime) {
      updatePayload.completionTime = completionTime;
    }

    await setDoc(doc(db, 'rooms', roomId, 'players', user.uid), updatePayload, { merge: true });

    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const roomData = roomSnap.data() as RoomData;

    // --- SPRINT / FASTEST FINGER FIRST TRANSACTIONAL LOGIC ---
    if (roomData.format === 'sprint' && hasWon && roomData.status === 'PLAYING') {
      const winningGuess = guesses[guesses.length - 1]?.toUpperCase();
      let advancedRound = false;
      let newScore = 0;
      let finalUpdatedScores: Record<string, number> = {};

      await runTransaction(db, async transaction => {
        const freshRoomDoc = await transaction.get(roomRef);
        if (!freshRoomDoc.exists()) return;
        const freshRoom = freshRoomDoc.data() as RoomData;

        // Race check 1: room must still be actively PLAYING
        if (freshRoom.status !== 'PLAYING') return;

        // Race check 2: winning guess must match the current round target word!
        // If another player already solved this round and advanced the word, abort to prevent duplicate round progression
        if (freshRoom.targetWord !== winningGuess) return;

        const currentScores = freshRoom.scores || {};
        newScore = (currentScores[user.uid] || 0) + 1;
        finalUpdatedScores = { ...currentScores, [user.uid]: newScore };

        const limitType = freshRoom.sprintLimitType || 'words';
        const targetWords = freshRoom.sprintTargetWords || 3;
        const isWordLimitReached = limitType === 'words' && newScore >= targetWords;

        if (isWordLimitReached) {
          // Player reached target words -> Match Over!
          transaction.update(roomRef, {
            scores: finalUpdatedScores,
            winnerId: user.uid,
            winnerName: user.displayName || user.email?.split('@')[0] || 'Winner',
            status: 'FINISHED',
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Advance to next word round atomically!
          const nextWord = getRandomWord().toUpperCase();
          const nextRound = (freshRoom.roundNumber || 1) + 1;

          transaction.update(roomRef, {
            scores: finalUpdatedScores,
            targetWord: nextWord,
            roundNumber: nextRound,
            roundWinnerName: user.displayName || user.email?.split('@')[0] || 'A player',
            roundWinnerWord: freshRoom.targetWord,
            nextRoundStartsAt: Date.now() + 2500,
            updatedAt: new Date().toISOString(),
          });
          advancedRound = true;
        }
      });

      // If this transaction successfully advanced the round, reset player boards
      if (advancedRound) {
        const playersRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersRef);
        for (const playerDoc of playersSnap.docs) {
          const isScorer = playerDoc.id === user.uid;
          await updateDoc(doc(db, 'rooms', roomId, 'players', playerDoc.id), {
            guesses: [],
            emojiRows: [],
            attempts: 0,
            hasWon: false,
            hasLost: false,
            score: isScorer ? newScore : finalUpdatedScores[playerDoc.id] || 0,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      return;
    }

    // --- TEAM BATTLE LOGIC (2v2, 3v3) ---
    if (isTeamBattle && (team === 'teamA' || team === 'teamB')) {
      const roomUpdate: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      if (team === 'teamA') {
        roomUpdate.teamAGuesses = guesses;
        roomUpdate.teamAEmojiRows = emojiRows;
      } else {
        roomUpdate.teamBGuesses = guesses;
        roomUpdate.teamBEmojiRows = emojiRows;
      }

      if (hasWon) {
        roomUpdate.status = 'FINISHED';
        roomUpdate.winningTeam = team;
        roomUpdate.winnerId = user.uid;
        roomUpdate.winnerName = team === 'teamA' ? 'Team Emerald' : 'Team Amber';
      }

      await updateDoc(roomRef, roomUpdate);
    } else if (hasWon && roomData.format !== 'sprint') {
      // Individual FFA / 1v1 win
      if (!roomData.winnerId) {
        await updateDoc(roomRef, {
          winnerId: user.uid,
          winnerName: user.displayName || user.email?.split('@')[0] || 'Winner',
          status: 'FINISHED',
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/** Reset room for a Rematch round with a new word / sprint series */
export async function rematchRoom(roomId: string, newWord: string) {
  const path = `rooms/${roomId}`;
  try {
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    const room = roomSnap.exists() ? (roomSnap.data() as RoomData) : null;

    const resetPayload: Record<string, unknown> = {
      status: 'PLAYING',
      targetWord: newWord.toUpperCase(),
      roundNumber: 1,
      scores: {},
      roundWinnerName: null,
      roundWinnerWord: null,
      teamAGuesses: [],
      teamAEmojiRows: [],
      teamBGuesses: [],
      teamBEmojiRows: [],
      winnerId: null,
      winnerName: null,
      winningTeam: null,
      updatedAt: new Date().toISOString(),
    };

    if (room?.format === 'sprint' && room.sprintLimitType === 'time') {
      const durationSeconds = room.sprintTimeLimitSeconds || 180;
      resetPayload.sprintExpiresAt = Date.now() + durationSeconds * 1000;
    }

    await updateDoc(doc(db, 'rooms', roomId), resetPayload);

    // Reset all players in the room
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const playersSnap = await getDocs(playersRef);
    for (const playerDoc of playersSnap.docs) {
      await updateDoc(doc(db, 'rooms', roomId, 'players', playerDoc.id), {
        guesses: [],
        emojiRows: [],
        attempts: 0,
        score: 0,
        hasWon: false,
        hasLost: false,
        completionTime: null,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/** Leave room */
export async function leaveRoom(roomId: string, uid: string) {
  try {
    await deleteDoc(doc(db, 'rooms', roomId, 'players', uid));
  } catch {
    // Silent
  }
}

/** Subscribe to room document */
export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: RoomData | null) => void
): () => void {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(
    roomRef,
    snapshot => {
      if (snapshot.exists()) {
        onUpdate({ ...(snapshot.data() as RoomData), id: snapshot.id });
      } else {
        onUpdate(null);
      }
    },
    error => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
    }
  );
}

/** Subscribe to all players in a room */
export function subscribeToPlayers(
  roomId: string,
  onUpdate: (players: RoomPlayerData[]) => void
): () => void {
  const playersRef = collection(db, 'rooms', roomId, 'players');
  return onSnapshot(
    playersRef,
    snapshot => {
      const list = snapshot.docs.map(d => d.data() as RoomPlayerData);
      onUpdate(list);
    },
    error => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}/players`);
    }
  );
}

/** Check and delete room if it has expired past 24 hours */
export async function cleanupExpiredRoom(roomId: string): Promise<boolean> {
  try {
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    if (!roomSnap.exists()) return false;
    const room = roomSnap.data() as RoomData;
    if (room.expiresAt && Date.now() > room.expiresAt) {
      await deleteDoc(doc(db, 'rooms', roomId));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

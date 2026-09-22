import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

const C = colors.light;
const BEST_SCORE_KEY = 'pocket-racer-best-score';
const LANES = [0, 1, 2] as const;
type Lane = (typeof LANES)[number];

type Enemy = {
  id: number;
  lane: Lane;
  y: number;
  color: string;
  stripe: string;
};

const ENEMY_STYLES = [
  { color: '#4AA3DF', stripe: '#DDF3FF' },
  { color: '#FFC857', stripe: '#FFF2C6' },
  { color: '#B37FEB', stripe: '#F0DEFF' },
  { color: '#77D9D2', stripe: '#E0FFFC' },
] as const;

const initialEnemies: Enemy[] = [
  { id: 1, lane: 1, y: -0.42, ...ENEMY_STYLES[0] },
  { id: 2, lane: 0, y: 0.1, ...ENEMY_STYLES[1] },
  { id: 3, lane: 2, y: -0.95, ...ENEMY_STYLES[2] },
];

function formatScore(value: number) {
  return String(Math.floor(value)).padStart(5, '0');
}

function Car({
  lane,
  y,
  color,
  stripe,
  isPlayer = false,
  laneWidth,
}: {
  lane: Lane;
  y: number;
  color: string;
  stripe: string;
  isPlayer?: boolean;
  laneWidth: number;
}) {
  const carWidth = Math.min(70, laneWidth * 0.66);
  const left = 24 + lane * laneWidth + (laneWidth - carWidth) / 2;

  return (
    <View
      style={[
        styles.car,
        {
          width: carWidth,
          left,
          backgroundColor: color,
          transform: [{ translateY: y }],
          ...(isPlayer ? styles.playerCar : styles.enemyCar),
        },
      ]}
    >
      <View style={[styles.carWindow, { backgroundColor: C.ink }]} />
      <View style={[styles.carStripe, { backgroundColor: stripe }]} />
      <View style={styles.headlightRow}>
        <View style={styles.headlight} />
        <View style={styles.headlight} />
      </View>
      <View style={[styles.wheel, styles.wheelLeft]} />
      <View style={[styles.wheel, styles.wheelRight]} />
    </View>
  );
}

export default function PocketRacerScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const [lane, setLane] = useState<Lane>(1);
  const [enemies, setEnemies] = useState<Enemy[]>(initialEnemies);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [roadOffset, setRoadOffset] = useState(0);
  const roadHeight = Math.min(height * 0.68, 620);
  const trackWidth = Math.min(width - 32, 390);
  const laneWidth = (trackWidth - 48) / 3;
  const playerY = roadHeight - 116;
  const enemyRefs = useRef<Enemy[]>(initialEnemies);
  const laneRef = useRef<Lane>(1);
  const scoreRef = useRef(0);
  const playingRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(BEST_SCORE_KEY).then((stored) => {
      if (stored) setBestScore(Number(stored));
    });
  }, []);

  const startGame = useCallback(() => {
    const nextEnemies: Enemy[] = [
      { id: 1, lane: 1, y: -0.42, ...ENEMY_STYLES[0] },
      { id: 2, lane: 0, y: 0.1, ...ENEMY_STYLES[1] },
      { id: 3, lane: 2, y: -0.95, ...ENEMY_STYLES[2] },
    ];
    laneRef.current = 1;
    scoreRef.current = 0;
    enemyRefs.current = nextEnemies;
    setLane(1);
    setScore(0);
    setEnemies(nextEnemies);
    setRoadOffset(0);
    setGameOver(false);
    setIsPlaying(true);
    playingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const movePlayer = useCallback((direction: -1 | 1) => {
    if (!playingRef.current) return;
    const nextLane = Math.max(0, Math.min(2, laneRef.current + direction)) as Lane;
    if (nextLane !== laneRef.current) {
      laneRef.current = nextLane;
      setLane(nextLane);
      Haptics.selectionAsync();
    }
  }, []);

  const endGame = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setGameOver(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const finalScore = Math.floor(scoreRef.current);
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      AsyncStorage.setItem(BEST_SCORE_KEY, String(finalScore));
    }
  }, [bestScore]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const speed = 0.012 + Math.min(scoreRef.current / 52000, 0.01);
      const nextScore = scoreRef.current + speed * 10;
      const nextEnemies = enemyRefs.current.map((enemy, index) => {
        let nextY = enemy.y + speed;
        if (nextY > 1.18) {
          const nextLane = ((enemy.lane + 1 + Math.floor(nextScore / 130)) % 3) as Lane;
          nextY = -0.7 - index * 0.18;
          return {
            ...enemy,
            lane: nextLane,
            y: nextY,
            color: ENEMY_STYLES[(enemy.id + Math.floor(nextScore / 120)) % ENEMY_STYLES.length].color,
            stripe: ENEMY_STYLES[(enemy.id + Math.floor(nextScore / 120)) % ENEMY_STYLES.length].stripe,
          };
        }
        return { ...enemy, y: nextY };
      });
      const hit = nextEnemies.some(
        (enemy) =>
          enemy.lane === laneRef.current &&
          enemy.y > 0.68 &&
          enemy.y < 0.98,
      );
      if (hit) {
        scoreRef.current = nextScore;
        setScore(nextScore);
        enemyRefs.current = nextEnemies;
        setEnemies(nextEnemies);
        endGame();
        return;
      }
      scoreRef.current = nextScore;
      enemyRefs.current = nextEnemies;
      setScore(nextScore);
      setEnemies(nextEnemies);
      setRoadOffset((offset) => (offset + speed * 220) % 80);
    }, 32);
    return () => clearInterval(interval);
  }, [endGame, isPlaying]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) > 24) movePlayer(gesture.dx > 0 ? 1 : -1);
        },
      }),
    [movePlayer],
  );

  const gameStatus = gameOver ? 'RUN ENDED' : isPlaying ? 'RACE IN PROGRESS' : 'READY TO RACE';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>NIGHT SHIFT / 01</Text>
          <Text style={styles.title}>Pocket Racer</Text>
        </View>
        <View style={styles.bestBadge}>
          <Text style={styles.bestLabel}>BEST</Text>
          <Text style={styles.bestValue}>{formatScore(bestScore)}</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <View>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{formatScore(score)}</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: gameOver ? C.accent : isPlaying ? C.teal : C.mutedForeground }]} />
          <Text style={styles.statusText}>{gameStatus}</Text>
        </View>
      </View>

      <View
        style={[styles.gameFrame, { width: trackWidth, height: roadHeight }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.skyGlow} />
        <View style={styles.road}>
          <View style={styles.roadShoulderLeft} />
          <View style={styles.roadShoulderRight} />
          {[0, 1].map((column) => (
            <View
              key={column}
              style={[
                styles.laneLine,
                { left: 24 + laneWidth * (column + 1) - 2 },
              ]}
            >
              {[0, 1, 2, 3, 4, 5].map((dash) => (
                <View
                  key={dash}
                  style={[
                    styles.laneDash,
                    { top: dash * 80 + roadOffset - 80 },
                  ]}
                />
              ))}
            </View>
          ))}
          {enemies.map((enemy) => (
            <Car
              key={enemy.id}
              lane={enemy.lane}
              y={enemy.y * roadHeight}
              color={enemy.color}
              stripe={enemy.stripe}
              laneWidth={laneWidth}
            />
          ))}
          <Car
            lane={lane}
            y={playerY}
            color={C.primary}
            stripe={C.roadEdge}
            isPlayer
            laneWidth={laneWidth}
          />
          <View style={styles.speedLines}>
            <View style={styles.speedLine} />
            <View style={styles.speedLine} />
            <View style={styles.speedLine} />
          </View>
        </View>
        {!isPlaying && !gameOver && (
          <View style={styles.readyOverlay}>
            <View style={styles.startMark}>
              <Feather name="flag" size={16} color={C.accent} />
              <Text style={styles.overlayKicker}>START YOUR ENGINE</Text>
            </View>
            <Text style={styles.overlayHint}>Swipe or tap to change lanes</Text>
          </View>
        )}
        {gameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverKicker}>TRAFFIC AHEAD</Text>
            <Text style={styles.gameOverTitle}>Race over.</Text>
            <Text style={styles.gameOverScore}>{formatScore(score)}</Text>
            <Text style={styles.gameOverCaption}>points on this run</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable
          testID="move-left"
          onPress={() => movePlayer(-1)}
          style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-left" size={24} color={C.foreground} />
        </Pressable>
        <Pressable
          testID="primary-race-button"
          onPress={isPlaying ? () => undefined : startGame}
          style={({ pressed }) => [
            styles.raceButton,
            pressed && styles.pressed,
            isPlaying && styles.raceButtonPlaying,
          ]}
        >
          <Feather name={isPlaying ? 'zap' : gameOver ? 'rotate-ccw' : 'play'} size={19} color={C.primaryForeground} />
          <Text style={styles.raceButtonText}>{isPlaying ? 'DODGE' : gameOver ? 'RACE AGAIN' : 'START RACE'}</Text>
        </Pressable>
        <Pressable
          testID="move-right"
          onPress={() => movePlayer(1)}
          style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-right" size={24} color={C.foreground} />
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.footerRule} />
        <Text style={styles.footerText}>KEEP MOVING · OWN THE NIGHT</Text>
        <View style={styles.footerRule} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: C.accent,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.9,
    marginBottom: 5,
  },
  title: {
    color: C.foreground,
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1.2,
  },
  bestBadge: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  bestLabel: {
    color: C.mutedForeground,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
  bestValue: {
    color: C.teal,
    fontSize: 19,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  scoreRow: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    color: C.mutedForeground,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.7,
  },
  scoreValue: {
    color: C.foreground,
    fontSize: 38,
    lineHeight: 43,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    color: C.mutedForeground,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.1,
  },
  gameFrame: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: C.road,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  skyGlow: {
    position: 'absolute',
    width: '100%',
    height: '32%',
    backgroundColor: '#182844',
    opacity: 0.65,
  },
  road: {
    flex: 1,
    marginHorizontal: 24,
    backgroundColor: C.road,
    position: 'relative',
    overflow: 'hidden',
  },
  roadShoulderLeft: {
    position: 'absolute',
    left: -24,
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: C.roadEdge,
    opacity: 0.85,
  },
  roadShoulderRight: {
    position: 'absolute',
    right: -24,
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: C.roadEdge,
    opacity: 0.85,
  },
  laneLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
  },
  laneDash: {
    position: 'absolute',
    height: 43,
    width: 4,
    borderRadius: 2,
    backgroundColor: C.laneDash,
    opacity: 0.65,
  },
  car: {
    position: 'absolute',
    height: 94,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 5,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  playerCar: {
    height: 102,
    borderWidth: 2,
    borderColor: '#FF8078',
    zIndex: 10,
  },
  enemyCar: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  carWindow: {
    width: '64%',
    height: 27,
    borderRadius: 9,
    marginTop: 10,
    opacity: 0.88,
  },
  carStripe: {
    position: 'absolute',
    top: 42,
    width: 5,
    height: 36,
    borderRadius: 3,
  },
  headlightRow: {
    width: '70%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  headlight: {
    width: 7,
    height: 5,
    borderRadius: 2,
    backgroundColor: '#FFF4D0',
  },
  wheel: {
    position: 'absolute',
    width: 6,
    height: 18,
    borderRadius: 3,
    backgroundColor: C.ink,
    top: 23,
  },
  wheelLeft: {
    left: -4,
  },
  wheelRight: {
    right: -4,
  },
  speedLines: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.32,
  },
  speedLine: {
    height: 2,
    width: 27,
    backgroundColor: C.laneDash,
    borderRadius: 1,
  },
  readyOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
  },
  startMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(11,18,32,0.82)',
    borderRadius: 100,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  overlayKicker: {
    color: C.accent,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
  },
  overlayHint: {
    color: C.mutedForeground,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 10,
  },
  gameOverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '36%',
    alignItems: 'center',
    paddingVertical: 26,
    backgroundColor: 'rgba(11,18,32,0.9)',
  },
  gameOverKicker: {
    color: C.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.1,
  },
  gameOverTitle: {
    color: C.foreground,
    fontFamily: 'Inter_700Bold',
    fontSize: 27,
    marginTop: 6,
  },
  gameOverScore: {
    color: C.accent,
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    letterSpacing: 2,
    marginTop: 12,
  },
  gameOverCaption: {
    color: C.mutedForeground,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  controls: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.secondary,
    borderWidth: 1,
    borderColor: C.border,
  },
  raceButton: {
    height: 52,
    flex: 1,
    borderRadius: 17,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  raceButtonPlaying: {
    backgroundColor: C.secondary,
    borderWidth: 1,
    borderColor: C.border,
  },
  raceButtonText: {
    color: C.primaryForeground,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 1.1,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  footer: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerRule: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  footerText: {
    color: C.mutedForeground,
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 1.3,
  },
});
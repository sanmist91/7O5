import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  subscribeToMonthLogs,
  subscribeToMonthPayments,
  subscribeToMonthSetting,
  setDailyLog,
} from '../../src/services/firestore';
import { DailyLog, Payment, MonthSetting } from '../../src/types';
import { toYMD, toYM, monthLabel, formatRupees } from '../../src/utils/dateUtils';

const PRICE_PER_TEA = 20;

export default function HomeScreen() {
  const today = new Date();
  const currentMonth = toYM(today);
  const todayStr = toYMD(today);

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthSetting, setMonthSettingState] = useState<MonthSetting | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeToMonthLogs(currentMonth, (newLogs) => {
      setLogs(newLogs);
      const todayLog = newLogs.find((l) => l.date === todayStr);
      setTodayCount(todayLog?.count ?? 0);
    });
    const unsub2 = subscribeToMonthPayments(currentMonth, setPayments);
    const unsub3 = subscribeToMonthSetting(currentMonth, setMonthSettingState);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [currentMonth, todayStr]);

  const totalTeas = logs.reduce((s, l) => s + l.count, 0);
  const totalCost = totalTeas * PRICE_PER_TEA;
  const openingBalance = monthSetting?.openingBalance ?? 0;
  const totalCredited = payments.reduce((s, p) => s + p.amount, 0) + openingBalance;
  const balance = totalCredited - totalCost;

  const handleCount = useCallback(
    async (delta: number) => {
      const newCount = Math.max(0, Math.round((todayCount + delta) * 2) / 2);
      setTodayCount(newCount);
      setSaving(true);
      try {
        await setDailyLog(todayStr, newCount);
      } catch {
        Alert.alert('Error', 'Failed to save. Check your connection.');
        setTodayCount(todayCount);
      } finally {
        setSaving(false);
      }
    },
    [todayCount, todayStr],
  );

  const todayCost = todayCount * PRICE_PER_TEA;
  const avgPerDay = logs.length > 0 ? (totalTeas / logs.length).toFixed(1) : '—';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Laxmi Tea</Text>
          <Text style={styles.monthLabel}>{monthLabel(currentMonth)}</Text>
        </View>

        {/* Balance Card */}
        <LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.balanceCard}>
          <Text style={styles.balanceCardLabel}>Monthly Balance</Text>
          <Text style={[styles.balanceAmount, balance < 0 && styles.balanceNegative]}>
            {formatRupees(balance)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <MaterialCommunityIcons name="arrow-down-circle-outline" size={16} color="#B7E4C7" />
              <Text style={styles.balanceStatLabel}>Credited</Text>
              <Text style={styles.balanceStatValue}>{formatRupees(totalCredited)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <MaterialCommunityIcons name="arrow-up-circle-outline" size={16} color="#B7E4C7" />
              <Text style={styles.balanceStatLabel}>Spent</Text>
              <Text style={styles.balanceStatValue}>{formatRupees(totalCost)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Today's Tea Counter */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Tea</Text>
            {saving && <ActivityIndicator size="small" color="#2D6A4F" />}
          </View>
          <Text style={styles.todayDate}>
            {today.toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>

          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => handleCount(-0.5)}
              disabled={todayCount === 0 || saving}
              activeOpacity={0.7}
            >
              <Text style={styles.counterBtnSymbol}>−</Text>
            </TouchableOpacity>

            <View style={styles.counterValueWrap}>
              <Text style={styles.counterValue}>{todayCount}</Text>
              <Text style={styles.counterSub}>cups</Text>
            </View>

            <TouchableOpacity
              style={[styles.counterBtn, styles.counterBtnAdd]}
              onPress={() => handleCount(0.5)}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={[styles.counterBtnSymbol, { color: '#fff' }]}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.counterHint}>
            Each tap = ½ cup · Today's cost: {formatRupees(todayCost)}
          </Text>
        </View>

        {/* Month Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Month's Stats</Text>
          <View style={styles.statsGrid}>
            <StatBox label="Total Teas" value={String(totalTeas)} icon="tea" />
            <StatBox label="Total Cost" value={formatRupees(totalCost)} icon="currency-inr" />
            <StatBox label="Days Logged" value={String(logs.length)} icon="calendar-check" />
            <StatBox label="Avg / Day" value={avgPerDay} icon="chart-line" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon as any} size={20} color="#52796F" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F7F4' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  appName: { fontSize: 28, fontWeight: '800', color: '#1B4332', letterSpacing: -0.5 },
  monthLabel: { fontSize: 15, color: '#52796F', marginTop: 2 },

  balanceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
  },
  balanceCardLabel: { color: '#B7E4C7', fontSize: 13, fontWeight: '500' },
  balanceAmount: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 20,
    letterSpacing: -1,
  },
  balanceNegative: { color: '#FF8A80' },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceStat: { flex: 1, alignItems: 'center', gap: 4 },
  balanceDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  balanceStatLabel: { color: '#B7E4C7', fontSize: 12 },
  balanceStatValue: { color: '#fff', fontSize: 17, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  todayDate: { color: '#52796F', fontSize: 13, marginBottom: 20 },

  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  counterBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnAdd: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  counterBtnSymbol: { fontSize: 30, color: '#2D6A4F', lineHeight: 34 },
  counterValueWrap: { alignItems: 'center', marginHorizontal: 36 },
  counterValue: { fontSize: 52, fontWeight: '800', color: '#1B4332', lineHeight: 58 },
  counterSub: { fontSize: 13, color: '#52796F', marginTop: -4 },
  counterHint: { textAlign: 'center', color: '#52796F', fontSize: 13 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  statBox: { width: '50%', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 4, gap: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1B4332' },
  statLabel: { fontSize: 12, color: '#52796F' },
});

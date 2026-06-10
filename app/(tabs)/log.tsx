import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { subscribeToMonthLogs, setDailyLog } from '../../src/services/firestore';
import { DailyLog } from '../../src/types';
import { toYM, toYMD, monthLabel, shiftMonth, daysInMonth, dayLabel, formatRupees } from '../../src/utils/dateUtils';

const PRICE = 20;

export default function LogScreen() {
  const [viewMonth, setViewMonth] = useState(toYM(new Date()));
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [editEntry, setEditEntry] = useState<{ date: string; count: number } | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeToMonthLogs(viewMonth, setLogs);
    return unsub;
  }, [viewMonth]);

  const logMap = new Map(logs.map((l) => [l.date, l.count]));

  const totalTeas = logs.reduce((s, l) => s + l.count, 0);
  const isCurrentMonth = viewMonth === toYM(new Date());

  const days = Array.from({ length: daysInMonth(viewMonth) }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return `${viewMonth}-${day}`;
  });

  const openEdit = (date: string) => {
    const count = logMap.get(date) ?? 0;
    setEditEntry({ date, count });
    setInputVal(String(count));
  };

  const saveEdit = async () => {
    if (!editEntry) return;
    const val = parseFloat(inputVal);
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid', 'Enter a valid number (e.g. 5 or 4.5)');
      return;
    }
    const rounded = Math.round(val * 2) / 2;
    setSaving(true);
    try {
      await setDailyLog(editEntry.date, rounded);
      setEditEntry(null);
    } catch {
      Alert.alert('Error', 'Failed to save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = useCallback(
    ({ item: date }: { item: string }) => {
      const count = logMap.get(date) ?? 0;
      const hasLog = logMap.has(date);
      const isToday = date === toYMD(new Date());
      const cost = count * PRICE;

      return (
        <TouchableOpacity style={[styles.row, isToday && styles.rowToday]} onPress={() => openEdit(date)} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={[styles.dateBadge, isToday && styles.dateBadgeToday]}>
              <Text style={[styles.dateNum, isToday && styles.dateNumToday]}>
                {date.split('-')[2]}
              </Text>
            </View>
            <View>
              <Text style={[styles.dayName, isToday && { color: '#2D6A4F' }]}>
                {dayLabel(date)}
                {isToday ? '  (Today)' : ''}
              </Text>
              {hasLog && count === 0 && (
                <Text style={styles.noTea}>No tea</Text>
              )}
            </View>
          </View>
          <View style={styles.rowRight}>
            {hasLog ? (
              <>
                <Text style={styles.teaCount}>{count}</Text>
                <Text style={styles.teaCost}>{formatRupees(cost)}</Text>
              </>
            ) : (
              <Text style={styles.notLogged}>—</Text>
            )}
            <MaterialCommunityIcons name="pencil-outline" size={16} color="#B0B0B0" style={{ marginLeft: 8 }} />
          </View>
        </TouchableOpacity>
      );
    },
    [logMap],
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Month Navigator */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setViewMonth(shiftMonth(viewMonth, -1))}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color="#2D6A4F" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerMonth}>{monthLabel(viewMonth)}</Text>
          <Text style={styles.headerSub}>
            {logs.length} days · {totalTeas} teas · {formatRupees(totalTeas * PRICE)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setViewMonth(shiftMonth(viewMonth, 1))}
          disabled={isCurrentMonth}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={26}
            color={isCurrentMonth ? '#DDD' : '#2D6A4F'}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={days}
        keyExtractor={(d) => d}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Edit Modal */}
      <Modal visible={!!editEntry} transparent animationType="fade" onRequestClose={() => setEditEntry(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Tea Count</Text>
            <Text style={styles.modalDate}>{editEntry ? dayLabel(editEntry.date) : ''}</Text>
            <TextInput
              style={styles.modalInput}
              value={inputVal}
              onChangeText={setInputVal}
              keyboardType="decimal-pad"
              placeholder="e.g. 5 or 4.5"
              autoFocus
              selectTextOnFocus
            />
            <Text style={styles.modalHint}>Use .5 for half cups (e.g. 3.5, 7.5)</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditEntry(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, saving && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F7F4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9',
  },
  navBtn: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerMonth: { fontSize: 18, fontWeight: '700', color: '#1B4332' },
  headerSub: { fontSize: 12, color: '#52796F', marginTop: 2 },

  list: { paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F7F4',
  },
  rowToday: { backgroundColor: '#F0FFF4' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeToday: { backgroundColor: '#2D6A4F' },
  dateNum: { fontSize: 15, fontWeight: '700', color: '#1B4332' },
  dateNumToday: { color: '#fff' },
  dayName: { fontSize: 14, fontWeight: '500', color: '#374151' },
  noTea: { fontSize: 12, color: '#A0A0A0', marginTop: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  teaCount: { fontSize: 20, fontWeight: '800', color: '#1B4332', marginRight: 6 },
  teaCost: { fontSize: 13, color: '#52796F' },
  notLogged: { fontSize: 20, color: '#C0C0C0' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1B4332', marginBottom: 4 },
  modalDate: { fontSize: 14, color: '#52796F', marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#2D6A4F',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '700',
    color: '#1B4332',
    textAlign: 'center',
  },
  modalHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

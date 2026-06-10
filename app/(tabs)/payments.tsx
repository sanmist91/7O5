import React, { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  subscribeToMonthPayments,
  subscribeToMonthSetting,
  addPayment,
  deletePayment,
  setMonthSetting,
} from '../../src/services/firestore';
import { Payment, MonthSetting } from '../../src/types';
import { toYM, toYMD, monthLabel, shiftMonth, dayLabel, formatRupees } from '../../src/utils/dateUtils';

const DEFAULT_PRICE = 20;

export default function PaymentsScreen() {
  const [viewMonth, setViewMonth] = useState(toYM(new Date()));
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthSetting, setMonthSettingState] = useState<MonthSetting | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [openingInput, setOpeningInput] = useState('');
  const [saving, setSaving] = useState(false);

  const isCurrentMonth = viewMonth === toYM(new Date());

  useEffect(() => {
    const unsub1 = subscribeToMonthPayments(viewMonth, setPayments);
    const unsub2 = subscribeToMonthSetting(viewMonth, (s) => {
      setMonthSettingState(s);
      setOpeningInput(String(s?.openingBalance ?? 0));
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [viewMonth]);

  const openingBalance = monthSetting?.openingBalance ?? 0;
  const totalCredits = payments.reduce((s, p) => s + p.amount, 0);
  const totalCredited = totalCredits + openingBalance;

  const handleAddPayment = async () => {
    const trimmedName = name.trim();
    const parsedAmount = parseFloat(amount);
    if (!trimmedName) {
      Alert.alert('Required', 'Enter a name for the person.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid', 'Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      await addPayment({
        name: trimmedName,
        amount: parsedAmount,
        date: toYMD(new Date()),
        month: viewMonth,
      });
      setName('');
      setAmount('');
      setShowAddModal(false);
    } catch {
      Alert.alert('Error', 'Failed to add payment. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = (p: Payment) => {
    Alert.alert('Delete Payment', `Remove ${p.name}'s payment of ${formatRupees(p.amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePayment(p.id);
          } catch {
            Alert.alert('Error', 'Failed to delete.');
          }
        },
      },
    ]);
  };

  const handleSaveOpening = async () => {
    const val = parseFloat(openingInput);
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid', 'Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      await setMonthSetting({
        month: viewMonth,
        openingBalance: val,
        pricePerTea: DEFAULT_PRICE,
      });
      setShowOpeningModal(false);
    } catch {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Month Navigator */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setViewMonth(shiftMonth(viewMonth, -1))}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#2D6A4F" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerMonth}>{monthLabel(viewMonth)}</Text>
          <Text style={styles.headerSub}>Payments & Credits</Text>
        </View>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setViewMonth(shiftMonth(viewMonth, 1))}
          disabled={isCurrentMonth}
        >
          <MaterialCommunityIcons name="chevron-right" size={26} color={isCurrentMonth ? '#DDD' : '#2D6A4F'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Opening Balance</Text>
              <TouchableOpacity onPress={() => setShowOpeningModal(true)} style={styles.summaryValueRow}>
                <Text style={styles.summaryValue}>{formatRupees(openingBalance)}</Text>
                <MaterialCommunityIcons name="pencil-outline" size={14} color="#52796F" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>New Credits</Text>
              <Text style={styles.summaryValue}>{formatRupees(totalCredits)}</Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Credited</Text>
            <Text style={styles.totalValue}>{formatRupees(totalCredited)}</Text>
          </View>
        </View>

        {/* Payments List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Credit Entries</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="currency-inr" size={48} color="#B7E4C7" />
            <Text style={styles.emptyText}>No payments recorded yet</Text>
            <Text style={styles.emptySubText}>Tap "Add" to record a credit</Text>
          </View>
        ) : (
          payments.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View style={styles.paymentAvatar}>
                <Text style={styles.paymentAvatarText}>{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>{p.name}</Text>
                <Text style={styles.paymentDate}>{dayLabel(p.date)}</Text>
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>{formatRupees(p.amount)}</Text>
                <TouchableOpacity onPress={() => handleDeletePayment(p)} style={styles.deleteBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Payment Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Credit</Text>
            <Text style={styles.modalLabel}>Person's Name</Text>
            <TextInput
              style={styles.modalInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. NK, Ronak, HK"
              autoFocus
              returnKeyType="next"
            />
            <Text style={styles.modalLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="e.g. 1000"
              returnKeyType="done"
              onSubmitEditing={handleAddPayment}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowAddModal(false);
                  setName('');
                  setAmount('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, saving && { opacity: 0.6 }]}
                onPress={handleAddPayment}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>{saving ? 'Saving…' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Opening Balance Modal */}
      <Modal visible={showOpeningModal} transparent animationType="fade" onRequestClose={() => setShowOpeningModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Opening Balance</Text>
            <Text style={styles.modalSubtitle}>Balance carried over from last month</Text>
            <TextInput
              style={styles.modalInput}
              value={openingInput}
              onChangeText={setOpeningInput}
              keyboardType="numeric"
              placeholder="e.g. 1798"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowOpeningModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, saving && { opacity: 0.6 }]}
                onPress={handleSaveOpening}
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

  scroll: { paddingBottom: 40 },

  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, height: 44, backgroundColor: '#E8F5E9', marginHorizontal: 16 },
  summaryLabel: { fontSize: 12, color: '#52796F', marginBottom: 4 },
  summaryValueRow: { flexDirection: 'row', alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#1B4332' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#2D6A4F' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySubText: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },

  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F7F4',
  },
  paymentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D8F3DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentAvatarText: { fontSize: 18, fontWeight: '800', color: '#2D6A4F' },
  paymentInfo: { flex: 1 },
  paymentName: { fontSize: 15, fontWeight: '600', color: '#1B4332' },
  paymentDate: { fontSize: 12, color: '#52796F', marginTop: 2 },
  paymentRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentAmount: { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  deleteBtn: { padding: 4 },

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
  modalSubtitle: { fontSize: 13, color: '#52796F', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: '#1B1B1B',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
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

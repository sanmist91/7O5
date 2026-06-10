import {
  doc,
  setDoc,
  collection,
  query,
  where,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DailyLog, Payment, MonthSetting } from '../types';

const DAILY_LOGS = 'dailyLogs';
const PAYMENTS = 'payments';
const MONTH_SETTINGS = 'monthSettings';

export const setDailyLog = async (date: string, count: number): Promise<void> => {
  const ref = doc(db, DAILY_LOGS, date);
  await setDoc(ref, { date, count, updatedAt: serverTimestamp() });
};

export const subscribeToMonthLogs = (
  month: string,
  callback: (logs: DailyLog[]) => void,
): (() => void) => {
  const q = query(
    collection(db, DAILY_LOGS),
    where('date', '>=', `${month}-01`),
    where('date', '<=', `${month}-31`),
  );
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map((d) => d.data() as DailyLog);
    callback(logs.sort((a, b) => a.date.localeCompare(b.date)));
  });
};

export const addPayment = async (payment: Omit<Payment, 'id'>): Promise<void> => {
  await addDoc(collection(db, PAYMENTS), payment);
};

export const deletePayment = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, PAYMENTS, id));
};

export const subscribeToMonthPayments = (
  month: string,
  callback: (payments: Payment[]) => void,
): (() => void) => {
  const q = query(collection(db, PAYMENTS), where('month', '==', month));
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
    callback(payments.sort((a, b) => a.date.localeCompare(b.date)));
  });
};

export const setMonthSetting = async (setting: MonthSetting): Promise<void> => {
  const ref = doc(db, MONTH_SETTINGS, setting.month);
  await setDoc(ref, setting);
};

export const subscribeToMonthSetting = (
  month: string,
  callback: (setting: MonthSetting | null) => void,
): (() => void) => {
  const ref = doc(db, MONTH_SETTINGS, month);
  return onSnapshot(ref, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.data() as MonthSetting) : null);
  });
};

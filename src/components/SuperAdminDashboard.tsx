import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  Plus,
  UserCheck,
  UserX,
  Clock,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  X,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Store,
  CalendarPlus,
  Filter,
  FileText
} from 'lucide-react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { ShopSubscription, SubscriptionStatus } from '../types';

interface SuperAdminDashboardProps {
  currentAdminEmail: string;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ currentAdminEmail }) => {
  const [subscriptions, setSubscriptions] = useState<ShopSubscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingShop, setEditingShop] = useState<ShopSubscription | null>(null);
  const [deletingShopEmail, setDeletingShopEmail] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // New Shop Form state
  const [newEmail, setNewEmail] = useState<string>('');
  const [newShopName, setNewShopName] = useState<string>('');
  const [newDurationDays, setNewDurationDays] = useState<number>(30);
  const [newStartDate, setNewStartDate] = useState<string>(getTodayDateString());
  const [newStatus, setNewStatus] = useState<SubscriptionStatus>('approved');
  const [newNotes, setNewNotes] = useState<string>('');

  // Edit Shop Form state
  const [editShopName, setEditShopName] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editExpiryDate, setEditExpiryDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('approved');
  const [editNotes, setEditNotes] = useState<string>('');

  function getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addDaysToDate(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }

  // Real-time listener for subscriptions collection
  useEffect(() => {
    setLoading(true);
    const subRef = collection(db, 'subscriptions');
    const unsubscribe = onSnapshot(
      subRef,
      (snapshot) => {
        const list: ShopSubscription[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ShopSubscription;
          list.push({
            ...data,
            email: docSnap.id.toLowerCase() || data.email?.toLowerCase(),
          });
        });
        // Sort by updatedAt or email
        list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        setSubscriptions(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to subscriptions:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const todayStr = getTodayDateString();

  // Calculate statistics
  const stats = useMemo(() => {
    let total = subscriptions.length;
    let approved = 0;
    let pending = 0;
    let suspended = 0;
    let expired = 0;

    subscriptions.forEach((sub) => {
      const isExp = sub.expiryDate < todayStr || sub.status === 'expired';
      if (sub.status === 'suspended') {
        suspended++;
      } else if (isExp) {
        expired++;
      } else if (sub.status === 'pending') {
        pending++;
      } else if (sub.status === 'approved') {
        approved++;
      }
    });

    return { total, approved, pending, suspended, expired };
  }, [subscriptions, todayStr]);

  // Filtered subscriptions list
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        sub.email.toLowerCase().includes(query) ||
        (sub.shopName && sub.shopName.toLowerCase().includes(query));

      if (!matchSearch) return false;

      const isExp = sub.expiryDate < todayStr || sub.status === 'expired';

      if (statusFilter === 'all') return true;
      if (statusFilter === 'approved') return sub.status === 'approved' && !isExp;
      if (statusFilter === 'pending') return sub.status === 'pending';
      if (statusFilter === 'suspended') return sub.status === 'suspended';
      if (statusFilter === 'expired') return isExp;

      return true;
    });
  }, [subscriptions, searchQuery, statusFilter, todayStr]);

  // Handle Quick Status Change
  const handleQuickStatusChange = async (targetEmail: string, newStat: SubscriptionStatus) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    // Optimistic Update
    setSubscriptions((prev) =>
      prev.map((item) =>
        item.email === cleanEmail
          ? { ...item, status: newStat, updatedAt: nowIso }
          : item
      )
    );

    showToast(`อัปเดตสถานะร้านค้า ${cleanEmail} เป็น "${newStat}" เรียบร้อยแล้ว`);

    try {
      const docRef = doc(db, 'subscriptions', cleanEmail);
      await setDoc(docRef, { status: newStat, updatedAt: nowIso }, { merge: true });
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('เกิดข้อผิดพลาดในการอัปเดตข้อมูลบนคลาวด์');
    }
  };

  // Handle Quick +30 Days Extension
  const handleQuickExtend30Days = async (sub: ShopSubscription) => {
    const cleanEmail = sub.email.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    // Calculate base date: if current expiryDate is in the future, extend from current expiryDate; else extend from today.
    const baseDate = sub.expiryDate && sub.expiryDate >= todayStr ? sub.expiryDate : todayStr;
    const newExpiry = addDaysToDate(baseDate, 30);

    // Optimistic Update
    setSubscriptions((prev) =>
      prev.map((item) =>
        item.email === cleanEmail
          ? { ...item, expiryDate: newExpiry, status: 'approved', updatedAt: nowIso }
          : item
      )
    );

    showToast(`ต่ออายุสิทธิ์ร้าน ${cleanEmail} เพิ่ม 30 วัน (ถึง ${newExpiry}) เรียบร้อยแล้ว`);

    try {
      const docRef = doc(db, 'subscriptions', cleanEmail);
      await setDoc(
        docRef,
        {
          expiryDate: newExpiry,
          status: 'approved',
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error extending subscription:', err);
      showToast('เกิดข้อผิดพลาดในการต่ออายุสิทธิ์');
    }
  };

  // Handle Add New Shop Submit
  const handleCreateNewShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const cleanEmail = newEmail.trim().toLowerCase();
    const computedExpiry = addDaysToDate(newStartDate || todayStr, newDurationDays || 30);
    const nowIso = new Date().toISOString();

    const newSub: ShopSubscription = {
      email: cleanEmail,
      shopName: newShopName.trim() || cleanEmail,
      status: newStatus,
      startDate: newStartDate || todayStr,
      expiryDate: computedExpiry,
      notes: newNotes.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Optimistic update
    setSubscriptions((prev) => [newSub, ...prev.filter((x) => x.email !== cleanEmail)]);
    setShowAddModal(false);
    showToast(`ลงทะเบียนสิทธิ์ร้านค้า ${cleanEmail} เรียบร้อยแล้ว`);

    // Reset Form
    setNewEmail('');
    setNewShopName('');
    setNewDurationDays(30);
    setNewStartDate(todayStr);
    setNewStatus('approved');
    setNewNotes('');

    try {
      const docRef = doc(db, 'subscriptions', cleanEmail);
      await setDoc(docRef, newSub);
    } catch (err) {
      console.error('Error creating subscription:', err);
      showToast('เกิดข้อผิดพลาดในการบันทึกลงคลาวด์');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (sub: ShopSubscription) => {
    setEditingShop(sub);
    setEditShopName(sub.shopName || sub.email);
    setEditStartDate(sub.startDate || todayStr);
    setEditExpiryDate(sub.expiryDate || addDaysToDate(todayStr, 30));
    setEditStatus(sub.status || 'approved');
    setEditNotes(sub.notes || '');
  };

  // Handle Save Edit Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;

    const cleanEmail = editingShop.email.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    const updatedData: Partial<ShopSubscription> = {
      shopName: editShopName.trim() || cleanEmail,
      startDate: editStartDate,
      expiryDate: editExpiryDate,
      status: editStatus,
      notes: editNotes.trim(),
      updatedAt: nowIso,
    };

    // Optimistic Update
    setSubscriptions((prev) =>
      prev.map((item) =>
        item.email === cleanEmail ? { ...item, ...updatedData } : item
      )
    );

    setEditingShop(null);
    showToast(`อัปเดตข้อมูลร้าน ${cleanEmail} เรียบร้อยแล้ว`);

    try {
      const docRef = doc(db, 'subscriptions', cleanEmail);
      await setDoc(docRef, updatedData, { merge: true });
    } catch (err) {
      console.error('Error updating subscription:', err);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Handle Delete Store & Cloud Data
  const handleConfirmDeleteStore = async () => {
    if (!deletingShopEmail) return;

    const cleanEmail = deletingShopEmail.trim().toLowerCase();
    setIsDeleting(true);

    // Optimistic update
    setSubscriptions((prev) => prev.filter((item) => item.email !== cleanEmail));
    setDeletingShopEmail(null);

    try {
      // 1. Delete all subcollections inside stores/{cleanEmail}
      const subcollections = ['hairdressers', 'recorders', 'bookings', 'leaves', 'services', 'settings'];
      for (const sub of subcollections) {
        try {
          const subRef = collection(db, 'stores', cleanEmail, sub);
          const snap = await getDocs(subRef);
          const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
          await Promise.all(deletePromises);
        } catch (e) {
          console.warn(`Error clearing subcollection ${sub}:`, e);
        }
      }

      // 2. Delete parent store document
      try {
        await deleteDoc(doc(db, 'stores', cleanEmail));
      } catch (e) {
        console.warn('Error deleting parent store doc:', e);
      }

      // 3. Delete subscription document
      await deleteDoc(doc(db, 'subscriptions', cleanEmail));

      showToast(`ลบข้อมูลร้านค้า ${cleanEmail} และล้างคลาวด์ทั้งหมดเรียบร้อยแล้ว`);
    } catch (err) {
      console.error('Error deleting store data:', err);
      showToast('เกิดข้อผิดพลาดในการลบข้อมูลบนคลาวด์');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1627] text-stone-100 p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-stone-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-bounce">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm">{toastMessage}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-[#17253D] via-[#1A2C49] to-[#121F35] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Master Super Admin Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide flex items-center gap-3">
              ศูนย์จัดการสิทธิ์และแพ็กเกจร้านค้า
            </h1>
            <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
              ยินดีต้อนรับ Master Super Admin <span className="text-amber-300 font-mono font-semibold">{currentAdminEmail}</span> คุณมีสิทธิ์สูงสุดในการอนุมัติ ต่ออายุ ระงับ และควบคุมการเข้าใช้งานของทุกสาขา
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
            <button
              type="button"
              onClick={() => {
                setNewStartDate(getTodayDateString());
                setShowAddModal(true);
              }}
              className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>เพิ่มร้านค้าใหม่</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-[#131F37] border border-stone-800/80 rounded-2xl p-4 space-y-1 shadow-lg">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>ร้านค้าทั้งหมด</span>
              <Store className="w-4 h-4 text-stone-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-[#131F37] border border-emerald-900/40 rounded-2xl p-4 space-y-1 shadow-lg">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span>อนุมัติแล้ว</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400">{stats.approved}</div>
          </div>

          <div className="bg-[#131F37] border border-amber-900/40 rounded-2xl p-4 space-y-1 shadow-lg">
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
              <span>รอตรวจสอบ</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-amber-400">{stats.pending}</div>
          </div>

          <div className="bg-[#131F37] border border-rose-900/40 rounded-2xl p-4 space-y-1 shadow-lg">
            <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
              <span>ระงับการใช้งาน</span>
              <UserX className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-rose-400">{stats.suspended}</div>
          </div>

          <div className="bg-[#131F37] border border-orange-900/40 rounded-2xl p-4 space-y-1 shadow-lg col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-orange-400 text-xs font-semibold">
              <span>หมดอายุสิทธิ์</span>
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-orange-400">{stats.expired}</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-[#131F37] border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อร้านค้า หรือ อีเมลร้าน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D1627] border border-stone-700/70 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-stone-500 outline-none focus:border-amber-500"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0 mr-1 hidden sm:block" />
            {[
              { id: 'all', label: `ทั้งหมด (${stats.total})` },
              { id: 'approved', label: `อนุมัติแล้ว (${stats.approved})` },
              { id: 'pending', label: `รอตรวจสอบ (${stats.pending})` },
              { id: 'suspended', label: `ระงับ (${stats.suspended})` },
              { id: 'expired', label: `หมดอายุ (${stats.expired})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                    : 'bg-[#0D1627] text-stone-400 hover:bg-stone-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subscriptions List Section */}
        {loading ? (
          <div className="bg-[#131F37] border border-stone-800 rounded-3xl p-12 text-center text-stone-400 space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-400" />
            <p className="text-xs">กำลังโหลดข้อมูลร้านค้าทั้งหมดจากคลาวด์...</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="bg-[#131F37] border border-stone-800 rounded-3xl p-12 text-center text-stone-400 space-y-3">
            <Store className="w-10 h-10 mx-auto text-stone-600" />
            <p className="text-sm font-semibold text-stone-300">ไม่พบข้อมูลร้านค้าตามเงื่อนไขที่ค้นหา</p>
            <p className="text-xs text-stone-500">ลองเปลี่ยนคำค้นหา หรือกด "เพิ่มร้านค้าใหม่" เพื่อเริ่มต้นสร้างสิทธิ์</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubscriptions.map((sub) => {
              const isExp = sub.expiryDate < todayStr || sub.status === 'expired';
              const isSuspended = sub.status === 'suspended';
              const isPending = sub.status === 'pending';

              let badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              let statusLabel = '✅ อนุมัติแล้ว';

              if (isSuspended) {
                badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                statusLabel = '🚫 ระงับการใช้งาน';
              } else if (isExp) {
                badgeStyle = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
                statusLabel = '⏳ หมดอายุสิทธิ์';
              } else if (isPending) {
                badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                statusLabel = '🔴 รอตรวจสอบ';
              }

              return (
                <div
                  key={sub.email}
                  className="bg-[#131F37] border border-stone-800/90 hover:border-stone-700/90 rounded-2xl p-5 space-y-4 shadow-xl transition-all relative flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2 border-b border-stone-800/80 pb-3">
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="font-bold text-sm text-white truncate flex items-center gap-2">
                          <span>{sub.shopName || sub.email}</span>
                        </h3>
                        <p className="text-xs text-stone-400 font-mono truncate">{sub.email}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${badgeStyle}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Dates line */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#0D1627] p-2.5 rounded-xl border border-stone-800">
                      <div>
                        <span className="text-stone-500 block text-[10px]">วันเริ่มสิทธิ์:</span>
                        <span className="font-mono text-stone-300 font-medium">{sub.startDate || '-'}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[10px]">วันหมดอายุ:</span>
                        <span className={`font-mono font-bold ${isExp ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {sub.expiryDate || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {sub.notes && (
                      <div className="text-[11px] text-stone-400 bg-stone-900/60 p-2.5 rounded-xl border border-stone-800">
                        <span className="text-stone-500 font-semibold block text-[10px] mb-0.5">หมายเหตุ:</span>
                        <p className="line-clamp-2">{sub.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-stone-800/80 space-y-2">
                    {/* Status Toggle Row */}
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(sub.email, 'approved')}
                        className={`py-1.5 px-2 rounded-lg font-bold border transition-all cursor-pointer ${
                          sub.status === 'approved' && !isExp
                            ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                            : 'bg-stone-900/80 text-emerald-400 border-emerald-900/50 hover:bg-emerald-950/40'
                        }`}
                      >
                        อนุมัติ
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(sub.email, 'pending')}
                        className={`py-1.5 px-2 rounded-lg font-bold border transition-all cursor-pointer ${
                          sub.status === 'pending'
                            ? 'bg-amber-500 text-stone-950 border-amber-400'
                            : 'bg-stone-900/80 text-amber-400 border-amber-900/50 hover:bg-amber-950/40'
                        }`}
                      >
                        รอดำเนินการ
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(sub.email, 'suspended')}
                        className={`py-1.5 px-2 rounded-lg font-bold border transition-all cursor-pointer ${
                          sub.status === 'suspended'
                            ? 'bg-rose-500 text-stone-950 border-rose-400'
                            : 'bg-stone-900/80 text-rose-400 border-rose-900/50 hover:bg-rose-950/40'
                        }`}
                      >
                        ระงับ
                      </button>
                    </div>

                    {/* Secondary Row: Extend 30 days, Edit, Delete */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleQuickExtend30Days(sub)}
                        className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        title="ต่ออายุเพิ่ม 30 วันอัตโนมัติ"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>+30 วัน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(sub)}
                        className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 p-1.5 rounded-xl text-[11px] transition-all cursor-pointer"
                        title="แก้ไขข้อมูลวันที่และหมายเหตุ"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingShopEmail(sub.email)}
                        className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/50 p-1.5 rounded-xl text-[11px] transition-all cursor-pointer"
                        title="ลบข้อมูลร้านและคลาวด์ถาวร"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD NEW SHOP */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131F37] border border-stone-700 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative animate-fade-in">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                <span>อนุมัติและเพิ่มร้านค้าใหม่</span>
              </h2>
              <p className="text-xs text-stone-400">
                กรอกข้อมูลอีเมลและกำหนดจำนวนวันเปิดใช้งานระบบให้กับร้านค้าใหม่
              </p>
            </div>

            <form onSubmit={handleCreateNewShop} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  อีเมลร้านค้า (Email) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="เช่น shop.bkk@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#0D1627] border border-stone-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500 placeholder:text-stone-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  ชื่อร้านค้า (Shop Name)
                </label>
                <input
                  type="text"
                  placeholder="เช่น BARBER PRO สาขาพระราม 9"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  className="w-full bg-[#0D1627] border border-stone-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500 placeholder:text-stone-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    วันเริ่มสิทธิ์
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-[#0D1627] border border-stone-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    จำนวนวันที่อนุมัติ (วัน)
                  </label>
                  <select
                    value={newDurationDays}
                    onChange={(e) => setNewDurationDays(Number(e.target.value))}
                    className="w-full bg-[#0D1627] border border-stone-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  >
                    <option value={15}>15 วัน (ทดลอง)</option>
                    <option value={30}>30 วัน (1 เดือน)</option>
                    <option value={90}>90 วัน (3 เดือน)</option>
                    <option value={180}>180 วัน (6 เดือน)</option>
                    <option value={365}>365 วัน (1 ปี)</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#0D1627] p-3 rounded-xl border border-stone-800 text-[11px] text-amber-300 flex justify-between items-center">
                <span>คำนวณวันหมดอายุอัตโนมัติ:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {addDaysToDate(newStartDate || todayStr, newDurationDays || 30)}
                </span>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  สถานะแรกเริ่มต้น
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as SubscriptionStatus)}
                  className="w-full bg-[#0D1627] border border-stone-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-amber-500"
                >
                  <option value="approved">✅ อนุมัติใช้งานทันที (Approved)</option>
                  <option value="pending">🔴 รอดำเนินการ (Pending)</option>
                  <option value="suspended">🚫 ระงับการใช้งาน (Suspended)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  หมายเหตุเพิ่มเติม (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ชำระค่าบริการผ่าน PromptPay แล้ว..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-[#0D1627] border border-stone-700 rounded-xl p-3 text-white outline-none focus:border-amber-500 placeholder:text-stone-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-3 rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 rounded-xl transition-all shadow-lg cursor-pointer active:scale-95"
                >
                  บันทึกสิทธิ์ร้านค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SHOP */}
      {editingShop && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131F37] border border-stone-700 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative animate-fade-in">
            <button
              type="button"
              onClick={() => setEditingShop(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <span>แก้ไขสิทธิ์ร้านค้า</span>
              </h2>
              <p className="text-xs text-stone-400 font-mono">
                {editingShop.email}
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  ชื่อร้านค้า
                </label>
                <input
                  type="text"
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  className="w-full bg-[#0D1627] border border-stone-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    วันเริ่มสิทธิ์
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-[#0D1627] border border-stone-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    วันหมดอายุ
                  </label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full bg-[#0D1627] border border-stone-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  สถานะสิทธิ์
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
                  className="w-full bg-[#0D1627] border border-stone-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-amber-500"
                >
                  <option value="approved">✅ อนุมัติใช้งาน (Approved)</option>
                  <option value="pending">🔴 รอตรวจสอบ (Pending)</option>
                  <option value="suspended">🚫 ระงับการใช้งาน (Suspended)</option>
                  <option value="expired">⏳ หมดอายุสิทธิ์ (Expired)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  หมายเหตุผู้ดูแลระบบ
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-[#0D1627] border border-stone-700 rounded-xl p-3 text-white outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingShop(null)}
                  className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-3 rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 rounded-xl transition-all shadow-lg cursor-pointer active:scale-95"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE STORE */}
      {deletingShopEmail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131F37] border border-rose-900/60 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative animate-fade-in text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold font-serif text-white">
                ยืนยันการลบข้อมูลร้านค้าถาวร?
              </h2>
              <p className="text-xs text-rose-400 font-mono font-semibold bg-rose-950/40 p-2 rounded-xl border border-rose-900/40">
                {deletingShopEmail}
              </p>
              <p className="text-xs text-stone-300 leading-relaxed pt-1">
                การดำเนินการนี้จะลบทั้งเอกสารสิทธิ์ใน <code className="text-amber-300">subscriptions</code> และลบข้อมูลทั้งหมดของร้านนี้ในคลาวด์ Firestore (ช่างตัดผม, คิวการจอง, รายการลา, บริการ, การตั้งค่า ฯลฯ) เพื่อคืนพื้นที่คลาวด์
              </p>
              <p className="text-[11px] text-rose-400 font-bold">
                ⚠️ การกระทำนี้ไม่สามารถกู้คืนกลับมาได้อีก!
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingShopEmail(null)}
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-3 rounded-xl text-xs transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteStore}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isDeleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{isDeleting ? 'กำลังลบข้อมูล...' : 'ยืนยันลบถาวร'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

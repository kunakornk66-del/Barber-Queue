/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from 'react';
import { Booking, Hairdresser, LeaveRecord } from '../types';
import { Trash2, Phone, Calendar, Clock, User, UserCheck, Search, Sparkles, Pencil, X, Check, AlertCircle, AlertTriangle, ChevronDown, Scissors, CheckCircle2, Smartphone } from 'lucide-react';

// Helper to format Time to Thai style: e.g. "09:30" -> "09.30น."
export const formatThaiTime = (timeStr: string) => {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim().replace(' น.', '').replace('น.', '');
  return cleanTime.replace(':', '.') + 'น.';
};

// Status helpers for badges and labels
export const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'in-progress':
      return 'กำลังบริการ';
    case 'completed':
      return 'เสร็จแล้ว';
    case 'cancelled':
      return 'ยกเลิก';
    case 'waiting':
    default:
      return 'รอคิว';
  }
};

export const getStatusBadgeStyle = (status?: string) => {
  switch (status) {
    case 'in-progress':
      return 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200 shadow-2xs';
    case 'completed':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200 shadow-2xs';
    case 'cancelled':
      return 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200 shadow-2xs';
    case 'waiting':
    default:
      return 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-2xs';
  }
};

export const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'in-progress':
      return <Scissors className="w-3 h-3 text-blue-600 animate-pulse shrink-0" />;
    case 'completed':
      return <CheckCircle2 className="w-3 h-3 text-emerald-600 font-bold shrink-0" />;
    case 'cancelled':
      return <X className="w-3 h-3 text-rose-600 font-bold shrink-0" />;
    case 'waiting':
    default:
      return <Clock className="w-3 h-3 text-amber-600 shrink-0" />;
  }
};

interface BookingListProps {
  bookings: Booking[];
  hairdressers: Hairdresser[];
  leaves?: LeaveRecord[];
  onDeleteBooking: (id: string) => void;
  onUpdateBooking: (id: string, updatedData: Partial<Omit<Booking, 'id' | 'createdAt'>>) => void;
  jumpToTab: (index: number) => void;
  currentUser?: any;
  slotDuration?: number;
}

export default function BookingList({
  bookings,
  hairdressers,
  leaves = [],
  onDeleteBooking,
  onUpdateBooking,
  jumpToTab,
  currentUser,
  slotDuration = 30
}: BookingListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'waiting' | 'in-progress' | 'completed' | 'cancelled'>('all');
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  // Real-time ticker every 30 seconds for 60-minute countdown indicators
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Helper to check if a booking is within the next 60 minutes
  const getUpcoming60MinAlert = (booking: Booking) => {
    if (booking.status === 'completed' || booking.status === 'cancelled') return null;
    
    try {
      const [year, month, day] = booking.date.split('-').map(Number);
      const [hours, mins] = booking.startTime.split(':').map(Number);
      if (!year || !month || !day || isNaN(hours) || isNaN(mins)) return null;

      const bookingTime = new Date(year, month - 1, day, hours, mins);
      const diffMs = bookingTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      // Same date check
      const nowDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (booking.date !== nowDateStr) return null;

      if (diffMins >= 0 && diffMins <= 60) {
        if (diffMins === 0) {
          return { isUpcoming: true, label: '⚡ ถึงเวลานัดหมายแล้ว (เตรียมให้บริการ)', mins: 0, isNow: true };
        }
        return { isUpcoming: true, label: `⚡ อีก ${diffMins} นาทีถึงคิว (เตรียมพร้อม)`, mins: diffMins, isNow: false };
      }
      if (diffMins < 0 && diffMins >= -30 && booking.status !== 'in-progress') {
        return { isUpcoming: true, label: `🔥 ถึงเวลาแล้ว (${Math.abs(diffMins)} นาทีที่แล้ว)`, mins: diffMins, isNow: true };
      }
    } catch {
      return null;
    }
    return null;
  };
  
  // State for confirm delete modal
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);

  // State for viewing payment slip modal
  const [viewSlipUrl, setViewSlipUrl] = useState<string | null>(null);

  // State for editing a booking
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editHairdresserId, setEditHairdresserId] = useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editRecordedBy, setEditRecordedBy] = useState('');
  const [editStatus, setEditStatus] = useState<'waiting' | 'in-progress' | 'completed' | 'cancelled'>('waiting');
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setEditDate(booking.date);
    setEditStartTime(booking.startTime);
    setEditEndTime(booking.endTime);
    // If it was auto-assigned under "unspecified", show "anyone" as selected in the editor
    setEditHairdresserId(booking.isAnyBarber ? null : booking.hairdresserId);
    setEditCustomerName(booking.customerName);
    setEditCustomerPhone(booking.customerPhone);
    setEditRemarks(booking.remarks || '');
    setEditRecordedBy(booking.recordedBy || '');
    setEditStatus(booking.status || 'waiting');
    setEditError(null);
  };

  const handleEditStartTimeChange = (newStart: string) => {
    setEditStartTime(newStart);
    
    // Parse start time to calculate automatic slot duration
    const [hours, minutes] = newStart.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      let endHours = hours;
      let endMinutes = minutes + slotDuration;
      
      if (endMinutes >= 60) {
        const extraHours = Math.floor(endMinutes / 60);
        endHours += extraHours;
        endMinutes = endMinutes % 60;
      }
      
      if (endHours >= 24) {
        endHours = 23;
        endMinutes = 59;
      }
      
      const formattedEnd = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
      setEditEndTime(formattedEnd);
    }
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    if (!editCustomerName.trim()) {
      setEditError('กรุณากรอกชื่อลูกค้า');
      return;
    }

    // Validate times
    const startNum = parseInt(editStartTime.replace(':', ''), 10);
    const endNum = parseInt(editEndTime.replace(':', ''), 10);
    if (endNum <= startNum) {
      setEditError('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มการจอง');
      return;
    }

    let finalEditHairdresserId = editHairdresserId;
    let editIsAnyBarber = false;

    if (editHairdresserId === null) {
      // Find all available hairdressers
      const availableHairdressers = hairdressers.filter(hd => {
        // 1. Must not be on leave
        if (hd.onLeave) return false;

        // 2. Must not have overlapping leave record
        const hasLeave = leaves && leaves.some(l => {
          return l.hairdresserId === hd.id &&
                 l.date === editDate &&
                 editStartTime < l.endTime && l.startTime < editEndTime;
        });
        if (hasLeave) return false;

        // 3. Must not have overlapping booking
        const hasOverlapBooking = bookings && bookings.some(booking => {
          if (booking.id === editingBooking.id) return false; // skip self
          if (booking.date !== editDate || booking.hairdresserId !== hd.id) {
            return false;
          }
          const startA = editStartTime;
          const endA = editEndTime;
          const startB = booking.startTime;
          const endB = booking.endTime;
          return startA < endB && startB < endA;
        });
        if (hasOverlapBooking) return false;

        // 4. Must not be currently busy at the physical shop
        if (hd.busyUntil && hd.busyStart && editDate === getTodayDateString()) {
          const now = new Date();
          const busyUntilDT = new Date(hd.busyUntil);
          if (busyUntilDT > now) {
            const busyStartDT = new Date(hd.busyStart);
            const isFarFuture = busyUntilDT.getFullYear() >= 2030;
            const effectiveEndDT = isFarFuture ? now : busyUntilDT;

            const reqStartDT = new Date(`${editDate}T${editStartTime}:00`);
            const reqEndDT = new Date(`${editDate}T${editEndTime}:00`);
            if (reqStartDT < effectiveEndDT && busyStartDT < reqEndDT) {
              return false;
            }
          }
        }

        return true;
      });

      if (availableHairdressers.length === 0) {
        setEditError('⚠️ ขออภัย ช่างทุกคนติดคิวหรือลางานในช่วงเวลานี้ ไม่สามารถจองแบบไม่ระบุช่างได้');
        return;
      }

      // Sort by booking count on this date (load balancing)
      const bookingsCountMap = new Map<string, number>();
      hairdressers.forEach(hd => bookingsCountMap.set(hd.id, 0));
      if (bookings) {
        bookings.forEach(b => {
          if (b.id !== editingBooking.id && b.date === editDate && b.hairdresserId) {
            bookingsCountMap.set(b.hairdresserId, (bookingsCountMap.get(b.hairdresserId) || 0) + 1);
          }
        });
      }

      availableHairdressers.sort((a, b) => {
        const countA = bookingsCountMap.get(a.id) || 0;
        const countB = bookingsCountMap.get(b.id) || 0;
        return countA - countB;
      });

      finalEditHairdresserId = availableHairdressers[0].id;
      editIsAnyBarber = true;
    } else {
      // Original validation for specific hairdresser
      const selectedHairdresser = hairdressers.find(h => h.id === editHairdresserId);
      if (selectedHairdresser && selectedHairdresser.busyUntil && selectedHairdresser.busyStart && editDate === getTodayDateString()) {
        const now = new Date();
        const busyUntilDT = new Date(selectedHairdresser.busyUntil);
        if (busyUntilDT > now) {
          const busyStartDT = new Date(selectedHairdresser.busyStart);
          const isFarFuture = busyUntilDT.getFullYear() >= 2030;
          const effectiveEndDT = isFarFuture ? now : busyUntilDT;

          const reqStartDT = new Date(`${editDate}T${editStartTime}:00`);
          const reqEndDT = new Date(`${editDate}T${editEndTime}:00`);
          if (reqStartDT < effectiveEndDT && busyStartDT < reqEndDT) {
            setEditError(`⚠️ ช่าง${selectedHairdresser.name} กำลังติดให้บริการตัดผมหน้าร้านอยู่ ณ ขณะนี้ และยังไม่เสร็จงาน จึงไม่สามารถลงคิวซ้อนในช่วงเวลานี้ได้`);
            return;
          }
        }
      }

      if (leaves && leaves.length > 0) {
        if (selectedHairdresser) {
          const activeLeave = leaves.find(l => {
            return l.hairdresserId === editHairdresserId &&
                   l.date === editDate &&
                   editStartTime < l.endTime && l.startTime < editEndTime;
          });
          if (activeLeave) {
            setEditError(`ช่าง${selectedHairdresser.name} ติดปิดคิว/ลางาน ในช่วงเวลานี้ (${formatThaiTime(activeLeave.startTime)} - ${formatThaiTime(activeLeave.endTime)})`);
            return;
          }
        }
      }

      // Check overlaps gently
      const overlapping = bookings.find(booking => {
        if (booking.id === editingBooking.id) return false; // skip self
        if (booking.date !== editDate || booking.hairdresserId !== editHairdresserId) return false;

        const startA = editStartTime;
        const endA = editEndTime;
        const startB = booking.startTime;
        const endB = booking.endTime;

        return startA < endB && startB < endA;
      });

      if (overlapping) {
        const confirmed = window.confirm(`⚠️ มีคิวทับซ้อนของช่างในเวลาดังกล่าวกับลูกค้า "${overlapping.customerName}" คุณต้องการที่จะบันทึกซ้ำซ้อนหรือไม่?`);
        if (!confirmed) {
          return;
        }
      }
    }

    onUpdateBooking(editingBooking.id, {
      date: editDate,
      startTime: editStartTime,
      endTime: editEndTime,
      hairdresserId: finalEditHairdresserId,
      customerName: editCustomerName.trim(),
      customerPhone: editCustomerPhone.trim(),
      remarks: editRemarks.trim(),
      recordedBy: editRecordedBy.trim() || editingBooking.recordedBy,
      isAnyBarber: editIsAnyBarber,
      status: editStatus
    });

    setEditingBooking(null);
  };

  // Helper to get local date string YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateString();

  // Helper to format Date for layout in Thai: e.g. "13 มิ.ย. 2026"
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      
      const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      const day = d.getDate();
      const month = thaiMonths[d.getMonth()];
      const year = d.getFullYear() + 543; // Thai Buddhist Era year
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Find hairdresser helper
  const getHairdresserName = (id: string | null) => {
    if (id === null) return 'ไม่ระบุช่าง (ใครก็ได้)';
    const found = hairdressers.find(h => h.id === id);
    return found ? `ช่าง${found.name}` : 'ช่างไม่ถูกพบ';
  };

  // Filter and Sort bookings
  const filteredBookings = bookings
    .filter(booking => {
      // 1. Search Query filter (Customer name, phone, remarks, hairdresser name)
      const query = searchQuery.toLowerCase().trim();
      const hdName = booking.hairdresserId ? getHairdresserName(booking.hairdresserId).toLowerCase() : 'ไม่ระบุช่าง';
      const matchesSearch = 
        booking.customerName.toLowerCase().includes(query) ||
        booking.customerPhone.includes(query) ||
        booking.remarks.toLowerCase().includes(query) ||
        booking.recordedBy.toLowerCase().includes(query) ||
        hdName.includes(query);

      if (!matchesSearch) return false;

      // 2. Tab Date Filter
      if (selectedDateFilter === 'today' && booking.date !== todayStr) {
        return false;
      } else if (selectedDateFilter === 'upcoming' && booking.date <= todayStr) {
        return false;
      }

      return true;
    })
    // Sort logically: date ascending, then startTime ascending
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });

  // Group bookings by date, then by hairdresser
  interface GroupedByHairdresser {
    hairdresserId: string | null;
    hairdresserName: string;
    bookings: Booking[];
  }

  interface GroupedByDate {
    date: string;
    hairdressers: GroupedByHairdresser[];
  }

  const groupedBookings: GroupedByDate[] = [];

  filteredBookings.forEach((booking) => {
    let dateGroup = groupedBookings.find((g) => g.date === booking.date);
    if (!dateGroup) {
      dateGroup = { date: booking.date, hairdressers: [] };
      groupedBookings.push(dateGroup);
    }

    const hdId = booking.hairdresserId;
    let hdGroup = dateGroup.hairdressers.find((h) => h.hairdresserId === hdId);
    if (!hdGroup) {
      const hdName = getHairdresserName(hdId);
      hdGroup = { hairdresserId: hdId, hairdresserName: hdName, bookings: [] };
      dateGroup.hairdressers.push(hdGroup);
    }

    hdGroup.bookings.push(booking);
  });

  // Sort hairdressers inside each date group alphabetically, but keep "No specified hairdresser (ใครก็ได้)" at the end
  groupedBookings.forEach((dateGroup) => {
    dateGroup.hairdressers.sort((a, b) => {
      if (a.hairdresserId === null) return 1;
      if (b.hairdresserId === null) return -1;
      return a.hairdresserName.localeCompare(b.hairdresserName, 'th');
    });
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Information Prune Banner */}
      <div className="bg-brand-light border border-brand/20 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row gap-4 items-start md:items-center justify-between" id="prune-notice-banner">
        <div className="flex gap-3.5 items-start">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand shrink-0 mt-0.5 md:mt-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-serif">
              🧹 ระบบล้างประวัติอัจฉริยะ (Auto-Clean)
            </h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              หน้านี้จะเคลียร์ประวัติทิ้งทุกวันที่พ้นวันโดยอัตโนมัติ จะไม่มีข้อมูลของวันที่ผ่านมาเหลืออยู่ในระบบ เพื่อความรวดเร็วและเป็นส่วนตัวของทางร้าน
            </p>
          </div>
        </div>
        <div className="self-stretch md:self-auto flex items-center bg-white px-3 py-1.5 rounded-2xl border border-brand/30 text-[11px] text-brand-dark font-bold shrink-0 shadow-xs justify-center gap-1">
          <span>สถานะ: ล้างประวัติล่วงลับแล้ววันนี้</span>
        </div>
      </div>

      {/* Control panel: search + date filter + status filter */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col gap-4" id="booking-controls">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch justify-between">
          {/* Search Input bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              id="search-booking-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, หมายเหตุ, ช่าง..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all placeholder:text-stone-400 bg-stone-50/50 font-sans"
            />
          </div>

          {/* Date Filter Segmented control */}
          <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200/30 gap-1 shrink-0 overflow-x-auto" id="date-filter-segments">
            {(['all', 'today', 'upcoming'] as const).map((filter) => {
              const labels = {
                all: `คิวที่มีทั้งหมด (${bookings.length})`,
                today: 'เฉพาะวันนี้ เท่านั้น',
                upcoming: 'คิววันข้างหน้า'
              };
              const isSelected = selectedDateFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedDateFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected 
                      ? 'bg-brand text-white shadow-xs' 
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50/50'
                  }`}
                >
                  {labels[filter]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Barber Status Strip */}
      {(hairdressers.some(h => h.busyUntil && h.busyStart && new Date(h.busyUntil) > new Date()) ||
        hairdressers.some(h => h.breakUntil && h.breakStart && new Date(h.breakUntil) > new Date())) && (
        <div className="bg-stone-50/80 border border-stone-200 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs" id="live-barbers-busy-banner">
          <div className="flex gap-2.5 items-start">
            <span className="text-base">💈</span>
            <div>
              <h4 className="text-xs font-bold text-stone-800 font-sans flex items-center gap-1.5">
                <span>อัปเดตสถานะของช่างในขณะนี้</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5">
                ช่างที่มีสถานะ "กำลังให้บริการ" หรือ "พักเบรก" จะไม่ถูกนับเป็นช่างที่ว่างรับคิวจอง
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hairdressers.filter(h => h.busyUntil && h.busyStart && new Date(h.busyUntil) > new Date()).map(hd => {
              const d = new Date(hd.busyStart!);
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              return (
                <span key={`busy-list-${hd.id}`} className="inline-flex items-center gap-1 bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-xl shadow-xs border border-amber-600/15 animate-pulse">
                  ช่าง{hd.name}: กำลังให้บริการ ({hh}.{mm}น.)
                </span>
              );
            })}
            {hairdressers.filter(h => h.breakUntil && h.breakStart && new Date(h.breakUntil) > new Date()).map(hd => {
              const d = new Date(hd.breakStart!);
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              return (
                <span key={`break-list-${hd.id}`} className="inline-flex items-center gap-1 bg-sky-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-xl shadow-xs border border-sky-600/15 animate-pulse">
                  ช่าง{hd.name}: พักเบรก ({hh}.{mm}น.)
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Banner for Appointments starting within the next 60 minutes */}
      {(() => {
        const upcomingAlerts = bookings.filter(b => getUpcoming60MinAlert(b) !== null);
        if (upcomingAlerts.length === 0) return null;
        return (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border border-amber-400 animate-fade-in" id="upcoming-60min-alert-banner">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shrink-0">
                ⚡
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black flex items-center gap-2">
                  <span>มี {upcomingAlerts.length} คิวนัดหมายที่จะถึงภายใน 60 นาทีนี้!</span>
                  <span className="bg-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    แจ้งเตือนทีมงานเตรียมตัว
                  </span>
                </h4>
                <p className="text-[11px] text-amber-100 mt-0.5">
                  โปรดเตรียมเก้าอี้และอุปกรณ์ทำผมให้พร้อมบริการก่อนลูกค้าเดินทางมาถึง
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {upcomingAlerts.slice(0, 3).map((b) => (
                <span key={`banner-alert-${b.id}`} className="bg-stone-900 text-amber-300 font-bold text-[10px] px-2.5 py-1 rounded-xl shadow-xs border border-amber-400/30 font-mono">
                  ⏱️ {formatThaiTime(b.startTime)} ({b.customerName})
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Grid of booking cards grouped by date & hairdresser */}
      <div className="space-y-6" id="booking-cards-container">
        {groupedBookings.length > 0 ? (
          groupedBookings.map((dateGroup) => {
            const isDateToday = dateGroup.date === todayStr;

            return (
              <div key={dateGroup.date} className="space-y-4" id={`date-group-${dateGroup.date}`}>
                {/* Date Header Badge */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px bg-stone-200/80 flex-grow animate-pulse"></div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold font-serif shadow-xs ${
                    isDateToday
                      ? 'bg-brand text-white border-brand'
                      : 'bg-[#F5F2EB] border-[#E2DCD3] text-stone-850'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{isDateToday ? '☀️ คิวของวันนี้' : '📅 คิววันที่'} - {formatThaiDate(dateGroup.date)}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-sans font-bold ${
                      isDateToday ? 'bg-white/20 text-white' : 'bg-[#E3DCD1] text-stone-800'
                    }`}>
                      {dateGroup.hairdressers.reduce((s, h) => s + h.bookings.length, 0)} คิวจอง
                    </span>
                  </div>
                  <div className="h-px bg-stone-200/80 flex-grow animate-pulse"></div>
                </div>

                {/* Grid layout of Hairdressers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {dateGroup.hairdressers.map((hdGroup) => {
                    const isNoSpecifiedHairdresser = hdGroup.hairdresserId === null;

                    return (
                      <div
                        key={hdGroup.hairdresserId || 'anyone'}
                        className="bg-white rounded-3xl border border-stone-200/90 shadow-xs hover:shadow-md hover:border-brand/35 transition-all duration-350 flex flex-col"
                      >
                        {/* Hairdresser Header */}
                        <div className="bg-[#FAF8F5]/90 px-4.5 py-3.5 border-b border-stone-105 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                              <UserCheck className={`w-4 h-4 ${isNoSpecifiedHairdresser ? 'text-stone-400' : 'text-brand'}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-serif font-bold text-stone-900 text-xs sm:text-sm truncate">
                                  {hdGroup.hairdresserName}
                                </h3>
                                {!isNoSpecifiedHairdresser && (() => {
                                  const hdObj = hairdressers.find(h => h.id === hdGroup.hairdresserId);
                                  const isBusy = hdObj?.busyUntil && hdObj?.busyStart && new Date(hdObj.busyUntil) > new Date();
                                  const isBreak = hdObj?.breakUntil && hdObj?.breakStart && new Date(hdObj.breakUntil) > new Date();
                                  if (isBusy) {
                                    const dStart = new Date(hdObj.busyStart!);
                                    const hh = String(dStart.getHours()).padStart(2, '0');
                                    const mm = String(dStart.getMinutes()).padStart(2, '0');
                                    return (
                                      <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/40 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 shrink-0 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                        กำลังให้บริการ ({hh}.{mm}น.)
                                      </span>
                                    );
                                  }
                                  if (isBreak) {
                                    const dStart = new Date(hdObj.breakStart!);
                                    const hh = String(dStart.getHours()).padStart(2, '0');
                                    const mm = String(dStart.getMinutes()).padStart(2, '0');
                                    return (
                                      <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-200/40 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 shrink-0 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                        พักเบรก ({hh}.{mm}น.)
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <p className="text-[9px] text-stone-400 font-light truncate">
                                {isNoSpecifiedHairdresser ? 'คิวช่างคนไหนก็ได้ (ใครว่างรับ)' : 'ช่างประจำสาขา'}
                              </p>
                            </div>
                          </div>
                          <span className="bg-stone-earth text-[#DBCBB5] px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono shrink-0 border border-stone-850">
                            {hdGroup.bookings.length} คิว
                          </span>
                        </div>

                        {/* List of compact queue times inside hairdresser's box */}
                        <div className="flex-1 bg-white/50 max-h-[380px] overflow-y-auto divide-y divide-stone-100 px-5" id={`bookings-list-hd-${hdGroup.hairdresserId || 'anyone'}`}>
                          {hdGroup.bookings.map((booking) => {
                            const alertInfo = getUpcoming60MinAlert(booking);
                            const isUpcoming60Min = alertInfo !== null;

                            return (
                              <div
                                key={booking.id}
                                id={`booking-card-${booking.id}`}
                                className={`py-3 px-3.5 my-1.5 flex flex-col gap-1.5 transition-all text-xs rounded-2xl ${
                                  isUpcoming60Min
                                    ? 'bg-gradient-to-r from-amber-500/15 via-amber-100/80 to-amber-50/60 border-2 border-amber-500/80 shadow-xs ring-2 ring-amber-300/40 relative'
                                    : ''
                                }`}
                              >
                                {/* 60-Minute Alert Badge */}
                                {alertInfo && (
                                  <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-900 px-3 py-1 rounded-xl text-[10px] font-black shadow-2xs animate-pulse">
                                    <span className="flex items-center gap-1.5 truncate text-white">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                                      <span>{alertInfo.label}</span>
                                    </span>
                                    <span className="bg-stone-900 text-amber-300 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold shrink-0">
                                      แจ้งเตือนทีมงานเตรียมพร้อม
                                    </span>
                                  </div>
                                )}

                                {/* Core detail line */}
                                <div className="flex items-center justify-between gap-2.5">
                                  {/* Left side: Time and Name */}
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <span className="bg-stone-earth text-[#DBCBB5] px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold shrink-0 border border-stone-850/30">
                                      ⏱️ {formatThaiTime(booking.startTime)} - {formatThaiTime(booking.endTime)}
                                    </span>
                                    <span className="text-xs font-bold text-stone-900 truncate" title={booking.customerName}>
                                      {booking.customerName}
                                    </span>
                                    {booking.isAnyBarber && (
                                      <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0">
                                        ไม่ระบุช่าง (ใครก็ได้)
                                      </span>
                                    )}
                                  </div>

                                  {/* Right side: Phone & Actions */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {booking.customerPhone && (
                                      <a
                                        href={`tel:${booking.customerPhone}`}
                                        className="text-[10px] text-stone-500 hover:text-brand font-semibold flex items-center gap-0.5 bg-[#FAF7F2] border border-stone-200/50 px-2 py-0.5 rounded-lg hover:border-brand/35 transition-all"
                                        title={`โทรหา ${booking.customerName}`}
                                      >
                                        <Phone className="w-2.5 h-2.5 text-brand" />
                                        <span className="hidden sm:inline">{booking.customerPhone}</span>
                                      </a>
                                    )}

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        id={`edit-btn-${booking.id}`}
                                        onClick={() => startEdit(booking)}
                                        className="text-stone-350 hover:text-brand p-1.5 rounded-lg hover:bg-stone-100 transition-all cursor-pointer shrink-0"
                                        title="แก้ไขคิวจองนี้"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        id={`delete-btn-${booking.id}`}
                                        onClick={() => setBookingToDelete(booking)}
                                        className="text-stone-350 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all cursor-pointer shrink-0"
                                        title="ลบคิวจองนี้"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Additional Row for Remarks and Recorder, cleanly aligned */}
                                {(booking.remarks || booking.recordedBy || booking.paymentSlipUrl) && (
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pl-[84px]">
                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                      {booking.remarks ? (
                                        <span className="text-brand font-medium italic block truncate" title={booking.remarks}>
                                          💡 "{booking.remarks}"
                                        </span>
                                      ) : (
                                        <span className="text-stone-350 italic font-light">ไม่มีหมายเหตุ</span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {booking.paymentSlipUrl && (
                                        <button
                                          type="button"
                                          onClick={() => setViewSlipUrl(booking.paymentSlipUrl || null)}
                                          className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs active:scale-95"
                                          title="คลิกเพื่อขยายดูรูปสลิปโอนเงิน"
                                        >
                                          <span>🧾 ดูสลิปโอนเงิน</span>
                                        </button>
                                      )}

                                      {booking.recordedBy && (
                                        <div>
                                          {booking.recordedBy.includes('ลูกค้าจองเอง') ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs">
                                              <Smartphone className="w-2.5 h-2.5 text-emerald-700" />
                                              <span>📱 ลูกค้าจองเองออนไลน์</span>
                                            </span>
                                          ) : (
                                            <span className="text-[9px] font-medium text-stone-500 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded-md">
                                              ลงคิวโดย: {booking.recordedBy}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl p-12 border border-stone-200 shadow-sm text-center max-w-lg mx-auto" id="no-bookings-view">
            <div className="w-16 h-16 rounded-full bg-[#FDF8F3] flex items-center justify-center mx-auto text-3xl mb-4 border border-brand/20">
              📅
            </div>
            <h3 className="font-bold text-stone-900 text-base font-serif">ไม่พบคิวการจอง</h3>
            <p className="text-xs text-stone-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {searchQuery 
                ? 'ไม่พบคิวจองที่ตรงตามคำค้นหาของคุณ กรุณาลองตรวจสอบใหม่อีกครั้ง'
                : 'ไม่มีรายการจองตามกำหนดการที่คุณเปิดอยู่ ณ ขณะนี้ ลองประเดิมคิวแรกของวันนี้โดยกดปุ่มลงคิว'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => jumpToTab(0)} // go to book form
                className="mt-6 inline-flex px-5 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-2xl gap-1.5 items-center transition-all shadow-sm cursor-pointer"
              >
                💇‍♂️ เริ่มต้นลงคิวใหม่ตอนนี้
              </button>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 inline-flex px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-2xl items-center transition-all cursor-pointer"
              >
                ล้างคำค้นหา
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Booking Modal Overlay */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs" id="edit-booking-modal-overlay">
          <div 
            className="absolute inset-0 transition-opacity duration-300"
            onClick={() => setEditingBooking(null)}
          />

          {/* Modal Content */}
          <div 
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-stone-200 shadow-2xl relative z-10 animate-fade-in flex flex-col"
            id="edit-booking-modal"
          >
            {/* Modal Header */}
            <div className="bg-[#FAF8F5] px-6 py-4 border-b border-stone-200/60 flex items-center justify-between sticky top-0 bg-opacity-95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base">แก้ไขข้อมูลคิวจอง</h3>
                  <p className="text-[10px] text-stone-400 font-light">จัดแต่งและย้ายคิวได้ทันที</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 flex-1">
              {editError && (
                <div className="bg-red-50 border border-red-250 text-red-700 px-4 py-2.5 rounded-2xl text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-brand" /> ชื่อลูกค้า
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-250 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-[#FAF9F6] text-stone-850"
                    placeholder=""
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-brand" /> เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-250 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-[#FAF9F6] text-stone-850"
                    placeholder=""
                  />
                </div>
              </div>

              {/* Date & times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-brand" /> วันที่บริการ
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-250 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-[#FAF9F6] text-stone-850"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand" /> เวลาเริ่มคิว
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => handleEditStartTimeChange(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-250 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-[#FAF9F6] text-stone-850"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand" /> เวลาเสร็จ
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-250 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-[#FAF9F6] text-stone-850"
                    required
                  />
                </div>
              </div>

              {/* Hairdresser selects */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-brand" /> เลือกช่างตัดผมประจำคิว
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditHairdresserId(null)}
                    className={`px-3 py-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                      editHairdresserId === null
                        ? 'bg-brand border-brand text-white shadow-sm'
                        : 'bg-[#FAF9F6] border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    ใครก็ได้ (ยังไม่ระบุ)
                  </button>
                  {hairdressers.map((hd) => {
                    const isOnLeave = !!hd.onLeave;
                    const isSelected = editHairdresserId === hd.id;
                    return (
                      <button
                        key={hd.id}
                        type="button"
                        onClick={() => setEditHairdresserId(hd.id)}
                        className={`px-3 py-2 rounded-xl border text-[11px] font-bold text-center transition-all truncate cursor-pointer ${
                          isSelected
                            ? isOnLeave
                              ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                              : 'bg-brand border-brand text-white shadow-sm'
                            : isOnLeave
                              ? 'bg-stone-50 border-stone-150 text-stone-400 opacity-65 line-through'
                              : 'bg-[#FAF9F6] border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                        title={isOnLeave ? `ช่าง${hd.name} ลางาน / ปิดรับคิว` : undefined}
                      >
                        ช่าง{hd.name} {isOnLeave && '(ลางาน)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                  💡 หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-205 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-[#FAF9F6] text-stone-800 placeholder:text-stone-400"
                  placeholder=""
                />
              </div>

              {/* Recorder */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                  👤 ช่างผู้แก้ไขบันทึกคิว
                </label>
                <div className="relative">
                  <select
                    value={editRecordedBy}
                    onChange={(e) => setEditRecordedBy(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-205 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-[#FAF9F6] text-stone-800 appearance-none cursor-pointer"
                  >
                    {hairdressers.map((hd) => (
                      <option key={hd.id} value={hd.name}>ช่าง{hd.name}</option>
                    ))}
                    <option value="แคชเชียร์">ผู้จัดการ / แคชเชียร์</option>
                    <option value="ระบบ">สิทธิ์ผู้ดูแลระบบ</option>
                  </select>
                  <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-stone-500 text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Action operations and submission */}
              <div className="flex gap-2.5 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="flex-1 py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-600 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>บันทึกแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal overlay for deleting a booking */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in" id="delete-booking-modal-overlay">
          <div 
            className="absolute inset-0"
            onClick={() => setBookingToDelete(null)}
          />
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl relative z-10 p-6 space-y-5 animate-scale-up" id="delete-booking-modal">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">ยืนยันการลบคิวจอง</h3>
                <p className="text-xs text-stone-500 font-light">โปรดตรวจสอบข้อมูลคิวจองก่อนยืนยันการลบทิ้ง</p>
              </div>
            </div>

            <div className="bg-red-50/70 border border-red-200/60 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-stone-700">
                <span className="text-stone-500">ลูกค้า:</span>
                <span className="font-bold text-stone-900 text-sm">{bookingToDelete.customerName}</span>
              </div>
              {bookingToDelete.customerPhone && (
                <div className="flex justify-between items-center text-stone-700">
                  <span className="text-stone-500">เบอร์โทรศัพท์:</span>
                  <span className="font-bold font-mono">{bookingToDelete.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-stone-700">
                <span className="text-stone-500">วันที่และเวลา:</span>
                <span className="font-bold text-brand-dark">
                  {bookingToDelete.date} ({formatThaiTime(bookingToDelete.startTime)} - {formatThaiTime(bookingToDelete.endTime)})
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-700">
                <span className="text-stone-500">ช่างตัดผม:</span>
                <span className="font-bold text-stone-900">
                  {bookingToDelete.hairdresserId ? getHairdresserName(bookingToDelete.hairdresserId) : 'ไม่ระบุช่าง (ใครก็ได้)'}
                </span>
              </div>
              {bookingToDelete.remarks && (
                <div className="flex justify-between items-center text-stone-700 pt-1 border-t border-red-200/40">
                  <span className="text-stone-500">หมายเหตุ:</span>
                  <span className="font-semibold text-brand italic">{bookingToDelete.remarks}</span>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200/70 p-3 rounded-xl text-stone-700 text-xs font-medium text-center">
              ⚠️ <strong>คำเตือน:</strong> หากกดยืนยัน รายการคิวนี้จะถูกลบออกจากระบบทันทีและไม่สามารถกู้คืนได้
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                id="cancel-delete-booking-modal-btn"
                onClick={() => setBookingToDelete(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="confirm-delete-booking-modal-btn"
                onClick={() => {
                  onDeleteBooking(bookingToDelete.id);
                  setBookingToDelete(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> ยืนยันลบคิวจอง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Slip Modal Overlay */}
      {viewSlipUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fade-in" id="view-slip-modal-overlay">
          <div className="absolute inset-0" onClick={() => setViewSlipUrl(null)} />
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative z-10 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>🧾 หลักฐานสลิปการโอนเงิน</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewSlipUrl(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-100 rounded-2xl p-2 max-h-[70vh] overflow-auto flex items-center justify-center">
              <img
                src={viewSlipUrl}
                alt="Payment Slip Full Size"
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => setViewSlipUrl(null)}
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

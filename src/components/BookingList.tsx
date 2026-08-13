/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect, useMemo } from 'react';
import { Booking, Hairdresser, LeaveRecord } from '../types';
import { Trash2, Phone, Calendar, Clock, User, UserCheck, Search, Sparkles, Pencil, X, Check, AlertCircle, AlertTriangle, ChevronDown, Scissors, CheckCircle2, Smartphone, CalendarClock } from 'lucide-react';

// Helper to format Time to Thai style: e.g. "09:30" -> "09.30น."
export const formatThaiTime = (timeStr: string) => {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim().replace(' น.', '').replace('น.', '');
  return cleanTime.replace(':', '.') + 'น.';
};

// Helper to parse time string "HH:MM" to total minutes from midnight
export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

// Helper to format minutes into readable Thai duration
export const formatGapDurationThai = (mins: number): string => {
  if (mins < 60) return `${mins} นาที`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs} ชม. ${remMins} นาที` : `${hrs} ชั่วโมง`;
};

// Helper to derive effective booking status based on explicit setting or real time
export const getEffectiveStatus = (
  booking: Booking,
  currentTime?: Date
): 'waiting' | 'in-progress' | 'completed' | 'cancelled' => {
  // Explicit statuses take priority if cancelled or explicitly marked completed
  if (booking.status === 'cancelled') return 'cancelled';
  if (booking.status === 'completed') return 'completed';

  const now = currentTime || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Past dates automatically completed if not cancelled
  if (booking.date < todayStr) {
    return 'completed';
  }

  // Today
  if (booking.date === todayStr) {
    // If current time has reached or passed end time, automatically completed
    if (currentHHMM >= booking.endTime) {
      return 'completed';
    }
    // If current time is within booking slot [startTime, endTime)
    if (booking.startTime <= currentHHMM && currentHHMM < booking.endTime) {
      return 'in-progress';
    }
  }

  return booking.status || 'waiting';
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
  const [sortBy, setSortBy] = useState<'time' | 'hairdresser'>('hairdresser');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFreeGaps, setShowFreeGaps] = useState(true);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  // Real-time ticker every 30 seconds for 60-minute countdown indicators
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Helper to check if a booking is within the next 60 minutes or active
  const getUpcoming60MinAlert = (booking: Booking) => {
    if (!booking || !booking.date || typeof booking.date !== 'string' || !booking.startTime || typeof booking.startTime !== 'string') {
      return null;
    }
    const effStatus = getEffectiveStatus(booking, now);
    if (effStatus === 'completed' || effStatus === 'cancelled') return null;
    
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

      if (effStatus === 'in-progress') {
        return { isUpcoming: true, label: '✂️ กำลังให้บริการ ณ ขณะนี้', mins: 0, isNow: true };
      }

      if (diffMins >= 0 && diffMins <= 60) {
        if (diffMins === 0) {
          return { isUpcoming: true, label: '⚡ ถึงเวลานัดหมายแล้ว (เตรียมให้บริการ)', mins: 0, isNow: true };
        }
        return { isUpcoming: true, label: `⚡ อีก ${diffMins} นาทีถึงคิว (เตรียมพร้อม)`, mins: diffMins, isNow: false };
      }
      if (diffMins < 0 && diffMins >= -60) {
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

  // State for Quick Reschedule Queue Modal
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');
  const [rescheduleHairdresserId, setRescheduleHairdresserId] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const openRescheduleModal = (booking: Booking) => {
    setRescheduleBooking(booking);
    setRescheduleDate(booking.date);
    setRescheduleStartTime(booking.startTime);
    setRescheduleEndTime(booking.endTime);
    setRescheduleHairdresserId(booking.isAnyBarber ? null : booking.hairdresserId);
    setRescheduleError(null);
  };

  const handleRescheduleStartTimeChange = (newStart: string) => {
    setRescheduleStartTime(newStart);
    setRescheduleError(null);
    if (!rescheduleBooking) return;

    // Calculate original slot duration in minutes
    const origStartM = parseTimeToMinutes(rescheduleBooking.startTime);
    const origEndM = parseTimeToMinutes(rescheduleBooking.endTime);
    const durationM = Math.max(15, origEndM - origStartM);

    const newStartM = parseTimeToMinutes(newStart);
    let newEndM = newStartM + durationM;
    if (newEndM >= 24 * 60) newEndM = 23 * 60 + 59;

    const endH = Math.floor(newEndM / 60);
    const endMin = newEndM % 60;
    const formattedEnd = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    setRescheduleEndTime(formattedEnd);
  };

  const quickShiftTime = (mins: number) => {
    const currMins = parseTimeToMinutes(rescheduleStartTime);
    let newMins = currMins + mins;
    if (newMins < 0) newMins = 0;
    if (newMins >= 24 * 60) newMins = 23 * 60 + 45;

    const h = Math.floor(newMins / 60);
    const m = newMins % 60;
    const newStartStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    handleRescheduleStartTimeChange(newStartStr);
  };

  const quickSetDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
    setRescheduleError(null);
  };

  // Conflict detection for reschedule modal
  const rescheduleConflict = useMemo(() => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) return null;

    const startM = parseTimeToMinutes(rescheduleStartTime);
    const endM = parseTimeToMinutes(rescheduleEndTime);

    const overlaps = bookings.filter((b) => {
      if (b.id === rescheduleBooking.id) return false;
      if (b.status === 'cancelled') return false;
      if (b.date !== rescheduleDate) return false;

      // Same hairdresser or overlapping general barber
      if (rescheduleHairdresserId !== null && b.hairdresserId !== null) {
        if (b.hairdresserId !== rescheduleHairdresserId) return false;
      }

      const bStartM = parseTimeToMinutes(b.startTime);
      const bEndM = parseTimeToMinutes(b.endTime);

      return Math.max(startM, bStartM) < Math.min(endM, bEndM);
    });

    if (overlaps.length > 0) {
      const names = overlaps.map(o => `คุณ${o.customerName} (${formatThaiTime(o.startTime)}-${formatThaiTime(o.endTime)})`).join(', ');
      return `มีคิวจองตรงกับ: ${names}`;
    }

    return null;
  }, [rescheduleBooking, rescheduleDate, rescheduleStartTime, rescheduleEndTime, rescheduleHairdresserId, bookings]);

  const handleConfirmReschedule = (e: FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking) return;

    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) {
      setRescheduleError('กรุณากรอกวันที่และเวลาให้ครบถ้วน');
      return;
    }

    if (rescheduleStartTime >= rescheduleEndTime) {
      setRescheduleError('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด');
      return;
    }

    onUpdateBooking(rescheduleBooking.id, {
      date: rescheduleDate,
      startTime: rescheduleStartTime,
      endTime: rescheduleEndTime,
      hairdresserId: rescheduleHairdresserId,
      isAnyBarber: rescheduleHairdresserId === null,
    });

    setRescheduleBooking(null);
  };

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
    setEditStatus(getEffectiveStatus(booking, now));
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

  // Calculate counts for each status button matching current search and date filters
  const statusCounts = useMemo(() => {
    const counts = { all: 0, waiting: 0, 'in-progress': 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      // 1. Search Query filter
      const query = searchQuery.toLowerCase().trim();
      const hdName = b.hairdresserId ? getHairdresserName(b.hairdresserId).toLowerCase() : 'ไม่ระบุช่าง';
      const matchesSearch =
        b.customerName.toLowerCase().includes(query) ||
        b.customerPhone.includes(query) ||
        b.remarks.toLowerCase().includes(query) ||
        b.recordedBy.toLowerCase().includes(query) ||
        hdName.includes(query);

      if (!matchesSearch) return;

      // 2. Tab Date Filter
      if (selectedDateFilter === 'today' && b.date !== todayStr) return;
      if (selectedDateFilter === 'upcoming' && b.date <= todayStr) return;

      counts.all++;
      const effStatus = getEffectiveStatus(b, now);
      counts[effStatus]++;
    });
    return counts;
  }, [bookings, searchQuery, selectedDateFilter, todayStr, now, hairdressers]);

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

      // 3. Status Filter (Uses getEffectiveStatus so current time or explicit status aligns)
      if (selectedStatusFilter !== 'all') {
        const effStatus = getEffectiveStatus(booking, now);
        if (effStatus !== selectedStatusFilter) return false;
      }

      return true;
    })
    // Sort logically: date ascending, then startTime based on sortOrder
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      const timeCompare = a.startTime.localeCompare(b.startTime);
      return sortOrder === 'asc' ? timeCompare : -timeCompare;
    });

  // Grouping 1: By Date only (for Time-Sorted view)
  interface DateGroupTime {
    date: string;
    bookings: Booking[];
  }

  const timeGroupedBookings: DateGroupTime[] = [];
  filteredBookings.forEach((booking) => {
    let dateGroup = timeGroupedBookings.find((g) => g.date === booking.date);
    if (!dateGroup) {
      dateGroup = { date: booking.date, bookings: [] };
      timeGroupedBookings.push(dateGroup);
    }
    dateGroup.bookings.push(booking);
  });

  // Grouping 2: By Date, then Hairdresser (for Hairdresser-Grouped view)
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
    <div className="space-y-4 max-w-4xl mx-auto">
      

      {/* Control panel: search + date filter + sort toggle + status filter */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col gap-3" id="booking-controls">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch justify-between">
          {/* Search Input bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              id="search-booking-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, หมายเหตุ, ช่าง..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all placeholder:text-stone-400 bg-stone-50/50 font-sans"
            />
          </div>

          {/* Date Filter Segmented control */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/30 gap-1 shrink-0 overflow-x-auto" id="date-filter-segments">
            {(['all', 'today', 'upcoming'] as const).map((filter) => {
              const labels = {
                all: `คิวทั้งหมด (${bookings.length})`,
                today: 'วันนี้',
                upcoming: 'วันข้างหน้า'
              };
              const isSelected = selectedDateFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedDateFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected 
                      ? 'bg-brand text-white shadow-2xs' 
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50/50'
                  }`}
                >
                  {labels[filter]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Sort Toggle & Status Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-2.5 border-t border-stone-100 text-xs">
          {/* Sort Toggle Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-stone-700 text-[11px] shrink-0 flex items-center gap-1">
              <span>เรียงตาม:</span>
            </span>
            <div className="flex bg-stone-100 p-0.5 rounded-xl border border-stone-200/50 gap-0.5" id="sort-toggle-segments">
              <button
                type="button"
                id="sort-by-time-btn"
                onClick={() => setSortBy('time')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'time'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="แสดงในรูปแบบ Timeline เส้นตรงตามช่วงเวลา"
              >
                <Clock className="w-3 h-3" />
                <span>Timeline ตามเวลา</span>
              </button>

              <button
                type="button"
                id="sort-by-hairdresser-btn"
                onClick={() => setSortBy('hairdresser')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'hairdresser'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="จัดกลุ่มคิวจองแยกตามกล่องรายชื่อช่าง"
              >
                <UserCheck className="w-3 h-3" />
                <span>รายชื่อช่าง</span>
              </button>
            </div>

            {sortBy === 'time' && (
              <>
                <button
                  type="button"
                  id="toggle-sort-order-btn"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                  title={sortOrder === 'asc' ? 'เรียงจากเช้าไปค่ำ (09:00 -> 18:00)' : 'เรียงจากค่ำไปเช้า (18:00 -> 09:00)'}
                >
                  <span>{sortOrder === 'asc' ? '⏱️ เช้า➔ค่ำ' : '⏱️ ค่ำ➔เช้า'}</span>
                </button>

                <button
                  type="button"
                  id="toggle-show-free-gaps-btn"
                  onClick={() => setShowFreeGaps(prev => !prev)}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
                    showFreeGaps
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                      : 'bg-stone-100 text-stone-500 border-stone-200 hover:text-stone-800'
                  }`}
                  title="เปิด/ปิด การแสดงช่วงเวลาว่างคั่นกลางระหว่างคิว"
                >
                  <span>{showFreeGaps ? '🟢 ช่วงว่าง' : '⚪ ซ่อนช่วงว่าง'}</span>
                </button>
              </>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pt-1 md:pt-0">
            <span className="font-bold text-stone-500 text-[11px] shrink-0">สถานะ:</span>
            {(['all', 'waiting', 'in-progress', 'completed', 'cancelled'] as const).map((st) => {
              const labels: Record<string, string> = {
                all: 'ทั้งหมด',
                waiting: 'รอคิว',
                'in-progress': 'กำลังบริการ',
                completed: 'เสร็จแล้ว',
                cancelled: 'ยกเลิก'
              };
              const isSelected = selectedStatusFilter === st;
              const count = statusCounts[st] || 0;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    isSelected
                      ? 'bg-stone-850 text-amber-300 font-extrabold shadow-2xs border border-stone-900'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/60'
                  }`}
                >
                  <span>{labels[st]}</span>
                  <span className={`px-1 py-0.2 rounded-md text-[10px] font-mono ${
                    isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-stone-200/70 text-stone-700'
                  }`}>
                    {count}
                  </span>
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
            {(hairdressers || []).filter(h => h && h.busyUntil && h.busyStart && new Date(h.busyUntil) > new Date()).map(hd => {
              const d = new Date(hd.busyStart!);
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              return (
                <span key={`busy-list-${hd.id}`} className="inline-flex items-center gap-1 bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-xl shadow-xs border border-amber-600/15 animate-pulse">
                  ช่าง{hd.name}: กำลังให้บริการ ({hh}.{mm}น.)
                </span>
              );
            })}
            {(hairdressers || []).filter(h => h && h.breakUntil && h.breakStart && new Date(h.breakUntil) > new Date()).map(hd => {
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
        const upcomingAlerts = (bookings || []).filter(b => b && getUpcoming60MinAlert(b) !== null);
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
              {(upcomingAlerts || []).slice(0, 3).map((b) => (
                <span key={`banner-alert-${b.id}`} className="bg-stone-900 text-amber-300 font-bold text-[10px] px-2.5 py-1 rounded-xl shadow-xs border border-amber-400/30 font-mono">
                  ⏱️ {formatThaiTime(b.startTime)} ({b.customerName})
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Grid of booking cards (Time-Sorted OR Hairdresser-Grouped) */}
      <div className="space-y-6" id="booking-cards-container">
        {sortBy === 'time' ? (
          /* ================= TIME-SORTED VIEW ================= */
          timeGroupedBookings.length > 0 ? (
            timeGroupedBookings.map((dateGroup) => {
              const isDateToday = dateGroup.date === todayStr;

              return (
                <div key={dateGroup.date} className="space-y-4" id={`time-date-group-${dateGroup.date}`}>
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
                        {dateGroup.bookings.length} คิวจอง
                      </span>
                    </div>
                    <div className="h-px bg-stone-200/80 flex-grow animate-pulse"></div>
                  </div>

                  {/* Timeline View with Free Time Gaps */}
                  {(() => {
                    const sortedBookings = [...dateGroup.bookings].sort((a, b) => {
                      const timeCompare = a.startTime.localeCompare(b.startTime);
                      return sortOrder === 'asc' ? timeCompare : -timeCompare;
                    });

                    type TimelineItem = 
                      | { type: 'booking'; booking: Booking }
                      | { type: 'gap'; startTime: string; endTime: string; durationMins: number; id: string };

                    const timelineItems: TimelineItem[] = [];

                    if (sortOrder === 'asc' && showFreeGaps) {
                      // Morning gap check before first booking (assuming shop opens at 09:00 / 540 mins)
                      const SHOP_OPEN_MINS = 9 * 60; // 09:00 AM
                      if (sortedBookings.length > 0) {
                        const firstStartMins = parseTimeToMinutes(sortedBookings[0].startTime);
                        if (firstStartMins - SHOP_OPEN_MINS >= 15) {
                          timelineItems.push({
                            type: 'gap',
                            startTime: '09:00',
                            endTime: sortedBookings[0].startTime,
                            durationMins: firstStartMins - SHOP_OPEN_MINS,
                            id: `gap-morning-${sortedBookings[0].id}`
                          });
                        }
                      }

                      sortedBookings.forEach((b, idx) => {
                        if (idx > 0) {
                          const prevBooking = sortedBookings[idx - 1];
                          const prevEndMins = parseTimeToMinutes(prevBooking.endTime);
                          const currStartMins = parseTimeToMinutes(b.startTime);
                          const gapMins = currStartMins - prevEndMins;

                          if (gapMins >= 15) {
                            timelineItems.push({
                              type: 'gap',
                              startTime: prevBooking.endTime,
                              endTime: b.startTime,
                              durationMins: gapMins,
                              id: `gap-${prevBooking.id}-${b.id}`
                            });
                          }
                        }
                        timelineItems.push({ type: 'booking', booking: b });
                      });

                      // Evening gap check after last booking (assuming shop closes at 20:00 / 1200 mins)
                      const SHOP_CLOSE_MINS = 20 * 60; // 20:00 PM
                      if (sortedBookings.length > 0) {
                        const lastBooking = sortedBookings[sortedBookings.length - 1];
                        const lastEndMins = parseTimeToMinutes(lastBooking.endTime);
                        if (SHOP_CLOSE_MINS - lastEndMins >= 30) {
                          timelineItems.push({
                            type: 'gap',
                            startTime: lastBooking.endTime,
                            endTime: '20:00',
                            durationMins: SHOP_CLOSE_MINS - lastEndMins,
                            id: `gap-evening-${lastBooking.id}`
                          });
                        }
                      }
                    } else {
                      sortedBookings.forEach(b => timelineItems.push({ type: 'booking', booking: b }));
                    }

                    return (
                      <div className="relative pl-6 sm:pl-9 space-y-3.5 my-2 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-1 before:bg-gradient-to-b before:from-brand/90 before:via-amber-400/80 before:to-stone-300 before:rounded-full">
                        {timelineItems.map((item) => {
                          if (item.type === 'gap') {
                            return (
                              <div key={item.id} className="relative group animate-fade-in my-1.5">
                                {/* Node dot for gap */}
                                <div className="absolute -left-6 sm:-left-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500 ring-4 ring-emerald-100/90 text-white flex items-center justify-center text-[10px] shadow-xs z-10 font-bold">
                                  🟢
                                </div>

                                {/* Gap Card */}
                                <div className="bg-emerald-50/80 border border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-3 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all shadow-2xs">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="bg-emerald-700 text-white font-mono font-black text-xs px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-emerald-200" />
                                      <span>{formatThaiTime(item.startTime)} - {formatThaiTime(item.endTime)}</span>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-emerald-950">
                                        ช่วงเวลาว่างคั่นกลาง
                                      </span>
                                      <span className="bg-emerald-200/80 text-emerald-950 text-[11px] font-bold px-2 py-0.5 rounded-lg border border-emerald-300/60">
                                        ว่าง {formatGapDurationThai(item.durationMins)}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => jumpToTab(0)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-950 bg-emerald-200/90 hover:bg-emerald-300/90 border border-emerald-400/80 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
                                    title="สลับไปหน้าลงคิวเพื่อรับคิวจองช่วงเวลานี้"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>➕ ลงคิวช่วงนี้</span>
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          const booking = item.booking;
                          const effStatus = getEffectiveStatus(booking, now);
                          const alertInfo = getUpcoming60MinAlert(booking);
                          const isUpcoming60Min = alertInfo !== null;
                          const hdName = getHairdresserName(booking.hairdresserId);

                          return (
                            <div key={booking.id} className="relative group my-2" id={`timeline-node-${booking.id}`}>
                              {/* Timeline Node Icon on line */}
                              <div className={`absolute -left-6 sm:-left-9 top-4 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shadow-xs z-10 border-2 border-white transition-all ${
                                effStatus === 'completed'
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
                                  : effStatus === 'in-progress'
                                  ? 'bg-blue-600 text-white ring-2 ring-blue-200 animate-pulse'
                                  : effStatus === 'cancelled'
                                  ? 'bg-rose-500 text-white ring-2 ring-rose-200'
                                  : 'bg-brand text-white ring-2 ring-amber-200'
                              }`}>
                                {effStatus === 'completed' ? '✓' : effStatus === 'in-progress' ? '✂️' : effStatus === 'cancelled' ? '✕' : '💈'}
                              </div>

                              {/* Booking Card */}
                              <div
                                id={`booking-card-${booking.id}`}
                                className={`bg-white rounded-xl border border-stone-200/80 shadow-2xs hover:border-amber-400/60 transition-all p-2.5 sm:p-3 flex flex-col gap-1.5 relative ${
                                  isUpcoming60Min
                                    ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50/20'
                                    : ''
                                }`}
                              >
                                {/* 60-Minute Alert Badge */}
                                {alertInfo && (
                                  <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-900 px-2.5 py-0.5 rounded-lg text-[10px] font-bold shadow-2xs">
                                    <span className="flex items-center gap-1.5 truncate text-white">
                                      <Sparkles className="w-3 h-3 text-amber-200 shrink-0" />
                                      <span>{alertInfo.label}</span>
                                    </span>
                                    <span className="bg-stone-900 text-amber-300 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0">
                                      เตรียมพร้อม
                                    </span>
                                  </div>
                                )}

                                {/* Header Row: Time Badge, Barber Tag, Status Dropdown & Actions */}
                                <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-stone-100 pb-1.5">
                                  {/* Time Badge & Barber */}
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span className="bg-stone-900 text-amber-300 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 border border-stone-800 shadow-2xs flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                      <span>{formatThaiTime(booking.startTime)} - {formatThaiTime(booking.endTime)}</span>
                                    </span>

                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 flex items-center gap-1 ${
                                      booking.hairdresserId === null || booking.isAnyBarber
                                        ? 'bg-amber-100/90 text-amber-900 border border-amber-300/80'
                                        : 'bg-stone-100 text-stone-800 border border-stone-200'
                                    }`}>
                                      <UserCheck className="w-3 h-3 text-brand shrink-0" />
                                      <span>{hdName}</span>
                                    </span>
                                  </div>

                                  {/* Right side: Status Dropdown & Action buttons */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Status Menu Dropdown */}
                                    <div className="relative shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setOpenStatusMenuId(openStatusMenuId === booking.id ? null : booking.id)}
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${getStatusBadgeStyle(effStatus)}`}
                                      >
                                        {getStatusIcon(effStatus)}
                                        <span>{getStatusLabel(effStatus)}</span>
                                        <ChevronDown className="w-3 h-3 text-stone-500" />
                                      </button>

                                      {openStatusMenuId === booking.id && (
                                        <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-stone-200 py-1 z-30 animate-fade-in space-y-0.5">
                                          {(['waiting', 'in-progress', 'completed', 'cancelled'] as const).map((st) => (
                                            <button
                                              key={st}
                                              type="button"
                                              onClick={() => {
                                                onUpdateBooking(booking.id, { status: st });
                                                setOpenStatusMenuId(null);
                                              }}
                                              className={`w-full px-2.5 py-1 text-left text-[11px] font-semibold flex items-center gap-1.5 hover:bg-stone-100 cursor-pointer ${
                                                effStatus === st ? 'text-brand bg-brand/5' : 'text-stone-700'
                                              }`}
                                            >
                                              {getStatusIcon(st)}
                                              <span>{getStatusLabel(st)}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Actions: Edit & Delete */}
                                    <div className="flex items-center gap-0.5 shrink-0 bg-stone-50 border border-stone-200/80 p-0.5 rounded-md">
                                      <button
                                        type="button"
                                        id={`edit-btn-${booking.id}`}
                                        onClick={() => startEdit(booking)}
                                        className="text-stone-400 hover:text-brand p-1 rounded hover:bg-white transition-all cursor-pointer"
                                        title="แก้ไขคิวจอง"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        id={`delete-btn-${booking.id}`}
                                        onClick={() => setBookingToDelete(booking)}
                                        className="text-stone-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-all cursor-pointer"
                                        title="ลบคิวจอง"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Main Section: Customer Name & Phone */}
                                <div className="flex items-center justify-between gap-2 min-w-0 pt-0.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs text-stone-400 shrink-0">👤</span>
                                    <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                                      คุณ{booking.customerName}
                                    </h4>
                                  </div>

                                  {booking.customerPhone && (
                                    <a
                                      href={`tel:${booking.customerPhone}`}
                                      className="inline-flex items-center gap-1 text-[11px] text-stone-700 font-medium font-mono bg-stone-50 hover:bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md shrink-0 transition-colors"
                                      title="โทรหาลูกค้า"
                                    >
                                      <Phone className="w-3 h-3 text-stone-500 shrink-0" />
                                      <span>{booking.customerPhone}</span>
                                    </a>
                                  )}
                                </div>

                                {/* Remarks, Slip, Recorded By */}
                                {(booking.remarks || booking.recordedBy || booking.paymentSlipUrl) && (
                                  <div className="pt-1 border-t border-stone-100 text-[10px] flex flex-wrap items-center justify-between gap-1 text-stone-500">
                                    <div className="min-w-0 flex-1">
                                      {booking.remarks ? (
                                        <span className="text-amber-800 font-medium italic truncate block" title={booking.remarks}>
                                          💡 {booking.remarks}
                                        </span>
                                      ) : (
                                        <span className="text-stone-300 italic">ไม่มีหมายเหตุ</span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {booking.paymentSlipUrl && (
                                        <button
                                          type="button"
                                          onClick={() => setViewSlipUrl(booking.paymentSlipUrl || null)}
                                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300/80 px-1.5 py-0.5 rounded transition-all cursor-pointer shadow-2xs"
                                        >
                                          <span>🧾 สลิป</span>
                                        </button>
                                      )}
                                      {booking.recordedBy && (
                                        <span className="text-[9px] text-stone-400 bg-stone-50 border border-stone-200/60 px-1.5 py-0.2 rounded">
                                          {booking.recordedBy.includes('ลูกค้าจองเอง') ? '📱 จองออนไลน์' : booking.recordedBy}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-3xl p-12 border border-stone-200 shadow-sm text-center max-w-lg mx-auto" id="no-bookings-time-view">
              <div className="w-16 h-16 rounded-full bg-[#FDF8F3] flex items-center justify-center mx-auto text-3xl mb-4 border border-brand/20">
                📅
              </div>
              <h3 className="font-bold text-stone-900 text-base font-serif">ไม่พบคิวการจอง</h3>
              <p className="text-xs text-stone-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                {searchQuery 
                  ? 'ไม่พบคิวจองที่ตรงตามคำค้นหาหรือตัวกรองของคุณ กรุณาลองตรวจสอบใหม่อีกครั้ง'
                  : 'ไม่มีรายการจองตามกำหนดการที่คุณเปิดอยู่ ณ ขณะนี้'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => jumpToTab(0)}
                  className="mt-6 inline-flex px-5 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-2xl gap-1.5 items-center transition-all shadow-sm cursor-pointer"
                >
                  <span>💇‍♂️ เริ่มต้นลงคิวใหม่ตอนนี้</span>
                </button>
              )}
            </div>
          )
        ) : (
          /* ================= HAIRDRESSER-GROUPED VIEW ================= */
          groupedBookings.length > 0 ? (
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
                        {/* Hairdresser Header - Photo with Name Underneath */}
                        <div className="bg-[#FAF8F5]/90 p-3 border-b border-stone-200/80 flex flex-col items-center justify-center text-center relative">
                          <span className="absolute top-2.5 right-2.5 bg-stone-850 text-[#DBCBB5] px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono shrink-0 border border-stone-800 shadow-2xs">
                            {hdGroup.bookings.length} คิว
                          </span>

                          {(() => {
                            const hdObj = hairdressers.find(h => h.id === hdGroup.hairdresserId);
                            const avatar = hdObj?.avatarUrl;
                            return (
                              <div className="relative group/avatar mt-0.5">
                                {avatar ? (
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-amber-500/50 shadow-xs bg-stone-100 mx-auto">
                                    <img
                                      src={avatar}
                                      alt={hdGroup.hairdresserName}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/40 text-brand font-serif font-black text-lg sm:text-xl flex items-center justify-center mx-auto shadow-2xs">
                                    {isNoSpecifiedHairdresser ? '👥' : hdGroup.hairdresserName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="mt-1.5 text-center">
                            <h3 className="font-serif font-black text-stone-900 text-xs sm:text-sm leading-tight">
                              {hdGroup.hairdresserName}
                            </h3>

                            <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap">
                              {!isNoSpecifiedHairdresser && (() => {
                                const hdObj = hairdressers.find(h => h.id === hdGroup.hairdresserId);
                                const isBusy = hdObj?.busyUntil && hdObj?.busyStart && new Date(hdObj.busyUntil) > new Date();
                                const isBreak = hdObj?.breakUntil && hdObj?.breakStart && new Date(hdObj.breakUntil) > new Date();
                                if (isBusy) {
                                  const dStart = new Date(hdObj.busyStart!);
                                  const hh = String(dStart.getHours()).padStart(2, '0');
                                  const mm = String(dStart.getMinutes()).padStart(2, '0');
                                  return (
                                    <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.2 rounded-full font-bold flex items-center gap-1 shrink-0 animate-pulse">
                                      <span className="w-1 h-1 rounded-full bg-amber-600"></span>
                                      กำลังตัด ({hh}.{mm}น.)
                                    </span>
                                  );
                                }
                                if (isBreak) {
                                  const dStart = new Date(hdObj.breakStart!);
                                  const hh = String(dStart.getHours()).padStart(2, '0');
                                  const mm = String(dStart.getMinutes()).padStart(2, '0');
                                  return (
                                    <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-200/60 px-1.5 py-0.2 rounded-full font-bold flex items-center gap-1 shrink-0 animate-pulse">
                                      <span className="w-1 h-1 rounded-full bg-sky-500"></span>
                                      พักเบรก ({hh}.{mm}น.)
                                    </span>
                                  );
                                }
                                return null;
                              })()}

                              <p className="text-[9px] text-stone-500 font-semibold">
                                {isNoSpecifiedHairdresser ? 'คิวช่างคนไหนก็ได้' : 'ช่างประจำสาขา'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* List of queue times inside hairdresser's box - FULL VIEW WITHOUT SCROLLBAR */}
                        <div className="flex-1 bg-white/50 divide-y divide-stone-100/80 px-2.5 py-1.5" id={`bookings-list-hd-${hdGroup.hairdresserId || 'anyone'}`}>
                          {hdGroup.bookings.map((booking) => {
                            const effStatus = getEffectiveStatus(booking, now);
                            const alertInfo = getUpcoming60MinAlert(booking);
                            const isUpcoming60Min = alertInfo !== null;

                            return (
                              <div
                                key={booking.id}
                                id={`booking-card-${booking.id}`}
                                className={`bg-white rounded-xl border border-stone-200/80 shadow-2xs hover:border-amber-400/60 transition-all p-2.5 my-1.5 flex flex-col gap-1.5 relative ${
                                  isUpcoming60Min
                                    ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50/20'
                                    : ''
                                }`}
                              >
                                {/* 60-Minute Alert Badge */}
                                {alertInfo && (
                                  <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-900 px-2.5 py-0.5 rounded-lg text-[10px] font-bold shadow-2xs">
                                    <span className="flex items-center gap-1.5 truncate text-white">
                                      <Sparkles className="w-3 h-3 text-amber-200 shrink-0" />
                                      <span>{alertInfo.label}</span>
                                    </span>
                                    <span className="bg-stone-900 text-amber-300 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0">
                                      เตรียมพร้อม
                                    </span>
                                  </div>
                                )}

                                {/* Row 1: Time Badge (Left) + Status Dropdown & Action Buttons (Right) */}
                                <div className="flex items-center justify-between gap-1.5 border-b border-stone-100 pb-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span className="bg-stone-900 text-amber-300 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 border border-stone-800 shadow-2xs flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                      <span>{formatThaiTime(booking.startTime)} - {formatThaiTime(booking.endTime)}</span>
                                    </span>

                                    {booking.isAnyBarber && (
                                      <span className="bg-amber-100 text-amber-900 border border-amber-200/80 px-1.5 py-0.5 rounded-md text-[10px] font-medium shrink-0">
                                        ใครก็ได้
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Status Menu Dropdown */}
                                    <div className="relative shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setOpenStatusMenuId(openStatusMenuId === booking.id ? null : booking.id)}
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${getStatusBadgeStyle(effStatus)}`}
                                      >
                                        {getStatusIcon(effStatus)}
                                        <span>{getStatusLabel(effStatus)}</span>
                                        <ChevronDown className="w-3 h-3 text-stone-500" />
                                      </button>

                                      {openStatusMenuId === booking.id && (
                                        <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-stone-200 py-1 z-30 animate-fade-in space-y-0.5">
                                          {(['waiting', 'in-progress', 'completed', 'cancelled'] as const).map((st) => (
                                            <button
                                              key={st}
                                              type="button"
                                              onClick={() => {
                                                onUpdateBooking(booking.id, { status: st });
                                                setOpenStatusMenuId(null);
                                              }}
                                              className={`w-full px-2.5 py-1 text-left text-[11px] font-semibold flex items-center gap-1.5 hover:bg-stone-100 cursor-pointer ${
                                                effStatus === st ? 'text-brand bg-brand/5' : 'text-stone-700'
                                              }`}
                                            >
                                              {getStatusIcon(st)}
                                              <span>{getStatusLabel(st)}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0 bg-stone-50 border border-stone-200/80 p-0.5 rounded-md">
                                      <button
                                        type="button"
                                        id={`edit-btn-${booking.id}`}
                                        onClick={() => startEdit(booking)}
                                        className="text-stone-400 hover:text-brand p-1 rounded hover:bg-white transition-all cursor-pointer shrink-0"
                                        title="แก้ไขคิวจองนี้"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        id={`delete-btn-${booking.id}`}
                                        onClick={() => setBookingToDelete(booking)}
                                        className="text-stone-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-all cursor-pointer shrink-0"
                                        title="ลบคิวจองนี้"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Row 2: Customer Name + Phone */}
                                <div className="flex items-center justify-between gap-2 min-w-0 pt-0.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs text-stone-400 shrink-0">👤</span>
                                    <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                                      คุณ{booking.customerName}
                                    </h4>
                                  </div>

                                  {booking.customerPhone && (
                                    <a
                                      href={`tel:${booking.customerPhone}`}
                                      className="inline-flex items-center gap-1 text-[11px] text-stone-700 font-medium font-mono bg-stone-50 hover:bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md shrink-0 transition-colors"
                                      title="โทรหาลูกค้า"
                                    >
                                      <Phone className="w-3 h-3 text-stone-500 shrink-0" />
                                      <span>{booking.customerPhone}</span>
                                    </a>
                                  )}
                                </div>

                                {/* Row 3: Remarks & Details */}
                                {(booking.remarks || booking.recordedBy || booking.paymentSlipUrl) && (
                                  <div className="pt-1 border-t border-stone-100 text-[10px] flex flex-wrap items-center justify-between gap-1 text-stone-500">
                                    <div className="min-w-0 flex-1">
                                      {booking.remarks ? (
                                        <span className="text-amber-800 font-medium italic truncate block" title={booking.remarks}>
                                          💡 {booking.remarks}
                                        </span>
                                      ) : (
                                        <span className="text-stone-300 italic">ไม่มีหมายเหตุ</span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {booking.paymentSlipUrl && (
                                        <button
                                          type="button"
                                          onClick={() => setViewSlipUrl(booking.paymentSlipUrl || null)}
                                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300/80 px-1.5 py-0.5 rounded transition-all cursor-pointer shadow-2xs active:scale-95"
                                          title="คลิกเพื่อขยายดูรูปสลิปโอนเงิน"
                                        >
                                          <span>🧾 สลิป</span>
                                        </button>
                                      )}

                                      {booking.recordedBy && (
                                        <div>
                                          {booking.recordedBy.includes('ลูกค้าจองเอง') ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.2 rounded shadow-2xs">
                                              <Smartphone className="w-2.5 h-2.5 text-emerald-700" />
                                              <span>📱 จองเอง</span>
                                            </span>
                                          ) : (
                                            <span className="text-[9px] text-stone-400 bg-stone-50 border border-stone-200/60 px-1.5 py-0.2 rounded">
                                              โดย: {booking.recordedBy}
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
        )
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Hairdresser, Booking, LeaveRecord } from '../types';
import { Calendar, Clock, User, Phone, FileText, ChevronRight, CheckCircle2, UserCheck, AlertCircle, AlertTriangle, X, Filter, Plus, RefreshCw, Users, HelpCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

// Helper to format Time to Thai style: e.g. "09:30" -> "09.30น."
export const formatThaiTime = (timeStr: string) => {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim().replace(' น.', '').replace('น.', '');
  return cleanTime.replace(':', '.') + 'น.';
};

export const formatBusyTime = (isoStr: string) => {
  try {
    const d = new Date(isoStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch (e) {
    return '';
  }
};

// Generate intervals in 30-minute steps for maximum scheduling flexibility
export const generateTimeOptions = (slotDuration: number = 30) => {
  const options: string[] = [];
  // Always use 30 minute steps to allow booking at any half-hour interval (e.g. 17:30)
  for (let hour = 0; hour < 24; hour++) {
    const minutes = [0, 30];
    for (let min of minutes) {
      const hh = String(hour).padStart(2, '0');
      const mm = String(min).padStart(2, '0');
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
};

const TIME_OPTIONS_DEFAULT = generateTimeOptions(30);

interface BookingFormProps {
  hairdressers: Hairdresser[];
  bookings?: Booking[];
  leaves?: LeaveRecord[];
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  activeRecorder: string;
  setActiveRecorder: (name: string) => void;
  jumpToTab: (index: number) => void;
  currentUser?: any;
  slotDuration?: number;
  activeShopEmail: string | null;
  shopHolidays?: number[];
}

export default function BookingForm({
  hairdressers,
  bookings = [],
  leaves = [],
  onAddBooking,
  activeRecorder,
  setActiveRecorder,
  jumpToTab,
  currentUser,
  slotDuration = 30,
  activeShopEmail,
  shopHolidays = []
}: BookingFormProps) {
  const TIME_OPTIONS = generateTimeOptions(slotDuration);

  // Helper to get local date string YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getNearestPrevSlotDate = (dateObj: Date): Date => {
    const rounded = new Date(dateObj);
    const minutes = rounded.getMinutes();
    if (minutes >= 30) {
      rounded.setMinutes(30, 0, 0);
    } else {
      rounded.setMinutes(0, 0, 0);
    }
    return rounded;
  };

  const checkIsBusySlot = (hd: Hairdresser, slotStartStr: string, slotEndStr: string) => {
    if (!hd.busyUntil || !hd.busyStart) return false;
    const todayStr = getTodayDateString();
    if (date !== todayStr) return false; // Only applies to today's schedule

    const now = new Date();
    const busyUntilDate = new Date(hd.busyUntil);
    if (busyUntilDate <= now) return false; // Busy time has already passed

    const slotStartDT = new Date(`${date}T${slotStartStr}:00`);
    const slotEndDT = new Date(`${date}T${slotEndStr}:00`);
    
    const busyStartDT = new Date(hd.busyStart);
    const isFarFuture = busyUntilDate.getFullYear() >= 2030;
    const effectiveEndDT = isFarFuture ? now : busyUntilDate;

    return slotStartDT < effectiveEndDT && busyStartDT < slotEndDT;
  };

  const checkIsBreakSlot = (hd: Hairdresser, slotStartStr: string, slotEndStr: string) => {
    if (!hd.breakUntil || !hd.breakStart) return false;
    const todayStr = getTodayDateString();
    if (date !== todayStr) return false; // Only applies to today's schedule

    const now = new Date();
    const breakUntilDate = new Date(hd.breakUntil);
    if (breakUntilDate <= now) return false; // Break time has already passed

    const slotStartDT = new Date(`${date}T${slotStartStr}:00`);
    const slotEndDT = new Date(`${date}T${slotEndStr}:00`);
    
    const breakStartDT = new Date(hd.breakStart);
    const isFarFuture = breakUntilDate.getFullYear() >= 2030;
    const effectiveEndDT = isFarFuture ? now : breakUntilDate;

    return slotStartDT < effectiveEndDT && breakStartDT < slotEndDT;
  };

  const handleToggleBusy = async (hairdresserId: string, setBusy: boolean, durationMinutes: number = 30) => {
    if (!activeShopEmail) return;
    try {
      const hairdresserRef = doc(db, 'stores', activeShopEmail, 'hairdressers', hairdresserId);
      if (setBusy) {
        const now = new Date();
        const nearestPrev = getNearestPrevSlotDate(now);
        const busyStart = nearestPrev.toISOString();
        // Set busy status for 60 minutes maximum (will auto-reset after 60 mins if not cleared manually)
        const busyUntil = new Date(nearestPrev.getTime() + 60 * 60 * 1000).toISOString();
        await updateDoc(hairdresserRef, {
          busyStart,
          busyUntil,
          breakStart: null,
          breakUntil: null
        });
      } else {
        // Clear busy status
        await updateDoc(hairdresserRef, {
          busyStart: null,
          busyUntil: null
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/hairdressers/${hairdresserId}`, false);
    }
  };

  const handleToggleBreak = async (hairdresserId: string, setBreak: boolean) => {
    if (!activeShopEmail) return;
    try {
      const hairdresserRef = doc(db, 'stores', activeShopEmail, 'hairdressers', hairdresserId);
      if (setBreak) {
        const now = new Date();
        const nearestPrev = getNearestPrevSlotDate(now);
        const breakStart = nearestPrev.toISOString();
        // Set break status for 30 minutes maximum (will auto-reset after 30 mins if not cleared manually)
        const breakUntil = new Date(nearestPrev.getTime() + 30 * 60 * 1000).toISOString();
        await updateDoc(hairdresserRef, {
          breakStart,
          breakUntil,
          busyStart: null,
          busyUntil: null
        });
      } else {
        // Clear break status
        await updateDoc(hairdresserRef, {
          breakStart: null,
          breakUntil: null
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/hairdressers/${hairdresserId}`, false);
    }
  };

  // State fields
  const [date, setDate] = useState(getTodayDateString());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  
  // selectedHairdresserId: null represents "ไม่ระบุช่าง"
  const [selectedHairdresserId, setSelectedHairdresserId] = useState<string | null>(null);

  // Check if selected date is a shop holiday
  const isShopHolidaySelected = () => {
    if (!date) return false;
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    const selectedDay = new Date(date).getDay();
    return shopHolidays.includes(selectedDay);
  };

  const getSelectedDateThaiDayName = () => {
    if (!date) return '';
    const selectedDay = new Date(date).getDay();
    const DAYS_THAI = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    return DAYS_THAI[selectedDay];
  };
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [remarks, setRemarks] = useState('');

  // Auto-sync endTime when slotDuration changes
  useEffect(() => {
    const [hours, minutes] = startTime.split(':').map(Number);
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
      setEndTime(`${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`);
    }
  }, [slotDuration]);
  
  // Validation and UX Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [overlapModalData, setOverlapModalData] = useState<{
    hairdresserName: string;
    date: string;
    startTime: string;
    endTime: string;
    existingBooking: Booking;
  } | null>(null);

  // States & Helpers for "Overall Shop Queue Status"
  const [timeFilter, setTimeFilter] = useState<'morning' | 'afternoon' | 'evening' | 'all'>('all');

  // Generate ALL_SLOTS dynamically with 30-minute resolution for maximum booking flexibility (09:00 to 21:00)
  const ALL_SLOTS: string[] = [];
  const startHour = 9;
  const endHour = 21;
  let currentMinutes = startHour * 60;
  const endMinutesLimit = endHour * 60;
  while (currentMinutes < endMinutesLimit) {
    const hh = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
    const mm = String(currentMinutes % 60).padStart(2, '0');
    ALL_SLOTS.push(`${hh}:${mm}`);
    currentMinutes += 30; // Always 30-minute increments for precise booking starts
  }

  const getEndTimeOfSlot = (startTimeStr: string) => {
    const [h, m] = startTimeStr.split(':').map(Number);
    let eh = h;
    let em = m + slotDuration;
    if (em >= 60) {
      const extraHours = Math.floor(em / 60);
      eh += extraHours;
      em = em % 60;
    }
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  };

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const months = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const [year, month, day] = dateStr.split('-');
      const thaiYear = parseInt(year) + 543;
      const thaiMonth = months[parseInt(month) - 1];
      return `${parseInt(day)} ${thaiMonth} ${thaiYear}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleSelectSlot = (slotStart: string, hdId: string) => {
    handleStartTimeChange(slotStart);
    setSelectedHairdresserId(hdId);
    
    const formCard = document.getElementById('booking-form-card');
    if (formCard) {
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filter slots based on the selection
  const filteredSlots = ALL_SLOTS.filter(slot => {
    if (timeFilter === 'morning') return slot >= '09:00' && slot < '13:00';
    if (timeFilter === 'afternoon') return slot >= '13:00' && slot < '17:00';
    if (timeFilter === 'evening') return slot >= '17:00' && slot < '21:00';
    return true; // 'all'
  });

  // Analyze slot density
  const getSlotDensity = (slotStart: string, slotEnd: string) => {
    let activeBarbers = 0;
    let bookedBarbers = 0;
    
    hairdressers.forEach(hd => {
      const isLeave = hd.onLeave || leaves.some(l => l.hairdresserId === hd.id && l.date === date && slotStart < l.endTime && l.startTime < slotEnd);
      if (!isLeave) {
        activeBarbers++;
        const hasBooking = bookings.some(b => b.hairdresserId === hd.id && b.date === date && slotStart < b.endTime && b.startTime < slotEnd);
        const isBusy = checkIsBusySlot(hd, slotStart, slotEnd);
        const isOnBreak = checkIsBreakSlot(hd, slotStart, slotEnd);
        if (hasBooking || isBusy || isOnBreak) {
          bookedBarbers++;
        }
      }
    });

    if (activeBarbers === 0) return 'closed';
    if (bookedBarbers === 0) return 'free';
    if (bookedBarbers >= activeBarbers) return 'full';
    return 'partial';
  };

  // Auto update end-time when start-time changes (based on slotDuration config)
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    
    // Parse start time
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
      setEndTime(formattedEnd);
    }
  };

  // Dynamic set active recorder default if none selected and hairdryers are loaded
  useEffect(() => {
    if (!activeRecorder && hairdressers.length > 0) {
      setActiveRecorder(hairdressers[0].name);
    }
  }, [hairdressers, activeRecorder, setActiveRecorder]);

  // Helper to get unique list of past customers from all bookings
  const getUniqueCustomers = () => {
    const seen = new Set<string>();
    const list: { name: string; phone: string; lastRemarks?: string }[] = [];
    
    // Sort bookings descending (newest bookings first)
    const sortedBookings = [...bookings].sort((a, b) => b.date.localeCompare(a.date));
    
    sortedBookings.forEach(b => {
      const name = b.customerName?.trim();
      const phone = b.customerPhone?.trim();
      if (name && name !== 'ลูกค้าหน้าร้าน (Walk-in)' && phone && phone !== '-') {
        const cleanP = phone.replace(/\D/g, '');
        const key = `${name.toLowerCase()}_${cleanP}`;
        if (!seen.has(key) && cleanP.length >= 3) {
          seen.add(key);
          list.push({
            name,
            phone,
            lastRemarks: b.remarks
          });
        }
      }
    });
    return list;
  };

  // Find suggestions based on currently typed customerPhone
  const cleanTypedPhone = customerPhone.replace(/\D/g, '');
  const uniqueCustomers = getUniqueCustomers();
  const suggestions = uniqueCustomers.filter(c => {
    const cleanCPhone = c.phone.replace(/\D/g, '');
    if (cleanTypedPhone.length > 0) {
      return cleanCPhone.startsWith(cleanTypedPhone) || cleanCPhone.includes(cleanTypedPhone);
    }
    return false;
  }).slice(0, 3);

  // Auto-fill when exact phone number (>= 9 digits) is typed
  useEffect(() => {
    const cleanP = customerPhone.replace(/\D/g, '');
    if (cleanP.length >= 9) {
      const exactMatch = getUniqueCustomers().find(c => c.phone.replace(/\D/g, '') === cleanP);
      if (exactMatch && (!customerName || customerName === 'ลูกค้าหน้าร้าน (Walk-in)')) {
        setCustomerName(exactMatch.name);
        if (exactMatch.lastRemarks && !remarks) {
          setRemarks(exactMatch.lastRemarks);
        }
      }
    }
  }, [customerPhone]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate Shop Holidays
    if (isShopHolidaySelected()) {
      setErrorMsg(`⚠️ วันนี้ (${getSelectedDateThaiDayName()}) เป็นวันหยุดร้าน ไม่สามารถลงคิวจองในระบบได้`);
      return;
    }

    // Basic Validation
    if (!activeRecorder) {
      setErrorMsg('กรุณาเลือกผู้บันทึก (ช่างในร้าน)');
      return;
    }

    // Validate times
    const startNum = parseInt(startTime.replace(':', ''), 10);
    const endNum = parseInt(endTime.replace(':', ''), 10);
    if (endNum <= startNum) {
      setErrorMsg('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มการจอง');
      return;
    }

    let finalHairdresserId = selectedHairdresserId;
    let isAnyBarberAssigned = false;

    if (selectedHairdresserId === null) {
      // Find all available hairdressers for date, startTime, and endTime
      const availableHairdressers = hairdressers.filter(hd => {
        // 1. Must not be on leave
        if (hd.onLeave) return false;

        // 2. Must not have overlapping leave record
        const hasLeave = leaves && leaves.some(l => {
          return l.hairdresserId === hd.id &&
                 l.date === date &&
                 startTime < l.endTime && l.startTime < endTime;
        });
        if (hasLeave) return false;

        // 3. Must not have overlapping booking
        const hasOverlapBooking = bookings && bookings.some(booking => {
          if (booking.date !== date || booking.hairdresserId !== hd.id) {
            return false;
          }
          const startA = startTime;
          const endA = endTime;
          const startB = booking.startTime;
          const endB = booking.endTime;
          return startA < endB && startB < endA;
        });
        if (hasOverlapBooking) return false;

        // 4. Must not be currently busy at the physical shop
        if (hd.busyUntil && hd.busyStart && date === getTodayDateString()) {
          const now = new Date();
          const busyUntilDT = new Date(hd.busyUntil);
          if (busyUntilDT > now) {
            const busyStartDT = new Date(hd.busyStart);
            const isFarFuture = busyUntilDT.getFullYear() >= 2030;
            const effectiveEndDT = isFarFuture ? now : busyUntilDT;

            const reqStartDT = new Date(`${date}T${startTime}:00`);
            const reqEndDT = new Date(`${date}T${endTime}:00`);
            if (reqStartDT < effectiveEndDT && busyStartDT < reqEndDT) {
              return false;
            }
          }
        }

        // 5. Must not be currently on break at the physical shop
        if (hd.breakUntil && hd.breakStart && date === getTodayDateString()) {
          const now = new Date();
          const breakUntilDT = new Date(hd.breakUntil);
          if (breakUntilDT > now) {
            const breakStartDT = new Date(hd.breakStart);
            const isFarFuture = breakUntilDT.getFullYear() >= 2030;
            const effectiveEndDT = isFarFuture ? now : breakUntilDT;

            const reqStartDT = new Date(`${date}T${startTime}:00`);
            const reqEndDT = new Date(`${date}T${endTime}:00`);
            if (reqStartDT < effectiveEndDT && breakStartDT < reqEndDT) {
              return false;
            }
          }
        }

        return true;
      });

      if (availableHairdressers.length === 0) {
        setErrorMsg('⚠️ ขออภัย ช่างทุกคนติดคิวหรือลางานในช่วงเวลานี้ ไม่สามารถจองแบบไม่ระบุช่างได้');
        return;
      }

      // Sort available hairdressers by booking count ascending to load balance
      const bookingsCountMap = new Map<string, number>();
      hairdressers.forEach(hd => bookingsCountMap.set(hd.id, 0));
      if (bookings) {
        bookings.forEach(b => {
          if (b.date === date && b.hairdresserId) {
            bookingsCountMap.set(b.hairdresserId, (bookingsCountMap.get(b.hairdresserId) || 0) + 1);
          }
        });
      }

      availableHairdressers.sort((a, b) => {
        const countA = bookingsCountMap.get(a.id) || 0;
        const countB = bookingsCountMap.get(b.id) || 0;
        return countA - countB;
      });

      finalHairdresserId = availableHairdressers[0].id;
      isAnyBarberAssigned = true;
    } else {
      // Validate if the selected hairdresser is currently busy at the shop
      const selectedHairdresser = hairdressers.find(h => h.id === selectedHairdresserId);
      if (selectedHairdresser && selectedHairdresser.busyUntil && selectedHairdresser.busyStart && date === getTodayDateString()) {
        const now = new Date();
        const busyUntilDT = new Date(selectedHairdresser.busyUntil);
        if (busyUntilDT > now) {
          const busyStartDT = new Date(selectedHairdresser.busyStart);
          const isFarFuture = busyUntilDT.getFullYear() >= 2030;
          const effectiveEndDT = isFarFuture ? now : busyUntilDT;

          const reqStartDT = new Date(`${date}T${startTime}:00`);
          const reqEndDT = new Date(`${date}T${endTime}:00`);
          if (reqStartDT < effectiveEndDT && busyStartDT < reqEndDT) {
            setErrorMsg(`⚠️ ช่าง${selectedHairdresser.name} กำลังติดให้บริการตัดผมหน้าร้านอยู่ ณ ขณะนี้ และยังไม่เสร็จงาน จึงไม่สามารถลงคิวซ้อนในช่วงเวลานี้ได้`);
            return;
          }
        }
      }

      // Validate if the selected hairdresser is currently on break at the shop
      if (selectedHairdresser && selectedHairdresser.breakUntil && selectedHairdresser.breakStart && date === getTodayDateString()) {
        const now = new Date();
        const breakUntilDT = new Date(selectedHairdresser.breakUntil);
        if (breakUntilDT > now) {
          const breakStartDT = new Date(selectedHairdresser.breakStart);
          const isFarFuture = breakUntilDT.getFullYear() >= 2030;
          const effectiveEndDT = isFarFuture ? now : breakUntilDT;

          const reqStartDT = new Date(`${date}T${startTime}:00`);
          const reqEndDT = new Date(`${date}T${endTime}:00`);
          if (reqStartDT < effectiveEndDT && breakStartDT < reqEndDT) {
            setErrorMsg(`⚠️ ช่าง${selectedHairdresser.name} กำลังพักเบรกอยู่ ณ ขณะนี้ ยังไม่พร้อมให้บริการ จึงไม่สามารถลงคิวซ้อนในช่วงเวลานี้ได้`);
            return;
          }
        }
      }

      // Validate if the selected hairdresser has a partial leave/closure
      if (leaves && leaves.length > 0) {
        const selectedHairdresser = hairdressers.find(h => h.id === selectedHairdresserId);
        if (selectedHairdresser) {
          const activeLeave = leaves.find(l => {
            return l.hairdresserId === selectedHairdresserId &&
                   l.date === date &&
                   startTime < l.endTime && l.startTime < endTime;
          });
          if (activeLeave) {
            setErrorMsg(`ช่าง${selectedHairdresser.name} ติดปิดคิว/ลางาน ในช่วงเวลานี้ (${formatThaiTime(activeLeave.startTime)} - ${formatThaiTime(activeLeave.endTime)}) รายละเอียด: ${activeLeave.details}`);
            return;
          }
        }
      }

      // Validate overlapping bookings for the selected hairdresser
      if (bookings && bookings.length > 0) {
        const selectedHairdresser = hairdressers.find(h => h.id === selectedHairdresserId);
        const hairdresserName = selectedHairdresser ? selectedHairdresser.name : 'ช่างที่เลือก';

        const overlappingBooking = bookings.find(booking => {
          // Must be the same date and same hairdresser
          if (booking.date !== date || booking.hairdresserId !== selectedHairdresserId) {
            return false;
          }

          // Overlap check: startA < endB && startB < endA
          const startA = startTime;
          const endA = endTime;
          const startB = booking.startTime;
          const endB = booking.endTime;

          return startA < endB && startB < endA;
        });

        if (overlappingBooking) {
          setOverlapModalData({
            hairdresserName,
            date,
            startTime,
            endTime,
            existingBooking: overlappingBooking
          });
          return;
        }
      }
    }

    // Prepare booking submit
    onAddBooking({
      date,
      startTime,
      endTime,
      hairdresserId: finalHairdresserId,
      customerName: customerName.trim() || 'ลูกค้าหน้าร้าน (Walk-in)',
      customerPhone: customerPhone.trim() || '-',
      remarks: remarks.trim(),
      recordedBy: activeRecorder,
      isAnyBarber: isAnyBarberAssigned
    });

    // Reset Form (except Date, times, hairdresser, and activeRecorder for easier continuation)
    setCustomerName('');
    setCustomerPhone('');
    setRemarks('');
    
    // Trigger success feedback
    setShowSuccess(true);
    // Smooth auto hide after 3 seconds
    const timer = setTimeout(() => {
      setShowSuccess(false);
    }, 4500);

    return () => clearTimeout(timer);
  };

  return (
    <div className="max-w-6xl mx-auto" id="booking-form-page">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* คอลัมน์ซ้าย: ฟอร์มลงคิวจองตัดผม */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden" id="booking-form-card">
      {/* Header Banner */}
      <div className="bg-stone-earth px-6 py-5 text-white flex justify-between items-center border-b border-brand/20">
        <div>
          <h2 className="text-xl font-serif font-bold tracking-tight text-brand-light">ลงคิวจองตัดผม</h2>
          <p className="text-stone-400 text-xs mt-0.5 font-light">ป้อนข้อมูลคิวล่วงหน้าหรือคิวปัจจุบันของร้าน</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center border border-stone-700/50">
          <Clock className="w-5 h-5 text-brand" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">

        {/* Success Modal Notification */}
        {showSuccess && (
          <div className="bg-brand-light border border-brand/30 rounded-2xl p-4 flex gap-3 animate-fade-in items-center" id="success-notification">
            <CheckCircle2 className="w-6 h-6 text-brand shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900 text-sm">เพิ่มคิวสำเร็จแล้ว!</h3>
              <p className="text-xs text-stone-600 mt-0.5">คิวถูกจัดเก็บไปที่หน้ารายการจองเรียบร้อย</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSuccess(false);
                jumpToTab(1); // Jump to page 2 (index 1)
              }}
              className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
            >
              ดูรายการจอง <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-center animate-shake" id="error-notification">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-800 font-medium">{errorMsg}</span>
          </div>
        )}

        {/* 1. Date, Start Time, End Time in Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* วันที่ */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand" /> วันที่
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all bg-stone-50/50"
              required
            />
          </div>

          {/* เวลาเริ่ม */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand" /> เวลาเริ่ม
            </label>
            <select
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all bg-stone-50/50 font-bold"
              required
            >
              {TIME_OPTIONS.map((t) => (
                <option key={`start-${t}`} value={t}>
                  {formatThaiTime(t)}
                </option>
              ))}
            </select>
          </div>

          {/* เวลาสิ้นสุด */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand" /> เวลาสิ้นสุด
            </label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all bg-stone-50/50 font-bold"
              required
            >
              {TIME_OPTIONS.map((t) => (
                <option key={`end-${t}`} value={t}>
                  {formatThaiTime(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shop Holiday Warning */}
        {isShopHolidaySelected() && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-center animate-shake" id="shop-holiday-warning">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-red-900">ร้านปิดทำการประจำสัปดาห์ (วันหยุดร้าน)</h4>
              <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                วันที่เลือกตรงกับ <strong>{getSelectedDateThaiDayName()}</strong> ซึ่งถูกกำหนดเป็นวันหยุดประจำสาขาของทางร้าน ระบบปิดบริการรับคิวจองอัตโนมัติในวันนี้
              </p>
            </div>
          </div>
        )}

        {/* 2. Hairdresser Selection Buttons */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-brand" /> ช่างตัดผมสำหรับรายการนี้
            </label>
            <span className="text-[10px] text-brand bg-brand-light px-2.5 py-1 rounded-md font-bold border border-brand/20">
              {selectedHairdresserId === null ? "ตัดกับใครก็ได้" : `ช่าง ${hairdressers.find(h => h.id === selectedHairdresserId)?.name || ""}`}
            </span>
          </div>

          {/* Button Selector Layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* Anyone option */}
            <button
              type="button"
              id="hairdresser-any-btn"
              onClick={() => setSelectedHairdresserId(null)}
              className={`px-4 py-3 rounded-2xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                selectedHairdresserId === null
                  ? 'border-brand bg-brand-light text-brand-dark ring-2 ring-brand/10 shadow-sm'
                  : 'border-stone-200 bg-stone-50/30 text-stone-700 hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                💇‍♂️
              </div>
              <span className="text-center font-bold">ไม่ระบุช่าง</span>
              <span className="text-[9px] font-normal text-stone-500 opacity-80">(ใครก็ได้)</span>
            </button>

            {/* Individual hairdressers */}
            {hairdressers.map((hd) => {
              const isOnLeave = !!hd.onLeave;
              
              // Check if hairdresser has a partial leave/closure record at selected date and currently active time slot
              const activePartialLeave = leaves?.find(l => {
                return l.hairdresserId === hd.id &&
                       l.date === date &&
                       startTime < l.endTime && l.startTime < endTime;
              });

              const isSelected = selectedHairdresserId === hd.id;

              if (isOnLeave) {
                return (
                  <button
                    key={hd.id}
                    type="button"
                    disabled
                    id={`hairdresser-btn-${hd.id}`}
                    className="px-4 py-3 rounded-2xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 border border-dashed border-stone-250 bg-stone-100/80 text-stone-400 cursor-not-allowed opacity-75"
                    title={`ช่าง${hd.name} ลางาน / ปิดรับจองชั่วคราว`}
                  >
                    <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-400 flex items-center justify-center text-[10px] font-bold font-mono">
                      {hd.name.slice(0, 2)}
                    </div>
                    <span className="truncate max-w-full text-center font-bold line-through">ช่าง{hd.name}</span>
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50/70 px-2 py-0.5 rounded-full border border-amber-200/50">ลางาน</span>
                  </button>
                );
              }

              if (activePartialLeave) {
                return (
                  <button
                    key={hd.id}
                    type="button"
                    disabled
                    id={`hairdresser-btn-${hd.id}`}
                    className="px-4 py-3 rounded-2xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 border border-dashed border-amber-300 bg-amber-50/50 text-amber-800 cursor-not-allowed opacity-80"
                    title={`ช่าง${hd.name} ปิดคิวชั่วคราวช่วงเวลา ${formatThaiTime(activePartialLeave.startTime)} - ${formatThaiTime(activePartialLeave.endTime)}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold font-mono">
                      {hd.name.slice(0, 2)}
                    </div>
                    <span className="truncate max-w-full text-center font-bold text-amber-900">ช่าง{hd.name}</span>
                    <span className="text-[9px] font-bold text-red-700 bg-red-50/70 px-1.5 py-0.5 rounded-md border border-red-200">
                      ปิดคิว ({formatThaiTime(activePartialLeave.startTime)} - {formatThaiTime(activePartialLeave.endTime)})
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={hd.id}
                  type="button"
                  id={`hairdresser-btn-${hd.id}`}
                  onClick={() => setSelectedHairdresserId(hd.id)}
                  className={`px-4 py-3 rounded-2xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand bg-brand-light text-brand-dark ring-2 ring-brand/10 shadow-sm'
                      : 'border-stone-200 bg-stone-50/30 text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-stone-earth text-brand-light flex items-center justify-center text-[10px] font-bold font-mono">
                    {hd.name.slice(0, 2)}
                  </div>
                  <span className="truncate max-w-full text-center font-bold">ช่าง{hd.name}</span>
                  <span className="text-[9px] font-normal text-stone-400">ระบุเจาะจง</span>
                </button>
              );
            })}

            {/* Hint to add hairdressers if empty */}
            {hairdressers.length === 0 && (
              <div className="col-span-2 sm:col-span-3 p-4 border border-dashed border-stone-205 rounded-2xl text-center bg-stone-50">
                <p className="text-xs text-stone-500">ยังไม่มีรายชื่อช่างในระบบ</p>
                <button
                  type="button"
                  onClick={() => jumpToTab(2)}
                  className="mt-2 text-xs text-brand font-semibold hover:underline"
                >
                  ไปที่หน้าตั้งค่าช่างตัดผม
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Customer Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-100 pb-2">
            ข้อมูลการติดต่อของลูกค้า
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ชื่อลูกค้า */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand" /> ชื่อลูกค้า <span className="text-[10px] text-stone-400 font-normal">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                id="customer-name-input"
                placeholder="เช่น คุณสมศักดิ์ (เว้นว่างได้)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
              />
            </div>

            {/* เบอร์ลูกค้า */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand" /> เบอร์โทรศัพท์ลูกค้า <span className="text-[10px] text-stone-400 font-normal">(ไม่บังคับ)</span>
              </label>
              <input
                type="tel"
                id="customer-phone-input"
                placeholder="เช่น 095-xxxxxxx (เว้นว่างได้)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                autoComplete="off"
              />

              {/* Autocomplete suggestion drop-down */}
              {customerPhone.replace(/\D/g, '').length >= 3 && suggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-brand/25 rounded-2xl shadow-xl p-2 space-y-1 animate-fade-in text-stone-800">
                  <p className="text-[10px] text-stone-600 font-bold px-2 pb-1 border-b border-stone-100 flex items-center gap-1">
                    ✨ ดึงข้อมูลจากประวัติเก่า (คลิกเพื่อกรอกอัตโนมัติ):
                  </p>
                  <div className="max-h-36 overflow-y-auto">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCustomerName(s.name);
                          setCustomerPhone(s.phone);
                          if (s.lastRemarks) {
                            setRemarks(s.lastRemarks);
                          }
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-brand/10 transition-colors flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-stone-900">{s.name}</p>
                          <p className="text-[10px] text-stone-500">📞 {s.phone}</p>
                        </div>
                        {s.lastRemarks && (
                          <span className="text-[9px] bg-stone-100 px-1.5 py-0.5 rounded-md text-stone-600 truncate max-w-[120px]" title={s.lastRemarks}>
                            ล่าสุด: {s.lastRemarks}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Notes Checkbox / Options Quick fill & Remarks textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-brand" /> หมายเหตุ / บริการเพิ่มเติม
          </label>
          <textarea
            id="remarks-input"
            rows={2}
            placeholder="เช่น สระ-ไดร์, ย้อมผมสีเทา, ดัดพาร์ม, หรือตัดทรงวินเทจ (ทวิสท์)..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full text-sm p-3.5 rounded-xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all resize-none font-sans"
          />
          {/* Quick choices tabs for Thai barber shop services */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['ตัดปกติ', 'สระไดร์', 'สระหนวด/โกน', 'ย้อมสีผม', 'ดัดวอลลุ่ม', 'กันขอบแกะลาย'].map(service => (
              <button
                key={service}
                type="button"
                onClick={() => {
                  if (remarks.includes(service)) {
                    // Remove it
                    setRemarks(prev => prev.replace(`${service}, `, '').replace(service, '').trim());
                  } else {
                    // Add it
                    setRemarks(prev => prev ? `${prev}, ${service}` : service);
                  }
                }}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                  remarks.includes(service)
                    ? 'border-brand bg-brand-light text-brand font-medium'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-stone-50'
                }`}
              >
                + {service}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Recorder Line (ผู้บันทึก) */}
        <div className="space-y-2 border-t border-stone-200 pt-5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              🔑 ช่างผู้บันทึกระบบ
            </label>
            <span className="text-[11px] text-stone-500 font-light">ข้อมูลสำหรับผู้ตรวจสอบคิวหลังตรวจสอบ</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {hairdressers.map((hd) => {
              const isSelected = activeRecorder === hd.name;
              const isOnLeave = !!hd.onLeave;
              return (
                <button
                  key={`recorder-${hd.id}`}
                  type="button"
                  id={`recorder-btn-${hd.id}`}
                  onClick={() => setActiveRecorder(hd.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? isOnLeave
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                        : 'border-brand bg-brand text-white shadow-sm'
                      : isOnLeave
                        ? 'border-stone-150 bg-stone-100/50 text-stone-400 opacity-60'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? (isOnLeave ? 'bg-amber-600' : 'bg-white') : (isOnLeave ? 'bg-amber-400' : 'bg-brand')}`}></span>
                  ช่าง{hd.name} {isOnLeave && <span className="text-[9px] font-bold text-amber-600">(ลางาน)</span>}
                </button>
              );
            })}

            {hairdressers.length === 0 && (
              <span className="text-xs text-brand bg-brand-light px-3 py-2 rounded-xl border border-brand/20">
                ⚠️ กรุณาไปเพิ่มช่างในเมนูตั้งค่าก่อน เพื่อเป็นผู้บันทึกคิว
              </span>
            )}
          </div>
        </div>

        {/* 6. Save Button */}
        <button
          type="submit"
          id="booking-save-btn"
          disabled={hairdressers.length === 0}
          className={`w-full py-4 px-4 rounded-2xl text-center text-sm font-semibold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
            hairdressers.length === 0
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
              : showSuccess
                ? 'bg-green-700 hover:bg-green-800 text-white ring-2 ring-green-150 animate-pulse'
                : 'bg-brand hover:bg-brand-dark text-white active:scale-[0.99] border-t border-brand/50'
          }`}
        >
          {showSuccess ? (
            <span>✅ บันทึกและซิงค์คิวสดสำเร็จเรียบร้อย!</span>
          ) : (
            <span>💾 บันทึกการลงคิว (ซิงค์คลาวด์สด)</span>
          )}
        </button>
      </form>
        </div>

        {/* คอลัมน์ขวา: ตารางแสดงผล 'สถานะคิวรวม' ของร้าน */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden p-5 sm:p-6 space-y-4" id="shop-queue-status-card">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <h3 className="text-lg font-serif font-bold text-stone-900">สถานะคิวรวมของร้าน</h3>
              </div>
              <p className="text-xs text-stone-500 mt-1 font-light">
                ภาพรวมคิวจอง ประจำวันที่ <span className="font-bold text-brand">{formatThaiDate(date)}</span>
              </p>
            </div>
            
            {/* Quick stats badges */}
            <div className="flex flex-wrap gap-1.5 text-[10px] sm:text-xs">
              <span className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-bold border border-stone-200/60 flex items-center gap-1">
                📅 คิวจองวันนี้: {bookings.filter(b => b.date === date).length} รายการ
              </span>
              <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full font-bold border border-emerald-100 flex items-center gap-1">
                💇‍♂️ ช่างเวรวันนี้: {hairdressers.filter(h => !h.onLeave).length} คน
              </span>
            </div>
          </div>

          {/* Barber Fast Busy Status Update Widget (หน้าร้านช่างตัดผม) */}
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 space-y-3" id="barber-busy-toggle-widget">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <span className="text-sm">💈</span>
                <span>สถานะการให้บริการจริงหน้าร้าน (สำหรับช่างกดด่วน)</span>
              </div>
              <span className="text-[10px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full font-bold self-start sm:self-auto">
                ป้องกันการซ้อนคิวจากหลังบ้านโดยอัตโนมัติ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hairdressers.filter(h => !h.onLeave).map(hd => {
                const isCurrentlyBusy = hd.busyUntil && hd.busyStart && new Date(hd.busyUntil) > new Date();
                const isCurrentlyOnBreak = hd.breakUntil && hd.breakStart && new Date(hd.breakUntil) > new Date();
                
                const dStart = isCurrentlyBusy && hd.busyStart ? new Date(hd.busyStart) : (isCurrentlyOnBreak && hd.breakStart ? new Date(hd.breakStart) : null);
                const hh = dStart ? String(dStart.getHours()).padStart(2, '0') : '';
                const mm = dStart ? String(dStart.getMinutes()).padStart(2, '0') : '';
                const busyUntilFormatted = isCurrentlyBusy ? `กำลังให้บริการ (${hh}.${mm}น.)` : '';
                const breakUntilFormatted = isCurrentlyOnBreak ? `พักเบรก (${hh}.${mm}น.)` : '';

                return (
                  <div key={`busy-widget-${hd.id}`} className="bg-white border border-stone-150 rounded-xl p-2.5 flex flex-col justify-between gap-2 shadow-xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-stone-850 truncate">ช่าง{hd.name}</span>
                        {isCurrentlyBusy ? (
                          <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200/40 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 shrink-0 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                            {busyUntilFormatted}
                          </span>
                        ) : isCurrentlyOnBreak ? (
                          <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-200/40 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 shrink-0 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            {breakUntilFormatted}
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200/40 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            ว่างอยู่
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      {isCurrentlyBusy ? (
                        <button
                          type="button"
                          onClick={() => handleToggleBusy(hd.id, false)}
                          className="w-full py-1.5 px-2 rounded-lg text-[10px] font-bold bg-stone-100 hover:bg-stone-200/80 text-stone-700 border border-stone-200 transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98]"
                        >
                          🔓 เสร็จงานแล้ว (ว่างรับคิวต่อ)
                        </button>
                      ) : isCurrentlyOnBreak ? (
                        <button
                          type="button"
                          onClick={() => handleToggleBreak(hd.id, false)}
                          className="w-full py-1.5 px-2 rounded-lg text-[10px] font-bold bg-stone-100 hover:bg-stone-200/80 text-stone-700 border border-stone-200 transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98]"
                        >
                          🔓 กลับมาทำงาน (ว่างรับคิวต่อ)
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleBusy(hd.id, true)}
                            className="w-1/2 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98]"
                          >
                            ⚡️ ตัดผม (ไม่ว่าง)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBreak(hd.id, true)}
                            className="w-1/2 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-sky-500 hover:bg-sky-600 text-white transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98]"
                          >
                            ☕️ พักเบรก
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {hairdressers.filter(h => !h.onLeave).length === 0 && (
                <div className="col-span-full py-2 text-center text-stone-400 text-xs">
                  ไม่มีช่างเวรปฏิบัติงานวันนี้
                </div>
              )}
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-semibold">
              <Filter className="w-3.5 h-3.5 text-brand" /> ช่วงเวลา:
            </div>
            <div className="flex gap-1 bg-stone-50 p-1 rounded-xl border border-stone-100">
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFilter === 'all'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/50'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('morning')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFilter === 'morning'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/50'
                }`}
              >
                🌅 เช้า
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('afternoon')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFilter === 'afternoon'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/50'
                }`}
              >
                ☀️ บ่าย
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('evening')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFilter === 'evening'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/50'
                }`}
              >
                🌙 ค่ำ
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-brand-light/40 border border-brand/10 rounded-2xl p-3 flex gap-2.5 items-start">
            <span className="text-sm">✨</span>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-stone-900">ระบบอำนวยความสะดวกการจอง:</p>
              <p className="text-[11px] text-stone-600 leading-relaxed font-light">
                คลิกที่ปุ่ม <span className="font-bold text-emerald-800">+ ว่างจอง</span> ในตาราง เพื่อเลือกเวลานั้นและชื่อช่างสำหรับฟอร์มฝั่งซ้ายโดยอัตโนมัติทันที
              </p>
            </div>
          </div>

          {/* Timetable/Grid wrapper */}
          <div className="border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs bg-stone-50/20" id="shop-queue-timeline-table">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[500px]">
                <thead>
                  <tr className="bg-stone-earth text-white border-b border-brand/10">
                    <th className="w-[120px] px-3 py-3 text-left text-xs font-serif font-bold tracking-wider">เวลา</th>
                    {hairdressers.map(hd => (
                      <th key={`hd-header-${hd.id}`} className="px-2 py-3 text-center text-xs font-serif font-bold tracking-wider truncate">
                        ช่าง{hd.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {filteredSlots.map(slotStart => {
                    const slotEnd = getEndTimeOfSlot(slotStart);
                    const density = isShopHolidaySelected() ? 'closed' : getSlotDensity(slotStart, slotEnd);
                    
                    // Density dot color
                    let densityDot = 'bg-emerald-500';
                    let densityTitle = 'ช่างทุกคนว่างพร้อมให้บริการ';
                    if (density === 'closed') {
                      densityDot = 'bg-stone-300';
                      densityTitle = 'ร้านปิด หรือไม่มีช่างคนใดเข้าเวรช่วงนี้';
                    } else if (density === 'full') {
                      densityDot = 'bg-red-500';
                      densityTitle = 'คิวเต็มทุกช่าง ไม่สามารถลงจองเพิ่มได้';
                    } else if (density === 'partial') {
                      densityDot = 'bg-amber-500';
                      densityTitle = 'คิวหนาแน่นบางส่วน ช่างบางท่านยังว่าง';
                    }

                    return (
                      <tr key={`slot-${slotStart}`} className="hover:bg-stone-50/50 transition-colors">
                        {/* Time cell */}
                        <td className="px-3 py-2.5 font-mono text-xs text-stone-750 font-semibold border-r border-stone-100 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${densityDot}`} title={densityTitle}></span>
                          <span>{formatThaiTime(slotStart)} - {formatThaiTime(slotEnd)}</span>
                        </td>

                        {/* Barbers cells */}
                        {hairdressers.map(hd => {
                          if (isShopHolidaySelected()) {
                            return (
                              <td key={`cell-${slotStart}-${hd.id}`} className="px-1.5 py-1 text-center bg-red-50 text-red-600 text-[10px] font-bold select-none" title="วันหยุดประจำสัปดาห์ของร้าน">
                                📅 วันหยุดร้าน
                              </td>
                            );
                          }

                          const isOnGeneralLeave = !!hd.onLeave;
                          const partialLeave = leaves?.find(l => l.hairdresserId === hd.id && l.date === date && slotStart < l.endTime && l.startTime < slotEnd);
                          const activeBooking = bookings?.find(b => b.hairdresserId === hd.id && b.date === date && slotStart < b.endTime && b.startTime < slotEnd);
                          const isBusyNow = checkIsBusySlot(hd, slotStart, slotEnd);
                          const isBreakNow = checkIsBreakSlot(hd, slotStart, slotEnd);

                          // State logic
                          if (isOnGeneralLeave) {
                            return (
                              <td key={`cell-${slotStart}-${hd.id}`} className="px-1.5 py-1 text-center bg-stone-100 text-stone-400 text-[10px] font-bold line-through select-none" title="ช่างลางานตลอดวัน">
                                💤 ลางาน
                              </td>
                            );
                          }

                          if (partialLeave) {
                            return (
                              <td key={`cell-${slotStart}-${hd.id}`} className="px-1.5 py-1 text-center bg-amber-50 text-amber-700 text-[9px] font-bold" title={`ปิดช่วงเวลา: ${partialLeave.startTime} - ${partialLeave.endTime}`}>
                                🚫 ปิดคิว
                              </td>
                            );
                          }

                          if (isBusyNow) {
                            const dStart = new Date(hd.busyStart!);
                            const hh = String(dStart.getHours()).padStart(2, '0');
                            const mm = String(dStart.getMinutes()).padStart(2, '0');
                            return (
                              <td key={`cell-${slotStart}-${hd.id}`} className="px-1.5 py-1 text-center bg-orange-50 text-orange-800 text-[10px] font-bold border border-orange-100/50" title={`ช่างกำลังให้บริการตัดผมหน้าร้าน (เริ่มเมื่อ ${hh}:${mm})`}>
                                <div className="truncate max-w-[120px] mx-auto font-bold flex flex-col items-center justify-center gap-0.5 text-orange-900 leading-tight">
                                  <span>💈 กำลังให้บริการ</span>
                                  <span className="text-[9px] opacity-75">({hh}.{mm}น.)</span>
                                </div>
                              </td>
                            );
                          }

                          if (isBreakNow) {
                            const dStart = new Date(hd.breakStart!);
                            const hh = String(dStart.getHours()).padStart(2, '0');
                            const mm = String(dStart.getMinutes()).padStart(2, '0');
                            return (
                              <td key={`cell-${slotStart}-${hd.id}`} className="px-1.5 py-1 text-center bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-100/50" title={`ช่างกำลังพักเบรก (เริ่มเมื่อ ${hh}:${mm})`}>
                                <div className="truncate max-w-[120px] mx-auto font-bold flex flex-col items-center justify-center gap-0.5 text-sky-900 leading-tight">
                                  <span>☕️ พักเบรก</span>
                                  <span className="text-[9px] opacity-75">({hh}.{mm}น.)</span>
                                </div>
                              </td>
                            );
                          }

                          if (activeBooking) {
                            return (
                              <td key={`cell-${slotStart}-${hd.id}`} className="px-1 py-1 text-center bg-rose-50/85 text-rose-800 text-[10px] border border-rose-100/50" title={`มีคิวจอง: คุณ ${activeBooking.customerName} (${activeBooking.customerPhone || '-'})`}>
                                <div className="truncate max-w-[100px] mx-auto font-bold text-rose-900">
                                  👤 {activeBooking.customerName}
                                </div>
                              </td>
                            );
                          }

                          // Render available slot
                          return (
                            <td key={`cell-${slotStart}-${hd.id}`} className="px-1.5 py-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectSlot(slotStart, hd.id)}
                                className="w-full py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-0.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/85 border border-emerald-200/30"
                              >
                                <span>+ ว่างจอง</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Scroll Indicator helper for mobile screens */}
            <div className="lg:hidden bg-stone-100 text-stone-500 py-1.5 text-[9px] text-center font-bold border-t border-stone-200/80">
              📱 ปัดซ้าย-ขวา เพื่อดูตารางคิวของช่างท่านอื่นเพิ่มเติ่ม ↔️
            </div>
          </div>

          {/* Color Key Indicators */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-[10px] text-stone-550 font-bold border-t border-stone-100 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>เขียว = ว่างทั้งร้าน</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>ส้ม = หนาแน่นบางส่วน</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>แดง = เต็มทุกช่าง</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-stone-100 border border-stone-200 rounded-sm"></span>
              <span>เทา = ลา/ปิดคิว</span>
            </div>
          </div>
        </div>

      </div>

      {/* Booking Overlap Collision Warning Pop-up Modal */}
      {overlapModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/65 backdrop-blur-xs animate-fade-in" id="booking-overlap-popup-modal">
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 max-w-sm w-full overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">ตรวจพบช่วงเวลาจองซ้ำ!</h3>
                <p className="text-[11px] text-stone-500 font-light mt-0.5">ช่างคนเดียวกันไม่สามารถทำงานสองคิวชนกันได้</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                <strong className="text-stone-900">ช่าง{overlapModalData.hairdresserName}</strong> มีคิวที่ต้องการตัดในช่วงเวลาดังกล่าวแล้วในวันที่เลือก 
              </p>

              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/60 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-stone-100">
                  <span className="text-stone-400 font-light">คิวที่ท่านกำลังลองจอง:</span>
                  <span className="font-semibold text-brand text-right">{formatThaiTime(overlapModalData.startTime)} - {formatThaiTime(overlapModalData.endTime)}</span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> คิวที่มีอยู่แล้วตอนนี้:
                  </div>
                  <div className="text-xs text-stone-800 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    ลูกค้า: <span className="text-stone-900 font-bold">{overlapModalData.existingBooking.customerName}</span>
                  </div>
                  <div className="text-xs pl-5 space-y-1 font-light text-stone-500">
                    <p className="flex items-center gap-1">⏱️ เวลา: <span className="text-stone-850 font-semibold">{formatThaiTime(overlapModalData.existingBooking.startTime)} - {formatThaiTime(overlapModalData.existingBooking.endTime)}</span></p>
                    <p className="flex items-center gap-1">📞 เบอร์โทร: {overlapModalData.existingBooking.customerPhone || '-'}</p>
                    {overlapModalData.existingBooking.remarks && (
                      <p className="italic text-stone-400 mt-1">"{overlapModalData.existingBooking.remarks}"</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dismiss Action Button */}
              <button
                type="button"
                onClick={() => setOverlapModalData(null)}
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-all text-center cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>ตกลง, ฉันจะเลือกเวลาใหม่</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

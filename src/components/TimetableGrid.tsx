import React, { useState, useEffect, useMemo } from 'react';
import { 
  Booking, 
  Hairdresser, 
  LeaveRecord, 
  ShopService, 
  StaffRecorder 
} from '../types';
import { 
  Calendar, 
  Clock, 
  Scissors, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  CheckCircle2, 
  Trash2, 
  Phone, 
  User, 
  Tag, 
  Info,
  Edit3,
  CalendarDays,
  Sparkles,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { getEffectiveStatus, getStatusBadgeStyle, getStatusLabel } from './BookingList';

interface TimetableGridProps {
  hairdressers: Hairdresser[];
  bookings: Booking[];
  leaves: LeaveRecord[];
  services: ShopService[];
  recorders?: StaffRecorder[];
  activeRecorder?: StaffRecorder | null;
  shopOpenTime?: string;
  shopCloseTime?: string;
  slotDuration?: number;
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateBooking: (id: string, updatedFields: Partial<Booking>) => Promise<void>;
  onDeleteBooking: (id: string) => Promise<void>;
  jumpToTab?: (tabIndex: number) => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  hairdressers,
  bookings,
  leaves,
  services,
  recorders = [],
  activeRecorder = null,
  shopOpenTime = "09:00",
  shopCloseTime = "21:00",
  slotDuration = 30,
  onAddBooking,
  onUpdateBooking,
  onDeleteBooking,
  jumpToTab
}) => {
  // 1. Current Selected Date (Default = Today YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Ticking digital clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Modals & View State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenViewMode, setFullscreenViewMode] = useState<'fit' | 'scroll'>('fit');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);

  // Quick Add Booking Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickBarberId, setQuickBarberId] = useState<string>('');
  const [quickStartTime, setQuickStartTime] = useState<string>('10:00');
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickServiceId, setQuickServiceId] = useState('');
  const [quickRemarks, setQuickRemarks] = useState('');
  const [quickRecordedBy, setQuickRecordedBy] = useState('');
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);

  // Set default recorder when quick add opens
  useEffect(() => {
    if (activeRecorder) {
      setQuickRecordedBy(activeRecorder.name);
    } else if (recorders.length > 0) {
      setQuickRecordedBy(recorders[0].name);
    } else if (hairdressers.length > 0) {
      setQuickRecordedBy(hairdressers[0].name);
    }
  }, [activeRecorder, recorders, hairdressers]);

  // Helper function to convert "HH:MM" to total minutes from midnight
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Helper function to convert total minutes to "HH:MM"
  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // 3. Generate Timeline Slots
  const openMins = useMemo(() => timeToMinutes(shopOpenTime), [shopOpenTime]);
  const closeMins = useMemo(() => timeToMinutes(shopCloseTime), [shopCloseTime]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const step = 30; // 30-min intervals for granular view
    for (let m = openMins; m < closeMins; m += step) {
      slots.push(minutesToTime(m));
    }
    return slots;
  }, [openMins, closeMins]);

  // Total grid width calculation (Compact 80px per 30-min slot)
  const SLOT_WIDTH_PX = 80;
  const TOTAL_GRID_WIDTH = timeSlots.length * SLOT_WIDTH_PX;

  // 4. Sort Hairdressers so Fah (ฟ้า) is always at the top (first row)
  const sortedHairdressers = useMemo(() => {
    return [...(hairdressers || [])].filter(Boolean).sort((a, b) => {
      const isAFah = (a?.name || '').toLowerCase().includes('ฟ้า');
      const isBFah = (b?.name || '').toLowerCase().includes('ฟ้า');
      if (isAFah && !isBFah) return -1;
      if (!isAFah && isBFah) return 1;
      return 0;
    });
  }, [hairdressers]);

  // Filter Bookings and Leaves for the Selected Date
  const dayBookings = useMemo(() => {
    return (bookings || []).filter(b => b && b.date === selectedDate && b.status !== 'cancelled');
  }, [bookings, selectedDate]);

  const dayLeaves = useMemo(() => {
    return (leaves || []).filter(l => l && l.date === selectedDate);
  }, [leaves, selectedDate]);

  // 5. Thai Long Date Formatter (e.g., "วันอังคารที่ 28 กรกฎาคม พ.ศ. 2569")
  const getThaiFormattedDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
      const dateObj = new Date(y, m - 1, d);
      const daysOfWeek = ['วันอาทิตย์ที่', 'วันจันทร์ที่', 'วันอังคารที่', 'วันพุธที่', 'วันพฤหัสบดีที่', 'วันศุกร์ที่', 'วันเสาร์ที่'];
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const dayName = daysOfWeek[dateObj.getDay()] || '';
      const monthName = thaiMonths[dateObj.getMonth()] || '';
      const buddhistYear = y + 543;
      return `${dayName} ${d} ${monthName} พ.ศ. ${buddhistYear}`;
    } catch {
      return dateStr;
    }
  };

  // Date Navigation handlers
  const handlePrevDay = () => {
    if (!selectedDate || typeof selectedDate !== 'string') return;
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return;
      const prev = new Date(y, m - 1, d - 1);
      const year = prev.getFullYear();
      const month = String(prev.getMonth() + 1).padStart(2, '0');
      const day = String(prev.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    } catch (e) {
      console.warn("handlePrevDay notice:", e);
    }
  };

  const handleNextDay = () => {
    if (!selectedDate || typeof selectedDate !== 'string') return;
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return;
      const next = new Date(y, m - 1, d + 1);
      const year = next.getFullYear();
      const month = String(next.getMonth() + 1).padStart(2, '0');
      const day = String(next.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    } catch (e) {
      console.warn("handleNextDay notice:", e);
    }
  };

  // 6. Calculate Waiting/Available Barbers Right Now (For Top Right Badge)
  const currentHHMM = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
  const isTodaySelected = selectedDate === getTodayStr();

  const availableBarbersNow = useMemo(() => {
    if (!isTodaySelected) return hairdressers;

    return hairdressers.filter(barber => {
      // Check if on explicit leave today
      const isOnLeave = dayLeaves.some(l => 
        l.hairdresserId === barber.id && 
        l.startTime <= currentHHMM && 
        currentHHMM < l.endTime
      );
      if (isOnLeave || barber.onLeave) return false;

      // Check if currently serving a customer
      const isServing = dayBookings.some(b => 
        b.hairdresserId === barber.id && 
        b.startTime <= currentHHMM && 
        currentHHMM < b.endTime
      );
      if (isServing) return false;

      return true;
    });
  }, [hairdressers, dayLeaves, dayBookings, currentHHMM, isTodaySelected]);

  // Handle Quick Add Submit
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomerName.trim()) {
      alert("กรุณากรอกชื่อลูกค้า");
      return;
    }

    setIsSubmittingQuickAdd(true);
    try {
      const selectedService = services.find(s => s.id === quickServiceId);
      const duration = selectedService ? selectedService.durationMinutes : (slotDuration || 30);
      const startMins = timeToMinutes(quickStartTime);
      const endMins = startMins + duration;
      const calcEndTime = minutesToTime(endMins);

      await onAddBooking({
        date: selectedDate,
        startTime: quickStartTime,
        endTime: calcEndTime,
        hairdresserId: quickBarberId === 'any' ? null : quickBarberId,
        customerName: quickCustomerName.trim(),
        customerPhone: quickCustomerPhone.trim() || '-',
        remarks: quickRemarks.trim(),
        recordedBy: quickRecordedBy.trim() || 'ช่างประจำร้าน',
        serviceName: selectedService ? selectedService.name : undefined,
        servicePrice: selectedService ? selectedService.price : undefined,
        status: 'waiting'
      });

      setIsQuickAddOpen(false);
      setQuickCustomerName('');
      setQuickCustomerPhone('');
      setQuickRemarks('');
      setQuickServiceId('');
    } catch (err) {
      console.error("Quick add booking failed:", err);
      alert("เกิดข้อผิดพลาดในการลงคิว กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  };

  // Open quick add modal pre-filled with barber & time
  const handleCellClick = (barberId: string, timeStr: string) => {
    setQuickBarberId(barberId);
    setQuickStartTime(timeStr);
    setIsQuickAddOpen(true);
  };

  // Position calculation helper for items on timeline
  const getItemStyle = (startTimeStr: string, endTimeStr: string) => {
    const itemStart = timeToMinutes(startTimeStr);
    const itemEnd = timeToMinutes(endTimeStr);

    // Clamped to open/close boundaries
    const clampedStart = Math.max(itemStart, openMins);
    const clampedEnd = Math.min(itemEnd, closeMins);

    const offsetMins = clampedStart - openMins;
    const durationMins = clampedEnd - clampedStart;

    const leftPx = (offsetMins / 30) * SLOT_WIDTH_PX;
    const widthPx = Math.max((durationMins / 30) * SLOT_WIDTH_PX, 40);

    return {
      left: `${leftPx}px`,
      width: `${widthPx}px`
    };
  };

  // Percentage-based calculation helper for Fullscreen mode (fits 100% screen width from open to close)
  const totalGridMins = Math.max(closeMins - openMins, 60);
  const getItemStylePct = (startTimeStr: string, endTimeStr: string) => {
    const itemStart = timeToMinutes(startTimeStr);
    const itemEnd = timeToMinutes(endTimeStr);

    const clampedStart = Math.max(itemStart, openMins);
    const clampedEnd = Math.min(itemEnd, closeMins);

    const offsetMins = clampedStart - openMins;
    const durationMins = clampedEnd - clampedStart;

    const leftPct = (offsetMins / totalGridMins) * 100;
    const widthPct = Math.max((durationMins / totalGridMins) * 100, 1.2);

    return {
      left: `${leftPct}%`,
      width: `${widthPct}%`
    };
  };

  // Current time line calculation
  const nowMins = timeToMinutes(currentHHMM);
  const isTimeWithinBounds = nowMins >= openMins && nowMins <= closeMins;
  const currentTimeLeftPx = isTimeWithinBounds ? ((nowMins - openMins) / 30) * SLOT_WIDTH_PX : null;
  const currentTimeLeftPct = isTimeWithinBounds ? ((nowMins - openMins) / totalGridMins) * 100 : null;

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12" id="timetable-view-container">
      
      {/* ----------------- TOP HEADER TOOLBAR ----------------- */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200/80 p-4 sm:p-6 space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Date Display & Date Picker Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-2 hover:bg-white rounded-xl text-stone-600 hover:text-stone-900 transition-all cursor-pointer active:scale-95"
                title="วันก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayStr())}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedDate === getTodayStr()
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:bg-white'
                }`}
              >
                วันนี้
              </button>

              <button
                type="button"
                onClick={handleNextDay}
                className="p-2 hover:bg-white rounded-xl text-stone-600 hover:text-stone-900 transition-all cursor-pointer active:scale-95"
                title="วันถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Date Picker Input */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer transition-all"
              />
            </div>

            {/* Thai Date Title */}
            <div className="text-stone-900 font-extrabold font-serif text-sm sm:text-base md:text-lg flex items-center gap-2 bg-amber-50/70 border border-amber-200/80 px-3.5 py-1.5 rounded-2xl">
              <CalendarDays className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{getThaiFormattedDate(selectedDate)}</span>
            </div>
          </div>

          {/* Center: Real-time Ticking Digital Clock Pill */}
          <div className="flex items-center justify-center shrink-0">
            <div className="bg-[#0B1325] text-white px-5 sm:px-6 py-2 rounded-full shadow-md border border-slate-700/80 flex items-center gap-2.5 font-mono text-base sm:text-lg font-black tracking-wider ring-1 ring-amber-500/20">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative"></span>
              </div>
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{currentTime.toLocaleTimeString('th-TH', { hour12: false })}</span>
            </div>
          </div>

          {/* Right: Waiting Barbers Pills */}
          <div className="flex flex-wrap items-center lg:justify-end gap-2" id="available-barbers-list">
            <span className="text-[11px] font-black text-stone-500 uppercase tracking-tight flex items-center gap-1">
              <span>👥 คิวช่างว่างพร้อมตัด:</span>
            </span>
            
            <div className="flex flex-wrap items-center gap-1.5">
              {availableBarbersNow.length === 0 ? (
                <span className="text-xs font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full shadow-2xs">
                  ช่างกำลังติดคิวตัดผมทุกคน 💈
                </span>
              ) : (
                availableBarbersNow.map((barber, index) => (
                  <div 
                    key={barber.id}
                    className="inline-flex items-center gap-1.5 bg-stone-50 hover:bg-amber-50 border border-stone-200/90 hover:border-amber-300 px-3 py-1 rounded-full text-xs font-bold text-stone-800 shadow-2xs transition-all"
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
                      {index + 1}
                    </span>
                    <span>{barber.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Legend / Status Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-stone-100 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-stone-600 font-medium">
            <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-xl">
              <span className="w-3 h-3 rounded-md bg-sky-300 border border-sky-500 inline-block"></span>
              <span className="font-extrabold text-sky-950">คิวจองลูกค้า</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl">
              <span className="w-3 h-3 rounded-md bg-rose-300 border border-rose-500 inline-block"></span>
              <span className="font-extrabold text-rose-950">ปิดคิว / พักงาน</span>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-xl">
              <span className="w-3 h-3 rounded-md bg-white border border-stone-300 inline-block"></span>
              <span className="font-bold text-stone-700">ช่องว่าง (คลิกเพิ่มคิว)</span>
            </div>
            {isTodaySelected && (
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-300 px-2.5 py-1 rounded-xl text-rose-600 font-black">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping"></span>
                <span>เวลาปัจจุบัน</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-xs text-stone-600 font-bold bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
              💡 คิวทั้งหมดวันที่ {selectedDate}: <strong className="text-amber-700 font-black text-sm">{dayBookings.length}</strong> คิว
            </div>

            <button
              type="button"
              id="expand-timetable-btn"
              onClick={() => setIsFullscreen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-slate-800 text-amber-300 font-extrabold rounded-2xl text-xs transition-all cursor-pointer shadow-xs hover:shadow active:scale-95 border border-slate-700 shrink-0"
              title="ขยายตารางแสดงผลเต็มหน้าจอ"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>ขยายตารางเต็มจอ</span>
            </button>
          </div>
        </div>

      </div>


      {/* ----------------- TIMETABLE MATRIX TABLE GRID ----------------- */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden" id="timetable-matrix-card">
        
        {/* Scrollable Container (Generous width for easy reading) */}
        <div className="overflow-x-auto relative">
          
          <div style={{ width: `${TOTAL_GRID_WIDTH + 150}px` }} className="relative min-w-full">
            
            {/* ------------ TABLE HEADER ROW ------------ */}
            <div className="flex bg-slate-900 text-stone-100 text-xs font-bold sticky top-0 z-20 shadow-xs border-b border-slate-800">
              
              {/* Left Column Header: ช่างวันนี้ */}
              <div className="w-[130px] sm:w-[150px] shrink-0 p-2.5 bg-slate-950 border-r border-slate-800 flex items-center justify-center gap-1.5 text-amber-300 font-serif font-extrabold uppercase tracking-wider sticky left-0 z-30">
                <Scissors className="w-4 h-4 text-amber-400" />
                <span>ช่างวันนี้ ({sortedHairdressers.length})</span>
              </div>

              {/* Time Column Headers (30-min increments) */}
              <div className="flex flex-1 relative">
                {timeSlots.map((time) => {
                  const isHour = time.endsWith(':00');
                  return (
                    <div 
                      key={time}
                      style={{ width: `${SLOT_WIDTH_PX}px` }}
                      className={`shrink-0 py-2.5 px-1 text-center border-r border-slate-800/80 font-mono text-[11px] ${
                        isHour ? 'bg-slate-800/90 font-black text-amber-300' : 'bg-slate-900/60 text-slate-400 font-bold'
                      }`}
                    >
                      {time}
                    </div>
                  );
                })}
              </div>

            </div>


            {/* ------------ TABLE BODY ROWS (BY HAIRDRESSER) ------------ */}
            <div className="divide-y divide-stone-200/80 relative">
              
              {/* Red Current Time Vertical Line Indicator */}
              {isTodaySelected && currentTimeLeftPx !== null && (
                <div 
                  className="absolute top-0 bottom-0 z-10 pointer-events-none transition-all duration-1000"
                  style={{ left: `${currentTimeLeftPx + 150}px` }}
                >
                  <div className="w-0.5 h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                  <div className="absolute top-1 -left-3 bg-rose-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap">
                    📍 {currentHHMM}
                  </div>
                </div>
              )}

              {/* Render Row for Each Barber (Fah First) */}
              {sortedHairdressers.map((barber) => {
                // Bookings for this barber
                const barberBookings = dayBookings.filter(b => b.hairdresserId === barber.id);
                // Leaves for this barber
                const barberLeaves = dayLeaves.filter(l => l.hairdresserId === barber.id);

                return (
                  <div key={barber.id} className="flex min-h-[50px] sm:min-h-[56px] relative hover:bg-stone-50/50 transition-colors group">
                    
                    {/* Left Sticky Barber Column Profile (Horizontal Compact Layout) */}
                    <div className="w-[130px] sm:w-[150px] shrink-0 px-2 py-1 bg-slate-900 text-white border-r border-slate-800 flex items-center gap-2 sticky left-0 z-20 shadow-md">
                      {barber.avatarUrl ? (
                        <img 
                          src={barber.avatarUrl} 
                          alt={barber.name} 
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-amber-400/80 object-cover shrink-0 bg-slate-800"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-400/80 text-amber-300 font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {barber.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex flex-col min-w-0 flex-1 justify-center text-left">
                        <span className="font-extrabold text-[11px] sm:text-xs tracking-tight text-stone-100 leading-tight truncate">
                          {barber.name}
                        </span>
                        {barber.onLeave ? (
                          <span className="text-[8px] font-bold text-rose-300 truncate mt-0.5">
                            🔴 ปิดคิว
                          </span>
                        ) : (
                          <span className="text-[8px] font-semibold text-emerald-300 truncate mt-0.5">
                            🟢 รับงาน
                          </span>
                        )}
                      </div>
                    </div>


                    {/* Grid Area for Slots & Overlay Events */}
                    <div className="flex flex-1 relative bg-stone-50/30">
                      
                      {/* Background Slot Lines (Clickable for Quick Booking) */}
                      <div className="flex h-full absolute inset-0">
                        {timeSlots.map((time) => (
                          <div
                            key={time}
                            style={{ width: `${SLOT_WIDTH_PX}px` }}
                            onClick={() => handleCellClick(barber.id, time)}
                            className="shrink-0 h-full border-r border-stone-200/60 hover:bg-amber-100/30 cursor-pointer transition-colors relative group/cell"
                            title={`คลิกเพื่อจองคิวช่าง ${barber.name} เวลา ${time}`}
                          >
                            <div className="opacity-0 group-hover/cell:opacity-100 absolute inset-0 flex items-center justify-center text-amber-700/60 font-bold text-[8px] pointer-events-none">
                              + {time}
                            </div>
                          </div>
                        ))}
                      </div>


                      {/* Render Bookings Overlay Cards (Light Sky Blue Style) */}
                      {barberBookings.map((b) => {
                        const style = getItemStyle(b.startTime, b.endTime);
                        const status = getEffectiveStatus(b, currentTime);
                        const isCompleted = status === 'completed';
                        const isInProgress = status === 'in-progress';

                        return (
                          <div
                            key={b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(b);
                            }}
                            style={{ left: style.left, width: style.width }}
                            className={`absolute top-1 bottom-1 z-10 rounded-lg px-1.5 py-0.5 shadow-2xs border transition-all cursor-pointer flex flex-col justify-center overflow-hidden active:scale-98 ${
                              isCompleted
                                ? 'bg-sky-50/90 border-sky-200 text-sky-800 opacity-75 hover:opacity-100'
                                : isInProgress
                                ? 'bg-sky-500 text-white border-sky-600 shadow-sm ring-2 ring-sky-300 animate-pulse'
                                : 'bg-sky-100/95 border-sky-300 hover:bg-sky-200/90 hover:border-sky-400 text-sky-950 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-black text-[10px] sm:text-[11px] truncate leading-tight text-sky-950">
                                {b.customerName}
                              </span>
                              {isInProgress && (
                                <span className="bg-slate-950 text-sky-300 text-[7px] font-black px-1 rounded-full shrink-0">
                                  ตัดอยู่
                                </span>
                              )}
                            </div>

                            <div className="text-[8.5px] font-mono font-extrabold flex items-center gap-0.5 mt-0.5 text-sky-900 opacity-95">
                              <Clock className="w-2.5 h-2.5 shrink-0 text-sky-700" />
                              <span>{b.startTime} - {b.endTime}</span>
                            </div>
                          </div>
                        );
                      })}


                      {/* Render Leave / Break Overlay Cards */}
                      {barberLeaves.map((l) => {
                        const style = getItemStyle(l.startTime, l.endTime);

                        return (
                          <div
                            key={l.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeave(l);
                            }}
                            style={{ left: style.left, width: style.width }}
                            className="absolute top-1 bottom-1 z-10 rounded-lg px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 border border-rose-300 hover:border-rose-400 text-rose-950 shadow-2xs transition-all cursor-pointer flex flex-col justify-center overflow-hidden active:scale-98"
                          >
                            <div className="font-extrabold text-[10px] sm:text-[11px] truncate leading-tight text-rose-900">
                              {l.details || 'ปิดคิว / พักงาน'}
                            </div>
                            <div className="text-[8.5px] font-mono font-bold flex items-center gap-0.5 mt-0.5 text-rose-800">
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>{l.startTime} - {l.endTime}</span>
                            </div>
                          </div>
                        );
                      })}

                    </div>

                  </div>
                );
              })}

            </div>

          </div>

        </div>

      </div>


      {/* ----------------- FULLSCREEN OVERLAY MODAL ----------------- */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-fade-in text-stone-100" id="timetable-fullscreen-modal">
          
          {/* Top Control Bar inside Fullscreen Modal */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900 border border-slate-800 p-2.5 sm:p-3.5 rounded-2xl shadow-xl shrink-0">
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 font-bold shrink-0 shadow-xs">
                <Scissors className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="font-serif font-black text-stone-100 text-sm sm:text-base flex items-center gap-2">
                  <span>ตารางคิวตัดผมประจำวัน (เต็มจอ)</span>
                  <span className="bg-amber-500 text-stone-950 font-black text-[9px] px-2 py-0.5 rounded-full">FULLSCREEN</span>
                </h2>
                <p className="text-[11px] text-slate-400 font-medium hidden md:block">แสดงช่างทุกคน ({hairdressers.length} คน) และคิวทั้งหมด ({dayBookings.length} คิว)</p>
              </div>
            </div>

            {/* Summary Counts Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs text-amber-300 font-extrabold">
              <span>✂️ ช่างทั้งหมด {hairdressers.length} คน</span>
              <span className="text-slate-600">|</span>
              <span>📅 รวม {dayBookings.length} คิว</span>
            </div>

            {/* View Mode Switcher (Fit Screen vs Zoom Scroll) */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setFullscreenViewMode('fit')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  fullscreenViewMode === 'fit'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="ขยายช่องให้พอดีความกว้างหน้าจอ"
              >
                📱 พอดีจอ
              </button>
              <button
                type="button"
                onClick={() => setFullscreenViewMode('scroll')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  fullscreenViewMode === 'scroll'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="ขยายช่องเวลาให้อ่านง่าย (เลื่อนแนวนอน)"
              >
                🔍 ช่องเวลากว้าง
              </button>
            </div>

            {/* Center: Real-time Digital Clock */}
            <div className="hidden xl:flex items-center justify-center shrink-0">
              <div className="bg-[#0B1325] text-white px-4 py-1.5 rounded-full border border-slate-800 flex items-center gap-2 font-mono text-sm font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{currentTime.toLocaleTimeString('th-TH', { hour12: false })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Date Controls inside Fullscreen */}
              <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-xs">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="วันก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold px-2 text-amber-300 font-mono text-xs">{selectedDate}</span>
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="วันถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Close / Minimize Button */}
              <button
                type="button"
                id="close-fullscreen-btn"
                onClick={() => setIsFullscreen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 font-extrabold rounded-xl text-xs transition-all border border-stone-700 cursor-pointer shadow-md active:scale-95"
              >
                <Minimize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>ย่อจอลง</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Table Grid Canvas */}
          <div className="flex-1 bg-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col mt-2 relative">
            <div className="overflow-auto relative flex-1 min-h-0">
              
              <div 
                style={fullscreenViewMode === 'scroll' ? { width: `${TOTAL_GRID_WIDTH + 140}px` } : undefined}
                className="relative w-full min-w-full"
              >
                
                {/* ------------ TABLE HEADER ROW ------------ */}
                <div className="flex bg-slate-900 text-stone-100 text-xs font-bold sticky top-0 z-20 shadow-xs border-b border-slate-800">
                  <div className="w-[130px] sm:w-[150px] shrink-0 p-2.5 bg-slate-950 border-r border-slate-800 flex items-center justify-center gap-1.5 text-amber-300 font-serif font-extrabold uppercase tracking-wider sticky left-0 z-30">
                    <Scissors className="w-4 h-4 text-amber-400" />
                    <span>ช่าง ({sortedHairdressers.length})</span>
                  </div>

                  <div className="flex flex-1 relative">
                    {timeSlots.map((time) => {
                      const isHour = time.endsWith(':00');
                      return (
                        <div 
                          key={time}
                          style={fullscreenViewMode === 'scroll' ? { width: `${SLOT_WIDTH_PX}px` } : undefined}
                          className={`${fullscreenViewMode === 'fit' ? 'flex-1 min-w-0' : 'shrink-0'} py-2 px-0.5 text-center border-r border-slate-800/80 font-mono text-[10px] sm:text-[11px] truncate ${
                            isHour ? 'bg-slate-800/90 font-black text-amber-300' : 'bg-slate-900/60 text-slate-300 font-bold'
                          }`}
                        >
                          {time}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ------------ TABLE BODY ------------ */}
                <div className="divide-y divide-stone-200/80 relative">

                  {sortedHairdressers.map((barber) => {
                    const barberBookings = dayBookings.filter(b => b.hairdresserId === barber.id);
                    const barberLeaves = dayLeaves.filter(l => l.hairdresserId === barber.id);

                    return (
                      <div key={barber.id} className="flex min-h-[50px] sm:min-h-[56px] relative hover:bg-stone-50/50 transition-colors group">
                        
                        <div className="w-[130px] sm:w-[150px] shrink-0 px-2 py-1 bg-slate-900 text-white border-r border-slate-800 flex items-center gap-2 sticky left-0 z-20 shadow-md">
                          {barber.avatarUrl ? (
                            <img 
                              src={barber.avatarUrl} 
                              alt={barber.name} 
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-amber-400/80 object-cover shrink-0 bg-slate-800"
                            />
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-400/80 text-amber-300 font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {barber.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="flex flex-col min-w-0 flex-1 justify-center text-left">
                            <span className="font-extrabold text-[11px] sm:text-xs tracking-tight text-stone-100 leading-tight truncate">
                              {barber.name}
                            </span>
                            {barber.onLeave ? (
                              <span className="text-[8px] font-bold text-rose-300 truncate mt-0.5">
                                🔴 ปิดคิว
                              </span>
                            ) : (
                              <span className="text-[8px] font-semibold text-emerald-300 truncate mt-0.5">
                                🟢 รับงาน
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-1 relative bg-stone-50/30">
                          {/* Current Time Red Line */}
                          {isTodaySelected && (fullscreenViewMode === 'fit' ? currentTimeLeftPct !== null : currentTimeLeftPx !== null) && (
                            <div 
                              className="absolute top-0 bottom-0 z-20 pointer-events-none transition-all duration-1000"
                              style={fullscreenViewMode === 'fit' ? { left: `${currentTimeLeftPct}%` } : { left: `${currentTimeLeftPx + 150}px` }}
                            >
                              <div className="w-0.5 h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                              <div className="absolute top-1 -left-3 bg-rose-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap">
                                📍 {currentHHMM}
                              </div>
                            </div>
                          )}

                          <div className="flex h-full w-full absolute inset-0">
                            {timeSlots.map((time) => (
                              <div
                                key={time}
                                style={fullscreenViewMode === 'scroll' ? { width: `${SLOT_WIDTH_PX}px` } : undefined}
                                onClick={() => handleCellClick(barber.id, time)}
                                className={`${fullscreenViewMode === 'fit' ? 'flex-1 min-w-0' : 'shrink-0'} h-full border-r border-stone-200/60 hover:bg-amber-100/30 cursor-pointer transition-colors relative group/cell`}
                                title={`คลิกเพื่อจองคิวช่าง ${barber.name} เวลา ${time}`}
                              />
                            ))}
                          </div>

                          {barberBookings.map((b) => {
                            const style = fullscreenViewMode === 'fit' ? getItemStylePct(b.startTime, b.endTime) : getItemStyle(b.startTime, b.endTime);
                            const status = getEffectiveStatus(b, currentTime);
                            const isCompleted = status === 'completed';
                            const isInProgress = status === 'in-progress';

                            return (
                              <div
                                key={b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBooking(b);
                                }}
                                style={{ left: style.left, width: style.width }}
                                className={`absolute top-1 bottom-1 z-10 rounded-lg px-1.5 py-0.5 shadow-2xs border transition-all cursor-pointer flex flex-col justify-center overflow-hidden active:scale-98 ${
                                  isCompleted
                                    ? 'bg-sky-50/90 border-sky-200 text-sky-800 opacity-75 hover:opacity-100'
                                    : isInProgress
                                    ? 'bg-sky-500 text-white border-sky-600 shadow-sm ring-2 ring-sky-300 animate-pulse'
                                    : 'bg-sky-100/95 border-sky-300 hover:bg-sky-200/90 hover:border-sky-400 text-sky-950 hover:shadow-xs'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-black text-[10px] sm:text-[11px] truncate leading-tight text-sky-950">
                                    {b.customerName}
                                  </span>
                                </div>
                                <div className="text-[8.5px] font-mono font-extrabold flex items-center gap-0.5 mt-0.5 text-sky-900 truncate">
                                  <Clock className="w-2.5 h-2.5 shrink-0 text-sky-700" />
                                  <span>{b.startTime} - {b.endTime}</span>
                                </div>
                              </div>
                            );
                          })}

                          {barberLeaves.map((l) => {
                            const style = fullscreenViewMode === 'fit' ? getItemStylePct(l.startTime, l.endTime) : getItemStyle(l.startTime, l.endTime);
                            return (
                              <div
                                key={l.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLeave(l);
                                }}
                                style={{ left: style.left, width: style.width }}
                                className="absolute top-1 bottom-1 z-10 rounded-lg px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 border border-rose-300 hover:border-rose-400 text-rose-950 shadow-2xs transition-all cursor-pointer flex flex-col justify-center overflow-hidden"
                              >
                                <div className="font-extrabold text-[10px] sm:text-[11px] truncate leading-tight text-rose-900">
                                  {l.details || 'ปิดคิว / พักงาน'}
                                </div>
                                <div className="text-[8.5px] font-mono font-bold flex items-center gap-0.5 mt-0.5 text-rose-800 truncate">
                                  <Clock className="w-2.5 h-2.5 shrink-0" />
                                  <span>{l.startTime} - {l.endTime}</span>
                                </div>
                              </div>
                            );
                          })}

                        </div>
                      </div>
                    );
                  })}

                </div>

              </div>

            </div>
          </div>

        </div>
      )}


      {/* ----------------- MODAL 1: QUICK ADD BOOKING MODAL ----------------- */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-stone-200 overflow-hidden space-y-5 p-6 sm:p-7 relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900 font-extrabold font-serif text-lg">
                <Scissors className="w-5 h-5 text-amber-500" />
                <span>ลงคิวจองด่วนในตาราง</span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/70">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block mb-1">วันที่จอง</label>
                  <input
                    type="text"
                    disabled
                    value={selectedDate}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block mb-1">เวลาเริ่มตัด</label>
                  <input
                    type="time"
                    required
                    value={quickStartTime}
                    onChange={(e) => setQuickStartTime(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-800 focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              {/* Barber Selection */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5">ช่างผู้ให้บริการ</label>
                <select
                  value={quickBarberId}
                  onChange={(e) => setQuickBarberId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="any">✨ ไม่ระบุช่าง (คิวกลาง)</option>
                  {sortedHairdressers.map(h => (
                    <option key={h.id} value={h.id}>💈 ช่าง {h.name}</option>
                  ))}
                </select>
              </div>

              {/* Service Selection */}
              {services.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1.5">เลือกรายการบริการ</label>
                  <select
                    value={quickServiceId}
                    onChange={(e) => setQuickServiceId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="">-- ไม่ระบุบริการ (ใช้วเลามาตรฐาน {slotDuration} นาที) --</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes} นาที {s.price ? `- ฿${s.price}` : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">ชื่อลูกค้า <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณสมชาย"
                    value={quickCustomerName}
                    onChange={(e) => setQuickCustomerName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    placeholder="เช่น 0812345678"
                    value={quickCustomerPhone}
                    onChange={(e) => setQuickCustomerPhone(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="เช่น ทรงวินเทจ, มาพร้อมเพื่อน"
                  value={quickRemarks}
                  onChange={(e) => setQuickRemarks(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Recorder Name */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">ผู้ลงบันทึกคิว</label>
                <input
                  type="text"
                  required
                  value={quickRecordedBy}
                  onChange={(e) => setQuickRecordedBy(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickAdd}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingQuickAdd ? 'กำลังบันทึก...' : '✓ ยืนยันเพิ่มคิวจอง'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}


      {/* ----------------- MODAL 2: BOOKING DETAIL & QUICK UPDATE MODAL ----------------- */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-stone-200 overflow-hidden space-y-5 p-6 relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeStyle(getEffectiveStatus(selectedBooking, currentTime))}`}>
                  {getStatusLabel(getEffectiveStatus(selectedBooking, currentTime))}
                </span>
                <span className="text-xs font-mono font-bold text-stone-500">ID: {selectedBooking.id.substring(0, 6)}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Customer Header */}
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 space-y-1">
                <div className="text-xs text-amber-900 font-extrabold uppercase tracking-tight">ข้อมูลลูกค้า</div>
                <h3 className="text-lg font-bold font-serif text-stone-900">{selectedBooking.customerName}</h3>
                <p className="text-xs font-mono font-semibold text-stone-600 flex items-center gap-1.5 pt-0.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>{selectedBooking.customerPhone || 'ไม่ระบุเบอร์'}</span>
                </p>
              </div>

              {/* Time & Barber Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-0.5">
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase">เวลาคิว</span>
                  <p className="font-mono font-bold text-stone-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{selectedBooking.startTime} - {selectedBooking.endTime}</span>
                  </p>
                </div>

                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-0.5">
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase">ช่างประจำคิว</span>
                  <p className="font-bold text-stone-800 truncate">
                    {hairdressers.find(h => h.id === selectedBooking.hairdresserId)?.name || 'ไม่ระบุช่าง (คิวกลาง)'}
                  </p>
                </div>
              </div>

              {selectedBooking.serviceName && (
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-stone-400 font-extrabold uppercase block">บริการที่เลือก</span>
                    <span className="font-bold text-stone-800">{selectedBooking.serviceName}</span>
                  </div>
                  {selectedBooking.servicePrice !== undefined && (
                    <span className="text-amber-600 font-mono font-bold text-sm">฿{selectedBooking.servicePrice}</span>
                  )}
                </div>
              )}

              {selectedBooking.remarks && (
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs">
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase block">หมายเหตุ</span>
                  <span className="text-stone-700 italic">{selectedBooking.remarks}</span>
                </div>
              )}

              {/* Quick Change Status Buttons */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-extrabold text-stone-500 uppercase block">อัปเดตสถานะคิวจอง</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await onUpdateBooking(selectedBooking.id, { status: 'in-progress' });
                      setSelectedBooking(null);
                    }}
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition-all border border-emerald-300 cursor-pointer"
                  >
                    ✂️ กำลังตัดผม
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await onUpdateBooking(selectedBooking.id, { status: 'completed' });
                      setSelectedBooking(null);
                    }}
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 transition-all border border-blue-300 cursor-pointer"
                  >
                    ✓ ตัดเสร็จแล้ว
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await onUpdateBooking(selectedBooking.id, { status: 'waiting' });
                      setSelectedBooking(null);
                    }}
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 transition-all border border-amber-300 cursor-pointer"
                  >
                    ⏳ รอรับบริการ
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm("ยืนยันยกเลิกคิวจองนี้?")) {
                        await onUpdateBooking(selectedBooking.id, { status: 'cancelled' });
                        setSelectedBooking(null);
                      }
                    }}
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-900 transition-all border border-rose-300 cursor-pointer"
                  >
                    ✕ ยกเลิกคิว
                  </button>
                </div>
              </div>

              {/* Delete Button */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`ยืนยันลบคิวของ ${selectedBooking.customerName} ออกจากระบบ?`)) {
                      await onDeleteBooking(selectedBooking.id);
                      setSelectedBooking(null);
                    }
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบคิวออกจากระบบ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-5 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* ----------------- MODAL 3: LEAVE RECORD DETAIL MODAL ----------------- */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl border border-stone-200 overflow-hidden space-y-4 p-6 relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>รายละเอียดการลางาน / ปิดคิว</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 space-y-1">
                <span className="text-[10px] text-rose-700 font-extrabold uppercase">ชื่อช่าง</span>
                <p className="text-sm font-bold text-stone-900">{selectedLeave.hairdresserName}</p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-0.5">
                <span className="text-[10px] text-stone-400 font-extrabold uppercase">เวลาปิดคิว</span>
                <p className="font-mono font-bold text-stone-800">
                  {selectedLeave.startTime} - {selectedLeave.endTime}
                </p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-0.5">
                <span className="text-[10px] text-stone-400 font-extrabold uppercase">เหตุผล / รายละเอียด</span>
                <p className="font-semibold text-stone-800">{selectedLeave.details || 'ปิดคิวชั่วคราว'}</p>
              </div>

              <div className="text-[10px] text-stone-400 pt-1">
                บันทึกโดย: {selectedLeave.recorder}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 text-right">
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="px-5 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TimetableGrid;

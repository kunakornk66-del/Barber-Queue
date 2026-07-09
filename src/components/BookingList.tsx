/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Booking, Hairdresser } from '../types';
import { Trash2, Phone, Calendar, Clock, User, UserCheck, Search, Sparkles, Pencil, X, Check, AlertCircle } from 'lucide-react';

// Helper to format Time to Thai style: e.g. "09:30" -> "09.30น."
export const formatThaiTime = (timeStr: string) => {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim().replace(' น.', '').replace('น.', '');
  return cleanTime.replace(':', '.') + 'น.';
};

interface BookingListProps {
  bookings: Booking[];
  hairdressers: Hairdresser[];
  onDeleteBooking: (id: string) => void;
  onUpdateBooking: (id: string, updatedData: Partial<Omit<Booking, 'id' | 'createdAt'>>) => void;
  jumpToTab: (index: number) => void;
  currentUser?: any;
  slotDuration?: number;
}

export default function BookingList({
  bookings,
  hairdressers,
  onDeleteBooking,
  onUpdateBooking,
  jumpToTab,
  currentUser,
  slotDuration = 30
}: BookingListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  
  // State for confirm delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setEditDate(booking.date);
    setEditStartTime(booking.startTime);
    setEditEndTime(booking.endTime);
    setEditHairdresserId(booking.hairdresserId);
    setEditCustomerName(booking.customerName);
    setEditCustomerPhone(booking.customerPhone);
    setEditRemarks(booking.remarks || '');
    setEditRecordedBy(booking.recordedBy || '');
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

    // Check overlaps gently
    if (editHairdresserId) {
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
      hairdresserId: editHairdresserId,
      customerName: editCustomerName.trim(),
      customerPhone: editCustomerPhone.trim(),
      remarks: editRemarks.trim(),
      recordedBy: editRecordedBy.trim() || editingBooking.recordedBy
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
      if (selectedDateFilter === 'today') {
        return booking.date === todayStr;
      } else if (selectedDateFilter === 'upcoming') {
        return booking.date > todayStr;
      }

      return true; // 'all'
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

      {/* Control panel: search + date filter pills */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-4 items-stretch justify-between" id="booking-controls">
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
        <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200/30 gap-1 shrink-0" id="date-filter-segments">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                              <h3 className="font-serif font-bold text-stone-900 text-xs sm:text-sm truncate">
                                {hdGroup.hairdresserName}
                              </h3>
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
                            const isConfirming = confirmDeleteId === booking.id;
                            return (
                              <div
                                key={booking.id}
                                id={`booking-card-${booking.id}`}
                                className={`py-3 flex flex-col gap-1.5 transition-all text-xs ${
                                  isConfirming ? 'bg-red-50/75 rounded-2xl border border-red-100 my-1.5 p-3' : ''
                                }`}
                              >
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
                                  </div>

                                  {/* Right side: Phone & Delete action */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {booking.customerPhone && !isConfirming && (
                                      <a
                                        href={`tel:${booking.customerPhone}`}
                                        className="text-[10px] text-stone-500 hover:text-brand font-semibold flex items-center gap-0.5 bg-[#FAF7F2] border border-stone-200/50 px-2 py-0.5 rounded-lg hover:border-brand/35 transition-all"
                                        title={`โทรหา ${booking.customerName}`}
                                      >
                                        <Phone className="w-2.5 h-2.5 text-brand" />
                                        <span className="hidden sm:inline">{booking.customerPhone}</span>
                                      </a>
                                    )}

                                    {!isConfirming && (
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
                                          onClick={() => setConfirmDeleteId(booking.id)}
                                          className="text-stone-350 hover:text-red-600 p-1.5 rounded-lg hover:bg-stone-100 transition-all cursor-pointer shrink-0"
                                          title="ลบคิวจองนี้"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Additional Row for Remarks and Recorder, cleanly aligned */}
                                {!isConfirming && (booking.remarks || booking.recordedBy) && (
                                  <div className="flex items-center justify-between gap-1.5 text-[10px] pl-[84px]">
                                    <div className="min-w-0 flex-1">
                                      {booking.remarks ? (
                                        <span className="text-brand font-medium italic block truncate" title={booking.remarks}>
                                          💡 "{booking.remarks}"
                                        </span>
                                      ) : (
                                        <span className="text-stone-350 italic font-light">ไม่มีหมายเหตุ</span>
                                      )}
                                    </div>
                                    <div className="shrink-0 text-[9px] text-stone-400 bg-stone-50 border border-stone-100 px-1.5 py-0.5 rounded-md">
                                      ช่าง{booking.recordedBy}
                                    </div>
                                  </div>
                                )}

                                {/* Inline Confirmation block */}
                                {isConfirming && (
                                  <div className="mt-1 bg-red-100/60 border border-red-200/70 p-2.5 rounded-xl animate-fade-in flex items-center justify-between gap-2 text-[11px] font-sans" id={`confirm-box-${booking.id}`}>
                                    <span className="font-bold text-red-950 shrink-0">ยกเลิกคิวนี้?</span>
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        id={`cancel-delete-${booking.id}`}
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-850 font-semibold rounded-lg cursor-pointer"
                                      >
                                        ไม่
                                      </button>
                                      <button
                                        type="button"
                                        id={`confirm-delete-${booking.id}`}
                                        onClick={() => {
                                          onDeleteBooking(booking.id);
                                          setConfirmDeleteId(null);
                                        }}
                                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
                                      >
                                        ลบ
                                      </button>
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
                    placeholder="ระบุชื่อลูกค้า"
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
                    placeholder="ตัวอย่าง 0812345678"
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
                  placeholder="เช่น ตัดผมหน้าม้า, คิวเร่งด่วน หรือโกนหนวด"
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
    </div>
  );
}

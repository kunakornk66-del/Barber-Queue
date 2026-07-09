/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Hairdresser, Booking, LeaveRecord } from '../types';
import { Calendar, Clock, User, Phone, FileText, ChevronRight, CheckCircle2, UserCheck, AlertCircle, AlertTriangle, X } from 'lucide-react';

// Helper to format Time to Thai style: e.g. "09:30" -> "09.30น."
export const formatThaiTime = (timeStr: string) => {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim().replace(' น.', '').replace('น.', '');
  return cleanTime.replace(':', '.') + 'น.';
};

// Generate 15-minute intervals for beautiful select dropdown
export const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min of ['00', '15', '30', '45']) {
      const hh = String(hour).padStart(2, '0');
      options.push(`${hh}:${min}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

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
  slotDuration = 30
}: BookingFormProps) {
  // Helper to get local date string YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State fields
  const [date, setDate] = useState(getTodayDateString());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  
  // selectedHairdresserId: null represents "ไม่ระบุช่าง"
  const [selectedHairdresserId, setSelectedHairdresserId] = useState<string | null>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [remarks, setRemarks] = useState('');
  
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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

    // Validate if the selected hairdresser has a partial leave/closure
    if (selectedHairdresserId && leaves && leaves.length > 0) {
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
    if (selectedHairdresserId && bookings && bookings.length > 0) {
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

    // Prepare booking submit
    onAddBooking({
      date,
      startTime,
      endTime,
      hairdresserId: selectedHairdresserId,
      customerName: customerName.trim() || 'ลูกค้าหน้าร้าน (Walk-in)',
      customerPhone: customerPhone.trim() || '-',
      remarks: remarks.trim(),
      recordedBy: activeRecorder
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
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden" id="booking-form-card">
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
            <div className="space-y-1.5">
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
              />
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

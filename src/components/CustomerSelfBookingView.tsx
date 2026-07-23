/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Hairdresser, Booking, LeaveRecord, ShopService } from '../types';

const formatThaiTime = (timeStr: string) => {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim().replace(' น.', '').replace('น.', '');
  return cleanTime.replace(':', '.') + 'น.';
};
import { 
  Scissors, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  AlertCircle, 
  Store, 
  Check, 
  Layers,
  ChevronRight,
  RefreshCw,
  Share2,
  Copy,
  X,
  CreditCard,
  Upload,
  Image as ImageIcon,
  Receipt
} from 'lucide-react';

interface CustomerSelfBookingViewProps {
  shopName: string;
  shopLogoUrl: string;
  shopOpenTime: string;
  shopCloseTime: string;
  shopHolidays: number[];
  slotDuration: number;
  hairdressers: Hairdresser[];
  bookings: Booking[];
  leaves: LeaveRecord[];
  services: ShopService[];
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<void>;
  enableSelfBooking: boolean;
  requirePaymentSlip?: boolean;
  promptPayNumber?: string;
  promptPayName?: string;
  bankName?: string;
  depositAmount?: number;
}

export default function CustomerSelfBookingView({
  shopName,
  shopLogoUrl,
  shopOpenTime,
  shopCloseTime,
  shopHolidays,
  slotDuration = 30,
  hairdressers,
  bookings,
  leaves,
  services,
  onAddBooking,
  enableSelfBooking,
  requirePaymentSlip = false,
  promptPayNumber = '',
  promptPayName = '',
  bankName = '',
  depositAmount = 0
}: CustomerSelfBookingViewProps) {
  const [activeTab, setActiveTab] = useState<'book' | 'timeline'>('book');

  // Booking Form State
  const [selectedService, setSelectedService] = useState<ShopService | null>(() => {
    return services.length > 0 ? services[0] : null;
  });
  
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null); // null = ช่างคนไหนก็ได้
  
  // Date State (YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Payment Slip State
  const [paymentSlipUrl, setPaymentSlipUrl] = useState<string | null>(null);
  const [paymentSlipUploading, setPaymentSlipUploading] = useState<boolean>(false);

  const handleSlipFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('กรุณาเลือกไฟล์รูปภาพสลิปโอนเงินเท่านั้น (JPG, PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('ไฟล์รูปภาพสลิปมีขนาดใหญ่เกินไป (สูงสุด 10MB)');
      return;
    }

    setPaymentSlipUploading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPaymentSlipUrl(dataUrl);
        } else {
          setPaymentSlipUrl(event.target?.result as string);
        }
        setPaymentSlipUploading(false);
      };
      img.onerror = () => {
        setPaymentSlipUrl(event.target?.result as string);
        setPaymentSlipUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMessage('ไม่สามารถอ่านไฟล์ภาพสลิปโอนเงินได้');
      setPaymentSlipUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<Booking | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Sync default service if services prop changes
  useEffect(() => {
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0]);
    }
  }, [services, selectedService]);

  // Reset selected time slot when service, barber, or date changes
  useEffect(() => {
    setSelectedStartTime(null);
  }, [selectedService, selectedBarberId, selectedDate]);

  // Generate 30-minute time slots between shop open and close time
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const [openH, openM] = (shopOpenTime || '10:00').split(':').map(Number);
    const [closeH, closeM] = (shopCloseTime || '21:00').split(':').map(Number);

    let currentMins = openH * 60 + openM;
    const endMins = closeH * 60 + closeM;

    while (currentMins < endMins) {
      const h = Math.floor(currentMins / 60);
      const m = currentMins % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      currentMins += slotDuration;
    }
    return slots;
  };

  const allTimeSlots = generateTimeSlots();

  // Helper to convert HH:MM to total minutes
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Helper to format minutes to HH:MM
  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Calculate required service duration in minutes (default 30 mins if none selected)
  const serviceDuration = selectedService ? selectedService.durationMinutes : 30;

  // Check if chosen date is a shop weekly holiday
  const isSelectedDateHoliday = () => {
    if (!selectedDate) return false;
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay();
    return shopHolidays && shopHolidays.includes(dayOfWeek);
  };

  // Check if a specific barber is available at a given startTime for required serviceDuration
  const checkBarberAvailableForSlot = (barberId: string, startTime: string, durationMins: number) => {
    const startMins = timeToMinutes(startTime);
    const endMins = startMins + durationMins;
    const [closeH, closeM] = (shopCloseTime || '21:00').split(':').map(Number);
    const shopCloseMins = closeH * 60 + closeM;

    // Must finish before shop close time
    if (endMins > shopCloseMins) return false;

    // Check Barber Leave Records for the selected date
    const barberLeaves = leaves.filter(l => l.hairdresserId === barberId && l.date === selectedDate);
    for (const leave of barberLeaves) {
      const lStart = timeToMinutes(leave.startTime);
      const lEnd = timeToMinutes(leave.endTime);
      // Overlap check
      if (startMins < lEnd && endMins > lStart) {
        return false;
      }
    }

    // Check Barber Bookings for the selected date (excluding cancelled)
    const barberBookings = bookings.filter(
      b => b.hairdresserId === barberId && b.date === selectedDate && b.status !== 'cancelled'
    );
    for (const bk of barberBookings) {
      const bStart = timeToMinutes(bk.startTime);
      const bEnd = timeToMinutes(bk.endTime);
      // Overlap check
      if (startMins < bEnd && endMins > bStart) {
        return false;
      }
    }

    return true;
  };

  // Check if a barber is FULL DAY OFF on selectedDate
  const isBarberFullDayOff = (barber: Hairdresser) => {
    if (barber.onLeave) return true;

    const barberLeaves = leaves.filter(l => l.hairdresserId === barber.id && l.date === selectedDate);
    if (barberLeaves.length === 0) return false;

    const [openH, openM] = (shopOpenTime || '10:00').split(':').map(Number);
    const shopOpenMins = openH * 60 + openM;
    const [closeH, closeM] = (shopCloseTime || '21:00').split(':').map(Number);
    const shopCloseMins = closeH * 60 + closeM;

    for (const leave of barberLeaves) {
      const lStart = timeToMinutes(leave.startTime);
      const lEnd = timeToMinutes(leave.endTime);
      // If leave covers full operating hours or whole day
      if (lStart <= shopOpenMins && lEnd >= shopCloseMins) {
        return true;
      }
    }

    return false;
  };

  // Get leave summary info for a barber on selectedDate
  const getBarberLeaveSummary = (barber: Hairdresser) => {
    if (barber.onLeave) return { isFullDay: true, label: 'หยุดงาน' };

    const barberLeaves = leaves.filter(l => l.hairdresserId === barber.id && l.date === selectedDate);
    if (barberLeaves.length === 0) return null;

    if (isBarberFullDayOff(barber)) {
      return { isFullDay: true, label: 'หยุดงานทั้งวัน' };
    }

    const firstLeave = barberLeaves[0];
    const label = `ลาช่วง ${formatThaiTime(firstLeave.startTime)} - ${formatThaiTime(firstLeave.endTime)}`;
    return { isFullDay: false, label, leaves: barberLeaves };
  };

  // Determine if a slot is available
  const isSlotAvailable = (slotTime: string) => {
    if (isSelectedDateHoliday()) return false;

    if (selectedBarberId) {
      // Specific barber chosen
      const barber = hairdressers.find(h => h.id === selectedBarberId);
      if (barber && isBarberFullDayOff(barber)) return false;
      return checkBarberAvailableForSlot(selectedBarberId, slotTime, serviceDuration);
    } else {
      // "ช่างคนไหนก็ได้" (Any Barber) -> Available if AT LEAST ONE active non-full-off barber is free
      const activeBarbers = hairdressers.filter(h => !isBarberFullDayOff(h));
      if (activeBarbers.length === 0) return false;

      return activeBarbers.some(b => checkBarberAvailableForSlot(b.id, slotTime, serviceDuration));
    }
  };

  // Get available barbers for a specific slot time
  const getAvailableBarbersForSlot = (slotTime: string) => {
    const activeBarbers = hairdressers.filter(h => !isBarberFullDayOff(h));
    return activeBarbers.filter(b => checkBarberAvailableForSlot(b.id, slotTime, serviceDuration));
  };

  // Handle Submit Booking
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedService) {
      setErrorMessage('กรุณาเลือกบริการที่ต้องการ');
      return;
    }

    if (!selectedDate) {
      setErrorMessage('กรุณาเลือกวันที่ต้องการจอง');
      return;
    }

    if (isSelectedDateHoliday()) {
      setErrorMessage('วันที่เลือกตรงกับวันหยุดประจำสัปดาห์ของทางร้าน');
      return;
    }

    if (!selectedStartTime) {
      setErrorMessage('กรุณาเลือกรอบเวลาที่ต้องการจอง');
      return;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setErrorMessage('กรุณากรอกชื่อของคุณ');
      return;
    }

    const trimmedPhone = customerPhone.trim();
    if (!trimmedPhone) {
      setErrorMessage('กรุณากรอกเบอร์โทรศัพท์สำหรับติดต่อ');
      return;
    }

    if (requirePaymentSlip && !paymentSlipUrl) {
      setErrorMessage('กรุณาโอนเงินและแนบสลิปโอนเงินก่อนกดบันทึกการจองคิว');
      return;
    }

    // Calculate end time based on service duration
    const startMins = timeToMinutes(selectedStartTime);
    const endMins = startMins + serviceDuration;
    const endTimeStr = minutesToTime(endMins);

    // Determine target barber ID
    let finalBarberId = selectedBarberId;
    let isAny = false;

    if (!finalBarberId) {
      // Randomly assign or pick the first available barber for this slot
      const freeBarbers = getAvailableBarbersForSlot(selectedStartTime);
      if (freeBarbers.length === 0) {
        setErrorMessage('ขออภัย รอบเวลานี้ช่างไม่ว่างแล้ว กรุณาเลือกรอบเวลาอื่น');
        return;
      }
      finalBarberId = freeBarbers[0].id;
      isAny = true;
    } else {
      // Re-verify barber is still available
      if (!checkBarberAvailableForSlot(finalBarberId, selectedStartTime, serviceDuration)) {
        setErrorMessage('ขออภัย ช่างที่คุณเลือกไม่ว่างในรอบเวลานี้ กรุณาเลือกรอบเวลาอื่น');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const newBookingData = {
        date: selectedDate,
        startTime: selectedStartTime,
        endTime: endTimeStr,
        hairdresserId: finalBarberId,
        customerName: trimmedName,
        customerPhone: trimmedPhone,
        remarks: `${selectedService.name}${remarks.trim() ? ` (${remarks.trim()})` : ''}`,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        paymentSlipUrl: paymentSlipUrl || undefined,
        recordedBy: 'ลูกค้าจองเองออนไลน์',
        isAnyBarber: isAny,
        status: 'waiting' as const
      };

      await onAddBooking(newBookingData);

      const createdBooking: Booking = {
        ...newBookingData,
        id: `client-bk-${Date.now()}`,
        createdAt: new Date().toISOString()
      };

      setBookingSuccess(createdBooking);
      setIsSubmitting(false);
    } catch (err) {
      console.error('Customer self booking error:', err);
      setErrorMessage('เกิดข้อผิดพลาดในการส่งข้อมูลจองคิว กรุณาลองใหม่อีกครั้ง');
      setIsSubmitting(false);
    }
  };

  // Format Date String for Header
  const formatThaiLongDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiYear = d.getFullYear() + 543;
    return `${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${thaiYear}`;
  };

  const copyPageLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (!enableSelfBooking) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 rounded-full border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
            <Store className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-black text-stone-900">{shopName}</h1>
            <p className="text-xs text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full font-bold inline-block mt-2">
              🔒 ปิดให้บริการจองคิวออนไลน์ชั่วคราว
            </p>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            ขออภัยในความไม่สะดวก ขณะนี้ทางร้านยังไม่ได้เปิดระบบรับจองคิวออนไลน์ผ่านลิงก์ 
            กรุณาติดต่อสอบถามหรือเดินทางมาหน้าร้านโดยตรง
          </p>
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-left space-y-2">
            <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" /> เวลาทำการหน้าร้าน:
            </p>
            <p className="text-xs text-stone-600 pl-5">
              เปิดบริการ {shopOpenTime || '10:00'} - {shopCloseTime || '21:00'} น.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-stone-900 font-sans pb-16">
      
      {/* Top Branding Header */}
      <header className="bg-stone-950 text-white border-b border-stone-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {shopLogoUrl ? (
              <img
                src={shopLogoUrl}
                alt={shopName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-2xl object-cover border border-amber-500/30 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl text-amber-400 shrink-0">
                💈
              </div>
            )}
            <div>
              <h1 className="text-lg font-serif font-black text-stone-100 tracking-tight leading-tight">
                {shopName}
              </h1>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> ระบบจองคิวออนไลน์สำหรับลูกค้า
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={copyPageLink}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
            title="คัดลอกลิงก์จองคิวของร้าน"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedLink ? 'คัดลอกลิงก์แล้ว' : 'แชร์ลิงก์'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('book');
              setBookingSuccess(null);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'book'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>ลงคิวจองออนไลน์</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>เช็กคิวว่างของช่าง</span>
          </button>
        </div>

        {/* TAB 1: BOOKING FORM OR RECEIPT */}
        {activeTab === 'book' && (
          <>
            {bookingSuccess ? (
              /* Success Confirmation Card Receipt */
              <div className="bg-white rounded-3xl border border-emerald-300 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 animate-fade-in text-center">
                <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-400 rounded-full flex items-center justify-center text-emerald-600 mx-auto animate-bounce shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-black text-stone-900">
                    จองคิวสำเร็จแล้ว! 🎉
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    ขอบคุณที่ใช้บริการจองคิวออนไลน์ของ {shopName}
                  </p>
                </div>

                <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-stone-200 text-left space-y-3 font-sans">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                    <span className="text-xs text-stone-500 font-bold">ชื่อผู้จอง:</span>
                    <span className="text-sm font-extrabold text-stone-900">{bookingSuccess.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                    <span className="text-xs text-stone-500 font-bold">เบอร์โทรศัพท์:</span>
                    <span className="text-xs font-mono font-bold text-stone-800">{bookingSuccess.customerPhone}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                    <span className="text-xs text-stone-500 font-bold">วันที่จอง:</span>
                    <span className="text-xs font-bold text-amber-800">{formatThaiLongDate(bookingSuccess.date)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                    <span className="text-xs text-stone-500 font-bold">รอบเวลา:</span>
                    <span className="text-sm font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {bookingSuccess.startTime} - {bookingSuccess.endTime} น.
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                    <span className="text-xs text-stone-500 font-bold">ช่างตัดผม:</span>
                    <span className="text-xs font-bold text-stone-900">
                      {bookingSuccess.isAnyBarber 
                        ? 'ไม่ระบุช่าง (สุ่มช่างว่างให้)'
                        : (hairdressers.find(h => h.id === bookingSuccess.hairdresserId)?.name || 'ช่างของร้าน')}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-stone-500 font-bold">รายการบริการ:</span>
                    <span className="text-xs font-bold text-stone-800 text-right">{bookingSuccess.remarks}</span>
                  </div>
                </div>

                {/* Polite Punctuality Reminder inside Receipt */}
                <div className="bg-amber-50/90 border border-amber-200/90 p-4 rounded-2xl text-left space-y-1 text-xs text-stone-700">
                  <p className="font-extrabold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>ข้อแนะนำในการเดินทางมารับบริการ</span>
                  </p>
                  <p className="leading-relaxed">
                    กรุณาเดินทางมาถึงร้านล่วงหน้าก่อนเวลานัด <strong>5–10 นาที</strong> หากท่านเดินทางมาล่าช้าเกิน <strong>15 นาที</strong> ทางร้านขออนุญาตสลับคิวให้ลูกค้ารอบถัดไปก่อน เพื่อรักษาเวลาในการให้บริการลูกค้าทุกท่าน ขอขอบพระคุณเป็นอย่างยิ่งค่ะ/ครับ
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingSuccess(null);
                      setSelectedStartTime(null);
                    }}
                    className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-2xl text-xs font-black transition-all shadow-sm cursor-pointer"
                  >
                    ➕ จองคิวเพิ่มอีก
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('timeline')}
                    className="flex-1 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-black transition-all shadow-sm cursor-pointer"
                  >
                    📋 ดูตารางคิวรวม
                  </button>
                </div>
              </div>
            ) : (
              /* Booking Form Container */
              <form onSubmit={handleSubmitBooking} className="space-y-6">

                {/* Polite Late Arrival Policy Banner */}
                <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300/60 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-stone-700 leading-relaxed space-y-1">
                    <p className="font-extrabold text-amber-900 flex items-center gap-1.5">
                      📌 ข้อแนะนำและเงื่อนไขการเข้ารับบริการ:
                    </p>
                    <p>
                      เพื่อความสะดวกและส่งมอบบริการที่ประณีตที่สุดแก่ทุกท่าน กรุณาเดินทางมาถึงร้านก่อนเวลานัดหมายประมาณ <strong>5–10 นาที</strong>
                    </p>
                    <p className="text-[11px] text-stone-600 font-medium">
                      *หากท่านมาล่าช้าเกินกว่าเวลานัดหมายเกิน <strong>15 นาที</strong> ทางร้านขออนุญาตสลับคิวให้ลูกค้ารอบถัดไปก่อน เพื่อรักษามาตรฐานและเวลาให้บริการแก่ลูกค้าทุกท่าน ขอขอบพระคุณในความร่วมมือค่ะ/ครับ
                    </p>
                  </div>
                </div>
                
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* STEP 1: SELECT SERVICE */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black text-xs">
                      1
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">เลือกบริการที่ต้องการ</h2>
                      <p className="text-[11px] text-stone-500">ระบบจะคำนวณระยะเวลาของบริการแต่ละประเภทให้อัตโนมัติ</p>
                    </div>
                  </div>

                  {services.length === 0 ? (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium">
                      บริการทั่วไปของร้าน (30 นาที)
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {services.map((srv) => {
                        const isSelected = selectedService?.id === srv.id;
                        return (
                          <div
                            key={srv.id}
                            onClick={() => setSelectedService(srv)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 active:scale-98 ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                                : 'bg-stone-50/60 hover:bg-stone-50 border-stone-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="text-xs sm:text-sm font-black text-stone-900">{srv.name}</h3>
                                {srv.category && (
                                  <span className="inline-block mt-0.5 text-[9px] font-extrabold px-2 py-0.5 bg-stone-200 text-stone-700 rounded-md uppercase">
                                    {srv.category}
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
                                  <Check className="w-3.5 h-3.5 font-black" />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200/50">
                              <span className="font-mono text-stone-600 font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                {srv.durationMinutes} นาที
                              </span>
                              {srv.price !== undefined && srv.price > 0 && (
                                <span className="font-serif font-black text-amber-900">
                                  ฿{srv.price.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* STEP 2: SELECT BARBER */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black text-xs">
                      2
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">เลือกช่างตัดผม</h2>
                      <p className="text-[11px] text-stone-500">เลือกช่างประจำตัว หรือให้ระบบเลือกช่างที่ว่างให้ทันที</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Any Barber Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedBarberId(null)}
                      className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2 cursor-pointer active:scale-95 ${
                        selectedBarberId === null
                          ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold shadow-sm'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">💈</span>
                        {selectedBarberId === null && <Check className="w-4 h-4 font-black" />}
                      </div>
                      <div>
                        <p className="text-xs font-black">ช่างคนไหนก็ได้</p>
                        <p className={`text-[10px] mt-0.5 ${selectedBarberId === null ? 'text-stone-900' : 'text-stone-500'}`}>
                          (ไม่ระบุช่าง)
                        </p>
                      </div>
                    </button>

                    {/* Barber Cards */}
                    {hairdressers.map((barber) => {
                      const isSelected = selectedBarberId === barber.id;
                      const isFullOff = isBarberFullDayOff(barber);
                      const leaveSummary = getBarberLeaveSummary(barber);
                      const hasPartialLeave = !isFullOff && leaveSummary !== null;

                      return (
                        <button
                          key={barber.id}
                          type="button"
                          disabled={isFullOff}
                          onClick={() => setSelectedBarberId(barber.id)}
                          className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2 cursor-pointer active:scale-95 ${
                            isFullOff
                              ? 'bg-rose-50/80 border-rose-300 text-rose-800 opacity-90 cursor-not-allowed shadow-2xs'
                              : isSelected
                              ? 'bg-stone-900 text-white border-stone-900 font-bold shadow-sm'
                              : hasPartialLeave
                              ? 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-300 text-stone-900 shadow-2xs'
                              : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isFullOff ? 'bg-rose-100 text-rose-700' : isSelected ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-700'
                            }`}>
                              <Scissors className="w-4 h-4" />
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-amber-400 font-black" />}
                            {isFullOff && <X className="w-4 h-4 text-rose-600 font-black" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold truncate">ช่าง{barber.name}</p>
                            <p className={`text-[10px] mt-0.5 font-black ${
                              isFullOff
                                ? 'text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md inline-block'
                                : isSelected
                                ? 'text-stone-300'
                                : hasPartialLeave
                                ? 'text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded-md inline-block'
                                : 'text-emerald-600'
                            }`}>
                              {isFullOff 
                                ? 'หยุดงาน' 
                                : hasPartialLeave 
                                ? `⚠️ ${leaveSummary?.label}` 
                                : 'พร้อมบริการ'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 3: DATE & TIME SLOT SELECTOR */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black text-xs">
                        3
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-stone-900">เลือกวันและเวลารอบที่ว่าง</h2>
                        <p className="text-[11px] text-stone-500">
                          {selectedService ? `ต้องการเวลาต่อเนื่อง ${selectedService.durationMinutes} นาที` : 'เลือกรอบเวลาคิว'}
                        </p>
                      </div>
                    </div>

                    {/* Date Picker Input */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-stone-700 shrink-0">วันที่:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        min={getTodayStr()}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 bg-stone-50 focus:border-amber-500 outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Holiday Warning Notice */}
                  {isSelectedDateHoliday() ? (
                    <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
                      <p className="text-sm font-bold text-rose-800">
                        🚫 วันนี้เป็นวันหยุดประจำสัปดาห์ของทางร้าน
                      </p>
                      <p className="text-xs text-rose-600">
                        กรุณาเปลี่ยนเลือกวันที่อื่นในการลงคิวจอง
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-700">
                          รอบเวลาที่เปิดให้บริการ ({formatThaiLongDate(selectedDate)}):
                        </span>
                        <span className="text-[10px] font-bold text-stone-600">
                          🟢 สีเขียว = ว่างกดจองได้ | 🔴 สีแดง = ไม่ว่าง
                        </span>
                      </div>

                      {/* Time Slots Grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {allTimeSlots.map((slotTime) => {
                          const available = isSlotAvailable(slotTime);
                          const isSelected = selectedStartTime === slotTime;
                          
                          return (
                            <button
                              key={slotTime}
                              type="button"
                              disabled={!available}
                              onClick={() => setSelectedStartTime(slotTime)}
                              className={`py-2.5 px-2 rounded-xl border text-xs font-mono transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-0.5 ${
                                !available
                                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-extrabold cursor-not-allowed shadow-2xs'
                                  : isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300 shadow-md font-black'
                                  : 'bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200 text-emerald-900 font-bold'
                              }`}
                            >
                              <span className="flex items-center justify-center gap-1">
                                {!available && <X className="w-3.5 h-3.5 text-rose-600 shrink-0 stroke-[3]" />}
                                <span className={!available ? 'text-rose-900 font-bold' : ''}>{slotTime} น.</span>
                              </span>
                              <span className={`text-[9px] font-sans font-bold ${isSelected ? 'text-emerald-100' : available ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {isSelected ? 'เลือกแล้ว' : available ? 'ว่าง' : 'ไม่ว่าง'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP 4: CUSTOMER CONTACT DETAILS */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black text-xs">
                      4
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">ข้อมูลผู้จองคิว</h2>
                      <p className="text-[11px] text-stone-500">กรอกข้อมูลติดต่อสำหรับยืนยันคิวจอง</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-amber-600" /> ชื่อของคุณ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น คุณกุลนารี / ช่างปอนด์"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-bold text-stone-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-amber-600" /> เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="เช่น 0812345678"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-mono font-bold text-stone-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">หมายเหตุเพิ่มเติม (ถ้ามี):</label>
                    <input
                      type="text"
                      placeholder="เช่น ต้องการแกะลาย, ผมยาวปานกลาง, หรือต้องการสีน้ำตาลธรรมชาติ"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-stone-900"
                    />
                  </div>
                </div>

                {/* STEP 5: PAYMENT SLIP ATTACHMENT (IF REQUIRED BY SHOP) */}
                {requirePaymentSlip && (
                  <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black text-xs">
                        5
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
                          <CreditCard className="w-4.5 h-4.5 text-amber-600" />
                          <span>{depositAmount && depositAmount > 0 ? 'ชำระเงินมัดจำ / แนบสลิปโอนเงิน' : 'ชำระเงินค่าบริการ / แนบสลิปโอนเงิน'}</span>
                          <span className="text-red-500 text-xs">*</span>
                        </h2>
                        <p className="text-[11px] text-stone-500">
                          {depositAmount && depositAmount > 0 
                            ? 'ทางร้านเปิดระบบชำระเงินมัดจำล่วงหน้าเพื่อยืนยันคิวจอง' 
                            : 'กรุณาโอนเงินตามยอดบริการและแนบสลิปโอนเงินเพื่อยืนยันการจองคิว'}
                        </p>
                      </div>
                    </div>

                    {/* Shop Bank / PromptPay Details */}
                    <div className="bg-amber-50/80 border border-amber-300 p-4 rounded-2xl space-y-3.5 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-extrabold text-amber-950 flex items-center gap-1.5 text-xs sm:text-sm">
                          <Receipt className="w-4 h-4 text-amber-700" /> บัญชีสำหรับโอนเงิน:
                        </span>
                        <span className="text-xs sm:text-sm font-black text-amber-950 bg-amber-200/80 px-3 py-1 rounded-xl border border-amber-300/90 shadow-2xs">
                          🏦 {bankName || 'PromptPay / ธนาคาร'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs bg-white p-4 rounded-2xl border border-amber-200/90 shadow-xs">
                        <div className="sm:col-span-2 pb-2.5 border-b border-stone-100">
                          <span className="text-[11px] text-stone-500 font-extrabold block uppercase tracking-wide">ธนาคาร / ช่องทางชำระเงิน:</span>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm sm:text-base font-black text-amber-900 bg-amber-100/80 px-3 py-1 rounded-xl border border-amber-300/80 inline-block shadow-2xs">
                              🏦 {bankName || 'PromptPay / ธนาคาร'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] text-stone-500 font-extrabold block uppercase tracking-wide">เลขบัญชี / เบอร์ PromptPay:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-sm sm:text-base font-black text-stone-900 select-all bg-stone-100/80 px-2.5 py-1 rounded-xl border border-stone-200">
                              {promptPayNumber || 'ติดต่อทางร้าน'}
                            </span>
                            {promptPayNumber && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(promptPayNumber);
                                  alert('คัดลอกเลขบัญชีเรียบร้อยแล้ว');
                                }}
                                className="p-1.5 hover:bg-stone-100 active:scale-95 rounded-xl text-amber-700 cursor-pointer border border-amber-200 bg-amber-50"
                                title="คัดลอกเลขบัญชี"
                              >
                                <Copy className="w-4 h-4 text-amber-700" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] text-stone-500 font-extrabold block uppercase tracking-wide">ชื่อบัญชีผู้รับโอน:</span>
                          <span className="font-black text-stone-900 text-xs sm:text-sm mt-1 block">
                            {promptPayName || shopName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-amber-200/80 text-xs sm:text-sm">
                        <span className="text-stone-700 font-extrabold">
                          {depositAmount && depositAmount > 0 ? 'ยอดเงินมัดจำชำระ:' : 'ยอดเงินที่ต้องชำระ:'}
                        </span>
                        <span className="font-serif font-black text-emerald-700 text-base sm:text-lg">
                          {depositAmount && depositAmount > 0 
                            ? `฿${depositAmount.toLocaleString()}` 
                            : (selectedService?.price ? `฿${selectedService.price.toLocaleString()} (ตามราคาบริการ)` : 'ตามตกลง')}
                        </span>
                      </div>
                    </div>

                    {/* Upload Slip Box */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                        <ImageIcon className="w-4 h-4 text-amber-600" /> แนบสลิปโอนเงินของคุณ <span className="text-red-500">*</span>
                      </label>

                      {paymentSlipUrl ? (
                        <div className="relative p-3 bg-stone-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={paymentSlipUrl}
                              alt="Payment Slip Preview"
                              className="w-16 h-16 object-cover rounded-xl border border-stone-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-black text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>แนบสลิปเรียบร้อยแล้ว</span>
                              </p>
                              <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                คลิกปุ่มลบเพื่อเลือกสลิปใหม่
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPaymentSlipUrl(null)}
                            className="p-2 hover:bg-rose-100 text-rose-600 rounded-xl transition-all cursor-pointer shrink-0"
                            title="ลบและแนบสลิปใหม่"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-stone-300 hover:border-amber-500 bg-stone-50/70 hover:bg-amber-50/30 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group">
                          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {paymentSlipUploading ? (
                              <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
                            ) : (
                              <Upload className="w-5 h-5 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-stone-800">
                              {paymentSlipUploading ? 'กำลังประมวลผลไฟล์สลิป...' : 'คลิกเพื่อเลือกไฟล์รูปภาพสลิปโอนเงิน'}
                            </p>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              รองรับไฟล์รูปภาพ JPG, PNG (ขนาดไม่เกิน 10MB)
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSlipFileUpload}
                            className="hidden"
                            disabled={paymentSlipUploading}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 6: SUBMIT BUTTON */}
                <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
                    <div>
                      <p className="text-xs text-stone-400 font-bold">สรุปรายละเอียดคิวจอง:</p>
                      <p className="text-sm font-bold text-amber-400 mt-0.5">
                        {selectedService ? selectedService.name : 'ยังไม่ได้เลือกบริการ'} 
                        {selectedStartTime ? ` (${selectedStartTime} น.)` : ''}
                      </p>
                    </div>
                    {selectedService?.price !== undefined && selectedService.price > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400">ราคาประเมิน</span>
                        <p className="text-xl font-serif font-black text-emerald-400">
                          ฿{selectedService.price.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedStartTime}
                    className={`w-full py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 ${
                      isSubmitting || !selectedStartTime
                        ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>กำลังบันทึกคิวจอง...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>ยืนยันกดจองคิวออนไลน์</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}
          </>
        )}

        {/* TAB 2: BARBER TIMELINE / QUEUE SCHEDULE VIEW */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-lg font-serif font-black text-stone-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  ตารางคิวและสถานะช่างประจำวัน
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  ตารางเวลาแสดงรอบจองและช่วงเวลาว่างของช่างแต่ละคนแบบเรียลไทม์
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-stone-700">วันที่:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 bg-stone-50 focus:border-amber-500 outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Barber Schedules Cards */}
            <div className="space-y-4">
              {hairdressers.map((barber) => {
                const isBarberFullOff = isBarberFullDayOff(barber);
                const leaveSummary = getBarberLeaveSummary(barber);
                const hasPartialLeave = !isBarberFullOff && leaveSummary !== null;

                const barberBookings = bookings.filter(
                  b => b.hairdresserId === barber.id && b.date === selectedDate && b.status !== 'cancelled'
                );

                return (
                  <div key={barber.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                          <Scissors className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-stone-900">ช่าง{barber.name}</h3>
                          <p className="text-[10px] text-stone-500">
                            คิวที่ลงไว้วันนี้: <span className="font-bold text-stone-800">{barberBookings.length} คิว</span>
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        isBarberFullOff
                          ? 'bg-rose-100 text-rose-700 border-rose-300'
                          : hasPartialLeave
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        {isBarberFullOff
                          ? 'หยุดงานทั้งวัน'
                          : hasPartialLeave
                          ? leaveSummary?.label
                          : 'เปิดรับคิว'}
                      </span>
                    </div>

                    {/* Timeline Slot Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-200/60">
                      {allTimeSlots.map((slot) => {
                        const isFree = !isBarberFullOff && checkBarberAvailableForSlot(barber.id, slot, slotDuration);
                        const matchedBooking = barberBookings.find(b => {
                          const sM = timeToMinutes(b.startTime);
                          const eM = timeToMinutes(b.endTime);
                          const slotM = timeToMinutes(slot);
                          return slotM >= sM && slotM < eM;
                        });

                        return (
                          <div
                            key={slot}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 border ${
                              isFree
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                            }`}
                          >
                            {!isFree && <X className="w-3 h-3 text-rose-600 shrink-0 stroke-[3]" />}
                            <span className={!isFree ? 'text-rose-900' : ''}>{slot}</span>
                            <span className="text-[8px] font-sans font-bold">
                              {isFree ? 'ว่าง' : 'ไม่ว่าง'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

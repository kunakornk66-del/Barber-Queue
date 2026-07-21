/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Booking, Hairdresser } from '../types';
import { Clock, Volume2, Maximize2, Minimize2, Calendar, Scissors, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatThaiTime } from './BookingList';

interface DisplayViewProps {
  bookings: Booking[];
  hairdressers: Hairdresser[];
  shopName: string;
  shopLogoUrl?: string;
  shopOpenTime?: string;
  shopCloseTime?: string;
}

export default function DisplayView({
  bookings,
  hairdressers,
  shopName,
  shopLogoUrl,
  shopOpenTime = '10:00',
  shopCloseTime = '21:00'
}: DisplayViewProps) {
  // Live time state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [politeSuffix, setPoliteSuffix] = useState<string>('ค่ะ');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real system voices (Thai) dynamically
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voicesList = window.speechSynthesis.getVoices();
        const thaiVoices = voicesList.filter(v => v.lang.toLowerCase().includes('th'));
        setAvailableVoices(thaiVoices);

        if (thaiVoices.length > 0 && !selectedVoiceName) {
          // Look for a known high-quality female or default voice
          const defaultVoice = thaiVoices.find(v => 
            v.name.toLowerCase().includes('narisa') || 
            v.name.toLowerCase().includes('kanya') ||
            v.name.toLowerCase().includes('google')
          ) || thaiVoices[0];
          setSelectedVoiceName(defaultVoice.name);

          // Suggest initial suffix based on voice description
          const nameLower = defaultVoice.name.toLowerCase();
          if (nameLower.includes('pattara') || nameLower.includes('male')) {
            setPoliteSuffix('ครับผม');
          } else {
            setPoliteSuffix('ค่ะ');
          }
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedVoiceName]);

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    const selected = availableVoices.find(v => v.name === voiceName);
    if (selected) {
      const nameLower = selected.name.toLowerCase();
      if (nameLower.includes('pattara') || nameLower.includes('male')) {
        setPoliteSuffix('ครับผม');
      } else {
        setPoliteSuffix('ค่ะ');
      }
    }
  };

  // Format today's date string YYYY-MM-DD
  const getTodayDateString = () => {
    const year = currentTime.getFullYear();
    const month = String(currentTime.getMonth() + 1).padStart(2, '0');
    const day = String(currentTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateString();
  const currentHHMM = currentTime.toTimeString().slice(0, 5); // "HH:MM"

  // Get name of hairdresser
  const getHairdresserName = (id: string | null) => {
    if (id === null) return 'ช่างคนไหนก็ได้';
    const found = hairdressers.find(h => h.id === id);
    return found ? found.name : 'ช่างทั่วไป';
  };

  // 1. Get Today's bookings
  const todayBookings = bookings
    .filter(b => b.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 2. Identify ACTIVE bookings (currently being served)
  // Definition: Today's bookings where startTime <= currentHHMM AND currentHHMM < endTime
  const activeBookings = todayBookings.filter(b => {
    return b.startTime <= currentHHMM && currentHHMM < b.endTime;
  });

  // 3. Identify UPCOMING bookings (next queues)
  // Definition: Today's bookings where startTime > currentHHMM
  const upcomingBookings = todayBookings.filter(b => {
    return b.startTime > currentHHMM;
  });

  // If there are no strictly active bookings based on real time,
  // let's fallback to check if any hairdresser is marked as physically busy at the moment
  const barbersWithActiveCuts = hairdressers.filter(hd => {
    if (hd.busyUntil && hd.busyStart) {
      const busyUntilDate = new Date(hd.busyUntil);
      return busyUntilDate > currentTime;
    }
    return false;
  });

  // Call Customer Voice Announcement using Web Speech API
  const handleCallCustomer = (booking: Booking) => {
    if (!('speechSynthesis' in window)) {
      alert('เบราว์เซอร์นี้ไม่รองรับระบบเสียงพูดเรียกคิว');
      return;
    }

    setSpeakingId(booking.id);
    window.speechSynthesis.cancel(); // Stop any currently speaking speech

    const barberName = getHairdresserName(booking.hairdresserId);
    const customerNameClean = booking.customerName.replace(/[^ก-๙a-zA-Z0-9\s]/g, '');

    // Construct Thai polite speech text with customized suffix
    const suffixText = politeSuffix ? ` ${politeSuffix}` : '';
    const text = `ขอเชิญคุณ ${customerNameClean} รับบริการ ที่ช่อง ช่าง${barberName} ได้เลย${suffixText}`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 0.95; // Slightly slower for crisp clear storefront audio

    // Select the chosen voice engine
    if (availableVoices.length > 0 && selectedVoiceName) {
      const activeVoice = availableVoices.find(v => v.name === selectedVoiceName);
      if (activeVoice) {
        utterance.voice = activeVoice;
      }
    } else {
      const fallbackThai = window.speechSynthesis.getVoices().find(v => v.lang.includes('TH') || v.lang.includes('th'));
      if (fallbackThai) {
        utterance.voice = fallbackThai;
      }
    }

    utterance.onend = () => {
      setSpeakingId(null);
    };

    utterance.onerror = () => {
      setSpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Toggle fullscreen mode safely
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Watch for external fullscreen changes (like ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format date to long Thai format: e.g. "วันอังคารที่ 21 กรกฎาคม พ.ศ. 2569"
  const getThaiDateLongString = () => {
    const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const dayName = thaiDays[currentTime.getDay()];
    const dateNum = currentTime.getDate();
    const monthName = thaiMonths[currentTime.getMonth()];
    const yearThai = currentTime.getFullYear() + 543;
    return `${dayName}ที่ ${dateNum} ${monthName} พ.ศ. ${yearThai}`;
  };

  return (
    <div 
      id="tablet-display-view-container"
      className={`min-h-screen bg-[#FAF6F0] text-stone-900 transition-all font-sans ${
        isFullscreen ? 'p-8 flex flex-col justify-between' : 'p-4 sm:p-6 rounded-3xl border border-stone-200 shadow-sm'
      }`}
    >
      {/* 1. Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-stone-200 pb-6 mb-8" id="display-header">
        {/* Shop Brand & Logo */}
        <div className="flex items-center gap-4.5">
          {shopLogoUrl ? (
            <img 
              src={shopLogoUrl} 
              alt={shopName} 
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover shadow-xs border border-stone-200 bg-white"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-3xl shadow-xs shrink-0">
              💈
            </div>
          )}
          <div className="text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-stone-900 tracking-tight flex items-center gap-2 justify-center md:justify-start">
              <span>{shopName}</span>
              <span className="text-xs bg-brand text-white px-2.5 py-0.5 rounded-full font-sans font-bold">DISPLAY BOARD</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5 flex items-center justify-center md:justify-start gap-1.5">
              <Calendar className="w-4 h-4 text-brand" />
              <span>{getThaiDateLongString()}</span>
            </p>
          </div>
        </div>

        {/* Massive Digital Clock & Utility buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4.5">
          <div className="bg-stone-earth text-[#DBCBB5] px-6 py-3 rounded-2xl border border-stone-850 shadow-md flex items-center gap-3.5 shrink-0">
            <Clock className="w-6 h-6 text-brand animate-pulse" />
            <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest">
              {currentTime.toTimeString().split(' ')[0]}
            </div>
          </div>

          {/* Interactive Tablet controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-stone-100/80 p-2 rounded-2xl border border-stone-200/60 shadow-xs">
            {/* Voice select option */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-stone-500 font-extrabold uppercase px-1">🗣️ เสียงระบบเรียกคิว (Voice Engine)</span>
              <select
                id="display-voice-select"
                value={selectedVoiceName}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-850 outline-none focus:ring-1 focus:ring-brand cursor-pointer"
              >
                {availableVoices.length > 0 ? (
                  availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name.replace('Microsoft', 'MS').replace('Google', 'Google 🇹🇭')}
                    </option>
                  ))
                ) : (
                  <option value="">เสียงภาษาไทยพื้นฐาน</option>
                )}
              </select>
            </div>

            {/* Suffix Select */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-stone-500 font-extrabold uppercase px-1">💬 คำลงท้ายคิว (Polite Suffix)</span>
              <select
                id="display-suffix-select"
                value={politeSuffix}
                onChange={(e) => setPoliteSuffix(e.target.value)}
                className="bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-850 outline-none focus:ring-1 focus:ring-brand cursor-pointer"
              >
                <option value="ค่ะ">ค่ะ (สุภาพผู้หญิง)</option>
                <option value="ครับ">ครับ (สุภาพผู้ชาย)</option>
                <option value="ครับผม">ครับผม (เป็นทางการ)</option>
                <option value="">ไม่มี (ไม่ต้องมีหางเสียง)</option>
              </select>
            </div>

            {/* Toggle Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-stone-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs self-stretch sm:self-end h-[34px] sm:mt-3.5"
              title="สลับโหมดเต็มจอ"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? 'ย่อจอ' : 'เต็มจอ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Content Board - Large Typography Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="display-workspace-grid">
        
        {/* LEFT COLUMN: NOW SERVING (คิวที่กำลังทำขณะนี้) - TAKES 7/12 COLS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b-2 border-stone-300 pb-3">
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 flex items-center gap-2.5">
              <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500"></span>
              </span>
              <span>กำลังให้บริการในขณะนี้ (Now Serving)</span>
            </h2>
            <span className="bg-emerald-100 text-emerald-800 border-2 border-emerald-200 font-black text-sm px-4 py-1.5 rounded-full shrink-0">
              {activeBookings.length} คิว
            </span>
          </div>

          {activeBookings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6" id="active-queues-grid">
              {activeBookings.map((booking) => {
                const isSpeaking = speakingId === booking.id;
                return (
                  <div 
                    key={booking.id}
                    className="relative overflow-hidden bg-white border-2 border-emerald-500/80 rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between gap-6 group"
                  >
                    {/* Glowing highlight ribbon */}
                    <div className="absolute top-0 left-0 w-3.5 h-full bg-emerald-500"></div>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pl-3.5">
                      <div>
                        {/* Queue Slot Time Badge */}
                        <div className="inline-flex items-center gap-2.5 bg-emerald-50 text-emerald-800 border-2 border-emerald-200/80 px-4 py-2 rounded-2xl font-mono text-base sm:text-lg lg:text-xl font-black mb-4.5 shadow-xs">
                          <Clock className="w-5.5 h-5.5 text-emerald-600 animate-pulse" />
                          <span>เวลา {formatThaiTime(booking.startTime)} - {formatThaiTime(booking.endTime)}</span>
                        </div>
                        {/* Customer Name - MASSIVE (optimized for far-distance viewing) */}
                        <h3 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-black text-stone-900 tracking-tight leading-normal break-words max-w-full my-3">
                          {booking.customerName}
                        </h3>
                        {/* Barber / Hairdresser Name */}
                        <div className="flex items-center gap-2.5 text-stone-600 text-lg sm:text-2xl lg:text-3xl font-bold mt-4">
                          <Scissors className="w-6 h-6 lg:w-7 lg:h-7 text-brand shrink-0" />
                          <span>ช่างที่ดูแล:</span>
                          <span className="text-brand font-black font-serif underline decoration-brand/30 underline-offset-4">
                            ช่าง{getHairdresserName(booking.hairdresserId)}
                          </span>
                        </div>
                      </div>

                      {/* Call Voice button */}
                      <button
                        onClick={() => handleCallCustomer(booking)}
                        className={`sm:self-center shrink-0 border rounded-2xl px-5 py-3 text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs ${
                          isSpeaking 
                            ? 'bg-rose-500 border-rose-600 text-white animate-pulse' 
                            : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white hover:shadow-md'
                        }`}
                        title="เรียกคิวลูกค้าเสียงดัง"
                      >
                        <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-bounce' : ''}`} />
                        <span>{isSpeaking ? 'กำลังเรียกคิว...' : 'กดเรียกคิว (Voice)'}</span>
                      </button>
                    </div>

                    {booking.remarks && (
                      <div className="bg-[#FAF8F5] border border-stone-200/60 rounded-2xl p-4.5 pl-5 ml-3.5">
                        <p className="text-xs sm:text-sm text-stone-600 font-medium italic flex gap-1.5">
                          <span>💡</span>
                          <span>หมายเหตุ: "{booking.remarks}"</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-stone-200/90 rounded-3xl p-12 text-center space-y-4 shadow-xs" id="no-active-queues">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                💈
              </div>
              <h3 className="text-xl font-serif font-bold text-stone-700">ไม่มีคิวรับบริการจริงในขณะนี้</h3>
              <p className="text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
                ขณะนี้อยู่ในช่วงว่าง หรือไม่มีลูกค้าลงคิวไว้ในช่วงนาทีนี้ คุณสามารถตรวจสอบรายละเอียดคิวถัดไปได้ทางด้านขวามือ
              </p>
            </div>
          )}

          {/* EXTRA: BARBER LANES FOR TABLET DISPLAY (หน้าจอช่างแต่ละท่าน) */}
          <div className="pt-4 space-y-4">
            <h3 className="text-lg font-serif font-black text-stone-800 border-b border-stone-200/80 pb-2 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-brand" />
              <span>สถานะช่างประจำจุด (Stylist Boards)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hairdressers.filter(h => !h.onLeave).map(hd => {
                const isBusy = hd.busyUntil && hd.busyStart && new Date(hd.busyUntil) > currentTime;
                const isBreak = hd.breakUntil && hd.breakStart && new Date(hd.breakUntil) > currentTime;
                
                // Find current booking for this specific hairdresser
                const hdActiveBooking = activeBookings.find(b => b.hairdresserId === hd.id);
                // Find next booking for this hairdresser
                const hdNextBooking = upcomingBookings.find(b => b.hairdresserId === hd.id);

                return (
                  <div key={hd.id} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-stone-900 text-sm">
                        ช่าง{hd.name}
                      </h4>
                      {isBusy ? (
                        <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-lg animate-pulse">
                          กำลังบริการ
                        </span>
                      ) : isBreak ? (
                        <span className="text-[10px] bg-sky-500 text-white font-bold px-2 py-0.5 rounded-lg">
                          พักเบรก
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-lg">
                          ว่างพร้อมให้บริการ
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center bg-stone-50 p-2 rounded-xl">
                        <span className="text-stone-400 font-bold">คิวตอนนี้:</span>
                        <span className="text-stone-800 font-bold truncate max-w-[120px]">
                          {hdActiveBooking ? hdActiveBooking.customerName : 'ว่าง / ไม่มี'}
                        </span>
                        {hdActiveBooking && (
                          <span className="text-[10px] bg-stone-200 px-1.5 py-0.5 rounded font-mono">
                            {hdActiveBooking.startTime}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center bg-[#FDFBF7] p-2 rounded-xl">
                        <span className="text-stone-400 font-bold">คิวถัดไป:</span>
                        <span className="text-brand font-black truncate max-w-[120px]">
                          {hdNextBooking ? hdNextBooking.customerName : 'ยังไม่มีจอง'}
                        </span>
                        {hdNextBooking && (
                          <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-mono font-bold">
                            {hdNextBooking.startTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: UPCOMING QUEUES (คิวถัดไปที่กำลังรอ) - TAKES 5/12 COLS */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between border-b-2 border-stone-300 pb-3">
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 flex items-center gap-2">
              <ArrowRight className="w-7 h-7 text-brand shrink-0" />
              <span>ลำดับคิวถัดไป (Upcoming Queues)</span>
            </h2>
            <span className="bg-brand text-white font-mono font-black text-sm px-4 py-1.5 rounded-full shrink-0 animate-pulse">
              {upcomingBookings.length} คิว
            </span>
          </div>

          {upcomingBookings.length > 0 ? (
            <div className="space-y-4" id="upcoming-queues-list">
              {upcomingBookings.slice(0, 6).map((booking, index) => {
                return (
                  <div 
                    key={booking.id}
                    className="bg-white border-2 border-stone-200/90 hover:border-brand/45 rounded-3xl p-6 shadow-xs flex items-center justify-between gap-4 transition-all duration-300"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      {/* Queue Number Badge */}
                      <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-850 border-2 border-stone-300 flex items-center justify-center font-serif font-black text-2xl shrink-0 shadow-xs">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        {/* Time slot */}
                        <div className="flex items-center gap-2 text-stone-500 text-sm sm:text-base font-mono font-black">
                          <Clock className="w-4.5 h-4.5 text-brand shrink-0 animate-pulse" />
                          <span>เวลา {formatThaiTime(booking.startTime)} - {formatThaiTime(booking.endTime)}</span>
                        </div>
                        {/* Customer Name - LARGE (optimized for far-distance viewing) */}
                        <h4 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-stone-900 break-words tracking-tight mt-2.5 leading-tight">
                          {booking.customerName}
                        </h4>
                        {/* Preferred Barber */}
                        <p className="text-xs sm:text-base text-stone-600 font-bold mt-2.5 flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-stone-400" />
                          <span>ช่างที่ดูแล: <span className="text-stone-850 font-black">ช่าง{getHairdresserName(booking.hairdresserId)}</span></span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className="text-xs sm:text-sm bg-brand/10 text-brand border-2 border-brand/25 font-black px-4 py-2 rounded-2xl animate-pulse">
                        เตรียมตัว
                      </span>
                    </div>
                  </div>
                );
              })}

              {upcomingBookings.length > 6 && (
                <div className="bg-[#FAF8F5] border border-stone-200 border-dashed rounded-2xl p-4 text-center">
                  <p className="text-xs text-stone-500 font-bold font-sans">
                    และยังมีคิวอื่นอีก {upcomingBookings.length - 6} รายการรอถัดไปในวันนี้...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-stone-200/90 rounded-3xl p-12 text-center space-y-4 shadow-xs" id="no-upcoming-queues">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                📅
              </div>
              <h3 className="text-xl font-serif font-bold text-stone-700">ไม่มีคิวที่รอนัดถัดไปวันนี้</h3>
              <p className="text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
                ยินดีด้วย คิวจองของวันทำงานในวันนี้เสร็จสิ้นหมดแล้ว หรือยังไม่มีลูกค้าลงทะเบียนคิวล่วงหน้าเพิ่มเติมสำหรับวันนี้
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 3. Footer Banner */}
      <div className="mt-12 bg-stone-earth border border-stone-850 p-4.5 rounded-2xl text-center shadow-md flex flex-col sm:flex-row items-center justify-between gap-3" id="display-footer">
        <div className="flex items-center gap-2 text-[#DBCBB5] font-bold text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>ระบบจองคิวออนไลน์ BARBER PRO เชื่อมต่อฐานข้อมูลสดแบบเรียลไทม์</span>
        </div>
        <p className="text-[10px] text-stone-400">
          กรุณามาถึงก่อนเวลาคิวจองอย่างน้อย 5-10 นาที หากมาช้ากว่าเวลา คิวอาจเลื่อนโดยอัตโนมัติ ขอบพระคุณค่ะ/ครับ
        </p>
      </div>

    </div>
  );
}

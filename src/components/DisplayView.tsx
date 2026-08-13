/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Booking, Hairdresser } from '../types';
import { Clock, Volume2, Maximize2, Minimize2, Calendar, Scissors, User, ArrowRight, CheckCircle2, Moon, Sun, RotateCw, Sparkles, Bell, Radio } from 'lucide-react';
import { formatThaiTime } from './BookingList';

// Deterministic Barber Palette for vibrant distinct avatars
const BARBER_PALETTES = [
  { bg: 'bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 border-amber-300' },
  { bg: 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-stone-950 border-emerald-300' },
  { bg: 'bg-gradient-to-tr from-sky-500 to-cyan-400 text-stone-950 border-sky-300' },
  { bg: 'bg-gradient-to-tr from-purple-500 to-indigo-400 text-white border-purple-300' },
  { bg: 'bg-gradient-to-tr from-rose-500 to-pink-400 text-white border-rose-300' },
  { bg: 'bg-gradient-to-tr from-orange-500 to-amber-400 text-stone-950 border-orange-300' },
  { bg: 'bg-gradient-to-tr from-violet-500 to-fuchsia-400 text-white border-violet-300' },
  { bg: 'bg-gradient-to-tr from-teal-500 to-emerald-400 text-stone-950 border-teal-300' },
];

function getBarberPalette(idOrName: string) {
  if (!idOrName) return BARBER_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = idOrName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BARBER_PALETTES.length;
  return BARBER_PALETTES[index];
}

function BarberAvatar({ 
  hairdresser, 
  name, 
  size = 'md' 
}: { 
  hairdresser?: Hairdresser; 
  name: string; 
  size?: 'sm' | 'md' | 'lg' | 'xl' 
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = hairdresser?.avatarUrl;
  const palette = getBarberPalette(hairdresser?.id || name);
  
  const safeName = name || '';
  const cleanName = safeName.replace(/^(ช่าง|นาย|นาง|นางสาว)\s*/, '').trim();
  const initial = (cleanName || safeName || 'ช').charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs border shadow-xs',
    md: 'w-10 h-10 text-sm border-2 shadow-sm',
    lg: 'w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl border-2 shadow-md',
    xl: 'w-16 h-16 sm:w-20 sm:h-20 text-2xl sm:text-3xl border-3 shadow-lg'
  }[size];

  if (avatarUrl && !imgError) {
    return (
      <div className="relative shrink-0 inline-block">
        <img 
          src={avatarUrl} 
          alt={`ช่าง ${name}`} 
          onError={() => setImgError(true)}
          className={`${sizeClasses} rounded-full object-cover border-amber-400/90 bg-stone-800 shadow-md`}
          referrerPolicy="no-referrer"
        />
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-stone-900 rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative shrink-0 inline-block">
      <div 
        className={`${sizeClasses} ${palette.bg} rounded-full flex items-center justify-center font-serif font-black uppercase tracking-wider shrink-0 shadow-md border-white/40 ring-1 ring-black/10`}
        title={`ช่าง ${name}`}
      >
        {initial}
      </div>
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-stone-900 rounded-full" />
    </div>
  );
}

interface DisplayViewProps {
  bookings: Booking[];
  hairdressers: Hairdresser[];
  shopName: string;
  shopLogoUrl?: string;
  shopOpenTime?: string;
  shopCloseTime?: string;
  isCloudOnline?: boolean;
}

export default function DisplayView({
  bookings = [],
  hairdressers = [],
  shopName = 'ร้านตัดผม',
  shopLogoUrl = '',
  shopOpenTime = '10:00',
  shopCloseTime = '21:00',
  isCloudOnline = true
}: DisplayViewProps) {
  // Safe arrays
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeHairdressers = Array.isArray(hairdressers) ? hairdressers : [];

  // Live time state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [politeSuffix, setPoliteSuffix] = useState<string>('ค่ะ');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Recently updated bookings animation state
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<string>>(new Set());
  const prevBookingsRef = useRef<Booking[]>(safeBookings);

  // Theme state for display monitor
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'oled' | 'auto'>('light');
  const [autoCycle, setAutoCycle] = useState<boolean>(false);
  const [cycleTheme, setCycleTheme] = useState<'light' | 'dark' | 'oled'>('oled');

  // Energy saving and eye protection states for TV Display screen
  const [ecoDimLevel, setEcoDimLevel] = useState<number>(0); // 0%, 20%, 40%, 60% dimmer
  const [warmFilter, setWarmFilter] = useState<boolean>(false); // Amber warm filter for eye care
  const [showEnergyModal, setShowEnergyModal] = useState<boolean>(false);

  // Cute Font style state for Queue Display Screen
  const [fontStyle, setFontStyle] = useState<'cute' | 'rounded' | 'modern' | 'itim'>('cute');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Continuous Screen Wake Lock to prevent TV Display / Tablet from sleeping
  useEffect(() => {
    let wakeLockObj: any = null;
    const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
        try {
          wakeLockObj = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn('Screen Wake Lock request notice:', err);
        }
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockObj) {
        wakeLockObj.release().catch(() => {});
      }
    };
  }, []);

  // Track queue updates dynamically to trigger TV animation on newly updated queue items
  useEffect(() => {
    if (!prevBookingsRef.current) {
      prevBookingsRef.current = safeBookings;
      return;
    }

    const prevMap = new Map<string, Booking>((prevBookingsRef.current || []).filter(Boolean).map(b => [b.id, b]));
    const newlyChanged = new Set<string>();

    safeBookings.forEach(b => {
      if (!b || !b.id) return;
      const prev = prevMap.get(b.id);
      if (!prev) {
        // Brand new booking added
        newlyChanged.add(b.id);
      } else if (
        prev.status !== b.status ||
        prev.startTime !== b.startTime ||
        prev.endTime !== b.endTime ||
        prev.hairdresserId !== b.hairdresserId ||
        prev.customerName !== b.customerName
      ) {
        // Updated existing booking
        newlyChanged.add(b.id);
      }
    });

    if (newlyChanged.size > 0) {
      setRecentlyUpdatedIds(prev => new Set([...prev, ...newlyChanged]));

      // Clear the animation highlight badge after 10 seconds
      const clearTimer = setTimeout(() => {
        setRecentlyUpdatedIds(prev => {
          const nextSet = new Set(prev);
          newlyChanged.forEach(id => nextSet.delete(id));
          return nextSet;
        });
      }, 10000);

      prevBookingsRef.current = safeBookings;
      return () => clearTimeout(clearTimer);
    }

    prevBookingsRef.current = safeBookings;
  }, [safeBookings]);

  // Theme auto cycle switcher (toggles between light, dark, and oled every 30 seconds if auto cycle is active)
  useEffect(() => {
    if (themeMode !== 'auto' || !autoCycle) return;
    const interval = setInterval(() => {
      setCycleTheme(prev => (prev === 'light' ? 'dark' : prev === 'dark' ? 'oled' : 'light'));
    }, 30000);
    return () => clearInterval(interval);
  }, [themeMode, autoCycle]);

  // Determine actual active theme state
  const isNightTime = currentTime.getHours() >= 18 || currentTime.getHours() < 7;
  const activeTheme = themeMode === 'auto'
    ? (autoCycle ? cycleTheme : (isNightTime ? 'oled' : 'light'))
    : themeMode;

  const isDark = activeTheme === 'dark' || activeTheme === 'oled';
  const isOled = activeTheme === 'oled';

  // Fetch real system voices (Thai) dynamically with tablet null-safety
  useEffect(() => {
    const updateVoices = () => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
          const voicesList = window.speechSynthesis.getVoices() || [];
          const thaiVoices = voicesList.filter(v => {
            const lang = (v?.lang || '').toLowerCase();
            return lang.includes('th');
          });
          setAvailableVoices(thaiVoices);

          if (thaiVoices.length > 0 && !selectedVoiceName) {
            const defaultVoice = thaiVoices.find(v => {
              const name = (v?.name || '').toLowerCase();
              return name.includes('narisa') || name.includes('kanya') || name.includes('google');
            }) || thaiVoices[0];

            if (defaultVoice && defaultVoice.name) {
              setSelectedVoiceName(defaultVoice.name);
              const nameLower = (defaultVoice.name || '').toLowerCase();
              if (nameLower.includes('pattara') || nameLower.includes('male')) {
                setPoliteSuffix('ครับผม');
              } else {
                setPoliteSuffix('ค่ะ');
              }
            }
          }
        }
      } catch (err) {
        console.warn("Speech synthesis voices notice:", err);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      try {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      } catch (e) {}
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        try {
          window.speechSynthesis.onvoiceschanged = null;
        } catch (e) {}
      }
    };
  }, [selectedVoiceName]);

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    const selected = availableVoices.find(v => v && v.name === voiceName);
    if (selected) {
      const nameLower = (selected.name || '').toLowerCase();
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

  // Get hairdresser object safely
  const getHairdresserObj = (id: string | null) => {
    if (!id) return undefined;
    return safeHairdressers.find(h => h && h.id === id);
  };

  // Get name of hairdresser safely
  const getHairdresserName = (id: string | null) => {
    if (!id) return 'ช่างคนไหนก็ได้';
    const found = safeHairdressers.find(h => h && h.id === id);
    return found && found.name ? found.name : 'ช่างทั่วไป';
  };

  // 1. Get Today's bookings
  const todayBookings = safeBookings
    .filter(b => b && b.date === todayStr)
    .sort((a, b) => (a?.startTime || '').localeCompare(b?.startTime || ''));

  // 2. Identify ACTIVE bookings (currently being served)
  const activeBookings = todayBookings.filter(b => {
    if (!b || !b.startTime || !b.endTime) return false;
    return b.startTime <= currentHHMM && currentHHMM < b.endTime;
  });

  // 3. Identify UPCOMING bookings (next queues)
  const upcomingBookings = todayBookings.filter(b => {
    if (!b || !b.startTime) return false;
    return b.startTime > currentHHMM;
  });

  // Check barbers with active cuts safely
  const barbersWithActiveCuts = safeHairdressers.filter(hd => {
    if (hd && hd.busyUntil && hd.busyStart) {
      try {
        const busyUntilDate = new Date(hd.busyUntil);
        return !isNaN(busyUntilDate.getTime()) && busyUntilDate > currentTime;
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  // Call Customer Voice Announcement safely
  const handleCallCustomer = (booking: Booking) => {
    if (!booking) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) {
      alert('เบราว์เซอร์นี้ไม่รองรับระบบเสียงพูดเรียกคิว');
      return;
    }

    try {
      setSpeakingId(booking.id);
      window.speechSynthesis.cancel(); // Stop any currently speaking speech

      const barberName = getHairdresserName(booking.hairdresserId);
      const customerNameClean = (booking?.customerName || '').replace(/[^ก-๙a-zA-Z0-9\s]/g, '');

      // Construct Thai polite speech text with customized suffix
      const suffixText = politeSuffix ? ` ${politeSuffix}` : '';
      const text = `ขอเชิญคุณ ${customerNameClean} รับบริการ ที่ช่อง ช่าง${barberName} ได้เลย${suffixText}`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 0.95;

      // Select the chosen voice engine safely
      if (availableVoices.length > 0 && selectedVoiceName) {
        const activeVoice = availableVoices.find(v => v && v.name === selectedVoiceName);
        if (activeVoice) {
          utterance.voice = activeVoice;
        }
      } else {
        const rawVoices = window.speechSynthesis.getVoices() || [];
        const fallbackThai = rawVoices.find(v => {
          const lang = (v?.lang || '').toLowerCase();
          return lang.includes('th');
        });
        if (fallbackThai) {
          utterance.voice = fallbackThai;
        }
      }

      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis call error notice:", e);
      setSpeakingId(null);
    }
  };

  // Toggle fullscreen mode safely for all devices (iPads, Tablets, Smart TVs, Desktops)
  const toggleFullscreen = () => {
    try {
      const docEl = document.documentElement as any;
      const doc = document as any;

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(true));
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
          setIsFullscreen(true);
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen();
          setIsFullscreen(true);
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
          setIsFullscreen(true);
        } else {
          setIsFullscreen(!isFullscreen);
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => setIsFullscreen(false));
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
          setIsFullscreen(false);
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
          setIsFullscreen(false);
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
          setIsFullscreen(false);
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (e) {
      console.warn("Fullscreen toggle notice:", e);
      setIsFullscreen(!isFullscreen);
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

    const fontClass = fontStyle === 'cute' 
      ? 'font-cute' 
      : fontStyle === 'rounded' 
        ? 'font-rounded-cute' 
        : fontStyle === 'itim'
          ? 'font-itim-cute'
          : 'font-modern-cute';

  return (
    <div 
      id="tablet-display-view-container"
      className={`relative min-h-screen transition-colors duration-500 ${fontClass} ${
        isOled 
          ? 'bg-black text-amber-300' 
          : isDark 
            ? 'bg-stone-950 text-stone-100' 
            : 'bg-[#FAF6F0] text-stone-900'
      } ${
        isFullscreen 
          ? 'p-6 sm:p-8 flex flex-col justify-between' 
          : `p-4 sm:p-6 rounded-3xl border shadow-sm ${
              isOled 
                ? 'border-stone-900 bg-black' 
                : isDark 
                  ? 'border-stone-800 bg-stone-950' 
                  : 'border-stone-200 bg-[#FAF6F0]'
            }`
      }`}
    >
      {/* Screen Dimmer Overlay for energy saving / night comfort */}
      {ecoDimLevel > 0 && (
        <div 
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
          style={{ backgroundColor: `rgba(0, 0, 0, ${ecoDimLevel / 100})` }}
        />
      )}

      {/* Warm Light Filter Overlay for Eye Protection */}
      {warmFilter && (
        <div 
          className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300 bg-amber-600/10 mix-blend-color-burn"
        />
      )}

      {/* 1. Header Area: Top Bar & Controls Toolbar */}
      <div className="mb-8 space-y-4" id="display-header">
        {/* Top Header Row: Shop Info & Massive Digital Clock */}
        <div className={`flex flex-col lg:flex-row items-center justify-between gap-6 border-b pb-5 transition-colors duration-300 ${
          isOled ? 'border-stone-900' : isDark ? 'border-stone-800' : 'border-stone-200'
        }`}>
          {/* Shop Brand & Logo - TV Big Screen High Definition Showcase */}
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="relative group shrink-0">
              {/* Glowing ambient light behind logo */}
              <div className={`absolute -inset-2 rounded-3xl blur-xl opacity-75 transition-all duration-500 ${
                isOled 
                  ? 'bg-gradient-to-r from-amber-600/40 via-yellow-500/30 to-amber-500/40' 
                  : isDark 
                    ? 'bg-gradient-to-r from-amber-500/30 via-emerald-500/20 to-amber-600/30' 
                    : 'bg-gradient-to-r from-amber-300/40 via-brand/30 to-amber-400/40'
              }`}></div>

              {shopLogoUrl ? (
                <div className={`relative p-1.5 rounded-3xl border-2 shadow-2xl transition-all duration-300 animate-logo-glow ${
                  isOled ? 'bg-black border-amber-400 shadow-amber-500/30' : isDark ? 'bg-stone-900 border-amber-500/60 shadow-amber-500/20' : 'bg-white border-brand/60 shadow-brand/20'
                }`}>
                  <img 
                    src={shopLogoUrl} 
                    alt={shopName} 
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl object-cover"
                  />
                </div>
              ) : (
                <div className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-3xl border-2 flex flex-col items-center justify-center shadow-2xl transition-all duration-300 animate-logo-glow ${
                  isOled
                    ? 'bg-black border-amber-400 text-amber-300 shadow-amber-500/30'
                    : isDark 
                      ? 'bg-gradient-to-br from-stone-900 via-amber-950/60 to-stone-900 border-amber-500/60 text-amber-400 shadow-amber-500/20' 
                      : 'bg-gradient-to-br from-amber-50 via-white to-amber-100 border-brand text-brand shadow-brand/20'
                }`}>
                  <span className="text-4xl sm:text-5xl drop-shadow-md">💈</span>
                  <span className="text-[10px] font-black uppercase tracking-wider mt-1 font-mono">BARBER</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight leading-none ${
                  isOled ? 'text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]' : isDark ? 'text-stone-100 drop-shadow-md' : 'text-stone-900'
                }`}>
                  {shopName}
                </h1>
                <span className={`text-xs px-3.5 py-1 rounded-full font-sans font-extrabold tracking-wider shadow-md animate-pulse ${
                  isOled ? 'bg-amber-400 text-black font-black' : isDark ? 'bg-amber-500 text-stone-950' : 'bg-brand text-white'
                }`}>
                  TV DISPLAY BOARD
                </span>

                {/* Live Real-time Connection Status Indicator Badge */}
                {isCloudOnline ? (
                  <span className="text-[11px] px-3 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center gap-1.5 shadow-xs">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>LIVE SYNC (คลาวด์เชื่อมต่อสด)</span>
                  </span>
                ) : (
                  <span className="text-[11px] px-3 py-0.5 rounded-full font-black bg-stone-500/25 text-stone-300 border border-stone-500/60 flex items-center gap-1.5 shadow-xs">
                    <Radio className="w-3 h-3 text-amber-400" />
                    <span>💾 โหมดออฟไลน์ (ใช้งานข้อมูลท้องถิ่น)</span>
                  </span>
                )}

                {/* Eco Saver Badge when dark or oled or dimmed */}
                {(isDark || ecoDimLevel > 0 || warmFilter) && (
                  <button 
                    onClick={() => setShowEnergyModal(true)}
                    className="text-[11px] px-3 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center gap-1 hover:bg-emerald-500/30 cursor-pointer transition-all"
                    title="ดูข้อมูลโหมดถนอมสายตาและประหยัดพลังงาน"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
                    <span>⚡ ECO TV MODE ({isOled ? 'ประหยัดไฟ 80%' : 'ถนอมสายตา'})</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2.5">
                <p className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${
                  isOled ? 'text-amber-400' : isDark ? 'text-amber-300' : 'text-stone-600'
                }`}>
                  <Calendar className={`w-4 h-4 shrink-0 ${isOled ? 'text-amber-400' : isDark ? 'text-amber-400' : 'text-brand'}`} />
                  <span>{getThaiDateLongString()}</span>
                </p>

                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  isOled ? 'bg-black border-emerald-500/80 text-emerald-300' : isDark ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>ร้านเปิดบริการ ({shopOpenTime} - {shopCloseTime} น.)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Digital Clock Widget */}
          <div className={`px-6 py-3.5 rounded-2xl border shadow-md flex items-center justify-center gap-4 shrink-0 transition-colors duration-300 w-full lg:w-auto ${
            isOled
              ? 'bg-black text-amber-300 border-amber-400 shadow-amber-500/20'
              : isDark 
                ? 'bg-stone-900 text-amber-400 border-amber-500/40 shadow-amber-500/10' 
                : 'bg-stone-earth text-[#DBCBB5] border-stone-850'
          }`}>
            <Clock className={`w-7 h-7 animate-pulse shrink-0 ${isDark ? 'text-amber-400' : 'text-brand'}`} />
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-75">เวลาปัจจุบัน (Current Time)</span>
              <div className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black tracking-widest leading-none mt-0.5">
                {currentTime.toTimeString().split(' ')[0]}
              </div>
            </div>
          </div>
        </div>

        {/* Display Control Toolbar Bar - Enhanced Dark Mode & Eye Care Controls */}
        <div className={`p-3.5 rounded-2xl border shadow-xs transition-colors duration-300 flex flex-wrap items-center justify-between gap-3 ${
          isOled ? 'bg-black border-stone-900' : isDark ? 'bg-stone-900/90 border-stone-800' : 'bg-stone-100/90 border-stone-200/80'
        }`}>
          {/* Left Group: TV Display Dark Mode Switcher & Eco Modes */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Theme Selector with Dark Mode & OLED Power Saver */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-amber-400' : 'text-stone-600'}`}>
                📺 โหมด TV หน้าร้าน:
              </span>
              <div className={`flex items-center p-1 rounded-xl border ${
                isOled ? 'bg-black border-stone-800' : isDark ? 'bg-stone-950 border-stone-800' : 'bg-white border-stone-200'
              }`}>
                {/* Dark Mode - Midnight Stone (Recommended for Shop Display) */}
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    themeMode === 'dark'
                      ? 'bg-stone-800 text-amber-300 border border-amber-500/60 shadow-xs ring-2 ring-amber-500/30'
                      : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="โหมดมืดสีเข้ม (Dark Midnight) - ถนอมสายตา นุ่มนวล"
                >
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                  <span>🌙 โหมดมืด</span>
                </button>

                {/* OLED Pure Black - Energy Saver */}
                <button
                  type="button"
                  onClick={() => setThemeMode('oled')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    themeMode === 'oled'
                      ? 'bg-amber-400 text-black font-black border border-amber-300 shadow-md ring-2 ring-amber-400/50'
                      : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="โหมดดำสนิท OLED - ลดการใช้พลังงานจอภาพสูงสุดถึง 80%"
                >
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                  <span>⚡ OLED ดำสนิท (ประหยัดไฟ)</span>
                </button>

                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    themeMode === 'light'
                      ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-xs'
                      : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="โหมดสว่าง High-Contrast"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span>☀️ สว่าง</span>
                </button>

                {/* Auto Switch */}
                <button
                  type="button"
                  onClick={() => setThemeMode('auto')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    themeMode === 'auto'
                      ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                      : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="สลับโหมดมืดอัตโนมัติตามช่วงเวลาเปิดร้าน"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>อัตโนมัติ</span>
                </button>
              </div>
            </div>

            {/* Auto Cycle Toggle when Auto mode active */}
            {themeMode === 'auto' && (
              <button
                type="button"
                onClick={() => setAutoCycle(!autoCycle)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  autoCycle
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 animate-pulse'
                    : isDark ? 'bg-stone-800 border-stone-700 text-stone-300' : 'bg-white border-stone-200 text-stone-700'
                }`}
                title="เปิด/ปิด การสลับสีเข้ม-สว่างหมุนเวียนอัตโนมัติทุก 30 วินาที"
              >
                <RotateCw className={`w-3.5 h-3.5 ${autoCycle ? 'animate-spin' : ''}`} />
                <span>{autoCycle ? 'วนลูป 30s Active' : 'เปิดวนลูป 30s'}</span>
              </button>
            )}

            {/* Screen Dimmer Control */}
            <div className="flex items-center gap-1.5 border-l pl-3 border-stone-800">
              <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-amber-300' : 'text-stone-600'}`}>
                💡 หรี่แสงจอ:
              </span>
              <select
                value={ecoDimLevel}
                onChange={(e) => setEcoDimLevel(Number(e.target.value))}
                className={`border rounded-xl px-2.5 py-1 text-xs font-extrabold outline-none cursor-pointer ${
                  isOled ? 'bg-black border-amber-400 text-amber-300' : isDark ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-white border-stone-200 text-stone-850'
                }`}
                title="ระดับการหรี่แสงหน้าจอ TV เพื่อถนอมสายตาเวลากลางคืน"
              >
                <option value={0}>0% (ปกติ)</option>
                <option value={20}>20% (นุ่มนวล)</option>
                <option value={40}>40% (ถนอมสายตา)</option>
                <option value={60}>60% (ประหยัดพลังงานขั้นสุด)</option>
              </select>
            </div>

            {/* Warm Light / Eye Care Filter Toggle */}
            <button
              type="button"
              onClick={() => setWarmFilter(!warmFilter)}
              className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                warmFilter 
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400 ring-1 ring-amber-400/50' 
                  : isDark ? 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-200' : 'bg-white border-stone-200 text-stone-600'
              }`}
              title="เปิด/ปิด แผ่นกรองแสงสีฟ้าโทนอุ่น (Eye Care Warm Light)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>{warmFilter ? '👁️ ถนอมสายตา [เปิด]' : '👁️ ถนอมสายตา'}</span>
            </button>
          </div>

          {/* Right Group: Audio & Fullscreen Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Voice select option */}
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                🗣️ เสียง:
              </span>
              <select
                id="display-voice-select"
                value={selectedVoiceName}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className={`border rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${
                  isDark 
                    ? 'bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-400' 
                    : 'bg-white border-stone-200 text-stone-850 focus:border-brand'
                }`}
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
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                💬 หางเสียง:
              </span>
              <select
                id="display-suffix-select"
                value={politeSuffix}
                onChange={(e) => setPoliteSuffix(e.target.value)}
                className={`border rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${
                  isDark 
                    ? 'bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-400' 
                    : 'bg-white border-stone-200 text-stone-850 focus:border-brand'
                }`}
              >
                <option value="ค่ะ">ค่ะ</option>
                <option value="ครับ">ครับ</option>
                <option value="ครับผม">ครับผม</option>
                <option value="">ไม่มี</option>
              </select>
            </div>

            {/* Thai Font Style Select */}
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-amber-300' : 'text-stone-600'}`}>
                ✨ แบบฟอนต์:
              </span>
              <select
                id="display-font-select"
                value={fontStyle}
                onChange={(e) => setFontStyle(e.target.value as 'cute' | 'rounded' | 'modern' | 'itim')}
                className={`border rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${
                  isDark 
                    ? 'bg-stone-800 border-amber-500/50 text-amber-300 focus:border-amber-400' 
                    : 'bg-white border-stone-200 text-stone-850 focus:border-brand'
                }`}
              >
                <option value="cute">✨ Prompt (ตัวใหญ่ คมชัด)</option>
                <option value="rounded">🌸 Mitr (ตัวกลมละมุน)</option>
                <option value="modern">⚡ Kanit (หัวมนเด่นชัด)</option>
                <option value="itim">🎨 Itim (ตัวเขียนลายมือคิ้วท์ๆ)</option>
              </select>
            </div>

            {/* Toggle Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className={`border px-4 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs ${
                isDark
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800'
              }`}
              title="สลับโหมดเต็มจอ"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? 'ย่อจอ' : 'เต็มจอ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Energy Saving & Eye Protection Info Modal */}
      {showEnergyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-stone-100 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 text-xl">
                  ⚡
                </div>
                <div>
                  <h3 className="text-xl font-serif font-black text-amber-300">TV Display Dark Mode & Energy Saver</h3>
                  <p className="text-xs text-stone-400 font-sans">โหมดมืดประหยัดพลังงานและถนอมสายตาหน้าร้าน</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEnergyModal(false)}
                className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-stone-300 leading-relaxed font-sans">
              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span>🌙 โหมดมืด Midnight Stone:</span>
                  <span className="text-emerald-400">ถนอมสายตา 100%</span>
                </div>
                <p className="text-xs text-stone-400">
                  ปรับเฉดสีเข้มโทนสโตน นุ่มนวล ตัดแสงสะท้อนของจอ TV ไม่แยงสายตาพนักงานและลูกค้าที่มองหน้าร้านนานๆ
                </p>
              </div>

              <div className="p-4 bg-stone-950 rounded-2xl border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>⚡ โหมด OLED ดำสนิท (Pure Black):</span>
                  <span className="text-emerald-400">ประหยัดไฟจอภาพสูงสุด 80%</span>
                </div>
                <p className="text-xs text-stone-400">
                  ดับพิกเซลสีดำบนจอ OLED / Smart TV ช่วยลดความร้อน สะสมในตัวเครื่อง ยืดอายุการใช้งานจอภาพ และลดค่าไฟฟ้าหน้าร้าน
                </p>
              </div>

              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span>💡 Screen Dimmer & Eye Filter:</span>
                  <span className="text-emerald-400">ลดแสงสีฟ้า</span>
                </div>
                <p className="text-xs text-stone-400">
                  สามารถเลือกหรี่แสงจอ 20% - 60% หรือเปิดตัวกรองแสงสีฟ้าโทนอุ่น เพื่อความสบายตาเมื่อเปิดทิ้งไว้ตลอด 12 ชั่วโมง
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowEnergyModal(false)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black rounded-2xl shadow-lg transition-all cursor-pointer text-center"
            >
              เข้าใจแล้ว ปิดหน้าต่างนี้
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Content Board - Large Typography Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="display-workspace-grid">
        
        {/* LEFT COLUMN: NOW SERVING (คิวที่กำลังทำขณะนี้) - TAKES 7/12 COLS */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`flex items-center justify-between border-b-2 pb-3 ${
            isDark ? 'border-stone-800' : 'border-stone-300'
          }`}>
            <h2 className={`text-2xl sm:text-3xl font-serif font-black flex items-center gap-2.5 ${
              isDark ? 'text-stone-100' : 'text-stone-900'
            }`}>
              <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500"></span>
              </span>
              <span>กำลังให้บริการในขณะนี้ (Now Serving)</span>
            </h2>
            <span className={`border-2 font-black text-sm px-4 py-1.5 rounded-full shrink-0 ${
              isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}>
              {activeBookings.length} คิว
            </span>
          </div>

          {activeBookings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6" id="active-queues-grid">
              {activeBookings.map((booking) => {
                const isSpeaking = speakingId === booking.id;
                const isRecentlyUpdated = recentlyUpdatedIds.has(booking.id);

                return (
                  <div 
                    key={booking.id}
                    className={`relative overflow-hidden border-2 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-500 flex flex-col justify-between gap-6 group animate-highlight-glow ${
                      isRecentlyUpdated ? 'animate-update-flash ring-4 ring-amber-400 border-amber-400' : ''
                    } ${
                      isDark
                        ? 'bg-stone-900/95 border-emerald-500/90 shadow-emerald-950/50 text-stone-100'
                        : 'bg-white border-emerald-500/80 shadow-emerald-200/60 text-stone-900'
                    }`}
                  >
                    {/* Glowing highlight ribbon */}
                    <div className="absolute top-0 left-0 w-3.5 h-full bg-emerald-500"></div>

                    {/* Recently updated notification floating pill */}
                    {isRecentlyUpdated && (
                      <div className="absolute top-4 right-4 z-20">
                        <span className="px-3.5 py-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white font-black text-xs rounded-full shadow-lg border border-amber-300 animate-bounce flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          <span>✨ อัปเดตคิวเรียบร้อย</span>
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pl-3.5">
                      <div>
                        {/* Queue Slot Time Badge */}
                        <div className={`inline-flex items-center gap-2.5 border-2 px-4 py-2 rounded-2xl font-mono text-base sm:text-lg lg:text-xl font-black mb-4.5 shadow-xs ${
                          isDark
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                        }`}>
                          <Clock className="w-5.5 h-5.5 text-emerald-500 animate-pulse" />
                          <span>เวลา {formatThaiTime(booking.startTime)} - {formatThaiTime(booking.endTime)}</span>
                        </div>
                        {/* Customer Name - MASSIVE (optimized for far-distance viewing) */}
                        <h3 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-black tracking-tight leading-normal break-words max-w-full my-3 ${
                          isDark ? 'text-emerald-300 drop-shadow-md' : 'text-stone-900'
                        }`}>
                          {booking.customerName}
                        </h3>
                        {/* Barber / Hairdresser Name with Profile Avatar */}
                        <div className={`flex items-center gap-3 text-lg sm:text-2xl lg:text-3xl font-bold mt-4 flex-wrap ${
                          isDark ? 'text-stone-300' : 'text-stone-600'
                        }`}>
                          <BarberAvatar 
                            hairdresser={getHairdresserObj(booking.hairdresserId)} 
                            name={getHairdresserName(booking.hairdresserId)} 
                            size="lg" 
                          />
                          <div className="flex items-center gap-2">
                            <Scissors className={`w-6 h-6 lg:w-7 lg:h-7 shrink-0 ${isDark ? 'text-amber-400' : 'text-brand'}`} />
                            <span>ช่างที่ดูแล:</span>
                            <span className={`font-black font-serif underline underline-offset-4 ${
                              isDark ? 'text-amber-400 decoration-amber-400/40' : 'text-brand decoration-brand/30'
                            }`}>
                              ช่าง{getHairdresserName(booking.hairdresserId)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Call Voice button */}
                      <button
                        onClick={() => handleCallCustomer(booking)}
                        className={`sm:self-center shrink-0 border rounded-2xl px-5 py-3 text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs ${
                          isSpeaking 
                            ? 'bg-rose-500 border-rose-600 text-white animate-pulse' 
                            : isDark
                              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-emerald-950/50'
                              : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white hover:shadow-md'
                        }`}
                        title="เรียกคิวลูกค้าเสียงดัง"
                      >
                        <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-bounce' : ''}`} />
                        <span>{isSpeaking ? 'กำลังเรียกคิว...' : 'กดเรียกคิว (Voice)'}</span>
                      </button>
                    </div>

                    {booking.remarks && (
                      <div className={`border rounded-2xl p-4.5 pl-5 ml-3.5 ${
                        isDark ? 'bg-stone-950/80 border-stone-800 text-stone-300' : 'bg-[#FAF8F5] border-stone-200/60 text-stone-600'
                      }`}>
                        <p className="text-xs sm:text-sm font-medium italic flex gap-1.5">
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
            <div className={`border rounded-3xl p-12 text-center space-y-4 shadow-xs ${
              isDark ? 'bg-stone-900/60 border-stone-800 text-stone-200' : 'bg-white border-stone-200/90 text-stone-700'
            }`} id="no-active-queues">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl ${
                isDark ? 'bg-stone-800' : 'bg-stone-100'
              }`}>
                💈
              </div>
              <h3 className={`text-xl font-serif font-bold ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>ไม่มีคิวรับบริการจริงในขณะนี้</h3>
              <p className={`text-sm max-w-sm mx-auto leading-relaxed ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                ขณะนี้อยู่ในช่วงว่าง หรือไม่มีลูกค้าลงคิวไว้ในช่วงนาทีนี้ คุณสามารถตรวจสอบรายละเอียดคิวถัดไปได้ทางด้านขวามือ
              </p>
            </div>
          )}

          {/* EXTRA: BARBER LANES FOR TABLET DISPLAY (หน้าจอช่างแต่ละท่าน) */}
          <div className="pt-4 space-y-4">
            <h3 className={`text-lg font-serif font-black border-b pb-2 flex items-center gap-2 ${
              isDark ? 'text-stone-200 border-stone-800' : 'text-stone-800 border-stone-200/80'
            }`}>
              <Scissors className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-brand'}`} />
              <span>สถานะช่างประจำจุด (Stylist Boards)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {safeHairdressers.filter(h => h && !h.onLeave).map(hd => {
                const isBusy = hd.busyUntil && hd.busyStart && new Date(hd.busyUntil) > currentTime;
                const isBreak = hd.breakUntil && hd.breakStart && new Date(hd.breakUntil) > currentTime;
                
                // Find current booking for this specific hairdresser
                const hdActiveBooking = activeBookings.find(b => b.hairdresserId === hd.id);
                // Find next booking for this hairdresser
                const hdNextBooking = upcomingBookings.find(b => b.hairdresserId === hd.id);

                return (
                  <div key={hd.id} className={`border rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3 ${
                    isDark ? 'bg-stone-900/80 border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-900'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BarberAvatar hairdresser={hd} name={hd.name} size="md" />
                        <h4 className={`font-serif font-bold text-sm sm:text-base truncate ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>
                          ช่าง{hd.name}
                        </h4>
                      </div>
                      {isBusy ? (
                        <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-lg animate-pulse">
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
                      <div className={`flex justify-between items-center p-2 rounded-xl ${
                        isDark ? 'bg-stone-950 text-stone-200' : 'bg-stone-50 text-stone-800'
                      }`}>
                        <span className={isDark ? 'text-stone-400 font-bold' : 'text-stone-400 font-bold'}>คิวตอนนี้:</span>
                        <span className="font-bold truncate max-w-[120px]">
                          {hdActiveBooking ? hdActiveBooking.customerName : 'ว่าง / ไม่มี'}
                        </span>
                        {hdActiveBooking && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isDark ? 'bg-stone-800 text-amber-300' : 'bg-stone-200 text-stone-800'
                          }`}>
                            {hdActiveBooking.startTime}
                          </span>
                        )}
                      </div>
                      <div className={`flex justify-between items-center p-2 rounded-xl ${
                        isDark ? 'bg-stone-950/80 text-stone-200' : 'bg-[#FDFBF7] text-stone-800'
                      }`}>
                        <span className="text-stone-400 font-bold">คิวถัดไป:</span>
                        <span className={`font-black truncate max-w-[120px] ${isDark ? 'text-amber-400' : 'text-brand'}`}>
                          {hdNextBooking ? hdNextBooking.customerName : 'ยังไม่มีจอง'}
                        </span>
                        {hdNextBooking && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-brand/10 text-brand'
                          }`}>
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
          <div className={`flex items-center justify-between border-b-2 pb-3 ${
            isDark ? 'border-stone-800' : 'border-stone-300'
          }`}>
            <h2 className={`text-2xl sm:text-3xl font-serif font-black flex items-center gap-2 ${
              isDark ? 'text-stone-100' : 'text-stone-900'
            }`}>
              <ArrowRight className={`w-7 h-7 shrink-0 ${isDark ? 'text-amber-400' : 'text-brand'}`} />
              <span>ลำดับคิวถัดไป (Upcoming Queues)</span>
            </h2>
            <span className={`font-mono font-black text-sm px-4 py-1.5 rounded-full shrink-0 animate-pulse ${
              isDark ? 'bg-amber-500 text-stone-950 font-black' : 'bg-brand text-white'
            }`}>
              {upcomingBookings.length} คิว
            </span>
          </div>

          {upcomingBookings.length > 0 ? (
            <div className="space-y-4" id="upcoming-queues-list">
              {(upcomingBookings || []).slice(0, 6).map((booking, index) => {
                const isRecentlyUpdated = recentlyUpdatedIds.has(booking.id);

                return (
                  <div 
                    key={booking.id}
                    className={`relative overflow-hidden border-2 rounded-3xl p-6 shadow-md flex items-center justify-between gap-4 transition-all duration-500 ${
                      isRecentlyUpdated ? 'animate-update-flash ring-4 ring-amber-400 border-amber-400' : ''
                    } ${
                      isDark
                        ? 'bg-stone-900/90 border-stone-800 hover:border-amber-500/60 text-stone-100'
                        : 'bg-white border-stone-200/90 hover:border-brand/45 text-stone-900'
                    }`}
                  >
                    {/* Recently updated ribbon badge */}
                    {isRecentlyUpdated && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-rose-500 text-white font-black text-[10px] px-3 py-0.5 rounded-bl-xl shadow-xs flex items-center gap-1 animate-pulse z-10">
                        <Sparkles className="w-3 h-3" />
                        <span>คิวเพิ่งอัปเดต</span>
                      </div>
                    )}

                    <div className="flex items-center gap-5 min-w-0">
                      {/* Queue Number Badge */}
                      <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-serif font-black text-2xl shrink-0 shadow-xs ${
                        isDark
                          ? 'bg-stone-800 text-amber-400 border-stone-700'
                          : 'bg-stone-100 text-stone-850 border-stone-300'
                      }`}>
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        {/* Time slot */}
                        <div className={`flex items-center gap-2 text-sm sm:text-base font-mono font-black ${
                          isDark ? 'text-amber-300' : 'text-stone-500'
                        }`}>
                          <Clock className={`w-4.5 h-4.5 shrink-0 animate-pulse ${isDark ? 'text-amber-400' : 'text-brand'}`} />
                          <span>เวลา {formatThaiTime(booking.startTime)} - {formatThaiTime(booking.endTime)}</span>
                        </div>
                        {/* Customer Name - LARGE (optimized for far-distance viewing) */}
                        <h4 className={`text-2xl sm:text-3xl md:text-4xl font-serif font-black break-words tracking-tight mt-2.5 leading-tight ${
                          isDark ? 'text-stone-100' : 'text-stone-900'
                        }`}>
                          {booking.customerName}
                        </h4>
                        {/* Preferred Barber */}
                        <div className={`text-xs sm:text-base font-bold mt-2.5 flex items-center gap-2.5 ${
                          isDark ? 'text-stone-400' : 'text-stone-600'
                        }`}>
                          <BarberAvatar 
                            hairdresser={getHairdresserObj(booking.hairdresserId)} 
                            name={getHairdresserName(booking.hairdresserId)} 
                            size="sm" 
                          />
                          <p className="flex items-center gap-1.5">
                            <Scissors className="w-4 h-4 text-stone-400 shrink-0" />
                            <span>ช่างที่ดูแล: <span className={`font-black ${isDark ? 'text-stone-200' : 'text-stone-850'}`}>ช่าง{getHairdresserName(booking.hairdresserId)}</span></span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`text-xs sm:text-sm border-2 font-black px-4 py-2 rounded-2xl animate-pulse ${
                        isDark
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-brand/10 text-brand border-brand/25'
                      }`}>
                        เตรียมตัว
                      </span>
                    </div>
                  </div>
                );
              })}

              {upcomingBookings.length > 6 && (
                <div className={`border border-dashed rounded-2xl p-4 text-center ${
                  isDark ? 'bg-stone-900/60 border-stone-800' : 'bg-[#FAF8F5] border-stone-200'
                }`}>
                  <p className={`text-xs font-bold font-sans ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    และยังมีคิวอื่นอีก {upcomingBookings.length - 6} รายการรอถัดไปในวันนี้...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className={`border rounded-3xl p-12 text-center space-y-4 shadow-xs ${
              isDark ? 'bg-stone-900/60 border-stone-800 text-stone-200' : 'bg-white border-stone-200/90 text-stone-700'
            }`} id="no-upcoming-queues">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl ${
                isDark ? 'bg-stone-800' : 'bg-stone-100'
              }`}>
                📅
              </div>
              <h3 className={`text-xl font-serif font-bold ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>ไม่มีคิวที่รอนัดถัดไปวันนี้</h3>
              <p className={`text-sm max-w-sm mx-auto leading-relaxed ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                ยินดีด้วย คิวจองของวันทำงานในวันนี้เสร็จสิ้นหมดแล้ว หรือยังไม่มีลูกค้าลงทะเบียนคิวล่วงหน้าเพิ่มเติมสำหรับวันนี้
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 3. Footer Banner */}
      <div className={`mt-12 border p-4.5 rounded-2xl text-center shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors duration-300 ${
        isDark 
          ? 'bg-stone-900 border-stone-800 text-stone-300' 
          : 'bg-stone-earth border-stone-850 text-[#DBCBB5]'
      }`} id="display-footer">
        <div className="flex items-center gap-2 font-bold text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>ระบบจองคิวออนไลน์ BARBER PRO เชื่อมต่อฐานข้อมูลสดแบบเรียลไทม์</span>
        </div>
        <p className="text-[10px] opacity-80">
          กรุณามาถึงก่อนเวลาคิวจองอย่างน้อย 5-10 นาที หากมาช้ากว่าเวลา คิวอาจเลื่อนโดยอัตโนมัติ ขอบพระคุณค่ะ/ครับ
        </p>
      </div>

    </div>
  );
}

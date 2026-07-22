/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Hairdresser, Booking, LeaveRecord, StaffRecorder } from './types';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import LeaveManager from './components/LeaveManager';
import Settings from './components/Settings';
import DisplayView from './components/DisplayView';
import { Calendar, Users, Settings as SettingsIcon, Scissors, Clock, LogIn, LogOut, CalendarOff, Tv, Copy, Check, ExternalLink, Bell, BellOff, BellRing, Volume2 } from 'lucide-react';

// Import Firebase dependencies
import { db, handleFirestoreError, OperationType } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

// Fallback seed initial hairdressers if Firestore is totally empty
const SEED_HAIRDRESSERS: Hairdresser[] = [
  { id: 'hd-1', name: 'เอ็ม (M)' },
  { id: 'hd-2', name: 'บอล (Ball)' },
  { id: 'hd-3', name: 'เก่ง (Keng)' },
  { id: 'hd-4', name: 'เจี๊ยบ (Jeab)' }
];

const DEFAULT_RECORDERS: StaffRecorder[] = [
  { id: 'rec-1', name: 'เจ้าของร้าน', role: 'เจ้าของร้าน' },
  { id: 'rec-2', name: 'พนักงานต้อนรับ (Reception)', role: 'พนักงานต้อนรับ' }
];

export default function App() {
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [recorders, setRecorders] = useState<StaffRecorder[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]); // 0 = ลงคิว, 1 = รายการจอง, 2 = ปิดคิว/ลางาน, 3 = ตั้งค่า
  const [activeTab, setActiveTab] = useState<number>(0); 
  const [activeRecorder, setActiveRecorder] = useState<string>('');
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; time: string } | null>(null);
  const [shopName, setShopName] = useState<string>('BARBER PRO');
  const [shopLogoUrl, setShopLogoUrl] = useState<string>('');
  const [slotDuration, setSlotDuration] = useState<number>(30); // Default to 30 minutes
  const [shopHolidays, setShopHolidays] = useState<number[]>([]); // Sunday = 0, Monday = 1, etc.
  const [shopOpenTime, setShopOpenTime] = useState<string>('10:00');
  const [shopCloseTime, setShopCloseTime] = useState<string>('21:00');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [copiedDisplayLink, setCopiedDisplayLink] = useState<boolean>(false);
  const [isFullscreenDisplay, setIsFullscreenDisplay] = useState<boolean>(false);
  const [showTvInstructions, setShowTvInstructions] = useState<boolean>(false);

  // Ticking timer for real-time shop status update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic set activeShopEmail with multiple robust URL parser fallbacks (query, hash, and pathnames)
  const [activeShopEmail, setActiveShopEmail] = useState<string | null>(() => {
    // 1. Try URL Query parameters (?shop=xxx or ?branch=xxx or ?new=fresh)
    const urlParams = new URLSearchParams(window.location.search);
    
    // Explicitly check for a fresh new shop setup or portal login URL request
    if (urlParams.get('new') === 'fresh' || urlParams.get('logout') === 'true') {
      localStorage.removeItem('activeShopEmail');
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('new');
        cleanUrl.searchParams.delete('logout');
        window.history.replaceState({}, '', cleanUrl.toString());
      } catch (e) {
        console.warn('URL cleaning warning:', e);
      }
      return null;
    }

    let urlShop = urlParams.get('shop') || urlParams.get('branch');
    
    // 2. Try URL Hash strings (#shop=xxx or #siam-barber)
    if (!urlShop && window.location.hash) {
      const hashClean = window.location.hash.replace(/^#\/?/, ''); // remove prefix # or #/
      const hashParams = new URLSearchParams(hashClean);
      urlShop = hashParams.get('shop') || hashParams.get('branch');
      if (!urlShop && hashClean && !hashClean.includes('=') && !hashClean.includes('&')) {
        urlShop = decodeURIComponent(hashClean);
      }
    }

    // 3. Try Pathname segments (/shop/siam-barber or just /siam-barber)
    if (!urlShop && window.location.pathname && window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        if ((parts[0] === 'shop' || parts[0] === 'branch') && parts[1]) {
          urlShop = decodeURIComponent(parts[1]);
        } else {
          // Verify it's not a static asset name (does not have a dot for file extension)
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('.')) {
            urlShop = decodeURIComponent(lastPart);
          }
        }
      }
    }

    if (urlShop) {
      localStorage.setItem('activeShopEmail', urlShop.trim().toLowerCase());
      return urlShop.trim().toLowerCase();
    }
    
    const saved = localStorage.getItem('activeShopEmail')?.trim().toLowerCase();
    if (saved) {
      return saved;
    }
    // Default to null to show login portal on first visit
    return null;
  });

  // Browser Notification states & permission tracking
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const notificationsEnabledRef = useRef(notificationsEnabled);
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  const hairdressersRef = useRef(hairdressers);
  useEffect(() => {
    hairdressersRef.current = hairdressers;
  }, [hairdressers]);

  const shopNameRef = useRef(shopName);
  useEffect(() => {
    shopNameRef.current = shopName;
  }, [shopName]);

  const shopLogoUrlRef = useRef(shopLogoUrl);
  useEffect(() => {
    shopLogoUrlRef.current = shopLogoUrl;
  }, [shopLogoUrl]);

  const isInitialBookingsLoadRef = useRef(true);

  // Synchronize notification status when active shop email or permission changes
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (activeShopEmail) {
        const saved = localStorage.getItem(`notification_enabled_${activeShopEmail}`);
        if (saved === 'true' && Notification.permission === 'granted') {
          setNotificationsEnabled(true);
        } else {
          setNotificationsEnabled(false);
        }
      }
    }
  }, [activeShopEmail]);

  // Audio chime synthesizer for instant audio feedback on new bookings
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12); // A5
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (e) {
      console.warn('Audio chime notice failed:', e);
    }
  };

  // Auto dismiss in-app activeToast pop-up notification after 4 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const triggerBookingNotification = (booking: Booking) => {
    // 1. Play audio chime feedback
    playChimeSound();

    const barber = hairdressersRef.current.find(h => h.id === booking.hairdresserId);
    const barberName = barber ? barber.name : 'ไม่ระบุ';
    const storeName = shopNameRef.current || 'BARBER PRO';

    // 2. Display live in-app floating banner toast notice
    setActiveToast({
      title: `🔔 มีคิวใหม่เข้ามาสดๆ! - ${storeName}`,
      body: `คุณ${booking.customerName || 'ลูกค้า'} | ช่าง${barberName} | เวลา ${booking.startTime} - ${booking.endTime}น. (${booking.date})`,
      time: 'เมื่อสักครู่'
    });

    // 3. Trigger Browser Pop-up notification if native permission is active
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      notificationsEnabledRef.current
    ) {
      try {
        const title = `🔔 มีคิวใหม่เข้ามา! - ${storeName}`;
        const body = `ลูกค้า: คุณ${booking.customerName || 'ลูกค้า'}\nช่างดูแล: ช่าง${barberName}\nเวลา: ${booking.startTime} - ${booking.endTime}น. (${booking.date})`;
        
        const notification = new Notification(title, {
          body,
          icon: shopLogoUrlRef.current || undefined,
          tag: `booking-${booking.id}`,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto close native popup after 4 seconds
        setTimeout(() => {
          try { notification.close(); } catch (e) {}
        }, 4000);
      } catch (e) {
        console.warn('Browser Notification trigger warning:', e);
      }
    }
  };

  const toggleNotifications = async () => {
    // Unlock Audio Context with chime audio on user click
    playChimeSound();

    if (!notificationsEnabled) {
      setNotificationsEnabled(true);
      if (activeShopEmail) {
        localStorage.setItem(`notification_enabled_${activeShopEmail}`, 'true');
      }

      // Show instant toast confirmation
      setActiveToast({
        title: `🔔 เปิดระบบแจ้งเตือนคิวสำเร็จแล้ว!`,
        body: `ระบบพร้อมส่งเสียง Chime และป้ายแจ้งเตือนสีทองบนหน้าจอทันทีเมื่อมีรายการจองคิวใหม่เข้ามา`,
        time: 'ตอนนี้'
      });

      // Try browser native notification permission if supported
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            const perm = await Notification.requestPermission();
            setNotificationPermission(perm);
          } else {
            setNotificationPermission(Notification.permission);
          }

          if (Notification.permission === 'granted') {
            const n = new Notification(`🔔 เปิดระบบแจ้งเตือนคิว - ${shopName || 'BARBER PRO'}`, {
              body: 'เปิดใช้งานการแจ้งเตือนเบราว์เซอร์สำเร็จ!',
              icon: shopLogoUrl || undefined,
            });
            setTimeout(() => { try { n.close(); } catch (e) {} }, 4000);
          }
        } catch (e) {
          console.warn('Native notification permission warning (expected in sandboxed iframe):', e);
        }
      }
    } else {
      setNotificationsEnabled(false);
      if (activeShopEmail) {
        localStorage.setItem(`notification_enabled_${activeShopEmail}`, 'false');
      }
      setActiveToast({
        title: `🔕 ปิดการแจ้งเตือนคิวแล้ว`,
        body: `ปิดระบบส่งเสียงและป้ายแจ้งเตือนเรียบร้อย`,
        time: 'ตอนนี้'
      });
    }
  };

  const testNotification = () => {
    playChimeSound();
    setActiveToast({
      title: `🔔 [ทดสอบ] เสียงและป้ายแจ้งเตือน - ${shopName || 'BARBER PRO'}`,
      body: 'ระบบสัญญาณเสียง Chime และป้ายแจ้งเตือนบนหน้าจอทำงานสมบูรณ์แบบ!',
      time: 'เมื่อสักครู่'
    });

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(`🔔 [ทดสอบ] แจ้งเตือนคิวร้าน ${shopName || 'BARBER PRO'}`, {
          body: 'ข้อความทดสอบการแจ้งเตือน: เสียงและ Pop-up ทำงานสมบูรณ์แบบ!',
          icon: shopLogoUrl || undefined,
        });
        setTimeout(() => { try { n.close(); } catch (e) {} }, 4000);
      } catch (e) {
        console.warn('Native notification test warning:', e);
      }
    }
  };

  // Admin & Manager states (Always unlocked by default as requested to remove admin mode restrictions completely)
  const isAdmin = true;
  const isManager = true;
  const currentUser = activeShopEmail ? { email: activeShopEmail, displayName: 'ผู้จัดการสาขา' } : null;
  const [adminPin, setAdminPin] = useState<string>('1234');

  // Settings tab dynamic lock (Requires verification every time tab is clicked)
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // Multi-branch state variables
  const [shopSearchEmail, setShopSearchEmail] = useState<string>('');
  const [portalError, setPortalError] = useState<string | null>(null);

  const updateUrlShop = (email: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('shop', email.trim().toLowerCase());
    window.history.replaceState({}, '', url.toString());
  };

  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const getShareUrl = () => {
    let origin = window.location.origin;
    // Automatically patch standard AI Studio dev URLs to map directly to the stable pre-release/shared URL for immediate consumer use
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    return `${origin}/?shop=${encodeURIComponent(activeShopEmail || '')}`;
  };

  const handleCopyLink = () => {
    const shareUrl = getShareUrl();
    const doFallbackCopy = (text: string) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.warn('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
        })
        .catch(() => {
          doFallbackCopy(shareUrl);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
        });
    } else {
      doFallbackCopy(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  // Local Date String (YYYY-MM-DD) helper
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Modern Thai date string formatter for header
  const getThaiLongDate = () => {
    const d = new Date();
    const days = [
      'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
    ];
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const dayName = days[d.getDay()];
    const dateNum = d.getDate();
    const monthName = months[d.getMonth()];
    const thaiYear = d.getFullYear() + 543; // Convert to Buddhist Era
    
    return `${dayName}ที่ ${dateNum} ${monthName} พ.ศ. ${thaiYear}`;
  };

  // Real-time shop open/closed status helper
  const getShopOpenStatus = () => {
    const d = currentTime;
    const currentDay = d.getDay(); // 0 = Sun, 1 = Mon ...
    
    if (shopHolidays && shopHolidays.includes(currentDay)) {
      return {
        isOpen: false,
        statusText: 'ปิดวันหยุดประจำสัปดาห์',
        timeText: 'วันนี้ร้านปิดทำการ',
        badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dotStyle: 'bg-rose-500'
      };
    }

    const nowMins = d.getHours() * 60 + d.getMinutes();
    const [openH, openM] = (shopOpenTime || '10:00').split(':').map(Number);
    const [closeH, closeM] = (shopCloseTime || '21:00').split(':').map(Number);
    
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    const isOpen = nowMins >= openMins && nowMins < closeMins;

    if (isOpen) {
      return {
        isOpen: true,
        statusText: 'เปิดให้บริการสด (OPEN)',
        timeText: `เวลา ${shopOpenTime || '10:00'} - ${shopCloseTime || '21:00'} น.`,
        badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dotStyle: 'bg-emerald-400 animate-ping'
      };
    } else {
      return {
        isOpen: false,
        statusText: 'ปิดให้บริการ (CLOSED)',
        timeText: `เปิดเวลา ${shopOpenTime || '10:00'} - ${shopCloseTime || '21:00'} น.`,
        badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dotStyle: 'bg-amber-400'
      };
    }
  };

  // 1. Real-time Shop Title and PIN configuration from Firestore settings/config
  useEffect(() => {
    if (!activeShopEmail) return;

    // Load from local fallback first
    const localKey = `backup_settings_${activeShopEmail}`;
    const savedLocal = localStorage.getItem(localKey);
    if (savedLocal) {
      try {
        const data = JSON.parse(savedLocal);
        if (data.shopName) setShopName(data.shopName);
        if (data.adminPin) setAdminPin(data.adminPin);
        if (data.shopLogoUrl) setShopLogoUrl(data.shopLogoUrl);
        if (data.slotDuration) setSlotDuration(Number(data.slotDuration));
        if (data.shopHolidays !== undefined) setShopHolidays(data.shopHolidays || []);
        if (data.shopOpenTime) setShopOpenTime(data.shopOpenTime);
        if (data.shopCloseTime) setShopCloseTime(data.shopCloseTime);
      } catch (e) {
        console.warn("Error parsing local settings backup:", e);
      }
    } else {
      setShopName('BARBER PRO');
      setAdminPin('1234');
      setShopLogoUrl('');
      setSlotDuration(30);
      setShopHolidays([]);
      setShopOpenTime('10:00');
      setShopCloseTime('21:00');
    }

    const settingRef = doc(db, 'stores', activeShopEmail, 'settings', 'config');
    const unsubscribe = onSnapshot(settingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data) {
          if (data.shopName) {
            setShopName(data.shopName);
          }
          if (data.adminPin) {
            setAdminPin(data.adminPin);
          } else {
            setAdminPin('1234');
          }
          if (data.shopLogoUrl) {
            setShopLogoUrl(data.shopLogoUrl);
          } else {
            setShopLogoUrl('');
          }
          if (data.slotDuration) {
            setSlotDuration(Number(data.slotDuration));
          } else {
            setSlotDuration(30);
          }
          if (data.shopHolidays !== undefined) {
            setShopHolidays(data.shopHolidays || []);
          } else {
            setShopHolidays([]);
          }
          if (data.shopOpenTime) {
            setShopOpenTime(data.shopOpenTime);
          } else {
            setShopOpenTime('10:00');
          }
          if (data.shopCloseTime) {
            setShopCloseTime(data.shopCloseTime);
          } else {
            setShopCloseTime('21:00');
          }
          localStorage.setItem(localKey, JSON.stringify(data));
          setFirestoreError(null); // Clear errors since connection is live
        }
      } else {
        if (!savedLocal) {
          setShopName('BARBER PRO');
          setAdminPin('1234');
          setShopLogoUrl('');
          setSlotDuration(30);
          setShopHolidays([]);
          setShopOpenTime('10:00');
          setShopCloseTime('21:00');
        }
      }
    }, (error) => {
      console.warn("Loading configuration fallback default BARBER PRO:", error);
    });
    return () => unsubscribe();
  }, [activeShopEmail]);

  // Synchronize browser/tab title, favicon, and apple-touch-icon links dynamically to the store name and logo
  useEffect(() => {
    if (shopName) {
      document.title = `${shopName} | Q Queue Live`;
      // Update Apple Web App Title
      const appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appTitleMeta) {
        appTitleMeta.setAttribute('content', shopName);
      }
    } else {
      document.title = 'Q Queue Live';
    }

    // Dynamic favicon and home-screen apple touch icon updates
    const faviconElement = document.getElementById('dynamic-favicon');
    const touchIconElement = document.getElementById('dynamic-touch-icon');
    
    if (shopLogoUrl) {
      if (faviconElement) {
        faviconElement.setAttribute('href', shopLogoUrl);
        faviconElement.setAttribute('type', 'image/png');
      }
      if (touchIconElement) {
        touchIconElement.setAttribute('href', shopLogoUrl);
      }
    } else {
      // Fallback SVG Barber Pole Emoji
      const defaultIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E💈%3C/text%3E%3C/svg%3E";
      if (faviconElement) {
        faviconElement.setAttribute('href', defaultIcon);
        faviconElement.setAttribute('type', 'image/svg+xml');
      }
      if (touchIconElement) {
        touchIconElement.setAttribute('href', defaultIcon);
      }
    }
  }, [shopName, shopLogoUrl]);

  useEffect(() => {
    setHairdressers([]);
    setBookings([]);
    setLeaves([]);
    setActiveRecorder('');
  }, [activeShopEmail]);

  // Reset settings lock when switching tabs to ensure entering Settings always requests the PIN
  useEffect(() => {
    if (activeTab !== 3) {
      setIsSettingsUnlocked(false);
      setPinInput('');
      setPinError(false);
    }
  }, [activeTab]);

  // 3. Real-time Barbers list from Firestore collection
  useEffect(() => {
    if (!activeShopEmail) return;

    // Load local fallback first
    const localKey = `backup_hairdressers_${activeShopEmail}`;
    const savedLocal = localStorage.getItem(localKey);
    if (savedLocal) {
      try {
        setHairdressers(JSON.parse(savedLocal));
      } catch (e) {
        console.warn("Error parsing local hairdressers backup:", e);
      }
    } else {
      setHairdressers(SEED_HAIRDRESSERS);
    }

    const colRef = collection(db, 'stores', activeShopEmail, 'hairdressers');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      // ONLY trigger bootstrapping if the collection is proven to be completely empty on Firestore
      if (snapshot.empty) {
        console.log("Empty hairdressers collection detected, bootstrapping first-time store defaults...");
        // Seed default hairdressers
        SEED_HAIRDRESSERS.forEach(async (barber) => {
          try {
            await setDoc(doc(db, 'stores', activeShopEmail, 'hairdressers', barber.id), barber);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, `stores/${activeShopEmail}/hairdressers/${barber.id}`, false);
          }
        });
        // Seed default settings config if empty
        const settingRef = doc(db, 'stores', activeShopEmail, 'settings', 'config');
        setDoc(settingRef, { shopName: 'BARBER PRO', adminPin: '1234' }, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.CREATE, `stores/${activeShopEmail}/settings/config`, false);
        });
        return;
      }

      const list: Hairdresser[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Hairdresser);
      });
      setHairdressers(list);
      localStorage.setItem(localKey, JSON.stringify(list));
      setFirestoreError(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `stores/${activeShopEmail}/hairdressers`, false);
      console.warn("Using offline hairdressers backup:", error);
    });
    return () => unsubscribe();
  }, [activeShopEmail]);

  // Real-time Recorders list (Non-barber staff like receptionists or owners) from Firestore
  useEffect(() => {
    if (!activeShopEmail) return;

    const localKey = `backup_recorders_${activeShopEmail}`;
    const seededKey = `recorders_seeded_${activeShopEmail}`;
    const savedLocal = localStorage.getItem(localKey);
    const isSeeded = localStorage.getItem(seededKey) === 'true';

    if (savedLocal) {
      try {
        setRecorders(JSON.parse(savedLocal));
      } catch (e) {
        console.warn("Error parsing local recorders backup:", e);
      }
    } else if (!isSeeded) {
      setRecorders(DEFAULT_RECORDERS);
    }

    const colRef = collection(db, 'stores', activeShopEmail, 'recorders');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        // Only seed default recorders once on fresh store creation
        if (!localStorage.getItem(seededKey)) {
          localStorage.setItem(seededKey, 'true');
          DEFAULT_RECORDERS.forEach(async (rec) => {
            try {
              await setDoc(doc(db, 'stores', activeShopEmail, 'recorders', rec.id), rec);
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, `stores/${activeShopEmail}/recorders/${rec.id}`, false);
            }
          });
          setRecorders(DEFAULT_RECORDERS);
          localStorage.setItem(localKey, JSON.stringify(DEFAULT_RECORDERS));
          return;
        } else {
          setRecorders([]);
          localStorage.setItem(localKey, JSON.stringify([]));
          return;
        }
      }

      localStorage.setItem(seededKey, 'true');
      const list: StaffRecorder[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StaffRecorder);
      });
      setRecorders(list);
      localStorage.setItem(localKey, JSON.stringify(list));
      setFirestoreError(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `stores/${activeShopEmail}/recorders`, false);
    });

    return () => unsubscribe();
  }, [activeShopEmail]);

  const handleAddRecorder = async (name: string, role: string = 'พนักงานต้อนรับ') => {
    if (!activeShopEmail || !name.trim()) return;
    const cleanName = name.trim();
    const id = `rec-${Date.now()}`;
    const newRec: StaffRecorder = { id, name: cleanName, role: role.trim() || 'พนักงาน' };

    // Optimistic update
    setRecorders(prev => {
      const updated = [...prev, newRec];
      localStorage.setItem(`backup_recorders_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'recorders', id), newRec);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `stores/${activeShopEmail}/recorders/${id}`, false);
    }
  };

  const handleDeleteRecorder = async (id: string) => {
    if (!activeShopEmail) return;

    // Optimistic update
    setRecorders(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem(`backup_recorders_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'stores', activeShopEmail, 'recorders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `stores/${activeShopEmail}/recorders/${id}`, false);
    }
  };

  // Keep activeRecorder synchronized with first available option when lists change
  useEffect(() => {
    const allOptions = [
      ...recorders.map(r => r.name),
      ...hairdressers.map(h => h.name)
    ];

    if (allOptions.length > 0) {
      const exists = allOptions.includes(activeRecorder);
      if (!exists) {
        setActiveRecorder(allOptions[0]);
      }
    } else {
      setActiveRecorder('');
    }
  }, [hairdressers, recorders, activeRecorder]);

  // 4. Real-time Bookings list from Firestore collection (Filtered on load for past-day pruning)
  useEffect(() => {
    if (!activeShopEmail) return;

    // Reset initial load flag whenever shop email changes
    isInitialBookingsLoadRef.current = true;

    // Load local fallback first
    const localKey = `backup_bookings_${activeShopEmail}`;
    const savedLocal = localStorage.getItem(localKey);
    if (savedLocal) {
      try {
        setBookings(JSON.parse(savedLocal));
      } catch (e) {
        console.warn("Error parsing local bookings backup:", e);
      }
    }

    const colRef = collection(db, 'stores', activeShopEmail, 'bookings');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      // Check for newly added documents after initial load
      if (!isInitialBookingsLoadRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newBooking = change.doc.data() as Booking;
            const todayStr = getTodayDateString();
            if (newBooking.date >= todayStr) {
              triggerBookingNotification(newBooking);
            }
          }
        });
      } else {
        isInitialBookingsLoadRef.current = false;
      }

      const list: Booking[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Booking);
      });

      // Filter: only keep bookings today onwards (prune history auto)
      const todayStr = getTodayDateString();
      const currentAndUpcoming = list.filter(b => b.date >= todayStr);
      
      setBookings(currentAndUpcoming);
      localStorage.setItem(localKey, JSON.stringify(currentAndUpcoming));
      setFirestoreError(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `stores/${activeShopEmail}/bookings`, false);
      console.warn("Using offline bookings backup:", error);
    });
    return () => unsubscribe();
  }, [activeShopEmail]);

  // 5. Real-time Leaves / Closed Queues list from Firestore collection
  useEffect(() => {
    if (!activeShopEmail) return;

    // Load local fallback first
    const localKey = `backup_leaves_${activeShopEmail}`;
    const savedLocal = localStorage.getItem(localKey);
    if (savedLocal) {
      try {
        setLeaves(JSON.parse(savedLocal));
      } catch (e) {
        console.warn("Error parsing local leaves backup:", e);
      }
    }

    const colRef = collection(db, 'stores', activeShopEmail, 'leaves');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: LeaveRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as LeaveRecord);
      });
      
      // Auto-prune/reset leaves that are in the past
      const todayStr = getTodayDateString();
      const activeLeaves = list.filter(l => l.date >= todayStr);

      // Sort leaves by date and starting time to showcase nicely
      activeLeaves.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
      setLeaves(activeLeaves);
      localStorage.setItem(localKey, JSON.stringify(activeLeaves));
      setFirestoreError(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `stores/${activeShopEmail}/leaves`, false);
      console.warn("Using offline leaves backup:", error);
    });
    return () => unsubscribe();
  }, [activeShopEmail]);

  // 6. Reset hairdresser busy status on new day transition or startup if stale
  useEffect(() => {
    if (!activeShopEmail || hairdressers.length === 0) return;

    const checkAndResetBusyStatus = async () => {
      const todayStr = getTodayDateString();
      const storedDate = localStorage.getItem(`last_checked_date_${activeShopEmail}`);
      const isNewDay = storedDate && storedDate !== todayStr;
      const now = new Date();

      if (isNewDay) {
        console.log("New day detected, resetting all hairdresser busy states...");
        for (const hd of hairdressers) {
          if (hd.busyStart || hd.busyUntil) {
            try {
              const hdRef = doc(db, 'stores', activeShopEmail, 'hairdressers', hd.id);
              await updateDoc(hdRef, {
                busyStart: null,
                busyUntil: null
              });
            } catch (e) {
              console.error(`Error resetting busy state for hairdresser ${hd.id}:`, e);
            }
          }
        }
        localStorage.setItem(`last_checked_date_${activeShopEmail}`, todayStr);
      } else {
        // Check individual hairdressers for stale busy status (older than 60 mins or different day)
        for (const hd of hairdressers) {
          if (!hd.busyStart) continue;
          
          const busyDateStr = hd.busyStart.split('T')[0];
          const elapsedMs = now.getTime() - new Date(hd.busyStart).getTime();
          const isStale = busyDateStr < todayStr || elapsedMs >= 60 * 60 * 1000;

          if (isStale) {
            console.log(`Stale busy status detected for ${hd.name}, resetting...`);
            try {
              const hdRef = doc(db, 'stores', activeShopEmail, 'hairdressers', hd.id);
              await updateDoc(hdRef, {
                busyStart: null,
                busyUntil: null
              });
            } catch (e) {
              console.error(`Error resetting busy state for hairdresser ${hd.id}:`, e);
            }
          }
        }
        
        if (!storedDate) {
          localStorage.setItem(`last_checked_date_${activeShopEmail}`, todayStr);
        }
      }
    };

    // Run immediately on load/change
    checkAndResetBusyStatus();

    // Set up 30-second interval check for day transition and 60-min timeouts
    const intervalId = setInterval(checkAndResetBusyStatus, 30000);

    return () => clearInterval(intervalId);
  }, [activeShopEmail, hairdressers]);

  const handleUpdateAdminPin = async (newPin: string) => {
    if (!activeShopEmail) return;
    const trimmed = newPin.trim();
    if (!trimmed || trimmed.length < 4) {
      alert("⚠️ รหัส PIN ต้องมีอย่างน้อย 4 ตัวเลข");
      return;
    }
    setAdminPin(trimmed);
    const localKey = `backup_settings_${activeShopEmail}`;
    try {
      const data = JSON.parse(localStorage.getItem(localKey) || '{}');
      data.adminPin = trimmed;
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write skipped:", e);
    }

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'settings', 'config'), { adminPin: trimmed }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/settings/config`, false);
    }
  };

  const handleEnterShop = (shopInput: string) => {
    const trimmed = shopInput.trim().toLowerCase();
    if (!trimmed) {
      setPortalError('กรุณากรอกอีเมล Gmail ของคุณ');
      return;
    }
    // Simple robust email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setPortalError('กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบ (เช่น shop.bkk@gmail.com)');
      return;
    }
    
    // Suggest or remind that Gmail is preferred
    if (!trimmed.endsWith('@gmail.com')) {
      // We still allow other emails just in case, but warn or guide them
      console.log("Non-gmail address used, proceeding standardly");
    }

    setPortalError(null);
    setActiveShopEmail(trimmed);
    localStorage.setItem('activeShopEmail', trimmed);
    updateUrlShop(trimmed);
  };

  // Action Handlers
  const handleAddBooking = async (newBookingData: Omit<Booking, 'id' | 'createdAt'>) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์จัดการข้อมูลหรือลงคิวของสาขานี้");
      return;
    }
    const id = `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newBooking: Booking = {
      ...newBookingData,
      id,
      createdAt: new Date().toISOString()
    };

    // Optimistic Update & Local Backup
    setBookings(prev => {
      const updated = [...prev, newBooking];
      localStorage.setItem(`backup_bookings_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'bookings', id), newBooking);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `stores/${activeShopEmail}/bookings/${id}`, false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์จัดการข้อมูลของสาขานี้");
      return;
    }

    // Optimistic Update & Local Backup
    setBookings(prev => {
      const updated = prev.filter(b => b.id !== id);
      localStorage.setItem(`backup_bookings_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'stores', activeShopEmail, 'bookings', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `stores/${activeShopEmail}/bookings/${id}`, false);
    }
  };

  const handleUpdateBooking = async (id: string, updatedData: Partial<Omit<Booking, 'id' | 'createdAt'>>) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์จัดการข้อมูลหรือแก้ไขการจองของสาขานี้");
      return;
    }

    // Optimistic Update & Local Backup
    setBookings(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, ...updatedData } : b);
      localStorage.setItem(`backup_bookings_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'bookings', id), updatedData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/bookings/${id}`, false);
    }
  };

  const handleAddHairdresser = async (name: string) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์จัดการรายชื่อช่างของสาขานี้");
      return;
    }
    const id = `hd-${Date.now()}`;
    const newBarber: Hairdresser = { id, name };

    // Optimistic Update & Local Backup
    setHairdressers(prev => {
      const updated = [...prev, newBarber];
      localStorage.setItem(`backup_hairdressers_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });
    if (!activeRecorder) {
      setActiveRecorder(name);
    }

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'hairdressers', id), newBarber);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `stores/${activeShopEmail}/hairdressers/${id}`, false);
    }
  };

  const handleDeleteHairdresser = async (id: string) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์จัดการรายชื่อช่างของสาขานี้");
      return;
    }

    // Optimistic Update & Local Backup
    setHairdressers(prev => {
      const updated = prev.filter(h => h.id !== id);
      localStorage.setItem(`backup_hairdressers_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'stores', activeShopEmail, 'hairdressers', id));
      
      const deletedBarber = hairdressers.find(h => h.id === id);
      if (deletedBarber && activeRecorder === deletedBarber.name) {
        const remaining = hairdressers.filter(h => h.id !== id);
        if (remaining.length > 0) {
          setActiveRecorder(remaining[0].name);
        } else {
          setActiveRecorder('');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `stores/${activeShopEmail}/hairdressers/${id}`, false);
    }
  };

  const handleToggleHairdresserLeave = async (id: string, currentlyLeave: boolean) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์จัดการสถานะลางานคิวของช่างสาขานี้");
      return;
    }

    // Optimistic Update & Local Backup
    setHairdressers(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, onLeave: !currentlyLeave } : h);
      localStorage.setItem(`backup_hairdressers_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'hairdressers', id), { onLeave: !currentlyLeave }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/hairdressers/${id}`, false);
    }
  };

  const handleAddLeave = async (leaveData: Omit<LeaveRecord, 'id' | 'createdAt'>) => {
    if (!activeShopEmail) return;
    const id = `leave-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord: LeaveRecord = {
      ...leaveData,
      id,
      createdAt: new Date().toISOString()
    };

    // Optimistic Update & Local Backup
    setLeaves(prev => {
      const updated = [...prev, newRecord];
      localStorage.setItem(`backup_leaves_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'leaves', id), newRecord);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `stores/${activeShopEmail}/leaves/${id}`, false);
    }
  };

  const handleUpdateLeave = async (id: string, updatedFields: Partial<LeaveRecord>) => {
    if (!activeShopEmail) return;

    // Optimistic Update & Local Backup
    setLeaves(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, ...updatedFields } : l);
      localStorage.setItem(`backup_leaves_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'leaves', id), updatedFields, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `stores/${activeShopEmail}/leaves/${id}`, false);
    }
  };

  const handleDeleteLeave = async (id: string) => {
    if (!activeShopEmail) return;

    // Optimistic Update & Local Backup
    setLeaves(prev => {
      const updated = prev.filter(l => l.id !== id);
      localStorage.setItem(`backup_leaves_${activeShopEmail}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'stores', activeShopEmail, 'leaves', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `stores/${activeShopEmail}/leaves/${id}`, false);
    }
  };

  const handleUpdateShopName = async (name: string) => {
    if (!activeShopEmail) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์เข้าแก้ไขชื่อร้านของสาขานี้");
      return;
    }

    setShopName(trimmed);
    const localKey = `backup_settings_${activeShopEmail}`;
    try {
      const data = JSON.parse(localStorage.getItem(localKey) || '{}');
      data.shopName = trimmed;
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write skipped:", e);
    }

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'settings', 'config'), { shopName: trimmed }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/settings/config`, false);
    }
  };

  const handleUpdateShopLogo = async (logoUrl: string) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์เข้าแก้ไขโลโก้ของสาขานี้");
      return;
    }

    setShopLogoUrl(logoUrl.trim());
    const localKey = `backup_settings_${activeShopEmail}`;
    try {
      const data = JSON.parse(localStorage.getItem(localKey) || '{}');
      data.shopLogoUrl = logoUrl.trim();
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write skipped:", e);
    }

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'settings', 'config'), { shopLogoUrl: logoUrl.trim() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/settings/config`, false);
    }
  };

  const handleUpdateSlotDuration = async (duration: number) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์เข้าตั้งค่าระยะเวลาคิวของสาขานี้");
      return;
    }

    setSlotDuration(duration);
    const localKey = `backup_settings_${activeShopEmail}`;
    try {
      const data = JSON.parse(localStorage.getItem(localKey) || '{}');
      data.slotDuration = duration;
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write skipped:", e);
    }

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'settings', 'config'), { slotDuration: duration }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/settings/config`, false);
    }
  };

  const handleUpdateShopHolidays = async (holidays: number[]) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์เข้าตั้งค่าวันหยุดร้านของสาขานี้");
      return;
    }

    setShopHolidays(holidays);
    const localKey = `backup_settings_${activeShopEmail}`;
    try {
      const data = JSON.parse(localStorage.getItem(localKey) || '{}');
      data.shopHolidays = holidays;
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write skipped:", e);
    }

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'settings', 'config'), { shopHolidays: holidays }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/settings/config`, false);
    }
  };

  const handleUpdateShopOpenTime = async (openTime: string) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์เข้าตั้งค่าเวลาเปิดทำการของสาขานี้");
      return;
    }

    setShopOpenTime(openTime);
    const localKey = `backup_settings_${activeShopEmail}`;
    try {
      const data = JSON.parse(localStorage.getItem(localKey) || '{}');
      data.shopOpenTime = openTime;
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write skipped:", e);
    }

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'settings', 'config'), { shopOpenTime: openTime }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/settings/config`, false);
    }
  };

  const handleUpdateShopCloseTime = async (closeTime: string) => {
    if (!activeShopEmail) return;
    if (!isManager) {
      alert("⚠️ สิทธิ์ปฏิเสธ: คุณไม่มีสิทธิ์เข้าตั้งค่าเวลาปิดทำการของสาขานี้");
      return;
    }

    setShopCloseTime(closeTime);
    const localKey = `backup_settings_${activeShopEmail}`;
    try {
      const data = JSON.parse(localStorage.getItem(localKey) || '{}');
      data.shopCloseTime = closeTime;
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write skipped:", e);
    }

    try {
      await setDoc(doc(db, 'stores', activeShopEmail, 'settings', 'config'), { shopCloseTime: closeTime }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${activeShopEmail}/settings/config`, false);
    }
  };

  if (!activeShopEmail) {
    return (
      <div className="min-h-screen bg-[#0B1325] font-sans text-stone-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" id="portal-container">
        {/* Decorative background stripes */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-brand"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand/5 blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand/5 blur-3xl"></div>

        <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-stone-200 relative z-10 animate-fade-in">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-brand/5 flex items-center justify-center border border-brand/20 mb-4 shadow-inner">
              <Scissors className="w-8 h-8 text-brand animate-[bounce_3s_infinite]" />
            </div>
            <h2 className="text-3xl font-serif font-bold tracking-tight text-stone-900">Barber Queue Live</h2>
            <p className="mt-2.5 text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              ระบบศูนย์บัญชาการคิวตัดผมอัจฉริยะ สาขาแยกโดยสมบูรณ์ผ่านระเบียนคลาวด์ พร้อมล้างข้อมูลประวัติวันก่อนหน้าอัตโนมัติ
            </p>
          </div>

          <div className="mt-8 space-y-6">
            
            {/* Direct Shop Login Box */}
            <div className="space-y-4 bg-stone-50/80 p-6 rounded-2xl border border-stone-200/60 shadow-inner">
              <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 justify-center">
                <Users className="w-4 h-4 text-brand" /> 🔑 เข้าสู่ระบบด้วย Gmail ของแต่ละร้าน
              </h3>
              <p className="text-[11px] text-stone-600 leading-relaxed text-center">
                ระบุอีเมล Gmail ของร้านคุณเพื่อเข้าจัดการระบบ (หากเป็นร้านใหม่ ระบบจะเริ่มสร้างข้อมูลใหม่ให้ทันที, รหัส PIN เข้าหน้าตั้งค่าเริ่มต้นคือ <b>1234</b>)
              </p>
              
              <div className="flex gap-2">
                <input
                  type="email"
                  id="search-shop-input"
                  placeholder="ตัวอย่างเช่น shop.bkk@gmail.com"
                  value={shopSearchEmail}
                  onChange={(e) => setShopSearchEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEnterShop(shopSearchEmail);
                    }
                  }}
                  className="flex-1 text-xs px-3.5 py-3 rounded-xl border border-stone-205 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-white placeholder:text-stone-350"
                />
                <button
                  type="button"
                  id="enter-shop-btn"
                  onClick={() => handleEnterShop(shopSearchEmail)}
                  className="bg-brand hover:bg-brand-dark text-white px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer active:scale-95"
                >
                  เริ่มใช้งาน
                </button>
              </div>
              {portalError && <p className="text-[10px] text-red-500 font-medium text-center">{portalError}</p>}
            </div>

            {/* Quick Tutorial Footer */}
            <div className="text-center text-[11px] text-stone-400 max-w-xs mx-auto space-y-1">
              <p>💡 ข้อมูลของแต่ละอีเมลร้านจะแยกจากกันอย่างเด็ดขาด 100%</p>
              <p>สามารถคัดลอกลิงก์แชร์สาขาด้านในเพื่อให้ลูกค้าเข้ามาดูคิวสดได้ทันที</p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  const isDisplayOnly = 
    new URLSearchParams(window.location.search).get('view') === 'display' || 
    window.location.hash.includes('view=display') ||
    window.location.hash.includes('display') ||
    isFullscreenDisplay;

  if (activeShopEmail && isDisplayOnly) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] antialiased relative" id="display-only-container">
        {isDisplayOnly && (
          <button
            type="button"
            onClick={() => {
              setIsFullscreenDisplay(false);
              // Clear search query params and hash if present
              if (window.location.search.includes('view=display') || window.location.hash.includes('display')) {
                const url = new URL(window.location.href);
                url.searchParams.delete('view');
                // Keep the shop param if it exists
                const shopEmail = url.searchParams.get('shop');
                window.location.href = window.location.origin + window.location.pathname + (shopEmail ? `?shop=${encodeURIComponent(shopEmail)}` : '');
              }
            }}
            className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-2xl flex items-center gap-2 cursor-pointer active:scale-95 text-xs ring-2 ring-white/10 hover:bg-stone-800 animate-bounce"
          >
            <span>⬅️ ออกจากโหมดเต็มจอ (กลับหน้าหลัก)</span>
          </button>
        )}
        <DisplayView
          bookings={bookings}
          hairdressers={hairdressers}
          shopName={shopName}
          shopLogoUrl={shopLogoUrl}
          shopOpenTime={shopOpenTime}
          shopCloseTime={shopCloseTime}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-natural font-sans text-stone-800 pb-16 antialiased relative" id="barber-app-container">
      
      {/* Floating Active Toast Notification Banner */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm bg-amber-500 text-stone-950 p-4 rounded-2xl shadow-2xl border-2 border-amber-300 animate-fade-in flex items-start gap-3 transition-all duration-300">
          <div className="p-2 bg-stone-950 text-amber-400 rounded-xl shrink-0">
            <BellRing className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="font-extrabold text-xs">{activeToast.title}</h4>
              <span className="text-[9px] font-bold opacity-75">{activeToast.time}</span>
            </div>
            <p className="text-xs font-medium mt-1 leading-snug">{activeToast.body}</p>
          </div>
          <button 
            onClick={() => setActiveToast(null)}
            className="text-stone-950 hover:bg-amber-600/30 p-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
            title="ปิดการแสดงผล"
          >
            ✕
          </button>
        </div>
      )}

      {/* Firestore Connection/Service Error Banner */}
      {firestoreError && (
        <div className="bg-amber-500 text-stone-900 px-4 py-3 text-center text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-2 relative z-50 border-b border-amber-600/30 animate-fade-in" id="firestore-offline-warning">
          <span>🛡️ ระบบคลาวด์กำลังเตรียมทรัพยากรสำหรับสาขานี้ (ใช้เวลา 1-2 นาที) ระบบได้เปิด "โหมดสำรองข้อมูลบนอุปกรณ์" ให้คุณแล้วโดยอัตโนมัติ คุณสามารถลงคิว จัดการช่าง และใช้งานได้ตามปกติทันที!</span>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
          >
            🔄 รีเฟรชเชื่อมต่อใหม่ (Retry Connect)
          </button>
        </div>
      )}

      {/* Floating Copy Success Toast */}
      {copySuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 border border-brand/30 text-brand-light font-sans text-xs font-semibold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-fade-in">
          <span className="text-base">📋</span>
          <span>คัดลอกลิงก์ของร้าน {shopName} สำเร็จ! นำไปแชร์ต่อให้ลูกค้าดูคิวสดได้เลย</span>
        </div>
      )}
      
      {/* Barber Shop Luxury Header Theme */}
      <header className="bg-stone-earth text-stone-100 border-b border-brand/30 shadow-md relative overflow-hidden" id="main-header">
        {/* Subtle warm copper accent line at the very top */}
        <div className="h-1.5 w-full bg-brand"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          <div className="flex items-center gap-3">
            {shopLogoUrl ? (
              <div className="w-12 h-12 rounded-2xl bg-white border border-brand/35 overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-md">
                <img
                  src={shopLogoUrl}
                  alt="Shop Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center border border-brand/30 shrink-0">
                <Scissors className="w-6 h-6 text-brand animate-[spin_12s_linear_infinite]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-serif font-bold tracking-tight text-brand-light truncate max-w-[200px] sm:max-w-xs">{shopName || 'BARBER PRO'}</h1>
                <span className="text-[10px] bg-brand/20 text-brand border border-brand/50 px-2 py-0.5 rounded-full font-bold shrink-0">CLOUD SYNC</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5" id="branch-info-row">
                <p className="text-xs text-stone-400 flex items-center gap-1 font-sans">
                  <span>💈 ร้าน:</span>
                  <span className="text-brand font-bold truncate max-w-[140px] sm:max-w-xs">{shopName}</span>
                  <span className="text-stone-500 text-[10px]">({activeShopEmail})</span>
                </p>
                <button
                  type="button"
                  id="copy-share-link-btn"
                  onClick={handleCopyLink}
                  className={`border px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 ${
                    copySuccess 
                      ? 'bg-green-700/60 border-green-500 text-green-100' 
                      : 'bg-brand/20 hover:bg-brand/35 text-brand-light border border-brand/40'
                  }`}
                  title={`คัดลอกลิงก์ให้ลูกค้าเปิดดูคิวของร้าน ${shopName}`}
                >
                  {copySuccess ? '✓ คัดลอกสำเร็จ!' : `🔗 คัดลอกลิงก์แชร์ร้าน ${shopName}`}
                </button>
              </div>
            </div>
          </div>
          
          {/* Calendar Thai Date & Barber Shop Real-time Open/Closed Status Display */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 sm:gap-3 max-w-full" id="header-widgets-container">
            
            {/* Live Thai Date with Barber Shop Branding Icons */}
            <div className="bg-stone-900/80 backdrop-blur-md px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-amber-500/30 flex items-center gap-2.5 sm:gap-3 shadow-sm hover:border-amber-500/50 transition-all shrink-0">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <Scissors className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider">วันปัจจุบันประจำสาขา</p>
                <p className="text-xs font-bold text-amber-200 font-serif mt-0.5 whitespace-nowrap">{getThaiLongDate()}</p>
              </div>
            </div>

            {/* Real-time Shop Open / Closed Status Badge */}
            {(() => {
              const status = getShopOpenStatus();
              return (
                <div className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border flex items-center gap-2.5 sm:gap-3 shadow-sm transition-all shrink-0 ${status.badgeStyle}`} id="header-shop-status-badge">
                  <div className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${status.dotStyle}`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.isOpen ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-tight whitespace-nowrap">{status.statusText}</p>
                    <p className="text-[10px] font-mono opacity-90 whitespace-nowrap">{status.timeText}</p>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons Row Group */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              {/* TV Mode Toggle Button */}
              <button
                type="button"
                id="header-tv-mode-btn"
                onClick={() => setIsFullscreenDisplay(true)}
                className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-500/40 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm shrink-0"
                title="สลับหน้านี้เป็นโหมดจอทีวีคิวหน้าร้าน"
              >
                <Tv className="w-4 h-4 animate-pulse" />
                <span className="whitespace-nowrap">เปิดจอทีวี (TV Mode)</span>
              </button>

              {/* Notification Quick Toggle in Header */}
              <button
                type="button"
                id="header-notification-toggle-btn"
                onClick={toggleNotifications}
                className={`px-3.5 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md border shrink-0 ${
                  notificationsEnabled
                    ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 border-amber-400 font-extrabold'
                    : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700'
                }`}
                title={notificationsEnabled ? 'ระบบแจ้งเตือนคิวเปิดอยู่ (กดเพื่อปิด)' : 'กดเพื่อเปิดรับ Browser Notification เมื่อมีคิวใหม่'}
              >
                {notificationsEnabled ? (
                  <>
                    <BellRing className="w-3.5 h-3.5 text-stone-950 animate-bounce" />
                    <span className="whitespace-nowrap">แจ้งเตือนคิว: เปิด</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-3.5 h-3.5 text-stone-400" />
                    <span className="whitespace-nowrap">เปิดการแจ้งเตือน</span>
                  </>
                )}
              </button>

              {/* Logout Branch Button */}
              <button
                type="button"
                id="branch-logout-btn"
                onClick={() => {
                  localStorage.removeItem('activeShopEmail');
                  setActiveShopEmail(null);
                  const url = new URL(window.location.href);
                  url.searchParams.delete('shop');
                  url.searchParams.delete('branch');
                  window.history.replaceState({}, '', url.toString());
                }}
                className="bg-[#3D1E1E] hover:bg-[#522929] border border-red-900/40 text-red-200 px-3 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">ออกจากระบบ</span>
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Primary Navigation System */}
      <nav className="max-w-2xl mx-auto px-4 mt-6 mb-8" id="tab-navigation">
        <div className="bg-white p-1.5 rounded-3xl border border-stone-200/50 shadow-sm flex flex-wrap sm:flex-nowrap gap-1">
          
          {/* Tab 1: ลงคิวจอง */}
          <button
            onClick={() => setActiveTab(0)}
            id="nav-tab-booking"
            className={`flex-1 py-3 px-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 0
                ? 'bg-brand text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FDF8F3]'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>ลงคิว (หน้าแรก)</span>
          </button>

          {/* Tab 2: รายการจอง */}
          <button
            onClick={() => setActiveTab(1)}
            id="nav-tab-list"
            className={`flex-1 py-3 px-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer relative ${
              activeTab === 1
                ? 'bg-brand text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FDF8F3]'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>รายการจอง</span>
            {bookings.length > 0 && (
              <span className={`absolute top-1 sm:top-2 right-1.5 sm:right-3 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center border ${
                activeTab === 1 
                  ? 'bg-white text-stone-900 border-white' 
                  : 'bg-brand text-white border-brand'
              }`}>
                {bookings.length}
              </span>
            )}
          </button>

          {/* Tab 3: ปิดคิว/ลางาน */}
          <button
            onClick={() => setActiveTab(2)}
            id="nav-tab-leaves"
            className={`flex-1 py-3 px-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer relative ${
              activeTab === 2
                ? 'bg-brand text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FDF8F3]'
            }`}
          >
            <CalendarOff className="w-4 h-4 shrink-0" />
            <span>ปิดคิว/ลางาน</span>
            {leaves.length > 0 && (
              <span className={`absolute top-1 sm:top-2 right-1.5 sm:right-3 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center border ${
                activeTab === 2
                  ? 'bg-white text-amber-955 border-white'
                  : 'bg-[#B05B1E] text-white border-[#B05B1E]'
              }`}>
                {leaves.length}
              </span>
            )}
          </button>

          {/* Tab 6: หน้าจอคิวหน้าร้าน (Tablet Display) */}
          <button
            onClick={() => setActiveTab(5)}
            id="nav-tab-display"
            className={`flex-1 py-3 px-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 5
                ? 'bg-brand text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FDF8F3]'
            }`}
          >
            <Tv className="w-4 h-4 shrink-0" />
            <span>หน้าจอคิว (Tablet)</span>
          </button>

          {/* Tab 4: ตั้งค่า */}
          <button
            onClick={() => setActiveTab(3)}
            id="nav-tab-settings"
            className={`flex-1 py-3 px-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 3
                ? 'bg-brand text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FDF8F3]'
            }`}
          >
            <SettingsIcon className="w-4 h-4 shrink-0" />
            <span>ตั้งค่า (ช่างในร้าน)</span>
          </button>

        </div>
      </nav>

      {/* Main Workspace Frame */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 animate-fade-in" id="primary-workspace">

        {/* Quick Notification Status Bar for Shop Staff */}
        <div className="bg-stone-900 text-stone-100 p-3.5 sm:p-4 rounded-2xl mb-6 shadow-sm border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" id="notification-control-bar">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${notificationsEnabled ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-stone-800 text-stone-400'}`}>
              {notificationsEnabled ? <BellRing className="w-5 h-5 animate-bounce" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-100">ระบบแจ้งเตือนคิวใหม่ผ่าน Browser:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  notificationsEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-stone-800 text-stone-400 border border-stone-700'
                }`}>
                  {notificationsEnabled ? '● เปิดใช้งานอยู่ (Live)' : '○ ปิดอยู่'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {notificationsEnabled 
                  ? 'ส่งเสียงเตือน Chime และแสดง Pop-up ทันทีเมื่อมีรายการจองคิวใหม่เข้ามาในคอลเลกชัน Firestore'
                  : 'กดเปิดการแจ้งเตือนเพื่อส่งเสียงเตือนและแจ้งเตือนผ่าน Browser ทันทีเมื่อมีลูกค้าลงคิวใหม่เข้ามา'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            {notificationsEnabled && (
              <button
                type="button"
                id="test-notification-btn"
                onClick={testNotification}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-[11px] border border-stone-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="ทดสอบส่งเสียงสัญญาณและ Pop-up แจ้งเตือน"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>ทดสอบเสียง/แจ้งเตือน</span>
              </button>
            )}
            <button
              type="button"
              id="toggle-notification-btn"
              onClick={toggleNotifications}
              className={`px-4 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm ${
                notificationsEnabled
                  ? 'bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-200'
                  : 'bg-amber-500 hover:bg-amber-600 text-stone-950 font-black'
              }`}
            >
              {notificationsEnabled ? 'ปิดการแจ้งเตือน' : '🔔 เปิดการแจ้งเตือนคิว'}
            </button>
          </div>
        </div>

        {activeTab === 0 && (
          <div>
            <BookingForm
              hairdressers={hairdressers}
              recorders={recorders}
              bookings={bookings}
              leaves={leaves}
              onAddBooking={handleAddBooking}
              activeRecorder={activeRecorder}
              setActiveRecorder={setActiveRecorder}
              jumpToTab={setActiveTab}
              currentUser={currentUser}
              slotDuration={slotDuration}
              activeShopEmail={activeShopEmail}
              shopHolidays={shopHolidays}
              shopOpenTime={shopOpenTime}
              shopCloseTime={shopCloseTime}
            />
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <BookingList
              bookings={bookings}
              hairdressers={hairdressers}
              leaves={leaves}
              onDeleteBooking={handleDeleteBooking}
              onUpdateBooking={handleUpdateBooking}
              jumpToTab={setActiveTab}
              currentUser={currentUser}
              slotDuration={slotDuration}
            />
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <LeaveManager
              hairdressers={hairdressers}
              leaves={leaves}
              onAddLeave={handleAddLeave}
              onUpdateLeave={handleUpdateLeave}
              onDeleteLeave={handleDeleteLeave}
              shopOpenTime={shopOpenTime}
              shopCloseTime={shopCloseTime}
            />
          </div>
        )}

        {activeTab === 3 && (
          isSettingsUnlocked ? (
            <Settings
              hairdressers={hairdressers}
              onAddHairdresser={handleAddHairdresser}
              onDeleteHairdresser={handleDeleteHairdresser}
              onToggleHairdresserLeave={handleToggleHairdresserLeave}
              recorders={recorders}
              onAddRecorder={handleAddRecorder}
              onDeleteRecorder={handleDeleteRecorder}
              shopName={shopName}
              onUpdateShopName={handleUpdateShopName}
              adminPin={adminPin}
              onUpdateAdminPin={handleUpdateAdminPin}
              shopLogoUrl={shopLogoUrl}
              onUpdateShopLogo={handleUpdateShopLogo}
              slotDuration={slotDuration}
              onUpdateSlotDuration={handleUpdateSlotDuration}
              shopHolidays={shopHolidays}
              onUpdateShopHolidays={handleUpdateShopHolidays}
              shopOpenTime={shopOpenTime}
              shopCloseTime={shopCloseTime}
              onUpdateShopOpenTime={handleUpdateShopOpenTime}
              onUpdateShopCloseTime={handleUpdateShopCloseTime}
            />
          ) : (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-stone-200 shadow-sm text-center space-y-6" id="settings-pin-lock-container">
              <div className="w-14 h-14 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center mx-auto text-3xl text-brand">
                🔐
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-lg">ป้อนรหัส PIN เพื่อเข้าตั้งค่า</h3>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  ส่วนควบคุมหลังบ้าน: เพิ่ม/ลบรายชื่อช่างหลัก, ปรับเปลี่ยนชื่อแบรนด์ร้าน หรือเปลี่ยนรหัสผ่านเพื่อความปลอดภัยของสาขา
                </p>
              </div>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (pinInput === adminPin) {
                    setIsSettingsUnlocked(true);
                    setPinInput('');
                    setPinError(false);
                  } else {
                    setPinError(true);
                  }
                }}
                className="space-y-4"
              >
                {/* Numeric PIN circle indicator */}
                <div className="flex justify-center gap-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        idx < pinInput.length
                          ? 'bg-brand border-brand scale-110 shadow-xs'
                          : 'bg-stone-50 border-stone-200'
                      }`}
                    />
                  ))}
                </div>

                <div className="relative max-w-xs mx-auto">
                  <input
                    type="password"
                    maxLength={12}
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setPinInput(val);
                      setPinError(false);
                      if (val.length >= 4 && val === adminPin) {
                        setIsSettingsUnlocked(true);
                        setPinInput('');
                        setPinError(false);
                      }
                    }}
                    placeholder="ป้อนรหัสผ่าน"
                    className="w-full text-center px-4 py-3 text-sm focus:ring-2 focus:ring-brand/10 rounded-2xl border border-stone-200 focus:border-brand outline-none transition-all placeholder:text-stone-400 font-mono text-lg font-bold text-stone-900"
                    autoFocus
                  />
                </div>

                {pinError && (
                  <p className="text-[11px] text-red-500 font-bold animate-shake text-center">
                    ❌ รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง!
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-[180px] mx-auto py-3 px-4 bg-brand hover:bg-brand-dark text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1"
                  >
                    🔑 ป้อนและตรวจสอบ
                  </button>
                </div>
              </form>

              {/* Pad digits buttons for ease of touch on phones */}
              <div className="grid grid-cols-3 gap-3 max-w-[180px] mx-auto pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      const newVal = pinInput + num;
                      if (newVal.length <= 12) {
                        setPinInput(newVal);
                        setPinError(false);
                        if (newVal.length >= 4 && newVal === adminPin) {
                          setIsSettingsUnlocked(true);
                          setPinInput('');
                          setPinError(false);
                        }
                      }
                    }}
                    className="w-11 h-11 rounded-full border border-stone-200 hover:border-brand hover:bg-[#FAF6F0] font-bold text-sm text-stone-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPinInput('');
                    setPinError(false);
                  }}
                  className="text-xs font-bold text-stone-400 hover:text-[#8D6E63] active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  ล้าง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newVal = pinInput + '0';
                    if (newVal.length <= 12) {
                      setPinInput(newVal);
                      setPinError(false);
                      if (newVal.length >= 4 && newVal === adminPin) {
                        setIsSettingsUnlocked(true);
                        setPinInput('');
                        setPinError(false);
                      }
                    }
                  }}
                  className="w-11 h-11 rounded-full border border-stone-200 hover:border-brand hover:bg-[#FAF6F0] font-bold text-sm text-stone-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinInput((prev) => prev.slice(0, -1));
                    setPinError(false);
                  }}
                  className="text-xs font-bold text-brand hover:text-brand-dark active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  ลบ
                </button>
              </div>

            </div>
          )
        )}
        {activeTab === 5 && (
          <div className="space-y-6">
            <div className="max-w-6xl mx-auto px-4">
              <div className="bg-stone-100 border border-stone-200/60 p-4 rounded-3xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-[#B05B1E]/10 text-[#B05B1E] p-2 rounded-xl shrink-0">
                      <Tv className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-stone-900 font-sans">
                        ระบบแสดงผลคิวแยกหน้าจอแบบเรียลไทม์ (สำหรับต่อ 2 จอ หรือสมาร์ททีวีหน้าร้าน)
                      </h4>
                      <p className="text-[11px] text-stone-500 font-sans">
                        เชื่อมต่อคิวขึ้นจอทีวีหน้าร้าน ซิงค์ข้อมูลอัตโนมัติเสี้ยววินาทีผ่านระบบคลาวด์
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTvInstructions(!showTvInstructions)}
                      className="bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      {showTvInstructions ? (
                        <>
                          <span>🙈 ซ่อนคู่มือตั้งค่า</span>
                        </>
                      ) : (
                        <>
                          <span>📖 แสดงวิธีต่อสองจอ (แก้ 404)</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFullscreenDisplay(true)}
                      className="bg-[#B05B1E] hover:bg-brand-dark text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>📺 เปิดโหมดทีวีหน้านี้</span>
                    </button>
                  </div>
                </div>

                {showTvInstructions && (
                  <div className="pt-2 border-t border-stone-200/60 space-y-3">
                    {/* Step-by-Step Interactive Tutorial */}
                    <div className="bg-white border border-stone-200/80 p-5 rounded-2xl space-y-4">
                      <h5 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                        <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                        <span>เปิดหน้าต่างแท็บที่ 2 สำหรับต่อทีวี</span>
                      </h5>
                      <p className="text-xs text-stone-600 leading-relaxed pl-6.5">
                        เนื่องจากความปลอดภัยของระบบทดสอบ AI Studio หากกดเปิดลิงก์ที่สร้างขึ้นเองโดยตรงในแท็บใหม่ ระบบรักษาความปลอดภัยของเบราว์เซอร์และ Cloud Proxy จะบล็อกการเชื่อมต่อ ทำให้แสดงผลเป็น "Page not found (404)" 
                        <br />
                        <strong className="text-emerald-700">ทางแก้ไขที่ถูกต้องและง่ายที่สุด:</strong> ให้คลิกที่ปุ่ม <strong className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-800">"เปิดในแท็บใหม่" (ปุ่มไอคอนลูกศรชี้ขึ้นขวา ↗️ ที่อยู่มุมขวาบนสุดของแถบสีฟ้าพรีวิวหน้าจอ AI Studio ด้านบนสุด)</strong> เพื่อเปิดระบบหลักในแท็บที่สองอย่างถูกต้องและปลอดภัย 100%
                      </p>

                      <h5 className="text-xs font-bold text-stone-800 flex items-center gap-1.5 pt-2">
                        <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                        <span>กดปุ่มสลับเข้าโหมดทีวีหน้าร้าน</span>
                      </h5>
                      <p className="text-xs text-stone-600 leading-relaxed pl-6.5">
                        ในแท็บที่สองที่เพิ่งเปิดขึ้นมานั้น ให้กดปุ่มสีเขียว <strong className="text-emerald-700">"📺 เปิดจอทีวี (TV Mode)"</strong> ที่อยู่ด้านบนขวา of หน้าต่างนั้นทันที! แท็บที่สองนั้นจะสลับร่างเป็นหน้าจอแสดงผลคิวทีวีเต็มรูปแบบอย่างสง่างาม
                      </p>

                      <h5 className="text-xs font-bold text-stone-800 flex items-center gap-1.5 pt-2">
                        <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                        <span>ลากแท็บที่สองไปเปิดไว้ที่หน้าจอทีวี/จอที่สอง</span>
                      </h5>
                      <p className="text-xs text-stone-600 leading-relaxed pl-6.5">
                        คุณสามารถลากแท็บที่สองไปเปิดที่หน้าจอทีวีหน้าร้านหรือจอเสริมได้เลย โดยที่แท็บแรกยังคงเปิดค้างเป็นหน้าบันทึกคิวหลักอยู่ตามปกติ
                      </p>

                      <h5 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 pt-2">
                        <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">✨</span>
                        <span>ซิงค์ข้อมูลเรียลไทม์ 100%</span>
                      </h5>
                      <p className="text-xs text-stone-600 leading-relaxed pl-6.5">
                        เมื่อคุณกดลงคิว บันทึกคิว หรือสลับคิวช่างในแท็บแรก ระบบจะทำการส่งข้อมูลผ่าน <strong>Firebase Cloud</strong> และแสดงผลอัปเดตบนหน้าจอทีวีในแท็บที่สองโดยอัตโนมัติในเสี้ยววินาที โดยที่คุณไม่ต้องคอยรีโหลดหน้าจอหรือกดสลับไปมาให้ยุ่งยากอีกต่อไป!
                      </p>
                    </div>
                  </div>
                )}

                {/* Instant preview of the display design */}
                <div className="border border-dashed border-stone-300 p-4 rounded-2xl bg-stone-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">📺 ตัวอย่างหน้าจอแสดงผล (Preview Design)</span>
                    <button
                      type="button"
                      onClick={() => setIsFullscreenDisplay(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>ลองกดเปิดโหมดทีวี (หน้าจอนี้)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <DisplayView
              bookings={bookings}
              hairdressers={hairdressers}
              shopName={shopName}
              shopLogoUrl={shopLogoUrl}
              shopOpenTime={shopOpenTime}
              shopCloseTime={shopCloseTime}
            />
          </div>
        )}

      </main>

      {/* Footer copyright label */}
      <footer className="text-center text-xs text-stone-400 mt-16 max-w-md mx-auto space-y-1.5 px-4" id="app-footer">
        <p className="font-semibold text-stone-500">💈 {shopName || 'BARBER PRO'} (Natural Earth Cloud Theme)</p>
        <p className="font-light">อำนวยประโยชน์ให้ผู้เข้าอบรมและผู้คุมลงคิวร้านได้อย่างมีระบบด้วย Firebase Cloud</p>
      </footer>

    </div>
  );
}

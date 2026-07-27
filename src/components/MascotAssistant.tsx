/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Scissors, X, MessageCircle, Heart, Smile, Volume2, VolumeX } from 'lucide-react';
import mascotHappyImg from '../assets/images/mascot_happy_barber_1784912725588.jpg';
import mascotCheeringImg from '../assets/images/mascot_cheering_cat_1784912741830.jpg';

export interface MascotEventDetail {
  message: string;
  title?: string;
  pose?: 'happy' | 'cheering';
  autoHideMs?: number;
}

export function triggerMascotPopup(message: string, title?: string, pose: 'happy' | 'cheering' = 'cheering', autoHideMs = 4500) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent<MascotEventDetail>('mascot-pop-event', {
      detail: { message, title, pose, autoHideMs }
    });
    window.dispatchEvent(event);
  }
}

// Web Audio API soft cute chime generator
function playCuteChimeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Play two cute rising notes (E5 -> A5)
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.12, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.debug("Audio play blocked or unavailable:", e);
  }
}

const CUTE_BARBER_QUOTES = [
  "ตัดผมร้านนี้ สดใสหล่อเท่ขึ้น 300% แน่นอนงับ! ✂️✨",
  "คิวตรงเวลา บริการประทับใจ น้องบาร์เบอร์คอนเฟิร์ม! 🐱💖",
  "ช่างตัดผมร้านเรามือทองสุดๆ เซ็ตทรงไหนก็ปัง! 💈⚡",
  "เหมียววว~ ยินดีต้อนรับครับผม มีอะไรให้น้องช่วยไหมน้า? 🐾",
  "ตัดสั้นรับทรงใหม่ หน้าเด็กทันตาเห็นเลยน้า! ✂️✨",
  "อย่าลืมดูแลสุขภาพเส้นผมกันด้วยนะงับ ช่างผมใส่ใจทุกรายละเอียด! 💖"
];

const CUTE_HAIR_TIPS = [
  "💡 ทริคดูแลผม: สระผมด้วยน้ำอุณหภูมิห้อง ช่วยให้หนังศีรษะไม่แห้งตึงงับ!",
  "💡 ทริคเซ็ตผม: ใช้ Pomade ตอนผมหมาดเล็กน้อย จะจัดทรงได้เป๊ะตลอดวัน!",
  "💡 ทริคเลือกทรง: ทรง Undercut เหมาะกับทุกโครงหน้าและตัดแล้วเซ็ตง่ายสุดๆ งับ"
];

export interface MascotAssistantProps {
  activeShopEmail?: string | null;
}

import { safeLocalStorage } from '../utils/storage';

export default function MascotAssistant({ activeShopEmail }: MascotAssistantProps) {
  const [activeBubble, setActiveBubble] = useState<MascotEventDetail | null>(null);
  const [isInteractiveModalOpen, setIsInteractiveModalOpen] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Auto trigger daily first-time welcome greeting when logged in/entering shop
  useEffect(() => {
    if (!activeShopEmail) return;
    const today = new Date().toISOString().split('T')[0];
    const key = `daily_welcome_mascot_${activeShopEmail}_${today}`;
    if (!safeLocalStorage.getItem(key)) {
      safeLocalStorage.setItem(key, 'true');
      const timer = setTimeout(() => {
        setActiveBubble({
          message: `เหมียววว~ ยินดีต้อนรับเข้าสู่ระบบร้าน ${activeShopEmail} งับ! ขอให้เป็นวันที่ลูกค้าแน่นร้าน ลุยกันเลย! 🐱💈✨`,
          title: `ยินดีต้อนรับประจำวัน! 🎉`,
          pose: 'cheering',
          autoHideMs: 6000
        });
        if (soundEnabled) {
          playCuteChimeSound();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeShopEmail, soundEnabled]);

  // Listen to custom mascot events
  useEffect(() => {
    const handleMascotEvent = (e: Event) => {
      const customEv = e as CustomEvent<MascotEventDetail>;
      if (customEv.detail) {
        setActiveBubble(customEv.detail);
        if (soundEnabled) {
          playCuteChimeSound();
        }
      }
    };

    window.addEventListener('mascot-pop-event', handleMascotEvent);
    return () => {
      window.removeEventListener('mascot-pop-event', handleMascotEvent);
    };
  }, [soundEnabled]);

  // Auto hide bubble timer
  useEffect(() => {
    if (!activeBubble) return;
    const timer = setTimeout(() => {
      setActiveBubble(null);
    }, activeBubble.autoHideMs || 4500);

    return () => clearTimeout(timer);
  }, [activeBubble]);

  const handleNextQuote = () => {
    setCurrentQuoteIndex((prev) => (prev + 1) % CUTE_BARBER_QUOTES.length);
  };

  const handleMascotClick = () => {
    if (activeBubble) {
      setActiveBubble(null);
    } else {
      setIsInteractiveModalOpen(true);
      if (soundEnabled) playCuteChimeSound();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none select-none">
      {/* Toast Speech Bubble Popup */}
      <AnimatePresence>
        {activeBubble && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="pointer-events-auto mb-3 max-w-xs bg-white rounded-3xl p-4 shadow-xl border-2 border-amber-400 relative text-stone-900"
          >
            {/* Cute Bubble Arrow */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-b-2 border-r-2 border-amber-400 rotate-45 transform" />

            <div className="flex items-start gap-3">
              <img
                src={activeBubble.pose === 'cheering' ? mascotCheeringImg : mascotHappyImg}
                alt="น้องบาร์เบอร์"
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-300 shadow-xs shrink-0 animate-bounce"
              />

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1 text-[11px] font-black text-amber-700 uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                  <span>{activeBubble.title || 'น้องบาร์เบอร์บอกว่า...'}</span>
                </div>
                <p className="text-xs font-bold text-stone-800 leading-snug break-words">
                  {activeBubble.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveBubble(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Avatar Widget */}
      <div className="pointer-events-auto relative group">
        <motion.button
          type="button"
          onClick={handleMascotClick}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="relative bg-amber-500 hover:bg-amber-400 p-1 rounded-full shadow-2xl border-4 border-white cursor-pointer transition-shadow hover:shadow-amber-500/30 flex items-center justify-center"
          title="คลิกคุยกับ น้องบาร์เบอร์ 🐱✂️"
        >
          {/* Pulsing Ring Effect */}
          <span className="absolute -inset-1 rounded-full bg-amber-400 opacity-40 animate-ping pointer-events-none" />

          <img
            src={mascotHappyImg}
            alt="Nong Barber Mascot"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover relative z-10 border-2 border-amber-200"
          />

          {/* Sparkle Badge */}
          <span className="absolute -top-1 -right-1 z-20 bg-stone-900 text-amber-400 p-1 rounded-full border border-amber-400 text-[10px] font-black shadow-xs flex items-center gap-0.5">
            <Scissors className="w-3 h-3 text-amber-400" />
          </span>
        </motion.button>
      </div>

      {/* Interactive Mascot Dialog Popup Modal */}
      <AnimatePresence>
        {isInteractiveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-amber-300 relative overflow-hidden"
            >
              {/* Background Glow Deco */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-amber-100 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsInteractiveModalOpen(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 p-1.5 rounded-full transition-colors cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Mascot Info */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="relative">
                  <img
                    src={mascotCheeringImg}
                    alt="Nong Barber"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                    🐱 BARBER
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                    น้องบาร์เบอร์ <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    มาสคอตผู้ช่วยประจำร้านตัดผม 💈
                  </p>
                </div>
              </div>

              {/* Main Speech Card */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 mb-4 relative">
                <p className="text-xs font-bold text-stone-800 leading-relaxed flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>"{CUTE_BARBER_QUOTES[currentQuoteIndex]}"</span>
                </p>
              </div>

              {/* Hair Tip Card */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 mb-5">
                <p className="text-[11px] font-semibold text-stone-700 leading-relaxed">
                  {CUTE_HAIR_TIPS[currentQuoteIndex % CUTE_HAIR_TIPS.length]}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleNextQuote}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-2.5 px-4 rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Smile className="w-4 h-4" />
                  <span>สุ่มคำพูด / คำแนะนำถัดไป 🎲</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerMascotPopup('สู้ๆ นะงับพี่ๆ ช่างผม! วันนี้ตัดออกมาหล่อเท่ทุกคนแน่นอน 💪✨', 'ส่งกำลังใจ!', 'cheering');
                      setIsInteractiveModalOpen(false);
                    }}
                    className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2 px-3 rounded-xl text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>ส่งกำลังใจ 💖</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title={soundEnabled ? "ปิดเสียงเอฟเฟกต์" : "เปิดเสียงเอฟเฟกต์"}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  brand: string;      // --color-brand
  brandDark: string;  // --color-brand-dark
  brandLight: string; // --color-brand-light
  brandWarm: string;  // --color-brand-warm
  stoneEarth: string; // --color-stone-earth
  previewColors: string[]; // 4 color swatches
}

export const DEFAULT_THEME_ID = 'amber-gold';

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'minimal-clean',
    name: 'Minimal Snow (ขาวมินิมอลคลีน)',
    description: 'โทนสีขาวสว่าง สบายตา มินิมอลเรียบหรู ดูสะอาดสะอ้านทันสมัย',
    brand: '#0F172A',
    brandDark: '#020617',
    brandLight: '#FFFFFF',
    brandWarm: '#F8FAFC',
    stoneEarth: '#020617',
    previewColors: ['#FFFFFF', '#F8FAFC', '#E2E8F0', '#0F172A']
  },
  {
    id: 'nordic-sky',
    name: 'Nordic Sky (ขาวฟ้านอร์ดิก)',
    description: 'โทนสีขาวคลีนแทรกฟ้าสว่าง สดชื่น ปลอดโปร่ง โปร่งสบายสไตล์สแกนดิเนเวียน',
    brand: '#0EA5E9',
    brandDark: '#0284C7',
    brandLight: '#F0F9FF',
    brandWarm: '#E0F2FE',
    stoneEarth: '#0C4A6E',
    previewColors: ['#FFFFFF', '#E0F2FE', '#0EA5E9', '#0C4A6E']
  },
  {
    id: 'soft-sage',
    name: 'Sage Minimal (ขาวเขียวเซจผ่อนคลาย)',
    description: 'โทนสีขาวคลีนผสมเขียวเซจ ละมุนตา สบายใจ ให้ความรู้สึกเป็นธรรมชาติ',
    brand: '#059669',
    brandDark: '#047857',
    brandLight: '#F0FDF4',
    brandWarm: '#DCFCE7',
    stoneEarth: '#064E3B',
    previewColors: ['#FFFFFF', '#DCFCE7', '#10B981', '#064E3B']
  },
  {
    id: 'amber-gold',
    name: 'Amber Gold (ทองคำคลาสสิก)',
    description: 'โทนสีทองอบอุ่น หรูหรา เหมาะสำหรับร้านบาร์เบอร์และสาลอนสไตล์พรีเมียม',
    brand: '#C5A059',
    brandDark: '#A37F3F',
    brandLight: '#F9F6F0',
    brandWarm: '#EFE9DC',
    stoneEarth: '#0B1325',
    previewColors: ['#C5A059', '#A37F3F', '#EFE9DC', '#0B1325']
  },
  {
    id: 'emerald-vintage',
    name: 'Vintage Emerald (เขียวมรกตวินเทจ)',
    description: 'โทนสีเขียวมรกต สดชื่น สบายตา ย้อนยุคสไตล์บาร์เบอร์อังกฤษวินเทจ',
    brand: '#059669',
    brandDark: '#047857',
    brandLight: '#ECFDF5',
    brandWarm: '#D1FAE5',
    stoneEarth: '#022C22',
    previewColors: ['#059669', '#047857', '#D1FAE5', '#022C22']
  },
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire (น้ำเงินไพลินหรูหรา)',
    description: 'โทนสีน้ำเงินพรีเมียม สื่อถึงความสุขุม มืออาชีพ สะอาดสะอ้าน',
    brand: '#2563EB',
    brandDark: '#1D4ED8',
    brandLight: '#EFF6FF',
    brandWarm: '#DBEAFE',
    stoneEarth: '#0F172A',
    previewColors: ['#2563EB', '#1D4ED8', '#DBEAFE', '#0F172A']
  },
  {
    id: 'crimson-barber',
    name: 'Crimson Red (แดงบาร์เบอร์โพล)',
    description: 'โทนสีแดงแรงบันดาลใจจาก Barber Pole ยุคดั้งเดิม โดดเด่นสะดุดตา',
    brand: '#DC2626',
    brandDark: '#B91C1C',
    brandLight: '#FEF2F2',
    brandWarm: '#FEE2E2',
    stoneEarth: '#18181B',
    previewColors: ['#DC2626', '#B91C1C', '#FEE2E2', '#18181B']
  },
  {
    id: 'midnight-violet',
    name: 'Midnight Violet (ม่วงไวโอเล็ตโมเดิร์น)',
    description: 'โทนสีม่วงแฟชั่นล้ำสมัย เหมาะกับร้านทำผมโมเดิร์นและสาลอน Unisex',
    brand: '#7C3AED',
    brandDark: '#6D28D9',
    brandLight: '#F5F3FF',
    brandWarm: '#EDE9FE',
    stoneEarth: '#1E1B4B',
    previewColors: ['#7C3AED', '#6D28D9', '#EDE9FE', '#1E1B4B']
  },
  {
    id: 'warm-copper',
    name: 'Warm Copper (บรอนซ์คอปเปอร์อบอุ่น)',
    description: 'โทนสีส้มอิฐ-บรอนซ์ อบอุ่น มีสไตล์ สานฝันสายวินเทจลอฟต์',
    brand: '#EA580C',
    brandDark: '#C2410C',
    brandLight: '#FFF7ED',
    brandWarm: '#FFEDD5',
    stoneEarth: '#1C1917',
    previewColors: ['#EA580C', '#C2410C', '#FFEDD5', '#1C1917']
  },
  {
    id: 'obsidian-dark',
    name: 'Obsidian Black (ดำโอบซิเดียนชิค)',
    description: 'โทนสีดำ-เทาเงิน สตรีท ชิค เรียบเท่ คลาสสิกไม่มีตกยุค',
    brand: '#475569',
    brandDark: '#1E293B',
    brandLight: '#F8FAFC',
    brandWarm: '#E2E8F0',
    stoneEarth: '#09090B',
    previewColors: ['#475569', '#1E293B', '#E2E8F0', '#09090B']
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold (โรสโกลด์หวานหรู)',
    description: 'โทนสีชมพูโรสโกลด์ อบอุ่น สดใส เหมาะสำหรับซาลอนสุภาพสตรีและ unisex',
    brand: '#E11D48',
    brandDark: '#BE123C',
    brandLight: '#FFF1F2',
    brandWarm: '#FFE4E6',
    stoneEarth: '#2E1065',
    previewColors: ['#E11D48', '#BE123C', '#FFE4E6', '#2E1065']
  }
];

export function getPaletteById(paletteId: string): ThemePalette {
  return THEME_PALETTES.find(p => p.id === paletteId) || THEME_PALETTES[0];
}

export function applyThemePalette(paletteId: string): ThemePalette {
  const palette = getPaletteById(paletteId);
  
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--color-brand', palette.brand);
    root.style.setProperty('--color-brand-dark', palette.brandDark);
    root.style.setProperty('--color-brand-light', palette.brandLight);
    root.style.setProperty('--color-brand-warm', palette.brandWarm);
    root.style.setProperty('--color-stone-earth', palette.stoneEarth);
  }

  return palette;
}

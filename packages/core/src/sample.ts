import type { Transcript, Word } from './transcript';

/**
 * A hand-aligned demo transcript in all three scripts. Used for the app's
 * preview before a backend exists, for template thumbnails, and in tests.
 */
const ROWS: [roman: string, urdu: string, hindi: string, start: number, end: number][] = [
  ['Aaj', 'آج', 'आज', 0.2, 0.5],
  ['main', 'میں', 'मैं', 0.5, 0.75],
  ['aap', 'آپ', 'आप', 0.75, 1.0],
  ['ko', 'کو', 'को', 1.0, 1.2],
  ['batata', 'بتاتا', 'बताता', 1.2, 1.65],
  ['hoon', 'ہوں', 'हूँ', 1.65, 1.95],
  ['ke', 'کہ', 'कि', 1.95, 2.1],
  ['captions', 'کیپشنز', 'कैप्शन्स', 2.1, 2.7],
  ['kaise', 'کیسے', 'कैसे', 2.7, 3.05],
  ['lagate', 'لگاتے', 'लगाते', 3.05, 3.45],
  ['hain.', 'ہیں۔', 'हैं।', 3.45, 3.9],
  ['Bas', 'بس', 'बस', 4.6, 4.85],
  ['video', 'ویڈیو', 'वीडियो', 4.85, 5.25],
  ['upload', 'اپلوڈ', 'अपलोड', 5.25, 5.7],
  ['karo', 'کرو', 'करो', 5.7, 6.0],
  ['aur', 'اور', 'और', 6.0, 6.2],
  ['ek', 'ایک', 'एक', 6.2, 6.4],
  ['click', 'کلک', 'क्लिक', 6.4, 6.75],
  ['mein', 'میں', 'में', 6.75, 6.95],
  ['ho', 'ہو', 'हो', 6.95, 7.15],
  ['gaya!', 'گیا!', 'गया!', 7.15, 7.7],
];

export const SAMPLE_TRANSCRIPT: Transcript = {
  language: 'ur',
  words: ROWS.map(([roman, urdu, hindi, start, end], i): Word => ({
    id: `w${i}`,
    start,
    end,
    text: { roman, urdu, hindi },
  })),
};

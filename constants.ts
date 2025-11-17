
import type { License } from './types';

export const LICENSES: License[] = [
  { value: 'CC0', label: 'Creative Commons Zero (CC0)', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  { value: 'CC-BY', label: 'Creative Commons Attribution (CC BY)', url: 'https://creativecommons.org/licenses/by/4.0/' },
  { value: 'CC-BY-SA', label: 'Creative Commons Attribution-ShareAlike (CC BY-SA)', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { value: 'MIT', label: 'MIT License', url: 'https://opensource.org/licenses/MIT' },
  { value: 'GPL', label: 'GNU General Public License (GPL)', url: 'https://www.gnu.org/licenses/gpl-3.0.en.html' },
  { value: 'Unsplash', label: 'Unsplash License', url: 'https://unsplash.com/license' },
  { value: 'Other', label: 'Other' },
];

export const FLAGS: string[] = [
  'AI Generated',
  'Natural',
  'Photography',
  'Abstract',
  'Minimalist',
  'Fantasy',
  'Sci-Fi',
  'Collage'
];
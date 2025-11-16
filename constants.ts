
import type { License } from './types';

export const LICENSES: License[] = [
  { value: 'CC0', label: 'Creative Commons Zero (CC0)' },
  { value: 'CC-BY', label: 'Creative Commons Attribution (CC BY)' },
  { value: 'CC-BY-SA', label: 'Creative Commons Attribution-ShareAlike (CC BY-SA)' },
  { value: 'MIT', label: 'MIT License' },
  { value: 'GPL', label: 'GNU General Public License (GPL)' },
  { value: 'Unsplash', label: 'Unsplash License' },
  { value: 'Other', label: 'Other' },
];

export const FLAGS: string[] = [
  'AI Generated',
  'Natural',
  'Photography',
  'Abstract',
  'Minimalist',
  'Fantasy',
  'Sci-Fi'
];

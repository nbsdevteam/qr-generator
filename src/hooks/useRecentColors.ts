import { createContext, useContext } from 'react';

export interface RecentColorsApi {
  colors: string[];
  push: (color: string) => void;
}

/** Recently picked colors, shared by every color picker on both pages. */
export const RecentColorsContext = createContext<RecentColorsApi>({ colors: [], push: () => undefined });

export function useRecentColors(): RecentColorsApi {
  return useContext(RecentColorsContext);
}

import { createContext, useContext } from 'react';
import type { QrDesign } from '../types/design';

export type ObjectSectionKey = {
  [K in keyof QrDesign]: QrDesign[K] extends object ? K : never;
}[keyof QrDesign];

export interface DesignApi {
  design: QrDesign;
  setDesign: (next: QrDesign | ((d: QrDesign) => QrDesign)) => void;
  /** Shallow-merge into one section, e.g. update('dots', { scale: 0.5 }). */
  update: <K extends ObjectSectionKey>(key: K, patch: Partial<QrDesign[K]>) => void;
  /** Replace a top-level field, e.g. set('ecc', 'H'). */
  set: <K extends keyof QrDesign>(key: K, value: QrDesign[K]) => void;
}

export const DesignContext = createContext<DesignApi | null>(null);

export function useDesign(): DesignApi {
  const api = useContext(DesignContext);
  if (!api) throw new Error('useDesign must be used inside <DesignContext.Provider>.');
  return api;
}

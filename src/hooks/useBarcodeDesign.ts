import { createContext, useContext } from 'react';
import type { BarcodeDesign } from '../types/barcode';

export type BarcodeSectionKey = {
  [K in keyof BarcodeDesign]: BarcodeDesign[K] extends object ? K : never;
}[keyof BarcodeDesign];

export interface BarcodeDesignApi {
  design: BarcodeDesign;
  setDesign: (next: BarcodeDesign | ((d: BarcodeDesign) => BarcodeDesign)) => void;
  /** Shallow-merge into one section, e.g. update('bars', { roundness: 20 }). */
  update: <K extends BarcodeSectionKey>(key: K, patch: Partial<BarcodeDesign[K]>) => void;
  set: <K extends keyof BarcodeDesign>(key: K, value: BarcodeDesign[K]) => void;
}

export const BarcodeDesignContext = createContext<BarcodeDesignApi | null>(null);

export function useBarcodeDesign(): BarcodeDesignApi {
  const api = useContext(BarcodeDesignContext);
  if (!api) throw new Error('useBarcodeDesign must be used inside <BarcodeDesignContext.Provider>.');
  return api;
}

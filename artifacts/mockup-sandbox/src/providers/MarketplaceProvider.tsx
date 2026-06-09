import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useGetMarketplace } from '@workspace/api-client-react';
import type { MarketplaceResponseData } from '@workspace/api-client-react';
import { MARKETPLACE_SLUG } from '@/lib/constants';

interface MarketplaceContextValue {
  marketplace: MarketplaceResponseData | null;
  isLoading: boolean;
  isError: boolean;
  slug: typeof MARKETPLACE_SLUG;
  currencyId: string | null;
  currencyCode: string;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

interface MarketplaceProviderProps {
  children: ReactNode;
}

export function MarketplaceProvider({ children }: MarketplaceProviderProps) {
  const { data, isLoading, isError } = useGetMarketplace(MARKETPLACE_SLUG);

  const marketplace = data?.data ?? null;

  const value: MarketplaceContextValue = {
    marketplace,
    isLoading,
    isError,
    slug: MARKETPLACE_SLUG,
    currencyId: marketplace?.currency?.id ?? null,
    currencyCode: marketplace?.currency?.code ?? 'NGN',
  };

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace must be used inside MarketplaceProvider');
  }
  return ctx;
}

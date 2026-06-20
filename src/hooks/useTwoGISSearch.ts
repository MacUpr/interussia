// ============================================================
// Inmap — useTwoGISSearch Hook
// ============================================================
//
// Debounced hook that queries the 2GIS Catalog API for places
// near NSU. Returns results as PointOfInterest objects that
// can be merged seamlessly with local indoor search results.
//
// Features:
//   • 350ms debounce to avoid hammering the API on every keystroke
//   • Loading state for UI spinners
//   • Auto-cancels stale requests when query changes
//   • Returns empty when 2GIS API key is not configured
// ============================================================

import { useState, useEffect, useRef } from 'react';
import type { PointOfInterest } from '../types/index';
import { searchNSU, twogisResultToPOI, is2GISApiAvailable } from '../data/twogisApi';
import type { TwoGISSearchResult } from '../data/twogisApi';

/** Debounce delay in milliseconds before querying 2GIS. */
const DEBOUNCE_MS = 350;

/** Minimum query length to trigger a 2GIS search. */
const MIN_QUERY_LENGTH = 2;

interface UseTwoGISSearchReturn {
  /** 2GIS results converted to PointOfInterest format. */
  twogisResults: PointOfInterest[];
  /** Raw 2GIS search results (for displaying source badge). */
  rawResults: TwoGISSearchResult[];
  /** Whether a 2GIS search is currently in flight. */
  isSearching: boolean;
  /** Whether the 2GIS API is available (key configured). */
  isAvailable: boolean;
}

/**
 * Hook that provides debounced 2GIS search results for a query.
 *
 * @param query - The user's search query string
 * @returns Object with twogisResults, isSearching, and isAvailable
 *
 * @example
 * ```tsx
 * const { twogisResults, isSearching } = useTwoGISSearch(searchQuery);
 * const mergedResults = [...indoorResults, ...twogisResults];
 * ```
 */
export function useTwoGISSearch(query: string): UseTwoGISSearchReturn {
  const [twogisResults, setTwogisResults] = useState<PointOfInterest[]>([]);
  const [rawResults, setRawResults] = useState<TwoGISSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const requestIdRef = useRef(0);
  const isAvailable = is2GISApiAvailable();

  useEffect(() => {
    // Don't search if API unavailable or query too short
    if (!isAvailable || query.trim().length < MIN_QUERY_LENGTH) {
      setTwogisResults([]);
      setRawResults([]);
      setIsSearching(false);
      return;
    }

    // Increment request ID to cancel stale requests
    const currentRequestId = ++requestIdRef.current;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchNSU(query.trim());

        // Only apply if this is still the latest request
        if (currentRequestId !== requestIdRef.current) return;

        if (results && results.length > 0) {
          setRawResults(results);
          setTwogisResults(results.map((r) => twogisResultToPOI(r)));
        } else {
          setRawResults([]);
          setTwogisResults([]);
        }
      } catch {
        if (currentRequestId === requestIdRef.current) {
          setRawResults([]);
          setTwogisResults([]);
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsSearching(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, isAvailable]);

  return { twogisResults, rawResults, isSearching, isAvailable };
}

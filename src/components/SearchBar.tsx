// ============================================================
// Inmap v2 — SearchBar Component (with 2GIS Integration)
// ============================================================
//
// Persistent search bar with autocomplete dropdown, category
// filter chips, QR scan button, and floor indicator badge.
// Positioned at the top of the map view.
//
// Now supports merged results from:
//   1. Local indoor destinations (instant)
//   2. 2GIS Catalog API (debounced, async)
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { PointOfInterest, POICategory } from '../types/index';
import { COLORS, CATEGORY_ICONS } from '../utils/constants';

// ── Props ───────────────────────────────────────────────────

interface SearchBarProps {
  /** Current search query string. */
  value: string;
  /** Called when the user types in the search field. */
  onChange: (query: string) => void;
  /** Filtered POI results matching the query (indoor). */
  results: PointOfInterest[];
  /** 2GIS API search results (outdoor/catalog). */
  twogisResults?: PointOfInterest[];
  /** Whether a 2GIS search is in progress. */
  isSearching2GIS?: boolean;
  /** Called when the user selects a result from the dropdown. */
  onResultSelect: (poi: PointOfInterest) => void;
  /** Called when the user taps the QR scan button. */
  onQRScan: () => void;
  /** Currently active category filter, or null for 'All'. */
  categoryFilter: POICategory | null;
  /** Called when the user selects a category chip. */
  onCategoryChange: (cat: POICategory | null) => void;
  /** Display name of the current floor. */
  currentFloorName: string;
}

// ── Merged Category Chip Definitions ────────────────────────

interface CategoryChipDef {
  /** Unique key for the chip. */
  key: string;
  /** Display label. */
  label: string;
  /** Icon/emoji. */
  icon: string;
  /** The POICategory values this chip maps to (first is used for the filter). */
  categories: POICategory[];
}

/**
 * Merged category chips — relabeled for NSU indoor context.
 */
const CATEGORY_CHIPS: CategoryChipDef[] = [
  { key: 'all', label: 'Все', icon: '🔍', categories: [] },
  { key: 'food', label: 'Еда', icon: '☕', categories: ['cafeteria', 'food'] },
  { key: 'meeting_room', label: 'Аудитории', icon: CATEGORY_ICONS.meeting_room, categories: ['meeting_room'] },
  { key: 'office', label: 'Кабинеты', icon: CATEGORY_ICONS.office, categories: ['office'] },
  { key: 'facilities', label: 'Удобства', icon: '🚻', categories: ['restroom', 'elevator', 'stairs'] },
  { key: 'services', label: 'Сервисы', icon: CATEGORY_ICONS.services, categories: ['services', 'info_desk', 'reception'] },
  { key: 'other', label: 'Другое', icon: '📍', categories: ['entrance', 'exit', 'emergency_exit', 'server_room', 'custom', 'shopping', 'health', 'entertainment', 'parking', 'atm'] },
];

// ── Constants ───────────────────────────────────────────────

const MAX_VISIBLE_RESULTS = 6;
const RESULT_ITEM_HEIGHT = 56;

// ── Component ───────────────────────────────────────────────

/**
 * SearchBar — persistent search with autocomplete, 2GIS integration,
 * and category chips.
 *
 * Features:
 * - Glassmorphism search input with magnifying glass icon + clear button
 * - QR scan button on the far right
 * - Autocomplete dropdown with dual sources (indoor + 2GIS)
 * - Horizontal scrollable category chip row
 * - Floor indicator badge
 * - Loading spinner during 2GIS API search
 */
const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  results,
  twogisResults = [],
  isSearching2GIS = false,
  onResultSelect,
  onQRScan,
  categoryFilter,
  onCategoryChange,
  currentFloorName,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasIndoorResults = results.length > 0;
  const hasTwoGISResults = twogisResults.length > 0;
  const hasAnyResults = hasIndoorResults || hasTwoGISResults;

  /** Whether the autocomplete dropdown should be visible. */
  const showDropdown = isFocused && value.length >= 1 && (hasAnyResults || isSearching2GIS);

  /** Close dropdown on outside click. */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Handle selecting a result — close dropdown and clear search. */
  const handleResultClick = useCallback((poi: PointOfInterest) => {
    onResultSelect(poi);
    setIsFocused(false);
  }, [onResultSelect]);

  /** Clear the search input. */
  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  /**
   * Determine which chip key is active based on the current
   * categoryFilter value.
   */
  const getActiveChipKey = (): string => {
    if (categoryFilter === null) return 'all';
    for (const chip of CATEGORY_CHIPS) {
      if (chip.categories.includes(categoryFilter)) return chip.key;
    }
    return 'all';
  };

  /**
   * Handle chip click — set the category filter to the first
   * category in the chip's list, or null for 'All'.
   */
  const handleChipClick = useCallback((chip: CategoryChipDef) => {
    if (chip.key === 'all') {
      onCategoryChange(null);
    } else {
      onCategoryChange(chip.categories[0]);
    }
  }, [onCategoryChange]);

  const activeChipKey = getActiveChipKey();

  /**
   * Get a human-readable floor label for a POI.
   * Shows the floor number field if available, otherwise extracts from floorId.
   */
  const getFloorBadge = (poi: PointOfInterest): string => {
    if (poi.floor !== undefined) {
      return poi.floor === 0 ? 'G' : `F${poi.floor}`;
    }
    // Fallback: extract from floorId convention like 'FLOOR_GROUND'
    if (poi.floorId.includes('GROUND')) return 'G';
    const match = poi.floorId.match(/(\d+)/);
    return match ? `F${match[1]}` : 'G';
  };

  /** Total count of all results for max height calculation. */
  const totalResultCount = results.length + twogisResults.length
    + (hasIndoorResults ? 1 : 0) // section header
    + (hasTwoGISResults || isSearching2GIS ? 1 : 0); // section header

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '12px 16px 0 16px',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Search Input Row ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: COLORS.bgGlass,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${isFocused ? 'rgba(0, 255, 204, 0.3)' : COLORS.borderGlass}`,
          borderRadius: 14,
          padding: '0 6px 0 14px',
          height: 48,
          boxShadow: isFocused
            ? '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 204, 0.1)'
            : '0 4px 12px rgba(0, 0, 0, 0.4)',
          transition: 'all 200ms ease',
        }}
      >
        {/* Magnifying glass icon */}
        <span
          style={{
            fontSize: '1rem',
            color: isFocused ? COLORS.accentPrimary : COLORS.textMuted,
            transition: 'color 200ms ease',
            flexShrink: 0,
          }}
        >
          🔍
        </span>

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Поиск аудитории, кабинета..."
          style={{
            flex: 1,
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: COLORS.textPrimary,
            fontSize: '0.95rem',
            fontFamily: 'var(--font-sans)',
            minWidth: 0,
          }}
          aria-label="Поиск по зданию"
          autoComplete="off"
        />

        {/* Clear button (visible when text is present) */}
        {value.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.06)',
              color: COLORS.textMuted,
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
            aria-label="Очистить"
          >
            ✕
          </button>
        )}

        {/* Floor indicator badge */}
        <div
          style={{
            padding: '2px 8px',
            background: 'rgba(99, 102, 241, 0.15)',
            borderRadius: 20,
            fontSize: '0.65rem',
            fontWeight: 700,
            color: COLORS.accentSecondary,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {currentFloorName}
        </div>

        {/* QR scan button */}
        <button
          onClick={onQRScan}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            background: 'rgba(0, 255, 204, 0.08)',
            color: COLORS.accentPrimary,
            fontSize: '1.1rem',
            cursor: 'pointer',
            border: `1px solid rgba(0, 255, 204, 0.15)`,
            transition: 'all 200ms ease',
            flexShrink: 0,
          }}
          aria-label="Сканировать QR-код"
          title="Сканировать QR-код"
        >
          📷
        </button>
      </div>

      {/* ── Autocomplete Dropdown ────────────────────────────── */}
      {showDropdown && (
        <div
          style={{
            marginTop: 4,
            background: COLORS.bgGlass,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${COLORS.borderGlass}`,
            borderRadius: 12,
            overflow: 'hidden',
            maxHeight: Math.min(totalResultCount, MAX_VISIBLE_RESULTS) * RESULT_ITEM_HEIGHT + 8,
            overflowY: totalResultCount > MAX_VISIBLE_RESULTS ? 'auto' : 'hidden',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            animation: 'slide-up 0.2s ease-out',
          }}
        >
          {/* ── Indoor Results Section ──────────────────────────── */}
          {hasIndoorResults && (
            <>
              <SectionHeader label="🏢 Внутри здания" />
              {results.slice(0, 10).map((poi, index) => (
                <SearchResultItem
                  key={poi.id}
                  poi={poi}
                  floorBadge={getFloorBadge(poi)}
                  onClick={() => handleResultClick(poi)}
                  isLast={index === Math.min(results.length, 10) - 1 && !hasTwoGISResults && !isSearching2GIS}
                />
              ))}
            </>
          )}

          {/* ── 2GIS Results Section ────────────────────────────── */}
          {(hasTwoGISResults || isSearching2GIS) && (
            <>
              <SectionHeader label="🗺️ 2ГИС — НГУ" />
              {isSearching2GIS && !hasTwoGISResults && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    color: COLORS.textMuted,
                    fontSize: '0.82rem',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 16,
                      height: 16,
                      border: `2px solid ${COLORS.borderGlass}`,
                      borderTopColor: COLORS.accentPrimary,
                      borderRadius: '50%',
                      animation: 'twogis-spin 0.8s linear infinite',
                    }}
                  />
                  Поиск в 2ГИС...
                </div>
              )}
              {twogisResults.slice(0, 10).map((poi, index) => (
                <SearchResultItem
                  key={poi.id}
                  poi={poi}
                  floorBadge="2ГИС"
                  sourceBadge="2ГИС"
                  onClick={() => handleResultClick(poi)}
                  isLast={index === Math.min(twogisResults.length, 10) - 1}
                />
              ))}
            </>
          )}

          {/* No results state */}
          {!hasAnyResults && !isSearching2GIS && value.length >= 2 && (
            <div
              style={{
                padding: '16px 14px',
                color: COLORS.textMuted,
                fontSize: '0.85rem',
                fontFamily: 'var(--font-sans)',
                textAlign: 'center',
              }}
            >
              Ничего не найдено
            </div>
          )}
        </div>
      )}

      {/* ── Category Chips Row ───────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 10,
          overflowX: 'auto',
          paddingBottom: 6,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="no-select"
      >
        {CATEGORY_CHIPS.map((chip) => {
          const isActive = chip.key === activeChipKey;
          return (
            <button
              key={chip.key}
              onClick={() => handleChipClick(chip)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 12px',
                background: isActive
                  ? COLORS.accentPrimary
                  : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isActive ? COLORS.accentPrimary : COLORS.borderGlass}`,
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 500,
                fontFamily: 'var(--font-sans)',
                color: isActive ? COLORS.bgPrimary : COLORS.textSecondary,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 200ms ease',
                flexShrink: 0,
              }}
              aria-pressed={isActive}
              aria-label={`Фильтр: ${chip.label}`}
            >
              <span style={{ fontSize: '0.85rem' }}>{chip.icon}</span>
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── SectionHeader (internal sub-component) ──────────────────

interface SectionHeaderProps {
  label: string;
}

/**
 * A thin section header within the dropdown to separate
 * indoor and 2GIS result groups.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({ label }) => (
  <div
    style={{
      padding: '6px 14px 4px',
      fontSize: '0.68rem',
      fontWeight: 700,
      fontFamily: 'var(--font-sans)',
      color: COLORS.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      borderBottom: `1px solid ${COLORS.borderGlass}`,
      background: 'rgba(255, 255, 255, 0.02)',
    }}
  >
    {label}
  </div>
);

// ── SearchResultItem (internal sub-component) ───────────────

interface SearchResultItemProps {
  poi: PointOfInterest;
  floorBadge: string;
  /** Optional source badge (e.g. '2ГИС'). */
  sourceBadge?: string;
  onClick: () => void;
  isLast: boolean;
}

/**
 * A single autocomplete result row.
 */
const SearchResultItem: React.FC<SearchResultItemProps> = ({
  poi,
  floorBadge,
  sourceBadge,
  onClick,
  isLast,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 14px',
        background: isHovered ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : `1px solid ${COLORS.borderGlass}`,
        cursor: 'pointer',
        transition: 'background 150ms ease',
        textAlign: 'left',
        fontFamily: 'var(--font-sans)',
        minHeight: 52,
      }}
      aria-label={`Перейти к ${poi.name}`}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: '1.3rem',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 8,
          flexShrink: 0,
        }}
      >
        {poi.icon}
      </span>

      {/* Name + category/description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: COLORS.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {poi.name}
        </div>
        <div
          style={{
            fontSize: '0.72rem',
            color: COLORS.textMuted,
            marginTop: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {poi.description || poi.category.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Source badge (2ГИС) */}
      {sourceBadge && (
        <span
          style={{
            padding: '2px 6px',
            background: 'rgba(0, 198, 255, 0.12)',
            borderRadius: 10,
            fontSize: '0.6rem',
            fontWeight: 700,
            color: '#00c6ff',
            flexShrink: 0,
          }}
        >
          {sourceBadge}
        </span>
      )}

      {/* Floor badge */}
      <span
        style={{
          padding: '2px 7px',
          background: sourceBadge
            ? 'rgba(0, 198, 255, 0.08)'
            : 'rgba(99, 102, 241, 0.12)',
          borderRadius: 12,
          fontSize: '0.65rem',
          fontWeight: 700,
          color: sourceBadge ? '#00c6ff' : COLORS.accentSecondary,
          flexShrink: 0,
        }}
      >
        {floorBadge}
      </span>
    </button>
  );
};

export default SearchBar;

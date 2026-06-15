// ============================================================
// Inmap v2 — SearchBar Component
// ============================================================
//
// Persistent search bar with autocomplete dropdown, category
// filter chips, QR scan button, and floor indicator badge.
// Positioned at the top of the map view.
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
  /** Filtered POI results matching the query. */
  results: PointOfInterest[];
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
 * Merged category chips as per spec:
 * - 'All' resets to null
 * - 'Food & Dining' merges cafeteria + food
 * - 'Facilities' merges restroom + elevator + stairs
 */
const CATEGORY_CHIPS: CategoryChipDef[] = [
  { key: 'all', label: 'All', icon: '🔍', categories: [] },
  { key: 'food', label: 'Food & Dining', icon: '☕', categories: ['cafeteria', 'food'] },
  { key: 'meeting_room', label: 'Meeting Rooms', icon: CATEGORY_ICONS.meeting_room, categories: ['meeting_room'] },
  { key: 'office', label: 'Offices', icon: CATEGORY_ICONS.office, categories: ['office'] },
  { key: 'facilities', label: 'Facilities', icon: '🚻', categories: ['restroom', 'elevator', 'stairs'] },
  { key: 'services', label: 'Services', icon: CATEGORY_ICONS.services, categories: ['services', 'info_desk', 'reception'] },
  { key: 'other', label: 'Other', icon: '📍', categories: ['entrance', 'exit', 'emergency_exit', 'server_room', 'custom', 'shopping', 'health', 'entertainment', 'parking', 'atm'] },
];

// ── Constants ───────────────────────────────────────────────

const MAX_VISIBLE_RESULTS = 6;
const RESULT_ITEM_HEIGHT = 56;

// ── Component ───────────────────────────────────────────────

/**
 * SearchBar — persistent search with autocomplete and category chips.
 *
 * Features:
 * - Glassmorphism search input with magnifying glass icon + clear button
 * - QR scan button on the far right
 * - Autocomplete dropdown (max 6 visible, then scroll)
 * - Horizontal scrollable category chip row
 * - Floor indicator badge
 */
const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  results,
  onResultSelect,
  onQRScan,
  categoryFilter,
  onCategoryChange,
  currentFloorName,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Whether the autocomplete dropdown should be visible. */
  const showDropdown = isFocused && value.length >= 1 && results.length > 0;

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
          placeholder="Search places..."
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
          aria-label="Search places"
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
            aria-label="Clear search"
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
          aria-label="Scan QR code"
          title="Scan QR code"
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
            maxHeight: MAX_VISIBLE_RESULTS * RESULT_ITEM_HEIGHT + 8,
            overflowY: results.length > MAX_VISIBLE_RESULTS ? 'auto' : 'hidden',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            animation: 'slide-up 0.2s ease-out',
          }}
        >
          {results.slice(0, 20).map((poi, index) => (
            <SearchResultItem
              key={poi.id}
              poi={poi}
              floorBadge={getFloorBadge(poi)}
              onClick={() => handleResultClick(poi)}
              isLast={index === Math.min(results.length, 20) - 1}
            />
          ))}
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
              aria-label={`Filter by ${chip.label}`}
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

// ── SearchResultItem (internal sub-component) ───────────────

interface SearchResultItemProps {
  poi: PointOfInterest;
  floorBadge: string;
  onClick: () => void;
  isLast: boolean;
}

/**
 * A single autocomplete result row.
 */
const SearchResultItem: React.FC<SearchResultItemProps> = ({
  poi,
  floorBadge,
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
      aria-label={`Navigate to ${poi.name}`}
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

      {/* Name + category */}
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
          {poi.category.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Floor badge */}
      <span
        style={{
          padding: '2px 7px',
          background: 'rgba(99, 102, 241, 0.12)',
          borderRadius: 12,
          fontSize: '0.65rem',
          fontWeight: 700,
          color: COLORS.accentSecondary,
          flexShrink: 0,
        }}
      >
        {floorBadge}
      </span>
    </button>
  );
};

export default SearchBar;

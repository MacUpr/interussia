// ============================================================
// Inmap v2 — POIDetailCard
// 2GIS-style business detail card for the BottomSheet.
// ============================================================

import React, { useMemo } from 'react';
import type { PointOfInterest, WeeklyHours } from '../types/index';
import { COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../utils/constants';

// ── Props ───────────────────────────────────────────────────

export interface POIDetailCardProps {
  /** The POI to display details for */
  poi: PointOfInterest;
  /** Whether to show expanded detail view */
  isExpanded: boolean;
  /** Callback to start navigation to this POI */
  onNavigate: (poi: PointOfInterest) => void;
  /** Callback to open AR view */
  onARView: () => void;
  /** Callback to close/dismiss the card */
  onClose: () => void;
}

// ── Helpers ─────────────────────────────────────────────────

/** Day key names matching WeeklyHours interface */
const DAY_KEYS: (keyof WeeklyHours)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<keyof WeeklyHours, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
const DAY_SHORT: Record<keyof WeeklyHours, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

/**
 * Check if the POI is currently open based on opening hours.
 * Returns the open status and today's hours string.
 */
function isCurrentlyOpen(hours: WeeklyHours | undefined): { open: boolean; todayHours: string } {
  if (!hours) return { open: false, todayHours: 'Hours not available' };

  const now = new Date();
  const dayIndex = now.getDay(); // 0=Sun, 1=Mon, ...
  // Map JS day index to our DAY_KEYS order (mon=0...sun=6)
  const keyIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const todayKey = DAY_KEYS[keyIndex];
  const todayHoursStr = hours[todayKey];

  if (!todayHoursStr || todayHoursStr.toLowerCase() === 'closed') {
    return { open: false, todayHours: todayHoursStr || 'Closed' };
  }

  // Try to parse "HH:MM - HH:MM" format
  const match = todayHoursStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (match) {
    const openHour = parseInt(match[1], 10);
    const openMin = parseInt(match[2], 10);
    const closeHour = parseInt(match[3], 10);
    const closeMin = parseInt(match[4], 10);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    return { open: isOpen, todayHours: todayHoursStr };
  }

  // If format is "24h" or similar, assume open
  if (todayHoursStr.toLowerCase().includes('24')) {
    return { open: true, todayHours: todayHoursStr };
  }

  return { open: true, todayHours: todayHoursStr };
}

/** Render star rating as a string (★★★★☆) */
function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

/** Get the current day key */
function getCurrentDayKey(): keyof WeeklyHours {
  const dayIndex = new Date().getDay();
  const keyIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return DAY_KEYS[keyIndex];
}

// ── Styles ──────────────────────────────────────────────────

const styles = {
  container: {
    color: COLORS.textPrimary,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  } as React.CSSProperties,

  iconWrapper: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    background: COLORS.bgTertiary,
    borderRadius: 12,
    border: `1px solid ${COLORS.borderGlass}`,
    flexShrink: 0,
  } as React.CSSProperties,

  headerText: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  name: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.textPrimary,
    lineHeight: 1.3,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  closeBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    fontSize: 16,
    color: COLORS.textMuted,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    border: 'none',
    background: 'transparent',
  } as React.CSSProperties,

  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
    marginBottom: 8,
  } as React.CSSProperties,

  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 10px',
    background: COLORS.bgTertiary,
    border: `1px solid ${COLORS.borderGlass}`,
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 500,
    color: COLORS.textSecondary,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  chipAccent: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 10px',
    background: 'rgba(0, 255, 204, 0.1)',
    border: `1px solid ${COLORS.borderAccent}`,
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.accentPrimary,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
  } as React.CSSProperties,

  stars: {
    color: '#f59e0b', // amber
    letterSpacing: 1,
  } as React.CSSProperties,

  ratingNumber: {
    fontWeight: 600,
    color: COLORS.textPrimary,
  } as React.CSSProperties,

  ratingCount: {
    color: COLORS.textMuted,
    fontSize: 12,
  } as React.CSSProperties,

  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    fontSize: 13,
  } as React.CSSProperties,

  statusDot: (open: boolean): React.CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: open ? COLORS.accentSuccess : COLORS.accentDanger,
    flexShrink: 0,
    boxShadow: open
      ? `0 0 6px ${COLORS.accentSuccess}`
      : `0 0 6px ${COLORS.accentDanger}`,
  }),

  statusText: (open: boolean): React.CSSProperties => ({
    fontWeight: 600,
    color: open ? COLORS.accentSuccess : COLORS.accentDanger,
  }),

  hoursText: {
    color: COLORS.textSecondary,
  } as React.CSSProperties,

  quickActions: {
    display: 'flex',
    gap: 8,
    marginBottom: 4,
  } as React.CSSProperties,

  actionBtn: (primary?: boolean): React.CSSProperties => ({
    flex: primary ? 1.5 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 12px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: primary ? 'none' : `1px solid ${COLORS.borderGlass}`,
    background: primary
      ? 'linear-gradient(135deg, #00ffcc 0%, #6366f1 100%)'
      : COLORS.bgTertiary,
    color: primary ? COLORS.bgPrimary : COLORS.textSecondary,
    transition: 'all 0.2s ease',
    boxShadow: primary
      ? `0 2px 12px rgba(0, 255, 204, 0.25)`
      : 'none',
  }),

  // ── Expanded section styles ────

  section: {
    padding: '14px 0',
    borderTop: `1px solid ${COLORS.borderGlass}`,
  } as React.CSSProperties,

  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    marginBottom: 8,
  } as React.CSSProperties,

  sectionBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 1.6,
  } as React.CSSProperties,

  hoursTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  } as React.CSSProperties,

  hoursRow: (isToday: boolean): React.CSSProperties => ({
    color: isToday ? COLORS.accentPrimary : COLORS.textSecondary,
    fontWeight: isToday ? 600 : 400,
  }),

  hoursDayCell: {
    padding: '4px 0',
    textAlign: 'left' as const,
    width: '35%',
  } as React.CSSProperties,

  hoursTimeCell: {
    padding: '4px 0',
    textAlign: 'right' as const,
  } as React.CSSProperties,

  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 1.65,
  } as React.CSSProperties,

  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  } as React.CSSProperties,

  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    background: COLORS.bgTertiary,
    border: `1px solid ${COLORS.borderGlass}`,
    borderRadius: 9999,
    fontSize: 12,
    color: COLORS.textSecondary,
  } as React.CSSProperties,

  navButton: {
    width: '100%',
    padding: '14px 24px',
    borderRadius: 14,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: 'linear-gradient(135deg, #00ffcc 0%, #6366f1 100%)',
    color: COLORS.bgPrimary,
    boxShadow: '0 4px 20px rgba(0, 255, 204, 0.3), 0 0 40px rgba(0, 255, 204, 0.1)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  } as React.CSSProperties,

  arButton: {
    width: '100%',
    padding: '12px 24px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${COLORS.borderGlass}`,
    background: COLORS.bgTertiary,
    color: COLORS.textPrimary,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  } as React.CSSProperties,

  phoneLink: {
    color: COLORS.accentPrimary,
    textDecoration: 'none',
    fontWeight: 500,
  } as React.CSSProperties,
} as const;

// ── Component ───────────────────────────────────────────────

/**
 * POIDetailCard — 2GIS-style business detail card.
 *
 * Collapsed view shows: icon, name, category/floor badges, rating, open status, quick actions.
 * Expanded view adds: location, full hours, phone, description, tags, navigation CTA.
 */
const POIDetailCard: React.FC<POIDetailCardProps> = ({
  poi,
  isExpanded,
  onNavigate,
  onARView,
  onClose,
}) => {
  // ── Memoized computations ───────────────────────────────

  const icon = poi.icon || CATEGORY_ICONS[poi.category] || '📍';
  const categoryLabel = CATEGORY_LABELS[poi.category] || poi.category;

  const openStatus = useMemo(() => isCurrentlyOpen(poi.openingHours), [poi.openingHours]);
  const starsText = useMemo(() => poi.rating ? renderStars(poi.rating) : null, [poi.rating]);
  const currentDayKey = useMemo(() => getCurrentDayKey(), []);

  const floorLabel = poi.floor !== undefined ? `Floor ${poi.floor}` : null;

  // ── Handlers ────────────────────────────────────────────

  const handleNavigate = () => onNavigate(poi);
  const handleCall = () => {
    if (poi.phone) {
      window.open(`tel:${poi.phone}`, '_self');
    }
  };
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: poi.name,
        text: `Check out ${poi.name} on Inmap`,
        url: window.location.href,
      }).catch(() => { /* cancelled */ });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard?.writeText(`${poi.name} — ${window.location.href}`);
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* ═══ COLLAPSED VIEW ═══ */}

      {/* Row 1: Icon + Name + Close */}
      <div style={styles.header}>
        <div style={styles.iconWrapper}>{icon}</div>
        <div style={styles.headerText}>
          <div style={styles.name} title={poi.name}>{poi.name}</div>
        </div>
        <button
          style={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
          title="Close"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.bgTertiary;
            e.currentTarget.style.color = COLORS.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = COLORS.textMuted;
          }}
        >
          ✕
        </button>
      </div>

      {/* Row 2: Category + Floor + Rating */}
      <div style={styles.badgeRow}>
        <span style={styles.chipAccent}>{categoryLabel}</span>
        {floorLabel && <span style={styles.chip}>{floorLabel}</span>}
        {poi.rating !== undefined && (
          <span style={styles.ratingRow}>
            <span style={styles.stars}>{starsText}</span>
            <span style={styles.ratingNumber}>{poi.rating.toFixed(1)}</span>
            {poi.reviewCount !== undefined && (
              <span style={styles.ratingCount}> · {poi.reviewCount} reviews</span>
            )}
          </span>
        )}
      </div>

      {/* Row 3: Open/Closed status */}
      {poi.openingHours && (
        <div style={styles.statusRow}>
          <div style={styles.statusDot(openStatus.open)} />
          <span style={styles.statusText(openStatus.open)}>
            {openStatus.open ? 'Open' : 'Closed'}
          </span>
          <span style={styles.hoursText}>· {openStatus.todayHours}</span>
        </div>
      )}

      {/* Row 4: Quick action buttons */}
      <div style={styles.quickActions}>
        <button style={styles.actionBtn(true)} onClick={handleNavigate}>
          🧭 Route
        </button>
        <button
          style={styles.actionBtn(false)}
          onClick={handleCall}
          disabled={!poi.phone}
          title={poi.phone || 'No phone'}
        >
          📞 Call
        </button>
        <button style={styles.actionBtn(false)} onClick={handleShare}>
          🔗 Share
        </button>
      </div>

      {/* ═══ EXPANDED VIEW ═══ */}
      {isExpanded && (
        <div style={{ marginTop: 4 }}>

          {/* 📍 Location */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📍 Location</div>
            <div style={styles.sectionBody}>
              {floorLabel && <span>{floorLabel}</span>}
              {poi.regionId && (
                <span>{floorLabel ? ' · ' : ''}Region: {poi.regionId}</span>
              )}
              {poi.entranceNote && (
                <div style={{ marginTop: 4, fontStyle: 'italic', color: COLORS.textMuted }}>
                  {poi.entranceNote}
                </div>
              )}
            </div>
          </div>

          {/* 🕐 Opening Hours */}
          {poi.openingHours && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>🕐 Hours</div>
              <table style={styles.hoursTable}>
                <tbody>
                  {DAY_KEYS.map(day => {
                    const isToday = day === currentDayKey;
                    const hours = poi.openingHours?.[day] || 'Closed';
                    return (
                      <tr key={day} style={styles.hoursRow(isToday)}>
                        <td style={styles.hoursDayCell}>
                          {isToday ? `▸ ${DAY_LABELS[day]}` : DAY_LABELS[day]}
                        </td>
                        <td style={styles.hoursTimeCell}>{hours}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 📞 Phone */}
          {poi.phone && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📞 Contact</div>
              <div style={styles.sectionBody}>
                <a href={`tel:${poi.phone}`} style={styles.phoneLink}>
                  {poi.phone}
                </a>
                {poi.email && (
                  <div style={{ marginTop: 4 }}>
                    <a href={`mailto:${poi.email}`} style={styles.phoneLink}>
                      {poi.email}
                    </a>
                  </div>
                )}
                {poi.website && (
                  <div style={{ marginTop: 4 }}>
                    <a
                      href={poi.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.phoneLink}
                    >
                      {poi.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 📝 Description */}
          {poi.description && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📝 About</div>
              <p style={styles.description}>{poi.description}</p>
            </div>
          )}

          {/* 🏷️ Tags */}
          {poi.tags && poi.tags.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>🏷️ Features</div>
              <div style={styles.tagsRow}>
                {poi.tags.map(tag => (
                  <span key={tag} style={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* 🧭 Start Navigation button */}
          <div style={{ ...styles.section, borderTop: 'none', paddingTop: 8 }}>
            <button
              style={styles.navButton}
              onClick={handleNavigate}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 255, 204, 0.4), 0 0 50px rgba(0, 255, 204, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 255, 204, 0.3), 0 0 40px rgba(0, 255, 204, 0.1)';
              }}
            >
              🧭 Start Navigation
            </button>

            {/* 🔮 AR View button (secondary) */}
            <button
              style={styles.arButton}
              onClick={onARView}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = COLORS.borderAccent;
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 204, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.borderGlass;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🔮 Open AR View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POIDetailCard;

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../utils/constants';
import { useNavigationStore } from '../store/navigationStore';
import { QR_ANCHORS, findAnchorByPayload } from '../data/qrAnchors';
import type { QRAnchor } from '../types/index';

// ── Injected keyframes ────────────────────────────────────────
const SCANNER_KEYFRAMES = `
@keyframes scan-sweep {
  0%   { top: 0%; }
  50%  { top: 92%; }
  100% { top: 0%; }
}
@keyframes bracket-pulse {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1; }
}
@keyframes success-scale {
  0%   { transform: scale(0); opacity: 0; }
  50%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes success-ripple {
  0%   { transform: scale(0.5); opacity: 0.7; }
  100% { transform: scale(3); opacity: 0; }
}
`;

/** Corner bracket style for viewfinder corners. */
const bracketStyle = (
  top: boolean,
  left: boolean,
): React.CSSProperties => ({
  position: 'absolute',
  width: 36,
  height: 36,
  borderColor: COLORS.accentPrimary,
  borderStyle: 'solid',
  borderWidth: 0,
  ...(top ? { top: -2 } : { bottom: -2 }),
  ...(left ? { left: -2 } : { right: -2 }),
  ...(top && left && { borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 }),
  ...(top && !left && { borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 }),
  ...(!top && left && { borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 }),
  ...(!top && !left && { borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 }),
  animation: 'bracket-pulse 2s ease-in-out infinite',
});

/**
 * QRScanner — simulated QR code scanner screen.
 *
 * Displays an animated viewfinder reticle with scanning line,
 * and a grid of selectable QR anchor buttons (simulation mode).
 * On selection, plays a success animation then navigates to /search.
 */
const QRScanner: React.FC = () => {
  const navigate = useNavigate();
  const scanQRCode = useNavigationStore((s) => s.scanQRCode);
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Real camera scanning (html5-qrcode) with graceful fallback ──
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  // Holds the Html5Qrcode instance so we can stop/clear it on cleanup.
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    const id = 'scanner-keyframes';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = SCANNER_KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  /** Resolve a decoded QR string to an anchor and run the scan flow. */
  const onDecode = useCallback(
    (decodedText: string) => {
      if (handledRef.current) return;
      // The QR may encode the raw payload or a URL ending in the payload.
      const candidates = [decodedText.trim(), decodedText.trim().split('/').pop() ?? ''];
      let anchor: QRAnchor | undefined;
      for (const c of candidates) {
        anchor = findAnchorByPayload(c);
        if (anchor) break;
      }
      if (!anchor) {
        setCameraError(`Unrecognized code: ${decodedText.slice(0, 32)}`);
        return;
      }
      handledRef.current = true;
      setScannedId(anchor.id);
      scanQRCode(anchor.qrPayload);
      setShowSuccess(true);
      setTimeout(() => navigate('/'), 1100);
    },
    [navigate, scanQRCode],
  );

  // Start/stop the camera scanner when toggled.
  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    setCameraError(null);
    handledRef.current = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const instance = new Html5Qrcode('qr-reader');
        scannerRef.current = instance;
        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          (decodedText: string) => onDecode(decodedText),
          () => {
            /* per-frame decode misses are normal; ignore */
          },
        );
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            'Could not access the camera. Check permissions or use simulation mode below.',
          );
          setCameraOn(false);
        }
        console.warn('[qr] camera start failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      const inst = scannerRef.current;
      scannerRef.current = null;
      if (inst) {
        inst
          .stop()
          .then(() => inst.clear())
          .catch(() => {
            /* already stopped */
          });
      }
    };
  }, [cameraOn, onDecode]);

  /** Handle anchor selection: scan, show success, then navigate. */
  const handleScan = useCallback(
    (anchor: QRAnchor) => {
      if (showSuccess) return; // prevent double-click
      setScannedId(anchor.id);
      scanQRCode(anchor.qrPayload);
      setShowSuccess(true);
      setTimeout(() => navigate('/'), 1100);
    },
    [navigate, scanQRCode, showSuccess],
  );

  return (
    <div className="full-screen no-select" style={{ background: COLORS.bgPrimary, display: 'flex', flexDirection: 'column' }}>
      {/* ── Back Button ─────────────────────────────────────── */}
      <button
        className="btn btn-ghost"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 20,
          fontSize: '1.4rem',
          color: COLORS.textPrimary,
        }}
        onClick={() => navigate('/')}
        aria-label="Back to dashboard"
      >
        ← Back
      </button>

      {/* ── Viewfinder Area ─────────────────────────────────── */}
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 72,
          paddingBottom: 24,
        }}
      >
        <div style={{ position: 'relative', width: 240, height: 240 }}>
          {/* Real camera feed (html5-qrcode injects a <video> here) */}
          <div
            id="qr-reader"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 8,
              overflow: 'hidden',
              display: cameraOn ? 'block' : 'none',
              background: '#000',
            }}
          />
          {/* Dark surrounding vignette */}
          <div
            style={{
              position: 'absolute',
              inset: -40,
              background: `radial-gradient(circle, transparent 45%, ${COLORS.bgPrimary} 75%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Corner brackets */}
          <div style={bracketStyle(true, true)} />
          <div style={bracketStyle(true, false)} />
          <div style={bracketStyle(false, true)} />
          <div style={bracketStyle(false, false)} />

          {/* Scan line */}
          <div
            style={{
              position: 'absolute',
              left: 4,
              right: 4,
              height: 2,
              background: `linear-gradient(90deg, transparent 0%, ${COLORS.accentPrimary} 30%, ${COLORS.accentPrimary} 70%, transparent 100%)`,
              boxShadow: `0 0 12px ${COLORS.accentPrimary}`,
              animation: 'scan-sweep 2.6s ease-in-out infinite',
            }}
          />

          {/* Success overlay */}
          {showSuccess && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Ripple */}
              <div
                style={{
                  position: 'absolute',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  border: `3px solid ${COLORS.accentSuccess}`,
                  animation: 'success-ripple 0.8s ease-out forwards',
                }}
              />
              {/* Checkmark */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: COLORS.accentSuccess,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  color: '#fff',
                  animation: 'success-scale 0.5s ease-out forwards',
                  boxShadow: `0 0 30px ${COLORS.accentSuccess}`,
                }}
              >
                ✓
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Instruction ─────────────────────────────────────── */}
      <p
        style={{
          textAlign: 'center',
          color: COLORS.textSecondary,
          fontSize: '0.9rem',
          marginBottom: 20,
          padding: '0 24px',
        }}
      >
        {showSuccess ? 'Anchor scanned successfully!' : 'Point camera at a QR code anchor'}
      </p>

      {/* ── Camera toggle + errors ──────────────────────────── */}
      {!showSuccess && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 18, padding: '0 24px' }}>
          <button
            className="btn"
            style={{
              background: cameraOn ? 'rgba(239,68,68,0.15)' : COLORS.accentPrimary,
              color: cameraOn ? COLORS.accentDanger ?? '#ef4444' : '#0a0e1a',
              fontWeight: 600,
              padding: '10px 18px',
              borderRadius: 10,
            }}
            onClick={() => setCameraOn((v) => !v)}
          >
            {cameraOn ? '■ Stop camera' : '📷 Use camera'}
          </button>
          {cameraError && (
            <span style={{ color: COLORS.accentWarning, fontSize: '0.78rem', textAlign: 'center' }}>
              {cameraError}
            </span>
          )}
        </div>
      )}

      {/* ── Simulation Anchor Grid ──────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <span
            className="badge"
            style={{
              background: 'rgba(245,158,11,0.12)',
              color: COLORS.accentWarning,
              fontSize: '0.65rem',
            }}
          >
            SIM MODE
          </span>
          <span style={{ color: COLORS.textMuted, fontSize: '0.8rem' }}>
            Tap an anchor to simulate scanning
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {QR_ANCHORS.map((anchor) => {
            const isSelected = scannedId === anchor.id;
            return (
              <button
                key={anchor.id}
                className="glass-card"
                style={{
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  textAlign: 'left',
                  cursor: showSuccess ? 'default' : 'pointer',
                  borderColor: isSelected ? COLORS.accentSuccess : undefined,
                  opacity: showSuccess && !isSelected ? 0.4 : 1,
                  transition: 'all 0.3s ease',
                }}
                onClick={() => handleScan(anchor)}
                disabled={showSuccess}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>⣿</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: COLORS.accentPrimary,
                      wordBreak: 'break-all',
                    }}
                  >
                    {anchor.id}
                  </span>
                </div>
                <span style={{ fontSize: '0.85rem', color: COLORS.textSecondary }}>
                  {anchor.description ?? 'QR Anchor'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;

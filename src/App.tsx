// ============================================================
// Inmap v2 — Application Root
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapExplorer from './components/MapExplorer';
import QRScanner from './components/QRScanner';
import ARNavigationView from './components/ARNavigationView';

/**
 * App — root component with React Router.
 *
 * Routes:
 *  /      → MapExplorer (2GIS-style map home — primary view)
 *  /scan  → QRScanner (QR code anchor scanning)
 *  /ar    → ARNavigationView (optional 3D first-person AR mode)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapExplorer />} />
        <Route path="/scan" element={<QRScanner />} />
        <Route path="/ar" element={<ARNavigationView />} />
      </Routes>
    </BrowserRouter>
  );
}

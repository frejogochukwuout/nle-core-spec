import { VariantProvider } from './components/debug/VariantProvider';
import { DebugOverlay } from './components/debug/DebugOverlay';
import { CheatSheet } from './components/shell/CheatSheet';
import { AppShell } from './components/shell/AppShell';

/** Window-too-small overlay — spec 18 §3.2: below 1280×800 show an overlay
 *  rather than degrade. */
function TooSmall() {
  return (
    <div className="window-too-small fixed inset-0 z-[95] flex-col items-center justify-center gap-2 bg-app/95 text-center backdrop-blur-sm">
      <span className="text-[16px] font-semibold text-tprimary">Window too small</span>
      <span className="text-[12px] text-tmuted">The editor needs at least 1280 × 800.</span>
      <span className="mono text-[10.5px] text-tfaint">spec 18 §3.2 — overlay, not degradation</span>
    </div>
  );
}

export default function App() {
  return (
    <VariantProvider>
      <AppShell />
      <DebugOverlay />
      <CheatSheet />
      <TooSmall />
    </VariantProvider>
  );
}

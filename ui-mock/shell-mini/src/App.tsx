import { Topbar } from './shell/Topbar';
import { MediaPool } from './shell/MediaPool';
import { Viewer } from './shell/Viewer';
import { Inspector } from './shell/Inspector';
import { ToastRegion } from './shell/ToastRegion';
import { Timeline } from './timeline/Timeline';
import { usePlayhead } from './hooks/usePlayhead';
import { useKeys } from './hooks/useKeys';

export default function App() {
  usePlayhead();
  useKeys();

  return (
    <div className="mini-root" data-testid="mini-root">
      <Topbar />
      <div className="mini-main">
        <MediaPool />
        <Viewer />
        <Inspector />
      </div>
      <Timeline />
      <ToastRegion />
    </div>
  );
}

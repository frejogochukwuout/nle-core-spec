import React from 'react';

// --- Icons ---
const FilmIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
    <line x1="7" y1="2" x2="7" y2="22"></line>
    <line x1="17" y1="2" x2="17" y2="22"></line>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <line x1="2" y1="7" x2="7" y2="7"></line>
    <line x1="2" y1="17" x2="7" y2="17"></line>
    <line x1="17" y1="17" x2="22" y2="17"></line>
    <line x1="17" y1="7" x2="22" y2="7"></line>
  </svg>
);

const MusicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const WandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 18l4.5-4.5"></path>
    <path d="M14 6l4.5-4.5"></path>
    <path d="M9 13l4.5-4.5"></path>
    <path d="M19.5 9l-4.5-4.5"></path>
    <path d="M21 21l-3-3"></path>
    <path d="M8.5 4a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"></path>
    <path d="M4 8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
  </svg>
);

const TransitionIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14l6-6 6 6"></path>
    <path d="M4 20l6-6 6 6"></path>
  </svg>
);

const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const DiamondIcon = ({ active }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill={active ? "#ff4040" : "#888"} stroke={active ? "#ff4040" : "#888"} strokeWidth="1">
    <polygon points="12,2 22,12 12,22 2,12" />
  </svg>
);

const ResetIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transform -rotate-90">
    <path d="M21.5 2v6h-6M2.1 13.4A10 10 0 1 1 5.3 21l2.4-2.4"></path>
  </svg>
);

const ResetPlusIcon = () => (
  <div className="relative flex items-center justify-center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transform -rotate-90">
       <path d="M21.5 2v6h-6M2.1 13.4A10 10 0 1 1 5.3 21l2.4-2.4"></path>
    </svg>
    <span className="absolute text-[8px] text-[#888] font-bold mt-[1px] ml-[1px]">+</span>
  </div>
);

const LinkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d0d0d0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const CaretIcon = ({ expanded }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s' }}>
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const FlipHorizontalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
    <path d="M12 2v20M8 7l-4 5 4 5V7zM16 7l4 5-4 5V7z" />
  </svg>
);

const FlipVerticalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
    <path d="M2 12h20M7 8l5-4 5 4H7zM7 16l5 4 5-4H7z" />
  </svg>
);

// --- Components ---

const Toggle = ({ active }) => (
  <div className="w-[22px] h-[10px] rounded-full bg-[#111] border border-[#2a2a2a] relative flex items-center px-[1px] cursor-pointer">
    <div className={`w-[6px] h-[6px] rounded-full shadow-sm transition-all duration-200 ${active ? 'bg-[#ff3333] translate-x-0' : 'bg-[#555] translate-x-0'}`} />
  </div>
);

const NavTab = ({ icon, label, active }) => (
  <div className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 cursor-pointer relative ${active ? 'text-[#e0e0e0]' : 'text-[#666] hover:text-[#999]'}`}>
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] tracking-wide">{label}</span>
    {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff4444]" />}
  </div>
);

const SectionHeader = ({ title, active, hasToggle = true, expanded = true, hasKeyframe = true, hasReset = true }) => (
  <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#222] bg-[#1e1e1e] cursor-pointer hover:bg-[#252525]">
    <div className="flex items-center space-x-2">
      {hasToggle ? (
        <div className="w-3 flex justify-center"><Toggle active={active} /></div>
      ) : (
        <div className="w-3 flex justify-center"><CaretIcon expanded={expanded} /></div>
      )}
      <span className="text-[12px] font-medium text-[#d0d0d0] tracking-wide">{title}</span>
    </div>
    <div className="flex items-center space-x-3 pr-1">
      {hasKeyframe && <DiamondIcon active={false} />}
      {hasReset && <ResetPlusIcon />}
    </div>
  </div>
);

const ControlRow = ({ label, children, hasKeyframe = true, hasReset = true }) => (
  <div className="flex items-center px-2 py-1 hover:bg-[#222]">
    <div className="w-24 text-right pr-3 text-[11px] text-[#888]">{label}</div>
    <div className="flex-1 flex items-center h-[22px]">
      {children}
    </div>
    <div className="w-10 flex items-center justify-end space-x-2 pr-1">
      {hasKeyframe && <DiamondIcon active={false} />}
      {hasReset && <ResetIcon />}
    </div>
  </div>
);

const InputNumber = ({ label, value, width = "w-14" }) => (
  <div className="flex items-center space-x-1.5">
    {label && <span className="text-[11px] text-[#888]">{label}</span>}
    <input 
      type="text" 
      value={value} 
      readOnly
      className={`${width} h-[20px] bg-[#161616] border border-[#000] text-[#d0d0d0] text-[11px] font-mono text-right px-1.5 rounded-sm focus:outline-none focus:border-[#444]`}
    />
  </div>
);

const Slider = ({ value = 50 }) => (
  <div className="flex-1 relative flex items-center h-full group cursor-pointer mr-3">
    <div className="absolute w-full h-[2px] bg-gradient-to-r from-[#333] to-[#111] rounded-full border-t border-[#000]" />
    <div className="absolute w-2 h-2 bg-[#999] rounded-full group-hover:bg-[#ccc]" style={{ left: `${value}%`, transform: 'translateX(-50%)' }} />
  </div>
);

const SegmentedSlider = ({ value }) => (
  <div className="flex-1 h-[14px] bg-[#111] border border-[#000] rounded-sm relative overflow-hidden mr-3">
    {/* Tick marks pattern */}
    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #444 2px, #444 4px)' }}></div>
    {/* Fill overlay */}
    <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-transparent to-[#ffffff15]" style={{ width: value }}></div>
  </div>
);


const App = () => {
  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-8">
      {/* Main Panel Container */}
      <div className="w-[340px] bg-[#1d1d1f] border border-[#111] shadow-2xl rounded-sm overflow-hidden flex flex-col font-sans select-none pb-20">
        
        {/* Navigation Tabs */}
        <div className="flex bg-[#232325] border-b border-[#111]">
          <NavTab active icon={<FilmIcon />} label="Video" />
          <NavTab icon={<MusicIcon />} label="Audio" />
          <NavTab icon={<WandIcon />} label="Effects" />
          <NavTab icon={<TransitionIcon />} label="Transition" />
          <NavTab icon={<ImageIcon />} label="Image" />
          <NavTab icon={<FileIcon />} label="File" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* --- Transform Section --- */}
          <div>
            <SectionHeader title="Transform" active={true} />
            <div className="py-2 bg-[#1c1d1f]">
              <ControlRow label="Zoom">
                <InputNumber label="X" value="1.000" />
                <div className="px-2 flex items-center justify-center"><LinkIcon /></div>
                <InputNumber label="Y" value="1.000" />
              </ControlRow>
              <ControlRow label="Position">
                <InputNumber label="X" value="0.000" />
                <div className="px-5"></div>
                <InputNumber label="Y" value="0.000" />
              </ControlRow>
              <ControlRow label="Rotation Angle">
                <Slider value={30} />
                <InputNumber value="0.000" />
              </ControlRow>
              <ControlRow label="Anchor Point">
                <InputNumber label="X" value="0.000" />
                <div className="px-5"></div>
                <InputNumber label="Y" value="0.000" />
              </ControlRow>
              <ControlRow label="Pitch">
                <Slider value={50} />
                <InputNumber value="0.000" />
              </ControlRow>
              <ControlRow label="Yaw">
                <Slider value={50} />
                <InputNumber value="0.000" />
              </ControlRow>
              <ControlRow label="Flip" hasKeyframe={false}>
                <div className="flex space-x-1">
                  <div className="w-6 h-5 bg-[#161616] border border-[#000] rounded-sm flex items-center justify-center cursor-pointer hover:bg-[#222]">
                    <FlipHorizontalIcon />
                  </div>
                  <div className="w-6 h-5 bg-[#161616] border border-[#000] rounded-sm flex items-center justify-center cursor-pointer hover:bg-[#222]">
                    <FlipVerticalIcon />
                  </div>
                </div>
              </ControlRow>
            </div>
          </div>

          {/* --- AI Smart Reframe Section --- */}
          <SectionHeader title="AI Smart Reframe" hasToggle={false} expanded={false} hasKeyframe={false} hasReset={false} />

          {/* --- Cropping Section --- */}
          <SectionHeader title="Cropping" active={true} expanded={false} />

          {/* --- Dynamic Zoom Section --- */}
          <SectionHeader title="Dynamic Zoom" active={false} expanded={false} />

          {/* --- Composite Section --- */}
          <div>
            <SectionHeader title="Composite" active={true} />
            <div className="py-2 bg-[#1c1d1f]">
              <ControlRow label="Composite Mode" hasKeyframe={false}>
                <div className="flex-1 h-[20px] bg-[#161616] border border-[#000] rounded-sm flex items-center justify-between px-2 cursor-pointer mr-3">
                  <span className="text-[11px] text-[#d0d0d0]">Normal</span>
                  <CaretIcon expanded={false} />
                </div>
              </ControlRow>
              <ControlRow label="Opacity">
                <Slider value={100} />
                <InputNumber value="100.00" />
              </ControlRow>
            </div>
          </div>

          {/* --- Speed Change Section --- */}
          <div>
            <SectionHeader title="Speed Change" active={true} />
            <div className="py-2 bg-[#1c1d1f]">
              <ControlRow label="Direction" hasKeyframe={false} hasReset={false}>
                <div className="flex space-x-3 text-[#555]">
                  {/* Forward (Active) */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d0d0d0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7"></polyline>
                    <polyline points="6 17 11 12 6 7"></polyline>
                  </svg>
                  {/* Reverse */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="11 17 6 12 11 7"></polyline>
                    <polyline points="18 17 13 12 18 7"></polyline>
                  </svg>
                  {/* Freeze */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <line x1="2" y1="12" x2="22" y2="12"></line>
                     <line x1="12" y1="2" x2="12" y2="22"></line>
                     <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                     <line x1="4.93" y1="19.07" x2="19.07" y2="4.93"></line>
                  </svg>
                </div>
              </ControlRow>
              <ControlRow label="Ease">
                <div className="flex-1 h-[20px] bg-[#1a1a1a] border border-[#111] rounded-sm flex items-center justify-between px-2 mr-3 opacity-50 cursor-not-allowed">
                  <span className="text-[11px] text-[#666]">Linear</span>
                  <CaretIcon expanded={false} />
                </div>
              </ControlRow>
              <ControlRow label="Change Speed">
                <SegmentedSlider value="80%" />
                <InputNumber value="100.00" />
              </ControlRow>
              <ControlRow label="Frames per Second">
                <SegmentedSlider value="60%" />
                <InputNumber value="59.940" />
              </ControlRow>
              <ControlRow label="Duration" hasKeyframe={false} hasReset={false}>
                <input 
                  type="text" 
                  value="00:00:03:06" 
                  readOnly
                  className="w-[100px] h-[20px] bg-[#161616] border border-[#000] text-[#d0d0d0] text-[11px] font-mono px-2 rounded-sm focus:outline-none"
                />
              </ControlRow>
              <div className="flex items-center px-2 py-1 mt-1">
                 <div className="w-24 text-right pr-3"></div>
                 <div className="flex-1 flex items-center opacity-40 cursor-not-allowed">
                   <div className="w-3 h-3 border border-[#555] rounded-sm flex items-center justify-center mr-2 bg-[#111]">
                     <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   </div>
                   <span className="text-[11px] text-[#666]">Pitch Correction</span>
                 </div>
              </div>
            </div>
          </div>

          {/* --- Stabilization Section --- */}
          <div>
            <SectionHeader title="Stabilization" active={true} />
            <div className="py-3 bg-[#1c1d1f] flex justify-center">
              <button className="bg-[#2a2a2a] hover:bg-[#333] text-[#d0d0d0] text-[11px] py-1 px-8 rounded-sm border border-[#111] shadow-sm">
                Stabilize
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;
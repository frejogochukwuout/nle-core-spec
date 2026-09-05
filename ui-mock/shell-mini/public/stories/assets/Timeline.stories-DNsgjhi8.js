import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{i as n,n as r,r as i}from"./iframe-1PPqCC_e.js";import{n as a,t as o}from"./Timeline-CsjSqQHU.js";function s({patch:e}){return(0,l.useLayoutEffect)(()=>{e&&n.setState(e)},[]),null}function c({children:e,patch:t}){return(0,u.jsxs)(`div`,{style:{background:`#0d0d0d`,height:`100vh`,padding:24,boxSizing:`border-box`,backgroundImage:`radial-gradient(#383838 1px, transparent 1px)`,backgroundSize:`24px 24px`},children:[(0,u.jsx)(s,{patch:t}),(0,u.jsx)(`div`,{style:{maxWidth:1400,margin:`0 auto`},children:e})]})}var l,u,d,f,p,m,h,g,_,v,y,b,x,S,C;function w(){return(w=e((()=>{l=t(),a(),i(),u=r(),d={title:`Timeline`},f={name:`Timeline — default (48pps, seed)`,render:()=>(0,u.jsx)(c,{children:(0,u.jsx)(o,{})})},p={name:`Timeline — zoom 0 (24pps overview)`,render:()=>(0,u.jsx)(c,{patch:{zoomStep:0},children:(0,u.jsx)(o,{})})},m={name:`Timeline — zoom 2 (96pps)`,render:()=>(0,u.jsx)(c,{patch:{zoomStep:2},children:(0,u.jsx)(o,{})})},h={name:`Timeline — zoom 3 (192pps)`,render:()=>(0,u.jsx)(c,{patch:{zoomStep:3},children:(0,u.jsx)(o,{})})},g={name:`Timeline — zoom 4 (384pps, scrollable)`,render:()=>(0,u.jsx)(c,{patch:{zoomStep:4},children:(0,u.jsx)(o,{})})},_={name:`Timeline — scrolled mid-document (zoom 4)`,render:()=>(0,u.jsx)(c,{patch:{zoomStep:4,playhead:6.25},children:(0,u.jsx)(o,{})}),play:async()=>{let e=document.querySelector(`[data-testid="mini-timeline-scroll"]`);e&&(e.scrollLeft=2400)}},v={name:`Timeline — clip selected (selection ring)`,render:()=>(0,u.jsx)(c,{patch:{selectedId:`c2`},children:(0,u.jsx)(o,{})})},y={name:`Timeline — audio clip selected (waveform body)`,render:()=>(0,u.jsx)(c,{patch:{selectedId:`c4`,playhead:4},children:(0,u.jsx)(o,{})})},b={name:`Timeline — playhead mid-doc (time pill on hover)`,render:()=>(0,u.jsx)(c,{patch:{playhead:5.25},children:(0,u.jsx)(o,{})})},x={name:`Timeline — empty lanes`,render:()=>{let{doc:e}=n.getState();return(0,u.jsx)(c,{patch:{doc:{tracks:e.tracks,media:e.media,clips:[]},selectedId:null,playhead:0},children:(0,u.jsx)(o,{})})}},S={name:`Timeline — snap toggle off (magnet icon inactive)`,render:()=>(0,u.jsx)(c,{patch:{snapOn:!1},children:(0,u.jsx)(o,{})})},C=[`Default`,`Zoom0`,`Zoom2`,`Zoom3`,`Zoom4`,`Scrolled`,`ClipSelected`,`AudioFocus`,`PlayheadMid`,`EmptyLanes`,`SnapOffState`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — default (48pps, seed)',
  render: () => <Frame>
      <Timeline />
    </Frame>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — zoom 0 (24pps overview)',
  render: () => <Frame patch={{
    zoomStep: 0
  }}>
      <Timeline />
    </Frame>
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — zoom 2 (96pps)',
  render: () => <Frame patch={{
    zoomStep: 2
  }}>
      <Timeline />
    </Frame>
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — zoom 3 (192pps)',
  render: () => <Frame patch={{
    zoomStep: 3
  }}>
      <Timeline />
    </Frame>
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — zoom 4 (384pps, scrollable)',
  render: () => <Frame patch={{
    zoomStep: 4
  }}>
      <Timeline />
    </Frame>
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — scrolled mid-document (zoom 4)',
  render: () => <Frame patch={{
    zoomStep: 4,
    playhead: 6.25
  }}>
      <Timeline />
    </Frame>,
  /* scroll the shared wrapper to ~6s so ruler+lanes+playhead alignment
     under scroll is directly reviewable */
  play: async () => {
    const scroller = document.querySelector('[data-testid="mini-timeline-scroll"]') as HTMLElement | null;
    if (scroller) scroller.scrollLeft = 6.25 * 384;
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — clip selected (selection ring)',
  render: () => <Frame patch={{
    selectedId: 'c2'
  }}>
      <Timeline />
    </Frame>
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — audio clip selected (waveform body)',
  render: () => <Frame patch={{
    selectedId: 'c4',
    playhead: 4
  }}>
      <Timeline />
    </Frame>
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — playhead mid-doc (time pill on hover)',
  render: () => <Frame patch={{
    playhead: 5.25
  }}>
      <Timeline />
    </Frame>
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — empty lanes',
  render: () => {
    const {
      doc
    } = useMini.getState();
    return <Frame patch={{
      doc: {
        tracks: doc.tracks,
        media: doc.media,
        clips: []
      },
      selectedId: null,
      playhead: 0
    }}>
        <Timeline />
      </Frame>;
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  name: 'Timeline — snap toggle off (magnet icon inactive)',
  render: () => <Frame patch={{
    snapOn: false
  }}>
      <Timeline />
    </Frame>
}`,...S.parameters?.docs?.source}}}})))()}w();export{y as AudioFocus,v as ClipSelected,f as Default,x as EmptyLanes,b as PlayheadMid,_ as Scrolled,S as SnapOffState,p as Zoom0,m as Zoom2,h as Zoom3,g as Zoom4,C as __namedExportsOrder,d as default};
import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{i as n,n as r,r as i}from"./iframe-1PPqCC_e.js";import{a,c as o,i as s,n as c,o as l,r as u,s as d,t as f}from"./Inspector-BBQEWVmt.js";function p({patch:e}){return(0,h.useLayoutEffect)(()=>{e&&n.setState(e)},[]),null}function m({children:e,w:t=1400,h:n=900}){return(0,g.jsx)(`div`,{style:{background:`#0d0d0d`,backgroundImage:`radial-gradient(#383838 1px, transparent 1px)`,backgroundSize:`24px 24px`,width:`100%`,height:`100vh`,display:`flex`,alignItems:`flex-start`,justifyContent:`center`,paddingTop:48,boxSizing:`border-box`},children:(0,g.jsx)(`div`,{style:{width:t,height:n,display:`flex`,flexDirection:`column`,gap:16},children:e})})}var h,g,_,v,y,b,x,S,C,w,T,E,D;function O(){return(O=e((()=>{h=t(),o(),l(),s(),c(),i(),g=r(),_={title:`Regions`},v={name:`Topbar — default`,render:()=>(0,g.jsxs)(m,{h:56,children:[(0,g.jsx)(p,{}),(0,g.jsx)(d,{})]})},y={name:`Topbar — playing (pause icon)`,render:()=>(0,g.jsxs)(m,{h:56,children:[(0,g.jsx)(p,{patch:{playing:!0,playhead:4.2}}),(0,g.jsx)(d,{})]})},b={name:`Media pool — 4 seed assets`,render:()=>(0,g.jsxs)(m,{w:260,h:600,children:[(0,g.jsx)(p,{}),(0,g.jsx)(a,{})]})},x={name:`Viewer — clip under playhead (info bottom-left + play pill)`,render:()=>(0,g.jsxs)(m,{w:900,h:620,children:[(0,g.jsx)(p,{patch:{playhead:1}}),(0,g.jsx)(u,{})]})},S={name:`Viewer — playing (no play overlay)`,render:()=>(0,g.jsxs)(m,{w:900,h:620,children:[(0,g.jsx)(p,{patch:{playing:!0,playhead:2.7}}),(0,g.jsx)(u,{})]})},C={name:`Viewer — empty state (playhead past content)`,render:()=>(0,g.jsxs)(m,{w:900,h:620,children:[(0,g.jsx)(p,{patch:{playhead:12.5}}),(0,g.jsx)(u,{})]})},w={name:`Inspector — video clip selected`,render:()=>(0,g.jsxs)(m,{w:240,h:620,children:[(0,g.jsx)(p,{patch:{selectedId:`c2`}}),(0,g.jsx)(f,{})]})},T={name:`Inspector — audio clip selected (nudge at boundary)`,render:()=>(0,g.jsxs)(m,{w:240,h:620,children:[(0,g.jsx)(p,{patch:{selectedId:`c4`}}),(0,g.jsx)(f,{})]})},E={name:`Inspector — empty state`,render:()=>(0,g.jsxs)(m,{w:240,h:620,children:[(0,g.jsx)(p,{}),(0,g.jsx)(f,{})]})},D=[`TopbarDefault`,`TopbarPlaying`,`MediaPoolDefault`,`ViewerDefault`,`ViewerPlaying`,`ViewerEmpty`,`InspectorVideo`,`InspectorAudio`,`InspectorEmpty`],v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: 'Topbar — default',
  render: () => <Backdrop h={56}>
      <Boot />
      <Topbar />
    </Backdrop>
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: 'Topbar — playing (pause icon)',
  render: () => <Backdrop h={56}>
      <Boot patch={{
      playing: true,
      playhead: 4.2
    }} />
      <Topbar />
    </Backdrop>
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: 'Media pool — 4 seed assets',
  render: () => <Backdrop w={260} h={600}>
      <Boot />
      <MediaPool />
    </Backdrop>
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: 'Viewer — clip under playhead (info bottom-left + play pill)',
  render: () => <Backdrop w={900} h={620}>
      <Boot patch={{
      playhead: 1
    }} />
      <Viewer />
    </Backdrop>
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  name: 'Viewer — playing (no play overlay)',
  render: () => <Backdrop w={900} h={620}>
      <Boot patch={{
      playing: true,
      playhead: 2.7
    }} />
      <Viewer />
    </Backdrop>
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  name: 'Viewer — empty state (playhead past content)',
  render: () => <Backdrop w={900} h={620}>
      <Boot patch={{
      playhead: 12.5
    }} />
      <Viewer />
    </Backdrop>
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: 'Inspector — video clip selected',
  render: () => <Backdrop w={240} h={620}>
      <Boot patch={{
      selectedId: 'c2'
    }} />
      <Inspector />
    </Backdrop>
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  name: 'Inspector — audio clip selected (nudge at boundary)',
  render: () => <Backdrop w={240} h={620}>
      <Boot patch={{
      selectedId: 'c4'
    }} />
      <Inspector />
    </Backdrop>
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  name: 'Inspector — empty state',
  render: () => <Backdrop w={240} h={620}>
      <Boot />
      <Inspector />
    </Backdrop>
}`,...E.parameters?.docs?.source}}}})))()}O();export{T as InspectorAudio,E as InspectorEmpty,w as InspectorVideo,b as MediaPoolDefault,v as TopbarDefault,y as TopbarPlaying,x as ViewerDefault,C as ViewerEmpty,S as ViewerPlaying,D as __namedExportsOrder,_ as default};
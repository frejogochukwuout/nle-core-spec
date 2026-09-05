import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{i as n,n as r,r as i}from"./iframe-1PPqCC_e.js";import{a,c as o,i as s,n as c,o as l,r as u,s as d,t as f}from"./Inspector-BBQEWVmt.js";import{n as p,t as m}from"./ToastRegion-cQhR5j5D.js";import{n as h,t as g}from"./Timeline-CsjSqQHU.js";function _(){let e=n(e=>e.playing),t=n(e=>e.tick),r=(0,v.useRef)(0),i=(0,v.useRef)(0);(0,v.useEffect)(()=>{if(!e)return;i.current=performance.now();let n=e=>{let a=Math.min((e-i.current)/1e3,.1);i.current=e,t(a),r.current=requestAnimationFrame(n)};return r.current=requestAnimationFrame(n),()=>cancelAnimationFrame(r.current)},[e,t])}var v;function y(){return(y=e((()=>{v=t(),i()})))()}function b(){(0,x.useEffect)(()=>{let e=e=>{let t=e.target;if(t&&(t.tagName===`INPUT`||t.tagName===`TEXTAREA`||t.isContentEditable))return;let r=n.getState();if(e.key===`Escape`){r.dragActive?r.cancelDrag():r.select(null),e.preventDefault();return}if(!r.dragActive){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()===`z`){e.preventDefault(),e.shiftKey?r.redo():r.undo();return}switch(e.key){case` `:e.preventDefault(),r.togglePlay();break;case`s`:case`S`:e.preventDefault(),r.splitAtPlayhead();break;case`Delete`:case`Backspace`:e.preventDefault(),r.deleteSelected();break;case`+`:case`=`:e.preventDefault(),r.zoomIn();break;case`-`:case`_`:e.preventDefault(),r.zoomOut();break;case`0`:e.preventDefault(),r.setZoomStep(1)}}};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[])}var x;function S(){return(S=e((()=>{x=t(),i()})))()}function C(){return _(),b(),(0,w.jsxs)(`div`,{className:`mini-root`,"data-testid":`mini-root`,children:[(0,w.jsx)(d,{}),(0,w.jsxs)(`div`,{className:`mini-main`,children:[(0,w.jsx)(a,{}),(0,w.jsx)(u,{}),(0,w.jsx)(f,{})]}),(0,w.jsx)(g,{}),(0,w.jsx)(m,{})]})}var w;function T(){return(T=e((()=>{o(),l(),s(),c(),p(),h(),y(),S(),w=r(),C.__docgenInfo={description:``,methods:[],displayName:`App`}})))()}function E({patch:e}){return(0,O.useLayoutEffect)(()=>{e&&n.setState(e)},[]),null}function D({patch:e}){return(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(E,{patch:e}),(0,k.jsx)(C,{})]})}var O,k,A,j,M,N,P,F,I,L;function R(){return(R=e((()=>{O=t(),T(),i(),k=r(),A={title:`Shell`},j={name:`Shell — default (seed)`,render:()=>(0,k.jsx)(D,{})},M={name:`Shell — zoomed in (96pps)`,render:()=>(0,k.jsx)(D,{patch:{zoomStep:2}})},N={name:`Shell — clip selected + inspector facts`,render:()=>(0,k.jsx)(D,{patch:{selectedId:`c2`,playhead:5.5}})},P={name:`Shell — after split at 6.5s`,render:()=>(0,k.jsx)(D,{patch:{playhead:6.5}}),play:async()=>{n.getState().select(`c2`),n.getState().splitAtPlayhead()}},F={name:`Shell — empty timeline`,render:()=>{let{doc:e}=n.getState();return(0,k.jsx)(D,{patch:{doc:{tracks:e.tracks,media:e.media,clips:[]},selectedId:null,playhead:0}})}},I={name:`Shell — snapping off`,render:()=>(0,k.jsx)(D,{patch:{snapOn:!1}})},L=[`Default`,`ZoomedIn`,`Selected`,`AfterSplit`,`EmptyTimeline`,`SnapOff`],j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  name: 'Shell — default (seed)',
  render: () => <FullShell />
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  name: 'Shell — zoomed in (96pps)',
  render: () => <FullShell patch={{
    zoomStep: 2
  }} />
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  name: 'Shell — clip selected + inspector facts',
  render: () => <FullShell patch={{
    selectedId: 'c2',
    playhead: 5.5
  }} />
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  name: 'Shell — after split at 6.5s',
  render: () => <FullShell patch={{
    playhead: 6.5
  }} />,
  /* split via the real action so the story shows the committed doc */
  play: async () => {
    useMini.getState().select('c2');
    useMini.getState().splitAtPlayhead();
  }
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  name: 'Shell — empty timeline',
  render: () => {
    const {
      doc
    } = useMini.getState();
    return <FullShell patch={{
      doc: {
        tracks: doc.tracks,
        media: doc.media,
        clips: []
      },
      selectedId: null,
      playhead: 0
    }} />;
  }
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  name: 'Shell — snapping off',
  render: () => <FullShell patch={{
    snapOn: false
  }} />
}`,...I.parameters?.docs?.source}}}})))()}R();export{P as AfterSplit,j as Default,F as EmptyTimeline,N as Selected,I as SnapOff,M as ZoomedIn,L as __namedExportsOrder,A as default};
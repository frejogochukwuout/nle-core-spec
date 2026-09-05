import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./react-BZJXY1be.js";import{i as n,n as r,r as i}from"./iframe-1PPqCC_e.js";import{n as a,t as o}from"./ToastRegion-cQhR5j5D.js";function s(e,t){return function(){return(0,l.useLayoutEffect)(()=>{n.setState({toast:{kind:e,text:t,seq:1}})},[]),null}}function c({children:e}){return(0,u.jsx)(`div`,{style:{background:`#0d0d0d`,backgroundImage:`radial-gradient(#383838 1px, transparent 1px)`,backgroundSize:`24px 24px`,width:`100%`,height:`100vh`,boxSizing:`border-box`,position:`relative`},children:e})}var l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{l=t(),a(),i(),u=r(),d={title:`Overlays`},f={name:`Toast — info (clip added)`,render:()=>{let e=s(`info`,`Added title_card.png to V1.`);return(0,u.jsxs)(c,{children:[(0,u.jsx)(e,{}),(0,u.jsx)(o,{})]})}},p={name:`Toast — honest empty-timeline feedback`,render:()=>{let e=s(`info`,`Nothing to play — the timeline is empty.`);return(0,u.jsxs)(c,{children:[(0,u.jsx)(e,{}),(0,u.jsx)(o,{})]})}},m={name:`Toast — Export CTA honesty`,render:()=>{let e=s(`info`,`Export isn’t wired in the mini — this is a UI mock.`);return(0,u.jsxs)(c,{children:[(0,u.jsx)(e,{}),(0,u.jsx)(o,{})]})}},h={name:`Toast — error style`,render:()=>{let e=s(`error`,`Something went wrong (mock error state).`);return(0,u.jsxs)(c,{children:[(0,u.jsx)(e,{}),(0,u.jsx)(o,{})]})}},g=[`ToastInfo`,`ToastEmpty`,`ToastExport`,`ToastError`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: 'Toast — info (clip added)',
  render: () => {
    const Boot = BootToast('info', 'Added title_card.png to V1.');
    return <Stage>
        <Boot />
        <ToastRegion />
      </Stage>;
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: 'Toast — honest empty-timeline feedback',
  render: () => {
    const Boot = BootToast('info', 'Nothing to play — the timeline is empty.');
    return <Stage>
        <Boot />
        <ToastRegion />
      </Stage>;
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: 'Toast — Export CTA honesty',
  render: () => {
    const Boot = BootToast('info', 'Export isn’t wired in the mini — this is a UI mock.');
    return <Stage>
        <Boot />
        <ToastRegion />
      </Stage>;
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: 'Toast — error style',
  render: () => {
    const Boot = BootToast('error', 'Something went wrong (mock error state).');
    return <Stage>
        <Boot />
        <ToastRegion />
      </Stage>;
  }
}`,...h.parameters?.docs?.source}}}})))()}_();export{p as ToastEmpty,h as ToastError,m as ToastExport,f as ToastInfo,g as __namedExportsOrder,d as default};
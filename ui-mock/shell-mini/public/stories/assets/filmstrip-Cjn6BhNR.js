import{n as e}from"./rolldown-runtime-DkW27tQK.js";function t(e){let t=Math.max(0,e),n=Math.floor(t/60),r=Math.floor(t%60),i=Math.floor((t-Math.floor(t))*10);return`${String(n).padStart(2,`0`)}:${String(r).padStart(2,`0`)}.${i}`}function n(e){let t=Math.max(0,Math.round(e)),n=Math.floor(t/60),r=t%60;return`${String(n).padStart(2,`0`)}:${String(r).padStart(2,`0`)}`}function r(){return(r=e((()=>{})))()}function i(e){let t=`hsl(${e} 42% 56%)`,n=`hsl(${e} 38% 44%)`,r=`hsl(${e} 40% 34%)`,i=`hsl(${e} 30% 18%)`,a=`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${c}" viewBox="0 0 ${s} ${c}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t}"/>
      <stop offset="0.55" stop-color="${n}"/>
      <stop offset="1" stop-color="${r}"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${c}" fill="url(#g)"/>
  <rect x="52" width="2" height="${c}" fill="${i}" opacity="0.85"/>
  <circle cx="${s*.3}" cy="${c*.35}" r="${c*.1}" fill="rgba(255,255,255,0.28)"/>
  <rect x="${s*.12}" y="${c*.72}" width="${s*.4}" height="${c*.08}" rx="2" fill="rgba(255,255,255,0.18)"/>
</svg>`;return`url("data:image/svg+xml,${encodeURIComponent(a)}")`}function a(e){return i(e.hue)}function o(e){return`linear-gradient(135deg, hsl(${e.hue} 45% 55%), hsl(${e.hue+24} 40% 38%))`}var s,c;function l(){return(l=e((()=>{s=54,c=36})))()}export{t as a,n as i,l as n,r as o,o as r,a as t};
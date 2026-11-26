/* ============================================================
   The standard LSH footer, the same on every LSH site: "© <year> Legal Support Help.
   All Rights Reserved." on a solid navy bar with the orange line along its top, the
   copyright large and light enough to read at a glance (the Training Portal's
   theme.css .lsh-footer, the LSH CaseWorX CMS's and every course's).

   A course already draws its footer line (.footer-note: the course's name, the save
   status, the build), and js/lsh-one-screen.js keeps that line on the screen. So this
   styles that line as the standard footer and puts the copyright at its start, on the
   same line, rather than adding a second footer: the line keeps its height, so the
   page's layout (and the dashboard cards fitted to it) doesn't change. The year is the current one.

   The same file in every LSH course repo (Foundational-Training, Case-Management-Training,
   propertydamageclaimstraining); change it in all of them.
   ============================================================ */
(function(){
  document.documentElement.style.setProperty('--lsh-copyright', JSON.stringify('© ' + new Date().getFullYear() + ' Legal Support Help. All Rights Reserved.'));
  const st = document.createElement('style'); st.id = 'lsh-footer';
  st.textContent = `
#app .footer-note{display:block;text-align:center;
  background:#081226;border-top:3px solid #f97316;color:#cbd5e1;font-size:12px;line-height:1.4;}
#app .footer-note::before{content:var(--lsh-copyright);display:inline;margin-right:.6em;color:#f1f5f9;
  font:600 14.5px/1.4 'IBM Plex Sans',Arial,Helvetica,sans-serif;letter-spacing:.02em;}
#app .footer-note span{color:#cbd5e1;}
@media (max-width:560px){#app .footer-note::before{font-size:13px;}}
@media print{#app .footer-note{background:none;color:#334155;border-top:1px solid #cbd5e1;}
  #app .footer-note::before{color:#334155;}}
`;
  document.head.appendChild(st);
})();

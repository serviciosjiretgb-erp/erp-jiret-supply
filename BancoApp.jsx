import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, Building2, TrendingUp, List, BookOpen,
  ArrowLeftRight, Wallet, ArrowRightLeft, Scale, Calculator,
  BarChart3, Plus, X, Search, ChevronRight, AlertTriangle,
  CheckCircle, Clock, DollarSign, Download, Trash2,
  Banknote, PiggyBank, FileText, LineChart, Landmark,
  TrendingDown, Receipt, Package, ShoppingCart, Globe,
  Users, ArrowLeft, Blocks, FileSpreadsheet, BookText,
  Briefcase, Upload, ShieldCheck, UserPlus, Save, LogOut,
  Settings, Home, Factory, Lock, User, ArrowRight,
  Mail, CreditCard, CalendarDays, MapPin, Key, PieChart,
  Tag, Layers, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  BookMarked, Coins, BadgeDollarSign, Inbox, Send, Eye, EyeOff,
  Printer, Activity, AlignLeft, Filter, ChevronDown, Edit3
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore, collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, arrayUnion, getDocs
} from 'firebase/firestore';

// ── Firebase (mismo proyecto que el ERP principal) ──────────────────
const _bancoCfg = {
  apiKey: "AIzaSyBri2uZAaxsH4S0OpqhYvXB4wfCqo4g3sk",
  authDomain: "erp-gyb-supply.firebaseapp.com",
  projectId: "erp-gyb-supply",
  storageBucket: "erp-gyb-supply.firebasestorage.app",
  messagingSenderId: "201939139821",
  appId: "1:201939139821:web:95e5f589e546d7d557e0e4",
};
const _bancoApp = getApps().find(a=>a.name==='erp-gyb-banco') || initializeApp(_bancoCfg,'erp-gyb-banco');
const _bancoDB  = getFirestore(_bancoApp, "us-central");
// Helpers compatibles con el ERP (sin sandbox — Banco siempre usa datos reales)
const getColRef = (n) => collection(_bancoDB, n);
const getDocRef = (n, id) => doc(_bancoDB, n, String(id));

// ── Utilidades de fecha (replicadas del ERP principal) ────────────────────
const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ── Colores / tokens de diseño (del sistema original) ─────────────────────
const DARK   = '#000000';
const ORANGE = '#f97316';
const BLUE   = '#3b82f6';
const GREEN  = '#22c55e';
const SLATE  = '#64748b';
const BG     = '#ffffff';

// BANCO MODULE — Utility functions & shared components (prefixed with B_)
// ============================================================================
const bancoFmt   = (n) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const bancoDd    = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
const bancoGid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const bancoNormNombre = (s) => (s||'').toUpperCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
const bancoMesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const BANCO_LETTERHEAD_CSS = `
  body{font-family:Arial,sans-serif;margin:0;padding:0;color:#1e293b;font-size:11px}
  .lh-header{background:#000;color:#fff;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #f97316}
  .lh-title{text-align:center;padding:14px 24px;border-bottom:2px solid #f97316}
  .lh-title h2{font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0;color:#000}
  .lh-title p{font-size:9px;color:#64748b;margin:3px 0 0;letter-spacing:1px;text-transform:uppercase}
  .lh-body{padding:20px 24px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{background:#000;color:#f97316;border:1px solid #333;padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:1px}
  td{border:1px solid #e2e8f0;padding:5px 10px;font-size:10px}
  tr:nth-child(even) td{background:#f8fafc}
  .lh-footer{margin-top:30px;border-top:2px solid #f97316;padding:12px 24px;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8}
  @media print{@page{margin:1cm}}
`;
const bancoLetterheadOpen = (titulo, subtitulo='') => `
  <html><head><meta charset="utf-8"><title>${titulo}</title><style>${BANCO_LETTERHEAD_CSS}</style></head><body>
  <div class="lh-header"><div style="font-size:20px;font-weight:900;">Supply G&B</div>
  <div style="text-align:right;font-size:9px;color:#9ca3af"><strong style="color:#f97316;font-size:11px;display:block">SERVICIOS JIRET G&B, C.A.</strong>RIF: J-412309374</div></div>
  <div class="lh-title"><h2>${titulo}</h2><p>${subtitulo||'Generado: '+new Date().toLocaleDateString('es-VE')}</p></div>
  <div class="lh-body">
`;
const bancoLetterheadClose = (extra='') => `
  </div><div class="lh-footer"><span>SERVICIOS JIRET G&B, C.A. — RIF: J-412309374</span><span>${extra}</span><span>Supply ERP</span></div>
  <script>window.onload=()=>{window.print();}</script></body></html>
`;
const bancoPrintWindow = (html) => { const w=window.open('','_blank'); if(w){w.document.write(html); w.document.close();} };

// ════════════════════════════════════════════════════════════════════════
// MOTOR DE ÁRBOL CONTABLE (Balance General / Estado de Resultados)
// Portado del módulo de Reportes Financieros — la fuente de datos es la
// que YA existe y funciona (saldoCuenta() leyendo cont_asientos en vivo);
// esto solo agrega jerarquía expandible, multimoneda y exportación.
// ════════════════════════════════════════════════════════════════════════
const loadSheetJSStyled = () => new Promise((resolve, reject) => {
  if (window.XLSXStyle) { resolve(window.XLSXStyle); return; }
  if (window.XLSX && window.XLSX.utils && window.XLSX.writeFile) { resolve(window.XLSX); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
  s.onload  = () => resolve(window.XLSXStyle || window.XLSX);
  s.onerror = () => {
    const s2 = document.createElement('script');
    s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s2.onload = () => resolve(window.XLSX);
    s2.onerror = () => reject(new Error('No se pudo cargar SheetJS'));
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
});

const CXS = {
  BLACK:'111111', ORANGE:'E05A00', WHITE:'FFFFFF',
  HDR_BG:'111827', SECT1:'1F2937', GREY:'6B7280',
  SECT2:'E5E7EB', SECT3:'F3F4F6',
  TOT1:'D1D5DB', TOT2:'E5E7EB', TOT3:'F3F4F6',
  RED:'DC2626', AMBER:'F59E0B',
  NUM:'#,##0.00',
  cell:(fillRgb,fontRgb,bold=false,h='left',sz=9,numFmt=null,topStyle=null,topColor=null,botStyle=null,botColor=null,italic=false)=>({
    fill:{patternType:'solid',fgColor:{rgb:fillRgb||'FFFFFF'}},
    font:{name:'Arial',bold,color:{rgb:fontRgb||'111111'},sz,italic},
    alignment:{horizontal:h,vertical:'center'},
    border:{top:topStyle?{style:topStyle,color:{rgb:topColor||'D1D5DB'}}:{},bottom:botStyle?{style:botStyle,color:{rgb:botColor||'D1D5DB'}}:{}},
    ...(numFmt?{numFmt}:{}),
  }),
};
const cxsMkCell = (v,s) => ({ v: v ?? '', t: typeof v==='number'?'n':(v==null||v===''?'z':'s'), s });
const cxsApplyLetterhead = (ws, title, subtitle, nCols) => {
  for (let c=0;c<nCols;c++){ const addr=String.fromCharCode(65+c)+'1'; if(!ws[addr]) ws[addr]=cxsMkCell('',{}); ws[addr].s={...ws[addr].s,border:{top:{style:'thick',color:{rgb:CXS.ORANGE}}}}; }
  ws['A1']={v:'Supply G&B',t:'s',s:CXS.cell(CXS.WHITE,CXS.ORANGE,true,'left',16,null,'thick',CXS.ORANGE)};
  const lastCol=String.fromCharCode(65+nCols-1);
  [['SERVICIOS JIRET G&B, C.A.',CXS.cell(CXS.WHITE,CXS.BLACK,true,'right',10,null,'thick',CXS.ORANGE)],
   ['RIF: J-412309374',CXS.cell(CXS.WHITE,CXS.GREY,false,'right',8)],
   ['AV CIRCUNVALACION NRO 02 C.C EL DIVIDIVI LOCAL G-9 NIVEL PB',CXS.cell(CXS.WHITE,CXS.GREY,false,'right',7)],
   ['SECTOR EL TREBOL MARACAIBO-ZULIA',CXS.cell(CXS.WHITE,CXS.GREY,false,'right',7)]].forEach(([txt,st],i)=>{ ws[lastCol+(1+i)]={v:txt,t:'s',s:st}; });
  ws['A6']={v:title,t:'s',s:CXS.cell(CXS.WHITE,CXS.BLACK,true,'center',13)};
  if(subtitle) ws['A7']={v:subtitle,t:'s',s:CXS.cell(CXS.WHITE,CXS.GREY,false,'center',9,null,null,null,null,null,true)};
};
const cxsApplyHeaderRow = (ws, rowIdx, labels, borderColor=CXS.ORANGE) => {
  labels.forEach((lbl,ci)=>{ ws[String.fromCharCode(65+ci)+rowIdx]={v:lbl,t:'s',s:{
    fill:{patternType:'solid',fgColor:{rgb:CXS.HDR_BG}}, font:{name:'Arial',bold:true,color:{rgb:CXS.WHITE},sz:9},
    alignment:{horizontal:ci===0?'left':'right',vertical:'center'}, border:{bottom:{style:'medium',color:{rgb:borderColor}}},
  }}; });
};
const cxsRowStyle = (row, colIdx, isLabelCol) => {
  const lvl=row.level||0; const isRoot=lvl===0&&row.isSection; const isTotalRoot=lvl===0&&row.isTotal; const isSubtotal=row.isTotal&&lvl>0;
  if (isRoot) return CXS.cell(CXS.SECT1,CXS.ORANGE,true,isLabelCol?'left':'right',10,colIdx>0?CXS.NUM:null,'medium',CXS.ORANGE,'thin','374151');
  if (isTotalRoot) return CXS.cell(CXS.BLACK,CXS.AMBER,true,isLabelCol?'left':'right',10,colIdx>0?CXS.NUM:null,'medium',CXS.ORANGE,'thin','374151');
  if (isSubtotal) { const bgs=[CXS.TOT1,CXS.TOT2,CXS.TOT3,'F9FAFB']; return CXS.cell(bgs[Math.min(lvl-1,3)],CXS.BLACK,true,isLabelCol?'left':'right',9,colIdx>0?CXS.NUM:null,'thin','9CA3AF','thin','9CA3AF'); }
  if (row.isSection) { const bgs=[CXS.SECT1,CXS.SECT2,CXS.SECT3,'F9FAFB','FFFFFF']; const fgs=[CXS.ORANGE,CXS.BLACK,CXS.BLACK,CXS.BLACK,CXS.BLACK]; const idx=Math.min(lvl,4); return CXS.cell(bgs[idx],fgs[idx],true,isLabelCol?'left':'right',9,colIdx>0?CXS.NUM:null); }
  return CXS.cell('FFFFFF',(row.u<0&&!isLabelCol)?CXS.RED:CXS.BLACK,false,isLabelCol?'left':'right',9,colIdx>0?CXS.NUM:null,null,null,'hair','E5E7EB');
};
const cxsBuildStyledSheet = (flatRows, colHeaders, nCols, extraFooterRows=[]) => {
  const ws={}; const HEADER_ROW=9; const DATA_START=10; let maxRow=DATA_START;
  for(let r=1;r<=8;r++) for(let c=0;c<nCols;c++) ws[String.fromCharCode(65+c)+r]=cxsMkCell('',{});
  cxsApplyHeaderRow(ws,HEADER_ROW,colHeaders);
  flatRows.forEach((row,i)=>{ const rowIdx=DATA_START+i; row._vals.forEach((v,ci)=>{ ws[String.fromCharCode(65+ci)+rowIdx]={v:v??'',t:typeof v==='number'?'n':'s',s:cxsRowStyle(row,ci,ci===0)}; }); maxRow=rowIdx; });
  extraFooterRows.forEach((frow,i)=>{ const rowIdx=maxRow+2+i; frow.forEach((cell,ci)=>{ ws[String.fromCharCode(65+ci)+rowIdx]=cell; }); maxRow=rowIdx; });
  ws['!ref']=`A1:${String.fromCharCode(65+nCols-1)}${maxRow}`;
  ws['!rows']=[]; for(let r=1;r<=8;r++) ws['!rows'][r-1]={hpx:r===1?28:14}; ws['!rows'][HEADER_ROW-1]={hpx:18};
  flatRows.forEach((row,i)=>{ const isRoot=row.level===0; const isTot0=row.isTotal&&row.level===0; ws['!rows'][DATA_START+i-1]={hpx:isRoot||isTot0?20:(row.isTotal?16:14)}; });
  return ws;
};
const cxsFooterCell = (v, colorRgb, isNum=false, h='left') => ({ v:v??'', t:typeof v==='number'?'n':'s', s:{
  fill:{patternType:'solid',fgColor:{rgb:CXS.BLACK}}, font:{name:'Arial',bold:true,color:{rgb:colorRgb},sz:10},
  alignment:{horizontal:h,vertical:'center'}, border:{top:{style:'medium',color:{rgb:CXS.ORANGE}},bottom:{style:'thin',color:{rgb:'374151'}}}, ...(isNum?{numFmt:CXS.NUM}:{}),
}});
const cxsCompareCodeArrays = (pa,pb) => { for(let i=0;i<Math.max(pa.length,pb.length);i++){ const d=(pa[i]||0)-(pb[i]||0); if(d!==0) return d; } return 0; };
const cxsGetEffectiveCode = (node) => {
  const own = node.n.match(/^(\d[\d.]*)/)?.[1];
  if (own) return own.split('.').map(Number);
  if (node.c && node.c.length) { let best=null; node.c.forEach(child=>{ const code=cxsGetEffectiveCode(child); if(code&&(!best||cxsCompareCodeArrays(code,best)<0)) best=code; }); return best; }
  return null;
};
const cxsSortTreeNodes = (nodes) => {
  nodes.forEach(n=>{ if(n.c&&n.c.length) cxsSortTreeNodes(n.c); });
  nodes.sort((a,b)=>{ const ca=cxsGetEffectiveCode(a), cb=cxsGetEffectiveCode(b); if(ca&&cb) return cxsCompareCodeArrays(ca,cb); if(ca&&!cb) return -1; if(!ca&&cb) return 1; return a.n.localeCompare(b.n); });
  return nodes;
};
const cxsFlattenTreeForExcel = (nodes, openStates, level=0, rows=[]) => {
  nodes.forEach(n=>{
    const isAccountNode = /^\d\./.test(n.n) || (!n.c || n.c.length===0);
    if (!n.isLeaf && n.c?.length) {
      if (!isAccountNode) { rows.push({label:n.n,level,isSection:true,u:null,b:null}); cxsFlattenTreeForExcel(n.c,openStates,level+1,rows); rows.push({label:'TOTAL '+n.n,level,isTotal:true,u:n.u,b:n.b}); }
      else { rows.push({label:n.n,level,isLeaf:true,u:n.u,b:n.b}); const isOpen=!openStates||openStates.has(n.n.trim().toUpperCase()); if(isOpen){ cxsFlattenTreeForExcel(n.c,openStates,level+1,rows); rows.push({label:'TOTAL '+n.n,level,isTotal:true,u:n.u,b:n.b}); } }
    } else rows.push({label:n.n,level,isLeaf:true,u:n.u,b:n.b});
  });
  return rows;
};
// Construye el árbol jerárquico (grupo>subGrupo>cuenta) a partir del Plan de Cuentas real y
// saldoCuenta() — la MISMA fuente en vivo que ya usan Balance/Resultado, sin tocarla.
const buildArbolContable = (cuentasArr, saldoCuentaFn, hastaFecha, gruposIncluir) => {
  const grupoMap={'1':'ACTIVOS','2':'PASIVOS','3':'PATRIMONIO','4':'INGRESOS','5':'COSTOS','6':'GASTOS'};
  const root = [];
  const normKey = s => (s||'').trim().replace(/\s+/g,' ').toUpperCase();
  (cuentasArr||[]).filter(c=>gruposIncluir.includes(String(c.codigo).charAt(0))).forEach(c=>{
    const {saldoBs,saldoUSD} = saldoCuentaFn(c.codigo, hastaFecha);
    if (Math.abs(saldoBs)<0.005 && Math.abs(saldoUSD)<0.005) return;
    const grNum = String(c.codigo).charAt(0);
    const grNom = grupoMap[grNum] || c.grupo || grNum;
    const subGrupo = c.subGrupo||c.subgrupo||'';
    const cuentaPath = c.cuenta||'';
    const pathArray = [grNom, subGrupo, cuentaPath].filter(Boolean);
    let cur = root;
    pathArray.forEach(folderName=>{
      const key = normKey(folderName);
      let folder = cur.find(n=>normKey(n.n)===key);
      if (!folder) { folder = {n:folderName.trim(), c:[], u:0, b:0}; cur.push(folder); }
      cur = folder.c;
    });
    // Signo: en Estado de Resultado los Ingresos se guardan en Haber (negativos aquí) — se
    // invierten para que se vean positivos, igual que hace la vista actual.
    const isIngreso = grNum==='4';
    const signo = isIngreso ? -1 : 1;
    cur.push({ n:`${c.codigo}-${c.nombre}`, u:saldoUSD*signo, b:saldoBs*signo, isLeaf:true });
  });
  const compute = (nodes) => { let u=0,b=0; nodes.forEach(n=>{ if(!n.isLeaf){ const t=compute(n.c); n.u=t.u; n.b=t.b; } u+=n.u; b+=n.b; }); return {u,b}; };
  compute(root);
  root.forEach(cat=>{ if(cat.c&&cat.c.length) cxsSortTreeNodes(cat.c); });
  return root;
};
const cxsFmtR = (v) => new Intl.NumberFormat('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.abs(v||0));

// Fila de árbol expandible — igual patrón visual que el resto de BancoApp (BTh/BTd/etc.)
const ArbolContableRow = ({ node, level=0, totalBase, currency='both' }) => {
  const [isOpen, setIsOpen] = useState(level < 1);
  const isAccountNode = /^\d\./.test(node.n) || (!node.c || node.c.length===0);
  const isLeaf = !node.c || node.c.length===0;
  const showUSD = currency!=='bs'; const showBS = currency!=='usd';
  const pct = totalBase && node.u!==0 ? `${((Math.abs(node.u)/totalBase)*100).toFixed(2)}%` : '';
  const indent = { paddingLeft: `${level*18+12}px` };

  if (!isLeaf && !isAccountNode) {
    const isRoot = level===0;
    return (
      <>
        <tr className={isRoot?'bg-[#111827]':'bg-white border-b border-slate-100'}>
          <td style={indent} className={isRoot?'py-2.5 px-3 text-orange-400 font-black text-xs uppercase tracking-widest':'py-2 px-3 font-black text-[11px] text-slate-800 uppercase'}>{node.n}</td>
          <td colSpan={3}/>
        </tr>
        {node.c.map((child,i)=><ArbolContableRow key={i} node={child} level={level+1} totalBase={totalBase} currency={currency}/>)}
        <tr className={isRoot?'bg-slate-900 text-white border-t-2 border-orange-500':'bg-slate-100 text-slate-800 border-t border-slate-300'}>
          <td style={{paddingLeft:level*18+28}} className="py-2 px-3 font-black text-[10px] uppercase tracking-wider">TOTAL {node.n}</td>
          {showUSD && <td className="py-2 px-3 text-right font-mono text-[11px] font-black">{cxsFmtR(node.u)}</td>}
          {showBS  && <td className="py-2 px-3 text-right font-mono text-[11px] font-black">{cxsFmtR(node.b)}</td>}
          <td className="py-2 px-3 text-right font-mono text-[11px] font-black">{pct}</td>
        </tr>
      </>
    );
  }
  return (
    <>
      <tr onClick={()=>!isLeaf&&setIsOpen(!isOpen)} className="bg-white hover:bg-slate-50 border-b border-slate-100 border-l-4 border-slate-300 cursor-pointer">
        <td style={indent} className="py-2 px-3 font-bold text-[11px] text-slate-800 uppercase flex items-center gap-2">
          {!isLeaf && <span onClick={e=>{e.stopPropagation();setIsOpen(!isOpen);}} className={`inline-flex items-center justify-center w-4 h-4 border rounded-sm text-[11px] leading-none ${isOpen?'border-slate-500 text-slate-600 bg-slate-100':'border-slate-300 text-slate-400 bg-white'}`}>{isOpen?'−':'+'}</span>}
          <span className="truncate">{node.n}</span>
        </td>
        {showUSD && <td className="py-2 px-3 text-right font-mono text-[11px] font-bold text-slate-800">{cxsFmtR(node.u)}</td>}
        {showBS  && <td className="py-2 px-3 text-right font-mono text-[11px] font-bold text-slate-800">{cxsFmtR(node.b)}</td>}
        <td className="py-2 px-3 text-right font-mono text-[11px] font-bold text-slate-500">{pct}</td>
      </tr>
      {isOpen && node.c && node.c.map((child,i)=><ArbolContableRow key={i} node={child} level={level+1} totalBase={totalBase} currency={currency}/>)}
      {!isLeaf && isOpen && (
        <tr className="bg-slate-100/70 font-black text-[10px] border-t border-slate-200">
          <td style={{paddingLeft:level*18+24}} className="py-1.5 px-3 uppercase text-slate-500 tracking-wider">TOTAL {node.n}</td>
          {showUSD && <td className="py-1.5 px-3 text-right font-mono text-slate-700">{cxsFmtR(node.u)}</td>}
          {showBS  && <td className="py-1.5 px-3 text-right font-mono text-slate-700">{cxsFmtR(node.b)}</td>}
          <td className="py-1.5 px-3 text-right font-mono text-slate-500"></td>
        </tr>
      )}
    </>
  );
};

const printReporteContable = (titleHtml, contentHtml) => {
  const win = window.open('', '_blank', 'width=1000,height=700');
  if (!win) { alert('Permite las ventanas emergentes para imprimir/PDF.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #111; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 3px solid #E05A00; }
  .logo { font-size: 18pt; font-weight: 900; color: #E05A00; line-height: 1; }
  .company { text-align: right; }
  .company .name { font-weight: 900; font-size: 11pt; }
  .company .sub { font-size: 7.5pt; color: #555; line-height: 1.4; }
  .title-block { text-align: center; margin-bottom: 10px; }
  .title-block h1 { font-size: 13pt; font-weight: 900; text-transform: uppercase; }
  .title-block h2 { font-size: 9pt; color: #666; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th { background: #111; color: #fff; padding: 5px 6px; text-align: right; font-size: 7.5pt; text-transform: uppercase; }
  th:first-child { text-align: left; }
  td { padding: 3.5px 6px; border-bottom: 1px solid #eee; }
  td:first-child { text-align: left; }
  td:not(:first-child) { text-align: right; font-family: 'Courier New', monospace; }
  tr.section td { font-weight: 900; text-transform: uppercase; background: #F3F3F3; color: #E05A00; }
  tr.total td { font-weight: 900; background: #f7f7f7; border-top: 1.5px solid #ccc; }
  tr.grand-total td { font-weight: 900; background: #111; color: #fff; font-size: 9pt; }
  @media print { button { display: none; } }
</style></head><body>
<div class="header"><div><div class="logo">Supply<br><span style="color:#111">G</span>&amp;<span style="color:#111">B</span></div></div>
<div class="company"><div class="name">SERVICIOS JIRET G&amp;B, C.A.</div><div class="sub">RIF: J-412309374<br>AV CIRCUNVALACION NRO 02 C.C EL DIVIDIVI LOCAL G-9 NIVEL PB<br>SECTOR EL TREBOL MARACAIBO-ZULIA</div></div></div>
<div class="title-block">${titleHtml}</div>
${contentHtml}
<br><button onclick="window.print()" style="padding:8px 20px;background:#E05A00;color:#fff;border:none;border-radius:4px;font-weight:900;cursor:pointer;font-size:10pt;">🖨 IMPRIMIR / GUARDAR PDF</button>
</body></html>`);
  win.document.close();
};


const BBankLogo = ({ banco, logoUrl, className = "w-8 h-8 rounded-md" }) => {
  const [err, setErr] = React.useState(false);
  if (logoUrl && !err) return <img src={logoUrl} alt={banco} className={`${className} object-contain bg-white`} onError={() => setErr(true)} />;
  const n = (banco || '').toLowerCase();
  let domain = '';
  if (n.includes('provincial') || n.includes('bbva')) domain = 'provincial.com';
  else if (n.includes('banesco')) domain = 'banesco.com';
  else if (n.includes('mercantil')) domain = 'mercantilbanco.com';
  else if (n.includes('bancaribe')) domain = 'bancaribe.com.ve';
  else if (n.includes('venezuela')) domain = 'bancodevenezuela.com';
  else if (n.includes('bnc') || n.includes('nacional de credito')) domain = 'bncenlinea.com';
  else if (n.includes('tesoro')) domain = 'bancodeltesoro.gob.ve';
  else if (n.includes('amerant')) domain = 'amerantbank.com';
  else if (n.includes('bancamiga')) domain = 'bancamiga.com';
  else if (n.includes('plaza')) domain = 'bancoplaza.com';
  else if (n.includes('caroni')) domain = 'bancocaroni.com.ve';
  else if (n.includes('exterior')) domain = 'bancoexterior.com';
  else if (n.includes('bicentenario')) domain = 'bancobicentenario.gob.ve';
  if (domain && !err) return <img src={`https://logo.clearbit.com/${domain}`} alt={banco} className={`${className} object-contain bg-white`} onError={() => setErr(true)} />;
  return <div className={`flex items-center justify-center bg-indigo-50 border border-indigo-100 ${className}`}><Landmark size={14} className="text-indigo-600"/></div>;
};

const BBadge = ({ children, v = 'green' }) => {
  const s = { green: 'bg-emerald-50 text-emerald-700 border border-emerald-200', red: 'bg-red-50 text-red-600 border border-red-200', gold: 'bg-amber-50 text-amber-700 border border-amber-200', blue: 'bg-blue-50 text-blue-700 border border-blue-200', gray: 'bg-slate-100 text-slate-500 border border-slate-200', purple: 'bg-purple-50 text-purple-700 border border-purple-200' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${s[v] || s.gray}`}>{children}</span>;
};

const BPill = ({ children, usd }) => <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${usd ? 'bg-slate-900 text-white' : 'bg-orange-500 text-white'}`}>{children}</span>;

const BKPI = ({ label, value, sub, accent = 'green', Icon, trend }) => {
  const borders = { green: 'border-t-emerald-500', gold: 'border-t-orange-500', blue: 'border-t-blue-500', red: 'border-t-red-500', purple: 'border-t-purple-500' };
  const icons = { green: 'text-emerald-500 bg-emerald-50', gold: 'text-orange-500 bg-orange-50', blue: 'text-blue-500 bg-blue-50', red: 'text-red-500 bg-red-50', purple: 'text-purple-500 bg-purple-50' };
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 border-t-4 ${borders[accent]} p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        {Icon && <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${icons[accent]}`}><Icon size={14} /></div>}
      </div>
      <p className="font-black text-2xl text-slate-900 font-mono leading-none">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-2 font-medium">{sub}</p>}
    </div>
  );
};

const BCard = ({ title, subtitle, action, children, noPad }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
    {(title || action) && (
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
        <div>{title && <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">{title}</h3>}{subtitle && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{subtitle}</p>}</div>
        {action}
      </div>
    )}
    <div className={noPad ? '' : 'p-6'}>{children}</div>
  </div>
);

const BModal = ({ open, onClose, title, children, footer, wide, xlwide, xwide, noHeader, noClip }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(15,23,42,.85)', backdropFilter: 'blur(4px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white w-full ${xwide ? 'w-[98vw] max-w-[98vw] h-[98vh]' : xlwide ? 'max-w-[92vw] max-h-[92vh]' : wide ? 'max-w-[95vw] md:max-w-3xl max-h-[90vh]' : 'max-w-[95vw] sm:max-w-lg max-h-[90vh]'} rounded-2xl flex flex-col shadow-2xl relative ${noClip ? '' : 'overflow-hidden'}`}>
        {!noHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
            <h2 className="font-black text-white uppercase tracking-widest text-sm">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><X size={16} className="text-white" /></button>
          </div>
        )}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {noHeader ? children : <div className="overflow-y-auto flex-1 p-7">{children}</div>}
        </div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 bg-slate-50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
};

const BFG = ({ label, children, full }) => <div className={full ? 'col-span-2' : ''}><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>{children}</div>;
const inp = "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-orange-500 transition-colors bg-white text-slate-900 placeholder:text-slate-300";
const sel = "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-orange-500 transition-colors bg-white text-slate-900";

const BBp = ({ onClick, children, sm, disabled }) => <button disabled={disabled} onClick={onClick} className={`bg-slate-900 text-white font-black uppercase tracking-widest ${sm ? 'text-[9px] px-3 py-1.5' : 'text-[10px] px-5 py-2.5'} rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}>{children}</button>;
const BBg = ({ onClick, children, sm, disabled }) => <button disabled={disabled} onClick={onClick} className={`bg-orange-500 text-white font-black uppercase tracking-widest ${sm ? 'text-[9px] px-3 py-1.5' : 'text-[10px] px-5 py-2.5'} rounded-xl hover:bg-orange-600 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50`}>{children}</button>;
const BBo = ({ onClick, children, sm }) => <button onClick={onClick} className={`border-2 border-slate-200 bg-white text-slate-600 font-black uppercase tracking-widest ${sm ? 'text-[9px] px-3 py-1.5' : 'text-[10px] px-5 py-2.5'} rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2`}>{children}</button>;
const BBd = ({ onClick, children, sm }) => <button onClick={onClick} className={`border-2 border-red-200 bg-white text-red-500 font-black uppercase tracking-widest ${sm ? 'text-[9px] px-3 py-1.5' : 'text-[10px] px-5 py-2.5'} rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2`}>{children}</button>;

const BTh = ({ children, right }) => <th className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-100 bg-slate-50 ${right ? 'text-right' : 'text-left'} whitespace-nowrap`}>{children}</th>;
const BTd = ({ children, right, mono, className = '' }) => <td className={`px-4 py-3 text-xs border-b border-slate-50 ${right ? 'text-right' : ''} ${mono ? 'font-mono' : 'font-medium'} text-slate-700 ${className}`}>{children}</td>;

const BEmptyState = ({ icon: Icon, title, desc }) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4"><Icon size={28} className="text-slate-300" /></div>
    <p className="font-black text-slate-700 text-sm uppercase tracking-wide mb-1">{title}</p>
    <p className="text-[11px] text-slate-400 font-medium max-w-xs">{desc}</p>
  </div>
);

// Sidebar layout — mejorado con colores por grupo
const BSidebarLayout = ({ brand, brandSub, navGroups, activeId, onNav, children, headerContent, onBack, accentColor = ORANGE }) => {
  const activeGroup = navGroups.find(g => g.items.find(i => i.id === activeId));
  const activeColor = activeGroup?.color || accentColor;
  return (
    <div className="flex h-screen overflow-hidden w-full">
      {/* ── SIDEBAR ── */}
      <aside className="w-64 flex flex-col h-screen flex-shrink-0" style={{ background: '#0b1120' }}>
        {/* Brand */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` }}>
              <Blocks size={16} className="text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm leading-none tracking-wide">{brand}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-[2px] font-bold mt-0.5">{brandSub}</p>
            </div>
          </div>
          {/* Indicador módulo activo */}
          <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: `${activeColor}18`, border: `1px solid ${activeColor}30` }}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: activeColor }}/>
            <span className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: activeColor }}>
              {navGroups.flatMap(g=>g.items).find(i=>i.id===activeId)?.label || 'Panel'}
            </span>
          </div>
        </div>

        <div className="mx-4 border-b border-white/5 mb-1"/>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto px-2 space-y-0.5">
          {navGroups.map(({ group, items, color: gColor }) => {
            const gc = gColor || accentColor;
            const isActiveGroup = items.some(i => i.id === activeId);
            return (
              <div key={group} className="mb-1">
                {/* Group header */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="w-1 h-3 rounded-full flex-shrink-0" style={{ background: isActiveGroup ? gc : '#334155' }}/>
                  <p className="text-[8px] font-black uppercase tracking-[2.5px]" style={{ color: isActiveGroup ? gc : '#475569' }}>{group}</p>
                </div>
                {/* Items */}
                {items.map(({ id, label, icon: Icon }) => {
                  const active = activeId === id;
                  return (
                    <button key={id} onClick={() => onNav(id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 rounded-xl mb-0.5 group"
                      style={active
                        ? { background: `${gc}20`, borderLeft: `3px solid ${gc}` }
                        : { borderLeft: '3px solid transparent' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={active ? { background: gc } : { background: '#1e293b' }}>
                        <Icon size={16} strokeWidth={1.5} style={{ color: active ? '#fff' : '#64748b' }} />
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-wide truncate transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        {label}
                      </span>
                      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: gc }}/>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Back button */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <button onClick={onBack}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:text-white"
            style={{ background: '#1e293b', color: '#64748b', border: '1px solid #334155' }}
            onMouseEnter={e => { e.currentTarget.style.background = accentColor; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = accentColor; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#334155'; }}>
            <ArrowLeft size={13} /> Volver
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: BG }}>
        <header className="bg-white border-b border-slate-100 px-7 h-14 flex items-center justify-between flex-shrink-0 shadow-sm">
          {headerContent}
        </header>
        <main className="flex-1 overflow-y-auto p-7 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// LOGIN SCREEN
// ============================================================================
function LoginScreen({ onLogin, settings, systemUsers }) {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const user = loginData.username.toLowerCase().trim();
      const pass = loginData.password.trim();
      const found = (systemUsers || []).find(u => u.username === user && u.password === pass);
      if (found) {
        onLogin(found || { name: 'Administrador Maestro', role: 'Master' }); setLoginError('');
      } else { setLoginError('Credenciales incorrectas. Verifique e intente nuevamente.'); }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative"
      style={{ backgroundImage: settings?.loginBg ? `url(${settings.loginBg})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {settings?.loginBg && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>}
      <div className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 border-t-8 border-orange-500">
        {/* G&B Logo */}
        <div className="text-center mb-10">
          <span className="text-3xl font-light tracking-widest text-gray-800">Supply</span>
          <div className="flex items-center justify-center -mt-2">
            <span className="text-black font-black text-[52px] leading-none">G</span>
            <div className="bg-orange-500 text-white rounded-full w-9 h-9 flex items-center justify-center text-2xl font-black mx-1 shadow-inner">&amp;</div>
            <span className="text-black font-black text-[52px] leading-none">B</span>
          </div>
          <p className="text-[9px] font-black tracking-[3px] text-gray-400 mt-1 uppercase">Servicios Jiret G&B, C.A. · Enterprise Resource Planning</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Usuario de Acceso</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input type="text" required value={loginData.username} onChange={e=>setLoginData({...loginData,username:e.target.value})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:border-orange-500 focus:bg-white transition-all text-black" placeholder="admin"/>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Clave de Seguridad</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input type="password" required value={loginData.password} onChange={e=>setLoginData({...loginData,password:e.target.value})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:border-orange-500 focus:bg-white transition-all text-black" placeholder="••••••••"/>
            </div>
          </div>
          {loginError && <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-3 rounded-xl text-center border border-red-100">{loginError}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-black text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-900 transition-all shadow-xl flex justify-center items-center gap-2 mt-2 disabled:opacity-70">
            {loading ? <><RefreshCw size={14} className="animate-spin"/> Verificando...</> : <>INGRESAR AL SISTEMA <ArrowRight size={16}/></>}
          </button>
        </form>
        <p className="text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-8">© {new Date().getFullYear()} Jiret G&B C.A. Todos los derechos reservados.</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN SELECTOR
// ============================================================================
function MainSelector({ onSelect }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: ORANGE }}><Blocks size={24} className="text-white" /></div>
            <h1 className="font-black text-slate-900 text-3xl tracking-tight">Supply <span style={{ color: ORANGE }}>G&B</span></h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Seleccione el área de trabajo</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ADMIN */}
          <button onClick={() => onSelect('admin_dash')} className="group bg-white rounded-3xl p-10 text-left shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-3xl" style={{ background: ORANGE }} />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" style={{ background: ORANGE }}><Briefcase size={30} className="text-white" /></div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide mb-3">Área Administrativa</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">Facturación, Inventario, Bancos y Tesorería.</p>
            <div className="flex flex-wrap gap-2">
              {['Ventas & CxC', 'Inventario', 'Tesorería'].map(t => <span key={t} className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">{t}</span>)}
            </div>
          </button>

          {/* CONTABLE */}
          <button onClick={() => onSelect('cont_dash')} className="group bg-white rounded-3xl p-10 text-left shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-3xl bg-blue-500" />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform bg-blue-500"><Calculator size={30} className="text-white" /></div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide mb-3">Área Contable</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">Plan de Cuentas, Libro Diario y Balances Fiscales.</p>
            <div className="flex flex-wrap gap-2">
              {['Plan de Cuentas', 'Libro Diario', 'Balances'].map(t => <span key={t} className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">{t}</span>)}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARDS DE ÁREA
// ============================================================================
function AdminDash({ onSelectModule, onBack }) {
  const mods = [
    { id: 'facturacion',   name: 'Ventas & Facturación',   icon: Receipt,      color: '#f97316', border:'#f97316', bg:'#fff7ed', desc: 'Clientes, facturas y cuentas por cobrar' },
    { id: 'compras',       name: 'Compras & Proveedores',  icon: ShoppingCart, color: '#10b981', border:'#10b981', bg:'#ecfdf5', desc: 'Proveedores, órdenes de compra e importación' },
    { id: 'inventario',    name: 'Control de Inventario',  icon: Package,      color: '#3b82f6', border:'#3b82f6', bg:'#eff6ff', desc: 'Catálogo, stock y movimientos' },
    { id: 'banco',         name: 'Bancos & Tesorería',     icon: Building2,    color: '#8b5cf6', border:'#8b5cf6', bg:'#f5f3ff', desc: 'Cuentas, movimientos y conciliación' },
    { id: 'configuracion', name: 'Configuración',          icon: Settings,     color: '#64748b', border:'#64748b', bg:'#f8fafc', desc: 'Empresa, usuarios y tasas de cambio' },
  ];
  return (
    <div className="min-h-screen flex flex-col" style={{background:'#ffffff'}}>
      {/* Header negro con acento naranja */}
      <header className="px-6 py-3 flex items-center justify-between shadow-lg border-b-4 border-orange-500" style={{background:'#000'}}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-light tracking-widest text-gray-300">Supply</span>
          <span className="text-white font-black text-xl leading-none">G</span>
          <div className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">&amp;</div>
          <span className="text-white font-black text-xl leading-none">B</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>onSelectModule('configuracion')} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 text-white hover:bg-orange-500 transition-colors"><Settings size={14}/></button>
          <button onClick={onBack} className="px-3 py-1.5 rounded-lg border border-red-800/50 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase"><LogOut size={12}/> Salir</button>
        </div>
      </header>
      {/* Body */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="text-center mb-8">
          <div className="w-0.5 h-8 bg-orange-500 mx-auto mb-3"/>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-[0.15em] mb-1.5" style={{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>Panel Principal ERP</h1>
          <div className="w-12 h-0.5 bg-orange-500 mx-auto"/>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {mods.map(mod=>(
            <button key={mod.id} onClick={()=>onSelectModule(mod.id)}
              className="group text-left rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-white border border-slate-100"
              style={{borderBottom:`3px solid ${mod.border}`,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
              <div className="mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{background:mod.bg,border:`1.5px solid ${mod.color}30`}}>
                  <mod.icon size={22} strokeWidth={2} style={{color:mod.color}}/>
                </div>
              </div>
              <h3 className="font-black text-[11px] uppercase tracking-wider text-slate-900 mb-1" style={{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>{mod.name}</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-3">{mod.desc}</p>
              <div className="flex items-center gap-1" style={{color:mod.color}}>
                <span className="text-[9px] font-black uppercase tracking-widest">Ingresar</span>
                <ChevronRight size={10}/>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REPORTES FINANCIEROS — lógica y componentes (estructura copiada de App 98)
// ============================================================================

// ── Cargador dinámico de SheetJS (sin npm install) ──────────────────────────
const loadSheetJS = () => new Promise((resolve, reject) => {
  if (window.XLSX) { resolve(window.XLSX); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload  = () => resolve(window.XLSX);
  s.onerror = () => reject(new Error('No se pudo cargar SheetJS'));
  document.head.appendChild(s);
});

// ── Procesador de archivos XLSX / TXT / CSV ──────────────────────────────────
const processFiles = async (files) => {
  let allParsedData = [];

  // Detectar mes desde nombre de archivo
  const detectMonth = (name) => {
    const m = name.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
    return m ? m[0].charAt(0).toUpperCase() + m[0].slice(1).toLowerCase() : 'Sin Mes';
  };

  // Emite una fila al array de datos usando el pathStack actual
  const emit = (pathStack, month, name, usd, bs) => {
    const cleanPath = [];
    pathStack.forEach(p => { if (cleanPath.length === 0 || cleanPath[cleanPath.length - 1] !== p) cleanPath.push(p); });
    allParsedData.push({ month, path: cleanPath.join('>'), name, usd, bs: bs || 0 });
  };

  // Filtros de líneas/filas que siempre se omiten
  const skipLine = (n) => !n || n.includes('SERVICIOS JIRET') || n.includes('RIF:') ||
    n === 'Etiquetas de fila' || n === 'SALDO NETO EN USD' ||
    n.includes('ESTADO DE RESULTADO');

  // Pop inteligente: solo quita del stack si el último elemento coincide con la sección totalizada
  const smartPop = (stack, totalName) => {
    const what = totalName.replace(/^Total\s+/i, '').trim();
    if (stack.length > 0 && stack[stack.length - 1].trim() === what) stack.pop();
  };

  for (let i = 0; i < files.length; i++) {
    const file   = files[i];
    const ext    = file.name.split('.').pop().toLowerCase();
    const month  = detectMonth(file.name);
    let pathStack = [];

    // ── XLSX / XLS ──────────────────────────────────────────────────────────
    if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') {
      const XL     = await loadSheetJS();
      const buffer = await file.arrayBuffer();
      const wb     = XL.read(buffer, { type: 'array' });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      // header:1 → arrays; defval:null → celdas vacías = null
      const rows   = XL.utils.sheet_to_json(ws, { header: 1, defval: null });

      for (const row of rows) {
        const name = row[0] != null ? String(row[0]).trim() : '';
        if (skipLine(name)) continue;

        // "Total XXX" → pop inteligente
        if (name.startsWith('Total ')) { smartPop(pathStack, name); continue; }
        // "RESULTADO DEL EJERCICIO" → ignorar, se recalcula en el componente
        if (name === 'RESULTADO DEL EJERCICIO') continue;

        const usdRaw = row[1];
        const bsRaw  = row[2];
        const hasUsd = usdRaw !== null && usdRaw !== undefined && usdRaw !== '';
        const usd    = hasUsd ? Number(usdRaw) : null;
        const bs     = (bsRaw !== null && bsRaw !== undefined && bsRaw !== '') ? Number(bsRaw) : 0;

        if (hasUsd) {
          emit(pathStack, month, name, usd, bs);
        } else {
          pathStack.push(name);
        }
      }

    // ── CSV ─────────────────────────────────────────────────────────────────
    } else if (ext === 'csv') {
      const text  = await file.text();
      const lines = text.split(/\r?\n/);
      lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;
        const cols      = cleanLine.split(/[,;](?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        const name      = cols[0];
        if (skipLine(name)) return;
        if (name.startsWith('Total ')) { smartPop(pathStack, name); return; }
        if (name === 'RESULTADO DEL EJERCICIO') return;
        const usdStr    = cols[1];
        const bsStr     = cols[2];
        const cleanVal  = (v) => { if (!v || v.trim() === '-') return null; const n = parseFloat(v.replace(/\./g,'').replace(',','.')); return isNaN(n)?null:n; };
        const usd       = cleanVal(usdStr);
        const bs        = cleanVal(bsStr);
        if (usd !== null) emit(pathStack, month, name, usd, bs);
        else pathStack.push(name);
      });

    // ── TXT ─────────────────────────────────────────────────────────────────
    } else {
      const text  = await file.text();
      const lines = text.split(/\r?\n/);
      lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;
        if (skipLine(cleanLine)) return;
        if (cleanLine.startsWith('Total')) { smartPop(pathStack, cleanLine.split('\t')[0].trim()); return; }
        if (cleanLine === 'RESULTADO DEL EJERCICIO') return;

        const usdMatch = line.match(/USD\s*([-\d.,]+)/);
        const bsMatch  = line.match(/Bs\.\s*([-\d.,]+)/);
        if (usdMatch && bsMatch) {
          const name = line.split('USD')[0].trim();
          if (!name) return;
          const cleanVal = (v) => { const n = parseFloat(v.replace(/\./g,'').replace(',','.')); return isNaN(n)?null:n; };
          const usd = cleanVal(usdMatch[1]);
          const bs  = cleanVal(bsMatch[1]);
          if (usd !== null) emit(pathStack, month, name, usd, bs);
        } else {
          const name = line.split('\t')[0].trim();
          if (name) pathStack.push(name);
        }
      });
    }
  }
  return allParsedData;
};

// ── Fila tipo tabla dinámica: secciones fijas, cuentas con +/− ───────────────
const ExpandableRow = ({ node, level = 0, totalVentasUSD, defaultOpen = false }) => {
  const isAccountNode = /^\d\./.test(node.n);
  const isLeaf = !node.c || node.c.length === 0;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const fmtCur = (v) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const pct =
    totalVentasUSD && node.u !== 0
      ? `${fmtCur((Math.abs(node.u) / Math.abs(totalVentasUSD)) * 100)}%`
      : '';
  const indent = { paddingLeft: `${level * 18 + 10}px` };

  // ── ENCABEZADOS DE SECCIÓN (siempre visibles, sin botón de colapso) ─────────
  if (!isLeaf && !isAccountNode) {
    const isRoot   = level === 0;   // INGRESOS / COSTOS / GASTOS
    const isOrange = level >= 3;    // VENTAS BRUTAS, COSTO DE VENTA, etc.
    return (
      <>
        {/* fila de encabezado */}
        <tr className={isRoot ? 'bg-[#111827]' : 'bg-white border-b border-gray-100'}>
          <td
            style={indent}
            className={
              isRoot
                ? 'py-2 px-3 text-white font-black text-[11px] uppercase tracking-widest'
                : isOrange
                ? 'py-1.5 px-3 font-bold text-[11px] uppercase text-[#F97316]'
                : 'py-1.5 px-3 font-black text-[11px] uppercase text-slate-800'
            }
          >
            <span className="mr-1.5 opacity-40 text-[9px]">⊟</span>
            {node.n}
          </td>
          <td colSpan={3} />
        </tr>
        {/* hijos siempre renderizados */}
        {node.c.map((child, i) => (
          <ExpandableRow key={i} node={child} level={level + 1} totalVentasUSD={totalVentasUSD} defaultOpen={defaultOpen}/>
        ))}
        {/* fila de total solo para secciones raíz */}
        {isRoot && (
          <tr className="bg-[#111827] text-white border-t-2 border-orange-500">
            <td style={{ paddingLeft: 28 }} className="py-3 px-3 font-black text-[11px] uppercase tracking-widest">
              Total {node.n}
            </td>
            <td className="py-3 px-3 text-right font-mono text-[11px] font-black text-[#F97316] whitespace-nowrap">
              <span className="text-white opacity-40 text-[9px] mr-1">USD</span>
              {fmtCur(node.u)}
            </td>
            <td className="py-3 px-3 text-right font-mono text-[11px] font-black text-[#F97316] hidden sm:table-cell whitespace-nowrap">
              <span className="text-white opacity-40 text-[9px] mr-1">Bs.</span>
              {fmtCur(node.b)}
            </td>
            <td className="py-3 px-3 text-right font-mono text-[11px] font-black text-[#F97316]">{pct}</td>
          </tr>
        )}
      </>
    );
  }

  // ── CUENTA CON HIJOS (TXT — expande a transacciones individuales) ─────────────
  if (isAccountNode && !isLeaf) {
    return (
      <>
        <tr
          onClick={() => setIsOpen(o => !o)}
          className="bg-white border-b border-gray-200 cursor-pointer hover:bg-orange-50 transition-colors"
          style={{ borderLeft: '3px solid #F97316' }}
        >
          <td style={indent} className="py-2.5 px-3 font-bold text-[11px] text-black uppercase">
            <span
              className="inline-flex items-center justify-center w-[15px] h-[15px] border border-gray-400 text-gray-600 font-black text-[11px] mr-2 select-none flex-shrink-0 bg-white hover:border-orange-500 hover:text-orange-600 transition-colors"
              style={{ lineHeight: 1, fontFamily: 'monospace' }}
            >{isOpen ? '−' : '+'}</span>
            {node.n}
          </td>
          <td className="py-2.5 px-3 text-right font-mono text-[11px] font-bold whitespace-nowrap">
            <span className="text-gray-400 text-[9px] font-normal mr-1">USD</span>{fmtCur(node.u)}
          </td>
          <td className="py-2.5 px-3 text-right font-mono text-[11px] font-bold hidden sm:table-cell whitespace-nowrap">
            <span className="text-gray-400 text-[9px] font-normal mr-1">Bs.</span>{fmtCur(node.b)}
          </td>
          <td className="py-2.5 px-3 text-right font-mono text-[11px] text-gray-600">{pct}</td>
        </tr>
        {isOpen && node.c.map((child, i) => (
          <ExpandableRow key={i} node={child} level={level + 1} totalVentasUSD={totalVentasUSD} defaultOpen={defaultOpen}/>
        ))}
      </>
    );
  }

  // ── CUENTA HOJA (XLSX — valor ya consolidado, sin detalle de transacciones) ───
  if (isAccountNode && isLeaf) {
    return (
      <tr className="bg-white border-b border-gray-200" style={{ borderLeft: '3px solid #F97316' }}>
        <td style={indent} className="py-2.5 px-3 font-bold text-[11px] text-black uppercase">
          <span
            className="inline-flex items-center justify-center w-[15px] h-[15px] border border-gray-200 text-gray-300 text-[11px] mr-2 select-none flex-shrink-0 bg-gray-50"
            style={{ lineHeight: 1, fontFamily: 'monospace' }}
            title="Cargue el TXT con detalle de transacciones para expandir"
          >+</span>
          {node.n}
        </td>
        <td className="py-2.5 px-3 text-right font-mono text-[11px] font-bold whitespace-nowrap">
          <span className="text-gray-400 text-[9px] font-normal mr-1">USD</span>{fmtCur(node.u)}
        </td>
        <td className="py-2.5 px-3 text-right font-mono text-[11px] font-bold hidden sm:table-cell whitespace-nowrap">
          <span className="text-gray-400 text-[9px] font-normal mr-1">Bs.</span>{fmtCur(node.b)}
        </td>
        <td className="py-2.5 px-3 text-right font-mono text-[11px] text-gray-600">{pct}</td>
      </tr>
    );
  }

  // ── HOJA de transacción individual (TXT) ─────────────────────────────────────
  return (
    <tr className="bg-slate-50 border-b border-gray-100 hover:bg-amber-50 transition-colors">
      <td style={indent} className="py-1.5 px-3 text-[10px] text-gray-600 max-w-xs">{node.n}</td>
      <td className="py-1.5 px-3 text-right font-mono text-[10px] text-gray-700 whitespace-nowrap">{fmtCur(node.u)}</td>
      <td className="py-1.5 px-3 text-right font-mono text-[10px] text-gray-500 hidden sm:table-cell whitespace-nowrap">{fmtCur(node.b)}</td>
      <td className="py-1.5 px-3 text-right font-mono text-[10px] text-gray-400">{pct}</td>
    </tr>
  );
};

// ── Estado de Resultado Integral ─────────────────────────────────────────────
function EstadoResultadoView({ onBack, dbData }) {
  const availableMonths = React.useMemo(() => [...new Set(dbData.map(d => d.month))], [dbData]);
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '');
  // Expandir / Contraer todo: cambia key para forzar re-mount con nuevo defaultOpen
  const [expandKey,    setExpandKey]    = useState(0);
  const [defaultOpen,  setDefaultOpen]  = useState(false);

  const expandAll   = () => { setDefaultOpen(true);  setExpandKey(k => k + 1); };
  const collapseAll = () => { setDefaultOpen(false); setExpandKey(k => k + 1); };
  const tree = React.useMemo(() => {
    const root = [];
    const monthData = dbData.filter(d => d.month === selectedMonth);
    monthData.forEach(item => {
      const pathArray = item.path.split('>');
      let cur = root;
      pathArray.forEach(folderName => {
        let folder = cur.find(n => n.n === folderName);
        if (!folder) { folder = { n: folderName, c: [], u: 0, b: 0 }; cur.push(folder); }
        cur = folder.c;
      });
      cur.push({ n: item.name, u: item.usd, b: item.bs, isLeaf: true });
    });
    const compute = (nodes) => {
      let u = 0, b = 0;
      nodes.forEach(n => { if (!n.isLeaf) { const t = compute(n.c); n.u = t.u; n.b = t.b; } u += n.u; b += n.b; });
      return { u, b };
    };
    compute(root);
    return root;
  }, [dbData, selectedMonth]);

  const ingresosNode = tree.find(n => n.n === 'INGRESOS');
  const baseVentas  = ingresosNode ? Math.abs(ingresosNode.u) : 1;
  // Excluir nodos hoja sueltos (como RESULTADO DEL EJERCICIO si quedó en el árbol)
  const mainTree    = tree.filter(n => n.n !== 'RESULTADO DEL EJERCICIO');
  const totalUSD    = mainTree.reduce((acc, n) => acc + n.u, 0);
  const totalBs     = mainTree.reduce((acc, n) => acc + n.b, 0);
  const fmtR = (val) => new Intl.NumberFormat('es-VE', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="flex items-center gap-2 font-black text-xs text-slate-600 hover:text-black uppercase transition-colors">
          <ArrowLeft size={16}/> Volver
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Expandir / Contraer todo */}
          <button onClick={expandAll}
            className="px-3 py-1.5 bg-orange-500 text-white text-[10px] font-black uppercase rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1">
            ⊞ Expandir todo
          </button>
          <button onClick={collapseAll}
            className="px-3 py-1.5 bg-slate-700 text-white text-[10px] font-black uppercase rounded-lg hover:bg-black transition-colors flex items-center gap-1">
            ⊟ Contraer todo
          </button>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {availableMonths.map(m => (
            <button key={m} onClick={() => setSelectedMonth(m)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${selectedMonth === m ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {m}
            </button>
          ))}
        </div>
      </header>
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="bg-white px-8 py-10 border-t-8 border-[#F97316] mb-8 shadow-md flex flex-col items-center text-center">
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#111827] uppercase tracking-tight mb-2">Servicios Jiret G&amp;B, C.A.</h1>
          <div className="w-16 h-1.5 bg-[#F97316] mb-4 rounded-full"/>
          <p className="font-sans text-sm text-[#111827] font-bold mb-2 tracking-wide">RIF: J-412309374</p>
          <p className="font-sans text-xs text-gray-600 max-w-2xl font-semibold uppercase tracking-widest leading-relaxed mb-8">
            AV CIRCUNVALACION NRO 02 C.C EL DIVIDIVI LOCAL G-9 NIVEL PB SECTOR EL TREBOL MARACAIBO-ZULIA
          </p>
          <div className="border-b-2 border-gray-200 pb-3 w-full max-w-lg mb-4">
            <h2 className="text-xl font-black font-serif text-gray-800 uppercase tracking-widest">Estado de Resultado Integral</h2>
          </div>
          <p className="font-sans text-sm text-orange-600 font-black uppercase flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
            <CalendarDays size={16}/> Periodo: {selectedMonth}
          </p>
        </div>
        {dbData.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl shadow-sm border-t-4 border-orange-500">
            <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4"/>
            <p className="text-gray-500 font-bold">No hay reportes cargados. Por favor, importa archivos <strong>.xlsx</strong>, <strong>.txt</strong> o <strong>.csv</strong> desde el dashboard de Reportes Financieros.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[9px] uppercase font-black text-slate-500 border-b-2 border-slate-300 sticky top-0">
                  <th className="px-3 py-3 w-[52%] text-left">Etiquetas de fila</th>
                  <th className="px-3 py-3 text-right">Saldo Neto en USD</th>
                  <th className="px-3 py-3 text-right hidden sm:table-cell">Saldo Neto en Bs.</th>
                  <th className="px-3 py-3 text-right">Suma de %</th>
                </tr>
              </thead>
              <tbody key={expandKey}>
                {mainTree.map((node, i) => <ExpandableRow key={i} node={node} totalVentasUSD={baseVentas} defaultOpen={defaultOpen}/>)}
                <tr className="bg-[#111827] text-white font-black border-t-4 border-orange-500">
                  <td className="px-4 py-5 text-sm uppercase tracking-widest" style={{paddingLeft:28}}>
                    RESULTADO DEL EJERCICIO
                  </td>
                  <td className="px-3 py-5 text-right text-base text-[#F97316] font-mono whitespace-nowrap">
                    <span className="text-white opacity-40 text-[9px] mr-1">USD</span>
                    {fmtR(totalUSD)}
                  </td>
                  <td className="px-3 py-5 text-right text-base hidden sm:table-cell text-[#F97316] font-mono whitespace-nowrap">
                    <span className="text-white opacity-40 text-[9px] mr-1">Bs.</span>
                    {fmtR(totalBs)}
                  </td>
                  <td className="px-3 py-5 text-right text-base text-[#F97316] font-mono">
                    {(Math.abs(totalUSD) / baseVentas * 100).toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Balance General (próximamente) ───────────────────────────────────────────
function BalanceGeneralView({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b p-4 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="flex items-center gap-2 font-black text-xs text-slate-600 hover:text-black uppercase transition-colors">
          <ArrowLeft size={16}/> Volver
        </button>
        <span className="font-black text-sm text-slate-800 uppercase tracking-wide">Balance General</span>
      </header>
      <main className="p-8 max-w-4xl mx-auto">
        <div className="bg-white px-8 py-10 border-t-8 border-[#3b82f6] mb-8 shadow-md flex flex-col items-center text-center">
          <h1 className="text-2xl font-black font-serif text-[#111827] uppercase tracking-tight mb-2">Servicios Jiret G&amp;B, C.A.</h1>
          <div className="w-16 h-1.5 bg-[#3b82f6] mb-4 rounded-full"/>
          <p className="font-sans text-sm text-[#111827] font-bold mb-2">RIF: J-412309374</p>
          <h2 className="text-xl font-black font-serif text-gray-800 uppercase tracking-widest mt-4">Estado de Situación Financiera</h2>
          <p className="text-xs text-gray-500 mt-2">Balance General al cierre del período</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12 text-center">
          <Scale size={56} className="mx-auto text-blue-300 mb-5"/>
          <h3 className="font-black text-lg text-slate-700 uppercase mb-2">Módulo en desarrollo</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">El Balance General con carga de archivos TXT/CSV estará disponible en la próxima actualización. Mientras tanto puedes usar el módulo <strong>Estados Financieros</strong> del área Contabilidad General.</p>
        </div>
      </main>
    </div>
  );
}

// ── Dashboard de Reportes Financieros ────────────────────────────────────────
function ReportesFinancierosApp({ onBack }) {
  const [subView, setSubView]   = useState('dashboard');
  const [dbData,  setDbData]    = useState([]);
  const [dataOk,  setDataOk]    = useState(false);

  const handleUpload = async (e) => {
    if (!e.target.files.length) return;
    const newData = await processFiles(e.target.files);
    setDbData(newData);
    setDataOk(true);
    alert(`✅ ${e.target.files.length} archivo(s) importado(s) correctamente.`);
  };

  if (subView === 'resultado')
    return <EstadoResultadoView onBack={() => setSubView('dashboard')} dbData={dbData}/>;
  if (subView === 'balance')
    return <BalanceGeneralView onBack={() => setSubView('dashboard')}/>;

  const modulos = [
    {
      id: 'resultado',
      name: 'Estado de Resultado',
      icon: LineChart,
      color: '#f97316',
      desc: 'Ingresos, costos y gastos · detalle por factura · filtro mensual',
      ready: true,
    },
    {
      id: 'balance',
      name: 'Balance General',
      icon: Scale,
      color: '#3b82f6',
      desc: 'Activos, Pasivos y Patrimonio · Estado de Situación Financiera',
      ready: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <header className="px-6 py-3 flex items-center justify-between shadow-lg border-b-4 border-orange-500" style={{ background: '#000' }}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-light tracking-widest text-gray-300">Supply</span>
          <span className="text-white font-black text-xl leading-none">G</span>
          <div className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">&amp;</div>
          <span className="text-white font-black text-xl leading-none">B</span>
          <span className="ml-3 text-[10px] font-black uppercase tracking-[3px] text-orange-400 border border-orange-800/50 px-2 py-0.5 rounded-full">Reportes Financieros</span>
        </div>
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg border border-red-800/50 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase">
          <ArrowLeft size={12}/> Volver
        </button>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Título */}
        <div className="text-center mb-8">
          <div className="w-0.5 h-8 bg-orange-500 mx-auto mb-3"/>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-[0.15em] mb-1.5">Reportes Financieros</h1>
          <p className="text-xs text-slate-400 font-medium">Servicios Jiret G&amp;B, C.A. · RIF J-412309374</p>
          <div className="w-12 h-0.5 bg-orange-500 mx-auto mt-3"/>
        </div>

        {/* Zona de carga */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-orange-300 transition-colors p-8 mb-8 text-center shadow-sm">
          <Upload className="mx-auto text-orange-400 mb-3" size={36}/>
          <h2 className="font-black text-base text-slate-800 uppercase mb-1">Cargar Reportes del Sistema</h2>
          <p className="text-slate-400 text-sm mb-5 max-w-lg mx-auto">
            Selecciona archivos <strong>.xlsx</strong>, <strong>.txt</strong> o <strong>.csv</strong> exportados por tu sistema.
            Nombra cada archivo con el mes (ej: <em>abril_2026.xlsx</em>) para que se detecte automáticamente.
          </p>
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <label className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase text-xs cursor-pointer hover:bg-gray-900 transition-all flex items-center gap-2 shadow-lg">
              <Upload size={14}/> Buscar Archivos
              <input type="file" multiple accept=".xlsx,.xls,.xlsm,.txt,.csv" className="hidden" onChange={handleUpload}/>
            </label>
            {dataOk && (
              <span className="flex items-center gap-1.5 text-emerald-700 font-black text-xs uppercase bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200">
                <CheckCircle size={14}/> {dbData.length} registros cargados
              </span>
            )}
          </div>
        </div>

        {/* Tarjetas de módulos */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-slate-100"/>
            <p className="text-[9px] font-black uppercase tracking-[3px] px-3 py-1 rounded-full border border-orange-200 text-orange-500 bg-orange-50">Estados Financieros</p>
            <div className="h-px flex-1 bg-slate-100"/>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {modulos.map(mod => (
              <button
                key={mod.id}
                onClick={() => mod.ready && setSubView(mod.id)}
                disabled={!mod.ready}
                className={`group text-left bg-white rounded-2xl p-6 transition-all duration-200 border border-slate-100 ${mod.ready ? 'hover:-translate-y-0.5 hover:shadow-xl cursor-pointer' : 'opacity-55 cursor-not-allowed grayscale'}`}
                style={{ borderBottom: `4px solid ${mod.color}`, boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: mod.color + '15' }}>
                  <mod.icon size={22} style={{ color: mod.color }}/>
                </div>
                <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 mb-1">{mod.name}</h3>
                <p className="text-[11px] text-slate-400 leading-snug">{mod.desc}</p>
                <div className="mt-4 flex items-center gap-1" style={{ color: mod.color }}>
                  {mod.ready
                    ? <><span className="text-[9px] font-black uppercase tracking-widest">Abrir Reporte</span><ChevronRight size={10}/></>
                    : <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Próximamente</span>
                  }
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONT DASH
// ============================================================================
function ContDash({ onSelectModule, onBack }) {
  const grupos = [
    {
      titulo: 'Contabilidad General',
      color: '#3b82f6',
      mods: [
        { id: 'contabilidad', name: 'Plan de Cuentas',       icon: BookOpen,   color: '#3b82f6', desc: 'PUC jerárquico, importar/exportar, edición' },
        { id: 'asientos',     name: 'Libro Diario',           icon: FileText,   color: '#f97316', desc: 'Comprobantes automáticos y manuales Bs/USD' },
        { id: 'balances',     name: 'Estados Financieros',    icon: BarChart3,  color: '#10b981', desc: 'Balance Gral., E. Resultados, Comprobación' },
      ]
    },
    {
      titulo: 'Fiscal & Tributario',
      color: '#ef4444',
      mods: [
        { id: 'activos_fijos', name: 'Activos Fijos',         icon: Layers,     color: '#8b5cf6', desc: 'Registro, depreciación y bajas de activos' },
        { id: 'fiscal',        name: 'IVA · IGTF · Retenciones', icon: Receipt, color: '#ef4444', desc: 'Libros de compras/ventas, retenciones, TXT' },
      ]
    },
    {
      titulo: 'Reportes Financieros',
      color: '#f97316',
      mods: [
        { id: 'reportes_financieros', name: 'Reportes Financieros', icon: PieChart, color: '#f97316', desc: 'Estado de Resultado · Balance General · carga de archivos TXT/CSV' },
      ]
    },
  ];
  return (
    <div className="min-h-screen flex flex-col" style={{background:'#ffffff'}}>
      <header className="px-6 py-3 flex items-center justify-between shadow-lg border-b-4 border-blue-500" style={{background:'#000'}}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-light tracking-widest text-gray-300">Supply</span>
          <span className="text-white font-black text-xl leading-none">G</span>
          <div className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">&amp;</div>
          <span className="text-white font-black text-xl leading-none">B</span>
        </div>
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg border border-red-800/50 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase"><LogOut size={12}/> Salir</button>
      </header>
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="text-center mb-8">
          <div className="w-0.5 h-8 bg-blue-500 mx-auto mb-3"/>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-[0.15em] mb-1.5" style={{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>Área Contable &amp; Fiscal</h1>
          <div className="w-12 h-0.5 bg-blue-500 mx-auto"/>
        </div>
        {grupos.map(g=>(
          <div key={g.titulo} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-slate-100"/>
              <p className="text-[9px] font-black uppercase tracking-[3px] px-3 py-1 rounded-full border" style={{color:g.color,borderColor:g.color+'40',background:g.color+'08'}}>{g.titulo}</p>
              <div className="h-px flex-1 bg-slate-100"/>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.mods.map(mod=>(
                <button key={mod.id} onClick={()=>onSelectModule(mod.id)}
                  className="group text-left bg-white rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg border border-slate-100"
                  style={{borderBottom:`3px solid ${mod.color}`,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{background:mod.color+'12'}}>
                    <mod.icon size={18} style={{color:mod.color}}/>
                  </div>
                  <h3 className="font-black text-[11px] uppercase tracking-wider text-slate-900 mb-1">{mod.name}</h3>
                  <p className="text-[10px] text-slate-400 leading-tight">{mod.desc}</p>
                  <div className="mt-3 flex items-center gap-1" style={{color:mod.color}}>
                    <span className="text-[9px] font-black uppercase tracking-widest">Ingresar</span>
                    <ChevronRight size={10}/>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function FacturacionApp({ fbUser, tasasList, onBack }) {
  const [sec, setSec] = useState('dashboard');
  const [clientes, setClientes] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [tasas, setTasas] = useState(tasasList || []);

  useEffect(() => {
    if (!fbUser) return;
    const subs = [
      onSnapshot(getColRef('clientes'), s => setClientes(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(getColRef('facturacion_facturas'), orderBy('fechaEmision', 'desc')), s => setFacturas(s.docs.map(d => d.data()))),
      onSnapshot(query(getColRef('facturacion_pagos'), orderBy('fecha', 'desc')), s => setPagos(s.docs.map(d => d.data()))),
      onSnapshot(query(getColRef('banco_tasas'), orderBy('fecha', 'desc')), s => setTasas(s.docs.map(d => d.data())))
    ];
    return () => subs.forEach(u => u());
  }, [fbUser]);

  const tasaActiva = tasas.find(t => t.modulo === 'Facturación' || t.modulo === 'Todos')?.tasaRef || tasas[0]?.tasaRef || 39.50;

  const DashboardView = () => {
    const totalCartera = facturas.reduce((a, f) => a + (f.saldoUSD || 0), 0);
    const porVencer = facturas.filter(f => f.estado === 'Pendiente' && f.fechaVencimiento >= getTodayDate()).reduce((a, f) => a + (f.saldoUSD || 0), 0);
    const vencidas = facturas.filter(f => f.estado === 'Pendiente' && f.fechaVencimiento < getTodayDate()).reduce((a, f) => a + (f.saldoUSD || 0), 0);
    const ventasMes = facturas.filter(f => f.fechaEmision?.startsWith(bancoMesActual())).reduce((a, f) => a + (f.total || 0), 0);
    const cobradoMes = pagos.filter(p => p.fecha?.startsWith(bancoMesActual())).reduce((a, p) => a + (p.monto || 0), 0);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-7 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg,${DARK},#1e3a5f)` }}>
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #f97316 0%, transparent 50%)' }} />
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Cartera Viva Total (CxC)</p>
          <p className="text-5xl font-mono font-black" style={{ color: ORANGE }}>$ {bancoFmt(totalCartera)}</p>
          <p className="text-slate-500 text-xs mt-2">Tasa activa: <strong className="text-white">{tasaActiva} Bs./$</strong></p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BKPI label="Ventas del Mes" value={`$${bancoFmt(ventasMes)}`} accent="blue" Icon={TrendingUp} sub={bancoMesActual()} />
          <BKPI label="Cobrado del Mes" value={`$${bancoFmt(cobradoMes)}`} accent="green" Icon={CheckCircle} />
          <BKPI label="Por Vencer" value={`$${bancoFmt(porVencer)}`} accent="gold" Icon={Clock} />
          <BKPI label="Cartera Vencida" value={`$${bancoFmt(vencidas)}`} accent="red" Icon={AlertTriangle} />
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <Card title="Últimas Facturas Emitidas">
            {facturas.length === 0 ? <EmptyState icon={Receipt} title="Sin facturas" desc="Emita su primera factura" /> :
              <table className="w-full"><thead><tr><Th>Factura</Th><Th>Cliente</Th><Th right>Total</Th><Th>Estado</Th></tr></thead>
                <tbody>{facturas.slice(0, 6).map(f => <tr key={f.id} className="hover:bg-slate-50">
                  <Td mono className="font-black text-orange-500">{f.numero}</Td>
                  <Td className="max-w-[120px] truncate">{f.clienteNombre}</Td>
                  <Td right mono>{'$'+bancoFmt(f.total)}</Td>
                  <Td><Badge v={f.estado === 'Pagada' ? 'green' : f.fechaVencimiento < getTodayDate() ? 'red' : 'gold'}>{f.estado || 'Pendiente'}</Badge></Td>
                </tr>)}</tbody>
              </table>}
          </Card>
          <Card title="Últimos Cobros Registrados">
            {pagos.length === 0 ? <EmptyState icon={Wallet} title="Sin cobros" desc="Los cobros aparecerán aquí" /> :
              <table className="w-full"><thead><tr><Th>Fecha</Th><Th>Factura</Th><Th>Método</Th><Th right>Monto</Th></tr></thead>
                <tbody>{pagos.slice(0, 6).map(p => <tr key={p.id} className="hover:bg-slate-50">
                  <Td>{bancoDd(p.fecha)}</Td><Td mono className="font-black">{p.facturaNumero}</Td>
                  <Td><span className="text-[10px] text-slate-500 uppercase font-semibold">{p.metodo}</span></Td>
                  <Td right mono className="text-emerald-600 font-black">+${bancoFmt(p.monto)}</Td>
                </tr>)}</tbody>
              </table>}
          </Card>
        </div>
      </div>
    );
  };

  const ClientesView = () => {
    const [modal, setModal]       = useState(false);
    const [detalle, setDetalle]   = useState(null);  // cliente en detalle/edición
    const [editando, setEditando] = useState(false);
    const [form, setForm]         = useState({ nombre:'',rif:'',codigo:'',direccion:'',telefono:'',email:'',diasCredito:'0',cuentaContableCod:'',cuentaContableNom:'',activo:true });
    const [busy, setBusy]         = useState(false);
    const [search, setSearch]     = useState('');
    const [contCuentas, setContCuentas] = useState([]);
    useEffect(()=>{ const u=onSnapshot(getColRef('planDeCuentas'),s=>setContCuentas(s.docs.map(d=>({id:d.id,...d.data()})))); return()=>u(); },[]);

    const rifToCodigo = (rif) => (rif||'').toUpperCase().replace(/[-\s]/g,'');
    const filtered = clientes.filter(c=>
      c.nombre?.toUpperCase().includes(search.toUpperCase())||
      c.rif?.toUpperCase().includes(search.toUpperCase())||
      (c.codigo||'').toUpperCase().includes(search.toUpperCase())
    );

    const initForm = ()=>({ nombre:'',rif:'',codigo:'',direccion:'',telefono:'',email:'',diasCredito:'0',cuentaContableCod:'',cuentaContableNom:'',activo:true });

    const openNew  = ()=>{ setEditando(false); setForm(initForm()); setModal(true); };
    const openEdit = (c)=>{ setEditando(true); setDetalle(null); setForm({nombre:c.nombre,rif:c.rif,codigo:c.codigo||rifToCodigo(c.rif),direccion:c.direccion||'',telefono:c.telefono||'',email:c.email||'',diasCredito:c.diasCredito||'0',cuentaContableCod:c.cuentaContableCod||'',cuentaContableNom:c.cuentaContableNom||'',activo:c.activo!==false}); setModal(true); };

    const save = async () => {
      if (!form.nombre || !form.rif) return alert('Nombre y RIF requeridos');
      const codigo = form.codigo || rifToCodigo(form.rif);
      setBusy(true);
      try {
        if(editando && detalle) {
          await updateDoc(getDocRef('facturacion_clientes',detalle.id),{...form,codigo});
        } else {
          const id=bancoGid(); await setDoc(getDocRef('facturacion_clientes',id),{...form,codigo,id,ts:serverTimestamp()});
        }
        setModal(false); setForm(initForm()); setDetalle(null); setEditando(false);
      } finally { setBusy(false); }
    };

    const eliminar = async(c)=>{
      if(!window.confirm(`¿Eliminar cliente "${c.nombre}"?`)) return;
      await deleteDoc(getDocRef('facturacion_clientes',c.id));
      setDetalle(null);
    };

    // ── Imprimir cliente individual (membretado) ──────────────────────
    const printCliente = (c) => {
      bancoPrintWindow(
        bancoLetterheadOpen('Ficha de Cliente', `Código: ${c.codigo||rifToCodigo(c.rif)}`)+
        `<table style="width:100%;margin:0"><tbody>
          <tr><td style="width:30%;font-weight:bold;color:#64748b;padding:8px 0">Código / RIF</td><td style="font-weight:900;font-size:13px">${c.codigo||''} · ${c.rif}</td></tr>
          <tr><td style="font-weight:bold;color:#64748b;padding:8px 0">Razón Social</td><td style="font-weight:900;font-size:14px">${c.nombre}</td></tr>
          <tr><td style="font-weight:bold;color:#64748b;padding:8px 0">Teléfono</td><td>${c.telefono||'—'}</td></tr>
          <tr><td style="font-weight:bold;color:#64748b;padding:8px 0">Email</td><td>${c.email||'—'}</td></tr>
          <tr><td style="font-weight:bold;color:#64748b;padding:8px 0">Dirección</td><td>${c.direccion||'—'}</td></tr>
          <tr><td style="font-weight:bold;color:#64748b;padding:8px 0">Días de Crédito</td><td>${c.diasCredito||'0'} días</td></tr>
          <tr><td style="font-weight:bold;color:#64748b;padding:8px 0">Cuenta Contable</td><td><span style="font-family:monospace;color:#1e40af;font-weight:bold">${c.cuentaContableCod||'—'}</span> ${c.cuentaContableNom?'· '+c.cuentaContableNom:''}</td></tr>
          <tr><td style="font-weight:bold;color:#64748b;padding:8px 0">Estado</td><td><span style="background:${c.activo!==false?'#d1fae5':'#fee2e2'};color:${c.activo!==false?'#065f46':'#991b1b'};padding:2px 8px;border-radius:12px;font-size:9px;font-weight:900">${c.activo!==false?'ACTIVO':'INACTIVO'}</span></td></tr>
        </tbody></table>`+
        bancoLetterheadClose('Directorio de Clientes')
      );
    };

    // ── Imprimir directorio completo ─────────────────────────────────
    const printDirectorio = () => {
      let rows = filtered.map((c,i)=>`<tr>
        <td>${i+1}</td>
        <td style="font-family:monospace;font-weight:bold;color:#1e40af">${c.codigo||rifToCodigo(c.rif)}</td>
        <td style="font-family:monospace">${c.rif}</td>
        <td style="font-weight:700">${c.nombre}</td>
        <td>${c.telefono||'—'}</td>
        <td>${c.email||'—'}</td>
        <td>${c.diasCredito||'0'}d</td>
        <td style="font-family:monospace;color:#1e40af;font-size:9px">${c.cuentaContableCod||'—'}</td>
        <td><span class="badge-${c.activo!==false?'green':'red'}">${c.activo!==false?'Activo':'Inactivo'}</span></td>
      </tr>`).join('');
      bancoPrintWindow(
        bancoLetterheadOpen('Directorio de Clientes',`${filtered.length} cliente(s) registrado(s)`)+
        `<table><thead><tr><th>#</th><th>Código</th><th>RIF</th><th>Razón Social</th><th>Teléfono</th><th>Email</th><th>Créd.</th><th>PUC</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`+
        bancoLetterheadClose(`Módulo: Ventas & Facturación`)
      );
    };

    // ── Exportar TXT ─────────────────────────────────────────────────
    const exportarTxt = () => {
      const HDRS=['Código','Descripción','Activo','Dirección','Telefono','RIF','E-Mail'];
      const rows=clientes.map(c=>[c.codigo||rifToCodigo(c.rif),c.nombre,c.activo!==false?'Si':'No',c.direccion||'',c.telefono||'',c.rif||'',c.email||'']);
      const content=[HDRS,...rows].map(r=>r.join('\t')).join('\r\n');
      const blob=new Blob(['\uFEFF'+content],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='GENERALDECLIENTES.TXT';a.click();URL.revokeObjectURL(url);
    };

    const importarTxt = async(event)=>{
      const file=event.target.files[0];if(!file)return;
      const text=await file.text();
      const lines=text.split(/\r?\n/).filter(l=>l.trim());
      if(lines.length<2){alert('Archivo vacío');event.target.value='';return;}
      const firstCell=lines[0].split('\t')[0].trim();
      const hasHeader=/[a-zA-ZáéíóúÁÉÍÓÚ]/.test(firstCell)&&!firstCell.startsWith('C');
      const dataLines=hasHeader?lines.slice(1):lines;
      const existentes=new Set(clientes.map(c=>c.rif?.toUpperCase().replace(/[-\s]/g,'')));
      const batch=writeBatch(_bancoDB);let importados=0,omitidos=0;
      for(const line of dataLines){
        const p=line.split('\t').map(v=>v.trim().replace(/^["']/,'').replace(/["']$/,''));
        if(p.length<2) continue;
        const cod=p[0],nombre=p[1],activo=p[2],dir=p[3]||'',tel=p[4]||'',rif=p[5]||'',email=p[6]||'';
        if(!nombre) continue;
        const rifKey=(rif||cod).toUpperCase().replace(/[-\s]/g,'');
        if(rifKey&&existentes.has(rifKey)){omitidos++;continue;}
        const id=bancoGid();const codigo=rifToCodigo(rif||cod);
        batch.set(getDocRef('facturacion_clientes',id),{id,codigo,nombre:nombre.toUpperCase(),activo:activo!=='No',direccion:dir,telefono:tel,rif:(rif||'').toUpperCase(),email,diasCredito:'0',ts:serverTimestamp()});
        importados++;
      }
      if(importados===0){alert(`Sin nuevos clientes. ${omitidos} ya existían.`);event.target.value='';return;}
      await batch.commit();
      alert(`✅ ${importados} cliente(s) importado(s).${omitidos>0?` (${omitidos} omitidos)`:''}`);
      event.target.value='';
    };

    return (
      <div>
        {/* ── MODAL DETALLE ── */}
        {detalle && !editando && (
          <Modal open onClose={()=>setDetalle(null)} title={`Cliente — ${detalle.nombre}`} wide
            footer={<>
              <Bd onClick={()=>eliminar(detalle)}>🗑 Eliminar</Bd>
              <div className="flex-1"/>
              <button onClick={()=>printCliente(detalle)} className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50"><Download size={12}/> Imprimir</button>
              <Bg onClick={()=>openEdit(detalle)}>✏ Editar</Bg>
            </>}>
            <div className="grid grid-cols-2 gap-4">
              {/* Header con código */}
              <div className="col-span-2 p-5 rounded-2xl flex items-center gap-5" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
                <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <Users size={24} className="text-white"/>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">{detalle.codigo||rifToCodigo(detalle.rif)}</p>
                  <p className="font-black text-white text-lg leading-tight">{detalle.nombre}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{detalle.rif}</p>
                </div>
                <div className="ml-auto"><Badge v={detalle.activo!==false?'green':'gray'}>{detalle.activo!==false?'Activo':'Inactivo'}</Badge></div>
              </div>
              {[['Código',detalle.codigo||rifToCodigo(detalle.rif)],['RIF/NIT',detalle.rif],['Teléfono',detalle.telefono||'—'],['Email',detalle.email||'—'],['Días de Crédito',(detalle.diasCredito||'0')+' días'],['Dirección',detalle.direccion||'—']].map(([k,v])=>(
                <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{k}</p>
                  <p className="font-semibold text-slate-800 text-sm truncate">{v}</p>
                </div>
              ))}
              {(detalle.cuentaContableCod) && (
                <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase text-blue-700 tracking-widest mb-0.5">Cuenta Contable (PUC)</p>
                  <p className="font-mono font-black text-blue-700">{detalle.cuentaContableCod} <span className="font-medium text-slate-600">· {detalle.cuentaContableNom}</span></p>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* ── MODAL CREAR / EDITAR ── */}
        <Modal open={modal} onClose={()=>{setModal(false);setForm(initForm());setEditando(false);setDetalle(null);}} title={editando?`Editar: ${detalle?.nombre}`:'Registrar Nuevo Cliente'}
          footer={<><Bo onClick={()=>{setModal(false);setForm(initForm());setEditando(false);setDetalle(null);}}>Cancelar</Bo><Bg onClick={save} disabled={busy}>{busy?'Guardando...':(editando?'Guardar Cambios':'Guardar Cliente')}</Bg></>}>
          <div className="grid grid-cols-2 gap-4">
            <BFG label="RIF / NIT *"><input className={inp} value={form.rif} onChange={e=>{const rif=e.target.value.toUpperCase();setForm({...form,rif,codigo:form.codigo||rifToCodigo(rif)});}} placeholder="J-12345678-9"/></BFG>
            <BFG label="Código (auto: RIF sin guiones)"><input className={inp} value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value.toUpperCase()})} placeholder={rifToCodigo(form.rif)||'J412345789'}/></BFG>
            <BFG label="Razón Social *" full><input className={inp} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value.toUpperCase()})} placeholder="EMPRESA EJEMPLO C.A."/></BFG>
            <BFG label="Teléfono"><input className={inp} value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} placeholder="0414-0000000"/></BFG>
            <BFG label="Email"><input type="email" className={inp} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="contacto@empresa.com"/></BFG>
            <BFG label="Días de Crédito"><input type="number" className={inp} value={form.diasCredito} onChange={e=>setForm({...form,diasCredito:e.target.value})} placeholder="15"/></BFG>
            <BFG label="Dirección Fiscal" full><input className={inp} value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})}/></BFG>
            <BFG label="Cuenta Contable Asociada (PUC)" full>
              <select className={sel} value={form.cuentaContableCod} onChange={e=>{const c=contCuentas.find(x=>x.codigo===e.target.value);setForm({...form,cuentaContableCod:e.target.value,cuentaContableNom:c?.nombre||''});}}>
                <option value="">— Sin cuenta asociada —</option>
                {contCuentas.filter(c=>String(c.codigo).startsWith('1')).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))).map(c=><option key={c.id} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
              </select>
              {form.cuentaContableCod&&<p className="text-[10px] text-blue-600 font-black mt-1">✓ {form.cuentaContableCod} · {form.cuentaContableNom}</p>}
            </BFG>
            <BFG label="Estado">
              <div className="flex gap-2">
                {['Activo','Inactivo'].map(s=><button key={s} onClick={()=>setForm({...form,activo:s==='Activo'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${(form.activo&&s==='Activo')||(!form.activo&&s==='Inactivo')?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>{s}</button>)}
              </div>
            </BFG>
          </div>
        </Modal>

        {/* ── TABLA ── */}
        <Card title="Directorio de Clientes" subtitle={`${clientes.length} clientes registrados`}
          action={<div className="flex gap-2 flex-wrap items-center">
            <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." className="border-2 border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:border-orange-500 w-36"/></div>
            <button onClick={printDirectorio} className="flex items-center gap-1.5 px-3 py-2 border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50"><Download size={12}/> PDF</button>
            <button onClick={exportarTxt} className="flex items-center gap-1.5 px-3 py-2 border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50"><Download size={12}/> TXT</button>
            <label className="flex items-center gap-1.5 px-3 py-2 border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:border-emerald-400 hover:text-emerald-600 cursor-pointer">
              <Upload size={12}/> Importar<input type="file" accept=".txt,.csv" className="sr-only" onChange={importarTxt}/>
            </label>
            <Bg onClick={openNew} sm><Plus size={12}/> Nuevo</Bg>
          </div>}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>Código</Th><Th>RIF / NIT</Th><Th>Razón Social</Th><Th>Teléfono</Th><Th>Email</Th><Th>PUC</Th><Th>Días</Th><Th>Estado</Th><Th></Th></tr></thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={9}><EmptyState icon={Users} title="Sin clientes" desc="Registre o importe clientes"/></td></tr>}
                {filtered.map(c=><tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={()=>setDetalle(c)}>
                  <Td mono className="font-black text-orange-600">{c.codigo||rifToCodigo(c.rif)}</Td>
                  <Td mono className="font-semibold text-slate-700">{c.rif}</Td>
                  <Td className="uppercase font-semibold max-w-[160px] truncate">{c.nombre}</Td>
                  <Td>{c.telefono||'—'}</Td>
                  <Td className="text-slate-400 max-w-[120px] truncate">{c.email||'—'}</Td>
                  <Td mono className="text-blue-600 text-[10px]">{c.cuentaContableCod||'—'}</Td>
                  <Td mono className="text-slate-500">{c.diasCredito||'0'}d</Td>
                  <Td><Badge v={c.activo!==false?'green':'gray'}>{c.activo!==false?'Activo':'Inactivo'}</Badge></Td>
                  <Td>
                    <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setDetalle(c)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg" title="Detalle"><Search size={12}/></button>
                      <button onClick={()=>openEdit(c)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Editar"><Settings size={12}/></button>
                      <button onClick={()=>printCliente(c)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg" title="Imprimir"><Download size={12}/></button>
                      <button onClick={()=>eliminar(c)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={12}/></button>
                    </div>
                  </Td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const FacturasView = () => {
    const [modal, setModal] = useState(false);
    const [items, setItems] = useState([{ desc: '', cant: 1, precio: 0 }]);
    const [form, setForm] = useState({ clienteId: '', fechaEmision: getTodayDate(), moneda: 'USD' });
    const [busy, setBusy] = useState(false);
    const subtotal = items.reduce((s, i) => s + (Number(i.cant) * Number(i.precio)), 0);
    const iva = subtotal * 0.16; const total = subtotal + iva;

    const save = async () => {
      if (!form.clienteId) return alert('Seleccione un cliente');
      if (!items[0]?.desc) return alert('Agregue al menos una línea');
      setBusy(true);
      try {
        const c = clientes.find(x => x.id === form.clienteId);
        const numero = `FACT-${String(facturas.length + 1).padStart(5, '0')}`;
        const id = bancoGid(); let fVenc = form.fechaEmision;
        if (c.diasCredito > 0) { const d = new Date(form.fechaEmision); d.setDate(d.getDate() + Number(c.diasCredito)); fVenc = d.toISOString().split('T')[0]; }
        await setDoc(getDocRef('facturacion_facturas', id), { id, numero, clienteId: c.id, clienteNombre: c.nombre, clienteRif: c.rif, fechaEmision: form.fechaEmision, fechaVencimiento: fVenc, moneda: form.moneda, tasaRef: tasaActiva, subtotal, iva, total, saldoUSD: total, estado: 'Pendiente', items, ts: serverTimestamp() });
        setModal(false); setForm({ clienteId: '', fechaEmision: getTodayDate(), moneda: 'USD' }); setItems([{ desc: '', cant: 1, precio: 0 }]);
      } finally { setBusy(false); }
    };

    return (
      <div>
        <Card title="Historial de Facturas" subtitle={`${facturas.length} facturas emitidas`} action={<Bg onClick={() => setModal(true)}><Plus size={13} /> Emitir Factura</Bg>}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>Nro.</Th><Th>Emisión</Th><Th>Cliente</Th><Th>Vencimiento</Th><Th right>Total</Th><Th right>Saldo</Th><Th>Estado</Th></tr></thead>
              <tbody>
                {facturas.length === 0 && <tr><td colSpan={7}><EmptyState icon={Receipt} title="Sin facturas" desc="Emita su primera factura" /></td></tr>}
                {facturas.map(f => <tr key={f.id} className="hover:bg-slate-50">
                  <Td mono className="font-black text-orange-500">{f.numero}</Td>
                  <Td>{bancoDd(f.fechaEmision)}</Td>
                  <Td className="uppercase font-semibold max-w-[140px] truncate">{f.clienteNombre}</Td>
                  <Td className={f.fechaVencimiento < getTodayDate() && f.estado === 'Pendiente' ? 'text-red-500 font-bold' : ''}>{bancoDd(f.fechaVencimiento)}</Td>
                  <Td right mono className="font-black">{'$'+bancoFmt(f.total)}</Td>
                  <Td right mono className="font-black text-orange-600">{'$'+bancoFmt(f.saldoUSD)}</Td>
                  <Td><Badge v={f.estado === 'Pagada' ? 'green' : f.fechaVencimiento < getTodayDate() ? 'red' : 'gold'}>{f.estado || 'Pendiente'}</Badge></Td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </Card>
        <Modal open={modal} onClose={() => setModal(false)} title="Emisión de Nueva Factura" wide footer={<><Bo onClick={() => setModal(false)}>Cancelar</Bo><Bg onClick={save} disabled={busy}>{busy ? 'Procesando...' : 'Emitir Factura'}</Bg></>}>
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
            <BFG label="Cliente" full><select className={sel} value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}><option value="">— Seleccione cliente —</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.rif} · {c.nombre}</option>)}</select></BFG>
            <BFG label="Fecha Emisión"><input type="date" className={inp} value={form.fechaEmision} onChange={e => setForm({ ...form, fechaEmision: e.target.value })} /></BFG>
            <BFG label="Moneda"><select className={sel} value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}><option>USD</option><option>EUR</option></select></BFG>
          </div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wide">Líneas de Facturación</h4>
            <button onClick={() => setItems([...items, { desc: '', cant: 1, precio: 0 }])} className="text-[10px] font-black uppercase text-orange-500 flex items-center gap-1 hover:bg-orange-50 px-2 py-1 rounded-lg transition-colors"><Plus size={12} /> Agregar Línea</button>
          </div>
          <div className="space-y-2 mb-6">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <input type="text" className={`${inp} flex-1 bg-white`} placeholder="Descripción del producto/servicio" value={item.desc} onChange={e => { const n = [...items]; n[i].desc = e.target.value; setItems(n); }} />
                <input type="number" min="1" className={`${inp} w-16 text-center bg-white`} value={item.cant} onChange={e => { const n = [...items]; n[i].cant = e.target.value; setItems(n); }} />
                <input type="number" step="0.01" className={`${inp} w-28 text-right bg-white`} placeholder="P. Unit." value={item.precio} onChange={e => { const n = [...items]; n[i].precio = e.target.value; setItems(n); }} />
                <div className="w-24 text-right font-mono font-black text-xs text-slate-600">{'$'+bancoFmt(item.cant * item.precio)}</div>
                <button onClick={() => { const n = [...items]; n.splice(i, 1); setItems(n); }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-5 flex justify-end gap-10" style={{ background: DARK }}>
            <div className="text-right space-y-1.5 text-xs text-slate-400"><p>SUBTOTAL</p><p>IVA (16%)</p><p className="text-sm font-black text-white mt-2 pt-1 border-t border-white/10">TOTAL</p></div>
            <div className="text-right space-y-1.5 font-mono font-black text-xs text-white"><p>{'$'+bancoFmt(subtotal)}</p><p>{'$'+bancoFmt(iva)}</p><p className="text-xl mt-1 pt-1 border-t border-white/10" style={{ color: ORANGE }}>{'$'+bancoFmt(total)}</p></div>
          </div>
        </Modal>
      </div>
    );
  };

  const CxCView = () => {
    const [modalPago, setModalPago] = useState(false);
    const [fActiva, setFActiva] = useState(null);
    const [formPago, setFormPago] = useState({ fecha: getTodayDate(), monto: '', metodo: 'Transferencia Bs', ref: '' });
    const [busy, setBusy] = useState(false);
    const pendientes = facturas.filter(f => f.estado === 'Pendiente');
    const abonoUSD = Number(formPago.monto) || 0;
    const aplicaIGTF = ['Efectivo Divisas', 'Zelle'].includes(formPago.metodo);
    const montoIGTF = aplicaIGTF ? abonoUSD * 0.03 : 0;
    const montoBs = abonoUSD * tasaActiva;
    const difCambiario = montoBs - (abonoUSD * (fActiva?.tasaRef || tasaActiva));

    const registrarPago = async () => {
      if (!formPago.monto || !formPago.ref) return alert('Monto y referencia requeridos');
      if (abonoUSD > fActiva.saldoUSD + 0.01) return alert('El monto supera el saldo deudor');
      setBusy(true);
      try {
        const pId = bancoGid(); const nuevoSaldo = Math.max(0, fActiva.saldoUSD - abonoUSD);
        const nuevoEstado = nuevoSaldo < 0.01 ? 'Pagada' : 'Pendiente';
        const batch = writeBatch(_bancoDB);
        batch.set(getDocRef('facturacion_pagos', pId), { id: pId, facturaId: fActiva.id, facturaNumero: fActiva.numero, clienteNombre: fActiva.clienteNombre, fecha: formPago.fecha, monto: abonoUSD, igtf: montoIGTF, difCambiario, metodo: formPago.metodo, ref: formPago.ref, ts: serverTimestamp() });
        batch.update(getDocRef('facturacion_facturas', fActiva.id), { saldoUSD: nuevoSaldo, estado: nuevoEstado });
        await batch.commit();
        setModalPago(false); setFormPago({ fecha: getTodayDate(), monto: '', metodo: 'Transferencia Bs', ref: '' }); setFActiva(null);
      } finally { setBusy(false); }
    };

    return (
      <div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <BKPI label="Facturas Pendientes" value={pendientes.length} accent="gold" Icon={Clock} />
          <BKPI label="Saldo Total CxC" value={`$${bancoFmt(pendientes.reduce((a, f) => a + (f.saldoUSD || 0), 0))}`} accent="orange" Icon={Wallet} />
          <BKPI label="Vencidas Críticas" value={pendientes.filter(f => f.fechaVencimiento < getTodayDate()).length} accent="red" Icon={AlertTriangle} />
        </div>
        <Card title="Cuentas por Cobrar" subtitle="Facturas con saldo deudor pendiente">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>Factura</Th><Th>Cliente</Th><Th>Vencimiento</Th><Th right>Tasa Orig.</Th><Th right>Total Fact.</Th><Th right>Saldo Deudor</Th><Th></Th></tr></thead>
              <tbody>
                {pendientes.length === 0 && <tr><td colSpan={7}><EmptyState icon={CheckCircle} title="¡Todo al día!" desc="No hay cuentas pendientes de cobro" /></td></tr>}
                {pendientes.map(f => <tr key={f.id} className="hover:bg-slate-50">
                  <Td mono className="font-black text-slate-900">{f.numero}</Td>
                  <Td className="uppercase font-semibold max-w-[130px] truncate">{f.clienteNombre}</Td>
                  <Td className={f.fechaVencimiento < getTodayDate() ? 'text-red-600 font-bold' : ''}>
                    {bancoDd(f.fechaVencimiento)}{f.fechaVencimiento < getTodayDate() && <span className="ml-1.5 text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase font-black">Vencida</span>}
                  </Td>
                  <Td right mono>{f.tasaRef}</Td>
                  <Td right mono className="font-black">{'$'+bancoFmt(f.total)}</Td>
                  <Td right mono className="font-black text-orange-500 text-sm">{'$'+bancoFmt(f.saldoUSD)}</Td>
                  <Td right>
                    <button onClick={() => { setFActiva(f); setFormPago({ fecha: getTodayDate(), monto: String(f.saldoUSD), metodo: 'Transferencia Bs', ref: '' }); setModalPago(true); }}
                      className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-white transition-colors hover:opacity-90" style={{ background: ORANGE }}>Abonar</button>
                  </Td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal open={modalPago} onClose={() => setModalPago(false)} title={`Registrar Cobro — ${fActiva?.numero}`} footer={<><Bo onClick={() => setModalPago(false)}>Cancelar</Bo><Bg onClick={registrarPago} disabled={busy}>{busy ? 'Registrando...' : 'Confirmar Cobro'}</Bg></>}>
          {fActiva && <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
              <div><p className="text-[10px] text-slate-400 font-black uppercase mb-0.5">Cliente</p><p className="font-black text-slate-900">{fActiva.clienteNombre}</p></div>
              <div className="text-right"><p className="text-[10px] text-slate-400 font-black uppercase mb-0.5">Saldo Pendiente</p><p className="font-mono font-black text-2xl text-orange-500">{'$'+bancoFmt(fActiva.saldoUSD)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <BFG label="Fecha de Cobro"><input type="date" className={inp} value={formPago.fecha} onChange={e => setFormPago({ ...formPago, fecha: e.target.value })} /></BFG>
              <BFG label="Monto USD a Abonar"><input type="number" step="0.01" className={inp} value={formPago.monto} onChange={e => setFormPago({ ...formPago, monto: e.target.value })} /></BFG>
              <BFG label="Método de Pago"><select className={sel} value={formPago.metodo} onChange={e => setFormPago({ ...formPago, metodo: e.target.value })}><option>Transferencia Bs</option><option>Efectivo Divisas</option><option>Zelle</option><option>Efectivo Bs</option></select></BFG>
              <BFG label="N° Referencia / Comprobante"><input className={inp} value={formPago.ref} onChange={e => setFormPago({ ...formPago, ref: e.target.value })} placeholder="REF-0000000" /></BFG>
            </div>
            {formPago.metodo === 'Transferencia Bs' && abonoUSD > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 grid grid-cols-3 gap-3">
                <div><p className="text-[9px] font-black text-blue-600 uppercase mb-1">Cobro en Bs.</p><p className="font-mono font-black text-slate-900">Bs. {bancoFmt(montoBs)}</p><p className="text-[9px] text-slate-400">Tasa: {tasaActiva}</p></div>
                <div><p className="text-[9px] font-black text-slate-500 uppercase mb-1">Valor Original</p><p className="font-mono font-black text-slate-600">Bs. {bancoFmt(abonoUSD * (fActiva.tasaRef || tasaActiva))}</p><p className="text-[9px] text-slate-400">Tasa: {fActiva.tasaRef}</p></div>
                <div className="border-l border-blue-200 pl-3"><p className="text-[9px] font-black text-blue-600 uppercase mb-1">Dif. Cambiario</p><p className={`font-mono font-black ${difCambiario >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{difCambiario >= 0 ? '+' : ''}Bs. {bancoFmt(difCambiario)}</p></div>
              </div>
            )}
            {aplicaIGTF && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center"><div><p className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1.5"><AlertTriangle size={13} /> Percepción IGTF (3%)</p><p className="text-[9px] text-slate-500 mt-0.5">Aplica por pago en divisas</p></div><p className="font-mono font-black text-xl text-amber-600">{'$'+bancoFmt(montoIGTF)}</p></div>}
          </div>}
        </Modal>
      </div>
    );
  };

  const navGroups = [
    { group: 'Analítica', items: [{ id: 'dashboard', label: 'Resumen Ejecutivo', icon: LayoutDashboard }] },
    { group: 'Operaciones', items: [{ id: 'clientes', label: 'Directorio Clientes', icon: Users }, { id: 'facturas', label: 'Emisión de Facturas', icon: Receipt }] },
    { group: 'Finanzas', items: [{ id: 'cxc', label: 'Cuentas por Cobrar', icon: Wallet }] },
  ];
  const views = { dashboard: <DashboardView />, clientes: <ClientesView />, facturas: <FacturasView />, cxc: <CxCView /> };
  const curNav = navGroups.flatMap(g => g.items).find(n => n.id === sec);

  return (
    <SidebarLayout brand="Supply G&B" brandSub="Facturación & CxC" navGroups={navGroups} activeId={sec} onNav={setSec} onBack={onBack}
      headerContent={<>
        <div><h1 className="font-black text-slate-800 text-sm uppercase tracking-wide">{curNav?.label}</h1><p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Ventas <ChevronRight size={8} className="inline" /> {navGroups.find(g => g.items.find(i => i.id === sec))?.group}</p></div>
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 flex items-center gap-1.5"><DollarSign size={12} className="text-orange-500" /><span className="text-[10px] font-black text-orange-700 font-mono">Tasa: {tasaActiva} Bs/$</span></div>
          <Bg onClick={() => setSec('facturas')} sm><Plus size={12} /> Facturar</Bg>
        </div>
      </>}>
      {views[sec]}
    </SidebarLayout>
  );
}

// ============================================================================
// MÓDULO INVENTARIO (NUEVO — COMPLETO)
// ============================================================================
function InventarioApp({ fbUser, onBack }) {
  const [sec, setSec] = useState('dashboard');
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  useEffect(() => {
    if (!fbUser) return;
    const subs = [
      onSnapshot(getColRef('inv_categorias'), s => setCategorias(s.docs.map(d => d.data()))),
      onSnapshot(getColRef('inv_productos'), s => setProductos(s.docs.map(d => d.data()))),
      onSnapshot(query(getColRef('inv_movimientos'), orderBy('fecha', 'desc')), s => setMovimientos(s.docs.map(d => d.data())))
    ];
    return () => subs.forEach(u => u());
  }, [fbUser]);

  const DashboardView = () => {
    const bajoMinimo = productos.filter(p => Number(p.stockActual || 0) <= Number(p.stockMinimo || 0));
    const valorInventario = productos.reduce((a, p) => a + (Number(p.stockActual || 0) * Number(p.precioCosto || 0)), 0);
    const entradasMes = movimientos.filter(m => m.tipo === 'Entrada' && m.fecha?.startsWith(bancoMesActual())).reduce((a, m) => a + Number(m.cantidad || 0), 0);
    const salidasMes = movimientos.filter(m => m.tipo === 'Salida' && m.fecha?.startsWith(bancoMesActual())).reduce((a, m) => a + Number(m.cantidad || 0), 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BKPI label="Productos Activos" value={productos.length} accent="blue" Icon={Package} />
          <BKPI label="Valor en Inventario" value={`$${bancoFmt(valorInventario)}`} accent="green" Icon={DollarSign} sub="A precio de costo" />
          <BKPI label="Alertas Stock Bajo" value={bajoMinimo.length} accent={bajoMinimo.length > 0 ? 'red' : 'green'} Icon={AlertTriangle} />
          <BKPI label="Categorías" value={categorias.length} accent="purple" Icon={Tag} />
        </div>

        {bajoMinimo.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-red-500" /><p className="font-black text-red-700 text-sm uppercase tracking-wide">Alertas de Reabastecimiento</p></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {bajoMinimo.slice(0, 8).map(p => (
                <div key={p.id} className="bg-white rounded-xl p-3 border border-red-100">
                  <p className="font-black text-slate-900 text-xs uppercase truncate">{p.nombre}</p>
                  <p className="text-[10px] text-red-600 font-black mt-1">Stock: {p.stockActual} / Min: {p.stockMinimo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          <Card title="Últimos Movimientos">
            {movimientos.length === 0 ? <EmptyState icon={ArrowLeftRight} title="Sin movimientos" desc="Los movimientos de inventario aparecerán aquí" /> :
              <table className="w-full"><thead><tr><Th>Fecha</Th><Th>Tipo</Th><Th>Producto</Th><Th right>Cant.</Th></tr></thead>
                <tbody>{movimientos.slice(0, 8).map(m => <tr key={m.id} className="hover:bg-slate-50">
                  <Td>{bancoDd(m.fecha)}</Td>
                  <Td><Badge v={m.tipo === 'Entrada' ? 'green' : m.tipo === 'Salida' ? 'red' : 'blue'}>{m.tipo}</Badge></Td>
                  <Td className="max-w-[140px] truncate">{m.productoNombre}</Td>
                  <Td right mono className={`font-black ${m.tipo === 'Entrada' ? 'text-emerald-600' : 'text-red-500'}`}>{m.tipo === 'Entrada' ? '+' : '-'}{m.cantidad}</Td>
                </tr>)}</tbody>
              </table>}
          </Card>
          <Card title="Top Productos por Valor">
            {productos.length === 0 ? <EmptyState icon={Package} title="Sin productos" desc="Registre productos en el catálogo" /> :
              <table className="w-full"><thead><tr><Th>Producto</Th><Th right>Stock</Th><Th right>Valor</Th></tr></thead>
                <tbody>{[...productos].sort((a, b) => (Number(b.stockActual || 0) * Number(b.precioCosto || 0)) - (Number(a.stockActual || 0) * Number(a.precioCosto || 0))).slice(0, 6).map(p => <tr key={p.id} className="hover:bg-slate-50">
                  <Td className="max-w-[150px] truncate font-semibold">{p.nombre}</Td>
                  <Td right mono>{p.stockActual} {p.unidad}</Td>
                  <Td right mono className="font-black">{'$'+bancoFmt(Number(p.stockActual || 0) * Number(p.precioCosto || 0))}</Td>
                </tr>)}</tbody>
              </table>}
          </Card>
        </div>
      </div>
    );
  };

  const CategoriasView = () => {
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ nombre: '', descripcion: '' });
    const [busy, setBusy] = useState(false);
    const save = async () => {
      if (!form.nombre) return alert('Nombre requerido');
      setBusy(true);
      try { const id = bancoGid(); await setDoc(getDocRef('inv_categorias', id), { ...form, id, ts: serverTimestamp() }); setModal(false); setForm({ nombre: '', descripcion: '' }); } finally { setBusy(false); }
    };
    return (
      <div>
        <Card title="Categorías de Productos" subtitle={`${categorias.length} categorías registradas`} action={<Bg onClick={() => setModal(true)} sm><Plus size={12} /> Nueva</Bg>}>
          {categorias.length === 0 ? <EmptyState icon={Tag} title="Sin categorías" desc="Cree categorías para organizar su inventario" /> :
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {categorias.map(c => (
                <div key={c.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between group">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><Tag size={14} className="text-emerald-600" /></div><div><p className="font-black text-slate-900 text-xs uppercase">{c.nombre}</p>{c.descripcion && <p className="text-[10px] text-slate-400">{c.descripcion}</p>}</div></div>
                  <button onClick={() => deleteDoc(getDocRef('inv_categorias', c.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>}
        </Card>
        <Modal open={modal} onClose={() => setModal(false)} title="Nueva Categoría" footer={<><Bo onClick={() => setModal(false)}>Cancelar</Bo><Bg onClick={save} disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</Bg></>}>
          <div className="space-y-4">
            <BFG label="Nombre de Categoría"><input className={inp} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value.toUpperCase() })} placeholder="REPUESTOS ELÉCTRICOS" /></BFG>
            <BFG label="Descripción (Opcional)"><input className={inp} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción breve..." /></BFG>
          </div>
        </Modal>
      </div>
    );
  };

  const ProductosView = () => {
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ codigo: '', nombre: '', categoriaId: '', unidad: 'UND', precioCosto: '', precioVenta: '', stockActual: '0', stockMinimo: '0' });
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState('');
    const filtered = productos.filter(p => p.nombre?.toUpperCase().includes(search.toUpperCase()) || p.codigo?.includes(search.toUpperCase()));

    const save = async () => {
      if (!form.codigo || !form.nombre) return alert('Código y nombre requeridos');
      setBusy(true);
      try {
        const id = bancoGid(); const cat = categorias.find(c => c.id === form.categoriaId);
        await setDoc(getDocRef('inv_productos', id), { ...form, id, categoriaNombre: cat?.nombre || '', precioCosto: Number(form.precioCosto), precioVenta: Number(form.precioVenta), stockActual: Number(form.stockActual), stockMinimo: Number(form.stockMinimo), ts: serverTimestamp() });
        setModal(false); setForm({ codigo: '', nombre: '', categoriaId: '', unidad: 'UND', precioCosto: '', precioVenta: '', stockActual: '0', stockMinimo: '0' });
      } finally { setBusy(false); }
    };

    return (
      <div>
        <Card title="Catálogo de Productos" subtitle={`${productos.length} productos registrados`}
          action={<div className="flex gap-2"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="border-2 border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-orange-500 w-36" /></div><Bg onClick={() => setModal(true)} sm><Plus size={12} /> Nuevo</Bg></div>}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>Código</Th><Th>Producto</Th><Th>Categoría</Th><Th>Unidad</Th><Th right>P. Costo</Th><Th right>P. Venta</Th><Th right>Stock</Th><Th>Estado</Th><Th></Th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={9}><EmptyState icon={Package} title="Sin productos" desc="Registre su primer producto" /></td></tr>}
                {filtered.map(p => {
                  const bajo = Number(p.stockActual) <= Number(p.stockMinimo);
                  return <tr key={p.id} className="hover:bg-slate-50">
                    <Td mono className="font-black text-slate-900">{p.codigo}</Td>
                    <Td className="font-semibold max-w-[160px] truncate">{p.nombre}</Td>
                    <Td><span className="text-[10px] text-slate-500 uppercase font-semibold">{p.categoriaNombre || '—'}</span></Td>
                    <Td><span className="text-[10px] font-black uppercase">{p.unidad}</span></Td>
                    <Td right mono>{'$'+bancoFmt(p.precioCosto)}</Td>
                    <Td right mono className="font-black">{'$'+bancoFmt(p.precioVenta)}</Td>
                    <Td right mono className={`font-black ${bajo ? 'text-red-500' : 'text-slate-900'}`}>{p.stockActual}</Td>
                    <Td><Badge v={bajo ? 'red' : 'green'}>{bajo ? 'Stock Bajo' : 'Normal'}</Badge></Td>
                    <Td><button onClick={() => deleteDoc(getDocRef('inv_productos', p.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={12} /></button></Td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal open={modal} onClose={() => setModal(false)} title="Registrar Producto" wide footer={<><Bo onClick={() => setModal(false)}>Cancelar</Bo><Bg onClick={save} disabled={busy}>{busy ? 'Guardando...' : 'Guardar Producto'}</Bg></>}>
          <div className="grid grid-cols-2 gap-4">
            <BFG label="Código / SKU"><input className={inp} value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="PROD-001" /></BFG>
            <BFG label="Nombre del Producto"><input className={inp} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value.toUpperCase() })} placeholder="CABLE ELÉCTRICO 2.5MM" /></BFG>
            <BFG label="Categoría"><select className={sel} value={form.categoriaId} onChange={e => setForm({ ...form, categoriaId: e.target.value })}><option value="">— Sin categoría —</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></BFG>
            <BFG label="Unidad de Medida"><select className={sel} value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}><option>UND</option><option>KG</option><option>GR</option><option>LT</option><option>MT</option><option>M2</option><option>CAJA</option><option>PAR</option></select></BFG>
            <BFG label="Precio de Costo ($)"><input type="number" step="0.01" className={inp} value={form.precioCosto} onChange={e => setForm({ ...form, precioCosto: e.target.value })} placeholder="0.00" /></BFG>
            <BFG label="Precio de Venta ($)"><input type="number" step="0.01" className={inp} value={form.precioVenta} onChange={e => setForm({ ...form, precioVenta: e.target.value })} placeholder="0.00" /></BFG>
            <BFG label="Stock Inicial"><input type="number" className={inp} value={form.stockActual} onChange={e => setForm({ ...form, stockActual: e.target.value })} /></BFG>
            <BFG label="Stock Mínimo (Alerta)"><input type="number" className={inp} value={form.stockMinimo} onChange={e => setForm({ ...form, stockMinimo: e.target.value })} /></BFG>
          </div>
        </Modal>
      </div>
    );
  };

  const MovimientosView = () => {
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ fecha: getTodayDate(), tipo: 'Entrada', productoId: '', cantidad: '', descripcion: '', referencia: '' });
    const [busy, setBusy] = useState(false);

    const save = async () => {
      if (!form.productoId || !form.cantidad) return alert('Producto y cantidad requeridos');
      setBusy(true);
      try {
        const prod = productos.find(p => p.id === form.productoId);
        const cant = Number(form.cantidad);
        const nuevoStock = form.tipo === 'Entrada' ? Number(prod.stockActual || 0) + cant : Math.max(0, Number(prod.stockActual || 0) - cant);
        const id = bancoGid();
        const batch = writeBatch(_bancoDB);
        batch.set(getDocRef('inv_movimientos', id), { id, fecha: form.fecha, tipo: form.tipo, productoId: prod.id, productoNombre: prod.nombre, productoCode: prod.codigo, cantidad: cant, descripcion: form.descripcion, referencia: form.referencia, stockAnterior: Number(prod.stockActual || 0), stockResultante: nuevoStock, ts: serverTimestamp() });
        batch.update(getDocRef('inv_productos', prod.id), { stockActual: nuevoStock });
        await batch.commit();
        setModal(false); setForm({ fecha: getTodayDate(), tipo: 'Entrada', productoId: '', cantidad: '', descripcion: '', referencia: '' });
      } finally { setBusy(false); }
    };

    return (
      <div>
        <Card title="Kardex — Movimientos de Inventario" subtitle="Historial de entradas, salidas y ajustes" action={<Bg onClick={() => setModal(true)}><Plus size={13} /> Nuevo Movimiento</Bg>}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><Th>Fecha</Th><Th>Tipo</Th><Th>Código</Th><Th>Producto</Th><Th>Descripción</Th><Th>Referencia</Th><Th right>Cant.</Th><Th right>Stock Res.</Th></tr></thead>
              <tbody>
                {movimientos.length === 0 && <tr><td colSpan={8}><EmptyState icon={ArrowLeftRight} title="Sin movimientos" desc="Registre entradas y salidas de inventario" /></td></tr>}
                {movimientos.map(m => <tr key={m.id} className="hover:bg-slate-50">
                  <Td>{bancoDd(m.fecha)}</Td>
                  <Td><Badge v={m.tipo === 'Entrada' ? 'green' : m.tipo === 'Salida' ? 'red' : 'blue'}>{m.tipo}</Badge></Td>
                  <Td mono className="font-black text-slate-700">{m.productoCode}</Td>
                  <Td className="max-w-[160px] truncate font-semibold">{m.productoNombre}</Td>
                  <Td className="text-slate-400 max-w-[160px] truncate">{m.descripcion || '—'}</Td>
                  <Td mono className="text-slate-500">{m.referencia || '—'}</Td>
                  <Td right mono className={`font-black text-sm ${m.tipo === 'Entrada' ? 'text-emerald-600' : 'text-red-500'}`}>{m.tipo === 'Entrada' ? '+' : '-'}{m.cantidad}</Td>
                  <Td right mono className="font-black text-slate-900">{m.stockResultante}</Td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </Card>
        <Modal open={modal} onClose={() => setModal(false)} title="Registrar Movimiento de Inventario" footer={<><Bo onClick={() => setModal(false)}>Cancelar</Bo><Bg onClick={save} disabled={busy}>{busy ? 'Registrando...' : 'Registrar'}</Bg></>}>
          <div className="grid grid-cols-2 gap-4">
            <BFG label="Fecha"><input type="date" className={inp} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></BFG>
            <BFG label="Tipo de Movimiento"><select className={sel} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option>Entrada</option><option>Salida</option><option>Ajuste</option><option>Devolución</option></select></BFG>
            <BFG label="Producto" full><select className={sel} value={form.productoId} onChange={e => setForm({ ...form, productoId: e.target.value })}><option value="">— Seleccione producto —</option>{productos.map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre} (Stock: {p.stockActual})</option>)}</select></BFG>
            <BFG label="Cantidad"><input type="number" min="0.01" step="0.01" className={inp} value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} /></BFG>
            <BFG label="Referencia"><input className={inp} value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="OC-001 / FACT-001" /></BFG>
            <BFG label="Descripción" full><input className={inp} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción del movimiento..." /></BFG>
          </div>
        </Modal>
      </div>
    );
  };

  const navGroups = [
    { group: 'Analítica', items: [{ id: 'dashboard', label: 'Tablero General', icon: LayoutDashboard }] },
    { group: 'Maestros', items: [{ id: 'categorias', label: 'Categorías', icon: Tag }, { id: 'productos', label: 'Catálogo Productos', icon: Package }] },
    { group: 'Operaciones', items: [{ id: 'movimientos', label: 'Kardex / Movimientos', icon: ArrowLeftRight }] },
  ];
  const views = { dashboard: <DashboardView />, categorias: <CategoriasView />, productos: <ProductosView />, movimientos: <MovimientosView /> };
  const curNav = navGroups.flatMap(g => g.items).find(n => n.id === sec);

  return (
    <SidebarLayout brand="Supply G&B" brandSub="Control de Inventario" navGroups={navGroups} activeId={sec} onNav={setSec} onBack={onBack} accentColor="#10b981"
      headerContent={<>
        <div><h1 className="font-black text-slate-800 text-sm uppercase tracking-wide">{curNav?.label}</h1><p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Inventario <ChevronRight size={8} className="inline" /> Stock & Movimientos</p></div>
        <Bg onClick={() => setSec('movimientos')} sm><Plus size={12} /> Movimiento</Bg>
      </>}>
      {views[sec]}
    </SidebarLayout>
  );
}


// ============================================================================
// MÓDULO BANCO & CAJA — ARQUITECTURA COMPLETA v3
// ============================================================================
/* CSS para impresión (oculta controles, muestra solo contenido) */
const PRINT_STYLE = `@media print{.no-print{display:none!important}.print-only{display:block!important}body{background:#fff}@page{margin:1.5cm}}`;

const TIPO_BANCO = [
  { id:'Nacional-Bs',   label:'Banco Nacional — Bs.',         moneda:'BS',  flag:'🇻🇪' },
  { id:'Nacional-Ext',  label:'Banco Nacional — USD (ME)',     moneda:'USD', flag:'🏦' },
  { id:'Internacional', label:'Banco Internacional — USD',     moneda:'USD', flag:'🌐' },
  { id:'Pago-Movil',    label:'Pago Móvil (no bancario)',      moneda:'BS',  flag:'📱' },
  { id:'Electronica',   label:'Cuenta Electrónica',            moneda:'USD', flag:'💳' },
  { id:'Tarjeta-Debito-Intl', label:'Tarjeta de Débito Internacional', moneda:'USD', flag:'🪪' },
];

// Denominaciones VES para arqueo
const DENOM_BS  = [500,200,100,50,20,10,5,2,1,0.5,0.25,0.10,0.05,0.01];
const DENOM_USD = [100,50,20,10,5,2,1];

// --- FIN CONSTANTES ---

// ConciliacionView — componente de nivel superior (NO anidado dentro de BancoApp) para que su
// estado local (cuenta seleccionada, fechas, movimientos marcados) no se pierda cada vez que
// BancoApp se re-renderiza por una actualización de Firestore (cosa que puede pasar cada pocos
// segundos). Recibe como props únicamente lo que antes tomaba por cierre (closure).
function ConciliacionView({ cuentas, movBanco, tasaActiva, concils, validarClaveAdmin }) {
  const [cuentaId,setCuentaId]=useState('');const [desde,setDesde]=useState(bancoMesActual()+'-01');const [hasta,setHasta]=useState(getTodayDate());
  const [saldoBanco,setSaldoBco]=useState('');const [marcados,setMarcados]=useState({});const [busy,setBusy]=useState(false);
  const [histEdit,setHistEdit]=useState(null);
  const [histEditForm,setHistEditForm]=useState({fecha:'',saldoBanco:''});
  const [pwdPrompt,setPwdPrompt]=useState(null); // {accion:'editar'|'eliminar', c}
  const [pwdInput,setPwdInput]=useState('');
  const [pwdError,setPwdError]=useState(false);
  const cuenta=cuentas.find(c=>c.id===cuentaId);
  const esCuentaBs=cuenta?.tipoBanco==='Nacional-Bs'||cuenta?.moneda==='BS';
  const todos=movBanco.filter(m=>m.cuentaId===cuentaId&&m.estatus!=='Conciliado'&&(!desde||m.fecha>=desde)&&(!hasta||m.fecha<=hasta));
  const toggle=id=>setMarcados(p=>({...p,[id]:p[id]===false?true:false}));
  const marcarTodos=()=>{const n={};todos.forEach(m=>n[m.id]=true);setMarcados(p=>({...p,...n}));};
  const desmarcarTodos=()=>{const n={};todos.forEach(m=>n[m.id]=false);setMarcados(p=>({...p,...n}));};
  const todosMarcados = todos.length>0 && todos.every(m=>marcados[m.id]!==false);
  // "En tránsito" = lo que aparece en el rango pero NO se marcó como confirmado contra el estado
  // de cuenta del banco — por defecto arranca marcado (asumiendo que todo cuadra), así que acá
  // se cuenta lo que el usuario DESMARCÓ explícitamente.
  const egTrans=todos.filter(m=>m.tipo!=='Ingreso'&&marcados[m.id]===false).reduce((a,m)=>a+Number(m.montoUSD||0),0);
  const ingTrans=todos.filter(m=>m.tipo==='Ingreso'&&marcados[m.id]===false).reduce((a,m)=>a+Number(m.montoUSD||0),0);
  const cargos=0;const abonos=0;
  // Saldo Inicial del período: se ancla al Saldo Inicial FIJO que se declaró en la ficha de la
  // cuenta (mesSaldoInicial) y avanza hacia adelante hasta "desde" — igual que el panel de
  // Balance mensual. Antes se calculaba retrocediendo desde el saldo VIVO de la cuenta, que
  // puede traer arrastrado el efecto de bugs ya corregidos (comisiones mal calculadas, traslados
  // cross-currency, etc.) — apoyarse en el saldo vivo para esto daba números irreales.
  const montoNativoMov = m => esCuentaBs?Number(m.montoBs||0):Number(m.montoUSD||0);
  const signoMov = m => m.tipo==='Ingreso'?1:-1; // Egreso y Traslado de Fondo restan del saldo
  const saldoIniCtaNativo = Number(cuenta?.saldoInicial ?? cuenta?.saldo ?? 0);
  const inicioCtaConcil = `${cuenta?.mesSaldoInicial||'2000-01'}-01`;
  const movsAncladas = cuenta ? movBanco.filter(m=>m.cuentaId===cuentaId && m.fecha>=inicioCtaConcil && (!desde || m.fecha<desde)) : [];
  const netoAncladas = movsAncladas.reduce((s,m)=>s+signoMov(m)*montoNativoMov(m),0);
  const saldoInicialNativo = saldoIniCtaNativo + netoAncladas;
  const entradasNativo = todos.filter(m=>m.tipo==='Ingreso'&&marcados[m.id]!==false).reduce((a,m)=>a+montoNativoMov(m),0);
  const salidasNativo  = todos.filter(m=>m.tipo!=='Ingreso'&&marcados[m.id]!==false).reduce((a,m)=>a+montoNativoMov(m),0);
  const saldoLibrosCalculadoNativo = saldoInicialNativo + entradasNativo - salidasNativo;
  const saldoLibrosUSD = cuenta?(esCuentaBs?saldoLibrosCalculadoNativo/tasaActiva:saldoLibrosCalculadoNativo):0;
  const saldoLibrosBs  = cuenta?(esCuentaBs?saldoLibrosCalculadoNativo:saldoLibrosCalculadoNativo*tasaActiva):0;
  const saldoLibros=saldoLibrosUSD; // alias para compatibilidad con lógica de cuadre
  const saldoInicialUSD = cuenta?(esCuentaBs?saldoInicialNativo/tasaActiva:saldoInicialNativo):0;
  const saldoInicialBs  = cuenta?(esCuentaBs?saldoInicialNativo:saldoInicialNativo*tasaActiva):0;
  const saldoConcil=saldoLibros; // el ajuste por marcados/no-marcados ya está adentro de saldoLibrosCalculadoNativo
  const sbNum=Number(saldoBanco)||0;const saldoConcilMonedaCta=esCuentaBs?saldoLibrosBs:saldoLibrosUSD;const diff=sbNum-saldoConcilMonedaCta;const OK=Math.abs(diff)<0.01&&sbNum>0;
  const aprobar=async()=>{
    if(!OK)return alert('Diferencia debe ser $0.00');
    if(!window.confirm('¿Aprobar conciliación? Podrás editarla o eliminarla luego con la clave de administrador si necesitas corregir algo.'))return;
    setBusy(true);
    try{
      const batch=writeBatch(_bancoDB);
      const movsConciliados=todos.filter(m=>marcados[m.id]!==false);
      const ids=movsConciliados.map(m=>m.id);
      ids.forEach(id=>batch.update(getDocRef('banco_movimientos',id),{estatus:'Conciliado'}));
      const movimientosDetalle=movsConciliados.map(m=>({fecha:m.fecha||'',tipo:m.tipo||'',concepto:m.concepto||'',referencia:m.referencia||'',montoUSD:Number(m.montoUSD||0),montoBs:Number(m.montoBs||0)})).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
      const entradasReconc=movsConciliados.filter(m=>m.tipo==='Ingreso').reduce((s,m)=>({usd:s.usd+Number(m.montoUSD||0),bs:s.bs+Number(m.montoBs||0)}),{usd:0,bs:0});
      const salidasReconc =movsConciliados.filter(m=>m.tipo!=='Ingreso').reduce((s,m)=>({usd:s.usd+Number(m.montoUSD||0),bs:s.bs+Number(m.montoBs||0)}),{usd:0,bs:0}); // Egreso, Traslado de Fondo, Transferencia — todo lo que no sea Ingreso sale de la cuenta
      const saldoInicialReconcUSD=saldoLibros-(entradasReconc.usd-salidasReconc.usd);
      const saldoInicialReconcBs=saldoLibrosBs-(entradasReconc.bs-salidasReconc.bs);
      const id=bancoGid();
      batch.set(getDocRef('banco_conciliaciones',id),{
        id,cuentaId,cuentaNombre:cuenta.banco,desde,hasta,saldoBanco:sbNum,saldoLibros,egTrans,ingTrans,saldoConcil,diff,count:ids.length,movimientoIds:ids,
        movimientosDetalle,entradasReconcUSD:entradasReconc.usd,entradasReconcBs:entradasReconc.bs,salidasReconcUSD:salidasReconc.usd,salidasReconcBs:salidasReconc.bs,
        saldoInicialReconcUSD,saldoInicialReconcBs,
        fecha:getTodayDate(),ts:serverTimestamp()
      });
      await batch.commit();
      setMarcados({});setSaldoBco('');alert(`✅ ${ids.length} movimiento(s) conciliados.`);
    }finally{setBusy(false);}
  };
  const historialCta = concils.filter(c=>c.cuentaId===cuentaId).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const exportarConcilPDF=(c)=>{
    const esBs=cuenta?.tipoBanco==='Nacional-Bs'||cuenta?.moneda==='BS';
    const fmt=(usd,bs)=>esBs?'Bs.'+bancoFmt(bs):'$'+bancoFmt(usd);
    const detalle=c.movimientosDetalle||[];
    const filasDetalle=detalle.length>0?detalle.map(m=>`
        <tr><td>${bancoDd(m.fecha)}</td><td>${m.tipo}</td><td>${m.concepto}${m.referencia?' · Ref. '+m.referencia:''}</td>
        <td style="text-align:right;color:${m.tipo==='Ingreso'?'#16a34a':'#dc2626'}">${m.tipo==='Egreso'?'-':''}${fmt(m.montoUSD,m.montoBs)}</td></tr>`).join('')
      :'<tr><td colspan="4" style="text-align:center;color:#94a3b8">Este registro es anterior a que se guardara el detalle de movimientos.</td></tr>';
    const html=bancoLetterheadOpen(`Conciliación Bancaria — ${c.cuentaNombre}`,`Conciliación realizada el ${bancoDd(c.fecha)} · Período del ${bancoDd(c.desde)} al ${bancoDd(c.hasta)}`)+
      `<table><thead><tr><th>Concepto</th><th>Monto</th></tr></thead><tbody>
        <tr><td>Saldo en Libros (Sistema)</td><td style="text-align:right">${fmt(c.saldoLibros,c.saldoLibros*tasaActiva)}</td></tr>
        <tr><td>(+) Egresos en Tránsito</td><td style="text-align:right">${fmt(c.egTrans,c.egTrans*tasaActiva)}</td></tr>
        <tr><td>(−) Ingresos en Tránsito</td><td style="text-align:right">${fmt(c.ingTrans,c.ingTrans*tasaActiva)}</td></tr>
        <tr><td><strong>= Saldo Conciliado</strong></td><td style="text-align:right"><strong>${fmt(c.saldoConcil,c.saldoConcil*tasaActiva)}</strong></td></tr>
        <tr><td>Saldo según Banco</td><td style="text-align:right">${esBs?'Bs.':'$'}${bancoFmt(c.saldoBanco)}</td></tr>
        <tr><td><strong>Diferencia</strong></td><td style="text-align:right"><strong>${esBs?'Bs.':'$'}${bancoFmt(c.diff)}</strong></td></tr>
      </tbody></table>
      <h3 style="margin-top:20px;font-size:11px;color:#1e3a5f;text-transform:uppercase;letter-spacing:2px">Resumen del Período Conciliado</h3>
      <table><thead><tr><th>Saldo Inicial</th><th>Entradas</th><th>Salidas</th><th>Saldo Final</th></tr></thead><tbody>
        <tr>
          <td>${fmt(c.saldoInicialReconcUSD||0,c.saldoInicialReconcBs||0)}</td>
          <td style="color:#16a34a">${fmt(c.entradasReconcUSD||0,c.entradasReconcBs||0)}</td>
          <td style="color:#dc2626">${fmt(c.salidasReconcUSD||0,c.salidasReconcBs||0)}</td>
          <td><strong>${fmt((c.saldoInicialReconcUSD||0)+(c.entradasReconcUSD||0)-(c.salidasReconcUSD||0),(c.saldoInicialReconcBs||0)+(c.entradasReconcBs||0)-(c.salidasReconcBs||0))}</strong></td>
        </tr>
      </tbody></table>
      <h3 style="margin-top:20px;font-size:11px;color:#1e3a5f;text-transform:uppercase;letter-spacing:2px">Detalle de Movimientos Conciliados (${c.count})</h3>
      <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Monto</th></tr></thead><tbody>${filasDetalle}</tbody></table>`+
      bancoLetterheadClose(`Conciliación aprobada el ${bancoDd(c.fecha)}`);
    bancoPrintWindow(html);
  };
  const abrirEditConcil=(c)=>{ setHistEdit(c); setHistEditForm({fecha:c.fecha||'',saldoBanco:String(c.saldoBanco||'')}); };
  const guardarEditConcilReal=async()=>{
    await updateDoc(getDocRef('banco_conciliaciones',histEdit.id),{fecha:histEditForm.fecha,saldoBanco:Number(histEditForm.saldoBanco)});
    setHistEdit(null);
  };
  const guardarEditConcil=()=>setPwdPrompt({accion:'editar'});
  const eliminarConcilReal=async(c)=>{
    const tieneIds=Array.isArray(c.movimientoIds)&&c.movimientoIds.length>0;
    const batch=writeBatch(_bancoDB);
    if(tieneIds) c.movimientoIds.forEach(id=>batch.update(getDocRef('banco_movimientos',id),{estatus:'No Conciliado'}));
    batch.delete(getDocRef('banco_conciliaciones',c.id));
    await batch.commit();
  };
  const eliminarConcil=(c)=>{
    const tieneIds=Array.isArray(c.movimientoIds)&&c.movimientoIds.length>0;
    const msg=tieneIds
      ? `¿Eliminar esta conciliación del ${bancoDd(c.fecha)}? Los ${c.movimientoIds.length} movimiento(s) volverán a estar "No Conciliado".`
      : `¿Eliminar esta conciliación del ${bancoDd(c.fecha)}? Este registro es antiguo y no guarda cuáles movimientos incluía, así que ESOS MOVIMIENTOS SEGUIRÁN BLOQUEADOS como Conciliado — tendrías que desbloquearlos manualmente.`;
    if(!window.confirm(msg))return;
    setPwdPrompt({accion:'eliminar',c});
  };
  const confirmarPwdPrompt=async()=>{
    const ok=await validarClaveAdmin(pwdInput);
    if(!ok){ setPwdError(true); setPwdInput(''); return; }
    if(pwdPrompt.accion==='editar') await guardarEditConcilReal();
    if(pwdPrompt.accion==='eliminar') await eliminarConcilReal(pwdPrompt.c);
    setPwdPrompt(null); setPwdInput(''); setPwdError(false);
  };
  return(<div className="space-y-5">
    <BCard title="Parámetros de Conciliación"><div className="grid grid-cols-4 gap-4">
      <BFG label="Cuenta" full><select className={sel} value={cuentaId} onChange={e=>{setCuentaId(e.target.value);setMarcados({});setSaldoBco('');}}>
        <option value="">— Seleccione cuenta a conciliar —</option>
        {[{label:'🇻🇪 Cuentas Nacionales — Bolívares',items:cuentas.filter(c=>c.tipoBanco==='Nacional-Bs')},
          {label:'💵 Cuentas Moneda Extranjera',items:cuentas.filter(c=>c.tipoBanco==='Nacional-Ext')},
          {label:'🌐 Cuentas Internacionales',items:cuentas.filter(c=>c.tipoBanco==='Internacional')},
          {label:'💳 Cuentas Electrónicas',items:cuentas.filter(c=>c.tipoBanco==='Electronica')},
          {label:'🪪 Tarjetas de Débito Internacionales',items:cuentas.filter(c=>c.tipoBanco==='Tarjeta-Debito-Intl')}
        ].map(g=>g.items.length>0&&(<optgroup key={g.label} label={g.label}>{g.items.map(c=><option key={c.id} value={c.id}>{c.banco} · {c.numeroCuenta} · {c.moneda==='BS'?'Bs.':'$'} {bancoFmt(c.saldo)}</option>)}</optgroup>))}
      </select></BFG>
      <BFG label="Desde"><input type="date" className={inp} value={desde} onChange={e=>setDesde(e.target.value)}/></BFG>
      <BFG label="Hasta"><input type="date" className={inp} value={hasta} onChange={e=>setHasta(e.target.value)}/></BFG>
      <BFG label={esCuentaBs?'Saldo según Banco (Bs.)':'Saldo según Banco ($)'}><input type="number" step="0.01" className={`${inp} font-black ${OK?'border-emerald-400 bg-emerald-50':sbNum>0?'border-amber-300':''}`} value={saldoBanco} onChange={e=>setSaldoBco(e.target.value)} placeholder={esCuentaBs?'0,00 Bs.':'0.00'}/></BFG>
    </div></BCard>
    {cuentaId&&<div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-3">
        <BCard title={`Movimientos a Conciliar (${todos.length})`} subtitle="Marque los que aparecen en el estado de cuenta" action={
          todos.length>0 && (
            <button onClick={todosMarcados?desmarcarTodos:marcarTodos} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <CheckCircle size={13}/> {todosMarcados?'Desmarcar todos':'Seleccionar todos'}
            </button>
          )
        }>
          {todos.length===0?<BEmptyState icon={CheckCircle} title="Sin movimientos pendientes" desc=""/>:
            <div className="divide-y divide-slate-100">{todos.map(m=>(
              <label key={m.id} className={`flex items-center gap-4 py-3 px-2 cursor-pointer rounded-xl hover:bg-slate-50 ${marcados[m.id]!==false?'bg-emerald-50/60':''}`}>
                <input type="checkbox" checked={marcados[m.id]!==false} onChange={()=>toggle(m.id)} className="w-4 h-4 accent-emerald-500 flex-shrink-0"/>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><BBadge v={m.tipo==='Ingreso'?'green':m.tipo==='Egreso'?'red':'blue'}>{m.tipo}</BBadge><span className="text-[10px] text-slate-400">{bancoDd(m.fecha)}</span></div><p className="text-xs font-semibold text-slate-700 truncate">{m.concepto}</p></div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-mono font-black text-sm ${m.tipo==='Ingreso'?'text-emerald-600':'text-red-500'}`}>{esCuentaBs?'Bs.'+bancoFmt(m.montoBs):'$'+bancoFmt(m.montoUSD)}</p>
                  <p className="text-[10px] text-slate-400">{esCuentaBs?'≈$'+bancoFmt(m.montoUSD):'Bs.'+bancoFmt(m.montoBs)}</p>
                </div>
                {marcados[m.id]!==false&&<CheckCircle size={16} className="text-emerald-500 flex-shrink-0"/>}
              </label>
            ))}</div>}
        </BCard>
      </div>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm sticky top-4">
          <div className="px-5 py-4" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}><p className="font-black text-white text-sm uppercase tracking-widest">Panel de Cuadre</p></div>
          <div className="p-5 space-y-3">
            {[
              {l:'Saldo Inicial (antes del "Desde")',v:saldoInicialUSD,vbs:saldoInicialBs,c:'text-slate-700',b:false},
              {l:'(+) Entradas marcadas',v:esCuentaBs?entradasNativo/tasaActiva:entradasNativo,vbs:esCuentaBs?entradasNativo:entradasNativo*tasaActiva,c:'text-emerald-500',b:false},
              {l:'(−) Salidas marcadas',v:esCuentaBs?salidasNativo/tasaActiva:salidasNativo,vbs:esCuentaBs?salidasNativo:salidasNativo*tasaActiva,c:'text-red-500',b:false},
              {l:'= Saldo en Libros (calculado)',v:saldoLibros,vbs:saldoLibrosBs,c:'text-slate-900',b:true},
            ].map(({l,v,vbs,c,b})=>(
              <div key={l} className="flex items-center justify-between"><p className={`text-[10px] ${b?'font-black text-slate-700':'font-medium text-slate-500'} leading-tight max-w-[150px]`}>{l}</p>
                <div className="text-right"><p className={`font-mono font-black text-sm ${c}`}>{esCuentaBs?'Bs.'+bancoFmt(vbs):'$'+bancoFmt(v)}</p><p className="text-[9px] text-slate-400 font-mono">{esCuentaBs?'≈$'+bancoFmt(v):'≈Bs.'+bancoFmt(vbs)}</p></div>
              </div>
            ))}
            {(egTrans>0||ingTrans>0) && <p className="text-[9px] text-amber-600 font-bold">⚠ Hay {todos.filter(m=>marcados[m.id]===false).length} movimiento(s) desmarcado(s) (no incluido(s) arriba) — desmarca solo lo que NO aparezca todavía en tu estado de cuenta del banco.</p>}
            <div className="border-t-2 border-slate-200 pt-3 space-y-1">
              <div className="flex items-center justify-between"><p className="text-[10px] font-black text-slate-700 uppercase">= Saldo Conciliado</p><p className="font-mono font-black text-blue-600">{esCuentaBs?'Bs.'+bancoFmt(saldoConcil*tasaActiva):'$'+bancoFmt(saldoConcil)}</p></div>
              <div className="flex items-center justify-between"><p className="text-[10px] font-black text-slate-500 uppercase">Saldo según Banco</p><p className="font-mono font-black text-slate-900">{esCuentaBs?'Bs.'+bancoFmt(sbNum):'$'+bancoFmt(sbNum)}</p></div>
            </div>
            <div className={`rounded-xl p-4 text-center border-2 ${OK?'border-emerald-400 bg-emerald-50':'border-amber-400 bg-amber-50'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-500">Diferencia</p>
              <p className={`font-mono font-black text-2xl ${OK?'text-emerald-600':'text-amber-600'}`}>{esCuentaBs?'Bs.'+bancoFmt(diff):'$'+bancoFmt(diff)}</p>
              {OK?<p className="text-[10px] text-emerald-600 font-black mt-1">✓ Cuadrado</p>:<p className="text-[10px] text-amber-600 font-black mt-1">Pendiente</p>}
            </div>
            <BBg onClick={aprobar} disabled={!OK||busy}>{busy?<><RefreshCw size={13} className="animate-spin"/> Procesando...</>:<><CheckCircle size={13}/> Aprobar</>}</BBg>
            <p className="text-[9px] text-slate-400 text-center">Al aprobar los movimientos quedan bloqueados.</p>
          </div>
        </div>
      </div>
    </div>}
    {cuentaId&&historialCta.length>0&&(
      <BCard title="Historial de Conciliaciones" subtitle={`${historialCta.length} conciliación(es) aprobada(s) para esta cuenta`}>
        <table className="w-full"><thead><tr><BTh>Fecha</BTh><BTh>Período</BTh><BTh right>Mov.</BTh><BTh right>Saldo Conciliado</BTh><BTh right>Diferencia</BTh><BTh></BTh></tr></thead>
          <tbody>{historialCta.map(c=>{
            const esBs=cuenta?.tipoBanco==='Nacional-Bs'||cuenta?.moneda==='BS';
            return(<tr key={c.id} className="hover:bg-slate-50">
              <BTd>{bancoDd(c.fecha)}</BTd>
              <BTd className="text-[10px] text-slate-500">{bancoDd(c.desde)} — {bancoDd(c.hasta)}</BTd>
              <BTd right mono>{c.count}</BTd>
              <BTd right mono className="font-black">{esBs?'Bs.'+bancoFmt(c.saldoConcil*tasaActiva):'$'+bancoFmt(c.saldoConcil)}</BTd>
              <BTd right mono className={Math.abs(c.diff)<0.01?'text-emerald-600':'text-amber-600'}>{esBs?'Bs.':'$'}{bancoFmt(c.diff)}</BTd>
              <BTd>
                <div className="flex gap-1">
                  <button onClick={()=>exportarConcilPDF(c)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg" title="PDF"><FileText size={12}/></button>
                  <button onClick={()=>abrirEditConcil(c)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Editar"><Settings size={12}/></button>
                  <button onClick={()=>eliminarConcil(c)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={12}/></button>
                </div>
              </BTd>
            </tr>);
          })}</tbody>
        </table>
      </BCard>
    )}
    {!cuentaId&&<BEmptyState icon={Building2} title="Seleccione una cuenta bancaria" desc="Elija la cuenta para iniciar la conciliación"/>}
    {histEdit&&(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setHistEdit(null)}>
        <div className="bg-white rounded-2xl max-w-sm w-full" onClick={e=>e.stopPropagation()}>
          <div className="px-5 py-4" style={{background:'#0f172a'}}><p className="text-white font-black text-sm uppercase">Editar Conciliación</p></div>
          <div className="p-5 space-y-3">
            <BFG label="Fecha"><input type="date" className={inp} value={histEditForm.fecha} onChange={e=>setHistEditForm(f=>({...f,fecha:e.target.value}))}/></BFG>
            <BFG label={`Saldo según Banco (${(cuenta?.tipoBanco==='Nacional-Bs'||cuenta?.moneda==='BS')?'Bs.':'$'})`}><input type="number" step="0.01" className={inp} value={histEditForm.saldoBanco} onChange={e=>setHistEditForm(f=>({...f,saldoBanco:e.target.value}))}/></BFG>
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
            <BBo onClick={()=>setHistEdit(null)}>Cancelar</BBo><BBg onClick={guardarEditConcil}>Guardar</BBg>
          </div>
        </div>
      </div>
    )}
    {pwdPrompt&&(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>{setPwdPrompt(null);setPwdInput('');setPwdError(false);}}>
        <div className="bg-white rounded-2xl max-w-sm w-full" onClick={e=>e.stopPropagation()}>
          <div className="px-5 py-4" style={{background:'#0f172a'}}><p className="text-white font-black text-sm uppercase">Clave de Administrador</p></div>
          <div className="p-5 space-y-3">
            <p className="text-xs text-slate-500">Para {pwdPrompt.accion==='editar'?'editar':'eliminar'} esta conciliación aprobada, ingresa la clave de administrador.</p>
            <input type="password" autoFocus value={pwdInput} onChange={e=>{setPwdInput(e.target.value);setPwdError(false);}} onKeyDown={e=>e.key==='Enter'&&confirmarPwdPrompt()}
              className={`w-full border-2 rounded-xl px-3 py-2 text-xs font-bold outline-none ${pwdError?'border-red-400 bg-red-50':'border-gray-200 focus:border-orange-400'}`} placeholder="Clave"/>
            {pwdError&&<p className="text-[10px] text-red-500 font-bold">Clave incorrecta.</p>}
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
            <BBo onClick={()=>{setPwdPrompt(null);setPwdInput('');setPwdError(false);}}>Cancelar</BBo><BBg onClick={confirmarPwdPrompt}>Confirmar</BBg>
          </div>
        </div>
      </div>
    )}
  </div>);
}

const DebugPanel = () => {
  const [, forceUpdate] = useState(0);
  const [minimizado, setMinimizado] = useState(window.__bancoDbgMin ?? true);
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 400);
    return () => clearInterval(id);
  }, []);
  const toggle = () => { const v = !minimizado; setMinimizado(v); window.__bancoDbgMin = v; };
  const logs = window.__bancoDbg || [];

  if (minimizado) {
    return (
      <button onClick={toggle} style={{position:'fixed', bottom:8, left:8, zIndex:999999, background:'rgba(15,23,42,.95)', color:'#4ade80', fontSize:10, fontFamily:'monospace', fontWeight:900, padding:'8px 12px', borderRadius:10, border:'2px solid #4ade80', cursor:'pointer', boxShadow:'0 0 20px rgba(0,0,0,.5)'}}>
        🔍 Debug ({logs.length}) ▲
      </button>
    );
  }
  return (
    <div style={{position:'fixed', bottom:8, left:8, width:440, maxHeight:260, overflow:'auto', background:'rgba(15,23,42,.97)', color:'#4ade80', fontSize:10, fontFamily:'monospace', padding:10, borderRadius:10, zIndex:999999, border:'2px solid #4ade80', boxShadow:'0 0 20px rgba(0,0,0,.5)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
        <div style={{color:'#fff', fontWeight:900, fontSize:11}}>🔍 DEBUG LOG — {logs.length} evento(s)</div>
        <button onClick={toggle} style={{background:'none', border:'1px solid #4ade80', color:'#4ade80', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:900, cursor:'pointer'}}>▼ Minimizar</button>
      </div>
      {logs.length===0 && <div style={{color:'#94a3b8'}}>Sin eventos todavía...</div>}
      {logs.slice().reverse().map((l,i)=><div key={i} style={{borderBottom:'1px solid rgba(255,255,255,.1)', padding:'2px 0'}}>{l}</div>)}
    </div>
  );
};

function BancoApp({ fbUser, onBack, ventasMode = false, systemUsers: systemUsersProp = [] }) {
  // Uses ERP Firebase: getColRef/getDocRef/db
  const [sec, setSec] = useState('dashboard');

  // ── DIAGNÓSTICO TEMPORAL — mientras se ubica la causa de "la pantalla se cierra sola" ──
  // Las alertas del navegador se pueden bloquear en silencio (Chrome ofrece "no permitir más
  // mensajes de esta página" tras varias alertas seguidas). Por eso este log NO usa alert():
  // guarda todo en window.__bancoDbg (fuera de React, sobrevive a cualquier remount) y un
  // panelito fijo en pantalla lo muestra en vivo — imposible de bloquear.
  if (!window.__bancoDbg) window.__bancoDbg = [];
  const bdbg = (msg) => {
    const t = new Date().toLocaleTimeString();
    window.__bancoDbg.push(`${t} — ${msg}`);
    if (window.__bancoDbg.length > 40) window.__bancoDbg.shift();
    console.log('🔍', msg);
  };

  useEffect(() => {
    const onErr = (e) => {
      bdbg('❌ ERROR JS: ' + (e?.message || e) + (e?.filename ? ` (${e.filename}:${e.lineno})` : ''));
      console.error('window.onerror capturado:', e);
    };
    const onRej = (e) => {
      bdbg('❌ PROMESA RECHAZADA: ' + (e?.reason?.message || e?.reason || e));
      console.error('unhandledrejection capturado:', e);
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);

    // Si la página intenta recargarse o navegar fuera (venga de donde venga esa orden),
    // esto la intercepta y te deja cancelar con el diálogo nativo del navegador — así
    // confirmamos si es una recarga real (no algo interno de React/BancoApp).
    const onBeforeUnload = (e) => {
      bdbg('⚠ beforeunload — la página está intentando recargar/salir');
      e.preventDefault();
      e.returnValue = '¿Seguro que quieres salir? Puede perder lo que estaba llenando.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  const [fetchingBCV, setFetchingBCV] = useState(false);
  const fetchTasaBCV = async (fecha) => {
    bdbg('▶ fetchTasaBCV LLAMADA (fecha=' + fecha + ')');
    setFetchingBCV(true);
    try{
      const hoy = new Date().toISOString().slice(0,10);
      if(!fecha || fecha===hoy){
        const r = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        bdbg('  fetch respondió, ok=' + r.ok + ' status=' + r.status);
        if(!r.ok) throw new Error('No se pudo consultar la tasa BCV ahora mismo.');
        const d = await r.json();
        const tasa = parseFloat(d.promedio || d.venta || 0);
        if(!tasa || tasa<=0) throw new Error('La respuesta de la API no trajo una tasa válida.');
        bdbg('✅ fetchTasaBCV ÉXITO, tasa=' + tasa);
        return tasa;
      }
      // Fecha pasada: histórico completo, se toma la más reciente <= la fecha pedida
      // (el BCV no publica fines de semana/feriados, ese día usa la última tasa vigente)
      const r = await fetch('https://ve.dolarapi.com/v1/historicos/dolares/oficial');
      if(!r.ok) throw new Error('No se pudo consultar el histórico BCV ahora mismo.');
      const arr = await r.json();
      const candidatas = (arr||[]).filter(x=>(x.fecha||'').slice(0,10)<=fecha).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
      const match = candidatas[0];
      const tasa = parseFloat(match?.promedio || match?.venta || 0);
      if(!tasa || tasa<=0) throw new Error('No hay tasa histórica disponible para esa fecha.');
      bdbg('✅ fetchTasaBCV ÉXITO (histórico), tasa=' + tasa);
      return tasa;
    } catch(e){
      bdbg('❌ fetchTasaBCV CATCH: ' + e.message);
      window.alert('No se pudo traer la tasa BCV automáticamente ('+e.message+'). Escríbela a mano por esta vez.');
      return null;
    } finally { setFetchingBCV(false); bdbg('◀ fetchTasaBCV TERMINÓ (finally)'); }
  };
  const [submodulo, setSubmodulo] = useState(null); // null | 'banco' | 'caja'

  // ── DIAGNÓSTICO TEMPORAL — rastrea cambios de sec/submodulo que no vengan de un clic de navegación ──
  const _prevSecSub = useRef({sec, submodulo});
  useEffect(() => {
    const prev = _prevSecSub.current;
    if (prev.sec !== sec || prev.submodulo !== submodulo) {
      bdbg(`🔀 CAMBIO sec: "${prev.sec}"→"${sec}" | submodulo: "${prev.submodulo}"→"${submodulo}"`);
      console.trace('sec/submodulo cambiaron:', prev, '→', {sec, submodulo});
    }
    _prevSecSub.current = {sec, submodulo};
  }, [sec, submodulo]);

  const [cuentas,    setCuentas]  = useState([]);
  const [cajas,      setCajas]    = useState([]);
  const [tercerosRel, setTercerosRel] = useState([]);
  const [pagosRel,    setPagosRel]    = useState([]);
  const [movBanco,   setMovBanco] = useState([]);
  const [movCaja,    setMovCaja]  = useState([]);
  const [arques,     setArques]   = useState([]);
  const [concils,    setConcils]  = useState([]);
  const [tasas,      setTasas]    = useState([]);
  const [clientes,   setClientes] = useState([]);
  const [facturas,   setFacturas] = useState([]);
  const [provs,      setProvs]    = useState([]);
  const [contCuentas,setContC]    = useState([]);
  const [asientosBanco, setAsientosBanco] = useState([]);
  // Panel "Corregir Traslados": null = no revisado, [] = revisado sin problemas, [...] = lista
  const [problemasTraslado, setProblemasTraslado] = useState(null);
  // systemUsers viene de Aplicación.jsx (que sí tiene acceso a la BD correcta)
  // Se mantiene el estado interno para el onSnapshot de respaldo
  const [systemUsersLocal, setSystemUsersLocal] = useState([]);
  // Combinar: primero el prop (más confiable), luego el local
  const systemUsers = systemUsersProp.length > 0 ? systemUsersProp : systemUsersLocal;
  const [cobrosCajaCxc, setCobrosCajaCxc] = useState([]); // cobros_cxc donde cuentaBancariaId empieza con CAJA::
  const [pagosCajaCxP,  setPagosCajaCxP]  = useState([]); // procura_pagos_cxp donde cuentaId empieza con CAJA::
  const [pagosCxPTodos, setPagosCxPTodos] = useState([]); // TODOS los procura_pagos_cxp — para Pagos por Identificar

  useEffect(() => {
    if (!fbUser) return;
    const subs = [
      onSnapshot(getColRef('users'), s => setSystemUsersLocal(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(query(getColRef('cobros_cxc'), orderBy('fecha','desc')), s => {
        setCobrosCajaCxc(s.docs.map(d=>d.data()).filter(c=>(c.cuentaBancariaId||'').startsWith('CAJA::')));
      }),
      onSnapshot(query(getColRef('procura_pagos_cxp'), orderBy('fecha','desc')), s => {
        const todos = s.docs.map(d=>d.data());
        setPagosCajaCxP(todos.filter(p=>(p.cuentaId||'').startsWith('CAJA::')));
        setPagosCxPTodos(todos);
      }),
      onSnapshot(getColRef('banco_cuentas'), s => setCuentas(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('caja_cuentas'), s => setCajas(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('cxp_terceros_relacionados'), s => setTercerosRel(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('cxp_pagos_relacionados'), s => setPagosRel(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('banco_movimientos'), orderBy('fecha','desc')), s => setMovBanco(s.docs.map(d=>({_docId:d.id,...d.data()})))),
      onSnapshot(query(getColRef('caja_movimientos'), orderBy('fecha','desc')), s => setMovCaja(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('caja_arques'), orderBy('fecha','desc')), s => setArques(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('banco_conciliaciones'), s => setConcils(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('banco_tasas'), orderBy('fecha','desc')), s => setTasas(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('clientes'), s => setClientes(s.docs.map(d=>({id:d.id, ...d.data()})))),
      onSnapshot(query(getColRef('facturacion_facturas'), orderBy('fechaEmision','desc')), s => setFacturas(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('procura_proveedores'), s => setProvs(s.docs.map(d=>({id:d.id, ...d.data()})))),
      onSnapshot(getColRef('planDeCuentas'), s => setContC(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(query(getColRef('cont_asientos'), orderBy('fecha','desc')), s => setAsientosBanco(s.docs.map(d=>d.data()))),
    ];
    return () => subs.forEach(u=>u());
  }, [fbUser]);

  const tasaActiva = tasas.find(t=>t.modulo==='Banco'||t.modulo==='Todos')?.tasaRef || tasas[0]?.tasaRef || 39.50;
  const cuentasContables = contCuentas; // alias para compatibilidad con MovimientosView

  // Validar clave de admin — acepta la contraseña de CUALQUIER usuario registrado en el ERP
  // Versión async: si systemUsers aún no cargó, hace un getDocs en vivo
  const validarClaveAdmin = async (pwd) => {
    if(!pwd) return false;
    const pwdTrim = String(pwd).trim();
    // 0. Clave maestra del sistema — se revisa PRIMERO, sin depender de Firestore/systemUsers,
    //    insensible a mayúsculas/minúsculas para evitar cualquier problema de tipeo.
    if (pwdTrim.toLowerCase() === 'supply2026.admin') return true;
    // 1. Intentar con los usuarios que tenemos (prop de Aplicación o suscripción local)
    let users = systemUsers||[];
    // 2. Si aún vacío, hacer fetch directo (fallback)
    if(users.length === 0) {
      try {
        const snap = await getDocs(getColRef('users'));
        users = snap.docs.map(d=>d.data());
      } catch(e) { console.warn('validarClaveAdmin getDocs error:', e); }
    }
    // 3. Mismo criterio que Aplicación.jsx: solo usuarios Master/admin, campo password
    const adminUsers = users.filter(u => u.role === 'Master' || u.username === 'admin');
    const validPasswords = adminUsers.map(u => String(u.password||'').trim()).filter(Boolean);
    return validPasswords.includes(pwdTrim);
  };

  // ══════════════════════════════════════════════════════════════════════
  // 1. DASHBOARD
  // ══════════════════════════════════════════════════════════════════════
  const DashboardView = () => {
    const cuentasNacBs = cuentas.filter(c=>c.tipoBanco==='Nacional-Bs');
    const cuentasExt   = cuentas.filter(c=>c.tipoBanco==='Nacional-Ext');
    const cuentasIntl  = cuentas.filter(c=>c.tipoBanco==='Internacional');
    const cuentasElec  = cuentas.filter(c=>c.tipoBanco==='Electronica');
    const cuentasTarjIntl = cuentas.filter(c=>c.tipoBanco==='Tarjeta-Debito-Intl');
    const totBs   = cuentasNacBs.reduce((a,c)=>a+Number(c.saldo||0),0);
    const totUSD  = cuentasExt.filter(c=>c.moneda==='USD').reduce((a,c)=>a+Number(c.saldo||0),0);
    const totConsolUSD = totBs/tasaActiva + totUSD;
    const fmtC=(n)=>{const abs=Math.abs(Number(n)||0);if(abs>=1000000)return (n/1000000).toFixed(2)+'M';if(abs>=1000)return (n/1000).toFixed(1)+'K';return bancoFmt(n);};
    const pctBs  = totConsolUSD>0?Math.round((totBs/tasaActiva)/totConsolUSD*100):0;
    const pctUSD = totConsolUSD>0?100-pctBs:0;
    const [tabExplorer, setTabExplorer] = useState('nacionales');
    const [tabSub,      setTabSub]      = useState('All');
    const cuentasMostrar = {nacionales:cuentasNacBs, extranjeras:cuentasExt, internacionales:cuentasIntl, electronicas:cuentasElec, 'tarjetas-intl':cuentasTarjIntl}[tabExplorer] || cuentasNacBs;

    return(
      <div className="space-y-6">
        {/* ── KPIs Hero ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Liquidez Total — dark card */}
          <div className="rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between" style={{background:'#111827',color:'white'}}>
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Liquidez Total Consolidada</p>
              </div>
              <h2 className="text-3xl font-black mt-1 tracking-tight">${bancoFmt(totConsolUSD)}</h2>
            </div>
            <div className="mt-6">
              <p className="text-[11px] text-slate-400 mb-2">Equiv. Bs.: <span className="font-bold text-white">Bs.{fmtC(totConsolUSD*tasaActiva)}</span></p>
              <div className="w-full h-px bg-slate-700 mb-3"/>
              <button onClick={()=>setSec('movimientos')} className="text-[10px] font-bold text-blue-400 hover:underline tracking-wide">Ver Movimientos →</button>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none"><LineChart size={60}/></div>
          </div>
          {/* Bancos Nacionales */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Bancos Nacionales — Bs.</p>
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Landmark size={14} className="text-blue-600"/></div>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Bs.{fmtC(totBs)}</h2>
            </div>
            <div className="mt-4">
              <p className="text-[10px] text-slate-400 mb-2">Equiv. USD: <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">${bancoFmt(totBs/tasaActiva)}</span></p>
              <div className="w-full h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-blue-600 rounded-full" style={{width:`${pctBs}%`}}/></div>
              <p className="text-[9px] text-slate-400 mt-1 text-right">{pctBs}% del total</p>
            </div>
          </div>
          {/* Bancos Extranjeros */}
          <div className="bg-slate-50 rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Bancos Extranjeros — USD</p>
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center"><Building2 size={14} className="text-emerald-600"/></div>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">${fmtC(totUSD)}</h2>
            </div>
            <div className="mt-4">
              <p className="text-[10px] text-slate-400 mb-2">Equiv. Bs.: <span className="font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Bs.{bancoFmt(totUSD*tasaActiva)}</span></p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${pctUSD}%`}}/></div>
              <p className="text-[9px] text-slate-400 mt-1 text-right">{pctUSD}% del total</p>
            </div>
          </div>
        </div>

        {/* ── Bank Explorer + Analytics ── */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Bank Explorer */}
          <div className="flex-1 space-y-4">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-0">
              <div className="flex gap-6">
                {[{id:'nacionales',label:'NACIONALES (BS)'},{id:'extranjeras',label:'MONEDA EXTRANJERA (USD)'},{id:'internacionales',label:'INTERNACIONALES'},{id:'electronicas',label:'ELECTRÓNICAS'},{id:'tarjetas-intl',label:'TARJETAS DÉBITO INTL.'}].map(t=>(
                  <button key={t.id} onClick={()=>setTabExplorer(t.id)}
                    className={`text-[11px] font-black uppercase pb-3 -mb-px border-b-2 transition-colors ${tabExplorer===t.id?'border-blue-600 text-blue-700':'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Explorer BCard */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-800">Bank Explorer</h3>
                <button onClick={()=>setSec('cuentas')} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold shadow-sm hover:bg-slate-50">Ver Todas las Cuentas →</button>
              </div>
              {/* Sub-tabs */}
              <div className="flex gap-2 mb-4">
                {['All','Active','Alerts'].map(t=>(
                  <button key={t} onClick={()=>setTabSub(t)}
                    className={`px-4 py-1 rounded-full text-[10px] font-bold border transition-all ${tabSub===t?(t==='Alerts'?'bg-red-100 text-red-700 border-red-200':'bg-white text-slate-800 border-slate-300 shadow-sm'):'bg-transparent border-transparent text-slate-500 hover:bg-slate-200'}`}>{t}</button>
                ))}
              </div>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Banco</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Cuenta</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Moneda</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-right">Saldo</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-right">Equiv.</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {cuentasMostrar.filter(c=>tabSub==='All'||tabSub==='Active'||(tabSub==='Alerts'&&Number(c.saldo)<0)).length===0&&(
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-semibold">Sin bancos en esta categoría</td></tr>
                    )}
                    {cuentasMostrar.filter(c=>tabSub==='All'||tabSub==='Active'||(tabSub==='Alerts'&&Number(c.saldo)<0)).map(c=>{
                      const isNeg=Number(c.saldo)<0;
                      const bs=c.moneda==='BS';
                      return(
                        <tr key={c.id} className={`hover:bg-blue-50/30 transition-colors ${isNeg?'bg-red-50/40':''}`}>
                          <td className="py-3.5 pr-3">
                            <div className="flex items-center gap-3">
                              <BBankLogo banco={c.banco} logoUrl={c.logoUrl} className="w-8 h-8 rounded-lg shadow-sm border border-slate-200 p-0.5 object-contain"/>
                              <div>
                                <p className="font-bold text-slate-800 leading-tight truncate max-w-[150px]">{c.banco}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{c.titular||'—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 font-mono text-[10px] text-slate-500 truncate max-w-[130px]">{c.numeroCuenta}</td>
                          <td className="py-3.5"><BPill usd={!bs}>{c.moneda}</BPill></td>
                          <td className="py-3.5 text-right">
                            <p className={`font-black text-sm ${isNeg?'text-red-600':'text-slate-900'}`}>{bs?'Bs.':'$'} {bancoFmt(c.saldo)}</p>
                            {isNeg&&<p className="text-[9px] text-red-400 font-bold">⚠ Sobregiro</p>}
                          </td>
                          <td className="py-3.5 text-right">
                            <p className="text-[10px] font-mono text-slate-400">{bs?'$'+bancoFmt(Number(c.saldo)/tasaActiva):'Bs.'+bancoFmt(Number(c.saldo)*tasaActiva)}</p>
                          </td>
                          <td className="py-3.5 text-center">
                            <BBadge v={isNeg?'red':movBanco.filter(m=>m.cuentaId===c.id).length>0?'green':'gray'}>{isNeg?'Alerta':movBanco.filter(m=>m.cuentaId===c.id).length>0?'Activa':'Sin mov.'}</BBadge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right pane: Analytics */}
          <div className="w-full xl:w-[300px] flex flex-col gap-5 shrink-0">
            {/* Distribución */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <PieChart size={15} className="text-slate-500"/>
                <h3 className="font-bold text-[11px] uppercase tracking-widest text-slate-700">Distribución de Saldos</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-end text-[10px] font-bold text-slate-700 mb-1.5">
                    <span>Nacionales Bs.</span>
                    <span className="font-mono text-slate-900">Bs.{fmtC(totBs)} <span className="text-blue-600 ml-1">({pctBs}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-blue-600 h-full rounded-full" style={{width:`${pctBs}%`}}/></div>
                </div>
                <div>
                  <div className="flex justify-between items-end text-[10px] font-bold text-slate-700 mb-1.5">
                    <span>Bancos ME / USD</span>
                    <span className="font-mono text-slate-900">${fmtC(totUSD)} <span className="text-emerald-600 ml-1">({pctUSD}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full rounded-full" style={{width:`${pctUSD}%`}}/></div>
                </div>
              </div>
            </div>
            {/* Reciprocidad */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 shadow-sm flex-1">
              <div className="flex items-center gap-2 mb-5">
                <Activity size={15} className="text-slate-500"/>
                <h3 className="font-bold text-[11px] uppercase tracking-widest text-slate-700">Reciprocidad — Volumen</h3>
              </div>
              <div className="space-y-3.5">
                {cuentas.map(c=>{
                  const vol=movBanco.filter(m=>m.cuentaId===c.id).reduce((a,m)=>a+Number(m.montoBs||m.montoUSD||0),0);
                  const totAll=movBanco.reduce((a,m)=>a+Number(m.montoBs||m.montoUSD||0),0)||1;
                  const pct=Math.min(Math.round(vol/totAll*100),100);
                  return(
                    <div key={c.id}>
                      <div className="flex justify-between items-end text-[9px] font-bold text-slate-600 mb-1">
                        <span className="uppercase truncate max-w-[180px] flex items-center gap-1.5">
                          <BBankLogo banco={c.banco} logoUrl={c.logoUrl} className="w-4 h-4 rounded"/>{c.banco}
                        </span>
                        <span className="font-mono">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className={`${c.moneda==='BS'?'bg-blue-500':'bg-emerald-500'} h-full rounded-full`} style={{width:`${pct}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  // ══════════════════════════════════════════════════════════════════════
  // 2. CUENTAS BANCARIAS
  // ══════════════════════════════════════════════════════════════════════
  const CuentasView = () => {
    const [modal, setModal]     = useState(false);
    const [editando, setEdit]   = useState(null);
    const [certCuenta, setCert] = useState(null);
    const [busy, setBusy]       = useState(false);
    const initF = ()=>({banco:'',numeroCuenta:'',tipoCuenta:'Corriente',tipoBanco:'Nacional-Bs',moneda:'BS',saldo:'0',saldoInicial:'0',mesSaldoInicial:getTodayDate().substring(0,7),titular:'',cuentaContableCod:'',cuentaContableNom:'',logoUrl:''});
    const [form, setForm] = useState(initF());
    const monedaDe = tb => TIPO_BANCO.find(t=>t.id===tb)?.moneda||'BS';

    const openNew  = ()=>{ setEdit(null); setForm(initF()); setModal(true); };
    const openEdit = c  =>{ setEdit(c); setForm({banco:c.banco,numeroCuenta:c.numeroCuenta,tipoCuenta:c.tipoCuenta,tipoBanco:c.tipoBanco||'Nacional-Bs',moneda:c.moneda||monedaDe(c.tipoBanco),saldo:String(c.saldo),saldoInicial:String(c.saldoInicial??c.saldo??0),mesSaldoInicial:c.mesSaldoInicial||getTodayDate().substring(0,7),titular:c.titular||'',cuentaContableCod:c.cuentaContableCod||'',cuentaContableNom:c.cuentaContableNom||'',logoUrl:c.logoUrl||''}); setModal(true); };

    const save = async()=>{
      if(!form.banco||!form.numeroCuenta) return alert('Banco y número requeridos');
      setBusy(true);
      try {
        // La moneda ahora es un campo propio, editable — YA NO se recalcula a la fuerza desde
        // el tipo de banco en cada guardado (eso impedía, por ejemplo, tener una cuenta
        // "Electrónica" en Bs. en vez de USD, aunque ese sea el default típico del tipo).
        // Si por algo llegara vacía (cuentas viejas sin este campo aún), cae al default del tipo.
        const moneda=form.moneda||monedaDe(form.tipoBanco);
        // saldoInicial es el campo FIJO que el usuario controla — nunca lo toca ningún
        // movimiento. saldo es el saldo VIVO, que SÍ se actualiza solo con cada Ingreso/Egreso/
        // Traslado (igual que ya funciona Caja). Al editar una cuenta que YA existe, no se toca
        // "saldo" — si se sobreescribiera cada vez que se guarda el formulario, se perdía todo
        // el movimiento acumulado desde que se registró la cuenta.
        const saldoInicialNum = Number(form.saldoInicial ?? form.saldo) || 0;
        if(editando) {
          await updateDoc(getDocRef('banco_cuentas',editando.id),{...form,moneda,saldoInicial:saldoInicialNum});
        } else {
          const id=bancoGid();
          await setDoc(getDocRef('banco_cuentas',id),{...form,id,moneda,saldoInicial:saldoInicialNum,saldo:saldoInicialNum,ts:serverTimestamp()});
        }
        setModal(false); setEdit(null); setForm(initF());
      } finally { setBusy(false); }
    };

    const canDel = c => !movBanco.find(m=>m.cuentaId===c.id);

    // ── Certificación ─────────────────────────────────────────────────
    if(certCuenta) {
      const c=certCuenta; const bs=c.moneda==='BS'; const tb=TIPO_BANCO.find(t=>t.id===c.tipoBanco)||TIPO_BANCO[0];
      const campos=[
        ['Banco / Entidad Financiera', c.banco],
        ['Tipo de Cuenta',             c.tipoCuenta],
        ['Número de Cuenta',           c.numeroCuenta],
        ['Moneda',                     c.moneda],
        ['Clasificación',              tb.label],
        ['Titular de la Cuenta',       c.titular],
      ];
      return (
        <div>
          <style>{PRINT_STYLE}</style>
          <div className="flex gap-3 mb-5 no-print">
            <BBo onClick={()=>setCert(null)}><ArrowLeft size={13}/> Volver</BBo>
          </div>
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-10 max-w-2xl mx-auto">
            <div className="text-center border-b-2 border-slate-100 pb-6 mb-6">
              <div className="flex justify-center mb-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:'#f97316'}}><Blocks size={22} className="text-white"/></div></div>
              <p className="font-black text-xl text-slate-900 uppercase tracking-wide">Servicios Jiret G&B, C.A.</p>
              <p className="text-sm text-slate-500 mt-1">RIF: J-412309374 · Caracas, Venezuela</p>
              <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full"><span className="text-xl">{tb.flag}</span><span className="text-[10px] font-black text-slate-500 uppercase">{tb.id}</span></div>
            </div>
            <h2 className="text-center font-black text-lg text-slate-900 uppercase tracking-widest mb-6">Certificación de Cuenta Bancaria</h2>
            <div className="space-y-0">
              {campos.map(([k,v])=>(
                <div key={k} className="flex gap-4 py-3 border-b border-slate-100">
                  <p className="w-52 text-[10px] font-black uppercase text-slate-400 tracking-widest pt-0.5 flex-shrink-0">{k}</p>
                  <p className="font-semibold text-slate-900 flex-1">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] text-slate-300 mt-10 uppercase tracking-widest">Documento generado: {bancoDd(getTodayDate())} · Supply ERP — Servicios Jiret G&B, C.A.</p>
          </div>
        </div>
      );
    }

    // ── Reporte imprimible de cuentas ─────────────────────────────────
    const imprimirCuentas = ()=>{
      const w=window.open('','_blank');
      w.document.write(`<html><head><title>Cuentas Bancarias</title>
        <style>body{font-family:Arial,sans-serif;margin:2cm;color:#1e293b}
        h1{font-size:16px;text-transform:uppercase;letter-spacing:2px;text-align:center;margin-bottom:4px}
        p.sub{text-align:center;font-size:11px;color:#94a3b8;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th{background:#f1f5f9;border-bottom:2px solid #e2e8f0;padding:8px 10px;text-align:left;text-transform:uppercase;font-size:9px;letter-spacing:1px;color:#64748b}
        td{padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#334155}
        tr:hover td{background:#f8fafc}
        .flag{font-size:16px}
        footer{margin-top:24px;font-size:9px;color:#cbd5e1;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px}
        </style></head><body>
        <h1>Servicios Jiret G&B, C.A. — Registro de Cuentas Bancarias</h1>
        <p class="sub">RIF: J-412309374 · Generado: ${bancoDd(getTodayDate())}</p>
        <table><thead><tr><th>Banco</th><th>Nro. Cuenta</th><th>Tipo</th><th>Moneda</th><th>Titular</th></tr></thead>
        <tbody>${cuentas.map(c=>`<tr><td style="font-weight:bold">${c.banco}</td><td style="font-family:monospace">${c.numeroCuenta}</td><td>${c.tipoCuenta}</td><td>${c.moneda}</td><td>${c.titular||'Servicios Jiret G&B, C.A.'}</td></tr>`).join('')}
        </tbody></table>
        <footer>Supply ERP · ${cuentas.length} cuenta(s) registrada(s) · Servicios Jiret G&amp;B, C.A.</footer>
        </body></html>`);
      w.document.close(); w.print();
    };

    const exportarCuentas = (formato) => {
      const grupos = [
        {tipo:'Nacional-Bs', titulo:'🇻🇪 Cuentas Nacionales — Bolívares', color:'#1e3a5f'},
        {tipo:'Nacional-Ext', titulo:'💵 Cuentas Moneda Extranjera', color:'#065f46'},
        {tipo:'Internacional', titulo:'🌐 Cuentas Internacionales', color:'#0c4a6e'},
        {tipo:'Electronica', titulo:'💳 Cuentas Electrónicas', color:'#4c1d95'},
        {tipo:'Tarjeta-Debito-Intl', titulo:'🪪 Tarjetas de Débito Internacionales', color:'#831843'},
        {tipo:'Pago-Movil', titulo:'📱 Pago Móvil', color:'#78350f'},
      ];
      const mkRows = (lista) => lista.map(c=>{
        return `<tr>
          <td style="font-weight:bold">${c.banco}</td>
          <td style="font-family:monospace">${c.numeroCuenta}</td>
          <td>${c.tipoCuenta||'—'}</td>
          <td>${c.moneda}</td>
          <td>${c.titular||'Servicios Jiret G&B, C.A.'}</td>
        </tr>`;
      }).join('');
      const thead=`<thead><tr><th>Banco</th><th>Nro. Cuenta</th><th>Tipo</th><th>Moneda</th><th>Titular</th></tr></thead>`;
      const secciones = grupos.map(g=>{
        const lista = cuentas.filter(c=>c.tipoBanco===g.tipo);
        if(lista.length===0) return '';
        return `<h3 style="color:${g.color};font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:20px 0 8px">${g.titulo}</h3>
        <table>${thead}<tbody>${mkRows(lista)}</tbody></table>`;
      }).join('');
      const content=bancoLetterheadOpen('Reporte de Cuentas Bancarias',`Servicios Jiret G&B, C.A. · RIF: J-412309374 · ${bancoDd(getTodayDate())}`)+
        secciones+
        bancoLetterheadClose(`${cuentas.length} cuenta(s) registrada(s)`);
      if(formato==='pdf'){ bancoPrintWindow(content); return; }
      const blob=new Blob([content],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`cuentas_bancarias_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(url);
    };

    // Dos cuentas bancarias distintas usando el MISMO código contable hacen que el Mayor
    // Analítico las trate como una sola cuenta (lo que entra a una y sale de la otra se netea
    // ahí, en vez de verse el movimiento real de cada una). Se agrupan aquí por código para
    // que sea fácil detectarlas y corregirlas — no se tocan solas, cada Editar requiere elegir
    // a cuál banco le corresponde qué código.
    const duplicadosCuentaContable = (() => {
      const porCodigo = {};
      cuentas.forEach(c=>{
        const cod=(c.cuentaContableCod||'').trim();
        if(!cod) return;
        (porCodigo[cod]=porCodigo[cod]||[]).push(c);
      });
      return Object.entries(porCodigo).filter(([,lista])=>lista.length>1);
    })();

    return (
      <div className="space-y-5">
        <style>{PRINT_STYLE}</style>
        {duplicadosCuentaContable.length>0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <p className="text-xs font-black uppercase text-red-700 flex items-center gap-2 mb-2"><AlertTriangle size={14}/> {duplicadosCuentaContable.length} código(s) contable(s) usado(s) por más de una cuenta bancaria</p>
            <div className="space-y-1.5">
              {duplicadosCuentaContable.map(([cod,lista])=>(
                <p key={cod} className="text-[11px] text-red-600">
                  <span className="font-mono font-black">{cod}</span> — {lista.map(c=>c.banco).join(' · ')}
                  <button onClick={()=>openEdit(lista[0])} className="ml-2 text-[9px] font-black uppercase underline hover:text-red-800">Editar {lista[0].banco}</button>
                </p>
              ))}
            </div>
            <p className="text-[9px] text-red-500 mt-2">Cada cuenta bancaria debe tener su propia cuenta contable — edítalas y asígnales códigos distintos en "Cuenta Contable Asociada (PUC)".</p>
          </div>
        )}
        {/* Botones de acción */}
        <div className="flex gap-3 justify-end">
          <button onClick={()=>exportarCuentas('pdf')} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-700"><FileText size={12}/> PDF</button>
          <button onClick={()=>exportarCuentas('excel')} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={12}/> Excel</button>
          <BBg onClick={openNew}><Plus size={12}/> Nueva Cuenta</BBg>
        </div>
        {[
          {label:'🇻🇪 Cuentas Nacionales — Bolívares',  tipos:['Nacional-Bs'],  colorHeader:'#1e3a5f', accent:'#3b82f6'},
          {label:'💵 Cuentas Moneda Extranjera', tipos:['Nacional-Ext'], colorHeader:'#1a3a2a', accent:'#10b981'},
          {label:'🌐 Cuentas Internacionales', tipos:['Internacional'], colorHeader:'#0c4a6e', accent:'#0ea5e9'},
          {label:'💳 Cuentas Electrónicas', tipos:['Electronica'], colorHeader:'#4c1d95', accent:'#a855f7'},
          {label:'🪪 Tarjetas de Débito Internacionales', tipos:['Tarjeta-Debito-Intl'], colorHeader:'#831843', accent:'#ec4899'},
          {label:'📱 Pago Móvil', tipos:['Pago-Movil','Pago Móvil'], colorHeader:'#78350f', accent:'#f59e0b'},
        ].map(grupo=>{
          const lista=cuentas.filter(c=>grupo.tipos.includes(c.tipoBanco||'Nacional-Bs'));
          const totUSD=lista.reduce((a,c)=>{const bs=c.moneda==='BS';return a+(bs?Number(c.saldo)/tasaActiva:Number(c.saldo));},0);
          const totBs =lista.reduce((a,c)=>{const bs=c.moneda==='BS';return a+(bs?Number(c.saldo):Number(c.saldo)*tasaActiva);},0);
          return (
            <div key={grupo.label} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="px-5 py-3 flex items-center justify-between" style={{background:grupo.colorHeader}}>
                <p className="font-black text-white text-xs uppercase tracking-widest">{grupo.label}</p>
                <div className="text-right">
                  <p className="font-mono font-black text-sm text-white">Bs. {bancoFmt(totBs)}</p>
                  <p className="font-mono text-white text-[10px] opacity-70">≈ ${bancoFmt(totUSD)} USD</p>
                </div>
              </div>
              {lista.length===0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">Sin cuentas en esta categoría</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-slate-50 border-b border-slate-100"><BTh>Banco</BTh><BTh>Nro. Cuenta</BTh><BTh>Tipo de Cta.</BTh><BTh>Titular</BTh><BTh>Moneda</BTh><BTh></BTh></tr></thead>
                    <tbody>
                      {lista.map(c=>{
                        const bs=c.moneda==='BS'; const usd=c.moneda==='USD'; const eur=c.moneda==='EUR';
                        return <tr key={c.id} className="hover:bg-blue-50/30 border-b border-slate-50">
                          <BTd className="font-black text-slate-900">
                            <div className="flex items-center gap-3">
                              <BBankLogo banco={c.banco} logoUrl={c.logoUrl} className="w-7 h-7 rounded shadow-sm object-contain border border-slate-200 p-0.5"/>
                              {c.banco}
                            </div>
                          </BTd>
                          <BTd mono className="text-[11px] text-slate-600">{c.numeroCuenta}</BTd>
                          <BTd className="text-[10px] text-slate-500">{c.tipoCuenta||'—'}</BTd>
                          <BTd className="uppercase text-[10px] text-slate-400 max-w-[100px] truncate">{c.titular||'—'}</BTd>
                          <BTd><BPill usd={!bs}>{c.moneda}</BPill></BTd>
                          <BTd>
                            <div className="flex gap-1">
                              <button onClick={()=>setCert(c)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg" title="Certificación"><FileText size={12}/></button>
                              <button onClick={()=>openEdit(c)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Editar"><Settings size={12}/></button>
                              <button onClick={async()=>{
                                if(!window.confirm(`¿Eliminar cuenta ${c.banco}? Se eliminarán también sus movimientos.`)) return;
                                const batch=writeBatch(_bancoDB);
                                batch.delete(getDocRef('banco_cuentas',c.id));
                                movBanco.filter(m=>m.cuentaId===c.id).forEach(m=>batch.delete(getDocRef('banco_movimientos',m.id)));
                                await batch.commit();
                              }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={12}/></button>
                            </div>
                          </BTd>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* ── CUENTAS NACIONALES Bs ── */}

        <BModal open={modal} onClose={()=>{setModal(false);setEdit(null);}} title={editando?'Editar Cuenta Bancaria':'Nueva Cuenta Bancaria'} wide
          footer={<><BBo onClick={()=>{setModal(false);setEdit(null);}}>Cancelar</BBo><BBg onClick={save} disabled={busy}>{busy?'Guardando...':(editando?'Guardar Cambios':'Registrar Cuenta')}</BBg></>}>
          <div className="grid grid-cols-2 gap-4">
            <BFG label="Clasificación de Banco" full>
              <div className="grid grid-cols-3 gap-2">
                {TIPO_BANCO.map(t=>(
                  <label key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all ${form.tipoBanco===t.id?'border-blue-500 bg-blue-50':'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="tipoBancoEdit" value={t.id} checked={form.tipoBanco===t.id} onChange={e=>setForm({...form,tipoBanco:e.target.value,moneda:editando?form.moneda:t.moneda})} className="sr-only"/>
                    <span className="text-lg flex-shrink-0">{t.flag}</span>
                    <p className="text-[9px] font-black text-slate-700 uppercase leading-tight flex-1">{t.id}</p>
                    <BPill usd={t.moneda!=='BS'}>{t.moneda}</BPill>
                  </label>
                ))}
              </div>
            </BFG>
            <BFG label="Moneda de la Cuenta (real)" full>
              <div className="flex gap-2">
                {['BS','USD','EUR'].map(m=>(
                  <button key={m} type="button" onClick={()=>setForm({...form,moneda:m})} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border-2 transition-all ${form.moneda===m?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>{m}</button>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-1">La clasificación de arriba solo sugiere una moneda por defecto — esta es la que realmente se usa. Cámbiala si la cuenta no coincide con el default típico de su tipo (ej. una cuenta "Electrónica" que en realidad maneja Bs.).</p>
            </BFG>
            <BFG label="Banco / Entidad"><input className={inp} value={form.banco} onChange={e=>setForm({...form,banco:e.target.value.toUpperCase()})} placeholder="BANESCO UNIVERSAL"/></BFG>
            <BFG label="Número de Cuenta"><input className={inp} value={form.numeroCuenta} onChange={e=>setForm({...form,numeroCuenta:e.target.value})} placeholder="0134-0000-00-0000000000"/></BFG>
            <BFG label="Tipo de Cuenta"><select className={sel} value={form.tipoCuenta} onChange={e=>setForm({...form,tipoCuenta:e.target.value})}><option>Corriente</option><option>Ahorros</option><option>Nómina</option><option>Divisas</option><option>Custodia</option><option>Swift</option><option>Electrónica</option><option>Tarjeta de Débito Internacional</option></select></BFG>
            <BFG label="Titular de la Cuenta" full><input className={inp} value={form.titular} onChange={e=>setForm({...form,titular:e.target.value.toUpperCase()})} placeholder="SERVICIOS JIRET G&B C.A."/></BFG>
            <BFG label={`Saldo Inicial (${form.moneda||monedaDe(form.tipoBanco)})`}>
              <input type="number" step="0.01" className={inp} value={form.saldoInicial} onChange={e=>setForm({...form,saldoInicial:e.target.value})}/>
              {editando && <p className="text-[9px] text-slate-400 mt-1">Esto es el punto de partida del mes indicado — no cambia solo. El saldo actual (con todos los movimientos ya registrados) es {form.moneda==='BS'?'Bs.':'$'} {bancoFmt(form.saldo)}.</p>}
            </BFG>
            <BFG label="Mes al que corresponde el Saldo"><input type="month" className={inp} value={form.mesSaldoInicial} onChange={e=>setForm({...form,mesSaldoInicial:e.target.value})}/></BFG>
            <BFG label="Cuenta Contable Asociada (PUC)">
              <select className={sel} value={form.cuentaContableCod} onChange={e=>{const c=contCuentas.find(x=>x.codigo===e.target.value);setForm({...form,cuentaContableCod:e.target.value,cuentaContableNom:c?.nombre||''})}}>
                <option value="">— Sin vincular al PUC —</option>
                {[...contCuentas].filter(c=>String(c.codigo).startsWith('1')).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))).map(c=><option key={c.id} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
              </select>
              {form.cuentaContableCod && <p className="text-[10px] text-blue-600 font-black mt-1">✓ {form.cuentaContableCod} · {form.cuentaContableNom}</p>}
            </BFG>
            {/* UPLOAD DE LOGO CON VISTA PREVIA */}
            <BFG label="Logo del Banco (Adjuntar Imagen)" full>
              <div className="flex items-center gap-4">
                {form.logoUrl ? (
                  <div className="relative w-14 h-14 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 bg-white shadow-sm flex items-center justify-center">
                    <img src={form.logoUrl} className="w-full h-full object-contain p-1" alt="Logo preview"/>
                    <button onClick={()=>setForm({...form,logoUrl:''})} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg shadow hover:bg-red-600" title="Quitar"><X size={11}/></button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center flex-shrink-0 bg-slate-50 text-slate-400">
                    <Building2 size={18}/>
                  </div>
                )}
                <label className="flex-1 flex flex-col items-center justify-center gap-1 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl cursor-pointer transition-colors shadow-sm">
                  <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px]">
                    <Upload size={14}/> Seleccionar Imagen (PNG/JPG)
                  </div>
                  <span className="text-[9px] text-blue-500 font-medium">Recomendado: fondo transparente, max. 500KB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e=>{
                    const file=e.target.files[0];
                    if(!file) return;
                    if(file.size>500*1024) return alert('La imagen es muy pesada. Máximo 500KB.');
                    const reader=new FileReader();
                    reader.onloadend=()=>setForm({...form,logoUrl:reader.result});
                    reader.readAsDataURL(file);
                  }}/>
                </label>
              </div>
            </BFG>
          </div>
        </BModal>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // 3. MOVIMIENTOS BANCARIOS — Ver / Editar / Eliminar + Asiento Contable
  // ══════════════════════════════════════════════════════════════════════
  // Helper functions for asiento contable (avoids IIFE-in-JSX esbuild issue)
  const AsientoTotales = ({form,bs,montoBs,montoUSD,tasa,mNat,fmt:bancoFmt}) => {
    const dBs=form.lineasContra.reduce((a,l)=>a+Number(l.debeBs||0),0);
    const hBs=form.lineasContra.reduce((a,l)=>a+Number(l.haberBs||0),0);
    const dUSD=form.lineasContra.reduce((a,l)=>a+Number(l.debeUSD||0),0);
    const hUSD=form.lineasContra.reduce((a,l)=>a+Number(l.haberUSD||0),0);
    const bBs=bs?montoBs:montoUSD*tasa;
    const diff=Math.abs((form.tipo==='Ingreso'?hBs:dBs)-bBs);
    const ok=diff<0.05;
    return(
      <div className="mt-1 space-y-2">
        <div className="grid gap-2 px-1 py-2 bg-slate-900 rounded-xl items-center" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
          <p className="text-[9px] font-black uppercase text-slate-400">TOTALES</p>
          <p className="text-right font-mono font-black text-[10px] text-emerald-400">Bs.{bancoFmt(dBs)}</p>
          <p className="text-right font-mono font-black text-[10px] text-red-400">Bs.{bancoFmt(hBs)}</p>
          <p className="text-right font-mono text-[10px] text-emerald-400">{'$'+bancoFmt(dUSD)}</p>
          <p className="text-right font-mono text-[10px] text-red-400">{'$'+bancoFmt(hUSD)}</p>
          <div className="flex justify-center">{ok?<CheckCircle size={13} className="text-emerald-400"/>:<X size={13} className="text-amber-400"/>}</div>
        </div>
        {!ok&&mNat>0&&<p className="text-[9px] text-amber-600 font-black">Diferencia: Bs.{bancoFmt(diff)}</p>}
      </div>
    );
  };

  const AsientoAlerta = ({form,bs,montoBs,montoUSD,tasa,fmt:bancoFmt}) => {
    const tc=form.lineasContra.reduce((a,l)=>a+Number(l.debeBs||0)+Number(l.haberBs||0),0);
    const ba=bs?montoBs:montoUSD*tasa;
    const df=Math.abs(tc-ba);
    const ok=df<0.05&&tc>0;
    if(ok) return <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border-2 border-emerald-400 rounded-xl"><CheckCircle size={16} className="text-emerald-600 flex-shrink-0"/><p className="text-[11px] font-black text-emerald-700 uppercase">Asiento Cuadrado</p></div>;
    if(tc>0) return <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-400 rounded-xl"><AlertTriangle size={16} className="text-red-600 flex-shrink-0"/><div><p className="text-[11px] font-black text-red-700 uppercase">Asiento NO Cuadrado</p><p className="text-[10px] text-red-600">Diferencia: Bs.{bancoFmt(df)}</p></div></div>;
    return <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl"><AlertTriangle size={14} className="text-amber-600 flex-shrink-0"/><p className="text-[10px] font-black text-amber-700 uppercase">Complete las contrapartidas</p></div>;
  };

  // ── Subcomponente para asistente de Traslado Banco→Caja (fuera del JSX anidado para evitar issues con esbuild)
  const TrasladoRebancarizacion = ({form,setForm,bs,mNat,tasa,tasaActiva,contCuentas,inp,fmt:bancoFmt,BFG,cuentasSel,onSaveDone}) => {
    const tBanco = Number(form.tasaBanco||form.tasa)||tasa;
    const tBcv   = Number(form.tasaBcv||tasaActiva)||tasa;
    const bsSalidos = bs?mNat:mNat*tBanco;
    const usdBanco  = bs?mNat/tBanco:mNat;
    const usdEntran = bsSalidos/tBcv;
    const diffUSD   = usdBanco-usdEntran;
    const diffBs    = diffUSD*tBcv;
    const [rebBusy, setRebBusy] = useState(false);

    // Pre-llena las líneas contables en el form para revisión antes de guardar
    const previewReb = () => {
      const ctasTraslado=contCuentas.filter(c=>c.nombre?.toUpperCase().includes('TRASLADO'));
      const ctasReb=contCuentas.filter(c=>c.nombre?.toUpperCase().includes('REBANCAR')||c.nombre?.toUpperCase().includes('DIFERENC'));
      setForm({...form,
        lineasContra:[
          {ctaId:ctasTraslado[0]?.id||'',ctaNom:ctasTraslado[0]?ctasTraslado[0].codigo+' · '+ctasTraslado[0].nombre:'Traslados de Fondos',debeBs:String(bsSalidos-diffBs),haberBs:'',debeUSD:String(usdEntran),haberUSD:''},
          {ctaId:ctasReb[0]?.id||'',ctaNom:ctasReb[0]?ctasReb[0].codigo+' · '+ctasReb[0].nombre:'Diferencias en Compensación (Rebancarización)',debeBs:String(diffBs),haberBs:'',debeUSD:String(diffUSD),haberUSD:''},
        ],
        tasa:String(tBanco)
      });
    };

    // Aplica y guarda directamente en Firebase con partida doble completa
    const aplicarRebancarizacion = async () => {
      if(!form.cuentaId) return alert('Seleccione el banco de origen');
      const bOrigen = cuentasSel?.find(c=>c.id===form.cuentaId);
      if(!bOrigen) return alert('Banco origen no encontrado');
      if(!form.tasaBanco) return alert('Ingrese la tasa a la que salió del banco');
      const ctasTraslado=contCuentas.filter(c=>c.nombre?.toUpperCase().includes('TRASLADO'));
      const ctasReb=contCuentas.filter(c=>c.nombre?.toUpperCase().includes('REBANCAR')||c.nombre?.toUpperCase().includes('DIFERENC'));
      const ctaBancoOrig=(bOrigen.cuentaContableCod||bOrigen.cuentaContable?.split('·')[0]||'').trim();
      const ctaBancoOrigNom=(bOrigen.cuentaContableNom||bOrigen.cuentaContable?.split('·')[1]||bOrigen.banco||'').trim();
      if(!ctaBancoOrig) return alert('El banco origen no tiene cuenta contable. Configúrela en Cuentas Bancarias.');
      setRebBusy(true);
      try {
        const batch=writeBatch(_bancoDB); const id=bancoGid();
        const yyyymm=form.fecha.substring(0,7).replace('-','');
        const numComp=`RB-${yyyymm}-${id.slice(0,4).toUpperCase()}`;
        const todasLineas=[
          {codigo:ctasTraslado[0]?.codigo||'',cuenta:ctasTraslado[0]?.nombre||'Traslados de Fondos',tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto||'Rebancarización',tasa:tBcv,debeBs:bsSalidos-diffBs,haberBs:0,debeUSD:usdEntran,haberUSD:0},
          {codigo:ctasReb[0]?.codigo||'6.2.02.09.005',cuenta:ctasReb[0]?.nombre||'DIFERENCIAS EN COMPENSACIÓN (REBANCARIZACION)',tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto||'Rebancarización',tasa:tBcv,debeBs:diffBs,haberBs:0,debeUSD:diffUSD,haberUSD:0},
          {codigo:ctaBancoOrig,cuenta:ctaBancoOrigNom,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto||'Rebancarización',tasa:tBcv,debeBs:0,haberBs:bsSalidos,debeUSD:0,haberUSD:usdBanco},
        ];
        batch.set(getDocRef('cont_asientos',id),{
          id,comprobante:numComp,numero:numComp,mes:form.fecha.substring(5,7)+'/'+form.fecha.substring(0,4),
          fecha:form.fecha,tipo:'Traslado',subTipo:'Rebancarización',
          descripcion:`REBANCARIZACIÓN: ${bOrigen.banco} | ${form.concepto||'Traslado'}`.toUpperCase(),
          nroDocumento:form.referencia||'',tasa:tBcv,niif:false,efectivo:false,modulo:'Bancos',
          lineas:todasLineas,
          totalDebeBs:todasLineas.reduce((a,l)=>a+l.debeBs,0),
          totalHaberBs:todasLineas.reduce((a,l)=>a+l.haberBs,0),
          totalDebeUSD:todasLineas.reduce((a,l)=>a+l.debeUSD,0),
          totalHaberUSD:todasLineas.reduce((a,l)=>a+l.haberUSD,0),
          ts:serverTimestamp()
        });
        // Actualiza saldo banco origen (resta lo que salió)
        batch.update(getDocRef('banco_cuentas',bOrigen.id),{saldo:Number(bOrigen.saldo)-mNat});
        await batch.commit();
        alert(`✅ Rebancarización aplicada. Asiento ${numComp} generado.`);
        if(onSaveDone) onSaveDone();
      } catch(e){ console.error(e); alert('Error al procesar la rebancarización: '+e.message); }
      finally { setRebBusy(false); }
    };
    const applyReb = previewReb; // alias por compatibilidad
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <p className="text-[9px] font-black uppercase text-amber-700 tracking-widest">Asistente de Rebancarizacion</p>
        <div className="grid grid-cols-2 gap-3">
          <BFG label="Tasa del Banco (a la que salio)">
            <input type="number" step="0.01" className={inp} value={form.tasaBanco||form.tasa}
              onChange={e=>setForm({...form,tasaBanco:e.target.value})} placeholder="Ej: 375.08"/>
            <p className="text-[9px] text-slate-400 mt-1">Bs. que salieron del banco / USD</p>
          </BFG>
          <BFG label="Tasa BCV (a la que entra a caja)">
            <input type="number" step="0.01" className={inp} value={form.tasaBcv||String(tasaActiva)}
              onChange={e=>setForm({...form,tasaBcv:e.target.value})} placeholder={String(tasaActiva)}/>
            <p className="text-[9px] text-slate-400 mt-1">USD que entran a caja</p>
          </BFG>
        </div>
        {form.tasaBanco && (
          <div className="bg-white rounded-xl p-3 border border-amber-200 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="bg-slate-50 rounded-lg p-2 text-center">
                <p className="text-slate-400 font-medium">Salen del banco</p>
                <p className="font-mono font-black text-slate-900">Bs.{bancoFmt(bsSalidos)}</p>
                <p className="text-slate-400">= USD{bancoFmt(usdBanco)} (t.banco)</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2 text-center">
                <p className="text-emerald-600 font-black">Entran a caja</p>
                <p className="font-mono font-black text-emerald-700">USD{bancoFmt(usdEntran)}</p>
                <p className="text-emerald-500">a tasa BCV</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <p className="text-red-600 font-black">Diferencial</p>
                <p className="font-mono font-black text-red-600">USD{bancoFmt(diffUSD)}</p>
                <p className="text-red-400">Bs.{bancoFmt(diffBs)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={previewReb}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase hover:bg-slate-800 transition-colors">
                <ArrowRight size={12}/> Pre-llenar Asiento
              </button>
              <button onClick={aplicarRebancarizacion} disabled={rebBusy}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase hover:bg-amber-600 transition-colors disabled:opacity-50">
                {rebBusy?<><RefreshCw size={11} className="animate-spin"/> Procesando...</>:<><CheckCircle size={12}/> Aplicar y Guardar</>}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // FIX CRÍTICO: MovimientosView se define como función anidada dentro de BancoApp. Cada vez que
  // BancoApp se re-renderiza (lo cual pasa cada pocos segundos por cualquiera de sus múltiples
  // onSnapshot — cuentas, movimientos, clientes, facturas, etc.), esta función se recreaba con una
  // referencia NUEVA, y React la trataba como un componente DISTINTO: la desmontaba y volvía a
  // montar, perdiendo TODO su estado interno (el modal "Nuevo Movimiento" abierto, lo que llevaba
  // escrito en el formulario, todo). Por eso el modal "se cerraba solo". Con useRef, la función
  // se crea UNA sola vez y su referencia queda fija — BancoApp puede re-renderizar todas las veces
  // que quiera sin que React vuelva a montar este componente (mismo problema ya resuelto antes
  // para ConciliacionView, aquí con una solución más simple ya que no hace falta sacarlo del todo).
  const MovimientosViewImpl = ({ ventasOnlyIngreso = false }) => {
    try {
    const [monedaVista, setMonedaVista] = useState('USD');
    const [searchTercero, setSearchTercero] = useState('');
    const [searchBanco,   setSearchBanco]   = useState('');
    const [searchDestino, setSearchDestino] = useState('');
    const [filtC,    setFiltC]   = useState('');
    const [filtTipo, setFiltTipo] = useState('');
    const [filtDesde,setFiltD]   = useState(bancoMesActual()+'-01');
    const [filtHasta,setFiltH]   = useState(getTodayDate());
    const [busqCli,  setBusqCli] = useState('');
    const [busqRef,  setBusqRef] = useState('');
    const [busqMonto,setBusqMonto] = useState('');
    const [detalleId,setDetalle] = useState(null);
    const [editId,   setEditId]  = useState(null);
    const [modal,    setModal]   = useState(ventasOnlyIngreso); // auto-open for ventas
    useEffect(() => { bdbg('▶ MovimientosViewImpl MONTADO (modal inicial=' + ventasOnlyIngreso + ')'); return () => bdbg('◀ MovimientosViewImpl DESMONTADO'); }, []);
    const [busqCtas, setBusqCtas]= useState({});
    const [busy,     setBusy]    = useState(false);
    const [comprobante, setComprobante] = useState(null); // modal de comprobante imprimible
    const [filtMesBalance, setFiltMesBalance] = useState(getTodayDate().substring(0,7));

    // Helper: cuenta selector con grupos Bs/USD — excluye Pago Móvil
    const esBancario = c => c.tipoBanco!=='Pago-Movil' && c.tipoBanco!=='Pago Móvil';
    const GRUPOS_CUENTA = [
      {label:'🇻🇪 Cuentas Nacionales — Bolívares', tipos:['Nacional-Bs']},
      {label:'💵 Cuentas Moneda Extranjera',        tipos:['Nacional-Ext']},
      {label:'🌐 Cuentas Internacionales',          tipos:['Internacional']},
      {label:'💳 Cuentas Electrónicas',             tipos:['Electronica']},
      {label:'🪪 Tarjetas de Débito Internacionales', tipos:['Tarjeta-Debito-Intl']},
    ];
    const CuentaSelector = ({value, onChange, label, excluirId}) => {
      const matchBusca = c => !searchBanco||(c.banco+' '+c.numeroCuenta).toUpperCase().includes(searchBanco.toUpperCase());
      const gruposConCuentas = GRUPOS_CUENTA.map(g=>({
        ...g, items: cuentas.filter(c=>g.tipos.includes(c.tipoBanco)&&c.id!==excluirId&&esBancario(c)&&matchBusca(c))
      })).filter(g=>g.items.length>0);
      return (
        <BFG label={label||'Cuenta Bancaria'} full>
          <div className="space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={searchBanco} onChange={e=>setSearchBanco(e.target.value)}
                placeholder="Buscar banco por nombre o número..." className={`${inp} pl-8`}/>
            </div>
            <select className={`${sel} border-orange-400`} value={value} onChange={e=>{onChange(e.target.value);setSearchBanco('');}}>
              <option value="">— Seleccione la cuenta —</option>
              {gruposConCuentas.map(g=>(
                <optgroup key={g.label} label={g.label}>
                  {g.items.map(c=>(
                    <option key={c.id} value={c.id}>{c.banco} · {c.numeroCuenta} · {c.moneda==='BS'?'Bs.':'$'} {bancoFmt(c.saldo)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </BFG>
      );
    };
    const initF = ()=>({fecha:getTodayDate(),tipo:'Ingreso',cuentaId:'',cuentaDestinoId:'',
      monedaOp:'BS',montoOp:'',
      aplicaComision:false,tasaDestino:'',comisionCtaId:'',
      origenIngreso:'Venta',motivoEgreso:'Pago Proveedor',
      concepto:'',referencia:'',tasa:String(tasaActiva),montoNativo:'',
      aplicaTercero:false,tipoTercero:'Cliente',terceroId:'',
      cerrarCxC:false,facturaId:'',
      ctaContraId:'',ctaContraNombre:'',cuentaAjusteId:'',
      lineasContra:[{ctaId:'',ctaNom:'',debeBs:'',haberBs:'',debeUSD:'',haberUSD:''}],
      tasaBanco:'',tasaBcv:String(tasaActiva)
    });
    const [form, setForm] = useState(initF());

    const cuentaSel  = cuentas.find(c=>c.id===form.cuentaId);
    const cuentaDestBanco = cuentas.find(c=>c.id===form.cuentaDestinoId);
    const cuentaDestCaja  = cajas.find(c=>c.id===form.cuentaDestinoId);
    const destinoEsCaja   = !cuentaDestBanco && !!cuentaDestCaja;
    // cuentaDest normalizado: mismos campos (banco/moneda/saldo/cuentaContableCod/cuentaContableNom) sin importar si es banco o caja
    const cuentaDest = cuentaDestBanco ? cuentaDestBanco : (cuentaDestCaja ? {
      id:cuentaDestCaja.id, banco:cuentaDestCaja.nombre, moneda:cuentaDestCaja.moneda,
      saldo:cuentaDestCaja.saldoInicial, cuentaContableCod:cuentaDestCaja.cuentaContableCod, cuentaContableNom:cuentaDestCaja.cuentaContableNom
    } : null);
    const bs         = cuentaSel?.moneda==='BS';
    const tasa       = Number(form.tasa)||tasaActiva;
    const mNat       = Number(form.montoNativo)||0;
    const montoBs    = bs ? mNat : mNat*tasa;
    const montoUSD   = bs ? mNat/tasa : mNat;

    const factPend = form.tipoTercero==='Cliente'
      ? facturas.filter(f=>f.clienteId===form.terceroId&&f.estado==='Pendiente')
      : [];

    // Cuentas contables sugeridas para contrapartida
    const sugerirContra = () => {
      if(form.tipo==='Ingreso') return form.origenIngreso==='Venta'
        ? contCuentas.filter(c=>c.nombre?.toUpperCase().includes('COBRAR')||c.nombre?.toUpperCase().includes('INGRES'))
        : contCuentas.filter(c=>c.nombre?.toUpperCase().includes('PASIV')||c.nombre?.toUpperCase().includes('PRÉSTAMO'));
      return contCuentas.filter(c=>c.nombre?.toUpperCase().includes('PAGAR')||c.nombre?.toUpperCase().includes('GASTO'));
    };
    const sugs = sugerirContra();

    const save = async()=>{
      if(!form.cuentaId) return alert('Seleccione una cuenta bancaria');
      if(!form.montoNativo||mNat<=0) return alert('Ingrese un monto válido');
      if(!form.concepto) return alert('Ingrese el concepto');
      if((form.tipo==='Transferencia'||form.tipo==='Traslado de Fondo')&&!form.cuentaDestinoId) return alert('Seleccione cuenta destino');
      if(form.tipo==='Traslado de Fondo'&&form.cuentaDestinoId===form.cuentaId) return alert('El Banco Destino no puede ser el mismo que el Banco Origen');
      if((form.tipo==='Nota de Débito'||form.tipo==='Nota de Crédito')&&!form.cuentaAjusteId) return alert('Seleccione la cuenta contable del ajuste (comisión, interés, etc.)');
      if(form.aplicaTercero&&!form.terceroId) return alert('Seleccione el tercero');
      setBusy(true);
      try {
        const cuenta=cuentas.find(c=>c.id===form.cuentaId);
        const signo=(form.tipo==='Ingreso'||form.tipo==='Nota de Crédito')?1:-1;
        const nuevoSaldo=Number(cuenta.saldo)+signo*mNat;
        const id=bancoGid(); const batch=writeBatch(_bancoDB);
        const tercero=form.tipoTercero==='Cliente'?clientes.find(c=>c.id===form.terceroId):form.tipoTercero==='Proveedor'?provs.find(p=>p.id===form.terceroId):tercerosRel.find(r=>r.id===form.terceroId);
        const factura=form.cerrarCxC&&form.facturaId?facturas.find(f=>f.id===form.facturaId):null;
        // Asiento contable — cuentas
        const ctaBancoCod  = cuentaSel?.cuentaContable?.split('·')[0]?.trim()||'';
        const ctaBancoNom  = cuentaSel?.cuentaContable?.split('·')[1]?.trim()||`Banco ${cuenta.banco}`;
        const ctaContraCod = form.ctaContraNombre?.split('·')[0]?.trim()||'';
        const ctaContraNom = form.ctaContraNombre?.split('·')[1]?.trim()||form.ctaContraNombre||(form.tipo==='Ingreso'?'Cuentas por Cobrar':'Cuentas por Pagar');
        const asientoDebito  = form.tipo==='Ingreso' ? ctaBancoNom  : ctaContraNom;
        const asientoCredito = form.tipo==='Ingreso' ? ctaContraNom : ctaBancoNom;

        // ── AUTO-GENERAR ASIENTO EN LIBRO DIARIO ──────────────────────────
        const yyyymm = form.fecha.substring(0,7).replace('-','');
        const numComp = `CB-${yyyymm}-${String(movBanco.filter(m=>m.fecha?.startsWith(form.fecha.substring(0,7))).length+1).padStart(4,'0')}`;
        const mesLabel = form.fecha.substring(5,7)+'/'+form.fecha.substring(0,4);
        const esMonedaLocal = cuenta.moneda === 'BS';
        const bancoBs=esMonedaLocal?montoBs:montoUSD*tasa;
        const bancoUSD=esMonedaLocal?montoBs/tasa:montoUSD;
        const esIngreso=form.tipo==='Ingreso'||form.tipo==='Nota de Crédito';
        const esTraslado=form.tipo==='Traslado Banco→Caja';
        const esTransferencia=form.tipo==='Transferencia'||form.tipo==='Traslado de Fondo';
        const esNotaAjuste=form.tipo==='Nota de Débito'||form.tipo==='Nota de Crédito';

        let todasLineas=[];
        let comisionUSD=0, comisionBs=0;

        if(esNotaAjuste) {
          // Nota de Débito: gasto/comisión → banco disminuye
          // Nota de Crédito: ingreso/interés → banco aumenta
          const ctaAjusteObj=contCuentas.find(c=>c.id===form.cuentaAjusteId)||{};
          const ctaAjusteCod=String(ctaAjusteObj.codigo||'');
          const ctaAjusteNom=ctaAjusteObj.nombre||'Cuenta Ajuste';
          const ctaBCod=(cuentaSel?.cuentaContableCod||cuentaSel?.cuentaContable?.split('·')[0]||'').trim();
          const ctaBNom=(cuentaSel?.cuentaContableNom||cuentaSel?.cuentaContable?.split('·')[1]||`Banco ${cuenta.banco}`).trim();
          if(form.tipo==='Nota de Débito'){
            todasLineas=[
              {codigo:ctaAjusteCod,cuenta:ctaAjusteNom,tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:bancoBs,haberBs:0,debeUSD:bancoUSD,haberUSD:0},
              {codigo:ctaBCod,cuenta:ctaBNom,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:0,haberBs:bancoBs,debeUSD:0,haberUSD:bancoUSD},
            ];
          } else {
            todasLineas=[
              {codigo:ctaBCod,cuenta:ctaBNom,tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:bancoBs,haberBs:0,debeUSD:bancoUSD,haberUSD:0},
              {codigo:ctaAjusteCod,cuenta:ctaAjusteNom,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:0,haberBs:bancoBs,debeUSD:0,haberUSD:bancoUSD},
            ];
          }
        } else if(esTransferencia && cuentaDest) {
          // Transferencia/Traslado de Fondo: se usa una cuenta puente "Traslados de Fondos" en
          // AMBOS lados (origen y destino) en vez de nombrar directamente al otro banco/caja —
          // así cada lado queda como un asiento completo e independiente, sin depender de que el
          // otro lado exista para cuadrar. Origen: D Traslados de Fondos / H Banco Origen.
          // Destino: D Banco Destino / H Traslados de Fondos (se crea más abajo, junto al movimiento).
          const bsOrigen=esMonedaLocal?montoBs:montoUSD*tasa;
          const usdOrigen=esMonedaLocal?montoBs/tasa:montoUSD;
          // Leer cuenta contable con fallback al campo unificado 'cuentaContable' (cod · nom)
          const splitCta=(c)=>({cod:(c?.cuentaContableCod||c?.cuentaContable?.split('·')[0]||'').trim(),nom:(c?.cuentaContableNom||c?.cuentaContable?.split('·')[1]||c?.banco||'').trim()});
          const ctaDest=splitCta(cuentaDest); const ctaOrig=splitCta(cuentaSel);
          const ctaTrasladosObj=(contCuentas||[]).find(c=>/traslado.*fondo|fondo.*traslado/i.test(c.nombre||''))||(contCuentas||[]).find(c=>String(c.codigo)==='1.1.01.02.012');
          const codTraslados=ctaTrasladosObj?String(ctaTrasladosObj.codigo||ctaTrasladosObj.id||''):'1.1.01.02.012';
          const nomTraslados=ctaTrasladosObj?ctaTrasladosObj.nombre:'Traslados de Fondos';
          if(form.tipo==='Traslado de Fondo'&&(!ctaDest.cod||!ctaOrig.cod)){
            alert('Error: El banco origen o destino no tiene cuenta contable asignada. Configúrela en Cuentas Bancarias.');
            setBusy(false); return;
          }
          // La 'comisión por rebancarización' (diferencia entre tasa origen y tasa destino) solo
          // tiene sentido cuando origen y destino son la MISMA moneda (ej. Bs→Bs con distinto
          // spread bancario). Cuando son monedas DISTINTAS (ej. Bs→USD), bsOrigen y usdOrigen ya
          // son la misma operación expresada en las dos monedas — no hay una "tasa destino"
          // separada que comparar.
          const mismaMoneda = cuenta.moneda === cuentaDest.moneda;
          const tasaDestinoF=Number(form.tasaDestino)||tasa;
          if(mismaMoneda){
            comisionBs=Math.abs(bsOrigen-(usdOrigen*tasaDestinoF));
            comisionUSD=tasa>0?comisionBs/tasa:0;
          }
          // Tope de seguridad: una rebancarización real es una diferencia CHICA (un par de
          // puntos de tasa entre bancos) — nunca una porción grande del monto. Si el cálculo de
          // arriba da una comisión que se come más del 10% del traslado (por ejemplo, si
          // form.tasaDestino quedó con un valor que no corresponde, como "1"), es una señal de
          // que algo está mal configurado — se ignora la comisión en vez de aplicarla a ciegas.
          // Esto es lo que causaba que un traslado terminara mostrando solo una fracción del
          // monto real en vez del monto completo.
          if(bsOrigen>0 && comisionBs > bsOrigen*0.10){
            comisionBs=0; comisionUSD=0;
          }
          if(Math.abs(comisionUSD)>0.005&&!form.comisionCtaId){
            alert('Seleccione la cuenta contable de la rebancarización (la tasa destino es distinta de la tasa origen, así que hay una diferencia que registrar).');
            setBusy(false); return;
          }
          todasLineas=[
            {codigo:codTraslados,cuenta:nomTraslados,tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:bsOrigen-comisionBs,haberBs:0,debeUSD:usdOrigen-comisionUSD,haberUSD:0},
            {codigo:ctaOrig.cod,cuenta:ctaOrig.nom||`Banco ${cuenta.banco}`,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:0,haberBs:bsOrigen,debeUSD:0,haberUSD:usdOrigen},
          ];
          if(comisionUSD>0.005){
            const ctaCom=contCuentas.find(c=>c.id===form.comisionCtaId)||{};
            todasLineas.push({codigo:ctaCom.codigo||'',cuenta:ctaCom.nombre||'Rebancarización',tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:comisionBs,haberBs:0,debeUSD:comisionUSD,haberUSD:0});
          }
        } else {
          // Banco: Debe si Ingreso, Haber si Egreso o Traslado
          const bancoEnDebe = esIngreso && !esTraslado;
          const debitLinea = {
            codigo:cuentaSel?.cuentaContableCod||'',
            cuenta:cuentaSel?.cuentaContableNom||`Banco ${cuenta.banco}`,
            tipoLinea:bancoEnDebe?'D':'H',
            nroDoc:form.referencia||'',concepto:form.concepto,tasa,
            debeBs:bancoEnDebe?bancoBs:0,haberBs:bancoEnDebe?0:bancoBs,
            debeUSD:bancoEnDebe?bancoUSD:0,haberUSD:bancoEnDebe?0:bancoUSD,
          };
          const lineasContraFinal=(form.lineasContra||[]).filter(l=>l.ctaId&&(Number(l.debeBs||0)>0||Number(l.haberBs||0)>0)).map(l=>{
            const ctaInfo=contCuentas.find(c=>c.id===l.ctaId)||{};
            return {codigo:ctaInfo.codigo||'',cuenta:ctaInfo.nombre||l.ctaNom||'',tipoLinea:Number(l.debeBs||0)>0?'D':'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:Number(l.debeBs||0),haberBs:Number(l.haberBs||0),debeUSD:Number(l.debeUSD||0),haberUSD:Number(l.haberUSD||0)};
          });
          todasLineas=[debitLinea,...lineasContraFinal];
        }
        const asientoId=bancoGid();
        batch.set(getDocRef('cont_asientos',asientoId),{
          id:asientoId,
          comprobante: numComp,
          numero: numComp,
          mes: mesLabel,
          fecha: form.fecha,
          tipo: (form.tipo==='Traslado Banco→Caja'||form.tipo==='Traslado de Fondo')?'Traslado':form.tipo==='Ingreso'?'Ingreso':'Egreso',
          subTipo: form.tipo,
          nroDocumento: form.referencia||'',
          descripcion: form.concepto.toUpperCase(),
          tasa,
          niif: false,
          efectivo: false,
          modulo: 'Bancos',
          movimientoBancoId: id,
          terceroNombre: tercero?.nombre||'',
          lineas: todasLineas,
          totalDebeBs: todasLineas.reduce((a,l)=>a+l.debeBs,0),
          totalHaberBs: todasLineas.reduce((a,l)=>a+l.haberBs,0),
          totalDebeUSD: todasLineas.reduce((a,l)=>a+l.debeUSD,0),
          totalHaberUSD: todasLineas.reduce((a,l)=>a+l.haberUSD,0),
          ts: serverTimestamp()
        });

        batch.set(getDocRef('banco_movimientos',id),{
          id,fecha:form.fecha,tipo:form.tipo,
          cuentaId:cuenta.id,cuentaNombre:cuenta.banco,tipoBanco:cuenta.tipoBanco,moneda:cuenta.moneda,
          origenIngreso:form.origenIngreso,motivoEgreso:form.motivoEgreso,
          concepto:form.concepto,referencia:form.referencia,
          tasa,montoNativo:mNat,montoBs,montoUSD,
          saldoAnterior:Number(cuenta.saldo),saldoResultante:nuevoSaldo,
          aplicaTercero:form.aplicaTercero,tipoTercero:form.tipoTercero,
          terceroId:tercero?.id||'',terceroNombre:tercero?.nombre||'',
          facturaId:factura?.id||'',facturaNumero:factura?.numero||'',
          ctaContraId:form.ctaContraId,ctaContraNombre:form.ctaContraNombre,
          asientoDebito,asientoCredito,
          asientoContableId:asientoId,
          estatus:'No Conciliado',ts:serverTimestamp()
        });
        batch.update(getDocRef('banco_cuentas',cuenta.id),{saldo:nuevoSaldo});
        // Líneas del lado DESTINO, para agregarlas también al comprobante imprimible de abajo —
        // así el comprobante de un Traslado muestra el asiento COMPLETO (los 2 bancos), no solo
        // el lado origen. Se llena dentro del bloque de traslado, si aplica.
        let lineasDestinoParaComprobante = [];
        if((form.tipo==='Transferencia'||form.tipo==='Traslado de Fondo')&&cuentaDest) {
          const comisionNativo=esMonedaLocal?comisionBs:comisionUSD;
          const netoNativo=mNat-comisionNativo;
          const netoBs=esMonedaLocal?montoBs-comisionBs:(montoBs-comisionBs);
          const netoUSD=montoUSD-comisionUSD;
          const idDestino=bancoGid();
          // El destino de un traslado no tenía NINGÚN asiento contable propio — solo el movimiento
          // crudo. Se crea aquí igual que el origen: D Banco/Caja Destino / H Traslados de Fondos.
          const ctaTrasladosDestObj=(contCuentas||[]).find(c=>/traslado.*fondo|fondo.*traslado/i.test(c.nombre||''))||(contCuentas||[]).find(c=>String(c.codigo)==='1.1.01.02.012');
          const codTrasladosDest=ctaTrasladosDestObj?String(ctaTrasladosDestObj.codigo||ctaTrasladosDestObj.id||''):'1.1.01.02.012';
          const nomTrasladosDest=ctaTrasladosDestObj?ctaTrasladosDestObj.nombre:'Traslados de Fondos';
          const asientoDestId=bancoGid();
          const codCtaDestPropia=cuentaDest.cuentaContableCod||'';
          const nomCtaDestPropia=cuentaDest.cuentaContableNom||cuentaDest.banco||'';
          const conceptoDest=`Traslado recibido desde ${cuenta.banco} | Ref: ${form.referencia}`;
          batch.set(getDocRef('cont_asientos',asientoDestId),{
            id:asientoDestId, comprobante:`CB-${form.fecha.substring(0,7).replace('-','')}-${idDestino.slice(-4).toUpperCase()}`,
            numero:`CB-${form.fecha.substring(0,7).replace('-','')}-${idDestino.slice(-4).toUpperCase()}`,
            mes:form.fecha.substring(5,7)+'/'+form.fecha.substring(0,4), fecha:form.fecha,
            tipo:'Traslado', subTipo:'Traslado de Fondo', nroDocumento:form.referencia||'',
            descripcion:conceptoDest.toUpperCase(), tasa, niif:false, efectivo:false,
            modulo: destinoEsCaja?'Caja':'Bancos',
            movimientoBancoId: destinoEsCaja?'':idDestino, movimientoCajaId: destinoEsCaja?idDestino:'',
            lineas:[
              {codigo:codCtaDestPropia,cuenta:nomCtaDestPropia,tipoLinea:'D',nroDoc:form.referencia||'',concepto:conceptoDest,tasa,debeBs:netoBs,haberBs:0,debeUSD:netoUSD,haberUSD:0},
              {codigo:codTrasladosDest,cuenta:nomTrasladosDest,tipoLinea:'H',nroDoc:form.referencia||'',concepto:conceptoDest,tasa,debeBs:0,haberBs:netoBs,debeUSD:0,haberUSD:netoUSD},
            ],
            totalDebeBs:netoBs, totalHaberBs:netoBs, totalDebeUSD:netoUSD, totalHaberUSD:netoUSD,
            ts:serverTimestamp(),
          });
          lineasDestinoParaComprobante=[
            {codigo:codCtaDestPropia,cuenta:nomCtaDestPropia,tipoLinea:'D',nroDoc:form.referencia||'',concepto:conceptoDest,tasa,debeBs:netoBs,haberBs:0,debeUSD:netoUSD,haberUSD:0},
            {codigo:codTrasladosDest,cuenta:nomTrasladosDest,tipoLinea:'H',nroDoc:form.referencia||'',concepto:conceptoDest,tasa,debeBs:0,haberBs:netoBs,debeUSD:0,haberUSD:netoUSD},
          ];
          // El monto "nativo" debe expresarse en la moneda PROPIA del destino, no la del origen —
          // netoNativo está en la moneda de la cuenta ORIGEN (mNat), que es distinta cuando el
          // destino tiene otra moneda (ej. origen Bs → destino USD, como Bancaribe → Amerant).
          // Antes se sumaba netoNativo (escala Bs) directo al saldo del destino en USD, inflando
          // su saldo por el factor de la tasa. Con esto, el destino siempre usa SU propia moneda.
          const netoNativoDest = cuentaDest.moneda==='BS' ? netoBs : netoUSD;
          if(destinoEsCaja){
            batch.update(getDocRef('caja_cuentas',cuentaDest.id),{saldoInicial:Number(cuentaDest.saldo)+netoNativoDest});
            batch.set(getDocRef('caja_movimientos',idDestino),{id:idDestino,fecha:form.fecha,tipo:'Ingreso',cajaId:cuentaDest.id,cajaNombre:cuentaDest.banco,moneda:cuentaDest.moneda,concepto:conceptoDest,referencia:form.referencia,tasa,monto:netoNativoDest,montoBs:netoBs,montoUSD:netoUSD,asientoContableId:asientoDestId,estatus:'No Conciliado',ts:serverTimestamp()});
          } else {
            batch.update(getDocRef('banco_cuentas',cuentaDest.id),{saldo:Number(cuentaDest.saldo)+netoNativoDest});
            batch.set(getDocRef('banco_movimientos',idDestino),{id:idDestino,fecha:form.fecha,tipo:'Ingreso',cuentaId:cuentaDest.id,cuentaNombre:cuentaDest.banco,tipoBanco:cuentaDest.tipoBanco,moneda:cuentaDest.moneda,origenIngreso:'Transferencia',concepto:conceptoDest,referencia:form.referencia,tasa,montoNativo:netoNativoDest,montoBs:netoBs,montoUSD:netoUSD,saldoAnterior:Number(cuentaDest.saldo),saldoResultante:Number(cuentaDest.saldo)+netoNativoDest,asientoContableId:asientoDestId,estatus:'No Conciliado',ts:serverTimestamp()});
          }
        }
        if(factura&&form.cerrarCxC){
          const ns=Math.max(0,factura.saldoUSD-montoUSD);
          batch.update(getDocRef('facturacion_facturas',factura.id),{saldoUSD:ns,estado:ns<0.01?'Pagada':'Pendiente'});
        }
        if(form.aplicaTercero&&form.tipoTercero==='Relacionado'&&form.terceroId){
          const idPagoRel=bancoGid();
          batch.set(getDocRef('cxp_pagos_relacionados',idPagoRel),{
            id:idPagoRel,terceroId:form.terceroId,terceroNombre:tercero?.nombre||'',
            fecha:form.fecha,concepto:form.concepto,referencia:form.referencia,
            monto:form.tipo==='Ingreso'?-montoUSD:montoUSD,
            origen:'banco',movimientoId:id,ts:serverTimestamp()
          });
        }
        await batch.commit();
        // Armar datos del comprobante imprimible — si es Traslado/Transferencia, se agregan
        // también las líneas del lado DESTINO (ya armadas arriba), así el comprobante muestra
        // el asiento completo de los dos bancos/cajas involucrados, no solo el de origen.
        const comp={
          id,numComp,fecha:form.fecha,concepto:form.concepto,referencia:form.referencia,
          tipo:form.tipo,banco:cuentaSel?.banco||'',moneda:cuentaSel?.moneda||'',
          montoBs,montoUSD,tasa,
          lineas:[...todasLineas,...lineasDestinoParaComprobante],
          totDebeBs:todasLineas.reduce((a,l)=>a+l.debeBs,0)+lineasDestinoParaComprobante.reduce((a,l)=>a+l.debeBs,0),
          totHaberBs:todasLineas.reduce((a,l)=>a+l.haberBs,0)+lineasDestinoParaComprobante.reduce((a,l)=>a+l.haberBs,0),
          totDebeUSD:todasLineas.reduce((a,l)=>a+l.debeUSD,0)+lineasDestinoParaComprobante.reduce((a,l)=>a+l.debeUSD,0),
          totHaberUSD:todasLineas.reduce((a,l)=>a+l.haberUSD,0)+lineasDestinoParaComprobante.reduce((a,l)=>a+l.haberUSD,0),
          terceroNombre:tercero?.nombre||'',
        };
        bdbg('🔒 CIERRE via: BANCO: save() exitoso');setModal(false); setForm(initF()); setBusqCtas({});
        setComprobante(comp);
      } finally { setBusy(false); }
    };

    // Movimiento en detalle
    const movDetalle = movBanco.find(m=>(m._docId||m.id)===detalleId);

    // Guardar EDICIÓN COMPLETA (todos los campos)
    const saveEdit = async()=>{
      if(!editId) return;
      if(!form.cuentaId) return alert('Seleccione una cuenta bancaria');
      if(!form.montoNativo||mNat<=0) return alert('Ingrese un monto válido');
      if(!form.concepto) return alert('Ingrese el concepto');
      const movOrigChk = movBanco.find(m=>(m._docId||m.id)===editId);
      if(movOrigChk?.estatus==='Conciliado') return alert('🔒 Este movimiento está conciliado — reversa la conciliación primero (Conciliación → Historial) para poder editarlo.');
      setBusy(true);
      try {
        const movOriginal = movBanco.find(m=>(m._docId||m.id)===editId);
        const cuentaOrig  = cuentas.find(c=>c.id===movOriginal?.cuentaId);
        const cuentaNueva = cuentas.find(c=>c.id===form.cuentaId);
        const batch = writeBatch(_bancoDB);
        const signoOrig = movOriginal?.tipo==='Ingreso'?-1:1;
        if(cuentaOrig) batch.update(getDocRef('banco_cuentas',cuentaOrig.id),{saldo:Number(cuentaOrig.saldo)+signoOrig*Number(movOriginal?.montoNativo||0)});
        const signoNuevo = form.tipo==='Ingreso'?1:-1;
        const saldoBase = cuentaOrig?.id===form.cuentaId ? Number(cuentaOrig.saldo)+signoOrig*Number(movOriginal?.montoNativo||0) : Number(cuentaNueva?.saldo||0);
        const nuevoSaldo = saldoBase + signoNuevo*mNat;
        if(cuentaNueva && cuentaOrig?.id!==form.cuentaId) batch.update(getDocRef('banco_cuentas',cuentaNueva.id),{saldo:nuevoSaldo});
        else if(cuentaOrig?.id===form.cuentaId) batch.update(getDocRef('banco_cuentas',form.cuentaId),{saldo:nuevoSaldo});
        const ctaBanco  = cuentaSel?.cuentaContable||`Banco ${cuentaNueva?.banco||''}`;
        const ctaContra = form.ctaContraNombre||(form.tipo==='Ingreso'?'Cuentas por Cobrar':'Cuentas por Pagar');
        const tercero   = form.tipoTercero==='Cliente'?clientes.find(c=>c.id===form.terceroId):provs.find(p=>p.id===form.terceroId);
        batch.update(getDocRef('banco_movimientos',editId),{
          fecha:form.fecha,tipo:form.tipo,
          cuentaId:cuentaNueva?.id||form.cuentaId,cuentaNombre:cuentaNueva?.banco||'',
          tipoBanco:cuentaNueva?.tipoBanco||'',moneda:cuentaNueva?.moneda||'',
          origenIngreso:form.origenIngreso,motivoEgreso:form.motivoEgreso,
          concepto:form.concepto,referencia:form.referencia,
          tasa,montoNativo:mNat,montoBs,montoUSD,saldoResultante:nuevoSaldo,
          aplicaTercero:form.aplicaTercero,tipoTercero:form.tipoTercero,
          terceroId:tercero?.id||'',terceroNombre:tercero?.nombre||'',
          ctaContraId:form.ctaContraId,ctaContraNombre:form.ctaContraNombre,
          asientoDebito:form.tipo==='Ingreso'?ctaBanco:ctaContra,
          asientoCredito:form.tipo==='Ingreso'?ctaContra:ctaBanco,
        });

        // ── Regenerar el asiento contable real vinculado (cont_asientos), no solo las etiquetas ──
        if (movOriginal?.asientoContableId && form.ctaContraId) {
          const ctaContraObj = contCuentas.find(c=>c.id===form.ctaContraId) || {};
          const bancoEnDebeEdit = form.tipo==='Ingreso';
          const lineaBancoEdit = {
            codigo:cuentaNueva?.cuentaContableCod||'', cuenta:ctaBanco, tipoLinea:bancoEnDebeEdit?'D':'H',
            nroDoc:form.referencia||'', concepto:form.concepto, tasa,
            debeBs:bancoEnDebeEdit?montoBs:0, haberBs:bancoEnDebeEdit?0:montoBs,
            debeUSD:bancoEnDebeEdit?montoUSD:0, haberUSD:bancoEnDebeEdit?0:montoUSD,
          };
          const lineaContraEdit = {
            codigo:ctaContraObj.codigo||'', cuenta:ctaContraObj.nombre||form.ctaContraNombre||'', tipoLinea:bancoEnDebeEdit?'H':'D',
            nroDoc:form.referencia||'', concepto:form.concepto, tasa,
            debeBs:bancoEnDebeEdit?0:montoBs, haberBs:bancoEnDebeEdit?montoBs:0,
            debeUSD:bancoEnDebeEdit?0:montoUSD, haberUSD:bancoEnDebeEdit?montoUSD:0,
          };
          const lineasEdit = [lineaBancoEdit, lineaContraEdit];
          batch.update(getDocRef('cont_asientos', movOriginal.asientoContableId), {
            fecha:form.fecha, tipo:form.tipo==='Ingreso'?'Ingreso':'Egreso', subTipo:form.tipo,
            nroDocumento:form.referencia||'', descripcion:form.concepto.toUpperCase(), tasa,
            terceroNombre:tercero?.nombre||'', lineas:lineasEdit,
            totalDebeBs:lineasEdit.reduce((a,l)=>a+l.debeBs,0), totalHaberBs:lineasEdit.reduce((a,l)=>a+l.haberBs,0),
            totalDebeUSD:lineasEdit.reduce((a,l)=>a+l.debeUSD,0), totalHaberUSD:lineasEdit.reduce((a,l)=>a+l.haberUSD,0),
          });
        }
        // ── Caso Transferencia: actualizar también el lado destino y regenerar los DOS asientos ──
        if (form.tipo==='Transferencia' && form.cuentaDestinoId) {
          const ctaTrasladosObj=(contCuentas||[]).find(c=>/traslado.*fondo|fondo.*traslado/i.test(c.nombre||''))||(contCuentas||[]).find(c=>String(c.codigo)==='1.1.01.02.012');
          const codTraslados=ctaTrasladosObj?String(ctaTrasladosObj.codigo||ctaTrasladosObj.id||''):'1.1.01.02.012';
          const nomTraslados=ctaTrasladosObj?ctaTrasladosObj.nombre:'Traslados de Fondos';
          const esCajaDestino = form.cuentaDestinoId.startsWith('CAJA::');
          const cajaDestObj = esCajaDestino ? cajas.find(c=>c.id===form.cuentaDestinoId.replace('CAJA::','')) : null;
          const bancoDestObj = esCajaDestino ? null : cuentas.find(c=>c.id===form.cuentaDestinoId);
          const codDestino = esCajaDestino ? (cajaDestObj?.cuentaContableCod||'') : (bancoDestObj?.cuentaContableCod||'');
          const nomCtaDestino = esCajaDestino ? (cajaDestObj?.cuentaContableNom||`Caja ${cajaDestObj?.nombre||''}`) : (bancoDestObj?.cuentaContableNom||`Banco ${bancoDestObj?.banco||''}`);

          // Asiento del lado ORIGEN: Débito Traslados de Fondos / Crédito cuenta origen
          if (movOriginal?.asientoContableId) {
            const lineasOrig = [
              {codigo:codTraslados,cuenta:nomTraslados,tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:montoBs,haberBs:0,debeUSD:montoUSD,haberUSD:0},
              {codigo:cuentaNueva?.cuentaContableCod||'',cuenta:ctaBanco,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:0,haberBs:montoBs,debeUSD:0,haberUSD:montoUSD},
            ];
            batch.update(getDocRef('cont_asientos', movOriginal.asientoContableId), {
              fecha:form.fecha, tipo:'Traslado', subTipo:'Transferencia', nroDocumento:form.referencia||'',
              descripcion:form.concepto.toUpperCase(), tasa, lineas:lineasOrig,
              totalDebeBs:lineasOrig.reduce((a,l)=>a+l.debeBs,0), totalHaberBs:lineasOrig.reduce((a,l)=>a+l.haberBs,0),
              totalDebeUSD:lineasOrig.reduce((a,l)=>a+l.debeUSD,0), totalHaberUSD:lineasOrig.reduce((a,l)=>a+l.haberUSD,0),
            });
          }

          if (form._destinoMovId) {
            const destinoOriginal = movBanco.find(x=>(x._docId||x.id)===form._destinoMovId);
            // Revertir el saldo que tenía el destino anterior y aplicar el nuevo
            const cuentaDestAnterior = cuentas.find(c=>c.id===destinoOriginal?.cuentaId);
            if (cuentaDestAnterior) batch.update(getDocRef('banco_cuentas',cuentaDestAnterior.id),{saldo:Number(cuentaDestAnterior.saldo)-Number(destinoOriginal?.montoNativo||0)});
            if (!esCajaDestino && bancoDestObj) {
              // Igual que en save(): el monto nativo del DESTINO debe ir en SU propia moneda, no
              // en la del origen (mNat) — si no, un traslado Bs→USD infla el saldo del destino.
              const mNatDest = bancoDestObj.moneda==='BS' ? montoBs : montoUSD;
              const saldoDestBase = cuentaDestAnterior?.id===bancoDestObj.id ? Number(cuentaDestAnterior.saldo)-Number(destinoOriginal?.montoNativo||0) : Number(bancoDestObj.saldo||0);
              batch.update(getDocRef('banco_cuentas',bancoDestObj.id),{saldo:saldoDestBase+mNatDest});
              batch.update(getDocRef('banco_movimientos',form._destinoMovId),{
                fecha:form.fecha, cuentaId:bancoDestObj.id, cuentaNombre:bancoDestObj.banco, tipoBanco:bancoDestObj.tipoBanco, moneda:bancoDestObj.moneda,
                concepto:form.concepto, referencia:form.referencia, tasa, montoNativo:mNatDest, montoBs, montoUSD,
                saldoResultante:saldoDestBase+mNatDest,
              });
            } else if (esCajaDestino && cajaDestObj) {
              const mNatDest = cajaDestObj.moneda==='BS' ? montoBs : montoUSD;
              batch.update(getDocRef('caja_movimientos',form._destinoMovId),{
                fecha:form.fecha, cajaId:cajaDestObj.id, cajaNombre:cajaDestObj.nombre, moneda:cajaDestObj.moneda,
                concepto:form.concepto, referencia:form.referencia, tasa, monto:mNatDest, montoBs, montoUSD,
              });
            }
            if (destinoOriginal?.asientoContableId) {
              const lineasDest = [
                {codigo:codDestino,cuenta:nomCtaDestino,tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:montoBs,haberBs:0,debeUSD:montoUSD,haberUSD:0},
                {codigo:codTraslados,cuenta:nomTraslados,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:0,haberBs:montoBs,debeUSD:0,haberUSD:montoUSD},
              ];
              batch.update(getDocRef('cont_asientos', destinoOriginal.asientoContableId), {
                fecha:form.fecha, tipo:'Traslado', subTipo:'Transferencia', nroDocumento:form.referencia||'',
                descripcion:form.concepto.toUpperCase(), tasa, lineas:lineasDest,
                totalDebeBs:lineasDest.reduce((a,l)=>a+l.debeBs,0), totalHaberBs:lineasDest.reduce((a,l)=>a+l.haberBs,0),
                totalDebeUSD:lineasDest.reduce((a,l)=>a+l.debeUSD,0), totalHaberUSD:lineasDest.reduce((a,l)=>a+l.haberUSD,0),
              });
            }
          }
        }

        await batch.commit();
        setEditId(null); setDetalle(null); setForm(initF());
      } catch(e) {
        alert('❌ No se pudo guardar: '+(e?.message||e));
        console.error('saveEdit error:', e);
      } finally { setBusy(false); }
    };

    // ── Corregir Traslados (reparación masiva) ─────────────────────────
    // Detecta traslados donde la "comisión de rebancarización" se comió una porción grande del
    // monto (el bug real, ya tapado con el tope del 10% para traslados NUEVOS) — esto repara los
    // que ya quedaron mal guardados de antes. Fuente de verdad: movimiento.montoBs/montoUSD de
    // CADA lado (esos nunca se vieron afectados por la comisión — solo el monto nativo y las
    // líneas del asiento sí). No depende de si origen y destino comparten moneda o no.
    const detectarTrasladosRotos = () => {
      const todosLosMovs = [...(movBanco||[]), ...(movCaja||[])];
      const yaVistos = new Set();
      const problemas = [];
      todosLosMovs.forEach(m => {
        const esOrigen = m.tipo==='Traslado de Fondo'||m.tipo==='Transferencia';
        const esDestino = m.tipo==='Ingreso' && /traslado recibido/i.test(m.concepto||'');
        if(!esOrigen && !esDestino) return;
        if(!m.referencia || !m.fecha) return;
        const key = m.referencia+'|'+m.fecha;
        if(yaVistos.has(key+'|'+esOrigen)) return; // no procesar el mismo lado 2 veces
        yaVistos.add(key+'|'+esOrigen);
        const asiento = asientosBanco.find(a=>a.id===m.asientoContableId);
        if(!asiento?.lineas || asiento.lineas.length<2) return;
        const b = Number(m.montoBs||0), u = Number(m.montoUSD||0);
        if(b<=0 && u<=0) return;
        // ¿Alguna línea del asiento se aleja de lo que dice el propio movimiento? (>1% de tolerancia)
        const lineaRota = asiento.lineas.find(l=>{
          const lb=Number(l.debeBs||0)+Number(l.haberBs||0), lu=Number(l.debeUSD||0)+Number(l.haberUSD||0);
          return (b>0 && Math.abs(lb-b) > b*0.01) || (u>0 && Math.abs(lu-u) > u*0.01);
        });
        if(!lineaRota) return;
        const esCaja = !!m.cajaId;
        const cuentaRef = esCaja ? cajas.find(c=>c.id===m.cajaId) : cuentas.find(c=>c.id===m.cuentaId);
        const montoNativoActual = Number(m.monto ?? m.montoNativo ?? 0);
        const montoNativoCorrecto = cuentaRef?.moneda==='BS' ? b : u;
        // Líneas correctas: se conservan código/cuenta/tipoLinea, solo se corrigen los montos,
        // y se descartan líneas extra (3ra línea de "Rebancarización" que no debía existir).
        const lineasCorregidas = asiento.lineas.slice(0,2).map(l=>({
          ...l,
          debeBs: l.tipoLinea==='D'?b:0, haberBs: l.tipoLinea==='H'?b:0,
          debeUSD: l.tipoLinea==='D'?u:0, haberUSD: l.tipoLinea==='H'?u:0,
        }));
        problemas.push({
          mov:m, esCaja, cuenta:cuentaRef, esOrigen,
          montoNativoActual, montoNativoCorrecto, delta: cuentaRef ? montoNativoCorrecto-montoNativoActual : 0,
          asientoId: asiento.id, lineasCorregidas, lineasOriginales: asiento.lineas,
        });
      });
      return problemas;
    };
    const revisarTraslados = () => setProblemasTraslado(detectarTrasladosRotos());
    // Guarda lo que había ANTES de corregir, para poder reversar si algo sale mal.
    const [ultimaCorreccionTraslados, setUltimaCorreccionTraslados] = useState(null);
    const corregirTraslados = async () => {
      if(!problemasTraslado || problemasTraslado.length===0) return;
      setBusy(true);
      try{
        const batch = writeBatch(_bancoDB);
        const deltaPorCuenta = {};
        problemasTraslado.forEach(p=>{
          if(!p.cuenta) return;
          const key=(p.esCaja?'caja:':'banco:')+p.cuenta.id;
          if(!deltaPorCuenta[key]) deltaPorCuenta[key]={esCaja:p.esCaja, cuenta:p.cuenta, delta:0};
          deltaPorCuenta[key].delta += p.delta;
        });
        Object.values(deltaPorCuenta).forEach(({esCaja,cuenta,delta})=>{
          if(Math.abs(delta)<0.005) return;
          const nuevoSaldo = Number(cuenta.saldo||0) + delta;
          if(esCaja) batch.update(getDocRef('caja_cuentas', cuenta.id), {saldoInicial: nuevoSaldo});
          else batch.update(getDocRef('banco_cuentas', cuenta.id), {saldo: nuevoSaldo});
        });
        problemasTraslado.forEach(p=>{
          if(p.cuenta && Math.abs(p.delta)>=0.005){
            if(p.esCaja) batch.update(getDocRef('caja_movimientos', p.mov._docId||p.mov.id), {monto: p.montoNativoCorrecto});
            else batch.update(getDocRef('banco_movimientos', p.mov._docId||p.mov.id), {montoNativo: p.montoNativoCorrecto});
          }
          batch.update(getDocRef('cont_asientos', p.asientoId), {
            lineas: p.lineasCorregidas,
            totalDebeBs: p.lineasCorregidas.reduce((a,l)=>a+l.debeBs,0), totalHaberBs: p.lineasCorregidas.reduce((a,l)=>a+l.haberBs,0),
            totalDebeUSD: p.lineasCorregidas.reduce((a,l)=>a+l.debeUSD,0), totalHaberUSD: p.lineasCorregidas.reduce((a,l)=>a+l.haberUSD,0),
          });
        });
        await batch.commit();
        setUltimaCorreccionTraslados({problemas:problemasTraslado, deltaPorCuenta, fecha:new Date().toLocaleString('es-VE')});
        alert(`✅ Se corrigieron ${problemasTraslado.length} asiento(s) contable(s) y el saldo de ${Object.keys(deltaPorCuenta).length} cuenta(s).\n\nSi algo no se ve bien, hay un botón "↩ Reversar" junto a "Corregir Traslados" para deshacer esto.`);
        setProblemasTraslado(null);
      }catch(e){ alert('❌ No se pudo corregir: '+(e?.message||e)); }
      finally{ setBusy(false); }
    };
    // Deshace exactamente lo que hizo la última corrección: repone las líneas originales del
    // asiento, el monto nativo original del movimiento, y resta el mismo delta al saldo de cada
    // cuenta (dejándolo tal cual estaba antes de corregir).
    const reversarCorreccionTraslados = async () => {
      if(!ultimaCorreccionTraslados) return;
      if(!window.confirm('¿Reversar la última corrección de traslados? Esto deja el asiento, el monto y los saldos exactamente como estaban antes de corregir.')) return;
      setBusy(true);
      try{
        const batch = writeBatch(_bancoDB);
        Object.values(ultimaCorreccionTraslados.deltaPorCuenta).forEach(({esCaja,cuenta,delta})=>{
          if(Math.abs(delta)<0.005) return;
          const saldoRevertido = Number(cuenta.saldo||0); // el saldo ANTES de aplicar delta, ya capturado al momento de corregir
          if(esCaja) batch.update(getDocRef('caja_cuentas', cuenta.id), {saldoInicial: saldoRevertido});
          else batch.update(getDocRef('banco_cuentas', cuenta.id), {saldo: saldoRevertido});
        });
        ultimaCorreccionTraslados.problemas.forEach(p=>{
          if(p.cuenta && Math.abs(p.delta)>=0.005){
            if(p.esCaja) batch.update(getDocRef('caja_movimientos', p.mov._docId||p.mov.id), {monto: p.montoNativoActual});
            else batch.update(getDocRef('banco_movimientos', p.mov._docId||p.mov.id), {montoNativo: p.montoNativoActual});
          }
          batch.update(getDocRef('cont_asientos', p.asientoId), {
            lineas: p.lineasOriginales,
            totalDebeBs: p.lineasOriginales.reduce((a,l)=>a+Number(l.debeBs||0),0), totalHaberBs: p.lineasOriginales.reduce((a,l)=>a+Number(l.haberBs||0),0),
            totalDebeUSD: p.lineasOriginales.reduce((a,l)=>a+Number(l.debeUSD||0),0), totalHaberUSD: p.lineasOriginales.reduce((a,l)=>a+Number(l.haberUSD||0),0),
          });
        });
        await batch.commit();
        alert('↩ Corrección reversada — todo quedó como estaba antes.');
        setUltimaCorreccionTraslados(null);
      }catch(e){ alert('❌ No se pudo reversar: '+(e?.message||e)); }
      finally{ setBusy(false); }
    };

    // ── Eliminar con clave de administrador ───────────────────────────
    const [adminPwd, setAdminPwd]   = useState('');
    const [pwdModal, setPwdModal]   = useState(null); // movement to delete
    const [pwdError, setPwdError]   = useState(false);

    const pedirEliminar = (m) => {
      if(m.estatus==='Conciliado') return alert('Movimiento conciliado: no puede eliminarse.');
      setAdminPwd(''); setPwdError(false); setPwdModal(m);
    };

    const confirmarEliminar = async() => {
      if(!await validarClaveAdmin(adminPwd)) {
        setPwdError(true); setTimeout(()=>setPwdError(false),1500); return;
      }
      setBusy(true);
      try {
        const m = pwdModal;
        const docId = m._docId || m.id;
        if(!docId){ alert('No se pudo identificar el documento de este movimiento (falta ID). Contacta soporte.'); return; }
        const signo = m.tipo==='Ingreso'?-1:1;
        const cuenta = cuentas.find(c=>c.id===m.cuentaId);
        const batch=writeBatch(_bancoDB);
        batch.delete(getDocRef('banco_movimientos',docId));
        if(cuenta) batch.update(getDocRef('banco_cuentas',cuenta.id),{saldo:Number(cuenta.saldo)+signo*Number(m.montoNativo||0)});
        await batch.commit();
        setPwdModal(null); setDetalle(null); setAdminPwd('');
      } catch(e) {
        alert('❌ No se pudo eliminar el movimiento: '+(e?.message||e));
        console.error('confirmarEliminar error:', e);
      } finally { setBusy(false); }
    };

    // ── PDF / Excel movimientos bancarios con membrete ─────────────────
    const exportarMovimientos = (formato='excel') => {
      const mList = filtC ? movBanco.filter(m=>m.cuentaId===filtC) : movBanco;
      const cuentaNom = filtC ? cuentas.find(c=>c.id===filtC)?.banco||'Todas' : 'Todas las cuentas';
      const totI=mList.filter(m=>m.tipo==='Ingreso').reduce((a,m)=>a+Number(m.montoUSD||0),0);
      const totE=mList.filter(m=>m.tipo==='Egreso' ).reduce((a,m)=>a+Number(m.montoUSD||0),0);
      const rows=mList.map((m,i)=>`<tr>
        <td>${i+1}</td>
        <td>${bancoDd(m.fecha)}</td>
        <td style="font-weight:bold;color:${m.tipo==='Ingreso'?'#16a34a':m.tipo==='Egreso'?'#dc2626':'#2563eb'}">${m.tipo}</td>
        <td>${m.cuentaNombre||''}</td>
        <td>${m.concepto||''}</td>
        <td>${m.terceroNombre||'—'}</td>
        <td style="font-family:monospace">${m.referencia||'—'}</td>
        <td style="text-align:right;font-family:monospace;font-weight:bold;color:${m.tipo==='Ingreso'?'#16a34a':'#dc2626'}">$${bancoFmt(m.montoUSD)}</td>
        <td style="text-align:right;font-family:monospace">Bs.${bancoFmt(m.montoBs)}</td>
        <td style="text-align:right;font-family:monospace">${m.tasa||''}</td>
        <td><span style="background:${m.estatus==='Conciliado'?'#d1fae5':'#f1f5f9'};color:${m.estatus==='Conciliado'?'#065f46':'#64748b'};padding:2px 8px;border-radius:12px;font-size:9px;font-weight:900">${m.estatus||'Pendiente'}</span></td>
      </tr>`).join('');
      const html=bancoLetterheadOpen(
        'Reporte de Movimientos Bancarios',
        `Cuenta: ${cuentaNom} · ${filtDesde||'Inicio'} al ${filtHasta||bancoDd(getTodayDate())} · ${mList.length} movimientos`
      )+
      `<table><thead><tr><th>#</th><th>Fecha</th><th>Tipo</th><th>Banco</th><th>Concepto</th><th>Tercero</th><th>Referencia</th><th>USD</th><th>Bs.</th><th>Tasa</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="background:#000">
        <td colspan="7" style="color:#94a3b8;font-weight:bold;font-size:9px;text-transform:uppercase">TOTALES — ${mList.length} movimientos</td>
        <td style="text-align:right;font-family:monospace;font-weight:bold;color:#4ade80">Ing: $${bancoFmt(totI)}<br>Egr: $${bancoFmt(totE)}</td>
        <td colspan="3"></td>
      </tr></tfoot></table>`+
      bancoLetterheadClose(`Módulo: Tesorería & Bancos · ${bancoDd(getTodayDate())}`);
      if(formato==='pdf'){
        bancoPrintWindow(html);
      } else {
        const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
        const url=URL.createObjectURL(blob);const a=document.createElement('a');
        a.href=url;a.download=`movimientos_banco_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(url);
      }
    };

    const abrirEdicion = (m)=>{
      setEditId(m._docId||m.id); setDetalle(m._docId||m.id);
      let cuentaDestinoId = '', destinoMovId = '';
      if (m.tipo === 'Transferencia') {
        // El lado destino no tiene un vínculo directo guardado — se ubica por referencia+fecha+tipo Ingreso.
        const destino = movBanco.find(x => x.tipo==='Ingreso' && x.origenIngreso==='Transferencia' && x.referencia===m.referencia && x.fecha===m.fecha && (x._docId||x.id)!==(m._docId||m.id));
        if (destino) { cuentaDestinoId = destino.cuentaId; destinoMovId = destino._docId||destino.id; }
      }
      setForm({...initF(),fecha:m.fecha,tipo:m.tipo,cuentaId:m.cuentaId,
        origenIngreso:m.origenIngreso||'Venta',motivoEgreso:m.motivoEgreso||'Pago Proveedor',
        concepto:m.concepto,referencia:m.referencia||'',
        tasa:String(m.tasa||tasaActiva),montoNativo:String(m.montoNativo||''),
        aplicaTercero:m.aplicaTercero||false,tipoTercero:m.tipoTercero||'Cliente',terceroId:m.terceroId||'',
        ctaContraId:m.ctaContraId||'',ctaContraNombre:m.ctaContraNombre||'',
        cuentaDestinoId, _destinoMovId:destinoMovId, _destinoNoEncontrado: m.tipo==='Transferencia' && !destinoMovId});
    };

    // ── Panel info del banco seleccionado ─────────────────────────────
    const BancoInfoPanel = ({ cuentaId }) => {
      const cuenta = cuentas.find(c=>c.id===cuentaId);
      if(!cuenta) return null;
      const bs = cuenta.moneda==='BS';
      const eur= cuenta.moneda==='EUR';
      const movCta = movBanco.filter(m=>m.cuentaId===cuentaId);
      const ultConcil = concils.filter(c=>c.cuentaId===cuentaId).sort((a,b)=>b.fecha?.localeCompare(a.fecha||'')||0)[0];
      // Saldo en USD siempre
      const saldoUSD = bs?Number(cuenta.saldo)/tasaActiva:Number(cuenta.saldo);
      const saldoBs  = bs?Number(cuenta.saldo):Number(cuenta.saldo)*tasaActiva;
      const ultSaldoConcilUSD = ultConcil?.saldoBanco||0;
      const pendientesD = movCta.filter(m=>m.tipo==='Egreso' &&m.estatus!=='Conciliado').reduce((a,m)=>a+Number(m.montoUSD||0),0);
      const pendientesC = movCta.filter(m=>m.tipo==='Ingreso'&&m.estatus!=='Conciliado').reduce((a,m)=>a+Number(m.montoUSD||0),0);
      const saldoDispUSD = saldoUSD - pendientesD + pendientesC;
      const difUltConc  = saldoUSD - ultSaldoConcilUSD;
      const rows = [
        {l:'Fecha Actual',           vbs:bancoDd(getTodayDate()),               vusd:null,          mono:false},
        {l:'Último saldo conciliado',vbs:`Bs. ${bancoFmt(ultSaldoConcilUSD*tasaActiva)}`, vusd:`$${bancoFmt(ultSaldoConcilUSD)}`, mono:true},
        {l:'Saldo en Libros',        vbs:`Bs. ${bancoFmt(saldoBs)}`,     vusd:`$${bancoFmt(saldoUSD)}`,     mono:true, bold:true},
        {l:'Débitos diferidos (-)',  vbs:`Bs. ${bancoFmt(pendientesD*tasaActiva)}`, vusd:`$${bancoFmt(pendientesD)}`, mono:true, red:true},
        {l:'Créditos diferidos (+)', vbs:`Bs. ${bancoFmt(pendientesC*tasaActiva)}`, vusd:`$${bancoFmt(pendientesC)}`, mono:true, green:true},
        {l:'Saldo disponible',       vbs:`Bs. ${bancoFmt(saldoDispUSD*tasaActiva)}`, vusd:`$${bancoFmt(saldoDispUSD)}`, mono:true, bold:true, accent:true},
        {l:'Dif. Ult. Conciliación', vbs:`Bs. ${bancoFmt(difUltConc*tasaActiva)}`, vusd:`$${bancoFmt(difUltConc)}`, mono:true, red:difUltConc<0, green:difUltConc>=0},
      ];
      return (
        <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-slate-200" style={{background:'#0f172a'}}>
            <Building2 size={13} className="text-blue-400"/>
            <p className="font-black text-xs text-white uppercase tracking-widest flex-1">{cuenta.banco} · {cuenta.numeroCuenta}</p>
            <BPill usd={!bs}>{cuenta.moneda}</BPill>
          </div>
          {/* Cabecera columnas */}
          <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 px-4 py-1.5">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Concepto</p>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest text-right">Bs. (Bolívares)</p>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest text-right">USD (Dólares)</p>
          </div>
          <div className="divide-y divide-slate-50">
            {rows.map(({l,vbs,vusd,mono,bold,red,green,accent})=>(
              <div key={l} className={`grid grid-cols-3 items-center px-4 py-2 ${accent?'bg-blue-50':''}`}>
                <p className="text-[10px] text-slate-500 font-medium">{l}</p>
                <p className={`text-right font-${mono?'mono':'medium'} text-[11px] ${bold?'font-black':'font-semibold'} ${red?'text-red-600':green?'text-emerald-600':'text-slate-700'}`}>{vbs||'—'}</p>
                <p className={`text-right font-${mono?'mono':'medium'} text-[11px] ${bold?'font-black':'font-semibold'} ${red?'text-red-600':green?'text-emerald-600':'text-slate-900'}`}>{vusd||'—'}</p>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const movFiltAll = movBanco.filter(m=>{
      if(filtC     && m.cuentaId!==filtC)   return false;
      if(filtTipo  && m.tipo!==filtTipo)    return false;
      if(filtDesde && m.fecha<filtDesde)     return false;
      if(filtHasta && m.fecha>filtHasta)     return false;
      if(busqCli && !(m.terceroNombre||m.clientName||m.proveedor||m.concepto||'').toUpperCase().includes(busqCli.toUpperCase())) return false;
      if(busqRef && !(m.referencia||'').toUpperCase().includes(busqRef.toUpperCase())) return false;
      if(busqMonto){
        const q=Number(String(busqMonto).replace(',','.'));
        if(!isNaN(q) && q>0){
          const mBs=Number(m.montoBs||0), mUsd=Number(m.montoUSD||0);
          // Tolerancia de 1 centavo (redondeo) — coincide con el monto en Bs. o en $, cualquiera
          // de los dos, sin que el usuario tenga que saber en cuál moneda está tecleando.
          if(Math.abs(mBs-q)>0.01 && Math.abs(mUsd-q)>0.01) return false;
        }
      }
      return true;
    });
    // Split by moneda de la cuenta
    const movFilt     = movFiltAll; // kept for compat (tfoot balance)
    const movFiltBS   = movFiltAll.filter(m=>{
      const c=cuentas.find(x=>x.id===m.cuentaId);
      return c?.moneda==='BS'||c?.tipoBanco==='Nacional-Bs';
    });
    const movFiltUSD  = movFiltAll.filter(m=>{
      const c=cuentas.find(x=>x.id===m.cuentaId);
      return c?.moneda!=='BS'&&c?.tipoBanco!=='Nacional-Bs';
    });

    // Balance del mes seleccionado, respetando la cuenta filtrada (o todas). Se ancla en
    // saldoInicial (el punto fijo que el usuario declaró para mesSaldoInicial — nunca lo toca
    // ningún movimiento) y avanza HACIA ADELANTE sumando/restando lo ocurrido hasta el inicio
    // del mes que se está viendo. Antes se calculaba "hacia atrás" desde el saldo vivo actual,
    // lo cual además tenía un error de signo (sumaba en vez de restar lo posterior al mes).
    const cuentasBalanceFiltro = filtC ? cuentas.filter(c=>c.id===filtC) : cuentas;
    const primerDiaMesBalance = `${filtMesBalance}-01`;
    const calcCuentaBalance = (c) => {
      const movsCta = movBanco.filter(m=>m.cuentaId===c.id);
      const inicioCuenta = `${c.mesSaldoInicial||'2000-01'}-01`;
      const finMesBalance = `${filtMesBalance}-32`; // cualquier fecha después del último día del mes
      // Tasa promedio ponderada, calculada con los movimientos reales de esta cuenta (hasta el mes
      // visto) — evita depender de una "tasa global" que puede no estar registrada o quedar vieja.
      const movsParaProm = movsCta.filter(m=>(m.fecha||'')<finMesBalance);
      const sumBsProm  = movsParaProm.reduce((s,m)=>s+Number(m.montoBs ||0),0);
      const sumUsdProm = movsParaProm.reduce((s,m)=>s+Number(m.montoUSD||0),0);
      const tasaProm = sumUsdProm>0 ? sumBsProm/sumUsdProm : (tasaActiva||1);
      const saldoIniNum = Number(c.saldoInicial ?? c.saldo ?? 0);
      const saldoBaseUSD = c.moneda==='BS' ? saldoIniNum/tasaProm : saldoIniNum;
      const saldoBaseBs  = c.moneda==='BS' ? saldoIniNum : saldoIniNum*tasaProm;
      if(primerDiaMesBalance<inicioCuenta) return {saldoInicialUSD:0,saldoInicialBs:0,entradasUSD:0,entradasBs:0,salidasUSD:0,salidasBs:0}; // mes anterior al de partida
      const netoEntre = (desde,hasta,campo) => movsCta.filter(m=>(m.fecha||'')>=desde&&(!hasta||(m.fecha||'')<hasta)).reduce((s,m)=>{
        const v=Number(m[campo]||0);
        if(m.tipo==='Ingreso'||m.tipo==='Nota de Crédito') return s+v;
        return s-v; // Egreso, Nota de Débito, Traslado, Transferencia — todos salen de esta cuenta
      },0);
      const saldoInicialUSD = saldoBaseUSD + netoEntre(inicioCuenta, primerDiaMesBalance, 'montoUSD');
      const saldoInicialBs  = saldoBaseBs  + netoEntre(inicioCuenta, primerDiaMesBalance, 'montoBs');
      const movsDelMes = movsCta.filter(m=>(m.fecha||'').startsWith(filtMesBalance));
      const entradasUSD = movsDelMes.filter(m=>m.tipo==='Ingreso'||m.tipo==='Nota de Crédito').reduce((s,m)=>s+Number(m.montoUSD||0),0);
      const entradasBs  = movsDelMes.filter(m=>m.tipo==='Ingreso'||m.tipo==='Nota de Crédito').reduce((s,m)=>s+Number(m.montoBs ||0),0);
      const salidasUSD  = movsDelMes.filter(m=>m.tipo!=='Ingreso'&&m.tipo!=='Nota de Crédito').reduce((s,m)=>s+Number(m.montoUSD||0),0);
      const salidasBs   = movsDelMes.filter(m=>m.tipo!=='Ingreso'&&m.tipo!=='Nota de Crédito').reduce((s,m)=>s+Number(m.montoBs ||0),0);
      return {saldoInicialUSD,saldoInicialBs,entradasUSD,entradasBs,salidasUSD,salidasBs};
    };
    const esBsCuenta = (c) => c.moneda==='BS'||c.tipoBanco==='Nacional-Bs';
    const cuentasBsGrp  = cuentasBalanceFiltro.filter(esBsCuenta);
    const cuentasUsdGrp = cuentasBalanceFiltro.filter(c=>!esBsCuenta(c));
    const sumarGrupo = (lista) => lista.map(calcCuentaBalance).reduce((a,r)=>({
      saldoInicialUSD:a.saldoInicialUSD+r.saldoInicialUSD, saldoInicialBs:a.saldoInicialBs+r.saldoInicialBs,
      entradasUSD:a.entradasUSD+r.entradasUSD, entradasBs:a.entradasBs+r.entradasBs,
      salidasUSD:a.salidasUSD+r.salidasUSD, salidasBs:a.salidasBs+r.salidasBs,
    }),{saldoInicialUSD:0,saldoInicialBs:0,entradasUSD:0,entradasBs:0,salidasUSD:0,salidasBs:0});
    const balBs  = sumarGrupo(cuentasBsGrp);
    const balUsd = sumarGrupo(cuentasUsdGrp);
    const dispBs  = {usd:balBs.saldoInicialUSD+balBs.entradasUSD-balBs.salidasUSD,  bs:balBs.saldoInicialBs+balBs.entradasBs-balBs.salidasBs};
    const dispUsd = {usd:balUsd.saldoInicialUSD+balUsd.entradasUSD-balUsd.salidasUSD, bs:balUsd.saldoInicialBs+balUsd.entradasBs-balUsd.salidasBs};
    const fmtBs  = (usd,bs) => `Bs.${bancoFmt(bs)}`;
    const fmtBsSub  = (usd,bs) => `≈$${bancoFmt(usd)}`;
    const fmtUsd = (usd,bs) => `$${bancoFmt(usd)}`;
    const fmtUsdSub = () => '';

    const PanelBalance = ({titulo,cards,fmt,fmtSub,accentIcon}) => (
      <div className="mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{titulo}</p>
          {accentIcon}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BKPI label="Saldo Inicial" value={fmt(cards.si.usd,cards.si.bs)} sub={fmtSub(cards.si.usd,cards.si.bs)} accent="blue" Icon={Banknote}/>
          <BKPI label="Entradas" value={fmt(cards.ent.usd,cards.ent.bs)} sub={fmtSub(cards.ent.usd,cards.ent.bs)} accent="green" Icon={ArrowUpCircle}/>
          <BKPI label="Salidas" value={fmt(cards.sal.usd,cards.sal.bs)} sub={fmtSub(cards.sal.usd,cards.sal.bs)} accent="red" Icon={ArrowDownCircle}/>
          <BKPI label="Disponible" value={fmt(cards.disp.usd,cards.disp.bs)} sub={fmtSub(cards.disp.usd,cards.disp.bs)} accent={cards.disp.usd>=0?'green':'red'} Icon={PiggyBank}/>
        </div>
      </div>
    );

    return (
      <div>
        {/* ── BALANCE DE BANCOS POR MES — separado Nacionales (Bs) / Internacionales (USD) ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <p className="text-xs font-black uppercase text-slate-500 tracking-widest">
            Balance de {filtC?(cuentas.find(c=>c.id===filtC)?.banco||'la cuenta'):'todas las cuentas'} — mes seleccionado
          </p>
          <input type="month" value={filtMesBalance} onChange={e=>setFiltMesBalance(e.target.value)} className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-orange-400"/>
        </div>
        {cuentasBsGrp.length>0 && (
          <PanelBalance titulo="🇻🇪 Cuentas Nacionales — Bolívares"
            cards={{si:{usd:balBs.saldoInicialUSD,bs:balBs.saldoInicialBs},ent:{usd:balBs.entradasUSD,bs:balBs.entradasBs},sal:{usd:balBs.salidasUSD,bs:balBs.salidasBs},disp:dispBs}}
            fmt={fmtBs} fmtSub={fmtBsSub}/>
        )}
        {cuentasUsdGrp.length>0 && (
          <PanelBalance titulo="🌐 Cuentas Internacionales — Dólares"
            cards={{si:{usd:balUsd.saldoInicialUSD,bs:balUsd.saldoInicialBs},ent:{usd:balUsd.entradasUSD,bs:balUsd.entradasBs},sal:{usd:balUsd.salidasUSD,bs:balUsd.salidasBs},disp:dispUsd}}
            fmt={fmtUsd} fmtSub={fmtUsdSub}/>
        )}
        {/* ── MODAL DETALLE / EDICIÓN ── */}
        {movDetalle && (
          <BModal open={!!movDetalle} onClose={()=>{setDetalle(null);setEditId(null);setForm(initF());}} title={editId?`✏ Editando — ${movDetalle.concepto}`:`Movimiento — ${movDetalle.concepto}`} {...(editId?{xlwide:true}:{wide:true})}
            footer={
              editId
                ? <><BBo onClick={()=>{setEditId(null);setForm(initF());}}>Cancelar</BBo><BBg onClick={saveEdit} disabled={busy}>{busy?'Guardando...':'Guardar Cambios'}</BBg></>
                : <><BBd onClick={()=>setPwdModal(movDetalle)} disabled={busy||movDetalle.estatus==='Conciliado'}>{movDetalle.estatus==='Conciliado'?'🔒 Conciliado':'🗑 Eliminar'}</BBd><div className="flex-1"/>{movDetalle.estatus==='Conciliado'?<p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Lock size={12}/> Conciliado — reversa la conciliación (en Conciliación → Historial) para poder editarlo</p>:<BBg onClick={()=>abrirEdicion(movDetalle)}>✏ Editar</BBg>}</>
            }>
            {editId && movDetalle.estatus==='Conciliado' ? (
              /* Resguardo extra: si por algo se abrió modo edición sobre un movimiento que
                 mientras tanto quedó conciliado (otra pestaña, otro usuario), no se deja guardar. */
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-center">
                <Lock size={24} className="mx-auto text-amber-500 mb-2"/>
                <p className="font-black text-amber-700 text-sm">Este movimiento ya está conciliado</p>
                <p className="text-xs text-amber-600 mt-1">Reversa la conciliación primero (Conciliación → Historial → Eliminar, con clave de admin) si necesitas corregir algo aquí.</p>
              </div>
            ) : editId ? (
              /* MODO EDICIÓN COMPLETO */
              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                  <Settings size={14} className="text-blue-600"/><p className="text-[10px] font-black text-blue-700 uppercase">Editando todos los campos del movimiento</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <BFG label="Fecha"><input type="date" className={inp} value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></BFG>
                  <BFG label="Tipo">
                    <div className="flex gap-1">{['Ingreso','Egreso','Transferencia'].map(t=>(
                      <button key={t} onClick={()=>setForm({...form,tipo:t})}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border ${form.tipo===t?t==='Ingreso'?'bg-emerald-500 text-white border-emerald-500':t==='Egreso'?'bg-red-500 text-white border-red-500':'bg-blue-500 text-white border-blue-500':'bg-white text-slate-500 border-slate-200'}`}>{t}</button>
                    ))}</div>
                  </BFG>
                  <BFG label="N° Referencia"><input className={inp} value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})}/></BFG>
                </div>
                <div className={`grid ${form.tipo==='Transferencia'?'grid-cols-2':'grid-cols-2'} gap-4 items-start`}>
                  <BFG label={`Cuenta Bancaria (${cuentas.length} disponibles)${form.tipo==='Transferencia'?' — Origen':''}`}>
                    <select className={sel} value={form.cuentaId} onChange={e=>setForm({...form,cuentaId:e.target.value})}>
                      <option value="">— Seleccione la cuenta —</option>
                      {cuentas.map(c=>{const tb=TIPO_BANCO.find(t=>t.id===c.tipoBanco)||TIPO_BANCO[0];return<option key={c.id} value={c.id}>{tb.flag} {c.banco} · {c.numeroCuenta} · {c.moneda==='BS'?'Bs.':'$'} {bancoFmt(c.saldo)}</option>;})}
                    </select>
                  </BFG>
                  {form.tipo==='Transferencia'&&(
                    <BFG label="Cuenta Destino">
                      <select className={sel} value={form.cuentaDestinoId} onChange={e=>setForm({...form,cuentaDestinoId:e.target.value})}>
                        <option value="">— Seleccione destino —</option>
                        {cuentas.filter(c=>c.id!==form.cuentaId).map(c=>{const tb=TIPO_BANCO.find(t=>t.id===c.tipoBanco)||TIPO_BANCO[0];return<option key={c.id} value={c.id}>{tb.flag} {c.banco} · {c.numeroCuenta} · {c.moneda==='BS'?'Bs.':'$'} {bancoFmt(c.saldo)}</option>;})}
                        {cajas.map(c=><option key={`CAJA::${c.id}`} value={`CAJA::${c.id}`}>💰 {c.nombre} (Caja)</option>)}
                      </select>
                      {form._destinoNoEncontrado && <p className="text-[9px] font-bold text-amber-600 mt-1">⚠ No se encontró el movimiento del lado destino automáticamente — si guardas, solo se corrige este lado (origen). Ubica el otro lado en Movimientos y edítalo aparte.</p>}
                    </BFG>
                  )}
                  {form.tipo==='Ingreso'&&<div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <p className="text-[9px] font-black uppercase text-emerald-700 mb-2 tracking-widest">Origen del Ingreso</p>
                    <div className="flex gap-2 flex-wrap">{['Venta','Préstamo de Terceros','Depósito','Otros'].map(o=>(
                      <button key={o} onClick={()=>setForm({...form,origenIngreso:o})} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${form.origenIngreso===o?'bg-emerald-600 text-white border-emerald-600':'bg-white text-slate-500 border-slate-200'}`}>{o}</button>
                    ))}</div>
                  </div>}
                  {form.tipo==='Egreso'&&<div className="bg-red-50 rounded-xl p-3 border border-red-100">
                    <p className="text-[9px] font-black uppercase text-red-700 mb-2 tracking-widest">Motivo del Egreso</p>
                    <div className="flex gap-2 flex-wrap">{['Pago Proveedor','Nómina','Gastos Operativos','Impuestos','Préstamo','Otros'].map(o=>(
                      <button key={o} onClick={()=>setForm({...form,motivoEgreso:o})} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${form.motivoEgreso===o?'bg-red-600 text-white border-red-600':'bg-white text-slate-500 border-slate-200'}`}>{o}</button>
                    ))}</div>
                  </div>}
                </div>
                {cuentaSel&&<div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="grid grid-cols-3 gap-4">
                    <BFG label={`Monto (${cuentaSel.moneda})`}><input type="number" step="0.01" min="0.01" className={`${inp} font-black text-lg`} value={form.montoNativo} onChange={e=>setForm({...form,montoNativo:e.target.value})} placeholder="0.00"/></BFG>
                    <BFG label="Tasa Bs/$">
                      <div className="flex gap-1.5">
                        <input type="number" step="0.01" className={inp} value={form.tasa} onChange={e=>setForm({...form,tasa:e.target.value})}/>
                        <button type="button" disabled={fetchingBCV} title="Consultar tasa BCV" onClick={async(ev)=>{
                          ev.preventDefault(); ev.stopPropagation();
                          const t=await fetchTasaBCV(form.fecha);
                          if(t) setForm(f=>({...f,tasa:String(t)}));
                        }} className="shrink-0 w-10 flex items-center justify-center border-2 border-slate-200 rounded-xl bg-white hover:bg-blue-50 disabled:cursor-not-allowed transition-colors">
                          <RefreshCw size={14} className={`text-blue-500 ${fetchingBCV?'animate-spin':''}`}/>
                        </button>
                      </div>
                    </BFG>
                    <div className="flex flex-col justify-end pb-0.5">
                      <div className="rounded-xl p-3 text-center" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
                        <p className="text-emerald-400 font-mono font-black text-lg leading-none">{'$'+bancoFmt(montoUSD)}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">Bs. {bancoFmt(montoBs)}</p>
                      </div>
                    </div>
                  </div>
                </div>}
                <BFG label="Concepto / Descripción" full><input className={inp} value={form.concepto} onChange={e=>setForm({...form,concepto:e.target.value})}/></BFG>
                {/* Asiento contable con moneda correcta */}
                {form.tipo!=='Transferencia'&&cuentaSel&&(
                  <div className="rounded-2xl overflow-hidden border border-blue-100">
                    <div className="px-5 py-3 bg-blue-600 flex items-center gap-2">
                      <BookOpen size={14} className="text-blue-200"/><p className="text-[10px] font-black uppercase text-white tracking-widest">Asiento Contable — {bs?'Bs. (c/equiv. USD)':'USD (c/equiv. Bs.)'}</p>
                    </div>
                    <div className="p-4 bg-blue-50 space-y-3">
                      {!form.ctaContraId && (
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-3 py-2 flex items-center gap-2">
                          <span className="text-amber-500">⚠</span>
                          <p className="text-[10px] font-bold text-amber-700 flex-1">Este movimiento no tiene cuenta contable de contrapartida asignada — elige una abajo antes de guardar.</p>
                          {sugs.length>0 && <button onClick={()=>setForm({...form,ctaContraId:sugs[0].id,ctaContraNombre:`${sugs[0].codigo} · ${sugs[0].nombre}`})} className="flex-shrink-0 text-[9px] font-black uppercase bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg">✓ Usar sugerida</button>}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-3 border-l-4 border-emerald-500 border border-slate-100">
                          <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest mb-1">DÉBITO +</p>
                          <p className={`text-[11px] font-black ${form.tipo==='Ingreso'||form.ctaContraNombre?'text-slate-800':'text-amber-600'}`}>{form.tipo==='Ingreso'?(cuentaSel.cuentaContable||`Banco ${cuentaSel.banco}`):(form.ctaContraNombre||'⚠ Sin cuenta seleccionada')}</p>
                          {mNat>0&&<div className="mt-1"><p className="font-mono font-black text-emerald-600 text-xs">{bs?`Bs. ${bancoFmt(montoBs)}`:`$${bancoFmt(montoUSD)}`}</p><p className="font-mono text-slate-400 text-[10px]">{bs?`≈ $${bancoFmt(montoUSD)}`:`≈ Bs. ${bancoFmt(montoBs)}`}</p></div>}
                        </div>
                        <div className="bg-white rounded-xl p-3 border-l-4 border-red-500 border border-slate-100">
                          <p className="text-[8px] font-black uppercase text-red-600 tracking-widest mb-1">CRÉDITO −</p>
                          <p className={`text-[11px] font-black ${form.tipo==='Egreso'||form.ctaContraNombre?'text-slate-800':'text-amber-600'}`}>{form.tipo==='Egreso'?(cuentaSel.cuentaContable||`Banco ${cuentaSel.banco}`):(form.ctaContraNombre||'⚠ Sin cuenta seleccionada')}</p>
                          {mNat>0&&<div className="mt-1"><p className="font-mono font-black text-red-600 text-xs">{bs?`Bs. ${bancoFmt(montoBs)}`:`$${bancoFmt(montoUSD)}`}</p><p className="font-mono text-slate-400 text-[10px]">{bs?`≈ $${bancoFmt(montoUSD)}`:`≈ Bs. ${bancoFmt(montoBs)}`}</p></div>}
                        </div>
                      </div>
                      <BFG label="Cuenta Contrapartida (PUC)">
                        <select className={form.ctaContraId?sel:`${sel} border-amber-300`} value={form.ctaContraId} onChange={e=>{const c=contCuentas.find(x=>x.id===e.target.value);setForm({...form,ctaContraId:e.target.value,ctaContraNombre:c?`${c.codigo} · ${c.nombre}`:''})}}>
                          <option value="">— Seleccionar del Plan de Cuentas —</option>
                          {sugs.length>0&&<optgroup label="✨ Sugeridas">{sugs.slice(0,8).map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}</optgroup>}
                          <optgroup label="Todas">{[...contCuentas].sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))).map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}</optgroup>
                        </select>
                      </BFG>
                    </div>
                  </div>
                )}
                {/* Terceros en edición */}
                <div className="border-2 border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Tercero Vinculado</p>
                    <button onClick={()=>setForm({...form,aplicaTercero:!form.aplicaTercero,terceroId:''})}
                      className={`w-12 h-6 rounded-full transition-all relative ${form.aplicaTercero?'bg-orange-500':'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.aplicaTercero?'left-6':'left-0.5'}`}/>
                    </button>
                  </div>
                  {form.aplicaTercero&&<div className="grid grid-cols-2 gap-3">
                    <BFG label="Tipo"><div className="flex gap-1">{['Cliente','Proveedor'].map(t=>(
                      <button key={t} onClick={()=>setForm({...form,tipoTercero:t,terceroId:''})} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border-2 ${form.tipoTercero===t?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>{t}</button>
                    ))}</div></BFG>
                    <BFG label="Tercero">
                      <select className={sel} value={form.terceroId} onChange={e=>setForm({...form,terceroId:e.target.value})}>
                        <option value="">— Seleccione —</option>
                        {form.tipoTercero==='Cliente'?clientes.map(c=><option key={c.id} value={c.id}>{c.rif} · {c.nombre}</option>):provs.map(p=><option key={p.id} value={p.id}>{p.rif||''} · {p.nombre}</option>)}
                      </select>
                    </BFG>
                  </div>}
                </div>
              </div>
            ) : (
              /* MODO VISTA DETALLE */
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 rounded-2xl" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${movDetalle.tipo==='Ingreso'?'bg-emerald-500':movDetalle.tipo==='Egreso'?'bg-red-500':'bg-blue-500'}`}>
                    {movDetalle.tipo==='Ingreso'?<ArrowUpCircle size={22} className="text-white"/>:movDetalle.tipo==='Egreso'?<ArrowDownCircle size={22} className="text-white"/>:<ArrowLeftRight size={22} className="text-white"/>}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{movDetalle.tipo} · {movDetalle.cuentaNombre}</p>
                    <p className="font-black text-white text-lg">{movDetalle.concepto}</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">{bancoDd(movDetalle.fecha)} · {movDetalle.referencia||'Sin referencia'}</p>
                  </div>
                  <div className="text-right">
                    {movDetalle.moneda==='BS'
                      ? <><p className="font-mono font-black text-2xl text-emerald-400">Bs. {bancoFmt(movDetalle.montoBs)}</p><p className="text-slate-400 text-xs">≈ ${bancoFmt(movDetalle.montoUSD)}</p></>
                      : <><p className="font-mono font-black text-2xl text-emerald-400">{'$'+bancoFmt(movDetalle.montoUSD)}</p><p className="text-slate-400 text-xs">≈ Bs. {bancoFmt(movDetalle.montoBs)}</p></>
                    }
                    <p className="text-slate-500 text-[10px]">Tasa: {movDetalle.tasa}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[['Banco / Cuenta',movDetalle.cuentaNombre],['Tipo de Banco',movDetalle.tipoBanco||'—'],['Moneda',movDetalle.moneda],['Fecha',bancoDd(movDetalle.fecha)],
                    ['Saldo Anterior',`${movDetalle.moneda==='BS'?'Bs.':'$'} ${bancoFmt(movDetalle.saldoAnterior)}`],['Saldo Resultante',`${movDetalle.moneda==='BS'?'Bs.':'$'} ${bancoFmt(movDetalle.saldoResultante)}`],
                    ['N° Referencia',movDetalle.referencia||'—'],['Estado',movDetalle.estatus||'No Conciliado'],
                  ].map(([k,v])=>(
                    <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{k}</p>
                      <p className="font-semibold text-slate-800 text-xs">{v}</p>
                    </div>
                  ))}
                </div>
                {movDetalle.aplicaTercero&&movDetalle.terceroNombre&&(
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase text-orange-700 tracking-widest mb-1">Tercero Vinculado</p>
                    <p className="font-black text-slate-900">{movDetalle.terceroNombre}</p>
                    {movDetalle.facturaNumero&&<p className="text-[10px] text-blue-600 font-black mt-0.5">Factura: {movDetalle.facturaNumero}</p>}
                  </div>
                )}
                {(()=>{
                  // Buscar el asiento contable vinculado (con lineas reales)
                  const asientoLinked = asientosBanco.find(a=>a.id===movDetalle.asientoContableId);
                  // Buscar el movimiento del OTRO LADO del traslado — no queda un ID directo
                  // guardado entre los dos (cada lado se crea como documento independiente), así
                  // que se empareja por misma referencia + misma fecha + tipo complementario.
                  // OJO: el campo origenIngreso:'Transferencia' solo se guarda cuando el destino
                  // es un BANCO — cuando el destino es una CAJA ese campo no se setea (asimetría
                  // real del guardado), así que emparejar por origenIngreso fallaba justo en
                  // traslados banco→caja. Se usa en su lugar el patrón del concepto ("Traslado
                  // recibido desde..."), que sí queda igual en los dos casos. Se busca en Banco y
                  // Caja juntos, porque un traslado puede cruzar entre los dos.
                  const esLadoQueSale = movDetalle.tipo==='Traslado de Fondo'||movDetalle.tipo==='Transferencia';
                  const esLadoQueEntra = movDetalle.tipo==='Ingreso' && /traslado recibido/i.test(movDetalle.concepto||'');
                  const todosLosMovs = [...(movBanco||[]),...(movCaja||[])];
                  const movOtroLado = esLadoQueSale
                    ? todosLosMovs.find(m=>m.id!==movDetalle.id && m.referencia && m.referencia===movDetalle.referencia && m.fecha===movDetalle.fecha && m.tipo==='Ingreso' && /traslado recibido/i.test(m.concepto||''))
                    : esLadoQueEntra
                      ? todosLosMovs.find(m=>m.id!==movDetalle.id && m.referencia && m.referencia===movDetalle.referencia && m.fecha===movDetalle.fecha && (m.tipo==='Traslado de Fondo'||m.tipo==='Transferencia'))
                      : null;
                  const asientoOtroLado = movOtroLado ? asientosBanco.find(a=>a.id===movOtroLado.asientoContableId) : null;
                  // Reconstruir lineas dinámicamente desde datos del banco si no hay asiento guardado
                  const ctaOrig = cuentas.find(c=>c.id===movDetalle.cuentaId);
                  const ctaDest = cuentas.find(c=>c.id===movDetalle.cuentaDestinoId);
                  const splitCta = c => ({
                    cod:(c?.cuentaContableCod||c?.cuentaContable?.split('·')[0]||'').trim(),
                    nom:(c?.cuentaContableNom||c?.cuentaContable?.split('·')[1]||c?.banco||'').trim()
                  });
                  // Líneas a mostrar: prioridad → lineas del asiento guardado (+ el del otro lado
                  // del traslado, si se encontró) → reconstruidas
                  let lineasMostrar = [];
                  if(asientoLinked?.lineas?.length > 0) {
                    lineasMostrar = [...asientoLinked.lineas, ...(asientoOtroLado?.lineas||[])];
                  } else if(movDetalle.tipo==='Traslado de Fondo' && ctaOrig && ctaDest) {
                    const orig=splitCta(ctaOrig); const dest=splitCta(ctaDest);
                    lineasMostrar=[
                      {codigo:dest.cod,cuenta:`${dest.cod?dest.cod+' · ':''}${dest.nom||ctaDest.banco}`,tipoLinea:'D',debeBs:movDetalle.montoBs,haberBs:0,debeUSD:movDetalle.montoUSD,haberUSD:0},
                      {codigo:orig.cod,cuenta:`${orig.cod?orig.cod+' · ':''}${orig.nom||ctaOrig.banco}`,tipoLinea:'H',debeBs:0,haberBs:movDetalle.montoBs,debeUSD:0,haberUSD:movDetalle.montoUSD},
                    ];
                  } else if(movDetalle.asientoDebito||movDetalle.asientoCredito) {
                    // Fallback: enriquecer con cuentaContable del banco si está disponible
                    const bancoOrig = splitCta(ctaOrig);
                    const nomBanco = `${bancoOrig.cod?bancoOrig.cod+' · ':''}${bancoOrig.nom||ctaOrig?.banco||movDetalle.cuentaNombre}`;
                    const esIng = movDetalle.tipo==='Ingreso'||movDetalle.tipo==='Nota de Crédito';
                    lineasMostrar=[
                      {codigo:'',cuenta:esIng?nomBanco:movDetalle.asientoDebito,tipoLinea:'D',debeBs:movDetalle.montoBs,haberBs:0,debeUSD:movDetalle.montoUSD,haberUSD:0},
                      {codigo:'',cuenta:esIng?movDetalle.asientoCredito:nomBanco,tipoLinea:'H',debeBs:0,haberBs:movDetalle.montoBs,debeUSD:0,haberUSD:movDetalle.montoUSD},
                    ];
                  }
                  if(lineasMostrar.length===0) return null;
                  const totDeBs=lineasMostrar.reduce((a,l)=>a+Number(l.debeBs||0),0);
                  const totHaBs=lineasMostrar.reduce((a,l)=>a+Number(l.haberBs||0),0);
                  const totDeUSD=lineasMostrar.reduce((a,l)=>a+Number(l.debeUSD||0),0);
                  const totHaUSD=lineasMostrar.reduce((a,l)=>a+Number(l.haberUSD||0),0);
                  return (
                    <div className="rounded-xl overflow-hidden border border-blue-100">
                      <div className="px-5 py-3 flex items-center gap-2" style={{background:'#1e3a5f'}}>
                        <BookOpen size={13} className="text-blue-300"/>
                        <p className="text-[9px] font-black uppercase text-blue-200 tracking-widest flex-1">Asiento Contable — {asientoLinked?.comprobante||movDetalle.asientoContableId?.slice(0,8)||''}</p>
                        <p className="text-[9px] text-blue-300 font-mono">{movDetalle.moneda==='BS'?'Bs. / USD':'USD / Bs.'}</p>
                      </div>
                      {/* Cabecera columnas */}
                      <div className="grid bg-slate-50 px-4 py-2 border-b border-slate-100 text-[8px] font-black uppercase text-slate-400 tracking-widest"
                        style={{gridTemplateColumns:'1.5rem 2.5fr 0.8fr 0.8fr 0.8fr 0.8fr'}}>
                        <div/><div>Cuenta Contable</div>
                        <div className="text-right text-emerald-600">Debe Bs.</div>
                        <div className="text-right text-red-500">Haber Bs.</div>
                        <div className="text-right text-emerald-700">Debe $</div>
                        <div className="text-right text-red-600">Haber $</div>
                      </div>
                      {/* Líneas */}
                      <div className="divide-y divide-slate-50">
                        {lineasMostrar.map((l,i)=>(
                          <div key={i} className="grid items-center px-4 py-2.5 hover:bg-slate-50"
                            style={{gridTemplateColumns:'1.5rem 2.5fr 0.8fr 0.8fr 0.8fr 0.8fr'}}>
                            <span className={`text-[9px] font-black ${l.tipoLinea==='D'?'text-emerald-600':'text-red-500'}`}>{l.tipoLinea}</span>
                            <div style={{paddingLeft:l.tipoLinea==='H'?'12px':'0'}}>
                              {l.codigo&&<span className="text-[9px] font-mono font-black text-blue-600 mr-1">{l.codigo}</span>}
                              <span className="text-xs font-semibold text-slate-800">{l.cuenta}</span>
                            </div>
                            <p className="text-right font-mono text-[11px] text-emerald-700 font-black">{Number(l.debeBs||0)>0?`Bs.${bancoFmt(l.debeBs)}`:''}</p>
                            <p className="text-right font-mono text-[11px] text-red-500 font-black">{Number(l.haberBs||0)>0?`Bs.${bancoFmt(l.haberBs)}`:''}</p>
                            <p className="text-right font-mono text-[11px] text-emerald-700">{Number(l.debeUSD||0)>0?`$${bancoFmt(l.debeUSD)}`:''}</p>
                            <p className="text-right font-mono text-[11px] text-red-500">{Number(l.haberUSD||0)>0?`$${bancoFmt(l.haberUSD)}`:''}</p>
                          </div>
                        ))}
                      </div>
                      {/* Totales */}
                      <div className="grid px-4 py-2.5 border-t-2 border-slate-200 bg-slate-50 text-[11px] font-mono font-black"
                        style={{gridTemplateColumns:'1.5rem 2.5fr 0.8fr 0.8fr 0.8fr 0.8fr'}}>
                        <div/><div className="text-[9px] font-black uppercase text-slate-500 tracking-widest">SUMAS IGUALES</div>
                        <div className={`text-right ${Math.abs(totDeBs-totHaBs)<0.01?'text-emerald-700':'text-amber-600'}`}>Bs.{bancoFmt(totDeBs)}</div>
                        <div className={`text-right ${Math.abs(totDeBs-totHaBs)<0.01?'text-red-500':'text-amber-600'}`}>Bs.{bancoFmt(totHaBs)}</div>
                        <div className={`text-right ${Math.abs(totDeUSD-totHaUSD)<0.01?'text-emerald-700':'text-amber-600'}`}>{'$'+bancoFmt(totDeUSD)}</div>
                        <div className={`text-right ${Math.abs(totDeUSD-totHaUSD)<0.01?'text-red-500':'text-amber-600'}`}>{'$'+bancoFmt(totHaUSD)}</div>
                      </div>
                      {Math.abs(totDeBs-totHaBs)>0.01&&<p className="text-[9px] text-amber-600 font-bold px-4 pb-2">* Variación cambiaria: Bs.{bancoFmt(Math.abs(totDeBs-totHaBs))}</p>}
                    </div>
                  );
                })()}
              </div>
            )}
          </BModal>
        )}

        {/* ── MODAL CONTRASEÑA ADMIN PARA ELIMINAR ── */}
        {pwdModal && (
          <BModal open={!!pwdModal} onClose={()=>{setPwdModal(null);setAdminPwd('');}} title="Eliminar Movimiento — Requiere Clave Admin"
            footer={<><BBo onClick={()=>{setPwdModal(null);setAdminPwd('');}}>Cancelar</BBo><BBd onClick={confirmarEliminar} disabled={busy}>{busy?'Eliminando...':'Confirmar Eliminación'}</BBd></>}>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="font-black text-red-700 text-sm mb-1">Eliminar: {pwdModal?.concepto}</p>
                <p className="text-red-600 text-[11px]">Acción IRREVERSIBLE. Se ajustará el saldo bancario.</p>
              </div>
              <BFG label="Contraseña de Administrador">
                <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                  <input type="password" className={`${inp} pl-11 ${pwdError?'border-red-500 bg-red-50':''}`} value={adminPwd} onChange={e=>setAdminPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmarEliminar()} placeholder="Su contraseña de usuario" autoFocus/>
                </div>
                {pwdError && <p className="text-[10px] text-red-500 font-black mt-1 uppercase">Clave incorrecta</p>}
              </BFG>
            </div>
          </BModal>
        )}

        {/* ── FILTROS + TABLA ── */}
        {/* ── FILTROS COMUNES ── */}
        <div className="flex gap-2 flex-wrap items-center bg-white rounded-2xl border border-slate-100 p-3 mb-2">
          <div className="flex rounded-xl overflow-hidden border-2 border-slate-200">
            <button onClick={()=>setMonedaVista('BS')} className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all ${monedaVista==='BS'?'bg-blue-600 text-white':'bg-white text-slate-500 hover:bg-slate-50'}`}>Bs.</button>
            <button onClick={()=>setMonedaVista('USD')} className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all ${monedaVista==='USD'?'bg-emerald-600 text-white':'bg-white text-slate-500 hover:bg-slate-50'}`}>USD $</button>
            <button onClick={()=>setMonedaVista('AMBAS')} className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all ${monedaVista==='AMBAS'?'bg-purple-600 text-white':'bg-white text-slate-500 hover:bg-slate-50'}`}>Ambas</button>
          </div>
          <select className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500 text-slate-700" value={filtC} onChange={e=>setFiltC(e.target.value)}>
            <option value="">Todos los bancos</option>
            {[{label:'🇻🇪 Bolívares',tipo:'Nacional-Bs'},{label:'💵 Moneda Extranjera',tipo:'Nacional-Ext'},{label:'🌐 Internacionales',tipo:'Internacional'},{label:'💳 Electrónicas',tipo:'Electronica'},{label:'🪪 Tarjetas Débito Intl.',tipo:'Tarjeta-Debito-Intl'}].map(g=>{
              const items=cuentas.filter(c=>c.tipoBanco===g.tipo);
              return items.length>0&&<optgroup key={g.label} label={g.label}>{items.map(c=><option key={c.id} value={c.id}>{c.banco} ({c.moneda})</option>)}</optgroup>;
            })}
          </select>
          <select className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500 text-slate-700" value={filtTipo} onChange={e=>setFiltTipo(e.target.value)}>
            <option value="">Ingresos y Egresos</option>
            <option value="Ingreso">Solo Ingresos</option>
            <option value="Egreso">Solo Egresos</option>
          </select>
          <div className="flex items-center gap-1.5">
            <input type="date" className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500" value={filtDesde} onChange={e=>setFiltD(e.target.value)} title="Desde"/>
            <span className="text-slate-400 text-xs font-bold">—</span>
            <input type="date" className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500" value={filtHasta} onChange={e=>setFiltH(e.target.value)} title="Hasta"/>
          </div>
          {/* Buscadores cliente y referencia */}
          <div className="relative">
            <Users size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={busqCli} onChange={e=>setBusqCli(e.target.value)} placeholder="Buscar cliente..." className="border-2 border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400 w-36"/>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={busqRef} onChange={e=>setBusqRef(e.target.value)} placeholder="Referencia..." className="border-2 border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400 w-28"/>
          </div>
          <div className="relative">
            <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="number" step="0.01" value={busqMonto} onChange={e=>setBusqMonto(e.target.value)} placeholder="Monto..." title="Busca por monto — Bs. o $, cualquiera de los dos" className="border-2 border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400 w-24"/>
          </div>
          {(filtC||filtTipo||filtDesde||filtHasta||busqCli||busqRef||busqMonto)&&<button onClick={()=>{setFiltC('');setFiltTipo('');setFiltD('');setFiltH('');setBusqCli('');setBusqRef('');setBusqMonto('');}} className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 px-2">✕ Limpiar</button>}
          <button onClick={()=>exportarMovimientos('excel')} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={12}/> Excel</button>
          <button onClick={revisarTraslados} title="Revisa los asientos de traslados/transferencias y detecta si la comisión de rebancarización se comió el monto" className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-amber-600"><Settings size={12}/> Corregir Traslados</button>
          {ultimaCorreccionTraslados && (
            <button onClick={reversarCorreccionTraslados} disabled={busy} title={`Deshace la corrección aplicada el ${ultimaCorreccionTraslados.fecha}`} className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-600 border-2 border-red-200 rounded-xl text-[10px] font-black uppercase hover:bg-red-200"><RefreshCw size={12}/> ↩ Reversar</button>
          )}
          <BBg onClick={()=>{setForm(initF());setModal(true);}}><Plus size={13}/> Nuevo</BBg>
        </div>

        {problemasTraslado!==null && (
          <BModal open={true} onClose={()=>setProblemasTraslado(null)} title="🔧 Corregir Traslados con Asiento Roto" wide
            footer={problemasTraslado.length>0
              ? <><BBo onClick={()=>setProblemasTraslado(null)}>Cancelar</BBo><BBg onClick={corregirTraslados} disabled={busy}>{busy?'Corrigiendo...':`Corregir ${problemasTraslado.length} Asiento(s)`}</BBg></>
              : <BBo onClick={()=>setProblemasTraslado(null)}>Cerrar</BBo>}>
            {problemasTraslado.length===0 ? (
              <div className="text-center py-8 text-slate-400 font-bold text-sm">✓ No se encontraron traslados con el asiento roto.</div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700 font-bold">
                  Se encontraron {problemasTraslado.length} lado(s) de traslado/transferencia cuyo asiento contable no coincide con el monto real del movimiento (la comisión de rebancarización se comió parte o casi todo). Al corregir: se reconstruye el asiento (Debe/Haber Bs. y $) usando el monto real de cada movimiento, y se ajusta el monto nativo y el saldo de la cuenta si hacía falta.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                      <th className="px-2 py-2 text-left">Fecha</th><th className="px-2 py-2 text-left">Lado</th><th className="px-2 py-2 text-left">Cuenta</th><th className="px-2 py-2 text-left">Referencia</th>
                      <th className="px-2 py-2 text-right">$ Real</th><th className="px-2 py-2 text-right">Bs. Real</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {problemasTraslado.map((p,i)=>(
                        <tr key={i}>
                          <td className="px-2 py-1.5">{bancoDd(p.mov.fecha)}</td>
                          <td className="px-2 py-1.5">{p.esOrigen?'Origen':'Destino'}</td>
                          <td className="px-2 py-1.5 font-bold">{p.cuenta?.banco||p.cuenta?.nombre||p.mov.cuentaNombre||p.mov.cajaNombre||'—'}</td>
                          <td className="px-2 py-1.5 font-mono text-slate-400">{p.mov.referencia||'—'}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-emerald-600 font-black">${bancoFmt(p.mov.montoUSD)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-emerald-600 font-black">Bs.{bancoFmt(p.mov.montoBs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </BModal>
        )}

        {/* ── TABLA NACIONALES — Bs. ── */}
        {(()=>{const movRows=filtC?movFiltAll.filter(m=>m.cuentaId===filtC):movFiltBS; return(
          <BCard title={`🇻🇪 Cuentas Nacionales — Bolívares`} subtitle={`${movRows.length} movimiento(s)`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><BTh>Fecha</BTh><BTh>Tipo</BTh><BTh>Banco</BTh><BTh>Concepto / Tercero</BTh><BTh>Referencia</BTh><BTh right>Bs.</BTh><BTh right>Tasa</BTh><BTh>Estado</BTh><BTh></BTh></tr></thead>
                <tbody>
                  {movRows.length===0&&<tr><td colSpan={9}><BEmptyState icon={ArrowLeftRight} title="Sin movimientos nacionales" desc="Registre transacciones en cuentas Bs."/></td></tr>}
                                  {movRows.map(m=><tr key={m.id} className="hover:bg-slate-50 cursor-pointer" onClick={()=>setDetalle(m._docId||m.id)}>
                  <BTd>{bancoDd(m.fecha)}</BTd>
                  <BTd><BBadge v={m.tipo==='Ingreso'?'green':m.tipo==='Egreso'?'red':(m.tipo==='Traslado Banco→Caja'||m.tipo==='Traslado de Fondo')?'gold':m.tipo==='Nota de Débito'?'red':m.tipo==='Nota de Crédito'?'green':'blue'}>{(m.tipo==='Traslado Banco→Caja'||m.tipo==='Traslado de Fondo')?'Traslado':m.tipo==='Nota de Débito'?'N.Débito':m.tipo==='Nota de Crédito'?'N.Crédito':m.tipo}</BBadge></BTd>
                  <BTd className="font-semibold text-[11px] max-w-[90px] truncate">{m.cuentaNombre}</BTd>
                  <BTd className="max-w-[200px]">
                    <p className="text-slate-800 text-[11px] font-medium truncate">{m.concepto}</p>
                    {m.aplicaTercero&&m.terceroNombre&&<p className="text-[10px] text-blue-600 font-black truncate">{m.terceroNombre}</p>}
                  </BTd>
                  <BTd className="text-[10px] text-slate-400 font-mono">{m.referencia||'—'}</BTd>
                  <BTd right mono className={`font-black ${m.tipo==='Ingreso'?'text-emerald-600':'text-red-500'}`}>{monedaVista==='AMBAS'?`$${bancoFmt(m.montoUSD)} / Bs.${bancoFmt(m.montoBs)}`:monedaVista==='BS'?`Bs.${bancoFmt(m.montoBs)}`:`$${bancoFmt(m.montoUSD)}`}</BTd>
                  <BTd right mono className="text-slate-400 text-[10px]">{m.tasa}</BTd>
                  <BTd><BBadge v={m.estatus==='Conciliado'?'green':'gray'}>{m.estatus==='Conciliado'?'✓ Conc.':'Pend.'}</BBadge></BTd>
                  <BTd>
                    <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setDetalle(m._docId||m.id)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg" title="Ver detalle"><Search size={12}/></button>
                      <button onClick={()=>abrirEdicion(m)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Editar"><Settings size={12}/></button>
                      <button onClick={e=>{e.stopPropagation();pedirEliminar(m);}} disabled={m.estatus==='Conciliado'} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg disabled:opacity-30" title="Eliminar (clave admin)"><Trash2 size={12}/></button>
                    </div>
                  </BTd>
                </tr>)}
                </tbody>
                              {movRows.length>0&&<tfoot><tr style={{background:'#0f172a'}}>
                <td colSpan={5} className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-left">BALANCE NETO (INGRESOS - EGRESOS)</td>
                <td className="px-4 py-3 text-right font-mono font-black text-white">
                  {monedaVista==='AMBAS'?(
                    <span><span className='text-emerald-300'>${bancoFmt(movRows.reduce((a,m)=>{if(m.tipo==='Ingreso'||m.tipo==='Nota de Crédito')return a+Number(m.montoUSD);if(m.tipo==='Egreso'||m.tipo==='Nota de Débito')return a-Number(m.montoUSD);return a;},0))}</span> / Bs.{bancoFmt(movRows.reduce((a,m)=>{if(m.tipo==='Ingreso'||m.tipo==='Nota de Crédito')return a+Number(m.montoBs);if(m.tipo==='Egreso'||m.tipo==='Nota de Débito')return a-Number(m.montoBs);return a;},0))}</span>
                  ):(monedaVista==='BS'?'Bs.':'$')+bancoFmt(movRows.reduce((a,m)=>{
                    if(m.tipo==='Ingreso'||m.tipo==='Nota de Crédito') return a+Number(monedaVista==='BS'?m.montoBs:m.montoUSD);
                    if(m.tipo==='Egreso'||m.tipo==='Nota de Débito')  return a-Number(monedaVista==='BS'?m.montoBs:m.montoUSD);
                    return a;
                  },0))}
                </td>
                <td colSpan={3}></td>
              </tr></tfoot>}
              </table>
            </div>
          </BCard>
        );})()}

        {/* ── TABLAS POR CATEGORÍA (Moneda Extranjera / Internacionales / Electrónicas / Tarjetas Débito Intl.) ── */}
        {!filtC&&[
          {tipo:'Nacional-Ext', titulo:'💵 Cuentas Moneda Extranjera', vacio:'Sin movimientos en moneda extranjera'},
          {tipo:'Internacional', titulo:'🌐 Cuentas Internacionales', vacio:'Sin movimientos internacionales'},
          {tipo:'Electronica', titulo:'💳 Cuentas Electrónicas', vacio:'Sin movimientos en cuentas electrónicas'},
          {tipo:'Tarjeta-Debito-Intl', titulo:'🪪 Tarjetas de Débito Internacionales', vacio:'Sin movimientos en tarjetas de débito internacionales'},
        ].map(grp=>{
          const movRows=movFiltUSD.filter(m=>{const c=cuentas.find(x=>x.id===m.cuentaId);return c?.tipoBanco===grp.tipo;});
          if(movRows.length===0) return null;
          return (
          <BCard key={grp.tipo} title={grp.titulo} subtitle={`${movRows.length} movimiento(s)`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><BTh>Fecha</BTh><BTh>Tipo</BTh><BTh>Banco</BTh><BTh>Concepto / Tercero</BTh><BTh>Referencia</BTh><BTh right>$</BTh><BTh right>Tasa</BTh><BTh>Estado</BTh><BTh></BTh></tr></thead>
                <tbody>
                  {movRows.map(m=><tr key={m.id} className="hover:bg-slate-50 cursor-pointer" onClick={()=>setDetalle(m._docId||m.id)}>
                  <BTd>{bancoDd(m.fecha)}</BTd>
                  <BTd><BBadge v={m.tipo==='Ingreso'?'green':m.tipo==='Egreso'?'red':(m.tipo==='Traslado Banco→Caja'||m.tipo==='Traslado de Fondo')?'gold':m.tipo==='Nota de Débito'?'red':m.tipo==='Nota de Crédito'?'green':'blue'}>{(m.tipo==='Traslado Banco→Caja'||m.tipo==='Traslado de Fondo')?'Traslado':m.tipo==='Nota de Débito'?'N.Débito':m.tipo==='Nota de Crédito'?'N.Crédito':m.tipo}</BBadge></BTd>
                  <BTd className="font-semibold text-[11px] max-w-[90px] truncate">{m.cuentaNombre}</BTd>
                  <BTd className="max-w-[200px]">
                    <p className="text-slate-800 text-[11px] font-medium truncate">{m.concepto}</p>
                    {m.aplicaTercero&&m.terceroNombre&&<p className="text-[10px] text-blue-600 font-black truncate">{m.terceroNombre}</p>}
                  </BTd>
                  <BTd className="text-[10px] text-slate-400 font-mono">{m.referencia||'—'}</BTd>
                  <BTd right mono className={`font-black ${m.tipo==='Ingreso'?'text-emerald-600':'text-red-500'}`}>{monedaVista==='AMBAS'?`$${bancoFmt(m.montoUSD)} / Bs.${bancoFmt(m.montoBs)}`:monedaVista==='BS'?`Bs.${bancoFmt(m.montoBs)}`:`$${bancoFmt(m.montoUSD)}`}</BTd>
                  <BTd right mono className="text-slate-400 text-[10px]">{m.tasa}</BTd>
                  <BTd><BBadge v={m.estatus==='Conciliado'?'green':'gray'}>{m.estatus==='Conciliado'?'✓ Conc.':'Pend.'}</BBadge></BTd>
                  <BTd>
                    <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setDetalle(m._docId||m.id)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg" title="Ver detalle"><Search size={12}/></button>
                      <button onClick={()=>abrirEdicion(m)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Editar"><Settings size={12}/></button>
                      <button onClick={e=>{e.stopPropagation();pedirEliminar(m);}} disabled={m.estatus==='Conciliado'} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg disabled:opacity-30" title="Eliminar (clave admin)"><Trash2 size={12}/></button>
                    </div>
                  </BTd>
                </tr>)}
                </tbody>
                <tfoot><tr style={{background:'#0f172a'}}>
                <td colSpan={5} className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-left">BALANCE NETO (INGRESOS - EGRESOS)</td>
                <td className="px-4 py-3 text-right font-mono font-black text-white">
                  {monedaVista==='AMBAS'?(
                    <span><span className='text-emerald-300'>${bancoFmt(movRows.reduce((a,m)=>{if(m.tipo==='Ingreso'||m.tipo==='Nota de Crédito')return a+Number(m.montoUSD);if(m.tipo==='Egreso'||m.tipo==='Nota de Débito')return a-Number(m.montoUSD);return a;},0))}</span> / Bs.{bancoFmt(movRows.reduce((a,m)=>{if(m.tipo==='Ingreso'||m.tipo==='Nota de Crédito')return a+Number(m.montoBs);if(m.tipo==='Egreso'||m.tipo==='Nota de Débito')return a-Number(m.montoBs);return a;},0))}</span>
                  ):(monedaVista==='BS'?'Bs.':'$')+bancoFmt(movRows.reduce((a,m)=>{
                    if(m.tipo==='Ingreso'||m.tipo==='Nota de Crédito') return a+Number(monedaVista==='BS'?m.montoBs:m.montoUSD);
                    if(m.tipo==='Egreso'||m.tipo==='Nota de Débito')  return a-Number(monedaVista==='BS'?m.montoBs:m.montoUSD);
                    return a;
                  },0))}
                </td>
                <td colSpan={3}></td>
              </tr></tfoot>
              </table>
            </div>
          </BCard>
          );
        })}

        {/* ── COMPROBANTE IMPRIMIBLE ── */}
        {comprobante&&(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:p-0 print:bg-white">
            <style>{`@media print{body *{visibility:hidden;}#comp-print,#comp-print *{visibility:visible;}#comp-print{position:absolute;left:0;top:0;width:100%;padding:20px;box-shadow:none!important;border:none!important;background:white!important;}.no-print{display:none!important;}}`}</style>
            <div id="comp-print" className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none">
              {/* Cabecera */}
              <div className="p-8 border-b border-slate-200 flex justify-between items-start bg-white">
                <div>
                  <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Servicios Jiret G&B, C.A.</h1>
                  <p className="text-sm text-slate-500 font-bold mt-1">RIF: J-412309374</p>
                  <p className="text-xs text-slate-400 mt-1">Tesorería & Bancos</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black text-blue-600 uppercase tracking-widest">Comprobante de Diario</h2>
                  <p className="text-slate-500 font-mono mt-1 font-bold">Registro: {comprobante.numComp}</p>
                  <p className="text-slate-500 font-bold mt-1">{bancoDd(comprobante.fecha)}</p>
                  <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase ${comprobante.tipo==='Ingreso'?'bg-emerald-100 text-emerald-700':comprobante.tipo==='Egreso'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{comprobante.tipo}</span>
                </div>
              </div>
              {/* Cuerpo */}
              <div className="p-8 overflow-y-auto flex-1 bg-white">
                <div className="mb-8 flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Concepto de la Operación</p>
                    <p className="text-base font-bold text-slate-800">{comprobante.concepto}</p>
                    {comprobante.banco&&<p className="text-[11px] text-blue-600 font-black mt-0.5">{comprobante.banco} · {comprobante.moneda}</p>}
                    {comprobante.terceroNombre&&<p className="text-[11px] text-orange-600 font-bold mt-0.5">↳ {comprobante.terceroNombre}</p>}
                  </div>
                  {comprobante.referencia&&(
                    <div className="md:text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">N° Referencia</p>
                      <p className="text-base font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded inline-block">{comprobante.referencia}</p>
                    </div>
                  )}
                </div>
                {/* Tabla asiento */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-sm font-mono border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-widest border-b border-slate-300">
                        <th className="p-3 text-left border-r border-slate-300">Cuenta Contable</th>
                        <th className="p-3 text-right border-r border-slate-300 w-28">Debe Bs.</th>
                        <th className="p-3 text-right border-r border-slate-300 w-28">Haber Bs.</th>
                        <th className="p-3 text-right border-r border-slate-300 w-28 text-emerald-700">Debe $</th>
                        <th className="p-3 text-right w-28 text-emerald-700">Haber $</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(comprobante.lineas||[]).map((l,i)=>(
                        <tr key={i} className="border-b border-slate-200">
                          <td className="p-3 border-r border-slate-200 text-slate-800">
                            <span className={`text-[9px] font-black uppercase mr-2 px-1.5 py-0.5 rounded ${l.tipoLinea==='D'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{l.tipoLinea==='D'?'Debe':'Haber'}</span>
                            {l.codigo&&<span className="text-blue-600 font-black mr-1">{l.codigo}</span>}{l.cuenta}
                          </td>
                          <td className="p-3 text-right border-r border-slate-200 text-slate-700">{l.debeBs>0?l.debeBs.toLocaleString('es-VE',{minimumFractionDigits:2}):''}</td>
                          <td className="p-3 text-right border-r border-slate-200 text-slate-700">{l.haberBs>0?l.haberBs.toLocaleString('es-VE',{minimumFractionDigits:2}):''}</td>
                          <td className="p-3 text-right border-r border-slate-200 text-emerald-600">{l.debeUSD>0?l.debeUSD.toLocaleString('en-US',{minimumFractionDigits:2}):''}</td>
                          <td className="p-3 text-right text-emerald-600">{l.haberUSD>0?l.haberUSD.toLocaleString('en-US',{minimumFractionDigits:2}):''}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-800 border-t-2 border-slate-400">
                        <td className="p-3 text-right uppercase tracking-widest text-[11px] border-r border-slate-300">Sumas Iguales</td>
                        <td className="p-3 text-right border-r border-slate-300">{(comprobante.totDebeBs||0).toLocaleString('es-VE',{minimumFractionDigits:2})}</td>
                        <td className="p-3 text-right border-r border-slate-300">{(comprobante.totHaberBs||0).toLocaleString('es-VE',{minimumFractionDigits:2})}</td>
                        <td className="p-3 text-right border-r border-slate-300 text-emerald-700">{(comprobante.totDebeUSD||0).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                        <td className="p-3 text-right text-emerald-700">{(comprobante.totHaberUSD||0).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {Math.abs((comprobante.totDebeUSD||0)-(comprobante.totHaberUSD||0))>0.01&&(
                  <p className="mt-2 text-xs italic text-orange-600 font-semibold text-right">* Variación cambiaria: ${Math.abs((comprobante.totDebeUSD||0)-(comprobante.totHaberUSD||0)).toFixed(2)} USD</p>
                )}
                {/* Firmas */}
                <div className="grid grid-cols-3 gap-8 mt-20 pt-6 border-t border-slate-300 text-center">
                  {['Elaborado Por','Revisado Por','Autorizado Por'].map(f=>(
                    <div key={f}><div className="h-10 border-b border-slate-400 mb-2 mx-4"/><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{f}</p></div>
                  ))}
                </div>
              </div>
              {/* Acciones */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 no-print">
                <button onClick={()=>setComprobante(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cerrar</button>
                <button onClick={()=>window.print()} className="px-6 py-2.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/30">
                  <Printer size={16}/> Imprimir Comprobante
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL NUEVO MOVIMIENTO — DISEÑO BICOLUMNA ── */}
        <BModal open={modal} onClose={()=>{bdbg('🔒 CIERRE via: BANCO: onClose del BModal (backdrop / Escape)');setModal(false);setForm(initF());}} title="" xlwide noHeader noClip>
          <div style={{display:'flex',height:'78vh',overflow:'hidden'}}>

            {/* ══ COLUMNA IZQUIERDA: FORMULARIO ══ */}
            <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
              {/* Header */}
              <div className="px-4 py-3 flex justify-between items-center flex-shrink-0" style={{background:'#0f172a'}}>
                <div className="flex items-center gap-2">
                  <div className="bg-blue-600/30 p-1.5 rounded-lg border border-blue-500/30"><ArrowLeftRight size={13} className="text-blue-400"/></div>
                  <p className="font-black text-white text-xs uppercase tracking-wide">Registro Operativo Bimonetario</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black tracking-widest border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse"/>MULTIMONEDA
                  </div>
                  <button onClick={()=>{bdbg('🔒 CIERRE via: BANCO: boton X columna izquierda');setModal(false);setForm(initF());}} className="text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* ── DISEÑO HORIZONTAL COMPACTO CAJA ── */}
<div className="grid grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
    {/* ── Fila 1: Datos Básicos ── */}
  <div className="col-span-12 md:col-span-3">
    <CuentaSelector value={form.cuentaId} onChange={v=>{
        const nuevaCuenta=cuentas.find(c=>c.id===v);
        const nuevoBs=nuevaCuenta?.moneda==='BS';
        const usdNum=Number(form.montoUSD)||0;
        const nativo=nuevoBs?(usdNum*(Number(form.tasa)||tasaActiva)):usdNum;
        setForm({...form,cuentaId:v,montoNativo:String(nativo)});
      }} label={form.tipo==='Traslado de Fondo'?'Banco Origen':'Cuenta Bancaria'}/>
  </div>
    <div className="col-span-12 md:col-span-3">
    <BFG label="Tipo de Operación">
      <select className={sel} value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
        <option value="Ingreso">Ingreso</option>
        <option value="Egreso">Egreso</option>
        <option value="Traslado de Fondo">Traslado de Fondos</option>
      </select>
    </BFG>
  </div>

  <div className="col-span-12 md:col-span-2">
    <BFG label="Fecha">
      <input type="date" className={inp} value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/>
    </BFG>
  </div>

  <div className="col-span-12 md:col-span-4">
    <BFG label="Referencia">
      <input className={inp} value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})} placeholder="Ej: Juan Pérez / REF-123"/>
    </BFG>
  </div>
  {/* ── Fila 2: Contabilidad, Monto y Tasa ── */}
  {form.tipo==='Traslado de Fondo'&&(
  <div className="col-span-12 md:col-span-4 mt-2">
      <BFG label="Banco o Caja Destino">
        <div className="space-y-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={searchDestino} onChange={e=>setSearchDestino(e.target.value)} placeholder="Buscar banco o caja..." className={`${inp} pl-8`}/>
          </div>
          <select className={`${sel} border-orange-400`} value={form.cuentaDestinoId} onChange={e=>setForm({...form,cuentaDestinoId:e.target.value,tasaDestino:''})}>
            <option value="">— Seleccione destino —</option>
            {[['Nacional-Bs','🇻🇪 Nacionales — Bolívares'],['Nacional-Ext','💵 Moneda Extranjera'],['Internacional','🌐 Internacionales'],['Electronica','💳 Electrónicas'],['Tarjeta-Debito-Intl','🪪 Tarjetas Débito Intl.'],['Pago-Movil','📱 Pago Móvil']].map(([tipo,label])=>{
              const grupo=cuentas.filter(c=>c.id!==form.cuentaId&&esBancario(c)&&(tipo==='Pago-Movil'?(c.tipoBanco==='Pago-Movil'||c.tipoBanco==='Pago Móvil'):c.tipoBanco===tipo)&&(!searchDestino||(c.banco+' '+c.numeroCuenta).toUpperCase().includes(searchDestino.toUpperCase())));
              return grupo.length>0&&(
                <optgroup key={tipo} label={label}>
                  {grupo.map(c=>(<option key={c.id} value={c.id}>{c.banco} · {c.numeroCuenta} · {c.moneda==='BS'?'Bs.':'$'}{bancoFmt(c.saldo)}</option>))}
                </optgroup>
              );
            })}
            <optgroup label="💰 Cajas">
              {cajas.filter(c=>!searchDestino||c.nombre.toUpperCase().includes(searchDestino.toUpperCase())).map(c=>(
                <option key={c.id} value={c.id}>{c.nombre} · {c.moneda==='BS'?'Bs.':'$'}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </BFG>
  </div>
  )}
  <div className={`col-span-12 ${form.tipo==='Traslado de Fondo'?'md:col-span-8':''} mt-2 bg-white rounded-xl border border-slate-200 p-3`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Moneda de la Operación</span>
      <div className="flex gap-1.5">
        {['BS','USD'].map(m=>(
          <button key={m} onClick={()=>{
            const tasaN=Number(form.tasa)||tasaActiva; const montoOpN=Number(form.montoOp)||0;
            const usdEq=m==='USD'?montoOpN:(montoOpN/tasaN);
            const nativo=bs?(usdEq*tasaN):usdEq;
            setForm({...form,monedaOp:m,montoUSD:String(usdEq),montoNativo:String(nativo)});
          }} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${form.monedaOp===m?'bg-orange-500 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{m==='BS'?'Bs':'USD'}</button>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Monto ({form.monedaOp==='BS'?'Bs':'USD'})</label>
        <input type="number" step="0.01" min="0.01" className={`${inp} font-black text-emerald-600 bg-white`} value={form.montoOp} onChange={e=>{
          const v=e.target.value; const montoOpN=Number(v)||0; const tasaN=Number(form.tasa)||tasaActiva;
          const usdEq=form.monedaOp==='USD'?montoOpN:(montoOpN/tasaN);
          const nativo=bs?(usdEq*tasaN):usdEq;
          setForm({...form,montoOp:v,montoUSD:String(usdEq),montoNativo:String(nativo)});
        }} placeholder="0.00"/>
      </div>
      <div>
        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Tasa BCV</label>
        <div className="flex gap-1.5">
          <input type="number" step="0.01" className={`${inp} bg-white`} value={form.tasa} onChange={e=>{
            const v=e.target.value; const tasaN=Number(v)||tasaActiva; const montoOpN=Number(form.montoOp)||0;
            const usdEq=form.monedaOp==='USD'?montoOpN:(montoOpN/tasaN);
            const nativo=bs?(usdEq*tasaN):usdEq;
            setForm({...form,tasa:v,montoUSD:String(usdEq),montoNativo:String(nativo)});
          }}/>
          <button type="button" disabled={fetchingBCV} title="Consultar tasa BCV" onClick={async(ev)=>{
            ev.preventDefault(); ev.stopPropagation();
            bdbg('👆 CLIC en boton tasa BCV');
            try{
              const t=await fetchTasaBCV(form.fecha);
              if(!t) return;
              const tasaN=t; const montoOpN=Number(form.montoOp)||0;
              const usdEq=form.monedaOp==='USD'?montoOpN:(montoOpN/tasaN);
              const nativo=bs?(usdEq*tasaN):usdEq;
              setForm(f=>({...f,tasa:String(t),montoUSD:String(usdEq),montoNativo:String(nativo)}));
            }catch(err){ console.error('BCV button error:', err); alert('No se pudo actualizar la tasa: '+(err?.message||err)); }
          }} className="shrink-0 w-10 flex items-center justify-center border-2 border-slate-200 rounded-xl bg-white hover:bg-blue-50 disabled:cursor-not-allowed transition-colors">
            <RefreshCw size={14} className={`text-blue-500 ${fetchingBCV?'animate-spin':''}`}/>
          </button>
        </div>
      </div>
      <div>
        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Equivalente ({form.monedaOp==='BS'?'USD':'Bs'})</label>
        <div className="w-full bg-slate-900 text-white rounded-lg p-2 flex items-center justify-center h-[38px] shadow-inner">
          <span className="font-mono font-bold text-sm">{form.monedaOp==='BS'?'$ '+bancoFmt(Number(form.montoUSD)||0):'Bs. '+bancoFmt((Number(form.montoUSD)||0)*(Number(form.tasa)||1))}</span>
        </div>
      </div>
    </div>
  </div>
</div>
{form.tipo==='Traslado de Fondo'&&form.cuentaDestinoId&&(()=>{
  const tasaOrigenF=Number(form.tasa)||tasaActiva;
  const usdOrigenPrev=Number(form.montoUSD)||0;
  const bsOrigenPrev=usdOrigenPrev*tasaOrigenF;
  const tasaDestinoF=Number(form.tasaDestino)||tasaOrigenF;
  const comisionBsPrev=bsOrigenPrev-(usdOrigenPrev*tasaDestinoF);
  const comisionUSDPrev=tasaOrigenF>0?comisionBsPrev/tasaOrigenF:0;
  return (
  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mt-3">
    <p className="text-[10px] font-black uppercase text-amber-800 mb-2">Tasa destino (si es distinta a la de origen, la diferencia es la rebancarización)</p>
    <div className="grid grid-cols-3 gap-3 items-end">
      <div>
        <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Tasa Destino (Bs/$)</label>
        <input type="number" step="0.01" className={`${inp} bg-white`} placeholder={String(tasaOrigenF)} value={form.tasaDestino} onChange={e=>setForm({...form,tasaDestino:e.target.value})}/>
      </div>
      <div>
        <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Rebancarización (auto)</label>
        <div className="w-full bg-slate-900 text-white rounded-lg p-2 flex items-center justify-center h-[38px] shadow-inner">
          <span className="font-mono font-bold text-sm">${bancoFmt(comisionUSDPrev)}</span>
        </div>
      </div>
      <div>
        <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Cuenta Contable</label>
        <select className={`${sel} bg-white`} value={form.comisionCtaId} onChange={e=>setForm({...form,comisionCtaId:e.target.value})}>
          <option value="">— Seleccione cuenta —</option>
          {contCuentas.filter(c=>c.nombre?.toUpperCase().includes('COMIS')||c.nombre?.toUpperCase().includes('BANCARI')||c.nombre?.toUpperCase().includes('FINANC')).map(c=>(
            <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
          ))}
        </select>
      </div>
    </div>
  </div>
  );})()}
                {/* ── Concepto ── */}
                <BFG label="Concepto / Descripción" full>
                  <input className={inp} value={form.concepto} onChange={e=>setForm({...form,concepto:e.target.value})} placeholder="Describa el motivo del movimiento..."/>
                </BFG>

                {/* ── Selector ND/NC ── */}
                {(form.tipo==='Nota de Débito'||form.tipo==='Nota de Crédito')&&(
                  <div className={`rounded-xl p-4 border-2 ${form.tipo==='Nota de Débito'?'bg-rose-50 border-rose-200':'bg-teal-50 border-teal-200'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${form.tipo==='Nota de Débito'?'text-rose-700':'text-teal-700'}`}>
                      {form.tipo==='Nota de Débito'?'▼ Nota de Débito — Cuenta de Gasto / Comisión':'▲ Nota de Crédito — Cuenta de Ingreso / Interés'}
                    </p>
                    <BFG label="Cuenta Contable del Ajuste">
                      {/* Accesos rápidos: comisiones e intereses */}
                      {[...contCuentas].filter(c=>c.nombre?.toUpperCase().includes('COMIS')||c.nombre?.toUpperCase().includes('BANCARI')||c.nombre?.toUpperCase().includes('INTERES')||c.nombre?.toUpperCase().includes('INTERÉS')).slice(0,4).map(c=>(
                        <button key={c.id} onClick={()=>setForm({...form,cuentaAjusteId:c.id})}
                          className={`mr-1 mb-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${form.cuentaAjusteId===c.id?'bg-rose-600 text-white border-rose-600':'bg-white text-slate-600 border-slate-200 hover:border-rose-300'}`}>
                          ⚡ {c.codigo} · {c.nombre.length>22?c.nombre.substring(0,22)+'…':c.nombre}
                        </button>
                      ))}
                      <div className="relative mb-1 mt-1">
                        <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input value={busqCtas['ajuste']||''} onChange={e=>setBusqCtas(p=>({...p,ajuste:e.target.value}))}
                          placeholder="Buscar cuenta por código o nombre..." className={`${inp} pl-8 text-[11px]`}/>
                      </div>
                      <select className={sel} value={form.cuentaAjusteId} onChange={e=>setForm({...form,cuentaAjusteId:e.target.value})}>
                        <option value="">— Seleccione la cuenta contable —</option>
                        {[...contCuentas]
                          .filter(c=>!busqCtas['ajuste']||(c.codigo+' '+c.nombre).toUpperCase().includes((busqCtas['ajuste']||'').toUpperCase()))
                          .sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo)))
                          .map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
                      </select>
                    </BFG>
                  </div>
                )}
                {/* ── Asiento Contable Compuesto (Ingreso/Egreso) ── */}
                {form.tipo!=='Transferencia'&&form.tipo!=='Traslado de Fondo'&&form.tipo!=='Nota de Débito'&&form.tipo!=='Nota de Crédito' && cuentaSel && (
                  <div className="rounded-2xl overflow-hidden border border-blue-100">
                    <div className="px-4 py-3 bg-blue-600 flex items-center gap-2">
                      <BookOpen size={13} className="text-blue-200"/>
                      <p className="text-[10px] font-black uppercase text-white tracking-widest">Distribución Contable — Contrapartidas</p>
                      <button onClick={()=>{const sugs=sugerirContra();if(sugs.length>0){const nl=[...form.lineasContra];nl[0]={...nl[0],ctaId:sugs[0].id,ctaNom:`${sugs[0].codigo} · ${sugs[0].nombre}`};setForm({...form,lineasContra:nl});}}} className="ml-auto text-[9px] font-black uppercase bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-white transition-colors">
                        ✦ Sugerir
                      </button>
                    </div>
                    <div className="p-4 bg-blue-50 space-y-3">
                      <div className="grid gap-1 text-[8px] font-black uppercase text-slate-500 tracking-widest px-1" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
                        <div>Cuenta Contable</div><div className="text-right text-emerald-600">Debe Bs.</div><div className="text-right text-red-500">Haber Bs.</div><div className="text-right text-emerald-700">Debe $</div><div className="text-right text-red-600">Haber $</div><div/>
                      </div>
                      <div className="grid gap-2 px-1 py-2 bg-white rounded-xl border border-slate-200 items-center" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/>
                          <p className="text-[10px] font-black text-slate-800 truncate">{cuentaSel?.cuentaContableCod?cuentaSel.cuentaContableCod+' · '+cuentaSel.banco:'Banco '+cuentaSel.banco}</p>
                          <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black uppercase flex-shrink-0">Banco</span>
                        </div>
                        <p className={`text-right font-mono font-black text-xs ${form.tipo==='Ingreso'?'text-emerald-700':'text-slate-300'}`}>{form.tipo==='Ingreso'?(bs?'Bs.'+bancoFmt(montoBs):'$'+bancoFmt(montoUSD)):''}</p>
                        <p className={`text-right font-mono font-black text-xs ${form.tipo!=='Ingreso'?'text-red-600':'text-slate-300'}`}>{form.tipo!=='Ingreso'?(bs?'Bs.'+bancoFmt(montoBs):'$'+bancoFmt(montoUSD)):''}</p>
                        <p className={`text-right font-mono text-[10px] ${form.tipo==='Ingreso'?'text-emerald-600':'text-slate-300'}`}>{form.tipo==='Ingreso'?'$'+bancoFmt(montoUSD):''}</p>
                        <p className={`text-right font-mono text-[10px] ${form.tipo!=='Ingreso'?'text-red-500':'text-slate-300'}`}>{form.tipo!=='Ingreso'?'$'+bancoFmt(montoUSD):''}</p>
                        <div/>
                      </div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-1 mb-1">Contrapartidas</p>
                      {form.lineasContra.map((l,i)=>{
                        const busqCta=busqCtas[i]||'';
                        const setBusqCta=(v)=>setBusqCtas(prev=>({...prev,[i]:v}));
                        const ctasFiltradas=[...contCuentas].filter(c=>!busqCta||(c.codigo+' '+c.nombre).toUpperCase().includes(busqCta.toUpperCase())).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo)));
                        return (
                          <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                            <div className="relative">
                              <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                              <input value={busqCta} onChange={e=>setBusqCta(e.target.value)} placeholder="Buscar cuenta contable..." className={`${inp} pl-8 text-[11px]`}/>
                            </div>
                            <div className="grid gap-2 items-center" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
                              <select className="text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white font-medium"
                                value={l.ctaId} onChange={e=>{const c=contCuentas.find(x=>x.id===e.target.value);const nl=[...form.lineasContra];nl[i]={...nl[i],ctaId:e.target.value,ctaNom:c?`${c.codigo} · ${c.nombre}`:''};setForm({...form,lineasContra:nl});setBusqCta('');}}>
                                <option value="">— Seleccione cuenta —</option>
                                {ctasFiltradas.slice(0,80).map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
                                {ctasFiltradas.length>80&&<option disabled>...escribe para filtrar ({ctasFiltradas.length})</option>}
                              </select>
                              <input type="number" step="0.01" className="text-right text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 font-mono"
                                value={l.debeBs||''} onChange={e=>{const nl=[...form.lineasContra];nl[i]={...nl[i],debeBs:e.target.value,debeUSD:e.target.value&&tasa?String((Number(e.target.value)/tasa).toFixed(2)):nl[i].debeUSD};setForm({...form,lineasContra:nl});}} placeholder="Debe Bs."/>
                              <input type="number" step="0.01" className="text-right text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-red-400 font-mono"
                                value={l.haberBs||''} onChange={e=>{const nl=[...form.lineasContra];nl[i]={...nl[i],haberBs:e.target.value,haberUSD:e.target.value&&tasa?String((Number(e.target.value)/tasa).toFixed(2)):nl[i].haberUSD};setForm({...form,lineasContra:nl});}} placeholder="Haber Bs."/>
                              <input type="number" step="0.01" className="text-right text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 font-mono"
                                value={l.debeUSD||''} onChange={e=>{const nl=[...form.lineasContra];nl[i]={...nl[i],debeUSD:e.target.value,debeBs:e.target.value&&tasa?String((Number(e.target.value)*tasa).toFixed(2)):nl[i].debeBs};setForm({...form,lineasContra:nl});}} placeholder="Debe $"/>
                              <input type="number" step="0.01" className="text-right text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-red-400 font-mono"
                                value={l.haberUSD||''} onChange={e=>{const nl=[...form.lineasContra];nl[i]={...nl[i],haberUSD:e.target.value,haberBs:e.target.value&&tasa?String((Number(e.target.value)*tasa).toFixed(2)):nl[i].haberBs};setForm({...form,lineasContra:nl});}} placeholder="Haber $"/>
                              <button onClick={()=>{if(form.lineasContra.length<=1)return;const nl=[...form.lineasContra];nl.splice(i,1);setForm({...form,lineasContra:nl});}} className="text-red-400 hover:text-red-600 flex justify-center"><X size={12}/></button>
                            </div>
                            {l.ctaId&&<p className="text-[9px] text-blue-600 font-black">✓ {l.ctaNom}</p>}
                          </div>
                        );
                      })}
                      {cuentaSel&&AsientoTotales({form,bs,montoBs,montoUSD,tasa,mNat,fmt:bancoFmt})}
                      <button onClick={()=>setForm({...form,lineasContra:[...form.lineasContra,{ctaId:'',ctaNom:'',debeBs:'',haberBs:'',debeUSD:'',haberUSD:''}]})}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                        <Plus size={12}/> Agregar Cuenta Contrapartida
                      </button>
                      {form.tipo!=='Transferencia'&&form.tipo!=='Traslado de Fondo'&&form.tipo!=='Nota de Débito'&&form.tipo!=='Nota de Crédito'&&cuentaSel&&mNat>0&&AsientoAlerta({form,bs,montoBs,montoUSD,tasa,fmt:bancoFmt})}
                      {form.tipo==='Traslado Banco→Caja'&&cuentaSel&&mNat>0&&(
                        <TrasladoRebancarizacion form={form} setForm={setForm} bs={bs} mNat={mNat} tasa={tasa} tasaActiva={tasaActiva} contCuentas={contCuentas} inp={inp} fmt={bancoFmt} BFG={BFG} cuentasSel={cuentas} onSaveDone={()=>{setModal(false);setForm(initF());}}/>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Terceros ── */}
                {form.tipo!=='Transferencia'&&form.tipo!=='Traslado de Fondo'&&form.tipo!=='Nota de Débito'&&form.tipo!=='Nota de Crédito'&&<div className="border-2 border-slate-100 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs font-black text-slate-700 uppercase tracking-wide">Vincular a Tercero</p><p className="text-[10px] text-slate-400">Asociar a cliente (CxC) o proveedor (CxP)</p></div>
                    <button onClick={()=>setForm({...form,aplicaTercero:!form.aplicaTercero,terceroId:'',facturaId:'',cerrarCxC:false})} className={`w-12 h-6 rounded-full transition-all relative ${form.aplicaTercero?'bg-orange-500':'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.aplicaTercero?'left-6':'left-0.5'}`}/>
                    </button>
                  </div>
                  {form.aplicaTercero&&<div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <BFG label="Tipo">
                        <div className="flex gap-1">{['Cliente','Proveedor','Relacionado'].map(t=>(
                          <button key={t} onClick={()=>setForm({...form,tipoTercero:t,terceroId:'',facturaId:''})} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${form.tipoTercero===t?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>{t==='Relacionado'?'CxP Relac.':t}</button>
                        ))}</div>
                      </BFG>
                      <BFG label={form.tipoTercero==='Cliente'?`Clientes (${clientes.length})`:form.tipoTercero==='Proveedor'?`Proveedores (${provs.length})`:`Terceros Relacionados (${tercerosRel.length})`}>
                        <div className="space-y-2">
                          <div className="relative"><Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={searchTercero} onChange={e=>setSearchTercero(e.target.value)} placeholder={`Buscar ${form.tipoTercero==='Relacionado'?'tercero':form.tipoTercero.toLowerCase()}...`} className={`${inp} pl-8`}/></div>
                          <select className={sel} value={form.terceroId} onChange={e=>{setForm({...form,terceroId:e.target.value,facturaId:''});setSearchTercero('');}}>
                            <option value="">— Seleccione —</option>
                            {(form.tipoTercero==='Cliente'?clientes.filter(c=>!searchTercero||(c.rif+' '+c.nombre).toUpperCase().includes(searchTercero.toUpperCase())):form.tipoTercero==='Proveedor'?provs.filter(p=>!searchTercero||((p.rif||'')+' '+(p.nombre||'')).toUpperCase().includes(searchTercero.toUpperCase())):tercerosRel.filter(r=>!searchTercero||((r.cedulaRif||'')+' '+(r.nombre||'')).toUpperCase().includes(searchTercero.toUpperCase()))).map(x=><option key={x.id} value={x.id}>{x.rif||x.cedulaRif} · {x.nombre}</option>)}
                          </select>
                        </div>
                      </BFG>
                    </div>
                    {form.tipoTercero==='Relacionado'&&form.terceroId&&(()=>{
                      const trSel=tercerosRel.find(x=>x.id===form.terceroId);
                      const saldoAntes=trSel?saldoTercero(trSel):0;
                      return (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-orange-700">Saldo actual del tercero</span>
                          <span className={`font-mono font-black text-sm ${saldoAntes>0?'text-red-600':'text-emerald-600'}`}>${bancoFmt(saldoAntes)}</span>
                        </div>
                      );
                    })()}
                    {form.tipoTercero==='Cliente'&&form.terceroId&&(
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-slate-600">Cerrar Cuenta por Cobrar</p>
                          <button onClick={()=>setForm({...form,cerrarCxC:!form.cerrarCxC,facturaId:''})} className={`w-10 h-5 rounded-full transition-all relative ${form.cerrarCxC?'bg-blue-500':'bg-slate-200'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.cerrarCxC?'left-5':'left-0.5'}`}/>
                          </button>
                        </div>
                        {form.cerrarCxC&&(factPend.length>0
                          ?factPend.map(f=>(<label key={f.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.facturaId===f.id?'border-blue-500 bg-blue-50':'border-slate-200 hover:border-slate-100'}`}><input type="radio" name="fid" value={f.id} checked={form.facturaId===f.id} onChange={()=>setForm({...form,facturaId:f.id})} className="accent-blue-500"/><div className="flex-1"><p className="font-black text-xs text-slate-900">{f.numero} · {bancoDd(f.fechaVencimiento)}</p></div><p className="font-mono font-black text-orange-500">{'$'+bancoFmt(f.saldoUSD)}</p>{f.fechaVencimiento<getTodayDate()&&<BBadge v="red">Vencida</BBadge>}</label>))
                          :<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/><p className="text-[10px] font-black text-emerald-700">Sin facturas pendientes.</p></div>
                        )}
                      </div>
                    )}
                  </div>}
                </div>}
              </div>
            </div>
            {/* ══ COLUMNA DERECHA: RESUMEN BANCO + PREVIEW ASIENTO ══ */}
            <div style={{width:340,flexShrink:0,display:'flex',flexDirection:'column',background:'#f8fafc',borderLeft:'1px solid #e2e8f0',overflowY:'auto'}}>
              {/* Header columna derecha */}
              <div className="px-5 py-4 border-b border-slate-200 flex-shrink-0 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Activity size={13}/> Estado Operativo</p>
                <button onClick={()=>{bdbg('🔒 CIERRE via: BANCO: boton X panel Estado Operativo');setModal(false);setForm(initF());}} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={18}/></button>
              </div>

              <div className="p-4 space-y-3 flex-1">
                {/* Bank summary */}
                {form.cuentaId&&<BancoInfoPanel cuentaId={form.cuentaId}/>}
                {!form.cuentaId&&<div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-200 min-h-[180px]">
                  <Building2 size={28} className="text-slate-300 mb-3"/>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Seleccione un banco para visualizar su estado</p>
                </div>}
                {/* Live accounting preview */}
                {cuentaSel&&mNat>0&&<div className="rounded-xl overflow-hidden border border-slate-800">
                  <div className="px-4 py-3 flex items-center justify-between" style={{background:'#0b1120'}}>
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-blue-500"/>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Comprobante Contable</p>
                    </div>
                    <span className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle size={10}/>Cuadrado</span>
                  </div>
                  <div className="p-3 overflow-x-auto" style={{background:'#0f172a'}}>
                    <p className="text-[9px] font-mono text-slate-500 italic mb-3 truncate">{form.concepto||'...'}</p>
                    <table className="w-full text-[9px] font-mono min-w-[420px]">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left pb-2 font-semibold">CUENTA</th>
                          <th className="text-right pb-2 font-semibold px-1">DEBE Bs.</th>
                          <th className="text-right pb-2 font-semibold px-1">HABER Bs.</th>
                          <th className="text-right pb-2 font-semibold text-emerald-400/80 px-1">DEBE $</th>
                          <th className="text-right pb-2 font-semibold text-emerald-400/80 px-1">HABER $</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        {(()=>{
                          const lines=[];
                          const bsV=bs?mNat:mNat*tasa; const usdV=bs?mNat/tasa:mNat;
                          const bancoCod=(cuentaSel?.cuentaContableCod||cuentaSel?.cuentaContable?.split('·')[0]||'').trim();
                          const bancoNom=cuentaSel.banco;
                          if(form.tipo==='Traslado de Fondo'&&cuentaDest){
                            const dCod=(cuentaDest?.cuentaContableCod||cuentaDest?.cuentaContable?.split('·')[0]||'').trim();
                            const tasaDestinoPrev=Number(form.tasaDestino)||tasa;
                            const comBs=Math.abs(bsV-(usdV*tasaDestinoPrev));
                            const comUSD=tasa>0?comBs/tasa:0;
                            const netoBsPrev=bsV-comBs, netoUsdPrev=usdV-comUSD;
                            const ctaTrasladosPrev=(contCuentas||[]).find(c=>/traslado.*fondo|fondo.*traslado/i.test(c.nombre||''))||(contCuentas||[]).find(c=>String(c.codigo)==='1.1.01.02.012');
                            const codTrasladosPrev=ctaTrasladosPrev?String(ctaTrasladosPrev.codigo||ctaTrasladosPrev.id||''):'1.1.01.02.012';
                            const nomTrasladosPrev=ctaTrasladosPrev?ctaTrasladosPrev.nombre:'Traslados de Fondos';
                            // Se muestran los DOS asientos por separado — el mismo par que se va a
                            // guardar: Origen (D Traslados / H Banco Origen) y Destino (D Banco
                            // Destino / H Traslados), en vez de nombrar directamente al otro banco.
                            lines.push({grupo:`① Asiento Origen — ${bancoNom}`,cod:codTrasladosPrev,nom:nomTrasladosPrev,dBs:netoBsPrev,hBs:0,dU:netoUsdPrev,hU:0,color:'text-amber-400'});
                            lines.push({cod:bancoCod,nom:bancoNom,dBs:0,hBs:bsV,dU:0,hU:usdV,color:'text-red-400'});
                            if(comUSD>0.005){
                              const ctaCom=contCuentas.find(c=>c.id===form.comisionCtaId);
                              lines.push({cod:ctaCom?String(ctaCom.codigo):'',nom:ctaCom?ctaCom.nombre:'Rebancarización',dBs:comBs,hBs:0,dU:comUSD,hU:0,color:'text-orange-300'});
                            }
                            lines.push({grupo:`② Asiento Destino — ${cuentaDest.banco}`,cod:dCod,nom:cuentaDest.banco,dBs:netoBsPrev,hBs:0,dU:netoUsdPrev,hU:0,color:'text-emerald-400'});
                            lines.push({cod:codTrasladosPrev,nom:nomTrasladosPrev,dBs:0,hBs:netoBsPrev,dU:0,hU:netoUsdPrev,color:'text-amber-400'});
                          } else if(form.tipo==='Nota de Débito'){
                            const aj=contCuentas.find(c=>c.id===form.cuentaAjusteId);
                            if(aj)lines.push({cod:String(aj.codigo),nom:aj.nombre,dBs:bsV,hBs:0,dU:usdV,hU:0,color:'text-orange-400'});
                            lines.push({cod:bancoCod,nom:bancoNom,dBs:0,hBs:bsV,dU:0,hU:usdV,color:'text-red-400'});
                          } else if(form.tipo==='Nota de Crédito'){
                            const aj=contCuentas.find(c=>c.id===form.cuentaAjusteId);
                            lines.push({cod:bancoCod,nom:bancoNom,dBs:bsV,hBs:0,dU:usdV,hU:0,color:'text-emerald-400'});
                            if(aj)lines.push({cod:String(aj.codigo),nom:aj.nombre,dBs:0,hBs:bsV,dU:0,hU:usdV,color:'text-blue-400'});
                          } else {
                            const isIng=form.tipo==='Ingreso';
                            lines.push({cod:bancoCod,nom:bancoNom,dBs:isIng?bsV:0,hBs:isIng?0:bsV,dU:isIng?usdV:0,hU:isIng?0:usdV,color:isIng?'text-emerald-400':'text-red-400'});
                            (form.lineasContra||[]).filter(l=>l.ctaId).forEach(l=>{
                              const ci=contCuentas.find(c=>c.id===l.ctaId);
                              const db=Number(l.debeBs||0),hb=Number(l.haberBs||0),du=Number(l.debeUSD||0),hu=Number(l.haberUSD||0);
                              if(ci&&(db||hb||du||hu))lines.push({cod:String(ci.codigo),nom:ci.nombre,dBs:db,hBs:hb,dU:du,hU:hu,color:'text-slate-300'});
                            });
                          }
                          return lines.map((l,i)=>(
                            <React.Fragment key={i}>
                              {l.grupo && (
                                <tr><td colSpan={5} className={`pt-3 pb-1 text-[8px] font-black uppercase tracking-widest ${i===0?'':'border-t border-slate-700'} text-slate-400`}>{l.grupo}</td></tr>
                              )}
                              <tr className="border-b border-slate-800/50">
                                <td className="py-2">
                                  <span className={`${l.color} block truncate max-w-[120px]`}>{l.cod&&<span className="text-blue-400 mr-1">{l.cod}</span>}{l.nom}</span>
                                </td>
                                <td className="text-right px-1 font-bold">{l.dBs>0?l.dBs.toFixed(2):''}</td>
                                <td className="text-right px-1 text-slate-500">{l.hBs>0?l.hBs.toFixed(2):''}</td>
                                <td className="text-right px-1 font-bold text-emerald-400">{l.dU>0?l.dU.toFixed(2):''}</td>
                                <td className="text-right px-1 text-emerald-800">{l.hU>0?l.hU.toFixed(2):''}</td>
                              </tr>
                            </React.Fragment>
                          ));
                        })()}
                      </tbody>
                      <tfoot className="border-t border-slate-700">
                        <tr className="text-slate-400 font-bold">
                          <td className="py-2 text-right text-[8px] uppercase tracking-wider pr-2">Totales</td>
                          <td className="text-right px-1 text-white">{(bs?mNat:mNat*tasa).toFixed(2)}</td>
                          <td className="text-right px-1 text-white">{(bs?mNat:mNat*tasa).toFixed(2)}</td>
                          <td className="text-right px-1 text-emerald-400">{(bs?mNat/tasa:mNat).toFixed(2)}</td>
                          <td className="text-right px-1 text-emerald-400">{(bs?mNat/tasa:mNat).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>}
              </div>

              {/* Action bar */}
              <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0 space-y-2">
                <button onClick={save} disabled={busy}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                  {busy?<><RefreshCw size={15} className="animate-spin"/> Procesando...</>:<><Save size={16}/> Procesar y Ver Comprobante</>}
                </button>
                <button onClick={()=>{bdbg('🔒 CIERRE via: BANCO: link cancelar inferior');setModal(false);setForm(initF());}} className="w-full py-2 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </BModal>
      </div>
    );
    } catch(err) {
      bdbg('🔴 MovimientosViewImpl LANZÓ ERROR DE RENDER: ' + err.message);
      console.error('MovimientosView error:', err);
      return (
        <div className="max-w-2xl mx-auto mt-12 bg-red-50 border-2 border-red-300 rounded-3xl p-8 text-center">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3"/>
          <div className="text-red-600 font-black text-lg uppercase mb-2">Error en Banco — Nuevo Movimiento</div>
          <div className="text-red-700 text-xs font-bold bg-red-100 rounded-xl p-3 font-mono break-words">{err.message}</div>
          <button onClick={()=>window.location.reload()} className="mt-4 bg-black text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase">Recargar</button>
        </div>
      );
    }
  };
  // FIX CRÍTICO (aplicado): MovimientosViewImpl se redefine en cada render de BancoApp (normal,
  // así mantiene sus closures frescos sobre cuentas/movBanco/etc.). El problema NO era eso — era
  // que <MovimientosView/> usaba esa referencia NUEVA directamente, y React la trataba como un
  // componente distinto cada vez, desmontando el que tenía el modal abierto. Este wrapper le da a
  // MovimientosView una identidad ESTABLE (fijada una sola vez con useRef) que por dentro siempre
  // llama a la implementación MÁS RECIENTE — así el componente nunca se desmonta solo, pero sigue
  // viendo datos actualizados.
  const _movViewImplRef = useRef(MovimientosViewImpl);
  _movViewImplRef.current = MovimientosViewImpl;
  const MovimientosView = useRef((props) => _movViewImplRef.current(props)).current;

  // ══════════════════════════════════════════════════════════════════════
  // 4. CAJA — CUENTAS DE CAJA
  // ══════════════════════════════════════════════════════════════════════
  const CuentasCajaView = () => {
    const [modal, setModal]   = useState(false);
    const [editando, setEdit] = useState(null);
    const [busy, setBusy]     = useState(false);
    const initF = ()=>({nombre:'',moneda:'BS',saldoInicial:'0',mesSaldoInicial:getTodayDate().substring(0,7),cuentaContableCod:'',cuentaContableNom:'',descripcion:''});
    const [form, setForm] = useState(initF());

    const openNew  = ()=>{ setEdit(null); setForm(initF()); setModal(true); };
    const openEdit = c  =>{ setEdit(c); setForm({nombre:c.nombre||'',moneda:c.moneda||'BS',saldoInicial:String(c.saldoInicial||0),mesSaldoInicial:c.mesSaldoInicial||getTodayDate().substring(0,7),cuentaContableCod:c.cuentaContableCod||'',cuentaContableNom:c.cuentaContableNom||'',descripcion:c.descripcion||''}); setModal(true); };

    const save = async()=>{
      if(!form.nombre.trim()) return alert('El nombre de la caja es requerido');
      setBusy(true);
      try {
        const data = { nombre:form.nombre.trim().toUpperCase(), moneda:form.moneda, saldoInicial:Number(form.saldoInicial)||0, mesSaldoInicial:form.mesSaldoInicial, cuentaContableCod:form.cuentaContableCod, cuentaContableNom:form.cuentaContableNom, descripcion:form.descripcion, activo:true };
        if(editando) {
          await updateDoc(getDocRef('caja_cuentas', editando.id), data);
        } else {
          const id = bancoGid();
          await setDoc(getDocRef('caja_cuentas', id), {...data, id, ts:serverTimestamp()});
        }
        setModal(false); setEdit(null); setForm(initF());
      } catch(e){ alert('Error: '+e.message); } finally { setBusy(false); }
    };

    const toggleActivo = async(c)=>{
      await updateDoc(getDocRef('caja_cuentas',c.id),{activo:!c.activo});
    };

    const getSaldoCaja = (cajaId)=>{
      const esBs = m => String(m||'').toUpperCase()==='BS';
      const movs = movCaja.filter(m=>m.cajaId===cajaId);
      const bs  = movs.filter(m=>esBs(m.moneda)).reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoBs||0),0);
      const usd = movs.filter(m=>!esBs(m.moneda)).reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoUSD||0),0);
      // Cobros CxC / Pagos CxP registrados a través de esta caja — se excluyen SOLO los que
      // realmente ya tienen su propio movimiento directo en caja_movimientos (mismo
      // grupoCobroId/grupoPagoId encontrado ahí). Antes se excluía cualquiera que simplemente
      // TUVIERA el campo grupoCobroId, asumiendo que eso significaba que ya existía el
      // duplicado — pero Aplicación.jsx nunca crea ese duplicado para pagos en efectivo
      // (CAJA::), así que ese filtro excluía TODOS los cobros de caja hechos por "Registrar
      // Cobranza", sin importar si de verdad estaban duplicados o no.
      const cobrosCaja = cobrosCajaCxc.filter(c=>(c.cuentaBancariaId||'').replace('CAJA::','')===cajaId && !(c.grupoCobroId && movCaja.some(m=>m.grupoCobroId===c.grupoCobroId)));
      const bsCobros  = cobrosCaja.filter(c=>esBs(c.moneda)).reduce((a,c)=>{const tasa=Number(c.tasa||tasaActiva)||tasaActiva;return a+(Number(c.montoBs||0)||(Number(c.monto||0)*tasa));},0);
      const usdCobros = cobrosCaja.filter(c=>!esBs(c.moneda)).reduce((a,c)=>a+Number(c.monto||0),0);
      const pagosCaja = pagosCajaCxP.filter(p=>(p.cuentaId||'').replace('CAJA::','')===cajaId && !(p.grupoPagoId && movCaja.some(m=>m.grupoPagoId===p.grupoPagoId)));
      const bsPagos  = pagosCaja.filter(p=>esBs(p.moneda)).reduce((a,p)=>{const tasa=Number(p.tasa||tasaActiva)||tasaActiva;return a+(Number(p.montoBs||0)||(Number(p.monto||0)*tasa));},0);
      const usdPagos = pagosCaja.filter(p=>!esBs(p.moneda)).reduce((a,p)=>a+Number(p.monto||0),0);
      return {bs: bs+bsCobros-bsPagos, usd: usd+usdCobros-usdPagos};
    };

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black uppercase text-slate-900">Cuentas de Caja</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Administración de cajas y fondos de efectivo</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase text-white shadow-lg transition-all hover:opacity-90" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
            <Plus size={14}/> Nueva Caja
          </button>
        </div>

        {/* Grid de cajas */}
        {cajas.length===0 ? (
          <BEmptyState icon={PiggyBank} title="Sin cajas registradas" desc="Cree una caja para registrar movimientos de efectivo"/>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {cajas.map(c=>{
              const saldo = getSaldoCaja(c.id);
              const monedaLabel = c.moneda==='BS'?'Bs':'USD';
              const saldoVal = c.moneda==='BS'?saldo.bs:saldo.usd;
              const saldoTotal = (c.saldoInicial||0) + saldoVal;
              return (
                <div key={c.id} className={`rounded-2xl border-2 p-5 transition-all ${c.activo!==false?'bg-white border-emerald-100 shadow-sm hover:shadow-md':'bg-slate-50 border-slate-200 opacity-60'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:c.moneda==='BS'?'#10b981':'#3b82f6'}}>
                        <PiggyBank size={18} className="text-white"/>
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-900">{c.nombre}</p>
                        {c.descripcion&&<p className="text-[10px] text-slate-400">{c.descripcion}</p>}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${c.moneda==='BS'?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700'}`}>{monedaLabel}</span>
                  </div>
                  <div className="mb-3">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Saldo Actual</p>
                    <p className={`text-2xl font-black ${saldoTotal>=0?'text-emerald-600':'text-red-500'}`}>
                      {c.moneda==='BS'?'Bs.':'$'} {bancoFmt(Math.abs(saldoTotal))}
                    </p>
                    <p className="text-[9px] text-slate-400">Inicial: {c.moneda==='BS'?'Bs.':'$'} {bancoFmt(c.saldoInicial||0)}{c.mesSaldoInicial?` · ${new Date(c.mesSaldoInicial+'-01T00:00').toLocaleString('es-VE',{month:'long',year:'numeric'})}`:''}</p>
                  </div>
                  {c.cuentaContableCod&&(
                    <div className="bg-blue-50 rounded-lg px-2 py-1 mb-3">
                      <p className="text-[9px] font-black text-blue-700">{c.cuentaContableCod} · {c.cuentaContableNom}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button onClick={()=>openEdit(c)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 text-[9px] font-black text-slate-600 hover:bg-slate-50 transition-all">
                      <Edit3 size={11}/> Editar
                    </button>
                    <button onClick={()=>toggleActivo(c)} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[9px] font-black transition-all ${c.activo!==false?'border-red-200 text-red-500 hover:bg-red-50':'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                      {c.activo!==false?<><EyeOff size={11}/> Inactivar</>:<><Eye size={11}/> Activar</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabla resumen */}
        {cajas.length>0&&(
          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b-2 border-slate-100">
              <h3 className="font-black text-sm uppercase text-slate-700 flex items-center gap-2"><PiggyBank size={15} className="text-emerald-500"/> Resumen de Cajas</h3>
            </div>
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50 border-b-2 border-slate-100">
                <tr className="font-black text-slate-400 uppercase">
                  <th className="py-3 px-5 text-left">Caja</th>
                  <th className="py-3 px-4 text-center">Moneda</th>
                  <th className="py-3 px-4 text-right">Saldo Inicial</th>
                  <th className="py-3 px-4 text-right">Movimientos</th>
                  <th className="py-3 px-4 text-right">Saldo Actual</th>
                  <th className="py-3 px-4 text-left">Cuenta PUC</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {cajas.map(c=>{
                  const saldo=getSaldoCaja(c.id);
                  const saldoMov=c.moneda==='BS'?saldo.bs:saldo.usd;
                  const saldoTotal=(c.saldoInicial||0)+saldoMov;
                  return (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-5 font-black text-slate-800">{c.nombre}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${c.moneda==='BS'?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700'}`}>{c.moneda==='BS'?'Bs':'USD'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-600">{c.moneda==='BS'?'Bs.':'$'}{bancoFmt(c.saldoInicial||0)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-600">{saldoMov>=0?'+':''}{c.moneda==='BS'?'Bs.':'$'}{bancoFmt(saldoMov)}</td>
                      <td className="py-3 px-4 text-right font-black">
                        <span className={saldoTotal>=0?'text-emerald-600':'text-red-500'}>{c.moneda==='BS'?'Bs.':'$'}{bancoFmt(Math.abs(saldoTotal))}</span>
                      </td>
                      <td className="py-3 px-4 text-[9px] text-blue-700 font-bold">{c.cuentaContableCod?`${c.cuentaContableCod} · ${c.cuentaContableNom}`:'—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${c.activo!==false?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-400'}`}>{c.activo!==false?'Activa':'Inactiva'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Nueva/Editar Caja */}
        {modal&&(
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.55)'}}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b-2 border-slate-100" style={{background:'#0f172a'}}>
                <div>
                  <h3 className="font-black text-white uppercase tracking-wide text-sm">{editando?'Editar Caja':'Nueva Cuenta de Caja'}</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">Complete los datos de la caja de efectivo</p>
                </div>
                <button onClick={()=>setModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
              </div>
              <div className="p-6 space-y-4">
                {/* Moneda */}
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-2">Moneda de la Caja</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{id:'BS',label:'Bolívares (Bs)',color:'#10b981'},{id:'USD',label:'Dólares (USD)',color:'#3b82f6'}].map(m=>(
                      <button key={m.id} onClick={()=>setForm({...form,moneda:m.id})}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${form.moneda===m.id?'border-current bg-opacity-10':'border-slate-200'}`}
                        style={{borderColor:form.moneda===m.id?m.color:'',background:form.moneda===m.id?m.color+'15':''}}>
                        <p className="font-black text-xs" style={{color:form.moneda===m.id?m.color:'#64748b'}}>{m.id}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{m.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Nombre */}
                <BFG label="Nombre de la Caja">
                  <input className={inp} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej: CAJA PRINCIPAL, CAJA MARACAIBO"/>
                </BFG>
                {/* Descripción */}
                <BFG label="Descripción (opcional)">
                  <input className={inp} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} placeholder="Ej: Efectivo zona industrial"/>
                </BFG>
                {/* Saldo inicial */}
                <BFG label={`Saldo Inicial (${form.moneda==='BS'?'Bs':'USD'})`}>
                  <input type="number" step="0.01" className={inp} value={form.saldoInicial} onChange={e=>setForm({...form,saldoInicial:e.target.value})}/>
                </BFG>
                <BFG label="Mes al que corresponde el Saldo Inicial">
                  <input type="month" className={inp} value={form.mesSaldoInicial} onChange={e=>setForm({...form,mesSaldoInicial:e.target.value})}/>
                </BFG>
                {/* Cuenta Contable PUC */}
                <BFG label="Cuenta Contable Asociada (PUC)">
                  <select className={sel} value={form.cuentaContableCod} onChange={e=>{const c=contCuentas.find(x=>x.codigo===e.target.value);setForm({...form,cuentaContableCod:e.target.value,cuentaContableNom:c?.nombre||''})}}>
                    <option value="">— Sin vincular al PUC —</option>
                    {[...contCuentas].filter(c=>String(c.codigo).startsWith('1')).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))).map(c=><option key={c.id} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
                  </select>
                  {form.cuentaContableCod&&<p className="text-[10px] text-blue-600 font-black mt-1">✓ {form.cuentaContableCod} · {form.cuentaContableNom}</p>}
                </BFG>
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button onClick={()=>setModal(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-black text-xs uppercase text-slate-500 hover:bg-slate-50">Cancelar</button>
                <button onClick={save} disabled={busy} className="flex-1 py-3 rounded-xl font-black text-xs uppercase text-white transition-all hover:opacity-90 disabled:opacity-50" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                  {busy?'Guardando...':editando?'Actualizar Caja':'Registrar Caja'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // CUENTAS POR PAGAR RELACIONADAS — Terceros (alquileres, servicios, etc.)
  // ══════════════════════════════════════════════════════════════════════
  const saldoTercero = (t) => {
    const movs = pagosRel.filter(p=>p.terceroId===t.id);
    const efecto = movs.reduce((s,p)=>s+(p.tipo==='Ingreso'?Number(p.monto||0):-Number(p.monto||0)),0);
    return Number(t.saldoInicial||0) + efecto;
  };

  const TercerosRelacionadosView = () => {
    const [modal, setModal]   = useState(false);
    const [editando, setEdit] = useState(null);
    const [busy, setBusy]     = useState(false);
    const [busqCta, setBusqCta] = useState('');
    const initF = ()=>({nombre:'',cedulaRif:'',telefono:'',cuentaContableId:'',cuentaContableCod:'',cuentaContableNom:'',saldoInicial:'0'});
    const [form, setForm] = useState(initF());

    const openNew  = ()=>{ setEdit(null); setForm(initF()); setBusqCta(''); setModal(true); };
    const openEdit = t  =>{ setEdit(t); setForm({nombre:t.nombre||'',cedulaRif:t.cedulaRif||'',telefono:t.telefono||'',cuentaContableId:t.cuentaContableId||'',cuentaContableCod:t.cuentaContableCod||'',cuentaContableNom:t.cuentaContableNom||'',saldoInicial:String(t.saldoInicial||0)}); setBusqCta(''); setModal(true); };

    const save = async()=>{
      if(!form.nombre.trim()) return alert('El nombre o razón social es requerido');
      if(!form.cedulaRif.trim()) return alert('La cédula o RIF es requerida');
      setBusy(true);
      try {
        const data = {nombre:form.nombre.trim(),cedulaRif:form.cedulaRif.trim().toUpperCase(),telefono:form.telefono.trim(),cuentaContableId:form.cuentaContableId,cuentaContableCod:form.cuentaContableCod,cuentaContableNom:form.cuentaContableNom,saldoInicial:Number(form.saldoInicial)||0,activo:true};
        if(editando){ await updateDoc(getDocRef('cxp_terceros_relacionados',editando.id),data); }
        else { const id=bancoGid(); await setDoc(getDocRef('cxp_terceros_relacionados',id),{...data,id,ts:serverTimestamp()}); }
        setModal(false); setEdit(null); setForm(initF());
      } catch(e){ alert('Error: '+e.message); } finally { setBusy(false); }
    };

    const ctasFiltradas=(contCuentas||[]).filter(c=>!busqCta||(c.codigo+' '+c.nombre).toUpperCase().includes(busqCta.toUpperCase())).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo)));

    const [filtro,setFiltro]=useState('');
    const tercerosFiltrados=tercerosRel.filter(t=>!filtro||((t.nombre||'')+' '+(t.cedulaRif||'')).toUpperCase().includes(filtro.toUpperCase()));
    const totalGeneral=tercerosFiltrados.reduce((s,t)=>s+saldoTercero(t),0);

    const filasHtml=()=>tercerosFiltrados.map((t,i)=>{
      const saldo=saldoTercero(t);
      return `<tr><td>${i+1}</td><td>${t.nombre}</td><td>${t.cedulaRif}</td><td>${t.telefono||'—'}</td><td>${t.cuentaContableCod?t.cuentaContableCod+' · '+t.cuentaContableNom:'—'}</td><td style="text-align:right">$${bancoFmt(t.saldoInicial||0)}</td><td style="text-align:right;font-weight:bold;color:${saldo>0?'#dc2626':'#16a34a'}">$${bancoFmt(saldo)}</td></tr>`;
    }).join('');

    const exportarPDF=()=>{
      const html=bancoLetterheadOpen('Terceros — Cuentas por Pagar Relacionadas',`Corte: ${getTodayDate()} · ${tercerosFiltrados.length} terceros · Total: $${bancoFmt(totalGeneral)}`)+
        `<table><thead><tr><th>#</th><th>Nombre / Razón Social</th><th>Cédula/RIF</th><th>Teléfono</th><th>Cuenta Contable</th><th>Saldo Inicial</th><th>Saldo Actual</th></tr></thead><tbody>${filasHtml()}</tbody>
        <tfoot><tr style="background:#000"><td colspan="6" style="color:#94a3b8;font-weight:bold;font-size:9px">TOTAL PENDIENTE</td><td style="text-align:right;color:#f97316;font-weight:bold">$${bancoFmt(totalGeneral)}</td></tr></tfoot></table>`+
        bancoLetterheadClose(`Cuentas por Pagar Relacionadas · ${bancoDd(getTodayDate())}`);
      bancoPrintWindow(html);
    };
    const exportarExcel=()=>{
      const html=bancoLetterheadOpen('Terceros — Cuentas por Pagar Relacionadas',`Corte: ${getTodayDate()} · ${tercerosFiltrados.length} terceros`)+
        `<table><thead><tr><th>#</th><th>Nombre / Razón Social</th><th>Cédula/RIF</th><th>Teléfono</th><th>Cuenta Contable</th><th>Saldo Inicial</th><th>Saldo Actual</th></tr></thead><tbody>${filasHtml()}</tbody></table>`+
        bancoLetterheadClose();
      const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=url;a.download=`terceros_relacionados_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(url);
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black uppercase text-slate-900">Terceros — Cuentas por Pagar Relacionadas</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Alquileres, servicios y otros compromisos recurrentes fuera de Procura</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase text-white shadow-lg transition-all hover:opacity-90" style={{background:'linear-gradient(135deg,#f97316,#c2410c)'}}>
            <Plus size={14}/> Nuevo Tercero
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar por Nombre o Razón Social / Cédula o RIF..." className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:border-orange-400"/>
          </div>
          <button onClick={exportarPDF} className="flex items-center gap-1.5 px-3 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-700"><FileText size={13}/> PDF</button>
          <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><Download size={13}/> Excel</button>
        </div>

        {tercerosFiltrados.length===0 ? (
          <BEmptyState icon={Users} title="Sin terceros registrados" desc="Cree un tercero para llevar su cuenta por pagar relacionada"/>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50"><tr>
                <BTh>Nombre / Razón Social</BTh><BTh>Cédula/RIF</BTh><BTh>Teléfono</BTh><BTh>Cuenta Contable</BTh><BTh right>Saldo Inicial</BTh><BTh right>Saldo Actual</BTh><BTh></BTh>
              </tr></thead>
              <tbody>
                {tercerosFiltrados.map(t=>{
                  const saldo=saldoTercero(t);
                  return (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <BTd><span className="font-black">{t.nombre}</span></BTd>
                      <BTd mono>{t.cedulaRif}</BTd>
                      <BTd>{t.telefono||'—'}</BTd>
                      <BTd>{t.cuentaContableCod?`${t.cuentaContableCod} · ${t.cuentaContableNom}`:'—'}</BTd>
                      <BTd right mono>${bancoFmt(t.saldoInicial||0)}</BTd>
                      <BTd right><span className={`font-mono font-black ${saldo>0?'text-red-600':'text-emerald-600'}`}>${bancoFmt(saldo)}</span></BTd>
                      <BTd><button onClick={()=>openEdit(t)} className="text-slate-300 hover:text-orange-500"><Edit3 size={14}/></button></BTd>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={5} className="px-3 py-2.5 text-[9px] font-black uppercase text-slate-500 text-right">Total Pendiente</td>
                <td className="px-3 py-2.5 text-right font-mono font-black text-orange-600">${bancoFmt(totalGeneral)}</td>
                <td></td>
              </tr></tfoot>
            </table>
          </div>
        )}

        {modal&&(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setModal(false)}>
            <div className="bg-white rounded-2xl max-w-lg w-full" onClick={e=>e.stopPropagation()}>
              <div className="px-5 py-4 flex items-center justify-between" style={{background:'#0f172a'}}>
                <p className="text-white font-black text-sm uppercase">{editando?'Editar Tercero':'Nuevo Tercero'}</p>
                <button onClick={()=>setModal(false)} className="text-slate-400 hover:text-white"><X size={18}/></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Nombre o Razón Social</label>
                  <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-400" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej: Inversiones El Local, C.A."/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cédula o RIF</label>
                    <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-400" value={form.cedulaRif} onChange={e=>setForm({...form,cedulaRif:e.target.value})} placeholder="J-12345678-9"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Teléfono</label>
                    <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-400" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} placeholder="0414-1234567"/>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cuenta Contable</label>
                  {form.cuentaContableId?(
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border-2 border-slate-200">
                      <span className="text-xs font-bold">{form.cuentaContableCod} · {form.cuentaContableNom}</span>
                      <button onClick={()=>setForm({...form,cuentaContableId:'',cuentaContableCod:'',cuentaContableNom:''})} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                    </div>
                  ):(
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input value={busqCta} onChange={e=>setBusqCta(e.target.value)} placeholder="Buscar cuenta por código o nombre..." className="w-full border-2 border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-orange-400 mb-1.5"/>
                      {busqCta&&(
                        <div className="max-h-36 overflow-y-auto border-2 border-slate-200 rounded-xl">
                          {ctasFiltradas.slice(0,40).map(c=>(
                            <div key={c.id} onClick={()=>{setForm({...form,cuentaContableId:c.id,cuentaContableCod:String(c.codigo),cuentaContableNom:c.nombre});setBusqCta('');}} className="px-3 py-1.5 text-[11px] hover:bg-orange-50 cursor-pointer border-b border-slate-100 last:border-0">
                              {c.codigo} · {c.nombre}
                            </div>
                          ))}
                          {ctasFiltradas.length===0&&<div className="px-3 py-2 text-[11px] text-slate-400">Sin resultados</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Saldo Inicial (USD)</label>
                  <input type="number" step="0.01" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-400" value={form.saldoInicial} onChange={e=>setForm({...form,saldoInicial:e.target.value})}/>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
                <button onClick={()=>setModal(false)} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200">Cancelar</button>
                <button onClick={save} disabled={busy} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase text-white disabled:opacity-50" style={{background:'#f97316'}}>{busy?'Guardando...':'Guardar'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const CxPRelacionadasView = () => {
    const [filtro,setFiltro]=useState('');
    const [abiertos,setAbiertos]=useState({});
    const filtrados=tercerosRel.filter(t=>!filtro||((t.nombre||'')+' '+(t.cedulaRif||'')).toUpperCase().includes(filtro.toUpperCase()))
      .sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
    const total = filtrados.reduce((s,t)=>s+Math.max(0,saldoTercero(t)),0);
    const toggle=(id)=>setAbiertos(p=>({...p,[id]:!p[id]}));
    const filasHtml=()=>filtrados.map((t,i)=>{
      const saldo=saldoTercero(t);
      return `<tr><td>${i+1}</td><td>${t.nombre}</td><td>${t.cedulaRif}</td><td>${t.cuentaContableCod?t.cuentaContableCod+' · '+t.cuentaContableNom:'—'}</td><td style="text-align:right;font-weight:bold;color:${saldo>0?'#dc2626':'#16a34a'}">$${bancoFmt(saldo)}</td></tr>`;
    }).join('');
    const exportarPDF=()=>{
      const html=bancoLetterheadOpen('Cuentas por Pagar Relacionadas',`Corte: ${getTodayDate()} · ${filtrados.length} terceros · Pendiente: $${bancoFmt(total)}`)+
        `<table><thead><tr><th>#</th><th>Nombre / Razón Social</th><th>Cédula/RIF</th><th>Cuenta Contable</th><th>Saldo Pendiente</th></tr></thead><tbody>${filasHtml()}</tbody>
        <tfoot><tr style="background:#000"><td colspan="4" style="color:#94a3b8;font-weight:bold;font-size:9px">TOTAL PENDIENTE</td><td style="text-align:right;color:#f97316;font-weight:bold">$${bancoFmt(total)}</td></tr></tfoot></table>`+
        bancoLetterheadClose(`Cuentas por Pagar Relacionadas · ${bancoDd(getTodayDate())}`);
      bancoPrintWindow(html);
    };
    const exportarExcel=()=>{
      const html=bancoLetterheadOpen('Cuentas por Pagar Relacionadas',`Corte: ${getTodayDate()} · ${filtrados.length} terceros`)+
        `<table><thead><tr><th>#</th><th>Nombre / Razón Social</th><th>Cédula/RIF</th><th>Cuenta Contable</th><th>Saldo Pendiente</th></tr></thead><tbody>${filasHtml()}</tbody></table>`+
        bancoLetterheadClose();
      const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=url;a.download=`cuentas_por_pagar_relacionadas_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(url);
    };
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-black uppercase text-slate-900">Cuentas por Pagar Relacionadas</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Saldo pendiente actual por tercero — orden alfabético</p>
        </div>
        <div className="bg-slate-900 rounded-2xl p-5 mb-6 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Pendiente</span>
          <span className="text-2xl font-black text-white font-mono">${bancoFmt(total)}</span>
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar por Nombre o Razón Social / Cédula o RIF..." className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:border-orange-400"/>
          </div>
          <button onClick={exportarPDF} className="flex items-center gap-1.5 px-3 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-700"><FileText size={13}/> PDF</button>
          <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><Download size={13}/> Excel</button>
        </div>
        {filtrados.length===0?(
          <BEmptyState icon={FileText} title="Sin terceros registrados" desc="Registre terceros en el submódulo Terceros"/>
        ):(
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {filtrados.map(t=>{
              const saldo=saldoTercero(t);
              const movs=[...pagosRel].filter(p=>p.terceroId===t.id).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
              const abierto=!!abiertos[t.id];
              const estado = saldo<=0.009 ? {label:'AL DÍA', cls:'bg-emerald-100 text-emerald-700'} : {label:'PENDIENTE', cls:'bg-orange-100 text-orange-700'};
              let corrido=Number(t.saldoInicial||0);
              return (
                <div key={t.id}>
                  <button onClick={()=>toggle(t.id)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-100 text-orange-600 font-black text-xs">{(t.nombre||'?').charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-slate-900 truncate">{t.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{t.cedulaRif} · {movs.length} mov.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className={`font-mono font-black text-sm ${saldo>0.009?'text-red-600':'text-emerald-600'}`}>${bancoFmt(saldo)}</span>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${estado.cls}`}>{estado.label}</span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${abierto?'rotate-180':''}`}/>
                    </div>
                  </button>
                  {abierto&&(
                    <div className="bg-slate-50 px-5 py-3">
                      <table className="w-full text-[11px]">
                        <thead><tr className="text-slate-400 uppercase text-[9px] font-black">
                          <td className="py-1">Fecha</td><td className="py-1">Concepto</td><td className="py-1">Tipo</td><td className="py-1 text-right">Monto</td><td className="py-1 text-right">Saldo</td>
                        </tr></thead>
                        <tbody>
                          <tr className="text-slate-500"><td className="py-1">—</td><td className="py-1 font-bold">Saldo Inicial</td><td/><td className="py-1 text-right">—</td><td className="py-1 text-right font-bold">${bancoFmt(corrido)}</td></tr>
                          {movs.map((p,i)=>{ corrido += (p.tipo==='Ingreso'?Number(p.monto||0):-Number(p.monto||0)); return (
                            <tr key={i} className="border-t border-slate-200">
                              <td className="py-1">{bancoDd(p.fecha)}</td><td className="py-1">{p.concepto}{p.referencia?` · ${p.referencia}`:''}</td>
                              <td className="py-1"><span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${p.tipo==='Ingreso'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{p.tipo}</span></td>
                              <td className={`py-1 text-right font-mono ${p.tipo==='Ingreso'?'text-emerald-600':'text-red-500'}`}>{p.tipo==='Ingreso'?'+':'-'}${bancoFmt(p.monto||0)}</td>
                              <td className="py-1 text-right font-mono font-bold">${bancoFmt(corrido)}</td>
                            </tr>
                          );})}
                          {movs.length===0&&<tr><td colSpan={5} className="py-2 text-center text-slate-400">Sin movimientos registrados aún</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const HistorialPagoRelacionadosView = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-black uppercase text-slate-900">Historial de Pago — Terceros Relacionados</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Pagos registrados a terceros relacionados</p>
      </div>
      {pagosRel.length===0?(
        <BEmptyState icon={Clock} title="Sin movimientos registrados" desc="Los movimientos de un tercero relacionado aparecerán aquí"/>
      ):(
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50"><tr><BTh>Fecha</BTh><BTh>Tercero</BTh><BTh>Concepto</BTh><BTh>Tipo</BTh><BTh right>Monto USD</BTh></tr></thead>
            <tbody>
              {[...pagosRel].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map((p,i)=>{
                const t=tercerosRel.find(x=>x.id===p.terceroId);
                return (<tr key={i} className="border-t border-slate-100">
                  <BTd>{bancoDd(p.fecha)}</BTd><BTd>{t?.nombre||p.terceroNombre||'—'}</BTd><BTd>{p.concepto||'—'}{p.referencia?` · ${p.referencia}`:''}</BTd>
                  <BTd><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${p.tipo==='Ingreso'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{p.tipo||'Egreso'}</span></BTd>
                  <BTd right mono className={p.tipo==='Ingreso'?'text-emerald-600':'text-red-500'}>{p.tipo==='Ingreso'?'+':'-'}${bancoFmt(p.monto||0)}</BTd>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const EstadoCuentaRelacionadosView = () => {
    const [filtro,setFiltro] = useState('');
    const [desde,setDesde] = useState('');
    const [hasta,setHasta] = useState('');
    const [abiertos,setAbiertos] = useState({});
    const [modalTercero, setModalTercero] = useState(null);
    const [busy, setBusy] = useState(false);
    const initMov = ()=>({tipo:'Egreso',monto:'',concepto:'',referencia:'',fecha:getTodayDate()});
    const [movForm, setMovForm] = useState(initMov());

    const toggle=(id)=>setAbiertos(p=>({...p,[id]:!p[id]}));
    const openModal = (t)=>{ setModalTercero(t); setMovForm(initMov()); };
    const guardarMov = async()=>{
      if(!movForm.monto||Number(movForm.monto)<=0) return alert('Ingrese un monto válido');
      if(!movForm.concepto.trim()) return alert('Ingrese el concepto');
      setBusy(true);
      try{
        const id=bancoGid();
        await setDoc(getDocRef('cxp_pagos_relacionados',id),{id,terceroId:modalTercero.id,terceroNombre:modalTercero.nombre,tipo:movForm.tipo,monto:Number(movForm.monto),concepto:movForm.concepto.trim(),referencia:movForm.referencia.trim(),fecha:movForm.fecha,ts:serverTimestamp()});
        setModalTercero(null);
      }catch(e){ alert('Error: '+e.message); } finally{ setBusy(false); }
    };

    const filtrados = tercerosRel.filter(t=>!filtro||((t.nombre||'')+' '+(t.cedulaRif||'')).toUpperCase().includes(filtro.toUpperCase()))
      .sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
    const movsDe = (tid)=>[...pagosRel].filter(p=>p.terceroId===tid&&(!desde||p.fecha>=desde)&&(!hasta||p.fecha<=hasta)).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
    const totalGeneral = filtrados.reduce((s,t)=>s+saldoTercero(t),0);
    const totalMovs = filtrados.reduce((s,t)=>s+movsDe(t.id).length,0);

    const filasHtml=()=>filtrados.map(t=>{
      let c=Number(t.saldoInicial||0);
      const movs=movsDe(t.id);
      const detalle=movs.map(p=>{ c+=(p.tipo==='Ingreso'?Number(p.monto||0):-Number(p.monto||0));
        return `<tr><td></td><td>${bancoDd(p.fecha)}</td><td>${p.concepto||''}${p.referencia?' · '+p.referencia:''}</td><td>${p.tipo}</td><td style="text-align:right">${p.tipo==='Ingreso'?'+':'-'}$${bancoFmt(p.monto||0)}</td><td style="text-align:right">$${bancoFmt(c)}</td></tr>`;
      }).join('');
      const saldo=saldoTercero(t);
      return `<tr style="background:#0f172a;color:#fff"><td colspan="3"><strong>${t.nombre}</strong> · ${t.cedulaRif}</td><td></td><td></td><td style="text-align:right;color:#f97316;font-weight:bold">$${bancoFmt(saldo)}</td></tr>${detalle}`;
    }).join('');
    const exportarPDF=()=>{
      const html=bancoLetterheadOpen('Estado de Cuenta — Terceros Relacionados',`Corte: ${getTodayDate()} · ${filtrados.length} terceros · ${totalMovs} movimientos · Saldo total: $${bancoFmt(totalGeneral)}`)+
        `<table><thead><tr><th></th><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Monto</th><th>Saldo</th></tr></thead><tbody>${filasHtml()}</tbody></table>`+
        bancoLetterheadClose(`Estado de Cuenta Relacionado · ${bancoDd(getTodayDate())}`);
      bancoPrintWindow(html);
    };
    const exportarExcel=()=>{
      const html=bancoLetterheadOpen('Estado de Cuenta — Terceros Relacionados',`Corte: ${getTodayDate()}`)+
        `<table><thead><tr><th></th><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Monto</th><th>Saldo</th></tr></thead><tbody>${filasHtml()}</tbody></table>`+
        bancoLetterheadClose();
      const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=url;a.download=`estado_cuenta_relacionados_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(url);
    };

    return (
      <div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-black uppercase text-slate-900 flex items-center gap-2"><BarChart3 size={18} className="text-orange-500"/> Estado de Cuenta — Terceros Relacionados</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{filtrados.length} terceros · {totalMovs} movimientos · Saldo total: <span className={`font-black ${totalGeneral>0?'text-red-600':'text-emerald-600'}`}>${bancoFmt(totalGeneral)}</span></p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar tercero..." className="border-2 border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-orange-400 w-40"/>
              </div>
              <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} className="border-2 border-slate-200 rounded-xl px-2 py-2 text-xs outline-none focus:border-orange-400"/>
              <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} className="border-2 border-slate-200 rounded-xl px-2 py-2 text-xs outline-none focus:border-orange-400"/>
              <button onClick={exportarPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-700"><FileText size={13}/> PDF</button>
              <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><Download size={13}/> Excel</button>
            </div>
          </div>
        </div>

        {filtrados.length===0?(
          <BEmptyState icon={Users} title="Sin terceros registrados" desc="Registre terceros en el submódulo Terceros"/>
        ):(
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {filtrados.map(t=>{
              const saldo=saldoTercero(t);
              const movs=movsDe(t.id);
              const abierto=!!abiertos[t.id];
              let corrido=Number(t.saldoInicial||0);
              return (
                <div key={t.id}>
                  <div className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <button onClick={()=>toggle(t.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-100 text-orange-600 font-black text-xs">{(t.nombre||'?').charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-slate-900 truncate">{t.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{t.cedulaRif} · {movs.length} doc(s)</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase text-slate-400">Saldo</p>
                        <p className={`font-mono font-black text-sm ${saldo>0.009?'text-red-600':'text-emerald-600'}`}>${bancoFmt(saldo)}</p>
                      </div>
                      <button onClick={()=>openModal(t)} className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100" title="Registrar Movimiento"><Plus size={14}/></button>
                      <button onClick={()=>toggle(t.id)}><ChevronDown size={16} className={`text-slate-400 transition-transform ${abierto?'rotate-180':''}`}/></button>
                    </div>
                  </div>
                  {abierto&&(
                    <div className="bg-slate-50 px-5 py-3">
                      <table className="w-full text-[11px]">
                        <thead><tr className="text-slate-400 uppercase text-[9px] font-black">
                          <td className="py-1">Fecha</td><td className="py-1">Concepto</td><td className="py-1">Tipo</td><td className="py-1 text-right">Monto</td><td className="py-1 text-right">Saldo</td>
                        </tr></thead>
                        <tbody>
                          <tr className="text-slate-500"><td className="py-1">—</td><td className="py-1 font-bold">Saldo Inicial</td><td/><td className="py-1 text-right">—</td><td className="py-1 text-right font-bold">${bancoFmt(corrido)}</td></tr>
                          {movs.map((p,i)=>{ corrido += (p.tipo==='Ingreso'?Number(p.monto||0):-Number(p.monto||0)); return (
                            <tr key={i} className="border-t border-slate-200">
                              <td className="py-1">{bancoDd(p.fecha)}</td><td className="py-1">{p.concepto}{p.referencia?` · ${p.referencia}`:''}</td>
                              <td className="py-1"><span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${p.tipo==='Ingreso'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{p.tipo}</span></td>
                              <td className={`py-1 text-right font-mono ${p.tipo==='Ingreso'?'text-emerald-600':'text-red-500'}`}>{p.tipo==='Ingreso'?'+':'-'}${bancoFmt(p.monto||0)}</td>
                              <td className="py-1 text-right font-mono font-bold">${bancoFmt(corrido)}</td>
                            </tr>
                          );})}
                          {movs.length===0&&<tr><td colSpan={5} className="py-2 text-center text-slate-400">Sin movimientos en el rango seleccionado</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {modalTercero&&(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setModalTercero(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full" onClick={e=>e.stopPropagation()}>
              <div className="px-5 py-4 flex items-center justify-between" style={{background:'#0f172a'}}>
                <p className="text-white font-black text-sm uppercase">Registrar Movimiento — {modalTercero.nombre}</p>
                <button onClick={()=>setModalTercero(null)} className="text-slate-400 hover:text-white"><X size={18}/></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Tipo</label>
                  <div className="flex gap-2">
                    <button onClick={()=>setMovForm({...movForm,tipo:'Ingreso'})} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${movForm.tipo==='Ingreso'?'bg-emerald-500 text-white border-emerald-500':'bg-white text-slate-500 border-slate-200'}`}>Ingreso (nos presta)</button>
                    <button onClick={()=>setMovForm({...movForm,tipo:'Egreso'})} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${movForm.tipo==='Egreso'?'bg-red-500 text-white border-red-500':'bg-white text-slate-500 border-slate-200'}`}>Egreso (le pagamos)</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Monto (USD)</label>
                    <input type="number" step="0.01" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-400" value={movForm.monto} onChange={e=>setMovForm({...movForm,monto:e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Fecha</label>
                    <input type="date" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-400" value={movForm.fecha} onChange={e=>setMovForm({...movForm,fecha:e.target.value})}/>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Concepto</label>
                  <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-400" value={movForm.concepto} onChange={e=>setMovForm({...movForm,concepto:e.target.value})} placeholder="Ej: Abono a préstamo / Nuevo préstamo recibido"/>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Referencia</label>
                  <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-400" value={movForm.referencia} onChange={e=>setMovForm({...movForm,referencia:e.target.value})} placeholder="Opcional"/>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
                <button onClick={()=>setModalTercero(null)} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200">Cancelar</button>
                <button onClick={guardarMov} disabled={busy} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase text-white disabled:opacity-50" style={{background:'#f97316'}}>{busy?'Guardando...':'Guardar'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // 4. CAJA — OPERACIONES DE EFECTIVO

  // ══════════════════════════════════════════════════════════════════════
  // Mismo problema y misma solución que en MovimientosView (ver comentario ahí arriba): sin esto,
  // el modal "Nuevo Movimiento" de Caja también se cerraba solo cada vez que BancoApp re-renderizaba.
  const CajaOpViewImpl = () => {
    try {
    const [modal, setModal] = useState(false);
    useEffect(() => { bdbg('▶ CajaOpViewImpl MONTADO'); return () => bdbg('◀ CajaOpViewImpl DESMONTADO'); }, []);
    const [busy, setBusy]   = useState(false);
    // Filtros
    const [cajFiltMoneda, setCajFiltMoneda] = useState('USD');  // 'BS'|'USD'|'AMBAS'
    const [cajFiltTipo,   setCajFiltTipo]   = useState('');     // ''|'Ingreso'|'Egreso'
    const [cajFiltCaja,   setCajFiltCaja]   = useState('');     // cajaId o ''
    const [cajFiltMes,    setCajFiltMes]    = useState(getTodayDate().substring(0,7));
    const [cajFiltDesde,  setCajFiltDesde]  = useState('');
    const [cajFiltHasta,  setCajFiltHasta]  = useState('');
    const [cajBusqCli,    setCajBusqCli]    = useState('');
    const [cajBusqRef,    setCajBusqRef]    = useState('');
    const [cajBusqMonto,  setCajBusqMonto]  = useState('');
    const [cajaDet, setCajaDet]   = useState(null);   // movimiento seleccionado para ver/editar
    const [cajaEdit, setCajaEdit] = useState(false);   // modo edición
    const [cajaPwdModal, setCajaPwdModal] = useState(null); // movimiento a eliminar
    const [cajaPwd, setCajaPwd]   = useState('');
    const [cajaPwdErr, setCajaPwdErr] = useState(false);
    // ── Formulario de Movimiento — mismo modelo que Banco: cuenta origen (aquí: caja),
    // traslados (a otra caja o a un banco), ND/NC, contrapartidas y vínculo a tercero ──
    const initF = ()=>({fecha:getTodayDate(),tipo:'Ingreso',cuentaId:'',cuentaDestinoId:'',
      monedaOp:'BS',montoOp:'',
      tasaDestino:'',comisionCtaId:'',
      concepto:'',referencia:'',tasa:String(tasaActiva),montoNativo:'',
      aplicaTercero:false,tipoTercero:'Cliente',terceroId:'',
      cerrarCxC:false,facturaId:'',
      cuentaAjusteId:'',
      lineasContra:[{ctaId:'',ctaNom:'',debeBs:'',haberBs:'',debeUSD:'',haberUSD:''}],
    });
    const [form, setForm] = useState(initF());
    const [searchCaja, setSearchCaja]   = useState('');
    const [searchDestino, setSearchDestino] = useState('');
    const [searchTercero, setSearchTercero] = useState('');
    const [busqCtas, setBusqCtas] = useState({});

    // Selector de Caja — mismo patrón visual que el CuentaSelector de Banco; las cajas no
    // tienen sub-categorías (Nacional-Bs, Internacional, etc.), así que el listado es simple.
    const CajaSelector = ({value, onChange, label, excluirId}) => {
      const matchBusca = c => !searchCaja||c.nombre.toUpperCase().includes(searchCaja.toUpperCase());
      const opciones = cajas.filter(c=>c.id!==excluirId&&matchBusca(c));
      return (
        <BFG label={label||'Caja'} full>
          <div className="space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={searchCaja} onChange={e=>setSearchCaja(e.target.value)}
                placeholder="Buscar caja por nombre..." className={`${inp} pl-8`}/>
            </div>
            <select className={`${sel} border-orange-400`} value={value} onChange={e=>{onChange(e.target.value);setSearchCaja('');}}>
              <option value="">— Seleccione la caja —</option>
              {opciones.map(c=>(
                <option key={c.id} value={c.id}>{c.nombre} · {c.moneda==='BS'?'Bs.':'$'}</option>
              ))}
            </select>
          </div>
        </BFG>
      );
    };

    const cuentaSel       = cajas.find(c=>c.id===form.cuentaId);
    const cuentaDestBanco = cuentas.find(c=>c.id===form.cuentaDestinoId);
    const cuentaDestCaja  = cajas.find(c=>c.id===form.cuentaDestinoId);
    const destinoEsCaja   = !cuentaDestBanco && !!cuentaDestCaja;
    // cuentaDest normalizado: mismos campos (banco/moneda/saldo/cuentaContableCod/cuentaContableNom)
    // sin importar si el destino es un banco o una caja — igual que en Banco.
    const cuentaDest = cuentaDestBanco ? cuentaDestBanco : (cuentaDestCaja ? {
      id:cuentaDestCaja.id, banco:cuentaDestCaja.nombre, moneda:cuentaDestCaja.moneda,
      saldo:cuentaDestCaja.saldoInicial, cuentaContableCod:cuentaDestCaja.cuentaContableCod, cuentaContableNom:cuentaDestCaja.cuentaContableNom
    } : null);
    const bs       = cuentaSel?.moneda==='BS';
    const tasa     = Number(form.tasa)||tasaActiva;
    const mNat     = Number(form.montoNativo)||0;
    const montoBs  = bs ? mNat : mNat*tasa;
    const montoUSD = bs ? mNat/tasa : mNat;

    const factPend = form.tipoTercero==='Cliente'
      ? facturas.filter(f=>f.clienteId===form.terceroId&&f.estado==='Pendiente')
      : [];

    const sugerirContra = () => contCuentas.filter(c=>form.tipo==='Ingreso'
      ? (c.nombre?.toUpperCase().includes('COBRAR')||c.nombre?.toUpperCase().includes('INGRES'))
      : (c.nombre?.toUpperCase().includes('PAGAR')||c.nombre?.toUpperCase().includes('GASTO')));
    // Movimientos de caja manuales + movimientos del banco_movimientos (cobros CxC y pagos CxP del ERP)
    // ── Cobros CxC / Pagos CxP registrados a través de cajas (con CAJA::) ──
    // Aplicación.jsx NO crea un caja_movimientos aparte para pagos en efectivo (CAJA::) — solo
    // para banco. Antes se excluía cualquier cobro con grupoCobroId asumiendo que YA tenía su
    // movimiento directo, pero eso solo es cierto si ESE grupoCobroId de verdad aparece en
    // caja_movimientos — si no, el cobro simplemente desaparecía sin haberse contado nunca.
    const movDesdeCobrosCaja = cobrosCajaCxc.filter(c=>!(c.grupoCobroId && movCaja.some(m=>m.grupoCobroId===c.grupoCobroId))).map(c=>{
      const cajaId = (c.cuentaBancariaId||'').replace('CAJA::','');
      const caja   = cajas.find(ca=>ca.id===cajaId);
      const tasa   = Number(c.tasa||tasaActiva)||tasaActiva;
      const mUSD   = Number(c.monto||0);
      // Si montoBs no está guardado, lo calculamos con la tasa registrada
      const mBs    = Number(c.montoBs||0)||(mUSD*tasa);
      return {
        id: c.id, fecha: c.fecha, tipo: 'Ingreso',
        moneda: c.moneda==='BS'?'BS':'USD',
        montoBs: mBs, montoUSD: mUSD, tasa: tasa||tasaActiva,
        concepto: c.concepto||`Cobro ${c.metodo||''} · ${c.neDocumento||''}`,
        referencia: c.referencia||'',
        _concepto: `Cobro ${c.metodo||''} · ${c.neDocumento||''} · ${c.clientName||''}`,
        _facturaInfo: c.neDocumento||'',
        _tercero: c.clientName||'—',
        _cajaId: cajaId,
        _cajaNombre: caja?.nombre||c.cuentaBancoNombre||'Caja',
        _fromBanco: true, origen:'CxC',
        timestamp: c.timestamp||0
      };
    });

    // ── Pagos CxP registrados a través de cajas (procura_pagos_cxp con CAJA::) ──
    // Mismo criterio que arriba: excluir solo si el grupoPagoId de verdad aparece en caja_movimientos.
    const movDesdePagosCaja = pagosCajaCxP.filter(p=>!(p.grupoPagoId && movCaja.some(m=>m.grupoPagoId===p.grupoPagoId))).map(p=>{
      const cajaId = (p.cuentaId||'').replace('CAJA::','');
      const caja   = cajas.find(ca=>ca.id===cajaId);
      const tasa   = Number(p.tasa||tasaActiva)||tasaActiva;
      const mUSD   = Number(p.monto||0);
      const mBs    = Number(p.montoBs||0)||(mUSD*tasa);
      return {
        id: p.id, fecha: p.fecha, tipo: 'Egreso',
        moneda: p.moneda==='BS'?'BS':'USD',
        montoBs: mBs, montoUSD: mUSD, tasa: tasa||tasaActiva,
        concepto: p.concepto||`Pago ${p.proveedor||''} · ${p.referencia||''}`,
        referencia: p.referencia||'',
        _concepto: `Pago ${p.proveedor||''} · ${p.referencia||''}`,
        _facturaInfo: p.facturas?.map(f=>`${f.nroFactura||f.id}`).join(' | ')||'',
        _tercero: p.proveedor||'—',
        _cajaId: cajaId,
        _cajaNombre: caja?.nombre||p.banco||'Caja',
        _fromBanco: true, origen:'CxP',
        timestamp: p.timestamp||0
      };
    });

    // allMovsCajaBase: SOLO movimientos que realmente pasaron por cajas físicas
    // NO incluir movBancoEnCaja (esos son cobros/pagos bancarios, van en módulo Banco)
    const allMovsCajaBase = [
      ...movCaja,           // entradas manuales de caja
      ...movDesdeCobrosCaja, // cobros CxC que fueron a CAJA:: (cobros_cxc)
      ...movDesdePagosCaja,  // pagos CxP que fueron a CAJA:: (procura_pagos_cxp)
    ].sort((a,b)=>(b.ts?.seconds||b.timestamp||0)-(a.ts?.seconds||a.timestamp||0));

    // Saldo actual de una caja = saldoInicial + suma de sus movimientos (misma fórmula que
    // CuentasCajaView.getSaldoCaja, aquí en su propia moneda para mostrar en el panel derecho).
    const getSaldoCajaActual = (cajaId) => {
      const c = cajas.find(x=>x.id===cajaId);
      if(!c) return 0;
      const esBs = m => String(m.moneda||'').toUpperCase()==='BS';
      const movs = allMovsCajaBase.filter(m=>(m._cajaId||m.cajaId||'')===cajaId);
      const sumBs  = movs.filter(esBs).reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoBs||0),0);
      const sumUsd = movs.filter(m=>!esBs(m)).reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoUSD||0),0);
      return Number(c.saldoInicial||0) + (c.moneda==='BS'?sumBs:sumUsd);
    };

    // Aplicar filtros
    const allMovsCaja = allMovsCajaBase.filter(m=>{
      if(cajFiltMoneda==='BS'  && m.moneda!=='BS')  return false;
      if(cajFiltMoneda==='USD' && m.moneda==='BS')  return false;
      if(cajFiltTipo && m.tipo!==cajFiltTipo) return false;
      if(cajFiltCaja){
        const mid = m._cajaId||m.cajaId||'';
        if(mid && mid!==cajFiltCaja) return false;
        if(!mid && m._fromBanco) return false;
      }
      if(cajFiltDesde && (m.fecha||'') < cajFiltDesde) return false;
      if(cajFiltHasta && (m.fecha||'') > cajFiltHasta) return false;
      if(cajBusqCli && !(m._tercero||m.terceroNombre||m.clientName||m.concepto||'').toUpperCase().includes(cajBusqCli.toUpperCase())) return false;
      if(cajBusqRef && !(m.referencia||'').toUpperCase().includes(cajBusqRef.toUpperCase())) return false;
      if(cajBusqMonto){
        const q=Number(String(cajBusqMonto).replace(',','.'));
        if(!isNaN(q) && q>0){
          const mBs=Number(m.montoBs||0), mUsd=Number(m.montoUSD||0);
          if(Math.abs(mBs-q)>0.01 && Math.abs(mUsd-q)>0.01) return false;
        }
      }
      return true;
    });
    // Balance del mes filtrado, respetando la caja filtrada — el saldo inicial de un mes
    // es el saldo inicial de la(s) caja(s) más todo lo acumulado ANTES de ese mes, así que
    // el disponible de un mes queda automáticamente como el inicial del mes siguiente.
    // Cada caja tiene su propio mes de partida (mesSaldoInicial) — si el mes elegido es ANTERIOR
    // a ese mes de partida, esa caja no aporta nada (aún no existía su saldo inicial).
    const cajasEnFiltro = cajFiltCaja ? cajas.filter(c=>c.id===cajFiltCaja) : cajas;
    const primerDiaMes  = `${cajFiltMes}-01`;
    const calcularCaja = (c) => {
      const inicioCaja = `${c.mesSaldoInicial||'2000-01'}-01`;
      const movsCaja = allMovsCajaBase.filter(m=>(m._cajaId||m.cajaId||'')===c.id);
      const acumu=(lo,hi,moneda)=>movsCaja.filter(m=>m.moneda===moneda&&(m.fecha||'')>=lo&&(m.fecha||'')<hi)
        .reduce((s,m)=>s+(m.tipo==='Ingreso'?1:-1)*Number((moneda==='BS'?m.montoBs:m.montoUSD)||0),0);
      if(primerDiaMes<inicioCaja) return {iniBs:0,iniUSD:0,entBs:0,entUSD:0,salBs:0,salUSD:0};
      const antesBs  = acumu(inicioCaja,primerDiaMes,'BS');
      const antesUSD = acumu(inicioCaja,primerDiaMes,'USD');
      const delMes = movsCaja.filter(m=>(m.fecha||'').startsWith(cajFiltMes));
      const entBs = delMes.filter(m=>m.moneda==='BS'&&m.tipo==='Ingreso').reduce((s,m)=>s+Number(m.montoBs||0),0);
      const salBs = delMes.filter(m=>m.moneda==='BS'&&m.tipo==='Egreso').reduce((s,m)=>s+Number(m.montoBs||0),0);
      const entUSD = delMes.filter(m=>m.moneda==='USD'&&m.tipo==='Ingreso').reduce((s,m)=>s+Number(m.montoUSD||0),0);
      const salUSD = delMes.filter(m=>m.moneda==='USD'&&m.tipo==='Egreso').reduce((s,m)=>s+Number(m.montoUSD||0),0);
      return {
        iniBs:(c.moneda==='BS'?Number(c.saldoInicial||0):0)+antesBs,
        iniUSD:(c.moneda!=='BS'?Number(c.saldoInicial||0):0)+antesUSD,
        entBs, entUSD, salBs, salUSD
      };
    };
    const totCaja = cajasEnFiltro.map(calcularCaja).reduce((a,r)=>({
      iniBs:a.iniBs+r.iniBs, iniUSD:a.iniUSD+r.iniUSD, entBs:a.entBs+r.entBs, entUSD:a.entUSD+r.entUSD, salBs:a.salBs+r.salBs, salUSD:a.salUSD+r.salUSD
    }),{iniBs:0,iniUSD:0,entBs:0,entUSD:0,salBs:0,salUSD:0});
    const saldoInicialBs=totCaja.iniBs, saldoInicialUSD=totCaja.iniUSD;
    const entradasBs=totCaja.entBs, entradasUSD=totCaja.entUSD;
    const salidasBs=totCaja.salBs, salidasUSD=totCaja.salUSD;
    const disponibleBs  = saldoInicialBs + entradasBs - salidasBs;
    const disponibleUSD = saldoInicialUSD + entradasUSD - salidasUSD;
    // Se mantienen por compatibilidad con el resto de la vista (saldo global, sin filtro de mes/caja)
    const saldoBs  = movCaja.filter(m=>m.moneda==='BS' ).reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoBs||0),0)
                   + movDesdeCobrosCaja.filter(m=>m.moneda==='BS').reduce((a,m)=>a+Number(m.montoBs||0),0)
                   - movDesdePagosCaja.filter(m=>m.moneda==='BS').reduce((a,m)=>a+Number(m.montoBs||0),0);
    const saldoUSD = movCaja.filter(m=>m.moneda==='USD').reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoUSD||0),0)
                   + movDesdeCobrosCaja.filter(m=>m.moneda==='USD').reduce((a,m)=>a+Number(m.montoUSD||0),0)
                   - movDesdePagosCaja.filter(m=>m.moneda==='USD').reduce((a,m)=>a+Number(m.montoUSD||0),0);



    const save = async()=>{
      if(!form.cuentaId) return alert('Seleccione una caja');
      if(!form.montoNativo||mNat<=0) return alert('Ingrese un monto válido');
      if(!form.concepto) return alert('Ingrese el concepto');
      if(form.tipo==='Traslado de Fondo'&&!form.cuentaDestinoId) return alert('Seleccione la caja o banco destino');
      if(form.tipo==='Traslado de Fondo'&&form.cuentaDestinoId===form.cuentaId) return alert('El destino no puede ser la misma caja de origen');
      if((form.tipo==='Nota de Débito'||form.tipo==='Nota de Crédito')&&!form.cuentaAjusteId) return alert('Seleccione la cuenta contable del ajuste (comisión, diferencial, etc.)');
      if(form.aplicaTercero&&!form.terceroId) return alert('Seleccione el tercero');
      setBusy(true);
      try {
        const caja = cajas.find(c=>c.id===form.cuentaId);
        const id = bancoGid(); const batch = writeBatch(_bancoDB);
        const tercero = form.tipoTercero==='Cliente'?clientes.find(c=>c.id===form.terceroId):provs.find(p=>p.id===form.terceroId);
        const factura = form.cerrarCxC&&form.facturaId?facturas.find(f=>f.id===form.facturaId):null;

        const ctaCajaCod = caja?.cuentaContableCod||'';
        const ctaCajaNom = caja?.cuentaContableNom||`Caja ${caja?.nombre||''}`;

        const yyyymm = form.fecha.substring(0,7).replace('-','');
        const numComp = `CC-${yyyymm}-${String(movCaja.filter(m=>m.fecha?.startsWith(form.fecha.substring(0,7))).length+1).padStart(4,'0')}`;
        const mesLabel = form.fecha.substring(5,7)+'/'+form.fecha.substring(0,4);
        const esMonedaLocal = caja.moneda==='BS';
        const cajaBs = esMonedaLocal?montoBs:montoUSD*tasa;
        const cajaUSD = esMonedaLocal?montoBs/tasa:montoUSD;
        const esIngreso = form.tipo==='Ingreso'||form.tipo==='Nota de Crédito';
        const esTransferencia = form.tipo==='Traslado de Fondo';
        const esNotaAjuste = form.tipo==='Nota de Débito'||form.tipo==='Nota de Crédito';

        let todasLineas=[];
        let comisionUSD=0, comisionBs=0;

        if(esNotaAjuste){
          const ctaAjusteObj = contCuentas.find(c=>c.id===form.cuentaAjusteId)||{};
          const ctaAjusteCod = String(ctaAjusteObj.codigo||'');
          const ctaAjusteNom = ctaAjusteObj.nombre||'Cuenta Ajuste';
          if(form.tipo==='Nota de Débito'){
            todasLineas=[
              {codigo:ctaAjusteCod,cuenta:ctaAjusteNom,tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:cajaBs,haberBs:0,debeUSD:cajaUSD,haberUSD:0},
              {codigo:ctaCajaCod,cuenta:ctaCajaNom,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:0,haberBs:cajaBs,debeUSD:0,haberUSD:cajaUSD},
            ];
          } else {
            todasLineas=[
              {codigo:ctaCajaCod,cuenta:ctaCajaNom,tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:cajaBs,haberBs:0,debeUSD:cajaUSD,haberUSD:0},
              {codigo:ctaAjusteCod,cuenta:ctaAjusteNom,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:0,haberBs:cajaBs,debeUSD:0,haberUSD:cajaUSD},
            ];
          }
        } else if(esTransferencia && cuentaDest){
          // Misma cuenta puente que en Banco: D Traslados de Fondos / H Caja Origen — el destino
          // arma su propio asiento por separado, más abajo, junto a su movimiento.
          const bsOrigen=esMonedaLocal?montoBs:montoUSD*tasa;
          const usdOrigen=esMonedaLocal?montoBs/tasa:montoUSD;
          const ctaDest={cod:(cuentaDest.cuentaContableCod||'').trim(),nom:(cuentaDest.cuentaContableNom||cuentaDest.banco||'').trim()};
          const ctaTrasladosObj=(contCuentas||[]).find(c=>/traslado.*fondo|fondo.*traslado/i.test(c.nombre||''))||(contCuentas||[]).find(c=>String(c.codigo)==='1.1.01.02.012');
          const codTraslados=ctaTrasladosObj?String(ctaTrasladosObj.codigo||ctaTrasladosObj.id||''):'1.1.01.02.012';
          const nomTraslados=ctaTrasladosObj?ctaTrasladosObj.nombre:'Traslados de Fondos';
          if(form.tipo==='Traslado de Fondo'&&(!ctaDest.cod||!ctaCajaCod)){
            alert('Error: la caja o la cuenta destino no tiene cuenta contable asignada. Configúrela en Cuentas de Caja / Cuentas Bancarias.');
            setBusy(false); return;
          }
          // Mismo criterio que en Banco: la comisión de rebancarización solo aplica si origen y
          // destino comparten moneda — si son distintas (ej. Caja Bs → Banco USD), no hay una
          // "tasa destino" separada que comparar, y calcularla igual restaba casi todo el monto.
          const mismaMoneda = caja.moneda === cuentaDest.moneda;
          const tasaDestinoF=Number(form.tasaDestino)||tasa;
          if(mismaMoneda){
            comisionBs=Math.abs(bsOrigen-(usdOrigen*tasaDestinoF));
            comisionUSD=tasa>0?comisionBs/tasa:0;
          }
          // Tope de seguridad (igual que en Banco): una rebancarización real es una diferencia
          // chica — si el cálculo se come más del 10% del monto, se ignora en vez de aplicarla.
          if(bsOrigen>0 && comisionBs > bsOrigen*0.10){
            comisionBs=0; comisionUSD=0;
          }
          if(Math.abs(comisionUSD)>0.005&&!form.comisionCtaId){
            alert('Seleccione la cuenta contable de la rebancarización (la tasa destino es distinta a la de origen, así que hay una diferencia que registrar).');
            setBusy(false); return;
          }
          todasLineas=[
            {codigo:codTraslados,cuenta:nomTraslados,tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:bsOrigen-comisionBs,haberBs:0,debeUSD:usdOrigen-comisionUSD,haberUSD:0},
            {codigo:ctaCajaCod,cuenta:ctaCajaNom,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:0,haberBs:bsOrigen,debeUSD:0,haberUSD:usdOrigen},
          ];
          if(comisionUSD>0.005){
            const ctaCom=contCuentas.find(c=>c.id===form.comisionCtaId)||{};
            todasLineas.push({codigo:ctaCom.codigo||'',cuenta:ctaCom.nombre||'Rebancarización',tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:comisionBs,haberBs:0,debeUSD:comisionUSD,haberUSD:0});
          }
        } else {
          const bancoEnDebe = esIngreso;
          const debitLinea = {
            codigo:ctaCajaCod, cuenta:ctaCajaNom,
            tipoLinea:bancoEnDebe?'D':'H',
            nroDoc:form.referencia||'',concepto:form.concepto,tasa,
            debeBs:bancoEnDebe?cajaBs:0,haberBs:bancoEnDebe?0:cajaBs,
            debeUSD:bancoEnDebe?cajaUSD:0,haberUSD:bancoEnDebe?0:cajaUSD,
          };
          const lineasContraFinal=(form.lineasContra||[]).filter(l=>l.ctaId&&(Number(l.debeBs||0)>0||Number(l.haberBs||0)>0)).map(l=>{
            const ctaInfo=contCuentas.find(c=>c.id===l.ctaId)||{};
            return {codigo:ctaInfo.codigo||'',cuenta:ctaInfo.nombre||l.ctaNom||'',tipoLinea:Number(l.debeBs||0)>0?'D':'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:Number(l.debeBs||0),haberBs:Number(l.haberBs||0),debeUSD:Number(l.debeUSD||0),haberUSD:Number(l.haberUSD||0)};
          });
          todasLineas=[debitLinea,...lineasContraFinal];
        }

        const asientoId=bancoGid();
        batch.set(getDocRef('cont_asientos',asientoId),{
          id:asientoId, comprobante:numComp, numero:numComp, mes:mesLabel, fecha:form.fecha,
          tipo: esTransferencia?'Traslado':(form.tipo==='Ingreso'?'Ingreso':'Egreso'),
          subTipo: form.tipo, nroDocumento:form.referencia||'', descripcion:form.concepto.toUpperCase(),
          tasa, niif:false, efectivo:true, modulo:'Caja', movimientoCajaId:id,
          terceroNombre: tercero?.nombre||'', lineas:todasLineas,
          totalDebeBs: todasLineas.reduce((a,l)=>a+l.debeBs,0), totalHaberBs: todasLineas.reduce((a,l)=>a+l.haberBs,0),
          totalDebeUSD: todasLineas.reduce((a,l)=>a+l.debeUSD,0), totalHaberUSD: todasLineas.reduce((a,l)=>a+l.haberUSD,0),
          ts: serverTimestamp(),
        });

        batch.set(getDocRef('caja_movimientos',id),{
          id, fecha:form.fecha, tipo: esTransferencia?'Egreso':form.tipo, cajaId:caja.id, cajaNombre:caja.nombre, moneda:caja.moneda,
          concepto:form.concepto, referencia:form.referencia,
          tasa, monto:mNat, montoBs, montoUSD,
          aplicaTercero:form.aplicaTercero, tipoTercero:form.tipoTercero,
          terceroId:tercero?.id||'', terceroNombre:tercero?.nombre||'',
          facturaId:factura?.id||'', facturaNumero:factura?.numero||'',
          asientoContableId:asientoId, estatus:'No Conciliado', ts:serverTimestamp()
        });

        if(esTransferencia&&cuentaDest){
          const comisionNativo=esMonedaLocal?comisionBs:comisionUSD;
          const netoNativo=mNat-comisionNativo;
          const netoBs=montoBs-comisionBs;
          const netoUSD=montoUSD-comisionUSD;
          const idDestino=bancoGid();
          const ctaTrasladosDestObj=(contCuentas||[]).find(c=>/traslado.*fondo|fondo.*traslado/i.test(c.nombre||''))||(contCuentas||[]).find(c=>String(c.codigo)==='1.1.01.02.012');
          const codTrasladosDest=ctaTrasladosDestObj?String(ctaTrasladosDestObj.codigo||ctaTrasladosDestObj.id||''):'1.1.01.02.012';
          const nomTrasladosDest=ctaTrasladosDestObj?ctaTrasladosDestObj.nombre:'Traslados de Fondos';
          const asientoDestId=bancoGid();
          const codCtaDestPropia=cuentaDest.cuentaContableCod||'';
          const nomCtaDestPropia=cuentaDest.cuentaContableNom||cuentaDest.banco||'';
          const conceptoDest=`Traslado recibido desde ${caja.nombre} | Ref: ${form.referencia}`;
          batch.set(getDocRef('cont_asientos',asientoDestId),{
            id:asientoDestId, comprobante:`CC-${form.fecha.substring(0,7).replace('-','')}-${idDestino.slice(-4).toUpperCase()}`,
            numero:`CC-${form.fecha.substring(0,7).replace('-','')}-${idDestino.slice(-4).toUpperCase()}`,
            mes:form.fecha.substring(5,7)+'/'+form.fecha.substring(0,4), fecha:form.fecha,
            tipo:'Traslado', subTipo:'Traslado de Fondo', nroDocumento:form.referencia||'',
            descripcion:conceptoDest.toUpperCase(), tasa, niif:false, efectivo:true,
            modulo: destinoEsCaja?'Caja':'Bancos',
            movimientoBancoId: destinoEsCaja?'':idDestino, movimientoCajaId: destinoEsCaja?idDestino:'',
            lineas:[
              {codigo:codCtaDestPropia,cuenta:nomCtaDestPropia,tipoLinea:'D',nroDoc:form.referencia||'',concepto:conceptoDest,tasa,debeBs:netoBs,haberBs:0,debeUSD:netoUSD,haberUSD:0},
              {codigo:codTrasladosDest,cuenta:nomTrasladosDest,tipoLinea:'H',nroDoc:form.referencia||'',concepto:conceptoDest,tasa,debeBs:0,haberBs:netoBs,debeUSD:0,haberUSD:netoUSD},
            ],
            totalDebeBs:netoBs, totalHaberBs:netoBs, totalDebeUSD:netoUSD, totalHaberUSD:netoUSD,
            ts:serverTimestamp(),
          });
          if(destinoEsCaja){
            batch.update(getDocRef('caja_cuentas',cuentaDest.id),{saldoInicial:Number(cuentaDest.saldo)+netoNativo});
            batch.set(getDocRef('caja_movimientos',idDestino),{id:idDestino,fecha:form.fecha,tipo:'Ingreso',cajaId:cuentaDest.id,cajaNombre:cuentaDest.banco,moneda:cuentaDest.moneda,concepto:conceptoDest,referencia:form.referencia,tasa,monto:netoNativo,montoBs:netoBs,montoUSD:netoUSD,asientoContableId:asientoDestId,estatus:'No Conciliado',ts:serverTimestamp()});
          } else {
            batch.update(getDocRef('banco_cuentas',cuentaDest.id),{saldo:Number(cuentaDest.saldo)+netoNativo});
            batch.set(getDocRef('banco_movimientos',idDestino),{id:idDestino,fecha:form.fecha,tipo:'Ingreso',cuentaId:cuentaDest.id,cuentaNombre:cuentaDest.banco,tipoBanco:cuentaDest.tipoBanco,moneda:cuentaDest.moneda,origenIngreso:'Traslado desde Caja',concepto:conceptoDest,referencia:form.referencia,tasa,montoNativo:netoNativo,montoBs:netoBs,montoUSD:netoUSD,saldoAnterior:Number(cuentaDest.saldo),saldoResultante:Number(cuentaDest.saldo)+netoNativo,asientoContableId:asientoDestId,estatus:'No Conciliado',ts:serverTimestamp()});
          }
        }

        if(factura&&form.cerrarCxC){
          const ns=Math.max(0,factura.saldoUSD-montoUSD);
          batch.update(getDocRef('facturacion_facturas',factura.id),{saldoUSD:ns,estado:ns<0.01?'Pagada':'Pendiente'});
        }
        if(form.aplicaTercero&&form.tipoTercero==='Relacionado'&&form.terceroId){
          const idPagoRel=bancoGid();
          batch.set(getDocRef('cxp_pagos_relacionados',idPagoRel),{
            id:idPagoRel,terceroId:form.terceroId,terceroNombre:tercero?.nombre||'',
            fecha:form.fecha,concepto:form.concepto,referencia:form.referencia,
            monto:form.tipo==='Ingreso'?-montoUSD:montoUSD,
            origen:'caja',movimientoId:id,ts:serverTimestamp()
          });
        }

        await batch.commit();
        bdbg('🔒 CIERRE via: CAJA: save() exitoso');setModal(false); setForm(initF()); setBusqCtas({});
      } catch(e){ alert('Error: '+e.message); } finally { setBusy(false); }
    };

    // Panel derecho "Estado Operativo" — equivalente a BancoInfoPanel pero para cajas:
    // el saldo de una caja no es un campo fijo, es saldoInicial + movimientos, por eso
    // se apoya en getSaldoCajaActual en vez de leer un campo .saldo directo.
    const CajaInfoPanel = ({ cajaId }) => {
      const caja = cajas.find(c=>c.id===cajaId);
      if(!caja) return null;
      const bsMon = caja.moneda==='BS';
      const saldoActual = getSaldoCajaActual(cajaId);
      const saldoUSD = bsMon ? saldoActual/tasaActiva : saldoActual;
      const saldoBs  = bsMon ? saldoActual : saldoActual*tasaActiva;
      const movsCta = allMovsCajaBase.filter(m=>(m._cajaId||m.cajaId||'')===cajaId);
      const rows = [
        {l:'Fecha Actual',       vbs:bancoDd(getTodayDate()), vusd:null, mono:false},
        {l:'Saldo Inicial',      vbs:`Bs. ${bancoFmt(Number(caja.saldoInicial||0)*(bsMon?1:tasaActiva))}`, vusd:`$${bancoFmt(bsMon?Number(caja.saldoInicial||0)/tasaActiva:Number(caja.saldoInicial||0))}`, mono:true},
        {l:'Saldo Actual',       vbs:`Bs. ${bancoFmt(saldoBs)}`, vusd:`$${bancoFmt(saldoUSD)}`, mono:true, bold:true, accent:true},
        {l:'Movimientos registrados', vbs:String(movsCta.length), vusd:null, mono:true},
      ];
      return (
        <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-slate-200" style={{background:'#0f172a'}}>
            <PiggyBank size={13} className="text-emerald-400"/>
            <p className="font-black text-xs text-white uppercase tracking-widest flex-1">{caja.nombre}</p>
            <BPill usd={!bsMon}>{caja.moneda}</BPill>
          </div>
          <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 px-4 py-1.5">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Concepto</p>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest text-right">Bs. (Bolívares)</p>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest text-right">USD (Dólares)</p>
          </div>
          <div className="divide-y divide-slate-50">
            {rows.map(({l,vbs,vusd,mono,bold,accent})=>(
              <div key={l} className={`grid grid-cols-3 items-center px-4 py-2 ${accent?'bg-emerald-50':''}`}>
                <p className="text-[10px] text-slate-500 font-medium">{l}</p>
                <p className={`text-right font-${mono?'mono':'medium'} text-[11px] ${bold?'font-black':'font-semibold'} text-slate-700`}>{vbs||'—'}</p>
                <p className={`text-right font-${mono?'mono':'medium'} text-[11px] ${bold?'font-black':'font-semibold'} text-slate-900`}>{vusd||'—'}</p>
              </div>
            ))}
          </div>
          {caja.cuentaContableCod&&(
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
              <p className="text-[9px] font-black text-blue-700">{caja.cuentaContableCod} · {caja.cuentaContableNom}</p>
            </div>
          )}
        </div>
      );
    };

    const abrirEditCaja = (m) => {
      setCajaDet(m); setCajaEdit(false); // siempre abre en modo vista; editar solo manual
      if(m._fromBanco) return; // para ERP solo vista
      setCajaEdit(true);
      setForm({fecha:m.fecha||getTodayDate(),tipo:m.tipo||'Ingreso',moneda:m.moneda||'BS',concepto:m.concepto||'',referencia:m.referencia||'',
        motivoEgreso:m.motivoEgreso||'Pago Proveedor',montoNativo:String(m.monto||''),tasa:String(m.tasa||tasaActiva),
        aplicaTercero:m.aplicaTercero||false,tipoTercero:m.tipoTercero||'Cliente',terceroId:m.terceroId||'',
        ctaContraId:m.ctaContraId||'',ctaContraNombre:m.ctaContraNombre||''});
    };

    const guardarEditCaja = async() => {
      if(!cajaDet) return;
      if(!form.montoNativo||Number(form.montoNativo)<=0) return alert('Ingrese un monto válido');
      if(!form.concepto) return alert('Ingrese el concepto');
      setBusy(true);
      try {
        const mNatEdit = Number(form.montoNativo)||0;
        const tasaEdit = Number(form.tasa)||tasaActiva;
        const esBsCaja = form.moneda==='BS';
        const montoBsEdit  = esBsCaja ? mNatEdit : mNatEdit*tasaEdit;
        const montoUSDEdit = esBsCaja ? (tasaEdit>0?mNatEdit/tasaEdit:0) : mNatEdit;
        const cajaObjEdit = cajas.find(c=>c.id===cajaDet.cajaId);
        const ctaCajaEdit  = cajaObjEdit?.cuentaContableNom || `Caja ${cajaObjEdit?.nombre||''}`;
        const ctaContraEdit = form.ctaContraNombre||(form.tipo==='Ingreso'?'Cuentas por Cobrar':'Cuentas por Pagar');
        const terceroEdit = form.tipoTercero==='Cliente'?clientes.find(c=>c.id===form.terceroId):provs.find(p=>p.id===form.terceroId);

        const batch = writeBatch(_bancoDB);
        batch.update(getDocRef('caja_movimientos',cajaDet.id),{
          fecha:form.fecha, tipo:form.tipo, moneda:form.moneda, concepto:form.concepto, referencia:form.referencia,
          motivoEgreso:form.motivoEgreso,
          tasa:tasaEdit, monto:mNatEdit, montoBs:montoBsEdit, montoUSD:montoUSDEdit,
          aplicaTercero:form.aplicaTercero, tipoTercero:form.tipoTercero,
          terceroId:terceroEdit?.id||'', terceroNombre:terceroEdit?.nombre||'',
          ctaContraId:form.ctaContraId, ctaContraNombre:form.ctaContraNombre,
          asientoDebito:form.tipo==='Ingreso'?ctaCajaEdit:ctaContraEdit,
          asientoCredito:form.tipo==='Ingreso'?ctaContraEdit:ctaCajaEdit,
          updatedAt:Date.now(),
        });

        // ── Regenerar el asiento contable real vinculado (cont_asientos), no solo las etiquetas ──
        if (cajaDet.asientoContableId && form.ctaContraId) {
          const ctaContraObj = contCuentas.find(c=>c.id===form.ctaContraId) || {};
          const bancoEnDebeEdit = form.tipo==='Ingreso';
          const lineaCajaEdit = {
            codigo:cajaObjEdit?.cuentaContableCod||'', cuenta:ctaCajaEdit, tipoLinea:bancoEnDebeEdit?'D':'H',
            nroDoc:form.referencia||'', concepto:form.concepto, tasa:tasaEdit,
            debeBs:bancoEnDebeEdit?montoBsEdit:0, haberBs:bancoEnDebeEdit?0:montoBsEdit,
            debeUSD:bancoEnDebeEdit?montoUSDEdit:0, haberUSD:bancoEnDebeEdit?0:montoUSDEdit,
          };
          const lineaContraEdit = {
            codigo:ctaContraObj.codigo||'', cuenta:ctaContraObj.nombre||form.ctaContraNombre||'', tipoLinea:bancoEnDebeEdit?'H':'D',
            nroDoc:form.referencia||'', concepto:form.concepto, tasa:tasaEdit,
            debeBs:bancoEnDebeEdit?0:montoBsEdit, haberBs:bancoEnDebeEdit?montoBsEdit:0,
            debeUSD:bancoEnDebeEdit?0:montoUSDEdit, haberUSD:bancoEnDebeEdit?montoUSDEdit:0,
          };
          const lineasEdit = [lineaCajaEdit, lineaContraEdit];
          batch.update(getDocRef('cont_asientos', cajaDet.asientoContableId), {
            fecha:form.fecha, tipo:form.tipo==='Ingreso'?'Ingreso':'Egreso', subTipo:form.tipo,
            nroDocumento:form.referencia||'', descripcion:form.concepto.toUpperCase(), tasa:tasaEdit,
            terceroNombre:terceroEdit?.nombre||'', lineas:lineasEdit,
            totalDebeBs:lineasEdit.reduce((a,l)=>a+l.debeBs,0), totalHaberBs:lineasEdit.reduce((a,l)=>a+l.haberBs,0),
            totalDebeUSD:lineasEdit.reduce((a,l)=>a+l.debeUSD,0), totalHaberUSD:lineasEdit.reduce((a,l)=>a+l.haberUSD,0),
          });
        }

        await batch.commit();
        setCajaDet(null); setCajaEdit(false); setForm(initF());
      } catch(e) {
        alert('❌ No se pudo guardar: '+(e?.message||e));
      } finally { setBusy(false); }
    };

    const confirmarElimCaja = async() => {
      if(!await validarClaveAdmin(cajaPwd)){setCajaPwdErr(true);setTimeout(()=>setCajaPwdErr(false),1500);return;}
      const m = cajaPwdModal; if(!m) return;
      setBusy(true);
      try {
        if(m.origen==='CxC' && m._fromBanco){
          // Eliminar de cobros_cxc y restaurar saldo NE
          await deleteDoc(getDocRef('cobros_cxc', m.id));
        } else if(m.origen==='CxP' && m._fromBanco){
          // Eliminar de procura_pagos_cxp y restaurar saldo factura
          await deleteDoc(getDocRef('procura_pagos_cxp', m.id));
        } else {
          // Movimiento manual de caja
          await deleteDoc(getDocRef('caja_movimientos', m.id));
        }
        setCajaPwdModal(null); setCajaPwd('');
      } finally { setBusy(false); }
    };


    const generarPDFMovCaja = (m) => {
      const html=bancoLetterheadOpen('Comprobante de Movimiento de Caja',`Fecha: ${bancoDd(m.fecha)} · Ref: ${m.referencia||'—'}`)+
        `<table>
          <thead><tr><th>Campo</th><th>Detalle</th></tr></thead>
          <tbody>
            <tr><td>Tipo</td><td style="font-weight:900;color:${m.tipo==='Ingreso'?'#16a34a':'#dc2626'}">${m.tipo}</td></tr>
            <tr><td>Fecha</td><td>${bancoDd(m.fecha)}</td></tr>
            <tr><td>Concepto</td><td>${m._concepto||m.concepto||'—'}</td></tr>
            ${m._facturaInfo?`<tr><td>Factura(s)</td><td style="color:#2563eb;font-weight:bold">${m._facturaInfo}</td></tr>`:''}
            <tr><td>Tercero</td><td>${m._tercero||m.terceroNombre||'—'}</td></tr>
            <tr><td>Método</td><td>${m.metodo||'Efectivo'}</td></tr>
            <tr><td>Referencia</td><td style="font-family:monospace">${m.referencia||'—'}</td></tr>
            ${m._cajaNombre?`<tr><td>Caja</td><td>${m._cajaNombre}</td></tr>`:''}
            <tr><td>Monto USD</td><td style="font-family:monospace;font-weight:900;color:#16a34a">$${bancoFmt(m.montoUSD)}</td></tr>
            <tr><td>Monto Bs.</td><td style="font-family:monospace;font-weight:900;color:#2563eb">Bs.${bancoFmt(m.montoBs)}</td></tr>
            <tr><td>Tasa Bs/$</td><td>${m.tasa||tasaActiva}</td></tr>
            <tr><td>Origen</td><td>${m.origen==='CxP'?'Cuentas por Pagar (CxP)':m.origen==='CxC'||m._fromBanco?'Cuentas por Cobrar (CxC)':'Manual'}</td></tr>
          </tbody>
        </table>`+
        bancoLetterheadClose(`Módulo Caja · ${bancoDd(getTodayDate())}`);
      bancoPrintWindow(html);
    };

    const exportarExcelCaja = () => {
      const rows = allMovsCaja.map((m,i)=>`<tr>
        <td>${i+1}</td><td>${bancoDd(m.fecha)}</td>
        <td style="color:${m.tipo==='Ingreso'?'#16a34a':'#dc2626'};font-weight:bold">${m.tipo}</td>
        <td>${m.moneda==='BS'?'Bs.':'USD'}</td>
        <td>${m._concepto||m.concepto||''}</td>
        <td>${m._facturaInfo||''}</td>
        <td>${m._tercero||m.terceroNombre||'—'}</td>
        <td style="font-family:monospace">${m.referencia||'—'}</td>
        <td style="text-align:right;font-family:monospace;font-weight:bold">Bs.${bancoFmt(m.montoBs)}</td>
        <td style="text-align:right;font-family:monospace;font-weight:bold">$${bancoFmt(m.montoUSD)}</td>
        <td>${m.tasa||''}</td>
      </tr>`).join('');
      const totBsE=allMovsCaja.reduce((s,m)=>m.tipo==='Egreso'?s+Number(m.montoBs||0):s,0);
      const totBsI=allMovsCaja.reduce((s,m)=>m.tipo==='Ingreso'?s+Number(m.montoBs||0):s,0);
      const totUSDI=allMovsCaja.reduce((s,m)=>m.tipo==='Ingreso'?s+Number(m.montoUSD||0):s,0);
      const totUSOE=allMovsCaja.reduce((s,m)=>m.tipo==='Egreso'?s+Number(m.montoUSD||0):s,0);
      const html=bancoLetterheadOpen('Movimientos de Caja',`${cajFiltDesde||'Inicio'} al ${cajFiltHasta||bancoDd(getTodayDate())} · ${allMovsCaja.length} movimientos`)+
        `<table><thead><tr><th>#</th><th>Fecha</th><th>Tipo</th><th>Moneda</th><th>Concepto</th><th>Factura</th><th>Tercero</th><th>Referencia</th><th>Monto Bs.</th><th>Monto USD</th><th>Tasa</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="background:#000"><td colspan="8" style="color:#94a3b8;font-weight:bold;font-size:9px">TOTALES</td>
        <td style="text-align:right;color:#4ade80">Ing: Bs.${bancoFmt(totBsI)}<br>Egr: Bs.${bancoFmt(totBsE)}</td>
        <td style="text-align:right;color:#4ade80">Ing: $${bancoFmt(totUSDI)}<br>Egr: $${bancoFmt(totUSOE)}</td><td></td></tr></tfoot></table>`+
        bancoLetterheadClose(`Módulo: Caja · ${bancoDd(getTodayDate())}`);
      const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=url;a.download=`movimientos_caja_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(url);
    };

    // ── Corregir Traslados (reparación masiva) — misma lógica que en Movimientos de Banco.
    // CajaOpViewImpl es un componente separado de MovimientosViewImpl, así que necesita su
    // propia copia; ambos escanean movBanco+movCaja completos, así que desde cualquiera de las
    // dos pantallas se detectan y corrigen los mismos problemas, sean de Banco o de Caja. ──
    const [problemasTrasladoCaja, setProblemasTrasladoCaja] = useState(null);
    const [ultimaCorreccionTrasladosCaja, setUltimaCorreccionTrasladosCaja] = useState(null);
    const detectarTrasladosRotosCaja = () => {
      const todosLosMovs = [...(movBanco||[]), ...(movCaja||[])];
      const yaVistos = new Set();
      const problemas = [];
      todosLosMovs.forEach(m => {
        const esOrigen = m.tipo==='Traslado de Fondo'||m.tipo==='Transferencia'||(/traslado de fondo/i.test(m.concepto||'')&&m.tipo!=='Ingreso');
        const esDestino = m.tipo==='Ingreso' && /traslado recibido/i.test(m.concepto||'');
        if(!esOrigen && !esDestino) return;
        if(!m.referencia || !m.fecha) return;
        const key = m.referencia+'|'+m.fecha;
        if(yaVistos.has(key+'|'+esOrigen)) return;
        yaVistos.add(key+'|'+esOrigen);
        const asiento = asientosBanco.find(a=>a.id===m.asientoContableId);
        if(!asiento?.lineas || asiento.lineas.length<2) return;
        const b = Number(m.montoBs||0), u = Number(m.montoUSD||0);
        if(b<=0 && u<=0) return;
        const lineaRota = asiento.lineas.find(l=>{
          const lb=Number(l.debeBs||0)+Number(l.haberBs||0), lu=Number(l.debeUSD||0)+Number(l.haberUSD||0);
          return (b>0 && Math.abs(lb-b) > b*0.01) || (u>0 && Math.abs(lu-u) > u*0.01);
        });
        if(!lineaRota) return;
        const esCaja = !!m.cajaId;
        const cuentaRef = esCaja ? cajas.find(c=>c.id===m.cajaId) : cuentas.find(c=>c.id===m.cuentaId);
        const montoNativoActual = Number(m.monto ?? m.montoNativo ?? 0);
        const montoNativoCorrecto = cuentaRef?.moneda==='BS' ? b : u;
        const lineasCorregidas = asiento.lineas.slice(0,2).map(l=>({
          ...l,
          debeBs: l.tipoLinea==='D'?b:0, haberBs: l.tipoLinea==='H'?b:0,
          debeUSD: l.tipoLinea==='D'?u:0, haberUSD: l.tipoLinea==='H'?u:0,
        }));
        problemas.push({
          mov:m, esCaja, cuenta:cuentaRef, esOrigen,
          montoNativoActual, montoNativoCorrecto, delta: cuentaRef ? montoNativoCorrecto-montoNativoActual : 0,
          asientoId: asiento.id, lineasCorregidas, lineasOriginales: asiento.lineas,
        });
      });
      return problemas;
    };
    const revisarTrasladosCaja = () => setProblemasTrasladoCaja(detectarTrasladosRotosCaja());
    const corregirTrasladosCaja = async () => {
      if(!problemasTrasladoCaja || problemasTrasladoCaja.length===0) return;
      setBusy(true);
      try{
        const batch = writeBatch(_bancoDB);
        const deltaPorCuenta = {};
        problemasTrasladoCaja.forEach(p=>{
          if(!p.cuenta) return;
          const key=(p.esCaja?'caja:':'banco:')+p.cuenta.id;
          if(!deltaPorCuenta[key]) deltaPorCuenta[key]={esCaja:p.esCaja, cuenta:p.cuenta, delta:0};
          deltaPorCuenta[key].delta += p.delta;
        });
        Object.values(deltaPorCuenta).forEach(({esCaja,cuenta,delta})=>{
          if(Math.abs(delta)<0.005) return;
          const nuevoSaldo = Number(cuenta.saldo||0) + delta;
          if(esCaja) batch.update(getDocRef('caja_cuentas', cuenta.id), {saldoInicial: nuevoSaldo});
          else batch.update(getDocRef('banco_cuentas', cuenta.id), {saldo: nuevoSaldo});
        });
        problemasTrasladoCaja.forEach(p=>{
          if(p.cuenta && Math.abs(p.delta)>=0.005){
            if(p.esCaja) batch.update(getDocRef('caja_movimientos', p.mov._docId||p.mov.id), {monto: p.montoNativoCorrecto});
            else batch.update(getDocRef('banco_movimientos', p.mov._docId||p.mov.id), {montoNativo: p.montoNativoCorrecto});
          }
          batch.update(getDocRef('cont_asientos', p.asientoId), {
            lineas: p.lineasCorregidas,
            totalDebeBs: p.lineasCorregidas.reduce((a,l)=>a+l.debeBs,0), totalHaberBs: p.lineasCorregidas.reduce((a,l)=>a+l.haberBs,0),
            totalDebeUSD: p.lineasCorregidas.reduce((a,l)=>a+l.debeUSD,0), totalHaberUSD: p.lineasCorregidas.reduce((a,l)=>a+l.haberUSD,0),
          });
        });
        await batch.commit();
        setUltimaCorreccionTrasladosCaja({problemas:problemasTrasladoCaja, deltaPorCuenta, fecha:new Date().toLocaleString('es-VE')});
        alert(`✅ Se corrigieron ${problemasTrasladoCaja.length} asiento(s) contable(s) y el saldo de ${Object.keys(deltaPorCuenta).length} cuenta(s).\n\nSi algo no se ve bien, hay un botón "↩ Reversar" junto a "Corregir Traslados" para deshacer esto.`);
        setProblemasTrasladoCaja(null);
      }catch(e){ alert('❌ No se pudo corregir: '+(e?.message||e)); }
      finally{ setBusy(false); }
    };
    const reversarCorreccionTrasladosCaja = async () => {
      if(!ultimaCorreccionTrasladosCaja) return;
      if(!window.confirm('¿Reversar la última corrección de traslados? Esto deja el asiento, el monto y los saldos exactamente como estaban antes de corregir.')) return;
      setBusy(true);
      try{
        const batch = writeBatch(_bancoDB);
        Object.values(ultimaCorreccionTrasladosCaja.deltaPorCuenta).forEach(({esCaja,cuenta,delta})=>{
          if(Math.abs(delta)<0.005) return;
          const saldoRevertido = Number(cuenta.saldo||0);
          if(esCaja) batch.update(getDocRef('caja_cuentas', cuenta.id), {saldoInicial: saldoRevertido});
          else batch.update(getDocRef('banco_cuentas', cuenta.id), {saldo: saldoRevertido});
        });
        ultimaCorreccionTrasladosCaja.problemas.forEach(p=>{
          if(p.cuenta && Math.abs(p.delta)>=0.005){
            if(p.esCaja) batch.update(getDocRef('caja_movimientos', p.mov._docId||p.mov.id), {monto: p.montoNativoActual});
            else batch.update(getDocRef('banco_movimientos', p.mov._docId||p.mov.id), {montoNativo: p.montoNativoActual});
          }
          batch.update(getDocRef('cont_asientos', p.asientoId), {
            lineas: p.lineasOriginales,
            totalDebeBs: p.lineasOriginales.reduce((a,l)=>a+Number(l.debeBs||0),0), totalHaberBs: p.lineasOriginales.reduce((a,l)=>a+Number(l.haberBs||0),0),
            totalDebeUSD: p.lineasOriginales.reduce((a,l)=>a+Number(l.debeUSD||0),0), totalHaberUSD: p.lineasOriginales.reduce((a,l)=>a+Number(l.haberUSD||0),0),
          });
        });
        await batch.commit();
        alert('↩ Corrección reversada — todo quedó como estaba antes.');
        setUltimaCorreccionTrasladosCaja(null);
      }catch(e){ alert('❌ No se pudo reversar: '+(e?.message||e)); }
      finally{ setBusy(false); }
    };

    // ── Posibles Duplicados Manuales ────────────────────────────────────
    // Antes de este arreglo, los cobros/pagos de caja no se veían aquí — es probable que en su
    // momento se hayan tecleado a mano como parche. Ahora que sí se derivan solos desde
    // cobros_cxc/procura_pagos_cxp, esos parches manuales quedarían contados DOS veces. Se
    // detectan comparando cada movimiento de caja SIN grupoCobroId/grupoPagoId (o sea, no viene
    // del flujo automático) contra los cobros/pagos reales — misma caja, misma fecha, mismo
    // monto USD (±0.02), y la referencia coincide o el concepto menciona el documento/cliente
    // del cobro real. Es una coincidencia por similitud, no un ID exacto — por eso cada uno se
    // revisa y se borra de uno en uno, nunca en bloque.
    const [duplicadosManualesCaja, setDuplicadosManualesCaja] = useState(null);
    const detectarDuplicadosManualesCaja = () => {
      const candidatos = (movCaja||[]).filter(m=>!m.grupoCobroId && !m.grupoPagoId);
      const problemas = [];
      candidatos.forEach(m=>{
        const esIngreso = m.tipo==='Ingreso';
        const fuente = esIngreso ? (cobrosCajaCxc||[]) : (pagosCajaCxP||[]);
        const match = fuente.find(c=>{
          const cajaIdC = (c.cuentaBancariaId||c.cuentaId||'').replace('CAJA::','');
          if(cajaIdC!==m.cajaId) return false;
          if((c.fecha||'')!==(m.fecha||'')) return false;
          if(Math.abs(Number(c.monto||0)-Number(m.montoUSD||0))>0.02) return false;
          const refCoincide = c.referencia && m.referencia && c.referencia===m.referencia;
          const nombreClave = c.neDocumento||c.clientName||c.proveedor||'';
          const conceptoMenciona = nombreClave && (m.concepto||'').toUpperCase().includes(String(nombreClave).toUpperCase());
          return refCoincide || conceptoMenciona;
        });
        if(match) problemas.push({movManual:m, real:match, esIngreso});
      });
      return problemas;
    };
    const revisarDuplicadosManualesCaja = () => setDuplicadosManualesCaja(detectarDuplicadosManualesCaja());
    const eliminarDuplicadoManual = async (item) => {
      if(!window.confirm(`¿Eliminar el movimiento manual "${item.movManual.concepto}" (${bancoDd(item.movManual.fecha)}, $${bancoFmt(item.movManual.montoUSD)})? El cobro/pago real (que ya cuenta solo) se queda intacto — esto NO afecta el saldo real, solo quita el duplicado.`)) return;
      setBusy(true);
      try{
        // El saldo de caja se calcula en vivo sumando todos los movimientos (getSaldoCaja) — no
        // es un total guardado que haya que ajustar a mano. Al borrar el duplicado, el saldo ya
        // correcto sale solo, en el siguiente cálculo.
        await deleteDoc(getDocRef('caja_movimientos', item.movManual._docId||item.movManual.id));
        setDuplicadosManualesCaja(prev=>(prev||[]).filter(x=>x!==item));
      }catch(e){ alert('❌ No se pudo eliminar: '+(e?.message||e)); }
      finally{ setBusy(false); }
    };

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Balance de {cajFiltCaja?(cajas.find(c=>c.id===cajFiltCaja)?.nombre||'la caja'):'todas las cajas'} — mes seleccionado
          </p>
          <input type="month" value={cajFiltMes} onChange={e=>setCajFiltMes(e.target.value)} className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-orange-400"/>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BKPI label="Saldo Inicial" value={`$${bancoFmt(saldoInicialUSD)}`} accent="blue" Icon={Banknote}/>
          <BKPI label="Entradas" value={`$${bancoFmt(entradasUSD)}`} accent="green" Icon={ArrowUpCircle}/>
          <BKPI label="Salidas" value={`$${bancoFmt(salidasUSD)}`} accent="red" Icon={ArrowDownCircle}/>
          <BKPI label="Disponible" value={`$${bancoFmt(disponibleUSD)}`} accent={disponibleUSD>=0?'green':'red'} Icon={PiggyBank}/>
        </div>

        <BCard title="Movimientos de Caja" subtitle="Efectivo Bs. y Divisas">
          {/* ── BARRA DE FILTROS ── */}
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100 mb-3">
            {/* Moneda tabs */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {[['BS','BS.'],['USD','USD $'],['AMBAS','AMBAS']].map(([k,l])=>(
                <button key={k} onClick={()=>setCajFiltMoneda(k)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all ${cajFiltMoneda===k?k==='BS'?'bg-slate-900 text-white':k==='USD'?'bg-emerald-600 text-white':'bg-orange-500 text-white':'bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {l}
                </button>
              ))}
            </div>
            {/* Selector de caja */}
            <select value={cajFiltCaja} onChange={e=>setCajFiltCaja(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400 min-w-[160px]">
              <option value="">Todas las cajas</option>
              {cajas.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {/* Tipo Ingreso/Egreso */}
            <select value={cajFiltTipo} onChange={e=>setCajFiltTipo(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400">
              <option value="">Ingresos y Egresos</option>
              <option value="Ingreso">Solo Ingresos</option>
              <option value="Egreso">Solo Egresos</option>
            </select>
            {/* Fechas */}
            <input type="date" value={cajFiltDesde} onChange={e=>setCajFiltDesde(e.target.value)}
              className="border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400"/>
            <span className="text-slate-400 text-[10px] font-bold">—</span>
            <input type="date" value={cajFiltHasta} onChange={e=>setCajFiltHasta(e.target.value)}
              className="border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400"/>
            {/* Buscadores cliente y referencia */}
            <div className="relative">
              <Users size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={cajBusqCli} onChange={e=>setCajBusqCli(e.target.value)} placeholder="Buscar cliente..." className="border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400 w-36"/>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={cajBusqRef} onChange={e=>setCajBusqRef(e.target.value)} placeholder="Referencia..." className="border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400 w-28"/>
            </div>
            <div className="relative">
              <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input type="number" step="0.01" value={cajBusqMonto} onChange={e=>setCajBusqMonto(e.target.value)} placeholder="Monto..." title="Busca por monto — Bs. o $, cualquiera de los dos" className="border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-[10px] font-bold outline-none focus:border-orange-400 w-24"/>
            </div>
            {(cajFiltCaja||cajFiltTipo||cajFiltDesde||cajFiltHasta||cajBusqCli||cajBusqRef||cajBusqMonto)&&(
              <button onClick={()=>{setCajFiltCaja('');setCajFiltTipo('');setCajFiltDesde('');setCajFiltHasta('');setCajBusqCli('');setCajBusqRef('');setCajBusqMonto('');}}
                className="text-[10px] font-black text-slate-400 hover:text-red-500 transition-all">× LIMPIAR</button>
            )}
            <div className="ml-auto flex gap-2">
              <BBp onClick={exportarExcelCaja} sm><FileSpreadsheet size={12}/> Excel</BBp>
              <BBp onClick={revisarTrasladosCaja} sm title="Revisa los asientos de traslados/transferencias y detecta si la comisión de rebancarización se comió el monto"><Settings size={12}/> Corregir Traslados</BBp>
              {ultimaCorreccionTrasladosCaja && (
                <BBp onClick={reversarCorreccionTrasladosCaja} sm title={`Deshace la corrección aplicada el ${ultimaCorreccionTrasladosCaja.fecha}`}><RefreshCw size={12}/> ↩ Reversar</BBp>
              )}
              <BBp onClick={revisarDuplicadosManualesCaja} sm title="Busca movimientos de caja escritos a mano que coincidan con un cobro/pago real de Ventas o Procura"><Search size={12}/> Posibles Duplicados</BBp>
              <BBg onClick={()=>{setForm(initF());setModal(true);}} sm><Plus size={12}/> Nuevo</BBg>
            </div>
          </div>

          {problemasTrasladoCaja!==null && (
            <BModal open={true} onClose={()=>setProblemasTrasladoCaja(null)} title="🔧 Corregir Traslados con Asiento Roto" wide
              footer={problemasTrasladoCaja.length>0
                ? <><BBo onClick={()=>setProblemasTrasladoCaja(null)}>Cancelar</BBo><BBg onClick={corregirTrasladosCaja} disabled={busy}>{busy?'Corrigiendo...':`Corregir ${problemasTrasladoCaja.length} Asiento(s)`}</BBg></>
                : <BBo onClick={()=>setProblemasTrasladoCaja(null)}>Cerrar</BBo>}>
              {problemasTrasladoCaja.length===0 ? (
                <div className="text-center py-8 text-slate-400 font-bold text-sm">✓ No se encontraron traslados con el asiento roto.</div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700 font-bold">
                    Se encontraron {problemasTrasladoCaja.length} lado(s) de traslado/transferencia (Banco o Caja) cuyo asiento contable no coincide con el monto real del movimiento. Al corregir: se reconstruye el asiento usando el monto real de cada movimiento, y se ajusta el saldo de la cuenta si hacía falta.
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                        <th className="px-2 py-2 text-left">Fecha</th><th className="px-2 py-2 text-left">Lado</th><th className="px-2 py-2 text-left">Cuenta</th><th className="px-2 py-2 text-left">Referencia</th>
                        <th className="px-2 py-2 text-right">$ Real</th><th className="px-2 py-2 text-right">Bs. Real</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {problemasTrasladoCaja.map((p,i)=>(
                          <tr key={i}>
                            <td className="px-2 py-1.5">{bancoDd(p.mov.fecha)}</td>
                            <td className="px-2 py-1.5">{p.esOrigen?'Origen':'Destino'}</td>
                            <td className="px-2 py-1.5 font-bold">{p.cuenta?.banco||p.cuenta?.nombre||p.mov.cuentaNombre||p.mov.cajaNombre||'—'}</td>
                            <td className="px-2 py-1.5 font-mono text-slate-400">{p.mov.referencia||'—'}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-emerald-600 font-black">${bancoFmt(p.mov.montoUSD)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-emerald-600 font-black">Bs.{bancoFmt(p.mov.montoBs)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </BModal>
          )}

          {duplicadosManualesCaja!==null && (
            <BModal open={true} onClose={()=>setDuplicadosManualesCaja(null)} title="🔍 Posibles Duplicados Manuales" wide footer={<BBo onClick={()=>setDuplicadosManualesCaja(null)}>Cerrar</BBo>}>
              {duplicadosManualesCaja.length===0 ? (
                <div className="text-center py-8 text-slate-400 font-bold text-sm">✓ No se encontró ningún movimiento manual que coincida con un cobro/pago real.</div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700 font-bold">
                    {duplicadosManualesCaja.length} movimiento(s) escrito(s) a mano coinciden en fecha, monto y cliente/referencia con un cobro o pago real. Revisa cada par antes de decidir — la coincidencia es por parecido, no un ID exacto. Elimina solo el de la izquierda (el manual); el de la derecha (el real, que ya cuenta solo) no se toca.
                  </div>
                  <div className="space-y-2">
                    {duplicadosManualesCaja.map((item,i)=>(
                      <div key={i} className="grid grid-cols-2 gap-3 border border-slate-200 rounded-xl p-3">
                        <div className="bg-red-50 rounded-lg p-2">
                          <p className="text-[8px] font-black uppercase text-red-500 mb-1">Manual (candidato a borrar)</p>
                          <p className="text-[11px] font-bold text-slate-700">{item.movManual.concepto}</p>
                          <p className="text-[10px] text-slate-500">{bancoDd(item.movManual.fecha)} · ${bancoFmt(item.movManual.montoUSD)} · Ref: {item.movManual.referencia||'—'}</p>
                          <button onClick={()=>eliminarDuplicadoManual(item)} disabled={busy} className="mt-2 text-[9px] font-black uppercase bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg">🗑 Eliminar este</button>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2">
                          <p className="text-[8px] font-black uppercase text-emerald-600 mb-1">{item.esIngreso?'Cobro real (Ventas)':'Pago real (Procura)'}</p>
                          <p className="text-[11px] font-bold text-slate-700">{item.real.neDocumento||item.real.clientName||item.real.proveedor||'—'}</p>
                          <p className="text-[10px] text-slate-500">{bancoDd(item.real.fecha)} · ${bancoFmt(item.real.monto)} · Ref: {item.real.referencia||'—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </BModal>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><BTh>Fecha</BTh><BTh>Tipo</BTh><BTh>Moneda</BTh><BTh>Concepto</BTh><BTh>Tercero</BTh><BTh>Ref.</BTh><BTh right>Monto Bs.</BTh><BTh right>Monto USD</BTh><BTh right>Tasa</BTh><BTh>Acciones</BTh></tr></thead>
              <tbody>
                {allMovsCaja.length===0&&<tr><td colSpan={10}><BEmptyState icon={Banknote} title="Sin movimientos de caja" desc="Registre ingresos y egresos de efectivo"/></td></tr>}
                {allMovsCaja.map(m=><tr key={m.id} className={`hover:bg-slate-50 ${m._fromBanco?(m.tipo==='Egreso'?'bg-red-50/20':'bg-green-50/20'):''}`}>
                  <BTd>{bancoDd(m.fecha)}</BTd>
                  <BTd><BBadge v={m.tipo==='Ingreso'?'green':'red'}>{m.tipo}</BBadge></BTd>
                  <BTd><BPill usd={m.moneda==='USD'}>{m.moneda==='BS'?'Bs':'USD'}</BPill></BTd>
                  <BTd className="max-w-[220px]">
                    <div className="truncate font-semibold" title={m._concepto||m.concepto}>{m._concepto||m.concepto}</div>
                    {m._facturaInfo&&<div className="text-[8px] text-blue-600 font-black truncate" title={m._facturaInfo}>📄 {m._facturaInfo}</div>}
                    <div className="flex items-center gap-1 mt-0.5">
                      {m._cajaNombre&&<span className="text-[7px] font-black text-white px-1 py-0.5 rounded bg-slate-700">🏦 {m._cajaNombre}</span>}
                      {m._fromBanco&&<span className="text-[7px] font-black text-white px-1 py-0.5 rounded" style={{background:m.tipo==='Egreso'?'#ea580c':'#16a34a'}}>{m.origen==='CxP'?'CxP':'CxC'}</span>}
                    </div>
                  </BTd>
                  <BTd className="text-[10px] max-w-[120px] truncate">{m._tercero||m.terceroNombre||m.proveedor||m.clientName||'—'}</BTd>
                  <BTd mono className="text-slate-400 text-[10px]">{m.referencia||'—'}</BTd>
                  <BTd right mono className={`font-black ${m.tipo==='Ingreso'?'text-emerald-600':'text-red-500'}`}>Bs.{bancoFmt(m.montoBs)}</BTd>
                  <BTd right mono className={`text-xs ${m.tipo==='Ingreso'?'text-emerald-500':'text-red-400'}`}>{'$'+bancoFmt(m.montoUSD)}</BTd>
                  <BTd right mono className="text-slate-400 text-[10px]">{m.tasa}</BTd>
                  <BTd>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>generarPDFMovCaja(m)} className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg" title="Comprobante PDF"><FileText size={12}/></button>
                      <button onClick={()=>{setCajaDet(m);setCajaEdit(false);}} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg" title="Ver / Editar"><Settings size={12}/></button>
                      <button onClick={()=>{setCajaPwdModal(m);setCajaPwd('');}} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={12}/></button>
                    </div>
                  </BTd>
                </tr>)}
              </tbody>
            </table>
          </div>
        </BCard>

        {/* ── MODAL VER / EDITAR MOVIMIENTO CAJA ── */}
        {cajaDet&&(
          <BModal open={!!cajaDet} onClose={()=>{setCajaDet(null);setCajaEdit(false);setForm(initF());}}
            title={cajaEdit?`✏ Editando — ${cajaDet.concepto}`:`Movimiento — ${cajaDet.concepto}`} wide
            footer={cajaEdit
              ?<><BBo onClick={()=>{setCajaEdit(false);setForm(initF());}}>Cancelar</BBo><BBg onClick={guardarEditCaja} disabled={busy}>{busy?'Guardando...':'Guardar Cambios'}</BBg></>
              :<><BBd onClick={()=>{if(cajaDet._fromBanco)return alert('Este movimiento viene de CxC/CxP. Elim. desde el módulo origen.');setCajaPwdModal(cajaDet);setCajaDet(null);}}>🗑 Eliminar</BBd><div className="flex-1"/>{!cajaDet._fromBanco&&<BBg onClick={()=>abrirEditCaja(cajaDet)}>✏ Editar</BBg>}</>
            }>
            {cajaEdit?(()=>{
              const mNatEd = Number(form.montoNativo)||0;
              const tasaEd = Number(form.tasa)||tasaActiva;
              const bsEd = form.moneda==='BS';
              const montoBsEd  = bsEd ? mNatEd : mNatEd*tasaEd;
              const montoUSDEd = bsEd ? (tasaEd>0?mNatEd/tasaEd:0) : mNatEd;
              const cajaSelEd = cajas.find(c=>c.id===cajaDet.cajaId);
              return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <BFG label="Fecha"><input type="date" className={inp} value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></BFG>
                  <BFG label="Tipo">
                    <div className="flex gap-1">{['Ingreso','Egreso'].map(t=>(
                      <button key={t} onClick={()=>setForm({...form,tipo:t})}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border ${form.tipo===t?(t==='Ingreso'?'bg-emerald-500 text-white border-emerald-500':'bg-red-500 text-white border-red-500'):'bg-white text-slate-500 border-slate-200'}`}>{t}</button>
                    ))}</div>
                  </BFG>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <BFG label="Referencia"><input className={inp} value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})}/></BFG>
                  {form.tipo==='Egreso'&&<div className="bg-red-50 rounded-xl p-3 border border-red-100">
                    <p className="text-[9px] font-black uppercase text-red-700 mb-2 tracking-widest">Motivo del Egreso</p>
                    <div className="flex gap-2 flex-wrap">{['Pago Proveedor','Nómina','Gastos Operativos','Impuestos','Préstamo','Otros'].map(o=>(
                      <button key={o} onClick={()=>setForm({...form,motivoEgreso:o})} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${form.motivoEgreso===o?'bg-red-600 text-white border-red-600':'bg-white text-slate-500 border-slate-200'}`}>{o}</button>
                    ))}</div>
                  </div>}
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="grid grid-cols-3 gap-4">
                    <BFG label={`Monto (${form.moneda})`}><input type="number" step="0.01" min="0.01" className={`${inp} font-black text-lg`} value={form.montoNativo} onChange={e=>setForm({...form,montoNativo:e.target.value})}/></BFG>
                    <BFG label="Tasa Bs/$"><input type="number" step="0.01" className={inp} value={form.tasa} onChange={e=>setForm({...form,tasa:e.target.value})}/></BFG>
                    <div className="flex flex-col justify-end pb-0.5">
                      <div className="rounded-xl p-3 text-center" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
                        <p className="text-emerald-400 font-mono font-black text-lg leading-none">{'$'+bancoFmt(montoUSDEd)}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">Bs. {bancoFmt(montoBsEd)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <BFG label="Concepto / Descripción" full><input className={inp} value={form.concepto} onChange={e=>setForm({...form,concepto:e.target.value})}/></BFG>
                <div className="rounded-2xl overflow-hidden border border-blue-100">
                  <div className="px-5 py-3 bg-blue-600 flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-200"/><p className="text-[10px] font-black uppercase text-white tracking-widest">Asiento Contable — {bsEd?'Bs. (c/equiv. USD)':'USD (c/equiv. Bs.)'}</p>
                  </div>
                  <div className="p-4 bg-blue-50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl p-3 border-l-4 border-emerald-500 border border-slate-100">
                        <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest mb-1">DÉBITO +</p>
                        <p className="text-[11px] font-black text-slate-800">{form.tipo==='Ingreso'?(cajaSelEd?.cuentaContableNom||`Caja ${cajaSelEd?.nombre||''}`):(form.ctaContraNombre||'[Cuenta Gasto/Proveedor]')}</p>
                        {mNatEd>0&&<div className="mt-1"><p className="font-mono font-black text-emerald-600 text-xs">{bsEd?`Bs. ${bancoFmt(montoBsEd)}`:`$${bancoFmt(montoUSDEd)}`}</p></div>}
                      </div>
                      <div className="bg-white rounded-xl p-3 border-l-4 border-red-500 border border-slate-100">
                        <p className="text-[8px] font-black uppercase text-red-600 tracking-widest mb-1">CRÉDITO −</p>
                        <p className="text-[11px] font-black text-slate-800">{form.tipo==='Egreso'?(cajaSelEd?.cuentaContableNom||`Caja ${cajaSelEd?.nombre||''}`):(form.ctaContraNombre||'[CxC / Ingreso]')}</p>
                        {mNatEd>0&&<div className="mt-1"><p className="font-mono font-black text-red-600 text-xs">{bsEd?`Bs. ${bancoFmt(montoBsEd)}`:`$${bancoFmt(montoUSDEd)}`}</p></div>}
                      </div>
                    </div>
                    <BFG label="Cuenta Contrapartida (PUC)">
                      <select className={sel} value={form.ctaContraId} onChange={e=>{const c=contCuentas.find(x=>x.id===e.target.value);setForm({...form,ctaContraId:e.target.value,ctaContraNombre:c?`${c.codigo} · ${c.nombre}`:''})}}>
                        <option value="">— Seleccionar del Plan de Cuentas —</option>
                        {[...contCuentas].sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))).map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
                      </select>
                    </BFG>
                  </div>
                </div>
                <BFG label="Tercero Vinculado">
                  <div className="flex items-center gap-3">
                    <button onClick={()=>setForm({...form,aplicaTercero:!form.aplicaTercero})} className={`w-11 h-6 rounded-full transition-all relative ${form.aplicaTercero?'bg-blue-600':'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.aplicaTercero?'left-5':'left-0.5'}`}/>
                    </button>
                    {form.aplicaTercero&&(<>
                      <select className={`${sel} w-32`} value={form.tipoTercero} onChange={e=>setForm({...form,tipoTercero:e.target.value,terceroId:''})}>
                        <option value="Cliente">Cliente</option><option value="Proveedor">Proveedor</option>
                      </select>
                      <select className={sel} value={form.terceroId} onChange={e=>setForm({...form,terceroId:e.target.value})}>
                        <option value="">— Seleccionar —</option>
                        {(form.tipoTercero==='Cliente'?clientes:provs).map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}
                      </select>
                    </>)}
                  </div>
                </BFG>
              </div>
              );
            })():(
              <div className="space-y-3">
                {cajaDet._fromBanco&&<div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[10px] font-black text-blue-700">📌 Movimiento originado en {cajaDet.origen==='CxP'?'Cuentas por Pagar':'Cuentas por Cobrar'} — solo lectura</div>}
                <div className="grid grid-cols-2 gap-3">
                  {[['Fecha',bancoDd(cajaDet.fecha)],['Tipo',cajaDet.tipo],['Moneda',cajaDet.moneda==='BS'?'Bolívares':'USD'],
                    ['Monto Bs.',`Bs.${bancoFmt(cajaDet.montoBs)}`],['Monto USD',`$${bancoFmt(cajaDet.montoUSD)}`],['Tasa',cajaDet.tasa],
                    ['Concepto',cajaDet._concepto||cajaDet.concepto],['Referencia',cajaDet.referencia||'—'],
                    ['Tercero',cajaDet._tercero||cajaDet.terceroNombre||'—'],
                  ].map(([k,v])=>(
                    <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{k}</p>
                      <p className="font-semibold text-slate-800 text-xs">{v}</p>
                    </div>
                  ))}
                </div>
                {cajaDet._facturaInfo&&<div className="bg-orange-50 border border-orange-200 rounded-xl p-3"><p className="text-[9px] font-black uppercase text-orange-700 mb-1">Factura(s) Afectada(s)</p><p className="text-xs font-black text-orange-900">📄 {cajaDet._facturaInfo}</p></div>}
                {(()=>{
                  // Mismo criterio que en Banco: buscar el asiento propio y, si es un traslado, el
                  // asiento del OTRO LADO (banco o caja) por referencia+fecha+concepto, para
                  // mostrar el asiento COMPLETO en vez de solo la mitad.
                  const asientoLinked = asientosBanco.find(a=>a.id===cajaDet.asientoContableId);
                  const esLadoQueSale = /traslado de fondo/i.test(cajaDet.concepto||'') && cajaDet.tipo!=='Ingreso';
                  const esLadoQueEntra = cajaDet.tipo==='Ingreso' && /traslado recibido/i.test(cajaDet.concepto||'');
                  if(!asientoLinked?.lineas?.length) return null;
                  const todosLosMovs = [...(movBanco||[]),...(movCaja||[])];
                  const movOtroLado = esLadoQueSale
                    ? todosLosMovs.find(m=>m.id!==cajaDet.id && m.referencia && m.referencia===cajaDet.referencia && m.fecha===cajaDet.fecha && m.tipo==='Ingreso' && /traslado recibido/i.test(m.concepto||''))
                    : esLadoQueEntra
                      ? todosLosMovs.find(m=>m.id!==cajaDet.id && m.referencia && m.referencia===cajaDet.referencia && m.fecha===cajaDet.fecha && /traslado de fondo/i.test(m.concepto||'') && m.tipo!=='Ingreso')
                      : null;
                  const asientoOtroLado = movOtroLado ? asientosBanco.find(a=>a.id===movOtroLado.asientoContableId) : null;
                  const lineasMostrar = [...asientoLinked.lineas, ...(asientoOtroLado?.lineas||[])];
                  return (
                    <div className="rounded-2xl overflow-hidden border border-blue-100">
                      <div className="px-5 py-3 bg-blue-600 flex items-center gap-2">
                        <BookOpen size={14} className="text-blue-200"/><p className="text-[10px] font-black uppercase text-white tracking-widest">Asiento Contable — {asientoLinked.comprobante||asientoLinked.numero||''}</p>
                      </div>
                      <table className="w-full text-[11px]">
                        <thead><tr className="bg-blue-50 text-[8px] font-black uppercase text-slate-500">
                          <th className="px-3 py-1.5 text-left">Cuenta Contable</th><th className="px-3 py-1.5 text-center">T</th>
                          <th className="px-3 py-1.5 text-right">Debe Bs.</th><th className="px-3 py-1.5 text-right">Haber Bs.</th>
                          <th className="px-3 py-1.5 text-right">Debe $</th><th className="px-3 py-1.5 text-right">Haber $</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {lineasMostrar.map((l,i)=>(
                            <tr key={i}>
                              <td className="px-3 py-1.5 font-semibold text-slate-800"><span className="text-blue-500 font-mono text-[10px] mr-1">{l.codigo}</span>{l.cuenta}</td>
                              <td className="px-3 py-1.5 text-center"><span className={`font-black ${l.tipoLinea==='D'?'text-emerald-600':'text-red-500'}`}>{l.tipoLinea}</span></td>
                              <td className="px-3 py-1.5 text-right font-mono font-black text-emerald-700">{l.debeBs>0?'Bs.'+bancoFmt(l.debeBs):''}</td>
                              <td className="px-3 py-1.5 text-right font-mono font-black text-red-500">{l.haberBs>0?'Bs.'+bancoFmt(l.haberBs):''}</td>
                              <td className="px-3 py-1.5 text-right font-mono font-black text-emerald-600">{l.debeUSD>0?'$'+bancoFmt(l.debeUSD):''}</td>
                              <td className="px-3 py-1.5 text-right font-mono font-black text-red-400">{l.haberUSD>0?'$'+bancoFmt(l.haberUSD):''}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr className="bg-slate-50 font-black">
                          <td colSpan={2} className="px-3 py-1.5 text-[9px] uppercase text-slate-500">Sumas Iguales</td>
                          <td className="px-3 py-1.5 text-right font-mono">Bs.{bancoFmt(lineasMostrar.reduce((a,l)=>a+Number(l.debeBs||0),0))}</td>
                          <td className="px-3 py-1.5 text-right font-mono">Bs.{bancoFmt(lineasMostrar.reduce((a,l)=>a+Number(l.haberBs||0),0))}</td>
                          <td className="px-3 py-1.5 text-right font-mono">${bancoFmt(lineasMostrar.reduce((a,l)=>a+Number(l.debeUSD||0),0))}</td>
                          <td className="px-3 py-1.5 text-right font-mono">${bancoFmt(lineasMostrar.reduce((a,l)=>a+Number(l.haberUSD||0),0))}</td>
                        </tr></tfoot>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
          </BModal>
        )}

        {/* ── MODAL CONTRASEÑA ELIMINAR ── */}
        {cajaPwdModal&&(
          <BModal open={!!cajaPwdModal} onClose={()=>{setCajaPwdModal(null);setCajaPwd('');}} title="Confirmar eliminación"
            footer={<><BBo onClick={()=>{setCajaPwdModal(null);setCajaPwd('');}}>Cancelar</BBo><BBd onClick={confirmarElimCaja} disabled={busy}>{busy?'Eliminando...':'Confirmar eliminación'}</BBd></>}>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <Trash2 size={24} className="text-red-500 mx-auto mb-2"/>
                <p className="font-black text-slate-800">{cajaPwdModal.concepto}</p>
                <p className="text-sm text-red-600 font-bold mt-1">Monto: Bs.{bancoFmt(cajaPwdModal.montoBs)} · ${bancoFmt(cajaPwdModal.montoUSD)}</p>
              </div>
              <BFG label="Clave de administrador">
                <input type="password" className={`${inp} ${cajaPwdErr?'border-red-500 bg-red-50':''}`} value={cajaPwd} onChange={e=>setCajaPwd(e.target.value)} placeholder="Su contraseña de usuario" onKeyDown={e=>e.key==='Enter'&&confirmarElimCaja()}/>
                {cajaPwdErr&&<p className="text-red-500 text-[10px] font-black mt-1">Clave incorrecta</p>}
              </BFG>
            </div>
          </BModal>
        )}

        <BModal open={modal} onClose={()=>{bdbg('🔒 CIERRE via: CAJA: onClose del BModal (backdrop / Escape)');setModal(false);setForm(initF());}} title="" xlwide noHeader noClip>
          <div style={{display:'flex',height:'78vh',overflow:'hidden'}}>

            {/* ══ COLUMNA IZQUIERDA: FORMULARIO ══ */}
            <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
              <div className="px-4 py-3 flex justify-between items-center flex-shrink-0" style={{background:'#0f172a'}}>
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-600/30 p-1.5 rounded-lg border border-emerald-500/30"><ArrowLeftRight size={13} className="text-emerald-400"/></div>
                  <p className="font-black text-white text-xs uppercase tracking-wide">Registro Operativo de Caja</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black tracking-widest border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse"/>MULTIMONEDA
                  </div>
                  <button onClick={()=>{bdbg('🔒 CIERRE via: CAJA: boton X columna izquierda');setModal(false);setForm(initF());}} className="text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="grid grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="col-span-12 md:col-span-3">
                    <CajaSelector value={form.cuentaId} onChange={v=>{
                        const nuevaCaja=cajas.find(c=>c.id===v);
                        const nuevaBs=nuevaCaja?.moneda==='BS';
                        const usdNum=Number(form.montoUSD)||0;
                        const nativo=nuevaBs?(usdNum*(Number(form.tasa)||tasaActiva)):usdNum;
                        setForm({...form,cuentaId:v,montoNativo:String(nativo)});
                      }} label="Caja"/>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <BFG label="Tipo de Operación">
                      <select className={sel} value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                        <option value="Ingreso">Ingreso</option>
                        <option value="Egreso">Egreso</option>
                        <option value="Traslado de Fondo">Traslado de Fondos</option>
                        <option value="Nota de Débito">Nota de Débito</option>
                        <option value="Nota de Crédito">Nota de Crédito</option>
                      </select>
                    </BFG>
                  </div>
                  <div className="col-span-12 md:col-span-2">
                    <BFG label="Fecha">
                      <input type="date" className={inp} value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/>
                    </BFG>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <BFG label="Referencia">
                      <input className={inp} value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})} placeholder="Ej: Juan Pérez / REF-123"/>
                    </BFG>
                  </div>

                  {form.tipo==='Traslado de Fondo'&&(
                  <div className="col-span-12 md:col-span-4 mt-2">
                      <BFG label="Banco o Caja Destino">
                        <div className="space-y-2">
                          <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                            <input value={searchDestino} onChange={e=>setSearchDestino(e.target.value)} placeholder="Buscar banco o caja..." className={`${inp} pl-8`}/>
                          </div>
                          <select className={`${sel} border-orange-400`} value={form.cuentaDestinoId} onChange={e=>setForm({...form,cuentaDestinoId:e.target.value,tasaDestino:''})}>
                            <option value="">— Seleccione destino —</option>
                            {[['Nacional-Bs','🇻🇪 Nacionales — Bolívares'],['Nacional-Ext','💵 Moneda Extranjera'],['Internacional','🌐 Internacionales'],['Electronica','💳 Electrónicas'],['Tarjeta-Debito-Intl','🪪 Tarjetas Débito Intl.'],['Pago-Movil','📱 Pago Móvil']].map(([tipo,label])=>{
                              const grupo=cuentas.filter(c=>(tipo==='Pago-Movil'?(c.tipoBanco==='Pago-Movil'||c.tipoBanco==='Pago Móvil'):c.tipoBanco===tipo)&&(!searchDestino||(c.banco+' '+c.numeroCuenta).toUpperCase().includes(searchDestino.toUpperCase())));
                              return grupo.length>0&&(
                                <optgroup key={tipo} label={label}>
                                  {grupo.map(c=>(<option key={c.id} value={c.id}>{c.banco} · {c.numeroCuenta} · {c.moneda==='BS'?'Bs.':'$'}{bancoFmt(c.saldo)}</option>))}
                                </optgroup>
                              );
                            })}
                            <optgroup label="💰 Cajas">
                              {cajas.filter(c=>c.id!==form.cuentaId&&(!searchDestino||c.nombre.toUpperCase().includes(searchDestino.toUpperCase()))).map(c=>(
                                <option key={c.id} value={c.id}>{c.nombre} · {c.moneda==='BS'?'Bs.':'$'}</option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </BFG>
                  </div>
                  )}
                  <div className={`col-span-12 ${form.tipo==='Traslado de Fondo'?'md:col-span-8':''} mt-2 bg-white rounded-xl border border-slate-200 p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Moneda de la Operación</span>
                      <div className="flex gap-1.5">
                        {['BS','USD'].map(m=>(
                          <button key={m} onClick={()=>{
                            const tasaN=Number(form.tasa)||tasaActiva; const montoOpN=Number(form.montoOp)||0;
                            const usdEq=m==='USD'?montoOpN:(montoOpN/tasaN);
                            const nativo=bs?(usdEq*tasaN):usdEq;
                            setForm({...form,monedaOp:m,montoUSD:String(usdEq),montoNativo:String(nativo)});
                          }} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${form.monedaOp===m?'bg-orange-500 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{m==='BS'?'Bs':'USD'}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Monto ({form.monedaOp==='BS'?'Bs':'USD'})</label>
                        <input type="number" step="0.01" min="0.01" className={`${inp} font-black text-emerald-600 bg-white`} value={form.montoOp} onChange={e=>{
                          const v=e.target.value; const montoOpN=Number(v)||0; const tasaN=Number(form.tasa)||tasaActiva;
                          const usdEq=form.monedaOp==='USD'?montoOpN:(montoOpN/tasaN);
                          const nativo=bs?(usdEq*tasaN):usdEq;
                          setForm({...form,montoOp:v,montoUSD:String(usdEq),montoNativo:String(nativo)});
                        }} placeholder="0.00"/>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Tasa BCV</label>
                        <div className="flex gap-1.5">
                          <input type="number" step="0.01" className={`${inp} bg-white`} value={form.tasa} onChange={e=>{
                            const v=e.target.value; const tasaN=Number(v)||tasaActiva; const montoOpN=Number(form.montoOp)||0;
                            const usdEq=form.monedaOp==='USD'?montoOpN:(montoOpN/tasaN);
                            const nativo=bs?(usdEq*tasaN):usdEq;
                            setForm({...form,tasa:v,montoUSD:String(usdEq),montoNativo:String(nativo)});
                          }}/>
                          <button type="button" disabled={fetchingBCV} title="Consultar tasa BCV" onClick={async(ev)=>{
                            ev.preventDefault(); ev.stopPropagation();
                            bdbg('👆 CLIC en boton tasa BCV');
                            try{
                              const t=await fetchTasaBCV(form.fecha);
                              if(!t) return;
                              const tasaN=t; const montoOpN=Number(form.montoOp)||0;
                              const usdEq=form.monedaOp==='USD'?montoOpN:(montoOpN/tasaN);
                              const nativo=bs?(usdEq*tasaN):usdEq;
                              setForm(f=>({...f,tasa:String(t),montoUSD:String(usdEq),montoNativo:String(nativo)}));
                            }catch(err){ console.error('BCV button error:', err); alert('No se pudo actualizar la tasa: '+(err?.message||err)); }
                          }} className="shrink-0 w-10 flex items-center justify-center border-2 border-slate-200 rounded-xl bg-white hover:bg-blue-50 disabled:cursor-not-allowed transition-colors">
                            <RefreshCw size={14} className={`text-blue-500 ${fetchingBCV?'animate-spin':''}`}/>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Equivalente ({form.monedaOp==='BS'?'USD':'Bs'})</label>
                        <div className="w-full bg-slate-900 text-white rounded-lg p-2 flex items-center justify-center h-[38px] shadow-inner">
                          <span className="font-mono font-bold text-sm">{form.monedaOp==='BS'?'$ '+bancoFmt(Number(form.montoUSD)||0):'Bs. '+bancoFmt((Number(form.montoUSD)||0)*(Number(form.tasa)||1))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {form.tipo==='Traslado de Fondo'&&form.cuentaDestinoId&&(()=>{
                  const tasaOrigenF=Number(form.tasa)||tasaActiva;
                  const usdOrigenPrev=Number(form.montoUSD)||0;
                  const bsOrigenPrev=usdOrigenPrev*tasaOrigenF;
                  const tasaDestinoF=Number(form.tasaDestino)||tasaOrigenF;
                  const comisionBsPrev=bsOrigenPrev-(usdOrigenPrev*tasaDestinoF);
                  const comisionUSDPrev=tasaOrigenF>0?comisionBsPrev/tasaOrigenF:0;
                  return (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mt-3">
                    <p className="text-[10px] font-black uppercase text-amber-800 mb-2">Tasa destino (si es distinta a la de origen, la diferencia es la rebancarización)</p>
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Tasa Destino (Bs/$)</label>
                        <input type="number" step="0.01" className={`${inp} bg-white`} placeholder={String(tasaOrigenF)} value={form.tasaDestino} onChange={e=>setForm({...form,tasaDestino:e.target.value})}/>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Rebancarización (auto)</label>
                        <div className="w-full bg-slate-900 text-white rounded-lg p-2 flex items-center justify-center h-[38px] shadow-inner">
                          <span className="font-mono font-bold text-sm">${bancoFmt(comisionUSDPrev)}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Cuenta Contable</label>
                        <select className={`${sel} bg-white`} value={form.comisionCtaId} onChange={e=>setForm({...form,comisionCtaId:e.target.value})}>
                          <option value="">— Seleccione cuenta —</option>
                          {contCuentas.filter(c=>c.nombre?.toUpperCase().includes('COMIS')||c.nombre?.toUpperCase().includes('BANCARI')||c.nombre?.toUpperCase().includes('FINANC')).map(c=>(
                            <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  );})()}
                <BFG label="Concepto / Descripción" full>
                  <input className={inp} value={form.concepto} onChange={e=>setForm({...form,concepto:e.target.value})} placeholder="Describa el motivo del movimiento..."/>
                </BFG>

                {(form.tipo==='Nota de Débito'||form.tipo==='Nota de Crédito')&&(
                  <div className={`rounded-xl p-4 border-2 ${form.tipo==='Nota de Débito'?'bg-rose-50 border-rose-200':'bg-teal-50 border-teal-200'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${form.tipo==='Nota de Débito'?'text-rose-700':'text-teal-700'}`}>
                      {form.tipo==='Nota de Débito'?'▼ Nota de Débito — Cuenta de Gasto / Comisión':'▲ Nota de Crédito — Cuenta de Ingreso / Interés'}
                    </p>
                    <BFG label="Cuenta Contable del Ajuste">
                      {[...contCuentas].filter(c=>c.nombre?.toUpperCase().includes('COMIS')||c.nombre?.toUpperCase().includes('BANCARI')||c.nombre?.toUpperCase().includes('INTERES')||c.nombre?.toUpperCase().includes('INTERÉS')).slice(0,4).map(c=>(
                        <button key={c.id} onClick={()=>setForm({...form,cuentaAjusteId:c.id})}
                          className={`mr-1 mb-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${form.cuentaAjusteId===c.id?'bg-rose-600 text-white border-rose-600':'bg-white text-slate-600 border-slate-200 hover:border-rose-300'}`}>
                          ⚡ {c.codigo} · {c.nombre.length>22?c.nombre.substring(0,22)+'…':c.nombre}
                        </button>
                      ))}
                      <div className="relative mb-1 mt-1">
                        <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input value={busqCtas['ajuste']||''} onChange={e=>setBusqCtas(p=>({...p,ajuste:e.target.value}))}
                          placeholder="Buscar cuenta por código o nombre..." className={`${inp} pl-8 text-[11px]`}/>
                      </div>
                      <select className={sel} value={form.cuentaAjusteId} onChange={e=>setForm({...form,cuentaAjusteId:e.target.value})}>
                        <option value="">— Seleccione la cuenta contable —</option>
                        {[...contCuentas]
                          .filter(c=>!busqCtas['ajuste']||(c.codigo+' '+c.nombre).toUpperCase().includes((busqCtas['ajuste']||'').toUpperCase()))
                          .sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo)))
                          .map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
                      </select>
                    </BFG>
                  </div>
                )}
                {form.tipo!=='Traslado de Fondo'&&form.tipo!=='Nota de Débito'&&form.tipo!=='Nota de Crédito' && cuentaSel && (
                  <div className="rounded-2xl overflow-hidden border border-emerald-100">
                    <div className="px-4 py-3 bg-emerald-600 flex items-center gap-2">
                      <BookOpen size={13} className="text-emerald-200"/>
                      <p className="text-[10px] font-black uppercase text-white tracking-widest">Distribución Contable — Contrapartidas</p>
                      <button onClick={()=>{const sugs=sugerirContra();if(sugs.length>0){const nl=[...form.lineasContra];nl[0]={...nl[0],ctaId:sugs[0].id,ctaNom:`${sugs[0].codigo} · ${sugs[0].nombre}`};setForm({...form,lineasContra:nl});}}} className="ml-auto text-[9px] font-black uppercase bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-white transition-colors">
                        ✦ Sugerir
                      </button>
                    </div>
                    <div className="p-4 bg-emerald-50 space-y-3">
                      <div className="grid gap-1 text-[8px] font-black uppercase text-slate-500 tracking-widest px-1" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
                        <div>Cuenta Contable</div><div className="text-right text-emerald-600">Debe Bs.</div><div className="text-right text-red-500">Haber Bs.</div><div className="text-right text-emerald-700">Debe $</div><div className="text-right text-red-600">Haber $</div><div/>
                      </div>
                      <div className="grid gap-2 px-1 py-2 bg-white rounded-xl border border-slate-200 items-center" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"/>
                          <p className="text-[10px] font-black text-slate-800 truncate">{cuentaSel?.cuentaContableCod?cuentaSel.cuentaContableCod+' · '+cuentaSel.nombre:'Caja '+cuentaSel.nombre}</p>
                          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-black uppercase flex-shrink-0">Caja</span>
                        </div>
                        <p className={`text-right font-mono font-black text-xs ${form.tipo==='Ingreso'?'text-emerald-700':'text-slate-300'}`}>{form.tipo==='Ingreso'?(bs?'Bs.'+bancoFmt(montoBs):'$'+bancoFmt(montoUSD)):''}</p>
                        <p className={`text-right font-mono font-black text-xs ${form.tipo!=='Ingreso'?'text-red-600':'text-slate-300'}`}>{form.tipo!=='Ingreso'?(bs?'Bs.'+bancoFmt(montoBs):'$'+bancoFmt(montoUSD)):''}</p>
                        <p className={`text-right font-mono text-[10px] ${form.tipo==='Ingreso'?'text-emerald-600':'text-slate-300'}`}>{form.tipo==='Ingreso'?'$'+bancoFmt(montoUSD):''}</p>
                        <p className={`text-right font-mono text-[10px] ${form.tipo!=='Ingreso'?'text-red-500':'text-slate-300'}`}>{form.tipo!=='Ingreso'?'$'+bancoFmt(montoUSD):''}</p>
                        <div/>
                      </div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-1 mb-1">Contrapartidas</p>
                      {form.lineasContra.map((l,i)=>{
                        const busqCta=busqCtas[i]||'';
                        const setBusqCta=(v)=>setBusqCtas(prev=>({...prev,[i]:v}));
                        const ctasFiltradas=[...contCuentas].filter(c=>!busqCta||(c.codigo+' '+c.nombre).toUpperCase().includes(busqCta.toUpperCase())).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo)));
                        return (
                          <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                            <div className="relative">
                              <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                              <input value={busqCta} onChange={e=>setBusqCta(e.target.value)} placeholder="Buscar cuenta contable..." className={`${inp} pl-8 text-[11px]`}/>
                            </div>
                            <div className="grid gap-2 items-center" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
                              <select className="text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 bg-white font-medium"
                                value={l.ctaId} onChange={e=>{const c=contCuentas.find(x=>x.id===e.target.value);const nl=[...form.lineasContra];nl[i]={...nl[i],ctaId:e.target.value,ctaNom:c?`${c.codigo} · ${c.nombre}`:''};setForm({...form,lineasContra:nl});setBusqCta('');}}>
                                <option value="">— Seleccione cuenta —</option>
                                {ctasFiltradas.slice(0,80).map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
                                {ctasFiltradas.length>80&&<option disabled>...escribe para filtrar ({ctasFiltradas.length})</option>}
                              </select>
                              <input type="number" step="0.01" className="text-right text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 font-mono"
                                value={l.debeBs||''} onChange={e=>{const nl=[...form.lineasContra];nl[i]={...nl[i],debeBs:e.target.value,debeUSD:e.target.value&&tasa?String((Number(e.target.value)/tasa).toFixed(2)):nl[i].debeUSD};setForm({...form,lineasContra:nl});}} placeholder="Debe Bs."/>
                              <input type="number" step="0.01" className="text-right text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-red-400 font-mono"
                                value={l.haberBs||''} onChange={e=>{const nl=[...form.lineasContra];nl[i]={...nl[i],haberBs:e.target.value,haberUSD:e.target.value&&tasa?String((Number(e.target.value)/tasa).toFixed(2)):nl[i].haberUSD};setForm({...form,lineasContra:nl});}} placeholder="Haber Bs."/>
                              <input type="number" step="0.01" className="text-right text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 font-mono"
                                value={l.debeUSD||''} onChange={e=>{const nl=[...form.lineasContra];nl[i]={...nl[i],debeUSD:e.target.value,debeBs:e.target.value&&tasa?String((Number(e.target.value)*tasa).toFixed(2)):nl[i].debeBs};setForm({...form,lineasContra:nl});}} placeholder="Debe $"/>
                              <input type="number" step="0.01" className="text-right text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-red-400 font-mono"
                                value={l.haberUSD||''} onChange={e=>{const nl=[...form.lineasContra];nl[i]={...nl[i],haberUSD:e.target.value,haberBs:e.target.value&&tasa?String((Number(e.target.value)*tasa).toFixed(2)):nl[i].haberBs};setForm({...form,lineasContra:nl});}} placeholder="Haber $"/>
                              <button onClick={()=>{if(form.lineasContra.length<=1)return;const nl=[...form.lineasContra];nl.splice(i,1);setForm({...form,lineasContra:nl});}} className="text-red-400 hover:text-red-600 flex justify-center"><X size={12}/></button>
                            </div>
                            {l.ctaId&&<p className="text-[9px] text-emerald-600 font-black">✓ {l.ctaNom}</p>}
                          </div>
                        );
                      })}
                      {cuentaSel&&AsientoTotales({form,bs,montoBs,montoUSD,tasa,mNat,fmt:bancoFmt})}
                      <button onClick={()=>setForm({...form,lineasContra:[...form.lineasContra,{ctaId:'',ctaNom:'',debeBs:'',haberBs:'',debeUSD:'',haberUSD:''}]})}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                        <Plus size={12}/> Agregar Cuenta Contrapartida
                      </button>
                      {cuentaSel&&mNat>0&&AsientoAlerta({form,bs,montoBs,montoUSD,tasa,fmt:bancoFmt})}
                    </div>
                  </div>
                )}

                {form.tipo!=='Traslado de Fondo'&&form.tipo!=='Nota de Débito'&&form.tipo!=='Nota de Crédito'&&<div className="border-2 border-slate-100 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs font-black text-slate-700 uppercase tracking-wide">Vincular a Tercero</p><p className="text-[10px] text-slate-400">Asociar a cliente (CxC) o proveedor (CxP)</p></div>
                    <button onClick={()=>setForm({...form,aplicaTercero:!form.aplicaTercero,terceroId:'',facturaId:'',cerrarCxC:false})} className={`w-12 h-6 rounded-full transition-all relative ${form.aplicaTercero?'bg-orange-500':'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.aplicaTercero?'left-6':'left-0.5'}`}/>
                    </button>
                  </div>
                  {form.aplicaTercero&&<div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <BFG label="Tipo">
                        <div className="flex gap-1">{['Cliente','Proveedor','Relacionado'].map(t=>(
                          <button key={t} onClick={()=>setForm({...form,tipoTercero:t,terceroId:'',facturaId:''})} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${form.tipoTercero===t?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>{t==='Relacionado'?'CxP Relac.':t}</button>
                        ))}</div>
                      </BFG>
                      <BFG label={form.tipoTercero==='Cliente'?`Clientes (${clientes.length})`:form.tipoTercero==='Proveedor'?`Proveedores (${provs.length})`:`Terceros Relacionados (${tercerosRel.length})`}>
                        <div className="space-y-2">
                          <div className="relative"><Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={searchTercero} onChange={e=>setSearchTercero(e.target.value)} placeholder={`Buscar ${form.tipoTercero==='Relacionado'?'tercero':form.tipoTercero.toLowerCase()}...`} className={`${inp} pl-8`}/></div>
                          <select className={sel} value={form.terceroId} onChange={e=>{setForm({...form,terceroId:e.target.value,facturaId:''});setSearchTercero('');}}>
                            <option value="">— Seleccione —</option>
                            {(form.tipoTercero==='Cliente'?clientes.filter(c=>!searchTercero||(c.rif+' '+c.nombre).toUpperCase().includes(searchTercero.toUpperCase())):form.tipoTercero==='Proveedor'?provs.filter(p=>!searchTercero||((p.rif||'')+' '+(p.nombre||'')).toUpperCase().includes(searchTercero.toUpperCase())):tercerosRel.filter(r=>!searchTercero||((r.cedulaRif||'')+' '+(r.nombre||'')).toUpperCase().includes(searchTercero.toUpperCase()))).map(x=><option key={x.id} value={x.id}>{x.rif||x.cedulaRif} · {x.nombre}</option>)}
                          </select>
                        </div>
                      </BFG>
                    </div>
                    {form.tipoTercero==='Relacionado'&&form.terceroId&&(()=>{
                      const trSel=tercerosRel.find(x=>x.id===form.terceroId);
                      const saldoAntes=trSel?saldoTercero(trSel):0;
                      return (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-orange-700">Saldo actual del tercero</span>
                          <span className={`font-mono font-black text-sm ${saldoAntes>0?'text-red-600':'text-emerald-600'}`}>${bancoFmt(saldoAntes)}</span>
                        </div>
                      );
                    })()}
                    {form.tipoTercero==='Cliente'&&form.terceroId&&(
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-slate-600">Cerrar Cuenta por Cobrar</p>
                          <button onClick={()=>setForm({...form,cerrarCxC:!form.cerrarCxC,facturaId:''})} className={`w-10 h-5 rounded-full transition-all relative ${form.cerrarCxC?'bg-blue-500':'bg-slate-200'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.cerrarCxC?'left-5':'left-0.5'}`}/>
                          </button>
                        </div>
                        {form.cerrarCxC&&(factPend.length>0
                          ?factPend.map(f=>(<label key={f.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.facturaId===f.id?'border-emerald-500 bg-emerald-50':'border-slate-200 hover:border-slate-100'}`}><input type="radio" name="fid" value={f.id} checked={form.facturaId===f.id} onChange={()=>setForm({...form,facturaId:f.id})} className="accent-emerald-500"/><div className="flex-1"><p className="font-black text-xs text-slate-900">{f.numero} · {bancoDd(f.fechaVencimiento)}</p></div><p className="font-mono font-black text-orange-500">{'$'+bancoFmt(f.saldoUSD)}</p>{f.fechaVencimiento<getTodayDate()&&<BBadge v="red">Vencida</BBadge>}</label>))
                          :<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/><p className="text-[10px] font-black text-emerald-700">Sin facturas pendientes.</p></div>
                        )}
                      </div>
                    )}
                  </div>}
                </div>}
              </div>
            </div>

            {/* ══ COLUMNA DERECHA: RESUMEN CAJA + PREVIEW ASIENTO ══ */}
            <div style={{width:340,flexShrink:0,display:'flex',flexDirection:'column',background:'#f8fafc',borderLeft:'1px solid #e2e8f0',overflowY:'auto'}}>
              <div className="px-5 py-4 border-b border-slate-200 flex-shrink-0 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Activity size={13}/> Estado Operativo</p>
                <button onClick={()=>{bdbg('🔒 CIERRE via: CAJA: boton X panel Estado Operativo');setModal(false);setForm(initF());}} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={18}/></button>
              </div>

              <div className="p-4 space-y-3 flex-1">
                {form.cuentaId&&<CajaInfoPanel cajaId={form.cuentaId}/>}
                {!form.cuentaId&&<div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-200 min-h-[180px]">
                  <PiggyBank size={28} className="text-slate-300 mb-3"/>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Seleccione una caja para visualizar su estado</p>
                </div>}
                {cuentaSel&&mNat>0&&<div className="rounded-xl overflow-hidden border border-slate-800">
                  <div className="px-4 py-3 flex items-center justify-between" style={{background:'#0b1120'}}>
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-emerald-500"/>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Comprobante Contable</p>
                    </div>
                    <span className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle size={10}/>Cuadrado</span>
                  </div>
                  <div className="p-3 overflow-x-auto" style={{background:'#0f172a'}}>
                    <p className="text-[9px] font-mono text-slate-500 italic mb-3 truncate">{form.concepto||'...'}</p>
                    <table className="w-full text-[9px] font-mono min-w-[420px]">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left pb-2 font-semibold">CUENTA</th>
                          <th className="text-right pb-2 font-semibold px-1">DEBE Bs.</th>
                          <th className="text-right pb-2 font-semibold px-1">HABER Bs.</th>
                          <th className="text-right pb-2 font-semibold text-emerald-400/80 px-1">DEBE $</th>
                          <th className="text-right pb-2 font-semibold text-emerald-400/80 px-1">HABER $</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        {(()=>{
                          const lines=[];
                          const bsV=bs?mNat:mNat*tasa; const usdV=bs?mNat/tasa:mNat;
                          const cajaCod=(cuentaSel?.cuentaContableCod||'').trim();
                          const cajaNom=cuentaSel.nombre;
                          if(form.tipo==='Traslado de Fondo'&&cuentaDest){
                            const dCod=(cuentaDest?.cuentaContableCod||'').trim();
                            const tasaDestinoPrev=Number(form.tasaDestino)||tasa;
                            const comBs=Math.abs(bsV-(usdV*tasaDestinoPrev));
                            const comUSD=tasa>0?comBs/tasa:0;
                            const netoBsPrev=bsV-comBs, netoUsdPrev=usdV-comUSD;
                            const ctaTrasladosPrev=(contCuentas||[]).find(c=>/traslado.*fondo|fondo.*traslado/i.test(c.nombre||''))||(contCuentas||[]).find(c=>String(c.codigo)==='1.1.01.02.012');
                            const codTrasladosPrev=ctaTrasladosPrev?String(ctaTrasladosPrev.codigo||ctaTrasladosPrev.id||''):'1.1.01.02.012';
                            const nomTrasladosPrev=ctaTrasladosPrev?ctaTrasladosPrev.nombre:'Traslados de Fondos';
                            // Mismo criterio que Banco: se muestran los DOS asientos que en
                            // realidad se van a guardar — Origen (D Traslados / H Caja Origen) y
                            // Destino (D Banco/Caja Destino / H Traslados) — no el otro banco directo.
                            lines.push({grupo:`① Asiento Origen — ${cajaNom}`,cod:codTrasladosPrev,nom:nomTrasladosPrev,dBs:netoBsPrev,hBs:0,dU:netoUsdPrev,hU:0,color:'text-amber-400'});
                            lines.push({cod:cajaCod,nom:cajaNom,dBs:0,hBs:bsV,dU:0,hU:usdV,color:'text-red-400'});
                            if(comUSD>0.005){
                              const ctaCom=contCuentas.find(c=>c.id===form.comisionCtaId);
                              lines.push({cod:ctaCom?String(ctaCom.codigo):'',nom:ctaCom?ctaCom.nombre:'Rebancarización',dBs:comBs,hBs:0,dU:comUSD,hU:0,color:'text-orange-300'});
                            }
                            lines.push({grupo:`② Asiento Destino — ${cuentaDest.banco}`,cod:dCod,nom:cuentaDest.banco,dBs:netoBsPrev,hBs:0,dU:netoUsdPrev,hU:0,color:'text-emerald-400'});
                            lines.push({cod:codTrasladosPrev,nom:nomTrasladosPrev,dBs:0,hBs:netoBsPrev,dU:0,hU:netoUsdPrev,color:'text-amber-400'});
                          } else if(form.tipo==='Nota de Débito'){
                            const aj=contCuentas.find(c=>c.id===form.cuentaAjusteId);
                            if(aj)lines.push({cod:String(aj.codigo),nom:aj.nombre,dBs:bsV,hBs:0,dU:usdV,hU:0,color:'text-orange-400'});
                            lines.push({cod:cajaCod,nom:cajaNom,dBs:0,hBs:bsV,dU:0,hU:usdV,color:'text-red-400'});
                          } else if(form.tipo==='Nota de Crédito'){
                            const aj=contCuentas.find(c=>c.id===form.cuentaAjusteId);
                            lines.push({cod:cajaCod,nom:cajaNom,dBs:bsV,hBs:0,dU:usdV,hU:0,color:'text-emerald-400'});
                            if(aj)lines.push({cod:String(aj.codigo),nom:aj.nombre,dBs:0,hBs:bsV,dU:0,hU:usdV,color:'text-blue-400'});
                          } else {
                            const isIng=form.tipo==='Ingreso';
                            lines.push({cod:cajaCod,nom:cajaNom,dBs:isIng?bsV:0,hBs:isIng?0:bsV,dU:isIng?usdV:0,hU:isIng?0:usdV,color:isIng?'text-emerald-400':'text-red-400'});
                            (form.lineasContra||[]).filter(l=>l.ctaId).forEach(l=>{
                              const ci=contCuentas.find(c=>c.id===l.ctaId);
                              const db=Number(l.debeBs||0),hb=Number(l.haberBs||0),du=Number(l.debeUSD||0),hu=Number(l.haberUSD||0);
                              if(ci&&(db||hb||du||hu))lines.push({cod:String(ci.codigo),nom:ci.nombre,dBs:db,hBs:hb,dU:du,hU:hu,color:'text-slate-300'});
                            });
                          }
                          return lines.map((l,i)=>(
                            <React.Fragment key={i}>
                              {l.grupo && (
                                <tr><td colSpan={5} className={`pt-3 pb-1 text-[8px] font-black uppercase tracking-widest ${i===0?'':'border-t border-slate-700'} text-slate-400`}>{l.grupo}</td></tr>
                              )}
                              <tr className="border-b border-slate-800/50">
                                <td className="py-2">
                                  <span className={`${l.color} block truncate max-w-[120px]`}>{l.cod&&<span className="text-blue-400 mr-1">{l.cod}</span>}{l.nom}</span>
                                </td>
                                <td className="text-right px-1 font-bold">{l.dBs>0?l.dBs.toFixed(2):''}</td>
                                <td className="text-right px-1 text-slate-500">{l.hBs>0?l.hBs.toFixed(2):''}</td>
                                <td className="text-right px-1 font-bold text-emerald-400">{l.dU>0?l.dU.toFixed(2):''}</td>
                                <td className="text-right px-1 text-emerald-800">{l.hU>0?l.hU.toFixed(2):''}</td>
                              </tr>
                            </React.Fragment>
                          ));
                        })()}
                      </tbody>
                      <tfoot className="border-t border-slate-700">
                        <tr className="text-slate-400 font-bold">
                          <td className="py-2 text-right text-[8px] uppercase tracking-wider pr-2">Totales</td>
                          <td className="text-right px-1 text-white">{(bs?mNat:mNat*tasa).toFixed(2)}</td>
                          <td className="text-right px-1 text-white">{(bs?mNat:mNat*tasa).toFixed(2)}</td>
                          <td className="text-right px-1 text-emerald-400">{(bs?mNat/tasa:mNat).toFixed(2)}</td>
                          <td className="text-right px-1 text-emerald-400">{(bs?mNat/tasa:mNat).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>}
              </div>

              <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0 space-y-2">
                <button onClick={save} disabled={busy}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                  {busy?<><RefreshCw size={15} className="animate-spin"/> Procesando...</>:<><Save size={16}/> Procesar Movimiento</>}
                </button>
                <button onClick={()=>{setModal(false);setForm(initF());}} className="w-full py-2 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </BModal>
      </div>
    );
    } catch(err) {
      bdbg('🔴 CajaOpViewImpl LANZÓ ERROR DE RENDER: ' + err.message);
      console.error('CajaOpView error:', err);
      return (
        <div className="max-w-2xl mx-auto mt-12 bg-red-50 border-2 border-red-300 rounded-3xl p-8 text-center">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3"/>
          <div className="text-red-600 font-black text-lg uppercase mb-2">Error en Caja — Nuevo Movimiento</div>
          <div className="text-red-700 text-xs font-bold bg-red-100 rounded-xl p-3 font-mono break-words">{err.message}</div>
          <button onClick={()=>window.location.reload()} className="mt-4 bg-black text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase">Recargar</button>
        </div>
      );
    }
  };
  // Mismo FIX CRÍTICO que MovimientosView — ver comentario detallado más arriba.
  const _cajaOpViewImplRef = useRef(CajaOpViewImpl);
  _cajaOpViewImplRef.current = CajaOpViewImpl;
  const CajaOpView = useRef((props) => _cajaOpViewImplRef.current(props)).current;

  // ══════════════════════════════════════════════════════════════════════
  // 5a-bis. LIMPIAR DUPLICADOS DE CAJA (cobros/pagos que quedaron registrados
  // dos veces por el bug ya corregido en Aplicación.jsx)
  // ══════════════════════════════════════════════════════════════════════
  const LimpiarDuplicadosCajaView = () => {
    const [selec, setSelec] = useState({});
    const [busy, setBusy] = useState(false);
    const [pwd, setPwd] = useState('');
    const [pwdErr, setPwdErr] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [hecho, setHecho] = useState(0);

    // Un caja_movimientos es CANDIDATO a duplicado si su id tiene el prefijo que generaba el
    // código ya corregido (MVC- para cobros, MOVC-PAGCXP-/MOVC-ANTCXP- para pagos) y existe un
    // cobro/pago real (cobros_cxc / procura_pagos_cxp) con ese mismo grupo. Para cada candidato
    // se adjunta el registro con el que coincide, para poder comparar antes de decidir.
    const cobroPorGrupo = useMemo(()=>{ const m=new Map(); (cobrosCajaCxc||[]).forEach(c=>{if(c.grupoCobroId) m.set(c.grupoCobroId,c);}); return m; },[cobrosCajaCxc]);
    const pagoPorGrupo  = useMemo(()=>{ const m=new Map(); (pagosCajaCxP ||[]).forEach(p=>{if(p.grupoPagoId ) m.set(p.grupoPagoId ,p);}); return m; },[pagosCajaCxP]);
    const duplicados = useMemo(()=>{
      return (movCaja||[]).map(m=>{
        let match=null;
        if(/^MVC-/.test(m.id||'') && m.grupoCobroId) match=cobroPorGrupo.get(m.grupoCobroId);
        else if(/^MOVC-(PAGCXP|ANTCXP)-/.test(m.id||'') && m.grupoPagoId) match=pagoPorGrupo.get(m.grupoPagoId);
        if(!match) return null;
        const montoMatch=Number(match.monto??match.montoUSD??0);
        const coincideMonto=Math.abs(montoMatch-Number(m.montoUSD||0))<0.05;
        return {...m, _match:match, _coincideMonto:coincideMonto};
      }).filter(Boolean).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
    },[movCaja,cobroPorGrupo,pagoPorGrupo]);

    const seleccionados = duplicados.filter(d=>selec[d.id]);
    const totalUSD = seleccionados.reduce((s,d)=>s+Number(d.montoUSD||0),0);
    const cajaNom = (id)=>cajas.find(c=>c.id===id)?.nombre||id||'—';

    const ejecutarBorrado = async()=>{
      if(!await validarClaveAdmin(pwd)){ setPwdErr(true); setTimeout(()=>setPwdErr(false),1500); return; }
      setBusy(true);
      try{
        const batch=writeBatch(_bancoDB);
        seleccionados.forEach(d=>batch.delete(getDocRef('caja_movimientos',d.id)));
        await batch.commit();
        setHecho(seleccionados.length); setConfirmando(false); setPwd(''); setSelec({});
      } finally { setBusy(false); }
    };

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-black uppercase text-slate-900 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500"/> Limpiar Duplicados de Caja</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Compara cada movimiento de caja con el cobro/pago que supuestamente lo generó dos veces. Nada viene marcado por defecto — revisa y marca tú.</p>
        </div>

        {hecho>0&&(
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-500"/>
            <p className="text-sm font-black text-emerald-700">{hecho} duplicado(s) eliminado(s) correctamente.</p>
          </div>
        )}

        {duplicados.length===0?(
          <BEmptyState icon={CheckCircle} title="No se encontraron duplicados" desc="No hay movimientos de caja que coincidan con el patrón del bug ya corregido."/>
        ):(<>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs font-bold text-amber-800">{duplicados.length} candidato(s) encontrado(s) · {seleccionados.length} seleccionado(s) · Total: ${bancoFmt(totalUSD)}</p>
            <button onClick={()=>setSelec({})} className="text-[10px] font-black uppercase text-slate-500 hover:underline">Desmarcar todos</button>
          </div>

          <div className="space-y-3 mb-5">
            {duplicados.map(d=>(
              <div key={d.id} className={`rounded-2xl border-2 p-4 transition-all ${selec[d.id]?'border-red-300 bg-red-50/40':'border-slate-200 bg-white'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={!!selec[d.id]} onChange={e=>setSelec(p=>({...p,[d.id]:e.target.checked}))}/>
                  <div className="flex-1 min-w-0">
                    {!d._coincideMonto&&(
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-lg mb-2 w-fit">
                        <AlertTriangle size={11}/> Los montos no coinciden exactamente — revisa con más cuidado
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="border-2 border-slate-200 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Movimiento de Caja (candidato a borrar)</p>
                        <p className="text-[10px] font-mono text-slate-400 mb-1">{d.id}</p>
                        <p className="text-xs font-bold text-slate-800 truncate">{bancoDd(d.fecha)} · {d.tipo} · {cajaNom(d.cajaId)}</p>
                        <p className="text-[11px] text-slate-600 truncate">{d.concepto}{d.terceroNombre?` · ${d.terceroNombre}`:''}</p>
                        <p className="font-mono font-black text-sm mt-1">${bancoFmt(d.montoUSD||0)}</p>
                      </div>
                      <div className="border-2 border-blue-200 bg-blue-50/40 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase text-blue-500 mb-1.5">Cobro/Pago con el que coincide (este SÍ se conserva)</p>
                        <p className="text-[10px] font-mono text-slate-400 mb-1">{d._match.id}</p>
                        <p className="text-xs font-bold text-slate-800 truncate">{bancoDd(d._match.fecha)} · {d._match.clientName||d._match.proveedor||'—'}</p>
                        <p className="text-[11px] text-slate-600 truncate">{d._match.concepto||d._match.neDocumento||'—'}{d._match.referencia?` · Ref: ${d._match.referencia}`:''}</p>
                        <p className="font-mono font-black text-sm mt-1">${bancoFmt(Number(d._match.monto??d._match.montoUSD??0))}</p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>

          {!confirmando?(
            <button disabled={seleccionados.length===0} onClick={()=>setConfirmando(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 disabled:opacity-40">
              <Trash2 size={14}/> Eliminar {seleccionados.length} seleccionado(s)
            </button>
          ):(
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 max-w-md">
              <p className="text-xs font-black text-red-700 mb-2">Esta acción no se puede deshacer. Ingresa la clave de administrador para confirmar.</p>
              <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Clave admin"
                className={`w-full border-2 rounded-xl px-3 py-2 text-xs font-bold outline-none mb-3 ${pwdErr?'border-red-500':'border-slate-200 focus:border-red-400'}`}/>
              <div className="flex gap-2">
                <button onClick={()=>{setConfirmando(false);setPwd('');}} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200">Cancelar</button>
                <button onClick={ejecutarBorrado} disabled={busy} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">{busy?'Eliminando...':'Confirmar Eliminación'}</button>
              </div>
            </div>
          )}
        </>)}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // 5c. REPARAR TRASLADOS HISTÓRICOS — traslados de fondo (Banco→Banco,
  // Banco→Caja, Caja→Banco, Caja→Caja) registrados ANTES de que el lado
  // destino generara su propio asiento contable con Traslados de Fondos.
  // Es 100% ADITIVO: solo CREA el asiento que faltaba, nunca borra ni
  // modifica ningún asiento ya existente (el lado origen no se toca).
  // ══════════════════════════════════════════════════════════════════════
  const PagosPorIdentificarView = () => {
    const [ediciones, setEdiciones] = useState({}); // { [pagoId]: {fecha, tasa, cuentaDestino, montoBs, montoUSD} }
    const [procesando, setProcesando] = useState(null);
    const [busq, setBusq] = useState('');

    const gruposConMov = useMemo(() => {
      const s = new Set();
      (movBanco||[]).forEach(m => { if(m.grupoPagoId) s.add(m.grupoPagoId); });
      (movCaja||[]).forEach(m => { if(m.grupoPagoId) s.add(m.grupoPagoId); });
      return s;
    }, [movBanco, movCaja]);

    // Muestra TODOS los pendientes — incluyendo los que nunca tuvieron cuenta asignada (antes se
    // ocultaban). Uno sin cuenta aparece en Banco Y en Caja hasta que se le asigne una, porque no
    // hay forma de saber a cuál pertenece todavía.
    const pendientes = useMemo(() =>
      (pagosCxPTodos||[]).filter(p => {
        if((p.cuentaId||'').startsWith('ANTICIPO::')) return false;
        if(gruposConMov.has(p.grupoPagoId)) return false;
        const enCaja = (p.cuentaId||'').startsWith('CAJA::');
        const enBanco = !!p.cuentaId && !enCaja;
        const sinAsignar = !p.cuentaId;
        const pasaModulo = submodulo==='caja' ? (enCaja||sinAsignar) : (enBanco||sinAsignar);
        if(!pasaModulo) return false;
        if(busq){
          const q=busq.toUpperCase();
          if(!((p.proveedor||'').toUpperCase().includes(q)||(p.referencia||'').toUpperCase().includes(q)||(p.concepto||'').toUpperCase().includes(q))) return false;
        }
        return true;
      }).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')),
      [pagosCxPTodos, gruposConMov, busq, submodulo]
    );

    const edit = (p) => {
      if(ediciones[p.id]) return ediciones[p.id];
      const tasaDefault = Number(p.tasa || tasaActiva || 0) || 0;
      const monedaP = p.moneda||'USD';
      const montoBsDefault = monedaP==='Bs' ? Number(p.monto||0) : (tasaDefault>0 ? Number(p.monto||0)*tasaDefault : 0);
      const montoUSDDefault = monedaP==='Bs' ? (tasaDefault>0 ? Number(p.monto||0)/tasaDefault : 0) : Number(p.monto||0);
      return {
        fecha: p.fecha || getTodayDate(), tasa: String(tasaDefault||''), cuentaDestino: p.cuentaId || '',
        montoBs: montoBsDefault.toFixed(2), montoUSD: montoUSDDefault.toFixed(2),
      };
    };

    // Bs y USD quedan sincronizados por la tasa: editar uno recalcula el otro. Cambiar la tasa
    // recalcula el USD tomando el Bs como ancla (es lo que normalmente trae el estado de cuenta real).
    const setEditField = (p, field, value) => {
      setEdiciones(prev => {
        const cur = prev[p.id] || edit(p);
        const next = {...cur, [field]: value};
        if(field==='montoBs'){
          const t=Number(cur.tasa)||0; if(t>0) next.montoUSD=(Number(value||0)/t).toFixed(2);
        } else if(field==='montoUSD'){
          const t=Number(cur.tasa)||0; if(t>0) next.montoBs=(Number(value||0)*t).toFixed(2);
        } else if(field==='tasa'){
          const t=Number(value)||0; if(t>0) next.montoUSD=(Number(cur.montoBs||0)/t).toFixed(2);
        }
        return {...prev, [p.id]: next};
      });
    };

    const identificar = async (p) => {
      const e = edit(p);
      if(!e.cuentaDestino) return;
      setProcesando(p.id);
      try {
        const tasaP = Number(e.tasa)||1;
        const montoUSDP = Number(e.montoUSD)||0;
        const montoBsP = Number(e.montoBs)||0;
        const grupoPagoIdP = p.grupoPagoId || `GRP-RESTORE-${Date.now().toString(36)}`;
        const movId = `MOV-RESTORE-${Date.now().toString(36)}`;
        const esCaja = e.cuentaDestino.startsWith('CAJA::');
        const batch = writeBatch(_bancoDB);
        if(esCaja){
          const cajaId = e.cuentaDestino.replace('CAJA::','');
          const cajaObj = (cajas||[]).find(c=>c.id===cajaId);
          batch.set(getDocRef('caja_movimientos', movId), {
            id:movId, cajaId, cajaNombre:cajaObj?.nombre||'', moneda:cajaObj?.moneda||'USD',
            tipo:'Egreso', fecha:e.fecha, monto:montoUSDP, montoBs:montoBsP, montoUSD:montoUSDP, tasa:tasaP,
            concepto:p.concepto||'Pago CxP (identificado)', referencia:p.referencia||'', grupoPagoId:grupoPagoIdP,
            origenIngreso:'Identificado desde Banco — Pagos por Identificar', estatus:'No Conciliado', ts:Date.now(),
          });
        } else {
          const ctaObj = (cuentas||[]).find(c=>c.id===e.cuentaDestino);
          if(!ctaObj) throw new Error('Esa cuenta bancaria ya no existe — elige otra.');
          const saldoAnterior = Number(ctaObj.saldo||0);
          const saldoResultante = parseFloat((saldoAnterior - montoUSDP).toFixed(2));
          batch.set(getDocRef('banco_movimientos', movId), {
            id:movId, cuentaId:e.cuentaDestino, cuentaNombre:ctaObj.banco||'', tipoBanco:ctaObj.tipoBanco, moneda:ctaObj.moneda,
            tipo:'Egreso', fecha:e.fecha, montoNativo:montoUSDP, montoBs:montoBsP, montoUSD:montoUSDP, tasa:tasaP,
            concepto:p.concepto||'Pago CxP (identificado)', referencia:p.referencia||'', grupoPagoId:grupoPagoIdP,
            origenIngreso:'Identificado desde Banco — Pagos por Identificar',
            saldoAnterior, saldoResultante, estatus:'No Conciliado', ts:Date.now(),
          });
          batch.update(getDocRef('banco_cuentas', ctaObj.id), {saldo: saldoResultante});
        }
        batch.update(getDocRef('procura_pagos_cxp', p.id), {grupoPagoId:grupoPagoIdP, cuentaId:e.cuentaDestino, fecha:e.fecha, tasa:tasaP, monto:montoUSDP, montoBs:montoBsP, moneda:'USD'});
        await batch.commit();
        setEdiciones(prev => { const n={...prev}; delete n[p.id]; return n; });
      } catch(err){ alert('Error: '+err.message); }
      finally { setProcesando(null); }
    };

    const eliminarPendiente = async (p) => {
      const e = edit(p);
      if(!window.confirm(`¿Eliminar este registro de "${p.proveedor||'—'}" por $${bancoFmt(Number(e.montoUSD||0))}?\n\nSe borra de Historial de Pagos y no se crea ningún movimiento en Banco/Caja. Úsalo solo si está repetido o es un error — no si el pago sí ocurrió.`)) return;
      setProcesando(p.id);
      try {
        await deleteDoc(getDocRef('procura_pagos_cxp', p.id));
        setEdiciones(prev => { const n={...prev}; delete n[p.id]; return n; });
      } catch(err){ alert('Error: '+err.message); }
      finally { setProcesando(null); }
    };

    return (
      <div>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black uppercase text-slate-900">Pagos por Identificar</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Pagos de Historial de Pago (Procura) sin movimiento en Banco o Caja — asígnales su cuenta a medida que los reconozcas contra tu estado de cuenta real. {pendientes.length} pendiente(s).</p>
          </div>
          <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="Buscar proveedor, referencia, concepto..." className={`${inp} w-64`}/>
        </div>
        {pendientes.length===0 ? (
          <BEmptyState icon={Inbox} title="Nada por identificar" desc="Todos los pagos de Historial de Pago ya tienen su movimiento en Banco o Caja"/>
        ) : (
          <div className="space-y-3">
            {pendientes.map(p=>{
              const e = edit(p);
              return (
                <div key={p.id} className="bg-white rounded-2xl border-2 border-amber-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Proveedor / Concepto</label>
                      <p className="font-black text-sm text-slate-800 truncate" title={p.proveedor}>{p.proveedor||'—'}</p>
                      <p className="text-[10px] text-slate-400 truncate" title={p.concepto}>{p.concepto||'—'}{p.referencia?` · Ref: ${p.referencia}`:''}{p.esAnticipo?' · Anticipo':''}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Fecha</label>
                      <input type="date" className={inp} value={e.fecha} onChange={ev=>setEditField(p,'fecha',ev.target.value)}/>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Tasa Bs/$</label>
                      <input type="number" step="0.0001" className={inp} value={e.tasa} onChange={ev=>setEditField(p,'tasa',ev.target.value)}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Monto Bs.</label>
                      <input type="number" step="0.01" className={inp} value={e.montoBs} onChange={ev=>setEditField(p,'montoBs',ev.target.value)}/>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-emerald-600 uppercase block mb-1">Monto USD</label>
                      <input type="number" step="0.01" className={`${inp} font-black text-emerald-700`} value={e.montoUSD} onChange={ev=>setEditField(p,'montoUSD',ev.target.value)}/>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Asignar a</label>
                      <select value={e.cuentaDestino} onChange={ev=>setEditField(p,'cuentaDestino',ev.target.value)} className={`${sel} ${!e.cuentaDestino?'border-red-300 bg-red-50':''}`}>
                        <option value="">⚠ Sin asignar</option>
                        {(cuentas||[]).map(c=><option key={c.id} value={c.id}>{c.banco}{c.numeroCuenta?` — ${String(c.numeroCuenta).slice(-4)}`:''}</option>)}
                        {(cajas||[]).map(c=><option key={c.id} value={`CAJA::${c.id}`}>{c.nombre} (Caja)</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button disabled={procesando===p.id} onClick={()=>eliminarPendiente(p)} title="Eliminar (duplicado o error — no crea movimiento)" className="flex items-center justify-center w-10 h-10 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white disabled:opacity-40 transition-all shrink-0">
                        <Trash2 size={15}/>
                      </button>
                      <button disabled={!e.cuentaDestino||procesando===p.id} onClick={()=>identificar(p)} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        <CheckCircle size={13}/> {procesando===p.id?'...':'Identificar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const RepararTrasladosView = () => {
    const [selec, setSelec] = useState({});
    const [busy, setBusy] = useState(false);
    const [pwd, setPwd] = useState('');
    const [pwdErr, setPwdErr] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [hecho, setHecho] = useState(0);

    const ctaTrasladosObj = (contCuentas||[]).find(c=>/traslado.*fondo|fondo.*traslado/i.test(c.nombre||''))||(contCuentas||[]).find(c=>String(c.codigo)==='1.1.01.02.012');
    const codTraslados = ctaTrasladosObj?String(ctaTrasladosObj.codigo||ctaTrasladosObj.id||''):'1.1.01.02.012';
    const nomTraslados = ctaTrasladosObj?ctaTrasladosObj.nombre:'Traslados de Fondos';

    // Candidato = movimiento de Ingreso, sin asientoContableId propio, cuyo concepto coincide
    // con el texto que generaban las versiones viejas del traslado ("Transferencia recibida
    // desde..." / "Traslado recibido desde...", con o sin mayúsculas).
    const esCandidato = m => m.tipo==='Ingreso' && !m.asientoContableId && /^(traslado|transferencia) recibid[oa] desde/i.test(m.concepto||'');
    const candidatosBanco = useMemo(()=>(movBanco||[]).filter(esCandidato).map(m=>{
      const cta=cuentas.find(c=>c.id===m.cuentaId);
      return {...m, _origen:'banco', _ctaCod:cta?.cuentaContableCod||'', _ctaNom:cta?.cuentaContableNom||cta?.banco||m.cuentaNombre||'—'};
    }),[movBanco,cuentas]);
    const candidatosCaja = useMemo(()=>(movCaja||[]).filter(esCandidato).map(m=>{
      const c=cajas.find(x=>x.id===m.cajaId);
      return {...m, _origen:'caja', _ctaCod:c?.cuentaContableCod||'', _ctaNom:c?.cuentaContableNom||c?.nombre||m.cajaNombre||'—'};
    }),[movCaja,cajas]);
    const candidatos = [...candidatosBanco,...candidatosCaja].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));

    const seleccionados = candidatos.filter(c=>selec[c.id]);
    const totalUSD = seleccionados.reduce((s,c)=>s+Number(c.montoUSD||0),0);

    const ejecutarReparacion = async()=>{
      if(!await validarClaveAdmin(pwd)){ setPwdErr(true); setTimeout(()=>setPwdErr(false),1500); return; }
      setBusy(true);
      try{
        const batch=writeBatch(_bancoDB);
        seleccionados.forEach(m=>{
          const asientoId=bancoGid();
          const montoBs=Number(m.montoBs||0), montoUSD=Number(m.montoUSD||0);
          const tasa=Number(m.tasa)||1;
          const conc=m.concepto||'';
          batch.set(getDocRef('cont_asientos',asientoId),{
            id:asientoId, comprobante:`CB-${(m.fecha||'').substring(0,7).replace('-','')}-${m.id.slice(-4).toUpperCase()}`,
            numero:`CB-${(m.fecha||'').substring(0,7).replace('-','')}-${m.id.slice(-4).toUpperCase()}`,
            mes:(m.fecha||'').substring(5,7)+'/'+(m.fecha||'').substring(0,4), fecha:m.fecha,
            tipo:'Traslado', subTipo:'Traslado de Fondo', nroDocumento:m.referencia||'',
            descripcion:conc.toUpperCase(), tasa, niif:false, efectivo:m._origen==='caja',
            modulo: m._origen==='caja'?'Caja':'Bancos',
            movimientoBancoId: m._origen==='caja'?'':m.id, movimientoCajaId: m._origen==='caja'?m.id:'',
            lineas:[
              {codigo:m._ctaCod,cuenta:m._ctaNom,tipoLinea:'D',nroDoc:m.referencia||'',concepto:conc,tasa,debeBs:montoBs,haberBs:0,debeUSD:montoUSD,haberUSD:0},
              {codigo:codTraslados,cuenta:nomTraslados,tipoLinea:'H',nroDoc:m.referencia||'',concepto:conc,tasa,debeBs:0,haberBs:montoBs,debeUSD:0,haberUSD:montoUSD},
            ],
            totalDebeBs:montoBs, totalHaberBs:montoBs, totalDebeUSD:montoUSD, totalHaberUSD:montoUSD,
            ts:serverTimestamp(), reparadoRetroactivamente:true,
          });
          batch.update(getDocRef(m._origen==='caja'?'caja_movimientos':'banco_movimientos', m.id), {asientoContableId:asientoId});
        });
        await batch.commit();
        setHecho(seleccionados.length); setConfirmando(false); setPwd(''); setSelec({});
      } finally { setBusy(false); }
    };

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-black uppercase text-slate-900 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500"/> Reparar Traslados Históricos</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Traslados de fondo recibidos ANTES de que existiera el asiento de destino con Traslados de Fondos. Solo CREA el asiento que faltaba — no borra ni modifica nada existente. Nada viene marcado por defecto.</p>
        </div>

        {hecho>0&&(
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-500"/>
            <p className="text-sm font-black text-emerald-700">{hecho} traslado(s) reparado(s) correctamente.</p>
          </div>
        )}

        {candidatos.length===0?(
          <BEmptyState icon={CheckCircle} title="Nada que reparar" desc="No se encontraron traslados recibidos sin asiento de destino"/>
        ):(
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
              <table className="w-full">
                <thead><tr><BTh/><BTh>Fecha</BTh><BTh>Origen</BTh><BTh>Cuenta Destino</BTh><BTh>Concepto</BTh><BTh right>Monto</BTh></tr></thead>
                <tbody>
                  {candidatos.map(c=>(
                    <tr key={c.id} className="hover:bg-slate-50">
                      <BTd><input type="checkbox" checked={!!selec[c.id]} onChange={()=>setSelec(p=>({...p,[c.id]:!p[c.id]}))} className="w-4 h-4 accent-orange-500"/></BTd>
                      <BTd>{bancoDd(c.fecha)}</BTd>
                      <BTd><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${c._origen==='banco'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700'}`}>{c._origen}</span></BTd>
                      <BTd className="font-black">{c._ctaNom}</BTd>
                      <BTd className="max-w-[280px] truncate" title={c.concepto}>{c.concepto}</BTd>
                      <BTd right mono className="font-black text-emerald-600">${bancoFmt(c.montoUSD)}</BTd>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between bg-slate-900 rounded-xl p-4">
              <span className="text-white text-xs font-black uppercase">{seleccionados.length} de {candidatos.length} seleccionado(s) · ${bancoFmt(totalUSD)}</span>
              <button disabled={seleccionados.length===0} onClick={()=>setConfirmando(true)} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-black uppercase hover:bg-orange-600 disabled:opacity-40">Reparar Seleccionados</button>
            </div>
          </>
        )}

        {confirmando&&(
          <BModal open={true} onClose={()=>{setConfirmando(false);setPwd('');setPwdErr(false);}} title="Confirmar reparación"
            footer={<><BBo onClick={()=>{setConfirmando(false);setPwd('');}}>Cancelar</BBo><BBg onClick={ejecutarReparacion} disabled={busy}>{busy?'Reparando...':'Confirmar'}</BBg></>}>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <AlertTriangle size={24} className="text-amber-500 mx-auto mb-2"/>
                <p className="font-black text-slate-800">Se creará el asiento de destino para {seleccionados.length} traslado(s)</p>
                <p className="text-xs text-slate-500 mt-1">Total: ${bancoFmt(totalUSD)} — esta acción no se puede deshacer</p>
              </div>
              <BFG label="Clave de administrador">
                <input type="password" className={`${inp} ${pwdErr?'border-red-500 bg-red-50':''}`} value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Su contraseña de usuario" onKeyDown={e=>e.key==='Enter'&&ejecutarReparacion()}/>
                {pwdErr&&<p className="text-red-500 text-[10px] font-black mt-1">Clave incorrecta</p>}
              </BFG>
            </div>
          </BModal>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // RESUMEN DE OPERACIONES BANCO-CAJA — consolidado multimoneda con tasa
  // manual editable, categorizado igual que el resto de selectores, más
  // vales pendientes. Reutiliza EXACTAMENTE la misma fórmula de saldo de
  // caja que CuentasCajaView (saldoInicial + movimientos + cobros/pagos
  // CxC/CxP enrutados a la caja) para que las cifras cuadren con el resto.
  // ══════════════════════════════════════════════════════════════════════
  const ResumenOperacionesView = () => {
    const [tasaManual, setTasaManual] = useState(String(tasaActiva||''));
    const [tasaBinance, setTasaBinance] = useState('');
    const [tasaIntervencion, setTasaIntervencion] = useState('');
    const [ocultarCeros, setOcultarCeros] = useState(false);
    const [valesRes, setValesRes] = useState([]);
    useEffect(()=>{
      const u = onSnapshot(query(getColRef('caja_vales'),orderBy('fecha','desc')), s=>setValesRes(s.docs.map(d=>d.data())));
      return ()=>u();
    },[]);
    // ── Histórico del Resumen: guardar el consolidado de HOY, y poder buscarlo por rango de
    // fecha más adelante — igual que un "cierre" del día que se puede volver a consultar. ──
    const [historialResumen, setHistorialResumen] = useState(null); // null=cerrado, []=vacío, [...]=resultados
    const [histDesde, setHistDesde] = useState(getTodayDate());
    const [histHasta, setHistHasta] = useState(getTodayDate());
    const [histVer, setHistVer] = useState(null); // snapshot puntual que se está viendo

    const tasa = Number(tasaManual)||0;
    const tBin = Number(tasaBinance)||0;
    const tInt = Number(tasaIntervencion)||0;
    const convBs = (montoNativo, moneda) => moneda==='BS' ? montoNativo : montoNativo*tasa;
    const convUsd = (montoNativo, moneda) => moneda==='BS' ? (tasa>0?montoNativo/tasa:0) : montoNativo;
    // A cuántos $ equivale un monto en Bs. si se convierte con la tasa Binance o de Intervención
    // en vez de la tasa del día — para comparar el mismo saldo bajo las 3 tasas.
    const usdBin = (montoBsNativo) => tBin>0 ? montoBsNativo/tBin : 0;
    const usdInt = (montoBsNativo) => tInt>0 ? montoBsNativo/tInt : 0;
    const variacionAbs = tBin - tasa;
    const variacionPct = tasa>0 ? (variacionAbs/tasa*100) : 0;

    const GRUPOS = [
      {tipo:'Nacional-Bs',        label:'🇻🇪 Cuentas Nacionales — Bolívares'},
      {tipo:'Nacional-Ext',       label:'💵 Cuentas Moneda Extranjera'},
      {tipo:'Internacional',     label:'🌐 Cuentas Internacionales'},
      {tipo:'Electronica',       label:'💳 Cuentas Electrónicas'},
      {tipo:'Tarjeta-Debito-Intl',label:'🪪 Tarjetas de Débito Internacionales'},
      {tipo:'Pago-Movil',        label:'📱 Pago Móvil'},
    ];

    const bancosPorGrupo = GRUPOS.map(g=>{
      const lista = cuentas.filter(c=>g.tipo==='Pago-Movil'?(c.tipoBanco==='Pago-Movil'||c.tipoBanco==='Pago Móvil'):c.tipoBanco===g.tipo)
        .filter(c=>!ocultarCeros || Math.abs(Number(c.saldo||0))>=0.01)
        .map(c=>({ ...c, sBs: convBs(Number(c.saldo||0), c.moneda), sUsd: convUsd(Number(c.saldo||0), c.moneda) }));
      return { ...g, lista, subBs: lista.reduce((a,c)=>a+c.sBs,0), subUsd: lista.reduce((a,c)=>a+c.sUsd,0) };
    }).filter(g=>g.lista.length>0);
    const totalBancosBs = bancosPorGrupo.reduce((s,g)=>s+g.subBs,0);
    const totalBancosUsd = bancosPorGrupo.reduce((s,g)=>s+g.subUsd,0);

    const getSaldoCajaRes = (cajaId)=>{
      const esBs = m => String(m||'').toUpperCase()==='BS';
      const movs = movCaja.filter(m=>m.cajaId===cajaId);
      const bs  = movs.filter(m=>esBs(m.moneda)).reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoBs||0),0);
      const usd = movs.filter(m=>!esBs(m.moneda)).reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoUSD||0),0);
      const cobrosCaja = (cobrosCajaCxc||[]).filter(c=>(c.cuentaBancariaId||'').replace('CAJA::','')===cajaId && !(c.grupoCobroId && movCaja.some(m=>m.grupoCobroId===c.grupoCobroId)));
      const bsCobros  = cobrosCaja.filter(c=>esBs(c.moneda)).reduce((a,c)=>{const t=Number(c.tasa||tasaActiva)||tasaActiva;return a+(Number(c.montoBs||0)||(Number(c.monto||0)*t));},0);
      const usdCobros = cobrosCaja.filter(c=>!esBs(c.moneda)).reduce((a,c)=>a+Number(c.monto||0),0);
      const pagosCaja = (pagosCajaCxP||[]).filter(p=>(p.cuentaId||'').replace('CAJA::','')===cajaId && !(p.grupoPagoId && movCaja.some(m=>m.grupoPagoId===p.grupoPagoId)));
      const bsPagos  = pagosCaja.filter(p=>esBs(p.moneda)).reduce((a,p)=>{const t=Number(p.tasa||tasaActiva)||tasaActiva;return a+(Number(p.montoBs||0)||(Number(p.monto||0)*t));},0);
      const usdPagos = pagosCaja.filter(p=>!esBs(p.moneda)).reduce((a,p)=>a+Number(p.monto||0),0);
      return {bs: bs+bsCobros-bsPagos, usd: usd+usdCobros-usdPagos};
    };
    const cajasLista = (cajas||[]).map(c=>{
      const saldo = getSaldoCajaRes(c.id);
      const saldoVal = c.moneda==='BS'?saldo.bs:saldo.usd;
      const saldoTotalNativo = (Number(c.saldoInicial)||0) + saldoVal;
      return { ...c, saldoTotalNativo, sBs: convBs(saldoTotalNativo, c.moneda), sUsd: convUsd(saldoTotalNativo, c.moneda) };
    }).filter(c=>!ocultarCeros || Math.abs(c.saldoTotalNativo)>=0.01);
    const totalCajasBs = cajasLista.reduce((a,c)=>a+c.sBs,0);
    const totalCajasUsd = cajasLista.reduce((a,c)=>a+c.sUsd,0);

    const valesPendientes = (valesRes||[]).filter(v=>v.estado==='Pendiente');
    const totalValesUsd = valesPendientes.reduce((a,v)=>a+Number(v.montoUSD||(v.moneda==='BS'?(tasa>0?Number(v.monto||0)/tasa:0):Number(v.monto||0))),0);

    const granTotalBs = totalBancosBs+totalCajasBs;
    const granTotalUsd = totalBancosUsd+totalCajasUsd;
    // Mismos totales en Bs., pero convertidos a Binance e Intervención — para comparar cuánto
    // "rinde" el mismo saldo bajo cada tasa.
    const totalBancosBin = usdBin(totalBancosBs), totalBancosInt = usdInt(totalBancosBs);
    const totalCajasBin = usdBin(totalCajasBs), totalCajasInt = usdInt(totalCajasBs);
    const granTotalBin = usdBin(granTotalBs), granTotalInt = usdInt(granTotalBs);

    const buildHTML = () => {
      const filasBancos = bancosPorGrupo.map(g=>`
        <tr><td colspan="6" style="background:#f1f5f9;font-weight:900;font-size:9px;text-transform:uppercase;padding:6px 10px">${g.label}</td></tr>
        ${g.lista.map(c=>`<tr><td>${c.banco||'—'}</td><td>${c.numeroCuenta||'—'}</td><td style="text-align:center">${c.moneda}</td><td style="text-align:right">${c.moneda==='BS'?'Bs.':'$'}${bancoFmt(c.saldo)}</td><td style="text-align:right;color:#16a34a">Bs.${bancoFmt(c.sBs)}</td><td style="text-align:right;color:#16a34a;font-weight:900">$${bancoFmt(c.sUsd)}</td></tr>`).join('')}
        <tr style="background:#f8fafc"><td colspan="4" style="font-weight:900;text-align:right;padding:6px 10px">Subtotal ${g.label}</td><td style="text-align:right;font-weight:900">Bs.${bancoFmt(g.subBs)}</td><td style="text-align:right;font-weight:900">$${bancoFmt(g.subUsd)}</td></tr>
      `).join('');
      const filasCajas = cajasLista.map(c=>`<tr><td>${c.nombre||'—'}</td><td style="text-align:center">${c.moneda}</td><td style="text-align:right">${c.moneda==='BS'?'Bs.':'$'}${bancoFmt(c.saldoTotalNativo)}</td><td style="text-align:right;color:#16a34a">Bs.${bancoFmt(c.sBs)}</td><td style="text-align:right;color:#16a34a;font-weight:900">$${bancoFmt(c.sUsd)}</td></tr>`).join('');
      const filasVales = valesPendientes.map(v=>`<tr><td>${bancoDd(v.fecha)}</td><td>${v.titular||'—'}</td><td>${v.concepto||'—'}</td><td style="text-align:right;font-weight:900;color:#dc2626">${v.moneda==='BS'?'Bs.':'$'}${bancoFmt(v.monto)}</td></tr>`).join('');
      const tablaVariacion = (tasa>0||tBin>0) ? `
        <h3>Variación de Tasa</h3>
        <table style="max-width:320px"><tbody>
          <tr><td style="font-weight:900">${bancoFmt(tasa)}</td><td style="text-align:right;font-weight:900;color:#2563eb">BCV</td></tr>
          <tr><td style="font-weight:900">${bancoFmt(tBin)}</td><td style="text-align:right;font-weight:900;color:#d97706">BINANCE</td></tr>
          <tr><td style="font-weight:900;color:#dc2626">${bancoFmt(Math.abs(variacionAbs))}</td><td style="text-align:right;font-weight:900;color:#dc2626">${variacionPct.toFixed(2)}%</td></tr>
        </tbody></table>` : '';
      const filaEquivRates = (etiqueta,bin,intv) => (tBin>0||tInt>0) ? `<tr><td colspan="3" style="text-align:right;font-style:italic;color:#64748b">${etiqueta}${tBin>0?` · A Binance: $${bancoFmt(bin)}`:''}${tInt>0?` · A Intervención: $${bancoFmt(intv)}`:''}</td></tr>` : '';
      return bancoLetterheadOpen('Resumen de Operaciones Banco-Caja',`Tasa BCV: ${bancoFmt(tasa)} Bs/$ · Generado ${bancoDd(getTodayDate())}`)+
        `<style>table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:18px}th{background:#0f172a;color:#e2e8f0;padding:6px 10px;text-align:left;font-size:8px;text-transform:uppercase;white-space:nowrap}td{padding:5px 10px;border-bottom:1px solid #e2e8f0}h3{font-size:12px;font-weight:900;text-transform:uppercase;margin:14px 0 6px;color:#0f172a}</style>
        ${tablaVariacion}
        <h3>🏦 Bancos</h3>
        <table><thead><tr><th>Banco</th><th>N° Cuenta</th><th>Moneda</th><th style="text-align:right">Saldo Nativo</th><th style="text-align:right">Equiv. Bs.</th><th style="text-align:right">Equiv. $</th></tr></thead>
        <tbody>${filasBancos}</tbody>
        <tfoot><tr style="background:#0f172a"><td colspan="4" style="color:#fff;font-weight:900;text-align:right">TOTAL BANCOS</td><td style="color:#4ade80;font-weight:900;text-align:right">Bs.${bancoFmt(totalBancosBs)}</td><td style="color:#4ade80;font-weight:900;text-align:right">$${bancoFmt(totalBancosUsd)}</td></tr>${filaEquivRates('',totalBancosBin,totalBancosInt)}</tfoot></table>
        <h3>💰 Cajas</h3>
        <table><thead><tr><th>Caja</th><th>Moneda</th><th style="text-align:right">Saldo Nativo</th><th style="text-align:right">Equiv. Bs.</th><th style="text-align:right">Equiv. $</th></tr></thead>
        <tbody>${filasCajas||'<tr><td colspan="5" style="text-align:center;color:#94a3b8">Sin cajas registradas</td></tr>'}</tbody>
        <tfoot><tr style="background:#0f172a"><td colspan="3" style="color:#fff;font-weight:900;text-align:right">TOTAL CAJAS</td><td style="color:#4ade80;font-weight:900;text-align:right">Bs.${bancoFmt(totalCajasBs)}</td><td style="color:#4ade80;font-weight:900;text-align:right">$${bancoFmt(totalCajasUsd)}</td></tr>${filaEquivRates('',totalCajasBin,totalCajasInt)}</tfoot></table>
        <h3>📋 Vales Pendientes (${valesPendientes.length})</h3>
        <table><thead><tr><th>Fecha</th><th>Titular</th><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
        <tbody>${filasVales||'<tr><td colspan="4" style="text-align:center;color:#94a3b8">Sin vales pendientes</td></tr>'}</tbody></table>
        <table style="margin-top:20px"><tfoot><tr style="background:#f97316"><td style="color:#fff;font-weight:900;text-align:right;font-size:12px;padding:10px">TOTAL GENERAL BANCO + CAJA</td><td style="color:#fff;font-weight:900;text-align:right;font-size:12px;padding:10px">Bs.${bancoFmt(granTotalBs)}</td><td style="color:#fff;font-weight:900;text-align:right;font-size:12px;padding:10px">$${bancoFmt(granTotalUsd)}</td></tr>${(tBin>0||tInt>0)?`<tr style="background:#1e293b">${tBin>0?`<td colspan="2" style="color:#fbbf24;font-weight:700;text-align:right;padding:6px 10px">A Tasa Binance</td><td style="color:#fbbf24;font-weight:900;text-align:right;padding:6px 10px">$${bancoFmt(granTotalBin)}</td>`:'<td colspan="3"></td>'}</tr>`:''}${(tInt>0)?`<tr style="background:#1e293b"><td colspan="2" style="color:#c4b5fd;font-weight:700;text-align:right;padding:6px 10px">A Tasa Intervención</td><td style="color:#c4b5fd;font-weight:900;text-align:right;padding:6px 10px">$${bancoFmt(granTotalInt)}</td></tr>`:''}</tfoot></table>`+
        bancoLetterheadClose('Módulo: Tesorería & Bancos');
    };
    const imprimirPDF = () => bancoPrintWindow(buildHTML());
    const imprimirXLS = () => { const h=buildHTML(); const b=new Blob([h],{type:'application/vnd.ms-excel;charset=utf-8'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`resumen_banco_caja_${getTodayDate()}.xls`; a.click(); URL.revokeObjectURL(u); };

    // Guarda el consolidado de HOY tal cual se ve ahora mismo — un doc por fecha, se sobreescribe
    // si ya se guardó hoy (para no llenar el historial de duplicados si se guarda varias veces).
    const guardarHistoricoResumen = async () => {
      try{
        const snapshot = {
          fecha: getTodayDate(), tasa, tasaBinance:tBin, tasaIntervencion:tInt,
          bancosPorGrupo: bancosPorGrupo.map(g=>({label:g.label, subBs:g.subBs, subUsd:g.subUsd, cuentas:g.lista.map(c=>({banco:c.banco,numeroCuenta:c.numeroCuenta,moneda:c.moneda,saldo:c.saldo,sBs:c.sBs,sUsd:c.sUsd}))})),
          cajasLista: cajasLista.map(c=>({nombre:c.nombre,moneda:c.moneda,saldoTotalNativo:c.saldoTotalNativo,sBs:c.sBs,sUsd:c.sUsd})),
          totalBancosBs, totalBancosUsd, totalCajasBs, totalCajasUsd, granTotalBs, granTotalUsd,
          valesPendientes: valesPendientes.map(v=>({fecha:v.fecha,titular:v.titular,concepto:v.concepto,moneda:v.moneda,monto:v.monto})),
          totalValesUsd, guardadoEn: Date.now(),
        };
        await setDoc(getDocRef('resumen_banco_caja_historico', getTodayDate()), snapshot);
        alert(`✅ Guardado el cierre de hoy (${bancoDd(getTodayDate())}) — total consolidado Bs.${bancoFmt(granTotalBs)} / $${bancoFmt(granTotalUsd)}.`);
      }catch(e){ alert('❌ No se pudo guardar: '+(e?.message||e)); }
    };
    const buscarHistoricoResumen = async () => {
      try{
        const q = query(getColRef('resumen_banco_caja_historico'), orderBy('fecha','desc'));
        const s = await getDocs(q);
        const todos = s.docs.map(d=>d.data());
        setHistorialResumen(todos.filter(h=>(!histDesde||h.fecha>=histDesde) && (!histHasta||h.fecha<=histHasta)));
      }catch(e){ alert('❌ No se pudo buscar el historial: '+(e?.message||e)); }
    };
    const imprimirHistoricoSnapshot = (h) => {
      const filasBancos = (h.bancosPorGrupo||[]).map(g=>`
        <tr><td colspan="6" style="background:#f1f5f9;font-weight:900;font-size:9px;text-transform:uppercase;padding:6px 10px">${g.label}</td></tr>
        ${(g.cuentas||[]).map(c=>`<tr><td>${c.banco||'—'}</td><td>${c.numeroCuenta||'—'}</td><td style="text-align:center">${c.moneda}</td><td style="text-align:right">${c.moneda==='BS'?'Bs.':'$'}${bancoFmt(c.saldo)}</td><td style="text-align:right;color:#16a34a">Bs.${bancoFmt(c.sBs)}</td><td style="text-align:right;color:#16a34a;font-weight:900">$${bancoFmt(c.sUsd)}</td></tr>`).join('')}
        <tr style="background:#f8fafc"><td colspan="4" style="font-weight:900;text-align:right;padding:6px 10px">Subtotal ${g.label}</td><td style="text-align:right;font-weight:900">Bs.${bancoFmt(g.subBs)}</td><td style="text-align:right;font-weight:900">$${bancoFmt(g.subUsd)}</td></tr>
      `).join('');
      const filasCajas = (h.cajasLista||[]).map(c=>`<tr><td>${c.nombre||'—'}</td><td style="text-align:center">${c.moneda}</td><td style="text-align:right">${c.moneda==='BS'?'Bs.':'$'}${bancoFmt(c.saldoTotalNativo)}</td><td style="text-align:right;color:#16a34a">Bs.${bancoFmt(c.sBs)}</td><td style="text-align:right;color:#16a34a;font-weight:900">$${bancoFmt(c.sUsd)}</td></tr>`).join('');
      const html = bancoLetterheadOpen('Resumen de Operaciones Banco-Caja (Histórico)',`Cierre del ${bancoDd(h.fecha)} · Tasa BCV: ${bancoFmt(h.tasa)} Bs/$ · Guardado ${new Date(h.guardadoEn).toLocaleString('es-VE')}`)+
        `<h3>Bancos</h3><table><thead><tr><th>Banco</th><th>N° Cuenta</th><th>Moneda</th><th>Saldo</th><th>Bs.</th><th>$</th></tr></thead><tbody>${filasBancos}</tbody></table>`+
        `<h3>Cajas</h3><table><thead><tr><th>Caja</th><th>Moneda</th><th>Saldo</th><th>Bs.</th><th>$</th></tr></thead><tbody>${filasCajas}</tbody></table>`+
        `<h3>Gran Total</h3><table><tbody><tr><td style="font-weight:900">TOTAL CONSOLIDADO</td><td style="text-align:right;font-weight:900">Bs.${bancoFmt(h.granTotalBs)}</td><td style="text-align:right;font-weight:900">$${bancoFmt(h.granTotalUsd)}</td></tr></tbody></table>`+
        bancoLetterheadClose();
      const win = window.open('', '_blank'); win.document.write(html); win.document.close(); setTimeout(()=>win.print(),400);
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
          <div>
            <h2 className="text-xl font-black uppercase text-slate-900">Resumen de Operaciones Banco-Caja</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Consolidado multimoneda · {bancoDd(getTodayDate())}</p>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Tasa BCV / Día (Bs/$)</label>
              <div className="flex gap-1.5">
                <input type="number" step="0.01" value={tasaManual} onChange={e=>setTasaManual(e.target.value)} placeholder="Ej. 40.00" className={`${inp} w-28 font-black text-center`}/>
                <button onClick={async()=>{ const t=await fetchTasaBCV(getTodayDate()); if(t) setTasaManual(String(t)); }} disabled={fetchingBCV} title="Consultar tasa BCV de hoy" className="shrink-0 w-9 flex items-center justify-center border-2 border-slate-200 rounded-xl bg-white hover:bg-blue-50 disabled:cursor-not-allowed">
                  <RefreshCw size={13} className={`text-blue-500 ${fetchingBCV?'animate-spin':''}`}/>
                </button>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Tasa Binance (Bs/$)</label>
              <input type="number" step="0.01" value={tasaBinance} onChange={e=>setTasaBinance(e.target.value)} placeholder="Ej. 45.00" className={`${inp} w-32 font-black text-center border-amber-300`}/>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Tasa Intervención (Bs/$)</label>
              <input type="number" step="0.01" value={tasaIntervencion} onChange={e=>setTasaIntervencion(e.target.value)} placeholder="Ej. 42.00" className={`${inp} w-32 font-black text-center border-violet-300`}/>
            </div>
            <button onClick={()=>setOcultarCeros(v=>!v)} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-colors ${ocultarCeros?'bg-slate-800 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {ocultarCeros?<Eye size={12}/>:<EyeOff size={12}/>} {ocultarCeros?'Mostrar saldos en $0':'Ocultar saldos en $0'}
            </button>
            <button onClick={imprimirPDF} className="flex items-center gap-1.5 px-3 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-700"><Download size={12}/> PDF</button>
            <button onClick={imprimirXLS} className="flex items-center gap-1.5 px-3 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={12}/> Excel</button>
            <button onClick={guardarHistoricoResumen} title="Guarda el consolidado de hoy para poder buscarlo después" className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-900"><Save size={12}/> Guardar Histórico</button>
            <button onClick={()=>{setHistorialResumen(null); buscarHistoricoResumen();}} className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200"><Search size={12}/> Ver Histórico</button>
          </div>
        </div>

        {historialResumen!==null && (
          <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 flex flex-wrap items-end gap-3">
              <p className="text-white font-black text-[10px] uppercase tracking-widest mr-auto">📅 Histórico de Cierres</p>
              <div><label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Desde</label><input type="date" value={histDesde} onChange={e=>setHistDesde(e.target.value)} className="rounded-lg px-2 py-1 text-[10px] font-bold"/></div>
              <div><label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Hasta</label><input type="date" value={histHasta} onChange={e=>setHistHasta(e.target.value)} className="rounded-lg px-2 py-1 text-[10px] font-bold"/></div>
              <button onClick={buscarHistoricoResumen} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[9px] font-black uppercase">Buscar</button>
              <button onClick={()=>setHistorialResumen(null)} className="px-3 py-1.5 text-slate-400 hover:text-white text-[9px] font-black uppercase">✕ Cerrar</button>
            </div>
            {historialResumen.length===0 ? (
              <div className="text-center py-8 text-slate-400 font-bold text-sm">Sin cierres guardados en ese rango.</div>
            ) : (
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                  <th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-right">Tasa BCV</th><th className="px-3 py-2 text-right">Total Bs.</th><th className="px-3 py-2 text-right">Total $</th><th className="px-3 py-2 text-center">Guardado</th><th className="px-3 py-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {historialResumen.map((h,i)=>(
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-black">{bancoDd(h.fecha)}</td>
                      <td className="px-3 py-2 text-right font-mono">{bancoFmt(h.tasa)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-blue-700">Bs.{bancoFmt(h.granTotalBs)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-emerald-600">${bancoFmt(h.granTotalUsd)}</td>
                      <td className="px-3 py-2 text-center text-slate-400 text-[10px]">{new Date(h.guardadoEn).toLocaleTimeString('es-VE')}</td>
                      <td className="px-3 py-2 text-right"><button onClick={()=>imprimirHistoricoSnapshot(h)} className="text-[9px] font-black uppercase text-red-500 hover:text-red-700">🖨 PDF</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {(tasa>0||tBin>0) && (
          <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden max-w-xs">
            <div className="px-4 py-2" style={{background:'#0f172a'}}><p className="text-white font-black text-[10px] uppercase tracking-widest">Variación de Tasa</p></div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100"><td className="px-4 py-2 font-mono font-black">{bancoFmt(tasa)}</td><td className="px-4 py-2 font-black text-blue-600 text-right text-xs">BCV</td></tr>
                <tr className="border-b border-slate-100"><td className="px-4 py-2 font-mono font-black">{bancoFmt(tBin)}</td><td className="px-4 py-2 font-black text-amber-600 text-right text-xs">BINANCE</td></tr>
                <tr><td className="px-4 py-2 font-mono font-black text-red-500">{bancoFmt(Math.abs(variacionAbs))}</td><td className="px-4 py-2 font-black text-red-500 text-right text-xs">{variacionPct.toFixed(2)}%</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {tasa<=0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] font-bold text-amber-700">⚠ Ingrese la tasa de cambio del día para ver los equivalentes en Bs./USD.</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <BKPI label="Total Bancos" value={`$${bancoFmt(totalBancosUsd)}`} sub={`Bs. ${bancoFmt(totalBancosBs)}`} accent="blue" Icon={Building2}/>
          <BKPI label="Total Cajas" value={`$${bancoFmt(totalCajasUsd)}`} sub={`Bs. ${bancoFmt(totalCajasBs)}`} accent="green" Icon={PiggyBank}/>
          <BKPI label="Vales Pendientes" value={valesPendientes.length} sub={`$${bancoFmt(totalValesUsd)}`} accent="gold" Icon={FileText}/>
          <BKPI label="Total General" value={`$${bancoFmt(granTotalUsd)}`} sub={`Bs. ${bancoFmt(granTotalBs)}`} accent="red" Icon={Wallet}/>
        </div>

        <BCard title="🏦 Bancos" subtitle="Saldos por categoría, con equivalente en ambas monedas">
          {bancosPorGrupo.length===0 ? <BEmptyState icon={Building2} title="Sin cuentas bancarias" desc="Registre cuentas en Cuentas Bancarias"/> : (
            <div className="space-y-5">
              {bancosPorGrupo.map(g=>(
                <div key={g.tipo}>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{g.label}</p>
                  <table className="w-full">
                    <thead><tr><BTh>Banco</BTh><BTh>N° Cuenta</BTh><BTh>Moneda</BTh><BTh right>Saldo Nativo</BTh><BTh right>Equiv. Bs.</BTh><BTh right>Equiv. $</BTh></tr></thead>
                    <tbody>
                      {g.lista.map(c=>(
                        <tr key={c.id}>
                          <BTd className="font-black">{c.banco}</BTd>
                          <BTd mono>{c.numeroCuenta||'—'}</BTd>
                          <BTd>{c.moneda}</BTd>
                          <BTd right mono>{c.moneda==='BS'?'Bs.':'$'}{bancoFmt(c.saldo)}</BTd>
                          <BTd right mono className="text-slate-500">Bs. {bancoFmt(c.sBs)}</BTd>
                          <BTd right mono className="text-emerald-600 font-black">${bancoFmt(c.sUsd)}</BTd>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-slate-50"><td colSpan={4} className="px-4 py-2 text-right font-black text-[10px] uppercase text-slate-500">Subtotal</td><td className="px-4 py-2 text-right font-black text-xs">Bs. {bancoFmt(g.subBs)}</td><td className="px-4 py-2 text-right font-black text-xs text-emerald-600">${bancoFmt(g.subUsd)}</td></tr></tfoot>
                  </table>
                </div>
              ))}
              <div className="rounded-xl overflow-hidden" style={{background:'#0f172a'}}>
                <div className="flex items-center justify-between p-4">
                  <span className="text-white font-black text-xs uppercase">Total Bancos</span>
                  <span className="text-emerald-400 font-black text-sm">Bs. {bancoFmt(totalBancosBs)} &nbsp;·&nbsp; ${bancoFmt(totalBancosUsd)}</span>
                </div>
                {(tBin>0||tInt>0) && <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 pb-3 border-t border-slate-700 pt-2">
                  {tBin>0 && <span className="text-[10px] text-amber-400 font-bold">A Binance: <b className="font-black">${bancoFmt(totalBancosBin)}</b></span>}
                  {tInt>0 && <span className="text-[10px] text-violet-400 font-bold">A Intervención: <b className="font-black">${bancoFmt(totalBancosInt)}</b></span>}
                </div>}
              </div>
            </div>
          )}
        </BCard>

        <BCard title="💰 Cajas" subtitle="Saldos de efectivo (saldo inicial + movimientos + cobros/pagos enrutados)">
          {cajasLista.length===0 ? <BEmptyState icon={PiggyBank} title="Sin cajas registradas" desc="Registre cajas en Cuentas de Caja"/> : (
            <div className="space-y-3">
              <table className="w-full">
                <thead><tr><BTh>Caja</BTh><BTh>Moneda</BTh><BTh right>Saldo Nativo</BTh><BTh right>Equiv. Bs.</BTh><BTh right>Equiv. $</BTh></tr></thead>
                <tbody>
                  {cajasLista.map(c=>(
                    <tr key={c.id}>
                      <BTd className="font-black">{c.nombre}</BTd>
                      <BTd>{c.moneda}</BTd>
                      <BTd right mono>{c.moneda==='BS'?'Bs.':'$'}{bancoFmt(c.saldoTotalNativo)}</BTd>
                      <BTd right mono className="text-slate-500">Bs. {bancoFmt(c.sBs)}</BTd>
                      <BTd right mono className="text-emerald-600 font-black">${bancoFmt(c.sUsd)}</BTd>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="rounded-xl overflow-hidden" style={{background:'#0f172a'}}>
                <div className="flex items-center justify-between p-4">
                  <span className="text-white font-black text-xs uppercase">Total Cajas</span>
                  <span className="text-emerald-400 font-black text-sm">Bs. {bancoFmt(totalCajasBs)} &nbsp;·&nbsp; ${bancoFmt(totalCajasUsd)}</span>
                </div>
                {(tBin>0||tInt>0) && <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 pb-3 border-t border-slate-700 pt-2">
                  {tBin>0 && <span className="text-[10px] text-amber-400 font-bold">A Binance: <b className="font-black">${bancoFmt(totalCajasBin)}</b></span>}
                  {tInt>0 && <span className="text-[10px] text-violet-400 font-bold">A Intervención: <b className="font-black">${bancoFmt(totalCajasInt)}</b></span>}
                </div>}
              </div>
            </div>
          )}
        </BCard>

        <BCard title="📋 Vales Pendientes" subtitle={`${valesPendientes.length} vale(s) · $${bancoFmt(totalValesUsd)} equivalente`}>
          {valesPendientes.length===0 ? <BEmptyState icon={FileText} title="Sin vales pendientes" desc="El dinero contabilizado en caja está físicamente en caja"/> : (
            <table className="w-full">
              <thead><tr><BTh>Fecha</BTh><BTh>Titular</BTh><BTh>Concepto</BTh><BTh right>Monto</BTh></tr></thead>
              <tbody>
                {valesPendientes.map((v,i)=>(
                  <tr key={i}>
                    <BTd>{bancoDd(v.fecha)}</BTd>
                    <BTd className="font-black">{v.titular||'—'}</BTd>
                    <BTd>{v.concepto||'—'}</BTd>
                    <BTd right mono className="text-red-500 font-black">{v.moneda==='BS'?'Bs.':'$'}{bancoFmt(v.monto)}</BTd>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </BCard>

        <div className="rounded-2xl shadow-lg overflow-hidden" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
          <div className="flex items-center justify-between p-5">
            <span className="text-white font-black text-sm uppercase tracking-wide">Total General Banco + Caja</span>
            <span className="text-white font-black text-lg">Bs. {bancoFmt(granTotalBs)} &nbsp;·&nbsp; ${bancoFmt(granTotalUsd)}</span>
          </div>
          {(tBin>0||tInt>0) && <div className="flex flex-wrap gap-x-8 gap-y-1 px-5 pb-4 border-t border-white/20 pt-3">
            {tBin>0 && <span className="text-[11px] text-white/90 font-bold">A Tasa Binance: <b className="font-black">${bancoFmt(granTotalBin)}</b></span>}
            {tInt>0 && <span className="text-[11px] text-white/90 font-bold">A Tasa Intervención: <b className="font-black">${bancoFmt(granTotalInt)}</b></span>}
          </div>}
        </div>
      </div>
    );
  };

  const ValesView = () => {
    const [modal,setModal]=useState(false);
    const [detalle,setDetalle]=useState(null);
    const [busy,setBusy]=useState(false);
    const [vales,setVales]=useState([]);
    const [clientes2,setClientes2]=useState([]);
    const [provs2,setProvs2]=useState([]);
    const [contCuentas2,setCuentas2]=useState([]);
    useEffect(()=>{
      const s1=onSnapshot(query(getColRef('caja_vales'),orderBy('fecha','desc')),s=>setVales(s.docs.map(d=>d.data())));
      const s2=onSnapshot(getColRef('clientes'),s=>setClientes2(s.docs.map(d=>({id:d.id, ...d.data()}))));
      const s3=onSnapshot(getColRef('procura_proveedores'),s=>setProvs2(s.docs.map(d=>({id:d.id, ...d.data()}))));
      const s4=onSnapshot(getColRef('planDeCuentas'),s=>setCuentas2(s.docs.map(d=>({id:d.id,...d.data()}))));
      return()=>{s1();s2();s3();s4();};
    },[]);

    const initF=()=>({fecha:getTodayDate(),titular:'',tipoTercero:'Persona',terceroId:'',concepto:'',moneda:'USD',monto:'',tasa:String(tasaActiva),estado:'Pendiente'});
    const [form,setForm]=useState(initF());

    const pendientes=vales.filter(v=>v.estado==='Pendiente');
    const cobrados=vales.filter(v=>v.estado!=='Pendiente');
    const totalUSD=pendientes.reduce((a,v)=>a+Number(v.monto||0),0);
    const totalBs=pendientes.reduce((a,v)=>a+Number(v.monto||0)*(v.moneda==='USD'?Number(v.tasa||tasaActiva):1),0);

    const guardarVale=async()=>{
      if(!form.titular&&!form.terceroId)return alert('Ingrese el nombre o seleccione un tercero');
      if(!form.monto||Number(form.monto)<=0)return alert('Ingrese un monto válido');
      if(!form.concepto)return alert('Ingrese el concepto');
      setBusy(true);
      try{
        const id=bancoGid();
        const monto=Number(form.monto);
        const tasa=Number(form.tasa)||tasaActiva;
        const montoUSD=form.moneda==='USD'?monto:monto/tasa;
        const montoBs=form.moneda==='BS'?monto:monto*tasa;
        const tercero=(form.tipoTercero==='Cliente'?clientes2:provs2).find(x=>x.id===form.terceroId);
        const nombre=tercero?.nombre||form.titular;
        await setDoc(getDocRef('caja_vales',id),{id,fecha:form.fecha,titular:nombre,tipoTercero:form.tipoTercero,terceroId:form.terceroId||'',concepto:form.concepto,moneda:form.moneda,monto,montoUSD,montoBs,tasa,estado:'Pendiente',historial:[],ts:serverTimestamp()});
        setModal(false);setForm(initF());
      }finally{setBusy(false);}
    };

    // Bajar de vale: pagar a proveedor, llevar a CxC o marcar cobrado
    const [accionModal,setAccionModal]=useState(null);
    const [accionForm,setAccionForm]=useState({tipo:'Cobrado',concepto:'',ctaId:'',ctaNom:''});
    const ejecutarAccion=async()=>{
      if(!accionModal)return;
      setBusy(true);
      try{
        const id=accionModal.id;
        const histEntry={fecha:getTodayDate(),tipo:accionForm.tipo,concepto:accionForm.concepto,ctaId:accionForm.ctaId,ctaNom:accionForm.ctaNom};
        const nuevoEstado=accionForm.tipo==='Cobrado'?'Cobrado':accionForm.tipo==='Pago a Proveedor'?'Aplicado a Proveedor':'Aplicado a CxC';
        await import('firebase/firestore').then(()=>null); // ensure imported
        const {updateDoc,arrayUnion}=await import('firebase/firestore');
        await updateDoc(getDocRef('caja_vales',id),{estado:nuevoEstado,fechaCierre:getTodayDate(),historial:arrayUnion(histEntry)});
        setAccionModal(null);setAccionForm({tipo:'Cobrado',concepto:'',ctaId:'',ctaNom:''});
      }finally{setBusy(false);}
    };

    return(
      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BKPI label="Vales Pendientes" value={pendientes.length} accent="gold" Icon={FileText}/>
          <BKPI label="Total USD en Vales" value={`$${bancoFmt(totalUSD)}`} accent="red" Icon={DollarSign}/>
          <BKPI label="Total Bs. en Vales" value={`Bs.${bancoFmt(totalBs)}`} accent="blue" Icon={Banknote}/>
          <BKPI label="Vales Aplicados" value={cobrados.length} accent="green" Icon={CheckCircle}/>
        </div>

        {/* Vales Pendientes */}
        <BCard title={`Vales Pendientes (${pendientes.length})`} subtitle="Efectivo en caja aún no recibido físicamente"
          action={<BBg onClick={()=>{setForm(initF());setModal(true);}} sm><Plus size={12}/> Nuevo Vale</BBg>}>
          {pendientes.length===0
            ?<BEmptyState icon={FileText} title="Sin vales pendientes" desc="Registre los vales cuando entregue efectivo a un tercero"/>
            :<div className="divide-y divide-slate-100">
              {pendientes.map(v=>(
                <div key={v.id} className="flex items-center gap-4 py-3 px-2 hover:bg-amber-50/40 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><FileText size={16} className="text-amber-600"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black text-slate-900 text-xs uppercase">{v.titular}</p>
                      <BBadge v="gold">Vale</BBadge>
                    </div>
                    <p className="text-[10px] text-slate-500">{v.concepto} · {bancoDd(v.fecha)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-black text-amber-600">{v.moneda==='USD'?'$':'Bs.'}{bancoFmt(v.monto)}</p>
                    <p className="text-[9px] text-slate-400">{v.moneda==='USD'?`Bs.${bancoFmt(v.montoBs)}`:`$${bancoFmt(v.montoUSD)}`}</p>
                  </div>
                  <button onClick={()=>setAccionModal(v)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-orange-500 transition-colors">
                    <ArrowRight size={11}/> Bajar Vale
                  </button>
                </div>
              ))}
            </div>}
        </BCard>

        {/* Historial de vales aplicados */}
        {cobrados.length>0&&<BCard title={`Vales Aplicados (${cobrados.length})`} subtitle="Historial">
          <table className="w-full text-[11px]"><thead><tr><BTh>Fecha</BTh><BTh>Titular</BTh><BTh>Concepto</BTh><BTh>Moneda</BTh><BTh right>Monto</BTh><BTh>Estado</BTh></tr></thead>
            <tbody>{cobrados.map(v=><tr key={v.id} className="hover:bg-slate-50">
              <BTd>{bancoDd(v.fecha)}</BTd><BTd className="font-black uppercase">{v.titular}</BTd>
              <BTd className="max-w-[150px] truncate">{v.concepto}</BTd>
              <BTd><BPill usd={v.moneda==='USD'}>{v.moneda}</BPill></BTd>
              <BTd right mono className="font-black">{v.moneda==='USD'?'$':'Bs.'}{bancoFmt(v.monto)}</BTd>
              <BTd><BBadge v="green">{v.estado}</BBadge></BTd>
            </tr>)}</tbody>
          </table>
        </BCard>}

        {/* BModal Nuevo Vale */}
        <BModal open={modal} onClose={()=>setModal(false)} title="Registrar Vale de Caja" wide
          footer={<><BBo onClick={()=>setModal(false)}>Cancelar</BBo><BBg onClick={guardarVale} disabled={busy}>{busy?'Guardando...':'Registrar Vale'}</BBg></>}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700">
              <p className="font-black">Vale = efectivo en caja asignado a un tercero que aún no ha ingresado físicamente.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <BFG label="Fecha"><input type="date" className={inp} value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></BFG>
              <BFG label="Tipo de Tercero">
                <div className="flex gap-1">{['Persona','Cliente','Proveedor'].map(t=>(
                  <button key={t} onClick={()=>setForm({...form,tipoTercero:t,terceroId:'',titular:''})}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${form.tipoTercero===t?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>{t}</button>
                ))}</div>
              </BFG>
              {form.tipoTercero==='Persona'
                ?<BFG label="Nombre del Titular" full><input className={inp} value={form.titular} onChange={e=>setForm({...form,titular:e.target.value.toUpperCase()})} placeholder="LUIS FERRER"/></BFG>
                :<BFG label={form.tipoTercero==='Cliente'?'Cliente':'Proveedor'} full>
                  <select className={sel} value={form.terceroId} onChange={e=>{const t=(form.tipoTercero==='Cliente'?clientes2:provs2).find(x=>x.id===e.target.value);setForm({...form,terceroId:e.target.value,titular:t?.nombre||''});}}>
                    <option value="">— Seleccione —</option>
                    {(form.tipoTercero==='Cliente'?clientes2:provs2).map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}
                  </select>
                </BFG>}
              <BFG label="Concepto / Descripción" full><input className={inp} value={form.concepto} onChange={e=>setForm({...form,concepto:e.target.value})} placeholder="Vale de caja para..."/></BFG>
              <BFG label="Moneda">
                <div className="flex gap-1">{['USD','BS'].map(m=>(
                  <button key={m} onClick={()=>setForm({...form,moneda:m})}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${form.moneda===m?'bg-slate-900 text-white':'bg-white text-slate-500 border-slate-200'}`}>{m}</button>
                ))}</div>
              </BFG>
              <BFG label={`Monto (${form.moneda})`}><input type="number" step="0.01" className={`${inp} font-black text-lg`} value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})}/></BFG>
              <BFG label="Tasa de Cambio"><input type="number" step="0.01" className={inp} value={form.tasa} onChange={e=>setForm({...form,tasa:e.target.value})}/></BFG>
            </div>
          </div>
        </BModal>

        {/* BModal Bajar Vale */}
        {accionModal&&<BModal open={!!accionModal} onClose={()=>setAccionModal(null)} title={`Bajar Vale — ${accionModal?.titular}`} wide
          footer={<><BBo onClick={()=>setAccionModal(null)}>Cancelar</BBo><BBg onClick={ejecutarAccion} disabled={busy}>{busy?'Procesando...':'Aplicar'}</BBg></>}>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 border border-slate-200">
              <div><p className="font-black text-slate-900 uppercase">{accionModal.titular}</p><p className="text-[10px] text-slate-500">{accionModal.concepto} · {bancoDd(accionModal.fecha)}</p></div>
              <div className="ml-auto text-right"><p className="font-mono font-black text-amber-600 text-lg">{accionModal.moneda==='USD'?'$':'Bs.'}{bancoFmt(accionModal.monto)}</p></div>
            </div>
            <BFG label="Acción a realizar">
              <div className="space-y-2">
                {[{v:'Cobrado',label:'Cobrado — Ingresó físicamente a caja',color:'#10b981'},
                  {v:'Pago a Proveedor',label:'Aplicar como Pago a Proveedor',color:'#3b82f6'},
                  {v:'Llevar a CxC',label:'Llevar a Cuenta por Cobrar (personal/empresa)',color:'#8b5cf6'},
                ].map(({v,label,color})=>(
                  <label key={v} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${accionForm.tipo===v?'border-slate-900 bg-slate-50':'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="accion" value={v} checked={accionForm.tipo===v} onChange={()=>setAccionForm({...accionForm,tipo:v})} className="accent-slate-900"/>
                    <div><p className="font-black text-[11px] text-slate-800">{label}</p></div>
                  </label>
                ))}
              </div>
            </BFG>
            <BFG label="Concepto/Observación">
              <input className={inp} value={accionForm.concepto} onChange={e=>setAccionForm({...accionForm,concepto:e.target.value})} placeholder="Descripción de la aplicación..."/>
            </BFG>
            {accionForm.tipo!=='Cobrado'&&<BFG label="Cuenta Contable">
              <select className={sel} value={accionForm.ctaId} onChange={e=>{const c=contCuentas2.find(x=>x.id===e.target.value);setAccionForm({...accionForm,ctaId:e.target.value,ctaNom:c?`${c.codigo} · ${c.nombre}`:''});}}>
                <option value="">— Seleccione cuenta —</option>
                {[...contCuentas2].sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))).map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
              </select>
            </BFG>}
          </div>
        </BModal>}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // 5. ARQUEO DE CAJA
  // ══════════════════════════════════════════════════════════════════════
  const ArqueoCajaView = () => {
    const [modal, setModal] = useState(false);
    const [busy, setBusy]   = useState(false);
    const [cantidades, setCants] = useState({});
    const [arqEdit, setArqEdit] = useState(null);
    const [pwdArq, setPwdArq] = useState(null); // {accion, a}
    const [pwdArqInput, setPwdArqInput] = useState('');
    const [pwdArqError, setPwdArqError] = useState(false);
    const denoms = DENOM_USD;
    const totalArqueo = denoms.reduce((a,d)=>a+(Number(cantidades[d]||0)*d),0);
    // Saldo esperado en caja USD según movimientos registrados
    const saldoCajaUSD = movCaja.filter(m=>m.moneda==='USD').reduce((a,m)=>m.tipo==='Ingreso'?a+Number(m.montoUSD||0):a-Number(m.montoUSD||0),0);
    const diferencia = (arques[0]?.totalArqueo||0) - saldoCajaUSD;

    const save = async()=>{
      setBusy(true);
      try {
        const id=bancoGid();
        await setDoc(getDocRef('caja_arques',id),{id,fecha:getTodayDate(),moneda:'USD',cantidades,totalArqueo,ts:serverTimestamp()});
        setModal(false); setCants({});
      } finally { setBusy(false); }
    };
    const abrirEditar=(a)=>{ setArqEdit(a); setCants(a.cantidades||{}); };
    const guardarEdicionArqueo=()=>setPwdArq({accion:'editar',a:arqEdit});
    const eliminarArqueo=(a)=>{
      if(!window.confirm(`¿Eliminar el arqueo del ${bancoDd(a.fecha)} ($${bancoFmt(a.totalArqueo)})?`))return;
      setPwdArq({accion:'eliminar',a});
    };
    const confirmarPwdArq=async()=>{
      const ok=await validarClaveAdmin(pwdArqInput);
      if(!ok){ setPwdArqError(true); setPwdArqInput(''); return; }
      if(pwdArq.accion==='editar'){
        const totalNuevo=denoms.reduce((s,d)=>s+(Number(cantidades[d]||0)*d),0);
        await updateDoc(getDocRef('caja_arques',arqEdit.id),{cantidades,totalArqueo:totalNuevo});
        setArqEdit(null);setCants({});
      } else if(pwdArq.accion==='eliminar'){
        await deleteDoc(getDocRef('caja_arques',pwdArq.a.id));
      }
      setPwdArq(null); setPwdArqInput(''); setPwdArqError(false);
    };
    const imprimirArqueo=(a)=>{
      const filas=denoms.map(d=>{
        const cant=Number((a.cantidades||{})[d]||0);
        if(cant===0) return '';
        return `<tr><td>Billete de $${d}</td><td style="text-align:right">${cant}</td><td style="text-align:right">$${bancoFmt(cant*d)}</td></tr>`;
      }).join('');
      const html=bancoLetterheadOpen('Arqueo de Caja — Dólares (USD)',`Fecha: ${bancoDd(a.fecha)}`)+
        `<table><thead><tr><th>Denominación</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
        <div style="margin-top:20px;padding:10px;background:#0f172a;color:#fff;text-align:right;font-weight:bold;font-size:12px;">TOTAL CONTADO: $${bancoFmt(a.totalArqueo)}</div>`+
        bancoLetterheadClose('Módulo: Tesorería & Caja');
      bancoPrintWindow(html);
    };

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <BKPI label="Arqueos Realizados" value={arques.length} accent="blue" Icon={FileText}/>
          <BKPI label="Último Arqueo USD" value={`$${bancoFmt(arques[0]?.totalArqueo||0)}`} accent="green" Icon={DollarSign}/>
          <BKPI label="Fecha Último Arqueo" value={arques[0]?.fecha?bancoDd(arques[0].fecha):'—'} accent="gold" Icon={CalendarDays}/>
        </div>
        <BCard title="Historial de Arqueos" subtitle="Conteos físicos de caja USD" action={<BBg onClick={()=>{setCants({});setModal(true);}} sm><Plus size={12}/> Nuevo Arqueo</BBg>}>
          {arques.length===0?<BEmptyState icon={Coins} title="Sin arqueos" desc="Realice el primer arqueo de caja"/>:
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr><BTh>Fecha</BTh><BTh>Moneda</BTh><BTh right>Total Contado</BTh><BTh></BTh></tr></thead>
              <tbody>{arques.map(a=><tr key={a.id} className="hover:bg-slate-50">
                <BTd>{bancoDd(a.fecha)}</BTd><BTd><BPill usd>USD</BPill></BTd>
                <BTd right mono className="font-black text-slate-900">$ {bancoFmt(a.totalArqueo)}</BTd>
                <BTd>
                  <div className="flex gap-1 justify-end">
                    <button onClick={()=>imprimirArqueo(a)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg" title="PDF"><FileText size={12}/></button>
                    <button onClick={()=>abrirEditar(a)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Editar"><Settings size={12}/></button>
                    <button onClick={()=>eliminarArqueo(a)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={12}/></button>
                  </div>
                </BTd>
              </tr>)}</tbody>
              <tfoot><tr style={{background:'#0f172a'}}>
                <td className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 text-left" colSpan={2}>RESULTADO DEL ARQUEO</td>
                <td className="px-4 py-4 text-center border-l border-slate-800 text-white">
                  <span className="block text-[9px] uppercase text-slate-500">Total Físico</span>
                  <span className="font-mono font-black text-sm">${bancoFmt(arques[0]?.totalArqueo||0)}</span>
                </td>
                <td className="px-4 py-4 text-right border-l border-slate-800 text-white">
                  <span className="block text-[9px] uppercase text-slate-500">Diferencia</span>
                  <span className={`font-mono font-black text-sm ${diferencia===0?'text-emerald-400':diferencia>0?'text-blue-400':'text-red-400'}`}>{diferencia>0?'+':''}{bancoFmt(diferencia)}</span>
                </td>
              </tr></tfoot>
            </table></div>}
        </BCard>

        <BModal open={modal||!!arqEdit} onClose={()=>{setModal(false);setArqEdit(null);setCants({});}} title={arqEdit?`Editar Arqueo — ${bancoDd(arqEdit.fecha)}`:"Arqueo de Caja — Dólares (USD)"} wide
          footer={<><BBo onClick={()=>{setModal(false);setArqEdit(null);setCants({});}}>Cancelar</BBo><BBg onClick={arqEdit?guardarEdicionArqueo:save} disabled={busy}>{busy?'Guardando...':(arqEdit?'Guardar Cambios':'Guardar Arqueo')}</BBg></>}>
          <div className="space-y-5">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <DollarSign size={16} className="text-blue-600"/>
              <p className="text-[11px] font-black text-blue-700 uppercase">Conteo de Billetes USD — Ingrese cantidad de billetes por denominación</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {denoms.map(d=>(
                <div key={d} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="w-20 text-right"><p className="font-mono font-black text-slate-700">$ {d>=1?bancoFmt(d):`${d}`}</p></div>
                  <div className="flex-1 flex items-center gap-2">
                    <p className="text-[10px] text-slate-400">×</p>
                    <input type="number" min="0" className={`${inp} text-center w-20`} value={cantidades[d]||''} onChange={e=>{const n={...cantidades};n[d]=e.target.value;setCants(n);}} placeholder="0"/>
                  </div>
                  <div className="w-24 text-right">
                    <p className="font-mono font-black text-slate-900">$ {bancoFmt(d*(Number(cantidades[d])||0))}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-5 flex justify-between items-center" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
              <p className="font-black text-white uppercase tracking-widest text-sm">Total Arqueo</p>
              <p className="font-mono font-black text-2xl text-emerald-400">$ {bancoFmt(totalArqueo)}</p>
            </div>
          </div>
        </BModal>
        {pwdArq&&(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>{setPwdArq(null);setPwdArqInput('');setPwdArqError(false);}}>
            <div className="bg-white rounded-2xl max-w-sm w-full" onClick={e=>e.stopPropagation()}>
              <div className="px-5 py-4" style={{background:'#0f172a'}}><p className="text-white font-black text-sm uppercase">Clave de Administrador</p></div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-500">Para {pwdArq.accion==='editar'?'editar':'eliminar'} este arqueo, ingresa la clave de administrador.</p>
                <input type="password" autoFocus value={pwdArqInput} onChange={e=>{setPwdArqInput(e.target.value);setPwdArqError(false);}} onKeyDown={e=>e.key==='Enter'&&confirmarPwdArq()}
                  className={`w-full border-2 rounded-xl px-3 py-2 text-xs font-bold outline-none ${pwdArqError?'border-red-400 bg-red-50':'border-gray-200 focus:border-orange-400'}`} placeholder="Clave"/>
                {pwdArqError&&<p className="text-[10px] text-red-500 font-bold">Clave incorrecta.</p>}
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
                <BBo onClick={()=>{setPwdArq(null);setPwdArqInput('');setPwdArqError(false);}}>Cancelar</BBo><BBg onClick={confirmarPwdArq}>Confirmar</BBg>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // 6. CONCILIACIÓN BANCARIA
  // ══════════════════════════════════════════════════════════════════════
  // ConciliacionView movida a componente de nivel superior (ver arriba de BancoApp) para que no
  // pierda su estado (cuenta/fecha/marcados) cada vez que BancoApp se re-renderiza por Firestore.

  // ══════════════════════════════════════════════════════════════════════
  // 7. PROVEEDORES
  // ══════════════════════════════════════════════════════════════════════
  const ProveedoresView = () => {
    const [modal,setModal]=useState(false);const [busy,setBusy]=useState(false);
    const [form,setForm]=useState({nombre:'',rif:'',telefono:'',email:'',direccion:'',diasCredito:'0'});
    const save=async()=>{if(!form.nombre||!form.rif)return alert('Nombre y RIF requeridos');setBusy(true);try{const id=bancoGid();await setDoc(getDocRef('compras_proveedores',id),{...form,id,ts:serverTimestamp()});setModal(false);setForm({nombre:'',rif:'',telefono:'',email:'',direccion:'',diasCredito:'0'});}finally{setBusy(false);}};
    return(<div>
      <BCard title="Directorio de Proveedores" subtitle={`${provs.length} proveedores`} action={<BBg onClick={()=>setModal(true)} sm><Plus size={12}/> Nuevo</BBg>}>
        <table className="w-full"><thead><tr><BTh>RIF</BTh><BTh>Razón Social</BTh><BTh>Teléfono</BTh><BTh>Email</BTh><BTh>Días Crédito</BTh><BTh></BTh></tr></thead>
          <tbody>
            {provs.length===0&&<tr><td colSpan={6}><BEmptyState icon={Users} title="Sin proveedores" desc="Registre sus proveedores"/></td></tr>}
            {provs.map(p=><tr key={p.id} className="hover:bg-slate-50"><BTd mono className="font-black">{p.rif}</BTd><BTd className="uppercase font-semibold">{p.nombre}</BTd><BTd>{p.telefono||'—'}</BTd><BTd className="text-slate-400">{p.email||'—'}</BTd><BTd mono>{p.diasCredito} días</BTd><BTd><button onClick={()=>deleteDoc(getDocRef('compras_proveedores',p.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={12}/></button></BTd></tr>)}
          </tbody>
        </table>
      </BCard>
      <BModal open={modal} onClose={()=>setModal(false)} title="Nuevo Proveedor" footer={<><BBo onClick={()=>setModal(false)}>Cancelar</BBo><BBg onClick={save} disabled={busy}>{busy?'Guardando...':'Guardar'}</BBg></>}>
        <div className="grid grid-cols-2 gap-4">
          <BFG label="Razón Social" full><input className={inp} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value.toUpperCase()})} placeholder="SUMINISTROS ABC C.A."/></BFG>
          <BFG label="RIF / NIT"><input className={inp} value={form.rif} onChange={e=>setForm({...form,rif:e.target.value.toUpperCase()})} placeholder="J-12345678-9"/></BFG>
          <BFG label="Teléfono"><input className={inp} value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></BFG>
          <BFG label="Email"><input type="email" className={inp} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></BFG>
          <BFG label="Días Crédito"><input type="number" className={inp} value={form.diasCredito} onChange={e=>setForm({...form,diasCredito:e.target.value})}/></BFG>
          <BFG label="Dirección" full><input className={inp} value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})}/></BFG>
        </div>
      </BModal>
    </div>);
  };

  // ══════════════════════════════════════════════════════════════════════
  // 8. REPORTES
  // ══════════════════════════════════════════════════════════════════════
  const ReportesView = () => {
    const [rC,setRC]=useState('');const [rD,setRD]=useState(bancoMesActual()+'-01');const [rH,setRH]=useState(getTodayDate());
    const filt=movBanco.filter(m=>(!rC||m.cuentaId===rC)&&m.fecha>=rD&&m.fecha<=rH);
    const iU=filt.filter(m=>m.tipo==='Ingreso').reduce((a,m)=>a+Number(m.montoUSD||0),0);
    const eU=filt.filter(m=>m.tipo==='Egreso' ).reduce((a,m)=>a+Number(m.montoUSD||0),0);
    const iB=filt.filter(m=>m.tipo==='Ingreso').reduce((a,m)=>a+Number(m.montoBs||0),0);
    const eB=filt.filter(m=>m.tipo==='Egreso' ).reduce((a,m)=>a+Number(m.montoBs||0),0);
    return(<div className="space-y-5">
      <BCard title="Filtros"><div className="grid grid-cols-3 gap-4">
        <BFG label="Cuenta"><select className={sel} value={rC} onChange={e=>setRC(e.target.value)}><option value="">Todas</option>{cuentas.map(c=><option key={c.id} value={c.id}>{c.banco}</option>)}</select></BFG>
        <BFG label="Desde"><input type="date" className={inp} value={rD} onChange={e=>setRD(e.target.value)}/></BFG>
        <BFG label="Hasta"><input type="date" className={inp} value={rH} onChange={e=>setRH(e.target.value)}/></BFG>
      </div></BCard>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BKPI label="Ingresos USD" value={`$${bancoFmt(iU)}`} accent="green" Icon={ArrowUpCircle} sub={`Bs.${bancoFmt(iB)}`}/>
        <BKPI label="Egresos USD"  value={`$${bancoFmt(eU)}`} accent="red"   Icon={ArrowDownCircle} sub={`Bs.${bancoFmt(eB)}`}/>
        <BKPI label="Flujo Neto"   value={`$${bancoFmt(iU-eU)}`} accent={iU-eU>=0?'green':'red'} Icon={ArrowLeftRight}/>
        <BKPI label="Transacciones" value={filt.length} accent="blue" Icon={FileText}/>
      </div>
      <BCard title="Detalle de Movimientos" subtitle="Ingresos y Egresos del período seleccionado"
        action={
          <button onClick={()=>exportarMovimientos('excel')} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={12}/> Excel</button>
        }>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr><BTh>Fecha</BTh><BTh>Tipo</BTh><BTh>Banco</BTh><BTh>Concepto</BTh><BTh>Tercero</BTh><BTh>Ref.</BTh><BTh right>USD</BTh><BTh right>Bs.</BTh><BTh right>Tasa</BTh><BTh>Estado</BTh></tr></thead>
          <tbody>
            {filt.length===0&&<tr><td colSpan={10}><BEmptyState icon={BarChart3} title="Sin datos" desc="Ajuste los filtros"/></td></tr>}
            {filt.map(m=><tr key={m.id} className="hover:bg-slate-50">
              <BTd>{bancoDd(m.fecha)}</BTd><BTd><BBadge v={m.tipo==='Ingreso'?'green':m.tipo==='Egreso'?'red':'blue'}>{m.tipo}</BBadge></BTd>
              <BTd className="font-semibold text-[11px] max-w-[80px] truncate">{m.cuentaNombre}</BTd>
              <BTd className="max-w-[130px] truncate">{m.concepto}</BTd>
              <BTd className="text-[10px] max-w-[100px] truncate">{m.terceroNombre||'—'}</BTd>
              <BTd mono className="text-slate-400 text-[10px]">{m.referencia||'—'}</BTd>
              <BTd right mono className={`font-black ${m.tipo==='Ingreso'?'text-emerald-600':'text-red-500'}`}>{'$'+bancoFmt(m.montoUSD)}</BTd>
              <BTd right mono className="text-slate-400 text-xs">Bs.{bancoFmt(m.montoBs)}</BTd>
              <BTd right mono className="text-slate-400 text-[10px]">{m.tasa}</BTd>
              <BTd><BBadge v={m.estatus==='Conciliado'?'green':'gray'}>{m.estatus||'Pendiente'}</BBadge></BTd>
            </tr>)}
          </tbody>
          {filt.length>0&&<tfoot><tr style={{background:'#0f172a'}}><td colSpan={6} className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">TOTALES</td><td className="px-4 py-3 text-right font-mono font-black text-white">{'$'+bancoFmt(iU-eU)}</td><td className="px-4 py-3 text-right font-mono text-slate-400 text-xs">Bs.{bancoFmt(iB-eB)}</td><td colSpan={2}></td></tr></tfoot>}
        </table></div>
      </BCard>
    </div>);
  };

  // ══════════════════════════════════════════════════════════════════════
  // 9. TASAS
  // ══════════════════════════════════════════════════════════════════════
  const TasasView = () => {
    const [modal,setModal]=useState(false);const [busy,setBusy]=useState(false);
    const [editando,setEditando]=useState(null);
    const initTF=()=>({fecha:getTodayDate(),modulo:'Todos',moneda:'USD',tasaRef:'',fuente:'Oficial / BCV'});
    const [form,setForm]=useState(initTF());
    const openNew=()=>{setEditando(null);setForm(initTF());setModal(true);};
    const openEdit=(t)=>{setEditando(t);setForm({fecha:t.fecha||getTodayDate(),modulo:t.modulo||'Todos',moneda:t.moneda||'USD',tasaRef:String(t.tasaRef||''),fuente:t.fuente||''});setModal(true);};
    const save=async()=>{
      if(!form.tasaRef)return;
      setBusy(true);
      try{
        if(editando){
          await updateDoc(getDocRef('banco_tasas',editando.id),{...form,tasaRef:Number(form.tasaRef)});
        } else {
          const id=bancoGid();
          await setDoc(getDocRef('banco_tasas',id),{...form,tasaRef:Number(form.tasaRef),id,ts:serverTimestamp()});
        }
        setModal(false);setEditando(null);setForm(initTF());
      }finally{setBusy(false);}
    };
    const eliminar=async(t)=>{
      if(!window.confirm(`¿Eliminar la tasa ${t.tasaRef} Bs/$ del ${bancoDd(t.fecha)}? Esta acción no se puede deshacer.`))return;
      await deleteDoc(getDocRef('banco_tasas',t.id));
    };
    return(<div>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <BKPI label="Tasa Global" value={`${tasas.find(t=>t.modulo==='Todos')?.tasaRef||'—'} Bs/$`} accent="gold" Icon={Globe}/>
        <BKPI label="Registros" value={tasas.length} accent="blue" Icon={TrendingUp}/>
        <BKPI label="Última Actualización" value={bancoDd(tasas[0]?.fecha||'')} accent="green" Icon={CalendarDays}/>
      </div>
      <BCard title="Historial de Tasas" action={<BBg onClick={openNew} sm><Plus size={12}/> Nueva</BBg>}>
        <table className="w-full"><thead><tr><BTh>Fecha</BTh><BTh>Módulo</BTh><BTh>Moneda</BTh><BTh right>Tasa Bs/$</BTh><BTh>Fuente</BTh><BTh></BTh></tr></thead>
          <tbody>{tasas.length===0&&<tr><td colSpan={6}><BEmptyState icon={Globe} title="Sin tasas" desc="Registre la tasa actual"/></td></tr>}{tasas.map(t=><tr key={t.id} className="hover:bg-slate-50">
            <BTd>{bancoDd(t.fecha)}</BTd><BTd><BBadge v={t.modulo==='Todos'?'gray':'blue'}>{t.modulo}</BBadge></BTd><BTd><BPill usd={t.moneda==='USD'}>{t.moneda}</BPill></BTd>
            <BTd right mono className="font-black text-slate-900 text-base">{t.tasaRef}</BTd><BTd className="text-slate-400 text-[10px] uppercase font-semibold">{t.fuente}</BTd>
            <BTd>
              <div className="flex gap-1">
                <button onClick={()=>openEdit(t)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg" title="Editar"><Settings size={12}/></button>
                <button onClick={()=>eliminar(t)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={12}/></button>
              </div>
            </BTd>
          </tr>)}</tbody>
        </table>
      </BCard>
      <BModal open={modal} onClose={()=>{setModal(false);setEditando(null);}} title={editando?'Editar Tasa':'Registrar Tasa'} footer={<><BBo onClick={()=>{setModal(false);setEditando(null);}}>Cancelar</BBo><BBg onClick={save} disabled={busy}>{busy?'Guardando...':'Guardar'}</BBg></>}>
        <div className="grid grid-cols-2 gap-4">
          <BFG label="Fecha"><input type="date" className={inp} value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></BFG>
          <BFG label="Moneda"><select className={sel} value={form.moneda} onChange={e=>setForm({...form,moneda:e.target.value})}><option>USD</option><option>EUR</option></select></BFG>
          <BFG label="Tasa Bs/$"><input type="number" step="0.01" className={inp} value={form.tasaRef} onChange={e=>setForm({...form,tasaRef:e.target.value})} placeholder="39.50"/></BFG>
          <BFG label="Módulo"><select className={sel} value={form.modulo} onChange={e=>setForm({...form,modulo:e.target.value})}><option>Todos</option><option>Banco</option><option>Facturación</option><option>Inventario</option></select></BFG>
          <BFG label="Fuente" full><input className={inp} value={form.fuente} onChange={e=>setForm({...form,fuente:e.target.value})}/></BFG>
        </div>
      </BModal>
    </div>);
  };

  // ── NAV ────────────────────────────────────────────────────────────────────
  const RepLibroDiarioView = ({ tipo = 'banco' }) => {
    const isBanco = tipo === 'banco';
    const movsFuente = isBanco ? movBanco : movCaja;
    const cuentasFuente = isBanco ? cuentas : cajas;
    const nombreCta = (c) => isBanco ? c?.banco : c?.nombre;
    const idField = isBanco ? 'cuentaId' : 'cajaId';
    const [filtDesde,setFiltDesde]=useState(bancoMesActual()+'-01'); const [filtHasta,setFiltHasta]=useState(getTodayDate());
    const [filtOrigen,setFiltOrigen]=useState(''); const [filtCta,setFiltCta]=useState('');
    // El asiento formal (cont_asientos) ya tiene las cuentas REALES que se seleccionaron al
    // registrar el movimiento (contrapartidas, tercero, etc.). Si existe, hay que usarlo tal
    // cual en vez de volver a adivinarlo con heurísticas — que es lo que causaba que este
    // reporte mostrara una cuenta genérica distinta a la que realmente se eligió.
    const [asientosLocal, setAsientosLocal] = useState([]);
    useEffect(()=>{
      const u=onSnapshot(getColRef('cont_asientos'),s=>setAsientosLocal(s.docs.map(d=>d.data())));
      return()=>u();
    },[]);
    let allMovs=movsFuente.map(m=>({...m,origen:isBanco?'Banco':'Caja'}));
    allMovs=allMovs.filter(m=>{if(m.fecha<filtDesde||m.fecha>filtHasta)return false;if(filtOrigen&&m[idField]!==filtOrigen)return false;return true;});
    allMovs.sort((a,b)=>a.fecha.localeCompare(b.fecha));
    let lineasPlanas=[],sBs=0,sUSD=0;
    allMovs.forEach(m=>{
      const ctaP=cuentasFuente.find(c=>c.id===m[idField]);if(!ctaP)return;
      const isIng=m.tipo==='Ingreso'||m.tipo==='Nota de Crédito';const tasa=Number(m.tasa)||1;
      const mNat=Number(m.montoNativo)||Number(m.monto)||(ctaP.moneda==='BS'?Number(m.montoBs):Number(m.montoUSD))||0;
      const valBs=ctaP.moneda==='BS'?mNat:mNat*tasa;const valUSD=ctaP.moneda==='BS'?mNat/tasa:mNat;
      const comp=nombreCta(ctaP)||(isBanco?'BANCO':'CAJA');
      const grupoKey=m.id; // clave interna única por transacción — separada de "comp" para no fusionar movimientos del mismo banco/caja
      const mesL=m.fecha.substring(5,7)+'/'+m.fecha.substring(0,4);const doc=m.referencia||'—';const conc=m.esVale?`[VALE] ${m.concepto}`:m.concepto;
      // ── Si ya existe un asiento formal para este movimiento, se usan SUS líneas tal cual
      // (las cuentas que de verdad se seleccionaron), sin recalcular nada por heurística. ──
      const asientoLigado=asientosLocal.find(a=>a.id===m.asientoContableId||a.movimientoBancoId===m.id||a.movimientoCajaId===m.id);
      let sub;
      if(asientoLigado&&asientoLigado.lineas&&asientoLigado.lineas.length>0){
        sub=asientoLigado.lineas.map(l=>({comp,grupoKey,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:l.codigo||'',cuenta:l.cuenta||'—',tipo:l.tipoLinea||(Number(l.debeBs||0)>0?'D':'H'),dBs:Number(l.debeBs||0),hBs:Number(l.haberBs||0),dUSD:Number(l.debeUSD||0),hUSD:Number(l.haberUSD||0)}));
      } else {
      sub=[{comp,grupoKey,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:ctaP.cuentaContableCod||'—',cuenta:nombreCta(ctaP),tipo:isIng?'D':'H',dBs:isIng?valBs:0,hBs:isIng?0:valBs,dUSD:isIng?valUSD:0,hUSD:isIng?0:valUSD}];
      // Se intenta SIEMPRE identificar primero al cliente/proveedor y su cuenta contable YA
      // asignada (misma cuenta de operación) — porque lineasContra/asientoDebito a veces quedaron
      // guardados con el nombre del cliente/proveedor en vez de su cuenta contable real.
      // Los distintos flujos de guardado usan nombres de campo distintos para el tercero
      // (terceroNombre, clientName, proveedor) — se revisan todos antes de recurrir al concepto.
      const nombreDirecto=m.terceroNombre||m.clientName||m.proveedor||'';
      const partesGuion=(m.concepto||'').split('—').map(s=>s.trim());
      const partesPunto=(m.concepto||'').split('·').map(s=>s.trim());
      const nombreEnConcepto=nombreDirecto||partesGuion[1]||partesPunto[1]||'';
      const nombreNorm=bancoNormNombre(nombreEnConcepto);
      const esProveedorMov=m.tipoTercero==='Proveedor'||!!m.grupoPagoId||!!m.proveedor||!!m.provRif;
      const tercero=(esProveedorMov?(provs||[]).find(p=>p.id===m.terceroId):(clientes||[]).find(c=>c.id===m.terceroId))
        || (clientes||[]).find(c=>nombreNorm && bancoNormNombre(c.razonSocial||c.name||c.nombre)===nombreNorm)
        || (provs||[]).find(p=>nombreNorm && bancoNormNombre(p.razonSocial||p.name||p.nombre)===nombreNorm);
      const [codTercero,nomTercero]=tercero?.cuentaContableNombre?tercero.cuentaContableNombre.split('—').map(s=>s.trim()):['',''];
      // Si el cliente/proveedor no tiene su PROPIA cuenta contable asignada, se usa la cuenta
      // genérica del plan de cuentas (misma lógica que Directorio de Clientes/Proveedores),
      // en vez de dejarlo sin código.
      const cuentaGenerica=(patron)=>{const cta=(contCuentas||[]).find(p=>patron.test(p.nombre||''));return cta?{codigo:String(cta.codigo||cta.id||''),nombre:cta.nombre||''}:null;};
      if(m.tipoTercero==='Relacionado'&&m.terceroId){
        // Los terceros "Relacionados" (préstamos entre empresas) viven en su propia colección,
        // no en Clientes ni Proveedores — si se buscan ahí nunca aparecen y el reporte termina
        // cayendo en "Cuentas por Cobrar/Pagar" genérico, que no tiene nada que ver.
        const tercRel=(tercerosRel||[]).find(t=>t.id===m.terceroId);
        const [codRel,nomRel]=tercRel?.cuentaContableNombre?tercRel.cuentaContableNombre.split('—').map(s=>s.trim()):['',''];
        const ctaPrestamo=cuentaGenerica(/(pr[ée]stamo|relacionad)/i);
        sub.push({comp,grupoKey,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:codRel||(ctaPrestamo?ctaPrestamo.codigo:''),cuenta:nomRel||(ctaPrestamo?ctaPrestamo.nombre:'Cuentas por Pagar Relacionadas'),tipo:isIng?'H':'D',dBs:isIng?0:valBs,hBs:isIng?valBs:0,dUSD:isIng?0:valUSD,hUSD:isIng?valUSD:0});
      }
      else if(tercero&&(codTercero||nomTercero)){
        sub.push({comp,grupoKey,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:codTercero||tercero.cuentaContableId||'',cuenta:nomTercero||tercero.razonSocial||tercero.nombre||'',tipo:isIng?'H':'D',dBs:isIng?0:valBs,hBs:isIng?valBs:0,dUSD:isIng?0:valUSD,hUSD:isIng?valUSD:0});
      }
      else if(tercero && cuentaGenerica(esProveedorMov?/(cuentas?\s+por\s+pagar|cxp|proveedor)/i:/(cuentas?\s+por\s+cobrar|cxc|client)/i)){
        const g=cuentaGenerica(esProveedorMov?/(cuentas?\s+por\s+pagar|cxp|proveedor)/i:/(cuentas?\s+por\s+cobrar|cxc|client)/i);
        sub.push({comp,grupoKey,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:g.codigo,cuenta:g.nombre,tipo:isIng?'H':'D',dBs:isIng?0:valBs,hBs:isIng?valBs:0,dUSD:isIng?0:valUSD,hUSD:isIng?valUSD:0});
      }
      else if(m.lineasContra&&m.lineasContra.length>0){m.lineasContra.forEach(l=>sub.push({comp,grupoKey,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:l.ctaNom?l.ctaNom.split('·')[0].trim():'',cuenta:l.ctaNom?l.ctaNom.split('·')[1]?.trim():l.ctaNom,tipo:Number(l.debeBs||0)>0?'D':'H',dBs:Number(l.debeBs||0),hBs:Number(l.haberBs||0),dUSD:Number(l.debeUSD||0),hUSD:Number(l.haberUSD||0)}));}
      else if(m.asientoDebito||m.asientoCredito){sub.push({comp,grupoKey,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:'',cuenta:isIng?m.asientoCredito:m.asientoDebito,tipo:isIng?'H':'D',dBs:isIng?0:valBs,hBs:isIng?valBs:0,dUSD:isIng?0:valUSD,hUSD:isIng?valUSD:0});}
      else {
        const esCobro=!!m.grupoCobroId, esPago=!!m.grupoPagoId;
        const g=esCobro?cuentaGenerica(/(cuentas?\s+por\s+cobrar|cxc|client)/i):esPago?cuentaGenerica(/(cuentas?\s+por\s+pagar|cxp|proveedor)/i):null;
        const contraCodigo=g?g.codigo:'';
        const contraNombre=g?g.nombre:(esCobro?'Cuentas por Cobrar':esPago?'Cuentas por Pagar':'Contrapartida (origen no identificado)');
        sub.push({comp,grupoKey,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:contraCodigo,cuenta:contraNombre,tipo:isIng?'H':'D',dBs:isIng?0:valBs,hBs:isIng?valBs:0,dUSD:isIng?0:valUSD,hUSD:isIng?valUSD:0});
      }
      }
      if(filtCta){const ok=sub.some(sl=>(sl.codigo+' '+sl.cuenta).toLowerCase().includes(filtCta.toLowerCase()));if(!ok)return;}
      sub.forEach(sl=>{sBs+=sl.dBs-sl.hBs;sUSD+=sl.dUSD-sl.hUSD;lineasPlanas.push({...sl,sBs,sUSD});});
    });
    // El saldo acumulado (sBs/sUSD) ya quedó calculado arriba en orden cronológico real
    // (de la más antigua a la más reciente), que es como debe ser un saldo corrido. Para
    // MOSTRAR la más reciente primero solo se invierte el orden de los GRUPOS (comprobantes)
    // — sin tocar el orden interno de las líneas de cada uno ni los valores ya calculados.
    {
      const grupos=[]; const idxPorKey={};
      lineasPlanas.forEach(l=>{
        if(idxPorKey[l.grupoKey]===undefined){idxPorKey[l.grupoKey]=grupos.length;grupos.push([]);}
        grupos[idxPorKey[l.grupoKey]].push(l);
      });
      lineasPlanas=grupos.reverse().flat();
    }
    // ── PDF / XLS ──────────────────────────────────────────────────────────
    const buildHTMLLibro = () => {
      let sBsAcum=0, sUSDAcum=0;
      const rowsHtml = lineasPlanas.map((l,idx)=>{
        const esInicio=idx===0||lineasPlanas[idx-1].grupoKey!==l.grupoKey;
        sBsAcum=l.sBs; sUSDAcum=l.sUSD;
        return `<tr style="border-bottom:1px solid #e2e8f0"><td>${esInicio?l.comp:''}</td><td>${esInicio?l.mes:''}</td><td>${esInicio?bancoDd(l.fecha):''}</td><td style="font-family:monospace;color:#2563eb">${l.codigo||'—'}</td><td style="padding-left:${l.tipo==='H'?'16':'4'}px">${l.cuenta||'—'}</td><td style="text-align:center;font-weight:900;color:${l.tipo==='D'?'#16a34a':'#dc2626'}">${l.tipo}</td><td>${esInicio?l.doc:''}</td><td>${esInicio?l.conc:''}</td><td style="text-align:right">${esInicio?bancoFmt(l.tasa):''}</td><td style="text-align:right;color:#16a34a">${l.dBs>0?'Bs.'+bancoFmt(l.dBs):''}</td><td style="text-align:right;color:#dc2626">${l.hBs>0?'Bs.'+bancoFmt(l.hBs):''}</td><td style="text-align:right;color:#64748b">Bs.${bancoFmt(sBsAcum)}</td><td style="text-align:right;color:#16a34a">${l.dUSD>0?'$'+bancoFmt(l.dUSD):''}</td><td style="text-align:right;color:#dc2626">${l.hUSD>0?'$'+bancoFmt(l.hUSD):''}</td><td style="text-align:right;color:#64748b">$${bancoFmt(sUSDAcum)}</td></tr>`;
      }).join('');
      const totBs=lineasPlanas.reduce((s,l)=>s+l.dBs-l.hBs,0), totBsAbs={d:lineasPlanas.reduce((s,l)=>s+l.dBs,0),h:lineasPlanas.reduce((s,l)=>s+l.hBs,0)};
      const totUSDAbs={d:lineasPlanas.reduce((s,l)=>s+l.dUSD,0),h:lineasPlanas.reduce((s,l)=>s+l.hUSD,0)};
      const subtitulo=`${new Set(lineasPlanas.map(l=>l.grupoKey)).size} asiento(s) · ${isBanco?(filtOrigen?nombreCta(cuentasFuente.find(c=>c.id===filtOrigen)):'Todos los bancos'):(filtOrigen?nombreCta(cuentasFuente.find(c=>c.id===filtOrigen)):'Todas las cajas')} · Del ${bancoDd(filtDesde)} al ${bancoDd(filtHasta)}`;
      return bancoLetterheadOpen(`Libro Diario General Bimonetario — ${isBanco?'Banco':'Caja'}`,subtitulo)+
        `<style>table{font-size:9px;border-collapse:collapse;width:100%}th{background:#0f172a;color:#e2e8f0;padding:6px 8px;text-align:left;font-size:8px;text-transform:uppercase;white-space:nowrap}td{padding:4px 8px;vertical-align:middle}tr:nth-child(even){background:#f8fafc}.tfoot-row{background:#0f172a;color:white;font-weight:900}</style>
        <table><thead><tr><th>Comprobante</th><th>Mes</th><th>Fecha</th><th>Código</th><th>Cuenta de Movimiento</th><th style="text-align:center">T</th><th>Nro Doc</th><th>Concepto</th><th style="text-align:right">Tasa</th><th style="text-align:right;color:#4ade80">Debe Bs.</th><th style="text-align:right;color:#f87171">Haber Bs.</th><th style="text-align:right">Saldo Bs.</th><th style="text-align:right;color:#4ade80">Debe $</th><th style="text-align:right;color:#f87171">Haber $</th><th style="text-align:right">Saldo $</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr class="tfoot-row"><td colspan="9">TOTALES — ${new Set(lineasPlanas.map(l=>l.grupoKey)).size} asiento(s)</td><td style="text-align:right;color:#4ade80">Bs.${bancoFmt(totBsAbs.d)}</td><td style="text-align:right;color:#f87171">Bs.${bancoFmt(totBsAbs.h)}</td><td></td><td style="text-align:right;color:#4ade80">$${bancoFmt(totUSDAbs.d)}</td><td style="text-align:right;color:#f87171">$${bancoFmt(totUSDAbs.h)}</td><td></td></tr></tfoot></table>`+
        bancoLetterheadClose(`Módulo: Tesorería & ${isBanco?'Bancos':'Caja'}`);
    };
    const imprimirLibroPDF=()=>bancoPrintWindow(buildHTMLLibro());
    const imprimirLibroXLS=()=>{
      const h=buildHTMLLibro();
      const b=new Blob([h],{type:'application/vnd.ms-excel;charset=utf-8'});
      const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`libro_diario_${isBanco?'banco':'caja'}_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(u);
    };
    return(
      <div className="space-y-5 flex flex-col min-w-0 w-full">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div><h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Libro Diario General Bimonetario</h2><p className="text-xs text-slate-500 font-medium mt-1">Todos los asientos de {isBanco?'Banco':'Caja'} integrados en un solo comprobante maestro.</p></div>
          <div className="flex flex-wrap gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Desde</label><input type="date" className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none" value={filtDesde} onChange={e=>setFiltDesde(e.target.value)}/></div>
            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Hasta</label><input type="date" className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none" value={filtHasta} onChange={e=>setFiltHasta(e.target.value)}/></div>
            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">{isBanco?'Banco':'Caja'}</label><select className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none min-w-[200px]" value={filtOrigen} onChange={e=>setFiltOrigen(e.target.value)}>
              <option value="">{isBanco?'TODOS LOS BANCOS':'TODAS LAS CAJAS'}</option>
              {isBanco?[{label:'🇻🇪 Nacionales Bs.',items:cuentasFuente.filter(c=>c.tipoBanco==='Nacional-Bs')},
                {label:'💵 Moneda Extranjera',items:cuentasFuente.filter(c=>c.tipoBanco==='Nacional-Ext')},
                {label:'🌐 Internacionales',items:cuentasFuente.filter(c=>c.tipoBanco==='Internacional')},
                {label:'💳 Electrónicas',items:cuentasFuente.filter(c=>c.tipoBanco==='Electronica')},
                {label:'🪪 Tarjetas Débito Intl.',items:cuentasFuente.filter(c=>c.tipoBanco==='Tarjeta-Debito-Intl')},
                {label:'📱 Pago Móvil',items:cuentasFuente.filter(c=>c.tipoBanco==='Pago-Movil'||c.tipoBanco==='Pago Móvil')}
              ].map(g=>g.items.length>0&&(<optgroup key={g.label} label={g.label}>{g.items.map(c=><option key={c.id} value={c.id}>{nombreCta(c)}</option>)}</optgroup>)):cuentasFuente.map(c=><option key={c.id} value={c.id}>{nombreCta(c)}</option>)}
            </select></div>
            <div className="flex-1"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cuenta Contable</label><div className="relative"><Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-semibold outline-none" placeholder="Ej: 1.1.01..." value={filtCta} onChange={e=>setFiltCta(e.target.value)}/></div></div>
            {(filtOrigen||filtCta||filtDesde!==bancoMesActual()+'-01'||filtHasta!==getTodayDate())&&<button onClick={()=>{setFiltDesde(bancoMesActual()+'-01');setFiltHasta(getTodayDate());setFiltOrigen('');setFiltCta('');}} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-100">Limpiar</button>}
            <div className="ml-auto flex gap-2">
              <button onClick={imprimirLibroPDF} className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-red-700"><Download size={12}/> PDF</button>
              <button onClick={imprimirLibroXLS} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={12}/> Excel</button>
            </div>
          </div>
        </div>
        {lineasPlanas.length===0?<BEmptyState icon={BookOpen} title="Sin resultados" desc="No hay asientos para los filtros seleccionados."/>:(
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-w-0 w-full">
            <div className="overflow-x-auto w-full min-w-0 pb-2"><table className="w-full text-left min-w-[1400px]">
              <thead><tr className="bg-slate-900 border-b border-slate-800">{['Comprobante','Mes','Fecha','Código','Cuenta de Movimiento','T','Nro Doc','Concepto','Tasa','Debe Bs.','Haber Bs.','Saldo Bs.','Debe $','Haber $','Saldo $'].map((h,hi)=>(<th key={hi} className={`px-4 py-3 font-black uppercase text-white/90 whitespace-nowrap text-[10px] tracking-wider ${hi>=9?'text-right':hi===5?'text-center':'text-left'}`}>{h}</th>))}</tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {lineasPlanas.map((l,idx)=>{const isD=l.tipo==='D';const esInicio=idx===0||lineasPlanas[idx-1].grupoKey!==l.grupoKey;return(
                  <tr key={idx} className={`hover:bg-slate-50 transition-colors ${esInicio&&idx>0?'border-t-2 border-slate-200':''}`}>
                    <td className="px-4 py-2.5 font-mono font-black text-blue-600 text-[11px] whitespace-nowrap">{esInicio?l.comp:''}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-[10px] whitespace-nowrap">{esInicio?l.mes:''}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-[10px] whitespace-nowrap font-mono">{esInicio?bancoDd(l.fecha):''}</td>
                    <td className="px-4 py-2.5 font-mono font-black text-blue-500 text-[10px]">{l.codigo||'—'}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-700 text-[10px] uppercase truncate max-w-[200px]" style={{paddingLeft:!isD?'20px':'16px'}} title={l.cuenta}>{l.cuenta||'—'}</td>
                    <td className="px-4 py-2.5 text-center font-black text-[11px]"><span className={isD?'text-emerald-600':'text-red-500'}>{l.tipo}</span></td>
                    <td className="px-4 py-2.5 font-mono text-slate-400 text-[10px] truncate max-w-[100px]">{esInicio?l.doc:''}</td>
                    <td className="px-4 py-2.5 text-slate-600 text-[10px] max-w-[380px] whitespace-normal break-words font-medium uppercase">{esInicio?l.conc:''}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-400 text-[10px]">{esInicio?bancoFmt(l.tasa):''}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-600 text-[10px] whitespace-nowrap bg-emerald-50/10">{l.dBs>0?'Bs.'+bancoFmt(l.dBs):''}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-red-500 text-[10px] whitespace-nowrap bg-red-50/10">{l.hBs>0?'Bs.'+bancoFmt(l.hBs):''}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-slate-400 text-[10px] whitespace-nowrap">{!esInicio?'Bs.'+bancoFmt(l.sBs):''}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-600 text-[10px] whitespace-nowrap bg-emerald-50/10">{l.dUSD>0?'$'+bancoFmt(l.dUSD):''}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-red-500 text-[10px] whitespace-nowrap bg-red-50/10">{l.hUSD>0?'$'+bancoFmt(l.hUSD):''}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-slate-400 text-[10px] whitespace-nowrap">{!esInicio?'$'+bancoFmt(l.sUSD):''}</td>
                  </tr>);})}
              </tbody>
            </table></div>
          </div>
        )}
      </div>
    );
  };

  const ReportesGeneralView = ({ tipo = 'banco' }) => {
    const isBanco = tipo === 'banco';
    const [tasaDia, setTasaDia] = useState(tasaActiva);
    const totBsBanco = cuentas.filter(c=>c.moneda==='BS').reduce((a,c)=>a+Number(c.saldo),0);
    const totUSDBanco = cuentas.filter(c=>c.moneda==='USD').reduce((a,c)=>a+Number(c.saldo),0);
    const totBsEqBanco = cuentas.reduce((a,c)=>a+(c.moneda==='BS'?Number(c.saldo):Number(c.saldo)*tasaDia),0);
    const saldoCajaBs  = movCaja.filter(m=>m.moneda==='BS' ).reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoBs||0),0);
    const saldoCajaUSD = movCaja.filter(m=>m.moneda==='USD').reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoUSD||0),0);
    const totBsEqCaja = saldoCajaBs + (saldoCajaUSD * tasaDia);
    const imprimir=()=>{
      const gruposImp = [
        {tipo:'Nacional-Bs', titulo:'🇻🇪 Cuentas Nacionales — Bolívares'},
        {tipo:'Nacional-Ext', titulo:'💵 Cuentas Moneda Extranjera'},
        {tipo:'Internacional', titulo:'🌐 Cuentas Internacionales'},
        {tipo:'Electronica', titulo:'💳 Cuentas Electrónicas'},
        {tipo:'Tarjeta-Debito-Intl', titulo:'🪪 Tarjetas de Débito Internacionales'},
        {tipo:'Pago-Movil', titulo:'📱 Pago Móvil'},
      ];
      const renderTabla=(lista,titulo)=>{if(lista.length===0)return '';const rows=lista.map(c=>{const bs=c.moneda==='BS';const usd=bs?Number(c.saldo)/tasaDia:Number(c.saldo);const bsEq=bs?Number(c.saldo):Number(c.saldo)*tasaDia;return`<tr><td>${c.banco}</td><td>${c.numeroCuenta}</td><td>${c.tipoCuenta||'—'}</td><td>${c.moneda}</td><td style="text-align:right;font-weight:bold">Bs.${bancoFmt(bsEq)}</td><td style="text-align:right;color:#16a34a;font-weight:bold">$${bancoFmt(usd)}</td></tr>`;}).join('');return`<h3 style="margin-top:20px;font-size:12px;color:#1e3a8a;text-transform:uppercase;">${titulo}</h3><table><thead><tr><th>Banco</th><th>Nro. Cuenta</th><th>Tipo</th><th>Moneda</th><th>Saldo Bs.</th><th>Equiv. USD</th></tr></thead><tbody>${rows}</tbody></table>`;};
      const secciones = gruposImp.map(g=>renderTabla(cuentas.filter(c=>c.tipoBanco===g.tipo),g.titulo)).join('');
      bancoPrintWindow(bancoLetterheadOpen('Reporte General Bancario',`RIF: J-412309374 · ${bancoDd(getTodayDate())} · ${cuentas.length} cuentas · Tasa del día: ${tasaDia}`)+secciones+`<div style="margin-top:20px;padding:10px;background:#0f172a;color:#fff;text-align:right;font-weight:bold;font-size:12px;">TOTAL CONSOLIDADO: Bs.${bancoFmt(totBsEqBanco)} | $${bancoFmt(totBsEqBanco/tasaDia)}</div>`+bancoLetterheadClose(`${cuentas.length} cuenta(s)`));
    };
    const TasaDiaInput = (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <label className="text-[10px] font-black text-amber-700 uppercase whitespace-nowrap">Tasa del día (Bs./$)</label>
        <input type="number" step="0.0001" value={tasaDia} onChange={e=>setTasaDia(Number(e.target.value)||0)} className="w-32 border-2 border-amber-300 rounded-lg px-2 py-1 text-xs font-black outline-none focus:border-amber-500 bg-white"/>
        <span className="text-[9px] text-amber-600">Usada para todos los equivalentes Bs. ↔ USD de este reporte.</span>
      </div>
    );
    if(!isBanco) return(
      <div className="space-y-5 w-full min-w-0">
        {TasaDiaInput}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BKPI label="Total Caja Bs." value={`Bs. ${bancoFmt(saldoCajaBs)}`} accent="blue" Icon={PiggyBank} sub={`$${bancoFmt(saldoCajaBs/tasaDia)} USD equiv.`}/>
          <BKPI label="Total Caja USD" value={`$${bancoFmt(saldoCajaUSD)}`} accent="green" Icon={DollarSign} sub={`Bs.${bancoFmt(saldoCajaUSD*tasaDia)} equiv.`}/>
          <BKPI label="Consolidado Global" value={`$${bancoFmt(totBsEqCaja/tasaDia)}`} accent="gold" Icon={TrendingUp} sub="Equivalente en USD"/>
        </div>
        <BCard title="Resumen General de Caja">
          <div className="overflow-x-auto w-full min-w-0"><table className="w-full min-w-[600px]">
            <thead><tr><BTh>Caja Operativa</BTh><BTh>Moneda</BTh><BTh right>Saldo Actual</BTh><BTh right>Equivalencia</BTh></tr></thead>
            <tbody>
              <tr className="hover:bg-slate-50"><BTd className="font-black">Caja Principal (Bolívares)</BTd><BTd><BPill usd={false}>BS</BPill></BTd><BTd right mono className="font-black">Bs. {bancoFmt(saldoCajaBs)}</BTd><BTd right mono className="text-emerald-600 font-black">$ {bancoFmt(saldoCajaBs/tasaDia)}</BTd></tr>
              <tr className="hover:bg-slate-50"><BTd className="font-black">Caja Principal (Divisas)</BTd><BTd><BPill usd={true}>USD</BPill></BTd><BTd right mono className="font-black">$ {bancoFmt(saldoCajaUSD)}</BTd><BTd right mono className="text-blue-600 font-black">Bs. {bancoFmt(saldoCajaUSD*tasaDia)}</BTd></tr>
            </tbody>
          </table></div>
        </BCard>
      </div>
    );
    return(
      <div className="space-y-5 w-full min-w-0">
        {TasaDiaInput}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BKPI label="Total Bs." value={`Bs. ${bancoFmt(totBsBanco)}`} accent="blue" Icon={Building2} sub={`$${bancoFmt(totBsBanco/tasaDia)} USD equiv.`}/>
          <BKPI label="Total USD" value={`$${bancoFmt(totUSDBanco)}`} accent="green" Icon={DollarSign}/>
          <BKPI label="Consolidado USD" value={`$${bancoFmt(totBsEqBanco/tasaDia)}`} accent="gold" Icon={TrendingUp} sub="Todas las cuentas"/>
        </div>
        <BCard title="Resumen General Bancario" action={<button onClick={imprimir} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-sm"><Download size={12}/> PDF Membretado</button>}>
          {[{titulo:'Cuentas Nacionales Bs.',tipos:['Nacional-Bs']},{titulo:'Cuentas Moneda Extranjera',tipos:['Nacional-Ext']},{titulo:'Cuentas Internacionales',tipos:['Internacional']},{titulo:'Cuentas Electrónicas',tipos:['Electronica']},{titulo:'Tarjetas de Débito Internacionales',tipos:['Tarjeta-Debito-Intl']},{titulo:'Pago Móvil',tipos:['Pago-Movil','Pago Móvil']}].filter(g=>cuentas.some(c=>g.tipos.includes(c.tipoBanco))).map(g=>(
            <div key={g.titulo} className="mb-4">
              <p className="text-xs font-black uppercase text-slate-500 mb-2">{g.titulo}</p>
              <div className="overflow-x-auto w-full min-w-0"><table className="w-full min-w-[700px]">
                <thead><tr><BTh>Banco</BTh><BTh>Nro.</BTh><BTh>Tipo</BTh><BTh>Moneda</BTh><BTh right>Saldo</BTh><BTh right>Equivalente</BTh></tr></thead>
                <tbody>{cuentas.filter(c=>g.tipos.includes(c.tipoBanco||'Nacional-Bs')).map(c=>{
                  const bs=c.moneda==='BS';const usd=bs?Number(c.saldo)/tasaDia:Number(c.saldo);const bsEq=bs?Number(c.saldo):Number(c.saldo)*tasaDia;
                  return<tr key={c.id} className="hover:bg-slate-50"><BTd className="font-black"><div className="flex items-center gap-2"><BBankLogo banco={c.banco} logoUrl={c.logoUrl} className="w-6 h-6 rounded shadow-sm object-contain border border-slate-200"/><span>{c.banco}</span></div></BTd><BTd mono className="text-[10px]">{c.numeroCuenta}</BTd><BTd className="text-[10px]">{c.tipoCuenta}</BTd><BTd><BPill usd={!bs}>{c.moneda}</BPill></BTd><BTd right mono className="font-black">{bs?'Bs.':'$'} {bancoFmt(c.saldo)}</BTd><BTd right mono className="text-emerald-600 font-black">{bs?'$'+bancoFmt(usd):'Bs.'+bancoFmt(bsEq)}</BTd></tr>;
                })}</tbody>
              </table></div>
            </div>
          ))}
        </BCard>
      </div>
    );
  };

  const BancoTable = ({title, tableRows, onPDF, onXLS}) => {
    if(tableRows.length===0) return null;
    let saldoRunBs=0, saldoRunUSD=0;
    return(
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-3">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
          <p className="font-black text-xs text-slate-800 uppercase tracking-wide">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-400">{tableRows.length} asiento(s)</span>
            <button onClick={onPDF} className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded-lg text-[8px] font-black uppercase hover:bg-red-700"><Download size={9}/> PDF</button>
            <button onClick={onXLS} className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-lg text-[8px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={9}/> XLS</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{fontSize:'9px', tableLayout:'fixed', minWidth:'1050px'}}>
            <colgroup>
              <col style={{width:'90px'}}/><col style={{width:'45px'}}/><col style={{width:'60px'}}/>
              <col style={{width:'60px'}}/><col style={{width:'130px'}}/><col style={{width:'28px'}}/>
              <col style={{width:'70px'}}/><col style={{width:'280px'}}/><col style={{width:'45px'}}/>
              <col style={{width:'70px'}}/><col style={{width:'70px'}}/><col style={{width:'70px'}}/>
              <col style={{width:'60px'}}/><col style={{width:'60px'}}/><col style={{width:'60px'}}/>
            </colgroup>
            <thead>
              <tr style={{background:'#0f172a'}}>
                {['Comprobante','Mes','Fecha','Código','Cuenta de Movimiento','T','Nro Doc','Concepto','Tasa','Debe Bs.','Haber Bs.','Saldo Bs.','Debe $','Haber $','Saldo $'].map((h,hi)=>(
                  <th key={hi} className={`px-2 py-2 font-black uppercase text-slate-300 whitespace-nowrap ${hi>=9?'text-right':hi===5?'text-center':'text-left'}`} style={{fontSize:'8px'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.flatMap((r,idx)=>{
                const lineas=r.lineas||[];
                const comp=(title||'').split('·')[0].trim()||r.comprobante||r.numero||('CB-'+(idx+1).toString().padStart(4,'0'));
                const mesL=r.fecha?r.fecha.substring(5,7)+'/'+r.fecha.substring(0,4):'—';
                const nroDoc=r.nroDocumento||r.referencia||'—';
                const conc=r.descripcion||r.concepto||'—';
                const tasa=Number(r.tasa||tasaActiva);
                return lineas.map((l,li)=>{
                  const dBs=Number(l.debeBs||0),hBs=Number(l.haberBs||0);
                  const dU=Number(l.debeUSD||0),hU=Number(l.haberUSD||0);
                  saldoRunBs+=dBs-hBs; saldoRunUSD+=dU-hU;
                  const isD=l.tipoLinea==='D';
                  return(
                    <tr key={`${r.id||idx}-${li}`} className={`border-b border-slate-50 hover:bg-indigo-50/30 ${li===0?'border-t border-t-slate-200':''}`}>
                      <td className="px-2 py-1.5 font-mono font-black text-blue-600 truncate" title={comp}>{li===0?comp:''}</td>
                      <td className="px-2 py-1.5 text-slate-400">{li===0?mesL:''}</td>
                      <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{li===0?bancoDd(r.fecha):''}</td>
                      <td className="px-2 py-1.5 font-mono text-blue-500 truncate">{l.codigo||'—'}</td>
                      <td className="px-2 py-1.5 font-semibold text-slate-800 truncate" style={{paddingLeft:isD?'6px':'14px'}} title={l.cuenta}>{l.cuenta||'—'}</td>
                      <td className="px-2 py-1.5 text-center"><span className={`font-black ${isD?'text-emerald-600':'text-red-500'}`}>{l.tipoLinea}</span></td>
                      <td className="px-2 py-1.5 font-mono text-slate-400 truncate">{li===0?nroDoc:''}</td>
                      <td className="px-2 py-1.5 text-slate-600 whitespace-normal break-words">{li===0?conc:''}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-slate-400">{li===0?bancoFmt(tasa):''}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-black text-emerald-700 whitespace-nowrap">{dBs>0?'Bs.'+bancoFmt(dBs):''}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-black text-red-500 whitespace-nowrap">{hBs>0?'Bs.'+bancoFmt(hBs):''}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-slate-400 whitespace-nowrap">{li===lineas.length-1?'Bs.'+bancoFmt(saldoRunBs):''}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-black text-emerald-600 whitespace-nowrap">{dU>0?'$'+bancoFmt(dU):''}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-black text-red-400 whitespace-nowrap">{hU>0?'$'+bancoFmt(hU):''}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-slate-400 whitespace-nowrap">{li===lineas.length-1?'$'+bancoFmt(saldoRunUSD):''}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
            <tfoot>
              <tr style={{background:'#0f172a'}}>
                <td colSpan={9} className="px-2 py-2 text-left font-black uppercase text-slate-400" style={{fontSize:'8px'}}>TOTALES — {tableRows.length} ASIENTO(S)</td>
                <td className="px-2 py-2 text-right font-mono font-black text-emerald-400 whitespace-nowrap">Bs.{bancoFmt(tableRows.reduce((a,r)=>(r.lineas||[]).reduce((b,l)=>b+Number(l.debeBs||0),a),0))}</td>
                <td className="px-2 py-2 text-right font-mono font-black text-red-400 whitespace-nowrap">Bs.{bancoFmt(tableRows.reduce((a,r)=>(r.lineas||[]).reduce((b,l)=>b+Number(l.haberBs||0),a),0))}</td>
                <td></td>
                <td className="px-2 py-2 text-right font-mono font-black text-emerald-300 whitespace-nowrap">{'$'+bancoFmt(tableRows.reduce((a,r)=>(r.lineas||[]).reduce((b,l)=>b+Number(l.debeUSD||0),a),0))}</td>
                <td className="px-2 py-2 text-right font-mono font-black text-red-300 whitespace-nowrap">{'$'+bancoFmt(tableRows.reduce((a,r)=>(r.lineas||[]).reduce((b,l)=>b+Number(l.haberUSD||0),a),0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const ComprobantesBancariosView = ({ tipo = 'banco' }) => {
    const isBanco = tipo === 'banco';
    const movsFuente = isBanco ? movBanco : movCaja;
    const cuentasFuente = isBanco ? cuentas : cajas;
    const nombreCta = (c) => isBanco ? c?.banco : c?.nombre;
    const idField = isBanco ? 'cuentaId' : 'cajaId';
    const [filtBanco,  setFiltBanco]  = useState('');
    const [filtDesde,  setFiltDesde]  = useState(bancoMesActual()+'-01');
    const [filtHasta,  setFiltHasta]  = useState(getTodayDate());
    const [asientosLocal, setAsientosLocal] = useState([]);
    const mes = filtDesde ? filtDesde.substring(0,7) : bancoMesActual();
    useEffect(()=>{
      const u=onSnapshot(query(getColRef('cont_asientos'),orderBy('fecha','desc')),s=>setAsientosLocal(s.docs.map(d=>d.data())));
      return()=>u();
    },[]);
    const applyFiltros = (a, isMov=false) => {
      if(!isMov && a.modulo!==(isBanco?'Bancos':'Caja')) return false;
      if(filtDesde && a.fecha < filtDesde) return false;
      if(filtHasta && a.fecha > filtHasta) return false;
      const bancoId = isMov ? a[idField] : (a[idField] || movsFuente.find(m=>m.id===a.movimientoBancoId)?.[idField]);
      if(filtBanco && bancoId!==filtBanco) return false;
      return true;
    };
    const asientosMes = asientosLocal.filter(a=>applyFiltros(a, false));
    // IDs de movimientos que YA están representados por un asiento formal en cont_asientos —
    // para no duplicarlos al agregar los que todavía no tienen asiento generado.
    const movsYaConAsiento = new Set(asientosLocal.map(a=>a.movimientoBancoId).filter(Boolean));
    const movsSinAsiento = movsFuente.filter(m=>{
      if(movsYaConAsiento.has(m.id)) return false; // ya viene por cont_asientos, evitar duplicado
      return applyFiltros(m, true);
    }).map(m=>{
      const cta=cuentasFuente.find(c=>c.id===m[idField]);
      const isIng=m.tipo==='Ingreso'||m.tipo==='Nota de Crédito';
      const codigoPropio=cta?.cuentaContableCod||'';
      const lineaPropia={codigo:codigoPropio,cuenta:m.cuentaNombre||nombreCta(cta)||'',tipoLinea:isIng?'D':'H',debeBs:isIng?m.montoBs:0,haberBs:isIng?0:m.montoBs,debeUSD:isIng?m.montoUSD:0,haberUSD:isIng?0:m.montoUSD};
      let lineasContra;
      // Se intenta SIEMPRE identificar primero al cliente/proveedor y su cuenta contable YA
      // asignada — porque lineasContra/asientoDebito a veces quedaron guardados con el nombre
      // del cliente/proveedor en vez de su cuenta contable real. Los distintos flujos de guardado
      // usan nombres de campo distintos para el tercero (terceroNombre, clientName, proveedor) —
      // se revisan todos antes de recurrir al concepto.
      const nombreDirecto=m.terceroNombre||m.clientName||m.proveedor||'';
      const partesGuion=(m.concepto||'').split('—').map(s=>s.trim());
      const partesPunto=(m.concepto||'').split('·').map(s=>s.trim());
      const nombreEnConcepto=nombreDirecto||partesGuion[1]||partesPunto[1]||'';
      const nombreNorm=bancoNormNombre(nombreEnConcepto);
      const esProveedorMov=m.tipoTercero==='Proveedor'||!!m.grupoPagoId||!!m.proveedor||!!m.provRif;
      const tercero=(esProveedorMov?(provs||[]).find(p=>p.id===m.terceroId):(clientes||[]).find(c=>c.id===m.terceroId))
        || (clientes||[]).find(c=>nombreNorm && bancoNormNombre(c.razonSocial||c.name||c.nombre)===nombreNorm)
        || (provs||[]).find(p=>nombreNorm && bancoNormNombre(p.razonSocial||p.name||p.nombre)===nombreNorm);
      const [codTercero,nomTercero]=tercero?.cuentaContableNombre?tercero.cuentaContableNombre.split('—').map(s=>s.trim()):['',''];
      const cuentaGenerica=(patron)=>{const cta2=(contCuentas||[]).find(p=>patron.test(p.nombre||''));return cta2?{codigo:String(cta2.codigo||cta2.id||''),nombre:cta2.nombre||''}:null;};
      if(m.tipoTercero==='Relacionado'&&m.terceroId){
        const tercRel=(tercerosRel||[]).find(t=>t.id===m.terceroId);
        const [codRel,nomRel]=tercRel?.cuentaContableNombre?tercRel.cuentaContableNombre.split('—').map(s=>s.trim()):['',''];
        const ctaPrestamo=cuentaGenerica(/(pr[ée]stamo|relacionad)/i);
        lineasContra=[{codigo:codRel||(ctaPrestamo?ctaPrestamo.codigo:''),cuenta:nomRel||(ctaPrestamo?ctaPrestamo.nombre:'Cuentas por Pagar Relacionadas'),tipoLinea:isIng?'H':'D',debeBs:isIng?0:m.montoBs,haberBs:isIng?m.montoBs:0,debeUSD:isIng?0:m.montoUSD,haberUSD:isIng?m.montoUSD:0}];
      }
      else if(tercero&&(codTercero||nomTercero)){
        lineasContra=[{codigo:codTercero||tercero.cuentaContableId||'',cuenta:nomTercero||tercero.razonSocial||tercero.nombre||'',tipoLinea:isIng?'H':'D',debeBs:isIng?0:m.montoBs,haberBs:isIng?m.montoBs:0,debeUSD:isIng?0:m.montoUSD,haberUSD:isIng?m.montoUSD:0}];
      }
      else if(tercero && cuentaGenerica(esProveedorMov?/(cuentas?\s+por\s+pagar|cxp|proveedor)/i:/(cuentas?\s+por\s+cobrar|cxc|client)/i)){
        const g=cuentaGenerica(esProveedorMov?/(cuentas?\s+por\s+pagar|cxp|proveedor)/i:/(cuentas?\s+por\s+cobrar|cxc|client)/i);
        lineasContra=[{codigo:g.codigo,cuenta:g.nombre,tipoLinea:isIng?'H':'D',debeBs:isIng?0:m.montoBs,haberBs:isIng?m.montoBs:0,debeUSD:isIng?0:m.montoUSD,haberUSD:isIng?m.montoUSD:0}];
      }
      else if(m.lineasContra&&m.lineasContra.length>0){
        lineasContra=m.lineasContra.map(l=>({codigo:l.ctaNom?l.ctaNom.split('·')[0].trim():'',cuenta:l.ctaNom?(l.ctaNom.split('·')[1]?.trim()||l.ctaNom):'',tipoLinea:Number(l.debeBs||0)>0?'D':'H',debeBs:Number(l.debeBs||0),haberBs:Number(l.haberBs||0),debeUSD:Number(l.debeUSD||0),haberUSD:Number(l.haberUSD||0)}));
      } else if(m.asientoDebito||m.asientoCredito){
        lineasContra=[{codigo:'',cuenta:isIng?m.asientoCredito:m.asientoDebito,tipoLinea:isIng?'H':'D',debeBs:isIng?0:m.montoBs,haberBs:isIng?m.montoBs:0,debeUSD:isIng?0:m.montoUSD,haberUSD:isIng?m.montoUSD:0}];
      } else {
        const esCobro=!!m.grupoCobroId, esPago=!!m.grupoPagoId;
        const g=esCobro?cuentaGenerica(/(cuentas?\s+por\s+cobrar|cxc|client)/i):esPago?cuentaGenerica(/(cuentas?\s+por\s+pagar|cxp|proveedor)/i):null;
        const contraCodigo=g?g.codigo:'';
        const contraNombre=g?g.nombre:(esCobro?'Cuentas por Cobrar':esPago?'Cuentas por Pagar':'Contrapartida (origen no identificado)');
        lineasContra=[{codigo:contraCodigo,cuenta:contraNombre,tipoLinea:isIng?'H':'D',debeBs:isIng?0:m.montoBs,haberBs:isIng?m.montoBs:0,debeUSD:isIng?0:m.montoUSD,haberUSD:isIng?m.montoUSD:0}];
      }
      return {
        id:m.id, comprobante:nombreCta(cta)||(isBanco?'BANCO':'CAJA'), cuentaId:m[idField],
        fecha:m.fecha, descripcion:m.concepto, nroDocumento:m.referencia||'',
        tasa:m.tasa, cuentaNombre:m.cuentaNombre,
        lineas:[lineaPropia,...lineasContra],
      };
    });
    // Combina AMBAS fuentes (antes se usaba solo una u otra con un ternario, así que en cuanto
    // existía UN asiento formal, se dejaban de mostrar todos los movimientos sin asiento).
    const rows = [...asientosMes, ...movsSinAsiento].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
    const getMovCuentaId = r => r.cuentaId || movsFuente.find(m=>m.id===r.movimientoBancoId)?.[idField]||null;

    // ── PDF / XLS generator ──────────────────────────────────────────────────
    const buildHTML = (tableRows, titleLabel) => {
      let sBs=0, sUSD=0;
      const rowsHtml = tableRows.flatMap(r=>{
        const lineas=r.lineas||[];
        const comp=nombreCta(cuentasFuente.find(c=>c.id===getMovCuentaId(r)))||r.comprobante||r.numero||'—';
        const mesL=r.fecha?r.fecha.substring(5,7)+'/'+r.fecha.substring(0,4):'—';
        const nroDoc=r.nroDocumento||r.referencia||'—';
        const conc=r.descripcion||r.concepto||'—';
        const tasa=Number(r.tasa||tasaActiva);
        return lineas.map((l,li)=>{
          const dBs=Number(l.debeBs||0),hBs=Number(l.haberBs||0);
          const dU=Number(l.debeUSD||0),hU=Number(l.haberUSD||0);
          sBs+=dBs-hBs; sUSD+=dU-hU;
          return `<tr style="border-bottom:1px solid #e2e8f0"><td>${li===0?comp:''}</td><td>${li===0?mesL:''}</td><td>${li===0?bancoDd(r.fecha):''}</td><td style="font-family:monospace;color:#2563eb">${l.codigo||'—'}</td><td style="padding-left:${l.tipoLinea==='H'?'16':'4'}px">${l.cuenta||'—'}</td><td style="text-align:center;font-weight:900;color:${l.tipoLinea==='D'?'#16a34a':'#dc2626'}">${l.tipoLinea}</td><td>${li===0?nroDoc:''}</td><td>${li===0?conc:''}</td><td style="text-align:right">${li===0?bancoFmt(tasa):''}</td><td style="text-align:right;color:#16a34a">${dBs>0?'Bs.'+bancoFmt(dBs):''}</td><td style="text-align:right;color:#dc2626">${hBs>0?'Bs.'+bancoFmt(hBs):''}</td><td style="text-align:right;color:#64748b">${li===lineas.length-1?'Bs.'+bancoFmt(sBs):''}</td><td style="text-align:right;color:#16a34a">${dU>0?'$'+bancoFmt(dU):''}</td><td style="text-align:right;color:#dc2626">${hU>0?'$'+bancoFmt(hU):''}</td><td style="text-align:right;color:#64748b">${li===lineas.length-1?'$'+bancoFmt(sUSD):''}</td></tr>`;
        });
      }).join('');
      return bancoLetterheadOpen(`Comprobante Contable Bancario — ${titleLabel}`,`${tableRows.length} asiento(s) · Tasa ${tasaActiva} Bs/$ · ${bancoDd(getTodayDate())}`)+
        `<style>table{font-size:9px;border-collapse:collapse;width:100%}th{background:#0f172a;color:#e2e8f0;padding:6px 8px;text-align:left;font-size:8px;text-transform:uppercase;white-space:nowrap}td{padding:4px 8px;vertical-align:middle}tr:nth-child(even){background:#f8fafc}.tfoot-row{background:#0f172a;color:white;font-weight:900}</style>
        <table><thead><tr><th>Comprobante</th><th>Mes</th><th>Fecha</th><th>Código</th><th>Cuenta de Movimiento</th><th style="text-align:center">T</th><th>Nro Doc</th><th>Concepto</th><th style="text-align:right">Tasa</th><th style="text-align:right;color:#4ade80">Debe Bs.</th><th style="text-align:right;color:#f87171">Haber Bs.</th><th style="text-align:right">Saldo Bs.</th><th style="text-align:right;color:#4ade80">Debe $</th><th style="text-align:right;color:#f87171">Haber $</th><th style="text-align:right">Saldo $</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr class="tfoot-row"><td colspan="9">TOTALES — ${tableRows.length} asiento(s)</td><td style="text-align:right;color:#4ade80">Bs.${bancoFmt(tableRows.reduce((a,r)=>(r.lineas||[]).reduce((b,l)=>b+Number(l.debeBs||0),a),0))}</td><td style="text-align:right;color:#f87171">Bs.${bancoFmt(tableRows.reduce((a,r)=>(r.lineas||[]).reduce((b,l)=>b+Number(l.haberBs||0),a),0))}</td><td></td><td style="text-align:right;color:#4ade80">$${bancoFmt(tableRows.reduce((a,r)=>(r.lineas||[]).reduce((b,l)=>b+Number(l.debeUSD||0),a),0))}</td><td style="text-align:right;color:#f87171">$${bancoFmt(tableRows.reduce((a,r)=>(r.lineas||[]).reduce((b,l)=>b+Number(l.haberUSD||0),a),0))}</td><td></td></tr></tfoot></table>`+
        bancoLetterheadClose('Módulo: Tesorería & Bancos');
    };
    const imprimirPDF=(tr,tl)=>bancoPrintWindow(buildHTML(tr,tl));
    const imprimirXLS=(tr,tl)=>{const h=buildHTML(tr,tl);const b=new Blob([h],{type:'application/vnd.ms-excel;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`comp_banco_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(u);};

    return (
      <div className="space-y-3">
        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 flex flex-wrap items-end gap-3">
          <BFG label={isBanco?'Banco':'Caja'}>
            <select className={`${sel} min-w-[160px]`} value={filtBanco} onChange={e=>setFiltBanco(e.target.value)}>
              <option value="">{isBanco?'Todos los bancos':'Todas las cajas'}</option>
              {isBanco?[{label:'🇻🇪 Nacionales Bs.',items:cuentasFuente.filter(c=>c.tipoBanco==='Nacional-Bs')},
                {label:'💵 Moneda Extranjera',items:cuentasFuente.filter(c=>c.tipoBanco==='Nacional-Ext')},
                {label:'🌐 Internacionales',items:cuentasFuente.filter(c=>c.tipoBanco==='Internacional')},
                {label:'💳 Electrónicas',items:cuentasFuente.filter(c=>c.tipoBanco==='Electronica')},
                {label:'🪪 Tarjetas Débito Intl.',items:cuentasFuente.filter(c=>c.tipoBanco==='Tarjeta-Debito-Intl')},
                {label:'📱 Pago Móvil',items:cuentasFuente.filter(c=>c.tipoBanco==='Pago-Movil'||c.tipoBanco==='Pago Móvil')}
              ].map(g=>g.items.length>0&&(
                <optgroup key={g.label} label={g.label}>{g.items.map(c=><option key={c.id} value={c.id}>{nombreCta(c)}</option>)}</optgroup>
              )):cuentasFuente.map(c=><option key={c.id} value={c.id}>{nombreCta(c)}</option>)}
            </select>
          </BFG>
          <BFG label="Desde"><input type="date" className={inp} value={filtDesde} onChange={e=>setFiltDesde(e.target.value)}/></BFG>
          <BFG label="Hasta"><input type="date" className={inp} value={filtHasta} onChange={e=>setFiltHasta(e.target.value)}/></BFG>
          {(filtBanco||filtDesde!==bancoMesActual()+'-01'||filtHasta!==getTodayDate())&&(
            <button onClick={()=>{setFiltBanco('');setFiltDesde(bancoMesActual()+'-01');setFiltHasta(getTodayDate());}} className="self-end mb-0.5 text-[9px] font-black text-slate-400 hover:text-red-500 px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-red-50">✕</button>
          )}
          <div className="ml-auto self-end flex gap-2">
            <button onClick={()=>imprimirPDF(rows, filtBanco?nombreCta(cuentasFuente.find(c=>c.id===filtBanco))||'Banco':`${mes}`)} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-red-700"><Download size={10}/> PDF</button>
            <button onClick={()=>imprimirXLS(rows, filtBanco?nombreCta(cuentasFuente.find(c=>c.id===filtBanco))||'Banco':`${mes}`)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={10}/> Excel</button>
          </div>
          <p className="w-full text-[9px] text-slate-400">{filtBanco?nombreCta(cuentasFuente.find(c=>c.id===filtBanco))||(isBanco?'Banco':'Caja'):(isBanco?'Todos los bancos':'Todas las cajas')} · {bancoDd(filtDesde)} al {bancoDd(filtHasta)} · <strong className="text-slate-700">{rows.length} resultado(s)</strong></p>
        </div>

        {/* Tablas por banco/caja */}
        {rows.length===0&&<div className="bg-white rounded-xl border border-slate-100 p-8"><BEmptyState icon={BookOpen} title="Sin asientos" desc={`Los asientos se generan automáticamente al registrar movimientos ${isBanco?'bancarios':'de caja'}`}/></div>}
        {filtBanco
          ? <BancoTable title={nombreCta(cuentasFuente.find(c=>c.id===filtBanco))||(isBanco?'Banco':'Caja')} tableRows={rows} onPDF={()=>imprimirPDF(rows,nombreCta(cuentasFuente.find(c=>c.id===filtBanco))||'Banco')} onXLS={()=>imprimirXLS(rows,nombreCta(cuentasFuente.find(c=>c.id===filtBanco))||'Banco')}/>
          : isBanco
          ? (()=>{
              const grupos=[
                {label:'🇻🇪 Cuentas Nacionales — Bolívares', bancos:cuentasFuente.filter(c=>c.tipoBanco==='Nacional-Bs')},
                {label:'💵 Cuentas Moneda Extranjera', bancos:cuentasFuente.filter(c=>c.tipoBanco==='Nacional-Ext')},
                {label:'🌐 Cuentas Internacionales', bancos:cuentasFuente.filter(c=>c.tipoBanco==='Internacional')},
                {label:'💳 Cuentas Electrónicas', bancos:cuentasFuente.filter(c=>c.tipoBanco==='Electronica')},
                {label:'🪪 Tarjetas de Débito Internacionales', bancos:cuentasFuente.filter(c=>c.tipoBanco==='Tarjeta-Debito-Intl')},
                {label:'📱 Pago Móvil', bancos:cuentasFuente.filter(c=>c.tipoBanco==='Pago-Movil'||c.tipoBanco==='Pago Móvil')},
              ];
              return grupos.map(g=>{
                const bancosConMovs=g.bancos.filter(c=>rows.some(r=>getMovCuentaId(r)===c.id));
                if(bancosConMovs.length===0) return null;
                return(
                  <div key={g.label} className="space-y-2">
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{g.label}</p>
                      <div className="flex-1 h-px bg-slate-100"/>
                    </div>
                    {bancosConMovs.map(c=>{
                      const bancoRows=rows.filter(r=>getMovCuentaId(r)===c.id);
                      return <BancoTable key={c.id} title={`${c.banco} · ${c.numeroCuenta}`} tableRows={bancoRows} onPDF={()=>imprimirPDF(bancoRows,c.banco)} onXLS={()=>imprimirXLS(bancoRows,c.banco)}/>;
                    })}
                  </div>
                );
              });
            })()
          : cuentasFuente.filter(c=>rows.some(r=>getMovCuentaId(r)===c.id)).map(c=>{
              const cajaRows=rows.filter(r=>getMovCuentaId(r)===c.id);
              return <BancoTable key={c.id} title={c.nombre} tableRows={cajaRows} onPDF={()=>imprimirPDF(cajaRows,c.nombre)} onXLS={()=>imprimirXLS(cajaRows,c.nombre)}/>;
            })
        }
        {!filtBanco&&rows.filter(r=>!getMovCuentaId(r)).length>0&&(
          <BancoTable title={isBanco?'Sin banco identificado':'Sin caja identificada'} tableRows={rows.filter(r=>!getMovCuentaId(r))} onPDF={()=>imprimirPDF(rows.filter(r=>!getMovCuentaId(r)),'Sin identificar')} onXLS={()=>imprimirXLS(rows.filter(r=>!getMovCuentaId(r)),'Sin identificar')}/>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // RECIPROCIDAD DE BANCO — % y monto de cobros de CxC por cuenta bancaria
  // ══════════════════════════════════════════════════════════════════════
  // Solo cuentan ingresos que provienen de cobros a clientes (CxC): se identifican
  // por el campo origenIngreso guardado en banco_movimientos al registrar un cobro
  // en Aplicación.jsx. Traslados de fondo y pagos a proveedores (CxP) quedan afuera.
  const ORIGENES_CXC_RECIPROCIDAD = ['Cobro CxC','Cobro NE','Anticipo Cliente'];
  const ReciprocidadView = () => {
    const [fDesde, setFDesde] = useState(bancoMesActual()+'-01');
    const [fHasta, setFHasta] = useState(getTodayDate());
    const [bancoSel, setBancoSel] = useState('');
    const [clienteAbierto, setClienteAbierto] = useState('');

    const setRangoMes = (offset) => {
      const d = new Date(); d.setMonth(d.getMonth()+offset);
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0');
      const ultimoDia = new Date(y, d.getMonth()+1, 0).getDate();
      setFDesde(`${y}-${m}-01`); setFHasta(`${y}-${m}-${String(ultimoDia).padStart(2,'0')}`);
    };
    const setRangoAnio = () => { setFDesde(getTodayDate().substring(0,4)+'-01-01'); setFHasta(getTodayDate()); };
    const setRangoTodo = () => { setFDesde('2000-01-01'); setFHasta(getTodayDate()); };

    // movsPeriodo: cobros CxC del rango de fechas, sin aplicar el filtro de banco — así el % de
    // cada banco es siempre relativo al total del período, aunque luego se filtre a uno solo.
    const movsPeriodo = movBanco.filter(m =>
      ORIGENES_CXC_RECIPROCIDAD.includes(m.origenIngreso) &&
      (!fDesde || m.fecha>=fDesde) && (!fHasta || m.fecha<=fHasta)
    );
    const totalGrandUSD = movsPeriodo.reduce((a,m)=>a+Number(m.montoUSD||0),0);

    const porBancoTodos = {};
    movsPeriodo.forEach(m=>{
      const key = m.cuentaId || 'sin-cuenta';
      if(!porBancoTodos[key]) porBancoTodos[key] = {usd:0,bs:0,count:0};
      porBancoTodos[key].usd += Number(m.montoUSD||0);
      porBancoTodos[key].bs  += Number(m.montoBs||0);
      porBancoTodos[key].count += 1;
    });
    const bancosDisponibles = Object.entries(porBancoTodos).map(([cuentaId,v])=>({
      cuentaId, cta: cuentas.find(c=>c.id===cuentaId), usd: v.usd,
    })).sort((a,b)=>b.usd-a.usd);

    const movsCxC = bancoSel ? movsPeriodo.filter(m=>m.cuentaId===bancoSel) : movsPeriodo;
    const totalUSD = movsCxC.reduce((a,m)=>a+Number(m.montoUSD||0),0);
    const totalBs  = movsCxC.reduce((a,m)=>a+Number(m.montoBs||0),0);

    const filasBanco = Object.entries(porBancoTodos)
      .filter(([cuentaId]) => !bancoSel || cuentaId===bancoSel)
      .map(([cuentaId,v])=>({
        cuentaId, cta: cuentas.find(c=>c.id===cuentaId), ...v,
        pct: totalGrandUSD>0 ? (v.usd/totalGrandUSD*100) : 0,
      })).sort((a,b)=>b.usd-a.usd);

    // clientesPorBanco: por cliente, totales + relación de cobros individuales (fecha, referencia,
    // concepto, montos) — se despliega con un clic, igual que en Estado de Cuenta de CxC.
    const clientesPorBanco = (cuentaId) => {
      const porCliente = {};
      movsPeriodo.filter(m=>m.cuentaId===cuentaId).forEach(m=>{
        const nombre = m.clientName || m.terceroNombre || 'Cliente sin identificar';
        const key = m.clientRif || nombre;
        if(!porCliente[key]) porCliente[key] = {nombre, rif:m.clientRif||'', usd:0, bs:0, count:0, txns:[]};
        porCliente[key].usd += Number(m.montoUSD||0);
        porCliente[key].bs  += Number(m.montoBs||0);
        porCliente[key].count += 1;
        porCliente[key].txns.push({fecha:m.fecha||'', referencia:m.referencia||'', concepto:m.concepto||'', usd:Number(m.montoUSD||0), bs:Number(m.montoBs||0)});
      });
      const lista = Object.values(porCliente);
      lista.forEach(c=>c.txns.sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')));
      return lista.sort((a,b)=>b.usd-a.usd);
    };

    return (
      <div className="space-y-5 w-full min-w-0">
        <BCard title="Reciprocidad de Banco" subtitle="Solo cobros de Cuentas por Cobrar (excluye traslados de fondo y pagos a proveedores)">
          <div className="flex flex-wrap items-end gap-3">
            <BFG label="Desde"><input type="date" value={fDesde} onChange={e=>setFDesde(e.target.value)} className={inp}/></BFG>
            <BFG label="Hasta"><input type="date" value={fHasta} onChange={e=>setFHasta(e.target.value)} className={inp}/></BFG>
            <BFG label="Banco">
              <select value={bancoSel} onChange={e=>{setBancoSel(e.target.value);setClienteAbierto('');}} className={sel}>
                <option value="">Todos los bancos</option>
                {bancosDisponibles.map(b=><option key={b.cuentaId} value={b.cuentaId}>{b.cta?.banco || 'Sin banco identificado'}</option>)}
              </select>
            </BFG>
            <div className="flex gap-1.5 pb-0.5">
              <button onClick={()=>setRangoMes(0)}  className="px-3 py-2 text-[9px] font-black uppercase rounded-lg border-2 border-slate-200 hover:bg-slate-50">Este Mes</button>
              <button onClick={()=>setRangoMes(-1)} className="px-3 py-2 text-[9px] font-black uppercase rounded-lg border-2 border-slate-200 hover:bg-slate-50">Mes Anterior</button>
              <button onClick={setRangoAnio}        className="px-3 py-2 text-[9px] font-black uppercase rounded-lg border-2 border-slate-200 hover:bg-slate-50">Este Año</button>
              <button onClick={setRangoTodo}         className="px-3 py-2 text-[9px] font-black uppercase rounded-lg border-2 border-slate-200 hover:bg-slate-50">Todo</button>
            </div>
          </div>
        </BCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BKPI label={bancoSel?'Total Cobrado (Banco Filtrado)':'Total Cobrado (Período)'} value={`$${bancoFmt(totalUSD)}`} sub={`Bs. ${bancoFmt(totalBs)}`} accent="green" Icon={DollarSign}/>
          <BKPI label="Cobros Registrados" value={String(movsCxC.length)} accent="blue" Icon={Receipt}/>
          <BKPI label="Bancos con Reciprocidad" value={String(bancosDisponibles.length)} accent="gold" Icon={Building2}/>
        </div>

        <BCard title="Reciprocidad por Banco" subtitle={`${bancoDd(fDesde)} al ${bancoDd(fHasta)}`}>
          {filasBanco.length===0
            ? <BEmptyState icon={Activity} title="Sin cobros en el período" desc="No hay cobros de CxC registrados en las cuentas bancarias para el rango seleccionado"/>
            : (
              <div className="space-y-3.5">
                {filasBanco.map(f=>(
                  <div key={f.cuentaId} className="rounded-xl p-3 border-2 border-transparent">
                    <div className="flex justify-between items-end text-[10px] font-bold text-slate-700 mb-1.5">
                      <span className="uppercase flex items-center gap-2">
                        <BBankLogo banco={f.cta?.banco||'?'} logoUrl={f.cta?.logoUrl} className="w-6 h-6 rounded shadow-sm border border-slate-200 object-contain"/>
                        {f.cta?.banco || 'Sin banco identificado'}
                        <span className="text-[8px] text-slate-400 font-mono normal-case">{f.count} cobro(s)</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-mono text-slate-900 font-black">${bancoFmt(f.usd)}</span>
                        <span className="block text-[8px] text-slate-400 font-mono">Bs. {bancoFmt(f.bs)}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className={`${f.cta?.moneda==='BS'?'bg-blue-500':'bg-emerald-500'} h-full rounded-full`} style={{width:`${Math.min(f.pct,100)}%`}}/>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono mt-1 text-right">{f.pct.toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            )}
        </BCard>

        <BCard title="Detalle por Banco — Clientes que Pagaron" subtitle="Clic en un cliente para ver su relación de cobros, igual que en Estado de Cuenta">
          {filasBanco.length===0
            ? <BEmptyState icon={Users} title="Sin clientes" desc="No hay cobros de clientes en el período/banco seleccionado"/>
            : (
              <div className="space-y-4">
                {filasBanco.map(f=>{
                  const clientesB = clientesPorBanco(f.cuentaId);
                  return (
                    <div key={f.cuentaId} className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-2.5 bg-orange-50 border-b border-orange-100">
                        <p className="text-[10px] font-black uppercase text-orange-700 flex items-center gap-2">
                          <BBankLogo banco={f.cta?.banco||'?'} logoUrl={f.cta?.logoUrl} className="w-5 h-5 rounded shadow-sm border border-orange-200 object-contain"/>
                          {f.cta?.banco || 'Sin banco identificado'} <span className="text-orange-400 font-bold">({f.pct.toFixed(1)}%)</span>
                        </p>
                        <p className="text-[10px] font-black text-orange-700">${bancoFmt(f.usd)} <span className="text-[9px] text-orange-400 font-bold">Bs. {bancoFmt(f.bs)}</span></p>
                      </div>
                      <table className="w-full min-w-[560px]">
                        <thead><tr><BTh>Cliente</BTh><BTh right>Cobros</BTh><BTh right>Monto USD</BTh><BTh right>Monto Bs.</BTh></tr></thead>
                        <tbody>
                          {clientesB.map(c=>{
                            const key = `${f.cuentaId}::${c.rif||c.nombre}`;
                            const abierto = clienteAbierto===key;
                            return (
                              <React.Fragment key={key}>
                                <tr className={`cursor-pointer hover:bg-slate-50 ${abierto?'bg-blue-50':''}`} onClick={()=>setClienteAbierto(abierto?'':key)}>
                                  <BTd className="font-black">
                                    <span className="inline-block w-3 text-slate-400">{abierto?'▼':'▶'}</span> {c.nombre}
                                    <span className="block text-[9px] font-mono text-slate-400 font-normal pl-4">{c.rif||'—'}</span>
                                  </BTd>
                                  <BTd right>{c.count}</BTd>
                                  <BTd right mono className="text-emerald-600 font-black">${bancoFmt(c.usd)}</BTd>
                                  <BTd right mono className="text-slate-500">Bs. {bancoFmt(c.bs)}</BTd>
                                </tr>
                                {abierto && (
                                  <tr><td colSpan={4} className="p-0">
                                    <div style={{background:'#0f172a'}} className="p-3">
                                      <table className="w-full text-[10px]">
                                        <thead>
                                          <tr className="text-slate-400"><th className="py-1.5 px-3 text-left font-black uppercase">Fecha</th><th className="py-1.5 px-3 text-left font-black uppercase">Referencia</th><th className="py-1.5 px-3 text-left font-black uppercase">Concepto</th><th className="py-1.5 px-3 text-right font-black uppercase">Monto USD</th><th className="py-1.5 px-3 text-right font-black uppercase">Monto Bs.</th></tr>
                                        </thead>
                                        <tbody>
                                          {c.txns.map((t,ti)=>(
                                            <tr key={ti} className="border-t border-slate-700">
                                              <td className="py-1.5 px-3 text-slate-200">{bancoDd(t.fecha)}</td>
                                              <td className="py-1.5 px-3 text-blue-300 font-mono">{t.referencia||'—'}</td>
                                              <td className="py-1.5 px-3 text-slate-300">{t.concepto||'—'}</td>
                                              <td className="py-1.5 px-3 text-right font-black text-emerald-400">${bancoFmt(t.usd)}</td>
                                              <td className="py-1.5 px-3 text-right text-slate-400">Bs. {bancoFmt(t.bs)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td></tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
        </BCard>
      </div>
    );
  };

  const navGroupsBanco = [
    { group:'Analítica',   color:'#f97316', items:[{id:'dashboard',    label:'Panel General',      icon:LayoutDashboard}] },
    { group:'Bancos',      color:'#3b82f6', items:[{id:'cuentas',      label:'Cuentas Bancarias',  icon:Building2},
                                                    {id:'movimientos',  label:'Movimientos Banco',  icon:ArrowLeftRight},
                                                    {id:'pagos_identificar',label:'Pagos por Identificar',icon:Inbox},
                                                    {id:'conciliacion', label:'Conciliación',       icon:CheckCircle},
                                                    {id:'reciprocidad', label:'Reciprocidad de Banco',icon:Activity}] },
    { group:'Reportes',    color:'#f59e0b', items:[{id:'rpt_gral_banco',label:'General de Banco',   icon:Building2},
                                                    {id:'rpt_comp_banco',label:'Comprobante Bancario',icon:FileText},
                                                    {id:'rpt_libro',    label:'Libro Diario General',icon:BookOpen}] },
  ];
  const navGroupsCaja = [
    { group:'Analítica',   color:'#10b981', items:[{id:'caja_dashboard', label:'Panel General',    icon:LayoutDashboard}] },
    { group:'Caja',        color:'#10b981', items:[{id:'cuentas_caja',   label:'Cuentas de Caja',  icon:PiggyBank},
                                                    {id:'caja_op',       label:'Operaciones Caja', icon:Banknote},
                                                    {id:'pagos_identificar',label:'Pagos por Identificar',icon:Inbox},
                                                    {id:'vales',         label:'Relación de Vales',icon:FileText},
                                                    {id:'arqueo',        label:'Arqueo de Caja',   icon:Calculator}] },
    { group:'Reportes',    color:'#f59e0b', items:[{id:'rpt_gral_caja',  label:'General de Caja',  icon:PiggyBank},
                                                    {id:'rpt_comp_caja', label:'Comprobante de Caja',icon:FileText},
                                                    {id:'rpt_libro_caja',label:'Libro Diario General',icon:BookOpen}] },
    { group:'Config.',     color:'#64748b', items:[{id:'limpiar_dup',   label:'Limpiar Duplicados',icon:AlertTriangle},
                                                    {id:'reparar_trasl', label:'Reparar Traslados',  icon:CheckCircle}] },
  ];
  const navGroupsCxP = [
    { group:'Terceros',    color:'#f97316', items:[{id:'terceros_rel', label:'Terceros',            icon:Users},
                                                    {id:'cxp_rel',      label:'Cuentas por Pagar',    icon:FileText},
                                                    {id:'hist_pago_rel',label:'Historial de Pago',    icon:Clock},
                                                    {id:'edo_cta_rel',  label:'Estado de Cuenta',     icon:BookOpen}] },
  ];
  const navGroups = submodulo==='caja' ? navGroupsCaja : submodulo==='cxp_relacionadas' ? navGroupsCxP : navGroupsBanco;

  const views = {
    dashboard:<DashboardView/>, cuentas:<CuentasView/>, movimientos:<MovimientosView/>,
    pagos_identificar:<PagosPorIdentificarView/>,
    conciliacion:<ConciliacionView cuentas={cuentas} movBanco={movBanco} tasaActiva={tasaActiva} concils={concils} validarClaveAdmin={validarClaveAdmin}/>, reciprocidad:<ReciprocidadView/>,
    cuentas_caja:<CuentasCajaView/>, caja_op:<CajaOpView/>, vales:<ValesView/>, arqueo:<ArqueoCajaView/>,
    caja_dashboard:<CajaOpView/>,
    rpt_gral_banco:<ReportesGeneralView tipo="banco"/>,
    rpt_gral_caja:<ReportesGeneralView tipo="caja"/>,
    rpt_comp_banco:<ComprobantesBancariosView tipo="banco"/>,
    rpt_comp_caja:<ComprobantesBancariosView tipo="caja"/>,
    rpt_libro_caja:<RepLibroDiarioView tipo="caja"/>,
    rpt_libro:<RepLibroDiarioView/>,
    tasas:<TasasView/>,
    terceros_rel:<TercerosRelacionadosView/>, cxp_rel:<CxPRelacionadasView/>,
    hist_pago_rel:<HistorialPagoRelacionadosView/>, edo_cta_rel:<EstadoCuentaRelacionadosView/>,
    limpiar_dup:<LimpiarDuplicadosCajaView/>,
    reparar_trasl:<RepararTrasladosView/>,
  };

  // ── Portal selector — pantalla de bienvenida ──────────────────────
  if(!submodulo) return (
    <div className="min-h-screen flex flex-col" style={{background:'#f8fafc'}}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{background:'#0f172a',borderBottom:'2px solid #f97316'}}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase">
            <ArrowLeft size={14}/> Volver
          </button>
          <div className="w-px h-5 bg-slate-700"/>
          <span className="text-white font-black text-sm uppercase tracking-wide">Bancos & Tesorería</span>
        </div>
        <div className="text-slate-400 text-xs font-bold">SERVICIOS JIRET G&B, C.A.</div>
      </div>
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-10">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide mb-2">Seleccione un Módulo</h1>
          <p className="text-slate-400 text-sm">¿Con qué desea trabajar hoy?</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-6xl">
          {/* BANCOS */}
          <button onClick={()=>{ setSubmodulo('banco'); setSec('dashboard'); }}
            className="group text-left rounded-2xl border-2 border-slate-200 bg-white p-8 hover:border-blue-400 hover:shadow-xl transition-all duration-200"
            style={{}}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110" style={{background:'#eff6ff'}}>
              <Building2 size={28} style={{color:'#3b82f6'}}/>
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-2">🏦 Bancos</h2>
            <p className="text-sm text-slate-400 mb-5">Gestión de cuentas bancarias, movimientos y conciliación</p>
            <div className="space-y-1.5">
              {['Panel General','Cuentas Bancarias','Movimientos Banco','Conciliación','Reciprocidad de Banco','General de Banco','Comprobante Bancario','Tasas de Cambio'].map(m=>(
                <div key={m} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:'#3b82f6'}}/>
                  {m}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 font-black text-xs uppercase" style={{color:'#3b82f6'}}>
              Entrar al módulo <ArrowRight size={14}/>
            </div>
          </button>
          {/* CAJA */}
          <button onClick={()=>{ setSubmodulo('caja'); setSec('cuentas_caja'); }}
            className="group text-left rounded-2xl border-2 border-slate-200 bg-white p-8 hover:border-emerald-400 hover:shadow-xl transition-all duration-200">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110" style={{background:'#f0fdf4'}}>
              <PiggyBank size={28} style={{color:'#10b981'}}/>
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-2">💰 Caja</h2>
            <p className="text-sm text-slate-400 mb-5">Control de efectivo, cajas físicas y movimientos de caja</p>
            <div className="space-y-1.5">
              {['Panel General (Caja)','Cuentas de Caja','Operaciones Caja','Relación de Vales','Arqueo de Caja','Comprobante de Caja','Tasas de Cambio'].map(m=>(
                <div key={m} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:'#10b981'}}/>
                  {m}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 font-black text-xs uppercase" style={{color:'#10b981'}}>
              Entrar al módulo <ArrowRight size={14}/>
            </div>
          </button>
          {/* CUENTAS POR PAGAR RELACIONADAS */}
          <button onClick={()=>{ setSubmodulo('cxp_relacionadas'); setSec('terceros_rel'); }}
            className="group text-left rounded-2xl border-2 border-slate-200 bg-white p-8 hover:border-orange-400 hover:shadow-xl transition-all duration-200">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110" style={{background:'#fff7ed'}}>
              <Users size={28} style={{color:'#f97316'}}/>
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-2">📋 Cuentas por Pagar Relacionadas</h2>
            <p className="text-sm text-slate-400 mb-5">Alquileres, servicios y otros terceros fuera de Procura</p>
            <div className="space-y-1.5">
              {['Terceros','Cuentas por Pagar','Historial de Pago','Estado de Cuenta'].map(m=>(
                <div key={m} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:'#f97316'}}/>
                  {m}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 font-black text-xs uppercase" style={{color:'#f97316'}}>
              Entrar al módulo <ArrowRight size={14}/>
            </div>
          </button>
          {/* RESUMEN DE OPERACIONES BANCO-CAJA */}
          <button onClick={()=>{ setSubmodulo('resumen_op'); }}
            className="group text-left rounded-2xl border-2 border-slate-200 bg-white p-8 hover:border-violet-400 hover:shadow-xl transition-all duration-200">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110" style={{background:'#f5f3ff'}}>
              <Scale size={28} style={{color:'#8b5cf6'}}/>
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-2">📊 Resumen Banco-Caja</h2>
            <p className="text-sm text-slate-400 mb-5">Consolidado multimoneda con tasa del día editable</p>
            <div className="space-y-1.5">
              {['Bancos por categoría','Cajas y efectivo','Vales pendientes','Tasa del día editable','PDF y Excel'].map(m=>(
                <div key={m} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:'#8b5cf6'}}/>
                  {m}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 font-black text-xs uppercase" style={{color:'#8b5cf6'}}>
              Entrar al módulo <ArrowRight size={14}/>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
  if(submodulo==='resumen_op') return (
    <div className="min-h-screen" style={{background:'#f8fafc'}}>
      <div className="flex items-center px-6 py-4" style={{background:'#0f172a',borderBottom:'2px solid #f97316'}}>
        <button onClick={()=>setSubmodulo('')} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase">
          <ArrowLeft size={14}/> Volver
        </button>
        <div className="w-px h-5 bg-slate-700 mx-3"/>
        <span className="text-white font-black text-sm uppercase tracking-wide">Bancos & Tesorería · Resumen Banco-Caja</span>
      </div>
      <div className="p-6 max-w-6xl mx-auto">
        <ResumenOperacionesView/>
      </div>
    </div>
  );
  const allTabs = navGroups.flatMap(g => g.items.map(i => ({...i, group:g.group, color:g.color})));
  const curNav  = allTabs.find(n => n.id === sec);

  // ── MODO VENTAS: solo registro de ingresos bancarios ─────────────────────
  if (ventasMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Building2 size={16} className="text-white"/></div>
            <div>
              <h2 className="text-sm font-black uppercase text-gray-800">Registro de Cobro / Ingreso Bancario</h2>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Módulo Bancos — Vista Ventas</p>
            </div>
          </div>
        </div>
        <div className="p-6 max-w-3xl mx-auto">
          <MovimientosView ventasOnlyIngreso={true}/>
        </div>
      </div>
    );
  }
  const curGroup = navGroups.find(g => g.items.find(i => i.id === sec));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sub-nav horizontal estilo ERP ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center overflow-x-auto scrollbar-hide px-4 gap-0.5">
          {/* Botón cambiar módulo */}
          <button onClick={()=>setSubmodulo(null)}
            className="flex items-center gap-1.5 mr-3 px-3 py-2 rounded-lg text-[9px] font-black uppercase text-slate-400 hover:bg-slate-100 transition-all whitespace-nowrap border border-slate-200">
            <ArrowLeft size={11}/>
            {submodulo==='banco'?'🏦 Bancos':'💰 Caja'}
          </button>
          <div className="w-px h-6 bg-slate-200 mr-2 flex-shrink-0"/>
          {allTabs.map(t => {
            const Icon = t.icon;
            const active = sec === t.id;
            return (
              <button key={t.id} onClick={() => setSec(t.id)}
                className={`flex items-center gap-1.5 py-3.5 px-2 text-[9px] font-black uppercase tracking-wide whitespace-nowrap transition-all border-b-4 flex-shrink-0 ${
                  active ? 'border-orange-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
                }`}>
                {Icon && <Icon size={13}/>} {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {/* ── Contenido ── */}
      <div>
        {views[sec] || <DashboardView/>}
      </div>
      <DebugPanel/>
    </div>
  );
}


// ============================================================================
// MÓDULO CONTABILIDAD — PLAN DE CUENTAS + EXPORTAR/IMPORTAR
// ============================================================================
function ContabilidadApp({ fbUser, onBack }) {
  const [sec, setSec] = useState('dashboard');
  const [cuentas, setCuentas]   = useState([]);
  const [movBanco, setMovBanco] = useState([]);
  const [movCaja,  setMovCaja]  = useState([]);
  const [tasas,    setTasas]    = useState([]);

  useEffect(() => {
    if (!fbUser) return;
    const subs = [
      onSnapshot(getColRef('planDeCuentas'), s => setCuentas(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(query(getColRef('banco_movimientos'), orderBy('fecha','desc')), s => setMovBanco(s.docs.map(d=>({_docId:d.id,...d.data()})))),
      onSnapshot(query(getColRef('caja_movimientos'),  orderBy('fecha','desc')), s => setMovCaja(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('banco_tasas'), orderBy('fecha','desc')), s => setTasas(s.docs.map(d=>d.data()))),
    ];
    return () => subs.forEach(u=>u());
  }, [fbUser]);

  const tasaActiva = tasas.find(t=>t.modulo==='Todos')?.tasaRef || tasas[0]?.tasaRef || 39.50;

  const grupos = [
    {codigo:'1',nombre:'ACTIVOS',color:'green'},{codigo:'2',nombre:'PASIVOS',color:'red'},
    {codigo:'3',nombre:'PATRIMONIO',color:'purple'},{codigo:'4',nombre:'INGRESOS',color:'blue'},
    {codigo:'5',nombre:'COSTOS',color:'gold'},{codigo:'6',nombre:'GASTOS',color:'gray'},
  ];

  // ── Exportar PUC ──────────────────────────────────────────────────
  const exportarPUC = (formato) => {
    const sorted = [...cuentas].sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo)));
    if(formato==='xls') {
      const grupoNames = {'1':'ACTIVOS','2':'PASIVOS','3':'PATRIMONIO','4':'INGRESOS','5':'COSTOS','6':'GASTOS'};
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:11px}table{border-collapse:collapse;width:100%}th{background:#1e3a5f;color:#fff;font-weight:bold;border:1px solid #94a3b8;padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px}td{border:1px solid #e2e8f0;padding:4px 10px}tr:nth-child(even) td{background:#f8fafc}</style></head><body>
        <p style="font-size:14px;font-weight:bold;margin-bottom:4px">Plan de Cuentas — Servicios Jiret G&amp;B, C.A.</p>
        <p style="font-size:10px;color:#666;margin-bottom:16px">RIF: J-412309374 · ${sorted.length} cuentas · ${bancoDd(getTodayDate())}</p>
        <table><thead><tr><th>Código</th><th>Cuenta de movimiento</th><th>Grupo</th><th>Sub-grupo</th><th>Cuenta</th><th>Subcuenta</th><th>Tipo</th><th>Naturaleza</th></tr></thead><tbody>`;
      sorted.forEach(c=>{
        const cod=String(c.codigo); const partes=cod.split('.');
        const grKey=partes[0]||cod.charAt(0); const grNom=grupoNames[grKey]||c.grupo||grKey;
        const subgr=c.subGrupo||c.subgrupo||(partes.length>=2?partes.slice(0,2).join('.'):cod);
        const cta=c.cuenta||(partes.length>=4?partes.slice(0,4).join('.'):cod);
        const subc=c.subcuenta||(partes.length>4?cod:'');
        html+=`<tr><td style="font-family:Courier New;font-weight:bold;color:#1e40af">${cod}</td><td style="font-weight:500">${c.nombre}</td><td>${grNom}</td><td>${subgr}</td><td>${cta}</td><td>${subc}</td><td>${c.tipo||''}</td><td>${c.naturaleza||''}</td></tr>`;
      });
      html+=`</tbody></table></body></html>`;
      const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`plan_cuentas_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(url);return;
    }
    const HEADERS=['Código','Cuenta de movimiento','Grupo','Sub-grupo','Cuenta','Subcuenta'];
    const rows=sorted.map(c=>{
      const cod=String(c.codigo);const partes=cod.split('.');const grKey=partes[0]||cod.charAt(0);
      const gN={'1':'ACTIVOS','2':'PASIVOS','3':'PATRIMONIO','4':'INGRESOS','5':'COSTOS','6':'GASTOS'};
      return[cod,c.nombre,gN[grKey]||c.grupo||grKey,c.subGrupo||c.subgrupo||(partes.length>=2?partes.slice(0,2).join('.'):cod),c.cuenta||(partes.length>=4?partes.slice(0,4).join('.'):cod),c.subcuenta||(partes.length>4?cod:'')];
    });
    const content=[HEADERS,...rows].map(row=>row.join('\t')).join('\r\n');
    const blob=new Blob(['\uFEFF'+content],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`plan_cuentas_${getTodayDate()}.txt`;a.click();URL.revokeObjectURL(url);
  };

  // ── Importar PUC ──────────────────────────────────────────────────
  const importarPUC = async (event) => {
    const file=event.target.files[0];if(!file)return;
    const text=await file.text();
    const lines=text.split(/\r?\n/).filter(l=>l.trim());
    if(lines.length<1){alert('Archivo vacío.');event.target.value='';return;}
    const firstCell=lines[0].split('\t')[0].trim();
    const hasHeader=!/^\d/.test(firstCell);
    const dataLines=hasHeader?lines.slice(1):lines;
    const existentes=new Set(cuentas.map(c=>String(c.codigo)));
    const batch=writeBatch(_bancoDB);let importados=0,omitidos=0;
    const grupoMap={'ACTIVOS':'1','ACTIVO':'1','PASIVOS':'2','PASIVO':'2','PATRIMONIO':'3','INGRESOS':'4','INGRESO':'4','COSTOS':'5','COSTO':'5','GASTOS':'6','GASTO':'6','GASTOS ISLR':'6'};
    const gNombre={'1':'ACTIVOS','2':'PASIVOS','3':'PATRIMONIO','4':'INGRESOS','5':'COSTOS','6':'GASTOS'};
    for(const line of dataLines){
      const parts=line.split('\t').map(v=>v.trim());
      if(parts.length<2)continue;
      const codigo=parts[0];const nombre=parts[1];const grupoTxt=parts[2]||'';const subgrupo=parts[3]||'';const cuenta=parts[4]||'';const subcuenta=parts[5]||'';
      if(!codigo||!nombre)continue;
      if(existentes.has(codigo)){omitidos++;continue;}
      const grupoNum=grupoMap[grupoTxt.toUpperCase().trim()]||codigo.charAt(0);
      const naturaleza=['1','5','6'].includes(grupoNum)?'Deudora':'Acreedora';
      const partesCod=codigo.split('.');const tipo=partesCod.length<=2?'Mayor':partesCod.length<=4?'Auxiliar':'Analítica';
      const id=bancoGid();batch.set(getDocRef('planDeCuentas',id),{id,codigo,nombre:nombre.toUpperCase(),grupo:(gNombre[grupoNum]||grupoTxt||'').toUpperCase(),subGrupo:(subgrupo||'').toUpperCase(),cuenta,subcuenta,tipo,naturaleza,descripcion:'',timestamp:Date.now()});
      importados++;
    }
    if(importados===0){alert(`No se importaron cuentas.${omitidos>0?` (${omitidos} ya existían)`:' Verifique el formato.'}`);event.target.value='';return;}
    await batch.commit();
    alert(`✅ ${importados} cuenta(s) importada(s).${omitidos>0?` (${omitidos} omitidas)`:''}`);
    event.target.value='';
  };

  // ── DASHBOARD ──────────────────────────────────────────────────────
  const DashboardView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {grupos.map(g=>{const cnt=cuentas.filter(c=>String(c.codigo).startsWith(g.codigo)).length;return<BKPI key={g.codigo} label={`${g.codigo} — ${g.nombre}`} value={cnt} accent={g.color} Icon={BookOpen} sub={`${cnt} cuentas`}/>;})}</div>
      <BCard title="Estructura del PUC" subtitle={`${cuentas.length} cuentas activas`}>
        {cuentas.length===0?<BEmptyState icon={BookOpen} title="PUC vacío" desc="Registre o importe el plan de cuentas"/>:
          <div className="space-y-1">{grupos.map(g=>{
            const gc=cuentas.filter(c=>String(c.codigo).startsWith(g.codigo)).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo)));
            if(!gc.length)return null;
            return(<div key={g.codigo}>
              <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-lg mt-3 mb-1"><span className="font-mono font-black text-xs text-slate-500">{g.codigo}</span><span className="font-black text-sm text-slate-900 uppercase tracking-wide">{g.nombre}</span><span className="ml-auto text-[10px] text-slate-400">{gc.length} cuentas</span></div>
              {gc.map(c=><div key={c.id} className="flex items-center gap-3 py-2 px-4 hover:bg-slate-50 rounded-lg border-l-2 border-slate-100" style={{marginLeft:`${(String(c.codigo).split('.').length-1)*12}px`}}>
                <span className="font-mono font-black text-xs text-slate-400 w-20 flex-shrink-0">{c.codigo}</span>
                <span className="text-xs font-semibold text-slate-700 flex-1">{c.nombre}</span>
                <BBadge v={c.naturaleza==='Deudora'?'blue':'red'}>{c.naturaleza}</BBadge>
              </div>)}
            </div>);
          })}</div>}
      </BCard>
    </div>
  );

  // ── PLAN DE CUENTAS con EDITAR ──────────────────────────────────────
  const PlanCuentasView = () => {
    const [modal,setModal]=useState(false);const [busy,setBusy]=useState(false);
    const [search,setSearch]=useState('');const [editCuenta,setEditC]=useState(null);
    const initF=()=>({codigo:'',nombre:'',grupo:'1',tipo:'Auxiliar',naturaleza:'Deudora',descripcion:'',subgrupo:'',cuenta:'',subcuenta:''});
    const [form,setForm]=useState(initF());
    const filtered=cuentas.filter(c=>c.nombre?.toUpperCase().includes(search.toUpperCase())||String(c.codigo).includes(search));

    const gNombrePDC={'1':'ACTIVOS','2':'PASIVOS','3':'PATRIMONIO','4':'INGRESOS','5':'COSTOS','6':'GASTOS'};
    const gCodigoPDC={'ACTIVOS':'1','PASIVOS':'2','PATRIMONIO':'3','INGRESOS':'4','COSTOS':'5','GASTOS':'6'};
    const openEdit=(c)=>{setEditC(c);setForm({codigo:c.codigo,nombre:c.nombre,grupo:gCodigoPDC[(c.grupo||'').toUpperCase()]||c.grupo||'1',tipo:c.tipo||'Auxiliar',naturaleza:c.naturaleza||'Deudora',descripcion:c.descripcion||'',subgrupo:c.subGrupo||c.subgrupo||'',cuenta:c.cuenta||'',subcuenta:c.subcuenta||''});setModal(true);};
    const openNew=()=>{setEditC(null);setForm(initF());setModal(true);};

    const save=async()=>{
      if(!form.codigo||!form.nombre)return alert('Código y nombre requeridos');
      if(!editCuenta&&cuentas.find(c=>String(c.codigo)===String(form.codigo)))return alert('El código ya existe');
      setBusy(true);
      try{
        const payload={codigo:form.codigo,nombre:form.nombre,grupo:gNombrePDC[form.grupo]||form.grupo,subGrupo:form.subgrupo,cuenta:form.cuenta,subcuenta:form.subcuenta,tipo:form.tipo,naturaleza:form.naturaleza,descripcion:form.descripcion};
        if(editCuenta){await updateDoc(getDocRef('planDeCuentas',editCuenta.id),payload);}
        else{const id=bancoGid();await setDoc(getDocRef('planDeCuentas',id),{...payload,id,timestamp:Date.now()});}
        setModal(false);setEditC(null);setForm(initF());
      }finally{setBusy(false);}
    };

    return(
      <div>
        <BCard title="Plan de Cuentas (PUC)" subtitle={`${cuentas.length} cuentas · Formato: Código | Cuenta de movimiento | Grupo | Sub-grupo | Cuenta | Subcuenta`}
          action={<div className="flex gap-2 flex-wrap">
            <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar código o cuenta..." className="border-2 border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-blue-500 w-48"/></div>
            <div className="relative group"><button className="flex items-center gap-1.5 px-3 py-2 border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:border-blue-400 hover:text-blue-600 transition-colors"><Download size={12}/> Exportar ▾</button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden min-w-[160px] hidden group-hover:block">
                <button onClick={()=>exportarPUC('xls')} className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FileSpreadsheet size={12} className="text-green-600"/> Excel (.xls) — Columnas</button>
                <button onClick={()=>exportarPUC('txt')} className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FileText size={12} className="text-blue-500"/> TXT Tabulado (importable)</button>
              </div>
            </div>
            <label className="flex items-center gap-1.5 px-3 py-2 border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:border-emerald-400 hover:text-emerald-600 transition-colors cursor-pointer"><Upload size={12}/> Importar<input type="file" accept=".csv,.txt,.xls,.xlsx" className="sr-only" onChange={importarPUC}/></label>
            <BBg onClick={openNew} sm><Plus size={12}/> Nueva</BBg>
          </div>}>

          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
            <FileText size={14} className="text-blue-500 flex-shrink-0 mt-0.5"/>
            <div><p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-0.5">Formato de Importación</p><p className="text-[10px] text-blue-600 font-mono">Código ⇥ Cuenta de movimiento ⇥ Grupo ⇥ Sub-grupo ⇥ Cuenta ⇥ Subcuenta</p><p className="text-[9px] text-blue-400 mt-0.5">Compatible con TXT tabulado. Primera fila puede ser encabezado.</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><BTh>Código</BTh><BTh>Cuenta de movimiento</BTh><BTh>Grupo</BTh><BTh>Sub-grupo</BTh><BTh>Cuenta</BTh><BTh>Subcuenta</BTh><BTh>Tipo</BTh><BTh>Naturaleza</BTh><BTh></BTh></tr></thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={9}><BEmptyState icon={BookOpen} title="Sin cuentas" desc="Registre o importe el PUC"/></td></tr>}
                {[...filtered].sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))).map(c=>{
                  const cod=String(c.codigo);const partes=cod.split('.');const grKey=partes[0]||cod.charAt(0);
                  const gN={'1':'ACTIVOS','2':'PASIVOS','3':'PATRIMONIO','4':'INGRESOS','5':'COSTOS','6':'GASTOS'};
                  const subgr=c.subGrupo||c.subgrupo||(partes.length>=2?partes.slice(0,2).join('.'):cod);
                  const ctaCol=c.cuenta||(partes.length>=4?partes.slice(0,4).join('.'):cod);
                  const subc=c.subcuenta||(partes.length>4?cod:'—');
                  return<tr key={c.id} className="hover:bg-slate-50">
                    <BTd mono className="font-black text-blue-600 text-sm">{c.codigo}</BTd>
                    <BTd className="font-semibold max-w-[220px]">{c.nombre}</BTd>
                    <BTd className="text-[10px] font-semibold text-slate-500 max-w-[100px] truncate">{gN[grKey]||c.grupo||grKey}</BTd>
                    <BTd mono className="text-slate-500 text-[11px] max-w-[120px] truncate">{subgr}</BTd>
                    <BTd mono className="text-slate-500 text-[11px] max-w-[100px] truncate">{ctaCol}</BTd>
                    <BTd mono className="text-slate-400 text-[11px] max-w-[100px] truncate">{subc}</BTd>
                    <BTd><BBadge v={c.tipo==='Mayor'?'gold':'gray'}>{c.tipo}</BBadge></BTd>
                    <BTd><BBadge v={c.naturaleza==='Deudora'?'blue':'red'}>{c.naturaleza}</BBadge></BTd>
                    <BTd><div className="flex gap-1">
                      <button onClick={()=>openEdit(c)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Editar"><Settings size={12}/></button>
                      <button onClick={()=>deleteDoc(getDocRef('planDeCuentas',c.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={12}/></button>
                    </div></BTd>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </BCard>

        <BModal open={modal} onClose={()=>{setModal(false);setEditC(null);}} title={editCuenta?`Editar Cuenta — ${editCuenta.codigo}`:'Registrar Cuenta Contable'} wide
          footer={<><BBo onClick={()=>{setModal(false);setEditC(null);}}>Cancelar</BBo><BBg onClick={save} disabled={busy}>{busy?'Guardando...':(editCuenta?'Guardar Cambios':'Guardar Cuenta')}</BBg></>}>
          <div className="grid grid-cols-2 gap-4">
            <BFG label="Código de Cuenta"><input className={inp} value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})} placeholder="1.1.01.01.001" readOnly={!!editCuenta} style={editCuenta?{background:'#f8fafc'}:{}}/></BFG>
            <BFG label="Cuenta de movimiento"><input className={inp} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value.toUpperCase()})} placeholder="CAJA PRINCIPAL"/></BFG>
            <BFG label="Grupo Principal"><select className={sel} value={form.grupo} onChange={e=>setForm({...form,grupo:e.target.value})}>{grupos.map(g=><option key={g.codigo} value={g.codigo}>{g.codigo} — {g.nombre}</option>)}</select></BFG>
            <BFG label="Tipo"><select className={sel} value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}><option>Mayor</option><option>Auxiliar</option><option>Analítica</option></select></BFG>
            <BFG label="Naturaleza"><select className={sel} value={form.naturaleza} onChange={e=>setForm({...form,naturaleza:e.target.value})}><option>Deudora</option><option>Acreedora</option></select></BFG>
            <BFG label="Sub-grupo"><input className={inp} value={form.subgrupo} onChange={e=>setForm({...form,subgrupo:e.target.value})} placeholder="Ej: ACTIVO CIRCULANTE"/></BFG>
            <BFG label="Cuenta"><input className={inp} value={form.cuenta} onChange={e=>setForm({...form,cuenta:e.target.value})} placeholder="Ej: DISPONIBLE"/></BFG>
            <BFG label="Subcuenta"><input className={inp} value={form.subcuenta} onChange={e=>setForm({...form,subcuenta:e.target.value})} placeholder="Ej: BANCOS NACIONALES"/></BFG>
            <BFG label="Descripción / Uso" full><input className={inp} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} placeholder="Descripción y uso de la cuenta..."/></BFG>
          </div>
        </BModal>
      </div>
    );
  };

  // ── COMPROBANTE DIARIO ──────────────────────────────────────────────
  const ComprobanteDiarioView = () => {
    const [modulo, setModulo]   = useState('Banco');
    const [desde,  setDesde]    = useState(bancoMesActual()+'-01');
    const [hasta,  setHasta]    = useState(getTodayDate());
    const [nroComp,setNroComp]  = useState('');

    // Generar filas del comprobante desde movimientos bancarios
    const generarFilas = () => {
      const movsFiltrados = (modulo==='Banco'?movBanco:movCaja)
        .filter(m=>m.fecha>=desde && m.fecha<=hasta && m.asientoDebito)
        .sort((a,b)=>a.fecha.localeCompare(b.fecha));

      const filas = [];
      const mes = desde.substring(0,7).replace('-','.');
      let comp = 1;
      let saldoBsAcum = 0;
      let saldoUSDacum = 0;

      movsFiltrados.forEach(m => {
        const esBs = m.moneda==='BS';
        const nroDoc = m.referencia || m.facturaNumero || `${m.tipo.substring(0,3).toUpperCase()}-${String(comp).padStart(4,'0')}`;
        const nComp = nroComp || `CB-${String(comp).padStart(4,'0')}`;

        // Línea DÉBITO
        const debBs  = m.tipo==='Ingreso' ? Number(m.montoBs||0)  : 0;
        const habBs  = m.tipo==='Ingreso' ? 0 : Number(m.montoBs||0);
        const debUSD = m.tipo==='Ingreso' ? Number(m.montoUSD||0) : 0;
        const habUSD = m.tipo==='Ingreso' ? 0 : Number(m.montoUSD||0);
        saldoBsAcum  += debBs  - habBs;
        saldoUSDacum += debUSD - habUSD;

        filas.push({
          comprobante: nComp,
          mes,
          fecha: m.fecha,
          codigo: m.ctaContraId ? cuentas.find(c=>c.id===m.ctaContraId)?.codigo||'—' : '—',
          cuenta: m.asientoDebito,
          tipo: 'D',
          nroDoc,
          concepto: m.concepto,
          tasa: m.tasa||tasaActiva,
          debeBs:  debBs,
          haberBs: habBs,
          saldoBs: saldoBsAcum,
          debeUSD: debUSD,
          haberUSD:habUSD,
          saldoUSD:saldoUSDacum,
        });

        // Línea CRÉDITO
        const debBs2  = m.tipo==='Ingreso' ? 0 : Number(m.montoBs||0);
        const habBs2  = m.tipo==='Ingreso' ? Number(m.montoBs||0) : 0;
        const debUSD2 = m.tipo==='Ingreso' ? 0 : Number(m.montoUSD||0);
        const habUSD2 = m.tipo==='Ingreso' ? Number(m.montoUSD||0) : 0;
        saldoBsAcum  += debBs2 - habBs2;
        saldoUSDacum += debUSD2- habUSD2;

        filas.push({
          comprobante: nComp,
          mes,
          fecha: m.fecha,
          codigo: m.ctaContraId ? cuentas.find(c=>c.id===m.ctaContraId)?.codigo||'—' : '—',
          cuenta: m.asientoCredito,
          tipo: 'H',
          nroDoc,
          concepto: m.concepto,
          tasa: m.tasa||tasaActiva,
          debeBs:  debBs2,
          haberBs: habBs2,
          saldoBs: saldoBsAcum,
          debeUSD: debUSD2,
          haberUSD:habUSD2,
          saldoUSD:saldoUSDacum,
        });
        comp++;
      });
      return filas;
    };

    const filas = generarFilas();
    const totDebBs  = filas.reduce((a,f)=>a+f.debeBs,0);
    const totHabBs  = filas.reduce((a,f)=>a+f.haberBs,0);
    const totDebUSD = filas.reduce((a,f)=>a+f.debeUSD,0);
    const totHabUSD = filas.reduce((a,f)=>a+f.haberUSD,0);

    const exportarComprobante = () => {
      const HDRS=['Comprobante','Mes','Fecha','Código','Cuenta de movimiento','Tipo','Nro Documento','CONCEPTO','Tasa','Debe Bs','Haber Bs','Saldo Bs','Debe USD','Haber USD','Saldo USD'];
      const grupoNames={'1':'ACTIVOS','2':'PASIVOS','3':'PATRIMONIO','4':'INGRESOS','5':'COSTOS','6':'GASTOS'};
      let html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><style>body{font-family:Arial;font-size:10px}table{border-collapse:collapse;width:100%}th{background:#1e3a5f;color:#fff;border:1px solid #94a3b8;padding:5px 8px;text-align:left;font-size:9px;text-transform:uppercase}td{border:1px solid #e2e8f0;padding:3px 8px}tr:nth-child(even) td{background:#f8fafc}.debe{color:#065f46;font-weight:bold}.haber{color:#7f1d1d;font-weight:bold}.saldo{color:#1e3a5f}.tot{background:#1e293b;color:#fff;font-weight:bold}</style></head><body>
        <p style="font-size:13px;font-weight:bold">Comprobante Diario — ${modulo} · Servicios Jiret G&amp;B, C.A.</p>
        <p style="font-size:10px;color:#666">Período: ${bancoDd(desde)} al ${bancoDd(hasta)} · Generado: ${bancoDd(getTodayDate())}</p>
        <table><thead><tr>${HDRS.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>`;
      filas.forEach(f=>{
        html+=`<tr><td>${f.comprobante}</td><td>${f.mes}</td><td>${bancoDd(f.fecha)}</td><td style="font-family:Courier New;color:#1e40af;font-weight:bold">${f.codigo}</td><td>${f.cuenta}</td>
          <td style="text-align:center;font-weight:bold;color:${f.tipo==='D'?'#065f46':'#7f1d1d'}">${f.tipo}</td>
          <td>${f.nroDoc}</td><td>${f.concepto}</td><td style="text-align:right">${f.tasa}</td>
          <td class="debe" style="text-align:right">${f.debeBs>0?bancoFmt(f.debeBs):''}</td>
          <td class="haber" style="text-align:right">${f.haberBs>0?bancoFmt(f.haberBs):''}</td>
          <td class="saldo" style="text-align:right">{'$'+bancoFmt(f.saldoBs)}</td>
          <td class="debe" style="text-align:right">${f.debeUSD>0?bancoFmt(f.debeUSD):''}</td>
          <td class="haber" style="text-align:right">${f.haberUSD>0?bancoFmt(f.haberUSD):''}</td>
          <td class="saldo" style="text-align:right">{'$'+bancoFmt(f.saldoUSD)}</td></tr>`;
      });
      html+=`<tr class="tot"><td colspan="9" style="text-align:right">TOTALES</td>
        <td style="text-align:right">{'$'+bancoFmt(totDebBs)}</td><td style="text-align:right">{'$'+bancoFmt(totHabBs)}</td><td style="text-align:right">{'$'+bancoFmt(filas[filas.length-1]?.saldoBs||0)}</td>
        <td style="text-align:right">{'$'+bancoFmt(totDebUSD)}</td><td style="text-align:right">{'$'+bancoFmt(totHabUSD)}</td><td style="text-align:right">{'$'+bancoFmt(filas[filas.length-1]?.saldoUSD||0)}</td></tr>
      </tbody></table></body></html>`;
      const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`comprobante_${modulo.toLowerCase()}_${desde.substring(0,7)}.xls`;a.click();URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-5">
        <BCard title="Parámetros del Comprobante">
          <div className="grid grid-cols-4 gap-4">
            <BFG label="Módulo">
              <div className="flex gap-1">{['Banco','Caja'].map(m=>(
                <button key={m} onClick={()=>setModulo(m)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${modulo===m?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>{m}</button>
              ))}</div>
            </BFG>
            <BFG label="Desde"><input type="date" className={inp} value={desde} onChange={e=>setDesde(e.target.value)}/></BFG>
            <BFG label="Hasta"><input type="date" className={inp} value={hasta} onChange={e=>setHasta(e.target.value)}/></BFG>
            <BFG label="N° Comprobante (opc.)"><input className={inp} value={nroComp} onChange={e=>setNroComp(e.target.value)} placeholder="CB-0001"/></BFG>
          </div>
        </BCard>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BKPI label="Asientos Generados" value={filas.length/2|0} accent="blue" Icon={FileText} sub="operaciones"/>
          <BKPI label="Debe Bs." value={`Bs. ${bancoFmt(totDebBs)}`} accent="green" Icon={ArrowUpCircle}/>
          <BKPI label="Haber Bs." value={`Bs. ${bancoFmt(totHabBs)}`} accent="red" Icon={ArrowDownCircle}/>
          <BKPI label="Saldo Final Bs." value={`Bs. ${bancoFmt(totDebBs-totHabBs)}`} accent={totDebBs>=totHabBs?'green':'red'} Icon={Scale}/>
        </div>

        <BCard title={`Comprobante Diario — ${modulo} — ${bancoDd(desde)} al ${bancoDd(hasta)}`} subtitle={`${filas.length} líneas contables`}
          action={<button onClick={exportarComprobante} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><Download size={12}/> Exportar Excel</button>}>
          {filas.length===0?<BEmptyState icon={FileText} title="Sin movimientos con asiento contable" desc="Registre movimientos con cuenta contrapartida del PUC"/>:
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:'1200px'}}>
              <thead>
                <tr>
                  {['Comprobante','Mes','Fecha','Código','Cuenta de movimiento','Tipo','Nro Documento','CONCEPTO','Tasa','Debe Bs','Haber Bs','Saldo Bs','Debe USD','Haber USD','Saldo USD'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white border-b-2 border-slate-700 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f,i)=>(
                  <tr key={i} className={`${i%4<2?'bg-white':'bg-slate-50'} hover:bg-blue-50 border-b border-slate-100`}>
                    <td className="px-3 py-2 font-mono font-black text-blue-600 text-[10px]">{f.comprobante}</td>
                    <td className="px-3 py-2 text-slate-500">{f.mes}</td>
                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{bancoDd(f.fecha)}</td>
                    <td className="px-3 py-2 font-mono font-black text-blue-700 text-[10px]">{f.codigo}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800 max-w-[200px] truncate">{f.cuenta}</td>
                    <td className={`px-3 py-2 font-black text-center text-sm ${f.tipo==='D'?'text-emerald-700':'text-red-600'}`}>{f.tipo}</td>
                    <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">{f.nroDoc}</td>
                    <td className="px-3 py-2 max-w-[160px] truncate">{f.concepto}</td>
                    <td className="px-3 py-2 font-mono text-right text-slate-500">{f.tasa}</td>
                    <td className="px-3 py-2 font-mono font-black text-right text-emerald-700">{f.debeBs>0?bancoFmt(f.debeBs):''}</td>
                    <td className="px-3 py-2 font-mono font-black text-right text-red-600">{f.haberBs>0?bancoFmt(f.haberBs):''}</td>
                    <td className="px-3 py-2 font-mono font-black text-right text-blue-800">{bancoFmt(f.saldoBs)}</td>
                    <td className="px-3 py-2 font-mono font-black text-right text-emerald-600">{f.debeUSD>0?bancoFmt(f.debeUSD):''}</td>
                    <td className="px-3 py-2 font-mono font-black text-right text-red-500">{f.haberUSD>0?bancoFmt(f.haberUSD):''}</td>
                    <td className="px-3 py-2 font-mono font-black text-right text-blue-700">{bancoFmt(f.saldoUSD)}</td>
                  </tr>
                ))}
                {/* Totales */}
                <tr className="font-black" style={{background:'#0f172a'}}>
                  <td colSpan={9} className="px-3 py-3 text-right text-[10px] uppercase tracking-widest text-slate-400">TOTALES DEL PERÍODO</td>
                  <td className="px-3 py-3 font-mono text-right text-emerald-400">{bancoFmt(totDebBs)}</td>
                  <td className="px-3 py-3 font-mono text-right text-red-400">{bancoFmt(totHabBs)}</td>
                  <td className="px-3 py-3 font-mono text-right text-blue-300">{bancoFmt(filas[filas.length-1]?.saldoBs||0)}</td>
                  <td className="px-3 py-3 font-mono text-right text-emerald-400">{bancoFmt(totDebUSD)}</td>
                  <td className="px-3 py-3 font-mono text-right text-red-400">{bancoFmt(totHabUSD)}</td>
                  <td className="px-3 py-3 font-mono text-right text-blue-300">{bancoFmt(filas[filas.length-1]?.saldoUSD||0)}</td>
                </tr>
              </tbody>
            </table>
          </div>}
        </BCard>
      </div>
    );
  };

  const navGroups=[
    {group:'Analítica',color:'#3b82f6',items:[{id:'dashboard',label:'Resumen PUC',icon:LayoutDashboard}]},
    {group:'Contabilidad',color:'#3b82f6',items:[{id:'plan',label:'Plan de Cuentas',icon:BookOpen}]},
    {group:'Comprobantes',color:'#10b981',items:[{id:'comprobante',label:'Comprobante Diario',icon:FileSpreadsheet}]},
  ];
  const views={dashboard:<DashboardView/>,plan:<PlanCuentasView/>,comprobante:<ComprobanteDiarioView/>};
  const curNav=navGroups.flatMap(g=>g.items).find(n=>n.id===sec);
  return (
    <BSidebarLayout brand="Supply G&B" brandSub="Plan de Cuentas" navGroups={navGroups} activeId={sec} onNav={setSec} onBack={onBack} accentColor={BLUE}
      headerContent={<>
        <div><h1 className="font-black text-slate-800 text-sm uppercase tracking-wide">{curNav?.label}</h1><p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Contabilidad <ChevronRight size={8} className="inline"/> {navGroups.find(g=>g.items.find(i=>i.id===sec))?.group}</p></div>
        {sec==='comprobante'?<button onClick={()=>{}} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><Download size={12}/> Exportar</button>:<BBg onClick={()=>setSec('plan')} sm><Plus size={12}/> Nueva Cuenta</BBg>}
      </>}>
      {views[sec]}
    </BSidebarLayout>
  );
}
function AsientosApp({ fbUser, onBack }) {
  const [sec, setSec] = useState('dashboard');
  const [asientos, setAsientos]   = useState([]);
  const [cuentas, setCuentas]     = useState([]);

  useEffect(() => {
    if (!fbUser) return;
    const subs = [
      onSnapshot(query(getColRef('cont_asientos'), orderBy('fecha','desc')), s => setAsientos(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('planDeCuentas'), s => setCuentas(s.docs.map(d=>({id:d.id,...d.data()})))),
    ];
    return () => subs.forEach(u=>u());
  }, [fbUser]);

  // ── Helpers para compatibilidad con asientos viejos (campo debito/credito) y nuevos (debeBs/haberBs) ──
  const getDebeBs  = l => Number(l.debeBs  ?? l.debito  ?? 0);
  const getHaberBs = l => Number(l.haberBs ?? l.credito ?? 0);
  const getDebeUSD = l => Number(l.debeUSD  ?? 0);
  const getHaberUSD= l => Number(l.haberUSD ?? 0);

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const DashboardView = () => {
    const mesCnt = asientos.filter(a=>a.fecha?.startsWith(bancoMesActual())).length;
    const bancarios = asientos.filter(a=>a.modulo==='Bancos').length;
    const manuales  = asientos.filter(a=>a.modulo!=='Bancos').length;
    const totDebBs  = asientos.reduce((s,a)=>(a.lineas||[]).reduce((l,li)=>l+getDebeBs(li),s),0);
    const totHabBs  = asientos.reduce((s,a)=>(a.lineas||[]).reduce((l,li)=>l+getHaberBs(li),s),0);
    const balOk     = Math.abs(totDebBs-totHabBs)<0.01;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BKPI label="Total Asientos" value={asientos.length} accent="blue" Icon={FileText}/>
          <BKPI label="Del Mes" value={mesCnt} accent="green" Icon={CalendarDays}/>
          <BKPI label="Auto-bancarios" value={bancarios} accent="gold" Icon={Building2} sub="Generados de Bancos"/>
          <BKPI label="Balance Gral." value={balOk?'✓ Cuadrado':'✗ Revisar'} accent={balOk?'green':'red'} Icon={Scale}/>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <BCard title="Últimos Asientos">
            {asientos.length===0?<BEmptyState icon={FileText} title="Sin asientos" desc="Los asientos de banco se generan automáticamente"/>:
              <table className="w-full"><thead><tr><BTh>Comprobante</BTh><BTh>Fecha</BTh><BTh>Concepto</BTh><BTh>Módulo</BTh><BTh right>Debe Bs</BTh></tr></thead>
                <tbody>{asientos.slice(0,8).map(a=>{
                  const dBs=(a.lineas||[]).reduce((s,l)=>s+getDebeBs(l),0);
                  return <tr key={a.id} className="hover:bg-slate-50">
                    <BTd mono className="font-black text-blue-600">{a.comprobante||a.numero}</BTd>
                    <BTd>{bancoDd(a.fecha)}</BTd>
                    <BTd className="max-w-[160px] truncate">{a.descripcion}</BTd>
                    <BTd><BBadge v={a.modulo==='Bancos'?'blue':'gray'}>{a.modulo||'Manual'}</BBadge></BTd>
                    <BTd right mono className="text-emerald-700 font-black">Bs.{bancoFmt(dBs)}</BTd>
                  </tr>;
                })}</tbody>
              </table>}
          </BCard>
          <BCard title="Posición Contable">
            <div className="space-y-3">
              {[{l:'Débitos Bs.',v:`Bs. ${bancoFmt(totDebBs)}`,c:'text-emerald-600'},{l:'Haberes Bs.',v:`Bs. ${bancoFmt(totHabBs)}`,c:'text-red-600'},{l:'Débitos USD',v:`$${bancoFmt(asientos.reduce((s,a)=>(a.lineas||[]).reduce((l,li)=>l+getDebeUSD(li),s),0))}`,c:'text-emerald-700'},{l:'Haberes USD',v:`$${bancoFmt(asientos.reduce((s,a)=>(a.lineas||[]).reduce((l,li)=>l+getHaberUSD(li),s),0))}`,c:'text-red-700'}].map(({l,v,c})=>(
                <div key={l} className="flex justify-between py-2 border-b border-slate-50"><span className="text-xs text-slate-500 font-medium">{l}</span><span className={`font-mono font-black text-sm ${c}`}>{v}</span></div>
              ))}
              <div className={`flex justify-between py-3 px-4 rounded-xl ${balOk?'bg-emerald-50':'bg-red-50'}`}><span className="font-black text-xs uppercase tracking-wide">Diferencia</span><span className={`font-mono font-black ${balOk?'text-emerald-600':'text-red-600'}`}>Bs. {bancoFmt(Math.abs(totDebBs-totHabBs))}</span></div>
            </div>
          </BCard>
        </div>
      </div>
    );
  };

  // ── LIBRO DIARIO — TABLA PLANA FORMATO COMPROBANTE ────────────────────────
  const LibroDiarioView = () => {
    const [search, setSearch] = useState('');
    const [filtMes, setFiltMes] = useState('');
    const [filtMod, setFiltMod] = useState('');
    const [monedaVista, setMonedaVista] = useState('BS'); // BS o USD

    const meses = [...new Set(asientos.map(a=>a.mes||a.fecha?.substring(0,7)||''))].filter(Boolean).sort().reverse();

    const filtered = asientos.filter(a=>{
      if(filtMes && (a.mes||a.fecha?.substring(0,7)||'') !== filtMes) return false;
      if(filtMod && (a.modulo||'Manual') !== filtMod) return false;
      if(search && !a.descripcion?.toLowerCase().includes(search.toLowerCase()) && !(a.comprobante||a.numero)?.includes(search)) return false;
      return true;
    });

    // Generar filas planas para la tabla
    const filas = [];
    let saldoAcumBs = 0, saldoAcumUSD = 0;
    [...filtered].sort((a,b)=>a.fecha?.localeCompare(b.fecha)||0).forEach(a=>{
      (a.lineas||[]).forEach(l=>{
        const dBs=getDebeBs(l), hBs=getHaberBs(l), dUSD=getDebeUSD(l), hUSD=getHaberUSD(l);
        saldoAcumBs  += dBs - hBs;
        saldoAcumUSD += dUSD - hUSD;
        filas.push({
          comprobante: a.comprobante||a.numero||'',
          mes: a.mes||a.fecha?.substring(5,7)+'/'+a.fecha?.substring(0,4)||'',
          fecha: a.fecha,
          codigo: l.codigo||l.cuentaCodigo||'',
          cuenta: l.cuenta||l.cuentaNombre||'',
          tipo: l.tipoLinea||((dBs>0||dUSD>0)?'D':'H'),
          nroDoc: l.nroDoc||a.nroDocumento||a.referencia||'',
          concepto: l.concepto||a.descripcion||'',
          tasa: Number(l.tasa||a.tasa||0),
          debeBs: dBs,
          haberBs: hBs,
          saldoBs: saldoAcumBs,
          debeUSD: dUSD,
          haberUSD: hUSD,
          saldoUSD: saldoAcumUSD,
          modulo: a.modulo||'Manual',
          asientoId: a.id,
        });
      });
    });

    const exportarExcel = () => {
      let html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>body{font-size:10px;font-family:Arial}th{background:#1e3a5f;color:#fff;border:1px solid #94a3b8;padding:4px 8px;font-size:9px;text-transform:uppercase}td{border:1px solid #e2e8f0;padding:3px 8px}tr:nth-child(even) td{background:#f8fafc}.D td:first-child{color:#16a34a}.H td:first-child{color:#dc2626}</style></head><body>
      <p style="font-size:13px;font-weight:bold">Libro Diario — Servicios Jiret G&amp;B, C.A.</p>
      <p style="font-size:10px;color:#666">Generado: ${bancoDd(getTodayDate())} · ${filas.length} líneas</p>
      <table><thead><tr><th>Comprobante</th><th>Mes</th><th>Fecha</th><th>Código</th><th>Cuenta de movimiento</th><th>Tipo</th><th>Nro Documento</th><th>CONCEPTO</th><th>Tasa</th><th>Debe Bs</th><th>Haber Bs</th><th>Saldo Bs</th><th>Debe USD</th><th>Haber USD</th><th>Saldo USD</th></tr></thead><tbody>`;
      filas.forEach(f=>{
        html+=`<tr class="${f.tipo}"><td style="font-family:Courier New;font-weight:bold">${f.comprobante}</td><td>${f.mes}</td><td>${bancoDd(f.fecha)}</td><td style="font-family:Courier New;color:#1e40af;font-weight:bold">${f.codigo}</td><td>${f.cuenta}</td><td style="font-weight:bold;${f.tipo==='D'?'color:#16a34a':'color:#dc2626'}">${f.tipo}</td><td>${f.nroDoc}</td><td>${f.concepto}</td><td style="text-align:right">${f.tasa}</td><td style="text-align:right">${f.debeBs>0?bancoFmt(f.debeBs):''}</td><td style="text-align:right">${f.haberBs>0?bancoFmt(f.haberBs):''}</td><td style="text-align:right">{'$'+bancoFmt(f.saldoBs)}</td><td style="text-align:right">${f.debeUSD>0?bancoFmt(f.debeUSD):''}</td><td style="text-align:right">${f.haberUSD>0?bancoFmt(f.haberUSD):''}</td><td style="text-align:right">{'$'+bancoFmt(f.saldoUSD)}</td></tr>`;
      });
      html+=`</tbody></table></body></html>`;
      const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`libro_diario_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(url);
    };

    return (
      <BCard title="Libro Diario" subtitle={`${filas.length} líneas · ${filtered.length} comprobantes`}
        action={<div className="flex gap-2 flex-wrap items-center">
          {/* Toggle moneda */}
          <div className="flex rounded-xl overflow-hidden border-2 border-slate-200">
            <button onClick={()=>setMonedaVista('BS')} className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all ${monedaVista==='BS'?'bg-blue-600 text-white':'bg-white text-slate-500'}`}>Bs.</button>
            <button onClick={()=>setMonedaVista('USD')} className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all ${monedaVista==='USD'?'bg-emerald-600 text-white':'bg-white text-slate-500'}`}>USD</button>
            <button onClick={()=>setMonedaVista('AMBAS')} className={`px-3 py-1.5 text-[10px] font-black uppercase transition-all ${monedaVista==='AMBAS'?'bg-slate-700 text-white':'bg-white text-slate-500'}`}>Ambas</button>
          </div>
          <select className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500" value={filtMes} onChange={e=>setFiltMes(e.target.value)}>
            <option value="">Todos los meses</option>
            {meses.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500" value={filtMod} onChange={e=>setFiltMod(e.target.value)}>
            <option value="">Todos</option><option value="Bancos">Bancos</option><option value="Manual">Manual</option>
          </select>
          <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." className="border-2 border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 w-36"/></div>
          <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><Download size={12}/> Excel</button>
        </div>}>
        {filas.length===0?<BEmptyState icon={BookMarked} title="Sin registros" desc="Los asientos de banco se generan automáticamente al registrar movimientos"/>:
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr style={{background:'#0f172a'}}>
                {[
                  'Comprobante','Mes','Fecha','Código','Cuenta de movimiento','T','Nro Doc.','Concepto','Tasa',
                  ...(monedaVista!=='USD'?['Debe Bs','Haber Bs','Saldo Bs']:[]),
                  ...(monedaVista!=='BS' ?['Debe USD','Haber USD','Saldo USD']:[]),
                ].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left font-black uppercase tracking-wider whitespace-nowrap text-[9px]" style={{color:'#94a3b8',borderBottom:'2px solid #1e293b'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filas.map((f,i)=>{
                  const isD = f.tipo==='D';
                  const cambiaComp = i===0 || filas[i-1].comprobante!==f.comprobante;
                  return (
                    <tr key={i} className={`hover:bg-blue-50/40 transition-colors ${cambiaComp&&i>0?'border-t-2 border-blue-100':''}`}
                      style={{background: isD ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)'}}>
                      <td className="px-3 py-2 font-mono font-black text-blue-600 whitespace-nowrap">{cambiaComp?f.comprobante:''}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{cambiaComp?f.mes:''}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{cambiaComp?bancoDd(f.fecha):''}</td>
                      <td className="px-3 py-2 font-mono font-black text-blue-700 whitespace-nowrap">{f.codigo}</td>
                      <td className="px-3 py-2 font-medium text-slate-800 max-w-[180px]">
                        <span className={`${!isD?'pl-4':''} block truncate`}>{f.cuenta}</span>
                      </td>
                      <td className={`px-3 py-2 font-black text-center ${isD?'text-emerald-600':'text-red-500'}`}>{f.tipo}</td>
                      <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">{f.nroDoc}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[160px]"><span className="block truncate">{f.concepto}</span></td>
                      <td className="px-3 py-2 font-mono text-slate-500 text-right whitespace-nowrap">{f.tasa||''}</td>
                      {/* Columnas Bs - visibles si monedaVista es BS o AMBAS */}
                      {monedaVista!=='USD'&&<><td className="px-3 py-2 font-mono font-black text-emerald-600 text-right whitespace-nowrap">{f.debeBs>0?`Bs.${bancoFmt(f.debeBs)}`:''}</td>
                      <td className="px-3 py-2 font-mono font-black text-red-500 text-right whitespace-nowrap">{f.haberBs>0?`Bs.${bancoFmt(f.haberBs)}`:''}</td>
                      <td className="px-3 py-2 font-mono text-slate-700 text-right whitespace-nowrap font-bold">Bs.{bancoFmt(f.saldoBs)}</td></>}
                      {/* Columnas USD - visibles si monedaVista es USD o AMBAS */}
                      {monedaVista!=='BS'&&<><td className="px-3 py-2 font-mono text-emerald-700 text-right whitespace-nowrap">{f.debeUSD>0?`$${bancoFmt(f.debeUSD)}`:''}</td>
                      <td className="px-3 py-2 font-mono text-red-600 text-right whitespace-nowrap">{f.haberUSD>0?`$${bancoFmt(f.haberUSD)}`:''}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 text-right whitespace-nowrap">{'$'+bancoFmt(f.saldoUSD)}</td></>}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr style={{background:'#0f172a'}}>
                <td colSpan={9} className="px-3 py-3 font-black text-xs text-slate-400 uppercase tracking-widest">TOTALES PERÍODO</td>
                {monedaVista!=='USD'&&<><td className="px-3 py-3 font-mono font-black text-emerald-400 text-right whitespace-nowrap">Bs.{bancoFmt(filas.reduce((a,f)=>a+f.debeBs,0))}</td><td className="px-3 py-3 font-mono font-black text-red-400 text-right whitespace-nowrap">Bs.{bancoFmt(filas.reduce((a,f)=>a+f.haberBs,0))}</td><td className="px-3 py-3"></td></>}
                {monedaVista!=='BS'&&<><td className="px-3 py-3 font-mono font-black text-emerald-400 text-right whitespace-nowrap">{'$'+bancoFmt(filas.reduce((a,f)=>a+f.debeUSD,0))}</td><td className="px-3 py-3 font-mono font-black text-red-400 text-right whitespace-nowrap">{'$'+bancoFmt(filas.reduce((a,f)=>a+f.haberUSD,0))}</td><td className="px-3 py-3"></td></>}
              </tr></tfoot>
            </table>
          </div>}
      </BCard>
    );
  };

  // ── NUEVO ASIENTO MANUAL — CON TASA Y USD ─────────────────────────────────
  const NuevoAsientoView = () => {
    const [form, setForm] = useState({
      fecha: getTodayDate(), descripcion:'', tipo:'Manual', referencia:'',
      tasa:'', niif:false, efectivo:false, modulo:'Manual'
    });
    const [lineas, setLineas] = useState([
      {cuentaId:'',codigo:'',cuenta:'',debeBs:'',haberBs:'',debeUSD:'',haberUSD:''},
      {cuentaId:'',codigo:'',cuenta:'',debeBs:'',haberBs:'',debeUSD:'',haberUSD:''},
    ]);
    const [busy, setBusy] = useState(false);
    const tasaNum = Number(form.tasa)||1;

    const totDebeBs  = lineas.reduce((s,l)=>s+Number(l.debeBs||0),0);
    const totHaberBs = lineas.reduce((s,l)=>s+Number(l.haberBs||0),0);
    const totDebeUSD = lineas.reduce((s,l)=>s+Number(l.debeUSD||0),0);
    const totHaberUSD= lineas.reduce((s,l)=>s+Number(l.haberUSD||0),0);
    const balOkBs    = totDebeBs>0 && Math.abs(totDebeBs-totHaberBs)<0.01;
    const balOkUSD   = totDebeUSD>0 && Math.abs(totDebeUSD-totHaberUSD)<0.01;
    const balOk      = balOkBs && balOkUSD;

    const setCuenta = (i, cuentaId) => {
      const c = cuentas.find(x=>x.id===cuentaId);
      const n = [...lineas]; n[i] = {...n[i], cuentaId, codigo:c?.codigo||'', cuenta:c?.nombre||''}; setLineas(n);
    };

    // Cuando cambia Bs, calcular USD automáticamente (y vice versa) según tasa
    const setDebeBs = (i, val) => {
      const n=[...lineas]; n[i].debeBs=val;
      if(tasaNum>0 && val) n[i].debeUSD=String(Number(val)/tasaNum);
      setLineas(n);
    };
    const setHaberBs = (i, val) => {
      const n=[...lineas]; n[i].haberBs=val;
      if(tasaNum>0 && val) n[i].haberUSD=String(Number(val)/tasaNum);
      setLineas(n);
    };
    const setDebeUSD = (i, val) => {
      const n=[...lineas]; n[i].debeUSD=val;
      if(tasaNum>0 && val) n[i].debeBs=String(Number(val)*tasaNum);
      setLineas(n);
    };
    const setHaberUSD = (i, val) => {
      const n=[...lineas]; n[i].haberUSD=val;
      if(tasaNum>0 && val) n[i].haberBs=String(Number(val)*tasaNum);
      setLineas(n);
    };

    const save = async () => {
      if (!form.descripcion) return alert('Ingrese la descripción');
      if (!balOkBs) return alert('Débitos Bs. ≠ Haberes Bs. — el asiento debe estar balanceado');
      const lineasV = lineas.filter(l=>l.cuentaId&&(Number(l.debeBs)>0||Number(l.haberBs)>0));
      if (lineasV.length < 2) return alert('Se requieren al menos 2 líneas');
      setBusy(true);
      try {
        const yyyymm = form.fecha.substring(0,7).replace('-','');
        const mesLabel = form.fecha.substring(5,7)+'/'+form.fecha.substring(0,4);
        const numManuales = asientos.filter(a=>a.modulo==='Manual'&&a.fecha?.startsWith(form.fecha.substring(0,7))).length+1;
        const numero = `CD-${yyyymm}-${String(numManuales).padStart(4,'0')}`;
        const id = bancoGid();
        const lineasFinal = lineasV.map(l=>({
          ...l,
          codigo:l.codigo, cuenta:l.cuenta,
          tipoLinea: Number(l.debeBs)>0?'D':'H',
          nroDoc: form.referencia,
          concepto: form.descripcion.toUpperCase(),
          tasa: tasaNum,
          debeBs:Number(l.debeBs||0), haberBs:Number(l.haberBs||0),
          debeUSD:Number(l.debeUSD||0), haberUSD:Number(l.haberUSD||0),
        }));
        await setDoc(getDocRef('cont_asientos',id),{
          id, comprobante:numero, numero,
          mes:mesLabel, fecha:form.fecha, tipo:form.tipo,
          nroDocumento:form.referencia, descripcion:form.descripcion.toUpperCase(),
          tasa:tasaNum, niif:form.niif, efectivo:form.efectivo,
          modulo:'Manual',
          lineas:lineasFinal,
          totalDebeBs:totDebeBs, totalHaberBs:totHaberBs,
          totalDebeUSD:totDebeUSD, totalHaberUSD:totHaberUSD,
          ts:serverTimestamp()
        });
        setForm({fecha:getTodayDate(),descripcion:'',tipo:'Manual',referencia:'',tasa:'',niif:false,efectivo:false,modulo:'Manual'});
        setLineas([{cuentaId:'',codigo:'',cuenta:'',debeBs:'',haberBs:'',debeUSD:'',haberUSD:''},{cuentaId:'',codigo:'',cuenta:'',debeBs:'',haberBs:'',debeUSD:'',haberUSD:''}]);
        setSec('libro');
      } finally { setBusy(false); }
    };

    return (
      <div>
        <BCard title="Nuevo Comprobante de Diario">
          {/* Encabezado del comprobante — estilo imagen del sistema */}
          <div className="rounded-2xl border-2 border-slate-200 overflow-hidden mb-6">
            <div className="px-5 py-3 flex items-center gap-3" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
              <FileText size={16} className="text-blue-400"/>
              <p className="font-black text-white text-sm uppercase tracking-widest">Comprobante Contable</p>
              <BBadge v="blue">{form.tipo}</BBadge>
            </div>
            <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50">
              <BFG label="Tipo"><select className={sel} value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                <option>Manual</option><option>Apertura</option><option>Cierre</option><option>Ajuste</option><option>Nómina</option><option>Diferencia Cambiaria</option>
              </select></BFG>
              <BFG label="Fecha"><input type="date" className={inp} value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></BFG>
              <BFG label="Nro. Documento / Ref."><input className={inp} value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})} placeholder="OC-001 / FACT-001"/></BFG>
              <BFG label="Tasa de Cambio (Bs/$)"><input type="number" step="0.01" className={inp} value={form.tasa} onChange={e=>setForm({...form,tasa:e.target.value})} placeholder="39.50"/></BFG>
              <BFG label="Descripción / Concepto" full><input className={inp} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} placeholder="Descripción del comprobante..."/></BFG>
              <BFG label="Opciones">
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.niif} onChange={e=>setForm({...form,niif:e.target.checked})} className="accent-blue-500 w-4 h-4"/>
                    <span className="text-xs font-black uppercase text-slate-600">NIIF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.efectivo} onChange={e=>setForm({...form,efectivo:e.target.checked})} className="accent-emerald-500 w-4 h-4"/>
                    <span className="text-xs font-black uppercase text-slate-600">Efectivo</span>
                  </label>
                </div>
              </BFG>
            </div>
          </div>

          {/* Líneas del asiento — con Bs y USD */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wide">Líneas Contables — Partida Doble (Bs. y USD)</h4>
            <button onClick={()=>setLineas([...lineas,{cuentaId:'',codigo:'',cuenta:'',debeBs:'',haberBs:'',debeUSD:'',haberUSD:''}])} className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg"><Plus size={12}/> Línea</button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-5">
            {/* Cabecera */}
            <div className="grid gap-0 bg-slate-800 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
              <div className="text-slate-400">Cuenta Contable</div>
              <div className="text-emerald-400 text-right">Debe Bs.</div>
              <div className="text-red-400 text-right">Haber Bs.</div>
              <div className="text-emerald-300 text-right">Debe USD</div>
              <div className="text-red-300 text-right">Haber USD</div>
              <div></div>
            </div>

            {lineas.map((l, i) => (
              <div key={i} className="grid gap-2 px-3 py-2 border-b border-slate-100 items-center" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
                <select className={`${sel} text-[11px]`} value={l.cuentaId} onChange={e=>setCuenta(i,e.target.value)}>
                  <option value="">— Seleccione cuenta —</option>
                  {[...cuentas].sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))).map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
                </select>
                <input type="number" step="0.01" className={`${inp} text-right font-black text-emerald-700`} value={l.debeBs} onChange={e=>setDebeBs(i,e.target.value)} placeholder="0.00"/>
                <input type="number" step="0.01" className={`${inp} text-right font-black text-red-600`} value={l.haberBs} onChange={e=>setHaberBs(i,e.target.value)} placeholder="0.00"/>
                <input type="number" step="0.01" className={`${inp} text-right text-emerald-600`} value={l.debeUSD} onChange={e=>setDebeUSD(i,e.target.value)} placeholder="0.00"/>
                <input type="number" step="0.01" className={`${inp} text-right text-red-500`} value={l.haberUSD} onChange={e=>setHaberUSD(i,e.target.value)} placeholder="0.00"/>
                <button onClick={()=>{const n=[...lineas];n.splice(i,1);setLineas(n);}} className="p-1 text-red-400 hover:text-red-600 flex justify-center"><Trash2 size={12}/></button>
              </div>
            ))}

            {/* Totales */}
            <div className="grid gap-2 px-3 py-3 items-center bg-slate-900" style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 28px'}}>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">TOTALES</div>
              <div className={`text-right font-mono font-black text-sm ${balOkBs?'text-emerald-400':'text-white'}`}>Bs.{bancoFmt(totDebeBs)}</div>
              <div className={`text-right font-mono font-black text-sm ${balOkBs?'text-emerald-400':'text-white'}`}>Bs.{bancoFmt(totHaberBs)}</div>
              <div className={`text-right font-mono font-black text-sm ${balOkUSD?'text-emerald-400':'text-slate-400'}`}>{'$'+bancoFmt(totDebeUSD)}</div>
              <div className={`text-right font-mono font-black text-sm ${balOkUSD?'text-emerald-400':'text-slate-400'}`}>{'$'+bancoFmt(totHaberUSD)}</div>
              <div className="flex justify-center">{balOk?<CheckCircle size={16} className="text-emerald-400"/>:<X size={16} className="text-red-400"/>}</div>
            </div>
          </div>

          {/* Estado de balance */}
          {!balOkBs && totDebeBs>0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-600"/><p className="text-[10px] font-black text-amber-700 uppercase">Diferencia Bs.: {bancoFmt(Math.abs(totDebeBs-totHaberBs))} — Debe estar en cero para registrar.</p></div>}
          {balOk && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-600"/><p className="text-[10px] font-black text-emerald-700 uppercase">Partida doble balanceada en Bs. y USD ✓</p></div>}

          <div className="flex justify-end gap-3">
            <BBo onClick={()=>setSec('libro')}>Cancelar</BBo>
            <BBg onClick={save} disabled={busy||!balOkBs}>{busy?'Registrando...':'Registrar Comprobante'}</BBg>
          </div>
        </BCard>
      </div>
    );
  };

  const navGroups = [
    { group:'Analítica', color:'#f97316', items:[{id:'dashboard',label:'Resumen Contable',icon:LayoutDashboard}] },
    { group:'Libro Diario', color:'#3b82f6', items:[{id:'libro',label:'Ver Libro Diario',icon:BookMarked},{id:'nuevo',label:'Nuevo Comprobante',icon:Plus}] },
  ];
  const views = { dashboard:<DashboardView/>, libro:<LibroDiarioView/>, nuevo:<NuevoAsientoView/> };
  const curNav = navGroups.flatMap(g=>g.items).find(n=>n.id===sec);

  return (
    <BSidebarLayout brand="Supply G&B" brandSub="Libro Diario" navGroups={navGroups} activeId={sec} onNav={setSec} onBack={onBack} accentColor={BLUE}
      headerContent={<>
        <div><h1 className="font-black text-slate-800 text-sm uppercase tracking-wide">{curNav?.label}</h1><p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Contabilidad <ChevronRight size={8} className="inline"/> Libro Diario</p></div>
        <div className="flex gap-2">
          <BBg onClick={()=>setSec('nuevo')} sm><Plus size={12}/> Comprobante</BBg>
        </div>
      </>}>
      {views[sec]}
    </BSidebarLayout>
  );
}

// ============================================================================
// ESTADOS FINANCIEROS — Balance, Resultados, Comprobación, Mayor
// ============================================================================
function BalancesApp({ fbUser, onBack }) {
  const [sec, setSec] = useState('comprobacion');
  const [cuentas,   setCuentas]   = useState([]);
  const [asientos,  setAsientos]  = useState([]);
  const [periodos,  setPeriodos]  = useState([]); // períodos cerrados

  useEffect(()=>{
    if(!fbUser) return;
    const subs=[
      onSnapshot(getColRef('planDeCuentas'), s=>setCuentas(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(query(getColRef('cont_asientos'), orderBy('fecha','desc')), s=>setAsientos(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('cont_periodos'), s=>setPeriodos(s.docs.map(d=>d.data()))),
    ];
    return()=>subs.forEach(u=>u());
  },[fbUser]);

  const tasaActiva = 39.50; // fallback

  // Helpers
  const getDebeBs  = l=>Number(l.debeBs ??l.debito ??0);
  const getHaberBs = l=>Number(l.haberBs??l.credito??0);
  const getDebeUSD = l=>Number(l.debeUSD ??0);
  const getHaberUSD= l=>Number(l.haberUSD??0);

  // Calcular saldo de una cuenta a partir de sus asientos
  const saldoCuenta = (codigo, hastaFecha) => {
    let dBs=0,hBs=0,dUSD=0,hUSD=0;
    asientos.filter(a=>!hastaFecha||a.fecha<=hastaFecha).forEach(a=>{
      (a.lineas||[]).forEach(l=>{
        if((l.codigo||l.cuentaCodigo||'').startsWith(codigo)){
          dBs+=getDebeBs(l); hBs+=getHaberBs(l);
          dUSD+=getDebeUSD(l); hUSD+=getHaberUSD(l);
        }
      });
    });
    return {dBs,hBs,saldoBs:dBs-hBs,dUSD,hUSD,saldoUSD:dUSD-hUSD};
  };

  const grupoMap={'1':'ACTIVOS','2':'PASIVOS','3':'PATRIMONIO','4':'INGRESOS','5':'COSTOS','6':'GASTOS'};

  // ── BALANCE DE COMPROBACIÓN ──────────────────────────────────────────────
  const ComprobacionView = () => {
    const [hasta, setHasta] = useState(getTodayDate());
    const [soloConMov, setSoloConMov] = useState(true);

    const filas = [...cuentas]
      .sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo)))
      .map(c=>({...c, ...saldoCuenta(c.codigo, hasta)}))
      .filter(c=>!soloConMov||(Math.abs(c.saldoBs)>0.001||Math.abs(c.saldoUSD)>0.001));

    const totDeBs = filas.reduce((a,c)=>a+c.dBs,0);
    const totHaBs = filas.reduce((a,c)=>a+c.hBs,0);
    const totDeUSD= filas.reduce((a,c)=>a+c.dUSD,0);
    const totHaUSD= filas.reduce((a,c)=>a+c.hUSD,0);

    const exportar=()=>{
      let h=`<html><head><meta charset="utf-8"><style>body{font-size:10px;font-family:Arial}th{background:#1e3a5f;color:#fff;border:1px solid #ccc;padding:4px 8px}td{border:1px solid #e2e8f0;padding:3px 8px}tr:nth-child(even) td{background:#f8fafc}</style></head><body>
      <p style="font-size:13px;font-weight:bold">Balance de Comprobación — Servicios Jiret G&B, C.A.</p>
      <p style="font-size:10px;color:#666">Al ${bancoDd(hasta)} · ${filas.length} cuentas</p>
      <table><thead><tr><th>Código</th><th>Cuenta</th><th>Grupo</th><th>Debe Bs</th><th>Haber Bs</th><th>Saldo Bs</th><th>Debe USD</th><th>Haber USD</th><th>Saldo USD</th></tr></thead><tbody>`;
      filas.forEach(c=>{h+=`<tr><td style="font-family:monospace;color:#1e40af;font-weight:bold">${c.codigo}</td><td>${c.nombre}</td><td>${grupoMap[String(c.codigo).charAt(0)]||''}</td><td style="text-align:right">${c.dBs>0?bancoFmt(c.dBs):''}</td><td style="text-align:right">${c.hBs>0?bancoFmt(c.hBs):''}</td><td style="text-align:right;font-weight:bold;${c.saldoBs>=0?'color:#16a34a':'color:#dc2626'}">{'$'+bancoFmt(c.saldoBs)}</td><td style="text-align:right">${c.dUSD>0?bancoFmt(c.dUSD):''}</td><td style="text-align:right">${c.hUSD>0?bancoFmt(c.hUSD):''}</td><td style="text-align:right;font-weight:bold">{'$'+bancoFmt(c.saldoUSD)}</td></tr>`;});
      h+=`<tr style="background:#0f172a"><td colspan="3" style="color:#94a3b8;font-weight:bold;padding:6px 8px">TOTALES</td><td style="text-align:right;color:#4ade80;font-weight:bold">Bs.${bancoFmt(totDeBs)}</td><td style="text-align:right;color:#f87171;font-weight:bold">Bs.${bancoFmt(totHaBs)}</td><td></td><td style="text-align:right;color:#4ade80;font-weight:bold">$${bancoFmt(totDeUSD)}</td><td style="text-align:right;color:#f87171;font-weight:bold">$${bancoFmt(totHaUSD)}</td><td></td></tr>`;
      h+=`</tbody></table></body></html>`;
      const blob=new Blob([h],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`balance_comprobacion_${hasta}.xls`;a.click();URL.revokeObjectURL(url);
    };

    return (
      <BCard title="Balance de Comprobación" subtitle="Saldos acumulados por cuenta contable"
        action={<div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase cursor-pointer"><input type="checkbox" checked={soloConMov} onChange={e=>setSoloConMov(e.target.checked)} className="accent-blue-500"/>Solo con movimiento</label>
          <BFG label=""><input type="date" className={inp} value={hasta} onChange={e=>setHasta(e.target.value)}/></BFG>
          <button onClick={exportar} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><Download size={12}/> Excel</button>
        </div>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr style={{background:'#0f172a'}}>
              {['Código','Cuenta de movimiento','Grupo','Debe Bs','Haber Bs','Saldo Bs','Debe USD','Haber USD','Saldo USD'].map(h=>(
                <th key={h} className="px-3 py-2.5 font-black uppercase tracking-wide text-left whitespace-nowrap text-[9px]" style={{color:'#94a3b8'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filas.length===0&&<tr><td colSpan={9}><BEmptyState icon={Scale} title="Sin movimientos" desc="Registre asientos para ver el balance"/></td></tr>}
              {filas.map((c,i)=>(
                <tr key={c.id} className="hover:bg-blue-50/30 border-b border-slate-50">
                  <td className="px-3 py-2 font-mono font-black text-blue-600">{c.codigo}</td>
                  <td className="px-3 py-2 font-medium text-slate-800 max-w-[200px] truncate">{c.nombre}</td>
                  <td className="px-3 py-2 text-[10px] text-slate-500 uppercase">{grupoMap[String(c.codigo).charAt(0)]||'—'}</td>
                  <td className="px-3 py-2 font-mono text-emerald-600 text-right">{c.dBs>0?`Bs.${bancoFmt(c.dBs)}`:''}</td>
                  <td className="px-3 py-2 font-mono text-red-500 text-right">{c.hBs>0?`Bs.${bancoFmt(c.hBs)}`:''}</td>
                  <td className={`px-3 py-2 font-mono font-black text-right ${c.saldoBs>=0?'text-emerald-700':'text-red-600'}`}>Bs.{bancoFmt(c.saldoBs)}</td>
                  <td className="px-3 py-2 font-mono text-emerald-600 text-right">{c.dUSD>0?`$${bancoFmt(c.dUSD)}`:''}</td>
                  <td className="px-3 py-2 font-mono text-red-500 text-right">{c.hUSD>0?`$${bancoFmt(c.hUSD)}`:''}</td>
                  <td className={`px-3 py-2 font-mono font-black text-right ${c.saldoUSD>=0?'text-emerald-700':'text-red-600'}`}>{'$'+bancoFmt(c.saldoUSD)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{background:'#0f172a'}}>
              <td colSpan={3} className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase">TOTALES</td>
              <td className="px-3 py-3 font-mono font-black text-emerald-400 text-right">Bs.{bancoFmt(totDeBs)}</td>
              <td className="px-3 py-3 font-mono font-black text-red-400 text-right">Bs.{bancoFmt(totHaBs)}</td>
              <td className="px-3 py-3 font-mono font-black text-white text-right">Bs.{bancoFmt(totDeBs-totHaBs)}</td>
              <td className="px-3 py-3 font-mono font-black text-emerald-400 text-right">{'$'+bancoFmt(totDeUSD)}</td>
              <td className="px-3 py-3 font-mono font-black text-red-400 text-right">{'$'+bancoFmt(totHaUSD)}</td>
              <td className="px-3 py-3 font-mono font-black text-white text-right">{'$'+bancoFmt(totDeUSD-totHaUSD)}</td>
            </tr></tfoot>
          </table>
        </div>
      </BCard>
    );
  };

  // ── BALANCE GENERAL ──────────────────────────────────────────────────────
  const BalanceGeneralView = () => {
    const [hasta, setHasta] = useState(getTodayDate());
    const [currency, setCurrency] = useState('both');
    const showUSD = currency!=='bs'; const showBS = currency!=='usd';

    const tree = useMemo(() => {
      const raw = buildArbolContable(cuentas, saldoCuenta, hasta, ['1','2','3']);
      const orden = { 'ACTIVOS':1, 'PASIVOS':2, 'PATRIMONIO':3 };
      return [...raw].sort((a,b)=>(orden[a.n]||9)-(orden[b.n]||9));
    }, [cuentas, asientos, hasta]);

    const activosNode = tree.find(n=>n.n==='ACTIVOS') || {u:0,b:0,c:[]};
    const pasivosNode = tree.find(n=>n.n==='PASIVOS') || {u:0,b:0,c:[]};
    const patrimonioNode = tree.find(n=>n.n==='PATRIMONIO') || {u:0,b:0,c:[]};
    const totActUSD = activosNode.u, totActBs = activosNode.b;
    const totPasPatUSD = Math.abs(pasivosNode.u)+Math.abs(patrimonioNode.u);
    const totPasPatBs  = Math.abs(pasivosNode.b)+Math.abs(patrimonioNode.b);
    const diffUSD = totActUSD - totPasPatUSD;
    const cuadrado = Math.abs(diffUSD) < 0.05;

    const exportExcel = async () => {
      try {
        const XL = await loadSheetJSStyled();
        const n = v => v!=null&&!isNaN(v)?parseFloat(Math.abs(v).toFixed(2)):null;
        const colHeaders=['CUENTA / DESCRIPCIÓN',...(showUSD?['USD']:[]),...(showBS?['Bs.']:[])];
        const nCols=colHeaders.length;
        const flatRows=cxsFlattenTreeForExcel(tree,null);
        flatRows.forEach(r=>{ r._vals=[r.label,...(showUSD?[r.u!=null?n(r.u):null]:[]),...(showBS?[r.b!=null?n(r.b):null]:[])]; });
        const footerRows=[
          [cxsFooterCell('TOTAL PASIVO Y PATRIMONIO',CXS.AMBER,false,'left'),...(showUSD?[cxsFooterCell(n(totPasPatUSD),'F59E0B',true,'right')]:[]),...(showBS?[cxsFooterCell('','F59E0B',false,'right')]:[])],
          [cxsFooterCell('TOTAL ACTIVOS','F97316',false,'left'),...(showUSD?[cxsFooterCell(n(totActUSD),'F97316',true,'right')]:[]),...(showBS?[cxsFooterCell('','F97316',false,'right')]:[])],
          [cxsFooterCell('ACTIVO − (PASIVO+PATRIMONIO)',cuadrado?'10B981':CXS.RED,false,'left'),...(showUSD?[cxsFooterCell(n(diffUSD),cuadrado?'10B981':CXS.RED,true,'right')]:[]),...(showBS?[cxsFooterCell(cuadrado?'✓ CUADRADO':'','10B981',false,'right')]:[])],
        ];
        const ws=cxsBuildStyledSheet(flatRows,colHeaders,nCols,footerRows);
        cxsApplyLetterhead(ws,'BALANCE DE SITUACIÓN FINANCIERA',`Corte: ${bancoDd(hasta)}`,nCols);
        ws['!cols']=[{wch:60},...(showUSD?[{wch:20}]:[]),...(showBS?[{wch:22}]:[])];
        const wb=XL.utils.book_new(); XL.utils.book_append_sheet(wb,ws,'Balance General');
        XL.writeFile(wb,`Balance_${hasta}.xlsx`);
      } catch(e){ alert('Error exportar Excel: '+e.message); }
    };

    const exportPDF = () => {
      const fmtP=v=>cxsFmtR(v);
      const fmtPct=v=>totActUSD?((Math.abs(v||0)/totActUSD)*100).toFixed(2)+'%':'';
      const cols=['Cuenta',...(showUSD?['USD']:[]),...(showBS?['Bs.']:[]),'%'].map(c=>`<th>${c}</th>`).join('');
      const buildRows=(nodes,lvl=0)=>nodes.map(nd=>{
        const indent='&nbsp;'.repeat(lvl*4);
        const isAccountNode=/^\d\./.test(nd.n)||(!nd.c||nd.c.length===0);
        if(!nd.isLeaf&&nd.c?.length){
          if(!isAccountNode){ const childRows=buildRows(nd.c,lvl+1); return `<tr class="section"><td>${indent}${nd.n}</td>${showUSD?'<td></td>':''}${showBS?'<td></td>':''}<td></td></tr>${childRows}<tr class="total"><td>${indent}TOTAL ${nd.n}</td>${showUSD?`<td>${fmtP(nd.u)}</td>`:''}${showBS?`<td>${fmtP(nd.b)}</td>`:''}<td>${fmtPct(nd.u)}</td></tr>`; }
          const childRows=buildRows(nd.c,lvl+1);
          return `<tr><td>${indent}${nd.n}</td>${showUSD?`<td>${fmtP(nd.u)}</td>`:''}${showBS?`<td>${fmtP(nd.b)}</td>`:''}<td>${fmtPct(nd.u)}</td></tr>${childRows}<tr class="total"><td>${indent}TOTAL ${nd.n}</td>${showUSD?`<td>${fmtP(nd.u)}</td>`:''}${showBS?`<td>${fmtP(nd.b)}</td>`:''}<td></td></tr>`;
        }
        return `<tr><td>${indent}${nd.n}</td>${showUSD?`<td>${fmtP(nd.u)}</td>`:''}${showBS?`<td>${fmtP(nd.b)}</td>`:''}<td>${fmtPct(nd.u)}</td></tr>`;
      }).join('');
      const content=`<table><thead><tr>${cols}</tr></thead><tbody>${buildRows(tree)}<tr class="grand-total"><td>TOTAL PASIVO Y PATRIMONIO</td>${showUSD?`<td>${fmtP(totPasPatUSD)}</td>`:''}${showBS?'<td></td>':''}<td></td></tr><tr class="grand-total"><td>TOTAL ACTIVOS</td>${showUSD?`<td>${fmtP(totActUSD)}</td>`:''}${showBS?'<td></td>':''}<td></td></tr><tr class="grand-total" style="background:${cuadrado?'#006622':'#990000'}"><td>ACTIVO − (PASIVO+PATRIMONIO)</td>${showUSD?`<td>${fmtP(diffUSD)}</td>`:''}${showBS?'<td></td>':''}<td>${cuadrado?'✓ CUADRADO':''}</td></tr></tbody></table>`;
      printReporteContable(`<h1>Balance de Situación Financiera</h1><h2>Corte: ${bancoDd(hasta)}</h2>`, content);
    };

    return (
      <BCard title="Balance General" subtitle={`Al ${bancoDd(hasta)}`} action={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {[['both','USD + Bs'],['usd','Solo USD'],['bs','Solo Bs']].map(([v,lbl])=>(
              <button key={v} onClick={()=>setCurrency(v)} className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-colors ${currency===v?'bg-orange-500 text-white':'text-slate-500 hover:bg-slate-200'}`}>{lbl}</button>
            ))}
          </div>
          <input type="date" className={inp} value={hasta} onChange={e=>setHasta(e.target.value)} style={{width:'140px'}}/>
          <button onClick={exportExcel} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase"><FileSpreadsheet size={13}/> Excel</button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase"><FileText size={13}/> PDF</button>
        </div>
      }>
        {tree.length===0 ? <BEmptyState icon={Scale} title="Sin movimientos" desc="No hay asientos contables hasta esta fecha"/> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#111111] text-[9px] uppercase font-black text-slate-300">
              <tr>
                <th className="px-3 py-3">Estructura</th>
                {showUSD && <th className="px-3 py-3 text-right text-orange-300">USD</th>}
                {showBS  && <th className="px-3 py-3 text-right text-amber-300">Bs.</th>}
                <th className="px-3 py-3 text-right text-slate-400">%</th>
              </tr>
            </thead>
            <tbody>
              {tree.map((node,i)=><ArbolContableRow key={i} node={node} totalBase={totActUSD} currency={currency}/>)}
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td className="px-3 py-2.5 font-black text-xs uppercase text-slate-700 pl-6">TOTAL PASIVO Y PATRIMONIO</td>
                {showUSD && <td className="px-3 py-2.5 text-right font-mono font-black text-sm">{cxsFmtR(totPasPatUSD)}</td>}
                {showBS  && <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-amber-700">{cxsFmtR(totPasPatBs)}</td>}
                <td/>
              </tr>
              <tr className="bg-[#111111] text-white font-black border-t-4 border-orange-500">
                <td colSpan={currency==='both'?4:3} className="p-4">
                  <div className="flex flex-wrap justify-between items-center px-2 gap-4">
                    <div className="flex items-center gap-2"><Scale size={22} className="text-orange-400"/><p className="text-[10px] font-black tracking-widest">ACTIVOS = PASIVOS + PATRIMONIO</p></div>
                    <div className="flex gap-5 text-right flex-wrap">
                      <div><p className="text-[9px] text-slate-400 font-black uppercase mb-1">Diferencia</p>
                        <p className={`text-lg font-mono font-black ${cuadrado?'text-emerald-400':'text-red-400'}`}>{showUSD?`USD ${cxsFmtR(diffUSD)}`:`Bs. ${cxsFmtR(totActBs-totPasPatBs)}`}{cuadrado&&<span className="ml-2 text-[10px]">✓ CUADRADO</span>}</p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        )}
      </BCard>
    );
  };

  // ── ESTADO DE RESULTADOS ─────────────────────────────────────────────────
  const EstadoResultadosView = () => {
    const [desde, setDesde] = useState(bancoMesActual()+'-01');
    const [hasta, setHasta] = useState(getTodayDate());
    const [currency, setCurrency] = useState('both');
    const showUSD = currency!=='bs'; const showBS = currency!=='usd';

    // Saldo del PERÍODO desde→hasta (antes solo se usaba "hasta", acumulando desde el
    // inicio de los tiempos e ignorando el filtro Desde). Se resta el saldo justo antes
    // de "desde" — mismo truco que un balance de comprobación por rango, sin tocar
    // saldoCuenta() ni el resto de vistas que sí la usan como "hasta esta fecha".
    const diaAntesDesde = useMemo(() => {
      if (!desde) return null;
      const d = new Date(desde+'T00:00:00'); d.setDate(d.getDate()-1);
      return d.toISOString().slice(0,10);
    }, [desde]);
    const saldoPeriodo = (codigo, hastaFecha) => {
      const fin = saldoCuenta(codigo, hastaFecha);
      if (!diaAntesDesde) return fin;
      const inicio = saldoCuenta(codigo, diaAntesDesde);
      return { dBs:fin.dBs-inicio.dBs, hBs:fin.hBs-inicio.hBs, saldoBs:fin.saldoBs-inicio.saldoBs, dUSD:fin.dUSD-inicio.dUSD, hUSD:fin.hUSD-inicio.hUSD, saldoUSD:fin.saldoUSD-inicio.saldoUSD };
    };

    const tree = useMemo(() => buildArbolContable(cuentas, saldoPeriodo, hasta, ['4','5','6']), [cuentas, asientos, hasta, desde]);

    const ingresosNode = tree.find(n=>n.n==='INGRESOS') || {u:0,b:0,c:[]};
    const costosNode   = tree.find(n=>n.n==='COSTOS')   || {u:0,b:0,c:[]};
    const gastosNode    = tree.find(n=>n.n==='GASTOS')   || {u:0,b:0,c:[]};
    const totIngUSD=ingresosNode.u, totIngBs=ingresosNode.b;
    const totCosUSD=Math.abs(costosNode.u), totCosBs=Math.abs(costosNode.b);
    const totGasUSD=Math.abs(gastosNode.u), totGasBs=Math.abs(gastosNode.b);
    const utilBrUSD=totIngUSD-totCosUSD, utilBrBs=totIngBs-totCosBs;
    const utilNeUSD=utilBrUSD-totGasUSD, utilNeBs=utilBrBs-totGasBs;
    const baseVentas = totIngUSD||1;

    const treeOrdenado = [...tree].sort((a,b)=>({'INGRESOS':1,'COSTOS':2,'GASTOS':3}[a.n]||9)-({'INGRESOS':1,'COSTOS':2,'GASTOS':3}[b.n]||9));

    const exportExcel = async () => {
      try {
        const XL = await loadSheetJSStyled();
        const n = v => v!=null&&!isNaN(v)?parseFloat(Math.abs(v).toFixed(2)):null;
        const fmtPct = u => u!=null?parseFloat((Math.abs(u)/baseVentas*100).toFixed(2)):null;
        const colHeaders=['CUENTA / DESCRIPCIÓN',...(showUSD?['USD']:[]),...(showBS?['Bs.']:[]),'%'];
        const nCols=colHeaders.length;
        const flatRows=cxsFlattenTreeForExcel(treeOrdenado,null);
        flatRows.forEach(r=>{ r._vals=[r.label,...(showUSD?[r.u!=null?n(r.u):null]:[]),...(showBS?[r.b!=null?n(r.b):null]:[]),r.u!=null?fmtPct(r.u):null]; });
        const isLoss=utilNeUSD<0; const resultColor=isLoss?CXS.RED:'10B981';
        const footerRows=[[cxsFooterCell('RESULTADO DEL EJERCICIO',resultColor,false,'left'),...(showUSD?[cxsFooterCell(n(utilNeUSD),resultColor,true,'right')]:[]),...(showBS?[cxsFooterCell('',resultColor,false,'right')]:[]),cxsFooterCell(fmtPct(utilNeUSD)!=null?`${fmtPct(utilNeUSD)}%`:'',resultColor,false,'right')]];
        const ws=cxsBuildStyledSheet(flatRows,colHeaders,nCols,footerRows);
        cxsApplyLetterhead(ws,'ESTADO DE RESULTADO',`Período: ${bancoDd(desde)} al ${bancoDd(hasta)}`,nCols);
        ws['!cols']=[{wch:60},...(showUSD?[{wch:18}]:[]),...(showBS?[{wch:22}]:[]),{wch:10}];
        const wb=XL.utils.book_new(); XL.utils.book_append_sheet(wb,ws,'Estado de Resultado');
        XL.writeFile(wb,`EstadoResultado_${desde}_a_${hasta}.xlsx`);
      } catch(e){ alert('Error exportar Excel: '+e.message); }
    };

    const exportPDF = () => {
      const fmtP=v=>cxsFmtR(v);
      const fmtPct=v=>baseVentas?((Math.abs(v||0)/baseVentas)*100).toFixed(2)+'%':'';
      const cols=['Cuenta',...(showUSD?['USD']:[]),...(showBS?['Bs.']:[]),'%'].map(c=>`<th>${c}</th>`).join('');
      const buildRows=(nodes,lvl=0)=>nodes.map(nd=>{
        const indent='&nbsp;'.repeat(lvl*4);
        const isAccountNode=/^\d\./.test(nd.n)||(!nd.c||nd.c.length===0);
        if(!nd.isLeaf&&nd.c?.length){
          if(!isAccountNode){ const childRows=buildRows(nd.c,lvl+1); return `<tr class="section"><td>${indent}${nd.n}</td>${showUSD?'<td></td>':''}${showBS?'<td></td>':''}<td></td></tr>${childRows}<tr class="total"><td>${indent}TOTAL ${nd.n}</td>${showUSD?`<td>${fmtP(nd.u)}</td>`:''}${showBS?`<td>${fmtP(nd.b)}</td>`:''}<td></td></tr>`; }
          const childRows=buildRows(nd.c,lvl+1);
          return `<tr><td>${indent}${nd.n}</td>${showUSD?`<td>${fmtP(nd.u)}</td>`:''}${showBS?`<td>${fmtP(nd.b)}</td>`:''}<td>${fmtPct(nd.u)}</td></tr>${childRows}<tr class="total"><td>${indent}TOTAL ${nd.n}</td>${showUSD?`<td>${fmtP(nd.u)}</td>`:''}${showBS?`<td>${fmtP(nd.b)}</td>`:''}<td></td></tr>`;
        }
        return `<tr><td>${indent}${nd.n}</td>${showUSD?`<td>${fmtP(nd.u)}</td>`:''}${showBS?`<td>${fmtP(nd.b)}</td>`:''}<td>${fmtPct(nd.u)}</td></tr>`;
      }).join('');
      const content=`<table><thead><tr>${cols}</tr></thead><tbody>${buildRows(treeOrdenado)}<tr class="grand-total"><td>RESULTADO DEL EJERCICIO</td>${showUSD?`<td>${fmtP(utilNeUSD)}</td>`:''}${showBS?'<td></td>':''}<td>${fmtPct(utilNeUSD)}</td></tr></tbody></table>`;
      printReporteContable(`<h1>Estado de Resultado</h1><h2>Período: ${bancoDd(desde)} al ${bancoDd(hasta)}</h2>`, content);
    };

    return (
      <BCard title="Estado de Resultados (Ganancias y Pérdidas)" action={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {[['both','USD + Bs'],['usd','Solo USD'],['bs','Solo Bs']].map(([v,lbl])=>(
              <button key={v} onClick={()=>setCurrency(v)} className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-colors ${currency===v?'bg-orange-500 text-white':'text-slate-500 hover:bg-slate-200'}`}>{lbl}</button>
            ))}
          </div>
          <input type="date" className={inp} style={{width:'130px'}} value={desde} onChange={e=>setDesde(e.target.value)}/>
          <input type="date" className={inp} style={{width:'130px'}} value={hasta} onChange={e=>setHasta(e.target.value)}/>
          <button onClick={exportExcel} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase"><FileSpreadsheet size={13}/> Excel</button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase"><FileText size={13}/> PDF</button>
        </div>
      }>
        {tree.length===0 ? <BEmptyState icon={TrendingUp} title="Sin movimientos" desc="No hay asientos contables en este período"/> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#111111] text-[9px] uppercase font-black text-slate-300">
              <tr>
                <th className="px-3 py-3">Cuentas</th>
                {showUSD && <th className="px-3 py-3 text-right text-orange-300">USD</th>}
                {showBS  && <th className="px-3 py-3 text-right text-amber-300">Bs.</th>}
                <th className="px-3 py-3 text-right text-slate-400">%</th>
              </tr>
            </thead>
            <tbody>
              {treeOrdenado.map((node,i)=>(
                <React.Fragment key={i}>
                  <ArbolContableRow node={node} totalBase={baseVentas} currency={currency}/>
                  {node.n==='COSTOS' && (
                    <tr className="border-t-2 border-emerald-400 bg-emerald-50">
                      <td className="px-4 py-2.5 font-black text-[11px] uppercase tracking-widest text-emerald-800 pl-6">UTILIDAD BRUTA</td>
                      {showUSD && <td className={`px-3 py-2.5 text-right font-mono font-black text-sm ${utilBrUSD>=0?'text-emerald-700':'text-red-600'}`}>{cxsFmtR(utilBrUSD)}</td>}
                      {showBS  && <td className={`px-3 py-2.5 text-right font-mono font-black text-sm ${utilBrBs>=0?'text-emerald-600':'text-red-500'}`}>{cxsFmtR(utilBrBs)}</td>}
                      <td className="px-3 py-2.5 text-right font-mono font-black text-[11px] text-emerald-600">{(Math.abs(utilBrUSD)/baseVentas*100).toFixed(2)}%</td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              <tr className="bg-[#111111] text-white font-black border-t-4 border-orange-600">
                <td className="px-4 py-5 text-sm uppercase tracking-widest" style={{paddingLeft:24}}>RESULTADO DEL EJERCICIO</td>
                {showUSD && <td className={`px-3 py-5 text-right text-lg font-mono ${utilNeUSD<0?'text-red-400':'text-emerald-400'}`}>{cxsFmtR(utilNeUSD)}</td>}
                {showBS  && <td className={`px-3 py-5 text-right text-base font-mono ${utilNeBs<0?'text-red-300':'text-amber-300'}`}>{cxsFmtR(utilNeBs)}</td>}
                <td className="px-3 py-5 text-right text-lg font-mono">{(Math.abs(utilNeUSD)/baseVentas*100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        )}
      </BCard>
    );
  };

  // ── MAYOR ANALÍTICO ───────────────────────────────────────────────────────
  const MayorAnaliticoView = () => {
    const [cuentaId, setCuentaId] = useState('');
    const [desde, setDesde]       = useState(bancoMesActual()+'-01');
    const [hasta, setHasta]       = useState(getTodayDate());
    const cuentaSel = cuentas.find(c=>c.id===cuentaId);

    const movsCuenta = [];
    let saldoBsAcum=0, saldoUSDacum=0;
    if(cuentaSel){
      [...asientos].sort((a,b)=>a.fecha?.localeCompare(b.fecha)||0)
        .filter(a=>a.fecha>=desde&&a.fecha<=hasta)
        .forEach(a=>{
          (a.lineas||[]).filter(l=>(l.codigo||l.cuentaCodigo||'').startsWith(cuentaSel.codigo)).forEach(l=>{
            const dBs=Number(l.debeBs??l.debito??0), hBs=Number(l.haberBs??l.credito??0);
            const dUSD=Number(l.debeUSD??0), hUSD=Number(l.haberUSD??0);
            saldoBsAcum+=dBs-hBs; saldoUSDacum+=dUSD-hUSD;
            movsCuenta.push({fecha:a.fecha,comprobante:a.comprobante||a.numero,concepto:l.concepto||a.descripcion,nroDoc:l.nroDoc||a.nroDocumento||'',dBs,hBs,saldoBs:saldoBsAcum,dUSD,hUSD,saldoUSD:saldoUSDacum});
          });
        });
    }

    return (
      <BCard title="Mayor Analítico" subtitle="Movimientos y saldo de cuenta">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <BFG label="Cuenta Contable" full>
            <select className={sel} value={cuentaId} onChange={e=>setCuentaId(e.target.value)}>
              <option value="">— Seleccione cuenta —</option>
              {[...cuentas].sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))).map(c=><option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
            </select>
          </BFG>
          <BFG label="Desde"><input type="date" className={inp} value={desde} onChange={e=>setDesde(e.target.value)}/></BFG>
          <BFG label="Hasta"><input type="date" className={inp} value={hasta} onChange={e=>setHasta(e.target.value)}/></BFG>
        </div>
        {cuentaSel ? (
          <div>
            <div className="flex items-center gap-4 p-4 rounded-2xl mb-5" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
              <div><p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">{cuentaSel.codigo}</p><p className="font-black text-white">{cuentaSel.nombre}</p></div>
              <div className="ml-auto text-right"><p className="text-emerald-400 font-mono font-black text-xl">Bs.{bancoFmt(saldoBsAcum)}</p><p className="text-slate-400 text-xs">{'$'+bancoFmt(saldoUSDacum)}</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr style={{background:'#1e293b'}}>
                  {['Fecha','Comprobante','Concepto','Nro Doc.','Debe Bs','Haber Bs','Saldo Bs','Debe USD','Haber USD','Saldo USD'].map(h=><th key={h} className="px-3 py-2 text-left text-[9px] font-black uppercase text-slate-400 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {movsCuenta.length===0&&<tr><td colSpan={10}><BEmptyState icon={BookOpen} title="Sin movimientos" desc="No hay movimientos en el período"/></td></tr>}
                  {movsCuenta.map((m,i)=><tr key={i} className="hover:bg-slate-50 border-b border-slate-50">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{bancoDd(m.fecha)}</td>
                    <td className="px-3 py-2 font-mono font-black text-blue-600">{m.comprobante}</td>
                    <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate">{m.concepto}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{m.nroDoc}</td>
                    <td className="px-3 py-2 font-mono text-emerald-600 text-right">{m.dBs>0?`Bs.${bancoFmt(m.dBs)}`:''}</td>
                    <td className="px-3 py-2 font-mono text-red-500 text-right">{m.hBs>0?`Bs.${bancoFmt(m.hBs)}`:''}</td>
                    <td className={`px-3 py-2 font-mono font-black text-right ${m.saldoBs>=0?'text-emerald-700':'text-red-600'}`}>Bs.{bancoFmt(m.saldoBs)}</td>
                    <td className="px-3 py-2 font-mono text-emerald-600 text-right">{m.dUSD>0?`$${bancoFmt(m.dUSD)}`:''}</td>
                    <td className="px-3 py-2 font-mono text-red-500 text-right">{m.hUSD>0?`$${bancoFmt(m.hUSD)}`:''}</td>
                    <td className={`px-3 py-2 font-mono font-black text-right ${m.saldoUSD>=0?'text-emerald-700':'text-red-600'}`}>{'$'+bancoFmt(m.saldoUSD)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        ):<BEmptyState icon={BookOpen} title="Seleccione una cuenta" desc="Elija una cuenta contable para ver su mayor analítico"/>}
      </BCard>
    );
  };

  // ── CIERRE CONTABLE ───────────────────────────────────────────────────────
  const CierreContableView = () => {
    const [mes, setMes]   = useState(bancoMesActual());
    const [busy, setBusy] = useState(false);

    const cerrar = async () => {
      if(!window.confirm(`¿Cerrar el período ${mes}? Los asientos de este período quedarán BLOQUEADOS de forma permanente.`)) return;
      setBusy(true);
      try {
        const id = mes.replace('-','');
        const cntMes = asientos.filter(a=>a.fecha?.startsWith(mes)).length;
        await setDoc(getDocRef('cont_periodos',id),{id,mes,fechaCierre:getTodayDate(),asientosBloqueados:cntMes,ts:serverTimestamp()});
        // Marcar asientos del mes como cerrados
        const batch=writeBatch(_bancoDB);
        asientos.filter(a=>a.fecha?.startsWith(mes)).forEach(a=>batch.update(getDocRef('cont_asientos',a.id),{periodoCerrado:true,periodoId:id}));
        await batch.commit();
        alert(`✅ Período ${mes} cerrado. ${cntMes} asientos bloqueados.`);
      } finally { setBusy(false); }
    };

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <BKPI label="Períodos Cerrados" value={periodos.length} accent="blue" Icon={CheckCircle}/>
          <BKPI label="Asientos Bloqueados" value={periodos.reduce((a,p)=>a+(p.asientosBloqueados||0),0)} accent="red" Icon={Lock}/>
          <BKPI label="Último Cierre" value={periodos[0]?.mes||'—'} accent="green" Icon={CalendarDays}/>
        </div>
        <BCard title="Cierre de Período Mensual" subtitle="Bloquea todos los asientos del mes seleccionado">
          <div className="max-w-md space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5"/>
              <p className="text-[11px] text-amber-700 font-medium leading-relaxed">El cierre de período es <strong>IRREVERSIBLE</strong>. Los asientos marcados no podrán ser modificados ni eliminados. Solo realice el cierre cuando haya verificado todos los asientos del período.</p>
            </div>
            <BFG label="Período a Cerrar (Mes)">
              <input type="month" className={inp} value={mes} onChange={e=>setMes(e.target.value)}/>
            </BFG>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Asientos del período <strong className="text-slate-800">{mes}</strong>: <strong className="text-blue-600">{asientos.filter(a=>a.fecha?.startsWith(mes)).length}</strong></p>
            </div>
            <BBg onClick={cerrar} disabled={busy||periodos.find(p=>p.mes===mes)} >
              {periodos.find(p=>p.mes===mes)?<><Lock size={14}/> Ya cerrado</>:busy?<><RefreshCw size={14} className="animate-spin"/> Cerrando...</>:<><CheckCircle size={14}/> Cerrar Período {mes}</>}
            </BBg>
          </div>
        </BCard>
        <BCard title="Historial de Cierres">
          {periodos.length===0?<BEmptyState icon={CalendarDays} title="Sin cierres" desc="No se han cerrado períodos"/>:
            <table className="w-full"><thead><tr><BTh>Período</BTh><BTh>Fecha de Cierre</BTh><BTh right>Asientos Bloqueados</BTh><BTh>Estado</BTh></tr></thead>
              <tbody>{periodos.map(p=><tr key={p.id} className="hover:bg-slate-50"><BTd mono className="font-black text-blue-600">{p.mes}</BTd><BTd>{bancoDd(p.fechaCierre)}</BTd><BTd right mono className="font-black">{p.asientosBloqueados}</BTd><BTd><BBadge v="red"><Lock size={10}/> Cerrado</BBadge></BTd></tr>)}</tbody>
            </table>}
        </BCard>
      </div>
    );
  };

  const navGroups = [
    { group:'Estados Financieros', color:'#10b981', items:[
      {id:'comprobacion', label:'Balance de Comprobación', icon:Scale},
      {id:'balance',      label:'Balance General',         icon:Landmark},
      {id:'resultados',   label:'Estado de Resultados',    icon:TrendingUp},
      {id:'mayor',        label:'Mayor Analítico',          icon:BookMarked},
    ]},
    { group:'Control',  color:'#ef4444', items:[
      {id:'cierre', label:'Cierre de Período', icon:Lock},
    ]},
  ];
  const views={comprobacion:<ComprobacionView/>,balance:<BalanceGeneralView/>,resultados:<EstadoResultadosView/>,mayor:<MayorAnaliticoView/>,cierre:<CierreContableView/>};
  const curNav=navGroups.flatMap(g=>g.items).find(n=>n.id===sec);

  return (
    <BSidebarLayout brand="Supply G&B" brandSub="Estados Financieros" navGroups={navGroups} activeId={sec} onNav={setSec} onBack={onBack} accentColor="#10b981"
      headerContent={<>
        <div><h1 className="font-black text-slate-800 text-sm uppercase tracking-wide">{curNav?.label}</h1><p className="text-[9px] text-slate-400 uppercase tracking-widest">Contabilidad <ChevronRight size={8} className="inline"/> Reportes</p></div>
        <div className="flex gap-2">
        </div>
      </>}>
      {views[sec]||<ComprobacionView/>}
    </BSidebarLayout>
  );
}

// ============================================================================
// ACTIVOS FIJOS
// ============================================================================
function ActivosFijosApp({ fbUser, onBack }) {
  const [sec, setSec]     = useState('dashboard');
  const [activos, setActivos] = useState([]);
  const [bajas,   setBajas]   = useState([]);

  useEffect(()=>{
    if(!fbUser) return;
    const subs=[
      onSnapshot(getColRef('activos_fijos'), s=>setActivos(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('activos_bajas'),orderBy('fecha','desc')), s=>setBajas(s.docs.map(d=>d.data()))),
    ];
    return()=>subs.forEach(u=>u());
  },[fbUser]);

  const mesesDesde = (f) => {
    if(!f) return 0;
    const [y,m]=f.split('-').map(Number);
    const now=new Date(); return Math.max(0,(now.getFullYear()-y)*12+(now.getMonth()+1-m));
  };

  // Calcular depreciación acumulada
  const calcDeprec = (a) => {
    const meses = mesesDesde(a.fechaAdquisicion);
    const vidaMeses = Number(a.vidaUtilAnios||0)*12;
    if(vidaMeses===0) return 0;
    const depMensual = Number(a.valorCosto||0) / vidaMeses;
    return Math.min(Number(a.valorCosto||0) - Number(a.valorResidual||0), depMensual * meses);
  };

  const DashboardView = () => {
    const totalCosto   = activos.reduce((a,x)=>a+Number(x.valorCosto||0),0);
    const totalDeprec  = activos.reduce((a,x)=>a+calcDeprec(x),0);
    const totalNeto    = totalCosto - totalDeprec;
    const depMensual   = activos.reduce((a,x)=>{const v=Number(x.vidaUtilAnios||0)*12;return a+(v>0?(Number(x.valorCosto||0)-Number(x.valorResidual||0))/v:0);},0);

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BKPI label="Total Activos" value={activos.length} accent="blue" Icon={Layers}/>
          <BKPI label="Valor en Libros" value={`$${bancoFmt(totalNeto)}`} accent="green" Icon={DollarSign} sub={`Costo: $${bancoFmt(totalCosto)}`}/>
          <BKPI label="Depr. Acumulada" value={`$${bancoFmt(totalDeprec)}`} accent="red" Icon={TrendingDown}/>
          <BKPI label="Depr. Mensual" value={`$${bancoFmt(depMensual)}`} accent="gold" Icon={CalendarDays}/>
        </div>
        <BCard title="Listado de Activos Fijos">
          {activos.length===0?<BEmptyState icon={Layers} title="Sin activos" desc="Registre el mobiliario, maquinaria y vehículos"/>:
            <table className="w-full text-[11px]"><thead><tr><BTh>Código</BTh><BTh>Descripción</BTh><BTh>Categoría</BTh><BTh>Fecha Adq.</BTh><BTh right>Costo $</BTh><BTh right>Depr. Acum.</BTh><BTh right>Valor Neto</BTh><BTh>Estado</BTh></tr></thead>
              <tbody>{activos.map(a=>{const dep=calcDeprec(a);const neto=Number(a.valorCosto||0)-dep;return(
                <tr key={a.id} className="hover:bg-slate-50">
                  <BTd mono className="font-black text-blue-600">{a.codigo}</BTd>
                  <BTd className="font-semibold max-w-[160px] truncate">{a.descripcion}</BTd>
                  <BTd className="text-[10px] uppercase text-slate-500">{a.categoria}</BTd>
                  <BTd>{bancoDd(a.fechaAdquisicion)}</BTd>
                  <BTd right mono className="font-black">{'$'+bancoFmt(a.valorCosto)}</BTd>
                  <BTd right mono className="text-red-500">{'$'+bancoFmt(dep)}</BTd>
                  <BTd right mono className="font-black text-emerald-600">{'$'+bancoFmt(neto)}</BTd>
                  <BTd><BBadge v={neto>0?'green':'gray'}>{neto>0?'Activo':'Depreciado'}</BBadge></BTd>
                </tr>);})}</tbody>
            </table>}
        </BCard>
      </div>
    );
  };

  const RegistroView = () => {
    const [modal,setModal]=useState(false);const [busy,setBusy]=useState(false);
    const [form,setForm]=useState({codigo:'',descripcion:'',categoria:'Mobiliario',fechaAdquisicion:getTodayDate(),valorCosto:'',valorResidual:'0',vidaUtilAnios:'5',cuentaContable:''});
    const save=async()=>{
      if(!form.descripcion||!form.valorCosto)return alert('Descripción y valor requeridos');
      setBusy(true);try{const id=bancoGid();await setDoc(getDocRef('activos_fijos',id),{...form,id,valorCosto:Number(form.valorCosto),valorResidual:Number(form.valorResidual),vidaUtilAnios:Number(form.vidaUtilAnios),ts:serverTimestamp()});setModal(false);setForm({codigo:'',descripcion:'',categoria:'Mobiliario',fechaAdquisicion:getTodayDate(),valorCosto:'',valorResidual:'0',vidaUtilAnios:'5',cuentaContable:''});}finally{setBusy(false);}
    };
    return(
      <div>
        <BCard title="Registro de Activos Fijos" subtitle="Mobiliario, Maquinaria, Vehículos, Equipos" action={<BBg onClick={()=>setModal(true)} sm><Plus size={12}/> Nuevo</BBg>}>
          <table className="w-full text-[11px]"><thead><tr><BTh>Código</BTh><BTh>Descripción</BTh><BTh>Categoría</BTh><BTh>Adquisición</BTh><BTh right>Costo</BTh><BTh right>Residual</BTh><BTh right>Vida Útil</BTh><BTh right>Dep/Mes</BTh><BTh></BTh></tr></thead>
            <tbody>
              {activos.length===0&&<tr><td colSpan={9}><BEmptyState icon={Layers} title="Sin activos" desc="Registre el primer activo fijo"/></td></tr>}
              {activos.map(a=>{const dm=(Number(a.valorCosto)-Number(a.valorResidual||0))/(Number(a.vidaUtilAnios||1)*12);return(
                <tr key={a.id} className="hover:bg-slate-50">
                  <BTd mono className="font-black text-slate-700">{a.codigo||'—'}</BTd>
                  <BTd className="font-semibold max-w-[160px] truncate">{a.descripcion}</BTd>
                  <BTd className="text-[10px] uppercase text-slate-500">{a.categoria}</BTd>
                  <BTd>{bancoDd(a.fechaAdquisicion)}</BTd>
                  <BTd right mono>{'$'+bancoFmt(a.valorCosto)}</BTd>
                  <BTd right mono className="text-slate-400">{'$'+bancoFmt(a.valorResidual||0)}</BTd>
                  <BTd right><span className="font-semibold">{a.vidaUtilAnios} años</span></BTd>
                  <BTd right mono className="font-black text-amber-600">{'$'+bancoFmt(dm)}</BTd>
                  <BTd><button onClick={()=>deleteDoc(getDocRef('activos_fijos',a.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={12}/></button></BTd>
                </tr>);})}
            </tbody>
          </table>
        </BCard>
        <BModal open={modal} onClose={()=>setModal(false)} title="Registrar Activo Fijo" wide footer={<><BBo onClick={()=>setModal(false)}>Cancelar</BBo><BBg onClick={save} disabled={busy}>{busy?'Guardando...':'Registrar'}</BBg></>}>
          <div className="grid grid-cols-2 gap-4">
            <BFG label="Código / Serial"><input className={inp} value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value.toUpperCase()})} placeholder="AF-001"/></BFG>
            <BFG label="Descripción" full><input className={inp} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value.toUpperCase()})} placeholder="COMPUTADORA DELL OPTIPLEX 7000"/></BFG>
            <BFG label="Categoría"><select className={sel} value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}><option>Mobiliario</option><option>Maquinaria</option><option>Vehículos</option><option>Equipos de Computación</option><option>Equipos de Oficina</option><option>Inmuebles</option><option>Otros</option></select></BFG>
            <BFG label="Fecha de Adquisición"><input type="date" className={inp} value={form.fechaAdquisicion} onChange={e=>setForm({...form,fechaAdquisicion:e.target.value})}/></BFG>
            <BFG label="Valor de Costo ($)"><input type="number" step="0.01" className={inp} value={form.valorCosto} onChange={e=>setForm({...form,valorCosto:e.target.value})}/></BFG>
            <BFG label="Valor Residual ($)"><input type="number" step="0.01" className={inp} value={form.valorResidual} onChange={e=>setForm({...form,valorResidual:e.target.value})}/></BFG>
            <BFG label="Vida Útil (años)"><input type="number" min="1" className={inp} value={form.vidaUtilAnios} onChange={e=>setForm({...form,vidaUtilAnios:e.target.value})}/></BFG>
            <BFG label="Cuenta Contable (PUC)"><input className={inp} value={form.cuentaContable} onChange={e=>setForm({...form,cuentaContable:e.target.value})} placeholder="1.2.01.01.001"/></BFG>
          </div>
        </BModal>
      </div>
    );
  };

  const navGroups=[
    {group:'Activos',color:'#8b5cf6',items:[{id:'dashboard',label:'Panel General',icon:LayoutDashboard},{id:'registro',label:'Registro de Activos',icon:Layers}]},
  ];
  const views={dashboard:<DashboardView/>,registro:<RegistroView/>};
  const curNav=navGroups.flatMap(g=>g.items).find(n=>n.id===sec);
  return(
    <BSidebarLayout brand="Supply G&B" brandSub="Activos Fijos" navGroups={navGroups} activeId={sec} onNav={setSec} onBack={onBack} accentColor="#8b5cf6"
      headerContent={<><div><h1 className="font-black text-slate-800 text-sm uppercase">{curNav?.label}</h1><p className="text-[9px] text-slate-400 uppercase tracking-widest">Activos Fijos · Depreciación</p></div><BBg onClick={()=>setSec('registro')} sm><Plus size={12}/> Nuevo Activo</BBg></>}>
      {views[sec]||<DashboardView/>}
    </BSidebarLayout>
  );
}

// ============================================================================
// MÓDULO FISCAL — IVA, IGTF, RETENCIONES, LIBROS LEGALES
// ============================================================================
function FiscalApp({ fbUser, onBack }) {
  const [sec, setSec] = useState('dashboard');
  const [facturas,  setFacturas]  = useState([]);
  const [tasas,     setTasas]     = useState([]);

  useEffect(()=>{
    if(!fbUser) return;
    const subs=[
      onSnapshot(query(getColRef('facturacion_facturas'),orderBy('fechaEmision','desc')), s=>setFacturas(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('banco_tasas'),orderBy('fecha','desc')), s=>setTasas(s.docs.map(d=>d.data()))),
    ];
    return()=>subs.forEach(u=>u());
  },[fbUser]);

  const tasaActiva = tasas[0]?.tasaRef || 39.50;

  const DashboardView = () => {
    const ivaDebito  = facturas.filter(f=>f.fechaEmision?.startsWith(bancoMesActual())).reduce((a,f)=>a+Number(f.iva||0),0);
    const ivaCredito = 0; // from purchases (extend later)
    const igtfBase   = facturas.filter(f=>f.igtf>0&&f.fechaEmision?.startsWith(bancoMesActual())).reduce((a,f)=>a+Number(f.igtf||0),0);
    return(
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BKPI label="IVA Débito (Ventas)" value={`$${bancoFmt(ivaDebito)}`} accent="red" Icon={Receipt} sub={bancoMesActual()}/>
          <BKPI label="IVA Crédito (Compras)" value={`$${bancoFmt(ivaCredito)}`} accent="green" Icon={Receipt}/>
          <BKPI label="IVA a Pagar" value={`$${bancoFmt(Math.max(0,ivaDebito-ivaCredito))}`} accent={ivaDebito>ivaCredito?'red':'green'} Icon={DollarSign}/>
          <BKPI label="IGTF (3%)" value={`$${bancoFmt(igtfBase)}`} accent="gold" Icon={Coins}/>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <BCard title="Configuración de Alícuotas IVA">
            <div className="space-y-3">
              {[{tipo:'General',tasa:'16%',color:'#ef4444'},{tipo:'Reducida',tasa:'8%',color:'#f59e0b'},{tipo:'Exenta',tasa:'0%',color:'#10b981'},{tipo:'IGTF Divisas',tasa:'3%',color:'#8b5cf6'}].map(({tipo,tasa,color})=>(
                <div key={tipo} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{background:color}}/><p className="font-semibold text-sm text-slate-700">{tipo}</p></div>
                  <span className="font-mono font-black text-lg" style={{color}}>{tasa}</span>
                </div>
              ))}
            </div>
          </BCard>
          <BCard title="Resumen del Mes">
            <div className="space-y-3 mt-2">
              {[{l:'Total Ventas del Mes',v:`$${bancoFmt(facturas.filter(f=>f.fechaEmision?.startsWith(bancoMesActual())).reduce((a,f)=>a+Number(f.total||0),0))}`},{l:'IVA Generado (Débito Fiscal)',v:`$${bancoFmt(ivaDebito)}`},{l:'Base Imponible',v:`$${bancoFmt(ivaDebito/0.16)}`}].map(({l,v})=>(
                <div key={l} className="flex justify-between py-2 border-b border-slate-50"><span className="text-xs text-slate-500">{l}</span><span className="font-mono font-black text-sm text-slate-900">{v}</span></div>
              ))}
            </div>
          </BCard>
        </div>
      </div>
    );
  };

  const LibroVentasView = () => {
    const [mes, setMes] = useState(bancoMesActual());
    const filtradas = facturas.filter(f=>f.fechaEmision?.startsWith(mes));
    const exportarTxt=()=>{
      const lines=['Nro\tFecha\tRIF\tCliente\tNro Factura\tBase Imponible\tIVA\tTotal'];
      filtradas.forEach((f,i)=>{lines.push([i+1,bancoDd(f.fechaEmision),f.clienteRif||'',f.clienteNombre||'',f.numero||'',bancoFmt(f.subtotal||0),bancoFmt(f.iva||0),bancoFmt(f.total||0)].join('\t'));});
      const blob=new Blob([lines.join('\r\n')],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`libro_ventas_${mes}.txt`;a.click();URL.revokeObjectURL(url);
    };
    return(
      <BCard title="Libro de Ventas" subtitle={`${filtradas.length} facturas — ${mes}`}
        action={<div className="flex gap-2"><input type="month" className={inp} style={{width:'140px'}} value={mes} onChange={e=>setMes(e.target.value)}/><button onClick={exportarTxt} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700"><Download size={12}/> TXT</button></div>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr><BTh>#</BTh><BTh>Fecha</BTh><BTh>RIF</BTh><BTh>Cliente</BTh><BTh>N° Factura</BTh><BTh right>Base Imp.</BTh><BTh right>IVA 16%</BTh><BTh right>Total</BTh></tr></thead>
            <tbody>
              {filtradas.length===0&&<tr><td colSpan={8}><BEmptyState icon={Receipt} title="Sin facturas" desc="No hay facturas para el período seleccionado"/></td></tr>}
              {filtradas.map((f,i)=><tr key={f.id} className="hover:bg-slate-50">
                <BTd mono>{i+1}</BTd><BTd>{bancoDd(f.fechaEmision)}</BTd>
                <BTd mono className="text-slate-600">{f.clienteRif||'—'}</BTd>
                <BTd className="max-w-[140px] truncate uppercase font-medium">{f.clienteNombre}</BTd>
                <BTd mono className="font-black text-blue-600">{f.numero}</BTd>
                <BTd right mono>{'$'+bancoFmt(f.subtotal||0)}</BTd>
                <BTd right mono className="text-red-500">{'$'+bancoFmt(f.iva||0)}</BTd>
                <BTd right mono className="font-black">{'$'+bancoFmt(f.total||0)}</BTd>
              </tr>)}
            </tbody>
            {filtradas.length>0&&<tfoot><tr style={{background:'#0f172a'}}>
              <td colSpan={5} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">TOTALES — {filtradas.length} facturas</td>
              <td className="px-4 py-3 text-right font-mono font-black text-white">{'$'+bancoFmt(filtradas.reduce((a,f)=>a+Number(f.subtotal||0),0))}</td>
              <td className="px-4 py-3 text-right font-mono font-black text-red-400">{'$'+bancoFmt(filtradas.reduce((a,f)=>a+Number(f.iva||0),0))}</td>
              <td className="px-4 py-3 text-right font-mono font-black text-emerald-400">{'$'+bancoFmt(filtradas.reduce((a,f)=>a+Number(f.total||0),0))}</td>
            </tr></tfoot>}
          </table>
        </div>
      </BCard>
    );
  };

  const navGroups=[
    {group:'Fiscal',color:'#ef4444',items:[
      {id:'dashboard', label:'Panel Fiscal',     icon:LayoutDashboard},
      {id:'libroventas',label:'Libro de Ventas', icon:Receipt},
    ]},
  ];
  const views={dashboard:<DashboardView/>,libroventas:<LibroVentasView/>};
  const curNav=navGroups.flatMap(g=>g.items).find(n=>n.id===sec);
  return(
    <BSidebarLayout brand="Supply G&B" brandSub="Fiscal & Tributario" navGroups={navGroups} activeId={sec} onNav={setSec} onBack={onBack} accentColor="#ef4444"
      headerContent={<><div><h1 className="font-black text-slate-800 text-sm uppercase">{curNav?.label}</h1><p className="text-[9px] text-slate-400 uppercase tracking-widest">IVA · IGTF · Retenciones</p></div></>}>
      {views[sec]||<DashboardView/>}
    </BSidebarLayout>
  );
}

// ============================================================================
// MÓDULO COMPRAS & PROVEEDORES
// ============================================================================



export default BancoApp;

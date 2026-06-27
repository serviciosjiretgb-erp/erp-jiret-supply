import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, ClipboardList, Truck, FileText,
  CreditCard, BarChart3, Plus, X, Search, ChevronRight,
  CheckCircle, Clock, DollarSign, Download, Trash2,
  Package, ShoppingCart, Users, ArrowLeft, Blocks,
  FileSpreadsheet, BookText, Briefcase, Save, Settings,
  AlertTriangle, TrendingDown, TrendingUp, Receipt,
  Filter, ChevronDown, Eye, Printer, RefreshCw,
  Tag, List, Send, Mail, Edit, Check, Ban,
  ArrowRight, BookOpen, Coins, BadgeDollarSign,
  Factory, Store, Star, FileCheck, Layers
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, writeBatch, getDocs, where
} from 'firebase/firestore';

// ── Firebase (mismo proyecto que el ERP principal) ──────────────────
const _procuraCfg = {
  apiKey: "AIzaSyBri2uZAaxsH4S0OpqhYvXB4wfCqo4g3sk",
  authDomain: "erp-gyb-supply.firebaseapp.com",
  projectId: "erp-gyb-supply",
  storageBucket: "erp-gyb-supply.firebasestorage.app",
  messagingSenderId: "201939139821",
  appId: "1:201939139821:web:95e5f589e546d7d557e0e4",
};
const _procuraApp = getApps().find(a=>a.name==='erp-gyb-procura') || initializeApp(_procuraCfg,'erp-gyb-procura');
const _procuraDB  = getFirestore(_procuraApp);
const getColRef = (n) => collection(_procuraDB, n);
const getDocRef = (n, id) => doc(_procuraDB, n, String(id));

// ── Utilidades ────────────────────────────────────────────────────────
const getTodayDate = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const pFmt = (n) => new Intl.NumberFormat('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
const pNum = (v) => parseFloat(String(v||0).replace(/[^0-9.-]/g,''))||0;
const pDate = (s) => { if(!s)return'—'; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; };
const pId = () => Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
const getMesActual = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

// ── Colores ───────────────────────────────────────────────────────────
const ORANGE = '#f97316';
const DARK   = '#0b1120';
const CARD   = '#111827';

// ── CSS para PDF / Impresión ──────────────────────────────────────────
const PDF_CSS = `
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
  .badge-pend{background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900}
  .badge-pag{background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900}
  .badge-apr{background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900}
  .total-row td{font-weight:900;background:#000!important;color:#f97316;border-color:#333}
  @media print{@page{margin:1cm}}
`;
const pdfOpen = (titulo, subtitulo='') => `<html><head><meta charset="utf-8"><title>${titulo}</title><style>${PDF_CSS}</style></head><body>
  <div class="lh-header"><div style="font-size:20px;font-weight:900;">Supply G&B</div>
  <div style="text-align:right;font-size:9px;color:#9ca3af"><strong style="color:#f97316;font-size:11px;display:block">SERVICIOS JIRET G&B, C.A.</strong>RIF: J-412309374</div></div>
  <div class="lh-title"><h2>${titulo}</h2><p>${subtitulo||'Generado: '+new Date().toLocaleDateString('es-VE')}</p></div>
  <div class="lh-body">`;
const pdfClose = (extra='') => `</div><div class="lh-footer"><span>SERVICIOS JIRET G&B, C.A. — RIF: J-412309374</span><span>${extra}</span><span>Supply ERP · Procura</span></div>
  <script>window.onload=()=>{window.print();}<\/script></body></html>`;
const pdfPrint = (html) => { const w=window.open('','_blank'); if(w){w.document.write(html);w.document.close();} };

// ── Componentes base ─────────────────────────────────────────────────
const PBadge = ({children,v='green'}) => {
  const s={green:'bg-emerald-50 text-emerald-700 border border-emerald-200',red:'bg-red-50 text-red-600 border border-red-200',gold:'bg-amber-50 text-amber-700 border border-amber-200',blue:'bg-blue-50 text-blue-700 border border-blue-200',gray:'bg-slate-100 text-slate-500 border border-slate-200',orange:'bg-orange-50 text-orange-700 border border-orange-200',purple:'bg-purple-50 text-purple-700 border border-purple-200'};
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${s[v]||s.gray}`}>{children}</span>;
};

const PKPI = ({label,value,sub,accent='green',Icon}) => {
  const borders={green:'border-t-emerald-500',gold:'border-t-orange-500',blue:'border-t-blue-500',red:'border-t-red-500',purple:'border-t-purple-500',orange:'border-t-orange-400'};
  const icons={green:'text-emerald-500 bg-emerald-50',gold:'text-orange-500 bg-orange-50',blue:'text-blue-500 bg-blue-50',red:'text-red-500 bg-red-50',purple:'text-purple-500 bg-purple-50',orange:'text-orange-500 bg-orange-50'};
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 border-t-4 ${borders[accent]} p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        {Icon&&<div className={`w-8 h-8 rounded-xl flex items-center justify-center ${icons[accent]}`}><Icon size={14}/></div>}
      </div>
      <p className="font-black text-2xl text-slate-900 font-mono leading-none">{value}</p>
      {sub&&<p className="text-[10px] text-slate-400 mt-2 font-medium">{sub}</p>}
    </div>
  );
};

const PCard = ({title,subtitle,action,children,noPad}) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
    {(title||action)&&(
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>{title&&<h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">{title}</h3>}{subtitle&&<p className="text-[10px] text-slate-400 mt-0.5 font-medium">{subtitle}</p>}</div>
        {action}
      </div>
    )}
    <div className={noPad?'':'p-6'}>{children}</div>
  </div>
);

const PModal = ({open,onClose,title,children,footer,wide,xlwide}) => {
  if(!open)return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{background:'rgba(15,23,42,.88)'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`bg-white w-full ${xlwide?'max-w-[92vw] max-h-[92vh]':wide?'max-w-3xl max-h-[90vh]':'max-w-lg max-h-[90vh]'} rounded-2xl flex flex-col shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',borderBottom:'3px solid #f97316'}}>
          <h2 className="font-black text-white uppercase tracking-widest text-sm">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"><X size={16} className="text-white"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-7">{children}</div>
        {footer&&<div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">{footer}</div>}
      </div>
    </div>
  );
};

const PFG = ({label,children,full}) => <div className={full?'col-span-2':''}><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>{children}</div>;
const inp = "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-orange-500 transition-colors bg-white text-slate-900 placeholder:text-slate-300";
const sel = "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-orange-500 transition-colors bg-white text-slate-900";

const PBp = ({onClick,children,sm,disabled}) => <button disabled={disabled} onClick={onClick} className={`bg-slate-900 text-white font-black uppercase tracking-widest ${sm?'text-[9px] px-3 py-1.5':'text-[10px] px-5 py-2.5'} rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}>{children}</button>;
const PBg = ({onClick,children,sm,disabled}) => <button disabled={disabled} onClick={onClick} className={`bg-orange-500 text-white font-black uppercase tracking-widest ${sm?'text-[9px] px-3 py-1.5':'text-[10px] px-5 py-2.5'} rounded-xl hover:bg-orange-600 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50`}>{children}</button>;
const PBo = ({onClick,children,sm}) => <button onClick={onClick} className={`border-2 border-slate-200 bg-white text-slate-600 font-black uppercase tracking-widest ${sm?'text-[9px] px-3 py-1.5':'text-[10px] px-5 py-2.5'} rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2`}>{children}</button>;
const PBd = ({onClick,children,sm}) => <button onClick={onClick} className={`border-2 border-red-200 bg-white text-red-500 font-black uppercase tracking-widest ${sm?'text-[9px] px-3 py-1.5':'text-[10px] px-5 py-2.5'} rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2`}>{children}</button>;

const PTh = ({children,right}) => <th className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-100 bg-slate-50 ${right?'text-right':'text-left'} whitespace-nowrap`}>{children}</th>;
const PTd = ({children,right,mono,className=''}) => <td className={`px-4 py-3 text-xs border-b border-slate-50 ${right?'text-right':''} ${mono?'font-mono':'font-medium'} text-slate-700 ${className}`}>{children}</td>;

const PEmpty = ({icon:Icon,title,desc}) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4"><Icon size={28} className="text-slate-300"/></div>
    <p className="font-black text-slate-700 text-sm uppercase tracking-wide mb-1">{title}</p>
    <p className="text-[11px] text-slate-400 font-medium max-w-xs">{desc}</p>
  </div>
);

// ── Status helpers ────────────────────────────────────────────────────
const statusOC = (s) => {
  const map={BORRADOR:{label:'Borrador',v:'gray'},APROBADA:{label:'Aprobada',v:'blue'},ENVIADA:{label:'Enviada',v:'purple'},RECIBIDA:{label:'Recibida',v:'green'},CERRADA:{label:'Cerrada',v:'gold'},ANULADA:{label:'Anulada',v:'red'}};
  return map[s]||{label:s,v:'gray'};
};

const statusCxP = (s) => {
  const map={PENDIENTE:{label:'Pendiente',v:'gold'},PARCIAL:{label:'Pago parcial',v:'blue'},PAGADA:{label:'Pagada',v:'green'},VENCIDA:{label:'Vencida',v:'red'},ANULADA:{label:'Anulada',v:'gray'}};
  return map[s]||{label:s,v:'gray'};
};

// ── Sidebar Layout ────────────────────────────────────────────────────
const PSidebarLayout = ({navGroups,activeId,onNav,children,headerContent,onBack}) => {
  const activeGroup = navGroups.find(g=>g.items.find(i=>i.id===activeId));
  return (
    <div className="flex h-screen overflow-hidden w-full">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col h-screen flex-shrink-0" style={{background:DARK}}>
        {/* Brand */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{background:`linear-gradient(135deg,${ORANGE},${ORANGE}99)`}}>
              <ShoppingCart size={16} className="text-white"/>
            </div>
            <div>
              <p className="font-black text-white text-sm leading-none tracking-wide">Procura</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-[2px] font-bold mt-0.5">Supply G&B</p>
            </div>
          </div>
          {onBack&&(
            <button onClick={onBack} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all mt-1">
              <ArrowLeft size={12}/> Volver al ERP
            </button>
          )}
        </div>
        <div className="w-full h-px bg-white/5 mb-3"/>
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
          {navGroups.map(({group,items,color:gc})=>(
            <div key={group}>
              <p className="text-[8px] font-black uppercase tracking-[2px] px-3 mb-2" style={{color:gc||'#64748b'}}>{group}</p>
              {items.map(item=>{
                const active=activeId===item.id;
                return (
                  <button key={item.id} onClick={()=>onNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 ${active?'text-white':'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    style={active?{background:`linear-gradient(135deg,${gc||ORANGE}22,${gc||ORANGE}11)`,border:`1px solid ${gc||ORANGE}44`}:{}}>
                    <item.icon size={15} style={active?{color:gc||ORANGE}:{}}/>
                    <span className={`text-[11px] font-black uppercase tracking-wide ${active?'text-white':'text-slate-400'}`}>{item.label}</span>
                    {item.badge&&<span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{background:`${gc||ORANGE}22`,color:gc||ORANGE}}>{item.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        {/* Footer */}
        <div className="flex-shrink-0 px-4 pb-4">
          <div className="rounded-xl p-3" style={{background:'#1e293b'}}>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Servicios Jiret G&B</p>
            <p className="text-[8px] text-slate-600">RIF: J-412309374</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shadow-sm">
          <div>
            <h1 className="font-black text-slate-800 text-sm uppercase tracking-wide">
              {navGroups.flatMap(g=>g.items).find(i=>i.id===activeId)?.label||'Panel'}
            </h1>
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">
              Procura <ChevronRight size={8} className="inline"/> {activeGroup?.group||''}
            </p>
          </div>
          <div className="flex items-center gap-3">{headerContent}</div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// MÓDULO 1: DASHBOARD
// ══════════════════════════════════════════════════════════════════════
const DashboardView = ({proveedores,ordenesCompra,facturasCompra,pagosCxP}) => {
  const totalCxP = facturasCompra.filter(f=>f.status!=='ANULADA').reduce((s,f)=>s+pNum(f.saldoPendiente||f.total||0),0);
  const ocAbiertas = ordenesCompra.filter(o=>['APROBADA','ENVIADA'].includes(o.status)).length;
  const facMes = facturasCompra.filter(f=>(f.fecha||'').startsWith(getMesActual())).length;
  const pagMes = pagosCxP.filter(p=>(p.fecha||'').startsWith(getMesActual())).reduce((s,p)=>s+pNum(p.monto||0),0);

  const ultOC = [...ordenesCompra].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).slice(0,5);
  const urgentes = facturasCompra.filter(f=>f.status==='PENDIENTE'&&f.fechaVencimiento&&f.fechaVencimiento<getTodayDate()).slice(0,5);

  return (
    <div className="space-y-6">
      {/* Hero KPI */}
      <div className="rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between" style={{background:CARD,color:'white'}}>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Cuentas por Pagar</p>
          <h2 className="text-4xl font-black mt-1 tracking-tight" style={{color:ORANGE}}>${pFmt(totalCxP)}</h2>
        </div>
        <div className="mt-4 flex gap-6">
          <div><p className="text-[10px] text-slate-400">OC Abiertas</p><p className="font-black text-white text-lg">{ocAbiertas}</p></div>
          <div><p className="text-[10px] text-slate-400">Facturas este mes</p><p className="font-black text-white text-lg">{facMes}</p></div>
          <div><p className="text-[10px] text-slate-400">Pagado este mes</p><p className="font-black text-white text-lg">${pFmt(pagMes)}</p></div>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10"><ShoppingCart size={80}/></div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <PKPI label="Proveedores activos" value={proveedores.filter(p=>p.activo!==false).length} accent="blue" Icon={Building2}/>
        <PKPI label="OC pendientes aprob." value={ordenesCompra.filter(o=>o.status==='BORRADOR').length} accent="gold" Icon={ClipboardList}/>
        <PKPI label="CxP vencidas" value={facturasCompra.filter(f=>f.status==='PENDIENTE'&&f.fechaVencimiento<getTodayDate()).length} accent="red" Icon={AlertTriangle}/>
        <PKPI label="Facturas mes" value={facMes} accent="orange" Icon={FileText}/>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Últimas OC */}
        <PCard title="Últimas órdenes de compra" subtitle={`${ordenesCompra.length} órdenes en total`}>
          {ultOC.length===0?<PEmpty icon={ClipboardList} title="Sin órdenes" desc="Crea tu primera orden de compra"/>:(
            <div className="space-y-2">
              {ultOC.map(oc=>{
                const st=statusOC(oc.status);
                return (
                  <div key={oc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-black text-xs text-slate-800">{oc.nroOC||oc.id}</p>
                      <p className="text-[10px] text-slate-400">{oc.proveedor||'—'} · {pDate(oc.fecha)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xs text-slate-800">${pFmt(oc.total||0)}</p>
                      <PBadge v={st.v}>{st.label}</PBadge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PCard>

        {/* CxP vencidas */}
        <PCard title="⚠️ Facturas vencidas" subtitle="Requieren atención inmediata">
          {urgentes.length===0?<PEmpty icon={CheckCircle} title="Al día" desc="No hay facturas vencidas"/>:(
            <div className="space-y-2">
              {urgentes.map(f=>(
                <div key={f.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="font-black text-xs text-red-800">{f.nroFactura||f.id}</p>
                    <p className="text-[10px] text-red-400">{f.proveedor||'—'} · Vence: {pDate(f.fechaVencimiento)}</p>
                  </div>
                  <p className="font-black text-sm text-red-600">${pFmt(f.saldoPendiente||f.total||0)}</p>
                </div>
              ))}
            </div>
          )}
        </PCard>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// MÓDULO 2: PROVEEDORES
// ══════════════════════════════════════════════════════════════════════
const ProveedoresView = ({proveedores,facturasCompra,pagosCxP,dialog,setDialog}) => {
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});

  const filtrados = proveedores.filter(p=>
    (p.nombre||'').toLowerCase().includes(search.toLowerCase())||
    (p.rif||'').toLowerCase().includes(search.toLowerCase())
  );

  const initForm = () => ({
    nombre:'',rif:'',email:'',telefono:'',direccion:'',
    contacto:'',categoria:'INSUMOS',moneda:'USD',
    condPago:'30 días',activo:true,observaciones:''
  });

  const guardar = async () => {
    if(!form.nombre||!form.rif){setDialog({title:'Aviso',text:'Nombre y RIF son obligatorios.',type:'alert'});return;}
    try{
      const id=form.id||`PROV-${pId()}`;
      await setDoc(getDocRef('procura_proveedores',id),{...form,id,updatedAt:Date.now()});
      setModal(null);
      setDialog({title:'✅ Guardado',text:'Proveedor guardado correctamente.',type:'alert'});
    }catch(e){setDialog({title:'Error',text:e.message,type:'alert'});}
  };

  const eliminar = (p) => setDialog({title:'¿Eliminar proveedor?',text:`Se eliminará "${p.nombre}". Esta acción no se puede deshacer.`,type:'confirm',onConfirm:async()=>{
    try{await deleteDoc(getDocRef('procura_proveedores',p.id));setDialog({title:'Eliminado',text:'Proveedor eliminado.',type:'alert'});}
    catch(e){setDialog({title:'Error',text:e.message,type:'alert'});}
  }});

  const exportPDF = () => {
    let html=pdfOpen('DIRECTORIO DE PROVEEDORES',`Total: ${filtrados.length} proveedores`);
    html+=`<table><thead><tr><th>Nombre / Razón Social</th><th>RIF</th><th>Categoría</th><th>Contacto</th><th>Teléfono</th><th>Moneda</th><th>Cond. Pago</th><th>Estado</th></tr></thead><tbody>`;
    filtrados.forEach(p=>{
      html+=`<tr><td><strong>${p.nombre||'—'}</strong></td><td>${p.rif||'—'}</td><td>${p.categoria||'—'}</td><td>${p.contacto||'—'}</td><td>${p.telefono||'—'}</td><td>${p.moneda||'USD'}</td><td>${p.condPago||'—'}</td><td>${p.activo!==false?'<span class="badge-apr">Activo</span>':'<span class="badge-pend">Inactivo</span>'}</td></tr>`;
    });
    html+=`</tbody></table>`;
    pdfPrint(html+pdfClose());
  };

  const exportXLS = () => {
    const rows=[['Nombre','RIF','Categoría','Contacto','Teléfono','Email','Moneda','Cond.Pago','Estado'],...filtrados.map(p=>[p.nombre,p.rif,p.categoria,p.contacto,p.telefono,p.email,p.moneda,p.condPago,p.activo!==false?'Activo':'Inactivo'])];
    let csv=rows.map(r=>r.map(c=>`"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`proveedores_${getTodayDate()}.csv`;a.click();
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar proveedor o RIF..." className={`${inp} pl-9`}/>
        </div>
        <PBo onClick={exportPDF} sm><Printer size={13}/> PDF</PBo>
        <PBo onClick={exportXLS} sm><FileSpreadsheet size={13}/> Excel</PBo>
        <PBg onClick={()=>{setForm(initForm());setModal('form');}}><Plus size={14}/> Nuevo proveedor</PBg>
      </div>

      {/* Tabla */}
      <PCard noPad>
        <table className="w-full">
          <thead><tr>
            <PTh>Proveedor</PTh><PTh>RIF</PTh><PTh>Categoría</PTh><PTh>Contacto</PTh><PTh>Moneda</PTh><PTh>Cond. Pago</PTh><PTh>Estado</PTh><PTh>Acciones</PTh>
          </tr></thead>
          <tbody>
            {filtrados.length===0?<tr><td colSpan={8} className="py-12"><PEmpty icon={Building2} title="Sin proveedores" desc="Registra tu primer proveedor"/></td></tr>:
            filtrados.map(p=>(
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <PTd><div className="font-black text-slate-800 text-xs">{p.nombre||'—'}</div><div className="text-[10px] text-slate-400">{p.email||'—'}</div></PTd>
                <PTd mono>{p.rif||'—'}</PTd>
                <PTd><PBadge v="blue">{p.categoria||'—'}</PBadge></PTd>
                <PTd>{p.contacto||'—'}<br/><span className="text-[10px] text-slate-400">{p.telefono||''}</span></PTd>
                <PTd><span className="font-black text-xs">{p.moneda||'USD'}</span></PTd>
                <PTd>{p.condPago||'—'}</PTd>
                <PTd><PBadge v={p.activo!==false?'green':'gray'}>{p.activo!==false?'Activo':'Inactivo'}</PBadge></PTd>
                <PTd>
                  <div className="flex gap-2">
                    <PBp sm onClick={()=>{setForm({...p});setModal('form');}}><Edit size={11}/></PBp>
                    <PBd sm onClick={()=>eliminar(p)}><Trash2 size={11}/></PBd>
                  </div>
                </PTd>
              </tr>
            ))}
          </tbody>
        </table>
      </PCard>

      {/* Modal Proveedor */}
      <PModal open={modal==='form'} onClose={()=>setModal(null)} title={form.id?'Editar proveedor':'Nuevo proveedor'} wide
        footer={<><PBo onClick={()=>setModal(null)}>Cancelar</PBo><PBg onClick={guardar}><Save size={14}/> Guardar</PBg></>}>
        <div className="grid grid-cols-2 gap-4">
          <PFG label="Razón Social *" full><input className={inp} value={form.nombre||''} onChange={e=>setForm({...form,nombre:e.target.value})}/></PFG>
          <PFG label="RIF *"><input className={inp} value={form.rif||''} onChange={e=>setForm({...form,rif:e.target.value.toUpperCase()})}/></PFG>
          <PFG label="Categoría">
            <select className={sel} value={form.categoria||'INSUMOS'} onChange={e=>setForm({...form,categoria:e.target.value})}>
              {['INSUMOS','MATERIA PRIMA','SERVICIOS','EQUIPOS','LOGÍSTICA','OTROS'].map(c=><option key={c}>{c}</option>)}
            </select>
          </PFG>
          <PFG label="Persona de contacto"><input className={inp} value={form.contacto||''} onChange={e=>setForm({...form,contacto:e.target.value})}/></PFG>
          <PFG label="Teléfono"><input className={inp} value={form.telefono||''} onChange={e=>setForm({...form,telefono:e.target.value})}/></PFG>
          <PFG label="Email"><input className={inp} type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></PFG>
          <PFG label="Moneda de facturación">
            <select className={sel} value={form.moneda||'USD'} onChange={e=>setForm({...form,moneda:e.target.value})}>
              {['USD','Bs','EUR'].map(m=><option key={m}>{m}</option>)}
            </select>
          </PFG>
          <PFG label="Condición de pago">
            <select className={sel} value={form.condPago||'30 días'} onChange={e=>setForm({...form,condPago:e.target.value})}>
              {['Contado','7 días','15 días','30 días','45 días','60 días','90 días'].map(c=><option key={c}>{c}</option>)}
            </select>
          </PFG>
          <PFG label="Dirección" full><input className={inp} value={form.direccion||''} onChange={e=>setForm({...form,direccion:e.target.value})}/></PFG>
          <PFG label="Observaciones" full><textarea className={`${inp} resize-none`} rows={2} value={form.observaciones||''} onChange={e=>setForm({...form,observaciones:e.target.value})}/></PFG>
          <PFG label="Estado">
            <select className={sel} value={form.activo!==false?'true':'false'} onChange={e=>setForm({...form,activo:e.target.value==='true'})}>
              <option value="true">Activo</option><option value="false">Inactivo</option>
            </select>
          </PFG>
        </div>
      </PModal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// MÓDULO 3: ÓRDENES DE COMPRA
// ══════════════════════════════════════════════════════════════════════
const OrdenesCompraView = ({ordenesCompra,proveedores,dialog,setDialog}) => {
  const [search,setSearch]=useState('');
  const [filtStatus,setFiltStatus]=useState('TODOS');
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [items,setItems]=useState([]);
  const [itemActual,setItemActual]=useState({desc:'',cantidad:'',precioUnit:'',unidad:'Und'});

  const filtradas=ordenesCompra.filter(o=>{
    const matchSearch=(o.nroOC||'').toLowerCase().includes(search.toLowerCase())||(o.proveedor||'').toLowerCase().includes(search.toLowerCase());
    const matchStatus=filtStatus==='TODOS'||o.status===filtStatus;
    return matchSearch&&matchStatus;
  });

  const nextNroOC = () => {
    const nums=ordenesCompra.map(o=>parseInt((o.nroOC||'OC-0000').replace(/[^0-9]/g,''))||0);
    return `OC-${String(Math.max(0,...nums)+1).padStart(4,'0')}`;
  };

  const initForm = () => ({
    nroOC:nextNroOC(),proveedor:'',proveedorId:'',fecha:getTodayDate(),
    fechaEntrega:'',moneda:'USD',tasa:'',status:'BORRADOR',
    condPago:'30 días',observaciones:''
  });

  const totalOC = items.reduce((s,i)=>s+pNum(i.cantidad)*pNum(i.precioUnit),0);

  const agregarItem = () => {
    if(!itemActual.desc||!itemActual.cantidad||!itemActual.precioUnit)return;
    setItems([...items,{...itemActual,id:pId(),total:pNum(itemActual.cantidad)*pNum(itemActual.precioUnit)}]);
    setItemActual({desc:'',cantidad:'',precioUnit:'',unidad:'Und'});
  };

  const guardar = async () => {
    if(!form.proveedor){setDialog({title:'Aviso',text:'Selecciona un proveedor.',type:'alert'});return;}
    if(items.length===0){setDialog({title:'Aviso',text:'Agrega al menos un ítem.',type:'alert'});return;}
    try{
      const id=form.id||`OC-${pId()}`;
      await setDoc(getDocRef('procura_ordenes_compra',id),{
        ...form,id,items,total:totalOC,
        updatedAt:Date.now(),creadoEn:form.creadoEn||Date.now()
      });
      setModal(null);
      setDialog({title:'✅ OC guardada',text:`Orden ${form.nroOC} guardada.`,type:'alert'});
    }catch(e){setDialog({title:'Error',text:e.message,type:'alert'});}
  };

  const cambiarStatus = async(oc,nuevoStatus) => {
    try{await updateDoc(getDocRef('procura_ordenes_compra',oc.id),{status:nuevoStatus,updatedAt:Date.now()});
    }catch(e){setDialog({title:'Error',text:e.message,type:'alert'});}
  };

  const exportPDF = (oc) => {
    const prv=proveedores.find(p=>p.id===oc.proveedorId)||{};
    let html=pdfOpen(`ORDEN DE COMPRA N° ${oc.nroOC}`,`Fecha: ${pDate(oc.fecha)} · Entrega: ${pDate(oc.fechaEntrega)}`);
    html+=`<table style="margin-bottom:12px"><tr><td style="width:50%;border:none;vertical-align:top"><strong>PROVEEDOR:</strong><br>${oc.proveedor||'—'}<br>RIF: ${prv.rif||'—'}<br>${prv.direccion||''}</td>
    <td style="width:50%;border:none;vertical-align:top;text-align:right"><strong>OC N°:</strong> ${oc.nroOC}<br><strong>Fecha:</strong> ${pDate(oc.fecha)}<br><strong>Entrega:</strong> ${pDate(oc.fechaEntrega)}<br><strong>Moneda:</strong> ${oc.moneda||'USD'}</td></tr></table>`;
    html+=`<table><thead><tr><th>#</th><th>Descripción</th><th>Unidad</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th></tr></thead><tbody>`;
    (oc.items||[]).forEach((it,i)=>{html+=`<tr><td>${i+1}</td><td>${it.desc||'—'}</td><td>${it.unidad||'Und'}</td><td>${pFmt(it.cantidad)}</td><td>${pFmt(it.precioUnit)}</td><td>${pFmt(it.total||pNum(it.cantidad)*pNum(it.precioUnit))}</td></tr>`;});
    html+=`<tr class="total-row"><td colspan="5" style="text-align:right">TOTAL ${oc.moneda||'USD'}</td><td>${pFmt(oc.total||0)}</td></tr></tbody></table>`;
    html+=`<p style="margin-top:16px;font-size:10px;color:#64748b">Condición de pago: ${oc.condPago||'—'} · Observaciones: ${oc.observaciones||'Ninguna'}</p>`;
    pdfPrint(html+pdfClose(`OC-${oc.nroOC}`));
  };

  const exportXLSAll = () => {
    const rows=[['N° OC','Proveedor','Fecha','Fecha Entrega','Status','Moneda','Total','Condición Pago'],
      ...filtradas.map(o=>[o.nroOC,o.proveedor,o.fecha,o.fechaEntrega,o.status,o.moneda,pFmt(o.total),o.condPago])];
    const csv=rows.map(r=>r.map(c=>`"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ordenes_compra_${getTodayDate()}.csv`;a.click();
  };

  const statusList=['TODOS','BORRADOR','APROBADA','ENVIADA','RECIBIDA','CERRADA','ANULADA'];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1 relative min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar OC o proveedor..." className={`${inp} pl-9`}/>
        </div>
        <div className="flex gap-1">
          {statusList.map(s=>(
            <button key={s} onClick={()=>setFiltStatus(s)}
              className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${filtStatus===s?'text-white':' text-slate-500 hover:bg-slate-100'}`}
              style={filtStatus===s?{background:CARD}:{background:'white',border:'1.5px solid #e2e8f0'}}>
              {s}
            </button>
          ))}
        </div>
        <PBo onClick={exportXLSAll} sm><FileSpreadsheet size={13}/> Excel</PBo>
        <PBg onClick={()=>{setForm(initForm());setItems([]);setModal('form');}}><Plus size={14}/> Nueva OC</PBg>
      </div>

      <PCard noPad>
        <table className="w-full">
          <thead><tr>
            <PTh>N° OC</PTh><PTh>Proveedor</PTh><PTh>Fecha</PTh><PTh>F. Entrega</PTh><PTh>Status</PTh><PTh right>Total</PTh><PTh>Acciones</PTh>
          </tr></thead>
          <tbody>
            {filtradas.length===0?<tr><td colSpan={7} className="py-12"><PEmpty icon={ClipboardList} title="Sin órdenes" desc="Crea tu primera orden de compra"/></td></tr>:
            filtradas.map(oc=>{
              const st=statusOC(oc.status);
              return (
                <tr key={oc.id} className="hover:bg-slate-50">
                  <PTd><span className="font-black text-orange-600">{oc.nroOC}</span></PTd>
                  <PTd>{oc.proveedor||'—'}</PTd>
                  <PTd>{pDate(oc.fecha)}</PTd>
                  <PTd>{pDate(oc.fechaEntrega)||'—'}</PTd>
                  <PTd><PBadge v={st.v}>{st.label}</PBadge></PTd>
                  <PTd right mono><span className="font-black">{oc.moneda||'USD'} {pFmt(oc.total||0)}</span></PTd>
                  <PTd>
                    <div className="flex gap-1.5 flex-wrap">
                      <PBp sm onClick={()=>exportPDF(oc)}><Printer size={11}/></PBp>
                      <PBp sm onClick={()=>{setForm({...oc});setItems(oc.items||[]);setModal('form');}}><Edit size={11}/></PBp>
                      {oc.status==='BORRADOR'&&<PBg sm onClick={()=>cambiarStatus(oc,'APROBADA')}><Check size={11}/> Aprobar</PBg>}
                      {oc.status==='APROBADA'&&<PBo sm onClick={()=>cambiarStatus(oc,'ENVIADA')}><Send size={11}/> Enviar</PBo>}
                      {oc.status==='ENVIADA'&&<PBo sm onClick={()=>cambiarStatus(oc,'RECIBIDA')}><Truck size={11}/> Recibir</PBo>}
                      {!['CERRADA','ANULADA'].includes(oc.status)&&<PBd sm onClick={()=>cambiarStatus(oc,'ANULADA')}><Ban size={11}/></PBd>}
                    </div>
                  </PTd>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PCard>

      {/* Modal OC */}
      <PModal open={modal==='form'} onClose={()=>setModal(null)} title={form.id?`Editar ${form.nroOC}`:'Nueva Orden de Compra'} xlwide>
        <div className="grid grid-cols-2 gap-5">
          {/* Col izq — datos */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <PFG label="N° OC"><input className={inp} value={form.nroOC||''} readOnly style={{background:'#f8fafc'}}/></PFG>
              <PFG label="Fecha *"><input type="date" className={inp} value={form.fecha||''} onChange={e=>setForm({...form,fecha:e.target.value})}/></PFG>
              <PFG label="Proveedor *" full>
                <select className={sel} value={form.proveedorId||''} onChange={e=>{const p=proveedores.find(x=>x.id===e.target.value);setForm({...form,proveedorId:e.target.value,proveedor:p?.nombre||'',condPago:p?.condPago||form.condPago,moneda:p?.moneda||form.moneda});}}>
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.filter(p=>p.activo!==false).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </PFG>
              <PFG label="Fecha de entrega"><input type="date" className={inp} value={form.fechaEntrega||''} onChange={e=>setForm({...form,fechaEntrega:e.target.value})}/></PFG>
              <PFG label="Moneda">
                <select className={sel} value={form.moneda||'USD'} onChange={e=>setForm({...form,moneda:e.target.value})}>
                  {['USD','Bs','EUR'].map(m=><option key={m}>{m}</option>)}
                </select>
              </PFG>
              <PFG label="Tasa Bs/$"><input type="number" className={inp} value={form.tasa||''} onChange={e=>setForm({...form,tasa:e.target.value})} placeholder="Ej: 62,50"/></PFG>
              <PFG label="Condición de pago">
                <select className={sel} value={form.condPago||'30 días'} onChange={e=>setForm({...form,condPago:e.target.value})}>
                  {['Contado','7 días','15 días','30 días','45 días','60 días','90 días'].map(c=><option key={c}>{c}</option>)}
                </select>
              </PFG>
              <PFG label="Observaciones" full><textarea className={`${inp} resize-none`} rows={2} value={form.observaciones||''} onChange={e=>setForm({...form,observaciones:e.target.value})}/></PFG>
            </div>
          </div>

          {/* Col der — ítems */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Ítems de la orden</p>
            {/* Formulario ítem */}
            <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input className={inp} placeholder="Descripción del producto/servicio" value={itemActual.desc} onChange={e=>setItemActual({...itemActual,desc:e.target.value})}/>
                <select className={sel} value={itemActual.unidad} onChange={e=>setItemActual({...itemActual,unidad:e.target.value})}>
                  {['Und','KG','Millares','LT','MT','GL','Caja','Rollo'].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className={inp} placeholder="Cantidad" value={itemActual.cantidad} onChange={e=>setItemActual({...itemActual,cantidad:e.target.value})}/>
                <input type="number" className={inp} placeholder={`Precio unit. (${form.moneda||'USD'})`} value={itemActual.precioUnit} onChange={e=>setItemActual({...itemActual,precioUnit:e.target.value})}/>
              </div>
              {itemActual.cantidad&&itemActual.precioUnit&&<p className="text-xs font-black text-orange-600">= {form.moneda||'USD'} {pFmt(pNum(itemActual.cantidad)*pNum(itemActual.precioUnit))}</p>}
              <PBg onClick={agregarItem} sm><Plus size={12}/> Agregar ítem</PBg>
            </div>
            {/* Lista ítems */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {items.map((it,i)=>(
                <div key={it.id} className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{it.desc}</p>
                    <p className="text-[10px] text-slate-400">{pFmt(it.cantidad)} {it.unidad} × {pFmt(it.precioUnit)}</p>
                  </div>
                  <span className="text-xs font-black text-orange-600 whitespace-nowrap">{pFmt(it.total||0)}</span>
                  <button onClick={()=>setItems(items.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600"><X size={13}/></button>
                </div>
              ))}
            </div>
            {items.length>0&&(
              <div className="mt-3 p-3 bg-slate-900 rounded-xl flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">TOTAL {form.moneda||'USD'}</span>
                <span className="font-black text-white text-lg">{pFmt(totalOC)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <PBo onClick={()=>setModal(null)}>Cancelar</PBo>
          <PBg onClick={guardar}><Save size={14}/> {form.id?'Actualizar OC':'Crear OC'}</PBg>
        </div>
      </PModal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// MÓDULO 4: FACTURAS DE COMPRA
// ══════════════════════════════════════════════════════════════════════
const FacturasCompraView = ({facturasCompra,proveedores,ordenesCompra,dialog,setDialog}) => {
  const [search,setSearch]=useState('');
  const [filtStatus,setFiltStatus]=useState('TODOS');
  const [filtMes,setFiltMes]=useState('');
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});

  const filtradas=facturasCompra.filter(f=>{
    const ms=(f.nroFactura||'').toLowerCase().includes(search.toLowerCase())||(f.proveedor||'').toLowerCase().includes(search.toLowerCase());
    const st=filtStatus==='TODOS'||f.status===filtStatus;
    const mes=!filtMes||(f.fecha||'').startsWith(filtMes);
    return ms&&st&&mes;
  });

  const initForm = () => ({
    nroFactura:'',proveedor:'',proveedorId:'',ocId:'',
    fecha:getTodayDate(),fechaVencimiento:'',
    moneda:'USD',tasa:'',
    montoBase:0,iva:0,total:0,
    status:'PENDIENTE',observaciones:''
  });

  const calcTotales = (f) => {
    const base=pNum(f.montoBase);
    const ivaAmt=f.aplicaIva==='SI'?parseFloat((base*0.16).toFixed(2)):0;
    return {...f,iva:ivaAmt,total:parseFloat((base+ivaAmt).toFixed(2)),saldoPendiente:parseFloat((base+ivaAmt).toFixed(2))};
  };

  const guardar = async () => {
    if(!form.nroFactura||!form.proveedor){setDialog({title:'Aviso',text:'N° Factura y proveedor son obligatorios.',type:'alert'});return;}
    try{
      const id=form.id||`FC-${pId()}`;
      const data=calcTotales(form);
      await setDoc(getDocRef('procura_facturas_compra',id),{...data,id,updatedAt:Date.now()});
      setModal(null);
      setDialog({title:'✅ Factura registrada',text:`Factura ${form.nroFactura} registrada.`,type:'alert'});
    }catch(e){setDialog({title:'Error',text:e.message,type:'alert'});}
  };

  const exportPDF = () => {
    let html=pdfOpen('REGISTRO DE FACTURAS DE COMPRA',`Período: ${filtMes||'Todos'} · ${filtradas.length} facturas`);
    html+=`<table><thead><tr><th>N° Factura</th><th>Proveedor</th><th>Fecha</th><th>Vencimiento</th><th>Moneda</th><th>Base</th><th>IVA</th><th>Total</th><th>Saldo</th><th>Status</th></tr></thead><tbody>`;
    filtradas.forEach(f=>{
      const badg=f.status==='PAGADA'?'badge-pag':f.status==='PENDIENTE'?'badge-pend':'badge-apr';
      html+=`<tr><td><strong>${f.nroFactura||'—'}</strong></td><td>${f.proveedor||'—'}</td><td>${pDate(f.fecha)}</td><td>${pDate(f.fechaVencimiento)}</td><td>${f.moneda||'USD'}</td><td>${pFmt(f.montoBase)}</td><td>${pFmt(f.iva)}</td><td>${pFmt(f.total)}</td><td>${pFmt(f.saldoPendiente||0)}</td><td><span class="${badg}">${f.status}</span></td></tr>`;
    });
    const totBase=filtradas.reduce((s,f)=>s+pNum(f.montoBase),0);
    const totIva=filtradas.reduce((s,f)=>s+pNum(f.iva),0);
    const totTotal=filtradas.reduce((s,f)=>s+pNum(f.total),0);
    const totSaldo=filtradas.reduce((s,f)=>s+pNum(f.saldoPendiente||0),0);
    html+=`<tr class="total-row"><td colspan="5">TOTAL</td><td>${pFmt(totBase)}</td><td>${pFmt(totIva)}</td><td>${pFmt(totTotal)}</td><td>${pFmt(totSaldo)}</td><td></td></tr>`;
    html+=`</tbody></table>`;
    pdfPrint(html+pdfClose());
  };

  const exportXLS = () => {
    const rows=[['N° Factura','Proveedor','Fecha','Vencimiento','OC Vinculada','Moneda','Base','IVA','Total','Saldo','Status'],
      ...filtradas.map(f=>[f.nroFactura,f.proveedor,f.fecha,f.fechaVencimiento,f.ocId||'—',f.moneda,pFmt(f.montoBase),pFmt(f.iva),pFmt(f.total),pFmt(f.saldoPendiente||0),f.status])];
    const csv=rows.map(r=>r.map(c=>`"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`facturas_compra_${getTodayDate()}.csv`;a.click();
  };

  const meses=[];
  for(let i=0;i<12;i++){const d=new Date();d.setMonth(d.getMonth()-i);meses.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1 relative min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar factura o proveedor..." className={`${inp} pl-9`}/>
        </div>
        <select className={`${sel} w-auto`} value={filtMes} onChange={e=>setFiltMes(e.target.value)}>
          <option value="">Todos los meses</option>
          {meses.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select className={`${sel} w-auto`} value={filtStatus} onChange={e=>setFiltStatus(e.target.value)}>
          {['TODOS','PENDIENTE','PARCIAL','PAGADA','ANULADA'].map(s=><option key={s}>{s}</option>)}
        </select>
        <PBo onClick={exportPDF} sm><Printer size={13}/> PDF</PBo>
        <PBo onClick={exportXLS} sm><FileSpreadsheet size={13}/> Excel</PBo>
        <PBg onClick={()=>{setForm(initForm());setModal('form');}}><Plus size={14}/> Registrar factura</PBg>
      </div>

      {/* Totales rápidos */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-[9px] font-black uppercase text-slate-400">Total facturas filtradas</p>
          <p className="font-black text-xl text-slate-800">${pFmt(filtradas.reduce((s,f)=>s+pNum(f.total),0))}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-amber-100">
          <p className="text-[9px] font-black uppercase text-amber-600">Saldo pendiente</p>
          <p className="font-black text-xl text-amber-700">${pFmt(filtradas.filter(f=>f.status!=='PAGADA').reduce((s,f)=>s+pNum(f.saldoPendiente||f.total),0))}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-emerald-100">
          <p className="text-[9px] font-black uppercase text-emerald-600">IVA crédito fiscal</p>
          <p className="font-black text-xl text-emerald-700">${pFmt(filtradas.reduce((s,f)=>s+pNum(f.iva),0))}</p>
        </div>
      </div>

      <PCard noPad>
        <table className="w-full">
          <thead><tr>
            <PTh>N° Factura</PTh><PTh>Proveedor</PTh><PTh>Fecha</PTh><PTh>Vencimiento</PTh><PTh>OC</PTh><PTh right>Base</PTh><PTh right>IVA</PTh><PTh right>Total</PTh><PTh right>Saldo</PTh><PTh>Status</PTh><PTh>Acciones</PTh>
          </tr></thead>
          <tbody>
            {filtradas.length===0?<tr><td colSpan={11} className="py-12"><PEmpty icon={FileText} title="Sin facturas" desc="Registra tu primera factura de compra"/></td></tr>:
            filtradas.map(f=>{
              const st=statusCxP(f.status);
              const vencida=f.status==='PENDIENTE'&&f.fechaVencimiento&&f.fechaVencimiento<getTodayDate();
              return (
                <tr key={f.id} className={`hover:bg-slate-50 ${vencida?'bg-red-50/30':''}`}>
                  <PTd><span className="font-black text-orange-600">{f.nroFactura||'—'}</span></PTd>
                  <PTd>{f.proveedor||'—'}</PTd>
                  <PTd>{pDate(f.fecha)}</PTd>
                  <PTd><span className={vencida?'text-red-600 font-black':''}>{pDate(f.fechaVencimiento)||'—'}</span></PTd>
                  <PTd><span className="text-[10px] text-blue-600">{f.ocId||'—'}</span></PTd>
                  <PTd right mono>{pFmt(f.montoBase)}</PTd>
                  <PTd right mono>{pFmt(f.iva)}</PTd>
                  <PTd right mono><span className="font-black">{f.moneda||'USD'} {pFmt(f.total)}</span></PTd>
                  <PTd right mono><span className={pNum(f.saldoPendiente)>0?'text-amber-600 font-black':'text-emerald-600 font-black'}>{pFmt(f.saldoPendiente||0)}</span></PTd>
                  <PTd><PBadge v={st.v}>{st.label}</PBadge></PTd>
                  <PTd>
                    <div className="flex gap-1.5">
                      <PBp sm onClick={()=>{setForm({...f});setModal('form');}}><Edit size={11}/></PBp>
                    </div>
                  </PTd>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PCard>

      {/* Modal Factura */}
      <PModal open={modal==='form'} onClose={()=>setModal(null)} title={form.id?'Editar factura':'Registrar factura de compra'} wide
        footer={<><PBo onClick={()=>setModal(null)}>Cancelar</PBo><PBg onClick={guardar}><Save size={14}/> Guardar</PBg></>}>
        <div className="grid grid-cols-2 gap-4">
          <PFG label="N° Factura proveedor *"><input className={inp} value={form.nroFactura||''} onChange={e=>setForm({...form,nroFactura:e.target.value.toUpperCase()})}/></PFG>
          <PFG label="Proveedor *">
            <select className={sel} value={form.proveedorId||''} onChange={e=>{const p=proveedores.find(x=>x.id===e.target.value);setForm({...form,proveedorId:e.target.value,proveedor:p?.nombre||''});}}>
              <option value="">Seleccionar...</option>
              {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </PFG>
          <PFG label="Fecha factura"><input type="date" className={inp} value={form.fecha||''} onChange={e=>setForm({...form,fecha:e.target.value})}/></PFG>
          <PFG label="Fecha vencimiento"><input type="date" className={inp} value={form.fechaVencimiento||''} onChange={e=>setForm({...form,fechaVencimiento:e.target.value})}/></PFG>
          <PFG label="OC vinculada">
            <select className={sel} value={form.ocId||''} onChange={e=>setForm({...form,ocId:e.target.value})}>
              <option value="">Sin OC vinculada</option>
              {ordenesCompra.filter(o=>o.proveedorId===form.proveedorId).map(o=><option key={o.id} value={o.nroOC}>{o.nroOC}</option>)}
            </select>
          </PFG>
          <PFG label="Moneda">
            <select className={sel} value={form.moneda||'USD'} onChange={e=>setForm({...form,moneda:e.target.value})}>
              {['USD','Bs','EUR'].map(m=><option key={m}>{m}</option>)}
            </select>
          </PFG>
          <PFG label="Tasa Bs/$"><input type="number" className={inp} value={form.tasa||''} onChange={e=>setForm({...form,tasa:e.target.value})} placeholder="Ej: 62,50"/></PFG>
          <PFG label="Aplica IVA 16%">
            <select className={sel} value={form.aplicaIva||'SI'} onChange={e=>setForm({...form,aplicaIva:e.target.value})}>
              <option value="SI">Sí — 16%</option><option value="NO">No</option>
            </select>
          </PFG>
          <PFG label="Base imponible (monto neto)">
            <input type="number" className={inp} value={form.montoBase||''} onChange={e=>{const base=pNum(e.target.value);const iva=form.aplicaIva==='NO'?0:parseFloat((base*0.16).toFixed(2));setForm({...form,montoBase:base,iva,total:parseFloat((base+iva).toFixed(2)),saldoPendiente:parseFloat((base+iva).toFixed(2))});}}/>
          </PFG>
          <PFG label="IVA 16%"><input className={`${inp} bg-slate-50`} readOnly value={pFmt(form.iva||0)}/></PFG>
          <PFG label="Total factura" full>
            <div className="bg-slate-900 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase">Total {form.moneda||'USD'}</span>
              <span className="font-black text-white text-xl">{pFmt(form.total||0)}</span>
            </div>
          </PFG>
          <PFG label="Observaciones" full><textarea className={`${inp} resize-none`} rows={2} value={form.observaciones||''} onChange={e=>setForm({...form,observaciones:e.target.value})}/></PFG>
        </div>
      </PModal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// MÓDULO 5: CUENTAS POR PAGAR (CxP)
// ══════════════════════════════════════════════════════════════════════
const CxPView = ({facturasCompra,pagosCxP,proveedores,tasaBCV,dialog,setDialog}) => {
  const [search,setSearch]=useState('');
  const [filtProv,setFiltProv]=useState('TODOS');
  const [modal,setModal]=useState(null);
  const [factSel,setFactSel]=useState(null);
  const [formPago,setFormPago]=useState({});

  const pendientes=facturasCompra.filter(f=>f.status!=='PAGADA'&&f.status!=='ANULADA'&&pNum(f.saldoPendiente||f.total)>0);
  const filtradas=pendientes.filter(f=>{
    const ms=(f.nroFactura||'').toLowerCase().includes(search.toLowerCase())||(f.proveedor||'').toLowerCase().includes(search.toLowerCase());
    const pv=filtProv==='TODOS'||f.proveedorId===filtProv;
    return ms&&pv;
  });

  const totalPendiente=filtradas.reduce((s,f)=>s+pNum(f.saldoPendiente||f.total),0);
  const vencidas=filtradas.filter(f=>f.fechaVencimiento&&f.fechaVencimiento<getTodayDate());
  const proxVencer=filtradas.filter(f=>f.fechaVencimiento&&f.fechaVencimiento>=getTodayDate()&&f.fechaVencimiento<=new Date(Date.now()+7*864e5).toISOString().slice(0,10));

  const abrirPago = (fact) => {
    setFactSel(fact);
    setFormPago({monto:pFmt(fact.saldoPendiente||fact.total),metodo:'Transferencia',fecha:getTodayDate(),banco:'',referencia:'',moneda:fact.moneda||'USD',tasa:String(tasaBCV||0),concepto:`Pago factura ${fact.nroFactura}`});
    setModal('pago');
  };

  const registrarPago = async () => {
    if(!formPago.monto||pNum(formPago.monto)<=0){setDialog({title:'Aviso',text:'El monto debe ser mayor a 0.',type:'alert'});return;}
    try{
      const monto=pNum(formPago.monto);
      const saldoActual=pNum(factSel.saldoPendiente||factSel.total);
      const nuevoSaldo=Math.max(0,saldoActual-monto);
      const nuevoStatus=nuevoSaldo<0.01?'PAGADA':'PARCIAL';
      const batch=writeBatch(_procuraDB);
      const pagoId=`PAGO-${pId()}`;
      batch.set(getDocRef('procura_pagos_cxp',pagoId),{
        id:pagoId,facturaId:factSel.id,nroFactura:factSel.nroFactura,
        proveedor:factSel.proveedor,proveedorId:factSel.proveedorId||'',
        ...formPago,monto,timestamp:Date.now()
      });
      batch.update(getDocRef('procura_facturas_compra',factSel.id),{
        saldoPendiente:nuevoSaldo,status:nuevoStatus,
        montoCobrado:(pNum(factSel.montoCobrado)||0)+monto,
        updatedAt:Date.now()
      });
      await batch.commit();
      setModal(null);
      setDialog({title:'✅ Pago registrado',text:`Pago de $${pFmt(monto)} registrado. Saldo: $${pFmt(nuevoSaldo)}`,type:'alert'});
    }catch(e){setDialog({title:'Error',text:e.message,type:'alert'});}
  };

  const exportPDF = () => {
    let html=pdfOpen('REPORTE CUENTAS POR PAGAR',`Pendientes: ${filtradas.length} facturas · Total: $${pFmt(totalPendiente)}`);
    html+=`<table><thead><tr><th>N° Factura</th><th>Proveedor</th><th>Fecha</th><th>Vencimiento</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Status</th></tr></thead><tbody>`;
    filtradas.forEach(f=>{
      const venc=f.fechaVencimiento&&f.fechaVencimiento<getTodayDate();
      html+=`<tr${venc?' style="background:#fef2f2"':''}><td><strong>${f.nroFactura||'—'}</strong></td><td>${f.proveedor||'—'}</td><td>${pDate(f.fecha)}</td><td style="${venc?'color:#dc2626;font-weight:bold':''}">${pDate(f.fechaVencimiento)||'—'}</td><td>$${pFmt(f.total)}</td><td>$${pFmt(f.montoCobrado||0)}</td><td><strong>$${pFmt(f.saldoPendiente||f.total)}</strong></td><td><span class="${f.status==='PARCIAL'?'badge-apr':'badge-pend'}">${f.status}</span></td></tr>`;
    });
    html+=`<tr class="total-row"><td colspan="6" style="text-align:right">TOTAL PENDIENTE</td><td>$${pFmt(totalPendiente)}</td><td></td></tr></tbody></table>`;
    pdfPrint(html+pdfClose());
  };

  const exportXLS = () => {
    const rows=[['N° Factura','Proveedor','Fecha','Vencimiento','Total','Pagado','Saldo Pendiente','Status'],
      ...filtradas.map(f=>[f.nroFactura,f.proveedor,f.fecha,f.fechaVencimiento,pFmt(f.total),pFmt(f.montoCobrado||0),pFmt(f.saldoPendiente||f.total),f.status])];
    const csv=rows.map(r=>r.map(c=>`"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`cxp_${getTodayDate()}.csv`;a.click();
  };

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="rounded-2xl p-5 text-white shadow-xl" style={{background:CARD}}>
          <p className="text-[9px] font-black uppercase text-slate-400">Total por pagar</p>
          <p className="font-black text-3xl mt-1" style={{color:ORANGE}}>${pFmt(totalPendiente)}</p>
          <p className="text-[10px] text-slate-400 mt-2">{filtradas.length} facturas pendientes</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
          <p className="text-[9px] font-black uppercase text-red-600">Vencidas</p>
          <p className="font-black text-3xl mt-1 text-red-600">${pFmt(vencidas.reduce((s,f)=>s+pNum(f.saldoPendiente||f.total),0))}</p>
          <p className="text-[10px] text-red-400 mt-2">{vencidas.length} facturas vencidas</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <p className="text-[9px] font-black uppercase text-amber-600">Próximas a vencer (7 días)</p>
          <p className="font-black text-3xl mt-1 text-amber-600">${pFmt(proxVencer.reduce((s,f)=>s+pNum(f.saldoPendiente||f.total),0))}</p>
          <p className="text-[10px] text-amber-400 mt-2">{proxVencer.length} facturas</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1 relative min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar factura o proveedor..." className={`${inp} pl-9`}/>
        </div>
        <select className={`${sel} w-auto`} value={filtProv} onChange={e=>setFiltProv(e.target.value)}>
          <option value="TODOS">Todos los proveedores</option>
          {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <PBo onClick={exportPDF} sm><Printer size={13}/> PDF</PBo>
        <PBo onClick={exportXLS} sm><FileSpreadsheet size={13}/> Excel</PBo>
      </div>

      <PCard noPad>
        <table className="w-full">
          <thead><tr>
            <PTh>N° Factura</PTh><PTh>Proveedor</PTh><PTh>Fecha</PTh><PTh>Vencimiento</PTh><PTh right>Total</PTh><PTh right>Pagado</PTh><PTh right>Saldo</PTh><PTh>Status</PTh><PTh>Acciones</PTh>
          </tr></thead>
          <tbody>
            {filtradas.length===0?<tr><td colSpan={9} className="py-12"><PEmpty icon={CreditCard} title="Sin pendientes" desc="No hay facturas pendientes de pago"/></td></tr>:
            filtradas.map(f=>{
              const venc=f.fechaVencimiento&&f.fechaVencimiento<getTodayDate();
              const st=statusCxP(f.status);
              return (
                <tr key={f.id} className={`hover:bg-slate-50 ${venc?'bg-red-50/40':''}`}>
                  <PTd><span className="font-black text-orange-600">{f.nroFactura||'—'}</span></PTd>
                  <PTd>{f.proveedor||'—'}</PTd>
                  <PTd>{pDate(f.fecha)}</PTd>
                  <PTd><span className={venc?'text-red-600 font-black':''}>{pDate(f.fechaVencimiento)||'—'}{venc&&' ⚠️'}</span></PTd>
                  <PTd right mono>{pFmt(f.total)}</PTd>
                  <PTd right mono className="text-emerald-600">{pFmt(f.montoCobrado||0)}</PTd>
                  <PTd right mono><span className="font-black text-amber-600">{pFmt(f.saldoPendiente||f.total)}</span></PTd>
                  <PTd><PBadge v={st.v}>{st.label}</PBadge></PTd>
                  <PTd>
                    <PBg sm onClick={()=>abrirPago(f)}><CreditCard size={11}/> Pagar</PBg>
                  </PTd>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PCard>

      {/* Modal Pago */}
      <PModal open={modal==='pago'} onClose={()=>setModal(null)} title="Registrar pago a proveedor"
        footer={<><PBo onClick={()=>setModal(null)}>Cancelar</PBo><PBg onClick={registrarPago}><CreditCard size={14}/> Registrar pago</PBg></>}>
        {factSel&&(
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">Factura</p>
              <p className="font-black text-slate-800">{factSel.nroFactura} — {factSel.proveedor}</p>
              <p className="text-xs text-slate-500 mt-1">Saldo pendiente: <span className="font-black text-orange-600">${pFmt(factSel.saldoPendiente||factSel.total)}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PFG label="Monto a pagar *">
                <input type="number" className={inp} value={formPago.monto||''} onChange={e=>setFormPago({...formPago,monto:e.target.value})}/>
              </PFG>
              <PFG label="Moneda">
                <select className={sel} value={formPago.moneda||'USD'} onChange={e=>setFormPago({...formPago,moneda:e.target.value})}>
                  {['USD','Bs','EUR'].map(m=><option key={m}>{m}</option>)}
                </select>
              </PFG>
              <PFG label="Tasa Bs/$"><input type="number" className={inp} value={formPago.tasa||''} onChange={e=>setFormPago({...formPago,tasa:e.target.value})} placeholder={String(tasaBCV||0)}/></PFG>
              <PFG label="Método de pago">
                <select className={sel} value={formPago.metodo||'Transferencia'} onChange={e=>setFormPago({...formPago,metodo:e.target.value})}>
                  {['Transferencia','Efectivo USD','Efectivo Bs.','Zelle','Cheque','Pago Móvil'].map(m=><option key={m}>{m}</option>)}
                </select>
              </PFG>
              <PFG label="Banco / Cuenta"><input className={inp} value={formPago.banco||''} onChange={e=>setFormPago({...formPago,banco:e.target.value})} placeholder="Ej: Banesco 0134"/></PFG>
              <PFG label="N° Referencia"><input className={inp} value={formPago.referencia||''} onChange={e=>setFormPago({...formPago,referencia:e.target.value.toUpperCase()})}/></PFG>
              <PFG label="Fecha de pago"><input type="date" className={inp} value={formPago.fecha||''} onChange={e=>setFormPago({...formPago,fecha:e.target.value})}/></PFG>
              <PFG label="Concepto"><input className={inp} value={formPago.concepto||''} onChange={e=>setFormPago({...formPago,concepto:e.target.value})}/></PFG>
            </div>
            {formPago.monto&&(
              <div className="bg-slate-900 rounded-xl p-3 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Saldo tras pago</span>
                <span className={`font-black text-lg ${Math.max(0,pNum(factSel.saldoPendiente||factSel.total)-pNum(formPago.monto))<0.01?'text-emerald-400':'text-orange-400'}`}>
                  ${pFmt(Math.max(0,pNum(factSel.saldoPendiente||factSel.total)-pNum(formPago.monto)))}
                </span>
              </div>
            )}
          </div>
        )}
      </PModal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// MÓDULO 6: HISTORIAL DE PAGOS
// ══════════════════════════════════════════════════════════════════════
const HistorialPagosView = ({pagosCxP,dialog,setDialog}) => {
  const [search,setSearch]=useState('');
  const [filtMes,setFiltMes]=useState(getMesActual());

  const filtrados=pagosCxP.filter(p=>{
    const ms=(p.nroFactura||'').toLowerCase().includes(search.toLowerCase())||(p.proveedor||'').toLowerCase().includes(search.toLowerCase())||(p.referencia||'').toLowerCase().includes(search.toLowerCase());
    const mes=!filtMes||(p.fecha||'').startsWith(filtMes);
    return ms&&mes;
  });

  const totalFiltrado=filtrados.reduce((s,p)=>s+pNum(p.monto),0);
  const meses=[];
  for(let i=0;i<12;i++){const d=new Date();d.setMonth(d.getMonth()-i);meses.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}

  const exportPDF = () => {
    let html=pdfOpen('HISTORIAL DE PAGOS A PROVEEDORES',`Período: ${filtMes||'Todos'} · Total: $${pFmt(totalFiltrado)}`);
    html+=`<table><thead><tr><th>Fecha</th><th>Proveedor</th><th>N° Factura</th><th>Método</th><th>Banco</th><th>Referencia</th><th>Monto</th></tr></thead><tbody>`;
    filtrados.forEach(p=>{html+=`<tr><td>${pDate(p.fecha)}</td><td>${p.proveedor||'—'}</td><td>${p.nroFactura||'—'}</td><td>${p.metodo||'—'}</td><td>${p.banco||'—'}</td><td>${p.referencia||'—'}</td><td><strong>$${pFmt(p.monto)}</strong></td></tr>`;});
    html+=`<tr class="total-row"><td colspan="6" style="text-align:right">TOTAL PAGADO</td><td>$${pFmt(totalFiltrado)}</td></tr></tbody></table>`;
    pdfPrint(html+pdfClose());
  };

  const exportXLS = () => {
    const rows=[['Fecha','Proveedor','N° Factura','Método','Banco','Referencia','Moneda','Monto','Tasa'],
      ...filtrados.map(p=>[p.fecha,p.proveedor,p.nroFactura,p.metodo,p.banco,p.referencia,p.moneda,pFmt(p.monto),p.tasa||''])];
    const csv=rows.map(r=>r.map(c=>`"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`pagos_proveedores_${getTodayDate()}.csv`;a.click();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pago, proveedor o referencia..." className={`${inp} pl-9`}/>
        </div>
        <select className={`${sel} w-auto`} value={filtMes} onChange={e=>setFiltMes(e.target.value)}>
          <option value="">Todos los meses</option>
          {meses.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <PBo onClick={exportPDF} sm><Printer size={13}/> PDF</PBo>
        <PBo onClick={exportXLS} sm><FileSpreadsheet size={13}/> Excel</PBo>
      </div>

      <div className="bg-slate-900 rounded-xl p-4 mb-5 flex items-center justify-between">
        <div><p className="text-[9px] font-black uppercase text-slate-400">Total pagado — {filtrados.length} registros</p></div>
        <p className="font-black text-white text-2xl">${pFmt(totalFiltrado)}</p>
      </div>

      <PCard noPad>
        <table className="w-full">
          <thead><tr>
            <PTh>Fecha</PTh><PTh>Proveedor</PTh><PTh>Factura</PTh><PTh>Método</PTh><PTh>Banco / Cuenta</PTh><PTh>Referencia</PTh><PTh right>Monto</PTh>
          </tr></thead>
          <tbody>
            {filtrados.length===0?<tr><td colSpan={7} className="py-12"><PEmpty icon={Receipt} title="Sin pagos" desc="No se encontraron pagos con los filtros actuales"/></td></tr>:
            filtrados.map(p=>(
              <tr key={p.id} className="hover:bg-slate-50">
                <PTd>{pDate(p.fecha)}</PTd>
                <PTd><span className="font-black text-slate-800">{p.proveedor||'—'}</span></PTd>
                <PTd><span className="text-orange-600 font-black">{p.nroFactura||'—'}</span></PTd>
                <PTd><PBadge v="blue">{p.metodo||'—'}</PBadge></PTd>
                <PTd>{p.banco||'—'}</PTd>
                <PTd mono>{p.referencia||'—'}</PTd>
                <PTd right mono><span className="font-black text-emerald-600">${pFmt(p.monto)}</span></PTd>
              </tr>
            ))}
          </tbody>
        </table>
      </PCard>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// MÓDULO 7: ESTADO DE CUENTA POR PROVEEDOR
// ══════════════════════════════════════════════════════════════════════
const EstadoCuentaProvView = ({proveedores,facturasCompra,pagosCxP,ordenesCompra}) => {
  const [provSel,setProvSel]=useState('');
  const [corte,setCorte]=useState('');
  const [expandido,setExpandido]=useState({});

  const provActivos=proveedores.filter(p=>p.activo!==false);
  const prov=proveedores.find(p=>p.id===provSel);

  const factsProv=facturasCompra.filter(f=>f.proveedorId===provSel&&(!corte||f.fecha<=corte));
  const pagosProv=pagosCxP.filter(p=>p.proveedorId===provSel&&(!corte||p.fecha<=corte));
  const ocProv=ordenesCompra.filter(o=>o.proveedorId===provSel);

  const totalFacturado=factsProv.reduce((s,f)=>s+pNum(f.total),0);
  const totalPagado=pagosProv.reduce((s,p)=>s+pNum(p.monto),0);
  const saldo=totalFacturado-totalPagado;

  const exportPDF = () => {
    if(!prov)return;
    let html=pdfOpen(`ESTADO DE CUENTA — ${prov.nombre}`,`RIF: ${prov.rif||'—'} · Corte: ${corte?pDate(corte):'Actual'}`);
    html+=`<table style="margin-bottom:16px"><tr><td style="border:none"><strong>Proveedor:</strong> ${prov.nombre}<br>RIF: ${prov.rif||'—'}<br>Contacto: ${prov.contacto||'—'}</td>
    <td style="border:none;text-align:right"><strong>Total facturado:</strong> $${pFmt(totalFacturado)}<br><strong>Total pagado:</strong> $${pFmt(totalPagado)}<br><strong style="color:${saldo>0?'#dc2626':'#16a34a'}">Saldo: $${pFmt(Math.abs(saldo))} ${saldo>0?'por pagar':'a favor'}</strong></td></tr></table>`;
    html+=`<h3 style="margin:12px 0 6px;font-size:11px;text-transform:uppercase;color:#000">Facturas</h3>`;
    html+=`<table><thead><tr><th>N° Factura</th><th>Fecha</th><th>Vencimiento</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Status</th></tr></thead><tbody>`;
    factsProv.forEach(f=>{html+=`<tr><td>${f.nroFactura||'—'}</td><td>${pDate(f.fecha)}</td><td>${pDate(f.fechaVencimiento)}</td><td>$${pFmt(f.total)}</td><td>$${pFmt(f.montoCobrado||0)}</td><td>$${pFmt(f.saldoPendiente||f.total)}</td><td><span class="${f.status==='PAGADA'?'badge-pag':'badge-pend'}">${f.status}</span></td></tr>`;});
    html+=`</tbody></table>`;
    html+=`<h3 style="margin:16px 0 6px;font-size:11px;text-transform:uppercase;color:#000">Pagos realizados</h3>`;
    html+=`<table><thead><tr><th>Fecha</th><th>Factura</th><th>Método</th><th>Referencia</th><th>Monto</th></tr></thead><tbody>`;
    pagosProv.forEach(p=>{html+=`<tr><td>${pDate(p.fecha)}</td><td>${p.nroFactura||'—'}</td><td>${p.metodo||'—'}</td><td>${p.referencia||'—'}</td><td>$${pFmt(p.monto)}</td></tr>`;});
    html+=`<tr class="total-row"><td colspan="4" style="text-align:right">SALDO ACTUAL</td><td style="color:${saldo>0?'#f97316':'#4ade80'}">$${pFmt(Math.abs(saldo))} ${saldo>0?'POR PAGAR':'A FAVOR'}</td></tr></tbody></table>`;
    pdfPrint(html+pdfClose());
  };

  return (
    <div>
      {/* Selector */}
      <div className="flex gap-3 mb-5">
        <select className={`${sel} flex-1`} value={provSel} onChange={e=>setProvSel(e.target.value)}>
          <option value="">Seleccionar proveedor...</option>
          {provActivos.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.rif||'—'}</option>)}
        </select>
        <div className="relative">
          <label className="absolute -top-4 left-0 text-[9px] font-black text-slate-400 uppercase">Corte de fecha</label>
          <input type="date" className={inp} value={corte} onChange={e=>setCorte(e.target.value)}/>
        </div>
        {provSel&&<PBo onClick={exportPDF}><Printer size={13}/> PDF</PBo>}
        {!provSel&&<div className="px-4 py-2.5 text-xs text-slate-400 font-medium flex items-center">Selecciona un proveedor para ver su estado de cuenta</div>}
      </div>

      {provSel&&prov&&(
        <div className="space-y-5">
          {/* Header proveedor */}
          <div className="rounded-2xl p-6 text-white shadow-xl" style={{background:CARD}}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Estado de Cuenta</p>
                <h2 className="font-black text-xl">{prov.nombre}</h2>
                <p className="text-[11px] text-slate-400 mt-1">RIF: {prov.rif||'—'} · {prov.contacto||''} · {prov.condPago||''}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase">Saldo actual</p>
                <p className={`font-black text-3xl mt-1 ${saldo>0?'text-orange-400':'text-emerald-400'}`}>${pFmt(Math.abs(saldo))}</p>
                <p className="text-[10px] text-slate-400 mt-1">{saldo>0?'por pagar':'saldo a favor'}</p>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <PKPI label="OC emitidas" value={ocProv.length} accent="blue" Icon={ClipboardList}/>
            <PKPI label="Facturas" value={factsProv.length} accent="gold" Icon={FileText}/>
            <PKPI label="Total facturado" value={`$${pFmt(totalFacturado)}`} accent="orange" Icon={DollarSign}/>
            <PKPI label="Total pagado" value={`$${pFmt(totalPagado)}`} accent="green" Icon={CheckCircle}/>
          </div>

          {/* Facturas */}
          <PCard title="Facturas" subtitle={`${factsProv.length} facturas en total`}>
            {factsProv.length===0?<PEmpty icon={FileText} title="Sin facturas" desc="No hay facturas para este proveedor"/>:(
              <table className="w-full">
                <thead><tr><PTh>N° Factura</PTh><PTh>Fecha</PTh><PTh>Vencimiento</PTh><PTh right>Total</PTh><PTh right>Pagado</PTh><PTh right>Saldo</PTh><PTh>Status</PTh></tr></thead>
                <tbody>
                  {factsProv.map(f=>{
                    const st=statusCxP(f.status);
                    const venc=f.fechaVencimiento&&f.fechaVencimiento<getTodayDate()&&f.status!=='PAGADA';
                    return (
                      <tr key={f.id} className={`hover:bg-slate-50 ${venc?'bg-red-50/30':''}`}>
                        <PTd><span className="font-black text-orange-600">{f.nroFactura||'—'}</span></PTd>
                        <PTd>{pDate(f.fecha)}</PTd>
                        <PTd><span className={venc?'text-red-600 font-black':''}>{pDate(f.fechaVencimiento)||'—'}</span></PTd>
                        <PTd right mono>{pFmt(f.total)}</PTd>
                        <PTd right mono className="text-emerald-600">{pFmt(f.montoCobrado||0)}</PTd>
                        <PTd right mono><span className={pNum(f.saldoPendiente)>0?'text-amber-600 font-black':'text-emerald-600'}>{pFmt(f.saldoPendiente||0)}</span></PTd>
                        <PTd><PBadge v={st.v}>{st.label}</PBadge></PTd>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </PCard>

          {/* Pagos */}
          <PCard title="Pagos realizados" subtitle={`${pagosProv.length} pagos · $${pFmt(totalPagado)} total`}>
            {pagosProv.length===0?<PEmpty icon={CreditCard} title="Sin pagos" desc="No se han registrado pagos"/>:(
              <table className="w-full">
                <thead><tr><PTh>Fecha</PTh><PTh>Factura</PTh><PTh>Método</PTh><PTh>Banco</PTh><PTh>Referencia</PTh><PTh right>Monto</PTh></tr></thead>
                <tbody>
                  {pagosProv.map(p=>(
                    <tr key={p.id} className="hover:bg-slate-50">
                      <PTd>{pDate(p.fecha)}</PTd>
                      <PTd><span className="text-orange-600 font-black">{p.nroFactura||'—'}</span></PTd>
                      <PTd><PBadge v="blue">{p.metodo||'—'}</PBadge></PTd>
                      <PTd>{p.banco||'—'}</PTd>
                      <PTd mono>{p.referencia||'—'}</PTd>
                      <PTd right mono><span className="font-black text-emerald-600">${pFmt(p.monto)}</span></PTd>
                    </tr>
                  ))}
                  <tr style={{background:CARD}}>
                    <td colSpan={5} className="px-4 py-2 text-right text-[10px] font-black text-slate-400 uppercase">Saldo {saldo>0?'por pagar':'a favor'}</td>
                    <td className={`px-4 py-2 text-right font-black ${saldo>0?'text-orange-400':'text-emerald-400'}`}>${pFmt(Math.abs(saldo))}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </PCard>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
function ProcuraApp({fbUser,onBack}) {
  const [sec,setSec]=useState('dashboard');
  const [proveedores,setProveedores]=useState([]);
  const [ordenesCompra,setOrdenesCompra]=useState([]);
  const [facturasCompra,setFacturasCompra]=useState([]);
  const [pagosCxP,setPagosCxP]=useState([]);
  const [tasas,setTasas]=useState([]);
  const [dialog,setDialog]=useState(null);

  useEffect(()=>{
    if(!fbUser)return;
    const subs=[
      onSnapshot(getColRef('procura_proveedores'),s=>setProveedores(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('procura_ordenes_compra'),orderBy('fecha','desc')),s=>setOrdenesCompra(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('procura_facturas_compra'),orderBy('fecha','desc')),s=>setFacturasCompra(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('procura_pagos_cxp'),orderBy('fecha','desc')),s=>setPagosCxP(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('banco_tasas'),orderBy('fecha','desc')),s=>setTasas(s.docs.map(d=>d.data()))),
    ];
    return()=>subs.forEach(u=>u());
  },[fbUser]);

  const tasaBCV=pNum(tasas[0]?.tasaRef||0)||62.5;

  const navGroups=[
    {group:'Principal',color:ORANGE,items:[
      {id:'dashboard',label:'Dashboard',icon:LayoutDashboard},
    ]},
    {group:'Gestión',color:'#3b82f6',items:[
      {id:'proveedores',label:'Proveedores',icon:Building2,badge:proveedores.filter(p=>p.activo!==false).length||undefined},
      {id:'ordenes',label:'Órdenes de Compra',icon:ClipboardList,badge:ordenesCompra.filter(o=>o.status==='BORRADOR').length||undefined},
      {id:'facturas',label:'Facturas de Compra',icon:FileText},
    ]},
    {group:'Financiero',color:'#22c55e',items:[
      {id:'cxp',label:'Cuentas por Pagar',icon:CreditCard,badge:facturasCompra.filter(f=>f.status!=='PAGADA'&&f.status!=='ANULADA').length||undefined},
      {id:'historial',label:'Historial de Pagos',icon:Receipt},
      {id:'estado_cuenta',label:'Estado de Cuenta',icon:BarChart3},
    ]},
  ];

  const sharedProps={dialog,setDialog,proveedores,facturasCompra,pagosCxP,ordenesCompra,tasaBCV};

  const renderView=()=>{
    switch(sec){
      case 'dashboard':return <DashboardView {...sharedProps}/>;
      case 'proveedores':return <ProveedoresView {...sharedProps}/>;
      case 'ordenes':return <OrdenesCompraView {...sharedProps}/>;
      case 'facturas':return <FacturasCompraView {...sharedProps}/>;
      case 'cxp':return <CxPView {...sharedProps}/>;
      case 'historial':return <HistorialPagosView {...sharedProps}/>;
      case 'estado_cuenta':return <EstadoCuentaProvView {...sharedProps}/>;
      default:return null;
    }
  };

  return (
    <>
      <PSidebarLayout navGroups={navGroups} activeId={sec} onNav={setSec} onBack={onBack}
        headerContent={<div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Módulo Procura · Supply G&B</div>}>
        {renderView()}
      </PSidebarLayout>

      {/* Dialog global */}
      {dialog&&(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center" style={{background:'#0f172a',borderBottom:`3px solid ${ORANGE}`}}>
              <h3 className="font-black text-white text-sm uppercase tracking-widest">{dialog.title}</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 font-medium">{dialog.text}</p>
              <div className="flex justify-end gap-3 mt-6">
                {dialog.type==='confirm'&&<PBo onClick={()=>setDialog(null)}>Cancelar</PBo>}
                <PBg onClick={()=>{if(dialog.onConfirm)dialog.onConfirm();else setDialog(null);}}>
                  {dialog.type==='confirm'?'Confirmar':'Aceptar'}
                </PBg>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProcuraApp;

import React, { useState, useEffect, useMemo } from 'react';
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
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, arrayUnion
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
      onSnapshot(getColRef('facturacion_clientes'), s => setClientes(s.docs.map(d => d.data()))),
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
];

// Denominaciones VES para arqueo
const DENOM_BS  = [500,200,100,50,20,10,5,2,1,0.5,0.25,0.10,0.05,0.01];
const DENOM_USD = [100,50,20,10,5,2,1];

// --- FIN CONSTANTES ---

function BancoApp({ fbUser, onBack, ventasMode = false, systemUsers: systemUsersProp = [] }) {
  // Uses ERP Firebase: getColRef/getDocRef/db
  const [sec, setSec] = useState('dashboard');
  const [submodulo, setSubmodulo] = useState(null); // null | 'banco' | 'caja'
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
  // systemUsers viene de Aplicación.jsx (que sí tiene acceso a la BD correcta)
  // Se mantiene el estado interno para el onSnapshot de respaldo
  const [systemUsersLocal, setSystemUsersLocal] = useState([]);
  // Combinar: primero el prop (más confiable), luego el local
  const systemUsers = systemUsersProp.length > 0 ? systemUsersProp : systemUsersLocal;
  const [cobrosCajaCxc, setCobrosCajaCxc] = useState([]); // cobros_cxc donde cuentaBancariaId empieza con CAJA::
  const [pagosCajaCxP,  setPagosCajaCxP]  = useState([]); // procura_pagos_cxp donde cuentaId empieza con CAJA::

  useEffect(() => {
    if (!fbUser) return;
    const subs = [
      onSnapshot(getColRef('users'), s => setSystemUsersLocal(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(query(getColRef('cobros_cxc'), orderBy('fecha','desc')), s => {
        setCobrosCajaCxc(s.docs.map(d=>d.data()).filter(c=>(c.cuentaBancariaId||'').startsWith('CAJA::')));
      }),
      onSnapshot(query(getColRef('procura_pagos_cxp'), orderBy('fecha','desc')), s => {
        setPagosCajaCxP(s.docs.map(d=>d.data()).filter(p=>(p.cuentaId||'').startsWith('CAJA::')));
      }),
      onSnapshot(getColRef('banco_cuentas'), s => setCuentas(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('caja_cuentas'), s => setCajas(s.docs.map(d=>d.data()))),,
      onSnapshot(getColRef('cxp_terceros_relacionados'), s => setTercerosRel(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('cxp_pagos_relacionados'), s => setPagosRel(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('banco_movimientos'), orderBy('fecha','desc')), s => setMovBanco(s.docs.map(d=>({_docId:d.id,...d.data()})))),
      onSnapshot(query(getColRef('caja_movimientos'), orderBy('fecha','desc')), s => setMovCaja(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('caja_arques'), orderBy('fecha','desc')), s => setArques(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('banco_conciliaciones'), s => setConcils(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('banco_tasas'), orderBy('fecha','desc')), s => setTasas(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('facturacion_clientes'), s => setClientes(s.docs.map(d=>d.data()))),
      onSnapshot(query(getColRef('facturacion_facturas'), orderBy('fechaEmision','desc')), s => setFacturas(s.docs.map(d=>d.data()))),
      onSnapshot(getColRef('compras_proveedores'), s => setProvs(s.docs.map(d=>d.data()))),
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
    const cuentasExt   = cuentas.filter(c=>c.tipoBanco==='Nacional-Ext'||c.tipoBanco==='Internacional');
    const totBs   = cuentasNacBs.reduce((a,c)=>a+Number(c.saldo||0),0);
    const totUSD  = cuentasExt.filter(c=>c.moneda==='USD').reduce((a,c)=>a+Number(c.saldo||0),0);
    const totConsolUSD = totBs/tasaActiva + totUSD;
    const fmtC=(n)=>{const abs=Math.abs(Number(n)||0);if(abs>=1000000)return (n/1000000).toFixed(2)+'M';if(abs>=1000)return (n/1000).toFixed(1)+'K';return bancoFmt(n);};
    const pctBs  = totConsolUSD>0?Math.round((totBs/tasaActiva)/totConsolUSD*100):0;
    const pctUSD = totConsolUSD>0?100-pctBs:0;
    const [tabExplorer, setTabExplorer] = useState('nacionales');
    const [tabSub,      setTabSub]      = useState('All');
    const cuentasMostrar = tabExplorer==='nacionales' ? cuentasNacBs : cuentasExt;

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
                {[{id:'nacionales',label:'NACIONALES (BS)'},{id:'extranjeras',label:'MONEDA EXTRANJERA (USD)'}].map(t=>(
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
    const initF = ()=>({banco:'',numeroCuenta:'',tipoCuenta:'Corriente',tipoBanco:'Nacional-Bs',saldo:'0',titular:'',cuentaContableCod:'',cuentaContableNom:'',logoUrl:''});
    const [form, setForm] = useState(initF());
    const monedaDe = tb => TIPO_BANCO.find(t=>t.id===tb)?.moneda||'BS';

    const openNew  = ()=>{ setEdit(null); setForm(initF()); setModal(true); };
    const openEdit = c  =>{ setEdit(c); setForm({banco:c.banco,numeroCuenta:c.numeroCuenta,tipoCuenta:c.tipoCuenta,tipoBanco:c.tipoBanco||'Nacional-Bs',saldo:String(c.saldo),titular:c.titular||'',cuentaContableCod:c.cuentaContableCod||'',cuentaContableNom:c.cuentaContableNom||'',logoUrl:c.logoUrl||''}); setModal(true); };

    const save = async()=>{
      if(!form.banco||!form.numeroCuenta) return alert('Banco y número requeridos');
      setBusy(true);
      try {
        const moneda=monedaDe(form.tipoBanco);
        if(editando) {
          await updateDoc(getDocRef('banco_cuentas',editando.id),{...form,moneda,saldo:Number(form.saldo)});
        } else {
          const id=bancoGid(); await setDoc(getDocRef('banco_cuentas',id),{...form,id,moneda,saldo:Number(form.saldo),ts:serverTimestamp()});
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
      const [nacBs, ext] = [
        cuentas.filter(c=>c.tipoBanco==='Nacional-Bs'),
        cuentas.filter(c=>c.tipoBanco==='Nacional-Ext'||c.tipoBanco==='Internacional'),
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
      const content=bancoLetterheadOpen('Reporte de Cuentas Bancarias',`Servicios Jiret G&B, C.A. · RIF: J-412309374 · ${bancoDd(getTodayDate())}`)+
        `<h3 style="color:#1e3a5f;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:16px 0 8px">🇻🇪 Cuentas Nacionales — Bolívares</h3>
        <table>${thead}<tbody>${mkRows(nacBs)}</tbody></table>
        <h3 style="color:#065f46;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:20px 0 8px">💵 Cuentas Moneda Extranjera</h3>
        <table>${thead}<tbody>${mkRows(ext)}</tbody></table>`+
        bancoLetterheadClose(`${cuentas.length} cuenta(s) registrada(s)`);
      if(formato==='pdf'){ bancoPrintWindow(content); return; }
      const blob=new Blob([content],{type:'application/vnd.ms-excel;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`cuentas_bancarias_${getTodayDate()}.xls`;a.click();URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-5">
        <style>{PRINT_STYLE}</style>
        {/* Botones de acción */}
        <div className="flex gap-3 justify-end">
          <button onClick={()=>exportarCuentas('pdf')} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-700"><FileText size={12}/> PDF</button>
          <button onClick={()=>exportarCuentas('excel')} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={12}/> Excel</button>
          <BBg onClick={openNew}><Plus size={12}/> Nueva Cuenta</BBg>
        </div>
        {[
          {label:'🇻🇪 Cuentas Nacionales — Bolívares',  tipos:['Nacional-Bs'],  colorHeader:'#1e3a5f', accent:'#3b82f6'},
          {label:'💵 Cuentas Moneda Extranjera / Internacional', tipos:['Nacional-Ext','Internacional'], colorHeader:'#1a3a2a', accent:'#10b981'},
        ].map(grupo=>{
          const lista=cuentas.filter(c=>grupo.tipos.includes(c.tipoBanco||'Nacional-Bs'));
          const totUSD=lista.reduce((a,c)=>{const bs=c.moneda==='BS';return a+(bs?Number(c.saldo)/tasaActiva:Number(c.saldo));},0);
          const totBs =lista.reduce((a,c)=>{const bs=c.moneda==='BS';return a+(bs?Number(c.saldo):Number(c.saldo)*tasaActiva);},0);
          return (
            <div key={grupo.label} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="px-5 py-3 flex items-center justify-between" style={{background:grupo.colorHeader}}>
                <p className="font-black text-white text-xs uppercase tracking-widest">{grupo.label}</p>
                <div className="text-right">
                  <p className="font-mono font-black text-sm" style={{color:grupo.accent==='#3b82f6'?'#93c5fd':'#6ee7b7'}}>Bs. {bancoFmt(totBs)}</p>
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
                  <label key={t.id} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.tipoBanco===t.id?'border-blue-500 bg-blue-50':'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="tipoBancoEdit" value={t.id} checked={form.tipoBanco===t.id} onChange={e=>setForm({...form,tipoBanco:e.target.value})} className="sr-only"/>
                    <span className="text-2xl">{t.flag}</span>
                    <p className="text-[9px] font-black text-slate-700 uppercase text-center leading-tight">{t.id}</p>
                    <BPill usd={t.moneda!=='BS'}>{t.moneda}</BPill>
                  </label>
                ))}
              </div>
            </BFG>
            <BFG label="Banco / Entidad"><input className={inp} value={form.banco} onChange={e=>setForm({...form,banco:e.target.value.toUpperCase()})} placeholder="BANESCO UNIVERSAL"/></BFG>
            <BFG label="Número de Cuenta"><input className={inp} value={form.numeroCuenta} onChange={e=>setForm({...form,numeroCuenta:e.target.value})} placeholder="0134-0000-00-0000000000"/></BFG>
            <BFG label="Tipo de Cuenta"><select className={sel} value={form.tipoCuenta} onChange={e=>setForm({...form,tipoCuenta:e.target.value})}><option>Corriente</option><option>Ahorros</option><option>Nómina</option><option>Divisas</option><option>Custodia</option><option>Swift</option></select></BFG>
            <BFG label="Titular de la Cuenta" full><input className={inp} value={form.titular} onChange={e=>setForm({...form,titular:e.target.value.toUpperCase()})} placeholder="SERVICIOS JIRET G&B C.A."/></BFG>
            <BFG label={`Saldo ${editando?'Actual':'Inicial'} (${monedaDe(form.tipoBanco)})`}><input type="number" step="0.01" className={inp} value={form.saldo} onChange={e=>setForm({...form,saldo:e.target.value})}/></BFG>
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

  const MovimientosView = ({ ventasOnlyIngreso = false }) => {
    const [monedaVista, setMonedaVista] = useState('USD');
    const [searchTercero, setSearchTercero] = useState('');
    const [searchBanco,   setSearchBanco]   = useState('');
    const [searchDestino, setSearchDestino] = useState('');
    const [filtC,    setFiltC]   = useState('');
    const [filtDesde,setFiltD]   = useState(bancoMesActual()+'-01');
    const [filtHasta,setFiltH]   = useState(getTodayDate());
    const [busqCli,  setBusqCli] = useState('');
    const [busqRef,  setBusqRef] = useState('');
    const [detalleId,setDetalle] = useState(null);
    const [editId,   setEditId]  = useState(null);
    const [modal,    setModal]   = useState(ventasOnlyIngreso); // auto-open for ventas
    const [busqCtas, setBusqCtas]= useState({});
    const [busy,     setBusy]    = useState(false);
    const [comprobante, setComprobante] = useState(null); // modal de comprobante imprimible

    // Helper: cuenta selector con grupos Bs/USD — excluye Pago Móvil
    const esBancario = c => c.tipoBanco!=='Pago-Movil' && c.tipoBanco!=='Pago Móvil';
    const CuentaSelector = ({value, onChange, label, excluirId}) => {
      const nacBs=cuentas.filter(c=>c.tipoBanco==='Nacional-Bs'&&c.id!==excluirId&&esBancario(c));
      const ext  =cuentas.filter(c=>(c.tipoBanco==='Nacional-Ext'||c.tipoBanco==='Internacional')&&c.id!==excluirId&&esBancario(c));
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
              {nacBs.filter(c=>!searchBanco||(c.banco+' '+c.numeroCuenta).toUpperCase().includes(searchBanco.toUpperCase())).length>0&&(
                <optgroup label="🇻🇪 Cuentas Nacionales — Bolívares">
                  {nacBs.filter(c=>!searchBanco||(c.banco+' '+c.numeroCuenta).toUpperCase().includes(searchBanco.toUpperCase())).map(c=>(
                    <option key={c.id} value={c.id}>VE {c.banco} · {c.numeroCuenta} · Bs. {bancoFmt(c.saldo)}</option>
                  ))}
                </optgroup>
              )}
              {ext.filter(c=>!searchBanco||(c.banco+' '+c.numeroCuenta).toUpperCase().includes(searchBanco.toUpperCase())).length>0&&(
                <optgroup label="💵 Cuentas Moneda Extranjera">
                  {ext.filter(c=>!searchBanco||(c.banco+' '+c.numeroCuenta).toUpperCase().includes(searchBanco.toUpperCase())).map(c=>(
                    <option key={c.id} value={c.id}>🏦 {c.banco} · {c.numeroCuenta} · {c.moneda==='USD'?'$':'€'} {bancoFmt(c.saldo)}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </BFG>
      );
    };
    const initF = ()=>({fecha:getTodayDate(),tipo:'Ingreso',cuentaId:'',cuentaDestinoId:'',
      monedaOp:'BS',montoOp:'',
      aplicaComision:false,comisionMonto:'',comisionCtaId:'',
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
          // Transferencia/Traslado de Fondo banco a banco (o banco a caja): banco origen→Haber, destino→Debe
          const bsOrigen=esMonedaLocal?montoBs:montoUSD*tasa;
          const usdOrigen=esMonedaLocal?montoBs/tasa:montoUSD;
          // Leer cuenta contable con fallback al campo unificado 'cuentaContable' (cod · nom)
          const splitCta=(c)=>({cod:(c?.cuentaContableCod||c?.cuentaContable?.split('·')[0]||'').trim(),nom:(c?.cuentaContableNom||c?.cuentaContable?.split('·')[1]||c?.banco||'').trim()});
          const ctaDest=splitCta(cuentaDest); const ctaOrig=splitCta(cuentaSel);
          if(form.tipo==='Traslado de Fondo'&&(!ctaDest.cod||!ctaOrig.cod)){
            alert('Error: El banco origen o destino no tiene cuenta contable asignada. Configúrela en Cuentas Bancarias.');
            setBusy(false); return;
          }
          comisionUSD=(destinoEsCaja&&form.aplicaComision)?Number(form.comisionMonto||0)*(form.monedaOp==='BS'?(1/tasa):1):0;
          comisionBs=comisionUSD*tasa;
          if(comisionUSD>0&&!form.comisionCtaId){
            alert('Seleccione la cuenta contable de la comisión/rebancarización.');
            setBusy(false); return;
          }
          todasLineas=[
            {codigo:ctaDest.cod,cuenta:ctaDest.nom||`Banco ${cuentaDest.banco||'Destino'}`,tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:bsOrigen-comisionBs,haberBs:0,debeUSD:usdOrigen-comisionUSD,haberUSD:0},
            {codigo:ctaOrig.cod,cuenta:ctaOrig.nom||`Banco ${cuenta.banco}`,tipoLinea:'H',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:0,haberBs:bsOrigen,debeUSD:0,haberUSD:usdOrigen},
          ];
          if(comisionUSD>0){
            const ctaCom=contCuentas.find(c=>c.id===form.comisionCtaId)||{};
            todasLineas.push({codigo:ctaCom.codigo||'',cuenta:ctaCom.nombre||'Gasto de rebancarización',tipoLinea:'D',nroDoc:form.referencia||'',concepto:form.concepto,tasa,debeBs:comisionBs,haberBs:0,debeUSD:comisionUSD,haberUSD:0});
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
        if((form.tipo==='Transferencia'||form.tipo==='Traslado de Fondo')&&cuentaDest) {
          const comisionNativo=esMonedaLocal?comisionBs:comisionUSD;
          const netoNativo=mNat-comisionNativo;
          const netoBs=esMonedaLocal?montoBs-comisionBs:(montoBs-comisionBs);
          const netoUSD=montoUSD-comisionUSD;
          const idDestino=bancoGid();
          if(destinoEsCaja){
            batch.update(getDocRef('caja_cuentas',cuentaDest.id),{saldoInicial:Number(cuentaDest.saldo)+netoNativo});
            batch.set(getDocRef('caja_movimientos',idDestino),{id:idDestino,fecha:form.fecha,tipo:'Ingreso',cajaId:cuentaDest.id,cajaNombre:cuentaDest.banco,moneda:cuentaDest.moneda,concepto:`Traslado recibido desde ${cuenta.banco} | Ref: ${form.referencia}`,referencia:form.referencia,tasa,monto:netoNativo,montoBs:netoBs,montoUSD:netoUSD,estatus:'No Conciliado',ts:serverTimestamp()});
          } else {
            batch.update(getDocRef('banco_cuentas',cuentaDest.id),{saldo:Number(cuentaDest.saldo)+netoNativo});
            batch.set(getDocRef('banco_movimientos',idDestino),{id:idDestino,fecha:form.fecha,tipo:'Ingreso',cuentaId:cuentaDest.id,cuentaNombre:cuentaDest.banco,tipoBanco:cuentaDest.tipoBanco,moneda:cuentaDest.moneda,origenIngreso:'Transferencia',concepto:`Transferencia recibida desde ${cuenta.banco} | Ref: ${form.referencia}`,referencia:form.referencia,tasa,montoNativo:netoNativo,montoBs:netoBs,montoUSD:netoUSD,saldoAnterior:Number(cuentaDest.saldo),saldoResultante:Number(cuentaDest.saldo)+netoNativo,estatus:'No Conciliado',ts:serverTimestamp()});
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
        // Armar datos del comprobante imprimible
        const comp={
          id,numComp,fecha:form.fecha,concepto:form.concepto,referencia:form.referencia,
          tipo:form.tipo,banco:cuentaSel?.banco||'',moneda:cuentaSel?.moneda||'',
          montoBs,montoUSD,tasa,
          lineas:todasLineas,
          totDebeBs:todasLineas.reduce((a,l)=>a+l.debeBs,0),
          totHaberBs:todasLineas.reduce((a,l)=>a+l.haberBs,0),
          totDebeUSD:todasLineas.reduce((a,l)=>a+l.debeUSD,0),
          totHaberUSD:todasLineas.reduce((a,l)=>a+l.haberUSD,0),
          terceroNombre:tercero?.nombre||'',
        };
        setModal(false); setForm(initF()); setBusqCtas({});
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
        await batch.commit();
        setEditId(null); setDetalle(null); setForm(initF());
      } catch(e) {
        alert('❌ No se pudo guardar: '+(e?.message||e));
        console.error('saveEdit error:', e);
      } finally { setBusy(false); }
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
      setForm({...initF(),fecha:m.fecha,tipo:m.tipo,cuentaId:m.cuentaId,
        origenIngreso:m.origenIngreso||'Venta',motivoEgreso:m.motivoEgreso||'Pago Proveedor',
        concepto:m.concepto,referencia:m.referencia||'',
        tasa:String(m.tasa||tasaActiva),montoNativo:String(m.montoNativo||''),
        aplicaTercero:m.aplicaTercero||false,tipoTercero:m.tipoTercero||'Cliente',terceroId:m.terceroId||'',
        ctaContraId:m.ctaContraId||'',ctaContraNombre:m.ctaContraNombre||''});
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
      if(filtDesde && m.fecha<filtDesde)     return false;
      if(filtHasta && m.fecha>filtHasta)     return false;
      if(busqCli && !(m.terceroNombre||m.clientName||m.proveedor||m.concepto||'').toUpperCase().includes(busqCli.toUpperCase())) return false;
      if(busqRef && !(m.referencia||'').toUpperCase().includes(busqRef.toUpperCase())) return false;
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

    return (
      <div>
        {/* ── MODAL DETALLE / EDICIÓN ── */}
        {movDetalle && (
          <BModal open={!!movDetalle} onClose={()=>{setDetalle(null);setEditId(null);setForm(initF());}} title={editId?`✏ Editando — ${movDetalle.concepto}`:`Movimiento — ${movDetalle.concepto}`} {...(editId?{xlwide:true}:{wide:true})}
            footer={
              editId
                ? <><BBo onClick={()=>{setEditId(null);setForm(initF());}}>Cancelar</BBo><BBg onClick={saveEdit} disabled={busy}>{busy?'Guardando...':'Guardar Cambios'}</BBg></>
                : <><BBd onClick={()=>setPwdModal(movDetalle)} disabled={busy||movDetalle.estatus==='Conciliado'}>{movDetalle.estatus==='Conciliado'?'🔒 Conciliado':'🗑 Eliminar'}</BBd><div className="flex-1"/><BBg onClick={()=>abrirEdicion(movDetalle)}>✏ Editar</BBg></>
            }>
            {editId ? (
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
                <div className={`grid ${form.tipo==='Transferencia'?'grid-cols-1':'grid-cols-2'} gap-4 items-start`}>
                  <BFG label={`Cuenta Bancaria (${cuentas.length} disponibles)`}>
                    <select className={sel} value={form.cuentaId} onChange={e=>setForm({...form,cuentaId:e.target.value})}>
                      <option value="">— Seleccione la cuenta —</option>
                      {cuentas.map(c=>{const tb=TIPO_BANCO.find(t=>t.id===c.tipoBanco)||TIPO_BANCO[0];return<option key={c.id} value={c.id}>{tb.flag} {c.banco} · {c.numeroCuenta} · {c.moneda==='BS'?'Bs.':'$'} {bancoFmt(c.saldo)}</option>;})}
                    </select>
                  </BFG>
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
                    <BFG label="Tasa Bs/$"><input type="number" step="0.01" className={inp} value={form.tasa} onChange={e=>setForm({...form,tasa:e.target.value})}/></BFG>
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-3 border-l-4 border-emerald-500 border border-slate-100">
                          <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest mb-1">DÉBITO +</p>
                          <p className="text-[11px] font-black text-slate-800">{form.tipo==='Ingreso'?(cuentaSel.cuentaContable||`Banco ${cuentaSel.banco}`):(form.ctaContraNombre||'[Cuenta Gasto/Proveedor]')}</p>
                          {mNat>0&&<div className="mt-1"><p className="font-mono font-black text-emerald-600 text-xs">{bs?`Bs. ${bancoFmt(montoBs)}`:`$${bancoFmt(montoUSD)}`}</p><p className="font-mono text-slate-400 text-[10px]">{bs?`≈ $${bancoFmt(montoUSD)}`:`≈ Bs. ${bancoFmt(montoBs)}`}</p></div>}
                        </div>
                        <div className="bg-white rounded-xl p-3 border-l-4 border-red-500 border border-slate-100">
                          <p className="text-[8px] font-black uppercase text-red-600 tracking-widest mb-1">CRÉDITO −</p>
                          <p className="text-[11px] font-black text-slate-800">{form.tipo==='Egreso'?(cuentaSel.cuentaContable||`Banco ${cuentaSel.banco}`):(form.ctaContraNombre||'[CxC / Ingreso]')}</p>
                          {mNat>0&&<div className="mt-1"><p className="font-mono font-black text-red-600 text-xs">{bs?`Bs. ${bancoFmt(montoBs)}`:`$${bancoFmt(montoUSD)}`}</p><p className="font-mono text-slate-400 text-[10px]">{bs?`≈ $${bancoFmt(montoUSD)}`:`≈ Bs. ${bancoFmt(montoBs)}`}</p></div>}
                        </div>
                      </div>
                      <BFG label="Cuenta Contrapartida (PUC)">
                        <select className={sel} value={form.ctaContraId} onChange={e=>{const c=contCuentas.find(x=>x.id===e.target.value);setForm({...form,ctaContraId:e.target.value,ctaContraNombre:c?`${c.codigo} · ${c.nombre}`:''})}}>
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
                  // Reconstruir lineas dinámicamente desde datos del banco si no hay asiento guardado
                  const ctaOrig = cuentas.find(c=>c.id===movDetalle.cuentaId);
                  const ctaDest = cuentas.find(c=>c.id===movDetalle.cuentaDestinoId);
                  const splitCta = c => ({
                    cod:(c?.cuentaContableCod||c?.cuentaContable?.split('·')[0]||'').trim(),
                    nom:(c?.cuentaContableNom||c?.cuentaContable?.split('·')[1]||c?.banco||'').trim()
                  });
                  // Líneas a mostrar: prioridad → lineas del asiento guardado → reconstruidas
                  let lineasMostrar = [];
                  if(asientoLinked?.lineas?.length > 0) {
                    lineasMostrar = asientoLinked.lineas;
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
            {cuentas.filter(c=>c.tipoBanco==='Nacional-Bs').length>0&&<optgroup label="🇻🇪 Bolívares">
              {cuentas.filter(c=>c.tipoBanco==='Nacional-Bs').map(c=><option key={c.id} value={c.id}>{c.banco}</option>)}
            </optgroup>}
            {cuentas.filter(c=>c.tipoBanco!=='Nacional-Bs').length>0&&<optgroup label="💵 Moneda Extranjera">
              {cuentas.filter(c=>c.tipoBanco!=='Nacional-Bs').map(c=><option key={c.id} value={c.id}>{c.banco} ({c.moneda})</option>)}
            </optgroup>}
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
          {(filtC||filtDesde||filtHasta||busqCli||busqRef)&&<button onClick={()=>{setFiltC('');setFiltD('');setFiltH('');setBusqCli('');setBusqRef('');}} className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 px-2">✕ Limpiar</button>}
          <button onClick={()=>exportarMovimientos('excel')} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={12}/> Excel</button>
          <BBg onClick={()=>{setForm(initF());setModal(true);}}><Plus size={13}/> Nuevo</BBg>
        </div>

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

        {/* ── TABLA INTERNACIONALES — USD/ME ── */}
        {!filtC&&(()=>{const movRows=movFiltUSD; return(
          <BCard title={`🌐 Cuentas Internacionales & Moneda Extranjera`} subtitle={`${movRows.length} movimiento(s)`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><BTh>Fecha</BTh><BTh>Tipo</BTh><BTh>Banco</BTh><BTh>Concepto / Tercero</BTh><BTh>Referencia</BTh><BTh right>$</BTh><BTh right>Tasa</BTh><BTh>Estado</BTh><BTh></BTh></tr></thead>
                <tbody>
                  {movRows.length===0&&<tr><td colSpan={9}><BEmptyState icon={ArrowLeftRight} title="Sin movimientos internacionales" desc="Registre transacciones en cuentas USD"/></td></tr>}
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
        <BModal open={modal} onClose={()=>{setModal(false);setForm(initF());}} title="" xlwide noHeader noClip>
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
                  <button onClick={()=>{setModal(false);setForm(initF());}} className="text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
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
          <select className={`${sel} border-orange-400`} value={form.cuentaDestinoId} onChange={e=>setForm({...form,cuentaDestinoId:e.target.value,comisionMonto:'',aplicaComision:false})}>
            <option value="">— Seleccione destino —</option>
            <optgroup label="🏦 Bancos">
              {cuentas.filter(c=>c.id!==form.cuentaId&&esBancario(c)&&(!searchDestino||(c.banco+' '+c.numeroCuenta).toUpperCase().includes(searchDestino.toUpperCase()))).map(c=>(
                <option key={c.id} value={c.id}>{c.banco} · {c.numeroCuenta} · {c.moneda==='BS'?'Bs.':'$'}{bancoFmt(c.saldo)}</option>
              ))}
            </optgroup>
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
        <div className="relative">
          <input type="number" step="0.01" className={`${inp} bg-white`} value={form.tasa} onChange={e=>{
            const v=e.target.value; const tasaN=Number(v)||tasaActiva; const montoOpN=Number(form.montoOp)||0;
            const usdEq=form.monedaOp==='USD'?montoOpN:(montoOpN/tasaN);
            const nativo=bs?(usdEq*tasaN):usdEq;
            setForm({...form,tasa:v,montoUSD:String(usdEq),montoNativo:String(nativo)});
          }}/>
          <RefreshCw size={14} className="absolute right-3 top-2.5 text-blue-400"/>
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
{form.tipo==='Traslado de Fondo'&&destinoEsCaja&&(
  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mt-3">
    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-800 mb-2 cursor-pointer">
      <input type="checkbox" checked={form.aplicaComision} onChange={e=>setForm({...form,aplicaComision:e.target.checked,comisionMonto:e.target.checked?form.comisionMonto:''})} className="accent-amber-600"/>
      Hubo comisión o gasto de rebancarización
    </label>
    {form.aplicaComision&&(
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Monto Comisión ({form.monedaOp==='BS'?'Bs':'USD'})</label>
          <input type="number" step="0.01" className={`${inp} bg-white`} value={form.comisionMonto} onChange={e=>setForm({...form,comisionMonto:e.target.value})}/>
        </div>
        <div>
          <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Cuenta Contable del Gasto</label>
          <select className={`${sel} bg-white`} value={form.comisionCtaId} onChange={e=>setForm({...form,comisionCtaId:e.target.value})}>
            <option value="">— Seleccione cuenta —</option>
            {contCuentas.filter(c=>c.nombre?.toUpperCase().includes('COMIS')||c.nombre?.toUpperCase().includes('BANCARI')||c.nombre?.toUpperCase().includes('FINANC')).map(c=>(
              <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
            ))}
          </select>
        </div>
      </div>
    )}
  </div>
)}
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
                <button onClick={()=>{setModal(false);setForm(initF());}} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={18}/></button>
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
                            const comUSD=(destinoEsCaja&&form.aplicaComision)?Number(form.comisionMonto||0)*(form.monedaOp==='BS'?(1/tasa):1):0;
                            const comBs=comUSD*tasa;
                            lines.push({cod:dCod,nom:cuentaDest.banco,dBs:bsV-comBs,hBs:0,dU:usdV-comUSD,hU:0,color:'text-amber-400'});
                            lines.push({cod:bancoCod,nom:bancoNom,dBs:0,hBs:bsV,dU:0,hU:usdV,color:'text-red-400'});
                            if(comUSD>0){
                              const ctaCom=contCuentas.find(c=>c.id===form.comisionCtaId);
                              lines.push({cod:ctaCom?String(ctaCom.codigo):'',nom:ctaCom?ctaCom.nombre:'Comisión/rebancarización',dBs:comBs,hBs:0,dU:comUSD,hU:0,color:'text-orange-300'});
                            }
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
                            <tr key={i} className="border-b border-slate-800/50">
                              <td className="py-2">
                                <span className={`${l.color} block truncate max-w-[120px]`}>{l.cod&&<span className="text-blue-400 mr-1">{l.cod}</span>}{l.nom}</span>
                              </td>
                              <td className="text-right px-1 font-bold">{l.dBs>0?l.dBs.toFixed(2):''}</td>
                              <td className="text-right px-1 text-slate-500">{l.hBs>0?l.hBs.toFixed(2):''}</td>
                              <td className="text-right px-1 font-bold text-emerald-400">{l.dU>0?l.dU.toFixed(2):''}</td>
                              <td className="text-right px-1 text-emerald-800">{l.hU>0?l.hU.toFixed(2):''}</td>
                            </tr>
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
                <button onClick={()=>{setModal(false);setForm(initF());}} className="w-full py-2 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </BModal>
      </div>
    );
  };

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
      // Cobros CxC / Pagos CxP registrados a través de esta caja — se excluyen los que ya tienen su
      // propio movimiento directo en caja_movimientos (mismo grupoCobroId/grupoPagoId) para no contar dos veces:
      // Aplicación.jsx crea AMBOS registros (cobros_cxc/procura_pagos_cxp Y caja_movimientos) para la misma entrada de caja.
      const cobrosCaja = cobrosCajaCxc.filter(c=>(c.cuentaBancariaId||'').replace('CAJA::','')===cajaId&&!c.grupoCobroId);
      const bsCobros  = cobrosCaja.filter(c=>esBs(c.moneda)).reduce((a,c)=>{const tasa=Number(c.tasa||tasaActiva)||tasaActiva;return a+(Number(c.montoBs||0)||(Number(c.monto||0)*tasa));},0);
      const usdCobros = cobrosCaja.filter(c=>!esBs(c.moneda)).reduce((a,c)=>a+Number(c.monto||0),0);
      const pagosCaja = pagosCajaCxP.filter(p=>(p.cuentaId||'').replace('CAJA::','')===cajaId&&!p.grupoPagoId);
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
  const CajaOpView = () => {
    const [modal, setModal] = useState(false);
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
    const [cajaDet, setCajaDet]   = useState(null);   // movimiento seleccionado para ver/editar
    const [cajaEdit, setCajaEdit] = useState(false);   // modo edición
    const [cajaPwdModal, setCajaPwdModal] = useState(null); // movimiento a eliminar
    const [cajaPwd, setCajaPwd]   = useState('');
    const [cajaPwdErr, setCajaPwdErr] = useState(false);
    const initF = ()=>({fecha:getTodayDate(),tipo:'Ingreso',moneda:'BS',concepto:'',referencia:'',monto:'',tasa:String(tasaActiva),aplicaTercero:false,tipoTercero:'Cliente',terceroId:''});
    const [form, setForm] = useState(initF());
    const monto  = Number(form.monto)||0;
    const tasa   = Number(form.tasa)||tasaActiva;
    const montoBs  = form.moneda==='BS' ? monto : monto*tasa;
    const montoUSD = form.moneda==='BS' ? monto/tasa : monto;
    // Movimientos de caja manuales + movimientos del banco_movimientos (cobros CxC y pagos CxP del ERP)
    // ── Cobros CxC / Pagos CxP registrados a través de cajas (con CAJA::) ──
    // Aplicación.jsx siempre crea un movimiento DIRECTO en caja_movimientos (con grupoCobroId/grupoPagoId)
    // por cada línea de cobro/pago que pasó por caja — si además re-derivamos desde cobros_cxc/procura_pagos_cxp,
    // el mismo dinero aparece dos veces. Cualquier registro con ese grupo YA tiene su movimiento directo,
    // así que se excluye siempre (no solo cuando el grupo ya cargó en pantalla).
    const movDesdeCobrosCaja = cobrosCajaCxc.filter(c=>!c.grupoCobroId).map(c=>{
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
    const movDesdePagosCaja = pagosCajaCxP.filter(p=>!p.grupoPagoId).map(p=>{
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
      if(!form.monto||monto<=0) return alert('Ingrese un monto válido');
      if(!form.concepto) return alert('Ingrese el concepto');
      setBusy(true);
      try {
        const id=bancoGid(); const tercero=form.tipoTercero==='Cliente'?clientes.find(c=>c.id===form.terceroId):provs.find(p=>p.id===form.terceroId);
        await setDoc(getDocRef('caja_movimientos',id),{id,fecha:form.fecha,tipo:form.tipo,moneda:form.moneda,concepto:form.concepto,referencia:form.referencia,monto,montoBs,montoUSD,tasa,aplicaTercero:form.aplicaTercero,tipoTercero:form.tipoTercero,terceroId:tercero?.id||'',terceroNombre:tercero?.nombre||'',ts:serverTimestamp()});
        setModal(false); setForm(initF()); setBusqCtas({});
      } finally { setBusy(false); }
    };

    const abrirEditCaja = (m) => {
      setCajaDet(m); setCajaEdit(false); // siempre abre en modo vista; editar solo manual
      if(m._fromBanco) return; // para ERP solo vista
      setCajaEdit(true);
      setForm({fecha:m.fecha||getTodayDate(),tipo:m.tipo||'Ingreso',moneda:m.moneda||'BS',concepto:m.concepto||'',referencia:m.referencia||'',monto:String(m.monto||''),tasa:String(m.tasa||tasaActiva),aplicaTercero:m.aplicaTercero||false,tipoTercero:m.tipoTercero||'Cliente',terceroId:m.terceroId||''});
    };

    const guardarEditCaja = async() => {
      if(!cajaDet) return;
      setBusy(true);
      try {
        await updateDoc(getDocRef('caja_movimientos',cajaDet.id),{fecha:form.fecha,tipo:form.tipo,moneda:form.moneda,concepto:form.concepto,referencia:form.referencia,updatedAt:Date.now()});
        setCajaDet(null); setCajaEdit(false); setForm(initF());
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
            {(cajFiltCaja||cajFiltTipo||cajFiltDesde||cajFiltHasta||cajBusqCli||cajBusqRef)&&(
              <button onClick={()=>{setCajFiltCaja('');setCajFiltTipo('');setCajFiltDesde('');setCajFiltHasta('');setCajBusqCli('');setCajBusqRef('');}}
                className="text-[10px] font-black text-slate-400 hover:text-red-500 transition-all">× LIMPIAR</button>
            )}
            <div className="ml-auto flex gap-2">
              <BBp onClick={exportarExcelCaja} sm><FileSpreadsheet size={12}/> Excel</BBp>
              <BBg onClick={()=>{setForm(initF());setModal(true);}} sm><Plus size={12}/> Nuevo</BBg>
            </div>
          </div>
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
            {cajaEdit?(
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <BFG label="Fecha"><input type="date" className={inp} value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></BFG>
                  <BFG label="Referencia"><input className={inp} value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})}/></BFG>
                </div>
                <BFG label="Concepto" full><input className={inp} value={form.concepto} onChange={e=>setForm({...form,concepto:e.target.value})}/></BFG>
              </div>
            ):(
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

        <BModal open={modal} onClose={()=>setModal(false)} title="Movimiento de Caja" wide
          footer={<><BBo onClick={()=>setModal(false)}>Cancelar</BBo><BBg onClick={save} disabled={busy}>{busy?'Registrando...':'Registrar'}</BBg></>}>
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <BFG label="Fecha"><input type="date" className={inp} value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></BFG>
              <BFG label="Tipo">
                <div className="flex gap-1">
                  {['Ingreso','Egreso'].map(t=>(
                    <button key={t} onClick={()=>setForm({...form,tipo:t})}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${form.tipo===t?t==='Ingreso'?'bg-emerald-500 text-white border-emerald-500':'bg-red-500 text-white border-red-500':'bg-white text-slate-500 border-slate-200'}`}>{t}</button>
                  ))}
                </div>
              </BFG>
              <BFG label="Moneda de Efectivo">
                <div className="flex gap-1">
                  {[{m:'BS',l:'Bs. 🇻🇪'},{m:'USD',l:'USD 🇺🇸'}].map(({m,l})=>(
                    <button key={m} onClick={()=>setForm({...form,moneda:m})}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${form.moneda===m?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>{l}</button>
                  ))}
                </div>
              </BFG>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <BFG label={`Monto (${form.moneda})`}><input type="number" step="0.01" min="0.01" className={`${inp} font-black text-lg`} value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})} placeholder="0.00"/></BFG>
              <BFG label="Tasa de Cambio Bs/$"><input type="number" step="0.01" className={inp} value={form.tasa} onChange={e=>setForm({...form,tasa:e.target.value})}/></BFG>
              <div className="flex flex-col justify-end pb-0.5">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Equivalencia</p>
                <div className="rounded-xl p-3 text-center" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
                  <p className="text-emerald-400 font-mono font-black text-base">{'$'+bancoFmt(montoUSD)}</p>
                  <p className="text-slate-400 text-[10px]">Bs.{bancoFmt(montoBs)}</p>
                </div>
              </div>
            </div>
            <BFG label="Concepto" full><input className={inp} value={form.concepto} onChange={e=>setForm({...form,concepto:e.target.value})} placeholder="Descripción del movimiento de caja..."/></BFG>
            <BFG label="Referencia"><input className={inp} value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})} placeholder="REF-000"/></BFG>
            {/* Tercero */}
            <div className="border-2 border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Vincular a Tercero</p>
                <button onClick={()=>setForm({...form,aplicaTercero:!form.aplicaTercero,terceroId:''})}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.aplicaTercero?'bg-orange-500':'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.aplicaTercero?'left-6':'left-0.5'}`}/>
                </button>
              </div>
              {form.aplicaTercero&&<div className="grid grid-cols-2 gap-3">
                <BFG label="Tipo"><div className="flex gap-1">{['Cliente','Proveedor'].map(t=>(
                  <button key={t} onClick={()=>setForm({...form,tipoTercero:t,terceroId:''})} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${form.tipoTercero===t?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>{t}</button>
                ))}</div></BFG>
                <BFG label={form.tipoTercero==='Cliente'?`Clientes (${clientes.length})`:`Proveedores (${provs.length})`}>
                  <select className={sel} value={form.terceroId} onChange={e=>setForm({...form,terceroId:e.target.value})}>
                    <option value="">— Seleccione —</option>
                    {form.tipoTercero==='Cliente'
                      ?clientes.map(c=><option key={c.id} value={c.id}>{c.rif} · {c.nombre}</option>)
                      :provs.map(p=><option key={p.id} value={p.id}>{p.rif||''} · {p.nombre}</option>)}
                  </select>
                </BFG>
              </div>}
            </div>
          </div>
        </BModal>
      </div>
    );
  };

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
  // 5b. RELACIÓN DE VALES (dinero en caja aún no recibido físicamente)
  // ══════════════════════════════════════════════════════════════════════
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
      const s2=onSnapshot(getColRef('facturacion_clientes'),s=>setClientes2(s.docs.map(d=>d.data())));
      const s3=onSnapshot(getColRef('compras_proveedores'),s=>setProvs2(s.docs.map(d=>d.data())));
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

        {/* Información del módulo */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5"/>
          <div className="text-[11px] text-amber-700 space-y-0.5">
            <p className="font-black">¿Qué es un Vale de Caja?</p>
            <p>Dinero contabilizado en caja pero que físicamente tiene un tercero. Ej: Luis Ferrer tiene $100 en vale — el efectivo está registrado pero no ha ingresado físicamente.</p>
            <p>Puede <strong>bajar el vale</strong> para: <strong>Pagar a Proveedor</strong>, <strong>Llevar a CxC</strong>, o marcar como <strong>Cobrado</strong>.</p>
          </div>
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
              <thead><tr><BTh>Fecha</BTh><BTh>Moneda</BTh><BTh right>Total Contado</BTh></tr></thead>
              <tbody>{arques.map(a=><tr key={a.id} className="hover:bg-slate-50">
                <BTd>{bancoDd(a.fecha)}</BTd><BTd><BPill usd>USD</BPill></BTd>
                <BTd right mono className="font-black text-slate-900">$ {bancoFmt(a.totalArqueo)}</BTd>
              </tr>)}</tbody>
              <tfoot><tr style={{background:'#0f172a'}}>
                <td className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 text-left">RESULTADO DEL ARQUEO</td>
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

        <BModal open={modal} onClose={()=>setModal(false)} title="Arqueo de Caja — Dólares (USD)" wide
          footer={<><BBo onClick={()=>setModal(false)}>Cancelar</BBo><BBg onClick={save} disabled={busy}>{busy?'Guardando...':'Guardar Arqueo'}</BBg></>}>
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
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // 6. CONCILIACIÓN BANCARIA
  // ══════════════════════════════════════════════════════════════════════
  const ConciliacionView = () => {
    const [cuentaId,setCuentaId]=useState('');const [desde,setDesde]=useState(bancoMesActual()+'-01');const [hasta,setHasta]=useState(getTodayDate());
    const [saldoBanco,setSaldoBco]=useState('');const [marcados,setMarcados]=useState({});const [ajustes,setAjustes]=useState([]);const [busy,setBusy]=useState(false);
    const cuenta=cuentas.find(c=>c.id===cuentaId);
    const esCuentaBs=cuenta?.tipoBanco==='Nacional-Bs'||cuenta?.moneda==='BS';
    const todos=movBanco.filter(m=>m.cuentaId===cuentaId&&m.estatus!=='Conciliado');
    const toggle=id=>setMarcados(p=>({...p,[id]:!p[id]}));
    const egTrans=todos.filter(m=>m.tipo==='Egreso' &&!marcados[m.id]).reduce((a,m)=>a+Number(m.montoUSD||0),0);
    const ingTrans=todos.filter(m=>m.tipo==='Ingreso'&&!marcados[m.id]).reduce((a,m)=>a+Number(m.montoUSD||0),0);
    const cargos=ajustes.filter(a=>a.tipo==='Cargo' ).reduce((a,x)=>a+Number(x.monto||0),0);
    const abonos=ajustes.filter(a=>a.tipo==='Abono' ).reduce((a,x)=>a+Number(x.monto||0),0);
    const saldoLibrosUSD=cuenta?Number(cuenta.moneda==='BS'?Number(cuenta.saldo)/tasaActiva:cuenta.saldo):0;
    const saldoLibrosBs =cuenta?Number(cuenta.moneda==='BS'?Number(cuenta.saldo):Number(cuenta.saldo)*tasaActiva):0;
    const saldoLibros=saldoLibrosUSD; // alias para compatibilidad con lógica de cuadre
    const saldoConcil=saldoLibros+cargos-abonos+egTrans-ingTrans;
    const sbNum=Number(saldoBanco)||0;const diff=sbNum-saldoConcil;const OK=Math.abs(diff)<0.01&&sbNum>0;
    const aprobar=async()=>{
      if(!OK)return alert('Diferencia debe ser $0.00');
      if(!window.confirm('¿Aprobar conciliación? Acción IRREVERSIBLE.'))return;
      setBusy(true);
      try{const batch=writeBatch(_bancoDB);const ids=Object.entries(marcados).filter(([,v])=>v).map(([k])=>k);ids.forEach(id=>batch.update(getDocRef('banco_movimientos',id),{estatus:'Conciliado'}));const id=bancoGid();batch.set(getDocRef('banco_conciliaciones',id),{id,cuentaId,cuentaNombre:cuenta.banco,desde,hasta,saldoBanco:sbNum,saldoLibros,egTrans,ingTrans,cargos,abonos,saldoConcil,diff,count:ids.length,ajustes,fecha:getTodayDate(),ts:serverTimestamp()});await batch.commit();setMarcados({});setSaldoBco('');setAjustes([]);alert(`✅ ${ids.length} movimiento(s) conciliados.`);}finally{setBusy(false);}
    };
    return(<div className="space-y-5">
      <BCard title="Parámetros de Conciliación"><div className="grid grid-cols-4 gap-4">
        <BFG label="Cuenta" full><select className={sel} value={cuentaId} onChange={e=>{setCuentaId(e.target.value);setMarcados({});setAjustes([]);setSaldoBco('');}}>
          <option value="">— Seleccione cuenta a conciliar —</option>
          {[{label:'Cuentas Nacionales Bs.',items:cuentas.filter(c=>c.tipoBanco==='Nacional-Bs')},
            {label:'Cuentas Moneda Extranjera',items:cuentas.filter(c=>c.tipoBanco!=='Nacional-Bs')}
          ].map(g=>g.items.length>0&&(<optgroup key={g.label} label={g.label}>{g.items.map(c=><option key={c.id} value={c.id}>{c.banco} · {c.numeroCuenta} · {c.moneda==='BS'?'Bs.':'$'} {bancoFmt(c.saldo)}</option>)}</optgroup>))}
        </select></BFG>
        <BFG label="Desde"><input type="date" className={inp} value={desde} onChange={e=>setDesde(e.target.value)}/></BFG>
        <BFG label="Hasta"><input type="date" className={inp} value={hasta} onChange={e=>setHasta(e.target.value)}/></BFG>
        <BFG label={esCuentaBs?'Saldo según Banco (Bs.)':'Saldo según Banco ($)'}><input type="number" step="0.01" className={`${inp} font-black ${OK?'border-emerald-400 bg-emerald-50':sbNum>0?'border-amber-300':''}`} value={saldoBanco} onChange={e=>setSaldoBco(e.target.value)} placeholder={esCuentaBs?'0,00 Bs.':'0.00'}/></BFG>
      </div></BCard>
      {cuentaId&&<div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <BCard title={`Movimientos a Conciliar (${todos.length})`} subtitle="Marque los que aparecen en el estado de cuenta">
            {todos.length===0?<BEmptyState icon={CheckCircle} title="Sin movimientos pendientes" desc=""/>:
              <div className="divide-y divide-slate-100">{todos.map(m=>(
                <label key={m.id} className={`flex items-center gap-4 py-3 px-2 cursor-pointer rounded-xl hover:bg-slate-50 ${marcados[m.id]?'bg-emerald-50/60':''}`}>
                  <input type="checkbox" checked={!!marcados[m.id]} onChange={()=>toggle(m.id)} className="w-4 h-4 accent-emerald-500 flex-shrink-0"/>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><BBadge v={m.tipo==='Ingreso'?'green':m.tipo==='Egreso'?'red':'blue'}>{m.tipo}</BBadge><span className="text-[10px] text-slate-400">{bancoDd(m.fecha)}</span></div><p className="text-xs font-semibold text-slate-700 truncate">{m.concepto}</p></div>
                  <div className="text-right flex-shrink-0"><p className={`font-mono font-black text-sm ${m.tipo==='Ingreso'?'text-emerald-600':'text-red-500'}`}>{'$'+bancoFmt(m.montoUSD)}</p><p className="text-[10px] text-slate-400">Bs.{bancoFmt(m.montoBs)}</p></div>
                  {marcados[m.id]&&<CheckCircle size={16} className="text-emerald-500 flex-shrink-0"/>}
                </label>
              ))}</div>}
          </BCard>
          <BCard title="Ajustes Bancarios (NC / ND)" subtitle="Comisiones, intereses no contabilizados"
            action={<button onClick={()=>setAjustes([...ajustes,{tipo:'Cargo',concepto:'',monto:''}])} className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg"><Plus size={12}/> Ajuste</button>}>
            {ajustes.length===0?<p className="text-xs text-slate-400 text-center py-3">Sin ajustes bancarios</p>:
              <div className="space-y-2">{ajustes.map((a,i)=>(
                <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <select className={`${sel} w-28`} value={a.tipo} onChange={e=>{const n=[...ajustes];n[i].tipo=e.target.value;setAjustes(n);}}><option value="Cargo">N. Débito</option><option value="Abono">N. Crédito</option></select>
                  <input className={`${inp} flex-1`} placeholder="Comisión, intereses..." value={a.concepto} onChange={e=>{const n=[...ajustes];n[i].concepto=e.target.value;setAjustes(n);}}/>
                  <input type="number" step="0.01" className={`${inp} w-28 text-right`} value={a.monto} onChange={e=>{const n=[...ajustes];n[i].monto=e.target.value;setAjustes(n);}}/>
                  <button onClick={()=>setAjustes(ajustes.filter((_,j)=>j!==i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={12}/></button>
                </div>
              ))}</div>}
          </BCard>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm sticky top-4">
            <div className="px-5 py-4" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)'}}><p className="font-black text-white text-sm uppercase tracking-widest">Panel de Cuadre</p></div>
            <div className="p-5 space-y-3">
              {[{l:'Saldo en Libros (Sistema)',v:saldoLibros,vbs:saldoLibrosBs,c:'text-slate-900',b:true},{l:'(+) Cargos NC',v:cargos,vbs:cargos*tasaActiva,c:'text-red-600'},{l:'(−) Abonos NC',v:abonos,vbs:abonos*tasaActiva,c:'text-emerald-600'},{l:'(+) Egresos Tránsito',v:egTrans,vbs:egTrans*tasaActiva,c:'text-red-500'},{l:'(−) Ingresos Tránsito',v:ingTrans,vbs:ingTrans*tasaActiva,c:'text-emerald-500'}].map(({l,v,vbs,c,b})=>(
                <div key={l} className="flex items-center justify-between"><p className={`text-[10px] ${b?'font-black text-slate-700':'font-medium text-slate-500'} leading-tight max-w-[150px]`}>{l}</p>
                  <div className="text-right"><p className={`font-mono font-black text-sm ${c}`}>{esCuentaBs?'Bs.'+bancoFmt(vbs):'$'+bancoFmt(v)}</p><p className="text-[9px] text-slate-400 font-mono">{esCuentaBs?'≈$'+bancoFmt(v):'≈Bs.'+bancoFmt(vbs)}</p></div>
                </div>
              ))}
              <div className="border-t-2 border-slate-200 pt-3 space-y-1">
                <div className="flex items-center justify-between"><p className="text-[10px] font-black text-slate-700 uppercase">= Saldo Conciliado</p><p className="font-mono font-black text-blue-600">{esCuentaBs?'Bs.'+bancoFmt(saldoConcil*tasaActiva):'$'+bancoFmt(saldoConcil)}</p></div>
                <div className="flex items-center justify-between"><p className="text-[10px] font-black text-slate-500 uppercase">Saldo según Banco</p><p className="font-mono font-black text-slate-900">{esCuentaBs?'Bs.'+bancoFmt(sbNum):'$'+bancoFmt(sbNum)}</p></div>
              </div>
              <div className={`rounded-xl p-4 text-center border-2 ${OK?'border-emerald-400 bg-emerald-50':'border-amber-400 bg-amber-50'}`}>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-500">Diferencia</p>
                <p className={`font-mono font-black text-2xl ${OK?'text-emerald-600':'text-amber-600'}`}>{'$'+bancoFmt(diff)}</p>
                {OK?<p className="text-[10px] text-emerald-600 font-black mt-1">✓ Cuadrado</p>:<p className="text-[10px] text-amber-600 font-black mt-1">Pendiente</p>}
              </div>
              <BBg onClick={aprobar} disabled={!OK||busy}>{busy?<><RefreshCw size={13} className="animate-spin"/> Procesando...</>:<><CheckCircle size={13}/> Aprobar</>}</BBg>
              <p className="text-[9px] text-slate-400 text-center">Al aprobar los movimientos quedan bloqueados.</p>
            </div>
          </div>
        </div>
      </div>}
      {!cuentaId&&<BEmptyState icon={Building2} title="Seleccione una cuenta bancaria" desc="Elija la cuenta para iniciar la conciliación"/>}
    </div>);
  };

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
    const [form,setForm]=useState({fecha:getTodayDate(),modulo:'Todos',moneda:'USD',tasaRef:'',fuente:'Oficial / BCV'});
    const save=async()=>{if(!form.tasaRef)return;setBusy(true);try{const id=bancoGid();await setDoc(getDocRef('banco_tasas',id),{...form,tasaRef:Number(form.tasaRef),id,ts:serverTimestamp()});setModal(false);setForm({fecha:getTodayDate(),modulo:'Todos',moneda:'USD',tasaRef:'',fuente:'Oficial / BCV'});}finally{setBusy(false);}};
    return(<div>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <BKPI label="Tasa Global" value={`${tasas.find(t=>t.modulo==='Todos')?.tasaRef||'—'} Bs/$`} accent="gold" Icon={Globe}/>
        <BKPI label="Registros" value={tasas.length} accent="blue" Icon={TrendingUp}/>
        <BKPI label="Última Actualización" value={bancoDd(tasas[0]?.fecha||'')} accent="green" Icon={CalendarDays}/>
      </div>
      <BCard title="Historial de Tasas" action={<BBg onClick={()=>setModal(true)} sm><Plus size={12}/> Nueva</BBg>}>
        <table className="w-full"><thead><tr><BTh>Fecha</BTh><BTh>Módulo</BTh><BTh>Moneda</BTh><BTh right>Tasa Bs/$</BTh><BTh>Fuente</BTh></tr></thead>
          <tbody>{tasas.length===0&&<tr><td colSpan={5}><BEmptyState icon={Globe} title="Sin tasas" desc="Registre la tasa actual"/></td></tr>}{tasas.map(t=><tr key={t.id} className="hover:bg-slate-50"><BTd>{bancoDd(t.fecha)}</BTd><BTd><BBadge v={t.modulo==='Todos'?'gray':'blue'}>{t.modulo}</BBadge></BTd><BTd><BPill usd={t.moneda==='USD'}>{t.moneda}</BPill></BTd><BTd right mono className="font-black text-slate-900 text-base">{t.tasaRef}</BTd><BTd className="text-slate-400 text-[10px] uppercase font-semibold">{t.fuente}</BTd></tr>)}</tbody>
        </table>
      </BCard>
      <BModal open={modal} onClose={()=>setModal(false)} title="Registrar Tasa" footer={<><BBo onClick={()=>setModal(false)}>Cancelar</BBo><BBg onClick={save} disabled={busy}>{busy?'Guardando...':'Guardar'}</BBg></>}>
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
  const RepLibroDiarioView = () => {
    const [filtDesde,setFiltDesde]=useState(bancoMesActual()+'-01'); const [filtHasta,setFiltHasta]=useState(getTodayDate());
    const [filtOrigen,setFiltOrigen]=useState(''); const [filtCta,setFiltCta]=useState('');
    let allMovs=[...movBanco.map(m=>({...m,origen:'Banco'})),...movCaja.map(m=>({...m,origen:'Caja'}))];
    allMovs=allMovs.filter(m=>{if(m.fecha<filtDesde||m.fecha>filtHasta)return false;if(filtOrigen&&m.cuentaId!==filtOrigen&&m.cajaId!==filtOrigen)return false;return true;});
    allMovs.sort((a,b)=>a.fecha.localeCompare(b.fecha));
    let lineasPlanas=[],sBs=0,sUSD=0;
    allMovs.forEach(m=>{
      const isBanco=m.origen==='Banco';const ctaP=isBanco?cuentas.find(c=>c.id===m.cuentaId):cajas.find(c=>c.id===m.cajaId);if(!ctaP)return;
      const isIng=m.tipo==='Ingreso'||m.tipo==='Nota de Crédito';const tasa=Number(m.tasa)||1;const mNat=Number(m.montoNativo)||Number(m.monto)||0;
      const valBs=ctaP.moneda==='BS'?mNat:mNat*tasa;const valUSD=ctaP.moneda==='BS'?mNat/tasa:mNat;
      const comp=m.asientoContableId||m.id.substring(0,6).toUpperCase();
      const mesL=m.fecha.substring(5,7)+'/'+m.fecha.substring(0,4);const doc=m.referencia||'—';const conc=m.esVale?`[VALE] ${m.concepto}`:m.concepto;
      let sub=[{comp,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:ctaP.cuentaContableCod||'—',cuenta:isBanco?ctaP.banco:ctaP.nombre,tipo:isIng?'D':'H',dBs:isIng?valBs:0,hBs:isIng?0:valBs,dUSD:isIng?valUSD:0,hUSD:isIng?0:valUSD}];
      if(m.lineasContra&&m.lineasContra.length>0){m.lineasContra.forEach(l=>sub.push({comp,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:l.ctaNom?l.ctaNom.split('·')[0].trim():'',cuenta:l.ctaNom?l.ctaNom.split('·')[1]?.trim():l.ctaNom,tipo:Number(l.debeBs||0)>0?'D':'H',dBs:Number(l.debeBs||0),hBs:Number(l.haberBs||0),dUSD:Number(l.debeUSD||0),hUSD:Number(l.haberUSD||0)}));}
      else if(m.asientoDebito||m.asientoCredito){sub.push({comp,mes:mesL,fecha:m.fecha,doc,conc,tasa,codigo:'',cuenta:isIng?m.asientoCredito:m.asientoDebito,tipo:isIng?'H':'D',dBs:isIng?0:valBs,hBs:isIng?valBs:0,dUSD:isIng?0:valUSD,hUSD:isIng?valUSD:0});}
      if(filtCta){const ok=sub.some(sl=>(sl.codigo+' '+sl.cuenta).toLowerCase().includes(filtCta.toLowerCase()));if(!ok)return;}
      sub.forEach(sl=>{sBs+=sl.dBs-sl.hBs;sUSD+=sl.dUSD-sl.hUSD;lineasPlanas.push({...sl,sBs,sUSD});});
    });
    return(
      <div className="space-y-5 flex flex-col min-w-0 w-full">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div><h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Libro Diario General Bimonetario</h2><p className="text-xs text-slate-500 font-medium mt-1">Todos los asientos integrados en un solo comprobante maestro.</p></div>
          <div className="flex flex-wrap gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Desde</label><input type="date" className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none" value={filtDesde} onChange={e=>setFiltDesde(e.target.value)}/></div>
            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Hasta</label><input type="date" className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none" value={filtHasta} onChange={e=>setFiltHasta(e.target.value)}/></div>
            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Origen</label><select className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none min-w-[200px]" value={filtOrigen} onChange={e=>setFiltOrigen(e.target.value)}><option value="">TODOS LOS ORÍGENES</option><optgroup label="Bancos">{cuentas.map(c=><option key={c.id} value={c.id}>{c.banco}</option>)}</optgroup><optgroup label="Cajas">{cajas.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup></select></div>
            <div className="flex-1"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cuenta Contable</label><div className="relative"><Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-semibold outline-none" placeholder="Ej: 1.1.01..." value={filtCta} onChange={e=>setFiltCta(e.target.value)}/></div></div>
            {(filtOrigen||filtCta||filtDesde!==bancoMesActual()+'-01'||filtHasta!==getTodayDate())&&<button onClick={()=>{setFiltDesde(bancoMesActual()+'-01');setFiltHasta(getTodayDate());setFiltOrigen('');setFiltCta('');}} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-100">Limpiar</button>}
          </div>
        </div>
        {lineasPlanas.length===0?<BEmptyState icon={BookOpen} title="Sin resultados" desc="No hay asientos para los filtros seleccionados."/>:(
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-w-0 w-full">
            <div className="overflow-x-auto w-full min-w-0 pb-2"><table className="w-full text-left min-w-[1400px]">
              <thead><tr className="bg-slate-900 border-b border-slate-800">{['Comprobante','Mes','Fecha','Código','Cuenta de Movimiento','T','Nro Doc','Concepto','Tasa','Debe Bs.','Haber Bs.','Saldo Bs.','Debe $','Haber $','Saldo $'].map((h,hi)=>(<th key={hi} className={`px-4 py-3 font-black uppercase text-white/90 whitespace-nowrap text-[10px] tracking-wider ${hi>=9?'text-right':hi===5?'text-center':'text-left'}`}>{h}</th>))}</tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {lineasPlanas.map((l,idx)=>{const isD=l.tipo==='D';const esInicio=idx===0||lineasPlanas[idx-1].comp!==l.comp;return(
                  <tr key={idx} className={`hover:bg-slate-50 transition-colors ${esInicio&&idx>0?'border-t-2 border-slate-200':''}`}>
                    <td className="px-4 py-2.5 font-mono font-black text-blue-600 text-[11px] whitespace-nowrap">{esInicio?l.comp:''}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-[10px] whitespace-nowrap">{esInicio?l.mes:''}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-[10px] whitespace-nowrap font-mono">{esInicio?bancoDd(l.fecha):''}</td>
                    <td className="px-4 py-2.5 font-mono font-black text-blue-500 text-[10px]">{l.codigo||'—'}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-700 text-[10px] uppercase truncate max-w-[200px]" style={{paddingLeft:!isD?'20px':'16px'}} title={l.cuenta}>{l.cuenta||'—'}</td>
                    <td className="px-4 py-2.5 text-center font-black text-[11px]"><span className={isD?'text-emerald-600':'text-red-500'}>{l.tipo}</span></td>
                    <td className="px-4 py-2.5 font-mono text-slate-400 text-[10px] truncate max-w-[100px]">{esInicio?l.doc:''}</td>
                    <td className="px-4 py-2.5 text-slate-600 text-[10px] truncate max-w-[180px] font-medium uppercase" title={l.conc}>{esInicio?l.conc:''}</td>
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
    const totBsBanco = cuentas.filter(c=>c.moneda==='BS').reduce((a,c)=>a+Number(c.saldo),0);
    const totUSDBanco = cuentas.filter(c=>c.moneda==='USD').reduce((a,c)=>a+Number(c.saldo),0);
    const totBsEqBanco = cuentas.reduce((a,c)=>a+(c.moneda==='BS'?Number(c.saldo):Number(c.saldo)*tasaActiva),0);
    const saldoCajaBs  = movCaja.filter(m=>m.moneda==='BS' ).reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoBs||0),0);
    const saldoCajaUSD = movCaja.filter(m=>m.moneda==='USD').reduce((a,m)=>a+(m.tipo==='Ingreso'?1:-1)*Number(m.montoUSD||0),0);
    const totBsEqCaja = saldoCajaBs + (saldoCajaUSD * tasaActiva);
    const imprimir=()=>{
      const nacBs=cuentas.filter(c=>c.tipoBanco==='Nacional-Bs');
      const ext=cuentas.filter(c=>c.tipoBanco!=='Nacional-Bs');
      const renderTabla=(lista,titulo)=>{if(lista.length===0)return '';const rows=lista.map(c=>{const bs=c.moneda==='BS';const usd=bs?Number(c.saldo)/tasaActiva:Number(c.saldo);const bsEq=bs?Number(c.saldo):Number(c.saldo)*tasaActiva;return`<tr><td>${c.banco}</td><td>${c.numeroCuenta}</td><td>${c.tipoCuenta||'—'}</td><td>${c.moneda}</td><td style="text-align:right;font-weight:bold">Bs.${bancoFmt(bsEq)}</td><td style="text-align:right;color:#16a34a;font-weight:bold">$${bancoFmt(usd)}</td></tr>`;}).join('');return`<h3 style="margin-top:20px;font-size:12px;color:#1e3a8a;text-transform:uppercase;">${titulo}</h3><table><thead><tr><th>Banco</th><th>Nro. Cuenta</th><th>Tipo</th><th>Moneda</th><th>Saldo Bs.</th><th>Equiv. USD</th></tr></thead><tbody>${rows}</tbody></table>`;};
      bancoPrintWindow(bancoLetterheadOpen('Reporte General Bancario',`RIF: J-412309374 · ${bancoDd(getTodayDate())} · ${cuentas.length} cuentas`)+renderTabla(nacBs,'🇻🇪 Cuentas Nacionales — Bolívares')+renderTabla(ext,'💵 Cuentas Moneda Extranjera e Internacionales')+`<div style="margin-top:20px;padding:10px;background:#0f172a;color:#fff;text-align:right;font-weight:bold;font-size:12px;">TOTAL CONSOLIDADO: Bs.${bancoFmt(totBsEqBanco)} | $${bancoFmt(totBsEqBanco/tasaActiva)}</div>`+bancoLetterheadClose(`${cuentas.length} cuenta(s)`));
    };
    if(!isBanco) return(
      <div className="space-y-5 w-full min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BKPI label="Total Caja Bs." value={`Bs. ${bancoFmt(saldoCajaBs)}`} accent="blue" Icon={PiggyBank} sub={`$${bancoFmt(saldoCajaBs/tasaActiva)} USD equiv.`}/>
          <BKPI label="Total Caja USD" value={`$${bancoFmt(saldoCajaUSD)}`} accent="green" Icon={DollarSign} sub={`Bs.${bancoFmt(saldoCajaUSD*tasaActiva)} equiv.`}/>
          <BKPI label="Consolidado Global" value={`$${bancoFmt(totBsEqCaja/tasaActiva)}`} accent="gold" Icon={TrendingUp} sub="Equivalente en USD"/>
        </div>
        <BCard title="Resumen General de Caja">
          <div className="overflow-x-auto w-full min-w-0"><table className="w-full min-w-[600px]">
            <thead><tr><BTh>Caja Operativa</BTh><BTh>Moneda</BTh><BTh right>Saldo Actual</BTh><BTh right>Equivalencia</BTh></tr></thead>
            <tbody>
              <tr className="hover:bg-slate-50"><BTd className="font-black">Caja Principal (Bolívares)</BTd><BTd><BPill usd={false}>BS</BPill></BTd><BTd right mono className="font-black">Bs. {bancoFmt(saldoCajaBs)}</BTd><BTd right mono className="text-emerald-600 font-black">$ {bancoFmt(saldoCajaBs/tasaActiva)}</BTd></tr>
              <tr className="hover:bg-slate-50"><BTd className="font-black">Caja Principal (Divisas)</BTd><BTd><BPill usd={true}>USD</BPill></BTd><BTd right mono className="font-black">$ {bancoFmt(saldoCajaUSD)}</BTd><BTd right mono className="text-blue-600 font-black">Bs. {bancoFmt(saldoCajaUSD*tasaActiva)}</BTd></tr>
            </tbody>
          </table></div>
        </BCard>
      </div>
    );
    return(
      <div className="space-y-5 w-full min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BKPI label="Total Bs." value={`Bs. ${bancoFmt(totBsBanco)}`} accent="blue" Icon={Building2} sub={`$${bancoFmt(totBsBanco/tasaActiva)} USD equiv.`}/>
          <BKPI label="Total USD" value={`$${bancoFmt(totUSDBanco)}`} accent="green" Icon={DollarSign}/>
          <BKPI label="Consolidado USD" value={`$${bancoFmt(totBsEqBanco/tasaActiva)}`} accent="gold" Icon={TrendingUp} sub="Todas las cuentas"/>
        </div>
        <BCard title="Resumen General Bancario" action={<button onClick={imprimir} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-sm"><Download size={12}/> PDF Membretado</button>}>
          {[{titulo:'Cuentas Nacionales Bs.',tipos:['Nacional-Bs']},{titulo:'Cuentas Moneda Extranjera',tipos:['Nacional-Ext','Internacional']}].map(g=>(
            <div key={g.titulo} className="mb-4">
              <p className="text-xs font-black uppercase text-slate-500 mb-2">{g.titulo}</p>
              <div className="overflow-x-auto w-full min-w-0"><table className="w-full min-w-[700px]">
                <thead><tr><BTh>Banco</BTh><BTh>Nro.</BTh><BTh>Tipo</BTh><BTh>Moneda</BTh><BTh right>Saldo</BTh><BTh right>En USD</BTh><BTh right>En Bs.</BTh></tr></thead>
                <tbody>{cuentas.filter(c=>g.tipos.includes(c.tipoBanco||'Nacional-Bs')).map(c=>{
                  const bs=c.moneda==='BS';const usd=bs?Number(c.saldo)/tasaActiva:Number(c.saldo);const bsEq=bs?Number(c.saldo):Number(c.saldo)*tasaActiva;
                  return<tr key={c.id} className="hover:bg-slate-50"><BTd className="font-black"><div className="flex items-center gap-2"><BBankLogo banco={c.banco} logoUrl={c.logoUrl} className="w-6 h-6 rounded shadow-sm object-contain border border-slate-200"/><span>{c.banco}</span></div></BTd><BTd mono className="text-[10px]">{c.numeroCuenta}</BTd><BTd className="text-[10px]">{c.tipoCuenta}</BTd><BTd><BPill usd={!bs}>{c.moneda}</BPill></BTd><BTd right mono className="font-black">{bs?'Bs.':'$'} {bancoFmt(c.saldo)}</BTd><BTd right mono className="text-emerald-600 font-black">{'$'+bancoFmt(usd)}</BTd><BTd right mono className="text-blue-600">Bs.{bancoFmt(bsEq)}</BTd></tr>;
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
          <table className="w-full" style={{fontSize:'9px', tableLayout:'fixed', minWidth:'900px'}}>
            <colgroup>
              <col style={{width:'90px'}}/><col style={{width:'45px'}}/><col style={{width:'60px'}}/>
              <col style={{width:'60px'}}/><col style={{width:'130px'}}/><col style={{width:'28px'}}/>
              <col style={{width:'70px'}}/><col style={{width:'130px'}}/><col style={{width:'45px'}}/>
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
                const comp=r.comprobante||r.numero||('CB-'+(idx+1).toString().padStart(4,'0'));
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
                      <td className="px-2 py-1.5 text-slate-600 truncate" title={conc}>{li===0?conc:''}</td>
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
      if(!isMov && a.modulo!=='Bancos') return false;
      if(filtDesde && a.fecha < filtDesde) return false;
      if(filtHasta && a.fecha > filtHasta) return false;
      const bancoId = isMov ? a.cuentaId : movBanco.find(m=>m.id===a.movimientoBancoId)?.cuentaId;
      if(filtBanco && bancoId!==filtBanco) return false;
      return true;
    };
    const asientosMes = asientosLocal.filter(a=>applyFiltros(a, false));
    const rows = asientosMes.length > 0 ? asientosMes : movBanco.filter(m=>{
      if(!(m.asientoDebito||m.asientoCredito)) return false;
      return applyFiltros(m, true);
    }).map(m=>({
      id:m.id, comprobante:m.asientoContableId||m.id,
      fecha:m.fecha, descripcion:m.concepto, nroDocumento:m.referencia||'',
      tasa:m.tasa, cuentaNombre:m.cuentaNombre,
      lineas:[{codigo:'',cuenta:m.asientoDebito,tipoLinea:'D',debeBs:m.montoBs,haberBs:0,debeUSD:m.montoUSD,haberUSD:0},{codigo:'',cuenta:m.asientoCredito,tipoLinea:'H',debeBs:0,haberBs:m.montoBs,debeUSD:0,haberUSD:m.montoUSD}],
    }));
    const getMovCuentaId = r => movBanco.find(m=>m.id===r.movimientoBancoId)?.cuentaId||null;

    // ── PDF / XLS generator ──────────────────────────────────────────────────
    const buildHTML = (tableRows, titleLabel) => {
      let sBs=0, sUSD=0;
      const rowsHtml = tableRows.flatMap(r=>{
        const lineas=r.lineas||[];
        const comp=r.comprobante||r.numero||'—';
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
          <BFG label="Banco">
            <select className={`${sel} min-w-[160px]`} value={filtBanco} onChange={e=>setFiltBanco(e.target.value)}>
              <option value="">Todos los bancos</option>
              {[{label:'🇻🇪 Nacionales Bs.',items:cuentas.filter(c=>c.tipoBanco==='Nacional-Bs')},
                {label:'💵 Moneda Extranjera',items:cuentas.filter(c=>c.tipoBanco!=='Nacional-Bs')}
              ].map(g=>g.items.length>0&&(
                <optgroup key={g.label} label={g.label}>{g.items.map(c=><option key={c.id} value={c.id}>{c.banco}</option>)}</optgroup>
              ))}
            </select>
          </BFG>
          <BFG label="Desde"><input type="date" className={inp} value={filtDesde} onChange={e=>setFiltDesde(e.target.value)}/></BFG>
          <BFG label="Hasta"><input type="date" className={inp} value={filtHasta} onChange={e=>setFiltHasta(e.target.value)}/></BFG>
          {(filtBanco||filtDesde!==bancoMesActual()+'-01'||filtHasta!==getTodayDate())&&(
            <button onClick={()=>{setFiltBanco('');setFiltDesde(bancoMesActual()+'-01');setFiltHasta(getTodayDate());}} className="self-end mb-0.5 text-[9px] font-black text-slate-400 hover:text-red-500 px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-red-50">✕</button>
          )}
          <div className="ml-auto self-end flex gap-2">
            <button onClick={()=>imprimirPDF(rows, filtBanco?cuentas.find(c=>c.id===filtBanco)?.banco||'Banco':`${mes}`)} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-red-700"><Download size={10}/> PDF</button>
            <button onClick={()=>imprimirXLS(rows, filtBanco?cuentas.find(c=>c.id===filtBanco)?.banco||'Banco':`${mes}`)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-green-700"><FileSpreadsheet size={10}/> Excel</button>
          </div>
          <p className="w-full text-[9px] text-slate-400">{filtBanco?cuentas.find(c=>c.id===filtBanco)?.banco||'Banco':'Todos los bancos'} · {bancoDd(filtDesde)} al {bancoDd(filtHasta)} · <strong className="text-slate-700">{rows.length} resultado(s)</strong></p>
        </div>

        {/* Tablas por banco */}
        {rows.length===0&&<div className="bg-white rounded-xl border border-slate-100 p-8"><BEmptyState icon={BookOpen} title="Sin asientos" desc="Los asientos se generan automáticamente al registrar movimientos bancarios"/></div>}
        {filtBanco
          ? <BancoTable title={cuentas.find(c=>c.id===filtBanco)?.banco||'Banco'} tableRows={rows} onPDF={()=>imprimirPDF(rows,cuentas.find(c=>c.id===filtBanco)?.banco||'Banco')} onXLS={()=>imprimirXLS(rows,cuentas.find(c=>c.id===filtBanco)?.banco||'Banco')}/>
          : (()=>{
              const grupos=[
                {label:'🇻🇪 Cuentas Nacionales — Bolívares', bancos:cuentas.filter(c=>c.tipoBanco==='Nacional-Bs')},
                {label:'🌐 Bancos Internacionales & ME',      bancos:cuentas.filter(c=>c.tipoBanco!=='Nacional-Bs')},
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
        }
        {!filtBanco&&rows.filter(r=>!getMovCuentaId(r)).length>0&&(
          <BancoTable title="Sin banco identificado" tableRows={rows.filter(r=>!getMovCuentaId(r))} onPDF={()=>imprimirPDF(rows.filter(r=>!getMovCuentaId(r)),'Sin banco')} onXLS={()=>imprimirXLS(rows.filter(r=>!getMovCuentaId(r)),'Sin banco')}/>
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
                                                    {id:'conciliacion', label:'Conciliación',       icon:CheckCircle},
                                                    {id:'reciprocidad', label:'Reciprocidad de Banco',icon:Activity}] },
    { group:'Reportes',    color:'#f59e0b', items:[{id:'rpt_gral_banco',label:'General de Banco',   icon:Building2},
                                                    {id:'rpt_comp_banco',label:'Comprobante Bancario',icon:FileText},
                                                    {id:'rpt_libro',    label:'Libro Diario General',icon:BookOpen}] },
    { group:'Config.',     color:'#64748b', items:[{id:'tasas',        label:'Tasas de Cambio',    icon:Globe}] },
  ];
  const navGroupsCaja = [
    { group:'Analítica',   color:'#10b981', items:[{id:'caja_dashboard', label:'Panel General',    icon:LayoutDashboard}] },
    { group:'Caja',        color:'#10b981', items:[{id:'cuentas_caja',   label:'Cuentas de Caja',  icon:PiggyBank},
                                                    {id:'caja_op',       label:'Operaciones Caja', icon:Banknote},
                                                    {id:'vales',         label:'Relación de Vales',icon:FileText},
                                                    {id:'arqueo',        label:'Arqueo de Caja',   icon:Calculator}] },
    { group:'Reportes',    color:'#f59e0b', items:[{id:'rpt_gral_caja',  label:'General de Caja',  icon:PiggyBank},
                                                    {id:'rpt_comp_caja', label:'Comprobante de Caja',icon:FileText}] },
    { group:'Config.',     color:'#64748b', items:[{id:'tasas',          label:'Tasas de Cambio',  icon:Globe},
                                                    {id:'limpiar_dup',   label:'Limpiar Duplicados',icon:AlertTriangle}] },
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
    conciliacion:<ConciliacionView/>, reciprocidad:<ReciprocidadView/>,
    cuentas_caja:<CuentasCajaView/>, caja_op:<CajaOpView/>, vales:<ValesView/>, arqueo:<ArqueoCajaView/>,
    caja_dashboard:<CajaOpView/>,
    rpt_gral_banco:<ReportesGeneralView tipo="banco"/>,
    rpt_gral_caja:<ReportesGeneralView tipo="caja"/>,
    rpt_comp_banco:<ComprobantesBancariosView tipo="banco"/>,
    rpt_comp_caja:<ComprobantesBancariosView tipo="caja"/>,
    rpt_libro:<RepLibroDiarioView/>,
    tasas:<TasasView/>,
    terceros_rel:<TercerosRelacionadosView/>, cxp_rel:<CxPRelacionadasView/>,
    hist_pago_rel:<HistorialPagoRelacionadosView/>, edo_cta_rel:<EstadoCuentaRelacionadosView/>,
    limpiar_dup:<LimpiarDuplicadosCajaView/>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
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
        </div>
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
          {/* Nuevo button */}
          <div className="ml-auto flex items-center gap-3 pl-4 flex-shrink-0 py-2">
            <button onClick={() => setSec(sec.startsWith('caja') || sec === 'arqueo' ? 'caja_op' : 'movimientos')}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase transition-all">
              <Plus size={12}/> Nuevo
            </button>
          </div>
        </div>
      </div>
      {/* ── Contenido ── */}
      <div>
        {views[sec] || <DashboardView/>}
      </div>
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
    const activos   = cuentas.filter(c=>String(c.codigo).startsWith('1')).map(c=>({...c,...saldoCuenta(c.codigo,hasta)}));
    const pasivos   = cuentas.filter(c=>String(c.codigo).startsWith('2')).map(c=>({...c,...saldoCuenta(c.codigo,hasta)}));
    const patrimonio= cuentas.filter(c=>String(c.codigo).startsWith('3')).map(c=>({...c,...saldoCuenta(c.codigo,hasta)}));

    const totActBs  = activos.reduce((a,c)=>a+c.saldoBs,0);
    const totPasBs  = pasivos.reduce((a,c)=>a+Math.abs(c.saldoBs),0);
    const totPatBs  = patrimonio.reduce((a,c)=>a+Math.abs(c.saldoBs),0);
    const totActUSD = activos.reduce((a,c)=>a+c.saldoUSD,0);

    const SeccionBG = ({titulo, items, colorBorder, totalBs, totalUSD})=>(
      <div className="mb-5">
        <div className="flex items-center justify-between px-5 py-3 rounded-xl mb-2" style={{background:`${colorBorder}15`,border:`1.5px solid ${colorBorder}40`}}>
          <p className="font-black text-sm uppercase tracking-wide" style={{color:colorBorder}}>{titulo}</p>
          <div className="text-right"><p className="font-mono font-black" style={{color:colorBorder}}>Bs. {bancoFmt(Math.abs(totalBs))}</p><p className="text-[10px] text-slate-400">{'$'+bancoFmt(Math.abs(totalUSD))}</p></div>
        </div>
        {items.filter(c=>Math.abs(c.saldoBs)>0.001).map(c=>(
          <div key={c.id} className="flex justify-between py-1.5 px-5 text-xs hover:bg-slate-50 rounded">
            <div className="flex items-center gap-2"><span className="font-mono text-blue-500 text-[10px]">{c.codigo}</span><span className="text-slate-700">{c.nombre}</span></div>
            <div className="text-right"><span className="font-mono font-black text-slate-900">Bs. {bancoFmt(Math.abs(c.saldoBs))}</span><span className="text-slate-400 ml-3">{'$'+bancoFmt(Math.abs(c.saldoUSD))}</span></div>
          </div>
        ))}
      </div>
    );

    return (
      <BCard title="Balance General" subtitle={`Al ${bancoDd(hasta)}`} action={<input type="date" className={inp} value={hasta} onChange={e=>setHasta(e.target.value)} style={{width:'140px'}}/>}>
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <SeccionBG titulo="ACTIVOS" items={activos} colorBorder="#10b981" totalBs={totActBs} totalUSD={totActUSD}/>
          </div>
          <div>
            <SeccionBG titulo="PASIVOS" items={pasivos} colorBorder="#ef4444" totalBs={totPasBs} totalUSD={pasivos.reduce((a,c)=>a+Math.abs(c.saldoUSD),0)}/>
            <SeccionBG titulo="PATRIMONIO" items={patrimonio} colorBorder="#8b5cf6" totalBs={totPatBs} totalUSD={patrimonio.reduce((a,c)=>a+Math.abs(c.saldoUSD),0)}/>
            <div className="flex items-center justify-between px-5 py-4 rounded-xl mt-3" style={{background:'#0f172a'}}>
              <p className="font-black text-white uppercase tracking-wide">PASIVO + PATRIMONIO</p>
              <div className="text-right"><p className="font-mono font-black text-orange-400">Bs. {bancoFmt(totPasBs+totPatBs)}</p><p className="text-[10px] text-slate-400">{'$'+bancoFmt(pasivos.reduce((a,c)=>a+Math.abs(c.saldoUSD),0)+patrimonio.reduce((a,c)=>a+Math.abs(c.saldoUSD),0))}</p></div>
            </div>
          </div>
        </div>
      </BCard>
    );
  };

  // ── ESTADO DE RESULTADOS ─────────────────────────────────────────────────
  const EstadoResultadosView = () => {
    const [desde, setDesde] = useState(bancoMesActual()+'-01');
    const [hasta, setHasta] = useState(getTodayDate());
    const ingresos = cuentas.filter(c=>String(c.codigo).startsWith('4')).map(c=>({...c,...saldoCuenta(c.codigo,hasta)})).filter(c=>Math.abs(c.saldoBs)>0.001);
    const costos   = cuentas.filter(c=>String(c.codigo).startsWith('5')).map(c=>({...c,...saldoCuenta(c.codigo,hasta)})).filter(c=>Math.abs(c.saldoBs)>0.001);
    const gastos   = cuentas.filter(c=>String(c.codigo).startsWith('6')).map(c=>({...c,...saldoCuenta(c.codigo,hasta)})).filter(c=>Math.abs(c.saldoBs)>0.001);
    const totIngBs = ingresos.reduce((a,c)=>a+Math.abs(c.saldoBs),0);
    const totCosBs = costos.reduce((a,c)=>a+Math.abs(c.saldoBs),0);
    const totGasBs = gastos.reduce((a,c)=>a+Math.abs(c.saldoBs),0);
    const utilBrBs = totIngBs - totCosBs;
    const utilNeBs = totIngBs - totCosBs - totGasBs;
    const totIngUSD= ingresos.reduce((a,c)=>a+Math.abs(c.saldoUSD),0);
    const utilNeUSD= totIngUSD - costos.reduce((a,c)=>a+Math.abs(c.saldoUSD),0) - gastos.reduce((a,c)=>a+Math.abs(c.saldoUSD),0);

    const SecER=({titulo,items,totalBs,totalUSD,color})=>(
      <div className="mb-4">
        <div className="flex justify-between px-4 py-2 rounded-lg mb-1" style={{background:color+'15'}}>
          <p className="font-black text-xs uppercase tracking-wide" style={{color}}>{titulo}</p>
          <div className="text-right"><span className="font-mono font-black text-xs" style={{color}}>Bs.{bancoFmt(Math.abs(totalBs))}</span><span className="text-slate-400 text-[10px] ml-2">{'$'+bancoFmt(Math.abs(totalUSD))}</span></div>
        </div>
        {items.map(c=><div key={c.id} className="flex justify-between py-1 px-6 text-xs hover:bg-slate-50 rounded">
          <span className="text-slate-600">{c.nombre}</span>
          <div><span className="font-mono text-slate-800">Bs.{bancoFmt(Math.abs(c.saldoBs))}</span><span className="text-slate-400 ml-2">{'$'+bancoFmt(Math.abs(c.saldoUSD))}</span></div>
        </div>)}
      </div>
    );

    return (
      <BCard title="Estado de Resultados (Ganancias y Pérdidas)" action={<div className="flex gap-2"><input type="date" className={inp} style={{width:'130px'}} value={desde} onChange={e=>setDesde(e.target.value)}/><input type="date" className={inp} style={{width:'130px'}} value={hasta} onChange={e=>setHasta(e.target.value)}/></div>}>
        <div className="max-w-2xl mx-auto space-y-2">
          <SecER titulo="INGRESOS" items={ingresos} totalBs={totIngBs} totalUSD={totIngUSD} color="#10b981"/>
          <SecER titulo="COSTOS DE VENTAS" items={costos} totalBs={totCosBs} totalUSD={costos.reduce((a,c)=>a+Math.abs(c.saldoUSD),0)} color="#f59e0b"/>
          <div className="flex justify-between px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50">
            <p className="font-black text-blue-800 uppercase text-xs">UTILIDAD BRUTA</p>
            <div><span className={`font-mono font-black ${utilBrBs>=0?'text-emerald-700':'text-red-600'}`}>Bs.{bancoFmt(utilBrBs)}</span></div>
          </div>
          <SecER titulo="GASTOS OPERATIVOS" items={gastos} totalBs={totGasBs} totalUSD={gastos.reduce((a,c)=>a+Math.abs(c.saldoUSD),0)} color="#ef4444"/>
          <div className="flex justify-between px-4 py-4 rounded-xl" style={{background:'#0f172a'}}>
            <p className="font-black text-white uppercase tracking-wide">UTILIDAD / PÉRDIDA NETA</p>
            <div className="text-right"><p className={`font-mono font-black text-xl ${utilNeBs>=0?'text-emerald-400':'text-red-400'}`}>Bs.{bancoFmt(utilNeBs)}</p><p className="text-slate-400 text-[10px]">{'$'+bancoFmt(utilNeUSD)}</p></div>
          </div>
        </div>
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

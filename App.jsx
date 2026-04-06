import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Factory, TrendingUp, AlertTriangle, 
  ClipboardList, PlayCircle, History, FileText, Settings2, Trash2, 
  PlusCircle, Calculator, Plus, Users, UserPlus, LogOut, Lock, 
  ArrowDownToLine, ArrowUpFromLine, BarChart3, ShieldCheck, Box, Home, Edit, Printer, X, Search, Loader2, FileCheck, Beaker, CheckCircle, CheckCircle2, Receipt, ArrowRight, User, ArrowRightLeft, ClipboardEdit, Download, Thermometer, Gauge
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, onSnapshot, deleteDoc, writeBatch, serverTimestamp, query } from "firebase/firestore";

// ============================================================================
// ESCUDO DE ERRORES (Evita la pantalla blanca)
// ============================================================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error) { this.setState({ errorMsg: error && error.message ? error.message : String(error) }); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
          <AlertTriangle size={60} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-black text-black uppercase mb-2">Error de Interfaz Bloqueado</h2>
          <p className="text-gray-500 text-sm mb-6">{this.state.errorMsg}</p>
          <button onClick={() => window.location.reload()} className="bg-black text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg">Recargar Sistema</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

// ============================================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBri2uZAaxsH4S0OpqhYvXB4wfCqo4g3sk",
  authDomain: "erp-gyb-supply.firebaseapp.com",
  projectId: "erp-gyb-supply",
  storageBucket: "erp-gyb-supply.firebasestorage.app",
  messagingSenderId: "201939139821",
  appId: "1:201939139821:web:95e5f589e546d7d557e0e4",
  measurementId: "G-FZKXEP0WMK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const getColRef = (colName) => collection(db, colName); 
const getDocRef = (colName, docId) => doc(db, colName, String(docId));

const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ============================================================================
// UTILIDADES
// ============================================================================
const formatNum = (num) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);
const parseNum = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  let str = val.toString().trim();
  if (str.includes('.') && str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
  else if (str.includes(',')) str = str.replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const getSafeDate = (ts) => {
  if (!ts) return '';
  if (typeof ts === 'string') return ts;
  if (typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString('es-VE');
  if (typeof ts === 'number') return new Date(ts).toLocaleDateString('es-VE');
  if (ts instanceof Date) return ts.toLocaleDateString('es-VE');
  return '';
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [appUser, setAppUser] = useState(null); 
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [dialog, setDialog] = useState(null);
  
  // Datos globales
  const [inventory, setInventory] = useState([]);
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // ============================================================================
  // LÓGICA DE LOGIN
  // ============================================================================
  const handleLogin = (e) => {
    e.preventDefault();
    const user = loginData.username.toLowerCase().trim();
    const pass = loginData.password.trim();

    if (user === 'admin' && pass === '1234') {
      setAppUser({ user: 'admin', role: 'Master', name: 'Administrador General' });
      setLoginError('');
    } else if (user === 'planta' && pass === '1234') {
      setAppUser({ user: 'planta', role: 'Planta', name: 'Supervisor de Planta' });
      setLoginError('');
    } else {
      setLoginError('Credenciales incorrectas. Intente nuevamente.');
    }
  };

  // ============================================================================
  // FIREBASE SYNC - VARIABLES CON NOMBRES ÚNICOS
  // ============================================================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth); 
      } catch (err) { 
        console.error("Error Auth:", err); 
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser) return;

    // INVENTARIO - Variable única: unsubInventory
    const unsubInventory = onSnapshot(getColRef('inventory'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(data);
    }, (error) => {
      console.error("Error inventario:", error);
    });

    // CLIENTES - Variable única: unsubClients  
    const unsubClients = onSnapshot(getColRef('clientes'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(data);
    }, (error) => {
      console.error("Error clientes:", error);
    });

    // REQUISICIONES - Variable única: unsubRequirements
    const unsubRequirements = onSnapshot(getColRef('requirements'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (b.timestamp||0) - (a.timestamp||0));
      setRequirements(data);
    }, (error) => {
      console.error("Error requisiciones:", error);
    });

    // FACTURAS - Variable única: unsubInvoices (NO unsubInv)
    const unsubInvoices = onSnapshot(getColRef('maquilaInvoices'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (b.timestamp||0) - (a.timestamp||0));
      setInvoices(data);
    }, (error) => {
      console.error("Error facturas:", error);
    });

    // Cleanup con nombres únicos
    return () => { 
      unsubInventory(); 
      unsubClients(); 
      unsubRequirements(); 
      unsubInvoices(); 
    };
  }, [fbUser]);

  // ============================================================================
  // RENDERIZADO DE LOGIN
  // ============================================================================
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ 
      backgroundImage: "url('https://images.unsplash.com/photo-1530124566582-a618bc2615dc?q=80&w=2070&auto=format&fit=crop')", 
      backgroundSize: 'cover', 
      backgroundPosition: 'center' 
    }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div className="relative z-10 bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden w-full max-w-4xl flex transform transition-all duration-500 hover:scale-[1.01] border border-white/20">
        <div className="w-1/2 bg-gradient-to-br from-gray-900 to-black p-12 flex-col justify-between hidden md:flex relative overflow-hidden shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] border-r border-gray-800">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/10 to-transparent transform -skew-x-12 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center bg-white rounded-2xl px-4 py-2 shadow-[0_10px_20px_rgba(0,0,0,0.4)] w-fit transform hover:translate-x-1 hover:-translate-y-1 transition-transform duration-300">
              <span className="text-black font-black text-4xl leading-none drop-shadow-sm">G</span>
              <span className="text-orange-500 font-black text-3xl mx-1 drop-shadow-sm">&amp;</span>
              <span className="text-black font-black text-4xl leading-none drop-shadow-sm">B</span>
            </div>
            <h1 className="text-white text-3xl font-black mt-10 uppercase tracking-widest drop-shadow-lg">Supply ERP</h1>
            <p className="text-gray-300 mt-4 text-sm leading-relaxed drop-shadow-md">Sistema Integrado de Producción e Inventario para Servicios Jiret G&B C.A.</p>
          </div>
          <div className="relative z-10 text-gray-500 text-xs font-bold uppercase tracking-widest">© {new Date().getFullYear()} Todos los derechos reservados</div>
        </div>
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white relative z-10">
          <h2 className="text-2xl font-black text-black uppercase tracking-widest mb-2">Iniciar Sesión</h2>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Ingresa tus credenciales de acceso</p>
          {loginError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6 uppercase border border-red-200 flex items-center gap-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
              <AlertTriangle size={16}/> {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Usuario</label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18}/>
                <input 
                  type="text" 
                  value={loginData.username} 
                  onChange={e=>setLoginData({...loginData, username: e.target.value})} 
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" 
                  placeholder="EJ: ADMIN o PLANTA"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18}/>
                <input 
                  type="password" 
                  value={loginData.password} 
                  onChange={e=>setLoginData({...loginData, password: e.target.value})} 
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" 
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="pt-4 text-center text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300 shadow-sm">
              <p>Usuarios de prueba: <strong className="text-black">admin</strong> (1234) o <strong className="text-black">planta</strong> (1234)</p>
            </div>
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black py-4 rounded-xl shadow-[0_8px_20px_rgba(249,115,22,0.4)] hover:shadow-[0_15px_25px_rgba(249,115,22,0.6)] hover:-translate-y-1 active:translate-y-1 uppercase tracking-widest text-xs flex justify-center items-center gap-2 mt-4 transform transition-all"
            >
              ENTRAR AL SISTEMA <ArrowRight size={16}/>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDERIZADO DE HOME
  // ============================================================================
  const renderHome = () => (
    <div className="w-full max-w-6xl mx-auto py-8 animate-in fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-black uppercase tracking-widest">Panel Principal ERP</h2>
        <div className="w-24 h-1.5 bg-orange-500 mx-auto mt-4 rounded-full"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        <button 
          onClick={() => setActiveTab('ventas')} 
          className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"
        >
          <Users size={40} className="text-orange-500 mb-4" />
          <h3 className="text-xl font-black text-white uppercase">Ventas y Facturación</h3>
          <p className="text-xs text-gray-400 mt-2">Directorio, OP y Facturación.</p>
        </button>
        <button 
          onClick={() => setActiveTab('produccion')} 
          className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"
        >
          <Factory size={40} className="text-orange-500 mb-4" />
          <h3 className="text-xl font-black text-white uppercase">Producción Planta</h3>
          <p className="text-xs text-gray-400 mt-2">Ingeniería, Órdenes y Fases.</p>
        </button>
        <button 
          onClick={() => setActiveTab('inventario')} 
          className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"
        >
          <Package size={40} className="text-orange-500 mb-4" />
          <h3 className="text-xl font-black text-white uppercase">Control Inventario</h3>
          <p className="text-xs text-gray-400 mt-2">Art. 177 LISLR, Movimientos y Kardex.</p>
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MÓDULOS SIMPLIFICADOS
  // ============================================================================
  const renderVentasModule = () => (
    <div className="p-8 bg-white rounded-3xl shadow-sm">
      <h2 className="text-2xl font-black mb-4 uppercase flex items-center gap-3">
        <Receipt className="text-orange-500" /> Módulo de Ventas
      </h2>
      <p className="text-gray-600">Gestión de clientes, requisiciones y facturación.</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-6 rounded-xl">
          <h3 className="font-black text-lg mb-2">Clientes</h3>
          <p className="text-sm text-gray-600">Total: {clients.length}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl">
          <h3 className="font-black text-lg mb-2">Requisiciones</h3>
          <p className="text-sm text-gray-600">Total: {requirements.length}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl">
          <h3 className="font-black text-lg mb-2">Facturas</h3>
          <p className="text-sm text-gray-600">Total: {invoices.length}</p>
        </div>
      </div>
    </div>
  );

  const renderProductionModule = () => (
    <div className="p-8 bg-white rounded-3xl shadow-sm">
      <h2 className="text-2xl font-black mb-4 uppercase flex items-center gap-3">
        <Factory className="text-orange-500" /> Módulo de Producción
      </h2>
      <p className="text-gray-600">Control de procesos de manufactura.</p>
      <div className="mt-6">
        <div className="bg-gray-50 p-6 rounded-xl">
          <h3 className="font-black text-lg mb-2">Estado de Planta</h3>
          <p className="text-sm text-gray-600">Sistema operativo</p>
        </div>
      </div>
    </div>
  );

  const renderInventoryModule = () => (
    <div className="p-8 bg-white rounded-3xl shadow-sm">
      <h2 className="text-2xl font-black mb-4 uppercase flex items-center gap-3">
        <Package className="text-orange-500" /> Módulo de Inventario
      </h2>
      <p className="text-gray-600">Control de stock y movimientos (Art. 177 LISLR).</p>
      <div className="mt-6">
        <div className="bg-gray-50 p-6 rounded-xl">
          <h3 className="font-black text-lg mb-2">Artículos</h3>
          <p className="text-sm text-gray-600">Total: {inventory.length} items</p>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================================
  if (!appUser) {
    return <ErrorBoundary>{renderLogin()}</ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col">
        {/* HEADER */}
        <header className="bg-black border-b-4 border-orange-500 sticky top-0 z-50 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-4 cursor-pointer transition-transform hover:scale-105" onClick={() => setActiveTab('home')}>
                <div className="flex items-center bg-white rounded-2xl px-3 py-1 shadow-inner">
                  <span className="text-black font-black text-3xl leading-none">G</span>
                  <span className="text-orange-500 font-black text-2xl mx-0.5">&amp;</span>
                  <span className="text-black font-black text-3xl leading-none">B</span>
                </div>
                <div className="hidden sm:block border-l-2 border-gray-800 pl-4">
                  <span className="font-black text-lg text-white block uppercase italic tracking-tighter">Supply ERP</span>
                  <span className="text-[9px] text-orange-400 font-black uppercase block mt-0.5 tracking-widest">Servicios Jiret G&B C.A.</span>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-3 bg-gray-800 px-5 py-2 rounded-2xl border border-gray-700 shadow-inner">
                  <ShieldCheck size={18} className="text-orange-500" />
                  <span className="font-black text-white text-[10px] uppercase leading-none">{appUser?.name}</span>
                </div>
                <button onClick={() => setAppUser(null)} className="text-gray-400 hover:text-white transition-all bg-gray-800 hover:bg-red-600 p-2.5 rounded-2xl border border-gray-700 shadow-lg">
                  <LogOut size={20}/>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 flex-1">
          {/* NAVEGACIÓN */}
          {activeTab !== 'home' && (
            <nav className="md:w-64 flex-shrink-0 space-y-4 animate-in slide-in-from-left">
              <button onClick={() => setActiveTab('home')} className="w-full flex items-center justify-center gap-3 px-5 py-4 text-xs font-black rounded-2xl bg-black text-white shadow-xl hover:bg-gray-800 mb-4 uppercase tracking-widest transition-all active:scale-95">
                <Home size={18} className="text-orange-500" /> INICIO
              </button>
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Módulos</h3>
                <button onClick={() => setActiveTab('ventas')} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${activeTab === 'ventas' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}>
                  <Receipt size={16}/> Ventas
                </button>
                <button onClick={() => setActiveTab('produccion')} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${activeTab === 'produccion' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}>
                  <Factory size={16}/> Producción
                </button>
                <button onClick={() => setActiveTab('inventario')} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${activeTab === 'inventario' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}>
                  <Package size={16}/> Inventario
                </button>
              </div>
            </nav>
          )}

          {/* CONTENIDO */}
          <main className={`flex-1 min-w-0 pb-12 ${activeTab === 'home' ? 'flex items-center justify-center' : ''}`}>
            {activeTab === 'home' && renderHome()}
            {activeTab === 'ventas' && renderVentasModule()}
            {activeTab === 'produccion' && renderProductionModule()}
            {activeTab === 'inventario' && renderInventoryModule()}
          </main>
        </div>

        {/* MODAL DE DIÁLOGO */}
        {dialog && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-3xl shadow-2xl border-t-8 border-orange-500 p-8 w-full max-w-md transform animate-in zoom-in-95">
              <h3 className="text-xl font-black text-black uppercase tracking-widest mb-4">{dialog.title}</h3>
              <p className="text-sm font-bold text-gray-500 mb-8 uppercase text-center">{dialog.text}</p>
              <div className="flex gap-4">
                {dialog.type === 'confirm' && (
                  <button onClick={() => setDialog(null)} className="flex-1 bg-gray-100 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors text-gray-800">
                    CANCELAR
                  </button>
                )}
                <button onClick={() => { if (dialog.onConfirm) dialog.onConfirm(); setDialog(null); }} className="flex-1 bg-black text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-gray-900 transition-colors">
                  ACEPTAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

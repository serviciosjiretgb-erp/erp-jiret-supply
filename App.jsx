import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Factory, TrendingUp, AlertTriangle, 
  ClipboardList, PlayCircle, History, FileText, Settings2, Trash2, 
  PlusCircle, Calculator, Plus, Users, UserPlus, LogOut, Lock, 
  ArrowDownToLine, ArrowUpFromLine, BarChart3, ShieldCheck, Box, Home, Edit, Printer, X, Search, Loader2, FileCheck, Beaker, CheckCircle, CheckCircle2, Receipt, ArrowRight, User, ArrowRightLeft, ClipboardEdit, Download
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, deleteDoc, writeBatch } from "firebase/firestore";

// ============================================================================
// ESCUDO DE ERRORES
// ============================================================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error) { this.setState({ errorMsg: error?.message || String(error) }); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
          <AlertTriangle size={60} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-black text-black uppercase mb-2">Error de Interfaz</h2>
          <p className="text-gray-500 text-sm mb-6">{this.state.errorMsg}</p>
          <button onClick={() => window.location.reload()} className="bg-black text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg">Recargar Sistema</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

// ============================================================================
// CONFIGURACIÓN DE FIREBASE (CORREGIDA)
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

const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// --- BASE DE DATOS INICIAL ---
const INITIAL_INVENTORY = [
  { id: 'MP-0240', desc: 'ESENTTIA', cost: 0.96, stock: 2325, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-11PG4', desc: 'METALOCENO', cost: 0.91, stock: 1735, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-3003', desc: 'BAPOLENE', cost: 0.96, stock: 500, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-RECICLADO', desc: 'MATERIAL RECICLADO', cost: 1.00, stock: 9999, unit: 'kg', category: 'Materia Prima' }
];

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
  return '';
};

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [appUser, setAppUser] = useState(null); 
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('home'); 
  const [ventasView, setVentasView] = useState('facturacion'); 
  const [prodView, setProdView] = useState('calculadora');
  const [invView, setInvView] = useState('catalogo');

  const [inventory, setInventory] = useState([]);
  const [invMovements, setInvMovements] = useState([]); 
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [dialog, setDialog] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [showNewInvoicePanel, setShowNewInvoicePanel] = useState(false);
  const [showNewReqPanel, setShowNewReqPanel] = useState(false);

  // Estados de reportes
  const [showGeneralInvoicesReport, setShowGeneralInvoicesReport] = useState(false);
  const [showClientReport, setShowClientReport] = useState(false);
  const [showReqReport, setShowReqReport] = useState(false);
  const [showSingleReqReport, setShowSingleReqReport] = useState(null);
  const [showSingleInvoice, setShowSingleInvoice] = useState(null);

  // Formularios
  const initialClientForm = { rif: '', razonSocial: '', direccion: '', telefono: '', personaContacto: '', vendedor: '', fechaCreacion: getTodayDate() };
  const [newClientForm, setNewClientForm] = useState(initialClientForm);
  const [editingClientId, setEditingClientId] = useState(null);

  const initialReqForm = { fecha: getTodayDate(), client: '', tipoProducto: 'BOLSAS', desc: '', ancho: '', fuelles: '', largo: '', micras: '', pesoMillar: '', presentacion: 'MILLAR', cantidad: '', requestedKg: '', color: 'NATURAL', tratamiento: 'LISO', vendedor: '' };
  const [newReqForm, setNewReqForm] = useState(initialReqForm);
  const [editingReqId, setEditingReqId] = useState(null);

  const initialInvoiceForm = { fecha: getTodayDate(), clientRif: '', clientName: '', documento: '', productoMaquilado: 'BOLSAS', vendedor: '', montoBase: '', iva: '', total: '' };
  const [newInvoiceForm, setNewInvoiceForm] = useState(initialInvoiceForm);

  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // Estados Producción
  const [showWorkOrder, setShowWorkOrder] = useState(null);
  const [showPhaseReport, setShowPhaseReport] = useState(null);
  const [showFiniquito, setShowFiniquito] = useState(null);
  const [recipeEditReqId, setRecipeEditReqId] = useState(null);
  const [selectedPhaseReqId, setSelectedPhaseReqId] = useState(null);
  const [activePhaseTab, setActivePhaseTab] = useState('extrusion');
  const [phaseForm, setPhaseForm] = useState({ insumos: [], producedKg: '', mermaKg: '', date: getTodayDate() });
  const [tempRecipe, setTempRecipe] = useState([]);
  const [newIngId, setNewIngId] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [phaseIngId, setPhaseIngId] = useState('');
  const [phaseIngQty, setPhaseIngQty] = useState('');

  // Estado Calculadora
  const [calcInputs, setCalcInputs] = useState({
    ingredientes: [
      { id: 1, nombre: 'MP-0240', pct: 80, costo: 0.96 },
      { id: 2, nombre: 'MP-RECICLADO', pct: 20, costo: 1.00 }
    ],
    mezclaTotal: 745,
    mermaGlobalPorc: 5,
    pesoMillar: 27.19
  });

  const initialInvItemForm = { id: '', desc: '', category: 'Materia Prima', unit: 'kg', cost: '', stock: '' };
  const [newInvItemForm, setNewInvItemForm] = useState(initialInvItemForm);
  const initialMovementForm = { date: getTodayDate(), itemId: '', type: 'ENTRADA', qty: '', cost: '', reference: '', notes: '' };
  const [newMovementForm, setNewMovementForm] = useState(initialMovementForm);

  // ============================================================================
  // FIREBASE SYNC
  // ============================================================================
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth Error:", err));
    onAuthStateChanged(auth, setFbUser);
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    
    const unsubInv = onSnapshot(collection(db, 'inventory'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(data);
      if (s.empty) {
        INITIAL_INVENTORY.forEach(item => setDoc(doc(db, 'inventory', item.id), item));
      }
    });

    const unsubMovs = onSnapshot(collection(db, 'inventoryMovements'), (s) => setInvMovements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>b.timestamp-a.timestamp)));
    const unsubCli = onSnapshot(collection(db, 'clientes'), (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubReq = onSnapshot(collection(db, 'requirements'), (s) => setRequirements(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubInvB = onSnapshot(collection(db, 'maquilaInvoices'), (s) => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>b.timestamp-a.timestamp)));

    return () => { unsubInv(); unsubMovs(); unsubCli(); unsubReq(); unsubInvB(); };
  }, [fbUser]);

  // ============================================================================
  // ACCIONES
  // ============================================================================
  const handleLogin = (e) => {
    e.preventDefault();
    if ((loginData.username.toLowerCase() === 'admin' || loginData.username.toLowerCase() === 'planta') && loginData.password === '1234') {
      setAppUser({ name: loginData.username.toUpperCase(), role: loginData.username === 'admin' ? 'Master' : 'Planta' });
    } else {
      setLoginError('Credenciales incorrectas');
    }
  };

  const handleAddClient = async (e) => {
    if (e) e.preventDefault();
    if (!newClientForm.rif || !newClientForm.razonSocial) return setDialog({ title: 'Aviso', text: 'RIF y Razón Social requeridos', type: 'alert' });

    const rif = newClientForm.rif.toUpperCase().trim();
    const data = { ...newClientForm, name: newClientForm.razonSocial.toUpperCase(), rif, timestamp: Date.now() };

    try {
      await setDoc(doc(db, 'clientes', rif), data, { merge: true });
      setNewClientForm(initialClientForm);
      setEditingClientId(null);
      setDialog({ title: 'Éxito', text: 'Cliente guardado.', type: 'alert' });
    } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };

  const handleSaveInvItem = async (e) => {
    e.preventDefault();
    const id = newInvItemForm.id.toUpperCase().trim();
    const data = { ...newInvItemForm, id, cost: parseNum(newInvItemForm.cost), stock: parseNum(newInvItemForm.stock), timestamp: Date.now() };
    try {
      await setDoc(doc(db, 'inventory', id), data, { merge: true });
      setNewInvItemForm(initialInvItemForm);
      setDialog({ title: 'Éxito', text: 'Artículo guardado.', type: 'alert' });
    } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === newMovementForm.itemId);
    if (!item) return;

    const qty = parseNum(newMovementForm.qty);
    const isAddition = newMovementForm.type === 'ENTRADA' || newMovementForm.type === 'AJUSTE (POSITIVO)';
    const movId = Date.now().toString();

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'inventoryMovements', movId), {
        ...newMovementForm, id: movId, qty, totalValue: qty * item.cost, timestamp: Date.now(), user: appUser.name
      });
      batch.update(doc(db, 'inventory', item.id), {
        stock: item.stock + (isAddition ? qty : -qty)
      });
      await batch.commit();
      setNewMovementForm(initialMovementForm);
      setDialog({ title: 'Éxito', text: 'Movimiento registrado.', type: 'alert' });
    } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    const id = newInvoiceForm.documento || `FAC-${Date.now()}`;
    try {
      await setDoc(doc(db, 'maquilaInvoices', id), {
        ...newInvoiceForm, id, montoBase: parseNum(newInvoiceForm.montoBase), total: parseNum(newInvoiceForm.total), timestamp: Date.now()
      });
      setShowNewInvoicePanel(false);
      setNewInvoiceForm(initialInvoiceForm);
      setDialog({ title: 'Éxito', text: 'Factura registrada.', type: 'alert' });
    } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };

  const handleCreateRequirement = async (e) => {
    e.preventDefault();
    const id = editingReqId || `OP-${Math.floor(Math.random()*100000)}`;
    try {
      await setDoc(doc(db, 'requirements', id), {
        ...newReqForm, id, status: 'PENDIENTE DE INGENIERÍA', timestamp: Date.now()
      }, { merge: true });
      setShowNewReqPanel(false);
      setNewReqForm(initialReqForm);
      setDialog({ title: 'Éxito', text: 'OP Guardada.', type: 'alert' });
    } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };

  const clearAllReports = () => {
    setShowReqReport(false); setShowClientReport(false); setShowGeneralInvoicesReport(false);
    setShowNewReqPanel(false); setShowNewInvoicePanel(false);
    setShowSingleReqReport(null); setShowSingleInvoice(null);
    setShowWorkOrder(null); setShowPhaseReport(null); setShowFiniquito(null);
  };

  // ============================================================================
  // RENDERIZADO
  // ============================================================================
  const ReportHeader = () => (
    <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6 print:flex-row">
       <div className="flex flex-col items-start w-1/2">
          <span className="text-2xl font-light tracking-widest text-gray-800">Supply</span>
          <div className="flex items-center -mt-2">
             <span className="text-black font-black text-[50px] leading-none">G</span>
             <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-black mx-1">&amp;</div>
             <span className="text-black font-black text-[50px] leading-none">B</span>
          </div>
       </div>
       <div className="w-1/2 text-right">
           <h1 className="text-xl font-black text-black uppercase">SERVICIOS JIRET G&amp;B, C.A.</h1>
           <p className="text-xs font-bold text-gray-700">RIF: J-412309374</p>
           <p className="text-[9px] font-medium text-gray-500 mt-1 uppercase">Av. Circunvalación Nro. 02 C.C. El Dividivi Local G-9, Maracaibo.</p>
       </div>
    </div>
  );

  if (!appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center bg-black rounded-2xl px-4 py-2 mb-4">
               <span className="text-white font-black text-3xl">G</span>
               <span className="text-orange-500 font-black text-2xl mx-1">&amp;</span>
               <span className="text-white font-black text-3xl">B</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-widest">Supply ERP</h2>
            <p className="text-gray-400 text-xs font-bold uppercase mt-1">Ingreso al Sistema</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Usuario</label>
              <input type="text" required className="w-full p-4 bg-gray-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500" onChange={e=>setLoginData({...loginData, username: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Contraseña</label>
              <input type="password" required className="w-full p-4 bg-gray-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500" onChange={e=>setLoginData({...loginData, password: e.target.value})} />
            </div>
            {loginError && <p className="text-red-500 text-xs font-bold text-center uppercase">{loginError}</p>}
            <button type="submit" className="w-full bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg hover:bg-orange-600 transition-all uppercase tracking-widest text-xs">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header */}
        <header className="bg-black border-b-4 border-orange-500 p-4 sticky top-0 z-50 text-white shadow-xl print:hidden">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={()=>setActiveTab('home')}>
              <div className="bg-white px-2 py-1 rounded-lg"><span className="text-black font-black text-xl">G&B</span></div>
              <span className="font-black uppercase tracking-tighter hidden sm:block">Servicios Jiret</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase text-orange-500 leading-none">{appUser.name}</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase">{appUser.role}</p>
              </div>
              <button onClick={()=>setAppUser(null)} className="p-2 bg-gray-800 rounded-lg hover:bg-red-600 transition-all"><LogOut size={18}/></button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto w-full p-6 flex flex-col md:flex-row gap-8 flex-1">
          {/* Sidebar */}
          {activeTab !== 'home' && (
            <nav className="md:w-64 space-y-3 print:hidden">
              <button onClick={()=>setActiveTab('home')} className="w-full flex items-center gap-3 p-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest"><Home size={18}/> Inicio</button>
              
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-200 space-y-1">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-3 px-2">Navegación</p>
                <button onClick={()=>setActiveTab('ventas')} className={`w-full text-left p-3 rounded-xl text-xs font-black uppercase ${activeTab==='ventas'?'bg-orange-500 text-white':'hover:bg-gray-100'}`}>Ventas</button>
                <button onClick={()=>setActiveTab('produccion')} className={`w-full text-left p-3 rounded-xl text-xs font-black uppercase ${activeTab==='produccion'?'bg-orange-500 text-white':'hover:bg-gray-100'}`}>Producción</button>
                <button onClick={()=>setActiveTab('inventario')} className={`w-full text-left p-3 rounded-xl text-xs font-black uppercase ${activeTab==='inventario'?'bg-orange-500 text-white':'hover:bg-gray-100'}`}>Inventario</button>
              </div>
            </nav>
          )}

          <main className="flex-1">
            {activeTab === 'home' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-10">
                <div onClick={()=>setActiveTab('ventas')} className="bg-black p-10 rounded-3xl border-l-8 border-orange-500 text-white cursor-pointer hover:scale-105 transition-all shadow-2xl">
                  <Users size={40} className="text-orange-500 mb-4"/>
                  <h3 className="text-xl font-black uppercase">Ventas</h3>
                  <p className="text-xs text-gray-400 mt-2">Facturación y Clientes</p>
                </div>
                <div onClick={()=>setActiveTab('produccion')} className="bg-black p-10 rounded-3xl border-l-8 border-orange-500 text-white cursor-pointer hover:scale-105 transition-all shadow-2xl">
                  <Factory size={40} className="text-orange-500 mb-4"/>
                  <h3 className="text-xl font-black uppercase">Producción</h3>
                  <p className="text-xs text-gray-400 mt-2">Planta y Maquila</p>
                </div>
                <div onClick={()=>setActiveTab('inventario')} className="bg-black p-10 rounded-3xl border-l-8 border-orange-500 text-white cursor-pointer hover:scale-105 transition-all shadow-2xl">
                  <Package size={40} className="text-orange-500 mb-4"/>
                  <h3 className="text-xl font-black uppercase">Inventario</h3>
                  <p className="text-xs text-gray-400 mt-2">Kardex Art. 177</p>
                </div>
              </div>
            )}

            {/* Módulo Ventas */}
            {activeTab === 'ventas' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-black uppercase tracking-widest text-lg">Directorio de Clientes</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <input type="text" placeholder="RIF" className="p-4 bg-gray-100 rounded-xl font-bold uppercase" value={newClientForm.rif} onChange={e=>setNewClientForm({...newClientForm, rif: e.target.value})} />
                      <input type="text" placeholder="RAZÓN SOCIAL" className="md:col-span-2 p-4 bg-gray-100 rounded-xl font-bold uppercase" value={newClientForm.razonSocial} onChange={e=>setNewClientForm({...newClientForm, razonSocial: e.target.value})} />
                      <button type="submit" className="bg-black text-white font-black p-4 rounded-xl uppercase text-xs">Guardar Cliente</button>
                    </form>
                    <table className="w-full text-left">
                      <thead className="bg-gray-50"><tr className="text-[10px] font-black uppercase text-gray-400 border-b">
                        <th className="p-4">RIF</th><th>Nombre</th><th className="text-center">Acciones</th>
                      </tr></thead>
                      <tbody>{clients.map(c=>(
                        <tr key={c.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-black text-xs">{c.rif}</td>
                          <td className="font-bold uppercase text-xs">{c.name}</td>
                          <td className="text-center"><button onClick={async()=>await deleteDoc(doc(db,'clientes',c.id))} className="text-red-500 p-2"><Trash2 size={16}/></button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Módulo Inventario */}
            {activeTab === 'inventario' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="font-black uppercase tracking-widest text-lg">Catálogo de Inventario</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleSaveInvItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                      <input type="text" placeholder="CÓDIGO" className="p-3 bg-gray-100 rounded-xl font-bold uppercase" value={newInvItemForm.id} onChange={e=>setNewInvItemForm({...newInvItemForm, id: e.target.value})} />
                      <input type="text" placeholder="DESCRIPCIÓN" className="p-3 bg-gray-100 rounded-xl font-bold uppercase" value={newInvItemForm.desc} onChange={e=>setNewInvItemForm({...newInvItemForm, desc: e.target.value})} />
                      <input type="number" placeholder="STOCK" className="p-3 bg-gray-100 rounded-xl font-bold" value={newInvItemForm.stock} onChange={e=>setNewInvItemForm({...newInvItemForm, stock: e.target.value})} />
                      <button type="submit" className="bg-orange-500 text-white font-black p-3 rounded-xl uppercase text-xs">Agregar</button>
                    </form>
                    <table className="w-full text-left">
                      <thead className="bg-gray-50"><tr className="text-[10px] font-black uppercase text-gray-400 border-b">
                        <th className="p-4">ID</th><th>Descripción</th><th className="text-right">Stock</th>
                      </tr></thead>
                      <tbody>{inventory.map(i=>(
                        <tr key={i.id} className="border-b">
                          <td className="p-4 font-black text-xs">{i.id}</td>
                          <td className="font-bold uppercase text-xs">{i.desc}</td>
                          <td className="text-right font-black text-blue-600">{formatNum(i.stock)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Dialogs */}
        {dialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-t-8 border-orange-500 animate-in zoom-in-95">
              <h3 className="font-black uppercase mb-2">{dialog.title}</h3>
              <p className="text-gray-500 text-sm mb-6 uppercase font-bold">{dialog.text}</p>
              <button onClick={()=>setDialog(null)} className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase text-xs w-full shadow-lg">Entendido</button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

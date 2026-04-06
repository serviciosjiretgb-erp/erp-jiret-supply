import React, { useState, useEffect } from 'react';
import { 
  Package, Factory, AlertTriangle, ClipboardList, PlayCircle, History, FileText, 
  Settings2, Trash2, Calculator, Plus, Users, LogOut, Lock, ArrowDownToLine, 
  ArrowUpFromLine, Box, Home, Edit, Printer, X, Search, Beaker, CheckCircle, 
  Receipt, ArrowRight, User, Thermometer, Gauge, ShieldCheck
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, deleteDoc, writeBatch } from "firebase/firestore";

// ============================================================================
// ERROR BOUNDARY
// ============================================================================
class ErrorBoundary extends React.Component {
  constructor(props) { 
    super(props); 
    this.state = { hasError: false, errorMsg: '' }; 
  }
  static getDerivedStateFromError(error) { 
    return { hasError: true }; 
  }
  componentDidCatch(error) { 
    this.setState({ errorMsg: error?.message || String(error) }); 
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
          <AlertTriangle size={60} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-black text-black uppercase mb-2">Error Detectado</h2>
          <p className="text-gray-500 text-sm mb-6">{this.state.errorMsg}</p>
          <button onClick={() => window.location.reload()} className="bg-black text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg">
            Recargar Sistema
          </button>
        </div>
      );
    }
    return this.props.children; 
  }
}

// ============================================================================
// FIREBASE CONFIG
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

  // NAVEGACIÓN
  const [activeTab, setActiveTab] = useState('home');
  const [ventasView, setVentasView] = useState('facturacion');
  const [prodView, setProdView] = useState('calculadora');
  const [invView, setInvView] = useState('catalogo');

  // DATOS GLOBALES
  const [inventory, setInventory] = useState([]);
  const [invMovements, setInvMovements] = useState([]);
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // UI STATES
  const [dialog, setDialog] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // FORMS
  const initialClientForm = { rif: '', razonSocial: '', direccion: '', telefono: '', personaContacto: '', vendedor: '', fechaCreacion: getTodayDate() };
  const [newClientForm, setNewClientForm] = useState(initialClientForm);
  const [editingClientId, setEditingClientId] = useState(null);

  const initialInvItemForm = { id: '', desc: '', category: 'Materia Prima', unit: 'kg', cost: '', stock: '' };
  const [newInvItemForm, setNewInvItemForm] = useState(initialInvItemForm);

  const initialMovementForm = { date: getTodayDate(), itemId: '', type: 'ENTRADA', qty: '', cost: '', reference: '', notes: '' };
  const [newMovementForm, setNewMovementForm] = useState(initialMovementForm);

  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // ============================================================================
  // LOGIN
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
      setLoginError('Credenciales incorrectas.');
    }
  };

  // ============================================================================
  // FIREBASE SYNC
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
    
    let isFirstInv = true;
    const unsubInv = onSnapshot(getColRef('inventory'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(data);
      if (s.empty && isFirstInv) {
        INITIAL_INVENTORY.forEach(item => setDoc(getDocRef('inventory', item.id), item));
      }
      isFirstInv = false;
    });

    const unsubMovs = onSnapshot(getColRef('inventoryMovements'), (s) => 
      setInvMovements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)))
    );
    const unsubCli = onSnapshot(getColRef('clientes'), (s) => 
      setClients(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubReq = onSnapshot(getColRef('requirements'), (s) => 
      setRequirements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)))
    );
    const unsubInv = onSnapshot(getColRef('maquilaInvoices'), (s) => 
      setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)))
    );

    return () => { unsubInv(); unsubMovs(); unsubCli(); unsubReq(); unsubInv(); };
  }, [fbUser]);

  // ============================================================================
  // INVENTARIO - GUARDAR ARTÍCULO
  // ============================================================================
  const handleSaveInvItem = async (e) => {
    e.preventDefault();
    if (!newInvItemForm.id || !newInvItemForm.desc) {
      setDialog({ title: 'Aviso', text: 'Código y descripción son obligatorios.', type: 'alert' });
      return;
    }

    const itemData = {
      ...newInvItemForm,
      id: newInvItemForm.id.toUpperCase(),
      desc: newInvItemForm.desc.toUpperCase(),
      cost: parseNum(newInvItemForm.cost),
      stock: parseNum(newInvItemForm.stock),
      timestamp: Date.now()
    };

    try {
      await setDoc(getDocRef('inventory', itemData.id), itemData, { merge: true });
      setNewInvItemForm(initialInvItemForm);
      setDialog({ title: 'Éxito', text: 'Artículo guardado.', type: 'alert' });
    } catch(err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  };

  // ============================================================================
  // INVENTARIO - GUARDAR MOVIMIENTO
  // ============================================================================
  const handleSaveMovement = async (e) => {
    e.preventDefault();
    if (!newMovementForm.itemId || !newMovementForm.qty) {
      setDialog({ title: 'Aviso', text: 'Seleccione ítem y cantidad.', type: 'alert' });
      return;
    }

    const item = (inventory || []).find(i => i.id === newMovementForm.itemId);
    if (!item) {
      setDialog({ title: 'Error', text: 'Ítem no encontrado.', type: 'alert' });
      return;
    }

    const qty = parseNum(newMovementForm.qty);
    if (qty <= 0) {
      setDialog({ title: 'Error', text: 'La cantidad debe ser mayor a 0.', type: 'alert' });
      return;
    }

    const type = newMovementForm.type;
    const isAddition = type === 'ENTRADA' || type === 'AJUSTE (POSITIVO)';
    const stockChange = isAddition ? qty : -qty;

    if (!isAddition && item.stock < qty) {
      setDialog({ title: 'Stock Insuficiente', text: `Stock actual: ${item.stock} ${item.unit}`, type: 'alert' });
      return;
    }

    const movCost = newMovementForm.cost ? parseNum(newMovementForm.cost) : item.cost;
    const movId = Date.now().toString();

    try {
      const batch = writeBatch(db);
      batch.set(getDocRef('inventoryMovements', movId), {
        id: movId,
        date: newMovementForm.date,
        itemId: item.id,
        itemName: item.desc,
        type: type,
        qty: qty,
        cost: movCost,
        totalValue: qty * movCost,
        reference: newMovementForm.reference.toUpperCase(),
        notes: newMovementForm.notes.toUpperCase(),
        timestamp: Date.now(),
        user: appUser?.name || 'Sistema'
      });
      batch.update(getDocRef('inventory', item.id), {
        stock: item.stock + stockChange,
        cost: isAddition && movCost > 0 ? movCost : item.cost
      });
      await batch.commit();
      setNewMovementForm(initialMovementForm);
      setDialog({ title: 'Éxito', text: 'Movimiento registrado.', type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  };

  // ============================================================================
  // CLIENTES
  // ============================================================================
  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClientForm.rif || !newClientForm.razonSocial) {
      setDialog({ title: 'Aviso', text: 'RIF y Razón Social son obligatorios.', type: 'alert' });
      return;
    }

    const rifUpper = newClientForm.rif.toUpperCase().trim();
    try {
      await setDoc(getDocRef('clientes', rifUpper), {
        ...newClientForm,
        name: newClientForm.razonSocial.toUpperCase().trim(),
        rif: rifUpper,
        timestamp: Date.now()
      }, { merge: true });
      setNewClientForm(initialClientForm);
      setEditingClientId(null);
      setDialog({ title: 'Éxito', text: 'Cliente guardado.', type: 'alert' });
    } catch(err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  };

  const handleDeleteClient = (rif) => {
    setDialog({
      title: 'Eliminar Cliente',
      text: `¿Desea eliminar ${rif}?`,
      type: 'confirm',
      onConfirm: async () => {
        await deleteDoc(getDocRef('clientes', rif));
      }
    });
  };

  // ============================================================================
  // RENDER: LOGIN
  // ============================================================================
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-black">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-black font-black text-4xl">G</span>
            <span className="text-orange-500 font-black text-3xl">&</span>
            <span className="text-black font-black text-4xl">B</span>
          </div>
          <h1 className="text-2xl font-black text-black uppercase">Supply ERP</h1>
          <p className="text-xs text-gray-500 mt-2 uppercase">Sistema de Gestión Integral</p>
        </div>

        {loginError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6 uppercase border border-red-200 flex items-center gap-2">
            <AlertTriangle size={16} />
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Usuario</label>
            <input
              type="text"
              value={loginData.username}
              onChange={e => setLoginData({ ...loginData, username: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl font-black text-sm outline-none focus:border-orange-500"
              placeholder="ADMIN o PLANTA"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Contraseña</label>
            <input
              type="password"
              value={loginData.password}
              onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl font-black text-sm outline-none focus:border-orange-500"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2 text-center text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300">
            <p>Test: <strong>admin / 1234</strong> o <strong>planta / 1234</strong></p>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-lg"
          >
            Entrar al Sistema
          </button>
        </form>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: HOME
  // ============================================================================
  const renderHome = () => (
    <div className="w-full max-w-6xl mx-auto py-8 animate-in fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-black uppercase tracking-widest">Panel Principal ERP</h2>
        <div className="w-24 h-1.5 bg-orange-500 mx-auto mt-4 rounded-full"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        <button
          onClick={() => { setActiveTab('ventas'); setVentasView('facturacion'); }}
          className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"
        >
          <Users size={40} className="text-orange-500 mb-4" />
          <h3 className="text-xl font-black text-white uppercase">Ventas</h3>
          <p className="text-xs text-gray-400 mt-2">Clientes y Facturación</p>
        </button>

        <button
          onClick={() => { setActiveTab('produccion'); setProdView('calculadora'); }}
          className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"
        >
          <Factory size={40} className="text-orange-500 mb-4" />
          <h3 className="text-xl font-black text-white uppercase">Producción</h3>
          <p className="text-xs text-gray-400 mt-2">Órdenes y Control</p>
        </button>

        <button
          onClick={() => { setActiveTab('inventario'); setInvView('catalogo'); }}
          className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"
        >
          <Package size={40} className="text-orange-500 mb-4" />
          <h3 className="text-xl font-black text-white uppercase">Inventario</h3>
          <p className="text-xs text-gray-400 mt-2">Art. 177 LISLR</p>
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: INVENTARIO MODULE (CORREGIDO)
  // ============================================================================
  const renderInventoryModule = () => {
    const filteredMovements = (invMovements || []).filter(m =>
      String(m?.itemName || '').toUpperCase().includes(invSearchTerm.toUpperCase())
    );

    return (
      <div className="space-y-6 animate-in fade-in">
        {invView === 'catalogo' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b bg-white flex justify-between items-center">
              <h2 className="text-xl font-black uppercase flex items-center gap-3">
                <Box className="text-orange-500" /> Catálogo de Artículos
              </h2>
            </div>

            <div className="p-8 bg-gray-50/50 border-b">
              <form onSubmit={handleSaveInvItem} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Código</label>
                    <input
                      type="text"
                      value={newInvItemForm.id}
                      onChange={e => setNewInvItemForm({ ...newInvItemForm, id: e.target.value })}
                      className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-orange-500 border-2 border-transparent transition-all"
                      placeholder="EJ: MP-001"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Descripción</label>
                    <input
                      type="text"
                      value={newInvItemForm.desc}
                      onChange={e => setNewInvItemForm({ ...newInvItemForm, desc: e.target.value })}
                      className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-orange-500 border-2 border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Categoría</label>
                    <select
                      value={newInvItemForm.category}
                      onChange={e => setNewInvItemForm({ ...newInvItemForm, category: e.target.value })}
                      className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none border-2 border-transparent"
                    >
                      <option value="Materia Prima">Materia Prima</option>
                      <option value="Insumos">Insumos</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Costo ($/kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newInvItemForm.cost}
                      onChange={e => setNewInvItemForm({ ...newInvItemForm, cost: e.target.value })}
                      className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-orange-500 border-2 border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Stock Inicial</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newInvItemForm.stock}
                      onChange={e => setNewInvItemForm({ ...newInvItemForm, stock: e.target.value })}
                      className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-orange-500 border-2 border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Unidad</label>
                    <select
                      value={newInvItemForm.unit}
                      onChange={e => setNewInvItemForm({ ...newInvItemForm, unit: e.target.value })}
                      className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none border-2 border-transparent"
                    >
                      <option value="kg">kg</option>
                      <option value="unidad">Unidad</option>
                      <option value="litro">Litro</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="bg-black text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-800 transition-all"
                  >
                    Guardar Artículo
                  </button>
                </div>
              </form>
            </div>

            <div className="p-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-white border-b-2 border-gray-100">
                    <tr className="uppercase font-black text-[10px] text-gray-400 tracking-widest">
                      <th className="py-4 px-4">Código</th>
                      <th className="py-4 px-4">Descripción</th>
                      <th className="py-4 px-4">Categoría</th>
                      <th className="py-4 px-4 text-right">Stock</th>
                      <th className="py-4 px-4 text-right">Costo</th>
                      <th className="py-4 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-black">
                    {(inventory || []).map(item => (
                      <tr key={item?.id} className="hover:bg-gray-50">
                        <td className="py-5 px-4 font-black text-sm">{item?.id}</td>
                        <td className="py-5 px-4 font-bold text-xs">{item?.desc}</td>
                        <td className="py-5 px-4 text-xs">{item?.category}</td>
                        <td className="py-5 px-4 text-right font-bold">{formatNum(item?.stock)} {item?.unit}</td>
                        <td className="py-5 px-4 text-right font-bold">${formatNum(item?.cost)}</td>
                        <td className="py-5 px-4 text-center">
                          <button
                            onClick={() => { 
                              setNewInvItemForm(item);
                            }}
                            className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {invView === 'cargo' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b bg-white flex justify-between items-center">
              <h2 className="text-xl font-black uppercase flex items-center gap-3">
                <ArrowDownToLine className="text-orange-500" /> Cargo de Inventario
              </h2>
            </div>

            <div className="p-8 bg-gray-50/50 border-b">
              <form onSubmit={handleSaveMovement} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Fecha</label>
                    <input
                      type="date"
                      value={newMovementForm.date}
                      onChange={e => setNewMovementForm({ ...newMovementForm, date: e.target.value })}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl font-black text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Artículo</label>
                    <select
                      value={newMovementForm.itemId}
                      onChange={e => setNewMovementForm({ ...newMovementForm, itemId: e.target.value })}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl font-black text-xs outline-none"
                    >
                      <option value="">Seleccione...</option>
                      {(inventory || []).map(item => (
                        <option key={item.id} value={item.id}>
                          {item.id} - {item.desc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Cantidad</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newMovementForm.qty}
                      onChange={e => setNewMovementForm({ ...newMovementForm, qty: e.target.value })}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl font-black text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="bg-black text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-800 transition-all"
                  >
                    Registrar Cargo
                  </button>
                </div>
              </form>
            </div>

            <div className="p-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-white border-b-2 border-gray-100">
                    <tr className="uppercase font-black text-[10px] text-gray-400 tracking-widest">
                      <th className="py-4 px-4">Fecha</th>
                      <th className="py-4 px-4">Artículo</th>
                      <th className="py-4 px-4 text-right">Cantidad</th>
                      <th className="py-4 px-4">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-black">
                    {filteredMovements.map(mov => (
                      <tr key={mov?.id} className="hover:bg-gray-50">
                        <td className="py-5 px-4 text-sm">{mov?.date}</td>
                        <td className="py-5 px-4 font-bold text-xs">{mov?.itemName}</td>
                        <td className="py-5 px-4 text-right font-bold">{formatNum(mov?.qty)}</td>
                        <td className="py-5 px-4 text-xs">{mov?.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER: VENTAS MODULE (PLACEHOLDER)
  // ============================================================================
  const renderVentasModule = () => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 text-center">
      <Users size={40} className="text-orange-500 mx-auto mb-4" />
      <h2 className="text-xl font-black text-black uppercase">Módulo de Ventas</h2>
      <p className="text-sm text-gray-500 mt-2">En desarrollo...</p>
    </div>
  );

  // ============================================================================
  // RENDER: PRODUCCIÓN MODULE (PLACEHOLDER)
  // ============================================================================
  const renderProductionModule = () => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 text-center">
      <Factory size={40} className="text-orange-500 mx-auto mb-4" />
      <h2 className="text-xl font-black text-black uppercase">Módulo de Producción</h2>
      <p className="text-sm text-gray-500 mt-2">En desarrollo...</p>
    </div>
  );

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  if (!appUser) {
    return <ErrorBoundary>{renderLogin()}</ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col">
        <header className="bg-black border-b-4 border-orange-500 sticky top-0 z-50 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div
                className="flex items-center gap-4 cursor-pointer transition-transform hover:scale-105"
                onClick={() => setActiveTab('home')}
              >
                <div className="flex items-center bg-white rounded-2xl px-3 py-1 shadow-inner">
                  <span className="text-black font-black text-3xl leading-none">G</span>
                  <span className="text-orange-500 font-black text-2xl mx-0.5">&</span>
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
                <button
                  onClick={() => setAppUser(null)}
                  className="text-gray-400 hover:text-white transition-all bg-gray-800 hover:bg-red-600 p-2.5 rounded-2xl border border-gray-700 shadow-lg"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 flex-1">
          {activeTab !== 'home' && (
            <nav className="md:w-64 flex-shrink-0 space-y-4 animate-in slide-in-from-left">
              <button
                onClick={() => setActiveTab('home')}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 text-xs font-black rounded-2xl bg-black text-white shadow-xl hover:bg-gray-800 mb-4 uppercase tracking-widest transition-all"
              >
                <Home size={18} className="text-orange-500" /> INICIO
              </button>

              {activeTab === 'inventario' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Package size={14} className="text-orange-500" /> Inventario
                  </h3>
                  <button
                    onClick={() => setInvView('catalogo')}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'catalogo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <Box size={16} /> Catálogo
                  </button>
                  <button
                    onClick={() => setInvView('cargo')}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'cargo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <ArrowDownToLine size={16} /> Cargo
                  </button>
                </div>
              )}

              {activeTab === 'ventas' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Receipt size={14} className="text-orange-500" /> Ventas
                  </h3>
                  <button
                    onClick={() => setVentasView('clientes')}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'clientes' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <Users size={16} /> Clientes
                  </button>
                </div>
              )}

              {activeTab === 'produccion' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Factory size={14} className="text-orange-500" /> Producción
                  </h3>
                  <button
                    onClick={() => setProdView('calculadora')}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'calculadora' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}
                  >
                    <Calculator size={16} /> Simulador
                  </button>
                </div>
              )}
            </nav>
          )}

          <main className={`flex-1 min-w-0 pb-12 ${activeTab === 'home' ? 'flex items-center justify-center' : ''}`}>
            {activeTab === 'home' && renderHome()}
            {activeTab === 'ventas' && renderVentasModule()}
            {activeTab === 'produccion' && renderProductionModule()}
            {activeTab === 'inventario' && renderInventoryModule()}
          </main>
        </div>

        {dialog && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-3xl shadow-2xl border-t-8 border-orange-500 p-8 w-full max-w-md transform animate-in zoom-in-95">
              <h3 className="text-xl font-black text-black uppercase tracking-widest mb-4">{dialog.title}</h3>
              <p className="text-sm font-bold text-gray-500 mb-8 uppercase text-center">{dialog.text}</p>
              <div className="flex gap-4">
                {dialog.type === 'confirm' && (
                  <button
                    onClick={() => setDialog(null)}
                    className="flex-1 bg-gray-100 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors text-gray-800"
                  >
                    CANCELAR
                  </button>
                )}
                <button
                  onClick={() => {
                    if (dialog.onConfirm) dialog.onConfirm();
                    setDialog(null);
                  }}
                  className="flex-1 bg-black text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-gray-900 transition-colors"
                >
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

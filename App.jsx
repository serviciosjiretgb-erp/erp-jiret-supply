import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, Package, Factory, TrendingUp, AlertTriangle, 
  ClipboardList, PlayCircle, History, FileText, Settings2, Trash2, 
  PlusCircle, Calculator, Plus, Users, UserPlus, LogOut, Lock, 
  ArrowDownToLine, ArrowUpFromLine, BarChart3, ShieldCheck, Box, Home, Edit, Printer, X, Search, Loader2, FileCheck, Beaker, CheckCircle, CheckCircle2, Receipt, ArrowRight, User, ArrowRightLeft, ClipboardEdit, Download, Thermometer, Gauge, Save, ShoppingCart, DollarSign, Percent, Briefcase, Zap, Wrench, CreditCard, Activity
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, onSnapshot, deleteDoc, writeBatch } from "firebase/firestore";

// ============================================================================
// UTILIDADES Y FUNCIONES PURAS
// ============================================================================

const formatNum = (num) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);

const parseNum = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  let str = String(val || '').trim();
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

const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const calcPesoMillar = (ancho, fuelles, largo, micras) => (ancho + fuelles) * largo * micras;

const calcRequestedKg = (tipoProducto, presentacion, cantidad, pesoMillar) => {
  if (tipoProducto === 'TERMOENCOGIBLE') return cantidad;
  return presentacion === 'KILOS' ? cantidad : pesoMillar * cantidad;
};

const buildProductDescription = (tipoProducto, ancho, fuelles, largo, micras, color) => {
  const micFmt = micras < 1 && micras > 0 ? Math.round(micras * 1000) : micras;
  if (tipoProducto === 'BOLSAS') {
    return fuelles > 0 
      ? `(${ancho}+${fuelles/2}+${fuelles/2})X${largo}X${micFmt}MIC | ${color}`
      : `${ancho}X${largo}X${micFmt}MIC | ${color}`;
  }
  return `TERMOENCOGIBLE ${ancho}CM X ${micFmt}MIC | ${color}`;
};

const calculateWeightedAverageCost = (oldStock, oldCost, newQty, newCost) => {
  const totalStock = oldStock + newQty;
  if (totalStock <= 0) return oldCost;
  return ((oldStock * oldCost) + (newQty * newCost)) / totalStock;
};

const isMovementAddition = (type) => type === 'ENTRADA' || type === 'AJUSTE (POSITIVO)';

const getMermaColor = (pct) => {
  if (pct <= 5.0) return 'text-green-500';
  if (pct > 5.0 && pct <= 5.5) return 'text-yellow-500';
  return 'text-red-500';
};

const validateStock = (item, qty, isAddition) => {
  if (!item) return { valid: false, error: 'Ítem no encontrado' };
  if (!isAddition && (item.stock || 0) < qty) {
    return { valid: false, error: `Stock insuficiente. Disponible: ${item.stock}` };
  }
  return { valid: true };
};

const validateFormRequired = (form, requiredFields) => {
  for (const field of requiredFields) {
    if (!form[field] || String(form[field]).trim() === '') {
      return { valid: false, error: `Campo ${field} requerido` };
    }
  }
  return { valid: true };
};

const generateId = (prefix, items) => {
  const maxNum = items.reduce((max, item) => {
    const num = parseInt(String(item.id).replace(/\D/g, '') || '0', 10);
    return Math.max(max, num);
  }, 0);
  return `${prefix}${(maxNum + 1).toString().padStart(prefix === 'OP-' ? 5 : 4, '0')}`;
};

const compressImage = (file, callback) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = event => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const MAX_WIDTH = 1920;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
  };
};

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
    this.setState({ errorMsg: error && error.message ? error.message : String(error) });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 print:hidden">
          <AlertTriangle size={60} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-black text-black uppercase mb-2">Sistema Protegido de Caída</h2>
          <p className="text-gray-500 text-sm mb-6">{this.state.errorMsg}</p>
          <button onClick={() => window.location.reload()} className="bg-black text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg">
            Recargar Interfaz
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// CONFIGURACIÓN FIREBASE
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

const INITIAL_INVENTORY = [
  { id: 'MP-0240', desc: 'ESENTTIA', cost: 0.96, stock: 2325, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-11PG4', desc: 'METALOCENO', cost: 0.91, stock: 1735, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-3003', desc: 'BAPOLENE', cost: 0.96, stock: 500, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-RECICLADO', desc: 'MATERIAL RECICLADO', cost: 1.00, stock: 9999, unit: 'kg', category: 'Materia Prima' }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [systemUsers, setSystemUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('home');
  const [ventasView, setVentasView] = useState('facturacion');
  const [prodView, setProdView] = useState('calculadora');
  const [invView, setInvView] = useState('catalogo');
  const [costosView, setCostosView] = useState('dashboard');

  const [inventory, setInventory] = useState([]);
  const [invMovements, setInvMovements] = useState([]);
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invRequisitions, setInvRequisitions] = useState([]);
  const [opCosts, setOpCosts] = useState([]);

  const [dialog, setDialog] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invSearchTerm, setInvSearchTerm] = useState('');

  const [isAjusteUnlocked, setIsAjusteUnlocked] = useState(false);
  const [ajustePassword, setAjustePassword] = useState('');

  const [invReportType, setInvReportType] = useState('entradas');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const initialUserForm = useMemo(() => ({
    username: '', password: '', name: '', role: 'Usuario',
    permissions: { ventas: false, produccion: false, inventario: false, costos: false, configuracion: false }
  }), []);

  const initialClientForm = useMemo(() => ({
    rif: '', razonSocial: '', direccion: '', telefono: '', personaContacto: '', vendedor: '', fechaCreacion: getTodayDate()
  }), []);

  const initialInvoiceForm = useMemo(() => ({
    fecha: getTodayDate(), clientRif: '', clientName: '', documento: '', productoMaquilado: '',
    vendedor: '', montoBase: '', iva: '', total: '', aplicaIva: 'SI', opAsignada: ''
  }), []);

  const initialOpCostForm = useMemo(() => ({
    date: getTodayDate(), category: 'Nómina', description: '', amount: ''
  }), []);

  const initialCalcInputs = useMemo(() => ({
    ingredientes: [
      { id: Date.now() + 1, nombre: 'MP-0240', pct: 80, costo: 0.96 },
      { id: Date.now() + 2, nombre: 'MP-RECICLADO', pct: 20, costo: 1.00 }
    ],
    cantidadSolicitada: '', mermaGlobalPorc: 5, tipoProducto: 'BOLSAS',
    ancho: '', fuelles: '', largo: '', micras: ''
  }), []);

  const [newUserForm, setNewUserForm] = useState(initialUserForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newClientForm, setNewClientForm] = useState(initialClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const [newInvoiceForm, setNewInvoiceForm] = useState(initialInvoiceForm);
  const [calcInputs, setCalcInputs] = useState(initialCalcInputs);
  const [newOpCostForm, setNewOpCostForm] = useState(initialOpCostForm);

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error(err));
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    
    let isFirstInv = true;

    const unsubUsers = onSnapshot(getColRef('users'), (s) => {
      const loadedUsers = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setSystemUsers(loadedUsers);
      
      if (s.empty) {
        setDoc(getDocRef('users', 'admin'), {
          username: 'admin', password: '1234', name: 'Administrador General', role: 'Master',
          permissions: { ventas: true, produccion: true, inventario: true, costos: true, configuracion: true }
        });
      }
    });

    const unsubSettings = onSnapshot(getDocRef('settings', 'general'), (d) => {
      if (d.exists()) setSettings(d.data());
    });

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

    const unsubInvB = onSnapshot(getColRef('maquilaInvoices'), (s) =>
      setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)))
    );

    const unsubInvReqs = onSnapshot(getColRef('inventoryRequisitions'), (s) =>
      setInvRequisitions(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)))
    );

    const unsubOpCosts = onSnapshot(getColRef('operatingCosts'), (s) =>
      setOpCosts(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)))
    );

    return () => {
      unsubUsers();
      unsubSettings();
      unsubInv();
      unsubMovs();
      unsubCli();
      unsubReq();
      unsubInvB();
      unsubInvReqs();
      unsubOpCosts();
    };
  }, [fbUser]);

  const clearAllReports = useCallback(() => {
    // Implementación simplificada
  }, []);

  const handleLogin = useCallback((e) => {
    e.preventDefault();
    const user = loginData.username.toLowerCase().trim();
    const pass = loginData.password.trim();
    const foundUser = systemUsers.find(u => u.username === user && u.password === pass);
    
    if (foundUser) {
      setAppUser(foundUser);
      setLoginError('');
    } else {
      setLoginError('Credenciales incorrectas. Intente nuevamente.');
    }
  }, [loginData, systemUsers]);

  const handleBgUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, async (base64) => {
        try {
          await setDoc(getDocRef('settings', 'general'), { loginBg: base64 }, { merge: true });
          setDialog({ title: 'Éxito', text: 'Fondo actualizado.', type: 'alert' });
        } catch (error) {
          setDialog({ title: 'Error', text: 'Imagen muy pesada o error de red.', type: 'alert' });
        }
      });
    }
  }, []);

  const handleSaveUser = useCallback(async (e) => {
    e.preventDefault();
    
    if (!newUserForm.username || !newUserForm.password) {
      return setDialog({ title: 'Aviso', text: 'Usuario y contraseña requeridos.', type: 'alert' });
    }

    const userId = newUserForm.username.toLowerCase().trim();
    
    try {
      await setDoc(getDocRef('users', userId), { ...newUserForm, username: userId });
      setNewUserForm(initialUserForm);
      setEditingUserId(null);
      setDialog({ title: 'Éxito', text: 'Usuario registrado.', type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, [newUserForm, initialUserForm]);

  const startEditUser = useCallback((u) => {
    setEditingUserId(u.username);
    setNewUserForm(u);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDeleteUser = useCallback((id) => {
    if (id === 'admin') {
      return setDialog({ title: 'Acción Denegada', text: 'No puedes eliminar al administrador.', type: 'alert' });
    }
    
    setDialog({
      title: 'Eliminar Usuario',
      text: `¿Desea eliminar el acceso a ${id}?`,
      type: 'confirm',
      onConfirm: async () => await deleteDoc(getDocRef('users', id))
    });
  }, []);

  const handleAddOpCost = useCallback(async (e) => {
    e.preventDefault();
    
    if (!newOpCostForm.amount) return;

    try {
      await addDoc(collection(db, 'operatingCosts'), {
        ...newOpCostForm,
        amount: parseNum(newOpCostForm.amount),
        timestamp: Date.now(),
        user: appUser?.name || 'Admin'
      });
      
      setNewOpCostForm({ ...newOpCostForm, description: '', amount: '' });
      setDialog({ title: 'Éxito', text: 'Costo operativo registrado en el mes actual.', type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, [newOpCostForm, appUser]);

  const handleDeleteOpCost = useCallback(async (id) => {
    setDialog({
      title: 'Eliminar Costo',
      text: '¿Desea eliminar este registro de costo operativo?',
      type: 'confirm',
      onConfirm: async () => {
        await deleteDoc(doc(db, 'operatingCosts', id));
      }
    });
  }, []);

  const filteredInventory = useMemo(() => {
    const searchUpper = (invSearchTerm || '').toUpperCase();
    return (inventory || []).filter(i =>
      (i?.id || '').includes(searchUpper) ||
      (i?.desc || '').includes(searchUpper)
    );
  }, [inventory, invSearchTerm]);

  const filteredClients = useMemo(() => {
    const searchUpper = clientSearchTerm.toUpperCase();
    return (clients || []).filter(c =>
      String(c?.name || '').toUpperCase().includes(searchUpper) ||
      String(c?.rif || '').toUpperCase().includes(searchUpper)
    );
  }, [clients, clientSearchTerm]);

  const filteredInvoices = useMemo(() => {
    const searchUpper = invoiceSearchTerm.toUpperCase();
    return (invoices || []).filter(inv =>
      String(inv?.documento || '').toUpperCase().includes(searchUpper) ||
      String(inv?.clientName || '').toUpperCase().includes(searchUpper)
    );
  }, [invoices, invoiceSearchTerm]);

  const filteredMovements = useMemo(() => {
    const searchUpper = (invSearchTerm || '').toUpperCase();
    return (invMovements || []).filter(m =>
      (m?.itemId || '').toUpperCase().includes(searchUpper) ||
      (m?.itemName || '').toUpperCase().includes(searchUpper) ||
      (m?.reference || '').toUpperCase().includes(searchUpper)
    );
  }, [invMovements, invSearchTerm]);

  const activeOrders = useMemo(() => {
    return (requirements || []).filter(r => r?.status === 'EN PROCESO');
  }, [requirements]);

  const completedOrders = useMemo(() => {
    return (requirements || []).filter(r => r?.status === 'COMPLETADO');
  }, [requirements]);

  const simulatorCalculations = useMemo(() => {
    const simW = parseNum(calcInputs?.ancho);
    const simL = parseNum(calcInputs?.largo);
    const simM = parseNum(calcInputs?.micras);
    const simFu = parseNum(calcInputs?.fuelles);
    const isBolsas = calcInputs?.tipoProducto === 'BOLSAS';

    let simPesoMillar = 0;
    if (isBolsas) {
      simPesoMillar = calcPesoMillar(simW, simFu, simL, simM);
    }

    const inputCantidadSolicitada = parseNum(calcInputs?.cantidadSolicitada) || 0;
    const calcKilosNetos = isBolsas ? (inputCantidadSolicitada * simPesoMillar) : inputCantidadSolicitada;

    const mermaPorc = parseNum(calcInputs?.mermaGlobalPorc) || 5;
    const calcTotalMezcla = (calcKilosNetos > 0 && mermaPorc < 100)
      ? (calcKilosNetos / (1 - (mermaPorc / 100)))
      : calcKilosNetos;
    const calcMermaGlobalKg = calcTotalMezcla - calcKilosNetos;

    let calcCostoMezclaPreparada = 0;
    const calcIngredientesProcesados = (calcInputs?.ingredientes || []).map(ing => {
      const kg = ((ing?.pct || 0) / 100) * calcTotalMezcla;
      const totalCost = kg * (ing?.costo || 0);
      calcCostoMezclaPreparada += totalCost;

      const invItem = inventory.find(i => i?.id === ing?.nombre);
      let desc = invItem ? invItem.desc : ing?.nombre;

      if (!invItem) {
        if (ing?.nombre === 'MP-0240') desc = 'PEBD 240 (ESENTTIA)';
        if (ing?.nombre === 'MP-11PG4') desc = 'LINEAL 11PG4 (METALOCENO)';
        if (ing?.nombre === 'MP-3003') desc = 'PEBD 3003 (BAPOLENE)';
        if (ing?.nombre === 'MP-RECICLADO') desc = 'MATERIAL RECICLADO';
      }

      return { ...ing, desc, kg, totalCost };
    });

    const calcCostoPromedio = calcTotalMezcla > 0 ? (calcCostoMezclaPreparada / calcTotalMezcla) : 0;
    const calcCostoUnitarioNeto = calcKilosNetos > 0 ? (calcCostoMezclaPreparada / calcKilosNetos) : 0;
    const calcCostoFinalUnidad = inputCantidadSolicitada > 0 ? (calcCostoMezclaPreparada / inputCantidadSolicitada) : 0;
    const simUmFinal = isBolsas ? 'Millares' : 'KG';

    return {
      simPesoMillar,
      inputCantidadSolicitada,
      calcKilosNetos,
      calcTotalMezcla,
      calcMermaGlobalKg,
      calcCostoMezclaPreparada,
      calcIngredientesProcesados,
      calcCostoPromedio,
      calcCostoUnitarioNeto,
      calcCostoFinalUnidad,
      simUmFinal,
      isBolsas
    };
  }, [calcInputs, inventory]);

  const globalCostCalculations = useMemo(() => {
    const totalIncome = invoices.reduce((acc, inv) => acc + parseNum(inv.montoBase), 0);

    let totalOpCostsMP = 0;
    completedOrders.forEach(req => {
      ['extrusion', 'impresion', 'sellado'].forEach(phase => {
        (req.production?.[phase]?.batches || []).forEach(b => {
          totalOpCostsMP += parseNum(b.cost);
        });
      });
    });

    const totalOpCostsOperativos = opCosts.reduce((acc, cost) => acc + parseNum(cost.amount), 0);
    const totalCostsGlobal = totalOpCostsMP + totalOpCostsOperativos;
    const globalProfit = totalIncome - totalCostsGlobal;
    const globalMargin = totalIncome > 0 ? (globalProfit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalOpCostsMP,
      totalOpCostsOperativos,
      totalCostsGlobal,
      globalProfit,
      globalMargin
    };
  }, [invoices, completedOrders, opCosts]);

  const renderHome = () => {
    const hasPerm = (module) => appUser?.permissions ? appUser.permissions[module] : appUser?.role === 'Master';

    return (
      <div className="w-full max-w-6xl mx-auto py-8 animate-in fade-in">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-black uppercase tracking-widest">Panel Principal ERP</h2>
          <div className="w-24 h-1.5 bg-orange-500 mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mb-8">
          {hasPerm('ventas') && (
            <button
              onClick={() => { clearAllReports(); setActiveTab('ventas'); setVentasView('facturacion'); }}
              className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"
            >
              <Users size={40} className="text-orange-500 mb-4" />
              <h3 className="text-xl font-black text-white uppercase">Ventas y Facturación</h3>
              <p className="text-xs text-gray-400 mt-2">Directorio, OP y Facturación.</p>
            </button>
          )}

          {hasPerm('produccion') && (
            <button
              onClick={() => { clearAllReports(); setActiveTab('produccion'); setProdView('fases_produccion'); }}
              className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"
            >
              <Factory size={40} className="text-orange-500 mb-4" />
              <h3 className="text-xl font-black text-white uppercase">Producción Planta</h3>
              <p className="text-xs text-gray-400 mt-2">Control de Fases y Reportes.</p>
            </button>
          )}

          {hasPerm('inventario') && (
            <button
              onClick={() => { clearAllReports(); setActiveTab('inventario'); setInvView('catalogo'); }}
              className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"
            >
              <Package size={40} className="text-orange-500 mb-4" />
              <h3 className="text-xl font-black text-white uppercase">Control Inventario</h3>
              <p className="text-xs text-gray-400 mt-2">Art. 177 LISLR, Movimientos y Kardex.</p>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mt-8">
          {hasPerm('produccion') && (
            <button
              onClick={() => { clearAllReports(); setActiveTab('produccion'); setProdView('calculadora'); }}
              className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md"
            >
              <Calculator size={40} className="text-gray-400 mb-4" />
              <h3 className="text-xl font-black text-gray-800 uppercase">Simulador Producción</h3>
              <p className="text-xs text-gray-400 mt-2">Cálculo de Insumos y Mermas.</p>
            </button>
          )}

          {hasPerm('costos') && (
            <button
              onClick={() => { clearAllReports(); setActiveTab('costos'); setCostosView('operativos'); }}
              className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md"
            >
              <Wrench size={40} className="text-gray-400 mb-4" />
              <h3 className="text-xl font-black text-gray-800 uppercase">Costos Operativos</h3>
              <p className="text-xs text-gray-400 mt-2">Gestión de Gastos de Planta.</p>
            </button>
          )}

          {hasPerm('costos') && (
            <button
              onClick={() => { clearAllReports(); setActiveTab('costos'); setCostosView('dashboard'); }}
              className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md"
            >
              <BarChart3 size={40} className="text-gray-400 mb-4" />
              <h3 className="text-xl font-black text-gray-800 uppercase">Reportes de Costo</h3>
              <p className="text-xs text-gray-400 mt-2">Análisis de Utilidad y Rentabilidad.</p>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mt-8">
          {hasPerm('configuracion') && (
            <button
              onClick={() => { clearAllReports(); setActiveTab('configuracion'); }}
              className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md"
            >
              <Settings2 size={40} className="text-gray-400 mb-4" />
              <h3 className="text-xl font-black text-gray-800 uppercase">Configuración</h3>
              <p className="text-xs text-gray-400 mt-2">Usuarios y Permisos.</p>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderVentasModule = () => {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-black text-black uppercase mb-4">Módulo de Ventas</h2>
          <p className="text-sm text-gray-600">
            Vista: <span className="font-black text-orange-600">{ventasView}</span>
          </p>
          
          <div className="mt-6 space-y-4">
            {ventasView === 'clientes' && (
              <div>
                <h3 className="text-lg font-black mb-4">Directorio de Clientes</h3>
                <div className="grid gap-4">
                  {filteredClients.map(c => (
                    <div key={c.rif} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="font-black text-orange-600">{c.rif}</p>
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.direccion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ventasView === 'facturacion' && (
              <div>
                <h3 className="text-lg font-black mb-4">Facturas</h3>
                <div className="grid gap-4">
                  {filteredInvoices.map(inv => (
                    <div key={inv.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="font-black text-orange-600">{inv.documento}</p>
                      <p className="font-bold text-sm">{inv.clientName}</p>
                      <p className="text-lg font-black text-green-600">${formatNum(inv.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ventasView === 'requisiciones' && (
              <div>
                <h3 className="text-lg font-black mb-4">Requisiciones (OP)</h3>
                <div className="grid gap-4">
                  {requirements.map(r => (
                    <div key={r.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="font-black text-orange-600">#{String(r.id).replace('OP-', '').padStart(5, '0')}</p>
                      <p className="font-bold text-sm">{r.client}</p>
                      <p className="text-xs text-gray-500">{r.desc}</p>
                      <p className="text-sm font-black mt-2">{formatNum(r.requestedKg)} KG</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProductionModule = () => {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-black text-black uppercase mb-4">Módulo de Producción</h2>
          <p className="text-sm text-gray-600">
            Vista: <span className="font-black text-orange-600">{prodView}</span>
          </p>

          {prodView === 'calculadora' && (
            <div className="mt-6">
              <h3 className="text-lg font-black mb-4">Simulador de Producción</h3>
              
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 mb-6">
                <h4 className="text-sm font-black uppercase mb-4">Resultados del Cálculo</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-bold">Peso por Millar:</p>
                    <p className="font-black text-lg">{formatNum(simulatorCalculations.simPesoMillar)} KG</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-bold">Kilos Netos:</p>
                    <p className="font-black text-lg text-blue-600">{formatNum(simulatorCalculations.calcKilosNetos)} KG</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-bold">Total Mezcla:</p>
                    <p className="font-black text-lg text-green-600">{formatNum(simulatorCalculations.calcTotalMezcla)} KG</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-bold">Merma Global:</p>
                    <p className="font-black text-lg text-red-600">{formatNum(simulatorCalculations.calcMermaGlobalKg)} KG</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 font-bold">Costo Total:</p>
                    <p className="font-black text-2xl text-orange-600">${formatNum(simulatorCalculations.calcCostoMezclaPreparada)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black uppercase">Ingredientes</h4>
                {simulatorCalculations.calcIngredientesProcesados.map(ing => (
                  <div key={ing.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div>
                      <p className="font-black text-sm">{ing.desc}</p>
                      <p className="text-xs text-gray-500">{ing.pct}% de la mezcla</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{formatNum(ing.kg)} KG</p>
                      <p className="text-xs text-gray-600">${formatNum(ing.totalCost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prodView === 'fases_produccion' && (
            <div className="mt-6">
              <h3 className="text-lg font-black mb-4">Órdenes Activas</h3>
              <div className="grid gap-4">
                {activeOrders.map(r => (
                  <div key={r.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="font-black text-orange-600">#{String(r.id).replace('OP-', '').padStart(5, '0')}</p>
                    <p className="font-bold text-sm">{r.client}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prodView === 'historial' && (
            <div className="mt-6">
              <h3 className="text-lg font-black mb-4">Órdenes Completadas</h3>
              <div className="grid gap-4">
                {completedOrders.map(r => (
                  <div key={r.id} className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="font-black text-green-600">#{String(r.id).replace('OP-', '').padStart(5, '0')}</p>
                    <p className="font-bold text-sm">{r.client}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                    <p className="text-sm font-black mt-2 text-green-700">✓ COMPLETADO</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInventoryModule = () => {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-black text-black uppercase mb-4">Módulo de Inventario</h2>
          <p className="text-sm text-gray-600">
            Vista: <span className="font-black text-orange-600">{invView}</span>
          </p>

          {invView === 'catalogo' && (
            <div className="mt-6">
              <h3 className="text-lg font-black mb-4">Catálogo de Productos</h3>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={invSearchTerm}
                  onChange={e => setInvSearchTerm(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid gap-4">
                {filteredInventory.map(item => (
                  <div key={item.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div>
                      <p className="font-black text-orange-600">{item.id}</p>
                      <p className="font-bold text-sm">{item.desc}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-600 text-lg">{formatNum(item.stock)} {item.unit}</p>
                      <p className="text-xs text-gray-600">Costo: ${formatNum(item.cost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invView === 'kardex' && (
            <div className="mt-6">
              <h3 className="text-lg font-black mb-4">Historial de Movimientos</h3>
              <div className="grid gap-4">
                {filteredMovements.slice(0, 10).map(m => {
                  const isPos = isMovementAddition(m.type);
                  return (
                    <div key={m.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-sm">{m.itemName}</p>
                          <p className="text-xs text-gray-500">{m.date} - {m.reference}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-lg ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                            {isPos ? '+' : '-'}{formatNum(m.qty)}
                          </p>
                          <p className="text-xs">{m.type}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {invView === 'requisiciones' && (
            <div className="mt-6">
              <h3 className="text-lg font-black mb-4">Requisiciones de Planta</h3>
              <div className="grid gap-4">
                {invRequisitions.map(r => (
                  <div
                    key={r.id}
                    className={`p-4 rounded-xl border-2 ${
                      r.status === 'PENDIENTE' ? 'bg-orange-50 border-orange-200' :
                      r.status === 'APROBADO' ? 'bg-green-50 border-green-200' :
                      'bg-red-50 border-red-200'
                    }`}
                  >
                    <p className="font-black text-sm">OP: {r.opId} - Fase: {r.phase}</p>
                    <p className="text-xs text-gray-600 mt-1">{r.date}</p>
                    <p className={`text-xs font-black mt-2 ${
                      r.status === 'PENDIENTE' ? 'text-orange-700' :
                      r.status === 'APROBADO' ? 'text-green-700' :
                      'text-red-700'
                    }`}>
                      {r.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCostosModule = () => {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-black text-black uppercase mb-4">Módulo de Costos</h2>
          <p className="text-sm text-gray-600">
            Vista: <span className="font-black text-orange-600">{costosView}</span>
          </p>

          {costosView === 'dashboard' && (
            <div className="mt-6">
              <h3 className="text-lg font-black mb-6">Dashboard General</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                  <DollarSign size={32} className="text-green-600 mx-auto mb-2" />
                  <p className="text-xs font-black text-gray-600 uppercase">Ingresos</p>
                  <p className="text-2xl font-black text-green-600">${formatNum(globalCostCalculations.totalIncome)}</p>
                </div>

                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
                  <TrendingUp size={32} className="text-red-600 mx-auto mb-2" />
                  <p className="text-xs font-black text-gray-600 uppercase">Costo MP</p>
                  <p className="text-2xl font-black text-red-600">${formatNum(globalCostCalculations.totalOpCostsMP)}</p>
                </div>

                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 text-center">
                  <Wrench size={32} className="text-orange-600 mx-auto mb-2" />
                  <p className="text-xs font-black text-gray-600 uppercase">Costos Op.</p>
                  <p className="text-2xl font-black text-orange-600">${formatNum(globalCostCalculations.totalOpCostsOperativos)}</p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
                  <Briefcase size={32} className="text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-black text-gray-600 uppercase">Ganancia</p>
                  <p className={`text-2xl font-black ${globalCostCalculations.globalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${formatNum(globalCostCalculations.globalProfit)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6">
                <p className="text-sm font-black text-gray-600 uppercase mb-2">Margen de Ganancia</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div
                      className={`h-full ${globalCostCalculations.globalMargin >= 30 ? 'bg-green-500' : globalCostCalculations.globalMargin > 0 ? 'bg-orange-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.max(0, Math.min(100, globalCostCalculations.globalMargin))}%` }}
                    ></div>
                  </div>
                  <p className="text-2xl font-black">{formatNum(globalCostCalculations.globalMargin)}%</p>
                </div>
              </div>
            </div>
          )}

          {costosView === 'operativos' && (
            <div className="mt-6">
              <h3 className="text-lg font-black mb-4">Costos Operativos</h3>
              
              <form onSubmit={handleAddOpCost} className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="date"
                    value={newOpCostForm.date}
                    onChange={e => setNewOpCostForm({ ...newOpCostForm, date: e.target.value })}
                    className="p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500"
                  />
                  <select
                    value={newOpCostForm.category}
                    onChange={e => setNewOpCostForm({ ...newOpCostForm, category: e.target.value })}
                    className="p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-xs uppercase"
                  >
                    <option value="Nómina">Nómina</option>
                    <option value="Electricidad">Electricidad</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Otros">Otros</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={newOpCostForm.description}
                    onChange={e => setNewOpCostForm({ ...newOpCostForm, description: e.target.value })}
                    className="p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 uppercase font-bold text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Monto $"
                      value={newOpCostForm.amount}
                      onChange={e => setNewOpCostForm({ ...newOpCostForm, amount: e.target.value })}
                      className="flex-1 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 text-center font-black"
                    />
                    <button
                      type="submit"
                      className="bg-black text-white px-6 rounded-xl font-black text-xs uppercase"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </form>

              <div className="grid gap-3">
                {opCosts.slice(0, 10).map(c => (
                  <div key={c.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div>
                      <p className="font-black text-sm">{c.description}</p>
                      <p className="text-xs text-gray-500">{c.date} - {c.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-red-600 text-lg">${formatNum(c.amount)}</p>
                      <button
                        onClick={() => handleDeleteOpCost(c.id)}
                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConfigModule = () => {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in w-full">
        <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-black text-black uppercase flex items-center gap-3">
            <Settings2 className="text-orange-500" size={24} /> Gestión de Usuarios y Permisos
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-1 border-r border-gray-200 bg-gray-50/50 p-8">
            <h3 className="text-sm font-black uppercase text-black mb-6 tracking-widest border-b border-gray-200 pb-2">
              {editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value.toUpperCase() })}
                  className="w-full border-2 border-gray-200 bg-white rounded-xl p-3 font-black text-xs uppercase outline-none focus:border-orange-500 transition-colors"
                  placeholder="EJ: JUAN PEREZ"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Usuario (Login)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUserId}
                  value={newUserForm.username}
                  onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase() })}
                  className="w-full border-2 border-gray-200 bg-white rounded-xl p-3 font-black text-xs outline-none focus:border-orange-500 transition-colors"
                  placeholder="EJ: juanp"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Contraseña</label>
                <input
                  type="text"
                  required={!editingUserId}
                  value={newUserForm.password}
                  onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full border-2 border-gray-200 bg-white rounded-xl p-3 font-black text-xs outline-none focus:border-orange-500 transition-colors"
                  placeholder="Mínimo 4 caracteres"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 mt-4">
                <label className="text-[10px] font-black text-black uppercase block mb-3 tracking-widest">Permisos de Acceso</label>
                <div className="space-y-2 bg-white p-4 rounded-xl border border-gray-200">
                  {['ventas', 'produccion', 'inventario', 'costos', 'configuracion'].map(mod => (
                    <label key={mod} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={newUserForm.permissions?.[mod] || false}
                        onChange={e => setNewUserForm({
                          ...newUserForm,
                          permissions: { ...newUserForm.permissions, [mod]: e.target.checked }
                        })}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-gray-600 uppercase group-hover:text-black transition-colors">
                        Módulo de {mod}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex gap-2">
                {editingUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUserId(null);
                      setNewUserForm(initialUserForm);
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-300 transition-all"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Guardar
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 p-8">
            <h3 className="text-sm font-black uppercase text-black mb-6 tracking-widest border-b border-gray-200 pb-2">
              Usuarios Registrados
            </h3>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left whitespace-nowrap text-sm">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr className="uppercase font-black text-[10px] tracking-widest text-gray-500">
                    <th className="py-3 px-4 border-r">Usuario / Nombre</th>
                    <th className="py-3 px-4 border-r">Clave</th>
                    <th className="py-3 px-4 border-r">Accesos Permitidos</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-black">
                  {systemUsers.map(u => (
                    <tr key={u.username} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border-r">
                        <span className="font-black text-orange-600 text-sm">{u.username}</span><br />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{u.name}</span>
                      </td>
                      <td className="py-3 px-4 border-r font-black text-gray-400">{u.password}</td>
                      <td className="py-3 px-4 border-r">
                        <div className="flex flex-wrap gap-1">
                          {u.permissions && Object.entries(u.permissions).map(([key, val]) => val && (
                            <span key={key} className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                              {key}
                            </span>
                          ))}
                          {u.role === 'Master' && (
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[9px] font-black uppercase">
                              ALL ACCESS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => startEditUser(u)}
                            className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                          >
                            <Edit size={14} />
                          </button>
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!appUser) {
    return (
      <ErrorBoundary>
        <div
          className="min-h-screen flex items-center justify-center p-4 relative"
          style={{
            backgroundImage: `url('${settings?.loginBg || "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?q=80&w=2072&auto=format&fit=crop"}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>

          <div className="absolute top-4 right-4 z-20">
            <label className="bg-black/50 hover:bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all flex items-center gap-2 border border-white/20 shadow-lg">
              <Edit size={14} /> Cambiar Fondo
              <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
            </label>
          </div>

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
                <p className="text-gray-300 mt-4 text-sm leading-relaxed drop-shadow-md">
                  Sistema Integrado de Producción e Inventario para Servicios Jiret G&B C.A.
                </p>
              </div>
              <div className="relative z-10 text-gray-500 text-xs font-bold uppercase tracking-widest">
                © {new Date().getFullYear()} Todos los derechos reservados
              </div>
            </div>

            <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white relative z-10">
              <h2 className="text-2xl font-black text-black uppercase tracking-widest mb-2">Iniciar Sesión</h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Ingresa tus credenciales de acceso</p>

              {loginError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6 uppercase border border-red-200 flex items-center gap-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                  <AlertTriangle size={16} /> {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Usuario</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18} />
                    <input
                      type="text"
                      value={loginData.username}
                      onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]"
                      placeholder="EJ: ADMIN o PLANTA"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18} />
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black py-4 rounded-xl shadow-[0_8px_20px_rgba(249,115,22,0.4)] hover:shadow-[0_15px_25px_rgba(249,115,22,0.6)] hover:-translate-y-1 active:translate-y-1 uppercase tracking-widest text-xs flex justify-center items-center gap-2 mt-4 transform transition-all"
                >
                  ENTRAR AL SISTEMA <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col print:bg-white print:block print:w-full overflow-x-hidden print:overflow-visible text-black font-black">
        <header className="bg-black border-b-4 border-orange-500 sticky top-0 z-50 text-white shadow-md print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div
                className="flex items-center gap-4 cursor-pointer transition-transform hover:scale-105"
                onClick={() => { clearAllReports(); setActiveTab('home'); }}
              >
                <div className="flex items-center bg-white rounded-2xl px-3 py-1">
                  <span className="text-black font-black text-3xl leading-none">G</span>
                  <span className="text-orange-500 font-black text-2xl mx-0.5">&amp;</span>
                  <span className="text-black font-black text-3xl leading-none">B</span>
                </div>
                <div className="hidden sm:block border-l-2 border-gray-800 pl-4 uppercase font-black text-lg">
                  Supply ERP
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="flex items-center gap-3 bg-gray-800 px-5 py-2 rounded-2xl border border-gray-700">
                  <ShieldCheck size={18} className="text-orange-500" />
                  <span className="font-black text-white text-[10px] uppercase leading-none">{appUser?.name}</span>
                </div>
                <button
                  onClick={() => setAppUser(null)}
                  className="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 p-2.5 rounded-2xl border border-gray-700"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 flex-1 print:p-0 print:m-0 print:block">
          
          {activeTab !== 'home' && (
            <nav className="md:w-64 flex-shrink-0 space-y-4 print:hidden animate-in slide-in-from-left">
              <button
                onClick={() => { clearAllReports(); setActiveTab('home'); }}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 text-xs font-black rounded-2xl bg-black text-white shadow-xl hover:bg-gray-800 mb-4 transition-all active:scale-95 uppercase tracking-widest"
              >
                <Home size={18} className="text-orange-500" /> INICIO
              </button>

              {appUser?.permissions?.ventas && activeTab === 'ventas' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Área Ventas</h3>
                  <button
                    onClick={() => { clearAllReports(); setVentasView('facturacion'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'facturacion' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <Receipt size={16} /> Facturación
                  </button>
                  <button
                    onClick={() => { clearAllReports(); setVentasView('requisiciones'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'requisiciones' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <ClipboardEdit size={16} /> OP / Requisiciones
                  </button>
                  <button
                    onClick={() => { clearAllReports(); setVentasView('clientes'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'clientes' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <Users size={16} /> Directorio Clientes
                  </button>
                </div>
              )}

              {appUser?.permissions?.produccion && activeTab === 'produccion' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Planta / Producción</h3>
                  <button
                    onClick={() => { clearAllReports(); setProdView('calculadora'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'calculadora' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}
                  >
                    <Calculator size={16} /> Simulador OP
                  </button>
                  <button
                    onClick={() => { clearAllReports(); setProdView('fases_produccion'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'fases_produccion' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}
                  >
                    <Thermometer size={16} /> Fases en Proceso
                  </button>
                  <button
                    onClick={() => { clearAllReports(); setProdView('historial'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'historial' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}
                  >
                    <History size={16} /> Historial / Finiquitos
                  </button>
                </div>
              )}

              {appUser?.permissions?.inventario && activeTab === 'inventario' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Almacén</h3>
                  <button
                    onClick={() => { clearAllReports(); setInvView('requisiciones'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'requisiciones' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase relative`}
                  >
                    <ClipboardList size={16} /> Requisiciones OP
                    {invRequisitions.filter(r => r.status === 'PENDIENTE').length > 0 && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                        {invRequisitions.filter(r => r.status === 'PENDIENTE').length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { clearAllReports(); setInvView('catalogo'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'catalogo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <Box size={16} /> Catálogo / Stock
                  </button>
                  <button
                    onClick={() => { clearAllReports(); setInvView('kardex'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'kardex' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <History size={16} /> Kardex General
                  </button>
                </div>
              )}

              {appUser?.permissions?.costos && activeTab === 'costos' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Costos y Rentabilidad</h3>
                  <button
                    onClick={() => { clearAllReports(); setCostosView('dashboard'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${costosView === 'dashboard' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <BarChart3 size={16} /> Dashboard General
                  </button>
                  <button
                    onClick={() => { clearAllReports(); setCostosView('operativos'); }}
                    className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${costosView === 'operativos' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}
                  >
                    <Wrench size={16} /> Costos Operativos
                  </button>
                </div>
              )}

              {appUser?.permissions?.configuracion && activeTab === 'configuracion' && (
                <button
                  onClick={() => { clearAllReports(); setActiveTab('configuracion'); }}
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 text-xs font-black rounded-2xl transition-all active:scale-95 uppercase tracking-widest bg-orange-500 text-white shadow-xl"
                >
                  <Settings2 size={18} className="text-white" /> CONFIGURACIÓN
                </button>
              )}
            </nav>
          )}

          <main className={`flex-1 min-w-0 pb-12 print:pb-0 print:m-0 print:p-0 print:block print:w-full ${activeTab === 'home' || activeTab === 'configuracion' ? 'flex items-center justify-center' : ''}`}>
            {activeTab === 'home' && renderHome()}
            {activeTab === 'ventas' && renderVentasModule()}
            {activeTab === 'produccion' && renderProductionModule()}
            {activeTab === 'inventario' && renderInventoryModule()}
            {activeTab === 'costos' && renderCostosModule()}
            {activeTab === 'configuracion' && renderConfigModule()}
          </main>
        </div>

        {dialog && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] print:hidden">
            <div className="bg-white rounded-3xl shadow-2xl border-t-8 border-orange-500 p-8 w-full max-w-md transform animate-in zoom-in-95">
              <h3 className="text-xl font-black text-black uppercase mb-4 tracking-tighter">{dialog.title}</h3>
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

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
// COMPONENTES Y FUNCIONES DE EXPORTACIÓN (NUEVO)
// ============================================================================
const handleExportPDF = (filename, isLandscape = false) => {
  const element = document.getElementById('pdf-content'); 
  if (!element) return;
  
  const printOnlyElements = element.querySelectorAll('.hidden.print\\:block, .hidden.pdf-header'); 
  printOnlyElements.forEach(el => { el.style.display = 'block'; });
  const noPdfElements = element.querySelectorAll('.no-pdf'); 
  noPdfElements.forEach(el => { el.style.display = 'none'; });

  const overflows = element.querySelectorAll('.overflow-x-auto, .overflow-hidden');
  overflows.forEach(el => { el.setAttribute('data-overflow', el.style.overflow || ''); el.style.overflow = 'visible'; });

  const opt = { 
    margin: [10, 5, 10, 5],
    filename: `${filename}_${getTodayDate()}.pdf`, 
    image: { type: 'jpeg', quality: 0.98 }, 
    html2canvas: { scale: 2, useCORS: true, logging: false }, 
    jsPDF: { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' } 
  };

  const finishExport = () => { 
    printOnlyElements.forEach(el => { el.style.display = ''; }); 
    noPdfElements.forEach(el => { el.style.display = ''; }); 
    overflows.forEach(el => { el.style.overflow = el.getAttribute('data-overflow') || ''; });
  };

  if (typeof window.html2pdf === 'undefined') { 
    const script = document.createElement('script'); 
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'; 
    script.onload = () => { window.html2pdf().set(opt).from(element).save().then(finishExport); }; 
    document.head.appendChild(script); 
  } else { 
    window.html2pdf().set(opt).from(element).save().then(finishExport); 
  }
};
  
const handleExportExcel = (tableId, filename) => {
  const table = document.getElementById(tableId); 
  if (!table) return; 
  const tableClone = table.cloneNode(true);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><style>table{border-collapse:collapse;width:100%;font-family:Arial;font-size:11px;}th,td{border:1px solid #000;padding:5px;}th{text-align:center;}</style></head><body><h2>SERVICIOS JIRET G&B, C.A. - RIF: J-412309374</h2><br/>${tableClone.outerHTML}</body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' }); 
  const url = URL.createObjectURL(blob); 
  const link = document.createElement('a'); 
  link.href = url; 
  link.download = `${filename}_${getTodayDate()}.xls`; 
  document.body.appendChild(link); 
  link.click(); 
  document.body.removeChild(link);
};

const ReportHeader = () => (
  <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-4 print:border-black print:w-full print:flex-row">
     <div className="flex flex-col items-start w-1/2 print:w-1/2">
        <span className="text-2xl font-light tracking-widest text-gray-800 print:text-black">Supply</span>
        <div className="flex items-center -mt-2">
           <span className="text-black font-black text-[40px] leading-none">G</span><div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-black mx-1 print:bg-orange-500 print:text-black">&amp;</div><span className="text-black font-black text-[40px] leading-none">B</span>
        </div>
     </div>
     <div className="w-1/2 text-right print:w-1/2">
         <h1 className="text-lg font-black text-black uppercase print:text-black">SERVICIOS JIRET G&amp;B, C.A.</h1>
         <p className="text-[10px] font-bold text-gray-700 print:text-black">RIF: J-412309374</p>
         <p className="text-[8px] font-medium text-gray-500 mt-0.5 uppercase print:text-black">Av. Circunvalación Nro. 02 C.C. El Dividivi Local G-9, Maracaibo.</p>
     </div>
  </div>
);

// ============================================================================
// CONTINUACIÓN DEL COMPONENTE PRINCIPAL
// ============================================================================
export default function App() {
  // ESTADOS DE AUTENTICACIÓN
  const [fbUser, setFbUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [systemUsers, setSystemUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // ESTADOS DE NAVEGACIÓN
  const [activeTab, setActiveTab] = useState('home');
  const [ventasView, setVentasView] = useState('facturacion');
  const [prodView, setProdView] = useState('calculadora');
  const [invView, setInvView] = useState('catalogo');
  const [costosView, setCostosView] = useState('dashboard');

  // ESTADOS DE DATOS
  const [inventory, setInventory] = useState([]);
  const [invMovements, setInvMovements] = useState([]);
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invRequisitions, setInvRequisitions] = useState([]);
  const [opCosts, setOpCosts] = useState([]);

  // ESTADOS DE UI
  const [dialog, setDialog] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invSearchTerm, setInvSearchTerm] = useState('');

  // ESTADOS DE REPORTES (NUEVOS INTEGRADOS)
  const [showGeneralInvoicesReport, setShowGeneralInvoicesReport] = useState(false);
  const [showClientReport, setShowClientReport] = useState(false);
  const [showReqReport, setShowReqReport] = useState(false);
  const [showSingleReqReport, setShowSingleReqReport] = useState(null);
  const [showSingleInvoice, setShowSingleInvoice] = useState(null);
  const [showMovementReceipt, setShowMovementReceipt] = useState(null);
  const [showWorkOrder, setShowWorkOrder] = useState(null); // Modificado para pantalla completa
  const [showFiniquito, setShowFiniquito] = useState(null);

  // ESTADOS DE SEGURIDAD
  const [isAjusteUnlocked, setIsAjusteUnlocked] = useState(false);
  const [ajustePassword, setAjustePassword] = useState('');

  // ESTADOS DE REPORTES FECHAS
  const [invReportType, setInvReportType] = useState('entradas');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // FORMULARIOS INICIALES
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

  const initialRequirementForm = useMemo(() => ({
    client: '', clientRif: '', tipoProducto: 'BOLSAS', ancho: '', fuelles: '', largo: '', micras: '',
    color: 'NATURAL', presentacion: 'MILLARES', cantidadSolicitada: '', fechaEntrega: '', observaciones: ''
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

  const initialInventoryMovementForm = useMemo(() => ({
    itemId: '', qty: '', type: 'ENTRADA', reference: '', date: getTodayDate(), cost: ''
  }), []);

  // ESTADOS DE FORMULARIOS
  const [newUserForm, setNewUserForm] = useState(initialUserForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newClientForm, setNewClientForm] = useState(initialClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const [newInvoiceForm, setNewInvoiceForm] = useState(initialInvoiceForm);
  const [newRequirementForm, setNewRequirementForm] = useState(initialRequirementForm);
  const [calcInputs, setCalcInputs] = useState(initialCalcInputs);
  const [newOpCostForm, setNewOpCostForm] = useState(initialOpCostForm);
  const [newInventoryMovement, setNewInventoryMovement] = useState(initialInventoryMovementForm);

  // ESTADOS DE PRODUCCIÓN
  const [currentPhase, setCurrentPhase] = useState('extrusion');
  const [batchForm, setBatchForm] = useState({ ingredientes: [], kgProduced: '', merma: '', cost: '' });

  // ============================================================================
  // EFECTOS DE INICIALIZACIÓN
  // ============================================================================
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
        setDoc(getDocRef('users', 'planta'), {
          username: 'planta', password: '1234', name: 'Operador de Planta', role: 'Usuario',
          permissions: { ventas: false, produccion: true, inventario: true, costos: false, configuracion: false }
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

  // ============================================================================
  // HANDLERS - AUTENTICACIÓN Y UTILS
  // ============================================================================
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

  const clearAllReports = useCallback(() => {
    setShowWorkOrder(null);
    setShowGeneralInvoicesReport(false);
    setShowClientReport(false);
    setShowReqReport(false);
    setShowSingleReqReport(null);
    setShowSingleInvoice(null);
    setShowMovementReceipt(null);
    setShowFiniquito(null);
  }, []);

  // ============================================================================
  // HANDLERS - USUARIOS
  // ============================================================================
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

  // ============================================================================
  // HANDLERS - CLIENTES
  // ============================================================================
  const handleSaveClient = useCallback(async (e) => {
    e.preventDefault();
    const validation = validateFormRequired(newClientForm, ['rif', 'razonSocial']);
    if (!validation.valid) return setDialog({ title: 'Campos Incompletos', text: validation.error, type: 'alert' });

    try {
      const clientData = {
        ...newClientForm,
        name: newClientForm.razonSocial.toUpperCase(),
        timestamp: Date.now()
      };
      await setDoc(getDocRef('clientes', newClientForm.rif), clientData);
      setNewClientForm(initialClientForm);
      setEditingClientId(null);
      setDialog({ title: 'Éxito', text: 'Cliente registrado correctamente.', type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, [newClientForm, initialClientForm]);

  const startEditClient = useCallback((client) => {
    setEditingClientId(client.rif);
    setNewClientForm({
      rif: client.rif,
      razonSocial: client.razonSocial || client.name,
      direccion: client.direccion || '',
      telefono: client.telefono || '',
      personaContacto: client.personaContacto || '',
      vendedor: client.vendedor || '',
      fechaCreacion: client.fechaCreacion || getTodayDate()
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDeleteClient = useCallback((rif) => {
    setDialog({
      title: 'Eliminar Cliente',
      text: '¿Desea eliminar este cliente? Esta acción no se puede deshacer.',
      type: 'confirm',
      onConfirm: async () => await deleteDoc(getDocRef('clientes', rif))
    });
  }, []);

  // ============================================================================
  // HANDLERS - FACTURAS
  // ============================================================================
  const handleSaveInvoice = useCallback(async (e) => {
    e.preventDefault();
    const validation = validateFormRequired(newInvoiceForm, ['clientRif', 'documento', 'montoBase']);
    if (!validation.valid) return setDialog({ title: 'Campos Incompletos', text: validation.error, type: 'alert' });

    try {
      const montoBase = parseNum(newInvoiceForm.montoBase);
      const aplicaIva = newInvoiceForm.aplicaIva === 'SI';
      const iva = aplicaIva ? montoBase * 0.16 : 0;
      const total = montoBase + iva;

      const invoiceData = {
        ...newInvoiceForm,
        montoBase,
        iva,
        total,
        aplicaIva: newInvoiceForm.aplicaIva,
        timestamp: Date.now()
      };

      await addDoc(getColRef('maquilaInvoices'), invoiceData);
      setNewInvoiceForm(initialInvoiceForm);
      setDialog({ title: 'Éxito', text: `Factura ${newInvoiceForm.documento} registrada.`, type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, [newInvoiceForm, initialInvoiceForm]);

  const handleDeleteInvoice = useCallback((id) => {
    setDialog({
      title: 'Eliminar Factura',
      text: '¿Desea eliminar esta factura?',
      type: 'confirm',
      onConfirm: async () => await deleteDoc(doc(db, 'maquilaInvoices', id))
    });
  }, []);

  // ============================================================================
  // HANDLERS - REQUISICIONES (OP)
  // ============================================================================
  const handleSaveRequirement = useCallback(async (e) => {
    e.preventDefault();
    const validation = validateFormRequired(newRequirementForm, ['client', 'cantidadSolicitada']);
    if (!validation.valid) return setDialog({ title: 'Campos Incompletos', text: validation.error, type: 'alert' });

    try {
      const newId = generateId('OP-', requirements);
      const ancho = parseNum(newRequirementForm.ancho);
      const fuelles = parseNum(newRequirementForm.fuelles);
      const largo = parseNum(newRequirementForm.largo);
      const micras = parseNum(newRequirementForm.micras);
      const cantidadSolicitada = parseNum(newRequirementForm.cantidadSolicitada);

      const pesoMillar = newRequirementForm.tipoProducto === 'BOLSAS' 
        ? calcPesoMillar(ancho, fuelles, largo, micras) : 0;

      const requestedKg = calcRequestedKg(
        newRequirementForm.tipoProducto,
        newRequirementForm.presentacion,
        cantidadSolicitada,
        pesoMillar
      );

      const productDesc = buildProductDescription(
        newRequirementForm.tipoProducto,
        ancho, fuelles, largo, micras,
        newRequirementForm.color
      );

      const reqData = {
        id: newId,
        ...newRequirementForm,
        ancho, fuelles, largo, micras, cantidadSolicitada,
        pesoMillar,
        requestedKg,
        desc: productDesc,
        status: 'PENDIENTE',
        production: {
          extrusion: { completed: false, batches: [] },
          impresion: { completed: false, batches: [] },
          sellado: { completed: false, batches: [] }
        },
        timestamp: Date.now()
      };

      await setDoc(getDocRef('requirements', newId), reqData);
      setNewRequirementForm(initialRequirementForm);
      setDialog({ title: 'Éxito', text: `OP ${newId} creada exitosamente.`, type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, [newRequirementForm, requirements, initialRequirementForm]);

  const handleStartProduction = useCallback(async (opId) => {
    try {
      await updateDoc(getDocRef('requirements', opId), { status: 'EN PROCESO' });
      setShowWorkOrder(opId);
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, []);

  const handleCompleteProduction = useCallback(async (opId) => {
    setDialog({
      title: 'Completar OP',
      text: '¿Confirma que la OP ha sido completada?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          await updateDoc(getDocRef('requirements', opId), { 
            status: 'COMPLETADO',
            completedDate: getTodayDate()
          });
          setShowWorkOrder(null);
        } catch (err) {
          setDialog({ title: 'Error', text: err.message, type: 'alert' });
        }
      }
    });
  }, []);

  const handleAddBatch = useCallback(async (opId, phase) => {
    const op = requirements.find(r => r.id === opId);
    if (!op) return;

    let totalCost = 0;
    const ingredientesData = batchForm.ingredientes.map(ing => {
      const item = inventory.find(i => i.id === ing.itemId);
      const qty = parseNum(ing.qty);
      const cost = (item?.cost || 0) * qty;
      totalCost += cost;
      
      return {
        itemId: ing.itemId,
        itemName: item?.desc || ing.itemId,
        qty,
        cost: item?.cost || 0,
        totalCost: cost
      };
    });

    const newBatch = {
      id: Date.now(),
      ingredientes: ingredientesData,
      kgProduced: parseNum(batchForm.kgProduced),
      merma: parseNum(batchForm.merma),
      cost: totalCost,
      timestamp: Date.now(),
      user: appUser?.name || 'Usuario'
    };

    try {
      const updatedProduction = { ...op.production };
      updatedProduction[phase].batches.push(newBatch);

      await updateDoc(getDocRef('requirements', opId), { production: updatedProduction });

      const reqData = {
        opId,
        phase,
        batchId: newBatch.id,
        items: ingredientesData,
        status: 'PENDIENTE',
        requestedBy: appUser?.name || 'Planta',
        date: getTodayDate(),
        timestamp: Date.now()
      };

      await addDoc(getColRef('inventoryRequisitions'), reqData);

      setBatchForm({ ingredientes: [], kgProduced: '', merma: '', cost: '' });
      setDialog({ title: 'Éxito', text: 'Lote registrado. Requisición enviada a almacén.', type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, [requirements, inventory, batchForm, appUser]);

  const handleCompletePhase = useCallback(async (opId, phase) => {
    const op = requirements.find(r => r.id === opId);
    if (!op) return;

    try {
      const updatedProduction = { ...op.production };
      updatedProduction[phase].completed = true;

      await updateDoc(getDocRef('requirements', opId), { production: updatedProduction });
      setDialog({ title: 'Éxito', text: `Fase ${phase} completada.`, type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, [requirements]);

  // ============================================================================
  // HANDLERS - INVENTARIO
  // ============================================================================
  const handleAddInventoryMovement = useCallback(async (e) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === newInventoryMovement.itemId);
    const qty = parseNum(newInventoryMovement.qty);
    const cost = parseNum(newInventoryMovement.cost) || item?.cost || 0;
    const isAddition = isMovementAddition(newInventoryMovement.type);

    const validation = validateStock(item, qty, isAddition);
    if (!validation.valid) return setDialog({ title: 'Error', text: validation.error, type: 'alert' });

    try {
      const movementData = {
        ...newInventoryMovement,
        itemName: item.desc,
        qty,
        cost,
        timestamp: Date.now(),
        user: appUser?.name || 'Admin'
      };

      await addDoc(getColRef('inventoryMovements'), movementData);

      const newStock = isAddition ? (item.stock + qty) : (item.stock - qty);
      let newCost = item.cost;

      if (isAddition && newInventoryMovement.type === 'ENTRADA') {
        newCost = calculateWeightedAverageCost(item.stock, item.cost, qty, cost);
      }

      await updateDoc(getDocRef('inventory', item.id), { stock: newStock, cost: newCost });

      setNewInventoryMovement(initialInventoryMovementForm);
      setDialog({ title: 'Éxito', text: 'Movimiento registrado exitosamente.', type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, [newInventoryMovement, inventory, appUser, initialInventoryMovementForm]);

  const handleApproveRequisition = useCallback(async (reqId) => {
    const req = invRequisitions.find(r => r.id === reqId);
    if (!req) return;

    setDialog({
      title: 'Aprobar Requisición',
      text: '¿Confirma la aprobación de esta requisición? Se afectará el inventario.',
      type: 'confirm',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'inventoryRequisitions', reqId), { 
            status: 'APROBADO',
            approvedBy: appUser?.name || 'Almacén',
            approvedDate: getTodayDate()
          });

          for (const item of req.items) {
            const invItem = inventory.find(i => i.id === item.itemId);
            if (!invItem) continue;

            const movementData = {
              itemId: item.itemId,
              itemName: item.itemName,
              qty: item.qty,
              type: 'SALIDA',
              reference: `OP ${req.opId} - ${req.phase}`,
              date: getTodayDate(),
              cost: invItem.cost,
              timestamp: Date.now(),
              user: appUser?.name || 'Almacén'
            };

            await addDoc(getColRef('inventoryMovements'), movementData);
            const newStock = invItem.stock - item.qty;
            await updateDoc(getDocRef('inventory', item.itemId), { stock: newStock });
          }
          setDialog({ title: 'Éxito', text: 'Requisición aprobada. Inventario actualizado.', type: 'alert' });
        } catch (err) {
          setDialog({ title: 'Error', text: err.message, type: 'alert' });
        }
      }
    });
  }, [invRequisitions, inventory, appUser]);

  const handleRejectRequisition = useCallback(async (reqId) => {
    setDialog({
      title: 'Rechazar Requisición',
      text: '¿Confirma el rechazo de esta requisición?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'inventoryRequisitions', reqId), { 
            status: 'RECHAZADO',
            rejectedBy: appUser?.name || 'Almacén',
            rejectedDate: getTodayDate()
          });
        } catch (err) {
          setDialog({ title: 'Error', text: err.message, type: 'alert' });
        }
      }
    });
  }, [appUser]);

  // ============================================================================
  // HANDLERS - COSTOS OPERATIVOS
  // ============================================================================
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
      
      setNewOpCostForm({ ...initialOpCostForm, description: '', amount: '' });
      setDialog({ title: 'Éxito', text: 'Costo operativo registrado.', type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  }, [newOpCostForm, appUser, initialOpCostForm]);

  const handleDeleteOpCost = useCallback(async (id) => {
    setDialog({
      title: 'Eliminar Costo',
      text: '¿Desea eliminar este registro de costo operativo?',
      type: 'confirm',
      onConfirm: async () => await deleteDoc(doc(db, 'operatingCosts', id))
    });
  }, []);

  // ============================================================================
  // CÁLCULOS MEMOIZADOS
  // ============================================================================
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

  const activeOrders = useMemo(() => (requirements || []).filter(r => r?.status === 'EN PROCESO'), [requirements]);
  const completedOrders = useMemo(() => (requirements || []).filter(r => r?.status === 'COMPLETADO'), [requirements]);
  const pendingOrders = useMemo(() => (requirements || []).filter(r => r?.status === 'PENDIENTE'), [requirements]);

  const simulatorCalculations = useMemo(() => {
    const simW = parseNum(calcInputs?.ancho);
    const simL = parseNum(calcInputs?.largo);
    const simM = parseNum(calcInputs?.micras);
    const simFu = parseNum(calcInputs?.fuelles);
    const isBolsas = calcInputs?.tipoProducto === 'BOLSAS';

    let simPesoMillar = 0;
    if (isBolsas) simPesoMillar = calcPesoMillar(simW, simFu, simL, simM);

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

    return { simPesoMillar, inputCantidadSolicitada, calcKilosNetos, calcTotalMezcla, calcMermaGlobalKg, calcCostoMezclaPreparada, calcIngredientesProcesados, calcCostoPromedio, calcCostoUnitarioNeto, calcCostoFinalUnidad, simUmFinal, isBolsas };
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

    return { totalIncome, totalOpCostsMP, totalOpCostsOperativos, totalCostsGlobal, globalProfit, globalMargin };
  }, [invoices, completedOrders, opCosts]);

  // ============================================================================
  // RENDERIZADOS DE MÓDULOS (CON REPORTES Y PDF)
  // ============================================================================
  
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
            <button onClick={() => { clearAllReports(); setActiveTab('ventas'); setVentasView('facturacion'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl">
              <Users size={40} className="text-orange-500 mb-4" />
              <h3 className="text-xl font-black text-white uppercase">Ventas y Facturación</h3>
              <p className="text-xs text-gray-400 mt-2">Directorio, OP y Facturación.</p>
            </button>
          )}

          {hasPerm('produccion') && (
            <button onClick={() => { clearAllReports(); setActiveTab('produccion'); setProdView('fases_produccion'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl">
              <Factory size={40} className="text-orange-500 mb-4" />
              <h3 className="text-xl font-black text-white uppercase">Producción Planta</h3>
              <p className="text-xs text-gray-400 mt-2">Control de Fases y Reportes.</p>
            </button>
          )}

          {hasPerm('inventario') && (
            <button onClick={() => { clearAllReports(); setActiveTab('inventario'); setInvView('catalogo'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl">
              <Package size={40} className="text-orange-500 mb-4" />
              <h3 className="text-xl font-black text-white uppercase">Control Inventario</h3>
              <p className="text-xs text-gray-400 mt-2">Art. 177 LISLR, Movimientos y Kardex.</p>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mt-8">
          {hasPerm('produccion') && (
            <button onClick={() => { clearAllReports(); setActiveTab('produccion'); setProdView('calculadora'); }} className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md">
              <Calculator size={40} className="text-gray-400 mb-4" />
              <h3 className="text-xl font-black text-gray-800 uppercase">Simulador Producción</h3>
              <p className="text-xs text-gray-400 mt-2">Cálculo de Insumos y Mermas.</p>
            </button>
          )}

          {hasPerm('costos') && (
            <button onClick={() => { clearAllReports(); setActiveTab('costos'); setCostosView('operativos'); }} className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md">
              <Wrench size={40} className="text-gray-400 mb-4" />
              <h3 className="text-xl font-black text-gray-800 uppercase">Costos Operativos</h3>
              <p className="text-xs text-gray-400 mt-2">Gestión de Gastos de Planta.</p>
            </button>
          )}

          {hasPerm('costos') && (
            <button onClick={() => { clearAllReports(); setActiveTab('costos'); setCostosView('dashboard'); }} className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md">
              <BarChart3 size={40} className="text-gray-400 mb-4" />
              <h3 className="text-xl font-black text-gray-800 uppercase">Reportes de Costo</h3>
              <p className="text-xs text-gray-400 mt-2">Análisis de Utilidad y Rentabilidad.</p>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mt-8">
          {hasPerm('configuracion') && (
            <button onClick={() => { clearAllReports(); setActiveTab('configuracion'); }} className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md">
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
    // --- VISTAS DE REPORTES PARA VENTAS ---
    if (showGeneralInvoicesReport) {
      const totalBaseGeneral = (invoices || []).reduce((acc, curr) => acc + parseNum(curr?.montoBase), 0);
      const totalIvaGeneral = (invoices || []).reduce((acc, curr) => acc + parseNum(curr?.iva), 0);
      const totalGeneral = (invoices || []).reduce((acc, curr) => acc + parseNum(curr?.total), 0);
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-4 no-pdf">
             <button onClick={() => setShowGeneralInvoicesReport(false)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button>
             <div className="flex gap-2">
               <button onClick={() => handleExportExcel('facturas-table', 'Reporte_General_Facturas')} className="bg-green-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-black text-xs uppercase hover:bg-green-700"><Download size={16}/> Excel</button>
               <button onClick={() => handleExportPDF('Reporte_General_Facturas', false)} className="bg-black text-white px-6 py-2 rounded-xl flex items-center gap-2 font-black text-xs uppercase hover:bg-gray-800"><Printer size={16}/> PDF</button>
             </div>
          </div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center mb-6"><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Reporte General de Facturación</h2></div>
          <table id="facturas-table" className="w-full text-[10px] border-collapse border border-gray-300">
            <thead className="bg-gray-100 uppercase"><tr><th className="p-2 border">Fecha</th><th className="p-2 border">Factura</th><th className="p-2 border">Cliente</th><th className="p-2 border text-right">Base ($)</th><th className="p-2 border text-right">IVA ($)</th><th className="p-2 border text-right">Total ($)</th></tr></thead>
            <tbody>{(invoices || []).map(i => (<tr key={i?.id}><td className="p-2 border">{i?.fecha}</td><td className="p-2 border font-bold">{i?.documento}</td><td className="p-2 border">{i?.clientName}</td><td className="p-2 border text-right">${formatNum(i?.montoBase)}</td><td className="p-2 border text-right">${formatNum(i?.iva)}</td><td className="p-2 border text-right font-black text-green-600">${formatNum(i?.total)}</td></tr>))}</tbody>
            <tfoot className="bg-gray-100 font-black"><tr><td colSpan="3" className="p-2 border text-right">TOTALES:</td><td className="p-2 border text-right">${formatNum(totalBaseGeneral)}</td><td className="p-2 border text-right">${formatNum(totalIvaGeneral)}</td><td className="p-2 border text-right text-orange-600">${formatNum(totalGeneral)}</td></tr></tfoot>
          </table>
        </div>
      );
    }

    if (showSingleInvoice) {
      const inv = (invoices || []).find(i => i?.id === showSingleInvoice); 
      if (!inv) return null;
      const client = (clients || []).find(c => c?.rif === inv.clientRif) || {};
      return (
        <div id="pdf-content" className="bg-white p-12 min-h-0 text-black">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf"><button onClick={() => setShowSingleInvoice(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF(`Factura_${inv.documento}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16} /> Exportar PDF</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center my-6"><span className="text-2xl font-black uppercase border-b-4 border-orange-500 pb-2">FACTURA N° {inv.documento}</span></div>
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm uppercase font-bold">
             <div><p>CLIENTE: {inv.clientName}</p><p>RIF: {inv.clientRif}</p><p className="text-[10px] text-gray-500">DIRECCIÓN: {client.direccion || 'N/A'}</p></div>
             <div className="text-right"><p>FECHA: {inv.fecha}</p><p>VENDEDOR: {inv.vendedor || 'N/A'}</p><p className="text-[10px] text-gray-500">OP RELACIONADA: {inv.opAsignada || 'N/A'}</p></div>
          </div>
          <table className="w-full border-collapse border-2 border-black mb-6">
             <thead className="bg-gray-100"><tr><th className="p-4 border-b border-black">Descripción Maquila</th><th className="p-4 border-b border-black text-center">Importe Base (USD)</th></tr></thead>
             <tbody><tr><td className="p-4 border-r border-black font-bold text-sm">MAQUILA / PRODUCTO: {inv.productoMaquilado || 'S/D'}</td><td className="p-4 text-center font-bold text-lg">${formatNum(inv.montoBase)}</td></tr></tbody>
          </table>
          <div className="flex justify-end mb-6">
             <div className="w-1/2 md:w-1/3 space-y-2 border-l-2 border-black pl-4">
                <div className="flex justify-between font-bold"><span>SUBTOTAL:</span><span>${formatNum(inv.montoBase)}</span></div>
                {inv.aplicaIva === 'SI' && <div className="flex justify-between font-bold"><span>IVA (16%):</span><span>${formatNum(inv.iva)}</span></div>}
                <div className="flex justify-between font-black text-xl border-t-2 border-black pt-2 text-orange-600"><span>TOTAL:</span><span>${formatNum(inv.total)}</span></div>
             </div>
          </div>
          <div className="mt-20 text-center font-black uppercase text-[10px]"><div className="w-48 border-t-2 border-black mx-auto pt-1">Firma / Sello Autorizado</div></div>
        </div>
      );
    }

    if (showSingleReqReport) {
      const req = (requirements || []).find(r => r?.id === showSingleReqReport); 
      if (!req) return null;
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black shadow-xl">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf"><button onClick={() => setShowSingleReqReport(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF(`Requisicion_${req.id}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16} /> Exportar PDF</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center my-4"><span className="text-xl font-black uppercase border-b-4 border-orange-500 pb-1">REQUISICIÓN DE PRODUCCIÓN N° {String(req.id).replace('OP-', '').padStart(5, '0')}</span></div>
          <div className="grid grid-cols-2 gap-4 mb-4 font-bold text-sm uppercase"><div><p>CLIENTE: {req.client}</p><p className="mt-1">VENDEDOR: {req.vendedor || 'N/A'}</p></div><div className="text-right"><p>FECHA: {req.fecha}</p><p className="mt-1">TIPO: {req.tipoProducto} {req.categoria ? `| CAT: ${req.categoria}` : ''}</p></div></div>
          <div className="border-2 border-black p-4 grid grid-cols-4 gap-4 text-center text-xs font-black uppercase mb-4 rounded-2xl"><div>ANCHO<br/><span className="text-sm text-blue-600">{req.ancho} CM</span></div><div>FUELLES<br/><span className="text-sm text-blue-600">{req.fuelles || '0'} CM</span></div><div>LARGO<br/><span className="text-sm text-blue-600">{req.largo} CM</span></div><div>MICRAS<br/><span className="text-sm text-blue-600">{req.micras}</span></div></div>
          
          <div className="bg-gray-50 p-4 flex justify-between border-2 border-black rounded-2xl mb-4">
             <div><span className="block text-[10px] font-black uppercase">Cant. Solicitada</span><span className="text-xl font-black text-blue-600">{formatNum(req.cantidadSolicitada)} {req.presentacion}</span></div>
             <div><span className="block text-[10px] font-black uppercase">Peso Millar Est.</span><span className="text-xl font-black">{req.pesoMillar || 'N/A'}</span></div>
             <div className="text-right"><span className="block text-[10px] font-black uppercase">Carga Total Planta</span><span className="text-3xl font-black text-orange-600">{formatNum(req.requestedKg)} KG</span></div>
          </div>
          
          <div className="mt-16 grid grid-cols-2 gap-24 text-center font-black text-xs uppercase border-t-2 border-black pt-4"><div>FIRMA VENTAS</div><div>RECIBE PLANTA</div></div>
        </div>
      );
    }

    if (showClientReport) {
      return (
        <div id="pdf-content" className="bg-white p-10 min-h-0 text-black">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf">
             <button onClick={() => setShowClientReport(false)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button>
             <div className="flex gap-2">
               <button onClick={() => handleExportExcel('directorio-table', 'Directorio_Clientes')} className="bg-green-600 text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase hover:bg-green-700"><Download size={16}/> Excel</button>
               <button onClick={() => handleExportPDF('Directorio_Clientes', true)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase hover:bg-gray-800"><Printer size={16}/> PDF</button>
             </div>
          </div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center mb-8"><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Directorio de Clientes</h2></div>
          <table id="directorio-table" className="w-full text-[10px] border-collapse border border-gray-300">
            <thead className="bg-gray-100 uppercase"><tr><th className="p-2 border">RIF</th><th className="p-2 border">Razón Social</th><th className="p-2 border w-1/3">Dirección</th><th className="p-2 border">Teléfono</th><th className="p-2 border">Vendedor</th></tr></thead>
            <tbody>{(clients || []).map(c => (<tr key={c?.rif}><td className="p-2 border font-bold">{c?.rif}</td><td className="p-2 border font-black uppercase">{c?.name || c?.razonSocial}</td><td className="p-2 border uppercase">{c?.direccion}</td><td className="p-2 border">{c?.telefono}</td><td className="p-2 border uppercase font-bold">{c?.vendedor}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }

    if (showReqReport) {
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-4 no-pdf">
             <button onClick={() => setShowReqReport(false)} className="bg-gray-100 px-4 py-2 font-bold text-xs uppercase rounded-xl hover:bg-gray-200">Volver</button>
             <div className="flex gap-2">
               <button onClick={() => handleExportExcel('req-table', 'Reporte_Requisiciones')} className="bg-green-600 text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase hover:bg-green-700"><Download size={16}/> Excel</button>
               <button onClick={() => handleExportPDF('Reporte_Requisiciones', true)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase hover:bg-gray-800"><Printer size={16}/> PDF</button>
             </div>
          </div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center mb-6"><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Reporte de Requisiciones (OP)</h2></div>
          <table id="req-table" className="w-full text-[10px] border-collapse border border-gray-300">
            <thead className="bg-gray-100 uppercase"><tr><th>OP N°</th><th>Cliente</th><th>Vendedor</th><th>Producto / Cat.</th><th className="text-right">KG Estimados</th><th className="text-center">Estatus</th></tr></thead>
            <tbody>{(requirements || []).map(r => (<tr key={r?.id}><td className="p-2 border text-center">{String(r?.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-2 border font-bold">{r?.client}</td><td className="p-2 border">{r?.vendedor}</td><td className="p-2 border">{r?.desc} {r?.categoria ? `- ${r.categoria}` : ''}</td><td className="p-2 border text-right font-black">{formatNum(r?.requestedKg)} KG</td><td className="p-2 border text-center font-bold uppercase">{r?.status}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        
        {/* CLIENTES */}
        {ventasView === 'clientes' && (
          <>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-black uppercase">{editingClientId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                <button onClick={()=>setShowClientReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-gray-50">REPORTE GENERAL</button>
              </div>
              <form onSubmit={handleSaveClient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">RIF *</label>
                    <input type="text" required disabled={!!editingClientId} value={newClientForm.rif} onChange={e => setNewClientForm({ ...newClientForm, rif: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" placeholder="J-123456789" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Razón Social *</label>
                    <input type="text" required value={newClientForm.razonSocial} onChange={e => setNewClientForm({ ...newClientForm, razonSocial: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" placeholder="EMPRESA C.A." />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-2">Dirección</label>
                  <input type="text" value={newClientForm.direccion} onChange={e => setNewClientForm({ ...newClientForm, direccion: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Teléfono</label>
                    <input type="text" value={newClientForm.telefono} onChange={e => setNewClientForm({ ...newClientForm, telefono: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Persona de Contacto</label>
                    <input type="text" value={newClientForm.personaContacto} onChange={e => setNewClientForm({ ...newClientForm, personaContacto: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Vendedor</label>
                    <input type="text" value={newClientForm.vendedor} onChange={e => setNewClientForm({ ...newClientForm, vendedor: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  {editingClientId && <button type="button" onClick={() => { setEditingClientId(null); setNewClientForm(initialClientForm); }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase">Cancelar</button>}
                  <button type="submit" className="flex-1 bg-black text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><Save size={16} /> Guardar Cliente</button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-lg font-black mb-4">Directorio de Clientes</h3>
              <div className="mb-4">
                <input type="text" placeholder="Buscar cliente..." value={clientSearchTerm} onChange={e => setClientSearchTerm(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500" />
              </div>
              <div className="grid gap-4">
                {filteredClients.map(c => (
                  <div key={c.rif} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-start">
                    <div>
                      <p className="font-black text-orange-600">{c.rif}</p>
                      <p className="font-bold text-sm">{c.name || c.razonSocial}</p>
                      <p className="text-xs text-gray-500">{c.direccion}</p>
                      {c.telefono && <p className="text-xs text-gray-500 mt-1">Tel: {c.telefono}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditClient(c)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteClient(c.rif)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* FACTURACIÓN */}
        {ventasView === 'facturacion' && (
          <>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-black uppercase">Nueva Factura</h3>
                <button onClick={()=>setShowGeneralInvoicesReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 transition-colors">REPORTE GENERAL</button>
              </div>
              <form onSubmit={handleSaveInvoice} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Fecha *</label>
                    <input type="date" required value={newInvoiceForm.fecha} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, fecha: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Cliente *</label>
                    <select required value={newInvoiceForm.clientRif} onChange={e => {
                        const client = clients.find(c => c.rif === e.target.value);
                        setNewInvoiceForm({ ...newInvoiceForm, clientRif: e.target.value, clientName: client?.name || client?.razonSocial || '' });
                      }} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                      <option value="">SELECCIONE CLIENTE</option>
                      {clients.map(c => <option key={c.rif} value={c.rif}>{c.name || c.razonSocial}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Nº Documento *</label>
                    <input type="text" required value={newInvoiceForm.documento} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, documento: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" placeholder="FAC-001" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-2">Producto/Servicio Maquilado</label>
                  <input type="text" value={newInvoiceForm.productoMaquilado} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, productoMaquilado: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Vendedor</label>
                    <input type="text" value={newInvoiceForm.vendedor} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, vendedor: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Monto Base * ($)</label>
                    <input type="number" step="0.01" required value={newInvoiceForm.montoBase} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, montoBase: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-sm text-center" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Aplica IVA</label>
                    <select value={newInvoiceForm.aplicaIva} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, aplicaIva: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                      <option value="SI">SÍ (16%)</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">OP Asignada</label>
                    <select value={newInvoiceForm.opAsignada} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, opAsignada: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                      <option value="">NINGUNA</option>
                      {requirements.map(r => <option key={r.id} value={r.id}>{r.id} - {r.client}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><Save size={16} /> Registrar Factura</button>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-lg font-black mb-4">Facturas Registradas</h3>
              <div className="mb-4">
                <input type="text" placeholder="Buscar factura..." value={invoiceSearchTerm} onChange={e => setInvoiceSearchTerm(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500" />
              </div>
              <div className="grid gap-4">
                {filteredInvoices.map(inv => (
                  <div key={inv.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-start">
                    <div>
                      <p className="font-black text-orange-600">{inv.documento}</p>
                      <p className="font-bold text-sm">{inv.clientName}</p>
                      <p className="text-xs text-gray-500">{inv.fecha}</p>
                      {inv.opAsignada && <p className="text-xs text-blue-600 mt-1">OP: {inv.opAsignada}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-green-600">${formatNum(inv.total)}</p>
                      <p className="text-xs text-gray-500">Base: ${formatNum(inv.montoBase)}</p>
                      {inv.iva > 0 && <p className="text-xs text-gray-500">IVA: ${formatNum(inv.iva)}</p>}
                      <div className="mt-2 flex gap-2 justify-end">
                         <button onClick={()=>setShowSingleInvoice(inv.id)} className="text-xs text-gray-500 hover:text-gray-800"><Printer size={14}/></button>
                         <button onClick={() => handleDeleteInvoice(inv.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* REQUISICIONES OP */}
        {ventasView === 'requisiciones' && (
          <>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-black uppercase">Nueva Orden de Producción (OP)</h3>
                <button onClick={()=>setShowReqReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-gray-50">REPORTE GENERAL</button>
              </div>
              <form onSubmit={handleSaveRequirement} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Cliente *</label>
                    <select required value={newRequirementForm.clientRif} onChange={e => {
                        const client = clients.find(c => c.rif === e.target.value);
                        setNewRequirementForm({ ...newRequirementForm, clientRif: e.target.value, client: client?.name || client?.razonSocial || '' });
                      }} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                      <option value="">SELECCIONE CLIENTE</option>
                      {clients.map(c => <option key={c.rif} value={c.rif}>{c.name || c.razonSocial}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Tipo de Producto *</label>
                    <select value={newRequirementForm.tipoProducto} onChange={e => setNewRequirementForm({ ...newRequirementForm, tipoProducto: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                      <option value="BOLSAS">BOLSAS</option>
                      <option value="TERMOENCOGIBLE">TERMOENCOGIBLE</option>
                    </select>
                  </div>
                </div>

                {newRequirementForm.tipoProducto === 'BOLSAS' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Ancho (cm) *</label>
                      <input type="number" step="0.01" required value={newRequirementForm.ancho} onChange={e => setNewRequirementForm({ ...newRequirementForm, ancho: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-sm text-center" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Fuelles (cm)</label>
                      <input type="number" step="0.01" value={newRequirementForm.fuelles} onChange={e => setNewRequirementForm({ ...newRequirementForm, fuelles: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-sm text-center" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Largo (cm) *</label>
                      <input type="number" step="0.01" required value={newRequirementForm.largo} onChange={e => setNewRequirementForm({ ...newRequirementForm, largo: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-sm text-center" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Micras *</label>
                      <input type="number" step="0.01" required value={newRequirementForm.micras} onChange={e => setNewRequirementForm({ ...newRequirementForm, micras: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-sm text-center" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Color</label>
                    <input type="text" value={newRequirementForm.color} onChange={e => setNewRequirementForm({ ...newRequirementForm, color: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Presentación</label>
                    <select value={newRequirementForm.presentacion} onChange={e => setNewRequirementForm({ ...newRequirementForm, presentacion: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                      <option value="MILLARES">MILLARES</option>
                      <option value="KILOS">KILOS</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Cantidad *</label>
                    <input type="number" step="0.01" required value={newRequirementForm.cantidadSolicitada} onChange={e => setNewRequirementForm({ ...newRequirementForm, cantidadSolicitada: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-sm text-center" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Fecha Entrega</label>
                    <input type="date" value={newRequirementForm.fechaEntrega} onChange={e => setNewRequirementForm({ ...newRequirementForm, fechaEntrega: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-2">Observaciones</label>
                  <textarea value={newRequirementForm.observaciones} onChange={e => setNewRequirementForm({ ...newRequirementForm, observaciones: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" rows={3} />
                </div>

                <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><PlusCircle size={16} /> Crear Orden de Producción</button>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-lg font-black mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-orange-500" /> Órdenes Pendientes ({pendingOrders.length})</h3>
              <div className="grid gap-4">
                {pendingOrders.map(r => (
                  <div key={r.id} className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-orange-600">#{String(r.id).replace('OP-', '').padStart(5, '0')}</p>
                        <p className="font-bold text-sm">{r.client}</p>
                        <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                        <p className="text-sm font-black mt-2">{formatNum(r.requestedKg)} KG solicitados</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowSingleReqReport(r.id)} className="bg-white text-gray-700 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-gray-100 border border-gray-200"><Printer size={16}/></button>
                        <button onClick={() => handleStartProduction(r.id)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-green-700"><PlayCircle size={16} /> Iniciar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderProductionModule = () => {
    
    // --- VISTAS DE REPORTES (PANTALLA COMPLETA) PARA PRODUCCIÓN ---
    if (showWorkOrder) {
      const req = (requirements || []).find(r => r?.id === showWorkOrder); 
      if (!req) return null;
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black shadow-xl">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf"><button onClick={() => setShowWorkOrder(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF(`Orden_Trabajo_${req.id}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16} /> Exportar PDF</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center my-4"><span className="text-xl font-black uppercase border-b-4 border-orange-500 pb-1">ORDEN DE TRABAJO (PLANTA) N° {String(req.id).replace('OP-', '').padStart(5, '0')}</span></div>
          <div className="grid grid-cols-2 gap-4 mb-4 font-bold text-sm uppercase"><div><p>CLIENTE: {req.client}</p><p className="mt-1">VENDEDOR: {req.vendedor || 'N/A'}</p></div><div className="text-right"><p>FECHA: {req.fecha}</p><p className="mt-1">TIPO: {req.tipoProducto}</p></div></div>
          <div className="border-2 border-black p-4 grid grid-cols-4 gap-4 text-center text-xs font-black uppercase mb-4 rounded-2xl"><div>ANCHO<br/><span className="text-sm text-blue-600">{req.ancho} CM</span></div><div>FUELLES<br/><span className="text-sm text-blue-600">{req.fuelles || '0'} CM</span></div><div>LARGO<br/><span className="text-sm text-blue-600">{req.largo} CM</span></div><div>MICRAS<br/><span className="text-sm text-blue-600">{req.micras}</span></div></div>
          <div className="bg-gray-50 p-4 flex justify-between border-2 border-black rounded-2xl mb-4">
             <div><span className="block text-[10px] font-black uppercase">Cant. Solicitada</span><span className="text-xl font-black text-blue-600">{formatNum(req.cantidadSolicitada)} {req.presentacion}</span></div>
             <div><span className="block text-[10px] font-black uppercase">Peso Millar Est.</span><span className="text-xl font-black">{req.pesoMillar || 'N/A'}</span></div>
             <div className="text-right"><span className="block text-[10px] font-black uppercase">Meta Producción Planta</span><span className="text-3xl font-black text-orange-600">{formatNum(req.requestedKg)} KG</span></div>
          </div>
          <div className="mt-4 border-2 border-black p-4 rounded-xl">
             <p className="font-black text-xs uppercase mb-1">DETALLES / PRODUCTO:</p>
             <p className="text-sm font-bold uppercase">{req.desc || 'SIN DESCRIPCIÓN'}</p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-24 text-center font-black text-xs uppercase border-t-2 border-black pt-4"><div>SUPERVISOR DE PRODUCCIÓN</div><div>OPERADOR ASIGNADO</div></div>
        </div>
      );
    }

    if (showFiniquito) {
      const req = (requirements || []).find(r => r?.id === showFiniquito); 
      if (!req) return null;
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black shadow-xl">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf"><button onClick={() => setShowFiniquito(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF(`Finiquito_${req.id}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16} /> Exportar PDF</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center my-4"><span className="text-xl font-black uppercase border-b-4 border-orange-500 pb-1">FINIQUITO DE PRODUCCIÓN N° {String(req.id).replace('OP-', '').padStart(5, '0')}</span></div>
          <div className="grid grid-cols-2 gap-4 mb-4 font-bold text-sm uppercase"><div><p>CLIENTE: {req.client}</p><p className="mt-1">PRODUCTO: {req.tipoProducto} - {req.desc}</p></div><div className="text-right"><p>FECHA: {req.fecha}</p><p className="mt-1">ESTADO: {req.status}</p></div></div>
          <div className="bg-gray-50 p-4 flex justify-between border-2 border-black rounded-2xl mb-4">
             <div><span className="block text-[10px] font-black uppercase">Meta Inicial Requerida</span><span className="text-xl font-black text-blue-600">{formatNum(req.requestedKg)} KG</span></div>
             <div className="text-right"><span className="block text-[10px] font-black uppercase">Total Neto Producido</span><span className="text-3xl font-black text-green-600">{formatNum((req?.production?.sellado?.batches || []).reduce((a,b)=>a+parseNum(b?.kgProduced),0) || (req?.production?.extrusion?.batches || []).reduce((a,b)=>a+parseNum(b?.kgProduced),0) || 0)} KG</span></div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-24 text-center font-black text-xs uppercase border-t-2 border-black pt-4"><div>GERENCIA DE PLANTA</div><div>DEPARTAMENTO DE COSTOS</div></div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        
        {/* SIMULADOR DE PRODUCCIÓN */}
        {prodView === 'calculadora' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-black text-black uppercase mb-6">Simulador de Producción</h2>
            
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black uppercase mb-4">Especificaciones del Producto</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-2">Tipo</label>
                  <select value={calcInputs.tipoProducto} onChange={e => setCalcInputs({ ...calcInputs, tipoProducto: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                    <option value="BOLSAS">BOLSAS</option>
                    <option value="TERMOENCOGIBLE">TERMOENCOGIBLE</option>
                  </select>
                </div>
                {calcInputs.tipoProducto === 'BOLSAS' && (
                  <>
                    <div><label className="text-xs font-black text-gray-500 uppercase block mb-2">Ancho (cm)</label><input type="number" step="0.01" value={calcInputs.ancho} onChange={e => setCalcInputs({ ...calcInputs, ancho: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center" /></div>
                    <div><label className="text-xs font-black text-gray-500 uppercase block mb-2">Fuelles (cm)</label><input type="number" step="0.01" value={calcInputs.fuelles} onChange={e => setCalcInputs({ ...calcInputs, fuelles: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center" /></div>
                    <div><label className="text-xs font-black text-gray-500 uppercase block mb-2">Largo (cm)</label><input type="number" step="0.01" value={calcInputs.largo} onChange={e => setCalcInputs({ ...calcInputs, largo: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center" /></div>
                  </>
                )}
                <div><label className="text-xs font-black text-gray-500 uppercase block mb-2">Micras</label><input type="number" step="0.01" value={calcInputs.micras} onChange={e => setCalcInputs({ ...calcInputs, micras: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-black text-gray-500 uppercase block mb-2">Cantidad Solicitada</label><input type="number" step="0.01" value={calcInputs.cantidadSolicitada} onChange={e => setCalcInputs({ ...calcInputs, cantidadSolicitada: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center text-lg" placeholder="0.00" /></div>
                <div><label className="text-xs font-black text-gray-500 uppercase block mb-2">Merma Global (%)</label><input type="number" step="0.1" value={calcInputs.mermaGlobalPorc} onChange={e => setCalcInputs({ ...calcInputs, mermaGlobalPorc: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center text-lg" /></div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black uppercase mb-4 flex items-center justify-between"><span>Ingredientes de la Mezcla</span><button onClick={() => setCalcInputs({...calcInputs, ingredientes: [...calcInputs.ingredientes, { id: Date.now(), nombre: 'MP-0240', pct: 0, costo: 0.96 }]})} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase"><Plus size={14} /></button></h3>
              <div className="space-y-3">
                {calcInputs.ingredientes.map((ing, idx) => (
                  <div key={ing.id} className="flex gap-3 items-center">
                    <select value={ing.nombre} onChange={e => {
                        const item = inventory.find(i => i.id === e.target.value);
                        const newIngs = [...calcInputs.ingredientes];
                        newIngs[idx] = { ...ing, nombre: e.target.value, costo: item?.cost || 0 };
                        setCalcInputs({ ...calcInputs, ingredientes: newIngs });
                      }} className="flex-1 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                      {inventory.filter(i => i.category === 'Materia Prima').map(item => <option key={item.id} value={item.id}>{item.desc}</option>)}
                    </select>
                    <div className="w-32"><input type="number" step="0.1" value={ing.pct} onChange={e => {
                          const newIngs = [...calcInputs.ingredientes];
                          newIngs[idx] = { ...ing, pct: parseNum(e.target.value) };
                          setCalcInputs({ ...calcInputs, ingredientes: newIngs });
                        }} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center" placeholder="%" /></div>
                    <button onClick={() => {
                        const newIngs = calcInputs.ingredientes.filter(i => i.id !== ing.id);
                        setCalcInputs({ ...calcInputs, ingredientes: newIngs });
                      }} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl"><p className="text-sm font-black">Total: {calcInputs.ingredientes.reduce((sum, ing) => sum + (ing.pct || 0), 0).toFixed(1)}%{calcInputs.ingredientes.reduce((sum, ing) => sum + (ing.pct || 0), 0) !== 100 && <span className="text-red-600 ml-2">(Debe sumar 100%)</span>}</p></div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
              <h4 className="text-sm font-black uppercase mb-4">Resultados del Cálculo</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
                {simulatorCalculations.isBolsas && <div><p className="text-gray-600 font-bold">Peso por Millar:</p><p className="font-black text-lg">{formatNum(simulatorCalculations.simPesoMillar)} KG</p></div>}
                <div><p className="text-gray-600 font-bold">Kilos Netos:</p><p className="font-black text-lg text-blue-600">{formatNum(simulatorCalculations.calcKilosNetos)} KG</p></div>
                <div><p className="text-gray-600 font-bold">Total Mezcla:</p><p className="font-black text-lg text-green-600">{formatNum(simulatorCalculations.calcTotalMezcla)} KG</p></div>
                <div><p className="text-gray-600 font-bold">Merma Global:</p><p className={`font-black text-lg ${getMermaColor(parseNum(calcInputs.mermaGlobalPorc))}`}>{formatNum(simulatorCalculations.calcMermaGlobalKg)} KG</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200"><p className="text-xs text-gray-600 font-bold uppercase">Costo Total Mezcla</p><p className="font-black text-2xl text-orange-600">${formatNum(simulatorCalculations.calcCostoMezclaPreparada)}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-200"><p className="text-xs text-gray-600 font-bold uppercase">Costo por KG Promedio</p><p className="font-black text-2xl">${formatNum(simulatorCalculations.calcCostoPromedio)}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-200"><p className="text-xs text-gray-600 font-bold uppercase">Costo por {simulatorCalculations.simUmFinal}</p><p className="font-black text-2xl">${formatNum(simulatorCalculations.calcCostoFinalUnidad)}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* ÓRDENES ACTIVAS CON FASES */}
        {prodView === 'fases_produccion' && (
          <div className="space-y-6">
            {activeOrders.map(order => (
              <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-orange-600">OP #{String(order.id).replace('OP-', '').padStart(5, '0')}</h3>
                    <p className="font-bold text-sm">{order.client}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.desc}</p>
                    <p className="text-sm font-black mt-2">{formatNum(order.requestedKg)} KG solicitados</p>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => setShowWorkOrder(order.id)} className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-xs font-black uppercase hover:bg-gray-200"><Printer size={16}/></button>
                     <button onClick={() => setCurrentPhase(currentPhase === order.id ? null : order.id)} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase">{currentPhase === order.id ? 'Ocultar' : 'Ver Fases'}</button>
                  </div>
                </div>

                {currentPhase === order.id && (
                  <>
                    <div className="flex gap-2 mb-6 border-b-2 border-gray-200 pb-2">
                      {['extrusion', 'impresion', 'sellado'].map(phase => (
                        <button key={phase} onClick={() => setCurrentPhase(`${order.id}-${phase}`)} className={`px-6 py-3 rounded-t-xl font-black text-xs uppercase transition-all ${currentPhase === `${order.id}-${phase}` ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {phase}{order.production[phase].completed && <CheckCircle2 size={14} className="inline ml-2 text-green-400" />}
                        </button>
                      ))}
                    </div>

                    {['extrusion', 'impresion', 'sellado'].map(phase => currentPhase === `${order.id}-${phase}` && (
                      <div key={phase} className="bg-gray-50 rounded-2xl p-6 mb-4">
                        <h4 className="text-sm font-black uppercase mb-4">Fase: {phase.toUpperCase()}{order.production[phase].completed && <span className="ml-3 text-green-600">✓ COMPLETADA</span>}</h4>
                        
                        {!order.production[phase].completed && (
                          <div className="bg-white rounded-xl p-6 mb-6 border-2 border-gray-200">
                            <h5 className="text-xs font-black uppercase mb-4">Registrar Nuevo Lote</h5>
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-black text-gray-500 uppercase block mb-2">Ingredientes Usados</label>
                                <button onClick={() => setBatchForm({...batchForm, ingredientes: [...batchForm.ingredientes, { id: Date.now(), itemId: 'MP-0240', qty: '' }]})} className="mb-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-black uppercase">+ Agregar Ingrediente</button>
                                <div className="space-y-2">
                                  {batchForm.ingredientes.map((ing, idx) => (
                                    <div key={ing.id} className="flex gap-2">
                                      <select value={ing.itemId} onChange={e => {
                                          const newIngs = [...batchForm.ingredientes];
                                          newIngs[idx].itemId = e.target.value;
                                          setBatchForm({ ...batchForm, ingredientes: newIngs });
                                        }} className="flex-1 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                                        {inventory.filter(i => i.category === 'Materia Prima').map(item => <option key={item.id} value={item.id}>{item.desc}</option>)}
                                      </select>
                                      <input type="number" step="0.01" placeholder="KG" value={ing.qty} onChange={e => {
                                          const newIngs = [...batchForm.ingredientes];
                                          newIngs[idx].qty = e.target.value;
                                          setBatchForm({ ...batchForm, ingredientes: newIngs });
                                        }} className="w-32 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center" />
                                      <button onClick={() => {
                                          const newIngs = batchForm.ingredientes.filter(i => i.id !== ing.id);
                                          setBatchForm({ ...batchForm, ingredientes: newIngs });
                                        }} className="p-3 bg-red-50 text-red-600 rounded-xl"><Trash2 size={16} /></button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="text-xs font-black text-gray-500 uppercase block mb-2">KG Producidos</label><input type="number" step="0.01" value={batchForm.kgProduced} onChange={e => setBatchForm({ ...batchForm, kgProduced: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center" /></div>
                                <div><label className="text-xs font-black text-gray-500 uppercase block mb-2">Merma (KG)</label><input type="number" step="0.01" value={batchForm.merma} onChange={e => setBatchForm({ ...batchForm, merma: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center" /></div>
                              </div>
                              <button onClick={() => handleAddBatch(order.id, phase)} className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><Plus size={16} /> Registrar Lote</button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <h5 className="text-xs font-black uppercase">Lotes Registrados ({order.production[phase].batches.length})</h5>
                          {order.production[phase].batches.map(batch => (
                            <div key={batch.id} className="bg-white rounded-xl p-4 border border-gray-200">
                              <div className="flex justify-between items-start mb-3">
                                <div><p className="text-xs text-gray-500">Lote #{batch.id}</p><p className="text-xs text-gray-500">{getSafeDate(batch.timestamp)} - {batch.user}</p></div>
                                <div className="text-right"><p className="font-black text-green-600">{formatNum(batch.kgProduced)} KG</p><p className="text-xs text-red-600">Merma: {formatNum(batch.merma)} KG</p></div>
                              </div>
                              <div className="text-xs space-y-1">
                                {batch.ingredientes.map((ing, idx) => <p key={idx} className="text-gray-600">• {ing.itemName}: {formatNum(ing.qty)} KG (${formatNum(ing.totalCost)})</p>)}
                              </div>
                              <p className="text-right font-black text-orange-600 mt-2">Costo Total: ${formatNum(batch.cost)}</p>
                            </div>
                          ))}
                        </div>

                        {!order.production[phase].completed && order.production[phase].batches.length > 0 && (
                          <button onClick={() => handleCompletePhase(order.id, phase)} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Marcar Fase Completada</button>
                        )}
                      </div>
                    ))}

                    {['extrusion', 'impresion', 'sellado'].every(p => order.production[p].completed) && (
                      <button onClick={() => handleCompleteProduction(order.id)} className="w-full mt-6 bg-green-600 text-white py-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2"><CheckCircle size={20} /> FINALIZAR ORDEN DE PRODUCCIÓN</button>
                    )}
                  </>
                )}
              </div>
            ))}
            {activeOrders.length === 0 && <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-12 text-center"><Factory size={48} className="text-gray-300 mx-auto mb-4" /><p className="text-gray-500 font-bold">No hay órdenes en proceso</p></div>}
          </div>
        )}

        {/* HISTORIAL DE ÓRDENES COMPLETADAS */}
        {prodView === 'historial' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-lg font-black mb-6">Órdenes Completadas ({completedOrders.length})</h3>
            <div className="grid gap-4">
              {completedOrders.map(order => {
                const totalCost = ['extrusion', 'impresion', 'sellado'].reduce((sum, phase) => sum + order.production[phase].batches.reduce((s, b) => s + parseNum(b.cost), 0), 0);
                return (
                  <div key={order.id} className="p-6 bg-green-50 rounded-xl border-2 border-green-200 flex justify-between items-start">
                    <div>
                      <p className="font-black text-green-600 text-lg">OP #{String(order.id).replace('OP-', '').padStart(5, '0')}</p>
                      <p className="font-bold text-sm">{order.client}</p>
                      <p className="text-xs text-gray-500 mt-1">{order.desc}</p>
                      <p className="text-sm font-black mt-2">{formatNum(order.requestedKg)} KG solicitados</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-600">Costo Total MP</p>
                      <p className="font-black text-2xl text-orange-600">${formatNum(totalCost)}</p>
                      <button onClick={() => setShowFiniquito(order.id)} className="mt-4 bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-800 transition-colors inline-flex gap-2 items-center"><FileText size={14}/> FINIQUITO</button>
                    </div>
                  </div>
                );
              })}
              {completedOrders.length === 0 && <div className="text-center py-12"><History size={48} className="text-gray-300 mx-auto mb-4" /><p className="text-gray-500 font-bold">No hay órdenes completadas</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInventoryModule = () => {
    
    // --- VISTAS DE REPORTES PARA INVENTARIO ---
    if (showMovementReceipt) {
      const m = showMovementReceipt;
      return (
        <div id="pdf-content" className="bg-white p-12 min-h-0 text-black">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf">
            <button onClick={() => setShowMovementReceipt(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button>
            <button onClick={() => handleExportPDF(`Comprobante_${m.type}_${m.id}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16} /> Exportar PDF</button>
          </div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center my-6"><span className="text-2xl font-black uppercase border-b-4 border-orange-500 pb-2">COMPROBANTE DE {m.type}</span></div>
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm uppercase font-bold">
             <div><p>CÓDIGO DE ÍTEM: {m.itemId}</p><p>DESCRIPCIÓN: {m.itemName}</p></div>
             <div className="text-right"><p>FECHA: {m.date}</p><p>USUARIO: {m.user || 'N/A'}</p><p>REFERENCIA: {m.reference || 'N/A'}</p></div>
          </div>
          <table className="w-full border-collapse border-2 border-black mb-6">
             <thead className="bg-gray-100"><tr><th className="p-4 border-b border-black text-center">Cantidad</th><th className="p-4 border-b border-black text-center">Costo Unitario</th><th className="p-4 border-b border-black text-center">Valor Total</th></tr></thead>
             <tbody><tr><td className="p-4 border-r border-black font-black text-center text-lg">{formatNum(m.qty)}</td><td className="p-4 border-r border-black font-bold text-center">${formatNum(m.cost)}</td><td className="p-4 text-center font-bold text-lg">${formatNum(m.totalValue || (m.qty*m.cost))}</td></tr></tbody>
          </table>
          <div className="mb-6 border-2 border-black p-4 rounded-xl">
             <p className="font-black text-xs uppercase mb-1">NOTAS / OBSERVACIONES:</p>
             <p className="text-sm font-bold uppercase">{m.notes || 'SIN OBSERVACIONES'}</p>
          </div>
          <div className="mt-20 grid grid-cols-2 gap-24 text-center font-black uppercase text-[10px]">
             <div className="border-t-2 border-black mx-auto pt-1 w-full">Entregado / Procesado por</div>
             <div className="border-t-2 border-black mx-auto pt-1 w-full">Recibido por (Almacén)</div>
          </div>
        </div>
      );
    }

    if (invView === 'reportes_mod') {
      let filteredData = [];
      if (invReportType === 'entradas') filteredData = invMovements.filter(m => m.type === 'ENTRADA');
      if (invReportType === 'salidas') filteredData = invMovements.filter(m => m.type === 'SALIDA' || m.type === 'AUTOCONSUMO');
      if (invReportType === 'ajustes') filteredData = invMovements.filter(m => m.type.includes('AJUSTE'));
      
      return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in print:border-none print:shadow-none">
           <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
              <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><FileText className="text-orange-500" size={24}/> Reportes de Inventario</h2>
              <div className="flex gap-2">
                 <button onClick={() => handleExportExcel('reporte-inv-filtrado', 'Reporte_Inventario')} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXPORTAR EXCEL</button>
                 <button onClick={() => handleExportPDF('Reporte_Inventario_Filtrado', false)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
              </div>
           </div>
           <div data-html2canvas-ignore="true" className="p-6 bg-white border-b border-gray-100 flex gap-4 no-pdf">
              {['entradas', 'salidas', 'ajustes'].map(type => (
                 <button key={type} onClick={()=>setInvReportType(type)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${invReportType === type ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Reporte de {type}</button>
              ))}
           </div>
           <div id="pdf-content" className="p-8 print:p-0 bg-white">
              <div className="hidden pdf-header mb-8">
                <ReportHeader />
                <h1 className="text-xl font-black text-black uppercase border-b-4 border-orange-500 pb-2">REPORTE DE MOVIMIENTOS: {invReportType.toUpperCase()}</h1>
                <p className="text-sm font-bold text-gray-500 uppercase mt-2">FECHA DE EMISIÓN: {getTodayDate()}</p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-black print:rounded-none">
                <table id="reporte-inv-filtrado" className="w-full text-left whitespace-nowrap text-xs">
                  <thead className="bg-gray-100 border-b-2 border-gray-300 print:border-black">
                    <tr className="uppercase font-black text-[10px] tracking-widest text-black">
                      <th className="py-3 px-4 border-r print:border-black">Fecha / Usuario</th>
                      <th className="py-3 px-4 border-r print:border-black">Referencia / Notas</th>
                      <th className="py-3 px-4 border-r print:border-black">Ítem / Código</th>
                      <th className="py-3 px-4 text-center border-r print:border-black">Cant.</th>
                      <th className="py-3 px-4 text-right border-r print:border-black">Costo U.</th>
                      <th className="py-3 px-4 text-right print:border-black">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-black print:divide-black">
                    {filteredData.map(m => {
                       const isPos = m.type === 'ENTRADA' || m.type === 'AJUSTE (POSITIVO)';
                       return (
                         <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                           <td className="py-3 px-4 font-bold border-r print:border-black">{m.date}<br/><span className="text-[9px] text-gray-500 print:text-black">{m.user}</span></td>
                           <td className="py-3 px-4 font-black border-r print:border-black">{m.reference}<br/><span className="text-[9px] font-bold text-gray-400 print:text-black">{m.notes}</span></td>
                           <td className="py-3 px-4 font-bold border-r print:border-black">{m.itemId}<br/><span className="text-[9px] font-black print:text-black">{m.itemName}</span></td>
                           <td className={`py-3 px-4 text-center font-black text-sm border-r print:border-black ${isPos ? 'text-green-600' : 'text-red-600'} print:text-black`}>{isPos ? '+' : '-'}{formatNum(m.qty)}</td>
                           <td className="py-3 px-4 text-right font-bold text-gray-600 border-r print:border-black print:text-black">${formatNum(m.cost)}</td>
                           <td className="py-3 px-4 text-right font-black print:border-black print:text-black">${formatNum(m.totalValue || (m.qty*m.cost))}</td>
                         </tr>
                       );
                    })}
                    {filteredData.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin movimientos registrados</td></tr>}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        
        {/* CATÁLOGO DE INVENTARIO */}
        {invView === 'catalogo' && (
          <>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-black uppercase">Catálogo de Productos</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleExportExcel('catalogo-table', 'Catalogo')} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-700 flex gap-2 items-center"><Download size={14}/> EXCEL</button>
                  <button onClick={() => handleExportPDF('Catalogo', true)} className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 flex gap-2 items-center"><Printer size={14}/> PDF</button>
                </div>
              </div>
              <div data-html2canvas-ignore="true" className="mb-4 no-pdf">
                <input type="text" placeholder="Buscar por código o descripción..." value={invSearchTerm} onChange={e => setInvSearchTerm(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" />
              </div>
              <div id="pdf-content" className="grid gap-4 print:block">
                <div className="hidden pdf-header mb-6"><ReportHeader /><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Catálogo de Inventario</h2></div>
                <table id="catalogo-table" className="w-full text-left whitespace-nowrap text-sm hidden print:table">
                  <thead className="bg-gray-100 uppercase"><tr><th>Código</th><th>Descripción</th><th>Costo</th><th>Stock</th></tr></thead>
                  <tbody>{filteredInventory.map(item => (<tr key={item.id}><td>{item.id}</td><td>{item.desc}</td><td>${formatNum(item.cost)}</td><td className="font-black text-blue-600">{formatNum(item.stock)} {item.unit}</td></tr>))}</tbody>
                </table>
                
                {/* Vista Tarjetas (Pantalla) */}
                <div className="grid gap-4 print:hidden">
                  {filteredInventory.map(item => (
                    <div key={item.id} className="p-6 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-start">
                      <div>
                        <p className="font-black text-orange-600 text-lg">{item.id}</p>
                        <p className="font-bold text-sm mt-1">{item.desc}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-blue-600 text-2xl">{formatNum(item.stock)} {item.unit}</p>
                        <p className="text-sm text-gray-600 mt-1">Costo Promedio: ${formatNum(item.cost)}</p>
                        <p className="text-sm font-black text-green-600 mt-2">Valor Total: ${formatNum(item.stock * item.cost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* MOVIMIENTOS DE INVENTARIO (KARDEX) */}
        {invView === 'kardex' && (
          <>
            {/* Formulario de Movimiento */}
            {!isAjusteUnlocked && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                <h3 className="text-lg font-black text-black uppercase mb-6">Nuevo Movimiento</h3>
                <form onSubmit={handleAddInventoryMovement} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Producto *</label>
                      <select required value={newInventoryMovement.itemId} onChange={e => setNewInventoryMovement({ ...newInventoryMovement, itemId: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                        <option value="">SELECCIONE</option>
                        {inventory.map(item => <option key={item.id} value={item.id}>{item.id} - {item.desc}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Tipo de Movimiento *</label>
                      <select required value={newInventoryMovement.type} onChange={e => setNewInventoryMovement({ ...newInventoryMovement, type: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-xs uppercase">
                        <option value="ENTRADA">ENTRADA</option>
                        <option value="SALIDA">SALIDA</option>
                        {isAjusteUnlocked && (
                          <>
                            <option value="AJUSTE (POSITIVO)">AJUSTE (+)</option>
                            <option value="AJUSTE (NEGATIVO)">AJUSTE (-)</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Cantidad *</label>
                      <input type="number" step="0.01" required value={newInventoryMovement.qty} onChange={e => setNewInventoryMovement({ ...newInventoryMovement, qty: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center text-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Referencia *</label>
                      <input type="text" required value={newInventoryMovement.reference} onChange={e => setNewInventoryMovement({ ...newInventoryMovement, reference: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" placeholder="COMPRA, VENTA, AJUSTE..." />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Fecha *</label>
                      <input type="date" required value={newInventoryMovement.date} onChange={e => setNewInventoryMovement({ ...newInventoryMovement, date: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-2">Costo Unitario ($) {newInventoryMovement.type === 'ENTRADA' && '*'}</label>
                      <input type="number" step="0.01" required={newInventoryMovement.type === 'ENTRADA'} value={newInventoryMovement.cost} onChange={e => setNewInventoryMovement({ ...newInventoryMovement, cost: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-center text-lg" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><Save size={16} /> Registrar Movimiento</button>
                </form>
              </div>
            )}

            {/* Historial Kardex */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black">Historial de Movimientos (Kardex)</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleExportExcel('kardex-table', 'Kardex')} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-700 flex gap-2 items-center"><Download size={14}/> EXCEL</button>
                  <button onClick={() => handleExportPDF('Kardex', true)} className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 flex gap-2 items-center"><Printer size={14}/> PDF</button>
                </div>
              </div>
              <div data-html2canvas-ignore="true" className="mb-4 no-pdf">
                <input type="text" placeholder="Buscar movimiento..." value={invSearchTerm} onChange={e => setInvSearchTerm(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm uppercase" />
              </div>
              <div id="pdf-content" className="space-y-3 print:block">
                <div className="hidden pdf-header mb-6"><ReportHeader /><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Historial Kardex</h2></div>
                <table id="kardex-table" className="w-full text-left whitespace-nowrap text-sm hidden print:table">
                  <thead className="bg-gray-100 uppercase"><tr><th>Fecha/Ref</th><th>Ítem</th><th>Operación</th><th>Cant.</th><th>Costo</th></tr></thead>
                  <tbody>
                    {filteredMovements.map(m => {
                      const isPos = isMovementAddition(m.type);
                      return (<tr key={m.id}><td>{m.date}<br/>{m.reference}</td><td>{m.itemId}</td><td>{m.type}</td><td className={`font-black ${isPos ? 'text-green-600':'text-red-600'}`}>{isPos?'+':'-'}{formatNum(m.qty)}</td><td>${formatNum(m.cost)}</td></tr>)
                    })}
                  </tbody>
                </table>

                {/* Vista Tarjetas (Pantalla) */}
                <div className="grid gap-3 print:hidden">
                  {filteredMovements.slice(0, 20).map(m => {
                    const isPos = isMovementAddition(m.type);
                    return (
                      <div key={m.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-start">
                        <div>
                          <p className="font-black text-sm">{m.itemId} - {m.itemName}</p>
                          <p className="text-xs text-gray-500 mt-1">{m.date} - {m.reference}</p>
                          <p className="text-xs text-gray-500">Usuario: {m.user}</p>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className={`font-black text-xl ${isPos ? 'text-green-600' : 'text-red-600'}`}>{isPos ? '+' : '-'}{formatNum(m.qty)}</p>
                            <p className="text-xs uppercase font-bold mt-1">{m.type}</p>
                            {m.cost && <p className="text-xs text-gray-600 mt-1">Costo: ${formatNum(m.cost)}</p>}
                          </div>
                          <button onClick={() => setShowMovementReceipt(m)} className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300" title="Comprobante"><Printer size={16}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* REQUISICIONES DE PLANTA */}
        {invView === 'requisiciones' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2">
              Requisiciones de Planta
              {invRequisitions.filter(r => r.status === 'PENDIENTE').length > 0 && (
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs animate-pulse">
                  {invRequisitions.filter(r => r.status === 'PENDIENTE').length} Pendientes
                </span>
              )}
            </h3>
            <div className="space-y-4">
              {invRequisitions.map(req => (
                <div key={req.id} className={`p-6 rounded-2xl border-2 ${req.status === 'PENDIENTE' ? 'bg-orange-50 border-orange-200' : req.status === 'APROBADO' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-black text-sm">OP: {req.opId} - Fase: {req.phase}</p>
                      <p className="text-xs text-gray-600 mt-1">{req.date}</p>
                      <p className="text-xs text-gray-600">Solicitado por: {req.requestedBy}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black uppercase ${req.status === 'PENDIENTE' ? 'text-orange-700' : req.status === 'APROBADO' ? 'text-green-700' : 'text-red-700'}`}>{req.status}</p>
                      {req.status === 'APROBADO' && req.approvedBy && <p className="text-xs text-gray-600 mt-1">Por: {req.approvedBy}</p>}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 mb-4">
                    <p className="text-xs font-black uppercase mb-2">Items Solicitados:</p>
                    <div className="space-y-1">
                      {req.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs"><span className="font-bold">{item.itemName}</span><span className="font-black">{formatNum(item.qty)} KG</span></div>
                      ))}
                    </div>
                  </div>
                  {req.status === 'PENDIENTE' && (
                    <div className="flex gap-3">
                      <button onClick={() => handleApproveRequisition(req.id)} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><CheckCircle size={16} /> Aprobar</button>
                      <button onClick={() => handleRejectRequisition(req.id)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><X size={16} /> Rechazar</button>
                    </div>
                  )}
                </div>
              ))}
              {invRequisitions.length === 0 && <div className="text-center py-12"><ClipboardList size={48} className="text-gray-300 mx-auto mb-4" /><p className="text-gray-500 font-bold">No hay requisiciones</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCostosModule = () => {

    // --- VISTAS DE REPORTES PARA COSTOS ---
    if (costosView === 'general_sales') {
      const completedOps = (requirements || []).filter(r => r.status === 'COMPLETADO');
      return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in print:border-none print:shadow-none w-full">
           <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
              <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><TrendingUp className="text-orange-500" size={24}/> General: Ingresos vs Costos</h2>
              <div className="flex gap-2">
                 <button onClick={() => handleExportExcel('ingresos-costos-table', 'Reporte_Rentabilidad_Global')} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXCEL</button>
                 <button onClick={() => handleExportPDF('Reporte_Rentabilidad_Global', false)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> PDF</button>
              </div>
           </div>

           <div id="pdf-content" className="p-8 print:p-0 bg-white">
              <div className="hidden pdf-header mb-8"><ReportHeader /></div>
              <div className="text-center mb-8"><h1 className="text-2xl font-black text-black uppercase border-b-4 border-orange-500 pb-2 inline-block">COMPARATIVO GLOBAL DE RENTABILIDAD POR OP</h1></div>

              <div className="overflow-x-auto rounded-xl border-2 border-black print:rounded-none">
                 <table id="ingresos-costos-table" className="w-full text-left whitespace-nowrap text-xs">
                    <thead className="bg-black text-white">
                       <tr className="uppercase font-black text-[10px] tracking-widest">
                          <th className="p-4 border-r border-gray-700">OP N° / Cliente</th>
                          <th className="p-4 border-r border-gray-700 text-right">Costo Producción</th>
                          <th className="p-4 border-r border-gray-700 text-right">Ingreso Facturado</th>
                          <th className="p-4 border-r border-gray-700 text-right">Ganancia ($)</th>
                          <th className="p-4 text-center">Margen (%)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-black">
                       {completedOps.map(op => {
                          let opCost = 0;
                          ['extrusion', 'impresion', 'sellado'].forEach(p => { (op.production?.[p]?.batches || []).forEach(b => opCost += parseNum(b.cost)); });
                          const opIncome = (invoices || []).filter(inv => inv.opAsignada === op.id).reduce((sum, inv) => sum + parseNum(inv.montoBase), 0);
                          const profit = opIncome - opCost;
                          const margin = opIncome > 0 ? (profit / opIncome) * 100 : 0;

                          return (
                             <tr key={op.id} className="hover:bg-gray-50">
                                <td className="p-4 border-r border-gray-200">
                                   <span className="font-black text-orange-600">#{String(op.id).replace('OP-','').padStart(5,'0')}</span><br/>
                                   <span className="text-[10px] font-bold text-gray-500 uppercase">{op.client}</span>
                                </td>
                                <td className="p-4 border-r border-gray-200 text-right font-black text-red-600">${formatNum(opCost)}</td>
                                <td className="p-4 border-r border-gray-200 text-right font-black text-green-600">${formatNum(opIncome)}</td>
                                <td className={`p-4 border-r border-gray-200 text-right font-black ${profit >= 0 ? 'text-black' : 'text-red-500'}`}>${formatNum(profit)}</td>
                                <td className={`p-4 text-center font-black ${margin >= 30 ? 'text-green-600' : (margin > 0 ? 'text-orange-500' : 'text-red-500')}`}>{formatNum(margin)}%</td>
                             </tr>
                          );
                       })}
                       {completedOps.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin OPs Completadas registradas</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      );
    }

    if (costosView === 'produccion_mensual') {
       const completedOps = (requirements || []).filter(r => r.status === 'COMPLETADO');
       const monthlyData = {};
       completedOps.forEach(op => {
          let lastDate = op.fecha;
          let opMP = 0; let opMerma = 0; 
          
          ['extrusion', 'impresion', 'sellado'].forEach(ph => {
             (op.production?.[ph]?.batches || []).forEach(b => {
                opMerma += parseNum(b.mermaKg || b.merma);
                if (b.date || b.timestamp) lastDate = b.date || getSafeDate(b.timestamp);
                (b.ingredientes || b.insumos || []).forEach(i => opMP += parseNum(i.qty));
             });
          });
          
          const finalPhase = op.tipoProducto === 'TERMOENCOGIBLE' ? 'extrusion' : 'sellado';
          const prodFinal = (op.production?.[finalPhase]?.batches || []).reduce((s,b)=>s+parseNum(b.kgProduced || b.producedKg),0);

          const monthKey = lastDate.substring(0, 7); // YYYY-MM
          if (!monthlyData[monthKey]) monthlyData[monthKey] = { key: monthKey, mp: 0, merma: 0, termo: 0, bolsas: 0 };
          
          monthlyData[monthKey].mp += opMP;
          monthlyData[monthKey].merma += opMerma;
          if (op.tipoProducto === 'TERMOENCOGIBLE') monthlyData[monthKey].termo += prodFinal;
          else monthlyData[monthKey].bolsas += prodFinal;
       });

       const monthlyArray = Object.values(monthlyData).sort((a,b) => b.key.localeCompare(a.key));

       return (
         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in w-full">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Activity className="text-orange-500" size={24}/> Producción General Mes a Mes</h2>
               <div className="flex gap-2">
                  <button onClick={() => handleExportExcel('produccion-mensual-table', 'Reporte_Produccion_Mensual')} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXCEL</button>
                  <button onClick={() => handleExportPDF('Reporte_Produccion_Mensual', false)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> PDF</button>
               </div>
            </div>
            <div id="pdf-content" className="p-8 print:p-0 bg-white">
               <div className="hidden pdf-header mb-8"><ReportHeader /></div>
               <div className="text-center mb-8"><h1 className="text-2xl font-black text-black uppercase border-b-4 border-orange-500 pb-2 inline-block">REPORTE CONSOLIDADO DE PRODUCCIÓN (MES A MES)</h1></div>
               <div className="overflow-x-auto rounded-xl border border-gray-200">
                 <table id="produccion-mensual-table" className="w-full text-center whitespace-nowrap text-xs">
                    <thead className="bg-black text-white">
                       <tr className="uppercase font-black text-[10px] tracking-widest">
                          <th className="p-4 border-r border-gray-700 text-left">Período (Mes)</th>
                          <th className="p-4 border-r border-gray-700">Materia Prima (KG)</th>
                          <th className="p-4 border-r border-gray-700 text-blue-300">Termoencogible Final (KG)</th>
                          <th className="p-4 border-r border-gray-700 text-orange-300">Bolsas Finales (KG)</th>
                          <th className="p-4 border-r border-gray-700 text-red-300">Merma Total (KG)</th>
                          <th className="p-4">Merma Global (%)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-black">
                       {monthlyArray.map(m => {
                          const pct = m.mp > 0 ? (m.merma / m.mp) * 100 : 0;
                          return (
                             <tr key={m.key} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-black border-r border-gray-200 text-left text-sm">{m.key}</td>
                                <td className="p-4 font-black border-r border-gray-200">{formatNum(m.mp)}</td>
                                <td className="p-4 font-black border-r border-gray-200 text-blue-700">{formatNum(m.termo)}</td>
                                <td className="p-4 font-black border-r border-gray-200 text-orange-600">{formatNum(m.bolsas)}</td>
                                <td className="p-4 font-black border-r border-gray-200 text-red-600">{formatNum(m.merma)}</td>
                                <td className={`p-4 font-black text-lg ${getMermaColor(pct)}`}>{formatNum(pct)}%</td>
                             </tr>
                          );
                       })}
                       {monthlyArray.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin datos registrados</td></tr>}
                    </tbody>
                 </table>
               </div>
            </div>
         </div>
       );
    }

    if (costosView === 'op_detail') {
       const completedOps = (requirements || []).filter(r => r.status === 'COMPLETADO');
       const [selectedOpDetailId, setSelectedOpDetailId] = useState(''); // Estado local simple para este view

       const selectedReq = completedOps.find(r => r.id === selectedOpDetailId);
       let reqTotalCost = 0; let matchedInvoices = []; let totalInvoiceIncome = 0; let costBreakdown = [];
       let fechaInicio = 'N/A'; let fechaFin = 'N/A'; let totalMP_Kg = 0; let totalMerma_Kg = 0;

       if (selectedReq) {
          const bs = [];
          ['extrusion', 'impresion', 'sellado'].forEach(phase => {
             (selectedReq.production?.[phase]?.batches || []).forEach(b => {
                bs.push(b);
                reqTotalCost += parseNum(b.cost);
                totalMerma_Kg += parseNum(b.merma || b.mermaKg);
                (b.ingredientes || b.insumos || []).forEach(ing => {
                   const existing = costBreakdown.find(c => c.id === (ing.itemId || ing.id));
                   const invItem = (inventory || []).find(i => i.id === (ing.itemId || ing.id));
                   const unitC = invItem ? invItem.cost : 0;
                   const qtyNum = parseNum(ing.qty);
                   const totC = unitC * qtyNum;
                   totalMP_Kg += qtyNum;
                   if (existing) { existing.qty += qtyNum; existing.total += totC; }
                   else { costBreakdown.push({ id: (ing.itemId || ing.id), desc: invItem?.desc || (ing.itemId || ing.id), qty: qtyNum, unitCost: unitC, total: totC, phase }); }
                });
             });
          });
          if (bs.length > 0) {
             bs.sort((a, b) => a.timestamp - b.timestamp);
             fechaInicio = getSafeDate(bs[0].timestamp);
             fechaFin = getSafeDate(bs[bs.length - 1].timestamp);
          }
          matchedInvoices = (invoices || []).filter(inv => inv.opAsignada === selectedReq.id);
          totalInvoiceIncome = matchedInvoices.reduce((sum, inv) => sum + parseNum(inv.montoBase), 0);
       }

       const reqProfit = totalInvoiceIncome - reqTotalCost;
       const reqMargin = totalInvoiceIncome > 0 ? (reqProfit / totalInvoiceIncome) * 100 : 0;
       const mermaPct = totalMP_Kg > 0 ? (totalMerma_Kg / totalMP_Kg) * 100 : 0;

       return (
         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in w-full">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><FileText className="text-orange-500" size={24}/> Detalle de Rentabilidad (OP)</h2>
               {selectedReq && (
                  <div className="flex gap-2">
                     <button onClick={() => handleExportExcel('superfiniquito-table', `Finiquito_OP_${selectedReq.id}`)} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXCEL</button>
                     <button onClick={() => handleExportPDF(`Finiquito_OP_${selectedReq.id}`, false)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> PDF</button>
                  </div>
               )}
            </div>
            <div data-html2canvas-ignore="true" className="p-8 bg-white border-b border-gray-100 flex gap-4 items-end no-pdf">
               <div className="flex-1 max-w-md">
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Seleccionar OP Completada</label>
                  <select value={selectedOpDetailId} onChange={e=>setSelectedOpDetailId(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 font-black text-xs outline-none focus:border-orange-500 text-black uppercase">
                     <option value="">-- SELECCIONE ORDEN --</option>
                     {completedOps.map(op => <option key={op.id} value={op.id}>#{String(op.id).replace('OP-','').padStart(5,'0')} - {op.client}</option>)}
                  </select>
               </div>
            </div>

            {selectedReq ? (
               <div id="pdf-content" className="p-8 print:p-0 print:m-0 bg-white">
                  <div className="hidden pdf-header mb-4"><ReportHeader /></div>
                  <div className="text-center mb-4"><h1 className="text-xl font-black text-black uppercase border-b-4 border-orange-500 pb-1 inline-block">FINIQUITO FINANCIERO DE PRODUCCIÓN</h1></div>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-[10px] font-black uppercase border-2 border-black p-3 rounded-t-xl bg-gray-50">
                     <div>
                        <p className="text-gray-500 mb-0.5">CLIENTE:</p><p className="text-xs text-black mb-2">{selectedReq.client}</p>
                        <p className="text-gray-500 mb-0.5">PRODUCTO / MAQUILA:</p><p className="text-black mb-2">{selectedReq.desc}</p>
                        <p className="text-gray-500 mb-0.5">CANTIDAD ESTIMADA:</p><p className="text-black text-orange-600">{formatNum(selectedReq.requestedKg)} KG</p>
                     </div>
                     <div className="text-right">
                        <p className="text-gray-500 mb-0.5">NÚMERO DE ORDEN:</p><p className="text-sm text-orange-600 mb-2">#{String(selectedReq.id).replace('OP-','').padStart(5,'0')}</p>
                        <p className="text-gray-500 mb-0.5">INICIO PRODUCCIÓN:</p><p className="text-black mb-2">{fechaInicio}</p>
                        <p className="text-gray-500 mb-0.5">CIERRE PRODUCCIÓN:</p><p className="text-black">{fechaFin}</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center text-[10px] font-black uppercase border-x-2 border-b-2 border-black p-2 rounded-b-xl bg-white shadow-sm">
                     <div><p className="text-gray-500 mb-0.5">Total MP Inyectada</p><p className="text-sm text-black">{formatNum(totalMP_Kg)} KG</p></div>
                     <div className="border-x-2 border-gray-200"><p className="text-gray-500 mb-0.5">Total Merma Generada</p><p className={`text-sm ${getMermaColor(mermaPct)}`}>{formatNum(totalMerma_Kg)} KG</p></div>
                     <div><p className="text-gray-500 mb-0.5">% Merma Global OP</p><p className={`text-sm ${getMermaColor(mermaPct)}`}>{formatNum(mermaPct)}%</p></div>
                  </div>

                  <div id="superfiniquito-table">
                     <div className="mb-4">
                        <h3 className="text-[10px] font-black uppercase text-white bg-black p-2 tracking-widest">1. Desglose de Costos de Producción (MP)</h3>
                        <table className="w-full text-left text-[9px] border-collapse border-2 border-black mt-1">
                           <thead className="bg-gray-200">
                              <tr className="uppercase font-black tracking-widest text-black">
                                 <th className="p-1.5 border border-black">Insumo / Descripción</th>
                                 <th className="p-1.5 border border-black text-center">Fase</th>
                                 <th className="p-1.5 border border-black text-center">Cantidad</th>
                                 <th className="p-1.5 border border-black text-right">Costo Unit.</th>
                                 <th className="p-1.5 border border-black text-right">Costo Total</th>
                              </tr>
                           </thead>
                           <tbody>
                              {costBreakdown.map((item, idx) => (
                                 <tr key={idx}>
                                    <td className="p-1.5 border border-black font-bold uppercase">{item.desc}</td>
                                    <td className="p-1.5 border border-black text-center font-bold uppercase">{item.phase}</td>
                                    <td className="p-1.5 border border-black text-center font-black">{formatNum(item.qty)} kg</td>
                                    <td className="p-1.5 border border-black text-right font-bold">${formatNum(item.unitCost)}</td>
                                    <td className="p-1.5 border border-black text-right font-black text-red-600">${formatNum(item.total)}</td>
                                 </tr>
                              ))}
                           </tbody>
                           <tfoot className="bg-gray-100">
                              <tr>
                                 <td colSpan="4" className="p-1.5 border border-black text-right font-black uppercase">Costo Total MP:</td>
                                 <td className="p-1.5 border border-black text-right font-black text-red-600 text-xs">${formatNum(reqTotalCost)}</td>
                              </tr>
                           </tfoot>
                        </table>
                     </div>

                     <div className="mb-4">
                        <h3 className="text-[10px] font-black uppercase text-white bg-black p-2 tracking-widest">2. Ventas y Facturación de la OP</h3>
                        <table className="w-full text-left text-[9px] border-collapse border-2 border-black mt-1">
                           <thead className="bg-gray-200">
                              <tr className="uppercase font-black tracking-widest text-black">
                                 <th className="p-1.5 border border-black">Factura N°</th>
                                 <th className="p-1.5 border border-black text-center">Fecha</th>
                                 <th className="p-1.5 border border-black text-right">Base (Ingreso Real)</th>
                                 <th className="p-1.5 border border-black text-right">IVA (16%)</th>
                                 <th className="p-1.5 border border-black text-right">Total Cobrado</th>
                              </tr>
                           </thead>
                           <tbody>
                              {matchedInvoices.map((inv, idx) => (
                                 <tr key={idx}>
                                    <td className="p-1.5 border border-black font-black">{inv.documento}</td>
                                    <td className="p-1.5 border border-black text-center font-bold">{inv.fecha}</td>
                                    <td className="p-1.5 border border-black text-right font-black text-green-600">${formatNum(inv.montoBase)}</td>
                                    <td className="p-1.5 border border-black text-right font-bold text-gray-500">${formatNum(inv.iva)}</td>
                                    <td className="p-1.5 border border-black text-right font-black">${formatNum(inv.total)}</td>
                                 </tr>
                              ))}
                              {matchedInvoices.length === 0 && <tr><td colSpan="5" className="p-2 text-center font-bold uppercase text-red-500">No hay facturas asociadas a esta OP.</td></tr>}
                           </tbody>
                           {matchedInvoices.length > 0 && (
                              <tfoot className="bg-gray-100">
                                 <tr>
                                    <td colSpan="2" className="p-1.5 border border-black text-right font-black uppercase">Total Ingreso OP (Base):</td>
                                    <td className="p-1.5 border border-black text-right font-black text-green-600 text-xs">${formatNum(totalInvoiceIncome)}</td>
                                    <td colSpan="2" className="p-1.5 border border-black bg-gray-200"></td>
                                 </tr>
                              </tfoot>
                           )}
                        </table>
                     </div>
                  </div>

                  <div className="border-2 border-black p-4 rounded-xl bg-gray-50 flex justify-between items-center mt-4">
                     <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Cruce de Información</p><p className="text-xs font-bold uppercase text-black">Rentabilidad y Margen</p></div>
                     <div className="text-right flex items-end gap-6">
                        <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Ganancia/Pérdida</p><p className={`text-xl font-black ${reqProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${formatNum(reqProfit)}</p></div>
                        <div className="bg-black text-white px-4 py-2 rounded-lg border-2 border-black"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">MARGEN NETO</p><p className={`text-xl font-black ${reqMargin >= 30 ? 'text-green-400' : (reqMargin > 0 ? 'text-orange-400' : 'text-red-400')}`}>{formatNum(reqMargin)}%</p></div>
                     </div>
                  </div>
                  <div className="mt-12 grid grid-cols-2 gap-16 text-center font-black uppercase text-[9px] text-black">
                     <div className="border-t-2 border-black pt-1 mx-6">DEPARTAMENTO DE COSTOS</div>
                     <div className="border-t-2 border-black pt-1 mx-6">GERENCIA</div>
                  </div>
               </div>
            ) : (
               <div className="p-16 text-center text-gray-400"><FileText size={60} className="mx-auto mb-4 opacity-50"/><p className="font-black uppercase tracking-widest">Selecciona una OP completada</p></div>
            )}
         </div>
       );
    }

    return (
      <div className="space-y-6 animate-in fade-in w-full">
        
        {/* DASHBOARD DE COSTOS */}
        {costosView === 'dashboard' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-lg font-black mb-8">Dashboard General de Rentabilidad</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center"><DollarSign size={32} className="text-green-600 mx-auto mb-2" /><p className="text-xs font-black text-gray-600 uppercase">Ingresos Totales</p><p className="text-3xl font-black text-green-600 mt-2">${formatNum(globalCostCalculations.totalIncome)}</p></div>
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center"><TrendingUp size={32} className="text-red-600 mx-auto mb-2" /><p className="text-xs font-black text-gray-600 uppercase">Costo Materia Prima</p><p className="text-3xl font-black text-red-600 mt-2">${formatNum(globalCostCalculations.totalOpCostsMP)}</p></div>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 text-center"><Wrench size={32} className="text-orange-600 mx-auto mb-2" /><p className="text-xs font-black text-gray-600 uppercase">Costos Operativos</p><p className="text-3xl font-black text-orange-600 mt-2">${formatNum(globalCostCalculations.totalOpCostsOperativos)}</p></div>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center"><Briefcase size={32} className="text-blue-600 mx-auto mb-2" /><p className="text-xs font-black text-gray-600 uppercase">Ganancia Neta</p><p className={`text-3xl font-black mt-2 ${globalCostCalculations.globalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${formatNum(globalCostCalculations.globalProfit)}</p></div>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8">
              <p className="text-sm font-black text-gray-600 uppercase mb-4">Margen de Ganancia</p>
              <div className="flex items-center gap-6">
                <div className="flex-1 bg-gray-200 rounded-full h-12 overflow-hidden">
                  <div className={`h-full transition-all ${globalCostCalculations.globalMargin >= 30 ? 'bg-green-500' : globalCostCalculations.globalMargin > 0 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.max(0, Math.min(100, globalCostCalculations.globalMargin))}%` }}></div>
                </div>
                <p className="text-4xl font-black">{formatNum(globalCostCalculations.globalMargin)}%</p>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2"><span>0%</span><span className="font-black">Meta: 30%</span><span>100%</span></div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h4 className="text-sm font-black uppercase mb-4">Desglose de Costos</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-sm font-bold">Materia Prima</span><span className="font-black text-red-600">${formatNum(globalCostCalculations.totalOpCostsMP)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm font-bold">Costos Operativos</span><span className="font-black text-orange-600">${formatNum(globalCostCalculations.totalOpCostsOperativos)}</span></div>
                  <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center"><span className="text-sm font-black uppercase">Total Costos</span><span className="font-black text-xl">${formatNum(globalCostCalculations.totalCostsGlobal)}</span></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h4 className="text-sm font-black uppercase mb-4">Resumen Financiero</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-sm font-bold">Ingresos</span><span className="font-black text-green-600">${formatNum(globalCostCalculations.totalIncome)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm font-bold">Costos</span><span className="font-black text-red-600">-${formatNum(globalCostCalculations.totalCostsGlobal)}</span></div>
                  <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center"><span className="text-sm font-black uppercase">Utilidad</span><span className={`font-black text-xl ${globalCostCalculations.globalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${formatNum(globalCostCalculations.globalProfit)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COSTOS OPERATIVOS */}
        {costosView === 'operativos' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-lg font-black text-black uppercase mb-6">Registrar Costo Operativo</h3>
            <form onSubmit={handleAddOpCost} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-2">Fecha *</label>
                  <input type="date" required value={newOpCostForm.date} onChange={e => setNewOpCostForm({ ...newOpCostForm, date: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold text-sm" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-2">Categoría *</label>
                  <select required value={newOpCostForm.category} onChange={e => setNewOpCostForm({ ...newOpCostForm, category: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 font-black text-xs uppercase">
                    <option value="Nómina">Nómina</option>
                    <option value="Electricidad">Electricidad</option>
                    <option value="Agua">Agua</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Alquiler">Alquiler</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-2">Descripción *</label>
                  <input type="text" required value={newOpCostForm.description} onChange={e => setNewOpCostForm({ ...newOpCostForm, description: e.target.value.toUpperCase() })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 uppercase font-bold text-sm" placeholder="DETALLE DEL GASTO" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-black text-gray-500 uppercase block mb-2">Monto ($) *</label>
                    <input type="number" step="0.01" required value={newOpCostForm.amount} onChange={e => setNewOpCostForm({ ...newOpCostForm, amount: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 text-center font-black text-lg" />
                  </div>
                  <button type="submit" className="bg-black text-white px-6 rounded-xl font-black text-xs uppercase self-end"><Plus size={20} /></button>
                </div>
              </div>
            </form>

            <div className="mt-8">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-black">Costos Registrados</h3>
                 <div className="flex gap-2">
                   <button onClick={() => handleExportExcel('costos-operativos-table', 'Costos')} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-700 flex gap-2 items-center"><Download size={14}/> EXCEL</button>
                   <button onClick={() => handleExportPDF('Costos_Operativos', true)} className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 flex gap-2 items-center"><Printer size={14}/> PDF</button>
                 </div>
               </div>
               
               <div id="pdf-content" className="space-y-3 print:block">
                 <div className="hidden pdf-header mb-6"><ReportHeader /><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Historial Costos Operativos</h2></div>
                 
                 <table id="costos-operativos-table" className="w-full text-left whitespace-nowrap text-sm hidden print:table">
                   <thead className="bg-gray-100 uppercase"><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th></tr></thead>
                   <tbody>{opCosts.map(c => (<tr key={c.id}><td>{c.date}</td><td>{c.category}</td><td>{c.description}</td><td className="font-black text-red-600">${formatNum(c.amount)}</td></tr>))}</tbody>
                 </table>

                 <div className="grid gap-3 print:hidden">
                   {opCosts.slice(0, 15).map(cost => (
                     <div key={cost.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                       <div>
                         <p className="font-black text-sm">{cost.description}</p>
                         <p className="text-xs text-gray-500 mt-1">{cost.date} - {cost.category}</p>
                         <p className="text-xs text-gray-500">Registrado por: {cost.user}</p>
                       </div>
                       <div className="text-right flex items-center gap-3">
                         <div><p className="font-black text-red-600 text-xl">${formatNum(cost.amount)}</p></div>
                         <button onClick={() => handleDeleteOpCost(cost.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                       </div>
                     </div>
                   ))}
                   {opCosts.length === 0 && <div className="text-center py-12"><Wrench size={48} className="text-gray-300 mx-auto mb-4" /><p className="text-gray-500 font-bold">No hay costos operativos registrados</p></div>}
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDERIZADO PRINCIPAL (LOGIN / LAYOUT)
  // ============================================================================
  if (!appUser) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundImage: `url('${settings?.loginBg || "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?q=80&w=2072&auto=format&fit=crop"}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
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
                <p className="text-gray-300 mt-4 text-sm leading-relaxed drop-shadow-md">Sistema Integrado de Producción e Inventario para Servicios Jiret G&B C.A.</p>
              </div>
              <div className="relative z-10 text-gray-500 text-xs font-bold uppercase tracking-widest">© {new Date().getFullYear()} Todos los derechos reservados</div>
            </div>
            <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white relative z-10">
              <h2 className="text-2xl font-black text-black uppercase tracking-widest mb-2">Iniciar Sesión</h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Ingresa tus credenciales de acceso</p>
              {loginError && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6 uppercase border border-red-200 flex items-center gap-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"><AlertTriangle size={16} /> {loginError}</div>}
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Usuario</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18} />
                    <input type="text" value={loginData.username} onChange={e => setLoginData({ ...loginData, username: e.target.value })} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" placeholder="ADMIN o PLANTA" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18} />
                    <input type="password" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" placeholder="••••••••" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black py-4 rounded-xl shadow-[0_8px_20px_rgba(249,115,22,0.4)] hover:shadow-[0_15px_25px_rgba(249,115,22,0.6)] hover:-translate-y-1 active:translate-y-1 uppercase tracking-widest text-xs flex justify-center items-center gap-2 mt-4 transform transition-all">
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
              <div className="flex items-center gap-4 cursor-pointer transition-transform hover:scale-105" onClick={() => { clearAllReports(); setActiveTab('home'); }}>
                <div className="flex items-center bg-white rounded-2xl px-3 py-1">
                  <span className="text-black font-black text-3xl leading-none">G</span><span className="text-orange-500 font-black text-2xl mx-0.5">&amp;</span><span className="text-black font-black text-3xl leading-none">B</span>
                </div>
                <div className="hidden sm:block border-l-2 border-gray-800 pl-4 uppercase font-black text-lg">Supply ERP</div>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-3 bg-gray-800 px-5 py-2 rounded-2xl border border-gray-700">
                  <ShieldCheck size={18} className="text-orange-500" />
                  <span className="font-black text-white text-[10px] uppercase leading-none">{appUser?.name}</span>
                </div>
                <button onClick={() => setAppUser(null)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 p-2.5 rounded-2xl border border-gray-700 transition-all"><LogOut size={20} /></button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 flex-1 print:p-0 print:m-0 print:block">
          {activeTab !== 'home' && (
            <nav className="md:w-64 flex-shrink-0 space-y-4 print:hidden animate-in slide-in-from-left">
              <button onClick={() => { clearAllReports(); setActiveTab('home'); }} className="w-full flex items-center justify-center gap-3 px-5 py-4 text-xs font-black rounded-2xl bg-black text-white shadow-xl hover:bg-gray-800 mb-4 transition-all active:scale-95 uppercase tracking-widest"><Home size={18} className="text-orange-500" /> INICIO</button>

              {appUser?.permissions?.ventas && activeTab === 'ventas' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Área Ventas</h3>
                  <button onClick={() => { clearAllReports(); setVentasView('facturacion'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'facturacion' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Receipt size={16} /> Facturación</button>
                  <button onClick={() => { clearAllReports(); setVentasView('requisiciones'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'requisiciones' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><ClipboardEdit size={16} /> OP / Requisiciones</button>
                  <button onClick={() => { clearAllReports(); setVentasView('clientes'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'clientes' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Users size={16} /> Directorio Clientes</button>
                </div>
              )}

              {appUser?.permissions?.produccion && activeTab === 'produccion' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Planta / Producción</h3>
                  <button onClick={() => { clearAllReports(); setProdView('calculadora'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'calculadora' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><Calculator size={16} /> Simulador OP</button>
                  <button onClick={() => { clearAllReports(); setProdView('fases_produccion'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'fases_produccion' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><Thermometer size={16} /> Fases en Proceso</button>
                  <button onClick={() => { clearAllReports(); setProdView('historial'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'historial' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><History size={16} /> Historial / Finiquitos</button>
                </div>
              )}

              {appUser?.permissions?.inventario && activeTab === 'inventario' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Almacén</h3>
                  <button onClick={() => { clearAllReports(); setInvView('requisiciones'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'requisiciones' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase relative`}><ClipboardList size={16} /> Requisiciones OP {invRequisitions.filter(r => r.status === 'PENDIENTE').length > 0 && <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{invRequisitions.filter(r => r.status === 'PENDIENTE').length}</span>}</button>
                  <button onClick={() => { clearAllReports(); setInvView('catalogo'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'catalogo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Box size={16} /> Catálogo / Stock</button>
                  <button onClick={() => { clearAllReports(); setInvView('kardex'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'kardex' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><History size={16} /> Kardex General</button>
                  <button onClick={() => { clearAllReports(); setInvView('reportes_mod'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'reportes_mod' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><FileText size={16} /> Reportes Filtrados</button>
                </div>
              )}

              {appUser?.permissions?.costos && activeTab === 'costos' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Costos y Rentabilidad</h3>
                  <button onClick={() => { clearAllReports(); setCostosView('dashboard'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${costosView === 'dashboard' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><BarChart3 size={16} /> Dashboard General</button>
                  <button onClick={() => { clearAllReports(); setCostosView('op_detail'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${costosView === 'op_detail' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><FileText size={16} /> Súper Finiquito (OP)</button>
                  <button onClick={() => { clearAllReports(); setCostosView('general_sales'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${costosView === 'general_sales' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><TrendingUp size={16} /> Ingresos vs Costos</button>
                  <button onClick={() => { clearAllReports(); setCostosView('operativos'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${costosView === 'operativos' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Wrench size={16} /> Costos Operativos</button>
                  <button onClick={() => { clearAllReports(); setCostosView('produccion_mensual'); }} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${costosView === 'produccion_mensual' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Activity size={16} /> Prod. Mensual</button>
                </div>
              )}

              {appUser?.permissions?.configuracion && activeTab === 'configuracion' && (
                <button onClick={() => { clearAllReports(); setActiveTab('configuracion'); }} className="w-full flex items-center justify-center gap-3 px-5 py-4 text-xs font-black rounded-2xl transition-all active:scale-95 uppercase tracking-widest bg-orange-500 text-white shadow-xl"><Settings2 size={18} className="text-white" /> CONFIGURACIÓN</button>
              )}
            </nav>
          )}

          <main className={`flex-1 min-w-0 pb-12 print:pb-0 print:m-0 print:p-0 print:block print:w-full ${activeTab === 'home' || activeTab === 'configuracion' ? 'flex items-center justify-center' : ''}`}>
            {activeTab === 'home' && renderHome()}
            {activeTab === 'ventas' && renderVentasModule()}
            {activeTab === 'produccion' && renderProductionModule()}
            {activeTab === 'inventario' && renderInventoryModule()}
            {activeTab === 'costos' && renderCostosModule()}
            
            {activeTab === 'configuracion' && (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in w-full">
                <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
                   <h2 className="text-xl font-black text-black uppercase flex items-center gap-3"><Settings2 className="text-orange-500" size={24}/> Gestión de Usuarios y Permisos</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                   <div className="lg:col-span-1 border-r border-gray-200 bg-gray-50/50 p-8">
                      <h3 className="text-sm font-black uppercase text-black mb-6 tracking-widest border-b border-gray-200 pb-2">{editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                      <form onSubmit={handleSaveUser} className="space-y-4">
                         <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Nombre Completo</label>
                            <input type="text" required value={newUserForm.name} onChange={e=>setNewUserForm({...newUserForm, name: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-200 bg-white rounded-xl p-3 font-black text-xs uppercase outline-none focus:border-orange-500 transition-colors" placeholder="EJ: JUAN PEREZ" />
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Usuario (Login)</label>
                            <input type="text" required disabled={!!editingUserId} value={newUserForm.username} onChange={e=>setNewUserForm({...newUserForm, username: e.target.value.toLowerCase()})} className="w-full border-2 border-gray-200 bg-white rounded-xl p-3 font-black text-xs outline-none focus:border-orange-500 transition-colors" placeholder="EJ: juanp" />
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Contraseña</label>
                            <input type="text" required={!editingUserId} value={newUserForm.password} onChange={e=>setNewUserForm({...newUserForm, password: e.target.value})} className="w-full border-2 border-gray-200 bg-white rounded-xl p-3 font-black text-xs outline-none focus:border-orange-500 transition-colors" placeholder="Mínimo 4 caracteres" />
                         </div>
                         <div className="pt-4 border-t border-gray-200 mt-4">
                            <label className="text-[10px] font-black text-black uppercase block mb-3 tracking-widest">Permisos de Acceso</label>
                            <div className="space-y-2 bg-white p-4 rounded-xl border border-gray-200">
                               {['ventas', 'produccion', 'inventario', 'costos', 'configuracion'].map(mod => (
                                  <label key={mod} className="flex items-center gap-3 cursor-pointer group">
                                     <input type="checkbox" checked={newUserForm.permissions?.[mod] || false} onChange={(e) => setNewUserForm({...newUserForm, permissions: {...newUserForm.permissions, [mod]: e.target.checked}})} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500 cursor-pointer" />
                                     <span className="text-[10px] font-black text-gray-600 uppercase group-hover:text-black transition-colors">Módulo de {mod}</span>
                                  </label>
                               ))}
                            </div>
                         </div>
                         <div className="pt-6 flex gap-2">
                            {editingUserId && <button type="button" onClick={() => {setEditingUserId(null); setNewUserForm(initialUserForm);}} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-300 transition-all">Cancelar</button>}
                            <button type="submit" className="flex-1 bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2"><Save size={14}/> Guardar</button>
                         </div>
                      </form>
                   </div>
                   <div className="lg:col-span-2 p-8">
                      <h3 className="text-sm font-black uppercase text-black mb-6 tracking-widest border-b border-gray-200 pb-2">Usuarios Registrados</h3>
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
                                        <span className="font-black text-orange-600 text-sm">{u.username}</span><br/>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">{u.name}</span>
                                     </td>
                                     <td className="py-3 px-4 border-r font-black text-gray-400">{u.password}</td>
                                     <td className="py-3 px-4 border-r">
                                        <div className="flex flex-wrap gap-1">
                                           {u.permissions && Object.entries(u.permissions).map(([key, val]) => val && (
                                              <span key={key} className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{key}</span>
                                           ))}
                                           {u.role === 'Master' && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[9px] font-black uppercase">ALL ACCESS</span>}
                                        </div>
                                     </td>
                                     <td className="py-3 px-4 text-center">
                                        <div className="flex justify-center gap-2">
                                           <button onClick={() => startEditUser(u)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Edit size={14}/></button>
                                           {u.username !== 'admin' && (
                                              <button onClick={() => handleDeleteUser(u.username)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"><Trash2 size={14}/></button>
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
            )}
          </main>
        </div>

        {dialog && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] print:hidden">
            <div className="bg-white rounded-3xl shadow-2xl border-t-8 border-orange-500 p-8 w-full max-w-md transform animate-in zoom-in-95">
              <h3 className="text-xl font-black text-black uppercase mb-4 tracking-tighter">{dialog.title}</h3>
              <p className="text-sm font-bold text-gray-500 mb-8 uppercase text-center">{dialog.text}</p>
              <div className="flex gap-4">
                {dialog.type === 'confirm' && (
                  <button onClick={() => setDialog(null)} className="flex-1 bg-gray-100 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors text-gray-800">CANCELAR</button>
                )}
                <button onClick={() => { if (dialog.onConfirm) dialog.onConfirm(); setDialog(null); }} className="flex-1 bg-black text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-gray-900 transition-colors">ACEPTAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

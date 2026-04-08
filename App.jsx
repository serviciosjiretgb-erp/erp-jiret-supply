import React, { useState, useEffect } from 'react';
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
// ESCUDO DE ERRORES EXTREMO
// ============================================================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error) { this.setState({ errorMsg: error && error.message ? error.message : String(error) }); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 print:hidden">
          <AlertTriangle size={60} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-black text-black uppercase mb-2">Sistema Protegido de Caída</h2>
          <p className="text-gray-500 text-sm mb-6">{this.state.errorMsg}</p>
          <button onClick={() => window.location.reload()} className="bg-black text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg hover:bg-gray-800 transition-colors">Recargar Interfaz</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

// ============================================================================
// COMPRESOR DE IMÁGENES
// ============================================================================
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
      let width = img.width; let height = img.height;
      if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.6)); 
    };
  };
};

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
// CORRECCIÓN: Eliminado "us-central" del constructor para evitar fallos de inicialización silentes
const db = getFirestore(app); 

const getColRef = (colName) => collection(db, colName); 
const getDocRef = (colName, docId) => doc(db, colName, String(docId));

const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

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

// --- BASE DE DATOS INICIAL ---
const INITIAL_INVENTORY = [
  { id: 'MP-0240', desc: 'ESENTTIA', cost: 0.96, stock: 2325, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-11PG4', desc: 'METALOCENO', cost: 0.91, stock: 1735, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-3003', desc: 'BAPOLENE', cost: 0.96, stock: 500, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-RECICLADO', desc: 'MATERIAL RECICLADO', cost: 1.00, stock: 9999, unit: 'kg', category: 'Materia Prima' }
];

function MainApp() {
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
  const [invReportType, setInvReportType] = useState('entradas');

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
  const [reqToApprove, setReqToApprove] = useState(null);

  const [showNewReqPanel, setShowNewReqPanel] = useState(false);
  const [showNewInvoicePanel, setShowNewInvoicePanel] = useState(false);
  const [showGeneralInvoicesReport, setShowGeneralInvoicesReport] = useState(false);
  const [showClientReport, setShowClientReport] = useState(false);
  const [showReqReport, setShowReqReport] = useState(false);
  const [showSingleReqReport, setShowSingleReqReport] = useState(null);
  const [showSingleInvoice, setShowSingleInvoice] = useState(null);
  const [showMovementReceipt, setShowMovementReceipt] = useState(null);
  const [showPurchaseOrder, setShowPurchaseOrder] = useState(false);
  const [selectedOpCost, setSelectedOpCost] = useState('');

  // Formularios de Configuración
  const initialUserForm = { username: '', password: '', name: '', role: 'Usuario', permissions: { ventas: false, produccion: false, inventario: false, costos: false, configuracion: false } };
  const [newUserForm, setNewUserForm] = useState(initialUserForm);
  const [editingUserId, setEditingUserId] = useState(null);

  // Formularios de Ventas
  const initialClientForm = { rif: '', razonSocial: '', direccion: '', telefono: '', personaContacto: '', vendedor: '', fechaCreacion: getTodayDate() };
  const [newClientForm, setNewClientForm] = useState(initialClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const initialReqForm = { fecha: getTodayDate(), client: '', tipoProducto: 'BOLSAS', desc: '', ancho: '', fuelles: '', largo: '', micras: '', pesoMillar: '', presentacion: 'MILLAR', cantidad: '', requestedKg: '', color: 'NATURAL', tratamiento: 'LISO', vendedor: '' };
  const [newReqForm, setNewReqForm] = useState(initialReqForm);
  const [editingReqId, setEditingReqId] = useState(null);
  const initialInvoiceForm = { fecha: getTodayDate(), clientRif: '', clientName: '', documento: '', productoMaquilado: '', vendedor: '', montoBase: '', iva: '', total: '', aplicaIva: 'SI', opAsignada: '' };
  const [newInvoiceForm, setNewInvoiceForm] = useState(initialInvoiceForm);

  // Formularios Producción
  const initialPhaseForm = { date: getTodayDate(), insumos: [], producedKg: '', mermaKg: '', operadorExt: '', tratado: '', motorExt: '', ventilador: '', jalador: '', zona1: '', zona2: '', zona3: '', zona4: '', zona5: '', zona6: '', cabezalA: '', cabezalB: '', operadorImp: '', kgRecibidosImp: '', cantColores: '', relacionImp: '', motorImp: '', tensores: '', tempImp: '', solvente: '', operadorSel: '', kgRecibidosSel: '', impresa: 'NO', tipoSello: 'Sello FC', tempCabezalA: '', tempCabezalB: '', tempPisoA: '', tempPisoB: '', velServo: '', millaresProd: '', troquelSel: '' };
  const [showWorkOrder, setShowWorkOrder] = useState(null);
  const [showPhaseReport, setShowPhaseReport] = useState(null);
  const [showFiniquito, setShowFiniquito] = useState(null);
  const [selectedPhaseReqId, setSelectedPhaseReqId] = useState(null);
  const [activePhaseTab, setActivePhaseTab] = useState('extrusion');
  const [phaseForm, setPhaseForm] = useState(initialPhaseForm);
  const [phaseIngId, setPhaseIngId] = useState('');
  const [phaseIngQty, setPhaseIngQty] = useState('');

  // Simulador Inverso
  const initialCalcInputs = { ingredientes: [{ id: Date.now() + 1, nombre: 'MP-0240', pct: 80, costo: 0.96 }, { id: Date.now() + 2, nombre: 'MP-RECICLADO', pct: 20, costo: 1.00 }], cantidadSolicitada: '', mermaGlobalPorc: 5, tipoProducto: 'BOLSAS', ancho: '', fuelles: '', largo: '', micras: '' };
  const [calcInputs, setCalcInputs] = useState(initialCalcInputs);

  // Formularios Inventario y Costos Operativos
  const initialInvItemForm = { id: '', desc: '', category: 'Materia Prima', unit: 'kg', cost: '', stock: '' };
  const [newInvItemForm, setNewInvItemForm] = useState(initialInvItemForm);
  const [editingInvId, setEditingInvId] = useState(null);
  const initialMovementForm = { date: getTodayDate(), itemId: '', type: 'ENTRADA', qty: '', cost: '', reference: '', notes: '', opAsignada: '' };
  const [newMovementForm, setNewMovementForm] = useState(initialMovementForm);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  
  const initialOpCostForm = { date: getTodayDate(), category: 'Nómina', description: '', amount: '' };
  const [newOpCostForm, setNewOpCostForm] = useState(initialOpCostForm);

  // ============================================================================
  // EXPORTACIONES A PDF Y EXCEL CORREGIDAS
  // ============================================================================
  const handleExportPDF = (filename, isLandscape = false) => {
    const element = document.getElementById('pdf-content'); if (!element) return;
    
    // Mostrar/ocultar elementos
    const printOnlyElements = element.querySelectorAll('.hidden.print\\:block, .hidden.pdf-header'); 
    printOnlyElements.forEach(el => { el.style.display = 'block'; });
    const noPdfElements = element.querySelectorAll('.no-pdf'); 
    noPdfElements.forEach(el => { el.style.display = 'none'; });

    // Evitar recortes horizontales quitando clases overflow
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
    const table = document.getElementById(tableId); if (!table) return; const tableClone = table.cloneNode(true);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><style>table{border-collapse:collapse;width:100%;font-family:Arial;font-size:11px;}th,td{border:1px solid #000;padding:5px;}th{text-align:center;}</style></head><body><h2>SERVICIOS JIRET G&B, C.A. - RIF: J-412309374</h2><br/>${tableClone.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${filename}_${getTodayDate()}.xls`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getMermaColor = (pct) => {
     if (pct <= 5.0) return 'text-green-500';
     if (pct > 5.0 && pct <= 5.5) return 'text-yellow-500';
     return 'text-red-500';
  };

  // INICIO DE SESIÓN
  const handleLogin = (e) => {
    e.preventDefault(); const user = loginData.username.toLowerCase().trim(); const pass = loginData.password.trim();
    const foundUser = systemUsers.find(u => u.username === user && u.password === pass);
    if (foundUser) { setAppUser(foundUser); setLoginError(''); } else { setLoginError('Credenciales incorrectas. Intente nuevamente.'); }
  };
  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (file) { compressImage(file, async (base64) => { try { await setDoc(getDocRef('settings', 'general'), { loginBg: base64 }, { merge: true }); setDialog({title: 'Éxito', text: 'Fondo actualizado.', type: 'alert'}); } catch (error) { setDialog({title: 'Error', text: 'Imagen muy pesada o error de red.', type: 'alert'}); } }); }
  };

  useEffect(() => { signInAnonymously(auth).catch(err => console.error(err)); const unsubscribe = onAuthStateChanged(auth, setFbUser); return () => unsubscribe(); }, []);
  
  useEffect(() => {
    if (!fbUser) return; let isFirstInv = true;
    const unsubUsers = onSnapshot(getColRef('users'), (s) => {
      const loadedUsers = s.docs.map(d => ({ id: d.id, ...d.data() })); setSystemUsers(loadedUsers);
      if (s.empty) {
         setDoc(getDocRef('users', 'admin'), { username: 'admin', password: '1234', name: 'Administrador General', role: 'Master', permissions: { ventas: true, produccion: true, inventario: true, costos: true, configuracion: true } });
         setDoc(getDocRef('users', 'planta'), { username: 'planta', password: '1234', name: 'Supervisor de Planta', role: 'Planta', permissions: { ventas: false, produccion: true, inventario: false, costos: false, configuracion: false } });
      }
    });
    const unsubSettings = onSnapshot(getDocRef('settings', 'general'), (d) => { if(d.exists()) setSettings(d.data()); });
    const unsubInv = onSnapshot(getColRef('inventory'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() })); setInventory(data);
      if (s.empty && isFirstInv) { INITIAL_INVENTORY.forEach(item => setDoc(getDocRef('inventory', item.id), item)); }
      isFirstInv = false;
    });
    const unsubMovs = onSnapshot(getColRef('inventoryMovements'), (s) => setInvMovements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubCli = onSnapshot(getColRef('clientes'), (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubReq = onSnapshot(getColRef('requirements'), (s) => setRequirements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubInvB = onSnapshot(getColRef('maquilaInvoices'), (s) => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubInvReqs = onSnapshot(getColRef('inventoryRequisitions'), (s) => setInvRequisitions(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubOpCosts = onSnapshot(getColRef('operatingCosts'), (s) => setOpCosts(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));

    return () => { unsubUsers(); unsubSettings(); unsubInv(); unsubMovs(); unsubCli(); unsubReq(); unsubInvB(); unsubInvReqs(); unsubOpCosts(); };
  }, [fbUser]);

  const clearAllReports = () => {
    setShowReqReport(false); setShowClientReport(false); setShowGeneralInvoicesReport(false);
    setShowNewReqPanel(false); setShowNewInvoicePanel(false); setEditingClientId(null); setEditingReqId(null); 
    setShowSingleReqReport(null); setShowSingleInvoice(null); setInvoiceSearchTerm(''); setShowWorkOrder(null); 
    setShowPhaseReport(null); setShowFiniquito(null); setSelectedPhaseReqId(null); setReqToApprove(null); setShowMovementReceipt(null);
    setShowPurchaseOrder(false); setSelectedOpCost('');
  };

  // ============================================================================
  // LOGICA CONFIGURACIÓN / USUARIOS
  // ============================================================================
  const handleSaveUser = async (e) => {
    e.preventDefault(); if (!newUserForm.username || !newUserForm.password) return setDialog({title:'Aviso', text:'Usuario y contraseña requeridos.', type:'alert'});
    const userId = newUserForm.username.toLowerCase().trim();
    try { await setDoc(getDocRef('users', userId), { ...newUserForm, username: userId }); setNewUserForm(initialUserForm); setEditingUserId(null); setDialog({title: 'Éxito', text: 'Usuario registrado.', type: 'alert'}); } catch(err) { setDialog({title: 'Error', text: err.message, type: 'alert'}); }
  };
  const startEditUser = (u) => { setEditingUserId(u.username); setNewUserForm(u); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteUser = (id) => { if(id === 'admin') return setDialog({title:'Acción Denegada', text:'No puedes eliminar al administrador.', type:'alert'}); setDialog({ title: 'Eliminar Usuario', text: `¿Desea eliminar el acceso a ${id}?`, type: 'confirm', onConfirm: async () => await deleteDoc(getDocRef('users', id))}); };

  // ============================================================================
  // LOGICA INVENTARIO Y COSTO PROMEDIO
  // ============================================================================
  const handleSaveInvItem = async (e) => {
    e.preventDefault(); if (!newInvItemForm.id || !newInvItemForm.desc) return setDialog({ title: 'Aviso', text: 'Código obligatorio.', type: 'alert' });
    const itemData = { ...newInvItemForm, id: newInvItemForm.id.toUpperCase(), desc: newInvItemForm.desc.toUpperCase(), cost: parseNum(newInvItemForm.cost), stock: parseNum(newInvItemForm.stock), timestamp: Date.now() };
    try { await setDoc(getDocRef('inventory', itemData.id), itemData, { merge: true }); setNewInvItemForm(initialInvItemForm); setEditingInvId(null); setDialog({ title: 'Éxito', text: 'Artículo guardado.', type: 'alert' }); } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };
  const startEditInvItem = (item) => { setEditingInvId(item.id); setNewInvItemForm({ id: item.id, desc: item.desc, category: item.category || 'Materia Prima', cost: item.cost || '', stock: item.stock || '', unit: item.unit || 'kg' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleSaveMovement = async (e) => {
    e.preventDefault(); const item = (inventory || []).find(i => i?.id === newMovementForm.itemId); if (!item) return;
    const qty = parseNum(newMovementForm.qty); const isAddition = newMovementForm.type === 'ENTRADA' || newMovementForm.type === 'AJUSTE (POSITIVO)';
    if (!isAddition && (item?.stock || 0) < qty) return setDialog({title: 'Stock Insuficiente', text: `Inventario actual (${item.stock}) no cubre salida de ${qty}.`, type: 'alert'});
    
    let updatedCost = item?.cost || 0;
    const movCost = newMovementForm.cost ? parseNum(newMovementForm.cost) : updatedCost; 
    
    if (newMovementForm.type === 'ENTRADA') {
        const oldStock = item?.stock || 0;
        const oldCost = item?.cost || 0;
        if (oldStock + qty > 0) {
            updatedCost = ((oldStock * oldCost) + (qty * movCost)) / (oldStock + qty);
        }
    }

    const movId = Date.now().toString();
    try {
      const batch = writeBatch(db);
      batch.set(getDocRef('inventoryMovements', movId), { id: movId, date: newMovementForm.date, itemId: item.id, itemName: item.desc, type: newMovementForm.type, qty, cost: movCost, totalValue: qty * movCost, reference: newMovementForm.reference.toUpperCase(), opAsignada: newMovementForm.opAsignada || '', notes: newMovementForm.notes.toUpperCase(), timestamp: Date.now(), user: appUser?.name });
      batch.update(getDocRef('inventory', item.id), { stock: (item?.stock || 0) + (isAddition ? qty : -qty), cost: updatedCost });
      await batch.commit(); setNewMovementForm(initialMovementForm); setDialog({title: 'Éxito', text: `Movimiento registrado. ${newMovementForm.type === 'ENTRADA' ? 'Costo promedio actualizado.' : ''}`, type: 'alert'});
    } catch (err) { setDialog({title: 'Error', text: err.message, type: 'alert'}); }
  };
  
  const handleDeleteInvItem = (id) => setDialog({ title: 'Eliminar Ítem', text: `¿Eliminar ${id}?`, type: 'confirm', onConfirm: async () => await deleteDoc(getDocRef('inventory', id))});
  const handleDeleteMovement = (m) => setDialog({ title: 'Anular Movimiento', text: `¿Revertir movimiento? Esto ajustará el stock, pero NO recalcula costos anteriores.`, type: 'confirm', onConfirm: async () => {
        const item = (inventory || []).find(i => i?.id === m?.itemId);
        if (item) { 
           const isPos = String(m?.type || '').includes('ENTRADA') || String(m?.type || '').includes('POSITIVO');
           const batch = writeBatch(db); 
           batch.update(getDocRef('inventory', item.id), { stock: (item?.stock || 0) + (isPos ? -(m?.qty || 0) : (m?.qty || 0)) }); 
           batch.delete(getDocRef('inventoryMovements', m.id)); 
           await batch.commit(); 
           setDialog({title: 'Anulado', text: 'Stock actualizado.', type: 'alert'}); 
        } else { 
           await deleteDoc(getDocRef('inventoryMovements', m.id)); setDialog({title: 'Anulado', text: 'Registro eliminado.', type: 'alert'}); 
        }
  }});
  
  const generateReport177Data = () => {
    const data = []; const categories = [...new Set((inventory || []).map(i => i?.category || 'Otros'))];
    categories.forEach(cat => {
       const itemsData = (inventory || []).filter(i => (i?.category || 'Otros') === cat).map(item => {
          const movs = (invMovements || []).filter(m => m?.itemId === item?.id);
          const start = new Date(reportYear, reportMonth - 1, 1).getTime(); const end = new Date(reportYear, reportMonth, 0, 23, 59, 59).getTime(); 
          let initialStock = item?.stock || 0;
          movs.filter(m => m?.timestamp >= start).forEach(m => { 
             const isPos = String(m?.type || '').includes('ENTRADA') || String(m?.type || '').includes('POSITIVO');
             initialStock += (isPos ? -(m?.qty || 0) : (m?.qty || 0)); 
          });
          let mEntQty = 0, mEntCost = 0, mSalQty = 0, mSalCost = 0;
          movs.filter(m => m?.timestamp >= start && m?.timestamp <= end).forEach(m => {
             const isPos = String(m?.type || '').includes('ENTRADA') || String(m?.type || '').includes('POSITIVO');
             if (isPos) { mEntQty += (m?.qty || 0); mEntCost += ((m?.cost || 0) * (m?.qty || 0)); } 
             else { mSalQty += (m?.qty || 0); mSalCost += ((m?.cost || 0) * (m?.qty || 0)); }
          });
          const itemCost = item?.cost || 0;
          const invFinalQty = initialStock + mEntQty - mSalQty;
          return { ...item, initialStock, initialTotal: initialStock * itemCost, monthEntradasQty: mEntQty, monthEntradasTotal: mEntCost, monthEntradasProm: mEntQty ? mEntCost/mEntQty : 0, monthSalidasQty: mSalQty, monthSalidasTotal: mSalCost, monthSalidasProm: mSalQty ? mSalCost/mSalQty : 0, invFinalQty, invFinalTotal: invFinalQty * itemCost, invFinalCost: itemCost };
       });
       data.push({ category: cat, items: itemsData });
    }); return data;
  };

  // ============================================================================
  // LOGICA VENTAS Y FACTURACIÓN
  // ============================================================================
  const handleAddClient = async (e) => {
    if (e) e.preventDefault(); if (!newClientForm.rif || !newClientForm.razonSocial) return setDialog({ title: 'Aviso', text: 'RIF y Razón Social obligatorios.', type: 'alert' });
    const rif = newClientForm.rif.toUpperCase().trim();
    try { await setDoc(getDocRef('clientes', rif), { ...newClientForm, name: newClientForm.razonSocial.toUpperCase().trim(), rif, timestamp: Date.now() }, { merge: true }); setNewClientForm(initialClientForm); setEditingClientId(null); setDialog({ title: '¡Éxito!', text: 'Cliente guardado.', type: 'alert' }); } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };
  const startEditClient = (c) => { setEditingClientId(c.rif); setNewClientForm({ ...c, razonSocial: c.name }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteClient = (rif) => setDialog({ title: 'Eliminar Cliente', text: `¿Desea eliminar el cliente ${rif}?`, type: 'confirm', onConfirm: async () => await deleteDoc(getDocRef('clientes', rif))});
  const generateInvoiceId = () => `FAC-${((invoices || []).reduce((m, r) => Math.max(m, parseInt(String(r.id).replace(/\D/g, '')||0, 10)), 0) + 1).toString().padStart(4, '0')}`;
  
  const handleInvoiceFormChange = (field, value) => {
    const valUpper = typeof value === 'string' ? value.toUpperCase() : value; let f = { ...newInvoiceForm, [field]: valUpper };
    if (field === 'clientRif') { const c = (clients || []).find(cl => cl.rif === value); f.clientName = c?.name || ''; f.vendedor = (c?.vendedor || '').toUpperCase(); }
    if (field === 'montoBase' || field === 'aplicaIva') { const base = parseNum(field === 'montoBase' ? value : f.montoBase); const aplica = field === 'aplicaIva' ? value : f.aplicaIva; const iva = aplica === 'SI' ? base * 0.16 : 0; f.iva = iva > 0 ? iva.toFixed(2) : '0.00'; f.total = base > 0 ? (base + iva).toFixed(2) : base.toFixed(2); }
    if (field === 'iva' && f.aplicaIva === 'SI') { const base = parseNum(f.montoBase); const iva = parseNum(value); f.total = (base + iva).toFixed(2); }
    setNewInvoiceForm(f);
  };
  
  const handleCreateInvoice = async (e) => {
    e.preventDefault(); if(!newInvoiceForm.clientRif || !newInvoiceForm.montoBase) return setDialog({title: 'Aviso', text: 'Selecciona un cliente e ingresa el monto base.', type: 'alert'});
    const id = newInvoiceForm.documento || generateInvoiceId();
    try { await setDoc(getDocRef('maquilaInvoices', id), { ...newInvoiceForm, id, documento: id, montoBase: parseNum(newInvoiceForm.montoBase), iva: parseNum(newInvoiceForm.iva), total: parseNum(newInvoiceForm.total), aplicaIva: newInvoiceForm.aplicaIva || 'SI', timestamp: Date.now(), user: appUser?.name }); setShowNewInvoicePanel(false); setNewInvoiceForm(initialInvoiceForm); setDialog({title: 'Éxito', text: 'Factura Registrada.', type: 'alert'}); } catch(err) { setDialog({title: 'Error', text: err.message, type: 'alert'}); }
  };
  const handleDeleteInvoice = (id) => setDialog({ title: 'Eliminar', text: `¿Eliminar factura?`, type: 'confirm', onConfirm: async () => await deleteDoc(getDocRef('maquilaInvoices', id))});
  
  const generateReqId = () => `OP-${((requirements || []).reduce((m, r) => Math.max(m, parseInt(String(r.id).replace(/\D/g, '')||0, 10)), 0) + 1).toString().padStart(5, '0')}`;
  const handleReqFormChange = (field, value) => {
    let f = { ...newReqForm, [field]: typeof value === 'string' ? value.toUpperCase() : value };
    if (field === 'client') { const c = (clients || []).find(cl => cl.name === (value||'').toUpperCase()); if (c && c.vendedor) f.vendedor = c.vendedor.toUpperCase(); }
    if (field === 'tipoProducto' && value === 'TERMOENCOGIBLE') f.presentacion = 'KILOS';
    const w = parseNum(f.ancho), l = parseNum(f.largo), m = parseNum(f.micras), fu = parseNum(f.fuelles), c = parseNum(f.cantidad), tipo = f.tipoProducto;
    if (w > 0 && m > 0) {
      const micFmt = m < 1 && m > 0 ? Math.round(m * 1000) : m;
      if (tipo === 'BOLSAS' && l > 0) { const pEst = (w + fu) * l * m; f.pesoMillar = pEst.toFixed(2); f.desc = fu > 0 ? `(${w}+${fu/2}+${fu/2})X${l}X${micFmt}MIC | ${f.color || ''}` : `${w}X${l}X${micFmt}MIC | ${f.color || ''}`; f.requestedKg = f.presentacion === 'KILOS' ? c.toFixed(2) : (pEst * c).toFixed(2); } 
      else if (tipo === 'TERMOENCOGIBLE') { f.pesoMillar = 'N/A'; f.desc = `TERMOENCOGIBLE ${w}CM X ${micFmt}MIC | ${f.color || ''}`; f.requestedKg = c > 0 ? c.toFixed(2) : '0.00'; } 
      else { f.pesoMillar = '0.00'; f.requestedKg = '0.00'; }
    } else { f.pesoMillar = tipo === 'TERMOENCOGIBLE' ? 'N/A' : '0.00'; f.requestedKg = f.presentacion === 'KILOS' && c > 0 ? c.toFixed(2) : '0.00'; }
    setNewReqForm(f);
  };

  const handleCreateRequirement = async (e) => {
    e.preventDefault(); const opId = editingReqId ? editingReqId : generateReqId();
    try { await setDoc(getDocRef('requirements', opId), { ...newReqForm, id: opId, timestamp: editingReqId ? (requirements || []).find(r=>r.id===editingReqId)?.timestamp : Date.now(), status: editingReqId ? (requirements || []).find(r=>r.id===editingReqId)?.status : 'EN PROCESO', viewedByPlanta: false }, { merge: true }); setShowNewReqPanel(false); setNewReqForm(initialReqForm); setEditingReqId(null); setDialog({title: 'Éxito', text: `OP enviada a Planta.`, type: 'alert'}); } catch(err) { setDialog({title: 'Error', text: err.message, type: 'alert'}); }
  };
  const startEditReq = (r) => { setEditingReqId(r.id); setNewReqForm({ fecha: r.fecha||getTodayDate(), client: r.client||'', tipoProducto: r.tipoProducto||'BOLSAS', desc: r.desc||'', ancho: r.ancho||'', fuelles: r.fuelles||'', largo: r.largo||'', micras: r.micras||'', pesoMillar: r.tipoProducto==='TERMOENCOGIBLE'?'N/A':(r.pesoMillar||''), presentacion: r.presentacion||'MILLAR', cantidad: r.cantidad||'', requestedKg: r.requestedKg||'', color: r.color||'NATURAL', tratamiento: r.tratamiento||'LISO', vendedor: r.vendedor||'' }); setShowNewReqPanel(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteReq = (id) => setDialog({ title: 'Eliminar OP', text: `¿Desea eliminar la OP #${id}?`, type: 'confirm', onConfirm: async () => await deleteDoc(getDocRef('requirements', id))});

  // ============================================================================
  // LOGICA APROBACIÓN DE REQUISICIONES DE ALMACÉN
  // ============================================================================
  const handleSendRequisitionToAlmacen = async () => {
    if (!phaseForm.insumos || phaseForm.insumos.length === 0) { return setDialog({title: 'Aviso', text: 'Agregue insumos a la lista antes de solicitar a almacén.', type: 'alert'}); }
    const newReq = { opId: selectedPhaseReqId, phase: activePhaseTab, items: phaseForm.insumos, status: 'PENDIENTE', timestamp: Date.now(), date: getTodayDate(), user: appUser?.name || 'Operador de Planta' };
    try { await addDoc(getColRef('inventoryRequisitions'), newReq); setPhaseForm({...phaseForm, insumos: []}); setDialog({title: 'Solicitud Enviada', text: 'Requisición enviada al Almacén. Espere su entrega.', type: 'alert'}); } catch(e) { setDialog({title: 'Error', text: e.message, type: 'alert'}); }
  };

  const submitApproveRequisition = async (e) => {
    e.preventDefault();
    try {
        const req = reqToApprove; const targetOP = (requirements || []).find(r => r.id === req.opId);
        if (!targetOP) throw new Error('La OP asociada ya no existe.');
        const validItems = req.items.filter(i => parseNum(i.qty) > 0);
        if (validItems.length === 0) throw new Error('No hay ítems con cantidad válida.');

        const batch = writeBatch(db); let phaseCost = 0; let totalInsumosKg = 0;

        for (let ing of validItems) {
           const item = (inventory || []).find(i => i.id === ing.id);
           if (!item) throw new Error(`Ítem ${ing.id} no encontrado en catálogo.`);
           if ((item.stock || 0) < ing.qty) throw new Error(`Stock insuficiente para ${item.desc}.`);

           phaseCost += (item.cost * ing.qty); totalInsumosKg += parseFloat(ing.qty);
           batch.update(getDocRef('inventory', item.id), { stock: (item.stock || 0) - ing.qty });
           const movId = Date.now().toString() + Math.floor(Math.random()*1000);
           batch.set(getDocRef('inventoryMovements', movId), { id: movId, date: getTodayDate(), itemId: item.id, itemName: item.desc, type: 'SALIDA', qty: ing.qty, cost: item.cost, totalValue: ing.qty * item.cost, reference: `REQ-${targetOP.id}-${req.phase.substring(0,3).toUpperCase()}`, opAsignada: targetOP.id, notes: 'DESPACHO ALMACÉN', timestamp: Date.now(), user: appUser?.name || 'Almacén' });
        }

        let currentPhase = { ...(targetOP.production?.[req.phase] || { batches: [], isClosed: false }) };
        const newProdBatch = { id: Date.now().toString(), timestamp: Date.now(), date: getTodayDate(), insumos: validItems, producedKg: 0, mermaKg: 0, totalInsumosKg, cost: phaseCost, operator: 'ALMACÉN (DESPACHO)', techParams: {} };
        if (!currentPhase.batches) currentPhase.batches = []; currentPhase.batches.push(newProdBatch);
        batch.update(getDocRef('requirements', targetOP.id), { [`production.${req.phase}`]: currentPhase });
        batch.update(getDocRef('inventoryRequisitions', req.id), { status: 'APROBADO', dispatchDate: getTodayDate(), items: validItems, approvedBy: appUser?.name });

        await batch.commit(); setReqToApprove(null); setDialog({title:'¡Descargo Exitoso!', text:'Requisición aprobada, stock descontado y costos asignados a OP.', type:'alert'});
    } catch(err) { setDialog({title:'Error', text:err.message, type:'alert'}); }
  };

  const handleRejectRequisition = (id) => {
    setDialog({title: 'Rechazar Requisición', text: '¿Desea rechazar esta solicitud de materiales?', type: 'confirm', onConfirm: async () => { await updateDoc(getDocRef('inventoryRequisitions', id), { status: 'RECHAZADO', dispatchDate: getTodayDate() }); setDialog({title: 'Actualizado', text: 'La solicitud ha sido rechazada.', type: 'alert'}); }});
  };

  // ============================================================================
  // LOGICA PRODUCCIÓN Y CONTROL DE FASES
  // ============================================================================
  const renderPhaseInventoryOptions = () => {
    let mainCats = [];
    if (activePhaseTab === 'extrusion') mainCats = ['Materia Prima', 'Pigmentos', 'Consumibles', 'Herramientas', 'Seguridad Industrial'];
    else if (activePhaseTab === 'impresion') mainCats = ['Tintas', 'Químicos', 'Consumibles', 'Seguridad Industrial'];
    else if (activePhaseTab === 'sellado') mainCats = ['Consumibles', 'Herramientas'];
    const grouped = {}; (inventory || []).forEach(i => { const cat = i?.category || 'Otros'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(i); });
    return (<><option value="">Seleccione Insumo...</option>
      {mainCats.map(cat => grouped[cat] && grouped[cat].length > 0 && ( <optgroup key={cat} label={`📌 ${cat.toUpperCase()} (Recomendado)`}> {(grouped[cat] || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc} ({formatNum(i?.stock)} {i?.unit})</option>)} </optgroup> ))}
      {Object.keys(grouped).filter(c => !mainCats.includes(c)).map(cat => grouped[cat] && grouped[cat].length > 0 && ( <optgroup key={cat} label={`📂 ${cat.toUpperCase()} (Otros)`}> {(grouped[cat] || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc} ({formatNum(i?.stock)} {i?.unit})</option>)} </optgroup> ))}
    </>);
  };

  const handleAddPhaseIng = () => { if (!phaseIngId || !phaseIngQty) return; const ing = (inventory || []).find(i => i?.id === phaseIngId); if (!ing) return; setPhaseForm({ ...phaseForm, insumos: [...(phaseForm?.insumos || []), { id: phaseIngId, qty: parseFloat(phaseIngQty) }] }); setPhaseIngId(''); setPhaseIngQty(''); };

  const handleSavePhase = async (e) => {
    e.preventDefault(); const req = (requirements || []).find(r => r?.id === selectedPhaseReqId); if (!req) return;
    const actionType = e.nativeEvent?.submitter?.name; const isSkip = actionType === 'skip'; const isClose = actionType === 'close';
    let currentPhase = req.production?.[activePhaseTab] || { batches: [], isClosed: false };
    if (isSkip) { currentPhase.skipped = true; currentPhase.isClosed = true; } 
    else {
        const prodKg = parseNum(phaseForm?.producedKg); const mermaKg = parseNum(phaseForm?.mermaKg);
        if (prodKg > 0 || mermaKg > 0 || (phaseForm?.insumos || []).length > 0) {
            const batch = writeBatch(db); let phaseCost = 0; let totalInsumosKg = 0;
            for (let ing of (phaseForm?.insumos || [])) {
              const item = (inventory || []).find(i => i?.id === ing?.id);
              if (item) { phaseCost += ((item?.cost || 0) * (ing?.qty || 0)); totalInsumosKg += parseFloat(ing?.qty || 0); batch.update(getDocRef('inventory', item.id), { stock: (item?.stock || 0) - (ing?.qty || 0) }); }
            }
            await batch.commit();
            let techParams = {};
            if(activePhaseTab === 'extrusion') techParams = { operador: phaseForm?.operadorExt, tratado: phaseForm?.tratado, motor: phaseForm?.motorExt, ventilador: phaseForm?.ventilador, jalador: phaseForm?.jalador, zonas: [phaseForm?.zona1, phaseForm?.zona2, phaseForm?.zona3, phaseForm?.zona4, phaseForm?.zona5, phaseForm?.zona6], cabezalA: phaseForm?.cabezalA, cabezalB: phaseForm?.cabezalB };
            if(activePhaseTab === 'impresion') techParams = { operador: phaseForm?.operadorImp, kgRecibidos: phaseForm?.kgRecibidosImp, cantColores: phaseForm?.cantColores, relacion: phaseForm?.relacionImp, motor: phaseForm?.motorImp, tensores: phaseForm?.tensores, temp: phaseForm?.tempImp, solvente: phaseForm?.solvente };
            if(activePhaseTab === 'sellado') techParams = { operador: phaseForm?.operadorSel, kgRecibidos: phaseForm?.kgRecibidosSel, impresa: phaseForm?.impresa, tipoSello: phaseForm?.tipoSello, tempCabezalA: phaseForm?.tempCabezalA, tempCabezalB: phaseForm?.tempCabezalB, tempPisoA: phaseForm?.tempPisoA, tempPisoB: phaseForm?.tempPisoB, velServo: phaseForm?.velServo, millares: phaseForm?.millaresProd, troquel: phaseForm?.troquelSel };
            const newBatch = { id: Date.now().toString(), timestamp: Date.now(), date: phaseForm?.date || getTodayDate(), insumos: phaseForm?.insumos || [], producedKg: prodKg, mermaKg, totalInsumosKg, cost: phaseCost, operator: appUser?.name || 'Operador', techParams };
            if (!currentPhase.batches) currentPhase.batches = []; currentPhase.batches.push(newBatch);
        }
        if (isClose) currentPhase.isClosed = true;
    }
    const newProd = { ...(req.production || {}), [activePhaseTab]: currentPhase }; let newStatus = (activePhaseTab === 'sellado' && currentPhase.isClosed) ? 'COMPLETADO' : 'EN PROCESO';
    await updateDoc(getDocRef('requirements', req.id), { production: newProd, status: newStatus }); setPhaseForm({ ...initialPhaseForm, date: getTodayDate() }); setDialog({ title: 'Éxito', text: 'Reporte guardado.', type: 'alert' });
  };

  const handleDeleteBatch = async (reqId, phase, batchId) => {
    setDialog({ title: `ELIMINAR LOTE`, text: `¿Seguro que desea eliminar este lote parcial?`, type: 'confirm', onConfirm: async () => {
        const req = (requirements || []).find(r => r?.id === reqId); let currentPhase = { ...(req?.production?.[phase] || {}) }; const bIdx = (currentPhase.batches || []).findIndex(b => b?.id === batchId);
        if (bIdx >= 0) { const batch = currentPhase.batches[bIdx]; const fbBatch = writeBatch(db); for (let ing of (batch.insumos || [])) { const item = (inventory || []).find(i => i?.id === ing?.id); if (item) fbBatch.update(getDocRef('inventory', item.id), { stock: (item?.stock || 0) + (ing?.qty || 0) }); } await fbBatch.commit(); currentPhase.batches.splice(bIdx, 1); }
        await updateDoc(getDocRef('requirements', reqId), { production: { ...(req?.production || {}), [phase]: currentPhase } });
    }});
  };

  const handleEditBatch = (reqId, phase, batchId) => {
    setDialog({ title: `MODIFICAR LOTE`, text: `El lote volverá al formulario para su edición y el inventario se ajustará temporalmente. ¿Continuar?`, type: 'confirm', onConfirm: async () => {
        const req = (requirements || []).find(r => r?.id === reqId); if(!req) return; let currentPhase = { ...(req?.production?.[phase] || {}) }; const bIdx = (currentPhase.batches || []).findIndex(b => b?.id === batchId);
        if (bIdx >= 0) { 
            const batch = currentPhase.batches[bIdx]; 
            const restoreForm = { ...initialPhaseForm, date: batch?.date || getTodayDate(), producedKg: batch?.producedKg || '', mermaKg: batch?.mermaKg || '', insumos: batch?.insumos || [] };
            if(phase === 'extrusion' && batch?.techParams) { restoreForm.operadorExt = batch.techParams.operador || ''; restoreForm.tratado = batch.techParams.tratado || ''; restoreForm.motorExt = batch.techParams.motor || ''; restoreForm.ventilador = batch.techParams.ventilador || ''; restoreForm.jalador = batch.techParams.jalador || ''; restoreForm.zona1 = batch.techParams.zonas?.[0] || ''; restoreForm.zona2 = batch.techParams.zonas?.[1] || ''; restoreForm.zona3 = batch.techParams.zonas?.[2] || ''; restoreForm.zona4 = batch.techParams.zonas?.[3] || ''; restoreForm.zona5 = batch.techParams.zonas?.[4] || ''; restoreForm.zona6 = batch.techParams.zonas?.[5] || ''; restoreForm.cabezalA = batch.techParams.cabezalA || ''; restoreForm.cabezalB = batch.techParams.cabezalB || ''; }
            if(phase === 'impresion' && batch?.techParams) { restoreForm.operadorImp = batch.techParams.operador || ''; restoreForm.kgRecibidosImp = batch.techParams.kgRecibidos || ''; restoreForm.cantColores = batch.techParams.cantColores || ''; restoreForm.relacionImp = batch.techParams.relacion || ''; restoreForm.motorImp = batch.techParams.motor || ''; restoreForm.tensores = batch.techParams.tensores || ''; restoreForm.tempImp = batch.techParams.temp || ''; restoreForm.solvente = batch.techParams.solvente || ''; }
            if(phase === 'sellado' && batch?.techParams) { restoreForm.operadorSel = batch.techParams.operador || ''; restoreForm.kgRecibidosSel = batch.techParams.kgRecibidos || ''; restoreForm.impresa = batch.techParams.impresa || 'NO'; restoreForm.tipoSello = batch.techParams.tipoSello || 'Sello FC'; restoreForm.tempCabezalA = batch.techParams.tempCabezalA || ''; restoreForm.tempCabezalB = batch.techParams.tempCabezalB || ''; restoreForm.tempPisoA = batch.techParams.tempPisoA || ''; restoreForm.tempPisoB = batch.techParams.tempPisoB || ''; restoreForm.velServo = batch.techParams.velServo || ''; restoreForm.millaresProd = batch.techParams.millares || ''; restoreForm.troquelSel = batch.techParams.troquel || ''; }
            setPhaseForm(restoreForm);
            const fbBatch = writeBatch(db); for (let ing of (batch?.insumos || [])) { const item = (inventory || []).find(i => i?.id === ing?.id); if (item) fbBatch.update(getDocRef('inventory', item.id), { stock: (item?.stock || 0) + (ing?.qty || 0) }); } await fbBatch.commit(); 
            currentPhase.batches.splice(bIdx, 1); 
        }
        await updateDoc(getDocRef('requirements', reqId), { production: { ...(req?.production || {}), [phase]: currentPhase } });
    }});
  };

  const handleReopenPhase = async (reqId, phase) => {
    setDialog({ title: `REABRIR FASE`, text: `¿Seguro que desea reabrir esta fase para editar o añadir más lotes?`, type: 'confirm', onConfirm: async () => {
        const req = (requirements || []).find(r => r.id === reqId); if(!req) return;
        let currentPhase = { ...(req.production?.[phase] || {}) }; currentPhase.isClosed = false;
        let newStatus = req.status; if (req.status === 'COMPLETADO') newStatus = 'EN PROCESO';
        await updateDoc(getDocRef('requirements', reqId), { production: { ...(req.production || {}), [phase]: currentPhase }, status: newStatus });
        setDialog({title: 'Éxito', text: 'La fase ha sido reabierta.', type: 'alert'});
    }});
  };

  // ============================================================================
  // --- LÓGICA CALCULADORA (SIMULADOR OP INVERSO) ---
  // ============================================================================
  const handleResetCalc = () => { setCalcInputs({...initialCalcInputs, cantidadSolicitada: ''}); };
  const handleCalcChange = (field, value) => setCalcInputs({ ...calcInputs, [field]: parseNum(value) });
  const updateCalcIng = (id, field, value) => setCalcInputs({ ...calcInputs, ingredientes: (calcInputs?.ingredientes || []).map(ing => ing?.id === id ? { ...ing, [field]: field === 'nombre' ? value : parseNum(value) } : ing) });
  const addCalcIng = () => setCalcInputs({ ...calcInputs, ingredientes: [...(calcInputs?.ingredientes || []), { id: Date.now(), nombre: '', pct: 0, costo: 0 }] });
  const removeCalcIng = (id) => setCalcInputs({ ...calcInputs, ingredientes: (calcInputs?.ingredientes || []).filter(i => i?.id !== id) });

  const simW = parseNum(calcInputs?.ancho); 
  const simL = parseNum(calcInputs?.largo); 
  const simM = parseNum(calcInputs?.micras); 
  const simFu = parseNum(calcInputs?.fuelles); 
  const isBolsas = calcInputs?.tipoProducto === 'BOLSAS';
  
  let simPesoMillar = 0; 
  if (isBolsas) { simPesoMillar = (simW + simFu) * simL * simM; }
  
  const inputCantidadSolicitada = parseNum(calcInputs?.cantidadSolicitada) || 0; 
  const calcKilosNetos = isBolsas ? (inputCantidadSolicitada * simPesoMillar) : inputCantidadSolicitada;
  
  const mermaPorc = parseNum(calcInputs?.mermaGlobalPorc) || 5;
  const calcTotalMezcla = (calcKilosNetos > 0 && mermaPorc < 100) ? (calcKilosNetos / (1 - (mermaPorc / 100))) : calcKilosNetos;
  const calcMermaGlobalKg = calcTotalMezcla - calcKilosNetos;

  let calcCostoMezclaPreparada = 0;
  const calcIngredientesProcesados = (calcInputs?.ingredientes || []).map(ing => {
    const kg = ((ing?.pct || 0) / 100) * calcTotalMezcla; 
    const totalCost = kg * (ing?.costo || 0); 
    calcCostoMezclaPreparada += totalCost;
    const invItem = (inventory || []).find(i => i?.id === ing?.nombre); 
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

  // ============================================================================
  // LÓGICA DE PROYECCIÓN DE MP Y ORDEN DE COMPRA
  // ============================================================================
  const generateProjectionData = () => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentMovs = invMovements.filter(m => m.type === 'SALIDA' && m.timestamp >= thirtyDaysAgo);
    const pendingReqs = invRequisitions.filter(r => r.status === 'PENDIENTE');

    return (inventory || []).filter(i => i.category === 'Materia Prima').map(mp => {
       const consumedIn30Days = recentMovs.filter(m => m.itemId === mp.id).reduce((sum, m) => sum + parseNum(m.qty), 0);
       const dailyAvg = consumedIn30Days / 30;
       
       let committedStock = 0;
       pendingReqs.forEach(req => {
            const item = (req.items || []).find(i => i.id === mp.id);
            if (item) committedStock += parseNum(item.qty);
       });

       const availableReal = (mp.stock || 0) - committedStock;
       const daysRemaining = dailyAvg > 0 ? availableReal / dailyAvg : 999;
       
       const isCritical = daysRemaining <= 30 || availableReal <= 0;
       const suggestOrder = isCritical ? Math.ceil(Math.abs(availableReal < 0 ? availableReal : 0) + (dailyAvg * 45)) : 0; 

       return { ...mp, dailyAvg, daysRemaining, committedStock, availableReal, suggestOrder, isCritical };
    });
  };

  // ============================================================================
  // FUNCIONES DE RENDERIZADO MODULARES CORREGIDAS
  // ============================================================================
  const renderWorkOrder = () => {
    const req = (requirements || []).find(r => r?.id === showWorkOrder);
    if (!req) return null;
    return (
      <div id="pdf-content" className="bg-white p-12 min-h-0 text-black bg-white rounded-3xl border border-gray-200 shadow-sm animate-in zoom-in-95">
        <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf">
          <button onClick={() => setShowWorkOrder(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200 transition-colors">Volver</button>
          <button onClick={() => handleExportPDF(`Orden_Trabajo_${req.id}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800 transition-colors"><Printer size={16} /> Exportar PDF</button>
        </div>
        <div className="hidden pdf-header mb-6"><ReportHeader /></div>
        <div className="text-center my-6"><span className="text-2xl font-black uppercase border-b-4 border-orange-500 pb-2">ORDEN DE TRABAJO N° {String(req.id).replace('OP-', '').padStart(5, '0')}</span></div>
        <div className="grid grid-cols-2 gap-4 mb-4 font-bold text-sm uppercase"><div><p>CLIENTE: {req.client}</p><p className="mt-1">VENDEDOR: {req.vendedor || 'N/A'}</p></div><div className="text-right"><p>FECHA EMISIÓN: {req.fecha}</p><p className="mt-1">TIPO: {req.tipoProducto}</p></div></div>
        <div className="border-2 border-black p-4 grid grid-cols-4 gap-4 text-center text-xs font-black uppercase mb-4 rounded-2xl"><div>ANCHO<br/><span className="text-sm text-blue-600">{req.ancho} CM</span></div><div>FUELLES<br/><span className="text-sm text-blue-600">{req.fuelles || '0'} CM</span></div><div>LARGO<br/><span className="text-sm text-blue-600">{req.largo} CM</span></div><div>MICRAS<br/><span className="text-sm text-blue-600">{req.micras}</span></div></div>
        <div className="bg-gray-50 p-4 flex justify-between border-2 border-black rounded-2xl mb-4">
           <div><span className="block text-[10px] font-black uppercase text-gray-600">Cant. Solicitada</span><span className="text-xl font-black text-blue-600">{formatNum(req.cantidad)} {req.presentacion}</span></div>
           <div><span className="block text-[10px] font-black uppercase text-gray-600">Peso Millar Estimado</span><span className="text-xl font-black">{req.pesoMillar || 'N/A'}</span></div>
           <div className="text-right"><span className="block text-[10px] font-black uppercase text-gray-600">Carga Total a Planta</span><span className="text-3xl font-black text-orange-600">{formatNum(req.requestedKg)} KG</span></div>
        </div>
        <div className="mt-16 grid grid-cols-2 gap-24 text-center font-black uppercase text-xs">
           <div className="border-t-2 border-black mx-auto pt-2 w-full">Firma Jefe Producción</div>
           <div className="border-t-2 border-black mx-auto pt-2 w-full">Firma Operador Asignado</div>
        </div>
      </div>
    );
  };

  const renderFiniquito = () => {
     return (
       <div className="bg-white p-16 text-center rounded-3xl border border-gray-200 shadow-sm animate-in zoom-in-95">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black uppercase mb-4 text-black tracking-tighter">Operación Completada y Cerrada</h2>
          <p className="text-gray-500 font-bold mb-8 text-sm uppercase max-w-lg mx-auto">Para visualizar el Súper Finiquito Financiero (con análisis de mermas, materia prima y rentabilidad real), dirígete al módulo de <span className="text-orange-500">Costos &gt; Súper Finiquito (OP)</span>.</p>
          <button onClick={() => setShowFiniquito(null)} className="bg-black text-white px-10 py-4 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-gray-800 transition-all">VOLVER AL HISTORIAL DE PRODUCCIÓN</button>
       </div>
     );
  };

  const renderPhaseReport = () => {
     return (
        <div className="bg-white p-12 text-center rounded-3xl border border-gray-200 shadow-sm animate-in zoom-in-95">
          <FileText size={64} className="text-blue-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black uppercase mb-4 text-black tracking-tighter">Reporte de Fase Interno</h2>
          <p className="text-gray-500 font-bold mb-8 text-sm uppercase">Este reporte detallado se generará próximamente en futuras actualizaciones del módulo.</p>
          <button onClick={() => setShowPhaseReport(null)} className="bg-black text-white px-10 py-4 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-gray-800 transition-all">VOLVER A PRODUCCIÓN</button>
       </div>
     );
  };

  // ============================================================================
  // RENDERIZADO DE MÓDULOS
  // ============================================================================
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

  const renderPurchaseOrder = () => {
    const proyeccionData = generateProjectionData().filter(mp => mp.suggestOrder > 0);

    return (
      <div id="pdf-content" className="bg-white p-12 print:p-6 min-h-screen text-black shadow-none border-0 bg-white">
        <style>{`@media print { @page { size: portrait; margin: 5mm; } }`}</style>
        
        <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf bg-gray-50 p-4 rounded-xl border border-gray-200">
          <button onClick={() => setShowPurchaseOrder(false)} className="text-gray-700 font-black text-xs uppercase bg-white border border-gray-300 px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-all">VOLVER</button>
          <button onClick={() => handleExportPDF(`Orden_Compra_Procura_${getTodayDate()}`, false)} className="bg-black text-white px-8 py-2.5 rounded-xl font-black flex items-center gap-2 text-[10px] uppercase shadow-lg hover:bg-gray-800 transition-all"><Printer size={16} /> EXPORTAR PDF</button>
        </div>
        
        <div className="hidden pdf-header mb-6"><ReportHeader /></div>

        <div className="text-center my-8">
           <h2 className="text-2xl font-black uppercase border-b-4 border-orange-500 pb-2 inline-block">ORDEN DE COMPRA SUGERIDA</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm uppercase font-bold border-2 border-black p-4 rounded-2xl">
           <div>
              <p className="mb-2">DEPARTAMENTO ORIGEN: <span className="font-black text-orange-600">PRODUCCIÓN / PLANTA</span></p>
              <p>SOLICITANTE: <span className="font-black text-gray-700">{appUser?.name || 'ADMINISTRADOR'}</span></p>
           </div>
           <div className="text-right">
              <p className="mb-2">FECHA DE EMISIÓN: <span className="font-black text-gray-700">{getTodayDate()}</span></p>
              <p>DIRIGIDO A: <span className="font-black text-orange-600">DEPARTAMENTO DE PROCURA</span></p>
           </div>
        </div>

        <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertTriangle size={24} className="text-red-600 flex-shrink-0"/>
          <p className="text-[10px] font-black text-red-800 uppercase tracking-widest leading-relaxed">
            Alerta de Inventario Crítico: Los siguientes insumos tienen un tiempo de autonomía igual o menor al tiempo de reposición del proveedor (30 Días). Se ha calculado la cantidad necesaria para cubrir el tránsito más un margen de seguridad.
          </p>
        </div>

        <table className="w-full border-collapse border-2 border-black mb-6">
           <thead className="bg-gray-200">
              <tr>
                 <th className="p-3 border-b border-black text-left text-xs uppercase font-black">CÓDIGO / INSUMO</th>
                 <th className="p-3 border-b border-black text-center text-xs uppercase font-black">STOCK RESTANTE</th>
                 <th className="p-3 border-b border-black text-center text-xs uppercase font-black text-red-600">AUTONOMÍA</th>
                 <th className="p-3 border-b border-black text-center text-xs uppercase font-black bg-orange-100">CANT. A PEDIR</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-300">
              {proyeccionData.map((mp, i) => (
                 <tr key={i}>
                    <td className="p-3 border-r border-black font-bold text-sm uppercase">
                       {mp.desc}<br/><span className="text-[10px] text-gray-500 font-black">{mp.id}</span>
                    </td>
                    <td className="p-3 border-r border-black text-center font-black">{formatNum(mp.availableReal)} kg</td>
                    <td className="p-3 border-r border-black text-center font-black text-red-600">{formatNum(mp.daysRemaining)} DÍAS</td>
                    <td className="p-3 text-center font-black text-xl bg-orange-50 text-orange-700">{formatNum(mp.suggestOrder)} <span className="text-sm">KG</span></td>
                 </tr>
              ))}
              {proyeccionData.length === 0 && (
                 <tr><td colSpan="4" className="p-8 text-center font-black uppercase text-gray-400 tracking-widest">El inventario se encuentra en niveles óptimos.</td></tr>
              )}
           </tbody>
        </table>

        <div className="mt-32 grid grid-cols-3 gap-10 text-center font-black uppercase text-[10px]">
           <div className="border-t-2 border-black pt-2 mx-4">SOLICITADO POR<br/>(PLANTA)</div>
           <div className="border-t-2 border-black pt-2 mx-4">AUTORIZADO POR<br/>(GERENCIA)</div>
           <div className="border-t-2 border-black pt-2 mx-4">RECIBIDO POR<br/>(PROCURA)</div>
        </div>
      </div>
    );
  };

  const renderHome = () => {
    const hasPerm = (module) => appUser?.permissions ? appUser.permissions[module] : appUser?.role === 'Master';
    
    return (
      <div className="w-full max-w-6xl mx-auto py-8 animate-in fade-in">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-black uppercase tracking-widest">Panel Principal ERP</h2>
          <div className="w-24 h-1.5 bg-orange-500 mx-auto mt-4 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          {hasPerm('ventas') && (
             <button onClick={() => { clearAllReports(); setActiveTab('ventas'); setVentasView('facturacion'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"><Users size={40} className="text-orange-500 mb-4" /><h3 className="text-xl font-black text-white uppercase">Ventas y Facturación</h3><p className="text-xs text-gray-400 mt-2">Directorio, OP y Facturación.</p></button>
          )}
          {hasPerm('produccion') && (
             <button onClick={() => { clearAllReports(); setActiveTab('produccion'); setProdView('calculadora'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"><Factory size={40} className="text-orange-500 mb-4" /><h3 className="text-xl font-black text-white uppercase">Producción Planta</h3><p className="text-xs text-gray-400 mt-2">Control de Fases y Reportes.</p></button>
          )}
          {hasPerm('inventario') && (
             <button onClick={() => { clearAllReports(); setActiveTab('inventario'); setInvView('catalogo'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"><Package size={40} className="text-orange-500 mb-4" /><h3 className="text-xl font-black text-white uppercase">Control Inventario</h3><p className="text-xs text-gray-400 mt-2">Art. 177 LISLR, Movimientos y Kardex.</p></button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mt-8">
          {hasPerm('costos') && (
             <button onClick={() => { clearAllReports(); setActiveTab('costos'); setCostosView('dashboard'); }} className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md"><BarChart3 size={40} className="text-gray-400 mb-4" /><h3 className="text-xl font-black text-gray-800 uppercase">Reportes de Costo</h3><p className="text-xs text-gray-400 mt-2">Análisis de Utilidad y Rentabilidad.</p></button>
          )}
          {hasPerm('configuracion') && (
             <button onClick={() => { clearAllReports(); setActiveTab('configuracion'); }} className="group bg-white border-l-4 border-gray-300 rounded-3xl p-10 text-left hover:bg-gray-50 transition-all shadow-md"><Settings2 size={40} className="text-gray-400 mb-4" /><h3 className="text-xl font-black text-gray-800 uppercase">Configuración</h3><p className="text-xs text-gray-400 mt-2">Usuarios y Permisos.</p></button>
          )}
        </div>
      </div>
    );
  };

  const renderInventoryReports = () => {
     let filteredData = [];
     if (invReportType === 'entradas') filteredData = invMovements.filter(m => m?.type === 'ENTRADA');
     if (invReportType === 'salidas') filteredData = invMovements.filter(m => m?.type === 'SALIDA' || m?.type === 'AUTOCONSUMO');
     if (invReportType === 'ajustes') filteredData = invMovements.filter(m => m && m.type && String(m.type).includes('AJUSTE'));
     
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
                         <td className="py-3 px-4 text-right font-black print:border-black print:text-black">${formatNum(m.totalValue)}</td>
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
  };

  const renderInventoryModule = () => {
    if (showMovementReceipt) {
      const m = showMovementReceipt;
      return (
        <div id="pdf-content" className="bg-white p-12 min-h-0 text-black bg-white">
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
             <tbody><tr><td className="p-4 border-r border-black font-black text-center text-lg">{formatNum(m.qty)}</td><td className="p-4 border-r border-black font-bold text-center">${formatNum(m.cost)}</td><td className="p-4 text-center font-bold text-lg">${formatNum(m.totalValue)}</td></tr></tbody>
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

    if (invView === 'reportes_mod') return renderInventoryReports();

    const searchInvUpper = (invSearchTerm || '').toUpperCase();
    const filteredInventory = (inventory || []).filter(i => (i?.id || '').includes(searchInvUpper) || (i?.desc || '').includes(searchInvUpper));
    const filteredMovements = (invMovements || []).filter(m => (m?.itemId || '').toUpperCase().includes(searchInvUpper) || (m?.itemName || '').toUpperCase().includes(searchInvUpper) || (m?.reference || '').toUpperCase().includes(searchInvUpper));
    const reporte177Data = generateReport177Data();
    let grandInitialTotal = 0; let grandEntradasTotal = 0; let grandSalidasTotal = 0; let grandFinalTotal = 0;

    return (
      <div className="animate-in fade-in space-y-6">
        {invView === 'requisiciones' && (
           <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><ClipboardList className="text-orange-500" size={24}/> Requisiciones de Planta a Almacén</h2>
               <button onClick={() => handleExportExcel('req-almacen-table', 'Requisiciones_Almacen')} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXPORTAR EXCEL</button>
             </div>
             <div className="p-8">
               <div className="overflow-x-auto rounded-xl border border-gray-200">
                 <table id="req-almacen-table" className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-gray-100 border-b-2 border-gray-200">
                     <tr className="uppercase font-black text-[10px] tracking-widest text-gray-500">
                       <th className="py-4 px-4 border-r">OP / Fase</th>
                       <th className="py-4 px-4 border-r">Fecha / Solicitante</th>
                       <th className="py-4 px-4 border-r">Insumos Solicitados</th>
                       <th className="py-4 px-4 border-r text-center">Estado</th>
                       <th className="py-4 px-4 text-center">Acciones (Almacén)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-black">
                     {(invRequisitions || []).map(r => (
                       <tr key={r.id} className="hover:bg-gray-50">
                         <td className="py-4 px-4 font-black border-r text-orange-600 text-lg">
                           {String(r.opId).replace('OP-', '').padStart(5, '0')}<br/>
                           <span className="text-[10px] text-gray-500 block text-black">{r.phase}</span>
                         </td>
                         <td className="py-4 px-4 border-r font-bold">
                           {r.date}<br/>
                           <span className="text-[10px] text-gray-400 font-bold">{r.user}</span>
                         </td>
                         <td className="py-4 px-4 border-r">
                           <ul className="text-xs space-y-1">
                             {(r.items || []).map((it, idx) => (
                               <li key={idx}><span className="font-black bg-gray-100 px-2 rounded">{it.qty}</span> x {(inventory || []).find(inv=>inv.id===it.id)?.desc || it.id}</li>
                             ))}
                           </ul>
                         </td>
                         <td className="py-4 px-4 text-center border-r">
                           {r.status === 'PENDIENTE' && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-orange-200">PENDIENTE</span>}
                           {r.status === 'APROBADO' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-green-200">APROBADO</span>}
                           {r.status === 'RECHAZADO' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-200">RECHAZADO</span>}
                         </td>
                         <td className="py-4 px-4 text-center">
                           {r.status === 'PENDIENTE' ? (
                             <div className="flex justify-center gap-2">
                               <button onClick={() => setReqToApprove(JSON.parse(JSON.stringify(r)))} className="bg-black text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-sm hover:bg-slate-800 transition-all flex items-center gap-1"><CheckCircle2 size={14}/> GESTIONAR</button>
                               <button onClick={() => handleRejectRequisition(r.id)} className="bg-red-50 text-red-500 px-3 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                             </div>
                           ) : (
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Procesado</span>
                           )}
                         </td>
                       </tr>
                     ))}
                     {invRequisitions.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin Requisiciones Registradas</td></tr>}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
        )}

        {reqToApprove && (
           <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-10 max-w-2xl w-full shadow-2xl border-t-8 border-orange-500 transform animate-in zoom-in-95">
                 <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-xl font-black uppercase text-black">Aprobar Descargo (OP: {reqToApprove.opId})</h2>
                    <button onClick={()=>setReqToApprove(null)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                 </div>
                 <p className="text-xs font-bold text-gray-500 mb-6 uppercase">Verifique o modifique las cantidades a despachar. Al aprobar, se descontará del inventario (recalculando costo) y se cargará el costo a la producción de la fase <span className="text-black">{reqToApprove.phase}</span>.</p>
                 <form onSubmit={submitApproveRequisition}>
                    <table className="w-full text-left text-sm mb-8 border-collapse">
                       <thead className="bg-gray-100 text-[10px] font-black uppercase text-gray-500 tracking-widest border-b-2 border-gray-200">
                          <tr><th className="p-3">Insumo / Descripción</th><th className="p-3 text-center">Disp. Almacén</th><th className="p-3 text-center">Cant. Aprobada (Descargo)</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {reqToApprove.items.map((it, idx) => {
                             const invItem = (inventory || []).find(inv => inv.id === it.id);
                             return (
                             <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3 font-black text-black text-xs">{invItem?.desc || it.id}<br/><span className="text-[10px] font-bold text-gray-400">{it.id}</span></td>
                                <td className="p-3 text-center font-black text-blue-600">{formatNum(invItem?.stock)}</td>
                                <td className="p-3">
                                   <input type="number" step="0.01" value={it.qty} onChange={e => {
                                      const newItems = [...reqToApprove.items];
                                      newItems[idx].qty = parseNum(e.target.value);
                                      setReqToApprove({...reqToApprove, items: newItems});
                                   }} className="border-2 border-gray-200 p-3 rounded-xl w-full text-center font-black outline-none focus:border-orange-500 text-lg text-black" />
                                </td>
                             </tr>
                          )})}
                       </tbody>
                    </table>
                    <div className="flex gap-4">
                       <button type="button" onClick={()=>setReqToApprove(null)} className="flex-1 bg-gray-100 text-gray-700 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-colors">CANCELAR</button>
                       <button type="submit" className="flex-1 bg-black text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"><CheckCircle2 size={16}/> PROCESAR DESCARGO</button>
                    </div>
                 </form>
              </div>
           </div>
        )}

        {invView === 'catalogo' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Box className="text-orange-500" size={24}/> Lista de Productos (Catálogo)</h2>
               <div className="flex gap-2">
                 <button onClick={() => handleExportExcel('catalogo-table', 'Catalogo_Inventario')} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXCEL</button>
                 <button onClick={() => handleExportPDF('Catalogo_Inventario', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> PDF</button>
               </div>
            </div>
            <div data-html2canvas-ignore="true" className="p-8 bg-gray-50/50 border-b border-gray-200 no-pdf">
               <form onSubmit={handleSaveInvItem} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                 <h3 className="text-sm font-black uppercase text-black border-b border-gray-100 pb-3 mb-4 tracking-widest">{editingInvId ? 'Modificar Artículo' : 'Nuevo Artículo / Actualizar'}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                   <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Código ID</label>
                     <input type="text" required disabled={!!editingInvId} value={newInvItemForm.id} onChange={e=>setNewInvItemForm({...newInvItemForm, id: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-3 font-black text-xs uppercase outline-none transition-colors" placeholder="EJ: MP-001" />
                   </div>
                   <div className="md:col-span-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Descripción</label>
                     <input type="text" required value={newInvItemForm.desc} onChange={e=>setNewInvItemForm({...newInvItemForm, desc: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-3 font-black text-xs uppercase outline-none transition-colors" placeholder="DESCRIPCIÓN DEL INSUMO" />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Categoría</label>
                     <select value={newInvItemForm.category} onChange={e=>setNewInvItemForm({...newInvItemForm, category: e.target.value})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-3 font-black text-xs uppercase outline-none transition-colors">
                        <option value="Materia Prima">Materia Prima</option>
                        <option value="Pigmentos">Pigmentos</option>
                        <option value="Tintas">Tintas</option>
                        <option value="Químicos">Químicos</option>
                        <option value="Consumibles">Consumibles</option>
                        <option value="Herramientas">Herramientas</option>
                        <option value="Seguridad Industrial">Seguridad Industrial</option>
                        <option value="Otros">Otros</option>
                     </select>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Costo Promedio ($)</label>
                       <input type="number" step="0.01" required value={newInvItemForm.cost} onChange={e=>setNewInvItemForm({...newInvItemForm, cost: e.target.value})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-3 font-black text-xs outline-none transition-colors text-center" />
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">UM</label>
                       <select value={newInvItemForm.unit} onChange={e=>setNewInvItemForm({...newInvItemForm, unit: e.target.value})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-3 font-black text-xs uppercase outline-none transition-colors">
                          <option value="kg">KG</option><option value="lts">LTS</option><option value="und">UND</option><option value="par">PAR</option><option value="saco">SACO</option>
                       </select>
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                   <div className="w-1/3">
                      <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Carga Inicial (Stock)</label>
                      <input type="number" step="0.01" required value={newInvItemForm.stock} onChange={e=>setNewInvItemForm({...newInvItemForm, stock: e.target.value})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-3 font-black text-xs outline-none transition-colors text-center text-blue-600" />
                   </div>
                   <div className="flex-1 text-right flex gap-2 justify-end">
                      {editingInvId && <button type="button" onClick={() => {setEditingInvId(null); setNewInvItemForm(initialInvItemForm);}} className="bg-gray-200 text-gray-700 px-6 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-gray-300 transition-all">CANCELAR</button>}
                      <button type="submit" className="bg-black text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-gray-800 transition-all">GUARDAR EN CATÁLOGO</button>
                   </div>
                 </div>
               </form>
            </div>
            <div id="pdf-content" className="p-8 print:p-0 bg-white">
               <div className="hidden pdf-header mb-8">
                 <ReportHeader />
                 <h1 className="text-2xl font-black text-black uppercase border-b-4 border-orange-500 pb-2">Catálogo de Inventario y Existencias</h1>
                 <p className="text-sm font-bold text-gray-500 uppercase mt-2">FECHA DE EMISIÓN: {getTodayDate()}</p>
               </div>

               <div data-html2canvas-ignore="true" className="relative max-w-2xl mb-8 no-pdf">
                 <Search className="absolute left-4 top-4 text-gray-400" size={18} />
                 <input type="text" placeholder="BUSCAR INSUMO..." value={invSearchTerm} onChange={e=>setInvSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white" />
               </div>
               <div className="overflow-x-auto rounded-xl print:border print:border-black print:rounded-none">
                 <table id="catalogo-table" className="w-full text-left whitespace-nowrap">
                   <thead className="bg-gray-100 border-b-2 border-gray-200 print:border-black">
                     <tr className="uppercase font-black text-gray-800 text-[10px] tracking-widest print:text-black">
                       <th className="py-4 px-4">Código</th>
                       <th className="py-4 px-4">Descripción / Categoría</th>
                       <th className="py-4 px-4 text-center">Costo Unit. Promedio</th>
                       <th className="py-4 px-4 text-right">Stock Actual</th>
                       <th className="py-4 px-4 text-center no-pdf">Acciones</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 print:divide-black">
                     {filteredInventory.map(inv => (
                       <tr key={inv?.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="py-4 px-4 font-black text-orange-600 text-xs print:text-black">{inv?.id}</td>
                          <td className="py-4 px-4 font-black uppercase text-xs text-black">{inv?.desc}<span className="block text-[9px] font-bold text-gray-500 mt-1 print:text-black">{inv?.category}</span></td>
                          <td className="py-4 px-4 text-center font-bold text-gray-600 print:text-black">${formatNum(inv?.cost)}</td>
                          <td className="py-4 px-4 text-right font-black text-blue-600 text-lg print:text-black">{formatNum(inv?.stock)} <span className="text-xs text-gray-400 print:text-black">{inv?.unit}</span></td>
                          <td className="py-4 px-4 text-center no-pdf">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => startEditInvItem(inv)} className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-colors"><Edit size={16}/></button>
                              <button onClick={()=>handleDeleteInvItem(inv?.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </td>
                       </tr>
                     ))}
                     {filteredInventory.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin artículos registrados</td></tr>}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {['cargo', 'descargo', 'ajuste'].includes(invView) && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter">
                  <ArrowRightLeft className="text-orange-500" size={24}/> 
                  {invView === 'cargo' && 'Registrar Cargo (Entrada)'}
                  {invView === 'descargo' && 'Registrar Descargo (Salida)'}
                  {invView === 'ajuste' && 'Registrar Ajuste'}
               </h2>
            </div>
            <div className="p-8">
               <form onSubmit={handleSaveMovement} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl space-y-6 max-w-4xl mx-auto">
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center mb-6">
                     <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Atención</p>
                     <p className="text-xs font-bold text-orange-600 uppercase">Las entradas actualizarán el Costo Promedio del catálogo y el Kardex automáticamente.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Tipo de Operación</label>
                       <select required value={newMovementForm.type} onChange={e=>setNewMovementForm({...newMovementForm, type: e.target.value})} className={`w-full border-2 rounded-xl p-4 font-black text-sm uppercase outline-none transition-colors ${newMovementForm.type === 'ENTRADA' || newMovementForm.type === 'AJUSTE (POSITIVO)' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                          {invView === 'cargo' && <option value="ENTRADA">ENTRADA (COMPRA/PRODUCCIÓN)</option>}
                          {invView === 'descargo' && <>
                             <option value="SALIDA">SALIDA (VENTA/DESPACHO)</option>
                             <option value="AUTOCONSUMO">AUTOCONSUMO (USO INTERNO)</option>
                          </>}
                          {invView === 'ajuste' && <>
                             <option value="AJUSTE (POSITIVO)">AJUSTE FÍSICO (+ SOBRANTE)</option>
                             <option value="AJUSTE (NEGATIVO)">AJUSTE FÍSICO (- FALTANTE/MERMA)</option>
                          </>}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Fecha</label>
                       <input type="date" required value={newMovementForm.date} onChange={e=>setNewMovementForm({...newMovementForm, date: e.target.value})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black text-sm outline-none transition-colors text-black" />
                     </div>
                     
                     <div className="md:col-span-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Ítem del Inventario</label>
                       <select required value={newMovementForm.itemId} onChange={e=>{
                          const item = (inventory || []).find(i=>i?.id===e.target.value);
                          setNewMovementForm({...newMovementForm, itemId: e.target.value, cost: item ? item.cost : ''});
                       }} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black uppercase text-xs outline-none transition-colors">
                          <option value="">Seleccione...</option>
                          {(inventory || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc} (Stock: {i?.stock} {i?.unit} | Costo Prom: ${formatNum(i?.cost)})</option>)}
                       </select>
                     </div>

                     <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Cantidad</label>
                       <input type="number" step="0.01" required value={newMovementForm.qty} onChange={e=>setNewMovementForm({...newMovementForm, qty: e.target.value})} placeholder="0.00" className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black text-lg outline-none transition-colors text-center text-black" />
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">{invView === 'cargo' ? 'Nuevo Costo Unitario ($) Compra' : 'Costo Unitario Promedio Actual ($)'}</label>
                       <input type="number" step="0.01" value={newMovementForm.cost} onChange={e=>setNewMovementForm({...newMovementForm, cost: e.target.value})} disabled={invView !== 'cargo'} placeholder="0.00" className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black text-lg outline-none transition-colors text-center text-black disabled:opacity-60" />
                     </div>

                     <div className="md:col-span-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Documento Referencia (Factura, OP, Guía)</label>
                       <input type="text" required value={newMovementForm.reference} onChange={e=>setNewMovementForm({...newMovementForm, reference: e.target.value.toUpperCase()})} placeholder="EJ: FACT-001 o OP-005" className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black text-xs uppercase outline-none transition-colors" />
                     </div>
                     <div className="md:col-span-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Observaciones o Notas</label>
                       <input type="text" value={newMovementForm.notes} onChange={e=>setNewMovementForm({...newMovementForm, notes: e.target.value.toUpperCase()})} placeholder="Opcional" className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black text-xs uppercase outline-none transition-colors" />
                     </div>
                  </div>

                  <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                     <button type="submit" className="bg-black text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-gray-800 transition-all tracking-widest flex items-center gap-2"><CheckCircle2 size={18}/> PROCESAR MOVIMIENTO</button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {invView === 'kardex' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><History className="text-orange-500" size={24}/> Kardex / Historial de Movimientos</h2>
               <div className="flex gap-2">
                 <button onClick={() => handleExportExcel('kardex-table', 'Kardex_Inventario')} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXCEL</button>
                 <button onClick={() => handleExportPDF('Kardex_Inventario', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> PDF</button>
               </div>
            </div>

            <div className="p-8 print:p-0 bg-white" id="pdf-content">
               <div className="hidden pdf-header mb-8">
                 <ReportHeader />
                 <h1 className="text-2xl font-black text-black uppercase border-b-4 border-orange-500 pb-2">REPORTE DE MOVIMIENTOS POR UNIDADES</h1>
                 <p className="text-sm font-bold text-gray-500 uppercase mt-2">AL: {getTodayDate()}</p>
               </div>

               <div data-html2canvas-ignore="true" className="relative max-w-2xl mb-8 no-pdf">
                 <Search className="absolute left-4 top-4 text-gray-400" size={18} />
                 <input type="text" placeholder="BUSCAR POR CÓDIGO, REFERENCIA O TIPO..." value={invSearchTerm} onChange={e=>setInvSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white" />
               </div>

               <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-black print:rounded-none">
                 <table id="kardex-table" className="w-full text-left whitespace-nowrap text-xs">
                   <thead className="bg-gray-100 border-b-2 border-gray-300 print:border-black">
                     <tr className="uppercase font-black text-[10px] tracking-widest text-black">
                       <th className="py-3 px-4 border-r print:border-black">Fecha / Usuario</th>
                       <th className="py-3 px-4 border-r print:border-black">Referencia / Notas</th>
                       <th className="py-3 px-4 border-r print:border-black">Tipo Operación</th>
                       <th className="py-3 px-4 border-r print:border-black">Ítem / Código</th>
                       <th className="py-3 px-4 text-center border-r print:border-black">Cant.</th>
                       <th className="py-3 px-4 text-right border-r print:border-black">Costo U.</th>
                       <th className="py-3 px-4 text-right border-r print:border-black">Valor Total</th>
                       <th className="py-3 px-4 text-center no-pdf">Acciones</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-black print:divide-black">
                     {filteredMovements.map(m => {
                        const isPos = m?.type === 'ENTRADA' || m?.type === 'AJUSTE (POSITIVO)';
                        return (
                         <tr key={m?.id} className="hover:bg-gray-50 transition-colors">
                           <td className="py-3 px-4 font-bold border-r print:border-black">{m?.date}<br/><span className="text-[9px] text-gray-500 print:text-black">{m?.user}</span></td>
                           <td className="py-3 px-4 font-black border-r print:border-black">{m?.reference}<br/><span className="text-[9px] font-bold text-gray-400 print:text-black">{m?.notes}</span></td>
                           <td className="py-3 px-4 border-r print:border-black"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isPos ? 'bg-green-100 text-green-700 print:border print:border-black print:bg-transparent print:text-black' : 'bg-red-100 text-red-700 print:border print:border-black print:bg-transparent print:text-black'}`}>{m?.type}</span></td>
                           <td className="py-3 px-4 font-bold border-r print:border-black">{m?.itemId}<br/><span className="text-[9px] font-black print:text-black">{m?.itemName}</span></td>
                           <td className={`py-3 px-4 text-center font-black text-sm border-r print:border-black ${isPos ? 'text-green-600' : 'text-red-600'} print:text-black`}>{isPos ? '+' : '-'}{formatNum(m?.qty)}</td>
                           <td className="py-3 px-4 text-right font-bold text-gray-600 border-r print:border-black print:text-black">${formatNum(m?.cost)}</td>
                           <td className="py-3 px-4 text-right font-black border-r print:border-black print:text-black">${formatNum(m?.totalValue)}</td>
                           <td className="py-3 px-4 text-center no-pdf flex justify-center gap-2">
                              <button onClick={() => setShowMovementReceipt(m)} className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-colors" title="Imprimir Comprobante"><Printer size={16}/></button>
                              <button onClick={() => handleDeleteMovement(m)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors" title="Borrar/Revertir Movimiento"><Trash2 size={16}/></button>
                           </td>
                         </tr>
                        );
                     })}
                     {filteredMovements.length === 0 && <tr><td colSpan="8" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin movimientos registrados</td></tr>}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {invView === 'reporte177' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><FileText className="text-orange-500" size={24}/> Reporte General (Art. 177 LISLR)</h2>
               <div className="flex gap-2">
                 <button onClick={() => handleExportExcel('reporte-177-table', 'Reporte_Inventario_177')} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXPORTAR EXCEL</button>
                 <button onClick={() => handleExportPDF('Reporte_Art_177', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
               </div>
            </div>

            <div className="p-8 print:p-0 bg-white" id="pdf-content">
               <div data-html2canvas-ignore="true" className="flex gap-4 mb-8 items-end no-pdf">
                 <div>
                   <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes a Reportar</label>
                   <select value={reportMonth} onChange={e=>setReportMonth(parseInt(e.target.value))} className="w-48 border-2 border-gray-200 bg-white rounded-xl p-3 font-black text-xs uppercase outline-none">
                     <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option><option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option><option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Año</label>
                   <input type="number" value={reportYear} onChange={e=>setReportYear(parseInt(e.target.value))} className="w-32 border-2 border-gray-200 bg-white rounded-xl p-3 font-black text-xs outline-none text-center" />
                 </div>
               </div>

               <div className="hidden pdf-header mb-6">
                 <ReportHeader />
                 <h1 className="text-xl font-black text-black uppercase border-b-2 border-orange-500 pb-1">REPORTE GENERAL DE INVENTARIO (ART. 177 LISLR)</h1>
                 <p className="text-xs font-bold text-gray-500 uppercase mt-1">PERÍODO: {reportMonth.toString().padStart(2, '0')} / {reportYear}</p>
               </div>

               <div className="overflow-x-auto print:overflow-hidden border-2 border-black">
                 <table id="reporte-177-table" className="w-full text-left text-[9px] border-collapse whitespace-nowrap text-black print-tiny">
                   <thead>
                     <tr>
                       <th rowSpan="2" className="border-r-2 border-b-2 border-black p-3 bg-gray-200 font-black uppercase text-center w-1/5 print-p-1">PRODUCTO / CÓDIGO</th>
                       <th colSpan="3" className="border-r-2 border-b-2 border-black p-2 text-center bg-gray-100 font-black uppercase print-p-1">INVENTARIO INICIAL</th>
                       <th colSpan="3" className="border-r-2 border-b-2 border-black p-2 text-center bg-green-50 font-black uppercase print-p-1">ENTRADAS</th>
                       <th colSpan="3" className="border-r-2 border-b-2 border-black p-2 text-center bg-red-50 font-black uppercase print-p-1">SALIDAS / AUTOCONSUMO</th>
                       <th colSpan="3" className="border-b-2 border-black p-2 text-center bg-blue-50 font-black uppercase print-p-1">INVENTARIO FINAL</th>
                     </tr>
                     <tr className="bg-gray-50 font-bold uppercase text-[8px] text-center border-b-2 border-black print-tiny">
                       <th className="border-r border-black p-2 print-p-1">Cant.</th>
                       <th className="border-r border-black p-2 print-p-1">Costo U.</th>
                       <th className="border-r-2 border-black p-2 print-p-1">Total ($)</th>
                       
                       <th className="border-r border-black p-2 print-p-1">Cant.</th>
                       <th className="border-r border-black p-2 print-p-1">Costo Prom.</th>
                       <th className="border-r-2 border-black p-2 print-p-1">Total ($)</th>
                       
                       <th className="border-r border-black p-2 print-p-1">Cant.</th>
                       <th className="border-r border-black p-2 print-p-1">Costo Prom.</th>
                       <th className="border-r-2 border-black p-2 print-p-1">Total ($)</th>
                       
                       <th className="border-r border-black p-2 print-p-1">Cant.</th>
                       <th className="border-r border-black p-2 print-p-1">Costo U.</th>
                       <th className="p-2 print-p-1">Total ($)</th>
                     </tr>
                   </thead>
                   <tbody>
                     {reporte177Data.map((cat, catIndex) => {
                        const catInitialTotal = cat.items.reduce((sum, item) => sum + item.initialTotal, 0);
                        const catEntradasTotal = cat.items.reduce((sum, item) => sum + item.monthEntradasTotal, 0);
                        const catSalidasTotal = cat.items.reduce((sum, item) => sum + item.monthSalidasTotal, 0);
                        const catFinalTotal = cat.items.reduce((sum, item) => sum + item.invFinalTotal, 0);

                        grandInitialTotal += catInitialTotal;
                        grandEntradasTotal += catEntradasTotal;
                        grandSalidasTotal += catSalidasTotal;
                        grandFinalTotal += catFinalTotal;

                        return (
                           <React.Fragment key={catIndex}>
                              <tr>
                                 <td colSpan="13" className="bg-black text-white p-2 font-black uppercase tracking-widest border-b-2 border-black print-p-1">Categoría: {cat.category}</td>
                              </tr>
                              {cat.items.map(item => (
                                 <tr key={item.id} className="border-b border-gray-300 print:border-black hover:bg-gray-50">
                                   <td className="p-2 border-r-2 border-black font-bold uppercase print-p-1">{item.desc} <span className="text-gray-500 block text-[7px]">{item.id}</span></td>
                                   
                                   <td className="p-2 border-r border-black text-center font-bold print-p-1">{formatNum(item.initialStock)} {item.unit}</td>
                                   <td className="p-2 border-r border-black text-right print-p-1">${formatNum(item.cost)}</td>
                                   <td className="p-2 border-r-2 border-black text-right font-black bg-gray-50 print-p-1">${formatNum(item.initialTotal)}</td>
                                   
                                   <td className="p-2 border-r border-black text-center font-bold text-green-700 print-p-1">{formatNum(item.monthEntradasQty)} {item.unit}</td>
                                   <td className="p-2 border-r border-black text-right text-green-700 print-p-1">${formatNum(item.monthEntradasProm)}</td>
                                   <td className="p-2 border-r-2 border-black text-right font-black bg-green-50 print-p-1">${formatNum(item.monthEntradasTotal)}</td>
                                   
                                   <td className="p-2 border-r border-black text-center font-bold text-red-700 print-p-1">{formatNum(item.monthSalidasQty)} {item.unit}</td>
                                   <td className="p-2 border-r border-black text-right text-red-700 print-p-1">${formatNum(item.monthSalidasProm)}</td>
                                   <td className="p-2 border-r-2 border-black text-right font-black bg-red-50 print-p-1">${formatNum(item.monthSalidasTotal)}</td>
                                   
                                   <td className="p-2 border-r border-black text-center font-black text-blue-700 print-p-1">{formatNum(item.invFinalQty)} {item.unit}</td>
                                   <td className="p-2 border-r border-black text-right font-bold text-blue-700 print-p-1">${formatNum(item.invFinalCost)}</td>
                                   <td className="p-2 text-right font-black bg-blue-50 text-xs print-p-1">${formatNum(item.invFinalTotal)}</td>
                                 </tr>
                              ))}
                              <tr className="bg-gray-200 font-black border-y-2 border-black">
                                <td className="p-2 border-r-2 border-black text-right uppercase print-p-1">TOTAL {cat.category}</td>
                                <td colSpan="2" className="border-r border-black print-p-1"></td>
                                <td className="p-2 border-r-2 border-black text-right print-p-1">${formatNum(catInitialTotal)}</td>
                                <td colSpan="2" className="border-r border-black print-p-1"></td>
                                <td className="p-2 border-r-2 border-black text-right text-green-700 print-p-1">${formatNum(catEntradasTotal)}</td>
                                <td colSpan="2" className="border-r border-black print-p-1"></td>
                                <td className="p-2 border-r-2 border-black text-right text-red-700 print-p-1">${formatNum(catSalidasTotal)}</td>
                                <td colSpan="2" className="border-r border-black print-p-1"></td>
                                <td className="p-2 text-right text-blue-700 text-xs print-p-1">${formatNum(catFinalTotal)}</td>
                              </tr>
                           </React.Fragment>
                        );
                     })}
                   </tbody>
                   <tfoot>
                     <tr className="bg-black text-white font-black text-[11px] print-tiny">
                       <td className="p-3 border-r-2 border-black text-right uppercase print-p-1">GRAN TOTAL INVENTARIO</td>
                       <td colSpan="2" className="border-r border-black print-p-1"></td>
                       <td className="p-3 border-r-2 border-black text-right print-p-1">${formatNum(grandInitialTotal)}</td>
                       <td colSpan="2" className="border-r border-black print-p-1"></td>
                       <td className="p-3 border-r-2 border-black text-right text-green-300 print-p-1">${formatNum(grandEntradasTotal)}</td>
                       <td colSpan="2" className="border-r border-black print-p-1"></td>
                       <td className="p-3 border-r-2 border-black text-right text-red-300 print-p-1">${formatNum(grandSalidasTotal)}</td>
                       <td colSpan="2" className="border-r border-black print-p-1"></td>
                       <td className="p-3 text-right text-blue-300 text-[13px] print-p-1">${formatNum(grandFinalTotal)}</td>
                     </tr>
                   </tfoot>
                 </table>
               </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderVentasModule = () => {
    const filteredClients = (clients || []).filter(c => String(c?.name || '').toUpperCase().includes(clientSearchTerm.toUpperCase()) || String(c?.rif || '').toUpperCase().includes(clientSearchTerm.toUpperCase()));
    const filteredInvoices = (invoices || []).filter(inv => String(inv?.documento || '').toUpperCase().includes(invoiceSearchTerm.toUpperCase()) || String(inv?.clientName || '').toUpperCase().includes(invoiceSearchTerm.toUpperCase()));

    if (showGeneralInvoicesReport) {
      const totalBaseGeneral = (invoices || []).reduce((acc, curr) => acc + parseNum(curr?.montoBase), 0);
      const totalIvaGeneral = (invoices || []).reduce((acc, curr) => acc + parseNum(curr?.iva), 0);
      const totalGeneral = (invoices || []).reduce((acc, curr) => acc + parseNum(curr?.total), 0);
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black bg-white">
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
      const inv = (invoices || []).find(i => i?.id === showSingleInvoice); if (!inv) return null;
      const client = (clients || []).find(c => c?.rif === inv.clientRif) || {};
      return (
        <div id="pdf-content" className="bg-white p-12 min-h-0 text-black bg-white">
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
      const req = (requirements || []).find(r => r?.id === showSingleReqReport); if (!req) return null;
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black shadow-xl bg-white">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf"><button onClick={() => setShowSingleReqReport(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF(`Requisicion_${req.id}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16} /> Exportar PDF</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center my-4"><span className="text-xl font-black uppercase border-b-4 border-orange-500 pb-1">REQUISICIÓN DE PRODUCCIÓN N° {String(req.id).replace('OP-', '').padStart(5, '0')}</span></div>
          <div className="grid grid-cols-2 gap-4 mb-4 font-bold text-sm uppercase"><div><p>CLIENTE: {req.client}</p><p className="mt-1">VENDEDOR: {req.vendedor || 'N/A'}</p></div><div className="text-right"><p>FECHA: {req.fecha}</p><p className="mt-1">TIPO: {req.tipoProducto}</p></div></div>
          <div className="border-2 border-black p-4 grid grid-cols-4 gap-4 text-center text-xs font-black uppercase mb-4 rounded-2xl"><div>ANCHO<br/><span className="text-sm text-blue-600">{req.ancho} CM</span></div><div>FUELLES<br/><span className="text-sm text-blue-600">{req.fuelles || '0'} CM</span></div><div>LARGO<br/><span className="text-sm text-blue-600">{req.largo} CM</span></div><div>MICRAS<br/><span className="text-sm text-blue-600">{req.micras}</span></div></div>
          
          <div className="bg-gray-50 p-4 flex justify-between border-2 border-black rounded-2xl mb-4">
             <div><span className="block text-[10px] font-black uppercase">Cant. Solicitada</span><span className="text-xl font-black text-blue-600">{formatNum(req.cantidad)} {req.presentacion}</span></div>
             <div><span className="block text-[10px] font-black uppercase">Peso Millar Est.</span><span className="text-xl font-black">{req.pesoMillar || 'N/A'}</span></div>
             <div className="text-right"><span className="block text-[10px] font-black uppercase">Carga Total Planta</span><span className="text-3xl font-black text-orange-600">{formatNum(req.requestedKg)} KG</span></div>
          </div>
          
          <div className="mt-16 grid grid-cols-2 gap-24 text-center font-black text-xs uppercase border-t-2 border-black pt-4"><div>FIRMA VENTAS</div><div>RECIBE PLANTA</div></div>
        </div>
      );
    }

    if (showClientReport) {
      return (
        <div id="pdf-content" className="bg-white p-10 min-h-0 text-black bg-white">
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
            <tbody>{(clients || []).map(c => (<tr key={c?.rif}><td className="p-2 border font-bold">{c?.rif}</td><td className="p-2 border font-black uppercase">{c?.name}</td><td className="p-2 border uppercase">{c?.direccion}</td><td className="p-2 border">{c?.telefono}</td><td className="p-2 border uppercase font-bold">{c?.vendedor}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }

    if (showReqReport) {
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black bg-white">
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
            <thead className="bg-gray-100 uppercase"><tr><th>OP N°</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Producto</th><th className="text-right">KG Estimados</th><th className="text-center">Estatus</th></tr></thead>
            <tbody>{(requirements || []).map(r => (<tr key={r?.id}><td className="p-2 border text-center">{String(r?.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-2 border">{r?.fecha}</td><td className="p-2 border font-bold">{r?.client}</td><td className="p-2 border">{r?.vendedor}</td><td className="p-2 border">{r?.desc}</td><td className="p-2 border text-right font-black">{formatNum(r?.requestedKg)} KG</td><td className="p-2 border text-center font-bold uppercase">{r?.status}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        {ventasView === 'clientes' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b bg-white flex justify-between items-center"><h2 className="text-xl font-black uppercase flex items-center gap-3"><Users className="text-orange-500" /> DIRECTORIO DE CLIENTES</h2><button onClick={()=>setShowClientReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-gray-50">REPORTE GENERAL</button></div>
            <div className="p-8 bg-gray-50/50 border-b">
              <form onSubmit={handleAddClient} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Razón Social</label>
                    <input type="text" value={newClientForm.razonSocial} onChange={e=>setNewClientForm({...newClientForm, razonSocial: String(e.target.value || '').toUpperCase()})} className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-orange-500 border-2 border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">RIF</label>
                    <input type="text" disabled={!!editingClientId} value={newClientForm.rif} onChange={e=>setNewClientForm({...newClientForm, rif: String(e.target.value || '').toUpperCase()})} className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none border-2 border-transparent" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Teléfono</label>
                    <input type="text" value={newClientForm.telefono} onChange={e=>setNewClientForm({...newClientForm, telefono: e.target.value})} className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none border-2 border-transparent" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Dirección Fiscal</label>
                     <input type="text" value={newClientForm.direccion} onChange={e=>setNewClientForm({...newClientForm, direccion: String(e.target.value || '').toUpperCase()})} className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-orange-500 border-2 border-transparent transition-all" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Vendedor Asignado</label>
                     <input type="text" value={newClientForm.vendedor} onChange={e=>setNewClientForm({...newClientForm, vendedor: String(e.target.value || '').toUpperCase()})} className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-orange-500 border-2 border-transparent transition-all" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" className="bg-black text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-800 transition-all">GUARDAR DIRECTORIO</button>
                </div>
              </form>
            </div>
            <div className="p-8"><div className="relative max-w-2xl mb-8"><Search className="absolute left-4 top-4 text-gray-400" size={18} /><input type="text" placeholder="BUSCAR POR NOMBRE O RIF..." value={clientSearchTerm} onChange={e=>setClientSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white text-black" /></div><div className="overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><thead className="bg-white border-b-2 border-gray-100"><tr className="uppercase font-black text-[10px] text-gray-400 tracking-widest"><th className="py-4 px-4">RIF</th><th className="py-4 px-4 w-1/2">Razón Social</th><th className="py-4 px-4">Contacto</th><th className="py-4 px-4 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-gray-100 text-black">{(clients || []).map(c => {
               if(!String(c?.name || '').toUpperCase().includes(clientSearchTerm.toUpperCase()) && !String(c?.rif || '').toUpperCase().includes(clientSearchTerm.toUpperCase())) return null;
               return (
               <tr key={c?.rif}><td className="py-5 px-4 font-black">{c?.rif}</td><td className="py-5 px-4"><span className="font-black uppercase block text-sm">{c?.name}</span><span className="text-[10px] font-bold text-gray-400 block">{c?.direccion}</span></td><td className="py-5 px-4"><span className="font-bold text-gray-700 text-xs">{c?.personaContacto}</span></td><td className="py-5 px-4 text-center"><div className="flex justify-center gap-2"><button onClick={()=>startEditClient(c)} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Edit size={16}/></button><button onClick={()=>handleDeleteClient(c?.rif)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></div></td></tr>
               );
            })}</tbody></table></div></div>
          </div>
        )}
        {ventasView === 'facturacion' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
             <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Receipt className="text-orange-500" size={24}/> Facturación de Venta</h2><div className="flex gap-2"><button onClick={()=>setShowGeneralInvoicesReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 transition-colors">REPORTE GENERAL</button><button onClick={()=>{setShowNewInvoicePanel(!showNewInvoicePanel); setNewInvoiceForm(initialInvoiceForm);}} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-slate-800 transition-colors">{showNewInvoicePanel ? 'CANCELAR' : 'NUEVA FACTURA'}</button></div></div>
             {showNewInvoicePanel && (
                <div className="p-8 bg-gray-50/50 border-b">
                  <form onSubmit={handleCreateInvoice} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                      <h3 className="text-sm font-black uppercase text-black tracking-widest">Registrar Factura de Venta</h3>
                      <div className="flex items-center gap-4">
                        <span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest shadow-sm">FACTURA NRO: {newInvoiceForm.documento || generateInvoiceId()}</span>
                        <button type="button" onClick={()=>setShowNewInvoicePanel(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">Cliente</label>
                        <select required value={newInvoiceForm.clientRif} onChange={e=>handleInvoiceFormChange('clientRif', e.target.value)} className="w-full bg-gray-100/70 border-2 border-transparent rounded-2xl p-4 font-black text-xs outline-none focus:bg-white focus:border-orange-500 text-black">
                          <option value="">Seleccione...</option>
                          {(clients || []).map(c=><option key={c?.rif} value={c?.rif}>{c?.name}</option>)}
                        </select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">OP Relacionada (Opcional)</label>
                        <select value={newInvoiceForm.opAsignada} onChange={e=>{
                           const op = requirements.find(r=>r.id===e.target.value);
                           setNewInvoiceForm({...newInvoiceForm, opAsignada: e.target.value, productoMaquilado: op ? op.desc : newInvoiceForm.productoMaquilado});
                        }} className="w-full bg-gray-100/70 border-2 border-transparent rounded-2xl p-4 font-black text-xs outline-none focus:bg-white focus:border-orange-500 text-black">
                          <option value="">Seleccione OP...</option>
                          {(requirements || []).map(r=><option key={r.id} value={r.id}>{r.id} - {r.client}</option>)}
                        </select>
                      </div>

                      <div className="md:col-span-4">
                        <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">Descripción / Producto Maquilado</label>
                        <input type="text" required className="w-full bg-gray-100/70 border-2 border-transparent rounded-2xl p-4 text-sm font-black outline-none focus:bg-white focus:border-orange-500 text-black uppercase" value={newInvoiceForm.productoMaquilado} onChange={e=>handleInvoiceFormChange('productoMaquilado', e.target.value)} placeholder="EJ: BOLSAS DE 28 X 75" />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">Base (USD) e IVA</label>
                        <div className="flex gap-2">
                           <input type="number" step="0.01" required className="flex-1 bg-gray-100/70 border-2 border-transparent rounded-2xl p-4 text-xl font-black outline-none focus:bg-white focus:border-orange-500 text-black text-center" value={newInvoiceForm.montoBase} onChange={e=>handleInvoiceFormChange('montoBase', e.target.value)} placeholder="0.00" />
                           <select value={newInvoiceForm.aplicaIva} onChange={e=>handleInvoiceFormChange('aplicaIva', e.target.value)} className="w-32 bg-gray-100/70 border-2 border-transparent rounded-2xl p-4 text-xs font-black outline-none focus:bg-white focus:border-orange-500 text-black">
                             <option value="SI">+ IVA</option>
                             <option value="NO">EXENTO</option>
                           </select>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">Total Factura</label>
                        <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl font-black text-orange-700 text-xl text-center shadow-inner">${formatNum(newInvoiceForm.total)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all">GUARDAR FACTURA DE VENTA</button></div>
                  </form>
                </div>
             )}
             <div className="p-8"><div className="relative max-w-2xl mb-8"><Search className="absolute left-4 top-4 text-gray-400" size={18} /><input type="text" placeholder="BUSCAR FACTURA O CLIENTE..." value={invoiceSearchTerm} onChange={e=>setInvoiceSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white text-black" /></div><div className="overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><thead className="bg-white border-b-2 border-gray-100"><tr className="uppercase font-black text-[10px] text-gray-400 tracking-widest"><th className="py-4 px-4 text-black">Doc / Fecha</th><th className="py-4 px-4 text-black">OP N°</th><th className="py-4 px-4 text-black">Cliente / Producto</th><th className="py-4 px-4 text-right text-black w-32">Total USD</th><th className="py-4 px-4 text-center text-black">Acciones</th></tr></thead><tbody className="divide-y">{(invoices || []).map(inv=>{
               if(!String(inv?.documento || '').toUpperCase().includes(invoiceSearchTerm.toUpperCase()) && !String(inv?.clientName || '').toUpperCase().includes(invoiceSearchTerm.toUpperCase())) return null;
               return (
               <tr key={inv?.id} className="hover:bg-gray-50"><td className="py-5 px-4 font-black text-sm">{inv?.documento}<br/><span className="text-[9px] text-gray-400 font-bold">{getSafeDate(inv?.timestamp)}</span></td><td className="py-5 px-4 font-black text-xs text-orange-600">{inv?.opAsignada || '---'}</td><td className="py-5 px-4 font-bold text-gray-700 uppercase">{inv?.clientName}<br/><span className="text-[9px] font-black text-orange-500 block max-w-xs truncate" title={inv?.productoMaquilado}>{inv?.productoMaquilado || 'S/D'}</span></td><td className="py-5 px-4 text-right font-black text-green-600 text-lg w-32">${formatNum(inv?.total)}</td><td className="py-5 px-4 text-center"><div className="flex justify-center gap-2"><button onClick={()=>setShowSingleInvoice(inv?.id)} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-800 hover:text-white transition-all"><Printer size={16}/></button><button onClick={()=>handleDeleteInvoice(inv?.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></div></td></tr>
             )})}</tbody></table></div></div>
          </div>
        )}
        {ventasView === 'requisiciones' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
             <div className="px-8 py-6 border-b bg-white flex justify-between items-center"><h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><FileText className="text-orange-500" size={24}/> REQUISICIONES OP</h2><div className="flex gap-2"><button onClick={()=>setShowReqReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 transition-colors">REPORTE GENERAL</button><button onClick={()=>{setShowNewReqPanel(!showNewReqPanel);setNewReqForm(initialReqForm);setEditingReqId(null);}} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-all">{showNewReqPanel ? 'CANCELAR' : 'NUEVA SOLICITUD'}</button></div></div>
             {showNewReqPanel && (
                <div className="p-8 bg-gray-50/50 border-b">
                  <form onSubmit={handleCreateRequirement} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b pb-3 mb-6"><h3 className="text-sm font-black uppercase text-black">{editingReqId ? 'EDITAR ORDEN' : 'NUEVA ORDEN'}</h3><span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl font-black text-[10px]">CORRELATIVO: {editingReqId ? String(editingReqId).replace('OP-','').padStart(5,'0') : generateReqId().replace('OP-','').padStart(5,'0')}</span></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Cliente del Directorio</label>
                          <select required value={newReqForm.client} onChange={e=>handleReqFormChange('client', e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 font-black text-xs text-black outline-none focus:border-orange-500">
                            <option value="">Seleccione...</option>{(clients || []).map(c=><option key={c?.rif} value={c?.name}>{c?.name}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Ancho (cm)</label><input type="number" step="0.1" value={newReqForm.ancho} onChange={e=>handleReqFormChange('ancho', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black" /></div>
                          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Fuelle Total (cm)</label><input type="number" step="0.1" value={newReqForm.fuelles} onChange={e=>handleReqFormChange('fuelles', e.target.value)} disabled={newReqForm.tipoProducto === 'TERMOENCOGIBLE'} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black disabled:bg-gray-100 disabled:opacity-50" /></div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Largo (cm)</label><input type="number" step="0.1" value={newReqForm.largo} onChange={e=>handleReqFormChange('largo', e.target.value)} disabled={newReqForm.tipoProducto === 'TERMOENCOGIBLE'} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black disabled:bg-gray-100 disabled:opacity-50" /></div>
                        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Micras / Espesor</label><input type="number" step="0.001" value={newReqForm.micras} onChange={e=>handleReqFormChange('micras', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black" /></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                       <div>
                         <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Tipo de Producto</label>
                         <select value={newReqForm.tipoProducto} onChange={e=>handleReqFormChange('tipoProducto', e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 font-black text-xs text-black outline-none focus:border-orange-500">
                           <option value="BOLSAS">BOLSAS / EMPAQUES</option>
                           <option value="TERMOENCOGIBLE">TERMOENCOGIBLE</option>
                         </select>
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Cantidad Solicitada</label>
                         <input type="number" step="0.01" value={newReqForm.cantidad} onChange={e=>handleReqFormChange('cantidad', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-4 font-black text-lg text-center text-black outline-none focus:border-orange-500" />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Presentación</label>
                         <select disabled={newReqForm.tipoProducto === 'TERMOENCOGIBLE'} value={newReqForm.presentacion} onChange={e=>handleReqFormChange('presentacion', e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 font-black text-xs text-black outline-none focus:border-orange-500 disabled:bg-gray-100 disabled:opacity-50">
                           <option value="MILLAR">MILLARES</option>
                           <option value="KILOS">KILOGRAMOS</option>
                         </select>
                       </div>
                    </div>

                    <div className="flex justify-between items-center bg-orange-50 p-6 rounded-3xl border-2 border-orange-200 mt-6 shadow-inner"><div><span className="text-[10px] font-black text-orange-800 uppercase tracking-tighter">TOTAL CARGA ESTIMADA</span><span className="text-4xl font-black text-orange-600 block">{newReqForm.requestedKg} KG</span></div><button type="submit" className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all">GUARDAR Y PASAR A PLANTA</button></div>
                  </form>
                </div>
             )}
             <div className="p-8 overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><thead className="bg-white border-b-2 border-gray-100"><tr className="uppercase font-black text-[10px] text-gray-400 tracking-widest"><th className="py-4 px-4 text-black">N° / Fecha</th><th className="py-4 px-4 text-black w-1/2">Cliente / Descripción</th><th className="py-4 px-4 text-right text-black">KG Est.</th><th className="py-4 px-4 text-center text-black">Acciones</th></tr></thead><tbody className="divide-y divide-gray-100">{(requirements || []).map(r=>(<tr key={r?.id} className="hover:bg-gray-50 group transition-all"><td className="py-5 px-4 font-black text-orange-500">#{String(r?.id).replace('OP-','').padStart(5,'0')}<br/><span className="text-[9px] text-gray-400 font-bold">{r?.fecha}</span></td><td className="py-5 px-4"><span className="font-black text-black uppercase block text-sm">{r?.client}</span><span className="text-[10px] text-gray-400 font-bold uppercase block">{r?.desc}</span></td><td className="py-5 px-4 text-right font-black text-black text-lg">{formatNum(r?.requestedKg)}</td><td className="py-5 px-4 text-center"><div className="flex justify-center gap-2"><button onClick={()=>setShowSingleReqReport(r?.id)} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-800 hover:text-white transition-all" title="Imprimir"><Printer size={16}/></button><button onClick={()=>startEditReq(r)} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all" title="Editar"><Edit size={16}/></button><button onClick={()=>handleDeleteReq(r?.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Eliminar"><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div>
          </div>
        )}
      </div>
    );
  };

  const renderProductionModule = () => {
    if (showWorkOrder) return renderWorkOrder();
    if (showPhaseReport) return renderPhaseReport();
    if (showFiniquito) return renderFiniquito();

    const activeOrders = (requirements || []).filter(r => r?.status === 'EN PROCESO');
    const completedOrders = (requirements || []).filter(r => r?.status === 'COMPLETADO');
    
    if (prodView === 'proyeccion') {
       const proyeccionData = generateProjectionData();
       return (
         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in print:border-none print:shadow-none">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><TrendingUp className="text-orange-500" size={24}/> Proyección de Materia Prima</h2>
               <div className="flex gap-2">
                 <button onClick={() => handleExportExcel('proyeccion-table', 'Proyeccion_Inventario')} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXCEL</button>
                 <button onClick={() => handleExportPDF('Proyeccion_MP', false)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> PDF</button>
               </div>
            </div>
            <div id="pdf-content" className="p-8 print:p-0 bg-white">
               <div className="hidden pdf-header mb-8">
                 <ReportHeader />
                 <h1 className="text-2xl font-black text-black uppercase border-b-4 border-orange-500 pb-2">PROYECCIÓN DE CONSUMO DE MATERIA PRIMA</h1>
                 <p className="text-sm font-bold text-gray-500 uppercase mt-2">FECHA: {getTodayDate()}</p>
               </div>
               
               <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl mb-8 flex items-start gap-4">
                  <AlertTriangle size={24} className="text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                     <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-1">Módulo de Planificación</h3>
                     <p className="text-xs font-bold text-blue-600 leading-relaxed">El sistema analiza el inventario actual, descuenta las requisiciones de planta no despachadas y calcula cuántos días de inventario quedan según el consumo promedio de los últimos 30 días.</p>
                  </div>
               </div>

               <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-black print:rounded-none">
                 <table id="proyeccion-table" className="w-full text-left whitespace-nowrap text-xs">
                   <thead className="bg-gray-100 border-b-2 border-gray-300 print:border-black">
                     <tr className="uppercase font-black text-[10px] tracking-widest text-black">
                       <th className="py-3 px-4 border-r print:border-black">Insumo</th>
                       <th className="py-3 px-4 border-r print:border-black text-center">Stock Actual</th>
                       <th className="py-3 px-4 border-r print:border-black text-center text-red-600">Comprometido<br/><span className="text-[8px] block">(Req. Planta)</span></th>
                       <th className="py-3 px-4 border-r print:border-black text-center text-green-600">Disponible<br/><span className="text-[8px] block">Real</span></th>
                       <th className="py-3 px-4 border-r print:border-black text-center">Consumo<br/><span className="text-[8px] block">Diario</span></th>
                       <th className="py-3 px-4 border-r print:border-black text-center">Días<br/><span className="text-[8px] block">Restantes</span></th>
                       <th className="py-3 px-4 text-center no-pdf">Acción</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-black print:divide-black">
                     {proyeccionData.map(mp => (
                       <tr key={mp.id} className="hover:bg-gray-50 transition-colors">
                         <td className="py-4 px-4 font-black border-r print:border-black uppercase text-sm">{mp.desc}<br/><span className="text-[9px] text-gray-500 font-bold">{mp.id}</span></td>
                         <td className="py-4 px-4 font-black border-r print:border-black text-center text-lg">{formatNum(mp.stock)}</td>
                         <td className="py-4 px-4 font-black border-r print:border-black text-center text-red-500">{formatNum(mp.committedStock)}</td>
                         <td className={`py-4 px-4 font-black border-r print:border-black text-center text-lg ${mp.availableReal < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatNum(mp.availableReal)}</td>
                         <td className="py-4 px-4 font-bold border-r print:border-black text-center">{formatNum(mp.dailyAvg)} kg/d</td>
                         <td className="py-4 px-4 border-r print:border-black text-center">
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${mp.daysRemaining < 15 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                               {mp.daysRemaining === 999 ? '+99 Días' : `${formatNum(mp.daysRemaining)} Días`}
                            </span>
                         </td>
                         <td className="py-4 px-4 text-center no-pdf">
                            {mp.suggestOrder > 0 ? (
                               <button onClick={() => {
                                 setDialog({title: 'Generar Orden', text: `Se recomienda comprar ${formatNum(mp.suggestOrder)} kg de ${mp.desc} para cubrir el déficit y asegurar 15 días de stock.`, type: 'alert'})
                               }} className="bg-black text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 shadow-md hover:bg-gray-800 w-full"><ShoppingCart size={14}/> PEDIR {formatNum(mp.suggestOrder)} KG</button>
                            ) : (
                               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock OK</span>
                            )}
                         </td>
                       </tr>
                     ))}
                     {proyeccionData.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin Materias Primas registradas</td></tr>}
                   </tbody>
                 </table>
               </div>
            </div>
         </div>
       );
    }

    if (prodView === 'calculadora') {
      return (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in print:border-none print:shadow-none print:m-0 print:p-0 print:block print:w-full">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Calculator className="text-orange-500" size={24}/> Simulador de Producción</h2>
               
               <div className="flex gap-2">
                 <button onClick={handleResetCalc} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-300 transition-colors flex items-center gap-2"><PlusCircle size={16}/> NUEVA SIMULACIÓN</button>
                 <button onClick={() => handleExportPDF('Simulador_Produccion', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
               </div>
            </div>
            
            <div id="pdf-content" className="grid grid-cols-1 lg:grid-cols-12 gap-0 print:block print:w-full print:mx-auto bg-white">
               
               <div data-html2canvas-ignore="true" className="lg:col-span-4 border-r border-gray-200 bg-gray-50 p-8 no-pdf space-y-8">
                 <div>
                     <h3 className="text-xs font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">1. Variables Base (Pedido)</h3>
                     <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                             Cantidad Solicitada ({calcInputs?.tipoProducto === 'BOLSAS' ? 'MILLARES' : 'KILOS (KG)'})
                          </label>
                          <input type="number" value={calcInputs?.cantidadSolicitada === 0 ? '' : calcInputs?.cantidadSolicitada} onChange={(e) => handleCalcChange('cantidadSolicitada', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-black outline-none focus:border-orange-500 text-center text-blue-600" />
                        </div>
                     </div>
                 </div>

                 <div>
                     <div className="flex justify-between items-end border-b border-gray-200 pb-2 mb-4">
                       <h3 className="text-xs font-black uppercase text-black">2. Fórmula de MP</h3>
                       <button onClick={addCalcIng} className="text-[9px] bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-black font-bold uppercase transition-all">+ Insumo</button>
                     </div>
                     <div className="space-y-3">
                        {(calcInputs?.ingredientes || []).map(ing => (
                           <div key={ing?.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative">
                              <button onClick={() => removeCalcIng(ing?.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 hover:bg-red-50 hover:text-white transition-all"><X size={12}/></button>
                              
                              <select 
                                value={ing?.nombre || ''} 
                                onChange={(e) => {
                                   const selectedId = e.target.value;
                                   let defaultCost = 0;
                                   if (selectedId === 'MP-RECICLADO') defaultCost = 1.00;
                                   else if (selectedId === 'MP-0240') defaultCost = 0.96;
                                   else if (selectedId === 'MP-11PG4') defaultCost = 0.91;
                                   else if (selectedId === 'MP-3003') defaultCost = 0.96;

                                   const invItem = (inventory || []).find(i => i?.id === selectedId);
                                   const finalCost = invItem ? invItem.cost : defaultCost;
                                   
                                   const newIngs = (calcInputs?.ingredientes || []).map(i => 
                                     i?.id === ing?.id ? { ...i, nombre: selectedId, costo: finalCost } : i
                                   );
                                   setCalcInputs({ ...calcInputs, ingredientes: newIngs });
                                }} 
                                className="w-full text-[10px] font-bold uppercase outline-none mb-2 border-b border-gray-200 pb-1 bg-transparent text-gray-800"
                              >
                                <option value="">SELECCIONE MATERIA PRIMA...</option>
                                {(inventory || []).filter(i => i?.category === 'Materia Prima' || i?.category === 'Pigmentos').map(i => (
                                   <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc}</option>
                                ))}
                                <option value="MP-RECICLADO">MP-RECICLADO - MATERIAL RECICLADO</option>
                                {!(inventory || []).find(i => i?.id === 'MP-0240') && <option value="MP-0240">MP-0240 - PEBD 240 (ESENTTIA)</option>}
                                {!(inventory || []).find(i => i?.id === 'MP-11PG4') && <option value="MP-11PG4">MP-11PG4 - LINEAL 11PG4 (METALOCENO)</option>}
                                {!(inventory || []).find(i => i?.id === 'MP-3003') && <option value="MP-3003">MP-3003 - PEBD 3003 (BAPOLENE)</option>}
                              </select>
                              
                              <div className="flex gap-2 mt-1">
                                <div className="w-1/2">
                                   <label className="text-[8px] font-bold text-gray-400 uppercase">Proporción (%)</label>
                                   <input type="number" value={ing?.pct === 0 ? '' : ing?.pct} onChange={(e) => updateCalcIng(ing?.id, 'pct', e.target.value)} className="w-full text-xs font-black text-center outline-none bg-gray-50 rounded p-1 border border-gray-100 text-black" />
                                </div>
                                <div className="w-1/2">
                                   <label className="text-[8px] font-bold text-gray-400 uppercase">Costo ($/KG)</label>
                                   <input type="number" step="0.01" value={ing?.costo === 0 ? '' : ing?.costo} onChange={(e) => updateCalcIng(ing?.id, 'costo', e.target.value)} className="w-full text-xs font-black text-center outline-none bg-gray-50 rounded p-1 border border-gray-100 text-black" />
                                </div>
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="mt-2 text-right">
                       <span className={`text-[10px] font-black uppercase ${(calcInputs?.ingredientes || []).reduce((a,b)=>a+(b?.pct||0),0) !== 100 ? 'text-red-500' : 'text-green-500'}`}>Total Fórmula: {(calcInputs?.ingredientes || []).reduce((a,b)=>a+(b?.pct||0),0)}%</span>
                     </div>
                 </div>

                 <div>
                     <h3 className="text-xs font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">3. Proyección de Merma Global</h3>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <label className="text-[9px] font-bold text-gray-500 uppercase flex-1">Merma Global Esperada (%)</label>
                          <input type="number" step="0.1" value={calcInputs?.mermaGlobalPorc === 0 ? '' : calcInputs?.mermaGlobalPorc} onChange={(e) => handleCalcChange('mermaGlobalPorc', e.target.value)} className="w-24 border-2 border-gray-200 rounded-lg p-2 text-xs font-black text-center text-red-500" />
                        </div>
                     </div>
                 </div>

                 <div>
                     <h3 className="text-xs font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">4. Parámetros del Producto Final</h3>
                     <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Tipo de Producto</label>
                          <select value={calcInputs?.tipoProducto || 'BOLSAS'} onChange={e=>setCalcInputs({...calcInputs, tipoProducto: e.target.value})} className="w-full border-2 border-gray-200 rounded-lg p-2 text-xs font-black text-center text-blue-600 outline-none">
                            <option value="BOLSAS">BOLSAS / EMPAQUES</option>
                            <option value="TERMOENCOGIBLE">TERMOENCOGIBLE</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-bold text-gray-400 uppercase">ANCHO (CM)</label>
                            <input type="number" step="0.1" value={calcInputs?.ancho === 0 ? '' : calcInputs?.ancho} onChange={e=>setCalcInputs({...calcInputs, ancho: e.target.value})} className="w-full border p-2 text-xs text-center font-bold" />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-gray-400 uppercase">FUELLES (CM)</label>
                            <input type="number" step="0.1" disabled={calcInputs?.tipoProducto === 'TERMOENCOGIBLE'} value={calcInputs?.fuelles === 0 ? '' : calcInputs?.fuelles} onChange={e=>setCalcInputs({...calcInputs, fuelles: e.target.value})} className="w-full border p-2 text-xs text-center font-bold disabled:bg-gray-100" />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-gray-400 uppercase">LARGO (CM)</label>
                            <input type="number" step="0.1" disabled={calcInputs?.tipoProducto === 'TERMOENCOGIBLE'} value={calcInputs?.largo === 0 ? '' : calcInputs?.largo} onChange={e=>setCalcInputs({...calcInputs, largo: e.target.value})} className="w-full border p-2 text-xs text-center font-bold disabled:bg-gray-100" />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-gray-400 uppercase">MICRAS</label>
                            <input type="number" step="0.001" value={calcInputs?.micras === 0 ? '' : calcInputs?.micras} onChange={e=>setCalcInputs({...calcInputs, micras: e.target.value})} className="w-full border p-2 text-xs text-center font-bold" />
                          </div>
                        </div>
                     </div>
                 </div>
               </div>

               <div className="lg:col-span-8 p-10 bg-white print:w-full print:p-4 print:m-0">
                  <div className="hidden pdf-header mb-4">
                     <ReportHeader />
                     <h1 className="text-xl font-black text-black uppercase border-b-2 border-orange-500 pb-1 mt-2">PROYECCIÓN Y COSTEO DE PRODUCCIÓN</h1>
                     <div className="flex justify-between items-start mt-2 border-b border-gray-200 pb-2 mb-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">FECHA DE SIMULACIÓN: {getTodayDate()}</p>
                        <div className="text-right border-l-2 border-orange-500 pl-4">
                           <p className="text-[10px] font-black text-black uppercase">TIPO: {calcInputs?.tipoProducto}</p>
                        </div>
                     </div>
                  </div>
                  
                  {calcInputs?.tipoProducto === 'BOLSAS' && simPesoMillar === 0 && (
                     <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6 uppercase border border-red-200 flex items-center gap-2 no-pdf">
                        <AlertTriangle size={16}/> Debes ingresar las medidas (Ancho, Fuelle, Largo, Micras) para calcular los KG.
                     </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-gray-300 print:border-black print:rounded-none print:overflow-hidden print:w-full">
                     <table className="w-full text-left text-[10px] print-text-xs print:whitespace-normal">
                        <thead className="bg-gray-200 print:bg-gray-300 border-b border-gray-400 print:border-black">
                           <tr className="font-black uppercase text-black">
                              <th className="p-2 print:p-1 pl-4">Fase / Concepto</th>
                              <th className="p-2 print:p-1 text-center border-l border-gray-300 print:border-black">Cantidad</th>
                              <th className="p-2 print:p-1 text-center border-l border-gray-300 print:border-black">U.M.</th>
                              <th className="p-2 print:p-1 text-center border-l border-gray-300 print:border-black">Costo Unit.</th>
                              <th className="p-2 print:p-1 text-center border-l border-gray-300 print:border-black">Costo Total</th>
                              <th className="p-2 print:p-1 border-l border-gray-300 print:border-black">Notas</th>
                           </tr>
                        </thead>
                        <tbody className="text-black divide-y divide-gray-200 print:divide-black">
                           <tr className="bg-orange-50 font-black border-y border-gray-300 print:border-black print:bg-gray-200">
                              <td className="p-1.5 print:p-1 pl-4 text-orange-800 print:text-black">0. PEDIDO A ENTREGAR ({calcInputs?.tipoProducto})</td>
                              <td className="p-1.5 print:p-1 text-center text-orange-800 print:text-black text-lg print:text-xs">{formatNum(inputCantidadSolicitada)}</td>
                              <td className="p-1.5 print:p-1 text-center text-orange-800 print:text-black">{simUmFinal}</td>
                              <td className="p-1.5 print:p-1 text-center text-orange-800 print:text-black">${formatNum(calcCostoFinalUnidad)}</td>
                              <td className="p-1.5 print:p-1 text-center text-orange-800 print:text-black">${formatNum(calcCostoMezclaPreparada)}</td>
                              <td className="p-1.5 print:p-1 text-gray-700 print:text-black font-bold text-[9px] leading-tight">
                                 {isBolsas ? (
                                    <>
                                      <span className="text-orange-600 block">PESO POR MILLAR: {formatNum(simPesoMillar)} KG</span>
                                      Equivale a {formatNum(calcKilosNetos)} KG Netos
                                    </>
                                 ) : (
                                    'Material Directo en Kilos'
                                 )}
                              </td>
                           </tr>

                           <tr><td colSpan="6" className="p-1.5 print:p-1 pt-3 pl-4 font-black uppercase bg-gray-50 print:bg-transparent border-t border-gray-400 print:border-black">1. PLANIFICACIÓN DE PRODUCCIÓN Y MERMA</td></tr>
                           <tr>
                             <td className="p-1.5 print:p-1 pl-4 font-bold">KILOS NETOS ÚTILES</td>
                             <td className="p-1.5 print:p-1 text-center text-blue-700 font-black">{formatNum(calcKilosNetos)}</td>
                             <td className="p-1.5 print:p-1 text-center">kg</td>
                             <td className="p-1.5 print:p-1 text-center">${formatNum(calcCostoUnitarioNeto)}</td>
                             <td className="p-1.5 print:p-1 text-center">-</td>
                             <td className="p-1.5 print:p-1 text-gray-500 print:text-black">Material útil para el pedido</td>
                           </tr>
                           <tr>
                             <td className="p-1.5 print:p-1 pl-4 font-bold">MERMA ESTIMADA (+{formatNum(calcInputs?.mermaGlobalPorc)}%)</td>
                             <td className="p-1.5 print:p-1 text-center text-red-600 font-black">{formatNum(calcMermaGlobalKg)}</td>
                             <td className="p-1.5 print:p-1 text-center">kg</td>
                             <td className="p-1.5 print:p-1 text-center">-</td>
                             <td className="p-1.5 print:p-1 text-center">-</td>
                             <td className="p-1.5 print:p-1 text-gray-500 print:text-black">Desperdicio de planta</td>
                           </tr>
                           <tr className="bg-gray-100 font-black border-y border-gray-300 print:border-black print:bg-gray-200">
                             <td className="p-1.5 print:p-1 pl-4 text-black">KILOS BRUTOS A EXTRUIR</td>
                             <td className="p-1.5 print:p-1 text-center text-black text-lg print:text-[10px]">{formatNum(calcTotalMezcla)}</td>
                             <td className="p-1.5 print:p-1 text-center">kg</td>
                             <td className="p-1.5 print:p-1 text-center">${formatNum(calcCostoPromedio)}</td>
                             <td className="p-1.5 print:p-1 text-center">${formatNum(calcCostoMezclaPreparada)}</td>
                             <td className="p-1.5 print:p-1 text-gray-500 print:text-black">Total mezcla a preparar</td>
                           </tr>

                           <tr><td colSpan="6" className="p-1.5 print:p-1 pt-3 pl-4 font-black uppercase bg-gray-50 print:bg-transparent border-t border-gray-400 print:border-black">2. RECETA DE MATERIA PRIMA</td></tr>
                           {(calcIngredientesProcesados || []).map(ing => (
                             <tr key={ing?.id}>
                               <td className="p-1.5 print:p-1 pl-4 font-bold">{ing?.desc}</td>
                               <td className="p-1.5 print:p-1 text-center">{formatNum(ing?.kg)}</td>
                               <td className="p-1.5 print:p-1 text-center">kg</td>
                               <td className="p-1.5 print:p-1 text-center">${formatNum(ing?.costo)}</td>
                               <td className="p-1.5 print:p-1 text-center">${formatNum(ing?.totalCost)}</td>
                               <td className="p-1.5 print:p-1 text-gray-500 print:text-black">{formatNum(ing?.pct)}% de la mezcla bruta</td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          </div>
      );
    }

    if (prodView === 'fases_produccion') {
      return (
          <div className="space-y-6">
            {!selectedPhaseReqId ? (
              <div className="p-12 bg-white rounded-3xl border border-gray-200 shadow-sm text-center animate-in fade-in"><div className="bg-black p-5 rounded-full inline-block mb-6 text-orange-500 shadow-lg"><Factory size={40}/></div><h2 className="text-2xl font-black uppercase text-black tracking-tighter mb-2">Control de Producción Activo</h2><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-10">Reporte el consumo de insumos y mermas por fase</p><div className="mt-12 border-t border-gray-200 pt-8 overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">OP N°</th><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">Cliente / Producto</th><th className="p-4 text-center text-black tracking-widest">Acción de Planta</th></tr></thead><tbody className="divide-y divide-gray-100">{(activeOrders || []).map(r => (<tr key={r?.id} className="group hover:bg-gray-50 transition-colors"><td className="p-4 font-black text-orange-500 text-lg">#{String(r?.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-4 font-black uppercase text-sm text-black">{r?.client}<br/><span className="text-[10px] text-gray-400 font-bold">{r?.desc}</span></td><td className="p-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => setShowWorkOrder(r?.id)} className="bg-white border-2 border-gray-100 text-gray-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all" title="Imprimir"><Printer size={16}/> ORDEN TRABAJO</button><button onClick={() => { setSelectedPhaseReqId(r?.id); setActivePhaseTab('extrusion'); setPhaseForm({...initialPhaseForm, date: getTodayDate()}); }} className="bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-md hover:bg-slate-800 transition-all"><PlayCircle size={16}/> ENTRAR A FASES</button></div></td></tr>))}</tbody></table></div></div>
            ) : (() => {
              const req = (requirements || []).find(r => r?.id === selectedPhaseReqId); if (!req) return null;
              const cPhase = req.production?.[activePhaseTab] || { batches: [], isClosed: false };
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-black rounded-3xl shadow-xl p-8 text-white relative overflow-hidden"><div className="absolute -right-6 -bottom-6 opacity-10"><Factory size={160}/></div><div className="relative z-10"><span className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase mb-4 inline-block shadow-sm">EN PRODUCCIÓN</span><h2 className="text-4xl font-black uppercase tracking-tighter mb-2">#{String(req.id).replace('OP-', '').padStart(5, '0')}</h2><p className="text-sm font-bold text-gray-300 uppercase leading-relaxed mb-6 border-b border-gray-700 pb-6">{req.client}<br/><span className="text-orange-400 text-lg">{req.desc}</span></p><div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-inner"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 tracking-widest">META A PRODUCIR:</p><p className="text-3xl font-black text-white">{formatNum(req.requestedKg)} KG</p></div></div></div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-3 space-y-2">{[{ id: 'extrusion', label: '1. Extrusión' }, { id: 'impresion', label: '2. Impresión' }, { id: 'sellado', label: '3. Sellado' }].map(tab => (<button key={tab.id} onClick={() => {setActivePhaseTab(tab.id); setPhaseForm({...initialPhaseForm, date: getTodayDate()});}} className={`w-full flex justify-between items-center p-5 rounded-2xl text-[10px] font-black uppercase transition-all ${activePhaseTab === tab.id ? 'bg-orange-50 text-orange-700 border-2 border-orange-200' : 'text-gray-500 hover:bg-gray-50'}`}><span>{tab.label}</span>{req.production?.[tab.id]?.isClosed && <CheckCircle size={18} className="text-green-500"/>}</button>))}</div>
                  </div>
                  
                  <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 p-8 lg:p-10 text-black">
                    <div className="border-b-2 border-gray-100 pb-6 mb-8 flex justify-between items-center"><h3 className="text-2xl font-black uppercase text-black tracking-tighter">Fase: {activePhaseTab.toUpperCase()}</h3><button onClick={()=>{setSelectedPhaseReqId(null); setPhaseForm(initialPhaseForm);}} className="bg-gray-100 p-2.5 rounded-xl text-gray-500 hover:text-black"><X size={18}/></button></div>
                    {cPhase.batches && cPhase.batches.length > 0 && (<div className="mb-8 overflow-hidden rounded-2xl border border-gray-200"><table className="w-full text-center text-xs"><thead className="bg-gray-50 border-b border-gray-200"><tr className="uppercase font-black text-[9px] text-gray-500 tracking-widest"><th className="p-3 border-r border-gray-200">Fecha</th><th className="p-3 border-r border-gray-200">Producido</th><th className="p-3 border-r border-gray-200">Merma</th><th className="p-3">Acción</th></tr></thead><tbody className="divide-y divide-gray-100 text-black">{(cPhase.batches || []).map(b => (<tr key={b?.id} className="hover:bg-gray-50"><td className="p-3 border-r border-gray-200 font-bold">{b?.date}</td><td className="p-3 border-r border-gray-200 font-black text-green-600">{formatNum(b?.producedKg)} kg</td><td className="p-3 border-r border-gray-200 font-black text-red-500">{formatNum(b?.mermaKg)} kg</td><td className="p-3 text-center flex justify-center gap-2"><button onClick={() => handleEditBatch(req.id, activePhaseTab, b?.id)} className="bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors p-1.5 rounded-lg" title="Modificar"><Edit size={14}/></button><button onClick={() => handleDeleteBatch(req.id, activePhaseTab, b?.id)} className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors p-1.5 rounded-lg" title="Eliminar"><Trash2 size={14}/></button></td></tr>))}</tbody></table></div>)}
                    {cPhase.isClosed ? (<div className="text-center py-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 shadow-inner"><CheckCircle size={56} className="text-green-500 mx-auto mb-6"/><h4 className="text-xl font-black text-black uppercase tracking-widest">Esta Fase se encuentra cerrada</h4><p className="text-[10px] font-bold text-gray-400 uppercase mt-2 mb-6">Ya no se permiten reportes parciales en esta etapa.</p><button onClick={() => handleReopenPhase(req.id, activePhaseTab)} className="bg-orange-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-orange-600 transition-all flex items-center gap-2 mx-auto"><Edit size={14}/> REABRIR FASE PARA EDITAR</button></div>) : (
                      <form onSubmit={handleSavePhase} className="space-y-8">
                        <div className="flex gap-4 items-center"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha Reporte:</label><input type="date" value={phaseForm?.date || getTodayDate()} onChange={e=>setPhaseForm({...phaseForm, date: e.target.value})} className="border-2 border-gray-200 rounded-xl p-2 font-black text-xs outline-none text-black focus:border-orange-500" /></div>
                        
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                          <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-2">
                             <h4 className="text-[10px] font-black text-gray-600 uppercase flex items-center gap-2"><Box size={16}/> Lista de Insumos</h4>
                             <button type="button" onClick={handleSendRequisitionToAlmacen} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-sm hover:bg-orange-600 transition-all flex items-center gap-2"><ArrowRight size={14}/> SOLICITAR A ALMACÉN</button>
                          </div>
                          
                          <div className="flex gap-3 mb-6"><select value={phaseIngId} onChange={e=>setPhaseIngId(e.target.value)} className="flex-1 border-2 border-gray-200 rounded-xl p-3.5 font-black text-xs text-black outline-none focus:border-orange-500">{renderPhaseInventoryOptions()}</select><input type="number" step="0.01" value={phaseIngQty} onChange={e=>setPhaseIngQty(e.target.value)} placeholder="Cant" className="w-32 border-2 border-gray-200 rounded-xl p-3.5 text-xs font-black text-center text-black outline-none focus:border-orange-500" /><button type="button" onClick={handleAddPhaseIng} className="bg-black text-white px-5 rounded-xl shadow-md transition-all hover:bg-slate-800"><Plus size={20}/></button></div><ul className="space-y-3">{(phaseForm?.insumos || []).map((ing, idx) => (<li key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><span className="text-xs font-black uppercase text-gray-800">{(inventory || []).find(i=>i?.id===ing?.id)?.desc || ing?.id}</span><div className="flex items-center gap-4"><span className="text-sm font-black text-black bg-gray-100 px-3 py-1.5 rounded-lg">{ing?.qty}</span><button type="button" onClick={() => setPhaseForm({...phaseForm, insumos: (phaseForm?.insumos || []).filter((_, i) => i !== idx)})} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18}/></button></div></li>))}</ul>
                          {(phaseForm?.insumos || []).length > 0 && <p className="text-[9px] font-bold text-gray-400 mt-4 italic uppercase">Nota: Puedes "Solicitar a Almacén" o dar a "Guardar Reporte" para descargar directamente del inventario general.</p>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4"><div className="bg-green-50 p-4 rounded-2xl border border-green-200 shadow-inner"><label className="text-[9px] font-black text-green-800 uppercase block mb-2 tracking-widest">Producido Bruto (KG)</label><input type="number" step="0.01" value={phaseForm?.producedKg || ''} onChange={e=>setPhaseForm({...phaseForm, producedKg: e.target.value})} placeholder="0.00 KG" className="w-full border-2 border-green-300 rounded-xl p-3 text-lg font-black text-green-700 text-center outline-none focus:border-green-500" /></div><div className="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-inner"><label className="text-[9px] font-black text-red-800 uppercase block mb-2 tracking-widest">Mermas / Desperdicio (KG)</label><input type="number" step="0.01" value={phaseForm?.mermaKg || ''} onChange={e=>setPhaseForm({...phaseForm, mermaKg: e.target.value})} placeholder="0.00 KG" className="w-full border-2 border-red-300 rounded-xl p-3 text-lg font-black text-red-700 text-center outline-none focus:border-red-500" /></div></div><div className="flex flex-col md:flex-row gap-4 pt-6 border-t-2 border-gray-100"><button type="submit" name="skip" className="w-full md:w-1/4 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl uppercase text-[9px] border-2 border-gray-200 shadow-sm transition-all hover:bg-gray-200">OMITIR FASE</button><button type="submit" name="partial" className="w-full md:w-2/4 bg-blue-50 text-blue-600 font-black py-4 rounded-2xl uppercase text-[9px] border-2 border-blue-200 flex justify-center items-center gap-2 shadow-sm transition-all hover:bg-blue-100"><Plus size={16}/> GUARDAR REPORTE PARCIAL</button><button type="submit" name="close" className="w-full md:w-1/4 bg-black text-white font-black py-4 rounded-2xl uppercase text-[9px] flex justify-center items-center gap-2 shadow-xl hover:bg-slate-800 transition-all"><CheckCircle size={16}/> CERRAR FASE DEFINITIVA</button></div>
                      </form>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
      );
    }

    if (prodView === 'historial') {
      return (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
            <div className="px-6 py-5 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-lg font-black text-black uppercase flex items-center gap-2"><History className="text-orange-500" /> Órdenes Completadas</h2><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Auditoría de Proceso</p></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">OP N°</th><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">Cliente / Producto</th><th className="p-4 text-right text-black text-[10px] font-black uppercase tracking-widest">KG Finales</th><th className="p-4 text-center text-black text-[10px] font-black uppercase tracking-widest">Acciones</th></tr></thead><tbody className="divide-y divide-gray-100 text-black">{(completedOrders || []).map(req => (<tr key={req?.id} className="hover:bg-gray-50 transition-colors group"><td className="p-4 font-black text-orange

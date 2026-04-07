import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Factory, TrendingUp, AlertTriangle, 
  ClipboardList, PlayCircle, History, FileText, Settings2, Trash2, 
  PlusCircle, Calculator, Plus, Users, UserPlus, LogOut, Lock, 
  ArrowDownToLine, ArrowUpFromLine, BarChart3, ShieldCheck, Box, Home, Edit, Printer, X, Search, Loader2, FileCheck, Beaker, CheckCircle, CheckCircle2, Receipt, ArrowRight, User, ArrowRightLeft, ClipboardEdit, Download, Thermometer, Gauge, ClipboardCheck
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, onSnapshot, deleteDoc, writeBatch, serverTimestamp, query } from "firebase/firestore";

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
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
          <AlertTriangle size={60} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-black text-black uppercase mb-2">Sistema Protegido de Caída</h2>
          <p className="text-gray-500 text-sm mb-6">{this.state.errorMsg}</p>
          <button onClick={() => window.location.reload()} className="bg-black text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg">Recargar Interfaz</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

// ============================================================================
// CONFIGURACIÓN DE FIREBASE BLINDADA
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
const db = getFirestore(app, "us-central"); 

const getColRef = (colName) => collection(db, colName); 
const getDocRef = (colName, docId) => doc(db, colName, String(docId));

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
  const [materialRequests, setMaterialRequests] = useState([]);

  const [dialog, setDialog] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState(''); 
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invSearchTerm, setInvSearchTerm] = useState('');

  const [showNewReqPanel, setShowNewReqPanel] = useState(false);
  const [showNewInvoicePanel, setShowNewInvoicePanel] = useState(false);
  const [showMatReqPanel, setShowMatReqPanel] = useState(false);
  const [showGeneralInvoicesReport, setShowGeneralInvoicesReport] = useState(false);
  const [showClientReport, setShowClientReport] = useState(false);
  const [showReqReport, setShowReqReport] = useState(false);
  const [showSingleReqReport, setShowSingleReqReport] = useState(null);
  const [showSingleInvoice, setShowSingleInvoice] = useState(null);

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
  const initialPhaseForm = { 
    date: getTodayDate(), insumos: [], producedKg: '', mermaKg: '',
    operadorExt: '', tratado: '', motorExt: '', ventilador: '', jalador: '',
    zona1: '', zona2: '', zona3: '', zona4: '', zona5: '', zona6: '', cabezalA: '', cabezalB: '',
    operadorImp: '', kgRecibidosImp: '', cantColores: '', relacionImp: '', motorImp: '', tensores: '', tempImp: '', solvente: '',
    operadorSel: '', kgRecibidosSel: '', impresa: 'NO', tipoSello: 'Sello FC', tempCabezalA: '', tempCabezalB: '', tempPisoA: '', tempPisoB: '', velServo: '', millaresProd: '', troquelSel: ''
  };

  const [showWorkOrder, setShowWorkOrder] = useState(null);
  const [showPhaseReport, setShowPhaseReport] = useState(null);
  const [showFiniquito, setShowFiniquito] = useState(null);
  const [selectedPhaseReqId, setSelectedPhaseReqId] = useState(null);
  const [activePhaseTab, setActivePhaseTab] = useState('extrusion');
  const [phaseForm, setPhaseForm] = useState(initialPhaseForm);
  const [matReqForm, setMatReqForm] = useState({ items: [] });
  const [matReqIngId, setMatReqIngId] = useState('');
  const [matReqIngQty, setMatReqIngQty] = useState('');

  // Simulador
  const initialCalcInputs = { 
    ingredientes: [{ id: Date.now() + 1, nombre: 'MP-0240', pct: 80, costo: 0.96 }, { id: Date.now() + 2, nombre: 'MP-RECICLADO', pct: 20, costo: 1.00 }], 
    mezclaTotal: '', mermaGlobalPorc: 5, tipoProducto: 'BOLSAS', ancho: '', fuelles: '', largo: '', micras: ''
  };
  const [calcInputs, setCalcInputs] = useState(initialCalcInputs);

  const initialInvItemForm = { id: '', desc: '', category: 'Materia Prima', unit: 'kg', cost: '', stock: '' };
  const [newInvItemForm, setNewInvItemForm] = useState(initialInvItemForm);
  const [editingInvId, setEditingInvId] = useState(null);
  const initialMovementForm = { date: getTodayDate(), itemId: '', type: 'ENTRADA', qty: '', cost: '', reference: '', notes: '', opAsignada: '' };
  const [newMovementForm, setNewMovementForm] = useState(initialMovementForm);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // ============================================================================
  // EXPORTACIONES (SOLUCIÓN DEFINITIVA A 1 SOLA HOJA)
  // ============================================================================
  const handleExportPDF = (filename, isLandscape = false) => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    const printOnlyElements = element.querySelectorAll('.hidden.print\\:block, .hidden.pdf-header');
    printOnlyElements.forEach(el => { el.style.display = 'block'; });
    const noPdfElements = element.querySelectorAll('.no-pdf');
    noPdfElements.forEach(el => { el.style.display = 'none'; });

    const originalCssText = element.style.cssText;
    const originalClasses = element.className;
    const virtualWidth = isLandscape ? 1120 : 800; 
    
    element.className = 'bg-white text-black p-8';
    element.style.width = `${virtualWidth}px`; 
    element.style.maxWidth = 'none';
    element.style.margin = '0 auto';
    
    const tables = element.querySelectorAll('table');
    tables.forEach(t => { t.style.whiteSpace = 'normal'; t.style.tableLayout = 'auto'; t.style.width = '100%'; });

    const overflows = element.querySelectorAll('.overflow-x-auto');
    overflows.forEach(el => { el.style.overflow = 'visible'; });

    const opt = { 
      margin: [10, 10, 10, 10], 
      filename: `${filename}_${getTodayDate()}.pdf`, 
      image: { type: 'jpeg', quality: 1 }, 
      html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: virtualWidth }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' }
    };
    
    const finishExport = () => { 
      printOnlyElements.forEach(el => { el.style.display = ''; });
      noPdfElements.forEach(el => { el.style.display = ''; });
      element.style.cssText = originalCssText;
      element.className = originalClasses;
      tables.forEach(t => { t.style.whiteSpace = ''; t.style.tableLayout = ''; t.style.width = ''; });
      overflows.forEach(el => { el.style.overflow = ''; });
    };

    if (typeof window.html2pdf === 'undefined') { 
      const script = document.createElement('script'); 
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'; 
      script.onload = () => { window.html2pdf().set(opt).from(element).save().then(finishExport); }; 
      document.head.appendChild(script); 
    } else { window.html2pdf().set(opt).from(element).save().then(finishExport); }
  };

  const handleExportExcel = (tableId, filename) => {
    const table = document.getElementById(tableId); if (!table) return;
    const tableClone = table.cloneNode(true);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><style>table{border-collapse:collapse;width:100%;font-family:Arial;font-size:11px;}th,td{border:1px solid #000;padding:5px;}th{text-align:center;}</style></head><body><h2>SERVICIOS JIRET G&B, C.A. - RIF: J-412309374</h2><br/>${tableClone.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${filename}_${getTodayDate()}.xls`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // ============================================================================
  // FIREBASE SYNC E INICIO
  // ============================================================================
  const handleLogin = (e) => {
    e.preventDefault();
    const user = loginData.username.toLowerCase().trim(); const pass = loginData.password.trim();
    if (user === 'admin' && pass === '1234') { setAppUser({ user: 'admin', role: 'Master', name: 'Administrador General' }); setLoginError(''); } 
    else if (user === 'planta' && pass === '1234') { setAppUser({ user: 'planta', role: 'Planta', name: 'Supervisor de Planta' }); setLoginError(''); } 
    else { setLoginError('Credenciales incorrectas. Intente nuevamente.'); }
  };

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth Error:", err));
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    let isFirstInv = true;
    const unsubInv = onSnapshot(getColRef('inventory'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() })); setInventory(data);
      if (s.empty && isFirstInv) { INITIAL_INVENTORY.forEach(item => setDoc(getDocRef('inventory', item.id), item)); }
      isFirstInv = false;
    });
    const unsubMovs = onSnapshot(getColRef('inventoryMovements'), (s) => setInvMovements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubCli = onSnapshot(getColRef('clientes'), (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubReq = onSnapshot(getColRef('requirements'), (s) => setRequirements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubInvB = onSnapshot(getColRef('maquilaInvoices'), (s) => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubMatReq = onSnapshot(getColRef('materialRequests'), (s) => setMaterialRequests(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    
    return () => { unsubInv(); unsubMovs(); unsubCli(); unsubReq(); unsubInvB(); unsubMatReq(); };
  }, [fbUser]);

  const clearAllReports = () => {
    setShowReqReport(false); setShowClientReport(false); setShowGeneralInvoicesReport(false);
    setShowNewReqPanel(false); setShowNewInvoicePanel(false); setShowMatReqPanel(false);
    setEditingClientId(null); setEditingReqId(null); setShowSingleReqReport(null);
    setShowSingleInvoice(null); setInvoiceSearchTerm('');
    setShowWorkOrder(null); setShowPhaseReport(null); setShowFiniquito(null);
    setSelectedPhaseReqId(null);
  };

  // ============================================================================
  // LOGICA INVENTARIO
  // ============================================================================
  const handleSaveInvItem = async (e) => {
    e.preventDefault(); if (!newInvItemForm.id || !newInvItemForm.desc) return setDialog({ title: 'Aviso', text: 'Código obligatorio.', type: 'alert' });
    const itemData = { ...newInvItemForm, id: newInvItemForm.id.toUpperCase(), desc: newInvItemForm.desc.toUpperCase(), cost: parseNum(newInvItemForm.cost), stock: parseNum(newInvItemForm.stock), timestamp: Date.now() };
    try { await setDoc(getDocRef('inventory', itemData.id), itemData, { merge: true }); setNewInvItemForm(initialInvItemForm); setEditingInvId(null); setDialog({ title: 'Éxito', text: 'Artículo guardado.', type: 'alert' }); } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };
  const startEditInvItem = (item) => {
    setEditingInvId(item.id);
    setNewInvItemForm({ id: item.id, desc: item.desc, category: item.category || 'Materia Prima', cost: item.cost || '', stock: item.stock || '', unit: item.unit || 'kg' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault(); const item = (inventory || []).find(i => i?.id === newMovementForm.itemId); if (!item) return;
    const qty = parseNum(newMovementForm.qty); const isAddition = newMovementForm.type === 'ENTRADA' || newMovementForm.type === 'AJUSTE (POSITIVO)';
    if (!isAddition && (item?.stock || 0) < qty) return setDialog({title: 'Stock Insuficiente', text: `Inventario no cubre salida.`, type: 'alert'});
    const movCost = newMovementForm.cost ? parseNum(newMovementForm.cost) : (item?.cost || 0); const movId = Date.now().toString();
    try {
      const batch = writeBatch(db);
      batch.set(getDocRef('inventoryMovements', movId), { id: movId, date: newMovementForm.date, itemId: item.id, itemName: item.desc, type: newMovementForm.type, qty, cost: movCost, totalValue: qty * movCost, reference: newMovementForm.reference.toUpperCase(), opAsignada: newMovementForm.opAsignada || '', notes: newMovementForm.notes.toUpperCase(), timestamp: Date.now(), user: appUser?.name });
      batch.update(getDocRef('inventory', item.id), { stock: (item?.stock || 0) + (isAddition ? qty : -qty), cost: isAddition && movCost > 0 ? movCost : (item?.cost || 0) });
      await batch.commit(); setNewMovementForm(initialMovementForm); setDialog({title: 'Éxito', text: 'Movimiento registrado.', type: 'alert'});
    } catch (err) { setDialog({title: 'Error', text: err.message, type: 'alert'}); }
  };
  
  const handleDeleteInvItem = (id) => setDialog({ title: 'Eliminar Ítem', text: `¿Eliminar ${id}?`, type: 'confirm', onConfirm: async () => await deleteDoc(getDocRef('inventory', id))});
  const handleDeleteMovement = (m) => setDialog({ title: 'Anular Movimiento', text: `¿Revertir movimiento?`, type: 'confirm', onConfirm: async () => {
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
  // LÓGICA VENTAS Y FACTURACIÓN (SELLADA / INTACTA)
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
    const valUpper = typeof value === 'string' ? value.toUpperCase() : value;
    let f = { ...newInvoiceForm, [field]: valUpper };
    if (field === 'clientRif') { const c = (clients || []).find(cl => cl.rif === value); f.clientName = c?.name || ''; f.vendedor = (c?.vendedor || '').toUpperCase(); }
    if (field === 'montoBase' || field === 'aplicaIva') {
       const base = parseNum(field === 'montoBase' ? value : f.montoBase);
       const aplica = field === 'aplicaIva' ? value : f.aplicaIva;
       const iva = aplica === 'SI' ? base * 0.16 : 0;
       f.iva = iva > 0 ? iva.toFixed(2) : '0.00';
       f.total = base > 0 ? (base + iva).toFixed(2) : base.toFixed(2);
    }
    if (field === 'iva' && f.aplicaIva === 'SI') {
       const base = parseNum(f.montoBase);
       const iva = parseNum(value);
       f.total = (base + iva).toFixed(2);
    }
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
      if (tipo === 'BOLSAS' && l > 0) {
         const pEst = (w + fu) * l * m; f.pesoMillar = pEst.toFixed(2);
         f.desc = fu > 0 ? `(${w}+${fu/2}+${fu/2})X${l}X${micFmt}MIC | ${f.color || ''}` : `${w}X${l}X${micFmt}MIC | ${f.color || ''}`;
         f.requestedKg = f.presentacion === 'KILOS' ? c.toFixed(2) : (pEst * c).toFixed(2);
      } else if (tipo === 'TERMOENCOGIBLE') { f.pesoMillar = 'N/A'; f.desc = `TERMOENCOGIBLE ${w}CM X ${micFmt}MIC | ${f.color || ''}`; f.requestedKg = c > 0 ? c.toFixed(2) : '0.00'; } else { f.pesoMillar = '0.00'; f.requestedKg = '0.00'; }
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
  // LOGICA PRODUCCIÓN Y CONTROL DE FASES (SELLADA)
  // ============================================================================
  const renderPhaseInventoryOptions = () => {
    let mainCats = [];
    if (activePhaseTab === 'extrusion') mainCats = ['Materia Prima', 'Pigmentos', 'Consumibles', 'Herramientas', 'Seguridad Industrial'];
    else if (activePhaseTab === 'impresion') mainCats = ['Tintas', 'Químicos', 'Consumibles', 'Seguridad Industrial'];
    else if (activePhaseTab === 'sellado') mainCats = ['Consumibles', 'Herramientas'];
    const grouped = {}; (inventory || []).forEach(i => { const cat = i?.category || 'Otros'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(i); });
    return (<><option value="">Seleccione Insumo...</option>
      {mainCats.map(cat => grouped[cat] && grouped[cat].length > 0 && (
        <optgroup key={cat} label={`📌 ${cat.toUpperCase()} (Recomendado)`}>
          {(grouped[cat] || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc} ({formatNum(i?.stock)} {i?.unit})</option>)}
        </optgroup>
      ))}
      {Object.keys(grouped).filter(c => !mainCats.includes(c)).map(cat => grouped[cat] && grouped[cat].length > 0 && (
        <optgroup key={cat} label={`📂 ${cat.toUpperCase()} (Otros)`}>
          {(grouped[cat] || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc} ({formatNum(i?.stock)} {i?.unit})</option>)}
        </optgroup>
      ))}
    </>);
  };

  const handleAddPhaseIng = () => {
    if (!phaseIngId || !phaseIngQty) return; const ing = (inventory || []).find(i => i?.id === phaseIngId); if (!ing) return;
    setPhaseForm({ ...phaseForm, insumos: [...(phaseForm?.insumos || []), { id: phaseIngId, qty: parseFloat(phaseIngQty) }] }); setPhaseIngId(''); setPhaseIngQty('');
  };

  const handleSavePhase = async (e) => {
    e.preventDefault();
    const req = (requirements || []).find(r => r?.id === selectedPhaseReqId); if (!req) return;
    const actionType = e.nativeEvent?.submitter?.name; const isSkip = actionType === 'skip'; const isClose = actionType === 'close';
    let currentPhase = req.production?.[activePhaseTab] || { batches: [], isClosed: false };
    if (isSkip) { currentPhase.skipped = true; currentPhase.isClosed = true; } 
    else {
        const prodKg = parseNum(phaseForm?.producedKg); const mermaKg = parseNum(phaseForm?.mermaKg);
        if (prodKg > 0 || mermaKg > 0 || (phaseForm?.insumos || []).length > 0) {
            let phaseCost = 0; let totalInsumosKg = 0;
            for (let ing of (phaseForm?.insumos || [])) {
              const item = (inventory || []).find(i => i?.id === ing?.id);
              if (item) { phaseCost += ((item?.cost || 0) * (ing?.qty || 0)); totalInsumosKg += parseFloat(ing?.qty || 0); }
            }
            
            let techParams = {};
            if(activePhaseTab === 'extrusion') techParams = { operador: phaseForm?.operadorExt, tratado: phaseForm?.tratado, motor: phaseForm?.motorExt, ventilador: phaseForm?.ventilador, jalador: phaseForm?.jalador, zonas: [phaseForm?.zona1, phaseForm?.zona2, phaseForm?.zona3, phaseForm?.zona4, phaseForm?.zona5, phaseForm?.zona6], cabezalA: phaseForm?.cabezalA, cabezalB: phaseForm?.cabezalB };
            if(activePhaseTab === 'impresion') techParams = { operador: phaseForm?.operadorImp, kgRecibidos: phaseForm?.kgRecibidosImp, cantColores: phaseForm?.cantColores, relacion: phaseForm?.relacionImp, motor: phaseForm?.motorImp, tensores: phaseForm?.tensores, temp: phaseForm?.tempImp, solvente: phaseForm?.solvente };
            if(activePhaseTab === 'sellado') techParams = { operador: phaseForm?.operadorSel, kgRecibidos: phaseForm?.kgRecibidosSel, impresa: phaseForm?.impresa, tipoSello: phaseForm?.tipoSello, tempCabezalA: phaseForm?.tempCabezalA, tempCabezalB: phaseForm?.tempCabezalB, tempPisoA: phaseForm?.tempPisoA, tempPisoB: phaseForm?.tempPisoB, velServo: phaseForm?.velServo, millares: phaseForm?.millaresProd, troquel: phaseForm?.troquelSel };

            const newBatch = { id: Date.now().toString(), timestamp: Date.now(), date: phaseForm?.date || getTodayDate(), insumos: phaseForm?.insumos || [], producedKg: prodKg, mermaKg, totalInsumosKg, cost: phaseCost, operator: appUser?.name || 'Operador', techParams };
            if (!currentPhase.batches) currentPhase.batches = []; currentPhase.batches.push(newBatch);
        }
        if (isClose) currentPhase.isClosed = true;
    }
    const newProd = { ...(req.production || {}), [activePhaseTab]: currentPhase };
    let newStatus = (activePhaseTab === 'sellado' && currentPhase.isClosed) ? 'COMPLETADO' : 'EN PROCESO';
    await updateDoc(getDocRef('requirements', req.id), { production: newProd, status: newStatus });
    setPhaseForm({ ...initialPhaseForm, date: getTodayDate() }); 
    setDialog({ title: 'Éxito', text: 'Reporte guardado.', type: 'alert' });
  };

  const handleDeleteBatch = async (reqId, phase, batchId) => {
    setDialog({ title: `ELIMINAR LOTE`, text: `¿Seguro que desea eliminar este lote parcial?`, type: 'confirm', onConfirm: async () => {
        const req = (requirements || []).find(r => r?.id === reqId); let currentPhase = { ...(req?.production?.[phase] || {}) }; const bIdx = (currentPhase.batches || []).findIndex(b => b?.id === batchId);
        if (bIdx >= 0) { currentPhase.batches.splice(bIdx, 1); }
        await updateDoc(getDocRef('requirements', reqId), { production: { ...(req?.production || {}), [phase]: currentPhase } });
    }});
  };

  const handleEditBatch = (reqId, phase, batchId) => {
    setDialog({ title: `MODIFICAR LOTE`, text: `El lote volverá al formulario para su edición. ¿Continuar?`, type: 'confirm', onConfirm: async () => {
        const req = (requirements || []).find(r => r?.id === reqId); 
        if(!req) return;
        let currentPhase = { ...(req?.production?.[phase] || {}) }; 
        const bIdx = (currentPhase.batches || []).findIndex(b => b?.id === batchId);
        if (bIdx >= 0) { 
            const batch = currentPhase.batches[bIdx]; 
            const restoreForm = { ...initialPhaseForm, date: batch?.date || getTodayDate(), producedKg: batch?.producedKg || '', mermaKg: batch?.mermaKg || '', insumos: batch?.insumos || [] };
            if(phase === 'extrusion' && batch?.techParams) {
                restoreForm.operadorExt = batch.techParams.operador || ''; restoreForm.tratado = batch.techParams.tratado || ''; restoreForm.motorExt = batch.techParams.motor || '';
                restoreForm.ventilador = batch.techParams.ventilador || ''; restoreForm.jalador = batch.techParams.jalador || '';
                restoreForm.zona1 = batch.techParams.zonas?.[0] || ''; restoreForm.zona2 = batch.techParams.zonas?.[1] || ''; restoreForm.zona3 = batch.techParams.zonas?.[2] || '';
                restoreForm.zona4 = batch.techParams.zonas?.[3] || ''; restoreForm.zona5 = batch.techParams.zonas?.[4] || ''; restoreForm.zona6 = batch.techParams.zonas?.[5] || '';
                restoreForm.cabezalA = batch.techParams.cabezalA || ''; restoreForm.cabezalB = batch.techParams.cabezalB || '';
            }
            if(phase === 'impresion' && batch?.techParams) {
                restoreForm.operadorImp = batch.techParams.operador || ''; restoreForm.kgRecibidosImp = batch.techParams.kgRecibidos || ''; restoreForm.cantColores = batch.techParams.cantColores || '';
                restoreForm.relacionImp = batch.techParams.relacion || ''; restoreForm.motorImp = batch.techParams.motor || ''; restoreForm.tensores = batch.techParams.tensores || '';
                restoreForm.tempImp = batch.techParams.temp || ''; restoreForm.solvente = batch.techParams.solvente || '';
            }
            if(phase === 'sellado' && batch?.techParams) {
                restoreForm.operadorSel = batch.techParams.operador || ''; restoreForm.kgRecibidosSel = batch.techParams.kgRecibidos || ''; restoreForm.impresa = batch.techParams.impresa || 'NO';
                restoreForm.tipoSello = batch.techParams.tipoSello || 'Sello FC'; restoreForm.tempCabezalA = batch.techParams.tempCabezalA || ''; restoreForm.tempCabezalB = batch.techParams.tempCabezalB || '';
                restoreForm.tempPisoA = batch.techParams.tempPisoA || ''; restoreForm.tempPisoB = batch.techParams.tempPisoB || ''; restoreForm.velServo = batch.techParams.velServo || '';
                restoreForm.millaresProd = batch.techParams.millares || ''; restoreForm.troquelSel = batch.techParams.troquel || '';
            }
            setPhaseForm(restoreForm);
            currentPhase.batches.splice(bIdx, 1); 
        }
        await updateDoc(getDocRef('requirements', reqId), { production: { ...(req?.production || {}), [phase]: currentPhase } });
    }});
  };

  const handleReopenPhase = async (reqId, phase) => {
    setDialog({ title: `REABRIR FASE`, text: `¿Seguro que desea reabrir esta fase para editar o añadir más lotes?`, type: 'confirm', onConfirm: async () => {
        const req = (requirements || []).find(r => r.id === reqId);
        if(!req) return;
        let currentPhase = { ...(req.production?.[phase] || {}) };
        currentPhase.isClosed = false;
        let newStatus = req.status;
        if (req.status === 'COMPLETADO') newStatus = 'EN PROCESO';
        await updateDoc(getDocRef('requirements', reqId), { production: { ...(req.production || {}), [phase]: currentPhase }, status: newStatus });
        setDialog({title: 'Éxito', text: 'La fase ha sido reabierta.', type: 'alert'});
    }});
  };

  // ============================================================================
  // LÓGICA CALCULADORA SIMULADOR
  // ============================================================================
  const handleResetCalc = () => { setCalcInputs(initialCalcInputs); };
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

  const inputCantidadSolicitada = calcInputs?.mezclaTotal || 0;
  const calcTotalMezcla = isBolsas ? (simPesoMillar > 0 ? (inputCantidadSolicitada * simPesoMillar) : 0) : inputCantidadSolicitada;
  const calcMezclaProcesada = calcTotalMezcla; 
  let calcCostoMezclaPreparada = 0;
  
  const calcIngredientesProcesados = (calcInputs?.ingredientes || []).map(ing => {
    const kg = ((ing?.pct || 0) / 100) * calcTotalMezcla; const totalCost = kg * (ing?.costo || 0); calcCostoMezclaPreparada += totalCost;
    const invItem = (inventory || []).find(i => i?.id === ing?.nombre); let desc = invItem ? invItem.desc : ing?.nombre;
    if (!invItem) { if (ing?.nombre === 'MP-0240') desc = 'PEBD 240 (ESENTTIA)'; if (ing?.nombre === 'MP-11PG4') desc = 'LINEAL 11PG4 (METALOCENO)'; if (ing?.nombre === 'MP-3003') desc = 'PEBD 3003 (BAPOLENE)'; if (ing?.nombre === 'MP-RECICLADO') desc = 'MATERIAL RECICLADO'; }
    return { ...ing, desc, kg, totalCost };
  });

  const calcCostoPromedio = calcTotalMezcla > 0 ? (calcCostoMezclaPreparada / calcTotalMezcla) : 0;
  const calcCostoMezclaProcesada = calcCostoMezclaPreparada;
  const calcMermaGlobalKg = calcMezclaProcesada * ((calcInputs?.mermaGlobalPorc || 0) / 100);
  const calcProduccionNetaKg = calcMezclaProcesada - calcMermaGlobalKg;
  const calcCostoUnitarioNeto = calcProduccionNetaKg > 0 ? (calcCostoMezclaProcesada / calcProduccionNetaKg) : 0;
  const calcRendimientoUtil = calcMezclaProcesada > 0 ? (calcProduccionNetaKg / calcMezclaProcesada) * 100 : 0;
  const calcProduccionFinalUnidades = isBolsas && simPesoMillar > 0 ? (calcProduccionNetaKg / simPesoMillar) : calcProduccionNetaKg;
  const calcCostoFinalUnidad = calcProduccionFinalUnidades > 0 ? (calcCostoMezclaProcesada / calcProduccionFinalUnidades) : 0;
  const simUmFinal = isBolsas ? 'Millares' : 'KG';

  // ============================================================================
  // RENDERIZADORES UI
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

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1530124566582-a618bc2615dc?q=80&w=2070&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
       <div className="relative z-10 bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden w-full max-w-4xl flex transform transition-all duration-500 hover:scale-[1.01] border border-white/20">
          <div className="w-1/2 bg-gradient-to-br from-gray-900 to-black p-12 flex-col justify-between hidden md:flex relative overflow-hidden shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] border-r border-gray-800">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/10 to-transparent transform -skew-x-12 pointer-events-none"></div>
             <div className="relative z-10">
               <div className="flex items-center bg-white rounded-2xl px-4 py-2 shadow-[0_10px_20px_rgba(0,0,0,0.4)] w-fit transform hover:translate-x-1 hover:-translate-y-1 transition-transform duration-300">
                  <span className="text-black font-black text-4xl leading-none drop-shadow-sm">G</span><span className="text-orange-500 font-black text-3xl mx-1 drop-shadow-sm">&amp;</span><span className="text-black font-black text-4xl leading-none drop-shadow-sm">B</span>
               </div>
               <h1 className="text-white text-3xl font-black mt-10 uppercase tracking-widest drop-shadow-lg">Supply ERP</h1>
               <p className="text-gray-300 mt-4 text-sm leading-relaxed drop-shadow-md">Sistema Integrado de Producción e Inventario para Servicios Jiret G&B C.A.</p>
             </div>
             <div className="relative z-10 text-gray-500 text-xs font-bold uppercase tracking-widest">© {new Date().getFullYear()} Todos los derechos reservados</div>
          </div>
          <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white relative z-10">
             <h2 className="text-2xl font-black text-black uppercase tracking-widest mb-2">Iniciar Sesión</h2>
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Ingresa tus credenciales de acceso</p>
             {loginError && (<div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6 uppercase border border-red-200 flex items-center gap-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"><AlertTriangle size={16}/> {loginError}</div>)}
             <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Usuario</label>
                  <div className="relative group"><User className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18}/><input type="text" value={loginData.username} onChange={e=>setLoginData({...loginData, username: e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" placeholder="EJ: ADMIN o PLANTA"/></div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Contraseña</label>
                  <div className="relative group"><Lock className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18}/><input type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" placeholder="••••••••"/></div>
                </div>
                <div className="pt-4 text-center text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300 shadow-sm"><p>Usuarios de prueba: <strong className="text-black">admin</strong> (1234) o <strong className="text-black">planta</strong> (1234)</p></div>
                <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black py-4 rounded-xl shadow-[0_8px_20px_rgba(249,115,22,0.4)] hover:shadow-[0_15px_25px_rgba(249,115,22,0.6)] hover:-translate-y-1 active:translate-y-1 uppercase tracking-widest text-xs flex justify-center items-center gap-2 mt-4 transform transition-all">ENTRAR AL SISTEMA <ArrowRight size={16}/></button>
             </form>
          </div>
       </div>
    </div>
  );

  const renderHome = () => (
    <div className="w-full max-w-6xl mx-auto py-8 animate-in fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-black uppercase tracking-widest">Panel Principal ERP</h2>
        <div className="w-24 h-1.5 bg-orange-500 mx-auto mt-4 rounded-full"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        <button onClick={() => { clearAllReports(); setActiveTab('ventas'); setVentasView('facturacion'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"><Users size={40} className="text-orange-500 mb-4" /><h3 className="text-xl font-black text-white uppercase">Ventas y Facturación</h3><p className="text-xs text-gray-400 mt-2">Directorio, OP y Facturación.</p></button>
        <button onClick={() => { clearAllReports(); setActiveTab('produccion'); setProdView('calculadora'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"><Factory size={40} className="text-orange-500 mb-4" /><h3 className="text-xl font-black text-white uppercase">Producción Planta</h3><p className="text-xs text-gray-400 mt-2">Control de Fases y Reportes.</p></button>
        <button onClick={() => { clearAllReports(); setActiveTab('inventario'); setInvView('catalogo'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"><Package size={40} className="text-orange-500 mb-4" /><h3 className="text-xl font-black text-white uppercase">Control Inventario</h3><p className="text-xs text-gray-400 mt-2">Art. 177 LISLR, Movimientos y Kardex.</p></button>
      </div>
    </div>
  );

  const renderInventoryModule = () => {
    const searchInvUpper = (invSearchTerm || '').toUpperCase();
    const filteredInventory = (inventory || []).filter(i => (i?.id || '').includes(searchInvUpper) || (i?.desc || '').includes(searchInvUpper));
    const filteredMovements = (invMovements || []).filter(m => (m?.itemId || '').toUpperCase().includes(searchInvUpper) || (m?.itemName || '').toUpperCase().includes(searchInvUpper) || (m?.reference || '').toUpperCase().includes(searchInvUpper));
    const reporte177Data = generateReport177Data();
    let grandInitialTotal = 0; let grandEntradasTotal = 0; let grandSalidasTotal = 0; let grandFinalTotal = 0;

    return (
      <div className="animate-in fade-in space-y-6">
        {invView === 'vales' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
             <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
                <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><ClipboardCheck className="text-orange-500" size={24}/> Vales de Producción</h2>
             </div>
             <div className="p-8">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                   <table className="w-full text-left whitespace-nowrap text-xs">
                     <thead className="bg-gray-100 border-b-2 border-gray-300">
                       <tr className="uppercase font-black text-[10px] tracking-widest text-black">
                         <th className="py-3 px-4 border-r">Vale / Fecha</th>
                         <th className="py-3 px-4 border-r">OP Destino</th>
                         <th className="py-3 px-4 border-r">Solicitante</th>
                         <th className="py-3 px-4 border-r">Insumos Solicitados</th>
                         <th className="py-3 px-4 border-r text-center">Estado</th>
                         <th className="py-3 px-4 text-center">Acción</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {materialRequests.map(req => (
                         <tr key={req.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 font-bold border-r">VALE-{req.id.substring(0,6)}<br/><span className="text-[9px] text-gray-500">{req.date}</span></td>
                            <td className="py-3 px-4 font-black text-orange-600 border-r">{req.opId}</td>
                            <td className="py-3 px-4 font-bold border-r">{req.requestedBy}</td>
                            <td className="py-3 px-4 border-r">
                               <ul className="text-[9px] font-bold text-gray-600">
                                  {req.items.map((it, i) => <li key={i}>• {((inventory || []).find(inv=>inv?.id===it?.id)?.desc || it?.id)} <span className="text-black">({it.qty})</span></li>)}
                               </ul>
                            </td>
                            <td className="py-3 px-4 text-center border-r">
                               <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${req.status === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{req.status}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                               {req.status === 'PENDIENTE' ? (
                                  <button onClick={() => {
                                      for(let item of req.items) {
                                          const invItem = inventory.find(i => i.id === item.id);
                                          if(!invItem || invItem.stock < item.qty) return setDialog({title: 'Stock Insuficiente', text: `No hay suficiente stock de ${invItem ? invItem.desc : item.id}.`, type: 'alert'});
                                      }
                                      setDialog({
                                          title: 'Aprobar Vale', text: 'Se descontará el material del inventario y se registrará la salida. ¿Continuar?', type: 'confirm',
                                          onConfirm: async () => {
                                              const batch = writeBatch(db);
                                              for(let item of req.items) {
                                                  const invItem = inventory.find(i => i.id === item.id);
                                                  const movId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                                                  const movCost = invItem.cost || 0;
                                                  batch.set(getDocRef('inventoryMovements', movId), {
                                                      id: movId, date: getTodayDate(), itemId: invItem.id, itemName: invItem.desc, type: 'SALIDA', qty: item.qty, cost: movCost, totalValue: item.qty * movCost, reference: `VALE-${req.id.substring(0,6)}`, opAsignada: req.opId, notes: `DESPACHO A PLANTA`, timestamp: Date.now(), user: appUser?.name
                                                  });
                                                  batch.update(getDocRef('inventory', invItem.id), { stock: invItem.stock - item.qty });
                                              }
                                              batch.update(getDocRef('materialRequests', req.id), { status: 'DESPACHADO', dispatchDate: getTodayDate(), dispatchedBy: appUser?.name });
                                              await batch.commit();
                                              setDialog({title: 'Éxito', text: 'Vale despachado.', type: 'alert'});
                                          }
                                      });
                                  }} className="bg-black text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-gray-800 transition-all shadow-md">DESPACHAR</button>
                               ) : (
                                  <span className="text-[9px] font-black text-gray-400">{req.dispatchDate}</span>
                               )}
                            </td>
                         </tr>
                       ))}
                       {materialRequests.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin vales registrados</td></tr>}
                     </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}
        {invView === 'catalogo' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Box className="text-orange-500" size={24}/> Lista de Productos (Catálogo)</h2>
               <button onClick={() => handleExportPDF('Catalogo_Inventario', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
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
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Costo ($)</label>
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
                 <table className="w-full text-left whitespace-nowrap">
                   <thead className="bg-gray-100 border-b-2 border-gray-200 print:border-black">
                     <tr className="uppercase font-black text-gray-800 text-[10px] tracking-widest print:text-black">
                       <th className="py-4 px-4">Código</th>
                       <th className="py-4 px-4">Descripción / Categoría</th>
                       <th className="py-4 px-4 text-center">Costo Unit.</th>
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
                     <p className="text-xs font-bold text-orange-600 uppercase">Los movimientos afectan directamente el catálogo y el Kardex según Art. 177 LISLR.</p>
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
                          {(inventory || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc} (Stock: {i?.stock} {i?.unit})</option>)}
                       </select>
                     </div>

                     <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Cantidad</label>
                       <input type="number" step="0.01" required value={newMovementForm.qty} onChange={e=>setNewMovementForm({...newMovementForm, qty: e.target.value})} placeholder="0.00" className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black text-lg outline-none transition-colors text-center text-black" />
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Costo Unitario ($) - Opcional para actualizar</label>
                       <input type="number" step="0.01" value={newMovementForm.cost} onChange={e=>setNewMovementForm({...newMovementForm, cost: e.target.value})} placeholder="0.00" className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black text-lg outline-none transition-colors text-center text-black" />
                     </div>

                     <div className="md:col-span-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Documento Referencia (Factura, OP, Guía)</label>
                       <input type="text" required value={newMovementForm.reference} onChange={e=>setNewMovementForm({...newMovementForm, reference: e.target.value.toUpperCase()})} placeholder="EJ: FACT-001 o OP-005" className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black text-xs uppercase outline-none transition-colors" />
                     </div>
                     
                     {invView === 'descargo' && (
                     <div className="md:col-span-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">OP Relacionada (Opcional)</label>
                       <select value={newMovementForm.opAsignada} onChange={e=>setNewMovementForm({...newMovementForm, opAsignada: e.target.value})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black uppercase text-xs outline-none transition-colors text-black">
                          <option value="">Ninguna / No Aplica</option>
                          {(requirements || []).map(r => <option key={r.id} value={r.id}>{r.id} - {r.client}</option>)}
                       </select>
                     </div>
                     )}

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
               <button onClick={() => handleExportPDF('Kardex_Inventario', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
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
                 <table className="w-full text-left whitespace-nowrap text-xs">
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
                           <td className="py-3 px-4 font-black border-r print:border-black">{m?.reference}<br/>{m?.opAsignada && <span className="text-[9px] font-black text-orange-600 block">{m.opAsignada}</span>}<span className="text-[9px] font-bold text-gray-400 print:text-black">{m?.notes}</span></td>
                           <td className="py-3 px-4 border-r print:border-black"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isPos ? 'bg-green-100 text-green-700 print:border print:border-black print:bg-transparent print:text-black' : 'bg-red-100 text-red-700 print:border print:border-black print:bg-transparent print:text-black'}`}>{m?.type}</span></td>
                           <td className="py-3 px-4 font-bold border-r print:border-black">{m?.itemId}<br/><span className="text-[9px] font-black print:text-black">{m?.itemName}</span></td>
                           <td className={`py-3 px-4 text-center font-black text-sm border-r print:border-black ${isPos ? 'text-green-600' : 'text-red-600'} print:text-black`}>{isPos ? '+' : '-'}{formatNum(m?.qty)}</td>
                           <td className="py-3 px-4 text-right font-bold text-gray-600 border-r print:border-black print:text-black">${formatNum(m?.cost)}</td>
                           <td className="py-3 px-4 text-right font-black border-r print:border-black print:text-black">${formatNum(m?.totalValue)}</td>
                           <td className="py-3 px-4 text-center no-pdf">
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

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col print:bg-white print:block print:w-full overflow-x-hidden print:overflow-visible text-black font-black">
        <header className="bg-black border-b-4 border-orange-500 sticky top-0 z-50 text-white shadow-md print:hidden no-pdf">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between h-20 items-center"><div className="flex items-center gap-4 cursor-pointer transition-transform hover:scale-105" onClick={()=>{clearAllReports(); setActiveTab('home');}}><div className="flex items-center bg-white rounded-2xl px-3 py-1"><span className="text-black font-black text-3xl leading-none">G</span><span className="text-orange-500 font-black text-2xl mx-0.5">&amp;</span><span className="text-black font-black text-3xl leading-none">B</span></div><div className="hidden sm:block border-l-2 border-gray-800 pl-4 uppercase font-black text-lg">Supply ERP</div></div><div className="flex items-center gap-5"><div className="flex items-center gap-3 bg-gray-800 px-5 py-2 rounded-2xl border border-gray-700"><ShieldCheck size={18} className="text-orange-500" /><span className="font-black text-white text-[10px] uppercase leading-none">{appUser?.name}</span></div><button onClick={() => setAppUser(null)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 p-2.5 rounded-2xl border border-gray-700"><LogOut size={20}/></button></div></div></div>
        </header>
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 flex-1 print:p-0 print:m-0 print:block">
          {activeTab !== 'home' && (
            <nav className="md:w-64 flex-shrink-0 space-y-4 print:hidden no-pdf animate-in slide-in-from-left">
              <button onClick={()=>{clearAllReports(); setActiveTab('home');}} className="w-full flex items-center justify-center gap-3 px-5 py-4 text-xs font-black rounded-2xl bg-black text-white shadow-xl hover:bg-gray-800 mb-4 transition-all active:scale-95 uppercase tracking-widest"><Home size={18} className="text-orange-500" /> INICIO</button>
              {activeTab === 'ventas' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Área Ventas</h3>
                  <button onClick={() => {clearAllReports(); setVentasView('facturacion');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'facturacion' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Receipt size={16}/> Facturación</button>
                  <button onClick={() => {clearAllReports(); setVentasView('requisiciones');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'requisiciones' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><FileText size={16}/> Requisiciones</button>
                  <button onClick={() => {clearAllReports(); setVentasView('clientes');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'clientes' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Users size={16}/> Clientes</button>
                </div>
              )}
              {activeTab === 'produccion' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Producción Planta</h3>
                  <button onClick={() => {clearAllReports(); setProdView('calculadora');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'calculadora' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><Calculator size={16}/> Simulador OP</button>
                  <button onClick={() => {clearAllReports(); setProdView('fases_produccion');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'fases_produccion' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><PlayCircle size={16}/> Control Fases</button>
                  <button onClick={() => {clearAllReports(); setProdView('historial');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'historial' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><History size={16}/> Historial y Finiquito</button>
                </div>
              )}
              {activeTab === 'inventario' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Control Inventario</h3>
                  <button onClick={() => {clearAllReports(); setInvView('vales');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'vales' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><ClipboardCheck size={16}/> Vales de Planta</button>
                  <button onClick={() => {clearAllReports(); setInvView('catalogo');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'catalogo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Box size={16}/> Catálogo</button>
                  <button onClick={() => {clearAllReports(); setInvView('cargo');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'cargo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><ArrowDownToLine size={16}/> Cargo</button>
                  <button onClick={() => {clearAllReports(); setInvView('descargo');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'descargo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><ArrowUpFromLine size={16}/> Descargo</button>
                  <button onClick={() => {clearAllReports(); setInvView('ajuste');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'ajuste' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Settings2 size={16}/> Ajuste</button>
                  <button onClick={() => {clearAllReports(); setInvView('kardex');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'kardex' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><History size={16}/> Kardex</button>
                  <button onClick={() => {clearAllReports(); setInvView('reporte177');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'reporte177' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><FileText size={16}/> Art 177 LISLR</button>
                </div>
              )}
            </nav>
          )}
          <main className={`flex-1 min-w-0 pb-12 print:pb-0 print:m-0 print:p-0 print:block print:w-full ${activeTab === 'home' ? 'flex items-center justify-center' : ''}`}>
            {activeTab === 'home' && renderHome()}
            {activeTab === 'ventas' && renderVentasModule()}
            {activeTab === 'produccion' && renderProductionModule()}
            {activeTab === 'inventario' && renderInventoryModule()}
          </main>
        </div>
        {dialog && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] print:hidden no-pdf">
            <div className="bg-white rounded-3xl shadow-2xl border-t-8 border-orange-500 p-8 w-full max-w-md transform animate-in zoom-in-95">
              <h3 className="text-xl font-black text-black uppercase mb-4 tracking-tighter">{dialog.title}</h3>
              <p className="text-sm font-bold text-gray-500 mb-8 uppercase text-center">{dialog.text}</p>
              <div className="flex gap-4">
                {dialog.type === 'confirm' && (<button onClick={() => setDialog(null)} className="flex-1 bg-gray-100 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors text-gray-800">CANCELAR</button>)}
                <button onClick={() => { if (dialog.onConfirm) dialog.onConfirm(); setDialog(null); }} className="flex-1 bg-black text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-gray-900 transition-colors">ACEPTAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

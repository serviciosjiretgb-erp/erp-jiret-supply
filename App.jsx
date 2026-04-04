import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Factory, TrendingUp, AlertTriangle, 
  ClipboardList, PlayCircle, History, FileText, Settings2, Trash2, 
  PlusCircle, Calculator, Plus, Users, UserPlus, LogOut, Lock, 
  ArrowDownToLine, ArrowUpFromLine, BarChart3, ShieldCheck, Box, Home, Edit, Printer, X, Search, Loader2, FileCheck, Beaker, CheckCircle, CheckCircle2, Receipt, ArrowRight, User, ArrowRightLeft, ClipboardEdit, Download
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
// CONFIGURACIÓN DE FIREBASE BLINDADA
// ============================================================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
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
// MAGIA: Conectamos directo a tu base de datos us-central
const db = getFirestore(app, "us-central");

// RUTAS DIRECTAS: Quitamos las carpetas ocultas para que guarde en la raíz
const getColRef = (colName) => collection(db, colName);
const getDocRef = (colName, docId) => doc(db, colName, String(docId));

const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// --- BASE DE DATOS INICIAL (INVENTARIO EXTRAÍDO DEL PDF) ---
const INITIAL_INVENTORY = [
  { id: 'MP-0240', desc: 'ESENTTIA', cost: 914.05, stock: 2325, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-11PG4', desc: 'METALOCENO', cost: 877.14, stock: 1735, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-3003', desc: 'BAPOLENE', cost: 842.16, stock: 500, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-3003-E', desc: '3003 ESENTTIA', cost: 1113.59, stock: 0, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-RECICLADO', desc: 'MATERIAL RECICLADO', cost: 1.00, stock: 9999, unit: 'kg', category: 'Materia Prima' },
  { id: 'PRI0020', desc: 'ALCOHOL ISOPROPILICO TAMBOR 160 KG', cost: 1451.15, stock: 50, unit: 'und', category: 'Químicos' },
  { id: 'PRI0784', desc: 'ALCOHOL BUTILICO (N-BUTANOL) TAMBOR 170 KG', cost: 2284.19, stock: 160, unit: 'und', category: 'Químicos' },
  { id: 'PRI1142', desc: 'MASTERBATCH WELSET BLANCO 70% WM7080', cost: 3414.52, stock: 20, unit: 'saco', category: 'Pigmentos' },
  { id: 'PRI1302', desc: 'POLIETILENO CYNPOL LL0118H (11PG4) SACO 25 KG', cost: 1157.25, stock: 25, unit: 'saco', category: 'Materia Prima' },
  { id: 'WS-1932', desc: 'BLANCO SUPERFICIE G/F', cost: 4586.61, stock: 0, unit: 'kg', category: 'Tintas' },
  { id: 'WS-1934', desc: 'ROJO PANT 485 G/F', cost: 5572.33, stock: 32, unit: 'kg', category: 'Tintas' },
  { id: 'WS-1956', desc: 'NEGRO PROCESO G/F', cost: 5210.23, stock: 47, unit: 'kg', category: 'Tintas' },
  { id: 'WS-2012', desc: 'AMARILLO PANT 123 G/F', cost: 5572.33, stock: 36, unit: 'kg', category: 'Tintas' },
  { id: 'WS-2134', desc: 'NARANJA PANT 1585 G/F', cost: 5572.33, stock: 8, unit: 'kg', category: 'Tintas' },
  { id: 'WS-2135', desc: 'ROJO PANT. 1925 G/F', cost: 5572.33, stock: 32, unit: 'kg', category: 'Tintas' },
  { id: 'WS-2136', desc: 'VERDE PANT 360 G/F', cost: 5572.33, stock: 18, unit: 'kg', category: 'Tintas' },
  { id: 'WS-2137', desc: 'GRIS PANT 422', cost: 5572.33, stock: 18, unit: 'kg', category: 'Tintas' }
];

// --- HELPERS SEGUROS ---
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

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  
  // --- ESTADO DE LOGIN ---
  const [appUser, setAppUser] = useState(null); 
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // --- NAVEGACIÓN ---
  const [activeTab, setActiveTab] = useState('home'); 
  const [ventasView, setVentasView] = useState('facturacion'); 
  const [prodView, setProdView] = useState('calculadora');
  const [invView, setInvView] = useState('catalogo');

  // --- DATOS GLOBALES ---
  const [inventory, setInventory] = useState([]);
  const [invMovements, setInvMovements] = useState([]); 
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);

  // --- UI STATES ---
  const [showNewReqPanel, setShowNewReqPanel] = useState(false);
  const [showNewInvoicePanel, setShowNewInvoicePanel] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState(''); 
  const [dialog, setDialog] = useState(null);

  // --- PDF STATES ---
  const [showGeneralInvoicesReport, setShowGeneralInvoicesReport] = useState(false);
  const [showClientReport, setShowClientReport] = useState(false);
  const [showReqReport, setShowReqReport] = useState(false);
  const [showSingleReqReport, setShowSingleReqReport] = useState(null);
  const [showSingleInvoice, setShowSingleInvoice] = useState(null);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');

  // --- FORMULARIOS VENTAS ---
  const initialClientForm = { rif: '', razonSocial: '', direccion: '', telefono: '', personaContacto: '', vendedor: '', tipoContribuyente: 'ORDINARIO', poseeCredito: 'No', diasCredito: '', productosMaquila: '', fechaCreacion: getTodayDate() };
  const [newClientForm, setNewClientForm] = useState(initialClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  
  const initialReqForm = { fecha: getTodayDate(), client: '', tipoProducto: 'BOLSAS', desc: '', ancho: '', fuelles: '', largo: '', micras: '', pesoMillar: '', presentacion: 'MILLAR', cantidad: '', requestedKg: '', color: 'NATURAL', tratamiento: 'LISO', vendedor: '' };
  const [newReqForm, setNewReqForm] = useState(initialReqForm);
  const [editingReqId, setEditingReqId] = useState(null);
  const [requisicionList, setRequisicionList] = useState([]);

  const initialInvoiceForm = { fecha: getTodayDate(), clientRif: '', clientName: '', documento: '', productoMaquilado: 'BOLSAS', vendedor: '', montoBase: '', iva: '', total: '' };
  const [newInvoiceForm, setNewInvoiceForm] = useState(initialInvoiceForm);
  const [invoiceList, setInvoiceList] = useState([]);
  const [invoiceCurrent, setInvoiceCurrent] = useState({ id: '', qty: '', price: '', dcto: '0' });

  // --- ESTADOS PRODUCCIÓN ---
  const [showWorkOrder, setShowWorkOrder] = useState(null);
  const [showPhaseReport, setShowPhaseReport] = useState(null);
  const [showFiniquito, setShowFiniquito] = useState(null);
  const [recipeEditReqId, setRecipeEditReqId] = useState(null);
  const [selectedPhaseReqId, setSelectedPhaseReqId] = useState(null);
  const [activePhaseTab, setActivePhaseTab] = useState('extrusion');
  const [phaseForm, setPhaseForm] = useState({ insumos: [], producedKg: '', mermaKg: '', grafilado: '', torta: '', millares: '', troquel: '', date: getTodayDate() });
  const [tempRecipe, setTempRecipe] = useState([]);
  const [newIngId, setNewIngId] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [phaseIngId, setPhaseIngId] = useState('');
  const [phaseIngQty, setPhaseIngQty] = useState('');

  // --- ESTADO CALCULADORA ---
  const [calcInputs, setCalcInputs] = useState({
    ingredientes: [
      { id: Date.now() + 1, nombre: 'MP-0240', pct: 80, costo: 0.96 },
      { id: Date.now() + 2, nombre: 'MP-RECICLADO', pct: 20, costo: 1.00 }
    ],
    mezclaTotal: 745,
    mermaGlobalPorc: 5,
    pesoMillar: 27.19
  });

  // --- ESTADOS INVENTARIO ---
  const initialInvItemForm = { id: '', desc: '', category: 'Materia Prima', unit: 'kg', cost: '', stock: '' };
  const [newInvItemForm, setNewInvItemForm] = useState(initialInvItemForm);
  const initialMovementForm = { date: getTodayDate(), itemId: '', type: 'ENTRADA', qty: '', cost: '', reference: '', notes: '' };
  const [newMovementForm, setNewMovementForm] = useState(initialMovementForm);
  const [invSearchTerm, setInvSearchTerm] = useState('');
  
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // ============================================================================
  // GENERADOR DE PDF AUTOMÁTICO
  // ============================================================================
  const handleExportPDF = (filename, isLandscape = false) => {
    const element = document.getElementById('pdf-content');
    if (!element) return;

    const printOnlyElements = element.querySelectorAll('.hidden.print\\:block');
    printOnlyElements.forEach(el => {
      el.classList.remove('hidden');
      el.classList.add('block');
    });

    const opt = {
      margin:       5,
      filename:     `${filename}_${getTodayDate()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' }
    };

    const finishExport = () => {
      printOnlyElements.forEach(el => {
        el.classList.remove('block');
        el.classList.add('hidden');
      });
    };

    if (typeof window.html2pdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        window.html2pdf().set(opt).from(element).save().then(finishExport);
      };
      document.head.appendChild(script);
    } else {
      window.html2pdf().set(opt).from(element).save().then(finishExport);
    }
  };

  // ============================================================================
  // EXPORTADOR A EXCEL (.XLS) HTML -> EXCEL
  // ============================================================================
  const handleExportExcel = (tableId, filename) => {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tableClone = table.cloneNode(true);
    
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }
          th, td { border: 1px solid #000000; padding: 5px; }
          th { text-align: center; }
          .bg-black { background-color: #000000; color: #ffffff; font-weight: bold; }
          .bg-gray-100 { background-color: #f3f4f6; font-weight: bold; }
          .bg-gray-200 { background-color: #e5e7eb; font-weight: bold; text-align: center; }
          .bg-gray-50 { background-color: #f9fafb; font-weight: bold; }
          .bg-green-50 { background-color: #f0fdf4; }
          .bg-red-50 { background-color: #fef2f2; }
          .bg-blue-50 { background-color: #eff6ff; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .text-green-700 { color: #15803d; }
          .text-red-700 { color: #b91c1c; }
          .text-blue-700 { color: #1d4ed8; }
        </style>
      </head>
      <body>
        <h2>SERVICIOS JIRET G&B, C.A. - RIF: J-412309374</h2>
        <h3>REPORTE GENERAL DE INVENTARIO (ART. 177 LISLR) - PERÍODO: ${reportMonth.toString().padStart(2, '0')} / ${reportYear}</h3>
        <br/>
        ${tableClone.outerHTML}
      </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${getTodayDate()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
  // FIREBASE SYNC
  // ============================================================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { 
          await signInWithCustomToken(auth, __initial_auth_token); 
        } else { 
          await signInAnonymously(auth); 
        }
      } catch (err) { console.error("Error Auth:", err); }
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
    }, (e) => console.error("Inventario FB error:", e));
    
    const unsubMovs = onSnapshot(getColRef('inventoryMovements'), (s) => setInvMovements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))), (e) => console.error("Movimientos FB error:", e));
    const unsubCli = onSnapshot(getColRef('clientes'), (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() }))), (e) => console.error("Clientes FB error:", e));
    const unsubReq = onSnapshot(getColRef('requirements'), (s) => setRequirements(s.docs.map(d => ({ id: d.id, ...d.data() }))), (e) => console.error("Requisiciones FB error:", e));
    const unsubInvB = onSnapshot(getColRef('maquilaInvoices'), (s) => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))), (e) => console.error("Facturas FB error:", e));
    const unsubOrd = onSnapshot(getColRef('productionOrders'), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))), (e) => console.error("Ordenes FB error:", e));
    
    return () => { unsubInv(); unsubMovs(); unsubCli(); unsubReq(); unsubInvB(); unsubOrd(); };
  }, [fbUser]);

  const clearAllReports = () => {
    setShowReqReport(false); setShowClientReport(false); setShowGeneralInvoicesReport(false);
    setShowNewReqPanel(false); setShowNewInvoicePanel(false); 
    setRequisicionList([]); setInvoiceList([]);
    setEditingClientId(null); setEditingReqId(null); setShowSingleReqReport(null);
    setShowSingleInvoice(null); setInvoiceSearchTerm('');
    setShowWorkOrder(null); setShowPhaseReport(null); setShowFiniquito(null);
    setRecipeEditReqId(null); setSelectedPhaseReqId(null);
  };

  // ============================================================================
  // LÓGICA DE INVENTARIO (ART 177 LISLR)
  // ============================================================================
  const handleSaveInvItem = async (e) => {
    e.preventDefault();
    if (!newInvItemForm.id || !newInvItemForm.desc) {
      return setDialog({ title: 'Aviso', text: 'Código y descripción son obligatorios.', type: 'alert' });
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
      setDialog({ title: 'Éxito', text: 'Artículo guardado en el catálogo.', type: 'alert' });
    } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault();
    if (!newMovementForm.itemId || !newMovementForm.qty) {
      return setDialog({title: 'Aviso', text: 'Seleccione un ítem y defina la cantidad.', type: 'alert'});
    }
    const item = inventory.find(i => i.id === newMovementForm.itemId);
    if (!item) return setDialog({title: 'Error', text: 'Ítem no encontrado en inventario.', type: 'alert'});

    const qty = parseNum(newMovementForm.qty);
    if (qty <= 0) return setDialog({title: 'Error', text: 'La cantidad debe ser mayor a 0.', type: 'alert'});

    const type = newMovementForm.type;
    const isAddition = type === 'ENTRADA' || type === 'AJUSTE (POSITIVO)';
    const stockChange = isAddition ? qty : -qty;

    if (!isAddition && item.stock < qty) {
      return setDialog({title: 'Stock Insuficiente', text: `El inventario actual (${item.stock} ${item.unit}) no cubre esta salida.`, type: 'alert'});
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
      setDialog({title: 'Éxito', text: 'Movimiento de inventario registrado (Art. 177 LISLR).', type: 'alert'});
    } catch (err) {
      setDialog({title: 'Error', text: err.message, type: 'alert'});
    }
  };

  const handleDeleteInvItem = (id) => {
    setDialog({ title: 'Eliminar Ítem', text: `¿Desea eliminar el código ${id} del catálogo?`, type: 'confirm', onConfirm: async () => { await deleteDoc(getDocRef('inventory', id)); }});
  };

  const handleDeleteMovement = (m) => {
    setDialog({ title: 'Anular Movimiento', text: `¿Desea revertir este movimiento? El inventario se ajustará automáticamente a los valores previos.`, type: 'confirm', onConfirm: async () => {
        const item = inventory.find(i => i.id === m.itemId);
        if (item) {
          const isAddition = m.type === 'ENTRADA' || m.type === 'AJUSTE (POSITIVO)';
          const stockCorrection = isAddition ? -m.qty : m.qty;
          const batch = writeBatch(db);
          batch.update(getDocRef('inventory', item.id), { stock: item.stock + stockCorrection });
          batch.delete(getDocRef('inventoryMovements', m.id));
          await batch.commit();
          setDialog({title: 'Anulado', text: 'Movimiento revertido y stock actualizado.', type: 'alert'});
        } else {
           await deleteDoc(getDocRef('inventoryMovements', m.id));
           setDialog({title: 'Anulado', text: 'Registro eliminado del historial.', type: 'alert'});
        }
    }});
  };

  // --- FUNCIÓN GENERADORA DEL REPORTE 177 ---
  const generateReport177Data = () => {
    const data = [];
    const categories = [...new Set(inventory.map(i => i.category || 'Otros'))];
    
    categories.forEach(cat => {
       const itemsInCat = inventory.filter(i => (i.category || 'Otros') === cat);
       const itemsData = itemsInCat.map(item => {
          const movs = invMovements.filter(m => m.itemId === item.id);
          
          const startDate = new Date(reportYear, reportMonth - 1, 1).getTime();
          const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59).getTime(); 
          
          let initialStock = item.stock;
          
          const movsAfterStart = movs.filter(m => m.timestamp >= startDate);
          movsAfterStart.forEach(m => {
             const isPos = m.type === 'ENTRADA' || m.type === 'AJUSTE (POSITIVO)';
             if (isPos) initialStock -= m.qty;
             else initialStock += m.qty;
          });
          
          let monthEntradasQty = 0;
          let monthEntradasCost = 0;
          let monthSalidasQty = 0;
          let monthSalidasCost = 0;
          
          const movsInMonth = movs.filter(m => m.timestamp >= startDate && m.timestamp <= endDate);
          movsInMonth.forEach(m => {
             const isPos = m.type === 'ENTRADA' || m.type === 'AJUSTE (POSITIVO)';
             if (isPos) {
                monthEntradasQty += m.qty;
                monthEntradasCost += (m.cost * m.qty);
             } else {
                monthSalidasQty += m.qty;
                monthSalidasCost += (m.cost * m.qty);
             }
          });
          
          const invFinalQty = initialStock + monthEntradasQty - monthSalidasQty;
          const invFinalCost = item.cost; 
          const invFinalTotal = invFinalQty * invFinalCost;
          const initialTotal = initialStock * item.cost;
          
          return {
             ...item,
             initialStock,
             initialTotal,
             monthEntradasQty,
             monthEntradasTotal: monthEntradasCost,
             monthEntradasProm: monthEntradasQty > 0 ? monthEntradasCost / monthEntradasQty : 0,
             monthSalidasQty,
             monthSalidasTotal: monthSalidasCost,
             monthSalidasProm: monthSalidasQty > 0 ? monthSalidasCost / monthSalidasQty : 0,
             invFinalQty,
             invFinalTotal,
             invFinalCost
          };
       });
       data.push({ category: cat, items: itemsData });
    });
    return data;
  };


  // ============================================================================
  // LOGICA VENTAS: DIRECTORIO DE CLIENTES (APROBADO)
  // ============================================================================
  const handleAddClient = async (e) => {
    if (e) e.preventDefault();
    if (!newClientForm.rif || !newClientForm.razonSocial) {
      return setDialog({ title: 'Aviso', text: 'El RIF y la Razón Social son obligatorios.', type: 'alert' });
    }

    const rifUpper = newClientForm.rif.toUpperCase().trim();
    const data = { 
      ...newClientForm, 
      name: newClientForm.razonSocial.toUpperCase().trim(), 
      rif: rifUpper, 
      timestamp: Date.now() 
    };

    try {
      await setDoc(getDocRef('clientes', rifUpper), data, { merge: true });
      setNewClientForm(initialClientForm);
      setEditingClientId(null);
      setDialog({ title: '¡Éxito!', text: 'Cliente guardado correctamente en el directorio.', type: 'alert' });
    } catch(err) { 
      setDialog({ title: 'Error', text: err.message, type: 'alert' }); 
    }
  };

  const startEditClient = (c) => {
    setEditingClientId(c.rif);
    setNewClientForm({ ...c, razonSocial: c.name });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClient = (rif) => setDialog({ title: 'Eliminar Cliente', text: `¿Desea eliminar el cliente ${rif}?`, type: 'confirm', onConfirm: async () => { await deleteDoc(getDocRef('clientes', rif)); }});

  // ============================================================================
  // LOGICA VENTAS: FACTURACIÓN (APROBADO)
  // ============================================================================
  const generateInvoiceId = () => {
    const max = (invoices || []).reduce((m, r) => {
        const docVal = r.documento || r.id || '';
        const n = parseInt(String(docVal).replace(/\D/g, ''), 10);
        return (!isNaN(n) && n > m) ? n : m;
    }, 0);
    return `FAC-${(max + 1).toString().padStart(4, '0')}`;
  };
  
  const handleInvoiceFormChange = (field, value) => {
    const valUpper = typeof value === 'string' ? value.toUpperCase() : value;
    let f = { ...newInvoiceForm, [field]: valUpper };
    if (field === 'clientRif') {
       const c = (clients || []).find(cl => cl.rif === value);
       f.clientName = c?.name || '';
       f.vendedor = (c?.vendedor || '').toUpperCase();
    }
    if (field === 'montoBase') {
       const base = parseNum(value);
       const iva = base * 0.16;
       f.iva = iva > 0 ? iva.toFixed(2) : '';
       f.total = base > 0 ? (base + iva).toFixed(2) : '';
    }
    if (field === 'iva') {
       const base = parseNum(f.montoBase);
       const iva = parseNum(value);
       f.total = (base + iva).toFixed(2);
    }
    setNewInvoiceForm(f);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if(!newInvoiceForm.clientRif || !newInvoiceForm.montoBase) return setDialog({title: 'Aviso', text: 'Selecciona un cliente e ingresa el monto base.', type: 'alert'});
    const finalInvId = newInvoiceForm.documento || generateInvoiceId();
    try {
      await setDoc(getDocRef('maquilaInvoices', finalInvId), { 
         ...newInvoiceForm, id: finalInvId, documento: finalInvId, montoBase: parseNum(newInvoiceForm.montoBase), iva: parseNum(newInvoiceForm.iva), total: parseNum(newInvoiceForm.total), timestamp: Date.now(), user: appUser?.name || 'Vendedor' 
      });
      setShowNewInvoicePanel(false); setNewInvoiceForm(initialInvoiceForm);
      setDialog({title: 'Éxito', text: 'Factura Registrada.', type: 'alert'});
    } catch(err) { setDialog({title: 'Error', text: err.message, type: 'alert'}); }
  };

  const handleDeleteInvoice = (id) => setDialog({ title: 'Eliminar Factura', text: `¿Desea eliminar la factura permanentemente?`, type: 'confirm', onConfirm: async () => { await deleteDoc(getDocRef('maquilaInvoices', id)); }});

  // ============================================================================
  // LOGICA VENTAS: REQUISICIONES (APROBADO)
  // ============================================================================
  const generateReqId = () => {
     const max = (requirements || []).reduce((m, r) => {
         const docVal = r.id || '';
         const n = parseInt(String(docVal).replace(/\D/g, ''), 10);
         return (!isNaN(n) && n > m) ? n : m;
     }, 0);
     return `OP-${(max + 1).toString().padStart(5, '0')}`;
  };
  
  const handleReqFormChange = (field, value) => {
    let f = { ...newReqForm, [field]: typeof value === 'string' ? value.toUpperCase() : value };
    if (field === 'client') {
      const selectedClient = (clients || []).find(c => c.name === (value||'').toUpperCase());
      if (selectedClient && selectedClient.vendedor) f.vendedor = selectedClient.vendedor.toUpperCase();
    }
    if (field === 'tipoProducto' && value === 'TERMOENCOGIBLE') { f.presentacion = 'KILOS'; }
    const w = parseNum(f.ancho), l = parseNum(f.largo), m = parseNum(f.micras), fuelles = parseNum(f.fuelles), c = parseNum(f.cantidad), tipo = f.tipoProducto, presentacion = f.presentacion;
    if (w > 0 && l > 0 && m > 0) {
      let pesoEstimado = 0; let descStr = ''; const micrasFormat = m < 1 && m > 0 ? Math.round(m * 1000) : m;
      if (tipo === 'BOLSAS') {
         pesoEstimado = (w + fuelles) * l * m;
         f.pesoMillar = pesoEstimado.toFixed(2);
         descStr = fuelles > 0 ? `(${w}+${fuelles/2}+${fuelles/2})X${l}X${micrasFormat}MIC | ${f.color || ''}` : `${w}X${l}X${micrasFormat}MIC | ${f.color || ''}`;
         f.requestedKg = presentacion === 'KILOS' ? c.toFixed(2) : (pesoEstimado * c).toFixed(2);
      } else if (tipo === 'TERMOENCOGIBLE') {
         pesoEstimado = w * l * m; f.pesoMillar = 'N/A'; descStr = `${w}X${l}X${micrasFormat}MIC | ${f.color || ''}`;
         f.requestedKg = c.toFixed(2);
      } else {
         pesoEstimado = w * l * m; 
         f.pesoMillar = pesoEstimado.toFixed(2);
         descStr = `${w}X${l}X${micrasFormat}MIC | ${f.color || ''}`;
         f.requestedKg = presentacion === 'KILOS' ? c > 0 ? c.toFixed(2) : '0.00' : (pesoEstimado * c).toFixed(2);
      }
      if (['ancho', 'fuelles', 'largo', 'micras', 'tipoProducto', 'color'].includes(field)) { f.desc = descStr; }
    } else {
      f.pesoMillar = tipo === 'TERMOENCOGIBLE' ? 'N/A' : '0.00';
      f.requestedKg = presentacion === 'KILOS' ? (c > 0 ? c.toFixed(2) : '0.00') : '0.00';
    }
    setNewReqForm(f);
  };

  const handleCreateRequirement = async (e) => {
    e.preventDefault();
    const opId = editingReqId ? editingReqId : generateReqId();
    const newReq = { ...newReqForm, id: opId, timestamp: editingReqId ? (requirements.find(r => r.id === editingReqId)?.timestamp || Date.now()) : Date.now(), status: editingReqId ? (requirements.find(r => r.id === editingReqId)?.status || 'PENDIENTE DE INGENIERÍA') : 'PENDIENTE DE INGENIERÍA' };
    try {
      await setDoc(getDocRef('requirements', opId), newReq, { merge: true });
      setShowNewReqPanel(false); setNewReqForm(initialReqForm); setEditingReqId(null);
      setDialog({title: 'Éxito', text: `Requisición de Producción guardada.`, type: 'alert'});
    } catch(err) { setDialog({title: 'Error', text: err.message, type: 'alert'}); }
  };

  const startEditReq = (r) => {
    setEditingReqId(r.id);
    setNewReqForm({ 
      fecha: r.fecha || getTodayDate(), client: r.client || '', tipoProducto: r.tipoProducto || 'BOLSAS', desc: r.desc || '', 
      ancho: r.ancho || '', fuelles: r.fuelles || '', largo: r.largo || '', micras: r.micras || '', 
      pesoMillar: r.tipoProducto === 'TERMOENCOGIBLE' ? 'N/A' : (r.pesoMillar || ''), presentacion: r.presentacion || 'MILLAR', 
      cantidad: r.cantidad || '', requestedKg: r.requestedKg || '', color: r.color || 'NATURAL', tratamiento: r.tratamiento || 'LISO', vendedor: r.vendedor || '' 
    });
    setRequisicionList(r.items || []);
    setShowNewReqPanel(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReq = (id) => setDialog({ title: 'Eliminar OP', text: `¿Desea eliminar la OP #${id}?`, type: 'confirm', onConfirm: async () => { await deleteDoc(getDocRef('requirements', id)); }});

  // ============================================================================
  // LOGICA PRODUCCIÓN 
  // ============================================================================
  const renderRecipeInventoryOptions = () => {
    const categories = ['Materia Prima', 'Pigmentos', 'Tintas', 'Químicos', 'Consumibles', 'Herramientas', 'Seguridad Industrial'];
    const grouped = {}; (inventory || []).forEach(i => { const cat = i.category || 'Otros'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(i); });
    return (<>
      <option value="">Seleccione Insumo / Material...</option>
      {categories.map(cat => grouped[cat] && grouped[cat].length > 0 && (
        <optgroup key={cat} label={`📌 ${cat.toUpperCase()}`}>
          {grouped[cat].map(i => <option key={i.id} value={i.id}>{i.id} - {i.desc} ({i.stock} {i.unit})</option>)}
        </optgroup>
      ))}
    </>);
  };

  const handleAddIngToRecipe = () => {
    if (!newIngId || !newIngQty) return;
    const ing = (inventory || []).find(i => i.id === newIngId); if (!ing) return;
    const req = (requirements || []).find(r => r.id === recipeEditReqId);
    const isMateriaPrima = ing.category === 'Materia Prima' || ing.category === 'Pigmentos';
    const totalQty = isMateriaPrima ? (parseFloat(newIngQty) / 100) * parseNum(req?.requestedKg) : parseFloat(newIngQty);
    setTempRecipe([...tempRecipe, { id: newIngId, percentage: isMateriaPrima ? parseFloat(newIngQty) : null, totalQty }]);
    setNewIngId(''); setNewIngQty('');
  };

  const handleSaveRecipe = async () => {
    if (tempRecipe.length === 0) return;
    const req = requirements.find(r => r.id === recipeEditReqId);
    let totalCost = 0;
    tempRecipe.forEach(ing => { const item = inventory.find(i => i.id === ing.id); if(item) totalCost += (item.cost * (ing.totalQty || 0)); });
    const costPerKg = totalCost / (parseNum(req?.requestedKg) || 1);
    await updateDoc(getDocRef('requirements', recipeEditReqId), { recipe: tempRecipe, estimatedCostPerKg: costPerKg, status: 'LISTO PARA PRODUCIR' });
    setRecipeEditReqId(null); setProdView('fases_produccion');
    setDialog({ title: 'Éxito', text: 'Fórmula asignada. Lista para producción.', type: 'alert' });
  };

  const renderPhaseInventoryOptions = () => {
    let mainCats = [];
    if (activePhaseTab === 'extrusion') mainCats = ['Materia Prima', 'Pigmentos', 'Consumibles', 'Herramientas', 'Seguridad Industrial'];
    else if (activePhaseTab === 'impresion') mainCats = ['Tintas', 'Químicos', 'Consumibles', 'Seguridad Industrial'];
    else if (activePhaseTab === 'sellado') mainCats = ['Consumibles', 'Herramientas'];
    const grouped = {}; (inventory || []).forEach(i => { const cat = i.category || 'Otros'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(i); });
    return (<>
      <option value="">Seleccione Insumo...</option>
      {mainCats.map(cat => grouped[cat] && grouped[cat].length > 0 && (
        <optgroup key={cat} label={`📌 ${cat.toUpperCase()} (Recomendado)`}>
          {grouped[cat].map(i => <option key={i.id} value={i.id}>{i.id} - {i.desc} ({i.stock} {i.unit})</option>)}
        </optgroup>
      ))}
    </>);
  };

  const handleAddPhaseIng = () => {
    if (!phaseIngId || !phaseIngQty) return;
    const ing = inventory.find(i => i.id === phaseIngId); if (!ing) return;
    setPhaseForm({ ...phaseForm, insumos: [...(phaseForm.insumos || []), { id: phaseIngId, qty: parseFloat(phaseIngQty) }] });
    setPhaseIngId(''); setPhaseIngQty('');
  };

  const handleSavePhase = async (e) => {
    e.preventDefault();
    const req = (requirements || []).find(r => r.id === selectedPhaseReqId); if (!req) return;
    const actionType = e.nativeEvent?.submitter?.name; const isSkip = actionType === 'skip'; const isClose = actionType === 'close';
    let currentPhase = req.production?.[activePhaseTab] || { batches: [], isClosed: false };
    if (isSkip) { currentPhase.skipped = true; currentPhase.isClosed = true; } 
    else {
        const prodKg = parseNum(phaseForm.producedKg); const mermaKg = parseNum(phaseForm.mermaKg);
        if (prodKg > 0 || mermaKg > 0 || (phaseForm.insumos || []).length > 0) {
            const batch = writeBatch(db); let phaseCost = 0; let totalInsumosKg = 0;
            for (let ing of (phaseForm.insumos || [])) {
              const item = inventory.find(i => i.id === ing.id);
              if (item) { phaseCost += (item.cost * ing.qty); totalInsumosKg += parseFloat(ing.qty); batch.update(getDocRef('inventory', item.id), { stock: item.stock - ing.qty }); }
            }
            await batch.commit();
            const newBatch = { id: Date.now().toString(), timestamp: Date.now(), date: phaseForm.date, insumos: phaseForm.insumos, producedKg: prodKg, mermaKg, totalInsumosKg, cost: phaseCost, operator: appUser.name };
            if (!currentPhase.batches) currentPhase.batches = []; currentPhase.batches.push(newBatch);
        }
        if (isClose) currentPhase.isClosed = true;
    }
    const newProd = { ...(req.production || {}), [activePhaseTab]: currentPhase };
    await updateDoc(getDocRef('requirements', req.id), { production: newProd, status: (activePhaseTab === 'sellado' && currentPhase.isClosed) ? 'COMPLETADO' : 'EN PROCESO' });
    setPhaseForm({ insumos: [], producedKg: '', mermaKg: '', grafilado: '', torta: '', millares: '', troquel: '', date: getTodayDate() });
    setDialog({ title: 'Éxito', text: 'Reporte guardado correctamente.', type: 'alert' });
  };

  const handleDeleteBatch = async (reqId, phase, batchId) => {
    setDialog({ title: `ELIMINAR LOTE`, text: `¿Seguro que desea eliminar este lote parcial?`, type: 'confirm', onConfirm: async () => {
        const req = requirements.find(r => r.id === reqId); let currentPhase = { ...req.production[phase] };
        const bIdx = currentPhase.batches.findIndex(b => b.id === batchId);
        if (bIdx >= 0) {
            const batch = currentPhase.batches[bIdx]; const fbBatch = writeBatch(db);
            for (let ing of batch.insumos) {
                const item = inventory.find(i => i.id === ing.id);
                if (item) fbBatch.update(getDocRef('inventory', item.id), { stock: item.stock + ing.qty });
            }
            await fbBatch.commit(); currentPhase.batches.splice(bIdx, 1);
        }
        await updateDoc(getDocRef('requirements', reqId), { production: { ...req.production, [phase]: currentPhase } });
    }});
  };

  const handleEditPhase = (reqId, phase) => {
    setDialog({ title: `MODIFICAR`, text: `¿Abrir fase para corrección?`, type: 'confirm', onConfirm: async () => {
        const req = requirements.find(r => r.id === reqId); const pData = req.production[phase];
        const newProd = { ...req.production }; delete newProd[phase];
        await updateDoc(getDocRef('requirements', reqId), { production: newProd });
        setPhaseForm({ ...pData, date: getTodayDate(), insumos: pData.batches?.[0]?.insumos || [] }); setActivePhaseTab(phase); setShowPhaseReport(null);
    }});
  };

  const handleRevertPhase = async (reqId, phase) => {
    setDialog({ title: `ELIMINAR`, text: `¿Eliminar fase por completo?`, type: 'confirm', onConfirm: async () => {
        const newProd = { ...(requirements.find(r => r.id === reqId).production) }; delete newProd[phase];
        await updateDoc(getDocRef('requirements', reqId), { production: newProd });
    }});
  };

  // --- LÓGICA CALCULADORA (SIMULADOR OP) ---
  const handleCalcChange = (field, value) => {
    setCalcInputs({ ...calcInputs, [field]: parseNum(value) });
  };

  const updateCalcIng = (id, field, value) => {
    const newIng = calcInputs.ingredientes.map(ing => 
      ing.id === id ? { ...ing, [field]: field === 'nombre' ? value : parseNum(value) } : ing
    );
    setCalcInputs({ ...calcInputs, ingredientes: newIng });
  };

  const addCalcIng = () => {
    setCalcInputs({ ...calcInputs, ingredientes: [...calcInputs.ingredientes, { id: Date.now(), nombre: '', pct: 0, costo: 0 }] });
  };

  const removeCalcIng = (id) => {
    setCalcInputs({ ...calcInputs, ingredientes: calcInputs.ingredientes.filter(i => i.id !== id) });
  };

  const calcTotalMezcla = calcInputs.mezclaTotal || 0;
  const calcMezclaProcesada = calcTotalMezcla;
  let calcCostoMezclaPreparada = 0;
  
  const calcIngredientesProcesados = calcInputs.ingredientes.map(ing => {
    const kg = (ing.pct / 100) * calcTotalMezcla;
    const totalCost = kg * ing.costo;
    calcCostoMezclaPreparada += totalCost;
    
    const invItem = (inventory || []).find(i => i.id === ing.nombre);
    let desc = invItem ? invItem.desc : ing.nombre;
    if (!invItem) {
       if (ing.nombre === 'MP-0240') desc = 'PEBD 240 (ESENTTIA)';
       if (ing.nombre === 'MP-11PG4') desc = 'LINEAL 11PG4 (METALOCENO)';
       if (ing.nombre === 'MP-3003') desc = 'PEBD 3003 (BAPOLENE)';
       if (ing.nombre === 'MP-RECICLADO') desc = 'MATERIAL RECICLADO';
    }
    return { ...ing, desc, kg, totalCost };
  });

  const calcCostoPromedio = calcTotalMezcla > 0 ? (calcCostoMezclaPreparada / calcTotalMezcla) : 0;
  const calcCostoMezclaProcesada = calcCostoMezclaPreparada;

  const calcMermaGlobalKg = calcMezclaProcesada * ((calcInputs.mermaGlobalPorc || 0) / 100);
  const calcProduccionNetaKg = calcMezclaProcesada - calcMermaGlobalKg;
  const calcRendimientoUtil = calcMezclaProcesada > 0 ? (calcProduccionNetaKg / calcMezclaProcesada) * 100 : 0;
  
  const calcCostoUnitarioNeto = calcProduccionNetaKg > 0 ? (calcCostoMezclaProcesada / calcProduccionNetaKg) : 0;
  
  const calcProduccionFinalMillares = calcInputs.pesoMillar > 0 ? (calcProduccionNetaKg / calcInputs.pesoMillar) : 0;
  const calcCostoFinalMillar = calcProduccionFinalMillares > 0 ? (calcCostoMezclaProcesada / calcProduccionFinalMillares) : 0;


  // ============================================================================
  // RENDERIZADO DE MÓDULOS
  // ============================================================================
  const ReportHeader = () => (
    <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6 print:border-black print:w-full print:flex-row">
       <div className="flex flex-col items-start w-1/2 print:w-1/2">
          <span className="text-2xl font-light tracking-widest text-gray-800 print:text-black">Supply</span>
          <div className="flex items-center -mt-2">
             <span className="text-black font-black text-[50px] leading-none">G</span>
             <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-black mx-1 print:bg-orange-500 print:text-black">&amp;</div>
             <span className="text-black font-black text-[50px] leading-none">B</span>
          </div>
       </div>
       <div className="w-1/2 text-right print:w-1/2">
           <h1 className="text-xl font-black text-black uppercase print:text-black">SERVICIOS JIRET G&amp;B, C.A.</h1>
           <p className="text-xs font-bold text-gray-700 print:text-black">RIF: J-412309374</p>
           <p className="text-[9px] font-medium text-gray-500 mt-1 uppercase print:text-black">Av. Circunvalación Nro. 02 C.C. El Dividivi Local G-9, Maracaibo.</p>
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
             {loginError && (<div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6 uppercase border border-red-200 flex items-center gap-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"><AlertTriangle size={16}/> {loginError}</div>)}
             <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Usuario</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18}/>
                    <input type="text" value={loginData.username} onChange={e=>setLoginData({...loginData, username: e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" placeholder="EJ: ADMIN o PLANTA"/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-gray-400 group-hover:text-orange-500 transition-colors z-10" size={18}/>
                    <input type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl text-sm font-black outline-none transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" placeholder="••••••••"/>
                  </div>
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
        <button onClick={() => { clearAllReports(); setActiveTab('ventas'); setVentasView('facturacion'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl">
           <Users size={40} className="text-orange-500 mb-4" />
           <h3 className="text-xl font-black text-white uppercase">Ventas y Facturación</h3>
           <p className="text-xs text-gray-400 mt-2">Directorio, OP y Facturación.</p>
        </button>
        <button onClick={() => { clearAllReports(); setActiveTab('produccion'); setProdView('calculadora'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl">
           <Factory size={40} className="text-orange-500 mb-4" />
           <h3 className="text-xl font-black text-white uppercase">Producción Planta</h3>
           <p className="text-xs text-gray-400 mt-2">Ingeniería, Órdenes y Fases.</p>
        </button>
        <button onClick={() => { clearAllReports(); setActiveTab('inventario'); setInvView('catalogo'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl">
           <Package size={40} className="text-orange-500 mb-4" />
           <h3 className="text-xl font-black text-white uppercase">Control Inventario</h3>
           <p className="text-xs text-gray-400 mt-2">Art. 177 LISLR, Movimientos y Kardex.</p>
        </button>
      </div>
    </div>
  );

  const renderInventoryModule = () => {
    const searchInvUpper = (invSearchTerm || '').toUpperCase();
    const filteredInventory = inventory.filter(i => 
      (i.id || '').toUpperCase().includes(searchInvUpper) || 
      (i.desc || '').toUpperCase().includes(searchInvUpper)
    );

    const filteredMovements = invMovements.filter(m => 
      (m.itemId || '').toUpperCase().includes(searchInvUpper) || 
      (m.itemName || '').toUpperCase().includes(searchInvUpper) ||
      (m.reference || '').toUpperCase().includes(searchInvUpper)
    );

    const reporte177Data = generateReport177Data();

    let grandInitialTotal = 0;
    let grandEntradasTotal = 0;
    let grandSalidasTotal = 0;
    let grandFinalTotal = 0;

    return (
      <div className="animate-in fade-in space-y-6">
        
        {/* VISTA 1: CATÁLOGO / CARGA INICIAL */}
        {invView === 'catalogo' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:hidden">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Box className="text-orange-500" size={24}/> Lista de Productos (Catálogo)</h2>
               <button onClick={() => handleExportPDF('Catalogo_Inventario', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
            </div>
            
            <div data-html2canvas-ignore="true" className="p-8 bg-gray-50/50 border-b border-gray-200 print:hidden">
               <form onSubmit={handleSaveInvItem} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                 <h3 className="text-sm font-black uppercase text-black border-b border-gray-100 pb-3 mb-4 tracking-widest">Nuevo Artículo / Actualizar</h3>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                   <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Código ID</label>
                     <input type="text" required value={newInvItemForm.id} onChange={e=>setNewInvItemForm({...newInvItemForm, id: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-3 font-black text-xs uppercase outline-none transition-colors" placeholder="EJ: MP-001" />
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
                   <div className="flex-1 text-right">
                      <button type="submit" className="bg-black text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-gray-800 transition-all">GUARDAR EN CATÁLOGO</button>
                   </div>
                 </div>
               </form>
            </div>

            <div id="pdf-content" className="p-8 print:p-0">
               <style>{`@media print { @page { size: landscape; margin: 10mm; } }`}</style>
               <div className="hidden print:block mb-8">
                 <ReportHeader />
                 <h1 className="text-2xl font-black text-black uppercase border-b-4 border-orange-500 pb-2">Catálogo de Inventario y Existencias</h1>
                 <p className="text-sm font-bold text-gray-500 uppercase mt-2">FECHA DE EMISIÓN: {getTodayDate()}</p>
               </div>

               <div data-html2canvas-ignore="true" className="relative max-w-2xl mb-8 print:hidden">
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
                       <th className="py-4 px-4 text-center print:hidden">Acciones</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 print:divide-black">
                     {filteredInventory.map(inv => (
                       <tr key={inv.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="py-4 px-4 font-black text-orange-600 text-xs print:text-black">{inv.id}</td>
                          <td className="py-4 px-4 font-black uppercase text-xs text-black">{inv.desc}<span className="block text-[9px] font-bold text-gray-500 mt-1 print:text-black">{inv.category}</span></td>
                          <td className="py-4 px-4 text-center font-bold text-gray-600 print:text-black">${formatNum(inv.cost)}</td>
                          <td className="py-4 px-4 text-right font-black text-blue-600 text-lg print:text-black">{formatNum(inv.stock)} <span className="text-xs text-gray-400 print:text-black">{inv.unit}</span></td>
                          <td className="py-4 px-4 text-center print:hidden">
                            <button onClick={()=>handleDeleteInvItem(inv.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
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

        {/* VISTAS DE REGISTRO DE MOVIMIENTOS (CARGO, DESCARGO, AJUSTE) */}
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
                          const item = inventory.find(i=>i.id===e.target.value);
                          setNewMovementForm({...newMovementForm, itemId: e.target.value, cost: item ? item.cost : ''});
                       }} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-4 font-black uppercase text-xs outline-none transition-colors">
                          <option value="">Seleccione...</option>
                          {inventory.map(i => <option key={i.id} value={i.id}>{i.id} - {i.desc} (Stock: {i.stock} {i.unit})</option>)}
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

        {/* VISTA 5: KARDEX / HISTORIAL */}
        {invView === 'kardex' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:hidden">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><History className="text-orange-500" size={24}/> Kardex / Historial de Movimientos</h2>
               <button onClick={() => handleExportPDF('Kardex_Inventario', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
            </div>

            <div className="p-8 print:p-0" id="pdf-content">
               <style>{`@media print { @page { size: landscape; margin: 10mm; } }`}</style>
               <div className="hidden print:block mb-8">
                 <ReportHeader />
                 <h1 className="text-2xl font-black text-black uppercase border-b-4 border-orange-500 pb-2">REPORTE DE MOVIMIENTOS POR UNIDADES</h1>
                 <p className="text-sm font-bold text-gray-500 uppercase mt-2">AL: {getTodayDate()}</p>
               </div>

               <div data-html2canvas-ignore="true" className="relative max-w-2xl mb-8 print:hidden">
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
                       <th className="py-3 px-4 text-center print:hidden">Acciones</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-black print:divide-black">
                     {filteredMovements.map(m => {
                        const isPos = m.type === 'ENTRADA' || m.type === 'AJUSTE (POSITIVO)';
                        return (
                         <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                           <td className="py-3 px-4 font-bold border-r print:border-black">{m.date}<br/><span className="text-[9px] text-gray-500 print:text-black">{m.user}</span></td>
                           <td className="py-3 px-4 font-black border-r print:border-black">{m.reference}<br/><span className="text-[9px] font-bold text-gray-400 print:text-black">{m.notes}</span></td>
                           <td className="py-3 px-4 border-r print:border-black"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isPos ? 'bg-green-100 text-green-700 print:border print:border-black print:bg-transparent print:text-black' : 'bg-red-100 text-red-700 print:border print:border-black print:bg-transparent print:text-black'}`}>{m.type}</span></td>
                           <td className="py-3 px-4 font-bold border-r print:border-black">{m.itemId}<br/><span className="text-[9px] font-black print:text-black">{m.itemName}</span></td>
                           <td className={`py-3 px-4 text-center font-black text-sm border-r print:border-black ${isPos ? 'text-green-600' : 'text-red-600'} print:text-black`}>{isPos ? '+' : '-'}{formatNum(m.qty)}</td>
                           <td className="py-3 px-4 text-right font-bold text-gray-600 border-r print:border-black print:text-black">${formatNum(m.cost)}</td>
                           <td className="py-3 px-4 text-right font-black border-r print:border-black print:text-black">${formatNum(m.totalValue)}</td>
                           <td className="py-3 px-4 text-center print:hidden">
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

        {/* VISTA 6: REPORTE GENERAL ART 177 LISLR */}
        {invView === 'reporte177' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:hidden">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><FileText className="text-orange-500" size={24}/> Reporte General (Art. 177 LISLR)</h2>
               <div className="flex gap-2">
                 <button onClick={() => handleExportExcel('reporte-177-table', 'Reporte_Inventario_177')} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"><Download size={16}/> EXPORTAR EXCEL</button>
                 <button onClick={() => handleExportPDF('Reporte_Art_177', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
               </div>
            </div>

            <div className="p-8 print:p-0" id="pdf-content">
               <style>{`
                 @media print { 
                   @page { size: landscape; margin: 5mm; } 
                   .print-tiny { font-size: 7px !important; }
                   .print-p-1 { padding: 2px !important; }
                 }
               `}</style>
               
               <div data-html2canvas-ignore="true" className="flex gap-4 mb-8 print:hidden items-end">
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

               <div className="hidden print:block mb-6">
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
                              {/* TOTAL DE LA CATEGORÍA */}
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
    const filteredClients = (clients || []).filter(c => (c.name || '').toUpperCase().includes(clientSearchTerm.toUpperCase()) || (c.rif || '').toUpperCase().includes(clientSearchTerm.toUpperCase()));
    const filteredInvoices = (invoices || []).filter(inv => (inv.documento || '').toUpperCase().includes(invoiceSearchTerm.toUpperCase()) || (inv.clientName || '').toUpperCase().includes(invoiceSearchTerm.toUpperCase()));

    if (showGeneralInvoicesReport) {
      const totalBaseGeneral = invoices.reduce((acc, curr) => acc + parseNum(curr.montoBase), 0);
      const totalIvaGeneral = invoices.reduce((acc, curr) => acc + parseNum(curr.iva), 0);
      const totalGeneral = invoices.reduce((acc, curr) => acc + parseNum(curr.total), 0);
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-screen print:p-0 text-black">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-4 print:hidden"><button onClick={() => setShowGeneralInvoicesReport(false)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase">Volver</button><button onClick={() => handleExportPDF('Reporte_General_Facturas', true)} className="bg-black text-white px-6 py-2 rounded-xl flex items-center gap-2 font-black text-xs uppercase"><Printer size={16}/> Exportar PDF</button></div>
          <ReportHeader /><h2 className="text-xl font-black text-center mb-6 uppercase border-b-2 border-orange-500 inline-block pb-1">Reporte General de Facturación</h2>
          <table className="w-full text-[10px] border-collapse border border-gray-300">
            <thead className="bg-gray-100 uppercase"><tr><th className="p-2 border">Fecha</th><th className="p-2 border">Factura</th><th className="p-2 border">Cliente</th><th className="p-2 border text-right">Base ($)</th><th className="p-2 border text-right">IVA ($)</th><th className="p-2 border text-right">Total ($)</th></tr></thead>
            <tbody>{invoices.map(i => (<tr key={i.id}><td className="p-2 border">{i.fecha}</td><td className="p-2 border font-bold">{i.documento}</td><td className="p-2 border">{i.clientName}</td><td className="p-2 border text-right">${formatNum(i.montoBase)}</td><td className="p-2 border text-right">${formatNum(i.iva)}</td><td className="p-2 border text-right font-black text-green-600">${formatNum(i.total)}</td></tr>))}</tbody>
            <tfoot className="bg-gray-100 font-black"><tr><td colSpan="3" className="p-2 border text-right">TOTALES:</td><td className="p-2 border text-right">${formatNum(totalBaseGeneral)}</td><td className="p-2 border text-right">${formatNum(totalIvaGeneral)}</td><td className="p-2 border text-right text-orange-600">${formatNum(totalGeneral)}</td></tr></tfoot>
          </table>
        </div>
      );
    }

    if (showSingleInvoice) {
      const inv = invoices.find(i => i.id === showSingleInvoice); if (!inv) return null;
      const client = clients.find(c => c.rif === inv.clientRif) || {};
      return (
        <div id="pdf-content" className="bg-white p-12 min-h-screen text-black"><div data-html2canvas-ignore="true" className="flex justify-between mb-8 print:hidden"><button onClick={() => setShowSingleInvoice(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase">Volver</button><button onClick={() => handleExportPDF(`Factura_${inv.documento}`)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg"><Printer size={16} /> Exportar PDF</button></div><ReportHeader />
          <div className="text-center my-8"><span className="text-2xl font-black uppercase border-b-4 border-orange-500 pb-2">FACTURA N° {inv.documento}</span></div>
          <div className="grid grid-cols-2 gap-4 mb-8 text-sm uppercase font-bold"><div><p>CLIENTE: {inv.clientName}</p><p>RIF: {inv.clientRif}</p><p className="text-[10px] text-gray-500">DIRECCIÓN: {client.direccion || 'N/A'}</p></div><div className="text-right"><p>FECHA: {inv.fecha}</p><p>VENDEDOR: {inv.vendedor || 'N/A'}</p></div></div>
          <table className="w-full border-collapse border-2 border-black mb-8"><thead className="bg-gray-100"><tr><th className="p-4 border-b border-black">Descripción Maquila</th><th className="p-4 border-b border-black text-center">Importe Base (USD)</th></tr></thead><tbody><tr><td className="p-4 border-r border-black font-bold text-sm">MAQUILA / PRODUCTO: {inv.productoMaquilado || 'N/A'}</td><td className="p-4 text-center font-bold text-lg">${formatNum(inv.montoBase)}</td></tr></tbody></table>
          <div className="flex justify-end"><div className="w-1/2 md:w-1/3 space-y-2 border-l-2 border-black pl-4"><div className="flex justify-between font-bold"><span>SUBTOTAL:</span><span>${formatNum(inv.montoBase)}</span></div><div className="flex justify-between font-bold"><span>IVA (16%):</span><span>${formatNum(inv.iva)}</span></div><div className="flex justify-between font-black text-xl border-t-2 border-black pt-2 text-orange-600"><span>TOTAL:</span><span>${formatNum(inv.total)}</span></div></div></div>
          <div className="mt-24 text-center font-black uppercase text-[10px]"><div className="w-48 border-t-2 border-black mx-auto pt-1">Firma / Sello Autorizado</div></div>
        </div>
      );
    }

    if (showSingleReqReport) {
      const req = requirements.find(r => r.id === showSingleReqReport); if (!req) return null;
      return (
        <div id="pdf-content" className="bg-white p-12 min-h-screen text-black shadow-xl"><div data-html2canvas-ignore="true" className="flex justify-between mb-8 print:hidden"><button onClick={() => setShowSingleReqReport(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase">Volver</button><button onClick={() => handleExportPDF(`Requisicion_${req.id}`)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg"><Printer size={16} /> Exportar PDF</button></div><ReportHeader />
          <div className="text-center my-8"><span className="text-2xl font-black uppercase border-b-4 border-orange-500 pb-2">REQUISICIÓN DE PRODUCCIÓN N° {String(req.id).replace('OP-', '').padStart(5, '0')}</span></div>
          <div className="grid grid-cols-2 gap-4 mb-6 font-bold text-sm uppercase"><div><p>CLIENTE: {req.client}</p><p className="mt-1">VENDEDOR: {req.vendedor || 'N/A'}</p></div><div className="text-right"><p>FECHA: {req.fecha}</p><p className="mt-1">TIPO: {req.tipoProducto}</p></div></div>
          <div className="border-4 border-black p-6 grid grid-cols-4 gap-4 text-center text-[10px] font-black uppercase mb-6 rounded-3xl"><div>ANCHO<br/><span className="text-lg">{req.ancho} CM</span></div><div>FUELLES<br/><span className="text-lg">{req.fuelles || '0'} CM</span></div><div>LARGO<br/><span className="text-lg">{req.largo} CM</span></div><div>MICRAS<br/><span className="text-lg">{req.micras}</span></div></div>
          <div className="bg-gray-50 p-6 flex justify-between border-2 border-black rounded-3xl"><div><span className="block text-[10px] font-black uppercase">Peso Millar Estimado</span><span className="text-xl font-black">{req.pesoMillar || 'N/A'}</span></div><div className="text-right"><span className="block text-[10px] font-black uppercase">Carga Total Planta</span><span className="text-3xl font-black text-orange-600">{formatNum(req.requestedKg)} KG</span></div></div>
          <div className="mt-32 grid grid-cols-2 gap-24 text-center font-black text-[10px] uppercase border-t-2 border-black pt-4"><div>FIRMA VENTAS</div><div>RECIBE PLANTA</div></div>
        </div>
      );
    }

    if (showClientReport) {
      return (
        <div id="pdf-content" className="bg-white p-10 min-h-screen print:p-0 text-black">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 print:hidden"><button onClick={() => setShowClientReport(false)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase">Volver</button><button onClick={() => handleExportPDF('Directorio_Clientes', true)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase"><Printer size={16}/> Exportar PDF</button></div>
          <ReportHeader /><h2 className="text-xl font-black text-center mb-8 uppercase border-b-2 border-orange-500 inline-block pb-1">Directorio de Clientes</h2>
          <table className="w-full text-[10px] border-collapse border border-gray-300">
            <thead className="bg-gray-100 uppercase"><tr><th className="p-2 border">RIF</th><th className="p-2 border">Razón Social</th><th className="p-2 border w-1/3">Dirección</th><th className="p-2 border">Teléfono</th><th className="p-2 border">Vendedor</th></tr></thead>
            <tbody>{clients.map(c => (<tr key={c.rif}><td className="p-2 border font-bold">{c.rif}</td><td className="p-2 border font-black uppercase">{c.name}</td><td className="p-2 border uppercase">{c.direccion}</td><td className="p-2 border">{c.telefono}</td><td className="p-2 border uppercase font-bold">{c.vendedor}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }

    if (showReqReport) {
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-screen print:p-0 text-black">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-4 print:hidden"><button onClick={() => setShowReqReport(false)} className="bg-gray-100 px-4 py-2 font-bold text-xs uppercase rounded-xl">Volver</button><button onClick={() => handleExportPDF('Reporte_Requisiciones', true)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase"><Printer size={16}/> Exportar PDF</button></div>
          <ReportHeader /><h2 className="text-xl font-black text-center mb-6 uppercase border-b-2 border-orange-500 inline-block pb-1">Reporte de Requisiciones (OP)</h2>
          <table className="w-full text-[10px] border-collapse border border-gray-300">
            <thead className="bg-gray-100 uppercase"><tr><th>OP N°</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Producto</th><th className="text-right">KG Estimados</th><th className="text-center">Estatus</th></tr></thead>
            <tbody>{requirements.map(r => (<tr key={r.id}><td className="p-2 border text-center">{String(r.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-2 border">{r.fecha}</td><td className="p-2 border font-bold">{r.client}</td><td className="p-2 border">{r.vendedor}</td><td className="p-2 border">{r.desc}</td><td className="p-2 border text-right font-black">{formatNum(r.requestedKg)} KG</td><td className="p-2 border text-center font-bold uppercase">{r.status}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        {ventasView === 'clientes' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b bg-white flex justify-between items-center"><h2 className="text-xl font-black uppercase flex items-center gap-3"><Users className="text-orange-500" /> DIRECTORIO DE CLIENTES</h2><button onClick={()=>setShowClientReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase">REPORTE PDF</button></div>
            <div className="p-8 bg-gray-50/50 border-b"><form onSubmit={handleAddClient} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6"><div className="grid grid-cols-1 md:grid-cols-4 gap-6"><div className="md:col-span-2"><label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Razón Social</label><input type="text" value={newClientForm.razonSocial} onChange={e=>setNewClientForm({...newClientForm, razonSocial: e.target.value.toUpperCase()})} className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-orange-500 border-2 border-transparent transition-all" /></div><div><label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">RIF</label><input type="text" disabled={!!editingClientId} value={newClientForm.rif} onChange={e=>setNewClientForm({...newClientForm, rif: e.target.value.toUpperCase()})} className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none border-2 border-transparent" /></div><div><label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Teléfono</label><input type="text" value={newClientForm.telefono} onChange={e=>setNewClientForm({...newClientForm, telefono: e.target.value})} className="w-full bg-slate-100/70 p-4 rounded-2xl font-black text-xs outline-none border-2 border-transparent" /></div></div><div className="flex justify-end pt-4"><button type="submit" className="bg-black text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-800 transition-all">GUARDAR DIRECTORIO</button></div></form></div>
            <div className="p-8"><div className="relative max-w-2xl mb-8"><Search className="absolute left-4 top-4 text-gray-400" size={18} /><input type="text" placeholder="BUSCAR POR NOMBRE O RIF..." value={clientSearchTerm} onChange={e=>setClientSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white text-black" /></div><div className="overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><thead className="bg-white border-b-2 border-gray-100"><tr className="uppercase font-black text-[10px] text-gray-400 tracking-widest"><th className="py-4 px-4">RIF</th><th className="py-4 px-4 w-1/2">Razón Social</th><th className="py-4 px-4">Contacto</th><th className="py-4 px-4 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-gray-100 text-black">{filteredClients.map(c => (<tr key={c.rif}><td className="py-5 px-4 font-black">{c.rif}</td><td className="py-5 px-4"><span className="font-black uppercase block text-sm">{c.name}</span><span className="text-[10px] font-bold text-gray-400 block">{c.direccion}</span></td><td className="py-5 px-4"><span className="font-bold text-gray-700 text-xs">{c.personaContacto}</span></td><td className="py-5 px-4 text-center"><div className="flex justify-center gap-2"><button onClick={()=>startEditClient(c)} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Edit size={16}/></button><button onClick={()=>handleDeleteClient(c.rif)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div></div>
          </div>
        )}
        {ventasView === 'facturacion' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
             <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Receipt className="text-orange-500" size={24}/> Facturación de Venta</h2><div className="flex gap-2"><button onClick={()=>setShowGeneralInvoicesReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 transition-colors">REPORTE GENERAL</button><button onClick={()=>{setShowNewInvoicePanel(!showNewInvoicePanel); setNewInvoiceForm(initialInvoiceForm);}} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-slate-800 transition-colors">{showNewInvoicePanel ? 'CANCELAR' : 'NUEVA FACTURA'}</button></div></div>
             {showNewInvoicePanel && (
                <div className="p-8 bg-gray-50/50 border-b"><form onSubmit={handleCreateInvoice} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6"><div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6"><h3 className="text-sm font-black uppercase text-black tracking-widest">Registrar Factura de Venta</h3><div className="flex items-center gap-4"><span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest shadow-sm">FACTURA NRO: {newInvoiceForm.documento || generateInvoiceId()}</span><button type="button" onClick={()=>setShowNewInvoicePanel(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button></div></div><div className="grid grid-cols-1 md:grid-cols-4 gap-6"><div className="md:col-span-2"><label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">Cliente</label><select required value={newInvoiceForm.clientRif} onChange={e=>handleInvoiceFormChange('clientRif', e.target.value)} className="w-full bg-gray-100/70 border-2 border-transparent rounded-2xl p-4 font-black text-xs outline-none focus:bg-white focus:border-orange-500 text-black"><option value="">Seleccione...</option>{clients.map(c=><option key={c.rif} value={c.rif}>{c.name}</option>)}</select></div><div><label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">Base (USD)</label><input type="number" step="0.01" required className="w-full bg-gray-100/70 border-2 border-transparent rounded-2xl p-4 text-sm font-black outline-none focus:bg-white focus:border-orange-500 text-black text-center" value={newInvoiceForm.montoBase} onChange={e=>handleInvoiceFormChange('montoBase', e.target.value)} /></div><div><label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">Total con IVA</label><div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl font-black text-orange-700 text-lg text-center shadow-inner">${formatNum(newInvoiceForm.total)}</div></div></div><div className="flex justify-end"><button type="submit" className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all">GUARDAR FACTURA DE VENTA</button></div></form></div>
             )}
             <div className="p-8"><div className="relative max-w-2xl mb-8"><Search className="absolute left-4 top-4 text-gray-400" size={18} /><input type="text" placeholder="BUSCAR FACTURA O CLIENTE..." value={invoiceSearchTerm} onChange={e=>setInvoiceSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white text-black" /></div><div className="overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><thead className="bg-white border-b-2 border-gray-100"><tr className="uppercase font-black text-gray-400 text-[10px] tracking-widest"><th className="py-4 px-4 text-black">Doc / Fecha</th><th className="py-4 px-4 text-black">Cliente</th><th className="py-4 px-4 text-right text-black">Total USD</th><th className="py-4 px-4 text-center text-black">Acciones</th></tr></thead><tbody className="divide-y">{filteredInvoices.map(inv=>(<tr key={inv.id} className="hover:bg-gray-50"><td className="py-5 px-4 font-black text-sm">{inv.documento}<br/><span className="text-[9px] text-gray-400 font-bold">{getSafeDate(inv.timestamp)}</span></td><td className="py-5 px-4 font-bold text-gray-700 uppercase">{inv.clientName}</td><td className="py-5 px-4 text-right font-black text-green-600 text-lg">${formatNum(inv.total)}</td><td className="py-5 px-4 text-center"><div className="flex justify-center gap-2"><button onClick={()=>setShowSingleInvoice(inv.id)} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-800 hover:text-white transition-all"><Printer size={16}/></button><button onClick={()=>handleDeleteInvoice(inv.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div></div>
          </div>
        )}
        {ventasView === 'requisiciones' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
             <div className="px-8 py-6 border-b bg-white flex justify-between items-center"><h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><FileText className="text-orange-500" size={24}/> REQUISICIONES OP</h2><div className="flex gap-2"><button onClick={()=>setShowReqReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 transition-colors">REPORTE GENERAL</button><button onClick={()=>{setShowNewReqPanel(!showNewReqPanel);setNewReqForm(initialReqForm);setEditingReqId(null);}} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-all">{showNewReqPanel ? 'CANCELAR' : 'NUEVA SOLICITUD'}</button></div></div>
             {showNewReqPanel && (
                <div className="p-8 bg-gray-50/50 border-b"><form onSubmit={handleCreateRequirement} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6"><div className="flex justify-between items-center border-b pb-3 mb-6"><h3 className="text-sm font-black uppercase text-black">{editingReqId ? 'EDITAR ORDEN' : 'NUEVA ORDEN'}</h3><span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl font-black text-[10px]">CORRELATIVO: {editingReqId ? String(editingReqId).replace('OP-','').padStart(5,'0') : generateReqId().replace('OP-','').padStart(5,'0')}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-4"><div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Cliente del Directorio</label><select required value={newReqForm.client} onChange={e=>handleReqFormChange('client', e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 font-black text-xs text-black outline-none focus:border-orange-500"><option value="">Seleccione...</option>{clients.map(c=><option key={c.rif} value={c.name}>{c.name}</option>)}</select></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Ancho (cm)</label><input type="number" step="0.1" value={newReqForm.ancho} onChange={e=>handleReqFormChange('ancho', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black" /></div><div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Fuelle Total (cm)</label><input type="number" step="0.1" value={newReqForm.fuelles} onChange={e=>handleReqFormChange('fuelles', e.target.value)} disabled={newReqForm.tipoProducto === 'TERMOENCOGIBLE'} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black disabled:bg-gray-100 disabled:opacity-50" /></div></div></div><div className="space-y-4"><div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Largo (cm)</label><input type="number" step="0.1" value={newReqForm.largo} onChange={e=>handleReqFormChange('largo', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black" /></div><div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Micras / Espesor</label><input type="number" step="0.001" value={newReqForm.micras} onChange={e=>handleReqFormChange('micras', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black" /></div></div></div><div className="flex justify-between items-center bg-orange-50 p-6 rounded-3xl border-2 border-orange-200 mt-6 shadow-inner"><div><span className="text-[10px] font-black text-orange-800 uppercase tracking-tighter">TOTAL CARGA ESTIMADA</span><span className="text-4xl font-black text-orange-600 block">{newReqForm.requestedKg} KG</span></div><button type="submit" className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all">GUARDAR EN PLANTA</button></div></form></div>
             )}
             <div className="p-8 overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><thead className="bg-white border-b-2 border-gray-100"><tr className="uppercase font-black text-[10px] text-gray-400 tracking-widest"><th className="py-4 px-4 text-black">N° / Fecha</th><th className="py-4 px-4 text-black w-1/2">Cliente / Descripción</th><th className="py-4 px-4 text-right text-black">KG Est.</th><th className="py-4 px-4 text-center text-black">Acciones</th></tr></thead><tbody className="divide-y divide-gray-100">{requirements.map(r=>(<tr key={r.id} className="hover:bg-gray-50 group transition-all"><td className="py-5 px-4 font-black text-orange-500">#{String(r.id).replace('OP-','').padStart(5,'0')}<br/><span className="text-[9px] text-gray-400 font-bold">{r.fecha}</span></td><td className="py-5 px-4"><span className="font-black text-black uppercase block text-sm">{r.client}</span><span className="text-[10px] text-gray-400 font-bold uppercase block">{r.desc}</span></td><td className="py-5 px-4 text-right font-black text-black text-lg">{formatNum(r.requestedKg)}</td><td className="py-5 px-4 text-center"><div className="flex justify-center gap-2"><button onClick={()=>setShowSingleReqReport(r.id)} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-800 hover:text-white transition-all" title="Imprimir"><Printer size={16}/></button><button onClick={()=>startEditReq(r)} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all" title="Editar"><Edit size={16}/></button><button onClick={()=>handleDeleteReq(r.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Eliminar"><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div>
          </div>
        )}
      </div>
    );
  };

  const renderProductionModule = () => {
    if (showWorkOrder) return renderWorkOrder();
    if (showPhaseReport) return renderPhaseReport();
    if (showFiniquito) return renderFiniquito();

    const canEdit = appUser?.role === 'Planta' || appUser?.role === 'Master';
    const activeOrders = (requirements || []).filter(r => ['LISTO PARA PRODUCIR', 'EN PROCESO'].includes(r.status));
    const completedOrders = (requirements || []).filter(r => r.status === 'COMPLETADO');
    const pendingReqs = (requirements || []).filter(r => r.status === 'PENDIENTE DE INGENIERÍA');

    return (
      <div className="animate-in fade-in space-y-6">

        {/* CALCULADORA / SIMULADOR OP */}
        {prodView === 'calculadora' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in print:border-none print:shadow-none print:m-0 print:p-0 print:block print:w-full">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:hidden">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Calculator className="text-orange-500" size={24}/> Simulador de Producción</h2>
               <button onClick={() => handleExportPDF('Simulador_Produccion', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
            </div>
            
            <div id="pdf-content" className="grid grid-cols-1 lg:grid-cols-12 gap-0 print:block print:w-full">
               <style>{`@media print { @page { size: landscape; margin: 5mm; } }`}</style>
               {/* PANEL DE CONTROLES */}
               <div data-html2canvas-ignore="true" className="lg:col-span-4 border-r border-gray-200 bg-gray-50 p-8 print:hidden space-y-8">
                 
                 {/* Bloque: Variables Base */}
                 <div>
                     <h3 className="text-xs font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">1. Variables de Mezcla</h3>
                     <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total a Preparar (KG)</label>
                          <input type="number" value={calcInputs.mezclaTotal} onChange={(e) => handleCalcChange('mezclaTotal', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-black outline-none focus:border-orange-500 text-center text-blue-600" />
                        </div>
                     </div>
                 </div>

                 {/* Bloque: Fórmula */}
                 <div>
                     <div className="flex justify-between items-end border-b border-gray-200 pb-2 mb-4">
                       <h3 className="text-xs font-black uppercase text-black">2. Fórmula de MP</h3>
                       <button onClick={addCalcIng} className="text-[9px] bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-black font-bold uppercase transition-all">+ Insumo</button>
                     </div>
                     <div className="space-y-3">
                        {calcInputs.ingredientes.map(ing => (
                           <div key={ing.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative">
                              <button onClick={() => removeCalcIng(ing.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 hover:bg-red-500 hover:text-white transition-all"><X size={12}/></button>
                              
                              <select 
                                value={ing.nombre} 
                                onChange={(e) => {
                                   const selectedId = e.target.value;
                                   let defaultCost = 0;
                                   if (selectedId === 'MP-RECICLADO') defaultCost = 1.00;
                                   else if (selectedId === 'MP-0240') defaultCost = 0.96;
                                   else if (selectedId === 'MP-11PG4') defaultCost = 0.91;
                                   else if (selectedId === 'MP-3003') defaultCost = 0.96;

                                   const invItem = (inventory || []).find(i => i.id === selectedId);
                                   const finalCost = invItem ? invItem.cost : defaultCost;
                                   
                                   const newIngs = calcInputs.ingredientes.map(i => 
                                     i.id === ing.id ? { ...i, nombre: selectedId, costo: finalCost } : i
                                   );
                                   setCalcInputs({ ...calcInputs, ingredientes: newIngs });
                                }} 
                                className="w-full text-[10px] font-bold uppercase outline-none mb-2 border-b border-gray-200 pb-1 bg-transparent text-gray-800"
                              >
                                <option value="">SELECCIONE MATERIA PRIMA...</option>
                                {(inventory || []).filter(i => i.category === 'Materia Prima' || i.category === 'Pigmentos').map(i => (
                                   <option key={i.id} value={i.id}>{i.id} - {i.desc}</option>
                                ))}
                                <option value="MP-RECICLADO">MP-RECICLADO - MATERIAL RECICLADO</option>
                                {!(inventory || []).find(i => i.id === 'MP-0240') && <option value="MP-0240">MP-0240 - PEBD 240 (ESENTTIA)</option>}
                                {!(inventory || []).find(i => i.id === 'MP-11PG4') && <option value="MP-11PG4">MP-11PG4 - LINEAL 11PG4 (METALOCENO)</option>}
                                {!(inventory || []).find(i => i.id === 'MP-3003') && <option value="MP-3003">MP-3003 - PEBD 3003 (BAPOLENE)</option>}
                              </select>
                              
                              <div className="flex gap-2 mt-1">
                                <div className="w-1/2">
                                   <label className="text-[8px] font-bold text-gray-400 uppercase">Proporción (%)</label>
                                   <input type="number" value={ing.pct} onChange={(e) => updateCalcIng(ing.id, 'pct', e.target.value)} className="w-full text-xs font-black text-center outline-none bg-gray-50 rounded p-1 border border-gray-100 text-black" />
                                </div>
                                <div className="w-1/2">
                                   <label className="text-[8px] font-bold text-gray-400 uppercase">Costo ($/KG)</label>
                                   <input type="number" step="0.01" value={ing.costo} onChange={(e) => updateCalcIng(ing.id, 'costo', e.target.value)} className="w-full text-xs font-black text-center outline-none bg-gray-50 rounded p-1 border border-gray-100 text-black" />
                                </div>
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="mt-2 text-right">
                       <span className={`text-[10px] font-black uppercase ${calcInputs.ingredientes.reduce((a,b)=>a+b.pct,0) !== 100 ? 'text-red-500' : 'text-green-500'}`}>Total Fórmula: {calcInputs.ingredientes.reduce((a,b)=>a+b.pct,0)}%</span>
                     </div>
                 </div>

                 {/* Bloque: Mermas (Globalizado a 5%) */}
                 <div>
                     <h3 className="text-xs font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">3. Proyección de Merma Global</h3>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <label className="text-[9px] font-bold text-gray-500 uppercase flex-1">Merma Global Esperada (%)</label>
                          <input type="number" step="0.1" value={calcInputs.mermaGlobalPorc} onChange={(e) => handleCalcChange('mermaGlobalPorc', e.target.value)} className="w-24 border-2 border-gray-200 rounded-lg p-2 text-xs font-black text-center text-red-500" />
                        </div>
                     </div>
                 </div>

                 {/* Bloque: Salida Final */}
                 <div>
                     <h3 className="text-xs font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">4. Conversión (Si Aplica)</h3>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <label className="text-[9px] font-bold text-gray-500 uppercase flex-1">Peso Teórico (KG/Millar)</label>
                          <input type="number" step="0.01" value={calcInputs.pesoMillar} onChange={(e) => handleCalcChange('pesoMillar', e.target.value)} className="w-24 border-2 border-gray-200 rounded-lg p-2 text-xs font-black text-center text-orange-600" />
                        </div>
                     </div>
                 </div>
               </div>

               {/* TABLA DE RESULTADO (VISTA IMPRIMIBLE) */}
               <div className="lg:col-span-8 p-10 bg-white print:w-full print:p-0">
                  <div className="hidden print:block mb-8">
                     <ReportHeader />
                     <h1 className="text-2xl font-black text-black uppercase border-b-4 border-orange-500 pb-2 mt-4">PROYECCIÓN Y COSTEO DE PRODUCCIÓN</h1>
                     <p className="text-sm font-bold text-gray-500 uppercase mt-2">FECHA DE SIMULACIÓN: {getTodayDate()}</p>
                  </div>
                  
                  <div className="overflow-x-auto rounded-xl border-2 border-gray-300 print:border-black print:rounded-none">
                     <table className="w-full text-left text-xs whitespace-nowrap print:text-[10px]">
                        <thead className="bg-gray-200 print:bg-gray-300 border-b-2 border-gray-400 print:border-black">
                           <tr className="font-black text-[10px] uppercase text-black print:text-[8px]">
                              <th className="p-3">Fase / Concepto</th>
                              <th className="p-3 text-center border-l border-gray-300 print:border-black">Cantidad</th>
                              <th className="p-3 text-center border-l border-gray-300 print:border-black">U.M.</th>
                              <th className="p-3 text-center border-l border-gray-300 print:border-black">Costo Unitario</th>
                              <th className="p-3 text-center border-l border-gray-300 print:border-black">Costo Total</th>
                              <th className="p-3 border-l border-gray-300 print:border-black">Notas / Indicadores</th>
                           </tr>
                        </thead>
                        <tbody className="text-black divide-y divide-gray-200 print:divide-black">
                           
                           {/* 1. MATERIA PRIMA */}
                           <tr><td colSpan="6" className="p-2 font-black uppercase text-[11px] bg-gray-50 print:bg-transparent print:text-[9px]">1. MATERIA PRIMA (MEZCLA)</td></tr>
                           {calcIngredientesProcesados.map(ing => (
                             <tr key={ing.id}>
                               <td className="p-2 pl-4 font-bold">{ing.desc}</td>
                               <td className="p-2 text-center">{formatNum(ing.kg)}</td>
                               <td className="p-2 text-center">kg</td>
                               <td className="p-2 text-center">${formatNum(ing.costo)}</td>
                               <td className="p-2 text-center">${formatNum(ing.totalCost)}</td>
                               <td className="p-2 text-gray-500 print:text-black">{formatNum(ing.pct)}% de la mezcla</td>
                             </tr>
                           ))}
                           <tr className="bg-gray-100 font-black border-y-2 border-gray-300 print:border-black print:bg-gray-200">
                             <td className="p-2 pl-4">TOTAL MEZCLA A PROCESAR</td>
                             <td className="p-2 text-center">{formatNum(calcTotalMezcla)}</td>
                             <td className="p-2 text-center">kg</td>
                             <td className="p-2 text-center">${formatNum(calcCostoPromedio)}</td>
                             <td className="p-2 text-center">${formatNum(calcCostoMezclaPreparada)}</td>
                             <td className="p-2">Costo promedio e ingreso a planta</td>
                           </tr>

                           {/* 2. PRODUCCIÓN Y MERMA */}
                           <tr><td colSpan="6" className="p-2 pt-4 font-black uppercase text-[11px] bg-gray-50 print:bg-transparent border-t-2 border-gray-400 print:border-black print:text-[9px]">2. FASE DE PRODUCCIÓN Y MERMA</td></tr>
                           <tr>
                             <td className="p-2 pl-4 font-bold">MERMA GLOBAL ESTIMADA</td>
                             <td className="p-2 text-center text-red-600">{formatNum(calcMermaGlobalKg)}</td>
                             <td className="p-2 text-center">kg</td>
                             <td className="p-2 text-center">$0.00</td>
                             <td className="p-2 text-center">$0.00</td>
                             <td className="p-2 text-gray-500 print:text-black">{formatNum(calcInputs.mermaGlobalPorc)}% de la mezcla procesada</td>
                           </tr>
                           <tr className="bg-gray-100 font-black border-y-2 border-gray-300 print:border-black print:bg-gray-200">
                             <td className="p-2 pl-4 text-blue-700">PRODUCCIÓN NETA (KG ÚTILES)</td>
                             <td className="p-2 text-center text-blue-700">{formatNum(calcProduccionNetaKg)}</td>
                             <td className="p-2 text-center text-blue-700">kg</td>
                             <td className="p-2 text-center text-blue-700">${formatNum(calcCostoUnitarioNeto)}</td>
                             <td className="p-2 text-center text-blue-700">${formatNum(calcCostoMezclaProcesada)}</td>
                             <td className="p-2 text-blue-700">Rendimiento Útil: {formatNum(calcRendimientoUtil)}%</td>
                           </tr>

                           {/* 3. CONVERSIÓN */}
                           {calcInputs.pesoMillar > 0 && (
                             <>
                               <tr><td colSpan="6" className="p-2 pt-4 font-black uppercase text-[11px] bg-gray-50 print:bg-transparent border-t-2 border-gray-400 print:border-black print:text-[9px]">3. CONVERSIÓN A MILLARES</td></tr>
                               <tr className="bg-green-100 print:bg-gray-300 font-black text-green-800 print:text-black border-y-2 border-gray-400 print:border-black text-[13px] print:text-[10px]">
                                 <td className="p-3 pl-4">PRODUCCIÓN FINAL ESTIMADA</td>
                                 <td className="p-3 text-center">{formatNum(calcProduccionFinalMillares)}</td>
                                 <td className="p-3 text-center">Millar</td>
                                 <td className="p-3 text-center">${formatNum(calcCostoFinalMillar)}</td>
                                 <td className="p-3 text-center">${formatNum(calcCostoMezclaProcesada)}</td>
                                 <td className="p-3 text-xs print:text-[9px] text-gray-600 print:text-black">Peso Prom.: {formatNum(calcInputs.pesoMillar)} kg/Millar</td>
                               </tr>
                             </>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* INGENIERIA (FORMULAS) */}
        {prodView === 'requisiciones' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={"bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden " + (recipeEditReqId ? 'lg:col-span-2' : 'lg:col-span-3')}>
              <div className="px-6 py-5 border-b bg-gray-50 flex items-center gap-3"><div className="bg-orange-500 p-2 rounded-lg text-white shadow-sm"><ClipboardList size={22}/></div><h2 className="text-lg font-black text-black uppercase tracking-tighter">Ingeniería de Planta</h2></div>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="p-4 text-[10px] font-black uppercase text-gray-500 text-black tracking-widest">OP N°</th><th className="p-4 text-[10px] font-black uppercase text-gray-500 text-black tracking-widest">Cliente / Producto</th><th className="p-4 text-[10px] font-black uppercase text-gray-500 text-right text-black tracking-widest">KG Solicitados</th><th className="p-4 text-center text-gray-500 text-black tracking-widest">Gestión</th></tr></thead><tbody className="divide-y divide-gray-100">{(requirements || []).filter(r => r.status === 'PENDIENTE DE INGENIERÍA').map(r => (<tr key={r.id} className="hover:bg-gray-50 group"><td className="p-4 font-black text-orange-500">#{String(r.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-4 font-bold text-black uppercase text-xs">{r.client}<br/><span className="text-[9px] font-bold text-gray-400">{r.desc}</span></td><td className="p-4 text-right font-black text-black">{formatNum(r.requestedKg)} KG</td><td className="p-4 text-center"><button onClick={() => { setRecipeEditReqId(r.id); setTempRecipe(r.recipe || []); }} className="bg-black text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-gray-800 transition-colors shadow-md">ASIGNAR RECETA</button></td></tr>))}</tbody></table></div>
            </div>
            {recipeEditReqId && canEdit && (
              <div className="lg:col-span-1 bg-white rounded-3xl shadow-xl border border-gray-200 p-8 animate-in slide-in-from-right"><div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6"><h3 className="text-md font-black uppercase text-black flex items-center gap-2"><Beaker size={18} className="text-orange-500"/> Definir Mezcla</h3><button onClick={() => setRecipeEditReqId(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button></div><div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 shadow-inner"><p className="text-[10px] font-black text-orange-800 uppercase mb-1">OP N°: {String(recipeEditReqId).replace('OP-', '').padStart(5, '0')}</p><p className="text-sm font-black text-orange-600 uppercase">{(requirements || []).find(r=>r.id===recipeEditReqId)?.desc}</p></div><div className="space-y-4"><div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1.5 tracking-widest">Materia Prima / Insumo</label><select value={newIngId} onChange={e=>setNewIngId(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs bg-gray-50 outline-none focus:bg-white focus:border-orange-500 text-black">{renderRecipeInventoryOptions()}</select></div><div className="flex gap-3 items-end"><div className="flex-1"><label className="text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Porcentaje / Cantidad</label><input type="number" step="0.001" value={newIngQty} onChange={e=>setNewIngQty(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-xs font-black outline-none focus:bg-white focus:border-orange-500 text-black" /></div><button type="button" onClick={handleAddIngToRecipe} className="bg-orange-500 text-white font-black p-3 rounded-xl hover:bg-orange-600 shadow-md h-[46px] w-[46px] flex items-center justify-center transition-all"><Plus size={20}/></button></div></div><ul className="space-y-3 mt-6 mb-8">{tempRecipe.map((ing, idx) => (<li key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm"><span className="text-[10px] font-black uppercase text-gray-800">{(inventory || []).find(i=>i.id===ing.id)?.desc || ing.id}</span><div className="flex items-center gap-3"><span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">{formatNum(ing.totalQty)}</span><button type="button" onClick={()=>handleRemoveIngFromRecipe(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div></li>))}</ul><button onClick={handleSaveRecipe} disabled={(tempRecipe || []).length === 0} className="w-full bg-black text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] flex justify-center items-center gap-2 shadow-xl shadow-black/30 hover:bg-slate-800 transition-all"><CheckCircle size={16}/> APROBAR Y ENVIAR A PLANTA</button></div>
            )}
          </div>
        )}

        {/* CONTROL DE FASES (REPORTE DIARIO) */}
        {prodView === 'fases_produccion' && (
          <div className="space-y-6">
            {!selectedPhaseReqId ? (
              <div className="p-12 bg-white rounded-3xl border border-gray-200 shadow-sm text-center animate-in fade-in"><div className="bg-black p-5 rounded-full inline-block mb-6 text-orange-500 shadow-lg"><Factory size={40}/></div><h2 className="text-2xl font-black uppercase text-black tracking-tighter mb-2">Control de Producción Activo</h2><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-10">Reporte el consumo de insumos y mermas por fase</p><div className="mt-12 border-t border-gray-200 pt-8 overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">OP N°</th><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">Cliente / Producto</th><th className="p-4 text-center text-black tracking-widest">Acción de Planta</th></tr></thead><tbody className="divide-y divide-gray-100">{(requirements || []).filter(r => ['LISTO PARA PRODUCIR', 'EN PROCESO'].includes(r.status)).map(r => (<tr key={r.id} className="group hover:bg-gray-50 transition-colors"><td className="p-4 font-black text-orange-500 text-lg">#{String(r.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-4 font-black uppercase text-sm text-black">{r.client}<br/><span className="text-[10px] text-gray-400 font-bold">{r.desc}</span></td><td className="p-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => setShowWorkOrder(r.id)} className="bg-white border-2 border-gray-100 text-gray-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all" title="Imprimir"><Printer size={16}/> ORDEN TRABAJO</button><button onClick={() => { setSelectedPhaseReqId(r.id); setActivePhaseTab('extrusion'); }} className="bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-md hover:bg-slate-800 transition-all"><PlayCircle size={16}/> ENTRAR A FASES</button></div></td></tr>))}</tbody></table></div></div>
            ) : (() => {
              const req = (requirements || []).find(r => r.id === selectedPhaseReqId); if (!req) return null;
              const cPhase = req.production?.[activePhaseTab] || { batches: [], isClosed: false };
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8"><div className="lg:col-span-1 space-y-6"><div className="bg-black rounded-3xl shadow-xl p-8 text-white relative overflow-hidden"><div className="absolute -right-6 -bottom-6 opacity-10"><Factory size={160}/></div><div className="relative z-10"><span className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase mb-4 inline-block shadow-sm">EN PRODUCCIÓN</span><h2 className="text-4xl font-black uppercase tracking-tighter mb-2">#{String(req.id).replace('OP-', '').padStart(5, '0')}</h2><p className="text-sm font-bold text-gray-300 uppercase leading-relaxed mb-6 border-b border-gray-700 pb-6">{req.client}<br/><span className="text-orange-400 text-lg">{req.desc}</span></p><div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-inner"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 tracking-widest">META A PRODUCIR:</p><p className="text-3xl font-black text-white">{formatNum(req.requestedKg)} KG</p></div></div></div><div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-3 space-y-2">{[{ id: 'extrusion', label: '1. Extrusión' }, { id: 'impresion', label: '2. Impresión' }, { id: 'sellado', label: '3. Sellado' }].map(tab => (<button key={tab.id} onClick={() => setActivePhaseTab(tab.id)} className={`w-full flex justify-between items-center p-5 rounded-2xl text-[10px] font-black uppercase transition-all ${activePhaseTab === tab.id ? 'bg-orange-50 text-orange-700 border-2 border-orange-200' : 'text-gray-500 hover:bg-gray-50'}`}><span>{tab.label}</span>{req.production?.[tab.id]?.isClosed && <CheckCircle size={18} className="text-green-500"/>}</button>))}</div></div><div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 p-8 lg:p-10"><div className="border-b-2 border-gray-100 pb-6 mb-8 flex justify-between items-center"><h3 className="text-2xl font-black uppercase text-black tracking-tighter">Fase: {activePhaseTab.toUpperCase()}</h3><button onClick={()=>setSelectedPhaseReqId(null)} className="bg-gray-100 p-2.5 rounded-xl text-gray-500 hover:text-black"><X size={18}/></button></div>{cPhase.batches && cPhase.batches.length > 0 && (<div className="mb-8 overflow-hidden rounded-2xl border border-gray-200"><table className="w-full text-center text-xs"><thead className="bg-gray-50 border-b border-gray-200"><tr className="uppercase font-black text-[9px] text-gray-500 tracking-widest"><th className="p-3 border-r border-gray-200">Fecha</th><th className="p-3 border-r border-gray-200">Producido</th><th className="p-3 border-r border-gray-200">Merma</th><th className="p-3">Borrar</th></tr></thead><tbody className="divide-y divide-gray-100 text-black">{cPhase.batches.map(b => (<tr key={b.id} className="hover:bg-gray-50"><td className="p-3 border-r border-gray-200 font-bold">{b.date}</td><td className="p-3 border-r border-gray-200 font-black text-green-600">{formatNum(b.producedKg)} kg</td><td className="p-3 border-r border-gray-200 font-black text-red-500">{formatNum(b.mermaKg)} kg</td><td className="p-3 text-center"><button onClick={() => handleDeleteBatch(req.id, activePhaseTab, b.id)} className="text-red-400 hover:text-red-600 transition-colors p-1"><Trash2 size={14} className="mx-auto"/></button></td></tr>))}</tbody></table></div>)}{cPhase.isClosed ? (<div className="text-center py-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 shadow-inner"><CheckCircle size={56} className="text-green-500 mx-auto mb-6"/><h4 className="text-xl font-black text-black uppercase tracking-widest">Esta Fase se encuentra cerrada</h4><p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Ya no se permiten reportes parciales en esta etapa.</p></div>) : (<form onSubmit={handleSavePhase} className="space-y-8"><div className="flex gap-4 items-center"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha Reporte:</label><input type="date" value={phaseForm.date} onChange={e=>setPhaseForm({...phaseForm, date: e.target.value})} className="border-2 border-gray-200 rounded-xl p-2 font-black text-xs outline-none text-black focus:border-orange-500" /></div><div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 shadow-inner"><p className="text-[10px] font-black text-orange-800 uppercase mb-4 flex items-center gap-2"><Package size={16}/> Preparación (Checklist Almacén)</p><div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[10px] font-bold text-gray-600 uppercase">{activePhaseTab === 'extrusion' && <><span>[ ] PEBD 240</span> <span>[ ] LINEAL 11PG4</span> <span>[ ] PIGMENTO</span></>}{activePhaseTab === 'impresion' && <><span>[ ] Tintas Base</span> <span>[ ] Solvente</span> <span>[ ] Sticky Back</span></>}{activePhaseTab === 'sellado' && <><span>[ ] Cinta Empaque</span> <span>[ ] Marcadores</span> <span>[ ] Hojillas</span></>}</div></div><div className="bg-gray-50 p-6 rounded-2xl border border-gray-200"><h4 className="text-[10px] font-black text-gray-600 uppercase mb-4 flex items-center gap-2"><Box size={16}/> Insumos Consumidos (Lote Actual)</h4><div className="flex gap-3 mb-6"><select value={phaseIngId} onChange={e=>setPhaseIngId(e.target.value)} className="flex-1 border-2 border-gray-200 rounded-xl p-3.5 font-black text-xs text-black outline-none focus:border-orange-500">{renderPhaseInventoryOptions()}</select><input type="number" step="0.01" value={phaseIngQty} onChange={e=>setPhaseIngQty(e.target.value)} placeholder="Cant" className="w-32 border-2 border-gray-200 rounded-xl p-3.5 text-xs font-black text-center text-black outline-none focus:border-orange-500" /><button type="button" onClick={handleAddPhaseIng} className="bg-black text-white px-5 rounded-xl shadow-md transition-all hover:bg-slate-800"><Plus size={20}/></button></div><ul className="space-y-3">{(phaseForm.insumos || []).map((ing, idx) => (<li key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><span className="text-xs font-black uppercase text-gray-800">{(inventory || []).find(i=>i.id===ing.id)?.desc || ing.id}</span><div className="flex items-center gap-4"><span className="text-sm font-black text-black bg-gray-100 px-3 py-1.5 rounded-lg">{ing.qty}</span><button type="button" onClick={()=>handleRemovePhaseIng(idx)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18}/></button></div></li>))}</ul></div><div className="grid grid-cols-2 gap-4"><div className="bg-green-50 p-4 rounded-2xl border border-green-200 shadow-inner"><label className="text-[9px] font-black text-green-800 uppercase block mb-2 tracking-widest">Producido (Bobinas/Sellado)</label><input type="number" step="0.01" value={phaseForm.producedKg} onChange={e=>setPhaseForm({...phaseForm, producedKg: e.target.value})} placeholder="0.00 KG" className="w-full border-2 border-green-300 rounded-xl p-3 text-lg font-black text-green-700 text-center outline-none focus:border-green-500" /></div><div className="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-inner"><label className="text-[9px] font-black text-red-800 uppercase block mb-2 tracking-widest">Mermas / Desperdicio</label><input type="number" step="0.01" value={phaseForm.mermaKg} onChange={e=>setPhaseForm({...phaseForm, mermaKg: e.target.value})} placeholder="0.00 KG" className="w-full border-2 border-red-300 rounded-xl p-3 text-lg font-black text-red-700 text-center outline-none focus:border-red-500" /></div></div><div className="flex flex-col md:flex-row gap-4 pt-6 border-t-2 border-gray-100"><button type="submit" name="skip" className="w-full md:w-1/4 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl uppercase text-[9px] border-2 border-gray-200 shadow-sm transition-all hover:bg-gray-200">OMITIR FASE</button><button type="submit" name="partial" className="w-full md:w-2/4 bg-blue-50 text-blue-600 font-black py-4 rounded-2xl uppercase text-[9px] border-2 border-blue-200 flex justify-center items-center gap-2 shadow-sm transition-all hover:bg-blue-100"><Plus size={16}/> GUARDAR REPORTE PARCIAL</button><button type="submit" name="close" className="w-full md:w-1/4 bg-black text-white font-black py-4 rounded-2xl uppercase text-[9px] flex justify-center items-center gap-2 shadow-xl hover:bg-slate-800 transition-all"><CheckCircle size={16}/> CERRAR FASE DEFINITIVA</button></div></form>)}</div></div>
            );
          })()}
        </div>
      )}

      {/* HISTORIAL */}
      {prodView === 'historial' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
          <div className="px-6 py-5 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-lg font-black text-black uppercase flex items-center gap-2"><History className="text-orange-500" /> Órdenes Completadas</h2><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Auditoría de Proceso</p></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">OP N°</th><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">Cliente / Producto</th><th className="p-4 text-right text-black text-[10px] font-black uppercase tracking-widest">KG Finales</th><th className="p-4 text-center text-black text-[10px] font-black uppercase tracking-widest">Acciones</th></tr></thead><tbody className="divide-y divide-gray-100 text-black">{completedOrders.map(req => (<tr key={req.id} className="hover:bg-gray-50 transition-colors group"><td className="p-4 font-black text-orange-500 text-lg">#{String(req.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-4 font-black uppercase text-xs text-black">{req.client}<br/><span className="text-[10px] font-bold text-gray-400">{req.desc}</span></td><td className="p-4 text-right font-black text-green-600 text-lg">{formatNum(req.production?.sellado?.batches?.reduce((a,b)=>a+parseNum(b.producedKg),0) || 0)} KG</td><td className="p-4 text-center"><button onClick={()=>setShowFiniquito(req.id)} className="bg-black text-white px-8 py-3 rounded-2xl text-[9px] font-black uppercase hover:bg-gray-800 shadow-md flex items-center gap-2 mx-auto transition-all"><FileText size={14}/> GENERAR FINIQUITO</button></td></tr>))}</tbody></table></div>
        </div>
      )}
    </div>
  );
};

// --- VISTAS DE IMPRESIÓN (PRODUCCIÓN) ---
const renderWorkOrder = () => {
  const req = requirements.find(r => r.id === showWorkOrder); if (!req) return null;
  return (
    <div id="pdf-content" className="bg-white p-12 print:p-0 min-h-screen text-black shadow-xl"><style>{`@media print { @page { size: portrait; margin: 10mm; } }`}</style>
      <div data-html2canvas-ignore="true" className="flex justify-between mb-8 print:hidden bg-gray-50 p-4 rounded-xl border border-gray-200">
         <button onClick={() => setShowWorkOrder(null)} className="text-gray-700 font-black text-xs uppercase bg-white border border-gray-300 px-6 py-2.5 rounded-xl">VOLVER</button>
         <button onClick={() => handleExportPDF(`OP_${req.id}`)} className="bg-black text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg text-xs uppercase transition-all hover:bg-gray-800"><Printer size={16} /> EXPORTAR PDF</button>
      </div>
      <ReportHeader />
      <div className="text-center my-6"><span className="text-xl font-black uppercase tracking-widest border-b-2 border-black pb-1">ORDEN DE TRABAJO N° {String(req.id).replace('OP-', '').padStart(5, '0')}</span></div>
      <div className="grid grid-cols-2 gap-4 mb-6 font-bold text-xs uppercase"><div><p>CLIENTE: {req.client}</p><p className="mt-2 text-gray-500 font-bold text-[10px]">PRODUCTO: {req.desc}</p></div><div className="text-right"><p>FECHA: {req.fecha || getSafeDate(req.timestamp)}</p><p className="mt-2 text-lg text-orange-600 font-black uppercase">META: {formatNum(req.requestedKg)} KG</p></div></div>
      <div className="border-4 border-black p-4 mb-6 rounded-3xl overflow-hidden"><div className="font-black text-center border-b-2 border-black mb-4 py-1 text-sm bg-gray-100 uppercase">Especificaciones y Fórmula de Extrusión</div>
        <table className="w-full text-left text-xs mb-4"><thead><tr className="font-black uppercase text-[10px] border-b border-black"><td>Insumo / Material</td><td className="text-center">Proporción (%)</td><td className="text-right">Peso Teórico (KG)</td></tr></thead>
          <tbody className="divide-y divide-gray-100">{Array.isArray(req.recipe) && req.recipe.map((r, i) => (<tr key={i} className="text-black h-8 align-middle"><td>{inventory.find(inv=>inv.id===r.id)?.desc || r.id}</td><td className="text-center">{r.percentage ? `${r.percentage}%` : 'N/A'}</td><td className="text-right font-bold">{formatNum(r.totalQty)} KG</td></tr>))}</tbody>
        </table>
        <div className="grid grid-cols-4 gap-4 text-center text-[10px] font-black uppercase border-t-2 border-black pt-4 bg-gray-50 p-2"><div>ANCHO<br/><span className="text-base">{req.ancho} CM</span></div><div>FUELLES<br/><span className="text-base">{req.fuelles || '0'} CM</span></div><div>LARGO<br/><span className="text-base">{req.largo} CM</span></div><div>MICRAS<br/><span className="text-base">{req.micras}</span></div></div>
      </div>
      <div className="mt-32 grid grid-cols-2 gap-24 text-center font-black text-[10px] uppercase border-t-2 border-black pt-4 text-black"><div>CONTROL DE CALIDAD</div><div>SUPERVISOR DE PLANTA</div></div>
    </div>
  );
};

const renderPhaseReport = () => {
  const req = requirements.find(r => r.id === showPhaseReport?.reqId); if (!req) return null;
  const pData = req.production?.[showPhaseReport.phase]; if (!pData) return null;
  return (
    <div id="pdf-content" className="bg-white p-12 print:p-0 min-h-screen text-black shadow-xl"><div data-html2canvas-ignore="true" className="flex justify-between mb-10 print:hidden bg-gray-50 p-4 rounded-xl border border-gray-200"><button onClick={() => setShowPhaseReport(null)} className="text-gray-700 font-black text-xs uppercase bg-white border border-gray-300 px-6 py-2.5 rounded-xl">VOLVER</button><button onClick={() => handleExportPDF(`ReporteFase_${showPhaseReport.phase}_OP${req.id}`)} className="bg-black text-white px-8 py-2.5 rounded-xl font-black flex items-center gap-2 text-[10px] uppercase shadow-lg hover:bg-gray-800 transition-all"><Printer size={16} /> EXPORTAR PDF</button></div>
      <ReportHeader /><h2 className="text-2xl font-black text-center my-10 uppercase border-b-4 border-orange-500 pb-2">REPORTE FASE: {showPhaseReport.phase.toUpperCase()}</h2>
      <div className="grid grid-cols-2 gap-x-10 gap-y-4 text-xs font-black uppercase mb-10"><div>CLIENTE: {req.client}</div><div>EMISIÓN: {getSafeDate(Date.now())}</div><div>OP N°: {String(req.id).replace('OP-', '').padStart(5, '0')}</div><div>VENDEDOR: {req.vendedor || 'S/N'}</div></div>
      <table className="w-full text-center border-collapse border-2 border-black text-black"><thead className="bg-gray-200"><tr><th className="p-3 border border-black text-[10px] tracking-widest">FECHA LOTE</th><th className="p-3 border border-black text-[10px] tracking-widest">PRODUCIDO (KG)</th><th className="p-3 border border-black text-[10px] tracking-widest">DESPERDICIO (KG)</th></tr></thead>
        <tbody className="divide-y divide-black">{(pData.batches || []).map((b, i)=>(<tr key={i} className="h-10 align-middle"><td className="p-3 border border-black font-bold uppercase">{b.date}</td><td className="p-3 border border-black font-black text-base">{formatNum(b.producedKg)}</td><td className="p-3 border border-black font-bold text-red-600">{formatNum(b.mermaKg)}</td></tr>))}</tbody>
      </table>
      <div className="mt-32 flex justify-between border-t-2 border-black pt-4 font-black text-[10px] uppercase text-black"><div>REVISIÓN DE PLANTA</div><div>AUTORIZACIÓN GERENCIA</div></div>
    </div>
  );
};

const renderFiniquito = () => {
  const req = requirements.find(r => r.id === showFiniquito); if (!req) return null;
  const extSum = req.production?.extrusion?.batches?.reduce((a,b)=>a+parseNum(b.producedKg),0) || 0;
  const selSum = req.production?.sellado?.batches?.reduce((a,b)=>a+parseNum(b.producedKg),0) || 0;
  const extMerma = req.production?.extrusion?.batches?.reduce((a,b)=>a+parseNum(b.mermaKg),0) || 0;
  const selMerma = req.production?.sellado?.batches?.reduce((a,b)=>a+parseNum(b.mermaKg),0) || 0;

  return (
    <div id="pdf-content" className="bg-white p-12 print:p-0 min-h-screen text-black shadow-2xl"><div data-html2canvas-ignore="true" className="flex justify-between mb-10 print:hidden bg-gray-100 p-4 rounded-xl border border-gray-200"><button onClick={() => setShowFiniquito(null)} className="text-gray-700 font-black text-xs uppercase bg-white border px-6 py-2.5 rounded-xl">VOLVER</button><button onClick={() => handleExportPDF(`Finiquito_OP_${req.id}`)} className="bg-black text-white px-8 py-2.5 rounded-xl font-black flex items-center gap-2 text-[10px] uppercase shadow-lg hover:bg-gray-800 transition-all"><Printer size={16} /> EXPORTAR PDF</button></div>
      <ReportHeader /><h2 className="text-3xl font-black text-center my-10 uppercase border-b-4 border-orange-500 pb-2 tracking-widest">FINIQUITO DE PRODUCCIÓN</h2>
      <div className="mb-10 text-sm font-black uppercase text-black"><p className="text-gray-500 text-[10px] tracking-widest">ORDEN DE PRODUCCIÓN:</p><p className="text-2xl text-orange-600 mb-6">#{String(req.id).replace('OP-','').padStart(5,'0')}</p><p className="text-gray-500 text-[10px] tracking-widest">CLIENTE:</p><p className="text-xl mb-4 border-b-2 border-gray-100">{req.client}</p><p className="text-gray-500 text-[10px] tracking-widest">DESCRIPCIÓN TÉCNICA:</p><p className="text-lg">{req.desc}</p></div>
      <div className="border-4 border-black rounded-3xl overflow-hidden shadow-2xl"><div className="bg-black text-white p-4 font-black uppercase text-xs text-center tracking-widest">RESUMEN CONSOLIDADO DEL PROCESO</div>
        <table className="w-full text-center text-xs text-black"><thead><tr className="border-b-2 border-black font-black uppercase bg-gray-200 h-10"><td className="p-3">FASE OPERATIVA</td><td className="p-3">TOTAL PRODUCIDO</td><td className="p-3">TOTAL DESPERDICIO</td><td className="p-3">% EFICIENCIA</td></tr></thead>
          <tbody className="font-bold uppercase divide-y-2 divide-gray-100">
            {req.production?.extrusion && <tr><td className="p-4 bg-gray-50 font-black">EXTRUSIÓN</td><td className="p-4 font-black text-green-600 text-base">{formatNum(extSum)} KG</td><td className="p-4 text-red-600 text-base">{formatNum(extMerma)} KG</td><td className="p-4">{extSum > 0 ? ((1 - (extMerma/extSum))*100).toFixed(2) : 0}%</td></tr>}
            {req.production?.sellado && <tr><td className="p-4 bg-gray-50 font-black">SELLADO Y CORTE</td><td className="p-4 font-black text-green-600 text-base">{formatNum(selSum)} KG</td><td className="p-4 text-red-600 text-base">{formatNum(selMerma)} KG</td><td className="p-4">{selSum > 0 ? ((1 - (selMerma/selSum))*100).toFixed(2) : 0}%</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-32 grid grid-cols-3 gap-12 text-center font-black text-[10px] uppercase border-t-2 border-black pt-4 text-black"><div>ELABORADO POR ANALISTA</div><div>SUPERVISOR DE PLANTA</div><div>AUDITORÍA INTERNA</div></div>
    </div>
  );
};

// --- ESTRUCTURA GENERAL DE LA APP ---
if (!appUser) {
  return <ErrorBoundary>{renderLogin()}</ErrorBoundary>;
}

return (
  <ErrorBoundary>
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col print:bg-white print:block print:w-full overflow-x-hidden print:overflow-visible">
      <style>{`@media print { body, html, #root { background-color: white !important; width: 100% !important; height: auto !important; overflow: visible !important; } }`}</style>
      
      <header className="bg-black border-b-4 border-orange-500 sticky top-0 z-50 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={()=>{clearAllReports(); setActiveTab('home');}}>
              <div className="flex items-center bg-white rounded-2xl px-3 py-1 shadow-inner"><span className="text-black font-black text-3xl leading-none">G</span><span className="text-orange-500 font-black text-2xl mx-0.5">&</span><span className="text-black font-black text-3xl leading-none">B</span></div>
              <div className="hidden sm:block border-l-2 border-gray-800 pl-4"><span className="font-black text-lg text-white block uppercase italic tracking-tighter">Supply ERP</span><span className="text-[9px] text-orange-400 font-black uppercase block mt-0.5 tracking-widest">Servicios Jiret G&B C.A.</span></div>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3 bg-gray-800 px-5 py-2 rounded-2xl border border-gray-700 shadow-inner"><ShieldCheck size={18} className="text-orange-500" /><div className="flex flex-col"><span className="font-black text-white text-[10px] uppercase leading-none">{appUser?.name}</span><span className="text-gray-400 text-[8px] font-black uppercase italic mt-1">{appUser?.role}</span></div></div>
              <button onClick={() => { setAppUser(null); setActiveTab('home'); }} className="text-gray-400 hover:text-white transition-all bg-gray-800 hover:bg-red-600 p-2.5 rounded-2xl border border-gray-700 shadow-lg"><LogOut size={20}/></button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 flex-1 print:p-0 print:m-0 print:max-w-full print:w-full print:block">
        {activeTab !== 'home' && (
          <nav className="md:w-64 flex-shrink-0 space-y-4 print:hidden animate-in slide-in-from-left">
            <button onClick={()=>{clearAllReports(); setActiveTab('home');}} className="w-full flex items-center justify-center gap-3 px-5 py-4 text-xs font-black rounded-2xl bg-black text-white shadow-xl hover:bg-gray-800 mb-4 uppercase tracking-widest border-2 border-gray-800 transition-all active:scale-95"><Home size={18} className="text-orange-500" /> INICIO</button>
            
            {activeTab === 'ventas' && (
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-3"><Receipt size={14} className="text-orange-500"/> Área de Ventas</h3>
                <button onClick={() => {clearAllReports(); setVentasView('facturacion');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'facturacion' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Receipt size={16}/> Facturación</button>
                <button onClick={() => {clearAllReports(); setVentasView('requisiciones');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'requisiciones' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><FileText size={16}/> Requisiciones OP</button>
                <button onClick={() => {clearAllReports(); setVentasView('clientes');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${ventasView === 'clientes' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Users size={16}/> Clientes</button>
              </div>
            )}
            
            {activeTab === 'produccion' && (
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-3"><Factory size={14} className="text-orange-500"/> Producción</h3>
                <button onClick={() => {clearAllReports(); setProdView('calculadora');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'calculadora' ? 'bg-black text-white border-black shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><Calculator size={16}/> Simulador OP</button>
                <button onClick={() => {clearAllReports(); setProdView('requisiciones');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'requisiciones' ? 'bg-black text-white border-black shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><ClipboardList size={16}/> Ingeniería</button>
                <button onClick={() => {clearAllReports(); setProdView('fases_produccion');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'fases_produccion' ? 'bg-black text-white border-black shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><PlayCircle size={16}/> Control Fases</button>
                <button onClick={() => {clearAllReports(); setProdView('historial');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'historial' ? 'bg-black text-white border-black shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><History size={16}/> Historial</button>
              </div>
            )}

            {activeTab === 'inventario' && (
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2 animate-in slide-in-from-left">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-3"><Package size={14} className="text-orange-500"/> Inventario (Art. 177)</h3>
                <button onClick={() => {clearAllReports(); setInvView('catalogo');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'catalogo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Box size={16}/> Lista de Productos</button>
                <button onClick={() => {clearAllReports(); setInvView('cargo'); setNewMovementForm({...initialMovementForm, type: 'ENTRADA'});}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'cargo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><ArrowDownToLine size={16}/> Cargo</button>
                <button onClick={() => {clearAllReports(); setInvView('descargo'); setNewMovementForm({...initialMovementForm, type: 'SALIDA'});}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'descargo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><ArrowUpFromLine size={16}/> Descargo</button>
                <button onClick={() => {clearAllReports(); setInvView('ajuste'); setNewMovementForm({...initialMovementForm, type: 'AJUSTE (POSITIVO)'});}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'ajuste' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Settings2 size={16}/> Ajuste</button>
                <button onClick={() => {clearAllReports(); setInvView('kardex');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'kardex' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><History size={16}/> Kardex</button>
                <button onClick={() => {clearAllReports(); setInvView('reporte177');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'reporte177' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><FileText size={16}/> Reporte Gral. (Art 177)</button>
              </div>
            )}
          </nav>
        )}

        <main className={`flex-1 min-w-0 pb-12 print:pb-0 print:m-0 print:p-0 print:block print:w-full ${activeTab === 'home' ? 'flex items-center justify-center print:block' : ''}`}>
          {activeTab === 'home' && (
            <div className="w-full max-w-6xl mx-auto py-8 animate-in fade-in">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-black uppercase tracking-widest">Panel Principal ERP</h2>
                <div className="w-24 h-1.5 bg-orange-500 mx-auto mt-4 rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                <button onClick={() => { clearAllReports(); setActiveTab('ventas'); setVentasView('facturacion'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl">
                   <Users size={40} className="text-orange-500 mb-4" />
                   <h3 className="text-xl font-black text-white uppercase">Ventas y Facturación</h3>
                   <p className="text-xs text-gray-400 mt-2">Directorio, OP y Facturación.</p>
                </button>
                <button onClick={() => { clearAllReports(); setActiveTab('produccion'); setProdView('calculadora'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl">
                   <Factory size={40} className="text-orange-500 mb-4" />
                   <h3 className="text-xl font-black text-white uppercase">Producción Planta</h3>
                   <p className="text-xs text-gray-400 mt-2">Ingeniería, Órdenes y Fases.</p>
                </button>
                <button onClick={() => { clearAllReports(); setActiveTab('inventario'); setInvView('catalogo'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl">
                   <Package size={40} className="text-orange-500 mb-4" />
                   <h3 className="text-xl font-black text-white uppercase">Control Inventario</h3>
                   <p className="text-xs text-gray-400 mt-2">Art. 177 LISLR, Movimientos y Kardex.</p>
                </button>
              </div>
            </div>
          )}
          {activeTab === 'ventas' && renderVentasModule()}
          {activeTab === 'produccion' && renderProductionModule()}
          {activeTab === 'inventario' && renderInventoryModule()}
        </main>
      </div>

      {dialog && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl border-t-8 border-orange-500 p-8 w-full max-w-md transform animate-in zoom-in-95">
            <h3 className="text-xl font-black text-black uppercase tracking-widest mb-4 tracking-tighter">{dialog.title}</h3>
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

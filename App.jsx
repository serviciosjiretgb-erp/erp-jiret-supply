import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Factory, TrendingUp, TrendingDown, AlertTriangle, 
  ClipboardList, PlayCircle, History, FileText, Settings2, Trash2, 
  PlusCircle, Calculator, Plus, Users, UserPlus, LogOut, Lock, 
  ArrowDownToLine, ArrowUpFromLine, BarChart3, ShieldCheck, Box, Home, Edit, Printer, X, Search, Loader2, FileCheck, Beaker, CheckCircle, CheckCircle2, Receipt, ArrowRight, User, ArrowRightLeft, ClipboardEdit, Download, Thermometer, Gauge, Save, ShoppingCart, DollarSign, Eye, RefreshCw
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
          <button onClick={() => window.location.reload()} className="bg-black text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg">Recargar Interfaz</button>
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
const db = getFirestore(app, "us-central"); 

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

// ============================================================================
// CONSTANTE DE SEGURIDAD - CLAVE ADMIN
// ============================================================================
const ADMIN_PASSWORD = '1234';

// ============================================================================
// CATEGORÍAS DE COSTOS OPERATIVOS
// ============================================================================
const COSTO_CATEGORIES = [
  'Electricidad',
  'Agua',
  'Gas',
  'Mantenimiento',
  'Salarios',
  'Alquiler',
  'Transporte',
  'Servicios',
  'Otros Gastos'
];

// --- BASE DE DATOS INICIAL ---
const INITIAL_INVENTORY = [
  { id: 'MP-0240', desc: 'ESENTTIA', cost: 0.96, stock: 2325, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-11PG4', desc: 'METALOCENO', cost: 0.91, stock: 1735, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-3003', desc: 'BAPOLENE', cost: 0.96, stock: 500, unit: 'kg', category: 'Materia Prima' },
  { id: 'MP-RECICLADO', desc: 'MATERIAL RECICLADO', cost: 1.00, stock: 9999, unit: 'kg', category: 'Materia Prima' }
];

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [appUser, setAppUser] = useState(null); 
  const [systemUsers, setSystemUsers] = useState([]); 
  const [settings, setSettings] = useState({}); 
  
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('home'); 
  const [ventasView, setVentasView] = useState('facturacion'); 
  const [prodView, setProdView] = useState('proyeccion');
  const [invView, setInvView] = useState('catalogo');
  const [invReportType, setInvReportType] = useState('entradas');

  const [inventory, setInventory] = useState([]);
  const [invMovements, setInvMovements] = useState([]); 
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invRequisitions, setInvRequisitions] = useState([]);

  // Estados para nuevos inventarios WIP y Finished Goods
  const [wipInventory, setWipInventory] = useState([]);
  const [finishedGoodsInventory, setFinishedGoodsInventory] = useState([]);

  const [dialog, setDialog] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState(''); 
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [reqToApprove, setReqToApprove] = useState(null);

  // Estados para Modal de Clave Admin
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAction, setAdminAction] = useState(null);
  const [adminActionName, setAdminActionName] = useState('');

  const [showNewReqPanel, setShowNewReqPanel] = useState(false);
  const [showNewInvoicePanel, setShowNewInvoicePanel] = useState(false);
  const [showGeneralInvoicesReport, setShowGeneralInvoicesReport] = useState(false);
  const [showClientReport, setShowClientReport] = useState(false);
  const [showReqReport, setShowReqReport] = useState(false);
  const [showSingleReqReport, setShowSingleReqReport] = useState(null);
  const [showSingleInvoice, setShowSingleInvoice] = useState(null);
  const [showMovementReceipt, setShowMovementReceipt] = useState(null);
  const [showPurchaseOrder, setShowPurchaseOrder] = useState(false);

  // Estados para Toma Física
  const [physicalCounts, setPhysicalCounts] = useState({});

  // Formularios de Configuración
  const initialUserForm = { username: '', password: '', name: '', role: 'Usuario', permissions: { ventas: false, produccion: false, inventario: false, costos: false, configuracion: false } };
  const [newUserForm, setNewUserForm] = useState(initialUserForm);
  const [editingUserId, setEditingUserId] = useState(null);

  // Formularios de Ventas
  const initialClientForm = { rif: '', razonSocial: '', direccion: '', telefono: '', personaContacto: '', vendedor: '', fechaCreacion: getTodayDate() };
  const [newClientForm, setNewClientForm] = useState(initialClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const initialReqForm = { fecha: getTodayDate(), client: '', tipoProducto: 'BOLSAS', categoria: '', desc: '', ancho: '', fuelles: '', largo: '', micras: '', pesoMillar: '', presentacion: 'MILLAR', cantidad: '', requestedKg: '', color: 'NATURAL', tratamiento: 'LISO', vendedor: '' };
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

  // Formularios Inventario
  const initialInvItemForm = { id: '', desc: '', category: 'Materia Prima', unit: 'kg', cost: '', stock: '' };
  const [newInvItemForm, setNewInvItemForm] = useState(initialInvItemForm);
  const [editingInvId, setEditingInvId] = useState(null);
  const initialMovementForm = { date: getTodayDate(), itemId: '', type: 'ENTRADA', qty: '', cost: '', reference: '', notes: '', opAsignada: '' };
  const [newMovementForm, setNewMovementForm] = useState(initialMovementForm);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // Formularios Costos Operativos
  const initialOpCostForm = { date: getTodayDate(), category: 'Electricidad', description: '', amount: '' };
  const [newOpCostForm, setNewOpCostForm] = useState(initialOpCostForm);
  const [opCosts, setOpCosts] = useState([]);
  const [costFilterCategory, setCostFilterCategory] = useState('TODAS');
  const [costFilterMonth, setCostFilterMonth] = useState('TODOS');

  // Estados para Dashboard de Reportes
  const [reportPeriod, setReportPeriod] = useState('mensual');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [showReportType, setShowReportType] = useState(null); 

  // Estados para Categorías Dinámicas de Costos
  const [costCategories, setCostCategories] = useState(COSTO_CATEGORIES);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Estados para Órdenes de Compra
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedPOItems, setSelectedPOItems] = useState([]);
  const [poProvider, setPoProvider] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [viewingPO, setViewingPO] = useState(null);

  // ============================================================================
  // EXPORTACIONES CORREGIDAS
  // ============================================================================
  const handleExportPDF = (filename, isLandscape = false) => {
    const element = document.getElementById('pdf-content'); 
    if (!element) {
      console.error('No se encontró el elemento pdf-content');
      return;
    }
    
    const printOnlyElements = element.querySelectorAll('.hidden.print\\:block, .hidden.pdf-header'); 
    printOnlyElements.forEach(el => { el.style.display = 'block'; });
    const noPdfElements = element.querySelectorAll('.no-pdf'); 
    noPdfElements.forEach(el => { el.style.display = 'none'; });

    const originalCssText = element.style.cssText; 
    const originalClasses = element.className; 
    
    // ✅ AJUSTE CRÍTICO: Dimensiones virtuales más consistentes
    const virtualWidth = isLandscape ? 1000 : 750; 
    element.className = 'bg-white text-black'; 
    element.style.width = `${virtualWidth}px`; 
    element.style.maxWidth = 'none'; 
    element.style.margin = '0';
    element.style.padding = '30px';
    
    const tables = element.querySelectorAll('table'); 
    tables.forEach(t => { 
      t.style.whiteSpace = 'normal'; 
      t.style.tableLayout = 'fixed'; 
      t.style.width = '100%'; 
      t.style.wordBreak = 'break-word'; 
    });

    const opt = { 
      margin: [15, 15, 15, 15], // ✅ Márgenes uniformes y consistentes
      filename: `${filename}_${getTodayDate()}.pdf`, 
      image: { type: 'jpeg', quality: 0.98 }, 
      html2canvas: { 
        scale: 2.5,  
        useCORS: true, 
        logging: false, 
        windowWidth: virtualWidth,
        width: virtualWidth,
        letterRendering: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('pdf-content');
          if (clonedElement) {
            clonedElement.style.width = `${virtualWidth}px`;
            clonedElement.style.maxWidth = `${virtualWidth}px`;
            clonedElement.style.padding = '30px';
            clonedElement.style.backgroundColor = '#ffffff';
          }
        }
      }, 
      jsPDF: { 
        unit: 'mm', 
        format: 'letter', 
        orientation: isLandscape ? 'landscape' : 'portrait',
        compress: true,
        putOnlyUsedFonts: true
      } 
    };

    const finishExport = () => { 
      printOnlyElements.forEach(el => { el.style.display = ''; }); 
      noPdfElements.forEach(el => { el.style.display = ''; }); 
      element.style.cssText = originalCssText; 
      element.className = originalClasses; 
      tables.forEach(t => { 
        t.style.whiteSpace = ''; 
        t.style.tableLayout = ''; 
        t.style.width = ''; 
        t.style.wordBreak = ''; 
      }); 
    };

    if (typeof window.html2pdf === 'undefined') { 
      console.error('html2pdf no está cargado');
      finishExport();
      setDialog({title: 'Error', text: 'La librería de exportación PDF no está cargada. Recargue la página.', type: 'alert'});
      return;
    }

    try {
      window.html2pdf().set(opt).from(element).save().then(finishExport).catch(err => {
        console.error('Error al generar PDF:', err);
        finishExport();
      });
    } catch (err) {
      console.error('Error crítico en exportación:', err);
      finishExport();
    }
  };
  
  const handleExportExcel = (tableDataOrId, filename, headers = null) => {
    if (typeof tableDataOrId === 'string') {
      const table = document.getElementById(tableDataOrId); if (!table) return; const tableClone = table.cloneNode(true);
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><style>table{border-collapse:collapse;width:100%;font-family:Arial;font-size:11px;}th,td{border:1px solid #000;padding:5px;}th{text-align:center;}</style></head><body><h2>SERVICIOS JIRET G&B, C.A. - RIF: J-412309374</h2><br/>${tableClone.outerHTML}</body></html>`;
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${filename}_${getTodayDate()}.xls`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } else if (Array.isArray(tableDataOrId)) {
      // Export directly from data array using custom HTML logic
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><style>table{border-collapse:collapse;width:100%;font-family:Arial;font-size:11px;}th,td{border:1px solid #000;padding:5px;}th{background-color:#f3f4f6;text-align:center;font-weight:bold;}</style></head><body><h2>SERVICIOS JIRET G&B, C.A. - RIF: J-412309374</h2><br/><table>`;
      if (headers) {
        html += `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
      }
      html += `<tbody>${tableDataOrId.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${filename}_${getTodayDate()}.xls`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  };

  const exportTomaFisicaExcel = () => {
    const today = getTodayDate();
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; }
      h2, h3 { text-align: center; margin: 10px 0; }
      table { border-collapse: collapse; width: 100%; margin: 20px 0; }
      th, td { border: 2px solid #000; padding: 8px; text-align: left; }
      th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
      .header { text-align: center; margin-bottom: 20px; }
      .signatures { margin-top: 40px; }
      .sig-line { border-top: 2px solid #000; width: 200px; display: inline-block; margin: 0 20px; }
    </style>
    </head><body>`;
    
    html += `<div class="header">`;
    html += `<h2>SERVICIOS JIRET G&B, C.A.</h2>`;
    html += `<h3>RIF: J-412309374</h3>`;
    html += `<h3>FORMATO DE TOMA FÍSICA DE INVENTARIO</h3>`;
    html += `<p><strong>Fecha:</strong> ${today}</p>`;
    html += `</div>`;
    
    html += `<table>`;
    html += `<thead><tr>
      <th style="width: 12%;">Código</th>
      <th style="width: 30%;">Descripción</th>
      <th style="width: 8%;">Unidad</th>
      <th style="width: 12%;">Stock Sistema</th>
      <th style="width: 12%;">Conteo Físico</th>
      <th style="width: 12%;">Diferencia</th>
      <th style="width: 14%;">Observaciones</th>
    </tr></thead>`;
    
    html += `<tbody>`;
    inventory.forEach(item => {
      html += `<tr>
        <td>${item.id}</td>
        <td>${item.desc}</td>
        <td style="text-align: center;">${item.unit || 'KG'}</td>
        <td style="text-align: right;">${formatNum(item.stock)}</td>
        <td style="background-color: #ffffcc;"></td>
        <td style="background-color: #ffffcc;"></td>
        <td></td>
      </tr>`;
    });
    html += `</tbody></table>`;
    
    html += `<div class="signatures">`;
    html += `<p><strong>Realizado por:</strong> <span class="sig-line"></span> &nbsp;&nbsp;&nbsp; <strong>Supervisado por:</strong> <span class="sig-line"></span></p>`;
    html += `<p><strong>Firma:</strong> <span class="sig-line"></span> &nbsp;&nbsp;&nbsp; <strong>Firma:</strong> <span class="sig-line"></span></p>`;
    html += `<p><strong>Fecha:</strong> _______________ &nbsp;&nbsp;&nbsp; <strong>Fecha:</strong> _______________</p>`;
    html += `</div>`;
    
    html += `</body></html>`;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Toma_Fisica_Inventario_${today}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setDialog({
      title: 'Exportación Exitosa',
      text: 'El formato de toma física ha sido descargado. Puede imprimirlo y usarlo para el conteo físico.',
      type: 'alert'
    });
  };

  // ============================================================================
  // FUNCIONES DE SEGURIDAD - VALIDACIÓN DE CLAVE ADMIN
  // ============================================================================
  const requireAdminPassword = (action, actionName = 'esta acción') => {
    setAdminAction(() => action);
    setAdminActionName(actionName);
    setShowAdminModal(true);
    setAdminPassword('');
  };

  const handleAdminValidation = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setShowAdminModal(false);
      if (adminAction) {
        adminAction();
      }
      setAdminAction(null);
      setAdminPassword('');
      setAdminActionName('');
    } else {
      setDialog({ 
        title: 'Error de Autenticación', 
        text: 'La clave admin es incorrecta. Acceso denegado.', 
        type: 'alert' 
      });
      setAdminPassword('');
    }
  };

  const cancelAdminModal = () => {
    setShowAdminModal(false);
    setAdminPassword('');
    setAdminAction(null);
    setAdminActionName('');
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

  // ── CARGAR html2pdf DINÁMICAMENTE ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window.html2pdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      script.onload = () => console.log('html2pdf cargado correctamente');
      script.onerror = () => console.error('No se pudo cargar html2pdf');
      document.head.appendChild(script);
    }
  }, []);

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
    const unsubPOs = onSnapshot(getColRef('purchaseOrders'), (s) => setPurchaseOrders(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubWIP = onSnapshot(getColRef('wipInventory'), (s) => setWipInventory(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubFinished = onSnapshot(getColRef('finishedGoodsInventory'), (s) => setFinishedGoodsInventory(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    
    return () => { 
      unsubUsers(); unsubSettings(); unsubInv(); unsubMovs(); unsubCli(); unsubReq(); unsubInvB(); unsubInvReqs(); unsubOpCosts(); 
      unsubPOs(); unsubWIP(); unsubFinished(); 
    };
  }, [fbUser]);

  const clearAllReports = () => {
    setShowReqReport(false); setShowClientReport(false); setShowGeneralInvoicesReport(false);
    setShowNewReqPanel(false); setShowNewInvoicePanel(false); setEditingClientId(null); setEditingReqId(null); 
    setShowSingleReqReport(null); setShowSingleInvoice(null); setInvoiceSearchTerm(''); setShowWorkOrder(null); 
    setShowPhaseReport(null); setShowFiniquito(null); setSelectedPhaseReqId(null); setReqToApprove(null); setShowMovementReceipt(null);
    setShowPurchaseOrder(false); setViewingPO(null);
  };

  // ============================================================================
  // LOGICA TOMA FÍSICA Y AJUSTE MASIVO DE INVENTARIO
  // ============================================================================
  const handleProcessTomaFisica = async () => {
    setDialog({
      title: 'Procesar Toma Física',
      text: '¿Desea aplicar los ajustes de inventario? Se generarán los movimientos automáticos en el Kardex de todos los ítems con diferencia.',
      type: 'confirm',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          let adjustmentsCount = 0;
          const timestamp = Date.now();

          for (let item of inventory) {
             const newStockStr = physicalCounts[item.id];
             if (newStockStr !== undefined && newStockStr !== '') {
                const newStock = parseNum(newStockStr);
                const diff = newStock - (item.stock || 0);

                if (diff !== 0) {
                   adjustmentsCount++;
                   const movId = `TF-${timestamp}-${item.id}`;
                   const type = diff > 0 ? 'AJUSTE (POSITIVO)' : 'AJUSTE (NEGATIVO)';
                   const qty = Math.abs(diff);

                   batch.set(getDocRef('inventoryMovements', movId), {
                      id: movId, date: getTodayDate(), itemId: item.id, itemName: item.desc, 
                      type, qty, cost: item.cost, totalValue: qty * item.cost, 
                      reference: 'TOMA FÍSICA', notes: 'AJUSTE MASIVO SISTEMA', 
                      timestamp, user: appUser?.name || 'Sistema'
                   });
                   batch.update(getDocRef('inventory', item.id), { stock: newStock });
                }
             }
          }

          if (adjustmentsCount > 0) {
             await batch.commit();
             setPhysicalCounts({});
             setDialog({title: 'Éxito', text: `Se aplicaron ${adjustmentsCount} ajustes de inventario exitosamente.`, type: 'alert'});
          } else {
             setDialog({title: 'Aviso', text: 'No se encontraron diferencias para ajustar, o los conteos están en blanco.', type: 'alert'});
          }
        } catch (e) {
          setDialog({title: 'Error', text: e.message, type: 'alert'});
        }
      }
    });
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
    if (e && e.preventDefault) e.preventDefault(); 
    const item = (inventory || []).find(i => i?.id === newMovementForm.itemId); if (!item) return;
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
  
  const handleDeleteInvItem = (id) => {
    setDialog({ 
      title: 'Eliminar Ítem', 
      text: `¿Eliminar ${id}?`, 
      type: 'confirm', 
      onConfirm: async () => await deleteDoc(getDocRef('inventory', id))
    });
  };

  const handleDeleteMovement = (m) => {
    requireAdminPassword(async () => {
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
    }, 'Anular Movimiento de Kardex');
  };

  // ============================================================================
  // LOGICA COSTOS OPERATIVOS
  // ============================================================================
  const handleSaveOpCost = async (e) => {
    e.preventDefault();
    if (!newOpCostForm.category || !newOpCostForm.amount) {
      return setDialog({ title: 'Aviso', text: 'Categoría y monto son obligatorios.', type: 'alert' });
    }
    const amount = parseFloat(newOpCostForm.amount);
    if (amount <= 0) {
      return setDialog({ title: 'Aviso', text: 'El monto debe ser mayor a cero.', type: 'alert' });
    }
    try {
      const docId = `COST-${Date.now()}`;
      const month = newOpCostForm.date.substring(0, 7); // YYYY-MM
      await setDoc(getDocRef('operatingCosts', docId), {
        ...newOpCostForm,
        amount,
        month,
        user: appUser?.name || 'Sistema',
        timestamp: Date.now()
      });
      setNewOpCostForm(initialOpCostForm);
      setDialog({ title: '¡Éxito!', text: 'Costo operativo registrado correctamente.', type: 'alert' });
    } catch(err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  };

  const handleDeleteOpCost = (id) => {
    setDialog({
      title: 'Eliminar Costo',
      text: '¿Desea eliminar este registro de costo operativo?',
      type: 'confirm',
      onConfirm: async () => await deleteDoc(getDocRef('operatingCosts', id))
    });
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
  const handleDeleteClient = (rif) => {
    setDialog({ 
      title: 'Eliminar Cliente', 
      text: `¿Desea eliminar el cliente ${rif}?`, 
      type: 'confirm', 
      onConfirm: async () => await deleteDoc(getDocRef('clientes', rif))
    });
  };
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
  const handleDeleteInvoice = (id) => {
    setDialog({ 
      title: 'Eliminar', 
      text: `¿Eliminar factura?`, 
      type: 'confirm', 
      onConfirm: async () => await deleteDoc(getDocRef('maquilaInvoices', id))
    });
  };
  
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
  const handleDeleteReq = (id) => {
    setDialog({ 
      title: 'Eliminar OP', 
      text: `¿Desea eliminar la OP #${id}?`, 
      type: 'confirm', 
      onConfirm: async () => await deleteDoc(getDocRef('requirements', id))
    });
  };

  // ============================================================================
  // LOGICA APROBACIÓN DE REQUISICIONES DE ALMACÉN Y REGISTRO EN WIP
  // ============================================================================
  const handleSendRequisitionToAlmacen = async () => {
    if (!phaseForm.insumos || phaseForm.insumos.length === 0) { return setDialog({title: 'Aviso', text: 'Agregue insumos a la lista antes de solicitar a almacén.', type: 'alert'}); }
    const newReq = { opId: selectedPhaseReqId, phase: activePhaseTab, items: phaseForm.insumos, status: 'PENDIENTE', timestamp: Date.now(), date: getTodayDate(), user: appUser?.name || 'Operador de Planta' };
    try { await addDoc(getColRef('inventoryRequisitions'), newReq); setPhaseForm({...phaseForm, insumos: []}); setDialog({title: 'Solicitud Enviada', text: 'Requisición enviada al Almacén. Espere su entrega.', type: 'alert'}); } catch(e) { setDialog({title: 'Error', text: e.message, type: 'alert'}); }
  };

  const submitApproveRequisition = async (e) => {
    e.preventDefault();
    if (!reqToApprove) return;
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

        await batch.commit(); 
        
        // Registrar en WIP Inventory
        const reqDoc = (requirements || []).find(r => r.id === req.opId);
        if (reqDoc && req.phase) {
          const wipEntry = {
            id: `WIP-${Date.now()}`,
            opId: req.opId,
            reqId: req.id,
            cliente: reqDoc.client || 'N/A',
            producto: reqDoc.desc || reqDoc.categoria || 'Producto',
            especificaciones: `${reqDoc.ancho}x${reqDoc.largo} - ${reqDoc.micras}mic`,
            materiales: req.items.map(it => ({
              id: it.id,
              qty: parseNum(it.qty),
              cost: (inventory || []).find(i => i.id === it.id)?.cost || 0
            })),
            kgAsignados: req.items.reduce((sum, it) => sum + parseNum(it.qty), 0),
            costoPromedio: (() => {
              const totalCost = req.items.reduce((sum, it) => {
                const invItem = (inventory || []).find(i => i.id === it.id);
                return sum + (parseNum(it.qty) * (invItem?.cost || 0));
              }, 0);
              const totalQty = req.items.reduce((sum, it) => sum + parseNum(it.qty), 0);
              return totalQty > 0 ? totalCost / totalQty : 0;
            })(),
            fase: req.phase,
            fechaAsignacion: getTodayDate(),
            status: 'EN PROCESO',
            timestamp: Date.now()
          };
          await setDoc(getDocRef('wipInventory', wipEntry.id), wipEntry);
        }

        setReqToApprove(null); setDialog({title:'¡Descargo Exitoso!', text:'Requisición aprobada, stock descontado y materiales asignados a WIP.', type:'alert'});
    } catch(err) { setDialog({title:'Error', text:err.message, type:'alert'}); }
  };

  const handleRejectRequisition = (id) => {
    setDialog({title: 'Rechazar Requisición', text: '¿Desea rechazar esta solicitud de materiales?', type: 'confirm', onConfirm: async () => { await updateDoc(getDocRef('inventoryRequisitions', id), { status: 'RECHAZADO', dispatchDate: getTodayDate() }); setDialog({title: 'Actualizado', text: 'La solicitud ha sido rechazada.', type: 'alert'}); }});
  };

  // ============================================================================
  // LOGICA PRODUCCIÓN, CONTROL DE FASES Y MOVER A TERMINADOS (FG)
  // ============================================================================
  
  const handleFinishProduction = async (reqId, phaseData) => {
    try {
      const reqDoc = (requirements || []).find(r => r.id === reqId);
      if (!reqDoc) {
        setDialog({title: 'Error', text: 'Requisición no encontrada', type: 'alert'});
        return;
      }
      const wipEntries = wipInventory.filter(wip => wip.opId === reqId);
      
      for (const wipEntry of wipEntries) {
        const finishedEntry = {
          id: `FG-${Date.now()}`,
          opId: wipEntry.opId,
          reqId: reqId,
          cliente: wipEntry.cliente,
          producto: reqDoc.desc || reqDoc.categoria,
          ancho: reqDoc.ancho || 0,
          largo: reqDoc.largo || 0,
          micras: reqDoc.micras || 0,
          color: reqDoc.color || 'NATURAL',
          tratamiento: reqDoc.tratamiento || 'LISO',
          kgProducidos: phaseData.producedKg || 0,
          millares: phaseData.millaresProd || (reqDoc.cantidad / 1000) || 0,
          costoUnitario: wipEntry.costoPromedio,
          fechaFinalizacion: getTodayDate(),
          ubicacion: 'ALMACÉN GENERAL',
          status: 'LISTO PARA ENTREGA',
          observaciones: phaseData.observations || '',
          timestamp: Date.now()
        };

        await setDoc(getDocRef('finishedGoodsInventory', finishedEntry.id), finishedEntry);

        await updateDoc(getDocRef('wipInventory', wipEntry.id), {
          status: 'COMPLETADO',
          fechaCompletado: getTodayDate()
        });
      }
    } catch (error) {
      console.error('Error moviendo a Terminados:', error);
    }
  };

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
    const prodKg = parseNum(phaseForm?.producedKg); const mermaKg = parseNum(phaseForm?.mermaKg);

    if (isSkip) { currentPhase.skipped = true; currentPhase.isClosed = true; } 
    else {
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
    
    if (newStatus === 'COMPLETADO' && isClose) {
        await handleFinishProduction(req.id, { producedKg: prodKg, millaresProd: phaseForm?.millaresProd, observations: 'Finalizado' });
    }

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

    return inventory.filter(i => i.category === 'Materia Prima').map(mp => {
       const consumedIn30Days = recentMovs.filter(m => m.itemId === mp.id).reduce((sum, m) => sum + parseNum(m.qty), 0);
       const dailyAvg = consumedIn30Days / 30;
       
       let committedStock = 0;
       pendingReqs.forEach(req => {
            const item = req.items.find(i => i.id === mp.id);
            if (item) committedStock += parseNum(item.qty);
       });

       const availableReal = mp.stock - committedStock;
       const daysRemaining = dailyAvg > 0 ? availableReal / dailyAvg : 999;
       
       const isCritical = daysRemaining <= 30 || availableReal <= 0;
       const suggestOrder = isCritical ? Math.ceil(Math.abs(availableReal < 0 ? availableReal : 0) + (dailyAvg * 45)) : 0; 

       return { ...mp, dailyAvg, daysRemaining, committedStock, availableReal, suggestOrder, isCritical };
    });
  };

  const handleGeneratePurchaseOrder = () => {
    const projection = generateProjectionData();
    const criticalItems = projection.filter(mp => mp.isCritical || mp.suggestOrder > 0);
    
    if (criticalItems.length === 0) {
      setDialog({title: 'Aviso', text: 'No hay productos con déficit para generar orden de compra.', type: 'alert'});
      return;
    }

    setSelectedPOItems(criticalItems.map(item => ({
      productCode: item.id,
      productName: item.desc,
      currentStock: item.stock,
      deficit: Math.abs(item.availableReal < 0 ? item.availableReal : 0),
      suggestedQty: item.suggestOrder,
      unitCost: item.cost || 1.00
    })));
    setShowPOModal(true);
  };

  const handleSavePurchaseOrder = async () => {
    if (!poProvider.trim()) {
      setDialog({title: 'Aviso', text: 'Debe ingresar un proveedor', type: 'alert'});
      return;
    }

    if (selectedPOItems.length === 0) {
      setDialog({title: 'Aviso', text: 'Debe seleccionar al menos un producto', type: 'alert'});
      return;
    }

    const po = {
      id: `PO-${Date.now()}`,
      date: getTodayDate(),
      provider: poProvider.toUpperCase(),
      items: selectedPOItems,
      subtotal: selectedPOItems.reduce((sum, item) => sum + (item.suggestedQty * item.unitCost), 0),
      status: 'PENDIENTE',
      user: appUser?.name || 'Admin',
      notes: poNotes,
      timestamp: Date.now()
    };

    try {
      await setDoc(getDocRef('purchaseOrders', po.id), po);
      
      // CAMBIO 15: Cerrar modal y mostrar la orden recién creada en la vista
      setShowPOModal(false);
      setPoProvider('');
      setPoNotes('');
      setSelectedPOItems([]);
      
      setViewingPO(po);
      setProdView('ordenes_compra');
      
    } catch (error) {
      setDialog({title: 'Error', text: `Error al generar orden: ${error.message}`, type: 'alert'});
    }
  };

  const handleDeletePO = (poId) => {
    requireAdminPassword(async () => {
      try {
        await deleteDoc(getDocRef('purchaseOrders', poId));
        setDialog({title: 'Éxito', text: 'Orden de compra eliminada', type: 'alert'});
        setViewingPO(null);
      } catch (error) {
        setDialog({title: 'Error', text: error.message, type: 'alert'});
      }
    }, 'Eliminar Orden de Compra');
  };

  const handleUpdatePOStatus = async (poId, newStatus) => {
    try {
      await updateDoc(getDocRef('purchaseOrders', poId), {
        status: newStatus,
        updatedBy: appUser?.name || 'Admin',
        updateDate: getTodayDate()
      });
      setDialog({title: 'Éxito', text: `Estado actualizado a ${newStatus}`, type: 'alert'});
    } catch (error) {
      setDialog({title: 'Error', text: error.message, type: 'alert'});
    }
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
             <button onClick={() => { clearAllReports(); setActiveTab('produccion'); setProdView('proyeccion'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"><Factory size={40} className="text-orange-500 mb-4" /><h3 className="text-xl font-black text-white uppercase">Producción Planta</h3><p className="text-xs text-gray-400 mt-2">Control de Fases y Reportes.</p></button>
          )}
          {hasPerm('inventario') && (
             <button onClick={() => { clearAllReports(); setActiveTab('inventario'); setInvView('catalogo'); }} className="group bg-black border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-gray-900 transition-all shadow-xl"><Package size={40} className="text-orange-500 mb-4" /><h3 className="text-xl font-black text-white uppercase">Control Inventario</h3><p className="text-xs text-gray-400 mt-2">Art. 177 LISLR, Movimientos y Kardex.</p></button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mt-8">
          {hasPerm('produccion') && (
             <button onClick={() => { clearAllReports(); setActiveTab('simulador'); }} className="group bg-white border-l-4 border-orange-500 rounded-3xl p-10 text-left hover:bg-orange-50 transition-all shadow-md">
               <Calculator size={40} className="text-orange-500 mb-4" />
               <h3 className="text-xl font-black text-gray-800 uppercase">Simulador OP</h3>
               <p className="text-xs text-gray-500 mt-2">Calculadora Inversa de Producción y Mermas.</p>
             </button>
          )}
          {hasPerm('costos') && (
             <button onClick={() => { clearAllReports(); setActiveTab('costos_operativos'); }} className="group bg-white border-l-4 border-green-500 rounded-3xl p-10 text-left hover:bg-green-50 transition-all shadow-md">
               <DollarSign size={40} className="text-green-600 mb-4" />
               <h3 className="text-xl font-black text-gray-800 uppercase">Costos Operativos</h3>
               <p className="text-xs text-gray-500 mt-2">Registro de gastos y resumen visual por categoría.</p>
             </button>
          )}
          {hasPerm('costos') && (
             <button onClick={() => { clearAllReports(); setActiveTab('costos'); }} className="group bg-white border-l-4 border-blue-500 rounded-3xl p-10 text-left hover:bg-blue-50 transition-all shadow-md">
               <BarChart3 size={40} className="text-blue-600 mb-4" />
               <h3 className="text-xl font-black text-gray-800 uppercase">Reportes Financieros</h3>
               <p className="text-xs text-gray-500 mt-2">Dashboard de Rentabilidad, Ingresos vs Costos.</p>
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

  const renderInventoryReports = () => {
     let filteredData = [];
     if (invReportType === 'entradas') filteredData = invMovements.filter(m => m.type === 'ENTRADA');
     if (invReportType === 'salidas') filteredData = invMovements.filter(m => m.type === 'SALIDA' || m.type === 'AUTOCONSUMO');
     if (invReportType === 'ajustes') filteredData = invMovements.filter(m => m.type.includes('AJUSTE'));
     
     return (
       <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in print:border-none print:shadow-none">
          <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
             <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><FileText className="text-orange-500" size={24}/> Reportes de Inventario</h2>
             <div className="flex gap-2">
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
               <table className="w-full text-left whitespace-nowrap text-xs">
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

    if (invView === 'wip') {
      return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
          <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-purple-50 flex justify-between items-center no-pdf">
            <div>
              <h2 className="text-xl font-black text-purple-800 uppercase flex items-center gap-3 tracking-tighter">
                <Beaker className="text-purple-600" size={24}/> Inventario de Productos en Proceso (WIP)
              </h2>
              <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase tracking-widest">
                Materiales e insumos asignados a órdenes de producción activas
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  const data = wipInventory.map(item => [
                    item.opId,
                    item.cliente,
                    item.producto,
                    formatNum(item.kgAsignados),
                    item.fase,
                    item.fechaAsignacion,
                    item.status
                  ]);
                  handleExportExcel(data, 'Inventario_WIP', 
                    ['OP ID', 'Cliente', 'Producto', 'KG Asignados', 'Fase', 'Fecha', 'Estado']
                  );
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download size={16}/> EXPORTAR EXCEL
              </button>
              <button 
                onClick={() => handleExportPDF('Inventario_WIP', true)} 
                className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Printer size={16}/> EXPORTAR PDF
              </button>
            </div>
          </div>

          <div className="p-8 print:p-0 bg-white" id="pdf-content">
            <div className="hidden pdf-header mb-8">
              <ReportHeader />
              <h1 className="text-2xl font-black text-black uppercase border-b-4 border-purple-500 pb-2">
                INVENTARIO DE PRODUCTOS EN PROCESO (WIP)
              </h1>
              <p className="text-sm font-bold text-gray-500 uppercase mt-2">AL: {getTodayDate()}</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-black print:rounded-none">
              <table className="w-full text-left whitespace-nowrap text-xs">
                <thead className="bg-gray-100 border-b-2 border-gray-300 print:border-black">
                  <tr className="uppercase font-black text-[10px] tracking-widest text-black">
                    <th className="py-3 px-4 border-r print:border-black">OP ID</th>
                    <th className="py-3 px-4 border-r print:border-black">Cliente</th>
                    <th className="py-3 px-4 border-r print:border-black">Producto</th>
                    <th className="py-3 px-4 border-r print:border-black text-center">Materiales Asignados</th>
                    <th className="py-3 px-4 border-r print:border-black text-center">KG Asignados</th>
                    <th className="py-3 px-4 border-r print:border-black">Fase Actual</th>
                    <th className="py-3 px-4 border-r print:border-black text-center">Fecha Asignación</th>
                    <th className="py-3 px-4 text-center print:border-black">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-black print:divide-black">
                  {wipInventory.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 border-r print:border-black font-black text-purple-600">{item.opId}</td>
                      <td className="py-3 px-4 border-r print:border-black font-bold uppercase">{item.cliente}</td>
                      <td className="py-3 px-4 border-r print:border-black font-bold uppercase">
                        {item.producto}
                        <br/>
                        <span className="text-[9px] text-gray-500 print:text-black">{item.especificaciones}</span>
                      </td>
                      <td className="py-3 px-4 border-r print:border-black">
                        <ul className="text-[9px] space-y-1">
                          {item.materiales?.map((mat, idx) => (
                            <li key={idx} className="font-bold">
                              <span className="bg-gray-100 px-2 rounded print:border print:border-black">{formatNum(mat.qty)}</span> x {mat.id}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3 px-4 border-r print:border-black text-center font-black text-lg text-purple-600">
                        {formatNum(item.kgAsignados)}
                      </td>
                      <td className="py-3 px-4 border-r print:border-black font-bold uppercase">{item.fase}</td>
                      <td className="py-3 px-4 border-r print:border-black text-center font-bold">{item.fechaAsignacion}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          item.status === 'EN PROCESO' ? 'bg-yellow-100 text-yellow-700 print:border print:border-black' :
                          item.status === 'COMPLETADO' ? 'bg-green-100 text-green-700 print:border print:border-black' :
                          'bg-gray-100 text-gray-700 print:border print:border-black'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {wipInventory.length === 0 && (
                    <tr><td colSpan="8" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
                      No hay productos en proceso registrados
                    </td></tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 print:border-black">
                  <tr className="font-black text-sm">
                    <td colSpan="4" className="py-4 px-4 text-right uppercase border-r print:border-black">TOTAL KG EN PROCESO:</td>
                    <td className="py-4 px-4 text-center text-lg text-purple-700 border-r print:border-black">
                      {formatNum(wipInventory.reduce((sum, item) => sum + parseNum(item.kgAsignados), 0))}
                    </td>
                    <td colSpan="3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-8 bg-purple-50 border border-purple-200 p-6 rounded-xl print:border-black">
              <h3 className="text-sm font-black text-purple-800 uppercase mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-purple-600" />
                Información sobre WIP
              </h3>
              <p className="text-xs font-bold text-purple-700">
                Este inventario refleja materiales e insumos que han sido asignados automáticamente a órdenes de producción activas 
                (requisiciones aprobadas desde almacén). Los materiales se descargan "face to face" del inventario principal 
                cuando se aprueban las requisiciones de planta.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (invView === 'finished') {
      return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
          <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-green-50 flex justify-between items-center no-pdf">
            <div>
              <h2 className="text-xl font-black text-green-800 uppercase flex items-center gap-3 tracking-tighter">
                <Package className="text-green-600" size={24}/> Inventario de Productos Terminados
              </h2>
              <p className="text-[10px] font-bold text-green-600 mt-1 uppercase tracking-widest">
                Productos finalizados listos para entrega al cliente
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  const data = finishedGoodsInventory.map(item => [
                    item.opId,
                    item.cliente,
                    item.producto,
                    formatNum(item.kgProducidos),
                    formatNum(item.millares),
                    item.fechaFinalizacion,
                    item.ubicacion,
                    item.status
                  ]);
                  handleExportExcel(data, 'Inventario_Productos_Terminados', 
                    ['OP ID', 'Cliente', 'Producto', 'KG Producidos', 'Millares', 'Fecha Finalización', 'Ubicación', 'Estado']
                  );
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download size={16}/> EXPORTAR EXCEL
              </button>
              <button 
                onClick={() => handleExportPDF('Inventario_Productos_Terminados', true)} 
                className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Printer size={16}/> EXPORTAR PDF
              </button>
            </div>
          </div>

          <div className="p-8 print:p-0 bg-white" id="pdf-content">
            <div className="hidden pdf-header mb-8">
              <ReportHeader />
              <h1 className="text-2xl font-black text-black uppercase border-b-4 border-green-500 pb-2">
                INVENTARIO DE PRODUCTOS TERMINADOS
              </h1>
              <p className="text-sm font-bold text-gray-500 uppercase mt-2">AL: {getTodayDate()}</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-black print:rounded-none">
              <table className="w-full text-left whitespace-nowrap text-xs">
                <thead className="bg-gray-100 border-b-2 border-gray-300 print:border-black">
                  <tr className="uppercase font-black text-[10px] tracking-widest text-black">
                    <th className="py-3 px-4 border-r print:border-black">OP ID</th>
                    <th className="py-3 px-4 border-r print:border-black">Cliente</th>
                    <th className="py-3 px-4 border-r print:border-black">Producto / Especificaciones</th>
                    <th className="py-3 px-4 border-r print:border-black text-center">KG Producidos</th>
                    <th className="py-3 px-4 border-r print:border-black text-center">Millares</th>
                    <th className="py-3 px-4 border-r print:border-black text-center">Fecha Finalización</th>
                    <th className="py-3 px-4 border-r print:border-black">Ubicación</th>
                    <th className="py-3 px-4 text-center print:border-black">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-black print:divide-black">
                  {finishedGoodsInventory.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 border-r print:border-black font-black text-green-600">{item.opId}</td>
                      <td className="py-3 px-4 border-r print:border-black font-bold uppercase">{item.cliente}</td>
                      <td className="py-3 px-4 border-r print:border-black">
                        <div className="font-bold uppercase">{item.producto}</div>
                        <div className="text-[9px] text-gray-500 print:text-black mt-1 space-y-0.5">
                          <div><strong>Medidas:</strong> {item.ancho}cm x {item.largo}cm</div>
                          <div><strong>Micras:</strong> {item.micras} | <strong>Color:</strong> {item.color}</div>
                          <div><strong>Tratamiento:</strong> {item.tratamiento}</div>
                          {item.observaciones && <div><strong>Obs:</strong> {item.observaciones}</div>}
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r print:border-black text-center font-black text-lg text-green-600">
                        {formatNum(item.kgProducidos)}
                      </td>
                      <td className="py-3 px-4 border-r print:border-black text-center font-black text-lg text-blue-600">
                        {formatNum(item.millares)}
                      </td>
                      <td className="py-3 px-4 border-r print:border-black text-center font-bold">{item.fechaFinalizacion}</td>
                      <td className="py-3 px-4 border-r print:border-black font-bold uppercase">{item.ubicacion || 'ALMACÉN GENERAL'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          item.status === 'LISTO PARA ENTREGA' ? 'bg-green-100 text-green-700 print:border print:border-black' :
                          item.status === 'ENTREGADO' ? 'bg-blue-100 text-blue-700 print:border print:border-black' :
                          'bg-gray-100 text-gray-700 print:border print:border-black'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {finishedGoodsInventory.length === 0 && (
                    <tr><td colSpan="8" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
                      No hay productos terminados registrados
                    </td></tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 print:border-black">
                  <tr className="font-black text-sm">
                    <td colSpan="3" className="py-4 px-4 text-right uppercase border-r print:border-black">TOTALES:</td>
                    <td className="py-4 px-4 text-center text-lg text-green-700 border-r print:border-black">
                      {formatNum(finishedGoodsInventory.reduce((sum, item) => sum + parseNum(item.kgProducidos), 0))} KG
                    </td>
                    <td className="py-4 px-4 text-center text-lg text-blue-700 border-r print:border-black">
                      {formatNum(finishedGoodsInventory.reduce((sum, item) => sum + parseNum(item.millares), 0))} M
                    </td>
                    <td colSpan="3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-8 bg-green-50 border border-green-200 p-6 rounded-xl print:border-black">
              <h3 className="text-sm font-black text-green-800 uppercase mb-3 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                Información sobre Productos Terminados
              </h3>
              <p className="text-xs font-bold text-green-700">
                Este inventario muestra los productos que han completado todo el proceso de producción (Extrusión → Impresión → Sellado/Corte) 
                y están listos para entrega al cliente. Incluye todos los datos relevantes: kilos producidos, millares, especificaciones técnicas 
                del producto, fechas de finalización, y estado de entrega.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (invView === 'toma_fisica') {
       return (
         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in print:border-none print:shadow-none">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-orange-50 flex justify-between items-center no-pdf">
               <div>
                  <h2 className="text-xl font-black text-orange-800 uppercase flex items-center gap-3 tracking-tighter">
                    <ClipboardEdit className="text-orange-600" size={24}/> Toma Física de Inventario
                  </h2>
                  <p className="text-[10px] font-bold text-orange-600 mt-1 uppercase tracking-widest">Ajuste Masivo Directo al Sistema</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={exportTomaFisicaExcel} className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"><Download size={16}/> PLANILLA EXCEL</button>
                 <button onClick={handleProcessTomaFisica} className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-orange-700 transition-colors flex items-center gap-2"><CheckCircle2 size={16}/> PROCESAR AJUSTES</button>
               </div>
            </div>
            
            <div className="p-8">
               <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 flex items-start gap-4">
                  <AlertTriangle size={24} className="text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                     <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Instrucciones de Toma Física</h3>
                     <p className="text-xs font-bold text-blue-600">Ingresa el conteo físico real de los ítems en la columna "Conteo Físico". El sistema calculará la diferencia y generará automáticamente los movimientos de "AJUSTE" correspondientes (Positivos o Negativos) al procesar.</p>
                  </div>
               </div>

               <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left whitespace-nowrap text-sm">
                     <thead className="bg-gray-100 border-b-2 border-gray-200">
                        <tr className="uppercase font-black text-[10px] tracking-widest text-gray-600">
                           <th className="py-3 px-4 border-r">Ítem / Código</th>
                           <th className="py-3 px-4 border-r text-center">Unidad</th>
                           <th className="py-3 px-4 border-r text-center">Stock Sistema</th>
                           <th className="py-3 px-4 border-r text-center bg-orange-100 text-orange-800 w-48">Conteo Físico Real</th>
                           <th className="py-3 px-4 text-center">Diferencia Estimada</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 text-black">
                        {(inventory || []).map(item => {
                           const physicalStr = physicalCounts[item.id];
                           const physicalNum = physicalStr !== undefined && physicalStr !== '' ? parseNum(physicalStr) : null;
                           const diff = physicalNum !== null ? physicalNum - item.stock : null;

                           return (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                 <td className="py-3 px-4 border-r font-black text-xs uppercase">{item.desc}<br/><span className="text-[10px] text-gray-500 font-bold">{item.id}</span></td>
                                 <td className="py-3 px-4 border-r text-center font-bold text-gray-500">{item.unit || 'KG'}</td>
                                 <td className="py-3 px-4 border-r text-center font-black text-blue-600 text-lg">{formatNum(item.stock)}</td>
                                 <td className="py-2 px-4 border-r text-center bg-orange-50/30">
                                    <input 
                                       type="number" 
                                       step="0.01"
                                       value={physicalCounts[item.id] ?? ''} 
                                       onChange={e => setPhysicalCounts({...physicalCounts, [item.id]: e.target.value})}
                                       className="w-full border-2 border-orange-200 rounded-lg p-2 text-center font-black text-lg outline-none focus:border-orange-500 focus:bg-white bg-gray-50 transition-all text-black"
                                       placeholder="-"
                                    />
                                 </td>
                                 <td className="py-3 px-4 text-center font-black text-lg">
                                    {diff !== null ? (
                                       <span className={diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}>
                                          {diff > 0 ? '+' : ''}{formatNum(diff)}
                                       </span>
                                    ) : <span className="text-gray-300">-</span>}
                                 </td>
                              </tr>
                           );
                        })}
                        {inventory.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">El catálogo está vacío.</td></tr>}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
       );
    }

    const searchInvUpper = (invSearchTerm || '').toUpperCase();
    const filteredInventory = (inventory || []).filter(i => (i?.id || '').includes(searchInvUpper) || (i?.desc || '').includes(searchInvUpper));
    const filteredMovements = (invMovements || []).filter(m => (m?.itemId || '').toUpperCase().includes(searchInvUpper) || (m?.itemName || '').toUpperCase().includes(searchInvUpper) || (m?.reference || '').toUpperCase().includes(searchInvUpper));

    return (
      <div className="animate-in fade-in space-y-6">
        {invView === 'requisiciones' && (
           <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><ClipboardList className="text-orange-500" size={24}/> Requisiciones de Planta a Almacén</h2>
             </div>
             <div className="p-8">
               <div className="overflow-x-auto rounded-xl border border-gray-200">
                 <table className="w-full text-left text-sm whitespace-nowrap">
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
               <div className="flex gap-3">
                 <button onClick={() => {clearAllReports(); setInvView('toma_fisica'); setPhysicalCounts({});}} className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-orange-700 transition-colors flex items-center gap-2">
                   <ClipboardEdit size={16}/> TOMA FÍSICA / AJUSTE
                 </button>
                 <button onClick={() => handleExportPDF('Catalogo_Inventario', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2">
                   <Printer size={16}/> EXPORTAR PDF
                 </button>
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
                  <table className="w-full text-left whitespace-nowrap">
                   <thead className="bg-gray-100 border-b-2 border-gray-200 print:border-black">
                     <tr className="uppercase font-black text-gray-800 text-[10px] tracking-widest print:text-black">
                       <th className="py-4 px-4">Código</th>
                       <th className="py-4 px-4">Descripción / Categoría</th>
                       <th className="py-4 px-4 text-center">Costo Unit. Promedio</th>
                       <th className="py-4 px-4 text-right">Stock Actual</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 print:divide-black">
                     {filteredInventory.map(inv => (
                       <tr key={inv?.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="py-4 px-4 font-black text-orange-600 text-xs print:text-black">{inv?.id}</td>
                          <td className="py-4 px-4 font-black uppercase text-xs text-black">{inv?.desc}<span className="block text-[9px] font-bold text-gray-500 mt-1 print:text-black">{inv?.category}</span></td>
                          <td className="py-4 px-4 text-center font-bold text-gray-600 print:text-black">${formatNum(inv?.cost)}</td>
                          <td className="py-4 px-4 text-right font-black text-blue-600 text-lg print:text-black">{formatNum(inv?.stock)} <span className="text-xs text-gray-400 print:text-black">{inv?.unit}</span></td>
                       </tr>
                     ))}
                     {filteredInventory.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin artículos registrados</td></tr>}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {['cargo', 'descargo'].includes(invView) && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter">
                  <ArrowRightLeft className="text-orange-500" size={24}/> 
                  {invView === 'cargo' && 'Registrar Cargo (Entrada)'}
                  {invView === 'descargo' && 'Registrar Descargo (Salida)'}
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
                       <select required value={newMovementForm.type} onChange={e=>setNewMovementForm({...newMovementForm, type: e.target.value})} className={`w-full border-2 rounded-xl p-4 font-black text-sm uppercase outline-none transition-colors ${newMovementForm.type === 'ENTRADA' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                          {invView === 'cargo' && <option value="ENTRADA">ENTRADA (COMPRA/PRODUCCIÓN)</option>}
                          {invView === 'descargo' && <>
                             <option value="SALIDA">SALIDA (VENTA/DESPACHO)</option>
                             <option value="AUTOCONSUMO">AUTOCONSUMO (USO INTERNO)</option>
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

        {invView === 'ajuste' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-red-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-red-800 uppercase flex items-center gap-3 tracking-tighter">
                  <ShieldCheck className="text-red-600" size={24}/> Ajuste Manual Único
                </h2>
                <p className="text-[10px] font-bold text-red-600 mt-1 uppercase tracking-widest">Requiere Autenticación de Administrador</p>
              </div>
            </div>

            <div className="p-8">
              <form onSubmit={(e) => {
                e.preventDefault();
                const fakeEvent = { preventDefault: () => {} };
                requireAdminPassword(() => {
                  handleSaveMovement(fakeEvent);
                }, 'Registrar Ajuste Manual Único');
              }} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Fecha del Ajuste</label>
                    <input 
                      type="date" 
                      value={newMovementForm.date} 
                      onChange={e => setNewMovementForm({...newMovementForm, date: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs uppercase outline-none focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Tipo de Ajuste</label>
                    <select 
                      value={newMovementForm.type} 
                      onChange={e => setNewMovementForm({...newMovementForm, type: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs uppercase outline-none focus:border-red-500"
                      required
                    >
                      <option value="AJUSTE (POSITIVO)">AJUSTE POSITIVO (+)</option>
                      <option value="AJUSTE (NEGATIVO)">AJUSTE NEGATIVO (-)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Seleccionar Artículo</label>
                  <select 
                    value={newMovementForm.itemId} 
                    onChange={e => {
                      const item = (inventory || []).find(i=>i?.id===e.target.value);
                      setNewMovementForm({...newMovementForm, itemId: e.target.value, cost: item ? item.cost : ''});
                    }}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs uppercase outline-none focus:border-red-500"
                    required
                  >
                    <option value="">-- SELECCIONE UN ARTÍCULO --</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>{item.id} - {item.desc} (Stock: {formatNum(item.stock)})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Cantidad a Ajustar</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={newMovementForm.qty} 
                      onChange={e => setNewMovementForm({...newMovementForm, qty: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-lg outline-none focus:border-red-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Costo Unitario ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={newMovementForm.cost} 
                      onChange={e => setNewMovementForm({...newMovementForm, cost: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-lg outline-none focus:border-red-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Referencia / Motivo del Ajuste</label>
                  <input 
                    type="text"
                    value={newMovementForm.reference} 
                    onChange={e => setNewMovementForm({...newMovementForm, reference: e.target.value.toUpperCase()})}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs uppercase outline-none focus:border-red-500"
                    placeholder="EJ: AJUSTE POR INVENTARIO FÍSICO"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Notas / Observaciones</label>
                  <textarea 
                    value={newMovementForm.notes} 
                    onChange={e => setNewMovementForm({...newMovementForm, notes: e.target.value.toUpperCase()})}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs uppercase outline-none focus:border-red-500 h-24"
                    placeholder="DETALLE ADICIONAL DEL AJUSTE..."
                  />
                </div>

                <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                  <button 
                    type="submit" 
                    className="bg-red-600 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-red-700 transition-all tracking-widest flex items-center gap-2"
                  >
                    <ShieldCheck size={18}/> PROCESAR AJUSTE (REQUIERE CLAVE)
                  </button>
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

        {invView === 'reporte177' && (() => {
          const categories = [...new Set(inventory.map(i => i.category))];
          
          if (wipInventory.length > 0) categories.push('WIP - Productos en Proceso');
          if (finishedGoodsInventory.length > 0) categories.push('Productos Terminados');

          const startOfMonth = new Date(reportYear, reportMonth - 1, 1);
          const endOfMonth = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);

          const monthMovements = invMovements.filter(m => {
            const movDate = new Date(`${m.date}T00:00:00`);
            return movDate >= startOfMonth && movDate <= endOfMonth;
          });

          const reporte177Data = categories.map(cat => {
            let items = [];

            if (cat !== 'WIP - Productos en Proceso' && cat !== 'Productos Terminados') {
              items = inventory.filter(item => item.category === cat).map(item => {
                const itemMovements = monthMovements.filter(m => m.itemId === item.id);
                const entradas = itemMovements.filter(m => m.type === 'ENTRADA' || m.type?.includes('AJUSTE (POSITIVO)'));
                const salidas = itemMovements.filter(m => m.type === 'SALIDA' || m.type === 'AUTOCONSUMO' || m.type?.includes('AJUSTE (NEGATIVO)'));

                const monthEntradasQty = entradas.reduce((sum, m) => sum + parseNum(m.qty), 0);
                const monthEntradasTotal = entradas.reduce((sum, m) => sum + parseNum(m.totalValue), 0);
                const monthEntradasProm = monthEntradasQty > 0 ? monthEntradasTotal / monthEntradasQty : 0;

                const monthSalidasQty = salidas.reduce((sum, m) => sum + parseNum(m.qty), 0);
                const monthSalidasTotal = salidas.reduce((sum, m) => sum + parseNum(m.totalValue), 0);
                const monthSalidasProm = monthSalidasQty > 0 ? monthSalidasTotal / monthSalidasQty : 0;

                const initialStock = item.stock + monthSalidasQty - monthEntradasQty;
                const initialTotal = initialStock * item.cost;

                const invFinalQty = item.stock;
                const invFinalCost = item.cost;
                const invFinalTotal = invFinalQty * invFinalCost;

                return {
                  id: item.id, desc: item.desc, unit: item.unit, cost: item.cost, initialStock, initialTotal, monthEntradasQty, monthEntradasProm, monthEntradasTotal, monthSalidasQty, monthSalidasProm, monthSalidasTotal, invFinalQty, invFinalCost, invFinalTotal
                };
              });
            }

            if (cat === 'WIP - Productos en Proceso') {
              items = wipInventory.map(item => {
                const kgAsignados = parseNum(item.kgAsignados);
                const costoPromedio = parseNum(item.costoPromedio) || 1.0;
                const total = kgAsignados * costoPromedio;

                return {
                  id: item.opId, desc: `${item.producto} - ${item.cliente}`, unit: 'kg', cost: costoPromedio, initialStock: 0, initialTotal: 0, monthEntradasQty: kgAsignados, monthEntradasProm: costoPromedio, monthEntradasTotal: total, monthSalidasQty: 0, monthSalidasProm: 0, monthSalidasTotal: 0, invFinalQty: kgAsignados, invFinalCost: costoPromedio, invFinalTotal: total
                };
              });
            }

            if (cat === 'Productos Terminados') {
              items = finishedGoodsInventory.map(item => {
                const kgProducidos = parseNum(item.kgProducidos);
                const costoUnitario = parseNum(item.costoUnitario) || 1.0;
                const total = kgProducidos * costoUnitario;

                return {
                  id: item.opId, desc: `${item.producto} - ${item.cliente}`, unit: 'kg', cost: costoUnitario, initialStock: 0, initialTotal: 0, monthEntradasQty: kgProducidos, monthEntradasProm: costoUnitario, monthEntradasTotal: total, monthSalidasQty: 0, monthSalidasProm: 0, monthSalidasTotal: 0, invFinalQty: kgProducidos, invFinalCost: costoUnitario, invFinalTotal: total
                };
              });
            }

            return { category: cat, items };
          });

          let grandInitialTotal = 0; let grandEntradasTotal = 0; let grandSalidasTotal = 0; let grandFinalTotal = 0;

          return (
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
          );
        })()}

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
          <div data-html2canvas-ignore="true" className="flex justify-between mb-4 no-pdf"><button onClick={() => setShowGeneralInvoicesReport(false)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF('Reporte_General_Facturas', false)} className="bg-black text-white px-6 py-2 rounded-xl flex items-center gap-2 font-black text-xs uppercase hover:bg-gray-800"><Printer size={16}/> Exportar PDF</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center mb-6"><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Reporte General de Facturación</h2></div>
          <table className="w-full text-[10px] border-collapse border border-gray-300">
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
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf"><button onClick={() => setShowClientReport(false)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF('Directorio_Clientes', true)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase hover:bg-gray-800"><Printer size={16}/> Exportar PDF</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center mb-8"><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Directorio de Clientes</h2></div>
          <table className="w-full text-[10px] border-collapse border border-gray-300">
            <thead className="bg-gray-100 uppercase"><tr><th className="p-2 border">RIF</th><th className="p-2 border">Razón Social</th><th className="p-2 border w-1/3">Dirección</th><th className="p-2 border">Teléfono</th><th className="p-2 border">Vendedor</th></tr></thead>
            <tbody>{(clients || []).map(c => (<tr key={c?.rif}><td className="p-2 border font-bold">{c?.rif}</td><td className="p-2 border font-black uppercase">{c?.name}</td><td className="p-2 border uppercase">{c?.direccion}</td><td className="p-2 border">{c?.telefono}</td><td className="p-2 border uppercase font-bold">{c?.vendedor}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }

    if (showReqReport) {
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black bg-white">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-4 no-pdf"><button onClick={() => setShowReqReport(false)} className="bg-gray-100 px-4 py-2 font-bold text-xs uppercase rounded-xl hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF('Reporte_Requisiciones', true)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase hover:bg-gray-800"><Printer size={16}/> Exportar PDF</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center mb-6"><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Reporte de Requisiciones (OP)</h2></div>
          <table className="w-full text-[10px] border-collapse border border-gray-300">
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
            <div className="px-8 py-6 border-b bg-white flex justify-between items-center"><h2 className="text-xl font-black uppercase flex items-center gap-3"><Users className="text-orange-500" /> DIRECTORIO DE CLIENTES</h2><button onClick={()=>setShowClientReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-gray-50">REPORTE PDF</button></div>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                       <div>
                         <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Tipo de Producto</label>
                         <select value={newReqForm.tipoProducto} onChange={e=>handleReqFormChange('tipoProducto', e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 font-black text-xs text-black outline-none focus:border-orange-500">
                           <option value="BOLSAS">BOLSAS / EMPAQUES</option>
                           <option value="TERMOENCOGIBLE">TERMOENCOGIBLE</option>
                         </select>
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Categoría</label>
                         <input type="text" value={newReqForm.categoria} onChange={e=>handleReqFormChange('categoria', e.target.value)} placeholder="EJ: PAÑAL, GALLETAS, ETC" className="w-full border-2 border-gray-200 rounded-2xl p-4 font-black text-xs text-black outline-none focus:border-orange-500 uppercase" />
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

  const renderCostosOperativosModule = () => {
    const filteredCosts = opCosts.filter(cost => {
      const matchCategory = costFilterCategory === 'TODAS' || cost.category === costFilterCategory;
      const matchMonth = costFilterMonth === 'TODOS' || cost.month === costFilterMonth;
      return matchCategory && matchMonth;
    });

    const costsByCategory = {};
    COSTO_CATEGORIES.forEach(cat => { costsByCategory[cat] = 0; });
    opCosts.forEach(cost => {
      if (costsByCategory[cost.category] !== undefined) {
        costsByCategory[cost.category] += cost.amount || 0;
      }
    });

    const totalCosts = Object.values(costsByCategory).reduce((sum, val) => sum + val, 0);
    const maxCategoryAmount = Math.max(...Object.values(costsByCategory), 1);
    const uniqueMonths = [...new Set(opCosts.map(c => c.month))].sort().reverse();

    return (
      <div className="w-full max-w-7xl animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-black uppercase flex items-center gap-3 tracking-tighter">
                  <DollarSign className="text-green-600" size={32}/> Costos Operativos
                </h2>
                <p className="text-xs font-bold text-gray-600 uppercase mt-2">Registro y Control de Gastos Operacionales</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <h3 className="text-sm font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">Registrar Nuevo Costo</h3>
              <form onSubmit={handleSaveOpCost} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Fecha</label>
                  <input type="date" value={newOpCostForm.date} onChange={e => setNewOpCostForm({...newOpCostForm, date: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500" required />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Categoría</label>
                    <button type="button" onClick={() => setShowNewCategoryModal(true)} className="text-[9px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold hover:bg-green-200 transition-all flex items-center gap-1">
                      <Plus size={10}/> Nueva
                    </button>
                  </div>
                  <select value={newOpCostForm.category} onChange={e => setNewOpCostForm({...newOpCostForm, category: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500" required>
                    {costCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Monto ($)</label>
                  <input type="number" step="0.01" value={newOpCostForm.amount} onChange={e => setNewOpCostForm({...newOpCostForm, amount: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500 text-center" placeholder="0.00" required />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Descripción</label>
                  <input type="text" value={newOpCostForm.description} onChange={e => setNewOpCostForm({...newOpCostForm, description: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500 uppercase" placeholder="EJ: PAGO DE FACTURA DE LUZ" />
                </div>
                <div className="md:col-span-4">
                  <button type="submit" className="bg-green-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-green-700 transition-all flex items-center gap-2">
                    <PlusCircle size={16}/> Registrar Costo
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200">
              <h3 className="text-sm font-black uppercase text-black mb-4">Filtros</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Categoría</label>
                  <select value={costFilterCategory} onChange={e => setCostFilterCategory(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500">
                    <option value="TODAS">TODAS LAS CATEGORÍAS</option>
                    {COSTO_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes</label>
                  <select value={costFilterMonth} onChange={e => setCostFilterMonth(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500">
                    <option value="TODOS">TODOS LOS MESES</option>
                    {uniqueMonths.map(month => (<option key={month} value={month}>{month}</option>))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200">
              <h3 className="text-sm font-black uppercase text-black mb-6 border-b border-gray-200 pb-2">Resumen por Categoría</h3>
              <div className="space-y-3">
                {COSTO_CATEGORIES.map(cat => {
                  const amount = costsByCategory[cat] || 0;
                  const percentage = totalCosts > 0 ? (amount / totalCosts * 100) : 0;
                  const barWidth = maxCategoryAmount > 0 ? (amount / maxCategoryAmount * 100) : 0;
                  return (
                    <div key={cat} className="group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-gray-700 uppercase">{cat}</span>
                        <span className="text-xs font-bold text-gray-500">${formatNum(amount)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-500" style={{width: `${barWidth}%`}} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black text-black uppercase">Total General</span>
                  <span className="text-2xl font-black text-green-600">${formatNum(totalCosts)}</span>
                </div>
              </div>
            </div>

            {/* ── RESUMEN MENSUAL CON % SOBRE VENTAS ── */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200">
              <h3 className="text-sm font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">Costos Operativos vs Ventas (% por Mes)</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr className="uppercase font-black text-[10px] tracking-widest text-gray-600">
                      <th className="py-3 px-4 border-r">Mes</th>
                      <th className="py-3 px-4 border-r text-right">Ingresos (Ventas)</th>
                      <th className="py-3 px-4 border-r text-right">Costos Operativos</th>
                      <th className="py-3 px-4 text-center">% Costo Op. / Ventas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {uniqueMonths.length === 0 ? (
                      <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-bold uppercase">Sin datos registrados</td></tr>
                    ) : uniqueMonths.map(ym => {
                      const costoMes = opCosts.filter(c => c.month === ym).reduce((s,c) => s + parseNum(c.amount), 0);
                      const ingresosMes = invoices.filter(i => (i.fecha||'').startsWith(ym)).reduce((s,i) => s + parseNum(i.total), 0);
                      const pct = ingresosMes > 0 ? (costoMes / ingresosMes * 100) : 0;
                      const [yr, mo] = ym.split('-');
                      const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                      return (
                        <tr key={ym} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 border-r font-black">{monthNames[parseInt(mo)-1]} {yr}</td>
                          <td className="py-3 px-4 border-r text-right font-black text-green-600">${formatNum(ingresosMes)}</td>
                          <td className="py-3 px-4 border-r text-right font-black text-orange-600">${formatNum(costoMes)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${pct > 30 ? 'bg-red-100 text-red-700' : pct > 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                              {ingresosMes > 0 ? `${pct.toFixed(1)}%` : 'S/V'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[9px] font-bold text-gray-400 mt-3 uppercase">* S/V = Sin ventas registradas ese mes | % &lt;15% = Eficiente | 15-30% = Moderado | &gt;30% = Alto</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 bg-gray-50 border-b border-gray-200"><h3 className="text-sm font-black uppercase text-black">Costos Registrados ({filteredCosts.length})</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr className="uppercase font-black text-[10px] tracking-widest text-gray-500">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Descripción</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCosts.map(cost => (
                      <tr key={cost.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-xs text-gray-600">{cost.date}</td>
                        <td className="py-3 px-4"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{cost.category}</span></td>
                        <td className="py-3 px-4 font-bold text-xs text-gray-700 uppercase">{cost.description || '—'}</td>
                        <td className="py-3 px-4 text-right font-black text-green-600">${formatNum(cost.amount)}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => handleDeleteOpCost(cost.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    ))}
                    {filteredCosts.length === 0 && (<tr><td colSpan="5" className="p-10 text-center text-xs text-gray-400 font-bold uppercase">No hay costos registrados</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {showNewCategoryModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <h3 className="text-lg font-black uppercase mb-4">Nueva Categoría de Costo</h3>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value.toUpperCase())}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs uppercase outline-none focus:border-green-500 mb-4"
                  placeholder="EJ: SEGURIDAD INDUSTRIAL"
                  onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowNewCategoryModal(false); setNewCategoryName(''); }}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-gray-300 transition-colors"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={() => {
                      if (!newCategoryName.trim()) return;
                      if (costCategories.includes(newCategoryName)) {
                        alert('Esta categoría ya existe');
                        return;
                      }
                      setCostCategories([...costCategories, newCategoryName]);
                      setNewOpCostForm({...newOpCostForm, category: newCategoryName});
                      setShowNewCategoryModal(false);
                      setNewCategoryName('');
                      alert('✅ Categoría agregada exitosamente');
                    }}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-green-700 transition-colors"
                  >
                    AGREGAR
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSimuladorModule = () => {
    return (
      <div className="w-full max-w-7xl animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none print:m-0 print:p-0 print:block print:w-full">
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
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Cantidad Solicitada ({calcInputs?.tipoProducto === 'BOLSAS' ? 'MILLARES' : 'KILOS (KG)'})</label>
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
                            <select value={ing?.nombre || ''} onChange={(e) => {
                                 const selectedId = e.target.value;
                                 let defaultCost = 0;
                                 if (selectedId === 'MP-RECICLADO') defaultCost = 1.00;
                                 else if (selectedId === 'MP-0240') defaultCost = 0.96;
                                 else if (selectedId === 'MP-11PG4') defaultCost = 0.91;
                                 else if (selectedId === 'MP-3003') defaultCost = 0.96;
                                 const invItem = (inventory || []).find(i => i?.id === selectedId);
                                 const finalCost = invItem ? invItem.cost : defaultCost;
                                 const newIngs = (calcInputs?.ingredientes || []).map(i => i?.id === ing?.id ? { ...i, nombre: selectedId, costo: finalCost } : i);
                                 setCalcInputs({ ...calcInputs, ingredientes: newIngs });
                              }} className="w-full text-[10px] font-bold uppercase outline-none mb-2 border-b border-gray-200 pb-1 bg-transparent text-gray-800">
                              <option value="">SELECCIONE MATERIA PRIMA...</option>
                              {(inventory || []).filter(i => i?.category === 'Materia Prima' || i?.category === 'Pigmentos').map(i => (<option key={i?.id} value={i?.id}>{i?.id} - {i?.desc}</option>))}
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
                     <span className={`text-[10px] font-black uppercase ${(calcInputs?.ingredientes || []).reduce((a,b)=>a+ (b.pct || 0), 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                       TOTAL MEZCLA: {(calcInputs?.ingredientes || []).reduce((a,b)=>a + (b.pct || 0), 0)}%
                     </span>
                   </div>
               </div>

               <div className="mt-6 border-t border-gray-200 pt-4">
                 <h3 className="text-xs font-black uppercase text-black mb-4">3. Variables de Proceso</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Merma Global Estimada (%)</label>
                       <input type="number" step="0.1" value={calcInputs?.mermaGlobalPorc === 0 ? '' : calcInputs?.mermaGlobalPorc} onChange={(e) => handleCalcChange('mermaGlobalPorc', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-black outline-none focus:border-orange-500 text-center" />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tipo de Producto</label>
                       <select value={calcInputs?.tipoProducto} onChange={(e) => setCalcInputs({...calcInputs, tipoProducto: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 text-xs font-black outline-none focus:border-orange-500 uppercase">
                         <option value="BOLSAS">BOLSAS / EMPAQUES</option>
                         <option value="TERMOENCOGIBLE">TERMOENCOGIBLE / TUBULAR</option>
                       </select>
                    </div>
                 </div>
               </div>

               {calcInputs?.tipoProducto === 'BOLSAS' && (
                 <div className="mt-4 bg-orange-50 p-4 rounded-xl border border-orange-200">
                    <h4 className="text-[10px] font-black text-orange-800 uppercase mb-3">Dimensiones para cálculo de Millar</h4>
                    <div className="grid grid-cols-2 gap-3">
                       <div><label className="text-[9px] font-bold text-orange-700 uppercase">Ancho (cm)</label><input type="number" value={calcInputs?.ancho === 0 ? '' : calcInputs?.ancho} onChange={(e) => handleCalcChange('ancho', e.target.value)} className="w-full text-xs font-black text-center outline-none bg-white rounded p-2 border border-orange-200 text-black" /></div>
                       <div><label className="text-[9px] font-bold text-orange-700 uppercase">Fuelles Totales (cm)</label><input type="number" value={calcInputs?.fuelles === 0 ? '' : calcInputs?.fuelles} onChange={(e) => handleCalcChange('fuelles', e.target.value)} className="w-full text-xs font-black text-center outline-none bg-white rounded p-2 border border-orange-200 text-black" /></div>
                       <div><label className="text-[9px] font-bold text-orange-700 uppercase">Largo (cm)</label><input type="number" value={calcInputs?.largo === 0 ? '' : calcInputs?.largo} onChange={(e) => handleCalcChange('largo', e.target.value)} className="w-full text-xs font-black text-center outline-none bg-white rounded p-2 border border-orange-200 text-black" /></div>
                       <div><label className="text-[9px] font-bold text-orange-700 uppercase">Micras</label><input type="text" inputMode="decimal" value={calcInputs?.micras ?? ''} onChange={(e) => setCalcInputs({...calcInputs, micras: e.target.value})} className="w-full text-xs font-black text-center outline-none bg-white rounded p-2 border border-orange-200 text-black" placeholder="0.004" /></div>
                    </div>
                 </div>
               )}
             </div>

             <div className="lg:col-span-8 p-8 bg-white">
                 <div className="hidden pdf-header mb-8">
                   <ReportHeader />
                   <h1 className="text-2xl font-black text-black uppercase border-b-4 border-orange-500 pb-2">SIMULACIÓN DE PRODUCCIÓN Y COSTOS</h1>
                   <p className="text-sm font-bold text-gray-500 uppercase mt-2">FECHA DE EMISIÓN: {getTodayDate()}</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                   <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                     <span className="text-[10px] font-black text-gray-500 uppercase block mb-1">Demanda Neta (Requerida)</span>
                     <span className="text-3xl font-black text-blue-600 block">{formatNum(calcKilosNetos)} <span className="text-sm">KG</span></span>
                     {isBolsas && <span className="text-[10px] font-bold text-gray-400 mt-2 block">Basado en Peso Millar: {formatNum(simPesoMillar)} g</span>}
                   </div>
                   <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl">
                     <span className="text-[10px] font-black text-orange-800 uppercase block mb-1">Merma Proyectada ({mermaPorc}%)</span>
                     <span className="text-3xl font-black text-orange-600 block">{formatNum(calcMermaGlobalKg)} <span className="text-sm">KG</span></span>
                   </div>
                   <div className="bg-black p-6 rounded-2xl shadow-lg border border-gray-800">
                     <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Carga a Planta (Total Mezcla)</span>
                     <span className="text-3xl font-black text-white block">{formatNum(calcTotalMezcla)} <span className="text-sm text-gray-400">KG</span></span>
                   </div>
                 </div>

                 <h3 className="text-sm font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">Desglose de Formulación y Costos</h3>
                 <div className="overflow-x-auto rounded-xl border border-gray-200 mb-8">
                   <table className="w-full text-left whitespace-nowrap text-sm">
                     <thead className="bg-gray-100 border-b-2 border-gray-200">
                       <tr className="uppercase font-black text-[10px] tracking-widest text-gray-600">
                         <th className="py-3 px-4 border-r">Insumo</th>
                         <th className="py-3 px-4 border-r text-center">% Mezcla</th>
                         <th className="py-3 px-4 border-r text-center bg-orange-50">Kilos a Cargar</th>
                         <th className="py-3 px-4 border-r text-right">Costo U.</th>
                         <th className="py-3 px-4 text-right">Costo Total</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {calcIngredientesProcesados.map(ing => (
                         <tr key={ing.id} className="hover:bg-gray-50">
                           <td className="py-3 px-4 font-bold text-xs uppercase border-r">{ing.desc}</td>
                           <td className="py-3 px-4 text-center font-black border-r text-gray-600">{ing.pct}%</td>
                           <td className="py-3 px-4 text-center font-black border-r bg-orange-50/50 text-orange-600">{formatNum(ing.kg)} KG</td>
                           <td className="py-3 px-4 text-right font-bold text-gray-500 border-r">${formatNum(ing.costo)}</td>
                           <td className="py-3 px-4 text-right font-black text-black">${formatNum(ing.totalCost)}</td>
                         </tr>
                       ))}
                     </tbody>
                     <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                       <tr>
                         <td colSpan="2" className="py-4 px-4 text-right font-black uppercase text-[10px] border-r">TOTALES DE PREPARACIÓN</td>
                         <td className="py-4 px-4 text-center font-black text-orange-700 border-r text-lg">{formatNum(calcTotalMezcla)} KG</td>
                         <td className="py-4 px-4 text-right font-black uppercase text-[10px] border-r">COSTO TOTAL MP</td>
                         <td className="py-4 px-4 text-right font-black text-black text-lg">${formatNum(calcCostoMezclaPreparada)}</td>
                       </tr>
                     </tfoot>
                   </table>
                 </div>

                 <h3 className="text-sm font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">Indicadores Unitarios de Costo</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white border-2 border-gray-100 p-6 rounded-2xl text-center">
                     <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Costo Promedio Mezcla</span>
                     <span className="text-2xl font-black text-gray-800 block">${formatNum(calcCostoPromedio)} <span className="text-[10px]">/ KG</span></span>
                     <span className="text-[9px] font-bold text-gray-400 mt-1 block">(Total / KG Planta)</span>
                   </div>
                   <div className="bg-white border-2 border-gray-100 p-6 rounded-2xl text-center">
                     <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Costo Neto x Kilo Terminado</span>
                     <span className="text-2xl font-black text-gray-800 block">${formatNum(calcCostoUnitarioNeto)} <span className="text-[10px]">/ KG</span></span>
                     <span className="text-[9px] font-bold text-gray-400 mt-1 block">(Absorbiendo Merma)</span>
                   </div>
                   <div className="bg-green-50 border-2 border-green-200 p-6 rounded-2xl text-center">
                     <span className="text-[10px] font-black text-green-800 uppercase block mb-1">Costo por {simUmFinal} (Final)</span>
                     <span className="text-3xl font-black text-green-600 block">${formatNum(calcCostoFinalUnidad)}</span>
                     <span className="text-[9px] font-bold text-green-700 mt-1 block uppercase">COSTO REAL MATERIA PRIMA</span>
                   </div>
                 </div>

             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProduccionModule = () => {
    // ── PROYECCIÓN MP ────────────────────────────────────────────────
    if (prodView === 'proyeccion') {
      const projection = generateProjectionData();
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-orange-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-black uppercase flex items-center gap-3"><TrendingUp className="text-orange-500" size={24}/> Proyección de Materia Prima</h2>
                <p className="text-[10px] font-bold text-orange-700 mt-1 uppercase">Análisis de inventario y días de cobertura estimados</p>
              </div>
              <button onClick={handleGeneratePurchaseOrder} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-all flex items-center gap-2"><ShoppingCart size={16}/> GENERAR ORDEN DE COMPRA</button>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr className="uppercase font-black text-[10px] tracking-widest text-gray-600">
                      <th className="py-3 px-4 border-r">Código / Material</th>
                      <th className="py-3 px-4 border-r text-center">Stock Actual</th>
                      <th className="py-3 px-4 border-r text-center">Comprometido</th>
                      <th className="py-3 px-4 border-r text-center">Disponible Real</th>
                      <th className="py-3 px-4 border-r text-center">Consumo/Día (30d)</th>
                      <th className="py-3 px-4 border-r text-center">Días Cobertura</th>
                      <th className="py-3 px-4 border-r text-center">Sugerir Compra</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {projection.map(mp => (
                      <tr key={mp.id} className={`hover:bg-gray-50 transition-colors ${mp.isCritical ? 'bg-red-50' : ''}`}>
                        <td className="py-3 px-4 border-r font-black text-orange-600">{mp.id}<br/><span className="text-[9px] font-bold text-gray-500 uppercase">{mp.desc}</span></td>
                        <td className="py-3 px-4 border-r text-center font-black text-blue-600">{formatNum(mp.stock)} {mp.unit}</td>
                        <td className="py-3 px-4 border-r text-center font-bold text-red-500">{formatNum(mp.committedStock)} {mp.unit}</td>
                        <td className={`py-3 px-4 border-r text-center font-black ${mp.availableReal < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatNum(mp.availableReal)} {mp.unit}</td>
                        <td className="py-3 px-4 border-r text-center font-bold text-gray-600">{formatNum(mp.dailyAvg)}</td>
                        <td className={`py-3 px-4 border-r text-center font-black text-lg ${mp.daysRemaining <= 30 ? 'text-red-600' : 'text-green-600'}`}>{mp.daysRemaining === 999 ? '∞' : Math.round(mp.daysRemaining)}</td>
                        <td className="py-3 px-4 border-r text-center font-black text-black">{mp.suggestOrder > 0 ? `${formatNum(mp.suggestOrder)} kg` : '—'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${mp.isCritical ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{mp.isCritical ? '⚠ CRÍTICO' : '✓ OK'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-blue-50">
              <h2 className="text-lg font-black text-blue-800 uppercase flex items-center gap-3"><FileText size={20} className="text-blue-600"/> Requisiciones de Materiales Pendientes (de Planta)</h2>
            </div>
            <div className="overflow-x-auto p-6">
              {invRequisitions.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase">No hay requisiciones de materiales pendientes</div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr className="uppercase font-black text-[10px] tracking-widest text-gray-600">
                      <th className="py-3 px-4 border-r">ID</th><th className="py-3 px-4 border-r">Fecha</th><th className="py-3 px-4 border-r">OP Relacionada</th><th className="py-3 px-4 border-r">Materiales</th><th className="py-3 px-4 border-r text-center">Estado</th><th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invRequisitions.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 border-r font-black text-orange-600">{req.id}</td>
                        <td className="py-3 px-4 border-r font-bold">{req.date}</td>
                        <td className="py-3 px-4 border-r font-bold text-blue-600">{req.opId || '—'}</td>
                        <td className="py-3 px-4 border-r">
                          {(req.items || []).map((item, i) => <div key={i} className="text-[9px] font-bold">{item.id}: <span className="text-orange-600">{formatNum(item.qty)} kg</span></div>)}
                        </td>
                        <td className="py-3 px-4 border-r text-center"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${req.status === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' : req.status === 'APROBADA' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{req.status}</span></td>
                        <td className="py-3 px-4 text-center">
                          {req.status === 'PENDIENTE' && (
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => setReqToApprove(req)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-green-600 transition-all">Aprobar</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {reqToApprove && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-t-8 border-green-500">
                <h3 className="text-lg font-black uppercase mb-4">Aprobar Requisición {reqToApprove.id}</h3>
                <p className="text-xs font-bold text-gray-500 mb-6">¿Desea aprobar esta requisición y descargar los materiales del inventario?</p>
                <div className="flex gap-3">
                  <button onClick={() => setReqToApprove(null)} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-300">Cancelar</button>
                  <button onClick={async () => {
                    try {
                      const batch = writeBatch(db);
                      for (let item of (reqToApprove.items || [])) {
                        const invItem = inventory.find(i => i.id === item.id);
                        if (invItem) {
                          batch.update(getDocRef('inventory', invItem.id), { stock: (invItem.stock || 0) - parseNum(item.qty) });
                          batch.set(getDocRef('inventoryMovements', `REQ-${reqToApprove.id}-${item.id}-${Date.now()}`), { id: `REQ-${reqToApprove.id}-${item.id}`, date: getTodayDate(), itemId: item.id, itemName: invItem.desc, type: 'SALIDA', qty: parseNum(item.qty), cost: invItem.cost, totalValue: parseNum(item.qty) * invItem.cost, reference: reqToApprove.id, notes: `REQUISICIÓN PLANTA - OP: ${reqToApprove.opId || 'N/A'}`, timestamp: Date.now(), user: appUser?.name });
                        }
                      }
                      batch.update(getDocRef('inventoryRequisitions', reqToApprove.id), { status: 'APROBADA' });
                      await batch.commit();
                      setReqToApprove(null);
                      setDialog({ title: 'Éxito', text: 'Requisición aprobada y stock descontado.', type: 'alert' });
                    } catch (e) { setDialog({ title: 'Error', text: e.message, type: 'alert' }); }
                  }} className="flex-1 bg-green-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-green-600 flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Aprobar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── ÓRDENES DE COMPRA ────────────────────────────────────────────
    if (prodView === 'ordenes_compra') {
      return (
        <div className="space-y-6 animate-in fade-in">
          {viewingPO ? (
            <div id="pdf-content" className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden p-8">
              <div className="flex justify-between mb-6 no-pdf">
                <button onClick={() => setViewingPO(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">← Volver</button>
                <div className="flex gap-2">
                  <button onClick={() => handleExportPDF(`OC_${viewingPO.id}`, false)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
                  {viewingPO.status === 'PENDIENTE' && <button onClick={() => handleUpdatePOStatus(viewingPO.id, 'RECIBIDA')} className="bg-green-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-green-700">MARCAR RECIBIDA</button>}
                  <button onClick={() => handleDeletePO(viewingPO.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase hover:bg-red-600"><Trash2 size={14}/></button>
                </div>
              </div>
              <div className="hidden pdf-header mb-6"><ReportHeader /></div>
              <div className="text-center my-6"><span className="text-2xl font-black uppercase border-b-4 border-orange-500 pb-2">ORDEN DE COMPRA N° {viewingPO.id}</span></div>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm font-bold uppercase">
                <div><p>PROVEEDOR: {viewingPO.provider}</p><p>FECHA: {viewingPO.date}</p></div>
                <div className="text-right"><p>ESTADO: <span className={viewingPO.status === 'RECIBIDA' ? 'text-green-600' : 'text-yellow-600'}>{viewingPO.status}</span></p><p>SOLICITADO POR: {viewingPO.user}</p></div>
              </div>
              <table className="w-full border-collapse border-2 border-black mb-6 text-xs">
                <thead className="bg-gray-100"><tr><th className="p-3 border border-black text-left">Código</th><th className="p-3 border border-black">Material</th><th className="p-3 border border-black text-center">Stock Actual</th><th className="p-3 border border-black text-center">Cantidad Sugerida</th><th className="p-3 border border-black text-right">Costo Unit.</th><th className="p-3 border border-black text-right">Total</th></tr></thead>
                <tbody>{(viewingPO.items || []).map((item, i) => (<tr key={i}><td className="p-3 border border-black font-black text-orange-600">{item.productCode}</td><td className="p-3 border border-black">{item.productName}</td><td className="p-3 border border-black text-center">{formatNum(item.currentStock)}</td><td className="p-3 border border-black text-center font-black">{formatNum(item.suggestedQty)}</td><td className="p-3 border border-black text-right">${formatNum(item.unitCost)}</td><td className="p-3 border border-black text-right font-black">${formatNum(item.suggestedQty * item.unitCost)}</td></tr>))}</tbody>
                <tfoot className="bg-gray-100 font-black"><tr><td colSpan="5" className="p-3 border border-black text-right">SUBTOTAL ESTIMADO:</td><td className="p-3 border border-black text-right text-orange-600">${formatNum(viewingPO.subtotal)}</td></tr></tfoot>
              </table>
              {viewingPO.notes && <div className="border-2 border-black p-4 rounded-xl mb-6"><p className="font-black text-xs uppercase">NOTAS: {viewingPO.notes}</p></div>}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200 bg-blue-50 flex justify-between items-center">
                <div><h2 className="text-xl font-black text-blue-800 uppercase flex items-center gap-3"><ShoppingCart className="text-blue-600" size={24}/> Órdenes de Compra</h2><p className="text-[10px] font-bold text-blue-600 mt-1 uppercase">Gestión de compras de materia prima</p></div>
                <button onClick={handleGeneratePurchaseOrder} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 flex items-center gap-2"><Plus size={16}/> NUEVA ORDEN</button>
              </div>
              <div className="p-6">
                {purchaseOrders.length === 0 ? (
                  <div className="text-center py-16 text-gray-400"><ShoppingCart size={48} className="mx-auto mb-4 opacity-30"/><p className="font-black text-xs uppercase">No hay órdenes de compra registradas</p></div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px] tracking-widest text-gray-600"><th className="py-3 px-4 border-r">ID / Fecha</th><th className="py-3 px-4 border-r">Proveedor</th><th className="py-3 px-4 border-r text-center">Ítems</th><th className="py-3 px-4 border-r text-right">Subtotal Est.</th><th className="py-3 px-4 border-r text-center">Estado</th><th className="py-3 px-4 text-center">Acciones</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {purchaseOrders.map(po => (
                          <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 border-r font-black text-blue-600">{po.id}<br/><span className="text-[9px] text-gray-400 font-bold">{po.date}</span></td>
                            <td className="py-3 px-4 border-r font-bold uppercase">{po.provider}</td>
                            <td className="py-3 px-4 border-r text-center font-bold">{(po.items || []).length}</td>
                            <td className="py-3 px-4 border-r text-right font-black text-green-600">${formatNum(po.subtotal)}</td>
                            <td className="py-3 px-4 border-r text-center"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${po.status === 'RECIBIDA' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{po.status}</span></td>
                            <td className="py-3 px-4 text-center"><button onClick={() => setViewingPO(po)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-800 hover:text-white transition-all"><Eye size={14}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {showPOModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border-t-8 border-orange-500 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-black uppercase mb-6">Nueva Orden de Compra</h3>
                <div className="space-y-4 mb-6">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Proveedor</label><input type="text" value={poProvider} onChange={e => setPoProvider(e.target.value.toUpperCase())} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs uppercase outline-none focus:border-orange-500" placeholder="NOMBRE DEL PROVEEDOR" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Notas</label><input type="text" value={poNotes} onChange={e => setPoNotes(e.target.value.toUpperCase())} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs uppercase outline-none focus:border-orange-500" placeholder="OBSERVACIONES" /></div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
                  <table className="w-full text-xs"><thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px]"><th className="p-3 border-r">Producto</th><th className="p-3 border-r text-center">Stock</th><th className="p-3 border-r text-center">Cantidad</th><th className="p-3 text-right">Costo U.</th></tr></thead>
                  <tbody>{selectedPOItems.map((item, i) => (<tr key={i} className="border-b border-gray-100"><td className="p-3 border-r font-black text-orange-600">{item.productCode}<br/><span className="text-[9px] text-gray-500 font-bold">{item.productName}</span></td><td className="p-3 border-r text-center font-bold">{formatNum(item.currentStock)}</td><td className="p-3 border-r text-center"><input type="number" value={item.suggestedQty} onChange={e => setSelectedPOItems(selectedPOItems.map((it, j) => j === i ? {...it, suggestedQty: parseNum(e.target.value)} : it))} className="w-20 border border-gray-200 rounded-lg p-1 text-center font-black text-xs" /></td><td className="p-3 text-right font-bold">${formatNum(item.unitCost)}</td></tr>))}</tbody></table>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setShowPOModal(false); setSelectedPOItems([]); setPoProvider(''); setPoNotes(''); }} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-300">Cancelar</button>
                  <button onClick={handleSavePurchaseOrder} className="bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-gray-800 flex items-center gap-2"><CheckCircle2 size={16}/> GUARDAR ORDEN</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── PRODUCCIÓN ACTIVA ─────────────────────────────────────────────
    if (prodView === 'activos') {
      const activeReqs = requirements.filter(r => r.status === 'EN PROCESO' || r.status === 'PENDIENTE' || !r.status);
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-green-50 flex justify-between items-center">
              <div><h2 className="text-xl font-black text-green-800 uppercase flex items-center gap-3"><PlayCircle className="text-green-600" size={24}/> Producción Activa</h2><p className="text-[10px] font-bold text-green-600 mt-1 uppercase">Órdenes de producción en proceso — generadas desde Ventas</p></div>
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-black text-xs uppercase">{activeReqs.length} ÓP ACTIVAS</div>
            </div>
            <div className="p-6">
              {activeReqs.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><PlayCircle size={48} className="mx-auto mb-4 opacity-30"/><p className="font-black text-xs uppercase">No hay órdenes de producción activas</p><p className="text-xs text-gray-400 mt-2">Las OPs se generan desde el módulo de Ventas → Requisiciones</p></div>
              ) : (
                <div className="space-y-4">
                  {activeReqs.map(req => {
                    const prod = req.production || {};
                    const extStatus = prod.extrusion?.isClosed ? '✓' : prod.extrusion?.batches?.length > 0 ? '⏳' : '—';
                    const impStatus = prod.impresion?.isClosed ? '✓' : prod.impresion?.batches?.length > 0 ? '⏳' : '—';
                    const selStatus = prod.sellado?.isClosed ? '✓' : prod.sellado?.batches?.length > 0 ? '⏳' : '—';
                    return (
                      <div key={req.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:border-orange-300 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-black text-black uppercase text-sm">OP #{String(req.id).replace('OP-','').padStart(5,'0')} — {req.client}</h3>
                            <p className="text-xs font-bold text-gray-500 mt-1 uppercase">{req.desc} | {req.ancho}cm × {req.largo}cm | {req.micras} mic | {formatNum(req.requestedKg)} KG</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setSelectedPhaseReqId(req.id); setActivePhaseTab('extrusion'); setPhaseForm({...initialPhaseForm, date: getTodayDate()}); }} className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 transition-all flex items-center gap-1"><Plus size={12}/> REGISTRAR FASE</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-black uppercase mb-4">
                          {[['Extrusión', extStatus, 'extrusion', 'orange'], ['Impresión', impStatus, 'impresion', 'blue'], ['Sellado/Corte', selStatus, 'sellado', 'green']].map(([label, st, key, color]) => (
                            <div key={key} className={`p-3 rounded-xl border-2 ${st === '✓' ? `border-${color}-300 bg-${color}-50 text-${color}-700` : st === '⏳' ? 'border-yellow-300 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white text-gray-400'}`}>
                              <div className="text-lg">{st}</div>
                              <div className="text-[9px] mt-1">{label}</div>
                              {(prod[key]?.batches || []).length > 0 && <div className="text-[8px] text-gray-500">{(prod[key]?.batches || []).length} lote(s)</div>}
                            </div>
                          ))}
                        </div>
                        {selectedPhaseReqId === req.id && (
                          <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 mt-4">
                            <div className="flex gap-2 mb-4">
                              {['extrusion', 'impresion', 'sellado'].map(phase => (
                                <button key={phase} onClick={() => setActivePhaseTab(phase)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activePhaseTab === phase ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{phase === 'extrusion' ? 'Extrusión' : phase === 'impresion' ? 'Impresión' : 'Sellado'}</button>
                              ))}
                              <button onClick={() => setSelectedPhaseReqId(null)} className="ml-auto p-2 text-gray-400 hover:text-red-500"><X size={16}/></button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                              <div><label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Fecha</label><input type="date" value={phaseForm.date} onChange={e => setPhaseForm({...phaseForm, date: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-orange-500" /></div>
                              <div><label className="text-[9px] font-black text-gray-500 uppercase block mb-1">KG Producidos</label><input type="number" step="0.01" value={phaseForm.producedKg} onChange={e => setPhaseForm({...phaseForm, producedKg: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-orange-500 text-center" placeholder="0.00" /></div>
                              <div><label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Merma KG</label><input type="number" step="0.01" value={phaseForm.mermaKg} onChange={e => setPhaseForm({...phaseForm, mermaKg: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-orange-500 text-center" placeholder="0.00" /></div>
                              {activePhaseTab === 'extrusion' && <><div><label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Operador Ext.</label><input type="text" value={phaseForm.operadorExt} onChange={e => setPhaseForm({...phaseForm, operadorExt: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-orange-500 uppercase" /></div><div><label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Motor Ext.</label><input type="number" step="0.1" value={phaseForm.motorExt} onChange={e => setPhaseForm({...phaseForm, motorExt: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-orange-500 text-center" /></div></>}
                              {activePhaseTab === 'sellado' && <><div><label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Millares Prod.</label><input type="number" step="0.01" value={phaseForm.millaresProd} onChange={e => setPhaseForm({...phaseForm, millaresProd: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-orange-500 text-center" /></div><div><label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Tipo Sello</label><select value={phaseForm.tipoSello} onChange={e => setPhaseForm({...phaseForm, tipoSello: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-orange-500"><option>Sello FC</option><option>Sello SC</option><option>Lateral</option></select></div></>}
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                              <h4 className="text-[10px] font-black text-gray-600 uppercase mb-3">Insumos Consumidos</h4>
                              <div className="flex gap-2 mb-2">
                                <select value={phaseIngId} onChange={e => setPhaseIngId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg p-2 text-xs font-bold outline-none">
                                  <option value="">Seleccione insumo...</option>
                                  {inventory.map(i => <option key={i.id} value={i.id}>{i.id} - {i.desc} (Stock: {formatNum(i.stock)})</option>)}
                                </select>
                                <input type="number" step="0.01" value={phaseIngQty} onChange={e => setPhaseIngQty(e.target.value)} className="w-24 border border-gray-200 rounded-lg p-2 text-xs font-bold text-center outline-none" placeholder="KG" />
                                <button onClick={() => { if(!phaseIngId || !phaseIngQty) return; setPhaseForm({...phaseForm, insumos: [...(phaseForm.insumos||[]), {id: phaseIngId, qty: parseNum(phaseIngQty)}]}); setPhaseIngId(''); setPhaseIngQty(''); }} className="bg-orange-500 text-white px-3 py-2 rounded-lg text-xs font-black hover:bg-orange-600"><Plus size={14}/></button>
                              </div>
                              {(phaseForm.insumos || []).map((ins, i) => (
                                <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200 mb-1">
                                  <span className="text-xs font-bold text-orange-600">{ins.id}</span>
                                  <span className="text-xs font-black">{formatNum(ins.qty)} KG</span>
                                  <button onClick={() => setPhaseForm({...phaseForm, insumos: phaseForm.insumos.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-3 justify-end">
                              <button onClick={() => handleSavePhaseReport(req, false)} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-orange-600 flex items-center gap-2"><Save size={14}/> Guardar Lote</button>
                              {activePhaseTab === 'sellado' && <button onClick={() => handleSavePhaseReport(req, true)} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-800 flex items-center gap-2"><CheckCircle2 size={14}/> FINALIZAR OP</button>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── HISTORIAL / FINIQUITOS ────────────────────────────────────────
    if (prodView === 'reportes') {
      const completedReqs = requirements.filter(r => r.status === 'COMPLETADO');
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div><h2 className="text-xl font-black text-black uppercase flex items-center gap-3"><History className="text-gray-500" size={24}/> Historial de Producción / Finiquitos</h2><p className="text-[10px] font-bold text-gray-500 mt-1 uppercase">{completedReqs.length} órdenes completadas</p></div>
              <button onClick={() => handleExportPDF('Historial_Produccion', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2"><Printer size={16}/> PDF</button>
            </div>
            <div className="p-6" id="pdf-content">
              <div className="hidden pdf-header mb-6"><ReportHeader /><h1 className="text-xl font-black uppercase border-b-4 border-orange-500 pb-2">HISTORIAL DE PRODUCCIÓN</h1></div>
              {completedReqs.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><History size={48} className="mx-auto mb-4 opacity-30"/><p className="font-black text-xs uppercase">No hay producción finalizada</p></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px] tracking-widest text-gray-600"><th className="py-3 px-4 border-r">OP / Fecha</th><th className="py-3 px-4 border-r">Cliente</th><th className="py-3 px-4 border-r">Producto / Specs</th><th className="py-3 px-4 border-r text-center">KG Solicitados</th><th className="py-3 px-4 border-r text-center">KG Producidos</th><th className="py-3 px-4 border-r text-center">Millares</th><th className="py-3 px-4 text-center">Estado</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {completedReqs.map(req => {
                        const prod = req.production || {};
                        const totalKgProd = [...(prod.extrusion?.batches||[]), ...(prod.impresion?.batches||[]), ...(prod.sellado?.batches||[])].reduce((s,b) => s + parseNum(b.producedKg), 0);
                        const totalMillares = (prod.sellado?.batches||[]).reduce((s,b) => s + parseNum(b.techParams?.millares||b.millaresProd||0), 0);
                        return (
                          <tr key={req.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 border-r font-black text-orange-600">#{String(req.id).replace('OP-','').padStart(5,'0')}<br/><span className="text-[9px] text-gray-400 font-bold">{req.fecha}</span></td>
                            <td className="py-3 px-4 border-r font-bold uppercase">{req.client}</td>
                            <td className="py-3 px-4 border-r font-bold">{req.desc}<br/><span className="text-[9px] text-gray-400">{req.ancho}×{req.largo}cm | {req.micras}mic | {req.color}</span></td>
                            <td className="py-3 px-4 border-r text-center font-black text-blue-600">{formatNum(req.requestedKg)}</td>
                            <td className="py-3 px-4 border-r text-center font-black text-green-600">{formatNum(totalKgProd)}</td>
                            <td className="py-3 px-4 border-r text-center font-bold">{totalMillares > 0 ? formatNum(totalMillares) : '—'}</td>
                            <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[9px] font-black uppercase">COMPLETADO</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return <div className="text-center font-bold p-10 bg-white rounded-3xl text-gray-500">Seleccione una pestaña de producción</div>;
  };

  // ── REPORTES FINANCIEROS ──────────────────────────────────────────────────
  const renderReportesFinancierosModule = () => {
    const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const getIngresosByMonth = (ym) => invoices.filter(i => (i.fecha||'').startsWith(ym) || (typeof i.timestamp === 'number' && new Date(i.timestamp).toISOString().startsWith(ym))).reduce((s,i) => s + parseNum(i.total), 0);
    const getCostosMPByMonth = (ym) => invMovements.filter(m => m.type === 'SALIDA' && (m.date||'').startsWith(ym)).reduce((s,m) => s + parseNum(m.totalValue), 0);
    const getCostosOPByMonth = (ym) => opCosts.filter(c => (c.month||c.date||'').startsWith(ym)).reduce((s,c) => s + parseNum(c.amount), 0);

    // For "super finiquito" per OP
    const getOPFinancials = (req) => {
      const prod = req.production || {};
      let costoMP = 0;
      [...(prod.extrusion?.batches||[]), ...(prod.impresion?.batches||[]), ...(prod.sellado?.batches||[])].forEach(b => { costoMP += parseNum(b.cost||0); });
      const relatedInvoices = invoices.filter(i => i.opAsignada === req.id);
      const ingresos = relatedInvoices.reduce((s,i) => s + parseNum(i.total), 0);
      const totalMillares = (prod.sellado?.batches||[]).reduce((s,b) => s + parseNum(b.techParams?.millares||b.millaresProd||0), 0);
      return { costoMP, ingresos, utilidad: ingresos - costoMP, millares: totalMillares };
    };

    // Build monthly data for last 12 months
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const ingresos = getIngresosByMonth(ym);
      const costosMP = getCostosMPByMonth(ym);
      const costosOP = getCostosOPByMonth(ym);
      const utilidad = ingresos - costosMP - costosOP;
      months.push({ ym, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, ingresos, costosMP, costosOP, utilidad });
    }

    const selMonth = selectedMonth;
    const selIngresos = getIngresosByMonth(selMonth);
    const selCostosMP = getCostosMPByMonth(selMonth);
    const selCostosOP = getCostosOPByMonth(selMonth);
    const selUtilidad = selIngresos - selCostosMP - selCostosOP;
    const selInvoices = invoices.filter(i => (i.fecha||'').startsWith(selMonth));
    const selCompletedOPs = requirements.filter(r => r.status === 'COMPLETADO');

    // Mermas del mes
    const selMermaKg = requirements.filter(r => (r.fecha||'').startsWith(selMonth)).reduce((s, req) => {
      const prod = req.production || {};
      return s + [...(prod.extrusion?.batches||[]), ...(prod.impresion?.batches||[]), ...(prod.sellado?.batches||[])].reduce((sb, b) => sb + parseNum(b.mermaKg||0), 0);
    }, 0);

    const REPORT_CARDS = [
      { id: 'general', icon: <FileText size={32}/>, label: 'Reporte General', desc: 'Resumen completo del período', color: 'blue' },
      { id: 'ingresos_vs_costos', icon: <BarChart3 size={32}/>, label: 'Ingresos vs Costos', desc: 'Análisis comparativo detallado', color: 'green' },
      { id: 'mermas', icon: <AlertTriangle size={32}/>, label: 'Análisis de Mermas', desc: 'Pérdidas y desperdicios', color: 'orange' },
      { id: 'super_finiquito', icon: <FileCheck size={32}/>, label: 'Súper Finiquito (OP)', desc: 'Análisis por orden individual', color: 'purple' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-2xl font-black text-black uppercase flex items-center gap-3"><BarChart3 className="text-blue-600" size={32}/> Reportes Financieros / Rentabilidad</h2>
            <p className="text-xs font-bold text-gray-500 uppercase mt-2">Dashboard de Ingresos, Costos y Utilidad</p>
          </div>

          <div className="p-8 space-y-8">
            <div>
              <h3 className="text-sm font-black uppercase text-black mb-4">Reportes Disponibles</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {REPORT_CARDS.map(card => (
                  <button key={card.id} onClick={() => setShowReportType(card.id)} className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg ${showReportType === card.id ? `border-${card.color}-400 bg-${card.color}-50 shadow-lg` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className={`text-${card.color}-500 mb-3`}>{card.icon}</div>
                    <div className="font-black text-xs uppercase text-black">{card.label}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{card.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes de Análisis</label>
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-blue-500" />
              </div>
            </div>

            {showReportType === 'general' && (
              <div id="pdf-content" className="space-y-6">
                <div className="flex justify-between items-center no-pdf">
                  <h3 className="text-lg font-black uppercase">Reporte General — {selMonth.replace('-', '/')}</h3>
                  <button onClick={() => handleExportPDF('Reporte_General_Financiero', false)} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-gray-800"><Printer size={16}/> Exportar PDF</button>
                </div>
                <div className="hidden pdf-header mb-6"><ReportHeader /><h1 className="text-xl font-black uppercase border-b-4 border-blue-500 pb-2">REPORTE GENERAL FINANCIERO — {selMonth}</h1></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[['Ingresos', selIngresos, 'green'],['Costos MP', selCostosMP, 'orange'],['Costos OP', selCostosOP, 'red'],['Utilidad', selUtilidad, selUtilidad >= 0 ? 'blue' : 'red']].map(([label, val, color]) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-2xl p-6">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">{label}</span>
                      <span className={`text-2xl font-black text-${color}-600 block`}>${formatNum(val)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-black mb-3">Facturas Emitidas</h4>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px]"><th className="py-3 px-4 border-r">Fecha</th><th className="py-3 px-4 border-r">Cliente</th><th className="py-3 px-4 border-r">Documento</th><th className="py-3 px-4 text-right">Total</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {selInvoices.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-bold">Sin facturas en este período</td></tr> : selInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-gray-50"><td className="py-3 px-4 border-r font-bold">{inv.fecha}</td><td className="py-3 px-4 border-r font-bold uppercase">{inv.clientName}</td><td className="py-3 px-4 border-r font-black text-orange-600">{inv.documento}</td><td className="py-3 px-4 text-right font-black text-green-600">${formatNum(inv.total)}</td></tr>
                        ))}
                      </tbody>
                      {selInvoices.length > 0 && <tfoot className="bg-gray-100 font-black"><tr><td colSpan="3" className="py-3 px-4 text-right uppercase">Total:</td><td className="py-3 px-4 text-right text-orange-600">${formatNum(selIngresos)}</td></tr></tfoot>}
                    </table>
                  </div>
                </div>
              </div>
            )}

            {showReportType === 'ingresos_vs_costos' && (
              <div id="pdf-content" className="space-y-6">
                <div className="flex justify-between items-center no-pdf">
                  <h3 className="text-lg font-black uppercase">Ingresos vs Costos — Últimos 12 Meses</h3>
                  <button onClick={() => handleExportPDF('Ingresos_vs_Costos', true)} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-gray-800"><Printer size={16}/> Exportar PDF</button>
                </div>
                <div className="hidden pdf-header mb-6"><ReportHeader /><h1 className="text-xl font-black uppercase border-b-4 border-green-500 pb-2">ANÁLISIS INGRESOS VS COSTOS</h1></div>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px] tracking-widest"><th className="py-3 px-4 border-r">Período</th><th className="py-3 px-4 border-r text-right">Ingresos</th><th className="py-3 px-4 border-r text-right">Costos MP</th><th className="py-3 px-4 border-r text-right">Costos OP</th><th className="py-3 px-4 border-r text-right">Utilidad</th><th className="py-3 px-4 text-center">% Util.</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {months.map(m => {
                        const margen = m.ingresos > 0 ? (m.utilidad / m.ingresos * 100) : 0;
                        return (
                          <tr key={m.ym} className={`hover:bg-gray-50 ${m.ym === selMonth ? 'bg-blue-50' : ''}`}>
                            <td className="py-3 px-4 border-r font-black">{m.label}</td>
                            <td className="py-3 px-4 border-r text-right font-black text-green-600">${formatNum(m.ingresos)}</td>
                            <td className="py-3 px-4 border-r text-right font-bold text-orange-600">${formatNum(m.costosMP)}</td>
                            <td className="py-3 px-4 border-r text-right font-bold text-red-500">${formatNum(m.costosOP)}</td>
                            <td className={`py-3 px-4 border-r text-right font-black ${m.utilidad >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${formatNum(m.utilidad)}</td>
                            <td className={`py-3 px-4 text-center font-black ${margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margen.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showReportType === 'mermas' && (
              <div id="pdf-content" className="space-y-6">
                <div className="flex justify-between items-center no-pdf">
                  <h3 className="text-lg font-black uppercase">Análisis de Mermas — {selMonth.replace('-', '/')}</h3>
                  <button onClick={() => handleExportPDF('Analisis_Mermas', false)} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-gray-800"><Printer size={16}/> Exportar PDF</button>
                </div>
                <div className="hidden pdf-header mb-6"><ReportHeader /><h1 className="text-xl font-black uppercase border-b-4 border-orange-500 pb-2">ANÁLISIS DE MERMAS</h1></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6"><span className="text-[10px] font-black text-orange-700 uppercase block mb-1">Total Merma KG (Mes)</span><span className="text-3xl font-black text-orange-600">{formatNum(selMermaKg)} <span className="text-sm">KG</span></span></div>
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6"><span className="text-[10px] font-black text-red-700 uppercase block mb-1">Costo Estimado Merma</span><span className="text-3xl font-black text-red-600">${formatNum(selMermaKg * 0.96)}</span></div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px]"><th className="py-3 px-4 border-r">OP</th><th className="py-3 px-4 border-r">Cliente</th><th className="py-3 px-4 border-r">Fase</th><th className="py-3 px-4 text-right">Merma KG</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {requirements.filter(r => (r.fecha||'').startsWith(selMonth)).flatMap(req => {
                        const prod = req.production || {};
                        return ['extrusion','impresion','sellado'].flatMap(phase =>
                          (prod[phase]?.batches||[]).filter(b => parseNum(b.mermaKg) > 0).map((b, i) => (
                            <tr key={`${req.id}-${phase}-${i}`} className="hover:bg-gray-50">
                              <td className="py-3 px-4 border-r font-black text-orange-600">#{String(req.id).replace('OP-','').padStart(5,'0')}</td>
                              <td className="py-3 px-4 border-r font-bold uppercase">{req.client}</td>
                              <td className="py-3 px-4 border-r font-bold capitalize">{phase}</td>
                              <td className="py-3 px-4 text-right font-black text-red-600">{formatNum(parseNum(b.mermaKg))} KG</td>
                            </tr>
                          ))
                        );
                      })}
                      {selMermaKg === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-bold uppercase">Sin mermas registradas en este período</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showReportType === 'super_finiquito' && (
              <div id="pdf-content" className="space-y-6">
                <div className="flex justify-between items-center no-pdf">
                  <h3 className="text-lg font-black uppercase">Súper Finiquito por OP</h3>
                  <button onClick={() => handleExportPDF('Super_Finiquito', true)} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-gray-800"><Printer size={16}/> Exportar PDF</button>
                </div>
                <div className="hidden pdf-header mb-6"><ReportHeader /><h1 className="text-xl font-black uppercase border-b-4 border-purple-500 pb-2">SÚPER FINIQUITO POR ORDEN DE PRODUCCIÓN</h1></div>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px]"><th className="py-3 px-4 border-r">OP / Fecha</th><th className="py-3 px-4 border-r">Cliente</th><th className="py-3 px-4 border-r">Producto</th><th className="py-3 px-4 border-r text-right">Millares</th><th className="py-3 px-4 border-r text-right">Costo MP</th><th className="py-3 px-4 border-r text-right">Ingresos</th><th className="py-3 px-4 text-right">Utilidad</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {selCompletedOPs.length === 0 ? <tr><td colSpan="7" className="p-8 text-center text-gray-400 font-bold uppercase">No hay órdenes completadas</td></tr> :
                        selCompletedOPs.map(req => {
                          const fin = getOPFinancials(req);
                          return (
                            <tr key={req.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 border-r font-black text-purple-600">#{String(req.id).replace('OP-','').padStart(5,'0')}<br/><span className="text-[9px] text-gray-400">{req.fecha}</span></td>
                              <td className="py-3 px-4 border-r font-bold uppercase">{req.client}</td>
                              <td className="py-3 px-4 border-r font-bold">{req.desc}</td>
                              <td className="py-3 px-4 border-r text-right font-black">{fin.millares > 0 ? formatNum(fin.millares) : '—'}</td>
                              <td className="py-3 px-4 border-r text-right font-bold text-orange-600">${formatNum(fin.costoMP)}</td>
                              <td className="py-3 px-4 border-r text-right font-bold text-green-600">${formatNum(fin.ingresos)}</td>
                              <td className={`py-3 px-4 text-right font-black text-lg ${fin.utilidad >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${formatNum(fin.utilidad)}</td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!showReportType && (
              <div className="text-center py-12 text-gray-400"><BarChart3 size={48} className="mx-auto mb-4 opacity-20"/><p className="font-black text-sm uppercase">Seleccione un tipo de reporte para comenzar</p></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderConfiguracionModule = () => {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
           <h2 className="text-xl font-black uppercase text-black mb-6 flex items-center gap-3 border-b pb-4"><Settings2 className="text-gray-400"/> Configuración del Sistema</h2>
           <div className="space-y-6">
              <div>
                 <h3 className="text-sm font-black uppercase text-black mb-2">Fondo de Pantalla de Inicio</h3>
                 <p className="text-xs text-gray-500 font-bold mb-4">Sube una imagen para personalizar el fondo de la pantalla de inicio de sesión.</p>
                 <input type="file" accept="image/*" onChange={handleBgUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-gray-100 file:text-black hover:file:bg-gray-200" />
                 {settings.loginBg && <img src={settings.loginBg} alt="Background Preview" className="mt-4 rounded-xl border border-gray-200 max-h-48 object-cover shadow-sm" />}
              </div>
           </div>
        </div>
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
           <h2 className="text-xl font-black uppercase text-black mb-6 flex items-center gap-3 border-b pb-4"><Users className="text-orange-500"/> Gestión de Usuarios</h2>
           <form onSubmit={handleSaveUser} className="space-y-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h3 className="text-sm font-black uppercase text-black mb-4">{editingUserId ? 'Modificar Usuario' : 'Nuevo Usuario'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Usuario (ID)</label><input type="text" disabled={!!editingUserId} required value={newUserForm.username} onChange={e=>setNewUserForm({...newUserForm, username: e.target.value.toLowerCase().trim()})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs outline-none focus:border-orange-500" /></div>
                 <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Contraseña</label><input type="text" required value={newUserForm.password} onChange={e=>setNewUserForm({...newUserForm, password: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs outline-none focus:border-orange-500" /></div>
                 <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nombre Completo</label><input type="text" required value={newUserForm.name} onChange={e=>setNewUserForm({...newUserForm, name: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs uppercase outline-none focus:border-orange-500" /></div>
                 <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Rol / Cargo</label><input type="text" value={newUserForm.role} onChange={e=>setNewUserForm({...newUserForm, role: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs uppercase outline-none focus:border-orange-500" /></div>
              </div>
              <div className="mt-4">
                 <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Permisos de Módulos</label>
                 <div className="flex flex-wrap gap-4">
                    {['ventas', 'produccion', 'inventario', 'costos', 'configuracion'].map(perm => (
                       <label key={perm} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" checked={newUserForm.permissions[perm]} onChange={e=>setNewUserForm({...newUserForm, permissions: {...newUserForm.permissions, [perm]: e.target.checked}})} className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" />
                          <span className="text-xs font-black uppercase text-gray-700">{perm}</span>
                       </label>
                    ))}
                 </div>
              </div>
              <div className="flex justify-end pt-4"><button type="submit" className="bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2"><UserPlus size={16}/> GUARDAR USUARIO</button></div>
           </form>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap text-sm">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr className="uppercase font-black text-[10px] text-gray-500 tracking-widest">
                    <th className="py-3 px-4">Usuario / Nombre</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Permisos</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(systemUsers || []).map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-black">{u.username}<br/><span className="text-[10px] text-gray-500 font-bold">{u.name}</span></td>
                      <td className="py-3 px-4 font-bold text-xs uppercase">{u.role}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap max-w-[200px]">
                          {Object.entries(u.permissions||{}).filter(([_,v])=>v).map(([k])=><span key={k} className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[8px] font-black uppercase">{k}</span>)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={()=>startEditUser(u)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"><Edit size={14}/></button>
                          <button onClick={()=>handleDeleteUser(u.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                 ))}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL Y ENRUTADOR DE MÓDULOS
  // ============================================================================

  if (!appUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative" style={{ backgroundImage: settings?.loginBg ? `url(${settings.loginBg})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {settings?.loginBg && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>}
        <div className="bg-white p-12 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 border-t-8 border-orange-500 transform transition-all">
          <div className="text-center mb-10">
             <span className="text-3xl font-light tracking-widest text-gray-800">Supply</span>
             <div className="flex items-center justify-center -mt-2">
                <span className="text-black font-black text-[50px] leading-none">G</span><div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-black mx-1 shadow-inner">&amp;</div><span className="text-black font-black text-[50px] leading-none">B</span>
             </div>
             <p className="text-[10px] font-black tracking-widest text-gray-400 mt-2 uppercase">Enterprise Resource Planning</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
               <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Usuario de Acceso</label>
               <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18}/>
                  <input type="text" required value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:border-orange-500 focus:bg-white transition-all text-black" placeholder="admin" />
               </div>
            </div>
            <div>
               <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Clave de Seguridad</label>
               <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18}/>
                  <input type="password" required value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:border-orange-500 focus:bg-white transition-all text-black" placeholder="••••••••" />
               </div>
            </div>
            {loginError && <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-3 rounded-xl text-center border border-red-100 animate-in fade-in">{loginError}</div>}
            <button type="submit" className="w-full bg-black text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-900 transition-all shadow-xl hover:shadow-orange-500/20 mt-4 flex justify-center items-center gap-2">INGRESAR AL SISTEMA <ArrowRight size={16}/></button>
          </form>
          <div className="mt-8 text-center"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">© {new Date().getFullYear()} Jiret G&B C.A. Todos los derechos reservados.</p></div>
        </div>
      </div>
    );
  }

  const hasPerm = (module) => appUser?.permissions ? appUser.permissions[module] : appUser?.role === 'Master';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
        <nav className="bg-black text-white px-6 py-4 shadow-xl print:hidden sticky top-0 z-40 border-b-4 border-orange-500">
           <div className="flex justify-between items-center max-w-7xl mx-auto">
              <div className="flex items-center gap-6">
                 <div className="flex items-center cursor-pointer" onClick={() => {clearAllReports(); setActiveTab('home');}}>
                    <span className="text-xl font-light tracking-widest text-gray-300">Supply</span>
                    <span className="text-white font-black text-2xl leading-none ml-1">G</span><div className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black mx-0.5">&amp;</div><span className="text-white font-black text-2xl leading-none">B</span>
                 </div>
                 <div className="hidden md:flex bg-gray-900 rounded-2xl p-1 gap-1 border border-gray-800">
                    <button onClick={() => {clearAllReports(); setActiveTab('home');}} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'home' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}><Home size={14}/> Inicio</button>
                    {hasPerm('ventas') && <button onClick={() => {clearAllReports(); setActiveTab('ventas');}} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'ventas' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}><Users size={14}/> Ventas</button>}
                    {hasPerm('produccion') && <button onClick={() => {clearAllReports(); setActiveTab('produccion');}} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'produccion' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}><Factory size={14}/> Producción</button>}
                    {hasPerm('inventario') && <button onClick={() => {clearAllReports(); setActiveTab('inventario');}} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'inventario' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}><Package size={14}/> Inventario</button>}
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{appUser?.role}</p>
                    <p className="text-sm font-bold text-white">{appUser?.name}</p>
                 </div>
                 <div className="h-8 w-px bg-gray-800 mx-2 hidden sm:block"></div>
                 {hasPerm('configuracion') && <button onClick={() => {clearAllReports(); setActiveTab('configuracion');}} className="p-2.5 bg-gray-900 text-gray-400 rounded-xl hover:text-white hover:bg-gray-800 transition-all border border-gray-800"><Settings2 size={18}/></button>}
                 <button onClick={() => setAppUser(null)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20 flex items-center gap-2 text-[10px] font-black uppercase"><LogOut size={16}/> <span className="hidden sm:inline">Salir</span></button>
              </div>
           </div>
        </nav>

        {activeTab === 'ventas' && (
           <div className="bg-white border-b border-gray-200 shadow-sm print:hidden sticky top-[72px] z-30">
              <div className="max-w-7xl mx-auto flex gap-6 px-6 overflow-x-auto">
                 {[ 
                   {id:'facturacion', icon:<Receipt size={16}/>, label:'Facturación'}, 
                   {id:'clientes', icon:<Users size={16}/>, label:'Directorio'}, 
                   {id:'requisiciones', icon:<FileText size={16}/>, label:'OPs'} 
                 ].map(t => (
                    <button key={t.id} onClick={()=>{setVentasView(t.id); clearAllReports();}} className={`py-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 whitespace-nowrap ${ventasView === t.id ? 'border-orange-500 text-black' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>{t.icon} {t.label}</button>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'inventario' && (
           <div className="bg-white border-b border-gray-200 shadow-sm print:hidden sticky top-[72px] z-30">
              <div className="max-w-7xl mx-auto flex gap-6 px-6 overflow-x-auto">
                 {[ 
                   {id:'catalogo', icon:<Box size={16}/>, label:'Catálogo'}, 
                   {id:'wip', icon:<Beaker size={16}/>, label:'WIP (Proceso)'}, 
                   {id:'finished', icon:<Package size={16}/>, label:'Terminados'}, 
                   {id:'cargo', icon:<ArrowDownToLine size={16}/>, label:'Entradas'}, 
                   {id:'descargo', icon:<ArrowUpFromLine size={16}/>, label:'Salidas'}, 
                   {id:'ajuste', icon:<ShieldCheck size={16}/>, label:'Ajuste Único'}, 
                   {id:'toma_fisica', icon:<ClipboardEdit size={16}/>, label:'Toma Física'}, 
                   {id:'kardex', icon:<History size={16}/>, label:'Kardex'}, 
                   {id:'reportes_mod', icon:<FileText size={16}/>, label:'Reportes'}, 
                   {id:'reporte177', icon:<FileCheck size={16}/>, label:'Art. 177 ISLR'}, 
                   {id:'requisiciones', icon:<ClipboardList size={16}/>, label:'Solicitudes Planta'} 
                 ].map(t => (
                    <button key={t.id} onClick={()=>{setInvView(t.id); clearAllReports();}} className={`py-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 whitespace-nowrap ${invView === t.id ? 'border-orange-500 text-black' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>{t.icon} {t.label}</button>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'produccion' && (
           <div className="bg-white border-b border-gray-200 shadow-sm print:hidden sticky top-[72px] z-30">
              <div className="max-w-7xl mx-auto flex gap-6 px-6 overflow-x-auto">
                 {[ 
                   {id:'proyeccion', icon:<TrendingUp size={16}/>, label:'Proyección MP'},
                   {id:'ordenes_compra', icon:<ShoppingCart size={16}/>, label:'Órdenes Compra'},
                   {id:'activos', icon:<PlayCircle size={16}/>, label:'Producción Activa'}, 
                   {id:'reportes', icon:<FileText size={16}/>, label:'Historial / Finiquitos'}
                 ].map(t => (
                    <button key={t.id} onClick={()=>{setProdView(t.id); clearAllReports();}} className={`py-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 whitespace-nowrap ${prodView === t.id ? 'border-orange-500 text-black' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>{t.icon} {t.label}</button>
                 ))}
              </div>
           </div>
        )}

        <main className="flex-1 p-4 md:p-8 max-w-[1400px] mx-auto w-full print:p-0 print:m-0 print:max-w-none print:w-full bg-transparent print:bg-white">
           {activeTab === 'home' && renderHome()}
           {activeTab === 'ventas' && renderVentasModule()}
           {activeTab === 'produccion' && renderProduccionModule()}
           {activeTab === 'inventario' && renderInventoryModule()}
           {activeTab === 'simulador' && renderSimuladorModule()}
           {activeTab === 'costos_operativos' && renderCostosOperativosModule()}
           {activeTab === 'configuracion' && renderConfiguracionModule()}
           {activeTab === 'costos' && renderReportesFinancierosModule()}
        </main>

        {dialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 print:hidden animate-in fade-in">
             <div className="bg-white p-10 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border-t-8 border-orange-500 transform animate-in zoom-in-95">
                <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                   {dialog.type === 'alert' ? <AlertTriangle size={40} className="text-orange-500" /> : <CheckCircle size={40} className="text-blue-500" />}
                </div>
                <h3 className="text-xl font-black text-black uppercase mb-3 tracking-widest">{dialog.title}</h3>
                <p className="text-sm font-bold text-gray-500 mb-8">{dialog.text}</p>
                {dialog.type === 'confirm' ? (
                   <div className="flex gap-3">
                      <button onClick={() => setDialog(null)} className="flex-1 bg-gray-200 text-gray-800 font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:bg-gray-300 transition-all">Cancelar</button>
                      <button onClick={() => { dialog.onConfirm(); setDialog(null); }} className="flex-1 bg-black text-white font-black py-4 rounded-xl uppercase text-[10px] tracking-widest shadow-lg hover:bg-gray-800 transition-all flex justify-center items-center gap-2"><CheckCircle2 size={16}/> Confirmar</button>
                   </div>
                ) : (
                   <button onClick={() => setDialog(null)} className="w-full bg-black text-white font-black py-4 rounded-xl uppercase text-[10px] tracking-widest shadow-lg hover:bg-gray-800 transition-all">Aceptar</button>
                )}
             </div>
          </div>
        )}

        {showAdminModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 print:hidden">
            <div className="bg-white p-10 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border-t-8 border-red-500 transform animate-in zoom-in-95">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={40} className="text-red-500" />
              </div>
              <h3 className="text-xl font-black text-black uppercase mb-3 tracking-widest">Validación de Seguridad</h3>
              <p className="text-xs font-bold text-gray-500 mb-6 uppercase">
                Se requiere clave de administrador para:<br/>
                <span className="text-black text-sm block mt-2">{adminActionName}</span>
              </p>
              
              <div className="mb-6">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminValidation()}
                  placeholder="••••••••"
                  className="w-full border-2 border-gray-300 rounded-xl p-4 text-center text-lg font-black tracking-widest focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  autoFocus
                />
                <p className="text-xs text-gray-400 text-center mt-2 font-bold">
                  Presione Enter o click en Validar
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelAdminModal}
                  className="flex-1 bg-gray-200 text-gray-700 font-black py-4 rounded-xl uppercase text-xs tracking-widest hover:bg-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdminValidation}
                  className="flex-1 bg-red-500 text-white font-black py-4 rounded-xl shadow-lg uppercase text-xs tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={16} />
                  Validar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

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

// --- FIN CONSTANTES ---

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

  const [planDeCuentas, setPlanDeCuentas] = useState([]);
  const [asientosContables, setAsientosContables] = useState([]);
  const [ldSearch, setLdSearch] = useState('');
  const [ldFiltro, setLdFiltro] = useState('TODOS');
  const [showInvImport, setShowInvImport] = useState(false);
  const [invImportPreview, setInvImportPreview] = useState([]);
  const [invImportLoading, setInvImportLoading] = useState(false);
  const [erView, setErView] = useState('estado'); // 'estado' | 'variaciones'
  const [erMes, setErMes] = useState(new Date().getMonth() + 1);
  const [erAno, setErAno] = useState(new Date().getFullYear());
  const [erTasa, setErTasa] = useState('');
  const prevMonth = () => { const d = new Date(); d.setMonth(d.getMonth()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
  const [varMesA, setVarMesA] = useState(new Date().toISOString().substring(0,7));
  const [varMesB, setVarMesB] = useState(prevMonth());

  // Estados Plan de Cuentas
  const [showPDCImport, setShowPDCImport] = useState(false);
  const [pdcSearchTerm, setPdcSearchTerm] = useState('');
  // Cuenta contable para ingresos (configurable)
  const [ingresosCuentaCodigo, setIngresosCuentaCodigo] = useState('');

  // Formularios de Configuración
  const initialUserForm = { username: '', password: '', name: '', role: 'Usuario', permissions: {
    ventas: false,       ventas_ops: false,    ventas_facturacion: false, ventas_directorio: false,
    produccion: false,   produccion_proyeccion: false, produccion_ordenes: false, produccion_activa: false, produccion_historial: false,
    formulas: false,
    inventario: false,   inventario_solicitudes: false, inventario_catalogo: false, inventario_movimientos: false, inventario_kardex: false,
    simulador: false,
    costos: false,       costos_operativos: false, costos_reportes: false,
    configuracion: false
  } };
  const [newUserForm, setNewUserForm] = useState(initialUserForm);
  const [editingUserId, setEditingUserId] = useState(null);

  // Formularios de Ventas
  const initialClientForm = { rif: '', razonSocial: '', direccion: '', telefono: '', personaContacto: '', vendedor: '', fechaCreacion: getTodayDate() };
  const [newClientForm, setNewClientForm] = useState(initialClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const initialReqForm = { fecha: getTodayDate(), client: '', tipoProducto: 'BOLSAS', categoria: '', desc: '', ancho: '', fuelles: '', largo: '', micras: '', pesoMillar: '', presentacion: 'MILLAR', cantidad: '', requestedKg: '', color: 'NATURAL', tratamiento: 'LISO', vendedor: '' };
  const [newReqForm, setNewReqForm] = useState(initialReqForm);
  const [editingReqId, setEditingReqId] = useState(null);
  const initialInvoiceForm = { fecha: getTodayDate(), clientRif: '', clientName: '', documento: '', productoMaquilado: '', vendedor: '', montoBase: '', iva: '', total: '', aplicaIva: 'SI', opAsignada: '', opData: null, fgId: '' };
  const [newInvoiceForm, setNewInvoiceForm] = useState(initialInvoiceForm);

  // Formularios Producción
  const initialPhaseForm = { date: getTodayDate(), insumos: [], producedKg: '', mermaKg: '', mermaTroquelTransp: '', mermaTroquelPigm: '', mermaTorta: '', observaciones: '', operadorExt: '', tratado: '', motorExt: '', ventilador: '', jalador: '', zona1: '', zona2: '', zona3: '', zona4: '', zona5: '', zona6: '', cabezalA: '', cabezalB: '', operadorImp: '', kgRecibidosImp: '', cantColores: '', relacionImp: '', motorImp: '', tensores: '', tempImp: '', solvente: '', operadorSel: '', kgRecibidosSel: '', impresa: 'NO', tipoSello: 'Sello FC', tempCabezalA: '', tempCabezalB: '', tempPisoA: '', tempPisoB: '', velServo: '', millaresProd: '', troquelSel: '' };
  const [showWorkOrder, setShowWorkOrder] = useState(null);
  const [showPhaseReport, setShowPhaseReport] = useState(null);
  const [showFiniquito, setShowFiniquito] = useState(null);
  const [selectedPhaseReqId, setSelectedPhaseReqId] = useState(null);
  const [activePhaseTab, setActivePhaseTab] = useState('extrusion');
  const [phaseForm, setPhaseForm] = useState(initialPhaseForm);
  // Segmentación de lotes de producción por OP
  const [activeLoteIndex, setActiveLoteIndex] = useState(0); // índice del lote activo dentro de la OP
  const [showLotePanel, setShowLotePanel] = useState(false);
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
  const initialOpCostForm = { date: getTodayDate(), category: 'Electricidad', description: '', amount: '', cuentaContable: '' };
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
  // Estados Fórmulas / Recetas
  const [formulas, setFormulas] = useState([]);
  const [formulaFilter, setFormulaFilter] = useState('TODOS');
  const [formulaSearch, setFormulaSearch] = useState('');
  const [showFormulaPanel, setShowFormulaPanel] = useState(false);
  const [editingFormulaId, setEditingFormulaId] = useState(null);
  const [formulaForm, setFormulaForm] = useState({ categoria: '', tipoProducto: 'BOLSAS', fases: { extrusion: true, impresion: false, sellado: false }, ancho: '', fuelles: '', largo: '', micras: '', ingredientes: [] });
  const [formulaIngId, setFormulaIngId] = useState('');
  const [formulaIngPct, setFormulaIngPct] = useState('');
  const [selectedPOItems, setSelectedPOItems] = useState([]);
  const [poProvider, setPoProvider] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [viewingPO, setViewingPO] = useState(null);
  const [showFiniquitoOP, setShowFiniquitoOP] = useState(null);
  const [showOrdenTrabajo, setShowOrdenTrabajo] = useState(null);
  const [prodSubMode, setProdSubMode] = useState('fase');
  // Estado para agregar items a PO manualmente
  const [poAddId, setPoAddId] = useState('');
  const [poAddQty, setPoAddQty] = useState('');
  const [poAddCost, setPoAddCost] = useState('');

  // ============================================================================
  // EXPORTACIONES CORREGIDAS
  // ============================================================================
  const handleExportPDF = (filename, isLandscape = false) => {
    window.print();
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
    // Busca la clave real del usuario admin en la base de datos (o cualquier usuario Master)
    const adminUser = (systemUsers || []).find(u => u.role === 'Master' || u.username === 'admin');
    const validPassword = adminUser?.password || ADMIN_PASSWORD;
    if (adminPassword === validPassword) {
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
        text: `La clave admin es incorrecta. Use la misma clave del usuario administrador del sistema.`, 
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

  // html2pdf removido — se usa window.print() para imprimir

  useEffect(() => { signInAnonymously(auth).catch(err => console.error(err)); const unsubscribe = onAuthStateChanged(auth, setFbUser); return () => unsubscribe(); }, []);
  
  useEffect(() => {
    if (!fbUser) return;
    const unsubUsers = onSnapshot(getColRef('users'), (s) => {
      const loadedUsers = s.docs.map(d => ({ id: d.id, ...d.data() })); setSystemUsers(loadedUsers);
      if (s.empty) {
         setDoc(getDocRef('users', 'admin'), { username: 'admin', password: '1234', name: 'Administrador General', role: 'Master', permissions: { ventas: true, ventas_ops: true, ventas_facturacion: true, ventas_directorio: true, produccion: true, produccion_proyeccion: true, produccion_ordenes: true, produccion_activa: true, produccion_historial: true, formulas: true, inventario: true, inventario_solicitudes: true, inventario_catalogo: true, inventario_movimientos: true, inventario_kardex: true, simulador: true, costos: true, costos_operativos: true, costos_reportes: true, configuracion: true } });
         setDoc(getDocRef('users', 'planta'), { username: 'planta', password: '1234', name: 'Supervisor de Planta', role: 'Planta', permissions: { ventas: false, ventas_ops: false, ventas_facturacion: false, ventas_directorio: false, produccion: true, produccion_proyeccion: true, produccion_ordenes: false, produccion_activa: true, produccion_historial: true, formulas: true, inventario: true, inventario_solicitudes: true, inventario_catalogo: false, inventario_movimientos: false, inventario_kardex: false, simulador: false, costos: false, costos_operativos: false, costos_reportes: false, configuracion: false } });
      }
    });
    const unsubSettings = onSnapshot(getDocRef('settings', 'general'), (d) => { if(d.exists()) setSettings(d.data()); });
    const unsubInv = onSnapshot(getColRef('inventory'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() })); setInventory(data);
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
    const unsubFormulas = onSnapshot(getColRef('formulas'), (s) => setFormulas(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(a.categoria||'').localeCompare(b.categoria||''))));
    
    const unsubPDC = onSnapshot(getColRef('planDeCuentas'), (s) => setPlanDeCuentas(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''))));
    const unsubAST = onSnapshot(getColRef('asientosContables'), (s) => setAsientosContables(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    
    return () => { 
      unsubUsers(); unsubSettings(); unsubInv(); unsubMovs(); unsubCli(); unsubReq(); unsubInvB(); unsubInvReqs(); unsubOpCosts(); 
      unsubPOs(); unsubWIP(); unsubFinished(); unsubFormulas(); unsubPDC(); unsubAST();
    };
  }, [fbUser]);

  // ── AUTO RESPALDO PROGRAMADO ────────────────────────────────────────────────
  // Estados de respaldo declarados aquí para que el useEffect los pueda usar sin TDZ
  const [backupFreq, setBackupFreq] = useState(() => localStorage.getItem('backupFreq') || 'manual');
  const [backupLastRun, setBackupLastRun] = useState(() => localStorage.getItem('backupLastRun') || '');
  const [backupTime, setBackupTime] = useState(() => localStorage.getItem('backupTime') || '08:00');

  useEffect(() => {
    if (backupFreq === 'manual') return;
    const checkAndBackup = () => {
      if (!appUser) return;
      const now = new Date();
      const nowHHMM = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const today = getTodayDate();
      const lastRun = localStorage.getItem('backupLastRun') || '';
      const lastRunDate = lastRun;
      const diffDays = lastRunDate ? Math.floor((new Date(today) - new Date(lastRunDate)) / 86400000) : 999;
      let shouldRun = false;
      if (backupFreq === 'diario' && diffDays >= 1 && nowHHMM === backupTime) shouldRun = true;
      if (backupFreq === 'semanal' && diffDays >= 7 && nowHHMM === backupTime) shouldRun = true;
      if (backupFreq === 'mensual' && diffDays >= 30 && nowHHMM === backupTime) shouldRun = true;
      if (shouldRun) {
        handleBackupData();
        setDialog({ title: '💾 Respaldo Automático', text: `Respaldo automático ejecutado a las ${backupTime}. Frecuencia: ${backupFreq}.`, type: 'alert' });
      }
    };
    // Verificar cada minuto
    const interval = setInterval(checkAndBackup, 60000);
    return () => clearInterval(interval);
  }, [backupFreq, backupTime, appUser]);

  // ============================================================================
  // ASIENTOS CONTABLES AUTOMÁTICOS
  // Cuentas:
  //   1.1.03.01.004 MATERIA PRIMA (INV-FINAL)           — inventario MP
  //   1.1.03.01.003 INVENTARIO DE CONSUMIBLES           — inventario consumibles
  //   1.1.03.01.007 PRODUCTOS EN PROCESO (INV-INICIAL)  — WIP
  //   1.1.03.01.008 PRODUCTOS TERMINADOS (INV-FINAL)    — terminados
  //   5.1.01.01.001 COSTO DE PRODUCCIÓN Y VENTAS        — costo al facturar
  //   4.1.01.01.000 INGRESOS POR MAQUILA                — ingresos al facturar
  // ============================================================================
  const getCtaInventario = (categoria) => {
    const cat = (categoria || '').toLowerCase();
    if (cat.includes('materia prima')) return '1.1.03.01.004';
    return '1.1.03.01.003'; // consumibles, tintas, quimicos, etc.
  };

  const getNombreCta = (codigo) => {
    const map = {
      '1.1.03.01.004': 'MATERIA PRIMA (INV-FINAL)',
      '1.1.03.01.003': 'INVENTARIO DE CONSUMIBLES',
      '1.1.03.01.007': 'PRODUCTOS EN PROCESO (INV-INICIAL)',
      '1.1.03.01.008': 'PRODUCTOS TERMINADOS (INV-FINAL)',
      '5.1.01.01.001': 'COSTO DE PRODUCCIÓN Y VENTAS',
      '4.1.01.01.000': 'INGRESOS POR MAQUILA',
    };
    return map[codigo] || codigo;
  };

  const registrarAsientoContable = async (firebatchOrNull, { debito, credito, monto, descripcion, referencia, fecha }) => {
    if (monto <= 0) return;
    const asientoId = `AST-${Date.now()}-${Math.floor(Math.random()*9999)}`;
    const asiento = {
      id: asientoId,
      fecha: fecha || getTodayDate(),
      descripcion: (descripcion || '').toUpperCase(),
      referencia: (referencia || '').toUpperCase(),
      debito: { codigo: debito, nombre: getNombreCta(debito), monto },
      credito: { codigo: credito, nombre: getNombreCta(credito), monto },
      monto,
      user: appUser?.name || 'Sistema',
      timestamp: Date.now(),
    };
    if (firebatchOrNull) {
      firebatchOrNull.set(getDocRef('asientosContables', asientoId), asiento);
    } else {
      await setDoc(getDocRef('asientosContables', asientoId), asiento);
    }
  };

  const clearAllReports = () => {
    setShowReqReport(false); setShowClientReport(false); setShowGeneralInvoicesReport(false);
    setShowNewReqPanel(false); setShowNewInvoicePanel(false); setEditingClientId(null); setEditingReqId(null); 
    setShowSingleReqReport(null); setShowSingleInvoice(null); setInvoiceSearchTerm(''); setShowWorkOrder(null); 
    setShowPhaseReport(null); setShowFiniquito(null); setSelectedPhaseReqId(null); setReqToApprove(null); setShowMovementReceipt(null);
    setShowPurchaseOrder(false); setViewingPO(null); setShowFiniquitoOP(null);
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
  const startEditUser = (u) => {
    const defaultPerms = initialUserForm.permissions;
    const mergedPerms = { ...defaultPerms, ...(u.permissions || {}) };
    setEditingUserId(u.username);
    setNewUserForm({ ...u, permissions: mergedPerms });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
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
    // Stock puede quedar negativo — se permite despacho
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
      await batch.commit();

      // ── Asiento contable automático ──
      const ctaInventario = getCtaInventario(item.category);
      if (newMovementForm.type === 'ENTRADA') {
        // Débito inventario / Crédito proveedor (se deja en blanco la contraparte externa)
        await registrarAsientoContable(null, {
          debito: ctaInventario,
          credito: 'PROVEEDOR/EXTERNO',
          monto: qty * movCost,
          descripcion: `ENTRADA INVENTARIO — ${item.desc}`,
          referencia: newMovementForm.reference || 'ENT',
          fecha: newMovementForm.date,
        });
      } else if (newMovementForm.type === 'SALIDA' || newMovementForm.type === 'AUTOCONSUMO') {
        // Crédito inventario / Débito gasto
        await registrarAsientoContable(null, {
          debito: 'GASTO/EXTERNO',
          credito: ctaInventario,
          monto: qty * movCost,
          descripcion: `SALIDA INVENTARIO — ${item.desc}`,
          referencia: newMovementForm.reference || 'SAL',
          fecha: newMovementForm.date,
        });
      }

      setNewMovementForm(initialMovementForm); setDialog({title: 'Éxito', text: `Movimiento registrado. ${newMovementForm.type === 'ENTRADA' ? 'Costo promedio actualizado.' : ''}`, type: 'alert'});
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
    const tieneIdentificador = planDeCuentas.length > 0 ? !!newOpCostForm.cuentaContable : !!newOpCostForm.category;
    if (!tieneIdentificador || !newOpCostForm.amount) {
      return setDialog({ title: 'Aviso', text: 'Seleccione una cuenta/categoria y el monto.', type: 'alert' });
    }
    const amount = parseFloat(newOpCostForm.amount);
    if (amount <= 0) {
      return setDialog({ title: 'Aviso', text: 'El monto debe ser mayor a cero.', type: 'alert' });
    }
    try {
      const docId = `COST-${Date.now()}`;
      const month = newOpCostForm.date.substring(0, 7);
      const pdc = planDeCuentas.find(p => p.codigo === newOpCostForm.cuentaContable);
      const categoryFinal = pdc ? (pdc.nombre || pdc.subGrupo || pdc.grupo) : newOpCostForm.category;
      await setDoc(getDocRef('operatingCosts', docId), {
        ...newOpCostForm,
        category: categoryFinal,
        amount, month,
        user: appUser?.name || 'Sistema',
        timestamp: Date.now()
      });
      setNewOpCostForm(initialOpCostForm);
      setDialog({ title: 'Exito!', text: 'Costo operativo registrado correctamente.', type: 'alert' });
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

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (costCategories.includes(newCategoryName.trim())) {
      setDialog({title: 'Aviso', text: 'Esta categoría ya existe.', type: 'alert'});
      return;
    }
    setCostCategories(prev => [...prev, newCategoryName.trim()]);
    setNewOpCostForm(f => ({...f, category: newCategoryName.trim()}));
    setShowNewCategoryModal(false);
    setNewCategoryName('');
    setDialog({title: 'Éxito', text: 'Categoría agregada correctamente.', type: 'alert'});
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
    const valUpper = typeof value === 'string' ? value.toUpperCase() : value;
    let f = { ...newInvoiceForm, [field]: valUpper };
    if (field === 'clientRif') {
      const c = (clients || []).find(cl => cl.rif === value);
      f.clientName = c?.name || ''; f.vendedor = (c?.vendedor || '').toUpperCase();
    }
    if (field === 'opAsignada') {
      const op = (requirements || []).find(r => r.id === value);
      if (op) {
        f.productoMaquilado = op.desc || '';
        f.opData = {
          tipoProducto: op.tipoProducto || '', categoria: op.categoria || '',
          desc: op.desc || '', ancho: op.ancho || '', fuelles: op.fuelles || '',
          largo: op.largo || '', micras: op.micras || '', color: op.color || 'NATURAL',
          tratamiento: op.tratamiento || '', cantidad: op.cantidad || '',
          presentacion: op.presentacion || '', requestedKg: op.requestedKg || '',
          pesoMillar: op.pesoMillar || '', vendedor: op.vendedor || '',
          fecha: op.fecha || '', client: op.client || ''
        };
        // Auto-fill client from OP if not already set
        if (!f.clientRif) {
          const c = (clients || []).find(cl => cl.name === op.client);
          if (c) { f.clientRif = c.rif; f.clientName = c.name; f.vendedor = (c.vendedor||'').toUpperCase(); }
        }
      } else { f.opData = null; }
    }
    if (field === 'fgId') {
      const fg = (finishedGoodsInventory || []).find(fg => fg.id === value);
      if (fg) {
        f.productoMaquilado = fg.producto || '';
        const op = (requirements || []).find(r => r.id === fg.opId);
        if (op) {
          f.opAsignada = op.id;
          f.opData = {
            tipoProducto: op.tipoProducto||'', categoria: op.categoria||'',
            desc: op.desc||'', ancho: op.ancho||'', fuelles: op.fuelles||'',
            largo: op.largo||'', micras: op.micras||'', color: op.color||'NATURAL',
            tratamiento: op.tratamiento||'', cantidad: fg.millares||fg.kgProducidos||'',
            presentacion: fg.millares>0?'MILLAR':'KG', requestedKg: fg.kgProducidos||'',
            pesoMillar: op.pesoMillar||'', vendedor: op.vendedor||'',
            fecha: fg.fechaFinalizacion||'', client: fg.cliente||''
          };
          const c = (clients || []).find(cl => cl.name === fg.cliente);
          if (c && !f.clientRif) { f.clientRif = c.rif; f.clientName = c.name; f.vendedor = (c.vendedor||'').toUpperCase(); }
        }
      }
    }
    if (field === 'montoBase' || field === 'aplicaIva') {
      const base = parseNum(field === 'montoBase' ? value : f.montoBase);
      const aplica = field === 'aplicaIva' ? value : f.aplicaIva;
      const iva = aplica === 'SI' ? base * 0.16 : 0;
      f.iva = iva > 0 ? iva.toFixed(2) : '0.00'; f.total = base > 0 ? (base + iva).toFixed(2) : base.toFixed(2);
    }
    if (field === 'iva' && f.aplicaIva === 'SI') {
      const base = parseNum(f.montoBase); const iva = parseNum(value); f.total = (base + iva).toFixed(2);
    }
    setNewInvoiceForm(f);
  };
  
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const handleCreateInvoice = async (e) => {
    e.preventDefault(); if(!newInvoiceForm.clientRif || !newInvoiceForm.montoBase) return setDialog({title: 'Aviso', text: 'Selecciona un cliente e ingresa el monto base.', type: 'alert'});
    const id = editingInvoiceId || newInvoiceForm.documento || generateInvoiceId();
    try { 
      await setDoc(getDocRef('maquilaInvoices', id), { ...newInvoiceForm, id, documento: id, montoBase: parseNum(newInvoiceForm.montoBase), iva: parseNum(newInvoiceForm.iva), total: parseNum(newInvoiceForm.total), aplicaIva: newInvoiceForm.aplicaIva || 'SI', timestamp: editingInvoiceId ? (newInvoiceForm.timestamp || Date.now()) : Date.now(), user: appUser?.name }); 

      if (!editingInvoiceId) {
        // ── Asientos contables al facturar (solo en creación) ──
        const montoBase = parseNum(newInvoiceForm.montoBase);
        if (newInvoiceForm.fgId) {
          const fg = (finishedGoodsInventory || []).find(f => f.id === newInvoiceForm.fgId);
          const costoFG = fg ? (parseNum(fg.costoUnitario) * parseNum(fg.kgProducidos || fg.millares || 1)) : 0;
          const montoAsientoCosto = costoFG > 0 ? costoFG : montoBase;
          await registrarAsientoContable(null, { debito: '5.1.01.01.001', credito: '1.1.03.01.008', monto: montoAsientoCosto, descripcion: `COSTO PRODUCCIÓN — FACTURA ${id} — ${newInvoiceForm.productoMaquilado || ''}`, referencia: id, fecha: newInvoiceForm.fecha });
        }
        await registrarAsientoContable(null, { debito: 'CXC/CLIENTE', credito: '4.1.01.01.000', monto: parseNum(newInvoiceForm.montoBase), descripcion: `INGRESO MAQUILA — FACTURA ${id} — ${newInvoiceForm.clientName || ''}`, referencia: id, fecha: newInvoiceForm.fecha });
      }

      setShowNewInvoicePanel(false); setEditingInvoiceId(null); setNewInvoiceForm(initialInvoiceForm);
      setDialog({title: '✅ Éxito', text: editingInvoiceId ? 'Factura actualizada.' : 'Factura Registrada.', type: 'alert'}); 
    } catch(err) { setDialog({title: 'Error', text: err.message, type: 'alert'}); }
  };
  const handleDeleteInvoice = (id) => {
    setDialog({ 
      title: 'Eliminar', 
      text: `¿Eliminar factura?`, 
      type: 'confirm', 
      onConfirm: async () => await deleteDoc(getDocRef('maquilaInvoices', id))
    });
  };
  const startEditInvoice = (inv) => {
    setEditingInvoiceId(inv.id);
    setNewInvoiceForm({ fecha: inv.fecha || getTodayDate(), clientRif: inv.clientRif || '', clientName: inv.clientName || '', documento: inv.documento || '', productoMaquilado: inv.productoMaquilado || '', vendedor: inv.vendedor || '', montoBase: String(inv.montoBase || ''), iva: String(inv.iva || ''), total: String(inv.total || ''), aplicaIva: inv.aplicaIva || 'SI', opAsignada: inv.opAsignada || '', opData: inv.opData || null, fgId: inv.fgId || '', timestamp: inv.timestamp });
    setShowNewInvoicePanel(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const generateReqId = () => `OP-${((requirements || []).reduce((m, r) => Math.max(m, parseInt(String(r.id).replace(/\D/g, '')||0, 10)), 0) + 1).toString().padStart(5, '0')}`;
  const handleReqFormChange = (field, value) => {
    let f = { ...newReqForm, [field]: typeof value === 'string' ? value.toUpperCase() : value };
    if (field === 'client') { const c = (clients || []).find(cl => cl.name === (value||'').toUpperCase()); if (c && c.vendedor) f.vendedor = c.vendedor.toUpperCase(); }
    if (field === 'tipoProducto' && value === 'TERMOENCOGIBLE') f.presentacion = 'KILOS';
    // Auto-fill dimensions from formula when category changes
    if (field === 'categoria' && value && value !== '__OTRA__') {
      const matchFormula = (formulas||[]).find(fm => fm.categoria && fm.categoria.toUpperCase() === value.toUpperCase());
      if (matchFormula) {
        if (matchFormula.ancho) f.ancho = String(matchFormula.ancho);
        if (matchFormula.fuelles) f.fuelles = String(matchFormula.fuelles);
        if (matchFormula.largo) f.largo = String(matchFormula.largo);
        if (matchFormula.micras) f.micras = String(matchFormula.micras);
        if (matchFormula.tipoProducto) f.tipoProducto = matchFormula.tipoProducto === 'TERMOENCOGIBLE' ? 'TERMOENCOGIBLE' : 'BOLSAS';
        if (matchFormula.tipoProducto === 'TERMOENCOGIBLE') f.presentacion = 'KILOS';
      }
    }
    const w = parseNum(f.ancho), l = parseNum(f.largo), m = parseNum(f.micras), fu = parseNum(f.fuelles), c = parseNum(f.cantidad), tipo = f.tipoProducto;
    const MERMA_PCT = 0.05; // 5% merma automática
    if (w > 0 && m > 0) {
      const micFmt = m < 1 && m > 0 ? Math.round(m * 1000) : m;
      if (tipo === 'BOLSAS' && l > 0) {
        const pEst = (w + fu) * l * m; // KG por millar (resultado directo de la fórmula)
        f.pesoMillar = pEst.toFixed(2);
        f.desc = fu > 0 ? `(${w}+${fu/2}+${fu/2})X${l}X${micFmt}MIC | ${f.color || ''}` : `${w}X${l}X${micFmt}MIC | ${f.color || ''}`;
        // KG netos = pesoMillar(KG/millar) × cantidad(millares)
        const kgNetos = f.presentacion === 'KILOS' ? c : pEst * c;
        // KG a producir incluye 5% de merma
        const kgConMerma = kgNetos > 0 ? (kgNetos / (1 - MERMA_PCT)) : 0;
        f.requestedKg = kgConMerma.toFixed(2);
      }
      else if (tipo === 'TERMOENCOGIBLE') { f.pesoMillar = 'N/A'; f.desc = `TERMOENCOGIBLE ${w}CM X ${micFmt}MIC | ${f.color || ''}`; const kgNetos = c > 0 ? c : 0; f.requestedKg = kgNetos > 0 ? (kgNetos / (1 - MERMA_PCT)).toFixed(2) : '0.00'; }
      else { f.pesoMillar = '0.00'; f.requestedKg = '0.00'; }
    } else { f.pesoMillar = tipo === 'TERMOENCOGIBLE' ? 'N/A' : '0.00'; f.requestedKg = f.presentacion === 'KILOS' && c > 0 ? (c / (1 - MERMA_PCT)).toFixed(2) : '0.00'; }
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
           // Se permite despacho aunque el stock quede negativo (el inventario se refleja en negativo)
           phaseCost += (item.cost * ing.qty); totalInsumosKg += parseFloat(ing.qty);
           batch.update(getDocRef('inventory', item.id), { stock: (item.stock || 0) - ing.qty });
           const movId = Date.now().toString() + Math.floor(Math.random()*1000);
           batch.set(getDocRef('inventoryMovements', movId), { id: movId, date: getTodayDate(), itemId: item.id, itemName: item.desc, type: 'SALIDA', qty: ing.qty, cost: item.cost, totalValue: ing.qty * item.cost, reference: `REQ-${targetOP.id}-${req.phase.substring(0,3).toUpperCase()}`, opAsignada: targetOP.id, notes: 'DESPACHO ALMACÉN', timestamp: Date.now(), user: appUser?.name || 'Almacén' });
        }

        // NO creamos batch aquí — el operador registrará cuánto usó realmente
        // Solo actualizamos la requisición como APROBADA con los KG despachados
        batch.update(getDocRef('inventoryRequisitions', req.id), { status: 'APROBADO', dispatchDate: getTodayDate(), items: validItems, approvedBy: appUser?.name, kgDespachados: totalInsumosKg, costoDespachado: phaseCost });

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

        // ── Asientos contables: por cada ítem despachado → WIP ──
        for (let ing of validItems) {
          const item = (inventory || []).find(i => i.id === ing.id);
          if (!item) continue;
          const ctaInventario = getCtaInventario(item.category);
          const montoIng = parseNum(ing.qty) * (item.cost || 0);
          await registrarAsientoContable(null, {
            debito: '1.1.03.01.007',
            credito: ctaInventario,
            monto: montoIng,
            descripcion: `DESCARGO A PLANTA — ${item.desc} — FASE: ${req.phase.toUpperCase()}`,
            referencia: `REQ-${targetOP.id}`,
            fecha: getTodayDate(),
          });
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
        setDialog({title: 'Error', text: 'Requisicion no encontrada', type: 'alert'});
        return;
      }
      const wipEntries = wipInventory.filter(wip => wip.opId === reqId);
      const esTermo = reqDoc.tipoProducto === 'TERMOENCOGIBLE';

      // Para TERMOENCOGIBLE: millares=0, kgProducidos es la cantidad principal
      // Para BOLSAS: millares es la cantidad principal
      const millaresFinales = esTermo ? 0 : (parseNum(phaseData.millaresProd) || parseNum(reqDoc.cantidad) || 0);
      const kgFinales = parseNum(phaseData.producedKg) || parseNum(reqDoc.requestedKg) || 0;

      if (wipEntries.length === 0) {
        // Crear entrada sin WIP (cierre directo)
        const finishedEntry = {
          id: `FG-${Date.now()}`,
          opId: reqId,
          reqId: reqId,
          cliente: reqDoc.client || 'N/A',
          tipoProducto: reqDoc.tipoProducto || 'BOLSAS',
          categoria: reqDoc.categoria || '',
          producto: reqDoc.desc || reqDoc.categoria || 'Producto',
          ancho: reqDoc.ancho || 0,
          largo: reqDoc.largo || 0,
          micras: reqDoc.micras || 0,
          color: reqDoc.color || 'NATURAL',
          tratamiento: reqDoc.tratamiento || 'LISO',
          kgProducidos: kgFinales,
          millares: millaresFinales,
          costoUnitario: 0,
          fechaFinalizacion: getTodayDate(),
          ubicacion: 'ALMACEN GENERAL',
          status: 'LISTO PARA ENTREGA',
          observaciones: phaseData.observations || '',
          timestamp: Date.now()
        };
        await setDoc(getDocRef('finishedGoodsInventory', finishedEntry.id), finishedEntry);
        return;
      }

      for (const wipEntry of wipEntries) {
        const finishedEntry = {
          id: `FG-${Date.now()}`,
          opId: wipEntry.opId,
          reqId: reqId,
          cliente: wipEntry.cliente,
          tipoProducto: reqDoc.tipoProducto || 'BOLSAS',
          categoria: reqDoc.categoria || '',
          producto: reqDoc.desc || reqDoc.categoria || 'Producto',
          ancho: reqDoc.ancho || 0,
          largo: reqDoc.largo || 0,
          micras: reqDoc.micras || 0,
          color: reqDoc.color || 'NATURAL',
          tratamiento: reqDoc.tratamiento || 'LISO',
          kgProducidos: kgFinales,
          millares: millaresFinales,
          costoUnitario: wipEntry.costoPromedio || 0,
          fechaFinalizacion: getTodayDate(),
          ubicacion: 'ALMACEN GENERAL',
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
    const pendingReqs = (invRequisitions||[]).filter(r => r.status === 'PENDIENTE');

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
    // Always open the PO modal — user selects products and quantities manually
    // Pre-populate with all inventory items so user can choose
    setSelectedPOItems([]);  // start empty — user adds from the modal
    setPoProvider('');
    setPoNotes('');
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

    const nextPONum = ((purchaseOrders || []).reduce((m, p) => {
      // Solo contar IDs con patrón OC-NNNNN (5 dígitos), ignorar IDs de timestamp
      const match = String(p.id || '').match(/^OC-(\d{1,6})$/);
      const n = match ? parseInt(match[1], 10) : 0;
      return Math.max(m, n);
    }, 0) + 1).toString().padStart(5, '0');
    const po = {
      id: `OC-${nextPONum}`,
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
    const hasPerm = (module) => { if (!appUser) return false; if (appUser.role === 'Master') return true; const p = appUser.permissions || {}; return !!p[module]; };
    const moduleCards = [
      hasPerm('ventas') && { tab:'ventas', view:()=>setVentasView('facturacion'), icon:<Users size={36}/>, title:'Ventas y Facturación', desc:'Directorio, OP y Facturación', color:'border-orange-500', bg:'bg-black', textColor:'text-white', descColor:'text-gray-400', iconColor:'text-orange-500' },
      hasPerm('produccion') && { tab:'produccion', view:()=>setProdView('proyeccion'), icon:<Factory size={36}/>, title:'Producción Planta', desc:'Control de Fases y Reportes', color:'border-orange-500', bg:'bg-black', textColor:'text-white', descColor:'text-gray-400', iconColor:'text-orange-500' },
      hasPerm('formulas') && { tab:'formulas', icon:<Beaker size={36}/>, title:'Fórmulas / Recetas', desc:'Recetas por categoría y fases', color:'border-purple-500', bg:'bg-black', textColor:'text-white', descColor:'text-gray-400', iconColor:'text-purple-500' },
      hasPerm('inventario') && { tab:'inventario', view:()=>setInvView('requisiciones'), icon:<Package size={36}/>, title:'Control Inventario', desc:'Solicitudes de Planta, Catálogo, Movimientos y Kardex', color:'border-orange-500', bg:'bg-black', textColor:'text-white', descColor:'text-gray-400', iconColor:'text-orange-500' },
      hasPerm('simulador') && { tab:'simulador', icon:<Calculator size={36}/>, title:'Simulador OP', desc:'Calculadora Inversa de Producción y Mermas', color:'border-orange-400', bg:'bg-white', textColor:'text-gray-900', descColor:'text-gray-500', iconColor:'text-orange-500' },
      hasPerm('costos_operativos') && { tab:'costos_operativos', icon:<DollarSign size={36}/>, title:'Costos Operativos', desc:'Registro de gastos y resumen visual', color:'border-green-500', bg:'bg-white', textColor:'text-gray-900', descColor:'text-gray-500', iconColor:'text-green-600' },
      hasPerm('costos_reportes') && { tab:'costos', icon:<BarChart3 size={36}/>, title:'Reportes Financieros', desc:'Dashboard de Rentabilidad, Ingresos vs Costos, Estado de Resultado y Libro Diario', color:'border-blue-500', bg:'bg-white', textColor:'text-gray-900', descColor:'text-gray-500', iconColor:'text-blue-600' },
      hasPerm('configuracion') && { tab:'configuracion', icon:<Settings2 size={36}/>, title:'Configuración', desc:'Usuarios, Permisos y Respaldo', color:'border-gray-400', bg:'bg-white', textColor:'text-gray-800', descColor:'text-gray-400', iconColor:'text-gray-500' },
    ].filter(Boolean);

    return (
      <div className="w-full max-w-6xl mx-auto py-8 animate-in fade-in">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-black uppercase tracking-widest">Panel Principal ERP</h2>
          <div className="w-24 h-1.5 bg-orange-500 mx-auto mt-4 rounded-full"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 px-4">
          {moduleCards.map((card, i) => (
            <button key={i}
              onClick={() => { clearAllReports(); setActiveTab(card.tab); if(card.view) card.view(); }}
              className={`${card.bg} border-l-4 ${card.color} rounded-2xl p-6 text-left hover:opacity-90 hover:scale-[1.02] transition-all shadow-md flex flex-col gap-3`}>
              <div className={card.iconColor}>{card.icon}</div>
              <div>
                <h3 className={`text-sm font-black ${card.textColor} uppercase leading-tight`}>{card.title}</h3>
                <p className={`text-[10px] ${card.descColor} mt-1 leading-snug`}>{card.desc}</p>
              </div>
            </button>
          ))}
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
                <button onClick={() => handleExportPDF('Reporte_Inventario_Filtrado', false)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> IMPRIMIR</button>
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
            <button onClick={() => handleExportPDF(`Comprobante_${m.type}_${m.id}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16} /> Imprimir</button>
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
      // Construir movimientos WIP con chequeos defensivos
      const safeWipInventory = Array.isArray(wipInventory) ? wipInventory : [];
      const safeInvMovements = Array.isArray(invMovements) ? invMovements : [];

      const wipEntradas = safeWipInventory.map(item => ({
        ...(item || {}),
        movType: 'ENTRADA',
        fecha: item?.fechaAsignacion || '—',
        kg: parseNum(item?.kgAsignados),
        descripcion: 'Traslado Almacén a WIP',
      }));

      const wipSalidas = safeInvMovements
        .filter(m => m && m.type === 'SALIDA' && m.notes && (
          String(m.notes).includes('PRODUCCI') // captura PRODUCCIÓN y PRODUCCION
        ))
        .map(m => ({
          id: m.id,
          movType: 'SALIDA',
          opId: m.opAsignada || m.reference || '—',
          fecha: m.date || '—',
          kg: parseNum(m.qty),
          itemId: m.itemId || '—',
          itemName: m.itemName || m.itemId || '—',
          fase: String(m.notes || '').replace(/PRODUCCI[OÓ]N?\s*/gi, '').trim() || '—',
          descripcion: 'Consumo en Produccion',
          status: 'CONSUMIDO',
          materiales: [{ id: m.itemId, qty: m.qty }],
          cliente: '—',
          user: m.user || '—',
          timestamp: m.timestamp || 0,
        }));

      const allWipMovs = [...wipEntradas, ...wipSalidas]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
          <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-purple-50 flex justify-between items-center no-pdf">
            <div>
              <h2 className="text-xl font-black text-purple-800 uppercase flex items-center gap-3 tracking-tighter">
                <Beaker className="text-purple-600" size={24}/> Inventario de Productos en Proceso (WIP)
              </h2>
              <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase tracking-widest">
                Movimientos: Entradas (Almacen a WIP) y Salidas (WIP a Produccion)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const data = allWipMovs.map(item => [
                    item.movType,
                    item.opId,
                    item.cliente || '—',
                    item.fecha,
                    item.fase || '—',
                    formatNum(item.kg),
                    item.status || item.descripcion,
                  ]);
                  handleExportExcel(data, 'Inventario_WIP',
                    ['Tipo', 'OP ID', 'Cliente', 'Fecha', 'Fase', 'KG', 'Estado']
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
                <Printer size={16}/> IMPRIMIR
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

            {/* Resumen KG en proceso */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-black text-green-700 uppercase block mb-1">Total KG Entradas</span>
                <span className="text-2xl font-black text-green-600">{formatNum(wipEntradas.reduce((s, i) => s + parseNum(i.kg), 0))}</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-black text-red-700 uppercase block mb-1">Total KG Salidas</span>
                <span className="text-2xl font-black text-red-600">{formatNum(wipSalidas.reduce((s, i) => s + parseNum(i.kg), 0))}</span>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-black text-purple-700 uppercase block mb-1">KG Neto en WIP</span>
                <span className="text-2xl font-black text-purple-600">
                  {formatNum(wipEntradas.reduce((s, i) => s + parseNum(i.kg), 0) - wipSalidas.reduce((s, i) => s + parseNum(i.kg), 0))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-black print:rounded-none">
              <table className="w-full text-left whitespace-nowrap text-xs">
                <thead className="bg-gray-100 border-b-2 border-gray-300 print:border-black">
                  <tr className="uppercase font-black text-[10px] tracking-widest text-black">
                    <th className="py-3 px-4 border-r print:border-black">Tipo Mov.</th>
                    <th className="py-3 px-4 border-r print:border-black">OP ID</th>
                    <th className="py-3 px-4 border-r print:border-black">Fecha</th>
                    <th className="py-3 px-4 border-r print:border-black">Cliente / Producto</th>
                    <th className="py-3 px-4 border-r print:border-black">Fase</th>
                    <th className="py-3 px-4 border-r print:border-black">Materiales</th>
                    <th className="py-3 px-4 text-center print:border-black">KG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-black print:divide-black">
                  {allWipMovs.map((item, idx) => {
                    const isEntrada = item.movType === 'ENTRADA';
                    return (
                      <tr key={`${item.id}-${idx}`} className={`hover:bg-gray-50 transition-colors ${isEntrada ? 'bg-green-50/30' : 'bg-red-50/30'}`}>
                        <td className="py-3 px-4 border-r print:border-black">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isEntrada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isEntrada ? '↓ ENTRADA' : '↑ SALIDA'}
                          </span>
                        </td>
                        <td className="py-3 px-4 border-r print:border-black font-black text-purple-600">{item.opId}</td>
                        <td className="py-3 px-4 border-r print:border-black font-bold">{item.fecha}</td>
                        <td className="py-3 px-4 border-r print:border-black font-bold uppercase">
                          {isEntrada ? (
                            <>{item.cliente}<br/><span className="text-[9px] text-gray-500">{item.producto}</span></>
                          ) : (
                            <>{item.itemName || item.itemId}<br/><span className="text-[9px] text-gray-500">{item.descripcion}</span></>
                          )}
                        </td>
                        <td className="py-3 px-4 border-r print:border-black font-bold uppercase">{item.fase || '—'}</td>
                        <td className="py-3 px-4 border-r print:border-black">
                          {isEntrada ? (
                            <ul className="text-[9px] space-y-0.5">
                              {(item.materiales || []).map((mat, i) => (
                                <li key={i} className="font-bold">
                                  <span className="bg-gray-100 px-1 rounded print:border print:border-black">{formatNum(mat.qty)}</span> × {mat.id}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[9px] font-bold">{item.itemId}</span>
                          )}
                        </td>
                        <td className={`py-3 px-4 text-center font-black text-lg print:border-black ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
                          {isEntrada ? '+' : '-'}{formatNum(item.kg)}
                        </td>
                        <td className="py-3 px-4 text-center no-pdf">
                          {isEntrada && (
                            <button onClick={() => requireAdminPassword(async () => {
                              await deleteDoc(getDocRef('wipInventory', item.id));
                              setDialog({title:'Eliminado', text:'Ítem WIP eliminado.', type:'alert'});
                            }, 'Eliminar ítem WIP')} className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Eliminar"><Trash2 size={13}/></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {allWipMovs.length === 0 && (
                    <tr><td colSpan="7" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
                      No hay movimientos WIP registrados
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-purple-50 border border-purple-200 p-4 rounded-xl print:border-black text-xs font-bold text-purple-700">
              <span className="font-black uppercase">Nota: </span>
              Las <span className="text-green-700 font-black">ENTRADAS</span> son traslados del almacen principal al WIP (aprobacion de requisicion de planta).
              Las <span className="text-red-700 font-black">SALIDAS</span> son consumos de materiales en las fases de produccion.
            </div>
          </div>
        </div>
      );
    }

    if (invView === 'finished') {
      // Calcular totales para el Excel: cada item es una ENTRADA desde produccion
      // Las SALIDAS son items con status ENTREGADO
      const totalEntradaKg = finishedGoodsInventory.reduce((s, i) => s + parseNum(i.kgProducidos), 0);
      const totalEntradaMill = finishedGoodsInventory.filter(i => i.tipoProducto !== 'TERMOENCOGIBLE').reduce((s, i) => s + parseNum(i.millares), 0);
      const totalSalidaKg = finishedGoodsInventory.filter(i => i.status === 'ENTREGADO').reduce((s, i) => s + parseNum(i.kgProducidos), 0);
      const totalSalidaMill = finishedGoodsInventory.filter(i => i.status === 'ENTREGADO' && i.tipoProducto !== 'TERMOENCOGIBLE').reduce((s, i) => s + parseNum(i.millares), 0);
      const stockKg = totalEntradaKg - totalSalidaKg;
      const stockMill = totalEntradaMill - totalSalidaMill;

      return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
          <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-green-50 flex justify-between items-center no-pdf">
            <div>
              <h2 className="text-xl font-black text-green-800 uppercase flex items-center gap-3 tracking-tighter">
                <Package className="text-green-600" size={24}/> Inventario de Productos Terminados
              </h2>
              <p className="text-[10px] font-bold text-green-600 mt-1 uppercase tracking-widest">
                Bolsas en Millares — Termoencogible en KG
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Excel con entradas, salidas y stock actual
                  const headers = ['OP ID','Cliente','Tipo','Producto','KG Entrada','Millares Entrada','KG Salida','Millares Salida','KG Stock Actual','Millares Stock','Fecha','Estado'];
                  const data = finishedGoodsInventory.map(item => {
                    const esTermo = item.tipoProducto === 'TERMOENCOGIBLE';
                    const entKg = parseNum(item.kgProducidos);
                    const entMill = esTermo ? 0 : parseNum(item.millares);
                    const salKg = item.status === 'ENTREGADO' ? entKg : 0;
                    const salMill = item.status === 'ENTREGADO' ? entMill : 0;
                    return [
                      item.opId, item.cliente,
                      item.tipoProducto || 'BOLSAS',
                      item.producto,
                      formatNum(entKg), esTermo ? '—' : formatNum(entMill),
                      formatNum(salKg), esTermo ? '—' : formatNum(salMill),
                      item.status === 'ENTREGADO' ? '0.00' : formatNum(entKg),
                      esTermo ? '—' : (item.status === 'ENTREGADO' ? '0' : formatNum(entMill)),
                      item.fechaFinalizacion, item.status
                    ];
                  });
                  // Fila totales
                  data.push([
                    'TOTALES','','','',
                    formatNum(totalEntradaKg), formatNum(totalEntradaMill),
                    formatNum(totalSalidaKg), formatNum(totalSalidaMill),
                    formatNum(stockKg), formatNum(stockMill),
                    '','',
                  ]);
                  handleExportExcel(data, 'Inventario_Productos_Terminados', headers);
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download size={16}/> EXPORTAR EXCEL
              </button>
              <button
                onClick={() => handleExportPDF('Inventario_Productos_Terminados', true)}
                className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Printer size={16}/> IMPRIMIR
              </button>
            </div>
          </div>

          <div className="p-8 print:p-0 bg-white" id="pdf-content">
            <div className="hidden pdf-header mb-6">
              <ReportHeader />
              <h1 className="text-xl font-black text-black uppercase border-b-4 border-green-500 pb-2">INVENTARIO DE PRODUCTOS TERMINADOS</h1>
              <p className="text-xs font-bold text-gray-500 uppercase mt-1">AL: {getTodayDate()} — Bolsas en Millares / Termoencogible en KG</p>
            </div>

            {/* Resumen de Entradas / Salidas / Stock */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <div className="text-[10px] font-black text-green-700 uppercase mb-1">Total Entradas (Produccion)</div>
                <div className="font-black text-green-600 text-sm">{formatNum(totalEntradaKg)} KG</div>
                <div className="font-black text-blue-600 text-sm">{formatNum(totalEntradaMill)} Millares</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <div className="text-[10px] font-black text-red-700 uppercase mb-1">Total Salidas (Entregado)</div>
                <div className="font-black text-red-600 text-sm">{formatNum(totalSalidaKg)} KG</div>
                <div className="font-black text-orange-600 text-sm">{formatNum(totalSalidaMill)} Millares</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                <div className="text-[10px] font-black text-blue-700 uppercase mb-1">Stock Actual (Disponible)</div>
                <div className="font-black text-blue-600 text-sm">{formatNum(stockKg)} KG</div>
                <div className="font-black text-purple-600 text-sm">{formatNum(stockMill)} Millares</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-black print:rounded-none">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b-2 border-gray-300 print:border-black">
                  <tr className="uppercase font-black text-[10px] tracking-widest text-black">
                    <th className="py-3 px-3 border-r print:border-black">OP / Cliente</th>
                    <th className="py-3 px-3 border-r print:border-black">Producto / Specs</th>
                    <th className="py-3 px-3 border-r print:border-black text-center">Cantidad Principal</th>
                    <th className="py-3 px-3 border-r print:border-black text-center">KG</th>
                    <th className="py-3 px-3 border-r print:border-black text-center">Entrada</th>
                    <th className="py-3 px-3 border-r print:border-black text-center">Salida</th>
                    <th className="py-3 px-3 border-r print:border-black text-center">Stock</th>
                    <th className="py-3 px-3 border-r print:border-black text-center">Fecha</th>
                    <th className="py-3 px-3 border-r print:border-black text-center">Estado</th>
                    <th className="py-3 px-3 text-center no-pdf">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-black print:divide-black">
                  {finishedGoodsInventory.map(item => {
                    const esTermo = item.tipoProducto === 'TERMOENCOGIBLE';
                    const cantPrincipal = esTermo ? parseNum(item.kgProducidos) : parseNum(item.millares);
                    const umPrincipal = esTermo ? 'KG' : 'Millares';
                    const entVal = cantPrincipal;
                    const salVal = item.status === 'ENTREGADO' ? cantPrincipal : 0;
                    const stockVal = entVal - salVal;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 border-r print:border-black">
                          <div className="font-black text-green-600 text-xs">{item.opId}</div>
                          <div className="font-bold uppercase text-[10px]">{item.cliente}</div>
                        </td>
                        <td className="py-3 px-3 border-r print:border-black">
                          <div className="font-bold uppercase text-[10px]">{item.producto}</div>
                          <div className="text-[9px] text-gray-500 mt-0.5 space-y-0.5">
                            <div>{item.ancho}cm×{item.largo}cm | {item.micras}mic | {item.color}</div>
                            {item.categoria && <div className="text-orange-600 font-bold">{item.categoria}</div>}
                            {item.observaciones && <div>{item.observaciones}</div>}
                          </div>
                        </td>
                        <td className="py-3 px-3 border-r print:border-black text-center">
                          <div className={`font-black text-lg ${esTermo ? 'text-green-600' : 'text-blue-600'}`}>
                            {formatNum(cantPrincipal)}
                          </div>
                          <div className="text-[9px] font-black text-gray-500 uppercase">{umPrincipal}</div>
                          {!esTermo && <div className="text-[9px] text-gray-400">{formatNum(item.kgProducidos)} KG</div>}
                        </td>
                        <td className="py-3 px-3 border-r print:border-black text-center font-bold text-gray-600">{formatNum(item.kgProducidos)}</td>
                        <td className="py-3 px-3 border-r print:border-black text-center font-black text-green-600">{formatNum(entVal)}</td>
                        <td className="py-3 px-3 border-r print:border-black text-center font-black text-red-500">{formatNum(salVal)}</td>
                        <td className="py-3 px-3 border-r print:border-black text-center font-black text-blue-600">{formatNum(stockVal)}</td>
                        <td className="py-3 px-3 border-r print:border-black text-center font-bold text-[10px]">{item.fechaFinalizacion}</td>
                        <td className="py-3 px-3 border-r print:border-black text-center">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            item.status === 'LISTO PARA ENTREGA' ? 'bg-green-100 text-green-700' :
                            item.status === 'ENTREGADO' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>{item.status}</span>
                        </td>
                        <td className="py-3 px-3 text-center no-pdf">
                          <div className="flex flex-col gap-1">
                            {item.status === 'LISTO PARA ENTREGA' && (
                              <button onClick={() => updateDoc(getDocRef('finishedGoodsInventory', item.id), {status:'ENTREGADO'})} className="px-2 py-1 bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 flex items-center gap-1 justify-center"><ArrowUpFromLine size={10}/> ENTREGAR</button>
                            )}
                            {item.status === 'ENTREGADO' && (
                              <button onClick={() => updateDoc(getDocRef('finishedGoodsInventory', item.id), {status:'LISTO PARA ENTREGA'})} className="px-2 py-1 bg-gray-400 text-white rounded-lg text-[9px] font-black uppercase hover:bg-gray-600">REVERTIR</button>
                            )}
                            <button onClick={() => requireAdminPassword(async () => {
                              await deleteDoc(getDocRef('finishedGoodsInventory', item.id));
                              setDialog({title:'Eliminado', text:'Registro eliminado del inventario.', type:'alert'});
                            }, 'Eliminar registro de Terminados')} className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-[9px] font-black uppercase hover:bg-red-500 hover:text-white flex items-center gap-1 justify-center"><Trash2 size={10}/> ELIMINAR</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {finishedGoodsInventory.length === 0 && (
                    <tr><td colSpan="10" className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">No hay productos terminados registrados</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 print:border-black font-black text-[10px]">
                  <tr>
                    <td colSpan="2" className="py-3 px-3 text-right uppercase border-r print:border-black">TOTALES:</td>
                    <td className="py-3 px-3 text-center border-r print:border-black">
                      <div className="text-blue-700">{formatNum(totalEntradaMill)} Mill.</div>
                      <div className="text-green-700 text-[9px]">Bolsas</div>
                    </td>
                    <td className="py-3 px-3 text-center text-green-700 border-r print:border-black">{formatNum(totalEntradaKg)} KG</td>
                    <td className="py-3 px-3 text-center text-green-600 border-r print:border-black">{formatNum(totalEntradaKg)}</td>
                    <td className="py-3 px-3 text-center text-red-600 border-r print:border-black">{formatNum(totalSalidaKg)}</td>
                    <td className="py-3 px-3 text-center text-blue-700 border-r print:border-black">{formatNum(stockKg)}</td>
                    <td colSpan="3"></td>
                  </tr>
                </tfoot>
              </table>
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
                 <button onClick={() => {
                   // Guardar parcial: solo confirma sin procesar ajustes
                   setDialog({title:'Conteo Guardado', text:'Los conteos fisicos han sido guardados temporalmente. Cuando estes listo, usa PROCESAR AJUSTES para aplicarlos al inventario.', type:'alert'});
                 }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"><Save size={16}/> GUARDAR LOTE</button>
                 <button onClick={() => requireAdminPassword(handleProcessTomaFisica, 'Procesar Ajuste de Toma Fisica')} className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-orange-700 transition-colors flex items-center gap-2"><CheckCircle2 size={16}/> PROCESAR AJUSTES</button>
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
    const allCatalogCats = ['TODAS', ...Array.from(new Set((inventory||[]).map(i=>i?.category||'Otros')))].sort((a,b)=>a==='TODAS'?-1:a.localeCompare(b));
    const filteredInventory = (inventory || []).filter(i => {
      const matchSearch = (i?.id || '').toUpperCase().includes(searchInvUpper) || (i?.desc || '').toUpperCase().includes(searchInvUpper);
      const matchCat = catalogCatFilter === 'TODAS' || (i?.category||'Otros') === catalogCatFilter;
      return matchSearch && matchCat;
    });
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
               <div className="flex gap-3 flex-wrap justify-end">
                 <button onClick={() => {clearAllReports(); setInvView('toma_fisica'); setPhysicalCounts({});}} className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-orange-700 transition-colors flex items-center gap-2">
                   <ClipboardEdit size={16}/> TOMA FÍSICA / AJUSTE
                 </button>
                 <button onClick={() => {
                   // Excel con membrete por categoría seleccionada
                   const empresa = 'SERVICIOS JIRET G&B, C.A.';
                   const rif = 'J-412309374';
                   const dir = 'Av. Circunvalación Nro. 02 C.C. El Dividivi Local G-9, Maracaibo.';
                   const catLabel = catalogCatFilter === 'TODAS' ? 'TODAS LAS CATEGORÍAS' : catalogCatFilter.toUpperCase();
                   let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/><style>body{font-family:Arial;font-size:11px;}h2,h3,p{text-align:center;margin:4px 0;}table{border-collapse:collapse;width:100%;margin-top:14px;}th,td{border:1px solid #000;padding:6px 8px;}th{background:#1a1a1a;color:#fff;text-align:center;font-weight:bold;}tr.catHeader td{background:#ea580c;color:#fff;font-weight:bold;}.subtot td{background:#f3f4f6;font-weight:bold;}.grandtot td{background:#000;color:#fff;font-weight:bold;font-size:12px;}</style></head><body>`;
                   html += `<h2>${empresa}</h2><h3>RIF: ${rif}</h3><p>${dir}</p>`;
                   html += `<h3>CATÁLOGO DE INVENTARIO — ${catLabel}</h3><p>Fecha: ${getTodayDate()}</p>`;
                   html += `<table><thead><tr><th>Código</th><th>Descripción</th><th>Categoría</th><th>U.M.</th><th>Costo Unit. ($)</th><th>Stock Actual</th><th>Valor Total ($)</th></tr></thead><tbody>`;
                   const grouped = {};
                   filteredInventory.forEach(i => { const c = i?.category||'Otros'; if(!grouped[c]) grouped[c]=[]; grouped[c].push(i); });
                   const catOrder = ['Materia Prima','Pigmentos','Tintas','Químicos','Consumibles','Herramientas','Seguridad Industrial','Otros'];
                   const cats = Object.keys(grouped).sort((a,b)=>{const ia=catOrder.indexOf(a),ib=catOrder.indexOf(b);if(ia===-1&&ib===-1)return a.localeCompare(b);if(ia===-1)return 1;if(ib===-1)return -1;return ia-ib;});
                   let grandStock=0,grandVal=0;
                   cats.forEach(cat=>{
                     const items=grouped[cat];
                     const catStock=items.reduce((s,i)=>s+parseNum(i?.stock),0);
                     const catVal=items.reduce((s,i)=>s+(parseNum(i?.cost)*parseNum(i?.stock)),0);
                     html+=`<tr class="catHeader"><td colspan="5">${cat.toUpperCase()} — ${items.length} artículos</td><td style="text-align:right">${formatNum(catStock)}</td><td style="text-align:right">$${formatNum(catVal)}</td></tr>`;
                     items.forEach(inv=>{
                       const val=parseNum(inv?.cost)*parseNum(inv?.stock);
                       html+=`<tr><td>${inv?.id}</td><td>${inv?.desc}</td><td>${inv?.category}</td><td style="text-align:center">${inv?.unit||'KG'}</td><td style="text-align:right">$${formatNum(inv?.cost)}</td><td style="text-align:right">${formatNum(inv?.stock)}</td><td style="text-align:right">$${formatNum(val)}</td></tr>`;
                     });
                     html+=`<tr class="subtot"><td colspan="4" style="text-align:right">Subtotal ${cat}:</td><td></td><td style="text-align:right">${formatNum(catStock)}</td><td style="text-align:right">$${formatNum(catVal)}</td></tr>`;
                     grandStock+=catStock; grandVal+=catVal;
                   });
                   html+=`</tbody><tfoot><tr class="grandtot"><td colspan="5" style="text-align:right">TOTAL INVENTARIO:</td><td style="text-align:right">${formatNum(grandStock)}</td><td style="text-align:right">$${formatNum(grandVal)}</td></tr></tfoot></table>`;
                   html+=`<p style="margin-top:14px;font-size:9px;text-align:center">Generado por Supply G&B ERP — ${getTodayDate()}</p></body></html>`;
                   const blob=new Blob([html],{type:'application/vnd.ms-excel'});
                   const url=URL.createObjectURL(blob);
                   const a=document.createElement('a');a.href=url;a.download=`Catalogo_${catalogCatFilter}_${getTodayDate()}.xls`;
                   document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
                 }} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-green-700 transition-colors flex items-center gap-2">
                   <Download size={16}/> EXCEL {catalogCatFilter === 'TODAS' ? 'TODOS' : catalogCatFilter.toUpperCase()}
                 </button>
                 <button onClick={() => handleExportPDF(`Catalogo_${catalogCatFilter}_Inventario`, true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2">
                   <Printer size={16}/> {catalogCatFilter === 'TODAS' ? 'IMPRIMIR TODO' : `IMPRIMIR: ${catalogCatFilter.toUpperCase()}`}
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

               <div data-html2canvas-ignore="true" className="flex flex-wrap gap-3 mb-6 no-pdf items-center">
                 <div className="relative flex-1 min-w-48">
                   <Search className="absolute left-4 top-4 text-gray-400" size={18} />
                   <input type="text" placeholder="BUSCAR INSUMO..." value={invSearchTerm} onChange={e=>setInvSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white" />
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {allCatalogCats.map(cat => (
                     <button key={cat} onClick={()=>setCatalogCatFilter(cat)}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${catalogCatFilter===cat ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'}`}>
                       {cat === 'TODAS' ? `Todas (${(inventory||[]).length})` : `${cat} (${(inventory||[]).filter(i=>(i?.category||'Otros')===cat).length})`}
                     </button>
                   ))}
                 </div>
               </div>
               <div className="overflow-x-auto rounded-xl print:border print:border-black print:rounded-none">
                  <table className="w-full text-left whitespace-nowrap">
                   <thead className="bg-gray-100 border-b-2 border-gray-200 print:border-black">
                     <tr className="uppercase font-black text-gray-800 text-[10px] tracking-widest print:text-black">
                       <th className="py-4 px-4">Código</th>
                       <th className="py-4 px-4">Descripción</th>
                       <th className="py-4 px-4 text-center">Categoría</th>
                       <th className="py-4 px-4 text-center">Costo Unit. ($)</th>
                       <th className="py-4 px-4 text-right">Stock Actual</th>
                       <th className="py-4 px-4 text-right">Valor Total ($)</th>
                       <th className="py-4 px-4 text-center no-pdf print:hidden">Acciones</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 print:divide-black">
                     {(() => {
                       if (filteredInventory.length === 0) return (
                         <tr><td colSpan="7" className="p-10 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Sin artículos registrados</td></tr>
                       );
                       // Group by category
                       const grouped = {};
                       filteredInventory.forEach(inv => {
                         const cat = inv?.category || 'Otros';
                         if (!grouped[cat]) grouped[cat] = [];
                         grouped[cat].push(inv);
                       });
                       const catOrder = ['Materia Prima','Pigmentos','Tintas','Químicos','Consumibles','Herramientas','Seguridad Industrial','Otros'];
                       const sortedCats = Object.keys(grouped).sort((a,b) => {
                         const ia = catOrder.indexOf(a); const ib = catOrder.indexOf(b);
                         if (ia === -1 && ib === -1) return a.localeCompare(b);
                         if (ia === -1) return 1; if (ib === -1) return -1;
                         return ia - ib;
                       });
                       const catColors = { 'Materia Prima':'bg-blue-600','Pigmentos':'bg-purple-600','Tintas':'bg-pink-600','Químicos':'bg-teal-600','Consumibles':'bg-orange-600','Herramientas':'bg-yellow-600','Seguridad Industrial':'bg-green-600','Otros':'bg-gray-600' };
                       const rows = [];
                       sortedCats.forEach(cat => {
                         const items = grouped[cat];
                         const catTotalVal = items.reduce((s,i)=>s+(parseNum(i?.cost)*parseNum(i?.stock)),0);
                         const catTotalStock = items.reduce((s,i)=>s+parseNum(i?.stock),0);
                         const colClass = catColors[cat] || 'bg-gray-600';
                         rows.push(
                           <tr key={`cat-${cat}`} className={`${colClass} text-white`}>
                             <td colSpan="4" className="py-2 px-4 font-black text-[10px] uppercase tracking-widest">
                               📂 {cat} — {items.length} artículo{items.length!==1?'s':''}
                             </td>
                             <td className="py-2 px-4 text-right font-black text-[10px]">{formatNum(catTotalStock)}</td>
                             <td className="py-2 px-4 text-right font-black text-[10px]">${formatNum(catTotalVal)}</td>
                             <td className="py-2 px-4 print:hidden"></td>
                           </tr>
                         );
                         items.forEach(inv => {
                           const totalVal = parseNum(inv?.cost) * parseNum(inv?.stock);
                           rows.push(
                             <tr key={inv?.id} className="hover:bg-gray-50 transition-colors group">
                               <td className="py-3 px-4 font-black text-orange-600 text-xs print:text-black">{inv?.id}</td>
                               <td className="py-3 px-4 font-black uppercase text-xs text-black">{inv?.desc}</td>
                               <td className="py-3 px-4 text-center">
                                 <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${colClass}`}>{inv?.category}</span>
                               </td>
                               <td className="py-3 px-4 text-center font-bold text-gray-600 print:text-black">${formatNum(inv?.cost)}</td>
                               <td className="py-3 px-4 text-right font-black text-blue-600 text-sm print:text-black">{formatNum(inv?.stock)} <span className="text-xs text-gray-400">{inv?.unit}</span></td>
                               <td className="py-3 px-4 text-right font-black text-green-600 text-sm print:text-black">${formatNum(totalVal)}</td>
                               <td className="py-3 px-4 text-center no-pdf print:hidden">
                                 <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={()=>requireAdminPassword(()=>startEditInvItem(inv),'Editar artículo del catálogo')} className="p-1.5 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-500 hover:text-white transition-all"><Edit size={12}/></button>
                                   <button onClick={()=>requireAdminPassword(async()=>{await deleteDoc(getDocRef('inventory',inv.id));setDialog({title:'Eliminado',text:'Artículo eliminado.',type:'alert'});},'Eliminar artículo de catálogo')} className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={12}/></button>
                                 </div>
                               </td>
                             </tr>
                           );
                         });
                         // Category subtotal row
                         rows.push(
                           <tr key={`subtot-${cat}`} className="bg-gray-50 border-t-2 border-gray-200">
                             <td colSpan="4" className="py-2 px-4 text-right text-[10px] font-black uppercase text-gray-500">Subtotal {cat}:</td>
                             <td className="py-2 px-4 text-right font-black text-blue-700 text-[10px]">{formatNum(catTotalStock)}</td>
                             <td className="py-2 px-4 text-right font-black text-green-700 text-[10px]">${formatNum(catTotalVal)}</td>
                             <td className="print:hidden"></td>
                           </tr>
                         );
                       });
                       // Grand total
                       const grandTotal = filteredInventory.reduce((s,i)=>s+(parseNum(i?.cost)*parseNum(i?.stock)),0);
                       rows.push(
                         <tr key="grand-total" className="bg-black text-white">
                           <td colSpan="4" className="py-3 px-4 text-right font-black uppercase text-[10px] tracking-widest">TOTAL INVENTARIO:</td>
                           <td className="py-3 px-4 text-right font-black">{formatNum(filteredInventory.reduce((s,i)=>s+parseNum(i?.stock),0))}</td>
                           <td className="py-3 px-4 text-right font-black text-orange-400 text-base">${formatNum(grandTotal)}</td>
                           <td className="print:hidden"></td>
                         </tr>
                       );
                       return rows;
                     })()}
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
               <button onClick={() => handleExportPDF('Kardex_Inventario', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> IMPRIMIR</button>
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
                   <button onClick={() => handleExportPDF('Reporte_Art_177', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> IMPRIMIR</button>
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
          <div data-html2canvas-ignore="true" className="flex justify-between mb-4 no-pdf"><button onClick={() => setShowGeneralInvoicesReport(false)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF('Reporte_General_Facturas', false)} className="bg-black text-white px-6 py-2 rounded-xl flex items-center gap-2 font-black text-xs uppercase hover:bg-gray-800"><Printer size={16}/> Imprimir</button></div>
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
      const opData = inv.opData || null;
      const op = (requirements || []).find(r => r.id === inv.opAsignada);
      const opDisplay = opData || (op ? { tipoProducto: op.tipoProducto, categoria: op.categoria, desc: op.desc, ancho: op.ancho, fuelles: op.fuelles, largo: op.largo, micras: op.micras, color: op.color, cantidad: op.cantidad, presentacion: op.presentacion, requestedKg: op.requestedKg, pesoMillar: op.pesoMillar } : null);
      return (
        <div id="pdf-content" className="bg-white p-10 min-h-0 text-black">
          <div className="flex justify-between mb-8 no-pdf">
            <button onClick={() => setShowSingleInvoice(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button>
            <button onClick={() => handleExportPDF(`Factura_${inv.documento}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16}/> Imprimir</button>
          </div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center my-6 pb-4 border-b-4 border-orange-500">
            <span className="text-2xl font-black uppercase">FACTURA N° {inv.documento}</span>
          </div>

          {/* Datos del cliente y factura */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm font-bold uppercase">
            <div>
              <p className="text-[10px] text-gray-500 font-black">CLIENTE:</p>
              <p className="text-lg">{inv.clientName}</p>
              <p className="text-xs font-bold text-gray-600">RIF: {inv.clientRif}</p>
              <p className="text-[10px] text-gray-500 mt-1">DIRECCIÓN: {client.direccion || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-black">FECHA EMISIÓN:</p>
              <p>{inv.fecha}</p>
              <p className="text-xs font-bold text-gray-600 mt-1">VENDEDOR: {inv.vendedor || 'N/A'}</p>
              {inv.opAsignada && <p className="text-[10px] text-orange-600 font-black mt-1">OP RELACIONADA: #{String(inv.opAsignada).replace('OP-','').padStart(5,'0')}</p>}
            </div>
          </div>

          {/* Bloque de detalles de la OP */}
          {opDisplay && (
            <div className="border-2 border-orange-200 bg-orange-50 rounded-2xl p-5 mb-6">
              <div className="text-[10px] font-black text-orange-700 uppercase mb-3 border-b border-orange-200 pb-2">Detalle de Orden de Producción</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div><span className="font-black text-gray-500 uppercase text-[9px] block">Tipo / Categoría:</span><span className="font-black text-black uppercase">{opDisplay.tipoProducto || '—'} / {opDisplay.categoria || '—'}</span></div>
                <div><span className="font-black text-gray-500 uppercase text-[9px] block">Producto / Maquila:</span><span className="font-black text-black uppercase">{opDisplay.desc || '—'}</span></div>
                <div><span className="font-black text-gray-500 uppercase text-[9px] block">Dimensiones:</span><span className="font-black text-black">{opDisplay.ancho}cm × {opDisplay.largo}cm | {opDisplay.micras} mic | {opDisplay.color}</span></div>
                <div><span className="font-black text-gray-500 uppercase text-[9px] block">Cantidad Estimada:</span><span className="font-black text-black">{formatNum(opDisplay.requestedKg)} KG | {formatNum(opDisplay.cantidad)} {opDisplay.presentacion}</span></div>
                <div><span className="font-black text-gray-500 uppercase text-[9px] block">Número de Orden:</span><span className="font-black text-orange-600 text-lg">#{String(inv.opAsignada||'').replace('OP-','').padStart(5,'0')}</span></div>
                <div><span className="font-black text-gray-500 uppercase text-[9px] block">Fecha OP:</span><span className="font-black text-black">{opDisplay.fecha || inv.fecha}</span></div>
              </div>
            </div>
          )}

          {/* Tabla de factura */}
          <table className="w-full border-collapse border-2 border-black mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 border-b border-black text-left">Descripción / Concepto</th>
                {opDisplay && <th className="p-4 border-b border-black text-center">Cantidad</th>}
                <th className="p-4 border-b border-black text-right">Importe Base (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-4 border-r border-black font-bold text-sm">
                  {inv.productoMaquilado || 'MAQUILA / SERVICIO'}
                  {opDisplay && <span className="block text-[10px] text-gray-500 mt-1">{opDisplay.tipoProducto} | {opDisplay.desc}</span>}
                </td>
                {opDisplay && <td className="p-4 border-r border-black text-center font-black">{formatNum(opDisplay.cantidad)} {opDisplay.presentacion}<br/><span className="text-[10px] text-gray-500">{formatNum(opDisplay.requestedKg)} KG</span></td>}
                <td className="p-4 text-right font-black text-lg">${formatNum(inv.montoBase)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 border-l-4 border-orange-500 pl-4">
              <div className="flex justify-between font-bold text-sm"><span>SUBTOTAL:</span><span>${formatNum(inv.montoBase)}</span></div>
              {inv.aplicaIva === 'SI' && <div className="flex justify-between font-bold text-sm"><span>IVA (16%):</span><span>${formatNum(inv.iva)}</span></div>}
              <div className="flex justify-between font-black text-2xl border-t-2 border-black pt-2 text-orange-600"><span>TOTAL:</span><span>${formatNum(inv.total)}</span></div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-24 text-center font-black uppercase text-[10px] border-t-2 border-gray-300 pt-6">
            <div className="border-t-2 border-black pt-2">Firma Autorizada / Vendedor</div>
            <div className="border-t-2 border-black pt-2">Recibí Conforme / Cliente</div>
          </div>
        </div>
      );
    }

    if (showSingleReqReport) {
      const req = (requirements || []).find(r => r?.id === showSingleReqReport); if (!req) return null;
      return (
        <div id="pdf-content" className="bg-white p-8 min-h-0 text-black shadow-xl bg-white">
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf"><button onClick={() => setShowSingleReqReport(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF(`Requisicion_${req.id}`, false)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16} /> Imprimir</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center my-4"><span className="text-xl font-black uppercase border-b-4 border-orange-500 pb-1">REQUISICIÓN DE PRODUCCIÓN N° {String(req.id).replace('OP-', '').padStart(5, '0')}</span></div>
          <div className="grid grid-cols-2 gap-4 mb-4 font-bold text-sm uppercase"><div><p>CLIENTE: {req.client}</p><p className="mt-1">VENDEDOR: {req.vendedor || 'N/A'}</p></div><div className="text-right"><p>FECHA: {req.fecha}</p><p className="mt-1">TIPO: {req.tipoProducto}</p>{req.categoria && <p className="mt-1 text-orange-600">CATEGORÍA: {req.categoria}</p>}</div></div>
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
          <div data-html2canvas-ignore="true" className="flex justify-between mb-8 no-pdf"><button onClick={() => setShowClientReport(false)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF('Directorio_Clientes', true)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase hover:bg-gray-800"><Printer size={16}/> Imprimir</button></div>
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
          <div data-html2canvas-ignore="true" className="flex justify-between mb-4 no-pdf"><button onClick={() => setShowReqReport(false)} className="bg-gray-100 px-4 py-2 font-bold text-xs uppercase rounded-xl hover:bg-gray-200">Volver</button><button onClick={() => handleExportPDF('Reporte_Requisiciones', true)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase hover:bg-gray-800"><Printer size={16}/> Imprimir</button></div>
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center mb-6"><h2 className="text-xl font-black uppercase border-b-2 border-orange-500 inline-block pb-1">Reporte de Requisiciones (OP)</h2></div>
          <table className="w-full text-[10px] border-collapse border border-gray-300">
            <thead className="bg-gray-100 uppercase"><tr><th className="p-2 border">OP N°</th><th className="p-2 border">Fecha</th><th className="p-2 border">Cliente</th><th className="p-2 border">Categoría</th><th className="p-2 border">Vendedor</th><th className="p-2 border">Producto</th><th className="p-2 border text-right">KG Estimados</th><th className="p-2 border text-center">Estatus</th></tr></thead>
            <tbody>{(requirements || []).map(r => (<tr key={r?.id}><td className="p-2 border text-center font-black">{String(r?.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-2 border">{r?.fecha}</td><td className="p-2 border font-bold">{r?.client}</td><td className="p-2 border font-bold uppercase">{r?.categoria || '—'}</td><td className="p-2 border">{r?.vendedor}</td><td className="p-2 border">{r?.desc}</td><td className="p-2 border text-right font-black">{formatNum(r?.requestedKg)} KG</td><td className="p-2 border text-center font-bold uppercase">{r?.status}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        {ventasView === 'clientes' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b bg-white flex justify-between items-center"><h2 className="text-xl font-black uppercase flex items-center gap-3"><Users className="text-orange-500" /> DIRECTORIO DE CLIENTES</h2><button onClick={()=>setShowClientReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-gray-50">IMPRIMIR REPORTE</button></div>
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
                      <h3 className="text-sm font-black uppercase text-black tracking-widest">{editingInvoiceId ? `Editando Factura: ${editingInvoiceId}` : 'Registrar Factura de Venta'}</h3>
                      <div className="flex items-center gap-4">
                        <div>
                          <label className="text-[9px] font-black text-gray-500 uppercase block mb-1">📅 Fecha de Factura</label>
                          <input type="date" value={newInvoiceForm.fecha} onChange={e=>setNewInvoiceForm({...newInvoiceForm, fecha: e.target.value})} className="border-2 border-orange-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-orange-500 bg-orange-50" />
                        </div>
                        <span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest shadow-sm">FACTURA NRO: {newInvoiceForm.documento || generateInvoiceId()}</span>
                        <button type="button" onClick={()=>{setShowNewInvoicePanel(false);setEditingInvoiceId(null);setNewInvoiceForm(initialInvoiceForm);}} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Picker desde Terminados */}
                      {finishedGoodsInventory.filter(fg=>fg.status==='LISTO PARA ENTREGA').length > 0 && (
                        <div className="md:col-span-4 bg-green-50 border-2 border-green-200 rounded-2xl p-4">
                          <label className="text-[10px] font-black text-green-700 uppercase block mb-2 tracking-widest">📦 Desde Inventario de Terminados (Listo para Entrega)</label>
                          <select value={newInvoiceForm.fgId} onChange={e=>handleInvoiceFormChange('fgId', e.target.value)} className="w-full bg-white border-2 border-green-300 rounded-xl p-3 font-black text-xs outline-none focus:border-green-500 text-black">
                            <option value="">— Seleccione producto terminado —</option>
                            {finishedGoodsInventory.filter(fg=>fg.status==='LISTO PARA ENTREGA').map(fg=>(
                              <option key={fg.id} value={fg.id}>{fg.cliente} | {fg.producto} | {fg.millares>0?`${formatNum(fg.millares)} Millares`:`${formatNum(fg.kgProducidos)} KG`} | OP: {fg.opId}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">Cliente</label>
                        <select required value={newInvoiceForm.clientRif} onChange={e=>handleInvoiceFormChange('clientRif', e.target.value)} className="w-full bg-gray-100/70 border-2 border-transparent rounded-2xl p-4 font-black text-xs outline-none focus:bg-white focus:border-orange-500 text-black">
                          <option value="">Seleccione...</option>
                          {(clients || []).map(c=><option key={c?.rif} value={c?.rif}>{c?.name}</option>)}
                        </select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block tracking-widest">OP Relacionada</label>
                        <select value={newInvoiceForm.opAsignada} onChange={e=>handleInvoiceFormChange('opAsignada', e.target.value)} className="w-full bg-gray-100/70 border-2 border-transparent rounded-2xl p-4 font-black text-xs outline-none focus:bg-white focus:border-orange-500 text-black">
                          <option value="">Seleccione OP...</option>
                          {(requirements || []).map(r=><option key={r.id} value={r.id}>#{String(r.id).replace('OP-','').padStart(5,'0')} — {r.client} | {r.desc}</option>)}
                        </select>
                      </div>

                      {/* Preview de datos OP */}
                      {newInvoiceForm.opData && (
                        <div className="md:col-span-4 bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                          <div className="text-[10px] font-black text-orange-700 uppercase mb-3">Datos de la OP Seleccionada</div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div><span className="font-black text-gray-500 text-[9px] uppercase block">Tipo / Categoría</span><span className="font-black uppercase">{newInvoiceForm.opData.tipoProducto} / {newInvoiceForm.opData.categoria||'—'}</span></div>
                            <div><span className="font-black text-gray-500 text-[9px] uppercase block">Producto</span><span className="font-black uppercase">{newInvoiceForm.opData.desc}</span></div>
                            <div><span className="font-black text-gray-500 text-[9px] uppercase block">Dimensiones</span><span className="font-black">{newInvoiceForm.opData.ancho}cm × {newInvoiceForm.opData.largo}cm | {newInvoiceForm.opData.micras} mic</span></div>
                            <div><span className="font-black text-gray-500 text-[9px] uppercase block">Cantidad Estimada</span><span className="font-black">{formatNum(newInvoiceForm.opData.requestedKg)} KG | {formatNum(newInvoiceForm.opData.cantidad)} {newInvoiceForm.opData.presentacion}</span></div>
                          </div>
                        </div>
                      )}

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
               <tr key={inv?.id} className="hover:bg-gray-50"><td className="py-5 px-4 font-black text-sm">{inv?.documento}<br/><span className="text-[9px] text-gray-400 font-bold">{inv?.fecha || getSafeDate(inv?.timestamp)}</span></td><td className="py-5 px-4 font-black text-xs text-orange-600">{inv?.opAsignada || '---'}</td><td className="py-5 px-4 font-bold text-gray-700 uppercase">{inv?.clientName}<br/><span className="text-[9px] font-black text-orange-500 block max-w-xs truncate" title={inv?.productoMaquilado}>{inv?.productoMaquilado || 'S/D'}</span></td><td className="py-5 px-4 text-right font-black text-green-600 text-lg w-32">${formatNum(inv?.total)}</td><td className="py-5 px-4 text-center"><div className="flex justify-center gap-2"><button onClick={()=>setShowSingleInvoice(inv?.id)} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-800 hover:text-white transition-all"><Printer size={16}/></button><button onClick={()=>startEditInvoice(inv)} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all" title="Editar"><Edit size={16}/></button><button onClick={()=>handleDeleteInvoice(inv?.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></div></td></tr>
             )})}</tbody></table></div></div>
          </div>
        )}
        {ventasView === 'requisiciones' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
             <div className="px-8 py-6 border-b bg-white flex justify-between items-center"><h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><FileText className="text-orange-500" size={24}/> REQUISICIONES OP</h2><div className="flex gap-2"><button onClick={()=>setShowReqReport(true)} className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 transition-colors">REPORTE GENERAL</button><button onClick={()=>{setShowNewReqPanel(!showNewReqPanel);setNewReqForm(initialReqForm);setEditingReqId(null);}} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-all">{showNewReqPanel ? 'CANCELAR' : 'NUEVA SOLICITUD'}</button></div></div>
             {showNewReqPanel && (
                <div className="p-8 bg-gray-50/50 border-b">
                  <form onSubmit={handleCreateRequirement} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b pb-3 mb-6">
                      <h3 className="text-sm font-black uppercase text-black">{editingReqId ? 'EDITAR ORDEN' : 'NUEVA ORDEN'}</h3>
                      <div className="flex items-center gap-4">
                        <div>
                          <label className="text-[9px] font-black text-gray-500 uppercase block mb-1">📅 Fecha de la Requisición</label>
                          <input type="date" value={newReqForm.fecha} onChange={e=>setNewReqForm({...newReqForm, fecha: e.target.value})} className="border-2 border-orange-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-orange-500 bg-orange-50 text-orange-900" />
                        </div>
                        <span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl font-black text-[10px]">CORRELATIVO: {editingReqId ? String(editingReqId).replace('OP-','').padStart(5,'0') : generateReqId().replace('OP-','').padStart(5,'0')}</span>
                      </div>
                    </div>

                    {/* Fila 1: Cliente */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Cliente del Directorio</label>
                        <select required value={newReqForm.client} onChange={e=>handleReqFormChange('client', e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 font-black text-xs text-black outline-none focus:border-orange-500">
                          <option value="">Seleccione...</option>{(clients || []).map(c=><option key={c?.rif} value={c?.name}>{c?.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Categoría</label>
                        {(() => {
                          const catOptions = [...new Set((formulas||[]).map(f=>f.categoria).filter(Boolean))].sort();
                          return catOptions.length > 0 ? (
                            <select value={newReqForm.categoria} onChange={e=>handleReqFormChange('categoria', e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 font-black text-xs text-black outline-none focus:border-orange-500">
                              <option value="">Seleccione categoría...</option>
                              {catOptions.map(cat=><option key={cat} value={cat}>{cat}</option>)}
                              <option value="__OTRA__">+ Otra (ingresar manualmente)</option>
                            </select>
                          ) : (
                            <input type="text" value={newReqForm.categoria} onChange={e=>handleReqFormChange('categoria', e.target.value)} placeholder="EJ: PAÑAL, GALLETAS, ETC" className="w-full border-2 border-gray-200 rounded-2xl p-4 font-black text-xs text-black outline-none focus:border-orange-500 uppercase" />
                          );
                        })()}
                        {newReqForm.categoria === '__OTRA__' && (
                          <input type="text" autoFocus placeholder="Escriba la categoría nueva..." onChange={e=>handleReqFormChange('categoria', e.target.value.toUpperCase())} className="w-full border-2 border-orange-300 rounded-2xl p-3 font-black text-xs text-black outline-none focus:border-orange-500 uppercase mt-2" />
                        )}
                      </div>
                    </div>

                    {/* Fila 2: Dimensiones en una sola fila */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Ancho (cm)</label>
                        <input type="number" step="0.1" value={newReqForm.ancho} onChange={e=>handleReqFormChange('ancho', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Fuelle Total (cm)</label>
                        <input type="number" step="0.1" value={newReqForm.fuelles} onChange={e=>handleReqFormChange('fuelles', e.target.value)} disabled={newReqForm.tipoProducto === 'TERMOENCOGIBLE'} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black disabled:bg-gray-100 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Largo (cm)</label>
                        <input type="number" step="0.1" value={newReqForm.largo} onChange={e=>handleReqFormChange('largo', e.target.value)} disabled={newReqForm.tipoProducto === 'TERMOENCOGIBLE'} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black disabled:bg-gray-100 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Micras / Espesor</label>
                        <input type="number" step="0.001" value={newReqForm.micras} onChange={e=>handleReqFormChange('micras', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center text-black" />
                      </div>
                    </div>

                    {/* Fila 3: Tipo, Cantidad, Presentación + info pesoMillar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                       <div>
                         <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">KG / Millar</label>
                         <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 text-center">
                           <span className="font-black text-orange-700 text-lg">{newReqForm.pesoMillar && newReqForm.pesoMillar !== '0.00' && newReqForm.pesoMillar !== 'N/A' ? formatNum(newReqForm.pesoMillar) : '—'}</span>
                           <span className="text-[9px] font-bold text-orange-500 block">KG por millar</span>
                         </div>
                       </div>
                    </div>

                    <div className="flex justify-between items-center bg-orange-50 p-6 rounded-3xl border-2 border-orange-200 mt-6 shadow-inner">
                      <div>
                        <span className="text-[10px] font-black text-orange-800 uppercase tracking-tighter">TOTAL CARGA A PRODUCIR (incluye 5% merma)</span>
                        <span className="text-4xl font-black text-orange-600 block">{newReqForm.requestedKg} KG</span>
                        {newReqForm.tipoProducto === 'BOLSAS' && parseNum(newReqForm.cantidad) > 0 && parseNum(newReqForm.pesoMillar) > 0 && (
                          <div className="text-[10px] font-bold text-orange-700 mt-1 space-y-0.5">
                            <div>KG netos: {formatNum(parseNum(newReqForm.cantidad)*parseNum(newReqForm.pesoMillar))} KG | +5% merma → {newReqForm.requestedKg} KG</div>
                          </div>
                        )}
                      </div>
                      <button type="submit" className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600 transition-all">GUARDAR Y PASAR A PLANTA</button>
                    </div>
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
    try {
      // ── Usar la variable de estado costCategories (incluye categorías personalizadas) ──
      const allCats = Array.isArray(costCategories) && costCategories.length > 0 ? costCategories : COSTO_CATEGORIES;

      const filteredCosts = (opCosts || []).filter(cost => {
        if (!cost) return false;
        const matchCategory = costFilterCategory === 'TODAS' || cost.category === costFilterCategory;
        const matchMonth = costFilterMonth === 'TODOS' || cost.month === costFilterMonth;
        return matchCategory && matchMonth;
      });

      // Resumen por categoría — dinámico con todas las categorías conocidas
      const costsByCategory = {};
      allCats.forEach(cat => { costsByCategory[cat] = 0; });
      (opCosts || []).forEach(cost => {
        if (!cost || !cost.category) return;
        if (costsByCategory[cost.category] !== undefined) {
          costsByCategory[cost.category] += parseNum(cost.amount);
        } else {
          // Categoría personalizada no en la lista base
          costsByCategory[cost.category] = parseNum(cost.amount);
        }
      });

      const totalCosts = Object.values(costsByCategory).reduce((s, v) => s + v, 0);
      const maxCategoryAmount = Math.max(...Object.values(costsByCategory).filter(v => v > 0), 1);

      // Meses únicos — protegido contra valores undefined/null
      const uniqueMonths = [...new Set(
        (opCosts || [])
          .map(c => c?.month || (c?.date ? String(c.date).substring(0, 7) : null))
          .filter(Boolean)
      )].sort().reverse();

      // Nombres de mes para mostrar
      const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const formatMonth = (ym) => {
        if (!ym || typeof ym !== 'string') return ym || '—';
        const parts = ym.split('-');
        if (parts.length < 2) return ym;
        const [yr, mo] = parts;
        const idx = parseInt(mo, 10) - 1;
        return `${MONTH_NAMES[idx] || mo} ${yr}`;
      };

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
              {/* Formulario de registro */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h3 className="text-sm font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">Registrar Nuevo Costo</h3>
                <form onSubmit={handleSaveOpCost} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Fecha</label>
                    <input type="date" value={newOpCostForm.date} onChange={e => setNewOpCostForm({...newOpCostForm, date: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">
                      Nombre / Cuenta {planDeCuentas.length > 0 ? <span className="text-green-600 font-black">(Plan de Cuentas activo)</span> : <span className="text-gray-400">(Categoria manual)</span>}
                    </label>
                    {planDeCuentas.length > 0 ? (
                      <select
                        value={newOpCostForm.cuentaContable}
                        onChange={e => {
                          const codigo = e.target.value;
                          const pdc = planDeCuentas.find(p => p.codigo === codigo);
                          setNewOpCostForm({
                            ...newOpCostForm,
                            cuentaContable: codigo,
                            category: pdc ? (pdc.nombre || pdc.subGrupo || pdc.grupo || codigo) : newOpCostForm.category
                          });
                        }}
                        className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500"
                        required
                      >
                        <option value="">Seleccione cuenta contable...</option>
                        {planDeCuentas.map(p => (
                          <option key={p.id} value={p.codigo}>
                            {p.codigo} — {p.nombre}{p.grupo ? ` [${p.grupo}]` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <select value={newOpCostForm.category} onChange={e => setNewOpCostForm({...newOpCostForm, category: e.target.value})} className="flex-1 border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500" required>
                          {allCats.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                        </select>
                        <button type="button" onClick={() => setShowNewCategoryModal(true)} className="text-[9px] bg-green-100 text-green-700 px-3 py-3 rounded-xl font-bold hover:bg-green-200 flex items-center gap-1 whitespace-nowrap"><Plus size={10}/> Nueva</button>
                      </div>
                    )}
                    {newOpCostForm.cuentaContable && (
                      <p className="text-[9px] font-black text-green-600 mt-1 bg-green-50 px-2 py-1 rounded-lg">
                        Cuenta: <span className="font-mono">{newOpCostForm.cuentaContable}</span> — Categoria: {newOpCostForm.category}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Monto ($)</label>
                    <input type="number" step="0.01" min="0.01" value={newOpCostForm.amount} onChange={e => setNewOpCostForm({...newOpCostForm, amount: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500 text-center" placeholder="0.00" required />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Descripcion</label>
                    <input type="text" value={newOpCostForm.description} onChange={e => setNewOpCostForm({...newOpCostForm, description: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500 uppercase" placeholder="EJ: PAGO DE FACTURA DE LUZ" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">&nbsp;</label>
                    <button type="submit" className="w-full bg-green-600 text-white px-4 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"><PlusCircle size={16}/> Registrar</button>
                  </div>
                </form>
              </div>

              {/* Filtros */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200">
                <h3 className="text-sm font-black uppercase text-black mb-4">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Categoría</label>
                    <select value={costFilterCategory} onChange={e => setCostFilterCategory(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500">
                      <option value="TODAS">TODAS LAS CATEGORÍAS</option>
                      {allCats.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes</label>
                    <select value={costFilterMonth} onChange={e => setCostFilterMonth(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-green-500">
                      <option value="TODOS">TODOS LOS MESES</option>
                      {uniqueMonths.map(m => (<option key={m} value={m}>{formatMonth(m)}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Resumen por categoría */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200">
                <h3 className="text-sm font-black uppercase text-black mb-6 border-b border-gray-200 pb-2">Resumen por Categoría (Total acumulado)</h3>
                <div className="space-y-3">
                  {Object.entries(costsByCategory).map(([cat, amount]) => {
                    const percentage = totalCosts > 0 ? (amount / totalCosts * 100) : 0;
                    const barWidth = amount > 0 ? (amount / maxCategoryAmount * 100) : 0;
                    return (
                      <div key={cat}>
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
                <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-lg font-black text-black uppercase">Total General</span>
                  <span className="text-2xl font-black text-green-600">${formatNum(totalCosts)}</span>
                </div>
              </div>

              {/* % Costos vs Ventas por mes */}
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
                        <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-bold uppercase">Sin costos registrados</td></tr>
                      ) : uniqueMonths.map(ym => {
                        const costoMes = (opCosts||[]).filter(c => (c?.month||'') === ym).reduce((s,c) => s + parseNum(c.amount), 0);
                        const ingresosMes = (invoices||[]).filter(i => (i?.fecha||'').startsWith(ym)).reduce((s,i) => s + parseNum(i.total), 0);
                        const pct = ingresosMes > 0 ? (costoMes / ingresosMes * 100) : 0;
                        return (
                          <tr key={ym} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 border-r font-black">{formatMonth(ym)}</td>
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
                <p className="text-[9px] font-bold text-gray-400 mt-3 uppercase">* S/V = Sin ventas ese mes | &lt;15% Eficiente | 15-30% Moderado | &gt;30% Alto</p>
              </div>

              {/* Tabla de costos registrados */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b border-gray-200"><h3 className="text-sm font-black uppercase text-black">Costos Registrados ({filteredCosts.length})</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b-2 border-gray-200">
                      <tr className="uppercase font-black text-[10px] tracking-widest text-gray-500">
                        <th className="py-3 px-4">Fecha</th><th className="py-3 px-4">Categoría</th><th className="py-3 px-4">Descripción</th><th className="py-3 px-4 text-right">Monto</th><th className="py-3 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredCosts.map(cost => (
                        <tr key={cost.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-xs text-gray-600">{cost.date}</td>
                          <td className="py-3 px-4"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{cost.category}</span></td>
                          <td className="py-3 px-4 font-bold text-xs text-gray-700 uppercase">{cost.description || '—'}</td>
                          <td className="py-3 px-4 text-right font-black text-green-600">${formatNum(cost.amount)}</td>
                          <td className="py-3 px-4 text-center"><button onClick={() => handleDeleteOpCost(cost.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={14}/></button></td>
                        </tr>
                      ))}
                      {filteredCosts.length === 0 && (<tr><td colSpan="5" className="p-10 text-center text-xs text-gray-400 font-bold uppercase">No hay costos registrados para los filtros seleccionados</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal nueva categoría */}
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
                    <button onClick={() => { setShowNewCategoryModal(false); setNewCategoryName(''); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-gray-300 transition-colors">CANCELAR</button>
                    <button onClick={handleAddCategory} className="flex-1 bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-green-700 transition-colors">AGREGAR</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } catch (err) {
      return (
        <div className="p-10 bg-red-50 rounded-3xl border border-red-200 text-center">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
          <h3 className="font-black text-red-700 uppercase mb-2">Error en Costos Operativos</h3>
          <p className="text-sm text-red-600 font-bold">{err.message}</p>
          <button onClick={() => window.location.reload()} className="mt-6 bg-black text-white px-6 py-2 rounded-xl font-black text-xs uppercase">Recargar</button>
        </div>
      );
    }
  };

  const renderSimuladorModule = () => {
    return (
      <div className="w-full max-w-7xl animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none print:m-0 print:p-0 print:block print:w-full">
          <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-pdf">
             <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Calculator className="text-orange-500" size={24}/> Simulador de Producción</h2>
             <div className="flex gap-2">
               <button onClick={handleResetCalc} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-300 transition-colors flex items-center gap-2"><PlusCircle size={16}/> NUEVA SIMULACIÓN</button>
               <button onClick={() => handleExportPDF('Simulador_Produccion', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> IMPRIMIR</button>
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

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                   <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl">
                     <span className="text-[10px] font-black text-gray-500 uppercase block mb-1">Demanda Neta (KG)</span>
                     <span className="text-2xl font-black text-blue-600 block">{formatNum(calcKilosNetos)} <span className="text-sm">KG</span></span>
                     {isBolsas && <span className="text-[10px] font-bold text-gray-400 mt-1 block">Peso Millar: {formatNum(simPesoMillar)} g</span>}
                   </div>
                   {isBolsas && simPesoMillar > 0 && (
                     <div className="bg-blue-50 border-2 border-blue-400 p-5 rounded-2xl">
                       <span className="text-[10px] font-black text-blue-700 uppercase block mb-1">Millares a Producir</span>
                       <span className="text-2xl font-black text-blue-700 block">{formatNum(inputCantidadSolicitada)} <span className="text-sm">Mill.</span></span>
                       <span className="text-[10px] font-bold text-blue-500 mt-1 block">= {formatNum(calcKilosNetos)} KG netos</span>
                     </div>
                   )}
                   {!isBolsas && (
                     <div className="bg-green-50 border-2 border-green-400 p-5 rounded-2xl">
                       <span className="text-[10px] font-black text-green-700 uppercase block mb-1">KG a Producir (Termo)</span>
                       <span className="text-2xl font-black text-green-700 block">{formatNum(inputCantidadSolicitada)} <span className="text-sm">KG</span></span>
                       <span className="text-[10px] font-bold text-green-500 mt-1 block">Millares: N/A</span>
                     </div>
                   )}
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

  // ── FUNCIÓN DIRECTA DE GUARDADO DE FASE ──────────────────────────────────
  // ── HELPERS DE LOTES DE PRODUCCIÓN ────────────────────────────────────────
  // Obtiene los lotes de producción de una OP (compatible con estructura anterior)
  const getLotes = (req) => {
    const prod = req.production || {};
    // Si ya tiene lotes, retornarlos
    if (Array.isArray(prod.lotes) && prod.lotes.length > 0) return prod.lotes;
    // Compatibilidad hacia atrás: convertir estructura plana a lote único
    if (prod.extrusion || prod.impresion || prod.sellado) {
      return [{ id: 'L-001', nombre: 'Lote 1', extrusion: prod.extrusion || {batches:[]}, impresion: prod.impresion || {batches:[]}, sellado: prod.sellado || {batches:[]}, cerrado: false }];
    }
    return [];
  };

  const getLoteActivo = (req) => {
    const lotes = getLotes(req);
    return lotes[activeLoteIndex] || lotes[lotes.length - 1] || { id: 'L-001', nombre: 'Lote 1', extrusion:{batches:[]}, impresion:{batches:[]}, sellado:{batches:[]}, cerrado: false };
  };

  const handleCrearNuevoLote = async (req) => {
    const lotes = getLotes(req);
    const n = lotes.length + 1;
    const nuevoLote = { id: `L-${String(n).padStart(3,'0')}`, nombre: `Lote ${n}`, extrusion:{batches:[], isClosed:false}, impresion:{batches:[], isClosed:false}, sellado:{batches:[], isClosed:false}, cerrado: false, fechaCreacion: getTodayDate(), creadoPor: appUser?.name };
    const nuevosLotes = [...lotes, nuevoLote];
    await updateDoc(getDocRef('requirements', req.id), { 'production.lotes': nuevosLotes });
    setActiveLoteIndex(nuevosLotes.length - 1);
    setPhaseForm({...initialPhaseForm, date: getTodayDate()});
    setActivePhaseTab('extrusion');
    setDialog({title:`✅ Lote ${n} creado`, text:`Se creó el Lote ${n} de producción. Registre las fases para este lote.`, type:'alert'});
  };

  const handleCerrarLote = async (req) => {
    const lotes = getLotes(req);
    const updated = lotes.map((l, i) => i === activeLoteIndex ? {...l, cerrado: true, fechaCierre: getTodayDate()} : l);
    await updateDoc(getDocRef('requirements', req.id), { 'production.lotes': updated });
    setDialog({title:'Lote Cerrado', text:`El Lote ${activeLoteIndex+1} fue cerrado. Cree un nuevo lote para continuar produciendo.`, type:'alert'});
  };

  const handleSavePhaseDirectly = async (req, isClose) => {
    if (!req) return;
    const prodKg = parseNum(phaseForm?.producedKg);
    const totalInsumosKg = (phaseForm?.insumos || []).reduce((s, ing) => s + parseNum(ing?.qty), 0);
    // KG recibidos según la fase activa
    const kgRecibidos = activePhaseTab === 'impresion' ? parseNum(phaseForm.kgRecibidosImp)
                      : activePhaseTab === 'sellado'   ? parseNum(phaseForm.kgRecibidosSel)
                      : totalInsumosKg;
    // Merma = KG usados - KG producidos (basada en insumos registrados)
    const baseParaMerma = totalInsumosKg > 0 ? totalInsumosKg : kgRecibidos;
    const mermaKg = baseParaMerma > 0 && prodKg >= 0 ? Math.max(0, baseParaMerma - prodKg) : parseNum(phaseForm?.mermaKg);
    const mermaPorc = baseParaMerma > 0 ? ((mermaKg / baseParaMerma) * 100).toFixed(2) : 0;

    if (prodKg === 0 && kgRecibidos === 0 && (phaseForm?.insumos || []).length === 0) {
      return setDialog({ title: 'Aviso', text: 'Ingrese KG producidos y/o insumos consumidos antes de guardar.', type: 'alert' });
    }
    try {
      // Usar estructura plana prod.extrusion/impresion/sellado (compatible con todos los reportes)
      const prodActual = req.production || {};
      let currentPhase = { ...(prodActual[activePhaseTab] || { batches: [], isClosed: false }) };
      const fbBatch = writeBatch(db);
      let phaseCost = 0;

      for (let ing of (phaseForm?.insumos || [])) {
        const item = (inventory || []).find(i => i?.id === ing?.id);
        if (item) {
          phaseCost += (item.cost || 0) * parseNum(ing.qty);
          fbBatch.update(getDocRef('inventory', item.id), { stock: (item.stock || 0) - parseNum(ing.qty) });
          const movId = `PROD-${Date.now()}-${item.id}`;
          fbBatch.set(getDocRef('inventoryMovements', movId), {
            id: movId, date: phaseForm.date || getTodayDate(), itemId: item.id, itemName: item.desc,
            type: 'SALIDA', qty: parseNum(ing.qty), cost: item.cost, totalValue: parseNum(ing.qty) * item.cost,
            reference: req.id, opAsignada: req.id,
            notes: `PRODUCCIÓN ${activePhaseTab.toUpperCase()}`,
            timestamp: Date.now(), user: appUser?.name || 'Planta'
          });
        }
      }

      let techParams = {};
      if (activePhaseTab === 'extrusion') techParams = { operador: phaseForm.operadorExt, motor: phaseForm.motorExt, tratado: phaseForm.tratado, millares: phaseForm.millaresProd, kgRecibidos: kgRecibidos };
      if (activePhaseTab === 'impresion') techParams = { operador: phaseForm.operadorImp, kgRecibidos: phaseForm.kgRecibidosImp, cantColores: phaseForm.cantColores, relacion: phaseForm.relacionImp, millares: phaseForm.millaresProd };
      if (activePhaseTab === 'sellado')   techParams = { operador: phaseForm.operadorSel, tipoSello: phaseForm.tipoSello, millares: phaseForm.millaresProd, kgRecibidos: phaseForm.kgRecibidosSel };

      const newBatch = {
        id: Date.now().toString(), timestamp: Date.now(),
        date: phaseForm.date || getTodayDate(),
        insumos: phaseForm.insumos || [],
        producedKg: prodKg, mermaKg, mermaPorc: parseFloat(mermaPorc),
        // Desglose de merma por tipo (solo extrusión y sellado)
        mermaDetalle: {
          troquelTransp: parseNum(phaseForm.mermaTroquelTransp) || 0,
          troquelPigm: parseNum(phaseForm.mermaTroquelPigm) || 0,
          torta: parseNum(phaseForm.mermaTorta) || 0,
        },
        kgRecibidos,
        totalInsumosKg,
        cost: phaseCost,
        operator: appUser?.name || 'Operador', techParams,
        observaciones: phaseForm.observaciones || ''
      };

      // ── MERMA → INVENTARIO RECICLADO ─────────────────────────────────────
      if (activePhaseTab === 'extrusion' || activePhaseTab === 'sellado') {
        const faseLabel = activePhaseTab === 'extrusion' ? 'EXTRUSIÓN' : 'SELLADO';
        const mermaTypes = [
          { key: 'troquelTransp', kg: parseNum(phaseForm.mermaTroquelTransp), desc: 'RECICLADO TRANSPARENTE', invId: 'MP-000' },
          { key: 'troquelPigm',  kg: parseNum(phaseForm.mermaTroquelPigm),  desc: 'RECICLADO PIGMENTADO',  invId: 'MP-001' },
          { key: 'torta',        kg: parseNum(phaseForm.mermaTorta),        desc: 'RECICLADO TORTA',       invId: 'MP-002' },
        ];
        for (const mt of mermaTypes) {
          if (mt.kg <= 0) continue;
          const existing = (inventory || []).find(i => i.id === mt.invId);
          if (existing) {
            fbBatch.update(getDocRef('inventory', mt.invId), { stock: (existing.stock || 0) + mt.kg });
          } else {
            fbBatch.set(getDocRef('inventory', mt.invId), {
              id: mt.invId, desc: mt.desc, category: 'Materia Prima', unit: 'kg',
              stock: mt.kg, cost: 0, minStock: 0, timestamp: Date.now(),
              notes: 'Material reciclado de producción'
            });
          }
          const movRecId = `REC-${mt.invId}-${Date.now()}-${Math.floor(Math.random()*9999)}`;
          fbBatch.set(getDocRef('inventoryMovements', movRecId), {
            id: movRecId,
            date: phaseForm.date || getTodayDate(),
            itemId: mt.invId,
            itemName: mt.desc,
            type: 'ENTRADA',
            qty: mt.kg,
            cost: 0,
            totalValue: 0,
            reference: req.id,
            opAsignada: req.id,
            fase: faseLabel,
            tipoMerma: mt.key,
            notes: `♻ RECICLADO — ${faseLabel} | OP ${req.id} | ${phaseForm.date || getTodayDate()} | Op: ${appUser?.name || 'Planta'}`,
            timestamp: Date.now(),
            user: appUser?.name || 'Planta'
          });
        }
      }

      if (!currentPhase.batches) currentPhase.batches = [];
      currentPhase.batches.push(newBatch);
      if (isClose) currentPhase.isClosed = true;

      // Guardar en estructura plana (compatible con todos los reportes)
      const newProd = { ...(req.production || {}), [activePhaseTab]: currentPhase };
      fbBatch.update(getDocRef('requirements', req.id), { production: newProd, status: 'EN PROCESO' });
      await fbBatch.commit();

      // Solo crear entrada en Terminados si esta es la ÚLTIMA fase activa de la OP
      // (la que produce el producto final de la cadena)
      if (prodKg > 0) {
        const matchFormula = (formulas||[]).find(f => f.categoria && req.categoria && f.categoria.toUpperCase() === (req.categoria||'').toUpperCase());
        const fasesActivas = matchFormula?.fases || { extrusion: true, impresion: false, sellado: false };
        // Determinar cuál es la última fase definida
        const ultimaFase = fasesActivas.sellado ? 'sellado' : fasesActivas.impresion ? 'impresion' : 'extrusion';
        const esUltimaFase = activePhaseTab === ultimaFase;

        if (esUltimaFase) {
          const esTermo = req.tipoProducto === 'TERMOENCOGIBLE';
          const millEntrada = esTermo ? 0 : parseNum(techParams.millares || 0);
          const batchId = newBatch.id;
          const fgId = `FG-${batchId}`;
          const fgExists = (finishedGoodsInventory||[]).some(fg => fg.id === fgId || fg.batchId === batchId);
          if (!fgExists) {
            await setDoc(getDocRef('finishedGoodsInventory', fgId), {
              id: fgId, opId: req.id, reqId: req.id,
              cliente: req.client || 'N/A',
              tipoProducto: req.tipoProducto || 'BOLSAS',
              categoria: req.categoria || '',
              producto: req.desc || 'Producto',
              ancho: req.ancho || 0, largo: req.largo || 0, micras: req.micras || 0,
              color: req.color || 'NATURAL', tratamiento: req.tratamiento || 'LISO',
              kgProducidos: prodKg,
              millares: millEntrada,
              costoUnitario: phaseCost > 0 && prodKg > 0 ? phaseCost / prodKg : 0,
              fechaFinalizacion: phaseForm.date || getTodayDate(),
              ubicacion: 'ALMACEN GENERAL',
              status: 'LISTO PARA ENTREGA',
              fase: activePhaseTab,
              batchId,
              observaciones: phaseForm.observaciones || '',
              timestamp: Date.now()
            });
          }
        }
        // NO modificar entregasParciales aquí — solo el botón manual lo hace
      }

      setPhaseForm({ ...initialPhaseForm, date: getTodayDate() });
      setDialog({
        title: isClose ? 'Fase Cerrada' : 'Lote Guardado',
        text: isClose
          ? `La fase de ${activePhaseTab.toUpperCase()} fue cerrada. La OP sigue activa. Use "Cierre OP" para finalizar.`
          : 'Lote parcial guardado correctamente.',
        type: 'alert'
      });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  };

  const renderFiniquitoOP = (req, costsMode = false) => {
    if (!req) return null;
    const prod = req.production || {};
    // Filtrar lotes fantasma
    const filterRealBatches = (batches) => (batches||[]).filter(b =>
      b.operator !== 'ALMACÉN (DESPACHO)' && (parseNum(b.producedKg) > 0 || (b.insumos||[]).length > 0)
    );

    const extBatches = filterRealBatches(prod.extrusion?.batches).map(b=>({...b,fase:'EXTRUSIÓN'}));
    const impBatches = filterRealBatches(prod.impresion?.batches).map(b=>({...b,fase:'IMPRESIÓN'}));
    const selBatches = filterRealBatches(prod.sellado?.batches).map(b=>({...b,fase:'SELLADO'}));
    const allBatches = [...extBatches, ...impBatches, ...selBatches];

    // ── LÓGICA DE CADENA DE PRODUCCIÓN ──────────────────────────────────────
    // Es un proceso continuo: Extrusión → Impresión → Sellado
    // MP Inyectada = solo insumos reales de EXTRUSIÓN (materia prima bruta inyectada al inicio)
    const mpInyectadaKg = extBatches.reduce((s,b)=>{
      const insumosUsados = (b.insumos||[]).reduce((ss,ing)=>ss+parseNum(ing.qty),0);
      return s + (insumosUsados > 0 ? insumosUsados : parseNum(b.kgRecibidos||b.totalInsumosKg||0));
    },0) || impBatches.reduce((s,b)=>s+parseNum(b.kgRecibidos||b.totalInsumosKg||0),0)
         || selBatches.reduce((s,b)=>s+parseNum(b.kgRecibidos||b.totalInsumosKg||0),0);

    // KG producidos finales = ÚLTIMA fase activa (la que produce el producto final)
    // Sellado > Impresión > Extrusión (prioridad de última fase)
    const lastActiveBatches = selBatches.length>0 ? selBatches : impBatches.length>0 ? impBatches : extBatches;
    const kgProducidosFinales = lastActiveBatches.reduce((s,b)=>s+parseNum(b.producedKg),0);

    // Merma REAL de la cadena = MP entrada - KG salida final
    const totalMermaKg = Math.max(0, mpInyectadaKg - kgProducidosFinales);
    const pctMerma = mpInyectadaKg > 0 ? (totalMermaKg / mpInyectadaKg * 100) : 0;

    // Costo total = suma de insumos consumidos en TODAS las fases
    const totalCostoMP = allBatches.reduce((s,b)=>s+parseNum(b.cost),0);

    // Millares = ÚLTIMA fase activa (el producto terminado final)
    const totalMillares = selBatches.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)
      || impBatches.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)
      || extBatches.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0);

    const costoPorMillar = totalMillares > 0 ? totalCostoMP / totalMillares : 0;
    const relatedInvoices = invoices.filter(i => i.opAsignada === req.id);
    const totalIngresos  = relatedInvoices.reduce((s,i)=>s+parseNum(i.total),0);
    const ganancia = totalIngresos - totalCostoMP;
    const margenNeto = totalIngresos > 0 ? (ganancia / totalIngresos * 100) : 0;
    const costoNetoPorKg = kgProducidosFinales > 0 ? totalCostoMP / kgProducidosFinales : 0;
    const costoPromMezcla = mpInyectadaKg > 0 ? totalCostoMP / mpInyectadaKg : 0;
    // Alias para compatibilidad
    const totalInsumosKg = mpInyectadaKg;
    const totalProdKg = kgProducidosFinales;

    // Agrupar insumos: solo los reales del inventario (los insumos registrados en cada lote)
    const insumoMap = {};
    allBatches.forEach(b => {
      (b.insumos || []).forEach(ing => {
        if (!insumoMap[ing.id]) {
          const invItem = (inventory||[]).find(i => i.id === ing.id);
          insumoMap[ing.id] = { id: ing.id, desc: invItem?.desc || ing.id, qty: 0, cost: invItem?.cost || 0, fase: b.fase };
        }
        insumoMap[ing.id].qty += parseNum(ing.qty);
      });
    });
    const insumosList = Object.values(insumoMap);
    const fechaInicio = allBatches[0]?.date || req.fecha;
    const fechaCierre = allBatches[allBatches.length-1]?.date || getTodayDate();

    return (
      <div id="pdf-content" className="bg-white text-black">
        {/* Controles no-pdf */}
        <div className="flex justify-between p-6 border-b border-gray-200 no-pdf">
          <button onClick={() => setShowFiniquitoOP(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200 flex items-center gap-2">← Volver</button>
          <div className="flex gap-2">
            {req.status === 'COMPLETADO' && (
              <button onClick={() => requireAdminPassword(async () => {
                await updateDoc(getDocRef('requirements', req.id), { status: 'EN PROCESO', fechaReapertura: getTodayDate(), reabiertoPor: appUser?.name });
                setShowFiniquitoOP(null);
                setDialog({ title: '✅ OP Reabierta', text: `La OP fue reabierta. Puede modificar y registrar fases nuevamente desde Producción Activa.`, type: 'alert' });
              }, 'Reabrir OP Completada')} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-blue-700 flex items-center gap-2 shadow-md">
                <Edit size={14}/> REABRIR OP
              </button>
            )}
            <button onClick={() => handleExportPDF(`${costsMode?'Finiquito':'Reporte_Produccion'}_OP_${req.id}`, true)} className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg hover:bg-gray-800"><Printer size={16}/> Imprimir</button>
          </div>
        </div>
        <div className="p-8">
          <div className="hidden pdf-header mb-6"><ReportHeader /></div>
          <div className="text-center mb-6 pb-4 border-b-4 border-orange-500">
            <h1 className="text-2xl font-black uppercase tracking-widest">
              {costsMode ? 'Finiquito Financiero de Producción' : 'Reporte de Producción'}
            </h1>
          </div>

          {/* Info OP */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div className="space-y-1">
              <div><span className="font-black uppercase text-gray-500 text-[9px] block">Cliente:</span><span className="font-black text-sm uppercase">{req.client}</span></div>
              <div><span className="font-black uppercase text-gray-500 text-[9px] block">Tipo / Categoría:</span><span className="font-black text-sm uppercase">{req.tipoProducto || '—'} / {req.categoria || '—'}</span></div>
              <div><span className="font-black uppercase text-gray-500 text-[9px] block">Producto / Maquila:</span><span className="font-black text-sm uppercase">{req.desc}</span></div>
              <div><span className="font-black uppercase text-gray-500 text-[9px] block">Dimensiones:</span><span className="font-black">{req.ancho}cm × {req.largo}cm | {req.micras} mic | {req.color}</span></div>
              <div><span className="font-black uppercase text-gray-500 text-[9px] block">Cantidad Estimada:</span><span className="font-black">{formatNum(req.requestedKg)} KG | {formatNum(req.cantidad)} {req.presentacion}</span></div>
            </div>
            <div className="space-y-1 text-right">
              <div><span className="font-black uppercase text-gray-500 text-[9px] block">Número de Orden:</span><span className="font-black text-3xl text-orange-600">#{String(req.id).replace('OP-','').padStart(5,'0')}</span></div>
              <div><span className="font-black uppercase text-gray-500 text-[9px] block">Fecha Inicio:</span><span className="font-black">{fechaInicio}</span></div>
              <div><span className="font-black uppercase text-gray-500 text-[9px] block">Fecha Cierre:</span><span className="font-black">{fechaCierre}</span></div>
              <div><span className="font-black uppercase text-gray-500 text-[9px] block">Vendedor:</span><span className="font-black uppercase">{req.vendedor || '—'}</span></div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-0 border-2 border-gray-300 rounded-xl overflow-hidden mb-6">
            {(() => {
              const esTermo = req.tipoProducto === 'TERMOENCOGIBLE';
              const kpi4Label = esTermo ? 'KG Producidos (Termo)' : 'Millares Producidos';
              const kpi4Value = esTermo
                ? formatNum(totalProdKg) + ' KG'
                : (totalMillares > 0 ? formatNum(totalMillares) + ' Mill.' : formatNum(totalProdKg) + ' KG');
              // Pendiente producir
              const solicitado = esTermo ? parseNum(req.requestedKg) : parseNum(req.cantidad);
              const producido = esTermo ? totalProdKg : (totalMillares || totalProdKg);
              const pendiente = Math.max(0, solicitado - producido);
              return [
                ['Total MP Inyectada', formatNum(totalInsumosKg)+' KG','text-black'],
                ['Total Merma Generada', formatNum(totalMermaKg)+' KG','text-red-600'],
                ['% Merma Global OP', pctMerma.toFixed(2)+'%','text-orange-600'],
                [kpi4Label, kpi4Value, 'text-blue-600'],
              ].map(([label,val,color],i)=>(
                <div key={i} className={`p-5 text-center bg-gray-50 ${i<3?'border-r border-gray-300':''}`}>
                  <div className="text-[9px] font-black uppercase text-gray-500 mb-1">{label}</div>
                  <div className={`text-2xl font-black ${color}`}>{val}</div>
                  {i === 3 && pendiente > 0 && (
                    <div className="text-[9px] font-bold text-orange-500 mt-1">
                      Solicitado: {formatNum(solicitado)} | Pendiente: {formatNum(pendiente)} {esTermo?'KG':'Mill.'}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>

          {/* Sección 1: Desglose de Producción (MP) */}
          <div className="mb-6">
            <div className="bg-orange-500 text-white px-4 py-2 text-[10px] font-black uppercase rounded-t-lg">1. Desglose de Producción (MP)</div>
            <div className="border-2 border-gray-200 rounded-b-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr className="uppercase font-black text-[9px] text-gray-600">
                    <th className="p-3 border-r text-left">Insumo / Descripción</th>
                    <th className="p-3 border-r text-center">Fase</th>
                    <th className={`p-3 ${costsMode ? 'border-r' : ''} text-center`}>Cantidad (KG)</th>
                    {costsMode && <th className="p-3 border-r text-right">Costo Unit.</th>}
                    {costsMode && <th className="p-3 text-right">Costo Total</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {insumosList.map((ins,i)=>(
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 border-r font-black text-orange-600 uppercase">{ins.desc}</td>
                      <td className="p-3 border-r text-center font-bold">{ins.fase}</td>
                      <td className={`p-3 ${costsMode ? 'border-r' : ''} text-center font-black`}>{formatNum(ins.qty)} kg</td>
                      {costsMode && <td className="p-3 border-r text-right font-bold">${formatNum(ins.cost)}</td>}
                      {costsMode && <td className="p-3 text-right font-black">${formatNum(ins.qty*ins.cost)}</td>}
                    </tr>
                  ))}
                  {insumosList.length===0&&<tr><td colSpan={costsMode?5:3} className="p-4 text-center text-gray-400 font-bold">Sin insumos</td></tr>}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr className="font-black">
                    <td colSpan={costsMode?4:2} className="p-3 text-right uppercase text-[10px]">
                      {costsMode ? 'Costo Total MP:' : 'Total MP Inyectada:'}
                    </td>
                    <td className={`p-3 ${costsMode ? 'text-right' : 'text-center'} text-orange-600 ${costsMode ? 'text-lg' : 'text-sm'}`}>
                      {costsMode ? `$${formatNum(totalCostoMP)}` : `${formatNum(totalInsumosKg)} KG`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Sección 2 (solo costsMode): Indicadores de Costo */}
          {costsMode && (
            <div className="mb-6">
              <div className="bg-blue-600 text-white px-4 py-2 text-[10px] font-black uppercase rounded-t-lg">2. Indicadores de Costo — Desglose de Formulación</div>
              <div className="border-2 border-gray-200 rounded-b-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Demanda Neta (Requerida)', formatNum(parseNum(req.requestedKg))+' KG', 'text-blue-600'],
                  ['Costo Promedio Mezcla', '$'+formatNum(costoPromMezcla)+' / KG', 'text-gray-700'],
                  ['Costo Neto x KG Terminado', '$'+formatNum(costoNetoPorKg)+' / KG', 'text-gray-700'],
                  req.tipoProducto === 'TERMOENCOGIBLE'
                    ? ['Costo por KG (Termo)', '$'+formatNum(costoNetoPorKg)+' / KG', 'text-green-600']
                    : ['Costo por '+(totalMillares>0?'Millar':'KG')+' (Final)', '$'+formatNum(totalMillares>0?costoPorMillar:costoNetoPorKg), 'text-green-600'],
                ].map(([label,val,color],i)=>(
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-[9px] font-black text-gray-500 uppercase mb-2">{label}</div>
                    <div className={`text-lg font-black ${color}`}>{val}</div>
                    {i===1 && <div className="text-[8px] text-gray-400 mt-1">(Total / KG Planta)</div>}
                    {i===2 && <div className="text-[8px] text-gray-400 mt-1">(Absorbiendo Merma)</div>}
                    {i===3 && <div className="text-[8px] text-green-600 mt-1 uppercase font-black">COSTO REAL MATERIA PRIMA</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección 2 (producción) / 3 (costos): Detalle por Fase */}
          <div className="mb-6">
            <div className="bg-gray-800 text-white px-4 py-2 text-[10px] font-black uppercase rounded-t-lg">{costsMode ? '3' : '2'}. Detalle de Producción por Fase</div>
            <div className="border-2 border-gray-200 rounded-b-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-100"><tr className="uppercase font-black text-[9px] text-gray-600">
                  <th className="p-3 border-r text-left">Fase / Lote</th>
                  <th className="p-3 border-r text-center">Fecha</th>
                  <th className="p-3 border-r text-center">KG Recibidos</th>
                  <th className="p-3 border-r text-center">KG Producidos</th>
                  <th className="p-3 border-r text-center">Merma KG (%)</th>
                  <th className="p-3 border-r text-center">♻ Transp. (KG / %)</th>
                  <th className="p-3 border-r text-center">♻ Pigm. (KG / %)</th>
                  <th className="p-3 border-r text-center">♻ Torta (KG / %)</th>
                  {req.tipoProducto !== 'TERMOENCOGIBLE' && <th className="p-3 text-center">Millares</th>}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {allBatches.map((b,i)=>{
                    // Para EXTRUSIÓN: mostrar KG reales usados (insumos); para otras: KG recibidos de la fase anterior
                    const insumosUsados = (b.insumos||[]).reduce((s,ing)=>s+parseNum(ing.qty),0);
                    const kgEntrada = b.fase==='EXTRUSIÓN' && insumosUsados>0 ? insumosUsados : parseNum(b.kgRecibidos||b.totalInsumosKg||0);
                    return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 border-r font-black">{b.fase}<span className="text-[9px] font-bold text-gray-400 ml-2">Lote {i+1}</span>
                        {b.observaciones && <div className="text-[9px] font-bold text-indigo-600 mt-0.5">📝 {b.observaciones}</div>}
                      </td>
                      <td className="p-3 border-r text-center font-bold">{b.date}</td>
                      <td className="p-3 border-r text-center font-black text-blue-600">{formatNum(kgEntrada)} kg{b.fase!=='EXTRUSIÓN'&&<span className="text-[8px] text-gray-400 ml-1">(de fase ant.)</span>}</td>
                      <td className="p-3 border-r text-center font-black text-green-600">{formatNum(b.producedKg)} kg</td>
                      <td className="p-3 border-r text-center font-black text-red-500">{formatNum(b.mermaKg)} kg{kgEntrada > 0 ? ` (${((parseNum(b.mermaKg)/kgEntrada)*100).toFixed(1)}%)` : b.mermaPorc > 0 ? ` (${b.mermaPorc}%)` : ''}</td>
                      {(() => {
                        const base = kgEntrada > 0 ? kgEntrada : parseNum(b.mermaKg) + parseNum(b.producedKg);
                        const trKg = parseNum(b.mermaDetalle?.troquelTransp||0);
                        const pgKg = parseNum(b.mermaDetalle?.troquelPigm||0);
                        const toKg = parseNum(b.mermaDetalle?.torta||0);
                        const pct = (kg) => base > 0 && kg > 0 ? ` (${((kg/base)*100).toFixed(1)}%)` : '';
                        return (<>
                          <td className="p-3 border-r text-center text-blue-700 font-bold text-xs">{trKg>0?<>{formatNum(trKg)} kg<span className="text-blue-400 font-bold">{pct(trKg)}</span></>:'—'}</td>
                          <td className="p-3 border-r text-center text-orange-700 font-bold text-xs">{pgKg>0?<>{formatNum(pgKg)} kg<span className="text-orange-400 font-bold">{pct(pgKg)}</span></>:'—'}</td>
                          <td className="p-3 border-r text-center text-amber-700 font-bold text-xs">{toKg>0?<>{formatNum(toKg)} kg<span className="text-amber-400 font-bold">{pct(toKg)}</span></>:'—'}</td>
                        </>);
                      })()}
                      {req.tipoProducto !== 'TERMOENCOGIBLE' && <td className="p-3 text-center font-black">{parseNum(b.techParams?.millares||0)>0?formatNum(parseNum(b.techParams.millares))+' Mill.':'—'}</td>}
                    </tr>
                    );
                  })}
                  {allBatches.length===0&&<tr><td colSpan="6" className="p-4 text-center text-gray-400 font-bold">Sin lotes registrados</td></tr>}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-black">
                  <tr>
                    <td colSpan="2" className="p-3 text-right uppercase text-[10px]">RESUMEN:</td>
                    <td className="p-3 text-center text-blue-700" title="MP bruta inyectada (solo fase inicial)">{formatNum(mpInyectadaKg)} kg</td>
                    <td className="p-3 text-center text-green-700" title="KG finales producidos (última fase)">{formatNum(kgProducidosFinales)} kg</td>
                    <td className="p-3 text-center text-red-600">{formatNum(totalMermaKg)} kg ({pctMerma.toFixed(1)}%)</td>
                    {(() => {
                      const totT=allBatches.reduce((s,b)=>s+parseNum(b.mermaDetalle?.troquelTransp||0),0);
                      const totP=allBatches.reduce((s,b)=>s+parseNum(b.mermaDetalle?.troquelPigm||0),0);
                      const totTt=allBatches.reduce((s,b)=>s+parseNum(b.mermaDetalle?.torta||0),0);
                      const base = mpInyectadaKg > 0 ? mpInyectadaKg : 1;
                      const pct = (kg) => kg > 0 ? ` (${((kg/base)*100).toFixed(1)}%)` : '';
                      return (<>
                        <td className="p-3 text-center text-blue-700 font-bold">{totT>0?<>{formatNum(totT)} kg<span className="text-blue-400 text-[9px]">{pct(totT)}</span></>:'—'}</td>
                        <td className="p-3 text-center text-orange-700 font-bold">{totP>0?<>{formatNum(totP)} kg<span className="text-orange-400 text-[9px]">{pct(totP)}</span></>:'—'}</td>
                        <td className="p-3 text-center text-amber-700 font-bold">{totTt>0?<>{formatNum(totTt)} kg<span className="text-amber-400 text-[9px]">{pct(totTt)}</span></>:'—'}</td>
                      </>);
                    })()}
                    {req.tipoProducto !== 'TERMOENCOGIBLE' && <td className="p-3 text-center">{totalMillares>0?formatNum(totalMillares)+' Mill.':'—'}</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Sección 3 (producción) / 4 (costos): Ventas y Facturación — solo costos */}
          {costsMode && (
          <div className="mb-6">
            <div className="bg-green-600 text-white px-4 py-2 text-[10px] font-black uppercase rounded-t-lg">4. Ventas y Facturación de la OP</div>
            <div className="border-2 border-gray-200 rounded-b-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-100"><tr className="uppercase font-black text-[9px] text-gray-600"><th className="p-3 border-r text-left">Factura N°</th><th className="p-3 border-r text-center">Fecha</th><th className="p-3 border-r text-right">Base (Ingreso Real)</th><th className="p-3 border-r text-right">IVA (16%)</th><th className="p-3 text-right">Total Cobrado</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {relatedInvoices.length===0?(
                    <tr><td colSpan="5" className="p-4 text-center text-gray-400 font-black uppercase">No hay facturas asociadas a esta OP.</td></tr>
                  ):relatedInvoices.map(inv=>(
                    <tr key={inv.id}><td className="p-3 border-r font-black text-orange-600">{inv.documento}</td><td className="p-3 border-r text-center font-bold">{inv.fecha}</td><td className="p-3 border-r text-right font-bold">${formatNum(inv.montoBase)}</td><td className="p-3 border-r text-right font-bold">${formatNum(inv.iva)}</td><td className="p-3 text-right font-black text-green-600">${formatNum(inv.total)}</td></tr>
                  ))}
                </tbody>
                {relatedInvoices.length>0&&(<tfoot className="bg-gray-100 border-t-2 border-gray-300 font-black"><tr><td colSpan="4" className="p-3 text-right uppercase text-[10px]">Total Ingresos:</td><td className="p-3 text-right text-green-700 text-lg">${formatNum(totalIngresos)}</td></tr></tfoot>)}
              </table>
            </div>
          </div>
          )}

          {/* Sección 3.1 / 4.1 Entregas Parciales: eliminada del reporte */}

          {/* Indicadores Financieros y Firmas — solo costsMode */}
          {costsMode && (<>
          <div className="grid grid-cols-3 gap-0 border-2 border-gray-300 rounded-xl overflow-hidden mb-6">
            <div className="col-span-1 p-5 bg-gray-50 border-r border-gray-300">
              <div className="text-[9px] font-black uppercase text-gray-500 mb-1">Cruce de Información Financiera</div>
              <div className="text-xs font-black uppercase text-black">Rentabilidad y Margen Neto de la OP</div>
              {totalMillares>0&&<div className="text-[9px] font-bold text-gray-500 mt-2">Costo/Millar: ${formatNum(costoPorMillar)}</div>}
            </div>
            <div className="col-span-1 p-5 text-center border-r border-gray-300">
              <div className="text-[9px] font-black uppercase text-gray-500 mb-1">Ganancia / Pérdida</div>
              <div className={`text-2xl font-black ${ganancia>=0?'text-blue-600':'text-red-600'}`}>${formatNum(ganancia)}</div>
            </div>
            <div className="col-span-1 p-5 text-center bg-gray-800">
              <div className="text-[9px] font-black uppercase text-gray-300 mb-1">Margen Neto</div>
              <div className={`text-2xl font-black ${margenNeto>=0?'text-green-400':'text-red-400'}`}>{margenNeto.toFixed(2)}%</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-16 mt-12 text-center text-[10px] font-black uppercase border-t-2 border-gray-300 pt-6">
            <div><div className="border-t-2 border-black mx-auto pt-2 w-3/4">Departamento de Costos</div></div>
            <div><div className="border-t-2 border-black mx-auto pt-2 w-3/4">Revisado y Aprobado (Gerencia)</div></div>
          </div>
          </>)}
        </div>
      </div>
    );
  };

  const renderOrdenTrabajo = (req) => {
    if (!req) return null;
    const opNum = String(req.id).replace('OP-','').padStart(5,'0');
    return (
      <div id="pdf-content" className="bg-white text-black">
        <div className="flex justify-between p-4 border-b no-pdf">
          <button onClick={()=>setShowOrdenTrabajo(null)} className="bg-gray-100 px-5 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">← Volver</button>
          <button onClick={()=>handleExportPDF(`OT_OP_${req.id}`,false)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-gray-800"><Printer size={14}/> Imprimir OT</button>
        </div>
        <div className="p-6">
          <div className="hidden pdf-header mb-4"><ReportHeader /></div>
          {/* Encabezado */}
          <div className="flex justify-between items-start mb-4 pb-3 border-b-2 border-black">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-light tracking-widest text-gray-700">Supply</span>
                <span className="font-black text-[32px] text-black leading-none">G</span><div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-base font-black">&amp;</div><span className="font-black text-[32px] text-black leading-none">B</span>
              </div>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Servicio y Calidad</span>
            </div>
            <div className="text-center flex-1">
              <h1 className="text-xl font-black uppercase tracking-widest text-black">Orden de Trabajo para OP.</h1>
            </div>
          </div>

          {/* Datos principales */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-xs border-b-2 border-gray-300 pb-3">
            <div><span className="font-black uppercase text-[9px] text-gray-500 block">Cliente:</span><span className="font-black uppercase text-black">{req.client}</span></div>
            <div><span className="font-black uppercase text-[9px] text-gray-500 block">OP:</span><span className="font-black text-black">#{opNum}</span></div>
            <div><span className="font-black uppercase text-[9px] text-gray-500 block">Emisión:</span><span className="font-black text-black">{req.fecha}</span></div>
            <div><span className="font-black uppercase text-[9px] text-orange-600 block">KG Materia Prima:</span><span className="font-black text-orange-600 text-lg">{formatNum(req.requestedKg)} KG</span></div>
            <div><span className="font-black uppercase text-[9px] text-gray-500 block">Tipo:</span><span className="font-black uppercase text-black">{req.tipoProducto}</span></div>
            <div><span className="font-black uppercase text-[9px] text-gray-500 block">Categoría del Producto:</span><span className="font-black uppercase text-black">{req.categoria || '—'}</span></div>
            <div className="col-span-3 grid grid-cols-2 gap-1 mt-1">
              <div><span className="font-black uppercase text-[9px] text-gray-500 block">Fecha Entrada:</span><div className="border-b border-gray-400 w-36 h-5"></div></div>
              <div><span className="font-black uppercase text-[9px] text-gray-500 block">Fecha Salida:</span><div className="border-b border-gray-400 w-36 h-5"></div></div>
            </div>
          </div>

          {/* Meta del cliente */}
          <div className="border-2 border-orange-500 rounded-xl p-4 mb-4 flex justify-between items-center bg-orange-50">
            <div>
              <div className="font-black text-orange-700 uppercase text-xs">Meta Solicitada por el Cliente ({req.tipoProducto === 'BOLSAS' ? 'MILLARES' : 'KILOS'})</div>
              <div className="text-[10px] text-orange-600 font-bold mt-1">Cantidad bruta a entregar al cliente según nota de pedido. Incluye merma de sellado.</div>
            </div>
            <div className="text-3xl font-black text-orange-600">{formatNum(req.cantidad)} {req.tipoProducto === 'BOLSAS' ? 'Millares' : 'KG'}</div>
          </div>

          {/* Especificaciones Finales */}
          <div className="border-2 border-gray-800 rounded-xl mb-4 overflow-hidden">
            <div className="bg-gray-800 text-white text-center py-2 text-[10px] font-black uppercase tracking-widest">Especificaciones Finales</div>
            <div className="grid grid-cols-4 divide-x divide-gray-300 text-center">
              {[['Ancho', req.ancho ? `${req.ancho} CM` : '—'],['Fuelles', req.fuelles ? `${req.fuelles} CM` : '0 CM'],['Largo', req.largo ? `${req.largo} CM` : '—'],['Micras', req.micras || '—']].map(([label,val])=>(
                <div key={label} className="p-3"><div className="text-[9px] font-black uppercase text-gray-500">{label}</div><div className="text-lg font-black text-orange-600">{val}</div></div>
              ))}
            </div>
          </div>

          {/* Parámetros de Extrusión */}
          <div className="border-2 border-gray-300 rounded-xl mb-3 overflow-hidden">
            <div className="bg-gray-100 text-center py-1.5 text-[10px] font-black uppercase tracking-widest border-b border-gray-300">Parámetros de Extrusión</div>
            <div className="p-3 grid grid-cols-3 gap-3 text-[9px]">
              <div className="flex gap-2"><span className="font-black uppercase">Operador:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">Cantidad KG:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">Color:</span><span className="font-black">{req.color || 'NATURAL'}</span></div>
              <div className="flex gap-2"><span className="font-black uppercase">Tratado:</span><span className="border-b border-gray-400 w-8"></span><span className="ml-2">1</span><span className="border-b border-gray-400 w-8 ml-1"></span><span className="ml-2">2</span></div>
              <div className="col-span-2"></div>
              <div className="flex gap-2"><span className="font-black uppercase">Motor Principal:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">Ventilador:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">Jalador:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="col-span-3 flex gap-2 items-center">
                <span className="font-black uppercase">Zonas:</span>
                {[1,2,3,4,5,6].map(z=><><span className="ml-2 font-bold">{z}</span><div className="border-b border-gray-400 w-10"></div></>)}
              </div>
              <div className="col-span-3 flex gap-2 items-center">
                <span className="font-black uppercase">Cabezal:</span>
                <span className="ml-2 font-bold">A</span><div className="border-b border-gray-400 w-16"></div>
                <span className="ml-2 font-bold">B</span><div className="border-b border-gray-400 w-16"></div>
              </div>
            </div>
          </div>

          {/* Impresión Flexográfica */}
          <div className="border-2 border-gray-300 rounded-xl mb-3 overflow-hidden">
            <div className="bg-gray-100 text-center py-1.5 text-[10px] font-black uppercase tracking-widest border-b border-gray-300">Impresión Flexográfica</div>
            <div className="p-3 grid grid-cols-3 gap-3 text-[9px]">
              <div className="flex gap-2"><span className="font-black uppercase">Operador:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">KG Recibidos:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">Temperatura:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">Motor Principal:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="col-span-2"></div>
              <div className="col-span-3 flex gap-2 items-center">
                <span className="font-black uppercase">Colores:</span>
                {[1,2,3,4,5,6].map(c=><><span className="ml-2 font-bold">{c}</span><div className="border-b border-gray-400 w-12"></div></>)}
              </div>
            </div>
          </div>

          {/* Sellado y Corte */}
          <div className="border-2 border-gray-300 rounded-xl mb-4 overflow-hidden">
            <div className="bg-gray-100 text-center py-1.5 text-[10px] font-black uppercase tracking-widest border-b border-gray-300">Sellado y Corte</div>
            <div className="p-3 grid grid-cols-2 gap-3 text-[9px]">
              <div className="flex gap-2"><span className="font-black uppercase">Operador:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">KG Recibidos:</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">Cant. Producida (KG):</span><div className="flex-1 border-b border-gray-400"></div></div>
              <div className="flex gap-2"><span className="font-black uppercase">Cant. Producida Millares:</span><div className="flex-1 border-b border-gray-400"></div></div>
            </div>
          </div>

          {/* Firmas */}
          <div className="border-t-2 border-gray-400 pt-3">
            <div className="text-[9px] font-black uppercase text-gray-600 mb-3">Espacio de Firmas y Responsables por Fase:</div>
            <div className="grid grid-cols-5 gap-2 text-center text-[8px]">
              {[['Resp. Extrusión','(Operador)'],['Resp. Impresión','(Operador)'],['Resp. Sellado','(Operador)'],['Control Calidad','(Inspector)'],['Supervisor','Planta']].map(([title,sub])=>(
                <div key={title} className="flex flex-col items-center gap-1">
                  <div className="border-b-2 border-black w-full h-6"></div>
                  <div className="font-black uppercase">{title}</div>
                  <div className="text-gray-500">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── CIERRE TOTAL DE OP → mueve a Terminados ──────────────────────────────
  // ── ENTREGA PARCIAL: mover KG a Terminados sin cerrar la OP ─────────
  const [showPartialModal, setShowPartialModal] = useState(null); // req
  const [partialKg, setPartialKg] = useState('');
  const [partialMillares, setPartialMillares] = useState('');
  const [catalogCatFilter, setCatalogCatFilter] = useState('TODAS');
  const [mermaOpFilter, setMermaOpFilter] = useState('TODAS');

  const handlePartialDelivery = async () => {
    if (!showPartialModal) return;
    const req = showPartialModal;
    const kgEntrega = parseNum(partialKg);
    const millEntrega = parseNum(partialMillares);
    if (kgEntrega <= 0) return setDialog({ title: 'Aviso', text: 'Ingrese los KG a entregar.', type: 'alert' });
    try {
      const fgId = `FG-${Date.now()}`;
      const fgEntry = {
        id: fgId, opId: req.id, reqId: req.id,
        cliente: req.client || 'N/A',
        tipoProducto: req.tipoProducto || 'BOLSAS',
        categoria: req.categoria || '',
        producto: req.desc || 'Producto',
        ancho: req.ancho || 0, largo: req.largo || 0, micras: req.micras || 0,
        color: req.color || 'NATURAL', tratamiento: req.tratamiento || 'LISO',
        kgProducidos: kgEntrega,
        millares: req.tipoProducto === 'TERMOENCOGIBLE' ? 0 : millEntrega,
        costoUnitario: 0,
        fechaFinalizacion: getTodayDate(),
        ubicacion: 'ALMACEN GENERAL',
        status: 'LISTO PARA ENTREGA',
        esEntregaParcial: true,
        observaciones: `ENTREGA PARCIAL — ${formatNum(kgEntrega)} KG`,
        timestamp: Date.now()
      };
      await setDoc(getDocRef('finishedGoodsInventory', fgId), fgEntry);
      // Registrar en OP que hubo entrega parcial
      const prevParciales = req.entregasParciales || [];
      await updateDoc(getDocRef('requirements', req.id), {
        entregasParciales: [...prevParciales, { fgId, kg: kgEntrega, millares: millEntrega, fecha: getTodayDate() }]
      });
      setShowPartialModal(null); setPartialKg(''); setPartialMillares('');
      setDialog({ title: '✅ Entrega Parcial Registrada', text: `Se movieron ${formatNum(kgEntrega)} KG a Terminados. La OP sigue abierta para producción adicional.`, type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: err.message, type: 'alert' });
    }
  };

  const handleCloseOP = (req) => {
    if (!req) return;
    setDialog({
      title: 'Cierre de OP ' + String(req.id).replace('OP-', '').padStart(5, '0'),
      text: 'Se cerrara la OP completa y el producto pasara a Inventario de Terminados. Esta accion no se puede deshacer. Continuar?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          const prod = req.production || {};
          const filterReal = (b) => b.operator !== 'ALMACÉN (DESPACHO)' && parseNum(b.producedKg) > 0;
          const selBatch = (prod.sellado?.batches||[]).filter(filterReal);
          const impBatch = (prod.impresion?.batches||[]).filter(filterReal);
          const extBatch = (prod.extrusion?.batches||[]).filter(filterReal);
          // KG finales = ÚLTIMA fase activa (cadena: ext→imp→sel)
          const lastBatches = selBatch.length>0 ? selBatch : impBatch.length>0 ? impBatch : extBatch;
          const totalKgProd = lastBatches.reduce((s, b) => s + parseNum(b.producedKg), 0);
          const totalMillares = selBatch.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)
            || impBatch.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)
            || extBatch.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0);

          // Marcar todas las fases abiertas como cerradas
          const updatedProd = { ...prod };
          ['extrusion', 'impresion', 'sellado'].forEach(phase => {
            if (updatedProd[phase] && !updatedProd[phase].isClosed) {
              updatedProd[phase] = { ...updatedProd[phase], isClosed: true };
            }
          });

          await updateDoc(getDocRef('requirements', req.id), {
            production: updatedProd,
            status: 'COMPLETADO',
            fechaCierre: getTodayDate(),
          });

          // No se crea entrada en Terminados — ya fue registrada por lote en handleSavePhaseDirectly
          // El reporte de producción (renderFiniquitoOP) lee directamente de req.production

          // ── Asiento contable: WIP → Productos Terminados ──
          // Calcular costo total de los WIP asociados a esta OP
          const wipAsociados = (wipInventory || []).filter(w => w.opId === req.id);
          const costoTotalWIP = wipAsociados.reduce((s, w) => s + (parseNum(w.costoPromedio) * parseNum(w.kgAsignados)), 0);
          if (costoTotalWIP > 0) {
            await registrarAsientoContable(null, {
              debito: '1.1.03.01.008',
              credito: '1.1.03.01.007',
              monto: costoTotalWIP,
              descripcion: `CIERRE OP — TRASLADO WIP A TERMINADOS — ${req.desc || req.id}`,
              referencia: req.id,
              fecha: getTodayDate(),
            });
          }

          setSelectedPhaseReqId(null);
          setDialog({
            title: 'OP Cerrada',
            text: 'La OP fue cerrada y movida a Inventario de Terminados correctamente.',
            type: 'alert'
          });
        } catch (err) {
          setDialog({ title: 'Error', text: err.message, type: 'alert' });
        }
      }
    });
  };

  // ── HELPER: Panel de insumos filtrado por requisiciones aprobadas ──────────
  const renderInsumosPhasePanel = (req, phase) => {
    if (!req || !phase) return null;
    const prod = req.production || {};

    // ── Total despachado por almacén para esta OP (TODAS las requisiciones aprobadas) ──
    const approved = (invRequisitions || []).filter(r =>
      r.opId === req.id && (r.status === 'APROBADA' || r.status === 'APROBADO')
    );
    const approvedItems = approved.flatMap(r => r.items || []);
    const groupedApproved = {};
    approvedItems.forEach(it => {
      if (it && it.id) {
        if (!groupedApproved[it.id]) groupedApproved[it.id] = 0;
        groupedApproved[it.id] += parseNum(it.qty);
      }
    });

    // ── Total ya CONSUMIDO en lotes ANTERIORES (todos las fases de esta OP) ──
    const consumidoAnteriores = {};
    const reqProdAll = req.production || {};
    ['extrusion','impresion','sellado'].forEach(ph => {
      (reqProdAll[ph]?.batches || []).forEach(b => {
        (b.insumos || []).forEach(ing => {
          if (!consumidoAnteriores[ing.id]) consumidoAnteriores[ing.id] = 0;
          consumidoAnteriores[ing.id] += parseNum(ing.qty);
        });
      });
    });

    // ── Disponible = despachado - consumido anteriores - lo que ya está en phaseForm actual ──
    const getDisponible = (id) => {
      const desp = parseNum(groupedApproved[id] || 0);
      const consAnt = parseNum(consumidoAnteriores[id] || 0);
      const consActual = (phaseForm.insumos || []).filter(ing => ing.id === id).reduce((s,ing)=>s+parseNum(ing.qty),0);
      return Math.max(0, desp - consAnt - consActual);
    };

    const approvedIds = Object.keys(groupedApproved);

    if (approvedIds.length === 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-[10px] font-black text-yellow-700 uppercase">Sin requisicion aprobada para esta OP</p>
          <p className="text-[9px] font-bold text-yellow-600 mt-1">Solicite insumos a almacen antes de registrar consumo</p>
        </div>
      );
    }

    // Calcular KG totales despachados y usados para merma automática
    const totalDespachado = approvedIds.reduce((s, id) => s + parseNum(groupedApproved[id]), 0);
    const totalConsumidoAntes = approvedIds.reduce((s, id) => s + parseNum(consumidoAnteriores[id]||0), 0);
    const totalUsadoActual = (phaseForm.insumos || []).reduce((s, ing) => s + parseNum(ing.qty), 0);
    const totalDisponible = Math.max(0, totalDespachado - totalConsumidoAntes - totalUsadoActual);
    const prodKg = parseNum(phaseForm.producedKg);
    const mermaAuto = totalUsadoActual > 0 ? Math.max(0, totalUsadoActual - prodKg) : 0;
    const mermaPorc = totalUsadoActual > 0 ? ((mermaAuto / totalUsadoActual) * 100).toFixed(1) : '0.0';

    return (
      <div>
        {/* ── PROGRESO GLOBAL DE LA OP ── */}
        <div className="bg-gray-800 text-white rounded-xl p-3 mb-3">
          <p className="text-[9px] font-black uppercase mb-2 text-orange-400">📊 Progreso de Consumo — OP {req.id}</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><div className="text-[8px] text-gray-400">Total Despachado</div><div className="font-black text-blue-300">{formatNum(totalDespachado)} KG</div></div>
            <div><div className="text-[8px] text-gray-400">Ya Consumido</div><div className="font-black text-orange-300">{formatNum(totalConsumidoAntes)} KG</div></div>
            <div><div className="text-[8px] text-gray-400">Este Lote</div><div className="font-black text-yellow-300">{formatNum(totalUsadoActual)} KG</div></div>
            <div><div className="text-[8px] text-gray-400">Disponible</div><div className={`font-black ${totalDisponible<=0?'text-red-400':'text-green-300'}`}>{formatNum(totalDisponible)} KG</div></div>
          </div>
          {totalDespachado > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className="bg-orange-400 h-1.5 rounded-full" style={{width:`${Math.min(100,((totalConsumidoAntes+totalUsadoActual)/totalDespachado)*100)}%`}}></div>
              </div>
              <div className="text-[8px] text-gray-400 text-right mt-0.5">{(((totalConsumidoAntes+totalUsadoActual)/totalDespachado)*100).toFixed(1)}% consumido</div>
            </div>
          )}
        </div>

        {/* Banner por material */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
          <p className="text-[9px] font-black text-blue-700 uppercase mb-2">📦 Materiales — Despacho vs Consumo acumulado:</p>
          {approvedIds.map(id => {
            const invItem = (inventory || []).find(i => i && i.id === id);
            const desp = parseNum(groupedApproved[id]);
            const consAnt = parseNum(consumidoAnteriores[id]||0);
            const consActual = (phaseForm.insumos||[]).filter(ing=>ing.id===id).reduce((s,ing)=>s+parseNum(ing.qty),0);
            const disp = Math.max(0, desp - consAnt - consActual);
            const pctUsado = desp > 0 ? ((consAnt+consActual)/desp*100) : 0;
            return (
              <div key={id} className="mb-2 bg-white rounded px-2 py-1.5 border border-blue-100">
                <div className="flex justify-between items-center text-[9px] font-bold text-blue-600 mb-1">
                  <span className="font-black text-gray-800">{invItem ? invItem.desc : id}</span>
                  <div className="flex gap-2 text-right text-[8px]">
                    <span className="text-blue-700">Desp: {formatNum(desp)}</span>
                    {consAnt>0&&<span className="text-orange-600">Ant: {formatNum(consAnt)}</span>}
                    {consActual>0&&<span className="text-yellow-600">Este: {formatNum(consActual)}</span>}
                    <span className={disp<=0?'text-red-600 font-black':'text-green-600 font-black'}>Disp: {formatNum(disp)} {disp<=0?'⚠':''}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className={`h-1 rounded-full ${pctUsado>90?'bg-red-500':pctUsado>70?'bg-orange-400':'bg-green-500'}`} style={{width:`${Math.min(100,pctUsado)}%`}}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selector de insumo */}
        <p className="text-[9px] font-black text-gray-600 uppercase mb-1">Registrar KG Usados en Este Lote:</p>
        {phaseIngId && (() => {
          const disponible = getDisponible(phaseIngId);
          const consAnt = parseNum(consumidoAnteriores[phaseIngId]||0);
          const maxDesp = parseNum(groupedApproved[phaseIngId]||0);
          return (
            <div className="mb-2 bg-orange-50 border border-orange-200 rounded-xl p-2 flex gap-3 text-[9px] font-bold flex-wrap">
              <span>Total: <span className="font-black text-blue-700">{formatNum(maxDesp)} KG</span></span>
              {consAnt>0&&<span>Lotes ant.: <span className="font-black text-orange-600">-{formatNum(consAnt)} KG</span></span>}
              <span className={disponible<=0?'text-red-600 font-black':'text-green-700 font-black'}>
                Para este lote: <span className="font-black">{formatNum(disponible)} KG</span> {disponible<=0?'⚠ AGOTADO':'✓'}
              </span>
            </div>
          );
        })()}
        <div className="flex gap-2 mb-3">
          <select value={phaseIngId} onChange={e => setPhaseIngId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg p-2 text-xs font-bold outline-none">
            <option value="">Seleccione material...</option>
            {approvedIds.map(id => {
              const invItem = (inventory || []).find(i => i && i.id === id);
              if (!invItem) return null;
              const disp = getDisponible(id);
              return (
                <option key={id} value={id} disabled={disp <= 0}>
                  {id} - {invItem.desc} | Disponible: {formatNum(disp)} KG {disp<=0?'(AGOTADO)':''}
                </option>
              );
            })}
          </select>
          <input
            type="number" step="0.01" value={phaseIngQty}
            onChange={e => setPhaseIngQty(e.target.value)}
            className="w-24 border border-gray-200 rounded-lg p-2 text-xs font-bold text-center outline-none"
            placeholder="KG usados"
          />
          <button
            onClick={() => {
              if (!phaseIngId || !phaseIngQty) return;
              const maxDesp = parseNum(groupedApproved[phaseIngId] || 0);
              const consAnteriores = approvedIds.includes(phaseIngId)
                ? (['extrusion','impresion','sellado'].reduce((s,ph)=>{
                    const phProd = req.production || {};
                    return s + (phProd[ph]?.batches||[]).reduce((ss,b)=>ss+(b.insumos||[]).filter(i=>i.id===phaseIngId).reduce((sss,i)=>sss+parseNum(i.qty),0),0);
                  },0))
                : 0;
              const yaUsado = (phaseForm.insumos || []).filter(ing => ing.id === phaseIngId).reduce((s, ing) => s + parseNum(ing.qty), 0);
              const disponible = Math.max(0, maxDesp - consAnteriores - yaUsado);
              const kgIngresado = parseFloat(phaseIngQty);
              if (kgIngresado > disponible + 0.001) {
                return setDialog({ title: 'Aviso', text: `Disponible para este lote: ${formatNum(disponible)} KG.\nDespachado total: ${formatNum(maxDesp)} KG.\nYa consumido en lotes anteriores: ${formatNum(consAnteriores)} KG.`, type: 'alert' });
              }
              const newIns = [...(phaseForm.insumos || []), { id: phaseIngId, qty: kgIngresado }];
              const nuevoTotalUsado = newIns.reduce((s, ing) => s + parseNum(ing.qty), 0);
              const prodKgLocal = parseNum(phaseForm.producedKg);
              const nuevaMerma = prodKgLocal > 0 ? Math.max(0, nuevoTotalUsado - prodKgLocal) : 0;
              setPhaseForm({ ...phaseForm, insumos: newIns, mermaKg: nuevaMerma > 0 ? nuevaMerma.toFixed(2) : phaseForm.mermaKg });
              setPhaseIngId(''); setPhaseIngQty('');
            }}
            className="bg-orange-500 text-white px-3 py-2 rounded-lg text-xs font-black hover:bg-orange-600"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Lista insumos usados */}
        {(phaseForm.insumos || []).length > 0 && (
          <div className="mb-3">
            {(phaseForm.insumos || []).map((ins, i) => {
              const invItem = (inventory || []).find(iv => iv.id === ins.id);
              return (
                <div key={i} className="flex justify-between items-center bg-green-50 p-2 rounded-lg border border-green-200 mb-1">
                  <span className="text-xs font-black text-green-700">{invItem?.desc || ins.id}</span>
                  <span className="text-xs font-black text-green-800">{formatNum(ins.qty)} KG usados</span>
                  <button onClick={() => {
                    const nuevoIns = (phaseForm.insumos || []).filter((_, j) => j !== i);
                    const nuevoTotal = nuevoIns.reduce((s, ing) => s + parseNum(ing.qty), 0);
                    const nuevaMerma = prodKg > 0 ? Math.max(0, nuevoTotal - prodKg) : 0;
                    setPhaseForm({ ...phaseForm, insumos: nuevoIns, mermaKg: nuevaMerma > 0 ? nuevaMerma.toFixed(2) : '' });
                  }} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                </div>
              );
            })}
          </div>
        )}

        {/* Indicadores merma automática */}
        {totalUsadoActual > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <span className="text-[8px] font-black text-blue-600 uppercase block">KG Usados</span>
              <span className="text-sm font-black text-blue-700">{formatNum(totalUsadoActual)}</span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
              <span className="text-[8px] font-black text-red-600 uppercase block">Merma Auto</span>
              <span className="text-sm font-black text-red-700">{formatNum(mermaAuto)} KG ({mermaPorc}%)</span>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
              <span className="text-[8px] font-black text-orange-600 uppercase block">Disponible WIP</span>
              <span className="text-sm font-black text-orange-700">{formatNum(totalDisponible)} KG</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MÓDULO FÓRMULAS / RECETAS DE PRODUCCIÓN
  // ============================================================================
  const handleSaveFormula = async (e) => {
    e.preventDefault();
    if (!formulaForm.categoria.trim()) return setDialog({title:'Aviso', text:'Ingrese el nombre de la categoría.', type:'alert'});
    if ((formulaForm.ingredientes||[]).length === 0) return setDialog({title:'Aviso', text:'Agregue al menos un material a la fórmula.', type:'alert'});
    const activeFases = formulaForm.fases || { extrusion: true, impresion: false, sellado: false };
    if (!activeFases.extrusion && !activeFases.impresion && !activeFases.sellado) return setDialog({title:'Aviso', text:'Seleccione al menos una fase de producción.', type:'alert'});
    const totalPct = (formulaForm.ingredientes||[]).reduce((s,i)=>s+parseNum(i.pct),0);
    if (Math.abs(totalPct - 100) > 0.1) return setDialog({title:'Aviso', text:`Los porcentajes suman ${totalPct.toFixed(1)}%. Deben sumar 100%.`, type:'alert'});
    const id = editingFormulaId || `FORM-${formulaForm.categoria.toUpperCase().replace(/\s+/g,'-')}-${Date.now()}`;
    try {
      await setDoc(getDocRef('formulas', id), { ...formulaForm, id, categoria: formulaForm.categoria.toUpperCase(), fases: activeFases, timestamp: Date.now(), user: appUser?.name });
      setFormulaForm({ categoria: '', tipoProducto: 'BOLSAS', fases: { extrusion: true, impresion: false, sellado: false }, ingredientes: [] });
      setEditingFormulaId(null); setShowFormulaPanel(false);
      setDialog({title:'✅ Fórmula guardada', text:'La receta fue registrada exitosamente.', type:'alert'});
    } catch(err) { setDialog({title:'Error', text:err.message, type:'alert'}); }
  };

  const handleDeleteFormula = (id) => {
    setDialog({title:'Eliminar Fórmula', text:'¿Desea eliminar esta receta de producción?', type:'confirm',
      onConfirm: async () => { await deleteDoc(getDocRef('formulas', id)); }
    });
  };

  // Aplica la fórmula a una OP: genera lista de insumos pre-cargada para la requisición
  const applyFormulaToPhase = (formula, requestedKg) => {
    if (!formula || !formula.ingredientes) return [];
    return formula.ingredientes.map(ing => {
      const invItem = (inventory||[]).find(i=>i.id===ing.id);
      const qty = (parseNum(ing.pct)/100) * parseNum(requestedKg);
      return { id: ing.id, qty: parseFloat(qty.toFixed(2)), desc: invItem?.desc || ing.id, pct: ing.pct };
    }).filter(i => i.qty > 0);
  };

  const renderFormulasModule = () => {
    const totalPctActual = (formulaForm.ingredientes||[]).reduce((s,i)=>s+parseNum(i.pct),0);
    const pctRestante = Math.max(0, 100 - totalPctActual);
    // Filtrar y agrupar fórmulas
    const formulasFiltradas = (formulas||[]).filter(f => {
      const tipoOk = formulaFilter === 'TODOS' || (f.tipoProducto||'BOLSAS') === formulaFilter;
      const searchOk = !formulaSearch || (f.categoria||'').toUpperCase().includes(formulaSearch);
      return tipoOk && searchOk;
    });
    const grouped = {};
    formulasFiltradas.forEach(f => { const t=f.tipoProducto||'BOLSAS'; if(!grouped[t])grouped[t]=[]; grouped[t].push(f); });

    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-black uppercase flex items-center gap-3">
                <Beaker className="text-purple-600" size={24}/> Fórmulas / Recetas de Producción
              </h2>
              <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">Defina la composición de materias primas por categoría de producto</p>
            </div>
            <button onClick={()=>{setShowFormulaPanel(!showFormulaPanel);setFormulaForm({categoria:'',tipoProducto:'BOLSAS',ingredientes:[]});setEditingFormulaId(null);}}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md flex items-center gap-2 transition-all ${showFormulaPanel?'bg-gray-200 text-gray-700':'bg-purple-600 text-white hover:bg-purple-700'}`}>
              {showFormulaPanel ? <><X size={16}/> CANCELAR</> : <><Plus size={16}/> NUEVA FÓRMULA</>}
            </button>
          </div>

          {/* Formulario nueva/editar fórmula */}
          {showFormulaPanel && (
            <div className="p-8 bg-purple-50/40 border-b border-purple-100">
              <form onSubmit={handleSaveFormula} className="bg-white rounded-3xl border border-purple-100 shadow-sm p-8 space-y-6">
                <h3 className="text-sm font-black uppercase text-black border-b border-gray-100 pb-3">{editingFormulaId ? 'Editar Fórmula' : 'Nueva Fórmula'}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Categoría / Tipo de Producto *</label>
                    <input type="text" required value={formulaForm.categoria}
                      onChange={e=>setFormulaForm({...formulaForm, categoria: e.target.value.toUpperCase()})}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-sm uppercase outline-none focus:border-purple-500"
                      placeholder="EJ: PAÑAL, EMBUTIDO, BOLSAS DE POLLO..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Tipo de Producto</label>
                    <select value={formulaForm.tipoProducto} onChange={e=>setFormulaForm({...formulaForm,tipoProducto:e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl p-3 font-black text-xs uppercase outline-none focus:border-purple-500 bg-white">
                      <option value="BOLSAS">BOLSAS / EMPAQUES</option>
                      <option value="TERMOENCOGIBLE">TERMOENCOGIBLE / TUBULAR</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                  </div>
                </div>

                {/* Dimensiones estándar de la categoría */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">📐 Dimensiones Estándar (para auto-llenar OPs)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[['ancho','Ancho (cm)'],['fuelles','Fuelle (cm)'],['largo','Largo (cm)'],['micras','Micras']].map(([key,label])=>(
                      <div key={key}>
                        <label className="text-[9px] font-black text-gray-500 uppercase block mb-1">{label}</label>
                        <input type="number" step="0.001" value={formulaForm[key]||''}
                          onChange={e=>setFormulaForm({...formulaForm,[key]:e.target.value})}
                          className="w-full border border-purple-200 rounded-xl p-2 text-sm font-black text-center outline-none bg-purple-50 text-purple-700 focus:border-purple-500" placeholder="0" />
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-purple-500 font-bold mt-1">Al seleccionar esta categoría en una nueva OP, se auto-completarán las dimensiones.</p>
                </div>

                {/* Fases activas */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Fases del Proceso</label>
                  <div className="flex gap-3 flex-wrap">
                    {[['extrusion','🔵 Extrusión'],['impresion','🟣 Impresión'],['sellado','🟢 Sellado / Corte']].map(([key,label])=>(
                      <button key={key} type="button"
                        onClick={()=>setFormulaForm({...formulaForm, fases:{...(formulaForm.fases||{}), [key]:!(formulaForm.fases?.[key])}})}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex items-center gap-2 ${(formulaForm.fases?.[key]) ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'}`}>
                        {(formulaForm.fases?.[key]) ? '✓' : '○'} {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold mt-1">Seleccione las fases requeridas para producir esta categoría</p>
                </div>

                {/* Ingredientes */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Materias Primas de la Fórmula</label>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${Math.abs(totalPctActual-100)<0.1?'bg-green-100 text-green-700':'totalPctActual>100?\'bg-red-100 text-red-700\':\'bg-yellow-100 text-yellow-700\''}`}>
                      Total: {totalPctActual.toFixed(1)}% {Math.abs(totalPctActual-100)<0.1?'✓':`(falta ${pctRestante.toFixed(1)}%)`}
                    </span>
                  </div>

                  {/* Selector de ingrediente */}
                  <div className="flex gap-2 mb-4">
                    <select value={formulaIngId} onChange={e=>setFormulaIngId(e.target.value)}
                      className="flex-1 border-2 border-gray-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-purple-500 bg-white">
                      <option value="">Seleccione materia prima...</option>
                      {(inventory||[]).filter(i=>!formulaForm.ingredientes.find(fi=>fi.id===i.id)).map(i=>(
                        <option key={i.id} value={i.id}>{i.id} — {i.desc} ({i.category})</option>
                      ))}
                    </select>
                    <input type="number" step="0.1" min="0.1" max="100" value={formulaIngPct}
                      onChange={e=>setFormulaIngPct(e.target.value)}
                      className="w-28 border-2 border-gray-200 rounded-xl p-3 text-sm font-black text-center outline-none focus:border-purple-500"
                      placeholder="%" />
                    <button type="button" onClick={()=>{
                      if(!formulaIngId||!formulaIngPct) return;
                      const invItem=(inventory||[]).find(i=>i.id===formulaIngId);
                      const nuevoTotal=totalPctActual+parseNum(formulaIngPct);
                      if(nuevoTotal>100.1) return setDialog({title:'Aviso',text:`Supera 100%. Máximo disponible: ${pctRestante.toFixed(1)}%`,type:'alert'});
                      setFormulaForm({...formulaForm, ingredientes:[...(formulaForm.ingredientes||[]),{id:formulaIngId,pct:parseNum(formulaIngPct),desc:invItem?.desc||formulaIngId,category:invItem?.category||''}]});
                      setFormulaIngId('');setFormulaIngPct('');
                    }} className="bg-purple-600 text-white px-4 py-3 rounded-xl font-black hover:bg-purple-700 flex items-center"><Plus size={16}/></button>
                  </div>

                  {/* Lista ingredientes */}
                  {(formulaForm.ingredientes||[]).length > 0 ? (
                    <div className="space-y-2">
                      {(formulaForm.ingredientes||[]).map((ing,i)=>(
                        <div key={i} className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl p-3">
                          <div className="flex-1">
                            <span className="font-black text-purple-700 text-xs">{ing.id}</span>
                            <span className="text-[10px] text-gray-500 ml-2">{ing.desc}</span>
                            {ing.category && <span className="text-[9px] font-bold text-gray-400 ml-2">({ing.category})</span>}
                          </div>
                          {/* Editar porcentaje inline */}
                          <input type="number" step="0.1" value={ing.pct}
                            onChange={e=>{const newIngs=[...formulaForm.ingredientes];newIngs[i]={...newIngs[i],pct:parseNum(e.target.value)};setFormulaForm({...formulaForm,ingredientes:newIngs});}}
                            className="w-20 border border-purple-300 rounded-lg p-1.5 text-sm font-black text-center bg-white outline-none focus:border-purple-500 text-purple-700" />
                          <span className="text-sm font-black text-purple-600">%</span>
                          {/* Barra visual */}
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{width:`${Math.min(100,ing.pct)}%`}}></div>
                          </div>
                          <button type="button" onClick={()=>setFormulaForm({...formulaForm,ingredientes:formulaForm.ingredientes.filter((_,j)=>j!==i)})}
                            className="text-red-400 hover:text-red-600 p-1"><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-xs font-bold border-2 border-dashed border-gray-200 rounded-xl">
                      Seleccione una materia prima y su % para agregarla
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={()=>{setShowFormulaPanel(false);setEditingFormulaId(null);setFormulaForm({categoria:'',tipoProducto:'BOLSAS',ingredientes:[]});}}
                    className="bg-gray-200 text-gray-700 px-8 py-3 rounded-2xl font-black text-xs uppercase hover:bg-gray-300">Cancelar</button>
                  <button type="submit" className="bg-purple-600 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-purple-700 flex items-center gap-2">
                    <CheckCircle2 size={14}/> GUARDAR FÓRMULA
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla de fórmulas — visualización mejorada */}
          <div className="p-6">
            {/* Filtro por categoría */}
            {(formulas||[]).length > 0 && (
              <div className="mb-5 flex gap-3 flex-wrap items-center">
                <span className="text-[10px] font-black text-gray-500 uppercase">Filtrar:</span>
                {['TODOS', ...[...new Set((formulas||[]).map(f=>f.tipoProducto||'BOLSAS'))]].map(tipo => (
                  <button key={tipo} onClick={()=>setFormulaFilter(tipo)} 
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${formulaFilter===tipo?'bg-purple-600 text-white border-purple-600':'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}>
                    {tipo}
                  </button>
                ))}
                <div className="ml-auto">
                  <input type="text" value={formulaSearch} onChange={e=>setFormulaSearch(e.target.value.toUpperCase())}
                    placeholder="Buscar categoría..." 
                    className="border-2 border-gray-200 rounded-xl px-4 py-1.5 text-[10px] font-bold outline-none focus:border-purple-500 w-48" />
                </div>
              </div>
            )}
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Beaker size={48} className="mx-auto mb-4 opacity-30"/>
                <p className="font-black text-xs uppercase">No hay fórmulas registradas</p>
                <p className="text-xs mt-2">Haga clic en "Nueva Fórmula" para definir una receta por categoría</p>
              </div>
            ) : Object.entries(grouped).map(([tipo, fList]) => (
              <div key={tipo} className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${tipo==='BOLSAS'?'bg-blue-100 text-blue-700':tipo==='TERMOENCOGIBLE'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>{tipo}</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-[9px] font-bold text-gray-400">{fList.length} fórmula{fList.length!==1?'s':''}</span>
                </div>
                {/* Vista de tabla tipo reporte */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-800 text-white uppercase font-black text-[9px]">
                        <th className="p-3 text-left border-r border-gray-700">Categoría</th>
                        <th className="p-3 text-center border-r border-gray-700">Dimensiones Estándar</th>
                        <th className="p-3 text-center border-r border-gray-700">Fases</th>
                        <th className="p-3 text-left border-r border-gray-700">Composición de Materias Primas</th>
                        <th className="p-3 text-center border-r border-gray-700">Balance</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fList.map((formula, fi) => {
                        const totalPct = (formula.ingredientes||[]).reduce((s,i)=>s+parseNum(i.pct),0);
                        const balanceOk = Math.abs(totalPct-100) < 0.1;
                        const hasDims = formula.ancho || formula.largo || formula.micras;
                        const pesoMill = hasDims ? ((parseNum(formula.ancho)+parseNum(formula.fuelles||0))*parseNum(formula.largo)*parseNum(formula.micras)) : 0;
                        return (
                          <tr key={formula.id} className={`hover:bg-purple-50/30 transition-all ${fi%2===0?'bg-white':'bg-gray-50/50'}`}>
                            {/* Categoría */}
                            <td className="p-4 border-r border-gray-100">
                              <div className="font-black text-purple-700 text-sm uppercase">{formula.categoria}</div>
                              <div className="text-[9px] text-gray-400 font-bold mt-0.5">
                                {formula.tipoProducto || 'BOLSAS'}
                              </div>
                            </td>
                            {/* Dimensiones */}
                            <td className="p-4 border-r border-gray-100 text-center">
                              {hasDims ? (
                                <div className="space-y-0.5">
                                  <div className="flex gap-2 justify-center flex-wrap text-[9px] font-bold">
                                    {formula.ancho && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">A: {formula.ancho} cm</span>}
                                    {formula.fuelles && parseNum(formula.fuelles)>0 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">F: {formula.fuelles} cm</span>}
                                    {formula.largo && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg">L: {formula.largo} cm</span>}
                                    {formula.micras && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">M: {formula.micras}</span>}
                                  </div>
                                  {pesoMill > 0 && (
                                    <div className="text-[8px] text-orange-600 font-black mt-1">
                                      ⚖ {formatNum(pesoMill)} KG/Mill.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-300 font-bold">Sin dimensiones</span>
                              )}
                            </td>
                            {/* Fases */}
                            <td className="p-4 border-r border-gray-100 text-center">
                              <div className="flex flex-col gap-1 items-center">
                                {[['extrusion','Ext.','bg-blue-100 text-blue-700'],['impresion','Imp.','bg-purple-100 text-purple-700'],['sellado','Sel.','bg-green-100 text-green-700']].map(([key,label,cls])=>
                                  (formula.fases?.[key] || (!formula.fases && key==='extrusion')) ? (
                                    <span key={key} className={`px-2 py-0.5 rounded text-[8px] font-black ${cls}`}>{label}</span>
                                  ) : null
                                )}
                              </div>
                            </td>
                            {/* Composición */}
                            <td className="p-4 border-r border-gray-100">
                              <div className="space-y-1.5">
                                {(formula.ingredientes||[]).map((ing,i)=>(
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="font-black text-gray-700 w-20 text-[9px]">{ing.id}</span>
                                    <span className="text-[9px] text-gray-500 flex-1">{ing.desc||''}</span>
                                    <span className="font-black text-purple-700 text-[10px] w-10 text-right">{ing.pct}%</span>
                                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                                      <div className="bg-purple-500 h-1.5 rounded-full" style={{width:`${ing.pct}%`}}></div>
                                    </div>
                                  </div>
                                ))}
                                {(formula.ingredientes||[]).length===0 && <span className="text-[9px] text-gray-300">Sin ingredientes</span>}
                              </div>
                            </td>
                            {/* Balance */}
                            <td className="p-4 border-r border-gray-100 text-center">
                              <div className={`text-sm font-black ${balanceOk?'text-green-600':'text-red-600'}`}>{totalPct.toFixed(1)}%</div>
                              <div className={`text-[8px] font-bold ${balanceOk?'text-green-500':'text-red-500'}`}>{balanceOk?'✓ OK':'✗ Revisar'}</div>
                            </td>
                            {/* Acciones */}
                            <td className="p-4 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <button onClick={()=>{setEditingFormulaId(formula.id);setFormulaForm({categoria:formula.categoria,tipoProducto:formula.tipoProducto||'BOLSAS',ancho:formula.ancho||'',fuelles:formula.fuelles||'',largo:formula.largo||'',micras:formula.micras||'',fases:formula.fases||{extrusion:true},ingredientes:formula.ingredientes||[]});setShowFormulaPanel(true);window.scrollTo({top:0,behavior:'smooth'});}}
                                  className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-500 hover:text-white transition-all" title="Editar"><Edit size={13}/></button>
                                <button onClick={()=>requireAdminPassword(()=>handleDeleteFormula(formula.id),'Eliminar fórmula')}
                                  className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Eliminar"><Trash2 size={13}/></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderProduccionModule = () => {
    // ── VER ORDEN DE TRABAJO ─────────────────────────────────────────
    if (showOrdenTrabajo) {
      const req = requirements.find(r => r.id === showOrdenTrabajo);
      return renderOrdenTrabajo(req);
    }

    // ── VER FINIQUITO DE UNA OP ───────────────────────────────────────
    if (showFiniquitoOP) {
      const req = requirements.find(r => r.id === showFiniquitoOP);
      return renderFiniquitoOP(req);
    }

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
              {projection.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-bold text-xs uppercase">No hay materia prima en el inventario</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 border-b-2 border-gray-200">
                      <tr className="uppercase font-black text-[10px] tracking-widest text-gray-600">
                        <th className="py-3 px-4 border-r">Código / Material</th>
                        <th className="py-3 px-4 border-r text-center">Stock Actual</th>
                        <th className="py-3 px-4 border-r text-center">Comprometido</th>
                        <th className="py-3 px-4 border-r text-center">Disponible Real</th>
                        <th className="py-3 px-4 border-r text-center">Consumo/Día</th>
                        <th className="py-3 px-4 border-r text-center">Días Cobertura</th>
                        <th className="py-3 px-4 border-r text-center">Sugerir Compra</th>
                        <th className="py-3 px-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projection.map(mp => (
                        <tr key={mp.id} className={`hover:bg-gray-50 transition-colors ${mp.isCritical ? 'bg-red-50/50' : ''}`}>
                          <td className="py-3 px-4 border-r font-black text-orange-600">{mp.id}<br/><span className="text-[9px] font-bold text-gray-500 uppercase">{mp.desc}</span></td>
                          <td className="py-3 px-4 border-r text-center font-black text-blue-600">{formatNum(mp.stock)}</td>
                          <td className="py-3 px-4 border-r text-center font-bold text-red-400">{formatNum(mp.committedStock)}</td>
                          <td className={`py-3 px-4 border-r text-center font-black ${mp.availableReal < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatNum(mp.availableReal)}</td>
                          <td className="py-3 px-4 border-r text-center font-bold text-gray-600">{formatNum(mp.dailyAvg)}</td>
                          <td className={`py-3 px-4 border-r text-center font-black text-lg ${mp.daysRemaining <= 30 ? 'text-red-600' : 'text-green-600'}`}>{mp.daysRemaining === 999 ? '∞' : Math.round(mp.daysRemaining)}</td>
                          <td className="py-3 px-4 border-r text-center font-black">{mp.suggestOrder > 0 ? `${formatNum(mp.suggestOrder)} kg` : '—'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${mp.isCritical ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{mp.isCritical ? '⚠ CRÍTICO' : '✓ OK'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Requisiciones pendientes de almacén */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-200 bg-blue-50 flex justify-between items-center">
              <h2 className="text-base font-black text-blue-800 uppercase flex items-center gap-2"><FileText size={18} className="text-blue-600"/> Requisiciones de Materiales Pendientes</h2>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-xl font-black text-xs">{(invRequisitions||[]).filter(r=>r.status==='PENDIENTE').length} PENDIENTES</span>
            </div>
            <div className="p-5">
              {(invRequisitions||[]).filter(r=>r.status==='PENDIENTE').length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-bold text-xs uppercase">No hay requisiciones pendientes</div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr className="uppercase font-black text-[10px] tracking-widest text-gray-600">
                      <th className="py-2 px-4 border-r">ID</th><th className="py-2 px-4 border-r">Fecha</th><th className="py-2 px-4 border-r">OP</th><th className="py-2 px-4 border-r">Materiales</th><th className="py-2 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(invRequisitions||[]).filter(r=>r.status==='PENDIENTE').map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border-r font-black text-orange-600 text-[10px]">{String(req.id).substring(0,12)}</td>
                        <td className="py-2 px-4 border-r font-bold">{req.date}</td>
                        <td className="py-2 px-4 border-r font-bold text-blue-600">{req.opId || '—'}</td>
                        <td className="py-2 px-4 border-r">{(req.items||[]).map((it,i)=><div key={i} className="text-[9px] font-bold">{it.id}: <span className="text-orange-600">{formatNum(it.qty)} kg</span></div>)}</td>
                        <td className="py-2 px-4 text-center"><button onClick={() => setReqToApprove(req)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-green-600">Aprobar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Modal de aprobación */}
          {reqToApprove && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-t-8 border-green-500">
                <h3 className="text-lg font-black uppercase mb-2">Aprobar Requisición</h3>
                <p className="text-xs font-bold text-gray-500 mb-4">OP: <span className="text-orange-600">{reqToApprove.opId}</span></p>
                <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                  {(reqToApprove.items||[]).map((it,i)=>{
                    const invItem = (inventory||[]).find(inv=>inv.id===it.id);
                    const ok = invItem && invItem.stock >= parseNum(it.qty);
                    return <div key={i} className={`text-xs font-bold flex justify-between ${ok?'text-green-700':'text-red-600'}`}><span>{it.id} - {invItem?.desc||it.id}</span><span>{formatNum(it.qty)} kg {ok?'✓':'⚠ Sin stock'}</span></div>;
                  })}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setReqToApprove(null)} className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-300">Cancelar</button>
                  <button onClick={async () => {
                    try {
                      const fbBatch = writeBatch(db);
                      for (let item of (reqToApprove.items||[])) {
                        const invItem = (inventory||[]).find(i=>i.id===item.id);
                        if (invItem) {
                          fbBatch.update(getDocRef('inventory', invItem.id), { stock: (invItem.stock||0) - parseNum(item.qty) });
                          const movId = `REQ-${Date.now()}-${item.id}`;
                          fbBatch.set(getDocRef('inventoryMovements', movId), { id: movId, date: getTodayDate(), itemId: item.id, itemName: invItem.desc, type: 'SALIDA', qty: parseNum(item.qty), cost: invItem.cost, totalValue: parseNum(item.qty)*invItem.cost, reference: reqToApprove.id, notes: `REQUISICIÓN PLANTA OP:${reqToApprove.opId||''}`, timestamp: Date.now(), user: appUser?.name });
                        }
                      }
                      fbBatch.update(getDocRef('inventoryRequisitions', reqToApprove.id), { status: 'APROBADA', approvedBy: appUser?.name, approvedAt: getTodayDate() });
                      await fbBatch.commit();
                      setReqToApprove(null);
                      setDialog({ title: 'Éxito', text: 'Requisición aprobada y stock descontado.', type: 'alert' });
                    } catch(e) { setDialog({ title: 'Error', text: e.message, type: 'alert' }); }
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
            <div id="pdf-content" className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex justify-between p-6 border-b border-gray-200 no-pdf">
                <button onClick={() => setViewingPO(null)} className="bg-gray-100 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-gray-200">← Volver</button>
                <div className="flex gap-2">
                  <button onClick={() => handleExportPDF(`OC_${viewingPO.id}`, false)} className="bg-black text-white px-6 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2"><Printer size={16}/> Imprimir</button>
                  {viewingPO.status === 'PENDIENTE' && <button onClick={() => handleUpdatePOStatus(viewingPO.id, 'RECIBIDA')} className="bg-green-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-green-700">MARCAR RECIBIDA</button>}
                  <button onClick={() => handleDeletePO(viewingPO.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase hover:bg-red-600"><Trash2 size={14}/></button>
                </div>
              </div>
              <div className="p-8">
                <div className="hidden pdf-header mb-6"><ReportHeader /></div>
                <div className="text-center my-4"><span className="text-2xl font-black uppercase border-b-4 border-orange-500 pb-2">ORDEN DE COMPRA N° {viewingPO.id}</span></div>
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm font-bold uppercase">
                  <div><p>PROVEEDOR: {viewingPO.provider}</p><p>FECHA: {viewingPO.date}</p></div>
                  <div className="text-right"><p>ESTADO: <span className={viewingPO.status==='RECIBIDA'?'text-green-600':'text-yellow-600'}>{viewingPO.status}</span></p><p>SOLICITADO: {viewingPO.user}</p></div>
                </div>
                <table className="w-full border-collapse border-2 border-black mb-6 text-xs">
                  <thead className="bg-gray-100"><tr><th className="p-3 border border-black text-left">Código</th><th className="p-3 border border-black">Material</th><th className="p-3 border border-black text-center">Stock</th><th className="p-3 border border-black text-center">Cantidad</th><th className="p-3 border border-black text-right">Costo U.</th><th className="p-3 border border-black text-right">Total</th></tr></thead>
                  <tbody>{(viewingPO.items||[]).map((item,i)=>(<tr key={i}><td className="p-3 border border-black font-black text-orange-600">{item.productCode}</td><td className="p-3 border border-black">{item.productName}</td><td className="p-3 border border-black text-center">{formatNum(item.currentStock)}</td><td className="p-3 border border-black text-center font-black">{formatNum(item.suggestedQty)}</td><td className="p-3 border border-black text-right">${formatNum(item.unitCost)}</td><td className="p-3 border border-black text-right font-black">${formatNum(item.suggestedQty*item.unitCost)}</td></tr>))}</tbody>
                  <tfoot className="bg-gray-100 font-black"><tr><td colSpan="5" className="p-3 border border-black text-right">SUBTOTAL EST.:</td><td className="p-3 border border-black text-right text-orange-600">${formatNum(viewingPO.subtotal)}</td></tr></tfoot>
                </table>
                {viewingPO.notes && <div className="border-2 border-black p-4 rounded-xl"><p className="font-black text-xs uppercase">NOTAS: {viewingPO.notes}</p></div>}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200 bg-blue-50 flex justify-between items-center">
                <div><h2 className="text-xl font-black text-blue-800 uppercase flex items-center gap-3"><ShoppingCart className="text-blue-600" size={24}/> Órdenes de Compra</h2></div>
                <button onClick={handleGeneratePurchaseOrder} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 flex items-center gap-2"><Plus size={16}/> NUEVA ORDEN</button>
              </div>
              <div className="p-6">
                {purchaseOrders.length === 0 ? (
                  <div className="text-center py-16 text-gray-400"><ShoppingCart size={48} className="mx-auto mb-4 opacity-30"/><p className="font-black text-xs uppercase">No hay órdenes de compra registradas</p></div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px] tracking-widest text-gray-600"><th className="py-3 px-4 border-r">ID / Fecha</th><th className="py-3 px-4 border-r">Proveedor</th><th className="py-3 px-4 border-r text-center">Ítems</th><th className="py-3 px-4 border-r text-right">Subtotal</th><th className="py-3 px-4 border-r text-center">Estado</th><th className="py-3 px-4 text-center">Ver</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {purchaseOrders.map(po => (
                          <tr key={po.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 border-r font-black text-blue-600">{po.id}<br/><span className="text-[9px] text-gray-400">{po.date}</span></td>
                            <td className="py-3 px-4 border-r font-bold uppercase">{po.provider}</td>
                            <td className="py-3 px-4 border-r text-center font-bold">{(po.items||[]).length}</td>
                            <td className="py-3 px-4 border-r text-right font-black text-green-600">${formatNum(po.subtotal)}</td>
                            <td className="py-3 px-4 border-r text-center"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${po.status==='RECIBIDA'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{po.status}</span></td>
                            <td className="py-3 px-4 text-center"><button onClick={()=>setViewingPO(po)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-800 hover:text-white transition-all"><Eye size={14}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          {showPOModal && (() => {
            const proj = generateProjectionData();
            const projMap = {};
            proj.forEach(p => { projMap[p.id] = p; });

            const addItemToPO = () => {
              if (!poAddId || !poAddQty) return;
              const invItem = (inventory||[]).find(i => i.id === poAddId);
              if (!invItem) return;
              const alreadyIdx = selectedPOItems.findIndex(x => x.productCode === poAddId);
              if (alreadyIdx >= 0) {
                setSelectedPOItems(selectedPOItems.map((it, idx) =>
                  idx === alreadyIdx ? {...it, suggestedQty: parseNum(poAddQty), unitCost: parseNum(poAddCost) || it.unitCost} : it
                ));
              } else {
                setSelectedPOItems([...selectedPOItems, {
                  productCode: invItem.id, productName: invItem.desc,
                  currentStock: invItem.stock, suggestedQty: parseNum(poAddQty),
                  unitCost: parseNum(poAddCost) || invItem.cost || 0,
                }]);
              }
              setPoAddId(''); setPoAddQty(''); setPoAddCost('');
            };

            const subtotal = selectedPOItems.reduce((s,it) => s + (parseNum(it.suggestedQty) * parseNum(it.unitCost)), 0);

            return (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl border-t-8 border-orange-500 max-h-[92vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black uppercase">Nueva Orden de Compra</h3>
                    <button onClick={()=>{setShowPOModal(false);setSelectedPOItems([]);setPoProvider('');setPoNotes('');setPoAddId('');setPoAddQty('');setPoAddCost('');}} className="p-2 text-gray-400 hover:text-red-500"><X size={20}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Proveedor *</label><input type="text" value={poProvider} onChange={e=>setPoProvider(e.target.value.toUpperCase())} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs uppercase outline-none focus:border-orange-500" placeholder="NOMBRE DEL PROVEEDOR" /></div>
                    <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Notas / Referencia</label><input type="text" value={poNotes} onChange={e=>setPoNotes(e.target.value.toUpperCase())} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-xs uppercase outline-none focus:border-orange-500" placeholder="OPCIONAL" /></div>
                  </div>
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-4">
                    <h4 className="text-[10px] font-black uppercase text-orange-800 mb-3">Agregar Producto / Insumo</h4>
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Producto</label>
                        <select value={poAddId} onChange={e => { setPoAddId(e.target.value); const inv=(inventory||[]).find(i=>i.id===e.target.value); if(inv) setPoAddCost(inv.cost?String(inv.cost):''); }} className="w-full border-2 border-gray-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-orange-500 bg-white">
                          <option value="">Seleccione...</option>
                          {(inventory||[]).map(i => { const pp=projMap[i.id]; return <option key={i.id} value={i.id}>{i.id} — {i.desc} (Stock: {formatNum(i.stock)} {i.unit}){pp?.isCritical?' ⚠':''}</option>; })}
                        </select>
                      </div>
                      <div className="col-span-2"><label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Cantidad</label><input type="number" step="0.01" min="0.01" value={poAddQty} onChange={e=>setPoAddQty(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs text-center outline-none focus:border-orange-500" placeholder="0.00" /></div>
                      <div className="col-span-2"><label className="text-[9px] font-black text-gray-500 uppercase block mb-1">Costo U. ($)</label><input type="number" step="0.01" min="0" value={poAddCost} onChange={e=>setPoAddCost(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs text-center outline-none focus:border-orange-500" placeholder="0.00" /></div>
                      <div className="col-span-3"><button onClick={addItemToPO} className="w-full bg-orange-500 text-white px-3 py-2.5 rounded-xl font-black text-xs uppercase hover:bg-orange-600 flex items-center justify-center gap-1"><Plus size={14}/> Agregar</button></div>
                    </div>
                    {proj.filter(p=>p.isCritical && !selectedPOItems.find(s=>s.productCode===p.id)).length>0 && (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <p className="text-[9px] font-black text-orange-700 uppercase mb-2">Items criticos:</p>
                        <div className="flex flex-wrap gap-2">
                          {proj.filter(p=>p.isCritical&&!selectedPOItems.find(s=>s.productCode===p.id)).map(p=>(
                            <button key={p.id} onClick={()=>setSelectedPOItems(prev=>[...prev,{productCode:p.id,productName:p.desc,currentStock:p.stock,suggestedQty:p.suggestOrder||500,unitCost:p.cost||0}])} className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[9px] font-black hover:bg-red-200 border border-red-200">+ {p.id}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedPOItems.length>0 ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px]"><th className="p-3 border-r text-left">Producto</th><th className="p-3 border-r text-center">Stock</th><th className="p-3 border-r text-center">Cantidad</th><th className="p-3 border-r text-right">Costo U.</th><th className="p-3 text-right">Subtotal</th><th className="p-3 w-8"></th></tr></thead>
                        <tbody>
                          {selectedPOItems.map((item,i)=>(
                            <tr key={i} className="border-b border-gray-100">
                              <td className="p-3 border-r font-black text-orange-600 text-xs">{item.productCode}<br/><span className="text-[9px] text-gray-500 font-bold">{item.productName}</span></td>
                              <td className="p-3 border-r text-center font-bold">{formatNum(item.currentStock)}</td>
                              <td className="p-3 border-r text-center"><input type="number" value={item.suggestedQty} onChange={e=>setSelectedPOItems(selectedPOItems.map((it,j)=>j===i?{...it,suggestedQty:parseNum(e.target.value)}:it))} className="w-20 border border-gray-200 rounded-lg p-1 text-center font-black text-xs outline-none" /></td>
                              <td className="p-3 border-r text-right"><input type="number" step="0.01" value={item.unitCost} onChange={e=>setSelectedPOItems(selectedPOItems.map((it,j)=>j===i?{...it,unitCost:parseNum(e.target.value)}:it))} className="w-20 border border-gray-200 rounded-lg p-1 text-center font-black text-xs outline-none" /></td>
                              <td className="p-3 text-right font-black text-green-600">${formatNum(parseNum(item.suggestedQty)*parseNum(item.unitCost))}</td>
                              <td className="p-3 text-center"><button onClick={()=>setSelectedPOItems(selectedPOItems.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600"><X size={14}/></button></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 border-t-2 border-gray-300"><tr><td colSpan={4} className="p-3 text-right font-black uppercase text-[10px]">SUBTOTAL:</td><td className="p-3 text-right font-black text-orange-600 text-base">${formatNum(subtotal)}</td><td></td></tr></tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400 mb-6"><ShoppingCart size={32} className="mx-auto mb-2 opacity-30"/><p className="text-xs font-bold uppercase">Agregue productos a la orden</p></div>
                  )}
                  <div className="flex gap-3 justify-end">
                    <button onClick={()=>{setShowPOModal(false);setSelectedPOItems([]);setPoProvider('');setPoNotes('');setPoAddId('');setPoAddQty('');setPoAddCost('');}} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSavePurchaseOrder} disabled={selectedPOItems.length===0||!poProvider.trim()} className="bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-gray-800 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"><CheckCircle2 size={16}/> GUARDAR ORDEN</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      );
    }

    // ── PRODUCCIÓN ACTIVA ─────────────────────────────────────────────
    if (prodView === 'en_proceso') {
      const activeOPs = (requirements||[]).filter(r=>r.status==='EN PROCESO');
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-black uppercase flex items-center gap-3"><Gauge className="text-orange-500" size={24}/> Reporte de Producción en Proceso</h2>
                <p className="text-[10px] font-bold text-orange-600 mt-1 uppercase">{activeOPs.length} OPs activas — Progreso acumulado por lotes</p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {activeOPs.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Gauge size={48} className="mx-auto mb-4 opacity-30"/><p className="font-black text-xs uppercase">No hay OPs en proceso</p></div>
              ) : activeOPs.map(req => {
                const prod = req.production || {};
                const allBatches = [
                  ...(prod.extrusion?.batches||[]).filter(b=>b.operator!=='ALMACÉN (DESPACHO)').map(b=>({...b,fase:'EXTRUSIÓN'})),
                  ...(prod.impresion?.batches||[]).filter(b=>b.operator!=='ALMACÉN (DESPACHO)').map(b=>({...b,fase:'IMPRESIÓN'})),
                  ...(prod.sellado?.batches||[]).filter(b=>b.operator!=='ALMACÉN (DESPACHO)').map(b=>({...b,fase:'SELLADO'})),
                ];
                // Cadena: MP entrada = extrusión; KG salida = última fase
                const extB=allBatches.filter(b=>b.fase==='EXTRUSIÓN');
                const impB=allBatches.filter(b=>b.fase==='IMPRESIÓN');
                const selB=allBatches.filter(b=>b.fase==='SELLADO');
                const mpTotal = extB.reduce((s,b)=>{const ins=(b.insumos||[]).reduce((ss,i)=>ss+parseNum(i.qty),0);return s+(ins>0?ins:parseNum(b.kgRecibidos||0));},0)||impB.reduce((s,b)=>s+parseNum(b.kgRecibidos||0),0)||selB.reduce((s,b)=>s+parseNum(b.kgRecibidos||0),0);
                const lastB=selB.length>0?selB:impB.length>0?impB:extB;
                const kgProd=lastB.reduce((s,b)=>s+parseNum(b.producedKg),0);
                const mermaTotal=Math.max(0,mpTotal-kgProd);
                const pctMerma=mpTotal>0?((mermaTotal/mpTotal)*100).toFixed(1):0;
                const millTotal=selB.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)||impB.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)||extB.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0);
                const pctAvance=req.tipoProducto==='TERMOENCOGIBLE'?(parseNum(req.requestedKg)>0?(kgProd/parseNum(req.requestedKg)*100):0):(parseNum(req.cantidad)>0?(millTotal/parseNum(req.cantidad)*100):0);
                // Materiales consumidos acumulados
                const matsConsumidos={};
                allBatches.forEach(b=>(b.insumos||[]).forEach(ing=>{matsConsumidos[ing.id]=(matsConsumidos[ing.id]||0)+parseNum(ing.qty);}));
                // Materiales despachados
                const matsDespachados={};
                (invRequisitions||[]).filter(r=>r.opId===req.id&&(r.status==='APROBADO'||r.status==='APROBADA')).flatMap(r=>r.items||[]).forEach(it=>{if(it?.id)matsDespachados[it.id]=(matsDespachados[it.id]||0)+parseNum(it.qty);});
                return (
                  <div key={req.id} className="border-2 border-orange-200 rounded-2xl overflow-hidden">
                    {/* Header OP */}
                    <div className="bg-gray-800 text-white px-5 py-3 flex justify-between items-center">
                      <div>
                        <span className="font-black text-orange-400">OP #{String(req.id).replace('OP-','').padStart(5,'0')}</span>
                        <span className="font-bold text-white ml-3 uppercase">{req.client}</span>
                        <span className="text-gray-400 ml-3 text-[10px]">{req.desc}</span>
                      </div>
                      <div className="flex gap-4 text-right text-[10px]">
                        <div><div className="text-gray-400">Solicitado</div><div className="font-black text-white">{req.tipoProducto==='TERMOENCOGIBLE'?formatNum(req.requestedKg)+' KG':formatNum(req.cantidad)+' Mill.'}</div></div>
                        <div><div className="text-gray-400">Producido</div><div className="font-black text-green-400">{req.tipoProducto==='TERMOENCOGIBLE'?formatNum(kgProd)+' KG':formatNum(millTotal)+' Mill.'}</div></div>
                        <div><div className="text-gray-400">Avance</div><div className={`font-black text-lg ${pctAvance>=100?'text-green-400':pctAvance>50?'text-yellow-400':'text-orange-400'}`}>{parseFloat(pctAvance).toFixed(1)}%</div></div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="px-5 py-2 bg-gray-700">
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full transition-all" style={{width:`${Math.min(100,pctAvance)}%`}}></div>
                      </div>
                    </div>
                    {/* KPIs */}
                    <div className="grid grid-cols-4 gap-0 border-b border-gray-200 bg-gray-50">
                      {[['MP Inyectada',formatNum(mpTotal)+' KG','text-blue-700'],['KG Producidos',formatNum(kgProd)+' KG','text-green-700'],['Merma Total',formatNum(mermaTotal)+' KG ('+pctMerma+'%)','text-red-600'],[req.tipoProducto==='TERMOENCOGIBLE'?'KG Producidos':'Millares Prod.',req.tipoProducto==='TERMOENCOGIBLE'?formatNum(kgProd)+' KG':formatNum(millTotal)+' Mill.','text-blue-600']].map(([l,v,c],i)=>(
                        <div key={i} className={`p-4 text-center ${i<3?'border-r border-gray-200':''}`}>
                          <div className="text-[8px] font-black text-gray-500 uppercase">{l}</div>
                          <div className={`text-lg font-black ${c}`}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {/* Lotes */}
                    {allBatches.length > 0 && (
                      <div className="p-4">
                        <p className="text-[9px] font-black uppercase text-gray-500 mb-2">Lotes registrados ({allBatches.length})</p>
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-gray-100 text-[9px] font-black uppercase text-gray-500"><th className="p-2 border text-left">Fase</th><th className="p-2 border text-center">Fecha</th><th className="p-2 border text-center">KG Entrada</th><th className="p-2 border text-center">KG Salida</th><th className="p-2 border text-center">Merma</th><th className="p-2 border text-left">Materiales Usados</th><th className="p-2 border text-left">Obs.</th></tr></thead>
                          <tbody>
                            {allBatches.map((b,i)=>{
                              const insKg=(b.insumos||[]).reduce((s,i)=>s+parseNum(i.qty),0);
                              const entKg=b.fase==='EXTRUSIÓN'&&insKg>0?insKg:parseNum(b.kgRecibidos||b.totalInsumosKg||0);
                              const pctM=entKg>0?((parseNum(b.mermaKg)/entKg)*100).toFixed(1):b.mermaPorc||0;
                              return (<tr key={i} className="hover:bg-gray-50">
                                <td className="p-2 border font-black">{b.fase}<span className="text-[8px] text-gray-400 ml-1">L{i+1}</span></td>
                                <td className="p-2 border text-center text-gray-600">{b.date}</td>
                                <td className="p-2 border text-center text-blue-700 font-bold">{formatNum(entKg)} KG</td>
                                <td className="p-2 border text-center text-green-700 font-bold">{formatNum(b.producedKg)} KG{b.techParams?.millares>0?<span className="text-[9px] text-blue-500 block">{formatNum(b.techParams.millares)} Mill.</span>:null}</td>
                                <td className="p-2 border text-center text-red-600 font-bold">{formatNum(b.mermaKg)} KG<span className="text-[9px] block">({pctM}%)</span></td>
                                <td className="p-2 border text-[9px]">{(b.insumos||[]).length>0?(b.insumos||[]).map(ing=>{const inv=(inventory||[]).find(iv=>iv.id===ing.id);return <div key={ing.id} className="text-orange-700 font-bold">{inv?.desc||ing.id}: {formatNum(ing.qty)} KG</div>;}):(<span className="text-gray-400">—</span>)}</td>
                                <td className="p-2 border text-[9px] text-indigo-600">{b.observaciones||'—'}</td>
                              </tr>);
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Materiales: despachado vs consumido */}
                    {Object.keys(matsDespachados).length > 0 && (
                      <div className="p-4 pt-0">
                        <p className="text-[9px] font-black uppercase text-gray-500 mb-2">Balance de Materiales — Despachado vs Consumido:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(matsDespachados).map(([id,desp])=>{
                            const inv=(inventory||[]).find(iv=>iv.id===id);
                            const cons=parseNum(matsConsumidos[id]||0);
                            const pct=desp>0?(cons/desp*100):0;
                            const rest=Math.max(0,desp-cons);
                            return (<div key={id} className="bg-white border border-gray-200 rounded-xl p-3">
                              <div className="font-black text-[10px] text-gray-800 mb-1">{inv?.desc||id}</div>
                              <div className="flex justify-between text-[9px] mb-1">
                                <span className="text-blue-600">Desp: {formatNum(desp)} KG</span>
                                <span className="text-orange-600">Cons: {formatNum(cons)} KG</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                <div className={`h-1.5 rounded-full ${pct>90?'bg-red-500':pct>60?'bg-orange-400':'bg-green-500'}`} style={{width:`${Math.min(100,pct)}%`}}></div>
                              </div>
                              <div className={`text-[9px] font-black text-right ${rest<=0?'text-red-600':'text-green-600'}`}>Rest: {formatNum(rest)} KG</div>
                            </div>);
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (prodView === 'activos') {
      const activeReqs = (requirements||[]).filter(r => r.status === 'EN PROCESO' || r.status === 'PENDIENTE' || !r.status);
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-green-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-green-800 uppercase flex items-center gap-3"><PlayCircle className="text-green-600" size={24}/> Producción Activa</h2>
                <p className="text-[10px] font-bold text-green-600 mt-1 uppercase">Órdenes de producción — generadas desde Ventas</p>
              </div>
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-black text-xs uppercase">{activeReqs.length} ACTIVAS</div>
            </div>
            <div className="p-6">
              {activeReqs.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <PlayCircle size={48} className="mx-auto mb-4 opacity-30"/>
                  <p className="font-black text-xs uppercase">No hay órdenes activas</p>
                  <p className="text-xs mt-2">Las OPs se crean desde Ventas → Requisiciones</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeReqs.map(req => {
                    const prod = req.production || {};
                    const phaseStatus = (phase) => {
                      if (prod[phase]?.isClosed) return { icon: '✓', cls: 'border-green-300 bg-green-50 text-green-700' };
                      if ((prod[phase]?.batches||[]).length > 0) return { icon: '⏳', cls: 'border-yellow-300 bg-yellow-50 text-yellow-700' };
                      return { icon: '—', cls: 'border-gray-200 bg-white text-gray-400' };
                    };
                    const isOpen = selectedPhaseReqId === req.id;
                    // Calcular total insumos para auto-merma
                    const totalInsumosActual = (phaseForm?.insumos || []).reduce((s, ing) => s + parseNum(ing.qty), 0);
                    return (
                      <div key={req.id} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-5 bg-white border-b border-gray-100">
                          <div>
                            <h3 className="font-black text-black text-sm uppercase">OP #{String(req.id).replace('OP-','').padStart(5,'0')} — {req.client}</h3>
                            <p className="text-[10px] font-bold text-gray-500 mt-1">{req.desc} | {req.ancho}cm×{req.largo}cm | {req.micras}mic | {formatNum(req.requestedKg)} KG</p>
                            {/* Resumen entregas parciales */}
                            {(req.entregasParciales||[]).length > 0 && (() => {
                              const prod = req.production || {};
                              const fr = b => b.operator!=='ALMACÉN (DESPACHO)' && parseNum(b.producedKg)>0;
                              const sB=(prod.sellado?.batches||[]).filter(fr);
                              const iB=(prod.impresion?.batches||[]).filter(fr);
                              const eB=(prod.extrusion?.batches||[]).filter(fr);
                              const lastB = sB.length>0?sB:iB.length>0?iB:eB;
                              const totalProd = lastB.reduce((s,b)=>s+parseNum(b.producedKg),0);
                              const totalEntregado = (req.entregasParciales||[]).reduce((s,e)=>s+parseNum(e.kg),0);
                              const pendiente = Math.max(0, totalProd - totalEntregado);
                              return (
                                <div className="flex gap-3 mt-2 flex-wrap">
                                  <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg">📦 Prod: {formatNum(totalProd)} KG</span>
                                  <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-lg">✓ Entregado: {formatNum(totalEntregado)} KG ({(req.entregasParciales||[]).length} parcial{(req.entregasParciales||[]).length!==1?'es':''})</span>
                                  {pendiente > 0 && <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-lg">⏳ Pendiente: {formatNum(pendiente)} KG</span>}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            {/* SELECTOR DE LOTE */}
                            {(() => {
                              const lotes = getLotes(req);
                              if (lotes.length === 0) return null;
                              return (
                                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
                                  <span className="text-[9px] font-black text-gray-500 uppercase">Lote:</span>
                                  <select value={activeLoteIndex} onChange={e=>setActiveLoteIndex(parseInt(e.target.value))}
                                    className="bg-transparent text-[10px] font-black text-black outline-none">
                                    {lotes.map((l,i)=>(
                                      <option key={l.id} value={i}>{l.nombre} {l.cerrado?'✓':''}</option>
                                    ))}
                                  </select>
                                  <button onClick={()=>handleCrearNuevoLote(req)}
                                    className="bg-green-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black hover:bg-green-600 flex items-center gap-1">
                                    <Plus size={10}/> NUEVO LOTE
                                  </button>
                                </div>
                              );
                            })()}
                            <button onClick={()=>setShowOrdenTrabajo(req.id)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-gray-800 text-white hover:bg-black flex items-center gap-1 transition-all"><FileText size={13}/> ORDEN DE TRABAJO</button>
                            <button onClick={() => {
                              if (isOpen) { setSelectedPhaseReqId(null); setProdSubMode('fase'); }
                              else {
                                // Inicializar lotes si no existen
                                const lotes = getLotes(req);
                                if (lotes.length === 0) {
                                  handleCrearNuevoLote(req).then(() => {
                                    setSelectedPhaseReqId(req.id); setProdSubMode('requisicion'); setActivePhaseTab('extrusion'); setPhaseForm({...initialPhaseForm, date: getTodayDate()});
                                  });
                                } else {
                                  setSelectedPhaseReqId(req.id); setProdSubMode('requisicion'); setActivePhaseTab('extrusion'); setPhaseForm({...initialPhaseForm, date: getTodayDate()});
                                }
                              }
                            }} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isOpen ? 'bg-gray-200 text-gray-700' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'}`}>{isOpen ? <X size={14}/> : <Plus size={14}/>}{isOpen ? 'CERRAR' : 'REGISTRAR FASE'}</button>
                            {/* BOTÓN ENTREGA PARCIAL */}
                            <button
                              onClick={() => { setShowPartialModal(req); setPartialKg(''); setPartialMillares(''); }}
                              className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-blue-600 text-white hover:bg-blue-700 shadow-md flex items-center gap-1 transition-all"
                              title="Mover producción parcial a Terminados sin cerrar la OP"
                            >
                              <ArrowUpFromLine size={14}/> ENTREGA PARCIAL
                            </button>
                            {/* BOTÓN CIERRE OP — destaca en rojo */}
                            <button
                              onClick={() => handleCloseOP(req)}
                              className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white hover:bg-red-700 shadow-md flex items-center gap-1 transition-all"
                              title="Cerrar la OP completa y mover a Inventario de Terminados"
                            >
                              <CheckCircle size={14}/> CIERRE OP
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 p-4">
                          {[['Extrusión','extrusion'],['Impresión','impresion'],['Sellado/Corte','sellado']].map(([label, key]) => {
                            const st = phaseStatus(key);
                            const batches = prod[key]?.batches || [];
                            const isSkipped = prod[key]?.skipped;
                            return (
                              <div key={key} className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${st.cls} ${isOpen && activePhaseTab===key?'ring-2 ring-orange-400':''}`}
                                onClick={()=>{ if(isOpen && prodSubMode==='fase') { setActivePhaseTab(key); let nf={...initialPhaseForm,date:getTodayDate()}; if(key==='impresion'){const ekg=(prod.extrusion?.batches||[]).reduce((s,b)=>s+parseNum(b.producedKg),0); nf.kgRecibidosImp=ekg>0?ekg.toFixed(2):'';} if(key==='sellado'){const ipb=prod.impresion?.batches||[]; const ikg=ipb.length>0?ipb.reduce((s,b)=>s+parseNum(b.producedKg),0):(prod.extrusion?.batches||[]).reduce((s,b)=>s+parseNum(b.producedKg),0); nf.kgRecibidosSel=ikg>0?ikg.toFixed(2):'';} setPhaseForm(nf); } }}>
                                <div className="text-xl font-black">{isSkipped ? '⊘' : st.icon}</div>
                                <div className="text-[9px] font-black uppercase mt-1">{label}</div>
                                {batches.length > 0 && <div className="text-[8px] text-gray-500">{batches.length} lote(s)</div>}
                                {isSkipped && <div className="text-[8px] text-red-500 font-black">OMITIDA</div>}
                              </div>
                            );
                          })}
                        </div>

                        {isOpen && (
                          <div className="border-t border-gray-200 bg-white">
                            {/* MODO REQUISICIÓN */}
                            {prodSubMode === 'requisicion' && (
                              <div className="p-5">
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
                                  <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-black text-blue-800 uppercase text-sm flex items-center gap-2"><ClipboardList size={16}/> Solicitud de Insumos a Almacén</h4>
                                    <button onClick={()=>setProdSubMode('fase')} className="text-xs font-black text-gray-500 hover:text-orange-500 underline">Ir directamente a Registro de Fase →</button>
                                  </div>

                                  {/* Banner: Fórmula disponible para esta OP */}
                                  {(() => {
                                    const matchFormula = (formulas||[]).find(f=>
                                      f.categoria && req.categoria &&
                                      f.categoria.toUpperCase() === (req.categoria||'').toUpperCase() &&
                                      (f.tipoProducto === req.tipoProducto || !f.tipoProducto)
                                    );
                                    if (!matchFormula) {
                                      // Mostrar fórmulas disponibles para seleccionar
                                      return (formulas||[]).length > 0 ? (
                                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
                                          <p className="text-[9px] font-black text-purple-700 uppercase mb-2">📋 Aplicar Fórmula / Receta:</p>
                                          <div className="flex flex-wrap gap-2">
                                            {(formulas||[]).map(f=>(
                                              <button key={f.id} type="button"
                                                onClick={()=>{
                                                  const kgBase = parseNum(req.requestedKg)||1;
                                                  const items = applyFormulaToPhase(f, kgBase);
                                                  setPhaseForm({...phaseForm, insumos: items.map(i=>({id:i.id,qty:i.qty}))});
                                                  setDialog({title:`✅ Fórmula aplicada: ${f.categoria}`,text:`Se pre-cargaron ${items.length} materiales según la receta (${formatNum(kgBase)} KG base). Ajuste cantidades si es necesario.`,type:'alert'});
                                                }}
                                                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[9px] font-black hover:bg-purple-700 flex items-center gap-1">
                                                <Beaker size={10}/> {f.categoria}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null;
                                    }
                                    return (
                                      <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-3 mb-4">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <p className="text-[9px] font-black text-purple-700 uppercase">🧪 Fórmula detectada: <span className="text-purple-900">{matchFormula.categoria}</span></p>
                                            <p className="text-[9px] text-purple-600 font-bold mt-0.5">
                                              {(matchFormula.ingredientes||[]).map(i=>`${i.id} (${i.pct}%)`).join(' · ')}
                                            </p>
                                          </div>
                                          <button type="button"
                                            onClick={()=>{
                                              const kgBase = parseNum(req.requestedKg)||1;
                                              const items = applyFormulaToPhase(matchFormula, kgBase);
                                              setPhaseForm({...phaseForm, insumos: items.map(i=>({id:i.id,qty:i.qty}))});
                                              setDialog({title:`✅ Fórmula aplicada`,text:`${items.length} materiales pre-cargados para ${formatNum(kgBase)} KG. Puede agregar materiales adicionales.`,type:'alert'});
                                            }}
                                            className="bg-purple-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-purple-700 flex items-center gap-1 shadow-md">
                                            <Beaker size={12}/> APLICAR RECETA
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div>
                                      <label className="text-[9px] font-black text-blue-700 uppercase block mb-1">Fase para la Solicitud</label>
                                      <select value={activePhaseTab} onChange={e=>setActivePhaseTab(e.target.value)} className="w-full border-2 border-blue-300 rounded-xl p-2 text-xs font-black outline-none bg-white">
                                        <option value="extrusion">Extrusión</option>
                                        <option value="impresion">Impresión</option>
                                        <option value="sellado">Sellado</option>
                                      </select>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="text-[9px] font-black text-blue-700 uppercase block mb-1">Observaciones de la Solicitud</label>
                                      <input type="text" placeholder="EJ: URGENTE / TURNO MAÑANA" className="w-full border-2 border-blue-200 rounded-xl p-2 text-xs font-bold outline-none bg-white uppercase" id={`req-notes-${req.id}`} />
                                    </div>
                                  </div>

                                  {/* Agregar materiales */}
                                  <div className="bg-white rounded-xl border border-blue-200 p-4 mb-4">
                                    <h5 className="text-[9px] font-black text-gray-700 uppercase mb-3">Materiales a Solicitar</h5>
                                    <div className="flex gap-2 mb-3">
                                      <select value={phaseIngId} onChange={e=>setPhaseIngId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg p-2 text-xs font-bold outline-none">
                                        <option value="">Seleccione material...</option>
                                        {(inventory||[]).map(i=><option key={i.id} value={i.id}>{i.id} - {i.desc} (Stock: {formatNum(i.stock)} {i.unit})</option>)}
                                      </select>
                                      <input type="number" step="0.01" value={phaseIngQty} onChange={e=>setPhaseIngQty(e.target.value)} className="w-24 border border-gray-200 rounded-lg p-2 text-xs font-bold text-center outline-none" placeholder="Cant." />
                                      <button onClick={()=>{ if(!phaseIngId||!phaseIngQty) return; setPhaseForm({...phaseForm, insumos:[...(phaseForm.insumos||[]),{id:phaseIngId,qty:parseFloat(phaseIngQty)}]}); setPhaseIngId(''); setPhaseIngQty(''); }} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-black hover:bg-blue-600 flex items-center"><Plus size={14}/></button>
                                    </div>
                                    {(phaseForm.insumos||[]).map((ins,i)=>{
                                      const invItem = (inventory||[]).find(iv=>iv.id===ins.id);
                                      return (
                                        <div key={i} className="flex justify-between items-center bg-blue-50 p-2 rounded-lg border border-blue-100 mb-1">
                                          <div><span className="text-xs font-black text-blue-700">{ins.id}</span><span className="text-[9px] text-gray-500 ml-2">{invItem?.desc||''}</span></div>
                                          <span className="text-xs font-black">{formatNum(ins.qty)} {invItem?.unit||'kg'}</span>
                                          <button onClick={()=>setPhaseForm({...phaseForm,insumos:phaseForm.insumos.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                                        </div>
                                      );
                                    })}
                                    {(phaseForm.insumos||[]).length === 0 && <div className="text-center text-xs text-gray-400 py-4 font-bold">Agregue materiales a la solicitud</div>}
                                  </div>

                                  <div className="flex gap-3 justify-end">
                                    <button onClick={async ()=>{
                                      if(!phaseForm.insumos||phaseForm.insumos.length===0) return setDialog({title:'Aviso',text:'Agregue al menos un material.',type:'alert'});
                                      const notes = document.getElementById(`req-notes-${req.id}`)?.value || '';
                                      const newReq = { opId: req.id, phase: activePhaseTab, items: phaseForm.insumos, status:'PENDIENTE', timestamp:Date.now(), date:getTodayDate(), user:appUser?.name||'Planta', notes };
                                      try {
                                        await addDoc(getColRef('inventoryRequisitions'), newReq);
                                        setPhaseForm({...phaseForm, insumos:[]});
                                        setProdSubMode('fase');
                                        setDialog({title:'✅ Enviado',text:'Solicitud enviada al Almacén. Apruébela desde Proyección MP.',type:'alert'});
                                      } catch(e){setDialog({title:'Error',text:e.message,type:'alert'});}
                                    }} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase hover:bg-blue-700 shadow-md flex items-center gap-2"><ArrowRight size={14}/> ENVIAR SOLICITUD A ALMACÉN</button>
                                    <button onClick={()=>setProdSubMode('fase')} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-orange-600 flex items-center gap-2"><Plus size={14}/> REGISTRAR FASE SIN SOLICITUD</button>
                                  </div>

                                  {/* Solicitudes previas para esta OP */}
                                  {(invRequisitions||[]).filter(r=>r.opId===req.id).length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                      <h5 className="text-[9px] font-black text-blue-700 uppercase mb-2">Solicitudes de esta OP</h5>
                                      {(invRequisitions||[]).filter(r=>r.opId===req.id).map(r=>(
                                        <div key={r.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-blue-100 mb-1 text-xs">
                                          <span className="font-black uppercase text-blue-600">{r.phase}</span>
                                          <span className="font-bold">{r.date}</span>
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${r.status==='APROBADA'?'bg-green-100 text-green-700':r.status==='RECHAZADO'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* MODO REGISTRO DE FASE */}
                            {prodSubMode === 'fase' && (
                              <div className="p-5">
                                {/* Determinar fases activas según fórmula de la categoría */}
                                {(() => {
                                  const matchFormula = (formulas||[]).find(f =>
                                    f.categoria && req.categoria &&
                                    f.categoria.toUpperCase() === (req.categoria||'').toUpperCase()
                                  );
                                  const fasesActivas = matchFormula?.fases || { extrusion: true, impresion: true, sellado: true };
                                  const fasesConfig = [['extrusion','Extrusión'],['impresion','Impresión'],['sellado','Sellado']].filter(([k]) => fasesActivas[k]);
                                  // Tabs de fase - solo las definidas en la fórmula
                                  return (
                                  <div className="flex gap-2 mb-4 flex-wrap">
                                  {fasesConfig.map(([key, label]) => (
                                    <button key={key} onClick={() => {
                                      setActivePhaseTab(key);
                                      let newForm = {...initialPhaseForm, date: getTodayDate()};
                                      const reqProd = req.production || {};
                                      if (key === 'impresion') {
                                        const ekg = (reqProd.extrusion?.batches||[]).reduce((s,b)=>s+parseNum(b.producedKg),0);
                                        newForm.kgRecibidosImp = ekg > 0 ? ekg.toFixed(2) : '';
                                      }
                                      if (key === 'sellado') {
                                        const impB = reqProd.impresion?.batches||[];
                                        const ikg = impB.length>0 ? impB.reduce((s,b)=>s+parseNum(b.producedKg),0) : (reqProd.extrusion?.batches||[]).reduce((s,b)=>s+parseNum(b.producedKg),0);
                                        newForm.kgRecibidosSel = ikg > 0 ? ikg.toFixed(2) : '';
                                      }
                                      setPhaseForm(newForm);
                                    }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activePhaseTab===key ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}{(req.production||{})[key]?.isClosed ? ' ✓' : (req.production||{})[key]?.skipped ? ' ⊘' : ''}</button>
                                  ))}
                                  <div className="flex gap-2 ml-auto">
                                    <button onClick={()=>setProdSubMode('requisicion')} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1"><ClipboardList size={12}/> SOLICITAR A ALMACÉN</button>
                                    <button onClick={()=>{setProdSubMode('requisicion');setPhaseForm({...phaseForm, insumos:[]});}} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 flex items-center gap-1"><Plus size={12}/> ADICIONAL ALMACÉN</button>
                                  </div>
                                  </div>
                                  );
                                })()}

                                {/* Formulario de fase */}
                                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 space-y-4">
                                  {(() => {
                                    const esTermo = req.tipoProducto === 'TERMOENCOGIBLE';
                                    const pesoMillar = parseNum(req.pesoMillar) || 0; // KG por millar (resultado de (ancho+fuelle)*largo*micras)
                                    const kgPorMillar = pesoMillar; // ya es KG/millar directamente
                                    return (
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-[9px] font-black text-blue-700 uppercase block mb-1">📅 Fecha de Salida — {activePhaseTab === 'extrusion' ? 'Extrusión' : activePhaseTab === 'impresion' ? 'Impresión' : 'Sellado'}</label>
                                      <input type="date" value={phaseForm.date} onChange={e=>setPhaseForm({...phaseForm, date: e.target.value})} className="w-full border-2 border-blue-300 rounded-xl p-2 text-xs font-bold outline-none focus:border-blue-500 bg-blue-50 text-blue-900" />
                                      <span className="text-[8px] text-blue-500 font-bold">Fecha en que sale el producto de esta fase</span>
                                    </div>
                                    {esTermo ? (
                                      <div>
                                        <label className="text-[9px] font-black text-gray-600 uppercase block mb-1">KG Producidos</label>
                                        <input type="number" step="0.01" value={phaseForm.producedKg}
                                          onChange={e => {
                                            const kg = e.target.value;
                                            const insumosTotal = (phaseForm.insumos||[]).reduce((s,ing)=>s+parseNum(ing.qty),0);
                                            const kgBase = insumosTotal > 0 ? insumosTotal : activePhaseTab === 'impresion' ? parseNum(phaseForm.kgRecibidosImp) : activePhaseTab === 'sellado' ? parseNum(phaseForm.kgRecibidosSel) : 0;
                                            const autoMerma = kgBase > 0 && parseNum(kg) >= 0 ? Math.max(0, kgBase - parseNum(kg)).toFixed(2) : phaseForm.mermaKg;
                                            setPhaseForm({...phaseForm, producedKg: kg, mermaKg: autoMerma});
                                          }}
                                          className="w-full border-2 border-orange-300 rounded-xl p-2 text-sm font-black outline-none focus:border-orange-500 text-center bg-white" placeholder="0.00" />
                                      </div>
                                    ) : activePhaseTab === 'extrusion' ? (
                                      // EXTRUSIÓN: se ingresan KG procesados. Peso teórico y millares teóricos son automáticos.
                                      <div>
                                        <label className="text-[9px] font-black text-gray-600 uppercase block mb-1">KG Procesados (Extrusión)</label>
                                        <input type="number" step="0.01" value={phaseForm.producedKg}
                                          onChange={e => {
                                            const kg = e.target.value;
                                            const kgNum = parseNum(kg);
                                            const insumosTotal = (phaseForm.insumos||[]).reduce((s,ing)=>s+parseNum(ing.qty),0);
                                            const kgBase = insumosTotal > 0 ? insumosTotal : 0;
                                            const autoMerma = kgBase > 0 && kgNum >= 0 ? Math.max(0, kgBase - kgNum).toFixed(2) : phaseForm.mermaKg;
                                            // Calcular millares teóricos automáticamente
                                            const millaresTeor = kgPorMillar > 0 ? (kgNum / kgPorMillar).toFixed(2) : '';
                                            setPhaseForm({...phaseForm, producedKg: kg, mermaKg: autoMerma, millaresProd: millaresTeor});
                                          }}
                                          className="w-full border-2 border-gray-300 rounded-xl p-2 text-sm font-black outline-none focus:border-gray-500 text-center bg-white" placeholder="0.00" />
                                        {kgPorMillar > 0 && parseNum(phaseForm.producedKg) > 0 && (
                                          <div className="text-[9px] font-bold text-gray-500 mt-1 text-center space-y-0.5">
                                            <div>Peso teórico/millar: <span className="font-black text-orange-600">{formatNum(kgPorMillar)} KG/Mill.</span></div>
                                            <div>Millares teóricos: <span className="font-black text-orange-600">{formatNum(parseNum(phaseForm.producedKg)/kgPorMillar)} Mill.</span></div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      // IMPRESIÓN / SELLADO: se ingresan Millares reales producidos
                                      <div>
                                        <label className="text-[9px] font-black text-orange-600 uppercase block mb-1">Millares Producidos ★ (Reales)</label>
                                        <input type="number" step="0.01" value={phaseForm.millaresProd}
                                          onChange={e => {
                                            const mill = e.target.value;
                                            const millNum = parseNum(mill);
                                            const kgCalculado = kgPorMillar > 0 ? (millNum * kgPorMillar).toFixed(2) : phaseForm.producedKg;
                                            const insumosTotal = (phaseForm.insumos||[]).reduce((s,ing)=>s+parseNum(ing.qty),0);
                                            const kgBase = insumosTotal > 0 ? insumosTotal : activePhaseTab === 'impresion' ? parseNum(phaseForm.kgRecibidosImp) : parseNum(phaseForm.kgRecibidosSel);
                                            const kgFinal = kgPorMillar > 0 ? kgCalculado : phaseForm.producedKg;
                                            const autoMerma = kgBase > 0 && parseNum(kgFinal) >= 0 ? Math.max(0, kgBase - parseNum(kgFinal)).toFixed(2) : phaseForm.mermaKg;
                                            setPhaseForm({...phaseForm, millaresProd: mill, producedKg: kgFinal, mermaKg: autoMerma});
                                          }}
                                          className="w-full border-2 border-orange-400 rounded-xl p-2 text-sm font-black outline-none focus:border-orange-600 text-center bg-orange-50" placeholder="0.00" />
                                        {kgPorMillar > 0 && parseNum(phaseForm.millaresProd) > 0 && (
                                          <div className="text-[9px] font-bold text-orange-600 mt-1 text-center space-y-0.5">
                                            <div>KG/Millar: {formatNum(kgPorMillar)} KG/Mill.</div>
                                            <div className="font-black">KG Totales: {formatNum(parseNum(phaseForm.millaresProd)*kgPorMillar)} KG</div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div>
                                      {(() => {
                                        const base = (phaseForm.insumos||[]).reduce((s,ing)=>s+parseNum(ing.qty),0) || parseNum(phaseForm.kgRecibidosImp) || parseNum(phaseForm.kgRecibidosSel);
                                        const mermaVal = parseNum(phaseForm.mermaKg);
                                        const pct = base > 0 ? (mermaVal/base)*100 : 0;
                                        const semaforoColor = pct <= 5 ? 'border-green-400 bg-green-50 text-green-700' : pct <= 7 ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-red-400 bg-red-50 text-red-700';
                                        return (
                                          <>
                                            <label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Merma KG <span className="text-orange-500">(Auto)</span></label>
                                            <div className="relative">
                                              <input type="number" step="0.01" value={phaseForm.mermaKg} onChange={e=>setPhaseForm({...phaseForm, mermaKg: e.target.value})} className={`w-full border-2 rounded-xl p-2 text-sm font-black outline-none text-center ${semaforoColor}`} placeholder="0.00" />
                                              {pct > 0 && <span className={`absolute -top-5 right-0 text-[9px] font-black ${pct<=5?'text-green-600':pct<=7?'text-yellow-600':'text-red-600'}`}>{pct.toFixed(1)}% {pct<=5?'🟢':pct<=7?'🟡':'🔴'}</span>}
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                    );
                                  })()}

                                  {/* ── DESGLOSE DE MERMA POR TIPO (solo Extrusión y Sellado) ── */}
                                  {(activePhaseTab === 'extrusion' || activePhaseTab === 'sellado') && (
                                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 space-y-3">
                                      <div className="flex justify-between items-center">
                                        <h5 className="text-[9px] font-black text-red-700 uppercase">♻️ Desglose de Merma → Inventario Reciclado</h5>
                                        {(() => {
                                          const total = parseNum(phaseForm.mermaTroquelTransp)+parseNum(phaseForm.mermaTroquelPigm)+parseNum(phaseForm.mermaTorta);
                                          return total > 0 ? <span className="text-[9px] font-black text-red-600">Total desglosado: {formatNum(total)} KG</span> : null;
                                        })()}
                                      </div>
                                      <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-white rounded-xl border border-gray-200 p-3">
                                          <label className="text-[8px] font-black text-gray-500 uppercase block mb-1">🔵 Troquel/Grafilado<br/>TRANSPARENTE</label>
                                          <input type="number" step="0.01" value={phaseForm.mermaTroquelTransp}
                                            onChange={e=>{
                                              const v=e.target.value;
                                              const total=parseNum(v)+parseNum(phaseForm.mermaTroquelPigm)+parseNum(phaseForm.mermaTorta);
                                              setPhaseForm({...phaseForm, mermaTroquelTransp:v, mermaKg:total.toFixed(2)});
                                            }}
                                            className="w-full border border-blue-200 rounded-lg p-2 text-xs font-black text-center outline-none bg-blue-50 text-blue-700" placeholder="0.00" />
                                          <span className="text-[8px] text-blue-600 font-bold block mt-1">→ RECICLADO TRANSPARENTE</span>
                                        </div>
                                        <div className="bg-white rounded-xl border border-gray-200 p-3">
                                          <label className="text-[8px] font-black text-gray-500 uppercase block mb-1">🟠 Troquel/Grafilado<br/>PIGMENTADO</label>
                                          <input type="number" step="0.01" value={phaseForm.mermaTroquelPigm}
                                            onChange={e=>{
                                              const v=e.target.value;
                                              const total=parseNum(phaseForm.mermaTroquelTransp)+parseNum(v)+parseNum(phaseForm.mermaTorta);
                                              setPhaseForm({...phaseForm, mermaTroquelPigm:v, mermaKg:total.toFixed(2)});
                                            }}
                                            className="w-full border border-orange-200 rounded-lg p-2 text-xs font-black text-center outline-none bg-orange-50 text-orange-700" placeholder="0.00" />
                                          <span className="text-[8px] text-orange-600 font-bold block mt-1">→ RECICLADO PIGMENTADO</span>
                                        </div>
                                        <div className="bg-white rounded-xl border border-gray-200 p-3">
                                          <label className="text-[8px] font-black text-gray-500 uppercase block mb-1">🟤 Merma<br/>TORTA</label>
                                          <input type="number" step="0.01" value={phaseForm.mermaTorta}
                                            onChange={e=>{
                                              const v=e.target.value;
                                              const total=parseNum(phaseForm.mermaTroquelTransp)+parseNum(phaseForm.mermaTroquelPigm)+parseNum(v);
                                              setPhaseForm({...phaseForm, mermaTorta:v, mermaKg:total.toFixed(2)});
                                            }}
                                            className="w-full border border-amber-200 rounded-lg p-2 text-xs font-black text-center outline-none bg-amber-50 text-amber-700" placeholder="0.00" />
                                          <span className="text-[8px] text-amber-600 font-bold block mt-1">→ RECICLADO TORTA</span>
                                        </div>
                                      </div>
                                      <p className="text-[8px] text-red-500 font-bold">Al guardar la fase, estas cantidades se registran automáticamente en el inventario como material reciclado.</p>
                                    </div>
                                  )}

                                  {activePhaseTab === 'extrusion' && (
                                    <div className="grid grid-cols-2 gap-3">
                                      <div><label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Operador Ext.</label><input type="text" value={phaseForm.operadorExt} onChange={e=>setPhaseForm({...phaseForm, operadorExt: e.target.value.toUpperCase()})} className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white uppercase" /></div>
                                      <div><label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Motor Ext.</label><input type="number" step="0.1" value={phaseForm.motorExt} onChange={e=>setPhaseForm({...phaseForm, motorExt: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white text-center" /></div>
                                      <div><label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Tratado</label><select value={phaseForm.tratado} onChange={e=>setPhaseForm({...phaseForm, tratado: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white"><option value="">Sin tratado</option><option value="1 CARA">1 CARA</option><option value="2 CARAS">2 CARAS</option></select></div>
                                    </div>
                                  )}

                                  {activePhaseTab === 'impresion' && (
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                                        <label className="text-[9px] font-black text-blue-700 uppercase block mb-1">KG Recibidos de Extrusión</label>
                                        <input type="number" step="0.01" value={phaseForm.kgRecibidosImp} onChange={e=>{const kr=e.target.value;const pd=parseNum(phaseForm.producedKg);const m=pd>0?Math.max(0,parseNum(kr)-pd).toFixed(2):phaseForm.mermaKg;setPhaseForm({...phaseForm,kgRecibidosImp:kr,mermaKg:m});}} className="w-full border-2 border-blue-300 rounded-xl p-2 text-sm font-black outline-none bg-white text-blue-700 text-center" />
                                      </div>
                                      <div><label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Operador Imp.</label><input type="text" value={phaseForm.operadorImp} onChange={e=>setPhaseForm({...phaseForm, operadorImp: e.target.value.toUpperCase()})} className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white uppercase" /></div>
                                      <div><label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Cant. Colores</label><input type="number" value={phaseForm.cantColores} onChange={e=>setPhaseForm({...phaseForm, cantColores: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white text-center" /></div>
                                      <div><label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Relación Imp.</label><input type="number" step="0.01" value={phaseForm.relacionImp} onChange={e=>setPhaseForm({...phaseForm, relacionImp: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white text-center" /></div>
                                    </div>
                                  )}

                                  {activePhaseTab === 'sellado' && (
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl p-3">
                                        <label className="text-[9px] font-black text-green-700 uppercase block mb-1">KG Recibidos de Impresión/Extrusión</label>
                                        <input type="number" step="0.01" value={phaseForm.kgRecibidosSel} onChange={e=>{const kr=e.target.value;const pd=parseNum(phaseForm.producedKg);const m=pd>0?Math.max(0,parseNum(kr)-pd).toFixed(2):phaseForm.mermaKg;setPhaseForm({...phaseForm,kgRecibidosSel:kr,mermaKg:m});}} className="w-full border-2 border-green-300 rounded-xl p-2 text-sm font-black outline-none bg-white text-green-700 text-center" />
                                      </div>
                                      <div><label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Operador Sell.</label><input type="text" value={phaseForm.operadorSel} onChange={e=>setPhaseForm({...phaseForm, operadorSel: e.target.value.toUpperCase()})} className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white uppercase" /></div>
                                      <div><label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Tipo Sello</label><select value={phaseForm.tipoSello} onChange={e=>setPhaseForm({...phaseForm, tipoSello: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white"><option>Sello FC</option><option>Sello SC</option><option>Lateral</option><option>Doble Sello</option></select></div>
                                      <div><label className="text-[9px] font-black text-gray-600 uppercase block mb-1">Temp. Cabezal A</label><input type="number" value={phaseForm.tempCabezalA} onChange={e=>setPhaseForm({...phaseForm, tempCabezalA: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white text-center" /></div>
                                    </div>
                                  )}

                                  {/* Insumos */}
                                  <div className="bg-white rounded-xl border border-orange-200 p-4">
                                    <h4 className="text-[9px] font-black text-gray-700 uppercase mb-3">Insumos Consumidos en esta Fase</h4>
                                    {renderInsumosPhasePanel(req, activePhaseTab)}
                                  </div>

                                  {/* ── BOTONES DE FASE ── */}
                                  <div className="space-y-3 pt-2 border-t border-orange-200">
                                    {/* Progress bar Solicitado / Producido / Pendiente — cadena completa */}
                                    {(() => {
                                      const esTermo = req.tipoProducto === 'TERMOENCOGIBLE';
                                      const solicitado = esTermo ? parseNum(req.requestedKg) : parseNum(req.cantidad);
                                      // Cadena: usa la ÚLTIMA fase activa para KG/Millares producidos
                                      const rp = req.production || {};
                                      const fr = b => b.operator !== 'ALMACÉN (DESPACHO)' && parseNum(b.producedKg) > 0;
                                      const selB = (rp.sellado?.batches||[]).filter(fr);
                                      const impB = (rp.impresion?.batches||[]).filter(fr);
                                      const extB = (rp.extrusion?.batches||[]).filter(fr);
                                      const lastB = selB.length>0?selB:impB.length>0?impB:extB;
                                      const producidoKg = lastB.reduce((s,b)=>s+parseNum(b.producedKg),0);
                                      const producidoMill = selB.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)
                                        || impB.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)
                                        || extB.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0);
                                      const producido = esTermo ? producidoKg : producidoMill;
                                      const mpInyectada = extB.reduce((s,b)=>{
                                        const ins=(b.insumos||[]).reduce((ss,i)=>ss+parseNum(i.qty),0);
                                        return s+(ins>0?ins:parseNum(b.kgRecibidos||b.totalInsumosKg||0));
                                      },0)||impB.reduce((s,b)=>s+parseNum(b.kgRecibidos||0),0)||selB.reduce((s,b)=>s+parseNum(b.kgRecibidos||0),0);
                                      const mermaTotal = Math.max(0, mpInyectada - producidoKg);
                                      const pctMerma = mpInyectada > 0 ? (mermaTotal/mpInyectada*100) : 0;
                                      const pendiente = Math.max(0, solicitado - producido);
                                      const pct = solicitado > 0 ? Math.min(100, (producido/solicitado)*100) : 0;
                                      const unidad = esTermo ? 'KG' : 'Millares';
                                      if (solicitado === 0 && mpInyectada === 0) return null;
                                      return (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                          <div className="flex justify-between text-[9px] font-black uppercase mb-2">
                                            <span className="text-blue-700">Progreso OP — cadena de producción</span>
                                            <span className="text-blue-600">{pct.toFixed(0)}% completado</span>
                                          </div>
                                          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                                            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{width:`${pct}%`}}></div>
                                          </div>
                                          <div className="grid grid-cols-4 gap-2 text-center">
                                            <div><span className="text-[8px] font-black text-gray-500 uppercase block">Solicitado</span><span className="font-black text-blue-700 text-xs">{formatNum(solicitado)} {unidad}</span></div>
                                            <div><span className="text-[8px] font-black text-gray-500 uppercase block">Producido</span><span className="font-black text-green-600 text-xs">{formatNum(producido)} {unidad}</span></div>
                                            <div><span className="text-[8px] font-black text-gray-500 uppercase block">Pendiente</span><span className={`font-black text-xs ${pendiente>0?'text-orange-600':'text-green-600'}`}>{formatNum(pendiente)} {unidad}</span></div>
                                            {mpInyectada > 0 && <div><span className="text-[8px] font-black text-gray-500 uppercase block">Merma</span><span className="font-black text-red-500 text-xs">{formatNum(mermaTotal)} KG ({pctMerma.toFixed(1)}%)</span></div>}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Lotes existentes de esta fase (sin fantasmas) */}
                                    {(() => {
                                      const realBatches = (prod[activePhaseTab]?.batches||[]).filter(b => b.operator !== 'ALMACÉN (DESPACHO)' && (parseNum(b.producedKg) > 0 || (b.insumos||[]).length > 0));
                                      const esTermo = req.tipoProducto === 'TERMOENCOGIBLE';
                                      if (realBatches.length === 0 && !prod[activePhaseTab]?.isClosed && !prod[activePhaseTab]?.skipped) return null;
                                      return (
                                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                                          <div className="text-[9px] font-black text-gray-600 uppercase mb-2">Lotes registrados en esta fase ({realBatches.length})</div>
                                          {realBatches.map((b, i)=>{
                                            const batchIdx = (prod[activePhaseTab]?.batches||[]).findIndex(x=>x.id===b.id);
                                            return (
                                              <div key={b.id||i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 mb-1 text-[9px] gap-2">
                                                <span className="font-black text-gray-700 shrink-0">Lote {i+1} — {b.date}</span>
                                                <span className="font-bold text-green-600">{formatNum(b.producedKg)} KG prod.</span>
                                                {(() => {
                                                  const pct = parseNum(b.mermaPorc||0);
                                                  const col = pct<=5?'text-green-600':pct<=7?'text-yellow-600':'text-red-600';
                                                  const ico = pct<=5?'🟢':pct<=7?'🟡':'🔴';
                                                  return <span className={`font-bold ${col}`}>{formatNum(b.mermaKg)} KG merma{pct>0?` (${pct}% ${ico})`:''}</span>;
                                                })()}
                                                {!esTermo && b.techParams?.millares > 0 && <span className="font-bold text-blue-600">{formatNum(b.techParams.millares)} Mill.</span>}
                                                <div className="flex gap-1 shrink-0">
                                                  <button onClick={()=>requireAdminPassword(()=>handleEditBatch(req.id, activePhaseTab, b.id),'Editar lote de producción')} className="p-1 bg-orange-50 text-orange-500 rounded hover:bg-orange-500 hover:text-white transition-all" title="Editar lote"><Edit size={10}/></button>
                                                  <button onClick={()=>requireAdminPassword(()=>handleDeleteBatch(req.id, activePhaseTab, b.id),'Eliminar lote de producción')} className="p-1 bg-red-50 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all" title="Eliminar lote"><Trash2 size={10}/></button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                          {prod[activePhaseTab]?.isClosed && (
                                            <div className="text-[9px] font-black text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 mt-1 text-center">✓ FASE CERRADA — puede reabrirla sin afectar otras fases</div>
                                          )}
                                          {prod[activePhaseTab]?.skipped && (
                                            <div className="text-[9px] font-black text-gray-500 bg-gray-100 border border-gray-200 rounded-lg p-2 mt-1 text-center">FASE OMITIDA</div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    <div className="flex flex-wrap gap-2 justify-between items-center">
                                      {/* OMITIR */}
                                      <button onClick={() => setDialog({
                                        title: `Omitir fase: ${activePhaseTab}`,
                                        text: `Marcar la fase de ${activePhaseTab.toUpperCase()} como OMITIDA? No afecta las otras fases.`,
                                        type: 'confirm',
                                        onConfirm: async () => {
                                          const cur = { ...(req.production?.[activePhaseTab] || { batches: [] }), isClosed: true, skipped: true };
                                          await updateDoc(getDocRef('requirements', req.id), { [`production.${activePhaseTab}`]: cur });
                                          setPhaseForm({...initialPhaseForm, date: getTodayDate()});
                                          setDialog({title:'Fase Omitida', text:`La fase de ${activePhaseTab} fue omitida. Las demas fases no se ven afectadas.`, type:'alert'});
                                        }
                                      })} className="bg-gray-100 text-gray-600 border border-gray-300 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 flex items-center gap-1 transition-all">
                                        <X size={13}/> OMITIR FASE
                                      </button>

                                      <div className="flex gap-2 flex-wrap">
                                        {/* OBSERVACIONES DE FASE */}
                                        <div className="w-full">
                                          <label className="text-[9px] font-black text-gray-600 uppercase block mb-1">📝 Observaciones de la Fase</label>
                                          <textarea value={phaseForm.observaciones} onChange={e=>setPhaseForm({...phaseForm, observaciones: e.target.value})}
                                            className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none bg-white resize-none" rows={2}
                                            placeholder="Ej: turno noche, ajuste de temperatura, incidencia en producción..." />
                                        </div>

                                        {/* REAPERTURA — independiente por fase */}
                                        {prod[activePhaseTab]?.isClosed && (
                                          <button onClick={() => handleReopenPhase(req.id, activePhaseTab)} className="bg-yellow-400 text-yellow-900 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-yellow-500 flex items-center gap-1 shadow-sm transition-all">
                                            <RefreshCw size={13}/> REABRIR FASE
                                          </button>
                                        )}

                                        {/* GUARDAR LOTE */}
                                        {!prod[activePhaseTab]?.isClosed && (
                                          <button onClick={() => handleSavePhaseDirectly(req, false)} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-orange-600 flex items-center gap-1 shadow-md transition-all">
                                            <Save size={13}/> GUARDAR LOTE
                                          </button>
                                        )}

                                        {/* CIERRE DEFINITIVO — solo cierra ESTA fase */}
                                        {!prod[activePhaseTab]?.isClosed && (
                                          <button onClick={() => setDialog({
                                            title: `Cerrar fase ${activePhaseTab.toUpperCase()}`,
                                            text: `Se cerrara unicamente la fase de ${activePhaseTab.toUpperCase()}. Las otras fases no se ven afectadas y la OP seguira activa.`,
                                            type: 'confirm',
                                            onConfirm: () => handleSavePhaseDirectly(req, true)
                                          })} className="bg-gray-800 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-black flex items-center gap-1 shadow-md transition-all">
                                            <CheckCircle2 size={13}/> CIERRE DEFINITIVO FASE
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
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
    if (prodView === 'en_proceso') {
      const activeReqs = (requirements||[]).filter(r => r.status === 'EN PROCESO' || r.status === 'PENDIENTE');
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-orange-50">
              <h2 className="text-xl font-black text-orange-800 uppercase flex items-center gap-3"><BarChart3 className="text-orange-600" size={24}/> Reporte de Producción en Proceso</h2>
              <p className="text-[10px] font-bold text-orange-600 mt-1 uppercase">Acumulado por lotes — materiales usados vs solicitados</p>
            </div>
            <div className="p-6 space-y-8">
              {activeReqs.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><BarChart3 size={40} className="mx-auto mb-3 opacity-30"/><p className="font-black text-xs uppercase">No hay OPs activas</p></div>
              ) : activeReqs.map(req => {
                const lotes = getLotes(req);
                const esTermo = req.tipoProducto === 'TERMOENCOGIBLE';
                // Acumular todos los batches de todos los lotes
                const allLoteBatches = (fase) => lotes.flatMap(l => (l[fase]?.batches||[]).filter(b=>b.operator!=='ALMACÉN (DESPACHO)' && parseNum(b.producedKg)>0).map(b=>({...b,loteNombre:l.nombre,loteId:l.id})));
                const extAll = allLoteBatches('extrusion');
                const impAll = allLoteBatches('impresion');
                const selAll = allLoteBatches('sellado');
                const lastPhBatches = selAll.length>0?selAll:impAll.length>0?impAll:extAll;
                const totalKgProd = lastPhBatches.reduce((s,b)=>s+parseNum(b.producedKg),0);
                const totalMill = lastPhBatches.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0);
                const totalMerma = [...extAll,...impAll,...selAll].reduce((s,b)=>s+parseNum(b.mermaKg||0),0);
                const mpTotal = extAll.reduce((s,b)=>{const ins=(b.insumos||[]).reduce((ss,i)=>ss+parseNum(i.qty),0); return s+(ins>0?ins:parseNum(b.kgRecibidos||0));},0);
                // Materiales despachados vs usados
                const reqApproved = (invRequisitions||[]).filter(r=>r.opId===req.id&&(r.status==='APROBADA'||r.status==='APROBADO'));
                const despachado = {};
                reqApproved.forEach(r=>(r.items||[]).forEach(it=>{ despachado[it.id]=(despachado[it.id]||0)+parseNum(it.qty); }));
                const usadoReal = {};
                [...extAll,...impAll,...selAll].forEach(b=>(b.insumos||[]).forEach(i=>{ usadoReal[i.id]=(usadoReal[i.id]||0)+parseNum(i.qty); }));
                const solicitadoTotal = Object.values(despachado).reduce((s,v)=>s+v,0);
                const usadoTotal = Object.values(usadoReal).reduce((s,v)=>s+v,0);
                const restanteTotal = Math.max(0, solicitadoTotal - usadoTotal);
                return (
                  <div key={req.id} className="border-2 border-orange-200 rounded-2xl overflow-hidden">
                    <div className="bg-orange-600 text-white px-5 py-3 flex justify-between items-center">
                      <div>
                        <span className="font-black text-lg">OP #{String(req.id).replace('OP-','').padStart(5,'0')}</span>
                        <span className="ml-3 font-bold text-orange-100">{req.client}</span>
                        <span className="ml-3 text-[10px] text-orange-200">{req.desc}</span>
                      </div>
                      <div className="flex gap-4 text-right text-xs">
                        <div><span className="text-orange-200 block text-[9px]">Solicitado</span><span className="font-black">{formatNum(req.requestedKg)} KG</span></div>
                        <div><span className="text-orange-200 block text-[9px]">Producido</span><span className="font-black text-green-300">{esTermo?formatNum(totalKgProd)+' KG':formatNum(totalMill)+' Mill.'}</span></div>
                        <div><span className="text-orange-200 block text-[9px]">Merma</span><span className="font-black text-red-300">{formatNum(totalMerma)} KG</span></div>
                        <div><span className="text-orange-200 block text-[9px]">{lotes.length} Lotes</span><span className="font-black">{lotes.filter(l=>l.cerrado).length} cerrados</span></div>
                      </div>
                    </div>
                    {/* Material balance */}
                    {Object.keys(despachado).length > 0 && (
                      <div className="bg-blue-50 border-b border-blue-200 p-4">
                        <h4 className="text-[9px] font-black text-blue-700 uppercase mb-2">📦 Balance de Materiales — Despachado vs Usado</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="text-[9px] font-black uppercase text-blue-600"><th className="text-left p-1">Material</th><th className="text-right p-1">Despachado</th><th className="text-right p-1">Usado Real</th><th className="text-right p-1">Restante</th><th className="text-right p-1">% Uso</th></tr></thead>
                            <tbody>
                              {Object.entries(despachado).map(([id, desp])=>{
                                const inv = (inventory||[]).find(i=>i.id===id);
                                const usado = usadoReal[id]||0;
                                const rest = Math.max(0, desp-usado);
                                const pct = desp>0?(usado/desp*100).toFixed(1):0;
                                return (
                                  <tr key={id} className="border-t border-blue-100">
                                    <td className="p-1 font-bold text-blue-800">{id} <span className="text-gray-500 font-normal">{inv?.desc||''}</span></td>
                                    <td className="p-1 text-right font-black">{formatNum(desp)} KG</td>
                                    <td className="p-1 text-right font-black text-orange-700">{formatNum(usado)} KG</td>
                                    <td className={`p-1 text-right font-black ${rest<=0?'text-red-600':'text-green-700'}`}>{formatNum(rest)} KG</td>
                                    <td className="p-1 text-right">
                                      <div className="flex items-center gap-1 justify-end">
                                        <div className="w-16 bg-gray-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${parseNum(pct)>90?'bg-red-500':parseNum(pct)>60?'bg-yellow-500':'bg-green-500'}`} style={{width:`${Math.min(100,pct)}%`}}></div></div>
                                        <span className="font-black text-[9px]">{pct}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {/* Lotes */}
                    <div className="p-4 space-y-3">
                      {lotes.map((lote,li)=>{
                        const lExt=(lote.extrusion?.batches||[]).filter(b=>b.operator!=='ALMACÉN (DESPACHO)'&&parseNum(b.producedKg)>0);
                        const lImp=(lote.impresion?.batches||[]).filter(b=>b.operator!=='ALMACÉN (DESPACHO)'&&parseNum(b.producedKg)>0);
                        const lSel=(lote.sellado?.batches||[]).filter(b=>b.operator!=='ALMACÉN (DESPACHO)'&&parseNum(b.producedKg)>0);
                        const lLast=lSel.length>0?lSel:lImp.length>0?lImp:lExt;
                        const lKgProd=lLast.reduce((s,b)=>s+parseNum(b.producedKg),0);
                        const lMill=lLast.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0);
                        const lMerma=[...lExt,...lImp,...lSel].reduce((s,b)=>s+parseNum(b.mermaKg||0),0);
                        const lMP=lExt.reduce((s,b)=>{const ins=(b.insumos||[]).reduce((ss,i)=>ss+parseNum(i.qty),0);return s+(ins>0?ins:parseNum(b.kgRecibidos||0));},0);
                        const totalFaseBatches=[...lExt,...lImp,...lSel].length;
                        return (
                          <div key={lote.id} className={`rounded-xl border-2 ${lote.cerrado?'border-green-300 bg-green-50':'border-orange-200 bg-orange-50'}`}>
                            <div className="flex justify-between items-center px-4 py-2">
                              <div className="flex items-center gap-3">
                                <span className={`font-black text-sm ${lote.cerrado?'text-green-700':'text-orange-700'}`}>{lote.nombre} {lote.cerrado?'✓ CERRADO':'⏳ EN PROCESO'}</span>
                                <span className="text-[9px] text-gray-500">{lote.fechaCreacion}</span>
                              </div>
                              <div className="flex gap-4 text-xs">
                                <span className="font-bold text-green-700">{esTermo?formatNum(lKgProd)+' KG':formatNum(lMill)+' Mill.'}</span>
                                <span className="font-bold text-red-600">Merma: {formatNum(lMerma)} KG</span>
                                <span className="text-gray-500">{totalFaseBatches} registros</span>
                              </div>
                            </div>
                            {totalFaseBatches > 0 && (
                              <div className="px-4 pb-3">
                                <table className="w-full text-xs">
                                  <thead><tr className="text-[8px] font-black uppercase text-gray-500"><th className="text-left pb-1">Fase</th><th className="text-center pb-1">Fecha</th><th className="text-center pb-1">KG Prod.</th><th className="text-center pb-1">Merma</th><th className="text-center pb-1">Millares</th><th className="text-left pb-1">Obs.</th></tr></thead>
                                  <tbody>
                                    {[...lExt.map(b=>({...b,fase:'EXTRUSIÓN'})),...lImp.map(b=>({...b,fase:'IMPRESIÓN'})),...lSel.map(b=>({...b,fase:'SELLADO'}))].map((b,bi)=>(
                                      <tr key={bi} className="border-t border-gray-100">
                                        <td className="py-1 font-bold">{b.fase}</td>
                                        <td className="py-1 text-center text-gray-500">{b.date}</td>
                                        <td className="py-1 text-center font-black text-green-700">{formatNum(b.producedKg)}</td>
                                        <td className="py-1 text-center text-red-600">{formatNum(b.mermaKg)} ({b.mermaPorc}%)</td>
                                        <td className="py-1 text-center text-blue-600">{parseNum(b.techParams?.millares||0)>0?formatNum(b.techParams.millares):'—'}</td>
                                        <td className="py-1 text-[9px] text-indigo-600">{b.observaciones||''}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {lotes.length === 0 && <div className="text-center py-4 text-gray-400 text-xs">Sin lotes creados. Haga clic en "REGISTRAR FASE" para iniciar.</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (prodView === 'reportes') {
      const completedReqs = (requirements||[]).filter(r => r.status === 'COMPLETADO');
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-black uppercase flex items-center gap-3"><History className="text-gray-500" size={24}/> Historial de Producción / Reportes</h2>
                <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase">{completedReqs.length} órdenes completadas</p>
              </div>
              <button onClick={() => handleExportPDF('Historial_Produccion', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-gray-800"><Printer size={16}/> Imprimir</button>
            </div>
            <div className="p-6" id="pdf-content">
              <div className="hidden pdf-header mb-6"><ReportHeader /><h1 className="text-xl font-black uppercase border-b-4 border-orange-500 pb-2">HISTORIAL DE PRODUCCIÓN</h1></div>
              {completedReqs.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><History size={48} className="mx-auto mb-4 opacity-30"/><p className="font-black text-xs uppercase">No hay producción finalizada</p></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 border-b-2 border-gray-200">
                      <tr className="uppercase font-black text-[10px] tracking-widest text-gray-600">
                        <th className="py-3 px-4 border-r">OP / Fecha</th>
                        <th className="py-3 px-4 border-r">Cliente</th>
                        <th className="py-3 px-4 border-r">Producto / Specs</th>
                        <th className="py-3 px-4 border-r text-center">KG Solicitados</th>
                        <th className="py-3 px-4 border-r text-center">KG Producidos</th>
                        <th className="py-3 px-4 border-r text-center">Millares</th>
                        <th className="py-3 px-4 text-center">Reporte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {completedReqs.map(req => {
                        const prod = req.production || {};
                        const fr = b => b.operator !== 'ALMACÉN (DESPACHO)' && parseNum(b.producedKg)>0;
                        const sB=(prod.sellado?.batches||[]).filter(fr);
                        const iB=(prod.impresion?.batches||[]).filter(fr);
                        const eB=(prod.extrusion?.batches||[]).filter(fr);
                        const lastB = sB.length>0?sB:iB.length>0?iB:eB;
                        const totalKg = lastB.reduce((s,b)=>s+parseNum(b.producedKg),0);
                        const totalMill = sB.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)||iB.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)||eB.reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0);
                        return (
                          <tr key={req.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 border-r font-black text-orange-600">#{String(req.id).replace('OP-','').padStart(5,'0')}<br/><span className="text-[9px] text-gray-400">{req.fecha}</span></td>
                            <td className="py-3 px-4 border-r font-bold uppercase">{req.client}</td>
                            <td className="py-3 px-4 border-r font-bold">{req.desc}<br/><span className="text-[9px] text-gray-400">{req.ancho}×{req.largo}cm | {req.micras}mic | {req.color}</span></td>
                            <td className="py-3 px-4 border-r text-center font-black text-blue-600">{formatNum(req.requestedKg)}</td>
                            <td className="py-3 px-4 border-r text-center font-black text-green-600">{formatNum(totalKg)}</td>
                            <td className="py-3 px-4 border-r text-center font-bold">{req.tipoProducto === 'TERMOENCOGIBLE' ? <span className="text-[9px] text-gray-400">— KG</span> : (totalMill > 0 ? formatNum(totalMill) : '—')}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <button onClick={() => setShowFiniquitoOP(req.id)} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase hover:bg-orange-600 transition-all flex items-center gap-1"><FileText size={12}/> VER REPORTE</button>
                                <button onClick={() => requireAdminPassword(async () => {
                                  await updateDoc(getDocRef('requirements', req.id), { status: 'EN PROCESO', fechaReapertura: getTodayDate(), reabiertoPor: appUser?.name });
                                  setDialog({ title: '✅ OP Reabierta', text: `La OP #${String(req.id).replace('OP-','').padStart(5,'0')} fue reabierta. Puede modificar y registrar fases nuevamente.`, type: 'alert' });
                                }, 'Reabrir OP Completada')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-blue-700 transition-all flex items-center gap-1"><Edit size={12}/> REABRIR</button>
                              </div>
                            </td>
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
    const selCompletedOPs = (requirements||[]).filter(r => r.status === 'COMPLETADO');

    // Mermas del mes
    const selMermaKg = (requirements||[]).filter(r => (r.fecha||'').startsWith(selMonth)).reduce((s, req) => {
      const prod = req.production || {};
      return s + [...(prod.extrusion?.batches||[]), ...(prod.impresion?.batches||[]), ...(prod.sellado?.batches||[])].reduce((sb, b) => sb + parseNum(b.mermaKg||0), 0);
    }, 0);

    const MONTH_NAMES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const tasa = parseNum(erTasa) || 1;
    const ymA = `${erAno}-${String(erMes).padStart(2,'0')}`;
    const dataA = calcEstadoData(ymA);
    const dataB = calcEstadoData(varMesB);
    const bs = (usd) => formatNum(usd * tasa);
    const pctOf = (val, base) => base !== 0 ? ((val/base)*100).toFixed(2)+'%' : '0.00%';

    const REPORT_CARDS = [
      { id: 'general', icon: <FileText size={26}/>, label: 'Reporte General', desc: 'Resumen completo del periodo', color: 'blue' },
      { id: 'ingresos_vs_costos', icon: <BarChart3 size={26}/>, label: 'Ingresos vs Costos', desc: 'Comparativo 12 meses', color: 'green' },
      { id: 'mermas', icon: <AlertTriangle size={26}/>, label: 'Mermas', desc: 'Perdidas y desperdicios', color: 'orange' },
      { id: 'super_finiquito', icon: <FileCheck size={26}/>, label: 'Finiquito por OP', desc: 'Por orden individual', color: 'purple' },
      { id: 'estado_financiero', icon: <TrendingUp size={26}/>, label: 'Estado Financiero', desc: 'Estado de resultado integral', color: 'gray' },
      { id: 'variaciones', icon: <TrendingDown size={26}/>, label: 'Variaciones', desc: 'Mes actual vs anterior', color: 'red' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-2xl font-black text-black uppercase flex items-center gap-3"><BarChart3 className="text-blue-600" size={32}/> Reportes Financieros / Rentabilidad</h2>
            <p className="text-xs font-bold text-gray-500 uppercase mt-2">Dashboard de Ingresos, Costos y Utilidad</p>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {REPORT_CARDS.map(card => (
                  <button key={card.id} onClick={() => { setShowReportType(card.id); setShowFiniquitoOP(null); }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${showReportType === card.id ? 'border-orange-400 bg-orange-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className={`mb-2 ${showReportType===card.id?'text-orange-500':'text-gray-400'}`}>{card.icon}</div>
                    <div className="font-black text-[10px] uppercase text-black leading-tight">{card.label}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{card.desc}</div>
                  </button>
                ))}
              </div>
              {/* Estado de Resultado y Libro Diario — abre como módulo separado */}
              <div className="flex gap-3 mt-3">
                <button onClick={() => setActiveTab('estado_resultado')}
                  className="px-5 py-2.5 rounded-xl border-2 border-indigo-200 bg-indigo-50 text-indigo-700 font-black text-[10px] uppercase hover:bg-indigo-100 flex items-center gap-2 transition-all">
                  <TrendingUp size={14}/> Estado de Resultado
                </button>
                <button onClick={() => setActiveTab('libro_diario')}
                  className="px-5 py-2.5 rounded-xl border-2 border-teal-200 bg-teal-50 text-teal-700 font-black text-[10px] uppercase hover:bg-teal-100 flex items-center gap-2 transition-all">
                  <ArrowRightLeft size={14}/> Libro Diario
                </button>
              </div>
            </div>

            {['general','ingresos_vs_costos','mermas','super_finiquito'].includes(showReportType) && (
              <div className="flex gap-4 items-center">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes de Analisis</label>
                  <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border-2 border-gray-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-blue-500" />
                </div>
              </div>
            )}

            {showReportType === 'general' && (
              <div id="pdf-content" className="space-y-6">
                <div className="flex justify-between items-center no-pdf">
                  <h3 className="text-lg font-black uppercase">Reporte General — {selMonth.replace('-', '/')}</h3>
                  <button onClick={() => handleExportPDF('Reporte_General_Financiero', false)} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-gray-800"><Printer size={16}/> Imprimir</button>
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
                  <button onClick={() => handleExportPDF('Ingresos_vs_Costos', true)} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-gray-800"><Printer size={16}/> Imprimir</button>
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

            {showReportType === 'mermas' && (() => {
              // Construir datos de merma agrupados por OP
              const mermaRows = [];
              (requirements||[]).filter(r => {
                const fechaOk = (r.fecha||'').startsWith(selMonth) ||
                  Object.values(r.production||{}).some(ph => (ph.batches||[]).some(b => (b.date||'').startsWith(selMonth)));
                return fechaOk;
              }).forEach(req => {
                const prod = req.production || {};
                ['extrusion','impresion','sellado'].forEach(phase => {
                  (prod[phase]?.batches||[]).filter(b => parseNum(b.mermaKg) > 0 && (b.date||'').startsWith(selMonth)).forEach((b, i) => {
                    const kgUsados = parseNum(b.totalInsumosKg || b.kgRecibidos || 0);
                    const mermaKg = parseNum(b.mermaKg);
                    const pct = kgUsados > 0 ? ((mermaKg / kgUsados) * 100).toFixed(1) : b.mermaPorc > 0 ? b.mermaPorc : 0;
                    // Estimar costo merma: mermaKg * costo promedio de insumos del lote
                    const costoPromLote = kgUsados > 0 && parseNum(b.cost) > 0 ? parseNum(b.cost) / kgUsados : 0;
                    const costoMerma = mermaKg * costoPromLote;
                    mermaRows.push({
                      opId: req.id, opNum: String(req.id).replace('OP-','').padStart(5,'0'),
                      client: req.client, phase, date: b.date, mermaKg, kgUsados,
                      pct: parseFloat(pct), costoMerma,
                      // Desglose de reciclado
                      troquelTransp: parseNum(b.mermaDetalle?.troquelTransp||0),
                      troquelPigm:   parseNum(b.mermaDetalle?.troquelPigm||0),
                      torta:         parseNum(b.mermaDetalle?.torta||0),
                    });
                  });
                });
              });

              // Agrupar por OP
              const byOP = {};
              mermaRows.forEach(r => {
                if (!byOP[r.opId]) byOP[r.opId] = { opId: r.opId, opNum: r.opNum, client: r.client, rows: [], totalMermaKg: 0, totalKgUsados: 0, totalCosto: 0, totalTransp: 0, totalPigm: 0, totalTorta: 0 };
                byOP[r.opId].rows.push(r);
                byOP[r.opId].totalMermaKg += r.mermaKg;
                byOP[r.opId].totalKgUsados += r.kgUsados;
                byOP[r.opId].totalCosto += r.costoMerma;
                byOP[r.opId].totalTransp += r.troquelTransp;
                byOP[r.opId].totalPigm += r.troquelPigm;
                byOP[r.opId].totalTorta += r.torta;
              });
              const opGroups = Object.values(byOP).sort((a,b) => a.opNum.localeCompare(b.opNum));

              // Totales globales
              const grandMermaKg = mermaRows.reduce((s,r)=>s+r.mermaKg,0);
              const grandKgUsados = mermaRows.reduce((s,r)=>s+r.kgUsados,0);
              const grandPct = grandKgUsados > 0 ? ((grandMermaKg/grandKgUsados)*100).toFixed(1) : 0;
              const grandCosto = mermaRows.reduce((s,r)=>s+r.costoMerma,0);

              // OPs únicas para filtro
              const opOptions = ['TODAS', ...opGroups.map(g=>`#${g.opNum} — ${g.client}`)];
              const filteredGroups = mermaOpFilter === 'TODAS' ? opGroups : opGroups.filter(g=>`#${g.opNum} — ${g.client}` === mermaOpFilter);

              return (
                <div id="pdf-content" className="space-y-6">
                  <div className="flex justify-between items-center no-pdf">
                    <h3 className="text-lg font-black uppercase">Análisis de Mermas — {selMonth.replace('-', '/')}</h3>
                    <button onClick={() => handleExportPDF('Analisis_Mermas', false)} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-gray-800"><Printer size={16}/> Imprimir</button>
                  </div>
                  <div className="hidden pdf-header mb-6"><ReportHeader /><h1 className="text-xl font-black uppercase border-b-4 border-orange-500 pb-2">ANÁLISIS DE MERMAS — {selMonth}</h1></div>

                  {/* KPIs globales */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
                      <span className="text-[10px] font-black text-orange-700 uppercase block mb-1">Total Merma KG (Mes)</span>
                      <span className="text-3xl font-black text-orange-600">{formatNum(grandMermaKg)} <span className="text-sm">KG</span></span>
                    </div>
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                      <span className="text-[10px] font-black text-red-700 uppercase block mb-1">Costo Estimado Merma</span>
                      <span className="text-3xl font-black text-red-600">${formatNum(grandCosto)}</span>
                    </div>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
                      <span className="text-[10px] font-black text-yellow-700 uppercase block mb-1">% Merma Global del Mes</span>
                      <span className="text-3xl font-black text-yellow-600">{grandPct}<span className="text-xl">%</span></span>
                      <span className="text-[9px] font-bold text-yellow-600 block mt-1">({formatNum(grandMermaKg)} KG de {formatNum(grandKgUsados)} KG usados)</span>
                    </div>
                  </div>

                  {/* Filtro por OP — dropdown */}
                  <div className="flex items-center gap-3 no-pdf">
                    <span className="text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">Filtrar por OP:</span>
                    <select value={mermaOpFilter} onChange={e=>setMermaOpFilter(e.target.value)}
                      className="bg-white border-2 border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black text-black outline-none focus:border-orange-500 min-w-[280px]">
                      {opOptions.map(op=>(
                        <option key={op} value={op}>
                          {op === 'TODAS' ? `Todas las OPs (${opGroups.length})` : op}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tabla agrupada por OP */}
                  {filteredGroups.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-bold uppercase text-xs border border-gray-200 rounded-2xl">
                      Sin mermas registradas en este período
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredGroups.map(group => {
                        const groupPct = group.totalKgUsados > 0 ? ((group.totalMermaKg/group.totalKgUsados)*100).toFixed(1) : 0;
                        return (
                          <div key={group.opId} className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            {/* Encabezado de OP */}
                            <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <span className="font-black text-orange-400 text-sm">OP #{group.opNum}</span>
                                <span className="font-bold text-white uppercase text-xs">{group.client}</span>
                              </div>
                              <div className="flex gap-6 text-right">
                                <div><span className="text-[9px] text-gray-400 block">Total Merma</span><span className="font-black text-orange-400">{formatNum(group.totalMermaKg)} KG</span></div>
                                <div><span className="text-[9px] text-gray-400 block">% Merma OP</span><span className={`font-black text-lg ${parseFloat(groupPct)>5?'text-red-400':'text-yellow-300'}`}>{groupPct}%</span></div>
                                {group.totalTransp>0&&<div><span className="text-[9px] text-blue-300 block">Rec. Transp.</span><span className="font-black text-blue-300">{formatNum(group.totalTransp)} KG</span></div>}
                                {group.totalPigm>0&&<div><span className="text-[9px] text-orange-300 block">Rec. Pigm.</span><span className="font-black text-orange-300">{formatNum(group.totalPigm)} KG</span></div>}
                                {group.totalTorta>0&&<div><span className="text-[9px] text-amber-300 block">Rec. Torta</span><span className="font-black text-amber-300">{formatNum(group.totalTorta)} KG</span></div>}
                                <div><span className="text-[9px] text-gray-400 block">Costo Merma</span><span className="font-black text-red-400">${formatNum(group.totalCosto)}</span></div>
                              </div>
                            </div>
                            {/* Filas de lotes */}
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr className="uppercase font-black text-[9px] text-gray-500 border-b border-gray-200">
                                  <th className="py-2 px-4 border-r text-left">Fase</th>
                                  <th className="py-2 px-4 border-r text-center">Fecha</th>
                                  <th className="py-2 px-4 border-r text-center">KG Usados</th>
                                  <th className="py-2 px-4 border-r text-center">Merma KG</th>
                                  <th className="py-2 px-4 border-r text-center">% Merma</th>
                                  <th className="py-2 px-4 border-r text-center">♻ Transp.</th>
                                  <th className="py-2 px-4 border-r text-center">♻ Pigm.</th>
                                  <th className="py-2 px-4 border-r text-center">♻ Torta</th>
                                  <th className="py-2 px-4 text-right">Costo Merma ($)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {group.rows.map((r, i) => (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-r font-bold capitalize text-gray-700">{r.phase}</td>
                                    <td className="py-2 px-4 border-r text-center font-bold text-gray-500">{r.date}</td>
                                    <td className="py-2 px-4 border-r text-center font-black text-blue-600">{formatNum(r.kgUsados)} KG</td>
                                    <td className="py-2 px-4 border-r text-center font-black text-red-600">{formatNum(r.mermaKg)} KG</td>
                                    <td className="py-2 px-4 border-r text-center">
                                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${r.pct > 5 ? 'bg-red-100 text-red-700' : r.pct > 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        {r.pct}%
                                      </span>
                                    </td>
                                    <td className="py-2 px-4 border-r text-center font-bold text-blue-600">{r.troquelTransp>0?`${formatNum(r.troquelTransp)} KG (${r.kgUsados>0?((r.troquelTransp/r.kgUsados)*100).toFixed(1):0}%)`:'—'}</td>
                                    <td className="py-2 px-4 border-r text-center font-bold text-orange-600">{r.troquelPigm>0?`${formatNum(r.troquelPigm)} KG (${r.kgUsados>0?((r.troquelPigm/r.kgUsados)*100).toFixed(1):0}%)`:'—'}</td>
                                    <td className="py-2 px-4 border-r text-center font-bold text-amber-600">{r.torta>0?`${formatNum(r.torta)} KG (${r.kgUsados>0?((r.torta/r.kgUsados)*100).toFixed(1):0}%)`:'—'}</td>
                                    <td className="py-2 px-4 text-right font-black text-red-500">${formatNum(r.costoMerma)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-orange-50 border-t-2 border-orange-200">
                                <tr className="font-black text-[10px]">
                                  <td colSpan="2" className="py-2 px-4 text-right uppercase text-gray-600">Subtotal OP #{group.opNum}:</td>
                                  <td className="py-2 px-4 text-center text-blue-700">{formatNum(group.totalKgUsados)} KG</td>
                                  <td className="py-2 px-4 text-center text-red-700">{formatNum(group.totalMermaKg)} KG</td>
                                  <td className="py-2 px-4 text-center text-orange-700">{groupPct}%</td>
                                  <td className="py-2 px-4 text-center text-blue-700">{group.totalTransp>0?`${formatNum(group.totalTransp)} KG (${group.totalKgUsados>0?((group.totalTransp/group.totalKgUsados)*100).toFixed(1):0}%)`:'—'}</td>
                                  <td className="py-2 px-4 text-center text-orange-700">{group.totalPigm>0?`${formatNum(group.totalPigm)} KG (${group.totalKgUsados>0?((group.totalPigm/group.totalKgUsados)*100).toFixed(1):0}%)`:'—'}</td>
                                  <td className="py-2 px-4 text-center text-amber-700">{group.totalTorta>0?`${formatNum(group.totalTorta)} KG (${group.totalKgUsados>0?((group.totalTorta/group.totalKgUsados)*100).toFixed(1):0}%)`:'—'}</td>
                                  <td className="py-2 px-4 text-right text-red-700">${formatNum(group.totalCosto)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        );
                      })}

                      {/* Gran Total */}
                      <div className="bg-black text-white rounded-2xl p-4 flex justify-between items-center flex-wrap gap-3">
                        <span className="font-black uppercase text-sm">Gran Total — {filteredGroups.length} OP{filteredGroups.length!==1?'s':''}</span>
                        <div className="flex gap-6 text-right flex-wrap">
                          <div><span className="text-[9px] text-gray-400 block">KG Usados</span><span className="font-black">{formatNum(filteredGroups.reduce((s,g)=>s+g.totalKgUsados,0))} KG</span></div>
                          <div><span className="text-[9px] text-gray-400 block">Total Merma</span><span className="font-black text-orange-400">{formatNum(filteredGroups.reduce((s,g)=>s+g.totalMermaKg,0))} KG</span></div>
                          <div><span className="text-[9px] text-gray-400 block">% Global</span><span className="font-black text-yellow-400 text-lg">{grandPct}%</span></div>
                          {filteredGroups.reduce((s,g)=>s+g.totalTransp,0)>0&&<div><span className="text-[9px] text-blue-300 block">♻ Transp.</span><span className="font-black text-blue-300">{formatNum(filteredGroups.reduce((s,g)=>s+g.totalTransp,0))} KG</span></div>}
                          {filteredGroups.reduce((s,g)=>s+g.totalPigm,0)>0&&<div><span className="text-[9px] text-orange-300 block">♻ Pigm.</span><span className="font-black text-orange-300">{formatNum(filteredGroups.reduce((s,g)=>s+g.totalPigm,0))} KG</span></div>}
                          {filteredGroups.reduce((s,g)=>s+g.totalTorta,0)>0&&<div><span className="text-[9px] text-amber-300 block">♻ Torta</span><span className="font-black text-amber-300">{formatNum(filteredGroups.reduce((s,g)=>s+g.totalTorta,0))} KG</span></div>}
                          <div><span className="text-[9px] text-gray-400 block">Costo Total</span><span className="font-black text-red-400">${formatNum(filteredGroups.reduce((s,g)=>s+g.totalCosto,0))}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {showReportType === 'super_finiquito' && (
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase">Súper Finiquito por OP — Seleccione una orden</h3>
                {showFiniquitoOP ? (
                  renderFiniquitoOP(requirements.find(r=>r.id===showFiniquitoOP), true)
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-[10px]"><th className="py-3 px-4 border-r">OP / Fecha</th><th className="py-3 px-4 border-r">Cliente</th><th className="py-3 px-4 border-r">Producto</th><th className="py-3 px-4 border-r text-right">Millares</th><th className="py-3 px-4 border-r text-right">Costo MP</th><th className="py-3 px-4 border-r text-right">Ingresos</th><th className="py-3 px-4 border-r text-right">Utilidad</th><th className="py-3 px-4 text-center">Finiquito</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {selCompletedOPs.length === 0 ? <tr><td colSpan="8" className="p-8 text-center text-gray-400 font-bold uppercase">No hay órdenes completadas</td></tr> :
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
                                <td className={`py-3 px-4 border-r text-right font-black text-lg ${fin.utilidad >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${formatNum(fin.utilidad)}</td>
                                <td className="py-3 px-4 text-center"><button onClick={() => setShowFiniquitoOP(req.id)} className="px-3 py-1 bg-orange-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-orange-600 flex items-center gap-1 mx-auto"><FileText size={10}/> VER</button></td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ESTADO FINANCIERO ── */}
            {showReportType === 'estado_financiero' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes</label>
                    <select value={erMes} onChange={e=>setErMes(parseInt(e.target.value))} className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none bg-white">
                      {MONTH_NAMES_ES.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Año</label>
                    <input type="number" value={erAno} onChange={e=>setErAno(parseInt(e.target.value))} className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none w-24 text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Tasa Bs/$</label>
                    <input type="number" step="0.01" value={erTasa} onChange={e=>setErTasa(e.target.value)} placeholder="392.00" className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none w-28 text-center" />
                  </div>
                  <button onClick={()=>handleExportPDF('Estado_Resultado_Integral', false)} className="bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-gray-800"><Printer size={14}/> Imprimir</button>
                </div>
                <div id="pdf-content" className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="hidden pdf-header p-6 border-b-2 border-gray-300">
                    <ReportHeader />
                    <h1 className="text-2xl font-black text-center uppercase border-b-4 border-orange-500 pb-2 mt-4">ESTADO DE RESULTADO INTEGRAL</h1>
                    <p className="text-xs text-center font-bold text-gray-500 mt-1">PERIODO: {MONTH_NAMES_ES[erMes-1]} {erAno}{tasa>1?` | TASA: ${formatNum(tasa)} Bs/$`:''}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-0 border-b-2 border-gray-200">
                    <div className="p-5 border-r border-gray-200 text-center">
                      <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Ingresos</div>
                      <div className="font-black text-xl text-green-600">${formatNum(dataA.totalIngresos)}</div>
                      {tasa>1&&<div className="text-[9px] text-green-500 font-bold">Bs. {bs(dataA.totalIngresos)}</div>}
                    </div>
                    <div className="p-5 border-r border-gray-200 text-center">
                      <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Costos</div>
                      <div className="font-black text-xl text-red-600">${formatNum(dataA.totalCostos)}</div>
                      {tasa>1&&<div className="text-[9px] text-red-500 font-bold">Bs. {bs(dataA.totalCostos)}</div>}
                    </div>
                    <div className={`p-5 text-center ${dataA.resultado>=0?'bg-green-50':'bg-red-50'}`}>
                      <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Resultado del Ejercicio</div>
                      <div className={`font-black text-2xl ${dataA.resultado>=0?'text-green-700':'text-red-700'}`}>${formatNum(dataA.resultado)}</div>
                      {tasa>1&&<div className={`text-xs font-black ${dataA.resultado>=0?'text-green-600':'text-red-600'}`}>Bs. {bs(dataA.resultado)}</div>}
                    </div>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="py-2 px-4 text-left font-black uppercase text-[9px]">Cuenta / Concepto</th>
                        <th className="py-2 px-3 text-center font-black text-[9px] w-14">UM</th>
                        <th className="py-2 px-3 text-right font-black text-[9px] w-28">Saldo USD</th>
                        <th className="py-2 px-3 text-center font-black text-[9px] w-14">%</th>
                        {tasa>1&&<th className="py-2 px-3 text-right font-black text-[9px] w-32">Saldo Bs.</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {/* ── INGRESOS ── */}
                      <tr className="bg-orange-500 text-white"><td className="py-2.5 px-4 font-black text-sm uppercase" colSpan={tasa>1?5:4}>INGRESOS</td></tr>
                      <tr className="bg-orange-50"><td className="py-1.5 px-4 font-black text-[10px] uppercase pl-8 text-orange-800" colSpan={tasa>1?5:4}>VENTAS BRUTAS</td></tr>
                      {dataA.facturasperiodo.length>0 ? (
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-bold text-[10px] pl-14">
                            <span className="text-orange-600 font-black mr-2">4.1.01.01.000</span>
                            INGRESOS POR MAQUILA
                          </td>
                          <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td>
                          <td className="py-2 px-3 text-right font-black">{formatNum(dataA.totalIngresos)}</td>
                          <td className="py-2 px-3 text-center text-[9px]">100.00%</td>
                          {tasa>1&&<td className="py-2 px-3 text-right font-bold text-gray-600">{bs(dataA.totalIngresos)}</td>}
                        </tr>
                      ) : <tr><td className="py-2 px-4 pl-14 text-[10px] text-gray-400 italic" colSpan={tasa>1?5:4}>Sin ingresos en este periodo</td></tr>}
                      <tr className="bg-orange-100">
                        <td className="py-2.5 px-4 text-[10px] uppercase pl-8 text-orange-800 font-black" colSpan={2}>Total INGRESOS</td>
                        <td className="py-2.5 px-3 text-right font-black text-orange-700">{formatNum(dataA.totalIngresos)}</td>
                        <td className="py-2.5 px-3 text-center text-[9px] font-black">100.00%</td>
                        {tasa>1&&<td className="py-2.5 px-3 text-right font-black text-orange-700">{bs(dataA.totalIngresos)}</td>}
                      </tr>

                      <tr><td colSpan={tasa>1?5:4} className="py-2"></td></tr>

                      {/* ── COSTOS ── */}
                      <tr className="bg-gray-800 text-white"><td className="py-2.5 px-4 font-black text-sm uppercase" colSpan={tasa>1?5:4}>COSTOS</td></tr>

                      {/* Costo produccion */}
                      <tr className="bg-gray-200"><td className="py-1.5 px-4 font-black text-[10px] uppercase pl-8 text-gray-700" colSpan={tasa>1?5:4}>COSTO DE PRODUCCION</td></tr>
                      {dataA.movsProd.length>0 ? dataA.movsProd.map((m,i)=>(
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-bold text-[10px] pl-14">{m.itemName} ({m.reference})</td>
                          <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td>
                          <td className="py-2 px-3 text-right font-black">{formatNum(parseNum(m.totalValue))}</td>
                          <td className="py-2 px-3 text-center text-[9px]">{pctOf(parseNum(m.totalValue),dataA.totalIngresos)}</td>
                          {tasa>1&&<td className="py-2 px-3 text-right font-bold text-gray-600">{bs(parseNum(m.totalValue))}</td>}
                        </tr>
                      )) : <tr><td className="py-2 px-4 pl-14 text-[10px] text-gray-400 italic" colSpan={tasa>1?5:4}>Sin movimientos de produccion</td></tr>}
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <td className="py-2 px-4 text-[10px] uppercase pl-8 font-black text-gray-700" colSpan={2}>Total COSTO PRODUCCION</td>
                        <td className="py-2 px-3 text-right font-black">{formatNum(dataA.totalCostoProd)}</td>
                        <td className="py-2 px-3 text-center text-[9px] font-black">{pctOf(dataA.totalCostoProd,dataA.totalIngresos)}</td>
                        {tasa>1&&<td className="py-2 px-3 text-right font-black">{bs(dataA.totalCostoProd)}</td>}
                      </tr>

                      {/* Costos Operativos — FLAT, sin subtotales por subgrupo */}
                      {Object.values(dataA.costosPorCuenta).length > 0 && (
                        <>
                          <tr className="bg-gray-200"><td className="py-1.5 px-4 font-black text-[10px] uppercase pl-8 text-gray-700" colSpan={tasa>1?5:4}>OTROS COSTOS OPERATIVOS</td></tr>
                          {Object.values(dataA.costosPorCuenta).map((c,i)=>(
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-4 font-bold text-[10px] pl-14">
                                {c.codigo&&<span className="text-orange-600 font-black mr-2">{c.codigo}</span>}
                                {c.nombre}
                              </td>
                              <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td>
                              <td className="py-2 px-3 text-right font-black">{formatNum(c.total)}</td>
                              <td className="py-2 px-3 text-center text-[9px]">{pctOf(c.total,dataA.totalIngresos)}</td>
                              {tasa>1&&<td className="py-2 px-3 text-right font-bold text-gray-600">{bs(c.total)}</td>}
                            </tr>
                          ))}
                          <tr className="bg-gray-100 border-b border-gray-300">
                            <td className="py-2 px-4 text-[10px] uppercase pl-8 font-black text-gray-700" colSpan={2}>Total OTROS COSTOS OPERATIVOS</td>
                            <td className="py-2 px-3 text-right font-black">{formatNum(dataA.totalCostosOp)}</td>
                            <td className="py-2 px-3 text-center text-[9px] font-black">{pctOf(dataA.totalCostosOp,dataA.totalIngresos)}</td>
                            {tasa>1&&<td className="py-2 px-3 text-right font-black">{bs(dataA.totalCostosOp)}</td>}
                          </tr>
                        </>
                      )}

                      {/* Total Costos + Resultado */}
                      <tr className="bg-gray-700 text-white">
                        <td className="py-3 px-4 text-sm uppercase font-black" colSpan={2}>Total COSTOS</td>
                        <td className="py-3 px-3 text-right font-black text-lg">{formatNum(dataA.totalCostos)}</td>
                        <td className="py-3 px-3 text-center text-[9px] font-black">{pctOf(dataA.totalCostos,dataA.totalIngresos)}</td>
                        {tasa>1&&<td className="py-3 px-3 text-right font-black text-lg">{bs(dataA.totalCostos)}</td>}
                      </tr>
                      <tr><td colSpan={tasa>1?5:4} className="py-1"></td></tr>
                      <tr className={dataA.resultado>=0?'bg-green-600 text-white':'bg-red-600 text-white'}>
                        <td className="py-3 px-4 font-black text-sm uppercase" colSpan={2}>RESULTADO DEL EJERCICIO</td>
                        <td className="py-3 px-3 text-right font-black text-xl">${formatNum(dataA.resultado)}</td>
                        <td className="py-3 px-3 text-center font-black">{pctOf(dataA.resultado,dataA.totalIngresos)}</td>
                        {tasa>1&&<td className="py-3 px-3 text-right font-black text-xl">{bs(dataA.resultado)}</td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── VARIACIONES ── */}
            {showReportType === 'variaciones' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes Actual (A)</label>
                    <input type="month" value={varMesA} onChange={e=>setVarMesA(e.target.value)} className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes Anterior (B)</label>
                    <input type="month" value={varMesB} onChange={e=>setVarMesB(e.target.value)} className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none" />
                  </div>
                  <button onClick={()=>handleExportPDF('Variaciones_ER', true)} className="bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-gray-800"><Printer size={14}/> Imprimir</button>
                </div>
                <div id="pdf-content" className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="hidden pdf-header p-6 border-b-2 border-gray-300">
                    <ReportHeader />
                    <h1 className="text-2xl font-black text-center uppercase border-b-4 border-orange-500 pb-2 mt-4">CUADRO COMPARATIVO DE VARIACIONES</h1>
                    <p className="text-xs text-center font-bold text-gray-500 mt-1">Mes A: {varMesA} vs Mes B: {varMesB}</p>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-orange-500 text-white">
                        <th className="py-3 px-4 text-left font-black uppercase text-[9px]" colSpan={2}>Cuenta / Concepto</th>
                        <th className="py-3 px-3 text-center font-black uppercase text-[9px]" colSpan={2}>Mes Actual ({varMesA})</th>
                        <th className="py-3 px-3 text-center font-black uppercase text-[9px]" colSpan={2}>Mes Anterior ({varMesB})</th>
                        <th className="py-3 px-3 text-center font-black uppercase text-[9px]" colSpan={2}>Variacion Absoluta</th>
                        <th className="py-3 px-3 text-center font-black uppercase text-[9px]">Var.%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-orange-100"><td colSpan={9} className="py-2 px-4 font-black uppercase text-orange-800">INGRESOS</td></tr>
                      <tr className="bg-orange-50"><td colSpan={9} className="py-1.5 px-4 font-black text-[9px] uppercase pl-8 text-orange-700">VENTAS BRUTAS</td></tr>
                      {(()=>{
                        const a=dataA.totalIngresos,b=dataB.totalIngresos,v=a-b,vr=b!==0?((v/b)*100).toFixed(2)+'%':'—';
                        return(<tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-bold text-[10px] uppercase pl-14" colSpan={2}>INGRESOS POR VENTAS / MAQUILA</td>
                          <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td><td className="py-2 px-3 text-right font-black text-green-600">{formatNum(a)}</td>
                          <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(b)}</td>
                          <td className="py-2 px-3 text-center text-[9px] font-black">{v>=0?'▲':'▼'} USD</td>
                          <td className={`py-2 px-3 text-right font-black ${v>=0?'text-green-600':'text-red-600'}`}>{formatNum(Math.abs(v))}</td>
                          <td className={`py-2 px-3 text-center font-black ${v>=0?'text-green-600':'text-red-600'}`}>{vr}</td>
                        </tr>);
                      })()}
                      {(()=>{
                        const a=dataA.totalIngresos,b=dataB.totalIngresos,v=a-b;
                        return(<tr className="bg-orange-100">
                          <td className="py-2 px-4 font-black text-[10px] uppercase" colSpan={2}>Total INGRESOS</td>
                          <td className="py-2 px-3 text-center text-[9px] font-black text-orange-700">USD</td><td className="py-2 px-3 text-right font-black text-orange-700">{formatNum(a)}</td>
                          <td className="py-2 px-3 text-center text-[9px] font-black text-orange-700">USD</td><td className="py-2 px-3 text-right font-black text-orange-700">{formatNum(b)}</td>
                          <td className="py-2 px-3 text-center font-black text-[9px]">{v>=0?'▲':'▼'} USD</td>
                          <td className={`py-2 px-3 text-right font-black ${v>=0?'text-green-700':'text-red-700'}`}>{formatNum(Math.abs(v))}</td>
                          <td className={`py-2 px-3 text-center font-black ${v>=0?'text-green-700':'text-red-700'}`}>{b>0?((v/b)*100).toFixed(2)+'%':'—'}</td>
                        </tr>);
                      })()}
                      <tr><td colSpan={9} className="py-2"></td></tr>
                      <tr className="bg-gray-800 text-white"><td colSpan={9} className="py-2 px-4 font-black uppercase">COSTOS</td></tr>
                      <tr className="bg-gray-200"><td colSpan={9} className="py-1.5 px-4 font-black text-[10px] uppercase pl-8 text-gray-700">COSTO PRODUCCION</td></tr>
                      {(()=>{
                        const a=dataA.totalCostoProd,b=dataB.totalCostoProd,v=a-b,vr=b!==0?((v/b)*100).toFixed(2)+'%':'—';
                        return(<tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-bold text-[10px] uppercase pl-14" colSpan={2}>COSTO DE PRODUCCION Y VENTAS</td>
                          <td className="py-2 px-3 text-center text-[9px] font-bold text-gray-500">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(a)}</td>
                          <td className="py-2 px-3 text-center text-[9px] font-bold text-gray-500">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(b)}</td>
                          <td className="py-2 px-3 text-center text-[9px] font-black">{v>0?'▲':'▼'} USD</td>
                          <td className={`py-2 px-3 text-right font-black ${v<=0?'text-green-600':'text-red-600'}`}>{formatNum(Math.abs(v))}</td>
                          <td className={`py-2 px-3 text-center font-black ${v<=0?'text-green-600':'text-red-600'}`}>{vr}</td>
                        </tr>);
                      })()}
                      {(()=>{
                        const allK=new Set([...Object.keys(dataA.costosPorCuenta),...Object.keys(dataB.costosPorCuenta)]);
                        const allItems=[];
                        allK.forEach(k=>{
                          const ca=dataA.costosPorCuenta[k],cb=dataB.costosPorCuenta[k];
                          allItems.push({a:ca?.total||0,b:cb?.total||0,nombre:(ca||cb)?.nombre||k,codigo:(ca||cb)?.codigo||''});
                        });
                        const totOpA=allItems.reduce((s,i)=>s+i.a,0),totOpB=allItems.reduce((s,i)=>s+i.b,0);
                        return(<React.Fragment>
                          <tr className="bg-gray-100"><td colSpan={9} className="py-1.5 px-4 font-black text-[10px] uppercase pl-8 text-gray-700">OTROS COSTOS OPERATIVOS</td></tr>
                          {allItems.map((item,ii)=>{
                            const v=item.a-item.b,vr=item.b!==0?((v/item.b)*100).toFixed(2)+'%':'—';
                            return(<tr key={ii} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-4 font-bold text-[10px] uppercase pl-14" colSpan={2}>{item.codigo&&<span className="text-orange-600 mr-1 font-black">{item.codigo}</span>}{item.nombre}</td>
                              <td className="py-2 px-3 text-center text-[9px] font-bold text-gray-500">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(item.a)}</td>
                              <td className="py-2 px-3 text-center text-[9px] font-bold text-gray-500">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(item.b)}</td>
                              <td className="py-2 px-3 text-center text-[9px] font-black">{v>0?'▲':'▼'} USD</td>
                              <td className={`py-2 px-3 text-right font-black ${v<=0?'text-green-600':'text-red-600'}`}>{formatNum(Math.abs(v))}</td>
                              <td className={`py-2 px-3 text-center font-black ${v<=0?'text-green-600':'text-red-600'}`}>{vr}</td>
                            </tr>);
                          })}
                          {allItems.length>0&&(()=>{
                            const v=totOpA-totOpB,vr=totOpB!==0?((v/totOpB)*100).toFixed(2)+'%':'—';
                            return(<tr className="bg-gray-100 border-b border-gray-300">
                              <td className="py-2 px-4 text-[10px] uppercase font-black pl-8" colSpan={2}>Total OTROS COSTOS OPERATIVOS</td>
                              <td className="py-2 px-3 text-center text-[9px] font-black text-gray-600">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(totOpA)}</td>
                              <td className="py-2 px-3 text-center text-[9px] font-black text-gray-600">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(totOpB)}</td>
                              <td className="py-2 px-3 text-center text-[9px] font-black">{v>0?'▲':'▼'} USD</td>
                              <td className={`py-2 px-3 text-right font-black ${v<=0?'text-green-600':'text-red-600'}`}>{formatNum(Math.abs(v))}</td>
                              <td className={`py-2 px-3 text-center font-black ${v<=0?'text-green-600':'text-red-600'}`}>{vr}</td>
                            </tr>);
                          })()}
                        </React.Fragment>);
                      })()}
                      {(()=>{
                        const a=dataA.totalCostos,b=dataB.totalCostos,v=a-b;
                        return(<tr className="bg-gray-800 text-white">
                          <td className="py-3 px-4 font-black text-sm uppercase" colSpan={2}>Total COSTOS</td>
                          <td className="py-3 px-3 text-center text-[9px] font-black">USD</td><td className="py-3 px-3 text-right font-black text-lg">{formatNum(a)}</td>
                          <td className="py-3 px-3 text-center text-[9px] font-black">USD</td><td className="py-3 px-3 text-right font-black text-lg">{formatNum(b)}</td>
                          <td className="py-3 px-3 text-center text-[9px] font-black">{v>0?'▲':'▼'} USD</td>
                          <td className={`py-3 px-3 text-right font-black text-lg ${v<=0?'text-green-400':'text-red-400'}`}>{formatNum(Math.abs(v))}</td>
                          <td className={`py-3 px-3 text-center font-black ${v<=0?'text-green-400':'text-red-400'}`}>{b>0?((v/b)*100).toFixed(2)+'%':'—'}</td>
                        </tr>);
                      })()}
                      <tr><td colSpan={9} className="py-2"></td></tr>
                      {(()=>{
                        const a=dataA.resultado,b=dataB.resultado,v=a-b,vr=b!==0?((v/b)*100).toFixed(2)+'%':'—';
                        return(<tr className={a>=0?'bg-green-600 text-white':'bg-red-600 text-white'}>
                          <td className="py-3 px-4 font-black text-sm uppercase" colSpan={2}>RESULTADO DEL EJERCICIO</td>
                          <td className="py-3 px-3 text-center text-[9px] font-black">USD</td><td className="py-3 px-3 text-right font-black text-xl">{formatNum(a)}</td>
                          <td className="py-3 px-3 text-center text-[9px] font-black">USD</td><td className="py-3 px-3 text-right font-black text-xl">{formatNum(b)}</td>
                          <td className="py-3 px-3 text-center font-black text-[9px]">{v>=0?'▲':'▼'} USD</td>
                          <td className="py-3 px-3 text-right font-black text-xl">{formatNum(Math.abs(v))}</td>
                          <td className="py-3 px-3 text-center font-black">{vr}</td>
                        </tr>);
                      })()}
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

  // ============================================================================
  // PLAN DE CUENTAS — IMPORTAR TXT
  // ============================================================================
  const handleImportPlanCuentasTXT = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      const batch = writeBatch(db);
      let count = 0;
      for (const line of lines) {
        const sep = line.includes('\t') ? '\t' : line.includes('|') ? '|' : ';';
        const parts = line.split(sep).map(p => p.trim());
        if (parts.length < 2) continue;
        const [codigo, nombre, grupo, subGrupo, cuenta, subcuenta] = parts;
        if (!codigo || !nombre) continue;
        const docId = codigo.replace(/\./g, '_').replace(/\s/g, '_');
        batch.set(getDocRef('planDeCuentas', docId), {
          codigo, nombre: nombre.toUpperCase(), grupo: (grupo||'').toUpperCase(),
          subGrupo: (subGrupo||'').toUpperCase(), cuenta: (cuenta||'').toUpperCase(),
          subcuenta: (subcuenta||'').toUpperCase(), timestamp: Date.now()
        });
        count++;
      }
      await batch.commit();
      setShowPDCImport(false);
      setDialog({title:'Importacion Exitosa', text:`Se importaron ${count} cuentas al plan de cuentas.`, type:'alert'});
    } catch(err) {
      setDialog({title:'Error', text:'No se pudo importar el archivo: ' + err.message, type:'alert'});
    }
  };

  const handleDeleteCuenta = (id) => {
    setDialog({title:'Eliminar Cuenta', text:'Eliminar esta cuenta del plan?', type:'confirm',
      onConfirm: async () => await deleteDoc(getDocRef('planDeCuentas', id))});
  };

  // ============================================================================
  // MÓDULO LIBRO DIARIO — muestra todos los asientos contables registrados
  // ============================================================================
  const renderLibroDiarioModule = () => {
    const CUENTAS_INFO = {
      '1.1.03.01.003': { label: 'INVENTARIO DE CONSUMIBLES', color: 'blue' },
      '1.1.03.01.004': { label: 'MATERIA PRIMA (INV-FINAL)', color: 'green' },
      '1.1.03.01.007': { label: 'PRODUCTOS EN PROCESO (INV-INICIAL)', color: 'purple' },
      '1.1.03.01.008': { label: 'PRODUCTOS TERMINADOS (INV-FINAL)', color: 'orange' },
      '5.1.01.01.001': { label: 'COSTO DE PRODUCCIÓN Y VENTAS', color: 'red' },
      '4.1.01.01.000': { label: 'INGRESOS POR MAQUILA', color: 'emerald' },
    };

    const cuentasFiltro = ['TODOS', ...Object.keys(CUENTAS_INFO)];
    const asientosFiltrados = (asientosContables || []).filter(a => {
      const matchSearch = !ldSearch || 
        String(a.descripcion||'').toLowerCase().includes(ldSearch.toLowerCase()) ||
        String(a.referencia||'').toLowerCase().includes(ldSearch.toLowerCase());
      const matchFiltro = ldFiltro === 'TODOS' || 
        a.debito?.codigo === ldFiltro || a.credito?.codigo === ldFiltro;
      return matchSearch && matchFiltro;
    });

    // Totales por cuenta (solo cuentas principales)
    const saldos = {};
    Object.keys(CUENTAS_INFO).forEach(c => { saldos[c] = { debitos: 0, creditos: 0 }; });
    (asientosContables || []).forEach(a => {
      if (saldos[a.debito?.codigo]) saldos[a.debito.codigo].debitos += parseNum(a.monto);
      if (saldos[a.credito?.codigo]) saldos[a.credito.codigo].creditos += parseNum(a.monto);
    });

    return (
      <div className="space-y-6 animate-in fade-in print:space-y-2">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:rounded-none print:border-0 print:shadow-none">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-700 print:hidden">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveTab('costos')} className="bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-white/30 flex items-center gap-1">← Reportes</button>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase flex items-center gap-3">
                    <ArrowRightLeft className="text-orange-400" size={28}/> Libro Diario — Asientos Contables
                  </h2>
                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase">Registro automático de movimientos contables</p>
                </div>
              </div>
              <button onClick={() => window.print()} className="bg-orange-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-orange-600 shadow-lg">
                <Printer size={16}/> Imprimir
              </button>
            </div>
          </div>

          {/* Resumen saldos */}
          <div className="p-6 border-b border-gray-100 print:hidden">
            <p className="text-[10px] font-black text-gray-500 uppercase mb-3 tracking-widest">Saldos Acumulados por Cuenta</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(CUENTAS_INFO).map(([cod, info]) => {
                const s = saldos[cod] || { debitos: 0, creditos: 0 };
                const saldo = s.debitos - s.creditos;
                return (
                  <div key={cod} className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <p className="text-[8px] font-black text-orange-600 uppercase mb-1">{cod}</p>
                    <p className="text-[9px] font-black text-gray-700 uppercase mb-2 leading-tight">{info.label}</p>
                    <div className="flex justify-between text-[9px] font-bold">
                      <span className="text-green-600">Déb: ${formatNum(s.debitos)}</span>
                      <span className="text-red-600">Cré: ${formatNum(s.creditos)}</span>
                    </div>
                    <div className={`text-xs font-black mt-1 ${saldo >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      Saldo: ${formatNum(Math.abs(saldo))} {saldo >= 0 ? 'D' : 'A'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filtros */}
          <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 items-center print:hidden">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={ldSearch} onChange={e => setLdSearch(e.target.value)} placeholder="Buscar por descripción o referencia..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-orange-400"/>
            </div>
            <select value={ldFiltro} onChange={e => setLdFiltro(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-orange-400 bg-white">
              {cuentasFiltro.map(c => <option key={c} value={c}>{c === 'TODOS' ? 'Todas las cuentas' : `${c} — ${CUENTAS_INFO[c]?.label || c}`}</option>)}
            </select>
            <span className="text-[10px] font-black text-gray-500 uppercase">{asientosFiltrados.length} asientos</span>
          </div>

          {/* Tabla de asientos */}
          <div id="pdf-content" className="p-6 bg-white print:p-2">
            <div className="hidden pdf-header mb-6 print:block">
              <ReportHeader />
              <h1 className="text-xl font-black uppercase border-b-4 border-orange-500 pb-2 mt-4">LIBRO DIARIO — ASIENTOS CONTABLES</h1>
              <p className="text-xs font-bold text-gray-500 mt-1 uppercase">Fecha de emisión: {getTodayDate()}</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-black print:rounded-none">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900 text-white">
                  <tr className="text-[9px] font-black uppercase tracking-widest">
                    <th className="py-3 px-4 border-r border-gray-700">Fecha</th>
                    <th className="py-3 px-4 border-r border-gray-700">Referencia</th>
                    <th className="py-3 px-4 border-r border-gray-700">Descripción</th>
                    <th className="py-3 px-4 border-r border-gray-700 text-green-400">DÉBITO</th>
                    <th className="py-3 px-4 border-r border-gray-700 text-red-400">CRÉDITO</th>
                    <th className="py-3 px-4 text-right">Monto $</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-black">
                  {asientosFiltrados.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-xs text-gray-400 font-bold uppercase">Sin asientos registrados. Los asientos se generan automáticamente al registrar movimientos.</td></tr>
                  )}
                  {asientosFiltrados.map((a, i) => (
                    <tr key={a.id} className={`hover:bg-orange-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} print:bg-white`}>
                      <td className="py-3 px-4 font-bold border-r border-gray-100 print:border-black whitespace-nowrap">
                        {a.fecha}<br/>
                        <span className="text-[8px] text-gray-400 font-bold">{a.user}</span>
                      </td>
                      <td className="py-3 px-4 font-black text-orange-600 border-r border-gray-100 print:border-black text-[10px]">{a.referencia}</td>
                      <td className="py-3 px-4 font-bold border-r border-gray-100 print:border-black max-w-xs">
                        <span className="text-[10px] leading-tight block">{a.descripcion}</span>
                      </td>
                      <td className="py-3 px-4 border-r border-gray-100 print:border-black">
                        <span className="text-[8px] font-black text-orange-700 block">{a.debito?.codigo}</span>
                        <span className="text-[9px] font-bold text-gray-600">{a.debito?.nombre}</span>
                      </td>
                      <td className="py-3 px-4 border-r border-gray-100 print:border-black">
                        <span className="text-[8px] font-black text-orange-700 block">{a.credito?.codigo}</span>
                        <span className="text-[9px] font-bold text-gray-600">{a.credito?.nombre}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sm">${formatNum(a.monto)}</td>
                    </tr>
                  ))}
                </tbody>
                {asientosFiltrados.length > 0 && (
                  <tfoot className="bg-gray-900 text-white">
                    <tr>
                      <td colSpan={5} className="py-3 px-4 text-right font-black text-[10px] uppercase tracking-widest">TOTAL ASIENTOS FILTRADOS</td>
                      <td className="py-3 px-4 text-right font-black text-lg">${formatNum(asientosFiltrados.reduce((s,a) => s + parseNum(a.monto), 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Leyenda de cuentas */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 print:hidden">
          <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Cuentas Contables del Plan</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { cod: '1.1.03.01.004', nom: 'MATERIA PRIMA (INV-FINAL)', desc: 'DÉBITO al ingresar MP · CRÉDITO al salir hacia WIP', tipo: 'Activo' },
              { cod: '1.1.03.01.003', nom: 'INVENTARIO DE CONSUMIBLES', desc: 'DÉBITO al ingresar consumibles · CRÉDITO al salir hacia WIP', tipo: 'Activo' },
              { cod: '1.1.03.01.007', nom: 'PRODUCTOS EN PROCESO (INV-INICIAL)', desc: 'DÉBITO al recibir materiales de almacén · CRÉDITO al pasar a Terminados', tipo: 'Activo' },
              { cod: '1.1.03.01.008', nom: 'PRODUCTOS TERMINADOS (INV-FINAL)', desc: 'DÉBITO al cerrar OP · CRÉDITO al facturar', tipo: 'Activo' },
              { cod: '5.1.01.01.001', nom: 'COSTO DE PRODUCCIÓN Y VENTAS', desc: 'DÉBITO al emitir factura (costo del producto vendido)', tipo: 'Gasto' },
              { cod: '4.1.01.01.000', nom: 'INGRESOS POR MAQUILA', desc: 'CRÉDITO al emitir factura (ingreso reconocido)', tipo: 'Ingreso' },
            ].map(c => (
              <div key={c.cod} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="shrink-0">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${c.tipo === 'Activo' ? 'bg-blue-100 text-blue-700' : c.tipo === 'Ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.tipo}</span>
                </div>
                <div>
                  <p className="text-[9px] font-black text-orange-600 uppercase">{c.cod}</p>
                  <p className="text-[10px] font-black text-gray-800 uppercase">{c.nom}</p>
                  <p className="text-[9px] font-bold text-gray-500 mt-0.5">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── FIN renderLibroDiarioModule ──
  // ============================================================================
  const calcEstadoData = (ym) => {
    // Ingresos: facturas del periodo
    const facturasperiodo = (invoices || []).filter(i => {
      const d = i.fecha || (typeof i.timestamp==='number' ? new Date(i.timestamp).toISOString().substring(0,7) : '');
      return d.startsWith(ym);
    });
    const totalIngresos = facturasperiodo.reduce((s,i) => s + parseNum(i.montoBase), 0);

    // Costos operativos del periodo, agrupados por cuenta contable
    const costosPeriodo = (opCosts || []).filter(c => (c.month || (c.date||'').substring(0,7) || '').startsWith(ym));

    // Movimientos de produccion del periodo
    const movsProd = (invMovements || []).filter(m =>
      m.type === 'SALIDA' && String(m.notes||'').toUpperCase().includes('PRODUCCI') &&
      (m.date||'').startsWith(ym)
    );
    const totalCostoProd = movsProd.reduce((s,m) => s + parseNum(m.totalValue), 0);

    // Agrupar costos operativos por cuenta contable
    const costosPorCuenta = {};
    costosPeriodo.forEach(c => {
      const key = c.cuentaContable || ('CAT::' + (c.category||'OTROS'));
      if (!costosPorCuenta[key]) {
        const pdc = planDeCuentas.find(p => p.codigo === c.cuentaContable);
        costosPorCuenta[key] = {
          codigo: c.cuentaContable || '',
          nombre: pdc ? pdc.nombre : (c.category || 'OTROS'),
          grupo: pdc ? pdc.grupo : 'COSTOS OPERATIVOS',
          subGrupo: pdc ? pdc.subGrupo : c.category || 'OTROS',
          total: 0, movs: []
        };
      }
      costosPorCuenta[key].total += parseNum(c.amount);
      costosPorCuenta[key].movs.push(c);
    });

    const totalCostosOp = costosPeriodo.reduce((s,c) => s + parseNum(c.amount), 0);
    const totalCostos = totalCostoProd + totalCostosOp;
    const resultado = totalIngresos - totalCostos;

    return { facturasperiodo, totalIngresos, costosPorCuenta, costosPeriodo, movsProd, totalCostoProd, totalCostosOp, totalCostos, resultado };
  };

  // ============================================================================
  // RENDER — ESTADO DE RESULTADO
  // ============================================================================
  const renderEstadoResultadoModule = () => {
    const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const tasa = parseNum(erTasa) || 1;

    const ymA = `${erAno}-${String(erMes).padStart(2,'0')}`;
    const dataA = calcEstadoData(ymA);
    const dataB = calcEstadoData(varMesB);

    const pctOf = (val, base) => base !== 0 ? ((val / base) * 100).toFixed(2) + '%' : '0.00%';
    const bs = (usd) => formatNum(usd * tasa);

    // Agrupar plan de cuentas por jerarquía
    const groupedPDC = {};
    planDeCuentas.forEach(c => {
      const g = c.grupo || 'OTROS'; const sg = c.subGrupo || g;
      if (!groupedPDC[g]) groupedPDC[g] = {};
      if (!groupedPDC[g][sg]) groupedPDC[g][sg] = [];
      groupedPDC[g][sg].push(c);
    });

    // Construir filas: UNA sola línea de ingresos, costos operativos flat
    const colSpan = tasa > 1 ? 5 : 4;

    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Header + Tabs */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-white uppercase flex items-center gap-3">
                  <BarChart3 className="text-orange-400" size={30}/> Estado de Resultado
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase mt-1">Analisis Financiero y Variaciones</p>
              </div>
              <div className="flex gap-2">
                {[{id:'estado',label:'Estado Financiero'},{id:'variaciones',label:'Variaciones'}].map(t=>(
                  <button key={t.id} onClick={()=>setErView(t.id)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${erView===t.id?'bg-orange-500 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="px-8 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4 items-end">
            {erView === 'estado' ? (
              <>
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes</label>
                  <select value={erMes} onChange={e=>setErMes(parseInt(e.target.value))} className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none bg-white">
                    {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Año</label>
                  <input type="number" value={erAno} onChange={e=>setErAno(parseInt(e.target.value))} className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none w-24 text-center" />
                </div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Tasa (Bs/$)</label>
                  <input type="number" step="0.01" value={erTasa} onChange={e=>setErTasa(e.target.value)} placeholder="392.00" className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none w-32 text-center" />
                </div>
                <button onClick={()=>handleExportPDF('Estado_Resultado', false)} className="bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-gray-800"><Printer size={14}/> Imprimir</button>
              </>
            ) : (
              <>
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes Actual (A)</label>
                  <input type="month" value={varMesA} onChange={e=>setVarMesA(e.target.value)} className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none" />
                </div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Mes Anterior (B)</label>
                  <input type="month" value={varMesB} onChange={e=>setVarMesB(e.target.value)} className="border-2 border-gray-200 rounded-xl p-2.5 font-black text-xs outline-none" />
                </div>
                <button onClick={()=>handleExportPDF('Variaciones_ER', true)} className="bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-gray-800"><Printer size={14}/> Imprimir</button>
              </>
            )}
          </div>

          {/* ESTADO FINANCIERO */}
          {erView === 'estado' && (
            <div id="pdf-content" className="p-0">
              <div className="hidden pdf-header p-6 border-b-2 border-gray-300">
                <ReportHeader />
                <h1 className="text-2xl font-black text-center uppercase border-b-4 border-orange-500 pb-2 mt-4">ESTADO DE RESULTADO INTEGRAL</h1>
                <p className="text-xs text-center font-bold text-gray-500 mt-1">PERIODO: {MONTHS[erMes-1]} {erAno}{tasa>1?` | TASA: ${formatNum(tasa)} Bs/$`:''}</p>
              </div>
              <div className="grid grid-cols-3 gap-0 border-b-2 border-gray-300">
                <div className="p-4 border-r border-gray-200 text-center"><div className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Ingresos</div><div className="font-black text-lg text-green-600">${formatNum(dataA.totalIngresos)}</div>{tasa>1&&<div className="text-[9px] text-green-500 font-bold">Bs. {bs(dataA.totalIngresos)}</div>}</div>
                <div className="p-4 border-r border-gray-200 text-center"><div className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Costos</div><div className="font-black text-lg text-red-600">${formatNum(dataA.totalCostos)}</div>{tasa>1&&<div className="text-[9px] text-red-500 font-bold">Bs. {bs(dataA.totalCostos)}</div>}</div>
                <div className={`p-4 text-center ${dataA.resultado>=0?'bg-green-50':'bg-red-50'}`}><div className="text-[9px] font-black text-gray-400 uppercase mb-1">Resultado Ejercicio</div><div className={`font-black text-xl ${dataA.resultado>=0?'text-green-700':'text-red-700'}`}>${formatNum(dataA.resultado)}</div>{tasa>1&&<div className={`text-xs font-black ${dataA.resultado>=0?'text-green-600':'text-red-600'}`}>Bs. {bs(dataA.resultado)}</div>}</div>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="bg-gray-800 text-white">
                  <th className="py-2 px-4 text-left font-black uppercase text-[9px]">Cuenta / Concepto</th>
                  <th className="py-2 px-3 text-center font-black text-[9px] w-14">UM</th>
                  <th className="py-2 px-3 text-right font-black text-[9px] w-28">Saldo USD</th>
                  <th className="py-2 px-3 text-center font-black text-[9px] w-14">%</th>
                  {tasa>1&&<th className="py-2 px-3 text-right font-black text-[9px] w-32">Saldo Bs.</th>}
                </tr></thead>
                <tbody>
                  {/* INGRESOS */}
                  <tr className="bg-orange-500 text-white"><td className="py-2.5 px-4 font-black text-sm uppercase" colSpan={colSpan}>INGRESOS</td></tr>
                  <tr className="bg-orange-50"><td className="py-1.5 px-4 font-black text-[10px] uppercase pl-8 text-orange-800" colSpan={colSpan}>VENTAS BRUTAS</td></tr>
                  {dataA.facturasperiodo.length>0 ? (
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 font-bold text-[10px] pl-14"><span className="text-orange-600 font-black mr-2">4.1.01.01.000</span>INGRESOS POR MAQUILA</td>
                      <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td>
                      <td className="py-2 px-3 text-right font-black">{formatNum(dataA.totalIngresos)}</td>
                      <td className="py-2 px-3 text-center text-[9px]">100.00%</td>
                      {tasa>1&&<td className="py-2 px-3 text-right font-bold text-gray-600">{bs(dataA.totalIngresos)}</td>}
                    </tr>
                  ) : <tr><td className="py-2 px-4 pl-14 text-[10px] text-gray-400 italic" colSpan={colSpan}>Sin ingresos en este periodo</td></tr>}
                  <tr className="bg-orange-100">
                    <td className="py-2.5 px-4 text-[10px] uppercase pl-8 text-orange-800 font-black" colSpan={2}>Total INGRESOS</td>
                    <td className="py-2.5 px-3 text-right font-black text-orange-700">{formatNum(dataA.totalIngresos)}</td>
                    <td className="py-2.5 px-3 text-center text-[9px] font-black">100.00%</td>
                    {tasa>1&&<td className="py-2.5 px-3 text-right font-black text-orange-700">{bs(dataA.totalIngresos)}</td>}
                  </tr>
                  <tr><td colSpan={colSpan} className="py-2"></td></tr>
                  {/* COSTOS */}
                  <tr className="bg-gray-800 text-white"><td className="py-2.5 px-4 font-black text-sm uppercase" colSpan={colSpan}>COSTOS</td></tr>
                  <tr className="bg-gray-200"><td className="py-1.5 px-4 font-black text-[10px] uppercase pl-8 text-gray-700" colSpan={colSpan}>COSTO DE PRODUCCION</td></tr>
                  {dataA.movsProd.length>0 ? dataA.movsProd.map((m,i)=>(
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 font-bold text-[10px] pl-14">{m.itemName} ({m.reference})</td>
                      <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td>
                      <td className="py-2 px-3 text-right font-black">{formatNum(parseNum(m.totalValue))}</td>
                      <td className="py-2 px-3 text-center text-[9px]">{pctOf(parseNum(m.totalValue),dataA.totalIngresos)}</td>
                      {tasa>1&&<td className="py-2 px-3 text-right font-bold text-gray-600">{bs(parseNum(m.totalValue))}</td>}
                    </tr>
                  )) : <tr><td className="py-2 px-4 pl-14 text-[10px] text-gray-400 italic" colSpan={colSpan}>Sin movimientos de produccion</td></tr>}
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <td className="py-2 px-4 text-[10px] uppercase pl-8 font-black text-gray-700" colSpan={2}>Total COSTO PRODUCCION</td>
                    <td className="py-2 px-3 text-right font-black">{formatNum(dataA.totalCostoProd)}</td>
                    <td className="py-2 px-3 text-center text-[9px] font-black">{pctOf(dataA.totalCostoProd,dataA.totalIngresos)}</td>
                    {tasa>1&&<td className="py-2 px-3 text-right font-black">{bs(dataA.totalCostoProd)}</td>}
                  </tr>
                  {/* COSTOS OPERATIVOS FLAT */}
                  {Object.values(dataA.costosPorCuenta).length>0&&<>
                    <tr className="bg-gray-200"><td className="py-1.5 px-4 font-black text-[10px] uppercase pl-8 text-gray-700" colSpan={colSpan}>OTROS COSTOS OPERATIVOS</td></tr>
                    {Object.values(dataA.costosPorCuenta).map((c,i)=>(
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 font-bold text-[10px] pl-14">{c.codigo&&<span className="text-orange-600 font-black mr-2">{c.codigo}</span>}{c.nombre}</td>
                        <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td>
                        <td className="py-2 px-3 text-right font-black">{formatNum(c.total)}</td>
                        <td className="py-2 px-3 text-center text-[9px]">{pctOf(c.total,dataA.totalIngresos)}</td>
                        {tasa>1&&<td className="py-2 px-3 text-right font-bold text-gray-600">{bs(c.total)}</td>}
                      </tr>
                    ))}
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <td className="py-2 px-4 text-[10px] uppercase pl-8 font-black text-gray-700" colSpan={2}>Total OTROS COSTOS OPERATIVOS</td>
                      <td className="py-2 px-3 text-right font-black">{formatNum(dataA.totalCostosOp)}</td>
                      <td className="py-2 px-3 text-center text-[9px] font-black">{pctOf(dataA.totalCostosOp,dataA.totalIngresos)}</td>
                      {tasa>1&&<td className="py-2 px-3 text-right font-black">{bs(dataA.totalCostosOp)}</td>}
                    </tr>
                  </>}
                  {/* TOTAL COSTOS + RESULTADO */}
                  <tr className="bg-gray-700 text-white"><td className="py-3 px-4 text-sm uppercase font-black" colSpan={2}>Total COSTOS</td><td className="py-3 px-3 text-right font-black text-lg">{formatNum(dataA.totalCostos)}</td><td className="py-3 px-3 text-center text-[9px] font-black">{pctOf(dataA.totalCostos,dataA.totalIngresos)}</td>{tasa>1&&<td className="py-3 px-3 text-right font-black text-lg">{bs(dataA.totalCostos)}</td>}</tr>
                  <tr><td colSpan={colSpan} className="py-1"></td></tr>
                  <tr className={dataA.resultado>=0?'bg-green-600 text-white':'bg-red-600 text-white'}>
                    <td className="py-3 px-4 font-black text-sm uppercase" colSpan={2}>RESULTADO DEL EJERCICIO</td>
                    <td className="py-3 px-3 text-right font-black text-xl">${formatNum(dataA.resultado)}</td>
                    <td className="py-3 px-3 text-center font-black">{pctOf(dataA.resultado,dataA.totalIngresos)}</td>
                    {tasa>1&&<td className="py-3 px-3 text-right font-black text-xl">{bs(dataA.resultado)}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* VARIACIONES */}
          {erView === 'variaciones' && (
            <div id="pdf-content" className="p-0">
              <div className="hidden pdf-header p-6 border-b-2 border-gray-300">
                <ReportHeader />
                <h1 className="text-2xl font-black text-center uppercase border-b-4 border-orange-500 pb-2 mt-4">CUADRO COMPARATIVO DE VARIACIONES</h1>
                <p className="text-xs text-center font-bold text-gray-500 mt-1">Mes A: {varMesA} vs Mes B: {varMesB}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-orange-500 text-white">
                      <th className="py-3 px-4 text-left font-black uppercase text-[9px]" colSpan={2}>Cuenta / Concepto</th>
                      <th className="py-3 px-3 text-center font-black uppercase text-[9px]" colSpan={2}>Mes Actual ({varMesA})</th>
                      <th className="py-3 px-3 text-center font-black uppercase text-[9px]" colSpan={2}>Mes Anterior ({varMesB})</th>
                      <th className="py-3 px-3 text-center font-black uppercase text-[9px]" colSpan={2}>Variacion Absoluta</th>
                      <th className="py-3 px-3 text-center font-black uppercase text-[9px]">Var. %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* INGRESOS */}
                    <tr className="bg-orange-100"><td colSpan={9} className="py-2 px-4 font-black uppercase text-orange-800">INGRESOS</td></tr>
                    <tr className="bg-orange-50"><td className="py-1.5 px-4 text-[9px] font-black uppercase pl-8 text-orange-700" colSpan={2}>VENTAS BRUTAS</td><td colSpan={7}></td></tr>
                    {(() => {
                      const a = dataA.totalIngresos; const b = dataB.totalIngresos;
                      const varAbs = a - b; const varRel = b !== 0 ? ((varAbs/b)*100).toFixed(2) : '—';
                      return (
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-bold text-[10px] uppercase pl-14" colSpan={2}>INGRESOS POR VENTAS / MAQUILA</td>
                          <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td>
                          <td className="py-2 px-3 text-right font-black">{formatNum(a)}</td>
                          <td className="py-2 px-3 text-center text-[9px] text-gray-500 font-bold">USD</td>
                          <td className="py-2 px-3 text-right font-black">{formatNum(b)}</td>
                          <td className="py-2 px-3 text-center text-[9px] font-bold">{varAbs>0?'▲':'▼'} USD</td>
                          <td className={`py-2 px-3 text-right font-black ${varAbs>=0?'text-green-600':'text-red-600'}`}>{formatNum(Math.abs(varAbs))}</td>
                          <td className={`py-2 px-3 text-center font-black text-[10px] ${varAbs>=0?'text-green-600':'text-red-600'}`}>{typeof varRel==='string'?varRel:varRel+'%'}</td>
                        </tr>
                      );
                    })()}
                    <tr className="bg-orange-100 font-black"><td className="py-2 px-4 text-[10px] uppercase font-black text-orange-800" colSpan={2}>Total INGRESOS</td>
                      <td className="py-2 px-3 text-center text-[9px] text-orange-700 font-black">USD</td>
                      <td className="py-2 px-3 text-right font-black text-orange-700">{formatNum(dataA.totalIngresos)}</td>
                      <td className="py-2 px-3 text-center text-[9px] text-orange-700 font-black">USD</td>
                      <td className="py-2 px-3 text-right font-black text-orange-700">{formatNum(dataB.totalIngresos)}</td>
                      <td className="py-2 px-3 text-center font-black text-[9px]">{dataA.totalIngresos>=dataB.totalIngresos?'▲':'▼'} USD</td>
                      <td className={`py-2 px-3 text-right font-black ${dataA.totalIngresos>=dataB.totalIngresos?'text-green-700':'text-red-700'}`}>{formatNum(Math.abs(dataA.totalIngresos-dataB.totalIngresos))}</td>
                      <td className={`py-2 px-3 text-center font-black ${dataA.totalIngresos>=dataB.totalIngresos?'text-green-700':'text-red-700'}`}>{dataB.totalIngresos>0?((((dataA.totalIngresos-dataB.totalIngresos)/dataB.totalIngresos)*100).toFixed(2)+'%'):'—'}</td>
                    </tr>

                    <tr><td colSpan={9} className="py-2"></td></tr>

                    {/* COSTOS */}
                    <tr className="bg-gray-800 text-white"><td colSpan={9} className="py-2 px-4 font-black uppercase">COSTOS</td></tr>

                    {/* Costo Produccion */}
                    <tr className="bg-gray-200"><td colSpan={9} className="py-1.5 px-4 font-black uppercase text-[10px] pl-8 text-gray-700">COSTO PRODUCCION</td></tr>
                    {(() => {
                      const a = dataA.totalCostoProd; const b = dataB.totalCostoProd;
                      const varAbs = a - b; const varRel = b !== 0 ? ((varAbs/b)*100).toFixed(2) : '—';
                      return (<tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 font-bold text-[10px] uppercase pl-14" colSpan={2}>COSTO DE PRODUCCION Y VENTAS</td>
                        <td className="py-2 px-3 text-center text-[9px] font-bold text-gray-500">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(a)}</td>
                        <td className="py-2 px-3 text-center text-[9px] font-bold text-gray-500">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(b)}</td>
                        <td className="py-2 px-3 text-center text-[9px] font-bold">{varAbs>0?'▲':'▼'} USD</td>
                        <td className={`py-2 px-3 text-right font-black ${varAbs<=0?'text-green-600':'text-red-600'}`}>{formatNum(Math.abs(varAbs))}</td>
                        <td className={`py-2 px-3 text-center font-black text-[10px] ${varAbs<=0?'text-green-600':'text-red-600'}`}>{typeof varRel==='string'?varRel:varRel+'%'}</td>
                      </tr>);
                    })()}

                    {/* Costos Operativos por cuenta - FLAT */}
                    {(() => {
                      const allKeys = new Set([...Object.keys(dataA.costosPorCuenta), ...Object.keys(dataB.costosPorCuenta)]);
                      const flatItems = [];
                      allKeys.forEach(k => {
                        const ca = dataA.costosPorCuenta[k]; const cb = dataB.costosPorCuenta[k];
                        flatItems.push({ a: ca?.total||0, b: cb?.total||0, nombre:(ca||cb)?.nombre||k, codigo:(ca||cb)?.codigo||'' });
                      });
                      const totA = flatItems.reduce((s,i)=>s+i.a,0); const totB = flatItems.reduce((s,i)=>s+i.b,0);
                      if (flatItems.length === 0) return null;
                      return (
                        <React.Fragment>
                          <tr className="bg-gray-100"><td colSpan={9} className="py-1.5 px-4 font-black uppercase text-[10px] pl-8 text-gray-700">OTROS COSTOS OPERATIVOS</td></tr>
                          {flatItems.map((item,ii) => {
                            const varAbs = item.a - item.b; const varRel = item.b!==0?((varAbs/item.b)*100).toFixed(2):'—';
                            return (<tr key={ii} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-4 font-bold text-[10px] uppercase pl-14" colSpan={2}>
                                {item.codigo&&<span className="text-orange-600 mr-1">{item.codigo}</span>}{item.nombre}
                              </td>
                              <td className="py-2 px-3 text-center text-[9px] font-bold text-gray-500">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(item.a)}</td>
                              <td className="py-2 px-3 text-center text-[9px] font-bold text-gray-500">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(item.b)}</td>
                              <td className="py-2 px-3 text-center text-[9px] font-bold">{varAbs>0?'▲':'▼'} USD</td>
                              <td className={`py-2 px-3 text-right font-black ${varAbs<=0?'text-green-600':'text-red-600'}`}>{formatNum(Math.abs(varAbs))}</td>
                              <td className={`py-2 px-3 text-center font-black text-[10px] ${varAbs<=0?'text-green-600':'text-red-600'}`}>{typeof varRel==='string'?varRel:varRel+'%'}</td>
                            </tr>);
                          })}
                          <tr className="bg-gray-100 border-b border-gray-300 font-black">
                            <td className="py-2 px-4 text-[10px] uppercase font-black pl-8" colSpan={2}>Total OTROS COSTOS OPERATIVOS</td>
                            <td className="py-2 px-3 text-center text-[9px] font-black text-gray-600">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(totA)}</td>
                            <td className="py-2 px-3 text-center text-[9px] font-black text-gray-600">USD</td><td className="py-2 px-3 text-right font-black">{formatNum(totB)}</td>
                            <td className="py-2 px-3 text-center text-[9px] font-black">{totA>totB?'▲':'▼'} USD</td>
                            <td className={`py-2 px-3 text-right font-black ${totA<=totB?'text-green-600':'text-red-600'}`}>{formatNum(Math.abs(totA-totB))}</td>
                            <td className={`py-2 px-3 text-center font-black ${totA<=totB?'text-green-600':'text-red-600'}`}>{totB>0?((((totA-totB)/totB)*100).toFixed(2)+'%'):'—'}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })()}

                    {/* Total Costos */}
                    <tr className="bg-gray-800 text-white font-black">
                      <td className="py-3 px-4 text-sm uppercase font-black" colSpan={2}>Total COSTOS</td>
                      <td className="py-3 px-3 text-center text-[9px] font-black">USD</td><td className="py-3 px-3 text-right font-black text-lg">{formatNum(dataA.totalCostos)}</td>
                      <td className="py-3 px-3 text-center text-[9px] font-black">USD</td><td className="py-3 px-3 text-right font-black text-lg">{formatNum(dataB.totalCostos)}</td>
                      <td className="py-3 px-3 text-center text-[9px] font-black">{dataA.totalCostos>dataB.totalCostos?'▲':'▼'} USD</td>
                      <td className={`py-3 px-3 text-right font-black text-lg ${dataA.totalCostos<=dataB.totalCostos?'text-green-400':'text-red-400'}`}>{formatNum(Math.abs(dataA.totalCostos-dataB.totalCostos))}</td>
                      <td className={`py-3 px-3 text-center font-black ${dataA.totalCostos<=dataB.totalCostos?'text-green-400':'text-red-400'}`}>{dataB.totalCostos>0?((((dataA.totalCostos-dataB.totalCostos)/dataB.totalCostos)*100).toFixed(2)+'%'):'—'}</td>
                    </tr>

                    <tr><td colSpan={9} className="py-2"></td></tr>

                    {/* Resultado */}
                    {(() => {
                      const a = dataA.resultado; const b = dataB.resultado;
                      const varAbs = a - b; const varRel = b!==0?((varAbs/b)*100).toFixed(2):'—';
                      return (<tr className={a>=0?'bg-green-600 text-white':'bg-red-600 text-white'}>
                        <td className="py-3 px-4 font-black text-sm uppercase" colSpan={2}>RESULTADO DEL EJERCICIO</td>
                        <td className="py-3 px-3 text-center text-[9px] font-black">USD</td><td className="py-3 px-3 text-right font-black text-xl">{formatNum(a)}</td>
                        <td className="py-3 px-3 text-center text-[9px] font-black">USD</td><td className="py-3 px-3 text-right font-black text-xl">{formatNum(b)}</td>
                        <td className="py-3 px-3 text-center font-black text-[9px]">{varAbs>=0?'▲':'▼'} USD</td>
                        <td className="py-3 px-3 text-right font-black text-xl">{formatNum(Math.abs(varAbs))}</td>
                        <td className="py-3 px-3 text-center font-black">{typeof varRel==='string'?varRel:varRel+'%'}</td>
                      </tr>);
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RESPALDO COMPLETO DEL SISTEMA (JSON + App.jsx)
  // ============================================================================
  const handleBackupData = async (includeAppJsx = false) => {
    try {
      const ts = getTodayDate();
      const backup = {
        _meta: { fecha: ts, timestamp: Date.now(), version: '1.0', empresa: 'SERVICIOS JIRET G&B, C.A.' },
        inventory, inventoryMovements: invMovements, clientes: clients, requirements,
        maquilaInvoices: invoices, inventoryRequisitions: invRequisitions,
        operatingCosts: opCosts, purchaseOrders, wipInventory, finishedGoodsInventory,
        planDeCuentas, asientosContables,
      };
      // Descargar JSON de datos
      const jsonBlob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `Respaldo_GYB_Datos_${ts}.json`;
      document.body.appendChild(jsonLink); jsonLink.click(); document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Actualizar fecha de último respaldo
      localStorage.setItem('backupLastRun', ts);
      setBackupLastRun(ts);

      setDialog({ title: '✅ Respaldo de Datos Exitoso', text: `Archivo: Respaldo_GYB_Datos_${ts}.json descargado. Guárdelo en su carpeta de respaldos.`, type: 'alert' });
    } catch (err) {
      setDialog({ title: 'Error', text: 'No se pudo generar el respaldo: ' + err.message, type: 'alert' });
    }
  };

  const handleImportBackupJSON = async (file) => {
    if (!file) return;
    requireAdminPassword(async () => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data._meta) return setDialog({title:'Formato Inválido', text:'El archivo no es un respaldo válido del sistema GYB ERP.', type:'alert'});
        setDialog({
          title: '⚠ Confirmar Importación',
          text: `El respaldo es del ${data._meta.fecha}. Importar REEMPLAZARÁ los datos actuales de todas las colecciones. ¿Continuar?`,
          type: 'confirm',
          onConfirm: async () => {
            try {
              const collections = [
                ['inventory', data.inventory], ['inventoryMovements', data.inventoryMovements],
                ['clientes', data.clientes], ['requirements', data.requirements],
                ['maquilaInvoices', data.maquilaInvoices], ['inventoryRequisitions', data.inventoryRequisitions],
                ['operatingCosts', data.operatingCosts], ['purchaseOrders', data.purchaseOrders],
                ['wipInventory', data.wipInventory], ['finishedGoodsInventory', data.finishedGoodsInventory],
                ['planDeCuentas', data.planDeCuentas], ['asientosContables', data.asientosContables],
                ['formulas', data.formulas],
              ];
              let total = 0;
              for (const [col, items] of collections) {
                if (!Array.isArray(items) || items.length === 0) continue;
                const batch = writeBatch(db);
                for (const item of items) {
                  if (item && item.id) { batch.set(getDocRef(col, item.id), item, {merge:true}); total++; }
                }
                await batch.commit();
              }
              setDialog({title:'✅ Importación Exitosa', text:`Se importaron ${total} registros desde el respaldo del ${data._meta.fecha}.`, type:'alert'});
            } catch(err) { setDialog({title:'Error al Importar', text:err.message, type:'alert'}); }
          }
        });
      } catch(err) { setDialog({title:'Error', text:'No se pudo leer el archivo: ' + err.message, type:'alert'}); }
    }, 'Importar Respaldo de Base de Datos');
  };

  const handleBackupAppJsx = () => {
    // Instrucciones para respaldar el App.jsx desde el repositorio/fuente
    setDialog({
      title: 'Respaldar App.jsx',
      text: 'Para respaldar el código fuente App.jsx: 1) Descárguelo desde su entorno de desarrollo (GitHub, carpeta local, etc.) 2) Cópielo en su carpeta de respaldos. El archivo de datos JSON ya fue descargado por separado.',
      type: 'alert'
    });
  };

  // ============================================================================
  // RESETEO TOTAL DEL SISTEMA (requiere clave admin)
  // ============================================================================
  const RESET_COLLECTIONS = [
    'inventory', 'inventoryMovements', 'clientes', 'requirements',
    'maquilaInvoices', 'inventoryRequisitions', 'operatingCosts',
    'purchaseOrders', 'wipInventory', 'finishedGoodsInventory',
    'planDeCuentas', 'asientosContables',
  ];

  const handleResetSystem = () => {
    setDialog({
      title: '⚠️ ÚLTIMO AVISO',
      text: 'Se borrarán TODOS los datos operativos (inventario, movimientos, facturas, OPs, costos, asientos, etc.). Los usuarios y configuración se conservan. Esta acción es IRREVERSIBLE. ¿Confirmar?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          let totalDeleted = 0;
          for (const colName of RESET_COLLECTIONS) {
            // Firestore no permite borrar colecciones de golpe — borramos doc a doc en batch
            const snap = await new Promise((res) => {
              const unsub = onSnapshot(collection(db, colName), (s) => { unsub(); res(s); });
            });
            const docs = snap.docs;
            // Firestore batch max 500 ops
            for (let i = 0; i < docs.length; i += 400) {
              const b = writeBatch(db);
              docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
              await b.commit();
            }
            totalDeleted += docs.length;
          }
          setDialog({ title: '✅ Sistema Reiniciado', text: `Se eliminaron ${totalDeleted} registros. El sistema está completamente limpio y listo para comenzar desde cero. Importe su inventario desde Configuración.`, type: 'alert' });
        } catch (err) {
          setDialog({ title: 'Error en Reset', text: err.message, type: 'alert' });
        }
      }
    });
  };

  // ============================================================================
  // IMPORTAR INVENTARIO INICIAL DESDE TXT
  // ============================================================================
  const parseInvNum = (s) => {
    if (!s) return 0;
    s = String(s).trim();
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    else s = s.replace(/\./g, ''); // remove thousand separators
    return parseFloat(s) || 0;
  };

  const parseInventoryTXT = (text) => {
    const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    let category = 'Materia Prima';

    const isCodeLine    = (l) => /^[A-Z][A-Z0-9\-\.]+$/.test(l);
    const isOnlyNum     = (l) => /^[\d\.,]+$/.test(l);
    const isTwoNums     = (l) => /^[\d\.,]+\s+[\d\.,]+$/.test(l);
    const isDept        = (l) => /^Departamento\s*:/i.test(l);
    const isHeader      = (l) => /^C.*digo/i.test(l);

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (isHeader(line)) { i++; continue; }

      if (isDept(line)) {
        const d = line.replace(/Departamento\s*:\s*/i, '').trim().toUpperCase();
        if (d.includes('MATERIA'))      category = 'Materia Prima';
        else if (d.includes('QUIM'))    category = 'Consumibles';
        else if (d.includes('PINT'))    category = 'Consumibles';
        else                            category = 'Consumibles';
        i++; continue;
      }

      // ── Línea completa: CÓDIGO DESC... COSTO STOCK [VALOR] ──
      const full = line.match(/^([A-Z][A-Z0-9\-\.]+)\s+(.+?)\s+([\d\.,]+)\s+([\d\.,]+)(?:\s+[\d\.,]+)?$/);
      if (full) {
        const [, code, desc, cost, stock] = full;
        items.push({ id: code.replace(/\.+$/, ''), desc: desc.toUpperCase(), cost: parseInvNum(cost), stock: parseInvNum(stock), category, unit: 'kg' });
        i++; continue;
      }

      // ── Bloque agrupado: N códigos, N descrips, N costos, N "stock valor" ──
      if (isCodeLine(line)) {
        const codes = [];
        while (i < lines.length && isCodeLine(lines[i])) { codes.push(lines[i]); i++; }

        const descs = [];
        while (i < lines.length && !isCodeLine(lines[i]) && !isOnlyNum(lines[i]) && !isTwoNums(lines[i]) && !isDept(lines[i])) { descs.push(lines[i]); i++; }

        const costs = [];
        while (i < lines.length && isOnlyNum(lines[i]) && !isTwoNums(lines[i])) { costs.push(lines[i]); i++; }

        const stockVals = [];
        while (i < lines.length && isTwoNums(lines[i])) { const p = lines[i].split(/\s+/); stockVals.push(p); i++; }

        for (let j = 0; j < codes.length; j++) {
          const code = codes[j].replace(/\.+$/, '');
          const desc = (descs[j] || codes[j]).toUpperCase();
          const cost = parseInvNum(costs[j] || '0');
          const stock = parseInvNum(stockVals[j]?.[0] || '0');
          items.push({ id: code, desc, cost, stock, category, unit: 'kg' });
        }
        continue;
      }

      i++;
    }
    return items;
  };

  const handleInvImportFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseInventoryTXT(e.target.result);
        setInvImportPreview(parsed);
        setShowInvImport(true);
      } catch (err) {
        setDialog({ title: 'Error', text: 'No se pudo leer el archivo: ' + err.message, type: 'alert' });
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleConfirmInvImport = async () => {
    if (invImportPreview.length === 0) return;
    requireAdminPassword(async () => {
      try {
        setInvImportLoading(true);
        const b = writeBatch(db);
        for (const item of invImportPreview) {
          b.set(getDocRef('inventory', item.id), {
            ...item,
            timestamp: Date.now(),
          }, { merge: true }); // merge: true conserva stock existente si el ítem ya existe con ese ID
        }
        await b.commit();
        setShowInvImport(false);
        setInvImportPreview([]);
        setInvImportLoading(false);
        setDialog({ title: '✅ Inventario Importado', text: `Se cargaron ${invImportPreview.length} ítems al catálogo de inventario correctamente.`, type: 'alert' });
      } catch (err) {
        setInvImportLoading(false);
        setDialog({ title: 'Error', text: err.message, type: 'alert' });
      }
    }, 'Importar Inventario Inicial');
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
                 <label className="text-[10px] font-bold text-gray-500 uppercase block mb-3">Permisos de Módulos y Sub-módulos</label>
                 <div className="space-y-3">
                   {[
                     { key:'ventas', label:'Ventas y Facturación', icon:'👥', subs:[
                       {key:'ventas_ops', label:'OPs / Requisiciones'},
                       {key:'ventas_facturacion', label:'Facturación'},
                       {key:'ventas_directorio', label:'Directorio de Clientes'},
                     ]},
                     { key:'produccion', label:'Producción Planta', icon:'🏭', subs:[
                       {key:'produccion_proyeccion', label:'Proyección MP'},
                       {key:'produccion_ordenes', label:'Órdenes de Compra'},
                       {key:'produccion_activa', label:'Producción Activa'},
                       {key:'produccion_historial', label:'Historial / Reportes'},
                     ]},
                     { key:'formulas', label:'Fórmulas / Recetas', icon:'🧪', subs:[] },
                     { key:'inventario', label:'Control Inventario', icon:'📦', subs:[
                       {key:'inventario_solicitudes', label:'Solicitudes de Planta'},
                       {key:'inventario_catalogo', label:'Catálogo'},
                       {key:'inventario_movimientos', label:'Entradas / Salidas'},
                       {key:'inventario_kardex', label:'Kardex y Reportes'},
                     ]},
                     { key:'simulador', label:'Simulador OP', icon:'🧮', subs:[] },
                     { key:'costos', label:'Costos / Reportes Financieros', icon:'💰', subs:[
                       {key:'costos_operativos', label:'Costos Operativos'},
                       {key:'costos_reportes', label:'Reportes Financieros / Estado de Resultado'},
                     ]},
                     { key:'configuracion', label:'Configuración', icon:'⚙️', subs:[] },
                   ].map(mod => (
                     <div key={mod.key} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                       {/* Módulo principal */}
                       <label className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${newUserForm.permissions[mod.key] ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                         <input type="checkbox"
                           checked={!!newUserForm.permissions[mod.key]}
                           onChange={e=>{
                             const checked = e.target.checked;
                             const newPerms = {...newUserForm.permissions, [mod.key]: checked};
                             // Si se quita el módulo, quitar todos sus sub-permisos
                             if (!checked) mod.subs.forEach(s=>{ newPerms[s.key]=false; });
                             setNewUserForm({...newUserForm, permissions: newPerms});
                           }}
                           className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" />
                         <span className="text-sm">{mod.icon}</span>
                         <span className="text-xs font-black uppercase text-gray-800">{mod.label}</span>
                         {newUserForm.permissions[mod.key] && mod.subs.length > 0 && (
                           <span className="ml-auto text-[9px] font-bold text-orange-600">▼ Configurar sub-módulos</span>
                         )}
                       </label>
                       {/* Sub-módulos (solo si el módulo está activo y tiene subs) */}
                       {newUserForm.permissions[mod.key] && mod.subs.length > 0 && (
                         <div className="border-t border-gray-200 px-4 py-3 bg-white grid grid-cols-2 gap-2">
                           {mod.subs.map(sub => (
                             <label key={sub.key} className="flex items-center gap-2 cursor-pointer hover:bg-orange-50 px-3 py-2 rounded-lg border border-gray-100 transition-all">
                               <input type="checkbox"
                                 checked={!!newUserForm.permissions[sub.key]}
                                 onChange={e=>setNewUserForm({...newUserForm, permissions:{...newUserForm.permissions,[sub.key]:e.target.checked}})}
                                 className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded" />
                               <span className="text-[10px] font-bold text-gray-600 uppercase">{sub.label}</span>
                             </label>
                           ))}
                         </div>
                       )}
                     </div>
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
                        <div className="flex gap-1 flex-wrap max-w-[250px]">
                          {['ventas','produccion','formulas','inventario','simulador','costos','configuracion'].filter(k=>u.permissions?.[k]).map(k=>(
                            <span key={k} className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[8px] font-black uppercase">{k}</span>
                          ))}
                          {Object.keys(u.permissions||{}).filter(k=>k.includes('_')&&u.permissions[k]).length > 0 && (
                            <span className="text-[8px] text-gray-400 font-bold">+{Object.keys(u.permissions||{}).filter(k=>k.includes('_')&&u.permissions[k]).length} sub</span>
                          )}
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
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
           <div className="flex justify-between items-center mb-6 border-b pb-4">
             <h2 className="text-xl font-black uppercase text-black flex items-center gap-3">
               <FileText className="text-blue-500"/> Plan de Cuentas
             </h2>
             <div className="flex gap-2">
               <button onClick={()=>setShowPDCImport(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-700"><ArrowDownToLine size={14}/> IMPORTAR TXT</button>
               {planDeCuentas.length > 0 && <button onClick={()=>setDialog({title:'Limpiar Plan',text:'Eliminar TODAS las cuentas del plan? Esta accion es irreversible.',type:'confirm',onConfirm:async()=>{const b=writeBatch(db);planDeCuentas.forEach(p=>b.delete(getDocRef('planDeCuentas',p.id)));await b.commit();}})} className="bg-red-100 text-red-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-200"><Trash2 size={14}/></button>}
             </div>
           </div>

           {showPDCImport && (
             <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
               <h3 className="text-sm font-black uppercase text-blue-800 mb-3">Importar Plan de Cuentas desde TXT</h3>
               <p className="text-xs font-bold text-blue-600 mb-4">Formato requerido (separado por tabulaciones o pipes):<br/>
                 <code className="bg-white px-2 py-1 rounded font-mono text-[10px]">Codigo | Nombre | Grupo | Sub-grupo | Cuenta | Subcuenta</code>
               </p>
               <div className="flex gap-3 items-center">
                 <input type="file" accept=".txt,.csv,.tsv" onChange={e=>{ if(e.target.files[0]) handleImportPlanCuentasTXT(e.target.files[0]); }} className="flex-1 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-black file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" />
                 <button onClick={()=>setShowPDCImport(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-300">Cancelar</button>
               </div>
             </div>
           )}

           <div className="mb-4 relative max-w-sm">
             <Search className="absolute left-3 top-3 text-gray-400" size={16}/>
             <input type="text" placeholder="Buscar cuenta..." value={pdcSearchTerm} onChange={e=>setPdcSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
           </div>

           {planDeCuentas.length === 0 ? (
             <div className="text-center py-16 text-gray-400">
               <FileText size={48} className="mx-auto mb-4 opacity-30"/>
               <p className="font-black text-xs uppercase">Plan de cuentas vacio</p>
               <p className="text-xs mt-2">Importe un archivo TXT con el formato indicado</p>
             </div>
           ) : (
             <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[500px] overflow-y-auto">
               <table className="w-full text-xs text-left">
                 <thead className="bg-gray-100 border-b-2 border-gray-200 sticky top-0">
                   <tr className="uppercase font-black text-[9px] text-gray-600 tracking-widest">
                     <th className="py-2 px-3 border-r">Codigo</th>
                     <th className="py-2 px-3 border-r">Nombre / Cuenta</th>
                     <th className="py-2 px-3 border-r">Grupo</th>
                     <th className="py-2 px-3 border-r">Sub-grupo</th>
                     <th className="py-2 px-3 text-center">Accion</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {planDeCuentas.filter(p => {
                     const q = pdcSearchTerm.toUpperCase();
                     return !q || (p.codigo||'').includes(q) || (p.nombre||'').includes(q) || (p.grupo||'').includes(q);
                   }).map(p => (
                     <tr key={p.id} className="hover:bg-gray-50">
                       <td className="py-2 px-3 border-r font-black text-blue-600 font-mono text-[10px]">{p.codigo}</td>
                       <td className="py-2 px-3 border-r font-bold uppercase text-[10px]">{p.nombre}</td>
                       <td className="py-2 px-3 border-r font-bold text-[9px]">{p.grupo}</td>
                       <td className="py-2 px-3 border-r font-bold text-[9px]">{p.subGrupo}</td>
                       <td className="py-2 px-3 text-center">
                         <button onClick={()=>handleDeleteCuenta(p.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div className="px-4 py-2 bg-gray-50 border-t text-xs font-bold text-gray-500">{planDeCuentas.length} cuentas en el plan</div>
             </div>
           )}
        </div>
        {/* ── IMPORTAR INVENTARIO INICIAL ── */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-black uppercase text-black flex items-center gap-3">
                <Package className="text-orange-500"/> Importar Inventario Inicial
              </h2>
              <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wide">Carga masiva desde archivo TXT exportado del sistema contable</p>
            </div>
            <label className="cursor-pointer bg-orange-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-orange-600 transition-all shadow-md">
              <ArrowDownToLine size={16}/> SELECCIONAR ARCHIVO
              <input type="file" accept=".txt,.csv,.tsv" className="hidden" onChange={e => { if(e.target.files[0]) handleInvImportFile(e.target.files[0]); e.target.value=''; }} />
            </label>
          </div>

          {!showInvImport && (
            <div className="text-center py-10 text-gray-400">
              <Package size={48} className="mx-auto mb-4 opacity-20"/>
              <p className="font-black text-xs uppercase">Ningún archivo cargado aún</p>
              <p className="text-xs mt-2 font-bold">Seleccione un archivo TXT con el formato del sistema contable.<br/>
                Soporta departamentos: <span className="text-orange-500 font-black">MATERIA PRIMA · QUÍMICOS · PINTURA</span></p>
              <div className="mt-6 inline-block bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left text-[10px] font-mono text-gray-500">
                <p className="font-black text-gray-700 mb-2 uppercase font-sans text-[9px]">Formato esperado (columnas separadas por espacio/tab):</p>
                <p>Departamento : MATERIA PRIMA</p>
                <p>MP-0240  ESENTTIA  2,15  2.325,00  4.998,75</p>
                <p>Departamento : QUIMICOS</p>
                <p>PRI0020  ALCOHOL ISOPROPILICO  2,37  50,00  118,50</p>
              </div>
            </div>
          )}

          {showInvImport && invImportPreview.length > 0 && (
            <div>
              {/* Resumen por categoría */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {['Materia Prima', 'Consumibles'].map(cat => {
                  const catItems = invImportPreview.filter(i => i.category === cat);
                  const totalVal = catItems.reduce((s, i) => s + i.cost * i.stock, 0);
                  return (
                    <div key={cat} className={`rounded-2xl p-4 border-2 text-center ${cat === 'Materia Prima' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                      <p className={`text-[9px] font-black uppercase mb-1 ${cat === 'Materia Prima' ? 'text-blue-600' : 'text-orange-600'}`}>{cat}</p>
                      <p className={`text-2xl font-black ${cat === 'Materia Prima' ? 'text-blue-700' : 'text-orange-700'}`}>{catItems.length}</p>
                      <p className="text-[9px] font-bold text-gray-500 mt-1">ítems · ${formatNum(totalVal)} USD</p>
                    </div>
                  );
                })}
                <div className="bg-gray-800 rounded-2xl p-4 border-2 border-gray-700 text-center">
                  <p className="text-[9px] font-black uppercase mb-1 text-gray-400">TOTAL</p>
                  <p className="text-2xl font-black text-white">{invImportPreview.length}</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1">ítems · ${formatNum(invImportPreview.reduce((s,i) => s + i.cost*i.stock, 0))} USD</p>
                </div>
              </div>

              {/* Tabla de vista previa */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[420px] overflow-y-auto mb-6">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-900 text-white sticky top-0">
                    <tr className="text-[9px] font-black uppercase tracking-widest">
                      <th className="py-2 px-4 border-r border-gray-700">#</th>
                      <th className="py-2 px-4 border-r border-gray-700">Código</th>
                      <th className="py-2 px-4 border-r border-gray-700">Descripción</th>
                      <th className="py-2 px-4 border-r border-gray-700">Categoría</th>
                      <th className="py-2 px-4 border-r border-gray-700 text-right">Costo USD</th>
                      <th className="py-2 px-4 text-right">Existencia (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invImportPreview.map((item, idx) => (
                      <tr key={item.id} className={`hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                        <td className="py-2 px-4 font-bold text-gray-400 border-r border-gray-100">{idx + 1}</td>
                        <td className="py-2 px-4 font-black text-orange-600 border-r border-gray-100 font-mono">{item.id}</td>
                        <td className="py-2 px-4 font-bold border-r border-gray-100 max-w-xs">{item.desc}</td>
                        <td className="py-2 px-4 border-r border-gray-100">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${item.category === 'Materia Prima' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{item.category}</span>
                        </td>
                        <td className="py-2 px-4 text-right font-black border-r border-gray-100">${formatNum(item.cost)}</td>
                        <td className="py-2 px-4 text-right font-black">{formatNum(item.stock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 justify-between items-center bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                <div>
                  <p className="text-xs font-black text-orange-800 uppercase">¿Todo correcto?</p>
                  <p className="text-[10px] font-bold text-orange-600">Los ítems existentes con el mismo código se actualizarán (merge). Los nuevos se crearán.</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => { setShowInvImport(false); setInvImportPreview([]); }} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-gray-300">Cancelar</button>
                  <button onClick={handleConfirmInvImport} disabled={invImportLoading} className="bg-orange-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-orange-600 shadow-md flex items-center gap-2 disabled:opacity-60">
                    {invImportLoading ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                    CONFIRMAR IMPORTACIÓN
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RESPALDO Y RESET ── */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-black uppercase text-black mb-2 flex items-center gap-3 border-b pb-4">
            <Save className="text-green-500"/> Respaldo y Reinicio del Sistema
          </h2>
          <p className="text-xs font-bold text-gray-500 mb-6 uppercase tracking-wide">Ambas acciones requieren clave de administrador.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* RESPALDO */}
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <Download size={24} className="text-green-600"/>
                </div>
                <div>
                  <h3 className="font-black text-green-800 uppercase text-sm">Respaldar Sistema</h3>
                  <p className="text-[10px] font-bold text-green-600">Datos JSON + instrucciones App.jsx</p>
                </div>
              </div>

              {/* Contenido del respaldo */}
              <div className="text-[9px] font-bold text-green-600 bg-green-100 rounded-xl p-3 space-y-0.5">
                {['Inventario y Movimientos (Kardex)', 'Clientes, OPs y Facturas', 'Asientos Contables y Plan de Cuentas', 'Costos Operativos y Órdenes de Compra', 'WIP y Productos Terminados', 'Requisiciones de Planta'].map(item => (
                  <div key={item} className="flex items-center gap-1.5"><CheckCircle size={10} className="text-green-500 shrink-0"/> {item}</div>
                ))}
              </div>

              {/* Carpeta destino — solo editable con admin */}
              <div>
                <label className="text-[10px] font-black text-green-700 uppercase block mb-1">📁 Carpeta de Respaldo <span className="text-orange-600">(🔒 Admin)</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="backupFolderPath"
                    readOnly
                    defaultValue={localStorage.getItem('backupFolder') || 'C:\\Respaldos\\GYB_ERP'}
                    className="flex-1 border-2 border-green-200 rounded-xl p-2.5 text-xs font-bold bg-gray-50 outline-none text-gray-600"
                  />
                  <button onClick={() => requireAdminPassword(() => {
                    const newPath = prompt('Nueva ruta de carpeta de respaldo:', localStorage.getItem('backupFolder') || 'C:\\Respaldos\\GYB_ERP');
                    if (newPath) { localStorage.setItem('backupFolder', newPath); document.getElementById('backupFolderPath').value = newPath; setDialog({title:'✅ Ruta actualizada', text:`Carpeta configurada: ${newPath}`, type:'alert'}); }
                  }, 'Cambiar Carpeta de Respaldo')} className="bg-orange-500 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-orange-600 flex items-center gap-1 shrink-0"><Edit size={12}/> CAMBIAR</button>
                </div>
                <p className="text-[9px] text-green-600 font-bold mt-1">⚠ El navegador descarga a tu carpeta de Descargas. Mueve el archivo a la ruta configurada.</p>
              </div>

              {/* Programación */}
              <div>
                <label className="text-[10px] font-black text-green-700 uppercase block mb-2">⏰ Frecuencia de Recordatorio</label>
                <div className="flex gap-2 flex-wrap mb-3">
                  {[['manual','Manual'],['diario','Diario'],['semanal','Semanal'],['mensual','Mensual']].map(([val,label])=>(
                    <button key={val} onClick={()=>{setBackupFreq(val);localStorage.setItem('backupFreq',val);}}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border-2 transition-all ${backupFreq===val?'bg-green-600 text-white border-green-600':'bg-white text-green-700 border-green-300 hover:border-green-500'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {backupFreq !== 'manual' && (
                  <div className="bg-green-100 border border-green-300 rounded-xl p-3">
                    <label className="text-[9px] font-black text-green-700 uppercase block mb-1">🕐 Hora de ejecución automática</label>
                    <div className="flex items-center gap-2">
                      <input type="time" value={backupTime}
                        onChange={e=>{setBackupTime(e.target.value);localStorage.setItem('backupTime',e.target.value);}}
                        className="border-2 border-green-300 rounded-lg px-3 py-1.5 text-sm font-black text-green-800 outline-none bg-white focus:border-green-500" />
                      <span className="text-[9px] font-bold text-green-600">El sistema ejecutará el respaldo automáticamente a esta hora cada {backupFreq === 'diario' ? 'día' : backupFreq === 'semanal' ? 'semana' : 'mes'} mientras el sistema esté abierto.</span>
                    </div>
                  </div>
                )}
                {backupLastRun && <p className="text-[9px] font-bold text-green-600 mt-2">✓ Último respaldo: <span className="font-black">{backupLastRun}</span></p>}
                {backupFreq !== 'manual' && (() => {
                  const hoy = getTodayDate();
                  const last = backupLastRun;
                  let needsBackup = false;
                  if (!last) { needsBackup = true; }
                  else {
                    const diffDays = Math.floor((new Date(hoy) - new Date(last)) / 86400000);
                    if (backupFreq === 'diario' && diffDays >= 1) needsBackup = true;
                    if (backupFreq === 'semanal' && diffDays >= 7) needsBackup = true;
                    if (backupFreq === 'mensual' && diffDays >= 30) needsBackup = true;
                  }
                  return needsBackup ? (
                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 mt-2 text-[9px] font-black text-yellow-700 uppercase">
                      ⚠ Respaldo {backupFreq} pendiente — haga clic en "Respaldar" ahora o espere las {backupTime}
                    </div>
                  ) : (
                    <div className="bg-green-100 border border-green-200 rounded-lg p-2 mt-2 text-[9px] font-black text-green-700 uppercase">
                      ✓ Respaldo al día · próximo a las {backupTime}
                    </div>
                  );
                })()}
              </div>

              {/* Botones de respaldo */}
              <div className="flex gap-2">
                <button
                  onClick={() => requireAdminPassword(() => handleBackupData(), 'Generar Respaldo de Datos')}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <Download size={14}/> RESPALDAR DATOS
                </button>
              </div>
              {/* Importar respaldo */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-[10px] font-black text-blue-700 uppercase mb-2">📥 Importar Respaldo JSON</p>
                <p className="text-[9px] font-bold text-blue-600 mb-2">Carga un archivo de respaldo previo para restaurar los datos del sistema. Requiere clave admin.</p>
                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 flex items-center gap-2 w-full justify-center">
                  <ArrowDownToLine size={14}/> SELECCIONAR ARCHIVO JSON
                  <input type="file" accept=".json" className="hidden" onChange={e => { if(e.target.files[0]) handleImportBackupJSON(e.target.files[0]); e.target.value=''; }} />
                </label>
              </div>
            </div>

            {/* RESET */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <RefreshCw size={24} className="text-red-600"/>
                </div>
                <div>
                  <h3 className="font-black text-red-800 uppercase text-sm">Reiniciar Sistema</h3>
                  <p className="text-[10px] font-bold text-red-600">Borrar todos los datos operativos</p>
                </div>
              </div>
              <p className="text-xs font-bold text-red-700 mb-4">
                Elimina <span className="font-black">permanentemente</span> todos los datos operativos y deja el sistema limpio. <span className="font-black underline">Los usuarios y la configuración se conservan.</span>
              </p>
              <div className="text-[9px] font-bold text-red-600 bg-red-100 rounded-xl p-3 mb-4 space-y-0.5">
                {['Inventario y Movimientos', 'Clientes, OPs y Facturas', 'Asientos Contables', 'Costos Operativos', 'Órdenes de Compra', 'WIP y Productos Terminados'].map(item => (
                  <div key={item} className="flex items-center gap-1.5"><Trash2 size={10} className="text-red-500 shrink-0"/> Se borrará: {item}</div>
                ))}
              </div>
              <button
                onClick={() => requireAdminPassword(handleResetSystem, 'Reiniciar Sistema Completo')}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <RefreshCw size={16}/> REINICIAR SISTEMA
              </button>
            </div>

          </div>
        </div>

      </div>
    );
  };

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

  const hasPerm = (module) => { if (!appUser) return false; if (appUser.role === 'Master') return true; const p = appUser.permissions || {}; return !!p[module]; };

  return (
    <ErrorBoundary>
      <style>{`
        @media print {
          .no-pdf { display: none !important; }
          .print\\:hidden { display: none !important; }
          nav { display: none !important; }
          .sticky { position: static !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
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
                    {hasPerm('formulas') && <button onClick={() => {clearAllReports(); setActiveTab('formulas');}} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'formulas' ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}><Beaker size={14}/> Fórmulas</button>}
                    {hasPerm('inventario') && <button onClick={() => {clearAllReports(); setActiveTab('inventario');}} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'inventario' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}><Package size={14}/> Inventario</button>}
                    {(hasPerm('costos_operativos')||hasPerm('costos_reportes')) && <button onClick={() => {clearAllReports(); setActiveTab(hasPerm('costos_reportes')?'costos':'costos_operativos');}} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${(activeTab==='costos'||activeTab==='costos_operativos') ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}><BarChart3 size={14}/> Reportes</button>}
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
                   {id:'requisiciones', icon:<ClipboardList size={16}/>, label:'Solicitudes Planta', perm:'inventario_solicitudes'},
                   {id:'catalogo', icon:<Box size={16}/>, label:'Catálogo', perm:'inventario_catalogo'}, 
                   {id:'wip', icon:<Beaker size={16}/>, label:'WIP (Proceso)', perm:'inventario_catalogo'}, 
                   {id:'finished', icon:<Package size={16}/>, label:'Terminados', perm:'inventario_catalogo'}, 
                   {id:'cargo', icon:<ArrowDownToLine size={16}/>, label:'Entradas', perm:'inventario_movimientos'}, 
                   {id:'descargo', icon:<ArrowUpFromLine size={16}/>, label:'Salidas', perm:'inventario_movimientos'}, 
                   {id:'ajuste', icon:<ShieldCheck size={16}/>, label:'Ajuste Único', perm:'inventario_movimientos'}, 
                   {id:'toma_fisica', icon:<ClipboardEdit size={16}/>, label:'Toma Física', perm:'inventario_movimientos'}, 
                   {id:'kardex', icon:<History size={16}/>, label:'Kardex', perm:'inventario_kardex'}, 
                   {id:'reportes_mod', icon:<FileText size={16}/>, label:'Reportes', perm:'inventario_kardex'}, 
                   {id:'reporte177', icon:<FileCheck size={16}/>, label:'Art. 177 ISLR', perm:'inventario_kardex'}, 
                 ].filter(t => hasPerm('inventario') && (hasPerm(t.perm) || appUser?.role==='Master')).map(t => (
                    <button key={t.id} onClick={()=>{setInvView(t.id); clearAllReports();}} className={`py-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 whitespace-nowrap ${invView === t.id ? 'border-orange-500 text-black' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>{t.icon} {t.label}</button>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'produccion' && (
           <div className="bg-white border-b border-gray-200 shadow-sm print:hidden sticky top-[72px] z-30">
              <div className="max-w-7xl mx-auto flex gap-6 px-6 overflow-x-auto">
                 {[ 
                   {id:'proyeccion', icon:<TrendingUp size={16}/>, label:'Proyección MP', perm:'produccion_proyeccion'},
                   {id:'ordenes_compra', icon:<ShoppingCart size={16}/>, label:'Órdenes Compra', perm:'produccion_ordenes'},
                   {id:'activos', icon:<PlayCircle size={16}/>, label:'Producción Activa', perm:'produccion_activa'}, 
                   {id:'en_proceso', icon:<Gauge size={16}/>, label:'Reporte en Proceso', perm:'produccion_activa'},
                   {id:'reportes', icon:<FileText size={16}/>, label:'Historial / Reportes', perm:'produccion_historial'}
                 ].filter(t => hasPerm('produccion') && (hasPerm(t.perm) || appUser?.role==='Master')).map(t => (
                    <button key={t.id} onClick={()=>{setProdView(t.id); clearAllReports();}} className={`py-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 whitespace-nowrap ${prodView === t.id ? 'border-orange-500 text-black' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>{t.icon} {t.label}</button>
                 ))}
              </div>
           </div>
        )}

        <main className="flex-1 p-4 md:p-8 max-w-[1400px] mx-auto w-full print:p-0 print:m-0 print:max-w-none print:w-full bg-transparent print:bg-white">
           {activeTab === 'home' && renderHome()}
           {activeTab === 'ventas' && renderVentasModule()}
           {activeTab === 'formulas' && renderFormulasModule()}
           {activeTab === 'produccion' && renderProduccionModule()}
           {activeTab === 'inventario' && renderInventoryModule()}
           {activeTab === 'simulador' && renderSimuladorModule()}
           {activeTab === 'costos_operativos' && renderCostosOperativosModule()}
           {activeTab === 'configuracion' && renderConfiguracionModule()}
           {activeTab === 'costos' && renderReportesFinancierosModule()}
           {activeTab === 'estado_resultado' && renderEstadoResultadoModule()}
           {activeTab === 'libro_diario' && renderLibroDiarioModule()}
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

        {/* ── MODAL ENTREGA PARCIAL ── */}
        {showPartialModal && (() => {
          const req = showPartialModal;
          const prod = req.production || {};
          const allB = [...(prod.extrusion?.batches||[]),...(prod.impresion?.batches||[]),...(prod.sellado?.batches||[])];
          const totalKgProd = allB.reduce((s,b)=>s+parseNum(b.producedKg),0);
          const totalMillProd = (prod.sellado?.batches||[]).reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0)
            || (prod.impresion?.batches||[]).reduce((s,b)=>s+parseNum(b.techParams?.millares||0),0);
          const yaEntregado = (req.entregasParciales||[]).reduce((s,e)=>s+parseNum(e.kg),0);
          const yaMillares = (req.entregasParciales||[]).reduce((s,e)=>s+parseNum(e.millares),0);
          const esTermo = req.tipoProducto === 'TERMOENCOGIBLE';
          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 print:hidden">
              <div className="bg-white p-10 rounded-[2rem] shadow-2xl max-w-md w-full border-t-8 border-blue-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black uppercase text-blue-800">Entrega Parcial de Producción</h3>
                  <button onClick={()=>setShowPartialModal(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-xs font-bold">
                  <p className="text-blue-800 font-black uppercase mb-2">OP #{String(req.id).replace('OP-','').padStart(5,'0')} — {req.client}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-gray-500">KG Producidos:</span> <span className="font-black text-blue-700">{formatNum(totalKgProd)} KG</span></div>
                    <div><span className="text-gray-500">Ya Entregado:</span> <span className="font-black text-green-700">{formatNum(yaEntregado)} KG</span></div>
                    {!esTermo && <div><span className="text-gray-500">Millares Prod.:</span> <span className="font-black text-blue-700">{formatNum(totalMillProd)}</span></div>}
                    {!esTermo && <div><span className="text-gray-500">Mill. Entregados:</span> <span className="font-black text-green-700">{formatNum(yaMillares)}</span></div>}
                    <div className="col-span-2"><span className="text-gray-500">Pendiente:</span> <span className="font-black text-orange-600">{formatNum(Math.max(0,totalKgProd-yaEntregado))} KG</span></div>
                  </div>
                </div>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase block mb-1">KG a Entregar *</label>
                    <input type="number" step="0.01" value={partialKg} onChange={e=>setPartialKg(e.target.value)} className="w-full border-2 border-blue-300 rounded-xl p-3 font-black text-lg text-center outline-none focus:border-blue-500" placeholder="0.00" autoFocus />
                  </div>
                  {!esTermo && (
                    <div>
                      <label className="text-[10px] font-black text-gray-600 uppercase block mb-1">Millares a Entregar</label>
                      <input type="number" step="0.01" value={partialMillares} onChange={e=>setPartialMillares(e.target.value)} className="w-full border-2 border-blue-200 rounded-xl p-3 font-black text-lg text-center outline-none focus:border-blue-500" placeholder="0.00" />
                    </div>
                  )}
                </div>
                <p className="text-[9px] font-bold text-gray-400 mb-4 text-center uppercase">La OP permanece activa para producción adicional. Se genera una entrada en Productos Terminados.</p>
                <div className="flex gap-3">
                  <button onClick={()=>setShowPartialModal(null)} className="flex-1 bg-gray-200 text-gray-700 font-black py-4 rounded-xl uppercase text-xs hover:bg-gray-300">Cancelar</button>
                  <button onClick={handlePartialDelivery} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl uppercase text-xs shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2"><ArrowUpFromLine size={16}/> Confirmar Entrega</button>
                </div>
              </div>
            </div>
          );
        })()}

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
                  Use la misma clave del usuario administrador del sistema
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

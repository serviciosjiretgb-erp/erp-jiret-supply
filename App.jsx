import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Factory, TrendingUp, AlertTriangle, 
  ClipboardList, PlayCircle, History, FileText, Settings2, Trash2, 
  PlusCircle, Calculator, Plus, Users, UserPlus, LogOut, Lock, 
  ArrowDownToLine, ArrowUpFromLine, BarChart3, ShieldCheck, Box, Home, Edit, Printer, X, Search, Loader2, FileCheck, Beaker, CheckCircle, CheckCircle2, Receipt, ArrowRight, User, ArrowRightLeft, ClipboardEdit, Download, Thermometer, Gauge
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, deleteDoc, writeBatch } from "firebase/firestore";

// ============================================================================
// ESCUDO DE ERRORES EXTREMO (Evita la pantalla blanca)
// ============================================================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error) { this.setState({ errorMsg: error?.message || String(error) }); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <AlertTriangle size={60} className="text-red-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-black text-black uppercase mb-2">Sistema Protegido</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md">{this.state.errorMsg}</p>
          <button onClick={() => window.location.reload()} className="bg-black text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg">Reiniciar ERP</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

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
  let str = String(val).trim();
  if (str.includes('.') && str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
  else if (str.includes(',')) str = str.replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
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
  const [showNewReqPanel, setShowNewReqPanel] = useState(false);
  const [showNewInvoicePanel, setShowNewInvoicePanel] = useState(false);
  const [showGeneralInvoicesReport, setShowGeneralInvoicesReport] = useState(false);
  const [showClientReport, setShowClientReport] = useState(false);
  const [showReqReport, setShowReqReport] = useState(false);
  const [showSingleReqReport, setShowSingleReqReport] = useState(null);
  const [showSingleInvoice, setShowSingleInvoice] = useState(null);

  // MÓDULO VENTAS (SELLADO)
  const initialClientForm = { rif: '', razonSocial: '', direccion: '', telefono: '', personaContacto: '', vendedor: '', fechaCreacion: getTodayDate() };
  const [newClientForm, setNewClientForm] = useState(initialClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const initialReqForm = { fecha: getTodayDate(), client: '', tipoProducto: 'BOLSAS', desc: '', ancho: '', fuelles: '', largo: '', micras: '', pesoMillar: '', presentacion: 'MILLAR', cantidad: '', requestedKg: '', color: 'NATURAL', tratamiento: 'LISO', vendedor: '' };
  const [newReqForm, setNewReqForm] = useState(initialReqForm);
  const [editingReqId, setEditingReqId] = useState(null);
  const initialInvoiceForm = { fecha: getTodayDate(), clientRif: '', clientName: '', documento: '', productoMaquilado: '', vendedor: '', montoBase: '', iva: '', total: '', aplicaIva: 'SI', opAsignada: '' };
  const [newInvoiceForm, setNewInvoiceForm] = useState(initialInvoiceForm);

  // MÓDULO PRODUCCIÓN BLINDADO
  const initialPhaseForm = { date: getTodayDate(), insumos: [], producedKg: '', mermaKg: '' };
  const [showWorkOrder, setShowWorkOrder] = useState(null);
  const [showFiniquito, setShowFiniquito] = useState(null);
  const [recipeEditReqId, setRecipeEditReqId] = useState(null);
  const [selectedPhaseReqId, setSelectedPhaseReqId] = useState(null);
  const [activePhaseTab, setActivePhaseTab] = useState('extrusion');
  const [phaseForm, setPhaseForm] = useState(initialPhaseForm);
  const [tempRecipe, setTempRecipe] = useState([]);
  const [newIngId, setNewIngId] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [phaseIngId, setPhaseIngId] = useState('');
  const [phaseIngQty, setPhaseIngQty] = useState('');

  const [calcInputs, setCalcInputs] = useState({ 
    ingredientes: [{ id: Date.now() + 1, nombre: 'MP-0240', pct: 80, costo: 0.96 }, { id: Date.now() + 2, nombre: 'MP-RECICLADO', pct: 20, costo: 1.00 }], 
    mezclaTotal: 745, 
    mermaGlobalPorc: 5, 
    tipoProducto: 'BOLSAS',
    ancho: '', fuelles: '', largo: '', micras: ''
  });

  const initialInvItemForm = { id: '', desc: '', category: 'Materia Prima', unit: 'kg', cost: '', stock: '' };
  const [newInvItemForm, setNewInvItemForm] = useState(initialInvItemForm);
  const [editingInvId, setEditingInvId] = useState(null); // NUEVO ESTADO PARA EDITAR INVENTARIO
  const initialMovementForm = { date: getTodayDate(), itemId: '', type: 'ENTRADA', qty: '', cost: '', reference: '', notes: '' };
  const [newMovementForm, setNewMovementForm] = useState(initialMovementForm);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth Error:", err));
    onAuthStateChanged(auth, setFbUser);
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    const unsubInv = onSnapshot(getColRef('inventory'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() })); setInventory(data);
      if (s.empty) { INITIAL_INVENTORY.forEach(item => setDoc(getDocRef('inventory', item.id), item)); }
    });
    const unsubMovs = onSnapshot(getColRef('inventoryMovements'), (s) => setInvMovements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubCli = onSnapshot(getColRef('clientes'), (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubReq = onSnapshot(getColRef('requirements'), (s) => setRequirements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    const unsubInvB = onSnapshot(getColRef('maquilaInvoices'), (s) => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))));
    return () => { unsubInv(); unsubMovs(); unsubCli(); unsubReq(); unsubInvB(); };
  }, [fbUser]);

  // LOGICA INVENTARIO (CON FUNCIÓN DE EDITAR)
  const handleSaveInvItem = async (e) => {
    e.preventDefault(); if (!newInvItemForm.id || !newInvItemForm.desc) return setDialog({ title: 'Aviso', text: 'Código y descripción obligatorios.', type: 'alert' });
    const itemData = { ...newInvItemForm, id: newInvItemForm.id.toUpperCase(), desc: newInvItemForm.desc.toUpperCase(), cost: parseNum(newInvItemForm.cost), stock: parseNum(newInvItemForm.stock), timestamp: Date.now() };
    try { 
      await setDoc(getDocRef('inventory', itemData.id), itemData, { merge: true }); 
      setNewInvItemForm(initialInvItemForm); 
      setEditingInvId(null);
      setDialog({ title: 'Éxito', text: 'Artículo guardado correctamente.', type: 'alert' });
    } catch(err) { setDialog({ title: 'Error', text: err.message, type: 'alert' }); }
  };

  const startEditInvItem = (item) => {
    setEditingInvId(item.id);
    setNewInvItemForm({
      id: item.id,
      desc: item.desc,
      category: item.category || 'Materia Prima',
      cost: item.cost || '',
      stock: item.stock || '',
      unit: item.unit || 'kg'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault(); const item = (inventory || []).find(i => i?.id === newMovementForm.itemId); if (!item) return;
    const qty = parseNum(newMovementForm.qty); const isAddition = newMovementForm.type === 'ENTRADA' || newMovementForm.type === 'AJUSTE (POSITIVO)';
    const movCost = newMovementForm.cost ? parseNum(newMovementForm.cost) : (item?.cost || 0); const movId = Date.now().toString();
    try {
      const batch = writeBatch(db);
      batch.set(getDocRef('inventoryMovements', movId), { id: movId, date: newMovementForm.date, itemId: item.id, itemName: item.desc, type: newMovementForm.type, qty, cost: movCost, totalValue: qty * movCost, reference: newMovementForm.reference.toUpperCase(), notes: newMovementForm.notes.toUpperCase(), timestamp: Date.now(), user: appUser?.name });
      batch.update(getDocRef('inventory', item.id), { stock: (item?.stock || 0) + (isAddition ? qty : -qty), cost: isAddition && movCost > 0 ? movCost : (item?.cost || 0) });
      await batch.commit(); setNewMovementForm(initialMovementForm);
    } catch (err) { setDialog({title: 'Error', text: err.message, type: 'alert'}); }
  };
  const handleDeleteInvItem = (id) => setDialog({ title: 'Eliminar Ítem', text: `¿Eliminar ${id}?`, type: 'confirm', onConfirm: async () => await deleteDoc(getDocRef('inventory', id))});
  
  const generateReport177Data = () => {
    const data = []; const categories = [...new Set((inventory || []).map(i => i?.category || 'Otros'))];
    categories.forEach(cat => {
       const itemsData = (inventory || []).filter(i => (i?.category || 'Otros') === cat).map(item => {
          const movs = (invMovements || []).filter(m => m?.itemId === item?.id);
          const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
          let initialStock = item?.stock || 0;
          const itemCost = item?.cost || 0;
          return { ...item, initialStock, initialTotal: initialStock * itemCost, monthEntradasQty: 0, monthEntradasTotal: 0, monthEntradasProm: 0, monthSalidasQty: 0, monthSalidasTotal: 0, monthSalidasProm: 0, invFinalQty: initialStock, invFinalTotal: initialStock * itemCost, invFinalCost: itemCost };
       });
       data.push({ category: cat, items: itemsData });
    }); return data;
  };

  // LOGICA VENTAS (SELLADO)
  const handleAddClient = async (e) => {
    if (e) e.preventDefault(); if (!newClientForm.rif || !newClientForm.razonSocial) return;
    const rif = newClientForm.rif.toUpperCase().trim();
    try { await setDoc(getDocRef('clientes', rif), { ...newClientForm, name: newClientForm.razonSocial.toUpperCase().trim(), rif, timestamp: Date.now() }, { merge: true }); setNewClientForm(initialClientForm); setEditingClientId(null); } catch(err) { console.error(err); }
  };
  const startEditClient = (c) => { setEditingClientId(c.rif); setNewClientForm({ ...c, razonSocial: c.name }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const generateInvoiceId = () => `FAC-${((invoices || []).reduce((m, r) => Math.max(m, parseInt(String(r.id).replace(/\D/g, '')||0, 10)), 0) + 1).toString().padStart(4, '0')}`;
  const handleInvoiceFormChange = (field, value) => {
    let f = { ...newInvoiceForm, [field]: typeof value === 'string' ? value.toUpperCase() : value };
    if (field === 'clientRif') { const c = (clients || []).find(cl => cl.rif === value); f.clientName = c?.name || ''; f.vendedor = (c?.vendedor || '').toUpperCase(); f.opAsignada = ''; f.productoMaquilado = ''; }
    if (field === 'opAsignada') { const op = (requirements || []).find(r => r.id === value); f.productoMaquilado = op ? `OP N°: ${String(op.id).replace('OP-', '').padStart(5, '0')} | PRODUCTO: ${op.tipoProducto} | ESPECIFICACIONES: ${op.desc} | CANTIDAD: ${formatNum(op.cantidad)} ${op.presentacion}` : ''; }
    let base = parseNum(field === 'montoBase' ? value : f.montoBase); let applyIva = (field === 'aplicaIva' ? value : f.aplicaIva) === 'SI';
    if (applyIva) { const ivaCalc = base * 0.16; f.iva = ivaCalc > 0 ? ivaCalc.toFixed(2) : ''; f.total = base > 0 ? (base + ivaCalc).toFixed(2) : ''; } 
    else { f.iva = '0.00'; f.total = base > 0 ? base.toFixed(2) : ''; }
    setNewInvoiceForm(f);
  };
  const handleCreateInvoice = async (e) => {
    e.preventDefault(); if(!newInvoiceForm.clientRif || !newInvoiceForm.montoBase) return;
    const id = newInvoiceForm.documento || generateInvoiceId();
    try { await setDoc(getDocRef('maquilaInvoices', id), { ...newInvoiceForm, id, documento: id, montoBase: parseNum(newInvoiceForm.montoBase), iva: parseNum(newInvoiceForm.iva), total: parseNum(newInvoiceForm.total), timestamp: Date.now(), user: appUser?.name }); setShowNewInvoicePanel(false); setNewInvoiceForm(initialInvoiceForm); } catch(err) { console.error(err); }
  };
  const handleReqFormChange = (field, value) => {
    let f = { ...newReqForm, [field]: typeof value === 'string' ? value.toUpperCase() : value };
    if (field === 'client') { const c = (clients || []).find(cl => cl.name === (value||'').toUpperCase()); if (c && c.vendedor) f.vendedor = c.vendedor.toUpperCase(); }
    if (field === 'tipoProducto' && value === 'TERMOENCOGIBLE') { f.presentacion = 'KILOS'; }
    const w = parseNum(f.ancho), l = parseNum(f.largo), m = parseNum(f.micras), fu = parseNum(f.fuelles), c = parseNum(f.cantidad), tipo = f.tipoProducto;
    if (w > 0 && m > 0) {
      const micFmt = m < 1 && m > 0 ? Math.round(m * 1000) : m;
      if (tipo === 'BOLSAS' && l > 0) {
         const pEst = (w + fu) * l * m; f.pesoMillar = pEst.toFixed(2);
         f.desc = fu > 0 ? `(${w}+${fu/2}+${fu/2})X${l}X${micFmt}MIC | ${f.color || ''}` : `${w}X${l}X${micFmt}MIC | ${f.color || ''}`;
         f.requestedKg = f.presentacion === 'KILOS' ? c.toFixed(2) : (pEst * c).toFixed(2);
      } else if (tipo === 'TERMOENCOGIBLE') {
         f.pesoMillar = 'N/A'; f.desc = `TERMOENCOGIBLE ${w}CM X ${micFmt}MIC | ${f.color || ''}`; f.requestedKg = c > 0 ? c.toFixed(2) : '0.00';
      }
    }
    setNewReqForm(f);
  };

  const handleCreateRequirement = async (e) => {
    e.preventDefault(); const opId = editingReqId ? editingReqId : `OP-${((requirements || []).reduce((m, r) => Math.max(m, parseInt(String(r.id).replace(/\D/g, '')||0, 10)), 0) + 1).toString().padStart(5, '0')}`;
    try { await setDoc(getDocRef('requirements', opId), { ...newReqForm, id: opId, timestamp: editingReqId ? requirements.find(r=>r.id===editingReqId)?.timestamp : Date.now(), status: editingReqId ? requirements.find(r=>r.id===editingReqId)?.status : 'PENDIENTE DE INGENIERÍA', viewedByPlanta: false }, { merge: true }); setShowNewReqPanel(false); setNewReqForm(initialReqForm); setEditingReqId(null); } catch(err) { console.error(err); }
  };

  // LOGICA PRODUCCIÓN (BLINDADO)
  const renderRecipeInventoryOptions = () => {
    const grouped = {}; (inventory || []).forEach(i => { const cat = i?.category || 'Otros'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(i); });
    return (<><option value="">Seleccione Insumo / Material...</option>{Object.keys(grouped).map(cat => (<optgroup key={cat} label={`📌 ${cat.toUpperCase()}`}>{(grouped[cat] || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc}</option>)}</optgroup>))}</>);
  };

  const handleAddIngToRecipe = () => {
    if (!newIngId || !newIngQty) return; const ing = (inventory || []).find(i => i?.id === newIngId); if (!ing) return;
    const req = (requirements || []).find(r => r?.id === recipeEditReqId); const isMP = ing?.category === 'Materia Prima' || ing?.category === 'Pigmentos';
    const totalQty = isMP ? (parseFloat(newIngQty) / 100) * parseNum(req?.requestedKg) : parseFloat(newIngQty);
    setTempRecipe([...(tempRecipe || []), { id: newIngId, percentage: isMP ? parseFloat(newIngQty) : null, totalQty }]); setNewIngId(''); setNewIngQty('');
  };

  const handleSaveRecipe = async () => {
    if ((tempRecipe || []).length === 0) return;
    await updateDoc(getDocRef('requirements', recipeEditReqId), { recipe: tempRecipe, status: 'LISTO PARA PRODUCIR' });
    setRecipeEditReqId(null); setProdView('fases_produccion');
  };

  const handleSavePhase = async (e) => {
    e.preventDefault();
    const req = (requirements || []).find(r => r?.id === selectedPhaseReqId); if (!req) return;
    const actionType = e.nativeEvent?.submitter?.name; const isSkip = actionType === 'skip'; const isClose = actionType === 'close';
    let currentPhase = req?.production?.[activePhaseTab] || { batches: [], isClosed: false };
    if (isSkip) { currentPhase.skipped = true; currentPhase.isClosed = true; } 
    else {
        const prodKg = parseNum(phaseForm?.producedKg); const mermaKg = parseNum(phaseForm?.mermaKg);
        if (prodKg > 0 || mermaKg > 0 || (phaseForm?.insumos || []).length > 0) {
            const batch = writeBatch(db); let totalInsumosKg = 0;
            for (let ing of (phaseForm?.insumos || [])) {
              const item = (inventory || []).find(i => i?.id === ing?.id);
              if (item) { totalInsumosKg += parseFloat(ing?.qty || 0); batch.update(getDocRef('inventory', item.id), { stock: (item?.stock || 0) - (ing?.qty || 0) }); }
            }
            await batch.commit();
            
            // Recopilar Parámetros Técnicos de forma segura
            let techParams = {};
            if(activePhaseTab === 'extrusion') techParams = { operador: phaseForm.operadorExt, zonas: [phaseForm.zona1, phaseForm.zona2, phaseForm.zona3, phaseForm.zona4, phaseForm.zona5, phaseForm.zona6] };
            if(activePhaseTab === 'impresion') techParams = { operador: phaseForm.operadorImp, kgRecibidos: phaseForm.kgRecibidosImp };
            if(activePhaseTab === 'sellado') techParams = { operador: phaseForm.operadorSel, millares: phaseForm.millaresProd };

            const newBatch = { id: Date.now().toString(), timestamp: Date.now(), date: phaseForm?.date || getTodayDate(), insumos: phaseForm?.insumos || [], producedKg: prodKg, mermaKg, totalInsumosKg, operator: appUser?.name || 'Operador', techParams };
            if (!currentPhase.batches) currentPhase.batches = []; currentPhase.batches.push(newBatch);
        }
        if (isClose) currentPhase.isClosed = true;
    }
    const newProd = { ...(req.production || {}), [activePhaseTab]: currentPhase };
    await updateDoc(getDocRef('requirements', req.id), { production: newProd, status: (activePhaseTab === 'sellado' && currentPhase.isClosed) ? 'COMPLETADO' : 'EN PROCESO' });
    setPhaseForm(initialPhaseForm); 
  };

  const handleEditBatch = (reqId, phase, batchId) => {
    setDialog({ title: `MODIFICAR LOTE`, text: `El lote volverá al formulario para su edición. ¿Continuar?`, type: 'confirm', onConfirm: async () => {
        const req = (requirements || []).find(r => r?.id === reqId); if(!req) return;
        let currentPhase = { ...(req?.production?.[phase] || {}) }; 
        const bIdx = (currentPhase.batches || []).findIndex(b => b?.id === batchId);
        if (bIdx >= 0) { 
            const batch = currentPhase.batches[bIdx]; 
            setPhaseForm({ date: batch?.date || getTodayDate(), producedKg: batch?.producedKg || '', mermaKg: batch?.mermaKg || '', insumos: batch?.insumos || [] });
            const fbBatch = writeBatch(db); 
            for (let ing of (batch?.insumos || [])) { 
                const item = (inventory || []).find(i => i?.id === ing?.id); 
                if (item) fbBatch.update(getDocRef('inventory', item.id), { stock: (item?.stock || 0) + (ing?.qty || 0) }); 
            } 
            await fbBatch.commit(); 
            currentPhase.batches.splice(bIdx, 1); 
        }
        await updateDoc(getDocRef('requirements', reqId), { production: { ...(req?.production || {}), [phase]: currentPhase } });
    }});
  };

  // --- LÓGICA CALCULADORA (SIMULADOR OP CON COSTOS Y BOLSAS/TERMO) ---
  const handleCalcChange = (field, value) => setCalcInputs({ ...calcInputs, [field]: parseNum(value) });
  const updateCalcIng = (id, field, value) => setCalcInputs({ ...calcInputs, ingredientes: (calcInputs.ingredientes || []).map(ing => ing.id === id ? { ...ing, [field]: field === 'nombre' ? value : parseNum(value) } : ing) });
  const addCalcIng = () => setCalcInputs({ ...calcInputs, ingredientes: [...(calcInputs.ingredientes || []), { id: Date.now(), nombre: '', pct: 0, costo: 0 }] });
  const removeCalcIng = (id) => setCalcInputs({ ...calcInputs, ingredientes: (calcInputs.ingredientes || []).filter(i => i.id !== id) });

  const calcTotalMezcla = calcInputs.mezclaTotal || 0; 
  let calcCostoMezclaPreparada = 0;
  const calcIngredientesProcesados = (calcInputs.ingredientes || []).map(ing => {
    const kg = ((ing.pct || 0) / 100) * calcTotalMezcla; const totalCost = kg * (ing.costo || 0); calcCostoMezclaPreparada += totalCost;
    const invItem = (inventory || []).find(i => i.id === ing.nombre); let desc = invItem ? invItem.desc : ing.nombre;
    if (!invItem) { if (ing.nombre === 'MP-0240') desc = 'PEBD 240 (ESENTTIA)'; if (ing.nombre === 'MP-11PG4') desc = 'LINEAL 11PG4 (METALOCENO)'; if (ing.nombre === 'MP-3003') desc = 'PEBD 3003 (BAPOLENE)'; if (ing.nombre === 'MP-RECICLADO') desc = 'MATERIAL RECICLADO'; }
    return { ...ing, desc, kg, totalCost };
  });

  const calcCostoPromedio = calcTotalMezcla > 0 ? (calcCostoMezclaPreparada / calcTotalMezcla) : 0;
  const calcCostoMezclaProcesada = calcCostoMezclaPreparada;
  const calcMermaGlobalKg = calcTotalMezcla * ((calcInputs.mermaGlobalPorc || 0) / 100);
  const calcProduccionNetaKg = calcTotalMezcla - calcMermaGlobalKg;
  const calcRendimientoUtil = calcTotalMezcla > 0 ? (calcProduccionNetaKg / calcTotalMezcla) * 100 : 0;
  
  const simW = parseNum(calcInputs.ancho); const simL = parseNum(calcInputs.largo); const simM = parseNum(calcInputs.micras); const simFu = parseNum(calcInputs.fuelles);
  let simPesoMillar = 0;
  if (calcInputs.tipoProducto === 'BOLSAS') { simPesoMillar = (simW + simFu) * simL * simM; }
  
  const calcProduccionFinalUnidades = calcInputs.tipoProducto === 'BOLSAS' && simPesoMillar > 0 ? (calcProduccionNetaKg / simPesoMillar) : calcProduccionNetaKg;
  const calcCostoFinalUnidad = calcProduccionFinalUnidades > 0 ? (calcCostoMezclaProcesada / calcProduccionFinalUnidades) : 0;
  const simUmFinal = calcInputs.tipoProducto === 'BOLSAS' ? 'Millares' : 'KG';

  // VISTAS 
  const renderInventoryModule = () => {
    const searchInvUpper = (invSearchTerm || '').toUpperCase();
    const filteredInventory = (inventory || []).filter(i => (i?.id || '').includes(searchInvUpper) || (i?.desc || '').includes(searchInvUpper));
    return (
      <div className="animate-in fade-in space-y-6">
        {invView === 'catalogo' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b bg-gray-50 flex justify-between items-center">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3"><Box className="text-orange-500" size={24}/> Catálogo de Inventario</h2>
            </div>
            
            <div className="p-8 bg-gray-50/50 border-b border-gray-200">
               <form onSubmit={handleSaveInvItem} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                 <h3 className="text-sm font-black uppercase text-black border-b border-gray-100 pb-3 mb-4 tracking-widest">{editingInvId ? 'Modificar Artículo' : 'Nuevo Artículo'}</h3>
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
                        <option value="Materia Prima">Materia Prima</option><option value="Pigmentos">Pigmentos</option><option value="Tintas">Tintas</option><option value="Químicos">Químicos</option><option value="Consumibles">Consumibles</option><option value="Herramientas">Herramientas</option><option value="Seguridad Industrial">Seguridad Industrial</option><option value="Otros">Otros</option>
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
                      <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Stock Actual</label>
                      <input type="number" step="0.01" required value={newInvItemForm.stock} onChange={e=>setNewInvItemForm({...newInvItemForm, stock: e.target.value})} className="w-full border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 rounded-xl p-3 font-black text-xs outline-none transition-colors text-center text-blue-600" />
                   </div>
                   <div className="flex-1 text-right flex gap-2 justify-end">
                      {editingInvId && <button type="button" onClick={() => {setEditingInvId(null); setNewInvItemForm(initialInvItemForm);}} className="bg-gray-200 text-gray-700 px-10 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-gray-300 transition-all">CANCELAR</button>}
                      <button type="submit" className="bg-black text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-gray-800 transition-all">GUARDAR EN CATÁLOGO</button>
                   </div>
                 </div>
               </form>
            </div>

            <div className="p-8">
              <div className="relative max-w-2xl mb-8"><Search className="absolute left-4 top-4 text-gray-400" size={18} /><input type="text" placeholder="BUSCAR INSUMO..." value={invSearchTerm} onChange={e=>setInvSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white" /></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-100 border-b-2 border-gray-200"><tr className="uppercase font-black text-gray-800 text-[10px] tracking-widest"><th>Código</th><th>Descripción</th><th className="text-center">Costo Unit.</th><th className="text-right">Stock Actual</th><th className="text-center">Acciones</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInventory.map(inv => (
                      <tr key={inv?.id} className="hover:bg-gray-50 group">
                        <td className="py-4 px-4 font-black text-orange-600 text-xs">{inv?.id}</td>
                        <td className="py-4 px-4 font-black uppercase text-xs text-black">{inv?.desc}<span className="block text-[9px] font-bold text-gray-500 mt-1">{inv?.category}</span></td>
                        <td className="py-4 px-4 text-center font-bold text-gray-600">${formatNum(inv?.cost)}</td>
                        <td className="py-4 px-4 text-right font-black text-blue-600 text-lg">{formatNum(inv?.stock)} <span className="text-xs text-gray-400">{inv?.unit}</span></td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => startEditInvItem(inv)} className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-colors"><Edit size={16}/></button>
                            <button onClick={() => handleDeleteInvItem(inv.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
                          </div>
                        </td>
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

  const renderVentasModule = () => {
    const filteredClients = (clients || []).filter(c => String(c?.name || '').toUpperCase().includes(clientSearchTerm.toUpperCase()));
    return (
      <div className="space-y-6 animate-in fade-in">
        {ventasView === 'requisiciones' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-8 py-6 border-b bg-white flex justify-between items-center"><h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><FileText className="text-orange-500" size={24}/> REQUISICIONES</h2><button onClick={()=>{setShowNewReqPanel(!showNewReqPanel);setNewReqForm(initialReqForm);setEditingReqId(null);}} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-all">{showNewReqPanel ? 'CANCELAR' : 'NUEVA ORDEN'}</button></div>
             {showNewReqPanel && (
                <div className="p-8 bg-gray-50/50 border-b">
                  <form onSubmit={handleCreateRequirement} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Cliente</label>
                          <select required value={newReqForm.client} onChange={e=>handleReqFormChange('client', e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 font-black text-xs outline-none focus:border-orange-500">
                            <option value="">Seleccione...</option>{(clients || []).map(c=><option key={c?.rif} value={c?.name}>{c?.name}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Ancho (cm)</label><input type="number" step="0.1" value={newReqForm.ancho} onChange={e=>handleReqFormChange('ancho', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center" /></div>
                          <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Fuelle (cm)</label><input type="number" step="0.1" value={newReqForm.fuelles} onChange={e=>handleReqFormChange('fuelles', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center" /></div>
                        </div>
                        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Micras</label><input type="number" step="0.001" value={newReqForm.micras} onChange={e=>handleReqFormChange('micras', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-5 font-black text-lg text-center" /></div>
                        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Tipo de Producto</label>
                          <select value={newReqForm.tipoProducto} onChange={e=>handleReqFormChange('tipoProducto', e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-4 font-black text-xs">
                            <option value="BOLSAS">BOLSAS</option><option value="TERMOENCOGIBLE">TERMOENCOGIBLE</option>
                          </select>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-orange-50 p-6 rounded-3xl border-2 border-orange-200 mt-6 shadow-inner"><div><span className="text-[10px] font-black text-orange-800 uppercase tracking-tighter">TOTAL CARGA ESTIMADA</span><span className="text-4xl font-black text-orange-600 block">{newReqForm.requestedKg} KG</span></div><button type="submit" className="bg-orange-500 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-orange-600">GUARDAR</button></div>
                  </form>
                </div>
             )}
             <div className="p-8 overflow-x-auto"><table className="w-full text-left whitespace-nowrap text-black"><thead className="bg-white border-b-2 border-gray-100 font-black text-[10px] uppercase"><tr><th>OP N°</th><th>Cliente</th><th>KG Est.</th><th>Acciones</th></tr></thead><tbody className="divide-y divide-gray-100">{(requirements || []).map(r=>(<tr key={r?.id} className="hover:bg-gray-50"><td className="py-5 px-4 font-black text-orange-500">#{String(r?.id).replace('OP-','').padStart(5,'0')}</td><td className="py-5 px-4 font-black uppercase text-sm">{r?.client}</td><td className="py-5 px-4 text-right font-black text-lg">{formatNum(r?.requestedKg)}</td><td className="py-5 px-4 text-center"><div className="flex justify-center gap-2"><button onClick={()=>startEditReq(r)} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Edit size={16}/></button></div></td></tr>))}</tbody></table></div>
          </div>
        )}
      </div>
    );
  };

  const renderProductionModule = () => {
    if (showWorkOrder) return renderWorkOrder();
    if (showFiniquito) return renderFiniquito();

    const activeOrders = (requirements || []).filter(r => ['LISTO PARA PRODUCIR', 'EN PROCESO'].includes(r?.status));
    
    return (
      <div className="animate-in fade-in space-y-6">
        {prodView === 'calculadora' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in print:border-none print:shadow-none print:m-0 print:p-0 print:block print:w-full">
            <div data-html2canvas-ignore="true" className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:hidden">
               <h2 className="text-xl font-black text-black uppercase flex items-center gap-3 tracking-tighter"><Calculator className="text-orange-500" size={24}/> Simulador de Producción</h2>
               <button onClick={() => handleExportPDF('Simulador_Produccion', true)} className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"><Printer size={16}/> EXPORTAR PDF</button>
            </div>
            
            <div id="pdf-content" className="grid grid-cols-1 lg:grid-cols-12 gap-0 print:block print:w-full">
               <style>{`@media print { @page { size: landscape; margin: 5mm; } .print-text-xs { font-size: 8px !important; } }`}</style>
               {/* PANEL DE CONTROLES */}
               <div data-html2canvas-ignore="true" className="lg:col-span-4 border-r border-gray-200 bg-gray-50 p-8 print:hidden space-y-8">
                 
                 <div>
                     <h3 className="text-xs font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">1. Variables de Mezcla</h3>
                     <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total a Preparar (KG)</label>
                          <input type="number" value={calcInputs?.mezclaTotal || ''} onChange={(e) => handleCalcChange('mezclaTotal', e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-black outline-none focus:border-orange-500 text-center text-blue-600" />
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
                                   <input type="number" value={ing?.pct || ''} onChange={(e) => updateCalcIng(ing?.id, 'pct', e.target.value)} className="w-full text-xs font-black text-center outline-none bg-gray-50 rounded p-1 border border-gray-100 text-black" />
                                </div>
                                <div className="w-1/2">
                                   <label className="text-[8px] font-bold text-gray-400 uppercase">Costo ($/KG)</label>
                                   <input type="number" step="0.01" value={ing?.costo || ''} onChange={(e) => updateCalcIng(ing?.id, 'costo', e.target.value)} className="w-full text-xs font-black text-center outline-none bg-gray-50 rounded p-1 border border-gray-100 text-black" />
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
                     <h3 className="text-xs font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">3. Proyección de Merma</h3>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <label className="text-[9px] font-bold text-gray-500 uppercase flex-1">Merma Global Esperada (%)</label>
                          <input type="number" step="0.1" value={calcInputs?.mermaGlobalPorc || ''} onChange={(e) => handleCalcChange('mermaGlobalPorc', e.target.value)} className="w-24 border-2 border-gray-200 rounded-lg p-2 text-xs font-black text-center text-red-500" />
                        </div>
                     </div>
                 </div>

                 <div>
                     <h3 className="text-xs font-black uppercase text-black mb-4 border-b border-gray-200 pb-2">4. Parámetros del Producto</h3>
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
                            <input type="number" step="0.1" value={calcInputs?.ancho || ''} onChange={e=>setCalcInputs({...calcInputs, ancho: e.target.value})} className="w-full border p-2 text-xs text-center font-bold" />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-gray-400 uppercase">FUELLES (CM)</label>
                            <input type="number" step="0.1" disabled={calcInputs?.tipoProducto === 'TERMOENCOGIBLE'} value={calcInputs?.fuelles || ''} onChange={e=>setCalcInputs({...calcInputs, fuelles: e.target.value})} className="w-full border p-2 text-xs text-center font-bold disabled:bg-gray-100" />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-gray-400 uppercase">LARGO (CM)</label>
                            <input type="number" step="0.1" disabled={calcInputs?.tipoProducto === 'TERMOENCOGIBLE'} value={calcInputs?.largo || ''} onChange={e=>setCalcInputs({...calcInputs, largo: e.target.value})} className="w-full border p-2 text-xs text-center font-bold disabled:bg-gray-100" />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-gray-400 uppercase">MICRAS</label>
                            <input type="number" step="0.001" value={calcInputs?.micras || ''} onChange={e=>setCalcInputs({...calcInputs, micras: e.target.value})} className="w-full border p-2 text-xs text-center font-bold" />
                          </div>
                        </div>
                     </div>
                 </div>
               </div>

               {/* TABLA DE RESULTADO (VISTA IMPRIMIBLE) */}
               <div className="lg:col-span-8 p-10 bg-white print:w-full print:p-0">
                  <div className="hidden print:block mb-6">
                     <ReportHeader />
                     <h1 className="text-xl font-black text-black uppercase border-b-2 border-orange-500 pb-1 mt-2">PROYECCIÓN Y COSTEO DE PRODUCCIÓN</h1>
                     <p className="text-xs font-bold text-gray-500 uppercase mt-1">FECHA DE SIMULACIÓN: {getTodayDate()}</p>
                  </div>
                  
                  <div className="overflow-x-auto rounded-xl border border-gray-300 print:border-black print:rounded-none">
                     <table className="w-full text-left text-[10px] whitespace-nowrap print-text-xs text-black">
                        <thead className="bg-gray-200 print:bg-gray-300 border-b border-gray-400 print:border-black font-black uppercase">
                           <tr>
                              <th className="p-2">Fase / Concepto</th>
                              <th className="p-2 text-center">Cantidad</th>
                              <th className="p-2 text-center">U.M.</th>
                              <th className="p-2 text-center">Costo Unit.</th>
                              <th className="p-2 text-center">Costo Total</th>
                              <th className="p-2">Notas</th>
                           </tr>
                        </thead>
                        <tbody className="text-black divide-y divide-gray-200 print:divide-black">
                           
                           <tr><td colSpan="6" className="p-1.5 font-black uppercase bg-gray-50 print:bg-transparent">1. MATERIA PRIMA (MEZCLA)</td></tr>
                           {(calcIngredientesProcesados || []).map(ing => (
                             <tr key={ing?.id}>
                               <td className="p-1.5 pl-4 font-bold">{ing?.desc}</td>
                               <td className="p-1.5 text-center">{formatNum(ing?.kg)}</td>
                               <td className="p-1.5 text-center">kg</td>
                               <td className="p-1.5 text-center">${formatNum(ing?.costo)}</td>
                               <td className="p-1.5 text-center">${formatNum(ing?.totalCost)}</td>
                               <td className="p-1.5 text-gray-500 print:text-black">{formatNum(ing?.pct)}% de la mezcla</td>
                             </tr>
                           ))}
                           <tr className="bg-gray-100 font-black border-y border-gray-300 print:border-black print:bg-gray-200">
                             <td className="p-1.5 pl-4">TOTAL MEZCLA A PROCESAR</td>
                             <td className="p-1.5 text-center">{formatNum(calcTotalMezcla)}</td>
                             <td className="p-1.5 text-center">kg</td>
                             <td className="p-1.5 text-center">${formatNum(calcCostoPromedio)}</td>
                             <td className="p-1.5 text-center">${formatNum(calcCostoMezclaPreparada)}</td>
                             <td className="p-1.5">Costo promedio e ingreso</td>
                           </tr>

                           <tr><td colSpan="6" className="p-1.5 pt-3 font-black uppercase bg-gray-50 print:bg-transparent border-t border-gray-400 print:border-black">2. FASE DE PRODUCCIÓN Y MERMA</td></tr>
                           <tr>
                             <td className="p-1.5 pl-4 font-bold">MERMA GLOBAL ESTIMADA</td>
                             <td className="p-1.5 text-center text-red-600">{formatNum(calcMermaGlobalKg)}</td>
                             <td className="p-1.5 text-center">kg</td>
                             <td className="p-1.5 text-center">$0.00</td>
                             <td className="p-1.5 text-center">$0.00</td>
                             <td className="p-1.5 text-gray-500 print:text-black">{formatNum(calcInputs?.mermaGlobalPorc)}% de la mezcla</td>
                           </tr>
                           <tr className="bg-gray-100 font-black border-y border-gray-300 print:border-black print:bg-gray-200">
                             <td className="p-1.5 pl-4 text-blue-700">PRODUCCIÓN NETA (KG ÚTILES)</td>
                             <td className="p-1.5 text-center text-blue-700">{formatNum(calcProduccionNetaKg)}</td>
                             <td className="p-1.5 text-center text-blue-700">kg</td>
                             <td className="p-1.5 text-center text-blue-700">${formatNum(calcCostoUnitarioNeto)}</td>
                             <td className="p-1.5 text-center text-blue-700">${formatNum(calcCostoMezclaProcesada)}</td>
                             <td className="p-1.5 text-blue-700">Rendimiento Útil: {formatNum(calcRendimientoUtil)}%</td>
                           </tr>

                           <tr><td colSpan="6" className="p-1.5 pt-3 font-black uppercase bg-gray-50 print:bg-transparent border-t border-gray-400 print:border-black">3. CONVERSIÓN FINAL ({calcInputs?.tipoProducto || ''})</td></tr>
                           <tr className="bg-green-50 font-black text-green-800 print:text-black border-y border-gray-400 print:border-black text-[11px] print:text-[9px]">
                             <td className="p-2 pl-4">PRODUCCIÓN ESTIMADA</td>
                             <td className="p-2 text-center">{formatNum(calcProduccionFinalUnidades)}</td>
                             <td className="p-2 text-center">{simUmFinal}</td>
                             <td className="p-2 text-center">${formatNum(calcCostoFinalUnidad)}</td>
                             <td className="p-2 text-center">${formatNum(calcCostoMezclaProcesada)}</td>
                             <td className="p-2 text-[8px] text-gray-600 print:text-black">{calcInputs?.tipoProducto === 'BOLSAS' ? `Peso Teórico: ${formatNum(simPesoMillar)} kg/M` : `Conversión directa a KG`}</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          </div>
        )}

        {prodView === 'fases_produccion' && (
          <div className="space-y-6">
            {!selectedPhaseReqId ? (
              <div className="p-12 bg-white rounded-3xl border border-gray-200 shadow-sm text-center animate-in fade-in"><div className="bg-black p-5 rounded-full inline-block mb-6 text-orange-500 shadow-lg"><Factory size={40}/></div><h2 className="text-2xl font-black uppercase text-black tracking-tighter mb-2">Control de Producción Activo</h2><div className="mt-12 border-t border-gray-200 pt-8 overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">OP N°</th><th className="p-4 text-[10px] font-black uppercase text-black tracking-widest">Cliente / Producto</th><th className="p-4 text-center text-black tracking-widest">Acción de Planta</th></tr></thead><tbody className="divide-y divide-gray-100">{(activeOrders || []).map(r => (<tr key={r?.id} className="group hover:bg-gray-50 transition-colors"><td className="p-4 font-black text-orange-500 text-lg">#{String(r?.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-4 font-black uppercase text-sm text-black">{r?.client}<br/><span className="text-[10px] text-gray-400 font-bold">{r?.desc}</span></td><td className="p-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => setShowWorkOrder(r?.id)} className="bg-white border-2 border-gray-100 text-gray-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2" title="Imprimir"><Printer size={16}/> ORDEN TRABAJO</button><button onClick={() => { setSelectedPhaseReqId(r?.id); setActivePhaseTab('extrusion'); setPhaseForm({...initialPhaseForm, date: getTodayDate()}); }} className="bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-md hover:bg-slate-800 transition-all"><PlayCircle size={16}/> ENTRAR A FASES</button></div></td></tr>))}</tbody></table></div></div>
            ) : (() => {
              const req = (requirements || []).find(r => r?.id === selectedPhaseReqId); if (!req) return null;
              const cPhase = req?.production?.[activePhaseTab] || { batches: [], isClosed: false };
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-black rounded-3xl shadow-xl p-8 text-white relative overflow-hidden"><div className="absolute -right-6 -bottom-6 opacity-10"><Factory size={160}/></div><div className="relative z-10"><h2 className="text-4xl font-black uppercase tracking-tighter mb-2">#{String(req.id).replace('OP-', '').padStart(5, '0')}</h2><p className="text-sm font-bold text-gray-300 uppercase mb-6 border-b border-gray-700 pb-6">{req.client}<br/><span className="text-orange-400 text-lg">{req.desc}</span></p><div className="bg-gray-800 p-5 rounded-2xl shadow-inner"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">META A PRODUCIR:</p><p className="text-3xl font-black text-white">{formatNum(req.requestedKg)} KG</p></div></div></div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-3 space-y-2">{[{ id: 'extrusion', label: '1. Extrusión' }, { id: 'impresion', label: '2. Impresión' }, { id: 'sellado', label: '3. Sellado' }].map(tab => (<button key={tab.id} onClick={() => {setActivePhaseTab(tab.id); setPhaseForm({...initialPhaseForm, date: getTodayDate()});}} className={`w-full flex justify-between items-center p-5 rounded-2xl text-[10px] font-black uppercase transition-all ${activePhaseTab === tab.id ? 'bg-orange-50 text-orange-700 border-2 border-orange-200' : 'text-gray-500 hover:bg-gray-50'}`}><span>{tab.label}</span>{req.production?.[tab.id]?.isClosed && <CheckCircle size={18} className="text-green-500"/>}</button>))}</div>
                  </div>
                  
                  <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 p-8 lg:p-10 text-black">
                    <div className="border-b-2 border-gray-100 pb-6 mb-8 flex justify-between items-center"><h3 className="text-2xl font-black uppercase text-black tracking-tighter">Fase: {activePhaseTab.toUpperCase()}</h3><button onClick={()=>{setSelectedPhaseReqId(null); setPhaseForm(initialPhaseForm);}} className="bg-gray-100 p-2.5 rounded-xl text-gray-500 hover:text-black"><X size={18}/></button></div>
                    {cPhase.batches && cPhase.batches.length > 0 && (<div className="mb-8 overflow-hidden rounded-2xl border border-gray-200"><table className="w-full text-center text-xs"><thead className="bg-gray-50 border-b border-gray-200"><tr className="uppercase font-black text-[9px] text-gray-500 tracking-widest"><th className="p-3 border-r border-gray-200">Fecha</th><th className="p-3 border-r border-gray-200">Producido</th><th className="p-3 border-r border-gray-200">Merma</th><th className="p-3">Acción</th></tr></thead><tbody className="divide-y divide-gray-100 text-black">{(cPhase.batches || []).map(b => (<tr key={b?.id} className="hover:bg-gray-50"><td className="p-3 border-r border-gray-200 font-bold">{b?.date}</td><td className="p-3 border-r border-gray-200 font-black text-green-600">{formatNum(b?.producedKg)} kg</td><td className="p-3 border-r border-gray-200 font-black text-red-500">{formatNum(b?.mermaKg)} kg</td><td className="p-3 text-center flex justify-center gap-2"><button onClick={() => handleEditBatch(req.id, activePhaseTab, b?.id)} className="bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors p-1.5 rounded-lg" title="Modificar"><Edit size={14}/></button><button onClick={() => handleDeleteBatch(req.id, activePhaseTab, b?.id)} className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors p-1.5 rounded-lg" title="Eliminar"><Trash2 size={14}/></button></td></tr>))}</tbody></table></div>)}
                    {!cPhase.isClosed && (
                      <form onSubmit={handleSavePhase} className="space-y-8">
                        <div className="flex gap-4 items-center"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha Reporte:</label><input type="date" value={phaseForm?.date || getTodayDate()} onChange={e=>setPhaseForm({...phaseForm, date: e.target.value})} className="border-2 border-gray-200 rounded-xl p-2 font-black text-xs outline-none focus:border-orange-500" /></div>
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200"><h4 className="text-[10px] font-black text-gray-600 uppercase mb-4 flex items-center gap-2"><Box size={16}/> Insumos Consumidos</h4><div className="flex gap-3 mb-6"><select value={phaseIngId} onChange={e=>setPhaseIngId(e.target.value)} className="flex-1 border-2 border-gray-200 rounded-xl p-3.5 font-black text-xs text-black outline-none focus:border-orange-500">{renderPhaseInventoryOptions()}</select><input type="number" step="0.01" value={phaseIngQty} onChange={e=>setPhaseIngQty(e.target.value)} placeholder="Cant" className="w-32 border-2 border-gray-200 rounded-xl p-3.5 text-xs font-black text-center text-black outline-none focus:border-orange-500" /><button type="button" onClick={handleAddPhaseIng} className="bg-black text-white px-5 rounded-xl shadow-md transition-all hover:bg-slate-800"><Plus size={20}/></button></div><ul className="space-y-3">{(phaseForm?.insumos || []).map((ing, idx) => (<li key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><span className="text-xs font-black uppercase">{(inventory || []).find(i=>i?.id===ing?.id)?.desc || ing?.id}</span><div className="flex items-center gap-4"><span className="text-sm font-black bg-gray-100 px-3 py-1.5 rounded-lg">{ing?.qty}</span><button type="button" onClick={() => handleRemovePhaseIng(idx)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18}/></button></div></li>))}</ul></div><div className="grid grid-cols-2 gap-4"><div className="bg-green-50 p-4 rounded-2xl border border-green-200 shadow-inner"><label className="text-[9px] font-black text-green-800 uppercase block mb-2 tracking-widest">Producido Bruto (KG)</label><input type="number" step="0.01" value={phaseForm?.producedKg || ''} onChange={e=>setPhaseForm({...phaseForm, producedKg: e.target.value})} placeholder="0.00 KG" className="w-full border-2 border-green-300 rounded-xl p-3 text-lg font-black text-green-700 text-center outline-none focus:border-green-500" /></div><div className="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-inner"><label className="text-[9px] font-black text-red-800 uppercase block mb-2 tracking-widest">Mermas / Desperdicio (KG)</label><input type="number" step="0.01" value={phaseForm?.mermaKg || ''} onChange={e=>setPhaseForm({...phaseForm, mermaKg: e.target.value})} placeholder="0.00 KG" className="w-full border-2 border-red-300 rounded-xl p-3 text-lg font-black text-red-700 text-center outline-none focus:border-red-500" /></div></div><div className="flex flex-col md:flex-row gap-4 pt-6 border-t-2 border-gray-100"><button type="submit" name="skip" className="w-full md:w-1/4 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl uppercase text-[9px] border-2 border-gray-200 shadow-sm transition-all hover:bg-gray-200">OMITIR FASE</button><button type="submit" name="partial" className="w-full md:w-2/4 bg-blue-50 text-blue-600 font-black py-4 rounded-2xl uppercase text-[9px] border-2 border-blue-200 flex justify-center items-center gap-2 shadow-sm transition-all hover:bg-blue-100"><Plus size={16}/> GUARDAR REPORTE PARCIAL</button><button type="submit" name="close" className="w-full md:w-1/4 bg-black text-white font-black py-4 rounded-2xl uppercase text-[9px] flex justify-center items-center gap-2 shadow-xl hover:bg-slate-800 transition-all"><CheckCircle size={16}/> CERRAR FASE DEFINITIVA</button></div>
                      </form>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {prodView === 'historial' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
            <div className="px-6 py-5 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-lg font-black text-black uppercase flex items-center gap-2"><History className="text-orange-500" /> Órdenes Completadas</h2></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap text-black"><thead className="bg-gray-50 border-b border-gray-200 font-black text-[10px] uppercase"><tr><th>OP N°</th><th>Cliente / Producto</th><th className="text-right">KG Finales</th><th className="text-center">Acciones</th></tr></thead><tbody className="divide-y divide-gray-100">{(completedOrders || []).map(req => (<tr key={req?.id} className="hover:bg-gray-50 group"><td className="p-4 font-black text-orange-500 text-lg">#{String(req?.id).replace('OP-', '').padStart(5, '0')}</td><td className="p-4 font-black uppercase text-xs">{req?.client}<br/><span className="text-[10px] font-bold text-gray-400">{req?.desc}</span></td><td className="p-4 text-right font-black text-green-600 text-lg">{formatNum((req?.production?.sellado?.batches || []).reduce((a,b)=>a+parseNum(b?.producedKg),0) || (req?.production?.extrusion?.batches || []).reduce((a,b)=>a+parseNum(b?.producedKg),0) || 0)} KG</td><td className="p-4 text-center"><button onClick={()=>setShowFiniquito(req?.id)} className="bg-black text-white px-8 py-3 rounded-2xl text-[9px] font-black uppercase hover:bg-gray-800 shadow-md transition-all">FINIQUITO</button></td></tr>))}</tbody></table></div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkOrder = () => {
    const req = (requirements || []).find(r => r?.id === showWorkOrder); if (!req) return null;
    const getFE = (r) => { const bs = []; ['extrusion', 'impresion', 'sellado'].forEach(f => { if (r?.production?.[f]?.batches) bs.push(...r.production[f].batches); }); bs.sort((a, b) => a.timestamp - b.timestamp); return bs[0]?.date || 'PENDIENTE'; };
    const getFS = (r) => { if (r?.status !== 'COMPLETADO') return 'EN PROCESO'; const bs = []; ['extrusion', 'impresion', 'sellado'].forEach(f => { if (r?.production?.[f]?.batches) bs.push(...r.production[f].batches); }); bs.sort((a, b) => b.timestamp - a.timestamp); return bs[0]?.date || getTodayDate(); };

    return (
      <div id="pdf-content" className="bg-white p-6 print:p-0 min-h-screen text-black shadow-none border-0"><style>{`@media print { @page { size: portrait; margin: 5mm; } }`}</style>
        <div data-html2canvas-ignore="true" className="flex justify-between mb-2 print:hidden"><button onClick={() => setShowWorkOrder(null)} className="bg-gray-100 px-6 py-2 rounded-xl text-xs font-black uppercase">VOLVER</button><button onClick={() => handleExportPDF(`OP_${req.id}`)} className="bg-black text-white px-8 py-2 rounded-xl font-black flex items-center gap-2 text-xs uppercase shadow-lg"><Printer size={16} /> EXPORTAR PDF</button></div>
        <div className="flex justify-between items-end border-b-2 border-black pb-1 mb-2"><div><div className="flex items-center -mb-1"><span className="text-black font-black text-3xl leading-none">G</span><span className="text-orange-500 font-black text-lg mx-0.5">&amp;</span><span className="text-black font-black text-3xl leading-none">B</span></div><p className="text-[6px] font-bold text-orange-500 uppercase mt-1">Servicio y Calidad</p></div><div className="text-center flex-1"><h1 className="text-lg font-black uppercase tracking-widest">ORDEN DE TRABAJO PARA OP.</h1></div></div>
        <div className="grid grid-cols-3 text-[9px] font-bold uppercase mb-2 border-b-2 border-black pb-2"><div><p className="mb-1"><span className="w-16 inline-block font-black">CLIENTE:</span> {req.client}</p><p className="mb-1"><span className="w-16 inline-block font-black">OP:</span> #{String(req.id).replace('OP-', '').padStart(5, '0')}</p><p><span className="w-16 inline-block font-black">TIPO:</span> {req.tipoProducto || 'N/A'}</p></div><div><p className="mb-1"><span className="w-20 inline-block font-black">EMISIÓN:</span> {req.fecha}</p><p><span className="w-20 inline-block font-black text-orange-600">META (KG):</span> <span className="text-orange-600 font-black">{formatNum(req.requestedKg)} KG</span></p></div><div><p className="mb-1"><span className="w-24 inline-block font-black">FECHA ENTRADA:</span> <span className="text-orange-600">{getFE(req)}</span></p><p><span className="w-24 inline-block font-black">FECHA SALIDA:</span> <span className={req.status === 'COMPLETADO' ? 'text-green-600' : 'text-gray-500'}>{getFS(req)}</span></p></div></div>
        <div className="border-2 border-black p-2 mb-2 rounded-2xl overflow-hidden"><div className="font-black text-center border-b-2 border-black mb-2 py-0.5 text-xs bg-gray-100 uppercase">Especificaciones y Fórmula</div><table className="w-full text-left text-[9px] mb-2"><thead><tr className="font-black uppercase border-b border-black"><td>Insumo / Material</td><td className="text-center">Proporción (%)</td><td className="text-right">Peso Teórico (KG)</td></tr></thead><tbody className="divide-y divide-gray-100">{(req?.recipe || []).map((r, i) => (<tr key={i} className="text-black h-5 align-middle"><td>{(inventory || []).find(inv=>inv?.id===r?.id)?.desc || r?.id}</td><td className="text-center">{r?.percentage ? `${r.percentage}%` : 'N/A'}</td><td className="text-right font-bold">{formatNum(r?.totalQty)} KG</td></tr>))}</tbody></table><div className="grid grid-cols-4 gap-2 text-center text-[9px] font-black uppercase border-t-2 border-black pt-2 bg-gray-50"><div>ANCHO<br/><span className="text-sm text-orange-600">{req.ancho} CM</span></div><div>FUELLES<br/><span className="text-sm text-orange-600">{req.fuelles || '0'} CM</span></div><div>LARGO<br/><span className="text-sm text-orange-600">{req.largo} CM</span></div><div>MICRAS<br/><span className="text-sm text-orange-600">{req.micras}</span></div></div></div>
        {/* PARÁMETROS EN BLANCO PARA RELLENAR A MANO */}
        <div className="border-2 border-black rounded-xl mb-2 overflow-hidden"><div className="bg-gray-200 font-black text-[9px] uppercase text-center p-1 border-b-2 border-black">Parámetros de Extrusión</div><div className="p-2 text-[8px] font-bold uppercase grid grid-cols-2 gap-y-2"><div><span className="font-black pr-1">OPERADOR:</span> __________________________</div><div><span className="font-black pr-1">CANTIDAD KG:</span> __________________________</div><div className="col-span-2 flex justify-between"><div><span className="font-black pr-1">TRATADO: 1</span> _____ <span className="ml-4">2</span> _____</div><div><span className="font-black pr-1">COLOR:</span> {req.color}</div></div><div className="col-span-2 flex justify-between"><div><span className="font-black pr-1">MOTOR PRINCIPAL:</span> _________________</div><div><span className="font-black pr-1">VENTILADOR:</span> _________________</div><div><span className="font-black pr-1">JALADOR:</span> _________________</div></div><div className="col-span-2 border-t border-gray-300 pt-1 mt-1"><div className="flex justify-between mb-2"><span className="font-black">ZONAS:</span><span>1 ____</span><span>2 ____</span><span>3 ____</span><span>4 ____</span><span>5 ____</span><span>6 ____</span></div><div className="flex gap-10"><span className="font-black">CABEZAL:</span><span>A ________</span><span>B ________</span></div></div></div></div>
        <div className="border-2 border-black rounded-xl mb-2 overflow-hidden"><div className="bg-gray-200 font-black text-[9px] uppercase text-center p-1 border-b-2 border-black">Impresión Flexográfica</div><div className="p-2 text-[8px] font-bold uppercase grid grid-cols-2 gap-y-2"><div><span className="font-black pr-1">OPERADOR:</span> __________________________</div><div><span className="font-black pr-1">KG RECIBIDOS:</span> __________________________</div><div><span className="font-black pr-1">MOTOR PRINCIPAL:</span> __________________________</div><div><span className="font-black pr-1">TEMPERATURA:</span> __________________________</div><div className="col-span-2 border-t border-gray-300 pt-1 mt-1"><div className="flex justify-between mb-1"><span className="font-black">COLORES:</span><span>1 _______</span><span>2 _______</span><span>3 _______</span><span>4 _______</span><span>5 _______</span><span>6 _______</span></div></div></div></div>
        <div className="border-2 border-black rounded-xl mb-2 overflow-hidden"><div className="bg-gray-200 font-black text-[9px] uppercase text-center p-1 border-b-2 border-black">Sellado y Corte</div><div className="p-2 text-[8px] font-bold uppercase grid grid-cols-2 gap-y-2"><div><span className="font-black pr-1">OPERADOR:</span> __________________________</div><div><span className="font-black pr-1">KG RECIBIDOS:</span> __________________________</div><div><span className="font-black pr-1">CANT. PRODUCIDA (KG):</span> _______________</div><div><span className="font-black pr-1">CANT. PRODUCIDA MILLARES:</span> ___________</div></div></div>
        <div className="mt-8 grid grid-cols-2 text-center font-black text-[9px] uppercase border-t-2 border-black pt-2 text-black"><div>CONTROL DE CALIDAD</div><div>SUPERVISOR DE PLANTA</div></div>
      </div>
    );
  };

  const renderFiniquito = () => {
    const req = (requirements || []).find(r => r?.id === showFiniquito); if (!req) return null;
    const isTermo = req?.tipoProducto === 'TERMOENCOGIBLE';
    const extB = req?.production?.extrusion?.batches || [];
    const selB = req?.production?.sellado?.batches || [];
    let mpC = []; extB.forEach(b => { (b?.insumos || []).forEach(ing => { const ex = mpC.find(i => i?.id === ing?.id); if(ex) ex.qty += (ing?.qty || 0); else mpC.push({...ing}); }); });
    const totMP = mpC.reduce((s, i) => s + (i?.qty || 0), 0) || parseNum(req?.requestedKg);
    const extP = extB.reduce((a,b)=>a+parseNum(b?.producedKg),0);
    const selP = selB.reduce((a,b)=>a+parseNum(b?.producedKg),0);
    const totUnid = isTermo ? (selP > 0 ? selP : extP) : selB.reduce((s, b) => s + parseNum(b?.techParams?.millares || 0), 0);
    const unitF = isTermo ? 'KG' : 'Millares';

    const getFI = () => { const bs = []; if (req?.production?.extrusion?.batches) bs.push(...req.production.extrusion.batches); if (req?.production?.impresion?.batches) bs.push(...req.production.impresion.batches); if (req?.production?.sellado?.batches) bs.push(...req.production.sellado.batches); if (bs.length === 0) return 'NO INICIADO'; bs.sort((a, b) => a.timestamp - b.timestamp); return bs[0].date; };
    const getFF = () => { if (req?.status !== 'COMPLETADO') return 'EN PROCESO'; const bs = []; if (req?.production?.extrusion?.batches) bs.push(...req.production.extrusion.batches); if (req?.production?.impresion?.batches) bs.push(...req.production.impresion.batches); if (req?.production?.sellado?.batches) bs.push(...req.production.sellado.batches); if (bs.length === 0) return getTodayDate(); bs.sort((a, b) => b.timestamp - a.timestamp); return bs[0].date; };

    return (
      <div id="pdf-content" className="bg-white p-12 print:p-0 min-h-screen text-black shadow-none border-0"><style>{`@media print { @page { size: landscape; margin: 5mm; } body { background-color: white !important; } .text-orange-600 { color: #ea580c !important; } }`}</style>
        <div data-html2canvas-ignore="true" className="flex justify-between mb-8 print:hidden"><button onClick={() => setShowFiniquito(null)} className="text-black font-black text-xs uppercase bg-gray-100 border border-gray-200 px-6 py-2.5 rounded-xl hover:bg-gray-200">VOLVER</button><button onClick={() => handleExportPDF(`Finiquito_OP_${req?.id}`, true)} className="bg-black text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg"><Printer size={16} /> EXPORTAR PDF</button></div>
        <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6"><div className="flex items-center gap-4"><div className="bg-black text-white p-2 rounded-lg flex items-center print:border print:border-black print:bg-white print:text-black font-black text-2xl">G&B</div><div><h1 className="text-lg font-black uppercase tracking-widest text-black">REPORTE FINAL DE PRODUCCIÓN</h1><p className="text-[10px] font-bold text-gray-500 uppercase">SERVICIOS JIRET G&B, C.A.</p></div></div><div className="text-right"><p className="text-[10px] font-bold text-gray-500 uppercase">FECHA EMISIÓN: <span className="text-black">{getTodayDate()}</span></p><p className="text-sm font-black text-orange-600 uppercase mt-1">OP N° {String(req?.id).replace('OP-','').padStart(5,'0')}</p></div></div>
        <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl mb-6 text-[10px] font-bold uppercase border border-gray-200"><div><span className="text-gray-500 block mb-1">CLIENTE:</span> {req?.client}</div><div className="col-span-2"><span className="text-gray-500 block mb-1">PRODUCTO:</span> {req?.desc}</div><div className="text-right"><span className="text-gray-500 block mb-1">META SOLICITADA:</span> <span className="text-orange-600 font-black text-sm">{formatNum(req?.requestedKg)} KG</span></div><div><span className="text-gray-500 block mb-1">FECHA INICIO (PLANTA):</span> <span className="text-black">{getFI()}</span></div><div><span className="text-gray-500 block mb-1">FECHA CIERRE (PLANTA):</span> <span className="text-black">{getFF()}</span></div></div>
        <div className="overflow-hidden rounded-xl border border-gray-300"><table className="w-full text-left text-[10px] whitespace-nowrap"><thead className="bg-gray-100 text-gray-800 border-b border-gray-300"><tr><th className="p-3 font-black uppercase">FASE / CONCEPTO</th><th className="p-3 text-center font-black uppercase">CANTIDAD</th><th className="p-3 text-center font-black uppercase">U.M.</th><th className="p-3 font-black uppercase">NOTAS / INDICADORES</th></tr></thead><tbody className="divide-y divide-gray-200">
            <tr><td colSpan="4" className="p-2 font-black uppercase text-[11px] text-orange-600 bg-orange-50 font-black">1. MATERIA PRIMA CONSUMIDA</td></tr>
            {mpC.length > 0 ? mpC.map((ing, i) => (<tr key={i} className="hover:bg-gray-50"><td className="p-2 pl-4 font-bold text-gray-800 font-black">{(inventory || []).find(inv=>inv?.id===ing?.id)?.desc || ing?.id}</td><td className="p-2 text-center text-gray-700 font-black">{formatNum(ing?.qty)}</td><td className="p-2 text-center text-gray-500 font-black">kg</td><td className="p-2 text-gray-600 font-black">{formatNum(((ing?.qty||0)/totMP)*100)}% de la mezcla</td></tr>)) : (<tr><td colSpan="4" className="p-4 text-center text-gray-500 italic">Sin reporte de insumos.</td></tr>)}
            <tr className="bg-gray-100 font-black border-y-2 border-gray-300 font-black"><td className="p-2 pl-4 text-black font-black">TOTAL MATERIA PRIMA UTILIZADA</td><td className="p-2 text-center text-black font-black">{formatNum(totMP)}</td><td className="p-2 text-center text-gray-600 font-black">kg</td><td className="p-2 text-gray-600 font-black">Ingreso real a Planta</td></tr>
            <tr><td colSpan="4" className="p-2 pt-4 font-black uppercase text-[11px] text-orange-600 bg-orange-50 font-black">2. RESULTADO FINAL</td></tr>
            <tr className="bg-black font-black border-y-4 border-orange-500 text-[12px] text-white print:border-black print:bg-gray-200 print:text-black font-black"><td className="p-3 pl-4 font-black">PRODUCCIÓN FINAL LÍQUIDA</td><td className="p-3 text-center text-orange-600 font-black">{formatNum(totUnid)}</td><td className="p-3 text-center text-orange-600 font-black">{unitF}</td><td className="p-3 text-gray-400 print:text-gray-700 text-[9px] font-black">Unidades empacadas final</td></tr>
        </tbody></table></div>
      </div>
    );
  };

  if (!appUser) return <ErrorBoundary>{renderLogin()}</ErrorBoundary>;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col print:bg-white print:block print:w-full overflow-x-hidden print:overflow-visible text-black font-black">
        <header className="bg-black border-b-4 border-orange-500 sticky top-0 z-50 text-white shadow-md print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between h-20 items-center"><div className="flex items-center gap-4 cursor-pointer transition-transform hover:scale-105" onClick={()=>{clearAllReports(); setActiveTab('home');}}><div className="flex items-center bg-white rounded-2xl px-3 py-1"><span className="text-black font-black text-3xl leading-none">G</span><span className="text-orange-500 font-black text-2xl mx-0.5">&amp;</span><span className="text-black font-black text-3xl leading-none">B</span></div><div className="hidden sm:block border-l-2 border-gray-800 pl-4 uppercase font-black text-lg">Supply ERP</div></div><div className="flex items-center gap-5"><div className="flex items-center gap-3 bg-gray-800 px-5 py-2 rounded-2xl border border-gray-700"><ShieldCheck size={18} className="text-orange-500" /><span className="font-black text-white text-[10px] uppercase leading-none">{appUser?.name}</span></div><button onClick={() => setAppUser(null)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 p-2.5 rounded-2xl border border-gray-700"><LogOut size={20}/></button></div></div></div>
        </header>

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 flex-1 print:p-0 print:m-0 print:block">
          {activeTab !== 'home' && (
            <nav className="md:w-64 flex-shrink-0 space-y-4 print:hidden">
              <button onClick={()=>{clearAllReports(); setActiveTab('home');}} className="w-full flex items-center justify-center gap-3 px-5 py-4 text-xs font-black rounded-2xl bg-black text-white shadow-xl mb-4 uppercase tracking-widest transition-all active:scale-95"><Home size={18} className="text-orange-500" /> INICIO</button>
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
                  <button onClick={() => {clearAllReports(); setProdView('requisiciones');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'requisiciones' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><ClipboardList size={16}/> Ingeniería</button>
                  <button onClick={() => {clearAllReports(); setProdView('fases_produccion');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'fases_produccion' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><PlayCircle size={16}/> Control Fases</button>
                  <button onClick={() => {clearAllReports(); setProdView('historial');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${prodView === 'historial' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'} uppercase`}><History size={16}/> Historial</button>
                </div>
              )}
              {activeTab === 'inventario' && (
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 border-b pb-3 tracking-widest">Control Inventario</h3>
                  <button onClick={() => {clearAllReports(); setInvView('catalogo');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'catalogo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Box size={16}/> Catálogo</button>
                  <button onClick={() => {clearAllReports(); setInvView('cargo');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'cargo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><ArrowDownToLine size={16}/> Cargo</button>
                  <button onClick={() => {clearAllReports(); setInvView('descargo');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'descargo' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><ArrowUpFromLine size={16}/> Descargo</button>
                  <button onClick={() => {clearAllReports(); setInvView('ajuste');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'ajuste' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><Settings2 size={16}/> Ajuste</button>
                  <button onClick={() => {clearAllReports(); setInvView('kardex');}} className={`w-full flex items-center justify-start gap-3 px-5 py-4 text-[11px] font-black rounded-2xl transition-all ${invView === 'kardex' ? 'bg-black text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'} uppercase`}><History size={16}/> Kardex</button>
                </div>
              )}
            </nav>
          )}

          <main className={`flex-1 min-w-0 pb-12 print:pb-0 print:m-0 print:block ${activeTab === 'home' ? 'flex items-center justify-center' : ''}`}>
            {activeTab === 'home' && renderHome()}
            {activeTab === 'ventas' && renderVentasModule()}
            {activeTab === 'produccion' && renderProductionModule()}
            {activeTab === 'inventario' && renderInventoryModule()}
          </main>
        </div>

        {dialog && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] print:hidden"><div className="bg-white rounded-3xl shadow-2xl border-t-8 border-orange-500 p-8 w-full max-w-md animate-in zoom-in-95"><h3 className="text-xl font-black text-black uppercase mb-4 tracking-tighter">{dialog.title}</h3><p className="text-sm font-bold text-gray-500 mb-8 uppercase text-center">{dialog.text}</p><div className="flex gap-4">{dialog.type === 'confirm' && (<button onClick={() => setDialog(null)} className="flex-1 bg-gray-100 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors text-gray-800">CANCELAR</button>)}<button onClick={() => { if (dialog.onConfirm) dialog.onConfirm(); setDialog(null); }} className="flex-1 bg-black text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:bg-gray-900 transition-colors">ACEPTAR</button></div></div></div>
        )}
      </div>
    </ErrorBoundary>
  );
}
```


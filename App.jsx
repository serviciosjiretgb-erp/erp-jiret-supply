import React, {
   useState,
   useEffect
} from 'react';
import {
   LayoutDashboard,
   Package,
   Factory,
   TrendingUp,
   AlertTriangle,
   ClipboardList,
   PlayCircle,
   History,
   FileText,
   Settings2,
   Trash2,
   PlusCircle,
   Calculator,
   Plus,
   Users,
   UserPlus,
   LogOut,
   Lock,
   ArrowDownToLine,
   ArrowUpFromLine,
   BarChart3,
   ShieldCheck,
   Box,
   Home,
   Edit,
   Printer,
   X,
   Search,
   Loader2,
   FileCheck,
   Beaker,
   CheckCircle,
   CheckCircle2,
   Receipt,
   ArrowRight,
   User,
   ArrowRightLeft,
   ClipboardEdit,
   Download,
   Thermometer,
   Gauge,
   Save,
   ShoppingCart,
   DollarSign,
   Percent,
   Briefcase,
   Zap,
   Wrench,
   CreditCard,
   Activity
} from 'lucide-react';
import {
   initializeApp
} from "firebase/app";
import {
   getAuth,
   signInAnonymously,
   onAuthStateChanged
} from "firebase/auth";
import {
   getFirestore,
   collection,
   doc,
   setDoc,
   addDoc,
   updateDoc,
   onSnapshot,
   deleteDoc,
   writeBatch
} from "firebase/firestore";

class ErrorBoundary extends React.Component {
   constructor(props) {
      super(props);
      this.state = {
         hasError: false,
         errorMsg: ''
      };
   }
   static getDerivedStateFromError(error) {
      return {
         hasError: true
      };
   }
   componentDidCatch(error) {
      this.setState({
         errorMsg: error && error.message ? error.message : String(error)
      });
   }
   render() {
      if (this.state.hasError) return ( < div className = "min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 print:hidden" > < AlertTriangle size = {
            60
         }
         className = "text-red-500 mb-4" / > < h2 className = "text-2xl font-black text-black uppercase mb-2" > Error de Sistema Capturado < /h2><p className="text-gray-500 text-sm mb-6">{this.state.errorMsg}</p > < button onClick = {
            () => window.location.reload()
         }
         className = "bg-black text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg" > Recargar Interfaz < /button></div > );
      return this.props.children;
   }
}

const compressImage = (file, cb) => {
   const r = new FileReader();
   r.readAsDataURL(file);
   r.onload = e => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
         const cvs = document.createElement('canvas');
         const ctx = cvs.getContext('2d');
         const MAX = 1920;
         let w = img.width;
         let h = img.height;
         if (w > MAX) {
            h *= MAX / w;
            w = MAX;
         }
         cvs.width = w;
         cvs.height = h;
         ctx.drawImage(img, 0, 0, w, h);
         cb(cvs.toDataURL('image/jpeg', 0.6));
      };
   };
};
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
const getColRef = (c) => collection(db, c);
const getDocRef = (c, d) => doc(db, c, String(d));
const getTodayDate = () => {
   const d = new Date();
   return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const parseNum = (v) => {
   if (!v) return 0;
   if (typeof v === 'number') return v;
   let s = String(v || '').trim();
   if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
   else if (s.includes(',')) s = s.replace(',', '.');
   const p = parseFloat(s);
   return isNaN(p) ? 0 : p;
};
const formatNum = (n) => new Intl.NumberFormat('es-VE', {
   minimumFractionDigits: 2,
   maximumFractionDigits: 2
}).format(parseNum(n));
const getSafeDate = (ts) => {
   if (!ts) return '';
   if (typeof ts === 'string') return ts;
   if (typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString('es-VE');
   if (typeof ts === 'number') return new Date(ts).toLocaleDateString('es-VE');
   if (ts instanceof Date) return ts.toLocaleDateString('es-VE');
   return '';
};
const getMermaColor = (pct) => {
   if (pct <= 5.0) return 'text-green-600';
   if (pct > 5.0 && pct <= 5.5) return 'text-yellow-500';
   return 'text-red-600';
};

const INITIAL_INVENTORY = [{
   id: 'MP-0240',
   desc: 'ESENTTIA',
   cost: 0.96,
   stock: 2325,
   unit: 'kg',
   category: 'Materia Prima'
}, {
   id: 'MP-11PG4',
   desc: 'METALOCENO',
   cost: 0.91,
   stock: 1735,
   unit: 'kg',
   category: 'Materia Prima'
}, {
   id: 'MP-3003',
   desc: 'BAPOLENE',
   cost: 0.96,
   stock: 500,
   unit: 'kg',
   category: 'Materia Prima'
}, {
   id: 'MP-RECICLADO',
   desc: 'MATERIAL RECICLADO',
   cost: 1.00,
   stock: 9999,
   unit: 'kg',
   category: 'Materia Prima'
}];

export default function App() {
   const [fbUser, setFbUser] = useState(null);
   const [appUser, setAppUser] = useState(null);
   const [systemUsers, setSystemUsers] = useState([]);
   const [settings, setSettings] = useState({});
   const [loginData, setLoginData] = useState({
      username: '',
      password: ''
   });
   const [loginError, setLoginError] = useState('');
   const [activeTab, setActiveTab] = useState('home');
   const [ventasView, setVentasView] = useState('facturacion');
   const [prodView, setProdView] = useState('calculadora');
   const [invView, setInvView] = useState('catalogo');
   const [costosView, setCostosView] = useState('dashboard');
   const [operativosView, setOperativosView] = useState('registro');
   const [invReportType, setInvReportType] = useState('entradas');
   const [selectedProdMonth, setSelectedProdMonth] = useState('ALL');
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
   const initialUserForm = {
      username: '',
      password: '',
      name: '',
      role: 'Usuario',
      permissions: {
         ventas: false,
         produccion: false,
         inventario: false,
         costos: false,
         operativos: false,
         configuracion: false
      }
   };
   const [newUserForm, setNewUserForm] = useState(initialUserForm);
   const [editingUserId, setEditingUserId] = useState(null);
   const initialClientForm = {
      rif: '',
      razonSocial: '',
      direccion: '',
      telefono: '',
      personaContacto: '',
      vendedor: '',
      fechaCreacion: getTodayDate()
   };
   const [newClientForm, setNewClientForm] = useState(initialClientForm);
   const [editingClientId, setEditingClientId] = useState(null);
   const initialReqForm = {
      fecha: getTodayDate(),
      client: '',
      tipoProducto: 'BOLSAS',
      desc: '',
      ancho: '',
      fuelles: '',
      largo: '',
      micras: '',
      pesoMillar: '',
      presentacion: 'MILLAR',
      cantidad: '',
      requestedKg: '',
      color: 'NATURAL',
      tratamiento: 'LISO',
      vendedor: ''
   };
   const [newReqForm, setNewReqForm] = useState(initialReqForm);
   const [editingReqId, setEditingReqId] = useState(null);
   const initialInvoiceForm = {
      fecha: getTodayDate(),
      clientRif: '',
      clientName: '',
      documento: '',
      productoMaquilado: '',
      vendedor: '',
      montoBase: '',
      iva: '',
      total: '',
      aplicaIva: 'SI',
      opAsignada: ''
   };
   const [newInvoiceForm, setNewInvoiceForm] = useState(initialInvoiceForm);
   const initialPhaseForm = {
      date: getTodayDate(),
      insumos: [],
      producedKg: '',
      mermaKg: '',
      operadorExt: '',
      tratado: '',
      motorExt: '',
      ventilador: '',
      jalador: '',
      zona1: '',
      zona2: '',
      zona3: '',
      zona4: '',
      zona5: '',
      zona6: '',
      cabezalA: '',
      cabezalB: '',
      operadorImp: '',
      kgRecibidosImp: '',
      cantColores: '',
      relacionImp: '',
      motorImp: '',
      tensores: '',
      tempImp: '',
      solvente: '',
      operadorSel: '',
      kgRecibidosSel: '',
      impresa: 'NO',
      tipoSello: 'Sello FC',
      tempCabezalA: '',
      tempCabezalB: '',
      tempPisoA: '',
      tempPisoB: '',
      velServo: '',
      millaresProd: '',
      troquelSel: ''
   };
   const [showWorkOrder, setShowWorkOrder] = useState(null);
   const [showPhaseReport, setShowPhaseReport] = useState(null);
   const [showFiniquito, setShowFiniquito] = useState(null);
   const [selectedPhaseReqId, setSelectedPhaseReqId] = useState(null);
   const [activePhaseTab, setActivePhaseTab] = useState('extrusion');
   const [phaseForm, setPhaseForm] = useState(initialPhaseForm);
   const [phaseIngId, setPhaseIngId] = useState('');
   const [phaseIngQty, setPhaseIngQty] = useState('');
   const initialCalcInputs = {
      ingredientes: [{
         id: Date.now() + 1,
         nombre: 'MP-0240',
         pct: 80,
         costo: 0.96
      }, {
         id: Date.now() + 2,
         nombre: 'MP-RECICLADO',
         pct: 20,
         costo: 1.00
      }],
      cantidadSolicitada: '',
      mermaGlobalPorc: 5,
      tipoProducto: 'BOLSAS',
      ancho: '',
      fuelles: '',
      largo: '',
      micras: ''
   };
   const [calcInputs, setCalcInputs] = useState(initialCalcInputs);
   const initialInvItemForm = {
      id: '',
      desc: '',
      category: 'Materia Prima',
      unit: 'kg',
      cost: '',
      stock: ''
   };
   const [newInvItemForm, setNewInvItemForm] = useState(initialInvItemForm);
   const [editingInvId, setEditingInvId] = useState(null);
   const initialMovementForm = {
      date: getTodayDate(),
      itemId: '',
      type: 'ENTRADA',
      qty: '',
      cost: '',
      reference: '',
      notes: '',
      opAsignada: ''
   };
   const [newMovementForm, setNewMovementForm] = useState(initialMovementForm);
   const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
   const [reportYear, setReportYear] = useState(new Date().getFullYear());
   const initialOpCostForm = {
      date: getTodayDate(),
      category: 'Nómina y Beneficios',
      customCategory: '',
      description: '',
      amount: ''
   };
   const [newOpCostForm, setNewOpCostForm] = useState(initialOpCostForm);

   const hasPerm = (mod) => appUser?.role === 'Master' || appUser?.permissions?.[mod];

   const handleExportPDF = (filename, isLandscape = false) => {
      const el = document.getElementById('pdf-content');
      if (!el) return;
      const prs = el.querySelectorAll('.hidden.print\\:block, .hidden.pdf-header');
      prs.forEach(e => {
         e.style.display = 'block';
      });
      const nps = el.querySelectorAll('.no-pdf');
      nps.forEach(e => {
         e.style.display = 'none';
      });
      const origCss = el.style.cssText;
      const origCls = el.className;
      const w = isLandscape ? 1120 : 794;
      el.className = 'bg-white text-black p-6';
      el.style.width = `${w}px`;
      el.style.maxWidth = 'none';
      el.style.margin = '0 auto';
      const tabs = el.querySelectorAll('table');
      tabs.forEach(t => {
         t.style.whiteSpace = 'normal';
         t.style.tableLayout = 'fixed';
         t.style.width = '100%';
         t.style.wordBreak = 'break-word';
      });
      const opt = {
         margin: [10, 5, 10, 5],
         filename: `${filename}_${getTodayDate()}.pdf`,
         image: {
            type: 'jpeg',
            quality: 0.98
         },
         html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false
         },
         jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: isLandscape ? 'landscape' : 'portrait'
         }
      };
      const done = () => {
         prs.forEach(e => {
            e.style.display = '';
         });
         nps.forEach(e => {
            e.style.display = '';
         });
         el.style.cssText = origCss;
         el.className = origCls;
         tabs.forEach(t => {
            t.style.whiteSpace = '';
            t.style.tableLayout = '';
            t.style.width = '';
            t.style.wordBreak = '';
         });
      };
      if (typeof window.html2pdf === 'undefined') {
         const s = document.createElement('script');
         s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
         s.onload = () => {
            window.html2pdf().set(opt).from(el).save().then(done);
         };
         document.head.appendChild(s);
      } else {
         window.html2pdf().set(opt).from(el).save().then(done);
      }
   };
   const handleExportExcel = (tableId, filename) => {
      const t = document.getElementById(tableId);
      if (!t) return;
      const tc = t.cloneNode(true);
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><style>table{border-collapse:collapse;width:100%;font-family:Arial;font-size:11px;}th,td{border:1px solid #000;padding:5px;}th{text-align:center;}</style></head><body><h2>SERVICIOS JIRET G&B, C.A. - RIF: J-412309374</h2><br/>${tc.outerHTML}</body></html>`;
      const b = new Blob([html], {
         type: 'application/vnd.ms-excel'
      });
      const u = URL.createObjectURL(b);
      const l = document.createElement('a');
      l.href = u;
      l.download = `${filename}_${getTodayDate()}.xls`;
      document.body.appendChild(l);
      l.click();
      document.body.removeChild(l);
   };

   const handleLogin = (e) => {
      e.preventDefault();
      const u = loginData.username.toLowerCase().trim();
      const p = loginData.password.trim();
      const f = systemUsers.find(x => x.username === u && x.password === p);
      if (f) {
         setAppUser(f);
         setLoginError('');
      } else {
         setLoginError('Credenciales incorrectas.');
      }
   };
   const handleBgUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
         compressImage(file, async (b64) => {
            try {
               await setDoc(getDocRef('settings', 'general'), {
                  loginBg: b64
               }, {
                  merge: true
               });
               setDialog({
                  title: 'Éxito',
                  text: 'Fondo actualizado.',
                  type: 'alert'
               });
            } catch (error) {
               setDialog({
                  title: 'Error',
                  text: 'Imagen muy pesada.',
                  type: 'alert'
               });
            }
         });
      }
   };

   useEffect(() => {
      signInAnonymously(auth).catch(e => console.error(e));
      const unsub = onAuthStateChanged(auth, setFbUser);
      return () => unsub();
   }, []);
   useEffect(() => {
      if (!fbUser) return;
      let isFirstInv = true;
      const u1 = onSnapshot(getColRef('users'), (s) => {
         const lu = s.docs.map(d => ({
            id: d.id,
            ...d.data()
         }));
         setSystemUsers(lu);
         if (s.empty) {
            setDoc(getDocRef('users', 'admin'), {
               username: 'admin',
               password: '1234',
               name: 'Administrador General',
               role: 'Master',
               permissions: {
                  ventas: true,
                  produccion: true,
                  inventario: true,
                  costos: true,
                  operativos: true,
                  configuracion: true
               }
            });
         }
      });
      const u2 = onSnapshot(getDocRef('settings', 'general'), (d) => {
         if (d.exists()) setSettings(d.data());
      });
      const u3 = onSnapshot(getColRef('inventory'), (s) => {
         const data = s.docs.map(d => ({
            id: d.id,
            ...d.data()
         }));
         setInventory(data);
         if (s.empty && isFirstInv) {
            INITIAL_INVENTORY.forEach(item => setDoc(getDocRef('inventory', item.id), item));
         }
         isFirstInv = false;
      });
      const u4 = onSnapshot(getColRef('inventoryMovements'), (s) => {
         setInvMovements(s.docs.map(d => ({
            id: d.id,
            ...d.data()
         })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      });
      const u5 = onSnapshot(getColRef('clientes'), (s) => {
         setClients(s.docs.map(d => ({
            id: d.id,
            ...d.data()
         })));
      });
      const u6 = onSnapshot(getColRef('requirements'), (s) => {
         setRequirements(s.docs.map(d => ({
            id: d.id,
            ...d.data()
         })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      });
      const u7 = onSnapshot(getColRef('maquilaInvoices'), (s) => {
         setInvoices(s.docs.map(d => ({
            id: d.id,
            ...d.data()
         })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      });
      const u8 = onSnapshot(getColRef('inventoryRequisitions'), (s) => {
         setInvRequisitions(s.docs.map(d => ({
            id: d.id,
            ...d.data()
         })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      });
      const u9 = onSnapshot(getColRef('operatingCosts'), (s) => {
         setOpCosts(s.docs.map(d => ({
            id: d.id,
            ...d.data()
         })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      });
      return () => {
         u1();
         u2();
         u3();
         u4();
         u5();
         u6();
         u7();
         u8();
         u9();
      };
   }, [fbUser]);

   const clearAllReports = () => {
      setShowReqReport(false);
      setShowClientReport(false);
      setShowGeneralInvoicesReport(false);
      setShowNewReqPanel(false);
      setShowNewInvoicePanel(false);
      setEditingClientId(null);
      setEditingReqId(null);
      setShowSingleReqReport(null);
      setShowSingleInvoice(null);
      setInvoiceSearchTerm('');
      setShowWorkOrder(null);
      setShowPhaseReport(null);
      setShowFiniquito(null);
      setSelectedPhaseReqId(null);
      setReqToApprove(null);
      setShowMovementReceipt(null);
      setShowPurchaseOrder(false);
      setSelectedOpCost('');
      setSelectedProdMonth('ALL');
   };
   const handleSaveUser = async (e) => {
      e.preventDefault();
      if (!newUserForm.username || !newUserForm.password) return setDialog({
         title: 'Aviso',
         text: 'Requerido.',
         type: 'alert'
      });
      const userId = newUserForm.username.toLowerCase().trim();
      try {
         await setDoc(getDocRef('users', userId), {
            ...newUserForm,
            username: userId
         });
         setNewUserForm(initialUserForm);
         setEditingUserId(null);
         setDialog({
            title: 'Éxito',
            text: 'Usuario registrado.',
            type: 'alert'
         });
      } catch (err) {
         setDialog({
            title: 'Error',
            text: err.message,
            type: 'alert'
         });
      }
   };
   const startEditUser = (u) => {
      setEditingUserId(u.username);
      setNewUserForm(u);
      window.scrollTo({
         top: 0,
         behavior: 'smooth'
      });
   };
   const handleDeleteUser = (id) => {
      if (id === 'admin') return setDialog({
         title: 'Denegado',
         text: 'No eliminar al Master.',
         type: 'alert'
      });
      setDialog({
         title: 'Eliminar Usuario',
         text: `¿Desea eliminar ${id}?`,
         type: 'confirm',
         onConfirm: async () => await deleteDoc(getDocRef('users', id))
      });
   };

   const handleSaveInvItem = async (e) => {
      e.preventDefault();
      if (!newInvItemForm.id || !newInvItemForm.desc) return setDialog({
         title: 'Aviso',
         text: 'Requerido.',
         type: 'alert'
      });
      const itemData = {
         ...newInvItemForm,
         id: newInvItemForm.id.toUpperCase(),
         desc: newInvItemForm.desc.toUpperCase(),
         cost: parseNum(newInvItemForm.cost),
         stock: parseNum(newInvItemForm.stock),
         timestamp: Date.now()
      };
      try {
         await setDoc(getDocRef('inventory', itemData.id), itemData, {
            merge: true
         });
         setNewInvItemForm(initialInvItemForm);
         setEditingInvId(null);
         setDialog({
            title: 'Éxito',
            text: 'Guardado.',
            type: 'alert'
         });
      } catch (err) {
         setDialog({
            title: 'Error',
            text: err.message,
            type: 'alert'
         });
      }
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
      window.scrollTo({
         top: 0,
         behavior: 'smooth'
      });
   };
   const handleSaveMovement = async (e) => {
      e.preventDefault();
      const item = (inventory || []).find(i => i?.id === newMovementForm.itemId);
      if (!item) return;
      const qty = parseNum(newMovementForm.qty);
      const isAddition = newMovementForm.type === 'ENTRADA' || newMovementForm.type === 'AJUSTE (POSITIVO)';
      if (!isAddition && (item?.stock || 0) < qty) {
         return setDialog({
            title: 'Stock Insuficiente',
            text: `Stock (${item.stock}) no cubre ${qty}.`,
            type: 'alert'
         });
      }
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
         batch.set(getDocRef('inventoryMovements', movId), {
            id: movId,
            date: newMovementForm.date,
            itemId: item.id,
            itemName: item.desc,
            type: newMovementForm.type,
            qty,
            cost: movCost,
            totalValue: qty * movCost,
            reference: newMovementForm.reference.toUpperCase(),
            opAsignada: newMovementForm.opAsignada || '',
            notes: newMovementForm.notes.toUpperCase(),
            timestamp: Date.now(),
            user: appUser?.name
         });
         batch.update(getDocRef('inventory', item.id), {
            stock: (item?.stock || 0) + (isAddition ? qty : -qty),
            cost: updatedCost
         });
         await batch.commit();
         setNewMovementForm(initialMovementForm);
         setDialog({
            title: 'Éxito',
            text: `Movimiento registrado.`,
            type: 'alert'
         });
      } catch (err) {
         setDialog({
            title: 'Error',
            text: err.message,
            type: 'alert'
         });
      }
   };
   const handleDeleteInvItem = (id) => setDialog({
      title: 'Eliminar Ítem',
      text: `¿Eliminar ${id}?`,
      type: 'confirm',
      onConfirm: async () => await deleteDoc(getDocRef('inventory', id))
   });
   const handleDeleteMovement = (m) => {
      setDialog({
         title: 'Anular Movimiento',
         text: `¿Revertir movimiento? Esto ajustará el stock, pero NO recalcula costos anteriores.`,
         type: 'confirm',
         onConfirm: async () => {
            const item = (inventory || []).find(i => i?.id === m?.itemId);
            if (item) {
               const isPos = String(m?.type || '').includes('ENTRADA') || String(m?.type || '').includes('POSITIVO');
               const batch = writeBatch(db);
               batch.update(getDocRef('inventory', item.id), {
                  stock: (item?.stock || 0) + (isPos ? -(m?.qty || 0) : (m?.qty || 0))
               });
               batch.delete(getDocRef('inventoryMovements', m.id));
               await batch.commit();
               setDialog({
                  title: 'Anulado',
                  text: 'Stock actualizado.',
                  type: 'alert'
               });
            } else {
               await deleteDoc(getDocRef('inventoryMovements', m.id));
               setDialog({
                  title: 'Anulado',
                  text: 'Registro eliminado.',
                  type: 'alert'
               });
            }
         }
      });
   };

   const generateReport177Data = () => {
      const data = [];
      const categories = [...new Set((inventory || []).map(i => i?.category || 'Otros'))];
      categories.forEach(cat => {
         const itemsData = (inventory || []).filter(i => (i?.category || 'Otros') === cat).map(item => {
            const movs = (invMovements || []).filter(m => m?.itemId === item?.id);
            const start = new Date(reportYear, reportMonth - 1, 1).getTime();
            const end = new Date(reportYear, reportMonth, 0, 23, 59, 59).getTime();
            let initialStock = item?.stock || 0;
            movs.filter(m => m?.timestamp >= start).forEach(m => {
               const isPos = String(m?.type || '').includes('ENTRADA') || String(m?.type || '').includes('POSITIVO');
               initialStock += (isPos ? -(m?.qty || 0) : (m?.qty || 0));
            });
            let mEntQty = 0,
               mEntCost = 0,
               mSalQty = 0,
               mSalCost = 0;
            movs.filter(m => m?.timestamp >= start && m?.timestamp <= end).forEach(m => {
               const isPos = String(m?.type || '').includes('ENTRADA') || String(m?.type || '').includes('POSITIVO');
               if (isPos) {
                  mEntQty += (m?.qty || 0);
                  mEntCost += ((m?.cost || 0) * (m?.qty || 0));
               } else {
                  mSalQty += (m?.qty || 0);
                  mSalCost += ((m?.cost || 0) * (m?.qty || 0));
               }
            });
            const itemCost = item?.cost || 0;
            const invFinalQty = initialStock + mEntQty - mSalQty;
            return {
               ...item,
               initialStock,
               initialTotal: initialStock * itemCost,
               monthEntradasQty: mEntQty,
               monthEntradasTotal: mEntCost,
               monthEntradasProm: mEntQty ? mEntCost / mEntQty : 0,
               monthSalidasQty: mSalQty,
               monthSalidasTotal: mSalCost,
               monthSalidasProm: mSalQty ? mSalCost / mSalQty : 0,
               invFinalQty,
               invFinalTotal: invFinalQty * itemCost,
               invFinalCost: itemCost
            };
         });
         data.push({
            category: cat,
            items: itemsData
         });
      });
      return data;
   };

   const handleAddClient = async (e) => {
      if (e) e.preventDefault();
      if (!newClientForm.rif || !newClientForm.razonSocial) return setDialog({
         title: 'Aviso',
         text: 'Requeridos.',
         type: 'alert'
      });
      const rif = newClientForm.rif.toUpperCase().trim();
      try {
         await setDoc(getDocRef('clientes', rif), {
            ...newClientForm,
            name: newClientForm.razonSocial.toUpperCase().trim(),
            rif,
            timestamp: Date.now()
         }, {
            merge: true
         });
         setNewClientForm(initialClientForm);
         setEditingClientId(null);
         setDialog({
            title: '¡Éxito!',
            text: 'Guardado.',
            type: 'alert'
         });
      } catch (err) {
         setDialog({
            title: 'Error',
            text: err.message,
            type: 'alert'
         });
      }
   };
   const startEditClient = (c) => {
      setEditingClientId(c.rif);
      setNewClientForm({
         ...c,
         razonSocial: c.name
      });
      window.scrollTo({
         top: 0,
         behavior: 'smooth'
      });
   };
   const handleDeleteClient = (rif) => setDialog({
      title: 'Eliminar Cliente',
      text: `¿Eliminar ${rif}?`,
      type: 'confirm',
      onConfirm: async () => await deleteDoc(getDocRef('clientes', rif))
   });
   const generateInvoiceId = () => `FAC-${((invoices || []).reduce((m, r) => Math.max(m, parseInt(String(r.id).replace(/\D/g, '')||0, 10)), 0) + 1).toString().padStart(4, '0')}`;
   const handleInvoiceFormChange = (field, value) => {
      const valUpper = typeof value === 'string' ? value.toUpperCase() : value;
      let f = {
         ...newInvoiceForm,
         [field]: valUpper
      };
      if (field === 'clientRif') {
         const c = (clients || []).find(cl => cl.rif === value);
         f.clientName = c?.name || '';
         f.vendedor = (c?.vendedor || '').toUpperCase();
      }
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
      e.preventDefault();
      if (!newInvoiceForm.clientRif || !newInvoiceForm.montoBase) return setDialog({
         title: 'Aviso',
         text: 'Requerido.',
         type: 'alert'
      });
      const id = newInvoiceForm.documento || generateInvoiceId();
      try {
         await setDoc(getDocRef('maquilaInvoices', id), {
            ...newInvoiceForm,
            id,
            documento: id,
            montoBase: parseNum(newInvoiceForm.montoBase),
            iva: parseNum(newInvoiceForm.iva),
            total: parseNum(newInvoiceForm.total),
            aplicaIva: newInvoiceForm.aplicaIva || 'SI',
            timestamp: Date.now(),
            user: appUser?.name
         });
         setShowNewInvoicePanel(false);
         setNewInvoiceForm(initialInvoiceForm);
         setDialog({
            title: 'Éxito',
            text: 'Registrada.',
            type: 'alert'
         });
      } catch (err) {
         setDialog({
            title: 'Error',
            text: err.message,
            type: 'alert'
         });
      }
   };
   const handleDeleteInvoice = (id) => setDialog({
      title: 'Eliminar',
      text: `¿Eliminar?`,
      type: 'confirm',
      onConfirm: async () => await deleteDoc(getDocRef('maquilaInvoices', id))
   });
   const generateReqId = () => `OP-${((requirements || []).reduce((m, r) => Math.max(m, parseInt(String(r.id).replace(/\D/g, '')||0, 10)), 0) + 1).toString().padStart(5, '0')}`;
   const handleReqFormChange = (field, value) => {
      let f = {
         ...newReqForm,
         [field]: typeof value === 'string' ? value.toUpperCase() : value
      };
      if (field === 'client') {
         const c = (clients || []).find(cl => cl.name === (value || '').toUpperCase());
         if (c && c.vendedor) f.vendedor = c.vendedor.toUpperCase();
      }
      if (field === 'tipoProducto' && value === 'TERMOENCOGIBLE') f.presentacion = 'KILOS';
      const w = parseNum(f.ancho),
         l = parseNum(f.largo),
         m = parseNum(f.micras),
         fu = parseNum(f.fuelles),
         c = parseNum(f.cantidad),
         tipo = f.tipoProducto;
      if (w > 0 && m > 0) {
         const micFmt = m < 1 && m > 0 ? Math.round(m * 1000) : m;
         if (tipo === 'BOLSAS' && l > 0) {
            const pEst = (w + fu) * l * m;
            f.pesoMillar = pEst.toFixed(2);
            f.desc = fu > 0 ? `(${w}+${fu/2}+${fu/2})X${l}X${micFmt}MIC | ${f.color || ''}` : `${w}X${l}X${micFmt}MIC | ${f.color || ''}`;
            f.requestedKg = f.presentacion === 'KILOS' ? c.toFixed(2) : (pEst * c).toFixed(2);
         } else if (tipo === 'TERMOENCOGIBLE') {
            f.pesoMillar = 'N/A';
            f.desc = `TERMOENCOGIBLE ${w}CM X ${micFmt}MIC | ${f.color || ''}`;
            f.requestedKg = c > 0 ? c.toFixed(2) : '0.00';
         } else {
            f.pesoMillar = '0.00';
            f.requestedKg = '0.00';
         }
      } else {
         f.pesoMillar = tipo === 'TERMOENCOGIBLE' ? 'N/A' : '0.00';
         f.requestedKg = f.presentacion === 'KILOS' && c > 0 ? c.toFixed(2) : '0.00';
      }
      setNewReqForm(f);
   };
   const handleCreateRequirement = async (e) => {
      e.preventDefault();
      const opId = editingReqId ? editingReqId : generateReqId();
      try {
         await setDoc(getDocRef('requirements', opId), {
            ...newReqForm,
            id: opId,
            timestamp: editingReqId ? (requirements || []).find(r => r.id === editingReqId)?.timestamp : Date.now(),
            status: editingReqId ? (requirements || []).find(r => r.id === editingReqId)?.status : 'EN PROCESO',
            viewedByPlanta: false
         }, {
            merge: true
         });
         setShowNewReqPanel(false);
         setNewReqForm(initialReqForm);
         setEditingReqId(null);
         setDialog({
            title: 'Éxito',
            text: `Enviada a Planta.`,
            type: 'alert'
         });
      } catch (err) {
         setDialog({
            title: 'Error',
            text: err.message,
            type: 'alert'
         });
      }
   };
   const startEditReq = (r) => {
      setEditingReqId(r.id);
      setNewReqForm({
         fecha: r.fecha || getTodayDate(),
         client: r.client || '',
         tipoProducto: r.tipoProducto || 'BOLSAS',
         desc: r.desc || '',
         ancho: r.ancho || '',
         fuelles: r.fuelles || '',
         largo: r.largo || '',
         micras: r.micras || '',
         pesoMillar: r.tipoProducto === 'TERMOENCOGIBLE' ? 'N/A' : (r.pesoMillar || ''),
         presentacion: r.presentacion || 'MILLAR',
         cantidad: r.cantidad || '',
         requestedKg: r.requestedKg || '',
         color: r.color || 'NATURAL',
         tratamiento: r.tratamiento || 'LISO',
         vendedor: r.vendedor || ''
      });
      setShowNewReqPanel(true);
      window.scrollTo({
         top: 0,
         behavior: 'smooth'
      });
   };
   const handleDeleteReq = (id) => setDialog({
      title: 'Eliminar OP',
      text: `¿Desea eliminar la OP #${id}?`,
      type: 'confirm',
      onConfirm: async () => await deleteDoc(getDocRef('requirements', id))
   });
   const handleSendRequisitionToAlmacen = async () => {
      if (!phaseForm.insumos || phaseForm.insumos.length === 0) return setDialog({
         title: 'Aviso',
         text: 'Agregue insumos.',
         type: 'alert'
      });
      const newReq = {
         opId: selectedPhaseReqId,
         phase: activePhaseTab,
         items: phaseForm.insumos,
         status: 'PENDIENTE',
         timestamp: Date.now(),
         date: getTodayDate(),
         user: appUser?.name || 'Operador'
      };
      try {
         await addDoc(getColRef('inventoryRequisitions'), newReq);
         setPhaseForm({
            ...phaseForm,
            insumos: []
         });
         setDialog({
            title: 'Enviada',
            text: 'Enviada a almacén.',
            type: 'alert'
         });
      } catch (e) {
         setDialog({
            title: 'Error',
            text: e.message,
            type: 'alert'
         });
      }
   };

   const submitApproveRequisition = async (e) => {
      e.preventDefault();
      try {
         const req = reqToApprove;
         const targetOP = (requirements || []).find(r => r.id === req.opId);
         if (!targetOP) throw new Error('OP no existe.');
         const validItems = req.items.filter(i => parseNum(i.qty) > 0);
         if (validItems.length === 0) throw new Error('No hay ítems válidos.');
         const batch = writeBatch(db);
         let phaseCost = 0;
         let totalInsumosKg = 0;
         for (let ing of validItems) {
            const item = (inventory || []).find(i => i.id === ing.id);
            if (!item) throw new Error(`Ítem no encontrado.`);
            if ((item.stock || 0) < ing.qty) throw new Error(`Stock insuficiente.`);
            phaseCost += (item.cost * ing.qty);
            totalInsumosKg += parseFloat(ing.qty);
            batch.update(getDocRef('inventory', item.id), {
               stock: (item.stock || 0) - ing.qty
            });
            const movId = Date.now().toString() + Math.floor(Math.random() * 1000);
            batch.set(getDocRef('inventoryMovements', movId), {
               id: movId,
               date: getTodayDate(),
               itemId: item.id,
               itemName: item.desc,
               type: 'SALIDA',
               qty: ing.qty,
               cost: item.cost,
               totalValue: ing.qty * item.cost,
               reference: `REQ-${targetOP.id}-${req.phase.substring(0,3).toUpperCase()}`,
               opAsignada: targetOP.id,
               notes: 'DESPACHO ALMACÉN',
               timestamp: Date.now(),
               user: appUser?.name || 'Almacén'
            });
         }
         let currentPhase = {
            ...(targetOP.production?.[req.phase] || {
               batches: [],
               isClosed: false
            })
         };
         const newProdBatch = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            date: getTodayDate(),
            insumos: validItems,
            producedKg: 0,
            mermaKg: 0,
            totalInsumosKg,
            cost: phaseCost,
            operator: 'ALMACÉN (DESPACHO)',
            techParams: {}
         };
         if (!currentPhase.batches) currentPhase.batches = [];
         currentPhase.batches.push(newProdBatch);
         batch.update(getDocRef('requirements', targetOP.id), {
            [`production.${req.phase}`]: currentPhase
         });
         batch.update(getDocRef('inventoryRequisitions', req.id), {
            status: 'APROBADO',
            dispatchDate: getTodayDate(),
            items: validItems,
            approvedBy: appUser?.name
         });
         await batch.commit();
         setReqToApprove(null);
         setDialog({
            title: '¡Descargo Exitoso!',
            text: 'Procesado.',
            type: 'alert'
         });
      } catch (err) {
         setDialog({
            title: 'Error',
            text: err.message,
            type: 'alert'
         });
      }
   };

   const handleRejectRequisition = (id) => {
      setDialog({
         title: 'Rechazar',
         text: '¿Rechazar?',
         type: 'confirm',
         onConfirm: async () => {
            await updateDoc(getDocRef('inventoryRequisitions', id), {
               status: 'RECHAZADO',
               dispatchDate: getTodayDate()
            });
            setDialog({
               title: 'OK',
               text: 'Rechazada.',
               type: 'alert'
            });
         }
      });
   };
   const renderPhaseInventoryOptions = () => {
      let mainCats = [];
      if (activePhaseTab === 'extrusion') mainCats = ['Materia Prima', 'Pigmentos', 'Consumibles', 'Herramientas', 'Seguridad Industrial'];
      else if (activePhaseTab === 'impresion') mainCats = ['Tintas', 'Químicos', 'Consumibles', 'Seguridad Industrial'];
      else if (activePhaseTab === 'sellado') mainCats = ['Consumibles', 'Herramientas'];
      const grouped = {};
      (inventory || []).forEach(i => {
         const cat = i?.category || 'Otros';
         if (!grouped[cat]) grouped[cat] = [];
         grouped[cat].push(i);
      });
      return ( < > < option value = "" > Seleccione Insumo... < /option>{mainCats.map(cat => grouped[cat] && grouped[cat].length > 0 && ( <optgroup key={cat} label={`📌 ${cat.toUpperCase()} (Recomendado)`}> {(grouped[cat] || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc} ({formatNum(i?.stock)} {i?.unit})</option > )
   } < /optgroup> ))}{Object.keys(grouped).filter(c => !mainCats.includes(c)).map(cat => grouped[cat] && grouped[cat].length > 0 && ( <optgroup key={cat} label={`📂 ${cat.toUpperCase()} (Otros)`}> {(grouped[cat] || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.desc} ({formatNum(i?.stock)} {i?.unit})</option > )
} < /optgroup> ))}</ > );
};
const handleAddPhaseIng = () => {
   if (!phaseIngId || !phaseIngQty) return;
   const ing = (inventory || []).find(i => i?.id === phaseIngId);
   if (!ing) return;
   setPhaseForm({
      ...phaseForm,
      insumos: [...(phaseForm?.insumos || []), {
         id: phaseIngId,
         qty: parseFloat(phaseIngQty)
      }]
   });
   setPhaseIngId('');
   setPhaseIngQty('');
};

const handleSavePhase = async (e) => {
   e.preventDefault();
   const req = (requirements || []).find(r => r?.id === selectedPhaseReqId);
   if (!req) return;
   const actionType = e.nativeEvent?.submitter?.name;
   const isSkip = actionType === 'skip';
   const isClose = actionType === 'close';
   let currentPhase = req.production?.[activePhaseTab] || {
      batches: [],
      isClosed: false
   };
   if (isSkip) {
      currentPhase.skipped = true;
      currentPhase.isClosed = true;
   } else {
      const prodKg = parseNum(phaseForm?.producedKg);
      const mermaKg = parseNum(phaseForm?.mermaKg);
      if (prodKg > 0 || mermaKg > 0 || (phaseForm?.insumos || []).length > 0) {
         const batch = writeBatch(db);
         let phaseCost = 0;
         let totalInsumosKg = 0;
         for (let ing of (phaseForm?.insumos || [])) {
            const item = (inventory || []).find(i => i?.id === ing?.id);
            if (item) {
               phaseCost += ((item?.cost || 0) * (ing?.qty || 0));
               totalInsumosKg += parseFloat(ing?.qty || 0);
               batch.update(getDocRef('inventory', item.id), {
                  stock: (item?.stock || 0) - (ing?.qty || 0)
               });
            }
         }
         await batch.commit();
         let techParams = {};
         if (activePhaseTab === 'extrusion') techParams = {
            operador: phaseForm?.operadorExt,
            tratado: phaseForm?.tratado,
            motor: phaseForm?.motorExt,
            ventilador: phaseForm?.ventilador,
            jalador: phaseForm?.jalador,
            zonas: [phaseForm?.zona1, phaseForm?.zona2, phaseForm?.zona3, phaseForm?.zona4, phaseForm?.zona5, phaseForm?.zona6],
            cabezalA: phaseForm?.cabezalA,
            cabezalB: phaseForm?.cabezalB
         };
         if (activePhaseTab === 'impresion') techParams = {
            operador: phaseForm?.operadorImp,
            kgRecibidos: phaseForm?.kgRecibidosImp,
            cantColores: phaseForm?.cantColores,
            relacion: phaseForm?.relacionImp,
            motor: phaseForm?.motorImp,
            tensores: phaseForm?.tensores,
            temp: phaseForm?.tempImp,
            solvente: phaseForm?.solvente
         };
         if (activePhaseTab === 'sellado') techParams = {
            operador: phaseForm?.operadorSel,
            kgRecibidos: phaseForm?.kgRecibidosSel,
            impresa: phaseForm?.impresa,
            tipoSello: phaseForm?.tipoSello,
            tempCabezalA: phaseForm?.tempCabezalA,
            tempCabezalB: phaseForm?.tempCabezalB,
            tempPisoA: phaseForm?.tempPisoA,
            tempPisoB: phaseForm?.tempPisoB,
            velServo: phaseForm?.velServo,
            millares: phaseForm?.millaresProd,
            troquel: phaseForm?.troquelSel
         };
         const newBatch = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            date: phaseForm?.date || getTodayDate(),
            insumos: phaseForm?.insumos || [],
            producedKg: prodKg,
            mermaKg,
            totalInsumosKg,
            cost: phaseCost,
            operator: appUser?.name || 'Operador',
            techParams
         };
         if (!currentPhase.batches) currentPhase.batches = [];
         currentPhase.batches.push(newBatch);
      }
      if (isClose) currentPhase.isClosed = true;
   }
   const newProd = {
      ...(req.production || {}),
      [activePhaseTab]: currentPhase
   };
   let newStatus = (activePhaseTab === 'sellado' && currentPhase.isClosed) ? 'COMPLETADO' : 'EN PROCESO';
   await updateDoc(getDocRef('requirements', req.id), {
      production: newProd,
      status: newStatus
   });
   setPhaseForm({
      ...initialPhaseForm,
      date: getTodayDate()
   });
   setDialog({
      title: 'Éxito',
      text: 'Reporte guardado.',
      type: 'alert'
   });
};

const handleDeleteBatch = async (reqId, phase, batchId) => {
   setDialog({
      title: `ELIMINAR LOTE`,
      text: `¿Seguro?`,
      type: 'confirm',
      onConfirm: async () => {
         const req = (requirements || []).find(r => r?.id === reqId);
         let currentPhase = {
            ...(req?.production?.[phase] || {})
         };
         const bIdx = (currentPhase.batches || []).findIndex(b => b?.id === batchId);
         if (bIdx >= 0) {
            const batch = currentPhase.batches[bIdx];
            const fbBatch = writeBatch(db);
            for (let ing of (batch.insumos || [])) {
               const item = (inventory || []).find(i => i?.id === ing?.id);
               if (item) fbBatch.update(getDocRef('inventory', item.id), {
                  stock: (item?.stock || 0) + (ing?.qty || 0)
               });
            }
            await fbBatch.commit();
            currentPhase.batches.splice(bIdx, 1);
         }
         await updateDoc(getDocRef('requirements', reqId), {
            production: {
               ...(req?.production || {}),
               [phase]: currentPhase
            }
         });
      }
   });
};

const handleEditBatch = (reqId, phase, batchId) => {
   setDialog({
      title: `MODIFICAR LOTE`,
      text: `El lote volverá a edición. ¿Continuar?`,
      type: 'confirm',
      onConfirm: async () => {
         const req = (requirements || []).find(r => r?.id === reqId);
         if (!req) return;
         let currentPhase = {
            ...(req?.production?.[phase] || {})
         };
         const bIdx = (currentPhase.batches || []).findIndex(b => b?.id === batchId);
         if (bIdx >= 0) {
            const batch = currentPhase.batches[bIdx];
            const restoreForm = {
               ...initialPhaseForm,
               date: batch?.date || getTodayDate(),
               producedKg: batch?.producedKg || '',
               mermaKg: batch?.mermaKg || '',
               insumos: batch?.insumos || []
            };
            if (phase === 'extrusion' && batch?.techParams) {
               restoreForm.operadorExt = batch.techParams.operador || '';
               restoreForm.tratado = batch.techParams.tratado || '';
               restoreForm.motorExt = batch.techParams.motor || '';
               restoreForm.ventilador = batch.techParams.ventilador || '';
               restoreForm.jalador = batch.techParams.jalador || '';
               restoreForm.zona1 = batch.techParams.zonas?.[0] || '';
               restoreForm.zona2 = batch.techParams.zonas?.[1] || '';
               restoreForm.zona3 = batch.techParams.zonas?.[2] || '';
               restoreForm.zona4 = batch.techParams.zonas?.[3] || '';
               restoreForm.zona5 = batch.techParams.zonas?.[4] || '';
               restoreForm.zona6 = batch.techParams.zonas?.[5] || '';
               restoreForm.cabezalA = batch.techParams.cabezalA || '';
               restoreForm.cabezalB = batch.techParams.cabezalB || '';
            }
            if (phase === 'impresion' && batch?.techParams) {
               restoreForm.operadorImp = batch.techParams.operador || '';
               restoreForm.kgRecibidosImp = batch.techParams.kgRecibidos || '';
               restoreForm.cantColores = batch.techParams.cantColores || '';
               restoreForm.relacionImp = batch.techParams.relacion || '';
               restoreForm.motorImp = batch.techParams.motor || '';
               restoreForm.tensores = batch.techParams.tensores || '';
               restoreForm.tempImp = batch.techParams.temp || '';
               restoreForm.solvente = batch.techParams.solvente || '';
            }
            if (phase === 'sellado' && batch?.techParams) {
               restoreForm.operadorSel = batch.techParams.operador || '';
               restoreForm.kgRecibidosSel = batch.techParams.kgRecibidos || '';
               restoreForm.impresa = batch.techParams.impresa || 'NO';
               restoreForm.tipoSello = batch.techParams.tipoSello || 'Sello FC';
               restoreForm.tempCabezalA = batch.techParams.tempCabezalA || '';
               restoreForm.tempCabezalB = batch.techParams.tempCabezalB || '';
               restoreForm.tempPisoA = batch.techParams.tempPisoA || '';
               restoreForm.tempPisoB = batch.techParams.tempPisoB || '';
               restoreForm.velServo = batch.techParams.velServo || '';
               restoreForm.millaresProd = batch.techParams.millares || '';
               restoreForm.troquelSel = batch.techParams.troquel || '';
            }
            setPhaseForm(restoreForm);
            const fbBatch = writeBatch(db);
            for (let ing of (batch?.insumos || [])) {
               const item = (inventory || []).find(i => i?.id === ing?.id);
               if (item) fbBatch.update(getDocRef('inventory', item.id), {
                  stock: (item?.stock || 0) + (ing?.qty || 0)
               });
            }
            await fbBatch.commit();
            currentPhase.batches.splice(bIdx, 1);
         }
         await updateDoc(getDocRef('requirements', reqId), {
            production: {
               ...(req?.production || {}),
               [phase]: currentPhase
            }
         });
      }
   });
};

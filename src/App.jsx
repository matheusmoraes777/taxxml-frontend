import { useState, useEffect } from 'react'
import { FileText, CreditCard, QrCode, Download, Loader2, Users, BarChart3, ShieldCheck, LogOut, ArrowRight, UserPlus, CheckCircle, FileArchive, RefreshCw, LayoutDashboard, Settings, Activity, Search, Trash2, Edit, DollarSign } from 'lucide-react'

// FIREBASE
import { auth, loginComGoogle, sairDaConta } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

const API_URL = 'https://taxxml-api.onrender.com'

function App() {
  const [usuario, setUsuario] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false) 
  const [view, setView] = useState('login')
  const [loading, setLoading] = useState(false)
  const [keys, setKeys] = useState('')
  const [qrBase64, setQrBase64] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [payId, setPayId] = useState(null)
  const [rastreio, setRastreio] = useState('')

  // Campos Login
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')

  const [downloadFinished, setDownloadFinished] = useState(false)
  const [adminStats, setAdminStats] = useState({ total_xmls: 0, faturamento: 0, clientes_ativos: 0, atividades: [] })
  const [progress, setProgress] = useState({ ativo: false, processados: 0, total: 0 })
  const [adminTab, setAdminTab] = useState('dashboard')

  const validKeys = keys.split('\n').map(k => k.trim()).filter(k => k.length === 44)
  const total = validKeys.length
  const totalPrice = (total * 0.15).toFixed(2)

  // Monitorar Login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setUsuario(user); setView('customer'); } 
    });
    return () => unsubscribe();
  }, []);

  // Monitorar Admin Stats
  useEffect(() => {
    if (isAdmin) {
      const fetchStats = async () => {
        try {
          const res = await fetch(`${API_URL}/api/admin/stats`);
          const data = await res.json();
          setAdminStats(data);
        } catch (e) { console.log("Erro ao buscar dados reais"); }
      };
      fetchStats();
      const interval = setInterval(fetchStats, 10000); // Atualiza a cada 10s
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handleLogout = async () => { await sairDaConta(); setUsuario(null); setIsAdmin(false); setView('login'); }

  const acessarAdmin = async () => {
    const s = prompt("Senha Mestre:");
    if (s === "123456Mat") { setIsAdmin(true); setView('admin'); } else if (s !== null) alert("Incorreta!");
  }

  // --- FUNÇÕES DE NEGÓCIO ---
  const fazerLoginTradicional = async () => {
    if (!email || !senha) return alert("Preencha!");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
      const data = await res.json();
      if (data.sucesso) { setUsuario({ email, displayName: data.nome }); setView('customer'); } else alert(data.erro);
    } catch (e) { alert("Erro de conexão"); }
    setLoading(false);
  }

  const handlePagamento = async (tipo) => {
    setLoading(true);
    const rota = tipo === 'pix' ? '/api/pagar-pix' : '/api/pagar-cartao';
    try {
      const res = await fetch(`${API_URL}${rota}`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ quantidade: total, email: usuario?.email || 'desconhecido' }) 
      });
      const data = await res.json();
      if (data.qr_code_base64) { setQrBase64(data.qr_code_base64); setPayId(data.payment_id); }
      if (data.checkout_url) { setCheckoutUrl(data.checkout_url); setRastreio(data.rastreio); }
    } catch (err) { alert("Erro"); }
    setLoading(false);
  }

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border">
          <div className="flex justify-center mb-2"><img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" alt="Logo" className="w-64" /></div>
          <h2 className="text-2xl font-black text-center text-slate-800 mb-6">Acesso ao Sistema</h2>
          <div className="space-y-4">
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none" />
            <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none" />
            <button onClick={fazerLoginTradicional} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl flex justify-center items-center gap-2">Entrar <ArrowRight className="w-4 h-4"/></button>
            <div className="text-center text-slate-400 py-2">ou</div>
            <button onClick={() => loginComGoogle()} className="w-full py-3 border-2 rounded-xl font-bold flex justify-center items-center gap-3"><img src="https://img.icons8.com/color/24/google-logo.png" /> Google</button>
            <div className="flex justify-between pt-4 border-t mt-4 text-sm font-bold">
              <button onClick={() => setView('register')} className="text-sky-600">Criar Conta</button>
              <button onClick={acessarAdmin} className="text-slate-300 hover:text-red-500"><ShieldCheck className="w-4 h-4"/></button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'customer') {
    return (
      <div className="min-h-screen bg-slate-50 p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center gap-4">
              <img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" className="w-12 h-12 object-contain" />
              <h1 className="text-2xl font-black text-slate-800">Tax XML</h1>
            </div>
            <div className="flex gap-3">
              {isAdmin && <button onClick={() => setView('admin')} className="px-4 py-2 bg-sky-100 text-sky-700 rounded-xl font-bold">Dashboard</button>}
              <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold">Sair</button>
            </div>
          </header>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border shadow-sm">
              <h2 className="text-xl font-bold mb-4 flex gap-2"><Download className="text-sky-500"/> 1. Chaves</h2>
              <textarea className="w-full h-72 p-5 bg-slate-50 border rounded-2xl font-mono text-sm" placeholder="Cole aqui..." value={keys} onChange={e => setKeys(e.target.value)} />
            </div>
            <div className="bg-white p-8 rounded-3xl border shadow-sm h-fit text-center">
              <h2 className="text-xl font-bold mb-6 text-slate-800"><CreditCard className="text-emerald-500"/> 2. Liberação</h2>
              <div className="text-3xl font-black text-emerald-500 mb-6">R$ {totalPrice}</div>
              <button onClick={() => handlePagamento('pix')} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl mb-3">Gerar PIX</button>
              <button onClick={() => handlePagamento('card')} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl">Cartão</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans flex">
        <aside className="w-72 bg-[#1e293b] border-r border-slate-800 flex flex-col p-6">
          <h1 className="text-2xl font-black text-white flex gap-3 mb-10"><ShieldCheck className="text-sky-500"/> Admin Pro</h1>
          <nav className="flex-1 space-y-2">
            <button onClick={() => setAdminTab('dashboard')} className={`w-full text-left px-4 py-3 rounded-xl font-bold ${adminTab === 'dashboard' ? 'bg-sky-500 text-white' : ''}`}>Geral</button>
          </nav>
          <button onClick={() => setView('customer')} className="w-full py-3 bg-slate-800 rounded-xl font-bold mb-3">Sair do Admin</button>
        </aside>

        <main className="flex-1 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800">
              <div className="text-slate-400 text-sm font-bold uppercase mb-1">Clientes</div>
              <div className="text-4xl font-black text-white">{adminStats.clientes_ativos}</div>
            </div>
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800">
              <div className="text-emerald-400 text-sm font-bold uppercase mb-1">Faturamento</div>
              <div className="text-4xl font-black text-emerald-400">R$ {adminStats.faturamento.toFixed(2)}</div>
            </div>
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800">
              <div className="text-slate-400 text-sm font-bold uppercase mb-1">Status</div>
              <div className="text-xl font-bold text-emerald-400 flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span> ONLINE</div>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-400"/> Feed Real</h3>
            <div className="space-y-4">
              {adminStats.atividades && adminStats.atividades.length > 0 ? (
                adminStats.atividades.map((log, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-800 pb-3 last:border-0">
                    <div>
                      <p className="font-bold text-slate-200">{log.u}</p>
                      <p className="text-xs text-slate-500">{log.a}</p>
                    </div>
                    <span className="text-xs text-slate-600">{log.t}</span>
                  </div>
                ))
              ) : <p className="text-slate-600 italic">Aguardando atividades...</p>}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return null;
}

export default App;

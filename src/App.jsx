import { useState, useEffect } from 'react'
import { FileText, CreditCard, QrCode, Download, Loader2, ShieldCheck, LogOut, Activity, BarChart3, Users, DollarSign, ArrowRight } from 'lucide-react'
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
  const [adminStats, setAdminStats] = useState({ total_xmls: 0, faturamento: 0, clientes_ativos: 0 })
  const [progress, setProgress] = useState({ ativo: false, processados: 0, total: 0 })

  const validKeys = keys.split('\n').map(k => k.trim()).filter(k => k.length === 44)
  const total = validKeys.length
  const totalPrice = (total * 0.15).toFixed(2)

  useEffect(() => {
    onAuthStateChanged(auth, (user) => { if (user) { setUsuario(user); setView('customer'); } });
  }, []);

  useEffect(() => {
    if (isAdmin && view === 'admin') {
      fetch(`${API_URL}/api/admin/stats`).then(r => r.json()).then(data => setAdminStats(data));
    }
  }, [isAdmin, view]);

  const handlePagamentoPix = async () => {
    if (total === 0) return alert("Cole as chaves primeiro!");
    setLoading(true); setQrBase64('');
    try {
      const res = await fetch(`${API_URL}/api/pagar-pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade: total, email: usuario?.email || 'anonimo@taxxml.com' })
      });
      const data = await res.json();
      if (data.qr_code_base64) setQrBase64(data.qr_code_base64);
      else alert("Erro ao gerar PIX");
    } catch (e) { alert("Erro de conexão"); }
    setLoading(false);
  }

  // --- COMPONENTES DE TELA ---
  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md text-center border">
          <img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" className="w-48 mx-auto mb-8" />
          <button onClick={() => loginComGoogle()} className="w-full py-4 border-2 rounded-xl font-bold flex justify-center items-center gap-3 hover:bg-slate-50 transition">
            <img src="https://img.icons8.com/color/24/google-logo.png" /> Entrar com Google
          </button>
          <button onClick={() => { const s = prompt("Senha:"); if(s==="123456Mat"){setIsAdmin(true); setView('admin');} }} className="mt-8 text-slate-200"><ShieldCheck/></button>
        </div>
      </div>
    )
  }

  if (view === 'customer') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border">
            <h1 className="text-2xl font-black text-slate-800 italic">TAX XML PRO</h1>
            <div className="flex gap-4">
               {isAdmin && <button onClick={() => setView('admin')} className="text-sky-600 font-bold">Admin</button>}
               <button onClick={() => { sairDaConta(); setView('login'); }} className="text-red-500 font-bold">Sair</button>
            </div>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText className="text-sky-500"/> Chaves (44 dígitos)</h2>
              <textarea className="w-full h-64 p-4 bg-slate-50 border rounded-xl font-mono text-sm" value={keys} onChange={e => setKeys(e.target.value)} placeholder="Uma chave por linha..." />
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border text-center h-fit">
              <h2 className="font-bold text-slate-400 mb-2 uppercase text-xs">Total: {total} notas</h2>
              <div className="text-5xl font-black text-emerald-500 mb-8">R$ {totalPrice}</div>
              {loading ? <Loader2 className="animate-spin mx-auto text-sky-500" size={40}/> : (
                <button onClick={handlePagamentoPix} className="w-full py-5 bg-emerald-500 text-white font-black rounded-2xl shadow-lg flex justify-center items-center gap-2">
                  <QrCode/> PAGAR COM PIX
                </button>
              )}
              {qrBase64 && <div className="mt-6 p-4 border-2 border-emerald-100 rounded-2xl bg-emerald-50"><img src={`data:image/png;base64,${qrBase64}`} className="mx-auto w-44" /><p className="text-xs font-bold text-emerald-600 mt-2">Escaneie o QR Code</p></div>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-300 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
             <h1 className="text-3xl font-black text-white flex items-center gap-3"><BarChart3 className="text-sky-500"/> Painel de Controle</h1>
             <button onClick={() => setView('customer')} className="bg-slate-800 px-6 py-2 rounded-xl font-bold">Voltar</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-2xl">
               <Users className="text-sky-500 mb-4" size={32}/>
               <div className="text-sm font-bold text-slate-400 uppercase">Clientes</div>
               <div className="text-4xl font-black text-white">{adminStats.clientes_ativos}</div>
            </div>
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-2xl">
               <DollarSign className="text-emerald-500 mb-4" size={32}/>
               <div className="text-sm font-bold text-slate-400 uppercase">Faturamento</div>
               <div className="text-4xl font-black text-emerald-400">R$ {adminStats.faturamento.toFixed(2)}</div>
            </div>
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-2xl">
               <Activity className="text-amber-500 mb-4" size={32}/>
               <div className="text-sm font-bold text-slate-400 uppercase">XMLs Processados</div>
               <div className="text-4xl font-black text-white">{adminStats.total_xmls}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
export default App;

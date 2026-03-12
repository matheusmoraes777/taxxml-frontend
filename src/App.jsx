import { useState, useEffect } from 'react'
import { CreditCard, QrCode, Download, Loader2, ShieldCheck, ArrowRight, UserPlus, LogOut } from 'lucide-react'
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
  const [adminStats, setAdminStats] = useState({ total_xmls: 0, faturamento: 0, clientes_ativos: 0 })

  const validKeys = keys.split('\n').map(k => k.trim()).filter(k => k.length === 44)
  const total = validKeys.length
  const totalPrice = (total * 0.15).toFixed(2)

  useEffect(() => {
    onAuthStateChanged(auth, (user) => { if (user) { setUsuario(user); setView('customer'); } });
  }, []);

  const handlePagamento = async (tipo) => {
    if (total === 0) return alert("Cole as chaves primeiro!");
    setLoading(true); setQrBase64(''); setCheckoutUrl('');

    try {
      const res = await fetch(`${API_URL}/api/pagar-${tipo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantidade: total, 
          email: usuario?.email || 'cliente@taxxml.com' 
        })
      });
      const data = await res.json();

      if (data.qr_code_base64) setQrBase64(data.qr_code_base64);
      else if (data.checkout_url) window.open(data.checkout_url, '_blank');
      else alert(data.erro || "Erro no pagamento");
    } catch (e) {
      alert("Servidor Offline ou erro de conexão.");
    }
    setLoading(false);
  }

  // --- TELAS ---
  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
          <img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" className="w-48 mx-auto mb-6" />
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
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto">
          <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm">
            <h1 className="text-2xl font-black text-slate-800 italic">TAX XML PRO</h1>
            <button onClick={() => { sairDaConta(); setView('login'); }} className="text-red-500 font-bold flex items-center gap-2"><LogOut size={18}/> Sair</button>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Download className="text-sky-500"/> 1. Cole as Chaves (44 dígitos)</h2>
              <textarea className="w-full h-64 p-4 bg-slate-50 border rounded-xl font-mono text-sm" value={keys} onChange={e => setKeys(e.target.value)} placeholder="Uma chave por linha..." />
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border text-center h-fit">
              <h2 className="font-bold text-slate-500 mb-2">Total de Notas: {total}</h2>
              <div className="text-4xl font-black text-emerald-500 mb-8">R$ {totalPrice}</div>
              
              {loading ? <Loader2 className="animate-spin mx-auto text-sky-500" size={40}/> : (
                <div className="space-y-3">
                  <button onClick={() => handlePagamento('pix')} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl flex justify-center items-center gap-2"><QrCode/> Pagar com PIX</button>
                  <button onClick={() => handlePagamento('cartao')} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl flex justify-center items-center gap-2"><CreditCard/> Cartão de Crédito</button>
                </div>
              )}

              {qrBase64 && (
                <div className="mt-6 p-4 border-2 border-dashed border-emerald-200 rounded-2xl">
                  <img src={`data:image/png;base64,${qrBase64}`} className="mx-auto w-48 mb-2" />
                  <p className="text-xs font-bold text-emerald-600">Aguardando pagamento...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null;
}

export default App;

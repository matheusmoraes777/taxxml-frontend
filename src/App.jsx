import { useState, useEffect } from 'react'
import { FileText, CreditCard, QrCode, Download, Loader2, Users, BarChart3, ShieldCheck, LogOut, ArrowRight, UserPlus, CheckCircle, FlaskConical, FileArchive, RefreshCw } from 'lucide-react'

// LINK OFICIAL DO SEU SERVIDOR NA NUVEM (RENDER)
const API_URL = 'https://taxxml-api.onrender.com'

function App() {
  const [view, setView] = useState('login')
  const [loading, setLoading] = useState(false)
  const [keys, setKeys] = useState('')
  
  const [qrBase64, setQrBase64] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [payId, setPayId] = useState(null)
  const [rastreio, setRastreio] = useState('')

  const [downloadFinished, setDownloadFinished] = useState(false)

  const [adminStats, setAdminStats] = useState({ total_xmls: 0, faturamento: 0, clientes_ativos: 0 })
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')

  const [progress, setProgress] = useState({ ativo: false, processados: 0, total: 0 })

  const validKeys = keys.split('\n').map(k => k.trim()).filter(k => k.length === 44)
  const total = validKeys.length
  const totalPrice = (total * 0.15).toFixed(2)
  const MAX_CHAVES = 5000 

  const resetarSistema = () => {
    setKeys('')
    setIsPaid(false)
    setQrBase64('')
    setCheckoutUrl('')
    setPayId(null)
    setRastreio('')
    setDownloadFinished(false)
    setProgress({ ativo: false, processados: 0, total: 0 })
  }

  const fazerLogin = async () => {
    if (!email || !senha) return alert("Preencha todos os campos!")
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) })
      const data = await res.json()
      if (data.sucesso) { setView('customer'); setEmail(''); setSenha(''); } else { alert(data.erro) }
    } catch (e) { alert("Erro de conexão.") }
    setLoading(false)
  }

  const criarConta = async () => {
    if (!nome || !email || !senha) return alert("Preencha todos!")
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/registrar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, email, senha }) })
      const data = await res.json()
      if (data.sucesso) { alert("Conta criada!"); setView('login'); setNome(''); setEmail(''); setSenha(''); } else { alert(data.erro) }
    } catch (e) { alert("Erro de conexão.") }
    setLoading(false)
  }

  const acessarAdmin = async () => {
    const s = prompt("Senha Mestre:")
    if (s === "admin123") {
      try {
        const res = await fetch(`${API_URL}/api/admin/stats`)
        setAdminStats(await res.json())
        setView('admin')
      } catch (e) { alert("Erro ao buscar dados.") }
    } else if (s !== null) { alert("Senha incorreta!") }
  }

  const handlePagamento = async (tipo) => {
    if (total === 0 || total > MAX_CHAVES) return alert("Erro na quantidade de chaves.")
    setLoading(true); setQrBase64(''); setCheckoutUrl(''); setIsPaid(false); setDownloadFinished(false);
    const rota = tipo === 'pix' ? '/api/pagar-pix' : '/api/pagar-cartao'
    try {
      const res = await fetch(`${API_URL}${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantidade: total }) })
      const data = await res.json()
      if (data.qr_code_base64) { setQrBase64(data.qr_code_base64); setPayId(data.payment_id); }
      if (data.checkout_url) { setCheckoutUrl(data.checkout_url); setRastreio(data.rastreio); }
    } catch (err) { alert("Erro no servidor.") }
    setLoading(false)
  }

  const verificarPagamento = async (tipo) => {
    setLoading(true);
    try {
      const url = tipo === 'pix' ? `/api/status-pix/${payId}` : `/api/status-cartao/${rastreio}`;
      const res = await fetch(`${API_URL}${url}`);
      const data = await res.json();
      if (data.pago) { setIsPaid(true); } else { alert("Pagamento ainda não detectado."); }
    } catch (e) { alert("Erro de consulta."); }
    setLoading(false);
  };

  const baixarLote = async () => {
    if (total === 0 || total > MAX_CHAVES) return alert("Erro na quantidade de chaves.")
    setProgress({ ativo: true, processados: 0, total: total })
    
    try {
      const resStart = await fetch(`${API_URL}/api/iniciar-download`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chaves: validKeys })
      });
      const { task_id } = await resStart.json();

      const checkInterval = setInterval(async () => {
        const resProg = await fetch(`${API_URL}/api/progresso/${task_id}`);
        const dataProg = await resProg.json();
        
        setProgress({ ativo: true, processados: dataProg.processados, total: dataProg.total });

        if (dataProg.concluido) {
          clearInterval(checkInterval); 
          window.location.href = `${API_URL}/api/baixar-zip/${task_id}`;
          
          setTimeout(() => {
            setProgress({ ativo: false, processados: 0, total: 0 });
            setDownloadFinished(true); 
          }, 2000);
        }
      }, 2000); 

    } catch (e) { 
      alert("Erro ao iniciar download."); 
      setProgress({ ativo: false, processados: 0, total: 0 });
    }
  };

  // --- TELAS ---
  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border">
          <div className="flex justify-center mb-4">
            {/* LOGO LINKADA DIRETO DA NUVEM IMGBB */}
            <img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" alt="Tax XML Logo" className="w-48 object-contain" onError={(e) => { e.target.style.display='none' }} />
          </div>
          <h2 className="text-2xl font-black text-center text-slate-800 mb-1">Tax XML</h2>
          <p className="text-sky-500 text-center mb-8 font-bold">Seu XML em Minutos</p>
          
          <div className="space-y-4">
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500" />
            <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500" />
            <button onClick={fazerLogin} disabled={loading} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4"/></>}
            </button>
            <div className="flex justify-between items-center text-sm font-semibold pt-4 border-t mt-4">
              <button onClick={() => setView('register')} className="text-sky-600">Criar Conta</button>
              <button onClick={acessarAdmin} className="text-slate-400 hover:text-red-500 flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> Admin</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border">
           <div className="flex justify-center mb-4">
            {/* LOGO LINKADA DIRETO DA NUVEM IMGBB */}
            <img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" alt="Tax XML Logo" className="w-32 object-contain" onError={(e) => { e.target.style.display='none' }}/>
          </div>
          <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Criar Conta</h2>
          <p className="text-slate-500 text-center mb-8">Junte-se ao Tax XML</p>
          <div className="space-y-4">
            <input type="text" placeholder="Nome / Empresa" value={nome} onChange={e => setNome(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
            <input type="email" placeholder="E-mail Profissional" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
            <input type="password" placeholder="Crie uma Senha" value={senha} onChange={e => setSenha(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
            <button onClick={criarConta} disabled={loading} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 flex justify-center items-center gap-2 mt-4">
              {loading ? <Loader2 className="animate-spin" /> : <><UserPlus className="w-5 h-5"/> Finalizar Cadastro</>}
            </button>
            <div className="text-center mt-4"><button onClick={() => setView('login')} className="text-sm font-bold text-slate-500">Voltar para Login</button></div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'customer') {
    const porcentagem = progress.total > 0 ? Math.round((progress.processados / progress.total) * 100) : 0;

    return (
      <div className="min-h-screen bg-slate-50 p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border">
            <h1 className="text-2xl font-black flex items-center gap-3 text-slate-800">
              {/* LOGO LINKADA DIRETO DA NUVEM IMGBB */}
              <img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" alt="Tax XML Logo" className="w-10 h-10 object-contain" onError={(e) => { e.target.style.display='none' }}/> 
              Tax XML
            </h1>
            <button onClick={() => setView('login')} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold flex items-center gap-2"><LogOut className="w-4 h-4"/> Sair</button>
          </header>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800"><Download className="text-sky-500"/> 1. Entrada de Lote</h2>
              <textarea 
                className={`w-full h-72 p-5 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ${total > MAX_CHAVES ? 'border-red-500 focus:ring-red-500' : 'focus:ring-sky-500'} font-mono text-sm`} 
                placeholder="Cole as chaves..." 
                value={keys} onChange={e => setKeys(e.target.value)} disabled={isPaid || progress.ativo || downloadFinished} 
              />
              <div className={`mt-4 p-4 rounded-xl font-bold flex justify-between ${total > MAX_CHAVES ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-sky-50 text-sky-700'}`}>
                <span>{total} chaves identificadas</span>
                {total > MAX_CHAVES && <span className="text-red-500">Limite excedido ({MAX_CHAVES})</span>}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border h-fit">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800"><CreditCard className="text-emerald-500"/> 2. Checkout</h2>
              
              {downloadFinished ? (
                <div className="text-center space-y-6">
                  <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl flex flex-col items-center gap-3 border border-emerald-200 shadow-sm">
                    <CheckCircle className="w-16 h-16 text-emerald-500" />
                    <h3 className="text-xl font-black">Download Concluído!</h3>
                    <p className="text-sm font-medium">Seu arquivo ZIP foi baixado com sucesso.</p>
                  </div>
                  <button onClick={resetarSistema} className="w-full py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 shadow-sm flex justify-center items-center gap-2 transition-all">
                    <RefreshCw className="w-5 h-5"/> Limpar e Começar Novo Lote
                  </button>
                </div>

              ) : progress.ativo ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-2"><FileArchive className="w-5 h-5 text-sky-500 animate-pulse"/> Baixando XMLs...</span>
                    <span className="text-2xl font-black text-sky-500">{porcentagem}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner border border-slate-200">
                    <div className="bg-sky-500 h-4 rounded-full transition-all duration-500 ease-out" style={{ width: `${porcentagem}%` }}></div>
                  </div>
                  <p className="text-center text-sm font-semibold text-slate-500 mt-2">Processando {progress.processados} de {progress.total} notas...</p>
                </div>

              ) : isPaid ? (
                <div className="text-center space-y-4">
                  <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl font-bold flex justify-center items-center gap-2"><CheckCircle /> Pagamento Aprovado!</div>
                  <button onClick={baixarLote} className="w-full py-4 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-md flex justify-center items-center gap-2">
                     Baixar Lote ZIP Agora
                  </button>
                </div>

              ) : qrBase64 ? (
                <div className="text-center space-y-4">
                  <img src={`data:image/png;base64,${qrBase64}`} className="mx-auto rounded-xl border p-2" />
                  <button onClick={() => verificarPagamento('pix')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 flex justify-center">
                    {loading ? <Loader2 className="animate-spin" /> : "🔄 Já paguei o PIX"}
                  </button>
                </div>

              ) : checkoutUrl ? (
                <div className="text-center space-y-4">
                  <a href={checkoutUrl} target="_blank" className="block py-4 text-center rounded-xl font-bold text-white bg-sky-500 shadow-md">💳 Abrir Mercado Pago</a>
                  <button onClick={() => verificarPagamento('cartao')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 flex justify-center">
                    {loading ? <Loader2 className="animate-spin" /> : "🔄 Já paguei no Cartão"}
                  </button>
                </div>

              ) : (
                <div className="space-y-4">
                  <div className="text-3xl font-black text-emerald-500 mb-6 text-center">R$ {totalPrice}</div>
                  <button onClick={() => handlePagamento('pix')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 flex justify-center"><QrCode className="inline mr-2"/> PIX</button>
                  <button onClick={() => handlePagamento('card')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 flex justify-center"><CreditCard className="inline mr-2"/> Cartão</button>
                  <div className="pt-4 mt-4 border-t border-slate-200">
                    <button onClick={baixarLote} className="w-full py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex justify-center">
                      <FlaskConical className="inline mr-2"/> 🧪 Testar Download Direto
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 p-8 text-white font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-12 bg-white/5 p-6 rounded-2xl border border-white/10">
            <h1 className="text-2xl font-black flex items-center gap-3"><ShieldCheck className="text-sky-400"/> Admin Tax XML</h1>
            <button onClick={() => setView('login')} className="bg-white/10 px-4 py-2 rounded-xl font-bold flex items-center gap-2"><LogOut className="w-4 h-4"/> Sair</button>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl"><div className="text-sky-400 font-bold mb-2 uppercase text-sm">Contas Criadas</div><div className="text-5xl font-black">{adminStats.clientes_ativos}</div></div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl"><div className="text-emerald-400 font-bold mb-2 uppercase text-sm">Faturamento Real</div><div className="text-5xl font-black text-emerald-400">R$ {adminStats.faturamento.toFixed(2)}</div></div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl"><div className="text-slate-300 font-bold mb-2 uppercase text-sm">XMLs Processados</div><div className="text-5xl font-black">{adminStats.total_xmls}</div></div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default App

import { useState, useEffect } from 'react'
import { FileText, CreditCard, QrCode, Download, Loader2, Users, BarChart3, ShieldCheck, LogOut, ArrowRight, UserPlus, CheckCircle, FlaskConical, FileArchive } from 'lucide-react'

function App() {
  const [view, setView] = useState('login')
  const [loading, setLoading] = useState(false)
  const [keys, setKeys] = useState('')
  
  const [qrBase64, setQrBase64] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [payId, setPayId] = useState(null)
  const [rastreio, setRastreio] = useState('')

  const [adminStats, setAdminStats] = useState({ total_xmls: 0, faturamento: 0, clientes_ativos: 0 })
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')

  // ESTADO DA BARRA DE PROGRESSO
  const [progress, setProgress] = useState({ ativo: false, processados: 0, total: 0 })

  const validKeys = keys.split('\n').map(k => k.trim()).filter(k => k.length === 44)
  const total = validKeys.length
  const totalPrice = (total * 0.15).toFixed(2)
  const MAX_CHAVES = 5000 // Aumentei para o seu teste de 4.157 chaves!

  // (FUNÇÕES DE LOGIN E ADMIN MANTIDAS IGUAIS)
  const fazerLogin = async () => {
    if (!email || !senha) return alert("Preencha todos os campos!")
    setLoading(true)
    try {
      const res = await fetch('https://taxxml-api.onrender.com/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) })
      const data = await res.json()
      if (data.sucesso) { setView('customer'); setEmail(''); setSenha(''); } else { alert(data.erro) }
    } catch (e) { alert("Erro de conexão.") }
    setLoading(false)
  }

  const criarConta = async () => {
    if (!nome || !email || !senha) return alert("Preencha todos!")
    setLoading(true)
    try {
      const res = await fetch('https://taxxml-api.onrender.com/api/registrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, email, senha }) })
      const data = await res.json()
      if (data.sucesso) { alert("Conta criada!"); setView('login'); setNome(''); setEmail(''); setSenha(''); } else { alert(data.erro) }
    } catch (e) { alert("Erro de conexão.") }
    setLoading(false)
  }

  const acessarAdmin = async () => {
    const s = prompt("Senha Mestre:")
    if (s === "admin123") {
      try {
        const res = await fetch('https://taxxml-api.onrender.com/api/admin/stats')
        setAdminStats(await res.json())
        setView('admin')
      } catch (e) { alert("Erro ao buscar dados.") }
    } else if (s !== null) { alert("Senha incorreta!") }
  }

  const handlePagamento = async (tipo) => {
    if (total === 0 || total > MAX_CHAVES) return alert("Erro na quantidade de chaves.")
    setLoading(true); setQrBase64(''); setCheckoutUrl(''); setIsPaid(false);
    const rota = tipo === 'pix' ? '/api/pagar-pix' : '/api/pagar-cartao'
    try {
      const res = await fetch(`https://taxxml-api.onrender.com${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantidade: total }) })
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
      const res = await fetch(`https://taxxml-api.onrender.com${url}`);
      const data = await res.json();
      if (data.pago) { setIsPaid(true); } else { alert("Pagamento ainda não detectado."); }
    } catch (e) { alert("Erro de consulta."); }
    setLoading(false);
  };

  // ==========================================
  // O NOVO DOWNLOAD COM BARRA DE PROGRESSO
  // ==========================================
  const baixarLote = async () => {
    if (total === 0 || total > MAX_CHAVES) return alert("Erro na quantidade de chaves.")

    setProgress({ ativo: true, processados: 0, total: total })
    
    try {
      // 1. Avisa o Python para começar e pega a "senha da fila" (task_id)
      const resStart = await fetch('https://taxxml-api.onrender.com/api/iniciar-download', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chaves: validKeys })
      });
      const { task_id } = await resStart.json();

      // 2. Fica perguntando de 2 em 2 segundos como está o progresso
      const checkInterval = setInterval(async () => {
        const resProg = await fetch(`https://taxxml-api.onrender.com/api/progresso/${task_id}`);
        const dataProg = await resProg.json();
        
        // Atualiza a barra na tela
        setProgress({ ativo: true, processados: dataProg.processados, total: dataProg.total });

        // 3. Quando o Python avisa que terminou...
        if (dataProg.concluido) {
          clearInterval(checkInterval); // Para de perguntar
          
          // Baixa o ZIP físico
          window.location.href = `https://taxxml-api.onrender.com/api/baixar-zip/${task_id}`;
          
          // Reseta a tela
          setTimeout(() => {
            setProgress({ ativo: false, processados: 0, total: 0 });
            setIsPaid(false); setQrBase64(''); setCheckoutUrl('');
          }, 3000);
        }
      }, 2000); // 2000ms = 2 segundos

    } catch (e) { 
      alert("Erro ao iniciar download."); 
      setProgress({ ativo: false, processados: 0, total: 0 });
    }
  };

  // (TELAS LOGIN, REGISTRO, ADMIN MANTIDAS...)
  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border">
          <div className="flex justify-center mb-6"><div className="bg-blue-600 p-3 rounded-2xl shadow-lg"><FileText className="text-white w-8 h-8" /></div></div>
          <h2 className="text-2xl font-black text-center text-slate-800 mb-8">Tax XML Pro</h2>
          <div className="space-y-4">
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={fazerLogin} disabled={loading} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4"/></>}
            </button>
            <div className="flex justify-between items-center text-sm font-semibold pt-4 border-t mt-4">
              <button onClick={() => setView('register')} className="text-blue-600">Criar Conta</button>
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
          <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Criar Conta</h2>
          <p className="text-slate-500 text-center mb-8">Junte-se ao sistema</p>
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
    // Calculo da porcentagem da barra
    const porcentagem = progress.total > 0 ? Math.round((progress.processados / progress.total) * 100) : 0;

    return (
      <div className="min-h-screen bg-slate-50 p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border">
            <h1 className="text-2xl font-black flex items-center gap-2"><FileText className="text-blue-600"/> Painel do Cliente</h1>
            <button onClick={() => setView('login')} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold flex items-center gap-2"><LogOut className="w-4 h-4"/> Sair</button>
          </header>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Download className="text-blue-600"/> 1. Entrada de Lote</h2>
              <textarea 
                className={`w-full h-72 p-5 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ${total > MAX_CHAVES ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'} font-mono text-sm`} 
                placeholder="Cole as chaves..." 
                value={keys} onChange={e => setKeys(e.target.value)} disabled={isPaid || progress.ativo} 
              />
              <div className={`mt-4 p-4 rounded-xl font-bold flex justify-between ${total > MAX_CHAVES ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700'}`}>
                <span>{total} chaves identificadas</span>
                {total > MAX_CHAVES && <span className="text-red-500">Limite excedido ({MAX_CHAVES})</span>}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border h-fit">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><CreditCard className="text-emerald-600"/> 2. Checkout</h2>
              
              {/* O NOVO PAINEL DE PROGRESSO VISUAL */}
              {progress.ativo ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-2"><FileArchive className="w-5 h-5 text-blue-600 animate-pulse"/> Baixando XMLs...</span>
                    <span className="text-2xl font-black text-blue-600">{porcentagem}%</span>
                  </div>
                  
                  {/* A Barra de Progresso Verde/Azul */}
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner border border-slate-200">
                    <div className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out" style={{ width: `${porcentagem}%` }}></div>
                  </div>
                  
                  <p className="text-center text-sm font-semibold text-slate-500 mt-2">
                    Processando {progress.processados} de {progress.total} notas...
                  </p>
                  <p className="text-center text-xs text-slate-400 mt-1 italic">
                    Não feche esta página até o download começar.
                  </p>
                </div>

              ) : isPaid ? (
                <div className="text-center space-y-4">
                  <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl font-bold flex justify-center items-center gap-2"><CheckCircle /> Pagamento Aprovado!</div>
                  <button onClick={baixarLote} className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex justify-center items-center gap-2">
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
                  <a href={checkoutUrl} target="_blank" className="block py-4 text-center rounded-xl font-bold text-white bg-blue-600 shadow-md">💳 Abrir Mercado Pago</a>
                  <button onClick={() => verificarPagamento('cartao')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 flex justify-center">
                    {loading ? <Loader2 className="animate-spin" /> : "🔄 Já paguei no Cartão"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-3xl font-black text-emerald-600 mb-6 text-center">R$ {totalPrice}</div>
                  <button onClick={() => handlePagamento('pix')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 flex justify-center"><QrCode className="inline mr-2"/> PIX</button>
                  <button onClick={() => handlePagamento('card')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 flex justify-center"><CreditCard className="inline mr-2"/> Cartão</button>
                  <div className="pt-4 mt-4 border-t border-slate-200">
                    <button onClick={baixarLote} className="w-full py-4 rounded-xl font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 flex justify-center">
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

  // (TELA ADMIN MANTIDA...)
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 p-8 text-white font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-12 bg-white/5 p-6 rounded-2xl border border-white/10">
            <h1 className="text-2xl font-black flex items-center gap-3"><ShieldCheck className="text-red-500"/> Painel Admin</h1>
            <button onClick={() => setView('login')} className="bg-white/10 px-4 py-2 rounded-xl font-bold flex items-center gap-2"><LogOut className="w-4 h-4"/> Sair</button>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl"><div className="text-blue-400 font-bold mb-2 uppercase text-sm">Contas Criadas</div><div className="text-5xl font-black">{adminStats.clientes_ativos}</div></div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl"><div className="text-emerald-400 font-bold mb-2 uppercase text-sm">Faturamento Real</div><div className="text-5xl font-black text-emerald-400">R$ {adminStats.faturamento.toFixed(2)}</div></div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl"><div className="text-purple-400 font-bold mb-2 uppercase text-sm">XMLs Processados</div><div className="text-5xl font-black">{adminStats.total_xmls}</div></div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default App
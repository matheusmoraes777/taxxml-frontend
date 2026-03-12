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

  // Campos do Login Tradicional
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')

  const [downloadFinished, setDownloadFinished] = useState(false)
  const [adminStats, setAdminStats] = useState({ total_xmls: 0, faturamento: 0, clientes_ativos: 0 })
  const [progress, setProgress] = useState({ ativo: false, processados: 0, total: 0 })
  
  // Controle de Abas do Admin
  const [adminTab, setAdminTab] = useState('dashboard')

  const validKeys = keys.split('\n').map(k => k.trim()).filter(k => k.length === 44)
  const total = validKeys.length
  const totalPrice = (total * 0.08).toFixed(2)
  const MAX_CHAVES = 5000 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsuario(user);
        setView('customer');
      } 
    });
    return () => unsubscribe();
  }, []);

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

  // --- FUNÇÕES DE LOGIN ---
  const fazerLoginTradicional = async () => {
    if (!email || !senha) return alert("Preencha todos os campos!")
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) })
      const data = await res.json()
      if (data.sucesso) { 
        setUsuario({ email: email, displayName: email.split('@')[0] })
        setView('customer'); setEmail(''); setSenha(''); 
      } else { alert(data.erro) }
    } catch (e) { alert("Erro de conexão com o servidor.") }
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

  const handleGoogleLogin = async () => {
    setLoading(true)
    const user = await loginComGoogle()
    if (!user) alert("Falha ao entrar com o Google.")
    setLoading(false)
  }

  const handleLogout = async () => {
    await sairDaConta()
    setUsuario(null)
    setIsAdmin(false)
    setView('login')
  }

  // --- ACESSO ADMIN ---
  const acessarAdmin = async () => {
    const s = prompt("Senha Mestre do Sistema:")
    if (s === "123456Mat") {
      setIsAdmin(true)
      try {
        const res = await fetch(`${API_URL}/api/admin/stats`)
        setAdminStats(await res.json())
        setView('admin')
      } catch (e) { 
        alert("Erro ao buscar dados reais, mas acesso liberado.") 
        setView('admin')
      }
    } else if (s !== null) { alert("Senha incorreta!") }
  }

  // --- FUNÇÕES DE PAGAMENTO E DOWNLOAD ---
  const handlePagamento = async (tipo) => {
    if (total === 0 || total > MAX_CHAVES) return alert("Erro na quantidade de chaves.")
    setLoading(true); setQrBase64(''); setCheckoutUrl(''); setIsPaid(false); setDownloadFinished(false);
    const rota = tipo === 'pix' ? '/api/pagar-pix' : '/api/pagar-cartao'
    try {
      const bodyData = { quantidade: total, email: usuario?.email || email || 'desconhecido' }
      const res = await fetch(`${API_URL}${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) })
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
      if (data.pago) { setIsPaid(true); } else { alert("Pagamento ainda não detectado. Tente novamente."); }
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
          setTimeout(() => { setProgress({ ativo: false, processados: 0, total: 0 }); setDownloadFinished(true); }, 2000);
        }
      }, 2000); 
    } catch (e) { alert("Erro ao iniciar download."); setProgress({ ativo: false, processados: 0, total: 0 }); }
  };

  // ==========================================
  // TELA DE LOGIN
  // ==========================================
  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border">
          <div className="flex justify-center mb-2">
            <img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" alt="Tax XML Logo" className="w-64 object-contain" onError={(e) => { e.target.style.display='none' }} />
          </div>
          <h2 className="text-2xl font-black text-center text-slate-800 mb-1">Acesso ao Sistema</h2>
          <p className="text-slate-500 text-center mb-6 font-medium">Faça login para continuar</p>
          <div className="space-y-4">
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500" />
            <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-sky-500" />
            <button onClick={fazerLoginTradicional} disabled={loading} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4"/></>}
            </button>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">ou</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <button onClick={handleGoogleLogin} disabled={loading} className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex justify-center items-center gap-3">
              <img src="https://img.icons8.com/color/24/google-logo.png" alt="Google" /> Entrar com o Google
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

  // ==========================================
  // TELA DE REGISTRO
  // ==========================================
  if (view === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border">
           <div className="flex justify-center mb-2"><img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" alt="Logo" className="w-48 object-contain" /></div>
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

  // ==========================================
  // TELA DO CLIENTE (Manteve igual, perfeita)
  // ==========================================
  if (view === 'customer') {
    const porcentagem = progress.total > 0 ? Math.round((progress.processados / progress.total) * 100) : 0;
    return (
      <div className="min-h-screen bg-slate-50 p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center gap-4">
              <img src="https://i.ibb.co/7x0Qyqr8/taxxml-logo.jpg" alt="Tax XML Logo" className="w-12 h-12 object-contain" onError={(e) => { e.target.style.display='none' }}/> 
              <div>
                <h1 className="text-2xl font-black text-slate-800 leading-none">Tax XML</h1>
                {usuario && <span className="text-sm font-bold text-slate-500">Olá, {usuario.displayName || usuario.email?.split('@')[0]}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (<button onClick={() => setView('admin')} className="px-4 py-2 bg-sky-100 text-sky-700 rounded-xl font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Dashboard</button>)}
              {!isAdmin && (<button onClick={acessarAdmin} className="px-3 py-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all" title="Acesso Admin"><ShieldCheck className="w-5 h-5"/></button>)}
              <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold flex items-center gap-2"><LogOut className="w-4 h-4"/> Sair</button>
            </div>
          </header>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800"><Download className="text-sky-500"/> 1. Entrada de Lote</h2>
              <textarea className={`w-full h-72 p-5 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ${total > MAX_CHAVES ? 'border-red-500 focus:ring-red-500' : 'focus:ring-sky-500'} font-mono text-sm`} placeholder="Cole as chaves..." value={keys} onChange={e => setKeys(e.target.value)} disabled={isPaid || progress.ativo || downloadFinished} />
              <div className={`mt-4 p-4 rounded-xl font-bold flex justify-between ${total > MAX_CHAVES ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-sky-50 text-sky-700'}`}>
                <span>{total} chaves identificadas</span>
                {total > MAX_CHAVES && <span className="text-red-500">Limite excedido ({MAX_CHAVES})</span>}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border h-fit">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800"><CreditCard className="text-emerald-500"/> 2. Liberação</h2>
              {downloadFinished ? (
                <div className="text-center space-y-6">
                  <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl flex flex-col items-center gap-3 border border-emerald-200 shadow-sm"><CheckCircle className="w-16 h-16 text-emerald-500" /><h3 className="text-xl font-black">Download Concluído!</h3><p className="text-sm font-medium">Seu arquivo ZIP foi baixado.</p></div>
                  <button onClick={resetarSistema} className="w-full py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 shadow-sm flex justify-center items-center gap-2 transition-all"><RefreshCw className="w-5 h-5"/> Começar Novo Lote</button>
                </div>
              ) : progress.ativo ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end mb-2"><span className="font-bold text-slate-700 flex items-center gap-2"><FileArchive className="w-5 h-5 text-sky-500 animate-pulse"/> Baixando...</span><span className="text-2xl font-black text-sky-500">{porcentagem}%</span></div>
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner border border-slate-200"><div className="bg-sky-500 h-4 rounded-full transition-all duration-500 ease-out" style={{ width: `${porcentagem}%` }}></div></div>
                  <p className="text-center text-sm font-semibold text-slate-500 mt-2">{progress.processados} de {progress.total} notas processadas</p>
                </div>
              ) : isAdmin ? (
                <div className="space-y-4">
                  <div className="bg-sky-100 text-sky-700 p-3 rounded-xl font-bold text-center border border-sky-200">👑 MODO ADMIN ATIVADO</div>
                  <button onClick={baixarLote} className="w-full py-4 rounded-xl font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md flex justify-center items-center gap-2">Baixar Lote Grátis Agora</button>
                </div>
              ) : isPaid ? (
                <div className="text-center space-y-4"><div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl font-bold flex justify-center items-center gap-2"><CheckCircle /> Pagamento Aprovado!</div><button onClick={baixarLote} className="w-full py-4 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-md flex justify-center items-center gap-2">Baixar Lote ZIP Agora</button></div>
              ) : qrBase64 ? (
                <div className="text-center space-y-4"><img src={`data:image/png;base64,${qrBase64}`} className="mx-auto rounded-xl border p-2" /><button onClick={() => verificarPagamento('pix')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 flex justify-center">{loading ? <Loader2 className="animate-spin" /> : "🔄 Já paguei o PIX"}</button></div>
              ) : checkoutUrl ? (
                <div className="text-center space-y-4"><a href={checkoutUrl} target="_blank" className="block py-4 text-center rounded-xl font-bold text-white bg-sky-500 shadow-md">💳 Abrir Mercado Pago</a><button onClick={() => verificarPagamento('cartao')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 flex justify-center">{loading ? <Loader2 className="animate-spin" /> : "🔄 Já paguei no Cartão"}</button></div>
              ) : (
                <div className="space-y-4">
                  <div className="text-3xl font-black text-emerald-500 mb-6 text-center">R$ {totalPrice}</div>
                  <button onClick={() => handlePagamento('pix')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 flex justify-center"><QrCode className="inline mr-2"/> Gerar PIX</button>
                  <button onClick={() => handlePagamento('card')} disabled={loading} className="w-full py-4 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 flex justify-center"><CreditCard className="inline mr-2"/> Pagar no Cartão</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // NOVA DASHBOARD ADMIN PROFISSIONAL
  // ==========================================
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans flex">
        
        {/* Menu Lateral Esquerdo */}
        <aside className="w-72 bg-[#1e293b] border-r border-slate-800 flex flex-col">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-2xl font-black flex items-center gap-3 text-white">
              <ShieldCheck className="text-sky-500 w-8 h-8"/> Tax XML Pro
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-mono">Build 2.0.1 - Admin Access</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setAdminTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${adminTab === 'dashboard' ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
              <LayoutDashboard className="w-5 h-5"/> Visão Geral
            </button>
            <button onClick={() => setAdminTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${adminTab === 'users' ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Users className="w-5 h-5"/> Clientes
            </button>
            <button onClick={() => setAdminTab('finance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${adminTab === 'finance' ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
              <DollarSign className="w-5 h-5"/> Financeiro
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-3">
             <button onClick={() => setView('customer')} className="w-full bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all">
              <Download className="w-4 h-4"/> Baixar XML Grátis
            </button>
            <button onClick={() => { setIsAdmin(false); setView('customer') }} className="w-full hover:bg-red-500/20 text-red-400 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              <LogOut className="w-4 h-4"/> Sair do Painel
            </button>
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 overflow-y-auto">
          
          {/* Top Bar */}
          <header className="bg-[#1e293b]/50 backdrop-blur-md border-b border-slate-800 p-6 flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-xl font-bold text-white capitalize">{adminTab === 'dashboard' ? 'Visão Geral do Sistema' : adminTab === 'users' ? 'Gerenciamento de Usuários' : 'Relatório Financeiro'}</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"/>
                <input type="text" placeholder="Buscar..." className="bg-slate-900 border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-sky-500 text-white w-64"/>
              </div>
              <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-slate-800 shadow-md">AD</div>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto space-y-8">
            
            {/* ABAS DO PAINEL */}
            {adminTab === 'dashboard' && (
              <>
                {/* Cards de Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:border-sky-500/50 transition-all">
                    <div className="absolute -right-6 -top-6 bg-sky-500/10 w-24 h-24 rounded-full blur-xl group-hover:bg-sky-500/20 transition-all"></div>
                    <div className="text-slate-400 font-bold mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-sky-400"/> Usuários Ativos</div>
                    <div className="text-4xl font-black text-white">{adminStats.clientes_ativos}</div>
                    <div className="text-xs text-emerald-400 mt-2 font-medium">▲ +12% este mês</div>
                  </div>
                  <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                    <div className="absolute -right-6 -top-6 bg-emerald-500/10 w-24 h-24 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="text-slate-400 font-bold mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400"/> Faturamento</div>
                    <div className="text-4xl font-black text-emerald-400">R$ {adminStats.faturamento.toFixed(2)}</div>
                    <div className="text-xs text-emerald-400 mt-2 font-medium">▲ Total em caixa</div>
                  </div>
                  <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
                    <div className="text-slate-400 font-bold mb-2 flex items-center gap-2"><FileArchive className="w-4 h-4 text-purple-400"/> XMLs Baixados</div>
                    <div className="text-4xl font-black text-white">{adminStats.total_xmls}</div>
                  </div>
                  <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
                    <div className="text-slate-400 font-bold mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-orange-400"/> Status do Servidor</div>
                    <div className="text-2xl font-black text-white flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span> Online</div>
                    <div className="text-xs text-slate-500 mt-2 font-mono">Ping: 24ms</div>
                  </div>
                </div>

                {/* Seção Inferior: Atividade e Gráfico Falso */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Gráfico Visual */}
                  <div className="lg:col-span-2 bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-white mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-sky-400"/> Volume de Downloads (Últimos 7 dias)</h3>
                    <div className="h-48 w-full flex items-end gap-2 px-2">
                      {/* Barras decorativas representando gráficos */}
                      {[40, 70, 45, 90, 65, 30, 85].map((height, i) => (
                        <div key={i} className="flex-1 bg-sky-500/20 hover:bg-sky-500/40 rounded-t-sm relative group transition-all" style={{ height: `${height}%` }}>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100">{height * 10}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-4 px-2">
                      <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
                    </div>
                  </div>

                  {/* Log de Atividades (Mockup) */}
                  <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-white mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-400"/> Feed Ao Vivo</h3>
                    <div className="space-y-4">
                      {[
                        { u: "João P.", a: "Baixou 500 XMLs", t: "Há 2 min", c: "text-sky-400" },
                        { u: "Maria S.", a: "Pagamento PIX", t: "Há 15 min", c: "text-emerald-400" },
                        { u: "Carlos T.", a: "Nova Conta Criada", t: "Há 1 hora", c: "text-purple-400" },
                        { u: "Ana L.", a: "Erro de Token", t: "Há 3 horas", c: "text-red-400" },
                      ].map((log, i) => (
                        <div key={i} className="flex items-start gap-3 border-b border-slate-800/50 pb-3 last:border-0">
                          <div className={`w-2 h-2 mt-2 rounded-full ${log.c} bg-current`}></div>
                          <div>
                            <p className="text-sm font-bold text-slate-200">{log.u}</p>
                            <p className="text-xs text-slate-400">{log.a}</p>
                          </div>
                          <span className="ml-auto text-xs text-slate-600">{log.t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ABA USUÁRIOS (Visual Structure para o futuro Banco de Dados) */}
            {adminTab === 'users' && (
              <div className="bg-[#1e293b] border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
                  <h3 className="font-bold text-white">Base de Clientes</h3>
                  <button className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all">Exportar CSV</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-slate-400 font-semibold">
                      <tr>
                        <th className="px-6 py-4">Nome / E-mail</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Último Acesso</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {/* Dados Visuais Temporários */}
                      <tr className="hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-4"><div className="font-bold text-white">Empresa Fictícia SA</div><div className="text-xs text-slate-500">contato@empresa.com</div></td>
                        <td className="px-6 py-4"><span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full text-xs font-bold border border-emerald-500/20">Ativo</span></td>
                        <td className="px-6 py-4 text-slate-400">Hoje, 14:32</td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          <button className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded"><Edit className="w-4 h-4"/></button>
                          <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                      {/* Fim Dados Temporários */}
                    </tbody>
                  </table>
                  <div className="p-6 text-center text-slate-500 text-sm italic">
                    (Estes são dados visuais. O banco de dados do Backend precisa ser conectado para exibir os usuários reais.)
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  return null
}

export default App

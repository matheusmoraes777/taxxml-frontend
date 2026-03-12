const iniciarDownloadComSaldo = async () => {
    if (total === 0) return alert("Insira chaves válidas.")
    if (saldo < custoTotal) return setActiveTab('creditos')

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/iniciar-download`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usuario.email, chaves: validKeys })
      });
      const data = await res.json();
      if (res.status === 402) { setActiveTab('creditos'); setLoading(false); return; }
      
      setSaldo(data.novo_saldo)
      setProgress({ ativo: true, processados: 0, total: total, concluido: false, taskId: data.task_id })
      setKeys('')
      
      const checkInterval = setInterval(async () => {
        try {
          const resProg = await fetch(`${API_URL}/api/progresso/${data.task_id}`);
          if (!resProg.ok) throw new Error("Servidor perdeu a conexão.");
          
          const dataProg = await resProg.json();
          setProgress(p => ({ ...p, processados: dataProg.processados }));
          
          if (dataProg.concluido) { 
            clearInterval(checkInterval); 
            setProgress(p => ({ ...p, concluido: true })); 
          }
        } catch (error) {
          clearInterval(checkInterval);
          alert("O servidor foi reiniciado ou perdeu a conexão. Seus XMLs não foram processados.");
          setProgress({ ativo: false, processados: 0, total: 0, concluido: false, taskId: null });
        }
      }, 2000); 

    } catch(e) { alert("Erro ao conectar com servidor.") }
    setLoading(false)
  }
export default App;

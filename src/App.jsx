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
      
      let errosSeguidos = 0; // Contador de erros

      const checkInterval = setInterval(async () => {
        try {
          const resProg = await fetch(`${API_URL}/api/progresso/${data.task_id}`);
          
          if (resProg.ok) {
            errosSeguidos = 0; // Se deu certo, zera os erros
            const dataProg = await resProg.json();
            setProgress(p => ({ ...p, processados: dataProg.processados }));
            
            if (dataProg.concluido) { 
              clearInterval(checkInterval); 
              setProgress(p => ({ ...p, concluido: true })); 
            }
          } else if (resProg.status === 404) {
            // Se o Render esqueceu a tarefa (Amnésia do servidor)
            errosSeguidos++;
            if (errosSeguidos >= 3) {
              clearInterval(checkInterval);
              alert("O servidor do Render foi reiniciado e perdeu a tarefa atual. Feche e abra o site novamente.");
              setProgress({ ativo: false, processados: 0, total: 0, concluido: false, taskId: null });
            }
          }
        } catch (error) {
           // Apenas ignora piscadas rápidas da internet
        }
      }, 2000); 

    } catch(e) { alert("Erro ao conectar com servidor.") }
    setLoading(false)
  }

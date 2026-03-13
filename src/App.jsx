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
      
      let errosSeguidos = 0;

      const checkInterval = setInterval(async () => {
        try {
          const resProg = await fetch(`${API_URL}/api/progresso/${data.task_id}`);
          if (resProg.ok) {
            errosSeguidos = 0;
            const dataProg = await resProg.json();
            
            // TRAVA VISUAL: Impede o número de voltar para 0
            setProgress(p => ({ 
              ...p, 
              processados: Math.max(p.processados, dataProg.processados || 0),
              total: Math.max(p.total, dataProg.total || 0)
            }));
            
            if (dataProg.concluido) { 
              clearInterval(checkInterval); 
              setProgress(p => ({ ...p, concluido: true })); 
            }
          } else if (resProg.status === 404) {
            errosSeguidos++;
            if (errosSeguidos >= 3) {
              clearInterval(checkInterval);
              alert("O servidor reiniciou. Feche e abra o site novamente.");
              setProgress({ ativo: false, processados: 0, total: 0, concluido: false, taskId: null });
            }
          }
        } catch (error) {
          // Ignora pequenas oscilações
        }
      }, 1500); 

    } catch(e) { alert("Erro ao conectar com servidor.") }
    setLoading(false)
  }

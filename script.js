const EMAIL_DESTINO = "ba197c9c-f504-43be-bc10-88659f08b5c9";

    const form = document.getElementById('request-form');
    const screenForm = document.getElementById('screen-form');
    const screenConfirmation = document.getElementById('screen-confirmation');
    const offlineToggle = document.getElementById('simulate-offline');
    const networkErrorBox = document.getElementById('network-error-box');
    const btnSubmit = document.getElementById('btn-submit');
    const draftIndicator = document.getElementById('draft-indicator');
    const srAnnouncer = document.getElementById('sr-announcer');

    // Sistema de Leitor de Voz Próprio (Web Speech API)
    let voiceEnabled = true;
    let welcomeSpoken = false;
    const btnToggleVoice = document.getElementById('btn-toggle-voice');
    const voiceStatusText = document.getElementById('voice-status-text');

    function speak(text) {
      srAnnouncer.textContent = '';
      setTimeout(() => { srAnnouncer.textContent = text; }, 50);

      if (!voiceEnabled || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }

    const welcomeMessage =
      'Bem-vindo ao Portal de Serviços Comunitários. O leitor de voz está ativado. ' +
      'Para desligar a voz, clique no botão no topo da tela. ' +
      'Preencha os 3 campos obrigatórios para registrar sua solicitação.';

    window.addEventListener('load', () => speak(welcomeMessage));

    function unlockAudioOnFirstInteraction() {
      if (!welcomeSpoken && voiceEnabled) {
        welcomeSpoken = true;
        speak(welcomeMessage);
      }
      document.removeEventListener('click', unlockAudioOnFirstInteraction);
      document.removeEventListener('keydown', unlockAudioOnFirstInteraction);
    }
    document.addEventListener('click', unlockAudioOnFirstInteraction);
    document.addEventListener('keydown', unlockAudioOnFirstInteraction);

    btnToggleVoice.addEventListener('click', (e) => {
      e.stopPropagation();
      welcomeSpoken = true;
      voiceEnabled = !voiceEnabled;
      if (voiceEnabled) {
        voiceStatusText.textContent = '🔊 Leitor de voz automático: ATIVADO';
        btnToggleVoice.textContent = 'Desligar voz';
        btnToggleVoice.classList.remove('off');
        speak('Leitor de voz ativado.');
      } else {
        window.speechSynthesis?.cancel();
        voiceStatusText.textContent = '🔇 Leitor de voz automático: DESLIGADO';
        btnToggleVoice.textContent = 'Ligar voz';
        btnToggleVoice.classList.add('off');
      }
    });

    const spokenGuides = {
      'categoria': 'Campo 1 de 3, obrigatório: Qual é o problema? Use as setas para escolher uma opção.',
      'endereco': 'Campo 2 de 3, obrigatório: Onde fica o problema? Digite o nome da rua e um ponto de referência.',
      'descricao': 'Campo 3 de 3, obrigatório: Explique o que está acontecendo.',
      'btn-clear': 'Botão Limpar campos.',
      'btn-submit': 'Botão Enviar solicitação.',
      'btn-copy': 'Botão Copiar número de protocolo.',
      'btn-new': 'Botão Registrar outra solicitação.'
    };

    Object.keys(spokenGuides).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('focus', () => {
          welcomeSpoken = true;
          speak(spokenGuides[id]);
        });
      }
    });

    const fields = [
      { id: 'categoria', group: 'group-categoria' },
      { id: 'endereco', group: 'group-endereco' },
      { id: 'descricao', group: 'group-descricao' }
    ];

    fields.forEach(f => {
      const el = document.getElementById(f.id);
      const saved = localStorage.getItem('psc_draft_' + f.id);
      if (saved) el.value = saved;

      el.addEventListener('input', () => {
        localStorage.setItem('psc_draft_' + f.id, el.value);
        draftIndicator.textContent = 'Rascunho salvo localmente';
        document.getElementById(f.group).classList.remove('has-error');
        el.removeAttribute('aria-invalid');
      });
    });

    document.getElementById('categoria').addEventListener('change', (e) => {
      if (e.target.value) speak('Selecionado: ' + e.target.value);
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('Deseja apagar os dados preenchidos no formulário?')) {
        form.reset();
        fields.forEach(f => {
          localStorage.removeItem('psc_draft_' + f.id);
          document.getElementById(f.group).classList.remove('has-error');
          document.getElementById(f.id).removeAttribute('aria-invalid');
        });
        networkErrorBox.classList.add('hidden');
        speak('Todos os campos foram limpos.');
        document.getElementById('categoria').focus();
      }
    });

    // Envio compatível com arquivos locais (file://) via POST em iframe oculto
    function enviarParaEmail(dados) {
      return new Promise((resolve) => {
        if (!EMAIL_DESTINO || EMAIL_DESTINO === "ba197c9c-f504-43be-bc10-88659f08b5c9") {
          alert("Aviso: Você ainda não trocou o EMAIL_DESTINO no código JavaScript pelo seu e-mail real!");
          resolve(false);
          return;
        }

        // Cria iframe invisível para o envio não recarregar nem sair da página
        let iframe = document.getElementById('hidden-mail-target');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.name = 'hidden-mail-target';
          iframe.id = 'hidden-mail-target';
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
        }

        // Monta formulário POST padrão que o FormSubmit aceita de qualquer origem
        const tempForm = document.createElement('form');
        tempForm.method = 'POST';
        tempForm.action = `https://formsubmit.co/${encodeURIComponent(EMAIL_DESTINO.trim())}`;
        tempForm.target = 'hidden-mail-target';
        tempForm.style.display = 'none';

        const camposEnvio = {
          _subject: `[Portal Comunitário] Protocolo #${dados.protocolo} - ${dados.categoria}`,
          _captcha: 'false',
          _template: 'table',
          Protocolo: `#${dados.protocolo}`,
          Data_Hora: dados.dataHora,
          Problema: dados.categoria,
          Local: dados.endereco,
          Descricao: dados.descricao
        };

        Object.entries(camposEnvio).forEach(([chave, valor]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = chave;
          input.value = valor;
          tempForm.appendChild(input);
        });

        document.body.appendChild(tempForm);
        tempForm.submit();

        setTimeout(() => {
          tempForm.remove();
          resolve(true);
        }, 1200);
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      networkErrorBox.classList.add('hidden');

      let firstInvalid = null;
      let errorCount = 0;

      fields.forEach(f => {
        const el = document.getElementById(f.id);
        const group = document.getElementById(f.group);
        if (!el.value.trim()) {
          group.classList.add('has-error');
          el.setAttribute('aria-invalid', 'true');
          errorCount++;
          if (!firstInvalid) firstInvalid = el;
        } else {
          group.classList.remove('has-error');
          el.removeAttribute('aria-invalid');
        }
      });

      if (firstInvalid) {
        firstInvalid.focus();
        setTimeout(() => {
          speak(`Atenção: ${errorCount} campo obrigatório não preenchido. ${spokenGuides[firstInvalid.id]}`);
        }, 100);
        return;
      }

      if (offlineToggle.checked || !navigator.onLine) {
        networkErrorBox.classList.remove('hidden');
        btnSubmit.textContent = 'Tentar enviar novamente';
        speak('Pedido não enviado. Sua conexão falhou, mas seus dados foram mantidos. Toque em Tentar enviar novamente quando o sinal voltar.');
        networkErrorBox.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      const protocol = `2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const dataHora = new Date().toLocaleString('pt-BR');
      const dadosPedido = {
        protocolo: protocol,
        dataHora: dataHora,
        categoria: document.getElementById('categoria').value,
        endereco: document.getElementById('endereco').value,
        descricao: document.getElementById('descricao').value
      };

      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Enviando para o e-mail...';
      speak('Enviando solicitação, aguarde.');

      await enviarParaEmail(dadosPedido);

      document.getElementById('protocol-number').textContent = `#${protocol}`;
      document.getElementById('protocol-date').textContent = `Registrado em ${dataHora}`;
      document.getElementById('res-categoria').textContent = dadosPedido.categoria;
      document.getElementById('res-endereco').textContent = dadosPedido.endereco;
      document.getElementById('res-descricao').textContent = dadosPedido.descricao;

      fields.forEach(f => localStorage.removeItem('psc_draft_' + f.id));

      document.getElementById('step-1').classList.remove('active');
      document.getElementById('step-1').removeAttribute('aria-current');
      document.getElementById('step-2').classList.add('active');
      document.getElementById('step-2').setAttribute('aria-current', 'step');

      screenForm.classList.add('hidden');
      screenConfirmation.classList.remove('hidden');
      screenConfirmation.focus();

      btnSubmit.disabled = false;
      speak(`Solicitação enviada com sucesso! O seu número de protocolo é ${protocol.split('').join(' ')}.`);
    });

    document.getElementById('btn-copy').addEventListener('click', () => {
      const code = document.getElementById('protocol-number').textContent;
      navigator.clipboard?.writeText(code);
      document.getElementById('copy-feedback').textContent = `Protocolo ${code} copiado!`;
      speak(`Protocolo ${code} copiado.`);
    });

    document.getElementById('btn-new').addEventListener('click', () => {
      form.reset();
      btnSubmit.textContent = 'Enviar solicitação';
      document.getElementById('copy-feedback').textContent = '';

      document.getElementById('step-2').classList.remove('active');
      document.getElementById('step-2').removeAttribute('aria-current');
      document.getElementById('step-1').classList.add('active');
      document.getElementById('step-1').setAttribute('aria-current', 'step');

      screenConfirmation.classList.add('hidden');
      screenForm.classList.remove('hidden');
      document.getElementById('categoria').focus();
      setTimeout(() => speak('Novo formulário aberto. ' + spokenGuides['categoria']), 100);
    });
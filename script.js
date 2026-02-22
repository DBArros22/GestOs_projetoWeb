// 1. BANCO DE DADOS E CONFIGURAÇÕES INICIAIS
let ordens = JSON.parse(localStorage.getItem('gestos_v4_db')) || [];
let configEmpresa = JSON.parse(localStorage.getItem('gestos_cfg')) || { nome: '', cnpj: '', logo: '', cor: '#5CAD55', nicho: 'tecnico' };
const LIMITE_FREE = 5;

const nichoConfig = {
    tecnico: { item: "Aparelho", placeholder: "Ex: iPhone 13 Pro Max", desc: "Defeito relatado" },
    mecanico: { item: "Veículo", placeholder: "Ex: Civic ABC1234", desc: "Serviço/Peças" },
    ti: { item: "Equipamento", placeholder: "Ex: Notebook Dell", desc: "Serviço de TI" },
    obra: { item: "Local da Obra", placeholder: "Ex: Cozinha", desc: "Materiais" },
    beleza: { item: "Procedimento", placeholder: "Ex: Progressiva", desc: "Produtos" },
    pet: { item: "Pet", placeholder: "Ex: Thor (Golden)", desc: "Serviço" },
    limpeza: { item: "Ambiente", placeholder: "Ex: Escritório", desc: "Observações" },
    fotografia: { item: "Ensaio", placeholder: "Ex: Casamento", desc: "Locais" },
    frete: { item: "Itens", placeholder: "Ex: Sofá e Geladeira", desc: "Trajeto" },
    personal: { item: "Aluno", placeholder: "Ex: Ricardo Silva", desc: "Metas" }
};

// 2. NAVEGAÇÃO ENTRE TELAS
function showScreen(screen) {
    const screens = ['screen-auth', 'screen-list', 'screen-form', 'screen-view', 'screen-config'];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    const header = document.getElementById('main-header');

    if (screen === 'auth') {
        document.getElementById('screen-auth').classList.remove('hidden');
        if(header) header.classList.add('hidden');
        toggleAuth('login');
    } else {
        document.getElementById('screen-' + screen).classList.remove('hidden');
        if(header) header.classList.remove('hidden');

        if(screen === 'list') {
            renderList();
            atualizarDashboard();
        }
        if(screen === 'form') updateNicho();
        if(screen === 'config') loadConfig();
    }
}

function toggleAuth(modo) {
    ['auth-login', 'auth-signup', 'auth-recovery'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    const target = document.getElementById('auth-' + modo);
    if(target) target.classList.remove('hidden');
}

// 3. GERENCIAMENTO DE ORDENS (SALVAR E LISTAR)
const osForm = document.getElementById('os-form');
if(osForm) {
    osForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (ordens.length >= LIMITE_FREE) { showPaywall(); return; }

        // RECUPERA O ÚLTIMO NÚMERO USADO OU COMEÇA EM 0
        let ultimoNumero = parseInt(localStorage.getItem('gestos_proximo_numero')) || 0;
        let novoNumero = ultimoNumero + 1;

        const agora = new Date();
        const novaOS = {
            id: Date.now(),
            numero: novoNumero, // Número sequencial único e infinito
            cliente: document.getElementById('cliente').value,
            equipamento: document.getElementById('equipamento').value,
            defeito: document.getElementById('defeito').value,
            valor: (parseFloat(document.getElementById('valor').value) || 0).toFixed(2),
            pagamento: document.getElementById('pagamento-status').value,
            nicho: document.getElementById('nicho-selector').value,
            data: agora.toLocaleDateString('pt-BR'),
            hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            dataRaw: agora.toISOString().split('T')[0]
        };

        // SALVA O NOVO NÚMERO PARA A PRÓXIMA OS NÃO REPETIR
        localStorage.setItem('gestos_proximo_numero', novoNumero);

        ordens.unshift(novaOS);
        localStorage.setItem('gestos_v4_db', JSON.stringify(ordens));

        this.reset();
        showScreen('list');
        gerarPDF(novaOS);
    });
}

    function renderList() {
        const container = document.getElementById('os-list');
        if (!container) return;

        const search = document.getElementById('search-input').value.toLowerCase();
        const filterDate = document.getElementById('filter-date').value;
        const filterStatus = document.getElementById('filter-status').value;

        const filtradas = ordens.filter(os => {
            const matchSearch = os.cliente.toLowerCase().includes(search) || String(os.numero).includes(search);
            const matchDate = !filterDate || os.dataRaw === filterDate;
            const matchStatus = filterStatus === 'todos' || os.pagamento === filterStatus;
            return matchSearch && matchDate && matchStatus;
        });

        // Ajustado para exibir a DATA no card
        container.innerHTML = filtradas.map(os => `
            <div class="os-card" onclick="verDetalhes(${os.id})" style="border-left: 5px solid ${os.pagamento === 'Pago' ? '#34C759' : '#FF3B30'};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0;">${os.cliente}</h3>
                        <div style="display: flex; gap: 8px; align-items: center; margin-top: 2px;">
                            <small style="font-weight: 800; color: #64748B;">#${String(os.numero).padStart(3, '0')}</small>
                            <small style="color: #94A3B8;">•</small>
                            <small style="color: #64748B; font-weight: 600;">📅 ${os.data}</small>
                        </div>
                        <small style="color: #94A3B8; display: block; margin-top: 2px;">${os.equipamento}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:var(--primary); font-size: 1.1rem;">R$ ${os.valor.replace('.',',')}</strong>
                    </div>
                </div>
            </div>`).join('');

        document.getElementById('os-count').innerText = ordens.length;
        atualizarDashboard(filtradas);
    }
    // CHAMADA IMPORTANTE: Atualiza o financeiro com base no que está filtrado na tela
    atualizarDashboard(filtradas);


function atualizarDashboard(dadosParaSomar) {
    // Se não passarmos dados (ex: no carregamento inicial), usamos todas as ordens
    const listaParaCalculo = dadosParaSomar || ordens;

    let pago = 0, pendente = 0;
    listaParaCalculo.forEach(os => {
        const v = parseFloat(os.valor) || 0;
        os.pagamento === 'Pago' ? pago += v : pendente += v;
    });

    const elPago = document.getElementById('total-pago');
    const elPendente = document.getElementById('total-pendente');

    if(elPago) elPago.innerText = `R$ ${pago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    if(elPendente) elPendente.innerText = `R$ ${pendente.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// 4. VISUALIZAÇÃO E PDF (USANDO SEUS IDs DO HTML)
function verDetalhes(id) {
    const os = ordens.find(o => o.id === id);
    if(!os) return;

    const config = nichoConfig[os.nicho] || nichoConfig.tecnico;
    const container = document.getElementById('view-content');

    // Layout de "Recibo Profissional"
    container.innerHTML = `
        <div class="view-sheet" style="padding: 25px; background: white; border-radius: 20px; margin: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-top: 8px solid var(--primary);">

            <div style="text-align: center; margin-bottom: 25px; border-bottom: 1px dashed #E2E8F0; padding-bottom: 20px;">
                <span class="status-pill ${os.pagamento === 'Pago' ? 'pill-concluido' : 'pill-aberto'}" 
                      style="padding: 6px 16px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; 
                             background: ${os.pagamento === 'Pago' ? '#DCFCE7' : '#FEE2E2'}; 
                             color: ${os.pagamento === 'Pago' ? '#166534' : '#991B1B'};">
                    ${os.pagamento}
                </span>
                <h2 style="margin: 15px 0 5px 0; color: #1E293B; font-size: 1.6rem;">OS #${String(os.numero).padStart(3, '0')}</h2>
                <div style="color: #64748B; font-size: 0.85rem; font-weight: 500;">
                    📅 ${os.data} às ${os.hora}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background: #F8FAFC; padding: 12px; border-radius: 12px;">
                    <label style="font-size: 0.65rem; font-weight: 800; color: #94A3B8; text-transform: uppercase;">Cliente</label>
                    <p style="margin: 4px 0 0 0; font-weight: 700; color: #1E293B; font-size: 0.95rem;">${os.cliente}</p>
                </div>
                <div style="background: #F8FAFC; padding: 12px; border-radius: 12px;">
                    <label style="font-size: 0.65rem; font-weight: 800; color: #94A3B8; text-transform: uppercase;">${config.item}</label>
                    <p style="margin: 4px 0 0 0; font-weight: 700; color: #1E293B; font-size: 0.95rem;">${os.equipamento}</p>
                </div>
            </div>

            <div style="background: #F8FAFC; padding: 15px; border-radius: 12px; margin-bottom: 25px;">
                <label style="font-size: 0.65rem; font-weight: 800; color: #94A3B8; text-transform: uppercase;">Descrição do Serviço</label>
                <p style="margin: 8px 0 0 0; color: #475569; font-size: 0.9rem; line-height: 1.5; white-space: pre-line;">${os.defeito}</p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 2px solid #F1F5F9;">
                <span style="font-weight: 800; color: #64748B; font-size: 0.9rem;">VALOR TOTAL</span>
                <span style="font-size: 1.5rem; font-weight: 900; color: var(--primary);">R$ ${os.valor.replace('.', ',')}</span>
            </div>
        </div>`;

    // Atualiza botões de ação
    const areaPagamento = document.getElementById('area-pagamento-os');
    if (areaPagamento) {
        areaPagamento.innerHTML = os.pagamento !== 'Pago' ? 
            `<button onclick="marcarComoPago(${os.id}); verDetalhes(${os.id})" class="btn-confirm" 
                     style="background:#34C759; width:100%; margin-top:10px; box-shadow: 0 4px 12px rgba(52, 199, 89, 0.2);">
                ✅ Marcar como Pago agora
            </button>` : '';
    }

    document.getElementById('btn-regerar-pdf').onclick = () => gerarPDF(os);
    document.getElementById('btn-compartilhar-zap').onclick = () => {
        const msg = `Olá ${os.cliente}, segue detalhes da sua OS #${os.numero}.\n*Valor:* R$ ${os.valor.replace('.',',')}\n*Status:* ${os.pagamento}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`);
    };

    showScreen('view');
}

function gerarPDF(os) {
    const config = nichoConfig[os.nicho] || nichoConfig.tecnico;
    const logoHtml = configEmpresa.logo ? `<img src="${configEmpresa.logo}" style="max-height:70px; margin-bottom:10px; display:block;">` : '';

    const element = document.createElement('div');
    // Adicionado display block e background white para garantir captura do html2pdf
    element.style.padding = "40px";
    element.style.background = "white";
    element.style.color = "black";

    element.innerHTML = `
        <div style="font-family:Arial, sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px;">
                <div>
                    ${logoHtml}
                    <h2 style="margin:0; color:#1a1a1a;">${configEmpresa.nome || 'GestOS'}</h2>
                    <p style="margin:5px 0; color:#666;">${configEmpresa.cnpj || ''}</p>
                </div>
                <div style="text-align:right;">
                    <h1 style="margin:0; color:#1a1a1a;">OS #${String(os.numero).padStart(3, '0')}</h1>
                    <p style="margin:5px 0; color:#666;">Data: ${os.data}</p>
                </div>
            </div>
            <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
            <div style="margin-bottom:20px;">
                <p><b>Cliente:</b> ${os.cliente}</p>
                <p><b>${config.item}:</b> ${os.equipamento}</p>
                <p><b>Situação:</b> ${os.pagamento}</p>
            </div>
            <div style="background:#f9f9f9; padding:15px; border-radius:5px; margin-bottom:20px;">
                <p><b>Descrição:</b></p>
                <p style="white-space: pre-line;">${os.defeito}</p>
            </div>
            <h2 style="text-align:right; margin-top:30px; border-top:2px solid #000; padding-top:10px;">
                Total: R$ ${os.valor.replace('.',',')}
            </h2>
        </div>`;

    // Opções otimizadas para o html2pdf
    const opt = {
        margin: [10, 10],
        filename: `OS_${os.numero}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

// 5. CONFIGURAÇÕES E TEMA
function loadConfig() {
    document.getElementById('cfg-nome').value = configEmpresa.nome || "";
    document.getElementById('cfg-cnpj').value = configEmpresa.cnpj || "";
    document.getElementById('cfg-cor').value = configEmpresa.cor || "#5CAD55";
    document.getElementById('cfg-nicho').value = configEmpresa.nicho || "tecnico";

    if (configEmpresa.logo) {
        document.getElementById('logo-preview-img').src = configEmpresa.logo;
        document.getElementById('logo-preview-container').classList.remove('hidden');
        document.getElementById('upload-text').classList.add('hidden');
        document.getElementById('cfg-logo').value = configEmpresa.logo;
    }
    renderizarPaleta();
}

function saveConfig() {
    configEmpresa = {
        nome: document.getElementById('cfg-nome').value,
        cnpj: document.getElementById('cfg-cnpj').value,
        logo: document.getElementById('cfg-logo').value,
        cor: document.getElementById('cfg-cor').value,
        nicho: document.getElementById('cfg-nicho').value
    };
    localStorage.setItem('gestos_cfg', JSON.stringify(configEmpresa));
    aplicarTema();
    showScreen('list');
}

function anexarImagem(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            document.getElementById('cfg-logo').value = base64;
            document.getElementById('logo-preview-img').src = base64;
            document.getElementById('logo-preview-container').classList.remove('hidden');
            document.getElementById('upload-text').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function renderizarPaleta() {
    const palette = document.getElementById('color-palette');
    const cores = ['#5CAD55', '#007AFF', '#5856D6', '#FF9500', '#FF3B30', '#AF52DE', '#1e293b'];
    palette.innerHTML = cores.map(cor => `
        <div onclick="selecionarCor('${cor}')" 
             style="width:35px; height:35px; border-radius:50%; background:${cor}; cursor:pointer; 
             border: ${cor === configEmpresa.cor ? '3px solid black' : '2px solid white'}; shadow: 0 2px 4px rgba(0,0,0,0.2);">
        </div>`).join('');
}

function selecionarCor(cor) {
    configEmpresa.cor = cor;
    document.getElementById('cfg-cor').value = cor;
    renderizarPaleta();
}

function aplicarTema() {
    const cor = configEmpresa.cor || '#5CAD55';
    document.documentElement.style.setProperty('--primary', cor);
    const header = document.getElementById('main-header');
    if(header) header.style.backgroundColor = cor;
    const display = document.getElementById('empresa-nome-display');
    if(display) display.innerText = configEmpresa.nome.toUpperCase();
}

// 6. FUNÇÕES AUXILIARES (PAGO, DASHBOARD, LIMITES)
function marcarComoPago(id) {
    ordens = ordens.map(os => { if(os.id === id) os.pagamento = 'Pago'; return os; });
    localStorage.setItem('gestos_v4_db', JSON.stringify(ordens));
    renderList();
    atualizarDashboard();
}

function atualizarDashboard() {
    let pago = 0, pendente = 0;
    ordens.forEach(os => {
        const v = parseFloat(os.valor) || 0;
        os.pagamento === 'Pago' ? pago += v : pendente += v;
    });
    document.getElementById('total-pago').innerText = `R$ ${pago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('total-pendente').innerText = `R$ ${pendente.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

function checkLimitAndOpen() {
    if (ordens.length >= LIMITE_FREE) { showPaywall(); } else { showScreen('form'); }
}

function updateNicho() {
    const val = document.getElementById('nicho-selector').value;
    const config = nichoConfig[val] || nichoConfig.tecnico;
    document.getElementById('label-item').innerText = config.item;
    document.getElementById('equipamento').placeholder = config.placeholder;
    document.getElementById('label-servico').innerText = config.desc;
}

function showPaywall() { document.getElementById('paywall').classList.remove('hidden'); }
function closePaywall() { document.getElementById('paywall').classList.add('hidden'); }
function zerarSistema() {
    if(confirm("ATENÇÃO: Isso apagará todas as ordens e resetará o contador para 01. Deseja continuar?")) {
        ordens = [];
        localStorage.removeItem('gestos_v4_db');
        localStorage.setItem('gestos_proximo_numero', 0); // Reseta o contador global
        renderList();
        atualizarDashboard();
        alert("Sistema resetado com sucesso!");
    }
}

// INICIALIZAÇÃO
function realizarLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const lembrar = document.getElementById('remember-me').checked;

    if (email && senha) {
        if (lembrar) {
            localStorage.setItem('gestos_remember_email', email);
            localStorage.setItem('gestos_remember_pass', senha);
            localStorage.setItem('gestos_remember_check', 'true');
        } else {
            localStorage.removeItem('gestos_remember_email');
            localStorage.removeItem('gestos_remember_pass');
            localStorage.removeItem('gestos_remember_check');
        }
        showScreen('list');
    } else {
        alert("Preencha e-mail e senha!");
    }
}
function realizarCadastro() { showScreen('list'); }

    window.onload = () => {
        aplicarTema();

        // Coloca a data de hoje no filtro automaticamente ao abrir
        const hoje = new Date().toISOString().split('T')[0];
        const campoData = document.getElementById('filter-date');
        if(campoData) campoData.value = hoje;

        // ... restante da sua lógica de login ...
        showScreen('auth');
    };
window.onload = () => {
    aplicarTema();

    // Coloca a data de hoje no filtro automaticamente ao abrir
    const hoje = new Date().toISOString().split('T')[0];
    const campoData = document.getElementById('filter-date');
    if(campoData) campoData.value = hoje;

    // ... restante da sua lógica de login ...
    showScreen('auth');
};

const savedEmail = localStorage.getItem('gestos_remember_email');
const savedPass = localStorage.getItem('gestos_remember_pass');
const savedCheck = localStorage.getItem('gestos_remember_check');

if (savedCheck === 'true') {
    if(document.getElementById('login-email')) document.getElementById('login-email').value = savedEmail;
    if(document.getElementById('login-senha')) document.getElementById('login-senha').value = savedPass;
    if(document.getElementById('remember-me')) document.getElementById('remember-me').checked = true;
}

function realizarLogout() {
    // Removemos a classe hidden e garantimos o display flex para centralizar
    const modal = document.getElementById('modal-logout');
    if(modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

// Fecha o modal se o usuário cancelar
function fecharModalLogout() {
    const modal = document.getElementById('modal-logout');
    if(modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// Executa a saída definitiva
    function confirmarSaida() {
        fecharModalLogout();
        // Limpeza simples e volta para o auth
        showScreen('auth');
    }

function toggleFiltros() {
    const wrapper = document.getElementById('wrapper-filtros');
    if (wrapper) {
        if (wrapper.classList.contains('hidden')) {
            wrapper.classList.remove('hidden');
            wrapper.style.display = 'flex';
        } else {
            // AO FECHAR: Limpa os valores dos inputs e volta a mostrar tudo
            document.getElementById('search-input').value = "";
            document.getElementById('filter-date').value = "";
            document.getElementById('filter-status').value = "todos";

            wrapper.classList.add('hidden');
            wrapper.style.display = 'none';

            // Recarrega a lista completa
            renderList();
        }
    }
}

// 1. Variáveis Globais
let ordens = JSON.parse(localStorage.getItem('gestos_v4_db')) || [];
let configEmpresa = JSON.parse(localStorage.getItem('gestos_cfg')) || { nome: '', cnpj: '', logo: '', cor: '#5CAD55', nicho: 'tecnico' };
const LIMITE_FREE = 5;

const nichoConfig = {
    tecnico: { item: "Aparelho", placeholder: "Ex: iPhone 13 Pro Max", desc: "Defeito relatado", titulo: "OS Técnica" },
    mecanico: { item: "Veículo", placeholder: "Ex: Civic ABC1234", desc: "Serviço/Peças", titulo: "Ordem Mecânica" },
    ti: { item: "Equipamento", placeholder: "Ex: Notebook Dell", desc: "Serviço de TI", titulo: "Suporte TI" },
    obra: { item: "Local da Obra", placeholder: "Ex: Cozinha", desc: "Materiais", titulo: "Relatório de Obra" },
    beleza: { item: "Procedimento", placeholder: "Ex: Progressiva", desc: "Produtos", titulo: "Ficha de Estética" },
    pet: { item: "Pet", placeholder: "Ex: Thor (Golden)", desc: "Serviço", titulo: "Checklist Pet" },
    limpeza: { item: "Ambiente", placeholder: "Ex: Escritório", desc: "Observações", titulo: "Serviço de Limpeza" },
    fotografia: { item: "Ensaio", placeholder: "Ex: Casamento", desc: "Locais", titulo: "Contrato de Foto" },
    frete: { item: "Itens", placeholder: "Ex: Sofá e Geladeira", desc: "Trajeto", titulo: "Ordem de Frete" },
    personal: { item: "Aluno", placeholder: "Ex: Ricardo Silva", desc: "Metas", titulo: "Ficha de Treino" }
};

// 2. NAVEGAÇÃO ENTRE TELAS
function showScreen(screen) {
    document.querySelectorAll('[id^="screen-"]').forEach(s => s.classList.add('hidden'));
    const header = document.getElementById('main-header');
    const fab = document.querySelector('.fab-button');

    if (screen === 'list') {
        document.getElementById('screen-list').classList.remove('hidden');
        if(header) header.classList.remove('force-hidden');
        if(fab) fab.classList.remove('force-hidden');
        renderList();
        atualizarDashboard();
    } else {
        const target = document.getElementById('screen-' + screen);
        if(target) target.classList.remove('hidden');
        if(header) header.classList.add('force-hidden');
        if(fab) fab.classList.add('force-hidden');
        if(screen === 'form') updateNicho();
        if(screen === 'config') loadConfig();
    }
}

// 3. VISUALIZAÇÃO DETALHADA (OS CLICÁVEL)
function verDetalhes(id) {
    const os = ordens.find(o => o.id === id);
    if(!os) return;

    const container = document.getElementById('view-content');
    const areaPagamento = document.getElementById('area-pagamento-os');
    const config = nichoConfig[os.nicho] || nichoConfig.tecnico;

    container.innerHTML = `
        <div class="view-sheet" style="padding: 20px; background: white; border-radius: 15px; margin: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                <span class="status-pill ${os.pagamento === 'Pago' ? 'pill-concluido' : 'pill-aberto'}">
                    ${os.pagamento.toUpperCase()}
                </span>
                <h3 style="margin: 10px 0 5px 0; color: var(--primary);">#${String(os.numero).padStart(3, '0')}</h3>
                <small style="color: #64748B;">Gerada em ${os.data} às ${os.hora}</small>
            </div>
            <div style="margin-bottom: 15px;"><label style="font-size:0.7rem;font-weight:bold;color:#94A3B8;text-transform:uppercase;">Cliente</label><p style="margin:2px 0;font-weight:600;">${os.cliente}</p></div>
            <div style="margin-bottom: 15px;"><label style="font-size:0.7rem;font-weight:bold;color:#94A3B8;text-transform:uppercase;">${config.item}</label><p style="margin:2px 0;font-weight:600;">${os.equipamento}</p></div>
            <div style="margin-bottom: 15px;"><label style="font-size:0.7rem;font-weight:bold;color:#94A3B8;text-transform:uppercase;">Serviço/Defeito</label><p style="margin:2px 0;">${os.defeito}</p></div>
            <div style="text-align: right; margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px;">
                <label style="display: block; font-size: 0.8rem; color: #64748B;">VALOR TOTAL</label>
                <span style="font-size: 1.5rem; font-weight: 900; color: var(--primary);">R$ ${os.valor.replace('.', ',')}</span>
            </div>
        </div>`;

    areaPagamento.innerHTML = os.pagamento !== 'Pago' ? 
        `<button onclick="marcarComoPago(${os.id}); verDetalhes(${os.id})" class="btn-confirm" style="background:#34C759;width:100%;">✅ Marcar como Pago</button>` : '';

    document.getElementById('btn-regerar-pdf').onclick = () => gerarPDF(os);
    document.getElementById('btn-compartilhar-zap').onclick = () => enviarWhatsApp(os.id);
    showScreen('view');
}

// 4. SALVAR NOVA OS (CORRIGIDO)
const osForm = document.getElementById('os-form');
if(osForm) {
    osForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Verifica limite
        if (ordens.length >= LIMITE_FREE) { showPaywall(); return; }

        try {
            const agora = new Date();
            const proximoNumero = ordens.reduce((max, os) => (os.numero > max ? os.numero : max), 0) + 1;

            const novaOS = {
                id: Date.now(),
                numero: proximoNumero,
                cliente: document.getElementById('cliente').value,
                equipamento: document.getElementById('equipamento').value,
                defeito: document.getElementById('defeito').value || "Não informado",
                valor: (parseFloat(document.getElementById('valor').value) || 0).toFixed(2),
                pagamento: document.getElementById('pagamento-status')?.value || 'Pendente',
                nicho: document.getElementById('nicho-selector')?.value || 'tecnico',
                data: agora.toLocaleDateString('pt-BR'),
                hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };

            ordens.unshift(novaOS);
            localStorage.setItem('gestos_v4_db', JSON.stringify(ordens));

            this.reset();
            showScreen('list'); // Volta para a lista
            renderList(); // Atualiza a lista na tela
            gerarPDF(novaOS); // Opcional: gera PDF automático
        } catch (err) {
            alert("Erro ao salvar: Verifique se todos os campos estão preenchidos.");
            console.error(err);
        }
    });
}

// 5. RENDERIZAR LISTA
function renderList() {
    const container = document.getElementById('os-list');
    if (!container) return;
    const search = (document.getElementById('search-input')?.value || "").toLowerCase();
    const filtradas = ordens.filter(os => os.cliente.toLowerCase().includes(search) || String(os.numero).includes(search));

    container.innerHTML = filtradas.map(os => `
        <div class="os-card" onclick="verDetalhes(${os.id})" style="cursor:pointer; margin-bottom:10px; padding:15px; background:white; border-radius:12px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="status-pill ${os.pagamento === 'Pago' ? 'pill-concluido' : 'pill-aberto'}">${os.pagamento.toUpperCase()}</span>
                    <h3 style="margin:5px 0 0 0; font-size:1rem;">${os.cliente}</h3>
                    <small style="color:#64748B;">#${String(os.numero).padStart(3,'0')} - ${os.equipamento}</small>
                </div>
                <div style="text-align:right;">
                    <strong style="color:var(--primary);">R$ ${os.valor.replace('.',',')}</strong>
                    <div style="font-size:0.6rem; color:#CBD5E0;">Ver detalhes ➔</div>
                </div>
            </div>
        </div>`).join('');
}

// 6. GERADOR DE PDF
function gerarPDF(os) {
    const config = nichoConfig[os.nicho] || nichoConfig.tecnico;
    const element = document.createElement('div');
    element.innerHTML = `
        <div style="padding:40px; font-family:Arial, sans-serif;">
            <h1 style="color:${configEmpresa.cor};">${configEmpresa.nome || 'GestOS'}</h1>
            <h2>ORDEM DE SERVIÇO #${String(os.numero).padStart(3,'0')}</h2>
            <p><b>Cliente:</b> ${os.cliente}</p>
            <p><b>Equipamento:</b> ${os.equipamento}</p>
            <p><b>Status:</b> ${os.pagamento}</p>
            <hr>
            <p><b>Serviço:</b> ${os.defeito}</p>
            <h3 style="text-align:right;">Total: R$ ${os.valor.replace('.',',')}</h3>
        </div>`;
    html2pdf().set({ margin: 0.5, filename: `OS_${os.numero}.pdf`, html2canvas: { scale: 3 } }).from(element).save();
}

// 7. FUNÇÕES DE APOIO
function atualizarDashboard() {
    let pago = 0, pendente = 0;
    ordens.forEach(os => {
        const v = parseFloat(os.valor) || 0;
        os.pagamento === 'Pago' ? pago += v : pendente += v;
    });
    if(document.getElementById('total-pago')) document.getElementById('total-pago').innerText = `R$ ${pago.toFixed(2)}`;
    if(document.getElementById('total-pendente')) document.getElementById('total-pendente').innerText = `R$ ${pendente.toFixed(2)}`;
    if(document.getElementById('os-count')) document.getElementById('os-count').innerText = ordens.length;
}

window.marcarComoPago = function(id) {
    ordens = ordens.map(os => { if(os.id === id) os.pagamento = 'Pago'; return os; });
    localStorage.setItem('gestos_v4_db', JSON.stringify(ordens));
    renderList();
    atualizarDashboard();
};

function loadConfig() {
    if(document.getElementById('cfg-nome')) {
        document.getElementById('cfg-nome').value = configEmpresa.nome || "";
        document.getElementById('cfg-cnpj').value = configEmpresa.cnpj || "";
        document.getElementById('cfg-cor').value = configEmpresa.cor || "#5CAD55";
        renderizarPaleta(configEmpresa.cor);
    }
}

function saveConfig() {
    configEmpresa = {
        nome: document.getElementById('cfg-nome').value,
        cnpj: document.getElementById('cfg-cnpj').value,
        cor: document.getElementById('cfg-cor').value,
        nicho: document.getElementById('cfg-nicho')?.value || 'tecnico'
    };
    localStorage.setItem('gestos_cfg', JSON.stringify(configEmpresa));
    aplicarTema();
    showScreen('list');
}

function aplicarTema() {
    const cor = configEmpresa.cor || '#5CAD55';
    document.documentElement.style.setProperty('--primary', cor);
    const header = document.getElementById('main-header');
    if(header) header.style.backgroundColor = cor;
}

function updateNicho() {
    const val = document.getElementById('nicho-selector')?.value || 'tecnico';
    const config = nichoConfig[val];
    if(document.getElementById('label-item')) document.getElementById('label-item').innerText = config.item;
    if(document.getElementById('equipamento')) document.getElementById('equipamento').placeholder = config.placeholder;
}

function checkLimitAndOpen() {
    ordens.length >= LIMITE_FREE ? showPaywall() : showScreen('form');
}

function zerarSistema() {
    if (confirm("Apagar todas as ordens permanentemente?")) {
        localStorage.removeItem('gestos_v4_db');
        location.reload();
    }
}

function enviarWhatsApp(id) {
    const os = ordens.find(o => o.id === id);
    const msg = encodeURIComponent(`Olá ${os.cliente}, sua OS #${os.numero} está pronta. Valor: R$ ${os.valor}`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`);
}

window.onload = () => { aplicarTema(); renderList(); showScreen('list'); };

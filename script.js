// 1. Variáveis Globais
let ordens = JSON.parse(localStorage.getItem('gestos_v4_db')) || [];
let configEmpresa = JSON.parse(localStorage.getItem('gestos_cfg')) || { 

    nome: '', 
    cnpj: '', 
    logo: '', 
    cor: '#5CAD55' 
};
const LIMITE_FREE = 5;

// Cores pré-definidas para o usuário escolher com um clique

// 2. Configuração de Nichos (Campos Dinâmicos)
const nichoConfig = {
    tecnico: { item: "Aparelho", placeholder: "Ex: iPhone 13 Pro Max", desc: "Defeito relatado", titulo: "OS Técnica" },
    mecanico: { item: "Veículo (Modelo, Placa e Ano)", placeholder: "Ex: Honda Civic - ABC1234 - 2022", desc: "Serviço/Peças a trocar", titulo: "Ordem Mecânica" },
    ti: { item: "Equipamento", placeholder: "Ex: Notebook Dell G15", desc: "Serviço de TI/Configuração", titulo: "Suporte TI" },
    obra: { item: "Local da Obra", placeholder: "Ex: Cozinha e Banheiro Social", desc: "Materiais e Etapas", titulo: "Relatório de Obra" },
    beleza: { item: "Procedimento", placeholder: "Ex: Progressiva + Corte", desc: "Detalhes/Produtos utilizados", titulo: "Ficha de Estética" },
    pet: { item: "Nome do Pet e Raça", placeholder: "Ex: Thor (Golden Retriever)", desc: "Serviço/Banho/Tosa", titulo: "Checklist Pet" },
    limpeza: { item: "Ambiente", placeholder: "Ex: Escritório Comercial 50m²", desc: "Produtos e Observações", titulo: "Serviço de Limpeza" },
    fotografia: { item: "Tipo de Ensaio", placeholder: "Ex: Casamento ou Gestante", desc: "Horários e Locais", titulo: "Contrato de Foto" },
    frete: { item: "Itens para Transporte", placeholder: "Ex: Sofá 3 lugares e Geladeira", desc: "Origem e Destino", titulo: "Ordem de Frete" },
    personal: { item: "Nome do Aluno", placeholder: "Ex: Ricardo Silva", desc: "Plano de Treino e Metas", titulo: "Ficha de Treino" }
};

// 3. Função de Navegação entre Telas
function showScreen(screen) {
    const listScreen = document.getElementById('screen-list');
    const formScreen = document.getElementById('screen-form');
    const configScreen = document.getElementById('screen-config');
    const header = document.getElementById('main-header');
    const fab = document.querySelector('.fab-button'); // O sinal de "+"

    // 1. Esconder TUDO primeiro
    listScreen.classList.add('hidden');
    formScreen.classList.add('hidden');
    configScreen.classList.add('hidden');

    // Esconder Header e Botão "+" por padrão
    if(header) header.classList.add('force-hidden');
    if(fab) fab.classList.add('force-hidden');

    // 2. Mostrar apenas o necessário para cada tela
    if (screen === 'list') {
        listScreen.classList.remove('hidden');
        if(header) header.classList.remove('force-hidden');
        if(fab) fab.classList.remove('force-hidden');
        renderList();
    } 
    else if (screen === 'form') {
        formScreen.classList.remove('hidden');
        // Mantém header e fab escondidos
        updateNicho();
    } 
    else if (screen === 'config') {
        configScreen.classList.remove('hidden');
        loadConfig(); // Carrega os dados salvos apenas ao abrir a tela
    }
}

// 4. Funções de Configuração (AJUSTADAS PARA SELEÇÃO DE COR)
function loadConfig() {
    // Esta função agora só será chamada AO ABRIR a tela de perfil.
    // Ela preenche os campos com o que já está salvo no sistema.
    document.getElementById('cfg-nome').value = configEmpresa.nome || "";
    document.getElementById('cfg-cnpj').value = configEmpresa.cnpj || "";
    document.getElementById('cfg-logo').value = configEmpresa.logo || "";
    document.getElementById('cfg-nicho').value = configEmpresa.nicho || "tecnico";

    const corAtual = configEmpresa.cor || "#5CAD55";
    document.getElementById('cfg-cor').value = corAtual;

    renderizarPaleta(corAtual);
}

const CORES_TEMA = ['#5CAD55', '#34C759', '#007AFF', '#5856D6', '#FF9500', '#FF3B30', '#AF52DE'];

function renderizarPaleta(corSelecionada) {
    const container = document.getElementById('color-palette');
    if (!container) return;

    container.innerHTML = CORES_TEMA.map(cor => {
        // Normaliza as cores para comparação (remove espaços e deixa minúsculo)
        const ativa = cor.toLowerCase().trim() === corSelecionada.toLowerCase().trim();

        return `
            <div onclick="selecionarCor('${cor}')" 
                 class="color-dot ${ativa ? 'selected' : ''}"
                 style="
                    width: 45px; 
                    height: 45px; 
                    border-radius: 14px; 
                    background: ${cor}; 
                    cursor: pointer; 
                    position: relative;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: ${ativa ? '0 0 0 4px white, 0 0 20px ' + cor : '0 4px 10px rgba(0,0,0,0.1)'};
                    transform: ${ativa ? 'scale(1.15)' : 'scale(1)'};
                    border: ${ativa ? '2px solid white' : '2px solid transparent'};
                 ">
            </div>
        `;
    }).join('');
}

window.selecionarCor = function(cor) {
    // 1. Atualiza o input que será salvo
    const inputCor = document.getElementById('cfg-cor');
    if (inputCor) inputCor.value = cor;

    // 2. Redesenha a paleta com a nova cor marcada
    renderizarPaleta(cor);

    // 3. Atualiza o CSS dinâmico (Feedback instantâneo)
    document.documentElement.style.setProperty('--primary', cor);

    // 4. Aplica a cor no botão de salvar e no header do perfil
    const btnSalvar = document.querySelector('#screen-config .btn-confirm');
    if (btnSalvar) btnSalvar.style.backgroundColor = cor;

    const headerPerfil = document.querySelector('#screen-config .form-header');
    if (headerPerfil) headerPerfil.style.borderLeftColor = cor;
};

    // Gera as bolinhas de cores para seleção simples
    const container = document.getElementById('color-palette');
    if (container) {
        container.innerHTML = CORES_TEMA.map(cor => `
            <div onclick="selecionarCor('${cor}')" 
                 style="width: 35px; height: 35px; border-radius: 50%; background: ${cor}; 
                 cursor: pointer; border: 3px solid ${cor.toLowerCase() === corSalva.toLowerCase() ? '#000' : 'transparent'};
                 box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: 0.2s;">
            </div>
        `).join('');
    }

window.selecionarCor = function(cor) {
    // 1. Atualiza o input que será salvo
    const inputCor = document.getElementById('cfg-cor');
    if (inputCor) inputCor.value = cor;

    // 2. Redesenha a paleta com a nova cor marcada
    renderizarPaleta(cor);

    // 3. Atualiza o CSS dinâmico (Feedback instantâneo)
    document.documentElement.style.setProperty('--primary', cor);

    // 4. Aplica a cor no botão de salvar e no header do perfil
    const btnSalvar = document.querySelector('#screen-config .btn-confirm');
    if (btnSalvar) btnSalvar.style.backgroundColor = cor;

    const headerPerfil = document.querySelector('#screen-config .form-header');
    if (headerPerfil) headerPerfil.style.borderLeftColor = cor;
};

function saveConfig() {
    const nome = document.getElementById('cfg-nome').value;
    const cnpj = document.getElementById('cfg-cnpj').value;
    const logo = document.getElementById('cfg-logo').value;
    const nicho = document.getElementById('cfg-nicho').value;
    const corSelecionada = document.getElementById('cfg-cor').value; // Ponto crucial

    configEmpresa = {
        nome: nome,
        cnpj: cnpj,
        logo: logo,
        nicho: nicho,
        cor: corSelecionada
    };

    localStorage.setItem('gestos_cfg', JSON.stringify(configEmpresa));

    // Aplica o tema globalmente
    aplicarTema();

    alert("Configurações salvas com sucesso! ✨");
    showScreen('list');
}


// Mecanismo de aplicação do tema (GARANTE A MUDANÇA VISUAL)
function aplicarTema() {
    const cor = configEmpresa.cor || '#5CAD55';

    const displayNome = document.getElementById('empresa-nome-display');
    if (displayNome) {
        displayNome.innerText = configEmpresa.nome ? configEmpresa.nome.toUpperCase() : "MEU COMÉRCIO";
    }

    // Aplica a cor do tema globalmente
    document.documentElement.style.setProperty('--primary-color', cor);

    const header = document.getElementById('main-header');
    if (header) header.style.backgroundColor = cor;

    const fab = document.querySelector('.fab-button');
    if (fab) fab.style.backgroundColor = cor;

    const btnsConfirm = document.querySelectorAll('.btn-confirm');
    btnsConfirm.forEach(btn => btn.style.backgroundColor = cor);
}

function updateNicho() {
    const nichoSelector = document.getElementById('nicho-selector');
    if(!nichoSelector) return;
    const config = nichoConfig[nichoSelector.value] || nichoConfig.tecnico;

    document.getElementById('label-item').innerText = config.item;
    document.getElementById('label-servico').innerText = config.desc;
    document.getElementById('form-title').innerText = config.titulo;
    document.getElementById('equipamento').placeholder = config.placeholder;
    document.getElementById('defeito').placeholder = `Descreva o ${config.desc.toLowerCase()} aqui...`;
}

// 5. Verifica limite
function checkLimitAndOpen() {
    if (ordens.length >= LIMITE_FREE) {
        showPaywall();
    } else {
        showScreen('form');
    }
}

// 6. Lógica de Salvar o Formulário
document.getElementById('os-form').addEventListener('submit', function(e) {
    e.preventDefault();

    if (ordens.length >= LIMITE_FREE) {
        showPaywall();
        return;
    }

    const agora = new Date();
    const proximoNumero = ordens.length > 0 ? Math.max(...ordens.map(o => o.numero || 0)) + 1 : 1;

    const novaOS = {
        id: Date.now(),
        numero: proximoNumero,
        cliente: document.getElementById('cliente').value,
        equipamento: document.getElementById('equipamento').value,
        defeito: document.getElementById('defeito').value,
        valor: parseFloat(document.getElementById('valor').value).toFixed(2),
        pagamento: document.getElementById('pagamento-status').value,
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        nicho: document.getElementById('nicho-selector').value
    };

    ordens.unshift(novaOS);
    localStorage.setItem('gestos_v4_db', JSON.stringify(ordens));

    this.reset();
    showScreen('list');
    gerarPDF(novaOS);
});

// 7. Renderização da Lista
function renderList() {
    const container = document.getElementById('os-list');
    const search = document.getElementById('search-input').value.toLowerCase();
    const filterStatus = document.getElementById('filter-status').value;
    const filterDate = document.getElementById('filter-date').value;

    const filtradas = ordens.filter(os => {
        const termo = search.toLowerCase();
        const matchesSearch = 
            os.cliente.toLowerCase().includes(termo) || 
            os.equipamento.toLowerCase().includes(termo) ||
            (os.numero && os.numero.toString() === termo);

        const matchesStatus = (filterStatus === "todos") || (os.pagamento === filterStatus);

        let matchesDate = true;
        if (filterDate) {
            const [dia, mes, ano] = os.data.split('/');
            const dataFormatadaOS = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            matchesDate = (dataFormatadaOS === filterDate);
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    atualizarDashboard();

    if (filtradas.length === 0) {
        const mensagem = filterDate ? "Nenhuma OS emitida este dia." : "Nenhuma OS encontrada.";
        container.innerHTML = `<p style="text-align:center; color:#94A3B8; margin-top:40px;">${mensagem}</p>`;
        return;
    }

    container.innerHTML = filtradas.map(os => `
        <div class="os-card" style="border-left: 8px solid ${os.pagamento === 'Pago' ? '#34C759' : '#FF3B30'}; margin-bottom: 15px; padding: 15px; background: white; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:start">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                        <span style="font-size:0.7rem; font-weight:800; color:#94A3B8;">#${String(os.numero || 0).padStart(3, '0')}</span>
                        <span style="font-size:0.6rem; padding: 2px 6px; border-radius: 4px; background: ${os.pagamento === 'Pago' ? '#EBFDF2' : '#FFF5F5'}; color: ${os.pagamento === 'Pago' ? '#34C759' : '#FF3B30'}; font-weight: 800;">
                            ● ${os.pagamento.toUpperCase()}
                        </span>
                    </div>
                    <h3 style="margin: 0; font-size: 1.1rem; color: #1A1C1A;">${os.cliente}</h3>
                    <p style="margin: 4px 0; font-size: 0.85rem; color: #64748B; font-weight: 600;">${os.equipamento}</p>
                    <p style="margin: 0; font-size: 0.7rem; color: #94A3B8;">${os.data} às ${os.hora || ''}</p>
                </div>
                <div style="text-align: right;">
                    <strong style="color: ${configEmpresa.cor || '#5CAD55'}; font-size: 1.1rem; display: block;">R$ ${parseFloat(os.valor).toFixed(2).replace('.', ',')}</strong>
                </div>
            </div>

            <div class="actions" style="display:flex; gap:10px; margin-top:15px; border-top: 1px solid #F1F5F9; padding-top: 12px;">
                <button class="btn-action" onclick="regerarPDF(${os.id})" style="flex:1; padding: 8px; border-radius: 8px; border: 1px solid #E2E8F0; background: white; font-weight: 600; cursor: pointer;">📄 PDF</button>
                <button class="btn-action" onclick="enviarWhatsApp(${os.id})" style="flex:1; padding: 8px; border-radius: 8px; border: 1px solid #E2E8F0; background: white; font-weight: 600; cursor: pointer;">💬 Zap</button>
                ${os.pagamento === 'Pendente' ? `
                    <button class="btn-action" onclick="marcarComoPago(${os.id})" style="flex:1; padding: 8px; border-radius: 8px; border: none; background: #8DE085; color: white; font-weight: 700; cursor: pointer;">💰 Baixar</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function atualizarDashboard() {
    let pagoTotal = 0;
    let pendenteTotal = 0;
    ordens.forEach(os => {
        const val = parseFloat(String(os.valor).replace(',', '.')) || 0;
        if (os.pagamento === 'Pago') pagoTotal += val;
        else pendenteTotal += val;
    });
    document.getElementById('total-pago').innerText = `R$ ${pagoTotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('total-pendente').innerText = `R$ ${pendenteTotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('os-count').innerText = ordens.length;
}

window.marcarComoPago = function(id) {
    ordens = ordens.map(os => { if(os.id === id) os.pagamento = 'Pago'; return os; });
    localStorage.setItem('gestos_v4_db', JSON.stringify(ordens));
    renderList();
};

window.regerarPDF = function(id) {
    const os = ordens.find(o => o.id === id);
    if(os) gerarPDF(os);
};

window.enviarWhatsApp = function(id) {
    const os = ordens.find(o => o.id === id);
    if(!os) return;
    const msg = `Olá *${os.cliente}*!\n*Item:* ${os.equipamento}\n*Serviço:* ${os.defeito}\n*Valor:* R$ ${os.valor}\n*Status:* ${os.pagamento}\n*GestOS Digital* 🛠️`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

// 9. Gerador de PDF
function gerarPDF(os) {
    const config = nichoConfig[os.nicho] || nichoConfig.tecnico;
    const corTema = configEmpresa.cor || '#5CAD55';
    const corStatus = os.pagamento === 'Pago' ? '#34C759' : '#FF3B30';

    const content = `
    <div style="padding:30px; font-family: sans-serif; color: #333;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid ${corTema}; padding-bottom:15px;">
            <div>
                <h1 style="color:${corTema}; margin:0; font-size:24px;">${configEmpresa.nome || 'Meu Comércio'}</h1>
                <p style="margin:0; font-size:10px; color:#666;">${configEmpresa.cnpj || ''}</p>
                <p style="margin:0; font-size:8px; color:#999;">Gerado via GestOS Digital</p>
            </div>
            <div style="background:${corStatus}; color:white; padding:8px 12px; border-radius:8px; font-weight:bold; font-size:12px;">
                ${os.pagamento.toUpperCase()}
            </div>
        </div>
        <div style="margin-top:20px; display:flex; justify-content:space-between;">
            <p><strong>Nº DA ORDEM:</strong> #${String(os.numero || '0').padStart(3, '0')}</p>
            <p><strong>DATA:</strong> ${os.data}</p>
        </div>
        <p style="margin-top:10px;"><strong>CLIENTE:</strong> ${os.cliente}</p>
        <p><strong>${config.item.toUpperCase()}:</strong> ${os.equipamento}</p>
        <div style="background:#f8f9fa; padding:15px; border-radius:10px; margin:20px 0; border: 1px solid #eee;">
            <p style="margin-top:0; font-size:12px; color:${corTema}; font-weight:bold;">DESCRIÇÃO DO SERVIÇO:</p>
            <p style="margin-bottom:0;">${os.defeito}</p>
        </div>
        <div style="text-align:right; margin-top:30px;">
            <p style="margin:0; font-size:12px; color:#666;">VALOR TOTAL</p>
            <h2 style="color:${corTema}; margin:0; font-size:28px;">R$ ${parseFloat(os.valor).toFixed(2).replace('.', ',')}</h2>
        </div>
    </div>`;

    const opt = {
        margin: 0.5,
        filename: `OS_${String(os.numero).padStart(3, '0')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(content).save();
}

// Funções do Fluxo de Assinatura
function showPaywall() {
    const pw = document.getElementById('paywall');
    if(pw) {
        pw.classList.remove('hidden');
        document.getElementById('pw-oferta').classList.remove('hidden');
        document.getElementById('pw-checkout').classList.add('hidden');
    }
}

function closePaywall() {
    document.getElementById('paywall').classList.add('hidden');
}

function showCheckout() {
    document.getElementById('pw-oferta').classList.add('hidden');
    document.getElementById('pw-checkout').classList.remove('hidden');
}

function voltarOferta() {
    document.getElementById('pw-oferta').classList.remove('hidden');
    document.getElementById('pw-checkout').classList.add('hidden');
}

// Lógica de Seleção de Pagamento (Pronta para receber sua API futuramente)
function selectMetodo(tipo) {
    const area = document.getElementById('payment-area');

    if (tipo === 'pix') {
        area.innerHTML = `
            <div style="text-align: center;">
                <p><b>Assinatura Mensal via PIX</b></p>
                <div style="background: white; padding: 10px; border: 1px dashed #ccc; word-break: break-all; font-size: 0.7rem; margin: 10px 0;">
                    CHAVE-ALEATORIA-API-PIX-123456789
                </div>
                <button class="btn-confirm" style="font-size: 0.8rem; padding: 8px;" onclick="alert('Sistema aguardando integração com API de PIX')">Copiar Chave</button>
            </div>
        `;
    } else {
        area.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; text-align: left;">
                <input type="text" placeholder="Número do Cartão" style="padding: 8px; border-radius: 5px; border: 1px solid #ddd;">
                <div style="display: flex; gap: 5px;">
                    <input type="text" placeholder="MM/AA" style="flex:1; padding: 8px; border-radius: 5px; border: 1px solid #ddd;">
                    <input type="text" placeholder="CVV" style="flex:1; padding: 8px; border-radius: 5px; border: 1px solid #ddd;">
                </div>
                <button class="btn-confirm" style="font-size: 0.8rem; padding: 8px;" onclick="alert('Dados enviados para a API de recorrência (Mock)')">Ativar Assinatura Mensal</button>
            </div>
        `;
    }
}

// 11. Inicialização
window.onload = function() {
    aplicarTema(); 
    renderList();
    const ns = document.getElementById('nicho-selector');
    if(ns) updateNicho();
};

// 1. Verifica o limite antes de abrir o formulário
function checkLimitAndOpen() {
    // Se já tem 5 ou mais ordens, bloqueia e mostra o modal centralizado
    if (ordens.length >= LIMITE_FREE) {
        showPaywall();
    } else {
        showScreen('form');
    }
}

// 2. Exibe o Modal de Assinatura
function showPaywall() {
    const pw = document.getElementById('paywall');
    if(pw) {
        pw.classList.remove('hidden');
        document.getElementById('pw-oferta').classList.remove('hidden');
        document.getElementById('pw-checkout').classList.add('hidden');
    }
}

// 3. Fecha o Modal
function closePaywall() {
    document.getElementById('paywall').classList.add('hidden');
}

// 4. Vai para a tela de pagamento dentro do modal
function showCheckout() {
    document.getElementById('pw-oferta').classList.add('hidden');
    document.getElementById('pw-checkout').classList.remove('hidden');
}

function selectMetodo(tipo) {
    const area = document.getElementById('payment-area');
    if (tipo === 'pix') {
        area.innerHTML = `
            <div style="text-align: center;">
                <p style="color:#1E293B; font-weight:bold;">Plano Pro via PIX</p>
                <p style="font-size:0.8rem; color:#64748B;">Escaneie ou copie a chave abaixo:</p>
                <div style="background: #eee; padding: 10px; border-radius:8px; word-break: break-all; font-family: monospace; font-size: 0.7rem; margin: 10px 0; border: 1px solid #ddd;">
                    00020126580014BR.GOV.BCB.PIX0136ae9876-1234-4321-8888-999aaabbbccc520400005303986540550.005802BR5913GESTOR_DIGITAL6009SAO_PAULO62070503***6304ABCD
                </div>
                <button class="btn-confirm" onclick="alert('Chave PIX copiada!')" style="background:#000; font-size:0.8rem;">Copiar Código PIX</button>
            </div>
        `;
    } else {
        area.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <p style="color:#1E293B; font-weight:bold; text-align:center;">Cartão de Crédito (Recorrente)</p>
                <input type="text" placeholder="0000 0000 0000 0000" style="width:100%; padding: 12px; border: 1px solid #ddd; border-radius:8px;">
                <div style="display: flex; gap: 10px;">
                    <input type="text" placeholder="MM/AA" style="flex:1; padding: 12px; border: 1px solid #ddd; border-radius:8px;">
                    <input type="text" placeholder="CVC" style="flex:1; padding: 12px; border: 1px solid #ddd; border-radius:8px;">
                </div>
                <button class="btn-confirm" onclick="alert('Conectando à operadora...')">Pagar R$ 50,00 / mês</button>
            </div>
        `;
    }
}

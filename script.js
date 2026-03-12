var db, auth; 
let ordens = [];
let configEmpresa = { nome: '', cnpj: '', logo: '', cor: '#5CAD55', nicho: 'tecnico' };
const LIMITE_FREE = 5;

// --- 1. FUNÇÃO DE FEEDBACK ---
function gerenciarLoader(exibir, mensagem = "") {
    let loader = document.getElementById('loader-global');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loader-global';
        loader.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 20px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.2); width: 280px;">
                <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid var(--primary, #5CAD55); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                <p id="loader-text" style="margin: 0; font-family: sans-serif; font-weight: 600; color: #1e293b; font-size: 0.95rem;"></p>
            </div>
            <style>
                #loader-global { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(2px); }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>`;
        document.body.appendChild(loader);
    }
    const txt = document.getElementById('loader-text');
    if (txt) txt.innerText = mensagem;
    loader.style.display = exibir ? 'flex' : 'none';
}

// --- 2. INICIALIZAÇÃO SEGURA ---
function inicializarBanco() {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        db = firebase.firestore();
        auth = firebase.auth();
        return true;
    }
    return false;
}

// --- 3. MONITOR DE ACESSO ---
setTimeout(() => {
    // Verifica se o Firebase e as funções básicas existem antes de rodar
    if (typeof inicializarBanco === 'function' && inicializarBanco()) {
        auth.onAuthStateChanged(async (user) => {
            const navbar = document.querySelector('.navbar');
            if (user) {
                console.log("Usuário logado:", user.email);
                await loadConfig(); 
                carregarDados();    
                showScreen('list'); 
                if(navbar) navbar.style.display = 'flex';
            } else {
                configEmpresa = {}; 
                aplicarTema(); 
                showScreen('auth');
                if(navbar) navbar.style.display = 'none';
            }
        });
    } else {
        console.error("Erro crítico: Firebase ou inicializarBanco não encontrados.");
    }
}, 1000); // Aumentamos para 1 segundo para garantir estabilidade no Replit

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

// --- 4. NAVEGAÇÃO ENTRE TELAS ---
function showScreen(screen) {
    const screens = ['screen-auth', 'screen-list', 'screen-form', 'screen-view', 'screen-config'];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    const header = document.getElementById('main-header');

    if (screen === 'auth') {
        const authScreen = document.getElementById('screen-auth');
        if(authScreen) authScreen.classList.remove('hidden');
        if(header) header.classList.add('hidden');
        toggleAuth('login');
    } else {
        const targetScreen = document.getElementById('screen-' + screen);
        if(targetScreen) targetScreen.classList.remove('hidden');
        if(header) header.classList.remove('hidden');

        if(screen === 'list') {
            renderList();
            atualizarDashboard();
        }
        if(screen === 'form') updateNicho();
        if(screen === 'config') {
            loadConfig(); 
            setTimeout(renderizarPaleta, 50);
        }
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

// --- 5. GERENCIAMENTO DE ORDENS ---
const osForm = document.getElementById('os-form');
if(osForm) {
    osForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        if (ordens.length >= LIMITE_FREE) { alert("Limite atingido"); return; }
        gerenciarLoader(true, "Gerando sua Ordem de Serviço...");
        try {
            const docRefUser = db.collection("usuarios").doc(user.uid);
            const docUser = await docRefUser.get();
            let novoNumero = (docUser.data().ultimoNumero || 0) + 1;
            const agora = new Date();
            const novaOS = {
                userId: user.uid,
                numero: novoNumero,
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
            await db.collection("ordens").add(novaOS);
            await docRefUser.update({ ultimoNumero: novoNumero });
            this.reset();
            gerenciarLoader(false);
            showScreen('list');
            gerarPDF(novaOS);
        } catch (error) {
            gerenciarLoader(false);
            alert("Erro ao salvar.");
        }
    });
}

async function renderList() {
    const container = document.getElementById('os-list');
    if (!container || !auth.currentUser) return;
    const search = document.getElementById('search-input')?.value.toLowerCase() || "";
    const filterDate = document.getElementById('filter-date')?.value || "";
    const filterStatus = document.getElementById('filter-status')?.value || "todos";

    const filtradas = ordens.filter(os => {
        const matchSearch = (os.cliente || "").toLowerCase().includes(search) || String(os.numero).includes(search);
        const matchDate = !filterDate || os.dataRaw === filterDate;
        const matchStatus = filterStatus === 'todos' || os.pagamento === filterStatus;
        return matchSearch && matchDate && matchStatus;
    });

    if (filtradas.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#94A3B8; padding:20px;">Nenhuma ordem encontrada.</div>';
    } else {
        container.innerHTML = filtradas.map(os => `
            <div class="os-card" onclick="verDetalhes('${os.docId}')" style="border-left: 5px solid ${os.pagamento === 'Pago' ? '#34C759' : '#FF3B30'}; margin-bottom: 10px; cursor: pointer;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0;">${os.cliente}</h3>
                        <div style="display: flex; gap: 8px; align-items: center; margin-top: 2px;">
                            <small style="font-weight: 800; color: #64748B;">#${String(os.numero).padStart(3, '0')}</small>
                            <small style="color: #64748B; font-weight: 600;">📅 ${os.data}</small>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:var(--primary);">R$ ${String(os.valor || "0.00").replace('.',',')}</strong>
                    </div>
                </div>
            </div>`).join('');
    }
    const osCountEl = document.getElementById('os-count');
    if (osCountEl) osCountEl.innerText = ordens.length;
    atualizarDashboard(filtradas);
}

function atualizarDashboard(dadosParaSomar) {
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

async function verDetalhes(id) {
    gerenciarLoader(true, "Carregando...");
    try {
        const doc = await db.collection("ordens").doc(id).get();
        if (!doc.exists) {
            gerenciarLoader(false);
            return;
        }

        const os = doc.data();
        const viewContent = document.getElementById('view-content');

        if (viewContent) {
            // Tratamento para evitar erro se o valor não existir
            const valorFormatado = os.valor ? String(os.valor).replace('.', ',') : "0,00";

            viewContent.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="color: var(--primary); margin-top: 0;">#${String(os.numero || 0).padStart(3, '0')} - ${os.cliente || 'Sem Nome'}</h3>

                    <p style="margin: 8px 0;"><strong>📅 Data:</strong> ${os.data || '---'}</p>
                    <p style="margin: 8px 0;"><strong>🛠️ Item:</strong> ${os.equipamento || '---'}</p>

                    <div style="margin: 15px 0; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #edf2f7;">
                        <p style="margin: 0 0 5px 0; font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Descrição do Serviço:</p>
                        <p style="margin: 0; color: #2d3748; white-space: pre-wrap; line-height: 1.5; font-size: 0.95rem;">${os.descricao || 'Nenhuma descrição detalhada.'}</p>
                    </div>

                    <p style="margin: 8px 0;"><strong>💰 Valor:</strong> R$ ${valorFormatado}</p>
                    <p style="margin: 8px 0;"><strong>📊 Status:</strong> <span style="color: ${os.pagamento === 'Pago' ? '#10b981' : '#f59e0b'}; font-weight: bold;">${os.pagamento || 'Pendente'}</span></p>
                </div>`;
        }

        // Configura o botão de PDF para a OS atual
        const btnPdf = document.getElementById('btn-regerar-pdf');
        if (btnPdf) {
            btnPdf.onclick = () => gerarPDF(os);
        }

        gerenciarLoader(false);
        showScreen('view');
    } catch (e) {
        console.error("Erro na função verDetalhes:", e);
        gerenciarLoader(false);
        alert("Erro ao carregar os detalhes da OS.");
    }
}

function gerarPDF(os) {
    if (!os) return;

    const corTema = configEmpresa.cor || '#5CAD55';
    const logoBase64 = configEmpresa.logo || null; // Pega o Base64 da sua função

    const element = document.createElement('div');
    element.style.padding = "30px";
    element.style.fontFamily = "sans-serif";

    element.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid ${corTema}; padding-bottom: 15px; margin-bottom: 20px;">
            <div style="display: flex; flex-direction: column;">
                ${logoBase64 ? `<img src="${logoBase64}" style="max-height: 70px; max-width: 150px; object-fit: contain; margin-bottom: 10px;">` : ''}
                <h1 style="margin: 0; color: ${corTema}; font-size: 18px; text-transform: uppercase;">${configEmpresa.nome || 'ORDEM DE SERVIÇO'}</h1>
                <p style="margin: 0; font-size: 11px; font-weight: bold;">CNPJ: ${configEmpresa.cnpj || '---'}</p>
            </div>
            <div style="text-align: right;">
                <h2 style="margin: 0; color: #444; font-size: 16px;">OS #${os.numero || os.id.substring(0,6)}</h2>
                <p style="margin: 5px 0; font-size: 12px;">Data: ${os.data || new Date().toLocaleDateString()}</p>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <p style="font-size: 13px;"><strong>CLIENTE:</strong> ${os.cliente}</p>
            <p style="font-size: 13px;"><strong>EQUIPAMENTO:</strong> ${os.equipamento}</p>
        </div>

        <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; min-height: 150px;">
            <p style="margin-top: 0; font-weight: bold; font-size: 12px; color: ${corTema};">DESCRIÇÃO DOS SERVIÇOS:</p>
            <p style="font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${os.descricao}</p>
        </div>

        <div style="text-align: right; margin-top: 20px;">
            <h2 style="color: ${corTema}; font-size: 20px;">VALOR TOTAL: R$ ${os.valor}</h2>
        </div>

        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
            <div style="border-top: 1px solid #000; width: 40%; text-align: center; font-size: 10px; padding-top: 5px;">Assinatura do Responsável</div>
            <div style="border-top: 1px solid #000; width: 40%; text-align: center; font-size: 10px; padding-top: 5px;">Assinatura do Cliente</div>
        </div>
    `;

    const opt = {
        margin: 10,
        filename: `OS_${os.cliente}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

// --- 7. CONFIGURAÇÕES ---

async function loadConfig() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const doc = await db.collection("usuarios").doc(user.uid).get();
        if (doc.exists) {
            configEmpresa = doc.data();

            // --- PARTE NOVA: Preenche os inputs da tela de Perfil ---
            const inputNome = document.getElementById('cfg-nome');
            const inputCnpj = document.getElementById('cfg-cnpj');
            const inputNicho = document.getElementById('cfg-nicho');

            if (inputNome) inputNome.value = configEmpresa.nome || "";
            if (inputCnpj) inputCnpj.value = configEmpresa.cnpj || "";
            if (inputNicho) inputNicho.value = configEmpresa.nicho || "";

            // Se houver logo, garante que ela apareça no preview do perfil
            const imgPreview = document.getElementById('logo-preview-img');
            if (imgPreview && configEmpresa.logo) {
                imgPreview.src = configEmpresa.logo;
                document.getElementById('logo-preview-container').classList.remove('hidden');
            }
            // -------------------------------------------------------

            aplicarTema();
        }
    } catch (e) { 
        console.error("Erro ao carregar config:", e);
    } finally {
        gerenciarLoader(false); 
    }
}

function aplicarTema() {
    // 1. Aplica a cor (Se configEmpresa não existir, usa o padrão)
    const cor = (configEmpresa && configEmpresa.cor) ? configEmpresa.cor : '#5CAD55';
    document.documentElement.style.setProperty('--primary', cor);

    // 2. Atualiza o nome da empresa na tela principal e na tela de login
    const elNome = document.getElementById('nome-empresa-header');
    if (elNome) {
        // Se houver nome salvo, exibe. Se não, deixa vazio.
        elNome.innerText = (configEmpresa && configEmpresa.nome) ? configEmpresa.nome : "";
    }
}
document.body.appendChild(loader);


async function saveConfig() {
    const user = auth.currentUser;
    if (!user) {
        mostrarNotificacao("Usuário não autenticado", true);
        return;
    }

    gerenciarLoader(true, "Salvando dados do perfil...");

    // Captura os dados dos inputs da tela de perfil
    const novosDados = {
        nome: document.getElementById('cfg-nome').value,
        cnpj: document.getElementById('cfg-cnpj').value,
        nicho: document.getElementById('cfg-nicho').value,
        cor: configEmpresa.cor || '#5CAD55',
        logo: configEmpresa.logo || ""
    };

    try {
        // Salva no Firestore dentro da coleção do usuário logado
        await db.collection("usuarios").doc(user.uid).set(novosDados, { merge: true });

        // Atualiza a variável global para o sistema refletir a mudança na hora
        configEmpresa = novosDados; 

        // Aplica o nome abaixo do GestOS e as cores
        aplicarTema(); 

        gerenciarLoader(false);

        // Notificação elegante em vez do alert antigo
        mostrarNotificacao("✅ Perfil atualizado com sucesso!");

        // Volta para a lista de OS após salvar
        showScreen('list');
    } catch (e) {
        console.error("Erro ao salvar perfil:", e);
        gerenciarLoader(false);
        mostrarNotificacao("❌ Erro ao salvar no banco de dados", true);
    }
}

function renderizarPaleta() {
    const palette = document.getElementById('color-palette');
    if (!palette) return;
    const cores = ['#5CAD55', '#007AFF', '#5856D6', '#FF9500', '#FF3B30'];
    palette.innerHTML = ""; 
    cores.forEach(cor => {
        const div = document.createElement('div');
        div.onclick = () => selecionarCor(cor);
        div.style.cssText = `width:30px; height:30px; border-radius:50%; background:${cor}; cursor:pointer; margin:5px; display:inline-block;`;
        palette.appendChild(div);
    });
}

function selecionarCor(cor) {
    configEmpresa.cor = cor;
    aplicarTema(); 
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Image = e.target.result;
        configEmpresa.logo = base64Image;

        // Atualiza o texto de feedback
        const uploadText = document.getElementById('upload-text');
        if (uploadText) { 
            uploadText.innerText = "✅ Logo carregada!"; 
            uploadText.style.color = "#5CAD55"; 
        }

        // Mostra a miniatura da imagem (Preview)
        const previewImg = document.getElementById('logo-preview-img');
        const previewCont = document.getElementById('logo-preview-container');

        if (previewImg && previewCont) {
            previewImg.src = base64Image;
            previewCont.classList.remove('hidden'); // Remove o "hidden" para a imagem aparecer
        }
    };
    reader.readAsDataURL(file);
}

// --- 8. AUTENTICAÇÃO ---
async function realizarLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    gerenciarLoader(true, "Entrando...");

    try { 
        await auth.signInWithEmailAndPassword(email, senha);
        // O loader será fechado automaticamente pelo monitor de acesso (onAuthStateChanged)
    } catch (e) { 
        gerenciarLoader(false); // <--- Isso faz o modal sumir se a senha estiver errada
        alert("Erro no login: " + e.message); 
    }
}

async function realizarCadastro() {
    const email = document.getElementById('reg-email').value;
    const senha = document.getElementById('reg-senha').value;
    gerenciarLoader(true, "Criando...");
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, senha);
        await db.collection("usuarios").doc(cred.user.uid).set({ email, plano: 'free', ultimoNumero: 0 });
    } catch (e) { gerenciarLoader(false); alert("Erro no cadastro"); }
}

function realizarLogout() {
    const confirmacao = confirm("Deseja realmente sair do sistema?");
    if (confirmacao) {
        auth.signOut().then(() => {
            window.location.reload();
        }).catch((error) => {
            console.error("Erro ao sair:", error);
        });
    }
}

// --- 9. AUXILIARES E CARREGAMENTO ---
function updateNicho() {
    const nicho = document.getElementById('cfg-nicho')?.value || configEmpresa.nicho || 'tecnico';
    const config = nichoConfig[nicho];
    if(document.getElementById('label-item')) document.getElementById('label-item').innerText = config.item;
}

function checkLimitAndOpen() {
    // Verifica se já atingiu o limite de 5
    if (ordens.length >= LIMITE_FREE) {
        const modal = document.getElementById('modal-upgrade');
        if (modal) {
            modal.style.display = 'flex'; // Faz o modal aparecer
            modal.classList.remove('hidden');
        }
    } else {
        showScreen('form'); // Abre o formulário se estiver abaixo do limite
    }
}


function fecharUpgrade() {
    const modal = document.getElementById('modal-upgrade');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function irParaPagamento() {
    document.getElementById('upgrade-step-1').classList.add('hidden');
    document.getElementById('upgrade-step-2').classList.remove('hidden');
}

function selecionarMetodo(metodo) {
    document.getElementById('pagamento-pix').classList.add('hidden');
    document.getElementById('pagamento-cartao').classList.add('hidden');

    if(metodo === 'pix') {
        document.getElementById('pagamento-pix').classList.remove('hidden');
    } else if(metodo === 'cartao') {
        document.getElementById('pagamento-cartao').classList.remove('hidden');
    }
}

async function carregarDados() {
    if (!auth.currentUser) return;
    db.collection("ordens")
        .where("userId", "==", auth.currentUser.uid) 
        .onSnapshot((snapshot) => {
            ordens = snapshot.docs.map(doc => ({
                docId: doc.id,
                ...doc.data()
            })).sort((a, b) => (b.numero || 0) - (a.numero || 0));
            console.log("Ordens carregadas:", ordens.length);
            renderList(); 
        }, (error) => {
            console.error("Erro no Firebase:", error);
        });
}

function mostrarNotificacao(mensagem, erro = false) {
    const toast = document.createElement('div');
    toast.className = "toast-notificacao";
    toast.style = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: ${erro ? '#ef4444' : '#10b981'}; color: white;
        padding: 12px 25px; border-radius: 12px; z-index: 11000;
        font-weight: bold; box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        font-family: sans-serif; transition: all 0.5s ease;
    `;
    toast.innerText = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

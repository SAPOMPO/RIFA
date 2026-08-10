import { app, auth, db, storage } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref as dbRef, get, set, update, onValue, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import * as ui from './boletas-ui.js';
import * as admin from './admin.js';
import * as utils from './utils.js';

window.appData = { currentUser: null, tickets: [] };
window.appModules = { ui, admin, utils };

const TOTAL_BOLETAS = 10000;
const EXPIRATION_TIME_MS = 2 * 60 * 60 * 1000;
const WHATSAPP_NUMBER = "573219637388";
const ADMIN_EMAIL = "admin@rifas.com";

const CUPONES = { "MOTO10": 0.10, "VIP20": 0.20, "OFFT": 0.05 };
const I18N = {
    es: { admin_access: "🔒 Acceso de Administrador", email: "Email:", password: "Contraseña:", login: "Iniciar Sesión", query_title: "🔍 Consultar mis Boletas", query_desc: "Ingresa tu número de WhatsApp para ver tus reservas y pagos.", phone: "Teléfono (WhatsApp):", search_tickets: " Buscar Boletas", history_winners: "Historial de Ganadores", loading: "Calentando motores", theme: "Tema", my_tickets: "Mis Boletas", history: "Historial", select_visual: "Selecciona tu estilo visual:", custom_color: "Color Personalizado:", how_to_win: "¿Cómo te ganas esa nave? 🚀", instruction_1: "Elige tu número del <b>0000 al 9999</b> (el de la suerte, el cumpleaños del perro, el que sea).", instruction_2: "Haz tu reserva y envíanos el comprobante por WhatsApp.", instruction_3: "¡Y listo! Quedas anotado para los premios semanales y la moto.", colors: "Colores:", free: "Libre", reserved: "Reservado", paid: "Pagado", main_prize: "Pulzar NS400Z o $25.000.000 en Efectivo", ticket: "Boleta", final_draw: "Sorteo Final:", lottery: "Premio Mayor de la Lotería Santander", weekly_prize: "$1.000.000 Semanales", until: "hasta el 18 de Dic", progress: "Progreso de la Rifa", time_left: "Tiempo Restante", next_weekly: "Próximo Semanal", completed_tickets: "Rifas completas", total: "Total", tickets_24h: "boletas reservadas/pagadas en las últimas 24 horas. ¡No te quedes sin la tuya!", select_numbers: "Selecciona tus Números (0000-9999)👍", show_all: "Mostrar Todos", grid: "Cuadrícula", testimonials_title: "Entregas y Testimonios 📹", faq_title: "Lo que necesitas saber (¡sin rodeos!) 📜⚡", faq_1_q: "📅 ¿Cuándo me gano esa nave? (Sorteo final)", faq_1_a: "El día de la verdad es el <b>25 de Diciembre de 2026</b> con la Lotería de Santander. Si tu boleta dice 🔴 <b>PAGADO</b>, ¡ya estás cruzando los dedos! 🤞🔥", faq_2_q: "📌 ¿Tengo que estar pegado a la pantalla para ganar?", faq_2_a: "¡Para nada! Si caes como ganador, te llamamos hasta por debajo de las piedras de una para darte la buena noticia. Tú solo ten el celular cargado. 📲🏆", faq_3_q: "🧾 ¿Cómo sé que mi compra sí quedó guardada?", faq_3_a: "Cero cuentos raros. Apenas envías tu comprobante, el sistema registra tu número digitalmente y pasa a rojo. Todo transparente, legal y a la vista de todos. ✔️🧾", faq_4_q: "🎫 ¿Puedo comprar un combo de números para asegurar?", faq_4_a: "¡Obvio! Llevarte 1 está bien, pero llevarte 3, 5 o 10 te pone más cerca del motor. Entre más números asegures, ¡menos chance le dejas al vecino! 😎🎟️", faq_5_q: "🚦 ¿Qué significan las luces de colores?", faq_5_a: "🟩 <b>Libre:</b> ¡Aprovéchalo antes de que te lo quiten!<br>🟨 <b>Reservado:</b> Alguien lo apartó pero no ha pagado (aún puede volar).<br>🔴 <b>Pagado:</b> ¡Boleta asegurada y lista para el premio! 🎯", faq_6_q: "🚚 Si me gano la moto, ¿cómo me la entregan?", faq_6_a: "Te la entregamos con documentos al día, llaves en mano y lista para encender. Te la llevas 100% legal, asegurada y directa para rodar. 🏍️💨✨", faq_7_q: "⭐ ¿Qué tan seguro y confiable es esto?", faq_7_a: "Cero rodeos. El sistema guarda automáticamente tus reservas y pagos sin falla. Además, podrás revisar los testimonios y ganadores pasados. ¡Aquí todo es legal y transparente! 🔐🤝", contact_dev: "Contacto Directo del Desarrollador", legal: "Legal & Créditos", total_to_pay: "Total a Pagar", participate_now: "Participar Ahora", confirm_reservation: "Confirma tu Reserva", about_to_reserve: "Estás a punto de reservar los números:", reserve_warning: "Diligencia tus datos para que podamos contactarte y confirmar tu pago. Tu reserva dura 2 horas.", payment_accounts: "Cuentas de Pago:", full_name: "Nombre Completo:", contact_phone: "Teléfono de Contacto (WhatsApp):", promo_code: "Código Promocional (Opcional):", reserve_and_wa: "RESERVAR Y ENVIAR WHATSAPP", referral_msg: "Tu enlace de referido activo:" },
    en: { admin_access: "🔒 Admin Access", email: "Email:", password: "Password:", login: "Login", query_title: "🔍 My Tickets", query_desc: "Enter your WhatsApp number to view your reservations and payments.", phone: "Phone (WhatsApp):", search_tickets: " Search Tickets", history_winners: "Winners History", loading: "Warming up engines", theme: "Theme", my_tickets: "My Tickets", history: "History", select_visual: "Select your style:", custom_color: "Custom Color:", how_to_win: "How to win this ride? 🚀", instruction_1: "Choose your number from <b>0000 to 9999</b> (lucky number, dog's birthday, whatever).", instruction_2: "Make your reservation and send us the receipt via WhatsApp.", instruction_3: "That's it! You are registered for weekly prizes and the motorcycle.", colors: "Colors:", free: "Free", reserved: "Reserved", paid: "Paid", main_prize: "Pulzar NS400Z or $25,000,000 Cash", ticket: "Ticket", final_draw: "Final Draw:", lottery: "Santander Lottery Grand Prize", weekly_prize: "$1,000,000 Weekly", until: "until Dec 18th", progress: "Raffle Progress", time_left: "Time Left", next_weekly: "Next Weekly Draw", completed_tickets: "Completed tickets", total: "Total", tickets_24h: "tickets reserved/paid in the last 24 hours. Don't miss out!", select_numbers: "Select your Numbers (0000-9999)👍", show_all: "Show All", grid: "Grid", testimonials_title: "Deliveries and Testimonials 📹", faq_title: "What you need to know 📜⚡", faq_1_q: "📅 When do I win this ride? (Final Draw)", faq_1_a: "The day of truth is <b>December 25, 2026</b> with the Santander Lottery. If your ticket says 🔴 <b>PAID</b>, keep your fingers crossed! 🤞🔥", faq_2_q: "📌 Do I have to be glued to the screen to win?", faq_2_a: "Not at all! If you win, we will call you immediately. Just keep your phone charged. 📲🏆", faq_3_q: "🧾 How do I know my purchase was saved?", faq_3_a: "No fairy tales. As soon as you send your receipt, the system registers your number digitally and it turns red. 100% transparent. ✔️🧾", faq_4_q: "🎫 Can I buy a combo of numbers?", faq_4_a: "Obviously! Taking 1 is fine, but 3, 5, or 10 gets you closer to the engine. 😎🎟️", faq_5_q: "🚦 What do the colored lights mean?", faq_5_a: "🟩 <b>Free:</b> Grab it before it's gone!<br>🟨 <b>Reserved:</b> Someone booked it but hasn't paid.<br>🔴 <b>Paid:</b> Ticket secured and ready for the prize! 🎯", faq_6_q: "🚚 If I win, how is it delivered?", faq_6_a: "Delivered with all documents, keys in hand, ready to start. 🏍️💨✨", faq_7_q: "⭐ How secure is this?", faq_7_a: "The system automatically saves reservations. You can check past winners. Everything is legal and transparent! 🔐🤝", contact_dev: "Developer Direct Contact", legal: "Legal & Credits", total_to_pay: "Total to Pay", participate_now: "Participate Now", confirm_reservation: "Confirm Reservation", about_to_reserve: "You are about to reserve numbers:", reserve_warning: "Fill in your details so we can contact you. Reservation lasts 2 hours.", payment_accounts: "Payment Accounts:", full_name: "Full Name:", contact_phone: "Contact Phone (WhatsApp):", promo_code: "Promo Code (Optional):", reserve_and_wa: "RESERVE AND SEND WHATSAPP", referral_msg: "Your active referral link:" },
    pt: { admin_access: "🔒 Acesso de Administrador", email: "Email:", password: "Senha:", login: "Entrar", query_title: "🔍 Meus Bilhetes", query_desc: "Digite seu WhatsApp para ver suas reservas e pagamentos.", phone: "Telefone (WhatsApp):", search_tickets: " Buscar Bilhetes", history_winners: "Histórico de Vencedores", loading: "Aquecendo motores", theme: "Tema", my_tickets: "Meus Bilhetes", history: "Histórico", select_visual: "Selecione seu estilo:", custom_color: "Cor Personalizada:", how_to_win: "Como ganhar essa máquina? 🚀", instruction_1: "Escolha seu número de <b>0000 a 9999</b>.", instruction_2: "Faça sua reserva e envie o comprovante pelo WhatsApp.", instruction_3: "E pronto! Você concorre aos prêmios semanais e à moto.", colors: "Cores:", free: "Livre", reserved: "Reservado", paid: "Pago", main_prize: "Pulzar NS400Z ou $25.000.000 em Dinheiro", ticket: "Bilhete", final_draw: "Sorteio Final:", lottery: "Prêmio Maior Loteria Santander", weekly_prize: "$1.000.000 Semanais", until: "até 18 de Dez", progress: "Progresso da Rifa", time_left: "Tempo Restante", next_weekly: "Próximo Semanal", completed_tickets: "Rifas completas", total: "Total", tickets_24h: "bilhetes reservados/pagos nas últimas 24 horas. Garanta o seu!", select_numbers: "Selecione seus Números (0000-9999)👍", show_all: "Mostrar Todos", grid: "Grade", testimonials_title: "Entregas e Depoimentos 📹", faq_title: "O que você precisa saber 📜⚡", faq_1_q: "📅 Quando ganho? (Sorteio final)", faq_1_a: "O dia da verdade é <b>25 de Dezembro de 2026</b>. Se seu bilhete diz 🔴 <b>PAGO</b>, cruze os dedos! 🤞🔥", faq_2_q: "📌 Preciso estar online para ganhar?", faq_2_a: "Não! Se ganhar, te ligamos imediatamente. 📲🏆", faq_3_q: "🧾 Como sei que minha compra foi salva?", faq_3_a: "O sistema registra digitalmente e fica vermelho. Transparente e legal. ✔️🧾", faq_4_q: "🎫 Posso comprar vários?", faq_4_a: "Óbvio! 3, 5 ou 10 te deixam mais perto da moto. 😎🎟️", faq_5_q: "🚦 O que significam as cores?", faq_5_a: "🟩 <b>Livre:</b> Aproveite!<br>🟨 <b>Reservado:</b> Alguém reservou mas não pagou.<br>🔴 <b>Pago:</b> Bilhete garantido! 🎯", faq_6_q: "🚚 Se ganhar, como entregam?", faq_6_a: "Entregamos com documentos, chaves na mão, pronta para rodar. 🏍️💨✨", faq_7_q: "⭐ É seguro?", faq_7_a: "O sistema salva automaticamente. Tudo é legal e transparente! 🔐🤝", contact_dev: "Contato Direto Desenvolvedor", legal: "Legal & Créditos", total_to_pay: "Total a Pagar", participate_now: "Participar Agora", confirm_reservation: "Confirmar Reserva", about_to_reserve: "Você está prestes a reservar os números:", reserve_warning: "Preencha seus dados para contato. Reserva dura 2 horas.", payment_accounts: "Contas de Pagamento:", full_name: "Nome Completo:", contact_phone: "Telefone de Contato:", promo_code: "Código Promocional:", reserve_and_wa: "RESERVAR E ENVIAR WHATSAPP", referral_msg: "Seu link de indicação ativo:" }
};

document.addEventListener("DOMContentLoaded", () => {
    loadSavedPreferences();
    initTimers();
    setupEventListeners();
    handleReferral();
    if(window.Notification) Notification.requestPermission();
    
    const localData = localStorage.getItem('boletasBackup');
    if (localData) {
        const parsed = JSON.parse(localData);
        window.appData.tickets = parsed;
        ui.initUI(parsed);
    }
    
    initializeDatabase().then(() => {
        startRealtimeListener();
        setTimeout(() => {
            document.getElementById('splash-screen').classList.add('fade-out');
            document.getElementById('app-content').classList.remove('hidden');
        }, 1500);
    });
});

function applyTranslation(lang) {
    const dict = I18N[lang] || I18N['es'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerHTML = dict[key];
    });
}

function handleReferral() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('rifa_referral', ref);
    
    const storedRef = localStorage.getItem('rifa_referral_code');
    if (!storedRef) {
        const newRef = Math.random().toString(36).substr(2, 6).toUpperCase();
        localStorage.setItem('rifa_referral_code', newRef);
    }
    const myRef = localStorage.getItem('rifa_referral_code');
    const input = document.getElementById('referral-link-input');
    const container = document.getElementById('referral-link-container');
    if(input && container) {
        input.value = `${window.location.origin}${window.location.pathname}?ref=${myRef}`;
        container.classList.remove('hidden');
    }
}

function loadSavedPreferences() {
    const savedTheme = localStorage.getItem('rifa_theme');
    if (savedTheme) ui.setTheme(savedTheme);
    
    const isCompact = localStorage.getItem('rifa_grid_compact');
    if (isCompact === 'true') {
        const grid = document.getElementById('grid-boletas');
        if(grid) grid.classList.add('grid-compact');
    }
    
    const customHex = localStorage.getItem('rifa_custom_hex');
    if (customHex) {
        document.documentElement.style.setProperty('--color-primary-theme', customHex);
        const cp = document.getElementById('custom-hex-color');
        if(cp) cp.value = customHex;
    }
    
    const savedLang = localStorage.getItem('rifa_lang') || 'es';
    const langSelect = document.getElementById('lang-selector');
    if (langSelect) {
        langSelect.value = savedLang;
        applyTranslation(savedLang);
    }
}

function initializeDatabase() {
    return get(dbRef(db, 'boletas')).then(snapshot => {
        if (!snapshot.exists()) {
            const initialData = {};
            for (let i = 0; i < TOTAL_BOLETAS; i++) {
                initialData[i] = { id: i, num: i.toString().padStart(4, '0'), status: 'libre', owner: null, phone: null, reservationTimestamp: null, referral: null };
            }
            return set(dbRef(db, 'boletas'), initialData);
        } else {
            const data = snapshot.val();
            const currentLength = Object.keys(data).length;
            if (currentLength < TOTAL_BOLETAS) {
                const updates = {};
                for (let i = currentLength; i < TOTAL_BOLETAS; i++) {
                    updates[i] = { id: i, num: i.toString().padStart(4, '0'), status: 'libre', owner: null, phone: null, reservationTimestamp: null, referral: null };
                }
                return update(dbRef(db, 'boletas'), updates);
            }
        }
        return Promise.resolve();
    });
}

function cleanExpiredReservations(currentData) {
    if (!window.appData.currentUser) return;
    let updates = {};
    const now = Date.now();
    Object.keys(currentData).forEach(key => {
        const b = currentData[key];
        if (b.status === 'reservado' && b.reservationTimestamp && (now - b.reservationTimestamp > EXPIRATION_TIME_MS)) {
            updates[key] = { ...b, status: 'libre', owner: null, phone: null, reservationTimestamp: null, receiptUrl: null, referral: null };
        }
    });
    if (Object.keys(updates).length > 0) update(dbRef(db, 'boletas'), updates);
}

function startRealtimeListener() {
    onValue(dbRef(db, 'boletas'), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            cleanExpiredReservations(data);
            const arr = Object.values(data).sort((a, b) => a.id - b.id);
            window.appData.tickets = arr;
            localStorage.setItem('boletasBackup', JSON.stringify(arr));
            ui.initUI(arr);
            admin.initAdmin(arr);
        }
    });
}

onAuthStateChanged(auth, (user) => {
    window.appData.currentUser = user;
    const adminBtn = document.getElementById('btn-admin');
    if (adminBtn) {
        if (user) {
            adminBtn.innerHTML = '<i class="fas fa-lock"></i> Salir Admin';
            adminBtn.onclick = () => { signOut(auth).then(() => { utils.toast('Sesión cerrada', 'warning'); }); };
        } else {
            adminBtn.innerHTML = '<i class="fas fa-user-lock"></i> Admin';
            adminBtn.onclick = () => ui.toggleModal('modal-admin-login', true);
        }
    }
});

function setupEventListeners() {
    document.getElementById('lang-selector').addEventListener('change', (e) => {
        const lang = e.target.value;
        localStorage.setItem('rifa_lang', lang);
        applyTranslation(lang);
    });

    document.getElementById('custom-hex-color').addEventListener('input', (e) => {
        const val = e.target.value;
        document.documentElement.style.setProperty('--color-primary-theme', val);
        localStorage.setItem('rifa_custom_hex', val);
    });

    document.getElementById('btn-copy-referral').addEventListener('click', () => {
        const el = document.getElementById('referral-link-input');
        el.select();
        document.execCommand('copy');
        utils.toast('Enlace de referido copiado', 'success');
    });

    document.getElementById('btn-theme-toggle').onclick = () => {
        const panel = document.getElementById('theme-selector-panel');
        panel.classList.toggle('hidden');
    };
    
    document.getElementById('btn-grid-toggle').onclick = () => ui.toggleGridMode();
    document.getElementById('btn-public-query').onclick = () => ui.toggleModal('modal-public-query', true);
    
    const queryForm = document.getElementById('public-query-form');
    queryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('query-phone').value.trim();
        const results = window.appData.tickets.filter(t => t.phone === phone);
        const resDiv = document.getElementById('public-query-results');
        resDiv.classList.remove('hidden');
        if(results.length === 0) {
            resDiv.innerHTML = '<p class="error-text">No se encontraron boletas con ese número.</p>';
        } else {
            let badge = '';
            if (results.length === 1) badge = '<span class="badge-gamification badge-bronze">Bronce</span>';
            else if (results.length >= 3 && results.length <= 5) badge = '<span class="badge-gamification badge-silver">Plata</span>';
            else if (results.length >= 6) badge = '<span class="badge-gamification badge-gold">Oro</span>';
            
            const certBtnHtml = results.some(t => t.status === 'pagado') ? `<button class="btn-nav" onclick="window.appModules.utils.generateCertificatePDF('${results[0].owner}', '${phone}')" style="margin-top: 10px; width: 100%;"><i class="fas fa-file-pdf"></i> Descargar Certificado</button>` : '';

            const lines = results.map(t => `Boleta ${t.num} - ${t.status.toUpperCase()}`).join('<br>');
            resDiv.innerHTML = `<div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;"><strong>${results[0].owner || 'Cliente'}</strong> ${badge}<hr style="margin:8px 0; border-color: rgba(255,255,255,0.1);">${lines}${certBtnHtml}</div>`;
        }
    });

    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fails = parseInt(localStorage.getItem('admin_fails') || '0');
            const blockUntil = parseInt(localStorage.getItem('admin_block') || '0');
            
            if (Date.now() < blockUntil) {
                document.getElementById('login-error-message').textContent = `Bloqueado. Intenta en ${Math.ceil((blockUntil - Date.now())/60000)} mins.`;
                return;
            }

            const email = document.getElementById('admin-email').value;
            const pass = document.getElementById('admin-password').value;
            signInWithEmailAndPassword(auth, email, pass).then(() => {
                localStorage.setItem('admin_fails', '0');
                ui.toggleModal('modal-admin-login', false);
                ui.toggleModal('modal-admin-panel', true);
                utils.toast('Bienvenido Admin', 'success');
                document.getElementById('admin-password').value = '';
            }).catch(() => {
                const newFails = fails + 1;
                if (newFails >= 3) {
                    localStorage.setItem('admin_block', (Date.now() + 5 * 60000).toString());
                    document.getElementById('login-error-message').textContent = "Múltiples fallos. Bloqueado por 5 minutos.";
                } else {
                    localStorage.setItem('admin_fails', newFails.toString());
                    document.getElementById('login-error-message').textContent = `Credenciales inválidas. Intentos: ${newFails}/3`;
                }
            });
        });
    }

    document.getElementById('btn-webauthn').addEventListener('click', async () => {
        try {
            const mockChallenge = new Uint8Array(32);
            window.crypto.getRandomValues(mockChallenge);
            if (!localStorage.getItem('webauthn_registered')) {
                await navigator.credentials.create({
                    publicKey: { challenge: mockChallenge, rp: { name: "Rifa Admin" }, user: { id: Uint8Array.from("ADMIN", c => c.charCodeAt(0)), name: ADMIN_EMAIL, displayName: "Administrador" }, pubKeyCredParams: [{type: "public-key", alg: -7}], authenticatorSelection: { authenticatorAttachment: "platform" }, timeout: 60000 }
                });
                localStorage.setItem('webauthn_registered', 'true');
                utils.toast('Biometría registrada. Usa este método la próxima vez.', 'success');
            } else {
                await navigator.credentials.get({ publicKey: { challenge: mockChallenge, timeout: 60000 } });
                ui.toggleModal('modal-admin-login', false);
                ui.toggleModal('modal-admin-panel', true);
                utils.toast('Acceso biométrico exitoso', 'success');
            }
        } catch (e) {
            utils.toast('Fallo en autenticación biométrica', 'error');
        }
    });

    const searchInput = document.getElementById('search-number');
    const filterStatus = document.getElementById('filter-status');
    if(searchInput) searchInput.addEventListener('input', ui.generarBoletas);
    if(filterStatus) filterStatus.addEventListener('change', ui.generarBoletas);

    document.getElementById('btn-participar-main').addEventListener('click', () => {
        const ids = ui.getSelectedIds();
        if(ids.length === 0) return utils.toast('Selecciona números primero', 'error');
        const nums = ids.map(id => window.appData.tickets[id].num).join(', ');
        document.getElementById('client-modal-numbers').textContent = nums;
        ui.toggleModal('modal-cliente-confirm', true);
    });

    const confirmClientForm = document.getElementById('client-confirm-form');
    confirmClientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = utils.sanitizeHTML(document.getElementById('client-name').value);
        const telefono = utils.sanitizeHTML(document.getElementById('client-phone').value);
        const cuponInput = document.getElementById('client-coupon').value.trim().toUpperCase();
        const refSrc = localStorage.getItem('rifa_referral');
        
        if (!utils.validateColombianPhone(telefono)) {
            utils.toast('Ingresa un celular oficial de Colombia válido', 'error');
            return;
        }

        const btnSubmit = confirmClientForm.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Procesando...";

        const ids = ui.getSelectedIds();
        let updates = {};
        const reservationTime = Date.now();
        const transactionId = Math.random().toString(36).substr(2, 9).toUpperCase();

        ids.forEach(id => {
            if (window.appData.tickets[id].status !== 'libre') return;
            updates[`boletas/${id}`] = { id: id, num: window.appData.tickets[id].num, status: 'reservado', owner: nombre, phone: telefono, reservationTimestamp: reservationTime, referral: refSrc || null };
        });

        if (Object.keys(updates).length === 0) {
            utils.toast('Algunos números ya fueron tomados', 'error');
            ui.clearSelection();
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i class="fab fa-whatsapp"></i> RESERVAR Y ENVIAR WHATSAPP`;
            return;
        }

        try {
            await update(dbRef(db), updates);
            
            let total = Object.keys(updates).length * 35000;
            if (CUPONES[cuponInput]) {
                const desc = total * CUPONES[cuponInput];
                total -= desc;
                utils.toast(`Cupón aplicado: -${desc}`, 'success');
            }

            const numsStr = Object.values(updates).map(u => u.num).join(', ');
            await utils.generateReceiptPDF(nombre, telefono, numsStr, total, new Date().toLocaleString(), transactionId);
            
            utils.schedulePushNotification(reservationTime + EXPIRATION_TIME_MS - (15 * 60 * 1000), "Tus boletas expirarán en 15 minutos. ¡Confirma tu pago!");

            if(typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            
            const msg = `*✅ Moto Pulzar NS400Z - TRANSACCION ${transactionId}*\n\nHola, soy *${nombre}*. Tel: *${telefono}*.\n\n*🎫 Números:* ${numsStr}\n*💰 Total:* ${utils.formatMoney(total)}\n\n⚠️ *A continuación te adjunto mi comprobante de pago e PDF.*`;            
            const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
            
            ui.toggleModal('modal-cliente-confirm', false);
            setTimeout(() => window.open(waUrl, '_blank'), 1000);
            
            ui.clearSelection();
            confirmClientForm.reset();
        } catch(error) {
            utils.toast('Error al confirmar reserva', 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i class="fab fa-whatsapp"></i> RESERVAR Y ENVIAR WHATSAPP`;
        }
    });

    document.getElementById('btn-assign-manual').addEventListener('click', () => { ui.toggleModal('modal-admin-panel', false); ui.toggleModal('modal-assign-manual', true); });
    document.getElementById('btn-download-data').addEventListener('click', () => { ui.toggleModal('modal-admin-panel', false); ui.toggleModal('modal-export-advanced', true); });
    document.getElementById('btn-live-roulette').addEventListener('click', () => { ui.toggleModal('modal-admin-panel', false); ui.toggleModal('modal-live-roulette', true); });

    const manualAction = (status) => {
        const num = document.getElementById('manual-num').value.padStart(4, '0');
        const name = document.getElementById('manual-name').value;
        const phone = document.getElementById('manual-phone').value;
        const ticket = window.appData.tickets.find(t => t.num === num);
        if(!ticket) return utils.toast('Número inválido', 'error');
        update(dbRef(db, `boletas/${ticket.id}`), { status: status, owner: name, phone: phone, reservationTimestamp: status === 'reservado' ? Date.now() : null }).then(() => {
            admin.logAudit('ASIGNACION_MANUAL', `Boleta ${num} asigada como ${status} a ${name}`, window.appData.currentUser.email);
            utils.toast(`Boleta ${num} actualizada`, 'success');
            document.getElementById('form-assign-manual').reset();
            ui.toggleModal('modal-assign-manual', false);
            ui.toggleModal('modal-admin-panel', true);
        });
    };
    
    document.getElementById('btn-manual-pagar').onclick = () => manualAction('pagado');
    document.getElementById('btn-manual-reservar').onclick = () => manualAction('reservado');
    
    document.getElementById('btn-reset-data').addEventListener('click', () => {
        if(prompt('Escribe "CONFIRMAR" para borrar TODAS las boletas') === 'CONFIRMAR') {
            const initialData = {};
            for (let i = 0; i < TOTAL_BOLETAS; i++) {
                initialData[i] = { id: i, num: i.toString().padStart(4, '0'), status: 'libre', owner: null, phone: null, reservationTimestamp: null, referral: null };
            }
            set(dbRef(db, 'boletas'), initialData).then(() => {
                admin.logAudit('RESET_TOTAL', 'Base de datos reiniciada', window.appData.currentUser.email);
                utils.toast('Base de datos reiniciada', 'error');
            });
        }
    });

    document.getElementById('btn-ganadores').onclick = () => {
        ui.toggleModal('modal-ganadores', true);
        const adminSection = document.getElementById('admin-ganadores-section');
        if (window.appData.currentUser) adminSection.classList.remove('hidden');
        else adminSection.classList.add('hidden');
    };

    document.getElementById('form-registrar-ganador').addEventListener('submit', (e) => {
        e.preventDefault();
        const num = document.getElementById('ganador-num').value.padStart(4, '0');
        const premio = document.getElementById('ganador-premio').value;
        push(dbRef(db, 'ganadores'), { num, premio, fecha: new Date().toLocaleDateString() }).then(() => {
            utils.toast('Ganador registrado', 'success');
            document.getElementById('form-registrar-ganador').reset();
        });
    });

    onValue(dbRef(db, 'ganadores'), (snapshot) => {
        const lista = document.getElementById('lista-ganadores');
        if (!lista) return;
        lista.innerHTML = '';
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.values(data).reverse().forEach(g => {
                lista.innerHTML += `<div style="background: rgba(255,255,255,0.05); padding: 12px; margin-top: 10px; border-radius: 6px; border-left: 4px solid var(--color-primary-theme);"><strong style="font-size: 1.1rem;">Boleta Ganadora: ${g.num}</strong><br>Premio: <span style="color: var(--color-primary-theme);">${g.premio}</span><br><small style="color: rgba(255,255,255,0.5);">${g.fecha}</small></div>`;
            });
        } else {
            lista.innerHTML = '<p style="text-align: center; opacity: 0.7;">No hay ganadores registrados ainda.</p>';
        }
    });

    const audio = document.getElementById('ambient-audio');
    const btnAudio = document.getElementById('btn-audio-toggle');
    if(audio && btnAudio) {
        btnAudio.addEventListener('click', () => {
            if(audio.paused) { audio.play(); btnAudio.innerHTML = '<i class="fas fa-volume-up"></i>'; }
            else { audio.pause(); btnAudio.innerHTML = '<i class="fas fa-volume-mute"></i>'; }
        });
    }

    const chatHeader = document.getElementById('chat-header-toggle');
    const chatWidget = document.getElementById('chat-widget');
    if (chatHeader && chatWidget) {
        chatHeader.addEventListener('click', () => { chatWidget.classList.toggle('collapsed'); });
    }

    const btnSendChat = document.getElementById('btn-send-chat');
    if (btnSendChat) {
        btnSendChat.addEventListener('click', () => {
            const input = document.getElementById('chat-input');
            const msg = input.value.trim();
            if(msg) {
                const localId = localStorage.getItem('rifa_local_id') || Math.random().toString(36).substr(2, 9);
                localStorage.setItem('rifa_local_id', localId);
                const role = window.appData.currentUser ? 'admin' : 'user';
                push(dbRef(db, `chats/${localId}`), { text: msg, role: role, time: Date.now() });
                input.value = '';
            }
        });
        const localId = localStorage.getItem('rifa_local_id');
        if(localId) {
            onValue(dbRef(db, `chats/${localId}`), (snapshot) => {
                const box = document.getElementById('chat-messages');
                if(!box) return;
                box.innerHTML = '';
                if (snapshot.exists()) {
                    Object.values(snapshot.val()).sort((a,b) => a.time - b.time).forEach(m => {
                        const div = document.createElement('div');
                        div.className = `chat-msg ${m.role}`;
                        div.textContent = m.text;
                        box.appendChild(div);
                    });
                    box.scrollTop = box.scrollHeight;
                }
            });
        }
    }
}

function initTimers() {
    const timerFinal = document.getElementById('timer-final');
    const timerSemanal = document.getElementById('timer-semanal');
    setInterval(() => {
        const now = Date.now();
        const fFinal = new Date('2026-12-25T22:00:00').getTime();
        if (timerFinal) {
            const dFinal = fFinal - now;
            if (dFinal > 0) {
                const d = Math.floor(dFinal / (1000 * 60 * 60 * 24));
                const h = Math.floor((dFinal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((dFinal % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((dFinal % (1000 * 60)) / 1000);
                timerFinal.innerHTML = `${d}D ${h.toString().padStart(2, '0')}H ${m.toString().padStart(2, '0')}M ${s.toString().padStart(2, '0')}S`;
            } else { timerFinal.innerHTML = "¡SORTEO FINALIZADO!"; }
        }
        
        const fLimiteSemanal = new Date('2026-12-18T22:00:00').getTime();
        let pSemanal = new Date();
        pSemanal.setHours(22, 0, 0, 0);
        while (pSemanal.getDay() !== 5 || pSemanal.getTime() <= now) { pSemanal.setDate(pSemanal.getDate() + 1); }
        if (timerSemanal) {
            if (now > fLimiteSemanal) timerSemanal.innerHTML = "¡FINALIZADOS!";
            else {
                const dSemanal = pSemanal.getTime() - now;
                if (dSemanal > 0) {
                    const d = Math.floor(dSemanal / (1000 * 60 * 60 * 24));
                    const h = Math.floor((dSemanal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const m = Math.floor((dSemanal % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((dSemanal % (1000 * 60)) / 1000);
                    timerSemanal.innerHTML = `${d}D ${h.toString().padStart(2, '0')}H ${m.toString().padStart(2, '0')}M ${s.toString().padStart(2, '0')}S`;
                }
            }
        }
    }, 1000);
}
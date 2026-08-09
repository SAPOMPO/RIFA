import { app, auth, db, storage } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref as dbRef, get, set, update, onValue, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

import * as ui from './boletas-ui.js';
import * as admin from './admin.js';
import * as utils from './utils.js';

window.appData = { currentUser: null, tickets: [] };
window.appModules = { ui, admin, utils };

const TOTAL_BOLETAS = 1000;
const EXPIRATION_TIME_MS = 2 * 60 * 60 * 1000;
const WHATSAPP_NUMBER = "3219637388";

document.addEventListener("DOMContentLoaded", () => {
    loadSavedPreferences();
    initTimers();
    setupEventListeners();
    
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

function loadSavedPreferences() {
    const savedTheme = localStorage.getItem('rifa_theme');
    if (savedTheme) ui.setTheme(savedTheme);
    
    const isCompact = localStorage.getItem('rifa_grid_compact');
    if (isCompact === 'true') {
        const grid = document.getElementById('grid-boletas');
        if(grid) grid.classList.add('grid-compact');
    }
}

function initializeDatabase() {
    return get(dbRef(db, 'boletas')).then(snapshot => {
        if (!snapshot.exists()) {
            const initialData = {};
            for (let i = 0; i < TOTAL_BOLETAS; i++) {
                const numStr = i.toString().padStart(3, '0');
                initialData[i] = { id: i, num: numStr, status: 'libre', owner: null, phone: null, reservationTimestamp: null };
            }
            return set(dbRef(db, 'boletas'), initialData);
        }
        return Promise.resolve();
    });
}

function cleanExpiredReservations(currentData) {
    let updates = {};
    const now = Date.now();
    Object.keys(currentData).forEach(key => {
        const b = currentData[key];
        if (b.status === 'reservado' && b.reservationTimestamp && (now - b.reservationTimestamp > EXPIRATION_TIME_MS)) {
            updates[key] = { ...b, status: 'libre', owner: null, phone: null, reservationTimestamp: null, receiptUrl: null };
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
            adminBtn.onclick = () => {
                signOut(auth).then(() => { utils.toast('Sesión cerrada', 'warning'); });
            };
        } else {
            adminBtn.innerHTML = '<i class="fas fa-user-lock"></i> Admin';
            adminBtn.onclick = () => ui.toggleModal('modal-admin-login', true);
        }
    }
});

function setupEventListeners() {
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
            const lines = results.map(t => `Boleta ${t.num} - ${t.status.toUpperCase()}`).join('<br>');
            resDiv.innerHTML = `<div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">${lines}</div>`;
        }
    });

    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const pass = document.getElementById('admin-password').value;
            signInWithEmailAndPassword(auth, email, pass).then(() => {
                ui.toggleModal('modal-admin-login', false);
                ui.toggleModal('modal-admin-panel', true);
                utils.toast('Bienvenido Admin', 'success');
                document.getElementById('admin-password').value = '';
            }).catch(() => {
                document.getElementById('login-error-message').textContent = "Credenciales inválidas";
            });
        });
    }

    document.getElementById('search-number').addEventListener('input', ui.generarBoletas);
    document.getElementById('filter-status').addEventListener('change', ui.generarBoletas);

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
        const fileInput = document.getElementById('client-receipt');
        
        if (!utils.validateColombianPhone(telefono)) {
            utils.toast('Ingresa un número de celular válido', 'error');
            return;
        }

        const btnSubmit = confirmClientForm.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Procesando...";

        let receiptUrl = null;
        if(fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileRef = storageRef(storage, `receipts/${Date.now()}_${telefono}_${file.name}`);
            try {
                const snapshot = await uploadBytes(fileRef, file);
                receiptUrl = await getDownloadURL(snapshot.ref);
            } catch(e) {
                utils.toast('Error subiendo comprobante', 'error');
            }
        }

        const ids = ui.getSelectedIds();
        let updates = {};
        const reservationTime = Date.now();
        const transactionId = Math.random().toString(36).substr(2, 9).toUpperCase();

        ids.forEach(id => {
            if (window.appData.tickets[id].status !== 'libre') return;
            updates[`boletas/${id}`] = {
                id: id, num: window.appData.tickets[id].num,
                status: 'reservado', owner: nombre, phone: telefono,
                reservationTimestamp: reservationTime,
                receiptUrl: receiptUrl
            };
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
            const total = Object.keys(updates).length * 25000;
            const numsStr = Object.values(updates).map(u => u.num).join(', ');
            
            await utils.generateReceiptPDF(nombre, telefono, numsStr, total, new Date().toLocaleString(), transactionId);
            
            if(typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            
            const msg = `*✅ Moto Pulzar NS400Z  - TRANSACCION ${transactionId}*\n\nHola, soy *${nombre}*. Tel: *${telefono}*.\n\n*🎫 Números:* ${numsStr}\n*💰 Total:* ${utils.formatMoney(total)}\n\n⚠️ Adjunto mi comprobante PDF y el comprobante de pago Nequi.`;
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

    document.getElementById('btn-assign-manual').addEventListener('click', () => {
        ui.toggleModal('modal-admin-panel', false);
        ui.toggleModal('modal-assign-manual', true);
    });

    document.getElementById('btn-download-data').addEventListener('click', () => {
        ui.toggleModal('modal-admin-panel', false);
        ui.toggleModal('modal-export-advanced', true);
    });

    const manualPagar = document.getElementById('btn-manual-pagar');
    const manualReservar = document.getElementById('btn-manual-reservar');
    
    const manualAction = (status) => {
        const num = document.getElementById('manual-num').value.padStart(3, '0');
        const name = document.getElementById('manual-name').value;
        const phone = document.getElementById('manual-phone').value;
        
        const ticket = window.appData.tickets.find(t => t.num === num);
        if(!ticket) return utils.toast('Número inválido', 'error');
        
        update(dbRef(db, `boletas/${ticket.id}`), {
            status: status, owner: name, phone: phone, reservationTimestamp: status === 'reservado' ? Date.now() : null
        }).then(() => {
            admin.logAudit('ASIGNACION_MANUAL', `Boleta ${num} asigada como ${status} a ${name}`, window.appData.currentUser.email);
            utils.toast(`Boleta ${num} actualizada`, 'success');
            document.getElementById('form-assign-manual').reset();
            ui.toggleModal('modal-assign-manual', false);
            ui.toggleModal('modal-admin-panel', true);
        });
    };
    
    if(manualPagar) manualPagar.onclick = () => manualAction('pagado');
    if(manualReservar) manualReservar.onclick = () => manualAction('reservado');
    
    document.getElementById('btn-reset-data').addEventListener('click', () => {
        if(prompt('Escribe "CONFIRMAR" para borrar TODAS las boletas') === 'CONFIRMAR') {
            const initialData = {};
            for (let i = 0; i < TOTAL_BOLETAS; i++) {
                initialData[i] = { id: i, num: i.toString().padStart(3, '0'), status: 'libre', owner: null, phone: null, reservationTimestamp: null };
            }
            set(dbRef(db, 'boletas'), initialData).then(() => {
                admin.logAudit('RESET_TOTAL', 'Toda la base de datos fue reiniciada', window.appData.currentUser.email);
                utils.toast('Base de datos reiniciada', 'error');
            });
        }
    });

    document.getElementById('btn-ganadores').onclick = () => {
    ui.toggleModal('modal-ganadores', true);
    const adminSection = document.getElementById('admin-ganadores-section');
    if (window.appData.currentUser) {
        adminSection.classList.remove('hidden');
    } else {
        adminSection.classList.add('hidden');
    }
};

document.getElementById('form-registrar-ganador').addEventListener('submit', (e) => {
    e.preventDefault();
    const num = document.getElementById('ganador-num').value.padStart(3, '0');
    const premio = document.getElementById('ganador-premio').value;
    const fecha = new Date().toLocaleDateString();

    push(dbRef(db, 'ganadores'), { num, premio, fecha }).then(() => {
        utils.toast('Ganador registrado exitosamente', 'success');
        document.getElementById('form-registrar-ganador').reset();
    });
});

onValue(dbRef(db, 'ganadores'), (snapshot) => {
    const lista = document.getElementById('lista-ganadores');
    if (!lista) return;
    lista.innerHTML = '';
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        Object.values(data).reverse().forEach(ganador => {
            lista.innerHTML += `<div style="background: rgba(255,255,255,0.05); padding: 12px; margin-top: 10px; border-radius: 6px; border-left: 4px solid var(--color-primary-theme);">
                <strong style="font-size: 1.1rem;">Boleta Ganadora: ${ganador.num}</strong><br>
                Premio: <span style="color: var(--color-primary-theme);">${ganador.premio}</span><br>
                <small style="color: rgba(255,255,255,0.5);">${ganador.fecha}</small>
            </div>`;
        });
    } else {
        lista.innerHTML = '<p style="text-align: center; opacity: 0.7;">No hay ganadores registrados aún.</p>';
    }
});
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
            } else {
                timerFinal.innerHTML = "¡SORTEO FINALIZADO!";
            }
        }
        
        const fLimiteSemanal = new Date('2026-12-18T22:00:00').getTime();
        let pSemanal = new Date();
        pSemanal.setHours(22, 0, 0, 0);
        while (pSemanal.getDay() !== 5 || pSemanal.getTime() <= now) { pSemanal.setDate(pSemanal.getDate() + 1); }
        if (timerSemanal) {
            if (now > fLimiteSemanal) {
                timerSemanal.innerHTML = "¡SORTEOS SEMANALES FINALIZADOS!";
            } else {
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
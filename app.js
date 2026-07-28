import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, get, set, update, onValue, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

window.appData = { currentUser: null, tickets: [] };

window.toast = function(msg, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const box = document.createElement('div');
    box.className = 'toast';
    box.textContent = msg;
    if(type === 'error') {
        box.style.borderLeftColor = 'var(--accent)';
        box.style.backgroundColor = 'rgba(255, 0, 51, 0.2)';
    } else if (type === 'warning') {
        box.style.borderLeftColor = 'var(--warning)';
        box.style.backgroundColor = 'rgba(255, 234, 0, 0.2)';
    } else {
        box.style.borderLeftColor = 'var(--primary)';
        box.style.backgroundColor = 'rgba(0, 255, 132, 0.2)';
    }
    container.appendChild(box);
    setTimeout(() => {
        box.style.transition='opacity 0.4s, transform 0.4s';
        box.style.opacity='0';
        box.style.transform='translateX(100%)';
        setTimeout(() => box.remove(), 400);
    }, 3500);
};

window.showInstructions = function() {
    alert("📢 PASOS PARA ASEGURAR TU BOLETA:\n\n1. **RESERVA:** Selecciona tu número en la cuadrícula (se pondrá en amarillo/RESERVADO).\n2. **PAGO:** Envía $25.000 COP al Nequi 321 963 7388.\n3. **CONFIRMA:** Envía el comprobante de pago al WhatsApp del Administrador (botón flotante 📞).\n4. **ESTADO:** El Administrador confirmará la transacción, y tu boleta cambiará a ROJO (PAGADO).");
};

window.checkMyTickets = function() {
    if(!window.appData.currentUser) {
        window.toast("⚠️ Necesitas ingresar para ver tus boletas.", 'warning');
        if(window.openModal) window.openModal('loginModal');
        return;
    }
    const my = window.appData.tickets.filter(t => t.owner === window.appData.currentUser.email);
    const reserved = my.filter(t => t.state === 'reserved').map(t => t.num).join(', ');
    const paid = my.filter(t => t.state === 'paid').map(t => t.num).join(', ');
    let msg = `🎟️ TUS BOLETAS REGISTRADAS (${my.length} total):\n\n`;
    msg += `⏳ RESERVADAS (PAGO PENDIENTE):\n${reserved || 'Ninguna'}\n\n`;
    msg += `✅ PAGADAS (ASEGURADAS):\n${paid || 'Ninguna'}`;
    alert(my.length ? msg : "Aún no tienes números reservados o comprados. ¡Es tu momento!");
};

window.toggleTheme = function() {
    document.body.classList.toggle('light-mode');
    window.toast("Tema cambiado", 'warning');
};

window.toggleModal = function(id, show) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.toggle('hidden', !show);
        document.body.style.overflowY = show ? 'hidden' : 'auto';
    }
};

window.signOutAdmin = function() {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión de administrador?')) {
        signOut(auth).then(() => {
            alert('✅ Sesión cerrada con éxito.');
            window.location.reload();
        }).catch((error) => {
            alert('🚫 Error al intentar cerrar sesión. Inténtalo de nuevo.');
        });
    }
};

window.liberarBoleta = function(boletaId) {
    if (!confirm(`¿Está seguro de marcar la boleta #${boletaId} como 'LIBRE'?`)) return;
    update(ref(db, 'boletas/' + boletaId), {
        status: 'libre',
        owner: null,
        phone: null,
        reservationTimestamp: null
    }).then(() => {
        alert(`✅ Boleta #${boletaId} liberada con éxito.`);
        if (typeof window.renderAdminDashboard === 'function') window.renderAdminDashboard();
    }).catch(error => {
        alert("❌ Error de Permisos. Asegúrate de haber iniciado sesión como Administrador.");
    });
};

onAuthStateChanged(auth, (user) => {
    const adminLink = document.getElementById('btn-admin');
    if (user) {
        window.appData.currentUser = user;
        if (adminLink) {
            adminLink.innerHTML = '<i class="fas fa-lock"></i> Admin (Salir)';
            adminLink.onclick = window.signOutAdmin;
        }
    } else {
        window.appData.currentUser = null;
        if (adminLink) {
            adminLink.innerHTML = '<i class="fas fa-user-lock"></i> Admin';
            adminLink.onclick = () => window.toggleModal('modal-admin-login', true);
        }
    }
});

document.addEventListener("mousemove", e => {
    document.body.style.setProperty('--x', e.clientX+'px');
    document.body.style.setProperty('--y', e.clientY+'px');
});

document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".creditos-contenido");
    if (container) container.classList.add("animar-entrada");
    let hue = 0;
    setInterval(() => {
        hue = (hue + 0.2) % 360;
        if (!document.body.classList.contains('light-mode')) {
            document.body.style.background = `linear-gradient(135deg, hsl(${hue}, 100%, 20%), hsl(${(hue + 60) % 360}, 100%, 10%))`;
        }
    }, 50);

    const contactoBtn = document.getElementById("mostrar-contacto");
    if (contactoBtn) {
        contactoBtn.addEventListener("click", () => {
            alert(`💬 Contacto del desarrollador:\n📧 Email: danielcamilo.14@outlook.com\n📱 WhatsApp: +57 322 708 6610\n🌐 Sitio web: https://danielcamiloreyflorez14-boop.github.io/RIFA/`);
        });
    }

    const textoAnimado = document.getElementById("texto-dinamico");
    const frases = [
        "Gracias por visitar este proyecto legendario 🏆",
        "Desarrollado con pasión por Daniel Camilo Rey Flórez 💻",
        "¡Apoya este proyecto compartiéndolo! 🚀"
    ];
    let fraseIndex = 0;
    let letraIndex = 0;

    function escribirFrase() {
        if (!textoAnimado) return;
        if (letraIndex < frases[fraseIndex].length) {
            textoAnimado.textContent += frases[fraseIndex].charAt(letraIndex);
            letraIndex++;
            setTimeout(escribirFrase, 50);
        } else {
            setTimeout(() => {
                textoAnimado.textContent = "";
                fraseIndex = (fraseIndex + 1) % frases.length;
                letraIndex = 0;
                escribirFrase();
            }, 2500);
        }
    }
    escribirFrase();

    const audio = new Audio('RUSO.mp3');
    document.querySelectorAll('.btn-click').forEach(el => {
        el.addEventListener('click', () => {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        });
    });

    const userNameInput = document.getElementById('userName');
    const loginTitle = document.getElementById('loginTitle');
    if (userNameInput && loginTitle) {
        userNameInput.addEventListener('input', () => {
            const name = userNameInput.value.trim();
            loginTitle.textContent = name.length > 0 ? `👋 Hola, ${name.split(' ')[0]}` : `👤 Identifícate`;
        });
    }

    const TOTAL_BOLETAS = 1000;
    const PRECIO_BOLETA = 25000;
    const MAX_SELECCION = 3;
    const WHATSAPP_NUMBER = "573219637388";
    const EXPIRATION_TIME_MS = 2 * 60 * 60 * 1000;
    
    const gridContainer = document.getElementById('grid-boletas');
    const mainContent = document.getElementById('app-content');
    const splashScreen = document.getElementById('splash-screen');
    const stickyFooter = document.getElementById('sticky-form-buy');
    const buyButton = document.getElementById('btn-participar-main');
    const totalPriceDisplay = document.getElementById('total-price');
    const countDisplay = document.getElementById('num-seleccionados-count');
    const searchInput = document.getElementById('search-number');
    const filterStatus = document.getElementById('filter-status'); 
    const confirmClientForm = document.getElementById('client-confirm-form');
    const tooltip = document.getElementById("tooltip-reserva");
    const statLibre = document.getElementById('stat-libre');
    const statReservado = document.getElementById('stat-reservado');
    const statPagado = document.getElementById('stat-pagado');

    let boletas = [];
    let seleccionActual = new Set();

    function initializeDatabase() {
        return get(ref(db, 'boletas')).then(snapshot => {
            if (!snapshot.exists()) {
                const initialData = {};
                for (let i = 0; i < TOTAL_BOLETAS; i++) {
                    const numStr = i.toString().padStart(3, '0');
                    initialData[i] = {
                        id: i,
                        num: numStr,
                        status: 'libre',
                        owner: null,
                        phone: null,
                        reservationTimestamp: null
                    };
                }
                return set(ref(db, 'boletas'), initialData);
            }
            return Promise.resolve();
        });
    }

    function cleanExpiredReservations(currentData) {
        let updates = {};
        let cleanedCount = 0;
        const now = Date.now();
        Object.keys(currentData).forEach(key => {
            const boleta = currentData[key];
            if (boleta.status === 'reservado' && boleta.reservationTimestamp) {
                if (now - boleta.reservationTimestamp > EXPIRATION_TIME_MS) {
                    cleanedCount++;
                    updates[key] = {
                        ...boleta,
                        status: 'libre',
                        owner: null,
                        phone: null,
                        reservationTimestamp: null
                    };
                }
            }
        });
        if (cleanedCount > 0) {
            update(ref(db, 'boletas'), updates);
        }
    }

    function startRealtimeListener() {
        onValue(ref(db, 'boletas'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                cleanExpiredReservations(data);
                boletas = Object.values(data).sort((a, b) => a.id - b.id);
                window.appData.tickets = boletas;
                generarBoletas(); 
                updateStats(); 
            }
        });
    }

    const clickSound = new Audio('click.mp3'); 
    clickSound.volume = 0.5;

    function playFeedback() {
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => {});
        }
        if (navigator.vibrate) navigator.vibrate(10);
    }

    function triggerConfetti() {
        if (typeof confetti !== 'function') return;
        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ['#FF0055', '#00E676', '#FFCC00'];
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }

    function animarIntro() {
        setTimeout(() => {
            if (splashScreen) splashScreen.classList.add('fade-out');
            if (mainContent) mainContent.classList.remove('hidden');
            document.body.style.overflowY = 'auto';
            setTimeout(() => {
                if (splashScreen) splashScreen.remove();
            }, 1000); 
        }, 1500); 
    }

    function generarBoletas(filter = searchInput ? searchInput.value : '', statusFilter = filterStatus ? filterStatus.value : 'todos') {
        if (!gridContainer) return;
        gridContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const boletasToShow = boletas.filter(b => {
            const normalizedFilter = filter.trim();
            const numberMatch = normalizedFilter === '' || b.num.includes(normalizedFilter.padStart(3, '0').slice(-3));
            const statusMatch = statusFilter === 'todos' || b.status === statusFilter;
            return numberMatch && statusMatch;
        });
        boletasToShow.forEach(boleta => {
            const btn = document.createElement('div');
            const isCurrentlySelected = seleccionActual.has(boleta.id);
            btn.classList.add('boleta', boleta.status);
            btn.textContent = boleta.num;
            btn.dataset.num = boleta.id;
            btn.dataset.nombre = boleta.owner || "Sin nombre";
            const statusText = document.createElement('span');
            statusText.classList.add('status-text');
            statusText.textContent = (boleta.status === 'libre') ? 'DISPONIBLE' : boleta.status.toUpperCase();
            btn.appendChild(statusText);
            if (boleta.status === 'libre' || isCurrentlySelected) {
                btn.addEventListener('click', () => handleBoletaClick(boleta.id));
            } else {
                btn.classList.add('no-click');
            }
            if (isCurrentlySelected) {
                btn.classList.remove(boleta.status);
                btn.classList.add('seleccionado');
            }
            if (tooltip) {
                btn.addEventListener("mouseenter", (e) => {
                    if (boleta.status !== "libre") {
                        tooltip.textContent = `Reservado por: ${btn.dataset.nombre}`;
                        tooltip.classList.remove("hidden");
                        tooltip.classList.add("visible");
                    }
                });
                btn.addEventListener("mousemove", (e) => {
                    tooltip.style.left = (e.pageX + 15) + "px";
                    tooltip.style.top = (e.pageY + 15) + "px";
                });
                btn.addEventListener("mouseleave", () => {
                    tooltip.classList.add("hidden");
                    tooltip.classList.remove("visible");
                });
            }
            fragment.appendChild(btn);
        });
        gridContainer.appendChild(fragment);
    }

    function handleBoletaClick(id) {
        const elemento = document.querySelector(`.boleta[data-num="${id}"]`);
        if (!elemento) return;
        if (seleccionActual.has(id)) {
            seleccionActual.delete(id);
            elemento.classList.remove('seleccionado');
            elemento.classList.add('libre');
        } else {
            if (boletas[id].status !== 'libre') return;
            if (seleccionActual.size < MAX_SELECCION) {
                playFeedback();
                seleccionActual.add(id);
                elemento.classList.remove('libre');
                elemento.classList.add('seleccionado');
            } else {
                alert(`Solo puedes seleccionar un máximo de ${MAX_SELECCION} boletas.`);
                return;
            }
        }
        updateStickyFooter();
    }

    function updateStickyFooter() {
        const count = seleccionActual.size;
        const total = count * PRECIO_BOLETA;
        if (count > 0) {
            totalPriceDisplay.textContent = `$${total.toLocaleString('es-CO')} COP`;
            countDisplay.textContent = `(${count})`;
            stickyFooter.classList.remove('hidden');
        } else {
            stickyFooter.classList.add('hidden');
        }
    }

    function updateStats() {
        const stats = boletas.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
        }, {});
        if (statLibre) statLibre.textContent = (stats['libre'] || 0).toLocaleString();
        if (statReservado) statReservado.textContent = (stats['reservado'] || 0).toLocaleString();
        if (statPagado) statPagado.textContent = (stats['pagado'] || 0).toLocaleString();
    }
    
    function startCounters() {
        const timerFinal = document.getElementById('timer-final');
        const timerSemanal = document.getElementById('timer-semanal');
        setInterval(() => {
            const now = new Date().getTime();
            const FECHA_SORTEO_FINAL = new Date('2026-01-30T22:00:00').getTime();
            const distFinal = FECHA_SORTEO_FINAL - now;
            if (timerFinal) {
                if (distFinal > 0) {
                    const d = Math.floor(distFinal / (1000 * 60 * 60 * 24));
                    const h = Math.floor((distFinal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const m = Math.floor((distFinal % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((distFinal % (1000 * 60)) / 1000);
                    timerFinal.innerHTML = `${d}D ${h.toString().padStart(2, '0')}H ${m.toString().padStart(2, '0')}M ${s.toString().padStart(2, '0')}S`;
                } else {
                    timerFinal.innerHTML = "¡SORTEO FINALIZADO!";
                }
            }
            const FECHA_LIMITE_SEMANAL = new Date('2026-01-23T22:00:00');
            let proximoSemanal = new Date();
            proximoSemanal.setHours(22, 0, 0, 0);
            while ((proximoSemanal.getDay() !== 5 || proximoSemanal.getTime() <= now) && proximoSemanal <= FECHA_LIMITE_SEMANAL) {
                proximoSemanal.setDate(proximoSemanal.getDate() + 1);
            }
            const distSemanal = proximoSemanal.getTime() - now;
            if (timerSemanal) {
                if (distSemanal > 0) {
                    const d = Math.floor(distSemanal / (1000 * 60 * 60 * 24));
                    const h = Math.floor((distSemanal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const m = Math.floor((distSemanal % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((distSemanal % (1000 * 60)) / 1000);
                    timerSemanal.innerHTML = `${d}D ${h.toString().padStart(2, '0')}H ${m.toString().padStart(2, '0')}M ${s.toString().padStart(2, '0')}S`;
                } else {
                    timerSemanal.innerHTML = "¡SORTEO SEMANAL EN CURSO!";
                }
            }
        }, 1000);
    }

    if (buyButton) {
        buyButton.addEventListener('click', () => {
            if (seleccionActual.size === 0) {
                alert("Por favor, selecciona al menos un número.");
                return;
            }
            const numeros = Array.from(seleccionActual).map(id => boletas[id].num).join(', ');
            document.getElementById('client-modal-numbers').textContent = numeros;
            window.toggleModal('modal-cliente-confirm', true);
        });
    }

    if (confirmClientForm) {
        confirmClientForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombre = document.getElementById('client-name').value.trim();
            const telefono = document.getElementById('client-phone').value.trim();
            if (!nombre || telefono.length < 8) {
                alert("Por favor, completa tus datos correctamente (Nombre y Teléfono).");
                return;
            }
            let updates = {};
            const reservationTime = Date.now(); 
            Array.from(seleccionActual).forEach(id => {
                if (boletas[id].status !== 'libre') return;
                updates[`boletas/${id}`] = {
                    id: id,
                    num: boletas[id].num,
                    status: 'reservado',
                    owner: nombre,
                    phone: telefono,
                    reservationTimestamp: reservationTime
                };
            });
            if (Object.keys(updates).length === 0) {
                 alert("Lo sentimos, algunos de los números seleccionados acaban de ser reservados. Por favor, selecciona de nuevo.");
                 seleccionActual.clear();
                 updateStickyFooter();
                 generarBoletas();
                 return;
            }
            update(ref(db), updates).then(() => {
                const arrUpdates = Object.values(updates);
                const numeros = arrUpdates.map(u => u.num).join(', ');
                const total = arrUpdates.length * PRECIO_BOLETA;
                const totalFormatted = total.toLocaleString('es-CO');
                const mensaje = `*✅ RESERVA DE BOLETAS - RIFA CR4*\n\nHola, mi nombre es *${nombre}* y mi número de contacto es *${telefono}*. He reservado las siguientes boletas para la rifa de la Moto CR4:\n\n*🎫 Números:* ${numeros}\n*💰 Valor Total:* $${totalFormatted} COP\n*⚠️ Esta reserva vence en 2 horas.*\nPor favor, espere ya le mando el comprobante de Nequi.`;
                const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
                triggerConfetti(); 
                window.toggleModal('modal-cliente-confirm', false); 
                setTimeout(() => { window.open(url, '_blank'); }, 1200);
                seleccionActual.clear();
                updateStickyFooter();
                confirmClientForm.reset();
            }).catch(() => alert("Hubo un error al confirmar tu reserva. Intenta de nuevo."));
        });
    }

    if (searchInput) searchInput.addEventListener('input', () => generarBoletas());
    if (filterStatus) filterStatus.addEventListener('change', () => generarBoletas());

    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            const errorMessage = document.getElementById('login-error-message');
            if (errorMessage) errorMessage.textContent = '';
            signInWithEmailAndPassword(auth, email, password).then(() => {
                window.toggleModal('modal-admin-login', false);
                window.toggleModal('modal-admin-panel', true);
                if (typeof window.renderAdminDashboard === 'function') window.renderAdminDashboard();
            }).catch(() => {
                if (errorMessage) errorMessage.textContent = "Error al iniciar sesión. Verifica el email y la contraseña.";
                document.getElementById('admin-password').value = '';
            });
        });
    }

    const btnGanadores = document.getElementById('btn-ganadores');
    if (btnGanadores) {
        btnGanadores.addEventListener('click', () => {
            window.toggleModal('modal-sorteo-history', true);
            if (typeof window.renderWinnerHistory === 'function') window.renderWinnerHistory();
        });
    }

    initializeDatabase().then(() => {
        startRealtimeListener();
        startCounters();
        animarIntro();
    });

    const tableReservadas = document.getElementById('table-reservadas');
    const tablePagadas = document.getElementById('table-pagadas');
    const formManual = document.getElementById('form-assign-manual');
    const formWinner = document.getElementById('form-register-winner');
    const tableWinnerHistoryBody = document.querySelector('#table-winner-history tbody');

    window.renderAdminDashboard = function() {
        get(ref(db, 'boletas')).then(snapshot => {
            const boletasData = snapshot.val() ? Object.values(snapshot.val()) : [];
            const pagadas = boletasData.filter(b => b.status === 'pagado');
            const reservadas = boletasData.filter(b => b.status === 'reservado');
            renderTable(tableReservadas, reservadas, 'reservado');
            renderTable(tablePagadas, pagadas, 'pagado');
            document.querySelectorAll('.btn-pagar-confirma').forEach(btn => {
                btn.onclick = () => confirmPayment(parseInt(btn.dataset.id, 10));
            });
            document.querySelectorAll('.btn-table-release').forEach(btn => {
                btn.onclick = () => window.liberarBoleta(parseInt(btn.dataset.id, 10));
            });
        });
    };

    function renderTable(tableElement, data, status) {
        if (!tableElement) return;
        const isReserved = status === 'reservado';
        let html = `<thead><tr><th>#</th><th>Cliente</th><th>Teléfono</th><th>${isReserved ? 'Acciones' : 'Acciones'}</th></tr></thead><tbody>`;
        if (data.length === 0) {
            html += `<tr><td colspan="4">No hay boletas ${status}s.</td></tr>`;
        } else {
            data.forEach(b => {
                html += `<tr><td>${b.num}</td><td>${b.owner || 'N/A'}</td><td><a href="https://wa.me/57${b.phone}" target="_blank">${b.phone || 'N/A'}</a></td><td>${isReserved ? `<button class="btn-table-confirm btn-pagar-confirma" data-id="${b.id}">PAGAR</button>` : `<button class="btn-table-release" data-id="${b.id}">LIBERAR</button>`}</td></tr>`;
            });
        }
        html += '</tbody>';
        tableElement.innerHTML = html;
    }

    function confirmPayment(id) {
        if (!confirm(`¿CONFIRMAR PAGO de la boleta #${id.toString().padStart(3, '0')}?`)) return;
        update(ref(db, 'boletas/' + id), { status: 'pagado', reservationTimestamp: null }).then(() => {
            window.renderAdminDashboard();
            alert(`✅ Boleta #${id.toString().padStart(3, '0')} marcada como PAGADA.`);
        });
    }

    const btnAssignManual = document.getElementById('btn-assign-manual');
    if (btnAssignManual) {
        btnAssignManual.addEventListener('click', () => {
            window.toggleModal('modal-admin-panel', false);
            window.toggleModal('modal-assign-manual', true);
        });
    }

    if (formManual) {
        formManual.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                e.preventDefault();
                const numInput = document.getElementById('manual-num');
                const nameInput = document.getElementById('manual-name');
                const phoneInput = document.getElementById('manual-phone');
                const num = parseInt(numInput.value, 10);
                const name = nameInput.value.trim();
                const phone = phoneInput.value.trim();
                if (isNaN(num) || num < 0 || num > 999 || !name || phone.length < 8) {
                    alert("Por favor, introduce datos válidos para la asignación.");
                    return;
                }
                let newStatus;
                if (e.target.classList.contains('btn-pagar-manual')) newStatus = 'pagado';
                else if (e.target.classList.contains('btn-reservar-manual')) newStatus = 'reservado';
                else return;
                update(ref(db, 'boletas/' + num), {
                    status: newStatus,
                    owner: name,
                    phone: phone,
                    reservationTimestamp: (newStatus === 'reservado' ? Date.now() : null)
                }).then(() => {
                    alert(`Boleta #${num.toString().padStart(3, '0')} asignada manualmente como ${newStatus.toUpperCase()}.`);
                    formManual.reset();
                    window.toggleModal('modal-assign-manual', false);
                    window.toggleModal('modal-admin-panel', true);
                    window.renderAdminDashboard();
                });
            }
        });
    }

    const btnManageSorteos = document.getElementById('btn-manage-sorteos');
    if (btnManageSorteos) {
        btnManageSorteos.addEventListener('click', () => {
            window.toggleModal('modal-admin-panel', false);
            window.toggleModal('modal-register-winner', true);
        });
    }

    if (formWinner) {
        formWinner.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('winner-date').value;
            const lottery = document.getElementById('winner-lottery').value.trim();
            const winnerNum = parseInt(document.getElementById('winner-number').value, 10);
            if (!date || !lottery || isNaN(winnerNum) || winnerNum < 0 || winnerNum > 999) {
                alert("Por favor, completa los campos correctamente.");
                return;
            }
            get(ref(db, 'boletas/' + winnerNum)).then(snapshot => {
                const boletaGanadora = snapshot.val();
                const winnerName = boletaGanadora?.owner || "NO VENDIDO / LIBRE";
                const winnerStatus = boletaGanadora?.status || "libre";
                const newWinner = {
                    date: date,
                    lottery: lottery,
                    number: winnerNum.toString().padStart(3, '0'),
                    winnerName: winnerName,
                    status: winnerStatus,
                    timestamp: Date.now()
                };
                push(ref(db, 'rifaWinners'), newWinner).then(() => {
                    alert(`🏆 ¡Ganador Registrado! Boleta #${newWinner.number} - Cliente: ${winnerName}`);
                    formWinner.reset();
                    window.toggleModal('modal-register-winner', false);
                    window.toggleModal('modal-admin-panel', true);
                });
            });
        });
    }

    window.renderWinnerHistory = function() {
        if (!tableWinnerHistoryBody) return;
        tableWinnerHistoryBody.innerHTML = '<tr><td colspan="4">Cargando historial...</td></tr>';
        get(ref(db, 'rifaWinners')).then(snapshot => {
            const winnersData = snapshot.val();
            const winners = winnersData ? Object.values(winnersData).reverse() : []; 
            let html = '';
            if (winners.length === 0) {
                html = '<tr><td colspan="4">Aún no se han registrado ganadores.</td></tr>';
            } else {
                winners.forEach(w => {
                    const statusClass = w.status === 'pagado' ? 'badge disponible' : (w.status === 'reservado' ? 'badge reservado' : 'badge pagado');
                    html += `<tr><td>${w.date}</td><td>${w.lottery}</td><td>${w.number}</td><td><span class="${statusClass}">${w.winnerName} (${w.status.toUpperCase()})</span></td></tr>`;
                });
            }
            tableWinnerHistoryBody.innerHTML = html;
        });
    };

    const btnDownloadData = document.getElementById('btn-download-data');
    if (btnDownloadData) {
        btnDownloadData.addEventListener('click', () => {
            get(ref(db, 'boletas')).then(snapshot => {
                const boletasData = snapshot.val() ? Object.values(snapshot.val()) : [];
                if (boletasData.length === 0) {
                    alert("No hay datos para exportar.");
                    return;
                }
                let csvContent = "Numero,Estado,Cliente,Telefono,TimestampReserva\n";
                boletasData.forEach(b => {
                    csvContent += `${b.num},${b.status},"${b.owner || ''}","${b.phone || ''}",${b.reservationTimestamp || ''}\n`;
                });
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `rifa_cr4_export_${new Date().toISOString().slice(0, 10)}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                alert("✅ Datos exportados con éxito.");
            }).catch(() => {
                alert("❌ ERROR DE PERMISOS. Asegúrate de haber iniciado sesión como Administrador.");
            });
        });
    }

    const btnResetData = document.getElementById('btn-reset-data');
    if (btnResetData) {
        btnResetData.addEventListener('click', () => {
            if (!confirm('🚨 ADVERTENCIA CRÍTICA: ESTO BORRARÁ TODA LA RIFA. ¿CONFIRMAR ELIMINACIÓN TOTAL?')) return;
            set(ref(db, 'boletas'), null).then(() => set(ref(db, 'rifaWinners'), null)).then(() => {
                alert('✅ Base de datos completamente borrada. La página se recargará para re-inicializar los 1000 números.');
                window.location.reload();
            }).catch(() => {
                alert("❌ ERROR DE PERMISOS. La operación fue rechazada por Firebase.");
            });
        });
    }
});

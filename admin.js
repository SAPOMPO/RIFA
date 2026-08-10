import { ref, update, push, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';
import { toast, formatMoney } from './utils.js';

let adminBoletasData = [];
const PRECIO_BOLETA = 35000;
let salesChartInstance = null;

export function initAdmin(data) {
    adminBoletasData = data;
    renderAdminTables();
    calculateFinancials();
    renderTopBuyers();
    renderChart();
    attachRouletteEvent();
}

export async function logAudit(action, details, adminEmail) {
    const logRef = push(ref(db, 'audit_logs'));
    await set(logRef, { action: action, details: details, admin: adminEmail, timestamp: Date.now() });
}

function calculateFinancials() {
    const stats = adminBoletasData.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
    }, {});
    
    const pagadasCount = stats['pagado'] || 0;
    const reservadasCount = stats['reservado'] || 0;
    const totalCount = adminBoletasData.length;
    
    document.getElementById('admin-metric-ingresos').textContent = formatMoney(pagadasCount * PRECIO_BOLETA);
    document.getElementById('admin-metric-pendiente').textContent = formatMoney(reservadasCount * PRECIO_BOLETA);
    document.getElementById('admin-metric-proyectado').textContent = formatMoney(totalCount * PRECIO_BOLETA);
}

function renderChart() {
    const ctx = document.getElementById('admin-chart-sales');
    if (!ctx) return;
    
    const stats = { libre: 0, reservado: 0, pagado: 0 };
    adminBoletasData.forEach(b => stats[b.status]++);

    if (salesChartInstance) salesChartInstance.destroy();

    salesChartInstance = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Libres', 'Reservadas', 'Pagadas'],
            datasets: [{
                label: 'Distribución de Boletas',
                data: [stats.libre, stats.reservado, stats.pagado],
                backgroundColor: ['#10b981', '#f5a623', '#be123c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

function renderTopBuyers() {
    const tbody = document.getElementById('table-top-buyers-body');
    if(!tbody) return;
    
    const buyers = {};
    adminBoletasData.forEach(b => {
        if((b.status === 'pagado' || b.status === 'reservado') && b.owner) {
            const key = b.owner + "_" + (b.phone || '');
            if(!buyers[key]) buyers[key] = { name: b.owner, phone: b.phone, count: 0 };
            buyers[key].count++;
        }
    });
    
    const sortedBuyers = Object.values(buyers).sort((a,b) => b.count - a.count).slice(0, 10);
    tbody.innerHTML = '';
    sortedBuyers.forEach(buyer => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${buyer.name}</td><td>${buyer.phone}</td><td><strong>${buyer.count}</strong></td>`;
        tbody.appendChild(tr);
    });
}

function renderAdminTables() {
    const reservadas = adminBoletasData.filter(b => b.status === 'reservado');
    const pagadas = adminBoletasData.filter(b => b.status === 'pagado');
    
    document.getElementById('count-reservadas').textContent = reservadas.length;
    document.getElementById('count-pagadas').textContent = pagadas.length;
    
    const tblReservadas = document.getElementById('table-reservadas');
    const tblPagadas = document.getElementById('table-pagadas');
    
    if (tblReservadas) tblReservadas.innerHTML = buildTableHTML(reservadas, true);
    if (tblPagadas) tblPagadas.innerHTML = buildTableHTML(pagadas, false);
    
    attachAdminEvents(tblReservadas, tblPagadas);
}

function buildTableHTML(arr, isReservada) {
    if(arr.length === 0) return '<tr><td colspan="5">No hay registros.</td></tr>';
    let html = `<thead><tr><th>Num</th><th>Cliente</th><th>Teléfono</th><th>Referido</th><th>Acciones</th></tr></thead><tbody>`;
    arr.forEach(b => {
        html += `<tr>
            <td>${b.num}</td><td>${b.owner}</td><td>${b.phone}</td><td>${b.referral || '-'}</td>
            <td>
                ${isReservada ? `<button class="btn-table-confirm admin-btn-pagar" data-id="${b.id}">Pagar</button>` : ''}
                <button class="btn-table-release admin-btn-liberar" data-id="${b.id}">Liberar</button>
            </td>
        </tr>`;
    });
    html += '</tbody>';
    return html;
}

function attachAdminEvents(t1, t2) {
    const actions = (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if(!id) return;
        
        if (target.classList.contains('admin-btn-pagar')) {
            if(confirm(`¿Confirmar pago de boleta #${id}?`)) {
                update(ref(db, `boletas/${id}`), { status: 'pagado' }).then(() => {
                    logAudit('CONFIRMAR_PAGO', `Boleta ${id} pagada`, window.appData.currentUser.email);
                    toast(`Boleta ${id} pagada`, 'success');
                });
            }
        }
        if (target.classList.contains('admin-btn-liberar')) {
            if(confirm(`¿Liberar boleta #${id}?`)) {
                update(ref(db, `boletas/${id}`), { status: 'libre', owner: null, phone: null, reservationTimestamp: null, referral: null }).then(() => {
                    logAudit('LIBERAR_BOLETA', `Boleta ${id} liberada`, window.appData.currentUser.email);
                    toast(`Boleta ${id} liberada`, 'warning');
                });
            }
        }
    };
    if (t1) t1.onclick = actions;
    if (t2) t2.onclick = actions;
}

function attachRouletteEvent() {
    const btn = document.getElementById('btn-spin-roulette');
    if(!btn) return;
    btn.onclick = () => {
        const pagadas = adminBoletasData.filter(b => b.status === 'pagado');
        if (pagadas.length === 0) return toast('No hay boletas pagadas para sortear', 'error');
        
        const wheel = document.getElementById('roulette-wheel-container');
        const info = document.getElementById('roulette-winner-info');
        btn.disabled = true;
        info.classList.add('hidden');
        
        let spins = 0;
        const interval = setInterval(() => {
            const tempIdx = Math.floor(Math.random() * pagadas.length);
            wheel.textContent = pagadas[tempIdx].num;
            spins++;
            if(spins > 30) {
                clearInterval(interval);
                const cryptoArray = new Uint32Array(1);
                window.crypto.getRandomValues(cryptoArray);
                const winIdx = cryptoArray[0] % pagadas.length;
                const winner = pagadas[winIdx];
                
                wheel.textContent = winner.num;
                info.innerHTML = `<strong>🏆 GANADOR:</strong> ${winner.owner}<br><strong>📞 TEL:</strong> ${winner.phone}`;
                info.classList.remove('hidden');
                btn.disabled = false;
                if(typeof confetti === 'function') confetti({ particleCount: 200, spread: 100 });
                logAudit('SORTEO_EN_VIVO', `Ganador ${winner.num} - ${winner.owner}`, window.appData.currentUser.email);
            }
        }, 100);
    };
}

export function exportData(format, filter) {
    let toExport = adminBoletasData;
    if(filter === 'pagadas') toExport = adminBoletasData.filter(b => b.status === 'pagado');
    
    if (format === 'json') {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(toExport));
        downloadFile(dataStr, `Respaldo_Boletas_${Date.now()}.json`);
    } else if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(toExport.map(b => ({
            ID: b.id, Numero: b.num, Estado: b.status, Cliente: b.owner || '', Telefono: b.phone || '', Referido: b.referral || ''
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Boletas");
        XLSX.writeFile(wb, `Reporte_Boletas_${Date.now()}.xlsx`);
    }
}

export async function exportLogs() {
    const snapshot = await get(ref(db, 'audit_logs'));
    if (!snapshot.exists()) return toast('No logs', 'warning');
    const logsData = snapshot.val();
    const arr = Object.keys(logsData).map(k => ({
        ID: k, Accion: logsData[k].action, Detalles: logsData[k].details, Admin: logsData[k].admin, Fecha: new Date(logsData[k].timestamp).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(arr);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");
    XLSX.writeFile(wb, `Logs_Auditoria_${Date.now()}.xlsx`);
}

function downloadFile(content, fileName) {
    const dl = document.createElement('a');
    dl.href = content;
    dl.download = fileName;
    dl.click();
}
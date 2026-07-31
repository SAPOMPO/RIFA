import { ref, update, push, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';
import { toast, formatMoney } from './utils.js';

let adminBoletasData = [];
const PRECIO_BOLETA = 25000;

export function initAdmin(data) {
    adminBoletasData = data;
    renderAdminTables();
    calculateFinancials();
    renderTopBuyers();
}

export async function logAudit(action, details, adminEmail) {
    const logRef = push(ref(db, 'audit_logs'));
    await set(logRef, {
        action: action,
        details: details,
        admin: adminEmail,
        timestamp: Date.now()
    });
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

function renderTopBuyers() {
    const tbody = document.getElementById('table-top-buyers-body');
    if(!tbody) return;
    
    const buyers = {};
    adminBoletasData.forEach(b => {
        if((b.status === 'pagado' || b.status === 'reservado') && b.owner) {
            const key = b.owner + "_" + (b.phone || '');
            if(!buyers[key]) {
                buyers[key] = { name: b.owner, phone: b.phone, count: 0 };
            }
            buyers[key].count++;
        }
    });
    
    const sortedBuyers = Object.values(buyers).sort((a,b) => b.count - a.count).slice(0, 10);
    
    tbody.innerHTML = '';
    sortedBuyers.forEach(buyer => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${buyer.name}</td>
            <td>${buyer.phone}</td>
            <td><strong>${buyer.count}</strong></td>
        `;
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
    if(arr.length === 0) return '<tr><td>No hay registros.</td></tr>';
    let html = `<thead><tr><th>Num</th><th>Cliente</th><th>Teléfono</th><th>Acciones</th></tr></thead><tbody>`;
    arr.forEach(b => {
        html += `<tr>
            <td>${b.num}</td>
            <td>${b.owner}</td>
            <td>${b.phone}</td>
            <td>
                ${isReservada ? `<button class="btn-table-confirm admin-btn-pagar" data-id="${b.id}">Confirmar Pago</button>` : ''}
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
                    logAudit('CONFIRMAR_PAGO', `Boleta ${id} marcada como pagada`, window.appData.currentUser.email);
                    toast(`Boleta ${id} pagada`, 'success');
                });
            }
        }
        if (target.classList.contains('admin-btn-liberar')) {
            if(confirm(`¿Liberar boleta #${id}? Se perderán los datos del cliente.`)) {
                update(ref(db, `boletas/${id}`), {
                    status: 'libre', owner: null, phone: null, reservationTimestamp: null
                }).then(() => {
                    logAudit('LIBERAR_BOLETA', `Boleta ${id} liberada`, window.appData.currentUser.email);
                    toast(`Boleta ${id} liberada`, 'warning');
                });
            }
        }
    };
    if (t1) t1.onclick = actions;
    if (t2) t2.onclick = actions;
}

export function exportData(format, filter) {
    let toExport = adminBoletasData;
    if(filter === 'pagadas') toExport = adminBoletasData.filter(b => b.status === 'pagado');
    
    if (format === 'json') {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(toExport));
        downloadFile(dataStr, `Respaldo_Boletas_${Date.now()}.json`);
    } else if (format === 'csv') {
        let csvContent = "data:text/csv;charset=utf-8,ID,Numero,Estado,Cliente,Telefono\n";
        toExport.forEach(row => {
            csvContent += `${row.id},${row.num},${row.status},${row.owner || ''},${row.phone || ''}\n`;
        });
        downloadFile(encodeURI(csvContent), `Reporte_Boletas_${Date.now()}.csv`);
    }
}

export async function exportLogs() {
    const snapshot = await get(ref(db, 'audit_logs'));
    if (!snapshot.exists()) {
        toast('No hay logs de auditoría registrados', 'warning');
        return;
    }
    const logsData = snapshot.val();
    let csvContent = "data:text/csv;charset=utf-8,ID,Accion,Detalles,Admin,Fecha\n";
    Object.keys(logsData).forEach(key => {
        const log = logsData[key];
        const dateStr = new Date(log.timestamp).toLocaleString();
        csvContent += `${key},${log.action},"${log.details}",${log.admin},${dateStr}\n`;
    });
    downloadFile(encodeURI(csvContent), `Logs_Auditoria_${Date.now()}.csv`);
}

function downloadFile(content, fileName) {
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", content);
    dlAnchorElem.setAttribute("download", fileName);
    dlAnchorElem.click();
}
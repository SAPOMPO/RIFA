export function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const box = document.createElement('div');
    box.className = 'toast';
    box.textContent = msg;
    if (type === 'error') {
        box.style.borderLeftColor = 'var(--accent)';
        box.style.backgroundColor = 'rgba(255, 0, 51, 0.2)';
    } else if (type === 'warning') {
        box.style.borderLeftColor = 'var(--warning)';
        box.style.backgroundColor = 'rgba(255, 234, 0, 0.2)';
    } else {
        box.style.borderLeftColor = 'var(--color-primary-theme)';
        box.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
    }
    container.appendChild(box);
    setTimeout(() => {
        box.style.transition = 'opacity 0.4s, transform 0.4s';
        box.style.opacity = '0';
        box.style.transform = 'translateX(100%)';
        setTimeout(() => box.remove(), 400);
    }, 3500);
}

export function formatMoney(amount) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        toast(`Copiado: ${text}`, 'success');
    } catch (err) {
        toast('Error al copiar al portapapeles', 'error');
    }
}

export function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

export function validateColombianPhone(phone) {
    const regex = /^3[\d]{9}$/;
    return regex.test(phone.trim());
}

export async function generateReceiptPDF(name, phone, numbersStr, total, dateStr, ticketId) {
    const container = document.getElementById('hidden-receipt-container');
    container.innerHTML = `
        <div class="pdf-receipt-template" id="receipt-to-print">
            <h1>🎫 Comprobante de Reserva CR4</h1>
            <div class="details-row"><strong>ID Transacción:</strong> ${ticketId}</div>
            <div class="details-row"><strong>Nombre:</strong> ${sanitizeHTML(name)}</div>
            <div class="details-row"><strong>Teléfono:</strong> ${sanitizeHTML(phone)}</div>
            <div class="details-row"><strong>Números Seleccionados:</strong> ${numbersStr}</div>
            <div class="details-row"><strong>Total:</strong> ${formatMoney(total)}</div>
            <div class="details-row"><strong>Fecha de Reserva:</strong> ${dateStr}</div>
            <div style="text-align: center; margin-top: 20px; font-weight: bold; color: #d32f2f;">
                LA RESERVA EXPIRA EN 2 HORAS SI NO SE CONFIRMA EL PAGO
            </div>
            <div class="qr-box" id="qr-container"></div>
        </div>
    `;
    
    new QRCode(document.getElementById("qr-container"), {
        text: `RifaCR4|ID:${ticketId}|Num:${numbersStr}|Total:${total}`,
        width: 128,
        height: 128
    });

    const element = document.getElementById('receipt-to-print');
    const opt = {
        margin: 1,
        filename: `Reserva_CR4_${ticketId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(element).save();
    container.innerHTML = '';
}
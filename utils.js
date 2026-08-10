export function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.borderLeftColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6';
    el.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(20px)';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

export function formatMoney(amount) {
    return '$' + amount.toLocaleString('es-CO') + ' COP';
}

export function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

export function validateColombianPhone(phone) {
    const regex = /^(30[0-5]|31[0-9]|32[0-4]|35[0-1])\d{7}$/;
    return regex.test(phone.replace(/\D/g, ''));
}

export function copyAndOpen(text, appTarget) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    toast('Número de cuenta copiado', 'success');
    
    setTimeout(() => {
        if(appTarget === 'nequi') window.open('https://nequi.com.co/', '_blank');
        if(appTarget === 'daviplata') window.open('https://daviplata.com/', '_blank');
        if(appTarget === 'bancolombia') window.open('https://bancolombia.com/', '_blank');
    }, 1000);
}

export async function generateReceiptPDF(name, phone, numbers, total, date, txId) {
    const container = document.getElementById('hidden-receipt-container');
    container.style.display = 'block';
    
    container.innerHTML = `
        <div class="pdf-receipt-template" id="pdf-target">
            <div class="watermark">OFF'T</div>
            <h1>RECIBO DE RESERVA</h1>
            <div class="details-row"><strong>ID Transacción:</strong> ${txId}</div>
            <div class="details-row"><strong>Cliente:</strong> ${name}</div>
            <div class="details-row"><strong>Teléfono:</strong> ${phone}</div>
            <div class="details-row"><strong>Números Reservados:</strong> ${numbers}</div>
            <div class="details-row"><strong>Total a Pagar:</strong> ${formatMoney(total)}</div>
            <div class="details-row"><strong>Fecha:</strong> ${date}</div>
            <p style="margin-top: 20px; font-size: 14px; text-align: center;">Validez de reserva: 2 horas. Envíe el comprobante al admin.</p>
            <div class="qr-box" id="qr-code-box"></div>
        </div>
    `;

    new QRCode(document.getElementById("qr-code-box"), {
        text: `TX:${txId}|TEL:${phone}|NUMS:${numbers}`,
        width: 128, height: 128
    });

    const element = document.getElementById('pdf-target');
    const opt = {
        margin: 10,
        filename: `Reserva_${txId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await window.html2pdf().set(opt).from(element).save();
    container.innerHTML = '';
    container.style.display = 'none';
}

export async function generateCertificatePDF(name, phone) {
    const container = document.getElementById('hidden-receipt-container');
    container.style.display = 'block';
    
    container.innerHTML = `
        <div class="pdf-receipt-template" id="pdf-cert-target" style="border: 10px solid #10b981; text-align: center;">
            <div class="watermark">OFICIAL</div>
            <h1 style="color: #10b981; border: none;">CERTIFICADO DE PARTICIPACIÓN</h1>
            <h2 style="margin: 30px 0;">Se otorga a:</h2>
            <h1 style="font-size: 40px; border: none; text-transform: uppercase;">${name}</h1>
            <p style="font-size: 20px; margin-top: 30px;">Por su participación oficial en la Gran Rifa de la Moto Pulzar NS400Z.</p>
            <p style="font-size: 16px; margin-top: 10px;">ID Cliente: ${phone}</p>
            <p style="font-size: 14px; margin-top: 50px;">Firma Autorizada: Admin OFF'T</p>
        </div>
    `;

    const element = document.getElementById('pdf-cert-target');
    const opt = {
        margin: 10,
        filename: `Certificado_${name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    await window.html2pdf().set(opt).from(element).save();
    container.innerHTML = '';
    container.style.display = 'none';
}

export function schedulePushNotification(timestampMs, body) {
    if (window.Notification && Notification.permission === "granted") {
        const delay = timestampMs - Date.now();
        if (delay > 0) {
            setTimeout(() => {
                new Notification("Rifa Moto Pulsar", { body: body, icon: "Logo.jpg" });
            }, delay);
        }
    }
}
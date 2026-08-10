import { toast } from './utils.js';

let boletasData = [];
let seleccionActual = new Set();
const MAX_SELECCION = 10;
let currentPage = 0;
const ITEMS_PER_PAGE = 250;

export function initUI(data) {
    boletasData = data;
    renderPagination();
    generarBoletas();
    updateStats();
    calculateProgress();
    check24hMetrics();
    initThreeJS();
}

export function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.toggle('hidden', !show);
        document.body.style.overflowY = show ? 'hidden' : 'auto';
    }
}

export function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('rifa_theme', themeName);
    toast('Tema visual actualizado', 'success');
}

export function toggleGridMode() {
    const grid = document.getElementById('grid-boletas');
    if(grid) {
        grid.classList.toggle('grid-compact');
        const isCompact = grid.classList.contains('grid-compact');
        localStorage.setItem('rifa_grid_compact', isCompact ? 'true' : 'false');
    }
}

function renderPagination() {
    const container = document.getElementById('pagination-controls');
    if (!container) return;
    container.innerHTML = '';
    
    const totalPages = Math.ceil(boletasData.length / ITEMS_PER_PAGE);
    const select = document.createElement('select');
    
    select.style.width = 'auto';
    select.style.minWidth = '220px';
    select.style.cursor = 'pointer';
    select.style.textAlign = 'center';

    for (let i = 0; i < totalPages; i++) {
        const option = document.createElement('option');
        const start = i * ITEMS_PER_PAGE;
        const end = Math.min(start + ITEMS_PER_PAGE - 1, boletasData.length - 1);
        option.value = i;
        option.textContent = `${start.toString().padStart(4, '0')} - ${end.toString().padStart(4, '0')}`;
        if (i === currentPage) option.selected = true;
        select.appendChild(option);
    }

    select.addEventListener('change', (e) => {
        currentPage = parseInt(e.target.value);
        generarBoletas();
    });

    container.appendChild(select);
}

export function generarBoletas() {
    const gridContainer = document.getElementById('grid-boletas');
    const searchInput = document.getElementById('search-number');
    const filterStatus = document.getElementById('filter-status');
    
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    const filter = searchInput ? searchInput.value.trim() : '';
    const statusF = filterStatus ? filterStatus.value : 'todos';
    
    let boletasToShow = boletasData;
    if(filter !== '' || statusF !== 'todos') {
        boletasToShow = boletasData.filter(b => {
            const numMatch = filter === '' || b.num.includes(filter);
            const statusMatch = statusF === 'todos' || b.status === statusF;
            return numMatch && statusMatch;
        });
    } else {
        const start = currentPage * ITEMS_PER_PAGE;
        boletasToShow = boletasData.slice(start, start + ITEMS_PER_PAGE);
    }

    const tooltip = document.getElementById("tooltip-reserva");

    boletasToShow.forEach(boleta => {
        const btn = document.createElement('div');
        const isSelected = seleccionActual.has(boleta.id);
        btn.className = `boleta ${boleta.status}`;
        btn.textContent = boleta.num;
        btn.dataset.num = boleta.id;
        
        const statusText = document.createElement('span');
        statusText.className = 'status-text';
        statusText.textContent = (boleta.status === 'libre') ? 'DISPONIBLE' : boleta.status.toUpperCase();
        btn.appendChild(statusText);
        
        if (boleta.status === 'libre' || isSelected) {
            btn.addEventListener('click', () => handleBoletaClick(boleta.id));
        } else {
            btn.classList.add('no-click');
        }
        
        if (isSelected) {
            btn.classList.remove(boleta.status);
            btn.classList.add('seleccionado');
        }
        
        if (tooltip && boleta.status !== 'libre') {
            btn.addEventListener("mouseenter", () => {
                tooltip.textContent = `Reservado por: ${boleta.owner || 'Usuario'}`;
                tooltip.classList.remove("hidden");
                tooltip.classList.add("visible");
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
    const el = document.querySelector(`.boleta[data-num="${id}"]`);
    if (seleccionActual.has(id)) {
        seleccionActual.delete(id);
        if(el) {
            el.classList.remove('seleccionado');
            el.classList.add('libre');
        }
    } else {
        if (boletasData[id].status !== 'libre') return;
        if (seleccionActual.size < MAX_SELECCION) {
            if (navigator.vibrate) navigator.vibrate(10);
            seleccionActual.add(id);
            if(el) {
                el.classList.remove('libre');
                el.classList.add('seleccionado');
            }
        } else {
            toast(`Máximo ${MAX_SELECCION} boletas permitidas`, 'warning');
            return;
        }
    }
    updateStickyFooter();
}

export function clearSelection() {
    seleccionActual.clear();
    updateStickyFooter();
    generarBoletas();
}

export function getSelectedIds() {
    return Array.from(seleccionActual);
}

function updateStickyFooter() {
    const stickyFooter = document.getElementById('sticky-form-buy');
    const totalPriceDisplay = document.getElementById('total-price');
    const countDisplay = document.getElementById('num-seleccionados-count');
    const count = seleccionActual.size;
    
    if (count > 0) {
        const total = count * 35000;
        totalPriceDisplay.textContent = `$${total.toLocaleString('es-CO')} COP`;
        countDisplay.textContent = `(${count})`;
        stickyFooter.classList.remove('hidden');
    } else {
        stickyFooter.classList.add('hidden');
    }
}

export function updateStats() {
    const stats = boletasData.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
    }, {});
    
    const libreEl = document.getElementById('stat-libre');
    const reservadoEl = document.getElementById('stat-reservado');
    const pagadoEl = document.getElementById('stat-pagado');
    
    if (libreEl) libreEl.textContent = (stats['libre'] || 0).toLocaleString();
    if (reservadoEl) reservadoEl.textContent = (stats['reservado'] || 0).toLocaleString();
    if (pagadoEl) pagadoEl.textContent = (stats['pagado'] || 0).toLocaleString();
}

function calculateProgress() {
    const pagadas = boletasData.filter(b => b.status === 'pagado').length;
    const pct = Math.floor((pagadas / boletasData.length) * 100);
    const bar = document.getElementById('main-progress-bar');
    const txt = document.getElementById('progress-text');
    if(bar) bar.style.width = `${pct}%`;
    if(txt) txt.textContent = pct;
}

function check24hMetrics() {
    const now = Date.now();
    const limit = now - (24 * 60 * 60 * 1000);
    const count24h = boletasData.filter(b => b.reservationTimestamp && b.reservationTimestamp > limit).length;
    const stat24h = document.getElementById('stat-24h');
    if(stat24h) stat24h.textContent = count24h;
}

function initThreeJS() {
    if(typeof THREE === 'undefined') return;
    const container = document.getElementById('threejs-canvas-container');
    if(!container) return;
    container.innerHTML = '';
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.TorusGeometry(10, 1.5, 16, 100);
    const material = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, transparent: true, opacity: 0.3 });
    const torus = new THREE.Mesh(geometry, material);
    scene.add(torus);
    
    camera.position.z = 30;

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    container.addEventListener('mousedown', () => isDragging = true);
    container.addEventListener('mouseup', () => isDragging = false);
    container.addEventListener('mousemove', (e) => {
        if(isDragging) {
            const deltaMove = { x: e.offsetX - previousMousePosition.x, y: e.offsetY - previousMousePosition.y };
            torus.rotation.x += deltaMove.y * 0.01;
            torus.rotation.y += deltaMove.x * 0.01;
        }
        previousMousePosition = { x: e.offsetX, y: e.offsetY };
    });

    const animate = function () {
        requestAnimationFrame(animate);
        if(!isDragging) {
            torus.rotation.x += 0.005;
            torus.rotation.y += 0.005;
        }
        renderer.render(scene, camera);
    };
    animate();
}
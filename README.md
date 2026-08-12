# Sistema de Rifas y Boletas Digitales

Esta plataforma fue desarrollada para facilitar la organización, venta y administración de boletas para rifas de manera directa, rápida y transparente. Permite a los usuarios elegir sus números favoritos desde cualquier dispositivo y al organizador llevar un control ordenado de cada transacción.

## Qué incluye este proyecto

El sitio está pensado para ser intuitivo tanto para quien compra como para quien administra:

- Vista pública para compradores: Interfaz clara donde los clientes ven los números disponibles, ocupados o apartados, seleccionan los que desean y completan su información de contacto.
- Panel de administración: Módulo interno para revisar los apartados, confirmar pagos, liberar números vencidos y gestionar los detalles del sorteo.
- Base de datos en tiempo real: Sincronización continua mediante Firebase para evitar que dos personas aparten el mismo número al mismo tiempo.
- Diseño adaptable: La interfaz ajusta sus elementos automáticamente para lucir bien en teléfonos celulares, tabletas y computadoras.
- Modo aplicación (PWA): Cuenta con manifest y service worker integrados para ofrecer una experiencia rápida e instalable en dispositivos móviles.

## Estructura de los archivos

A continuación se detalla la función de cada archivo principal dentro del proyecto:

- `index.html`: Página principal donde los compradores interactúan y eligen sus números.
- `app.js`: Manejo de la lógica general de la página y coordinación de eventos.
- `boletas-ui.js`: Encargado de mostrar la cuadrícula de números y actualizar los estados visuales (disponible, seleccionado, reservado o vendido).
- `admin.js`: Control del panel administrativo para confirmar comprobantes y actualizar estados de venta.
- `firebase-config.js`: Parámetros de conexión con la base de datos y servicios de Firebase.
- `utils.js`: Funciones de apoyo para validar entradas de formulario, formatear montos y manejar fechas.
- `style.css`: Estilos visuales del sitio enfocados en una navegación cómoda y botones claros.
- `sw.js` y `manifest.json`: Configuración para convertir el sitio en una aplicación instalable.

## Pasos para ponerlo a funcionar

1. Configuración de Firebase
   Abre el archivo `firebase-config.js` e ingresa las llaves correspondientes a tu proyecto en Firebase (apiKey, authDomain, projectId, etc.).

2. Personalización del sorteo
   Reemplaza la imagen del premio (`Rifa.jpg`) y el logotipo (`Logo.jpg`) por los tuyos. Luego ajusta los textos en `index.html` con la información de tu rifa (precio por boleta, fecha del sorteo y premios).

3. Publicación
   Sube la carpeta con todos los archivos a tu servicio de hosting de preferencia (como Firebase Hosting, Vercel, Netlify o un servidor tradicional). Funciona directamente en el navegador sin necesidad de instalar dependencias adicionales en el servidor.

## Consejos prácticos de mantenimiento

- Revisa con frecuencia el panel de administración para verificar los pagos recibidos y marcar las boletas como vendidas a tiempo.
- Configura adecuadamente las reglas de seguridad en Firebase para proteger la base de datos contra modificaciones no autorizadas.
- Procura mantener las imágenes optimizadas en peso para que la página cargue rápido incluso en zonas con señal débil.
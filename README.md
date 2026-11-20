# Manu Games

**Manu Games es una tienda académica de videojuegos digitales.** El proyecto permite recorrer una compra completa, desde buscar un juego hasta consultar su entrega o solicitar una devolución. El mismo sistema incluye un panel para gestionar productos, existencias, pedidos y solicitudes. La interfaz usa Angular, la API usa Node.js y los datos se guardan en SQLite.

El objetivo es demostrar cómo se relacionan las acciones del comprador con las reglas de negocio. Una compra aprobada genera un folio, actualiza el inventario y deja un movimiento consultable. Una devolución resuelta permite comprobar el resultado en el pedido, el pago, el inventario y el historial de atención.

Proyecto integrador de **Temas Selectos de Tecnología de la Información**, Universidad Autónoma de Tamaulipas, Facultad de Comercio, Administración y Ciencias Sociales de Nuevo Laredo.

## Qué puedes hacer en la tienda

| Perfil | Funciones disponibles |
| --- | --- |
| Visitante | Explorar el catálogo, buscar por nombre o inicial, aplicar filtros, comparar variantes y preparar el carrito. |
| Comprador | Crear una cuenta, registrar un domicilio de prueba, cotizar, aplicar un cupón, aceptar los términos y completar un pago simulado. |
| Operador | Consultar reportes, administrar productos y categorías, registrar ajustes de inventario, avanzar pedidos, gestionar promociones y resolver solicitudes. |

El catálogo de demostración incluye **36 referencias** distribuidas en juegos, complementos y suscripciones. Cada ficha muestra el SKU, la plataforma, el precio y la disponibilidad. La búsqueda del encabezado funciona con Enter desde cualquier pantalla. En el catálogo se pueden combinar categoría, precio, existencia y orden de resultados. Los productos que comparten una familia aparecen como variantes con precios y existencias propios.

En **Mi cuenta**, el comprador consulta el historial de pedidos, el folio, el estado de pago, la guía digital y sus solicitudes de devolución, garantía o soporte. El operador puede pedir información adicional y registrar una resolución. El panel muestra quién ejecutó los cambios y permite distinguir un ajuste administrativo de una venta o un reembolso.

## Recorrido de demostración

1. Busca **Horizonte** y abre la ficha de **Horizonte de Cobre para PC**, SKU `MG-001`.
2. Agrega dos unidades al carrito. Continúa a checkout y registra o inicia sesión con una cuenta de prueba. El carrito se conserva al cambiar de sesión.
3. Registra un domicilio ficticio y aplica el cupón `DEMO10`. Con el catálogo inicial, el subtotal es **698.00 MXN**, el descuento es **69.80 MXN** y el total es **628.20 MXN**.
4. Revisa el desglose, acepta los términos y crea el pedido. El pedido obtiene un folio y queda pendiente hasta que eliges el resultado del simulador.
5. Aprueba el pago de prueba. En una sesión distinta, entra con la cuenta administrativa y avanza el pedido por **En preparación**, **Enviado** y **Entregado**.
6. Vuelve a la cuenta compradora para consultar la guía y el código de entrega. Abre una solicitud de devolución y registra su resolución desde el panel para observar el efecto sobre pago e inventario.

Es un entorno académico con **pagos, guías y códigos digitales simulados**. La demostración utiliza cuentas, domicilios e importes de prueba.

## Cómo ejecutarlo en tu equipo

Instala **Node.js 24** con npm. Clona el repositorio o descarga una copia y abre la carpeta `Proyecto` en Visual Studio Code. Ejecuta los siguientes comandos desde esa carpeta.

```bash
npm ci
npm start
```

Abre [localhost:4200](http://localhost:4200). El arranque compila Angular, inicia la API y prepara la base y el catálogo si la instalación es nueva. Para comprobar que el servidor y SQLite responden, abre el [endpoint de salud](http://localhost:4200/api/health).

### Cuenta administrativa

Si todavía no existe `Back_End/.env`, copia el archivo de configuración de ejemplo con PowerShell.

```powershell
Copy-Item -LiteralPath Back_End/.env.example -Destination Back_End/.env
```

En `Back_End/.env`, proporciona un correo ficticio distinto al del comprador en `DEMO_ADMIN_EMAIL` y una contraseña de al menos 12 caracteres en `DEMO_ADMIN_PASSWORD`. Ejecuta `npm run db:bootstrap` desde `Proyecto` antes de arrancar el servidor. Usa esa cuenta para abrir el panel. El manual explica el arranque, las variables de entorno, el diagnóstico de errores y la restauración de una base de ensayo. [Manual en PDF](Documentos/PDF/10-Manual-de-operacion.pdf) · [Manual en Word](Documentos/Word/10-Manual-de-operacion.docx)

## Cómo se organiza el código

| Capa | Responsabilidad | Punto de entrada |
| --- | --- | --- |
| Interfaz Angular | Vistas públicas, carrito, checkout, cuenta, panel y cliente de la API. | [Componentes de la tienda](Proyecto/src/app/store) |
| Servidor Node.js | Servicio de la interfaz compilada y rutas JSON. Validación de sesión, rol, origen y CSRF. | [Servidor y módulos](Proyecto/Back_End/src) |
| Reglas de negocio | Cálculo de importes, aprobación o rechazo de pago, movimientos de inventario, entrega y atención. | [Comercio](Proyecto/Back_End/src/commerce.cjs) · [Solicitudes](Proyecto/Back_End/src/support.cjs) |
| SQLite | Catálogo, usuarios, pedidos, pagos, entregas, movimientos y auditoría. | [Esquema y reportes](Proyecto/Back_End/db) |
| Pruebas | Escenarios de integración y recorrido automatizado en navegador. | [Pruebas de la tienda](Proyecto/Back_End/test) |

El servidor calcula los importes en centavos y vuelve a comprobar precio, disponibilidad y cupón al aprobar el pago. El pedido conserva el precio, la descripción y el domicilio aceptados, incluso si esos datos se editan más adelante. La API reconoce los reintentos con la misma clave de solicitud y usa transacciones para registrar cambios de pago e inventario. El acceso a pedidos y operaciones administrativas se valida en el servidor.

El [contrato OpenAPI](Proyecto/Back_End/openapi.json) reúne **47 operaciones** de catálogo, cuenta, carrito, pedidos, pagos, solicitudes y administración. Las [consultas de reporte](Proyecto/Back_End/db/reportes.sql) permiten revisar ventas aprobadas, existencias, solicitudes y movimientos. El manual detalla cómo respaldar SQLite con cifrado y comprobar la integridad de una restauración en una ruta nueva.

## Pruebas y evidencia

Ejecuta `npm test` desde `Proyecto` para reproducir las pruebas de integración. El conjunto comprueba, entre otros casos, que dos compradores no puedan adquirir la misma última unidad, que una repetición no duplique un pedido, que cada cuenta vea sus propios folios y que se pueda restaurar la base. La evidencia publicada registra **11 pruebas aprobadas** y el recorrido en Chromium y Firefox. [Resultados y evidencias](Evidencias)

## Documentos del proyecto

Cada entregable está disponible como **Word editable** y como **PDF**. El manual es el punto de partida para ejecutar el proyecto. La presentación incluye el guion de la demostración.

| Entregable | Word | PDF |
| --- | --- | --- |
| 01 Propuesta y análisis de mercado | [Word](Documentos/Word/01-Propuesta-y-mercado.docx) | [PDF](Documentos/PDF/01-Propuesta-y-mercado.pdf) |
| 02 Requisitos y backlog | [Word](Documentos/Word/02-Requisitos-y-backlog.docx) | [PDF](Documentos/PDF/02-Requisitos-y-backlog.pdf) |
| 03 Diseño de experiencia e interfaz | [Word](Documentos/Word/03-Diseno-UX-UI.docx) | [PDF](Documentos/PDF/03-Diseno-UX-UI.pdf) |
| 04 Guía del código fuente | [Word](Documentos/Word/04-Codigo-fuente.docx) | [PDF](Documentos/PDF/04-Codigo-fuente.pdf) |
| 05 Frontend y experiencia de compra | [Word](Documentos/Word/05-Frontend-y-compra.docx) | [PDF](Documentos/PDF/05-Frontend-y-compra.pdf) |
| 06 Backend y API | [Word](Documentos/Word/06-Backend-y-API.docx) | [PDF](Documentos/PDF/06-Backend-y-API.pdf) |
| 07 Base de datos | [Word](Documentos/Word/07-Base-de-datos.docx) | [PDF](Documentos/PDF/07-Base-de-datos.pdf) |
| 08 Panel administrativo | [Word](Documentos/Word/08-Panel-administrativo.docx) | [PDF](Documentos/PDF/08-Panel-administrativo.pdf) |
| 09 Políticas y cumplimiento | [Word](Documentos/Word/09-Politicas-y-cumplimiento.docx) | [PDF](Documentos/PDF/09-Politicas-y-cumplimiento.pdf) |
| 10 Manual de instalación y operación | [Word](Documentos/Word/10-Manual-de-operacion.docx) | [PDF](Documentos/PDF/10-Manual-de-operacion.pdf) |
| 11 Plan y reporte de pruebas | [Word](Documentos/Word/11-Plan-y-reporte-de-pruebas.docx) | [PDF](Documentos/PDF/11-Plan-y-reporte-de-pruebas.pdf) |
| 12 Ficha técnica y arquitectura | [Word](Documentos/Word/12-Ficha-tecnica-y-arquitectura.docx) | [PDF](Documentos/PDF/12-Ficha-tecnica-y-arquitectura.pdf) |
| 13 Presentación y demostración | [Word](Documentos/Word/13-Presentacion-y-demostracion.docx) | [PDF](Documentos/PDF/13-Presentacion-y-demostracion.pdf) |

[Abrir todos los Word](Documentos/Word) · [Abrir todos los PDF](Documentos/PDF) · [Consultar la licencia del proyecto](Proyecto/LICENSE)

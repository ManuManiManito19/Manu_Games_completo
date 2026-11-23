# Manu Games

**Manu Games es una tienda académica de videojuegos digitales.** El proyecto permite recorrer una compra completa, desde buscar un juego hasta consultar su entrega o solicitar una devolución. El mismo sistema incluye un panel para gestionar productos, existencias, pedidos y solicitudes. La interfaz usa Angular y se comunica con la API de la tienda. Los datos se pueden guardar en Firebase Realtime Database o en una base SQLite local.

El objetivo es demostrar cómo se relacionan las acciones del comprador con las reglas de negocio. Una compra aprobada genera un folio, actualiza el inventario y deja un movimiento consultable. Una devolución resuelta permite comprobar el resultado en el pedido, el pago, el inventario y el historial de atención.

Proyecto integrador de **Temas Selectos de Tecnología de la Información**, Universidad Autónoma de Tamaulipas, Facultad de Comercio, Administración y Ciencias Sociales de Nuevo Laredo.

## Qué puedes hacer en la tienda

| Perfil | Funciones disponibles |
| --- | --- |
| Visitante | Explorar el catálogo, buscar por nombre o inicial, aplicar filtros, comparar variantes y preparar el carrito. |
| Comprador | Crear una cuenta, registrar un domicilio de prueba, cotizar, aplicar un cupón, aceptar los términos y completar un pago simulado. |
| Operador | Consultar reportes, administrar productos y categorías, registrar ajustes de inventario, avanzar pedidos, gestionar promociones y resolver solicitudes. |

El catálogo de demostración incluye **27 referencias**: **14 juegos**, **3 DLCs** y **10 complementos**. Los complementos incluyen monedas, puntos y suscripciones. Cada ficha muestra el SKU, la plataforma, el precio y la disponibilidad. La búsqueda del encabezado funciona con Enter desde cualquier pantalla. Puedes combinar categoría, precio, existencia y orden de resultados. Los productos que comparten una familia aparecen como variantes con precios y existencias propios.

La tienda usa el estilo de terminal negra con neón verde del proyecto original. Durante el registro, el comprador puede elegir uno de cinco avatares y cambiarlo después en **Mi cuenta**, donde también consulta sus pedidos, solicitudes y licencias digitales en **Mis productos**. El operador puede pedir información adicional y registrar una resolución. El panel muestra quién ejecutó los cambios y permite distinguir un ajuste administrativo de una venta o un reembolso.

## Recorrido de demostración

1. Busca **Gears 5: Hivebusters**, DLC con SKU `MG-036`. La ficha indica que requiere el juego base Gears 5.
2. Agrega dos unidades al carrito. Continúa a checkout y registra o inicia sesión con una cuenta de prueba. El carrito se conserva al cambiar de sesión.
3. Registra un domicilio ficticio y aplica el cupón `DEMO10`. Con el catálogo inicial, el subtotal es **698.00 MXN**, el descuento es **69.80 MXN** y el total es **628.20 MXN**.
4. Revisa el desglose, acepta los términos y crea el pedido. El pedido obtiene un folio y queda pendiente hasta que eliges el resultado del simulador.
5. Aprueba el pago de prueba y comprueba el resultado en **Mi cuenta → Mis productos**. En una sesión distinta, entra con la cuenta administrativa y avanza el pedido por **En preparación**, **Enviado** y **Entregado**.
6. Vuelve a la cuenta compradora para consultar la guía y el código de entrega. Abre una solicitud de devolución y registra su resolución desde el panel para observar el efecto sobre pago e inventario.

Es un entorno académico con **pagos, guías y códigos digitales simulados**. La demostración utiliza cuentas, domicilios e importes de prueba.

## Catálogo publicado en Firebase

[Abrir Manu Games en Firebase Hosting](https://manugames-d4df7.web.app). El sitio incluye las 27 fichas activas de Firestore, filtros, registro, inicio de sesión, perfil con foto y aviso de privacidad con derechos ARCO. La demostración local incluye además el carrito, los pagos de prueba, el inventario y la operación administrativa.

## Cómo ejecutarlo en tu equipo

Instala **Node.js 24** con npm. Clona este repositorio y arranca la demostración completa desde la terminal.

```bash
git clone https://github.com/ManuManiManito19/Manu_Games_completo.git
cd Manu_Games_completo
cd Proyecto
npm ci
npm run demo
```

Abre [127.0.0.1:4200](http://127.0.0.1:4200). El comando crea una base SQLite de prueba, importa los 27 productos vigentes y muestra en la terminal las credenciales administrativas generadas para esa ejecución. Registra un comprador con datos ficticios desde **Iniciar sesión → Registrarme**. Para usar el panel, abre una ventana privada y entra con la cuenta que muestra la terminal. Cada reinicio de `npm run demo` crea una base independiente.

El [endpoint de salud](http://127.0.0.1:4200/api/health) indica qué base está activa. La [guía de Firebase](Proyecto/README.md#guardar-los-datos-en-firebase) explica la conexión a Realtime Database y la publicación en Hosting con Cloud Run.

### Conservar datos entre reinicios

Para desarrollo con una base persistente, usa `npm start`. Configura una cuenta administrativa propia de prueba de la siguiente manera.

Si todavía no existe `Back_End/.env`, copia el archivo de configuración de ejemplo con PowerShell.

```powershell
Copy-Item -LiteralPath Back_End/.env.example -Destination Back_End/.env
```

En `Back_End/.env`, proporciona un correo ficticio distinto al del comprador en `DEMO_ADMIN_EMAIL` y una contraseña de al menos 12 caracteres en `DEMO_ADMIN_PASSWORD`. Ejecuta `npm run db:bootstrap` desde `Proyecto` antes de arrancar el servidor. Usa esa cuenta para abrir el panel. El manual explica el arranque, las variables de entorno, el diagnóstico de errores y la restauración de una base de ensayo. [Manual en PDF](Documentos/PDF/10-Manual-de-operacion.pdf) · [Manual en Word](Documentos/Word/10-Manual-de-operacion.docx)

## Cómo se organiza el código

| Capa | Responsabilidad | Punto de entrada |
| --- | --- | --- |
| Interfaz Angular | Vistas públicas, carrito, checkout, cuenta, panel y cliente de la API. | [Componentes de la tienda](Proyecto/src/app/store) |
| Servidor de la tienda | Servicio de la interfaz compilada y rutas JSON. Validación de sesión, rol, origen y CSRF. | [Servidor y módulos](Proyecto/Back_End/src) |
| Reglas de negocio | Cálculo de importes, aprobación o rechazo de pago, movimientos de inventario, entrega y atención. | [Comercio](Proyecto/Back_End/src/commerce.cjs) · [Solicitudes](Proyecto/Back_End/src/support.cjs) |
| Firebase Realtime Database y SQLite | Catálogo, usuarios, pedidos, pagos, entregas, movimientos y auditoría. | [Persistencia en Firebase](Proyecto/Back_End/src/firebase-store.cjs) · [Esquema y reportes](Proyecto/Back_End/db) |
| Pruebas | Escenarios de integración y recorrido automatizado en navegador. | [Pruebas de la tienda](Proyecto/Back_End/test) |

El servidor calcula los importes en centavos y vuelve a comprobar precio, disponibilidad y cupón al aprobar el pago. El pedido conserva el precio, la descripción y el domicilio aceptados, incluso si esos datos se editan más adelante. La API reconoce los reintentos con la misma clave de solicitud y usa transacciones para registrar cambios de pago e inventario. El acceso a pedidos y operaciones administrativas se valida en el servidor.

El [contrato OpenAPI](Proyecto/Back_End/openapi.json) reúne **48 operaciones** de catálogo, cuenta, carrito, pedidos, pagos, solicitudes y administración. Las [consultas de reporte](Proyecto/Back_End/db/reportes.sql) permiten revisar ventas aprobadas, existencias, solicitudes y movimientos. El manual detalla cómo respaldar SQLite con cifrado y comprobar la integridad de una restauración en una ruta nueva.

## Pruebas y evidencia

Consulta la [matriz de aceptación](Evidencias/aceptacion.md), el [diccionario SQLite](Evidencias/diccionario-sqlite.md) y la [matriz normativa](Evidencias/cumplimiento.md).

Ejecuta `npm test` desde `Proyecto` para reproducir las pruebas de integración. El conjunto comprueba, entre otros casos, que dos compradores no puedan adquirir la misma última unidad, que una repetición no duplique un pedido, que cada cuenta vea sus propios folios y que se pueda restaurar la base. Incluye una prueba de persistencia con la interfaz REST de Realtime Database y control de versiones. [Evidencia de la entrega académica](Evidencias)

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

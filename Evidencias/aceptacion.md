# Matriz de aceptación de Manu Games

La rúbrica de Diseño y desarrollo de una tienda virtual define los criterios 18 a 27. Para reproducir los casos de integración, ejecuta `npm test` desde `Proyecto`. Para la demostración completa con panel, ejecuta `npm ci` y `npm run demo`. Usa una cuenta compradora ficticia y, en una ventana independiente, la cuenta administrativa que genera la terminal.

## Criterios de aceptación

| ID | Precondición y datos | Pasos y resultado esperado | Resultado de integración y evidencia |
| --- | --- | --- | --- |
| 18 | Catálogo inicial con 27 fichas activas | Busca por inicial y nombre. Combina categoría y disponibilidad, abre una ficha y revisa el SKU, el precio y la plataforma. Prueba las variantes de PlayStation Plus y consulta el DLC MG-036. | Aprobado en E01. La portada de Hivebusters se incorporó en [7be4775](https://github.com/ManuManiManito19/Manu_Games_completo/commit/7be477506363b03193381dc2940a69add25b9986). |
| 19 | Sesión de visitante con productos disponibles | Agrega dos unidades, cambia a una, añade otra partida y retírala. El carrito conserva la primera y recalcula el subtotal. | Aprobado en E02. E03 comprueba la continuidad del carrito al registrar la cuenta. |
| 20 | MG-038 tiene diez unidades en la semilla. El escenario E07 ajusta otra ficha a una unidad. | Intenta agregar once unidades de MG-038. En la prueba de concurrencia, dos clientes intentan confirmar la última unidad y solo una compra modifica el saldo. | Aprobado en E02 y E07. |
| 21 | Comprador autenticado, domicilio ficticio en local y cupón DEMO10 | Cotiza una unidad de MG-036. El subtotal es 349.00 MXN, el descuento es 34.90 MXN y el total es 314.10 MXN. Confirma con un método de prueba y conserva el folio al reintentar. | Aprobado en E04. El guion de navegador usa dos unidades y espera 628.20 MXN. |
| 22 | Pedido pagado y cuenta administrativa | Avanza En preparación, Enviado y Entregado. Comprueba guía y código digital de prueba. Un salto directo desde Pagado a Entregado debe recibir 409. | Aprobado en E05. |
| 23 | Compra simulada aprobada en la demo local | Consulta la salida de inventario vinculada al pedido. Para una unidad, el movimiento es `delta=-1`. Reconfirma y verifica que el saldo y el movimiento se conservan. | Aprobado en E04. E07 cubre el conflicto por la última unidad. |
| 24 | Pedido propio entregado | Abre la devolución desde el pedido, describe el motivo y consulta el folio. En local, solicita información adicional y resuelve con reembolso. Comprueba el pago reembolsado y la reposición de una sola unidad. | Aprobado en E06. E08 cubre la garantía y el rechazo de pago. |
| 25 | Cliente sin rol de operación | Solicita una ruta administrativa y un pedido de otra cuenta. Se esperan 403 y 404, respectivamente. | Aprobado en E03 y E04. |
| 26 | Sitio abierto como visitante | Abre Ayuda y políticas y consulta términos, privacidad, entrega y devoluciones. En el registro, comprueba la aceptación de términos. El checkout confirma el pedido y el método. | E03 y E09 cubren registro y políticas. El guion de navegador comprueba la ubicación de la aceptación. |
| 27 | Base de ensayo con datos y clave de respaldo | Crea una copia cifrada, restaura a una ruta libre y comprueba integridad, importes, pedido y estado. | Aprobado en E10. |

El [archivo de pruebas E01 a E11](../Proyecto/Back_End/test/store.test.cjs) también verifica la conservación de la foto de perfil y que los comentarios públicos y las solicitudes de privacidad funcionen de forma independiente. La [prueba de Realtime Database](../Proyecto/Back_End/test/firebase-store.test.cjs) usa un servicio de ensayo y verifica persistencia, permisos y control de versiones.

## Actualizaciones y evidencia

| Actualización | Qué se puede demostrar | Referencia |
| --- | --- | --- |
| Catálogo y existencias | El catálogo tiene 14 juegos, 3 DLCs y 10 complementos activos. Se conservaron 16 fichas retiradas para el historial. Hivebusters mantiene el SKU MG-036 e indica el requisito de Gears 5. Las fichas MG-038, MG-039 y MG-043 recibieron cambios de disponibilidad y descripción en la semilla. | [Catálogo y portadas](https://github.com/ManuManiManito19/Manu_Games_completo/commit/7be477506363b03193381dc2940a69add25b9986) · [Semilla](../Proyecto/Back_End/db/catalog.cjs) |
| Registro y checkout | La aceptación de términos se pide al crear la cuenta. El checkout valida una tarjeta ficticia mediante Luhn, vigencia y código de tres dígitos, o el correo ficticio de PayPal. La confirmación muestra partidas, total y método. El registro del pedido conserva el método. | [Cambio de checkout](https://github.com/ManuManiManito19/Manu_Games_completo/commit/0644cc53fc09dc76a917461322b3ea6401408aa4) · [Validación](../Proyecto/src/app/store/checkout-payment.ts) · [Guion](../Proyecto/Back_End/test/browser-check.py) |
| Compra simulada publicada | En Firebase Hosting, el titular puede consultar su folio, partidas y método desde el historial. Las reglas de Firestore controlan el acceso por cuenta. El código de la edición publicada consulta existencias. El movimiento de inventario vinculado al pago se demuestra con la API local. | [Implementación publicada](../Proyecto/src/app/store/spark-api.ts) · [Reglas de Firestore](../Proyecto/deploy/firestore-store.rules) |
| Atención y comunidad | Los comentarios requieren sesión y confirmación de publicación y se muestran con el nombre de perfil. Devoluciones parte del pedido y Derechos ARCO tiene un formulario independiente. Los expedientes se consultan desde la cuenta titular. | [Cambio de atención](https://github.com/ManuManiManito19/Manu_Games_completo/commit/abc99327dc52e2a135237cabc923981ec651f642) · [Prueba de integración](../Proyecto/Back_End/test/store.test.cjs) |
| Administración y pago local | La confirmación es transaccional. El operador puede avanzar la entrega y resolver un expediente. El reembolso simulado genera el movimiento de reposición asociado al pedido. | [Comercio](../Proyecto/Back_End/src/commerce.cjs) · [Atención](../Proyecto/Back_End/src/support.cjs) · E04 a E08 |
| Documentación de la defensa | El guion recorre el catálogo publicado y la compra con operación local. La presentación incluye vistas de checkout, pedidos, comentarios, devoluciones y derechos ARCO. | [Guion PDF](../Documentos/PDF/13-Presentacion-y-demostracion.pdf) · [Presentación](../Documentos/PPTX/13-Presentacion-Manu-Games.pptx) |

[Tienda publicada en Firebase Hosting](https://manugames-d4df7.web.app) · [Documentación de Firebase](../Proyecto/README.md) · [OpenAPI](../Proyecto/Back_End/openapi.json)

## Resultados registrados

- **Integración.** Se ejecutó `npm test` en Node.js 24.20.0 sobre el código del commit `54c95fc`. Resultado de Node: **15 aprobadas, 0 fallidas**. [Salida de la ejecución](pruebas.txt)
- **Navegación.** El registro de Chromium y Firefox a 360, 768 y 1280 px corresponde a un recorrido anterior. El guion de la versión consultada añade las comprobaciones del checkout de prueba. [Registro histórico](navegadores.json) · [Guion vigente](../Proyecto/Back_End/test/browser-check.py)
- **Alcance.** Los datos de integración provienen de SQLite y de un servicio de ensayo para Realtime Database. Las funciones de Firebase Hosting se describen con base en el código y las reglas versionadas.

## Evidencia por entregable

| No. | Evidencia |
| --- | --- |
| 01–02 | Propuesta, especificación y [backlog](backlog.csv). |
| 03 | Documento de diseño, guía visual y [recorrido reproducible en navegador](../Proyecto/Back_End/test/browser-check.py). |
| 04–06 | Código, `npm run demo` y [OpenAPI](../Proyecto/Back_End/openapi.json). |
| 07 | [Migraciones](../Proyecto/Back_End/db), [diccionario](diccionario-sqlite.md), consultas y prueba de restauración. |
| 08 | Panel con autenticación administrativa, productos, categorías, inventario, promociones, pedidos, clientes, atención y reportes. |
| 09 | Ayuda del sitio y [matriz normativa](cumplimiento.md). |
| 10–13 | [Documentación PDF](../Documentos/PDF), [formatos editables](../Documentos/Word) y esta matriz. |

## Evaluación presencial pendiente

Para completar la evidencia con personas, una persona invitada ejecuta cada tarea sin instrucciones de navegación. El equipo registra observación, dificultad, tiempo y ajuste con alias de prueba.

| Tarea | Criterio observable |
| --- | --- |
| Encontrar un juego compatible | Identifica plataforma, precio y existencia en la ficha. |
| Ajustar el carrito | Modifica cantidad y explica el cambio de subtotal. |
| Completar un pedido de prueba | Identifica costo de entrega, descuento, total y folio. |
| Cambiar el estado de un pedido | Usa el acceso administrativo y localiza la referencia digital. |
| Solicitar devolución o garantía | Encuentra el folio y consulta la resolución desde su cuenta. |

Faltan las observaciones de los participantes y la defensa ante el docente.

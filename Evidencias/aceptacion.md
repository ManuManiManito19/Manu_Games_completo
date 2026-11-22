# Matriz de aceptación de Manu Games

El PDF «Diseño y desarrollo de una tienda virtual» del proyecto integrador define los criterios. Ejecuta la tienda completa con `npm run demo` y las pruebas con `npm test`, ambos desde `Proyecto`.

## Criterios 18–27

| ID | Precondición y datos | Pasos y resultado esperado | Resultado obtenido y evidencia |
| --- | --- | --- | --- |
| 18 | Catálogo inicial de 43 fichas | Buscar `Horizonte`, filtrar por existencia y abrir un resultado. Aparecen dos variantes y se muestra la ficha con SKU. | Aprobado en E01. |
| 19 | Sesión de visitante abierta | Agregar dos unidades, cambiar a una y eliminar una segunda partida. El carrito conserva la primera y recalcula el subtotal. | Aprobado en E02. |
| 20 | `MG-015` tiene una unidad | Intentar añadir dos. La API responde 409. Dos clientes intentan confirmar la última unidad y solo uno puede comprarla. | Aprobado en E02 y E07. |
| 21 | Comprador autenticado, dirección de prueba y `DEMO10` | Cotizar una unidad de `MG-001`, aceptar términos y aprobar el pago simulado. El total es $314.10 MXN y se obtiene un folio `MG-`. Repetir la solicitud conserva el folio. | Aprobado en E04. |
| 22 | Pedido pagado y cuenta administrativa | Cambiar el pedido a En preparación, Enviado y Entregado. Se generan guía y licencia de demostración. Un salto directo a Entregado recibe 409. | Aprobado en E05. |
| 23 | Compra confirmada | Consultar movimientos de inventario. La venta de una unidad registra `delta=-1`; repetir el pago conserva el saldo y el movimiento. | Aprobado en E04. |
| 24 | Pedido entregado del propio cliente | Abrir devolución, responder aclaración y resolver con reembolso. El folio aparece al comprador y la unidad vuelve una sola vez. | Aprobado en E06. E08 cubre garantía y rechazo de pago. |
| 25 | Cuenta compradora sin rol administrativo | Consultar pedidos administrativos y operar un pedido ajeno. El servidor responde 403 y 404 respectivamente. | Aprobado en E03 y E04. |
| 26 | Sitio abierto como visitante | Entrar a Ayuda y comprobar que términos y privacidad son accesibles desde el registro y antes de confirmar. | Plantilla verificada y compilada. Se puede repetir con el recorrido de navegador. |
| 27 | Base de ensayo con pedidos y clave de respaldo | Crear copia cifrada, restaurar a una ruta libre y comprobar integridad referencial. | Aprobado en E10. |
| Foto | Perfil activo con avatar predeterminado | Guardar una foto, cerrar sesión, entrar de nuevo, guardar solo el nombre y después elegir un avatar. La foto persiste hasta que el usuario cambia de avatar. | Aprobado en E11. |

Los casos E01–E11 están en [store.test.cjs](../Proyecto/Back_End/test/store.test.cjs). La [prueba de Realtime Database](../Proyecto/Back_End/test/firebase-store.test.cjs) comprueba control de versión y persistencia con un servidor de ensayo.

## Verificación de Firebase

| Comprobación | Resultado del 22 de noviembre de 2026 |
| --- | --- |
| Firestore | 43 documentos públicos de catálogo con nombre, descripción y precio, en 30 juegos, 3 DLCs y 10 complementos. |
| Realtime Database | 43 claves de producto en `manuGames/products`. Es la base privada que usa la API en su configuración de nube. |
| Firebase Hosting | La [vista previa](https://manugames-d4df7--catalogo-rv9owzi0.web.app) devolvió Angular y la portada de prueba por HTTPS. |
| Firebase Authentication | Una cuenta ficticia pudo registrarse, guardar el perfil y consultar los datos tras volver a entrar. La lectura anónima del mismo perfil fue denegada. |
| Compra en la nube | Pendiente de habilitar Cloud Run y la facturación de Blaze. Se puede reproducir el flujo completo en SQLite local. |

La comprobación de privacidad se refiere a las colecciones nuevas. Las reglas de las colecciones previas requieren revisión antes de usar datos reales.

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

## Evaluación presencial

El [registro anterior de navegador](navegadores.json) incluye Chromium y Firefox a 360, 768 y 1280 px. Para completar la evidencia con personas, una persona invitada ejecuta cada tarea sin instrucciones de navegación. El equipo registra observación, dificultad, tiempo y ajuste con alias de prueba.

| Tarea | Criterio observable |
| --- | --- |
| Encontrar un juego compatible | Identifica plataforma, precio y existencia en la ficha. |
| Ajustar el carrito | Modifica cantidad y explica el cambio de subtotal. |
| Completar un pedido de prueba | Identifica costo de entrega, descuento, total y folio. |
| Cambiar el estado de un pedido | Usa el acceso administrativo y localiza la referencia digital. |
| Solicitar devolución o garantía | Encuentra el folio y consulta la resolución desde su cuenta. |

Faltan las observaciones de los participantes y la defensa ante el docente.

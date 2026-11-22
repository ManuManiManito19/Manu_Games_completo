# Matriz normativa, comercial y de privacidad

Manu Games utiliza identidades, importes, licencias y pagos de demostración. La matriz distingue las funciones ejercitadas de las revisiones para una operación comercial.

| Tema | Referencia | Evidencia y verificación | Responsable / estado |
| --- | --- | --- | --- |
| Identidad e información comercial | LFPC, arts. 7, 7 Bis, 32 y 76 Bis | Ayuda muestra identidad y contacto ficticios. Ficha y checkout informan compatibilidad, existencia, moneda y desglose previo a confirmar. Revisar con E01 y E04. | Operación / implementado para la evaluación. |
| Contratación electrónica | Código de Comercio, mensajes de datos y conservación | Checkout exige aceptación afirmativa. El pedido conserva folio, versión de términos, fecha y partidas. Revisar con E04. | Ingeniería / implementado para la evaluación. |
| Transparencia y atención | Código de Ética de PROFECO, referencia de adhesión voluntaria | Ayuda describe contacto, objetivos de atención y aclaración por folio. El panel registra respuestas. Revisar con E06 y E08. | Operación / implementado para la evaluación. |
| Privacidad y ARCO | LFPDPPP | El registro enlaza al aviso, la foto es opcional y Mi cuenta ofrece solicitudes de privacidad. El plan de retención se ejecuta como tarea operativa al cerrar el ejercicio. | Operación / flujo implementado, cierre pendiente de ejecución. |
| Seguridad | LFPC, art. 76 Bis y LFPDPPP | Cookies HttpOnly en la API, hash scrypt, autorización por rol, respaldo cifrado, pago simulado sin PAN o CVV. E03, E10 y E11. | Ingeniería / verificado en la API local. |
| Entrega y devoluciones | LFPC, contratación a distancia y garantías | Ayuda indica compatibilidad, entrega digital y costo. El detalle del pedido genera solicitud y el panel registra aclaración, reembolso completo simulado o reposición. | Operación / verificado en E05, E06 y E08. |
| Garantía comercial | LFPC, arts. 77 y 78 | El ejercicio prueba reposición de una licencia ficticia. Para una garantía comercial real, se requiere verificar la póliza, duración y condiciones aplicables. | Operación / verificado como simulación. |
| Comprobante y CFDI | SAT, factura electrónica | El pedido emite confirmación interna identificada como académica. En un escenario comercial, el operador valida régimen, canal y datos fiscales antes de emitir. | Operación / facturación real fuera de la simulación. |
| Propiedad intelectual | Licencias y autorizaciones de cada recurso | Créditos de [portadas](../Proyecto/public/games/CREDITOS.txt), [avatares](../Proyecto/public/avatars/CREDITOS.txt) y [recursos propios](../Proyecto/public/covers/LICENCIA.txt). | Diseño / fuentes inventariadas. Verificar autorización comercial antes de reutilizar portadas de terceros. |

Fuentes oficiales [LFPC](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf), [LFPDPPP](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf), [Código de Comercio](https://www.diputados.gob.mx/LeyesBiblio/pdf/CCom.pdf), [Código de Ética de PROFECO](https://distintivodigital.profeco.gob.mx/info-codigo-de-etica.php) y [SAT](https://www.sat.gob.mx/).

# Manu Games

Tienda de videojuegos digitales para demostración académica. La compra usa
inventario y pedidos persistentes, un simulador de pago y un panel administrativo.
Usa cuentas y direcciones ficticias durante la demostración.

## Instalación

Requiere Node.js 24 y npm. Ejecuta los comandos desde `Proyecto`.

```bash
npm ci
npm start
```

Abre http://localhost:4200. Para habilitar un perfil administrativo, copia
`Back_End/.env.example` a `Back_End/.env`, elige una contraseña de al menos 12
caracteres y ejecuta `npm run db:bootstrap` antes de iniciar el servidor.
La aplicación prepara la base y el catálogo de demostración al iniciar.
Para compilar sin servir, usa `npm run build`. Para servir una compilación
existente, usa `npm run serve`. El modo de desarrollo usa `npm run dev` y
el backend en el puerto 4300. En este modo, fija `PUBLIC_ORIGIN` al origen de
Angular (http://localhost:4200).

## Verificación

- `npm test` prueba la compra, inventario, roles, atención y restauración.
- [OpenAPI](Back_End/openapi.json) describe la API y [reportes.sql](Back_End/db/reportes.sql)
  contiene consultas de operación.
- La [carpeta Documentos](../Documentos) contiene los 13 entregables de la evaluación.
- Las portadas del catálogo son ilustraciones originales del ejercicio. Consulta [LICENCIA](public/covers/LICENCIA.txt).

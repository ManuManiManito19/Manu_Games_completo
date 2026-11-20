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

## Guardar los datos en Firebase

El servidor guarda el catálogo, el inventario, los perfiles, los pedidos, los pagos de prueba y las devoluciones en Realtime Database cuando se configura `FIREBASE_DATABASE_URL`. El navegador utiliza la API de la tienda y las reglas de Firebase bloquean la lectura y la escritura directas. El módulo SQLite incluido en Node.js aplica las reglas de negocio en memoria y Firebase confirma cada cambio con el control de versión ETag. Esto permite usar varias sesiones en la demostración. Cada operación consulta una copia del estado, por lo que el modelo está dimensionado para el tamaño del catálogo académico.

1. Configura Realtime Database en tu proyecto y aplica las reglas privadas con `firebase deploy --only database --project TU_PROYECTO`.
2. Define `FIREBASE_DATABASE_URL` con la URL de tu instancia en `Back_End/.env`. Para Manu Games es `https://manugames-d4df7-default-rtdb.firebaseio.com`.
3. Para trabajar desde tu equipo, configura Application Default Credentials con `gcloud auth application-default login` usando una cuenta que tenga acceso a Realtime Database. Para Cloud Run, asigna una identidad al servicio con el rol `roles/firebasedatabase.admin` en el proyecto. Conserva las credenciales en el servidor.
4. Usa `npm run db:catalog` para preparar el catálogo, o `npm run db:bootstrap` para preparar el catálogo y una cuenta administrativa. Inicia la tienda con `npm start` y comprueba que `/api/health` devuelva `storage: "firebase"`.

Con la URL omitida, el proyecto abre una base SQLite local. Las cuentas y pedidos de esa instalación se guardan en su propio archivo. En ambos modos, al confirmar una compra se registra en **Mi cuenta → Mis productos**. El código digital de demostración se muestra después de que el operador marque el pedido como entregado.

## Publicación en Firebase Hosting

El sitio completo usa Firebase Hosting y Cloud Run. Este despliegue requiere el plan Blaze. La carpeta incluye un `Dockerfile` para el servidor y `firebase.hosting.json` para servir Angular y enviar `/api/**` al servidor desde el mismo dominio.

Después de habilitar los servicios de Cloud Run, Cloud Build y Artifact Registry, despliega desde `Proyecto`. Sustituye los valores de ejemplo por el proyecto, dominio, URL de Realtime Database e identidad de tu servicio. Configura el dominio principal en `PUBLIC_ORIGIN` para que el servidor pueda validar las compras y demás solicitudes con sesión.

```powershell
gcloud run deploy manu-games --source . --project TU_PROYECTO --region us-central1 --service-account IDENTIDAD_DEL_SERVICIO --allow-unauthenticated --set-env-vars "PUBLIC_ORIGIN=https://TU_PROYECTO.web.app,FIREBASE_HOSTING_PROXY=1,FIREBASE_DATABASE_URL=https://TU_INSTANCIA.firebaseio.com"
npm run build
firebase deploy --only hosting --config firebase.hosting.json --project TU_PROYECTO
```

Verifica `/api/health` en el dominio de Hosting y completa una compra con una cuenta de prueba. Firebase Hosting reenvía la cookie de sesión `__session` cuando `FIREBASE_HOSTING_PROXY=1`.

## Verificación

- `npm test` prueba la compra, inventario, roles, atención y restauración.
- [OpenAPI](Back_End/openapi.json) describe la API y [reportes.sql](Back_End/db/reportes.sql)
  contiene consultas de operación.
- La [carpeta Documentos](../Documentos) contiene los 13 entregables de la evaluación.
- Los créditos de [portadas](public/games/CREDITOS.txt) y [avatares](public/avatars/CREDITOS.txt) acompañan los recursos usados. Las ilustraciones del ejercicio local conservan su [licencia](public/covers/LICENCIA.txt).

# Manu Games

Tienda de videojuegos digitales para demostración académica. La compra usa
inventario y pedidos persistentes, un simulador de pago y un panel administrativo.
Usa cuentas y direcciones ficticias durante la demostración.

## Instalación

Requiere Node.js 24 y npm. Ejecuta los comandos desde `Proyecto`.

```bash
npm ci
npm run demo
```

Abre http://127.0.0.1:4200. La terminal muestra el usuario y la contraseña
de administración para esa ejecución. La demostración crea una base de datos
aislada y llena el catálogo. Si el puerto está ocupado, elige otro con
`DEMO_PORT` antes de iniciar.

Para conservar una base local entre ejecuciones, usa el arranque habitual.

```bash
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

El servidor guarda el catálogo, el inventario, los perfiles, los pedidos, los pagos de prueba y las devoluciones en Realtime Database cuando se configura `FIREBASE_DATABASE_URL`. El navegador utiliza la API de la tienda y las reglas de Firebase bloquean la lectura y la escritura directas. El servidor aplica las reglas de negocio en memoria con SQLite. Firebase confirma cada cambio con el control de versión ETag. Esto permite usar varias sesiones en la demostración. Cada operación consulta una copia del estado, por lo que el modelo está dimensionado para el tamaño del catálogo académico.

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

## Tienda académica en Firebase Spark

El [sitio publicado](https://manugames-d4df7.web.app) incluye el catálogo, el perfil y un carrito
con confirmación de productos, plataformas, cantidades y total. En Spark el pedido de prueba se registra
al confirmar. No hay cobro ni entrega de licencias. El inventario de referencia limita las cantidades del
pedido y el simulador Spark no descuenta las existencias compartidas.

En el checkout se elige **Tarjeta** o **PayPal**. La tarjeta se simula con un titular
ficticio, un número de 16 dígitos que pasa el algoritmo de Luhn, cualquier código de tres
dígitos y un vencimiento desde enero de 2027 con al menos 30 días de vigencia. PayPal pide
un correo de prueba válido. Solo se envía y se guarda el método elegido.
La ventana de términos se abre en el registro de la cuenta.

- **Comentarios** publica el nombre de perfil o gamertag y el texto confirmado por el usuario.
- **Devoluciones** permite elegir un pedido, indicar el motivo y obtener un folio privado de devolución, cancelación o garantía.
- **Derechos ARCO** contiene el aviso y el formulario privado para ejercer cada derecho.

Firebase Authentication gestiona las cuentas. En Cloud Firestore, `manuGamesCatalog` y `manuGamesComments`
se pueden leer públicamente. `manuGamesProfiles/{uid}` y las subcolecciones `orders` y `cases` de
`manuGamesAccounts/{uid}` se consultan con la cuenta titular. Un operador con acceso al proyecto puede
revisar las solicitudes y registrar una respuesta mediante los campos `status` y `resolution` en Firestore.
La demo con servidor conserva el panel, el simulador de pago, la entrega de prueba y el flujo administrativo de reembolso.

Activa el proveedor Correo electrónico/contraseña en Firebase Authentication
y usa una app web asociada al sitio de Hosting. Desde la carpeta `Proyecto` en
una terminal autenticada con acceso a Firebase y Google Cloud, prepara el catálogo
y las reglas. La importación conserva precio y existencia de los SKU ya
existentes, retira las 16 fichas académicas y actualiza la portada de Hivebusters.

```bash
node deploy/prepare-firestore.cjs catalog manugames-d4df7
node deploy/prepare-firestore.cjs rules manugames-d4df7
firebase deploy --only firestore:rules --config firebase.firestore.local.json --project manugames-d4df7
node deploy/prepare-firestore.cjs availability manugames-d4df7
npm run build -- --configuration production,spark
firebase deploy --only hosting --config firebase.spark.json --project manugames-d4df7
```

El preparador verifica que las lecturas públicas, el perfil y las solicitudes tengan los permisos previstos.
Revisa `firestore.merged.rules` antes de publicarlo. La operación `availability` repone diez unidades
a los juegos visibles con stock cero y al SKU MG-043, y actualiza las fichas correspondientes.
Los precios
se guardan en centavos de MXN y las imágenes del catálogo se sirven desde Hosting.
La compilación lee la configuración web del proyecto con
`/__/firebase/init.json`.

## Verificación

- `npm test` prueba la compra, inventario, roles, atención y restauración.
- [OpenAPI](Back_End/openapi.json) describe la API y [reportes.sql](Back_End/db/reportes.sql)
  contiene consultas de operación.
- La [carpeta Documentos](../Documentos) contiene los 13 entregables de la evaluación.
- Los créditos de [portadas](public/games/CREDITOS.txt) y [avatares](public/avatars/CREDITOS.txt) acompañan los recursos usados. Las ilustraciones del ejercicio local conservan su [licencia](public/covers/LICENCIA.txt).

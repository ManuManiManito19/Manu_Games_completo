# MANU_GAMES · Proyecto_Completo_Chat

## Abrir en Visual Studio Code

1. Extrae el ZIP y abre en VS Code la carpeta que contiene `package.json`, `angular.json` y `src`.
2. Con Node.js 24 instalado, abre la terminal integrada y ejecuta:

```sh
npm ci
npm start
```

`npm ci` instala las dependencias a partir de `package-lock.json`. Solo hace falta al preparar una copia nueva o cuando cambian las dependencias. Si PowerShell bloquea `npm.ps1`, usa `npm.cmd ci` y `npm.cmd start`.

Abre [localhost:4200/inicio](http://localhost:4200/inicio) cuando Angular CLI indique que inició el servidor.

El catálogo, el buscador y las compras simuladas funcionan con datos locales del frontend. Precios, inventario y claves nuevas son de demostración. Usa datos ficticios para probar los formularios.

## Qué cambió

- El catálogo permite ver todos los productos, solo juegos, géneros de juegos, todos los complementos, suscripciones, DLC o monedas virtuales. El buscador se puede combinar con el filtro.
- Elden Ring y Cyberpunk 2077 aparecen como juegos base. Shadow of the Erdtree y Phantom Liberty aparecen como expansiones independientes. Se añadió Gears 5: Hivebusters.
- Se añadieron suscripciones de 1 y 3 meses para PlayStation Plus Essential y Xbox Game Pass Ultimate, además de puntos COD, Iron de Gears 5, FC Points, créditos de Halo y lingotes de Red Dead Online.

## Cuentas y pedidos de demostración

Registra una cuenta de prueba desde Iniciar sesión. Las cuentas de demostración, la sesión y los pedidos se guardan en el navegador para este sitio. Si venías de la versión anterior, crea una cuenta para establecer tu contraseña.

Compra un artículo con datos ficticios. El pedido se guarda al confirmar la simulación. Abre Mis pedidos desde el perfil del navbar o desde la confirmación de compra para consultar tus pedidos y solicitar una devolución.

## Backend opcional

La carpeta `Back_End` contiene la API Express original para consultar SQL Server. Para arrancarla, instala las dependencias con `npm.cmd ci`, copia `.env.example` como `.env`, configura tu servidor y base de datos y ejecuta `node server.js`. Se requiere ODBC Driver 17 y acceso a SQL Server con autenticación de Windows. La API funciona por separado del catálogo local de esta versión.

## Referencias de productos

- [PlayStation Plus](https://www.playstation.com/es-mx/ps-plus/whats-new/)
- [Xbox Game Pass Ultimate](https://www.xbox.com/es-MX/games/store/game-pass-ultimate/CFQ7TTC0KHS0)
- [Xbox Game Pass Ultimate de tres meses](https://www.bestbuy.com/site/microsoft-xbox-game-pass-ultimate-3-month-membership-digital/6359375.p?skuId=6359375)
- [Elden Ring: Shadow of the Erdtree](https://www.bandainamcoent.com/games/elden-ring/shadow-of-the-erdtree)
- [Cyberpunk 2077: Phantom Liberty](https://www.cyberpunk.net/cm/es-mx/phantom-liberty)
- [Call of Duty: Black Ops 6 y puntos COD](https://www.callofduty.com/mx/es/blog/2024/06/call-of-duty-black-ops-6-pre-order-benefits-game-editions)
- [Gears 5, Iron y Hivebusters](https://www.xbox.com/en-US/games/store/gears-5/c2kdnlt2h7dm)
- [FC Points](https://www.xbox.com/es-MX/games/store/ea-sports-fc-25-1050-fc-points/9NDTPBHN8CXV/0010)
- [Créditos Halo](https://www.xbox.com/es-MX/games/store/1000-creditos-halo/9nvmhsh9c861)
- [Lingotes de Red Dead Online](https://www.xbox.com/es-MX/games/store/25-lingotes-de-oro/c4mkrglzbcs1)

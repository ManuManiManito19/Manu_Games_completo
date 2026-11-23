# Diccionario SQLite

SQLite declara tipos `INTEGER` y `TEXT` en tablas `STRICT`. El tamaño de `TEXT` se controla donde aplica mediante `CHECK` y validaciones de la API. Las fechas quedan en UTC. Los importes se almacenan en centavos de pesos mexicanos.

La tienda guarda una fila por pedido, por pago y por envío. Las partidas respaldan el precio y la descripción histórica. La dirección del pedido conserva el valor aceptado al contratar. Los reportes agregan datos al consultarlos.

## `addresses`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | No | PK 1 | Identificador interno. |
| `user_id` | INTEGER | No | FK `users.id` | Usuario titular o asociado. |
| `recipient` | TEXT | No | — | Destinatario de la entrega de demostración. |
| `street` | TEXT | No | — | Calle y número ficticios. |
| `city` | TEXT | No | — | Municipio. |
| `region` | TEXT | No | — | Estado. |
| `postal_code` | TEXT | No | — | Código postal mexicano de 5 dígitos. |

Índice (`user_id`) · `ix_addresses_user`.

## `audit_logs`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | No | PK 1 | Identificador interno. |
| `actor_id` | INTEGER | Sí | FK `users.id` | Cuenta que realizó la acción. |
| `action` | TEXT | No | — | Acción aplicada por operación. |
| `entity` | TEXT | No | — | Tipo de entidad auditada. |
| `entity_id` | TEXT | No | — | Identificador registrado en la bitácora. |
| `detail` | TEXT | Sí | — | Detalle técnico de auditoría. |
| `created_at` | TEXT | No | predeterminado `CURRENT_TIMESTAMP` | Fecha y hora de alta en UTC. |

Índice (`entity`, `entity_id`, `id`) · `ix_audit_entity`.

## `carts`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `session_id` | TEXT | No | PK 1, FK `sessions.id` | Sesión a la que pertenece el carrito. |
| `product_id` | INTEGER | No | PK 2, FK `products.id` | Producto asociado. |
| `quantity` | INTEGER | No | — | Unidades. |

## `case_messages`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | No | PK 1 | Identificador interno. |
| `case_id` | INTEGER | No | FK `cases.id` | Folio de atención asociado. |
| `actor_id` | INTEGER | No | FK `users.id` | Cuenta que realizó la acción. |
| `body` | TEXT | No | — | Texto de la aclaración. |
| `created_at` | TEXT | No | predeterminado `CURRENT_TIMESTAMP` | Fecha y hora de alta en UTC. |

Índice (`case_id`, `id`) · `ix_messages_case`.

## `cases`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | No | PK 1 | Identificador interno. |
| `folio` | TEXT | No | — | Referencia visible e irrepetible. |
| `user_id` | INTEGER | No | FK `users.id` | Usuario titular o asociado. |
| `order_id` | INTEGER | Sí | FK `orders.id` | Pedido asociado. |
| `product_id` | INTEGER | Sí | FK `products.id` | Producto asociado. |
| `kind` | TEXT | No | — | Clase de solicitud. |
| `reason` | TEXT | No | — | Motivo asentado. |
| `evidence` | TEXT | No | predeterminado `''` | Referencia opcional del caso. |
| `status` | TEXT | No | predeterminado `'open'` | Estado según el flujo de la entidad. |
| `resolution` | TEXT | Sí | — | Respuesta registrada por operación. |
| `action` | TEXT | Sí | — | Acción aplicada por operación. |
| `actor_id` | INTEGER | Sí | FK `users.id` | Cuenta que realizó la acción. |
| `created_at` | TEXT | No | predeterminado `CURRENT_TIMESTAMP` | Fecha y hora de alta en UTC. |
| `resolved_at` | TEXT | Sí | — | Fecha de resolución, si aplica. |

Índice (`order_id`, `status`) · `ix_cases_order`. Índice (`user_id`, `id`) · `ix_cases_user`. Único (`folio`).

## `categories`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | No | PK 1 | Identificador interno. |
| `name` | TEXT | No | — | Nombre mostrado. |
| `active` | INTEGER | No | predeterminado `1` | Indicador 0/1 de vigencia. |

Único (`name`).

## `coupons`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `code` | TEXT | No | PK 1 | Código del cupón. |
| `percent` | INTEGER | No | — | Porcentaje de descuento entero. |
| `ends_at` | TEXT | No | — | Fecha de vencimiento. |
| `max_uses` | INTEGER | No | — | Límite de usos vigentes. |
| `active` | INTEGER | No | predeterminado `1` | Indicador 0/1 de vigencia. |

## `inventory_movements`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | No | PK 1 | Identificador interno. |
| `product_id` | INTEGER | No | FK `products.id` | Producto asociado. |
| `delta` | INTEGER | No | — | Unidades agregadas o retiradas. |
| `reason` | TEXT | No | — | Motivo asentado. |
| `actor_id` | INTEGER | Sí | FK `users.id` | Cuenta que realizó la acción. |
| `order_id` | INTEGER | Sí | FK `orders.id` | Pedido asociado. |
| `created_at` | TEXT | No | predeterminado `CURRENT_TIMESTAMP` | Fecha y hora de alta en UTC. |

Índice (`product_id`, `id`) · `ix_movements_product`.

## `order_items`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `order_id` | INTEGER | No | PK 1, FK `orders.id` | Pedido asociado. |
| `product_id` | INTEGER | No | PK 2, FK `products.id` | Producto asociado. |
| `sku` | TEXT | No | — | Copia del SKU al confirmar. |
| `name` | TEXT | No | — | Copia del nombre al confirmar. |
| `description` | TEXT | No | — | Copia de la descripción al confirmar. |
| `platform` | TEXT | No | — | Copia de la plataforma al confirmar. |
| `unit_price` | INTEGER | No | — | Precio unitario histórico, en centavos MXN. |
| `quantity` | INTEGER | No | — | Unidades. |

## `orders`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | No | PK 1 | Identificador interno. |
| `folio` | TEXT | No | — | Referencia visible e irrepetible. |
| `user_id` | INTEGER | No | FK `users.id` | Usuario titular o asociado. |
| `request_key` | TEXT | No | — | Clave de idempotencia por usuario. |
| `address_snapshot` | TEXT | No | — | JSON de dirección histórica aceptada. |
| `subtotal` | INTEGER | No | — | Subtotal en centavos MXN. |
| `discount` | INTEGER | No | — | Descuento en centavos MXN. |
| `shipping` | INTEGER | No | — | Costo de entrega en centavos MXN. |
| `tax` | INTEGER | No | — | Impuestos configurados en centavos MXN. |
| `total` | INTEGER | No | — | Monto total en centavos MXN. |
| `coupon_code` | TEXT | Sí | FK `coupons.code` | Código aplicado al pedido. |
| `status` | TEXT | No | — | Estado según el flujo de la entidad. |
| `terms_version` | TEXT | No | — | Versión de condiciones aceptada. |
| `consent_at` | TEXT | No | — | Fecha UTC de la aceptación afirmativa. |
| `created_at` | TEXT | No | predeterminado `CURRENT_TIMESTAMP` | Fecha y hora de alta en UTC. |

Índice (`coupon_code`, `status`) · `ix_orders_coupon`. Índice (`user_id`, `id`) · `ix_orders_customer`. Único (`user_id`, `request_key`). Único (`folio`).

## `payments`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `order_id` | INTEGER | No | PK 1, FK `orders.id` | Pedido asociado. |
| `reference` | TEXT | No | — | Referencia del pago simulado. |
| `amount` | INTEGER | No | — | Monto de pago en centavos MXN. |
| `status` | TEXT | No | — | Estado según el flujo de la entidad. |
| `updated_at` | TEXT | No | predeterminado `CURRENT_TIMESTAMP` | Fecha UTC del último cambio. |

Único (`reference`).

## `products`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | No | PK 1 | Identificador interno. |
| `sku` | TEXT | No | — | Identificador comercial. |
| `category_id` | INTEGER | No | FK `categories.id` | Categoría del producto. |
| `name` | TEXT | No | — | Nombre mostrado. |
| `family` | TEXT | No | — | Agrupa variantes compatibles por familia. |
| `description` | TEXT | No | — | Descripción del producto. |
| `platform` | TEXT | No | — | Plataforma o compatibilidad anunciada. |
| `image` | TEXT | No | — | Ruta local de una portada registrada. |
| `price` | INTEGER | No | — | Precio vigente en centavos MXN (1 a 10 000 000). |
| `stock` | INTEGER | No | predeterminado `0` | Unidades disponibles (0 a 1 000 000). |
| `active` | INTEGER | No | predeterminado `1` | Indicador 0/1 de vigencia. |

Índice (`active`, `category_id`, `price`, `id`) · `ix_products_catalog`. Único (`sku`).

## `schema_migrations`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `version` | INTEGER | No | PK 1 | Identificador del cambio de esquema o datos. |
| `applied_at` | TEXT | No | predeterminado `CURRENT_TIMESTAMP` | Fecha UTC en que se aplicó. |

## `sessions`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | TEXT | No | PK 1 | SHA-256 de la credencial de sesión. |
| `user_id` | INTEGER | Sí | FK `users.id` | Usuario titular o asociado. |
| `csrf` | TEXT | No | — | Valor aleatorio asociado a la sesión. |
| `expires_at` | INTEGER | No | — | Vencimiento Unix en milisegundos. |

Índice (`expires_at`) · `ix_sessions_expiry`.

## `shipments`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `order_id` | INTEGER | No | PK 1, FK `orders.id` | Pedido asociado. |
| `method` | TEXT | No | — | Modalidad de entrega digital. |
| `tracking` | TEXT | Sí | — | Referencia de seguimiento digital. |
| `status` | TEXT | No | — | Estado según el flujo de la entidad. |
| `updated_at` | TEXT | No | predeterminado `CURRENT_TIMESTAMP` | Fecha UTC del último cambio. |

Único (`tracking`).

## `users`

| Campo | Tipo | Nulo | Clave y valor por defecto | Uso |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | No | PK 1 | Identificador interno. |
| `name` | TEXT | No | — | Nombre mostrado. |
| `email` | TEXT | No | — | Correo de acceso único. |
| `password_hash` | TEXT | No | — | Sal y hash scrypt. |
| `role` | TEXT | No | predeterminado `'client'` | Rol client o admin. |
| `active` | INTEGER | No | predeterminado `1` | Indicador 0/1 de vigencia. |
| `created_at` | TEXT | No | predeterminado `CURRENT_TIMESTAMP` | Fecha y hora de alta en UTC. |
| `avatar` | TEXT | No | predeterminado `'memo'` | Identificador del avatar de catálogo. |
| `avatar_image` | TEXT | Sí | — | Imagen JPEG normalizada de hasta 16 000 caracteres. |

Único (`email`).

## Consultas y respaldo

La vista `sales_report` presenta ventas aprobadas para agregación. Los reportes cruzan movimientos y existencia. Ejecuta `npm run db:backup -- ruta.mgbackup` y restaura a una ruta nueva con `npm run db:restore -- ruta.mgbackup`. El manual técnico describe `BACKUP_KEY` y `DB_PATH`.

Fuentes del esquema [migraciones y semilla](../Proyecto/Back_End/db) y [consultas](../Proyecto/Back_End/db/reportes.sql).

## Comentarios públicos y método de pago

La migración [007-comments.sql](../Proyecto/Back_End/db/007-comments.sql) crea la tabla `community_comments` en modo estricto.

| Campo | Tipo | Uso |
| --- | --- | --- |
| `id` | INTEGER PRIMARY KEY | Identificador interno del comentario. |
| `author` | TEXT NOT NULL | Nombre de perfil registrado en el momento de publicar. |
| `body` | TEXT NOT NULL | Texto público. La API valida de 5 a 450 caracteres y exige confirmación de publicación. |
| `created_at` | TEXT NOT NULL | Marca temporal con valor inicial `CURRENT_TIMESTAMP`. |

[009-payment-method.sql](../Proyecto/Back_End/db/009-payment-method.sql) agrega `payments.method` como texto con restricción a `card` o `paypal`. El campo es anulable para pagos históricos y los pedidos nuevos registran el método seleccionado. La API conserva los campos históricos de términos del pedido, y la aceptación vigente pertenece al flujo de registro.

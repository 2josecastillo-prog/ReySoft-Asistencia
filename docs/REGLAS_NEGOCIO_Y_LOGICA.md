# Reglas de negocio y logica actual

Documento consolidado de reglas funcionales y logica operativa de `ReySoft-Asistencia`, alineado con el backend actual y el esquema PostgreSQL vigente.

## 1. Modelo SaaS multiempresa

RN-01. Cada centro educativo se representa como una `organization`.

RN-02. Toda informacion escolar operativa debe estar asociada a `organization_id`:

- cursos
- tutores
- estudiantes
- asistencia
- plantillas de WhatsApp
- usuarios escolares
- auditoria relacionada

RN-03. Las consultas escolares filtran por `organization_id` del usuario autenticado.

RN-04. Un usuario escolar no puede leer, crear, editar ni desactivar datos de otra organizacion.

RN-05. El `super_admin` puede operar globalmente sin pertenecer a una organizacion.

RN-06. Si una organizacion se elimina directamente en base de datos, sus datos relacionados se eliminan por cascada donde las claves foraneas lo permiten. En la aplicacion no existe un flujo publico de eliminacion definitiva de centros.

## 2. Estados de organizaciones

RN-07. Estados permitidos:

- `pending`
- `active`
- `suspended`
- `cancelled`

RN-08. Solo las organizaciones `active` pueden usar el panel escolar y el portal de padres.

RN-09. Si la organizacion esta `pending`, `suspended` o `cancelled`, el backend bloquea el acceso con un mensaje explicativo.

RN-10. Si una organizacion activa tiene una activacion expirada, el sistema la cambia automaticamente a `suspended` cuando se consulta login, usuario actual, portal de padres o listados administrativos que sincronizan expiraciones.

## 3. Registro y administracion de centros

RN-11. Los centros no se registran publicamente.

RN-12. Solo el `super_admin` puede crear centros educativos desde el panel global.

RN-13. Al crear un centro, el `super_admin` debe crear tambien el primer usuario `school_admin`.

RN-14. El correo del centro y el correo del administrador deben ser diferentes.

RN-15. El correo del centro debe ser unico en `organizations`.

RN-16. El correo de usuario debe ser unico en `users`.

RN-17. Al crear un centro se crean automaticamente las plantillas de WhatsApp por defecto.

RN-18. El `super_admin` puede editar centros ya creados:

- nombre
- correo
- telefono
- colores
- footer configurable
- estado permitido por el formulario

RN-19. El `super_admin` puede subir el logo de un centro.

RN-20. El `super_admin` puede activar, suspender o cancelar centros.

RN-21. Al activar un centro se crea un registro en `subscription_activations`.

RN-22. La activacion puede tener `expiration_date` opcional.

RN-23. La activacion registra usuario activador, notas y fecha.

RN-24. Activar, suspender, cancelar, crear y editar centros genera auditoria.

## 4. Roles y permisos

RN-25. Roles permitidos:

- `super_admin`
- `school_admin`
- `staff`

RN-26. `super_admin` debe tener `organization_id = NULL`.

RN-27. `school_admin` y `staff` deben tener `organization_id` obligatorio.

RN-28. `super_admin` puede:

- crear centros
- editar centros
- subir logos de centros
- activar centros
- suspender centros
- cancelar centros
- ver dashboard global
- ver notificaciones
- marcar notificaciones como leidas
- ver historial de activaciones

RN-29. `school_admin` puede:

- administrar configuracion de su centro
- subir logo de su centro
- administrar usuarios `staff`
- crear, editar y desactivar cursos
- crear, editar y desactivar tutores
- crear, editar y desactivar estudiantes
- asignar tutores a estudiantes
- cambiar tutor principal
- registrar asistencia
- editar y eliminar asistencia
- editar plantillas de WhatsApp
- importar y exportar estudiantes
- ver reportes

RN-30. `staff` puede:

- ver cursos
- ver tutores
- ver estudiantes
- registrar asistencia
- generar enlaces de WhatsApp
- ver reportes
- ver configuracion del centro

RN-31. `staff` no puede:

- editar configuracion del centro
- crear usuarios
- editar plantillas
- editar o eliminar asistencia
- crear, editar o desactivar cursos, tutores o estudiantes
- administrar centros

## 5. Autenticacion y seguridad

RN-32. El login de usuarios escolares usa correo y contrasena.

RN-33. Las contrasenas se guardan con bcrypt.

RN-34. El backend nunca devuelve `password_hash`.

RN-35. La sesion usa JWT con expiracion.

RN-36. Los endpoints protegidos requieren token Bearer.

RN-37. Un token de padres no puede usarse en endpoints escolares.

RN-38. Un token escolar no puede usarse como token de padres.

RN-39. En produccion no se permite usar el `SECRET_KEY` por defecto.

RN-40. En produccion con Supabase Storage, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son obligatorios si `STORAGE_BACKEND=supabase`.

## 6. Usuarios escolares

RN-41. El `school_admin` administra usuarios `staff` de su organizacion.

RN-42. No se permite crear usuarios `super_admin` desde endpoints escolares.

RN-43. No se permite crear usuarios `school_admin` desde endpoints escolares.

RN-44. El correo de `staff` debe ser unico.

RN-45. Eliminar un usuario `staff` desde la aplicacion lo desactiva con `is_active=false`.

RN-46. Crear, editar y desactivar usuarios `staff` genera auditoria.

## 7. Cursos

RN-47. Cada curso pertenece a una organizacion.

RN-48. Un curso se identifica por:

- nombre
- seccion
- ano academico
- organizacion

RN-49. No puede existir otro curso con la misma combinacion `organization_id`, `name`, `section`, `academic_year`.

RN-50. Eliminar un curso desde la aplicacion no borra la fila; marca `is_active=false`.

RN-51. `school_admin` administra cursos.

RN-52. `staff` puede ver cursos.

## 8. Tutores

RN-53. Cada tutor pertenece a una organizacion.

RN-54. El nombre completo y telefono son obligatorios.

RN-55. El telefono se limpia antes de guardarse o buscarse:

- espacios
- guiones
- parentesis
- simbolos no numericos

RN-56. La busqueda de tutores permite buscar por nombre, relacion o telefono limpio.

RN-57. Eliminar un tutor desde la aplicacion no borra la fila; marca `is_active=false`.

RN-58. Crear y editar tutores genera auditoria.

## 9. Estudiantes

RN-59. Cada estudiante pertenece a una organizacion.

RN-60. Cada estudiante debe tener `course_id`; no se guarda el curso como texto en la tabla de estudiantes.

RN-61. El curso asignado al estudiante debe pertenecer a la misma organizacion.

RN-62. El codigo de estudiante, si se usa, debe ser unico dentro de la organizacion.

RN-63. Un estudiante debe tener al menos un tutor al crearse desde el formulario principal.

RN-64. Los tutores asignados al estudiante deben pertenecer a la misma organizacion.

RN-65. No se permite asignar el mismo tutor dos veces al mismo estudiante.

RN-66. Un estudiante puede tener varios tutores.

RN-67. Un tutor puede tener varios estudiantes.

RN-68. Cada estudiante puede tener un solo tutor principal.

RN-69. Si se asigna un nuevo tutor principal, el sistema desmarca automaticamente el tutor principal anterior.

RN-70. Eliminar un estudiante desde la aplicacion no borra la fila; marca `is_active=false`.

RN-71. Crear, editar y desactivar estudiantes genera auditoria.

## 10. Importacion y exportacion de estudiantes

RN-72. Se puede exportar estudiantes en `.xlsx`.

RN-73. Se puede exportar estudiantes en `.csv` compatible con Excel.

RN-74. La exportacion contiene:

- `nombre_completo`
- `codigo`
- `curso`
- `seccion`
- `anio_academico`
- `activo`
- `tutor_principal`
- `tutor_principal_telefono`

RN-75. En Excel, los encabezados se exportan en verde.

RN-76. Las columnas de Excel ajustan su ancho al contenido hasta un maximo controlado.

RN-77. El CSV se genera en UTF-8 con BOM para abrir acentos correctamente en Excel.

RN-78. La importacion acepta `.xlsx` y `.csv`.

RN-79. Columnas obligatorias para importar:

- `nombre_completo`
- `codigo`
- `curso`
- `seccion`
- `anio_academico`
- `activo`
- `tutor_principal_telefono`

RN-80. Para importar, el curso debe existir previamente en la misma organizacion.

RN-81. Para importar, el tutor principal debe existir previamente, estar activo y pertenecer a la misma organizacion.

RN-82. Si una fila tiene `codigo` y ya existe ese estudiante en la organizacion, se actualiza.

RN-83. Si no existe estudiante con ese codigo, se crea.

RN-84. La importacion asigna o actualiza el tutor principal.

RN-85. La importacion registra auditoria con creados, actualizados y errores.

## 11. Asistencia

RN-86. Estados permitidos:

- `arrived`
- `absent`
- `late`
- `early_pickup`
- `excused`

RN-87. Cada registro de asistencia pertenece a una organizacion y a un estudiante.

RN-88. El estudiante de la asistencia debe pertenecer a la misma organizacion del usuario.

RN-89. Al crear asistencia se guarda `recorded_by_user_id`.

RN-90. `school_admin` y `staff` pueden registrar asistencia.

RN-91. Solo `school_admin` puede editar o eliminar asistencia.

RN-92. Regla diaria:

- por estudiante y fecha solo puede existir un registro no `early_pickup`
- por estudiante y fecha solo puede existir un registro `early_pickup`
- si ya existe asistencia del dia, el unico segundo registro permitido es `early_pickup`

RN-93. La base de datos refuerza la regla diaria con indices unicos parciales.

RN-94. Editar asistencia valida nuevamente la regla diaria.

RN-95. Editar asistencia genera auditoria.

RN-96. La asistencia se puede filtrar por:

- fecha
- estado
- estudiante
- curso

## 12. Reportes de asistencia

RN-97. Los reportes solo muestran datos de la organizacion del usuario autenticado.

RN-98. Reporte por estudiante:

- estudiante
- codigo
- curso
- conteos por estado
- total de registros
- fechas
- horas
- status
- notas
- nivel de riesgo
- color de riesgo

RN-99. Reporte por curso:

- curso
- cantidad de estudiantes
- conteos agregados por estado
- registros detallados con fechas, horas y status
- resumen de estudiantes en riesgo
- nivel y color de riesgo del curso

RN-100. Cada 3 registros `excused` equivalen a 1 ausencia para calculo de riesgo.

RN-101. La formula de ausencias equivalentes es:

```text
ausencias_equivalentes = ausencias + floor(excusas / 3)
```

RN-102. Colores de riesgo:

- `green`: menos de 3 ausencias equivalentes
- `amber`: 3 a 5 ausencias equivalentes
- `red`: 6 o mas ausencias equivalentes

RN-103. Los reportes permiten filtros por:

- fecha inicial
- fecha final
- curso
- incluir o excluir estudiantes inactivos

## 13. WhatsApp

RN-104. La aplicacion no envia mensajes automaticamente por WhatsApp.

RN-105. La aplicacion genera enlaces `wa.me` con mensaje precargado.

RN-106. Cada organizacion tiene plantillas propias por estado de asistencia.

RN-107. Estados con plantilla por defecto:

- `arrived`
- `absent`
- `late`
- `early_pickup`
- `excused`

RN-108. Variables soportadas:

- `{student_name}`
- `{guardian_name}`
- `{course_name}`
- `{school_name}`
- `{date}`
- `{time}`

RN-109. Para generar enlace de WhatsApp se usa el tutor principal del estudiante.

RN-110. Si el estudiante no tiene tutor principal, se devuelve error claro.

RN-111. El telefono del tutor se limpia antes de generar la URL.

RN-112. El mensaje se codifica para URL.

RN-113. `school_admin` puede editar plantillas.

RN-114. `staff` puede consultar y usar plantillas, pero no editarlas.

## 14. Portal de padres

RN-115. El portal de padres usa login solo por numero de telefono.

RN-116. No existe OTP en la version actual.

RN-117. El telefono se limpia antes de buscar el tutor.

RN-118. Solo tutores activos de organizaciones activas pueden iniciar sesion.

RN-119. Si el telefono no pertenece a un tutor activo, se rechaza el login.

RN-120. Si el mismo telefono esta asociado a mas de un tutor activo, se rechaza el login y se indica contactar al centro.

RN-121. El token de padres tiene `scope=parent`.

RN-122. Un padre solo puede ver estudiantes relacionados con su tutor.

RN-123. Un padre solo puede ver asistencias de sus estudiantes relacionados.

RN-124. El portal de padres tambien respeta expiracion o suspension del centro.

## 15. Configuracion visual y footer

RN-125. Cada organizacion puede configurar:

- logo
- color primario
- color secundario
- color de acento
- texto de footer

RN-126. Los colores deben ser hexadecimales validos con formato `#RRGGBB`.

RN-127. El footer configurable tiene maximo 500 caracteres.

RN-128. `school_admin` puede modificar configuracion visual de su centro.

RN-129. `staff` solo puede consultar configuracion visual.

RN-130. El `super_admin` puede definir o editar estos datos al crear o editar centros.

RN-131. Los logos aceptan `PNG`, `JPG` y `WEBP`.

RN-132. El contenido real del archivo debe coincidir con el tipo declarado.

RN-133. En local los logos se guardan en `UPLOAD_DIR/logos`.

RN-134. En Vercel/produccion se recomienda `STORAGE_BACKEND=supabase` para guardar logos en Supabase Storage.

## 16. Dashboards

RN-135. Dashboard global del `super_admin` muestra:

- total de centros
- centros activos
- centros pendientes
- centros suspendidos
- solicitudes nuevas

RN-136. Dashboard escolar muestra solo datos de la propia organizacion:

- estudiantes activos
- tutores activos
- asistencias del dia
- ausencias del dia
- tardanzas del dia
- excusas del dia

## 17. Notificaciones

RN-137. El `super_admin` puede consultar notificaciones.

RN-138. Las notificaciones pueden estar leidas o no leidas.

RN-139. El `super_admin` puede marcar notificaciones como leidas.

RN-140. Las activaciones y expiraciones generan notificaciones internas.

## 18. Auditoria

RN-141. El sistema registra acciones importantes en `audit_logs`.

RN-142. La auditoria puede guardar:

- usuario
- organizacion
- accion
- entidad afectada
- datos anteriores
- datos nuevos
- IP
- navegador/dispositivo
- fecha

RN-143. Acciones auditadas actualmente incluyen:

- crear centro
- editar centro
- activar centro
- suspender centro
- cancelar centro
- expiracion automatica
- crear tutor
- editar tutor
- crear estudiante
- editar estudiante
- desactivar estudiante
- importar estudiantes
- crear usuario staff
- editar usuario staff
- desactivar usuario staff
- editar asistencia
- cambiar configuracion visual
- subir logo

## 19. Produccion y despliegue

RN-144. En produccion se debe usar una `SECRET_KEY` segura y unica.

RN-145. En Vercel con Supabase se usa `DATABASE_POOL_MODE=null`.

RN-146. En Vercel, el frontend usa `/api` como base de API.

RN-147. Las migraciones se ejecutan con Alembic antes de recibir trafico.

RN-148. Supabase Storage debe tener el bucket publico `school-logos` si se habilitan logos en produccion.

RN-149. `SUPABASE_SERVICE_ROLE_KEY` solo debe existir como variable secreta del backend en Vercel.

RN-150. `CORS_ORIGINS` debe limitarse al dominio real de produccion.

## 20. Principios de integridad

RN-151. Los endpoints no deben confiar en IDs enviados por el cliente sin validar pertenencia a la organizacion.

RN-152. Los borrados operativos de cursos, tutores, estudiantes y staff son desactivaciones logicas.

RN-153. Las claves foraneas mantienen integridad referencial.

RN-154. Los datos normalizados se guardan por relacion, no como texto duplicado:

- estudiante usa `course_id`
- tutores se relacionan mediante `student_guardians`
- asistencia usa `student_id`

RN-155. La base de datos y la aplicacion trabajan juntas: la app valida reglas con mensajes claros y PostgreSQL refuerza reglas criticas con constraints e indices.

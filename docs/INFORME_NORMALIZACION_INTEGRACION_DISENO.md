# Informe: normalizacion, integracion y diseno de base de datos

Proyecto: ReySoft-Asistencia  
Fecha: 2026-05-26

## 1. Aplicacion de normalizacion

La base de datos de ReySoft-Asistencia fue disenada como un modelo relacional normalizado para una aplicacion SaaS multiempresa orientada a centros educativos. La entidad principal es `organizations`, que representa cada centro. Desde esa tabla se organizan los datos operativos: usuarios escolares, cursos, tutores, estudiantes, asistencias, plantillas de WhatsApp, notificaciones, activaciones de servicio y auditoria.

La normalizacion se aplico para evitar redundancia, facilitar mantenimiento, preservar integridad y permitir que varios centros usen la misma plataforma sin mezclar informacion. Por eso, los datos que pertenecen a un centro incluyen `organization_id`, lo que permite separar la informacion de cada organizacion tanto en la base como en el backend.

### Primera forma normal

El modelo cumple la primera forma normal porque los atributos se guardan como valores atomicos y no como listas dentro de una sola columna. Por ejemplo, los nombres de usuarios, tutores y estudiantes se separan en:

- `first_name`
- `middle_name`
- `last_name`
- `second_surname`

Esto evita depender de un unico campo `full_name` para ordenar, buscar o presentar nombres. El nombre completo puede calcularse desde esas partes, pero la base conserva los componentes individuales.

Tambien se evita guardar multiples tutores dentro de una columna del estudiante. En lugar de almacenar telefonos o nombres concatenados, se usa una tabla especifica llamada `student_guardians`. Esta decision permite que un estudiante tenga varios tutores y que un tutor pueda estar relacionado con varios estudiantes.

### Segunda forma normal

La segunda forma normal se aplica porque cada tabla tiene una clave primaria independiente basada en UUID, y los atributos dependen de la entidad que representan. Por ejemplo, los datos de un curso se guardan en `courses`, los datos del tutor en `guardians` y los datos del estudiante en `students`.

En `courses`, la combinacion `organization_id`, `name`, `section` y `academic_year` define una restriccion de unicidad. Esto impide que un mismo centro registre dos cursos equivalentes para el mismo ano escolar, pero permite que otros centros usen nombres de cursos iguales sin conflicto.

En `students`, el campo `student_code` es unico dentro de cada organizacion, no globalmente. Esta decision responde al contexto educativo: dos centros distintos podrian usar el mismo codigo interno para estudiantes diferentes, pero dentro de un mismo centro no debe repetirse.

### Tercera forma normal

La tercera forma normal se refleja en que no se almacenan datos derivados o dependientes de otras tablas. Un estudiante no guarda el nombre del curso como texto; guarda `course_id`. Si cambia el nombre o la seccion de un curso, no es necesario actualizar todos los estudiantes, porque la relacion se mantiene por clave foranea.

La misma logica se aplica a tutores y estudiantes. La relacion muchos a muchos se resuelve mediante `student_guardians`, con campos como `student_id`, `guardian_id` e `is_primary`. Asi se evita duplicar datos del tutor en cada estudiante y se conserva una estructura consistente.

Los estados controlados se modelan con ENUM de PostgreSQL, como:

- `organization_status`
- `user_role`
- `attendance_status`
- `subscription_status`
- `notification_type`

Esto reduce errores de escritura y evita valores no contemplados por la logica del sistema. Por ejemplo, una asistencia solo puede tener estados permitidos como `arrived`, `absent`, `late`, `early_pickup` o `excused`.

### Integridad y reglas en la base

La base utiliza claves foraneas, restricciones `UNIQUE`, restricciones `CHECK`, indices normales e indices unicos parciales. Un caso importante es el tutor principal: `student_guardians` permite varios tutores por estudiante, pero un indice unico parcial impide que exista mas de un `is_primary = true` para el mismo estudiante.

En asistencia se aplico una decision especial. Originalmente, la asistencia diaria era unica por estudiante y fecha. Luego se ajusto la regla para permitir un segundo registro el mismo dia solo cuando el segundo evento sea `early_pickup`. Para lograrlo sin perder integridad, se usan indices unicos parciales: uno para registros regulares y otro para retiro temprano. Esto mantiene control historico y permite representar mejor la realidad escolar.

## 2. Integracion de la base con la aplicacion

La aplicacion integra PostgreSQL mediante SQLAlchemy como ORM y Alembic como sistema de migraciones. Los modelos ubicados en `backend/app/models` representan las tablas reales de la base. Las rutas FastAPI exponen operaciones por dominio, y los esquemas Pydantic validan los datos que entran y salen de la API.

La conexion con la base se configura mediante la variable `DATABASE_URL`. En local, el proyecto puede trabajar con PostgreSQL usando Docker. En produccion, la aplicacion se conecta a PostgreSQL alojado en Supabase. Esta separacion permite mantener el mismo codigo de aplicacion usando diferentes entornos de base de datos.

Alembic cumple una funcion central porque registra la evolucion del esquema. En vez de modificar la base manualmente sin control, cada cambio estructural se versiona mediante migraciones. La tabla `alembic_version` no pertenece al modelo logico del negocio, pero si aparece en el modelo fisico porque Alembic la necesita para saber que migraciones ya fueron aplicadas.

### Flujo backend-base de datos

El flujo general es el siguiente:

1. El frontend envia una solicitud HTTP a FastAPI.
2. FastAPI valida autenticacion, rol y estado de la organizacion.
3. Pydantic valida la estructura del payload.
4. La ruta usa SQLAlchemy para consultar o modificar PostgreSQL.
5. El backend aplica reglas de negocio adicionales.
6. La respuesta se serializa sin exponer datos sensibles.

Por ejemplo, al crear un estudiante, el backend no acepta simplemente cualquier `course_id`. Primero valida que el curso exista y que pertenezca a la misma organizacion del usuario autenticado. Luego valida los tutores seleccionados y verifica que tambien pertenezcan a esa organizacion. Solo despues crea el estudiante y sus relaciones en `student_guardians`.

### Aislamiento multiempresa

El aislamiento de datos se logra con una combinacion de diseno relacional y logica de aplicacion. Las tablas escolares principales tienen `organization_id`, y las consultas filtran siempre por la organizacion del usuario actual. Esto aplica para cursos, tutores, estudiantes, asistencia, plantillas, usuarios escolares, dashboard y reportes.

El `super_admin` es una excepcion controlada. Puede ver y administrar todas las organizaciones, pero no pertenece a ningun centro. Por eso, en la tabla `users` existe una restriccion `CHECK`: si el rol es `super_admin`, `organization_id` debe ser `NULL`; si el rol es `school_admin` o `staff`, `organization_id` es obligatorio.

### Integracion con reglas funcionales

Cuando el superadmin crea un centro, la aplicacion registra una fila en `organizations`, crea un usuario `school_admin`, genera plantillas de WhatsApp por defecto y deja registros en notificaciones y auditoria. Cuando el centro se activa, suspende o cancela, el estado se actualiza en `organizations`, se registra la activacion en `subscription_activations` y se guarda la accion en `audit_logs`.

La asistencia tambien esta conectada con otros modulos. Cada registro de `attendance_records` se relaciona con estudiante, organizacion y usuario que registro la asistencia. A partir de esa informacion se generan dashboards, reportes por estudiante, reportes por curso y mensajes de WhatsApp.

El portal de padres usa la informacion de `guardians`, `student_guardians`, `students` y `attendance_records`. El tutor inicia sesion por telefono, y el backend solo le permite ver estudiantes asociados a ese tutor. Esto evita que un padre o tutor acceda a informacion de estudiantes no relacionados.

## 3. Criterios y decisiones de diseno

Una decision importante fue usar UUID como clave primaria en las tablas principales. En una aplicacion SaaS, UUID ayuda a evitar conflictos entre entornos, facilita integraciones futuras y reduce la exposicion de IDs incrementales faciles de adivinar.

Tambien se decidio separar claramente las responsabilidades de cada tabla. `organizations` almacena datos del centro y configuracion visual; `users` maneja credenciales, roles y estado de usuarios; `courses` organiza grados o secciones; `guardians` almacena tutores; `students` almacena alumnos; `student_guardians` gestiona la relacion entre estudiantes y tutores; y `attendance_records` conserva el historial de asistencia.

El diseno favorece la conservacion historica. Por eso, en cursos, tutores, estudiantes y usuarios staff se usa desactivacion logica mediante `is_active`, en lugar de eliminar registros directamente desde la aplicacion. Esto es importante porque un centro educativo puede necesitar consultar historiales, reportes o asistencias pasadas aunque un estudiante, curso o tutor ya no este activo.

Para eliminaciones de organizacion a nivel de base de datos, varias relaciones usan `ON DELETE CASCADE`. Esto permite eliminar datos dependientes si se borra un centro completo directamente en la base. Sin embargo, para informacion historica delicada, como el usuario que registro una asistencia o auditoria, se usa `ON DELETE SET NULL`. Asi se conserva el evento aunque el usuario original ya no exista.

Los ENUM fueron elegidos para valores cerrados, como roles, estados de organizacion y estados de asistencia. Esto mejora consistencia y hace mas claro el modelo fisico. Las restricciones `CHECK` se usan para validar colores hexadecimales y longitud del footer configurable, evitando que la base acepte valores fuera de formato.

En rendimiento, se agregaron indices sobre columnas usadas frecuentemente en filtros y relaciones: `organization_id`, `role`, `course_id`, `attendance_date`, `status`, `is_read`, `action`, `student_id` y `guardian_id`. Esto responde a consultas comunes como busqueda de estudiantes, filtros de tutores, asistencia por fecha, dashboard escolar, reportes y auditoria por centro.

La seguridad tambien fue criterio de diseno, no una adicion final. Las contrasenas se almacenan con bcrypt, los tokens JWT tienen expiracion, issuer, audience y version de token, y las respuestas no devuelven `password_hash`. Ademas, la aplicacion usa cookies HttpOnly, CSRF para acciones autenticadas por cookies, CORS configurado, cabeceras de seguridad, rate limiting, WAF en Vercel y validaciones de organizacion activa.

Finalmente, se incluyo auditoria para acciones importantes. La tabla `audit_logs` registra usuario, organizacion, accion, entidad afectada, datos anteriores, datos nuevos, IP, navegador y fecha. Esto permite responder preguntas como quien activo un centro, quien modifico un estudiante o quien cambio una configuracion visual.

En conjunto, el diseno busca equilibrio entre normalizacion, seguridad, rendimiento y crecimiento. La base no almacena datos duplicados innecesarios, la aplicacion refuerza reglas de negocio, y el modelo multiempresa permite que distintos centros operen dentro de la misma plataforma sin compartir informacion entre ellos.

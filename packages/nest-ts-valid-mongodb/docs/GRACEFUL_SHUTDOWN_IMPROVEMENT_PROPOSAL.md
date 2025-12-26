# 🏗 Propuesta de Mejora Arquitectónica: Graceful Shutdown

**Autor:** Senior Architect (Your Jarvis)  
**Fecha:** 26/12/2025  
**Prioridad:** ALTA

Este documento detalla el plan de acción para transformar el mecanismo de cierre de conexiones de `nest-ts-valid-mongodb` de una implementación "ingenua" a una solución de grado empresarial, resiliente a fallos de red y estados inconsistentes.

---

## 🚨 Fase 1: Resiliencia y Prevención de Bloqueos (CRÍTICO)

**Objetivo:** Evitar que el pod/proceso se quede colgado ("zombie") esperando una desconexión que nunca ocurre.

### 📝 Contexto
Actualmente, el código hace `await client.close()`. Si el driver de MongoDB entra en un estado de reintento infinito (común en particiones de red o cuando el clúster primario cae), esa promesa **nunca se resuelve**.
En entornos orquestados (Kubernetes, ECS), esto provoca que el orquestador tenga que matar el contenedor violentamente (`SIGKILL` / `kill -9`) después de un timeout largo, lo cual es sucio y puede corromper datos en vuelo si no se maneja bien.

### 🛠 Implementación Técnica
1.  **Circuit Breaker con Timeout:** Envolver el `nativeClient.close()` en un `Promise.race` contra un `setTimeout`.
2.  **Force Close:** Si el shutdown "amable" excede el tiempo límite (ej. 5000ms), forzar el cierre de la conexión (`force: true` en el driver de Mongo si es soportado, o simplemente liberar el recurso).

> "Mejor un final triste (timeout error) que una tristeza sin fin (hanging process)."

---

## 👁 Fase 2: Observabilidad Real (ALTA)

**Objetivo:** Dejar de esconder la basura bajo la alfombra. Saber **por qué** falló el cierre.

### 📝 Contexto
El código actual tiene un bloque `try/catch` en `module.ts` que captura cualquier error durante el cierre y solo loguea un mensaje genérico: `⚠️ Could not close MongoDB connection`.
Esto es **inaceptable** para debugging. Si falla por autenticación, por timeout, o por un error interno del driver, necesitamos saberlo. Un arquitecto no adivina, diagnostica con evidencia.

### 🛠 Implementación Técnica
1.  **Full Stack Trace Logging:** Modificar el `catch` para incluir `error.message` y `error.stack` en el Logger.
2.  **Distinción de Errores:** Diferenciar entre "no se pudo cerrar porque ya estaba cerrado" (trivial) vs "falló la red al cerrar" (crítico).

---

## ⚙️ Fase 3: Configurabilidad y Flexibilidad (MEDIA)

**Objetivo:** No asumir que "una talla sirve para todos". Permitir al usuario configurar su estrategia de salida.

### 📝 Contexto
Ahora mismo, el comportamiento está *hardcoded*. Quizás un usuario tiene operaciones de escritura muy largas y necesita 20 segundos de gracia. Otro, en una función Serverless (AWS Lambda), necesita morir en 500ms para no pagar tiempo de cómputo extra.

### 🛠 Implementación Técnica
1.  **Opciones de Inyección:** Permitir pasar opciones de shutdown en `forRoot` / `forRootAsync`.
    *   `shutdownTimeout`: Tiempo máximo de espera (default: 5000ms).
    *   `forceClose`: Booleano para forzar cierre inmediato.

---

## 🔄 Fase 4: Refinamiento del Ciclo de Vida (BAJA / REFINAMIENTO)

**Objetivo:** Coordinar el cierre de la base de datos con el cierre del servidor HTTP.

### 📝 Contexto
Actualmente usamos `OnModuleDestroy`. En NestJS, esto ocurre en paralelo para varios módulos. Existe un riesgo teórico (race condition) donde:
1.  El módulo de Mongo empieza a cerrar la conexión.
2.  Un módulo HTTP todavía está procesando un último request y trata de usar la DB.
3.  💥 Error: `Topology is closed`.

### 🛠 Implementación Técnica
1.  **Evaluar `beforeApplicationShutdown`:** Este hook ocurre antes. Investigar si mover la lógica aquí permite un cierre más ordenado (primero dejar de aceptar tráfico, luego cerrar DB).
2.  **Dependency Ordering:** Asegurar que el módulo de Mongo sea de los últimos en morir.

---

## 🏁 Conclusión

El código actual funciona para el "happy path" (camino feliz). Este plan lo prepara para la guerra (producción real). Empezaremos por la **Fase 1** porque un servidor que no se apaga es el problema operativo más costoso y molesto.

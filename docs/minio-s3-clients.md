# MinIO de Legalistas — Acceso vía clientes de escritorio

Esta guía cubre la configuración de **Cyberduck** y **Mountain Duck** para
acceder al bucket de Legalistas (`legalistas`) desde el escritorio, igual que
si fuera una unidad de red.

> **Nota**: las credenciales reales NO se guardan en este repositorio. Pedilas
> al administrador del sistema o consultá el archivo `.env` del entorno donde
> esté instalado el backend.

---

## 1. Credenciales y endpoint

| Dato | Valor |
|---|---|
| **Endpoint (URL del servidor)** | `https://static.legalistas.com.ar` |
| **Puerto** | 443 (HTTPS por defecto) |
| **Access Key** | (pedir al admin) |
| **Secret Key** | (pedir al admin) |
| **Bucket** | `legalistas` |
| **Region** | `us-east-1` (ficticia, MinIO la ignora) |
| **Path style** | ✅ **Sí, habilitado** (esto es obligatorio para MinIO) |

El protocolo S3 que usa MinIO es compatible con cualquier cliente que soporte
"S3 Compatible Storage".

---

## 2. Cyberduck (gratuito)

**Descarga**: https://cyberduck.io

### Pasos

1. Abrir Cyberduck.
2. **Archivo → Nueva conexión** (o `⌘+N` en Mac, `Ctrl+N` en Windows).
3. En el dropdown de tipo, elegir **"Amazon S3"** (o "S3 Compatible Storage" si está disponible).
4. Completar:
   - **Servidor**: `static.legalistas.com.ar`
   - **Puerto**: `443`
   - **Access Key ID**: el access key.
   - **Secret Access Key**: el secret key.
5. Hacer click en **"Más opciones"** y activar:
   - ✅ **"Use HTTPS"**
   - ✅ **"Path style requests"** (clave para MinIO)
6. Conectar.
7. Al entrar, vas a ver la lista de buckets disponibles. Hacer doble-click en `legalistas`.
8. **Recomendación**: guardá el bookmark con **"Marcador → Nuevo marcador"** para no repetir el setup.

### Navegación

Adentro del bucket vas a ver las dos secciones principales:

- `crm/` — leads activos, organizados por etapa.
- `casos/` — expedientes judiciales activos, por etapa.

Podés crear subcarpetas libremente dentro de cualquier carpeta de lead/caso.

---

## 3. Mountain Duck (montaje como unidad de red)

**Descarga**: https://mountainduck.io (versión de pago, prueba 14 días)

Mountain Duck monta el bucket como una **unidad del Explorador / Finder**, así
que podés arrastrar archivos como si fuera un USB.

### Pasos

1. Instalar Mountain Duck.
2. Hacer click derecho en el ícono del task bar → **"New Bookmark"**.
3. Elegir **"Amazon S3"** como tipo de conexión.
4. Completar igual que en Cyberduck:
   - Server: `static.legalistas.com.ar`
   - Port: `443`
   - Access Key + Secret Key
5. En **"More Options"** activar:
   - ✅ HTTPS
   - ✅ Path style requests
6. Probar la conexión.
7. Una vez guardado el marcador, click derecho sobre él → **"Connect"**.
8. Aparece una unidad nueva en el Explorador (Windows) o Finder (Mac).

---

## 4. Convención de carpetas

Cada lead o caso tiene su propia carpeta con formato `APELLIDO_Nombre_ID`. Por
ejemplo:

```
legalistas/
├── crm/
│   ├── nueva-consulta/
│   │   ├── ANDEREGGEN_Agustin_780/
│   │   └── PEREZ_Juan_812/
│   └── ganados/
└── casos/
    ├── documentacion/
    │   └── ANDEREGGEN_Agustin_780/    # mismo ID que el lead original
    └── judicial/
```

El **ID del lead y del caso son el mismo número** durante toda la vida del
expediente. Cuando un lead se convierte en caso, su carpeta se mueve
automáticamente de `crm/ganados/` a `casos/documentacion/`.

---

## 5. Recomendaciones de uso

- **No mover carpetas manualmente** entre secciones (`crm/`, `casos/`). La
  plataforma se encarga del movimiento automático al cambiar el estado del
  lead o caso. Si las movés a mano, la plataforma puede no encontrar los
  archivos del expediente.
- **Crear sub-carpetas libremente** dentro de la carpeta de un lead/caso:
  - `pruebas/`
  - `pericias/`
  - `correspondencia/`
  - lo que necesites para organizar el expediente internamente.
- **No renombrar la carpeta raíz** del lead/caso. Si querés cambiar el nombre
  visible, editá los datos del lead/caso en la plataforma (la carpeta no se
  renombra, pero podés agregar notas internas).

---

## 6. Soporte

Si la conexión falla:
- Verificar que el endpoint sea **HTTPS** (no HTTP).
- Confirmar que **Path style requests** esté activado.
- Revisar que el firewall corporativo no bloquee el puerto 443 hacia
  `static.legalistas.com.ar`.

Para reset de credenciales o problemas de acceso, contactar al **Director de
IT** o al equipo de soporte interno de Legalistas.

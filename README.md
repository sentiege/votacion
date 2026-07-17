# 🗳️ Sistema de Votación Electrónica
## Escuela de Ciencias Políticas y Sociales · UNA

Portal de voto electrónico para la elección de delegados del centro de estudiantes.

---

## 🗂️ Estructura del proyecto

```
votacion/
├── index.html          → Pantalla de inicio (acceso a Admin y Máquina)
├── css/
│   └── style.css       → Estilos globales
├── js/
│   └── data.js         → Gestión de datos (localStorage)
├── admin/
│   ├── index.html      → Panel de Administración
│   └── admin.js        → Lógica del panel
└── maquina/
    ├── index.html      → Máquina de votación
    └── maquina.js      → Lógica de votación
```

---

## 🚀 Módulos

### ⚙️ Panel de Administración (`/admin/`)
| Menú | Función |
|---|---|
| **PADRÓN** | Cargar electores habilitados por CI, importar CSV, habilitar/inhabilitar, resetear elección |
| **CANDIDATOS** | Registrar candidatos con nombre, lista/partido y foto |
| **CONTEO DE VOTOS** | Ver resultados en tiempo real, barras de resultados, ganador destacado, imprimir acta, exportar CSV |

### 🗳️ Máquina de Votación (`/maquina/`)
1. **Pantalla CI** — Teclado numérico para ingresar cédula
2. **Pantalla de Votación** — Candidatos con foto y número de lista
3. **Pantalla de Confirmación** — Revisión antes de emitir
4. **Pantalla de Gracias** — Confirmación + auto-reset en 8 seg

---

## 🔒 Validaciones implementadas
- CI no encontrada en el padrón → acceso denegado
- CI inhabilitada → acceso denegado  
- CI ya votó → acceso denegado (voto único garantizado)
- Reseteo de elección limpia todos los votos del localStorage

---

## 🛠️ Tecnologías
- HTML5 + CSS3 + JavaScript Vanilla
- **localStorage** para persistencia de datos (sin backend)
- Diseño responsive, optimizado para tablet
- Sin dependencias externas

---

## 📋 Uso rápido

1. Abrir `index.html` en el navegador
2. Ir al **Panel de Administración**:
   - Cargar electores en **PADRÓN**
   - Registrar candidatos en **CANDIDATOS**
3. Abrir la **Máquina de Votación** en la tablet
4. Los electores ingresan su CI y votan
5. Ver resultados en **CONTEO DE VOTOS**

---

*Ejercicio del voto electrónico · ECP-UNA · Paraguay*
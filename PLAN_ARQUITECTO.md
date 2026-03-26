# 🧪 Plan: Arquitecto de Redes

Card interactiva donde el usuario construye su propia red neuronal
desde cero para resolver problemas de clasificación 2D.
El objetivo es que entienda visualmente por qué la arquitectura importa.

---

## 🎯 Concepto central

- El **problema está fijo** (datos en un canvas 2D)
- El **usuario construye la arquitectura** (capas, neuronas, activación, optimizador)
- La red entrena y el canvas muestra la **frontera de decisión** en tiempo real
- El usuario experimenta en carne propia por qué una red plana no puede resolver XOR,
  o por qué relu funciona mejor que sigmoid en capas profundas

---

## 🗂️ Problemas disponibles (de fácil a difícil)

### 🟢 Nivel 1 — Diagonal
**Problema:** puntos arriba/abajo de una línea diagonal.
Separable linealmente.
**Solución mínima:** 0 capas ocultas, 1 neurona de salida, sin activación (linear).
**Por qué es útil:** el punto de partida. Si el usuario añade capas innecesarias
ve que la red igual lo resuelve pero tarda más. Introduce el concepto de
"sobrearquitectura".

---

### 🟢 Nivel 2 — Dos nubes
**Problema:** dos grupos de puntos gaussianos bien separados.
**Solución mínima:** igual que diagonal, pero más intuitivo visualmente.
**Por qué es útil:** primer contacto con el scatter plot. El usuario ve
la frontera de decisión como una línea y lo entiende de golpe.

---

### 🟡 Nivel 3 — XOR
**Problema:** 4 esquinas de un cuadrado, alternando clase 0 y 1
en patrón de tablero (con ruido gaussiano alrededor de cada esquina).
**Solución mínima:** 1 capa oculta con ≥2 neuronas.
**Por qué es útil:** el clásico que demuestra que sin capas ocultas
es imposible. La frontera pasa de línea recta a forma de X o cruz.
Momento "ajá" garantizado.

---

### 🟡 Nivel 4 — Círculo / Donut
**Problema:** puntos dentro de un círculo (clase 1) vs fuera (clase 0).
**Solución mínima:** 1 capa oculta con ≥3-4 neuronas.
**Por qué es útil:** la frontera de decisión tiene que ser curva y cerrada.
Con sigmoid funciona bien; con relu el usuario verá que necesita más neuronas
para aproximar la circunferencia con "segmentos".

---

### 🟡 Nivel 5 — Tablero de ajedrez (2×2)
**Problema:** 4 cuadrantes alternando clase 0/1 como un tablero.
**Solución mínima:** 2 capas ocultas, ~4 neuronas cada una.
**Por qué es útil:** más complejo que XOR. La frontera tiene que hacer
varias curvas. El usuario ve que una sola capa ya no es suficiente.

---

### 🔴 Nivel 6 — Espiral doble
**Problema:** dos espirales entrelazadas, una por clase.
El clásico benchmark de clasificación no lineal.
**Solución mínima:** 2-3 capas ocultas, 8-16 neuronas, tanh o relu.
**Por qué es útil:** sin profundidad suficiente es imposible. Con sigmoid
la red colapsa (vanishing gradient). El usuario descubre por qué tanh
o relu funcionan mejor en redes profundas. El más satisfactorio de resolver.

---

### 🔴 Nivel 7 — Anillos concéntricos
**Problema:** 3 anillos concéntricos, clase alternada (0/1/0 o 1/0/1).
**Solución mínima:** 2+ capas ocultas, ~8 neuronas.
**Por qué es útil:** frontera de decisión radial con múltiples "capas".
Visualmente espectacular cuando la red lo resuelve.

---

### 🔴 Nivel 8 — Tablero 4×4
**Problema:** tablero de ajedrez 4×4, 16 cuadrantes alternados.
**Solución mínima:** 3+ capas, 16+ neuronas.
**Por qué es útil:** el más difícil. Pone a prueba si el usuario ya
entiende la relación entre complejidad del problema y profundidad de la red.
Puede que necesite experimentar con el learning rate y el optimizador.

---

## 🎛️ Controles de arquitectura

### Capas ocultas
- Botón **+ Añadir capa** → inserta capa al final (antes de la salida)
- Botón **− Eliminar** por capa
- Límite: 0 a 5 capas ocultas

### Por cada capa
- **Neuronas:** slider o +/- de 1 a 32
- **Activación:** selector → `relu` | `leakyRelu` | `elu` | `tanh` | `sigmoid` | `linear`

### Global
- **Optimizador:** `SGD` | `Momentum` | `Adam`
- **Learning rate:** selector con valores predefinidos → `0.1` | `0.01` | `0.001` | `0.0001`
- **Velocidad:** épocas por frame → 1 | 10 | 50 | 100

### Entrenamiento
- **▶ Entrenar** / **⏸ Pausar**
- **↺ Reiniciar pesos** (misma arquitectura, pesos nuevos)
- **🗑 Limpiar todo** (arquitectura + pesos)

---

## 🖼️ Visualización

### Canvas principal (izquierda)
- **Fondo:** grid de predicciones (cada ~4px evalúa la red) coloreado en
  azul claro / rojo claro según la predicción
- **Puntos:** scatter plot encima, azul sólido / rojo sólido, con borde blanco
- Se redibuja cada N épocas (no cada frame para no bloquear el entrenamiento)

### NetworkDiagram (derecha)
- El que ya existe, actualizado en tiempo real mientras el usuario construye
- Neuronas iluminadas con activaciones durante el entrenamiento

### Métricas
- **Loss** en tiempo real (MSE o cross-entropy)
- **Accuracy** sobre los puntos de entrenamiento
- **Épocas** transcurridas
- Pequeña gráfica de curva de loss (últimas N épocas) — nice to have

---

## 🏗️ Arquitectura de componentes

```
ArquitectoCard/
├── DetectorArquitecto.tsx       ← componente principal
├── useArquitectoTraining.ts     ← hook: red dinámica + entrenamiento
├── DecisionCanvas.tsx           ← canvas con frontera de decisión
├── LayerBuilder.tsx             ← UI para construir la arquitectura
├── problems.ts                  ← definición de los 8 problemas (datos + metadata)
└── types.ts                     ← tipos compartidos
```

### `problems.ts`
Cada problema exporta:
```ts
interface Problem {
  id:          string;
  nombre:      string;
  descripcion: string;
  nivel:       1 | 2 | 3;           // verde / amarillo / rojo
  generar:     () => Point[];        // genera los puntos con ruido
  arquitecturaBase: LayerConfig[];   // sugerencia mínima (oculta al usuario)
}
```

### `useArquitectoTraining`
- Recibe `LayerConfig[]` (arquitectura actual) y el `Problem` seleccionado
- Cuando la arquitectura cambia → reconstruye `NetworkN` con los nuevos parámetros
- Expone `loss`, `accuracy`, `activationsRef`, controles de entrenamiento

---

## 💡 Detalles UX importantes

- Cuando el usuario **no puede resolver** el problema con su arquitectura actual,
  mostrar un hint sutil: *"¿Has probado añadir una capa oculta?"*
  (solo después de N épocas sin mejorar)
- **Celebración** cuando accuracy > 95%: confetti o animación en el canvas
- El selector de problema tiene una descripción breve del "reto" sin revelar
  la solución, para que el usuario experimente
- Los problemas más difíciles se desbloquean cuando resuelves el anterior
  (opcional, para darle narrativa progresiva)
- Persistir la arquitectura del último intento por problema en `localStorage`

---

## 📅 Orden de implementación sugerido

1. `problems.ts` — generadores de datos para los 8 problemas
2. `DecisionCanvas.tsx` — el canvas con frontera de decisión (off-screen canvas para la grid)
3. `LayerBuilder.tsx` — UI de construcción de arquitectura
4. `useArquitectoTraining.ts` — hook que orquesta todo
5. `DetectorArquitecto.tsx` — ensamblaje final
6. Pulir UX: hints, celebración, desbloqueo progresivo

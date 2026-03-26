# 🧠 Neuron Lab

**🌐 Demo en vivo → [dniskav.github.io/Neuron_experiments](https://dniskav.github.io/Neuron_experiments/)**

**Experimentos interactivos de redes neuronales — construidas desde cero, sin magia.**

Neuron Lab es un playground visual donde cada tarjeta es un experimento de machine learning diferente. Puedes ver la red neuronal en tiempo real, entrenarla, pausarla, reiniciarla y entender qué está pasando por dentro gracias a las neuronas que se iluminan según sus activaciones.

Todo funciona sobre [`@dniskav/neuron`](https://www.npmjs.com/package/@dniskav/neuron), una librería propia escrita desde cero en TypeScript, sin dependencias externas: ni TensorFlow, ni PyTorch, ni nada. Solo matemáticas.

---

## ✨ ¿Qué hay dentro?

### 🔵 Neurona única — Clasificación binaria
Dos tarjetas con una sola neurona y sigmoide. Una aprende a distinguir **mayor de edad** (umbral: 18 años), la otra a detectar **ancianos** (umbral: 60). El caso más simple posible: un peso, un bias, un gradiente. Perfecto para entender qué hace realmente un perceptrón.

---

### 🎨 Clasificador de colores
Una red multicapa que aprende a decir si un color es **claro u oscuro**. Puedes pintar swatches, etiquetar manualmente los que no clasifica bien y reentrenar. Incluye una neurona oculta que puedes inspeccionar y las reglas aprendidas explícitas.

---

### ⭕ Detector de círculo
Arrastra un punto en el canvas y la red predice en tiempo real si está **dentro o fuera** de un círculo. Entrenada con regresión supervisada sobre coordenadas normalizadas. Ves la predicción actualizarse en cada frame mientras mueves el ratón.

---

### 🐦 Angry Bird — Predicción de ángulo
Físicas de proyectil simuladas con gravedad real. La red aprende a predecir el **ángulo de disparo óptimo** para darle a un blanco, sorteando un obstáculo. Puedes arrastrar el obstáculo y el blanco; la red recalcula en tiempo real usando lo que aprendió.

---

### 💣 Cañón — Regresión de trayectoria
Similar al Angry Bird pero el cañón necesita predecir **ángulo y potencia** simultáneamente (dos salidas). La red aprende la relación entre la geometría de la escena y los parámetros de disparo. También interactivo con arrastre.

---

### 🌀 Laberinto — LSTM + TD(λ) + RL
El experimento más complejo. Un agente navega un laberinto usando una **red LSTM** con memoria recurrente. Aprende con *Temporal Difference* (TD(λ)) y backpropagation through time (BPTT). El agente recuerda qué celdas ya visitó este episodio y usa esa información como entrada directa. Incluye waypoints con bonificación de recompensa y un sistema de "mejor demo" para guardar la mejor ejecución.

---

### 🕹️ Arkanoid — DQN online
Una paleta que aprende sola a **no dejar caer la bola**. Usa Q-learning online (sin replay buffer) con una red densa de tres capas. Las capas ocultas usan **Leaky ReLU** para evitar el problema de neuronas muertas. El entrenamiento se guarda en `localStorage` automáticamente cada 25 episodios.

---

## 🔬 La librería: `@dniskav/neuron`

Toda la inteligencia viene de aquí. Escrita a mano, documentada, sin dependencias:

| Módulo | Qué hace |
|--------|----------|
| `Neuron` | Neurona simple con un peso por entrada |
| `NeuronN` | Neurona con N pesos (para capas densas) |
| `Layer` | Capa de neuronas |
| `Network` / `NetworkN` | Red densa multicapa con backpropagation |
| `NetworkLSTM` | Red con capa LSTM + capas densas + BPTT |
| `SGD`, `Momentum`, `Adam` | Optimizadores |
| `relu`, `sigmoid`, `tanh`, `linear`, `leakyRelu`, `elu` | Funciones de activación |
| `mse`, `crossEntropy` | Funciones de pérdida |

---

## 🧩 Arquitectura visual

Cada tarjeta incluye un **diagrama SVG de la red** donde:

- 🔵 Cada columna es una capa; cada círculo, una neurona
- 🟣 El color indica el tipo de activación (índigo = relu, violeta = leaky relu, verde = sigmoid, ámbar = lstm...)
- ✨ Las neuronas se iluminan en tiempo real según sus activaciones usando `requestAnimationFrame` directo sobre el DOM — cero re-renders de React

---

## 🛠️ Stack técnico

- **React + TypeScript + Vite**
- **Chakra UI** — componentes de interfaz
- **React Three Fiber + Three.js** — escenas 3D/2D para las simulaciones
- **`@dniskav/neuron`** — la librería propia que lo mueve todo

---

## 🚀 Arrancar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) y empieza a entrenar. O si prefieres no instalar nada, la demo está desplegada en **[dniskav.github.io/Neuron_experiments](https://dniskav.github.io/Neuron_experiments/)**.

---

> Hecho con curiosidad y muchos gradientes. 🧮

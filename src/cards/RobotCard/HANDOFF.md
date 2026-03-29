# RobotCard — Estado del proyecto y hoja de ruta

## Qué es esto

Demo interactivo de Q-learning donde un agente 2D aprende a navegar en una habitación.
El usuario puede construir la red neuronal (capas/neuronas/activaciones), elegir nivel,
activar obstáculos y observar el aprendizaje en tiempo real.

Stack: React + Chakra UI + `@dniskav/neuron` (NetworkN, Adam).

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `agentWorld.ts` | Física pura (sin React): mundo, sensores, colisiones, paso del agente |
| `useAgentRL.ts` | Hook de Q-learning: loop de entrenamiento, epsilon, stats |
| `AgentCanvas.tsx` | Canvas 2D: mundo, agente, rayos de sensores, obstáculos |
| `RobotAgent.tsx` | Componente UI: nivel, arquitectura, controles, banners |

---

## Niveles implementados

### Nivel 1 — Solo adelante
- **Input:** `[1.0]` constante
- **Acciones:** 0=adelante, 1=frenar
- **Meta:** fwdPct ≥ 88% en ventana de 200 pasos
- **Aprendizaje esperado:** la red aprende a preferir siempre adelante

### Nivel 2 — Sensor frontal
- **Input:** `[frontDist]` normalizado [0,1]
- **Acciones:** 0=adelante, 1=frenar
- **Meta:** successRate ≥ 80% en últimos 20 episodios
- **Episodio termina:**
  - `successStop`: frena cuando frontPx ∈ [STOP_DIST=18, BRAKE_ZONE=36] → +10
  - `tooClose`: avanza y frontPxAfter < 18 → -20
  - `rawDone`: colisión → -50
  - timeout: 400 pasos
- **Reward shaping crítico:**
  - Avanzar lejos de BRAKE_ZONE: +0.5
  - Frenar lejos de BRAKE_ZONE: -3

### Nivel 3 — Sensor izquierdo
- **Input:** `[frontDist, leftDist]`
- **Acciones:** 0=adelante, 1=girar izq (rota -TURN_SPEED, sin mover)
- **Meta:** avgSteps ≥ 400 (últimos 10 episodios)
- **Reward shaping:**
  - Avanzar cuando front > TURN_ZONE (144px): rawReward+1 = +2
  - Girar cuando front > TURN_ZONE: -5
  - Girar cuando front ≤ TURN_ZONE: +2
- **Probar:** corre indefinidamente hasta colisión (sin stop por timeout)

### Nivel 4 — Sensor derecho (recién implementado, no probado extensamente)
- **Input:** `[frontDist, leftDist, rightDist]`
- **Acciones:** 0=adelante, 1=girar izq, 2=girar der
- **Meta:** avgSteps ≥ 600 (últimos 10 episodios)
- **Reward shaping:** igual que nivel 3 (cualquier giro recibe mismo tratamiento)
- **Mejora potencial:** dar +2 solo si gira hacia el lado con más espacio (comparar leftDist vs rightDist)

---

## Constantes importantes (`useAgentRL.ts`)

```typescript
STOP_DIST  = AGENT_D      // 18px — límite inferior zona de frenado L2
BRAKE_ZONE = AGENT_D * 2  // 36px — límite superior zona de frenado L2
TURN_ZONE  = AGENT_D * 8  // 144px — zona donde girar está bien (L3/L4)
GAMMA      = 0.95
LR         = 0.025
STEPS_PER_FRAME = 10      // multiplicado por speed ref
ε decay    = max(0.05, ε * 0.988) por episodio
```

---

## Obstáculos

- `Obstacle = { cx, cy, half }` — cuadrados centrados en (cx,cy) con half-size
- `generateObstacle()`: posición y tamaño aleatorio (S=20, M=35, L=55)
- 2 obstáculos independientes en UI: ON/OFF + ⟳ (nueva posición)
- `resetAgent(obstacles)`: reintenta spawn si el agente aparece dentro de un obstáculo
- Sensores detectan obstáculos igual que paredes (raycast AABB + circle-AABB collision)

---

## Controles de velocidad

- **Entrenamiento:** botones violetas 1× 2× 4× 10× (via `trainSpeedRef`)
- **Prueba:** botones teal 🐢 1× 3× 10× (via `speedRef`, default 🐢=0.1)
- Estados completamente independientes

---

## Cómo usa NetworkN

```typescript
// El optimizer DEBE ser una factory function, no una instancia
new NetworkN(
  [inputSize, ...hidden.map(l => l.neurons), nActions],
  { activations: [...acts, linear] as any, optimizer: (() => new Adam()) as any }
)
```

---

## Lecciones de reward shaping (NO cambiar sin entender esto)

1. **Pena por acción incorrecta debe superar colisión amortizada**: si colisión=-50 y pena/paso=-0.5, el agente prefiere la acción incorrecta para siempre. Usar -3 a -5.
2. **BRAKE_ZONE estrecha = frena más cerca**: el agente aprende a actuar en cualquier punto de la ventana, eligiendo el más seguro (más lejos del peligro).
3. **`reward = rawReward + bonus`** no `reward = bonus` — no sobreescribir la señal base.
4. **Siempre pair**: penalizar acción A cuando condición C es falsa + recompensar A cuando C es verdadera. Uno sin el otro produce políticas degeneradas.

---

## Pendiente / Ideas para continuar

### Prioridad alta
- [ ] **Probar nivel 4** y ajustar reward si sigue girando en círculos
- [ ] **Reward inteligente para L4**: girar hacia el lado con más espacio
  ```typescript
  const leftPx  = leftDist(agentRef.current, obstacles) * SENSOR_MAX;
  const rightPx = rightDist(agentRef.current, obstacles) * SENSOR_MAX;
  if (action === 1 && leftPx > rightPx)  reward = +2;  // izq tiene más espacio
  if (action === 2 && rightPx > leftPx)  reward = +2;  // der tiene más espacio
  if (action === 1 && leftPx < rightPx)  reward = -2;  // girar hacia la pared
  if (action === 2 && rightPx < leftPx)  reward = -2;
  ```

### Prioridad media
- [ ] **Nivel 5 idea**: añadir velocidad variable (acción: acelerar/frenar además de girar)
- [ ] **Mejor visualización L4**: sensor derecho en color diferente (naranja?)
- [ ] **Métricas por obstáculo**: mostrar si el agente esquivó el obstáculo X veces
- [ ] **Persistencia del entrenamiento**: guardar/cargar pesos en localStorage

### Notas de UX validadas
- El sensor se visualiza en dos segmentos: verde (espacio libre) + rojo (zona de colisión = AGENT_R)
- "Probar" resetea el agente a posición nueva cada vez que se presiona
- L3/L4 en Probar: no para por timeout, solo para al chocar
- Los obstáculos se pueden cambiar durante el entrenamiento sin reiniciar

---

## Estado al cierre de sesión (2026-03-28)

- Niveles 1, 2, 3: funcionando y probados
- Nivel 4: implementado pero sin pruebas extensas
- Obstáculos múltiples: implementados
- Pendiente validar comportamiento de L4 con obstáculos activos

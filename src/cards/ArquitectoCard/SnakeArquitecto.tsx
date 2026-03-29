// ─── SnakeArquitecto ──────────────────────────────────────────────────────────
//
// Componente autocontenido: serpiente jugando sola con DQN.
// El usuario puede modificar la arquitectura de la red y ver cómo afecta
// al aprendizaje. El tutor explica conceptos de RL y arquitectura.
//

import { useMemo } from 'react'
import { Box, Button, Flex, Heading, NativeSelect, SimpleGrid, Text } from '@chakra-ui/react'
import { StatItem, NetworkDiagram } from '../../components/lib'
import type { ActivationType } from '../../components/lib'
import { SnakeCanvas } from './SnakeCanvas'
import { LayerBuilder } from '../../components/shared/LayerBuilder'
import { TutorPanel } from '../../components/shared/TutorPanel'
import { DetailsBox } from '../../components/lib'
import { useSnakeRL } from './hooks/training/useSnakeRL'
import { useTutorSnake } from './hooks/tutor/useTutorSnake'
import { SnakeLeaderboard } from './SnakeLeaderboard'
import { N_IN, N_OUT } from './SnakeEnv'

// ── Constantes ────────────────────────────────────────────────────────────────

const LR_OPTIONS = [0.01, 0.005, 0.001, 0.0005]

const OPT_LABEL: Record<string, string> = {
  sgd: 'SGD',
  momentum: 'Momentum',
  adam: 'Adam'
}

// ── Componente ────────────────────────────────────────────────────────────────

export function SnakeArquitecto() {
  const s = useSnakeRL()

  const tutorMsg = useTutorSnake({
    hiddenLayers: s.hiddenLayers,
    optimizerType: s.optimizerType,
    lr: s.lr,
    episodes: s.stats.episodes,
    steps: s.stats.steps,
    bestScore: s.stats.bestScore,
    epsilon: s.stats.epsilon
  })

  const networkLayers = useMemo(
    () => [
      { size: N_IN },
      ...s.hiddenLayers.map((l) => ({
        size: l.neurons,
        activation: l.activation as ActivationType
      })),
      { size: N_OUT, activation: 'linear' as ActivationType }
    ],
    [s.hiddenLayers]
  )

  const epsStr = `${(s.stats.epsilon * 100).toFixed(0)} %`
  const currentKey =
    s.hiddenLayers.map((l) => `${l.neurons}${l.activation[0]}`).join('-') || 'empty'

  return (
    <Flex direction="column" gap={5} align="center" w="100%">
      {/* Descripción */}
      <Box
        bg="rgba(255,255,255,0.04)"
        border="1px solid rgba(255,255,255,0.08)"
        borderRadius="xl"
        p={4}
        maxW="620px"
        w="100%">
        <Flex align="center" gap={2} mb={2}>
          <Text fontSize="22px" lineHeight={1}>
            🐍
          </Text>
          <Heading size="sm" color="gray.100">
            Snake — Agente DQN
          </Heading>
          <Box
            fontSize="9px"
            fontWeight={700}
            color="white"
            px={2}
            py="1px"
            borderRadius="full"
            bg="#ef4444">
            DIFÍCIL
          </Box>
        </Flex>
        <Text fontSize="13px" color="gray.400" lineHeight={1.6}>
          La serpiente aprende a jugar sola usando una red neuronal y Q-learning con replay buffer.
          Diseña la arquitectura: la red recibe{' '}
          <strong style={{ color: '#a7f3d0' }}>24 sensores</strong> (distancias a paredes y cuerpo
          en 8 direcciones, posición de la comida, dirección actual) y devuelve{' '}
          <strong style={{ color: '#a7f3d0' }}>3 Q-values</strong> (recto · derecha · izquierda).
          Cuanto mejor la arquitectura, más rápido aprende.
        </Text>
      </Box>

      {/* Layout principal */}
      <Flex gap={8} align="flex-start" flexWrap="wrap" justify="center">
        {/* Columna izquierda: canvas */}
        <Flex direction="column" gap={3} align="center">
          <SnakeCanvas stateRef={s.stateRef} redrawVersion={s.redrawVersion} />

          {/* Métricas de juego */}
          {!s.demo ? (
            <SimpleGrid columns={4} gap={2} w="100%">
              <StatItem variant="compact" label="Episodios" value={s.stats.episodes} />
              <StatItem variant="compact" label="Mejor" value={s.stats.bestScore} />
              <StatItem variant="compact" label="Pasos" value={s.stats.steps} />
              <StatItem
                variant="compact"
                label="Explorar"
                value={epsStr}
                highlight={s.stats.epsilon < 0.15}
              />
            </SimpleGrid>
          ) : (
            <SimpleGrid columns={3} gap={2} w="100%">
              <StatItem
                variant="compact"
                label="Demo actual"
                value={s.stats.demoScore}
                highlight={s.stats.demoScore > 0}
              />
              <StatItem
                variant="compact"
                label="Mejor demo"
                value={s.stats.demoBest}
                highlight={s.stats.demoBest >= s.stats.bestScore}
              />
              <StatItem variant="compact" label="Récord total" value={s.stats.bestScore} />
            </SimpleGrid>
          )}

          {/* Indicador de guardado */}
          {s.hasSave && (
            <Text fontSize="10px" color="gray.500" textAlign="center">
              💾 Pesos guardados — se recargarán automáticamente
            </Text>
          )}

          {/* Botones */}
          <Flex gap={2} flexWrap="wrap" justify="center">
            {!s.running ? (
              <Button colorPalette="green" size="sm" onClick={s.iniciar}>
                ▶ Entrenar
              </Button>
            ) : (
              <Button colorPalette="orange" size="sm" onClick={s.pausar}>
                ⏸ Pausar
              </Button>
            )}
            {!s.demo ? (
              <Button
                colorPalette="violet"
                size="sm"
                variant="subtle"
                onClick={s.probar}
                title="Ejecuta la red sin entrenar (epsilon=0) para ver qué aprendió">
                👁 Probar
              </Button>
            ) : (
              <>
                <Button colorPalette="red" size="sm" variant="subtle" onClick={s.detenerDemo}>
                  ⏹ Detener demo
                </Button>
                <NativeSelect.Root size="sm" w="auto">
                  <NativeSelect.Field
                    value={s.demoSpeed}
                    onChange={(e) => s.setDemoSpeed(Number(e.target.value))}
                    fontSize="11px"
                    style={{ background: 'transparent', color: '#cbd5e1' }}>
                    <option value={250}>🐢 Lento</option>
                    <option value={120}>🐍 Normal</option>
                    <option value={60}>⚡ Rápido</option>
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={s.resetear}
              color="gray.400"
              borderColor="gray.600">
              ↺ Reiniciar
            </Button>
          </Flex>
        </Flex>

        {/* Columna derecha: controles */}
        <Flex direction="column" gap={4} maxW="360px" w="100%">
          {/* Diagrama de red */}
          <NetworkDiagram
            layers={networkLayers}
            optimizer={`${OPT_LABEL[s.optimizerType]} lr=${s.lr}`}
            activationsRef={s.activationsRef}
          />

          {/* Constructor de arquitectura */}
          <Box
            bg="rgba(255,255,255,0.04)"
            border="1px dashed rgba(255,255,255,0.12)"
            borderRadius="xl"
            p={3}>
            <Text
              fontSize="10px"
              color="gray.500"
              mb={2}
              textAlign="center"
              fontWeight={600}
              letterSpacing="wide">
              ARQUITECTURA
            </Text>
            <LayerBuilder
              hiddenLayers={s.hiddenLayers}
              onAdd={s.addLayer}
              onRemove={s.removeLayer}
              onUpdate={s.updateLayer}
              maxLayers={4}
              inputLabel="24 sensores"
              outputLabel="3 acciones"
            />
          </Box>

          {/* Controles de optimizador */}
          <Flex gap={2} flexWrap="wrap" align="center">
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.500">
                Opt:
              </Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field
                  value={s.optimizerType}
                  onChange={(e) =>
                    s.setOptimizerType(e.target.value as 'sgd' | 'momentum' | 'adam')
                  }
                  fontSize="12px"
                  style={{ background: 'transparent', color: '#cbd5e1' }}>
                  <option value="adam">Adam</option>
                  <option value="momentum">Momentum</option>
                  <option value="sgd">SGD</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
            <Flex align="center" gap={1}>
              <Text fontSize="11px" color="gray.500">
                lr:
              </Text>
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field
                  value={s.lr}
                  onChange={(e) => s.setLr(Number(e.target.value))}
                  fontSize="12px"
                  style={{ background: 'transparent', color: '#cbd5e1' }}>
                  {LR_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Flex>
          </Flex>

          {/* Tutor contextual */}
          {tutorMsg && <TutorPanel msg={tutorMsg} />}

          {/* Explicación del sistema */}
          <DetailsBox summary="¿Cómo aprende la serpiente? DQN explicado">
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>Q-learning:</strong> la red aprende a predecir la recompensa futura esperada
              para cada acción en cada estado. Q(s, a) ≈ r + γ·max Q(s′, a′).
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>Replay buffer:</strong> almacena 2000 experiencias pasadas. En cada paso,
              entrena con 32 experiencias <em>aleatorias</em> — no las más recientes. Esto rompe la
              correlación temporal y estabiliza el aprendizaje.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7}>
              <strong>ε-greedy:</strong> al principio la serpiente explora aleatoriamente (ε≈1). A
              medida que aprende, ε decae hacia 0.05 y empieza a explotar lo aprendido.
            </Text>
          </DetailsBox>

          {/* Sensores */}
          <DetailsBox summary="¿Qué ven los 24 sensores?">
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>8 distancias a pared</strong> (N NE E SE S SW W NW): codificadas como
              1/distancia. Cerca de la pared → valor alto; lejos → valor bajo.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>8 distancias al propio cuerpo</strong> (mismas 8 dirs): igual que las paredes.
              Sin estos sensores la serpiente no "ve" su cola y choca con ella.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7} mb={2}>
              <strong>4 dirección de la comida</strong>: booleanos arriba/abajo/izquierda/derecha.
            </Text>
            <Text fontSize="12px" color="gray.600" lineHeight={1.7}>
              <strong>4 dirección actual</strong>: one-hot (arriba/derecha/abajo/izquierda).
              Necesario porque las acciones son relativas (recto/girar).
            </Text>
          </DetailsBox>

          {/* Leaderboard */}
          <DetailsBox summary={`🏆 Top configuraciones (${s.leaderboard.length}/10)`}>
            <SnakeLeaderboard entries={s.leaderboard} onLoad={s.loadEntry} current={currentKey} />
          </DetailsBox>
        </Flex>
      </Flex>
    </Flex>
  )
}

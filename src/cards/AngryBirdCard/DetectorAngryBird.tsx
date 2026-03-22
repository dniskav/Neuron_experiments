import { useRef, useState } from 'react'
import { Box, Button, HStack, Heading, Text } from '@chakra-ui/react'
import { StatItem, CardRoot, DetailsBox, BodyText } from '../../components/lib'
import { Canvas } from '@react-three/fiber'
import { encontrarAngulo, G, V0 } from '../../data/fisicas'
import { AngryBirdScene, CW, CH } from './AngryBirdScene'
import { useAngryBirdTraining } from './useAngryBirdTraining'
import { useAngryBirdDrag } from './useAngryBirdDrag'

// ─── Configuración ────────────────────────────────────────────────────────────
// const ESTRUCTURA = [3, 16, 8, 1];

// ─── Componente ───────────────────────────────────────────────────────────────
export function DetectorAngryBird() {
  const anguloPredRef = useRef<number | null>(null)
  const [anguloPred, setAnguloPred] = useState<number | null>(null)
  // const [escena, setEscenaState] = useState({ xObstaculo: 7, hObstaculo: 6, xBlanco: 15 });

  const drag = useAngryBirdDrag((esc) => training.getPred(esc), anguloPredRef, setAnguloPred)

  const training = useAngryBirdTraining(anguloPredRef, drag.escenaRef, setAnguloPred, () => {
    drag.resetEscena()
    // setEscenaState(v) // Eliminado porque setEscenaState ya no existe
  })

  // Keep local escena state in sync with drag
  const escena2 = drag.escena

  // ── Render ─────────────────────────────────────────────────────────────────
  const anguloCorrect = encontrarAngulo(escena2)
  const predDeg = anguloPred !== null ? ((anguloPred * 180) / Math.PI).toFixed(1) : '—'
  const corrDeg = anguloCorrect !== null ? ((anguloCorrect * 180) / Math.PI).toFixed(1) : '—'
  const errStr = training.errorDeg !== null ? `${training.errorDeg.toFixed(1)}°` : '—'
  const pctStr = training.precision !== null ? `${(training.precision * 100).toFixed(1)}%` : '—'
  const preciso = training.precision !== null && training.precision >= 0.85
  // const golpeaDemo = anguloPred !== null && Math.abs(xAterrizaje(anguloPred) - escena2.xBlanco) < 0.6;

  return (
    <CardRoot maxW="420px" w="100%">
      <Heading size="md" color="gray.800">
        Red de 3 capas · Tiro parabólico
      </Heading>
      <Text fontSize="sm" color="gray.600" lineHeight={1.5}>
        Velocidad fija ({V0} m/s), gravedad real ({G} m/s²). La red aprende el{' '}
        <strong>ángulo de lanzamiento</strong> para superar el obstáculo e impactar el blanco.
        Arrastra el <strong>blanco ↔</strong> o el tope del <strong>obstáculo ↕</strong> para ver si
        la red generaliza a nuevos escenarios sin reentrenarse.
      </Text>

      <HStack gap={6} fontSize="xs" color="gray.500" fontFamily="monospace">
        <Text as="span">Obstáculo: h={escena2.hObstaculo.toFixed(1)}m</Text>
        <Text as="span">Blanco: x={escena2.xBlanco.toFixed(1)}m</Text>
      </HStack>

      <Box
        ref={drag.containerRef}
        borderRadius="lg"
        border="2px solid"
        borderColor="gray.200"
        display="block"
        alignSelf="center"
        style={{ cursor: drag.cursor, width: CW, height: CH }}
        onMouseDown={drag.handleMouseDown}
        onMouseMove={drag.handleMouseMove}
        onMouseUp={drag.handleMouseUp}
        onMouseLeave={drag.handleMouseUp}>
        <Canvas
          orthographic
          camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }}
          style={{ width: CW, height: CH, display: 'block' }}>
          <AngryBirdScene
            escenaRef={drag.escenaRef}
            anguloPredRef={anguloPredRef}
            hoverRef={drag.hoverRef}
          />
        </Canvas>
      </Box>

      <HStack gap={3}>
        <Box
          flex={1}
          bg="gray.50"
          borderRadius="lg"
          px={4}
          py={3}
          display="flex"
          flexDirection="column"
          gap="2px"
          border="1px solid"
          borderColor="gray.200">
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing={1}>
            Ángulo correcto
          </Text>
          <Text fontSize="2xl" fontWeight={700} color="green.500">
            {anguloCorrect !== null ? `${corrDeg}°` : 'imposible'}
          </Text>
        </Box>
        <Box
          flex={1}
          bg="gray.50"
          borderRadius="lg"
          px={4}
          py={3}
          display="flex"
          flexDirection="column"
          gap="2px"
          border="1px solid"
          borderColor="gray.200">
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing={1}>
            Predicción de la red
          </Text>
          <Text fontSize="2xl" fontWeight={700} color={preciso ? 'green.500' : 'red.500'}>
            {predDeg}°
          </Text>
        </Box>
      </HStack>

      <HStack gap={2} flexWrap="wrap">
        <StatItem label="Épocas" value={String(training.epocas)} />
        <StatItem label="Error medio" value={errStr} />
        <StatItem label="Precisión" value={pctStr} highlight={preciso} />
      </HStack>

      <HStack gap={2}>
        {!training.entrenando ? (
          <Button flex={1} colorPalette="green" onClick={training.iniciar}>
            ▶ Entrenar
          </Button>
        ) : (
          <Button flex={1} colorPalette="yellow" onClick={training.pausar}>
            ⏸ Pausar
          </Button>
        )}
        <Button
          flex={1}
          colorPalette="violet"
          disabled={training.entrenando}
          onClick={training.pasoUnico}>
          1 época
        </Button>
        <Button flex={1} variant="outline" onClick={training.resetear}>
          ↺ Resetear
        </Button>
      </HStack>

      <DetailsBox summary="¿Por qué 3 capas y no 2?">
        <BodyText>
          <strong>Capa 1 (16 neuronas):</strong> aprende la relación básica entre distancia al
          blanco y ángulo — una relación de arcoseno, altamente no lineal.
        </BodyText>
        <BodyText>
          <strong>Capa 2 (8 neuronas):</strong> aprende a corregir ese ángulo según el obstáculo.
          ¿Cuánto más alto hay que tirar para superar ese muro en esa posición?
        </BodyText>
        <BodyText>
          <strong>Al arrastrar</strong> el blanco u obstáculo puedes ver si la red{' '}
          <em>generalizó</em> (aprendió la física) o solo <em>memorizó</em> los ejemplos de
          entrenamiento. Una red bien entrenada debería predecir bien también en posiciones que
          nunca vio.
        </BodyText>
      </DetailsBox>
    </CardRoot>
  )
}

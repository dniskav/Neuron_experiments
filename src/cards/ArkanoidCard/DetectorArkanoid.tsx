import {
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { StatItem, CardRoot, DetailsBox, BodyText, NetworkDiagram } from "../../components/lib";
import { Canvas } from "@react-three/fiber";
import { ArkanoidScene, CW, CH } from "./ArkanoidScene";
import { useArkanoidRL } from "./useArkanoidRL";
import {
  N_IN, N_OUT, LR, GAMMA,
  EPSILON_INICIO, EPSILON_FIN, SUCCESS_UMBRAL,
} from "./physics";

export function DetectorArkanoid() {
  const {
    ballRef,
    padRef,
    trailRef,
    activationsRef,
    stats,
    demoActivo,
    handleStart,
    handleStop,
    handleDemo,
    handleReset,
  } = useArkanoidRL();

  return (
    <CardRoot w="fit-content" alignItems="center">
      <Heading size="md" color="gray.800">Arkanoid · DQN online</Heading>
      <Text fontSize="sm" color="gray.500" textAlign="center" maxW="400px">
        La paleta aprende a mantener la bola en juego usando{" "}
        <em>Q-learning online</em>. La red recibe posición y velocidad de la bola más
        la posición de la paleta, y decide si moverse a izquierda, derecha o quedarse quieta.
      </Text>

      <NetworkDiagram
        layers={[
          { size: N_IN },
          { size: 32, activation: "leakyRelu" },
          { size: 16, activation: "leakyRelu" },
          { size: N_OUT, activation: "sigmoid" },
        ]}
        optimizer="Adam lr=0.001"
        activationsRef={activationsRef}
      />

      <Box
        borderRadius="md"
        border="1px solid"
        borderColor="gray.200"
        style={{ display: "block" }}
      >
        <Canvas
          orthographic
          camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }}
          style={{ width: CW, height: CH, display: "block", borderRadius: 8 }}
        >
          <ArkanoidScene ballRef={ballRef} padRef={padRef} trailRef={trailRef} />
        </Canvas>
      </Box>

      <SimpleGrid columns={5} gap={3} w="100%">
        <StatItem variant="compact" label="Episodio"       value={stats.episodio} />
        <StatItem variant="compact" label="ε (exploración)" value={stats.epsilon} />
        <StatItem variant="compact" label="Pasos"          value={stats.pasos} />
        <StatItem variant="compact" label="Mejor"          value={stats.mejor} />
        <StatItem variant="compact" label={`Tasa ≥${SUCCESS_UMBRAL}`} value={`${stats.tasa} %`} />
      </SimpleGrid>

      <Flex flexWrap="wrap" gap={2} justifyContent="center" w="100%">
        <Button colorPalette="violet" size="sm" onClick={handleStart}>▶ Entrenar</Button>
        <Button
          size="sm"
          colorPalette="green"
          variant={demoActivo ? "solid" : "subtle"}
          onClick={handleDemo}
        >★ Probar</Button>
        <Button variant="outline" size="sm" onClick={handleStop}>⏸ Pausar</Button>
        <Button variant="outline" size="sm" onClick={handleReset}>↺ Reiniciar</Button>
      </Flex>

      <DetailsBox summary="Activaciones y optimizador">
        <BodyText><strong>Capas ocultas · leaky relu:</strong> evita el problema de neuronas muertas (dying ReLU) — las neuronas que reciben entradas negativas todavía reciben un pequeño gradiente (α=0.01) y pueden recuperarse durante el entrenamiento.</BodyText>
        <BodyText><strong>Salida · sigmoid:</strong> los Q-values se normalizan a [0, 1], compatible con la escala de recompensas: 0 = perder, 1 = golpear la paleta.</BodyText>
        <BodyText><strong>Adam (lr={LR}):</strong> con múltiples capas y gradientes de distinta magnitud, Adam adapta el paso individualmente por peso — crítico para convergencia estable en este problema.</BodyText>
      </DetailsBox>

      <DetailsBox summary="¿Cómo aprende? (Q-learning online)">
        <BodyText><strong>Entradas ({N_IN}):</strong> bx/ancho, by/alto, vx normalizada, vy normalizada, px/ancho — todo en [0, 1].</BodyText>
        <BodyText><strong>Salidas ({N_OUT}):</strong> Q(izquierda), Q(quieto), Q(derecha). El agente elige la acción con mayor Q-value (con ε de exploración aleatoria al inicio).</BodyText>
        <BodyText><strong>Recompensa:</strong> +1 al golpear la paleta, 0 al perder (terminal), 0 pasos neutros. El target Q se propaga hacia atrás: target = r + γ={GAMMA}·maxQ(s'). La red aprende a anticipar futuros golpes.</BodyText>
        <BodyText><strong>Sin replay buffer:</strong> cada transición se usa una sola vez y se descarta — más simple pero menos estable que DQN clásico con memoria de experiencias. Suficiente para este problema.</BodyText>
      </DetailsBox>

      <Text fontSize="11px" color="gray.400" textAlign="center">
        Red: Dense({N_IN}→32→16→{N_OUT}) · leakyRelu+leakyRelu+sigmoid · Adam lr={LR} · Q-learning γ={GAMMA} · ε {EPSILON_INICIO}→{EPSILON_FIN}
      </Text>
    </CardRoot>
  );
}

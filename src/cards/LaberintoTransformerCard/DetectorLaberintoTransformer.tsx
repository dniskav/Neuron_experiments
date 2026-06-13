import {
  Badge, Box, Button, Checkbox, Flex, Heading,
  HStack, NativeSelect, SimpleGrid, Text,
} from "@chakra-ui/react";
import { StatItem, CardRoot, DetailsBox, BodyText } from "../../components/lib";
import { TransformerRLDiagram } from "../../components/lib/TransformerRLDiagram";
import { Canvas } from "@react-three/fiber";
import { MazeScene, CW, CH } from "../LaberintoCard/MazeScene";
import { WAYPOINTS, WAYPOINT_BONUS } from "../../data/laberinto";
import { useLaberintoTransformerRL } from "./useLaberintoTransformerRL";
import {
  SEQ_LEN, INPUT_DIM, N_BLOCKS, N_HEADS, N_ACTIONS,
  LR, GAMMA, LAMBDA, EPSILON_INICIO, EPSILON_FIN,
} from "./rl";

export function DetectorLaberintoTransformer() {
  const {
    agenteRef, trailRef, wpRef,
    attentionRef, qValuesRef,
    stats, sensores, setSensores,
    pasosPorClick, setPasosPorClick,
    demoActivo,
    handleStart, handleStop, handleDemo,
    handleVerMejor, handleRestaurarMejor,
    handlePaso, handleReset,
  } = useLaberintoTransformerRL();

  return (
    <CardRoot w="fit-content" alignItems="center">
      <Heading size="md" color="gray.800">Laberinto · Transformer + TD(λ)</Heading>
      <Text fontSize="sm" color="gray.500" textAlign="center" maxW="540px">
        Atención causal sobre los últimos {SEQ_LEN} pasos. La red aprende
        qué momentos del pasado son relevantes para decidir ahora — sin comprimir
        la historia en un vector oculto.
      </Text>

      <TransformerRLDiagram
        seqLen={SEQ_LEN}
        inputDim={INPUT_DIM}
        nBlocks={N_BLOCKS}
        nHeads={N_HEADS}
        nActions={N_ACTIONS}
        attentionRef={attentionRef}
        qValuesRef={qValuesRef}
      />

      <Box borderRadius="md" border="1px solid" borderColor="gray.200" style={{ display: "block" }}>
        <Canvas
          orthographic
          camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }}
          style={{ width: CW, height: CH, display: "block", borderRadius: 8 }}
        >
          <MazeScene agenteRef={agenteRef} trailRef={trailRef} wpRef={wpRef} showSensors={sensores} />
        </Canvas>
      </Box>

      <SimpleGrid columns={4} gap={3} w="100%">
        <StatItem variant="compact" label="Episodio"        value={stats.episodio} />
        <StatItem variant="compact" label="ε (exploración)" value={stats.epsilon} />
        <StatItem variant="compact" label="Pasos"           value={stats.pasos} />
        <StatItem variant="compact" label="Waypoints"       value={`${stats.wps} / ${WAYPOINTS.length}`} />
        <StatItem variant="compact" label="Tasa entren."    value={`${stats.tasa} %`} />
        <StatItem
          variant="compact"
          label="Tasa demo"
          value={stats.demoTotal > 0
            ? `${Math.round(stats.demoExitos / stats.demoTotal * 100)} % (${stats.demoExitos}/${stats.demoTotal})`
            : "—"}
        />
        <StatItem variant="compact" label="Mejor demo" value={
          stats.mejorDemo >= 0 ? `${Math.round(stats.mejorDemo * 100)} %` : "—"
        } />
        <Badge colorPalette={stats.exito ? "green" : "red"} variant="subtle" borderRadius="full">
          {stats.exito ? "✓ ¡Llegó!" : "✗ No llegó"}
        </Badge>
      </SimpleGrid>

      <Flex flexWrap="wrap" gap={2} justifyContent="center" w="100%">
        <Button colorPalette="violet" size="sm" onClick={handleStart}>▶ Entrenar</Button>
        <Button
          size="sm"
          colorPalette="green"
          variant={demoActivo === "probar" ? "solid" : "subtle"}
          onClick={handleDemo}
        >★ Probar</Button>
        <Button
          size="sm"
          colorPalette="orange"
          variant={demoActivo === "mejor" ? "solid" : "subtle"}
          disabled={stats.mejorDemo < 0}
          onClick={handleVerMejor}
        >★ Ver mejor {stats.mejorDemo >= 0 ? `(${Math.round(stats.mejorDemo * 100)}%)` : ""}</Button>
        <Button variant="outline" size="sm" onClick={handleStop}>⏸ Pausar</Button>
        <Button
          size="sm"
          colorPalette="orange"
          variant="subtle"
          disabled={stats.mejorDemo < 0}
          onClick={handleRestaurarMejor}
        >↩ Restaurar mejor {stats.mejorDemo >= 0 ? `(${Math.round(stats.mejorDemo * 100)}%)` : ""}</Button>
        <Button variant="outline" size="sm" onClick={handleReset}>↺ Reiniciar</Button>
        <HStack gap={1}>
          <NativeSelect.Root size="sm" w="auto">
            <NativeSelect.Field
              value={pasosPorClick}
              onChange={e => setPasosPorClick(Number(e.target.value))}
            >
              {[1, 10, 20, 50, 100].map(n => (
                <option key={n} value={n}>{n} paso{n > 1 ? "s" : ""}</option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
          <Button size="sm" colorPalette="indigo" variant="subtle" onClick={handlePaso}>⏭ Paso</Button>
        </HStack>
        <Checkbox.Root
          checked={sensores}
          onCheckedChange={e => setSensores(!!e.checked)}
          size="sm"
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="sm" color="gray.600">Sensores</Checkbox.Label>
        </Checkbox.Root>
      </Flex>

      <DetailsBox summary="Atención causal y diferencias con LSTM">
        <BodyText><strong>Ventana deslizante ({SEQ_LEN} pasos):</strong> en cada paso la red recibe los últimos {SEQ_LEN} estados como secuencia. No hay estado oculto interno — la "memoria" es la ventana explícita.</BodyText>
        <BodyText><strong>Atención causal:</strong> cada paso solo puede atender a pasos anteriores (máscara causal). Los arcos del diagrama muestran los pesos de atención del último bloque — más brillante = más relevante para la decisión actual.</BodyText>
        <BodyText><strong>vs LSTM:</strong> el LSTM comprime todo el episodio en un vector h. El Transformer elige explícitamente qué momentos pasados consultar. Aprende más lento (más parámetros, lr={LR}) pero puede hacer asociaciones a mayor distancia.</BodyText>
        <BodyText><strong>TD(λ={LAMBDA}) γ={GAMMA}:</strong> mismo algoritmo que la versión LSTM. El buffer acumula el episodio completo y entrena cada paso de forma independiente al final (sin BPTT entre pasos).</BodyText>
      </DetailsBox>

      <Text fontSize="11px" color="gray.400" textAlign="center">
        Red: TransformerRL(seq={SEQ_LEN}, in={INPUT_DIM}, d={N_BLOCKS}×{N_HEADS}h) → {N_ACTIONS} Q-vals · TD(λ={LAMBDA}) γ={GAMMA} · lr={LR} · ε {EPSILON_INICIO}→{EPSILON_FIN} · {WAYPOINTS.length} waypoints (+{WAYPOINT_BONUS} ref.)
      </Text>
    </CardRoot>
  );
}

import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  HStack,
  NativeSelect,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { StatItem, CardRoot, DetailsBox, BodyText, NetworkDiagram } from "../../components/lib";
import { Canvas } from "@react-three/fiber";
import { MazeScene, CW, CH } from "./MazeScene";
import { WAYPOINTS, WAYPOINT_BONUS } from "../../data/laberinto";
import { useLaberintoRL } from "./useLaberintoRL";
import { LSTM_IN, LSTM_H, DENSE, LR, GAMMA, LAMBDA, EPSILON_INICIO, EPSILON_FIN } from "./rl";

export function DetectorLaberinto() {
  const {
    agenteRef,
    trailRef,
    wpRef,
    activationsRef,
    stats,
    sensores,
    setSensores,
    pasosPorClick,
    setPasosPorClick,
    demoActivo,
    handleStart,
    handleStop,
    handleDemo,
    handleDemoBest,
    handlePaso,
    handleRestoreBest,
    handleReset,
  } = useLaberintoRL();

  return (
    <CardRoot w="fit-content" alignItems="center">
      <Heading size="md" color="gray.800">Laberinto · LSTM + TD(λ)</Heading>
      <Text fontSize="sm" color="gray.500" textAlign="center" maxW="540px">
        Memoria recurrente (LSTM) + <em>mapa de celdas visitadas</em> como entrada directa.
        El agente sabe qué direcciones ya exploró este episodio. Aprende con BPTT + TD(λ).
      </Text>

      <NetworkDiagram
        layers={[
          { size: LSTM_IN },
          { size: LSTM_H,    activation: "lstm" },
          { size: DENSE[0],  activation: "relu" },
          { size: DENSE[1],  activation: "sigmoid" },
        ]}
        optimizer="Adam lr=0.02"
        activationsRef={activationsRef}
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
        <StatItem
          variant="compact"
          label="Mejor demo"
          value={stats.mejorDemo >= 0
            ? `${Math.round(stats.mejorDemo * 100)} %`
            : stats.demoTotal > 0
              ? `(${3 - stats.demoTotal} más)`
              : "—"}
        />
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
          onClick={handleDemoBest}
        >★ Ver mejor {stats.mejorDemo >= 0 ? `(${Math.round(stats.mejorDemo * 100)}%)` : ""}</Button>
        <Button variant="outline" size="sm" onClick={handleStop}>⏸ Pausar</Button>
        <Button
          size="sm"
          colorPalette="orange"
          variant="subtle"
          disabled={stats.mejorDemo < 0}
          onClick={handleRestoreBest}
        >
          ↩ Restaurar mejor {stats.mejorDemo >= 0 ? `(${Math.round(stats.mejorDemo * 100)}%)` : ""}
        </Button>
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

      <DetailsBox summary="Activaciones y optimizador">
        <BodyText><strong>LSTM · sigmoid + tanh (internos):</strong> las 4 compuertas usan sigmoid (forget, input, output) y tanh (cell gate) — es la arquitectura LSTM estándar. Sigmoid decide qué porcentaje de información dejar pasar; tanh produce los valores candidatos a escribir en memoria.</BodyText>
        <BodyText><strong>Capas dense · sigmoid:</strong> producen los Q-values del agente normalizados a [0, 1], compatibles con el rango de recompensas escaladas del entorno.</BodyText>
        <BodyText><strong>Adam en dense (lr={LR}):</strong> las capas dense reciben gradientes ya procesados por BPTT a través del tiempo. Adam adapta el paso individualmente para cada peso, crítico cuando los gradientes llegan atenuados tras múltiples pasos de tiempo.</BodyText>
      </DetailsBox>

      <Text fontSize="11px" color="gray.400" textAlign="center">
        Red: LSTM({LSTM_IN}→{LSTM_H}) → Dense({DENSE.join("→")}) · BPTT + TD(λ={LAMBDA}) γ={GAMMA} · lr={LR} · ε {EPSILON_INICIO}→{EPSILON_FIN} · {WAYPOINTS.length} waypoints (+{WAYPOINT_BONUS} ref.)
      </Text>
    </CardRoot>
  );
}

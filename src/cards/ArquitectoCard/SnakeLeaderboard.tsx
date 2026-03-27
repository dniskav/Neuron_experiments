// ─── SnakeLeaderboard ─────────────────────────────────────────────────────────
//
// Top 10 configuraciones guardadas con botón de Cargar.
//

import { Box, Button, Flex, Text } from "@chakra-ui/react";
import type { LeaderboardEntry } from "./leaderboard";

const MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

function archSummary(entry: LeaderboardEntry): string {
  if (entry.hidden.length === 0) return "sin capas ocultas";
  return entry.hidden.map(l => `${l.neurons} ${l.activation}`).join(" → ");
}

interface Props {
  entries:  LeaderboardEntry[];
  onLoad:   (entry: LeaderboardEntry) => void;
  current?: string; // archKey de la config actual para highlight
}

export function SnakeLeaderboard({ entries, onLoad, current }: Props) {
  if (entries.length === 0) {
    return (
      <Text fontSize="12px" color="gray.500" textAlign="center" py={2}>
        Aún no hay configuraciones guardadas. Entrena y aparecerán aquí.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap={2}>
      {entries.map((entry, i) => {
        const key = entry.hidden.map(l => `${l.neurons}${l.activation[0]}`).join("-") || "empty";
        const isActive = key === current;
        return (
          <Flex
            key={entry.id}
            align="center"
            gap={3}
            bg={isActive ? "rgba(167,243,208,0.08)" : "rgba(255,255,255,0.03)"}
            border="1px solid"
            borderColor={isActive ? "rgba(167,243,208,0.2)" : "rgba(255,255,255,0.07)"}
            borderRadius="lg"
            px={3} py="8px"
          >
            {/* Medalla / posición */}
            <Text fontSize="16px" lineHeight={1} flexShrink={0}>
              {MEDAL[i] ?? `#${i + 1}`}
            </Text>

            {/* Info */}
            <Flex direction="column" gap="2px" flex={1} minW={0}>
              <Flex align="center" gap={2}>
                <Text fontSize="18px" fontWeight={800} color="#a7f3d0" lineHeight={1}>
                  {entry.bestScore}
                </Text>
                <Text fontSize="10px" color="gray.500" lineHeight={1}>pts</Text>
                <Box
                  fontSize="9px" fontWeight={700} color="white" px="6px" py="1px"
                  borderRadius="full"
                  bg={entry.optimizer === "adam" ? "#7c3aed" : entry.optimizer === "momentum" ? "#0284c7" : "#475569"}
                >
                  {entry.optimizer.toUpperCase()} {entry.lr}
                </Box>
              </Flex>
              <Text fontSize="10px" color="gray.400" lineClamp={1}>
                {archSummary(entry)}
              </Text>
              <Text fontSize="9px" color="gray.600">
                {entry.episodes} ep · {(entry.steps / 1000).toFixed(1)}k pasos
              </Text>
            </Flex>

            {/* Botón cargar */}
            <Button
              size="xs" colorPalette="green" variant={isActive ? "subtle" : "outline"}
              onClick={() => onLoad(entry)}
              flexShrink={0}
              color={isActive ? "green.300" : "gray.400"}
              borderColor={isActive ? "green.700" : "gray.600"}
            >
              {isActive ? "✓ Activa" : "Cargar"}
            </Button>
          </Flex>
        );
      })}
    </Flex>
  );
}

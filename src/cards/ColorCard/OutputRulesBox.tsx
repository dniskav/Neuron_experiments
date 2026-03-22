import { Box, Flex, Text } from "@chakra-ui/react";
import { TableCell } from "../../components/lib";

const RULES = [
  { n1: "> 0.5", n2: "≤ 0.5", res: "claro",  col: "#ca8a04" },
  { n1: "≤ 0.5", n2: "> 0.5", res: "oscuro", col: "#6366f1" },
  { n1: "≤ 0.5", n2: "≤ 0.5", res: "neutro", col: "#0284c7" },
];

export function OutputRulesBox() {
  return (
    <Box bg="gray.50" borderRadius="lg" p={4}>
      <Text fontSize="xs" color="gray.500" fontWeight={600} mb={2}>Cómo se combinan las salidas</Text>
      {RULES.map(r => (
        <Flex key={r.res} gap={2} mb={1}>
          <TableCell fontFamily="monospace">N1 {r.n1}</TableCell>
          <TableCell fontFamily="monospace">N2 {r.n2}</TableCell>
          <TableCell fontFamily="monospace" fontWeight={700} style={{ color: r.col }}>→ {r.res}</TableCell>
        </Flex>
      ))}
    </Box>
  );
}

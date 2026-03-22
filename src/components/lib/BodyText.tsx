import { Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

export function BodyText({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="xs" color="gray.600" lineHeight={1.6}>
      {children}
    </Text>
  );
}

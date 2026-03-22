import { Text, type TextProps } from "@chakra-ui/react";

/**
 * Small uppercase label used as section headers inside cards.
 * e.g. "Entrenar neurona", "Probar un color", etc.
 */
export function SectionLabel({ children, ...props }: TextProps) {
  return (
    <Text fontSize="xs" color="gray.400" fontWeight={600} {...props}>
      {children}
    </Text>
  );
}

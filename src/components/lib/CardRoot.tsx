import { Box, type BoxProps } from "@chakra-ui/react";

/**
 * Consistent card wrapper used by all experiment cards.
 * White background, rounded corners, soft shadow.
 */
export function CardRoot({ children, ...props }: BoxProps) {
  return (
    <Box
      bg="white"
      borderRadius="xl"
      boxShadow="0 4px 24px rgba(0,0,0,0.08)"
      p={6}
      display="flex"
      flexDirection="column"
      gap={5}
      fontFamily="sans-serif"
      {...props}
    >
      {children}
    </Box>
  );
}

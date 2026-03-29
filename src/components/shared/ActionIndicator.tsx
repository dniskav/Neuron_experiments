import { Box, Flex } from '@chakra-ui/react'

interface Props {
  action: number
  labels: readonly string[]
}

export function ActionIndicator({ action, labels }: Props) {
  return (
    <Flex gap={2}>
      {labels.map((label, i) => (
        <Box
          key={i}
          flex={1}
          textAlign="center"
          bg={action === i ? (i === 0 ? 'violet.50' : 'orange.50') : 'white'}
          border="1.5px solid"
          borderColor={action === i ? (i === 0 ? 'violet.300' : 'orange.300') : 'gray.200'}
          borderRadius="lg"
          py={1}
          fontSize="11px"
          fontWeight={action === i ? 700 : 400}
          color={action === i ? (i === 0 ? 'violet.600' : 'orange.600') : 'gray.500'}
          transition="all 0.1s">
          {label}
        </Box>
      ))}
    </Flex>
  )
}

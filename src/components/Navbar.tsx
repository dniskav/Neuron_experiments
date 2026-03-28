// ─── Navbar ───────────────────────────────────────────────────────────────────

import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Box, Flex, Text } from "@chakra-ui/react";

const LINKS = [
  { to: "/clasificacion-2d", label: "Clasificación 2D",      emoji: "🧠" },
  { to: "/rl-feedforward",   label: "RL feedforward",        emoji: "⚡" },
  { to: "/rl-memoria",       label: "RL con memoria",        emoji: "🧠💾" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <Box
      as="nav"
      position="sticky"
      top={0}
      zIndex={100}
      bg="#0f172a"
      borderBottom="1px solid rgba(255,255,255,0.08)"
    >
      <Flex
        h="56px"
        px={{ base: 4, md: 8 }}
        align="center"
        justify="space-between"
        maxW="1200px"
        mx="auto"
      >
        {/* Logo */}
        <NavLink to="/clasificacion-2d" style={{ textDecoration: "none" }}>
          <Flex align="center" gap={2}>
            <Text fontSize="18px" lineHeight={1}>⚛️</Text>
            <Text fontWeight={700} fontSize="15px" color="white" letterSpacing="tight">
              Neuron Lab
            </Text>
          </Flex>
        </NavLink>

        {/* Desktop links */}
        <Flex gap={1} display={{ base: "none", md: "flex" }}>
          {LINKS.map(link => {
            const active = pathname.startsWith(link.to);
            return (
              <NavLink key={link.to} to={link.to} style={{ textDecoration: "none" }}>
                <Flex
                  align="center"
                  gap="6px"
                  px={4} py="7px"
                  borderRadius="lg"
                  fontSize="13px"
                  fontWeight={active ? 700 : 400}
                  color={active ? "white" : "rgba(148,163,184,0.8)"}
                  bg={active ? "rgba(255,255,255,0.1)" : "transparent"}
                  _hover={{ bg: "rgba(255,255,255,0.07)", color: "white" }}
                  transition="all 0.15s"
                >
                  <Text lineHeight={1} fontSize="14px">{link.emoji}</Text>
                  <Text>{link.label}</Text>
                </Flex>
              </NavLink>
            );
          })}
        </Flex>

        {/* Mobile hamburger */}
        <Box display={{ base: "block", md: "none" }}>
          <Box
            as="button"
            onClick={() => setOpen(o => !o)}
            color="gray.300"
            fontSize="22px"
            lineHeight={1}
            p={1}
            bg="transparent"
            border="none"
            cursor="pointer"
          >
            {open ? "✕" : "☰"}
          </Box>
        </Box>
      </Flex>

      {/* Mobile dropdown */}
      {open && (
        <Box
          display={{ base: "block", md: "none" }}
          bg="#0f172a"
          borderTop="1px solid rgba(255,255,255,0.06)"
          pb={2}
        >
          {LINKS.map(link => {
            const active = pathname.startsWith(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                style={{ textDecoration: "none" }}
                onClick={() => setOpen(false)}
              >
                <Flex
                  align="center"
                  gap={3}
                  px={5} py="12px"
                  fontSize="14px"
                  fontWeight={active ? 700 : 400}
                  color={active ? "white" : "rgba(148,163,184,0.8)"}
                  bg={active ? "rgba(255,255,255,0.07)" : "transparent"}
                  borderLeft={active ? "3px solid #6366f1" : "3px solid transparent"}
                >
                  <Text lineHeight={1}>{link.emoji}</Text>
                  <Text>{link.label}</Text>
                </Flex>
              </NavLink>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

import { useMemo, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { useSessionStore } from "@/stores/session-store";
import { useAggregatedAgents, type AggregatedAgent } from "@/hooks/use-aggregated-agents";
import type { StreamItem } from "@/types/stream";

export interface AgentRecent extends AggregatedAgent {
  /**
   * Text of the last assistant reply in the agent's stream tail, or null when the tail is
   * empty / has no assistant message yet. Read from `agentStreamTail` (already synced by the
   * runtime), so the sidebar never issues an extra fetch to render a row preview.
   */
  lastReplyPreview: string | null;
}

function lastAssistantMessageText(tail: StreamItem[] | undefined): string | null {
  if (!tail) {
    return null;
  }
  for (let i = tail.length - 1; i >= 0; i--) {
    const item = tail[i];
    if (item.kind === "assistant_message" && typeof item.text === "string") {
      const text = item.text.trim();
      if (text.length > 0) {
        return text;
      }
    }
  }
  return null;
}

/**
 * Active (non-archived) agent sessions for the sidebar's "Sessions" mode, newest first.
 * Reuses `useAggregatedAgents` for the agent list (which already keeps object identity
 * stable across renders) and augments each row with the last reply preview from the store.
 */
export function useAgentRecents(): AgentRecent[] {
  const { agents } = useAggregatedAgents();
  const streamTails = useSessionStore(
    useShallow((state) => {
      const result: Record<string, Map<string, StreamItem[]>> = {};
      for (const [serverId, session] of Object.entries(state.sessions)) {
        result[serverId] = session.agentStreamTail;
      }
      return result;
    }),
  );

  // Preserve object identity when the underlying agent object and preview are both unchanged,
  // so downstream memo/shallow comparisons can bail early.
  const prevAgentRef = useRef<Map<string, AggregatedAgent>>(new Map());
  const prevRecentRef = useRef<Map<string, AgentRecent>>(new Map());
  const prevSortedRef = useRef<AgentRecent[]>([]);

  const recents = useMemo(() => {
    const built: AgentRecent[] = [];
    const nextAgents = new Map<string, AggregatedAgent>();
    const nextRecents = new Map<string, AgentRecent>();

    for (const agent of agents) {
      const key = `${agent.serverId}:${agent.id}`;
      nextAgents.set(key, agent);
      const lastReplyPreview = lastAssistantMessageText(streamTails[agent.serverId]?.get(agent.id));
      const prevAgent = prevAgentRef.current.get(key);
      const prevRecent = prevRecentRef.current.get(key);
      if (prevRecent && prevAgent === agent && prevRecent.lastReplyPreview === lastReplyPreview) {
        nextRecents.set(key, prevRecent);
        built.push(prevRecent);
      } else {
        const next: AgentRecent = { ...agent, lastReplyPreview };
        nextRecents.set(key, next);
        built.push(next);
      }
    }

    built.sort((left, right) => right.lastActivityAt.getTime() - left.lastActivityAt.getTime());

    prevAgentRef.current = nextAgents;
    prevRecentRef.current = nextRecents;

    const prevSorted = prevSortedRef.current;
    const stable =
      built.length === prevSorted.length && built.every((recent, i) => recent === prevSorted[i])
        ? prevSorted
        : built;
    prevSortedRef.current = stable;
    return stable;
  }, [agents, streamTails]);

  return recents;
}

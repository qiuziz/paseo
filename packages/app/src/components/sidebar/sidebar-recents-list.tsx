import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, Pressable, ScrollView, type PressableStateCallbackType } from "react-native";
import { NestableScrollContainer } from "react-native-draggable-flatlist";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { Folder } from "lucide-react-native";
import { isWeb as platformIsWeb, isNative as platformIsNative } from "@/constants/platform";
import type { Theme } from "@/styles/theme";
import { useAgentRecents, type AgentRecent } from "@/hooks/use-agent-recents";
import {
  DATE_SECTION_ORDER,
  deriveDateSectionKey,
  formatDateSectionLabel,
  type DateSectionKey,
} from "@/utils/agent-date-sections";
import { navigateToAgent } from "@/utils/navigate-to-agent";

const ThemedFolder = withUnistyles(Folder);

const extraMutedForegroundMapping = (theme: Theme) => ({
  color: theme.colors.foregroundExtraMuted,
});

/** Last path segment of a cwd; the run's own tail when found. */
function lastPathSegment(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

const SidebarRecentRow = memo(function SidebarRecentRow({
  agent,
  onPress,
}: {
  agent: AgentRecent;
  onPress: (agent: AgentRecent) => void;
}) {
  const { t } = useTranslation();
  const title = agent.title?.trim() || t("agentList.fallbackTitle");
  const directory = lastPathSegment(agent.cwd);

  const pressableStyle = useCallback(
    ({ pressed, hovered = false }: PressableStateCallbackType & { hovered?: boolean }) => [
      styles.row,
      Boolean(hovered) && styles.rowHovered,
      pressed && styles.rowPressed,
    ],
    [],
  );
  const handlePress = useCallback(() => onPress(agent), [onPress, agent]);

  return (
    <Pressable
      style={pressableStyle}
      onPress={handlePress}
      accessibilityRole={platformIsWeb ? undefined : "button"}
      testID={`sidebar-recent-${agent.serverId}-${agent.id}`}
    >
      <Text style={styles.rowTitle} numberOfLines={1}>
        {title}
      </Text>
      {agent.lastReplyPreview ? (
        <Text style={styles.rowPreview} numberOfLines={2}>
          {agent.lastReplyPreview}
        </Text>
      ) : null}
      <View style={styles.rowCwdRow}>
        <ThemedFolder size={12} uniProps={extraMutedForegroundMapping} />
        <Text style={styles.rowCwd} numberOfLines={1}>
          {directory}
        </Text>
      </View>
    </Pressable>
  );
});

/**
 * Codex-style "Sessions" sidebar: active agent sessions grouped by activity date, each row
 * showing the session title, the last assistant reply (two lines), and the working directory.
 * This is what appears in the sidebar's default "Sessions" grouping mode.
 */
export const SidebarRecentsList = memo(function SidebarRecentsList({
  onWorkspacePress,
}: {
  onWorkspacePress?: () => void;
}) {
  const { t } = useTranslation();
  const recents = useAgentRecents();

  const handleAgentPress = useCallback(
    (agent: AgentRecent) => {
      onWorkspacePress?.();
      navigateToAgent({
        serverId: agent.serverId,
        agentId: agent.id,
        workspaceId: agent.workspaceId,
        pin: false,
      });
    },
    [onWorkspacePress],
  );

  const sections = useMemo(() => {
    const buckets = new Map<DateSectionKey, AgentRecent[]>();
    for (const recent of recents) {
      const section = deriveDateSectionKey(recent.lastActivityAt);
      const rows = buckets.get(section);
      if (rows) {
        rows.push(recent);
      } else {
        buckets.set(section, [recent]);
      }
    }
    const result: { section: DateSectionKey; rows: AgentRecent[] }[] = [];
    for (const section of DATE_SECTION_ORDER) {
      const rows = buckets.get(section);
      if (rows && rows.length > 0) {
        result.push({ section, rows });
      }
    }
    return result;
  }, [recents]);

  const content =
    recents.length === 0 ? (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t("sidebar.recents.empty")}</Text>
      </View>
    ) : (
      <>
        {sections.map(({ section, rows }) => (
          <View key={section} style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {formatDateSectionLabel(t, section)}
              </Text>
            </View>
            <View style={styles.sectionRows}>
              {rows.map((agent) => (
                <SidebarRecentRow
                  key={`${agent.serverId}:${agent.id}`}
                  agent={agent}
                  onPress={handleAgentPress}
                />
              ))}
            </View>
          </View>
        ))}
      </>
    );

  if (platformIsNative) {
    return (
      <NestableScrollContainer
        style={styles.list}
        contentContainerStyle={styles.listContent}
        testID="sidebar-recents-list-scroll"
      >
        {content}
      </NestableScrollContainer>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      testID="sidebar-recents-list-scroll"
    >
      {content}
    </ScrollView>
  );
});

const styles = StyleSheet.create((theme) => ({
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing[2],
    paddingTop: 2,
    paddingBottom: theme.spacing[4],
  },
  empty: {
    alignItems: "center",
    paddingVertical: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  sectionBlock: {
    paddingBottom: theme.spacing[3],
  },
  sectionHeader: {
    minHeight: 36,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[1],
    justifyContent: "center",
  },
  sectionTitle: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: "400",
  },
  sectionRows: {},
  row: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[0.5],
    gap: theme.spacing[1],
    userSelect: "none",
  },
  rowHovered: {
    backgroundColor: theme.colors.surfaceSidebarHover,
  },
  rowPressed: {
    backgroundColor: theme.colors.surface2,
  },
  rowTitle: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: "400",
    lineHeight: 20,
    opacity: 0.76,
  },
  rowPreview: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
    lineHeight: 16,
  },
  rowCwdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  rowCwd: {
    color: theme.colors.foregroundExtraMuted,
    fontSize: theme.fontSize.xs,
    flex: 1,
    minWidth: 0,
  },
}));

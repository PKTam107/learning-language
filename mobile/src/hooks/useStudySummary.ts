import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSettings } from "@/lib/settings";
import { fetchChallengeMetrics } from "@/lib/insights";
import type { ChallengeMetrics } from "@/lib/challenge";
import { fetchStudyStats, EMPTY_STATS } from "@/lib/stats";

/** Reload on tab focus; responses from a tab left behind cannot overwrite a later visit. */
export function useStudySummary(withStats = false) {
  const { settings, ready } = useSettings();
  const [metrics, setMetrics] = useState<ChallengeMetrics | null>(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setError("");
    try {
      const [nextMetrics, nextStats] = await Promise.all([
        fetchChallengeMetrics(settings.newPerDay),
        withStats ? fetchStudyStats() : Promise.resolve(EMPTY_STATS),
      ]);
      if (request !== version.current) return;
      setMetrics(nextMetrics);
      setStats(nextStats);
    } catch (e) {
      if (request === version.current) setError(e instanceof Error ? e.message : "Chưa tải được dữ liệu học tập.");
    } finally {
      if (request === version.current) { setLoading(false); setRefreshing(false); }
    }
  }, [settings.newPerDay, withStats]);
  useFocusEffect(useCallback(() => {
    if (!ready) return;
    void load();
    const requests = version;
    return () => { requests.current++; };
  }, [ready, load]));
  const refresh = () => { if (ready) { setRefreshing(true); void load(); } };
  return { settings, metrics, stats, loading, refreshing, error, refresh };
}

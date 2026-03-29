/**
 * Precomputed demo analysis data for MergeGuard.
 * Used when Convex is not connected or for the demo environment.
 */

import type { BlastRadiusData, PostMortemData } from "./llm-pipeline";

export type RiskLevel = "GREEN" | "YELLOW" | "RED";

export interface DemoAnalysis {
  id: string;
  repoName: string;
  branch: string;
  diff: string;
  blastRadius: BlastRadiusData;
  postMortem: PostMortemData;
  llmBrief: string;
  riskLevel: RiskLevel;
  createdAt: number;
}

// ─── Scenario A: HIGH Risk ─────────────────────────────

export const scenarioA: DemoAnalysis = {
  id: "demo-analysis-a",
  repoName: "django/django",
  branch: "feature/cache-refactor",
  diff: `--- a/django/cache/backends/base.py
+++ b/django/cache/backends/base.py
@@ -42,7 +42,15 @@ class BaseCache:
     def make_key(self, key, version=None):
-        return '%s:%s:%s' % (self.key_prefix, version or self.version, key)
+        # Refactored key generation with namespace support
+        namespace = getattr(self, '_namespace', '')
+        parts = [self.key_prefix, namespace, str(version or self.version), key]
+        return ':'.join(filter(None, parts))
+
+    def set_namespace(self, namespace):
+        self._namespace = namespace`,
  blastRadius: {
    nodes: [
      { id: "cache_base", file: "django/cache/backends/base.py", symbol: "BaseCache", coverage_status: "uncovered", coverage: 12, functions: ["get", "set", "delete", "clear", "make_key"], ring: 0 },
      { id: "cache_memcached", file: "django/cache/backends/memcached.py", symbol: "MemcachedCache", coverage_status: "partial", coverage: 34, functions: ["get", "set", "delete"], ring: 1 },
      { id: "cache_redis", file: "django/cache/backends/redis.py", symbol: "RedisCache", coverage_status: "partial", coverage: 28, functions: ["get", "set", "delete", "incr"], ring: 1 },
      { id: "cache_db", file: "django/cache/backends/db.py", symbol: "DatabaseCache", coverage_status: "uncovered", coverage: 8, functions: ["get", "set", "_cull"], ring: 1 },
      { id: "cache_filebased", file: "django/cache/backends/filebased.py", symbol: "FileBasedCache", coverage_status: "partial", coverage: 45, functions: ["get", "set", "clear"], ring: 1 },
      { id: "cache_locmem", file: "django/cache/backends/locmem.py", symbol: "LocMemCache", coverage_status: "covered", coverage: 78, functions: ["get", "set"], ring: 1 },
      { id: "sessions_cached", file: "django/contrib/sessions/backends/cached_db.py", symbol: "SessionStore", coverage_status: "uncovered", coverage: 15, functions: ["load", "save", "delete"], ring: 2 },
      { id: "sessions_cache", file: "django/contrib/sessions/backends/cache.py", symbol: "SessionStore", coverage_status: "partial", coverage: 22, functions: ["load", "save"], ring: 2 },
      { id: "template_cache", file: "django/template/loaders/cached.py", symbol: "Loader", coverage_status: "uncovered", coverage: 5, functions: ["get_template", "reset"], ring: 2 },
      { id: "cache_middleware", file: "django/middleware/cache.py", symbol: "CacheMiddleware", coverage_status: "partial", coverage: 38, functions: ["process_request", "process_response"], ring: 2 },
      { id: "decorators_cache", file: "django/views/decorators/cache.py", symbol: "cache_page", coverage_status: "covered", coverage: 65, functions: ["cache_page", "never_cache"], ring: 2 },
      { id: "rest_throttle", file: "rest_framework/throttling.py", symbol: "SimpleRateThrottle", coverage_status: "uncovered", coverage: 10, functions: ["allow_request", "wait"], ring: 3 },
      { id: "celery_backend", file: "celery/backends/cache.py", symbol: "CacheBackend", coverage_status: "uncovered", coverage: 0, functions: ["store_result", "get_result"], ring: 3 },
      { id: "admin_decorators", file: "django/contrib/admin/views/decorators.py", symbol: "staff_member_required", coverage_status: "partial", coverage: 42, functions: ["staff_member_required"], ring: 3 },
      { id: "auth_backends", file: "django/contrib/auth/backends.py", symbol: "ModelBackend", coverage_status: "partial", coverage: 55, functions: ["authenticate", "get_user_permissions"], ring: 3 },
      { id: "staticfiles", file: "django/contrib/staticfiles/storage.py", symbol: "CachedStaticFilesStorage", coverage_status: "covered", coverage: 72, functions: ["url", "hashed_name"], ring: 3 },
      { id: "signals_handler", file: "django/dispatch/dispatcher.py", symbol: "Signal", coverage_status: "partial", coverage: 48, functions: ["connect", "send"], ring: 3 },
      { id: "model_manager", file: "django/db/models/manager.py", symbol: "Manager", coverage_status: "covered", coverage: 82, functions: ["get_queryset"], ring: 3 },
      { id: "queryset", file: "django/db/models/query.py", symbol: "QuerySet", coverage_status: "covered", coverage: 88, functions: ["filter", "get", "all"], ring: 3 },
      { id: "test_cache", file: "tests/cache/tests.py", symbol: "CacheTests", coverage_status: "covered", coverage: 95, functions: ["test_cache_get", "test_cache_set"], ring: 3 },
      { id: "settings", file: "django/conf/global_settings.py", symbol: "CACHES", coverage_status: "covered", coverage: 100, functions: [], ring: 3 },
      { id: "user_models", file: "myapp/models/user.py", symbol: "UserProfile", coverage_status: "partial", coverage: 32, functions: ["get_cached_profile", "invalidate_cache"], ring: 3 },
      { id: "api_views", file: "myapp/api/views.py", symbol: "UserViewSet", coverage_status: "uncovered", coverage: 18, functions: ["list", "retrieve"], ring: 3 },
    ],
    edges: [
      { source: "cache_base", target: "cache_memcached" },
      { source: "cache_base", target: "cache_redis" },
      { source: "cache_base", target: "cache_db" },
      { source: "cache_base", target: "cache_filebased" },
      { source: "cache_base", target: "cache_locmem" },
      { source: "cache_memcached", target: "sessions_cached" },
      { source: "cache_redis", target: "sessions_cache" },
      { source: "cache_base", target: "template_cache" },
      { source: "cache_base", target: "cache_middleware" },
      { source: "cache_middleware", target: "decorators_cache" },
      { source: "cache_redis", target: "rest_throttle" },
      { source: "cache_base", target: "celery_backend" },
      { source: "sessions_cached", target: "admin_decorators" },
      { source: "sessions_cached", target: "auth_backends" },
      { source: "cache_base", target: "staticfiles" },
      { source: "cache_middleware", target: "signals_handler" },
      { source: "cache_db", target: "model_manager" },
      { source: "model_manager", target: "queryset" },
      { source: "cache_base", target: "test_cache" },
      { source: "cache_base", target: "settings" },
      { source: "cache_redis", target: "user_models" },
      { source: "user_models", target: "api_views" },
    ],
    risk_score: 87,
    risk_level: "RED",
    overall_coverage: 38,
  },
  postMortem: {
    matches: [
      {
        pattern_id: "P-004",
        files: ["django/cache/backends/base.py", "django/cache/backends/memcached.py", "django/contrib/sessions/backends/cached_db.py"],
        support: 6,
        confidence: 0.74,
        evidence_commits: ["a3f8c91", "b7d2e45", "c1f9a23", "d4e5b67", "e8c2f19", "f6a1d34"],
      },
      {
        pattern_id: "P-012",
        files: ["django/middleware/cache.py", "django/views/decorators/cache.py"],
        support: 3,
        confidence: 0.58,
        evidence_commits: ["g2h4k56", "h8j1m90", "i3l5n78"],
      },
      {
        pattern_id: "P-007",
        files: ["rest_framework/throttling.py", "django/cache/backends/redis.py"],
        support: 4,
        confidence: 0.62,
        evidence_commits: ["j7k9p12", "k1l3q45", "l5m7r89", "m9n1s23"],
      },
    ],
    top_risk_files: [
      "django/cache/backends/base.py",
      "django/contrib/sessions/backends/cached_db.py",
      "django/middleware/cache.py",
      "rest_framework/throttling.py",
      "django/cache/backends/memcached.py",
    ],
    incidents_timeline: [
      { date: "2024-01-15", count: 1, commits: ["a3f8c91"], severity: "HIGH" },
      { date: "2024-02-28", count: 2, commits: ["b7d2e45", "c1f9a23"], severity: "CRITICAL" },
      { date: "2024-04-10", count: 1, commits: ["d4e5b67"], severity: "MEDIUM" },
      { date: "2024-05-22", count: 3, commits: ["e8c2f19", "f6a1d34", "g2h4k56"], severity: "HIGH" },
      { date: "2024-07-03", count: 1, commits: ["h8j1m90"], severity: "LOW" },
      { date: "2024-08-19", count: 2, commits: ["i3l5n78", "j7k9p12"], severity: "HIGH" },
      { date: "2024-09-30", count: 4, commits: ["k1l3q45", "l5m7r89", "m9n1s23", "n2o4p56"], severity: "CRITICAL" },
      { date: "2024-11-14", count: 1, commits: ["o6p8q90"], severity: "MEDIUM" },
      { date: "2025-01-05", count: 2, commits: ["p0q2r34", "q4r6s78"], severity: "HIGH" },
      { date: "2025-02-18", count: 1, commits: ["r8s0t12"], severity: "LOW" },
      { date: "2025-03-25", count: 3, commits: ["s2t4u56", "t6u8v90", "u0v2w34"], severity: "CRITICAL" },
    ],
  },
  llmBrief: "",
  riskLevel: "RED",
  createdAt: Date.now() - 3600000,
};

// ─── Scenario B: LOW Risk ──────────────────────────────

export const scenarioB: DemoAnalysis = {
  id: "demo-analysis-b",
  repoName: "myapp/backend",
  branch: "docs/update-helpers",
  diff: `--- a/myapp/utils/helpers.py
+++ b/myapp/utils/helpers.py
@@ -15,6 +15,8 @@ def format_date(dt: datetime) -> str:
-    """Format a datetime object."""
+    """Format a datetime object to ISO 8601 string.
+
+    Args:
+        dt: The datetime object to format.
+    """`,
  blastRadius: {
    nodes: [
      { id: "utils", file: "myapp/utils/helpers.py", symbol: "format_date", coverage_status: "covered", coverage: 92, functions: ["format_date"], ring: 0 },
    ],
    edges: [],
    risk_score: 3,
    risk_level: "GREEN",
    overall_coverage: 92,
  },
  postMortem: {
    matches: [],
    top_risk_files: [],
    incidents_timeline: [],
  },
  llmBrief: "",
  riskLevel: "GREEN",
  createdAt: Date.now() - 7200000,
};

export const demoAnalyses: DemoAnalysis[] = [scenarioA, scenarioB];

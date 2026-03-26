// ─── Mock: Blast Radius Graph Data ───
// Central node = the changed file, rings = dependency depth
export const blastRadiusData = {
  nodes: [
    // Ring 0 — Changed file (centre)
    {
      id: 'auth/login.py',
      type: 'changed',
      ring: 0,
      coverage: 0.92,
      lines: 148,
      functions: ['authenticate', 'validate_token', 'refresh_session'],
    },

    // Ring 1 — Direct dependents
    {
      id: 'api/routes.py',
      type: 'dependent',
      ring: 1,
      coverage: 0.85,
      lines: 312,
      functions: ['login_route', 'logout_route', 'protected_route'],
    },
    {
      id: 'middleware/auth_mw.py',
      type: 'dependent',
      ring: 1,
      coverage: 0.78,
      lines: 87,
      functions: ['require_auth', 'check_permissions'],
    },
    {
      id: 'services/user_svc.py',
      type: 'dependent',
      ring: 1,
      coverage: 0.65,
      lines: 204,
      functions: ['get_user', 'update_profile', 'delete_account'],
    },
    {
      id: 'tests/test_auth.py',
      type: 'test',
      ring: 1,
      coverage: 1.0,
      lines: 156,
      functions: ['test_login', 'test_token_refresh', 'test_invalid_creds'],
    },

    // Ring 2 — Transitive dependents
    {
      id: 'api/admin.py',
      type: 'dependent',
      ring: 2,
      coverage: 0.42,
      lines: 198,
      functions: ['admin_dashboard', 'manage_users'],
    },
    {
      id: 'services/email_svc.py',
      type: 'dependent',
      ring: 2,
      coverage: 0.31,
      lines: 134,
      functions: ['send_welcome', 'send_reset_password'],
    },
    {
      id: 'models/user.py',
      type: 'dependent',
      ring: 2,
      coverage: 0.88,
      lines: 92,
      functions: ['User', 'UserSession'],
    },
    {
      id: 'utils/crypto.py',
      type: 'dependent',
      ring: 2,
      coverage: 0.55,
      lines: 67,
      functions: ['hash_password', 'verify_hash', 'generate_token'],
    },
    {
      id: 'workers/cleanup.py',
      type: 'dependent',
      ring: 2,
      coverage: 0.12,
      lines: 45,
      functions: ['purge_expired_sessions'],
    },

    // Ring 3 — Deep transitive
    {
      id: 'api/webhooks.py',
      type: 'dependent',
      ring: 3,
      coverage: 0.2,
      lines: 89,
      functions: ['handle_webhook', 'verify_signature'],
    },
    {
      id: 'services/billing_svc.py',
      type: 'dependent',
      ring: 3,
      coverage: 0.38,
      lines: 267,
      functions: ['charge_user', 'process_refund'],
    },
    {
      id: 'tests/test_admin.py',
      type: 'test',
      ring: 3,
      coverage: 0.95,
      lines: 112,
      functions: ['test_admin_access', 'test_user_management'],
    },
  ],
  links: [
    { source: 'auth/login.py', target: 'api/routes.py', weight: 3 },
    { source: 'auth/login.py', target: 'middleware/auth_mw.py', weight: 2 },
    { source: 'auth/login.py', target: 'services/user_svc.py', weight: 2 },
    { source: 'auth/login.py', target: 'tests/test_auth.py', weight: 1 },
    { source: 'api/routes.py', target: 'api/admin.py', weight: 2 },
    { source: 'api/routes.py', target: 'models/user.py', weight: 1 },
    { source: 'middleware/auth_mw.py', target: 'utils/crypto.py', weight: 2 },
    {
      source: 'services/user_svc.py',
      target: 'services/email_svc.py',
      weight: 1,
    },
    { source: 'services/user_svc.py', target: 'models/user.py', weight: 2 },
    { source: 'services/user_svc.py', target: 'workers/cleanup.py', weight: 1 },
    { source: 'api/admin.py', target: 'api/webhooks.py', weight: 1 },
    { source: 'api/admin.py', target: 'services/billing_svc.py', weight: 1 },
    { source: 'api/admin.py', target: 'tests/test_admin.py', weight: 1 },
  ],
};

// ─── Mock: Post Mortem Timeline Data ───
// Historical bug patterns associated with changes to auth/login.py
export const postMortemData = {
  fingerprints: [
    {
      id: 'FP-001',
      name: 'Auth Token Invalidation Storm',
      severity: 'critical',
      confidence: 0.92,
      description:
        'Changes to token validation logic historically cause cascading session invalidations across microservices.',
      occurrences: 7,
      lastSeen: '2026-01-15',
      relatedFiles: [
        'auth/login.py',
        'middleware/auth_mw.py',
        'utils/crypto.py',
      ],
      rule: '{login.py, auth_mw.py} → bug_fix (support=0.14, confidence=0.92)',
    },
    {
      id: 'FP-002',
      name: 'Email Service Null Pointer',
      severity: 'high',
      confidence: 0.78,
      description:
        'When user service changes coincide with auth changes, the email service receives null user objects 78% of the time.',
      occurrences: 4,
      lastSeen: '2025-11-03',
      relatedFiles: ['services/user_svc.py', 'services/email_svc.py'],
      rule: '{user_svc.py, login.py} → bug_fix (support=0.08, confidence=0.78)',
    },
    {
      id: 'FP-003',
      name: 'Admin Dashboard 403 Regression',
      severity: 'medium',
      confidence: 0.65,
      description:
        'Auth middleware changes break admin permission checks, causing false 403 responses for admin users.',
      occurrences: 3,
      lastSeen: '2025-09-22',
      relatedFiles: ['middleware/auth_mw.py', 'api/admin.py'],
      rule: '{auth_mw.py, admin.py} → bug_fix (support=0.06, confidence=0.65)',
    },
    {
      id: 'FP-004',
      name: 'Session Cleanup Race Condition',
      severity: 'low',
      confidence: 0.45,
      description:
        'Concurrent session cleanup with token refresh creates stale session references in the database.',
      occurrences: 2,
      lastSeen: '2025-07-10',
      relatedFiles: ['workers/cleanup.py', 'auth/login.py'],
      rule: '{cleanup.py, login.py} → bug_fix (support=0.04, confidence=0.45)',
    },
  ],
  timeline: [
    { date: '2025-01-10', bugs: 2, commits: 15, fingerprint: 'FP-001' },
    { date: '2025-02-14', bugs: 0, commits: 22, fingerprint: null },
    { date: '2025-03-05', bugs: 3, commits: 18, fingerprint: 'FP-001' },
    { date: '2025-04-20', bugs: 1, commits: 12, fingerprint: 'FP-002' },
    { date: '2025-05-11', bugs: 0, commits: 25, fingerprint: null },
    { date: '2025-06-08', bugs: 1, commits: 20, fingerprint: 'FP-003' },
    { date: '2025-07-10', bugs: 2, commits: 14, fingerprint: 'FP-004' },
    { date: '2025-08-15', bugs: 0, commits: 30, fingerprint: null },
    { date: '2025-09-22', bugs: 1, commits: 16, fingerprint: 'FP-003' },
    { date: '2025-10-05', bugs: 0, commits: 19, fingerprint: null },
    { date: '2025-11-03', bugs: 2, commits: 21, fingerprint: 'FP-002' },
    { date: '2025-12-12', bugs: 0, commits: 28, fingerprint: null },
    { date: '2026-01-15', bugs: 3, commits: 17, fingerprint: 'FP-001' },
    { date: '2026-02-20', bugs: 0, commits: 24, fingerprint: null },
  ],
};

// ─── Mock: LLM Analysis Output ───
export const llmAnalysisData = {
  status: 'complete',
  badge: 'YELLOW', // GREEN | YELLOW | RED
  riskScore: 67,
  agents: {
    blastRadiusInterpreter: {
      name: 'Blast Radius Interpreter',
      status: 'complete',
      output: `## Blast Radius Analysis

**Changed File:** \`auth/login.py\` — 148 lines, 3 functions modified

### Impact Summary
This change touches the core authentication module. The blast radius extends to **13 files** across **3 dependency rings**.

### Critical Findings
1. **High-Risk Path:** \`auth/login.py → middleware/auth_mw.py → utils/crypto.py\`
   - Coverage drops from 92% → 78% → 55% along this path
   - The \`verify_hash\` function in crypto.py has only 55% coverage — potential blind spot

2. **Uncovered Worker:** \`workers/cleanup.py\` has only **12% coverage**
   - The \`purge_expired_sessions\` function is called by \`user_svc.py\` which directly depends on the changed auth module
   - If session format changes, this worker will silently fail

3. **Test Coverage Gap:** While \`tests/test_auth.py\` covers the happy path, no integration tests exist for the \`auth → admin → webhooks\` chain

### Recommendation
Add integration tests for the auth→admin→webhooks path before merging. The coverage on \`workers/cleanup.py\` is dangerously low.`,
    },
    patternExplainer: {
      name: 'Pattern Explainer',
      status: 'complete',
      output: `## Pattern Analysis

### Matching Fingerprints Found: 4

#### 🔴 FP-001: Auth Token Invalidation Storm (92% confidence)
This is the highest-confidence pattern match. In **7 out of 7 historical incidents**, changes to \`login.py\` combined with \`auth_mw.py\` modifications led to bug-fix commits within 48 hours.

**Root Cause Pattern:** Token format changes in \`login.py\` aren't propagated to the middleware's token validation cache, causing a thundering herd of re-authentication requests.

**Last Incident:** January 15, 2026 — resulted in 23-minute service degradation.

#### 🟠 FP-002: Email Service Null Pointer (78% confidence)
When \`user_svc.py\` is in the blast radius of auth changes, the \`send_welcome\` function receives null user objects because the user lookup fails silently during the auth transition period.

#### 🟡 FP-003: Admin Dashboard 403 Regression (65% confidence)  
Permission check logic in \`admin.py\` hard-codes token format assumptions that break when auth changes modify the token structure.

#### ⚪ FP-004: Session Cleanup Race Condition (45% confidence)
Low confidence but worth noting — cleanup workers don't handle mid-flight session format transitions.

### Historical Risk Score: 67/100
Based on pattern density and confidence levels, this change carries moderate-to-high risk.`,
    },
    orchestrator: {
      name: 'Merge Orchestrator',
      status: 'complete',
      output: `## Merge Recommendation

### 🟡 YELLOW — Merge with Caution

**Risk Score: 67/100**

This PR modifies core authentication infrastructure with a significant blast radius (13 files, 3 rings deep) and matches 4 historical failure fingerprints.

### Before Merging:
1. ✅ Add integration test for \`auth → admin → webhooks\` path
2. ✅ Verify \`workers/cleanup.py\` handles new session format
3. ✅ Run load test to check for token invalidation storm (FP-001)
4. ⚠️ Consider deploying with feature flag to limit blast radius

### What Could Go Wrong:
- **Most Likely (92%):** Token cache invalidation causing auth storm
- **Moderate Risk (78%):** Email service null pointers during deployment
- **Lower Risk (65%):** Admin dashboard 403 errors for existing sessions

### Confidence Level
This assessment is based on 14 months of commit history (392 commits, 16 bug-fix commits touching auth-related files). The pattern library contains 4 relevant fingerprints with an average confidence of 70%.`,
    },
  },
};

// ─── Mock: Merge Badge Data ───
export const mergeBadgeData = {
  badge: 'YELLOW',
  riskScore: 67,
  changedFile: 'auth/login.py',
  prTitle: 'feat: implement JWT refresh token rotation',
  prNumber: 247,
  author: 'balaa',
  timestamp: '2026-03-09T14:30:00Z',
  summary: {
    filesAffected: 13,
    dependencyRings: 3,
    fingerprintsMatched: 4,
    avgCoverage: 0.58,
    criticalPaths: 2,
  },
};

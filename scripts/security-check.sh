#!/bin/bash
# Comprehensive Security and Code Quality Check Script
# Runs: npm audit, eslint, TypeScript checks, and custom security scans

set -e

# Disable ANSI colors in child processes (prevents numeric comparison issues)
export FORCE_COLOR=0
export NO_COLOR=1

# Configuration
PROJECT_DIR="/root/RegularUpkeep-app"
LOG_DIR="$PROJECT_DIR/logs/security"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/security-check_$TIMESTAMP.log"
SUMMARY_FILE="$LOG_DIR/latest-summary.txt"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track issues
TOTAL_ISSUES=0
CRITICAL_ISSUES=0

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_header() {
    log "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    log "${BLUE}  $1${NC}"
    log "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

# Start
log "Security Check Started: $(date)"
log "Project: $PROJECT_DIR"
log ""

cd "$PROJECT_DIR"

# ============================================================================
# 1. NPM AUDIT - Dependency Vulnerabilities
# ============================================================================
log_header "1. NPM AUDIT - Checking Dependency Vulnerabilities"

AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || true)
AUDIT_VULNS=$(echo "$AUDIT_OUTPUT" | node -e "
const data = require('fs').readFileSync(0, 'utf8');
try {
    const json = JSON.parse(data);
    const meta = json.metadata || {};
    const vulns = meta.vulnerabilities || {};
    console.log(JSON.stringify({
        total: (vulns.low || 0) + (vulns.moderate || 0) + (vulns.high || 0) + (vulns.critical || 0),
        critical: vulns.critical || 0,
        high: vulns.high || 0,
        moderate: vulns.moderate || 0,
        low: vulns.low || 0
    }));
} catch(e) {
    console.log(JSON.stringify({total: 0, critical: 0, high: 0, moderate: 0, low: 0}));
}
" 2>/dev/null || echo '{"total":0,"critical":0,"high":0,"moderate":0,"low":0}')

# Strip ANSI color codes for numeric comparisons
strip_ansi() {
    echo "$1" | sed 's/\x1b\[[0-9;]*m//g' | tr -d '[:space:]'
}

AUDIT_CRITICAL=$(strip_ansi "$(echo "$AUDIT_VULNS" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).critical)")")
AUDIT_HIGH=$(strip_ansi "$(echo "$AUDIT_VULNS" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).high)")")
AUDIT_MODERATE=$(strip_ansi "$(echo "$AUDIT_VULNS" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).moderate)")")
AUDIT_LOW=$(strip_ansi "$(echo "$AUDIT_VULNS" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).low)")")
AUDIT_TOTAL=$(strip_ansi "$(echo "$AUDIT_VULNS" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).total)")")

if [ "$AUDIT_CRITICAL" -gt 0 ] || [ "$AUDIT_HIGH" -gt 0 ]; then
    log "${RED}VULNERABILITIES FOUND:${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + AUDIT_CRITICAL + AUDIT_HIGH))
else
    log "${GREEN}No critical/high vulnerabilities found${NC}"
fi

log "  Critical: $AUDIT_CRITICAL"
log "  High: $AUDIT_HIGH"
log "  Moderate: $AUDIT_MODERATE"
log "  Low: $AUDIT_LOW"
TOTAL_ISSUES=$((TOTAL_ISSUES + AUDIT_TOTAL))

# ============================================================================
# 2. ESLINT - Code Quality
# ============================================================================
log_header "2. ESLINT - Code Quality Check"

ESLINT_OUTPUT=$(npx eslint src/ --format json 2>/dev/null || true)
ESLINT_ERRORS=$(echo "$ESLINT_OUTPUT" | node -e "
const data = require('fs').readFileSync(0, 'utf8');
try {
    const results = JSON.parse(data);
    let errors = 0, warnings = 0;
    results.forEach(r => { errors += r.errorCount; warnings += r.warningCount; });
    console.log(errors + ',' + warnings);
} catch(e) { console.log('0,0'); }
" 2>/dev/null || echo "0,0")

LINT_ERRORS=$(strip_ansi "$(echo "$ESLINT_ERRORS" | cut -d',' -f1)")
LINT_WARNINGS=$(strip_ansi "$(echo "$ESLINT_ERRORS" | cut -d',' -f2)")

if [ "$LINT_ERRORS" -gt 0 ]; then
    log "${RED}ESLint Errors: $LINT_ERRORS${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + LINT_ERRORS))
else
    log "${GREEN}No ESLint errors${NC}"
fi
log "  Errors: $LINT_ERRORS"
log "  Warnings: $LINT_WARNINGS"
TOTAL_ISSUES=$((TOTAL_ISSUES + LINT_ERRORS + LINT_WARNINGS))

# ============================================================================
# 3. TYPESCRIPT - Type Checking
# ============================================================================
log_header "3. TYPESCRIPT - Type Checking"

TSC_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" 2>/dev/null || true)
TSC_ERRORS=${TSC_ERRORS:-0}
TSC_ERRORS=$(echo "$TSC_ERRORS" | tr -d '[:space:]')

if [ "$TSC_ERRORS" -gt 0 ] 2>/dev/null; then
    log "${RED}TypeScript Errors: $TSC_ERRORS${NC}"
    echo "$TSC_OUTPUT" | head -20 >> "$LOG_FILE"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + TSC_ERRORS))
else
    log "${GREEN}No TypeScript errors${NC}"
    TSC_ERRORS=0
fi
TOTAL_ISSUES=$((TOTAL_ISSUES + TSC_ERRORS))

# ============================================================================
# 4. SECURITY SCANS - Custom Vulnerability Checks
# ============================================================================
log_header "4. SECURITY SCANS - Custom Vulnerability Checks"

# 4a. SQL Injection Check
log "${YELLOW}Checking for SQL injection vulnerabilities...${NC}"
SQL_ISSUES=$(grep -r "\.raw\|\.execute\|sql\`" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d '[:space:]')
SQL_ISSUES=${SQL_ISSUES:-0}
if [ "$SQL_ISSUES" -gt 0 ] 2>/dev/null; then
    log "${RED}  Potential raw SQL usage found: $SQL_ISSUES occurrences${NC}"
    grep -r "\.raw\|\.execute\|sql\`" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5 >> "$LOG_FILE"
else
    log "${GREEN}  No raw SQL queries detected${NC}"
    SQL_ISSUES=0
fi

# 4b. XSS Check (dangerouslySetInnerHTML)
log "${YELLOW}Checking for XSS vulnerabilities...${NC}"
XSS_ISSUES=$(grep -r "dangerouslySetInnerHTML\|innerHTML" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d '[:space:]')
XSS_ISSUES=${XSS_ISSUES:-0}
if [ "$XSS_ISSUES" -gt 0 ] 2>/dev/null; then
    log "${RED}  Potential XSS vectors found: $XSS_ISSUES occurrences${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + XSS_ISSUES))
else
    log "${GREEN}  No dangerouslySetInnerHTML usage detected${NC}"
    XSS_ISSUES=0
fi

# 4c. Eval Check
log "${YELLOW}Checking for eval() usage...${NC}"
EVAL_ISSUES=$(grep -r "\beval\b\|new Function(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d '[:space:]')
EVAL_ISSUES=${EVAL_ISSUES:-0}
if [ "$EVAL_ISSUES" -gt 0 ] 2>/dev/null; then
    log "${RED}  Dangerous eval() usage found: $EVAL_ISSUES occurrences${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + EVAL_ISSUES))
else
    log "${GREEN}  No eval() usage detected${NC}"
    EVAL_ISSUES=0
fi

# 4d. Hardcoded Secrets Check
log "${YELLOW}Checking for hardcoded secrets...${NC}"
SECRET_PATTERNS="password\s*=\s*['\"][^'\"]+['\"]|api_key\s*=\s*['\"][^'\"]+['\"]|secret\s*=\s*['\"][^'\"]+['\"]|token\s*=\s*['\"][A-Za-z0-9]"
SECRET_ISSUES=$(grep -riE "$SECRET_PATTERNS" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "process.env\|\.env\|example\|placeholder\|your-" | wc -l | tr -d '[:space:]')
SECRET_ISSUES=${SECRET_ISSUES:-0}
if [ "$SECRET_ISSUES" -gt 0 ] 2>/dev/null; then
    log "${RED}  Potential hardcoded secrets: $SECRET_ISSUES occurrences${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + SECRET_ISSUES))
else
    log "${GREEN}  No hardcoded secrets detected${NC}"
    SECRET_ISSUES=0
fi

# 4e. Open Redirect Check
log "${YELLOW}Checking for open redirect vulnerabilities...${NC}"
REDIRECT_ISSUES=$(grep -r "redirect.*req\.\|redirect.*param\|redirect.*query\|window.location\s*=\s*[^'\"]\|location.href\s*=\s*[^'\"]" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d '[:space:]')
REDIRECT_ISSUES=${REDIRECT_ISSUES:-0}
if [ "$REDIRECT_ISSUES" -gt 0 ] 2>/dev/null; then
    log "${YELLOW}  Potential open redirects: $REDIRECT_ISSUES (review manually)${NC}"
else
    log "${GREEN}  No obvious open redirects detected${NC}"
fi

# 4f. Service Role Key Check (Supabase)
log "${YELLOW}Checking for exposed service role keys...${NC}"
SERVICE_KEY_ISSUES=$(grep -r "service_role\|serviceRole\|SUPABASE_SERVICE" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules\|\.env" | wc -l | tr -d '[:space:]')
SERVICE_KEY_ISSUES=${SERVICE_KEY_ISSUES:-0}
if [ "$SERVICE_KEY_ISSUES" -gt 0 ] 2>/dev/null; then
    log "${RED}  Service role key references in code: $SERVICE_KEY_ISSUES${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + SERVICE_KEY_ISSUES))
else
    log "${GREEN}  No exposed service role keys${NC}"
    SERVICE_KEY_ISSUES=0
fi

TOTAL_ISSUES=$((TOTAL_ISSUES + SQL_ISSUES + XSS_ISSUES + EVAL_ISSUES + SECRET_ISSUES))

# ============================================================================
# 5. DEPENDENCY CHECK
# ============================================================================
log_header "5. DEPENDENCY CHECK - Unused Dependencies"

DEPCHECK_OUTPUT=$(npx depcheck --json 2>/dev/null || echo '{"dependencies":[],"devDependencies":[]}')
UNUSED_DEPS=$(strip_ansi "$(echo "$DEPCHECK_OUTPUT" | node -e "
const data = require('fs').readFileSync(0, 'utf8');
try {
    const json = JSON.parse(data);
    const deps = (json.dependencies || []).length;
    const devDeps = (json.devDependencies || []).length;
    console.log(deps + devDeps);
} catch(e) { console.log(0); }
" 2>/dev/null || echo "0")")

if [ "$UNUSED_DEPS" -gt 0 ]; then
    log "${YELLOW}Unused dependencies found: $UNUSED_DEPS${NC}"
else
    log "${GREEN}No unused dependencies${NC}"
fi

# ============================================================================
# SUMMARY
# ============================================================================
log_header "SUMMARY"

END_TIME=$(date)
log "Check completed: $END_TIME"
log ""
log "══════════════════════════════════════"
if [ "$CRITICAL_ISSUES" -gt 0 ]; then
    log "${RED}CRITICAL ISSUES: $CRITICAL_ISSUES${NC}"
else
    log "${GREEN}CRITICAL ISSUES: 0${NC}"
fi
log "TOTAL ISSUES: $TOTAL_ISSUES"
log "══════════════════════════════════════"
log ""
log "Full log: $LOG_FILE"

# Write summary file
cat > "$SUMMARY_FILE" << EOF
Last Security Check: $END_TIME
Critical Issues: $CRITICAL_ISSUES
Total Issues: $TOTAL_ISSUES
Log File: $LOG_FILE

Breakdown:
- npm audit critical/high: $((AUDIT_CRITICAL + AUDIT_HIGH))
- ESLint errors: $LINT_ERRORS
- TypeScript errors: $TSC_ERRORS
- Security scan issues: $((XSS_ISSUES + EVAL_ISSUES + SECRET_ISSUES + SERVICE_KEY_ISSUES))
EOF

# Cleanup old logs (keep last 30 days)
find "$LOG_DIR" -name "security-check_*.log" -mtime +30 -delete 2>/dev/null || true

# Exit with error if critical issues found
if [ "$CRITICAL_ISSUES" -gt 0 ]; then
    log "${RED}Security check failed with $CRITICAL_ISSUES critical issues!${NC}"
    exit 1
fi

log "${GREEN}Security check passed!${NC}"
exit 0

# Changelog

All notable changes to the Digital Labor project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] - 2024-03-24

### Security
- **Password Hashing**: Implemented bcrypt password hashing with backward compatibility for legacy plaintext passwords
- **Password Strength Validation**: Added validation requiring 8+ characters, uppercase, lowercase, and numbers
- **Login Failure Lockout**: Added account lockout after 5 failed login attempts for 5 minutes
- **Sensitive Data Encryption**: Ensured id_card, mobile, bank_card fields are encrypted at rest
- **SQL Injection Prevention**: Fixed IN clause parameter binding using `bindparam(expanding=True)`

### Performance
- **Database Indexes**: Added 35+ indexes to SQLite schema, 39+ indexes to PostgreSQL schema
  - Key indexes on: person(org_id, status, on_site, updated_at, job_title, work_no, face_verified, contract_signed)
  - Key indexes on: attendance(work_date, person_id, org_id)
  - Key indexes on: contract_instance(status, person_id, flow_id, signed_at)
  - Key indexes on: settlement(person_id, status, period_start, period_end)
  - Key indexes on: op_log(user_id, created_at, module)
  - Key indexes on: user(username, org_id, enabled)

### Features
- **Organization-based Data Scope**: Implemented `actor_org_id` filtering across all admin list endpoints
  - Uses recursive CTE to get organization tree
  - Applied to: person, contract, attendance, settlement, site services
- **Operation Audit Enhancement**: Added `op_log_with_diff()` function for recording data before/after snapshots
- **Electronic Signature Interface**: Created abstract `SignProvider` class with:
  - `PdfSignProvider` for local PDF signing (current implementation)
  - `EsignProvider` stub for future e签宝 integration
- **Batch Import Improvement**: Enhanced error handling with:
  - Detailed error messages per row
  - Error rows list for Excel export
  - `skip_errors` parameter to continue on errors

### Code Quality
- **Frontend TypeScript Types**: Created `web/lib/types/api.ts` with 28 interface definitions
- **Input Validation Utilities**: Created `server/digital_labor/utils/validation.py` with:
  - Phone number validation
  - ID card validation
  - Bank card validation
  - File extension/size validation
  - String sanitization utilities
- **Permission Utilities**: Created `server/digital_labor/utils/permission.py` with:
  - `get_org_tree_ids()` - recursive CTE for organization hierarchy
  - `build_in_clause()` - helper for IN clause construction
  - `apply_org_filter()` - reusable filter application

### Database Schema
- **op_log table**: Added `data_before` and `data_after` TEXT columns for audit snapshots
- **PostgreSQL Schema**: Synchronized with SQLite schema changes

### Documentation
- **CLAUDE.md**: Added comprehensive development workflow guidelines
  - Four-phase development process (Think & Plan, Quality & Safety, Verification, Ship & Reflect)
  - TDD requirements
  - Safety guards for dangerous operations
  - Verification requirements before completion
- **MEMORY.md**: Created persistent memory for cross-session context

### Configuration
- **settings.json**: Added hooks for:
  - Post-edit/write verification reminders
  - Pre-command safety guards for dangerous operations

---

## Previous Releases

See git commit history for changes before this changelog was established.

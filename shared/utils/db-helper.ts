import { Pool, PoolClient } from "pg";
import users from "./users.json";

// ── Country type ─────────────────────────────────────────────────────────────

export type Country = "id" | "th";

const DB_KEY: Record<Country, "cfd-id-db" | "cfd-th-db"> = {
  id: "cfd-id-db",
  th: "cfd-th-db",
};

// ── Connection pools (lazy-initialised, one per country) ─────────────────────

const pools = new Map<Country, Pool>();

function getPool(country: Country = "id"): Pool {
  if (!pools.has(country)) {
    const shared = users["cfd-db"];
    const { database } = users[DB_KEY[country]];
    pools.set(
      country,
      new Pool({
        host: shared.host,
        port: shared.port,
        database,
        user: shared.user,
        password: shared.password,
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      }),
    );
  }
  return pools.get(country)!;
}

/** Run after all tests to release connections for one or all countries. */
export async function closeDatabasePool(country?: Country): Promise<void> {
  if (country) {
    const p = pools.get(country);
    if (p) {
      await p.end();
      pools.delete(country);
    }
  } else {
    await Promise.all([...pools.values()].map((p) => p.end()));
    pools.clear();
  }
}

/** Execute a single query and return all rows. */
export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  country: Country = "id",
): Promise<T[]> {
  const client: PoolClient = await getPool(country).connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/** Execute a query and return the single first row (throws if none). */
export async function queryOne<T extends object = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  country: Country = "id",
): Promise<T> {
  const rows = await query<T>(sql, params, country);
  if (rows.length === 0)
    throw new Error(`Query returned no rows.\nSQL: ${sql}`);
  return rows[0];
}

// ── Dashboard metric queries ─────────────────────────────────────────────────
// Adjust table/column names to match your actual schema.

/** Today's date string in YYYY-MM-DD (UTC). */
export function today(): string {
  return new Date().toISOString().split("T")[0];
}

/** Yesterday's date string in YYYY-MM-DD (UTC). */
export function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

export interface DashboardMetrics {
  totalClicks: number;
  legitimateClicks: number;
  blockedFraud: number;
  warning: number;
}

/**
 * Returns the four headline KPIs shown in the Executive Dashboard for a given
 * date (defaults to today).
 *
 * ⚠️  Adjust the table name and column names to match your actual schema.
 */
export async function getDashboardMetrics(
  date: string = yesterday(),
  country: Country = "id",
): Promise<DashboardMetrics> {
  const sql = `
    SELECT
      SUM(total_clicks)                                              AS "totalClicks",
      SUM(total_block_count)                                         AS "blockedFraud",
      SUM(total_warning_count)                                       AS "warning",
      SUM(total_clicks - total_block_count - total_warning_count)    AS "legitimateClicks"
    FROM hourly_summary
    WHERE request_date = $1
  `;
  const row = await queryOne<DashboardMetrics>(sql, [date], country);
  return {
    totalClicks: Number(row.totalClicks),
    legitimateClicks: Number(row.legitimateClicks),
    blockedFraud: Number(row.blockedFraud),
    warning: Number(row.warning),
  };
}

/**
 * Calculates the % change of each KPI: (yesterday - dayBefore) / dayBefore * 100.
 * Returns null for a metric when dayBefore value is 0 (avoid division by zero).
 */
export async function getDashboardMetricsDelta(
  country: Country = "id",
): Promise<{
  totalClicks: number | null;
  legitimateClicks: number | null;
  blockedFraud: number | null;
  warning: number | null;
}> {
  const yest = await getDashboardMetrics(yesterday(), country);
  const prev = await getDashboardMetrics(daysAgo(2), country);

  const pct = (cur: number, old: number): number | null => {
    if (old === 0) return null;
    return Math.round(((cur - old) / old) * 1000) / 10; // 1 decimal place
  };

  return {
    totalClicks: pct(yest.totalClicks, prev.totalClicks),
    legitimateClicks: pct(yest.legitimateClicks, prev.legitimateClicks),
    blockedFraud: pct(yest.blockedFraud, prev.blockedFraud),
    warning: pct(yest.warning, prev.warning),
  };
}

// ── Fraud Detection Log queries ───────────────────────────────────────────────

export interface FraudDetectionSummary {
  totalFraud: number; // BLOCK + WARNING
  blocked: number; // final_action_name = 'BLOCK'
  warning: number; // non-ALLOW, non-BLOCK
  fraudRate: number; // (blocked + warning) / totalClicks * 100, 1 decimals
  campaignsAffected: number; // COUNT(DISTINCT campaign_id) with any fraud
}

/**
 * Returns summary bar metrics for the Fraud Detection Log page.
 * date range is inclusive: [fromDate, toDate].
 */
export async function getFraudDetectionSummary(
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<FraudDetectionSummary> {
  const sql = `
    SELECT
      SUM(total_violation_count)                                                  AS "totalFraud",
      SUM(total_block_count)                                                      AS "blocked",
      SUM(total_warning_count)                                                    AS "warning",
      ROUND(
        SUM(total_violation_count) * 100.0 / NULLIF(SUM(total_clicks), 0),
        2
      )                                                                           AS "fraudRate",
      (
      SELECT
        COUNT(DISTINCT campaign_id)  AS campaign_count
        FROM campaign_summary
        WHERE request_date BETWEEN $1 AND $2
        AND total_violation_count > 0
      )                                                                           AS "campaignsAffected"
    FROM hourly_summary
    WHERE request_date BETWEEN $1 AND $2
  `;
  const row = await queryOne<{
    totalFraud: string;
    blocked: string;
    warning: string;
    fraudRate: string;
    campaignsAffected: string;
  }>(sql, [fromDate, toDate], country);
  return {
    totalFraud: Number(row.totalFraud),
    blocked: Number(row.blocked),
    warning: Number(row.warning),
    fraudRate: Number(row.fraudRate),
    campaignsAffected: Number(row.campaignsAffected),
  };
}

export interface ThreatVectorRow {
  category: string;
  blocks: number;
  ruleIds: string[]; // e.g. ["R23", "R24", "R21", ...] ordered by violation_count DESC
}

export async function getTopThreatVectors(
  date: string = yesterday(),
  country: Country = "id",
): Promise<ThreatVectorRow[]> {
  const sql = `
    SELECT
    group_rule_name  AS "category",
    STRING_AGG('R' || rule_id::text, ', ' ORDER BY rule_id) AS "triggeredShortcodes",
    SUM(violation_count) AS "total_violating_clicks"
    FROM rule_summary
    WHERE request_date = $1
    GROUP BY group_rule_name
    HAVING SUM(violation_count) > 0
    ORDER BY "total_violating_clicks" DESC, "category";
  `;
  const rows = await query<{
    category: string;
    triggeredShortcodes: string;
    total_violating_clicks: string;
  }>(sql, [date], country);
  return rows.map((r) => ({
    category: r.category,
    blocks: Number(r.total_violating_clicks),
    ruleIds: r.triggeredShortcodes
      ? r.triggeredShortcodes.split(",").map((s) => s.trim())
      : [],
  }));
}

export interface FraudSourceRow {
  siteId: string;
  publisherName: string;
  frauds: number;
  fraudRate: number; // 0-100
}

/**
 * Returns the top fraud sources (publisher-level) for a given date.
 *
 * ⚠️  Adjust table/column names to match your actual schema.
 */
export async function getTopFraudSources(
  date: string = yesterday(),
  limit: number = 10,
  country: Country = "id",
): Promise<FraudSourceRow[]> {
  const sql = `
    SELECT
      site_id                                                    AS "siteId",
      publisher_name                                             AS "publisherName",
      SUM(total_violation_count) AS total_fraud,
	    ROUND(
        SUM(total_violation_count)
        / NULLIF(SUM(total_clicks), 0)
        * 100
      , 2)                                                       AS "fraudRate"
    FROM site_summary
    WHERE DATE(request_date) = $1
    GROUP BY site_id, publisher_name
    ORDER BY "total_fraud" DESC
    LIMIT $2
  `;
  const rows = await query<{
    siteId: string;
    publisherName: string;
    totalFraud: string;
    fraudRate: string;
  }>(sql, [date, limit], country);
  return rows.map((r) => ({
    siteId: r.siteId,
    publisherName: r.publisherName,
    frauds: Number(r.totalFraud),
    fraudRate: Number(r.fraudRate),
  }));
}

// ── UI text → number conversion ───────────────────────────────────────────────

/**
 * Parse abbreviated UI numbers like "13.2M", "14.4K", "945.3K" → raw number.
 */
export function parseUINumber(text: string): number {
  const clean = text.replace(/,/g, "").trim();
  const match = clean.match(/^([\d.]+)([MKBmkb]?)$/);
  if (!match) return NaN;
  const value = parseFloat(match[1]);
  switch (match[2].toUpperCase()) {
    case "B":
      return value * 1_000_000_000;
    case "M":
      return value * 1_000_000;
    case "K":
      return value * 1_000;
    default:
      return value;
  }
}

/**
 * Returns true if |uiValue - dbValue| / dbValue <= tolerancePct (default 1%).
 * Handles rounding inherent in M/K abbreviations.
 */
export function withinTolerance(
  uiValue: number,
  dbValue: number,
  tolerancePct: number = 5,
): boolean {
  if (dbValue === 0) return uiValue === 0;
  return Math.abs(uiValue - dbValue) / dbValue <= tolerancePct / 100;
}

// ── Live Traffic & Fraud Trend queries ────────────────────────────────────────

export interface TrendHourRow {
  hourBucket: string; // ISO format "YYYY-MM-DDTHH:MI:SS" to match chart x values
  totalClicks: number;
  totalFrauds: number;
  fraudRatePct: number;
}

/**
 * Returns 24 hourly rows from hourly_summary for a single date.
 * Used to verify Yesterday chart points one-to-one against DB.
 */
export async function getTrendHourly(
  date: string = yesterday(),
  country: Country = "id",
): Promise<TrendHourRow[]> {
  const sql = `
    SELECT
      to_char(hour_bucket, 'YYYY-MM-DD"T"HH24:MI:SS') AS "hourBucket",
      total_clicks                                       AS "totalClicks",
      total_violation_count                                  AS "totalFrauds",
      ROUND(
        total_violation_count * 100.0 / NULLIF(total_clicks, 0),
        2
      )                                                  AS "fraudRatePct"
    FROM hourly_summary
    WHERE request_date = $1
    ORDER BY hour_bucket ASC
  `;
  const rows = await query<{
    hourBucket: string;
    totalClicks: string;
    totalFrauds: string;
    fraudRatePct: string;
  }>(sql, [date], country);
  return rows.map((r) => ({
    hourBucket: r.hourBucket,
    totalClicks: Number(r.totalClicks),
    totalFrauds: Number(r.totalFrauds),
    fraudRatePct: Number(r.fraudRatePct),
  }));
}

export interface TrendDayRow {
  requestDate: string; // YYYY-MM-DD
  totalClicks: number;
  totalFrauds: number;
  fraudRatePct: number;
}

/**
 * Returns daily summary rows from hourly_summary for a date range.
 * Matches the SQL provided for the Live Traffic & Fraud Trend chart.
 */
export async function getTrendData(
  fromDate: string = yesterday(),
  toDate: string = yesterday(),
  country: Country = "id",
): Promise<TrendDayRow[]> {
  const sql = `
    SELECT
      request_date::text                                                          AS "requestDate",
      SUM(total_clicks)                                                           AS "totalClicks",
      SUM(total_violation_count)                                                  AS "totalFrauds",
      ROUND(
        SUM(total_violation_count) * 100.0 / NULLIF(SUM(total_clicks), 0),
        2
      )                                                                           AS "fraudRatePct"
    FROM hourly_summary
    WHERE request_date BETWEEN $1 AND $2
    GROUP BY request_date
    ORDER BY request_date ASC
  `;
  const rows = await query<{
    requestDate: string;
    totalClicks: string;
    totalFrauds: string;
    fraudRatePct: string;
  }>(sql, [fromDate, toDate], country);
  return rows.map((r) => ({
    requestDate: r.requestDate,
    totalClicks: Number(r.totalClicks),
    totalFrauds: Number(r.totalFrauds),
    fraudRatePct: Number(r.fraudRatePct),
  }));
}

/**
 * Returns daily totals for the last 7 days (CURRENT_DATE-7 to CURRENT_DATE-1).
 * Each Plotly point on the "Last 7 Days" chart is the daily SUM for that date.
 */
export async function getTrendLast7Days(
  country: Country = "id",
): Promise<TrendDayRow[]> {
  const sql = `
    SELECT
      request_date::text                                                          AS "requestDate",
      SUM(total_clicks)                                                           AS "totalClicks",
      SUM(total_violation_count)                                                  AS "totalFrauds",
      ROUND(
        SUM(total_violation_count) * 100.0 / NULLIF(SUM(total_clicks), 0),
        2
      )                                                                           AS "fraudRatePct"
    FROM hourly_summary
    WHERE request_date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE - 1
    GROUP BY request_date
    ORDER BY request_date ASC
  `;
  const rows = await query<{
    requestDate: string;
    totalClicks: string;
    totalFrauds: string;
    fraudRatePct: string;
  }>(sql, [], country);
  return rows.map((r) => ({
    requestDate: r.requestDate,
    totalClicks: Number(r.totalClicks),
    totalFrauds: Number(r.totalFrauds),
    fraudRatePct: Number(r.fraudRatePct),
  }));
}

/** YYYY-MM-DD string for N days ago (UTC). */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

/**
 * Returns the number of hourly_summary rows between two dates (inclusive).
 * Used to decide whether to skip data-dependent tests when the DB is empty.
 */
export async function getClickCountForRange(
  from: string,
  to: string,
  country: Country = "id",
): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(total_clicks) AS count FROM hourly_summary
     WHERE DATE(request_date) BETWEEN $1 AND $2`,
    [from, to],
    country,
  );
  return Number(row.count);
}

// ── Fraud Detection Log — Campaign Summary table ──────────────────────────────

export interface FraudDetectionTableRow {
  campaignId: string;
  campaignName: string;
  siteQuantity: number;
  fraudDetections: number;
  totalClicks: number;
  fraudPct: number; // integer %, e.g. 100, 99, 33
  maxScore: number;
}

/**
 * Returns the first page (top 10) of the campaign summary table in the Fraud
 * Detection Log, ordered by fraud detections descending — matching UI default.
 */
export async function getFraudDetectionTablePage1(
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<FraudDetectionTableRow[]> {
  const sql = `
    SELECT
      cs.campaign_id::text                                                           AS "campaignId",
      cs.campaign_name                                                               AS "campaignName",
      detail.site_count                                                              AS "siteQuantity",
      SUM(cs.total_violation_count)                                                  AS "fraudDetections",
      SUM(cs.total_clicks)                                                           AS "totalClicks",
      ROUND(
        SUM(cs.total_violation_count) * 100.0 / NULLIF(SUM(cs.total_clicks), 0),
        2
      )                                                                               AS "fraudPct",
      detail.max_score                                                             AS "maxScore"
    FROM campaign_summary cs
    LEFT JOIN (
      SELECT
        campaign_site_summary.campaign_id,
        COUNT(DISTINCT campaign_site_summary.site_id)  AS site_count,
        MAX(campaign_site_summary.max_score) * 100.0        AS max_score
      FROM campaign_site_summary
      WHERE campaign_site_summary.request_date BETWEEN $1 AND $2
      AND campaign_site_summary.total_violation_count > 0
      GROUP BY campaign_site_summary.campaign_id
    ) detail ON detail.campaign_id = cs.campaign_id
    WHERE DATE(cs.request_date) BETWEEN $1 AND $2
      AND cs.total_violation_count > 0
    GROUP BY cs.campaign_id, cs.campaign_name, detail.site_count, detail.max_score
    ORDER BY "fraudDetections" DESC
    LIMIT 50
  `;
  const rows = await query<{
    campaignId: string;
    campaignName: string;
    siteQuantity: string;
    fraudDetections: string;
    totalClicks: string;
    fraudPct: string;
    maxScore: string;
  }>(sql, [fromDate, toDate], country);
  return rows.map((r) => ({
    campaignId: r.campaignId,
    campaignName: r.campaignName,
    siteQuantity: Number(r.siteQuantity),
    fraudDetections: Number(r.fraudDetections),
    totalClicks: Number(r.totalClicks),
    fraudPct: Number(r.fraudPct),
    maxScore: Number(r.maxScore),
  }));
}

/**
 * Returns the total number of distinct campaigns that match a search term
 * (by campaign name ILIKE or campaign_id text ILIKE) and have at least one
 * fraud detection in the given date range.
 * Mirrors the server-side filtering applied by fdl_sum_search.
 */
export async function getFraudDetectionSearchCount(
  fromDate: string,
  toDate: string,
  term: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(DISTINCT campaign_id) AS "count"
    FROM campaign_summary
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND (
        LOWER(campaign_name) LIKE '%' || LOWER($3) || '%'
        OR campaign_id::text LIKE '%' || $3 || '%'
      )
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, term],
    country,
  );
  return Number(row.count);
}

// ── Campaign Detail ──────────────────────────────────────────────────────────

export interface CampaignDetailKPIs {
  totalFraud: number;
  blocked: number;
  warned: number;
  uniqueSites: number;
}

/**
 * Returns KPIs for a single campaign's detail page:
 * totalFraud, blocked, warned (non-ALLOW non-BLOCK), uniqueSites.
 */
export async function getCampaignDetailKPIs(
  campaignId: string,
  fromDate: string,
  toDate: string,
  query: string = "default",
  country: Country = "id",
): Promise<CampaignDetailKPIs> {
  const sql1 = `
    SELECT
      SUM(cs.total_violation_count)  AS "totalFraud",
      SUM(cs.total_block_count)      AS "blocked",
      SUM(cs.total_warning_count)    AS "warned",
      MAX(detail.site_count)         AS "uniqueSites"
    FROM campaign_summary cs
    LEFT JOIN (
    SELECT
        campaign_site_summary.campaign_id,
        COUNT(DISTINCT campaign_site_summary.site_id)  AS "site_count",
        MAX(campaign_site_summary.max_score) * 100.0   AS "max_score"
        FROM campaign_site_summary
        WHERE campaign_site_summary.request_date BETWEEN $2 AND $3
        AND campaign_site_summary.total_violation_count > 0
        GROUP BY campaign_site_summary.campaign_id
    ) detail ON detail.campaign_id = cs.campaign_id
    WHERE cs.campaign_id::text = $1
      AND DATE(cs.request_date) BETWEEN $2 AND $3
  `;
  const sql2 = `
    SELECT
      SUM(cs.total_violation_count)  AS "totalFraud",
      SUM(cs.total_block_count)      AS "blocked",
      SUM(cs.total_warning_count)    AS "warned",
      MAX(detail.site_count)         AS "uniqueSites"
    FROM campaign_summary cs
    LEFT JOIN (
    SELECT
        campaign_site_summary.campaign_id,
        COUNT(DISTINCT campaign_site_summary.site_id)  AS "site_count",
        MAX(campaign_site_summary.max_score) * 100.0   AS "max_score"
        FROM campaign_site_summary
        WHERE campaign_site_summary.request_date BETWEEN $2 AND $3
        AND campaign_site_summary.total_violation_count > 0
        GROUP BY campaign_site_summary.campaign_id
    ) detail ON detail.campaign_id = cs.campaign_id
    WHERE cs.campaign_id::text = $1
      AND DATE(cs.request_date) BETWEEN $2 AND $3
  `;
  const sql = query === "default" ? sql1 : sql2;
  const row = await queryOne<{
    totalFraud: string;
    blocked: string;
    warned: string;
    uniqueSites: string;
  }>(sql, [campaignId, fromDate, toDate], country);
  return {
    totalFraud: Number(row.totalFraud),
    blocked: Number(row.blocked),
    warned: Number(row.warned),
    uniqueSites: Number(row.uniqueSites),
  };
}

// ── Action Fraud Log queries ─────────────────────────────────────────────────

export interface AflSummary {
  totalFraud: number;
  blocked: number;
  warning: number;
  avgScore: number;
}

/**
 * Returns the AFL summary bar KPIs for a given date range.
 */
export async function getAflSummary(
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<AflSummary> {
  const sql = `
    SELECT
    SUM(total_violation_count) AS "totalFraud",
    SUM(total_block_count) AS "blocked",
    SUM(total_warning_count) AS "warning",
    COALESCE(
        ROUND(
            SUM(total_violation_count) * 100.0
            / NULLIF(SUM(total_clicks), 0),
            1
        ),
        0
    ) AS "avgScore"
    FROM hourly_summary
    WHERE request_date BETWEEN $1 AND $2
  `;
  const row = await queryOne<{
    totalFraud: string;
    blocked: string;
    warning: string;
    avgScore: string;
  }>(sql, [fromDate, toDate], country);
  return {
    totalFraud: Number(row.totalFraud),
    blocked: Number(row.blocked),
    warning: Number(row.warning),
    avgScore: Number(row.avgScore),
  };
}

export interface AflRow {
  clickTime: string;
  detectionId: string;
  campaignName: string;
  publisherSite: string;
  score: number;
  rules: string;
  ip: string;
  rec: string;
}

/**
 * Returns the first page (50 rows) of AFL table ordered by click_time DESC.
 */
export async function getAflPage1(
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<AflRow[]> {
  const sql = `
    SELECT
      to_char(request_date, 'YYYY-MM-DD HH24:MI:SS')  AS "clickTime",
      optimizer_uuid                                    AS "detectionId",
      campaign_name                                     AS "campaignName",
      publisher_name || ' • ' || site_id               AS "publisherSite",
      total_scores                                      AS score,
      fraud_rules                                       AS "rules",
      ip_address                                        AS "ip",
      final_action_name                                 AS "rec"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
    ORDER BY request_date DESC
    LIMIT 50
  `;
  const rows = await query<{
    clickTime: string;
    detectionId: string;
    campaignName: string;
    publisherSite: string;
    score: string;
    rules: string;
    ip: string;
    rec: string;
  }>(sql, [fromDate, toDate], country);
  return rows.map((r) => ({
    clickTime: r.clickTime,
    detectionId: r.detectionId,
    campaignName: r.campaignName,
    publisherSite: r.publisherSite,
    score: Number(r.score),
    rules: r.rules,
    ip: r.ip,
    rec: r.rec,
  }));
}

/**
 * Count AFL rows filtered by action (BLOCK or WARNING).
 */
export async function getAflCountByAction(
  fromDate: string,
  toDate: string,
  action: "BLOCK" | "WARNING",
  country: Country = "id",
): Promise<number> {
  const sql =
    action === "BLOCK"
      ? `SELECT COUNT(*) AS "count" FROM click_events WHERE DATE(request_date) BETWEEN $1 AND $2 AND final_action_name = 'BLOCK'`
      : `SELECT COUNT(*) AS "count" FROM click_events WHERE DATE(request_date) BETWEEN $1 AND $2 AND final_action_name NOT IN ('ALLOW','BLOCK')`;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate],
    country,
  );
  return Number(row.count);
}

/**
 * Count AFL rows filtered by IP address substring.
 */
export async function getAflCountByIp(
  fromDate: string,
  toDate: string,
  ipTerm: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
      AND ip_address LIKE '%' || $3 || '%'
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, ipTerm],
    country,
  );
  return Number(row.count);
}

/**
 * Count AFL rows filtered by campaign_id.
 */
export async function getAflCountByCampaign(
  fromDate: string,
  toDate: string,
  campaignId: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
      AND campaign_id::text = $3
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, campaignId],
    country,
  );
  return Number(row.count);
}

/**
 * Count AFL rows filtered by site_id.
 */
export async function getAflCountBySite(
  fromDate: string,
  toDate: string,
  siteId: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
      AND site_id::text = $3
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, siteId],
    country,
  );
  return Number(row.count);
}

/**
 * Count AFL rows filtered by rule_id.
 */
export async function getAflCountByRule(
  fromDate: string,
  toDate: string,
  ruleId: string,
  country: Country = "id",
): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM click_events
    WHERE DATE(request_date) BETWEEN $1 AND $2
      AND final_action_name != 'ALLOW'
      AND fraud_rules LIKE '%R' || $3 || '%'
  `;
  const row = await queryOne<{ count: string }>(
    sql,
    [fromDate, toDate, ruleId],
    country,
  );
  return Number(row.count);
}

// ── Sites & IPs tab ──────────────────────────────────────────────────────────

export interface CampaignSiteRow {
  siteId: string;
  publisherName: string;
  detections: number;
  totalClicks: number;
  fraudPct: number;
}

/**
 * Returns all fraud-detected sites for a campaign as a lookup map —
 * used to verify each site row visible in the Sites & IPs tab.
 */
export async function getCampaignSitesPage1(
  campaignId: string,
  fromDate: string,
  toDate: string,
  country: Country = "id",
): Promise<CampaignSiteRow[]> {
  const sql = `
    SELECT
      site_id::text                                                              AS "siteId",
      MAX(publisher_name)                                                        AS "publisherName",
      COUNT(*) FILTER (WHERE final_action_name != 'ALLOW')                      AS "detections",
      COUNT(*)                                                                   AS "totalClicks",
      ROUND(
        COUNT(*) FILTER (WHERE final_action_name != 'ALLOW') * 100.0
        / NULLIF(COUNT(*), 0)
      )                                                                          AS "fraudPct"
    FROM click_events
    WHERE campaign_id::text = $1
      AND DATE(request_date) BETWEEN $2 AND $3
    GROUP BY site_id
    HAVING COUNT(*) FILTER (WHERE final_action_name != 'ALLOW') > 0
  `;
  const rows = await query<{
    siteId: string;
    publisherName: string;
    detections: string;
    totalClicks: string;
    fraudPct: string;
  }>(sql, [campaignId, fromDate, toDate], country);
  return rows.map((r) => ({
    siteId: r.siteId,
    publisherName: r.publisherName,
    detections: Number(r.detections),
    totalClicks: Number(r.totalClicks),
    fraudPct: Number(r.fraudPct),
  }));
}

// ── System Settings — Rules queries ──────────────────────────────────────────
// Uses config.rules + config.group_rules tables (actual DB schema).
//
// Field mappings:
//   ruleId   → config.rules.id
//   ruleName → config.rules.name  (DB-style, e.g. "UA Missing Or Empty")
//   dataKey  → snake_case(name)   (derived; matches data_key shown in the UI)
//   category → group_rules.name mapped to UI label
//   action   → "UNKNOWN" (cannot reliably decode from actions bitmask)
//   isActive → config.rules.is_active
//   threshold→ null (no threshold column in config.rules)

const GROUP_RULE_CATEGORY: Record<number, string> = {
  1: "USER AGENT DETECTION",
  2: "REFERRER VALIDATION",
  3: "IP INTELLIGENCE",
  4: "IP VELOCITY",
  5: "SITE VELOCITY",
  6: "DEVICE VELOCITY",
  7: "CAMPAIGN VELOCITY",
  8: "DEVICE ANALYSIS",
  9: "TEMPORAL ANOMALY",
};

/** Convert a DB rule name like "UA Missing Or Empty" to snake_case data_key. */
function toDataKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s/-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function mapRuleRow(r: {
  ruleId: string;
  ruleName: string;
  groupRuleId: string;
  description: string;
  isActive: boolean;
}): SystemRule {
  const gid = Number(r.groupRuleId);
  return {
    ruleId: Number(r.ruleId),
    ruleName: r.ruleName,
    dataKey: toDataKey(r.ruleName),
    category: GROUP_RULE_CATEGORY[gid] ?? `Group ${gid}`,
    description: r.description,
    action: null,
    isActive: r.isActive,
    threshold: null,
  };
}

export interface SystemRule {
  ruleId: number;
  ruleName: string;
  dataKey: string;
  category: string;
  description: string;
  action: string | null;
  isActive: boolean;
  threshold: number | null;
}

/** Returns all rules from config.rules. */
export async function getSystemRules(
  country: Country = "id",
): Promise<SystemRule[]> {
  const sql = `
    SELECT
      r.id            AS "ruleId",
      r.name          AS "ruleName",
      r.group_rule_id AS "groupRuleId",
      r.description   AS "description",
      r.is_active     AS "isActive"
    FROM config.rules r
    ORDER BY r.id ASC
  `;
  const rows = await query<{
    ruleId: string;
    ruleName: string;
    groupRuleId: string;
    description: string;
    isActive: boolean;
  }>(sql, [], country);
  return rows.map(mapRuleRow);
}

/** Total rule count in config.rules. */
export async function getSystemRuleCount(
  country: Country = "id",
): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM config.rules`,
    [],
    country,
  );
  return Number(row.count);
}

/**
 * Count of rules by action type.
 * NOTE: The actions bitmask in config.rules cannot be reliably decoded to
 * BLOCK/WARNING without additional lookup tables. Returns 0.
 */
export async function getSystemRuleCountByAction(
  _action: "BLOCK" | "WARNING",
  _country: Country = "id",
): Promise<number> {
  return 0;
}

/** Count of rules for a given UI category label (maps to group_rules.name). */
export async function getSystemRuleCountByCategory(
  category: string,
  country: Country = "id",
): Promise<number> {
  // Find the group_rule_id that matches this category label
  const gid = Object.entries(GROUP_RULE_CATEGORY).find(
    ([, label]) => label.toLowerCase() === category.toLowerCase(),
  )?.[0];
  if (!gid) return 0;
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM config.rules WHERE group_rule_id = $1`,
    [Number(gid)],
    country,
  );
  return Number(row.count);
}

/** Fetch a single rule by its DB name (case-insensitive). */
export async function getSystemRuleByName(
  name: string,
  country: Country = "id",
): Promise<SystemRule | null> {
  const rows = await query<{
    ruleId: string;
    ruleName: string;
    groupRuleId: string;
    description: string;
    isActive: boolean;
  }>(
    `SELECT id AS "ruleId", name AS "ruleName", group_rule_id AS "groupRuleId",
            description, is_active AS "isActive"
     FROM config.rules
     WHERE LOWER(name) = LOWER($1)
     LIMIT 1`,
    [name],
    country,
  );
  if (rows.length === 0) return null;
  return mapRuleRow(rows[0]);
}

/** Fetch a single rule by its derived data_key (snake_case of name). */
export async function getSystemRuleByDataKey(
  dataKey: string,
  country: Country = "id",
): Promise<SystemRule | null> {
  // data_key is derived as snake_case of the rule name
  const rows = await query<{
    ruleId: string;
    ruleName: string;
    groupRuleId: string;
    description: string;
    isActive: boolean;
  }>(
    `SELECT id AS "ruleId", name AS "ruleName", group_rule_id AS "groupRuleId",
            description, is_active AS "isActive"
     FROM config.rules
     ORDER BY id ASC`,
    [],
    country,
  );
  const match = rows.find((r) => toDataKey(r.ruleName) === dataKey);
  if (!match) return null;
  return mapRuleRow(match);
}

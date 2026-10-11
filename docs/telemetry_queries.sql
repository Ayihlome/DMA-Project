-- Analysis queries for the StockMate evaluation.
--
-- Run these in the Supabase SQL editor. Each one reads public.telemetry_events,
-- which the app writes through the client (see src/lib/telemetry.ts). RLS limits
-- an ordinary signed-in user to their own rows; run them as the project owner in
-- the dashboard to see every participant.
--
-- Event types used below:
--   sale_started    - the owner put the first item in an empty cart
--   sale_confirmed   - the sale was accepted; data->>'duration_ms' is the time
--                      from sale_started to confirmation
--   deduction_check  - one row per ingredient per sale, comparing the stock
--                      change the recipe predicted with the change actually
--                      applied; data->>'match' is 'true' or 'false'


-- ---------------------------------------------------------------------------
-- 1. How long does recording a sale take? (mean and standard deviation)
-- ---------------------------------------------------------------------------
-- Sub-second values are the interesting ones: the proposal's claim is that a
-- sale can be logged faster than writing it in a paper book.
select
  count(*)                                              as sales_measured,
  round(avg((data ->> 'duration_ms')::numeric) / 1000.0, 2) as mean_seconds,
  round(stddev_samp((data ->> 'duration_ms')::numeric) / 1000.0, 2) as sd_seconds,
  round(min((data ->> 'duration_ms')::numeric) / 1000.0, 2) as fastest_seconds,
  round(max((data ->> 'duration_ms')::numeric) / 1000.0, 2) as slowest_seconds
from public.telemetry_events
where type = 'sale_confirmed'
  and data ? 'duration_ms';


-- ---------------------------------------------------------------------------
-- 2. Median and 95th percentile sale duration
-- ---------------------------------------------------------------------------
-- The mean alone hides the long tail; a single interrupted sale can skew it.
select
  round(percentile_cont(0.5) within group (
    order by (data ->> 'duration_ms')::numeric
  ) / 1000.0, 2) as median_seconds,
  round(percentile_cont(0.95) within group (
    order by (data ->> 'duration_ms')::numeric
  ) / 1000.0, 2) as p95_seconds
from public.telemetry_events
where type = 'sale_confirmed'
  and data ? 'duration_ms';


-- ---------------------------------------------------------------------------
-- 3. Deduction accuracy: did stock change by exactly what the recipe predicted?
-- ---------------------------------------------------------------------------
-- This is the headline correctness number for BR1 (composite deduction).
-- Anything below 100% means a sale deducted the wrong amount somewhere.
select
  count(*)                                                     as checks,
  count(*) filter (where data ->> 'match' = 'true')            as matched,
  count(*) filter (where data ->> 'match' = 'false')           as mismatched,
  round(
    100.0 * count(*) filter (where data ->> 'match' = 'true')
    / nullif(count(*), 0),
    2
  )                                                            as accuracy_pct
from public.telemetry_events
where type = 'deduction_check';


-- ---------------------------------------------------------------------------
-- 4. Every mismatch, so a failure can actually be traced
-- ---------------------------------------------------------------------------
select
  created_at,
  data ->> 'productId'  as product,
  data ->> 'expected'   as expected_change,
  data ->> 'actual'     as actual_change,
  data ->> 'saleId'     as sale_id
from public.telemetry_events
where type = 'deduction_check'
  and data ->> 'match' = 'false'
order by created_at desc;


-- ---------------------------------------------------------------------------
-- 5. Accuracy per ingredient, to spot one bad recipe
-- ---------------------------------------------------------------------------
select
  data ->> 'productId' as product,
  count(*)             as checks,
  round(
    100.0 * count(*) filter (where data ->> 'match' = 'true')
    / nullif(count(*), 0),
    2
  )                    as accuracy_pct
from public.telemetry_events
where type = 'deduction_check'
group by data ->> 'productId'
having count(*) filter (where data ->> 'match' = 'false') > 0
order by accuracy_pct asc;


-- ---------------------------------------------------------------------------
-- 6. Abandoned sales: started but never confirmed
-- ---------------------------------------------------------------------------
-- A high rate here would suggest the sell flow is confusing, which matters for
-- the usability claim even though no sale was recorded.
select
  count(*) filter (where type = 'sale_started')   as started,
  count(*) filter (where type = 'sale_confirmed') as confirmed,
  count(*) filter (where type = 'sale_started')
    - count(*) filter (where type = 'sale_confirmed') as abandoned
from public.telemetry_events
where type in ('sale_started', 'sale_confirmed');


-- ---------------------------------------------------------------------------
-- 7. Daily usage, to show the app was actually used over the study period
-- ---------------------------------------------------------------------------
select
  date_trunc('day', created_at)::date              as day,
  count(*) filter (where type = 'sale_confirmed')  as sales,
  count(distinct owner_id)                         as active_owners
from public.telemetry_events
group by 1
order by 1;

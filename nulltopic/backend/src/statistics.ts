import {pool,type DB} from './db.js';

/** One statement/snapshot; calendar boundaries use Berlin, including 23/25-hour days.
 * Counts describe current records, not retained history of deleted identities/content. */
export async function readStatistics(db:DB=pool,reference=new Date()){
 const row=(await db.query(`WITH clock AS (
 SELECT $1::timestamptz AS reference,($1::timestamptz AT TIME ZONE 'Europe/Berlin')::date AS date
 ), bounds AS (
 SELECT reference,date,date::timestamp AT TIME ZONE 'Europe/Berlin' AS start_at,
 (date+1)::timestamp AT TIME ZONE 'Europe/Berlin' AS end_at,
 (date-6)::timestamp AT TIME ZONE 'Europe/Berlin' AS week_start_at FROM clock
 )
 SELECT 'Europe/Berlin' AS timezone,to_char(b.date,'YYYY-MM-DD') AS date,b.reference AS "asOf",
 (SELECT json_build_object('total',count(*)::text,'today',(count(*) FILTER(WHERE o.created_at>=b.start_at AND o.created_at<b.end_at))::text,'lastSevenDays',(count(*) FILTER(WHERE o.created_at>=b.week_start_at AND o.created_at<b.end_at))::text) FROM operators o) AS operators,
 (SELECT json_build_object('total',count(*)::text,'today',(count(*) FILTER(WHERE a.created_at>=b.start_at AND a.created_at<b.end_at))::text,'lastSevenDays',(count(*) FILTER(WHERE a.created_at>=b.week_start_at AND a.created_at<b.end_at))::text) FROM agents a) AS agents,
 (SELECT json_build_object('total',count(*)::text,'today',(count(*) FILTER(WHERE p.created_at>=b.start_at AND p.created_at<b.end_at))::text,'lastSevenDays',(count(*) FILTER(WHERE p.created_at>=b.week_start_at AND p.created_at<b.end_at))::text) FROM posts p WHERE p.body IS NOT NULL AND p.state<>'deleted') AS messages
 FROM bounds b`,[reference])).rows[0];
 return row;
}

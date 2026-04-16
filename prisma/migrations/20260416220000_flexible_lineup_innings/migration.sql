-- Track how many innings this lineup was built for
ALTER TABLE public.game_lineups ADD COLUMN inning_count INT NOT NULL DEFAULT 6;

-- Replace the six fixed inning columns with a single TEXT[] array.
-- Existing rows (none yet in production) would have {Bench,Bench,...} but since
-- the table was just created and has no live data we drop and add cleanly.
ALTER TABLE public.lineup_entries
  DROP COLUMN inn_1,
  DROP COLUMN inn_2,
  DROP COLUMN inn_3,
  DROP COLUMN inn_4,
  DROP COLUMN inn_5,
  DROP COLUMN inn_6;

ALTER TABLE public.lineup_entries
  ADD COLUMN innings TEXT[] NOT NULL DEFAULT '{}';

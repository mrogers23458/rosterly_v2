-- Make date_of_birth optional — GameChanger exports don't include it
ALTER TABLE public.players ALTER COLUMN date_of_birth DROP NOT NULL;

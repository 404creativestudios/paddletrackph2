-- Add new fields to practice_lobbies for scheduling feature
ALTER TABLE practice_lobbies 
ADD COLUMN is_scheduled boolean DEFAULT false,
ADD COLUMN scheduled_datetime timestamp with time zone;
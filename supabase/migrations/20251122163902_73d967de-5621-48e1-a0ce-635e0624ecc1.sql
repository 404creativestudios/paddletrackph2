-- Add self_assessed_level field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN self_assessed_level text;
-- Gives the rounds of the KNVB Beker one spelling (#1397): in words and in the singular, `Derde ronde` and `Achtste finale`, where the pages of Wikipedia wrote `3e ronde` and `Achtste finales`.
-- A season has one round of each name, so the key (season, competition, round) stays unique. Only the cup is touched, and a round that is already right is left as it is.
-- The statement can run again.
-- To undo it on the host: there is no way back to the mixed spellings; the next import of the season writes the names the importer has.
UPDATE `matches` SET `round` = CASE `round`
  WHEN '1e ronde' THEN 'Eerste ronde'
  WHEN '2e ronde' THEN 'Tweede ronde'
  WHEN '3e ronde' THEN 'Derde ronde'
  WHEN '4e ronde' THEN 'Vierde ronde'
  WHEN 'Achtste finales' THEN 'Achtste finale'
  WHEN 'Kwartfinales' THEN 'Kwartfinale'
  WHEN 'Halve finales' THEN 'Halve finale'
  ELSE `round`
END WHERE `competition` = 'KNVB Beker' AND `round` IN ('1e ronde', '2e ronde', '3e ronde', '4e ronde', 'Achtste finales', 'Kwartfinales', 'Halve finales');

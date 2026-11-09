-- Lets one Wikipedia page have a row for each kind it is read as: the key of `wikipedia_pages` becomes the title with the kind. The page of the club's season of 2008/09 holds the squad and the league matches, and each import keeps its own row for the credit.
-- The statement can run again: it drops the key and adds the new one in one step, so a second run leaves the same key.
ALTER TABLE `wikipedia_pages` DROP PRIMARY KEY, ADD PRIMARY KEY(`title`,`kind`);

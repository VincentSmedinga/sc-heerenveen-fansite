// One spelling for a person the old editors typed in more than one way. The names of the
// opponents are free text in the line-ups and the events, so `Dirk Kuijt` and `Dirk Kuyt` would
// be two players. The owner decided the first spellings below; the others are the spelling of
// the article on nl.wikipedia (en.wikipedia where nl has none), for a typo or a spelling of the
// same person. `Erwin Koen` is not one of them: he and Erwin Koeman are both in the line-up of
// the same match. Any other near-duplicate stays as it is and is listed by the check report
// (`old-site-name-clusters.ts`) for the owner to decide.
// A name of a player of ours comes from the old table `speler` or from a code, and goes through
// the same corrections (`resolveOldSiteCode`), so the step `spelers` finds a player who is in
// `players` already from another source, such as the squad of Wikipedia, and adds no other.

/** The spelling the editors typed, and the one spelling it becomes. */
export const oldSiteNameCorrections: ReadonlyMap<string, string> = new Map([
  ['Abdelkrim el Hadrioui', 'Abdelkrim El Hadrioui'],
  ['Ali Bouassaboun', 'Ali Boussaboun'],
  ['Ali Elkhattabi', 'Ali El Khattabi'],
  ['Andre Bergdølmo', 'André Bergdølmo'],
  ['Andwelé Slory', 'Andwélé Slory'],
  ['Arno Slot', 'Arne Slot'],
  ['Bart van den Eede', 'Bart Van Den Eede'],
  ['Bernhard Schuiteman', 'Bernard Schuiteman'],
  ['Bjorn Daelemans', 'Björn Daelemans'],
  ['Charly van den Ouweland', 'Charlie van den Ouweland'],
  ['Czaba Fehér', 'Csaba Fehér'],
  ['DaMarcus Beasly', 'DaMarcus Beasley'],
  ['Danny Guyt', 'Danny Guijt'],
  ['David Bystron', 'David Bystroň'],
  ['David Bystroò', 'David Bystroň'],
  ['Dirk-Jan Derksen', 'Dirk Jan Derksen'],
  ['Dirk Kuyt', 'Dirk Kuijt'],
  ['Edward Linksens', 'Edward Linskens'],
  ['Edwin van de Looi', 'Erwin van de Looi'],
  ['Ervin Lee', 'Urvin Lee'],
  ['Étienne Shew-Atjon', 'Etienne Shew-Atjon'],
  ['Fernando Picun', 'Fernando Picún'],
  ['Frantisek Metelka', 'František Metelka'],
  ['Frantisek Rajtoral', 'František Rajtoral'],
  ['Gábor Bábos', 'Gábor Babos'],
  ['Georgi Gakhokidze', 'Giorgi Gakhokidze'],
  ['Ger Schaap', 'Gerrie Schaap'],
  ['Gorgi Gakhokidze', 'Giorgi Gakhokidze'],
  ['Guilliano Grot', 'Guillano Grot'],
  ['Hazem Eman', 'Hazem Emam'],
  ['Hennie Meijer', 'Henny Meijer'],
  ['Henri van der Vegt', 'Henry van der Vegt'],
  ['Heurelho da Silva Gomes', 'Heurelho Gomes'],
  ['Hossam Ghali', 'Hossam Ghaly'],
  ['Houssine Bezzai', 'Houssin Bezzai'],
  ['Humphery Rudge', 'Humphrey Rudge'],
  ['Humprey Rudge', 'Humphrey Rudge'],
  ['Igor Kornejev', 'Igor Korneev'],
  ['Istvan Széker', 'István Szekér'],
  ['Ivan Tzvekov', 'Ivan Tsvetkov'],
  ['Ivan Tzvetkov', 'Ivan Tsvetkov'],
  ['Jan-Willem van Ede', 'Jan Willem van Ede'],
  ['Jan Paul Saeijs', 'Jan-Paul Saeijs'],
  ['Jattoo Ceesay', 'Jatto Ceesay'],
  ['Jean Paul de Jong', 'Jean-Paul de Jong'],
  ['Jeffery de Visscher', 'Jeffrey de Visscher'],
  ['Jimmy van Fessem', 'Jim van Fessem'],
  ['Johnny Heitinga', 'John Heitinga'],
  ['John van de Brom', 'John van den Brom'],
  ['Joris Matthijsen', 'Joris Mathijsen'],
  ['José Fortes Rodriquez', 'José Fortes Rodriguez'],
  ['Jurgen Colin', 'Jürgen Colin'],
  ['Jurgen Dirckx', 'Jürgen Dirkx'],
  ['Jürgen Dirckx', 'Jürgen Dirkx'],
  ['Jürgen Streppel', 'Jurgen Streppel'],
  ['Kemy Augustien', 'Kemy Agustien'],
  ['Kenan Durmusoglo', 'Kenan Durmuşoğlu'],
  ['Kenan Durmusoglu', 'Kenan Durmuşoğlu'],
  ['Kennedy Bakircioglu', 'Kennedy Bakırcıoğlu'],
  ['Kennedy Bakircioglü', 'Kennedy Bakırcıoğlu'],
  ['Kew Jalilens', 'Kew Jaliens'],
  ['Klaas Jan Huntelaar', 'Klaas-Jan Huntelaar'],
  ['Krzystof Bociek', 'Krzysztof Bociek'],
  ['Lee-Roy Echteld', 'Leeroy Echteld'],
  ['Leonhard van Utrecht', 'Leonard van Utrecht'],
  ['Léon Hutten', 'Leon Hutten'],
  ['Lody Rumbiak', 'Lody Roembiak'],
  ['Lukas Magera', 'Lukáš Magera'],
  ['Magno Mocelín', 'Magno Mocelin'],
  ['Marc Luijpers', 'Mark Luijpers'],
  ['Mark Jan Fledderus', 'Mark-Jan Fledderus'],
  ['Mark Latupeirissa', 'Marc Latupeirissa'],
  ['Mark Luypers', 'Mark Luijpers'],
  ['Mark Nygaard', 'Marc Nygaard'],
  ['Maros Klimpl', 'Maroš Klimpl'],
  ['Martin Cizek', 'Martin Čížek'],
  ['Martin Èížek', 'Martin Čížek'],
  ['Martin Raska', 'Martin Raška'],
  ['Matthieu Assou-Ekotto', 'Mathieu Assou-Ekotto'],
  ['Milan Berck-Beelenkamp', 'Milan Berck Beelenkamp'],
  ['Mourad Mgizhrat', 'Mourad Mghizrat'],
  ['Muslui Nalbantoglu', 'Muslu Nalbantoğlu'],
  ['Muslu Nalbantoglu', 'Muslu Nalbantoğlu'],
  ['Nebojsa Gudelj', 'Nebojša Gudelj'],
  ['Nebosja Gudelj', 'Nebojša Gudelj'],
  ['Nordin Boukhari', 'Nourdin Boukhari'],
  ['Ode Thomson', 'Ode Thompson'],
  ['Osmane Sanou', 'Ousmane Sanou'],
  ['Pacal Heije', 'Pascal Heije'],
  ['Paul Matthijsen', 'Paul Matthijs'],
  ['Paulo Roberto Rink', 'Paulo Rink'],
  ['Peter Zois', 'Peter Zoïs'],
  ['Rahim Ouedraego', 'Rahim Ouédraogo'],
  ['Rahim Ouedraegou', 'Rahim Ouédraogo'],
  ['Rahim Ouedraogo', 'Rahim Ouédraogo'],
  ['Raymond Attevelt', 'Raymond Atteveld'],
  ['Regilio Simons', 'Regillio Simons'],
  ['Rene Bot', 'René Bot'],
  ['René van de Brink', 'René van den Brink'],
  ['Robbie Alflen', 'Rob Alflen'],
  ['Robert McKinnon', 'Rob McKinnon'],
  ['Roberto Lankohr', 'Roberto Lanckohr'],
  ['Ronnie Venema', 'Ronny Venema'],
  ['Rui Montero', 'Rui Monteiro'],
  ['Said Boutahar', 'Saïd Boutahar'],
  ['Sjinji Ono', 'Shinji Ono'],
  ['Stefan Petterson', 'Stefan Pettersson'],
  ['Sylvan Inia', 'Silvan Inia'],
  ['Tarek Sektioui', 'Tarik Sektioui'],
  ['Thomás Galásek', 'Tomáš Galásek'],
  ['Tijjani Babangida', 'Tijani Babangida'],
  ['Tomás Galásek', 'Tomáš Galásek'],
  ['Tomeck Iwan', 'Tomasz Iwan'],
  ['Tomek Iwan', 'Tomasz Iwan'],
  ['Tom van der Leegte', 'Tommie van der Leegte'],
  ['Ullrich van Gobbel', 'Ulrich van Gobbel'],
  ['Virgil Breetvelt', 'Virgil Breetveld'],
  ['Virgillio Teixeira', 'Virgilio Teixeira'],
  ['Wasio Taiwo', 'Wasiu Taiwo'],
  ['Wilfried Bouma', 'Wilfred Bouma'],
  ['Youssef El-Akchaoui', 'Youssef El Akchaoui'],
  ['Youssouf Fertout', 'Youssef Fertout'],
  ['Zeljko Kalac', 'Željko Kalac'],
  ['Zjelko Kalac', 'Željko Kalac'],
])

/** Names that look alike and are two people, so the check report does not list them. */
export const oldSiteDistinctNames: readonly (readonly string[])[] = [
  ['Brian Tevreden', 'Brian Tevreden II'],
  ['Ruud Kool', 'Ruud Knol'],
]

/** The name in a field of the file with single spaces and the owner's correction, or empty. */
export function cleanOldSiteName(name: null | string): string {
  const clean = (name ?? '').replace(/\s+/gu, ' ').trim()

  return oldSiteNameCorrections.get(clean) ?? clean
}

/**
 * Spellings on the squad cards that may be one person, not decided yet: the check report lists
 * them and nothing changes. They come from the squads, not from the files of the old fansite.
 */
export const oldSiteSquadNamesToDecide: readonly (readonly string[])[] = [
  ['Radoslav Samardžić', 'Radoslav Samardzic'],
  ['Jan Harm Schippers', 'Jan-Harm Schippers'],
  ['Robert van den Berg', 'Robert van der Berg'],
  ['Jordy Bruijn', 'Jordy Buijs'],
]

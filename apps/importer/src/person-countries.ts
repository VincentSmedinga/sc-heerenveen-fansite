/**
 * The countries of Wikidata (`P27`, the nationality of a person) by Q-number, with the code of
 * two letters of each (#1051). The list is every item of Wikidata with a code of ISO 3166-1
 * that is in use (`P297`, read on 10 November 2026), and Kosovo. Two items without such a code
 * are added by hand, because Wikidata names them as the nationality of many persons: the
 * country Netherlands (`Q55`, next to the kingdom `Q29999`) and the Kingdom of Denmark
 * (`Q756617`). The label is what Wikidata calls the item in English.
 *
 * A nationality that is not here gives no country: the importer names it in a warning and
 * guesses nothing. That is so for a country that is gone, such as Yugoslavia, and the editors
 * choose the country of such a person in the admin. Add an item when a warning shows one that
 * has a code.
 */
export const wikidataCountryCodes: ReadonlyMap<string, string> = new Map<string, string>([
  ['Q16', 'CA'], // Canada
  ['Q17', 'JP'], // Japan
  ['Q20', 'NO'], // Norway
  ['Q27', 'IE'], // Ireland
  ['Q28', 'HU'], // Hungary
  ['Q29', 'ES'], // Spain
  ['Q30', 'US'], // United States
  ['Q31', 'BE'], // Belgium
  ['Q32', 'LU'], // Luxembourg
  ['Q33', 'FI'], // Finland
  ['Q34', 'SE'], // Sweden
  ['Q35', 'DK'], // Denmark
  ['Q36', 'PL'], // Poland
  ['Q37', 'LT'], // Lithuania
  ['Q38', 'IT'], // Italy
  ['Q39', 'CH'], // Switzerland
  ['Q40', 'AT'], // Austria
  ['Q41', 'GR'], // Greece
  ['Q43', 'TR'], // Turkey
  ['Q45', 'PT'], // Portugal
  ['Q51', 'AQ'], // Antarctica
  ['Q55', 'NL'], // Netherlands
  ['Q77', 'UY'], // Uruguay
  ['Q79', 'EG'], // Egypt
  ['Q96', 'MX'], // Mexico
  ['Q114', 'KE'], // Kenya
  ['Q115', 'ET'], // Ethiopia
  ['Q117', 'GH'], // Ghana
  ['Q142', 'FR'], // France
  ['Q145', 'GB'], // United Kingdom
  ['Q148', 'CN'], // People's Republic of China
  ['Q155', 'BR'], // Brazil
  ['Q159', 'RU'], // Russia
  ['Q183', 'DE'], // Germany
  ['Q184', 'BY'], // Belarus
  ['Q189', 'IS'], // Iceland
  ['Q191', 'EE'], // Estonia
  ['Q211', 'LV'], // Latvia
  ['Q212', 'UA'], // Ukraine
  ['Q213', 'CZ'], // Czech Republic
  ['Q214', 'SK'], // Slovakia
  ['Q215', 'SI'], // Slovenia
  ['Q217', 'MD'], // Moldova
  ['Q218', 'RO'], // Romania
  ['Q219', 'BG'], // Bulgaria
  ['Q221', 'MK'], // North Macedonia
  ['Q222', 'AL'], // Albania
  ['Q223', 'GL'], // Greenland
  ['Q224', 'HR'], // Croatia
  ['Q225', 'BA'], // Bosnia and Herzegovina
  ['Q227', 'AZ'], // Azerbaijan
  ['Q228', 'AD'], // Andorra
  ['Q229', 'CY'], // Cyprus
  ['Q230', 'GE'], // Georgia
  ['Q232', 'KZ'], // Kazakhstan
  ['Q233', 'MT'], // Malta
  ['Q235', 'MC'], // Monaco
  ['Q236', 'ME'], // Montenegro
  ['Q237', 'VA'], // Vatican City
  ['Q238', 'SM'], // San Marino
  ['Q241', 'CU'], // Cuba
  ['Q242', 'BZ'], // Belize
  ['Q244', 'BB'], // Barbados
  ['Q252', 'ID'], // Indonesia
  ['Q258', 'ZA'], // South Africa
  ['Q262', 'DZ'], // Algeria
  ['Q265', 'UZ'], // Uzbekistan
  ['Q298', 'CL'], // Chile
  ['Q334', 'SG'], // Singapore
  ['Q347', 'LI'], // Liechtenstein
  ['Q398', 'BH'], // Bahrain
  ['Q399', 'AM'], // Armenia
  ['Q403', 'RS'], // Serbia
  ['Q408', 'AU'], // Australia
  ['Q414', 'AR'], // Argentina
  ['Q419', 'PE'], // Peru
  ['Q423', 'KP'], // North Korea
  ['Q424', 'KH'], // Cambodia
  ['Q574', 'TL'], // Timor-Leste
  ['Q657', 'TD'], // Chad
  ['Q664', 'NZ'], // New Zealand
  ['Q668', 'IN'], // India
  ['Q672', 'TV'], // Tuvalu
  ['Q678', 'TO'], // Tonga
  ['Q683', 'WS'], // Samoa
  ['Q685', 'SB'], // Solomon Islands
  ['Q686', 'VU'], // Vanuatu
  ['Q691', 'PG'], // Papua New Guinea
  ['Q695', 'PW'], // Palau
  ['Q697', 'NR'], // Nauru
  ['Q702', 'FM'], // Federated States of Micronesia
  ['Q709', 'MH'], // Marshall Islands
  ['Q710', 'KI'], // Kiribati
  ['Q711', 'MN'], // Mongolia
  ['Q712', 'FJ'], // Fiji
  ['Q717', 'VE'], // Venezuela
  ['Q730', 'SR'], // Suriname
  ['Q733', 'PY'], // Paraguay
  ['Q734', 'GY'], // Guyana
  ['Q736', 'EC'], // Ecuador
  ['Q739', 'CO'], // Colombia
  ['Q750', 'BO'], // Bolivia
  ['Q754', 'TT'], // Trinidad and Tobago
  ['Q757', 'VC'], // Saint Vincent and the Grenadines
  ['Q760', 'LC'], // Saint Lucia
  ['Q763', 'KN'], // Saint Kitts and Nevis
  ['Q766', 'JM'], // Jamaica
  ['Q769', 'GD'], // Grenada
  ['Q774', 'GT'], // Guatemala
  ['Q778', 'BS'], // The Bahamas
  ['Q781', 'AG'], // Antigua and Barbuda
  ['Q783', 'HN'], // Honduras
  ['Q784', 'DM'], // Dominica
  ['Q785', 'JE'], // Jersey
  ['Q786', 'DO'], // Dominican Republic
  ['Q790', 'HT'], // Haiti
  ['Q792', 'SV'], // El Salvador
  ['Q794', 'IR'], // Iran
  ['Q796', 'IQ'], // Iraq
  ['Q800', 'CR'], // Costa Rica
  ['Q801', 'IL'], // Israel
  ['Q804', 'PA'], // Panama
  ['Q805', 'YE'], // Yemen
  ['Q810', 'JO'], // Jordan
  ['Q811', 'NI'], // Nicaragua
  ['Q813', 'KG'], // Kyrgyzstan
  ['Q817', 'KW'], // Kuwait
  ['Q819', 'LA'], // Laos
  ['Q822', 'LB'], // Lebanon
  ['Q826', 'MV'], // Maldives
  ['Q833', 'MY'], // Malaysia
  ['Q836', 'MM'], // Myanmar
  ['Q837', 'NP'], // Nepal
  ['Q842', 'OM'], // Oman
  ['Q843', 'PK'], // Pakistan
  ['Q846', 'QA'], // Qatar
  ['Q851', 'SA'], // Saudi Arabia
  ['Q854', 'LK'], // Sri Lanka
  ['Q858', 'SY'], // Syria
  ['Q863', 'TJ'], // Tajikistan
  ['Q865', 'TW'], // Taiwan
  ['Q869', 'TH'], // Thailand
  ['Q874', 'TM'], // Turkmenistan
  ['Q878', 'AE'], // United Arab Emirates
  ['Q881', 'VN'], // Vietnam
  ['Q884', 'KR'], // South Korea
  ['Q889', 'AF'], // Afghanistan
  ['Q902', 'BD'], // Bangladesh
  ['Q912', 'ML'], // Mali
  ['Q916', 'AO'], // Angola
  ['Q917', 'BT'], // Bhutan
  ['Q921', 'BN'], // Brunei
  ['Q924', 'TZ'], // Tanzania
  ['Q928', 'PH'], // Philippines
  ['Q929', 'CF'], // Central African Republic
  ['Q945', 'TG'], // Togo
  ['Q948', 'TN'], // Tunisia
  ['Q953', 'ZM'], // Zambia
  ['Q954', 'ZW'], // Zimbabwe
  ['Q958', 'SS'], // South Sudan
  ['Q962', 'BJ'], // Benin
  ['Q963', 'BW'], // Botswana
  ['Q965', 'BF'], // Burkina Faso
  ['Q967', 'BI'], // Burundi
  ['Q970', 'KM'], // Comoros
  ['Q971', 'CG'], // Republic of the Congo
  ['Q974', 'CD'], // Democratic Republic of the Congo
  ['Q977', 'DJ'], // Djibouti
  ['Q983', 'GQ'], // Equatorial Guinea
  ['Q986', 'ER'], // Eritrea
  ['Q1000', 'GA'], // Gabon
  ['Q1005', 'GM'], // The Gambia
  ['Q1006', 'GN'], // Guinea
  ['Q1007', 'GW'], // Guinea-Bissau
  ['Q1008', 'CI'], // Ivory Coast
  ['Q1009', 'CM'], // Cameroon
  ['Q1011', 'CV'], // Cape Verde
  ['Q1013', 'LS'], // Lesotho
  ['Q1014', 'LR'], // Liberia
  ['Q1016', 'LY'], // Libya
  ['Q1019', 'MG'], // Madagascar
  ['Q1020', 'MW'], // Malawi
  ['Q1025', 'MR'], // Mauritania
  ['Q1027', 'MU'], // Mauritius
  ['Q1028', 'MA'], // Morocco
  ['Q1029', 'MZ'], // Mozambique
  ['Q1030', 'NA'], // Namibia
  ['Q1032', 'NE'], // Niger
  ['Q1033', 'NG'], // Nigeria
  ['Q1036', 'UG'], // Uganda
  ['Q1037', 'RW'], // Rwanda
  ['Q1039', 'ST'], // São Tomé and Príncipe
  ['Q1041', 'SN'], // Senegal
  ['Q1042', 'SC'], // Seychelles
  ['Q1044', 'SL'], // Sierra Leone
  ['Q1045', 'SO'], // Somalia
  ['Q1049', 'SD'], // Sudan
  ['Q1050', 'SZ'], // Eswatini
  ['Q1183', 'PR'], // Puerto Rico
  ['Q1246', 'XK'], // Kosovo
  ['Q1410', 'GI'], // Gibraltar
  ['Q3769', 'GF'], // French Guiana
  ['Q4628', 'FO'], // Faroe Islands
  ['Q5689', 'AX'], // Åland
  ['Q5785', 'KY'], // Cayman Islands
  ['Q6250', 'EH'], // Western Sahara
  ['Q8646', 'HK'], // Hong Kong
  ['Q9648', 'FK'], // Falkland Islands
  ['Q9676', 'IM'], // Isle of Man
  ['Q11703', 'VI'], // United States Virgin Islands
  ['Q13353', 'MS'], // Montserrat
  ['Q14773', 'MO'], // Macau
  ['Q16635', 'GU'], // Guam
  ['Q16641', 'AS'], // American Samoa
  ['Q16644', 'MP'], // Northern Mariana Islands
  ['Q16645', 'UM'], // United States Minor Outlying Islands
  ['Q17012', 'GP'], // Guadeloupe
  ['Q17054', 'MQ'], // Martinique
  ['Q17063', 'YT'], // Mayotte
  ['Q17070', 'RE'], // Réunion
  ['Q18221', 'TC'], // Turks and Caicos Islands
  ['Q21203', 'AW'], // Aruba
  ['Q23408', 'BV'], // Bouvet Island
  ['Q23635', 'BM'], // Bermuda
  ['Q25228', 'AI'], // Anguilla
  ['Q25230', 'GG'], // Guernsey
  ['Q25279', 'CW'], // Curaçao
  ['Q25305', 'VG'], // British Virgin Islands
  ['Q25362', 'BL'], // Saint Barthélemy
  ['Q26273', 'SX'], // Sint Maarten
  ['Q26988', 'CK'], // Cook Islands
  ['Q27561', 'BQ'], // Caribbean Netherlands
  ['Q29999', 'NL'], // Kingdom of the Netherlands
  ['Q30971', 'PF'], // French Polynesia
  ['Q31057', 'NF'], // Norfolk Island
  ['Q31063', 'CX'], // Christmas Island
  ['Q33788', 'NC'], // New Caledonia
  ['Q34020', 'NU'], // Niue
  ['Q34617', 'PM'], // Saint Pierre and Miquelon
  ['Q35086', 'GS'], // South Georgia and the South Sandwich Islands
  ['Q35555', 'WF'], // Wallis and Futuna
  ['Q35672', 'PN'], // Pitcairn Islands
  ['Q36004', 'CC'], // Cocos (Keeling) Islands
  ['Q36823', 'TK'], // Tokelau
  ['Q43448', 'IO'], // British Indian Ocean Territory
  ['Q126125', 'MF'], // Saint-Martin
  ['Q129003', 'TF'], // French Southern and Antarctic Lands
  ['Q131198', 'HM'], // Heard Island and McDonald Islands
  ['Q192184', 'SH'], // Saint Helena, Ascension and Tristan da Cunha
  ['Q219060', 'PS'], // Palestine
  ['Q644636', 'CY'], // Cyprus
  ['Q756617', 'DK'], // Kingdom of Denmark
  ['Q842829', 'SJ'], // Svalbard and Jan Mayen
  ['Q10372207', 'AQ'], // Antarctic Treaty area
])

// The flags of the countries the squads of sc Heerenveen mention, for `PlayerName`: the drawing
// of each flag as an SVG text, and the Dutch name of the country for the text alternative.
//
// The drawings come from flag-icons 7.6.0 (https://github.com/lipis/flag-icons, MIT licence, see
// `flag-icons-licence.txt` in this folder), format 4x3, with the whitespace and the `id` of the
// root taken out. Only the flags of at most 900 bytes are here, so the whole set stays small
// (see `flags.test.ts`); a country with a heavier flag, such as Brazil or Serbia, has no flag
// and `PlayerName` shows an empty place. They are text in this file, and not files that a page
// asks for, so a flag costs no request, on the site, in Storybook and on the host alike.

/** The Dutch name of each country that has a flag: the text alternative of the flag. */
export const countryNames: Record<string, string> = {
  AM: 'Armenië',
  AT: 'Oostenrijk',
  AZ: 'Azerbeidzjan',
  BE: 'België',
  BF: 'Burkina Faso',
  BG: 'Bulgarije',
  CA: 'Canada',
  CD: 'Congo-Kinshasa',
  CG: 'Congo-Brazzaville',
  CH: 'Zwitserland',
  CI: 'Ivoorkust',
  CL: 'Chili',
  CO: 'Colombia',
  CZ: 'Tsjechië',
  DE: 'Duitsland',
  DK: 'Denemarken',
  DZ: 'Algerije',
  EE: 'Estland',
  FI: 'Finland',
  FR: 'Frankrijk',
  GA: 'Gabon',
  GB: 'Verenigd Koninkrijk',
  GH: 'Ghana',
  GM: 'Gambia',
  GN: 'Guinee',
  GR: 'Griekenland',
  HU: 'Hongarije',
  ID: 'Indonesië',
  IE: 'Ierland',
  IL: 'Israël',
  IS: 'IJsland',
  IT: 'Italië',
  JM: 'Jamaica',
  JP: 'Japan',
  LT: 'Litouwen',
  LU: 'Luxemburg',
  LV: 'Letland',
  MA: 'Marokko',
  MK: 'Noord-Macedonië',
  ML: 'Mali',
  NG: 'Nigeria',
  NL: 'Nederland',
  NO: 'Noorwegen',
  PA: 'Panama',
  PE: 'Peru',
  RO: 'Roemenië',
  RU: 'Rusland',
  SE: 'Zweden',
  SN: 'Senegal',
  SR: 'Suriname',
  TG: 'Togo',
  TN: 'Tunesië',
  TR: 'Turkije',
  UA: 'Oekraïne',
  US: 'Verenigde Staten',
  ZA: 'Zuid-Afrika',
}

/** The drawing of the flag of each country, by the code of two letters in capitals. */
export const flagDrawings: Record<string, string> = {
  AM: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#d90012" d="M0 0h640v160H0z"/><path fill="#0033a0" d="M0 160h640v160H0z"/><path fill="#f2a800" d="M0 320h640v160H0z"/></svg>',
  AT: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 160h640v160H0z"/><path fill="#c8102e" d="M0 0h640v160H0zm0 320h640v160H0z"/></svg>',
  AZ: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#3f9c35" d="M.1 0h640v480H.1z"/><path fill="#ed2939" d="M.1 0h640v320H.1z"/><path fill="#00b9e4" d="M.1 0h640v160H.1z"/><circle cx="304" cy="240" r="72" fill="#fff"/><circle cx="320" cy="240" r="60" fill="#ed2939"/><path fill="#fff" d="m384 200 7.7 21.5 20.6-9.8-9.8 20.7L424 240l-21.5 7.7 9.8 20.6-20.6-9.8L384 280l-7.7-21.5-20.6 9.8 9.8-20.6L344 240l21.5-7.7-9.8-20.6 20.6 9.8z"/></svg>',
  BE: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="#000001" d="M0 0h213.3v480H0z"/><path fill="#ffd90c" d="M213.3 0h213.4v480H213.3z"/><path fill="#f31830" d="M426.7 0H640v480H426.7z"/></g></svg>',
  BF: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#de0000" d="M640 479.6H.4V0H640z"/><path fill="#35a100" d="M639.6 480H0V240.2h639.6z"/><path fill="#fff300" d="M320 160 338 215.3 396.1 215.3 349.1 249.4 367 304.7 320 270.6 273 304.7 290.9 249.4 243.9 215.3 302 215.3z"/></g></svg>',
  BG: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v160H0z"/><path fill="#00966e" d="M0 160h640v160H0z"/><path fill="#d62612" d="M0 320h640v160H0z"/></svg>',
  CA: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fff" d="M150.1 0h339.7v480H150z"/><path fill="#d52b1e" d="M-19.7 0h169.8v480H-19.7zm509.5 0h169.8v480H489.9zM201 232l-13.3 4.4 61.4 54c4.7 13.7-1.6 17.8-5.6 25l66.6-8.4-1.6 67 13.9-.3-3.1-66.6 66.7 8c-4.1-8.7-7.8-13.3-4-27.2l61.3-51-10.7-4c-8.8-6.8 3.8-32.6 5.6-48.9 0 0-35.7 12.3-38 5.8l-9.2-17.5-32.6 35.8c-3.5.9-5-.5-5.9-3.5l15-74.8-23.8 13.4q-3.2 1.3-5.2-2.2l-23-46-23.6 47.8q-2.8 2.5-5 .7L264 130.8l13.7 74.1c-1.1 3-3.7 3.8-6.7 2.2l-31.2-35.3c-4 6.5-6.8 17.1-12.2 19.5s-23.5-4.5-35.6-7c4.2 14.8 17 39.6 9 47.7"/></svg>',
  CD: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#007fff" d="M0 0h640v480H0z"/><path fill="#f7d618" d="M28.8 96H96l20.8-67.2L137.6 96h67.2l-54.4 41.6 20.8 67.2-54.4-41.6-54.4 41.6 20.8-67.2zM600 0 0 360v120h40l600-360V0z"/><path fill="#ce1021" d="M640 0 0 384v96L640 96z"/></svg>',
  CG: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><clipPath id="cg-a"><path fill-opacity=".7" d="M-79.5 32h640v480h-640z"/></clipPath></defs><g fill-rule="evenodd" stroke-width="1pt" clip-path="url(#cg-a)" transform="translate(79.5 -32)"><path fill="#ff0" d="M-119.5 32h720v480h-720z"/><path fill="#00ca00" d="M-119.5 32v480l480-480z"/><path fill="red" d="M120.5 512h480V32z"/></g></svg>',
  CH: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="red" d="M0 0h640v480H0z"/><g fill="#fff"><path d="M170 195h300v90H170z"/><path d="M275 90h90v300h-90z"/></g></g></svg>',
  CI: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#009a44" d="M426.8 0H640v480H426.8z"/><path fill="#ff8200" d="M0 0h212.9v480H0z"/><path fill="#fff" d="M212.9 0h214v480h-214z"/></g></svg>',
  CL: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><clipPath id="cl-a"><path fill-opacity=".7" d="M0 0h682.7v512H0z"/></clipPath></defs><g fill-rule="evenodd" clip-path="url(#cl-a)" transform="scale(.9375)"><path fill="#fff" d="M256 0h512v256H256z"/><path fill="#0039a6" d="M0 0h256v256H0z"/><path fill="#fff" d="M167.8 191.7 128.2 162l-39.5 30 14.7-48.8L64 113.1l48.7-.5L127.8 64l15.5 48.5 48.7.1-39.2 30.4z"/><path fill="#d52b1e" d="M0 256h768v256H0z"/></g></svg>',
  CO: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="#ffe800" d="M0 0h640v480H0z"/><path fill="#00148e" d="M0 240h640v240H0z"/><path fill="#da0010" d="M0 360h640v120H0z"/></g></svg>',
  CZ: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v240H0z"/><path fill="#d7141a" d="M0 240h640v240H0z"/><path fill="#11457e" d="M360 240 0 0v480z"/></svg>',
  DE: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fc0" d="M0 320h640v160H0z"/><path fill="#000001" d="M0 0h640v160H0z"/><path fill="red" d="M0 160h640v160H0z"/></svg>',
  DK: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#c8102e" d="M0 0h640.1v480H0z"/><path fill="#fff" d="M205.7 0h68.6v480h-68.6z"/><path fill="#fff" d="M0 205.7h640.1v68.6H0z"/></svg>',
  DZ: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fff" d="M320 0h320v480H320z"/><path fill="#006233" d="M0 0h320v480H0z"/><path fill="#d21034" d="M424 180a120 120 0 1 0 0 120 96 96 0 1 1 0-120m4 60-108-35.2 67.2 92V183.2l-67.2 92z"/></svg>',
  EE: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#1791ff" d="M0 0h640v160H0z"/><path fill="#000001" d="M0 160h640v160H0z"/><path fill="#fff" d="M0 320h640v160H0z"/></svg>',
  FI: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#002f6c" d="M0 174.5h640v131H0z"/><path fill="#002f6c" d="M175.5 0h130.9v480h-131z"/></svg>',
  FR: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#000091" d="M0 0h213.3v480H0z"/><path fill="#fff" d="M213.3 0h213.4v480H213.3z"/><path fill="#e1000f" d="M426.7 0H640v480H426.7z"/></svg>',
  GA: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#ffe700" d="M640 480H0V0h640z"/><path fill="#36a100" d="M640 160H0V0h640z"/><path fill="#006dbc" d="M640 480H0V320h640z"/></g></svg>',
  GB: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#012169" d="M0 0h640v480H0z"/><path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z"/><path fill="#C8102E" d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z"/><path fill="#FFF" d="M241 0v480h160V0zM0 160v160h640V160z"/><path fill="#C8102E" d="M0 193v96h640v-96zM273 0v480h96V0z"/></svg>',
  GH: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#006b3f" d="M0 0h640v480H0z"/><path fill="#fcd116" d="M0 0h640v320H0z"/><path fill="#ce1126" d="M0 0h640v160H0z"/><path fill="#000001" d="m320 160 52 160-136.1-98.9H404L268 320z"/></svg>',
  GM: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><clipPath id="gm-a"><path fill-opacity=".7" d="M0-48h640v480H0z"/></clipPath></defs><g fill-rule="evenodd" stroke-width="1pt" clip-path="url(#gm-a)" transform="translate(0 48)"><path fill="red" d="M0-128h640V85.3H0z"/><path fill="#fff" d="M0 85.3h640V121H0z"/><path fill="#009" d="M0 120.9h640V263H0z"/><path fill="#fff" d="M0 263.1h640v35.6H0z"/><path fill="#090" d="M0 298.7h640V512H0z"/></g></svg>',
  GN: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="red" d="M0 0h213.3v480H0z"/><path fill="#ff0" d="M213.3 0h213.4v480H213.3z"/><path fill="#090" d="M426.7 0H640v480H426.7z"/></g></svg>',
  GR: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#0d5eaf" fill-rule="evenodd" d="M0 0h640v53.3H0z"/><path fill="#fff" fill-rule="evenodd" d="M0 53.3h640v53.4H0z"/><path fill="#0d5eaf" fill-rule="evenodd" d="M0 106.7h640V160H0z"/><path fill="#fff" fill-rule="evenodd" d="M0 160h640v53.3H0z"/><path fill="#0d5eaf" d="M0 0h266.7v266.7H0z"/><path fill="#0d5eaf" fill-rule="evenodd" d="M0 213.3h640v53.4H0z"/><path fill="#fff" fill-rule="evenodd" d="M0 266.7h640V320H0z"/><path fill="#0d5eaf" fill-rule="evenodd" d="M0 320h640v53.3H0z"/><path fill="#fff" fill-rule="evenodd" d="M0 373.3h640v53.4H0z"/><g fill="#fff" fill-rule="evenodd" stroke-width="1.3"><path d="M106.7 0H160v266.7h-53.3z"/><path d="M0 106.7h266.7V160H0z"/></g><path fill="#0d5eaf" d="M0 426.7h640V480H0z"/></svg>',
  HU: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#d43516" d="M0 0h640v160H0z"/><path fill="#fff" d="M0 160h640v160H0z"/><path fill="#388d00" d="M0 320h640v160H0z"/></g></svg>',
  ID: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#e70011" d="M0 0h640v240H0Z"/><path fill="#fff" d="M0 240h640v240H0Z"/></svg>',
  IE: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#009A49" d="M0 0h213.3v480H0z"/><path fill="#FF7900" d="M426.7 0H640v480H426.7z"/></g></svg>',
  IL: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><clipPath id="il-a"><path fill-opacity=".7" d="M-87.6 0H595v512H-87.6z"/></clipPath></defs><g fill-rule="evenodd" clip-path="url(#il-a)" transform="translate(82.1)scale(.94)"><path fill="#fff" d="M619.4 512H-112V0h731.4z"/><path fill="#0038b8" d="M619.4 115.2H-112V48h731.4zm0 350.5H-112v-67.2h731.4zm-483-275 110.1 191.6L359 191.6z"/><path fill="#fff" d="m225.8 317.8 20.9 35.5 21.4-35.3z"/><path fill="#0038b8" d="M136 320.6 246.2 129l112.4 190.8z"/><path fill="#fff" d="m225.8 191.6 20.9-35.5 21.4 35.4zM182 271.1l-21.7 36 41-.1-19.3-36zm-21.3-66.5 41.2.3-19.8 36.3zm151.2 67 20.9 35.5-41.7-.5zm20.5-67-41.2.3 19.8 36.3zm-114.3 0L189.7 256l28.8 50.3 52.8 1.2 32-51.5-29.6-52z"/></g></svg>',
  IS: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><clipPath id="is-a"><path fill-opacity=".7" d="M0 0h640v480H0z"/></clipPath></defs><g fill-rule="evenodd" stroke-width="0" clip-path="url(#is-a)"><path fill="#003897" d="M0 0h666.7v480H0z"/><path fill="#fff" d="M0 186.7h186.7V0h106.6v186.7h373.4v106.6H293.3V480H186.7V293.3H0z"/><path fill="#d72828" d="M0 213.3h213.3V0h53.4v213.3h400v53.4h-400V480h-53.4V266.7H0z"/></g></svg>',
  IT: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#009246" d="M0 0h213.3v480H0z"/><path fill="#ce2b37" d="M426.7 0H640v480H426.7z"/></g></svg>',
  JM: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#000001" d="m0 0 320 240L0 480zm640 0L320 240l320 240z"/><path fill="#090" d="m0 0 320 240L640 0zm0 480 320-240 320 240z"/><path fill="#fc0" d="M640 0h-59.6L0 435.3V480h59.6L640 44.7z"/><path fill="#fc0" d="M0 0v44.7L580.4 480H640v-44.7L59.6 0z"/></g></svg>',
  JP: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><clipPath id="jp-a"><path fill-opacity=".7" d="M-88 32h640v480H-88z"/></clipPath></defs><g fill-rule="evenodd" stroke-width="1pt" clip-path="url(#jp-a)" transform="translate(88 -32)"><path fill="#fff" d="M-128 32h720v480h-720z"/><circle cx="523.1" cy="344.1" r="194.9" fill="#bc002d" transform="translate(-168.4 8.6)scale(.76554)"/></g></svg>',
  LT: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt" transform="scale(.64143 .96773)"><rect width="1063" height="708.7" fill="#006a44" rx="0" ry="0" transform="scale(.93865 .69686)"/><rect width="1063" height="236.2" y="475.6" fill="#c1272d" rx="0" ry="0" transform="scale(.93865 .69686)"/><path fill="#fdb913" d="M0 0h997.8v164.6H0z"/></g></svg>',
  LU: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#ed2939" d="M0 0h640v160H0z"/><path fill="#fff" d="M0 160h640v160H0z"/><path fill="#00a1de" d="M0 320h640v160H0z"/></svg>',
  LV: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#981e32" d="M0 0h640v192H0z"/><path fill="#fff" d="M0 192h640v96H0z"/><path fill="#981e32" d="M0 288h640v192H0z"/></g></svg>',
  MA: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#c1272d" d="M640 0H0v480h640z"/><path fill="none" stroke="#006233" stroke-width="11.7" d="M320 179.4 284.4 289l93.2-67.6H262.4l93.2 67.6z"/></svg>',
  MK: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#d20000" d="M0 0h640v480H0z"/><path fill="#ffe600" d="M0 0h96l224 231.4L544 0h96L0 480h96l224-231.4L544 480h96zm640 192v96L0 192v96zM280 0l40 205.7L360 0zm0 480 40-205.7L360 480z"/><circle cx="320" cy="240" r="77.1" fill="#ffe600" stroke="#d20000" stroke-width="17.1"/></svg>',
  ML: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="red" d="M425.8 0H640v480H425.7z"/><path fill="#009a00" d="M0 0h212.9v480H0z"/><path fill="#ff0" d="M212.9 0h214v480h-214z"/></g></svg>',
  NG: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#008753" d="M426.6 0H640v480H426.6zM0 0h213.3v480H0z"/></g></svg>',
  NL: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#ae1c28" d="M0 0h640v160H0z"/><path fill="#fff" d="M0 160h640v160H0z"/><path fill="#21468b" d="M0 320h640v160H0z"/></svg>',
  NO: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#ed2939" d="M0 0h640v480H0z"/><path fill="#fff" d="M180 0h120v480H180z"/><path fill="#fff" d="M0 180h640v120H0z"/><path fill="#002664" d="M210 0h60v480h-60z"/><path fill="#002664" d="M0 210h640v60H0z"/></svg>',
  PA: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#db0000" d="M323 0h358v225.3H323z"/><path fill="#0000ab" d="M0 225.3h323.1V480H0z"/><path fill="#0000ab" fill-rule="evenodd" d="m214.8 177.7-42-29.4-41.7 29.6 15.5-48L105 100l51.6-.4 16-48 16.3 47.9h51.6l-41.5 30 15.9 48z"/><path fill="#d80000" fill-rule="evenodd" d="m516.9 413.9-42.4-27.7-42.1 28 15.6-45.6-42-28 52-.5 16.2-45.4 16.4 45.3h52l-41.8 28.5 16 45.4z"/></svg>',
  PE: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#D91023" d="M0 0h640v480H0z"/><path fill="#fff" d="M213.3 0h213.4v480H213.3z"/></svg>',
  RO: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="#00319c" d="M0 0h213.3v480H0z"/><path fill="#ffde00" d="M213.3 0h213.4v480H213.3z"/><path fill="#de2110" d="M426.7 0H640v480H426.7z"/></g></svg>',
  RU: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v160H0z"/><path fill="#0039a6" d="M0 160h640v160H0z"/><path fill="#d52b1e" d="M0 320h640v160H0z"/></svg>',
  SE: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#005293" d="M0 0h640v480H0z"/><path fill="#fecb00" d="M176 0v192H0v96h176v192h96V288h368v-96H272V0z"/></svg>',
  SN: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="#0b7226" d="M0 0h213.3v480H0z"/><path fill="#ff0" d="M213.3 0h213.3v480H213.3z"/><path fill="#bc0000" d="M426.6 0H640v480H426.6z"/></g><path fill="#0b7226" d="M342 218.8h71.8l-56.6 43.6 20.7 69.3-56.6-43.6-56.6 41.6 20.7-67.3-56.6-43.6h69.8l22.7-71.3z"/></svg>',
  SR: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#377e3f" d="M.1 0h640v480H.1z"/><path fill="#fff" d="M.1 96h640v288H.1z"/><path fill="#b40a2d" d="M.1 144h640v192H.1z"/><path fill="#ecc81d" d="m320 153.2 56.4 173.6-147.7-107.3h182.6L263.6 326.8z"/></svg>',
  TG: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><clipPath id="tg-a"><path fill-opacity=".7" d="M0 0h682.7v512H0z"/></clipPath></defs><g fill-rule="evenodd" clip-path="url(#tg-a)" transform="scale(.9375)"><path fill="#ffe300" d="M0 0h767.6v512H0z"/><path fill="#118600" d="M0 208.1h767.6V311H0zM0 .2h767.6v102.9H0z"/><path fill="#d80000" d="M0 .3h306.5v310.6H0z"/><path fill="#fff" d="M134.4 128.4c0-.8 18.9-53 18.9-53l17 52.2s57.4 1.7 57.4.8-45.3 34.3-45.3 34.3 21.4 60 20.5 58.2-49.6-36-49.6-36-49.7 34.3-48.8 34.3c.8 0 18.8-56.5 18.8-56.5l-44.5-33.4z"/><path fill="#118600" d="M0 409.2h767.6V512H0z"/></g></svg>',
  TN: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#e70013" d="M0 0h640v480H0z"/><path fill="#fff" d="M320 119.2a1 1 0 0 0-1 240.3 1 1 0 0 0 1-240.3M392 293a90 90 0 1 1 0-107 72 72 0 1 0 0 107m-4.7-21.7-37.4-12.1-23.1 31.8v-39.3l-37.4-12.2 37.4-12.2V188l23.1 31.8 37.4-12.1-23.1 31.8z"/></svg>',
  TR: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#e30a17" d="M0 0h640v480H0z"/><path fill="#fff" d="M407 247.5c0 66.2-54.6 119.9-122 119.9s-122-53.7-122-120 54.6-119.8 122-119.8 122 53.7 122 119.9"/><path fill="#e30a17" d="M413 247.5c0 53-43.6 95.9-97.5 95.9s-97.6-43-97.6-96 43.7-95.8 97.6-95.8 97.6 42.9 97.6 95.9z"/><path fill="#fff" d="m430.7 191.5-1 44.3-41.3 11.2 40.8 14.5-1 40.7 26.5-31.8 40.2 14-23.2-34.1 28.3-33.9-43.5 12-25.8-37z"/></g></svg>',
  UA: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd" stroke-width="1pt"><path fill="#0057b8" d="M0 0h640v240H0z"/><path fill="gold" d="M0 240h640v240H0z"/></g></svg>',
  US: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#bd3d44" d="M0 0h640v480H0"/><path stroke="#fff" stroke-width="37" d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640"/><path fill="#192f5d" d="M0 0h364.8v258.5H0"/><marker id="us-a" markerHeight="30" markerWidth="30"><path fill="#fff" d="m14 0 9 27L0 10h28L5 27z"/></marker><path fill="none" marker-mid="url(#us-a)" d="m0 0 16 11h61 61 61 61 60L47 37h61 61 60 61L16 63h61 61 61 61 60L47 89h61 61 60 61L16 115h61 61 61 61 60L47 141h61 61 60 61L16 166h61 61 61 61 60L47 192h61 61 60 61L16 218h61 61 61 61 60z"/></svg>',
  ZA: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><clipPath id="za-a"><path fill-opacity=".7" d="M-71.9 0h682.7v512H-71.9z"/></clipPath></defs><g clip-path="url(#za-a)" transform="translate(67.4)scale(.93748)"><g fill-rule="evenodd" stroke-width="1pt"><path fill="#000001" d="M-71.9 407.8V104.4L154 256.1z"/><path fill="#000c8a" d="m82.2 512.1 253.6-170.6H696V512H82.2z"/><path fill="#e1392d" d="M66 0h630v170.8H335.7S69.3-1.7 66 0"/><path fill="#ffb915" d="M-71.9 64v40.4L154 256-72 407.8v40.3l284.5-192z"/><path fill="#007847" d="M-71.9 64V0h95l301.2 204h371.8v104.2H324.3L23 512h-94.9v-63.9l284.4-192L-71.8 64z"/><path fill="#fff" d="M23 0h59.2l253.6 170.7H696V204H324.3zm0 512.1h59.2l253.6-170.6H696v-33.2H324.3L23 512z"/></g></g></svg>',
}

const addresses = new Map<string, string>()

/** The Dutch name of a country, or undefined for a code that has no flag here. */
export function countryName(country: string): string | undefined {
  const code = country.toUpperCase()

  return Object.hasOwn(countryNames, code) ? countryNames[code] : undefined
}

/**
 * The address of the flag of a country as an image: the drawing in a `data:` address, so it
 * costs no request. Undefined when the set has no flag for the code, because it is not a code
 * of two letters or the country has no flag here.
 */
export function flagAddress(country: string): string | undefined {
  const code = country.toUpperCase()
  const drawing = Object.hasOwn(flagDrawings, code) ? flagDrawings[code] : undefined

  if (drawing === undefined) {
    return undefined
  }

  let address = addresses.get(code)

  if (address === undefined) {
    address = `data:image/svg+xml,${escapeDrawing(drawing)}`
    addresses.set(code, address)
  }

  return address
}

/**
 * Writes the drawing so it can stand in a `data:` address: `%`, the quotes, `#`, `<` and `>`
 * are escaped. That is shorter than `encodeURIComponent`, which would escape every space and
 * slash, and the page carries one address for each flag it shows.
 */
function escapeDrawing(drawing: string): string {
  return drawing
    .replaceAll('%', '%25')
    .replaceAll('"', '%22')
    .replaceAll('#', '%23')
    .replaceAll('<', '%3C')
    .replaceAll('>', '%3E')
}

/**
 * PES rules — transcribed from the `pravidla` sheet of the group's spreadsheet
 * (PES 2.0.xlsx). The Czech text is the authoritative source (kept verbatim);
 * the English is a working translation. Rendered by RulesPage; grouped into the
 * same sections the sheet uses (general rules, penalties, pot contributions by
 * final standing in each pack, and rewards).
 */

export interface RuleItem {
  cs: string
  en: string
}

export interface RuleSection {
  id: string
  titleCs: string
  titleEn: string
  /** Optional intro line under the heading. */
  items: RuleItem[]
  /** Placement → amount rows (used for the pot-contribution tables). */
  table?: { placeCs: string; placeEn: string; amount: string }[]
}

export const RULES_SECTIONS: RuleSection[] = [
  {
    id: 'general',
    titleCs: 'Obecná pravidla',
    titleEn: 'General rules',
    items: [
      {
        cs: 'Hodnocení skóre probíhá vždy 1× týdně, vždy v neděli večer (deadline pro zadávání neděle 21:00!!!) — trest za pozdní zápis (30 Kč).',
        en: 'Scoring happens once a week, always on Sunday evening (entry deadline Sunday 21:00!!!) — penalty for a late entry (CZK 30).',
      },
      {
        cs: 'Všechny body zadávat pokud možno okamžitě po výkonu.',
        en: 'Enter all points as soon as possible after the activity.',
      },
      {
        cs: 'Výkony ideálně pro kontrolu někde sdílet (Strava apod.), není to ale podmínkou.',
        en: 'Ideally share your activities somewhere for verification (Strava etc.), but it is not required.',
      },
      {
        cs: 'Konkrétní tresty a odměny jsou popsány níže.',
        en: 'Specific penalties and rewards are described below.',
      },
      {
        cs: 'Trest z proběhlého týdne je třeba plnit hned týden následující, jinak se příspěvek do kasy opakuje, dokud není trest splněn.',
        en: 'A penalty from the past week must be served the very next week, otherwise the pot contribution repeats until the penalty is served.',
      },
      {
        cs: 'Každý zadává sportovní aktivity poctivě, pravdivě a pokud možno ihned, hodnotou pod své jméno do listu aktuálního týdne.',
        en: 'Everyone enters their activities honestly, truthfully and promptly, as a value under their name in the current week.',
      },
      {
        cs: 'Každý se snaží dosáhnout co nejvyššího skóre v průběhu týdne, ideálně nad 100, a vyhnout se tak trestům / příspěvkům.',
        en: 'Everyone tries to reach the highest possible weekly score, ideally over 100, to avoid penalties / contributions.',
      },
      {
        cs: 'Hodnoty jednotlivých aktivit je po diskuzi možné upravovat.',
        en: 'The point values of individual activities can be adjusted after discussion.',
      },
      {
        cs: 'Hodnoty se sčítají do dlouhodobější (půlroční) soutěže a určují celkové pořadí.',
        en: 'Points add up into the longer-term (half-year) competition and determine the overall standing.',
      },
      {
        cs: 'Je vítáno navrhovat další aktivity a jejich hodnocení.',
        en: 'Proposing new activities and their scoring is welcome.',
      },
      {
        cs: 'Nemoc či zranění je uznáno jako důvod pro vyhnutí se trestům po dobu nezbytně nutnou — je potřeba to oznámit a tribunál dá svolení.',
        en: 'Illness or injury is accepted as grounds to avoid penalties for the necessary period — you must report it and the tribunal grants permission.',
      },
      {
        cs: 'Na konci kola budou každému škrtnuta 3 nejhorší týdenní skóre (mimo 0. týden).',
        en: 'At the end of a round, each person’s 3 worst weekly scores are dropped (except week 0).',
      },
      {
        cs: 'Účastníci se střídají v zadávání výzev (ideálně do nedělních 21:00, jinak výhoda volby propadá); bonus inkasuje 1. (30 b), 2. (20 b) a 3. (10 b), pokud není zadáno jinak.',
        en: 'Participants take turns setting challenges (ideally by Sunday 21:00, otherwise the right to choose is forfeited); the bonus goes to 1st (30 pts), 2nd (20 pts) and 3rd (10 pts) unless stated otherwise.',
      },
      {
        cs: 'Startovní pole je rozdělené do dvou výkonnostních skupin: na konci kola 3 nejhorší z A skupiny sestupují a 3 nejlepší z B skupiny postupují.',
        en: 'The field is split into two performance groups: at the end of a round the 3 worst from group A are relegated and the 3 best from group B are promoted.',
      },
    ],
  },
  {
    id: 'penalties',
    titleCs: 'Tresty',
    titleEn: 'Penalties',
    items: [
      {
        cs: 'Za nesplnění týdenních 100 b — trest dle sezóny + příspěvek do kasy.',
        en: 'For not reaching the weekly 100 pts — a seasonal penalty + a pot contribution.',
      },
      {
        cs: 'Zimní sezóna (listopad – březen): studená sprcha / rybník (+ foto/video dokumentace).',
        en: 'Winter season (November – March): a cold shower / pond dip (+ photo/video proof).',
      },
      {
        cs: 'Letní sezóna (duben – říjen): výběr z následujícího + dokumentace — 1) sníst banán se slupkou, 2) sníst čajovou lžíci červeného tabasca nebo alternativu o min. 2500–5000 jednotkách pálivosti (pochutinu lze zapít), 3) sesbírat pytel odpadků na veřejném místě (alespoň 50 l).',
        en: 'Summer season (April – October): choose one of the following + proof — 1) eat a banana with the peel, 2) eat a teaspoon of red Tabasco or an alternative of at least 2500–5000 Scoville (you may wash it down), 3) collect a bag of litter in a public place (at least 50 l).',
      },
      {
        cs: 'Za nesplnění týdenních 100 b — 50 do kasy; příspěvek se opakuje každý týden, dokud není trest splněn.',
        en: 'For not reaching the weekly 100 pts — 50 into the pot; the contribution repeats every week until the penalty is served.',
      },
      {
        cs: 'Odstoupení v průběhu kola (mimo závažné důvody) — 1000 do kasy.',
        en: 'Withdrawing mid-round (barring serious reasons) — 1000 into the pot.',
      },
      {
        cs: 'Pozdní zápis bodů (po nedělních 21:00) — 30 do kasy.',
        en: 'Late point entry (after Sunday 21:00) — 30 into the pot.',
      },
    ],
  },
  {
    id: 'pot-a',
    titleCs: 'Příspěvky do kasy — Smečka A (gauč)',
    titleEn: 'Pot contributions — Pack A (couch)',
    items: [],
    table: [
      { placeCs: '1.–3. místo', placeEn: '1st–3rd place', amount: 'bez příspěvku' },
      { placeCs: '4. místo', placeEn: '4th place', amount: '100 Kč' },
      { placeCs: '5. místo', placeEn: '5th place', amount: '200 Kč' },
      { placeCs: '6. místo', placeEn: '6th place', amount: '300 Kč' },
      { placeCs: '7. místo', placeEn: '7th place', amount: '400 Kč' },
      { placeCs: '8. místo', placeEn: '8th place', amount: '500 Kč' },
    ],
  },
  {
    id: 'pot-b',
    titleCs: 'Příspěvky do kasy — Smečka B (bouda)',
    titleEn: 'Pot contributions — Pack B (kennel)',
    items: [],
    table: [
      { placeCs: '1.–3. místo', placeEn: '1st–3rd place', amount: 'bez příspěvku' },
      { placeCs: '4. místo', placeEn: '4th place', amount: '50 Kč' },
      { placeCs: '5. místo', placeEn: '5th place', amount: '100 Kč' },
      { placeCs: '6. místo', placeEn: '6th place', amount: '150 Kč' },
      { placeCs: '7. místo', placeEn: '7th place', amount: '200 Kč' },
      { placeCs: '8. místo', placeEn: '8th place', amount: '250 Kč' },
      { placeCs: '9. místo', placeEn: '9th place', amount: '300 Kč' },
      { placeCs: '10. místo', placeEn: '10th place', amount: '350 Kč' },
      { placeCs: '11. místo', placeEn: '11th place', amount: '400 Kč' },
      { placeCs: '12. místo', placeEn: '12th place', amount: '450 Kč' },
      { placeCs: '13. místo', placeEn: '13th place', amount: '500 Kč' },
      { placeCs: '14. místo', placeEn: '14th place', amount: '550 Kč' },
      { placeCs: '15. místo', placeEn: '15th place', amount: '600 Kč' },
      { placeCs: '16. místo', placeEn: '16th place', amount: '650 Kč' },
    ],
  },
  {
    id: 'rewards',
    titleCs: 'Odměny a body navíc',
    titleEn: 'Rewards and bonus points',
    items: [
      {
        cs: 'Za výhru v půlročním kole náleží vítězi putovní pohár.',
        en: 'The winner of a half-year round receives the travelling trophy.',
      },
      {
        cs: 'Za vítězství ve výzvě je 30, 20 a 10 bodů navíc (1., 2. a 3. místo); při rovnosti bodů následuje dělba bodů dle počtu vítězů, pokud není zadavatelem uvedeno jinak.',
        en: 'Winning a challenge gives 30, 20 and 10 bonus points (1st, 2nd and 3rd); ties split the placement’s points among the winners unless the setter states otherwise.',
      },
      {
        cs: 'Pro PSA-držáka (účastník, který ani jeden týden neskrečuje) bonus 300 b do celkového skóre.',
        en: 'For the “PSA holder” (a participant who never skips a week) a 300-point bonus to the overall score.',
      },
      {
        cs: 'Za účast v závodě obdrží účastník 30 b (nahlásí do skupiny).',
        en: 'Taking part in a race earns 30 pts (report it to the group).',
      },
      {
        cs: 'Extra body za umístění na segmentech (viz info v kolonce), maximálně však 30 b/týden.',
        en: 'Extra points for segment placements (see the note in the cell), but at most 30 pts/week.',
      },
    ],
  },
]

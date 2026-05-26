export interface Venue {
  id: string;
  name: string;
  tileX: number;
  tileY: number;
  color: number;
}

/** Venues placed on land tiles, roughly matching real Tromsø positions. */
export const VENUES: Venue[] = [
  { id: 'polaria',        name: 'Polaria',             tileX: 10, tileY: 17, color: 0x4fc3f7 },
  { id: 'radhuset',       name: 'Rådhuset',            tileX: 10, tileY: 14, color: 0xffcc80 },
  { id: 'driv',           name: 'Driv',                tileX:  8, tileY: 12, color: 0xef5350 },
  { id: 'biblioteket',    name: 'Tromsø Library',      tileX: 10, tileY: 15, color: 0xa5d6a7 },
  { id: 'blarock',        name: 'Blårock',             tileX:  7, tileY: 13, color: 0x42a5f5 },
  { id: 'verdensteatret', name: 'Verdensteatret',      tileX:  9, tileY: 13, color: 0xab47bc },
  { id: 'kulturhuset',    name: 'Kulturhuset',         tileX:  9, tileY: 11, color: 0xffa726 },
  { id: 'domkirka',       name: 'Domkirka',            tileX:  8, tileY: 16, color: 0xffee58 },
  { id: 'mack',           name: 'Mack Brewery',        tileX:  9, tileY: 10, color: 0x8d6e63 },
  { id: 'bukta',          name: 'Bukta',               tileX:  5, tileY: 20, color: 0x66bb6a },
  { id: 'havna',          name: 'Harbor',              tileX: 11, tileY: 11, color: 0x78909c },
  { id: 'storgata',       name: 'Storgata',            tileX:  9, tileY: 14, color: 0xffd54f },
];

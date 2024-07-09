export interface FactSheetSeries {
  a2: number;
  a3: number;
  a4: number;
  a5: number;
  a6: number;
}

export interface SampleSD {
  sd: number;
  mean: number;
  arrLength: number;
}
export interface SampleSDAndVolitality extends SampleSD {
  volitality: number;
}

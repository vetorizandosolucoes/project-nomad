/**
 * Portuguese generic drug names mapped to the English names used in FDA labels, so a search
 * for "ibuprofeno" finds the labels for "ibuprofen". Only whole-query matches are mapped.
 */
const PT_TO_EN: Record<string, string> = {
  'acido acetilsalicilico': 'aspirin',
  albendazol: 'albendazole',
  amoxicilina: 'amoxicillin',
  anlodipino: 'amlodipine',
  aspirina: 'aspirin',
  atorvastatina: 'atorvastatin',
  azitromicina: 'azithromycin',
  bisacodil: 'bisacodyl',
  cafeina: 'caffeine',
  cefalexina: 'cephalexin',
  cetirizina: 'cetirizine',
  ciprofloxacino: 'ciprofloxacin',
  clotrimazol: 'clotrimazole',
  dexametasona: 'dexamethasone',
  diclofenaco: 'diclofenac',
  difenidramina: 'diphenhydramine',
  dimenidrinato: 'dimenhydrinate',
  fexofenadina: 'fexofenadine',
  fluoxetina: 'fluoxetine',
  hidroclorotiazida: 'hydrochlorothiazide',
  hidrocortisona: 'hydrocortisone',
  ibuprofeno: 'ibuprofen',
  insulina: 'insulin',
  ivermectina: 'ivermectin',
  levotiroxina: 'levothyroxine',
  loperamida: 'loperamide',
  loratadina: 'loratadine',
  losartana: 'losartan',
  mebendazol: 'mebendazole',
  metformina: 'metformin',
  metronidazol: 'metronidazole',
  miconazol: 'miconazole',
  naproxeno: 'naproxen',
  neomicina: 'neomycin',
  omeprazol: 'omeprazole',
  pantoprazol: 'pantoprazole',
  paracetamol: 'acetaminophen',
  pirantel: 'pyrantel',
  prednisona: 'prednisone',
  ranitidina: 'ranitidine',
  salbutamol: 'albuterol',
  sertralina: 'sertraline',
  sinvastatina: 'simvastatin',
}

export function resolveDrugNameAlias(query: string): string {
  const key = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return PT_TO_EN[key] ?? query
}

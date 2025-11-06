import * as fs from 'fs';
import * as path from 'path';

type WardRow = {
  provinceName: string;
  districtName: string;
  wardName: string;
};

function strip(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function aliasCity(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('hồ chí minh')) return ['tphcm', 'hcm', 'sài gòn', 'saigon', 'thành phố hồ chí minh', 'tp hcm', 'tp. hcm'];
  if (n.includes('hà nội')) return ['hà nội', 'ha noi', 'hanoi', 'hn', 'thủ đô hà nội'];
  return [name.toLowerCase(), strip(name.toLowerCase())];
}

function aliasDistrict(d: string): string[] {
  const out = new Set<string>();
  const lower = d.toLowerCase().trim();
  const plain = strip(lower);
  out.add(lower); out.add(plain);
  const m = lower.match(/^quận\s+(\d+)/);
  if (m) {
    const num = m[1];
    out.add(`q${num}`); out.add(`q.${num}`); out.add(`district ${num}`); out.add(`d${num}`); out.add(`quan ${num}`);
  }
  return Array.from(out);
}

function aliasWard(w: string): string[] {
  const out = new Set<string>();
  const lower = w.toLowerCase().trim();
  const plain = strip(lower);
  out.add(lower); out.add(plain);
  out.add(`p. ${lower}`); out.add(`p ${lower}`);
  out.add(`phường ${lower}`);
  return Array.from(out);
}

function main() {
  const repoRoot = process.cwd();
  const inputFile = path.resolve(repoRoot, 'district-ward.txt');
  const outFile = path.resolve(repoRoot, 'config', 'synonyms.txt');
  if (!fs.existsSync(inputFile)) {
    console.error('district-ward.txt not found');
    process.exit(1);
  }
  const lines = fs.readFileSync(inputFile, 'utf8').split(/\r?\n/).filter(Boolean);
  lines.shift(); // header

  const wanted = new Set(['Tp Hồ Chí Minh', 'Thành phố Hà Nội']);
  const records: WardRow[] = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 6) continue;
    const [ , provinceName, , districtName, , wardName] = parts.map(s => s.trim());
    if (!wanted.has(provinceName)) continue;
    const dn = districtName.toLowerCase();
    const isValid = provinceName === 'Tp Hồ Chí Minh'
      ? (dn.startsWith('quận ') || dn.startsWith('huyện ') || dn === 'thành phố thủ đức')
      : (dn.startsWith('quận ') || dn.startsWith('huyện ') || dn.startsWith('thị xã '));
    if (!isValid) continue;
    records.push({ provinceName, districtName, wardName });
  }

  const linesOut: string[] = [];
  // Cities
  linesOut.push('# Cities');
  linesOut.push(aliasCity('Thành phố Hồ Chí Minh').join(', '));
  linesOut.push(aliasCity('Thành phố Hà Nội').join(', '));
  linesOut.push('');

  // Districts + Wards
  const byDistrict = new Map<string, { city: string; wards: Set<string> }>();
  for (const r of records) {
    const key = `${r.provinceName}::${r.districtName}`;
    if (!byDistrict.has(key)) byDistrict.set(key, { city: r.provinceName, wards: new Set() });
    byDistrict.get(key)!.wards.add(r.wardName);
  }

  linesOut.push('# District and ward variants');
  for (const [key, { city, wards }] of byDistrict) {
    const [, districtName] = key.split('::');
    const variants = aliasDistrict(districtName);
    linesOut.push(variants.join(', '));
    for (const w of wards) {
      linesOut.push(aliasWard(w).join(', '));
    }
    linesOut.push('');
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, linesOut.join('\n'), 'utf8');
  console.log(`Wrote synonyms to ${outFile}`);
}

main();



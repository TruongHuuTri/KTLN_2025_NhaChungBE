import * as fs from 'fs';
import * as path from 'path';

type Row = {
  provinceCode: string; provinceName: string;
  districtCode: string; districtName: string;
  wardCode: string; wardName: string;
};

function strip(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}+/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function aliasCity(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('hồ chí minh')) return ['tphcm','hcm','sài gòn','saigon','thành phố hồ chí minh','tp hcm','tp. hcm'];
  if (n.includes('hà nội')) return ['hà nội','ha noi','hanoi','hn','thủ đô hà nội'];
  return [n, strip(n)];
}

function aliasDistrict(d: string): string[] {
  const out = new Set<string>();
  const lower = d.toLowerCase().trim();
  const plain = strip(lower);
  out.add(lower); out.add(plain);
  
  // Extract district name without prefix (quận/huyện/thị xã/thành phố)
  // Ví dụ: "Quận Bình Thạnh" -> "bình thạnh"
  // Ví dụ: "Thành phố Thủ Đức" -> "thủ đức"
  const withoutPrefix = lower.replace(/^(quận|huyện|thị xã|thành phố|thanh pho)\s+/i, '').trim();
  if (withoutPrefix && withoutPrefix !== lower) {
    out.add(withoutPrefix);
    out.add(strip(withoutPrefix));
    
    // CRITICAL: Special case cho "thủ đức" - thêm alias "thủ đức" và "thu duc"
    // Vì "thủ đức" là tên riêng phổ biến, user thường search "thủ đức" thay vì "thành phố thủ đức"
    if (withoutPrefix === 'thủ đức' || withoutPrefix === 'thu duc') {
      out.add('thủ đức');
      out.add('thu duc');
    }
  }
  
  // Handle numbered districts: "Quận 1" -> "1", "q1", "q.1", etc.
  const m = lower.match(/^quận\s+(\d+)/);
  if (m) { 
    const num = m[1]; 
    out.add(`q${num}`); 
    out.add(`q.${num}`); 
    out.add(`district ${num}`); 
    out.add(`d${num}`); 
    out.add(`quan ${num}`);
    out.add(num); // Just the number: "1", "2", etc.
  }
  
  return Array.from(out);
}

function aliasWard(w: string): string[] {
  const out = new Set<string>();
  const lower = w.toLowerCase().trim(); 
  const plain = strip(lower);
  out.add(lower); 
  out.add(plain); 
  out.add(`p. ${lower}`); 
  out.add(`p ${lower}`); 
  out.add(`phường ${lower}`);
  
  // Extract ward name without prefix (phường/xã)
  // Ví dụ: "Phường Bình Thạnh" -> "bình thạnh"
  const withoutPrefix = lower.replace(/^(phường|xã)\s+/i, '').trim();
  if (withoutPrefix && withoutPrefix !== lower) {
    out.add(withoutPrefix);
    out.add(strip(withoutPrefix));
  }
  
  return Array.from(out);
}

function loadCSV(repoRoot: string): Row[] {
  const input = path.resolve(repoRoot, 'district-ward.txt');
  if (!fs.existsSync(input)) throw new Error('district-ward.txt not found');
  const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/).filter(Boolean);
  lines.shift();
  const wanted = new Set(['Tp Hồ Chí Minh','Thành phố Hà Nội']);
  const out: Row[] = [];
  for (const line of lines) {
    const p = line.split(','); if (p.length < 6) continue;
    const [pc,pn,dc,dn,wc,wn] = p.map(s=>s.trim());
    if (!wanted.has(pn)) continue;
    const dnL = dn.toLowerCase();
    const valid = pn==='Tp Hồ Chí Minh' ? (dnL.startsWith('quận ')||dnL.startsWith('huyện ')||dnL==='thành phố thủ đức') : (dnL.startsWith('quận ')||dnL.startsWith('huyện ')||dnL.startsWith('thị xã '));
    if (!valid) continue;
    out.push({ provinceCode:pc, provinceName:pn, districtCode:dc, districtName:dn, wardCode:wc, wardName:wn });
  }
  return out;
}

function generateMapping(rows: Row[]) {
  const byProvince: Record<string, any> = { hcm: {}, hn: {} };
  for (const r of rows) {
    const keyProvince = r.provinceName === 'Tp Hồ Chí Minh' ? 'hcm' : 'hn';
    const districtKey = r.districtName.toLowerCase();
    if (!byProvince[keyProvince][districtKey]) {
      byProvince[keyProvince][districtKey] = {
        old_name: r.districtName,
        aliases: aliasDistrict(r.districtName),
        province_code: r.provinceCode,
        current_wards: [] as Array<{ ward_code: string; ward_name: string }>,
      };
    }
    byProvince[keyProvince][districtKey].current_wards.push({ ward_code: r.wardCode, ward_name: r.wardName });
  }
  return {
    version: '1.0.0', generatedAt: new Date().toISOString(), source: 'district-ward.txt', mappings: byProvince,
  };
}

function generateSynonyms(rows: Row[]): string {
  const out: string[] = [];
  out.push('# Cities');
  out.push(aliasCity('Thành phố Hồ Chí Minh').join(', '));
  out.push(aliasCity('Thành phố Hà Nội').join(', '));
  out.push('');

  const byDistrict = new Map<string, { city: string; wards: Set<string> }>();
  for (const r of rows) {
    const key = `${r.provinceName}::${r.districtName}`;
    if (!byDistrict.has(key)) byDistrict.set(key, { city: r.provinceName, wards: new Set() });
    byDistrict.get(key)!.wards.add(r.wardName);
  }
  out.push('# District and ward variants');
  for (const [key, { wards }] of byDistrict) {
    const [, districtName] = key.split('::');
    out.push(aliasDistrict(districtName).join(', '));
    for (const w of wards) out.push(aliasWard(w).join(', '));
    out.push('');
  }
  return out.join('\n');
}

function validate(rows: Row[], mapping: any) {
  const wardCountCSV = rows.length;
  const wardCodes = new Set(rows.map(r=>r.wardCode));
  const wardCountUnique = wardCodes.size;
  const mappedCodes = new Set<string>();
  for (const prov of Object.values(mapping.mappings)) {
    const provObj = prov as Record<string, any>;
    for (const d of Object.values(provObj)) {
      for (const w of (d as any).current_wards) mappedCodes.add(w.ward_code);
    }
  }
  const missing = [...wardCodes].filter(c=>!mappedCodes.has(c));
  const report = {
    wards_in_csv: wardCountCSV,
    unique_wards_in_csv: wardCountUnique,
    wards_in_mapping: mappedCodes.size,
    missing_ward_codes: missing.slice(0, 10),
    missing_count: missing.length,
  };
  if (missing.length) console.warn('Validation warning:', report);
  else console.log('Validation OK:', report);
}

function main() {
  const repoRoot = process.cwd();
  const rows = loadCSV(repoRoot);
  const mapping = generateMapping(rows);
  const synonyms = generateSynonyms(rows);

  const outMap = path.resolve(repoRoot, 'config', 'legacy-district-mapping.json');
  const outSyn = path.resolve(repoRoot, 'config', 'synonyms.txt');
  fs.mkdirSync(path.dirname(outMap), { recursive: true });
  fs.writeFileSync(outMap, JSON.stringify(mapping, null, 2), 'utf8');
  fs.writeFileSync(outSyn, synonyms, 'utf8');
  console.log('Wrote:', outMap);
  console.log('Wrote:', outSyn);

  validate(rows, mapping);
}

main();



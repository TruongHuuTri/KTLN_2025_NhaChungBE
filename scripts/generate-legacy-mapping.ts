import * as fs from 'fs';
import * as path from 'path';

type WardRow = {
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
};

function stripAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function makeAliases(districtName: string): string[] {
  const aliases = new Set<string>();
  const lower = districtName.toLowerCase().trim();
  const plain = stripAccents(lower);
  aliases.add(lower);
  aliases.add(plain);
  const m = lower.match(/^quận\s+(\d+)/i);
  if (m) {
    const num = m[1];
    aliases.add(`q${num}`);
    aliases.add(`q.${num}`);
    aliases.add(`district ${num}`);
    aliases.add(`d${num}`);
    aliases.add(`quan ${num}`);
  }
  return Array.from(aliases);
}

function main() {
  const repoRoot = process.cwd();
  const inputFile = path.resolve(repoRoot, 'district-ward.txt');
  if (!fs.existsSync(inputFile)) {
    console.error('district-ward.txt not found');
    process.exit(1);
  }
  const content = fs.readFileSync(inputFile, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) {
    console.error('Empty file');
    process.exit(1);
  }

  const wantedProvinces = new Set<string>(['Tp Hồ Chí Minh', 'Thành phố Hà Nội']);

  const rows: WardRow[] = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 6) continue;
    const [provinceCode, provinceName, districtCode, districtName, wardCode, wardName] = parts.map(s => s.trim());
    if (!wantedProvinces.has(provinceName)) continue;
    // Only accept proper HCM/HN district types
    const dn = districtName.toLowerCase();
    const isHcm = provinceName === 'Tp Hồ Chí Minh';
    const isHn = provinceName === 'Thành phố Hà Nội';
    const isValidDistrict = isHcm
      ? (dn.startsWith('quận ') || dn.startsWith('huyện ') || dn === 'thành phố thủ đức')
      : (dn.startsWith('quận ') || dn.startsWith('huyện ') || dn.startsWith('thị xã '));
    if (!isValidDistrict) continue;
    rows.push({ provinceCode, provinceName, districtCode, districtName, wardCode, wardName });
  }

  const byProvince: Record<string, any> = { hcm: {}, hn: {} };
  for (const r of rows) {
    const keyProvince = r.provinceName === 'Tp Hồ Chí Minh' ? 'hcm' : 'hn';
    const districtKey = r.districtName.toLowerCase();
    if (!byProvince[keyProvince][districtKey]) {
      byProvince[keyProvince][districtKey] = {
        old_name: r.districtName,
        aliases: makeAliases(r.districtName),
        province_code: r.provinceCode,
        current_wards: [] as Array<{ ward_code: string; ward_name: string }>,
      };
    }
    byProvince[keyProvince][districtKey].current_wards.push({ ward_code: r.wardCode, ward_name: r.wardName });
  }

  const output = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    source: 'district-ward.txt',
    mappings: byProvince,
    instructions: {
      usage: 'Load this JSON into BE service. When user searches for an old district name, expand to list of ward_codes for filtering.',
    },
  };

  const outPath = path.resolve(repoRoot, 'config', 'legacy-district-mapping.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote mapping to ${outPath}`);
}

main();



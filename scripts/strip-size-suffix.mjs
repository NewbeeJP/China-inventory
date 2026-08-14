// 一次性脚本：把导入时自动加的尺寸/序号后缀从品名里去掉。
// 规格靠长宽高等字段本身区分，品名回归干净的分类名。
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.migration' });

const APPLY = process.argv.includes('--apply');
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 后缀形态： " 125×18×17.5"、" 440日元"，后面可能再跟 " (2)"
const SUFFIX = /\s+(\d+(?:\.\d+)?×\d+(?:\.\d+)?×\d+(?:\.\d+)?|\d+(?:\.\d+)?日元)?(\s*\(\d+\))?\s*$/;

function clean(name) {
  let out = name;
  for (let i = 0; i < 3; i++) {
    const next = out.replace(SUFFIX, (m, size, seq) => (size || seq ? '' : m)).trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

const { data } = await db.from('products').select('id,name_cn').order('id');
const changes = data.filter((p) => clean(p.name_cn) !== p.name_cn).map((p) => ({ id: p.id, from: p.name_cn, to: clean(p.name_cn) }));

console.log(`共 ${data.length} 个商品，其中 ${changes.length} 个需要改名。`);
console.log('前 8 个改名示例：');
for (const c of changes.slice(0, 8)) console.log(`  ${c.from}  ->  ${c.to}`);
const groups = new Set(data.map((p) => clean(p.name_cn)));
console.log(`\n改完之后共 ${groups.size} 个品名分类。`);

if (!APPLY) {
  console.log('\n这是预览。加 --apply 才会真正写入。');
  process.exit(0);
}
for (const c of changes) {
  const { error } = await db.from('products').update({ name_cn: c.to }).eq('id', c.id);
  if (error) { console.error(`第 ${c.id} 条失败:`, error.message); process.exit(1); }
}
console.log(`\n已更新 ${changes.length} 个商品的品名。`);

const fs = require('fs');

const data = JSON.parse(fs.readFileSync('schema.json', 'utf8'));
const definitions = data.definitions;
if (!definitions) {
  console.log('No definitions found');
  process.exit(1);
}

let md = '# Supabase Live Schema Dump\\n\\n';

for (const [tableName, tableDef] of Object.entries(definitions)) {
  md += `## Table: ${tableName}\\n\\n`;
  if (tableDef.description) {
    md += `*Description*: ${tableDef.description}\\n\\n`;
  }
  
  md += `| Column | Type | Format | Description | Default |\\n`;
  md += `|---|---|---|---|---|\\n`;
  
  const props = tableDef.properties || {};
  for (const [colName, colDef] of Object.entries(props)) {
    let type = colDef.type || '';
    if (colDef.items && colDef.items.type) type += `[]`;
    const format = colDef.format || '';
    const desc = colDef.description || '';
    let def = colDef.default || '';
    if (def.toString().length > 50) def = def.toString().substring(0, 50) + '...';
    md += `| ${colName} | ${type} | ${format} | ${desc} | ${def} |\\n`;
  }
  md += '\\n';
}

fs.writeFileSync('C:\\Users\\Jainam Mehta\\.gemini\\antigravity\\brain\\528637ab-ce46-4c7e-92ec-736fe0584cbf\\database_schema.md', md);
console.log('Generated database_schema.md');

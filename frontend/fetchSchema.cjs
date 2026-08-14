const https = require('https');

const options = {
  hostname: 'vzoypfctadgyflzwodmp.supabase.co',
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3lwZmN0YWRneWZsendvZG1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE0Nzk3NywiZXhwIjoyMTAwNzIzOTc3fQ.h7Nmej91_USzGDpv-MgVG81kGWEHnzjlfc1EtJXAzDc',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3lwZmN0YWRneWZsendvZG1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE0Nzk3NywiZXhwIjoyMTAwNzIzOTc3fQ.h7Nmej91_USzGDpv-MgVG81kGWEHnzjlfc1EtJXAzDc',
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (d) => {
    data += d;
  });
  res.on('end', () => {
    require('fs').writeFileSync('schema.json', data);
    console.log('Saved schema.json');
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();

const fs = require('fs');

async function run() {
  console.log("Creating dummy inbox item...");
  fs.writeFileSync('inbox/test-raw.md', '---\nstatus: suggested\n---\nHello world!');
  
  console.log("Testing DEFER...");
  let res = await fetch('http://localhost:3000/api/merge/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawId: 'test-raw', action: 'DEFER' })
  });
  console.log(await res.json());
  
  console.log("Testing ARCHIVE_NEW...");
  res = await fetch('http://localhost:3000/api/merge/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      rawId: 'test-raw', 
      action: 'ARCHIVE_NEW',
      newPath: 'library/test-archive.md',
      newContent: '---\ntitle: Test\n---\nThis is a new archive.'
    })
  });
  console.log(await res.json());

  console.log("Testing MERGE...");
  res = await fetch('http://localhost:3000/api/merge/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      rawId: 'test-raw', 
      action: 'MERGE',
      targetPath: 'library/test-archive.md',
      patch: {
        insert_strategy: 'append_to_section',
        content_block_markdown: 'Appended content'
      }
    })
  });
  console.log(await res.json());
}

setTimeout(run, 3000); // wait for dev server
